// New independently reviewed outer layer. All historical hashes stay fixed.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const CTA_CHARACTERS_BASELINE = 'dadc208a703c01f5ffd70b70d2fa492e0f59a926'
const ledgerSha = '737e7fcb204e15804c2a2f7204145b62ca15d69432a27b7a2941d74888d1251e'
const edited = ['app/src/App.tsx', 'app/src/game/ch2-dawn.ts', 'app/src/game/ch2-needles.ts',
  'app/src/game/ch2-pacing.ts', 'app/src/game/ch2-patients.ts', 'app/src/game/ch2-payoffs.ts',
  'app/src/game/ch2-playback.ts', 'app/src/game/ch2.ts', 'app/src/lib/image-assets.catalog.json']
const added = ['app/src/game/ch2-observation-presentation.ts']
const root = new URL('../../', import.meta.url)
const read = path => readFileSync(new URL(path, root))
const norm = value => value.toString().replaceAll('\r\n', '\n').trimEnd() + '\n'
const sha = value => createHash('sha256').update(value).digest('hex')
const git = (...args) => execFileSync('git', args, { cwd: fileURLToPath(root), maxBuffer: 32e6 })
const originals = new Map()
const original = path => {
  if (!originals.has(path)) originals.set(path, norm(git('show', `${CTA_CHARACTERS_BASELINE}:${path}`)))
  return originals.get(path)
}
let ledger
export function ctaCharactersLedger() {
  if (ledger) return ledger
  const raw = norm(read('docs/ch2-cta-characters-source-deltas.json'))
  assert.equal(sha(raw), ledgerSha, 'CTA/characters source ledger: independently fixed review SHA')
  const review = JSON.parse(read('docs/ch2-cta-characters-review.json'))
  assert.equal(review.baseline, CTA_CHARACTERS_BASELINE)
  assert.equal(review.status, 'reviewed'); assert.equal(review.sourceDeltasSha256, ledgerSha)
  ledger = JSON.parse(raw)
  assert.equal(ledger.baseline, CTA_CHARACTERS_BASELINE)
  assert.deepEqual(ledger.files.map(row => row.path), edited)
  assert.deepEqual(ledger.added.map(row => row.path), added)
  assert.deepEqual(ledger.media.map(row => [row.name, row.kind, row.bytes]), [
    ['ch2_aorta_volume_cutaway_v1', 'image', 57982],
    ['ch2_patient_aorta_middle_bed', 'image', 137746],
    ['vox_ch2_luo_entrance_20260925', 'audio', 33453],
  ])
  for (const row of ledger.files) {
    assert.equal(row.beforeSha256, sha(original(row.path)))
    assert(row.edits.length, `${row.path}: explicit narrow hunks required`)
  }
  return ledger
}
export function beforeCtaCharactersSource(path, source) {
  if (!edited.includes(path)) return source
  const current = norm(source), before = original(path)
  if (current === before) return source // Exact independently known baseline only.
  const row = ctaCharactersLedger().files.find(row => row.path === path)
  assert.equal(sha(current), row.afterSha256, `${path}: undocumented mutation outside reviewed CTA/characters source`)
  const lines = current.trimEnd().split('\n')
  for (const edit of [...row.edits].reverse()) {
    assert.deepEqual(lines.slice(edit.afterStart, edit.afterStart + edit.after.length), edit.after,
      `${path}: undocumented mutation in CTA/characters hunk`)
    lines.splice(edit.afterStart, edit.after.length, ...edit.before)
  }
  const restored = lines.join('\n') + '\n'
  assert.equal(restored, before, `${path}: undocumented mutation outside CTA/characters hunks`)
  return restored
}
export function assertCtaCharactersSourceAdditions() {
  for (const row of ctaCharactersLedger().added) {
    assert.equal(sha(norm(read(row.path))), row.sha256, `${row.path}: undocumented mutation in new presentation module`)
  }
}
export function priorCtaCharactersSourcePaths(paths) {
  assertCtaCharactersSourceAdditions()
  return paths.filter(path => !added.includes(path))
}
export function assertCtaCharactersMedia(name, bytes) {
  const row = ctaCharactersLedger().media.find(row => row.name === name)
  assert(row, `${name}: no unreviewed media exception`)
  bytes ??= read(row.path)
  assert.equal(bytes.length, row.bytes, `${name}: reviewed media byte length`)
  assert.equal(sha(bytes), row.sha256, `${name}: reviewed media identity`)
  return bytes
}
export function priorCtaCharactersMediaPaths(paths) {
  const rows = ctaCharactersLedger().media
  for (const row of rows) assertCtaCharactersMedia(row.name)
  return paths.filter(path => !rows.some(row => row.path === path))
}
export function assertCtaCharactersLive() {
  for (const row of ctaCharactersLedger().files) {
    const current = norm(read(row.path))
    assert.equal(sha(current), row.afterSha256, `${row.path}: reviewed CTA/characters edit must actually be live`)
    assert.equal(norm(beforeCtaCharactersSource(row.path, current)), original(row.path))
  }
  assertCtaCharactersSourceAdditions()
  const catalog = JSON.parse(read('app/src/lib/image-assets.catalog.json'))
  for (const row of ctaCharactersLedger().media) {
    assertCtaCharactersMedia(row.name)
    if (row.kind === 'image') {
      assert.equal(catalog[row.name], row.path.replace('app/public/assets/', ''))
      assert.match(row.path, new RegExp(`/media/${row.name}\\.${row.sha256.slice(0, 16)}\\.webp$`))
      assert(row.bytes < 600 * 1024, 'Retain the original image delivery ceiling')
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assertCtaCharactersLive()
  const sourcePaths = git('ls-tree', '-r', '--name-only', CTA_CHARACTERS_BASELINE, '--', 'app/src').toString().trim().split('\n')
  let sources = 0, media = 0, voices = 0, probes = 0
  for (const path of sourcePaths) {
    assert.equal(norm(beforeCtaCharactersSource(path, read(path))), original(path), `${path}: no unrelated runtime change`)
    sources++
  }
  const currentSources = [...new Set(git('ls-files', '--cached', '--others', '--exclude-standard', '--', 'app/src')
    .toString().trim().split('\n'))].sort()
  assert.deepEqual(currentSources, [...sourcePaths, ...added].sort(), 'Only one reviewed new source module')
  const configs = ['app/package.json', 'app/package-lock.json', 'app/.gitignore', 'app/index.html', 'app/vite.config.ts',
    'app/tsconfig.json', 'app/tsconfig.app.json', '深夜影像科/全书剧情总线.md',
    ...git('ls-tree', '-r', '--name-only', CTA_CHARACTERS_BASELINE, '--', 'app/scripts').toString().trim().split('\n')]
  for (const path of configs) assert.equal(norm(read(path)), original(path), `${path}: config/bus unchanged`)
  const publicPaths = []
  for (const entry of git('ls-tree', '-r', '-z', CTA_CHARACTERS_BASELINE, '--', 'app/public').toString().split('\0').filter(Boolean)) {
    const [, expected, path] = /^\d+ blob ([0-9a-f]+)\t(.+)$/.exec(entry), bytes = read(path)
    if (/\.(?:html|svg|txt)$/.test(path)) assert.equal(norm(bytes), original(path))
    else assert.equal(createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'), expected, `${path}: old media unchanged`)
    publicPaths.push(path); media++; if (path.startsWith('app/public/audio/')) voices++
  }
  const filesAt = path => readdirSync(new URL(path + '/', root), { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? filesAt(`${path}/${entry.name}`) : [`${path}/${entry.name}`])
  assert.deepEqual(filesAt('app/public').sort(), [...publicPaths, ...ctaCharactersLedger().media.map(row => row.path)].sort(),
    'Exactly two new images and one new entrance voice; no hidden deletion or additions')
  for (const row of ctaCharactersLedger().files) {
    const live = norm(read(row.path))
    for (const edit of row.edits) {
      const lines = live.trimEnd().split('\n'), at = Math.min(edit.afterStart, lines.length - 1)
      lines[at] += ' // forbidden mutation'
      assert.throws(() => beforeCtaCharactersSource(row.path, lines.join('\n')), /undocumented mutation/); probes++
    }
    assert.throws(() => beforeCtaCharactersSource(row.path, live + '// forbidden append\n'), /undocumented mutation/); probes++
  }
  for (const row of ctaCharactersLedger().media) {
    const bad = Buffer.from(read(row.path)); bad[100] ^= 1
    assert.throws(() => assertCtaCharactersMedia(row.name, bad), /reviewed media identity/)
  }
  assert.deepEqual(priorCtaCharactersMediaPaths(['app/public/unreviewed.webp', ...ctaCharactersLedger().media.map(row => row.path)]), ['app/public/unreviewed.webp'])
  assert.deepEqual(priorCtaCharactersSourcePaths([...added, 'app/src/game/unreviewed.ts']), ['app/src/game/unreviewed.ts'])
  console.log(`PASS CTA/characters LIVE freeze: ${sources} prior runtime files, ${configs.length} configs/bus; ${media} old public files (${voices} voices) unchanged; 9 exact inversions/1 pinned module/2 images/1 MP3; ${probes} source mutations rejected`)
}
