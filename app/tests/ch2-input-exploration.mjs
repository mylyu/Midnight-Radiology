import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
import { CH2_SHIFTS } from '../src/game/ch2.ts'
import { ch2StepForState } from '../src/game/ch2.ts'
import { condOk } from '../src/game/store.ts'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, ...(process.env.EDGE_TEST === '1' ? { channel: 'msedge' } : process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
const errors = []
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
 const flags = {c2n1_a:true,c2n1_b:true,c2n1_c:true,c2n1_e:true,c2n3_a:true,c2n3_d:true,c2n3_k:true,c2n5_cabinet:true,c2n5_e:true,c2n5_b:true,bai_tube:true,mystery_told:true}
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

 // At zero AP, places still exist but do not grant a skipped event or item.
 for(const hub of ['c2n1_hub','c2n3_hub','c2n5_hub']) {
  const shift=CH2_SHIFTS.find(s=>s.steps[hub])
  const s={...base,ap:0,items:[],flags:{}}
  const step=ch2StepForState(hub,shift.steps[hub],s)
  const walks=step.choices.filter(c=>c.next.includes('_visit_')&&condOk(c.cond,s))
  assert(walks.length>=(hub==='c2n5_hub'?2:3),hub+' must keep places at zero AP')
  if(hub==='c2n5_hub') assert(step.choices.some(c=>c.next==='c2n5_a1'&&condOk(c.cond,s)),'Main-story cabinet remains free at zero AP')
  for(const c of walks) {
   const node=ch2StepForState(c.next,shift.steps[c.next],s)
   assert(!node.effect&&!node.card&&!node.event&&!c.effect)
  }
 }

 // Stress the shared input path, not a single named dialogue. Simulate audio
 // loading forever: navigation must never await audio. Only private test profiles.
 for (const hub of ['c2n1_hub','c2n3_hub','c2n5_hub']) {
  const shift=CH2_SHIFTS.find(s=>s.steps[hub])
  const {context,page}=await open({flags,dlc:{ch2:{shift:shift.id,stepId:hub}}})
  await reveal(page)
  const place=page.getByRole('button',{name:/走廊|设备间/}).first()
  await place.waitFor({timeout:3000})
  for (let i=0;i<8;i++) {
   await page.getByRole('button',{name:'📚 旧书',exact:true}).click()
   await page.getByRole('button',{name:'合上书，回科室',exact:true}).click()
   await page.evaluate(()=>{document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('focus'))})
   await page.getByRole('button',{name:'小卖部',exact:true}).click()
   await page.getByRole('button',{name:/回科室|离开小卖部|继续值班/}).last().click()
  }
  await place.click()
  await page.waitForFunction(hub=>document.querySelector('[data-ch2-step]')?.getAttribute('data-ch2-step')!==hub,hub,{timeout:3000})
  console.log('VISIT',hub,await page.locator('[data-ch2-step]').getAttribute('data-ch2-step'))
  await advance(page)
  await page.locator(`[data-ch2-step="${hub}"]`).waitFor({timeout:3000})
  await reveal(page)
  await place.click()
  await page.waitForFunction(hub=>document.querySelector('[data-ch2-step]')?.getAttribute('data-ch2-step')!==hub,hub,{timeout:3000})
  await context.close()
 }
 assert.deepEqual(errors,[])
 console.log('PASS: 3 hubs, repeated location visits, 48 overlay open/close cycles and focus recovery; no refresh.')
} finally {await browser.close()}
