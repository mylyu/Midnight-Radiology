import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { freshState, applyEffect } from '../src/game/store.ts'
import { CH2_SHIFTS, QUIZ2 } from '../src/game/ch2.ts'
import { beginCh2Shift, recordCh2Change, ch2NetChange, ch2ShiftEntries } from '../src/game/ch2-ledger.ts'
import { CH2_GIFT_HOSTS, ch2GiftChoices, giveCh2Gift, ch2GiftSalesEnded } from '../src/game/ch2-gifts.ts'
import { buyCh2Item, shareCh2Item, patchCh2, settleCh2, nextCh2Shift, redeemCh2Coffee, ch2ItemUnavailable, startCh2Quiz, answerCh2Quiz, nextCh2Question } from '../src/game/ch2-session.ts'

const initial = { ...freshState('m'), gold: 10000, night: 5, buyCount: 77, lotteryNight: 5, lotteryCount: 4,
  flags: { quiz_grade: 'S', n5_qian: true, n5_fan: true }, dlc: { dr: { done: true }, dsa: { dose: 23 }, ch2: { shift: 'c2n1', stepId: 'c2n1_0', phase: 'story' } } }
const frozen = s => ({ night: s.night, buyCount: s.buyCount, lotteryNight: s.lotteryNight, lotteryCount: s.lotteryCount,
  quiz_grade: s.flags.quiz_grade, n5_qian: s.flags.n5_qian, n5_fan: s.flags.n5_fan, dr: s.dlc.dr, dsa: s.dlc.dsa })
let s = beginCh2Shift(initial, 'c2n1')
assert.equal(beginCh2Shift(s, 'c2n1'), s)
assert.equal(s.dlc.ch2.loop.shifts.c2n1.start.gold, 10000)
assert.equal(s.dlc.ch2.loop.shifts.c2n1.recovered, false)
s = recordCh2Change(s, applyEffect(s, { gold: 120, skill: 1, badge: 'first_ct' }), 'step:first', '第一例完成', 'case')
const once = s
assert.equal(recordCh2Change(s, applyEffect(s, { gold: 120 }), 'step:first', '重复'), once)
assert.equal(ch2NetChange(s).gold, 120)
assert.deepEqual(ch2ShiftEntries(s)[0].gained.badges, ['first_ct'])
assert.equal(s.dlc.ch2.loop.entries[0].kind, 'case')

// Historical saves begin at the restored point, with no guessed prior income.
const old = recordCh2Change(initial, applyEffect(initial, { heart: 1 }), 'old:entry', '从这里记起')
assert.equal(old.dlc.ch2.loop.shifts.c2n1.recovered, true)
assert.equal(old.dlc.ch2.loop.shifts.c2n1.start.gold, initial.gold)
assert.equal(ch2NetChange(old).gold, 0)

// Every shop receipt keeps the existing item rules and exact accounting.
s = patchCh2(s, { stepId: 'c2n1_hub' })
for (const id of ['milktea', 'snack', 'book', 'toolbox', 'dosimeter']) {
  const before = s
  s = buyCh2Item(s, id).state
  const row = s.dlc.ch2.loop.entries.at(-1)
  assert.equal(row.delta.gold, s.gold - before.gold)
  assert.equal(row.kind, 'shop')
  assert.equal(buyCh2Item(s, id).state, s)
}
for (let i = 0; i < 5; i++) s = buyCh2Item(s, 'lottery', i === 4 ? .99 : 0).state
assert.match(ch2ItemUnavailable(s, 'lottery'), /五张/)
assert.equal(s.dlc.ch2.shop.lotteryCount, 5)

// Safe gifts consume tangible inventory once, stay in the host conversation, and persist a reply.
const beforeGift = s, choices = ch2GiftChoices(s, 'c2n1_chat_q')
assert.equal(choices.length, 2)
const milk = choices.find(choice => choice.next.endsWith(':milktea'))
s = giveCh2Gift(s, 'c2n1_chat_q', milk.next).state
assert(!s.items.includes('milktea'))
assert.equal(s.heart, beforeGift.heart, 'milk has only its purchase-time +2')
assert.equal(s.ap, beforeGift.ap)
assert.equal(ch2GiftChoices(s, 'c2n1_chat_q').length, 0)
assert.equal(giveCh2Gift(s, 'c2n1_chat_q', milk.next).state, s)
assert.equal(s.dlc.ch2.giftReply.stepId, 'c2n1_chat_q')
s = JSON.parse(JSON.stringify(s))
assert(s.dlc.ch2.giftReply.text.length > 0)
assert.equal(ch2GiftChoices(s, 'c2n1_m2').length, 0, 'never in an emergency decision')
const snack = ch2GiftChoices(s, 'c2n1_gap_chair_q').find(choice => choice.next.endsWith(':snack'))
const oldHeart = s.heart
s = giveCh2Gift(s, 'c2n1_gap_chair_q', snack.next).state
assert.equal(s.heart, oldHeart + 1)
assert(!s.items.includes('snack'))
assert.equal(s.dlc.ch2.loop.gifts.length, 2)

// All configured hosts exist, all requested colleagues are covered, no follow-up needs a new room.
const people = new Set()
for (const [node, hosts] of Object.entries(CH2_GIFT_HOSTS)) {
  assert(CH2_SHIFTS.some(shift => shift.steps[node]), `missing gift node ${node}`)
  hosts.forEach(person => people.add(person))
}
assert.deepEqual([...people].sort(), ['fan', 'he', 'lei', 'tang', 'zhou'])
const he = patchCh2({ ...s, items: ['milktea', 'snack'] }, { shift: 'c2n3', phase: 'story' })
assert.equal(ch2GiftChoices(he, 'c2n3_k2').length, 1, 'old oden branch is not replaced by a second snack')

// Settlement and its saved snapshot do not pay the original story reward again.
const gold = s.gold
s = settleCh2(s, 'c2n1')
assert.equal(s.gold, gold)
assert(s.dlc.ch2.loop.shifts.c2n1.settled)
assert.equal(settleCh2(s, 'c2n1'), s)
const withFood = { ...s, items: ['milktea', 'snack'] }
assert.equal(shareCh2Item(withFood, 'snack'), withFood)
assert.equal(shareCh2Item(withFood, 'milktea'), withFood)
s = buyCh2Item(s, 'coffee').state
assert(s.dlc.ch2.pendingCoffee)
assert.equal(s.dlc.ch2.loop.currentShift, 'c2n1')
const next = nextCh2Shift(s)
assert.equal(next.dlc.ch2.shift, 'c2d2')
assert.equal(next.dlc.ch2.loop.shifts.c2d2.start.gold, s.gold, 'after-shift shopping belongs to previous shift')
assert.equal(next.dlc.ch2.loop.shifts.c2d2.recovered, false)
assert.equal(nextCh2Shift(next), next)
assert.equal(ch2NetChange(next,'c2n1').gold,ch2ShiftEntries(next,'c2n1').reduce((sum,row)=>sum+row.delta.gold,0),'historical shift excludes later balances and includes post-settlement purchases')

// Nested coffee + step receipts sum to the actual net change, never double count.
s = beginCh2Shift(patchCh2(next, { shift: 'c2n3', phase: 'story', pendingCoffee: true }), 'c2n3')
const beforeCoffee = s
s = redeemCh2Coffee(applyEffect(s, { ap: 3 }), 'c2n3_hub')
s = recordCh2Change(beforeCoffee, s, 'step:hub', '开诊前自由探索')
assert.equal(ch2ShiftEntries(s, 'c2n3').reduce((sum, row) => sum + row.delta.ap, 0), s.ap - beforeCoffee.ap)
assert.equal(redeemCh2Coffee(s, 'c2n3_hub'), s)

// Fifth-night stock stops after the last in-person opportunity; owned inventory is retained.
let late = patchCh2({ ...s, items: [], flags: { ...s.flags, c2n5_chat_done: true } }, { shift: 'c2n5', phase: 'story' })
assert(ch2GiftSalesEnded(late))
for (const id of ['milktea', 'snack']) assert.match(ch2ItemUnavailable(late, id), /空当已过/)
late = patchCh2({ ...late, flags: { ...late.flags, c2n5_chat_done: false } }, { stepId: 'c2n5_m6' })
assert(ch2GiftSalesEnded(late))
late = patchCh2(late, { phase: 'settle' })
assert(ch2GiftSalesEnded(late))
assert(!ch2GiftSalesEnded(patchCh2({ ...late, flags: {} }, { phase: 'story', stepId: 'c2n5_0' })))

// Quiz reward recorded only once across persisted answers, while Chapter 1 grade stays fixed.
s = beginCh2Shift(patchCh2(s, { shift: 'c2am', stepId: 'c2am_2', phase: 'story' }), 'c2am')
s = startCh2Quiz(s, 2345)
const beforeQuiz = s.gold
for (let i = 0; i < 5; i++) {
  const q = s.dlc.ch2.quiz.questions[i]
  s = answerCh2Quiz(s, q.order.indexOf(QUIZ2[q.question].answer))
  s = JSON.parse(JSON.stringify(s))
  s = nextCh2Question(s)
}
assert.equal(s.gold, beforeQuiz + 250)
assert.equal(nextCh2Question(s), s)
assert.equal(s.dlc.ch2.loop.entries.filter(row => row.id === 'quiz:reward').length, 1)
assert.equal(s.dlc.ch2.loop.entries.at(-1).delta.gold, 250)
assert.deepEqual(frozen(s), frozen(initial))

const source = readFileSync(new URL('../src/components/Ch2Shop.tsx', import.meta.url), 'utf8')
assert(!source.includes('onClick={() => share('), 'no after-shift gift action')
console.log('PASS: additive ledger, exact stat deltas, old-save notice, idempotent story/shop/settlement/quiz, persistent in-person gifts and five colleagues, AP preserved, stock cutoff, first-chapter/DR/DSA state preserved.')
