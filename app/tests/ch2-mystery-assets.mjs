// Read-only integrity checks plus a disposable Edge preview. No player profile.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inflateSync } from 'node:zlib'
import { CH2_NEEDLE_STEPS } from '../src/game/ch2-needles.ts'
import { CH2_TERMINAL_STEPS } from '../src/game/ch2-terminal.ts'
import { CH2_SCANS } from '../src/game/ch2-scans.ts'
import { ch2PortraitAsset, ch2BackgroundAsset } from '../src/game/ch2.ts'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const output = resolve(repo, '../ch2-mystery-review')
const metadata = JSON.parse(readFileSync(resolve(repo, 'docs/ch2-mystery-assets.json'), 'utf8'))
const rows = [...metadata.assets, metadata.authoredDocument]
assert.equal(metadata.baseline, '194c442')
assert.equal(rows.length, 7)
assert.equal(new Set(rows.map(row => row.file)).size, 7)
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')

// Decode PNG scanline filters, not just a filename extension or alpha-channel
// claim. These generated/rasterized assets are noninterlaced 8-bit RGB/RGBA.
function inspectPng(bytes) {
  assert(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'PNG signature')
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20)
  const bitDepth = bytes[24], colorType = bytes[25], interlace = bytes[28]
  assert.equal(bitDepth, 8); assert.equal(interlace, 0)
  assert([2, 6].includes(colorType), `Unexpected PNG color type ${colorType}; audit its alpha handling explicitly`)
  const channels = colorType === 6 ? 4 : 3, stride = width * channels, chunks = []
  for (let pos = 8; pos + 12 <= bytes.length;) {
    const length = bytes.readUInt32BE(pos), type = bytes.toString('ascii', pos + 4, pos + 8)
    assert(pos + length + 12 <= bytes.length, 'truncated PNG chunk')
    if (type === 'IDAT') chunks.push(bytes.subarray(pos + 8, pos + 8 + length))
    pos += length + 12
    if (type === 'IEND') break
  }
  const filtered = inflateSync(Buffer.concat(chunks))
  assert.equal(filtered.length, height * (stride + 1))
  let previous = Buffer.alloc(stride), transparent = 0, opaque = 0, partial = 0, nearOpaque = 0, maxAlpha = 0
  const corners = []
  function paeth(a, b, c) {
    const estimate = a + b - c, da = Math.abs(estimate - a), db = Math.abs(estimate - b), dc = Math.abs(estimate - c)
    return da <= db && da <= dc ? a : db <= dc ? b : c
  }
  for (let y = 0; y < height; y++) {
    const start = y * (stride + 1), filter = filtered[start], row = Buffer.allocUnsafe(stride)
    assert(filter <= 4, 'invalid PNG filter')
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? row[x - channels] : 0
      const above = previous[x], upperLeft = x >= channels ? previous[x - channels] : 0
      const predictor = filter === 0 ? 0 : filter === 1 ? left : filter === 2 ? above
        : filter === 3 ? Math.floor((left + above) / 2) : paeth(left, above, upperLeft)
      row[x] = (filtered[start + 1 + x] + predictor) & 255
    }
    for (let x = 0; x < width; x++) {
      const alpha = channels === 4 ? row[x * channels + 3] : 255
      if (alpha === 0) transparent++; else if (alpha === 255) opaque++; else partial++
      if (alpha >= 250) nearOpaque++
      maxAlpha = Math.max(maxAlpha, alpha)
      if ((y === 0 || y === height - 1) && (x === 0 || x === width - 1)) corners.push(alpha)
    }
    previous = row
  }
  return { width, height, bitDepth, colorType, corners, transparent, opaque, partial, nearOpaque, maxAlpha }
}

const audit = []
for (const row of rows) {
  const filename = resolve(repo, row.output || `app/public/assets/${row.file}`), bytes = readFileSync(filename)
  assert.equal(sha256(bytes), row.sha256, `${row.file}: bytes do not match generation metadata`)
  const png = inspectPng(bytes)
  assert.equal(png.width, row.width, `${row.file}: width`)
  assert.equal(png.height, row.height, `${row.file}: height`)
  assert.equal(png.corners[0], row.cornerAlpha, `${row.file}: top-left alpha`)
  if (row.file === 'ch2_pat_luo_v1.png') {
    assert.equal(png.colorType, 6, 'character must have actual RGBA alpha')
    assert.deepEqual(png.corners, [0, 0, 0, 0], 'all portrait corners transparent')
    const pixels = png.width * png.height
    assert(png.transparent > pixels * 0.3, 'portrait needs real transparent surround, not a baked checkerboard')
    // This delivered portrait uses alpha 253 for its solid clusters (also
    // independently checked with System.Drawing), not exactly 255. Preserve
    // the authored bytes and report that honestly rather than rewriting art.
    assert(png.nearOpaque > pixels * 0.05, `portrait must contain a clearly visible character: ${JSON.stringify(png)}`)
  } else assert.equal(png.transparent, 0, `${row.file}: expected opaque image/prop`)
  audit.push({ file: row.file, sha256: row.sha256, ...png })
}

const newSteps = Object.assign({}, ...Object.values(CH2_NEEDLE_STEPS), ...Object.values(CH2_TERMINAL_STEPS))
for (const [id, step] of Object.entries(newSteps)) {
  for (const field of ['image', 'sprite', 'sprite2', 'bg']) {
    if (!step[field]) continue
    const key = field === 'sprite' || field === 'sprite2' ? ch2PortraitAsset(step[field], 'm')
      : field === 'bg' ? ch2BackgroundAsset(step[field]) : step[field]
    assert(existsSync(resolve(repo, `app/public/assets/${key}.png`)), `${id}.${field}: missing ${key}.png`)
  }
  assert.notEqual(CH2_SCANS[id]?.mode, 'acquire', `${id}: must not introduce exposure`)
  assert.equal(step.readout, undefined, `${id}: must not re-use CR scanning`)
  assert.equal(step.windowTask, undefined, `${id}: new evidence does not trigger another acquisition/task`)
}
const oldScans = execFileSync('git', ['show', '194c442:app/src/game/ch2-scans.ts'], { cwd: repo, encoding: 'utf8' })
const oldAcquisitions = [...oldScans.matchAll(/^\s+(\w+): acquisition\(/gm)].map(match => match[1]).sort()
assert(oldAcquisitions.length > 0, 'baseline acquisition registry must be resolved')
assert.deepEqual(Object.entries(CH2_SCANS).filter(([, config]) => config.mode === 'acquire').map(([id]) => id).sort(), oldAcquisitions)

const preview = readFileSync(resolve(repo, 'app/public/ch2-mystery-preview.html'), 'utf8')
const component = readFileSync(resolve(repo, 'app/src/components/Ch2MysteryMedia.tsx'), 'utf8')
assert.doesNotMatch(preview, /\b(?:localStorage|sessionStorage|indexedDB|XMLHttpRequest|fetch)\b|serviceWorker/, 'preview must not access saves or load the game runtime')
assert.doesNotMatch(preview, /<script[^>]+src\s*=|<script[^>]+type\s*=\s*["']module/i)
assert.doesNotMatch(preview, /<(?:audio|video)\b[^>]*\bautoplay\b/i)
const volumeMatch = component.match(/audio\.volume\s*=\s*cue\.kind\s*===\s*'alarm'\s*\?\s*([\d.]+)\s*:\s*([\d.]+)/)
assert(volumeMatch, 'explicit per-cue component volume is auditable')
const volumes = { alarm: Number(volumeMatch[1]), receipt: Number(volumeMatch[2]) }
assert.deepEqual(volumes, { alarm: 0.45, receipt: 0.5 }, 'reviewed cue playback gains')
const require = createRequire(import.meta.url)
const modulePath = process.env.PLAYWRIGHT_MODULE || 'C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
assert(existsSync(modulePath))
const { chromium } = require(modulePath)
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const browserErrors = []
mkdirSync(output, { recursive: true })
try {
  for (const width of [1280, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } })
    await context.addInitScript(() => {
      const nativeGet = Storage.prototype.getItem, nativeSet = Storage.prototype.setItem
      nativeSet.call(localStorage, 'midnight-radiology-save-v1', '{"previewMustNotTouch":true}')
      window.__untouchedSave = () => nativeGet.call(localStorage, 'midnight-radiology-save-v1')
      window.__storageCalls = []; window.__playCalls = []
      for (const method of ['getItem', 'setItem', 'removeItem', 'clear', 'key']) {
        const original = Storage.prototype[method]
        Storage.prototype[method] = function (...args) {
          window.__storageCalls.push({ method, args }); return original.apply(this, args)
        }
      }
      HTMLMediaElement.prototype.play = function () { window.__playCalls.push(this.src); return Promise.resolve() }
    })
    const page = await context.newPage()
    page.on('pageerror', error => browserErrors.push(error.message))
    await page.goto((process.env.GAME_URL || 'http://127.0.0.1:8798/').replace(/\/$/, '') + '/ch2-mystery-preview.html')
    await page.waitForFunction(() => document.images.length === 7 && [...document.images].every(img => img.complete && img.naturalWidth > 0))
    assert.equal(await page.locator('audio').count(), 2)
    const actualVolumes = await page.locator('audio').evaluateAll(nodes => Object.fromEntries(nodes.map(audio => [audio.src.includes('_alarm_') ? 'alarm' : 'receipt', audio.volume])))
    assert.deepEqual(actualVolumes, volumes, `${width}: actual preview volume must match game component`)
    await page.screenshot({ path: resolve(output, `preview-${width}.png`), fullPage: true })
    for (const summary of await page.locator('summary').all()) await summary.click()
    assert.equal(await page.locator('details[open]').count(), 2)
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}: horizontal overflow`)
    for (const box of await page.locator('audio,summary').evaluateAll(nodes => nodes.map(node => {
      const r = node.getBoundingClientRect(); return { x: r.x, right: r.right, width: innerWidth }
    }))) assert(box.x >= 0 && box.right <= box.width, `${width}: media or disclosure control outside viewport`)
    assert.equal(await page.locator('audio[autoplay]').count(), 0)
    assert.deepEqual(await page.evaluate(() => window.__playCalls), [], 'neither loading nor expanding the preview autoplays')
    assert.deepEqual(await page.evaluate(() => window.__storageCalls), [], 'static preview does not read/write storage')
    assert.equal(await page.evaluate(() => window.__untouchedSave()), '{"previewMustNotTouch":true}')
    await page.screenshot({ path: resolve(output, `preview-${width}-expanded.png`), fullPage: true })
    await page.locator('article').filter({ has: page.locator('img[src$="ch2_needle_record_v1.png"]') }).screenshot({ path: resolve(output, `preview-${width}-record.png`) })
    for (const summary of await page.locator('summary').all()) await summary.click()
    assert.equal(await page.locator('details[open]').count(), 0, 'both expanded sections can be closed')
    await context.close()
  }
  assert.deepEqual(browserErrors, [])
} finally { await browser.close() }
writeFileSync(resolve(output, 'assets-results.json'), JSON.stringify({ assets: audit, volumes, preview: 'desktop + 390px: no storage access/autoplay, correct audio gain, seven loaded images, closable disclosures, no horizontal overflow', browserErrors }, null, 2))
console.log(`PASS mystery assets: 7 exact SHA256/size PNGs, decoded RGB/RGBA alpha (portrait genuinely transparent), ${Object.keys(newSteps).length} new-step references, unchanged ${oldAcquisitions.length} acquisitions; preview desktop/390px, no storage/autoplay, audio volumes ${volumes.alarm}/${volumes.receipt}.`)
