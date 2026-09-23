// Disposable context; isolated component mount never edits a real player save.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync, readFileSync } from 'node:fs'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const baseURL = process.env.GAME_URL || 'http://127.0.0.1:8798/'
const output = process.env.SCAN_OUTPUT || '../../ch2-real-scan-review'
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const errors = []
const audioRecord = JSON.parse(readFileSync('../docs/ch2-real-ct-audio.json', 'utf8'))
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 } })
    await context.addInitScript(() => {
      window.__scanSound = []
      HTMLMediaElement.prototype.play = function () {
        window.__scanSound.push({ src: this.src, loop: this.loop, at: this.currentTime })
        return Promise.reject(new DOMException('Test audio rejection', 'NotAllowedError'))
      }
    })
    const page = await context.newPage()
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(baseURL)
    // Actual HTTP bytes and browser decoding, separate from the denied-play interaction fixture.
    // This is a technical integrity check, not a claim that a human listened to it.
    const decoded = await page.evaluate(async path => {
      const response = await fetch(path)
      if (!response.ok) throw new Error(`Missing audio: ${response.status}`)
      const bytes = await response.arrayBuffer()
      const digest = await crypto.subtle.digest('SHA-256', bytes)
      const hash = Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('')
      const context = new OfflineAudioContext(1, 1, 24000)
      const audio = await context.decodeAudioData(bytes.slice(0))
      return { hash, duration: audio.duration, channels: audio.numberOfChannels, sampleRate: audio.sampleRate }
    }, new URL('audio/ch2_ct_real_scan_20260924.mp3', baseURL).href)
    assert.equal(decoded.hash, audioRecord.sha256)
    assert(Math.abs(decoded.duration - 3) < 0.002, 'Browser decodes the actual supplied excerpt as exactly three seconds')
    assert.equal(decoded.channels, 1); assert.equal(decoded.sampleRate, 24000)
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
    await page.locator('.ch2-scan-room').waitFor()
    await page.waitForFunction(() => document.querySelector('.ch2-scan-room')?.naturalWidth > 0)
    await page.waitForTimeout(1150)
    assert.equal(await page.locator('.ch2-scan-overlay').getAttribute('data-scan-phase'), 'acquire')
    const box = await page.locator('.ch2-scan-panel').boundingBox()
    assert(box.x >= 0 && box.x + box.width <= page.viewportSize().width)
    assert(box.y >= 0 && box.y + box.height <= page.viewportSize().height)
    await page.screenshot({ path: `${output}/${mobile ? 'mobile' : 'desktop'}-acquisition.png` })
    await page.getByRole('button', { name: '跳过演出', exact: true }).click()
    await page.locator('.ch2-scan-overlay').waitFor({ state: 'detached' })
    assert.deepEqual(await page.evaluate(() => window.__scanStats), { done: 0, skip: 1, leak: 0 })
    const firstAudio = await page.evaluate(() => window.__scanSound)
    assert.equal(firstAudio.length, 1, 'One recording starts once, without a loop or extra ready click')
    assert(firstAudio[0].src.includes('ch2_ct_real_scan_20260924'))
    assert.equal(firstAudio[0].loop, false)

    await page.evaluate(() => { window.__scanSound = []; window.__mountScan('c2n3_coronary_volume') })
    await page.getByRole('dialog', { name: '冠脉三维重建' }).waitFor()
    await page.screenshot({ path: `${output}/${mobile ? 'mobile' : 'desktop'}-reconstruction.png` })
    await page.locator('.ch2-scan-overlay').waitFor({ state: 'detached' })
    assert.equal(await page.evaluate(() => window.__scanStats.done), 1)
    assert.deepEqual(await page.evaluate(() => window.__scanSound), [], 'Pure reconstruction never plays exposure or a synthetic ready click')

    await page.evaluate(() => window.__mountScan('c2n1_p_scan', Date.now() - 9000))
    await page.waitForFunction(() => window.__scanStats.done === 2)
    await page.waitForTimeout(200)
    assert.equal(await page.evaluate(() => window.__scanStats.done), 2, 'Restored overdue scan completes once')

    const start = Date.now()
    await page.evaluate(() => window.__mountScan('c2n3_m5'))
    await page.locator('.ch2-scan-overlay').waitFor()
    await page.getByRole('button', { name: '关闭设备声', exact: true }).click()
    await page.getByRole('button', { name: '设备声已关闭', exact: true }).waitFor()
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
    await page.locator('.ch2-scan-overlay').waitFor({ state: 'detached', timeout: 4500 })
    assert(Date.now() - start < 4200, 'Default acquisition completes in roughly three seconds, not five')
    assert.deepEqual(await page.evaluate(() => window.__scanStats), { done: 3, skip: 1, leak: 0 })
    await page.evaluate(() => { window.__scanSound = []; window.__mountScan('c2n1_m7', Date.now() - 1700) })
    await page.locator('.ch2-scan-overlay').waitFor()
    const restoredAudio = await page.evaluate(() => window.__scanSound)
    assert.equal(restoredAudio.length, 1)
    assert(restoredAudio[0].at >= 1.7 && restoredAudio[0].at < 2.2, 'Reload resumes the clip at elapsed time, never from its start')
    await page.locator('.ch2-scan-overlay').waitFor({ state: 'detached', timeout: 2000 })
    assert.equal(await page.evaluate(() => window.__scanStats.done), 4)
    await context.close()
  }
  assert.deepEqual(errors, [])
  console.log('PASS actual recording HTTP hash and browser decode (3s/24kHz/mono); real pixel-room scan desktop/390px, one-shot recording, no extra clicks/reconstruction sounds, seek on restore, no click-through, skip, denied audio, visibility and mute, completion once.')
} finally { await browser.close() }
