// Current narrative contract: node IDs and rewards stay stable while dialogue is revised.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { CH3 } from '../src/game/ch3.ts'
import { TRILOGY } from '../src/game/trilogy-registry.ts'
import { trilogyToolActionCopy } from '../src/game/trilogy-tool-copy.ts'
import { freshState } from '../src/game/store.ts'

assert.equal(CH3.steps.c3_liver_tgc_intro_0.speaker, 'fatty_patient', 'The liver patient states his own concern before TGC')
assert.match(CH3.steps.c3_liver_tgc_intro_0.text, /请假复查/)
for (const id of ['c3_liver_tgc_intro_0', 'c3_liver_tgc_intro_1']) {
  assert.equal(CH3.steps[id].sprite, 'pat_c3_young_liver_v1', `${id}: the speaking patient remains present`)
  assert.equal(CH3.steps[id].sprite2, 'char_mei', `${id}: Mei remains beside the patient`)
}
assert.equal(CH3.steps.c3_s3_motion_1.speaker, 'wang', 'Wang asks about the M-mode display during his examination')
assert.equal(CH3.steps.c3_wang_color_intro_0.speaker, 'wang', 'Wang asks what the colours mean')
assert.match(CH3.steps.c3_wang_color_intro_1.text, /不直接等于好坏/)
for (const id of ['c3_wang_color_intro_0', 'c3_wang_color_intro_1']) {
  assert.equal(CH3.steps[id].image, 'us_c3_cardiac_color_v1', `${id}: show colour flow before discussing red and blue`)
}

const current = freshState('m')
const duringExam = CH3.adapt('c3_s3_motion_1', CH3.steps.c3_s3_motion_1, current)
assert.equal(duringExam.speaker, 'wang')
assert.equal(duringExam.sprite, 'pat_wang_recovery')
const reviewed = { ...current, flags: { ...current.flags, c3_wang_reviewed: true } }
const reviewedBefore = structuredClone(reviewed)
assert.match(CH3.adapt('c3_s3_motion_0', CH3.steps.c3_s3_motion_0, reviewed).text, /已经回心内科/)
const recap = CH3.adapt('c3_s3_motion_1', CH3.steps.c3_s3_motion_1, reviewed)
assert.equal(recap.speaker, 'me', 'After Wang leaves, the protagonist asks the recap question')
assert.equal(recap.sprite, 'char_mei')
assert.equal(recap.sprite2, '')
assert.doesNotMatch(recap.text, /我这心脏/)
assert.equal(CH3.adapt('c3_s3_motion_4', CH3.steps.c3_s3_motion_4, reviewed).next, 'c3_s3_waiting_0')
assert.deepEqual(reviewed, reviewedBefore, 'Adapting old dialogue does not invent progress or rewards')
const completedTgc = { ...current, dlc: { ...current.dlc, ch3: { chapter: {
  visited: [], tools: { c3_s2_plan_6: { completed: true } },
} } } }
for (const id of ['c3_liver_tgc_intro_0', 'c3_liver_tgc_intro_1']) {
  const recap = CH3.adapt(id, CH3.steps[id], completedTgc)
  assert.equal(recap.speaker, 'sys', 'The completed-exercise bridge remains narration, not patient speech')
  assert.equal(recap.next, 'c3_liver_observe')
}
assert.match(CH3.steps.c3_s5_cousin_check_3.text, /怕又说快了/)
assert.doesNotMatch(CH3.steps.c3_s5_cousin_check_2.text, /照样上学/, 'No premature reassurance replaces follow-up')

const legacy = readFileSync(new URL('../src/game/ch3-legacy-save.ts', import.meta.url), 'utf8')
assert.match(legacy, /must never invent progress/)
assert.match(legacy, /c3_s2_plan_6/)
for (const chapter of Object.values(TRILOGY)) {
  const tasks = new Set(Object.values(chapter.steps).filter(step => step.tool).map(step => step.tool.task))
  for (const task of tasks) {
    const done = trilogyToolActionCopy(chapter.id, task)
    const assisted = trilogyToolActionCopy(chapter.id, task, true)
    assert(!done.includes('留这一版') && !done.includes('接着聊'), `${chapter.id}/${task}: contextual completion copy`)
    assert(assisted.includes('陪我'), `${chapter.id}/${task}: explicit assisted action`)
  }
}
console.log('PASS current dialogue, patient agency, contextual lab actions and isolated legacy bridge')
