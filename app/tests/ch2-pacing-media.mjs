// Real rendered media fixtures in disposable profiles; never touch player saves.
import assert from 'node:assert/strict'
import { assertHistoricalMedia, inspectLiveImage, waitForLiveImage, deliveryManifest } from './game-delivery-media.mjs'
import {createRequire} from 'node:module'
import {readFileSync,mkdirSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {CH2_SHIFTS,ch2StepForState} from '../src/game/ch2.ts'
import {getCh2Observation} from '../src/game/ch2-observations.ts'
import {freshState} from '../src/game/store.ts'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright')
const baseURL=process.env.GAME_URL||'http://127.0.0.1:8798/'
const output=process.env.MEDIA_OUTPUT||'../../ch2-pacing-media-review-20260921'
mkdirSync(output,{recursive:true})
const ledger=JSON.parse(readFileSync(new URL('../../docs/ch2-pacing-assets.json',import.meta.url),'utf8'))
assert.equal(ledger.assets.length,6)
for(const item of ledger.assets){
 const data=await inspectLiveImage(item.path)
 assertHistoricalMedia(item.path,{sha256:item.sha256.toLowerCase()})
 assert(data.width>=1000&&data.height>=900,item.alias+' production dimensions')
 if(item.alias.includes('bandaged'))assert.equal(data.metadata.hasAlpha,true,'Actual patient delivery must carry alpha')
}
const browser=await chromium.launch({channel:'msedge',headless:true})
const errors=[]
const fixtures=[
 ['c2n1_m0','ch2_patient_fall_bandaged_bed'],['c2d2_lunch0','ch2_bg_breakroom_day'],
 ['c2n1_b2','ch2_remote_rack'],['c2n5_e1','ch2_remote_rack_offline'],
 ['c2d4_t1','ch2_ct_aortic_wide'],['c2n3_coronary_slices','ch2_ct_coronary_slices'],
 ['c2n3_coronary_clear','ct_coronary_cta'],['c2n5_m8','ct_head_child','外院旧片｜3天前'],
 ['c2n5_m17','ct_head_child_followup','本院复查｜本次'],
 ['c2n1_b1',null,null,'vox_ch2_natural_kai_noref_b_v9'],
]
try{
 for(const mobile of [false,true])for(const [id,asset,label,voice] of fixtures){
  const shift=CH2_SHIFTS.find(s=>s.steps[id]);assert(shift,id)
  const s={...freshState('f'),finished:true,night:5,ap:3,gold:500,flags:{n5_qian:true},dlc:{ch2:{shift:shift.id,stepId:id,viewBg:shift.kind==='day'?'bg_ctcontrol_day':'bg_ctcontrol',appliedSteps:['ch2-'+id]}}}
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900}})
  await context.addInitScript(s=>{localStorage.setItem('mr-ch2-unlock','1');localStorage.setItem('midnight-radiology-save-v1',JSON.stringify(s));window.__voices=[];HTMLMediaElement.prototype.play=function(){window.__voices.push(this.src);return Promise.resolve()}},s)
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message))
  await page.goto(baseURL+'#/ch2')
  const p=page.locator('.dialog-box > p');await p.waitFor()
  const expected=(getCh2Observation(id,s)?.prompt ?? ch2StepForState(id,shift.steps[id],s).text).replaceAll('**','')
  await p.click();await page.waitForFunction(t=>document.querySelector('.dialog-box > p')?.textContent===t,expected)
  if(asset)await waitForLiveImage(page,asset,baseURL)
  if(label)await page.getByText(label,{exact:true}).waitFor()
  if(voice)assert.equal(await page.evaluate(v=>window.__voices.filter(src=>src.includes('/'+v+'.mp3')).length,voice),1)
  await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0))
  assert.doesNotMatch(await page.locator('body').innerText(),/AI生成|非实测|不用于诊断|非真实患者/)
  assert.equal(await page.getByRole('button',{name:/显示全文|继续 →/}).count(),0)
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
  const box=await page.locator('.dialog-box').boundingBox();assert(box.y>=0&&box.y+box.height<=page.viewportSize().height+1)
  if(id==='c2n5_m8')assert(await p.locator('.text-amber-200,.text-teal-200,strong').count()||await p.locator('span').count())
  await page.waitForTimeout(800)
  await page.screenshot({path:`${output}/${mobile?'mobile':'desktop'}-${id}.png`})
  await context.close()
 }
 assert(deliveryManifest().removed.some(row=>row.path==='app/public/ch2-pacing-preview.html'), 'Static preview retirement must be explicitly reviewed; real game fixtures above remain required')
 assert.deepEqual(errors,[])
 console.log('PASS: six source identities and actual deliveries; 20 desktop/mobile game fixtures; patient alpha; CTA images; new/old CT labels; Kai voice; unchanged dialog controls. Static preview explicitly retired, not browser-tested.')
}finally{await browser.close()}
