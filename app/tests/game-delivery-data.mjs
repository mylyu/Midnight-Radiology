// Current bytes are always read from the real delivery path. Git PNG bytes are
// explicitly historical pixel/alpha references, never a substitute live asset.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { DIRECTOR_DAY_AUDIO, assertDirectorDayVoiceLive } from './ch2-director-day-voice.mjs'
import { DAY_CASES_IMAGE, assertDayCasesLive } from './ch2-day-cases-projection.mjs'
import { DELIVERY_BASELINE, DELIVERY_ROOT, RAW_IMAGES, deliveryManifest, liveMedia,
  historicalReference, sha256, gitBlob, assertDeliveryBytes, assertDeliveryCatalog } from './game-delivery-media.mjs'

const manifest = deliveryManifest()
const git = (...args) => execFileSync('git', args, { cwd: fileURLToPath(DELIVERY_ROOT), maxBuffer: 32e6 })
const tree = git('ls-tree', '-r', '-z', DELIVERY_BASELINE, '--', 'app/public').toString().split('\0').filter(Boolean)
  .map(entry => { const [, blob, path] = /^\d+ blob ([0-9a-f]+)\t(.+)$/.exec(entry); return { blob, path } })
const originals = tree.filter(row => /^app\/public\/assets\/[^/]+\.png$/.test(row.path))
assert.equal(originals.length, 197)
assert.deepEqual(manifest.images.map(row => row.sourcePath).sort(), originals.map(row => row.path).sort(), 'Retain every logical ID including legacy saves')
assert.equal(manifest.images.filter(row => row.mode === 'lossy-webp').length, 193)
assert.deepEqual(manifest.images.filter(row => row.mode === 'lossless-webp').map(row => row.name), ['ch2_needle_record_v1'])
assert.deepEqual(manifest.images.filter(row => row.mode === 'raw-png').map(row => row.name).sort(), [...RAW_IMAGES].sort())
let imageBytes = 0, sourceBytes = 0, alphaPixels = 0, exactRgba = 0
sharp.cache({ memory: 32, files: 0, items: 16 })
sharp.concurrency(2)
for (const row of manifest.images) {
  const live = liveMedia(row.sourcePath).bytes
  const reference = historicalReference(row)
  const tampered = Buffer.from(live); tampered[0] ^= 1
  assert.throws(() => assertDeliveryBytes(row, tampered), /actual current delivery bytes/, `${row.name}: byte mutation must fail without writing to disk`)
  const actualMeta = await sharp(live).metadata(), sourceMeta = await sharp(reference).metadata()
  assert.equal(actualMeta.format, row.mode === 'raw-png' ? 'png' : 'webp', `${row.name}: actual codec`)
  assert.equal(actualMeta.width, row.width); assert.equal(actualMeta.height, row.height)
  assert.equal(actualMeta.width, sourceMeta.width); assert.equal(actualMeta.height, sourceMeta.height)
  assert.equal(!!actualMeta.hasAlpha, row.hasAlpha, `${row.name}: metadata describes live delivery`)
  const before = await sharp(reference).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const after = await sharp(live).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  assert.deepEqual(after.info, before.info, `${row.name}: unchanged canvas/channels`)
  let alphaExact = true, visibleRgbExact = true, absoluteRgbError = 0, visibleChannels = 0
  for (let i = 0; i < before.data.length; i += 4) {
    if (before.data[i + 3] !== after.data[i + 3]) alphaExact = false
    if (before.data[i + 3]) for (let c = 0; c < 3; c++) {
      const error = Math.abs(before.data[i + c] - after.data[i + c])
      absoluteRgbError += error; visibleChannels++
      if (error) visibleRgbExact = false
    }
  }
  assert(alphaExact && row.alphaExact === true, `${row.name}: every alpha pixel exact, not merely same channel count`)
  const rgbaExact = before.data.equals(after.data)
  assert.equal(row.rgbaExact, rgbaExact, `${row.name}: do not claim lossy RGB is exact`)
  if (row.visibleRgbMeanAbsoluteError !== undefined) assert.equal(row.visibleRgbMeanAbsoluteError,
    Number((absoluteRgbError / Math.max(1, visibleChannels)).toFixed(4)), `${row.name}: actual visible-RGB error record`)
  if (row.mode === 'raw-png') {
    assert(live.equals(reference) && rgbaExact, `${row.name}: raw numerical inputs byte/pixel exact`)
    assert.equal(row.quality, null)
  } else {
    assert(live.length <= 600 * 1024 && live.length <= reference.length, `${row.name}: 600 KiB per-image delivery limit, never larger than source`)
    assert.match(row.deliveryPath, new RegExp(`/media/${row.name}\\.${row.deliverySha256.slice(0, 16)}\\.webp$`))
    if (row.mode === 'lossless-webp') {
      assert(visibleRgbExact, 'Reviewed small-text evidence keeps every visible RGB pixel exact')
      assert.equal(row.quality, null)
    } else assert([78, 72, 66, 60].includes(row.quality), `${row.name}: explicitly reviewed lossy policy`)
  }
  alphaPixels += row.width * row.height
  if (rgbaExact) exactRgba++
  imageBytes += live.length; sourceBytes += reference.length
}
assert(imageBytes <= 30 * 1024 * 1024, 'All 197 actual images including three raw numerical PNGs fit 30 MiB')
assert.equal(manifest.stats.imageCount, 197)
assert.equal(manifest.stats.deliveredImageBytes, imageBytes)
assert.equal(manifest.stats.sourceImageBytes, sourceBytes)
const canonical = Object.fromEntries(manifest.images.map(row => [row.name, row.deliveryPath.replace('app/public/assets/', '')]))
assert.throws(() => assertDeliveryCatalog({ ...canonical, unauthorized: 'media/other.webp' }, manifest.images))
assert.throws(() => assertDeliveryCatalog({ ...canonical, bg_title: canonical.bg_corridor }, manifest.images))
const missing = { ...canonical }; delete missing.bg_title
assert.throws(() => assertDeliveryCatalog(missing, manifest.images))

const previews = JSON.parse(readFileSync(new URL('app/src/lib/image-previews.catalog.json', DELIVERY_ROOT), 'utf8'))
assert.deepEqual(Object.keys(previews).sort(), manifest.images.filter(row => row.name.startsWith('bg_')).map(row => row.name).sort())
let previewBytes = 0
for (const [name, inline] of Object.entries(previews)) {
  assert.match(inline, /^data:image\/webp;base64,[A-Za-z0-9+/]+=*$/, `${name}: inline, no extra request`)
  const bytes = Buffer.from(inline.split(',')[1], 'base64'), meta = await sharp(bytes).metadata()
  const row = manifest.images.find(image => image.name === name)
  assert.equal(meta.format, 'webp'); assert(meta.width > 0 && meta.width <= 48 && meta.height > 0)
  // The preview must actually derive from this same delivered background.
  const expected = await sharp(liveMedia(row.sourcePath).bytes).resize({ width: 48, withoutEnlargement: true }).webp({ quality: 20, effort: 6 }).toBuffer()
  assert.equal(sha256(bytes), sha256(expected), `${name}: correct scene, not another image/placeholder`)
  previewBytes += bytes.length
}
assert.equal(previewBytes, manifest.stats.inlinePreviewBytes)

// Every untouched file, especially the 12 atlases and all audio, remains current
// and byte-identical. Only the reviewed manifest's exact removals can disappear.
const removed = new Map(manifest.removed.map(row => [row.path, row]))
assert.equal(removed.size, manifest.removed.length)
for (const row of manifest.removed) {
  const baseline = tree.find(entry => entry.path === row.path)
  if (baseline) {
    const bytes = git('show', `${DELIVERY_BASELINE}:${row.path}`)
    assert.equal(row.gitBlob, baseline.blob); assert.equal(row.sha256, sha256(bytes)); assert.equal(row.bytes, bytes.length)
  } else {
    assert(row.path.startsWith('app/public/assets/optimized/'), 'Only ignored old optimized cache may have no Git identity')
    assert.equal(row.gitBlob, null)
  }
}
let audio = 0, atlases = 0
const expectedPublic = []
for (const row of tree) {
  const migration = manifest.images.find(image => image.sourcePath === row.path)
  if (migration) { expectedPublic.push(migration.deliveryPath); continue }
  if (removed.has(row.path)) continue
  const bytes = readFileSync(new URL(row.path, DELIVERY_ROOT))
  if (/\.(?:txt|html|svg)$/.test(row.path)) {
    // Text checkout CRLF is not a media encoding mutation.
    const text = value => value.toString('utf8').replaceAll('\r\n', '\n')
    assert.equal(text(bytes), text(git('show', `${DELIVERY_BASELINE}:${row.path}`)), `${row.path}: public text unchanged`)
  } else assert.equal(gitBlob(bytes), row.blob, `${row.path}: no unapproved bytes changed/deleted`)
  expectedPublic.push(row.path)
  if (row.path.startsWith('app/public/audio/')) audio++
  if (row.path.startsWith('app/public/assets/ct-sequences/')) atlases++
}
assert.equal(atlases, 12)
assert(audio > 80)
function filesAt(path) {
  return readdirSync(new URL(path + '/', DELIVERY_ROOT), { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? filesAt(`${path}/${entry.name}`) : [`${path}/${entry.name}`])
}
const actualPublic = filesAt('app/public')
assertDirectorDayVoiceLive()
expectedPublic.push(DIRECTOR_DAY_AUDIO)
assertDayCasesLive()
expectedPublic.push(DAY_CASES_IMAGE)
assert.deepEqual(actualPublic.sort(), expectedPublic.sort(), 'Actual public inventory: no forgotten originals, stale cache or unreviewed deletion/addition')
const publicBytes = actualPublic.reduce((sum, path) => sum + statSync(new URL(path, DELIVERY_ROOT)).size, 0)
assert(publicBytes <= 40 * 1024 * 1024, 'Actual complete public delivery <=40 MiB')
console.log(`PASS delivery LIVE data: 197 actual files (193 lossy, one visible-RGB-lossless, three byte-exact numerical); ${alphaPixels} exact alpha pixels; ${exactRgba} exact full-RGBA files; ${imageBytes} image bytes; ${publicBytes} public bytes; ${audio} unchanged audio and 12 unchanged atlases; ${Object.keys(previews).length} correct inline previews`)
