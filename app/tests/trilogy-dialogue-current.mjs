// Current narrative contract: node IDs and rewards stay stable while dialogue is revised.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { CH3 } from '../src/game/ch3.ts'
import { TRILOGY } from '../src/game/trilogy-registry.ts'
import { trilogyToolActionCopy } from '../src/game/trilogy-tool-copy.ts'

assert.equal(CH3.steps.c3_liver_tgc_intro_0.speaker, 'fatty_patient', 'The liver patient states his own concern before TGC')
assert.match(CH3.steps.c3_liver_tgc_intro_0.text, /请假复查/)
assert.equal(CH3.steps.c3_s3_motion_1.speaker, 'wang', 'Wang asks about the M-mode display during his examination')
assert.equal(CH3.steps.c3_wang_color_intro_0.speaker, 'wang', 'Wang asks what the colours mean')
assert.match(CH3.steps.c3_wang_color_intro_1.text, /不直接等于好坏/)
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
