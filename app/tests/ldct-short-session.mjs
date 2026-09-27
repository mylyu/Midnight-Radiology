import assert from 'node:assert/strict'
import { freshState } from '../src/game/store.ts'
import { LDCT_STEPS, getLdctNode, getLdctChoices } from '../src/game/ldct.ts'
import { LDCT_STORIES } from '../src/game/ldct-short-stories.ts'
import { createLdctLabState, createLdctRecord, ldctExperimentReady } from '../src/game/ldct-experiments.ts'
import { LDCT_DATASET_SEEDS } from '../src/game/ldct-projections.ts'
import {
  initializeLdct, selectLdctStory, openLdctShelf, getLdctShelf, getLdctProgress,
  ldctAction, ldctGiftChoices, ldctItemUnavailable, ldctCanRest,
} from '../src/game/ldct-session.ts'

const base = { ...freshState('m'), gold: 2200, skill: 23, heart: 11, wealth: 7,
  night: 4, ap: 2, buyCount: 13, lotteryCount: 4, lotteryNight: 4,
  playerName: '短篇隔离测试', playerId: 'LDCT-SHORT-TEST', stepId: 'n4_hub', resumeKey: '4-n4_hub',
  flags: { quiz_grade: 'A', quiz2_grade: 'S', archive_film: true },
  dlc: { ch2: { done: true, certificate: { code: 'YSK2-KEEP' }, purchaseCounts: { 3: 4 } },
    dr: { done: true, served: ['keep'] }, dsa: { dose: 275, pedalTry: 2 } } }
const clone = value => JSON.parse(JSON.stringify(value))
const act = (state, type, fields = {}) => ldctAction(state, { type, ...fields })
const progress = getLdctProgress
const protection = state => {
  const copy = structuredClone(state)
  for (const key of ['gold', 'skill', 'heart', 'wealth', 'items', 'badges']) delete copy[key]
  delete copy.dlc.ldct
  return copy
}
const protectedBase = protection(base)
const stats = state => ({ skill: state.skill, wealth: state.wealth, heart: state.heart, gold: state.gold })

// Isolated fixtures update both the active slot and compatibility facade. They
// never touch browser storage, main chapter data or an actual player's saves.
function at(state, nodeId, patch = {}) {
  const p = { ...progress(state), nodeId, phase: 'story', reply: undefined, ...patch }
  const shelf = getLdctShelf(state)
  return { ...state, dlc: { ...state.dlc, ldct: { ...state.dlc.ldct, ldct: p,
    ldctStories: { ...shelf, active: p.storyId, slots: { ...shelf.slots, [p.storyId]: p } } } } }
}
const nodesFor = story => Object.values(LDCT_STEPS).filter(node => node.id.startsWith(story.start.slice(0, 3)))
const labNode = (story, round) => nodesFor(story).find(node => node.enterLab === round)

// Each normal experiment needs one meaningful operation, not a checklist.
function operated(round) {
  const d = createLdctLabState(round)
  if (round === 1) Object.assign(d, { structure: 'bead', seenStructures: ['bead'] })
  if (round === 2) d.bpStep = 1
  if (round === 3) Object.assign(d, { filter: 'hann', seenFilters: ['ramp', 'hann'] })
  if (round === 4) Object.assign(d, { signal: 'medium', seenSignals: ['high', 'medium'] })
  if (round === 5) Object.assign(d, { iterationStep: 1, seenIterations: [0, 1] })
  assert(ldctExperimentReady(d, round))
  return d
}

assert.equal(LDCT_STORIES.length, 3)
let state = initializeLdct(structuredClone(base))
assert.equal(getLdctShelf(state).active, undefined, 'migration does not silently start a story')
assert.equal(progress(state), undefined)
assert.equal(initializeLdct(state), state)
assert.equal(selectLdctStory(state, 'missing'), state)
assert.equal(act(state, 'buy', { item: 'snack' }), state)
assert.equal(act(state, 'advance', { nodeId: LDCT_STORIES[0].start }), state)
assert.deepEqual(protection(state), protectedBase)

for (const node of Object.values(LDCT_STEPS)) {
  assert(Object.hasOwn(node, 'sprite'), `${node.id}: portrait state must be explicit`)
  for (const target of [node.next, ...(node.choices ?? []).map(choice => choice.next)].filter(Boolean)) {
    assert(LDCT_STEPS[target], `${node.id}: missing target ${target}`)
    assert.equal(target.slice(0, 3), node.id.slice(0, 3), 'alternative stories cannot silently become one timeline')
  }
}

const choiceSnapshots = []
let transitions = 0
function walk(input, story) {
  let current = selectLdctStory(input, story.id)
  const picked = new Set(), rounds = new Set()
  for (let guard = 0; guard < 240; guard++) {
    const p = progress(current)
    assert.deepEqual(protection(current), protectedBase)
    if (p.phase === 'settle') {
      assert(p.finished, `${story.id}: reached a premature settlement`)
      assert.equal(rounds.size, 5, `${story.id}: all five short tools stay reachable`)
      return current
    }
    if (p.phase === 'lab') {
      const draft = operated(p.labRound)
      current = act(current, 'lab:update', { value: draft })
      const record = createLdctRecord(draft, p.labRound, 'different', story.dataset)
      assert(record)
      const submitted = act(current, 'lab:submit', { record })
      assert.notEqual(submitted, current)
      assert.equal(act(submitted, 'lab:submit', { record }), submitted, 'double submit does not reward or move twice')
      assert.equal(progress(submitted).records[p.labRound].dataset, story.dataset)
      rounds.add(p.labRound)
      current = initializeLdct(clone(submitted))
    } else {
      const node = getLdctNode(current)
      const choices = getLdctChoices(current)
      let action
      if (choices.length) {
        choiceSnapshots.push(clone(current))
        const fresh = choices.filter(choice => !picked.has(`${node.id}:${choice.id}`))
        const selected = fresh.find(choice => choice.unless) ?? fresh[0] ?? choices[0]
        picked.add(`${node.id}:${selected.id}`)
        action = { type: 'choose', nodeId: node.id, choiceId: selected.id }
      } else action = { type: 'advance', nodeId: node.id }
      const next = ldctAction(current, action)
      assert.notEqual(next, current, `stalled at ${node.id}`)
      assert.equal(ldctAction(next, action), next, 'stale gesture cannot advance the next dialogue')
      current = next
    }
    transitions++
  }
  throw new Error(`${story.id}: unexpected story loop`)
}
for (const story of LDCT_STORIES) {
  const others = clone(getLdctShelf(state).slots)
  state = walk(openLdctShelf(state), story)
  for (const [id, saved] of Object.entries(others)) if (id !== story.id) assert.deepEqual(clone(getLdctShelf(state).slots[id]), saved)
  assert.equal(state.skill, base.skill + 1)
  assert.equal(state.wealth, base.wealth + 1)
  assert.equal(state.gold, base.gold)
  assert.equal(state.heart, base.heart)
  assert.deepEqual([...getLdctShelf(state).experienced].sort(), [1, 2, 3, 4, 5])
  assert.equal(getLdctShelf(state).receipts.filter(id => id === 'reward:comparison').length, 1)
  assert.equal(getLdctShelf(state).receipts.filter(id => id === 'reward:records').length, 1)
  assert.equal(state.badges.filter(id => id === 'ldct_noise_beyond').length, 1)
}

// Local alternative branches: exercise every currently available choice once,
// without repeatedly walking each whole story or pinning author-edited IDs.
for (const snapshot of choiceSnapshots) for (const choice of getLdctChoices(snapshot)) {
  const before = clone(snapshot)
  const result = act(snapshot, 'choose', { nodeId: progress(snapshot).nodeId, choiceId: choice.id })
  assert.notEqual(result, snapshot)
  assert.equal(progress(result).nodeId, choice.next)
  if (choice.decision) assert.equal(progress(result).decisions[choice.decision.key], choice.decision.value)
  if (choice.complete) assert(progress(result).completed.includes(choice.complete))
  assert.deepEqual(snapshot, before, 'transitions must not mutate input snapshots')
  assert.deepEqual(protection(result), protectedBase)
}

// Replay resets one slot only, never the shared learning receipts or other slots.
const firstStory = LDCT_STORIES[0]
const otherSlots = clone(getLdctShelf(state).slots)
const sharedBefore = clone(getLdctShelf(state).receipts)
const valuesBefore = stats(state)
state = selectLdctStory(state, firstStory.id, true)
assert.equal(progress(state).run, otherSlots[firstStory.id].run + 1)
assert.equal(progress(state).finished, undefined)
assert.deepEqual(progress(state).records, {})
assert.deepEqual(getLdctShelf(state).receipts, sharedBefore)
assert.deepEqual(stats(state), valuesBefore)
for (const story of LDCT_STORIES.slice(1)) assert.deepEqual(clone(getLdctShelf(state).slots[story.id]), otherSlots[story.id])
state = at(state, labNode(firstStory, 1).id, { phase: 'lab', labRound: 1, labDraft: createLdctLabState(1) })
const helpRecord = createLdctRecord({ ...progress(state).labDraft, helped: true }, 1, 'uncertain', firstStory.dataset)
const helped = act(state, 'lab:submit', { record: helpRecord })
assert.notEqual(helped, state, 'one help click can submit a fresh experiment without artificial checklist operations')
assert(progress(helped).records[1].helped)
assert.deepEqual(stats(helped), valuesBefore)
assert.deepEqual(getLdctShelf(helped).receipts, sharedBefore)
let firstHelp = selectLdctStory(initializeLdct(structuredClone(base)), firstStory.id)
firstHelp = at(firstHelp, labNode(firstStory, 1).id, { phase: 'lab', labRound: 1, labDraft: createLdctLabState(1) })
const helpOnly = createLdctRecord({ ...progress(firstHelp).labDraft, helped: true }, 1, 'uncertain', firstStory.dataset)
firstHelp = act(firstHelp, 'lab:submit', { record: helpOnly })
assert.equal(firstHelp.skill, base.skill+1, 'asking for help still receives the single shared learning award')
assert.equal(act(firstHelp, 'lab:submit', { record: helpOnly }), firstHelp)

// Three unfinished controls persist independently, including refresh and switching.
let switches = initializeLdct(structuredClone(base))
const drafts = []
for (const [index, story] of LDCT_STORIES.entries()) {
  switches = selectLdctStory(switches, story.id)
  const draft = { ...operated(3), divider: 24 + index*19, filter: ['hann', 'cosine', 'none'][index] }
  switches = at(switches, labNode(story, 3).id, { phase: 'lab', labRound: 3, labDraft: createLdctLabState(3) })
  switches = act(switches, 'lab:update', { value: draft })
  drafts.push(clone(draft))
}
switches = initializeLdct(clone(openLdctShelf(switches)))
for (const [index, story] of LDCT_STORIES.entries()) {
  switches = selectLdctStory(switches, story.id)
  assert.equal(progress(switches).phase, 'lab')
  assert.deepEqual(progress(switches).labDraft, drafts[index])
  const wrong = createLdctRecord(drafts[index], 3, 'different', LDCT_STORIES[(index+1)%3].dataset)
  assert.equal(act(switches, 'lab:submit', { record: wrong }), switches, 'stale record from another dataset is refused')
  assert.equal(act(switches, 'lab:update', { value: { ...drafts[index], angle: NaN } }), switches)
}

// Archive a genuine old-shaped save verbatim; it is not interpreted as new progress.
const legacy = { version: 1, openingRevision: 2, run: 3, seed: 2258, phase: 'research', nodeId: 'r3_blind',
  revision: 17, fatigue: 4, completed: ['rest'], decisions: { research_scope: 'authorized' },
  receipts: ['reward:comparison', 'reward:records', 'coffee:2'], gifts: [{ person: 'lei', item: 'snack', nodeId: 'r2_lei_0' }],
  labRound: 5, labDraft: createLdctLabState(5), records: {}, research: { stage: 'blind', untouched: '旧观察' },
  researchRecords: { roster: { untouched: '原始分工' } }, start: { gold: 12, skill: 3, heart: 4, wealth: 5 } }
const legacySnapshot = clone(legacy)
let migrated = initializeLdct({ ...structuredClone(base), dlc: { ...base.dlc, ldct: { ldct: legacy, untouched: '其他兼容字段' } } })
assert.equal(progress(migrated), undefined)
assert.deepEqual(getLdctShelf(migrated).legacy, legacySnapshot)
migrated = selectLdctStory(migrated, firstStory.id)
for (const round of [1, 2, 3, 4, 5]) {
  migrated = at(migrated, labNode(firstStory, round).id, { phase: 'lab', labRound: round, labDraft: createLdctLabState(round) })
  const record = createLdctRecord({ ...progress(migrated).labDraft, helped: true }, round, 'uncertain', firstStory.dataset)
  migrated = act(migrated, 'lab:submit', { record })
}
assert.deepEqual(stats(migrated), stats(base), 'legacy learning receipts suppress new-candidate farming')
assert.deepEqual(getLdctShelf(migrated).legacy, legacySnapshot)
assert.deepEqual(legacy, legacySnapshot)
assert.equal(migrated.dlc.ldct.untouched, '其他兼容字段')
assert.equal(act(migrated, 'research:submit', { stage: 'blind' }), migrated)
assert.equal(act(migrated, 'part:next'), migrated)

// Hub-only shopping, real in-person gift consumption, and refresh-safe replies.
let shop = selectLdctStory(initializeLdct(structuredClone(base)), firstStory.id)
assert.equal(act(shop, 'buy', { item: 'snack' }), shop)
const hub = nodesFor(firstStory).find(node => node.kind === 'hub')
const giftNodes = nodesFor(firstStory).filter(node => node.giftPerson)
assert(hub && giftNodes.length)
shop = at(shop, hub.id)
assert(ldctCanRest(shop))
shop = act(shop, 'rest')
assert.equal(act(shop, 'rest'), shop)
shop = act(shop, 'reply:close')
assert(!ldctCanRest(shop))
shop = act(shop, 'buy', { item: 'coffee' })
assert.equal(shop.ap, base.ap)
assert.equal(act(shop, 'buy', { item: 'coffee' }), shop)
shop = act(shop, 'reply:close')
shop = act(shop, 'buy', { item: 'milktea' })
assert.equal(shop.heart, base.heart+2)
assert.equal(act(shop, 'buy', { item: 'milktea' }), shop)
shop = act(shop, 'buy', { item: 'snack' })
assert.equal(shop.gold, base.gold-270)
assert.equal(ldctGiftChoices(shop).length, 0)
shop = at(shop, giftNodes[0].id)
assert.equal(ldctGiftChoices(shop).length, 2)
const who = giftNodes[0].giftPerson
shop = act(shop, 'gift', { person: who, item: 'milktea', nodeId: giftNodes[0].id })
assert(!shop.items.includes('milktea'))
assert.equal(shop.heart, base.heart+2, 'milk benefits happen at purchase, not twice')
assert.equal(act(shop, 'gift', { person: who, item: 'snack', nodeId: giftNodes[0].id }), shop)
assert.equal(act(shop, 'advance', { nodeId: giftNodes[0].id }), shop)
shop = initializeLdct(clone(shop))
assert(progress(shop).reply)
shop = act(shop, 'reply:close')
assert.equal(ldctGiftChoices(shop).length, 0, 'same colleague cannot receive another gift in one short story')
const otherPerson = giftNodes.find(node => node.giftPerson !== who)
assert(otherPerson, 'fixture story should expose a second actual colleague')
shop = at(shop, otherPerson.id)
assert.equal(act(shop, 'gift', { person: who, item: 'snack', nodeId: otherPerson.id }), shop, 'wrong portrait/recipient refused')
shop = act(shop, 'gift', { person: otherPerson.giftPerson, item: 'snack', nodeId: otherPerson.id })
assert(!shop.items.includes('snack'))
assert.equal(shop.heart, base.heart+3)
assert.equal(act(shop, 'gift', { person: otherPerson.giftPerson, item: 'snack', nodeId: otherPerson.id }), shop)
assert.deepEqual(protection(shop), protectedBase)
const finish = nodesFor(firstStory).find(node => node.storyEnd)
shop = at(shop, finish.id, { phase: 'settle', finished: true })
assert.match(ldctItemUnavailable(shop, 'snack'), /已结束/)
assert.equal(act(shop, 'buy', { item: 'snack' }), shop)

// Provenance reflects actual datasets, not a single hardcoded phantom seed.
for (const story of LDCT_STORIES) {
  const record = createLdctRecord(operated(1), 1, 'different', story.dataset)
  assert.equal(record.seed, LDCT_DATASET_SEEDS[story.dataset])
}
console.log(`LDCT short session: 3 independent paths (${transitions} pure transitions), all local alternatives, shared rewards, archival migration, controls, one-click help, gifts and cross-chapter isolation passed.`)
