import assert from 'node:assert/strict'
import { CH2_DAWN_STEPS, CH2_DAWN_LEADIN_STEPS, CH2_DAWN_SHOTS, ch2DawnStep } from '../src/game/ch2-dawn.ts'
import { CH2_SHIFTS } from '../src/game/ch2.ts'
import { applyEffect, freshState } from '../src/game/store.ts'
import { restartCh2 } from '../src/game/ch2-exploration.ts'

const steps = CH2_DAWN_STEPS
const original = Object.assign({}, ...CH2_SHIFTS.map(shift => shift.steps))
const choices = Object.entries(steps).filter(([, step]) => step.choices)
assert.equal(Object.keys(steps).length, 22)
assert.equal(choices.length, 2)
assert.deepEqual(Object.keys(CH2_DAWN_SHOTS).sort(), Object.keys(steps).sort())

const deniedEffects = ['gold', 'skill', 'wealth', 'heart', 'durability', 'badge', 'ap', 'item', 'loseItem']
const noMechanic = ['sfx', 'sfx2', 'card', 'event', 'windowTask', 'checklist', 'readout', 'end', 'stamp', 'pedal', 'dose', 'dnt', 'queue', 'skipUnlessFlag']
for (const [id, step] of Object.entries(steps)) {
  assert.match(id, /^c2n3_dawn/)
  assert.equal(step.bg, 'ch2_dawn_window_v1')
  for (const key of ['sprite', 'sprite2', 'image', 'imageLabel', 'phone', 'radio']) assert.equal(step[key], '', `${id}: clears preceding patient's ${key}`)
  for (const key of noMechanic) assert.equal(step[key], undefined, `${id}: narrative pause only`)
  for (const effect of [step.effect, ...(step.choices ?? []).map(choice => choice.effect)].filter(Boolean)) {
    for (const key of deniedEffects) assert.equal(effect[key], undefined, `${id}: no new score/cost/reward`)
    assert.match(effect.flag, /^c2_dawn_/)
  }
  for (const choice of step.choices ?? []) {
    assert.equal(choice.tag, undefined, 'No correct-answer colors')
    assert.equal(choice.cond, undefined, 'Personal conversation is open to all players')
    assert.equal(choice.risk, undefined, 'No random reward or penalty')
  }
  for (const target of [step.next, ...(step.choices ?? []).map(choice => choice.next)].filter(Boolean)) {
    assert(steps[target] || target === 'c2n3_s1', `${id}: dangling target ${target}`)
  }
  assert(['arrival', 'wide', 'close', 'rest'].includes(CH2_DAWN_SHOTS[id]))
}

const source = structuredClone(original.c2n3_x9)
const state = { ...freshState('f'), flags: { old_shared_flag: true } }
const before = JSON.stringify(state)
const entry = ch2DawnStep('c2n3_x9', source, state)
assert.equal(entry.next, 'c2n3_handoff0')
assert.deepEqual({ ...entry, next: source.next }, source, 'Patient departure, event and reward remain unchanged')
assert.equal(JSON.stringify(state), before, 'The adapter must not mutate saves')
assert.deepEqual(ch2DawnStep('c2n3_x9', entry, state), entry, 'Repeated render is idempotent')
assert.equal(ch2DawnStep('c2n3_x9', source, { flags: { c2_dawn_done: true } }), source, 'Do not replay a completed scene')
for (const [id, step] of Object.entries(original)) {
  if (id !== 'c2n3_x9') assert.equal(ch2DawnStep(id, step, state), step, `${id}: unrelated story must remain untouched`)
}

function snapshot(s) {
  return Object.fromEntries(['gold', 'skill', 'heart', 'wealth', 'durability', 'ap', 'items', 'badges', 'cards', 'events', 'stamps'].map(key => [key, s[key]]))
}

let routes = 0
for (const gender of ['f', 'm']) for (const study of [0, 1]) for (const life of [0, 1]) {
  let s = { ...freshState(gender), gold: 543, ap: 0, flags: { old_shared_flag: true } }
  const metrics = snapshot(s)
  const visited = [], applied = new Set()
  let id = entry.next
  for (let n = 0; id !== 'c2n3_s1' && n < 40; n++) {
    const step = ch2DawnStep(id, steps[id] ?? CH2_DAWN_LEADIN_STEPS[id], s)
    assert(step, `Missing ${id}`)
    visited.push(id)
    if (!applied.has(id)) { s = applyEffect(s, step.effect); applied.add(id) }
    // Save/restore after every line, including the completion flag: no rewind,
    // duplicated score or dependency on a new schema/audio/camera callback.
    s = JSON.parse(JSON.stringify(s))
    const pick = id === 'c2n3_dawn_study_q' ? study : life
    id = step.choices ? step.choices[pick].next : step.next
  }
  assert.equal(id, 'c2n3_s1')
  assert.equal(visited.length, 23, 'Three handoff/walk beats plus the original 20-node cinematic route')
  assert(s.flags.c2_dawn_seen && s.flags.c2_dawn_done && s.flags.old_shared_flag)
  assert.deepEqual(snapshot(s), metrics)
  assert.deepEqual([...new Set(visited.map(node => CH2_DAWN_SHOTS[node]).filter(Boolean))], ['arrival', 'wide', 'close', 'rest'])
  assert.equal(ch2DawnStep('c2n3_x9', source, s), source)

  const originalSettlement = applyEffect(s, original.c2n3_s1.effect)
  const baselineSettlement = applyEffect({ ...freshState(gender), ...metrics }, original.c2n3_s1.effect)
  assert.deepEqual(snapshot(originalSettlement), snapshot(baselineSettlement), 'Existing shift reward remains exactly once at the old settlement node')

  const reset = restartCh2({ ...s, dlc: { ch2: { shift: 'c2n3', stepId: id } } })
  assert.equal(reset.flags.c2_dawn_seen, undefined)
  assert.equal(reset.flags.c2_dawn_done, undefined)
  assert.equal(reset.flags.old_shared_flag, true)
  routes++
}

assert.match(CH2_DAWN_LEADIN_STEPS.c2n3_handoff0.text, /白班同事.*核对完记录.*签好交接/)
assert.match(steps.c2n3_dawn0.text, /东边窗前.*帘子.*看出去/)
assert.match(steps.c2n3_dawn_brochure.text, /招生册肯定是白天拍的/)
assert.match(steps.c2n3_dawn_thought.text, /交出去一张图.*后来怎么样/)
assert.match(steps.c2n3_dawn_reply.text, /转院以后不一定.*不知道/)
assert.doesNotMatch(JSON.stringify(steps), /1998|盒子|匿名|十五根|厂家|康复|治愈|抢救成功|守护生命|救死扶伤|人生的意义就是|凌晨四点.*日出|天台/)
assert.equal(original.c2n3_s1.effect.gold, 280)
console.log(`PASS dawn story: 22 nodes, 2 open choice groups, ${routes} gender/choice routes with per-line save/restore, unchanged settlement/rewards, replay cleared, no voices or medical-outcome claims.`)
