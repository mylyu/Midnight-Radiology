// One cached, disposable production-browser context. No full-chapter walk/build.
// Run from app/: node --import tsx tests/ldct-caught-browser.mjs
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { freshState } from '../src/game/store.ts'
import { selectLdctStory, getLdctProgress, ldctAction } from '../src/game/ldct-session.ts'
import { createLdctLabState } from '../src/game/ldct-experiments.ts'
import { LDCT_SPEED_CHALLENGES } from '../src/game/ldct-speed-challenge.ts'

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const key = 'midnight-radiology-save-v1', url = (process.env.GAME_URL || 'http://127.0.0.1:8798/') + '#/dlc/ldct'
const output = resolve('../../ldct-caught-review')
mkdirSync(output, { recursive: true })
function fixture(nodeId, round, gold = 800) {
  const state = selectLdctStory({ ...freshState('m'), gold, skill: 7, heart: 9, wealth: 2,
    flags: { keep_main: true }, dlc: { ch2: { done: true }, dr: { done: true }, dsa: { dose: 57 } } }, 'father')
  // Historical patient-IR fixture, not the new first-evening phantom route.
  const p = { ...getLdctProgress(state), phantomPreparation: undefined, nodeId, phase: round ? 'lab' : 'story',
    ...(round ? { labRound: round, labDraft: createLdctLabState(round, round === 5 ? 'chest' : 'phantom') } : {}) }
  state.dlc.ldct.ldct = p
  state.dlc.ldct.ldctStories.slots.father = p
  return state
}
const protectedState = state => ({ gold: state.gold, skill: state.skill, heart: state.heart, wealth: state.wealth,
  flags: state.flags, ch2: state.dlc.ch2, dr: state.dlc.dr, dsa: state.dlc.dsa })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, hasTouch: true })
await context.addInitScript(({ key, state }) => {
  if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state))
  localStorage.setItem('mr-ldct-unlock', '1')
  sessionStorage.setItem('mr-rotate-dismissed', '1')
  HTMLMediaElement.prototype.play = () => Promise.resolve()
  HTMLMediaElement.prototype.pause = () => undefined
}, { key, state: fixture('lf_caught_choice') })
const page = await context.newPage(), errors = [], missing = []
page.setDefaultTimeout(8000)
page.on('pageerror', error => errors.push(error.message))
page.on('response', response => { if (response.status() >= 400) missing.push(response.url()) })
const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)
const progress = async () => getLdctProgress(await saved())
async function admit() {
  await page.locator('[data-chapter-enter], [data-ldct-screen]').first().waitFor({ timeout: 30000 })
  if (await page.locator('[data-chapter-enter]').isVisible()) await page.locator('[data-chapter-enter]').click()
  await page.locator('[data-ldct-screen]').waitFor()
}
async function reload() { await page.reload(); await admit() }
async function load(state) {
  await page.evaluate(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key, state })
  await reload()
}
async function readyChoice() {
  await page.locator('[data-ldct-dialogue][data-choice-ready="true"]').waitFor()
  await page.waitForTimeout(335)
}
async function layout(name, locator) {
  for (const viewport of [{ width: 1366, height: 900 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport)
    await locator.scrollIntoViewIfNeeded()
    const box = await locator.boundingBox()
    assert(box && box.width > 30 && box.height > 25)
    assert(box.x >= -1 && box.x + box.width <= viewport.width + 1)
    assert(box.y >= -1 && box.y + box.height <= viewport.height + 1)
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${name}: no horizontal overflow`)
    await page.screenshot({ path: resolve(output, `${name}-${viewport.width}.png`) })
  }
  await page.setViewportSize({ width: 1366, height: 900 })
}
async function status(kind, expected) {
  await page.locator(`[data-challenge-kind="${kind}"][data-challenge-status="${expected}"]`).waitFor()
  assert.equal((await progress()).speedChallenges[kind].status, expected)
}
async function continueLab(target) {
  await page.waitForTimeout(950)
  await page.getByRole('button', { name: '继续', exact: true }).click()
  await page.locator(`[data-ldct-node="${target}"]`).waitFor()
}

try {
  await page.goto(url); await admit()
  // Both displayed branches use normal shared dialogue choices and atomic saves.
  await readyChoice()
  const pay = page.locator('[data-ldct-choice="pay"]')
  const caught = page.locator('[data-ldct-cinematic="director-caught"]')
  await caught.locator('img').evaluate(image => image.decode())
  assert.match(await caught.locator('img').getAttribute('src'), /^blob:/)
  await layout('director-choice', pay)
  await readyChoice(); await pay.dblclick({ delay: 30 })
  await page.locator('[data-ldct-node="lf_fine_0"]').waitFor()
  assert.equal((await saved()).gold, 600)
  assert.equal((await progress()).receipts.filter(value => value === 'ending:fine').length, 1)
  await reload()
  assert.equal((await saved()).gold, 600)
  assert.equal((await progress()).nodeId, 'lf_fine_0')
  console.log('PASS pay once / refresh / mobile choice')

  await load(fixture('lf_caught_choice', undefined, 199)); await readyChoice()
  assert.equal(await page.locator('[data-ldct-choice="pay"]').isEnabled(), false)
  await page.locator('[data-ldct-choice="clever"]').click()
  await page.locator('[data-ldct-node="lf_pitch_0"]').waitFor()
  assert.equal((await saved()).gold, 199)
  assert.equal((await progress()).decisions.director_route, 'clever')
  console.log('PASS no money / clever route')

  await load(fixture('lf_director_review_0'))
  const review = page.locator('[data-ldct-cinematic="director-review"]')
  await review.locator('img').evaluate(image => image.decode())
  assert.match(await review.locator('img').getAttribute('src'), /^blob:/)
  await layout('director-review', review)

  for (const [kind, round] of [['backproject', 2], ['iteration', 5]]) {
    const initial = fixture(`lf_lab_${round}`, round), config = LDCT_SPEED_CHALLENGES[kind]
    await load(initial)
    const step = page.getByTestId(round === 2 ? 'ldct-bp-next' : 'ldct-iteration-next')
    await layout(`${kind}-controls`, step)
    await page.getByTestId('ldct-speed-start').click()
    await status(kind, 'running')
    const began = (await progress()).speedChallenges[kind]
    await page.waitForTimeout(350)
    assert.equal((await progress()).speedChallenges[kind].acceptedTaps, 0, 'timer never advances reconstruction')
    await step.click()
    const first = (await progress()).speedChallenges[kind]
    assert.equal(first.acceptedTaps, 1)
    let nextTap = 2
    if (kind === 'backproject') {
      await step.focus()
      for (const key of ['Enter', 'Space']) {
        await page.keyboard.down(key); await page.keyboard.down(key); await page.keyboard.up(key)
        assert.equal((await progress()).speedChallenges[kind].acceptedTaps, nextTap, 'held-key repeat does not add another reconstruction step')
        nextTap++
      }
    }
    if (kind === 'iteration') {
      await reload()
      const restored = (await progress()).speedChallenges[kind]
      assert.equal(restored.deadline, began.deadline, 'reload cannot grant a fresh clock')
      assert.equal(restored.acceptedTaps, 1)
    }
    for (let tap = nextTap; tap <= config.taps; tap++) await step.click()
    await status(kind, 'won')
    assert.equal((await progress()).labDraft[round === 2 ? 'bpCount' : 'iterationRound'], config.target)
    assert.equal((await saved()).badges.filter(id => id === config.badge).length, 1)
    assert.deepEqual(protectedState(await saved()), protectedState(initial), 'the contest itself only awards its badge')
    await continueLab(round === 2 ? 'lf_after_bp_0' : 'lf_after_iteration_0')
    assert.equal((await saved()).skill, initial.skill + 1)
    console.log(`PASS ${kind} ordered taps / success / ${kind === 'iteration' ? 'refresh / ' : ''}ordinary continuation`)
  }

  // A real timer observes an already elapsed persisted deadline after reload.
  let expired = fixture('lf_lab_5', 5)
  expired = ldctAction(expired, { type: 'challenge:start', nodeId: 'lf_lab_5', now: Date.now() - 11000 })
  await load(expired); await status('iteration', 'expired')
  assert.equal((await progress()).labDraft.iterationRound, 0)
  assert(!(await saved()).badges.includes(LDCT_SPEED_CHALLENGES.iteration.badge))
  await page.getByTestId('ldct-speed-practice').click()
  await status('iteration', 'practice')
  await continueLab('lf_after_iteration_0')
  assert.equal((await progress()).records[5].practice, true)
  assert.equal((await progress()).records[5].helped, false)
  console.log('PASS timeout / no automatic image / practice continuation')

  await load(fixture('lf_lab_2', 2))
  await page.getByTestId('ldct-speed-start').click()
  await page.getByTestId('ldct-bp-next').click()
  const beforeHidden = (await progress()).labDraft.bpCount
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    document.dispatchEvent(new Event('visibilitychange'))
    delete document.hidden
  })
  await status('backproject', 'stopped')
  assert.equal((await progress()).labDraft.bpCount, beforeHidden)
  await page.getByTestId('ldct-speed-start').click()
  await page.getByRole('button', { name: /回大厅/ }).click()
  await page.locator('[data-ldct-screen]').waitFor({ state: 'detached' })
  assert.equal((await progress()).speedChallenges.backproject.status, 'stopped', 'actual exit button stops before its component unmounts')
  console.log('PASS hidden-document event / actual exit stops contest')
  assert.deepEqual(errors, [])
  assert.deepEqual(missing, [])
  console.log(`LDCT caught browser passed; targeted screenshots: ${output}; audio playback mocked`)
} catch (error) {
  await page.screenshot({ path: resolve(output, 'failure.png') }).catch(() => undefined)
  throw error
} finally { await context.close(); await browser.close() }
