// Targeted dinner image, paid-module close-up and day boundary. No full chapter replay.
// Run from app/: node --import tsx tests/ldct-dinner-transition-browser.mjs
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { freshState } from '../src/game/store.ts'
import { selectLdctStory, getLdctProgress } from '../src/game/ldct-session.ts'
import { createLdctPhantomPreparationState, createLdctRecord } from '../src/game/ldct-experiments.ts'

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const key = 'midnight-radiology-save-v1'
const url = (process.env.GAME_URL || 'http://127.0.0.1:8798/') + '#/dlc/ldct'
const output = resolve('../../ldct-dinner-transition-review')
mkdirSync(output, { recursive: true })
function fixture(nodeId) {
  const state = selectLdctStory({ ...freshState('m'), gold: 800, skill: 9, heart: 7, wealth: 3 }, 'father')
  const records = nodeId === 'lf_night1_end' ? { 5: createLdctRecord({ ...createLdctPhantomPreparationState(5), iterationRound: 12 }, 5, 'different', 'phantom') } : {}
  const progress = { ...getLdctProgress(state), nodeId, phase: nodeId === 'lf_night1_end' ? 'settle' : 'story', records }
  state.dlc.ldct.ldct = progress
  state.dlc.ldct.ldctStories.slots.father = progress
  return state
}
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1280, height: 850 }, hasTouch: true })
await context.addInitScript(() => {
  localStorage.setItem('mr-ldct-unlock', '1')
  sessionStorage.setItem('mr-rotate-dismissed', '1')
  HTMLMediaElement.prototype.play = () => Promise.resolve()
  HTMLMediaElement.prototype.pause = () => undefined
})
const page = await context.newPage(), errors = [], missing = []
page.on('pageerror', e => errors.push(e.message))
page.on('response', r => { if (r.status() >= 400) missing.push(r.url()) })
page.setDefaultTimeout(6000)
async function enter() {
  await page.locator('[data-chapter-enter], [data-ldct-screen]').first().waitFor({ timeout: 30000 })
  if (await page.locator('[data-chapter-enter]').isVisible()) await page.locator('[data-chapter-enter]').click()
  await page.locator('[data-ldct-screen]').waitFor()
}
async function load(nodeId) {
  await page.evaluate(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key, state: fixture(nodeId) })
  await page.reload(); await enter()
  await page.locator(`[data-ldct-node="${nodeId}"]`).waitFor()
}
const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)
try {
  await page.goto(url)
  await load('lf_table_explain_0')
  const cg = page.locator('[data-ldct-cinematic="table-explain"] img')
  assert(await cg.evaluate(el => el.complete && el.naturalWidth === 1672))
  await page.waitForFunction(() => document.querySelector('[data-ldct-dialogue]')?.textContent.includes('添了几支箭头。'))
  await page.screenshot({ path: resolve(output, 'dinner-desktop.png') })
  for (const [width, height] of [[390, 780], [844, 390]]) {
    await page.setViewportSize({ width, height })
    const box = await cg.boundingBox(), dialog = await page.locator('[data-ldct-dialogue]').boundingBox()
    assert(box && box.width > 100 && box.height > 65, 'new close-up remains visible')
    assert(box.x >= -1 && box.x + box.width <= width + 1 && box.y >= 0 && box.y + box.height <= height + 1)
    assert(dialog && box.y + box.height <= dialog.y + 6, 'paper and father are above the dialogue, not behind it')
    await page.screenshot({ path: resolve(output, `dinner-${width}.png`) })
  }
  await page.setViewportSize({ width: 390, height: 780 })
  await load('lf_trial_license_2')
  await page.locator('[data-ldct-module-locked]').waitFor()
  assert.match(await page.locator('[data-ldct-screen]').innerText(), /第一天 · 晚上/)
  await page.screenshot({ path: resolve(output, 'module-trial-390.png') })
  await load('lf_night1_end')
  assert.match(await page.locator('[data-ldct-settlement]').innerText(), /第一天结束/)
  await page.screenshot({ path: resolve(output, 'settlement-390.png') })
  await page.locator('[data-ldct-settlement]').getByRole('button', { name: /小卖部/ }).click()
  await page.locator('.ldct-shop-row').filter({ hasText: '零食礼包' }).getByRole('button', { name: '购买' }).click()
  assert.equal(getLdctProgress(await saved()).nodeId, 'lf_night1_end')
  assert.equal((await saved()).gold, 760)
  await page.reload(); await enter()
  assert.equal(getLdctProgress(await saved()).phase, 'settle')
  assert.equal((await saved()).gold, 760)
  await context.setOffline(true)
  await page.locator('[data-ldct-next-evening]').click()
  await page.locator('[data-ldct-node="lf_wait_consult"]').waitFor()
  assert.match(await page.locator('[data-ldct-screen]').innerText(), /第二天 · 上午/)
  assert.equal(getLdctProgress(await saved()).partStart.gold, 760)
  assert.equal(await page.locator('[data-ldct-next-evening]').count(), 0)
  assert.deepEqual(errors, []); assert.deepEqual(missing, [])
  console.log(`PASS dinner CG desktop/390/844, trial lock, settlement purchase/reload and offline explicit next day. Screenshots: ${output}`)
} catch (error) {
  await page.screenshot({ path: resolve(output, 'failure.png') }).catch(() => undefined)
  throw error
} finally { await context.close(); await browser.close() }
