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
assert.equal(Object.values(CH3.steps).filter(s => s.tool).length, 7, 'The author retired only the display-depth exercise')
assert.equal(Object.values(CH3.steps).filter(s => s.scan).length, 7)
for (const step of Object.values(CH3.steps)) for (const c of step.choices ?? [])
  assert(!/[（(]\d+行动力[）)]/.test(c.text), 'No prose AP suffix on choices')

// Current play goes straight to the retained gain/TGC exercise. Old cursors
// continue without the retired task, replayed rewards or lost collectibles.
assert.equal(CH3.steps.c3_s2_plan_5.next, 'c3_s2_plan_6')
assert.equal(CH3.steps.c3_s2_plan_6.tool.task, 'tgc')
assert.equal(CH3.steps.c3_s2_plan_6.tool.title, '教学台 · 深处为什么更暗')
assert(!Object.values(CH3.steps).some(s => s.tool?.task === 'depth'))
for (let i = 0; i < 4; i++) for (const completed of [false, true]) {
  const node = `c3_s2_depth_${i}`
  let s = { ...fixture(node), badges: ['c3_depth_keeper'], cards: ['c3_depth'] }
  s = patchTrilogy(s, 'ch3', { tools: { c3_s2_depth_1: { value: 60, secondary: 50, choice: '凸阵', completed } } })
  const step = trilogyStep(s, CH3)
  assert(!step.tool && !step.effect && !step.card, 'A retired cursor is plain narration')
  assert.deepEqual(completeTrilogyTool(clone(s), CH3, node), clone(s), 'Stale tool completion cannot pay or advance')
  const continued = trilogyAdvance(clone(s), CH3, node)
  assert.equal(trilogyProgress(continued, 'ch3').stepId, 'c3_s2_plan_6')
  for (const field of ['gold', 'skill', 'heart', 'wealth', 'ap', 'badges', 'cards'])
    assert.deepEqual(continued[field], s[field], `Legacy bridge preserves ${field}`)
  assert.deepEqual(trilogyProgress(continued, 'ch3').tools, trilogyProgress(s, 'ch3').tools)
  assert.deepEqual(initializeTrilogy(clone(continued), CH3), clone(continued), 'Restore stays at the retained exercise')
}
assert(!/B型|M型|B模式|M模式|B超超声|M超超声/.test(JSON.stringify({
  steps: CH3.steps, cards: CH3.cards, book: CH3.book, quiz: CH3.quiz, shifts: CH3.shifts,
})), 'CH3 dialogue, handbooks and quizzes use B超/M超 consistently')

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

// The family story leaves this run's MRI result open, without undoing an old ending.
const endingStart = patchTrilogy(fixture('c3_epilogue_0'), 'ch3', { phase: 'epilogue' })
const endingPath = []
const pendingEnding = walkTo(endingStart, 'c3_epilogue_20', endingPath)
assert(endingPath.indexOf('c3_mri_selection_2') < endingPath.indexOf('c3_epilogue_14'), 'Next-year teaser precedes the MRI suspense')
assert(endingPath.includes('c3_cousin_mri_wait_0') && endingPath.includes('c3_cousin_mri_wait_1'))
assert.equal(pendingEnding.flags.c3_cousin_mri_pending, true)
assert.equal(pendingEnding.flags.c3_cousin_followup_stable, undefined)
assert(!endingPath.some(id => /未见其他中枢结构异常|复查测量也稳定/.test(CH3.steps[id].text)))
for (const key of ['gold', 'skill', 'heart', 'wealth', 'ap']) assert.equal(pendingEnding[key], endingStart[key], 'Family dialogue adds no stats')
assert.equal(trilogyProgress(trilogyAdvance(pendingEnding, CH3, 'c3_epilogue_20'), 'ch3').phase, 'done')
for (const node of ['c3_epilogue_5', 'c3_epilogue_14', 'c3_epilogue_19']) {
  const legacy = patchTrilogy(fixture(node, { c3_cousin_followup_stable: true }), 'ch3', { phase: 'epilogue' })
  const resumed = walkTo(legacy, 'c3_epilogue_20')
  assert(resumed.flags.c3_cousin_followup_stable)
  assert.equal(resumed.flags.c3_cousin_mri_pending, undefined, 'Already known ending is not made pending again')
}
assert.match(CH3.steps.c3_intro_call_2.text, /包在我身上/)
assert.match(CH3.steps.c3_intro_visit_3.text, /家属/)
for (const flags of [{}, { c3_rotation_invited: true, c3_cousin_booking: true }]) {
  assert(!/我是梅兰/.test(trilogyStep(fixture('c3_s1_start_1', flags), CH3).text))
  assert(!/预约|窗口/.test(trilogyStep(fixture('c3_s2_start_0', flags), CH3).text))
}

for (const [node, flag, field, delta] of [
  ['c3_s2_listen', 'c3_cousin_listened', 'heart', 0],
  ['c3_s4_cost_right', 'c3_gel_ledger', 'wealth', 2],
  ['c3_s5_notice_desk', 'c3_xu_query_assisted', 'heart', 1],
]) {
  const newRun = fixture('c3_s1_hub'), earned = enterTrilogyNode(newRun, CH3, node)
  assert.equal(earned[field], newRun[field] + delta)
  assert.deepEqual(clone(enterTrilogyNode(clone(earned), CH3, node)), clone(earned))
  const legacy = fixture(node, { [flag]: true }), resumed = enterTrilogyNode(legacy, CH3, node)
  assert.equal(resumed[field], legacy[field], 'Original choice flag guards relocated reward')
}

// Ordinary mandatory dialogue keeps story receipts/collections, not stat rewards.
for (const [from, target, flag, badge, card] of [
  ['c3_s2_arrive_13', 'c3_s2_listen', 'c3_cousin_listened'],
  ['c3_s3_mirror_end_0', 'c3_s3_mirror_end_1', undefined, 'c3_second_angle', 'c3_mirror'],
  ['c3_s3_xu_7', 'c3_s3_xu_8', 'c3_xu_identity', 'c3_name_spoken'],
]) {
  const before = { ...fixture(from), skill: 12, heart: 17, wealth: 4 }
  const after = trilogyAdvance(before, CH3, from)
  assert.equal(trilogyProgress(after, 'ch3').stepId, target)
  for (const field of ['skill', 'heart', 'wealth', 'gold', 'ap']) assert.equal(after[field], before[field], `${target}: no dialogue points`)
  if (flag) assert(after.flags[flag])
  if (badge) assert(after.badges.includes(badge))
  if (card) assert(after.cards.includes(card))
  assert.deepEqual(enterTrilogyNode(clone(after), CH3, target), after, 'Resume neither grants nor claws back old points')
}

for (const borrowed of [false, true]) for (const met of [false, true]) {
  let s = fixture('c3_s5_hub', { ...(borrowed ? { c3_s4_lei_done: true } : {}), ...(met ? { c3_han_met: true } : {}) })
  const p = trilogyStep(s, CH3).choices.find(c => c.next === 'c3_s5_lei_0')
  assert.match(p.text, /休息室/, 'The hall offers a place, not a person or an invented prior action')
  const beforeAP = s.ap
  s = trilogyChoose(s, CH3, 'c3_s5_hub', p)
  assert.equal(trilogyStep(s, CH3).text.includes('标签机还得'), borrowed, 'Returning an item requires actually borrowing it')
  s = walkTo(s, 'c3_s5_hub')
  assert.equal(s.ap, beforeAP - 1)
  assert(s.flags.c3_s5_lei_done, 'Optional paper follow-up cannot overwrite exploration completion')
  assert(!trilogyStep(s, CH3).choices.some(c => c.next === 'c3_s5_lei_0' && condOk(s, c.cond)))
}
let empty = { ...fixture('c3_s1_hub'), ap: 0 }
const exploration = trilogyStep(empty, CH3).choices.find(c => c.cond?.ap)
assert.deepEqual(trilogyChoose(empty, CH3, 'c3_s1_hub', exploration), empty, 'Zero AP cannot spend or start exploration')
walkTo(empty, 'c3_s1_aunt_0')
console.log('PASS CH3 pre-patient practice, retired depth compatibility, seven tasks, terminology, legacy receipts, borrowed/paper routes and zero AP')
