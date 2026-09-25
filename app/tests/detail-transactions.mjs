import assert from 'node:assert/strict'
import { NIGHTS, SHOP_ITEMS } from '../src/game/data.ts'
import { CH2_SHIFTS, ch2StepForState } from '../src/game/ch2.ts'
import { CH2_SCANS } from '../src/game/ch2-scans.ts'
import { CH2_OBSERVATIONS } from '../src/game/ch2-observations.ts'
import { applyEffect, freshState } from '../src/game/store.ts'
import { recordCh2Change } from '../src/game/ch2-ledger.ts'
import { readCh1Book, maintainCh1, buyCh1Item, commitCh1Choice, commitCh2Choice,
  commitCh1Advance, commitCh2Advance } from '../src/game/interaction-transactions.ts'

// Pure-state fixtures, not an assertion of a fresh full-chapter playthrough.
const copy = s => JSON.parse(JSON.stringify(s))
const one = (night = 1, stepId = `n${night}_hub`) => ({ ...freshState('m'), seed: 1234, gold: 1000,
  skill: 9, heart: 9, wealth: 3, ap: 4, night, screenHint: 'night', stepId, resumeKey: `${night}-${stepId}` })
const two = (shift = 'c2n1', stepId = 'c2n1_m2') => ({ ...one(5), finished: true, screenHint: 'chapterEnd',
  flags: { quiz_grade: 'S' }, dlc: { dr: { done: true }, dsa: { dose: 23 },
    ch2: { shift, stepId, phase: 'story', appliedSteps: [] } } })
const source1 = s => ({ expectedNight: s.night, expectedStep: s.stepId })
const source2 = s => ({ expectedShift: s.dlc.ch2.shift, expectedStep: s.dlc.ch2.stepId })
const raw2 = (shift, id) => CH2_SHIFTS.find(row => row.id === shift).steps[id]
const step2 = s => ch2StepForState(s.dlc.ch2.stepId, raw2(s.dlc.ch2.shift, s.dlc.ch2.stepId), s)
const values = s => ({ gold: s.gold, skill: s.skill, heart: s.heart, wealth: s.wealth, ap: s.ap,
  durability: s.durability, flags: s.flags, items: s.items, badges: s.badges })
let count = 0
function test(name, run) { run(); count++; console.log(`PASS ${count} ${name}`) }

test('book awards uncapped +1 once, including refresh and high skill', () => {
  const s = one(), before = copy(s), next = readCh1Book(s, 1)
  assert.equal(next.skill, 10)
  assert.equal(next.flags.book_read_n1, true)
  assert.equal(readCh1Book(next, 1), next)
  const restored = copy(next)
  assert.equal(readCh1Book(restored, 1), restored)
  assert.deepEqual(s, before)
})
test('book respects old receipt; no historical capped-skill reimbursement', () => {
  const s = { ...one(), skill: 2, flags: { book_read_n1: true } }
  assert.equal(readCh1Book(s, 1), s)
  assert.equal(readCh1Book(s, 2), s)
  assert.equal(readCh1Book({ ...s, finished: true }, 1).skill, 2)
  const nextNight = { ...s, night: 2, screenHint: 'day' }
  assert.equal(readCh1Book(nextNight, 2).skill, 3)
})
test('maintenance refuses full durability and insufficient money without any mutation', () => {
  for (const s of [{ ...one(), screenHint: 'day', durability: 100 }, { ...one(), screenHint: 'day', gold: 49 }]) {
    const result = maintainCh1(s)
    assert.equal(result.accepted, false)
    assert.equal(result.state, s)
  }
})
test('maintenance charges 50 per actual repair; clipped repair is accurately reported', () => {
  const s = { ...one(), screenHint: 'day', durability: 90 }
  const result = maintainCh1(s)
  assert.equal(result.state.durability, 100)
  assert.equal(result.state.gold, s.gold - 50)
  assert.equal(result.state.wealth, s.wealth + 1)
  assert.match(result.message, /耐久\+10/)
  assert.equal(maintainCh1(result.state).state, result.state)
  let repeated = { ...s, durability: 40 }
  for (let i = 0; i < 3; i++) repeated = maintainCh1(repeated).state
  assert.equal(repeated.durability, 100)
  assert.equal(repeated.gold, s.gold - 150)
  assert.equal(repeated.wealth, s.wealth + 3)
})
test('maintenance and book reject stale night/phase', () => {
  const s = one()
  assert.equal(maintainCh1(s).state, s)
  const day = { ...s, screenHint: 'day' }
  assert.equal(maintainCh1(day, 2).state, day)
  const quiz = { ...s, screenHint: 'quiz' }
  assert.equal(readCh1Book(quiz), quiz)
})

for (const id of ['snack', 'toolbox', 'dosimeter', 'key']) test(`inventory ${id}: no duplicate charge; real consumption allows repurchase`, () => {
  const s = one(2, 'n2_hub'), first = buyCh1Item(s, id)
  assert.equal(first.accepted, true)
  assert.equal(first.state.buyCount, 1)
  assert.deepEqual(first.state.items, [id])
  assert.equal(buyCh1Item(first.state, id).state, first.state)
  const restored = copy(first.state)
  assert.equal(buyCh1Item(restored, id).state, restored)
  const consumed = applyEffect(restored, { loseItem: id })
  assert.equal(buyCh1Item(consumed, id).state.buyCount, 2)
})
for (const [id, stat, amount] of [['coffee', 'ap', 1], ['milktea', 'heart', 2], ['book', 'skill', 2]]) {
  test(`${id}: original immediate benefit remains repeatable and is not an inventory item`, () => {
    const s = one(), a = buyCh1Item(s, id).state, b = buyCh1Item(a, id).state
    const price = SHOP_ITEMS.find(row => row.id === id).price
    assert.equal(b[stat], s[stat] + amount * 2)
    assert.equal(b.gold, s.gold - price * 2)
    assert.equal(b.buyCount, 2)
    assert.deepEqual(b.items, [])
  })
}
test('shop rechecks current funds, availability and phase; failed purchases do not count', () => {
  for (const [s, id] of [[one(), 'key'], [{ ...one(), gold: 0 }, 'coffee'], [one(), 'missing'],
    [{ ...one(), finished: true }, 'coffee'], [{ ...one(), screenHint: 'quiz' }, 'coffee']]) {
    const result = buyCh1Item(s, id, .5)
    assert.equal(result.state, s)
    assert.equal(result.accepted, false)
  }
  const s = { ...one(), buyCount: 2 }
  const result = buyCh1Item(s, 'coffee').state
  assert.equal(result.badges.filter(id => id === 'shopaholic').length, 1)
  assert.equal(buyCh1Item(result, 'coffee').state.badges.filter(id => id === 'shopaholic').length, 1)
})
for (const [roll, prize] of [[0, 0], [.419999, 0], [.42, 20], [.699999, 20], [.70, 50], [.879999, 50], [.88, 120], [.959999, 120], [.96, 250], [.999999, 250]]) {
  test(`lottery exact boundary ${roll} pays ${prize}`, () => {
    const s = one(), result = buyCh1Item(s, 'lottery', roll)
    assert.equal(result.accepted, true)
    assert.equal(result.state.gold, s.gold - 50 + prize)
    assert.equal(result.state.lotteryCount, 1)
    assert.equal(result.state.lotteryNight, 1)
  })
}
test('lottery fifth ticket persists across refresh; next night gets its own five', () => {
  let s = one()
  for (let i = 0; i < 5; i++) s = buyCh1Item(s, 'lottery', .7).state
  s = copy(s)
  assert.equal(buyCh1Item(s, 'lottery', .99).state, s)
  assert.equal(buyCh1Item({ ...s, night: 2 }, 'lottery', .7).state.lotteryCount, 1)
  for (const roll of [undefined, NaN, Infinity, -1, 1]) assert.equal(buyCh1Item(one(), 'lottery', roll).accepted, false)
})

const firstRisks = NIGHTS.flatMap(night => Object.entries(night.steps).flatMap(([id, step]) =>
  (step.choices ?? []).filter(choice => choice.risk).map(choice => ({ night: night.id, id, choice }))))
assert.equal(firstRisks.length, 7)
for (const { night, id, choice } of firstRisks) test(`Ch1 ${id}: both probability boundaries atomically persist effects and target`, () => {
  for (const [roll, hit] of [[choice.risk.chance - .000001, true], [choice.risk.chance, false]]) {
    const s = one(night, id), before = copy(s), input = { ...source1(s), choice, randomValue: roll }
    const result = commitCh1Choice(s, input)
    assert.equal(result.accepted, true)
    assert.equal(result.riskTriggered, hit)
    assert.equal(result.state.stepId, hit ? choice.risk.next : choice.next)
    assert.equal(result.state.resumeKey, s.resumeKey, 'target node effects must remain unapplied')
    assert.deepEqual(values(result.state), values(applyEffect(applyEffect(s, choice.effect), hit ? choice.risk.effect : undefined)))
    const restored = copy(result.state)
    assert.equal(commitCh1Choice(restored, input).state, restored)
    assert.equal(commitCh1Choice(result.state, input).state, result.state)
    assert.deepEqual(s, before)
  }
})
test('Ch1 latest conditions and authoritative effects, not stale/forged UI payload', () => {
  const s = one(), choice = NIGHTS[0].steps.n1_hub.choices.find(c => c.next === 'n1_walk0')
  const input = { ...source1(s), choice: { ...choice, effect: { gold: 99999 } } }
  const result = commitCh1Choice(s, input)
  assert.equal(result.state.gold, s.gold)
  assert.equal(result.state.ap, s.ap - 1)
  assert.equal(result.state.flags.n1_walk, true)
  for (const invalid of [{ ...s, ap: 0 }, { ...s, flags: { n1_walk: true } }, { ...s, night: 2 },
    { ...s, screenHint: 'day' }, { ...s, finished: true }]) assert.equal(commitCh1Choice(invalid, input).state, invalid)
})
test('Ch1 legal room return permits a different visit, not a second charge for a completed visit', () => {
  let s = one(), step = NIGHTS[0].steps.n1_hub
  const walk = step.choices.find(c => c.next === 'n1_walk0'), rest = step.choices.find(c => c.next === 'n1_rest0')
  s = commitCh1Choice(s, { ...source1(s), choice: walk }).state
  for (let i = 0; i < 3; i++) s = commitCh1Advance(s, source1(s)).state
  assert.equal(s.stepId, 'n1_walk3')
  s = commitCh1Choice(s, { ...source1(s), choice: NIGHTS[0].steps.n1_walk3.choices[0] }).state
  while (s.stepId !== 'n1_hub') {
    const next = commitCh1Advance(s, source1(s))
    assert.equal(next.accepted, true)
    s = next.state
  }
  assert.equal(commitCh1Choice(s, { ...source1(s), choice: walk }).state, s)
  const result = commitCh1Choice(s, { ...source1(s), choice: rest })
  assert.equal(result.accepted, true)
  assert.equal(result.state.ap, 2)
})
test('Ch1 modal actions never write @tokens or effects; ordinary next is once per source cursor', () => {
  const s = one()
  for (const choice of NIGHTS[0].steps.n1_hub.choices.filter(c => c.next.startsWith('@'))) {
    const result = commitCh1Choice(s, { ...source1(s), choice })
    assert.equal(result.accepted, true)
    assert.equal(result.state, s)
    assert.equal(result.nextStep, undefined)
    assert.ok(['book', 'shop'].includes(result.action))
  }
  const line = one(1, 'n1_walk0'), next = commitCh1Advance(line, source1(line))
  assert.equal(next.state.stepId, 'n1_walk1')
  assert.equal(next.state.resumeKey, line.resumeKey)
  assert.equal(commitCh1Advance(next.state, source1(line)).state, next.state)
})
test('Ch1 ordinary advance blocks choice/end/readout; readout completion and epilogue remain supported', () => {
  for (const id of ['n1_hub', 'n1_end', 'n1_s13r']) {
    const s = one(1, id)
    assert.equal(commitCh1Advance(s, source1(s)).accepted, false)
  }
  const readout = one(1, 'n1_s13r')
  assert.equal(commitCh1Advance(readout, { ...source1(readout), readoutComplete: true }).state.stepId, 'n1_s15')
  const epi = { ...one(5, 'n5_epi0'), finished: true }
  assert.equal(commitCh1Advance(epi, source1(epi)).state.stepId, 'n5_epi1')
})

const secondRisks = CH2_SHIFTS.flatMap(shift => Object.entries(shift.steps).flatMap(([id, step]) =>
  (step.choices ?? []).filter(choice => choice.risk).map(choice => ({ shift: shift.id, id, choice }))))
assert.equal(secondRisks.length, 3)
for (const { shift, id, choice } of secondRisks) test(`Ch2 ${id}: both risk boundaries persist target and effect receipt together`, () => {
  for (const [roll, hit] of [[choice.risk.chance - .000001, true], [choice.risk.chance, false]]) {
    const s = two(shift, id), before = copy(s), input = { ...source2(s), choice, randomValue: roll }
    const result = commitCh2Choice(s, input)
    assert.equal(result.accepted, true)
    assert.equal(result.riskTriggered, hit)
    assert.equal(result.state.dlc.ch2.stepId, hit ? choice.risk.next : choice.next)
    assert.deepEqual(values(result.state), values(applyEffect(applyEffect(s, choice.effect), hit ? choice.risk.effect : undefined)))
    if (choice.effect || hit && choice.risk.effect) assert.equal(result.state.dlc.ch2.loop.entries.filter(e => e.id === `choice:${id}`).length, 1)
    const restored = copy(result.state)
    assert.equal(commitCh2Choice(restored, input).state, restored)
    assert.deepEqual(s, before)
    assert.deepEqual(result.state.dlc.dr, s.dlc.dr)
    assert.deepEqual(result.state.dlc.dsa, s.dlc.dsa)
    assert.equal(result.state.stepId, s.stepId)
    assert.equal(result.state.resumeKey, s.resumeKey)
  }
})
test('Ch2 stale source/shift/phase/done choice rejection and authoritative definition', () => {
  const s = two(), choice = step2(s).choices[0], input = { ...source2(s), choice: { ...choice, effect: { gold: 999 } } }
  const result = commitCh2Choice(s, input)
  assert.equal(result.state.gold, s.gold)
  assert.equal(result.state.skill, s.skill + 1)
  assert.equal(commitCh2Choice(result.state, input).state, result.state)
  for (const patch of [{ shift: 'c2d2' }, { stepId: 'c2n1_m3a' }, { phase: 'settle' }, { done: true }]) {
    const invalid = { ...s, dlc: { ...s.dlc, ch2: { ...s.dlc.ch2, ...patch } } }
    assert.equal(commitCh2Choice(invalid, input).state, invalid)
  }
})
test('Ch2 old partial choice receipt retains compatibility without issuing any second reward', () => {
  const s = two(), choice = step2(s).choices[0]
  const partial = recordCh2Change(s, applyEffect(s, choice.effect), 'choice:c2n1_m2', choice.text, 'choice')
  const result = commitCh2Choice(partial, { ...source2(partial), choice })
  assert.equal(result.accepted, true)
  assert.equal(result.state.skill, partial.skill)
  assert.equal(result.state.dlc.ch2.stepId, choice.next)
  assert.equal(result.state.dlc.ch2.loop.entries.length, 1)
})
test('Ch2 pending stat reply blocks ordinary choice and advance until its own acknowledgement', () => {
  const s = two(), choice = step2(s).choices[0]
  s.dlc.ch2.statInteractions = { pending: { stepId: 'c2n1_m2', token: 'fixture-pending' } }
  assert.equal(commitCh2Choice(s, { ...source2(s), choice }).state, s)
  const line = two('c2n3', 'c2n3_chat0')
  line.dlc.ch2.statInteractions = { pending: { stepId: 'c2n3_chat0', token: 'fixture-coffee' } }
  assert.equal(commitCh2Advance(line, source2(line)).state, line)
})
test('Ch2 looping social room can take distinct choices; modal tokens are never cursors', () => {
  let s = two('c2n3', 'c2n3_chat_q')
  const first = step2(s).choices.find(c => c.next === 'c2n3_chat_sign1')
  s = commitCh2Choice(s, { ...source2(s), choice: first }).state
  for (let i = 0; i < 2; i++) s = commitCh2Advance(s, source2(s)).state
  assert.equal(s.dlc.ch2.stepId, 'c2n3_chat_q')
  const second = step2(s).choices.find(c => c.next === 'c2n3_chat_joke')
  assert.equal(commitCh2Choice(s, { ...source2(s), choice: second }).state.dlc.ch2.stepId, second.next)
  s = two('c2n1', 'c2n1_hub')
  for (const choice of step2(s).choices.filter(c => c.next.startsWith('@'))) {
    const result = commitCh2Choice(s, { ...source2(s), choice })
    assert.equal(result.state, s)
    assert.equal(result.accepted, true)
    assert.equal(result.nextStep, undefined)
    assert.ok(['shop', 'book2'].includes(result.action))
  }
})
test('Ch2 ordinary next cannot bypass check-in, scan, observation, window, checklist or settlement', () => {
  for (const [shift, id] of [['c2n1', 'c2n1_1'], ['c2n1', 'c2n1_m7'], ['c2n1', 'c2n1_w1ok'],
    ['c2n1', 'c2n1_m11'], ['c2n1', 'c2n1_end']]) {
    const s = two(shift, id)
    assert.equal(commitCh2Advance(s, source2(s)).accepted, false, id)
  }
  for (const shift of CH2_SHIFTS) for (const [id, step] of Object.entries(shift.steps)) if (step.checklist) {
    const s = two(shift.id, id)
    assert.equal(commitCh2Advance(s, source2(s)).accepted, false, id)
  }
  const s = two('c2n1', 'c2n1_m7')
  assert.ok(CH2_SCANS.c2n1_m7)
  const scanned = { ...s, dlc: { ...s.dlc, ch2: { ...s.dlc.ch2, scanSessions: { c2n1_m7: { startedAt: 1000, completed: true } } } } }
  const result = commitCh2Advance(scanned, source2(scanned))
  assert.equal(result.accepted, true)
  assert.equal(commitCh2Advance(result.state, source2(scanned)).state, result.state)
  const observed = two('c2n1', 'c2n1_w1ok'), id = CH2_OBSERVATIONS.c2n1_w1ok.id
  observed.dlc.ch2.observations = { [id]: { choiceId: 'right-band', acknowledged: false } }
  assert.equal(commitCh2Advance(observed, source2(observed)).accepted, false)
  observed.dlc.ch2.observations[id].acknowledged = true
  assert.equal(commitCh2Advance(observed, source2(observed)).accepted, true)
})
test('random is never sampled in any pure transaction, including repeated updater evaluation', () => {
  const shop = one(), first = one(1, 'n1_walk3'), choice1 = NIGHTS[0].steps.n1_walk3.choices.find(c => c.risk)
  const second = two('c2n1', 'c2n1_c3'), choice2 = step2(second).choices.find(c => c.risk)
  const random = Math.random
  Math.random = () => { throw new Error('transaction sampled randomness') }
  try {
    assert.deepEqual(buyCh1Item(shop, 'lottery', .9), buyCh1Item(shop, 'lottery', .9))
    assert.deepEqual(commitCh1Choice(first, { ...source1(first), choice: choice1, randomValue: .1 }),
      commitCh1Choice(first, { ...source1(first), choice: choice1, randomValue: .1 }))
    assert.deepEqual(commitCh2Choice(second, { ...source2(second), choice: choice2, randomValue: .1 }),
      commitCh2Choice(second, { ...source2(second), choice: choice2, randomValue: .1 }))
  } finally { Math.random = random }
})

console.log(`PASS detail-transactions: ${count} pure-state groups; no files or player saves written.`)
