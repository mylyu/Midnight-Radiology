import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { CH2_SHIFTS, ch2StepForState } from '../src/game/ch2.ts'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
const output = process.env.CONTINUITY_OUTPUT || '../../ch2-continuity-visual'
mkdirSync(output, { recursive: true })
const errors = []
const url = process.env.GAME_URL || 'http://127.0.0.1:8798/'
async function open(id, patch = {}, mobile = false) {
 const shift = CH2_SHIFTS.find(s => s.steps[id])
 const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 } })
 await context.addInitScript(({ shift, id, patch }) => {
  localStorage.setItem('mr-ch2-unlock', '1')
  // Diagnostic fixture only. Independent playthroughs do not use these saves.
  if (!localStorage.getItem('midnight-radiology-save-v1')) localStorage.setItem('midnight-radiology-save-v1', JSON.stringify({
   gender: 'm', night: 5, gold: 500, skill: 3, wealth: 3, heart: 3, durability: 70,
   badges: [], stamps: [], flags: {}, lastCheckin: '', streak: 0, finished: true, seed: 1234,
   items: [], ap: 0, buyCount: 0, cards: [], events: [], ...patch,
   dlc: { ch2: { shift, stepId: id, viewBg: id.startsWith('c2n5_a') ? 'bg_archive' : id === 'c2n1_old_ct' ? 'bg_corridor' : 'bg_ctcontrol' } },
  }))
 }, { shift: shift.id, id, patch })
 const page = await context.newPage()
 page.on('pageerror', e => errors.push(e.message))
 await page.goto(url + '#/ch2')
 await page.locator('[data-ch2-step="' + id + '"]').waitFor()
 return { context, page, shift }
}
async function reveal(page) {
 const p = page.locator('.dialog-box > p')
 await p.click()
}
try {
 const pairs = [
  ['c2n1_p_scan','c2n1_p3'], ['c2d2_lung_scan','c2d2_4'], ['c2d2_gut_scan','c2d2_10'],
  ['c2d2_trauma_scan','c2d2_t1'], ['c2d2_wrist_scan','c2d2_wrist_result'],
  ['c2n3_repeat_scan','c2n3_m8'], ['c2n3_cta_scan','c2n3_m10'], ['c2n3_coronary_scan','c2n3_h4'],
  ['c2n3_mystery_scan','c2n3_x8'], ['c2d4_aorta_scan','c2d4_t1'], ['c2d4_metal_scan','c2d4_12a'],
  ['c2n5_child_scan','c2n5_m17'],
 ]
 for (const [scan, result] of pairs) {
  const { context, page, shift } = await open(scan)
  const asset = shift.steps[result].image
  assert.equal(await page.locator('img[src$="/' + asset + '.png"]').count(), 0, scan + ' future result leaked')
  await reveal(page)
  await page.locator('.dialog-box > span.animate-bounce').waitFor()
  await page.screenshot({ path: output + '/' + scan + '.png' })
  await page.locator('.dialog-box > p').click()
  await page.locator('[data-ch2-step="' + result + '"]').waitFor()
  await page.waitForFunction(asset => [...document.images].some(i => i.src.endsWith('/' + asset + '.png') && i.complete && i.naturalWidth > 0), asset)
  await context.close()
 }
 for (const mobile of [false, true]) {
  for (const [id, background] of [['c2n1_0','bg_ctcontrol_ready'], ['c2d2_0','bg_ctcontrol_day_ready']]) {
   const { context, page } = await open(id, {}, mobile)
   await reveal(page)
   await page.waitForFunction(asset => [...document.images].some(i => i.src.endsWith('/' + asset + '.png') && i.complete && i.naturalWidth > 0), background)
   await page.screenshot({ path: output + '/' + background + (mobile ? '-mobile' : '-desktop') + '.png' })
   await context.close()
  }
  const { context, page } = await open('c2n5_hub', {}, mobile)
  await reveal(page)
  const openCabinet = page.getByRole('button', { name: '【交接主线·不耗行动力】封条柜 · 和老周一起开锁', exact: true })
  await openCabinet.waitFor()
  await openCabinet.click()
  await page.locator('[data-ch2-step="c2n5_a1"]').waitFor()
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).ap), 0)
  await context.close()
  for (const [id, asset] of [['c2n1_old_ct','ev_old_ct_retired'], ['c2n5_a5','ev_ch2_teaching_archive'], ['c2n5_a6','ev_ch2_team_1997']]) {
   const { context, page } = await open(id, {}, mobile)
   await reveal(page)
   await page.waitForFunction(asset => [...document.images].some(i => i.src.endsWith('/' + asset + '.png') && i.complete && i.naturalWidth > 0), asset)
   assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
   const box = await page.locator('.dialog-box').boundingBox()
   assert(box.y >= 0 && box.y + box.height <= page.viewportSize().height)
   await page.screenshot({ path: output + '/' + asset + (mobile ? '-mobile' : '-desktop') + '.png' })
   await context.close()
  }
  const morning = await open('c2am_0', {}, mobile)
  await reveal(morning.page)
  await morning.page.waitForFunction(() => [...document.images].some(i => i.src.endsWith('/bg_office_day.png') && i.complete && i.naturalWidth > 0))
  assert.match(await morning.page.locator('.dialog-box > p').innerText(), /信息科今天接手查日志，周五反馈/)
  assert(await morning.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  await morning.page.locator('.dialog-box > span.animate-bounce').waitFor()
  await morning.page.screenshot({ path: output + '/morning-handoff-' + (mobile ? 'mobile' : 'desktop') + '.png' })
  await morning.page.locator('.dialog-box > p').click()
  await morning.page.locator('[data-ch2-step="c2am_1"]').waitFor()
  await morning.context.close()
 }
 for (const [id, removed] of [['c2d2_q1a','住院加急'], ['c2d2_q1b','候诊大爷'], ['c2d2_q1c',null]]) {
  // Opposite/old flags must not survive a new queue decision or be replayed.
  const { context, page } = await open(id, { flags: { c2_queue_postop_done: true, c2_queue_routine_done: true } })
  await reveal(page)
  await page.locator('.dialog-box > span.animate-bounce').waitFor()
  await page.locator('.dialog-box > p').click()
  await page.locator('[data-ch2-step="c2d2_t0"]').waitFor()
  await page.reload()
  await page.locator('[data-ch2-step="c2d2_t0"]').waitFor()
  assert.equal(await page.getByText('腹痛小伙', { exact: false }).count(), 0)
  for (const name of ['住院加急', '候诊大爷']) assert.equal(await page.getByText(name + ' ·', { exact: false }).count(), name === removed ? 0 : 1)
  await page.screenshot({ path: output + '/queue-after-' + id + '.png' })
  await context.close()
 }
 for (const [id, patch] of [
  ['c2n3_x4',{flags:{mystery_told:true}}], ['c2n3_x4',{flags:{}}],
  ['c2n1_b5b',{badges:['fixer']}], ['c2n1_b5b',{badges:[]}],
  ['c2n3_a2',{flags:{wen_card:true}}], ['c2n1_b6',{flags:{kai_friend:true}}],
 ]) {
  const { context, page, shift } = await open(id, patch)
  await reveal(page)
  const expected = ch2StepForState(id, shift.steps[id], { flags:{}, badges:[], gender:'m', finished:true, ...patch }).text.replaceAll('**','')
  assert.equal(await page.locator('.dialog-box > p').innerText(), expected)
  await page.reload()
  await reveal(page)
  assert.equal(await page.locator('.dialog-box > p').innerText(), expected)
  await context.close()
 }
 assert.deepEqual(errors, [])
 console.log('PASS: 12 rendered acquisition/result transitions; zero-AP cabinet; three evidence assets, two ready backgrounds and morning handoff on desktop/mobile; six memories; three queue branches and real reload.')
} finally { await browser.close() }
