// Only the changed openings and their presentation/audio seams; no full chapters.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync, statSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { TRILOGY } from '../src/game/trilogy-registry.ts'
import { freshState } from '../src/game/store.ts'
import { initializeTrilogy, patchTrilogy, enterTrilogyNode } from '../src/game/trilogy-session.ts'
import { awaitChapterEntry } from './chapter-entry-driver.mjs'

assert.equal(process.env.TRILOGY_BUILD_READY, '1', 'Build once before running')
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, channel: 'msedge' })
const output = resolve('../../trilogy-openings-review-20261011')
mkdirSync(output, { recursive: true })
const key = 'midnight-radiology-save-v1', report = []
const clickBytes = statSync('public/audio/click.mp3').size
const screenshots = new Set(['c3_intro_call_1', 'c3_intro_visit_2', 'c4_pro_3', 'c4_1_open_0', 'c4_training_ready_1'])
async function open(id, target, size = { width: 390, height: 780 }, muted = false) {
  const chapter = TRILOGY[id]
  let initial = initializeTrilogy({ ...freshState('f'), gold: 1200, items: ['snack'] }, chapter)
  if (target) {
    initial = patchTrilogy(initial, id, { applied: ['checkin:0'] })
    initial = enterTrilogyNode(initial, chapter, target)
  }
  const context = await browser.newContext({ viewport: size, isMobile: size.width < 900, hasTouch: true })
  await context.addInitScript(({ key, initial, muted }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(initial))
    localStorage.setItem('mr-trilogy-muted', muted ? '1' : '0')
    sessionStorage.setItem('mr-rotate-dismissed', '1')
    window.__audio = []; window.__blobSizes = {}
    const url = URL.createObjectURL.bind(URL)
    URL.createObjectURL = blob => { const value = url(blob); window.__blobSizes[value] = blob.size; return value }
    const play = HTMLMediaElement.prototype.play
    HTMLMediaElement.prototype.play = function () {
      const row = { node: document.querySelector('[data-trilogy-node]')?.dataset.trilogyNode,
        bytes: window.__blobSizes[this.src], status: 'pending' }
      window.__audio.push(row)
      const result = play.call(this)
      result.then(() => { row.status = 'playing' }, error => { row.status = error.name })
      return result
    }
  }, { key, initial, muted })
  const page = await context.newPage(), errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`http://127.0.0.1:8798/?v=trilogy-openings#/${id}`)
  await page.locator('[data-chapter-loader], [data-trilogy]').first().waitFor({ timeout: 60000 })
  if (await page.locator('[data-chapter-loader]').count()) await awaitChapterEntry(page)
  await page.locator(`[data-trilogy="${id}"]`).waitFor()
  await context.setOffline(true)
  const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)
  const clicks = () => page.evaluate(bytes => window.__audio.filter(row => row.bytes === bytes), clickBytes)
  return { context, page, errors, saved, clicks, initial, chapter }
}
async function screenshot(page, node) {
  const cg = page.locator('.ldct-cinematic__image')
  if (await cg.count()) {
    await cg.evaluate(image => image.decode())
    const first = await cg.evaluate(e => getComputedStyle(e).transform)
    await page.waitForTimeout(100)
    const second = await cg.evaluate(e => getComputedStyle(e).transform)
    assert.notEqual(first, second, 'The closeup camera actually moves')
    assert.equal(await page.locator('.sprite-l,.sprite-r').count(), 0, 'No duplicate portrait on closeup')
    const fit = await page.locator('.ldct-cinematic__frame').boundingBox()
    assert(fit && fit.height > 70 && fit.y >= 0 && fit.y + fit.height <= page.viewportSize().height)
  }
  await page.screenshot({ path: resolve(output, `${node}-${page.viewportSize().width}.png`) })
}
async function reveal(page) {
  await page.waitForTimeout(325)
  await page.locator('.dialog-box').tap({ position: { x: 25, y: 30 } })
  await page.waitForTimeout(325)
}
try {
  for (const id of ['ch3', 'ch4']) {
    const run = await open(id, undefined, id === 'ch4' ? { width: 844, height: 390 } : undefined)
    const { page, context, saved, clicks, chapter } = run, nodes = []
    try {
      for (let limit = 0; limit < 70; limit++) {
        const node = await page.locator('[data-trilogy]').getAttribute('data-trilogy-node')
        if (node === chapter.shifts[0].checkinAt) break
        nodes.push(node)
        assert.equal(await page.locator('[data-ch2-checkin]').count(), 0, 'No paid shift during introduction')
        const before = (await clicks()).length
        await reveal(page)
        assert.equal((await clicks()).length, before, 'Fill does not add a second click')
        if (screenshots.has(node)) await screenshot(page, node)
        const choice = page.locator('[data-dialogue-choice]').first()
        if (await choice.count()) {
          await page.waitForFunction(() => document.querySelector('[data-dialogue-choice]')?.getAttribute('aria-disabled') === 'false')
          await choice.tap()
        } else await page.locator('.dialog-box').tap({ position: { x: 25, y: 30 } })
        await page.waitForFunction(previous => document.querySelector('[data-trilogy]')?.getAttribute('data-trilogy-node') !== previous, node)
        assert.equal((await saved()).gold, 1200, 'Pre-shift conversations do not pay wages')
      }
      assert.equal(await page.locator('[data-trilogy]').getAttribute('data-trilogy-node'), chapter.shifts[0].checkinAt)
      await page.locator('[data-ch2-checkin]').waitFor()
      if (id === 'ch4') await screenshot(page, 'c4_1_open_0')
      const audio = await clicks()
      for (const node of nodes) assert.equal(audio.filter(row => row.node === node && row.status === 'playing').length, 1, `${node} opens with one real click`)
      assert.deepEqual(run.errors, [])
      report.push({ id, nodes, status: 'passed', audio: `${audio.length} actual click play promises resolved` })
    } finally { await context.close() }
  }
  // Existing same-cursor gift reply and return are separate presentations.
  const giftNode = Object.entries(TRILOGY.ch3.steps).find(([, step]) => step.giftTo === 'mei')[0]
  const gift = await open('ch3', giftNode)
  try {
    await reveal(gift.page)
    await gift.page.waitForFunction(() => document.querySelector('[data-dialogue-choice]')?.getAttribute('aria-disabled') === 'false')
    await gift.page.getByRole('button', { name: '拆开零食一起吃', exact: false }).tap()
    await gift.page.waitForFunction(key => !!JSON.parse(localStorage.getItem(key)).dlc.ch3.chapter.giftReply, key)
    await reveal(gift.page)
    await gift.page.locator('.dialog-box').tap({ position: { x: 25, y: 30 } })
    await gift.page.waitForFunction(key => !JSON.parse(localStorage.getItem(key)).dlc.ch3.chapter.giftReply, key)
    assert.equal((await gift.clicks()).length, 3, 'Initial / gift reply / original dialogue return each once')
    assert.equal((await gift.saved()).heart, gift.initial.heart + 1)
    assert.deepEqual(gift.errors, [])
    report.push({ case: 'same-node gift and return', status: 'passed' })
  } finally { await gift.context.close() }
  // Automatic scan-to-dialogue never depended on a navigation click.
  const scanNode = Object.entries(TRILOGY.ch3.steps).find(([, step]) => step.scan)[0]
  const scan = await open('ch3', scanNode)
  try {
    await scan.page.locator('[data-trilogy-scan]').waitFor()
    await scan.page.locator('[data-trilogy-scan]').waitFor({ state: 'detached', timeout: 4500 })
    await scan.page.locator('.dialog-box').waitFor()
    assert.equal((await scan.clicks()).length, 1, 'Automatic scan result gets opening cue')
    assert.deepEqual(scan.errors, [])
    report.push({ case: 'automatic result', status: 'passed' })
  } finally { await scan.context.close() }
  // Explicit training handoff, new city arrival and muted negative case.
  const notice = Object.entries(TRILOGY.ch5.steps).find(([, s]) => s.image === 'cg_c5_training_notice_v3')[0]
  for (const [id, node, mute] of [['ch5', notice, false], ['ch5', 'c5_s1_0', true]]) {
    assert(TRILOGY[id].steps[node], node)
    const run = await open(id, node, { width: 390, height: 780 }, mute)
    try {
      await reveal(run.page)
      await screenshot(run.page, node)
      const text = await run.page.locator('.dialog-box').textContent()
      assert(!text.includes('省院进修'))
      if (mute) assert.equal((await run.clicks()).length, 0)
      assert.deepEqual(run.errors, [])
      report.push({ case: `${id}:${node}`, muted: mute, status: 'passed' })
    } finally { await run.context.close() }
  }
} finally {
  writeFileSync(resolve(output, 'results.json'), JSON.stringify(report, null, 2))
  await browser.close()
}
console.log(JSON.stringify(report, null, 2))
