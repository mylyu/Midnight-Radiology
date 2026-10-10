/** Count actual Pages artifact bytes, not ZIP/gzip size or only the media folder. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, readdir, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
// 2026-09-27: author approved full-resolution backgrounds (~16.48 MB total).
// The LDCT sample has no new whole-package cap. Original/shared content keeps
// its approved limit; only explicitly LDCT-owned, independently loaded media
// is excluded. Only provenance-verified, separately emitted Chapters 3–5 story
// chunks may additionally use the new-chapter increment. Shared/unknown code,
// metadata itself and unregistered files remain under the unchanged base cap.
export const budgetBytes = 17000000
const trilogyStorySources = new Set(['src/game/ch3.ts', 'src/game/ch4.ts', 'src/game/ch5.ts', 'src/game/trilogy-registry.ts'])

/** Optional build evidence preserves the original two-argument report API.
 * Every rejected/missing record remains protected; hashes come from artifact
 * bytes, separately from the Rollup-emitted metadata. Filename never grants an
 * exemption, and entry/App/index/shared chunks are denied even if mislabelled.
 */
export function verifiedTrilogyCode(files, build) {
  const metadata = build?.metadata, hashes = build?.sha256ByFile
  if (!metadata) return { bytes: 0, paths: [], metadataStatus: 'missing' }
  if (metadata.version !== 1 || metadata.kind !== 'rollup-output-chunks' || !metadata.chunks
      || typeof metadata.chunks !== 'object' || Array.isArray(metadata.chunks)) return { bytes: 0, paths: [], metadataStatus: 'invalid' }
  const paths = []
  for (const [file, entry] of Object.entries(metadata.chunks)) {
    if (!entry || typeof entry !== 'object' || entry.type !== 'chunk' || entry.isEntry !== false || entry.isDynamicEntry !== true) continue
    if (!/^assets\/[^/]+\.js$/.test(file) || /^(?:index|app|shared)(?:[._-]|$)/i.test(path.posix.basename(file))) continue
    if (!Array.isArray(entry.modules) || entry.modules.length === 0 || !entry.modules.every(id => trilogyStorySources.has(id))) continue
    if (!files.has(file) || files.get(file) !== entry.bytes || !/^[a-f0-9]{64}$/.test(entry.sha256 ?? '') || hashes?.get(file) !== entry.sha256) continue
    paths.push(file)
  }
  return { bytes: paths.reduce((sum, file) => sum + files.get(file), 0), paths: paths.sort(), metadataStatus: 'verified' }
}

export function deliverySizeReport(files, manifest, build) {
  const groups = { images: 0, numericalPng: 0, audio: 0, codeAndOther: 0 }
  const originalPaths = new Set(Object.entries(manifest.chapters)
    .filter(([chapter]) => !['ldct', 'ch3', 'ch4', 'ch5'].includes(chapter)).flatMap(([, paths]) => paths))
  const ldctExclusive = new Set((manifest.chapters.ldct ?? []).filter(file =>
    !originalPaths.has(file) && /^(?:assets\/media|audio)\/ldct[_-]/.test(file)))
  let ldctExclusiveBytes = 0
  const trilogyExclusive = new Set(['ch3', 'ch4', 'ch5'].flatMap(chapter => manifest.chapters[chapter] ?? [])
    .filter(file => !originalPaths.has(file) && !ldctExclusive.has(file)
      && /^(?:assets\/media\/[^/]+\.(?:webp|png)|audio\/[^/]+\.(?:mp3|ogg|wav))$/.test(file)))
  let trilogyExclusiveBytes = 0
  for (const [file, bytes] of files) {
    const category = /\.webp$/.test(file) ? 'images' : /\.png$/.test(file) ? 'numericalPng' : /\.(mp3|ogg|wav)$/.test(file) ? 'audio' : 'codeAndOther'
    groups[category] += bytes
    if (ldctExclusive.has(file)) {
      assert.equal(bytes, manifest.assets[file]?.bytes, `LDCT artifact/manifest size mismatch: ${file}`)
      ldctExclusiveBytes += bytes
    }
    if (trilogyExclusive.has(file)) {
      assert.equal(bytes, manifest.assets[file]?.bytes, `New chapter artifact/manifest size mismatch: ${file}`)
      trilogyExclusiveBytes += bytes
    }
  }
  for (const file of ldctExclusive) assert(files.has(file), `Missing LDCT artifact: ${file}`)
  for (const file of trilogyExclusive) assert(files.has(file), `Missing new chapter artifact: ${file}`)
  const code = verifiedTrilogyCode(files, build)
  // Explicit code evidence cannot double-count a registered media exemption.
  const codePaths = code.paths.filter(file => !trilogyExclusive.has(file) && !ldctExclusive.has(file))
  const trilogyExclusiveCodeBytes = codePaths.reduce((sum, file) => sum + files.get(file), 0)
  const trilogyExclusiveMediaBytes = trilogyExclusiveBytes
  trilogyExclusiveBytes += trilogyExclusiveCodeBytes
  const totalBytes = Object.values(groups).reduce((a, b) => a + b, 0)
  const chapterBytes = Object.fromEntries(Object.entries(manifest.chapters).map(([chapter, paths]) => [chapter,
    [...new Set([...manifest.chapters.shell, ...paths])].reduce((sum, file) => sum + manifest.assets[file].bytes, 0)]))
  return { files: files.size, ...groups, totalBytes, decimalMB: +(totalBytes / 1e6).toFixed(3),
    ldctExclusiveBytes, trilogyExclusiveBytes, trilogyExclusiveMediaBytes, trilogyExclusiveCodeBytes,
    trilogyExclusiveCodeFiles: codePaths, codeSourceMetadataStatus: code.metadataStatus,
    protectedBaseBytes: totalBytes - ldctExclusiveBytes - trilogyExclusiveBytes, budgetBytes, chapterBytes }
}

export function assertDeliveryBudget(report) {
  assert(report.protectedBaseBytes < budgetBytes,
    'Original/shared Pages content exceeds its 17 MB budget. Only separately admitted LDCT/Chapters 3–5 media and source-verified dedicated dynamic trilogy story code are exempt; App/shared/index/unknown files remain protected.')
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dist = path.join(appRoot, 'dist')
  const files = new Map()
  const sha256ByFile = new Map()
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name)
      if (entry.isDirectory()) { await walk(file); continue }
      files.set(path.relative(dist, file).split(path.sep).join('/'), (await stat(file)).size)
      if (/\.js$/.test(file)) sha256ByFile.set(path.relative(dist, file).split(path.sep).join('/'), createHash('sha256').update(await readFile(file)).digest('hex'))
    }
  }
  await walk(dist)
  const manifest = JSON.parse(await readFile(path.join(appRoot, 'src/lib/media-manifest.generated.json'), 'utf8'))
  let metadata
  try { metadata = JSON.parse(await readFile(path.join(dist, 'chunk-sources.generated.json'), 'utf8')) }
  catch { metadata = undefined } // No evidence is never permission to exclude code.
  const report = deliverySizeReport(files, manifest, { metadata, sha256ByFile })
  console.log(JSON.stringify(report, null, 2))
  assertDeliveryBudget(report)
}
