import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import sharp from 'sharp'
import ts from 'typescript'
const pipeline = readFileSync(new URL('../scripts/prepare-images.mjs', import.meta.url), 'utf8')
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
const report = JSON.parse(readFileSync(new URL('../image-delivery-report.json', import.meta.url), 'utf8'))
const manifest = JSON.parse(readFileSync(new URL('../src/lib/image-assets.generated.json', import.meta.url), 'utf8'))
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const raw = ['ct_head_hema', 'ct_lung', 'ct_wrist_simulated']
let pixelChecks = 0, backgroundChecks = 0, originalBytes = 0, deliveredBytes = 0
for (const row of report.images) {
  const original = readFileSync(new URL(`../public/assets/${row.name}.png`, import.meta.url))
  assert.equal(sha(original), row.sourceHash)
  originalBytes += original.length
  if (raw.includes(row.name)) {
    assert.equal(manifest[row.name], undefined, 'Numerical window/level inputs must not be rewritten')
    assert.equal(row.status, 'numerical-gray-unchanged')
  }
  if (!manifest[row.name]) { deliveredBytes += original.length; continue }
  assert.equal(manifest[row.name], row.path)
  assert.match(row.path, new RegExp(`^optimized/${row.name}\\.[a-f0-9]{16}\\.(webp|png)$`))
  const delivered = readFileSync(new URL(`../public/assets/${row.path}`, import.meta.url))
  assert.equal(sha(delivered), row.deliveryHash)
  assert(delivered.length < original.length)
  deliveredBytes += delivered.length
  const before = await sharp(original).ensureAlpha().raw().toBuffer({resolveWithObject:true})
  const after = await sharp(delivered).ensureAlpha().raw().toBuffer({resolveWithObject:true})
  assert.deepEqual(after.info, before.info, `${row.name}: no resized canvas or changed channels`)
  if (row.status === 'background-webp-q85') {
    assert(row.name.startsWith('bg_') || row.name.startsWith('ch2_dawn_window') || row.name === 'ch2_ct_motion_room_v1')
    assert(row.meanAbsoluteRgbError < 6, `${row.name}: background compression needs visual re-review if error grows`)
    backgroundChecks++
  } else {
    assert(before.data.equals(after.data), `${row.name}: non-background must have exactly identical RGBA`)
    pixelChecks++
  }
}
assert.equal(originalBytes, report.originalBytes)
assert.equal(deliveredBytes, report.deliveredBytes)
assert.equal(Object.keys(manifest).length, report.optimized)
assert.equal(backgroundChecks, 22)
assert(pixelChecks > 150)
console.log(`PASS image delivery: ${report.count} originals/hash checks, ${pixelChecks} exact RGBA derivatives, ${backgroundChecks} same-dimension backgrounds, three untouched numerical inputs, report totals and hashed paths verified`)
