// Focused second-context transactions; no browser/build or historical chapter replay.
// Run from app/: node --import tsx tests/ldct-patient-iteration.mjs
import assert from 'node:assert/strict'
import { freshState } from '../src/game/store.ts'
import { getLdctNode, getLdctSteps } from '../src/game/ldct.ts'
import { initializeLdct, selectLdctStory, getLdctProgress, getLdctShelf,
  getLdctLabDataset, ldctAction } from '../src/game/ldct-session.ts'
import { createLdctLabState, createLdctPhantomPreparationState, createLdctRecord,
  ldctExperimentReady } from '../src/game/ldct-experiments.ts'
import { LDCT_NOISY_DATA_VERSION, LDCT_NOISY_CHEST_VERSION } from '../src/game/ldct-noisy-chest.ts'
import { LDCT_PHANTOM_IR_VERSION } from '../src/game/ldct-phantom-exposure.ts'
import { getLdctSpeedKind } from '../src/game/ldct-speed-challenge.ts'

const copy = value => JSON.parse(JSON.stringify(value))
const p = getLdctProgress
const act = (state, type, fields = {}) => ldctAction(state, { type, ...fields })
const reload = state => initializeLdct(copy(state))
const stats = state => ({ gold: state.gold, skill: state.skill, heart: state.heart, wealth: state.wealth, badges: state.badges })
const learning = state => ({ receipts: getLdctShelf(state).receipts, experienced: getLdctShelf(state).experienced })
const protectedState = state => ({ flags: state.flags, ch2: state.dlc.ch2, dr: state.dlc.dr,
  dsa: state.dlc.dsa, night: state.night, ap: state.ap })
const base = selectLdctStory({ ...freshState('m'), gold: 900, skill: 12, heart: 7, wealth: 4,
  flags: { keep_main: true }, night: 4, ap: 2,
  dlc: { ch2: { done: true, certificate: { code: 'KEEP-CHEST' } }, dr: { done: true }, dsa: { dose: 56 } } }, 'father')
function at(state, nodeId, fields = {}) {
  const progress = { ...p(state), nodeId, phase: 'story', reply: undefined, ...fields }
  return { ...state, dlc: { ...state.dlc, ldct: { ...state.dlc.ldct, ldct: progress,
    ldctStories: { ...getLdctShelf(state), active: 'father', slots: { ...getLdctShelf(state).slots, father: progress } } } } }
}
function enter(state) {
  return act(at(state, 'lf_patient_lab'), 'advance', { nodeId: 'lf_patient_lab' })
}
const phantomDraft = { ...createLdctPhantomPreparationState(5), iterationRound: 12 }
const phantomRecord = createLdctRecord(phantomDraft, 5, 'different', 'phantom')
const completedPhantom = at(copy(base), 'lf_iteration_intro_1', {
  labRound: 5, labDraft: phantomDraft, records: { 5: phantomRecord },
  completed: ['father_projection_authorized'],
  speedChallenges: { iteration: { nodeId: 'lf_lab_5', attempt: 1, status: 'won', startedAt: 1000,
    deadline: 11000, acceptedTaps: 12, progress: 12 } },
})
const node = getLdctSteps(p(base)).lf_patient_lab
assert.equal(node.enterLab, 5)
assert.equal(node.labDataset, 'chest')
assert.equal(node.labContext, 'patient')

// Same round number, separate input: completed phantom frames must not skip the patient's work.
let state = enter(completedPhantom)
assert.equal(p(state).phase, 'lab')
assert.equal(p(state).labContext, 'patient')
assert.equal(getLdctLabDataset(state), 'chest')
assert.deepEqual(p(state).labDraft, createLdctLabState(5, 'chest'))
assert.equal(p(state).labDraft.chestDataVersion, LDCT_NOISY_DATA_VERSION)
assert.equal(p(state).labDraft.iterationRound, 0)
assert.equal(p(state).labDraft.phantomDataVersion, undefined)
assert.equal(ldctExperimentReady(p(state).labDraft, 5), false)
assert.deepEqual(p(state).records[5], phantomRecord)
assert.equal(getLdctSpeedKind(p(state)), undefined, 'patient follow-up is ordinary manual iteration')
assert.equal(act(state, 'challenge:start', { nodeId: 'lf_patient_lab', now: 20000 }), state)
assert.deepEqual(p(state).speedChallenges, p(completedPhantom).speedChallenges)
assert.equal(act(state, 'lab:update', { value: phantomDraft }), state, 'phantom data cannot overwrite chest input')
assert.equal(act(state, 'lab:submit', { record: phantomRecord }), state)
const initial = copy(state), beforeStats = stats(state), beforeLearning = learning(state)
for (let round = 1; round <= 12; round++) {
  const value = { ...p(state).labDraft, iterationRound: round }
  state = act(state, 'lab:update', { value })
  assert.equal(p(state).labDraft.iterationRound, round)
  assert.deepEqual(p(state).patientIteration.draft, value)
  state = reload(state)
  assert.deepEqual(p(state).labDraft, value, `patient iteration ${round} survives refresh`)
  assert.deepEqual(p(state).records[5], phantomRecord)
  assert.deepEqual(stats(state), beforeStats)
  assert.deepEqual(learning(state), beforeLearning)
  if (round === 6) {
    state = act(state, 'lab:close')
    assert.equal(p(state).nodeId, 'lf_patient_lab')
    assert.equal(p(state).phase, 'story')
    state = reload(state)
    state = act(state, 'advance', { nodeId: 'lf_patient_lab' })
    assert.equal(p(state).phase, 'lab')
    assert.equal(p(state).labContext, 'patient')
    assert.equal(p(state).labDraft.iterationRound, 6)
    assert.equal(getLdctLabDataset(state), 'chest')
  }
}
assert.equal(ldctExperimentReady(p(state).labDraft, 5), true)
state = act(state, 'lab:update', { value: { ...p(state).labDraft,
  chest: { ...p(state).labDraft.chest, pinned: { slice: 1, iterationStep: 0, iterationRound: 6 },
    mark: { x: 32, y: 60, slice: 1, iterationStep: 0, iterationRound: 12, method: 'iteration' } } } })
const record = createLdctRecord(p(state).labDraft, 5, 'different', 'chest')
assert.equal(record.sourceVersion, LDCT_NOISY_CHEST_VERSION)
assert.equal(record.iterationRound, 12)
state = act(state, 'lab:submit', { record })
assert.equal(p(state).nodeId, 'lf_after_iteration_0')
assert.equal(p(state).phase, 'story')
assert.deepEqual(p(state).patientIteration.record, record)
assert.deepEqual(p(state).records[5], phantomRecord)
assert.equal(p(state).records[5].sourceVersion, LDCT_PHANTOM_IR_VERSION)
assert.deepEqual(stats(state), beforeStats, 'second context never adds another learning reward')
assert.deepEqual(learning(state), beforeLearning, 'patient work cannot fill a missing shared lesson receipt')
assert.equal(act(state, 'lab:submit', { record }), state)
assert.deepEqual(reload(state), copy(state))
assert.deepEqual(protectedState(state), protectedState(base))
assert.match(getLdctNode(at(state, 'lf_record_echo')).text, /固定.*存疑标记/, 'the later dialogue reads the patient pin and mark')

// Help records the actual patient frame without inventing completed clicks or shared lessons.
const helpRecord = createLdctRecord({ ...p(initial).labDraft, helped: true }, 5, 'uncertain', 'chest')
const helped = act(initial, 'lab:submit', { record: helpRecord })
assert.equal(p(helped).nodeId, 'lf_after_iteration_0')
assert.equal(p(helped).patientIteration.record.iterationRound, 0)
assert.equal(p(helped).patientIteration.record.helped, true)
assert.deepEqual(p(helped).records[5], phantomRecord)
assert.deepEqual(stats(helped), beforeStats)
assert.deepEqual(learning(helped), beforeLearning)
assert.doesNotMatch(getLdctNode(at(helped, 'lf_record_echo')).text, /你固定|存疑标记/, 'unmarked patient work does not fabricate observations')

// Both records stay individually reviewable. Review edits cannot replace the phantom archive.
const ending = Object.values(getLdctSteps(p(state))).find(step => step.next === 'lf_end')
assert(ending)
const settled = act(at(state, ending.id), 'advance', { nodeId: ending.id })
assert.equal(p(settled).phase, 'settle')
assert.equal(p(settled).finished, true)
let reviewed = act(settled, 'lab:open', { round: 5, context: 'patient' })
assert.equal(p(reviewed).labContext, 'patient')
assert.equal(p(reviewed).labReturn, 'lf_end')
assert.equal(getLdctLabDataset(reviewed), 'chest')
assert.equal(p(reviewed).labDraft.iterationRound, 12)
assert.deepEqual(p(reload(reviewed)).labDraft, copy(p(reviewed).labDraft))
const reviewRecord = createLdctRecord(p(reviewed).labDraft, 5, 'different', 'chest')
reviewed = act(reviewed, 'lab:submit', { record: reviewRecord })
assert.equal(p(reviewed).nodeId, 'lf_end')
assert.equal(p(reviewed).phase, 'settle')
assert.deepEqual(stats(reviewed), stats(settled))
assert.deepEqual(learning(reviewed), learning(settled))
assert.deepEqual(p(reviewed).records[5], phantomRecord)
reviewed = act(reviewed, 'lab:open', { round: 5 })
assert.equal(p(reviewed).labContext, undefined)
assert.equal(getLdctLabDataset(reviewed), 'phantom')
assert.equal(p(reviewed).labDraft.phantomDataVersion, phantomDraft.phantomDataVersion)
assert.deepEqual(p(reviewed).patientIteration.record, record)
reviewed = act(reviewed, 'lab:close')
assert.equal(p(reviewed).nodeId, 'lf_end')
assert.deepEqual(p(reviewed).records[5], phantomRecord)
assert.deepEqual(p(reviewed).patientIteration.record, record)
assert.equal(act(settled, 'lab:open', { round: 4, context: 'patient' }), settled, 'patient context is only the chest IR experiment')
const noPatientRecord = at(copy(base), 'lf_end', { phase: 'settle', finished: true })
assert.equal(act(noPatientRecord, 'lab:open', { round: 5, context: 'patient' }), noPatientRecord)

// A completed/legacy save does not acquire a fabricated patient record during load.
for (const fields of [{ phantomPreparation: 1 }, { phantomPreparation: undefined },
  { phantomPreparation: undefined, openingRevision: 4 }]) {
  const old = at(copy(base), 'lf_end', { ...fields, phase: 'settle', finished: true,
    records: { 5: phantomRecord }, patientIteration: undefined, labContext: undefined })
  const loaded = reload(old)
  assert.equal(p(loaded).nodeId, 'lf_end')
  assert.equal(p(loaded).patientIteration, undefined)
  assert.deepEqual(p(loaded).records, p(old).records)
  assert.deepEqual(stats(loaded), stats(old))
}
const oldResult = at(copy(base), 'lf_patient_result', { records: { 5: phantomRecord } })
const loadedResult = reload(oldResult)
assert.equal(p(loadedResult).nodeId, 'lf_patient_result')
assert.equal(p(loadedResult).patientIteration, undefined)
assert.equal(p(act(loadedResult, 'advance', { nodeId: 'lf_patient_result' })).nodeId, 'lf_after_iteration_0',
  'published result cursors continue forward without forcing a new experiment')
const legacyRecord = createLdctRecord({ ...createLdctLabState(5, 'chest'), iterationRound: 10 }, 5, 'different', 'chest')
let legacy = at(copy(base), 'lf_end', { phantomPreparation: undefined, phase: 'settle', finished: true,
  records: { 5: legacyRecord }, patientIteration: undefined })
assert.equal(getLdctSteps(p(legacy)).lf_patient_lab, undefined, 'old v5 route retains its original one-context graph')
legacy = act(reload(legacy), 'lab:open', { round: 5 })
assert.equal(getLdctLabDataset(legacy), 'chest')
assert.equal(p(legacy).labContext, undefined)
assert.equal(p(legacy).labDraft.iterationRound, 10)
assert.equal(p(legacy).patientIteration, undefined)

const savedProgress = copy(p(settled))
const archivedLegacy = copy(p(legacy))
getLdctShelf(settled).previousFather = archivedLegacy
const replayed = selectLdctStory(settled, 'father', true)
assert.equal(p(replayed).nodeId, 'lf_start')
assert.equal(p(replayed).run, savedProgress.run + 1)
assert.equal(p(replayed).patientIteration, undefined)
assert.deepEqual(p(replayed).records, {})
assert.deepEqual(copy(getLdctShelf(replayed).previousFather), archivedLegacy)
assert.deepEqual(learning(replayed), learning(settled))
assert.deepEqual(stats(replayed), stats(settled))
const replayEntry = enter(replayed)
assert.equal(p(replayEntry).labDraft.iterationRound, 0)
assert.equal(p(replayEntry).labContext, 'patient')
assert.deepEqual(copy(getLdctShelf(replayEntry).previousFather), archivedLegacy)
assert.equal(getLdctNode(replayEntry).id, 'lf_patient_lab')
console.log('PASS patient iteration: separate 0–12 chest run, refresh/close/help, phantom preservation, zero shared reward mutation, independent reviews, replay and legacy saves.')
