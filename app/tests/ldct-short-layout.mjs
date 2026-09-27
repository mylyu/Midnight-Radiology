// Targeted mobile layout only; the three-story main flow is tested separately.
// Uses an isolated browser context, never the player's profile or save.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { freshState } from '../src/game/store.ts'
import { initializeLdct, selectLdctStory, getLdctProgress } from '../src/game/ldct-session.ts'
import { createLdctLabState } from '../src/game/ldct-experiments.ts'
import { detectorPosition } from '../src/game/ldct-projections.ts'

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE
  || 'C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const url = process.env.GAME_URL || 'http://127.0.0.1:8798/'
const output = resolve('../../ldct-short-review')
await mkdir(output, { recursive: true })
const key = 'midnight-radiology-save-v1'
const initial = initializeLdct(freshState('m'))
function fixture(nodeId, round, draft = {}) {
  const state = selectLdctStory(initial, 'face')
  const p = { ...getLdctProgress(state), nodeId, phase: round ? 'lab' : 'story', labRound: round || 1,
    labDraft: { ...createLdctLabState(round || 1), ...draft } }
  return { ...state, dlc: { ...state.dlc, ldct: { ...state.dlc.ldct, ldct: p,
    ldctStories: { ...state.dlc.ldct.ldctStories, slots: { ...state.dlc.ldct.ldctStories.slots, face: p } } } } }
}
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })
const page = await context.newPage(), errors = [], failed = []
page.setDefaultTimeout(10000)
page.on('pageerror', error => errors.push(error.message))
page.on('response', response => { if (response.status() >= 400) failed.push(response.url()) })
await context.addInitScript(({ key, initial }) => {
  if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(initial))
  localStorage.setItem('mr-ldct-unlock', '1')
  sessionStorage.setItem('mr-rotate-dismissed', '1')
}, { key, initial })
async function admit() {
  await page.locator('[data-chapter-enter]').click({ timeout: 60000 })
  await page.locator('[data-ldct-screen], [data-ldct-selector]').waitFor()
}
async function load(state) {
  await page.evaluate(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key, state })
  await page.reload(); await admit()
}
async function fits(selector) {
  const result = await page.locator(selector).evaluate(element => {
    const b = element.getBoundingClientRect()
    return { left: b.left, right: b.right, width: innerWidth }
  })
  assert(result.left >= -1 && result.right <= result.width + 1, `${selector} fits horizontally: ${JSON.stringify(result)}`)
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'no horizontal page overflow')
}
async function unobscured(locator) {
  await locator.scrollIntoViewIfNeeded()
  const result = await locator.evaluate(element => {
    const box = element.getBoundingClientRect()
    const y = box.top + box.height / 2, x = box.left + box.width / 2
    const hit = document.elementFromPoint(x, y)
    return { visible: box.top >= 0 && box.bottom <= innerHeight, hit: hit === element || element.contains(hit),
      top: box.top, bottom: box.bottom, obstruction: hit?.tagName + '.' + hit?.className }
  })
  assert(result.visible && result.hit, `control is reachable, not covered by header: ${JSON.stringify(result)}`)
}
async function labLayout() {
  await fits('.ldct-lab')
  const dimensions = await page.evaluate(() => {
    const header = document.querySelector('[data-ldct-screen] > .top-0').getBoundingClientRect()
    const wrap = document.querySelector('.ldct-lab-wrap').getBoundingClientRect()
    return { headerBottom: header.bottom, labTop: wrap.top, scrollable: wrap.height > 100 }
  })
  assert(dimensions.labTop >= dimensions.headerBottom - 1 && dimensions.scrollable, `header leaves usable lab area: ${JSON.stringify(dimensions)}`)
  await unobscured(page.getByRole('button', { name: '还没看明白，一起聊聊', exact: true }))
}
async function shot(name) {
  await page.locator('.ldct-lab-wrap').evaluate(el => { el.scrollTop = 0 })
  await page.screenshot({ path: resolve(output, name + '.png') })
}
try {
  await page.goto(url + '#/dlc/ldct'); await admit()
  for (const [orientation, viewport] of [['portrait', { width: 390, height: 844 }], ['landscape', { width: 844, height: 390 }]]) {
    await page.setViewportSize(viewport)
    await load(initial)
    await fits('.ldct-settlement')
    await unobscured(page.locator('[data-ldct-story="patient"]'))
    await page.locator('.ldct-settlement').evaluate(el => { el.scrollTop = 0 })
    await page.screenshot({ path: resolve(output, `selector-${orientation}.png`) })

    await load(fixture('sf_arrive_0'))
    await fits('[data-ldct-dialogue]')
    await page.locator('[data-ldct-portrait]').waitFor()
    // Shared whole-stage reveal, no dialogue-specific restyling or forced button.
    const scene = await page.locator('[data-ldct-screen]').boundingBox()
    await page.locator('[data-ldct-screen]').click({ position: { x: scene.width - 15, y: Math.min(180, scene.height / 2) } })
    await page.screenshot({ path: resolve(output, `dialogue-${orientation}.png`) })

    await page.getByRole('button', { name: '📖 手册', exact: true }).click()
    await fits('.ldct-modal')
    await unobscured(page.getByRole('button', { name: '关闭 ×', exact: true }))
    await page.locator('.ldct-modal-content').evaluate(el => { el.scrollTop = el.scrollHeight })
    await page.screenshot({ path: resolve(output, `manual-${orientation}.png`) })
    await page.getByRole('button', { name: '关闭 ×', exact: true }).click()
    assert.equal(await page.getByRole('dialog').count(), 0, 'manual can be closed after scrolling')
    if (process.env.LDCT_MODAL_ONLY === '1') continue

    await load(fixture('sf_lab_1', 1))
    await page.getByRole('button', { name: '追踪左上的亮点', exact: true }).click()
    await page.getByRole('button', { name: '90°', exact: true }).click()
    assert.equal(await page.locator('.ldct-scanner').getAttribute('data-angle'), '90')
    assert.equal(Number(await page.locator('.ldct-scanner').getAttribute('data-detector-position')), detectorPosition('bead', 90, 'face'))
    assert.equal(await page.locator('[data-frame="truth"][data-dataset="face"]').count(), 1)
    await labLayout(); await shot(`trace-${orientation}`)

    await load(fixture('sf_lab_3', 3))
    assert.equal(await page.locator('[data-filter-response]').getAttribute('open'), null, 'response curve begins collapsed')
    await page.getByRole('button', { name: '不滤波', exact: true }).click()
    assert.equal(await page.locator('.ldct-lab__pair [data-frame="fbp:high:none"]').count(), 1)
    assert.equal(await page.locator('.ldct-lab__pair [data-frame="truth"]').count(), 1)
    assert.match(await page.locator('.ldct-lab__status').innerText(), /固定显示窗/)
    assert.doesNotMatch(await page.locator('.ldct-lab').innerText(), /单独归一化/)
    await labLayout(); await shot(`unfiltered-${orientation}`)
    await page.getByRole('button', { name: '柔一些', exact: true }).click()
    assert.equal(await page.locator('.ldct-lab__pair [data-frame="fbp:high:hann"]').count(), 1)
    assert.doesNotMatch(await page.locator('.ldct-lab').innerText(), /\bNone\b|稀疏/)
    await shot(`hann-${orientation}`)
    await page.getByText('更多滤波器与拖动对照', { exact: true }).click()
    await page.getByRole('combobox', { name: '选择反投影滤波器', exact: true }).selectOption('hamming')
    await fits('.ldct-lab__filter-select')
    await unobscured(page.getByRole('slider', { name: '拖开比较', exact: true }))

    await load(fixture('sf_lab_5', 5))
    assert.equal(await page.locator('[data-frame="iteration:0"]').count(), 1)
    await labLayout(); await shot(`iteration-zero-${orientation}`)
    await page.getByRole('button', { name: '算投影、比差别、改第一轮 →', exact: true }).click()
    await page.getByRole('button', { name: '再改到第2轮 →', exact: true }).click()
    assert.equal(await page.locator('[data-frame="iteration:2"]').count(), 1)
    await labLayout(); await shot(`iteration-two-${orientation}`)
    await page.getByText('它到底在比较什么？', { exact: true }).click()
    assert.equal(await page.getByTestId('ldct-residual-scale').count(), 0, 'enhancement caption belongs only to residual display')
    await page.getByRole('button', { name: '看看差别图', exact: true }).click()
    for (const [label, count] of [['初始', 0], ['2轮', 2]]) {
      await page.getByRole('button', { name: label, exact: true }).click()
      assert.equal(await page.locator(`[data-frame="residual:${count}"]`).count(), 1)
      assert.equal(await page.getByTestId('ldct-residual-scale').innerText(), '差异增强显示（各轮同一尺度）')
    }
    await page.locator('.ldct-lab__single').scrollIntoViewIfNeeded()
    await page.screenshot({ path: resolve(output, `residual-two-${orientation}.png`) })
  }
  assert.deepEqual(errors, [], 'no page errors')
  assert.deepEqual(failed, [], 'no failed resources')
  console.log(process.env.LDCT_MODAL_ONLY === '1'
    ? 'PASS: 390 portrait and 844 landscape; selector/dialogue and scrollable, closeable manual overlay. No full walkthrough repeated.'
    : 'PASS: 390 portrait and 844 landscape; selector, shared dialogue, manual, gantry/sinogram, full-object filter variants and iteration0/2. Controls reachable; no horizontal overflow. No full walkthrough repeated.')
} finally { await browser.close() }
