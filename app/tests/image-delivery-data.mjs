import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import './game-delivery-data.mjs'
import { beforeGameDeliverySource } from './game-delivery-projection.mjs'
import { deliveryManifest, liveMedia, sha256 } from './game-delivery-media.mjs'
import { DAY_CASES_WRIST, DAY_CASES_IMAGE_BYTES, assertDayCasesImage } from './ch2-day-cases-projection.mjs'
import { ctaCharactersLedger, assertCtaCharactersMedia } from './ch2-cta-characters-projection.mjs'
// Historical cache-recovery behavior is retained behind an exact checked
// inverse of the live pipeline, never by loading old source as current code.
const pipeline = beforeGameDeliverySource('app/scripts/prepare-images.mjs', readFileSync(new URL('../scripts/prepare-images.mjs', import.meta.url), 'utf8'))
const ast = ts.createSourceFile('prepare-images.mjs', pipeline, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
const cacheReader = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'readJson')?.getText(ast)
assert(cacheReader)
for (const text of ['{broken', 'null', '[]', '{"images":{}}']) {
  const read = new Function('readFile', `${cacheReader}; return readJson`)(async () => text)
  assert.deepEqual(await read('generated-report'), {}, 'Invalid generated caches must rebuild rather than block startup')
}
const readMissing = new Function('readFile', `${cacheReader}; return readJson`)(async () => { throw new Error('ENOENT') })
assert.deepEqual(await readMissing('generated-report'), {})
const readValid = new Function('readFile', `${cacheReader}; return readJson`)(async () => '{"images":[],"pipeline":"test"}')
assert.deepEqual(await readValid('generated-report'), {images:[],pipeline:'test'})
// The author explicitly superseded the old >150 lossless-derivative policy:
// exactly 193 named images are lossy, one small-text image lossless and three
// numerical PNGs byte-exact. The imported LIVE audit checks each actual file's
// alpha, dimensions, pixels, budgets and reviewed identities without a wildcard.
const report = JSON.parse(readFileSync(new URL('../image-delivery-report.json', import.meta.url), 'utf8'))
const generated = JSON.parse(readFileSync(new URL('../src/lib/image-assets.generated.json', import.meta.url), 'utf8'))
const catalog = JSON.parse(readFileSync(new URL('../src/lib/image-assets.catalog.json', import.meta.url), 'utf8'))
const reviewed = deliveryManifest()
assert.deepEqual(generated, catalog, 'Legacy preview mapping mirrors canonical paths, no old PNG fallback')
const newImages = ctaCharactersLedger().media.filter(row => row.kind === 'image')
assert.equal(report.count, 200); assert.equal(report.optimized, 197)
assert.equal(report.images.length, 200)
assert.equal(report.deliveredBytes, reviewed.stats.deliveredImageBytes + DAY_CASES_IMAGE_BYTES + newImages.reduce((sum, row) => sum + row.bytes, 0))
assert.equal(report.pipeline, 'canonical-webp-q78-alpha100-v1')
for (const row of report.images) {
  const ctaImage = newImages.find(image => image.name === row.name)
  if (ctaImage) {
    const bytes = assertCtaCharactersMedia(row.name)
    assert.equal(row.path, catalog[row.name]); assert.equal(row.deliveryHash, sha256(bytes))
    assert.equal(row.deliveredBytes, bytes.length); assert.equal(row.status, 'canonical-webp')
    assert.deepEqual([row.width, row.height], row.name === 'ch2_aorta_volume_cutaway_v1' ? [1254, 1254] : [1536, 1024])
    continue // Only the two separately pinned CTA/character images, never a wildcard.
  }
  if (row.name === DAY_CASES_WRIST) {
    const bytes = assertDayCasesImage()
    assert.equal(row.path, catalog[row.name]); assert.equal(row.deliveryHash, sha256(bytes))
    assert.equal(row.deliveredBytes, bytes.length); assert.equal(row.width, 768); assert.equal(row.height, 768)
    assert.equal(row.status, 'canonical-webp')
    continue // Only this independently pinned addition; the old 197 retain their old identities.
  }
  const entry = reviewed.images.find(image => image.name === row.name)
  assert(entry, 'No unreviewed generated report entry')
  const { bytes } = liveMedia(entry.sourcePath)
  assert.equal(row.path, catalog[row.name])
  assert.equal(row.deliveryHash, sha256(bytes))
  assert.equal(row.deliveredBytes, bytes.length)
  assert.equal(row.width, entry.width); assert.equal(row.height, entry.height)
  assert.equal(row.status, entry.mode === 'raw-png' ? 'numerical-gray-unchanged' : 'canonical-webp')
}
console.log('PASS delivery compatibility: historical corrupt-cache recovery retained; all 197 original images, one pinned wrist and two pinned CTA/character images agree; numerical inputs exact')
