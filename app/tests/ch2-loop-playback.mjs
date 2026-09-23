import assert from 'node:assert/strict'
import { freshState } from '../src/game/store.ts'
import { CH2_OBSERVATIONS } from '../src/game/ch2-observations.ts'
import { CH2_SCANS, ch2ScanFrame } from '../src/game/ch2-scans.ts'
import { startCh2Scan, completeCh2Scan, answerCh2Observation, acknowledgeCh2Observation } from '../src/game/ch2-playback.ts'
import { beginCh2Shift } from '../src/game/ch2-ledger.ts'
import { patchCh2 } from '../src/game/ch2-session.ts'
import { restartCh2 } from '../src/game/ch2-exploration.ts'

const fresh = shift => beginCh2Shift({ ...freshState('m'), flags: { quiz_grade: 'S' },
  dlc: { dr: { done: true }, dsa: { done: true }, ch2: { shift, phase: 'story' } } }, shift)
const clone = s => JSON.parse(JSON.stringify(s))
const frozen = s => ({ night: s.night, grade: s.flags.quiz_grade, dr: s.dlc.dr, dsa: s.dlc.dsa, gold: s.gold, heart: s.heart, wealth: s.wealth })
for (const [id, config] of Object.entries(CH2_SCANS)) {
  let s = fresh(id.split('_')[0]), before = clone(s)
  s = startCh2Scan(s, id, 1000)
  assert.equal(startCh2Scan(s, id, 2000), s, 'start is idempotent')
  s = clone(s)
  assert.equal(s.dlc.ch2.scanSessions[id].startedAt, 1000)
  assert.equal(ch2ScanFrame(config, 1000, 1000 + config.durationMs + 1).complete, true)
  assert.equal(ch2ScanFrame(config, NaN).complete, true)
  s = completeCh2Scan(s, id)
  assert.equal(completeCh2Scan(s, id), s)
  assert.equal(startCh2Scan(s, id, 4000), s, 'finished scans never replay on reload')
  assert.equal(s.skill, before.skill)
  assert.deepEqual(frozen(s), frozen(before))
}

for (const [id, config] of Object.entries(CH2_OBSERVATIONS)) {
  for (const choice of config.choices) {
    let s = fresh(id.split('_')[0]), before = clone(s)
    assert.equal(acknowledgeCh2Observation(s, id), s, 'cannot skip an unanswered observation')
    assert.equal(answerCh2Observation(s, id, 'not-an-option'), s)
    s = answerCh2Observation(s, id, choice.id)
    assert.equal(s.skill - before.skill, config.rewardEligible && choice.correct && !choice.hint ? 1 : 0)
    assert.equal(answerCh2Observation(s, id, choice.id), s)
    s = clone(s)
    assert.equal(answerCh2Observation(s, id, choice.id), s, 'reload preserves reward receipt')
    assert.equal(s.dlc.ch2.observations[config.id].choiceId, choice.id)
    s = acknowledgeCh2Observation(s, id)
    assert.equal(s.dlc.ch2.observations[config.id].acknowledged, true)
    assert.equal(acknowledgeCh2Observation(s, id), s)
    assert.equal(s.dlc.ch2.loop.entries.filter(e => e.id === `observe:${config.id}`).length, 1)
    assert.deepEqual(frozen(s), frozen(before))
  }
}

let s = fresh('c2n1'), startSkill = s.skill
for (const [id, config] of Object.entries(CH2_OBSERVATIONS)) {
  const shift = id.split('_')[0]
  s = beginCh2Shift(patchCh2(s, { shift }), shift)
  const choice = config.choices.find(c => c.correct && !c.hint)
  if (choice) s = answerCh2Observation(s, id, choice.id)
}
assert.equal(s.skill - startSkill, 5, 'at most one observation skill point in each of five shifts')
assert.equal(new Set(s.dlc.ch2.observationRewardShifts).size, 5)
assert.equal(s.dlc.ch2.loop.entries.reduce((sum, e) => sum + e.delta.skill, 0), 5)
const preserved = frozen(s)
const replay = restartCh2(s)
assert.equal(replay.dlc.ch2.observations, undefined)
assert.equal(replay.dlc.ch2.scanSessions, undefined)
assert.equal(replay.dlc.ch2.loop, undefined)
assert.deepEqual(frozen(replay), preserved)
console.log('PASS 17 scan lifecycle hooks; all observation answers/help/invalid/reload; +1 per shift cap; receipts and replay isolation')
