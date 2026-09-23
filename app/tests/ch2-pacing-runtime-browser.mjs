// All browser tests use new disposable Edge profiles; never touch the player's tab.
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {CH2_SHIFTS,QUIZ2} from '../src/game/ch2.ts'
import {freshState} from '../src/game/store.ts'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright')
const browser=await chromium.launch({channel:'msedge',headless:true})
const errors=[],url=(process.env.GAME_URL||'http://127.0.0.1:8798/')+'#/ch2'
const base={...freshState('m'),night:5,gold:3000,finished:true,buyCount:21,lotteryNight:5,lotteryCount:2,flags:{quiz_grade:'A',n5_qian:true,n5_fan:true},dlc:{dr:{done:true},dsa:{dose:21}}}
const read=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('midnight-radiology-save-v1')))
async function open(progress,patch={},mobile=false){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900}})
 const save={...base,...patch,dlc:{...base.dlc,ch2:progress}}
 await context.addInitScript(s=>{localStorage.setItem('mr-ch2-unlock','1');if(!localStorage.getItem('midnight-radiology-save-v1'))localStorage.setItem('midnight-radiology-save-v1',JSON.stringify(s))},save)
 const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));await page.goto(url)
 await page.locator('[data-ch2-step]').waitFor()
 return {context,page}
}
async function reveal(page){await page.locator('.dialog-box > p').click();await page.waitForTimeout(80)}
async function frozen(page){const s=await read(page);assert.equal(s.night,5);assert.equal(s.buyCount,21);assert.equal(s.lotteryCount,2);assert.equal(s.lotteryNight,5);assert.equal(s.flags.quiz_grade,'A');assert.deepEqual(s.dlc.dr,base.dlc.dr);assert.deepEqual(s.dlc.dsa,base.dlc.dsa)}
try{
 for(const [i,shift] of CH2_SHIFTS.slice(0,5).entries()){
  const stepId=Object.entries(shift.steps).find(([,step])=>step.end)[0]
  const {context,page}=await open({shift:shift.id,stepId,appliedSteps:['ch2-'+stepId]}, {},i%2===1)
  await reveal(page)
  await page.getByRole('button',{name:/本班结束 · 结算/}).click()
  await page.locator('[data-ch2-phase="settle"]').waitFor()
  const saved=await read(page);assert.equal(saved.dlc.ch2.shift,shift.id)
  await page.reload();await page.locator('[data-ch2-settlement]').waitFor()
  assert.equal((await read(page)).gold,saved.gold)
  await page.getByRole('button',{name:'🛒 小卖部',exact:true}).click()
  const shop=page.getByRole('dialog',{name:'第二章小卖部'});await shop.waitFor()
  if(i < 4) {
   await shop.getByRole('button',{name:'购买全科室奶茶',exact:true}).click()
   assert((await read(page)).items.includes('milktea'))
  } else assert(!(await read(page)).items.includes('milktea'), 'last gift scene passed: no stock sold')
  assert(await shop.getByRole('button',{name:'购买全科室奶茶',exact:true}).isDisabled())
  if(i===0){await shop.getByRole('button',{name:'购买速溶咖啡',exact:true}).click();assert((await read(page)).dlc.ch2.pendingCoffee)}
  if(i===4)assert(await shop.getByRole('button',{name:'购买速溶咖啡',exact:true}).isDisabled())
  await shop.getByRole('button',{name:'离开小卖部',exact:true}).click()
  await page.getByRole('button',{name:'查看背包用途',exact:true}).click()
  assert.equal(await page.getByRole('button',{name:/请同事喝奶茶|把夜宵分/}).count(),0, 'gifts belong in conversations')
  if(i < 4) assert((await read(page)).items.includes('milktea'), 'closing backpack never consumes gift')
  await page.getByRole('button',{name:'收好背包',exact:true}).click()
  for(const [openName,closeName] of [['📖 夜班手册','合上手册'],['📚 已解锁书页','合上书，回科室'],['🏅 勋章墙','← 返回']]){
   await page.locator('[data-ch2-settlement]').getByRole('button',{name:openName,exact:true}).click()
   await page.getByRole('button',{name:closeName,exact:true}).click()
   assert.equal((await read(page)).dlc.ch2.shift,shift.id)
  }
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
  await frozen(page)
  await page.getByRole('button',{name:/进入下一班|前往晨会/}).click()
  await page.locator(`[data-ch2-step="${CH2_SHIFTS[i+1].start}"]`).waitFor()
  assert.equal((await read(page)).dlc.ch2.shift,CH2_SHIFTS[i+1].id)
  await context.close()
 }
 console.log('PASS: all 5 settlement pages, reload, shop/backpack/no settlement gifting/manual/book/badges/mobile, last gift cutoff, explicit next, Chapter 1 and DLC counters preserved.')

 // Legacy stale grade before the examination must still display all five questions.
 const {context,page}=await open({shift:'c2am',stepId:'c2am_2',appliedSteps:['ch2-c2am_2']},{flags:{...base.flags,quiz2_grade:'S'}})
 await reveal(page);await page.locator('.dialog-box > span.animate-bounce').waitFor();await page.locator('.dialog-box > p').click()
 await page.locator('[data-ch2-quiz]').waitFor();await page.getByText('第 1 / 5 题 · 当前得分 0',{exact:true}).waitFor()
 const before=(await read(page)).gold
 for(let i=0;i<5;i++){
  const quiz=(await read(page)).dlc.ch2.quiz,row=quiz.questions[i],correct=row.order.indexOf(QUIZ2[row.question].answer)
  await page.locator('[data-ch2-quiz]').getByRole('button',{name:QUIZ2[row.question].options[row.order[correct]],exact:true}).click()
  const selected=(await read(page)).dlc.ch2.quiz
  if(i===1){await page.reload();await page.locator('[data-ch2-quiz]').waitFor();assert.deepEqual((await read(page)).dlc.ch2.quiz,selected)}
  await page.getByRole('button',{name:i===4?'查看成绩 →':'下一题 →',exact:true}).click()
 }
 await page.getByText('S级 · 满分',{exact:true}).waitFor();assert.equal((await read(page)).gold,before+250)
 await page.reload();await page.getByText('S级 · 满分',{exact:true}).waitFor();assert.equal((await read(page)).gold,before+250)
 await page.getByRole('button',{name:'回到晨会 →',exact:true}).click();await page.locator('[data-ch2-step="c2am_3"]').waitFor()
 await page.reload();await page.locator('[data-ch2-step="c2am_3"]').waitFor();assert.equal(await page.locator('[data-ch2-quiz]').count(),0)
 await frozen(page);await context.close()
 for(const progress of [{shift:'c2am',stepId:'c2am_3'},{done:true}]){
  const {context,page}=await open(progress,{flags:{...base.flags,quiz2_grade:'A'}})
  if(progress.done)await page.getByText('🌅 夜班交接完成 · 全章汇总',{exact:true}).waitFor()
  else await page.locator('[data-ch2-step="c2am_3"]').waitFor()
  assert.equal(await page.locator('[data-ch2-quiz]').count(),0);await context.close()
 }
 assert.deepEqual(errors,[])
 console.log('PASS: stale-grade exam, all 5 questions, mid-answer reload, result reload, one reward, modern and legacy post-quiz/completed saves. No browser errors.')
}finally{await browser.close()}
