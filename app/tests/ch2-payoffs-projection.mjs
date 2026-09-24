// Historical checks see inspected live text with only this approved round
// reversed. Never replace unexamined live files with a historical Git blob.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { beforeCheckinSource } from './ch2-checkin-projection.mjs'

const root = new URL('../../', import.meta.url)
const ledger = JSON.parse(readFileSync(new URL('docs/ch2-payoffs-source-deltas.json', root), 'utf8'))
const normalize = source => source.replaceAll('\r\n', '\n').trimEnd() + '\n'
export const PAYOFF_EDITED_FILES = [
  'app/src/components/Ch2ScanOverlay.css', 'app/src/components/Ch2ScanOverlay.tsx',
  'app/src/components/Ch2Settlement.tsx', 'app/src/components/Ch2Shop.tsx', 'app/src/game/ch2.ts',
]
assert.equal(ledger.baseline, '6a0311b', 'Payoff baseline must not move')
assert.deepEqual(ledger.files.map(file => file.path).sort(), PAYOFF_EDITED_FILES)

export function beforePayoffSource(path, source) {
  return invertPayoffSource(path, beforeCheckinSource(path, source))
}

function invertPayoffSource(path, source) {
  const file = ledger.files.find(row => row.path === path)
  if (!file) return source
  const lines = normalize(source).trimEnd().split('\n')
  for (const edit of [...file.edits].reverse()) {
    assert.deepEqual(lines.slice(edit.afterStart, edit.afterStart + edit.after.length), edit.after,
      `${path}: undocumented mutation in payoff hunk at ${edit.afterStart + 1}`)
    lines.splice(edit.afterStart, edit.after.length, ...edit.before)
  }
  const restored = lines.join('\n') + '\n'
  const baseline = execFileSync('git', ['show', `${ledger.baseline}:${path}`],
    { cwd: fileURLToPath(root), encoding: 'utf8', maxBuffer: 8e6 })
  assert.equal(restored, normalize(baseline), `${path}: undocumented mutation outside approved loop hunks (payoff layer)`)
  return restored
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let probes = 0
  for (const { path, edits } of ledger.files) {
    const live = beforeCheckinSource(path, readFileSync(new URL(path, root), 'utf8'))
    invertPayoffSource(path, live)
    const covered = new Set()
    for (const edit of edits) {
      edit.after.forEach((_, i) => covered.add(edit.afterStart + i))
      const offset = edit.after.findIndex(line => line.trim())
      if (offset < 0) continue
      const changed = normalize(live).trimEnd().split('\n')
      changed[edit.afterStart + offset] += ' // undocumented mutation'
      assert.throws(() => invertPayoffSource(path, changed.join('\n') + '\n'), /undocumented mutation in payoff hunk/)
      probes++
    }
    assert.throws(() => invertPayoffSource(path, live.trimEnd() + '\n// undocumented append\n'), /mutation outside approved loop hunks \(payoff layer\)/)
    const outside = normalize(live).trimEnd().split('\n')
    const at = outside.findIndex((line, index) => line.trim() && !covered.has(index))
    assert(at >= 0, 'Each edited file retains unmodified content to protect')
    outside[at] += ' // undocumented outside hunk'
    assert.throws(() => invertPayoffSource(path, outside.join('\n') + '\n'), /mutation outside approved loop hunks \(payoff layer\)/)
    probes += 2
  }
  console.log(`PASS payoff projection: ${ledger.files.length} exact inversions to ${ledger.baseline}; ${probes} mutation probes rejected; older ledgers unchanged.`)
}
