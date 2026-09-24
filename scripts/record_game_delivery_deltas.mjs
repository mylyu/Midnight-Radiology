// Run after source/media review; never auto-refresh this acceptance pin in tests.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { DELIVERY_BASELINE as baseline } from '../app/tests/game-delivery-media.mjs'
import { DELIVERY_EDITED_FILES as paths } from '../app/tests/game-delivery-projection.mjs'
assert(process.argv.includes('--record-reviewed'), 'Review exact changes first, then pass --record-reviewed')
const root = new URL('../', import.meta.url)
const normalize = source => source.replaceAll('\r\n', '\n').trimEnd() + '\n'
const git = (...args) => execFileSync('git', ['-c', 'core.autocrlf=false', ...args], { cwd: fileURLToPath(root), encoding: 'utf8', maxBuffer: 16e6 })
const files = paths.map(path => {
  const before = normalize(git('show', `${baseline}:${path}`)).trimEnd().split('\n')
  const after = normalize(readFileSync(new URL(path, root), 'utf8')).trimEnd().split('\n')
  const diff = git('diff', '--no-ext-diff', '--unified=0', baseline, '--', path)
  const edits = [...diff.matchAll(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/gm)].map(match => {
    const a = Number(match[2] ?? 1), b = Number(match[4] ?? 1)
    const beforeStart = Number(match[1]) - (a ? 1 : 0), afterStart = Number(match[3]) - (b ? 1 : 0)
    return { beforeStart, afterStart, before: before.slice(beforeStart, beforeStart + a), after: after.slice(afterStart, afterStart + b) }
  })
  assert(edits.length, `${path}: expected explicit reviewed transport change`)
  const inverted = [...after]
  for (const edit of [...edits].reverse()) inverted.splice(edit.afterStart, edit.after.length, ...edit.before)
  assert.deepEqual(inverted, before)
  return { path, edits }
})
const ledger = JSON.stringify({ baseline, files }, null, 2) + '\n'
writeFileSync(new URL('docs/game-delivery-source-deltas.json', root), ledger)
const hash = value => createHash('sha256').update(normalize(value)).digest('hex')
const assets = readFileSync(new URL('docs/game-delivery-assets.json', root), 'utf8')
assert.equal(JSON.parse(assets).baseline, baseline)
writeFileSync(new URL('docs/game-delivery-review.json', root), JSON.stringify({ baseline, status: 'reviewed',
  assetsSha256: hash(assets), sourceDeltasSha256: hash(ledger) }, null, 2) + '\n')
console.log(`Recorded ${files.length} exact transport deltas and independent reviewed manifest pins; no historical ledger rewritten.`)
