// Focused data/state checks for the three-pass review's story fixes.
// Existing Tang/liver coverage remains in ch3-liver-story.mjs; no full walk here.
import assert from 'node:assert/strict'
import { CH3 } from '../src/game/ch3.ts'
import { freshState } from '../src/game/store.ts'
import { initializeTrilogy, patchTrilogy, enterTrilogyNode, trilogyStep,
  trilogyProgress, trilogyAdvance, trilogyChoose, trilogyGive } from '../src/game/trilogy-session.ts'
import { ch3ContactName } from '../src/components/ch3-presentation.ts'

const numbers = s => Object.fromEntries(['gold', 'skill', 'heart', 'wealth', 'ap'].map(key => [key, s[key]]))
function fixture(node, shift = 0) {
  const s = initializeTrilogy({ ...freshState('f'), gold: 730, skill: 12, heart: 9, wealth: 4,
    dlc: { ch2: { done: true, marker: 'unchanged' }, ldct: { done: true, marker: 'unchanged' } } }, CH3, 'ch3-parity')
  return enterTrilogyNode(patchTrilogy(s, 'ch3', { shift }), CH3, node)
}
function walk(s, target, path = []) {
  for (let i = 0; i < 15; i++) {
    const node = trilogyProgress(s, 'ch3').stepId
    path.push(node)
    if (node === target) return s
    const next = trilogyAdvance(s, CH3, node)
    assert.notEqual(trilogyProgress(next, 'ch3').stepId, node, `Unexpected stop at ${node}`)
    s = next
  }
  assert.fail(`Did not reach ${target}`)
}

// Retain the acquired gallstone frame during the question and either response.
for (const node of ['c3_s1_stone_3', 'c3_s1_stone_4', 'c3_s1_shadow_good', 'c3_s1_shadow_miss', 'c3_s1_shadow_retry']) {
  const step = trilogyStep(fixture(node), CH3)
  assert.equal(step.image, 'us_gallstone', `${node}: original acquired frame stays visible`)
  assert(!step.sprite && !step.sprite2, `${node}: no portrait covering the observation frame`)
  assert(!step.scan && !step.tool, `${node}: retaining a frame does not add another acquisition/task`)
}
for (const target of ['c3_s1_shadow_good', 'c3_s1_shadow_miss', 'c3_s1_shadow_retry']) {
  const earnedSkill = target === 'c3_s1_shadow_good' ? 1 : 0
  const start = fixture('c3_s1_stone_3')
  let s = trilogyAdvance(start, CH3, 'c3_s1_stone_3')
  const choice = trilogyStep(s, CH3).choices.find(row => row.next === target)
  assert(choice)
  s = trilogyChoose(s, CH3, 'c3_s1_stone_4', choice)
  assert.deepEqual(numbers(s), { ...numbers(start), skill: start.skill + earnedSkill },
    'The original skill reward now belongs to the correct observation, not compulsory dialogue')
  assert.strictEqual(trilogyChoose(s, CH3, 'c3_s1_stone_4', choice), s, 'Stale observation click is ignored')
  s = walk(s, 'c3_s1_shadow_1')
  assert.deepEqual(numbers(s), { ...numbers(start), skill: start.skill + earnedSkill },
    'The common explanation does not duplicate the relocated observation reward')
  assert.equal(s.badges.filter(id => id === 'c3_shadow_reader').length, 1)
  assert.equal(s.cards.filter(id => id === 'c3_shadow').length, 1)
  assert.strictEqual(enterTrilogyNode(s, CH3, 'c3_s1_shadow_1').skill, s.skill)
  assert.deepEqual(s.dlc.ch2, start.dlc.ch2)
  assert.deepEqual(s.dlc.ldct, start.dlc.ldct)
}

// Fourth-shift clinical work now precedes a clearly later, optional-speed teaching demonstration.
const hub = fixture('c3_s4_hub', 3)
const clinic = trilogyStep(hub, CH3).choices.at(-1)
assert.equal(clinic.next, 'c3_s4_open_clinic_0')
let s = trilogyChoose(hub, CH3, 'c3_s4_hub', clinic)
const clinicalPath = []
s = walk(s, 'c3_s4_doppler_0', clinicalPath)
assert.deepEqual(clinicalPath, ['c3_s4_open_clinic_0', 'c3_s4_open_clinic_1', 'c3_s4_open_clinic_2',
  'c3_s4_clinic_0', 'c3_s4_clinic_1', 'c3_s4_clinic_2', 'c3_s4_doppler_0'])
assert.deepEqual(numbers(s), numbers(hub), 'The clinical bridge does not add points/AP or another wage')
for (const node of clinicalPath.slice(0, 3)) {
  const step = trilogyStep(fixture(node, 3), CH3)
  assert.equal(step.sprite, 'char_mei')
  assert.equal(step.image, undefined, 'Examination handover precedes the acquired image')
  assert(!step.effect && !step.scan && !step.tool && !step.choices)
}
for (const node of clinicalPath.slice(3, -1)) {
  const step = trilogyStep(fixture(node, 3), CH3)
  assert.equal(step.image, 'us_c3_color_doppler_v1', 'Actual grayscale/color comparison stays visible during all three lines')
  assert(!step.sprite && !step.sprite2, 'No portrait covers the clinical image')
  assert.equal(step.effect, undefined)
  assert(!step.scan && !step.tool && !step.choices, 'Short clinical bridge is not a new task')
}
assert.match(CH3.steps.c3_s4_doppler_0.text, /午后轮休/)
assert.match(CH3.steps.c3_s4_doppler_0.text, /接班同事/)
assert.equal(trilogyStep(fixture('c3_s4_doppler_0', 3), CH3).sprite, 'char_mei', 'Mei returns for the subsequent demonstration')
assert.equal(CH3.cards.c3_trace.image, 'us_c3_color_doppler_v1')
assert(CH3.assets.includes('us_c3_color_doppler_v1'))
assert(CH3.assets.includes('bg_c3_shared_office_day_v1'))
for (const step of Object.values(CH3.steps)) assert.notEqual(step.bg, 'bg_office_day', 'CH3 communal work never uses the director private office')
for (const node of ['c3_s2_roster_0', 'c3_s4_han_0', 'c3_s4_han_1', 'c3_s4_han_note']) {
  assert.equal(trilogyStep(fixture(node, node.includes('_s4_') ? 3 : 1), CH3).bg, 'bg_c3_shared_office_day_v1')
}
assert.equal(trilogyStep(fixture('c3_s2_label_0', 1), CH3).bg, 'bg_us_room_day',
  'The author moved teaching-file review to the examination-room workstation')

// Fixed remote identities cover narration and protagonist replies as well as their own lines.
const calls = [
  [Array.from({ length: 5 }, (_, i) => `c3_intro_call_${i}`), 'pat_cousin', '表姐', 'c3_intro_call_5'],
  [Array.from({ length: 3 }, (_, i) => `c3_intro_confirm_${i}`), 'pat_cousin', '表姐', 'c3_intro_confirm_3'],
  [Array.from({ length: 3 }, (_, i) => `c3_s4_zhou_${i}`), 'char_zhou', '老周', 'c3_s4_hub'],
  [Array.from({ length: 4 }, (_, i) => `c3_s4_wen_${i}`), 'char_wen', '雯雯', 'c3_s4_wen_4'],
]
for (const [nodes, avatar, name, after] of calls) {
  for (const node of nodes) {
    const step = trilogyStep(fixture(node, node.includes('s4_') ? 3 : 0), CH3)
    assert.equal(step.phone, avatar, `${node}: counterpart avatar persists`)
    assert.equal(ch3ContactName(CH3, step), name)
    assert(!step.sprite && !step.sprite2, `${node}: the remote person does not stand in the room`)
    for (const key of ['gold', 'skill', 'heart', 'wealth', 'ap']) assert.equal(step.effect?.[key] ?? 0, 0)
  }
  const afterStep = trilogyStep(fixture(after, after.includes('s4_') ? 3 : 0), CH3)
  assert(!afterStep.phone && !afterStep.communication, `${after}: the contact card closes after the call/message`)
}

// The shortened learning responses retain their original rewards and collectibles.
assert.deepEqual(CH3.steps.c3_s1_aunt_7.effect, { skill: 1, badge: 'c3_first_probe' })
assert.equal(CH3.steps.c3_s1_aunt_7.card, 'c3_frequency')
assert.equal(CH3.steps.c3_s1_gain_2.effect, undefined)
assert.equal(CH3.steps.c3_s1_gain_2.card, 'c3_breast')
for (let i = 0; i < 4; i++) assert.equal(CH3.steps[`c3_s1_signal_${i}`].effect, undefined)

// Tang is physically present at each gift opportunity; the reply returns once to the same dialogue.
for (const [node, shift] of [['c3_tang_first_3', 0], ['c3_tang_break_1', 1], ['c3_s3_tang_0', 2], ['c3_tang_return_1', 4]]) {
  for (const item of ['milktea', 'snack']) {
    const start = { ...fixture(node, shift), items: [item] }
    const step = trilogyStep(start, CH3)
    assert.equal(step.giftTo, 'tang')
    assert.equal(step.sprite, 'char_tang')
    assert(!step.phone && !step.communication)
    const given = trilogyGive(start, CH3, node, item)
    assert(!given.items.includes(item))
    assert.equal(trilogyProgress(given, 'ch3').giftReply.person, 'tang')
    assert.deepEqual(numbers(given), { ...numbers(start), heart: start.heart + (item === 'snack' ? 1 : 0) })
    const restored = JSON.parse(JSON.stringify(given))
    assert.strictEqual(trilogyGive(restored, CH3, node, item), restored, 'A restored reply cannot consume a second gift')
    const continued = trilogyAdvance(restored, CH3, node)
    assert.equal(trilogyProgress(continued, 'ch3').stepId, node)
    assert(!trilogyProgress(continued, 'ch3').giftReply)
    assert.deepEqual(numbers(continued), numbers(given))
    assert.strictEqual(trilogyGive({ ...continued, items: [item] }, CH3, node, item).heart, continued.heart,
      'One colleague accepts at most one gift per shift')
  }
}
console.log('PASS CH3 parity story: retained observation frame, clinical bridge, phone spans and unchanged rewards')
