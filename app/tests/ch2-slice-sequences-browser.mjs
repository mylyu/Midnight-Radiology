// Disposable seeded acquisition/restore fixtures, not a complete chapter playthrough.
// Real admitted atlases are fetched and decoded. No synthetic image can satisfy this test.
// Audio play() is deliberately rejected; the original recording is separately hash/decode checked.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { freshState } from '../src/game/store.ts'
import { CH2_SHIFTS, ch2StepForState } from '../src/game/ch2.ts'
import { CH2_SCANS, CH2_SCAN_TEXT, CH2_SCAN_AUDIO } from '../src/game/ch2-scans.ts'
import { getCh2SliceSequence, ch2SliceFrameIndex } from '../src/game/ch2-scan-sequences.ts'
import { getCh2Observation } from '../src/game/ch2-observations.ts'
import { assetAudits, expectedAcquisitions, expectedReconstruction, expectedAudioSha256, approvedMachineOnly } from './ch2-slice-sequences-data.mjs'

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const baseURL = (process.env.GAME_URL || 'http://127.0.0.1:8798/').replace(/\/$/, '') + '/'
const gameURL = `${baseURL}#/ch2`, saveKey = 'midnight-radiology-save-v1'
const output = resolve(process.env.SLICE_SEQUENCE_OUTPUT || '../../ch2-slice-sequences-review')
const results = [], errors = [], networkFailures = [], httpAssets = []
const plain = text => (text ?? '').replaceAll('**', '')
const economy = s => Object.fromEntries(['gold', 'skill', 'heart', 'wealth', 'ap', 'durability', 'items', 'badges'].map(key => [key, s[key]]))
const awards = s => ({ ...economy(s), flags: s.flags, cards: s.cards, events: s.events })
const inherited = s => ({ night: s.night, finished: s.finished, screenHint: s.screenHint, stepId: s.stepId,
  resumeKey: s.resumeKey, buyCount: s.buyCount, dr: s.dlc.dr, dsa: s.dlc.dsa, grade: s.flags.quiz_grade })
const targets = {
  c2n1_m7: 'c2n1_w1ok', c2n1_p_scan: 'c2n1_p3', c2d2_lung_scan: 'c2d2_w1ok',
  c2d2_trauma_scan: 'c2d2_t1', c2d2_wrist_scan: 'c2d2_w2',
  c2n3_m5: 'c2n3_m6', c2n3_repeat_scan: 'c2n3_m8', c2n3_cta_scan: 'c2n3_m10',
  c2n3_coronary_scan: 'c2n3_coronary_where', c2n3_mystery_scan: 'c2n3_x8',
  c2d4_aorta_scan: 'c2d4_t1', c2d4_metal_scan: 'c2d4_12a', c2n5_child_scan: 'c2n5_m17', c2d4_m1: 'c2d4_m2',
}
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
let activePage
const read = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), saveKey)
const settled = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))

function fixture(id) {
  const shift = CH2_SHIFTS.find(row => row.steps[id])
  assert(shift, `${id}: actual registered story hook`)
  return { ...freshState('f'), gold: 921, skill: 8, heart: 6, wealth: 4, ap: 0, durability: 76,
    night: 5, finished: true, seed: 2026092507, flags: { quiz_grade: 'S' }, items: ['key', 'dosimeter'],
    cards: ['ct_intro'], badges: ['fixer'], events: [], buyCount: 17,
    screenHint: 'chapterEnd', stepId: 'n5_end', resumeKey: '5-n5_end',
    dlc: { dr: { done: true }, dsa: { done: true, dose: 42 }, ch2: {
      shift: shift.id, stepId: id, phase: 'story', done: false, appliedSteps: [],
      viewBg: shift.kind === 'day' ? 'bg_ctcontrol_day' : 'bg_ctcontrol',
    } } }
}

async function open(id, { mobile = false, viewport, reducedMotion = 'no-preference', fault } = {}) {
  const save = fixture(id), config = CH2_SCANS[id], sequence = getCh2SliceSequence(config?.sequence)
  const context = await browser.newContext({ viewport: viewport ?? (mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 }), reducedMotion })
  let closing = false, release = () => {}, faultRequests = 0
  const faultURL = sequence && new URL(sequence.asset, baseURL).href
  if (fault) {
    const gate = new Promise(resolve => { release = resolve })
    await context.route(faultURL, async route => {
      faultRequests++
      if (fault === 'slow') await gate
      await route.abort('failed').catch(() => {})
    })
  }
  context.on('close', () => { closing = true; release() })
  await context.addInitScript(({ save, saveKey, origin, recording }) => {
    if (location.origin !== origin) return
    localStorage.setItem('mr-ch2-unlock', '1')
    sessionStorage.setItem('mr-rotate-dismissed', '1')
    if (!localStorage.getItem(saveKey)) localStorage.setItem(saveKey, JSON.stringify(save))
    window.__sliceSamples = []
    window.__sliceCompletions = []
    window.__sliceAudio = []
    window.__sliceAudioElements = []
    window.__sliceNativePlay = HTMLMediaElement.prototype.play
    const originalPause = HTMLMediaElement.prototype.pause
    HTMLMediaElement.prototype.play = function () {
      if (this.src.includes(recording)) {
        if (!window.__sliceAudioElements.includes(this)) window.__sliceAudioElements.push(this)
        window.__sliceAudio.push({ event: 'play', recordingId: window.__sliceAudioElements.indexOf(this), at: Date.now(), offset: this.currentTime, loop: this.loop, hidden: document.hidden, src: this.src })
      }
      return Promise.reject(new DOMException('Explicit fixture audio denial', 'NotAllowedError'))
    }
    HTMLMediaElement.prototype.pause = function () {
      if (this.src.includes(recording)) window.__sliceAudio.push({ event: 'pause', recordingId: window.__sliceAudioElements.indexOf(this), at: Date.now(), offset: this.currentTime, hidden: document.hidden })
      return originalPause.call(this)
    }
    let previous = '', active
    new MutationObserver(() => {
      const overlay = document.querySelector('.ch2-scan-overlay')
      if (!overlay) {
        if (active) window.__sliceCompletions.push({ id: active.id, elapsed: Date.now() - active.startedAt })
        active = undefined
        return
      }
      const id = overlay.getAttribute('data-scan-id')
      const startedAt = JSON.parse(localStorage.getItem(saveKey))?.dlc?.ch2?.scanSessions?.[id]?.startedAt
      if (startedAt) active = { id, startedAt }
      const image = overlay.querySelector('[data-slice-frame]')
      if (!image) return
      const row = { id, index: Number(image.getAttribute('data-slice-frame')),
        progress: Number(overlay.style.getPropertyValue('--ch2-scan-progress')),
        ready: image.getAttribute('data-slice-ready') === 'true', at: Date.now(), startedAt }
      const signature = `${id}:${row.index}:${row.progress}:${row.ready}`
      if (signature !== previous) window.__sliceSamples.push(row)
      previous = signature
    }).observe(document, { childList: true, subtree: true, attributes: true })
  }, { save, saveKey, origin: new URL(baseURL).origin, recording: CH2_SCAN_AUDIO.acquisition })
  const page = await context.newPage()
  activePage = page
  page.setDefaultTimeout(10000)
  page.on('pageerror', error => errors.push(error.message))
  page.on('requestfailed', request => {
    if (!closing && request.url().includes('/ct-sequences/')) networkFailures.push({ url: request.url(), failure: request.failure(), expected: !!fault && request.url() === faultURL })
  })
  await page.goto(gameURL, { waitUntil: 'domcontentloaded' })
  await page.locator(`[data-ch2-step="${id}"]`).waitFor()
  return { page, context, save, faultRequests: () => faultRequests,
    close: async () => { closing = true; release(); await context.close() } }
}

async function recordingPlays(page) {
  const { events, recordings, development } = await page.evaluate(() => ({
    events: window.__sliceAudio,
    recordings: window.__sliceAudioElements.map((element, id) => ({ id, paused: element.paused, sourceRemoved: !element.hasAttribute('src') })),
    development: !!document.querySelector('script[src*="/@vite/client"]'),
  }))
  const plays = events.filter(row => row.event === 'play')
  // Actual App is StrictMode in development, which immediately rehearses effect
  // setup/cleanup once. Exclude only that first, provably disposed object; a
  // second persistent object, replay of the same object, or production duplicate fails.
  const first = plays[0], second = plays[1]
  const firstPause = first && events.find(row => row.event === 'pause' && row.recordingId === first.recordingId)
  const disposed = first && recordings.find(row => row.id === first.recordingId)
  const rehearsal = !!(development && second && first.recordingId !== second.recordingId
    && second.at - first.at <= 40 && firstPause && firstPause.at <= second.at
    && firstPause.at - first.at <= 40 && disposed?.paused && disposed.sourceRemoved)
  return { plays: rehearsal ? plays.slice(1) : plays, immediateDisposedRehearsals: rehearsal ? 1 : 0 }
}

async function nativeLifecycleCapability() {
  // Separate environment-only probe: an about:blank timer has no game code.
  const context = await browser.newContext(), page = await context.newPage()
  const cdp = await context.newCDPSession(page)
  try {
    await page.goto('about:blank')
    await page.evaluate(() => { window.__probeTicks = 0; window.__probeTimer = setInterval(() => window.__probeTicks++, 20) })
    await page.waitForTimeout(100)
    assert(await page.evaluate(() => window.__probeTicks) >= 2, 'The independent capability probe timer runs before freezing')
    await cdp.send('Page.setWebLifecycleState', { state: 'frozen' })
    const before = await page.evaluate(() => window.__probeTicks)
    await page.waitForTimeout(180)
    const after = await page.evaluate(() => window.__probeTicks)
    return { supported: before === after, before, after, frozenWaitMs: 180,
      method: 'Native Page.setWebLifecycleState on an independent about:blank timer; no game state or document visibility overrides.' }
  } finally {
    await cdp.send('Page.setWebLifecycleState', { state: 'active' })
    await cdp.detach(); await context.close()
  }
}

async function nativeAudioCleanupProbe(earlyDispose) {
  const id = 'c2n3_cta_scan', test = await open(id), { page, context } = test
  let release, requests = 0
  const gate = new Promise(resolve => { release = resolve })
  try {
    await context.route(`**/audio/${CH2_SCAN_AUDIO.acquisition}.mp3`, async route => {
      requests++; await gate; await route.continue().catch(() => {})
    })
    await page.evaluate(recording => {
      window.__nativeAudioEvents = []; window.__nativeAudioCount = 0
      const nativePlay = window.__sliceNativePlay
      HTMLMediaElement.prototype.play = function () {
        if (!this.src.includes(recording)) return nativePlay.call(this)
        window.__nativeRecording = this
        const id = ++window.__nativeAudioCount
        this.__probeId = id
        for (const type of ['playing', 'pause', 'emptied', 'error', 'abort']) {
          this.addEventListener(type, () => window.__nativeAudioEvents.push({ id, type, at: Date.now(), paused: this.paused, src: this.getAttribute('src') }))
        }
        window.__nativeAudioEvents.push({ id, type: 'play-request', at: Date.now(), src: this.src })
        const request = nativePlay.call(this)
        request.then(() => window.__nativeAudioEvents.push({ id, type: 'resolved', at: Date.now() }),
          error => window.__nativeAudioEvents.push({ id, type: 'rejected', at: Date.now(), name: error.name }))
        return request
      }
    }, CH2_SCAN_AUDIO.acquisition)
    const before = await read(page), startedAt = await start(page, id)
    await readyImage(page, getCh2SliceSequence(CH2_SCANS[id].sequence))
    await page.waitForTimeout(450)
    assert(requests > 0, 'The actual original recording download is held, not substituted')
    assert.equal(await page.evaluate(() => window.__nativeAudioEvents.some(event => event.id === window.__nativeRecording.__probeId
      && (event.type === 'playing' || event.type === 'rejected'))), false, 'The native live play promise is genuinely pending, not an autoplay-denial mock')
    let elapsed
    if (earlyDispose) {
      await page.evaluate(() => { location.hash = '#/dlc' })
      await page.locator('.ch2-scan-overlay').waitFor({ state: 'detached' })
      await settled(page)
      elapsed = Date.now() - startedAt
      assert(elapsed < 1500, 'The route actually disposes the component early, rather than waiting for normal completion')
      assert.equal(!!(await read(page)).dlc.ch2.scanSessions[id].completed, false)
    } else elapsed = await finished(page, id)
    assert.deepEqual(await page.evaluate(() => ({ paused: window.__nativeRecording.paused, source: window.__nativeRecording.getAttribute('src') })),
      { paused: true, source: null }, 'Cleanup stops and detaches the native recording')
    release(); await page.waitForTimeout(700)
    const { events, currentId } = await page.evaluate(() => ({ events: window.__nativeAudioEvents, currentId: window.__nativeRecording.__probeId }))
    assert.equal(events.filter(event => event.type === 'playing').length, 0, 'Late native audio cannot chase a completed or disposed scan')
    assert(events.some(event => event.id === currentId && event.type === 'rejected' && event.name === 'AbortError'), 'Cleanup aborts the actual pending native play promise')
    assert.deepEqual(economy(await read(page)), economy(before))
    return { kind: earlyDispose ? 'native-delayed-audio-early-dispose' : 'native-delayed-audio-expiry', id, elapsed, requests, events,
      method: 'Original browser play(); actual MP3 route held until after cleanup, then released and observed for 700ms.',
      audioPlaybackDeliberatelyRejected: false, fullPlaythrough: false }
  } finally { release(); await test.close() }
}

async function current(page) {
  const state = await read(page), id = state.dlc.ch2.stepId
  const shift = CH2_SHIFTS.find(row => row.id === state.dlc.ch2.shift)
  return { state, id, step: ch2StepForState(id, shift.steps[id], state) }
}
async function reveal(page, text) {
  const line = page.locator('.dialog-box > p'), expected = plain(text)
  if (await line.textContent() !== expected) await line.click()
  await page.waitForFunction(text => document.querySelector('.dialog-box > p')?.textContent === text, expected)
}
async function start(page, id) {
  const { step } = await current(page), config = CH2_SCANS[id]
  await reveal(page, config.mode === 'acquire' ? step.text : CH2_SCAN_TEXT[id])
  await page.locator(`.ch2-scan-overlay[data-scan-id="${id}"]`).waitFor()
  return (await read(page)).dlc.ch2.scanSessions[id].startedAt
}
async function finished(page, id) {
  await page.locator(`.ch2-scan-overlay[data-scan-id="${id}"]`).waitFor({ state: 'detached', timeout: 6000 })
  await page.waitForFunction(({ id, key }) => JSON.parse(localStorage.getItem(key)).dlc.ch2.scanSessions[id]?.completed === true, { id, key: saveKey })
  await settled(page)
  const record = await page.evaluate(id => window.__sliceCompletions.find(row => row.id === id), id)
  assert(record, `${id}: completion was observed from the real mounted overlay`)
  assert(record.elapsed >= CH2_SCANS[id].durationMs && record.elapsed < CH2_SCANS[id].durationMs + 1800,
    `${id}: neither skipped nor extended for resources (${record.elapsed}ms)`)
  assert.equal(await page.evaluate(id => window.__sliceCompletions.filter(row => row.id === id).length, id), 1)
  return record.elapsed
}
function checkSamples(samples, config, reduced = false) {
  const sequence = getCh2SliceSequence(config.sequence)
  assert(samples.length >= 4, `${config.id}: actual progress samples recorded`)
  let last = -1
  for (const sample of samples) {
    assert(sample.index >= last && sample.index >= 0 && sample.index < sequence.frameCount)
    assert.equal(sample.index, ch2SliceFrameIndex(sequence, reduced ? 0.5 : sample.progress), 'The displayed frame is derived from the overlay clock')
    last = sample.index
  }
  if (!reduced) assert(new Set(samples.map(row => row.index)).size >= 3, 'The atlas actually advances, not a static still')
}
async function readyImage(page, sequence) {
  const figure = page.locator(`[data-slice-sequence="${sequence.id}"][data-slice-ready="true"]`)
  await figure.waitFor()
  const image = figure.locator('img.ch2-slice-atlas')
  const info = await image.evaluate(async img => { await img.decode(); return { url: img.currentSrc || img.src, width: img.naturalWidth, height: img.naturalHeight } })
  assert.equal(info.url, new URL(sequence.asset, baseURL).href)
  assert.equal(info.width, sequence.columns * sequence.frameWidth)
  assert.equal(info.height, sequence.rows * sequence.frameHeight)
  return info
}
async function layout(page, config) {
  const panel = await page.locator('.ch2-scan-panel').boundingBox(), view = page.viewportSize()
  assert(panel.x >= -1 && panel.y >= -1 && panel.x + panel.width <= view.width + 1 && panel.y + panel.height <= view.height + 1)
  assert(await page.locator('.ch2-scan-panel').evaluate(element => element.scrollWidth <= element.clientWidth + 1))
  assert.equal(await page.locator('.ch2-ct-motion').count(), config.presentation === 'console' ? 0 : 1)
  if (config.presentation === 'dual') {
    const machine = await page.locator('.ch2-scan-device').boundingBox(), slices = await page.locator('.ch2-slice-screen').boundingBox()
    assert(slices.width * slices.height >= machine.width * machine.height, 'Slice area is at least as large as the machine area')
    assert(machine.x + machine.width <= slices.x + 1, 'Machine stays left of the slice preview')
  }
}
async function refreshAwards(page, label) {
  await settled(page)
  const before = await read(page)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.locator(`[data-ch2-step="${before.dlc.ch2.stepId}"]`).waitFor()
  await settled(page)
  const after = await read(page)
  assert.deepEqual(awards(after), awards(before), `${label}: refreshing duplicates no reward or item`)
  assert.deepEqual(inherited(after), inherited(before))
  assert.deepEqual(after.dlc.ch2.scanSessions, before.dlc.ch2.scanSessions)
  assert.deepEqual(after.dlc.ch2.observations, before.dlc.ch2.observations)
  return after
}

async function afterScan(page, scanId) {
  const target = targets[scanId], visited = []
  for (let count = 0; count < 9; count++) {
    const { state, id, step } = await current(page)
    visited.push(id)
    if (id === target) {
      const observation = getCh2Observation(id, state)
      if (observation) {
        await page.locator(`[data-ch2-observation="${observation.id}"]`).waitFor()
        assert.equal(state.dlc.ch2.observations?.[observation.id], undefined, 'Preview never answers the original observation')
        await reveal(page, observation.prompt)
      } else if (step.windowTask) {
        await reveal(page, step.text)
        await page.getByRole('button', { name: /^就这个窗口 · 确认/ }).waitFor()
      } else {
        await reveal(page, step.text)
        assert(!await page.locator('.ch2-scan-overlay').count())
      }
      return { visited, target, observation: observation?.id ?? null, originalWindowTask: !!step.windowTask }
    }
    if (CH2_SCANS[id] && !state.dlc.ch2.scanSessions?.[id]?.completed) {
      assert.equal(CH2_SCANS[id].mode, 'reconstruct', 'A preview cannot invent another acquisition before this observation')
      await start(page, id); await finished(page, id)
      assert.equal((await read(page)).dlc.ch2.stepId, id, 'Reconstruction remains on its original image/window node')
      continue
    }
    await reveal(page, step.text)
    if (step.windowTask) {
      const task = step.windowTask
      await page.getByRole('button', { name: new RegExp(` ${task.targetW}/${task.targetL}$`) }).click()
      await page.getByRole('button', { name: /^就这个窗口 · 确认/ }).click()
      await page.locator(`[data-ch2-step="${task.success}"]`).waitFor()
    } else if (step.choices) {
      const choice = step.choices.find(row => row.tag === 'good')
      assert(choice, `${id}: this bounded fixture expects a known original choice`)
      await page.getByRole('button', { name: plain(choice.text), exact: true }).click()
      await page.locator(`[data-ch2-step="${choice.next}"]`).waitFor()
    } else {
      assert(step.next && !step.end, `${scanId}: cannot reach ${target}`)
      await page.locator('.dialog-box > span.animate-bounce').waitFor()
      await page.locator('.dialog-box > p').click()
      await page.locator(`[data-ch2-step="${step.next}"]`).waitFor()
    }
  }
  assert.fail(`${scanId}: bounded continuation did not reach ${target}; ${visited.join(' -> ')}`)
}

try {
  // Production-prefix compatible integrity check, with no browser /src imports.
  const integrity = await browser.newContext(), probe = await integrity.newPage()
  await probe.goto(baseURL, { waitUntil: 'domcontentloaded' })
  for (const asset of assetAudits) {
    const decoded = await probe.evaluate(async url => {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Atlas HTTP ${response.status}: ${url}`)
      const bytes = await response.arrayBuffer(), digest = await crypto.subtle.digest('SHA-256', bytes)
      const bitmap = await createImageBitmap(new Blob([bytes]))
      const result = { url, width: bitmap.width, height: bitmap.height,
        sha256: Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('') }
      bitmap.close(); return result
    }, new URL(asset.asset, baseURL).href)
    assert.equal(decoded.sha256, asset.sha256)
    assert.equal(decoded.width, asset.width); assert.equal(decoded.height, asset.height)
    httpAssets.push(decoded)
  }
  const audio = await probe.evaluate(async url => {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Recording HTTP ${response.status}`)
    const bytes = await response.arrayBuffer(), digest = await crypto.subtle.digest('SHA-256', bytes)
    const context = new OfflineAudioContext(1, 1, 24000), decoded = await context.decodeAudioData(bytes.slice(0))
    return { sha256: Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join(''),
      duration: decoded.duration, channels: decoded.numberOfChannels, sampleRate: decoded.sampleRate }
  }, new URL(`audio/${CH2_SCAN_AUDIO.acquisition}.mp3`, baseURL).href)
  assert.equal(audio.sha256, expectedAudioSha256)
  assert(Math.abs(audio.duration - 3) < 0.002)
  assert.equal(audio.channels, 1); assert.equal(audio.sampleRate, 24000)
  await integrity.close()

  for (const mobile of [false, true]) for (const id of expectedAcquisitions) {
    const test = await open(id, { mobile }), { page } = test, config = CH2_SCANS[id]
    const sequence = getCh2SliceSequence(config.sequence), before = await read(page)
    await start(page, id)
    assert.equal(await page.getByRole('button', { name: /跳过/ }).count(), 0)
    assert.equal(await page.locator('.ch2-scan-overlay').getAttribute('data-scan-mode'), 'acquire')
    assert.equal(await page.locator('.ch2-scan-overlay').getAttribute('data-scan-presentation'), config.presentation)
    await page.keyboard.press('Enter'); await page.keyboard.press('Space'); await page.keyboard.press('Escape')
    await page.locator('.ch2-scan-overlay').click({ position: { x: 2, y: 2 } })
    assert.equal((await read(page)).dlc.ch2.stepId, id, 'Keys/backdrop cannot skip acquisition')
    let decoded = null
    if (sequence) decoded = await readyImage(page, sequence)
    else {
      assert.equal(id, approvedMachineOnly, 'Only the explicitly approved pediatric scan can omit an atlas')
      assert.equal(await page.locator('.ch2-slice-sequence, [data-slice-unavailable]').count(), 0, 'Original pediatric machine scene has no empty atlas panel')
      await page.locator('[data-ct-motion-ready="true"]').waitFor()
    }
    await layout(page, config)
    await page.waitForFunction(() => Number(document.querySelector('.ch2-scan-overlay')?.style.getPropertyValue('--ch2-scan-progress')) >= 0.35)
    const screenshot = `${id}-${mobile ? '390' : 'desktop'}-${sequence ? 'selected-frame' : 'approved-machine'}.png`
    await page.screenshot({ path: resolve(output, screenshot) })
    const elapsed = await finished(page, id), next = await read(page)
    assert.deepEqual(economy(next), economy(before), 'The acquisition itself has zero economy/inventory/badge reward')
    assert.deepEqual(inherited(next), inherited(before))
    const samples = await page.evaluate(id => window.__sliceSamples.filter(row => row.id === id), id)
    if (sequence) checkSamples(samples, config)
    else assert.equal(samples.length, 0)
    const { plays, immediateDisposedRehearsals } = await recordingPlays(page)
    assert.equal(plays.length, 1, 'One original recording per acquisition, including console mode')
    assert.equal(plays[0].loop, false)
    const continuation = await afterScan(page, id)
    await refreshAwards(page, id)
    if (!mobile && id === 'c2n1_p_scan') {
      const state = await read(page), observation = getCh2Observation(state.dlc.ch2.stepId, state)
      const choice = observation.choices.find(row => row.correct)
      await reveal(page, observation.prompt)
      await page.getByRole('button', { name: plain(choice.text), exact: true }).click()
      await page.waitForFunction(({ key, id }) => !!JSON.parse(localStorage.getItem(key)).dlc.ch2.observations?.[id], { key: saveKey, id: observation.id })
      const answered = await read(page)
      assert.equal(answered.skill, state.skill + 1, 'Original correct-observation reward is retained')
      const afterReload = await refreshAwards(page, 'answered observation')
      assert.equal(afterReload.skill, answered.skill)
      assert.equal(afterReload.dlc.ch2.loop.entries.filter(row => row.id === `observe:${observation.id}`).length, 1)
    }
    results.push({ kind: 'seeded-acquisition-to-original-reading', id, viewport: page.viewportSize(), fullPlaythrough: false,
      decoded, elapsed, screenshot, approvedPediatricMachineException: id === approvedMachineOnly,
      firstFrame: samples[0]?.index ?? null, lastFrame: samples.at(-1)?.index ?? null, sampledFrames: [...new Set(samples.map(row => row.index))],
      audioPlayCount: plays.length, immediateDisposedRehearsals, ...continuation, reloadDuplicatesNoReward: true })
    await test.close()
  }

  for (const id of expectedReconstruction) {
    const test = await open(id), before = await read(test.page)
    await start(test.page, id)
    assert.equal(await test.page.locator('.ch2-ct-motion, .ch2-slice-sequence').count(), 0)
    assert.equal(await test.page.locator('.ch2-scan-workstation').count(), 1)
    const elapsed = await finished(test.page, id)
    assert.equal((await read(test.page)).dlc.ch2.stepId, id)
    assert.equal(await test.page.evaluate(() => window.__sliceAudio.filter(row => row.event === 'play').length), 0)
    assert.deepEqual(economy(await read(test.page)), economy(before))
    results.push({ kind: 'seeded-reconstruction-unchanged', id, elapsed, fullPlaythrough: false })
    await test.close()
  }

  for (const [id, mobile] of [['c2n1_p_scan', false], ['c2n3_repeat_scan', true]]) {
    const test = await open(id, { mobile }), { page } = test, sequence = getCh2SliceSequence(CH2_SCANS[id].sequence)
    const startedAt = await start(page, id)
    await readyImage(page, sequence)
    await page.waitForFunction(({ key, id }) => Date.now() - JSON.parse(localStorage.getItem(key)).dlc.ch2.scanSessions[id].startedAt >= 1500, { key: saveKey, id })
    const before = await read(page), beforeFrame = Number(await page.locator('[data-slice-frame]').getAttribute('data-slice-frame'))
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.locator(`.ch2-scan-overlay[data-scan-id="${id}"]`).waitFor()
    const restored = await read(page)
    assert.equal(restored.dlc.ch2.scanSessions[id].startedAt, startedAt)
    assert.deepEqual(economy(restored), economy(before))
    await readyImage(page, sequence)
    const restoredFrame = Number(await page.locator('[data-slice-frame]').getAttribute('data-slice-frame'))
    assert(restoredFrame >= beforeFrame && restoredFrame >= Math.floor(sequence.frameCount / 2), 'Reload resumes elapsed slice position')
    const { plays, immediateDisposedRehearsals } = await recordingPlays(page)
    assert.equal(plays.length, 1)
    assert(plays[0].offset >= 1.5 && plays[0].offset < 3, 'Reload resumes recording offset, not its beginning')
    const elapsed = await finished(page, id)
    await refreshAwards(page, 'completed scan restore')
    assert.equal(await page.locator('.ch2-scan-overlay').count(), 0)
    assert.equal(await page.evaluate(() => window.__sliceAudio.filter(row => row.event === 'play').length), 0, 'Completed scan does not replay sound')
    results.push({ kind: 'seeded-1.5s-refresh', id, mobile, beforeFrame, restoredFrame, resumedAudioOffset: plays[0].offset, immediateDisposedRehearsals, elapsed, fullPlaythrough: false })
    await test.close()
  }

  for (const fault of ['bad', 'slow']) {
    const id = 'c2n3_repeat_scan', test = await open(id, { fault }), { page } = test
    const before = await read(page)
    await start(page, id)
    await page.locator('[data-slice-ready="false"]').waitFor()
    assert.equal(await page.locator('.ch2-slice-atlas').evaluate(image => getComputedStyle(image).visibility), 'hidden')
    const preview = page.locator('[data-slice-preview="true"]')
    await preview.waitFor({ state: 'visible' })
    const previewInfo = await preview.evaluate(async image => {
      await image.decode()
      return { src: image.src, width: image.naturalWidth, height: image.naturalHeight }
    })
    assert.equal(previewInfo.src, getCh2SliceSequence(CH2_SCANS[id].sequence).preview, 'Fault fallback is this exact atlas inline first frame, not another image')
    assert(previewInfo.width > 0 && previewInfo.height > 0)
    assert.equal(await page.locator('[data-slice-ready="true"]').count(), 0, 'A visible low-res fallback is not accepted as loaded real-atlas animation')
    await page.locator('.ch2-slice-receiving').filter({ hasText: fault === 'bad' ? '低清预览 · 断层未载入' : '断层接收中' }).waitFor()
    await page.screenshot({ path: resolve(output, `${fault}-atlas-placeholder.png`) })
    const elapsed = await finished(page, id)
    assert(test.faultRequests() > 0, 'The actual registered asset request was intercepted')
    assert.equal((await read(page)).dlc.ch2.stepId, 'c2n3_m8')
    assert.deepEqual(economy(await read(page)), economy(before))
    results.push({ kind: `seeded-${fault}-atlas`, id, elapsed, requestActuallyIntercepted: true, inlineSameAtlasFirstFrameVisible: true,
      previewNotCountedAsAtlasReady: true, noForeignImageFallback: true, fullPlaythrough: false })
    await test.close()
  }

  {
    const id = 'c2n3_cta_scan', test = await open(id), { page, context } = test
    await start(page, id); await readyImage(page, getCh2SliceSequence(CH2_SCANS[id].sequence))
    const before = await read(page), cdp = await context.newCDPSession(page)
    await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: false })
    const other = await context.newPage(); await other.goto('about:blank'); await other.bringToFront()
    await page.waitForTimeout(150)
    const visibility = await page.evaluate(() => ({ state: document.visibilityState, focus: document.hasFocus() }))
    if (visibility.state !== 'hidden') {
      // Edge headless can expose inactive tabs as visible. Preserve this unmet
      // environmental check explicitly; never overwrite document.hidden or call it a pass.
      results.push({ kind: 'seeded-real-background-expiry', id, status: 'unsupported', visibility,
        reason: 'This browser exposes the inactive tab as visible; genuine visibilitychange was not testable.', fullPlaythrough: false })
    } else {
      const hiddenAt = Date.now()
      await page.waitForTimeout(Math.max(1, before.dlc.ch2.scanSessions[id].startedAt + 3300 - Date.now()))
      await page.bringToFront()
      await page.waitForFunction(({ key, id }) => JSON.parse(localStorage.getItem(key)).dlc.ch2.scanSessions[id].completed, { key: saveKey, id })
      assert.equal((await read(page)).dlc.ch2.scanSessions[id].startedAt, before.dlc.ch2.scanSessions[id].startedAt)
      assert.deepEqual(economy(await read(page)), economy(before))
      const audio = await page.evaluate(() => window.__sliceAudio)
      assert.equal((await recordingPlays(page)).plays.length, 1, 'An expired background scan never chases its sound on return')
      assert(audio.some(row => row.event === 'pause' && row.hidden), 'Actual backgrounding pauses the original recording')
      assert.equal(await page.locator('.ch2-scan-overlay').count(), 0)
      results.push({ kind: 'seeded-real-background-expiry', id, hiddenAt, actualVisibilityHidden: true, replayedAfterExpiry: false, fullPlaythrough: false })
    }
    await other.close(); await cdp.detach(); await test.close()
  }

  {
    const capability = await nativeLifecycleCapability()
    if (!capability.supported) {
      results.push({ kind: 'seeded-native-lifecycle-freeze-expiry', status: 'unsupported', capability,
        reason: 'The independent about:blank timer continues after the native frozen command; no game freeze assertion was counted as passed.',
        genuineTabVisibilityClaimed: false, fullPlaythrough: false })
    } else {
    const id = 'c2n3_cta_scan', test = await open(id), { page, context } = test
    const startedAt = await start(page, id)
    await readyImage(page, getCh2SliceSequence(CH2_SCANS[id].sequence))
    const before = await read(page), cdp = await context.newCDPSession(page)
    await page.evaluate(() => { window.__lifecycleTicks = 0; window.__lifecycleProbe = setInterval(() => window.__lifecycleTicks++, 20) })
    await cdp.send('Page.setWebLifecycleState', { state: 'frozen' })
    const frozenTicks = await page.evaluate(() => window.__lifecycleTicks)
    await page.waitForTimeout(Math.max(1, startedAt + 3300 - Date.now()))
    assert.equal(await page.evaluate(() => window.__lifecycleTicks), frozenTicks, 'Native browser lifecycle freezing actually stops timers')
    assert.equal(!!(await read(page)).dlc.ch2.scanSessions[id].completed, false, 'Frozen timer did not secretly continue in the fixture')
    const frozenVisibility = await page.evaluate(() => document.visibilityState)
    await cdp.send('Page.setWebLifecycleState', { state: 'active' })
    const elapsed = await finished(page, id)
    assert.equal((await read(page)).dlc.ch2.scanSessions[id].startedAt, startedAt)
    assert.deepEqual(economy(await read(page)), economy(before))
    assert.equal((await recordingPlays(page)).plays.length, 1, 'Resuming an expired frozen scan never restarts its recording')
    await page.evaluate(() => clearInterval(window.__lifecycleProbe))
    results.push({ kind: 'seeded-native-lifecycle-freeze-expiry', id, elapsed, actualTimerFrozen: true, frozenVisibility,
      replayedAfterExpiry: false, genuineTabVisibilityClaimed: false, fullPlaythrough: false })
    await cdp.detach(); await test.close()
    }
  }

  {
    const id = 'c2n1_m7', test = await open(id, { viewport: { width: 844, height: 390 }, reducedMotion: 'reduce' }), { page } = test
    const sequence = getCh2SliceSequence(CH2_SCANS[id].sequence)
    await start(page, id); await readyImage(page, sequence); await layout(page, CH2_SCANS[id])
    assert.equal(Number(await page.locator('[data-slice-frame]').getAttribute('data-slice-frame')), Math.floor(sequence.frameCount / 2))
    await page.screenshot({ path: resolve(output, 'short-landscape-reduced-motion.png') })
    const elapsed = await finished(page, id), samples = await page.evaluate(() => window.__sliceSamples)
    checkSamples(samples, CH2_SCANS[id], true)
    results.push({ kind: 'seeded-short-landscape-reduced-motion', id, elapsed, staticMiddleFrame: true, fullPlaythrough: false })
    await test.close()
  }
  assert.equal(results.length, 39)
  const unsupported = results.filter(row => row.status === 'unsupported')
  assert(unsupported.length <= 2 && unsupported.every(row => ['seeded-real-background-expiry', 'seeded-native-lifecycle-freeze-expiry'].includes(row.kind)))
  const independentAudioChecks = [await nativeAudioCleanupProbe(false), await nativeAudioCleanupProbe(true)]
  assert.deepEqual(errors, [])
  assert.deepEqual(networkFailures.filter(row => !row.expected), [])
  writeFileSync(resolve(output, 'results.json'), JSON.stringify({ gameURL, results, errors, httpAssets, audio, networkFailures,
    fixtureSavesExplicit: true, fullPlaythroughClaimed: false, playerProfileUsed: false, audioPlaybackDeliberatelyRejected: true,
    syntheticAtlasUsed: false, sourceClinicalSuitabilityNotEstablishedByPixelHash: true,
    passedScenarios: results.length - unsupported.length, unsupported, independentAudioChecks }, null, 2))
  console.log(`PASS slice browser: ${results.length - unsupported.length} executed seeded scenarios plus 2 independent real delayed-audio cleanup checks; ${unsupported.length} explicitly environment-unsupported background/lifecycle probes. Unsupported probes are not claimed as passed. Original recording HTTP SHA/decode verified; fixture saves only, not a chapter playthrough.`)
} catch (error) {
  if (activePage && !activePage.isClosed()) await activePage.screenshot({ path: resolve(output, 'failure.png') }).catch(() => {})
  writeFileSync(resolve(output, 'failure.json'), JSON.stringify({ message: error.message, stack: error.stack, results, errors, networkFailures, httpAssets,
    fixtureSavesExplicit: true, fullPlaythroughClaimed: false, syntheticAtlasUsed: false }, null, 2))
  throw error
} finally { await browser.close() }
