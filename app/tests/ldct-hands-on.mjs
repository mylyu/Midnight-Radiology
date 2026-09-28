// One bounded current story route plus focused transactions and v4 compatibility.
// Run: node --import tsx tests/ldct-hands-on.mjs
import assert from 'node:assert/strict'
import { freshState } from '../src/game/store.ts'
import { getLdctChoices, getLdctNode, getLdctSteps } from '../src/game/ldct.ts'
import { getLdctProgress, getLdctShelf, getLdctLabDataset, initializeLdct,
  selectLdctStory, openLdctShelf, ldctAction } from '../src/game/ldct-session.ts'
import { createLdctLabState, createLdctRecord, isValidLdctRecord,
  labStateValid, ldctExperimentReady } from '../src/game/ldct-experiments.ts'
import { LDCT_EXPOSURE_VERSION, LDCT_EXPOSURE_LEVELS, ldctExposureFrame } from '../src/game/ldct-exposure.ts'
import { LDCT_CHEST_VERSION, LDCT_CHEST_SEED } from '../src/game/ldct-chest.ts'
import { LDCT_BP_COUNTS } from '../src/game/ldct-projections.ts'
import { LDCT_MANUAL_BP_COUNTS, ldctManualBpFrame } from '../src/game/ldct-manual-bp.ts'
import { checkLdctPassword } from '../src/game/ldct-access.ts'
import { ldctSceneCue, LDCT_PRESENTATION_AUDIO } from '../src/game/ldct-presentation.ts'

const clone = value => JSON.parse(JSON.stringify(value))
const p = getLdctProgress
const act = (state, type, fields = {}) => ldctAction(state, { type, ...fields })
const stats = state => ({ gold: state.gold, skill: state.skill, heart: state.heart, wealth: state.wealth, badges: state.badges })
const base = { ...freshState('m'), gold: 1400, skill: 13, heart: 9, wealth: 3,
  playerName: '手动曝光隔离测试', playerId: 'LDCT-HANDS-ON', night: 4, ap: 1, buyCount: 12,
  flags: { quiz_grade: 'A', quiz2_grade: 'S', archive_film: true },
  dlc: { ch2: { done: true, certificate: { code: 'YSK2-KEEP' } }, dr: { done: true }, dsa: { dose: 70 } } }
function protectedState(state) {
  const copy = clone(state)
  for (const key of ['gold', 'skill', 'heart', 'wealth', 'items', 'badges']) delete copy[key]
  delete copy.dlc.ldct
  return copy
}
const protectedBase = protectedState(base)
function at(state, nodeId, fields = {}) {
  const progress = { ...p(state), nodeId, phase: 'story', reply: undefined, ...fields }
  return { ...state, dlc: { ...state.dlc, ldct: { ...state.dlc.ldct, ldct: progress,
    ldctStories: { ...getLdctShelf(state), active: 'father', slots: { ...getLdctShelf(state).slots, father: progress } } } } }
}
function operated(round, dataset) {
  const draft = createLdctLabState(round, dataset)
  if (round === 1) Object.assign(draft, { structure: 'bead', seenStructures: ['bead'] })
  if (round === 2) draft.bpCount = 160
  if (round === 3) Object.assign(draft, { filter: 'hann', seenFilters: ['ramp', 'hann'], signal: 'low', seenSignals: ['high', 'low'] })
  if (round === 4 && dataset === 'chest') draft.exposureStep = 3
  else if (round === 4) Object.assign(draft, { signal: 'low', seenSignals: ['high', 'low'] })
  if (round === 5) Object.assign(draft, { iterationStep: 1, seenIterations: [0, 1] })
  return draft
}
function walk(initial) {
  let state = initial
  const route = [], snapshots = new Map()
  for (let count = 0; count < 180; count++) {
    const progress = p(state)
    route.push(progress.nodeId)
    snapshots.set(progress.nodeId, clone(state))
    assert.deepEqual(protectedState(state), protectedBase, `${progress.nodeId}: main chapters and certificates stay isolated`)
    if (progress.finished) return { state, route, snapshots }
    if (progress.phase === 'settle') {
      assert.equal(progress.nodeId, 'lf_night1_end')
      assert.equal(act(state, 'advance', { nodeId: progress.nodeId }), state, 'settlement waits for an explicit next-night action')
      state = act(state, 'part:next')
      assert.equal(act(state, 'part:next'), state, 'next-night action is idempotent')
    } else if (progress.phase === 'lab') {
      const dataset = getLdctLabDataset(state), draft = operated(progress.labRound, dataset)
      state = act(state, 'lab:update', { value: draft })
      assert.deepEqual(p(initializeLdct(clone(state))).labDraft, draft)
      const record = createLdctRecord(draft, progress.labRound, 'different', dataset)
      assert(record, `round ${progress.labRound}: operation creates a record`)
      state = act(state, 'lab:submit', { record })
      assert.equal(act(state, 'lab:submit', { record }), state, 'double-submit never applies a second reward')
      assert.deepEqual(p(state).records[progress.labRound], record)
    } else {
      const node = getLdctNode(state), choices = getLdctChoices(state)
      state = choices.length ? act(state, 'choose', { nodeId: node.id, choiceId: choices[0].id })
        : act(state, 'advance', { nodeId: node.id })
    }
    assert.notEqual(p(state), progress, `${progress.nodeId}: route makes progress`)
    state = initializeLdct(clone(state))
  }
  assert.fail(`route exceeded its bound at ${p(state).nodeId}`)
}

assert.deepEqual(LDCT_BP_COUNTS, [1, 2, 4, 8, 24, 160])
assert.deepEqual(LDCT_MANUAL_BP_COUNTS, [1, 2, 4, ...Array.from({ length: 20 }, (_, index) => (index + 1) * 8)])
for (let index = 0; index < LDCT_MANUAL_BP_COUNTS.length; index++) {
  const count = LDCT_MANUAL_BP_COUNTS[index]
  if (index) assert(count - LDCT_MANUAL_BP_COUNTS[index - 1] <= 8, 'one click adds at most eight directions')
  const draft = { ...createLdctLabState(2), bpCount: count }
  assert(labStateValid(draft, 2))
  assert.equal(ldctExperimentReady(draft, 2), count > 1)
  assert.equal(ldctManualBpFrame(count).column, index % 6)
  assert.equal(ldctManualBpFrame(count).row, Math.floor(index / 6))
  if (count > 1) {
    const record = createLdctRecord(draft, 2, 'different')
    assert(isValidLdctRecord(record, 2))
    assert.equal(record.bpCount, count)
    assert.equal(record.bpStep, 0, 'manual counts never relabel the historical coarse-step index')
  }
}
for (const count of [0, 3, 161, Number.NaN]) assert.equal(labStateValid({ ...createLdctLabState(2), bpCount: count }, 2), false)
assert.deepEqual(LDCT_EXPOSURE_LEVELS, [1, 2, 3, 4])
assert(checkLdctPassword('  LDCT2258  '))
assert(checkLdctPassword('ｌｄｃｔ２２５８'))
assert.equal(checkLdctPassword('ldct2259'), false)
assert.equal(checkLdctPassword('ldct2258extra'), false)
assert.deepEqual(LDCT_PRESENTATION_AUDIO, {
  luzhou_m: 'audio/vox_ldct_luzhou_m_v1.mp3', luzhou_f: 'audio/vox_ldct_luzhou_f_v1.mp3',
  zhou: 'audio/vox_ldct_zhou_v1.mp3', he: 'audio/vox_ldct_he_v1.mp3', call: 'audio/ch2_mobile_call_v1.mp3',
})
assert.equal(ldctSceneCue('lf_arrive_0', 'm'), undefined, 'unapproved father voice remains absent')
assert.equal(ldctSceneCue('lf_welcome', 'f').caption, '你先坐。')
assert.equal(ldctSceneCue('lf_scan_2', 'm').caption, '都坐，别着急。')
assert.equal(ldctSceneCue('lf_chat_he_0', 'm').caption, '这谁的饭呀？')

const selected = selectLdctStory(clone(base), 'father')
assert.equal(p(selected).openingRevision, 5)
assert.equal(initializeLdct(selected), selected, 'refresh does not silently restart the story')
assert.equal(p(openLdctShelf(selected)), undefined)
const done = walk(selected)
const ordered = ['lf_consult_0', 'lf_plan_0', 'lf_lab_1', 'lf_lab_2', 'lf_lab_3', 'lf_night1_end',
  'lf_scan_0', 'lf_first_fbp', 'lf_lab_4', 'lf_license_0', 'lf_export_0', 'lf_evening2',
  'lf_rest_hub', 'lf_lab_5', 'lf_weeks_0', 'lf_end']
for (let index = 1; index < ordered.length; index++)
  assert(done.route.indexOf(ordered[index]) > done.route.indexOf(ordered[index - 1]), `${ordered[index - 1]} precedes ${ordered[index]}`)
for (const nodeId of ['lf_scan_0', 'lf_first_fbp', 'lf_lab_4', 'lf_lab_5'])
  assert.equal(done.route.filter(id => id === nodeId).length, 1, `${nodeId}: occurs once`)
assert.deepEqual(Object.keys(p(done.state).records), ['1', '2', '3', '4', '5'])
assert.equal(done.state.skill, base.skill + 1)
assert.equal(done.state.wealth, base.wealth + 1)
assert.equal(done.state.gold, base.gold)
assert.equal(done.state.heart, base.heart)
assert(done.state.badges.includes('ldct_noise_beyond'))
assert.equal(getLdctLabDataset(done.snapshots.get('lf_lab_4')), 'chest')
assert(p(done.snapshots.get('lf_lab_5')).completed.includes('father_projection_authorized'))
assert.equal(getLdctNode(done.snapshots.get('lf_first_fbp')).chestPreview, 'fbp')
assert.match(getLdctNode(done.snapshots.get('lf_after_filter_0')).text, /低管电流/)
const highFilter = clone(done.snapshots.get('lf_after_filter_0'))
p(highFilter).records[3].signal = 'high'
assert.doesNotMatch(getLdctNode(highFilter).text, /低管电流那档加上锐滤波/)

const emptyExposure = createLdctLabState(4, 'chest')
assert.equal(emptyExposure.exposureStep, 0)
assert(labStateValid(emptyExposure, 4))
assert.equal(ldctExperimentReady(emptyExposure, 4), false)
assert.equal(createLdctRecord(emptyExposure, 4, 'different', 'chest'), null)
assert.equal(act(done.snapshots.get('lf_lab_4'), 'lab:update', { value: createLdctLabState(4, 'phantom') }),
  done.snapshots.get('lf_lab_4'), 'current chest tool rejects a draft from the old phantom experiment')
for (let step = 0; step < 4; step++) {
  const draft = { ...emptyExposure, exposureStep: step }
  assert(labStateValid(draft, 4))
  assert.equal(ldctExposureFrame('fbp', step).column, step)
  assert.equal(ldctExposureFrame('sinogram', step).row, 1)
  let state = act(done.snapshots.get('lf_lab_4'), 'lab:update', { value: draft })
  assert.equal(p(initializeLdct(clone(state))).labDraft.exposureStep, step, 'every exposure checkpoint survives refresh')
  const record = createLdctRecord({ ...draft, helped: step === 0 }, 4, step === 0 ? 'uncertain' : 'different', 'chest')
  assert(isValidLdctRecord(record, 4))
  assert.equal(record.exposureStep, step)
  assert.equal(record.sourceVersion, LDCT_EXPOSURE_VERSION)
  assert.equal(record.seed, LDCT_CHEST_SEED)
  assert.equal(record.dataset, 'chest')
  const before = stats(state)
  state = act(state, 'lab:submit', { record })
  assert.equal(p(state).nodeId, 'lf_photons_done_0')
  assert.deepEqual(stats(state), before, 'later exposure experiment adds no new comparison reward')
  assert.equal(act(state, 'lab:submit', { record }), state)
}
for (const step of [-1, 4, .5, Number.NaN, Number.POSITIVE_INFINITY]) {
  assert.equal(labStateValid({ ...emptyExposure, exposureStep: step }, 4), false)
  assert.throws(() => ldctExposureFrame('fbp', step))
}
assert.equal(labStateValid({ ...createLdctLabState(3), exposureStep: 1 }, 3), false)
const exposure = p(done.state).records[4]
assert.equal(isValidLdctRecord({ ...exposure, sourceVersion: LDCT_CHEST_VERSION }, 4), false)
assert.equal(isValidLdctRecord({ ...exposure, exposureStep: 4 }, 4), false)
assert.equal(isValidLdctRecord(exposure, 5), false)
assert.equal(act(done.snapshots.get('lf_lab_4'), 'lab:submit', { record: exposure }), done.snapshots.get('lf_lab_4'),
  'valid record from a different draft is not accepted')

// Leaving a tool, reviewing a record and restarting keep reward receipts stable.
let review = act(done.state, 'lab:open', { round: 4 })
assert.equal(getLdctLabDataset(review), 'chest')
assert.equal(p(review).labDraft.exposureStep, 3)
const beforeReview = stats(review)
review = act(review, 'lab:close')
assert.equal(p(review).nodeId, 'lf_end')
assert.deepEqual(stats(review), beforeReview)
review = act(review, 'lab:open', { round: 4 })
review = act(review, 'lab:submit', { record: createLdctRecord(p(review).labDraft, 4, 'different', 'chest') })
assert.equal(p(review).nodeId, 'lf_end')
assert.deepEqual(stats(review), beforeReview)
let paused = act(done.snapshots.get('lf_lab_4'), 'lab:update', { value: { ...emptyExposure, exposureStep: 2 } })
paused = act(paused, 'lab:close')
assert.equal(p(paused).phase, 'story')
paused = act(paused, 'advance', { nodeId: 'lf_lab_4' })
assert.equal(p(paused).phase, 'lab')
assert.equal(p(paused).labDraft.exposureStep, 2)

// V4 saves resume their original graph. New start is explicit and preserves the old run.
const legacy = at(done.snapshots.get('lf_night1_end'), 'lf_night1_end', { openingRevision: 4, phase: 'settle' })
// A real historical save used bpStep; the new manual field did not exist.
p(legacy).records[2] = createLdctRecord({ ...createLdctLabState(2), bpStep: 5 }, 2, 'different')
const legacySnapshot = clone(p(legacy))
assert.equal(getLdctSteps(p(legacy)).lf_first_fbp.next, 'lf_license_0')
assert.equal(getLdctSteps(p(legacy)).lf_lab_4.labDataset, 'phantom')
assert.deepEqual(p(initializeLdct(clone(legacy))), legacySnapshot)
const oldEvening = act(legacy, 'part:next')
assert.equal(p(oldEvening).nodeId, 'lf_evening2', 'legacy next-night cannot repeat the already-completed scan')
const oldRound4 = at(oldEvening, 'lf_lab_4', { phase: 'lab', labRound: 4, labDraft: operated(4, 'phantom') })
assert.equal(getLdctLabDataset(oldRound4), 'phantom')
const oldRecord = createLdctRecord(p(oldRound4).labDraft, 4, 'different', 'phantom')
assert(isValidLdctRecord(oldRecord, 4), 'legacy phantom record is still valid')
assert.equal(p(act(oldRound4, 'lab:submit', { record: oldRecord })).nodeId, 'lf_after_noise_0')
assert.equal(p(act(at(legacy, 'lf_export_2'), 'advance', { nodeId: 'lf_export_2' })).nodeId, 'lf_review_intro_0',
  'legacy export still leads to its first-evening review')
let restarted = selectLdctStory(legacy, 'father', true)
assert.equal(p(restarted).openingRevision, 5)
assert.equal(p(restarted).nodeId, 'lf_start')
assert.equal(p(restarted).run, legacySnapshot.run + 1)
assert.deepEqual(clone(getLdctShelf(restarted).previousFather), legacySnapshot)
assert.deepEqual(getLdctShelf(restarted).receipts, getLdctShelf(legacy).receipts)
restarted = act(restarted, 'advance', { nodeId: 'lf_start' })
assert.deepEqual(clone(getLdctShelf(restarted).previousFather), legacySnapshot, 'new actions never edit the archived run')
assert.deepEqual(stats(restarted), stats(legacy))
const inherited = at(selectLdctStory(done.state, 'father', true), 'lf_lab_4', { phase: 'lab', labRound: 4, labDraft: emptyExposure })
const helpedAgain = act(inherited, 'lab:submit', { record: createLdctRecord({ ...emptyExposure, helped: true }, 4, 'uncertain', 'chest') })
assert.deepEqual(stats(helpedAgain), stats(done.state), 'help in a replay cannot farm any shared reward')
assert.deepEqual(protectedState(helpedAgain), protectedBase)

console.log(`PASS: current father route (${done.route.length} pure checkpoints), manual-frame metadata, exposure 1–4, refresh/help/review/replay receipts, v4 continuity, access code and approved cue mapping.`)
