// Explicit review operation; never imported by a test or called during build.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { DETAIL_ROOT as root, DETAIL_BASELINE as baseline, DETAIL_EDITED_FILES as paths,
  DETAIL_ADDED_SOURCE, normalizeDetail as normalize, detailHash } from '../app/tests/ch2-detail-polish-projection.mjs'

assert(process.argv.includes('--record-reviewed'), 'Wait for source freeze and review the exact diff before recording')
const git = (...args) => execFileSync('git', ['-c', 'core.autocrlf=false', ...args], {
  cwd: fileURLToPath(root), encoding: 'utf8', maxBuffer: 16e6,
})
const read = path => normalize(readFileSync(new URL(path, root), 'utf8'))
const files = paths.map(path => {
  const beforeText = normalize(git('show', `${baseline}:${path}`)), afterText = read(path)
  const before = beforeText.trimEnd().split('\n'), after = afterText.trimEnd().split('\n')
  const diff = git('diff', '--no-ext-diff', '--unified=0', baseline, '--', path)
  const edits = [...diff.matchAll(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/gm)].map(match => {
    const a = Number(match[2] ?? 1), b = Number(match[4] ?? 1)
    const beforeStart = Number(match[1]) - (a ? 1 : 0), afterStart = Number(match[3]) - (b ? 1 : 0)
    return { beforeStart, afterStart, before: before.slice(beforeStart, beforeStart + a), after: after.slice(afterStart, afterStart + b) }
  })
  assert(edits.length, `${path}: expected explicitly reviewed change`)
  const inverted = [...after]
  for (const edit of [...edits].reverse()) inverted.splice(edit.afterStart, edit.after.length, ...edit.before)
  assert.deepEqual(inverted, before, `${path}: hunks must exactly invert the live text`)
  return { path, beforeSha256: detailHash(beforeText), afterSha256: detailHash(afterText), edits }
})
const added = DETAIL_ADDED_SOURCE.map(path => ({ path, sha256: detailHash(read(path)) }))
const ledger = JSON.stringify({ baseline, files, added }, null, 2) + '\n'
writeFileSync(new URL('docs/ch2-detail-polish-source-deltas.json', root), ledger)
writeFileSync(new URL('docs/ch2-detail-polish-review.json', root), JSON.stringify({ baseline, status: 'reviewed',
  sourceDeltasSha256: detailHash(ledger) }, null, 2) + '\n')
console.log(`Recorded ${files.length} exact detail-polish inverses and ${added.length} new-source hashes; no previous ledger changed`)
