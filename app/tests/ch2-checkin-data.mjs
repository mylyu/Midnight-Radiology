import assert from 'node:assert/strict'
import { CH2_SHIFTS } from '../src/game/ch2.ts'
import { CH2_CHECKINS, ch2CheckinPending, completeCh2Checkin } from '../src/game/ch2-checkin.ts'
import { restartCh2 } from '../src/game/ch2-exploration.ts'
import { applyEffect, freshState, loadState, saveState } from '../src/game/store.ts'

const ids = ['c2n1_1', 'c2d2_0', 'c2n3_1', 'c2d4_0', 'c2n5_1']
assert.deepEqual(Object.keys(CH2_CHECKINS), ids, 'Exactly five work shifts get a check-in; the morning quiz does not')
const inheritedFlags = { archive_sealed: true, mystery_told: true, quiz_grade: 'S', wen_card: true }
const base = { ...freshState('f'), seed: 24680, gold: 876, ap: 2, skill: 7, heart: 8, wealth: 4,
  finished: true, night: 5, buyCount: 27, lotteryNight: 5, lotteryCount: 4,
  lastCheckin: '2026-09-23', streak: 6, items: ['book'], cards: ['ct_basic'], events: ['old_event'],
  badges: ['fixer'], stamps: ['night1'], flags: inheritedFlags,
  dlc: { dr: { done: true, stepId: 'dr_done' }, dsa: { done: true, dose: 42 } } }
const economy = s => Object.fromEntries(['gold', 'ap', 'skill', 'heart', 'wealth', 'durability', 'items', 'cards', 'events', 'badges', 'stamps'].map(key => [key, s[key]]))
const protectedState = s => ({ ...Object.fromEntries(['gender', 'seed', 'night', 'finished', 'buyCount', 'lotteryNight', 'lotteryCount', 'lastCheckin', 'streak'].map(key => [key, s[key]])),
  flags: Object.fromEntries(Object.keys(inheritedFlags).map(key => [key, s.flags[key]])), dr: s.dlc.dr, dsa: s.dlc.dsa })
const fixture = id => ({ ...structuredClone(base), dlc: { ...structuredClone(base.dlc), ch2: {
  shift: CH2_CHECKINS[id].shift, stepId: id, phase: 'story', appliedSteps: [],
} } })
let totalGold = 0, totalAp = 0
for (const id of ids) {
  const { shift } = CH2_CHECKINS[id]
  const original = CH2_SHIFTS.find(row => row.id === shift).steps[id]
  assert.deepEqual(original.effect, shift.includes('n') ? { gold: 50, ap: 3 } : undefined, `${id}: original economy is frozen`)
  const before = fixture(id), frozen = structuredClone(before)
  assert(ch2CheckinPending(before, id))
  const after = completeCh2Checkin(before, id)
  assert.deepEqual(before, frozen, 'Completion cannot mutate the input save')
  assert.deepEqual(economy(after), economy(applyEffect(before, original.effect)), `${id}: gesture applies exactly the original effect`)
  assert.deepEqual(protectedState(after), protectedState(before), 'Chapter one and other DLCs remain untouched')
  assert.equal(after.flags[`c2_checkin_${shift}`], true)
  assert.equal(after.dlc.ch2.stepId, id, 'Completion leaves the original dialogue for the player to continue')
  assert.deepEqual(after.dlc.ch2.appliedSteps, [`ch2-${id}`])
  assert.equal(after.dlc.ch2.loop.entries.length, 1)
  const receipt = after.dlc.ch2.loop.entries[0]
  assert.equal(receipt.id, `ch2-${id}`)
  assert.equal(receipt.shift, shift)
  assert.deepEqual(receipt.delta, { gold: original.effect?.gold ?? 0, ap: original.effect?.ap ?? 0, skill: 0, heart: 0, wealth: 0 })
  assert.deepEqual(receipt.flags, [`c2_checkin_${shift}`])
  assert(!ch2CheckinPending(after, id))
  assert.equal(completeCh2Checkin(after, id), after, 'A second completion is an exact no-op')
  const restored = JSON.parse(JSON.stringify(after))
  assert.equal(completeCh2Checkin(restored, id), restored, 'A restored completion cannot pay or record twice')
  totalGold += after.gold - before.gold; totalAp += after.ap - before.ap

  // Saves made before this feature already performed the old entry effect.
  for (const legacy of [
    { ...fixture(id), dlc: { ...base.dlc, ch2: { shift, stepId: id, phase: 'story', appliedSteps: [`ch2-${id}`] } } },
    { ...fixture(id), dlc: { ...base.dlc, ch2: { shift, stepId: id, phase: 'story' } } },
    { ...fixture(id), dlc: { ...base.dlc, ch2: { shift, stepId: id, phase: 'story', appliedSteps: [], loop: after.dlc.ch2.loop } } },
  ]) {
    assert(!ch2CheckinPending(legacy, id), `${id}: old save must not regain the gate`)
    assert.equal(completeCh2Checkin(legacy, id), legacy, `${id}: old save must not repay`)
  }
  for (const patch of [{ phase: 'settle' }, { phase: 'quiz' }, { phase: 'done' }, { done: true }, { stepId: original.next }, { shift: 'c2am' }]) {
    const stale = fixture(id); Object.assign(stale.dlc.ch2, patch)
    assert.equal(completeCh2Checkin(stale, id), stale, `${id}: stale/non-story callbacks are rejected`)
  }
}
assert.equal(totalGold, 150); assert.equal(totalAp, 9)
for (const id of ['c2n1_0', 'c2am_0', 'n1_0', 'dr_0', 'missing']) {
  const state = fixture('c2n1_1')
  assert(!ch2CheckinPending(state, id)); assert.equal(completeCh2Checkin(state, id), state)
}

// Save/load keeps the acknowledgement, effect, and receipt in one JSON snapshot.
const storage = new Map()
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) }
const successful = completeCh2Checkin(fixture('c2n5_1'), 'c2n5_1')
saveState(successful)
assert.deepEqual(loadState(), successful)
const done = { ...successful, dlc: { ...successful.dlc, ch2: { ...successful.dlc.ch2, done: true, phase: 'done', stepId: 'c2am_9' } } }
saveState(done)
assert.deepEqual(loadState(), done, 'Loading a completed chapter must not reset or repay it')

const finishedRun = { ...done, flags: { ...done.flags, ...Object.fromEntries(Object.values(CH2_CHECKINS).map(({ shift }) => [`c2_checkin_${shift}`, true])) } }
const restart = restartCh2(finishedRun)
assert.deepEqual(restart.dlc.ch2, {})
assert.equal(restart.ap, 0, 'Explicit restart retains the established AP reset')
for (const { shift } of Object.values(CH2_CHECKINS)) assert.equal(restart.flags[`c2_checkin_${shift}`], undefined)
assert.deepEqual(protectedState(restart), protectedState(finishedRun))
assert.deepEqual({ ...economy(restart), ap: finishedRun.ap }, economy(finishedRun), 'Explicit restart preserves all other economy and collections')
assert(ch2CheckinPending(restart, 'c2n1_1'), 'An explicit fresh run can check in again')
console.log('PASS five atomic check-ins; original total +150 gold/+9 AP; two reward-free days; duplicate/refresh/stale callback guards; legacy and completed saves; restart and cross-chapter isolation')
