import assert from 'node:assert/strict'
import { NIGHTS } from '../src/game/data.ts'
import { freshState, condOk } from '../src/game/store.ts'
import { ch1ExplorationStep } from '../src/game/ch1-exploration.ts'
import { CH2_SHIFTS, ch2StepForState } from '../src/game/ch2.ts'
import { commitCh1Choice, buyCh1Item } from '../src/game/interaction-transactions.ts'

const hub = NIGHTS[2].steps.n3_hub
const save = (flags = {}, items = [], ap = 1) => ({ ...freshState('m'), night: 3,
  stepId: 'n3_hub', screenHint: 'night', gold: 800, flags, items, ap })
const entrance = s => ch1ExplorationStep('n3_hub', hub, s).choices.find(c => c.next === 'n3_arc0' && condOk(s, c.cond))
const enter = s => commitCh1Choice(s, { expectedNight: 3, expectedStep: 'n3_hub', choice: entrance(s) })
const initial = save()
assert.equal(enter(initial).state.ap, 0, 'First visit still costs exactly one AP')
const empty = save({}, [], 0)
assert.equal(entrance(empty), undefined, 'Do not secretly grant a free first visit')
assert.match(ch1ExplorationStep('n3_hub', hub, empty).text, /咖啡/)
assert(entrance(buyCh1Item(empty, 'coffee').state), 'Coffee restores the original entry condition')
const leftEarly = save({ n3_arc: true }, [], 0)
assert.equal(hub.choices.filter(c => c.next === 'n3_arc0' && condOk(leftEarly, c.cond)).length, 0,
  'Reproduce the original premature-hide bug before applying the resolver')
assert(enter(leftEarly).accepted)
assert.equal(enter(leftEarly).state.ap, 0)
const filmFirst = save({ n3_arc: true, archive_film: true }, ['key'], 0)
assert(enter(JSON.parse(JSON.stringify(filmFirst))).accepted, 'Old save / film first still allows opening the cabinet')
assert.equal(entrance({ ...filmFirst, items: [] }), undefined, 'No unavailable or completed event offered')
assert(entrance(buyCh1Item({ ...filmFirst, items: [] }, 'key').state), 'Buying the key later restores the unfinished cabinet')
const cabinetFirst = save({ n3_arc: true, archive_cab: true }, ['key'], 0)
assert(entrance(cabinetFirst), 'Cabinet first still allows finding the film')
assert.equal(entrance(save({ n3_arc: true, archive_cab: true, archive_film: true }, ['key'], 0)), undefined)
assert.equal(ch1ExplorationStep('n1_hub', NIGHTS[0].steps.n1_hub, initial), NIGHTS[0].steps.n1_hub)
const definition = CH2_SHIFTS[0].steps
for (const bought of [false, true]) {
  const s = { ...freshState('m'), flags: bought ? { bai_tube: true } : {}, ap: 3 }
  const choices = ch2StepForState('c2n1_hub', definition.c2n1_hub, s).choices
    .filter(c => /^c2n1_a[bn]1$/.test(c.next) && condOk(s, c.cond))
  assert.equal(choices.length, 1)
  const id = bought ? 'c2n1_ab1' : 'c2n1_an1'
  assert.equal(choices[0].next, id)
  assert.equal(definition[id].bg, 'bg_corridor_cr_covered')
  assert.equal(definition[id.slice(0, -1) + '2'].sfx, `vox_ch2_natural_fan_${bought ? 'a' : 'b'}`)
}
console.log('PASS archive access/early exit/both discovery orders/key purchase/AP/old save; both corridor branches and original voice mappings')
