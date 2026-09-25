import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { register } from 'tsx/esm/api'

register()
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
globalThis.document = { baseURI: 'https://example.test/Midnight-Radiology/' }
globalThis.window = new EventTarget()
let imagesActive = 0, imagePeak = 0
globalThis.Image = class {
  naturalWidth = 32
  naturalHeight = 32
  set src(value) {
    assert.match(value, /^blob:/)
    imagesActive++
    imagePeak = Math.max(imagePeak, imagesActive)
    setTimeout(() => { imagesActive--; this.onload?.() }, 1)
  }
  removeAttribute() {}
}
const stored = new Map()
globalThis.caches = { open: async () => ({
  match: async key => stored.get(key)?.clone(),
  put: async (key, response) => { stored.set(key, response.clone()) },
  delete: async key => stored.delete(key),
}) }

const requests = []
let active = 0, peak = 0, failures = '', corruptOnce = '', corrupted = false
globalThis.fetch = async (value, options) => {
  const url = new URL(value, document.baseURI)
  const asset = url.pathname.slice('/Midnight-Radiology/'.length)
  requests.push({ asset, cache: options.cache })
  if (asset === failures) return new Response('', { status: 503 })
  const bytes = new Uint8Array(await readFile(path.join(root, 'public', asset)))
  if (asset === corruptOnce && !corrupted) { bytes[0] ^= 255; corrupted = true }
  active++
  peak = Math.max(peak, active)
  let offset = 0, ended = false
  const finish = () => { if (!ended) { ended = true; active-- } }
  return new Response(new ReadableStream({
    async pull(controller) {
      await new Promise(resolve => setTimeout(resolve, 1))
      if (options.signal.aborted) { finish(); controller.error(new DOMException('Aborted', 'AbortError')); return }
      if (offset >= bytes.length) { finish(); controller.close(); return }
      const end = Math.min(bytes.length, offset + Math.ceil(bytes.length / 3))
      controller.enqueue(bytes.slice(offset, end))
      offset = end
    },
    cancel: finish,
  }), { headers: { 'Content-Type': asset.endsWith('.mp3') ? 'audio/mpeg' : 'image/webp' } })
}

const service = await import('../src/lib/chapter-assets.ts')
const { prepareChapterAssets: prepare, chapterAssetsReady: isReady, chapterAssetPaths: paths,
  assetUrl, chapterMediaManifest: manifest } = service
for (const alias of ['vox_ch1_fan_mature_20260923', 'vox_ch1_worker_bass_20260923', 'vox_ch1_thin_breathless_20260923']) {
  assert(manifest.assets[`audio/${alias}.mp3`], `Approved voice alias is registered: ${alias}`)
}

const progress = []
await prepare('shell', [], row => progress.push(row))
assert(isReady('shell'))
assert.equal(progress.at(-1).status, 'ready')
assert.equal(progress.at(-1).completed, progress.at(-1).total)
assert.equal(progress.at(-1).loadedBytes, progress.at(-1).totalBytes)
assert(progress.slice(0, -1).every(row => row.status !== 'ready'))
assert(paths('shell').every(asset => assetUrl(asset).startsWith('blob:')))

const ch1Only = paths('ch1').filter(asset => !paths('shell').includes(asset))
failures = ch1Only.find(asset => asset.startsWith('audio/'))
corruptOnce = ch1Only.find(asset => asset.startsWith('assets/'))
await assert.rejects(prepare('ch1', [], row => progress.push(row)), error => {
  assert.equal(error.name, 'ChapterAssetLoadError')
  assert.deepEqual(error.failed, [failures])
  return true
})
assert.equal(progress.at(-1).status, 'error')
assert(!isReady('ch1'))
assert.equal(requests.filter(row => row.asset === failures).length, 3)
assert(requests.some(row => row.asset === corruptOnce && row.cache === 'reload'), 'Integrity failure bypasses corrupt HTTP cache on retry')
const requestCount = requests.length
failures = ''
await prepare('ch1', [], row => progress.push(row))
assert(isReady('ch1'))
assert.equal(requests.length - requestCount, 1, 'Retry requests only the failed file')

const cancel = new AbortController()
const pending = prepare('ch2', [], () => {}, cancel.signal)
setTimeout(() => cancel.abort(), 5)
await assert.rejects(pending, { name: 'AbortError' })
// Await siblings whose aborted streams are already settling.
await new Promise(resolve => setTimeout(resolve, 10))
await prepare('ch2', [], () => {})
assert(isReady('ch2'))
assert(peak <= 4, `Download concurrency remains bounded: ${peak}`)
assert.equal(imagePeak, 1, 'Only one validation image is decoded at a time')

const beforeOffline = requests.length
const networkFetch = globalThis.fetch
globalThis.fetch = async () => { throw new Error('Network is offline') }
for (const asset of paths('ch2')) assert.match(assetUrl(asset), /^blob:/)
await prepare('ch2', [], () => {})
assert.equal(requests.length, beforeOffline)

const freshService = await import('../src/lib/chapter-assets.ts?warm-cache')
assert(!freshService.chapterAssetsReady('shell'), 'A fresh document never trusts a persisted ready flag')
await freshService.prepareChapterAssets('shell', [], () => {})
assert(freshService.chapterAssetsReady('shell'), 'Verified persistent bytes allow loading while offline')
assert.equal(requests.length, beforeOffline)

const firstAsset = paths('shell')[0]
const firstKey = [...stored.keys()].find(key => new URL(key).pathname.endsWith(`/${firstAsset}`))
const corruptedCache = new Uint8Array(await stored.get(firstKey).clone().arrayBuffer())
corruptedCache[0] ^= 255
stored.set(firstKey, new Response(corruptedCache))
globalThis.fetch = networkFetch
const repairService = await import('../src/lib/chapter-assets.ts?cache-repair')
await repairService.prepareChapterAssets('shell', [], () => {})
assert.equal(requests.length - beforeOffline, 1, 'Corrupt persistent entry is redownloaded; valid entries are reused')
assert.equal(requests.at(-1).asset, firstAsset)

let misses = 0
window.addEventListener(service.MISSING_ASSET_EVENT, event => {
  assert.equal(event.detail.path, 'assets/unknown.webp')
  misses++
})
assert.match(assetUrl('assets/unknown.webp'), /^data:/)
assetUrl('assets/unknown.webp')
await new Promise(resolve => queueMicrotask(resolve))
assert.equal(misses, 1, 'Missing resource triggers one recovery event, never fallback network')

const recoveryCancel = new AbortController()
await assert.rejects(prepare('shell', ['assets/unknown.webp'], () => recoveryCancel.abort(), recoveryCancel.signal), { name: 'AbortError' })
assetUrl('assets/unknown.webp')
assetUrl('assets/unknown.webp')
await new Promise(resolve => queueMicrotask(resolve))
assert.equal(misses, 2, 'Revisiting a missing resource after cancelling recovery emits one new recovery event')

// Accelerate ONLY the production 30-second inactivity deadline. Retry delays,
// stream delivery gaps and all other timers keep their ordinary timing.
const realSetTimeout = globalThis.setTimeout
const realCaches = globalThis.caches
const realFetch = globalThis.fetch
const inactivityMs = 120
const boundaryAsset = ch1Only.find(asset => asset.startsWith('audio/'))
const removeBoundaryCache = () => {
  for (const key of stored.keys()) if (new URL(key).pathname.endsWith(`/${boundaryAsset}`)) stored.delete(key)
}
let inactivityExpirations = 0
globalThis.setTimeout = (callback, delay, ...args) => realSetTimeout(() => {
  if (delay === 30_000) inactivityExpirations++
  callback(...args)
}, delay === 30_000 ? inactivityMs : delay)
try {
  removeBoundaryCache()
  let stalledAttempts = 0, stalledAborts = 0
  globalThis.fetch = async (value, options) => {
    const asset = new URL(value, document.baseURI).pathname.slice('/Midnight-Radiology/'.length)
    if (asset !== boundaryAsset) return realFetch(value, options)
    stalledAttempts++
    // A real fetch reader rejects when its request signal aborts. This fixture
    // models headers received successfully but no response-body bytes arriving.
    return new Response(new ReadableStream({
      start(controller) {
        options.signal.addEventListener('abort', () => {
          stalledAborts++
          controller.error(new DOMException('No-data timeout', 'AbortError'))
        }, { once: true })
      },
    }))
  }
  const stallService = await import('../src/lib/chapter-assets.ts?inactivity-stall')
  const stallProgress = []
  const expirationsBefore = inactivityExpirations
  await assert.rejects(stallService.prepareChapterAssets('shell', [boundaryAsset], row => stallProgress.push(row)), error => {
    assert.equal(error.name, 'ChapterAssetLoadError')
    assert.deepEqual(error.failed, [boundaryAsset])
    return true
  })
  assert.equal(stalledAttempts, 3, 'No-data timeout makes one initial attempt and exactly two retries')
  assert.equal(stalledAborts, 3, 'Each stalled body is actively aborted, not left pending')
  assert.equal(inactivityExpirations - expirationsBefore, 3, 'All three attempts fail at the 30-second inactivity deadline')
  assert.equal(stallProgress.at(-1).status, 'error')
  assert(!stallService.chapterAssetsReady('shell', [boundaryAsset]))

  removeBoundaryCache()
  const streamedBytes = new Uint8Array(await readFile(path.join(root, 'public', boundaryAsset)))
  let streamAttempts = 0, streamAborts = 0
  const receivedAt = []
  globalThis.fetch = async (value, options) => {
    const asset = new URL(value, document.baseURI).pathname.slice('/Midnight-Radiology/'.length)
    if (asset !== boundaryAsset) return realFetch(value, options)
    streamAttempts++
    let offset = 0, abortListener
    return new Response(new ReadableStream({
      start(controller) {
        abortListener = () => { streamAborts++; controller.error(new DOMException('Unexpected stream timeout', 'AbortError')) }
        options.signal.addEventListener('abort', abortListener, { once: true })
      },
      async pull(controller) {
        await new Promise(resolve => realSetTimeout(resolve, 35))
        if (options.signal.aborted) return
        if (offset >= streamedBytes.length) {
          options.signal.removeEventListener('abort', abortListener)
          controller.close()
          return
        }
        const end = Math.min(streamedBytes.length, offset + Math.ceil(streamedBytes.length / 6))
        receivedAt.push(Date.now())
        controller.enqueue(streamedBytes.slice(offset, end))
        offset = end
      },
    }), { headers: { 'Content-Type': 'audio/mpeg' } })
  }
  const streamService = await import('../src/lib/chapter-assets.ts?inactivity-stream')
  const streamProgress = []
  const streamBegan = Date.now()
  await streamService.prepareChapterAssets('shell', [boundaryAsset], row => streamProgress.push(row))
  assert(Date.now() - streamBegan > inactivityMs * 1.5, 'Fixture must run longer than an entire inactivity deadline')
  assert.equal(receivedAt.length, 6, 'Fixture must deliver multiple separated body chunks')
  assert.equal(streamAttempts, 1, 'Steady slow progress must not be mistaken for a total-time deadline')
  assert.equal(streamAborts, 0)
  assert.equal(streamProgress.at(-1).status, 'ready')
  assert(streamService.chapterAssetsReady('shell', [boundaryAsset]))
  assert.equal(streamProgress.at(-1).loadedBytes, streamProgress.at(-1).totalBytes)

  // Cache writes may be rejected after verified bytes have been admitted. This
  // must remain session-ready, with no unhandled rejected put() promise.
  removeBoundaryCache()
  globalThis.fetch = realFetch
  let rejectedPuts = 0
  const unhandled = []
  const rejectListener = reason => unhandled.push(reason)
  process.on('unhandledRejection', rejectListener)
  try {
    globalThis.caches = { open: async () => ({
      match: async key => stored.get(key)?.clone(),
      delete: async key => stored.delete(key),
      put: async () => { rejectedPuts++; throw new DOMException('Quota fixture is full', 'QuotaExceededError') },
    }) }
    const quotaService = await import('../src/lib/chapter-assets.ts?quota-put')
    const quotaProgress = []
    await quotaService.prepareChapterAssets('shell', [boundaryAsset], row => quotaProgress.push(row))
    await new Promise(resolve => realSetTimeout(resolve, 10))
    assert(rejectedPuts > 0)
    assert.deepEqual(unhandled, [], 'Quota rejection must be handled')
    assert.equal(quotaProgress.at(-1).status, 'ready')
    assert(quotaService.chapterAssetsReady('shell', [boundaryAsset]))
    for (const asset of quotaService.chapterAssetPaths('shell', [boundaryAsset])) assert.match(quotaService.assetUrl(asset), /^blob:/)
  } finally { process.off('unhandledRejection', rejectListener) }
  console.log(`Inactivity/cache boundaries: ${stalledAttempts} stalled attempts aborted; ${streamAttempts} steady six-chunk stream admitted; ${rejectedPuts} quota rejections did not block readiness.`)
} finally {
  globalThis.setTimeout = realSetTimeout
  globalThis.caches = realCaches
  globalThis.fetch = realFetch
}

console.log('Chapter asset service: hashes, retries, retained success, bounded concurrency, cancellation, offline session, missing-resource recovery, inactivity reset and quota fallback passed.')
