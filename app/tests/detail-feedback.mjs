import assert from 'node:assert/strict'
import { freshState, applyEffect } from '../src/game/store.ts'
import { acceptInput } from '../src/game/input-gate.ts'
import { statChanges, statChangeReason, appendStatNotice } from '../src/game/stat-feedback.ts'
import { beginCh2Shift, recordCh2Change } from '../src/game/ch2-ledger.ts'

const base = { ...freshState('f'), gold: 10, ap: 0, skill: 20, durability: 95 }
assert.deepEqual(statChanges(base, base), [])
assert.deepEqual(statChanges(base, applyEffect(base, { gold: -30, ap: -1, durability: 25, skill: 1 })), [
  { key: 'gold', amount: -10 }, { key: 'skill', amount: 1 }, { key: 'durability', amount: 5 },
])
assert.deepEqual(statChanges(base, applyEffect(base, { durability: 25 }), true), [], 'Ch2 never displays CR durability changes')
assert.equal(statChangeReason(base, { ...base, flags: { book_read_n1: true }, skill: 21 }), '翻到新书页')
assert.equal(statChangeReason(base, applyEffect(base, { durability: 5 })), '夜班进展', 'Cooling is not paid maintenance')
const day = { ...base, gold: 100, screenHint: 'day' }
assert.equal(statChangeReason(day, applyEffect(day, { gold: -50, wealth: 1, durability: 25 })), '保养老伙计')
const started = beginCh2Shift({ ...base, dlc: { ch2: { shift: 'c2n1', phase: 'story' } } }, 'c2n1')
const withSecret = recordCh2Change(started, { ...started, skill: 21 }, 'ch2-secret', '谜底：医生还没说出来的答案')
assert.equal(statChangeReason(started, withSecret), '本班进展', 'Never leak the next dialogue or diagnosis through a toast')
const observation = recordCh2Change(started, { ...started, skill: 21 }, 'observe:fall', '病例观察')
assert.equal(statChangeReason(started, observation), '影像观察')
const notice = (id, createdAt, changes, context = 'ch2:c2n1:story:target') => ({ id, createdAt, changes, context, expiresAt: createdAt + 2000, reason: '这次选择' })
const choice = notice(1, 0, [{ key: 'skill', amount: 1 }])
const entry = notice(2, 20, [{ key: 'wealth', amount: 1 }])
const merged = appendStatNotice([choice], entry)
assert.equal(merged.length, 1, 'Same gesture target-entry reward joins the choice notice')
assert.deepEqual(merged[0].changes, [{ key: 'skill', amount: 1 }, { key: 'wealth', amount: 1 }])
assert.equal(merged[0].expiresAt, 2000, 'Merging does not prolong a notice indefinitely')
assert.equal(appendStatNotice([choice], { ...entry, context: 'ch1:night:1:target' }).length, 2, 'Never merge across chapters')
assert.equal(appendStatNotice([choice], { ...entry, createdAt: 101 }).length, 2)
assert.deepEqual(appendStatNotice([choice], notice(2, 50, [{ key: 'skill', amount: -1 }])), [], 'Display true combined net change')
let coffeeRows = []
for (let id = 1; id <= 4; id++) coffeeRows = appendStatNotice(coffeeRows, notice(id, id * 510, [{ key: 'gold', amount: -30 }, { key: 'ap', amount: 1 }]))
assert.deepEqual(coffeeRows.map(row => row.id), [2, 3, 4], 'Separate valid purchases stay separate, with max three notices')
const gate = { until: 0 }
assert(acceptInput(gate, 0, 300))
for (let now = 20; now < 300; now += 20) assert.equal(acceptInput(gate, now, 300), false)
assert.equal(gate.until, 300, 'Rejected rapid taps never starve the deadline')
assert(acceptInput(gate, 300, 300))
const shopping = { until: 0 }
assert(acceptInput(shopping, 10, 500))
assert.equal(acceptInput(shopping, 509, 500), false)
assert(acceptInput(shopping, 510, 500))
console.log('PASS silent feedback: actual clamped deltas, safe labels, no-op, chapter boundary, non-starving input deadlines')
