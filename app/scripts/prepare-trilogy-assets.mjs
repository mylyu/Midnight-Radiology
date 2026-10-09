/** Mechanical encoding/import only; all artwork is generated and reviewed separately. */
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import path from 'node:path'
import sharp from 'sharp'
import assert from 'node:assert/strict'

const app = process.cwd(), [listPath, outputPath, importFlag] = process.argv.slice(2)
assert(listPath && outputPath, 'Usage: node scripts/prepare-trilogy-assets.mjs jobs.json external-output [--import-reviewed]')
const jobs = JSON.parse(await readFile(listPath, 'utf8'))
const output = path.resolve(outputPath)
assert(!output.startsWith(path.resolve(app, 'public') + path.sep), 'Originals/reports must stay outside deployed public/')
await mkdir(output, { recursive: true })
const hash = buffer => createHash('sha256').update(buffer).digest('hex')
const rows = []
for (const job of jobs) {
  assert(/^[a-z][a-z0-9_]+$/.test(job.id), 'Invalid logical ID')
  const source = path.resolve(job.source), original = await readFile(source), metadata = await sharp(original).metadata()
  const destination = path.join(output, `${job.id}.webp`)
  let encoded = original
  if (path.extname(source).toLowerCase() !== '.webp') {
    let image = sharp(original)
    if (job.role === 'portrait') image = image.resize({ width: 512, height: 768, fit: 'inside', kernel: 'nearest' })
    if (job.role === 'scan') image = image.resize({ width: 512, height: 512, fit: 'inside' })
    encoded = await image.webp({ quality: 78, alphaQuality: 100, effort: 6 }).toBuffer()
  }
  assert(encoded.length <= 614400, `${job.id} exceeds per-image budget`)
  await writeFile(destination, encoded)
  const decoded = await sharp(encoded).metadata()
  const row = { ...job, sourceSha256: hash(original), sourceBytes: original.length,
    sourceDimensions: [metadata.width, metadata.height], encodedSha256: hash(encoded), encodedBytes: encoded.length,
    dimensions: [decoded.width, decoded.height], hasAlpha: decoded.hasAlpha, encodedPath: destination }
  if (importFlag === '--import-reviewed') {
    const catalog = JSON.parse(await readFile(path.join(app, 'src/lib/image-assets.catalog.json'), 'utf8'))
    const args = ['scripts/import-image.mjs', destination, job.id, '--keep-webp', ...(catalog[job.id] ? ['--replace'] : [])]
    const result = spawnSync(process.execPath, args, { cwd: app, encoding: 'utf8' })
    assert.equal(result.status, 0, result.stderr || result.stdout)
    row.import = JSON.parse(result.stdout)
    // Recoverable archive of exact, verified orphan candidates. Never glob/delete.
    for (const relative of row.import.stalePathCandidates ?? []) {
      const candidate = path.resolve(app, '..', relative)
      const intended = path.resolve(app, 'public/assets/media') + path.sep
      assert(candidate.startsWith(intended), `Refuse out-of-scope archive: ${candidate}`)
      const current = JSON.parse(await readFile(path.join(app, 'src/lib/image-assets.catalog.json'), 'utf8'))
      assert(!Object.values(current).includes(path.relative(path.join(app, 'public/assets'), candidate).split(path.sep).join('/')), 'Candidate remains referenced')
      await mkdir(path.join(output, 'previous'), { recursive: true })
      await rename(candidate, path.join(output, 'previous', path.basename(candidate)))
    }
  }
  rows.push(row)
  console.log(`${job.id}: ${encoded.length} bytes ${decoded.width}x${decoded.height}`)
}
await writeFile(path.join(output, 'encoding-import-results.json'), JSON.stringify(rows, null, 2) + '\n')
