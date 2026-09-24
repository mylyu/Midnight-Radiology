// Native Edge media lifecycle checks. No play()/pause() stubs, no user's browser.
// This observes browser events; it does not claim a human listened to the sound.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { CH2_SHIFTS, ch2StepForState } from '../src/game/ch2.ts'
import { freshState } from '../src/game/store.ts'

const require = createRequire(import.meta.url)
const modulePath = process.env.PLAYWRIGHT_MODULE || 'C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
assert(existsSync(modulePath), `Playwright runtime not found: ${modulePath}`)
const { chromium } = require(modulePath)
const browser = await chromium.launch({ channel: 'msedge', headless: true,
  // Exercise native successful playback deterministically, independent of MEI.
  args: ['--autoplay-policy=no-user-gesture-required'] })
const output = resolve(process.env.MYSTERY_OUTPUT || '../../ch2-mystery-review')
mkdirSync(output, { recursive: true })
const url = (process.env.GAME_URL || 'http://127.0.0.1:8798/').replace(/\/$/, '') + '/#/ch2'
const cueId = 'c2n5_terminal_receipt'
const mediaPattern = /\/audio\/ch2_terminal_(alarm|receipt)_v1\.mp3(?:\?|$)/
const report = { browser: await browser.version(), gameUrl: url, nativePlay: true,
  autoplayPolicy: 'no-user-gesture-required', humanListened: false,
  scope: 'Native playback lifecycle, cancellation and persistence only; not a performance/voice-quality review.',
  cases: [], errors: [] }
const active = new Set()
let releaseDelayedResponse = () => {}
const deadline = (promise, milliseconds, label) => new Promise((resolveResult, reject) => {
  const timer = setTimeout(() => reject(new Error(`Timed out: ${label}`)), milliseconds)
  promise.then(value => { clearTimeout(timer); resolveResult(value) }, error => { clearTimeout(timer); reject(error) })
})
const read = page => page.evaluate(() => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')))
const events = page => page.evaluate(() => JSON.parse(sessionStorage.getItem('terminal-native-events') || '[]'))
const mediaState = page => page.evaluate(() => window.__terminalNativeAudio.map(audio => ({
  src: audio.src, paused: audio.paused, ended: audio.ended,
  readyState: audio.readyState, networkState: audio.networkState, currentTime: audio.currentTime,
})))

async function open({ quiet = false, intercept } = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  active.add(context)
  const save = { ...freshState('m'), finished: true, ap: 3,
    flags: { quiz_grade: 'A', c2_terminal_key_pressed: true, c2_terminal_alarm_heard: true, c2_terminal_stopped: true },
    dlc: { ch2: { shift: 'c2n5', stepId: cueId, phase: 'story', viewBg: 'bg_ctcontrol' } } }
  await context.addInitScript(({ save, quiet }) => {
    localStorage.setItem('mr-ch2-unlock', '1')
    if (!localStorage.getItem('midnight-radiology-save-v1')) {
      localStorage.setItem('midnight-radiology-save-v1', JSON.stringify(save))
      localStorage.setItem('midnight-radiology-ch2-terminal-muted-v1', quiet ? '1' : '0')
    }
    const log = (type, audio, detail) => {
      const rows = JSON.parse(sessionStorage.getItem('terminal-native-events') || '[]')
      rows.push({ type, src: audio?.src, paused: audio?.paused, readyState: audio?.readyState,
        currentTime: audio?.currentTime, at: performance.timeOrigin + performance.now(),
        step: document.querySelector('[data-ch2-step]')?.dataset.ch2Step, detail })
      sessionStorage.setItem('terminal-native-events', JSON.stringify(rows))
    }
    window.__terminalNativeAudio = []
    // Instrument construction only: all playback, loading and cancellation stay native.
    const NativeAudio = window.Audio
    window.Audio = new Proxy(NativeAudio, { construct(target, args) {
      const audio = Reflect.construct(target, args)
      if (/ch2_terminal_(alarm|receipt)_v1\.mp3/.test(audio.src)) {
        window.__terminalNativeAudio.push(audio)
        log('constructed', audio)
        for (const type of ['loadstart', 'loadedmetadata', 'loadeddata', 'canplay', 'play', 'playing',
          'pause', 'waiting', 'stalled', 'suspend', 'abort', 'error', 'ended']) {
          audio.addEventListener(type, () => log(type, audio, audio.error?.message))
        }
      }
      return audio
    } })
    addEventListener('unhandledrejection', event => log('unhandledrejection', null, String(event.reason)))
  }, { save, quiet })
  const page = await context.newPage()
  page.setDefaultTimeout(9000)
  const requests = []
  page.on('request', request => { if (mediaPattern.test(request.url())) requests.push(request.url()) })
  page.on('pageerror', error => report.errors.push(error.message))
  if (intercept) await page.route(mediaPattern, intercept)
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.locator(`[data-ch2-step="${cueId}"]`).waitFor()
  await page.waitForFunction(id => JSON.parse(localStorage.getItem('midnight-radiology-save-v1'))
    .flags[`c2_terminal_sound_${id}`], cueId)
  return { context, page, requests }
}

async function advance(page) {
  const state = await read(page), id = state.dlc.ch2.stepId
  const raw = CH2_SHIFTS.find(shift => shift.id === 'c2n5').steps[id]
  const step = ch2StepForState(id, raw, state)
  assert(step.next && !step.choices, `${id}: expected an ordinary dialogue continuation`)
  const expected = step.text.replaceAll('**', '')
  const dialog = page.locator('.dialog-box > p')
  if (await dialog.textContent() !== expected) await dialog.click()
  await page.waitForFunction(text => document.querySelector('.dialog-box > p')?.textContent === text, expected)
  await page.locator('.dialog-box > span.animate-bounce').waitFor()
  await dialog.click()
  await page.locator(`[data-ch2-step="${step.next}"]`).waitFor()
  return step.next
}
async function close(context) { active.delete(context); await context.close() }
const assertClean = rows => assert(!rows.some(row => ['unhandledrejection', 'error'].includes(row.type)),
  'No unhandled rejection or native decoding error is allowed')

try {
  // Buffer the real response, but do not deliver it until after the cue unmounts.
  let arrived
  const gate = new Promise(resolveGate => { releaseDelayedResponse = resolveGate })
  const fetched = new Promise(resolveFetched => { arrived = resolveFetched })
  const routeResults = []
  const pending = await open({ intercept: async route => {
    try {
      const response = await route.fetch()
      arrived()
      await gate
      await route.fulfill({ response })
      routeResults.push({ status: response.status(), released: true })
    } catch (error) { routeResults.push({ error: String(error) }); arrived() }
  } })
  await deadline(fetched, 9000, 'native media request reaching the delayed-response route')
  await pending.page.waitForFunction(() => window.__terminalNativeAudio.length === 1)
  assert.equal((await events(pending.page)).filter(row => row.type === 'playing').length, 0)
  assert((await mediaState(pending.page))[0].readyState < 2, 'The audio must still be awaiting the withheld bytes')
  const next = await advance(pending.page)
  assert.equal(next, 'c2n5_terminal_screen', 'An unfinished audio load must not lock the dialogue')
  await pending.page.waitForFunction(() => window.__terminalNativeAudio[0].paused)
  releaseDelayedResponse()
  await pending.page.waitForFunction(() => window.__terminalNativeAudio[0].readyState >= 2)
  // Longer than the full receipt file: neither completion nor a later gesture may restart it.
  await pending.page.waitForTimeout(2600)
  await pending.page.locator('.dialog-box > p').click()
  await pending.page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await pending.page.waitForTimeout(250)
  const raceEvents = await events(pending.page), raceMedia = await mediaState(pending.page)
  assert.equal(raceEvents.filter(row => row.type === 'playing').length, 0, 'Late audio must never start after its node is gone')
  assert(raceEvents.some(row => ['pause', 'abort'].includes(row.type)), 'The in-flight native player must be stopped')
  assert(raceMedia.every(audio => audio.paused && audio.currentTime === 0))
  assertClean(raceEvents)
  assert.equal(routeResults.length, 1)
  assert(routeResults[0].released && !routeResults[0].error)
  report.cases.push({ name: 'delayed-response-after-leaving', passed: true, requests: pending.requests,
    routeResults, media: raceMedia, events: raceEvents })
  console.log('PASS native delayed response: advancing pauses pending media; completed load never starts after leaving or focus/gesture.')
  await close(pending.context)

  const normal = await open()
  await normal.page.waitForFunction(() => JSON.parse(sessionStorage.getItem('terminal-native-events') || '[]').some(row => row.type === 'ended'))
  const before = await events(normal.page), beforeRequestCount = normal.requests.length
  assert.equal(before.filter(row => row.type === 'constructed').length, 1, 'StrictMode must not construct twice')
  assert.equal(before.filter(row => row.type === 'playing').length, 1, 'Native audio must actually start once')
  assert.equal(before.filter(row => row.type === 'ended').length, 1)
  assertClean(before)
  await normal.page.reload({ waitUntil: 'domcontentloaded' })
  await normal.page.locator(`[data-ch2-step="${cueId}"]`).waitFor()
  await normal.page.waitForTimeout(500)
  const after = await events(normal.page)
  assert.deepEqual(after, before, 'Restoring the consumed cue must not construct or replay audio')
  assert.equal(normal.requests.length, beforeRequestCount, 'Consumed cue must not request media on refresh')
  assert.equal(await advance(normal.page), 'c2n5_terminal_screen')
  report.cases.push({ name: 'native-once-then-refresh', passed: true, requests: normal.requests, events: after })
  console.log('PASS native normal playback: exactly one playing/ended pair under StrictMode; refresh requests/plays nothing.')
  await close(normal.context)

  const muted = await open({ quiet: true })
  await muted.page.waitForTimeout(500)
  assert.deepEqual(await events(muted.page), [])
  assert.equal(muted.requests.length, 0, 'Muted entry must not even request the media file')
  await muted.page.getByRole('button', { name: '盒子音效静音', exact: true }).click()
  await muted.page.waitForTimeout(250)
  assert.equal(muted.requests.length, 0, 'Unmuting is not a request to replay a consumed cue')
  assert.equal(await advance(muted.page), 'c2n5_terminal_screen')
  assert.deepEqual(await events(muted.page), [])
  report.cases.push({ name: 'muted-no-request-no-late-unmute', passed: true, requests: muted.requests, events: [] })
  console.log('PASS native muted path: zero media constructions/requests; unmuting cannot backfill the consumed sound.')
  await close(muted.context)
  assert.deepEqual(report.errors, [])
  report.passed = true
} catch (error) {
  report.passed = false
  report.failure = error.stack || String(error)
  throw error
} finally {
  releaseDelayedResponse()
  for (const context of active) await context.close()
  await browser.close()
  writeFileSync(resolve(output, 'audio-race.json'), JSON.stringify(report, null, 2) + '\n')
}
