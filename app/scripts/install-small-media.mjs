/** Publish only an explicitly reviewed staging report; preserve old files outside public. */
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir, copyFile, unlink } from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { setTimeout } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repo = path.dirname(app)
assert.equal(process.argv[3], '--apply-reviewed', 'Review comparison sheets first; pass --apply-reviewed explicitly.')
const stage = path.resolve(process.argv[2])
assert(!stage.startsWith(repo + path.sep), 'Staging and backups must be outside the repository')
const report = JSON.parse(await readFile(path.join(stage, 'report.json'), 'utf8'))
const audioReport = process.argv.includes('--with-audio') ? JSON.parse(await readFile(path.join(stage, 'audio-report.json'), 'utf8')) : null
assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim(), report.baseline, 'Baseline moved')
const sha = b => createHash('sha256').update(b).digest('hex')
const catalogFile = path.join(app, 'src/lib/image-assets.catalog.json')
const originalCatalog = JSON.parse(await readFile(catalogFile, 'utf8'))
const changes = report.images.filter(r => !r.kept)
// Validate every source before starting, not after a partially applied batch.
for (const row of changes) {
  assert(/^media\/[a-z0-9_]+\.[a-f0-9]{16}\.webp$/.test(row.previous))
  const next = `media/${row.id}.${row.afterHash.slice(0,16)}.webp`
  assert([row.previous, next].includes(originalCatalog[row.id]), 'Unexpected catalog change; refusing to resume')
  if (originalCatalog[row.id] === next) assert.equal(sha(await readFile(path.join(app, 'public/assets', next))), row.afterHash)
  assert.equal(sha(await readFile(path.join(app, 'public/assets', row.previous))), row.beforeHash)
  assert.equal(path.resolve(row.source), path.join(stage, 'images', row.id + '.webp'))
  assert.equal(sha(await readFile(row.source)), row.afterHash)
}
for (const row of audioReport?.audio ?? []) {
  assert(/^[a-zA-Z0-9_-]+\.mp3$/.test(row.name))
  assert.equal(sha(await readFile(path.join(app, 'public/audio', row.name))), row.beforeHash)
  assert.equal(sha(await readFile(path.join(stage, 'audio', row.name))), row.afterHash)
  assert(row.metrics.ok)
}
const oldFiles = [], imported = []
for (const row of changes) {
  if (originalCatalog[row.id] !== row.previous) {
    oldFiles.push(`app/public/assets/${row.previous}`)
    imported.push({ id: row.id, resumed: true })
    continue
  }
  let result
  for (let attempt = 0; ; attempt++) {
    try {
      result = JSON.parse(execFileSync(process.execPath, [path.join(app, 'scripts/import-image.mjs'), row.source, row.id, '--replace', '--keep-webp'],
        { cwd: app, encoding: 'utf8', windowsHide: true }))
      break
    } catch (error) {
      // Windows file scanners can briefly lock the catalog. The importer rolls
      // back previews and releases its lock; retry only this specific failure.
      if (attempt >= 2 || !String(error.stderr).includes('EPERM: operation not permitted, rename')) throw error
      await setTimeout(500)
    }
  }
  assert.equal(result.deliverySha256, row.afterHash)
  assert.equal(result.previousDeliveryPath, row.previous)
  oldFiles.push(...result.stalePathCandidates)
  imported.push({ id: row.id, path: result.deliveryPath, hash: result.deliverySha256 })
  if (imported.length % 25 === 0) console.log(`Imported ${imported.length}/${changes.length}`)
}
const current = JSON.parse(await readFile(catalogFile, 'utf8'))
const backup = path.join(stage, 'retired-delivery')
await mkdir(backup)
for (const old of oldFiles) {
  assert(/^app\/public\/assets\/media\/[a-z0-9_]+\.[a-f0-9]{16}\.webp$/.test(old))
  assert(!Object.values(current).includes(old.slice('app/public/assets/'.length)), 'Old path still referenced')
  const source = path.resolve(repo, old)
  assert(source.startsWith(path.join(app, 'public/assets/media') + path.sep))
  // These exact reviewed paths are tracked at the baseline and backed up before deletion.
  execFileSync('git', ['ls-files', '--error-unmatch', old], { cwd: repo, stdio: 'pipe', windowsHide: true })
  const destination = path.join(backup, path.basename(old))
  await copyFile(source, destination)
  assert.equal(sha(await readFile(source)), sha(await readFile(destination)))
  await unlink(source)
}
for (const row of audioReport?.audio ?? []) {
  if (row.kept) continue
  assert.equal(sha(await readFile(path.join(stage, 'originals/audio', row.name))), row.beforeHash)
  await copyFile(path.join(stage, 'audio', row.name), path.join(app, 'public/audio', row.name))
}
const audioSaved = (audioReport?.audio ?? []).reduce((n,r) => n + r.beforeBytes - r.afterBytes, 0)
const audit = { baseline: report.baseline, pipeline: 'small-media-20260926-v1', encoder: report.encoder,
  policy: 'Eligible backgrounds <=1280, medical <=1024, portraits <=768 and props <=640 where smaller; alpha100. Protected originals and atlases unchanged. Per-file dimensions/quality are authoritative.',
  images: report.images.map(({ source, ...row }) => ({ ...row, delivery: current[row.id] })),
  publicBefore: report.publicBefore, publicAfter: report.estimatedPublicAfter - audioSaved,
  audioChanged: audioSaved > 0, audioReview: audioReport, retiredFiles: oldFiles }
await writeFile(path.join(repo, 'docs/media-compression-20260926.json'), JSON.stringify(audit, null, 2) + '\n')
console.log(JSON.stringify({ imported: changes.length, retired: oldFiles.length, backup, audit: 'docs/media-compression-20260926.json' }))
