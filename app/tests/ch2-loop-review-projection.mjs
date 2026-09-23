// Exact inverse of the author's post-preview lumbar/pelvis revision.
// This is a new layer over 42d18ce; the original loop ledger is immutable.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const root = new URL('../../', import.meta.url)
const ledger = JSON.parse(readFileSync(new URL('docs/ch2-loop-review-source-deltas.json', root), 'utf8'))
const normalize = source => source.replaceAll('\r\n', '\n').trimEnd() + '\n'

export function beforeLoopReviewSource(path, source) {
  const file = ledger.files.find(row => row.path === path)
  if (!file) return source
  const lines = normalize(source).trimEnd().split('\n')
  for (const edit of [...file.edits].reverse()) {
    assert.deepEqual(lines.slice(edit.afterStart, edit.afterStart + edit.after.length), edit.after,
      `${path}: undocumented mutation in loop review hunk at ${edit.afterStart + 1}`)
    lines.splice(edit.afterStart, edit.after.length, ...edit.before)
  }
  const restored = lines.join('\n') + '\n'
  const baseline = execFileSync('git', ['show', `${ledger.baseline}:${path}`], { encoding: 'utf8', maxBuffer: 4e6 })
  assert.equal(restored, normalize(baseline), `${path}: undocumented mutation outside approved loop hunks (review layer)`)
  return restored
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const { path, edits } of ledger.files) {
    const live = readFileSync(new URL(path, root), 'utf8')
    beforeLoopReviewSource(path, live)
    const changed = edits.find(edit => edit.after.length)?.after.find(line => line.trim())
    assert(changed)
    assert.throws(() => beforeLoopReviewSource(path, live.replace(changed, changed + ' // undocumented')), /undocumented mutation/)
    assert.throws(() => beforeLoopReviewSource(path, live.trimEnd() + '\n// undocumented append\n'), /mutation outside approved loop hunks/)
  }
  console.log(`PASS loop review projection: ${ledger.files.length} exact inversions to ${ledger.baseline}, unknown edits rejected; original loop ledger untouched`)
}
