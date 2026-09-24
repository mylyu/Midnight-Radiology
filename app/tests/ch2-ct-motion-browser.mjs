// Isolated presentation fixture: no existing user save is touched.
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { logicalImageUrl } from './game-delivery-media.mjs'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const baseURL = process.env.GAME_URL || 'http://127.0.0.1:8798/'
const output = process.env.CT_MOTION_OUTPUT || '../../ch2-ct-motion-review'
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const errors = []
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 } })
    const page = await context.newPage()
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(baseURL)
    await page.evaluate(async () => {
      const reactModule = await import('/node_modules/.vite/deps/react.js')
      const domModule = await import('/node_modules/.vite/deps/react-dom_client.js')
      const React = reactModule.default ?? reactModule
      const ReactDOM = domModule.default ?? domModule
      const { Ch2CtMotion } = await import('/src/components/Ch2CtMotion.tsx')
      await import('/src/components/Ch2ScanOverlay.tsx') // The production stylesheet, not a fixture imitation.
      const mount = document.createElement('div')
      mount.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#091322;display:grid;place-items:center;padding:14px'
      document.body.append(mount)
      const root = ReactDOM.createRoot(mount)
      window.__ctMotionSet = (progress, key = 'same-scan') => root.render(React.createElement('div', {
        className: 'ch2-scan-device', style: { maxWidth: '820px' },
      }, React.createElement(Ch2CtMotion, { key, progress })))
      window.__ctMotionSet(0)
    })
    await page.locator('[data-ct-motion-ready="true"]').waitFor()
    const geometry = () => page.evaluate(() => {
      const bed = document.querySelector('.ch2-ct-sliding-bed')
      const room = document.querySelector('.ch2-ct-fixed-room')
      const front = document.querySelector('.ch2-ct-fixed-front')
      const matrix = new DOMMatrixReadOnly(getComputedStyle(bed).transform)
      const box = room.getBoundingClientRect()
      return {
        x: matrix.m41, y: matrix.m42, scaleX: matrix.m11, scaleY: matrix.m22,
        roomTransform: getComputedStyle(room).transform, frontTransform: getComputedStyle(front).transform,
        roomX: box.x, roomY: box.y, roomWidth: box.width, roomHeight: box.height,
        frontClip: getComputedStyle(front).clipPath,
        frontZ: Number(getComputedStyle(front).zIndex), bedZ: Number(getComputedStyle(bed).zIndex),
        travel: Number(bed.dataset.ctTravel),
      }
    })
    const first = await geometry()
    assert.equal(first.x, 0); assert.equal(first.y, 0)
    assert.equal(first.roomTransform, 'none'); assert.equal(first.frontTransform, 'none')
    assert(first.frontZ > first.bedZ, 'The fixed gantry lip actually paints over the sliding layer')
    assert(first.frontClip.startsWith('polygon('), 'The lip is clipped to the audited bore boundary')
    await page.screenshot({ path: `${output}/${mobile ? 'mobile' : 'desktop'}-before.png` })
    await page.evaluate(() => window.__ctMotionSet(0.36))
    await page.waitForTimeout(100)
    const during = await geometry()
    assert(during.x > first.x && during.y < first.y, 'Only the patient/table visibly translate into the bore')
    for (const field of ['roomTransform', 'frontTransform', 'roomX', 'roomY', 'roomWidth', 'roomHeight', 'frontClip']) assert.deepEqual(during[field], first[field], `${field} stays fixed`)
    assert.equal(during.scaleX, 1); assert.equal(during.scaleY, 1)
    await page.screenshot({ path: `${output}/${mobile ? 'mobile' : 'desktop'}-moving.png` })
    await page.evaluate(() => window.__ctMotionSet(0.72))
    await page.waitForTimeout(100)
    const final = await geometry()
    assert(Math.abs(final.x - final.roomWidth * 200 / 1672) < 0.01)
    assert(Math.abs(final.y - final.roomHeight * -40 / 941) < 0.01)
    await page.screenshot({ path: `${output}/${mobile ? 'mobile' : 'desktop'}-inside.png` })
    await page.evaluate(() => window.__ctMotionSet(0.94))
    await page.waitForTimeout(100)
    const reconstruction = await geometry()
    assert.equal(reconstruction.x, final.x); assert.equal(reconstruction.y, final.y)
    // A new mount at saved elapsed progress must never restart the bed at zero.
    await page.evaluate(() => window.__ctMotionSet(0.36, 'restored-scan'))
    await page.locator('[data-ct-motion-ready="true"]').waitFor()
    const restored = await geometry()
    assert(Math.abs(restored.x - during.x) < 0.02 && Math.abs(restored.y - during.y) < 0.02)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const reduced = await geometry()
    await page.evaluate(() => window.__ctMotionSet(0.01))
    await page.waitForTimeout(100)
    const reducedAfter = await geometry()
    assert(Math.abs(reducedAfter.x - reduced.x) < 0.02 && Math.abs(reducedAfter.y - reduced.y) < 0.02)
    await context.close()
  }
  // Failed moving-layer download uses the existing static frame and never traps input.
  const context = await browser.newContext()
  const page = await context.newPage()
  let failedLayerRequests = 0
  await page.route(logicalImageUrl('ch2_ct_motion_bed_v1', baseURL), route => {
    failedLayerRequests++
    return route.abort('failed')
  })
  await page.goto(baseURL)
  await page.evaluate(async () => {
    const reactModule = await import('/node_modules/.vite/deps/react.js')
    const domModule = await import('/node_modules/.vite/deps/react-dom_client.js')
    const React = reactModule.default ?? reactModule, ReactDOM = domModule.default ?? domModule
    const { Ch2CtMotion } = await import('/src/components/Ch2CtMotion.tsx')
    const mount = document.createElement('div'); document.body.append(mount)
    ReactDOM.createRoot(mount).render(React.createElement(Ch2CtMotion, { progress: 0.5 }))
  })
  await page.locator('[data-ct-motion-fallback="true"]').waitFor()
  assert(failedLayerRequests > 0, 'Missing-layer fixture intercepted the actual canonical image request')
  assert(await page.locator('[data-ct-motion-fallback="true"]').evaluate(image => image.complete && image.naturalWidth > 0))
  await context.close()
  assert.deepEqual(errors, [])
  console.log('PASS desktop/390px real bed-only travel; fixed gantry/room matrices and occlusion; no scale; restored elapsed position; parked reconstruction; reduced motion; missing-layer fallback')
} finally { await browser.close() }
