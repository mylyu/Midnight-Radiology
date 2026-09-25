import assert from 'node:assert/strict'
import { NIGHTS } from '../src/game/data.ts'
import { ch1ExplorationStep } from '../src/game/ch1-exploration.ts'
import { freshState, condOk, applyEffect } from '../src/game/store.ts'
import { commitCh1Choice, commitCh1Advance, buyCh1Item } from '../src/game/interaction-transactions.ts'

const fixture = (night, flags = {}, items = [], ap = 1) => ({ ...freshState('m'), night,
  stepId: `n${night}_hub`, screenHint: 'night', gold: 800, flags, items, ap })
const resolved = s => ch1ExplorationStep(s.stepId, NIGHTS[s.night - 1].steps[s.stepId], s)
const pick = (s, target) => {
  const choice = resolved(s).choices.find(c => c.next === target)
  assert(choice, `Missing ${target}`)
  return commitCh1Choice(s, { expectedNight: s.night, expectedStep: s.stepId, choice })
}
// Model the existing once-on-entry effect; serialize at each step like a refresh.
function enter(result) {
  assert(result.accepted, result.message)
  const s = JSON.parse(JSON.stringify(result.state))
  return applyEffect(s, resolved(s).effect)
}
const advance = s => enter(commitCh1Advance(s, { expectedNight: s.night, expectedStep: s.stepId }))
for (const night of [2, 3, 4]) {
  const p = `n${night}_`
  let s = fixture(night)
  s = enter(pick(s, `${p}arc0`))
  assert.equal(s.ap, 0)
  assert(s.flags.archive_entered)
  s = advance(s)
  s = enter(pick(s, `${p}hub`)) // Leave without a discovery.
  s = enter(pick(s, `${p}arc0`))
  assert.equal(s.ap, 0)
  s = advance(s)
  s = enter(pick(s, `${p}arc2`))
  assert(s.flags.archive_film)
  while (s.stepId !== `${p}hub`) s = advance(s)
  assert(!resolved(s).choices.some(c => c.next === `${p}arc0`))
  s = buyCh1Item(s, 'key').state
  s = enter(pick(s, `${p}arc0`))
  s = advance(s)
  const gold = s.gold, skill = s.skill
  s = enter(pick(s, `${p}cab0`))
  s = advance(advance(advance(s)))
  assert.equal(s.stepId, `${p}arc1`)
  assert.equal(s.gold, gold + 80)
  assert.equal(s.skill, skill + 1)
  assert(!resolved(s).choices.some(c => c.next === `${p}cab0` && condOk(s, c.cond)))
  s = enter(pick(s, `${p}hub`))
  for (const later of [2, 3, 4]) {
    const restored = { ...s, night: later, stepId: `n${later}_hub` }
    assert(!resolved(restored).choices.some(c => c.next === `n${later}_arc0`))
  }
  const empty = fixture(night, {}, [], 0)
  const blocked = resolved(empty).choices.find(c => c.next === `${p}arc0`)
  assert.match(blocked.disabledReason, /咖啡/)
  assert(!pick(empty, `${p}arc0`).accepted)
  assert(pick(buyCh1Item(empty, 'coffee').state, `${p}arc0`).accepted)
  for (const flags of [{ n3_arc: true }, { archive_cab: true }, { archive_entered: true }]) {
    const old = enter(pick(fixture(night, flags, [], 0), `${p}arc0`))
    assert.equal(old.ap, 0, 'Legacy / cross-night unfinished return is free')
  }
  for (const [id, step] of Object.entries(NIGHTS[night - 1].steps).filter(([id]) => new RegExp(`^${p}(arc|cab)[0-4]$`).test(id))) {
    for (const next of [step.next, ...(step.choices ?? []).map(c => c.next)].filter(Boolean)) {
      assert(next.startsWith(p), `${id} must not jump nights`)
      assert(NIGHTS[night - 1].steps[next], `Missing ${next}`)
    }
  }
}
const late = fixture(4, { n4_lei: true, archive_film: true }, [], 0)
const logs = enter(pick(late, 'n4_lei2a'))
assert(logs.flags.pacs_log)
assert.equal(logs.ap, late.ap)
assert.equal(logs.skill, late.skill)
assert(!resolved({ ...logs, stepId: 'n4_hub' }).choices.some(c => c.next === 'n4_lei2a'))
assert(!resolved(fixture(4, { n4_lei: true })).choices.some(c => c.next === 'n4_lei2a'))
assert.equal(Object.keys(NIGHTS[1].steps).some(id => /n5_/.test(id)), false)
assert.match(ch1ExplorationStep('n2_fan4a', NIGHTS[1].steps.n2_fan4a, fixture(2)).text, /没挂锁/)
console.log('PASS nights 2–4: entry/AP, coffee, both discoveries, late key, cross-night dedup, legacy return, fourth-night PACS follow-up and graph targets')
