import assert from 'node:assert/strict'

// Explicit inverse of the later background-only edit for frozen older audits.
// It is also called on already-projected steps; the live asset is checked in
// ch2-covered-cr.mjs so accepting the old key here cannot hide a missing update.
export function beforeCoveredCrPass(id, step) {
  if (id !== 'c2n1_an1') return step
  assert(['bg_corridor', 'bg_corridor_cr_covered'].includes(step.bg), id + ' background drift')
  return { ...step, bg: 'bg_corridor' }
}
