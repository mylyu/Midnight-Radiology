// Current dense experiments and historical saves, without replaying unrelated chapters.
// Run: node --import tsx tests/ldct-cinematic.mjs
import assert from 'node:assert/strict'
import { freshState } from '../src/game/store.ts'
import { createLdctLabState, createLdctRecord, isValidLdctRecord, labStateValid,
  ldctExperimentReady, ldctRecordSummary } from '../src/game/ldct-experiments.ts'
import { initializeLdct, selectLdctStory, getLdctProgress, getLdctShelf, ldctAction } from '../src/game/ldct-session.ts'
import { LDCT_EXPOSURE_VERSION, ldctExposureFrame } from '../src/game/ldct-exposure.ts'
import { LDCT_CHEST_VERSION, ldctChestFrame } from '../src/game/ldct-chest.ts'
import { LDCT_DEEP_EXPOSURE_VERSION, LDCT_DEEP_CHEST_VERSION, LDCT_DEEP_EXPOSURE_LEVELS,
  LDCT_DEEP_ITERATIONS, ldctDeepExposureFrame, ldctDeepChestFrame } from '../src/game/ldct-deep-experiments.ts'
import { ldctSceneCue, LDCT_PRESENTATION_AUDIO } from '../src/game/ldct-presentation.ts'
import { getLdctCinematic, LDCT_CINEMATIC_MEDIA_IDS } from '../src/game/ldct-cinematics.ts'

const clone = value => JSON.parse(JSON.stringify(value))
const p = getLdctProgress
const act = (state, type, fields = {}) => ldctAction(state, { type, ...fields })
const stats = state => ({ gold: state.gold, skill: state.skill, heart: state.heart, wealth: state.wealth, badges: state.badges })
const base = { ...freshState('m'), gold: 900, skill: 7, heart: 8, wealth: 3,
  flags: { cinematic_main_flag: true }, dlc: { ch2: { done: true, certificate: { code: 'KEEP' } }, dsa: { dose: 77 } } }
function fixture(round, draft = createLdctLabState(round, 'chest')) {
  const state = selectLdctStory(clone(base), 'father')
  const progress = { ...p(state), nodeId: `lf_lab_${round}`, phase: 'lab', labRound: round, labDraft: draft }
  state.dlc.ldct.ldct = progress
  state.dlc.ldct.ldctStories.slots.father = progress
  state.dlc.ldct.ldctStories.receipts = ['reward:comparison']
  state.dlc.ldct.ldctStories.experienced = [1, 2, 3]
  return state
}
function protectedState(state) {
  assert.deepEqual(state.flags, base.flags)
  assert.deepEqual(state.dlc.ch2, base.dlc.ch2)
  assert.deepEqual(state.dlc.dsa, base.dlc.dsa)
}

const exposureInitial = createLdctLabState(4, 'chest')
const iterationInitial = createLdctLabState(5, 'chest')
assert.equal(exposureInitial.exposureCount, 1)
assert.equal(iterationInitial.iterationRound, 0)
assert.equal(ldctExperimentReady(exposureInitial, 4), false)
assert.equal(ldctExperimentReady(iterationInitial, 5), false)
assert.deepEqual(LDCT_DEEP_EXPOSURE_LEVELS, Array.from({ length: 13 }, (_, index) => index + 1))
assert.deepEqual(LDCT_DEEP_ITERATIONS, Array.from({ length: 13 }, (_, index) => index))
for (let step = 0; step < 13; step++) {
  for (const kind of ['fbp', 'sinogram']) {
    const frame = ldctDeepExposureFrame(kind, step)
    assert.equal(frame.row, kind === 'fbp' ? 0 : 1)
    assert(frame.column >= 0 && frame.column < frame.columns)
    if (step < 4) assert.deepEqual(frame, ldctExposureFrame(kind, step), 'the four original exposure frames retain their exact atlas locations')
  }
  for (const slice of [0, 1, 2]) {
    const frame = ldctDeepChestFrame(`iteration:${step}`, slice)
    assert.equal(frame.row, slice)
    assert(frame.column >= 0 && frame.column < frame.columns)
    if ([0, 1, 2, 4, 8].includes(step)) assert.deepEqual(frame, ldctChestFrame(`iteration:${step}`, slice), 'original iteration frames retain their exact atlas locations')
  }
}
for (const step of [-1, 13, .5]) assert.throws(() => ldctDeepExposureFrame('fbp', step))
for (const key of ['iteration:-1', 'iteration:13', 'iteration:1.5', 'iteration:01', 'forward:3', 'residual:3'])
  assert.throws(() => ldctDeepChestFrame(key), 'unsupported prediction/residual frames cannot silently substitute nearby rounds')

for (const [round, field, start, end, threshold, nextNode] of [
  [4, 'exposureCount', 1, 13, 11, 'lf_photons_done_0'],
  [5, 'iterationRound', 0, 12, 10, 'lf_after_iteration_0'],
]) {
  const initial = createLdctLabState(round, 'chest')
  for (let value = start; value <= end; value++) {
    const draft = { ...initial, [field]: value }
    assert(labStateValid(draft, round), `${field} ${value}: valid checkpoint`)
    assert.equal(ldctExperimentReady(draft, round), value >= threshold, `${field}: ten manual additions unlock normal continuation`)
    let state = act(fixture(round), 'lab:update', { value: draft })
    assert.deepEqual(p(initializeLdct(clone(state))).labDraft, draft, `${field} ${value}: refresh preserves checkpoint`)
    const direct = createLdctRecord(draft, round, 'different', 'chest')
    if (value < threshold) assert.equal(direct, null, `${field} ${value}: normal continuation is not ready`)
    else assert(direct, `${field} ${value}: normal continuation is ready`)
    const helped = value < threshold
    const record = direct ?? createLdctRecord({ ...draft, helped: true }, round, 'uncertain', 'chest')
    assert(isValidLdctRecord(record, round), `${field} ${value}: help remains available`)
    assert.equal(record[field], value)
    assert.equal(record.helped, helped)
    assert.equal(record.dataset, 'chest')
    assert.equal(record.sourceVersion, round === 4 ? LDCT_DEEP_EXPOSURE_VERSION : LDCT_DEEP_CHEST_VERSION,
      'new actual counts/rounds have their own source version')
    const before = stats(state)
    state = act(state, 'lab:submit', { record })
    assert.equal(p(state).nodeId, nextNode)
    assert.equal(p(state).records[round][field], value)
    assert.deepEqual(stats(state), before, 'the shared comparison reward cannot be paid again')
    assert.equal(act(state, 'lab:submit', { record }), state, 'duplicate submission is ignored')
    assert.deepEqual(p(initializeLdct(clone(state))).records[round], record)
    protectedState(state)
  }
  for (const value of [start - 1, end + 1, .5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(labStateValid({ ...initial, [field]: value }, round), false, `${field}: reject ${value}`)
    assert.equal(act(fixture(round), 'lab:update', { value: { ...initial, [field]: value } }).dlc.ldct.ldct.labDraft[field], start)
  }
  assert.equal(labStateValid({ ...createLdctLabState(3), [field]: start }, 3), false, `${field}: reject another experiment`)
  const finishedDraft = { ...initial, [field]: end }
  const finishedRecord = createLdctRecord(finishedDraft, round, 'different', 'chest')
  assert.equal(isValidLdctRecord({ ...finishedRecord, [field]: end + 1 }, round), false)
  const wrongDraft = fixture(round)
  assert.equal(act(wrongDraft, 'lab:submit', { record: finishedRecord }), wrongDraft, 'a record cannot bypass the actual saved draft')
  let left = act(fixture(round), 'lab:update', { value: finishedDraft })
  left = act(left, 'lab:close')
  assert.equal(p(left).phase, 'story')
  left = act(left, 'advance', { nodeId: `lf_lab_${round}` })
  assert.equal(p(left).phase, 'lab')
  assert.equal(p(left).labDraft[field], end, 'leaving and reopening keeps the actual count')
  left = act(left, 'lab:update', { value: initial })
  assert.equal(p(left).labDraft[field], start, 'reset returns to the first calculated frame')
  assert.equal(ldctExperimentReady(p(left).labDraft, round), false, 'reset also resets normal readiness')
}

const marked = { ...iterationInitial, iterationRound: 12,
  chest: { ...iterationInitial.chest,
    pinned: { slice: 1, iterationStep: 0, iterationRound: 6 },
    mark: { x: 34, y: 61, slice: 2, iterationStep: 0, iterationRound: 7, method: 'iteration' } } }
const markedRecord = createLdctRecord(marked, 5, 'different', 'chest')
assert(isValidLdctRecord(markedRecord, 5))
assert.equal(markedRecord.chest.pinned.iterationRound, 6)
assert.equal(markedRecord.chest.mark.iterationRound, 7)
assert.notEqual(markedRecord.chest.pinned, marked.chest.pinned, 'record owns a copy of the pin')
assert.notEqual(markedRecord.chest.mark, marked.chest.mark, 'record owns a copy of the mark')
assert.match(ldctRecordSummary(markedRecord), /12轮/)
for (const badRound of [-1, 13, .5]) {
  assert.equal(labStateValid({ ...marked, chest: { ...marked.chest, pinned: { ...marked.chest.pinned, iterationRound: badRound } } }, 5), false)
  assert.equal(labStateValid({ ...marked, chest: { ...marked.chest, mark: { ...marked.chest.mark, iterationRound: badRound } } }, 5), false)
}

// Historical indices preserve their old meaning. Opening a legacy record must
// not inject a new count from createLdctLabState and silently replace its image.
for (const round of [4, 5]) {
  const old = createLdctLabState(round, 'chest')
  delete old.exposureCount
  delete old.iterationRound
  if (round === 4) old.exposureStep = 3
  else Object.assign(old, { iterationStep: 4, seenIterations: [0, 4],
    chest: { ...old.chest, pinned: { slice: 1, iterationStep: 2 },
      mark: { x: 20, y: 40, slice: 1, iterationStep: 3, method: 'iteration' } } })
  assert(labStateValid(old, round))
  assert(ldctExperimentReady(old, round), 'old completed experiments keep their original readiness')
  const record = createLdctRecord(old, round, 'different', 'chest')
  assert(isValidLdctRecord(record, round))
  assert.equal(record.sourceVersion, round === 4 ? LDCT_EXPOSURE_VERSION : LDCT_CHEST_VERSION)
  assert.equal(record.exposureCount, undefined)
  assert.equal(record.iterationRound, undefined)
  const liveLegacy = fixture(round, clone(old))
  const upgraded = initializeLdct(clone(liveLegacy))
  assert.equal(p(upgraded).labDraft[round === 4 ? 'exposureCount' : 'iterationRound'], round === 4 ? 4 : 8,
    'unfinished legacy tools gain more steps from the exact same displayed frame')
  if (round === 5) assert.deepEqual(p(upgraded).labDraft.chest, old.chest, 'extending an active draft preserves old pin/mark indices')
  assert.deepEqual(stats(upgraded), stats(liveLegacy))
  const reviewing = fixture(round, old)
  p(reviewing).labReturn = 'lf_end'
  let state = act(reviewing, 'lab:submit', { record })
  state = initializeLdct(clone(state))
  assert.deepEqual(p(state).records[round], record)
  Object.assign(p(state), { nodeId: 'lf_end', phase: 'settle', finished: true })
  const before = stats(state), returnTo = p(state).nodeId
  state = act(state, 'lab:open', { round })
  assert.equal(p(state).labDraft.exposureCount, undefined)
  assert.equal(p(state).labDraft.iterationRound, undefined)
  assert.equal(p(state).labDraft[round === 4 ? 'exposureStep' : 'iterationStep'], round === 4 ? 3 : 4)
  if (round === 5) assert.deepEqual(p(state).labDraft.chest, old.chest)
  state = act(state, 'lab:submit', { record: createLdctRecord(p(state).labDraft, round, 'different', 'chest') })
  assert.equal(p(state).nodeId, returnTo)
  assert.deepEqual(stats(state), before)
  protectedState(state)
}

assert.deepEqual(LDCT_PRESENTATION_AUDIO, { call: 'audio/ch2_mobile_call_v1.mp3' })
for (const gender of ['m', 'f']) {
  for (const node of ['lf_welcome', 'lf_scan_2', 'lf_chat_he_0', 'lf_arrive_0'])
    assert.equal(ldctSceneCue(node, gender), undefined, `${node}/${gender}: no vocal cue`)
  const call = ldctSceneCue('lf_evening2', gender)
  assert.equal(call.asset, LDCT_PRESENTATION_AUDIO.call)
  assert.equal(call.id, 'call:father-evening2:v1', 'existing ringtone receipt remains stable')
}
assert.deepEqual(getLdctShelf(fixture(4)).receipts, ['reward:comparison'])
assert.equal(LDCT_CINEMATIC_MEDIA_IDS.length, 4)
for (const [node, id] of [['lf_arrive_3', 'meal'], ['lf_plan_2', 'phantom'], ['lf_scan_0', 'father-scan'], ['lf_license_0', 'locked']]) {
  const scene = getLdctCinematic(node)
  assert.equal(scene.id, id)
  assert(LDCT_CINEMATIC_MEDIA_IDS.includes(scene.image))
  assert.equal(Boolean(scene.locked), id === 'locked')
}
assert.equal(getLdctCinematic('lf_plan_2'), getLdctCinematic('lf_phantom_0'), 'adjacent physical-phantom lines share the same scene object')
assert.equal(getLdctCinematic('lf_dinner_2'), undefined, 'unrelated dialogue clears the closeup')
console.log('PASS cinematic state: 13 exposure and 13 iteration checkpoints, ten-click thresholds, help, reset/refresh/review, legacy indices, pins/marks, reward isolation, and phone-only scene audio.')
