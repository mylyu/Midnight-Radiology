// Real fresh-save UI walk, not a fixture: start/title -> all five nights -> morning.
// localStorage is read only by this script; all progression/purchases use buttons.
import {createRequire} from 'node:module'
import {mkdirSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {NIGHTS} from '../src/game/data.ts'
import {condOk} from '../src/game/store.ts'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright')
const browser=await chromium.launch({channel:'msedge',headless:true})
const context=await browser.newContext({viewport:{width:1280,height:900}})
const page=await context.newPage()
const output=process.env.WALK_OUTPUT||'../../ch1-night-loop-review'
mkdirSync(output,{recursive:true})
const log=[],errors=[],seen=new Set(),hubs=new Set(),finishedEvents=new Map()
page.on('pageerror',e=>errors.push(e.message))
const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('midnight-radiology-save-v1')))
const click=async locator=>{await page.waitForTimeout(350);await locator.click()}
const choices=()=>page.locator('.dialog-box .choice-in button')
async function shop(buyCoffee=false){
 await click(page.getByRole('button',{name:/小卖部逛逛/}))
 const before=await state()
 if(buyCoffee){
  await click(page.getByRole('button',{name:'30💰',exact:true}))
  assert.equal((await state()).ap,before.ap+1)
 }
 await click(page.getByRole('button',{name:'离开小卖部',exact:true}))
 if(!buyCoffee)assert.equal((await state()).ap,before.ap)
 log.push({kind:'shop',night:before.night,buyCoffee,apBefore:before.ap,apAfter:(await state()).ap})
}
try{
 await page.goto(process.env.GAME_URL||'http://127.0.0.1:8798/')
 assert.equal(await state(),null)
 await click(page.getByRole('button',{name:'▶ 开始游戏',exact:true}))
 await click(page.getByRole('button',{name:/林小满.*细心温和/}))
 await click(page.getByRole('button',{name:'出发，上夜班 →',exact:true}))
 let count=0
 while(count++<650){
  const s=await state()
  if(s.finished){await page.getByText('清晨 · 交接班晨会',{exact:true}).waitFor();break}
  if(s.screenHint==='day'){
   await page.getByText('白天 · 科室经营',{exact:true}).waitFor()
   log.push({kind:'day',night:s.night,stamps:s.stamps,ap:s.ap})
   assert.equal(s.ap,0)
   assert.equal(s.stamps.length,s.night-1)
   await page.screenshot({path:`${output}/day-before-night-${s.night}.png`})
   await click(page.getByRole('button',{name:'保养（-50金币）',exact:true}))
   await click(page.getByRole('button',{name:new RegExp(`进入第 ${s.night} 夜`)}))
   await page.waitForFunction(n=>JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).stepId?.startsWith('n'+n+'_'),s.night)
   continue
  }
  if(!s.stepId){await page.waitForTimeout(100);continue}
  const night=NIGHTS.find(n=>n.id===s.night),step=night.steps[s.stepId]
  assert(step,'Missing '+s.stepId)
  if(step.end){await page.waitForFunction(id=>JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).stepId!==id,s.stepId);continue}
  if(step.choices){
   await choices().first().waitFor({timeout:20000})
   const now=await state(),labels=await choices().allTextContents()
   log.push({kind:'choice',night:s.night,step:s.stepId,ap:now.ap,text:await page.locator('.dialog-box > p').innerText(),labels})
   if(s.stepId.endsWith('_hub')){
    if(!hubs.has(s.night)){
     assert.equal(now.ap,3,'Each night starts exploration at 3 AP')
     hubs.add(s.night)
     await page.screenshot({path:`${output}/night-${s.night}-hub-start.png`})
     for(let i=0;i<2;i++){
      await shop()
      await click(page.getByRole('button',{name:/翻翻值班室那本旧书/}))
      await page.getByText(new RegExp(`第 ${s.night} 页 / 共`)).waitFor()
      await click(page.getByRole('button',{name:'合上书,回科室',exact:true}))
     }
     assert.equal((await state()).ap,3,'Free facilities do not consume AP')
     continue
    }
    for(const [flag,label] of finishedEvents){
     if(flag.startsWith('n'+s.night+'_')&&now.flags[flag])assert(!labels.includes(label),'Completed event returned: '+label)
    }
    const visible=step.choices.filter(c=>condOk(now,c.cond))
    const place=visible.find(c=>c.cond?.notFlag && c.next[0]!=='@')
    if(place){
     const label=place.text.replaceAll('**','')
     finishedEvents.set(place.cond.notFlag,label)
     await click(page.getByRole('button',{name:label,exact:true}))
    }else{
     const blocked=step.choices.find(c=>c.cond?.ap && !now.flags[c.cond.notFlag] && condOk(now,{...c.cond,ap:0}))
     if(blocked&&now.gold>=30){await shop(true);continue}
     await page.screenshot({path:`${output}/night-${s.night}-hub-finished.png`})
     const start=visible.find(c=>/开工|接诊|开诊/.test(c.text))
     assert(start,'Start clinic remains available')
     await click(page.getByRole('button',{name:start.text.replaceAll('**',''),exact:true}))
    }
   }else{
    const visible=step.choices.filter(c=>condOk(now,c.cond))
    // Read the book rather than nap in night 1, so the ordinary 3-AP budget is observed.
    const c=visible.find(c=>c.next==='n1_rest2b')??visible.find(c=>c.tag==='good')??visible[0]
    await click(page.getByRole('button',{name:c.text.replaceAll('**',''),exact:true}))
   }
  }else if(step.readout){
   // Let the original typewriter + full CR readout animation finish, unmodified.
   await page.waitForFunction(id=>JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).stepId!==id,s.stepId,{timeout:30000})
   log.push({kind:'readout',night:s.night,step:s.stepId,text:step.text})
  }else{
   const p=page.locator('.dialog-box > p')
   if(!(await page.locator('.dialog-box > span.animate-bounce').count()))await click(p)
   await page.locator('.dialog-box > span.animate-bounce').waitFor({timeout:20000})
   log.push({kind:'dialogue',night:s.night,step:s.stepId,text:await p.innerText()})
   await click(p)
  }
  seen.add(s.stepId)
  await page.waitForFunction(id=>JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).stepId!==id,s.stepId,{timeout:10000})
  if(seen.size%40===0)console.log('PLAY',seen.size,(await state()).stepId)
 }
 const final=await state()
 assert(final.finished&&final.stamps.length===5,'Must complete all five nights without skip')
 assert.equal(hubs.size,5)
 assert.deepEqual(errors,[])
 await page.screenshot({path:`${output}/morning.png`})
 log.push({kind:'summary',uniqueSteps:seen.size,hubs:[...hubs],stamps:final.stamps,explorationFlags:[...finishedEvents.keys()],errors})
 console.log('PASS real first-chapter UI walk:',JSON.stringify(log.at(-1)))
}catch(e){log.push({kind:'failure',message:String(e),state:await state(),body:await page.locator('body').innerText()});await page.screenshot({path:`${output}/failure.png`});throw e}
finally{writeFileSync(`${output}/walk.json`,JSON.stringify(log,null,2));await browser.close()}
