import assert from 'node:assert/strict'
import { freshState } from '../src/game/store.ts'
import { getLdctChoices, getLdctNode, LDCT_STEPS } from '../src/game/ldct.ts'
import { createResearchDraft, researchDraftValid, researchReady } from '../src/game/ldct-research.ts'
import {
  getLdctProgress, initializeLdct, ldctAction, ldctCanRest, ldctGiftChoices, ldctItemUnavailable,
} from '../src/game/ldct-session.ts'

// The approved five projection exercises have their own tests. Begin at the old
// finished opening: this is the backward-compatible handoff into the new parts.
const base = { ...freshState('m'), gold: 3000, skill: 23, heart: 12, wealth: 7,
  night: 4, ap: 2, buyCount: 13, lotteryCount: 4, lotteryNight: 4,
  playerName: '隔离测试学生', playerId: 'LDCT-COMPLETE-TEST', stepId: 'n4_hub',
  resumeKey: '4-n4_hub', flags: { quiz_grade: 'A', quiz2_grade: 'S', archive_film: true },
  dlc: { ch2: { done: true, certificate: { code: 'YSK2-isolation' }, purchaseCounts: { 3: 4 } },
    dr: { done: true, served: ['patient'] }, dsa: { dose: 275, pedalTry: 2 } } }
const act = (state, type, fields = {}) => ldctAction(state, { type, ...fields })
const progress = getLdctProgress
const clone = value => JSON.parse(JSON.stringify(value))
const snapshot = state => {
  const protectedCopy = structuredClone(state)
  for (const key of ['gold', 'skill', 'heart', 'wealth', 'items', 'badges']) delete protectedCopy[key]
  delete protectedCopy.dlc.ldct
  return protectedCopy
}
const protectedBase = snapshot(base)
const goto = (state, nodeId, phase = 'story', patch = {}) => ({ ...state, dlc: { ...state.dlc,
  ldct: { ...state.dlc.ldct, ldct: { ...progress(state), nodeId, phase, reply: undefined, ...patch } } } })
const oldOpening = (chief = 'told') => goto(initializeLdct(structuredClone(base)), 'stage_end', 'settle', {
  receipts: ['reward:comparison', 'reward:records', 'coffee'], completed: ['organized', 'rest'],
  decisions: { chief },
  gifts: [{ person: 'lei', item: 'snack', nodeId: 'chat_lei_0' }],
})

let state = oldOpening()
assert.equal(initializeLdct(state), state)
assert.equal(progress(initializeLdct(clone(state))).nodeId, 'stage_end', 'old completed sample does not auto-advance')
assert.equal(progress(state).research, undefined)
assert.equal(act(state, 'advance', { nodeId: 'stage_end' }), state)
assert.equal(act(state, 'research:open', { stage: 'blind' }), state, 'cannot review an unplayed research tool')
assert.equal(act(state, 'research:submit', { stage: 'roster' }), state)
assert.match(ldctItemUnavailable(state, 'coffee'), /下一段/)
assert.equal(ldctItemUnavailable(state, 'snack'), undefined, 'between parts, supplies have a future use')
const oldGold = state.gold
state = act(state, 'buy', { item: 'snack' })
assert.equal(state.gold, oldGold - 40)
assert.equal(progress(state).nodeId, 'stage_end', 'shopping does not enter the next part')
assert.equal(act(state, 'buy', { item: 'snack' }), state)
state = act(state, 'part:next')
assert.equal(progress(state).nodeId, 'r2_start')
assert.equal(act(state, 'part:next'), state, 'a second click cannot cross another part')
assert.deepEqual(progress(state).partStart, { gold: state.gold, skill: state.skill, heart: state.heart, wealth: state.wealth })
assert.deepEqual(snapshot(state), protectedBase)

// New module registration and explicit portraits are checked without playing all
// combinations. Each representative route below tests actual branch filtering.
for (const node of Object.values(LDCT_STEPS).filter(node => /^r[234]_/.test(node.id))) {
  assert(Object.hasOwn(node, 'sprite'), `${node.id}: no inherited portrait`)
  for (const target of [node.next, ...(node.choices ?? []).map(choice => choice.next)].filter(Boolean)) {
    assert(LDCT_STEPS[target], `${node.id} -> ${target}`)
  }
}

function validDraft(stage, config) {
  const draft = createResearchDraft(stage)
  if (stage === 'roster') {
    draft.assignments = config.overload
      ? { code: 'me', versions: 'me', reading: 'he' }
      : { code: 'luzhou', versions: 'lei', reading: 'he' }
    draft.rest = !config.overload
  } else if (stage === 'blind') {
    draft.observations = { control: 'similar', faint: config.uncertain ? 'uncertain' : 'detail', shifted: 'uncertain' }
    draft.seen = ['control:1:learned', 'control:1:fbp', 'faint:0:learned', 'faint:1:learned', 'faint:1:iterative', 'shifted:2:fbp']
    draft.marks = { faint: { x: 64, y: 63 } }
    draft.caseId = 'faint'
    draft.method = 'iterative'
    draft.divider = 38
    draft.help = config.uncertain
    draft.revealed = true
  } else {
    draft.claim = config.claim
    draft.included = config.claim === 'cherry' ? ['control'] : ['control', 'faint', 'shifted']
  }
  return draft
}

let totalTransitions = 0
function chooseFor(state, config) {
  const node = getLdctNode(state)
  const choices = getLdctChoices(state)
  const requested = {
    r2_scope_q: config.scope === 'authorized' ? 'apply' : 'defer',
    r2_credit_q: config.promise ? 'promise' : 'contribution',
    r2_share_q: config.scope === 'defer' ? 'phantom' : config.attempt ? 'attempt' : 'local',
    r3_example_q: config.pretty ? 'pretty' : 'all',
    r3_rest_q: config.overload ? 'push' : 'rest',
    r4_ending_question: config.ending,
  }[node.id]
  if (node.id === 'r2_share_q') {
    assert.deepEqual(choices.map(c => c.id), config.scope === 'defer' ? ['phantom'] : ['local', 'attempt'])
  }
  if (node.id === 'r4_ending_question') {
    assert.deepEqual(choices.map(c => c.id), config.claim === 'cherry' ? ['rework', 'paused'] : [config.claim])
  }
  const selected = requested ? choices.find(c => c.id === requested) : choices[0]
  assert(selected, `missing available choice ${node.id}: ${requested}`)
  return { type: 'choose', nodeId: node.id, choiceId: selected.id }
}

function reenterResearch(state, stage) {
  const expected = { roster: ['r2_hub', 'work'], blind: ['r3_hub', 'compare'], report: ['r4_hub', 'report'] }[stage]
  assert.equal(progress(state).nodeId, expected[0])
  state = act(state, 'choose', { nodeId: expected[0], choiceId: expected[1] })
  for (let i = 0; progress(state).phase !== 'research'; i++) {
    assert(i < 8)
    state = act(state, 'advance', { nodeId: progress(state).nodeId })
  }
  return state
}

function completeRoute(config) {
  let current = oldOpening(config.chief)
  const settlements = []
  let transitions = 0
  while (!progress(current).finished) {
    assert(++transitions < 180, `route ${config.ending} must terminate`)
    const p = progress(current)
    if (p.phase === 'settle') {
      settlements.push(p.nodeId)
      const restored = initializeLdct(clone(current))
      assert.equal(progress(restored).nodeId, p.nodeId)
      assert.equal(act(current, 'advance', { nodeId: p.nodeId }), current)
      current = act(restored, 'part:next')
      assert.equal(act(current, 'part:next'), current)
      continue
    }
    if (p.phase === 'research') {
      const stage = p.research.stage
      assert.equal(act(current, 'research:submit', { stage }), current, `${stage}: incomplete tool cannot submit`)
      const draft = validDraft(stage, config)
      assert(researchDraftValid(draft, stage))
      assert(researchReady(draft))
      const invalid = { ...draft, divider: NaN }
      assert.equal(act(current, 'research:update', { value: invalid }), current)
      assert.equal(act(current, 'research:update', { value: createResearchDraft(stage === 'roster' ? 'blind' : 'roster') }), current)
      if (stage === 'blind') {
        const unrevealed = { ...draft, revealed: false }
        current = act(current, 'research:update', { value: unrevealed })
        assert.equal(act(current, 'research:submit', { stage }), current, 'notes do not bypass the reveal')
      }
      current = act(current, 'research:update', { value: draft })
      const values = { gold: current.gold, skill: current.skill, heart: current.heart, wealth: current.wealth }
      current = act(current, 'research:update', { value: clone(draft) })
      assert.deepEqual({ gold: current.gold, skill: current.skill, heart: current.heart, wealth: current.wealth }, values)
      current = initializeLdct(clone(current))
      assert.deepEqual(progress(current).research, draft, 'reload keeps observations, marks, inclusion and controls')
      // Closing and returning is a real route through the hub, not a forced cursor jump.
      current = reenterResearch(act(current, 'research:close'), stage)
      assert.deepEqual(progress(current).research, draft)
      current = act(current, 'research:submit', { stage })
      assert.deepEqual(progress(current).researchRecords[stage], draft)
      assert.equal(act(current, 'research:submit', { stage }), current, 'stale submit is not a second reward')
      assert.equal(progress(current).receipts.filter(id => id === `research:${stage}`).length, 1)
      continue
    }
    const node = getLdctNode(current)
    const action = getLdctChoices(current).length ? chooseFor(current, config) : { type: 'advance', nodeId: node.id }
    const before = current
    current = ldctAction(current, action)
    assert.notEqual(current, before, `${node.id}: route must move`)
    assert.equal(ldctAction(current, action), current, `${node.id}: stale dialogue action is rejected`)
    assert.deepEqual(snapshot(current), protectedBase)
  }
  assert.deepEqual(settlements, ['stage_end', 'r2_end', 'r3_end'])
  assert.equal(progress(current).nodeId, 'r4_end')
  assert.equal(progress(current).phase, 'settle')
  assert.equal(progress(current).decisions.ending, config.ending)
  assert.equal(progress(current).decisions.research_scope, config.scope)
  assert.equal(progress(current).decisions.report, config.claim)
  assert.equal(progress(current).decisions.workload, config.overload ? 'overloaded' : 'shared')
  assert.equal(progress(current).decisions.roster_rest, config.overload ? 'no' : 'yes')
  assert.equal(current.wealth, base.wealth + 1)
  assert.equal(current.skill, base.skill + 1)
  assert.equal(current.gold, base.gold)
  assert.equal(current.heart, base.heart)
  assert(current.badges.includes('ldct_keep_counterexample'))
  assert.equal(current.badges.filter(id => id === 'ldct_noise_beyond').length, 1)
  assert.equal(act(current, 'part:next'), current)
  for (const item of ['coffee', 'milktea', 'snack']) {
    assert.match(ldctItemUnavailable(current, item), /机会已过/)
    assert.equal(act(current, 'buy', { item }), current)
  }
  const finalDecisions = structuredClone(progress(current).decisions)
  const finalRecords = structuredClone(progress(current).researchRecords)
  const finalValues = { skill: current.skill, wealth: current.wealth, gold: current.gold, heart: current.heart }
  for (const stage of ['roster', 'blind', 'report']) {
    const reviewing = act(current, 'research:open', { stage })
    assert.equal(progress(reviewing).phase, 'research')
    assert.equal(progress(reviewing).researchReturn, 'r4_end')
    let changed = act(reviewing, 'research:update', { value: validDraft(stage, { ...config, overload: !config.overload, claim: 'cherry' }) })
    changed = act(changed, 'research:submit', { stage })
    assert.equal(progress(changed).nodeId, 'r4_end')
    assert.deepEqual(progress(changed).decisions, finalDecisions, 'review cannot rewrite past choices')
    assert.deepEqual(progress(changed).researchRecords, finalRecords, 'review cannot replace the submitted evidence')
    assert.deepEqual({ skill: changed.skill, wealth: changed.wealth, gold: changed.gold, heart: changed.heart }, finalValues)
    assert.deepEqual(snapshot(changed), protectedBase)
  }
  const replay = initializeLdct(current, true)
  assert.equal(progress(replay).nodeId, 'dinner_0')
  assert.equal(progress(replay).finished, undefined)
  assert.equal(progress(replay).researchRecords, undefined)
  assert.equal(progress(replay).run, progress(current).run + 1)
  assert.equal(replay.skill, current.skill, 'replay keeps cumulative attributes')
  assert.deepEqual(snapshot(replay), protectedBase)
  totalTransitions += transitions
  return current
}

const routes = [
  { ending: 'limited', claim: 'limited', scope: 'authorized', chief: 'told', promise: false, overload: false, uncertain: false, pretty: false, attempt: false },
  { ending: 'delay', claim: 'delay', scope: 'defer', chief: 'later', promise: true, overload: true, uncertain: true, pretty: false, attempt: false },
  { ending: 'rework', claim: 'cherry', scope: 'authorized', chief: 'later', promise: true, overload: true, uncertain: false, pretty: true, attempt: true },
  { ending: 'paused', claim: 'cherry', scope: 'defer', chief: 'told', promise: false, overload: false, uncertain: true, pretty: true, attempt: false },
]
const finals = routes.map(completeRoute)
assert.equal(progress(finals[2]).decisions.sharing, 'attempt')
assert.equal(progress(finals[1]).decisions.credit, 'promise')
assert.match(getLdctNode(goto(oldOpening('told'), 'r2_chief_1')).text, /我记着/)
assert.match(getLdctNode(goto(oldOpening('later'), 'r2_chief_1')).text, /怎么现在才说/)
assert.match(getLdctNode(goto(finals[2], 'r4_chief_2')).text, /附件那次退回/)
assert.doesNotMatch(getLdctNode(goto(finals[0], 'r4_chief_2')).text, /附件那次退回/)
assert.match(getLdctNode(goto(finals[1], 'r3_lei_2')).text, /先挂我名字/)

// Targeted household tests: legacy part-1 gifts/coffee/rest do not block later
// parts, but a new gift or break can occur only once in its own part.
state = goto(oldOpening(), 'r2_hub', 'story', { fatigue: 4 })
assert(ldctCanRest(state))
state = act(state, 'rest')
assert.equal(progress(state).fatigue, 3)
assert.equal(act(state, 'rest'), state)
state = act(state, 'reply:close')
assert(!ldctCanRest(state))
assert.equal(act(state, 'rest'), state)
state = act(state, 'buy', { item: 'coffee' })
assert.equal(state.gold, base.gold - 30)
assert.equal(progress(state).fatigue, 2)
assert.equal(state.ap, base.ap, 'coffee never creates main-chapter AP')
assert.equal(act(state, 'buy', { item: 'coffee' }), state)
state = act(state, 'reply:close')
assert.match(ldctItemUnavailable(state, 'coffee'), /已经喝过/)
state = act(state, 'buy', { item: 'snack' })
const beforeGiftHeart = state.heart
state = goto(state, 'r2_lei_0')
assert(ldctGiftChoices(state).some(choice => choice.person === 'lei'), 'old part-1 gift has no part field and means part 1 only')
state = act(state, 'gift', { nodeId: 'r2_lei_0', person: 'lei', item: 'snack' })
assert.equal(state.heart, beforeGiftHeart + 1)
assert.equal(progress(state).gifts.at(-1).part, 2)
assert.equal(act(state, 'gift', { nodeId: 'r2_lei_0', person: 'lei', item: 'snack' }), state)
state = initializeLdct(clone(state))
assert(progress(state).reply)
state = act(state, 'reply:close')
state = { ...state, items: [...state.items, 'snack'] }
assert.equal(ldctGiftChoices(state).length, 0, 'replenishment does not bypass same-part gift limit')
state = goto(state, 'r3_lei_0')
assert(ldctGiftChoices(state).some(choice => choice.person === 'lei'))
state = act(state, 'gift', { nodeId: 'r3_lei_0', person: 'lei', item: 'snack' })
assert.equal(state.heart, beforeGiftHeart + 2)
assert.equal(progress(state).gifts.at(-1).part, 3)
state = goto(act(state, 'reply:close'), 'r3_hub')
assert(ldctCanRest(state))
assert.equal(ldctItemUnavailable(state, 'coffee'), undefined)
state = act(state, 'buy', { item: 'coffee' })
assert.equal(progress(state).receipts.filter(id => id === 'coffee:3').length, 1)
state = act(state, 'reply:close')
const heartBeforeMilk = state.heart
state = act(state, 'buy', { item: 'milktea' })
assert.equal(state.heart, heartBeforeMilk + 2)
state = goto(state, 'r3_arrival_0')
state = act(state, 'gift', { nodeId: 'r3_arrival_0', person: 'luzhou', item: 'milktea' })
assert.equal(state.heart, heartBeforeMilk + 2, 'milk social reward remains at purchase, not duplicated at gift')
assert(!state.items.includes('milktea'))
assert.deepEqual(snapshot(state), protectedBase)

console.log(`LDCT complete session: 4 endings, ${totalTransitions} pure-state transitions, research restore/dedup/review, per-part supplies and cross-chapter isolation passed`)
