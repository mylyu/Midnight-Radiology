// Disposable context; isolated component mount never edits a real player save.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const baseURL = process.env.GAME_URL || 'http://127.0.0.1:8798/'
const output = process.env.SCAN_OUTPUT || '../../ch2-loop-scan-review'
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const errors = []
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 } })
    await context.addInitScript(() => {
      window.__scanSound = []
      HTMLMediaElement.prototype.play = function () {
        window.__scanSound.push(this.src)
        return Promise.reject(new DOMException('Test audio rejection', 'NotAllowedError'))
      }
    })
    const page = await context.newPage()
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(baseURL)
    await page.evaluate(async () => {
      const reactModule = await import('/node_modules/.vite/deps/react.js')
      const domModule = await import('/node_modules/.vite/deps/react-dom_client.js')
      const React = reactModule.default ?? reactModule
      const ReactDOM = domModule.default ?? domModule
      const { Ch2ScanOverlay } = await import('/src/components/Ch2ScanOverlay.tsx')
      const { CH2_SCANS } = await import('/src/game/ch2-scans.ts')
      const mount = document.createElement('div')
      document.body.append(mount)
      const root = ReactDOM.createRoot(mount)
      window.__scanStats = { done: 0, skip: 0, leak: 0 }
      window.__mountScan = (id, startedAt = Date.now()) => {
        root.render(React.createElement('div', { onClick: () => window.__scanStats.leak++ }, React.createElement(Ch2ScanOverlay, {
          key: id + startedAt, config: CH2_SCANS[id], startedAt,
          onDone: () => { window.__scanStats.done++; root.render(null) },
          onSkip: () => { window.__scanStats.skip++; root.render(null) },
        })))
      }
      window.__mountScan('c2n1_m7')
    })
    await page.getByRole('dialog', { name: '头颅平扫' }).waitFor()
    await page.waitForTimeout(1150)
    assert.equal(await page.locator('.ch2-scan-overlay').getAttribute('data-scan-phase'), 'acquire')
    const box = await page.locator('.ch2-scan-panel').boundingBox()
    assert(box.x >= 0 && box.x + box.width <= page.viewportSize().width)
    assert(box.y >= 0 && box.y + box.height <= page.viewportSize().height)
    await page.screenshot({ path: `${output}/${mobile ? 'mobile' : 'desktop'}-acquisition.png` })
    await page.getByRole('button', { name: '跳过演出', exact: true }).click()
    await page.locator('.ch2-scan-overlay').waitFor({ state: 'detached' })
    assert.deepEqual(await page.evaluate(() => window.__scanStats), { done: 0, skip: 1, leak: 0 })
    assert((await page.evaluate(() => window.__scanSound)).some(src => src.includes('motor_loop')))

    await page.evaluate(() => { window.__scanSound = []; window.__mountScan('c2n3_coronary_volume') })
    await page.getByRole('dialog', { name: '冠脉三维重建' }).waitFor()
    await page.screenshot({ path: `${output}/${mobile ? 'mobile' : 'desktop'}-reconstruction.png` })
    await page.locator('.ch2-scan-overlay').waitFor({ state: 'detached' })
    assert.equal(await page.evaluate(() => window.__scanStats.done), 1)
    assert(!(await page.evaluate(() => window.__scanSound)).some(src => src.includes('motor_loop')), 'No acquisition motor during reconstruction')

    await page.evaluate(() => window.__mountScan('c2n1_p_scan', Date.now() - 9000))
    await page.waitForFunction(() => window.__scanStats.done === 2)
    await page.waitForTimeout(200)
    assert.equal(await page.evaluate(() => window.__scanStats.done), 2, 'Restored overdue scan completes once')

    await page.evaluate(() => window.__mountScan('c2n3_m5'))
    await page.locator('.ch2-scan-overlay').waitFor()
    await page.getByRole('button', { name: '关闭设备声', exact: true }).click()
    await page.getByRole('button', { name: '设备声已关闭', exact: true }).waitFor()
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
    await page.locator('.ch2-scan-overlay').waitFor({ state: 'detached', timeout: 7000 })
    assert.deepEqual(await page.evaluate(() => window.__scanStats), { done: 3, skip: 1, leak: 0 })
    await context.close()
  }
  assert.deepEqual(errors, [])
  console.log('PASS scan overlay desktop/390px, no click-through, skip, denied audio, no exposure sound in reconstruction, overdue restore, visibility and mute, completion once.')
} finally { await browser.close() }
