// Focused image-choice receipts and scene continuity; no browser/full playthrough.
// node --import tsx tests/ch3-picture-observations.mjs
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { CH3 } from '../src/game/ch3.ts'
import { freshState } from '../src/game/store.ts'
import { initializeTrilogy, patchTrilogy, enterTrilogyNode, trilogyProgress,
  trilogyStep, trilogyAdvance, trilogyChoose } from '../src/game/trilogy-session.ts'

const clone = value => JSON.parse(JSON.stringify(value))
const sameSave = (actual, expected, why) => assert.deepEqual(clone(actual), clone(expected), why)
const numbers = s => Object.fromEntries(['gold', 'skill', 'heart', 'wealth', 'ap'].map(key => [key, s[key]]))
function fixture(node, shift = 0) {
  const base = { ...freshState('f'), seed: 20261027, gold: 730, skill: 12, heart: 9, wealth: 4,
    night: 5, durability: 83, buyCount: 3, finished: true, lastCheckin: '2026-10-26',
    flags: { firstChapterKept: true }, items: ['milktea'],
    dlc: Object.fromEntries(['ch2', 'dr', 'dsa', 'ldct', 'ch4', 'ch5'].map(id =>
      [id, { done: true, marker: `preserve-${id}`, certificate: { code: `kept-${id}` } }])) }
  const initialized = initializeTrilogy(base, CH3, 'ch3-picture-observations')
  return enterTrilogyNode(patchTrilogy(initialized, 'ch3', { shift }), CH3, node)
}
function protectedProgress(s) {
  const { ch3: _current, ...otherChapters } = s.dlc
  return clone({ otherChapters, night: s.night, durability: s.durability, buyCount: s.buyCount,
    finished: s.finished, lastCheckin: s.lastCheckin, items: s.items,
    firstChapterFlag: s.flags.firstChapterKept })
}
const observations = [
  { id: 'c3_breast_observe', before: 'c3_s1_aunt_8', image: 'us_breast', shift: 0,
    right: 'c3_breast_right', wrong: 'c3_breast_retry', help: 'c3_breast_help', after: 'c3_s1_aunt_9',
    answer: /更亮|后方回声增强/ },
  { id: 'c3_s1_stone_4', before: 'c3_s1_stone_3', image: 'us_gallstone', shift: 0,
    right: 'c3_s1_shadow_good', wrong: 'c3_s1_shadow_miss', help: 'c3_s1_shadow_retry', after: 'c3_s1_shadow_0',
    answer: /正下方|后面.*暗影|黑带|拖着/ },
  { id: 'c3_liver_observe', image: 'us_c3_hepatorenal_v1', shift: 1,
    right: 'c3_liver_compare', wrong: 'c3_liver_gain', help: 'c3_liver_help', after: 'c3_liver_explain_0',
    answer: /右下|长椭圆|脂肪肝/ },
  { id: 'c3_s3_mirror_2', before: 'c3_s3_mirror_1', image: 'us_mirror', shift: 2,
    right: 'c3_s3_mirror_check', wrong: 'c3_s3_mirror_wait', help: 'c3_mirror_help', after: 'c3_s3_mirror_end_0',
    answer: /弧形|分叉|重复|多了一份|多出来|镜像伪影/ },
]

for (const row of observations) {
  const start = fixture(row.before ?? row.id, row.shift)
  const atQuestion = row.before ? trilogyAdvance(start, CH3, row.before) : start
  assert.equal(trilogyProgress(atQuestion, 'ch3').stepId, row.id, `${row.id}: question follows the acquired image`)
  assert.deepEqual(numbers(atQuestion), numbers(start), 'Merely showing an image/question grants no stats')
  assert.equal((atQuestion.cards ?? []).length, 0, `${row.id}: no explanatory card before answering`)
  const question = trilogyStep(atQuestion, CH3)
  assert.equal(question.image, row.image)
  assert(!question.sprite && !question.sprite2 && !question.scan && !question.tool,
    `${row.id}: ordinary choices over the existing image, without another acquisition or portrait`)
  assert.equal(question.choices.length, 3)
  assert(!row.answer.test(`${question.text} ${question.imageLabel}`), `${row.id}: narration/label does not answer the question`)
  if (row.before) assert(!row.answer.test(CH3.steps[row.before].text), `${row.before}: no answer leaked on image entry`)
  for (const choice of question.choices) {
    assert(!choice.effect && !choice.risk && !choice.cond, `${row.id}: all observation/help routes remain available`)
  }
  for (const target of [row.right, row.wrong, row.help]) {
    const choice = question.choices.find(c => c.next === target)
    assert(choice, `${target}: reachable through an ordinary dialogue option`)
    const expected = { ...numbers(atQuestion), skill: atQuestion.skill + (target === row.right ? 1 : 0) }
    const answered = trilogyChoose(clone(atQuestion), CH3, row.id, choice)
    assert.equal(trilogyProgress(answered, 'ch3').stepId, target)
    assert.deepEqual(numbers(answered), expected, `${target}: correct +1; wrong/help no penalty`)
    assert.equal(trilogyProgress(answered, 'ch3').applied.filter(id => id === target).length, 1)
    sameSave(trilogyChoose(clone(answered), CH3, row.id, choice), answered, 'A stale second click cannot reward twice')
    const reloaded = initializeTrilogy(clone(answered), CH3)
    sameSave(reloaded, answered, 'Restore does not restart the question or change other chapters')
    sameSave(enterTrilogyNode(clone(reloaded), CH3, target), answered, 'Entering the saved response does not grant again')
    const continued = trilogyAdvance(reloaded, CH3, target)
    assert.equal(trilogyProgress(continued, 'ch3').stepId, row.after, `${target}: rejoins the original conversation`)
    assert.deepEqual(numbers(continued), expected, 'Returning to mandatory dialogue adds no automatic point')
    assert.deepEqual(protectedProgress(continued), protectedProgress(start), 'Other chapters and first-chapter progress are preserved')
    // Even if an old view restores the question cursor, its already applied
    // response receipt prevents a second award in this run.
    const oldView = patchTrilogy(clone(continued), 'ch3', { stepId: row.id })
    assert.deepEqual(numbers(trilogyChoose(oldView, CH3, row.id, choice)), expected)
  }
}
assert.equal(CH3.steps.c3_s1_shadow_1.effect.skill, undefined,
  'Gallstone point is relocated to the correct observation, not duplicated in its explanation')
assert.equal(CH3.steps.c3_s1_shadow_1.effect.badge, 'c3_shadow_reader', 'Existing collection is preserved')

// Resuming an old already-visited answer must not retroactively award a point.
for (const node of ['c3_s1_shadow_good', 'c3_liver_compare', 'c3_s3_mirror_check']) {
  let old = fixture('c3_s1_hub')
  old = patchTrilogy(old, 'ch3', { stepId: node, applied: [...trilogyProgress(old, 'ch3').applied, node] })
  assert.deepEqual(numbers(enterTrilogyNode(clone(old), CH3, node)), numbers(old))
}

// The cousin neither stands nor speaks in Xu's waiting-room/examination span,
// including direct restoration into each formerly shared waiting node.
for (const node of Object.keys(CH3.steps).filter(id => /^c3_s3_(waiting_|xu_)/.test(id))) {
  const step = trilogyStep(fixture(node, 2), CH3)
  assert(![step.sprite, step.sprite2, step.phone].includes('pat_cousin'), `${node}: no cousin portrait`)
  assert.notEqual(step.speaker, 'cousin', `${node}: no leftover cousin dialogue`)
  assert(!/表姐/.test(step.text), `${node}: no unexplained family presence`)
}
assert.equal(CH3.steps.c3_s3_waiting_5.next, 'c3_s3_xu_0')

// Every shift's optional towel scene reveals the same actual training photo,
// rather than substituting another chapter's unrelated archive photograph.
const catalog = JSON.parse(readFileSync(new URL('../src/lib/image-assets.catalog.json', import.meta.url), 'utf8'))
for (let shift = 1; shift <= 5; shift++) for (let index = 1; index <= 4; index++) {
  const id = `c3_s${shift}_towel_use_${index}`
  const step = trilogyStep(fixture(id, shift - 1), CH3)
  assert.equal(step.image, 'item_c3_training_photo_v1', `${id}: photo remains with its conversation`)
  assert.equal(step.imageKind, 'object')
  assert(catalog[step.image], `${id}: registered photo asset`)
  assert(existsSync(new URL(`../public/assets/${catalog[step.image]}`, import.meta.url)), `${id}: photo file exists`)
}
console.log('PASS CH3 four image observations: correct/wrong/help, once-only rewards, no answer leakage, Xu cast and five photo scenes')
