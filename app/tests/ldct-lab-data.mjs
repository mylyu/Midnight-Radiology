import assert from 'node:assert/strict'
import {
  createLdctLabState, createLdctRecord, isValidLdctRecord, ldctConfigKey,
  ldctAtlasColumn, ldctFramePosition, LDCT_PHANTOM_SEED, LDCT_PHANTOM_VERSION,
} from '../src/game/ldct-experiments.ts'

const draft = createLdctLabState()
assert.equal(createLdctRecord(draft, 1, 'uncertain'), null)
draft.pinned = { ...draft.candidate }
assert.equal(createLdctRecord(draft, 1, 'different'), null)
draft.candidate.strength = 3 // FBP has no strength: cannot fake a comparison.
assert.equal(createLdctRecord(draft, 1, 'different'), null)
draft.candidate.algorithm = 'iterative'
draft.mark = { x: 64, y: 61 }
draft.helped = true
const result = createLdctRecord(draft, 2, 'uncertain')
assert(isValidLdctRecord(result, 2))
assert.equal(isValidLdctRecord(result, 1), false)
assert.equal(result.seed, LDCT_PHANTOM_SEED)
assert.equal(result.sourceVersion, LDCT_PHANTOM_VERSION)
assert.equal(result.verdict, 'uncertain')
assert.equal(result.helped, true)
assert.deepEqual(result.mark, draft.mark)
draft.candidate.signal = 'low'
draft.mark.x = 2
assert.equal(result.candidate.signal, 'medium', 'Snapshot must not mutate with controls')
assert.equal(result.mark.x, 64)
assert.equal(isValidLdctRecord({ ...result, sourceVersion: 'old' }, 2), false)
assert.equal(isValidLdctRecord({ ...result, candidate: result.pinned }, 2), false)
assert.equal(isValidLdctRecord({ ...result, mark: { x: Infinity, y: 2 } }, 2), false)
assert.equal(isValidLdctRecord({ ...result, mark: { x: 0, y: 101 } }, 2), false)
assert.equal(isValidLdctRecord({ ...result, helped: undefined }, 2), false)
const columns = new Set()
for (const signal of ['low', 'medium', 'high']) {
  columns.add(ldctAtlasColumn({ signal, algorithm: 'fbp', strength: 1 }))
  for (const strength of [1, 2, 3]) columns.add(ldctAtlasColumn({ signal, algorithm: 'iterative', strength }))
}
assert.deepEqual([...columns], Array.from({ length: 12 }, (_, i) => i))
assert.equal(ldctFramePosition(12, 2), '100% 100%')
assert.equal(ldctFramePosition(0, 0), '0% 0%')
assert.equal(ldctConfigKey({ signal: 'low', algorithm: 'fbp', strength: 1 }), ldctConfigKey({ signal: 'low', algorithm: 'fbp', strength: 3 }))
console.log('LDCT lab data: distinct comparisons, immutable snapshots, help/uncertainty, atlas mapping passed.')
