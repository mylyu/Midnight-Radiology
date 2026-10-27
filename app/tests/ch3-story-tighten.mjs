// Approved CH3 story tightening: state paths and legacy receipts, not a browser playthrough.
// node --import tsx tests/ch3-story-tighten.mjs
import assert from 'node:assert/strict'
import { CH3 } from '../src/game/ch3.ts'
import { freshState, condOk } from '../src/game/store.ts'
import { initializeTrilogy, patchTrilogy, enterTrilogyNode, trilogyProgress, trilogyStep,
  trilogyAdvance, trilogyChoose, completeTrilogyTool, beginTrilogyScan, completeTrilogyScan,
  nextTrilogyShift, answerTrilogyQuiz, nextTrilogyQuiz, finishTrilogyQuiz, trilogyQuizContent,
  trilogyGive, trilogyBuy } from '../src/game/trilogy-session.ts'

const copy = value => JSON.parse(JSON.stringify(value))
const sameSave = (actual, expected, message) => assert.deepEqual(copy(actual), copy(expected), message)
const progress = s => trilogyProgress(s, 'ch3')
const numbers = s => Object.fromEntries(['gold', 'skill', 'heart', 'wealth', 'ap'].map(key => [key, s[key]]))
const otherProgress = { ch2: { done: true, marker: 'keep-ch2' }, dr: { marker: 'keep-dr' },
  dsa: { marker: 'keep-dsa' }, ldct: { done: true, marker: 'keep-ldct' } }
function fixture(node, shift = 0, flags = {}, extra = {}) {
  const s = initializeTrilogy({ ...freshState('f'), seed: 20261027, gold: 730, ap: 3,
    skill: 12, heart: 9, wealth: 4, cards: [], badges: [], items: [], flags,
    dlc: copy(otherProgress), ...extra }, CH3, 'ch3-story-tighten')
  // Patch instead of enter: this is also suitable for an old cursor with no new receipt.
  return patchTrilogy(s, 'ch3', { stepId: node, shift, phase: 'story' })
}
function available(s) {
  return (trilogyStep(s, CH3).choices ?? []).filter(c => !c.next.startsWith('@') && condOk(s, c.cond))
}
function chooseTarget(s, target) {
  let choice = available(s).find(row => row.next === target)
  if (!choice) {
    const room = available(s).find(row => CH3.steps[row.next]?.choices?.some(action => action.next === target))
    assert(room, `A current location leads to ${target}`)
    s = trilogyChoose(s, CH3, progress(s).stepId, room)
    choice = available(s).find(row => row.next === target)
  }
  assert(choice, `Available action leads to ${target}`)
  return trilogyChoose(s, CH3, progress(s).stepId, choice)
}
function once(s) {
  const node = progress(s).stepId, step = trilogyStep(s, CH3)
  if (step.tool) return completeTrilogyTool(s, CH3, node, true)
  if (step.scan) return completeTrilogyScan(beginTrilogyScan(s, CH3, node, 1000), CH3, node, 4000)
  if (step.choices?.length) {
    const options = available(s), choice = /hub$/.test(node) ? options.at(-1) : options[0]
    assert(choice, `${node}: a continuation exists`)
    return trilogyChoose(s, CH3, node, choice)
  }
  return trilogyAdvance(s, CH3, node)
}
function walk(s, target, visited = [], limit = 100) {
  for (let index = 0; index < limit; index++) {
    const node = progress(s).stepId
    visited.push(node)
    if (node === target) return s
    const next = once(copy(s))
    assert.notEqual(progress(next).stepId, node, `${node}: no dead end before ${target}`)
    s = next
  }
  assert.fail(`Did not reach ${target}`)
}
const retiredOptional = [
  [/^c3_s1_probes_\d+$/, 0], [/^c3_s2_roster_\d+$/, 1], [/^c3_s2_label_\d+$/, 1],
  [/^c3_s3_(?:cart|tang)_\d+$/, 2], [/^c3_s4_pack_\d+$/, 3],
  [/^c3_s4_cost_(?:\d+|right|limit|mix|end_\d+)$/, 3],
  [/^c3_s2_place_(?:office|reading)$/, 1], [/^c3_s3_place_(?:corridor|parking)$/, 2],
  [/^c3_s4_place_supplies$/, 3],
]
const retiredCase = /^c3_s3_(?:mirror(?:_\d+|_check|_wait|_end_\d+)|bedside_scan|leave_clinic_\d+)$|^c3_mirror_help$/
const retired = id => retiredCase.test(id) || retiredOptional.some(([pattern]) => pattern.test(id))

// Every currently reachable branch is free of retired errands/case nodes.
const reachable = new Set(), queue = CH3.shifts.map(shift => shift.start).concat(CH3.afterQuiz)
while (queue.length) {
  const id = queue.shift()
  if (reachable.has(id)) continue
  assert(CH3.steps[id], `Reachable target exists: ${id}`)
  assert(!retired(id), `Retired node is disconnected from new games: ${id}`)
  reachable.add(id)
  const step = CH3.steps[id]
  const targets = [step.next, step.tool?.next, ...(step.choices ?? []).flatMap(c => [c.next, c.risk?.next])]
  queue.push(...targets.filter(target => target && !target.startsWith('@')))
}
const currentText = [...reachable].map(id => CH3.steps[id].text).join('\n')
assert(!/床旁班|傍晚床旁|天天推车|响轮子|镜像伪影|最好的一张.*找|核账/.test(currentText))

// One inexpensive state traversal covers six cases, all settlements, five quiz answers and epilogue.
let session = fixture(CH3.shifts[0].start)
const scans = [], shifts = [], visited = []
for (let i = 0; i < 500 && progress(session).phase !== 'quiz'; i++) {
  const p = progress(session)
  if (p.phase === 'settle') {
    shifts.push(p.shift)
    const before = copy(session)
    assert.deepEqual(initializeTrilogy(copy(session), CH3), before, 'Settlement restore does not repeat salary')
    session = nextTrilogyShift(session, CH3)
    continue
  }
  assert.equal(p.phase, 'story')
  assert(!retired(p.stepId))
  visited.push(p.stepId)
  if (trilogyStep(session, CH3).scan) scans.push(p.stepId)
  session = once(session)
}
assert.deepEqual(scans, ['c3_s1_aunt_scan', 'c3_s1_stone_scan', 'c3_s2_cousin_scan', 'c3_liver_scan', 'c3_s3_wang_scan', 'c3_s3_xu_scan'])
assert.deepEqual(shifts, [0, 1, 2, 3, 4])
assert.equal(progress(session).phase, 'quiz')
assert.equal(CH3.quiz.length, 8)
assert.equal(progress(session).quiz.questions.length, 5)
for (let i = 0; i < 5; i++) {
  const q = progress(session).quiz, content = trilogyQuizContent(session, CH3)
  session = answerTrilogyQuiz(session, CH3, content[q.questions[q.index].question].answer)
  const answered = copy(session)
  assert.deepEqual(answerTrilogyQuiz(copy(session), CH3, 0), answered, 'An answered question cannot be resubmitted')
  session = nextTrilogyQuiz(session, CH3)
}
assert(progress(session).quiz.completed && progress(session).quiz.rewarded)
sameSave(nextTrilogyQuiz(copy(session), CH3), session, 'Quiz award is paid once')
session = finishTrilogyQuiz(session, CH3)
session = walk(session, 'c3_epilogue_20', visited)
session = trilogyAdvance(session, CH3, 'c3_epilogue_20')
assert.equal(progress(session).phase, 'done')
assert(session.flags.c3_cousin_mri_pending && !session.flags.c3_cousin_followup_stable)
for (const [id, value] of Object.entries(otherProgress)) assert.deepEqual(session.dlc[id], value)
assert(!session.badges.some(id => ['c3_cart_ready', 'c3_second_angle', 'c3_gel_account'].includes(id)))
assert(!session.cards.some(id => ['c3_mirror', 'c3_bedside'].includes(id)))
assert(session.cards.includes('c3_probe') && session.cards.includes('c3_gel'), 'Retained teaching grants both equipment cards')

// ALL stored removed cursors, including wrong/help routes, have harmless bridges.
const optionalIds = []
for (const [pattern, shift] of retiredOptional) {
  const ids = Object.keys(CH3.steps).filter(id => pattern.test(id))
  assert(ids.length, `Legacy group retained: ${pattern}`)
  for (const id of ids) {
    optionalIds.push(id)
    const old = fixture(id, shift, { keep_existing: true }, { items: ['c3_pocket_towel'],
      badges: ['c3_cart_ready', 'c3_second_angle', 'c3_gel_account'], cards: ['c3_mirror', 'c3_bedside'] })
    const entered = enterTrilogyNode(copy(old), CH3, id), step = trilogyStep(entered, CH3)
    assert(!step.scan && !step.tool && !step.effect && !step.card && !step.choices?.length, `${id}: plain bridge`)
    assert.equal(step.next, `c3_s${shift + 1}_hub`)
    const after = trilogyAdvance(entered, CH3, id)
    assert.equal(progress(after).stepId, `c3_s${shift + 1}_hub`)
    for (const key of ['gold', 'skill', 'heart', 'wealth', 'ap', 'items', 'badges', 'cards', 'flags']) assert.deepEqual(after[key], old[key], `${id}: preserve ${key}`)
    sameSave(completeTrilogyTool(copy(old), CH3, id), old, `${id}: stale task cannot pay`)
  }
}
const caseIds = Object.keys(CH3.steps).filter(id => retiredCase.test(id))
assert(caseIds.length >= 12, 'All old bedside/mirror and corridor cursors are covered')
for (const id of caseIds) for (const paidBy of ['unpaid', 'receipt', 'old-flag']) {
  const paid = paidBy !== 'unpaid'
  let old = fixture(id, 2, paid ? { c3_shift3_done: true } : {}, {
    badges: ['c3_second_angle'], cards: ['c3_mirror'] })
  if (paidBy === 'receipt') old = patchTrilogy(old, 'ch3', { applied: [...progress(old).applied, 'c3_s3_xu_9'] })
  const entered = enterTrilogyNode(copy(old), CH3, id), step = trilogyStep(entered, CH3)
  assert(!step.effect && !step.card && !step.scan && !step.tool && !step.choices?.length)
  assert.equal(step.next, 'c3_s3_xu_9')
  const atEnd = trilogyAdvance(entered, CH3, id), settled = trilogyAdvance(copy(atEnd), CH3, 'c3_s3_xu_9')
  assert.equal(progress(settled).phase, 'settle')
  assert.deepEqual(numbers(settled), { ...numbers(old), gold: old.gold + (paid ? 0 : 110) }, `${id}: original wage once only`)
  assert.deepEqual(settled.badges, old.badges)
  assert.deepEqual(settled.cards, old.cards)
  sameSave(enterTrilogyNode(copy(atEnd), CH3, 'c3_s3_xu_9'), atEnd, 'Wage receipt survives refresh')
  sameSave(completeTrilogyScan(copy(old), CH3, id, 4000), old, 'Stale removed scan cannot replay')
}

// Three callbacks are conditional on the actual earlier action, not just on reaching the last shift.
for (const [node, flag, remembered] of [
  ['c3_s3_bag_2', 'c3_s1_wait_done', /上回你替我夹单子/],
  ['c3_s5_mei_0', 'c3_towel_used', /你留的毛巾.*照片/],
  ['c3_s5_assess_7', 'c3_s4_lei_done', /你贴好的/],
]) {
  const without = trilogyStep(fixture(node), CH3), withMemory = trilogyStep(fixture(node, 4, { [flag]: true }), CH3)
  assert.notEqual(without.text, withMemory.text, `${node}: prior action has a concrete response`)
  assert(!remembered.test(without.text), `${node}: absent history is not fabricated`)
  assert.match(withMemory.text, remembered)
  assert.deepEqual(withMemory.effect, without.effect, `${node}: callback does not add another reward`)
}

// Borrow/meeting history determines whether the final Lei scene exists.
for (const borrowed of [false, true]) for (const met of [false, true]) {
  const flags = { ...(borrowed && { c3_s4_lei_done: true }), ...(met && { c3_han_met: true }) }
  let s = fixture('c3_s5_hub', 4, flags)
  const choice = available(s).find(row => row.next === 'c3_s5_lei_0')
  assert.equal(!!choice, borrowed || met)
  if (!choice) continue
  s = trilogyChoose(s, CH3, 'c3_s5_hub', choice)
  const path = [], end = walk(s, 'c3_s5_hub', path)
  const spoken = path.filter(id => id !== 'c3_s5_hub').map(id => trilogyStep(fixture(id, 4, flags), CH3).text).join('\n')
  assert.equal(/标签机拿回来了/.test(spoken), borrowed, 'No invented loan')
  assert.equal(/核对联|韩经理/.test(spoken), met, 'No invented manufacturer meeting')
  assert.equal(end.ap, s.ap)
  assert(end.flags.c3_s5_lei_done)
  assert(!available(end).some(row => row.next === 'c3_s5_lei_0'), 'Completed visit hides')
}

// Inventory events and in-person gifts retain consumption and one-time rewards.
for (const [item, prefix, flag, badge] of [
  ['c3_pocket_towel', 'c3_s1_towel_use', 'c3_towel_used', 'c3_training_photo'],
  ['c3_cup_stickers', 'c3_s1_stickers_use', 'c3_stickers_used', 'c3_cup_detective'],
]) {
  let s = fixture('c3_s1_hub')
  s = trilogyBuy(s, CH3, item)
  assert(s.items.includes(item))
  s = chooseTarget(s, `${prefix}_0`)
  s = walk(s, 'c3_s1_hub')
  assert(s.flags[flag] && s.badges.includes(badge) && !s.items.includes(item))
  assert(!available(s).some(row => row.next === `${prefix}_0`))
}
const giftPeople = new Set()
for (const id of reachable) {
  const step = CH3.steps[id]
  if (!step.giftTo || giftPeople.has(step.giftTo)) continue
  giftPeople.add(step.giftTo)
  for (const item of ['milktea', 'snack']) {
    const s = fixture(id, 0, {}, { items: [item] }), after = trilogyGive(copy(s), CH3, id, item)
    assert(!after.items.includes(item), `${step.giftTo}: consume ${item}`)
    assert.equal(after.heart, s.heart + (item === 'snack' ? 1 : 0))
    assert.equal(progress(after).giftReply.node, id)
    sameSave(trilogyGive(copy(after), CH3, id, item), after)
  }
}
for (const person of ['mei', 'lei', 'zhou', 'he', 'tang']) assert(giftPeople.has(person), `${person}: retained gift entrance`)

const legacyBadges = Object.keys(CH3.legacyBadges ?? {}), legacyCards = Object.keys(CH3.legacyCards ?? {})
assert.deepEqual(legacyBadges.sort(), ['c3_cart_ready', 'c3_gel_account', 'c3_second_angle'])
assert.deepEqual(legacyCards.sort(), ['c3_bedside', 'c3_mirror'])
for (const id of legacyBadges) assert(!CH3.badges[id])
for (const id of legacyCards) assert(!CH3.cards[id])
assert.equal(Object.keys(CH3.badges).length, 11)
console.log(`PASS CH3 tightened graph: six cases/five settlements/quiz/ending; ${optionalIds.length} optional + ${caseIds.length} case legacy cursors; history, four Lei variants, gifts/items`)
