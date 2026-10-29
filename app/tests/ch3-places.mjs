// Focused location/scene regression. No full-chapter or other-chapter playthrough.
// node --import tsx tests/ch3-places.mjs
import assert from 'node:assert/strict'
import { CH3 } from '../src/game/ch3.ts'
import { freshState, condOk } from '../src/game/store.ts'
import { initializeTrilogy, patchTrilogy, enterTrilogyNode, trilogyProgress,
  trilogyStep, trilogyChoose, trilogyAdvance } from '../src/game/trilogy-session.ts'

const clone = value => JSON.parse(JSON.stringify(value))
const numbers = s => Object.fromEntries(['gold', 'skill', 'heart', 'wealth', 'ap'].map(key => [key, s[key]]))
function fixture(node, { flags = {}, items = [], ap = 3 } = {}) {
  const base = { ...freshState('f'), seed: 20261026, gold: 730, skill: 12, heart: 9, wealth: 4,
    flags: { preserved_first_chapter: true, ...flags }, items,
    dlc: { ch2: { done: true, marker: 'previous-certificate' }, ldct: { done: true, marker: 'keep' } } }
  const s = initializeTrilogy(base, CH3, 'ch3-places')
  const shift = Number(node.match(/^c3_s(\d)/)?.[1] ?? 1) - 1
  return enterTrilogyNode(patchTrilogy({ ...s, ap }, 'ch3', { shift }), CH3, node)
}
const choices = s => trilogyStep(s, CH3).choices ?? []
function pick(s, next) {
  const choice = choices(s).find(c => c.next === next)
  assert(choice, `Choice to ${next} exists at ${trilogyProgress(s, 'ch3').stepId}`)
  return trilogyChoose(s, CH3, trilogyProgress(s, 'ch3').stepId, choice)
}
function finishScene(s, hub) {
  for (let i = 0; i < 30; i++) {
    const node = trilogyProgress(s, 'ch3').stepId
    if (node === hub) return s
    assert.equal(choices(s).length, 0, `This fixture follows an ordinary scene, not another activity: ${node}`)
    const next = trilogyAdvance(s, CH3, node)
    assert.notEqual(trilogyProgress(next, 'ch3').stepId, node, `Scene advances at ${node}`)
    s = next
  }
  assert.fail(`Scene did not return to ${hub}`)
}

// A single event opens directly from its place; optional supplies group with
// that place instead of adding another person/action to the corridor menu.
const plain = fixture('c3_s1_hub')
const restDirect = choices(plain).find(c => c.next === 'c3_s1_tea_0')
assert(restDirect && /休息室/.test(restDirect.text))
assert(/^\p{Extended_Pictographic}/u.test(restDirect.text.trimStart()))
const withStickers = fixture('c3_s1_hub', { items: ['c3_cup_stickers'] })
assert(choices(withStickers).some(c => c.next === 'c3_s1_place_rest'))
assert(!choices(withStickers).some(c => c.next === 'c3_s1_stickers_use_0'))

// Current contract: the second shift offers He's break-room conversation.
// Retired workstation cursors remain free, reward-free bridges to the hub.
const breakHub = fixture('c3_s2_hub')
const breakChoice = choices(breakHub).find(c => c.next === 'c3_s2_he_0')
assert.equal(breakChoice.text, '☕ 休息室')
for (const node of ['c3_s2_he_0', 'c3_s2_he_1', 'c3_s2_he_2'])
  assert.equal(trilogyStep(fixture(node), CH3).bg, 'ch2_bg_breakroom_day')
let breakRoom = pick(breakHub, 'c3_s2_he_0')
assert.equal(breakRoom.ap, breakHub.ap - 1)
breakRoom = finishScene(breakRoom, 'c3_s2_hub')
assert(breakRoom.flags.c3_s2_he_done)
assert(breakRoom.items.includes('snack'))
assert(!(breakRoom.cards ?? []).includes('c3_compare'), 'The retired workstation card is not re-awarded')
assert(!choices(breakRoom).some(c => /休息室/.test(c.text)))
for (const node of ['c3_s2_place_reading', 'c3_s2_label_0', 'c3_s2_label_1', 'c3_s2_label_2']) {
  const legacy = fixture(node), before = numbers(legacy)
  assert.equal(trilogyStep(legacy, CH3).bg, 'bg_waiting_day_v2')
  const restored = finishScene(legacy, 'c3_s2_hub')
  assert.deepEqual(numbers(restored), before)
  assert(!restored.flags.c3_s2_label_done)
  assert(!(restored.cards ?? []).includes('c3_compare'))
}
for (const step of Object.values(CH3.steps)) {
  assert(!/阅片室|阅片资料区/.test(step.text))
  for (const choice of step.choices ?? []) assert(!/阅片室|阅片资料区/.test(choice.text))
}

// Entering/leaving a room is free. The original event, not its menu, spends AP.
let inRest = pick(withStickers, 'c3_s1_place_rest')
assert.deepEqual(numbers(inRest), numbers(withStickers))
assert.deepEqual(inRest.flags, withStickers.flags)
const returnChoice = choices(inRest).find(c => c.next === 'c3_s1_hub')
assert(returnChoice && returnChoice.text.startsWith('🚪'))
const leftRest = pick(inRest, 'c3_s1_hub')
assert.deepEqual(numbers(leftRest), numbers(withStickers))
inRest = pick(leftRest, 'c3_s1_place_rest')
const teaChoice = choices(inRest).find(c => c.next === 'c3_s1_tea_0')
let tea = pick(inRest, 'c3_s1_tea_0')
assert.equal(tea.ap, withStickers.ap - 1)
assert.deepEqual(trilogyChoose(tea, CH3, 'c3_s1_place_rest', teaChoice), tea,
  'A stale second click cannot pay for the event twice')

// Having visited a place is not completion of every independent thing inside.
tea = finishScene(tea, 'c3_s1_hub')
assert(tea.flags.c3_s1_tea_done)
assert(choices(tea).some(c => c.next === 'c3_s1_stickers_use_0'), 'The unused cup stickers keep the room reachable')
assert(!choices(tea).some(c => c.next === 'c3_s1_tea_0'), 'The finished conversation is hidden')
const beforeStickers = numbers(tea)
let used = finishScene(pick(tea, 'c3_s1_stickers_use_0'), 'c3_s1_hub')
assert(used.flags.c3_stickers_used)
assert(!used.items.includes('c3_cup_stickers'))
assert(used.badges.includes('c3_cup_detective'))
assert.deepEqual(numbers(used), beforeStickers, 'The original free item interaction adds no menu cost or new stats')
assert(!choices(used).some(c => /休息室/.test(c.text)), 'A room with no remaining events is hidden')
const resumed = enterTrilogyNode(clone(used), CH3, 'c3_s1_stickers_use_4')
assert.deepEqual(resumed.items, used.items)
assert.deepEqual(resumed.badges, used.badges)
assert.deepEqual(numbers(resumed), numbers(used), 'Resume cannot consume or reward the item twice')

// Zero AP still permits a free inventory use; an ordinary visit remains locked.
let exhausted = fixture('c3_s1_hub', { items: ['c3_cup_stickers'], ap: 0 })
exhausted = pick(exhausted, 'c3_s1_place_rest')
const lockedTea = choices(exhausted).find(c => c.next === 'c3_s1_tea_0')
assert(lockedTea && !condOk(exhausted, lockedTea.cond))
assert.deepEqual(pick(exhausted, 'c3_s1_tea_0'), exhausted)
exhausted = finishScene(pick(exhausted, 'c3_s1_stickers_use_0'), 'c3_s1_hub')
assert.equal(exhausted.ap, 0)
assert(exhausted.flags.c3_stickers_used)

// Retired supply-area saves also return safely without reviving old AP costs,
// completion flags or a second route through removed scenes.
for (const node of ['c3_s4_pack_0', 'c3_s4_cost_0', 'c3_s4_place_supplies']) {
  const legacy = fixture(node, { ap: 2 }), before = numbers(legacy)
  const restored = finishScene(legacy, 'c3_s4_hub')
  assert.deepEqual(numbers(restored), before)
  assert(!restored.flags.c3_s4_pack_done && !restored.flags.c3_gel_account_done)
  assert(!choices(restored).some(c => c.next === 'c3_s4_place_supplies'))
}

// Existing in-scene saves finish normally; the new menu does not reset old chapters.
const legacy = fixture('c3_s1_tea_1', { ap: 2 })
const completed = finishScene(clone(legacy), 'c3_s1_hub')
assert.deepEqual(numbers(completed), numbers(legacy))
assert.deepEqual(completed.dlc.ch2, legacy.dlc.ch2)
assert.deepEqual(completed.dlc.ldct, legacy.dlc.ldct)
assert(completed.flags.preserved_first_chapter)
assert.equal(completed.night, legacy.night)

// Explicit cast, rather than previous-node inheritance, also works on fresh loads.
for (const [node, sprite] of [
  ['c3_s1_tea_1', 'char_mei'], ['c3_s2_he_1', 'ch2_pixel_char_he'],
  ['c3_tang_break_1', 'char_tang'], ['c3_s4_lei_1', 'char_lei'], ['c3_s5_zhou_1', 'char_zhou'],
]) assert.equal(trilogyStep(fixture(node), CH3).sprite, sprite, node)
for (const node of ['c3_intro_call_2', 'c3_intro_confirm_1', 'c3_s2_start_1', 'c3_s4_zhou_1']) {
  const step = trilogyStep(fixture(node), CH3)
  assert(!step.sprite && !step.sprite2, `Remote contact stays remote at ${node}`)
}
for (let shift = 1; shift <= 5; shift++) {
  const hub = trilogyStep(fixture(`c3_s${shift}_hub`), CH3)
  assert(!hub.sprite && !hub.sprite2, 'A corridor menu cannot keep the previous visitor')
}
const paired = trilogyStep(fixture('c3_s2_arrive_11'), CH3)
assert.equal(paired.sprite, 'pat_cousin')
assert.equal(paired.sprite2, 'char_mei')
for (const node of ['c3_epilogue_14', 'c3_epilogue_20']) {
  const step = trilogyStep(fixture(node, { flags: { c3_cousin_followup_stable: true } }), CH3)
  assert(!step.sprite && !step.sprite2, 'Legacy return-to-work ending cannot carry the cousin into the office')
}
console.log('PASS CH3 place grouping, free travel, independent events, AP/item idempotence, legacy progress and explicit cast')
