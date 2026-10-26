// Focused current-story/legacy-save checks; this is not a browser playthrough.
import assert from 'node:assert/strict'
import { CH3 } from '../src/game/ch3.ts'
import { freshState, condOk } from '../src/game/store.ts'
import { isTrilogyPlayable } from '../src/game/chapter-availability.ts'
import { initializeTrilogy, patchTrilogy, enterTrilogyNode, trilogyProgress, trilogyStep,
  trilogyAdvance, trilogyChoose, completeTrilogyTool, beginTrilogyScan, completeTrilogyScan } from '../src/game/trilogy-session.ts'

const clone = s => JSON.parse(JSON.stringify(s))
const fixture = (node, flags = {}) => {
  let s = initializeTrilogy({ ...freshState('f'), seed: 20261026, flags }, CH3, 'ch3-focus')
  return patchTrilogy(s, 'ch3', { stepId: node })
}
function walkTo(s, target, visited = []) {
  for (let n = 0; n < 100; n++) {
    const p = trilogyProgress(s, 'ch3'), step = trilogyStep(s, CH3)
    visited.push(p.stepId)
    if (p.stepId === target) return s
    const before = p.stepId
    if (step.tool) s = completeTrilogyTool(s, CH3, p.stepId)
    else if (step.scan) s = completeTrilogyScan(beginTrilogyScan(s, CH3, p.stepId, 1000), CH3, p.stepId, 4000)
    else if (step.choices?.length) {
      const choices = step.choices.filter(c => !c.next.startsWith('@') && condOk(s, c.cond))
      const choice = /hub$/.test(p.stepId) ? choices.at(-1) : choices[0]
      assert(choice, `Available continuation at ${p.stepId}`)
      s = trilogyChoose(s, CH3, p.stepId, choice)
    } else s = trilogyAdvance(s, CH3, p.stepId)
    assert.notEqual(trilogyProgress(s, 'ch3').stepId, before, `No stuck story connector: ${before}`)
  }
  assert.fail(`Did not reach ${target}`)
}

assert(isTrilogyPlayable('ch3'))
assert(!isTrilogyPlayable('ch4') && !isTrilogyPlayable('ch5'))
assert.equal(Object.values(CH3.steps).filter(s => s.tool).length, 8)
assert.equal(Object.values(CH3.steps).filter(s => s.scan).length, 6)
for (const step of Object.values(CH3.steps)) for (const c of step.choices ?? [])
  assert(!/[（(]\d+行动力[）)]/.test(c.text), 'No prose AP suffix on choices')

const path = []
walkTo(fixture('c3_s1_hub'), 'c3_s1_aunt_8', path)
assert(path.indexOf('c3_s1_aunt_6') < path.indexOf('c3_s1_aunt_0'), 'Probe practice precedes patient arrival')
assert(!path.slice(path.indexOf('c3_s1_aunt_0')).some(id => CH3.steps[id].tool), 'No practice interrupting aunt examination')
let old = fixture('c3_s1_aunt_6')
old = patchTrilogy(old, 'ch3', { visited: ['c3_s1_aunt_0'], tools: { c3_s1_aunt_6: { value: 40, secondary: 50, choice: '线阵' } } })
old = completeTrilogyTool(old, CH3, 'c3_s1_aunt_6')
assert.equal(trilogyStep(old, CH3).next, 'c3_s1_aunt_scan', 'Legacy in-patient progress does not repeat patient introduction')
const once = clone(old)
assert.deepEqual(clone(completeTrilogyTool(old, CH3, 'c3_s1_aunt_6')), once, 'Old tool completion cannot grant twice')
assert.equal(CH3.steps.c3_s5_assess_3.tool.task, 'spatial_resolution')
for (let i = 5; i <= 13; i++) {
  const s = fixture(`c3_epilogue_${i}`), step = trilogyStep(s, CH3)
  assert.equal(step.next, 'c3_epilogue_14', 'Removed long travel resumes at the short current follow-up')
  assert.equal(step.effect, undefined, 'Legacy bridge cannot fabricate rewards')
}
const finished = patchTrilogy(fixture('c3_s5_assess_4'), 'ch3', {
  tools: { c3_s5_assess_3: { value: 50, secondary: 50, choice: '凸阵', completed: true } },
  applied: ['c3_s5_assess_4'] })
assert.deepEqual(initializeTrilogy(finished, CH3), finished, 'Old completed gain exercise does not require a new exercise or repay')

for (const [node, flag, field, delta] of [
  ['c3_s2_listen', 'c3_cousin_listened', 'heart', 2],
  ['c3_s4_cost_right', 'c3_gel_ledger', 'wealth', 2],
  ['c3_s5_notice_desk', 'c3_xu_query_assisted', 'heart', 1],
]) {
  const newRun = fixture('c3_s1_hub'), earned = enterTrilogyNode(newRun, CH3, node)
  assert.equal(earned[field], newRun[field] + delta)
  assert.deepEqual(clone(enterTrilogyNode(clone(earned), CH3, node)), clone(earned))
  const legacy = fixture(node, { [flag]: true }), resumed = enterTrilogyNode(legacy, CH3, node)
  assert.equal(resumed[field], legacy[field], 'Original choice flag guards relocated reward')
}

for (const borrowed of [false, true]) for (const met of [false, true]) {
  let s = fixture('c3_s5_hub', { ...(borrowed ? { c3_s4_lei_done: true } : {}), ...(met ? { c3_han_met: true } : {}) })
  const p = trilogyStep(s, CH3).choices.find(c => c.next === 'c3_s5_lei_0')
  assert.equal(p.text.includes('还'), borrowed, 'Returning an item requires actually borrowing it')
  const beforeAP = s.ap
  s = trilogyChoose(s, CH3, 'c3_s5_hub', p)
  s = walkTo(s, 'c3_s5_hub')
  assert.equal(s.ap, beforeAP - 1)
  assert(s.flags.c3_s5_lei_done, 'Optional paper follow-up cannot overwrite exploration completion')
  assert(!trilogyStep(s, CH3).choices.some(c => c.next === 'c3_s5_lei_0' && condOk(s, c.cond)))
}
let empty = { ...fixture('c3_s1_hub'), ap: 0 }
const exploration = trilogyStep(empty, CH3).choices.find(c => c.cond?.ap)
assert.deepEqual(trilogyChoose(empty, CH3, 'c3_s1_hub', exploration), empty, 'Zero AP cannot spend or start exploration')
walkTo(empty, 'c3_s1_aunt_0')
console.log('PASS CH3 pre-patient practice, legacy receipts, eight tasks, four borrowed/paper routes, zero AP and future-entry config')
