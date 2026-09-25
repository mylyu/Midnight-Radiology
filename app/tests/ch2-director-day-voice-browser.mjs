// Isolated single-node production smoke test, not a full chapter walkthrough.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { freshState } from '../src/game/store.ts'
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright')
const url = process.env.GAME_URL || 'http://127.0.0.1:8805/'
const filename = 'vox_ch2_natural_director_day_v3.mp3'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext()
const page = await context.newPage(), errors = []
page.on('pageerror', error => errors.push(error.message))
try {
  const s = { ...freshState('m'), dlc: { ch2: { shift: 'c2d2', phase: 'story', stepId: 'c2d2_1', appliedSteps: ['ch2-c2d2_1'], viewBg: 'bg_ctcontrol_day' } } }
  await context.addInitScript(s => {
    localStorage.setItem('midnight-radiology-save-v1', JSON.stringify(s))
    localStorage.setItem('mr-ch2-unlock', '1')
    window.__voicePlayed = []
    const play = HTMLMediaElement.prototype.play
    HTMLMediaElement.prototype.play = function () {
      const row = { src: this.src, volume: this.volume, started: false }
      window.__voicePlayed.push(row)
      this.addEventListener('playing', () => { row.started = true; row.duration = this.duration }, { once: true })
      return play.call(this)
    }
  }, s)
  await page.goto(url + '#/ch2')
  await page.locator('[data-ch2-step="c2d2_1"]').waitFor()
  await page.locator('.dialog-box > p').click()
  await page.waitForFunction(() => document.querySelector('.dialog-box > p')?.textContent.startsWith('年轻人，白班动作要快！'))
  await page.waitForFunction(name => window.__voicePlayed.some(row => row.src.includes(name) && row.started), filename)
  const played = await page.evaluate(name => window.__voicePlayed.find(row => row.src.includes(name) && row.started), filename)
  assert.equal(played.volume, .45)
  assert(played.duration > 2.7 && played.duration < 3.5)
  assert.equal((await page.request.get(played.src)).status(), 200)
  await page.waitForTimeout(310)
  await page.locator('.dialog-box > p').click()
  await page.locator('[data-ch2-step="c2d2_reg0"]').waitFor()
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ passed: true, url, played, next: 'c2d2_reg0', pageErrors: errors }, null, 2))
} finally { await context.close(); await browser.close() }
