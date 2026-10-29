// Current image contract: catalog, report and actual bytes; no historical total.
// node --import tsx tests/image-delivery-current.mjs
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import sharp from 'sharp'

const readJson = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))
const catalog = readJson('../src/lib/image-assets.catalog.json')
const generated = readJson('../src/lib/image-assets.generated.json')
const report = readJson('../image-delivery-report.json')
const numerical = new Set(['ct_head_hema', 'ct_lung', 'ct_wrist_simulated'])
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')

assert.deepEqual(generated, catalog, 'Generated compatibility mapping mirrors the current canonical catalog')
assert.equal(report.pipeline, 'canonical-webp-q78-alpha100-v1')
assert.equal(report.count, Object.keys(catalog).length)
assert.equal(report.count, report.images.length)
assert.equal(new Set(report.images.map(row => row.name)).size, report.images.length)
assert.equal(new Set(Object.values(catalog)).size, Object.keys(catalog).length)
assert.deepEqual(report.images.map(row => row.name).sort(), Object.keys(catalog).sort())

const rows = new Map(report.images.map(row => [row.name, row]))
const deliveryPaths = new Set(Object.values(catalog))
let deliveredBytes = 0
for (const [name, relative] of Object.entries(catalog)) {
  const row = rows.get(name)
  assert(row, `${name}: current report entry exists`)
  const bytes = readFileSync(new URL(`../public/assets/${relative}`, import.meta.url))
  const hash = sha256(bytes)
  const metadata = await sharp(bytes).metadata()
  assert.equal(row.path, relative, `${name}: report path matches runtime catalog`)
  assert.equal(row.deliveryHash, hash, `${name}: actual bytes match the report`)
  assert.equal(row.deliveredBytes, bytes.length)
  assert.equal(row.width, metadata.width)
  assert.equal(row.height, metadata.height)
  if (numerical.has(name)) {
    assert.equal(relative, `${name}.png`)
    assert.equal(row.status, 'numerical-gray-unchanged')
  } else {
    assert.match(relative, /^media\/[\w-]+\.[a-f0-9]{16}\.webp$/)
    assert(relative.includes(`.${hash.slice(0, 16)}.webp`), `${name}: content-addressed path is current`)
    assert.equal(row.status, 'canonical-webp')
    assert.equal(metadata.format, 'webp')
    assert(bytes.length <= 600 * 1024, `${name}: 600 KiB image budget`)
  }
  deliveredBytes += bytes.length
}
assert.equal(report.deliveredBytes, deliveredBytes)
assert.equal(report.optimized, report.images.filter(row => row.status === 'canonical-webp').length)
assert.equal(report.optimized + numerical.size, report.count)
for (const file of readdirSync(new URL('../public/assets/media/', import.meta.url))) {
  assert(deliveryPaths.has(`media/${file}`), `Unused compressed asset: media/${file}`)
}
for (const name of ['bg_day', 'bg_office_day', 'bg_waiting']) {
  const row = rows.get(name)
  assert.equal(row.status, 'canonical-webp')
  assert.deepEqual([row.width, row.height], [2048, 1152], `${name}: reviewed scene dimensions`)
}
console.log(JSON.stringify({ status: 'passed', contract: 'current-live-images',
  count: report.count, optimized: report.optimized, numerical: numerical.size, deliveredBytes: report.deliveredBytes }))
