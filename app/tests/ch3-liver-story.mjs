// Targeted case and colleague-bridge state checks; no browser or full-chapter run.
// node --import tsx tests/ch3-liver-story.mjs
import assert from 'node:assert/strict'
import { CH3 } from '../src/game/ch3.ts'
import { TRILOGY_CASE_NAMES } from '../src/game/trilogy-evidence.ts'
import { freshState } from '../src/game/store.ts'
import { initializeTrilogy, patchTrilogy, enterTrilogyNode, trilogyProgress,
  trilogyStep, trilogyAdvance, trilogyChoose, beginTrilogyScan, completeTrilogyScan } from '../src/game/trilogy-session.ts'

const copy = value => JSON.parse(JSON.stringify(value))
const sameSave = (actual, expected, why) => assert.deepEqual(copy(actual), copy(expected), why)
const numbers = s => Object.fromEntries(['gold', 'skill', 'heart', 'wealth', 'ap'].map(key => [key, s[key]]))
function fixture(node, shift = 1) {
  const base = { ...freshState('f'), seed: 20261026, gold: 730, skill: 12, heart: 9, wealth: 4,
    dlc: { ch2: { done: true, marker: 'keep-ch2' }, ldct: { done: true, marker: 'keep-ldct' } } }
  const initialized = initializeTrilogy(base, CH3, 'ch3-liver-story')
  return enterTrilogyNode(patchTrilogy(initialized, 'ch3', { shift }), CH3, node)
}
function walk(s, target, visit = []) {
  for (let i = 0; i < 35; i++) {
    const node = trilogyProgress(s, 'ch3').stepId
    visit.push(node)
    if (node === target) return s
    const step = trilogyStep(s, CH3)
    assert(!step.tool && !step.choices?.length, `No unexplained activity before ${target}: ${node}`)
    const next = step.scan
      ? completeTrilogyScan(beginTrilogyScan(copy(s), CH3, node, 1000), CH3, node, 4000)
      : trilogyAdvance(s, CH3, node)
    assert.notEqual(trilogyProgress(next, 'ch3').stepId, node, `Continuation exists at ${node}`)
    s = next
  }
  assert.fail(`Short scene did not reach ${target}`)
}

assert.equal(Object.values(CH3.steps).filter(step => step.scan).length, 7)
assert.equal(CH3.steps.c3_s2_finish_2.next, 'c3_liver_arrive_0')
assert.equal(CH3.steps.c3_liver_arrive_4.next, 'c3_liver_scan')
assert.equal(CH3.steps.c3_liver_scan.next, 'c3_liver_observe')
assert.equal(CH3.steps.c3_liver_scan.scan.kind, 'ultrasound')
assert.equal(CH3.steps.c3_liver_scan.scan.durationMs, 3000)
assert(!CH3.steps.c3_liver_scan.image, 'The examination finishes before its image is shown')
assert.equal(CH3.steps.c3_liver_observe.caseId, 'c3_young_liver')
assert(TRILOGY_CASE_NAMES.c3_young_liver)
assert.equal(CH3.cards.c3_liver_compare.image, 'us_c3_hepatorenal_v1')
for (const id of ['pat_c3_young_liver_v1', 'us_c3_hepatorenal_v1']) assert(CH3.assets.includes(id), `${id}: preloaded`)
const liver = Object.entries(CH3.steps).filter(([id]) => id.startsWith('c3_liver_'))
for (const [id, step] of liver) {
  assert(![step.sprite, step.sprite2].some(sprite => /pat_gut|pat_us_gallstone/.test(sprite ?? '')), `${id}: no old abdominal-pain portrait`)
  if (step.speaker === 'fatty_patient' || id.startsWith('c3_liver_arrive'))
    assert(!/腹痛|疼痛|肚子疼|捂腹|捂着肚|痛苦|呻吟|担架/.test(step.text), `${id}: routine asymptomatic examination`)
  if (step.image) assert.equal(step.image, 'us_c3_hepatorenal_v1', `${id}: one consistent hepatorenal image`)
  // The newly approved correct image observation earns one point; ordinary
  // dialogue, wrong answers and help remain free of automatic stat changes.
  for (const [index, effect] of [step.effect, ...(step.choices ?? []).map(c => c.effect)].entries())
    for (const key of ['gold', 'skill', 'heart', 'wealth', 'ap'])
      assert.equal(effect?.[key] ?? 0, id === 'c3_liver_compare' && index === 0 && key === 'skill' ? 1 : 0,
        `${id}: only the correct image observation earns skill`)
}
assert.match(CH3.steps.c3_liver_arrive_3.text, /没什么感觉/)
assert.equal(CH3.characters.fatty_patient.sprite, 'pat_c3_young_liver_v1')
assert(!CH3.steps.c3_liver_observe.sprite && !CH3.steps.c3_liver_observe.sprite2, 'Image observation is unobscured')
assert(!/脂肪肝/.test(CH3.steps.c3_liver_observe.imageLabel), 'Image label does not reveal the answer')
assert.equal(CH3.steps.c3_liver_observe.choices.length, 3)

for (const target of ['c3_liver_compare', 'c3_liver_gain', 'c3_liver_help']) {
  const earnedSkill = target === 'c3_liver_compare' ? 1 : 0
  const start = fixture('c3_s2_finish_2'), path = []
  let s = walk(copy(start), 'c3_liver_observe', path)
  assert(path.includes('c3_liver_arrive_0') && path.includes('c3_liver_scan'))
  assert.deepEqual(numbers(s), numbers(start), 'Patient arrival and acquisition grant no stats')
  assert(!(s.cards ?? []).includes('c3_liver_compare'), 'No card reveals the observation answer')
  const choice = trilogyStep(s, CH3).choices.find(c => c.next === target)
  assert(choice, `${target}: reachable observation option`)
  s = trilogyChoose(copy(s), CH3, 'c3_liver_observe', choice)
  assert.equal(trilogyProgress(s, 'ch3').stepId, target)
  sameSave(trilogyChoose(copy(s), CH3, 'c3_liver_observe', choice), s, 'Stale second choice cannot replay')
  s = walk(s, 'c3_liver_explain_6', path)
  assert.deepEqual(numbers(s), { ...numbers(start), skill: start.skill + earnedSkill },
    'Correct observation earns one point; wrong/help responses have no penalty or automatic points')
  assert(s.flags.c3_liver_seen)
  assert.equal(s.cards.filter(id => id === 'c3_liver_compare').length, 1)
  const atCard = enterTrilogyNode(copy(s), CH3, 'c3_liver_explain_2')
  sameSave(enterTrilogyNode(copy(atCard), CH3, 'c3_liver_explain_2'), atCard, 'Card entry resumes without duplicate reward')
  s = walk(copy(s), 'c3_s2_finish_3', path)
  assert(path.includes('c3_tang_break_0'), 'A short colleague pause precedes the handover')
  assert.deepEqual(numbers(s), { ...numbers(start), gold: start.gold + 100, skill: start.skill + earnedSkill },
    'Only the original handover wage is added after the observation')
  sameSave(enterTrilogyNode(copy(s), CH3, 'c3_s2_finish_3'), s, 'Original handover wage still grants once')
  assert.deepEqual(s.dlc.ch2, start.dlc.ch2)
  assert.deepEqual(s.dlc.ldct, start.dlc.ldct)
}
const oldHandover = fixture('c3_s2_finish_3')
sameSave(initializeTrilogy(copy(oldHandover), CH3), oldHandover, 'Existing handover save is not rewound into the new patient')

for (const [before, prefix, last, after, shift] of [
  ['c3_s1_start_5', 'c3_tang_first', 4, 'c3_s1_hub', 0],
  ['c3_liver_explain_6', 'c3_tang_break', 3, 'c3_s2_finish_3', 1],
  ['c3_s5_notice_end_4', 'c3_tang_return', 3, 'c3_s5_notice_end_5', 4],
]) {
  assert.equal(CH3.steps[before].next, `${prefix}_0`)
  assert.equal(CH3.steps[`${prefix}_${last}`].next, after)
  const start = fixture(`${prefix}_0`, shift)
  const end = walk(copy(start), `${prefix}_${last}`)
  assert.deepEqual(numbers(end), numbers(start), `${prefix}: ordinary colleague conversation grants no points/AP`)
  for (let n = 0; n <= last; n++) {
    const node = `${prefix}_${n}`, step = trilogyStep(fixture(node, shift), CH3)
    if (node === 'c3_tang_first_4')
      assert(![step.sprite, step.sprite2].includes('char_tang'), 'The colleague has left at the end of the first meeting')
    else assert([step.sprite, step.sprite2].includes('char_tang'), `${node}: explicit colleague portrait on direct resume`)
    for (const key of ['gold', 'skill', 'heart', 'wealth', 'ap']) assert.equal(step.effect?.[key] ?? 0, 0)
  }
}
assert(CH3.steps.c3_s3_tang_0 && CH3.steps.c3_s3_tang_1 && CH3.steps.c3_s3_tang_2, 'Existing optional colleague scene is retained')
console.log('PASS CH3 asymptomatic liver case, three observation routes, scan/card/handover receipts and three colleague bridges')
