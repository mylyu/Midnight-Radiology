import assert from 'node:assert/strict'
import { freshState } from '../src/game/store.ts'
import { LDCT_STEPS, getLdctNode, getLdctChoices } from '../src/game/ldct.ts'
import { createLdctLabState, createLdctRecord } from '../src/game/ldct-experiments.ts'
import { initializeLdct, getLdctProgress, ldctAction, ldctGiftChoices, ldctItemUnavailable } from '../src/game/ldct-session.ts'

const base = { ...freshState('m'), seed: 1729, gold: 1000, skill: 20, heart: 9, wealth: 3,
  night: 4, ap: 3, buyCount: 12, lotteryCount: 4, lotteryNight: 4,
  playerName: '测试学生', playerId: 'BME-TEST', stepId: 'n4_hub', resumeKey: '4-n4_hub',
  flags: { quiz_grade: 'S', quiz2_grade: 'A', archive_film: true },
  dlc: { ch2: { phase: 'done', done: true, certificate: { code: 'YSK2-test' } },
    dr: { done: true, served: ['a'] }, dsa: { dose: 250, pedalTry: 3 } } }
const protectedState = s => {
  const copy = structuredClone(s)
  for (const key of ['gold', 'skill', 'heart', 'wealth', 'items', 'badges']) delete copy[key]
  delete copy.dlc.ldct
  return copy
}
const protectedBase = protectedState(base)
const goto = (s, id, phase = 'story') => ({ ...s, dlc: { ...s.dlc, ldct: { ...s.dlc.ldct,
  ldct: { ...getLdctProgress(s), nodeId: id, phase, reply: undefined } } } })
const act = (s, type, fields = {}) => ldctAction(s, { type, ...fields })
let s = initializeLdct(base)
assert.equal(initializeLdct(s), s)
assert.equal(getLdctProgress(s).seed, 2258)
assert.deepEqual(protectedState(s), protectedBase)
assert.equal(getLdctNode(s).sprite, 'ch2_pixel_char_luzhou_m')
assert.equal(getLdctNode({ ...s, gender: 'f' }).sprite, 'ch2_pixel_char_luzhou_f')
assert.equal(getLdctNode(goto(s, 'hub')).sprite, null, 'unoccupied menu never retains NPC')

// Every branch is connected; marker/lab/settlement nodes intentionally lack normal next.
for (const node of Object.values(LDCT_STEPS)) {
  assert(Object.hasOwn(node, 'sprite'))
  for (const target of [node.next, ...(node.choices ?? []).map(c => c.next)].filter(Boolean)) {
    assert(LDCT_STEPS[target], `${node.id} -> missing ${target}`)
  }
}

// A stale double click cannot advance the next node or submit another branch.
const first = getLdctProgress(s).nodeId
s = act(s, 'advance', { nodeId: first })
assert.equal(act(s, 'advance', { nodeId: first }), s)
s = goto(s, 'chief_q')
s = act(s, 'choose', { nodeId: 'chief_q', choiceId: 'later' })
assert.equal(getLdctProgress(s).decisions.chief, 'later')
assert.equal(act(s, 'choose', { nodeId: 'chief_q', choiceId: 'tell' }), s)
assert(!getLdctChoices(goto(s, 'hub')).some(c => c.id === 'chief'))

// Independent shop counters; coffee is not an AP farm; milk timing matches main game.
s = goto(s, 'hub')
const beforeShop = s
s = act(s, 'buy', { item: 'coffee' })
assert.equal(s.gold, beforeShop.gold - 30)
assert.equal(s.ap, beforeShop.ap)
assert.equal(getLdctProgress(s).fatigue, 1)
assert.equal(act(s, 'buy', { item: 'coffee' }), s)
s = act(s, 'reply:close')
s = act(s, 'buy', { item: 'milktea' })
assert.equal(s.heart, beforeShop.heart + 2)
assert.equal(act(s, 'buy', { item: 'milktea' }), s)
s = act(s, 'buy', { item: 'snack' })
assert.equal(s.gold, beforeShop.gold - 270)
assert.deepEqual(protectedState(s), protectedBase)

// Gifts are only in person and reply+consumption is one persistent transaction.
assert.equal(ldctGiftChoices(s).length, 0)
s = goto(s, 'chat_lu_0')
assert.equal(ldctGiftChoices(s).length, 2)
const beforeMilk = s.heart
s = act(s, 'gift', { nodeId: 'chat_lu_0', person: 'luzhou', item: 'milktea' })
assert(!s.items.includes('milktea'))
assert.equal(s.heart, beforeMilk)
assert.equal(act(s, 'gift', { nodeId: 'chat_lu_0', person: 'luzhou', item: 'snack' }), s)
assert.equal(act(s, 'advance', { nodeId: 'chat_lu_0' }), s, 'reply must be seen first')
s = JSON.parse(JSON.stringify(s))
assert(getLdctProgress(s).reply.text.length > 0)
s = act(s, 'reply:close')
assert.equal(ldctGiftChoices(s).length, 0, 'one gift per colleague per run')
s = goto(s, 'chat_lei_0')
s = act(s, 'gift', { nodeId: 'chat_lei_0', person: 'lei', item: 'snack' })
assert.equal(s.heart, beforeMilk + 1)
assert(!s.items.includes('snack'))

// Complete opening on a single route; lab chooses help/uncertainty, not forced correctness.
s = initializeLdct(s, true)
const runStart = { skill: s.skill, wealth: s.wealth, gold: s.gold, heart: s.heart }
let visited = 0
while (getLdctProgress(s).phase !== 'settle') {
  assert(++visited < 200, 'opening must reach a stayable ending')
  const p = getLdctProgress(s), node = getLdctNode(s)
  if (p.phase === 'lab') {
    const draft = { ...createLdctLabState(), pinned: { signal: 'medium', algorithm: 'fbp', strength: 1 },
      candidate: { signal: 'medium', algorithm: 'iterative', strength: 2 }, helped: true, mark: { x: 40, y: 60 } }
    s = act(s, 'lab:update', { value: draft })
    s = JSON.parse(JSON.stringify(s))
    assert.deepEqual(getLdctProgress(s).labDraft, draft)
    const record = createLdctRecord(draft, p.labRound, 'uncertain')
    s = act(s, 'lab:update', { value: { ...draft, saved: record } })
    const paused = act(s, 'lab:close')
    assert.equal(getLdctProgress(paused).phase, 'story')
    s = act(paused, 'advance', { nodeId: getLdctProgress(paused).nodeId })
    assert.deepEqual(getLdctProgress(s).labDraft.saved, record, 'back/re-enter preserves comparison reveal')
    s = act(s, 'lab:submit', { record })
    assert.equal(act(s, 'lab:submit', { record }), s)
    continue
  }
  const choices = getLdctChoices(s)
  if (choices.length) {
    const selected = node.id === 'hub' ? choices.find(c => c.id === 'experiment')
      : node.id === 'organize_q' ? choices.find(c => c.id === 'later') : choices[0]
    s = act(s, 'choose', { nodeId: node.id, choiceId: selected.id })
  } else s = act(s, 'advance', { nodeId: node.id })
}
assert.equal(s.skill, runStart.skill + 1)
assert.equal(s.wealth, runStart.wealth + 1, 'deferred organization grants its own one-time growth')
assert.equal(s.gold, runStart.gold)
assert.equal(s.heart, runStart.heart)
assert(s.badges.includes('ldct_first_comparison'))
assert.deepEqual(Object.keys(getLdctProgress(s).records), ['1', '2'])
assert.deepEqual(protectedState(s), protectedBase)
assert.match(ldctItemUnavailable(s, 'snack'), /机会已过/)
assert.equal(getLdctProgress(initializeLdct(JSON.parse(JSON.stringify(s)))).phase, 'settle')

// Experiment replay is useful but never a way to re-issue skill or badges.
const completed = s, beforeReplay = s.skill
s = act(s, 'lab:open', { round: 2 })
assert.equal(getLdctProgress(s).phase, 'lab')
assert.equal(act(s, 'lab:submit', { record: getLdctProgress(completed).records[2] }), s, 'old record cannot skip this comparison')
s = act(s, 'lab:update', { value: { ...getLdctProgress(s).labDraft, saved: getLdctProgress(completed).records[2] } })
s = act(s, 'lab:submit', { record: getLdctProgress(completed).records[2] })
assert.equal(getLdctProgress(s).phase, 'settle')
assert.equal(s.skill, beforeReplay)
assert.equal(s.wealth, completed.wealth)
const newRun = initializeLdct(s, true)
assert.equal(getLdctProgress(newRun).run, getLdctProgress(s).run + 1)
assert.equal(getLdctProgress(newRun).records[1], undefined)
assert.equal(newRun.skill, s.skill)
assert.deepEqual(protectedState(newRun), protectedBase)

console.log(`LDCT session: graph, ${visited} progression steps, atomic choices/gifts/rewards, reload/revisit/replay, and other-chapter isolation passed.`)
