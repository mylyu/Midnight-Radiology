// Targeted narrative bridges: preserve old rewards/cursors, test real resolved paths.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { writeFileSync, unlinkSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { CH3 } from '../src/game/ch3.ts'
import { freshState } from '../src/game/store.ts'
import { initializeTrilogy, patchTrilogy, enterTrilogyNode, trilogyStep,
  trilogyProgress, trilogyAdvance, trilogyChoose } from '../src/game/trilogy-session.ts'

const root = fileURLToPath(new URL('../../', import.meta.url))
const baselineFile = fileURLToPath(new URL(`../src/game/.ch3-transitions-baseline-${process.pid}.ts`, import.meta.url))
let baseline
try {
  writeFileSync(baselineFile, execFileSync('git', ['show', '756f472:app/src/game/ch3.ts'], { cwd: root }))
  baseline = (await import(pathToFileURL(baselineFile).href)).CH3
} finally { unlinkSync(baselineFile) }

const newIds = Object.keys(CH3.steps).filter(id => !baseline.steps[id])
assert.equal(newIds.length, 13, 'Only the thirteen agreed dialogue lines are new')
for (const id of newIds) for (const key of ['effect', 'card', 'choices', 'tool', 'voice', 'scan'])
  assert.equal(CH3.steps[id][key], undefined, `${id}: pure dialogue cannot introduce ${key}`)
for (const [id, old] of Object.entries(baseline.steps)) {
  const step = CH3.steps[id]
  assert(step, `Legacy cursor retained: ${id}`)
  for (const key of ['effect', 'card', 'tool', 'voice', 'scan'])
    assert.deepEqual(step[key], old[key], `${id}: existing ${key} unchanged`)
  // A clinical exit is deliberately rerouted through dialogue, never re-rewarded.
  const payload = choices => choices?.map(({ next: _next, ...choice }) => choice)
  assert.deepEqual(payload(step.choices), payload(old.choices), `${id}: existing choice rewards/conditions retained`)
}

function fixture(id, flags = {}, shift = 0) {
  const state = initializeTrilogy({ ...freshState('f'), flags, gold: 730, skill: 12,
    heart: 9, wealth: 4, dlc: { ch2: { done: true, marker: 'untouched' } } }, CH3, 'story-transitions')
  return enterTrilogyNode(patchTrilogy(state, 'ch3', { shift }), CH3, id)
}
const numbers = s => [s.gold, s.skill, s.heart, s.wealth, s.ap]
for (const flags of [{ c3_s1_wait_done: true }, { c3_s1_wait_done: true, n4_kind: true }]) {
  assert.match(trilogyStep(fixture('c3_s1_aunt_0', flags), CH3).text, /刚才在窗口/)
  assert.match(trilogyStep(fixture('c3_s1_aunt_1', flags), CH3).text, /夹好了/)
  assert.doesNotMatch(trilogyStep(fixture('c3_s1_aunt_1', flags), CH3).text, /哎，是你/)
}
assert.match(trilogyStep(fixture('c3_s1_aunt_1', { n4_kind: true }), CH3).text, /两年前/)
function chain(start, middle, end, shift = 0) {
  let s = fixture(start, {}, shift)
  const before = numbers(s), chapter2 = s.dlc.ch2
  for (const expected of [...middle, end]) {
    const id = trilogyProgress(s, 'ch3').stepId
    s = trilogyAdvance(s, CH3, id)
    assert.equal(trilogyProgress(s, 'ch3').stepId, expected)
    assert.deepEqual(numbers(s), before, 'Ordinary transitions do not grant or consume values')
    assert.deepEqual(s.dlc.ch2, chapter2, 'CH2 remains isolated')
    const restored = JSON.parse(JSON.stringify(s))
    assert.equal(trilogyStep(restored, CH3).text, trilogyStep(s, CH3).text, 'Restored cursor resolves identically')
  }
}
chain('c3_s1_aunt_13', ['c3_s1_between_patients_0', 'c3_s1_between_patients_1'], 'c3_s1_stone_0')
chain('c3_s2_plan_5', ['c3_s2_pause_0', 'c3_s2_pause_1', 'c3_s2_pause_2'], 'c3_s2_plan_6', 1)
chain('c3_s3_wang_9', ['c3_s3_after_wang_0', 'c3_s3_after_wang_1'], 'c3_s3_motion_0', 2)
chain('c3_s3_xu_8', ['c3_s3_leave_clinic_0', 'c3_s3_leave_clinic_1', 'c3_s3_leave_clinic_2'], 'c3_s3_mirror_0', 2)
let hub = fixture('c3_s4_hub', {}, 3)
const clinical = trilogyStep(hub, CH3).choices.at(-1)
assert.equal(clinical.next, 'c3_s4_open_clinic_0', 'Resolved place hub uses the new transition')
hub = trilogyChoose(hub, CH3, 'c3_s4_hub', clinical)
assert.equal(trilogyProgress(hub, 'ch3').stepId, 'c3_s4_open_clinic_0')
chain('c3_s4_open_clinic_0', ['c3_s4_open_clinic_1', 'c3_s4_open_clinic_2'], 'c3_s4_clinic_0', 3)

for (let i = 0; i < 3; i++) {
  const id = `c3_s3_leave_clinic_${i}`
  const alone = trilogyStep(fixture(id, {}, 2), CH3)
  assert(!alone.sprite2, 'No unexperienced Tang companionship')
  assert(!alone.text.includes('小唐'))
  const arranged = trilogyStep(fixture(id, { c3_s3_tang_done: true }, 2), CH3)
  assert.equal(arranged.sprite2, 'char_tang')
  if (i === 0) assert.match(arranged.text, /小唐.*东边病床梯/)
}
for (const id of ['c3_s2_plan_3', 'c3_s2_plan_4']) {
  const step = trilogyStep(fixture(id, {}, 1), CH3)
  assert.equal(step.bg, 'bg_waiting_day_v2')
  assert.equal(step.sprite, 'pat_cousin')
  assert(!step.sprite2, 'Mei does not accompany the elevator farewell')
}
for (const id of ['c3_s2_plan_5', 'c3_s2_pause_0', 'c3_s2_pause_1', 'c3_s2_pause_2']) {
  const step = trilogyStep(fixture(id, {}, 1), CH3)
  assert.equal(step.bg, 'bg_us_room_day')
  assert.equal(step.sprite, 'char_mei')
  assert(!step.sprite2, 'Cousin has left for obstetrics')
}
// Existing saves at either side do not rewind to a new bridge or repeat tasks.
for (const id of ['c3_s1_stone_0', 'c3_s2_plan_6', 'c3_s3_motion_0', 'c3_s3_mirror_0', 'c3_s4_clinic_0']) {
  const s = fixture(id)
  assert.equal(trilogyProgress(s, 'ch3').stepId, id)
  assert(trilogyStep(JSON.parse(JSON.stringify(s)), CH3))
}
console.log(`CH3 transitions passed: ${newIds.length} pure lines, five bridges, ${Object.keys(baseline.steps).length} preserved cursors/rewards, optional Tang and old-save staging.`)
