import assert from 'node:assert/strict'
import { CH2_SHIFTS } from '../src/game/ch2.ts'
import { CH2_PAYOFF_STEPS, CH2_PAYOFF_KEEPSAKES, CH2_PAYOFF_EVIDENCE,
  ch2PayoffStep, ch2PayoffGiftChoices, ch2PayoffKeepsakes } from '../src/game/ch2-payoffs.ts'
import { applyEffect, freshState } from '../src/game/store.ts'
import { restartCh2 } from '../src/game/ch2-exploration.ts'

const additions = Object.assign({}, ...Object.values(CH2_PAYOFF_STEPS))
const original = Object.assign({}, ...CH2_SHIFTS.map(shift => shift.steps))
const nodes = { ...original, ...additions }
const inherited = { n5_lei: true, n5_qian: true, n5_fan: true, n5_jiang: true,
  archive_film: true, archive_sealed: true, mystery_told: true, quiz_grade: 'S' }
const old = { ...freshState('f'), gold: 876, ap: 2, flags: { ...inherited },
  finished: true, night: 5, buyCount: 27, lotteryNight: 5, lotteryCount: 4,
  dlc: { dr: { done: true }, dsa: { done: true, dose: 42 }, ch2: { shift: 'c2n5', phase: 'story' } } }
const newUseBadges = ['c2_brass_key', 'c2_model_demo']
const score = s => Object.fromEntries(['gold', 'skill', 'heart', 'wealth', 'ap', 'durability', 'items', 'badges', 'stamps']
  .map(key => [key, key === 'badges' ? s.badges.filter(badge => !newUseBadges.includes(badge)) : s[key]]))
const protectedState = s => ({ night: s.night, finished: s.finished, buyCount: s.buyCount,
  lotteryNight: s.lotteryNight, lotteryCount: s.lotteryCount,
  oldFlags: Object.fromEntries(Object.keys(inherited).map(key => [key, s.flags[key]])), dr: s.dlc?.dr, dsa: s.dlc?.dsa })
const render = (id, s) => ch2PayoffStep(id, nodes[id], s)

for (const [id, step] of Object.entries(additions)) {
  if (!['c2am_lowdose_teaser0', 'c2am_lowdose_teaser1', 'c2am_lowdose_teaser2'].includes(id)) assert.match(id, /^c2(?:d2|n5|am)_payoff_/)
  assert.equal(step.sfx, undefined)
  assert.equal(step.sfx2, undefined)
  for (const field of ['windowTask', 'checklist', 'readout', 'pedal', 'dose', 'dnt', 'card']) assert.equal(step[field], undefined)
  for (const effect of [step.effect, ...(step.choices ?? []).map(choice => choice.effect)].filter(Boolean)) {
    assert.deepEqual(Object.keys(effect), ['flag'], `${id}: no new economic/medical reward`)
    assert.match(effect.flag, /^c2_payoff_/)
  }
  for (const target of [step.next, ...(step.choices ?? []).map(choice => choice.next)].filter(Boolean)) {
    assert(nodes[target], `${id}: missing destination ${target}`)
  }
}

// Real chapter-one receipts are the gate, not merely being friends with an NPC.
const neverReceived = { ...old, flags: { met_lei: true, jiang_friend: true, fan_friend: true, qian_helped: true } }
assert.equal(ch2PayoffStep('c2d2_trauma_scan', original.c2d2_trauma_scan, neverReceived).next, original.c2d2_trauma_scan.next)
assert(!ch2PayoffGiftChoices(neverReceived).some(choice => /jiang/.test(choice.next)))
const notebookEntry = ch2PayoffStep('c2d2_trauma_scan', original.c2d2_trauma_scan, old)
assert.equal(notebookEntry.next, 'c2d2_payoff_notebook_q')
assert.deepEqual({ ...notebookEntry, next: original.c2d2_trauma_scan.next }, original.c2d2_trauma_scan)
for (const target of ['c2d2_payoff_notebook_read', 'c2d2_payoff_notebook_pass']) {
  const step = render(target, old)
  const after = applyEffect(old, step.effect)
  assert.equal(step.next, 'c2d2_t1', 'Both choices still reach the original image observation')
  assert.deepEqual(score(after), score(old))
  assert.equal(after.dlc.ch2.observations, undefined, 'The notebook must not answer a question')
  assert.equal(ch2PayoffStep('c2d2_trauma_scan', original.c2d2_trauma_scan, after).next, original.c2d2_trauma_scan.next)
  const missing = render(target, neverReceived)
  assert.equal(missing.effect, undefined)
  assert.doesNotMatch(missing.text, /去年|错题本|小雷/)
}

// Main archive remains free, mandatory and independent of owning the shop key.
// Its old evidence/handover flags remain at the original nodes.
for (const id of ['c2n5_a7', 'c2n5_a8', 'c2n5_a9', 'c2n5_a10']) {
  assert.deepEqual(render(id, old).effect, original[id].effect, `${id}: retain old effect`)
  assert.equal(render(id, old).event, original[id].event)
}
let archiveRoutes = 0
for (const gender of ['f', 'm']) for (const withKey of [false, true]) {
  let s = { ...structuredClone(old), gender, items: withKey ? ['key'] : [] }
  const before = score(s), frozen = protectedState(s)
  let id = 'c2n5_a4', visits = 0
  while (id !== 'c2n5_hub' && visits++ < 20) {
    const step = render(id, s)
    s = JSON.parse(JSON.stringify(applyEffect(s, step.effect)))
    id = step.choices ? step.choices[withKey ? 1 : 0].next : step.next
  }
  assert.equal(id, 'c2n5_hub')
  assert(s.flags.c2_payoff_model)
  assert.equal(Boolean(s.flags.c2_payoff_base), withKey)
  assert.equal(s.badges.includes('c2_brass_key'), withKey, 'Only actual key use gets the one approved new badge')
  assert.equal(s.badges.includes('c2_model_demo'), false)
  assert.equal(s.flags.old_photo, undefined, 'Do not re-use the stray legacy photograph flag')
  for (const flag of ['old_register', 'nameless_films', 'zhou_handover', 'c2n5_cabinet']) assert(s.flags[flag])
  assert.deepEqual(score(s), before)
  assert.deepEqual(protectedState(s), frozen)
  const reset = restartCh2(s)
  assert.equal(reset.flags.c2_payoff_model, undefined)
  assert.equal(reset.flags.c2_payoff_base, undefined)
  assert.deepEqual(protectedState(reset), frozen)
  archiveRoutes++
}
const noKey = render('c2n5_k1', { ...old, items: [] })
assert.equal(noKey.effect, undefined)
assert.equal(noKey.next, 'c2n5_a7')
assert.equal(render('c2n5_k2', old).image, '')
assert.match(render('c2n5_a4', old).text, /教学片.*手写笔记.*1997.*合影.*旧设备照片/)
assert.match(render('c2n5_a7', old).text, /不是一回事/)
assert.match(render('c2n5_a7', { ...old, flags: {} }).text, /别往机架里塞/)

// Three receipt paths, two new relationships plus the chapter-one Jiang callback.
const giftState = { ...old, flags: { ...inherited, c2_needle_resolved: true, c2_terminal_device_noted: true } }
assert.equal(ch2PayoffGiftChoices(giftState).length, 3)
assert.equal(ch2PayoffGiftChoices({ ...old, flags: { c2_needle_seen: true, c2_needle_assessed: true } }).length, 0,
  'Aunt Luo gift waits for the actual resolution, not an unresolved finding')
const leiGiven = { ...old, flags: {}, dlc: { ...old.dlc, ch2: { phase: 'story', loop: { gifts: [{ person: 'lei', item: 'snack', shift: 'c2d2' }] } } } }
assert.equal(ch2PayoffGiftChoices(leiGiven).length, 1)
assert.match(render('c2n5_payoff_lei0', leiGiven).text, /净吃你的/)
assert.match(render('c2n5_payoff_lei0', giftState).text, /记录/)
for (const [person, flag] of [['luo', 'c2_payoff_luo_gift'], ['lei', 'c2_payoff_lei_gift'], ['jiang', 'c2_payoff_jiang_gift']]) {
  const frozen = protectedState(giftState), before = score(giftState)
  const first = render(`c2n5_payoff_${person}0`, giftState)
  assert.equal(first.effect, undefined, 'Do not record a gift before it is actually handed over')
  const receipt = render(first.next, giftState)
  assert.deepEqual(receipt.effect, { flag })
  const received = applyEffect(giftState, receipt.effect)
  assert.equal(receipt.next, 'c2n5_hub')
  assert.deepEqual(score(received), before)
  assert.deepEqual(protectedState(received), frozen)
  assert(!ch2PayoffGiftChoices(JSON.parse(JSON.stringify(received))).some(choice => choice.next === `c2n5_payoff_${person}0`))
  assert.deepEqual(applyEffect(received, receipt.effect), received, 'Replay is flag-idempotent')
  const skipped = render(`c2n5_payoff_${person}1`, neverReceived)
  assert.equal(skipped.effect, undefined, 'Old/direct saves must not invent a missing relationship')
}
for (const phase of ['settle', 'quiz', 'done']) assert.deepEqual(ch2PayoffGiftChoices({ ...giftState,
  dlc: { ch2: { phase } } }), [])
const injected = render('c2n5_hub', giftState)
assert.equal(injected.choices.length, original.c2n5_hub.choices.length + 3)
assert.deepEqual(ch2PayoffStep('c2n5_hub', injected, giftState), injected, 'Render must not keep duplicating optional choices')
for (const item of ch2PayoffGiftChoices(giftState)) assert.equal(item.effect, undefined)
for (const id of ['c2n5_b1', 'c2n5_b2']) {
  assert.deepEqual(render(id, { ...old, flags: { c2_apples_shared: true } }).effect, original[id].effect)
  assert.match(render(id, { ...old, flags: { c2_apples_shared: true } }).text, /苹果/)
  assert.deepEqual(render(id, old), id === 'c2n5_b2' ? { ...original[id], image: 'item_beef' } : original[id], 'No invented apple sharing; existing beef image now shown')
}

const cup = render('c2n5_g1', { ...old, flags: { c2_payoff_jiang_gift: true } })
assert.deepEqual(cup.effect, { flag: 'c2_payoff_zhou_cup' })
assert.match(cup.text, /杯套/)
assert.doesNotMatch(render('c2n5_g1', old).text, /杯套/)
assert.equal(ch2PayoffKeepsakes(old).length, 0)
const owned = { flags: Object.fromEntries(CH2_PAYOFF_KEEPSAKES.map(item => [item.flag, true])) }
assert.equal(ch2PayoffKeepsakes(owned).length, 7)
assert.equal(Object.keys(CH2_PAYOFF_EVIDENCE).length, 7)
for (const item of CH2_PAYOFF_KEEPSAKES) {
  if (item.id === 'tang_meal') {
    assert.equal(item.flag, 'c2n5_b', 'Existing meal receipt, not another consumable or reward')
    assert.equal(item.image, 'item_beef')
  } else assert.match(item.flag, /^c2_payoff_/)
  assert(item.image, 'Every keepsake has a reviewed image')
  assert(item.use.length > 5)
  assert.equal(CH2_PAYOFF_EVIDENCE[`ch2_keepsake_${item.id}`].flag, item.flag)
}

// Next-week payoff: original saves without this revision's objects get no made-up receipt.
let epilogueRoutes = 0
for (const model of [false, true]) for (const base of [false, true]) for (const glasses of [false, true]) {
  let s = { ...old, flags: { ...inherited, n5_fan: glasses, c2_payoff_model: model,
    c2_payoff_base: base, c2_payoff_zhou_cup: true } }
  const before = score(s), frozen = protectedState(s)
  let id = 'c2am_9', visits = 0
  const seen = []
  while (visits++ < 16) {
    seen.push(id)
    const step = render(id, s)
    s = JSON.parse(JSON.stringify(applyEffect(s, step.effect)))
    if (step.end) break
    id = step.choices ? step.choices[base ? step.choices.length - 1 : 0].next : step.next
    assert(nodes[id], `Ending must not strand the player at ${id}`)
  }
  assert.equal(seen.at(-1), 'c2am_lowdose_teaser2')
  assert(seen.length <= 11)
  assert.deepEqual(seen.slice(-3), ['c2am_lowdose_teaser0', 'c2am_lowdose_teaser1', 'c2am_lowdose_teaser2'])
  assert(seen.includes('c2am_payoff_handshake'))
  assert.equal(seen.includes('c2am_payoff_rotate'), model && base)
  assert.equal(seen.includes('c2am_payoff_layers'), model && !base)
  assert(s.flags.c2_payoff_expert_done)
  assert.equal(s.badges.includes('c2_model_demo'), model, 'Either actual demonstration earns the same single new badge')
  assert.equal(s.badges.includes('c2_brass_key'), false, 'An injected model ownership flag alone does not play the key-use event')
  assert.deepEqual(score(s), before)
  assert.deepEqual(protectedState(s), frozen)
  assert.equal(render('c2am_9', s), original.c2am_9, 'Finished saves do not replay the new ending')
  assert.equal(/报废铅眼镜/.test(render('c2am_payoff_reply', s).text), glasses)
  epilogueRoutes++
}
assert.equal(render('c2am_payoff_rotate', old).effect, undefined)
assert.match(render('c2am_9', old).text, /2025年11月.*下一周/)
assert.equal(additions.c2am_payoff_handshake.image, 'ch2_zhou_expert_handshake_v1')
assert.match(additions.c2am_payoff_handshake.text, /握住.*周老师/)
assert.doesNotMatch(JSON.stringify(additions), /康复了|治愈|报恩|下放|他的父亲|1998|强迫|考试答案/)
assert.deepEqual(protectedState(old), protectedState(JSON.parse(JSON.stringify(old))))
console.log(`PASS chapter-two payoffs: ${Object.keys(additions).length} new nodes; ${archiveRoutes} archive routes; ${epilogueRoutes} next-week routes; 3 conditional free receipts; 4 chapter-one gift gates; old evidence/awards and untouched observation preserved; reload/replay/missing-history safe.`)
