// One full opening, then affected input/layout checks. No repeated main-game playthroughs.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { freshState } from '../src/game/store.ts'
import { getLdctNode } from '../src/game/ldct.ts'
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const url = process.env.GAME_URL || 'http://127.0.0.1:8798/'
const out = resolve('../../ldct-projection-review')
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1366, height: 850 } })
const page = await context.newPage()
page.setDefaultTimeout(12000)
const key = 'midnight-radiology-save-v1'
const initial = { ...freshState('m'), gold:800, skill:12, heart:9, wealth:4, night:4,
  buyCount:9, lotteryNight:4, lotteryCount:3, flags:{quiz_grade:'A'}, dlc:{ch2:{done:true,certificate:{code:'YSK2-test'}},dr:{served:['one']},dsa:{dose:10}} }
const errors = [], missing = []
page.on('pageerror', e=>errors.push(e.message))
page.on('response', r=>{if(r.status()>=400) missing.push(r.url())})
await context.addInitScript(({key,initial})=>{
  if(!localStorage.getItem(key)) localStorage.setItem(key,JSON.stringify(initial))
  localStorage.setItem('mr-ldct-unlock','1')
  sessionStorage.setItem('mr-rotate-dismissed','1')
}, {key,initial})
const saved = ()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key)
const progress = async()=> (await saved()).dlc.ldct.ldct
const bg = ()=>page.mouse.click(1250,200)
async function enter(){await page.locator('[data-chapter-enter]').click({timeout:45000});await page.locator('[data-ldct-screen]').waitFor()}
async function reveal(){
 const s=await saved(), p=s.dlc.ldct.ldct
 const expected=(p.reply?.text??getLdctNode(s).text).replaceAll('**','')
 const text=page.locator('[data-ldct-dialogue] .dialog-box > p')
 if(await text.textContent()!==expected) await bg()
 await page.waitForFunction(expected=>document.querySelector('[data-ldct-dialogue] .dialog-box > p')?.textContent===expected,expected,{timeout:12000})
}
async function ready(){await page.locator('[data-ldct-dialogue][data-choice-ready="true"]').waitFor();await page.waitForTimeout(320)}
async function choose(id){await reveal();await ready();await page.locator(`[data-ldct-choice="${id}"]`).click()}
async function checkLayout(){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no horizontal overflow')}
async function lab(round){
 await page.locator(`.ldct-lab[data-round="${round}"]`).waitFor()
 if(round===1){
  await page.getByRole('button',{name:'追踪左上的圆块',exact:true}).click()
  await page.getByRole('slider',{name:'绕着看',exact:true}).fill('90')
  await page.getByRole('button',{name:'追踪左下的小细棒',exact:true}).click()
  const draft=(await progress()).labDraft
  await page.reload();await enter()
  assert.deepEqual((await progress()).labDraft,draft)
  await context.setOffline(true)
 }else if(round===2){
  for(let i=0;i<5;i++) await page.getByRole('button',{name:'再铺几个方向 →',exact:true}).click()
 }else if(round===3){
  await page.getByRole('button',{name:'柔一些 · Hann',exact:true}).click()
  const handle=page.getByRole('button',{name:'拖动比较分界',exact:true}), bounds=await handle.boundingBox()
  await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2)
  await page.mouse.down();await page.mouse.move(bounds.x-60,bounds.y+bounds.height/2,{steps:5});await page.mouse.up()
  assert((await progress()).labDraft.divider<45,'on-image comparison actually drags')
 }else if(round===4){
  await page.getByRole('button',{name:'少',exact:true}).click()
  await page.getByRole('button',{name:'柔一些',exact:true}).click()
 }else{
  await page.getByRole('button',{name:'算投影、对差别、改第一轮 →',exact:true}).click()
  await page.getByRole('button',{name:'再改到第 2 轮 →',exact:true}).click()
  await page.getByRole('button',{name:'再改到第 4 轮 →',exact:true}).click()
  await page.getByRole('button',{name:'看看这一轮还差在哪',exact:true}).click()
  await page.getByRole('button',{name:'退回上一版看看',exact:true}).click()
  assert.equal((await progress()).labDraft.iterationStep,2)
 }
 await page.screenshot({path:resolve(out,`stage-${round}-desktop.png`)})
 if(round===1||round===5){
  await page.setViewportSize({width:390,height:844});await checkLayout()
  await page.screenshot({path:resolve(out,`stage-${round}-mobile.png`)})
  await page.setViewportSize({width:844,height:390});await checkLayout()
  await page.screenshot({path:resolve(out,`stage-${round}-landscape.png`)})
  await page.setViewportSize({width:1366,height:850})
 }
 await page.getByRole('button',{name:'还拿不准，也记下来',exact:true}).click()
 await page.waitForTimeout(930)
 await page.getByRole('button',{name:'收进记录，回到对话 →',exact:true}).click()
 assert.equal((await progress()).phase,'story')
}
try{
 await page.goto(url+'#/dlc/ldct');await enter()
 assert.equal((await progress()).nodeId,'dinner_0')
 await reveal();await page.waitForTimeout(320);await bg()
 assert.equal((await progress()).nodeId,'dinner_1','background click advances, not only text')
 await reveal();await page.screenshot({path:resolve(out,'dialogue-desktop.png')})
 await page.setViewportSize({width:390,height:844});await checkLayout()
 await page.screenshot({path:resolve(out,'dialogue-mobile.png')})
 await page.setViewportSize({width:1366,height:850})
 let transitions=0, hubVisits=0
 while((await progress()).phase!=='settle'){
  assert(++transitions<180,'opening reaches stayable ending')
  let p=await progress()
  if(transitions%10===0||p.phase==='lab') console.log('walk',transitions,p.nodeId,p.phase)
  if(p.phase==='lab'){await lab(p.labRound);continue}
  if(p.nodeId==='hub'&&!hubVisits++){
   await page.getByRole('button',{name:'🛒 小卖部',exact:true}).click()
   const coffee=page.locator('.ldct-shop-row').filter({hasText:'速溶咖啡'})
   await coffee.getByRole('button',{name:'购买',exact:true}).dblclick();assert.equal((await saved()).gold,770)
   await page.waitForTimeout(520)
   await page.locator('.ldct-shop-row').filter({hasText:'零食礼包'}).getByRole('button',{name:'购买',exact:true}).click()
   await page.waitForTimeout(520)
   await page.locator('.ldct-shop-row').filter({hasText:'全科室奶茶'}).getByRole('button',{name:'购买',exact:true}).click()
   await page.getByRole('button',{name:'关闭 ×',exact:true}).click()
   p=await progress()
  }
  await reveal()
  if(p.nodeId==='dinner_q'){
   await ready()
   const target=await page.locator('[data-ldct-choice="food"]').boundingBox()
   // Start fast tapping elsewhere then continue over the newly ready answer.
   await bg()
   for(let i=0;i<16;i++){await page.mouse.click(target.x+20,target.y+20);await page.waitForTimeout(60)}
   assert.equal((await progress()).nodeId,'dinner_q','ongoing fast clicks cannot select')
   await page.waitForTimeout(340);await choose('food');continue
  }
  if(p.nodeId==='chat_lu_0'&&!p.reply&&!p.gifts.some(g=>g.person==='luzhou')){
   await ready();await page.getByRole('button',{name:'🧋 把奶茶递过去',exact:true}).click()
   assert.equal((await saved()).heart,11);continue
  }
  if(p.nodeId==='chat_lei_0'&&!p.reply&&!p.gifts.some(g=>g.person==='lei')){
   await ready();await page.getByRole('button',{name:'🍪 拆开零食一起吃',exact:true}).click();continue
  }
  const node=getLdctNode(await saved()), hasChoices=!p.reply&&(node.choices?.length||await page.getByRole('button',{name:'接着聊',exact:true}).count())
  if(hasChoices){
   await ready()
   const choices=page.locator('[data-ldct-choice]'),ids=await choices.evaluateAll(els=>els.map(el=>el.dataset.ldctChoice))
   const preferred=['lu','lei','chief','tell','experiment','keep_both','organize','invite','finish','tea']
   if(ids.length){const id=preferred.find(x=>ids.includes(x))||ids[0];await page.locator(`[data-ldct-choice="${id}"]`).click()}
   else await page.getByRole('button',{name:'接着聊',exact:true}).click()
  }else{
   // Gift buttons are delayed along with ordinary choices; consult state, not
   // immediate DOM count, before advancing the whole-stage dialogue.
   const giftAvailable=!p.reply&&node.giftPerson&&!p.gifts.some(g=>g.person===node.giftPerson)&&(await saved()).items.some(id=>['milktea','snack'].includes(id))
   if(giftAvailable){await ready();await page.getByRole('button',{name:'接着聊',exact:true}).click()}
   else{await page.waitForTimeout(320);await bg()}
  }
 }
 const final=await saved()
 assert.equal(final.skill,13);assert.equal(final.wealth,5);assert.equal(final.heart,12);assert.equal(final.gold,530)
 assert.deepEqual(Object.keys(final.dlc.ldct.ldct.records),['1','2','3','4','5'])
 for(const k of ['night','buyCount','lotteryNight','lotteryCount','flags']) assert.deepEqual(final[k],initial[k])
 for(const id of ['ch2','dr','dsa']) assert.deepEqual(final.dlc[id],initial.dlc[id])
 assert.equal(final.badges.filter(id=>id==='ldct_first_comparison').length,1)
 await page.screenshot({path:resolve(out,'settlement.png')})
 await page.getByRole('button',{name:'▤ 实验记录',exact:true}).first().click()
 await page.getByRole('button',{name:'回实验台比较',exact:true}).last().click()
 await page.getByRole('button',{name:'陆舟，带我看一下',exact:true}).click()
 await page.getByRole('button',{name:'还拿不准，也记下来',exact:true}).click();await page.waitForTimeout(930)
 await page.getByRole('button',{name:'收进记录，回到对话 →',exact:true}).click()
 assert.equal((await progress()).phase,'settle');assert.equal((await saved()).skill,13)
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log(JSON.stringify({passed:true,transitions,offline:true,output:out,rounds:5,wholeStageClick:true}))
}catch(error){await page.screenshot({path:resolve(out,'failure.png')});console.error('STATE',await progress());throw error}finally{await browser.close()}
