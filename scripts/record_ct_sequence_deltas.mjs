// Explicit mechanical recording command, not a test-time snapshot updater.
// Review the diff before running; this writes ONLY this round's new ledger.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { CT_SEQUENCES_BASELINE as baseline, CT_SEQUENCES_EDITED_FILES as paths } from '../app/tests/ch2-ct-sequences-projection.mjs'

const root = new URL('../', import.meta.url)
assert(process.argv.includes('--record-reviewed'), 'Read the diff, then explicitly pass --record-reviewed')
const git = (...args) => execFileSync('git', ['-c', 'core.autocrlf=false', ...args], { cwd: fileURLToPath(root), encoding: 'utf8', maxBuffer: 16e6 })
const normalize = source => source.replaceAll('\r\n', '\n').trimEnd() + '\n'
const files = paths.map(path => {
  const before = normalize(git('show', `${baseline}:${path}`)).trimEnd().split('\n')
  const after = normalize(readFileSync(new URL(path, root), 'utf8')).trimEnd().split('\n')
  const diff = git('diff', '--no-ext-diff', '--unified=0', baseline, '--', path)
  const edits = [...diff.matchAll(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/gm)].map(match => {
    const beforeCount = Number(match[2] ?? 1), afterCount = Number(match[4] ?? 1)
    const beforeStart = Number(match[1]) - (beforeCount ? 1 : 0)
    const afterStart = Number(match[3]) - (afterCount ? 1 : 0)
    return { beforeStart, afterStart, before: before.slice(beforeStart, beforeStart + beforeCount), after: after.slice(afterStart, afterStart + afterCount) }
  })
  assert(edits.length, `${path}: expected a reviewed change`)
  const inverse = [...after]
  for (const edit of [...edits].reverse()) inverse.splice(edit.afterStart, edit.after.length, ...edit.before)
  assert.deepEqual(inverse, before, `${path}: recorded hunks must exactly invert`)
  return { path, edits }
})
writeFileSync(new URL('docs/ch2-ct-sequences-source-deltas.json', root), JSON.stringify({ baseline, files }, null, 2) + '\n')
console.log(`Recorded ${files.reduce((n, file) => n + file.edits.length, 0)} reviewed hunks in ${files.length} files; no older ledger touched`)
