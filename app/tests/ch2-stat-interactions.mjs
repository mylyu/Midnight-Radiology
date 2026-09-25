import assert from 'node:assert/strict'
import { freshState, applyEffect } from '../src/game/store.ts'
import { CH2_SHIFTS, ch2StepForState } from '../src/game/ch2.ts'
import { CH2_OBSERVATIONS } from '../src/game/ch2-observations.ts'
import { answerCh2Observation } from '../src/game/ch2-playback.ts'
import { beginCh2Shift, recordCh2Change } from '../src/game/ch2-ledger.ts'
import { restartCh2 } from '../src/game/ch2-exploration.ts'
import {
  ch2StatChoices, ch2StatReply, clearCh2StatReply, takeCh2StatInteraction,
  ch2StatStep, grantCh2WealthOnEntry,
} from '../src/game/ch2-stat-interactions.ts'

const clone = s => JSON.parse(JSON.stringify(s))
const base = (id = 'c2n1_w1ok') => ({ ...freshState('f'), seed: 260925, ap: 2, skill: 8, heart: 8, wealth: 3,
  gold: 410, finished: true, night: 5, stepId: 'n5_end', screenHint: 'chapterEnd', resumeKey: '5-n5_end',
  badges: ['fixer'], items: ['toolbox', 'key', 'snack'], buyCount: 12, lotteryNight: 5, lotteryCount: 4,
  flags: { quiz_grade: 'S', pacs_log: true },
  dlc: { dr: { done: true, stepId: 'done', served: ['test'] }, dsa: { dose: 18, pedalOk: 2 },
    ch2: { phase: 'story', shift: id.split('_')[0], stepId: id, appliedSteps: [], pendingCoffee: true } },
})
const move = (s, id) => ({ ...s, dlc: { ...s.dlc, ch2: { ...s.dlc.ch2, stepId: id, shift: id.split('_')[0] } } })
const rawStep = id => CH2_SHIFTS.find(shift => shift.id === id.split('_')[0]).steps[id]
const originalElsewhere = s => {
  const { dlc, wealth, ap, skill, ...rest } = s
  return { ...rest, dr: dlc.dr, dsa: dlc.dsa }
}
const unchangedInput = (s, fn) => {
  const saved = clone(s), result = fn(s)
  assert.deepEqual(s, saved, 'Pure helpers never mutate the input save')
  assert.deepEqual(originalElsewhere(result), originalElsewhere(s), 'No Chapter 1/DR/DSA/items/flags/other stats are changed')
  return result
}

// Exactly three optional method reminders, before an answer, on both sides of
// the threshold. A tip does not leak a screen quadrant, region, disease or answer.
for (const [id, key] of [['c2n1_w1ok', 'fall'], ['c2d2_w1ok', 'lung'], ['c2d4_12a', 'metal']]) {
  let s = base(id), config = CH2_OBSERVATIONS[id], token = `@ch2stat:hint:${key}`
  assert.deepEqual(ch2StatChoices({ ...s, skill: 7 }, id), [])
  assert.equal(ch2StatChoices(s, id)[0].next, token)
  const tip = unchangedInput(s, state => takeCh2StatInteraction(state, id, token))
  assert.deepEqual(tip.dlc.ch2.statInteractions.seenHints, [key])
  assert.deepEqual(tip.dlc.ch2.statInteractions.pending, { stepId: id, token })
  assert.equal(tip.dlc.ch2.observations, undefined, 'Reading a method does not answer an observation')
  assert.equal(tip.dlc.ch2.observationRewardShifts, undefined)
  assert.equal(tip.skill, s.skill); assert.equal(tip.ap, s.ap); assert.equal(tip.wealth, s.wealth)
  assert.equal(tip.dlc.ch2.loop, undefined, 'No reward/choice ledger is invented for a thought')
  const reply = ch2StatReply(clone(tip), id)
  assert.equal(reply.next, '@ch2stat-return')
  assert(!/屏幕[左右]|左上|左下|右上|右下|血肿|结节|金属|牙齿/.test(reply.text), 'Only methods, no target/diagnostic answer')
  assert.equal(reply.effect, undefined); assert.equal(reply.choices, undefined)
  assert.equal(takeCh2StatInteraction(tip, id, token), tip, 'Pending double-click does not repeat')
  s = clearCh2StatReply(clone(tip), id)
  assert.equal(ch2StatReply(s, id), undefined)
  assert.equal(s.dlc.ch2.statInteractions.pending, undefined)
  assert.deepEqual(ch2StatChoices(s, id), [], 'Hint already seen remains seen after reload/close')
  assert.equal(takeCh2StatInteraction(s, id, token), s)
  const correct = config.choices.find(choice => choice.correct).id
  const answered = answerCh2Observation(s, id, correct)
  assert.equal(answered.dlc.ch2.observations[config.id].choiceId, correct)
  assert.equal(answered.skill, s.skill + 1, 'Method reminder does not auto-answer or invalidate a later independent answer')
  assert.equal(answerCh2Observation(answered, id, correct), answered)
  const oldAnswered = base(id)
  oldAnswered.dlc.ch2.observations = { [config.id]: { choiceId: 'ask' } }
  assert.deepEqual(ch2StatChoices(oldAnswered, id), [], 'Already-answered old saves never reopen a tip')
  assert.deepEqual(ch2StatStep(id, rawStep(id), base(id)), rawStep(id), 'App owns observation overlay; no base-step answer rewrite')
}
assert.deepEqual(ch2StatChoices(base('c2n1_p3'), 'c2n1_p3'), [], 'No extra hint added to other cases')

// Coffee is accepted in the existing quiet conversation, once in this run.
let coffee = base('c2n3_chat_q')
const originalChat = rawStep('c2n3_chat_q')
assert.deepEqual(ch2StatChoices({ ...coffee, heart: 7 }, 'c2n3_chat_q'), [])
const chat = ch2StepForState('c2n3_chat_q', originalChat, coffee)
assert.deepEqual(chat.choices.slice(1), originalChat.choices, 'Original safe/chat branches remain intact')
assert.equal(chat.text, originalChat.text)
assert.equal(chat.choices[0].next, '@ch2stat:coffee')
coffee = unchangedInput(coffee, s => takeCh2StatInteraction(s, 'c2n3_chat_q', '@ch2stat:coffee'))
assert.equal(coffee.ap, 3)
assert.equal(coffee.dlc.ch2.pendingCoffee, true, 'Accepted colleague coffee does not consume a purchased supply')
assert.equal(coffee.dlc.ch2.statInteractions.colleagueCoffee, true)
assert.equal(coffee.dlc.ch2.loop.entries.find(row => row.id === 'stat:coffee').delta.ap, 1)
assert.equal(ch2StatReply(clone(coffee), 'c2n3_chat_q').speaker, 'lei')
coffee = clearCh2StatReply(clone(coffee), 'c2n3_chat_q')
assert.equal(takeCh2StatInteraction(coffee, 'c2n3_chat_q', '@ch2stat:coffee'), coffee)
assert.deepEqual(ch2StatStep('c2n3_chat_q', originalChat, coffee), originalChat)
assert.deepEqual(ch2StatChoices({ ...base('c2n3_chat_q'), flags: { c2n3_chat_done: true } }, 'c2n3_chat_q'), [])
const receiptOnlyCoffee = clone(coffee); delete receiptOnlyCoffee.dlc.ch2.statInteractions
assert.deepEqual(ch2StatChoices(receiptOnlyCoffee, 'c2n3_chat_q'), [], 'Existing receipt alone prevents a second reward')

// Organizing disconnected spare supplies refunds a genuinely paid visit, never
// bypasses tools/keys or changes any network/security flag.
const paidVisit = () => {
  let s = beginCh2Shift(base('c2n1_e1'), 'c2n1')
  s = recordCh2Change(s, applyEffect(s, { ap: -1 }), 'ch2-c2n1_e1', '设备间 · 实际消耗一点行动力')
  return move(s, 'c2n1_e2')
}
const equipmentStep = rawStep('c2n1_e2')
assert.deepEqual(ch2StatChoices(base('c2n1_e2'), 'c2n1_e2'), [], 'Unknown historical AP cost is not inferred')
let supplies = paidVisit()
assert.equal(supplies.ap, 1)
assert.deepEqual(ch2StatChoices({ ...supplies, wealth: 2 }, 'c2n1_e2'), [])
const equipment = ch2StepForState('c2n1_e2', equipmentStep, supplies)
assert.equal(equipment.text, equipmentStep.text)
assert.deepEqual(equipment.effect, equipmentStep.effect)
assert.equal(equipment.choices[0].next, '@ch2stat:supplies')
assert.equal(equipment.choices[1].next, equipmentStep.next, 'Declining continues on the original route')
supplies = unchangedInput(supplies, s => takeCh2StatInteraction(s, 'c2n1_e2', '@ch2stat:supplies'))
assert.equal(supplies.ap, 2)
assert.equal(supplies.dlc.ch2.statInteractions.supplyOrganized, true)
assert.match(ch2StatReply(supplies, 'c2n1_e2').text, /没接入设备的备用线材/)
assert.equal(supplies.dlc.ch2.loop.entries.find(row => row.id === 'stat:supplies').delta.ap, 1)
supplies = clearCh2StatReply(clone(supplies), 'c2n1_e2')
assert.equal(takeCh2StatInteraction(supplies, 'c2n1_e2', '@ch2stat:supplies'), supplies)
for (const patchDebit of [row => { row.delta.ap = 0 }, row => { row.shift = 'c2n3' }, row => { row.id = 'other' }]) {
  const bad = paidVisit(); patchDebit(bad.dlc.ch2.loop.entries[0])
  assert.deepEqual(ch2StatChoices(bad, 'c2n1_e2'), [])
}
const finishedVisit = paidVisit(); finishedVisit.flags.c2n1_e = true
assert.deepEqual(ch2StatChoices(finishedVisit, 'c2n1_e2'), [])
const emptyAP = { ...paidVisit(), ap: 0 }
assert.equal(takeCh2StatInteraction(emptyAP, 'c2n1_e2', '@ch2stat:supplies').ap, 1, 'Zero AP does not erase a real paid visit')

// Every callable transaction rejects stale pages, changed phase and completion.
for (const [id, token] of [['c2n1_w1ok', '@ch2stat:hint:fall'], ['c2n3_chat_q', '@ch2stat:coffee'], ['c2n1_e2', '@ch2stat:supplies']]) {
  for (const change of [{ phase: 'settle' }, { phase: 'quiz' }, { phase: 'done' }, { done: true }, { stepId: 'elsewhere' }]) {
    const s = id === 'c2n1_e2' ? paidVisit() : base(id)
    Object.assign(s.dlc.ch2, change)
    assert.equal(takeCh2StatInteraction(s, id, token), s)
    assert.deepEqual(ch2StatChoices(s, id), [])
    assert.equal(ch2StatReply(s, id), undefined)
    assert.equal(clearCh2StatReply(s, id), s)
  }
  const s = id === 'c2n1_e2' ? paidVisit() : base(id)
  s.dlc.ch2.giftReply = { stepId: id, text: '先说完原送礼回应' }
  assert.equal(takeCh2StatInteraction(s, id, token), s)
}
for (const token of ['@ch2stat:hint:metal', '@ch2stat:coffee', '@ch2stat:supplies', '@ch2stat:hint:invalid', 'c2n1_e3']) {
  const s = base(); assert.equal(takeCh2StatInteraction(s, 'c2n1_w1ok', token), s)
}
const stalePending = base('c2n3_chat_q')
stalePending.dlc.ch2.statInteractions = { pending: { stepId: 'c2n1_w1ok', token: '@ch2stat:hint:fall' } }
assert.equal(ch2StatChoices(stalePending, 'c2n3_chat_q').length, 1, 'An unrelated obsolete reply does not lock a later scene')

// Three actual completions add only +1 wealth each. Original effects stay
// untouched; old completion receipts and legacy flags are never backfilled.
const completionFixture = id => {
  const s = base(id)
  if (id.startsWith('c2am_')) Object.assign(s.flags, { c2_payoff_model: true, c2_payoff_base: true })
  return s
}
const originalsAfter = (s, id) => applyEffect(s, rawStep(id).effect)
const rewardNodes = ['c2n1_gap_chair_fix', 'c2n5_e3b', 'c2am_payoff_layers', 'c2am_payoff_rotate']
for (const id of rewardNodes) {
  const before = completionFixture(id), original = originalsAfter(before, id), savedBefore = clone(before), savedAfter = clone(original)
  const awarded = grantCh2WealthOnEntry(before, original, id)
  assert.equal(awarded.wealth, original.wealth + 1, `${id}: actual completion gives one wealth`)
  assert.equal(awarded.ap, original.ap); assert.equal(awarded.gold, original.gold)
  assert.deepEqual(awarded.items, original.items)
  assert.deepEqual(awarded.flags, original.flags)
  assert.deepEqual(awarded.badges, original.badges)
  assert.deepEqual(before, savedBefore); assert.deepEqual(original, savedAfter)
  assert.equal(awarded.dlc.ch2.loop.entries.filter(row => row.id.startsWith('stat:wealth:')).length, 1)
  assert.equal(grantCh2WealthOnEntry(awarded, awarded, id), awarded)
  const nested = recordCh2Change(before, awarded, `ch2-${id}`, '原节点效果')
  assert.equal(nested.dlc.ch2.loop.entries.reduce((n, row) => n + row.delta.wealth, 0), 1, 'Outer entry does not double-list the wealth')
  for (const legacyReceipt of ['applied', 'ledger', 'cursor']) {
    const old = completionFixture(id)
    if (legacyReceipt === 'applied') old.dlc.ch2.appliedSteps = [`ch2-${id}`]
    if (legacyReceipt === 'ledger') {
      const recorded = recordCh2Change(old, old, `ch2-${id}`, '旧完成记录')
      old.dlc = recorded.dlc
    }
    if (legacyReceipt === 'cursor') delete old.dlc.ch2.appliedSteps
    const after = originalsAfter(old, id)
    assert.equal(grantCh2WealthOnEntry(old, after, id), after, `${id}/${legacyReceipt}: no retroactive old-save reward`)
  }
  for (const change of [{ phase: 'done' }, { phase: 'settle' }, { phase: 'quiz' }, { done: true }, { shift: 'wrong' }]) {
    const beforeInvalid = completionFixture(id); Object.assign(beforeInvalid.dlc.ch2, change)
    const after = originalsAfter(beforeInvalid, id)
    assert.equal(grantCh2WealthOnEntry(beforeInvalid, after, id), after)
  }
}
for (const [id, flag] of [['c2n1_gap_chair_fix', 'c2_chair_fixed'], ['c2n5_e3b', 'c2n5_e'],
  ['c2am_payoff_layers', 'c2_payoff_base_used'], ['c2am_payoff_rotate', 'c2_payoff_model_used']]) {
  const s = completionFixture(id); s.flags[flag] = true
  const after = originalsAfter(s, id)
  assert.equal(grantCh2WealthOnEntry(s, after, id), after, 'Old completion flags are not new work')
}
const noTool = completionFixture('c2n1_gap_chair_fix'); noTool.items = []
const noToolAfter = originalsAfter(noTool, 'c2n1_gap_chair_fix')
assert.equal(grantCh2WealthOnEntry(noTool, noToolAfter, 'c2n1_gap_chair_fix'), noToolAfter)
for (const id of ['c2am_payoff_layers', 'c2am_payoff_rotate']) {
  const s = completionFixture(id); delete s.flags.c2_payoff_model
  const after = originalsAfter(s, id)
  assert.equal(grantCh2WealthOnEntry(s, after, id), after, 'No demonstrated model, no reward')
}
let all = completionFixture('c2n1_gap_chair_fix')
const initialWealth = all.wealth
for (const id of rewardNodes) {
  all = move(all, id)
  if (id.startsWith('c2am_')) all = { ...all, flags: { ...all.flags, c2_payoff_model: true, c2_payoff_base: true } }
  all = clone(grantCh2WealthOnEntry(all, originalsAfter(all, id), id))
}
assert.equal(all.wealth, initialWealth + 3, 'The two demonstration paths share the third reward')
assert.deepEqual(all.dlc.ch2.statInteractions.wealthRewards, ['chair', 'equipment-notes', 'teaching'])
const replay = restartCh2(coffee)
assert.equal(replay.dlc.ch2.statInteractions, undefined)
assert.equal(replay.wealth, coffee.wealth); assert.equal(replay.skill, coffee.skill)
assert.deepEqual(replay.dlc.dr, coffee.dlc.dr); assert.deepEqual(replay.dlc.dsa, coffee.dlc.dsa)
assert.equal(replay.flags.quiz_grade, 'S')
console.log('PASS ch2-stat-interactions: 3 independent method hints, coffee and paid-visit refund, 3 actual wealth completions, old-save/refresh/replay/duplicate protection')
