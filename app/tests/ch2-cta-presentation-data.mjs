import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { CH2_SHIFTS, ch2StepForState } from '../src/game/ch2.ts'
import { CH2_OBSERVATIONS } from '../src/game/ch2-observations.ts'
import { CH2_SCANS } from '../src/game/ch2-scans.ts'
import { freshState } from '../src/game/store.ts'
import { answerCh2Observation, acknowledgeCh2Observation } from '../src/game/ch2-playback.ts'
import { ch2ObservationContinuation, ch2ObservationPortrait, ch2ObservationPhone, ch2ObservationResumeStep } from '../src/game/ch2-observation-presentation.ts'
import { beforeChapterPreloadSource } from './chapter-preload-projection.mjs'

const coronary = 'c2n3_coronary_where', observation = 'coronary-reconstruction-v1'
const state = () => ({ ...freshState('m'), skill: 4,
  dlc: { dr: { done: true }, dsa: { dose: 27 }, ch2: { shift: 'c2n3', phase: 'story', stepId: coronary } } })

for (const choice of CH2_OBSERVATIONS[coronary].choices) {
  const before = state(), answered = answerCh2Observation(before, coronary, choice.id)
  assert.equal(answered.skill, before.skill + (choice.correct && !choice.hint ? 1 : 0))
  assert.equal(answered.dlc.ch2.stepId, coronary, 'Feedback stays visible before acknowledgement')
  assert.equal(ch2ObservationResumeStep(coronary, answered.dlc.ch2), coronary)
  const after = acknowledgeCh2Observation(answered, coronary)
  assert.equal(after.dlc.ch2.stepId, 'c2n3_coronary_volume')
  assert.equal(after.dlc.ch2.observations[observation].acknowledged, true)
  assert.equal(after.skill, answered.skill)
  assert.strictEqual(acknowledgeCh2Observation(after, coronary), after, 'Acknowledgement cannot replay')
  assert.strictEqual(answerCh2Observation(after, coronary, choice.id), after, 'Answer cannot reward twice')
  assert.deepEqual(after.dlc.dr, before.dlc.dr)
  assert.deepEqual(after.dlc.dsa, before.dlc.dsa)
  const oldAcknowledged = { ...after.dlc.ch2, stepId: coronary }
  assert.equal(ch2ObservationResumeStep(coronary, oldAcknowledged), 'c2n3_coronary_volume')
}

for (const [stepId, config] of Object.entries(CH2_OBSERVATIONS)) {
  if (stepId === coronary) continue
  assert.equal(ch2ObservationContinuation(stepId), undefined)
  assert.equal(ch2ObservationResumeStep(stepId, { observations: { [observation]: { choiceId: 'volume', acknowledged: true } } }), stepId)
  const before = { ...state(), dlc: { ch2: { shift: stepId.split('_')[0], stepId, phase: 'story' } } }
  const answered = answerCh2Observation(before, stepId, config.choices[0].id)
  assert.equal(acknowledgeCh2Observation(answered, stepId).dlc.ch2.stepId, stepId, 'All other original returns stay unchanged')
  if (stepId === 'c2n5_m17') {
    assert.equal(ch2ObservationPortrait(stepId, config.speaker), undefined)
    assert.equal(ch2ObservationPhone(stepId), 'char_duty')
  } else {
    assert.equal(ch2ObservationPortrait(stepId, config.speaker), `char_${config.speaker}`)
    assert.equal(ch2ObservationPhone(stepId), undefined)
  }
}

const all = Object.assign({}, ...CH2_SHIFTS.map(shift => shift.steps))
for (const stepId of ['c2n1_d2', 'c2n3_m1', 'c2n3_m11', 'c2n5_m7a', 'c2n5_m9']) {
  const step = ch2StepForState(stepId, all[stepId], state())
  assert(step.phone, `${stepId} remains a phone conversation`)
  assert(!step.sprite, `${stepId} does not move caller into the room`)
}
// The portrait-exit fix explicitly clears any caller inherited from an old saved view.
assert.equal(all.c2n5_sms_lei_pending.sprite, '')
assert.equal(all.c2n3_dawn_light.sprite, '')
assert.equal(all.c2am_lowdose_teaser1.sprite, '')
assert.equal(CH2_SCANS.c2n3_coronary_volume.mode, 'reconstruct')
assert.equal(CH2_SCANS.c2n3_coronary_volume.durationMs, 1500)

// Compare untouched screen engines to the actual approved parent, not a newly
// generated pin; changes in this revision must remain inside Ch2Screen.
const base = execFileSync('git', ['show', 'dadc208:app/src/App.tsx'], { encoding: 'utf8' }).replaceAll('\r\n', '\n')
const current = beforeChapterPreloadSource('app/src/App.tsx', readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')).replaceAll('\r\n', '\n')
for (const [from, to] of [['function NightScreen(', 'function DayScreen('], ['function ScriptScreen(', 'function Ch2Screen(']]) {
  const segment = text => text.slice(text.indexOf(from), text.indexOf(to))
  assert(base.includes(from) && current.includes(from) && base.includes(to) && current.includes(to))
  assert.equal(segment(current), segment(base), `${from} original game engine frozen`)
}
console.log('PASS ch2-cta-presentation-data: all choices, atomic return, legacy acknowledged resume, all other observations unchanged, telephone exceptions and Chapter 1/DR/DSA screen engines frozen')
