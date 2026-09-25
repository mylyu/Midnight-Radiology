// Independently pinned current change. Old ledgers are never regenerated.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const DAY_CASES_BASELINE = 'b68923b9683b6a90dc946333ca05e248f998fb9a'
export const DAY_CASES_RETIRED = ['c2d2_8', 'c2d2_9a', 'c2d2_9b', 'c2d2_gut_scan', 'c2d2_10']
export const DAY_CASES_WRIST = 'ct_wrist_fracture_v2'
export const DAY_CASES_IMAGE = 'app/public/assets/media/ct_wrist_fracture_v2.698399ce035053ac.webp'
export const DAY_CASES_IMAGE_SHA = '698399ce035053ace6978775cc314848046db9730072a03d8381c6320c7caa3f'
export const DAY_CASES_IMAGE_BYTES = 361196
const ledgerSha = 'ab13efacd7929bcb7f0490480f371016212725dcd4a42a3eafed48ebbb1a7b16'
const paths = ['app/src/App.tsx', 'app/src/game/ch2-exploration.ts', 'app/src/game/ch2-ledger.ts',
  'app/src/game/ch2-observations.ts', 'app/src/game/ch2-pacing.ts', 'app/src/game/ch2-patients.ts',
  'app/src/game/ch2-playback.ts', 'app/src/game/ch2-scan-sequences.ts', 'app/src/game/ch2-scans.ts',
  'app/src/game/ch2.ts', 'app/src/lib/image-assets.catalog.json']
const root = new URL('../../', import.meta.url)
const read = path => readFileSync(new URL(path, root))
const normalize = value => value.toString().replaceAll('\r\n', '\n').trimEnd() + '\n'
const sha = value => createHash('sha256').update(value).digest('hex')
const git = (...args) => execFileSync('git', args, { cwd: fileURLToPath(root), maxBuffer: 32e6 })
const originals = new Map()
const original = path => {
  if (!originals.has(path)) originals.set(path, normalize(git('show', `${DAY_CASES_BASELINE}:${path}`)))
  return originals.get(path)
}
let ledger
export function dayCasesLedger() {
  if (ledger) return ledger
  const raw = normalize(read('docs/ch2-day-cases-source-deltas.json'))
  assert.equal(sha(raw), ledgerSha, 'Day-case source ledger: independently fixed review hash')
  const review = JSON.parse(read('docs/ch2-day-cases-review.json'))
  assert.equal(review.baseline, DAY_CASES_BASELINE); assert.equal(review.status, 'reviewed')
  assert.equal(review.sourceDeltasSha256, ledgerSha)
  assert.equal(review.asset.path, DAY_CASES_IMAGE); assert.equal(review.asset.sha256, DAY_CASES_IMAGE_SHA)
  assert.equal(review.asset.bytes, DAY_CASES_IMAGE_BYTES)
  ledger = JSON.parse(raw)
  assert.equal(ledger.baseline, DAY_CASES_BASELINE)
  assert.deepEqual(ledger.files.map(row => row.path), paths)
  for (const row of ledger.files) {
    assert.equal(row.beforeSha256, sha(original(row.path)))
    assert(row.edits.length, `${row.path}: no broad unchecked replacement`)
  }
  return ledger
}
export function beforeDayCasesSource(path, source) {
  if (!paths.includes(path)) return source
  const current = normalize(source), before = original(path)
  if (current === before) return source // Only the exact independently known preceding revision.
  const row = dayCasesLedger().files.find(row => row.path === path)
  assert.equal(sha(current), row.afterSha256, `${path}: undocumented mutation outside approved day-case source`)
  const lines = current.trimEnd().split('\n')
  for (const edit of [...row.edits].reverse()) {
    assert.deepEqual(lines.slice(edit.afterStart, edit.afterStart + edit.after.length), edit.after,
      `${path}: undocumented mutation in approved day-case hunk`)
    lines.splice(edit.afterStart, edit.after.length, ...edit.before)
  }
  const restored = lines.join('\n') + '\n'
  assert.equal(restored, before, `${path}: undocumented mutation outside approved day-case hunks`)
  return restored
}
export function assertDayCasesImage(bytes = read(DAY_CASES_IMAGE)) {
  assert.equal(bytes.length, DAY_CASES_IMAGE_BYTES, 'Reviewed wrist image byte length')
  assert.equal(sha(bytes), DAY_CASES_IMAGE_SHA, 'Reviewed wrist image identity')
  return bytes
}
export function priorDayCasesMediaPaths(list) {
  assertDayCasesImage()
  return list.filter(path => path !== DAY_CASES_IMAGE)
}
export function assertDayCasesLive() {
  for (const row of dayCasesLedger().files) {
    const current = normalize(read(row.path))
    assert.equal(sha(current), row.afterSha256, `${row.path}: reviewed day-case edit must actually be live`)
    assert.equal(normalize(beforeDayCasesSource(row.path, current)), original(row.path))
  }
  assertDayCasesImage()
  const catalog = JSON.parse(read('app/src/lib/image-assets.catalog.json'))
  assert.equal(catalog[DAY_CASES_WRIST], DAY_CASES_IMAGE.replace('app/public/assets/', ''))
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assertDayCasesLive()
  let sources = 0, media = 0, probes = 0
  for (const path of git('ls-tree', '-r', '--name-only', DAY_CASES_BASELINE, '--', 'app/src').toString().trim().split('\n')) {
    assert.equal(normalize(beforeDayCasesSource(path, read(path))), original(path), `${path}: no unrelated runtime change`)
    sources++
  }
  const publicPaths = []
  for (const entry of git('ls-tree', '-r', '-z', DAY_CASES_BASELINE, '--', 'app/public').toString().split('\0').filter(Boolean)) {
    const [, expected, path] = /^\d+ blob ([0-9a-f]+)\t(.+)$/.exec(entry), bytes = read(path)
    if (/\.(?:html|svg|txt)$/.test(path)) assert.equal(normalize(bytes), original(path))
    else assert.equal(createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'), expected, `${path}: old media untouched`)
    publicPaths.push(path); media++
  }
  const filesAt = path => readdirSync(new URL(path + '/', root), { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? filesAt(`${path}/${entry.name}`) : [`${path}/${entry.name}`])
  assert.deepEqual(filesAt('app/public').sort(), [...publicPaths, DAY_CASES_IMAGE].sort(), 'Exactly one new reviewed image')
  for (const row of dayCasesLedger().files) {
    const live = normalize(read(row.path))
    for (const edit of row.edits) {
      const lines = live.trimEnd().split('\n'), index = Math.min(edit.afterStart, lines.length - 1)
      lines[index] += ' // forbidden change'
      assert.throws(() => beforeDayCasesSource(row.path, lines.join('\n')), /undocumented mutation/); probes++
    }
    assert.throws(() => beforeDayCasesSource(row.path, live + '// forbidden append\n'), /undocumented mutation/); probes++
  }
  const damaged = Buffer.from(read(DAY_CASES_IMAGE)); damaged[100] ^= 1
  assert.throws(() => assertDayCasesImage(damaged), /Reviewed wrist image identity/)
  assert.deepEqual(priorDayCasesMediaPaths([DAY_CASES_IMAGE, 'app/public/unreviewed.webp']), ['app/public/unreviewed.webp'])
  console.log(`PASS day-case LIVE freeze: ${sources} runtime files, ${media} old public files; 11 precise source inversions, one pinned lossless wrist image; ${probes} source mutations rejected`)
}
