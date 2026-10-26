// Small boundary checks for CH3's presentation decisions and their existing transactions.
import assert from 'node:assert/strict'
import { CH3 } from '../src/game/ch3.ts'
import { freshState } from '../src/game/store.ts'
import { initializeTrilogy, patchTrilogy, trilogyProgress, trilogyBuy, trilogyShopItems,
  enterTrilogyNode, trilogyAdvance } from '../src/game/trilogy-session.ts'
import { ch3ContactName, ch3NeedsSettlementChoice, ch3PurchaseButton } from '../src/components/ch3-presentation.ts'

const base = initializeTrilogy({ ...freshState('f'), gold: 1000 }, CH3, 'ch3-ui-boundaries')
const progress = trilogyProgress(base, 'ch3')
const coffee = trilogyShopItems(CH3, base).find(item => item.id === 'coffee')
const offer = (s, item = coffee) => ch3PurchaseButton(s, trilogyProgress(s, 'ch3'), item)
assert(coffee)
assert(ch3NeedsSettlementChoice('ch3', 'story', true, false))
for (const args of [
  ['ch3', 'story', true, true], ['ch3', 'story', false, false],
  ['ch3', 'epilogue', true, false], ['ch3', 'done', true, false],
  ['ch4', 'story', true, false], ['ch5', 'story', true, false],
]) assert(!ch3NeedsSettlementChoice(...args))

// Contact identity comes from the explicit remote avatar, never the current speaker.
for (const [phone, expected] of [['pat_cousin', '表姐'], ['char_zhou', '老周'], ['char_wen', '雯雯']]) {
  for (const speaker of ['me', 'sys', 'mei'])
    assert.equal(ch3ContactName(CH3, { speaker, phone, communication: 'call' }), expected)
}
assert.equal(ch3ContactName(CH3, { speaker: 'me', phone: 'pat_cousin', communication: 'sms' }), '表姐')
assert.equal(ch3ContactName(CH3, { speaker: 'mei', communication: 'call' }), '电话')
assert.equal(ch3ContactName(CH3, { speaker: 'mei', communication: 'sms' }), '手机短信')

// Exploration coffee still has its original immediate AP/price effect.
assert(!offer(base).disabled)
const refreshed = trilogyBuy(base, CH3, 'coffee')
assert.equal(refreshed.gold, base.gold - coffee.price)
assert.equal(refreshed.ap, base.ap + 1)
assert(!offer(refreshed).disabled, 'Ordinary spaced purchases retain their original effect')

// Settlement purchase becomes one pending cup; a second attempt charges nothing.
const settle = patchTrilogy(base, 'ch3', { phase: 'settle' })
const reserved = trilogyBuy(settle, CH3, 'coffee')
assert.equal(reserved.gold, settle.gold - coffee.price)
assert.equal(reserved.ap, settle.ap)
assert(trilogyProgress(reserved, 'ch3').pendingCoffee)
assert.deepEqual(offer(reserved), { disabled: true, label: '已留一杯', reason: '待用咖啡会在下一班自由探索开始时生效。' })
assert.strictEqual(trilogyBuy(reserved, CH3, 'coffee'), reserved)
const restored = JSON.parse(JSON.stringify(reserved))
assert(offer(restored).disabled, 'Pending coffee stays disabled after save restoration')
const exploration = enterTrilogyNode(patchTrilogy(restored, 'ch3', { shift: 1, phase: 'story' }), CH3, 'c3_s2_hub')
assert.equal(exploration.ap, restored.ap + 1)
assert(!trilogyProgress(exploration, 'ch3').pendingCoffee)
assert(!offer(exploration).disabled)
assert.equal(enterTrilogyNode(exploration, CH3, 'c3_s2_hub').ap, exploration.ap)

for (const phase of ['settle', 'quiz', 'epilogue', 'done']) {
  const final = patchTrilogy(base, 'ch3', { phase, shift: 4 })
  assert.equal(offer(final).label, '本章停售')
  assert(offer(final).disabled)
  assert.strictEqual(trilogyBuy(final, CH3, 'coffee'), final)
}
assert.equal(offer({ ...base, gold: coffee.price - 1 }).label, '金币不足')
const tea = trilogyShopItems(CH3, base).find(item => item.id === 'milktea')
assert.equal(offer({ ...base, items: [...base.items, 'milktea'] }, tea).label, '已持有')
const lottery = trilogyShopItems(CH3, base).find(item => item.id === 'lottery')
assert.equal(offer(patchTrilogy(base, 'ch3', { shop: { ...progress.shop, lotteryCount: 5 } }), lottery).label, '本班售罄')

// Only the UI trigger changes: original end-state transaction remains idempotent.
const endNode = Object.entries(CH3.steps).find(([id, step]) => /^c3_s1_/.test(id) && step.end)?.[0]
assert(endNode)
const end = enterTrilogyNode(base, CH3, endNode)
const ended = trilogyAdvance(end, CH3, endNode)
assert.equal(trilogyProgress(ended, 'ch3').phase, 'settle')
assert.equal(ended.gold, end.gold)
assert.strictEqual(trilogyAdvance(ended, CH3, endNode), ended)
const epilogueEnd = patchTrilogy(enterTrilogyNode(base, CH3, 'c3_epilogue_20'), 'ch3', { phase: 'epilogue' })
assert.equal(trilogyProgress(trilogyAdvance(epilogueEnd, CH3, 'c3_epilogue_20'), 'ch3').phase, 'done')
console.log('CH3 presentation boundaries passed: settlement, contact identity, coffee and shop guards.')
