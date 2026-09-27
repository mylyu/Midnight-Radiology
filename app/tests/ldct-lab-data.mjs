// v2 replaces the rejected two-final-images task; old assertions are in 3cc80e2.
import assert from 'node:assert/strict'
import { createLdctLabState, createLdctRecord, isValidLdctRecord, labStateValid,
  ldctExperimentReady, LDCT_PHANTOM_SEED, LDCT_PHANTOM_VERSION } from '../src/game/ldct-experiments.ts'
import { LDCT_STRUCTURES, LDCT_PROJECTION_FRAME_KEYS, ldctProjectionFrame,
  detectorPosition, detectorPath, LDCT_BP_COUNTS, LDCT_ITERATIONS } from '../src/game/ldct-projections.ts'

for (const round of [1, 2, 3, 4, 5]) {
  const state = createLdctLabState(round)
  assert(labStateValid(state, round))
  assert.equal(createLdctRecord(state, round, 'different'), null, 'opening the screen alone is not an experiment')
  assert.equal(labStateValid({ ...state, round: 9 }, round), false)
  assert.equal(labStateValid({ ...state, angle: Infinity }, round), false)
  assert.equal(labStateValid({ ...state, structure: 'missing' }, round), false)
  assert.equal(labStateValid({ ...state, bpStep: 100 }, round), false)
  assert.equal(labStateValid({ ...state, mark: { x: -1, y: 50 } }, round), false)
  const record = createLdctRecord({ ...state, helped: true }, round, 'uncertain')
  assert(isValidLdctRecord(record, round), 'help is a valid outcome, not a wrong answer')
  assert.equal(record.seed, LDCT_PHANTOM_SEED)
  assert.equal(record.sourceVersion, LDCT_PHANTOM_VERSION)
  assert.equal(isValidLdctRecord({ ...record, sourceVersion: 'ldct-phantom-v1' }, round), false)
  assert.equal(isValidLdctRecord({ ...record, round: round === 5 ? 1 : round + 1 }, round), false)
  assert.equal(isValidLdctRecord({ ...record, filter: 'blur' }, round), false)
}
const actions = [
  { seenStructures: ['bead', 'rod'], seenAngles: [0, 90], structure: 'rod', angle: 90 },
  { bpStep: LDCT_BP_COUNTS.length - 1 },
  { seenFilters: ['ramp', 'hann'], filter: 'hann' },
  { seenSignals: ['high', 'low'], signal: 'low' },
  { iterationStep: 3, seenIterations: [0, 1, 2, 3] },
]
for (const round of [1, 2, 3, 4, 5]) {
  const draft = { ...createLdctLabState(round), ...actions[round - 1] }
  assert(ldctExperimentReady(draft, round))
  const record = createLdctRecord(draft, round, 'different')
  assert(isValidLdctRecord(record, round))
  const immutable = JSON.stringify(record)
  draft.angle = 150; draft.filter = 'shepp-logan'
  assert.equal(JSON.stringify(record), immutable, 'records do not follow later control changes')
}
const frames = new Set()
for (const key of LDCT_PROJECTION_FRAME_KEYS) {
  const tile = ldctProjectionFrame(key)
  assert(tile.column >= 0 && tile.column < 8 && tile.row >= 0 && tile.row < 5)
  frames.add(`${tile.column}:${tile.row}`)
}
assert.equal(frames.size, 37)
assert.throws(() => ldctProjectionFrame('made-up'))
for (const item of LDCT_STRUCTURES) {
  assert.equal(detectorPosition(item.id, 0), item.x)
  assert(Math.abs(detectorPosition(item.id, 90) - (100 - item.y)) < 1e-9)
  assert(Math.abs(detectorPosition(item.id, 180) - (100 - item.x)) < 1e-9)
  assert.match(detectorPath(item.id), /^M/)
}
assert.deepEqual(LDCT_BP_COUNTS, [1, 2, 4, 8, 24, 160])
assert.deepEqual(LDCT_ITERATIONS, [0, 1, 2, 4, 8])
console.log('LDCT projection data: five stages, help/interaction gates, immutable/versioned records, 37 unique tiles and detector-coordinate mapping passed.')
