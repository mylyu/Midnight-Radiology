// LIVE effects are compared against the exact checked pre-payoff source, not
// merely against a new snapshot that could accidentally bless changed rewards.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import * as live from '../src/game/ch2.ts'
import { CH2_PAYOFF_STEPS, CH2_PAYOFF_EVIDENCE } from '../src/game/ch2-payoffs.ts'
import { freshState } from '../src/game/store.ts'
import { beforePayoffSource } from './ch2-payoffs-projection.mjs'
import './image-polish-data.mjs'
import { beforeImagePolishSource } from './image-polish-projection.mjs'
import { CH2_DAWN_LEADIN_STEPS } from '../src/game/ch2-dawn.ts'
import { CH2_ARCHIVE_RETURN_STEPS } from '../src/game/ch2-exploration.ts'
import { CH2_SIDE_BADGES } from '../src/game/ch2-side-badges.ts'
import { assertThicknessDialogueLive } from './ch2-thickness-dialogue.mjs'
import { assertDirectorDayVoiceLive } from './ch2-director-day-voice.mjs'

assertThicknessDialogueLive()
assertDirectorDayVoiceLive()

const root = new URL('../../', import.meta.url)
const ch2Path = 'app/src/game/ch2.ts'
const checkedSource = beforePayoffSource(ch2Path, readFileSync(new URL(ch2Path, root), 'utf8'))
const checkedJS = ts.transpileModule(checkedSource, { compilerOptions: {
  module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022,
} }).outputText.replace(/from '(\.\/[^']+)'/g, (_, relative) =>
  `from ${JSON.stringify(new URL(relative, new URL(ch2Path, root)).href)}`)
const old = await import('data:text/javascript;base64,' + Buffer.from(checkedJS).toString('base64'))
for (const key of ['CH2_META', 'CH2_PASSWORD', 'CH2_PORTRAITS', 'CH2_IMAGE_CAPTIONS',
  'CH2_BADGES_LEGACY', 'CH2_CARDS', 'CH2_CARDS_LEGACY',
  'CH2_ACTIVE_CARDS', 'CH2_EVENTS_LEGACY', 'CH2_EVIDENCE_LEGACY',
  'CH2_BOOK_PAGES', 'GRAY2HU', 'QUIZ2']) assert.deepEqual(live[key], old[key], `${key}: original registry unchanged`)
const newBadgeIds = ['c2_brass_key', 'c2_chair_helper', 'c2_model_demo']
assert.deepEqual(Object.keys(CH2_SIDE_BADGES).sort(), newBadgeIds)
assert.deepEqual(Object.fromEntries(Object.entries(live.CH2_BADGES).filter(([id]) => !newBadgeIds.includes(id))), old.CH2_BADGES,
  'Every original badge definition remains exact')
assert.deepEqual(Object.keys(live.CH2_BADGES).filter(id => !old.CH2_BADGES[id]).sort(), newBadgeIds,
  'Exactly three approved use badges, no other grant registry drift')
for (const id of newBadgeIds) assert.deepEqual(live.CH2_BADGES[id], CH2_SIDE_BADGES[id])
assert.deepEqual(live.CH2_ACTIVE_BADGES.filter(id => !newBadgeIds.includes(id)), old.CH2_ACTIVE_BADGES)
for (const [id, entry] of Object.entries(old.CH2_EVIDENCE)) assert.deepEqual(live.CH2_EVIDENCE[id], entry, `${id}: historical evidence preserved`)
assert.deepEqual(Object.keys(live.CH2_EVENTS), Object.keys(old.CH2_EVENTS), 'No added/removed event grant')
for (const [id, entry] of Object.entries(old.CH2_EVENTS)) {
  const expected = id === 'ch2_cabinet' ? { ...entry, body: '科里保管的半钥匙与老周找回的一半合齐。旧教学片、笔记与1997年合影仍按编号留档；老周另从柜里取出一套透明叠层教具，借给你在下周交流时演示。配套底座另锁在小铁柜里。' } : entry
  assert.deepEqual(live.CH2_EVENTS[id], expected, `${id}: only the one exact archive-description update is approved`)
}
assert.deepEqual(Object.keys(live.CH2_EVIDENCE).filter(id => !old.CH2_EVIDENCE[id]).sort(), Object.keys(CH2_PAYOFF_EVIDENCE).sort())

const oldSteps = Object.assign({}, ...old.CH2_SHIFTS.map(shift => shift.steps))
const liveSteps = Object.assign({}, ...live.CH2_SHIFTS.map(shift => shift.steps))
const newSteps = Object.assign({}, ...Object.values(CH2_PAYOFF_STEPS), CH2_DAWN_LEADIN_STEPS, CH2_ARCHIVE_RETURN_STEPS,
  { c2d2_thickness_question: liveSteps.c2d2_thickness_question, c2d2_thickness_reply: liveSteps.c2d2_thickness_reply })
assert.deepEqual(Object.keys(liveSteps).filter(id => !oldSteps[id]).sort(), Object.keys(newSteps).sort())
assert.equal(live.CH2_SHIFTS.length, old.CH2_SHIFTS.length)
for (let i = 0; i < live.CH2_SHIFTS.length; i++) {
  const { steps: oldRows, ...oldMeta } = old.CH2_SHIFTS[i]
  const { steps: newRows, ...newMeta } = live.CH2_SHIFTS[i]
  assert.deepEqual(newMeta, oldMeta, 'Same three night/two day shifts, quiz and original starting points')
  for (const [id, step] of Object.entries(oldRows)) {
    const projected = { ...newRows[id] }
    // Only the independently checked later bridge and approved director take.
    if (id === 'c2d2_w1ok') projected.next = 'c2d2_7'
    if (id === 'c2d2_1') {
      projected.sfx = 'vox_ch2_natural_director_v2'
      projected.text = projected.text.replace('年轻人，白班动作要快！', '年轻人，动作快起来！')
    }
    if (['c2d2_4','c2d2_5','c2d2_6a','c2d2_6b','c2d2_6c','c2d2_w1','c2d2_w1ok','c2d2_7'].includes(id)) {
      // The imported image-polish test checks exact new labels/images first.
      projected.image = step.image
      delete projected.imageLabel
    }
    assert.deepEqual(projected, step, `${id}: original raw node remains exact after checked visual-only delta`)
  }
}
const economics = effect => Object.fromEntries(Object.entries(effect ?? {}).filter(([key]) => key !== 'flag'))
const approvedBadgeByReceipt = { c2_chair_fixed: 'c2_chair_helper', c2_payoff_base: 'c2_brass_key',
  c2_payoff_model_used: 'c2_model_demo', c2_payoff_base_used: 'c2_model_demo' }
function oldEconomicsAfterUseBadge(effect, previous) {
  const approved = approvedBadgeByReceipt[effect?.flag]
  assert.equal(effect?.badge, approved ?? previous?.badge, 'Only an actual approved use receipt may add a badge')
  const economic = economics(effect)
  if (approved) {
    assert.equal(previous?.badge, undefined, 'New use badges must not overwrite an existing badge grant')
    delete economic.badge
  }
  return economic
}
let comparisons = 0
for (let mask = 0; mask < 32; mask++) {
  const state = { ...freshState(mask & 1 ? 'f' : 'm'), finished: true, ap: 2, items: mask & 2 ? ['key'] : [],
    flags: { n5_lei: !!(mask & 1), n5_fan: !!(mask & 2), n5_jiang: !!(mask & 4),
      c2_needle_resolved: !!(mask & 8), c2_apples_shared: !!(mask & 16),
      c2_payoff_model: !!(mask & 4), c2_payoff_base: !!(mask & 2), c2_payoff_zhou_cup: !!(mask & 8),
      c2_terminal_device_noted: !!(mask & 16), term_checked: !!(mask & 16), quiz_grade: 'S' },
    dlc: { dr: { done: true }, dsa: { done: true }, ch2: { shift: 'c2n5', phase: 'story' } } }
  const snapshot = JSON.stringify(state)
  for (const [id, source] of Object.entries(oldSteps)) {
    const before = old.ch2StepForState(id, source, state)
    const after = live.ch2StepForState(id, liveSteps[id], state)
    assert.deepEqual(oldEconomicsAfterUseBadge(after.effect, before.effect), economics(before.effect), `${id}: no monetary/stat/item/old-badge reward change`)
    assert.equal(after.card, before.card, `${id}: same knowledge-card grant`)
    assert.equal(after.event, before.event, `${id}: same chronicle grant`)
    if (before.effect?.flag && id !== 'c2n5_k1') assert.equal(after.effect?.flag, before.effect.flag, `${id}: original story receipt remains`)
    const targetOccurrences = new Map()
    for (const oldChoice of before.choices ?? []) {
      const occurrence = targetOccurrences.get(oldChoice.next) ?? 0
      targetOccurrences.set(oldChoice.next, occurrence + 1)
      const newChoice = after.choices?.filter(choice => choice.next === oldChoice.next)[occurrence]
      assert(newChoice, `${id}: preserve previous selectable destination ${oldChoice.next}`)
      assert.deepEqual(economics(newChoice.effect), economics(oldChoice.effect), `${id}/${oldChoice.next}: original choice reward`)
      assert.deepEqual(newChoice.risk, oldChoice.risk, `${id}/${oldChoice.next}: original luck branch`)
    }
    comparisons++
  }
  assert.equal(JSON.stringify(state), snapshot, 'Repeated presentation does not mutate saves or cross-chapter state')
}

// The read-only keepsake display must not change either chapter-two buying or
// any inherited economy. Compare the actual function AST to the checked old one.
const shopPath = 'app/src/components/Ch2Shop.tsx'
const shopLive = readFileSync(new URL(shopPath, root), 'utf8')
const shopBefore = beforePayoffSource(shopPath, shopLive)
const getShop = source => {
  const ast = ts.createSourceFile('Ch2Shop.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  return ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'Ch2Shop')?.getText(ast)
}
assert(getShop(shopBefore), 'Original shop function must be found')
assert.equal(getShop(beforeImagePolishSource(shopPath, shopLive)), getShop(shopBefore), 'All purchasing logic and shop prices/messages are unchanged')
console.log(`PASS payoff LIVE reward boundary: ${Object.keys(oldSteps).length} exact old raw nodes; ${comparisons} rendered effect comparisons; original registries/quiz/card/event/luck awards; read-only backpack with unchanged purchase function; chapter saves not mutated (${fileURLToPath(root)})`)
