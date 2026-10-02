// Focused three-branch handoff -> deep-learning reveal -> director entrance.
// Run from app/: node --import tsx tests/ldct-dl-reveal.mjs
import assert from 'node:assert/strict'
import { freshState } from '../src/game/store.ts'
import { getLdctNode, getLdctChoices, getLdctSteps, LDCT_MEDIA_IDS } from '../src/game/ldct.ts'
import { getLdctProgress, getLdctShelf, initializeLdct, selectLdctStory, openLdctShelf,
  ldctAction } from '../src/game/ldct-session.ts'
import { createLdctLabState, createLdctPhantomPreparationState, createLdctRecord } from '../src/game/ldct-experiments.ts'
import { getLdctScanConfig } from '../src/game/ldct-scans.ts'
import { getLdctCinematic } from '../src/game/ldct-cinematics.ts'

const copy = value => JSON.parse(JSON.stringify(value))
const p = getLdctProgress
const act = (state, type, fields = {}) => ldctAction(state, { type, ...fields })
const reload = state => initializeLdct(copy(state))
const assetsAndRewards = state => ({ gold: state.gold, skill: state.skill, heart: state.heart, wealth: state.wealth,
  items: state.items, badges: state.badges, receipts: getLdctShelf(state).receipts, experienced: getLdctShelf(state).experienced })
const records = state => ({ records: p(state).records, patientIteration: p(state).patientIteration,
  receipts: p(state).receipts, scanSessions: p(state).scanSessions })
const protectedState = state => ({ flags: state.flags, night: state.night, ap: state.ap,
  ch2: state.dlc.ch2, dr: state.dlc.dr, dsa: state.dlc.dsa })
const base = selectLdctStory({ ...freshState('m'), gold: 620, skill: 12, heart: 7, wealth: 4,
  items: ['snack'], flags: { keep_main: true }, night: 4, ap: 2,
  dlc: { ch2: { done: true, certificate: { code: 'KEEP-DL' } }, dr: { done: true }, dsa: { dose: 56 } } }, 'father')
function at(state, nodeId, fields = {}) {
  const progress = { ...p(state), nodeId, phase: 'story', reply: undefined, ...fields }
  return { ...state, dlc: { ...state.dlc, ldct: { ...state.dlc.ldct, ldct: progress,
    ldctStories: { ...getLdctShelf(state), active: 'father', slots: { ...getLdctShelf(state).slots, father: progress } } } } }
}
const phantomRecord = createLdctRecord({ ...createLdctPhantomPreparationState(5), iterationRound: 12 }, 5, 'different', 'phantom')
const patientDraft = { ...createLdctLabState(5, 'chest'), iterationRound: 12 }
const patientRecord = createLdctRecord(patientDraft, 5, 'different', 'chest')
assert(phantomRecord && patientRecord)
const ready = at(copy(base), 'lf_result_choice', {
  records: { 5: phantomRecord }, patientIteration: { draft: patientDraft, record: patientRecord },
  completed: ['father_projection_authorized'], partStart: { gold: 860, skill: 11, heart: 7, wealth: 4 },
})
const steps = getLdctSteps(p(ready))
for (let i = 0; i < 4; i++) {
  assert.equal(getLdctCinematic(`lf_trial_license_${i}`).image, 'ldct_cg_locked_phantom_v1', 'phantom trial never shows a lung monitor')
  assert.equal(getLdctCinematic(`lf_license_${i}`).image, 'ldct_cg_locked_v1', 'legacy patient discovery retains its appropriate lung monitor')
}
const dlIds = Array.from({ length: 7 }, (_, i) => `lf_dl_${i}`)
assert.equal(steps.lf_record_echo.next, 'lf_dl_0')
assert.deepEqual(Object.values(steps).filter(node => node.chestPreview === 'deep-learning').map(node => node.id), dlIds.slice(4),
  'the new image is confined to its three reveal lines')
assert(LDCT_MEDIA_IDS.includes('ldct_lung_dl_result_v1'), 'the independent result is part of complete LDCT preloading')
for (const nodeId of dlIds) {
  const node = steps[nodeId]
  assert.equal(node.enterLab, undefined, 'the reveal never opens another experiment')
  assert.equal(getLdctScanConfig(nodeId, 5), undefined, 'reconstruction never starts a new acquisition clock')
  assert.equal(node.settle, undefined)
}

for (const choiceId of ['fbp', 'keep', 'together']) {
  let state = copy(ready)
  const beforeAssets = assetsAndRewards(state), beforeRecords = records(state)
  assert(getLdctChoices(state).some(choice => choice.id === choiceId))
  state = act(state, 'choose', { nodeId: 'lf_result_choice', choiceId })
  assert.equal(p(state).decisions.result_review, choiceId)
  const visited = []
  for (let count = 0; p(state).nodeId !== 'lf_caught_0' && count < 16; count++) {
    const node = getLdctNode(state)
    visited.push(node.id)
    assert.equal(p(state).phase, 'story')
    assert.equal(node.choices?.length ?? 0, 0)
    const revealed = ['lf_dl_4', 'lf_dl_5', 'lf_dl_6'].includes(node.id)
    assert.equal(node.chestPreview === 'deep-learning', revealed, 'the result appears only after the run line is explicitly advanced')
    if (revealed) assert.equal(node.sprite, null, 'the result keeps the existing unobstructed image frame')
    const snapshot = copy(state)
    state = reload(state)
    assert.deepEqual(state, snapshot, 'refresh preserves the exact line and whether the result has been revealed')
    assert.equal(act(state, 'part:next'), state)
    assert.equal(act(state, 'scan:complete', { nodeId: node.id, now: 10000 }), state)
    assert.deepEqual(assetsAndRewards(state), beforeAssets)
    assert.deepEqual(records(state), beforeRecords, 'DL presentation cannot replace either saved iterative record')
    if (node.id === 'lf_dl_4') {
      assert.equal(p(state).completed.includes('father_dl_preview'), false, 'entering or reloading the image does not auto-advance its completion')
      state = selectLdctStory(reload(openLdctShelf(state)), 'father')
      assert.equal(p(state).nodeId, 'lf_dl_4')
      assert.equal(getLdctNode(state).chestPreview, 'deep-learning')
    }
    assert(node.next, `unexpected dead end at ${node.id}`)
    state = act(state, 'advance', { nodeId: node.id })
    assert.equal(act(state, 'advance', { nodeId: node.id }), state, 'a stale repeated click cannot skip the following line')
    if (node.id === 'lf_dl_4') assert.equal(p(state).completed.filter(id => id === 'father_dl_preview').length, 1)
  }
  assert.deepEqual(visited.slice(visited.indexOf('lf_record_echo')), ['lf_record_echo', ...dlIds], 'all three reactions converge before the same reveal')
  assert.equal(p(state).nodeId, 'lf_caught_0')
  assert.equal(getLdctNode(state).chestPreview, undefined, 'the result leaves the stage when the director arrives')
  assert.equal(p(state).completed.filter(id => id === 'father_dl_preview').length, 1)
  assert.deepEqual(assetsAndRewards(state), beforeAssets)
  assert.deepEqual(records(state), beforeRecords)
  assert.deepEqual(protectedState(state), protectedState(base))
  assert.match(getLdctNode(at(state, 'lf_pitch_0')).text, /刚试.*深度学习/)
  assert.match(getLdctNode(at(state, 'lf_director_method_1')).text, /深度学习.*刚才/)
}

// Later published cursors keep moving forward and cannot acquire an invented DL memory.
for (const nodeId of ['lf_caught_0', 'lf_pitch_0', 'lf_director_method_1', 'lf_end']) {
  const old = at(copy(ready), nodeId, nodeId === 'lf_end' ? { phase: 'settle', finished: true } : {})
  const loaded = reload(old)
  assert.equal(p(loaded).nodeId, nodeId)
  assert.equal(p(loaded).completed.includes('father_dl_preview'), false)
  assert.equal(getLdctNode(loaded).chestPreview, undefined)
  assert.deepEqual(assetsAndRewards(loaded), assetsAndRewards(old))
  if (nodeId === 'lf_pitch_0' || nodeId === 'lf_director_method_1')
    assert.doesNotMatch(getLdctNode(loaded).text, /刚试|刚才拿同次数据试了一版/)
}
const legacy = at(copy(ready), 'lf_record_echo', { openingRevision: 4, phantomPreparation: undefined })
assert.equal(getLdctSteps(p(legacy)).lf_dl_4, undefined, 'frozen v4 content is unchanged')
assert.notEqual(getLdctNode(legacy).next, 'lf_dl_0')
console.log('PASS DL reveal: three reactions converge, explicit reveal timing, reload/shelf persistence, isolated image and records, one completion marker, director handoff and legacy forward progress.')
