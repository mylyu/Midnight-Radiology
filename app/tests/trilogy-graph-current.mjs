// Current graph contract: live files only, no Git history or fixed content totals.
// node --import tsx tests/trilogy-graph-current.mjs
import assert from 'node:assert/strict'
import { TRILOGY } from '../src/game/trilogy-registry.ts'
import { TRILOGY_COMMUNICATION_CUES, TRILOGY_NARRATED_COMMUNICATION_CUES } from '../src/game/trilogy-communications.ts'

// These are semantic capabilities, not a freeze on the number of labs or cases.
const coreTasks = {
  ch3: ['probe', 'tgc', 'm_mode', 'doppler'],
  // CH4's current mainline is exploration-led; advanced MRI tasks are DLC-only.
  ch4: [],
  ch5: ['fusion', 'spect', 'counting'],
}
const scanKinds = { ch3: 'ultrasound', ch4: 'mri', ch5: 'pet' }
const totals = {}

for (const [id, chapter] of Object.entries(TRILOGY)) {
  const steps = chapter.steps
  assert(chapter.steps[chapter.afterQuiz], `${id}: after-quiz ending exists`)
  for (const shift of chapter.shifts) {
    assert(steps[shift.start], `${id}: shift start exists: ${shift.start}`)
    if (shift.checkinAt) assert(steps[shift.checkinAt], `${id}: check-in cursor exists: ${shift.checkinAt}`)
  }
  for (const [node, step] of Object.entries(steps)) {
    const edges = [step.next, step.tool?.next,
      ...(step.choices ?? []).flatMap(choice => [choice.next, choice.risk?.next])].filter(Boolean)
    for (const target of edges) {
      if (!target.startsWith('@')) assert(steps[target], `${id}/${node}: dangling successor ${target}`)
    }
    if (step.tool) assert(steps[step.tool.next], `${id}/${node}: lab has a real completion target`)
    if (step.scan) {
      assert.equal(step.scan.kind, scanKinds[id], `${id}/${node}: acquisition matches the modality`)
      assert.equal(step.scan.durationMs ?? 3000, 3000, `${id}/${node}: acquisition performance stays three seconds`)
      assert.equal(step.image ?? '', '', `${id}/${node}: result is not exposed before acquisition`)
      assert.equal(step.effect, undefined, `${id}/${node}: no result reward before acquisition`)
      assert(steps[step.next], `${id}/${node}: acquisition has a real result target`)
    }
  }
  const tasks = new Set(Object.values(steps).filter(step => step.tool).map(step => step.tool.task))
  for (const task of coreTasks[id]) assert(tasks.has(task), `${id}: current core lab remains available: ${task}`)
  const values = Object.values(steps)
  totals[id] = {
    nodes: values.length,
    tools: values.filter(step => step.tool).length,
    scans: values.filter(step => step.scan).length,
    tasks: [...tasks].sort(),
  }
}

// Communication cues are conversation arrivals, not per-line sounds. Keep this
// explicit so a rewritten node cannot leave a stale cue or silence a new call.
const expectedCommunicationCues = {
  ch3: ['c3_intro_call_0', 'c3_s2_start_1', 'c3_s4_wen_0', 'c3_s4_zhou_0'],
  ch4: [
    'c4_1_family_1', 'c4_2_close_2', 'c4_2_xu_0', 'c4_3_bai_0', 'c4_3_delay_call_0', 'c4_3_delay_people_0', 'c4_3_install_4',
    'c4_4_remote_1', 'c4_4_sequence_0', 'c4_4_wen_0',
    'c4_6_shen_0', 'c4_cousin_report_2', 'c4_departure_0', 'c4_epilogue_baby_1',
    'c4_wrap_1', 'c4_wrap_research_0',
  ],
  ch5: [
    'c5_epi_after_6', 'c5_s2_postcard_2', 'c5_s3_meeting_0', 'c5_s3_postcard_2', 'c5_s3_sms_0',
    'c5_s4_0', 'c5_s5_postcard_2', 'c5_s5_qian_0', 'c5_seed_pot_1',
  ],
}
assert.deepEqual([...TRILOGY_NARRATED_COMMUNICATION_CUES].sort(),
  ['c5_s3_meeting_0'])
for (const [id, chapter] of Object.entries(TRILOGY)) {
  const owned = Object.entries(TRILOGY_COMMUNICATION_CUES).filter(([node]) => node.startsWith(`${id.replace('ch', 'c')}_`))
  assert.deepEqual(owned.map(([node]) => node).sort(), expectedCommunicationCues[id], `${id}: exact communication arrivals`)
  for (const [node, cue] of owned) {
    const step = chapter.steps[node]
    assert(step, `${id}/${node}: cue target exists`)
    if (TRILOGY_NARRATED_COMMUNICATION_CUES.has(node)) assert.equal(step.communication, undefined,
      `${id}/${node}: narrated call needs no remote-person card`)
    else assert.equal(step.communication, cue, `${id}/${node}: cue matches the visible communication`)
    assert.equal(step.sfx, undefined, `${id}/${node}: no second authored sound overlaps the arrival cue`)
  }
}
for (const retired of ['c4_5_family_0', 'c5_s3_lei_0', 'c5_s3_reveal_5']) {
  assert(!TRILOGY_COMMUNICATION_CUES[retired], `${retired}: no stale or mid-conversation cue`)
}
totals.communicationCues = Object.fromEntries(Object.entries(expectedCommunicationCues).map(([id, nodes]) => [id, nodes.length]))

console.log(JSON.stringify({ status: 'passed', contract: 'current-live-graph', totals }, null, 2))
