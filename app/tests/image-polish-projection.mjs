// Validate live edits before projecting them away for older, fixed baselines.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { beforeRewardsRoundSource } from './ch2-rewards-round-projection.mjs'
const root = new URL('../../', import.meta.url)
const ledger = JSON.parse(readFileSync(new URL('docs/image-polish-source-deltas.json', root), 'utf8'))
const normalize = value => value.replaceAll('\r\n', '\n').trimEnd() + '\n'
export const POLISH_ADDED_SOURCE = ['app/src/components/SceneBackground.tsx', 'app/src/lib/image-assets.ts']
export const POLISH_ADDED_MEDIA = ['app/public/assets/ch2_lung_thick_v2.png']
export const POLISH_EDITED_FILES = [
  'app/.gitignore', 'app/package-lock.json', 'app/package.json', 'app/src/App.tsx',
  'app/src/components/Ch2CtMotion.tsx', 'app/src/components/Ch2DawnScene.tsx',
  'app/src/components/Ch2MysteryMedia.tsx', 'app/src/components/Ch2ObservationImage.tsx',
  'app/src/components/Ch2Settlement.tsx', 'app/src/components/Ch2Shop.tsx',
  'app/src/game/ch2-dawn.ts', 'app/src/game/ch2-observations.ts', 'app/src/game/ch2.ts',
]
assert.equal(ledger.baseline, 'ea9d6c5')
assert.deepEqual(ledger.files.map(file => file.path), POLISH_EDITED_FILES)
const originals = new Map()
function original(path) {
  if (!originals.has(path)) originals.set(path, normalize(execFileSync('git', ['show', `${ledger.baseline}:${path}`],
    {cwd: fileURLToPath(root), encoding: 'utf8', maxBuffer: 8e6})))
  return originals.get(path)
}
export function beforeImagePolishSource(path, source) {
  const file = ledger.files.find(row => row.path === path)
  if (file && normalize(source) === original(path)) return source // Exact already-projected historical input.
  source = beforeRewardsRoundSource(path, source)
  if (!file) return source
  if (normalize(source) === original(path)) return source // Already checked, exactly projected input.
  const lines = normalize(source).trimEnd().split('\n')
  for (const edit of [...file.edits].reverse()) {
    assert.deepEqual(lines.slice(edit.afterStart, edit.afterStart + edit.after.length), edit.after,
      `${path}: undocumented mutation in image-polish hunk at ${edit.afterStart + 1}`)
    lines.splice(edit.afterStart, edit.after.length, ...edit.before)
  }
  const restored = lines.join('\n') + '\n'
  assert.equal(restored, original(path), `${path}: undocumented mutation outside approved loop hunks (image-polish layer)`)
  return restored
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let probes = 0
  for (const {path, edits} of ledger.files) {
    const live = beforeRewardsRoundSource(path, readFileSync(new URL(path, root), 'utf8'))
    beforeImagePolishSource(path, live)
    for (const edit of edits) {
      const offset = edit.after.findIndex(line => line.trim())
      if (offset < 0) continue
      const lines = normalize(live).trimEnd().split('\n')
      lines[edit.afterStart + offset] += ' // unauthorized mutation'
      assert.throws(() => beforeImagePolishSource(path, lines.join('\n')), /undocumented mutation/)
      probes++
    }
    assert.throws(() => beforeImagePolishSource(path, live + '\n// unauthorized append\n'), /undocumented mutation/)
    probes++
  }
  console.log(`PASS image-polish projection: ${ledger.files.length} exact live inversions to ea9d6c5, ${probes} mutation probes; no moved historical baseline`)
}
