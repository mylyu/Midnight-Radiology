// Exact inverse of the approved transport layer, not a historical-source loader.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { DELIVERY_ROOT, DELIVERY_BASELINE, deliveryManifest } from './game-delivery-media.mjs'
export const DELIVERY_EDITED_FILES = ['app/scripts/prepare-images.mjs', 'app/src/App.tsx', 'app/src/components/SceneBackground.tsx', 'app/src/lib/image-assets.ts']
const normalize = value => value.replaceAll('\r\n', '\n').trimEnd() + '\n'
const old = new Map()
const original = path => {
  if (!old.has(path)) old.set(path, normalize(execFileSync('git', ['show', `${DELIVERY_BASELINE}:${path}`], { cwd: fileURLToPath(DELIVERY_ROOT), encoding: 'utf8', maxBuffer: 16e6 })))
  return old.get(path)
}
export function beforeGameDeliverySource(path, source) {
  if (!DELIVERY_EDITED_FILES.includes(path)) return source
  deliveryManifest() // Validate the independently pinned live ledger before using its inverse.
  const ledger = JSON.parse(readFileSync(new URL('docs/game-delivery-source-deltas.json', DELIVERY_ROOT), 'utf8'))
  assert.equal(ledger.baseline, DELIVERY_BASELINE)
  assert.deepEqual(ledger.files.map(row => row.path), DELIVERY_EDITED_FILES)
  if (normalize(source) === original(path)) return source // Exact already-checked historical input.
  const row = ledger.files.find(row => row.path === path)
  const lines = normalize(source).trimEnd().split('\n')
  for (const edit of [...row.edits].reverse()) {
    assert.deepEqual(lines.slice(edit.afterStart, edit.afterStart + edit.after.length), edit.after, `${path}: undocumented mutation in delivery hunk`)
    lines.splice(edit.afterStart, edit.after.length, ...edit.before)
  }
  const restored = lines.join('\n') + '\n'
  assert.equal(restored, original(path), `${path}: undocumented mutation outside exact reviewed delivery hunks`)
  return restored
}
