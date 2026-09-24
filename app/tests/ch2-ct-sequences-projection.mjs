// Outermost exact inverse. This round never changes an older ledger/baseline.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const root = new URL('../../', import.meta.url)
export const CT_SEQUENCES_BASELINE = '61172202570b78ada9253a63c65af7137547d8e3'
export const CT_SEQUENCES_EDITED_FILES = [
  'app/src/App.tsx', 'app/src/components/Ch2ScanOverlay.css',
  'app/src/components/Ch2ScanOverlay.tsx', 'app/src/game/ch2-scans.ts',
]
export const CT_SEQUENCES_ADDED_SOURCE = [
  'app/src/components/Ch2SliceSequence.tsx', 'app/src/game/ch2-scan-sequences.ts',
]
export const CT_SEQUENCES_ADDED_MEDIA = [
  'abdomen-plain-v1.webp', 'adult-head-dental-repeat-v1.webp', 'adult-head-dental-v1.webp',
  'adult-head-motion-v1.webp', 'adult-head-plain-v1.webp', 'adult-neck-cta-v1.webp',
  'aorta-cta-v1.webp', 'chest-plain-v1.webp', 'coronary-cta-v1.webp',
  'lumbar-pelvis-plain-v1.webp', 'urinary-plain-v1.webp', 'wrist-bone-v1.webp',
].map(name => `app/public/assets/ct-sequences/${name}`)
const normalize = source => source.replaceAll('\r\n', '\n').trimEnd() + '\n'
const originals = new Map()
const original = path => {
  if (!originals.has(path)) originals.set(path, normalize(execFileSync('git', ['show', `${CT_SEQUENCES_BASELINE}:${path}`],
    { cwd: fileURLToPath(root), encoding: 'utf8', maxBuffer: 8e6 })))
  return originals.get(path)
}
let recorded
function ledger() {
  recorded ??= JSON.parse(readFileSync(new URL('docs/ch2-ct-sequences-source-deltas.json', root), 'utf8'))
  assert.equal(recorded.baseline, CT_SEQUENCES_BASELINE, 'CT sequence source baseline must not move')
  assert.deepEqual(recorded.files.map(row => row.path), CT_SEQUENCES_EDITED_FILES, 'Only four named acquisition presentation files')
  return recorded
}
export function beforeCtSequencesSource(path, source) {
  if (!CT_SEQUENCES_EDITED_FILES.includes(path)) return source
  if (normalize(source) === original(path)) return source // Exact previously checked historical input.
  const file = ledger().files.find(row => row.path === path)
  assert(file && file.edits.length, `${path}: no approved CT sequence changes recorded`)
  const lines = normalize(source).trimEnd().split('\n')
  for (const edit of [...file.edits].reverse()) {
    assert.deepEqual(lines.slice(edit.afterStart, edit.afterStart + edit.after.length), edit.after,
      `${path}: undocumented mutation in CT sequence hunk at ${edit.afterStart + 1}`)
    lines.splice(edit.afterStart, edit.after.length, ...edit.before)
  }
  const restored = lines.join('\n') + '\n'
  assert.equal(restored, original(path), `${path}: undocumented mutation outside approved loop hunks (CT sequence layer)`)
  return restored
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let probes = 0
  for (const { path, edits } of ledger().files) {
    const live = readFileSync(new URL(path, root), 'utf8')
    assert.equal(normalize(beforeCtSequencesSource(path, live)), original(path))
    const covered = new Set()
    for (const edit of edits) {
      edit.after.forEach((_, i) => covered.add(edit.afterStart + i))
      const offset = edit.after.findIndex(line => line.trim())
      if (offset < 0) continue
      const lines = normalize(live).trimEnd().split('\n')
      lines[edit.afterStart + offset] += ' // unauthorized mutation'
      assert.throws(() => beforeCtSequencesSource(path, lines.join('\n')), /undocumented mutation/)
      probes++
    }
    const lines = normalize(live).trimEnd().split('\n')
    const at = lines.findIndex((line, i) => line.trim() && !covered.has(i))
    assert(at >= 0, `${path}: preserve pre-existing source outside exact hunks`)
    lines[at] += ' // unauthorized outside mutation'
    assert.throws(() => beforeCtSequencesSource(path, lines.join('\n')), /undocumented mutation/)
    assert.throws(() => beforeCtSequencesSource(path, live + '\n// unauthorized append\n'), /undocumented mutation/)
    probes += 2
  }
  console.log(`PASS CT sequence projection: four exact inversions to ${CT_SEQUENCES_BASELINE.slice(0, 7)}; ${probes} mutation probes rejected`)
}
