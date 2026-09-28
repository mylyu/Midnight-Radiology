// One unchanged second-chapter consumer of the shared overlay, not a chapter replay.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { freshState } from '../src/game/store.ts'

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const key = 'midnight-radiology-save-v1', output = resolve('../../ldct-scan-review')
mkdirSync(output, { recursive: true })
const state = { ...freshState('m'), finished: true, gold: 750, skill: 9, heart: 4,
  dlc: { ldct: { untouched: 'preserve LDCT slot' }, dsa: { dose: 42 }, ch2: {
    shift: 'c2n1', stepId: 'c2n1_m7', phase: 'story', done: false, appliedSteps: [], viewBg: 'bg_ctcontrol',
  } } }
try {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } })
  await context.addInitScript(({ key, state }) => {
    localStorage.setItem(key, JSON.stringify(state)); localStorage.setItem('mr-ch2-unlock', '1')
    window.__ch2DefaultAudio = []
    HTMLMediaElement.prototype.play = function () {
      window.__ch2DefaultAudio.push({ src: this.src, volume: this.volume, loop: this.loop })
      return Promise.reject(new DOMException('scoped default overlay check', 'NotAllowedError'))
    }
    HTMLMediaElement.prototype.pause = function () {}
  }, { key, state })
  const page = await context.newPage(), errors = [], missing = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('response', response => { if (response.status() >= 400) missing.push(response.url()) })
  await page.goto((process.env.GAME_URL || 'http://127.0.0.1:8798/') + '#/ch2')
  await page.locator('[data-chapter-enter]').click({ timeout: 30000 })
  const overlay = page.locator('[data-scan-id="c2n1_m7"]')
  await overlay.waitFor()
  assert.equal(await overlay.getAttribute('data-scan-presentation'), 'dual')
  assert.equal(await overlay.locator('.ch2-ct-motion').getAttribute('aria-label'), '检查床与患者沿固定轨道缓缓驶入CT机架')
  await overlay.locator('[data-ct-motion-ready="true"]').waitFor()
  const bed = overlay.locator('.ch2-ct-sliding-bed')
  assert.match(await bed.getAttribute('src'), /^blob:/)
  assert.equal(await bed.evaluate(element => element.style.getPropertyValue('--ct-subject-fit')), '', 'default patient has no LDCT phantom fitting transform')
  await overlay.locator('[data-slice-sequence="c2n1_m7"][data-slice-ready="true"]').waitFor()
  assert.equal(await overlay.locator('[data-slice-sequence="ldct-father-chest"]').count(), 0)
  await page.screenshot({ path: resolve(output, 'ch2-default-acquire.png') })
  const startedAt = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).dlc.ch2.scanSessions.c2n1_m7.startedAt, key)
  await overlay.waitFor({ state: 'detached', timeout: 5000 })
  assert(Date.now() - startedAt >= 3000)
  const final = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)
  assert.equal(final.dlc.ch2.scanSessions.c2n1_m7.completed, true)
  assert.deepEqual(final.dlc.ldct, state.dlc.ldct)
  assert.deepEqual(final.dlc.dsa, state.dlc.dsa)
  for (const name of ['gold', 'skill', 'heart', 'wealth']) assert.equal(final[name], state[name])
  const audio = await page.evaluate(() => window.__ch2DefaultAudio.filter(event => event.volume === .24))
  assert.equal(audio.length, 1); assert.equal(audio[0].loop, false)
  assert.deepEqual(errors, []); assert.deepEqual(missing, [])
  console.log('PASS one unchanged Ch2 default overlay: original patient, original head slices, 3s clock, rejected audio, no LDCT adapter/state leak.')
} finally { await browser.close() }
