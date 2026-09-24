// Isolated browser profiles; never opens or changes the user's saved game.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true })
const base = process.env.IMAGE_TEST_URL || process.env.GAME_URL || 'http://127.0.0.1:8801/'
const output = resolve(process.env.IMAGE_OUTPUT || '../../image-delivery-review')
const results = []
mkdirSync(output, { recursive: true })
try {
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    const page = await context.newPage(), cdp = await context.newCDPSession(page), assets = [], errors = []
    await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 128 * 1024, uploadThroughput: 64 * 1024 })
    page.on('request', request => { if (/\/assets\/.*\.(png|webp)/.test(request.url())) assets.push(request.url()) })
    page.on('pageerror', error => errors.push(error.message))
    const start = Date.now()
    await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 90000 })
    await page.locator('[data-scene-background="bg_title"]').waitFor({ timeout: 45000 })
    assert.equal(assets.length, 1); assert.match(assets[0], /bg_title/); assert.deepEqual(errors, [])
    await page.screenshot({ path: resolve(output, 'cold-title.png') })
    results.push({ test: 'cold-cache-1mbps-title', milliseconds: Date.now() - start, assets, errors })
    await context.close()
  }
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } }), page = await context.newPage()
    let blocked = true, attempts = 0
    await page.route(/\/assets\/.*bg_title.*\.(png|webp)/, route => { attempts++; return blocked ? route.abort('failed') : route.continue() })
    await page.goto(base)
    await page.locator('[data-scene-load-status="error"]').waitFor({ timeout: 15000 })
    assert.equal(attempts, 3)
    assert.equal(await page.getByRole('button', { name: '▶ 开始游戏', exact: true }).count(), 1)
    const before = await page.evaluate(() => ({ ...localStorage }))
    blocked = false
    await page.getByRole('button', { name: '重试背景', exact: true }).click()
    await page.locator('[data-scene-background="bg_title"]').waitFor({ timeout: 15000 })
    assert.deepEqual(await page.evaluate(() => ({ ...localStorage })), before)
    assert.equal(attempts, 4)
    results.push({ test: 'mobile-fail-bounded-retry-manual-recovery', attempts })
    await context.close()
  }
  {
    const context = await browser.newContext(), page = await context.newPage()
    let attempts = 0
    await page.clock.install()
    await page.route(/\/assets\/.*bg_title.*\.(png|webp)/, () => { attempts++ })
    await page.goto(base, { waitUntil: 'domcontentloaded' })
    await page.locator('[data-scene-load-status="loading"]').waitFor()
    for (let i = 0; i < 3; i++) { await page.clock.runFor(21000); await page.waitForTimeout(100) }
    await page.clock.runFor(2500)
    await page.locator('[data-scene-load-status="error"]').waitFor()
    assert.equal(attempts, 3)
    await page.getByRole('button', { name: '▶ 开始游戏', exact: true }).click()
    await page.locator('[data-scene-background="bg_control"]').waitFor({ timeout: 15000 })
    await page.clock.runFor(65000)
    assert.equal(attempts, 3)
    results.push({ test: 'stalled-image-deadline-no-story-lock-no-late-retry', attempts })
    await context.close()
  }
  {
    const context = await browser.newContext(), page = await context.newPage()
    let attempts = 0
    page.on('request', request => { if (/\/assets\/.*bg_title.*\.(png|webp)/.test(request.url())) attempts++ })
    // Reproduce the edge between body completion and registering the decoder's abort listener.
    await context.addInitScript(() => {
      const NativeController = AbortController, controllers = new WeakMap()
      globalThis.AbortController = class extends NativeController {
        constructor() { super(); controllers.set(this.signal, this) }
      }
      const nativeFetch = fetch.bind(globalThis)
      globalThis.fetch = async (url, options) => {
        const response = await nativeFetch(url, options)
        if (String(url).includes('bg_title')) {
          const nativeBlob = response.blob.bind(response)
          response.blob = async () => { const blob = await nativeBlob(); controllers.get(options?.signal)?.abort(); return blob }
        }
        return response
      }
      HTMLImageElement.prototype.decode = () => new Promise(() => {})
    })
    await page.goto(base)
    await page.locator('[data-scene-load-status="error"]').waitFor({ timeout: 15000 })
    assert.equal(attempts, 3)
    results.push({ test: 'already-aborted-before-decode-does-not-hang', attempts })
    await context.close()
  }
} finally { await browser.close() }
writeFileSync(resolve(output, 'results.json'), JSON.stringify({ base, results }, null, 2))
console.log(JSON.stringify(results, null, 2))
