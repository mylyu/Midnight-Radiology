// Narrow CH3 equipment/entrance acceptance; named fixtures are not a full walk.
// Reuses ch3-parity-browser's fixture, real loader and 300/900 ms guard approach.
// TRILOGY_BUILD_READY=1 EDGE_TEST=1 node --import tsx tests/ch3-equipment-ui.mjs
// The parent supplies one final production build. This script never builds.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { freshState } from '../src/game/store.ts'
import { CH3 as chapter } from '../src/game/ch3.ts'
import { initializeTrilogy, patchTrilogy, enterTrilogyNode, trilogyStep } from '../src/game/trilogy-session.ts'
import { resolveMediaIdentities } from './media-identity-driver.mjs'

assert.equal(process.env.TRILOGY_BUILD_READY, '1', 'Use the shared final production build; this test never builds')
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const output = resolve(process.env.CH3_EQUIPMENT_OUTPUT || '../../ch3-equipment-review-20261027/ui')
const url = (process.env.GAME_URL || 'http://127.0.0.1:8798/').replace(/[?#].*$/, '')
const catalog = JSON.parse(readFileSync(new URL('../src/lib/image-assets.catalog.json', import.meta.url), 'utf8'))
const key = 'midnight-radiology-save-v1', voicePath = 'audio/vox_c3_cousin_v2.mp3'
const report = { kind: 'focused-node-fixtures-and-native-audio-not-full-walk', started: new Date().toISOString(),
  fixturePolicy: 'Opening uses a new CH3 save. Equipment and later arrival use explicitly named isolated fixtures; no full-chapter claim.',
  audioPolicy: 'Native Audio constructor, play/pause and promises retained; event listeners only. No listening/acting-quality claim.',
  cases: [], errors: [], screenshots: [] }
const filter = process.env.CH3_EQUIPMENT_FILTER ? new RegExp(process.env.CH3_EQUIPMENT_FILTER) : undefined
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ headless: true,
  ...(process.env.EDGE_TEST === '1' ? { channel: 'msedge' } : process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })
await context.addInitScript(() => {
  localStorage.setItem('mr-ch2-unlock', '1')
  localStorage.setItem('mr-trilogy-muted', '0')
  sessionStorage.setItem('mr-rotate-dismissed', '1')
  window.__nativeAudioEvents = []
  let serial = 0
  // Audio elements are detached, so document-level media listeners miss them.
  // This transparent constructor observer never changes playback or autoplay.
  window.Audio = new Proxy(window.Audio, {
    construct(target, args, newTarget) {
      const audio = Reflect.construct(target, args, newTarget), id = ++serial
      for (const event of ['playing', 'ended', 'error']) audio.addEventListener(event, () => {
        window.__nativeAudioEvents.push({ id, event, source: audio.currentSrc || audio.src,
          node: document.querySelector('[data-trilogy-node]')?.getAttribute('data-trilogy-node'),
          paused: audio.paused, currentTime: audio.currentTime, error: audio.error?.code })
      })
      return audio
    },
  })
})
const page = await context.newPage()
page.setDefaultTimeout(8000)
page.on('pageerror', error => report.errors.push(error.message))
const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)
const progress = state => state.dlc?.ch3?.chapter
const base = () => ({ ...freshState('f'), seed: 20261027, gold: 1400, ap: 3,
  skill: 8, heart: 7, wealth: 4, cards: [], events: [], items: [], flags: {} })
let serial = 0
function fixture(node, shift = 0, saved = base()) {
  assert(chapter.steps[node], `Fixture node exists: ${node}`)
  let state = initializeTrilogy(saved, chapter, `ch3-equipment-${node}`)
  state = patchTrilogy(state, 'ch3', { shift, phase: 'story',
    applied: [...new Set([...progress(state).applied, 'checkin:0', 'checkin:1', 'checkin:2', 'checkin:3', 'checkin:4'])],
    shop: { shift, buyCount: 0, lotteryCount: 0 } })
  return enterTrilogyNode(state, chapter, node)
}
async function loaded() {
  await page.waitForFunction(() => {
    const loader = document.querySelector('[data-chapter-loader]')
    return loader ? ['ready', 'error'].includes(loader.getAttribute('data-status')) : !!document.querySelector('[data-trilogy]')
  }, undefined, { timeout: 120000 })
  const loader = page.locator('[data-chapter-loader]')
  if (await loader.count()) {
    assert.notEqual(await loader.getAttribute('data-status'), 'error', await loader.textContent())
    await page.locator('[data-chapter-enter]').click()
    await loader.waitFor({ state: 'detached', timeout: 120000 })
  }
  await page.locator('[data-trilogy="ch3"]').waitFor()
}
async function nodeIs(node) {
  await page.waitForFunction(({ key, node }) => JSON.parse(localStorage.getItem(key)).dlc.ch3.chapter.stepId === node, { key, node })
  assert.equal(await page.locator('[data-trilogy-node]').getAttribute('data-trilogy-node'), node)
}
async function enter(initial) {
  await page.evaluate(({ key, initial }) => localStorage.setItem(key, JSON.stringify(initial)), { key, initial })
  await page.goto(`${url}?v=ch3-equipment-${++serial}#/ch3`)
  await loaded(); await nodeIs(progress(initial)?.stepId ?? chapter.shifts[0].start)
}
async function reveal() {
  const state = await read(), expected = (progress(state).giftReply?.text ?? trilogyStep(state, chapter).text ?? '').replaceAll('**', '')
  const text = page.locator('.dialog-box > p'); await text.waitFor()
  if (expected.length - (await text.textContent()).length > 15) await page.mouse.click(6, Math.min(240, page.viewportSize().height / 2))
  await page.waitForFunction(length => (document.querySelector('.dialog-box > p')?.textContent.length ?? 0) >= length, expected.length)
}
async function advance() {
  const node = progress(await read()).stepId
  await reveal(); await page.waitForTimeout(350) // Fresh gesture after the unchanged 300 ms guard.
  await page.mouse.click(6, Math.min(240, page.viewportSize().height / 2))
  await page.waitForFunction(({ key, node }) => JSON.parse(localStorage.getItem(key)).dlc.ch3.chapter.stepId !== node, { key, node })
}
async function fit(locator, label, hit = false) {
  const box = await locator.evaluate((element, hit) => {
    const r = element.getBoundingClientRect(), target = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
    return { x: r.x, y: r.y, width: r.width, height: r.height, vw: innerWidth, vh: innerHeight,
      hit: !hit || target === element || element.contains(target) }
  }, hit)
  assert(box.width > 0 && box.height > 0 && box.x >= -2 && box.y >= -2 && box.x + box.width <= box.vw + 2
    && box.y + box.height <= box.vh + 2 && box.hit, `${label}: ${JSON.stringify(box)}`)
  return box
}
async function imageIs(locator, id) {
  assert(catalog[id], `${id}: registered image`)
  await locator.waitFor(); await locator.evaluate(image => image.decode())
  assert(await locator.evaluate(image => image.complete && image.naturalWidth > 0), `${id}: image decoded`)
  const [identity] = await resolveMediaIdentities(page, [await locator.evaluate(image => image.currentSrc || image.src)])
  assert(identity.paths.includes(`assets/${catalog[id]}`), `${id}: delivered image bytes match the manifest`)
}
async function shot(name) {
  await page.locator('img').evaluateAll(rows => Promise.all(rows.filter(i => i.getClientRects().length).map(i => i.decode().catch(() => {}))))
  const path = resolve(output, `${name}.png`)
  await page.screenshot({ path }); report.screenshots.push(path)
}
async function audioEvents() {
  const rows = await page.evaluate(() => window.__nativeAudioEvents)
  const identities = await resolveMediaIdentities(page, [...new Set(rows.map(row => row.source).filter(Boolean))])
  return rows.map(row => ({ ...row, paths: identities.find(identity => identity.source === row.source)?.paths ?? [] }))
}
async function test(name, fn) {
  if (filter && !filter.test(name)) return
  const row = { name, status: 'running' }; report.cases.push(row)
  try { await fn(row); row.status = 'passed'; console.log(`PASS ${name}`) }
  catch (error) { row.status = 'failed'; row.error = error.stack; await shot(`FAIL-${name}`).catch(() => {}); throw error }
}

try {
  await page.goto(`${url}#/dlc`)
  await page.getByRole('heading', { name: /章节与番外/ }).waitFor({ timeout: 15000 })

  await test('cousin-first-call-native-audio-and-receipt', async row => {
    await enter(base()) // No injected CH3 progress: normal chapter initialization.
    await nodeIs('c3_intro_call_0')
    await page.getByRole('button', { name: '🔊 声音开', exact: true }).waitFor()
    assert.equal(progress(await read()).heardCues?.includes('voice:vox_c3_cousin_v2') ?? false, false)
    await advance(); await nodeIs('c3_intro_call_1'); await reveal()
    await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).dlc.ch3.chapter.heardCues?.includes('voice:vox_c3_cousin_v2'), key)
    const events = await audioEvents(), playing = events.filter(event => event.event === 'playing' && event.paths.includes(voicePath))
    assert.equal(playing.length, 1, 'Exactly one native playing event for the existing cousin clip')
    assert.equal(playing[0].node, 'c3_intro_call_1'); assert.equal(playing[0].paused, false)
    await page.waitForFunction(id => window.__nativeAudioEvents.some(event => event.id === id && event.event === 'ended'), playing[0].id)
    row.nativeVoiceEvents = (await audioEvents()).filter(event => event.paths.includes(voicePath))
    const saved = await read()
    assert.equal(progress(saved).heardCues.filter(cue => cue === 'voice:vox_c3_cousin_v2').length, 1)
    await shot('cousin-first-call-390')
    await page.reload(); await loaded(); await nodeIs('c3_intro_call_1'); await reveal()
    assert.equal((await audioEvents()).filter(event => event.event === 'playing' && event.paths.includes(voicePath)).length, 0, 'Same-node reload cannot replay the heard voice')
    assert.deepEqual(await read(), saved, 'Reload/reveal keeps the same saved cursor and receipts')
    await advance(); await nodeIs('c3_intro_call_2')
    assert.equal((await audioEvents()).filter(event => event.event === 'playing' && event.paths.includes(voicePath)).length, 0, 'Protagonist reply does not retrigger the voice')
    await enter(fixture('c3_s2_arrive_1', 1, await read())); await reveal()
    assert.equal((await audioEvents()).filter(event => event.event === 'playing' && event.paths.includes(voicePath)).length, 0, 'Later arrival stays silent for this already-heard entrance')
    assert(progress(await read()).heardCues.includes('voice:vox_c3_cousin_v2'))
    row.laterArrival = 'named fixture preserving the real opening receipt'
  })

  await test('objects-fit-with-actors-and-clear-on-exit', async row => {
    row.views = []
    const objects = [
      ['c3_s1_probes_1', 0, 'item_c3_probes_v1'],
      ['c3_s1_signal_3', 0, 'item_c3_gel_supplies_v1'],
      ['c3_s2_depth_0', 1, 'item_c3_us_phantom_v1'],
      ['c3_s4_lei_2', 3, 'item_c3_label_printer_v1'],
      ['c3_s5_mei_2', 4, 'item_c3_probe_card_v1'],
    ]
    for (const size of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1280, height: 800 }]) {
      await page.setViewportSize(size)
      for (const [node, shift, image] of size.width === 1280 ? objects.slice(0, 1) : objects) {
        assert.equal(chapter.steps[node].imageKind, 'object'); assert.equal(chapter.steps[node].image, image)
        await enter(fixture(node, shift)); await reveal()
        const object = page.locator('.trilogy-story-object'), picture = object.locator('img')
        await imageIs(picture, image)
        const portraits = page.locator('.sprite-l,.sprite-r')
        assert(await portraits.count() > 0, `${node}: colleague stays in the scene with the object`)
        for (const portrait of await portraits.all()) {
          await portrait.evaluate(image => image.decode())
          assert(await portrait.isVisible(), `${node}: colleague portrait is visible`)
        }
        const bounds = await fit(object, `${node} object`), imageBounds = await fit(picture, `${node} picture`)
        const dialogue = await page.locator('.dialog-wrap').boundingBox()
        assert(dialogue && bounds.y + bounds.height <= dialogue.y + 1 && imageBounds.y + imageBounds.height <= dialogue.y + 1,
          `${node}: object and label end above the live dialogue panel`)
        await shot(`${node}-${size.width}`)
        // Follow only this short local scene until the object really leaves.
        let advances = 0
        do { await advance(); advances++ }
        while (trilogyStep(await read(), chapter).imageKind === 'object' && advances < 4)
        assert.notEqual(trilogyStep(await read(), chapter).imageKind, 'object', `${node}: local scene has a bounded exit`)
        assert.equal(await page.locator('.trilogy-story-object').count(), 0, `${node}: no inherited object after leaving`)
        row.views.push({ node, viewport: size, image, bounds, exitedTo: progress(await read()).stepId })
      }
    }
  })

  await test('probe-image-buttons-and-live-calculation-fit', async row => {
    row.views = []
    const node = 'c3_s1_aunt_6', choices = { '凸阵': 'item_c3_probe_convex_v1', '线阵': 'item_c3_probe_linear_v1', '相控阵': 'item_c3_probe_phased_v1' }
    for (const size of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(size); await enter(fixture(node))
      const lab = page.locator('[data-trilogy-lab="probe"]'), canvas = lab.locator('[data-ultrasound-phantom]')
      await lab.waitFor(); await fit(canvas, 'live calculated ultrasound canvas')
      const buttons = lab.locator('.trilogy-probe-choices button')
      assert.equal(await buttons.count(), 3, 'Three illustrated probe choices')
      const scrollBefore = await page.evaluate(() => ({ x: scrollX, y: scrollY }))
      let previousFrame
      for (const [choice, image] of Object.entries(choices)) {
        const button = lab.getByRole('button', { name: choice, exact: true })
        await imageIs(button.locator('img'), image); await fit(button, `${choice} image button`, true)
        await button.tap()
        await page.waitForFunction(({ key, node, choice }) => JSON.parse(localStorage.getItem(key)).dlc.ch3.chapter.tools[node]?.choice === choice, { key, node, choice })
        assert.equal(await button.getAttribute('aria-pressed'), 'true')
        await page.waitForFunction(choice => document.querySelector('[data-ultrasound-phantom]')?.getAttribute('aria-label')?.startsWith(choice), choice)
        const frame = await canvas.evaluate(canvas => canvas.toDataURL())
        if (previousFrame) assert.notEqual(frame, previousFrame, 'Changing probe still recalculates the visible B-mode canvas')
        previousFrame = frame
      }
      const done = lab.locator('[data-trilogy-tool-done]')
      assert.match(await done.textContent(), /结束练习/)
      await fit(done, 'finish practice without scrolling', true)
      assert.deepEqual(await page.evaluate(() => ({ x: scrollX, y: scrollY })), scrollBefore, 'Probe selection needs no page scrolling')
      await shot(`probe-tool-${size.width}`)
      await done.tap(); await nodeIs(chapter.steps[node].tool.next)
      assert(progress(await read()).tools[node].completed)
      row.views.push({ viewport: size, choices: Object.keys(choices), calculatedFramesDiffer: true, completed: true })
    }
  })

  await test('bag-item-images-scroll-and-close', async row => {
    const items = [
      { id: 'c3_lei_label_roll', label: '小雷送的标签纸', image: 'item_c3_label_roll_v1' },
      { id: 'c3_mei_probe_card', label: '梅姐的探头选择小卡', image: 'item_c3_probe_card_v1' },
      { id: 'milktea', label: '奶茶', image: 'item_milktea' },
      { id: 'c3_pocket_towel', label: '口袋小毛巾', image: 'item_c3_towel_v2' },
    ]
    await page.setViewportSize({ width: 390, height: 844 })
    const initial = patchTrilogy(fixture('c3_s4_hub', 3, { ...base(), items: items.map(item => item.id) }), 'ch3', { phase: 'settle' })
    await enter(initial)
    const before = await read()
    const open = page.locator('[data-ch3-settlement]').getByRole('button', { name: '查看背包用途', exact: true })
    await open.scrollIntoViewIfNeeded(); await fit(open, 'open bag', true); await open.tap()
    const sheet = page.locator('.trilogy-modal-sheet')
    await sheet.getByRole('heading', { name: '背包与用途', exact: true }).waitFor()
    assert.equal(await sheet.locator('.trilogy-book-page').count(), items.length)
    for (const { label, image } of items) {
      const item = sheet.locator('.trilogy-book-page').filter({ hasText: label })
      assert.equal(await item.count(), 1, `${label}: one inventory row`)
      await imageIs(item.locator('img'), image)
      await item.scrollIntoViewIfNeeded(); await fit(item.locator('img'), `${label} bag image`)
    }
    assert.deepEqual(await read(), before, 'Inspecting all four inventory pictures never consumes items or changes saved state')
    await shot('bag-images-390')

    // Keep the requested 390 px width and reduce the visible height to exercise
    // an actually overflowing bag, without adding fictional/duplicate items.
    await page.setViewportSize({ width: 390, height: 480 })
    const extent = await sheet.evaluate(element => ({ height: element.clientHeight, content: element.scrollHeight }))
    assert(extent.content > extent.height, 'The compact 390 px bag has real content to scroll')
    await sheet.evaluate(element => { element.scrollTop = element.scrollHeight })
    assert(await sheet.evaluate(element => element.scrollTop > 0), 'The last inventory row can be reached by scrolling')
    const last = sheet.locator('.trilogy-book-page').filter({ hasText: items.at(-1).label })
    await fit(last.locator('img'), 'last bag image after scrolling')
    const close = sheet.locator('[data-trilogy-close-overlay]')
    await fit(close, 'bag close remains available after scrolling', true)
    await shot('bag-scroll-close-390')
    assert.deepEqual(await read(), before, 'Scrolling and resizing the bag leave the entire saved state unchanged')
    await close.tap(); await sheet.waitFor({ state: 'detached' })
    await page.locator('[data-ch3-settlement]').waitFor()
    assert.deepEqual(await read(), before, 'Closing the bag preserves items, money, attributes, cursor and receipts')
    row.items = items
    row.viewports = [{ width: 390, height: 844 }, { width: 390, height: 480 }]
    row.scrollExtent = extent; row.savedStateUnchanged = true
  })
  assert.equal(report.errors.length, 0, `Browser errors: ${report.errors.join('\n')}`)
  report.status = 'passed'
} catch (error) {
  report.status = 'failed'; report.error = error.stack; process.exitCode = 1
} finally {
  report.finished = new Date().toISOString()
  report.seconds = Math.round((Date.parse(report.finished) - Date.parse(report.started)) / 1000)
  await read().then(state => { report.lastState = state }).catch(() => {})
  writeFileSync(resolve(output, 'ch3-equipment-ui.json'), JSON.stringify(report, null, 2))
  await browser.close()
  console.log(`${report.status}: ${report.cases.filter(row => row.status === 'passed').length}/${report.cases.length}; ${report.seconds}s; ${output}`)
  if (report.error) console.error(report.error)
}
