import assert from 'node:assert/strict'
import { logicalImagePath, liveMedia, assertHistoricalMedia } from './game-delivery-media.mjs'
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { CH2_SHIFTS, CH2_ACTIVE_BADGES, CH2_BADGES_LEGACY, ch2StepForState } from '../src/game/ch2.ts'
import { CH2_PAYOFF_KEEPSAKES } from '../src/game/ch2-payoffs.ts'
import { ch2SideBadgeBackfill } from '../src/game/ch2-side-badges.ts'
import { freshState, applyEffect } from '../src/game/store.ts'

const steps = Object.assign({}, ...CH2_SHIFTS.map(shift => shift.steps))
const initial = () => ({ ...freshState('f'), flags: { quiz_grade: 'S' }, items: [],
  dlc: { dr: { done: true }, dsa: { dose: 9 }, ch2: { shift: 'c2n5', phase: 'story' } } })
const render = (id, s = initial()) => ch2StepForState(id, steps[id], s)
assert.equal(CH2_ACTIVE_BADGES.length, 15)
assert.equal(CH2_BADGES_LEGACY.length, 5)
assert.equal(new Set(CH2_ACTIVE_BADGES).size, 15)
assert.equal(CH2_PAYOFF_KEEPSAKES.length, 7)
for (const gift of CH2_PAYOFF_KEEPSAKES) {
  assert(gift.image, `${gift.id}: actual illustration, not emoji alone`)
  assert(logicalImagePath(gift.image))
}
for (const [id, image, flags] of [
  ['c2n5_payoff_luo1', 'ch2_gift_luo_pouch_v1', { c2_needle_resolved: true }],
  ['c2n5_payoff_lei1', 'ch2_gift_lei_pouch_v1', { term_checked: true }],
  ['c2n5_payoff_jiang1', 'ch2_gift_jiang_sleeve_v1', { n5_jiang: true }],
  ['c2n5_g1', 'ch2_gift_zhou_cup_v1', {}],
  ['c2n5_b2', 'item_beef', {}],
]) assert.equal(render(id, { ...initial(), flags }).image, image)

for (const [id, badge, flags, items] of [
  ['c2n1_gap_chair_fix', 'c2_chair_helper', {}, ['toolbox']],
  ['c2n5_k1', 'c2_brass_key', {}, ['key']],
  ['c2n5_key_return0', 'c2_brass_key', { c2n5_cabinet: true }, ['key']],
  ['c2am_payoff_layers', 'c2_model_demo', { c2_payoff_model: true }, []],
  ['c2am_payoff_rotate', 'c2_model_demo', { c2_payoff_model: true, c2_payoff_base: true }, []],
]) {
  const s = { ...initial(), flags, items }, step = render(id, s)
  assert.equal(step.effect?.badge, badge, `${id}: actual rendered successful action awards badge`)
  const after = applyEffect(s, step.effect)
  for (const key of ['gold', 'skill', 'heart', 'wealth', 'ap', 'items']) assert.deepEqual(after[key], s[key])
  assert.equal(after.badges.filter(value => value === badge).length, 1)
}
for (const id of ['c2n1_gap_chair_fix', 'c2n5_k1', 'c2n5_key_return0', 'c2am_payoff_layers']) {
  assert.equal(render(id).effect?.badge, undefined, `${id}: no tool/receipt, no badge`)
}
const owned = { ...initial(), items: ['key', 'toolbox'] }
assert.equal(ch2SideBadgeBackfill(owned), owned, 'Owning goods is not using them')
const legacy = { ...initial(), flags: { quiz_grade: 'S', c2_chair_fixed: true, c2_payoff_base: true, c2_payoff_base_used: true } }
const restored = ch2SideBadgeBackfill(legacy)
assert.equal(restored.badges.length, legacy.badges.length + 3)
assert.equal(ch2SideBadgeBackfill(restored), restored)
assert.deepEqual(restored.dlc.dr, legacy.dlc.dr)
assert.deepEqual(restored.dlc.dsa, legacy.dlc.dsa)
for (const key of ['gold', 'skill', 'heart', 'wealth', 'ap', 'flags', 'items', 'night', 'finished']) assert.deepEqual(restored[key], legacy[key])

const teaser = ['c2am_lowdose_teaser0', 'c2am_lowdose_teaser1', 'c2am_lowdose_meet', 'c2am_lowdose_dinner', 'c2am_lowdose_teaser2']
assert.equal(render('c2am_payoff_end').next, teaser[0])
for (const id of teaser) {
  const step = render(id)
  assert(!step.effect && !step.event && !step.vox && !step.scan && !step.sfx, 'Teaser has no rewards, scan or new audio')
  if (id === 'c2am_lowdose_teaser0') assert.equal(step.next, 'c2am_lowdose_teaser1')
  else if (id === 'c2am_lowdose_teaser1') {
    assert.equal(step.next, undefined)
    assert.deepEqual(step.choices, [
      { text: '「行，我把排班发你。」', next: 'c2am_lowdose_meet' },
      { text: '「聊研究可以，你请饭。」', next: 'c2am_lowdose_dinner' },
    ], 'Exactly two approved, reward-free call replies')
  } else if (id === 'c2am_lowdose_teaser2') {
    assert.equal(step.end, true); assert.match(step.text, /DLC预告 · 低剂量CT/); assert.match(step.text, /尚未开放/)
  } else assert.equal(step.next, 'c2am_lowdose_teaser2', 'Both call replies return to the original final teaser')
}
const provenance = JSON.parse(readFileSync(new URL('../../docs/ch2-rewards-round-assets.json', import.meta.url)))
for (const asset of provenance.assets) {
  const bytes = liveMedia(asset.path).bytes
  assertHistoricalMedia(asset.path, { sha256: asset.sha256 })
  const metadata = await sharp(bytes).metadata(), stats = await sharp(bytes).stats()
  assert(metadata.hasAlpha && stats.channels[3].min === 0 && stats.channels[3].max === 255)
  assert(asset.prompt?.includes('pixel') && asset.source && asset.reference)
}
console.log('PASS ch2-rewards-round-data: 15 live badges, successful-action grants, exact old-save backfill, 7 illustrated keepsakes, end teaser and alpha/hash provenance')
