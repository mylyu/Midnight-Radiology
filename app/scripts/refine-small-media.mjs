/** Second bounded pass: smaller portrait/prop delivery, always from the baseline. */
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { createHash } from 'node:crypto'
const stage = path.resolve(process.argv[2])
const reportFile = path.join(stage, 'report.json')
const report = JSON.parse(await readFile(reportFile, 'utf8'))
const sha = b => createHash('sha256').update(b).digest('hex')
let changed = 0
for (const row of report.images) {
  if (row.kept || /^(bg_|ct_|xray_|img_dsa)|ch2_(ct_|needle_|lung_|aorta_|dawn_window|remote_rack|bg_)/.test(row.id)) continue
  const portrait = /^(char_|pat_)|ch2_(pixel_|patient_|pat_)/.test(row.id)
  const edge = portrait ? 768 : 640
  const original = await readFile(path.join(stage, 'originals', row.id + path.extname(row.previous)))
  assert.equal(sha(original), row.beforeHash)
  const resized = await sharp(original).resize({ width: edge, height: edge, fit: 'inside', withoutEnlargement: true }).png().toBuffer()
  const next = await sharp(resized).webp({ quality: 68, alphaQuality: 100, effort: 6 }).toBuffer()
  if (next.length >= row.afterBytes) continue
  const meta = await sharp(next).metadata()
  const alpha = b => sharp(b).ensureAlpha().extractChannel(3).raw().toBuffer()
  assert((await alpha(resized)).equals(await alpha(next)), row.id + ' alpha')
  await writeFile(row.source, next)
  Object.assign(row, { afterBytes: next.length, afterHash: sha(next), width: meta.width, height: meta.height,
    resized: meta.width !== row.beforeWidth || meta.height !== row.beforeHeight, quality: 68, refinementMaxEdge: edge })
  changed++
}
const saved = report.images.reduce((n,r) => n + r.beforeBytes - r.afterBytes, 0)
report.estimatedPublicAfter = report.publicBefore - saved
report.estimatedDistAfter = report.estimatedPublicAfter + 1100000
await writeFile(reportFile, JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify({ refined: changed, publicAfter: report.estimatedPublicAfter, distEstimate: report.estimatedDistAfter }, null, 2))
