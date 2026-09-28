// Pure gesture/clock boundaries. Session and browser integration are scoped separately.
import assert from 'node:assert/strict'
import { startLdctSpeed, tapLdctSpeed, validLdctSpeedTime, LDCT_SPEED_CHALLENGES } from '../src/game/ldct-speed-challenge.ts'
import { LDCT_MANUAL_BP_COUNTS } from '../src/game/ldct-manual-bp.ts'
import { createLdctLabState, createLdctRecord, labStateValid, ldctExperimentReady } from '../src/game/ldct-experiments.ts'

const start = 100000
for (const kind of ['backproject', 'iteration']) {
  const config = LDCT_SPEED_CHALLENGES[kind]
  let challenge = startLdctSpeed(kind, `lf_lab_${kind === 'backproject' ? 2 : 5}`, start)
  assert.equal(challenge.acceptedTaps, 0)
  assert.equal(challenge.progress, kind === 'backproject' ? 1 : 0)
  assert.equal(challenge.deadline, start + (kind === 'backproject' ? 15000 : 10000))
  const first = challenge
  for (const invalid of [0, -1, NaN, Infinity, start - 1]) assert.equal(tapLdctSpeed(kind, challenge, invalid, 1, 1), challenge)
  for (const tap of [0, -1, .5, 2, NaN, Infinity]) assert.equal(tapLdctSpeed(kind, challenge, start + 1, 1, tap), challenge)
  assert.equal(tapLdctSpeed(kind, challenge, start + 1, 0, 1), challenge, 'old attempt cannot advance a retry')
  for (let tap = 1; tap <= config.taps; tap++) {
    const previous = challenge
    challenge = tapLdctSpeed(kind, challenge, start + tap * 10, 1, tap)
    assert.equal(challenge.acceptedTaps, tap)
    assert.equal(challenge.progress, kind === 'backproject' ? LDCT_MANUAL_BP_COUNTS[tap] : tap)
    assert(challenge.progress - previous.progress <= (kind === 'backproject' ? 8 : 1))
    assert.equal(challenge.status, tap === config.taps ? 'won' : 'running')
    assert.equal(tapLdctSpeed(kind, challenge, start + tap * 10, 1, tap), challenge, 'duplicate gesture sequence is ignored')
  }
  assert.equal(challenge.progress, config.target)
  assert.equal(tapLdctSpeed(kind, challenge, start + 999, 1, config.taps + 1), challenge, 'a result cannot award again')
  const timedOut = tapLdctSpeed(kind, first, first.deadline, 1, 1)
  assert.equal(timedOut.status, 'expired', 'deadline itself is too late')
  assert.equal(timedOut.acceptedTaps, 0)
  assert.equal(timedOut.progress, first.progress, 'timeout never advances a frame')
  assert.equal(tapLdctSpeed(kind, timedOut, first.deadline + 1, 1, 1), timedOut)
  assert.equal(tapLdctSpeed(kind, first, first.deadline - 1, 1, 1).acceptedTaps, 1)
  const retry = startLdctSpeed(kind, first.nodeId, first.deadline + 100, timedOut)
  assert.equal(retry.attempt, 2); assert.equal(retry.acceptedTaps, 0)
  assert.equal(tapLdctSpeed(kind, retry, retry.startedAt + 1, 1, 1), retry)
}
for (const now of [-1, 0, NaN, Infinity]) assert.equal(validLdctSpeedTime(now), false)
for (const round of [2, 5]) {
  const dataset = round === 5 ? 'chest' : 'phantom'
  const initial = createLdctLabState(round, dataset)
  assert.equal(ldctExperimentReady(initial, round), false)
  const practice = { ...initial, practice: true }
  assert(labStateValid(practice, round)); assert(ldctExperimentReady(practice, round))
  const record = createLdctRecord(practice, round, 'different', dataset)
  assert.equal(record.practice, true)
  assert.equal(record.helped, false, 'untimed continuation never fabricates a help request')
  assert.equal(labStateValid({ ...initial, practice: false }, round), false)
}
assert.equal(labStateValid({ ...createLdctLabState(4, 'chest'), practice: true }, 4), false, 'unrelated exposure thresholds stay unchanged')
console.log('PASS speed helpers: 22 small BP steps/12 IR steps, exact deadlines, ordered gestures, retries, immutable results, and explicit non-help practice records.')
