// R2: only changed guidance/response/sound/staging. No repeated full chapter walk.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { freshState } from '../src/game/store.ts'
import { initializeLdct, getLdctProgress } from '../src/game/ldct-session.ts'
import { createLdctLabState, LDCT_FILTER_OPTIONS, LDCT_FILTER_LABELS } from '../src/game/ldct-experiments.ts'
import { LDCT_FILTER_COLORS, LDCT_FILTER_NAMES } from '../src/game/ldct-filter-response.ts'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const output = resolve('../../ldct-guided-review')
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1280, height: 960 }, hasTouch: true })
const page = await context.newPage(), errors = []
page.on('pageerror', error => errors.push(error.message))
const key = 'midnight-radiology-save-v1', url = process.env.GAME_URL || 'http://127.0.0.1:8798/'
const seed = initializeLdct(freshState('m'))
const fixture = (nodeId, round) => ({ ...seed, dlc: { ...seed.dlc, ldct: { ...seed.dlc.ldct, ldct: {
  ...getLdctProgress(seed), nodeId, phase: round ? 'lab' : 'story', labRound: round || 1,
  labDraft: createLdctLabState(round || 1),
} } } })
await context.addInitScript(({ key, first }) => {
  if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(first))
  localStorage.setItem('mr-ldct-unlock', '1')
  sessionStorage.setItem('mr-rotate-dismissed', '1')
  window.__plays = []
  // Playback-call verification only. Denied autoplay must not lock dialogue.
  HTMLMediaElement.prototype.play = function () { window.__plays.push(this.src); return Promise.reject(new Error('test: playback denied')) }
}, { key, first: fixture('lab_first', 1) })
const admit = async () => {
  await page.locator('[data-chapter-enter]').click({ timeout: 45000 })
  await page.locator('[data-ldct-screen]').waitFor()
}
const enter = async () => { await page.goto(url + '#/dlc/ldct'); await admit() }
const load = async state => { await page.evaluate(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key, state }); await page.reload(); await admit() }
const plays = () => page.evaluate(() => window.__plays.length)
const progress = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)).dlc.ldct.ldct, key)
const inViewport = async locator => {
  const box = await locator.boundingBox(), viewport = page.viewportSize()
  assert(box && box.x >= -1 && box.x + box.width <= viewport.width + 1, 'horizontal content fits viewport')
}
try {
  await enter()
  assert.equal(await page.getByTestId('ldct-action-guide').getAttribute('data-guide-step'), '0')
  assert.match(await page.getByTestId('ldct-action-guide').innerText(), /先点.*1/)
  assert.equal(await page.getByTestId('ldct-action-guide').getAttribute('open'), null, 'guidance begins as one action line')
  await page.getByTestId('ldct-action-guide').locator('summary').click()
  await page.getByTestId('ldct-action-guide').locator('p').waitFor({ state: 'visible' })
  await page.getByTestId('ldct-action-guide').locator('summary').click()
  let count = await plays()
  await page.getByRole('button', { name: '追踪左上的圆块', exact: true }).click()
  assert.equal(await plays(), count + 1)
  assert.equal(await page.getByTestId('ldct-action-guide').getAttribute('data-guide-step'), '1')
  await page.getByRole('button', { name: '90°', exact: true }).click()
  assert.equal(await page.locator('.ldct-scanner').getAttribute('data-angle'), '90')
  assert.equal(Number(await page.locator('.ldct-scanner').getAttribute('data-detector-position')), 62.5)
  assert.equal((await progress()).labDraft.angle, 90)
  assert.equal(await page.getByTestId('ldct-action-guide').getAttribute('data-guide-step'), '2')
  count = await plays()
  await page.getByRole('slider', { name: '绕着看', exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  assert.equal(await plays(), count, 'continuous angle input is silent')
  await page.getByRole('button', { name: '追踪左下的小细棒', exact: true }).click()
  assert.equal(await page.getByTestId('ldct-action-guide').getAttribute('data-guide-step'), '3')
  await page.screenshot({ path: resolve(output, 'trace-desktop.png') })
  await page.setViewportSize({ width: 390, height: 844 })
  await inViewport(page.locator('.ldct-scanner'))
  await inViewport(page.locator('.ldct-lab'))
  await page.locator('.ldct-lab__header').scrollIntoViewIfNeeded()
  await page.screenshot({ path: resolve(output, 'trace-mobile.png') })
  console.log('Trace: guidance, rotating detector correspondence, discrete/silent input and 390px fit passed.')

  await load(fixture('lab_filter', 3))
  const mobileFilter = page.getByRole('combobox', { name: '选择反投影滤波器', exact: true })
  assert.equal(await mobileFilter.isVisible(), true, 'mobile uses one native filter selector')
  assert.equal(await page.getByRole('button', { name: LDCT_FILTER_LABELS.ramp, exact: true }).isVisible(), false, 'six-button matrix is not duplicated on mobile')
  assert.equal(await page.locator('[data-filter-response]').getAttribute('open'), null, 'frequency plot is collapsed on entry')
  await page.locator('[data-filter-response] > summary').tap()
  for (const filter of LDCT_FILTER_OPTIONS) {
    await mobileFilter.selectOption(filter)
    assert.equal(await mobileFilter.inputValue(), filter)
    assert.equal(await page.locator('[data-filter-response]').getAttribute('data-filter-response'), filter)
    assert.equal(await page.locator(`[data-frame="filter:sparse:${filter}"]`).count(), filter === 'ramp' ? 2 : 1)
    assert.equal(await page.locator('[data-frame="filter:sparse:ramp"]').count(), filter === 'ramp' ? 2 : 1, 'left side stays on the same sparse-data Ramp reference')
    const response = page.locator('[data-filter-response] svg')
    assert((await response.getAttribute('aria-label')).includes(LDCT_FILTER_NAMES[filter]), 'curve names the selected reconstruction')
    assert.equal(await response.locator('path[stroke]').count(), 1, 'only the current response is drawn by default')
    assert.equal(await response.locator('path[stroke]').getAttribute('stroke'), LDCT_FILTER_COLORS[filter])
    assert.equal((await progress()).labDraft.filter, filter)
    assert.doesNotMatch(await page.locator('.ldct-lab').innerText(), /\bNone\b/, 'player labels use 不滤波, not a programming value')
  }
  await page.getByRole('button', { name: '叠加其他曲线对照', exact: true }).tap()
  assert.equal(await page.locator('[data-filter-response] svg path[stroke]').count(), LDCT_FILTER_OPTIONS.length, 'all responses remain available on request')
  await page.getByRole('button', { name: '只看当前曲线', exact: true }).tap()
  await mobileFilter.selectOption('none')
  await page.locator('[data-filter-response]').scrollIntoViewIfNeeded()
  await inViewport(page.locator('[data-filter-response]'))
  await page.screenshot({ path: resolve(output, 'unfiltered-mobile.png') })
  await page.reload()
  await page.locator('[data-chapter-enter]').click({ timeout: 45000 })
  assert.equal(await page.locator('[data-filter-response]').getAttribute('data-filter-response'), 'none', 'new filter survives refresh')
  assert.equal(await mobileFilter.inputValue(), 'none')
  assert.equal(await page.locator('[data-filter-response]').getAttribute('open'), null, 'refresh does not force advanced details open')
  await context.route('**/*', route => /\/(assets|audio)\//.test(new URL(route.request().url()).pathname) ? route.abort() : route.continue())
  await mobileFilter.selectOption('hamming')
  assert.equal(await page.locator('[data-filter-response]').getAttribute('data-filter-response'), 'hamming')
  assert.match(await page.locator('[data-frame="filter:sparse:hamming"]').evaluate(el => getComputedStyle(el).backgroundImage), /blob:/, 'new atlas uses prepared blob offline')
  await context.unroute('**/*')
  await page.setViewportSize({ width: 1280, height: 960 })
  assert.equal(await mobileFilter.isVisible(), false, 'desktop keeps the direct filter buttons')
  await page.getByRole('button', { name: LDCT_FILTER_LABELS.none, exact: true }).click()
  const selectedColor = await page.getByRole('button', { name: LDCT_FILTER_LABELS.none, exact: true }).evaluate(el => getComputedStyle(el).backgroundColor)
  const inactiveColor = await page.getByRole('button', { name: LDCT_FILTER_LABELS.ramp, exact: true }).evaluate(el => getComputedStyle(el).backgroundColor)
  assert.notEqual(selectedColor, inactiveColor, 'only the selected desktop filter is highlighted')
  await page.locator('[data-filter-response] > summary').click()
  await page.locator('.ldct-lab__header').scrollIntoViewIfNeeded()
  await page.screenshot({ path: resolve(output, 'filter-desktop.png') })
  await page.setViewportSize({ width: 844, height: 390 })
  assert.equal(await mobileFilter.isVisible(), true, 'short landscape also avoids the six-button matrix')
  await page.locator('[data-filter-response]').scrollIntoViewIfNeeded()
  await inViewport(page.locator('[data-filter-response]'))
  await page.screenshot({ path: resolve(output, 'filter-landscape.png') })
  console.log('Filters: all six matching tiles/curves, refresh, prepared blob offline and mobile layouts passed.')

  await page.setViewportSize({ width: 1280, height: 960 })
  await load(fixture('lab_intro_0'))
  // Whole stage still reveals; revealing text is silent; accepted advance plays once.
  await page.mouse.click(70, 270)
  assert.equal(await plays(), 0, 'reveal text is silent')
  await page.waitForTimeout(330)
  await page.mouse.click(70, 270)
  await page.locator('[data-ldct-node="lab_intro_1"]').waitFor()
  assert.equal(await plays(), 1, 'accepted advance plays existing click even if browser rejects playback')
  await page.mouse.click(70, 270)
  assert.equal(await plays(), 1, 'rejected fast repeat does not beep')
  await load(fixture('cooperate_q'))
  await page.mouse.click(70, 270)
  const choice = page.locator('[data-ldct-choice="small"]')
  await choice.waitFor()
  await page.waitForTimeout(330)
  await choice.click()
  await page.locator('[data-ldct-node="cooperate_small_0"]').waitFor()
  assert.equal(await plays(), 1, 'accepted option plays one sound')
  await load(fixture('nextday_lei_0'))
  assert.equal(await page.locator('[data-ldct-portrait]').count(), 0, 'message is not an in-person visit')
  await load(fixture('filter_intro_0'))
  assert.match(await page.locator('[data-ldct-portrait]').getAttribute('src'), /^blob:/)
  await page.mouse.click(70, 270)
  await page.screenshot({ path: resolve(output, 'review-dialogue.png') })
  assert.deepEqual(errors, [])
  console.log('Dialogue: whole-stage input, accepted-only click calls, audio rejection and offscreen/in-person staging passed. No full walkthrough repeated.')
} finally { await browser.close() }
