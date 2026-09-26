/** Author-approved delivery compression. Stages outside the repo; never changes sources. */
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sha = b => createHash('sha256').update(b).digest('hex')
const catalog = JSON.parse(await readFile(path.join(app, 'src/lib/image-assets.catalog.json'), 'utf8'))
const stage = await import('node:fs/promises').then(fs => fs.mkdtemp(path.join(os.tmpdir(), 'midnight-media-small-')))
await mkdir(path.join(stage, 'images'))
await mkdir(path.join(stage, 'originals'))
const rows = []
const protectedImage = id => ['ct_head_hema', 'ct_lung', 'ct_wrist_simulated', 'stamp'].includes(id)
  || id.startsWith('ev_') || id.startsWith('ch2_ct_motion_') || id === 'ch2_needle_record_v1' || id === 'item_zhou_key_fixed'
for (const [id, relative] of Object.entries(catalog)) {
  const source = await readFile(path.join(app, 'public/assets', relative))
  const meta = await sharp(source).metadata()
  await writeFile(path.join(stage, 'originals', id + path.extname(relative)), source)
  const background = id.startsWith('bg_') || /dawn_window|remote_rack/.test(id)
  const medical = /^(ct_|xray_|img_dsa)|ch2_(ct_|needle_(axial|mpr|vr)|lung_|aorta_)/.test(id)
  const longest = background ? 1280 : medical ? 1024 : 1024
  let encoded = source, quality = null, resized = false
  if (!protectedImage(id)) {
    for (const q of medical ? [72, 66] : [68, 62, 56]) {
      const pipeline = sharp(source).resize({ width: longest, height: longest, fit: 'inside', withoutEnlargement: true, kernel: 'lanczos3' })
      const candidate = await pipeline.webp({ quality: q, alphaQuality: 100, effort: 6 }).toBuffer()
      if (candidate.length < encoded.length) { encoded = candidate; quality = q }
      if (encoded.length <= (medical ? 110000 : 80000)) break
    }
  }
  const after = await sharp(encoded).metadata()
  resized = meta.width !== after.width || meta.height !== after.height
  assert.equal(meta.hasAlpha, after.hasAlpha, id + ': transparency removed')
  assert(Math.abs(meta.width / meta.height - after.width / after.height) < .003, id + ': aspect ratio')
  // Lossless alpha relative to the selected resize, not a claim that resized pixels match originals.
  const alpha = async buffer => sharp(buffer).resize({ width: after.width, height: after.height, fit: 'fill', kernel: 'lanczos3' }).ensureAlpha().extractChannel(3).raw().toBuffer()
  assert((await alpha(source)).equals(await alpha(encoded)), id + ': alpha encoder changed')
  const out = path.join(stage, 'images', id + path.extname(relative))
  await writeFile(out, encoded)
  rows.push({ id, previous: relative, beforeHash: sha(source), afterHash: sha(encoded), beforeBytes: source.length,
    afterBytes: encoded.length, beforeWidth: meta.width, beforeHeight: meta.height, width: after.width, height: after.height,
    alpha: meta.hasAlpha, alphaExactAfterResize: true, resized, quality, kept: encoded.equals(source), source: out })
  if (rows.length % 25 === 0) console.log(`Staged ${rows.length}/${Object.keys(catalog).length}`)
}
const sumFiles = async dir => {
  let sum = 0
  for (const file of await readdir(dir, { withFileTypes: true })) sum += file.isDirectory() ? await sumFiles(path.join(dir, file.name)) : (await stat(path.join(dir, file.name))).size
  return sum
}
const publicBefore = await sumFiles(path.join(app, 'public'))
const saved = rows.reduce((n, r) => n + r.beforeBytes - r.afterBytes, 0)
const report = { baseline: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: app, encoding: 'utf8' }).trim(),
  stage, encoder: sharp.versions, publicBefore, estimatedPublicAfter: publicBefore - saved,
  estimatedDistAfter: publicBefore - saved + 1100000, images: rows }
await writeFile(path.join(stage, 'report.json'), JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify({ stage, images: rows.length, changed: rows.filter(r => !r.kept).length,
  before: rows.reduce((n,r)=>n+r.beforeBytes,0), after: rows.reduce((n,r)=>n+r.afterBytes,0),
  publicAfter: report.estimatedPublicAfter, distEstimate: report.estimatedDistAfter }, null, 2))
