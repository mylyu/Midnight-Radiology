// Focused ending transactions + optional speed contest sessions.
// Run from app/: node --import tsx tests/ldct-caught-state.mjs
import assert from 'node:assert/strict'
import { freshState } from '../src/game/store.ts'
import { getLdctNode, getLdctChoices, getLdctSteps } from '../src/game/ldct.ts'
import { selectLdctStory, initializeLdct, getLdctProgress, getLdctShelf, ldctAction } from '../src/game/ldct-session.ts'
import { createLdctLabState, createLdctRecord } from '../src/game/ldct-experiments.ts'
import { LDCT_SPEED_CHALLENGES, getLdctSpeedKind } from '../src/game/ldct-speed-challenge.ts'

const clone = value => JSON.parse(JSON.stringify(value))
const p = getLdctProgress
const base = selectLdctStory({ ...freshState('m'), gold: 800, skill: 7, heart: 9, wealth: 2,
  flags: { keep_main: true }, dlc: { ch2: { done: true }, dr: { done: true }, dsa: { dose: 57 } } }, 'father')
const replace = (state, progress) => ({ ...state, dlc: { ...state.dlc, ldct: { ...state.dlc.ldct, ldct: progress,
  ldctStories: { ...state.dlc.ldct.ldctStories, slots: { ...state.dlc.ldct.ldctStories.slots, father: progress } } } } })
const act = (state, type, fields = {}) => ldctAction(state, { type, ...fields })
const reload = state => initializeLdct(clone(state))
const protectedState = state => ({ flags: state.flags, ch2: state.dlc.ch2, dr: state.dlc.dr, dsa: state.dlc.dsa,
  skill: state.skill, heart: state.heart, wealth: state.wealth })
// Preserve the delivered patient-IR route used by this historical ending suite.
const atNode = (nodeId, fields = {}, state = clone(base)) => replace(state, { ...p(state), phantomPreparation: undefined, nodeId, phase: 'story', ...fields })

for (const [kind, round] of [['backproject', 2], ['iteration', 5]]) {
  const nodeId = `lf_lab_${round}`, config = LDCT_SPEED_CHALLENGES[kind]
  let state = atNode(nodeId, { phase: 'lab', labRound: round, labDraft: createLdctLabState(round, round === 5 ? 'chest' : 'phantom') })
  const original = clone(state), startTime = 100000
  assert.equal(getLdctSpeedKind(p(state)), kind)
  state = act(state, 'challenge:start', { nodeId, now: startTime })
  const attempt = p(state).speedChallenges[kind].attempt
  assert.equal(act(state, 'challenge:start', { nodeId, now: startTime + 1 }), state, 'running start cannot reset the clock')
  assert.equal(act(state, 'challenge:tap', { nodeId, now: startTime + 30, attempt, tap: 2 }), state, 'out-of-order gesture cannot jump progress')
  assert.equal(act(state, 'lab:update', { value: { ...p(state).labDraft, ...(round === 2 ? { bpCount: 160 } : { iterationRound: 12 }) } }), state,
    'ordinary parameter writes cannot bypass a running contest')
  state = act(state, 'challenge:tap', { nodeId, now: startTime + 30, attempt, tap: 1 })
  const first = clone(p(state).speedChallenges[kind]), firstDraft = clone(p(state).labDraft)
  assert.equal(act(state, 'challenge:tap', { nodeId, now: startTime + 31, attempt, tap: 1 }), state, 'duplicate ordered gesture ignored')
  state = reload(state)
  assert.deepEqual(p(state).speedChallenges[kind], first, 'refresh preserves the original deadline and progress')
  assert.deepEqual(p(state).labDraft, firstDraft)
  for (let tap = 2; tap <= config.taps; tap++) state = act(state, 'challenge:tap', { nodeId, now: startTime + tap * 30, attempt, tap })
  assert.equal(p(state).speedChallenges[kind].status, 'won')
  assert.equal(p(state).labDraft[round === 2 ? 'bpCount' : 'iterationRound'], config.target)
  assert.equal(state.badges.filter(id => id === config.badge).length, 1)
  assert.equal(state.gold, original.gold)
  assert.deepEqual(protectedState(state), protectedState(original))
  assert.deepEqual(getLdctShelf(state).receipts, getLdctShelf(original).receipts, 'speed badge is not a duplicate learning reward')
  assert.equal(act(state, 'challenge:tap', { nodeId, now: startTime + 3000, attempt, tap: config.taps + 1 }), state)
  state = act(reload(state), 'challenge:start', { nodeId, now: startTime + 20000 })
  const retry = p(state).speedChallenges[kind]
  assert.equal(retry.attempt, attempt + 1)
  assert.equal(act(state, 'challenge:tap', { nodeId, now: startTime + 20030, attempt, tap: 1 }), state, 'late callbacks from old attempts ignored')
  state = act(state, 'challenge:tap', { nodeId, now: retry.deadline, attempt: retry.attempt, tap: 1 })
  assert.equal(p(state).speedChallenges[kind].status, 'expired')
  assert.equal(p(state).speedChallenges[kind].acceptedTaps, 0)
  assert.equal(p(state).labDraft[round === 2 ? 'bpCount' : 'iterationRound'], round === 2 ? 1 : 0)
  const expiredDraft = clone(p(state).labDraft)
  state = act(state, 'challenge:practice', { nodeId, now: retry.deadline + 30 })
  assert.equal(p(state).speedChallenges[kind].status, 'practice')
  assert.deepEqual(p(state).labDraft, expiredDraft, 'practice keeps the actual image rather than auto-finishing')
  const record = createLdctRecord(p(state).labDraft, round, 'different', round === 5 ? 'chest' : 'phantom')
  assert.equal(record.practice, true)
  assert.equal(record.helped, false, 'ordinary practice is not labelled as asking for help')
  state = act(state, 'lab:submit', { record })
  assert.equal(p(state).phase, 'story', 'failed optional challenge does not block the story')
  assert.equal(state.badges.filter(id => id === config.badge).length, 1)
  assert.equal(state.skill, original.skill + 1, 'the ordinary first comparison reward still occurs only on submission')
  assert.equal(act(reload(state), 'lab:submit', { record }).skill, state.skill)

  let stopped = act(original, 'challenge:start', { nodeId, now: 300000 })
  stopped = act(stopped, 'challenge:stop', { nodeId, now: 300030 })
  assert.equal(p(stopped).speedChallenges[kind].status, 'stopped')
  assert(!stopped.badges.includes(config.badge))
  const closed = act(act(original, 'challenge:start', { nodeId, now: 400000 }), 'lab:close')
  assert.equal(p(closed).speedChallenges[kind].status, 'stopped', 'closing the lab does not leave an invisible active timer')
  for (const fields of [{ openingRevision: 4 }, { labReturn: 'lf_end' }, { finished: true }]) {
    const historical = replace(original, { ...p(original), ...fields })
    assert.equal(getLdctSpeedKind(p(historical)), undefined)
    assert.equal(act(historical, 'challenge:start', { nodeId, now: 500000 }), historical, 'review/old story cannot start new contests')
  }
}

// These are real navigation/receipt operations; no fabricated award callbacks.
for (const choiceId of ['pay', 'clever']) {
  let state = atNode('lf_caught_choice'), before = clone(state)
  assert(getLdctChoices(state).some(choice => choice.id === choiceId))
  state = act(state, 'choose', { nodeId: 'lf_caught_choice', choiceId })
  assert.equal(p(state).decisions.director_route, choiceId)
  assert.equal(state.gold, before.gold - (choiceId === 'pay' ? 200 : 0))
  assert.equal(p(state).receipts.filter(receipt => receipt === 'ending:fine').length, choiceId === 'pay' ? 1 : 0)
  state = reload(state)
  assert.equal(act(state, 'choose', { nodeId: 'lf_caught_choice', choiceId }), state, 'duplicate choice after refresh is ignored')
  const routeText = []
  for (let count = 0; !p(state).finished && count < 40; count++) {
    const node = getLdctNode(state)
    routeText.push(node.text)
    assert(!node.choices?.length, 'ending branch must converge without another untested choice')
    assert(node.next, `ending stuck at ${node.id}`)
    state = act(state, 'advance', { nodeId: node.id })
  }
  assert.equal(p(state).nodeId, 'lf_end')
  assert.equal(p(state).finished, true)
  assert.match(routeText.join('\n'), /磨玻璃/)
  assert.match(routeText.join('\n'), /复查|随访/)
  assert.doesNotMatch(routeText.join('\n'), /术后病理|早期肺癌|还是那家饭馆/)
  assert.equal(state.gold, before.gold - (choiceId === 'pay' ? 200 : 0))
  assert.deepEqual(protectedState(state), protectedState(before))
}
for (const gold of [0, 199]) {
  const poor = atNode('lf_caught_choice', {}, { ...clone(base), gold })
  assert.equal(act(poor, 'choose', { nodeId: 'lf_caught_choice', choiceId: 'pay' }), poor, 'insufficient balance cannot deduct or navigate')
  const clever = act(poor, 'choose', { nodeId: 'lf_caught_choice', choiceId: 'clever' })
  assert.equal(clever.gold, gold)
  assert.notEqual(p(clever).nodeId, 'lf_caught_choice')
}
const exactBalance = act(atNode('lf_caught_choice', {}, { ...clone(base), gold: 200 }), 'choose', { nodeId: 'lf_caught_choice', choiceId: 'pay' })
assert.equal(exactBalance.gold, 0)
assert.equal(p(exactBalance).nodeId, 'lf_fine_0')
const priorFine = atNode('lf_caught_choice', { receipts: ['ending:fine'] }, { ...clone(base), gold: 700 })
const alreadyPaid = act(reload(priorFine), 'choose', { nodeId: 'lf_caught_choice', choiceId: 'pay' })
assert.equal(alreadyPaid.gold, 700, 'an existing published fine receipt cannot charge the new amount again')
assert.equal(p(alreadyPaid).receipts.filter(receipt => receipt === 'ending:fine').length, 1)
for (const nodeId of ['lf_clinical_preview', 'lf_clinical_2', 'lf_depart_1', 'lf_weeks_3', 'lf_final_lu_0']) {
  const old = atNode(nodeId), restored = reload(old)
  assert.equal(p(restored).nodeId, 'lf_caught_0')
  assert.equal(p(restored).decisions.previous_ending_node, nodeId)
  assert.equal(initializeLdct(restored), restored, 'migration happens once')
  assert.deepEqual(protectedState(restored), protectedState(old))
  assert.equal(restored.gold, old.gold)
  assert.deepEqual(p(restored).records, p(old).records)
  assert.deepEqual(p(restored).receipts, p(old).receipts)
}
for (const openingRevision of [4, 5]) {
  const oldEnd = atNode('lf_end', { openingRevision, phase: 'settle', finished: true })
  const restored = reload(oldEnd)
  assert.equal(p(restored).nodeId, 'lf_end')
  assert.equal(p(restored).finished, true)
  assert.equal(restored.gold, oldEnd.gold)
}
const v4 = atNode('lf_clinical_0', { openingRevision: 4 })
assert.equal(p(reload(v4)).nodeId, 'lf_clinical_0')
assert(!getLdctSteps(p(v4)).lf_caught_choice, 'frozen v4 is not silently rewritten into the current ending')
console.log('LDCT caught state: ending branches, fee/refresh, historical isolation and challenge sessions passed')
