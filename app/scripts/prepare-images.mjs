/** Validate the canonical small assets. Builds need neither Git history nor original artwork. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const assetDir = path.join(root, 'public/assets')
const catalog = JSON.parse(await readFile(path.join(root, 'src/lib/image-assets.catalog.json'), 'utf8'))
const rawImages = new Set(['ct_head_hema', 'ct_lung', 'ct_wrist_simulated'])
const sha = buffer => createHash('sha256').update(buffer).digest('hex')
const entries = await readdir(assetDir)
assert(!entries.includes('optimized') || (await readdir(path.join(assetDir, 'optimized'))).length === 0,
  'Obsolete assets/optimized cache would bloat the build. Remove that generated cache before building.')
assert(entries.filter(file => file.endsWith('.png')).every(file => rawImages.has(file.slice(0, -4))),
  'Unregistered original PNG in public/assets. Use scripts/import-image.mjs; keep source artwork outside public.')
const paths = new Set(Object.values(catalog))
assert.equal(paths.size, Object.keys(catalog).length, 'Each logical image has its own canonical asset')
const images = []
for (const [name, relative] of Object.entries(catalog)) {
  assert(/^[a-zA-Z0-9_-]+$/.test(name), `Invalid image ID: ${name}`)
  assert(rawImages.has(name) ? relative === `${name}.png` : /^media\/[\w-]+\.[a-f0-9]{16}\.webp$/.test(relative), `Invalid image path: ${relative}`)
  const buffer = await readFile(path.join(assetDir, relative))
  const metadata = await sharp(buffer).metadata()
  if (!rawImages.has(name)) {
    assert(relative.includes(`.${sha(buffer).slice(0, 16)}.webp`), `Stale content hash: ${relative}`)
    assert(buffer.length <= 600 * 1024, `Image exceeds 600 KiB budget: ${relative}`)
  }
  images.push({ name, path: relative, deliveryHash: sha(buffer), deliveredBytes: buffer.length,
    width: metadata.width, height: metadata.height, status: rawImages.has(name) ? 'numerical-gray-unchanged' : 'canonical-webp' })
}
for (const name of rawImages) assert(catalog[name] === `${name}.png`, `Numerical source missing: ${name}`)
for (const file of await readdir(path.join(assetDir, 'media'))) {
  assert(paths.has(`media/${file}`), `Unused compressed asset would bloat delivery: media/${file}. Review and remove obsolete versions.`)
}
const deliveredBytes = images.reduce((sum, item) => sum + item.deliveredBytes, 0)
assert(deliveredBytes <= 30 * 1048576, 'Artwork exceeds the 30 MiB delivery budget')
// Historical local previews still read this generated mapping. Production imports the tracked catalog.
await writeFile(path.join(root, 'src/lib/image-assets.generated.json'), `${JSON.stringify(catalog, null, 2)}\n`)
await writeFile(path.join(root, 'image-delivery-report.json'), `${JSON.stringify({ pipeline: 'canonical-webp-q78-alpha100-v1',
  count: images.length, optimized: images.length - rawImages.size, deliveredBytes, images }, null, 2)}\n`)
console.log(`Canonical image delivery: ${images.length} logical IDs, ${(deliveredBytes / 1048576).toFixed(2)} MiB; no original/cache duplicates.`)
