import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { freshState } from '../src/game/store.ts'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const baseUrl = process.env.GAME_URL || 'http://127.0.0.1:8798/'
const out = resolve('../../ldct-opening-review')
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1366, height: 850 } })
const page = await context.newPage()
const key = 'midnight-radiology-save-v1'
const initial = { ...freshState('m'), gold:800, skill:12, heart:9, wealth:4, night:4,
  buyCount:9, lotteryNight:4, lotteryCount:3, flags:{quiz_grade:'A'}, dlc:{ch2:{done:true,certificate:{code:'YSK2-test'}},dr:{served:['one']},dsa:{dose:10}} }
const errors = [], missing = []
page.on('pageerror', e=>errors.push(e.message))
page.on('response', r=>{if(r.status()>=400) missing.push(r.url())})
await context.addInitScript(({key,initial})=>{
  if(!localStorage.getItem(key)) localStorage.setItem(key,JSON.stringify(initial))
  sessionStorage.setItem('mr-rotate-dismissed','1')
}, {key,initial})
const saved = ()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key)
const progress = async()=> (await saved()).dlc.ldct.ldct
async function enterReady(){await page.locator('[data-chapter-enter]').click({timeout:45000});await page.locator('[data-ldct-screen]').waitFor()}
async function fullText(){const el=page.locator('.ldct-text');if(await el.count()) await el.click();}
async function readyChoice(){await page.locator('[data-ldct-dialogue][data-choice-ready="true"]').waitFor();await page.waitForTimeout(310)}
async function choose(id){await fullText();await readyChoice();await page.locator(`[data-ldct-choice="${id}"]`).click()}
async function lab(round){
  await page.getByRole('button',{name:'把这版固定为 A',exact:true}).click()
  await page.getByRole('button',{name:'迭代示例',exact:false}).click()
  await page.getByRole('button',{name:'强',exact:true}).click()
  await page.getByRole('slider',{name:'对照分界',exact:true}).fill('36')
  await page.getByRole('button',{name:'下一层 →',exact:true}).click()
  await page.getByRole('button',{name:'圈个拿不准的地方',exact:true}).click()
  const stage=page.getByTestId('ldct-comparison'), box=await stage.boundingBox()
  await page.mouse.click(box.x+box.width*.64,box.y+box.height*.65)
  assert.equal(Math.round((await progress()).labDraft.mark.x),64)
  if(round===1){
    const draft=(await progress()).labDraft
    await page.reload(); await enterReady()
    assert.deepEqual((await progress()).labDraft,draft)
    await context.setOffline(true)
    await page.screenshot({path:resolve(out,'lab-desktop.png')})
    await page.setViewportSize({width:390,height:844})
    await page.screenshot({path:resolve(out,'lab-mobile.png'),fullPage:true})
    await page.setViewportSize({width:844,height:390})
    await page.screenshot({path:resolve(out,'lab-landscape.png')})
    await page.setViewportSize({width:1366,height:850})
    await page.getByRole('button',{name:'叫陆舟一起看',exact:true}).click()
  }
  await page.getByRole('button',{name:'记下：我还不确定',exact:true}).click()
  await page.getByRole('button',{name:'看模体原本有什么',exact:true}).click()
  await page.screenshot({path:resolve(out,`reveal-${round}.png`)})
  await page.waitForTimeout(930)
  await page.getByRole('button',{name:'把对照收进记录 →',exact:true}).click()
}
try{
 await page.goto(baseUrl+'#/dlc/ldct')
 await page.locator('[data-ldct-entry]').waitFor({timeout:45000})
 assert.equal((await saved()).dlc.ldct,undefined,'locked link does not initialize')
 await page.getByLabel('低剂量CT访问码').fill('wrong')
 await page.getByRole('button',{name:'解锁体验',exact:true}).click()
 await page.getByRole('alert').filter({hasText:'访问码不对'}).waitFor()
 await page.getByLabel('低剂量CT访问码').fill('ldct2258')
 await page.getByRole('button',{name:'解锁体验',exact:true}).click()
 await page.getByRole('button',{name:'开始开场体验',exact:true}).click(); await enterReady()
 assert.equal((await progress()).nodeId,'dinner_0')
 await page.screenshot({path:resolve(out,'dinner.png')})
 let transitions=0, hubVisits=0
 while((await progress()).phase!=='settle'){
  assert(++transitions<160,'opening must reach ending')
  const p=await progress()
  if(p.phase==='lab'){await lab(p.labRound);continue}
  if(p.nodeId==='hub'&&!hubVisits++){
   await page.getByRole('button',{name:'🛒 小卖部',exact:true}).click()
   const coffee=page.locator('.ldct-shop-row').filter({hasText:'速溶咖啡'})
   await coffee.getByRole('button',{name:'购买',exact:true}).dblclick()
   assert.equal((await saved()).gold,770,'coffee double tap onecharge')
   await page.waitForTimeout(520)
   await page.locator('.ldct-shop-row').filter({hasText:'零食礼包'}).getByRole('button',{name:'购买',exact:true}).click()
   await page.waitForTimeout(520)
   await page.locator('.ldct-shop-row').filter({hasText:'全科室奶茶'}).getByRole('button',{name:'购买',exact:true}).click()
   await page.getByRole('button',{name:'关闭 ×',exact:true}).click()
  }
  if(p.nodeId==='dinner_q'){
    await fullText()
    const target=await page.locator('[data-ldct-choice="food"]').boundingBox()
    for(let i=0;i<16;i++){await page.mouse.click(target.x+20,target.y+20);await page.waitForTimeout(60)}
    assert.equal((await progress()).nodeId,'dinner_q','continuous clicks cannot choose')
    await page.waitForTimeout(330);await choose('food');continue
  }
  if(p.nodeId==='chat_lu_0'&&!p.reply&&!p.gifts.some(g=>g.person==='luzhou')){
    await fullText();await readyChoice();await page.getByRole('button',{name:'🧋 把奶茶递过去',exact:true}).click()
    assert.equal((await saved()).heart,11)
    await page.screenshot({path:resolve(out,'gift.png')});continue
  }
  if(p.nodeId==='chat_lei_0'&&!p.reply&&!p.gifts.some(g=>g.person==='lei')){
    await fullText();await readyChoice();await page.getByRole('button',{name:'🍪 拆开零食一起吃',exact:true}).click();continue
  }
  const choices=page.locator('[data-ldct-choice]')
  await fullText()
  if(await choices.count()){
    await readyChoice()
    const ids=await choices.evaluateAll(els=>els.map(el=>el.dataset.ldctChoice))
    const preferred=['lu','lei','chief','tell','experiment','keep_both','organize','invite','finish']
    const id=preferred.find(x=>ids.includes(x))||ids[0]
    await page.locator(`[data-ldct-choice="${id}"]`).click()
  }else{
    await page.waitForTimeout(320)
    const skip=page.getByRole('button',{name:'接着聊',exact:true})
    if(await skip.count()){await readyChoice();await skip.click()}else await fullText()
  }
 }
 const final=await saved()
 assert.equal(final.skill,13);assert.equal(final.wealth,5);assert.equal(final.heart,12);assert.equal(final.gold,530)
 for(const k of ['night','buyCount','lotteryNight','lotteryCount','flags']) assert.deepEqual(final[k],initial[k])
 for(const id of ['ch2','dr','dsa']) assert.deepEqual(final.dlc[id],initial.dlc[id])
 assert.equal(final.badges.filter(id=>id==='ldct_first_comparison').length,1)
 await page.screenshot({path:resolve(out,'settlement.png')})
 await page.setViewportSize({width:390,height:844})
 await page.screenshot({path:resolve(out,'settlement-mobile.png')})
 await page.getByRole('button',{name:'▤ 实验记录',exact:true}).first().click()
 await page.getByRole('button',{name:'回实验台比较',exact:true}).first().click()
 await page.getByRole('button',{name:'先回值班室',exact:true}).click()
 assert.equal((await progress()).phase,'settle')
 await page.getByRole('button',{name:'只重玩本开场',exact:true}).click()
 await page.getByRole('button',{name:'确认重玩本开场',exact:true}).click()
 assert.equal((await progress()).nodeId,'dinner_0');assert.equal((await saved()).skill,13)
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[])
 console.log(JSON.stringify({passed:true,transitions,offline:true,output:out,totals:{gold:final.gold,skill:final.skill,heart:final.heart,wealth:final.wealth}}))
}catch(error){await page.screenshot({path:resolve(out,'failure.png')});console.error('STATE',await progress());throw error}finally{await browser.close()}
