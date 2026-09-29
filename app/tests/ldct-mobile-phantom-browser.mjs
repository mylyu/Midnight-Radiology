// Targeted mobile workbench regression. Never scroll an action into view to pass.
// Run from app/: node --import tsx tests/ldct-mobile-phantom-browser.mjs
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { freshState } from '../src/game/store.ts'
import { selectLdctStory, getLdctProgress } from '../src/game/ldct-session.ts'
import { createLdctLabState, createLdctPhantomPreparationState } from '../src/game/ldct-experiments.ts'

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const key = 'midnight-radiology-save-v1', url = (process.env.GAME_URL || 'http://127.0.0.1:8798/') + '#/dlc/ldct'
const output = resolve('../../ldct-mobile-phantom-review')
mkdirSync(output, { recursive: true })
function fixture(round) {
  const state = selectLdctStory({ ...freshState('m'), gold: 800, skill: 7, heart: 9, wealth: 2,
    dlc: { ch2: { done: true }, dr: { done: true }, dsa: { dose: 57 } } }, 'father')
  const p = { ...getLdctProgress(state), nodeId: `lf_lab_${round}`, phase: 'lab', labRound: round,
    labDraft: round === 4 || round === 5 ? createLdctPhantomPreparationState(round) : createLdctLabState(round) }
  state.dlc.ldct.ldct = p
  state.dlc.ldct.ldctStories.slots.father = p
  return state
}
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 650 }, hasTouch: true })
await context.addInitScript(({ key, state }) => {
  if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state))
  localStorage.setItem('mr-ldct-unlock', '1')
  sessionStorage.setItem('mr-rotate-dismissed', '1')
  HTMLMediaElement.prototype.play = () => Promise.resolve()
  HTMLMediaElement.prototype.pause = () => undefined
}, { key, state: fixture(2) })
const page = await context.newPage(), errors = [], missing = []
page.on('pageerror', e => errors.push(e.message))
page.on('response', r => { if (r.status() >= 400) missing.push(r.url()) })
page.setDefaultTimeout(7000)
async function enter() {
  await page.locator('[data-chapter-enter], [data-ldct-screen]').first().waitFor({ timeout: 30000 })
  if (await page.locator('[data-chapter-enter]').isVisible()) await page.locator('[data-chapter-enter]').click()
  await page.locator('[data-ldct-screen]').waitFor()
}
async function load(state) {
  await page.evaluate(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key, state })
  await page.reload(); await enter()
}
const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)
const progress = async () => getLdctProgress(await saved())
async function visibleBox(locator) {
  const box = await locator.boundingBox(), size = page.viewportSize()
  assert(box && box.width > 40 && box.height >= 36, 'main action remains a finger-sized target')
  assert(box.x >= 0 && box.y >= 0 && box.x + box.width <= size.width + 1 && box.y + box.height <= size.height + 1,
    `action must fit without scrolling: ${JSON.stringify({ box, size })}`)
  assert(await locator.evaluate(el => {
    const b = el.getBoundingClientRect(), hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)
    return hit === el || el.contains(hit)
  }), 'the visible action is not behind another panel')
  return box
}
async function tapAt(box) { await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2) }
try {
  await page.goto(url); await enter()
  for (const viewport of [{ width: 390, height: 650 }, { width: 360, height: 640 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport)
    for (const round of [2, 4, 5]) {
      await load(fixture(round))
      const action = page.locator('[data-ldct-fast-action]').filter({ visible: true })
      const initialBox = await visibleBox(action)
      if (round !== 4) {
        const start = page.getByTestId('ldct-speed-start')
        const b = await start.boundingBox()
        assert(b.y >= 0 && b.y + b.height <= viewport.height)
        await tapAt(b)
        await page.locator('[data-challenge-status="running"]').waitFor()
      }
      const count = round === 2 ? 22 : 12
      const fixed = await visibleBox(action)
      assert(Math.abs(fixed.y - initialBox.y) <= 1, 'starting contest must not move the tapping button')
      await page.screenshot({ path: resolve(output, `round-${round}-${viewport.width}-start.png`) })
      for (let tap = 1; tap <= count; tap++) {
        await tapAt(fixed)
        const box = await visibleBox(action)
        assert(Math.abs(box.y - fixed.y) <= 1 && Math.abs(box.x - fixed.x) <= 1, 'fixed target stays put through every frame and final reward')
      }
      const p = await progress()
      assert.equal(p.labDraft[round === 2 ? 'bpCount' : round === 4 ? 'exposureCount' : 'iterationRound'], round === 2 ? 160 : round === 4 ? 13 : 12)
      if (round !== 4) assert.equal(p.speedChallenges[round === 2 ? 'backproject' : 'iteration'].status, 'won')
      assert.equal(p.nodeId, `lf_lab_${round}`, 'final rapid click does not leak into Continue')
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
      const scroll = await page.locator('.ldct-lab-wrap').evaluate(el => el.scrollTop)
      assert.equal(scroll, 0, 'test never had to scroll the lab')
      await visibleBox(page.getByRole('button', { name: '继续', exact: true }))
      await page.screenshot({ path: resolve(output, `round-${round}-${viewport.width}-done.png`) })
    }
  }
  // Refresh keeps the same new phantom data and actually reached iteration.
  const before = await progress()
  await page.reload(); await enter()
  assert.deepEqual((await progress()).labDraft, before.labDraft)
  await visibleBox(page.locator('[data-ldct-fast-action]').filter({ visible: true }))
  await page.locator('[data-ldct-compact-details]').click()
  await page.locator('[data-details-open="true"]').waitFor()
  await page.locator('[data-ldct-compact-details]').click()
  await visibleBox(page.locator('[data-ldct-fast-action]').filter({ visible: true }))
  // Prepared resources keep the tool functional without a network.
  await context.setOffline(true)
  await page.getByTestId('ldct-speed-start').click()
  await tapAt(await visibleBox(page.locator('[data-ldct-fast-action]').filter({ visible: true })))
  assert.equal((await progress()).labDraft.iterationRound, 1)
  assert.deepEqual(errors, [])
  assert.deepEqual(missing, [])
  console.log(`PASS mobile fixed controls: 390x650, 360x640, 844x390; BP/exposure/IR; refresh, details, offline. Screenshots ${output}. No audio listening claim.`)
} catch (error) {
  await page.screenshot({ path: resolve(output, 'failure.png') }).catch(() => undefined)
  throw error
} finally { await context.close(); await browser.close() }
