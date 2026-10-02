// One targeted patient workbench pass; no replay of unaffected chapters.
// Run from app/: node --import tsx tests/ldct-patient-iteration-browser.mjs
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { freshState } from '../src/game/store.ts'
import { selectLdctStory, getLdctProgress, ldctAction } from '../src/game/ldct-session.ts'
import { createLdctPhantomPreparationState, createLdctRecord } from '../src/game/ldct-experiments.ts'

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const key = 'midnight-radiology-save-v1'
const url = (process.env.GAME_URL || 'http://127.0.0.1:8798/') + '#/dlc/ldct'
const output = resolve('../../ldct-lung-polish-review')
mkdirSync(output, { recursive: true })
function fixture() {
  const state = selectLdctStory({ ...freshState('m'), gold: 800, skill: 9, heart: 7, wealth: 3,
    dlc: { ch2: { done: true }, dr: { done: true }, dsa: { dose: 57 } } }, 'father')
  const draft = { ...createLdctPhantomPreparationState(5), iterationRound: 12 }
  const record = createLdctRecord(draft, 5, 'different', 'phantom')
  assert(record, 'valid completed phantom fixture')
  const p = { ...getLdctProgress(state), nodeId: 'lf_iteration_intro_1', phase: 'story',
    labRound: 5, labDraft: draft, records: { 5: record } }
  state.dlc.ldct.ldct = p
  state.dlc.ldct.ldctStories.slots.father = p
  const next = ldctAction(state, { type: 'advance', nodeId: p.nodeId })
  assert.equal(getLdctProgress(next).nodeId, 'lf_patient_lab')
  assert.equal(getLdctProgress(next).labContext, 'patient')
  return next
}
const original = fixture()
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 650 }, hasTouch: true })
await context.addInitScript(({ key, state }) => {
  if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state))
  localStorage.setItem('mr-ldct-unlock', '1')
  sessionStorage.setItem('mr-rotate-dismissed', '1')
  HTMLMediaElement.prototype.play = () => Promise.resolve()
  HTMLMediaElement.prototype.pause = () => undefined
}, { key, state: original })
const page = await context.newPage(), errors = [], missing = []
page.on('pageerror', e => errors.push(e.message))
page.on('response', r => { if (r.status() >= 400) missing.push(r.url()) })
page.setDefaultTimeout(7000)
async function enter() {
  await page.locator('[data-chapter-enter], [data-ldct-screen]').first().waitFor({ timeout: 30000 })
  if (await page.locator('[data-chapter-enter]').isVisible()) await page.locator('[data-chapter-enter]').click()
  await page.getByTestId('ldct-chest-iterate').waitFor()
}
const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)
const progress = async () => getLdctProgress(await saved())
async function boxInView(locator) {
  const box = await locator.boundingBox(), size = page.viewportSize()
  assert(box && box.width >= 40 && box.height >= 36)
  assert(box.x >= 0 && box.y >= 0 && box.x + box.width <= size.width + 1 && box.y + box.height <= size.height + 1,
    `button fits without scrolling: ${JSON.stringify({ box, size })}`)
  assert(await locator.evaluate(el => {
    const b = el.getBoundingClientRect(), hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)
    return hit === el || el.contains(hit)
  }))
  return box
}
try {
  await page.goto(url); await enter()
  const action = page.getByTestId('ldct-iteration-next')
  const fixed = await boxInView(action)
  assert.equal((await progress()).labDraft.iterationRound, 0, 'patient starts at its own original FBP')
  await page.screenshot({ path: resolve(output, 'patient-390-start.png') })
  for (let count = 1; count <= 12; count++) {
    await page.touchscreen.tap(fixed.x + fixed.width / 2, fixed.y + fixed.height / 2)
    assert.equal((await progress()).labDraft.iterationRound, count)
    const box = await boxInView(action)
    assert(Math.abs(box.x - fixed.x) <= 1 && Math.abs(box.y - fixed.y) <= 1, 'rapid-click target never moves')
    if (count === 5) {
      await page.reload(); await enter()
      assert.equal((await progress()).labDraft.iterationRound, 5, 'refresh keeps the lung iteration, not phantom IR12')
    }
  }
  assert.equal((await progress()).nodeId, 'lf_patient_lab', 'last rapid click cannot leak into story')
  assert.deepEqual((await progress()).records[5], getLdctProgress(original).records[5])
  await boxInView(page.getByRole('button', { name: '继续', exact: true }))
  await page.screenshot({ path: resolve(output, 'patient-390-done.png') })
  await page.setViewportSize({ width: 844, height: 390 })
  await boxInView(action)
  await boxInView(page.getByRole('button', { name: '继续', exact: true }))
  await page.screenshot({ path: resolve(output, 'patient-844-done.png') })
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.getByRole('button', { name: '下一层', exact: true }).click()
  await page.getByText('固定、标记与更多轮次', { exact: true }).click()
  await page.getByRole('button', { name: '固定这一版', exact: true }).click()
  assert.equal((await progress()).labDraft.chest.pinned.slice, 2)
  await page.screenshot({ path: resolve(output, 'patient-desktop-done.png') })
  // Use the already prepared blobs: this action must remain functional offline.
  await context.setOffline(true)
  await page.getByRole('button', { name: '回看原FBP', exact: true }).click()
  assert.equal((await progress()).labDraft.chest.compareFbp, true)
  await page.getByRole('button', { name: '回到迭代图', exact: true }).click()
  // Keep both production guards (900ms from opening, 300ms since any click).
  // Automated reload + 7 taps can finish before a person's first 900ms.
  await page.waitForTimeout(950)
  await page.getByRole('button', { name: '继续', exact: true }).click()
  await page.locator('[data-ldct-node="lf_after_iteration_0"]').waitFor()
  const result = await saved(), p = getLdctProgress(result)
  assert.equal(p.patientIteration.record.iterationRound, 12)
  assert.equal(p.patientIteration.record.chest.pinned.slice, 2)
  assert.deepEqual(p.records[5], getLdctProgress(original).records[5])
  for (const stat of ['gold', 'skill', 'heart', 'wealth']) assert.equal(result[stat], original[stat], `${stat}: no extra learning reward`)
  for (const chapter of ['ch2', 'dr', 'dsa']) assert.deepEqual(result.dlc[chapter], original.dlc[chapter])
  assert.deepEqual(errors, []); assert.deepEqual(missing, [])
  console.log(`PASS patient IR: 12 fixed-position touches, refresh, 390/844/desktop, pin/slices, offline, separate record and no reward. Screenshots: ${output}`)
} catch (error) {
  const current = await saved().catch(() => null)
  if (current) {
    const p = getLdctProgress(current), record = createLdctRecord(p.labDraft, 5, 'different', 'chest')
    console.error(JSON.stringify({ node: p.nodeId, phase: p.phase, context: p.labContext, draft: p.labDraft, record,
      pureSubmitNode: record ? getLdctProgress(ldctAction(current, { type: 'lab:submit', record })).nodeId : null }))
  }
  await page.screenshot({ path: resolve(output, 'failure.png') }).catch(() => undefined)
  throw error
} finally { await context.close(); await browser.close() }
