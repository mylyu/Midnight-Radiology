// Dinner -> after-hours phantom -> saved daily settlement -> next-day consultation.
// Run from app/: node --import tsx tests/ldct-dinner-settlement.mjs
import assert from 'node:assert/strict'
import { freshState } from '../src/game/store.ts'
import { getLdctNode, getLdctSteps } from '../src/game/ldct.ts'
import { getLdctProgress, getLdctShelf, initializeLdct, selectLdctStory,
  openLdctShelf, ldctItemUnavailable, ldctAction } from '../src/game/ldct-session.ts'
import { createLdctPhantomPreparationState, createLdctRecord } from '../src/game/ldct-experiments.ts'

const copy = value => JSON.parse(JSON.stringify(value))
const p = getLdctProgress
const act = (state, type, fields = {}) => ldctAction(state, { type, ...fields })
const reload = state => initializeLdct(copy(state))
const stats = state => ({ gold: state.gold, skill: state.skill, heart: state.heart, wealth: state.wealth })
const awards = state => ({ badges: state.badges, receipts: getLdctShelf(state).receipts,
  experienced: getLdctShelf(state).experienced })
const protectedState = state => ({ flags: state.flags, night: state.night, ap: state.ap,
  ch2: state.dlc.ch2, dr: state.dlc.dr, dsa: state.dlc.dsa })
const base = selectLdctStory({ ...freshState('m'), gold: 900, skill: 11, heart: 7, wealth: 4,
  items: [], flags: { keep_main: true }, night: 4, ap: 2,
  dlc: { ch2: { done: true, certificate: { code: 'KEEP-DINNER' } }, dr: { done: true }, dsa: { dose: 56 } } }, 'father')
function at(state, nodeId, fields = {}) {
  const progress = { ...p(state), nodeId, phase: 'story', reply: undefined, ...fields }
  return { ...state, dlc: { ...state.dlc, ldct: { ...state.dlc.ldct, ldct: progress,
    ldctStories: { ...getLdctShelf(state), active: 'father', slots: { ...getLdctShelf(state).slots, father: progress } } } } }
}

const steps = getLdctSteps(p(base))
assert.deepEqual(Object.values(steps).filter(node => node.settle && !node.storyEnd).map(node => node.id), ['lf_night1_end'],
  'the first evening ends once, after the phantom work; dinner does not create a second daily pause')
const pause = steps.lf_night1_end
assert.equal(pause.settlement.next, 'lf_wait_consult')
assert(pause.settlement.title && pause.settlement.eyebrow && pause.settlement.nextLabel)
assert.equal(pause.timeLabel, '第一天 · 晚上')
assert.equal(steps.lf_wait_consult.timeLabel, '第二天 · 上午')
assert.equal(steps.lf_lab_4.timeLabel, '第一天 · 晚上')
assert.equal(steps.lf_lab_5.timeLabel, '第一天 · 晚上')

const record = createLdctRecord({ ...createLdctPhantomPreparationState(5), iterationRound: 10 }, 5, 'different', 'phantom')
assert(record)
const before = at(copy(base), 'lf_phantom_ready_2', { records: { 5: record } })
let state = act(before, 'advance', { nodeId: 'lf_phantom_ready_2' })
assert.equal(p(state).nodeId, 'lf_night1_end')
assert.equal(p(state).phase, 'settle')
assert.equal(p(state).finished, undefined)
assert.deepEqual(stats(state), stats(before), 'entering settlement never creates salary or rewards')
assert.deepEqual(awards(state), awards(before))
assert.equal(p(state).partStart, undefined, 'day one still compares with the run start')
for (const action of [
  { type: 'advance', nodeId: 'lf_night1_end' }, { type: 'advance', nodeId: 'lf_phantom_ready_2' },
  { type: 'choose', nodeId: 'lf_night1_end', choiceId: 'continue' }, { type: 'rest' },
  { type: 'research:close' }, { type: 'scan:complete', nodeId: 'lf_night1_end', now: 10000 },
]) assert.equal(ldctAction(state, action), state, `${action.type} cannot move a saved daily pause`)
state = reload(state)
assert.equal(p(state).phase, 'settle')
assert.equal(p(state).nodeId, 'lf_night1_end')
assert.deepEqual(stats(state), stats(before))
assert.deepEqual(awards(state), awards(before))

// Purchases stay on the same page, retain their ordinary price/effect, and are not repeated on load.
assert(ldctItemUnavailable(state, 'coffee'), 'coffee reply belongs to an in-person rest, not an empty settlement')
assert.equal(act(state, 'buy', { item: 'coffee' }), state)
for (const [item, price, heart] of [['snack', 40, 0], ['milktea', 200, 2]]) {
  const prior = state
  assert.equal(ldctItemUnavailable(state, item), undefined)
  state = act(state, 'buy', { item })
  assert.equal(state.gold, prior.gold - price)
  assert.equal(state.heart, prior.heart + heart)
  assert.equal(state.items.filter(id => id === item).length, 1)
  assert.equal(p(state).nodeId, 'lf_night1_end')
  assert.equal(p(state).phase, 'settle')
  assert.equal(act(state, 'buy', { item }), state, 'a held item cannot charge twice')
  assert.deepEqual(reload(state), copy(state))
  assert.deepEqual(awards(state), awards(before))
}

// Record review and returning through the story shelf preserve the paused cursor.
const purchased = copy(state)
state = act(state, 'lab:open', { round: 5 })
assert.equal(p(state).labReturn, 'lf_night1_end')
assert.equal(act(state, 'part:next'), state, 'reviewing a record cannot advance the day')
state = act(reload(state), 'lab:close')
assert.equal(p(state).nodeId, 'lf_night1_end')
assert.equal(p(state).phase, 'settle')
assert.deepEqual(stats(state), stats(purchased))
assert.deepEqual(awards(state), awards(purchased))
state = openLdctShelf(state)
assert.equal(p(state), undefined)
state = selectLdctStory(reload(state), 'father')
assert.equal(p(state).nodeId, 'lf_night1_end')
assert.equal(p(state).phase, 'settle')
assert.deepEqual(state.items, purchased.items)

// Only the explicit continuation enters tomorrow, saving the new delta baseline atomically.
const dayTwoStart = stats(state), runStart = copy(p(state).start)
state = act(state, 'part:next')
assert.equal(p(state).nodeId, 'lf_wait_consult')
assert.equal(p(state).phase, 'story')
assert.deepEqual(p(state).partStart, dayTwoStart)
assert.deepEqual(p(state).start, runStart, 'the final summary keeps its whole-run baseline')
assert.deepEqual(stats(state), dayTwoStart)
assert.deepEqual(awards(state), awards(purchased))
assert.equal(act(state, 'part:next'), state, 'a duplicate click cannot skip the next-day scene')
state = reload(state)
assert.deepEqual(p(state).partStart, dayTwoStart)
assert.equal(p(state).nodeId, 'lf_wait_consult')
const fined = act(at(state, 'lf_caught_choice'), 'choose', { nodeId: 'lf_caught_choice', choiceId: 'pay' })
assert.equal(fined.gold - p(fined).partStart.gold, -200, 'day two delta includes its own fine')
assert.equal(fined.gold - p(fined).start.gold, -440, 'whole-run delta still includes yesterday’s purchases')
assert.deepEqual(p(reload(fined)).partStart, dayTwoStart)
assert.deepEqual(protectedState(fined), protectedState(base))

// Old v5/v4 graphs have no settlement config and retain their published destinations.
for (const [openingRevision, next] of [[5, 'lf_scan_0'], [4, 'lf_evening2']]) {
  const legacy = at(copy(base), 'lf_night1_end', { phase: 'settle', phantomPreparation: undefined, openingRevision })
  assert.equal(getLdctNode(legacy).settlement, undefined)
  assert.equal(getLdctNode(legacy).timeLabel, undefined, 'new graph labels cannot leak into a legacy node')
  const continued = act(reload(legacy), 'part:next')
  assert.equal(p(continued).nodeId, next)
  assert.equal(act(continued, 'part:next'), continued)
  assert.deepEqual(stats(continued), stats(legacy))
  assert.deepEqual(p(continued).partStart, stats(legacy))
}
for (const nodeId of ['lf_wait_consult', 'lf_consult_0', 'lf_consult_1', 'lf_consult_2']) {
  const old = at(copy(base), nodeId, { phantomPreparation: undefined })
  const oldNode = getLdctNode(old)
  const loaded = reload(old)
  assert.equal(p(loaded).phantomPreparation, undefined, 'an old consultation must still lead to its unplayed trial')
  assert.equal(p(loaded).nodeId, nodeId)
  assert.deepEqual(getLdctNode(loaded), oldNode)
  assert.equal(oldNode.timeLabel, undefined, 'new chronological labels are isolated to the new graph')
  assert.deepEqual(stats(loaded), stats(old))
}
// Already-upgraded early saves reached consultation on night one, before any trial.
// Keep the current line and old handoff instead of silently skipping all five tools.
const newConsultNodes = copy(Object.fromEntries(['lf_wait_consult', 'lf_consult_0', 'lf_consult_1', 'lf_consult_2', 'lf_night1_end']
  .map(id => [id, steps[id]])))
for (const nodeId of ['lf_wait_consult', 'lf_consult_0', 'lf_consult_1', 'lf_consult_2']) {
  const old = at(copy(base), nodeId, { decisions: { father_tone: 'listen' }, receipts: ['media:previously-heard'] })
  getLdctShelf(old).receipts = ['reward:comparison', 'reward:records']
  getLdctShelf(old).experienced = [1, 2, 3, 4, 5]
  old.badges = ['ldct_first_comparison']
  let loaded = reload(old)
  assert.equal(p(loaded).nodeId, nodeId)
  assert.deepEqual(copy(p(loaded)), { ...copy(p(old)), consultationBeforeTrial: 1 }, 'migration adds only the narrow order marker')
  assert.deepEqual(reload(loaded), copy(loaded), 'the early-save marker is idempotent')
  assert.equal(getLdctNode(loaded).timeLabel, '第一天 · 晚上')
  assert.deepEqual(stats(loaded), stats(old))
  assert.deepEqual(awards(loaded), awards(old), 'past learning rewards remain paid')
  for (let count = 0; p(loaded).nodeId !== 'lf_plan_0' && count < 4; count++) {
    loaded = act(loaded, 'advance', { nodeId: p(loaded).nodeId })
    loaded = reload(loaded)
  }
  assert.equal(p(loaded).nodeId, 'lf_plan_0', 'consultation hands off to the still-unplayed phantom trial')
  assert.deepEqual(p(loaded).decisions, p(old).decisions)
  assert.deepEqual(p(loaded).receipts, p(old).receipts)
  loaded = act(at(loaded, 'lf_phantom_ready_2', { records: { 5: record } }), 'advance', { nodeId: 'lf_phantom_ready_2' })
  loaded = reload(loaded)
  assert.equal(p(loaded).nodeId, 'lf_night1_end')
  assert.equal(getLdctNode(loaded).settlement.next, 'lf_scan_0', 'an already-completed consultation does not play twice')
  assert.match(getLdctNode(loaded).text, /明早陪陆叔按约检查/)
  assert.equal(act(loaded, 'advance', { nodeId: 'lf_night1_end' }), loaded)
  loaded = act(loaded, 'part:next')
  assert.equal(p(loaded).nodeId, 'lf_scan_0')
  assert.deepEqual(stats(loaded), stats(old))
  assert.deepEqual(awards(loaded), awards(old))
  assert.deepEqual(protectedState(loaded), protectedState(old))
  const replayed = selectLdctStory(loaded, 'father', true)
  assert.equal(p(replayed).consultationBeforeTrial, undefined, 'a new run uses the new chronology')
  assert.deepEqual(awards(replayed), awards(old))
}
assert.deepEqual(copy(Object.fromEntries(Object.keys(newConsultNodes).map(id => [id, steps[id]]))), newConsultNodes,
  'legacy consultation resolution never edits shared story data')
for (const fields of [
  { records: { 1: record, 2: record, 3: record, 4: record, 5: record } },
  { partStart: stats(base) }, { labReturn: 'lf_night1_end' }, { finished: true },
]) {
  const current = at(copy(base), 'lf_consult_2', fields)
  const loaded = reload(current)
  assert.equal(p(loaded).consultationBeforeTrial, undefined, 'new or already-progressed consultations do not adopt the old order')
  assert.equal(getLdctNode(loaded).next, 'lf_scan_0')
}
for (const [nodeId, fields] of [
  ['lf_scan_0', {}], ['lf_patient_result', {}], ['lf_evening2', { phantomPreparation: undefined }],
  ['lf_end', { phase: 'settle', finished: true }],
]) {
  const old = at(copy(base), nodeId, fields)
  const loaded = reload(old)
  assert.equal(p(loaded).nodeId, nodeId, 'later saves never rewind to dinner or first-day settlement')
  assert.equal(act(loaded, 'part:next'), loaded)
  assert.deepEqual(stats(loaded), stats(old))
  assert.deepEqual(awards(loaded), awards(old))
}
const fakeSettlement = at(copy(base), 'lf_start', { phase: 'settle' })
assert.equal(act(fakeSettlement, 'part:next'), fakeSettlement, 'phase alone cannot authorize a day transition')
console.log('PASS dinner settlement: one evening pause, explicit next-day consultation, shop/reload/review/shelf persistence, daily baseline, no extra rewards, v5/v4 fallback and later-save isolation.')
