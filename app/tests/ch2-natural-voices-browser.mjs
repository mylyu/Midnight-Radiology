import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs'
import {CH2_SHIFTS} from '../src/game/ch2.ts'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright')
const rows=JSON.parse(readFileSync(new URL('../../docs/ch2-voice-current.json',import.meta.url),'utf8'))
const url=process.env.GAME_URL||'http://127.0.0.1:8798/'
const out=process.env.VOICE_OUTPUT||'../../ch2-voice-author-review'
mkdirSync(out,{recursive:true})
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--autoplay-policy=no-user-gesture-required']})
const errors=[],results=[]
try{
 for(const row of rows){
  const shift=CH2_SHIFTS.find(s=>s.steps[row.step])
  const context=await browser.newContext({viewport:{width:1280,height:900}})
  await context.addInitScript(({shift,row})=>{
   window.__played=[];window.__ended=[]
   const original=HTMLMediaElement.prototype.play
   HTMLMediaElement.prototype.play=function(){
    const element=this
    this.addEventListener('ended',()=>window.__ended.push(element.src),{once:true})
    return original.call(this).then(()=>{
     window.__played.push({src:element.src,volume:element.volume,duration:element.duration})
    })
   }
   localStorage.setItem('mr-ch2-unlock','1')
   localStorage.setItem('midnight-radiology-save-v1',JSON.stringify({gender:'m',night:5,gold:500,skill:3,wealth:3,heart:3,durability:70,badges:[],stamps:[],flags:{['heard2_vp3_'+(row.id??row.key)]:true},lastCheckin:'',streak:0,finished:true,seed:1234,items:[],ap:3,buyCount:0,cards:[],events:[],dlc:{ch2:{shift,stepId:row.step,viewBg:'bg_ctcontrol'}}}))
  },{shift:shift.id,row})
  const page=await context.newPage()
  page.on('pageerror',e=>errors.push(e.message))
  await page.goto(url+'#/ch2')
  await page.locator('[data-ch2-step="'+row.step+'"]').waitFor()
  if(row.id)await page.waitForFunction(id=>window.__ended.some(src=>src.includes('/'+id+'.mp3')),row.id,{timeout:15000})
  else await page.waitForTimeout(750)
  await page.waitForFunction(text=>document.querySelector('.dialog-box > p')?.textContent?.startsWith(text),shift.steps[row.step].text.replaceAll('**','').slice(0,14))
  const calls=await page.evaluate(()=>window.__played.filter(r=>r.src.includes('/vox')))
  assert.equal(calls.length,row.id?1:0,row.key+' unexpected voice call count')
  if(row.id){
   assert(calls[0].src.includes(row.id+'.mp3'))
   assert.equal(calls[0].volume,.45)
   assert(calls[0].duration>.5&&calls[0].duration<8)
  }
  assert.equal(await page.getByRole('button',{name:/显示全文|继续 →/}).count(),0)
  results.push({step:row.step,...calls[0],ended:!!row.id,muted:!row.id})
  await context.close()
 }
 const context=await browser.newContext({viewport:{width:390,height:844}})
 const page=await context.newPage()
 page.on('pageerror',e=>errors.push(e.message))
 await page.goto(url+'ch2-voice-preview.html')
 assert.equal(await page.locator('audio').count(),12)
 assert.equal(await page.locator('.card').filter({hasText:'只保留文字，不播放人声'}).count(),2)
 assert.equal(await page.evaluate(()=>localStorage.length),0)
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
 await page.getByRole('button',{name:'连听当前配音',exact:true}).click()
 await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('小唐：'),null,{timeout:10000})
 await page.getByRole('button',{name:'停止',exact:true}).click()
 assert.equal(await page.evaluate(()=>[...document.querySelectorAll('audio')].every(a=>a.paused)),true)
 await page.screenshot({path:out+'/mobile-preview.png',fullPage:true})
 assert.equal(await page.evaluate(()=>localStorage.length),0)
 await context.close()
 assert.deepEqual(errors,[])
 writeFileSync(out+'/browser-results.json',JSON.stringify(results,null,2))
 console.log('PASS: 12 current Edge voices decode/play/end, 2 silent roles, exact clip/gain; preview playlist/stop/mobile/no-save checks.')
}finally{await browser.close()}
