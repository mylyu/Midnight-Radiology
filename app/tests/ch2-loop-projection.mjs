// Exact inverse of the reviewed loop-parity hunks, for historical tests only.
// Never substitutes an old file for unexamined current content. Live runtime,
// graph/reward and image hashes have their own independent tests.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { beforeLoopReviewSource } from './ch2-loop-review-projection.mjs'

const root = new URL('../../', import.meta.url)
const ledger = JSON.parse(readFileSync(new URL('docs/ch2-loop-source-deltas.json', root), 'utf8'))
const normalize = source => source.replaceAll('\r\n', '\n').trimEnd() + '\n'

export function beforeLoopSource(path, source) {
  source = beforeLoopReviewSource(path, source)
  const file = ledger.files.find(row => row.path === path)
  if (!file) return source
  const lines = normalize(source).trimEnd().split('\n')
  for (const edit of [...file.edits].reverse()) {
    assert.deepEqual(lines.slice(edit.afterStart, edit.afterStart + edit.after.length), edit.after,
      `${path}: undocumented mutation in loop hunk at ${edit.afterStart + 1}`)
    lines.splice(edit.afterStart, edit.after.length, ...edit.before)
  }
  const restored = lines.join('\n') + '\n'
  const base = execFileSync('git', ['show', `${ledger.baseline}:${path}`], { encoding: 'utf8', maxBuffer: 4e6 })
  assert.equal(restored, normalize(base), `${path}: mutation outside approved loop hunks`)
  return restored
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const { path, edits } of ledger.files) {
    const live = readFileSync(new URL(path, root), 'utf8')
    beforeLoopSource(path, live)
    const changed = edits.find(e => e.after.length)?.after.find(line => line.trim())
    assert(changed, `${path}: expected explicit reviewed addition/change`)
    assert.throws(() => beforeLoopSource(path, live.replace(changed, changed + ' // undocumented')), /undocumented mutation/)
    assert.throws(() => beforeLoopSource(path, live.trimEnd() + '\n// undocumented append\n'), /mutation outside approved loop hunks/)
  }
  console.log(`PASS loop projection: ${ledger.files.length} exact reviewed file inversions to ${ledger.baseline}; in-hunk/outside-hunk mutations rejected`)
}
