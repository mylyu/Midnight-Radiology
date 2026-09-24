// Static audit: every active (non-legacy) chapter two badge and card must be obtainable,
// the legacy lists must stay accurate, and evidence/event links must stay wired.
// Guards the collection denominators (15 badges / 17 cards) against future drift.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { settleCh2 } from '../src/game/ch2-session.ts'
import { freshState } from '../src/game/store.ts'
import { recordCh2WindowAttempt } from '../src/game/ch2-window-progress.ts'
import {
  CH2_SHIFTS, CH2_BADGES, CH2_CARDS, CH2_EVENTS, CH2_EVIDENCE,
  CH2_BADGES_LEGACY, CH2_CARDS_LEGACY, CH2_ACTIVE_BADGES, CH2_ACTIVE_CARDS, CH2_EVENTS_LEGACY, CH2_EVIDENCE_LEGACY,
  ch2StepForState,
} from '../src/game/ch2.ts'

assert.deepEqual([...CH2_BADGES_LEGACY].sort(), ['allergy_save', 'checklist_zero', 'phantom_friend', 'phase_eye', 'wrench_night'])
assert.deepEqual([...CH2_CARDS_LEGACY].sort(), ['contrast_agent', 'contrast_checklist', 'contrast_contra', 'contrast_emergency', 'ring_artifact'])
assert.equal(CH2_ACTIVE_BADGES.length, 15)
assert.equal(CH2_ACTIVE_CARDS.length, 17)
for (const id of CH2_BADGES_LEGACY) assert(CH2_BADGES[id], `Legacy badge definition lost: ${id}`)
for (const id of CH2_CARDS_LEGACY) assert(CH2_CARDS[id], `Legacy card definition lost: ${id}`)

const grantedCards = new Set()
const grantedBadges = new Set()
const grantedEvents = new Set()
const setFlags = new Set()
// Keep every old raw-graph branch, and also follow the real adapter-injected
// links. The second profile represents the independently tested Friday case
// and night-three unplug route, so Sunday's evidence is reachable without
// pretending a fresh save already knows those events.
const auditBase = freshState('m')
const renderProfiles = [auditBase, { ...auditBase, flags: {
  c2_needle_seen: true, c2_needle_assessed: true, c2_terminal_n3_unplugged: true,
} }, {
  // These independently tested prerequisites are essential: the new adapter
  // refuses to open the small cabinet for an empty inventory or invent gifts
  // from people whose earlier interaction was never played. Do not exempt the
  // new evidence from the same reachable-grant assertions as every old item.
  ...auditBase, items: ['key', 'toolbox'], flags: {
    n5_lei: true, n5_jiang: true, c2_needle_resolved: true, c2_terminal_device_noted: true,
    c2_payoff_model: true, c2_payoff_base: true,
  },
}]
for (const shift of CH2_SHIFTS) {
  const reachable = new Set()
  const rendered = new Map()
  // @quiz is an external UI node, not a lost graph edge. The actual handler
  // below is checked to resume at c2am_3 before auditing post-quiz grants.
  const queue = shift.id === 'c2am' ? [shift.start, 'c2am_3'] : [shift.start]
  while (queue.length) {
    const id = queue.pop()
    if (reachable.has(id) || id.startsWith('@')) continue
    const raw = shift.steps[id]
    assert(raw, 'Missing reachable node ' + id)
    const variants = [raw, ...renderProfiles.map(state => ch2StepForState(id, raw, state))]
    rendered.set(id, variants)
    reachable.add(id)
    for (const step of variants) queue.push(...[step.next, step.windowTask?.success, step.checklist?.next, ...(step.choices ?? []).flatMap(c => [c.next, c.risk?.next])].filter(Boolean))
  }
  for (const [id, variants] of rendered) for (const step of variants) {
    assert(id)
    if (step.card) grantedCards.add(step.card)
    if (step.effect?.card) grantedCards.add(step.effect.card)
    if (step.effect?.badge) grantedBadges.add(step.effect.badge)
    if (step.effect?.flag) setFlags.add(step.effect.flag)
    if (step.event) grantedEvents.add(step.event)
    for (const c of step.choices ?? []) {
      if (c.effect?.card) grantedCards.add(c.effect.card)
      if (c.effect?.badge) grantedBadges.add(c.effect.badge)
      if (c.effect?.flag) setFlags.add(c.effect.flag)
    }
  }
}
// window_master now has persisted, actual attempt receipts; queue_tamer stays in the Ch2 session.
const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
assert.match(appSource, /const quizDone = \(\) => \{\s*update\(s => patchCh2\(s, \{ phase: 'story', stepId: 'c2am_3' \}\)\)\s*setStepId\('c2am_3'\)/,
  'The post-quiz graph root must match the actual completion handler')
// A string in the UI/comment is not evidence of an award. Inspect actual array assignments.
const app = ts.createSourceFile('App.tsx', appSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const engineBadges = new Set()
function visit(node) {
  if (ts.isPropertyAssignment(node) && node.name.getText(app) === 'badges' && ts.isArrayLiteralExpression(node.initializer)) {
    for (const value of node.initializer.elements) if (ts.isStringLiteral(value)) engineBadges.add(value.text)
  }
  ts.forEachChild(node, visit)
}
visit(app)
// Exercise both real window completions. A literal badge name or invented
// successful-history flag is not evidence that the award is obtainable.
const firstWindow = CH2_SHIFTS[0].steps.c2n1_m11.windowTask
const secondWindow = CH2_SHIFTS[0].steps.c2n1_w2.windowTask
const windowStart = { ...freshState('m'), dlc: { ch2: { shift: 'c2n1', phase: 'story', stepId: 'c2n1_m11' } } }
const firstWindowDone = recordCh2WindowAttempt(windowStart, 'c2n1_m11', firstWindow, 0, firstWindow.targetW, firstWindow.targetL)
assert(!firstWindowDone.badges.includes('window_master'), 'One completed window is not sufficient')
const secondWindowStart = { ...firstWindowDone, dlc: { ch2: { ...firstWindowDone.dlc.ch2, stepId: 'c2n1_w2' } } }
const windowAward = recordCh2WindowAttempt(secondWindowStart, 'c2n1_w2', secondWindow, 0, secondWindow.targetW, secondWindow.targetL)
assert.equal(windowAward.badges.filter(id => id === 'window_master').length, 1)
engineBadges.add('window_master')
// Exercise the real settlement, not a string match in the new module. Both
// branches, the shift gate and replay idempotence remain protected.
const queueState = { ...freshState('m'), flags: {}, dlc: { ch2: { shift: 'c2d2', phase: 'story' } } }
const queueAward = settleCh2(queueState, 'c2d2')
assert(queueAward.badges.includes('queue_tamer'), 'Clean queue must award on day-two settlement')
assert.equal(settleCh2(queueAward, 'c2d2'), queueAward, 'Repeated settlement must do nothing')
assert(!settleCh2({ ...queueState, flags: { queue_wait: true } }, 'c2d2').badges.includes('queue_tamer'))
assert(!settleCh2(queueState, 'c2n1').badges.includes('queue_tamer'))
engineBadges.add('queue_tamer')
for (const id of CH2_ACTIVE_BADGES) {
  assert(grantedBadges.has(id) || (['window_master', 'queue_tamer'].includes(id) && engineBadges.has(id)), `Active badge not obtainable: ${id}`)
}
for (const id of CH2_ACTIVE_CARDS) assert(grantedCards.has(id), `Active card not obtainable: ${id}`)
for (const id of CH2_BADGES_LEGACY) assert(!grantedBadges.has(id), `Legacy badge unexpectedly granted: ${id}`)
for (const id of CH2_CARDS_LEGACY) assert(!grantedCards.has(id), `Legacy card unexpectedly granted: ${id}`)
for (const [key, e] of Object.entries(CH2_EVIDENCE)) assert.equal(setFlags.has(e.flag), !CH2_EVIDENCE_LEGACY.includes(key), `Evidence policy: ${key}`)
for (const id of Object.keys(CH2_EVENTS)) assert.equal(grantedEvents.has(id), !CH2_EVENTS_LEGACY.includes(id), `Event policy: ${id}`)

console.log(`PASS: grant audit — ${CH2_ACTIVE_BADGES.length}/${Object.keys(CH2_BADGES).length} badges and ${CH2_ACTIVE_CARDS.length}/${Object.keys(CH2_CARDS).length} cards obtainable; legacy lists, evidence and events verified.`)
