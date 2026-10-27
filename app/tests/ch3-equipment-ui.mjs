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
import { trilogyVoice, trilogyVoiceAssets } from '../src/game/trilogy-audio.ts'
import { TRILOGY_COMMUNICATION_CUES } from '../src/game/trilogy-communications.ts'

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
async function chooseNext(target) {
  const node = progress(await read()).stepId
  const index = chapter.steps[node].choices?.findIndex(choice => choice.next === target) ?? -1
  assert(index >= 0, `${node}: has choice to ${target}`)
  await reveal()
  const button = page.locator('[data-dialogue-choice]').nth(index)
  await button.waitFor()
  await page.waitForTimeout(950) // Full-text 900 ms buffer and fresh 300 ms gesture are preserved.
  await button.click(); await nodeIs(target)
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

  await test('zhou-call-voice-after-ring-once', async row => {
    const voiceId = 'vox_c3_zhou_call_v1', target = `audio/${voiceId}.mp3`
    assert.deepEqual(Object.keys(chapter.steps).filter(id => trilogyVoice(chapter, chapter.steps[id]) === voiceId), ['c3_s4_zhou_connected'])
    assert.equal(trilogyVoiceAssets(chapter).filter(id => id === voiceId).length, 1)
    assert.equal(TRILOGY_COMMUNICATION_CUES.c3_s4_zhou_0, 'call')
    assert.equal(TRILOGY_COMMUNICATION_CUES.c3_s4_zhou_connected, undefined, 'The connected line does not also start the ringtone')
    await enter(fixture('c3_s4_zhou_0', 3)); await reveal()
    assert.equal((await audioEvents()).filter(e => e.event === 'playing' && e.paths.includes(target)).length, 0)
    const before = await read()
    await advance(); await nodeIs('c3_s4_zhou_connected')
    await imageIs(page.locator('img[alt="来电头像"]'), 'char_zhou')
    assert.equal(await page.locator('.sprite-l,.sprite-r').count(), 0, 'Zhou is on the phone, not standing in the corridor')
    await page.waitForFunction(({ key, voiceId }) => JSON.parse(localStorage.getItem(key)).dlc.ch3.chapter.heardCues?.includes(`voice:${voiceId}`), { key, voiceId })
    const voices = (await audioEvents()).filter(e => e.event === 'playing' && e.paths.includes(target))
    assert.equal(voices.length, 1)
    await page.waitForFunction(id => window.__nativeAudioEvents.some(e => e.id === id && e.event === 'ended'), voices[0].id)
    await reveal(); await shot('zhou-call-390')
    const heard = await read()
    await page.reload(); await loaded(); await nodeIs('c3_s4_zhou_connected'); await reveal()
    assert.equal((await audioEvents()).filter(e => e.event === 'playing' && e.paths.includes(target)).length, 0, 'Same-node reload does not repeat voice')
    assert.deepEqual(await read(), heard)
    await advance(); await nodeIs('c3_s4_zhou_1'); await advance(); await nodeIs('c3_s4_zhou_2')
    await reveal()
    assert.equal((await audioEvents()).filter(e => e.event === 'playing' && e.paths.includes(target)).length, 0, 'Later dialogue stays silent')
    const after = await read()
    for (const key of ['gold', 'skill', 'heart', 'wealth', 'ap']) assert.equal(after[key], before[key])
    assert(after.flags.c3_s4_zhou_done, 'Original event completion remains in place')
    row.nativeVoice = 'Played once to completion; reveal/reload/later lines do not repeat'
  })

  await test('breast-cyst-comparison-after-observation', async row => {
    row.views = []
    for (const size of [{ width: 1920, height: 1080 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(size)
      await enter(fixture('c3_breast_observe')); await reveal()
      await imageIs(page.locator('.trilogy-story-image img'), 'us_breast')
      await enter(fixture('c3_breast_compare_0')); await reveal()
      const picture = page.locator('.trilogy-story-image img')
      await imageIs(picture, 'us_c3_breast_cyst_compare_v1')
      const bounds = await fit(picture, 'Mammography/ultrasound comparison')
      assert(Math.abs(bounds.x + bounds.width / 2 - size.width / 2) < 2)
      assert(bounds.y + bounds.height <= (await page.locator('.dialog-wrap').boundingBox()).y + 1)
      await shot(`breast-comparison-${size.width}`)
      const before = await read()
      for (let i = 0; i < 5; i++) {
        await nodeIs(`c3_breast_compare_${i}`)
        await imageIs(picture, 'us_c3_breast_cyst_compare_v1')
        await advance()
      }
      await nodeIs('c3_s1_aunt_9')
      assert.equal(await page.locator('.trilogy-story-image').count(), 0, 'Comparison clears for the aunt’s report dialogue')
      const after = await read()
      for (const key of ['gold', 'skill', 'heart', 'wealth', 'ap']) assert.equal(after[key], before[key])
      row.views.push({ viewport: size, bounds })
    }
  })

  await test('workflow-tgc-cardiac-xu', async row => {
    for (const size of [{ width: 1920, height: 1080 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(size)
      await enter(fixture('c3_wang_color_0', 2)); await reveal()
      const image = page.locator('.trilogy-story-image img')
      await imageIs(image, 'us_c3_cardiac_color_v1')
      const bounds = await fit(image, 'Cardiac color Doppler')
      assert(Math.abs(bounds.x + bounds.width / 2 - size.width / 2) < 2)
      assert(bounds.y + bounds.height <= (await page.locator('.dialog-wrap').boundingBox()).y + 1)
      await shot(`cardiac-${size.width}`)
      await advance(); await nodeIs('c3_wang_color_1')
      await imageIs(image, 'us_c3_cardiac_color_v1')
      await advance(); await nodeIs('c3_wang_color_question')
      await chooseNext('c3_wang_color_direction'); await reveal()
      await imageIs(image, 'us_c3_cardiac_color_v1')
      for (const node of ['c3_wang_spectrum_0', 'c3_wang_spectrum_1', 'c3_wang_spectrum_2',
        'c3_wang_finish_modes_0', 'c3_wang_finish_modes_1', 'c3_wang_finish_modes_2']) { await advance(); await nodeIs(node) }
      await advance(); await nodeIs('c3_s3_wang_8')
      assert.equal(await page.locator('.trilogy-story-image').count(), 0)
    }
    await enter(patchTrilogy(fixture('c3_s2_plan_6', 1), 'ch3', {
      scans: { c3_liver_scan: { startedAt: Date.now() - 3000, completed: true } },
    }))
    await page.locator('[data-image-gain-state="ready"]').waitFor()
    const compensation = page.getByRole('slider', { name: '深处补偿', exact: true })
    await compensation.waitFor(); assert.equal(await compensation.inputValue(), '0')
    await shot('tgc-uncompensated-390')
    await compensation.fill('75')
    await shot('tgc-compensated-390')
    await page.reload(); await loaded(); await nodeIs('c3_s2_plan_6')
    assert.equal(await compensation.inputValue(), '75', 'Saved adjustment survives reload')
    await enter(fixture('c3_s3_waiting_1', 2)); await advance(); await nodeIs('c3_s3_waiting_2')
    await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).dlc.ch3.chapter.heardCues?.includes('voice:vox_c3_xu_greeting_v3'), key)
    const target = 'audio/vox_c3_xu_greeting_v3.mp3'
    const voices = (await audioEvents()).filter(e => e.event === 'playing' && e.paths.includes(target))
    assert.equal(voices.length, 1)
    await page.waitForFunction(id => window.__nativeAudioEvents.some(e => e.id === id && e.event === 'ended'), voices[0].id)
    await reveal(); await advance(); await advance(); await nodeIs('c3_s3_waiting_4')
    assert.equal((await audioEvents()).filter(e => e.event === 'playing' && e.paths.includes(target)).length, 1)
    assert.equal((await audioEvents()).filter(e => e.paths.includes('audio/vox_trilogy_mystery_v2.mp3')).length, 0)
    const saved = await read()
    await enter(fixture('c3_s3_waiting_2', 2, saved)); await reveal()
    assert.equal((await audioEvents()).filter(e => e.event === 'playing' && e.paths.includes(target)).length, 0)
    row.voice = 'One native playback, completed; later line/reload silent'
  })

  await test('echo-tgc-integrated', async row => {
    row.scope = 'One desktop heart-mode path and one real liver acquisition/TGC path; mobile/landscape use named key-node fixtures. No full-chapter or voice-acceptance claim.'
    row.views = []
    const tgcNode = 'c3_s2_plan_6', picture = page.locator('.trilogy-story-image img')
    const done = page.locator('[data-trilogy-tool-done]')
    const compensation = page.getByRole('slider', { name: '深处补偿', exact: true })
    const gain = page.getByRole('slider', { name: '总体增益', exact: true })
    const acquiredFixture = node => patchTrilogy(fixture(node, 1), 'ch3', {
      scans: { c3_liver_scan: { startedAt: Date.now() - 3000, completed: true } },
    })
    const attributes = state => Object.fromEntries(['gold', 'skill', 'heart', 'wealth', 'ap'].map(key => [key, state[key]]))
    async function spectrumFits(label) {
      await imageIs(picture, 'us_c3_cardiac_color_v1')
      const image = await fit(picture, `${label} cardiac image`)
      const spectrum = await fit(page.locator('[data-echo-spectrum]'), `${label} spectrum`)
      const pair = await fit(page.locator('.trilogy-echo-pair'), `${label} combined view`)
      assert(spectrum.y >= image.y + image.height - 1, 'Spectrum is below the cardiac image')
      assert(pair.y + pair.height <= (await page.locator('.dialog-wrap').boundingBox()).y + 1, 'Combined view does not cover dialogue or choices')
      assert(Math.abs(pair.x + pair.width / 2 - page.viewportSize().width / 2) < 2, 'Combined view stays centered')
      assert.equal(await page.locator('[data-echo-spectrum] text').allTextContents().then(rows => rows.join('|')), '速度|时间 →')
      return { image, spectrum, pair }
    }
    async function tgcFits(label) {
      await page.locator('[data-image-gain-state="ready"]').waitFor()
      const tool = trilogyStep(await read(), chapter).tool
      assert.equal(tool.variant, 'liver'); assert.equal(tool.image, 'us_c3_hepatorenal_v1')
      const image = await fit(page.locator('.trilogy-image-gain canvas'), `${label} liver image`)
      const exit = await fit(done, `${label} exit`, true)
      await fit(gain, `${label} overall-gain control`, true)
      await fit(compensation, `${label} depth-compensation control`, true)
      assert(image.y + image.height <= exit.y + 1, 'Liver image does not cover the exit')
      return { image, exit }
    }
    async function pixels() {
      return page.locator('.trilogy-image-gain canvas').evaluate(canvas => {
        const { width, height } = canvas, data = canvas.getContext('2d').getImageData(0, 0, width, height).data
        const hash = end => {
          let value = 2166136261
          for (let i = 0; i < end; i++) value = Math.imul(value ^ data[i], 16777619)
          return value >>> 0
        }
        const mean = (from, to) => {
          let sum = 0, count = 0
          for (let y = Math.ceil(height * from); y < height * to; y++) for (let x = Math.ceil(width * .4); x < width * .7; x++) {
            sum += data[(y * width + x) * 4]; count++
          }
          return sum / count
        }
        const x = Math.floor(width * .6), y = Math.floor(height * .75)
        return { width, height, fullHash: hash(data.length), shallowHash: hash(Math.floor((height - 1) * .2) * width * 4),
          shallow: mean(.08, .18), deep: mean(.65, .85), probe: { x, y, value: data[(y * width + x) * 4] } }
      })
    }
    async function pixelBrighter(probe) {
      await page.waitForFunction(({ x, y, value }) => {
        const canvas = document.querySelector('.trilogy-image-gain canvas')
        return canvas?.getContext('2d').getImageData(x, y, 1, 1).data[0] > value
      }, probe)
    }

    await page.setViewportSize({ width: 1280, height: 900 })
    await enter(fixture('c3_s3_wang_5', 2)); await reveal()
    const cardiacBefore = await read()
    await imageIs(picture, 'us_echo')
    for (const node of ['c3_s3_wang_6', 'c3_s3_wang_7', 'c3_s3_motion_0', 'c3_s3_motion_1', 'c3_s3_motion_2']) {
      await advance(); await nodeIs(node)
    }
    await page.getByRole('slider', { name: '沿时间回看', exact: true }).fill('75')
    await fit(page.locator('[data-us-task="m_mode"] svg'), 'Desktop M-mode figure')
    await fit(done, 'Desktop M-mode exit', true); await shot('echo-m-mode-1280')
    await done.click(); await nodeIs('c3_s3_motion_3')
    assert(progress(await read()).tools.c3_s3_motion_2.completed)
    for (const node of ['c3_s3_motion_4', 'c3_wang_color_intro_0', 'c3_wang_color_intro_1', 'c3_wang_color_0', 'c3_wang_color_1', 'c3_wang_color_question']) {
      await advance(); await nodeIs(node)
    }
    await chooseNext('c3_wang_color_direction')
    await advance(); await nodeIs('c3_wang_spectrum_0'); await reveal()
    const desktopSpectrum = await spectrumFits('Desktop'); await shot('echo-spectrum-1280')
    // The figure retains the scene click target: one fresh click advances a completed line.
    await page.waitForTimeout(350); await page.locator('[data-echo-spectrum]').click(); await nodeIs('c3_wang_spectrum_1')
    for (const node of ['c3_wang_spectrum_2', 'c3_wang_finish_modes_0', 'c3_wang_finish_modes_1', 'c3_wang_finish_modes_2', 'c3_s3_wang_8']) {
      await advance(); await nodeIs(node)
    }
    await reveal(); assert.equal(await page.locator('[data-echo-spectrum],.trilogy-story-image').count(), 0)
    assert((await read()).flags.c3_wang_reviewed)
    assert.deepEqual(attributes(await read()), attributes(cardiacBefore), 'Mode explanations add no mandatory-dialogue attributes')

    await enter(fixture('c3_liver_scan', 1))
    await page.locator('[data-trilogy-scan="c3_liver_scan"]').waitFor()
    const scanStartedAt = progress(await read()).scans.c3_liver_scan.startedAt
    await page.locator('[data-trilogy-scan="c3_liver_scan"]').click({ position: { x: 8, y: 8 } })
    assert.equal(progress(await read()).stepId, 'c3_liver_scan', 'Clicking does not skip the real acquisition')
    await nodeIs('c3_liver_tgc_intro_0')
    assert(Date.now() - scanStartedAt >= 3000, 'Acquisition keeps its real three-second clock')
    assert(progress(await read()).scans.c3_liver_scan.completed)
    await advance(); await nodeIs('c3_liver_tgc_intro_1'); await advance(); await nodeIs(tgcNode)
    const desktopTgc = await tgcFits('Desktop'), beforeTgc = await read()
    assert.equal(await gain.inputValue(), '45'); assert.equal(await compensation.inputValue(), '0')
    const initial = await pixels(); await shot('tgc-initial-1280')
    await gain.fill('70'); await pixelBrighter(initial.probe)
    const overall = await pixels()
    assert(overall.shallow > initial.shallow * 1.3 && overall.deep > initial.deep * 1.3, 'Overall gain changes shallow and deep regions')
    await gain.fill('45'); await compensation.fill('80'); await pixelBrighter(overall.probe)
    const compensated = await pixels()
    assert.equal(compensated.shallowHash, initial.shallowHash, 'Depth compensation leaves the shallow fifth byte-identical')
    assert(compensated.deep > initial.deep * 2.5, 'Depth compensation makes the dark deep region visibly brighter')
    await shot('tgc-compensated-1280')
    const adjusted = await read()
    await page.reload(); await loaded(); await nodeIs(tgcNode); await tgcFits('Reloaded desktop')
    assert.equal(await gain.inputValue(), '45'); assert.equal(await compensation.inputValue(), '80')
    assert.deepEqual(await pixels(), compensated, 'Reloading saved settings reproduces the same image pixels')
    assert.deepEqual(await read(), adjusted)
    await done.dblclick({ delay: 50 }); await nodeIs('c3_s2_finish_0')
    const finished = await read()
    assert(progress(finished).tools[tgcNode].completed)
    assert.equal(finished.skill, beforeTgc.skill + 1)
    assert.equal(progress(finished).applied.filter(id => id === 'c3_s2_finish_0').length, 1)
    await page.reload(); await loaded(); await nodeIs('c3_s2_finish_0')
    assert.deepEqual(await read(), finished, 'Reload after completing TGC does not repeat its reward')
    for (const node of ['c3_s2_finish_1', 'c3_s2_finish_2', 'c3_liver_observe']) { await advance(); await nodeIs(node) }
    await reveal(); await imageIs(picture, 'us_c3_hepatorenal_v1')
    row.desktop = { spectrum: desktopSpectrum, tgc: desktopTgc, pixels: { initial, overall, compensated }, scanDurationAtLeastMs: 3000 }

    for (const size of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(size)
      await enter(fixture('c3_s3_motion_2', 2))
      const motion = await fit(page.locator('[data-us-task="m_mode"] svg'), `${size.width} M-mode figure`)
      await fit(done, `${size.width} M-mode exit`, true); await shot(`echo-m-mode-${size.width}`)
      await enter(fixture('c3_wang_spectrum_1', 2)); await reveal()
      const spectrum = await spectrumFits(`${size.width}`); await shot(`echo-spectrum-${size.width}`)
      await enter(acquiredFixture(tgcNode)); const tgc = await tgcFits(`${size.width}`)
      await compensation.fill('80'); await shot(`tgc-compensated-${size.width}`)
      row.views.push({ viewport: size, motion, spectrum, tgc })
    }
    await enter(fixture(tgcNode, 1))
    assert.equal(trilogyStep(await read(), chapter).tool.variant, undefined)
    assert.equal(await page.locator('.trilogy-image-gain').count(), 0, 'An old pre-patient TGC cursor keeps the phantom fallback')
    await fit(page.locator('[data-us-task="tgc"] canvas'), 'Legacy phantom')
    await fit(done, 'Legacy phantom exit', true)

    // Inject only after chapter loading, so this tests exercise decoding rather than preload validation.
    await enter(acquiredFixture('c3_liver_tgc_intro_1'))
    await page.evaluate(() => {
      window.__exerciseDecode = HTMLImageElement.prototype.decode
      HTMLImageElement.prototype.decode = function () { return Promise.reject(new Error('Focused fixture: exercise image decode failure')) }
    })
    try {
      await advance(); await nodeIs(tgcNode)
      await page.locator('[data-image-gain-state="error"]').waitFor()
      await fit(done, 'Decode-failure exit remains usable', true)
      await done.click(); await nodeIs('c3_s2_finish_0')
    } finally { await page.evaluate(() => { HTMLImageElement.prototype.decode = window.__exerciseDecode; delete window.__exerciseDecode }) }
    row.fallback = 'Old cursor retains the original phantom; rejected exercise decode can still finish'
  })

  await test('mei-farewell-and-color-questions', async row => {
    row.views = []
    for (const size of [{ width: 1920, height: 1080 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(size)
      // The grayscale image and a spoken reason precede the color-flow comparison.
      await enter(fixture('c3_wang_color_intro_0', 2))
      const cardiacBefore = await read(), picture = page.locator('.trilogy-story-image img')
      for (const node of ['c3_wang_color_intro_0', 'c3_wang_color_intro_1']) {
        await nodeIs(node); await reveal(); await imageIs(picture, 'us_echo')
        assert.equal(await page.locator('.sprite-l,.sprite-r').count(), 0)
        await advance()
      }
      for (const node of ['c3_wang_color_0', 'c3_wang_color_1']) {
        await nodeIs(node); await reveal(); await imageIs(picture, 'us_c3_cardiac_color_v1')
        await advance()
      }
      await nodeIs('c3_wang_color_question'); await reveal()
      await imageIs(picture, 'us_c3_cardiac_color_v1')
      const colorBounds = await fit(picture, 'Heart-flow picture while asking a question')
      assert(Math.abs(colorBounds.x + colorBounds.width / 2 - size.width / 2) < 2)
      assert(colorBounds.y + colorBounds.height <= (await page.locator('.dialog-wrap').boundingBox()).y + 1)
      const choices = page.locator('[data-dialogue-choice]')
      assert.equal(await choices.count(), 2)
      for (const button of await choices.all()) await fit(button, 'Cardiac follow-up choice', true)
      await shot(`cardiac-question-${size.width}`)
      const target = size.width === 1920 ? 'c3_wang_color_direction' : 'c3_wang_color_vessel'
      await chooseNext(target); await reveal(); await imageIs(picture, 'us_c3_cardiac_color_v1')
      assert.match(await page.locator('.dialog-box > p').textContent(), size.width === 1920 ? /不是按动静脉分/ : /切面和设置/)
      for (const node of ['c3_wang_spectrum_0', 'c3_wang_spectrum_1', 'c3_wang_spectrum_2',
        'c3_wang_finish_modes_0', 'c3_wang_finish_modes_1', 'c3_wang_finish_modes_2']) { await advance(); await nodeIs(node) }
      await advance(); await nodeIs('c3_s3_wang_8'); await reveal()
      assert.equal(await page.locator('.trilogy-story-image').count(), 0, 'Color comparison clears before Wang collects the report')
      await imageIs(page.locator('.sprite-l,.sprite-r').first(), 'pat_wang_recovery')
      assert.match(await page.locator('.dialog-box > p').textContent(), /诊室工作站写好报告/)
      const cardiacAfter = await read()
      for (const key of ['gold', 'skill', 'heart', 'wealth', 'ap']) assert.equal(cardiacAfter[key], cardiacBefore[key])

      // Mei stays present across the six-line check-in; discussing a relative does not summon her portrait.
      await enter(fixture('c3_s5_cousin_check_0', 4))
      const cousinBefore = await read()
      let meiBounds
      for (let i = 0; i < 6; i++) {
        await nodeIs(`c3_s5_cousin_check_${i}`); await reveal()
        const portraits = page.locator('.sprite-l,.sprite-r')
        assert.equal(await portraits.count(), 1, 'Only Mei is physically in the room')
        await imageIs(portraits.first(), 'char_mei')
        const bounds = await fit(portraits.first(), 'Mei during cousin follow-up')
        if (meiBounds) for (const axis of ['x', 'y', 'width', 'height']) assert(Math.abs(bounds[axis] - meiBounds[axis]) < 2,
          `Mei stays in the same position while dialogue length changes: ${axis}`)
        else meiBounds = bounds
        if (i === 2) await shot(`mei-cousin-followup-${size.width}`)
        await advance()
      }
      await nodeIs('c3_s5_start_1')
      for (const key of ['gold', 'skill', 'heart', 'wealth', 'ap']) assert.equal((await read())[key], cousinBefore[key])

      // Actual story transition into the new closeup, then back to the existing portrait and handover.
      await enter(fixture('c3_s5_assess_7', 4)); await advance(); await nodeIs('c3_s5_mei_farewell_0')
      await reveal()
      const closeup = page.locator('.ldct-cinematic__image')
      await imageIs(closeup, 'cg_c3_mei_farewell_v1')
      const farewellBounds = await fit(closeup, 'Mei farewell closeup')
      assert(Math.abs(farewellBounds.x + farewellBounds.width / 2 - size.width / 2) < 2)
      assert(farewellBounds.y + farewellBounds.height <= (await page.locator('.dialog-wrap').boundingBox()).y + 1)
      assert.equal(await page.locator('.sprite-l,.sprite-r').count(), 0, 'The closeup does not also draw a second Mei portrait')
      const camera = await closeup.evaluate(element => {
        const style = getComputedStyle(element), animation = element.getAnimations()[0]
        return { name: style.animationName, duration: style.animationDuration,
          transforms: animation?.effect?.getKeyframes().map(frame => frame.transform).filter(Boolean) ?? [] }
      })
      assert.equal(camera.name, 'ch3-centered-push')
      assert(camera.transforms.includes('scale(0.965)') && camera.transforms.includes('scale(1)'), 'Small centered push-in remains active')
      await shot(`mei-farewell-${size.width}`)
      for (let i = 1; i <= 2; i++) {
        await advance(); await nodeIs(`c3_s5_mei_farewell_${i}`); await reveal()
        assert.equal(await page.locator('.ldct-cinematic,.trilogy-story-image').count(), 0, 'Closeup clears on the following dialogue')
        const portraits = page.locator('.sprite-l,.sprite-r')
        assert.equal(await portraits.count(), 1)
        await imageIs(portraits.first(), 'char_mei')
      }
      await advance(); await nodeIs('c3_s5_notice_end_4')
      row.views.push({ viewport: size, colorQuestion: target, colorBounds, meiBounds, farewellBounds, camera })
    }
    row.scope = 'Two desktop/mobile local paths only; no repeat of the TGC or voice acceptance cases'
  })

  await test('dialogue-figures-centered-on-all-screens', async row => {
    row.views = []
    const cases = [
      ['c3_s4_clinic_1', 3, '.trilogy-story-image img', 'doppler'],
      ['c3_s1_stone_4', 0, '.trilogy-story-image img', 'question'],
      ['c3_s1_probes_1', 0, '.trilogy-story-object img', 'object'],
      ['c3_s1_towel_use_2', 0, '.trilogy-story-object img', 'photo'],
      ['c3_s5_notice_0', 4, '.trilogy-document', 'document'],
      ['c3_intro_call_1', 0, '.ldct-cinematic__image', 'closeup-push'],
      ['c3_intro_visit_2', 0, '.ldct-cinematic__image', 'closeup-settle'],
    ]
    for (const size of [{ width: 1920, height: 1080 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(size)
      for (const [node, shift, selector, kind] of cases) {
        await enter(fixture(node, shift)); await reveal()
        const figure = page.locator(selector)
        await figure.waitFor()
        if (kind !== 'document') await figure.evaluate(image => image.decode())
        const bounds = await fit(figure, `${node} figure`)
        const scene = await page.locator('[data-trilogy="ch3"]').boundingBox()
        assert(Math.abs(bounds.x + bounds.width / 2 - scene.x - scene.width / 2) < .75,
          `${node}: visible figure shares the scene center, not a left column`)
        const dialogue = await page.locator('.dialog-wrap').boundingBox()
        assert(bounds.y + bounds.height <= dialogue.y + 1, `${node}: picture does not cover the dialogue`)
        assert(bounds.height > 70, `${node}: figure remains visible on short screens`)
        if (kind === 'document') assert(await figure.evaluate(element => element.scrollHeight <= element.clientHeight + 1),
          'The short document is visible in full after centering, including landscape')
        if (kind === 'question') {
          const choices = page.locator('[data-dialogue-choice]')
          await choices.first().waitFor()
          for (const choice of await choices.all()) {
            await choice.scrollIntoViewIfNeeded(); await fit(choice, 'question choice remains accessible', true)
          }
          await page.locator('.dialog-box').evaluate(element => { element.scrollTop = 0 })
        }
        if (size.width === 844 || size.width === 390 && ['document', 'object'].includes(kind) || size.width === 1920 && ['closeup-push', 'doppler'].includes(kind)) {
          await shot(`center-${kind}-${size.width}`)
        }
        row.views.push({ node, kind, viewport: size, bounds })
      }
      await enter(fixture('c3_s4_doppler_0', 3)); await reveal()
      assert.equal(await page.locator('.trilogy-story-image,.trilogy-story-object,.ldct-cinematic').count(), 0, 'Normal dialogue does not inherit a figure')
      await imageIs(page.locator('.sprite-l,.sprite-r').first(), 'char_mei')
    }
  })

  await test('doppler-and-shared-office', async row => {
    row.views = []
    for (const size of [{ width: 1920, height: 1080 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(size)
      await enter(fixture('c3_s4_clinic_0', 3))
      const initial = await read()
      for (let i = 0; i < 3; i++) {
        await nodeIs(`c3_s4_clinic_${i}`); await reveal()
        const picture = page.locator('.trilogy-story-image')
        await imageIs(picture.locator('img'), 'us_c3_color_doppler_v1')
        const bounds = await fit(picture, 'color Doppler picture')
        const dialogue = await page.locator('.dialog-wrap').boundingBox()
        assert(bounds.y + bounds.height <= dialogue.y + 1, 'Picture and caption remain above the dialogue')
        assert.equal(await page.locator('.sprite-l,.sprite-r').count(), 0, 'No overlapping portrait')
        if (i === 1) { await shot(`doppler-${size.width}`); row.views.push({ viewport: size, bounds }) }
        await advance()
      }
      await nodeIs('c3_s4_doppler_0')
      assert.equal(await page.locator('.trilogy-story-image').count(), 0, 'Picture exits at the next teaching scene')
      await imageIs(page.locator('.sprite-l,.sprite-r').first(), 'char_mei')
      const after = await read()
      for (const key of ['gold', 'skill', 'heart', 'wealth', 'ap']) assert.equal(after[key], initial[key], 'Image dialogue adds no numerical rewards')

      await enter(fixture('c3_s4_han_1', 3)); await reveal()
      await imageIs(page.locator('[data-scene-background]'), 'bg_c3_shared_office_day_v1')
      assert.equal(await page.locator('[data-scene-background="bg_office_day"]').count(), 0)
      const portraits = page.locator('.sprite-l,.sprite-r')
      assert.equal(await portraits.count(), 2, 'Lei and Han are present at the shared work desk')
      for (const portrait of await portraits.all()) await portrait.evaluate(image => image.decode())
      await shot(`shared-office-${size.width}`)
    }
  })

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

  await test('centered-closeups-and-picture-observations', async row => {
    row.views = []
    for (const [width, height, node, image] of [
      [1920, 1080, 'c3_s1_probes_1', 'item_c3_probes_v1'],
      [2560, 1080, 'c3_s1_towel_use_2', 'item_c3_training_photo_v1'],
      [390, 844, 'c3_s1_towel_use_2', 'item_c3_training_photo_v1'],
      [844, 390, 'c3_s1_probes_1', 'item_c3_probes_v1'],
    ]) {
      await page.setViewportSize({ width, height }); await enter(fixture(node)); await reveal()
      const object = page.locator('.trilogy-story-object')
      await imageIs(object.locator('img'), image)
      const box = await fit(object, `${node} centered object`)
      const dialog = await page.locator('.dialog-wrap').boundingBox()
      assert(Math.abs(box.x + box.width / 2 - width / 2) < 2, 'Object is centered, not a corner thumbnail')
      assert(box.y + box.height <= dialog.y, 'Picture and caption stay above dialogue')
      if (width >= 1920) assert(box.width >= 750, 'Wide desktop closeup is substantially larger than the former 320 px')
      await shot(`centered-${node}-${width}`)
      row.views.push({ node, width, height, bounds: box })
    }
    const observations = [
      ['c3_breast_observe', 0, 'us_breast', 'c3_breast_right'],
      ['c3_s1_stone_4', 0, 'us_gallstone', 'c3_s1_shadow_good'],
      ['c3_liver_observe', 1, 'us_c3_hepatorenal_v1', 'c3_liver_compare'],
      ['c3_s3_mirror_2', 2, 'us_mirror', 'c3_s3_mirror_check'],
    ]
    for (const size of [{ width: 1920, height: 1080 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(size)
      for (const [node, shift, image, target] of size.width === 844 ? observations.slice(1, 2) : observations) {
        await enter(fixture(node, shift)); await reveal()
        const choices = page.locator('[data-dialogue-choice]')
        await choices.first().waitFor()
        const picture = page.locator('.trilogy-story-image img')
        await imageIs(picture, image)
        const box = await fit(page.locator('.trilogy-story-image'), `${node} image`)
        const dialog = await page.locator('.dialog-wrap').boundingBox()
        assert(Math.abs(box.x + box.width / 2 - size.width / 2) < 2, 'Clinical image is centered in every orientation')
        assert(box.y + box.height <= dialog.y + 1, 'Image stays above the original dialogue, including short landscape screens')
        assert(box.height > 90, 'There is an actual visible observation image')
        assert.equal(await page.locator('.sprite-l,.sprite-r').count(), 0, 'No patient portrait overlays the picture question')
        for (const button of await choices.all()) await fit(button, `${node} choice`, true)
        await shot(`observe-${node}-${size.width}`)
        const before = await read()
        const index = chapter.steps[node].choices.findIndex(choice => choice.next === target)
        await page.waitForTimeout(950) // Existing full-text choice buffer remains in force.
        await choices.nth(index).click(); await nodeIs(target)
        await page.locator('[data-stat-notice]').filter({ hasText: /医术.*1/ }).waitFor()
        assert.equal((await read()).skill, before.skill + 1)
        if (size.width === 1920 && node === 'c3_s1_stone_4') await shot('observation-skill-bubble')
        await page.reload(); await loaded(); await nodeIs(target)
        assert.equal((await read()).skill, before.skill + 1, 'Reload cannot repeat the picture reward')
        assert.equal(await page.locator('[data-stat-notice]').count(), 0, 'Restoring does not invent a second change bubble')
        row.views.push({ node, viewport: size, bounds: box, reward: 1, restored: true })
      }
    }
    await page.setViewportSize({ width: 1920, height: 1080 })
    await enter(fixture('c3_s3_waiting_1', 2)); await reveal()
    const portraits = page.locator('.sprite-l,.sprite-r')
    assert.equal(await portraits.count(), 1)
    await imageIs(portraits.first(), 'pat_mystery')
    await shot('xu-waiting-without-cousin')
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
