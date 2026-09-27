/** Count actual Pages artifact bytes, not ZIP/gzip size or only the media folder. */
import assert from 'node:assert/strict'
import { readFile, readdir, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
// 2026-09-27: author approved full-resolution backgrounds (~16.48 MB total).
// The LDCT sample has no new whole-package cap. Original/shared content keeps
// its approved limit; only explicitly LDCT-owned, independently loaded media
// is excluded. App code, shared media and unregistered files remain protected.
export const budgetBytes = 17000000

export function deliverySizeReport(files, manifest) {
  const groups = { images: 0, numericalPng: 0, audio: 0, codeAndOther: 0 }
  const originalPaths = new Set(Object.entries(manifest.chapters)
    .filter(([chapter]) => chapter !== 'ldct').flatMap(([, paths]) => paths))
  const ldctExclusive = new Set((manifest.chapters.ldct ?? []).filter(file =>
    !originalPaths.has(file) && /^(?:assets\/media|audio)\/ldct[_-]/.test(file)))
  let ldctExclusiveBytes = 0
  for (const [file, bytes] of files) {
    const category = /\.webp$/.test(file) ? 'images' : /\.png$/.test(file) ? 'numericalPng' : /\.(mp3|ogg|wav)$/.test(file) ? 'audio' : 'codeAndOther'
    groups[category] += bytes
    if (ldctExclusive.has(file)) {
      assert.equal(bytes, manifest.assets[file]?.bytes, `LDCT artifact/manifest size mismatch: ${file}`)
      ldctExclusiveBytes += bytes
    }
  }
  for (const file of ldctExclusive) assert(files.has(file), `Missing LDCT artifact: ${file}`)
  const totalBytes = Object.values(groups).reduce((a, b) => a + b, 0)
  const chapterBytes = Object.fromEntries(Object.entries(manifest.chapters).map(([chapter, paths]) => [chapter,
    [...new Set([...manifest.chapters.shell, ...paths])].reduce((sum, file) => sum + manifest.assets[file].bytes, 0)]))
  return { files: files.size, ...groups, totalBytes, decimalMB: +(totalBytes / 1e6).toFixed(3),
    ldctExclusiveBytes, protectedBaseBytes: totalBytes - ldctExclusiveBytes, budgetBytes, chapterBytes }
}

export function assertDeliveryBudget(report) {
  assert(report.protectedBaseBytes < budgetBytes,
    'Original/shared Pages content exceeds its 17 MB budget. Only LDCT-exclusive registered media is exempt; do not refill old PNGs or degrade numerical CT data.')
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dist = path.join(appRoot, 'dist')
  const files = new Map()
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name)
      if (entry.isDirectory()) { await walk(file); continue }
      files.set(path.relative(dist, file).split(path.sep).join('/'), (await stat(file)).size)
    }
  }
  await walk(dist)
  const manifest = JSON.parse(await readFile(path.join(appRoot, 'src/lib/media-manifest.generated.json'), 'utf8'))
  const report = deliverySizeReport(files, manifest)
  console.log(JSON.stringify(report, null, 2))
  assertDeliveryBudget(report)
}
