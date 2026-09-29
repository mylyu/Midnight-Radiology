// Bounded save/transaction fixtures; no browser, build or full chapter replay.
// Run from app/: node --import tsx tests/ldct-phantom-session.mjs
import assert from 'node:assert/strict'
import { freshState } from '../src/game/store.ts'
import { getLdctNode, getLdctSteps } from '../src/game/ldct.ts'
import { selectLdctStory, initializeLdct, getLdctProgress, getLdctShelf,
  getLdctLabDataset, ldctGiftChoices, ldctAction } from '../src/game/ldct-session.ts'
import { createLdctLabState, createLdctPhantomPreparationState, createLdctRecord } from '../src/game/ldct-experiments.ts'
import { LDCT_PHANTOM_EXPOSURE_VERSION, LDCT_PHANTOM_IR_VERSION,
  ldctPhantomIterationFrame, ldctPhantomExposureFrame } from '../src/game/ldct-phantom-exposure.ts'

const copy = value => JSON.parse(JSON.stringify(value))
const p = getLdctProgress
const act = (state, type, fields = {}) => ldctAction(state, { type, ...fields })
const stats = state => ({ gold: state.gold, skill: state.skill, heart: state.heart, wealth: state.wealth,
  items: state.items, badges: state.badges })
const base = selectLdctStory({ ...freshState('m'), gold: 900, skill: 11, heart: 7, wealth: 4,
  items: [], flags: { quiz_grade: 'A', archive_film: true }, night: 4, ap: 2,
  dlc: { ch2: { done: true, certificate: { code: 'KEEP-CH2' } }, dr: { done: true }, dsa: { dose: 56 } } }, 'father')
const protectedState = state => ({ flags: state.flags, ch2: state.dlc.ch2, dr: state.dlc.dr,
  dsa: state.dlc.dsa, night: state.night, ap: state.ap })
function at(state, nodeId, fields = {}) {
  const progress = { ...p(state), nodeId, phase: 'story', reply: undefined, ...fields }
  return { ...state, dlc: { ...state.dlc, ldct: { ...state.dlc.ldct, ldct: progress,
    ldctStories: { ...getLdctShelf(state), active: 'father', slots: { ...getLdctShelf(state).slots, father: progress } } } } }
}
const reload = state => initializeLdct(copy(state))

// Only safe early v5 saves adopt the reordered preparation, without moving their cursor.
assert.equal(p(base).phantomPreparation, 1)
for (const nodeId of ['lf_start', 'lf_arrive_1', 'lf_plan_2', 'lf_phantom_scan']) {
  const old = at(copy(base), nodeId, { phantomPreparation: undefined, decisions: { chat: 'kept' } })
  const migrated = reload(old)
  assert.equal(p(migrated).nodeId, nodeId)
  assert.equal(p(migrated).phantomPreparation, 1)
  assert.deepEqual(p(migrated).decisions, { chat: 'kept' })
  assert.deepEqual(stats(migrated), stats(old))
  assert.deepEqual(reload(migrated), migrated)
}
for (const [nodeId, fields] of [
  ['lf_lab_1', { phase: 'lab' }], ['lf_first_fbp', {}], ['lf_evening2', {}],
  ['lf_end', { phase: 'settle', finished: true }], ['lf_plan_2', { openingRevision: 4 }],
]) {
  const old = at(copy(base), nodeId, { phantomPreparation: undefined, ...fields })
  assert.deepEqual(reload(old), copy(old), `${nodeId}: published later/frozen progress does not rewind`)
}
const oldDayTwo = at(copy(base), 'lf_first_fbp', { phantomPreparation: undefined })
assert.equal(getLdctSteps(p(oldDayTwo)).lf_lab_4.labDataset, 'chest')
assert.equal(getLdctSteps(p(base)).lf_lab_4.labDataset, 'phantom')
const oldSnapshot = copy(p(oldDayTwo))
const restarted = selectLdctStory(oldDayTwo, 'father', true)
assert.equal(p(restarted).nodeId, 'lf_start')
assert.equal(p(restarted).phantomPreparation, 1)
assert.equal(p(restarted).run, oldSnapshot.run + 1)
assert.deepEqual(copy(getLdctShelf(restarted).previousFather), oldSnapshot)
assert.deepEqual(stats(restarted), stats(oldDayTwo))
assert.deepEqual(getLdctShelf(reload(restarted)).previousFather, oldSnapshot)

// Entering the actual node creates the correct input, rather than relabelling chest drafts.
let exposure = act(at(copy(base), 'lf_photons_intro_1'), 'advance', { nodeId: 'lf_photons_intro_1' })
assert.equal(p(exposure).nodeId, 'lf_lab_4')
assert.deepEqual(p(exposure).labDraft, createLdctPhantomPreparationState(4))
assert.equal(getLdctLabDataset(exposure), 'phantom')
for (const value of [createLdctLabState(4, 'chest'), createLdctLabState(4, 'phantom'),
  { ...p(exposure).labDraft, phantomDataVersion: undefined }]) {
  assert.equal(act(exposure, 'lab:update', { value }), exposure, 'updates cannot switch an input identity')
}
exposure = act(exposure, 'lab:update', { value: { ...p(exposure).labDraft, exposureCount: 3 } })
const helpedRecord = createLdctRecord({ ...p(exposure).labDraft, helped: true }, 4, 'uncertain', 'phantom')
const beforeHelp = stats(exposure)
exposure = act(exposure, 'lab:submit', { record: helpedRecord })
assert.equal(p(exposure).nodeId, 'lf_photons_done_0')
assert.equal(p(exposure).records[4].exposureCount, 3, 'helper demonstration never fabricates the player click count')
assert.equal(p(exposure).records[4].helped, true)
assert.equal(p(exposure).decisions.phantom_exposure_demo, 'completed13', 'Lu explicitly completes the shared IR input')
assert.match(getLdctNode(exposure).text, /陆舟|补|接/)
assert.equal(exposure.skill, beforeHelp.skill + 1)
assert.equal(act(exposure, 'lab:submit', { record: helpedRecord }), exposure)
assert.deepEqual(reload(exposure), copy(exposure), 'receipt and demonstration survive one atomic save')

// IR always starts from the fixed thirteenth exposure, not the helper record's third frame.
let iteration = act(at(exposure, 'lf_phantom_iteration_1'), 'advance', { nodeId: 'lf_phantom_iteration_1' })
assert.deepEqual(p(iteration).labDraft, createLdctPhantomPreparationState(5))
assert.equal(p(iteration).labDraft.chest, undefined)
assert.equal(p(iteration).labDraft.phantomDataVersion, LDCT_PHANTOM_EXPOSURE_VERSION)
assert.equal(ldctPhantomExposureFrame('fbp', 12).column, 12)
assert.deepEqual(ldctPhantomIterationFrame('fbp'), ldctPhantomIterationFrame('iteration:0'))
iteration = act(iteration, 'lab:update', { value: { ...p(iteration).labDraft, iterationRound: 8 } })
assert.deepEqual(p(reload(iteration)).labDraft, p(iteration).labDraft)
const paused = act(iteration, 'lab:close')
iteration = act(paused, 'advance', { nodeId: 'lf_lab_5' })
assert.equal(p(iteration).labDraft.iterationRound, 8, 'reopening preserves manual iteration progress')
// Pretend the other three tool records have already been saved: only the final shared reward is pending.
iteration.dlc.ldct.ldctStories.experienced = [1, 2, 3, 4]
iteration = act(iteration, 'lab:update', { value: { ...p(iteration).labDraft, iterationRound: 10 } })
const record = createLdctRecord(p(iteration).labDraft, 5, 'different', 'phantom')
assert.equal(record.sourceVersion, LDCT_PHANTOM_IR_VERSION)
const beforeIR = stats(iteration)
iteration = act(iteration, 'lab:submit', { record })
assert.equal(p(iteration).nodeId, 'lf_phantom_ready_0')
assert.equal(iteration.wealth, beforeIR.wealth + 1)
assert.equal(iteration.skill, beforeIR.skill, 'comparing another image cannot repeat the first-comparison reward')
assert.equal(act(iteration, 'lab:submit', { record }), iteration)
assert.deepEqual(reload(iteration), copy(iteration))
const settled = at(iteration, 'lf_night1_end', { phase: 'settle' })
const reviewed = act(settled, 'lab:open', { round: 5 })
assert.equal(getLdctLabDataset(reviewed), 'phantom')
assert.equal(p(reviewed).labDraft.phantomDataVersion, LDCT_PHANTOM_EXPOSURE_VERSION)
assert.deepEqual(stats(act(reviewed, 'lab:submit', { record })), stats(settled), 'archived IR review cannot re-award')

// Snack and milk-tea transactions keep their established, different reward times.
for (const [item, price, buyGain, giftGain] of [['snack', 40, 0, 1], ['milktea', 200, 2, 0]]) {
  let state = at(copy(base), 'lf_rest_hub')
  state = act(state, 'buy', { item })
  assert.equal(state.gold, base.gold - price)
  assert.equal(state.heart, base.heart + buyGain)
  assert(state.items.includes(item))
  assert.equal(act(state, 'buy', { item }), state)
  state = act(state, 'choose', { nodeId: 'lf_rest_hub', choiceId: 'lu' })
  assert(ldctGiftChoices(state).some(g => g.item === item && g.person === 'luzhou'))
  const gift = { nodeId: p(state).nodeId, person: 'luzhou', item }
  state = act(state, 'gift', gift)
  assert.equal(state.heart, base.heart + buyGain + giftGain)
  assert.equal(state.items.includes(item), false)
  assert.equal(p(state).gifts.length, 1)
  assert.equal(act(state, 'gift', gift), state)
  assert.deepEqual(reload(state), copy(state))
  assert.equal(ldctGiftChoices(state).length, 0)
  assert.deepEqual(protectedState(state), protectedState(base))
}
assert.deepEqual(protectedState(iteration), protectedState(base))
console.log('PASS: phantom session migration, genuine helper counts, fixed IR input, refresh/receipts, records and gift isolation.')
