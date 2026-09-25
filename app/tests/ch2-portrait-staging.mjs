import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { CH2_SHIFTS, ch2StepForState } from '../src/game/ch2.ts'
import { ch2SceneView } from '../src/game/ch2-scene.ts'
import { ch2GiftChoices, giveCh2Gift } from '../src/game/ch2-gifts.ts'
import { ch2PayoffGiftChoices } from '../src/game/ch2-payoffs.ts'
import { freshState } from '../src/game/store.ts'

const baseline = 'a1ed6f8'
const all = Object.assign({}, ...CH2_SHIFTS.map(shift => shift.steps))
const corrected = ['c2n5_chat_q', 'c2n5_sms_lei_pending', 'c2n5_n7', 'c2n5_n8',
  'c2n5_n8a', 'c2n5_n8b', 'c2n5_n8c']
const stale = { bg: 'bg_breakroom', sprite: 'char_lei', sprite2: 'char_lei' }

function state(stepId, flags = {}, extra = {}) {
  return { ...freshState('m'), ap: 3, items: ['milktea', 'snack', 'key', 'toolbox'],
    flags, dlc: { ch2: { shift: stepId.split('_')[0], stepId, phase: 'story' } }, ...extra }
}

function rendered(stepId, s = state(stepId)) {
  assert(all[stepId], `Existing chapter node: ${stepId}`)
  return ch2StepForState(stepId, all[stepId], s)
}

const flagVariants = [
  {}, { data_audit: true }, { data_support: true }, { data_oppose: true },
  { c2_social_lei: true, c2_social_wen: true },
  { c2_social_lei: true, c2_social_wen: true, c2n5_chat_sign: true, c2n5_chat_roster: true },
  { c2_needle_seen: true }, { c2_needle_seen: true, c2_needle_resolved: true },
  { c2_terminal_n3_unplugged: true, c2_terminal_call_received: true },
  { c2_terminal_n3_unplugged: true, c2_terminal_n3_reconnected: true, c2_terminal_call_noted: true },
  { c2_terminal_n5_done: true, c2_terminal_receipt_seen: true, c2_terminal_receipt_saved: true },
  { c2n5_cabinet: true, c2_payoff_model: true },
  { c2n5_cabinet: true, c2_payoff_model: true, c2_payoff_base: true, term_checked: true },
  { c2_terminal_device_noted: true, n5_qian: true, n5_fan: true, n5_lei: true, n5_jiang: true },
]

for (const id of corrected) {
  assert.equal(all[id].sprite, '', `${id}: explicit clear also repairs stale saves`)
  for (const flags of flagVariants) {
    const step = rendered(id, state(id, flags))
    const view = ch2SceneView(step, stale)
    assert.equal(view.sprite, '', `${id}: stale left portrait cleared`)
    assert(!view.sprite2, `${id}: stale right portrait cleared`)
    assert(!step.phone && !step.radio, `${id}: text messages are not converted to calls`)
  }
}

for (const id of ['c2n5_chat_both1', 'c2n5_chat_both3', 'c2n5_chat_plain']) {
  assert.equal(ch2SceneView(rendered(id, state(id, { c2_social_lei: true, c2_social_wen: true })), stale).sprite,
    'char_lei', `${id}: genuinely present colleague remains visible`)
}
for (const [id, sprite] of Object.entries({
  c2n5_chat_both2: 'char_tang', c2n5_chat_roster1: 'char_tang',
  c2n5_chat_roster2: 'char_zhou', c2n5_chat_roster3: 'char_tang',
})) assert.equal(ch2SceneView(rendered(id), stale).sprite, sprite, `${id}: correct speaker portrait`)

for (const flags of [{ c2_terminal_device_noted: true }, { c2_terminal_call_noted: true }, { term_checked: true }]) {
  const s = state('c2n5_hub', flags)
  assert(ch2PayoffGiftChoices(s).some(choice => choice.next === 'c2n5_payoff_lei0'))
  for (const id of ['c2n5_payoff_lei0', 'c2n5_payoff_lei1']) {
    assert.equal(ch2SceneView(rendered(id, s), stale).sprite, 'char_lei', `${id}: real in-person return gift`)
  }
}
for (const id of ['c2n5_payoff_lei0', 'c2n5_payoff_lei1']) {
  assert(!ch2SceneView(rendered(id), stale).sprite, `${id}: no invented gift encounter without helping Lei`)
}

for (const person of ['lei', 'tang']) {
  for (const item of ['milktea', 'snack']) {
    const s = state('c2n5_chat_q'), token = `@ch2gift:c2n5_chat_q:${person}:${item}`
    assert(ch2GiftChoices(s, 'c2n5_chat_q').some(choice => choice.next === token))
    const { state: given, reply } = giveCh2Gift(s, 'c2n5_chat_q', token)
    assert.equal(ch2SceneView(reply, stale).sprite, `char_${person}`, 'Gift recipient remains visible while replying')
    assert.equal(given.dlc.ch2.giftReply.sprite, `char_${person}`, 'Reload preserves the correct gift recipient')
    assert(!given.items.includes(item), 'One actual gift is consumed')
    assert.equal(given.ap, s.ap, 'Portrait repair does not add AP cost')
    assert.equal(given.heart, s.heart + (item === 'snack' ? 1 : 0), 'Original gift reward unchanged')
    assert.strictEqual(giveCh2Gift(given, 'c2n5_chat_q', token).state, given, 'No duplicate gift after reload')
    const resumed = structuredClone(given)
    delete resumed.dlc.ch2.giftReply
    const back = ch2SceneView(rendered('c2n5_chat_q', resumed), { ...stale, sprite: reply.sprite })
    assert(!back.sprite && !back.sprite2, 'Shared menu clears gift recipient even with the same step ID')
    if (person === 'lei') {
      assert.equal(ch2SceneView(rendered('c2n5_payoff_lei0', given), stale).sprite, 'char_lei',
        'Giving Lei a gift independently qualifies his real return-gift encounter')
    }
  }
}

// Explicit stale-view probes cover exploration exits, archive statics, the
// terminal, needle evidence, solo work and the complete child-patient sequence.
const exitPattern = /^c2n5_(hub$|chat_end$|a\d+$|k[12]$|key_return\d+$|e\d|terminal_|needle_|n\d|sms_|p2a$|phone_break$|child_scan$|m\d|g\d)/
const exitIds = Object.keys(all).filter(id => exitPattern.test(id))
for (const required of ['c2n5_hub', 'c2n5_chat_end', 'c2n5_a1', 'c2n5_e1', 'c2n5_terminal_screen',
  'c2n5_needle_vr', 'c2n5_n1', 'c2n5_child_scan', 'c2n5_m17']) assert(exitIds.includes(required))
for (const flags of flagVariants) {
  for (const id of exitIds) {
    const view = ch2SceneView(rendered(id, state(id, flags)), stale)
    assert.notEqual(view.sprite, 'char_lei', `${id}: Lei is not carried into another scene`)
    assert.notEqual(view.sprite2, 'char_lei', `${id}: secondary Lei is not carried into another scene`)
  }
}

// This is the exact pre-fix Ch2Screen resolver, evaluated independently. The
// helper changes WHEN a view is derived, not established stage semantics.
function oldSceneAlgorithm(step, previous) {
  const speakerSprite = step.speaker === 'luzhou' ? 'luzhou' : step.speaker ? `char_${step.speaker}` : undefined
  const impliedSprite = step.sprite ??
    (step.speaker === 'me' ? 'me' : speakerSprite && previous.sprite === speakerSprite ? previous.sprite : undefined)
  return { bg: step.bg ?? previous.bg, sprite: impliedSprite, sprite2: step.sprite2 }
}
const previousViews = [stale, { bg: 'bg_ctcontrol' },
  { bg: 'bg_archive', sprite: 'char_zhou', sprite2: 'char_tang' },
  { bg: 'bg_corridor', sprite: 'pat_kiddad', sprite2: 'pat_kidmom_holding' },
  { bg: 'bg_ctcontrol', sprite: 'luzhou' }, { bg: 'bg_breakroom', sprite: 'me' },
  { bg: 'bg_ctcontrol_day', sprite: '', sprite2: '' }]
let equivalenceProbes = 0
for (const flags of flagVariants) {
  for (const [id, raw] of Object.entries(all)) {
    const s = state(id, flags), step = ch2StepForState(id, raw, s)
    const before = JSON.stringify({ step, s })
    for (const previous of previousViews) {
      assert.deepEqual(ch2SceneView(step, previous), oldSceneAlgorithm(step, previous), `${id}: original scene semantics`)
      equivalenceProbes++
    }
    assert.equal(JSON.stringify({ step, s }), before, 'Scene resolution has no state or effect mutations')
  }
}

// Normalize ONLY the seven explicitly authorized sprite fields, then compare
// complete TypeScript syntax. Dialogue, conditions, rewards, audio, routing and
// all other fields stay byte-for-byte equivalent after TypeScript printing.
const sourceScopes = {
  'app/src/game/ch2.ts': ['c2n5_n7', 'c2n5_n8', 'c2n5_n8a', 'c2n5_n8b', 'c2n5_n8c'],
  'app/src/game/ch2-social.ts': ['c2n5_chat_q'],
  'app/src/game/ch2-pacing.ts': ['c2n5_sms_lei_pending'],
}
function withoutAuthorizedPortraits(source, path, ids) {
  const parsed = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const seen = []
  const transformed = ts.transform(parsed, [context => {
    function visit(node) {
      if (ts.isPropertyAssignment(node) && ids.includes(node.name.getText(parsed)) && ts.isObjectLiteralExpression(node.initializer)) {
        seen.push(node.name.getText(parsed))
        return ts.factory.updatePropertyAssignment(node, node.name,
          ts.factory.updateObjectLiteralExpression(node.initializer,
            node.initializer.properties.filter(property => !(ts.isPropertyAssignment(property) && property.name.getText(parsed) === 'sprite'))))
      }
      return ts.visitEachChild(node, visit, context)
    }
    return root => ts.visitNode(root, visit)
  }])
  assert.deepEqual(seen.sort(), [...ids].sort(), `${path}: only exact authorized node fields normalized`)
  const text = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed }).printFile(transformed.transformed[0])
  transformed.dispose()
  return text
}
for (const [path, ids] of Object.entries(sourceScopes)) {
  const original = execFileSync('git', ['show', `${baseline}:${path}`], { encoding: 'utf8' })
  const current = readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')
  assert.equal(withoutAuthorizedPortraits(current, path, ids), withoutAuthorizedPortraits(original, path, ids),
    `${path}: only the authorized portrait fields changed since ${baseline}`)
}

console.log(`PASS ch2-portrait-staging: 7 explicit clears; ${exitIds.length} fifth-night exit/remote/static/patient nodes; gifts and real Lei appearances preserved; ${equivalenceProbes} full-chapter scene equivalence probes; 3 whole-story source comparisons against ${baseline}`)
