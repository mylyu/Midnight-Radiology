// Prose walkthrough: isolated fixture for Ch1 history, then normal Chapter 2 UI
// from its first line through five shifts. Never reads the user's browser profile.
import {createRequire} from 'node:module'
import {mkdirSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {CH2_SHIFTS,ch2StepForState} from '../src/game/ch2.ts'
import {condOk} from '../src/game/store.ts'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright')
const browser=await chromium.launch({channel:'msedge',headless:true})
const output=process.env.STORY_OUTPUT||'../../ch2-story-echoes-review'
mkdirSync(output,{recursive:true})
const log=[],errors=[]
const seed={gender:'f',night:5,gold:1500,skill:4,wealth:4,heart:4,durability:80,badges:['fixer'],stamps:[1,2,3,4,5],flags:{mystery_told:true,archive_film:true,archive_sealed:true,kai_friend:true,wen_card:true,n5_cover:true},lastCheckin:'',streak:0,finished:true,seed:1234,items:['snack','book','key','toolbox','dosimeter','milktea'],ap:0,buyCount:0,cards:[],events:[],dlc:{ch2:{}}}
async function open(patch={},mobile=false){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900}})
 await context.addInitScript(s=>{localStorage.setItem('mr-ch2-unlock','1');localStorage.setItem('midnight-radiology-save-v1',JSON.stringify(s))},{...seed,...patch})
 const page=await context.newPage()
 page.on('pageerror',e=>errors.push(e.message))
 await page.goto((process.env.GAME_URL||'http://127.0.0.1:8798/')+'#/ch2')
 return {context,page}
}
const read=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('midnight-radiology-save-v1')))
const allSteps=Object.assign({},...CH2_SHIFTS.map(s=>s.steps))
async function show(page,id,step,state){
 const root=page.locator(`[data-ch2-step="${id}"]`)
 await root.waitFor()
 const p=page.locator('.dialog-box > p')
 if(!(await page.locator('.dialog-box > span.animate-bounce').count()))await p.click()
 const expected=(ch2StepForState(id,step,state).text??'').replaceAll('**','').replaceAll('行动力⚡×3',`行动力⚡×${state.ap}`)
 await page.waitForFunction(expected=>document.querySelector('.dialog-box > p')?.textContent===expected,expected)
 return expected
}
async function capture(page,path){
 await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0))
 // Let the original entrance transitions finish; do not alter game CSS.
 await page.waitForTimeout(700)
 await page.screenshot({path})
}
try{
 const {context,page}=await open()
 const visited=new Set()
 for(let count=0;count<500;count++){
  const s=await read(page),p=s.dlc.ch2
  if(!p.stepId){await page.waitForTimeout(50);continue}
  const shift=CH2_SHIFTS.find(n=>n.id===p.shift),step=shift.steps[p.stepId]
  const text=await show(page,p.stepId,step,s)
  log.push({kind:'walk',step:p.stepId,text,ap:s.ap})
  visited.add(p.stepId)
  if(['c2n3_x9','c2d4_e5','c2n5_a7','c2n5_r3','c2n5_g5','c2am_0'].includes(p.stepId))await capture(page,`${output}/walk-${p.stepId}.png`)
  if(p.shift==='c2am')break
  if(step.windowTask){
   await page.getByRole('button',{name:new RegExp(` ${step.windowTask.targetW}/${step.windowTask.targetL}$`)}).click()
   await page.getByRole('button',{name:/^就这个窗口 · 确认/}).click()
  }else if(step.choices){
   const visible=step.choices.filter(c=>condOk(s,c.cond))
   let choice
   if(p.stepId.endsWith('_hub')){
    choice=visible.find(c=>c.cond?.notFlag&&!c.next.startsWith('@')&&!c.text.includes('【开诊前】'))
    const needsCoffee=step.choices.some(c=>c.cond?.ap&&!s.flags[c.cond.notFlag]&&!condOk(s,c.cond)&&condOk(s,{...c.cond,ap:0}))
    if(!choice&&needsCoffee){
     await page.getByRole('button',{name:'小卖部',exact:true}).click()
     await page.getByRole('button',{name:'30💰',exact:true}).click()
     await page.getByRole('button',{name:'离开小卖部',exact:true}).click()
     continue
    }
    choice??=visible.find(c=>c.text.startsWith('【开诊】'))
   }else choice=visible.find(c=>c.next==='c2n3_a4a')??visible.find(c=>c.tag==='good')??visible[0]
   assert(choice,p.stepId+' must have a usable choice')
   log.at(-1).choice=choice.text
   await page.getByRole('button',{name:choice.text.replaceAll('**',''),exact:true}).click()
  }else if(step.end){
   await page.getByRole('button',{name:/本班结束 · 结算/}).click()
   await page.getByRole('button',{name:/^进入：/}).click()
  }else{
   await page.locator('.dialog-box > span.animate-bounce').waitFor()
   await page.locator('.dialog-box > p').click()
  }
  await page.waitForFunction(before=>{const p=JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2;return p.stepId!==before.stepId||p.shift!==before.shift},p)
  if(visited.size%50===0)console.log('STORY WALK',visited.size,p.stepId)
 }
 const result=await read(page)
 assert.equal(result.dlc.ch2.stepId,'c2am_0')
 for(const flag of ['c2n1_a','c2n1_b','c2n1_c','c2n1_e','c2n3_a','c2n3_d','c2n3_k','c2n3_bk','c2n5_cabinet','c2n5_b','c2n5_e','audit_evidence'])assert(result.flags[flag],flag)
 log.push({kind:'summary',uniqueSteps:visited.size,flags:result.flags})
 console.log('PASS: five-shift story walk + all available exploration + audit reply, through morning:',visited.size)
 await context.close()
 // Independent display fixtures cover skipped optional memories, both sexes,
 // different meeting replies, and mobile text fit without clearing any real save.
 const scenes=[
  ['c2d2_16a',{}],['c2d2_16a',{remote_asked:true,lei_cable:true}],
  ['c2n3_x0',{}],['c2n3_x0',{c2n3_d:true}],['c2n3_x9',{}],
  ['c2d4_e5',{wen_remote:true}],['c2n5_a7',{}],['c2n5_a7',{archive_film:true}],
  ['c2n5_g5',{}],['c2n5_g5',{c2n5_b:true}],
  ['c2am_0',{data_audit:true,audit_evidence:true}],['c2am_0',{data_audit:true}],
  ['c2am_0',{data_oppose:true}],['c2am_0',{data_support:true}],['c2am_7',{}],['c2am_9',{}],
 ]
 for(const mobile of [false,true])for(const [index,[id,flags]] of scenes.entries()){
  const shift=CH2_SHIFTS.find(s=>s.steps[id])
  const {context,page}=await open({gender:mobile?'f':'m',flags,dlc:{ch2:{shift:shift.id,stepId:id}}},mobile)
  const text=await show(page,id,allSteps[id],await read(page))
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
  const box=await page.locator('.dialog-box').boundingBox()
  assert(box.y>=0&&box.y+box.height<=page.viewportSize().height+1,id+' text exceeds screen')
  log.push({kind:'display',id,flags,mobile,text})
  await capture(page,`${output}/${mobile?'mobile':'desktop'}-${index}-${id}.png`)
  await context.close()
 }
 assert.deepEqual(errors,[])
 console.log('PASS: 32 rendered prose/memory/ending fixtures on desktop/mobile, no overflow or page errors.')
}finally{writeFileSync(`${output}/transcript.json`,JSON.stringify(log,null,2));await browser.close()}
