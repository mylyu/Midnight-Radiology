import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { CH2_SHIFTS } from '../src/game/ch2.ts'
import { ch2StepForState } from '../src/game/ch2.ts'
import { LEGACY_EXPLORATION_HUBS, originalCh2Step } from '../src/game/ch2-exploration.ts'
import { condOk } from '../src/game/store.ts'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, ...(process.env.EDGE_TEST === '1' ? { channel: 'msedge' } : process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
const errors = []
const output=process.env.WALK_OUTPUT||'../../ch2-original-exploration-review'
mkdirSync(output,{recursive:true})
const base = { gender: 'm', night: 5, gold: 500, skill: 3, wealth: 3, heart: 3, durability: 70, badges: [], stamps: [], flags: {}, lastCheckin: '', streak: 0, finished: true, seed: 1234, items: ['snack', 'book'], ap: 3, buyCount: 0, cards: [], events: [] }
async function open(patch, hash = '#/ch2') {
 const context = await browser.newContext({ viewport: {width: 1280, height: 900} })
 await context.addInitScript(s => {
  HTMLMediaElement.prototype.play = function () { return new Promise(() => {}) }
  localStorage.setItem('mr-ch2-unlock', '1')
  if (!localStorage.getItem('midnight-radiology-save-v1')) localStorage.setItem('midnight-radiology-save-v1', JSON.stringify(s))
 }, {...base, ...patch})
 const page = await context.newPage()
 page.on('pageerror', e => errors.push(e.message))
 await page.goto((process.env.GAME_URL || 'http://127.0.0.1:8798/') + hash)
 return {context, page}
}
async function reveal(page) { await page.locator('.dialog-box > p').click() }
async function advance(page) {
 if (!(await page.locator('.dialog-box > span.animate-bounce').count())) await reveal(page)
 await page.locator('.dialog-box > span.animate-bounce').waitFor({timeout: 4000})
 await page.locator('.dialog-box > p').click()
}
try {
 // Freshly resetting progress used to leave previous-run exploration flags set.
 const flags = {c2n1_a:true,c2n1_b:true,c2n1_c:true,c2n1_e:true,c2n3_a:true,c2n3_d:true,c2n3_k:true,c2n3_bk:true,c2n3_chat_done:true,c2n5_cabinet:true,c2n5_e:true,c2n5_b:true,c2n5_chat_done:true,bai_tube:true,mystery_told:true}
 const {context, page} = await open({ flags, dlc:{ch2:{done:true,shift:'c2am',stepId:'c2am_9'}} }, '#/hall')
 await page.getByRole('button',{name:'再玩一遍',exact:true}).click()
 await page.locator('[data-ch2-step="c2n1_0"]').waitFor({timeout:5000})
 for (let i=0;i<7;i++) await advance(page)
 await page.locator('[data-ch2-step="c2n1_hub"]').waitFor()
 await reveal(page)
 await page.getByRole('button',{name:/厂家撤场前交底/}).waitFor({timeout:3000})
 const s=await page.evaluate(()=>JSON.parse(localStorage.getItem('midnight-radiology-save-v1')))
 assert.equal(s.flags.bai_tube,true)
 assert.equal(s.flags.mystery_told,true)
 await context.close()
 console.log('PASS: replay restarts the first CT shift and restores exploration without clearing Ch1 memory.')

 // Re-entering the browser must not repeatedly give check-in AP/gold or charge
 // a location's AP cost. An explicit empty ledger models a not-yet-entered node.
 for(const [id,expectedAp,expectedGold] of [['c2n1_1',6,550],['c2n1_c1',2,500]]) {
  const {context,page}=await open({dlc:{ch2:{shift:'c2n1',stepId:id,appliedSteps:[]}}})
  const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('midnight-radiology-save-v1')))
  await page.locator(`[data-ch2-step="${id}"]`).waitFor()
  await page.waitForFunction(id=>JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.appliedSteps.includes('ch2-'+id),id)
  assert.equal((await read()).ap,expectedAp)
  assert.equal((await read()).gold,expectedGold)
  for(let i=0;i<3;i++) {
   await page.reload()
   await page.locator(`[data-ch2-step="${id}"]`).waitFor()
   assert.equal((await read()).ap,expectedAp)
   assert.equal((await read()).gold,expectedGold)
  }
  await context.close()
 }
 console.log('PASS: 6 reloads preserve AP/gold; effects apply once per run.')

 // Match Ch1: completion hides events, AP/items gate only unvisited events.
 // condOk takes (state, condition); the previous test had these reversed.
 for(const hub of ['c2n1_hub','c2n3_hub','c2n5_hub']) {
  const shift=CH2_SHIFTS.find(s=>s.steps[hub])
  for(const ap of [0,3])for(const items of [[],['snack','book']])for(const visited of [{},flags]) {
   const s={...base,ap,items,flags:visited}
   const step=ch2StepForState(hub,shift.steps[hub],s)
   assert.deepEqual(step.choices,shift.steps[hub].choices,'Never rewrite the original choice rules')
   for(const c of step.choices) {
    assert(!c.next.includes('_visit_')&&!c.text.includes('随便走走'))
    if(c.cond?.notFlag&&visited[c.cond.notFlag])assert(!condOk(s,c.cond),'Completed event is hidden: '+c.next)
    if(c.cond?.ap&&ap<c.cond.ap)assert(!condOk(s,c.cond),'No AP means no paid event: '+c.next)
    if(c.cond?.item&&!items.includes(c.cond.item))assert(!condOk(s,c.cond),'Missing item: '+c.next)
   }
   if(hub==='c2n5_hub'&&!visited.c2n5_cabinet)assert(step.choices.some(c=>c.next==='c2n5_a1'&&condOk(s,c.cond)),'Main-story cabinet remains free')
  }
 }
 assert(!CH2_SHIFTS.some(s=>Object.keys(s.steps).some(id=>id.includes('_visit_'))))
 assert.equal(originalCh2Step('c2n1_e2'),'c2n1_e2')
 console.log('PASS: original completion/AP/item conditions retained across 24 hub states; no revisit scenes.')

 // Every removed scene resumes its hub, whether an event was already completed
 // or was never played (the rejected version allowed free walking with no AP).
 for(const [oldId,hub] of Object.entries(LEGACY_EXPLORATION_HUBS))for(const visited of [{},flags]) {
  const shift=CH2_SHIFTS.find(s=>s.steps[hub])
  const patch={ap:0,flags:visited,cards:['old_book_note'],badges:['fixer'],events:['test-history'],dlc:{dr:{done:true},ch2:{shift:shift.id,stepId:oldId,appliedSteps:['ch2-c2n1_1']}}}
  const {context,page}=await open(patch)
  await page.locator(`[data-ch2-step="${hub}"]`).waitFor()
  const s=await page.evaluate(()=>JSON.parse(localStorage.getItem('midnight-radiology-save-v1')))
  assert.equal(s.dlc.ch2.stepId,hub)
  for(const key of ['ap','flags','cards','badges','events'])assert.deepEqual(s[key],patch[key])
  assert.equal(s.gold,base.gold)
  assert.deepEqual(s.dlc.dr,patch.dlc.dr)
  await context.close()
 }
 console.log('PASS: all 11 removed scene IDs resume safely, both completed and unvisited saves (22 cases).')

 // Finish original events with normal dialogue/choices; returning to the hub,
 // refreshing or buying coffee must not bring the completed interaction back.
 for(const [hub,target,flag,cost] of [
  ['c2n1_hub','c2n1_e1','c2n1_e',1],
  ['c2n3_hub','c2n3_d1','c2n3_d',1],
  ['c2n3_hub','c2n3_bk1','c2n3_bk',0],
  ['c2n5_hub','c2n5_e1','c2n5_e',1],
 ]) {
  const shift=CH2_SHIFTS.find(s=>s.steps[hub])
  const choice=shift.steps[hub].choices.find(c=>c.next===target)
  const {context,page}=await open({dlc:{ch2:{shift:shift.id,stepId:hub}}})
  await reveal(page)
  await page.getByRole('button',{name:choice.text,exact:true}).click()
  let returned=false
  for(let i=0;i<30;i++) {
   const id=await page.locator('[data-ch2-step]').getAttribute('data-ch2-step')
   if(id===hub){returned=true;break}
   const node=shift.steps[id]
   if(node.choices) {
    await reveal(page)
    const s=await page.evaluate(()=>JSON.parse(localStorage.getItem('midnight-radiology-save-v1')))
    const c=node.choices.find(c=>condOk(s,c.cond))
    await page.getByRole('button',{name:c.text.replaceAll('**',''),exact:true}).click()
   }else await advance(page)
   await page.waitForFunction(id=>document.querySelector('[data-ch2-step]')?.getAttribute('data-ch2-step')!==id,id)
  }
  assert(returned,'Exploration returns to hub')
  await reveal(page)
  let s=await page.evaluate(()=>JSON.parse(localStorage.getItem('midnight-radiology-save-v1')))
  assert.equal(s.flags[flag],true)
  assert.equal(s.ap,base.ap-cost)
  assert.equal(await page.getByRole('button',{name:choice.text,exact:true}).count(),0)
  await page.reload()
  await reveal(page)
  assert.equal(await page.getByRole('button',{name:choice.text,exact:true}).count(),0)
  await page.getByRole('button',{name:'小卖部',exact:true}).click()
  await page.getByRole('button',{name:'购买速溶咖啡',exact:true}).click()
  await page.getByRole('button',{name:/回科室|离开小卖部|继续值班/}).last().click()
  s=await page.evaluate(()=>JSON.parse(localStorage.getItem('midnight-radiology-save-v1')))
  assert.equal(s.ap,base.ap-cost+1)
  assert.equal(s.gold,base.gold-30)
  assert.equal(await page.getByRole('button',{name:choice.text,exact:true}).count(),0)
  await page.screenshot({path:`${output}/${target}-finished.png`})
  await context.close()
 }
 console.log('PASS: 4 original event routes disappear on completion, stay gone after refresh/coffee (including free book event).')

 // At zero AP the two item-gated events are absent without their items, while
 // the free chapter book/shop remain usable. Coffee reopens ONLY unseen events.
 {
  const {context,page}=await open({ap:0,items:[],flags:{c2n3_a:true},dlc:{ch2:{shift:'c2n3',stepId:'c2n3_hub'}}})
  await reveal(page)
  await page.getByRole('button',{name:'小卖部',exact:true}).waitFor()
  assert.equal(await page.locator('.dialog-box button').count(),3)
  await page.getByRole('button',{name:'小卖部',exact:true}).click()
  await page.getByRole('button',{name:'购买速溶咖啡',exact:true}).click()
  await page.getByRole('button',{name:/回科室|离开小卖部|继续值班/}).last().click()
  await page.getByRole('button',{name:/跟小唐打听八卦/}).waitFor()
  assert.equal(await page.getByRole('button',{name:/雯雯加班|请小何|翻翻自己买/}).count(),0)
  await context.close()
 }

 // Stress the shared input path, not a single named dialogue. Simulate audio
 // loading forever: navigation must never await audio. Only private test profiles.
 for (const hub of ['c2n1_hub','c2n3_hub','c2n5_hub']) {
  const shift=CH2_SHIFTS.find(s=>s.steps[hub])
  const {context,page}=await open({flags,dlc:{ch2:{shift:shift.id,stepId:hub}}})
  await reveal(page)
  await page.getByRole('button',{name:'小卖部',exact:true}).waitFor({timeout:3000})
  assert.equal(await page.locator('.dialog-box button').count(),3)
  assert.equal(await page.getByRole('button',{name:/随便走走/}).count(),0)
  for (let i=0;i<8;i++) {
   await page.getByRole('button',{name:'📚 旧书',exact:true}).click()
   await page.getByRole('button',{name:'合上书，回科室',exact:true}).click()
   await page.evaluate(()=>{document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('focus'))})
   await page.getByRole('button',{name:'小卖部',exact:true}).click()
   await page.getByRole('button',{name:/回科室|离开小卖部|继续值班/}).last().click()
  }
  assert.equal(await page.locator('.dialog-box button').count(),3)
  await page.screenshot({path:`${output}/${hub}-finished.png`})
  await page.getByRole('button',{name:/【开诊】/}).click()
  await page.locator(`[data-ch2-step="${shift.id}_m0"]`).waitFor({timeout:3000})
  await context.close()
 }
 assert.deepEqual(errors,[])
 console.log('PASS: all 3 hubs hide completed events even at 3 AP; 48 overlay cycles + focus recovery + clinic entry with stalled audio.')
} finally {await browser.close()}
