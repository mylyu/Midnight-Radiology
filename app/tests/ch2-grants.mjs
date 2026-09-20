// Static audit: every active (non-legacy) chapter two badge and card must be obtainable,
// the legacy lists must stay accurate, and evidence/event links must stay wired.
// Guards the collection denominators (12 badges / 18 cards) against future drift.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import {
  CH2_SHIFTS, CH2_BADGES, CH2_CARDS, CH2_EVENTS, CH2_EVIDENCE,
  CH2_BADGES_LEGACY, CH2_CARDS_LEGACY, CH2_ACTIVE_BADGES, CH2_ACTIVE_CARDS,
} from '../src/game/ch2.ts'

assert.deepEqual([...CH2_BADGES_LEGACY].sort(), ['allergy_save', 'checklist_zero', 'phase_eye'])
assert.deepEqual([...CH2_CARDS_LEGACY].sort(), ['contrast_agent', 'contrast_checklist', 'contrast_contra', 'contrast_emergency'])
assert.equal(CH2_ACTIVE_BADGES.length, 12)
assert.equal(CH2_ACTIVE_CARDS.length, 18)
for (const id of CH2_BADGES_LEGACY) assert(CH2_BADGES[id], `Legacy badge definition lost: ${id}`)
for (const id of CH2_CARDS_LEGACY) assert(CH2_CARDS[id], `Legacy card definition lost: ${id}`)

const grantedCards = new Set()
const grantedBadges = new Set()
const grantedEvents = new Set()
const setFlags = new Set()
for (const shift of CH2_SHIFTS) {
  const reachable = new Set()
  const queue = [shift.start]
  while (queue.length) {
    const id = queue.pop()
    if (reachable.has(id) || id.startsWith('@')) continue
    const step = shift.steps[id]
    assert(step, 'Missing reachable node ' + id)
    reachable.add(id)
    queue.push(...[step.next, step.windowTask?.success, step.checklist?.next, ...(step.choices ?? []).flatMap(c => [c.next, c.risk?.next])].filter(Boolean))
  }
  for (const [id, step] of Object.entries(shift.steps).filter(([id]) => reachable.has(id))) {
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
// window_master / queue_tamer are granted by Ch2Screen logic in App.tsx.
const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
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
for (const id of CH2_ACTIVE_BADGES) {
  assert(grantedBadges.has(id) || (['window_master', 'queue_tamer'].includes(id) && engineBadges.has(id)), `Active badge not obtainable: ${id}`)
}
for (const id of CH2_ACTIVE_CARDS) assert(grantedCards.has(id), `Active card not obtainable: ${id}`)
for (const id of CH2_BADGES_LEGACY) assert(!grantedBadges.has(id), `Legacy badge unexpectedly granted: ${id}`)
for (const id of CH2_CARDS_LEGACY) assert(!grantedCards.has(id), `Legacy card unexpectedly granted: ${id}`)
for (const [key, e] of Object.entries(CH2_EVIDENCE)) assert(setFlags.has(e.flag), `Evidence flag never set: ${key}`)
for (const id of Object.keys(CH2_EVENTS)) assert(grantedEvents.has(id), `Event never triggered: ${id}`)

console.log(`PASS: grant audit — ${CH2_ACTIVE_BADGES.length}/${Object.keys(CH2_BADGES).length} badges and ${CH2_ACTIVE_CARDS.length}/${Object.keys(CH2_CARDS).length} cards obtainable; legacy lists, evidence and events verified.`)
