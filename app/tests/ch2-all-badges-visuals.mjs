// Render the completed save exported by an actually passed all-badges run.
// This is supplemental visual verification, not a substitute for that UI journey.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { CH2_ACTIVE_BADGES } from '../src/game/ch2.ts'
const path = resolve(process.env.ALL_BADGES_REPORT || '../../ch2-all-badges-fresh-review/female-curious-result.json')
const report = JSON.parse(readFileSync(path, 'utf8')), state = report.second.state
assert(state.dlc.ch2.done)
assert.deepEqual(CH2_ACTIVE_BADGES.filter(id => !state.badges.includes(id)), [])
assert.deepEqual(report.errors, []); assert.deepEqual(report.networkFailures, [])
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } })
await context.addInitScript(state => {
  localStorage.setItem('midnight-radiology-save-v1', JSON.stringify(state))
  localStorage.setItem('mr-ch2-unlock', '1')
}, state)
const page = await context.newPage(), errors = []
page.on('pageerror', error => errors.push(error.message))
try {
  await page.goto((process.env.GAME_URL || 'http://127.0.0.1:8798/') + '#/ch2')
  await page.locator('[data-ch2-settlement] [data-scene-background="bg_ctcontrol_day_ready"]').waitFor()
  await page.locator('[data-ch2-settlement] [data-scene-load-status]').waitFor({ state: 'detached' })
  await page.waitForFunction(() => [...document.querySelectorAll('[data-ch2-settlement] img')].every(img => img.complete && img.naturalWidth > 0))
  await page.screenshot({ path: resolve(dirname(path), 'female-curious-ch2-end-loaded.png') })
  await page.getByRole('button', { name: '🏅 勋章墙', exact: true }).click()
  await page.getByText('已收集 15/15', { exact: false }).waitFor()
  await page.screenshot({ path: resolve(dirname(path), 'female-curious-badge-wall.png') })
  assert.deepEqual(errors, [])
  console.log('PASS completed all-badges visual: decoded background/gifts, actual 15/15 wall', dirname(path))
} finally { await browser.close() }
