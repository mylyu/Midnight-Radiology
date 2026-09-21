// Isolated Edge only: never touch the player's profile, saves or stuck tab.
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {mkdirSync} from 'node:fs'
import {CH2_SHIFTS,ch2StepForState} from '../src/game/ch2.ts'
import {CH2_DEFERRED_STEPS} from '../src/game/ch2-exploration.ts'
import {condOk} from '../src/game/store.ts'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright')
const browser=await chromium.launch({channel:'msedge',headless:true})
const output=process.env.SOCIAL_OUTPUT||'../../ch2-colleague-review'
mkdirSync(output,{recursive:true})
const errors=[],steps=Object.assign({},...CH2_SHIFTS.map(s=>s.steps))
const base={gender:'m',night:5,gold:500,skill:3,wealth:3,heart:3,durability:70,badges:[],stamps:[],flags:{},lastCheckin:'',streak:0,finished:true,seed:1234,items:[],ap:3,buyCount:0,cards:[],events:[]}
const read=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('midnight-radiology-save-v1')))
async function open(id,patch={},mobile=false){
 const shift=id.slice(0,4)==='c2am'?'c2am':id.slice(0,4)
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900}})
 await context.addInitScript(s=>{
  localStorage.setItem('mr-ch2-unlock','1')
  if(!localStorage.getItem('midnight-radiology-save-v1'))localStorage.setItem('midnight-radiology-save-v1',JSON.stringify(s))
 },{...base,...patch,dlc:{ch2:{shift,stepId:id,viewBg:'bg_ctcontrol',viewSprite:'luzhou',appliedSteps:[]}}})
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message))
 await page.goto((process.env.GAME_URL||'http://127.0.0.1:8798/')+'#/ch2')
 return {context,page}
}
async function at(page,id){
 await page.locator(`[data-ch2-step="${id}"]`).waitFor()
 await page.waitForFunction(id=>JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.appliedSteps.includes('ch2-'+id),id)
}
async function reveal(page,id){
 await at(page,id)
 const state=await read(page),step=ch2StepForState(id,steps[id],state)
 const expected=(step.text??'').replaceAll('**','').replaceAll('行动力⚡×3',`行动力⚡×${state.ap}`)
 if(await page.locator('.dialog-box > p').textContent()!==expected)await page.locator('.dialog-box > p').click()
 await page.waitForFunction(text=>document.querySelector('.dialog-box > p')?.textContent===text,expected)
 return {state,step}
}
try{
 for(const [id,target] of Object.entries(CH2_DEFERRED_STEPS)){
  const patch={flags:{data_audit:true,phantom_log:true},badges:['phantom_friend','wrench_night'],cards:['ring_artifact'],events:['ch2_luzhou']}
  const {context,page}=await open(id,patch)
  await at(page,target)
  const saved=await read(page)
  assert.equal(saved.dlc.ch2.stepId,target)
  assert.equal(saved.ap,3);assert.equal(saved.gold,500)
  for(const key of ['badges','cards','events'])assert.deepEqual(saved[key],patch[key])
  assert(saved.flags.phantom_log);assert(!saved.flags.ai_hook)
  assert.equal(await page.locator('img[src*="char_luzhou"]').count(),0)
  await page.reload();await at(page,target)
  assert.deepEqual((await read(page)).badges,patch.badges)
  await context.close()
 }
 console.log('PASS: all 32 retired save nodes resume and reload; old collections retained, no abandoned portraits/rewards.')
 // The non-audit old laboratory save must skip the optional audit epilogue.
 {const {context,page}=await open('c2am_7');await at(page,'c2am_9');await context.close()}
 for(const mobile of [false,true]){
  const flags={c2n1_chat_sign:true,c2d2_chat_lei:true,c2_social_lei:true,c2_social_wen:true,c2d2_chat_fan:true}
  const {context,page}=await open('c2n5_chat0',{flags},mobile)
  await at(page,'c2n5_chat0');assert.equal((await read(page)).ap,2)
  await page.reload();await at(page,'c2n5_chat0');assert.equal((await read(page)).ap,2)
  for(let n=0;n<30;n++){
   const id=(await read(page)).dlc.ch2.stepId
   if(id==='c2n5_hub')break
   const {state,step}=await reveal(page,id)
   if(step.choices){
    const visible=step.choices.filter(c=>condOk(state,c.cond))
    await page.getByRole('button',{name:visible[0].text,exact:true}).waitFor()
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
    if(id==='c2n5_chat_q'&&!state.flags.c2n5_chat_sign){
     const bounds=await page.locator('.dialog-box').boundingBox()
     assert(bounds.y>=0&&bounds.y+bounds.height<=page.viewportSize().height+1)
     await page.screenshot({path:`${output}/social-${mobile?'mobile':'desktop'}-choices.png`})
    }
    await page.getByRole('button',{name:visible[0].text,exact:true}).click()
   }else{await page.locator('.dialog-box > span.animate-bounce').waitFor();await page.locator('.dialog-box > p').click()}
   await page.waitForFunction(id=>JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.stepId!==id,id)
  }
  await reveal(page,'c2n5_hub')
  const result=await read(page)
  assert(result.badges.includes('c2_two_sides')&&result.badges.includes('c2_tea_regular'))
  assert.equal(await page.getByRole('button',{name:/茶水间.*几句话还没聊完/}).count(),0)
  assert.equal(await page.getByRole('button',{name:/显示全文|继续 →/}).count(),0)
  await page.reload();await at(page,'c2n5_hub')
  assert.equal((await read(page)).ap,2)
  assert.equal((await read(page)).badges.length,2)
  await context.close()
 }
 // No unearned knowledge / no badge for opening a room and immediately leaving.
 for(const flags of [{},{c2_social_lei:true},{c2_social_wen:true}]){
  const {context,page}=await open('c2n5_chat_q',{flags})
  const {step}=await reveal(page,'c2n5_chat_q')
  assert.equal(await page.getByRole('button',{name:/雯雯那边我也问了/}).count(),0)
  const exit=step.choices.find(c=>c.next==='c2n5_chat_end')
  await page.getByRole('button',{name:exit.text,exact:true}).click();await at(page,'c2n5_chat_end')
  assert.deepEqual((await read(page)).badges,[])
  await context.close()
 }
 console.log('PASS: original mobile/desktop choices, conditional memories, both new badges, completed-chat hiding, one AP charge and reload persistence; skipped chat awards nothing.')
 assert.deepEqual(errors,[])
}finally{await browser.close()}
