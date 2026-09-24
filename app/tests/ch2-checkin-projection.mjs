// Exact inverse of the swipe-check-in integration. Historical audits inspect
// live source first; they never substitute an unexamined historical Git blob.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const root = new URL('../../', import.meta.url)
const ledger = JSON.parse(readFileSync(new URL('docs/ch2-checkin-source-deltas.json', root), 'utf8'))
const normalize = source => source.replaceAll('\r\n', '\n').trimEnd() + '\n'
export const CHECKIN_EDITED_FILES = ['app/src/App.tsx']
export const CHECKIN_ADDED_FILES = [
  'app/src/components/Ch2Checkin.css', 'app/src/components/Ch2Checkin.tsx', 'app/src/game/ch2-checkin.ts',
]
assert.equal(ledger.baseline, 'b3213f0', 'Check-in baseline must not move')
assert.deepEqual(ledger.files.map(file => file.path).sort(), CHECKIN_EDITED_FILES)

export function beforeCheckinSource(path, source) {
  const file = ledger.files.find(row => row.path === path)
  if (!file) return source
  const lines = normalize(source).trimEnd().split('\n')
  for (const edit of [...file.edits].reverse()) {
    assert.deepEqual(lines.slice(edit.afterStart, edit.afterStart + edit.after.length), edit.after,
      `${path}: undocumented mutation in check-in hunk at ${edit.afterStart + 1}`)
    lines.splice(edit.afterStart, edit.after.length, ...edit.before)
  }
  const restored = lines.join('\n') + '\n'
  const baseline = execFileSync('git', ['show', `${ledger.baseline}:${path}`],
    { cwd: fileURLToPath(root), encoding: 'utf8', maxBuffer: 8e6 })
  assert.equal(restored, normalize(baseline), `${path}: undocumented mutation outside approved loop hunks (check-in layer)`)
  return restored
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let probes = 0
  for (const { path, edits } of ledger.files) {
    const live = readFileSync(new URL(path, root), 'utf8')
    beforeCheckinSource(path, live)
    const covered = new Set()
    for (const edit of edits) {
      edit.after.forEach((_, i) => covered.add(edit.afterStart + i))
      const offset = edit.after.findIndex(line => line.trim())
      if (offset < 0) continue
      const changed = normalize(live).trimEnd().split('\n')
      changed[edit.afterStart + offset] += ' // undocumented mutation'
      assert.throws(() => beforeCheckinSource(path, changed.join('\n') + '\n'), /undocumented mutation in check-in hunk/)
      probes++
    }
    assert.throws(() => beforeCheckinSource(path, live.trimEnd() + '\n// undocumented append\n'), /mutation outside approved loop hunks \(check-in layer\)/)
    const outside = normalize(live).trimEnd().split('\n')
    const at = outside.findIndex((line, index) => line.trim() && !covered.has(index))
    assert(at >= 0, 'The App retains unmodified source to protect')
    outside[at] += ' // undocumented outside hunk'
    assert.throws(() => beforeCheckinSource(path, outside.join('\n') + '\n'), /mutation outside approved loop hunks \(check-in layer\)/)
    probes += 2
  }
  console.log(`PASS check-in projection: ${ledger.files.length} exact inversion to ${ledger.baseline}; ${probes} mutation probes rejected; older ledgers unchanged.`)
}
