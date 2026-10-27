// Focused state coverage for cardiac-flow questions and Mei's final-shift farewell.
// Quiz presentation is covered separately by ch3-quiz-feedback-ui.mjs.
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { CH3 } from '../src/game/ch3.ts'
import { freshState } from '../src/game/store.ts'
import { initializeTrilogy, patchTrilogy, enterTrilogyNode, trilogyStep,
  trilogyProgress, trilogyAdvance, trilogyChoose, completeTrilogyTool } from '../src/game/trilogy-session.ts'

const numbers = s => Object.fromEntries(['gold', 'skill', 'heart', 'wealth', 'ap'].map(key => [key, s[key]]))
function fixture(node, shift, flags = {}) {
  const s = initializeTrilogy({ ...freshState('f'), gold: 730, skill: 12, heart: 9, wealth: 4,
    flags, dlc: { ch2: { done: true, marker: 'unchanged' }, ldct: { done: true, marker: 'unchanged' } } }, CH3, 'ch3-quiz-farewell')
  return enterTrilogyNode(patchTrilogy(s, 'ch3', { shift }), CH3, node)
}
function walk(s, expected) {
  for (const id of expected) {
    assert.equal(trilogyProgress(s, 'ch3').stepId, id)
    assert(!trilogyStep(s, CH3).tool && !trilogyStep(s, CH3).scan, `${id} does not add another examination`)
    s = trilogyAdvance(s, CH3, id)
  }
  return s
}
function sameNumbersAndOtherChapters(before, after) {
  assert.deepEqual(numbers(after), numbers(before), 'Ordinary dialogue/questions do not change attributes or AP')
  assert.deepEqual(after.dlc.ch2, before.dlc.ch2)
  assert.deepEqual(after.dlc.ldct, before.dlc.ldct)
  assert.deepEqual(after.cards, before.cards)
  assert.deepEqual(after.badges, before.badges)
}

// Start before M-mode: it remains part of Wang's examination before color/spectrum.
for (const target of ['c3_wang_color_direction', 'c3_wang_color_vessel']) {
  const start = fixture('c3_s3_wang_7', 2)
  let s = walk(start, ['c3_s3_wang_7'])
  s = walk(s, ['c3_s3_motion_0', 'c3_s3_motion_1'])
  assert.equal(trilogyProgress(s, 'ch3').stepId, 'c3_s3_motion_2')
  assert.equal(trilogyStep(s, CH3).tool.task, 'm_mode')
  s = completeTrilogyTool(s, CH3, 'c3_s3_motion_2')
  s = walk(s, ['c3_s3_motion_3', 'c3_s3_motion_4'])
  assert.equal(s.cards.filter(id => id === 'c3_echo').length, 1, 'The original M-mode card is retained')
  for (const id of ['c3_wang_color_intro_0', 'c3_wang_color_intro_1']) {
    assert.equal(trilogyProgress(s, 'ch3').stepId, id)
    assert.equal(trilogyStep(s, CH3).image, 'us_echo')
    s = trilogyAdvance(s, CH3, id)
  }
  for (const id of ['c3_wang_color_0', 'c3_wang_color_1']) {
    assert.equal(trilogyProgress(s, 'ch3').stepId, id)
    assert.equal(trilogyStep(s, CH3).image, 'us_c3_cardiac_color_v1')
    s = trilogyAdvance(s, CH3, id)
  }
  assert.equal(trilogyProgress(s, 'ch3').stepId, 'c3_wang_color_question')
  assert.equal(trilogyStep(s, CH3).choices.length, 2)
  const choice = trilogyStep(s, CH3).choices.find(row => row.next === target)
  s = trilogyChoose(s, CH3, 'c3_wang_color_question', choice)
  assert.equal(trilogyProgress(s, 'ch3').stepId, target)
  assert.equal(trilogyStep(s, CH3).image, 'us_c3_cardiac_color_v1')
  assert.strictEqual(trilogyChoose(s, CH3, 'c3_wang_color_question', choice), s, 'A stale question click cannot submit twice')
  const resumed = JSON.parse(JSON.stringify(s))
  assert.equal(trilogyStep(resumed, CH3).text, trilogyStep(s, CH3).text, 'Saved response resumes in place')
  s = trilogyAdvance(resumed, CH3, target)
  for (const id of ['c3_wang_spectrum_0', 'c3_wang_spectrum_1', 'c3_wang_spectrum_2']) {
    assert.equal(trilogyProgress(s, 'ch3').stepId, id)
    assert.equal(trilogyStep(s, CH3).echoSpectrum, true)
    assert(!trilogyStep(s, CH3).scan && !trilogyStep(s, CH3).tool)
    s = trilogyAdvance(s, CH3, id)
  }
  s = walk(s, ['c3_wang_finish_modes_0', 'c3_wang_finish_modes_1', 'c3_wang_finish_modes_2'])
  assert.equal(trilogyProgress(s, 'ch3').stepId, 'c3_s3_wang_8')
  assert(!trilogyStep(s, CH3).image, 'The color frame leaves before reporting/hand-over')
  assert(s.flags.c3_wang_reviewed, 'Original case-completion flag is still applied')
  sameNumbersAndOtherChapters({ ...start, cards: [...(start.cards ?? []), 'c3_echo'] }, s)
}
assert.match(CH3.steps.c3_s4_start_2.text, /上回王叔心超/)
assert.match(CH3.steps.c3_s4_clinic_1.text, /先认位置.*色标/)

// Final-shift concern is a short conversation, with no new diagnosis or reward.
for (const flags of [{}, { c3_cousin_followup_stable: true }]) {
  const start = fixture('c3_s5_start_0', 4, flags)
  let s = trilogyAdvance(start, CH3, 'c3_s5_start_0')
  for (let i = 0; i < 6; i++) {
    const id = `c3_s5_cousin_check_${i}`
    assert.equal(trilogyProgress(s, 'ch3').stepId, id)
    const step = trilogyStep(s, CH3)
    assert.equal(step.sprite, 'char_mei')
    assert(!step.sprite2 && !step.image && !step.effect && !step.voice)
    if (i === 1) assert.match(step.text, flags.c3_cousin_followup_stable ? /按安排复查/ : /十毫米/)
    if (i === 2) assert.match(step.text, /轻度侧脑室增宽.*很多.*再看看有没有别的问题/)
    if (i === 4) assert.match(step.text, /脑部结构.*再看细一点.*陪她去/)
    s = trilogyAdvance(s, CH3, id)
  }
  assert.equal(trilogyProgress(s, 'ch3').stepId, 'c3_s5_start_1')
  sameNumbersAndOtherChapters(start, s)
  assert.equal(s.flags.c3_cousin_followup_stable, start.flags.c3_cousin_followup_stable)
  assert(!s.flags.c3_cousin_mri_pending, 'The new concern does not pre-run the later MRI')
}

// Training rewards were already received before this farewell; praise earns no points.
const farewellStart = fixture('c3_s5_assess_7', 4)
let farewell = trilogyAdvance(farewellStart, CH3, 'c3_s5_assess_7')
assert.equal(trilogyProgress(farewell, 'ch3').stepId, 'c3_s5_mei_farewell_0')
const closeup = trilogyStep(farewell, CH3)
assert.equal(closeup.image, 'cg_c3_mei_farewell_v1')
assert(closeup.closeup && closeup.cameraMotion === 'push')
assert(!closeup.sprite && !closeup.sprite2, 'No duplicate portrait over the closeup')
assert.match(closeup.text, /悟性挺高/)
farewell = trilogyAdvance(farewell, CH3, 'c3_s5_mei_farewell_0')
for (const id of ['c3_s5_mei_farewell_1', 'c3_s5_mei_farewell_2']) {
  assert.equal(trilogyProgress(farewell, 'ch3').stepId, id)
  const step = trilogyStep(farewell, CH3)
  assert.equal(step.sprite, 'char_mei')
  assert(!step.closeup && !step.image, 'Return to normal staged dialogue after the closeup')
  farewell = trilogyAdvance(farewell, CH3, id)
}
assert.equal(trilogyProgress(farewell, 'ch3').stepId, 'c3_s5_notice_end_4')
assert.equal(trilogyStep(farewell, CH3).next, 'c3_tang_return_0', 'Existing lunch/gift hand-over stays reachable')
sameNumbersAndOtherChapters(farewellStart, farewell)
const catalog = JSON.parse(readFileSync(new URL('../src/lib/image-assets.catalog.json', import.meta.url)))
assert(CH3.assets.includes(closeup.image), 'The closeup is part of CH3 complete preload')
assert(existsSync(new URL(`../public/assets/${catalog[closeup.image]}`, import.meta.url)))

// New saves still end while waiting for the MRI result; old stable saves keep their history.
let pending = fixture('c3_epilogue_14', 4)
assert.match(trilogyStep(pending, CH3).text, /报告还没出来/)
pending = walk(pending, ['c3_epilogue_14', 'c3_cousin_mri_wait_0', 'c3_cousin_mri_wait_1'])
assert.equal(trilogyProgress(pending, 'ch3').stepId, 'c3_epilogue_20')
assert.match(trilogyStep(pending, CH3).text, /叫到表姐的名字/)
assert(!pending.flags.c3_cousin_followup_stable)
const legacy = fixture('c3_epilogue_14', 4, { c3_cousin_followup_stable: true })
assert.equal(trilogyStep(legacy, CH3).next, 'c3_epilogue_20')
assert(!trilogyStep(legacy, CH3).effect)
assert(!legacy.flags.c3_cousin_mri_pending)
console.log('PASS ch3 cardiac questions, final-shift care, farewell staging, preload and MRI continuity')
