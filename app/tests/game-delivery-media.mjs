// Historical source identity is not a claim that current delivery bytes are PNG.
// Every historical exception first verifies the actual, independently reviewed live file.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { priorDetailSourcePaths } from './ch2-detail-polish-projection.mjs'
import { priorDirectorDayVoiceMediaPaths } from './ch2-director-day-voice.mjs'
import { beforeDayCasesSource, DAY_CASES_WRIST, DAY_CASES_IMAGE, assertDayCasesImage } from './ch2-day-cases-projection.mjs'
import { ctaCharactersLedger, assertCtaCharactersMedia } from './ch2-cta-characters-projection.mjs'

export const DELIVERY_BASELINE = 'c4215b080ec7d5052a86c23cf03b6bd2aa3b980a'
export const DELIVERY_ROOT = new URL('../../', import.meta.url)
export const DELIVERY_ADDED_SOURCE = ['app/src/lib/image-assets.catalog.json', 'app/src/lib/image-previews.catalog.json']
export const RAW_IMAGES = ['ct_head_hema', 'ct_lung', 'ct_wrist_simulated']
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
export const gitBlob = bytes => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')
export function assertDeliveryBytes(row, bytes) {
  assert.equal(sha256(bytes), row.deliverySha256, `${row.deliveryPath}: actual current delivery bytes differ from reviewed identity`)
  assert.equal(bytes.length, row.deliveryBytes)
  if (row.mode === 'raw-png') {
    assert.equal(row.deliveryPath, row.sourcePath)
    assert.equal(sha256(bytes), row.sourceSha256)
    assert.equal(gitBlob(bytes), row.sourceGitBlob)
  }
}
export function assertDeliveryCatalog(current, rows) {
  assert.deepEqual(current, Object.fromEntries(rows.map(row => [row.name, row.deliveryPath.replace('app/public/assets/', '')])),
    'Current runtime catalog must exactly resolve every logical ID to its reviewed live delivery')
}
const read = path => readFileSync(new URL(path, DELIVERY_ROOT))
const normalize = bytes => bytes.toString('utf8').replaceAll('\r\n', '\n').trimEnd() + '\n'
let manifest, catalog, baselineBlobs
const verified = new Map()

export function deliveryManifest() {
  if (manifest) return manifest
  const review = JSON.parse(read('docs/game-delivery-review.json'))
  assert.equal(review.baseline, DELIVERY_BASELINE)
  assert.equal(review.status, 'reviewed')
  const bytes = read('docs/game-delivery-assets.json')
  assert.equal(sha256(Buffer.from(normalize(bytes))), review.assetsSha256, 'Media manifest changed after explicit review; do not silently bless new hashes')
  assert.equal(sha256(Buffer.from(normalize(read('docs/game-delivery-source-deltas.json')))), review.sourceDeltasSha256)
  manifest = JSON.parse(bytes)
  assert.equal(manifest.baseline, DELIVERY_BASELINE)
  assert.equal(manifest.images.length, 197)
  assert.equal(new Set(manifest.images.map(row => row.name)).size, 197)
  assert.equal(new Set(manifest.images.map(row => row.sourcePath)).size, 197)
  assert.equal(new Set(manifest.images.map(row => row.deliveryPath)).size, 197)
  for (const row of manifest.images) {
    assert.match(row.sourcePath, /^app\/public\/assets\/[\w-]+\.png$/)
    assert.equal(row.sourcePath, `app/public/assets/${row.name}.png`)
    assert.match(row.deliveryPath, /^app\/public\/assets\/(?:media\/[\w.-]+\.webp|[\w-]+\.png)$/)
    assert.equal(row.mode, RAW_IMAGES.includes(row.name) ? 'raw-png' : row.name === 'ch2_needle_record_v1' ? 'lossless-webp' : 'lossy-webp')
    assert(!row.deliveryPath.includes('..'))
  }
  for (const row of manifest.removed) {
    assert(/^app\/public\/auditions\//.test(row.path) || /^app\/public\/[^/]+\.html$/.test(row.path)
      || /^app\/public\/assets\/optimized\//.test(row.path), `Unapproved deletion scope: ${row.path}`)
    assert(typeof row.reason === 'string' && row.reason.trim())
    assert(!existsSync(new URL(row.path, DELIVERY_ROOT)), `${row.path}: reviewed removal must actually be absent`)
  }
  catalog = JSON.parse(beforeDayCasesSource('app/src/lib/image-assets.catalog.json', read('app/src/lib/image-assets.catalog.json')))
  assertDeliveryCatalog(catalog, manifest.images)
  const tree = execFileSync('git', ['ls-tree', '-r', '-z', DELIVERY_BASELINE], { cwd: fileURLToPath(DELIVERY_ROOT), encoding: 'utf8', maxBuffer: 32e6 })
  baselineBlobs = new Map(tree.split('\0').filter(Boolean).map(entry => {
    const match = /^\d+ blob ([0-9a-f]+)\t(.+)$/.exec(entry)
    return match ? [match[2], match[1]] : [entry, null]
  }))
  for (const row of manifest.images) assert.equal(row.sourceGitBlob, baselineBlobs.get(row.sourcePath), `${row.name}: original identity must belong to the fixed baseline`)
  return manifest
}

export function liveMedia(sourcePath) {
  const addition = ctaCharactersLedger().media.find(row => row.path === sourcePath || row.kind === 'image' && sourcePath === `app/public/assets/${row.name}.png`)
  if (addition) return { bytes: assertCtaCharactersMedia(addition.name), path: addition.path, row: undefined }
  if ([DAY_CASES_IMAGE, `app/public/assets/${DAY_CASES_WRIST}.png`].includes(sourcePath)) {
    return { bytes: assertDayCasesImage(), path: DAY_CASES_IMAGE, row: undefined }
  }
  deliveryManifest()
  const row = manifest.images.find(image => image.sourcePath === sourcePath || image.deliveryPath === sourcePath)
  const path = row?.deliveryPath ?? sourcePath
  if (!verified.has(path)) {
    const bytes = read(path)
    if (row) {
      assertDeliveryBytes(row, bytes)
      if (row.mode !== 'raw-png') assert(!existsSync(new URL(row.sourcePath, DELIVERY_ROOT)), `${row.sourcePath}: superseded large PNG must not remain in public`)
    }
    verified.set(path, { bytes, path, row })
  }
  return verified.get(path)
}

export function assertHistoricalMedia(sourcePath, expected) {
  const { bytes, row } = liveMedia(sourcePath)
  if (expected.gitBlob) assert.equal(row?.sourceGitBlob ?? gitBlob(bytes), expected.gitBlob, `${sourcePath}: unchanged or precisely reviewed historical source identity`)
  if (expected.sha256) assert.equal(row?.sourceSha256 ?? sha256(bytes), expected.sha256, `${sourcePath}: historical source SHA remains pinned separately from live delivery`)
}
export const deliveryAddedMedia = () => deliveryManifest().images.filter(row => row.deliveryPath !== row.sourcePath).map(row => row.deliveryPath).sort()
// A historical additions check compares logical source identities, not pretend
// current PNG paths. Only independently verified migrations can be translated.
export function priorMediaPaths(paths, baseline) {
  paths = priorDirectorDayVoiceMediaPaths(paths)
  deliveryManifest()
  assert(baseline, 'Historical additions require their own fixed baseline')
  const originalPaths = new Set(execFileSync('git', ['ls-tree', '-r', '--name-only', baseline], {
    cwd: fileURLToPath(DELIVERY_ROOT), encoding: 'utf8', maxBuffer: 32e6,
  }).trim().split('\n'))
  return [...new Set(paths.flatMap(path => {
    const row = manifest.images.find(image => image.deliveryPath === path && image.deliveryPath !== image.sourcePath)
    if (!row) return [path]
    liveMedia(row.sourcePath)
    return originalPaths.has(row.sourcePath) ? [] : [row.sourcePath]
  }))].sort()
}
export function priorSourcePaths(paths) { return priorDetailSourcePaths(paths).filter(path => !DELIVERY_ADDED_SOURCE.includes(path)) }
export function reviewedMediaChanges(paths) {
  const rows = deliveryManifest().images.filter(row => row.deliveryPath !== row.sourcePath)
  const reviewed = new Set(rows.flatMap(row => [row.sourcePath, row.deliveryPath]))
  return paths.filter(path => !reviewed.has(path))
}
export function logicalImagePath(name) {
  const addition = ctaCharactersLedger().media.find(row => row.kind === 'image' && row.name === name)
  if (addition) {
    assertCtaCharactersMedia(name)
    const liveCatalog = JSON.parse(read('app/src/lib/image-assets.catalog.json'))
    beforeDayCasesSource('app/src/lib/image-assets.catalog.json', JSON.stringify(liveCatalog, null, 2))
    assert.equal(liveCatalog[name], addition.path.replace('app/public/assets/', ''))
    return liveCatalog[name]
  }
  if (name === DAY_CASES_WRIST) {
    assertDayCasesImage()
    const liveCatalog = JSON.parse(read('app/src/lib/image-assets.catalog.json'))
    beforeDayCasesSource('app/src/lib/image-assets.catalog.json', JSON.stringify(liveCatalog, null, 2))
    assert.equal(liveCatalog[name], DAY_CASES_IMAGE.replace('app/public/assets/', ''))
    return liveCatalog[name]
  }
  deliveryManifest()
  assert(Object.hasOwn(catalog, name), `Missing logical image ID: ${name}`)
  liveMedia(`app/public/assets/${name}.png`)
  return catalog[name]
}
export const logicalImageUrl = (name, base) => new URL(`assets/${logicalImagePath(name)}`, base).href
export async function waitForLiveImage(page, name, base) {
  const relative = logicalImagePath(name), url = logicalImageUrl(name, base)
  const selector = `img[src$="assets/${relative}"]:not([aria-hidden="true"]), img[data-scene-background="${name}"]`
  const locator = page.locator(selector).first()
  await locator.waitFor()
  await page.waitForFunction(({ name, url }) => [...document.images].some(image =>
    (image.src === url || image.dataset.sceneBackground === name) && image.complete && image.naturalWidth > 0), { name, url })
  if (await locator.getAttribute('data-scene-background')) {
    assert(await page.evaluate(url => performance.getEntriesByType('resource').some(entry => entry.name === url), url),
      `${name}: decoded background blob must have requested the exact canonical URL`)
  } else assert.equal(await locator.evaluate(image => image.src), url)
  return locator
}
export async function inspectLiveImage(sourcePath) {
  const media = liveMedia(sourcePath), metadata = await sharp(media.bytes).metadata()
  const { data, info } = await sharp(media.bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let transparent = 0, opaque = 0, partial = 0, nearOpaque = 0, maxAlpha = 0
  for (let index = 3; index < data.length; index += 4) {
    const alpha = data[index]
    if (alpha === 0) transparent++; else if (alpha === 255) opaque++; else partial++
    if (alpha >= 250) nearOpaque++
    maxAlpha = Math.max(maxAlpha, alpha)
  }
  const corners = [0, info.width - 1, (info.height - 1) * info.width, info.width * info.height - 1].map(pixel => data[pixel * 4 + 3])
  return { ...media, width: info.width, height: info.height, metadata, corners, transparent, opaque, partial, nearOpaque, maxAlpha }
}

// Only the new delivery audit uses this explicitly historical reference. Never
// return it from liveMedia(), selectors, HTTP checks or older current-file reads.
export function historicalReference(row) {
  const bytes = execFileSync('git', ['show', `${DELIVERY_BASELINE}:${row.sourcePath}`], { cwd: fileURLToPath(DELIVERY_ROOT), maxBuffer: 32e6 })
  assert.equal(sha256(bytes), row.sourceSha256)
  assert.equal(gitBlob(bytes), row.sourceGitBlob)
  assert.equal(bytes.length, row.sourceBytes)
  return bytes
}

export function historicalRetiredReference(path) {
  const row = deliveryManifest().removed.find(entry => entry.path === path)
  assert(row?.gitBlob, `${path}: a retired historical reference must have an explicitly reviewed Git identity`)
  const bytes = execFileSync('git', ['show', `${DELIVERY_BASELINE}:${path}`], { cwd: fileURLToPath(DELIVERY_ROOT), maxBuffer: 32e6 })
  assert.equal(gitBlob(bytes), row.gitBlob)
  assert.equal(sha256(bytes), row.sha256)
  assert.equal(bytes.length, row.bytes)
  return bytes // Historical reference only; never a live/HTTP fallback.
}
