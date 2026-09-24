// Exact inverse of the approved keys/gifts/badges round. Older tests must
// examine live text through this layer, never replace it with an unchecked blob.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { beforeCaseReadingSource } from './ch2-case-reading-projection.mjs'

const root = new URL('../../', import.meta.url)
export const REWARDS_ROUND_BASELINE = 'be269d9'
export const REWARDS_ROUND_ADDED_SOURCE = ['app/src/game/ch2-side-badges.ts', 'app/src/game/ch2-window-progress.ts']
export const REWARDS_ROUND_ADDED_MEDIA = [
  'app/public/assets/ch2_gift_jiang_sleeve_v1.png', 'app/public/assets/ch2_gift_lei_pouch_v1.png',
  'app/public/assets/ch2_gift_luo_pouch_v1.png', 'app/public/assets/ch2_gift_zhou_cup_v1.png',
]
export const REWARDS_ROUND_EDITED_FILES = [
  'app/src/App.tsx', 'app/src/components/Ch2Settlement.tsx', 'app/src/components/Ch2Shop.tsx',
  'app/src/game/ch2-exploration.ts', 'app/src/game/ch2-payoffs.ts', 'app/src/game/ch2-session.ts',
  'app/src/game/ch2.ts', 'app/src/game/types.ts',
]
const normalize = source => source.replaceAll('\r\n', '\n').trimEnd() + '\n'
const originals = new Map()
const original = path => {
  if (!originals.has(path)) originals.set(path, normalize(execFileSync('git', ['show', `${REWARDS_ROUND_BASELINE}:${path}`],
    { cwd: fileURLToPath(root), encoding: 'utf8', maxBuffer: 8e6 })))
  return originals.get(path)
}
let recorded
function ledger() {
  recorded ??= JSON.parse(readFileSync(new URL('docs/ch2-rewards-round-source-deltas.json', root), 'utf8'))
  assert.equal(recorded.baseline, REWARDS_ROUND_BASELINE, 'The approved source baseline must not move')
  assert.deepEqual(recorded.files.map(row => row.path), REWARDS_ROUND_EDITED_FILES, 'Only exact approved production paths')
  return recorded
}
export function beforeRewardsRoundSource(path, source) {
  if (!REWARDS_ROUND_EDITED_FILES.includes(path)) return source
  // Repeated historical projections may supply this exact checked snapshot.
  if (normalize(source) === original(path)) return source
  source = beforeCaseReadingSource(path, source)
  const file = ledger().files.find(row => row.path === path)
  assert(file && file.edits.length, `${path}: no recorded approved changes`)
  const lines = normalize(source).trimEnd().split('\n')
  for (const edit of [...file.edits].reverse()) {
    assert.deepEqual(lines.slice(edit.afterStart, edit.afterStart + edit.after.length), edit.after,
      `${path}: undocumented mutation in rewards-round hunk at ${edit.afterStart + 1}`)
    lines.splice(edit.afterStart, edit.after.length, ...edit.before)
  }
  const restored = lines.join('\n') + '\n'
  assert.equal(restored, original(path), `${path}: undocumented mutation outside approved loop hunks (rewards-round layer)`)
  return restored
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let probes = 0
  for (const { path, edits } of ledger().files) {
    const live = beforeCaseReadingSource(path, readFileSync(new URL(path, root), 'utf8'))
    beforeRewardsRoundSource(path, live)
    const covered = new Set()
    for (const edit of edits) {
      edit.after.forEach((_, i) => covered.add(edit.afterStart + i))
      const offset = edit.after.findIndex(line => line.trim())
      if (offset < 0) continue
      const lines = normalize(live).trimEnd().split('\n')
      lines[edit.afterStart + offset] += ' // unauthorized mutation'
      assert.throws(() => beforeRewardsRoundSource(path, lines.join('\n')), /undocumented mutation/)
      probes++
    }
    const lines = normalize(live).trimEnd().split('\n')
    const outside = lines.findIndex((line, index) => line.trim() && !covered.has(index))
    assert(outside >= 0, `${path}: preserve old content outside the approved deltas`)
    lines[outside] += ' // unauthorized outside mutation'
    assert.throws(() => beforeRewardsRoundSource(path, lines.join('\n')), /undocumented mutation/)
    assert.throws(() => beforeRewardsRoundSource(path, live + '\n// unauthorized append\n'), /undocumented mutation/)
    probes += 2
  }
  console.log(`PASS rewards-round projection: ${ledger().files.length} exact live inversions to ${REWARDS_ROUND_BASELINE}; ${probes} mutation probes rejected; all old baselines retained`)
}
