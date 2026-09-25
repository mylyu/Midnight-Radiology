// New outer boundary: invert only the explicitly reviewed detail-polish hunks.
// Never return a Git blob as a replacement for unchecked current source.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeDirectorDayVoiceSource } from './ch2-director-day-voice.mjs'

export const DETAIL_ROOT = new URL('../../', import.meta.url)
export const DETAIL_BASELINE = '5a2b494ed3d0eaaadaeb374ef1536166cbd43b41'
export const DETAIL_EDITED_FILES = [
  'app/src/App.tsx', 'app/src/components/Ch2Shop.tsx', 'app/src/game/ch2-pacing.ts',
  'app/src/game/ch2-payoffs.ts', 'app/src/game/ch2.ts', 'app/src/game/types.ts',
]
export const DETAIL_ADDED_SOURCE = [
  'app/src/components/StatFeedback.css', 'app/src/components/StatFeedback.tsx',
  'app/src/game/ch2-stat-interactions.ts', 'app/src/game/input-gate.ts',
  'app/src/game/interaction-transactions.ts', 'app/src/game/stat-feedback.ts',
]
export const normalizeDetail = source => source.replaceAll('\r\n', '\n').trimEnd() + '\n'
export const detailHash = source => createHash('sha256').update(normalizeDetail(source)).digest('hex')
const read = path => readFileSync(new URL(path, DETAIL_ROOT), 'utf8')
const originals = new Map()
const original = path => {
  if (!originals.has(path)) originals.set(path, normalizeDetail(execFileSync('git', ['show', `${DETAIL_BASELINE}:${path}`], {
    cwd: fileURLToPath(DETAIL_ROOT), encoding: 'utf8', maxBuffer: 16e6,
  })))
  return originals.get(path)
}
let recorded
export function detailLedger() {
  if (!recorded) {
    const text = read('docs/ch2-detail-polish-source-deltas.json')
    const review = JSON.parse(read('docs/ch2-detail-polish-review.json'))
    assert.equal(review.baseline, DETAIL_BASELINE)
    assert.equal(review.status, 'reviewed')
    assert.equal(detailHash(text), review.sourceDeltasSha256, 'Detail-polish ledger changed after explicit review')
    recorded = JSON.parse(text)
    assert.equal(recorded.baseline, DETAIL_BASELINE, 'Do not move the fixed detail-polish baseline')
    assert.deepEqual(recorded.files.map(row => row.path), DETAIL_EDITED_FILES)
    assert.deepEqual(recorded.added.map(row => row.path), DETAIL_ADDED_SOURCE)
    for (const row of recorded.files) {
      assert(row.edits.length, `${row.path}: explicit reviewed deltas required`)
      assert.equal(row.beforeSha256, detailHash(original(row.path)), `${row.path}: exact fixed baseline identity`)
    }
  }
  return recorded
}
export function assertDetailAddedSource() {
  for (const row of detailLedger().added) {
    assert.equal(detailHash(read(row.path)), row.sha256, `${row.path}: undocumented mutation in approved new source`)
  }
}
export function priorDetailSourcePaths(paths) {
  assertDetailAddedSource()
  return paths.filter(path => !DETAIL_ADDED_SOURCE.includes(path))
}
export function beforeDetailPolishSource(path, source) {
  if (!DETAIL_EDITED_FILES.includes(path)) return beforeDirectorDayVoiceSource(path, source)
  // Idempotence is restricted to this exact independently checked baseline.
  if (normalizeDetail(source) === original(path)) return source
  source = beforeDirectorDayVoiceSource(path, source)
  const normalized = normalizeDetail(source)
  const row = detailLedger().files.find(file => file.path === path)
  const lines = normalized.trimEnd().split('\n')
  for (const edit of [...row.edits].reverse()) {
    assert.deepEqual(lines.slice(edit.afterStart, edit.afterStart + edit.after.length), edit.after,
      `${path}: undocumented mutation in detail-polish hunk at ${edit.afterStart + 1}`)
    lines.splice(edit.afterStart, edit.after.length, ...edit.before)
  }
  const restored = lines.join('\n') + '\n'
  assert.equal(restored, original(path), `${path}: undocumented mutation outside approved loop hunks (detail-polish layer)`)
  assert.equal(detailHash(normalized), row.afterSha256, `${path}: undocumented mutation in reviewed detail-polish source`)
  return restored
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let probes = 0
  for (const row of detailLedger().files) {
    const live = read(row.path)
    assert.notEqual(normalizeDetail(live), original(row.path), `${row.path}: the approved live change must be present`)
    assert.equal(normalizeDetail(beforeDetailPolishSource(row.path, live)), original(row.path))
    const covered = new Set()
    for (const edit of row.edits) {
      edit.after.forEach((_, index) => covered.add(edit.afterStart + index))
      const offset = edit.after.findIndex(line => line.trim())
      if (offset < 0) continue
      const lines = normalizeDetail(live).trimEnd().split('\n')
      lines[edit.afterStart + offset] += ' // unauthorized hunk mutation'
      assert.throws(() => beforeDetailPolishSource(row.path, lines.join('\n')), /undocumented mutation/)
      probes++
    }
    const lines = normalizeDetail(live).trimEnd().split('\n')
    const outside = lines.findIndex((line, index) => line.trim() && !covered.has(index))
    assert(outside >= 0, `${row.path}: original source remains outside reviewed hunks`)
    lines[outside] += ' // unauthorized outside mutation'
    assert.throws(() => beforeDetailPolishSource(row.path, lines.join('\n')), /undocumented mutation/)
    assert.throws(() => beforeDetailPolishSource(row.path, live + '\n// unauthorized append\n'), /undocumented mutation/)
    probes += 2
  }
  assertDetailAddedSource()
  console.log(`PASS detail-polish projection: ${DETAIL_EDITED_FILES.length} exact inversions to ${DETAIL_BASELINE.slice(0, 7)}, ${DETAIL_ADDED_SOURCE.length} pinned additions, ${probes} rejected mutations`)
}
