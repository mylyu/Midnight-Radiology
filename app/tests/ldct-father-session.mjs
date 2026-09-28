// Pure bounded checks: archived v4 father story, migration and shared receipts.
// Current v5 chronology/exposure is covered by ldct-hands-on.mjs.
// No browser storage, build, media download or replay of Chapters 1–2.
import assert from 'node:assert/strict'
import { freshState } from '../src/game/store.ts'
import { getLdctSteps, getLdctChoices, getLdctNode } from '../src/game/ldct.ts'
import { LDCT_FATHER_STORY } from '../src/game/ldct-father-story.ts'
import { createLdctLabState, createLdctRecord } from '../src/game/ldct-experiments.ts'
import { initializeLdct, selectLdctStory, getLdctProgress, getLdctShelf, getLdctLabDataset,
  openLdctShelf, ldctAction, ldctGiftChoices, ldctItemUnavailable } from '../src/game/ldct-session.ts'

const clone = value => JSON.parse(JSON.stringify(value))
const LDCT_STEPS = getLdctSteps({ storyId: 'father', openingRevision: 4 })
const LDCT_FATHER_LAB_DATASETS = { 1: 'phantom', 2: 'phantom', 3: 'phantom', 4: 'phantom', 5: 'chest' }
const base = { ...freshState('m'), gold: 1400, skill: 13, heart: 9, wealth: 3,
  playerName: '父亲篇隔离测试', playerId: 'LDCT-FATHER', night: 4, ap: 1, buyCount: 12,
  flags: { quiz_grade: 'A', quiz2_grade: 'S', archive_film: true },
  dlc: { ch2: { done: true, certificate: { code: 'YSK2-KEEP' } }, dr: { done: true }, dsa: { dose: 70 } } }
const act = (state, type, fields = {}) => ldctAction(state, { type, ...fields })
const p = getLdctProgress
function protection(state) {
  const copy = clone(state)
  for (const key of ['gold', 'skill', 'heart', 'wealth', 'items', 'badges']) delete copy[key]
  delete copy.dlc.ldct
  return copy
}
const protectedBase = protection(base)
function at(state, nodeId, fields = {}) {
  const progress = { ...p(state), nodeId, phase: 'story', reply: undefined, ...fields }
  const shelf = getLdctShelf(state)
  return { ...state, dlc: { ...state.dlc, ldct: { ...state.dlc.ldct, ldct: progress,
    ldctStories: { ...shelf, active: 'father', slots: { ...shelf.slots, father: progress } } } } }
}
function operated(round, dataset) {
  const draft = createLdctLabState(round, dataset)
  if (round === 1) Object.assign(draft, { structure: 'bead', seenStructures: ['bead'] })
  if (round === 2) draft.bpStep = 5
  if (round === 3) Object.assign(draft, { filter: 'hann', seenFilters: ['ramp', 'hann'] })
  if (round === 4) Object.assign(draft, { signal: 'low', seenSignals: ['high', 'low'] })
  if (round === 5) {
    Object.assign(draft, { iterationStep: 1, seenIterations: [0, 1], iterationRound: 10 })
    draft.chest = { ...draft.chest, slice: 1, pinned: { slice: 1, iterationStep: 1 },
      mark: { x: 57, y: 41, slice: 1, iterationStep: 1, method: 'iteration' }, compareFbp: false }
  }
  return draft
}

assert.equal(LDCT_FATHER_STORY.id, 'father')
assert.match(LDCT_STEPS.lf_start.text, /陆舟.*他父亲/)
assert.equal(LDCT_STEPS.lf_start.bg, 'ldct_bg_restaurant')
assert.equal(LDCT_STEPS.lf_end.part, 3, 'weeks-later epilogue is not another night2 scene')
assert.equal(LDCT_STEPS.lf_weeks_0.part, 3)
for (const node of Object.values(LDCT_STEPS)) {
  assert(Object.hasOwn(node, 'sprite'), `${node.id}: portrait presence explicit`)
  for (const id of [node.next, ...(node.choices ?? []).map(c => c.next)].filter(Boolean))
    assert(LDCT_STEPS[id] && id.startsWith('lf_'), `${node.id}: valid father-only target ${id}`)
  if (node.enterLab) assert.equal(node.labDataset, LDCT_FATHER_LAB_DATASETS[node.enterLab])
  if (node.chestPreview) assert.equal(node.sprite, null, 'no portrait covers the clinical preview')
  if (node.speaker === 'me') assert.doesNotMatch(node.text, /我爸|我的父亲/, 'father belongs to Lu, not protagonist')
}
let initial = initializeLdct(clone(base))
assert.equal(getLdctShelf(initial).version, 2)
assert.equal(p(initial), undefined, 'migration does not auto-start/reward')
assert.equal(initializeLdct(initial), initial)
assert.equal(selectLdctStory(initial, 'face'), initial, 'retired candidate cannot be started')
assert.equal(act(initial, 'part:next'), initial)
assert.deepEqual(protection(initial), protectedBase)

const reachedChoices = []
function walk(input, help = false) {
  const started = selectLdctStory(input, 'father')
  let state = at(started, p(started).nodeId, { openingRevision: 4 })
  const rounds = new Set()
  let endedEvening = false, steps = 0
  for (; steps < 140; steps++) {
    assert.deepEqual(protection(state), protectedBase)
    const progress = p(state)
    if (progress.phase === 'settle') {
      if (progress.finished) {
        assert(endedEvening)
        assert.equal(progress.nodeId, 'lf_end')
        assert.equal(rounds.size, 5)
        return { state, steps }
      }
      assert.equal(progress.nodeId, 'lf_night1_end')
      assert.deepEqual([...rounds], [1, 2, 3])
      assert.equal(act(state, 'buy', { item: 'coffee' }), state)
      assert.equal(act(state, 'advance', { nodeId: progress.nodeId }), state, 'plain advance never jumps nights')
      state = initializeLdct(clone(state))
      const next = act(state, 'part:next')
      assert.notEqual(next, state)
      assert.equal(act(next, 'part:next'), next, 'next-night click is idempotent')
      endedEvening = true; state = next; continue
    }
    if (progress.phase === 'lab') {
      const dataset = getLdctLabDataset(state)
      assert.equal(dataset, LDCT_FATHER_LAB_DATASETS[progress.labRound])
      const draft = help ? { ...createLdctLabState(progress.labRound, dataset), helped: true } : operated(progress.labRound, dataset)
      state = act(state, 'lab:update', { value: draft })
      state = initializeLdct(clone(state))
      assert.deepEqual(p(state).labDraft, draft, 'controls/mark/pinned view survive serialization')
      const record = createLdctRecord(draft, progress.labRound, help ? 'uncertain' : 'different', dataset)
      assert(record)
      const submitted = act(state, 'lab:submit', { record })
      assert.notEqual(submitted, state)
      assert.equal(act(submitted, 'lab:submit', { record }), submitted, 'record and reward not applied twice')
      assert.equal(p(submitted).records[progress.labRound].dataset, dataset)
      if (progress.labRound === 5) assert(p(submitted).completed.includes('father_projection_authorized'))
      rounds.add(progress.labRound); state = submitted; continue
    }
    const node = getLdctNode(state), choices = getLdctChoices(state)
    if (choices.length) {
      reachedChoices.push(clone(state))
      state = act(state, 'choose', { nodeId: node.id, choiceId: choices[0].id })
    } else state = act(state, 'advance', { nodeId: node.id })
  }
  assert.fail(`father flow did not finish: ${p(state).nodeId}`)
}
const completed = walk(initial)
assert.equal(completed.state.skill, base.skill + 1)
assert.equal(completed.state.wealth, base.wealth + 1)
assert.equal(completed.state.heart, base.heart)
assert.equal(completed.state.gold, base.gold)
assert(completed.state.badges.includes('ldct_noise_beyond'))
assert.equal(p(completed.state).records[5].dataset, 'chest')
assert.equal(act(completed.state, 'part:next'), completed.state)
assert.equal(getLdctNode(at(completed.state, 'lf_record_echo')).text.includes('你固定的那版'), true)
assert.equal(getLdctNode(at(completed.state, 'lf_record_echo')).text.includes('存疑标记'), true)

let overnight = at(selectLdctStory(initial, 'father'), 'lf_night1_end', { phase: 'settle' })
assert.match(ldctItemUnavailable(overnight, 'coffee'), /明晚/)
assert.equal(act(overnight, 'buy', { item: 'coffee' }), overnight)
overnight = act(overnight, 'buy', { item: 'milktea' })
assert.equal(overnight.gold, base.gold - 200)
assert.equal(overnight.heart, base.heart + 2)
assert.equal(p(overnight).phase, 'settle')
assert(overnight.items.includes('milktea'))
assert.equal(act(overnight, 'buy', { item: 'milktea' }), overnight)

// Reviewing a first-evening record cannot advance to evening2 or repeat awards.
let review = at(completed.state, 'lf_night1_end', { phase: 'settle', finished: undefined })
review = act(review, 'lab:open', { round: 1 })
assert.equal(p(review).labReturn, 'lf_night1_end')
const beforeReview = { skill: review.skill, wealth: review.wealth, gold: review.gold }
const reviewRecord = createLdctRecord({ ...p(review).labDraft, helped: true }, 1, 'uncertain', getLdctLabDataset(review))
review = act(review, 'lab:submit', { record: reviewRecord })
assert.equal(p(review).nodeId, 'lf_night1_end')
assert.equal(p(review).phase, 'settle')
assert.deepEqual({ skill: review.skill, wealth: review.wealth, gold: review.gold }, beforeReview)

for (const snapshot of reachedChoices) {
  const node = getLdctNode(snapshot)
  for (const option of getLdctChoices(snapshot)) {
    const result = act(snapshot, 'choose', { nodeId: node.id, choiceId: option.id })
    assert.equal(p(result).nodeId, option.next)
    if (option.decision) assert.equal(p(result).decisions[option.decision.key], option.decision.value)
  }
}
let chat = at(selectLdctStory(initial, 'father'), 'lf_rest_hub')
chat = act(chat, 'buy', { item: 'snack' })
assert.equal(chat.gold, base.gold - 40)
assert.match(ldctItemUnavailable(chat, 'snack'), /背包/)
assert.equal(act(chat, 'buy', { item: 'snack' }), chat)
chat = act(chat, 'choose', { nodeId: 'lf_rest_hub', choiceId: 'lu' })
assert(ldctGiftChoices(chat).some(g => g.person === 'luzhou' && g.item === 'snack'))
chat = act(chat, 'gift', { nodeId: 'lf_chat_lu_0', person: 'luzhou', item: 'snack' })
assert.equal(chat.heart, base.heart + 1)
assert(!chat.items.includes('snack'))
assert.equal(act(chat, 'gift', { nodeId: 'lf_chat_lu_0', person: 'luzhou', item: 'snack' }), chat)
chat = initializeLdct(clone(chat))
assert.equal(p(chat).reply.speaker, 'luzhou')
chat = act(chat, 'reply:close')
assert.equal(ldctGiftChoices(chat).length, 0)
for (let i = 0; i < 3; i++) chat = act(chat, 'advance', { nodeId: p(chat).nodeId })
assert.equal(p(chat).nodeId, 'lf_rest_hub')
assert(!getLdctChoices(chat).some(c => c.id === 'lu'), 'completed optional chat hides without hiding the other')
assert(getLdctChoices(chat).some(c => c.id === 'he'))

const oldProgress = { ...p(selectLdctStory(initial, 'father')), openingRevision: 3, storyId: 'face', nodeId: 'sf_lab_3',
  receipts: ['reward:comparison', 'reward:records'], finished: true }
const legacySlots = { face: oldProgress, dinner: { ...oldProgress, storyId: 'dinner', nodeId: 'sd_start' },
  patient: { ...oldProgress, storyId: 'patient', nodeId: 'sp_start' } }
const prior = { ...clone(base), dlc: { ...clone(base.dlc), ldct: { ldct: oldProgress, ldctStories: {
  version: 1, active: 'face', slots: clone(legacySlots), receipts: ['reward:comparison', 'reward:records'], experienced: [1, 2, 3, 4, 5],
  legacy: { ...oldProgress, openingRevision: 2, storyId: undefined, nodeId: 'research_report' },
} } } }
const migrated = initializeLdct(prior)
assert.equal(getLdctShelf(migrated).active, undefined)
assert.deepEqual(getLdctShelf(migrated).slots, legacySlots)
assert.deepEqual(getLdctShelf(migrated).legacy, prior.dlc.ldct.ldctStories.legacy)
assert.deepEqual(getLdctShelf(migrated).receipts, prior.dlc.ldct.ldctStories.receipts)
const inherited = walk(migrated, true).state
assert.equal(inherited.skill, base.skill, 'old reward receipt suppresses a new copy')
assert.equal(inherited.wealth, base.wealth)
for (const id of ['face', 'dinner', 'patient']) assert.deepEqual(getLdctShelf(inherited).slots[id], legacySlots[id])
assert.equal(p(inherited).records[5].helped, true)
assert.doesNotMatch(getLdctNode(at(inherited, 'lf_record_echo')).text, /你固定的|你留的存疑标记/, 'no invented pin/mark on help-only route')
const replay = selectLdctStory(inherited, 'father', true)
assert.equal(p(replay).nodeId, 'lf_start')
assert.equal(p(replay).finished, undefined)
assert.deepEqual(p(replay).records, {})
assert.deepEqual(getLdctShelf(replay).receipts, getLdctShelf(inherited).receipts)
assert.equal(replay.skill, inherited.skill)
assert.equal(p(openLdctShelf(replay)), undefined)
assert.equal(p(selectLdctStory(openLdctShelf(replay), 'father')).run, p(replay).run)

const fourPart = initializeLdct({ ...clone(base), dlc: { ...clone(base.dlc), ldct: { ldct: oldProgress } } })
assert.deepEqual(getLdctShelf(fourPart).legacy, oldProgress)
assert.deepEqual(getLdctShelf(fourPart).slots, {})
assert.deepEqual(getLdctShelf(fourPart).receipts, ['reward:comparison', 'reward:records'])
console.log(`PASS: father story ${completed.steps} pure transitions; two evenings, five same-source tools, direct help, old archives, receipts, gifts, refresh and main-game isolation.`)
