// Focused CH3 acceptance, against one prebuilt application. No full CH1/CH2 walks.
// TRILOGY_BUILD_READY=1 node --import tsx tests/ch3-focus-ui.mjs
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { TRILOGY } from '../src/game/trilogy-registry.ts'
import { freshState } from '../src/game/store.ts'
import { initializeTrilogy, patchTrilogy, enterTrilogyNode } from '../src/game/trilogy-session.ts'

assert.equal(process.env.TRILOGY_BUILD_READY, '1', 'Run only after the shared production build is ready')
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true,
  ...(process.env.EDGE_TEST === '1' ? { channel: 'msedge' } : process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
const output = resolve(process.env.TRILOGY_OUTPUT || '../../ch3-focus-review-20261026/ui')
const url = (process.env.GAME_URL || 'http://127.0.0.1:8798/').replace(/[?#].*$/, '')
const key = 'midnight-radiology-save-v1', chapter = TRILOGY.ch3
const report = { kind: 'focused-ui-not-full-walk', started: new Date().toISOString(), cases: [], errors: [], screenshots: [] }
const filter = process.env.CH3_UI_FILTER ? new RegExp(process.env.CH3_UI_FILTER) : undefined
let entrySerial = 0
mkdirSync(output, { recursive: true })
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, hasTouch: true })
await context.addInitScript(() => {
  localStorage.setItem('mr-ch2-unlock', '1')
  localStorage.setItem('mr-trilogy-muted', '1')
  sessionStorage.setItem('mr-rotate-dismissed', '1')
  window.__focusLoaders = []
  const observe = () => {
    const collect = () => {
      const id = document.querySelector('[data-chapter-loader]')?.getAttribute('data-chapter')
      if (id && !window.__focusLoaders.includes(id)) window.__focusLoaders.push(id)
    }
    new MutationObserver(collect).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-chapter'] })
    collect()
  }
  if (document.documentElement) observe(); else document.addEventListener('DOMContentLoaded', observe, { once: true })
})
const page = await context.newPage()
page.setDefaultTimeout(8000)
page.on('pageerror', error => report.errors.push(error.message))
const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)
const rawSave = () => page.evaluate(key => localStorage.getItem(key), key)
const base = () => ({ ...freshState('f'), seed: 20261026, gold: 1400, ap: 3, skill: 8, heart: 7, wealth: 4,
  cards: [], events: [], items: [], flags: { preserved_history: true }, dlc: { dr: { done: true }, ldct: { done: true, marker: 'preserve' } } })
function fixture(node, extra = {}) {
  let state = initializeTrilogy({ ...base(), ...extra }, chapter)
  state = patchTrilogy(state, 'ch3', { applied: ['checkin:0', 'checkin:1', 'checkin:2', 'checkin:3', 'checkin:4'] })
  return enterTrilogyNode(state, chapter, node)
}
function ch2Fixture(node) {
  const state = base()
  return { ...state, dlc: { ...state.dlc, ch2: { shift: 'c2n1', stepId: node, phase: 'story',
    viewBg: 'bg_corridor_cr_covered', appliedSteps: [`ch2-${node}`] } } }
}
async function enter(route, initial) {
  await context.setOffline(false)
  await page.evaluate(({ key, initial }) => {
    if (initial === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(initial))
  }, { key, initial })
  // Each fixture must remount from its own stored state. A hash-only navigation
  // can still show the previous chapter while its new loading gate is mounting.
  await page.goto(`${url}?v=ch3-focus-ui-${++entrySerial}#/${route}`)
  await page.waitForFunction(() => {
    const loader = document.querySelector('[data-chapter-loader]')
    return loader ? ['ready', 'error'].includes(loader.getAttribute('data-status'))
      : !!document.querySelector('[data-trilogy], [data-ch2-step], [data-enter-trilogy]')
        || [...document.querySelectorAll('h1,h2')].some(e => /章节与番外/.test(e.textContent))
  }, undefined, { timeout: 120000 })
  const loader = page.locator('[data-chapter-loader]')
  if (await loader.count()) {
    assert.notEqual(await loader.getAttribute('data-status'), 'error', await loader.textContent())
    if (await page.locator('[data-chapter-enter]').count()) await page.locator('[data-chapter-enter]').click()
    await loader.waitFor({ state: 'detached', timeout: 120000 })
  }
}
async function shot(name) {
  await page.locator('img').evaluateAll(images => Promise.all(images.filter(i => i.getClientRects().length).map(i => i.decode().catch(() => {}))))
  const path = resolve(output, `${name}.png`)
  await page.screenshot({ path }); report.screenshots.push(path)
}
async function fit(locator, label, hit = false) {
  const m = await locator.evaluate((element, hit) => {
    const r = element.getBoundingClientRect(), target = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
    return { x: r.x, y: r.y, w: r.width, h: r.height, vw: innerWidth, vh: innerHeight,
      hit: !hit || target === element || element.contains(target) }
  }, hit)
  assert(m.w > 0 && m.h > 0 && m.x >= -2 && m.y >= -2 && m.x + m.w <= m.vw + 2 && m.y + m.h <= m.vh + 2 && m.hit,
    `${label}: ${JSON.stringify(m)}`)
}
async function reveal() {
  await page.waitForTimeout(325)
  await page.mouse.click(6, Math.min(240, page.viewportSize().height / 2))
}
async function styles() {
  return page.evaluate(() => {
    const pick = (selector, keys) => { const el = document.querySelector(selector); if (!el) return null; const s = getComputedStyle(el); return Object.fromEntries(keys.map(k => [k, s[k]])) }
    return { panel: pick('.dialog-box', ['padding', 'borderWidth', 'borderRadius', 'backgroundColor', 'maxWidth']),
      text: pick('.dialog-box > p', ['fontSize', 'lineHeight', 'minHeight']),
      portrait: pick('.sprite-l', ['height', 'bottom', 'left', 'objectFit']) }
  })
}
async function test(name, fn) {
  if (filter && !filter.test(name)) return
  const row = { name, status: 'running' }; report.cases.push(row)
  try { await fn(row); row.status = 'passed'; console.log(`PASS ${name}`) }
  catch (error) { row.status = 'failed'; row.error = error.stack; await shot(`FAIL-${name.replace(/[^a-z0-9-]/gi, '-')}`).catch(() => {}); throw error }
}

try {
  // Establish the origin once. Thereafter fixture writes belong solely to this isolated context.
  await page.goto(`${url}#/dlc`)
  await page.getByRole('heading', { name: /章节与番外/ }).waitFor({ timeout: 15000 })
  await test('closed-routes-and-historic-collections', async row => {
    let historical = base()
    for (const id of ['ch4', 'ch5']) {
      historical = initializeTrilogy(historical, TRILOGY[id])
      historical.badges.push(Object.keys(TRILOGY[id].badges)[0])
      historical.cards.push(Object.keys(TRILOGY[id].cards)[0])
    }
    for (const initial of [null, historical]) for (const id of ['ch4', 'ch5']) {
      await enter(id, initial)
      assert.equal(new URL(page.url()).hash, '#/dlc')
      assert.equal(await rawSave(), initial === null ? null : JSON.stringify(initial), `${id} cannot mutate saves`)
      assert(!(await page.evaluate(() => window.__focusLoaders)).some(x => x === 'ch4' || x === 'ch5'), 'Closed chapters never enter their loader')
      assert.equal(await page.locator('[data-trilogy]').count(), 0)
    }
    assert.deepEqual(await page.locator('[data-enter-trilogy]').evaluateAll(nodes => nodes.map(n => n.dataset.enterTrilogy)), ['ch3'])
    await page.getByRole('button', { name: '🏅 勋章墙', exact: true }).click()
    await page.locator('[data-trilogy-collections]').waitFor()
    for (const id of ['ch4', 'ch5']) {
      const section = page.locator('[data-trilogy-collections] > section').filter({ hasText: TRILOGY[id].title })
      assert.match(await section.locator('h3').textContent(), /历史收藏/)
      assert.equal(await section.locator('[data-collection-badge]').count(), 1)
      assert(!/[0-9]+\/[0-9]+/.test(await section.locator('h3').textContent()))
    }
    assert.equal(await rawSave(), JSON.stringify(historical)); row.closed = ['ch4', 'ch5']
    await shot('historic-collections')
  })

  await test('ordinary-dialogue-parity-three-viewports', async row => {
    row.sizes = []
    for (const size of [{ width: 1280, height: 900 }, { width: 390, height: 780 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(size)
      await enter('ch2', ch2Fixture('c2n1_an2')); await page.locator('[data-ch2-step]').waitFor(); await reveal()
      const expected = await styles(); await shot(`ch2-dialogue-${size.width}`)
      await enter('ch3', fixture('c3_s1_start_1')); await page.locator('[data-trilogy]').waitFor(); await reveal()
      assert.deepEqual(await styles(), expected, `Shared CH2/CH3 dialogue styles at ${size.width}`)
      await fit(page.locator('.dialog-box'), 'ordinary dialogue')
      await fit(page.locator('.sprite-l'), 'portrait bounds')
      await shot(`ch3-dialogue-${size.width}`)
      await enter('ch3', fixture('c3_intro_call_3')); await page.locator('.trilogy-communication').waitFor(); await reveal()
      await fit(page.locator('.trilogy-communication'), 'phone notice')
      assert.equal(await page.locator('.trilogy-communication img').evaluate(e => getComputedStyle(e.parentElement).borderRadius), '9999px')
      assert.equal(await page.locator('.sprite-l,.sprite-r').count(), 0, 'Remote caller has no room portrait')
      await shot(`ch3-phone-${size.width}`); row.sizes.push(size)
    }
  })

  await test('stage-click-and-continuous-tap-guard', async () => {
    await page.setViewportSize({ width: 390, height: 780 })
    const node = 'c3_s1_hub', initial = fixture(node)
    await enter('ch3', initial); await page.locator('[data-trilogy-node]').waitFor()
    await reveal(); await page.locator('[data-dialogue-choice]').first().waitFor()
    const button = page.locator('[data-dialogue-choice]').first(), bounds = await button.boundingBox()
    assert(bounds)
    for (let i = 0; i < 12; i++) {
      await page.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
      await page.waitForTimeout(120)
    }
    assert.equal((await read()).dlc.ch3.chapter.stepId, node, 'Repeated taps spanning 900ms do not choose')
    assert.equal((await read()).ap, initial.ap)
    await page.waitForTimeout(350); await button.tap()
    await page.waitForFunction(({ key, node }) => JSON.parse(localStorage.getItem(key)).dlc.ch3.chapter.stepId !== node, { key, node })
    assert.equal((await read()).ap, initial.ap - 1, 'Quiet fresh tap spends one AP only')
    await enter('ch3', { ...fixture(node), ap: 0 }); await reveal()
    await page.locator('[data-dialogue-choice]').first().waitFor()
    assert(await page.locator('[data-dialogue-choice]:disabled').count() > 0)
    assert.equal(await page.getByText('行动力不足，可以先去小卖部喝杯咖啡。', { exact: true }).count(), 1)
    assert(!/[（(]\s*1\s*行动力[）)]/.test(await page.locator('.dialog-box').textContent()))
    const choices = page.locator('.choice-in')
    await fit(choices, 'choice scroll viewport')
    const last = choices.locator('button').last(); await last.scrollIntoViewIfNeeded(); await fit(last, 'last choice', true)
    await shot('ch3-zero-ap-hub')
    // No-choice narration also advances from the scene, outside the dialogue box.
    await enter('ch3', fixture('c3_s1_start_2')); await reveal(); await page.waitForTimeout(350)
    await page.mouse.click(6, 200)
    await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).dlc.ch3.chapter.stepId !== 'c3_s1_start_2', key)
  })

  await test('eight-tools-offline-and-visible-controls', async row => {
    row.tasks = []
    const tools = Object.entries(chapter.steps).filter(([, step]) => step.tool)
    assert.equal(tools.length, 8)
    for (const [node, step] of tools) {
      await page.setViewportSize({ width: 390, height: 780 })
      await enter('ch3', fixture(node)); await page.locator('[data-trilogy-lab]').waitFor()
      await context.setOffline(true)
      const lab = page.locator('[data-trilogy-lab]'), ranges = lab.locator('input[type=range]')
      assert.equal((await lab.locator('[data-trilogy-tool-done]').textContent()).trim(), '结束练习 →')
      assert(!/留这(?:一)?版|回到故事/.test(await lab.textContent()), 'Tool labels describe the action, not an invented saved version')
      assert(await ranges.count() > 0, `${step.tool.task}: real control exists`)
      await ranges.first().focus(); await ranges.first().press('Home')
      if (step.tool.task === 'spatial_resolution') { await ranges.nth(1).focus(); await ranges.nth(1).press('Home') }
      await shot(`tool-${step.tool.task}-before`)
      const before = await lab.locator('canvas,svg').evaluateAll(nodes => nodes.map(n => n instanceof HTMLCanvasElement ? n.toDataURL() : n.outerHTML))
      await ranges.first().focus(); await ranges.first().press('End')
      if (step.tool.task === 'spatial_resolution') { await ranges.nth(1).focus(); await ranges.nth(1).press('End') }
      if (step.tool.task === 'echo') await lab.getByRole('button', { name: '发出脉冲，扫过四条线' }).click()
      const after = await lab.locator('canvas,svg').evaluateAll(nodes => nodes.map(n => n instanceof HTMLCanvasElement ? n.toDataURL() : n.outerHTML))
      assert.notDeepEqual(after, before, `${step.tool.task}: rendered output actually changes`)
      await fit(page.locator('[data-trilogy-tool-done]'), `${step.tool.task} footer`, true)
      await shot(`tool-${step.tool.task}-after`)
      const saved = await read()
      assert(saved.dlc.ch3.chapter.tools[node], 'Parameters persisted while offline')
      if (step.tool.task === 'spatial_resolution') {
        await page.setViewportSize({ width: 844, height: 390 })
        await fit(page.locator('[data-trilogy-tool-done]'), 'landscape spatial footer', true)
        await shot('tool-spatial-resolution-landscape')
      }
      if (step.tool.task === 'probe') {
        await lab.getByText('请梅姐讲讲', { exact: true }).tap()
        await lab.locator('details').getByRole('button', { name: '结束练习 →', exact: true }).tap()
      } else await page.locator('[data-trilogy-tool-done]').tap()
      await page.waitForFunction(({ key, node }) => JSON.parse(localStorage.getItem(key)).dlc.ch3.chapter.stepId !== node, { key, node })
      assert.equal(await page.locator('[data-chapter-loader]').count(), 0, 'Offline operation requires no media reload')
      row.tasks.push(step.tool.task)
    }
  })

  await test('gift-offline-refresh-no-duplicate', async () => {
    await page.setViewportSize({ width: 390, height: 780 })
    const node = Object.entries(chapter.steps).find(([, step]) => step.giftTo === 'mei')[0]
    const initial = fixture(node, { items: ['snack'] })
    await enter('ch3', initial); await reveal()
    const gift = page.getByRole('button', { name: /拆开零食一起吃/ })
    await page.waitForFunction(() => [...document.querySelectorAll('[data-dialogue-choice]')].some(e => /拆开零食/.test(e.textContent) && e.getAttribute('aria-disabled') === 'false'))
    await context.setOffline(true); await gift.tap()
    await page.waitForFunction(key => !!JSON.parse(localStorage.getItem(key)).dlc.ch3.chapter.giftReply, key)
    const given = await read()
    assert.equal(given.heart, initial.heart + 1); assert(!given.items.includes('snack'))
    assert.equal(given.dlc.ch3.chapter.gifts.length, 1)
    await shot('gift-reply-offline')
    await enter('ch3', given)
    assert.deepEqual(await read(), given, 'Reload does not replay gift/reward')
    await reveal(); await page.waitForTimeout(350); await page.mouse.click(6, 200)
    await page.waitForFunction(key => !JSON.parse(localStorage.getItem(key)).dlc.ch3.chapter.giftReply, key)
    await reveal()
    assert.equal(await page.getByRole('button', { name: /拆开零食一起吃/ }).count(), 0)
    assert.equal((await read()).heart, initial.heart + 1)
    assert.deepEqual((await read()).dlc.dr, initial.dlc.dr)
    assert.deepEqual((await read()).dlc.ldct, initial.dlc.ldct)
  })
  assert.deepEqual(report.errors, [], 'No page errors')
} finally {
  report.finished = new Date().toISOString()
  writeFileSync(resolve(output, 'results.json'), JSON.stringify(report, null, 2))
  await context.close(); await browser.close()
}
assert(report.cases.every(row => row.status === 'passed'))
