// Targeted state paths: current liver/echo flow, old cursors and one-time receipts.
// node --import tsx tests/ch3-echo-tgc-flow.mjs
import assert from 'node:assert/strict'
import { CH3 } from '../src/game/ch3.ts'
import { freshState, condOk } from '../src/game/store.ts'
import { initializeTrilogy, patchTrilogy, enterTrilogyNode, trilogyProgress, trilogyStep,
  trilogyAdvance, trilogyChoose, updateTrilogyTool, completeTrilogyTool,
  beginTrilogyScan, completeTrilogyScan, nextTrilogyShift } from '../src/game/trilogy-session.ts'

const copy = value => JSON.parse(JSON.stringify(value))
const numbers = s => Object.fromEntries(['gold', 'skill', 'heart', 'wealth', 'ap'].map(key => [key, s[key]]))
const progress = s => trilogyProgress(s, 'ch3')
const range = (prefix, last) => Array.from({ length: last + 1 }, (_, index) => `${prefix}_${index}`)
const sameSave = (a, b, why) => assert.deepEqual(copy(a), copy(b), why)
function fixture(node, shift = 1, flags = {}, patch = {}) {
  const s = initializeTrilogy({ ...freshState('f'), seed: 20261027, gold: 730, skill: 12, heart: 9, wealth: 4,
    flags, dlc: { ch2: { done: true, marker: 'keep-ch2' }, ldct: { done: true, marker: 'keep-ldct' } } }, CH3, 'echo-tgc-flow')
  return enterTrilogyNode(patchTrilogy(s, 'ch3', { shift, ...patch }), CH3, node)
}
function continueOnce(s, answer = 'c3_wang_color_direction') {
  const node = progress(s).stepId, step = trilogyStep(s, CH3)
  let next
  if (step.tool) {
    next = completeTrilogyTool(s, CH3, node)
    sameSave(completeTrilogyTool(copy(next), CH3, node), next, `${node}: stale rapid completion is ignored`)
  } else if (step.scan) {
    const started = beginTrilogyScan(s, CH3, node, 1000)
    if (!progress(started).scans[node].completed)
      sameSave(completeTrilogyScan(copy(started), CH3, node, 3999), started, `${node}: acquisition keeps its full duration`)
    next = completeTrilogyScan(started, CH3, node, 4000)
    sameSave(completeTrilogyScan(copy(next), CH3, node, 4001), next, `${node}: no second scan completion`)
  } else if (step.choices?.length) {
    const choices = step.choices.filter(c => !c.next.startsWith('@') && condOk(s, c.cond))
    const choice = node === 'c3_wang_color_question' ? choices.find(c => c.next === answer)
      : /_hub$/.test(node) ? choices.at(-1) : choices[0]
    assert(choice, `${node}: continuation exists`)
    next = trilogyChoose(s, CH3, node, choice)
    sameSave(trilogyChoose(copy(next), CH3, node, choice), next, `${node}: stale rapid choice is ignored`)
  } else next = trilogyAdvance(s, CH3, node)
  assert(progress(next).stepId !== node || progress(next).phase !== progress(s).phase, `${node}: no stuck cursor`)
  return next
}
function walk(s, target, path = [], answer) {
  const seen = new Set()
  for (let count = 0; count < 100; count++) {
    const node = progress(s).stepId
    assert(!seen.has(node), `No cycle while reaching ${target}: ${node}`)
    seen.add(node); path.push(node)
    sameSave(initializeTrilogy(copy(s), CH3), s, `${node}: refresh preserves the cursor and receipts`)
    if (node === target) return s
    s = continueOnce(s, answer)
  }
  assert.fail(`Did not reach ${target}`)
}
function preservedOtherChapters(before, after) {
  assert.deepEqual(after.dlc.ch2, before.dlc.ch2)
  assert.deepEqual(after.dlc.ldct, before.dlc.ldct)
}
function oneEach(s, key, ids) {
  for (const id of ids) assert.equal(s[key].filter(item => item === id).length, 1, `${id}: one collection entry`)
}

const liverPath = ['c3_s2_plan_5', ...range('c3_s2_pause', 2), ...range('c3_liver_arrive', 4),
  'c3_liver_scan', ...range('c3_liver_tgc_intro', 1), 'c3_s2_plan_6', ...range('c3_s2_finish', 2), 'c3_liver_observe']
const newLiverStart = fixture('c3_s2_plan_5'), newLiverPath = []
const newLiver = walk(newLiverStart, 'c3_liver_observe', newLiverPath)
assert.deepEqual(newLiverPath, liverPath)
assert.deepEqual(numbers(newLiver), { ...numbers(newLiverStart), skill: newLiverStart.skill + 1 })
assert.deepEqual(Object.keys(progress(newLiver).scans), ['c3_liver_scan'])
assert.equal(progress(newLiver).tools.c3_s2_plan_6.completed, true)
oneEach(newLiver, 'badges', ['c3_depth_keeper'])
oneEach(newLiver, 'cards', ['c3_depth', 'c3_compare'])
assert(!newLiver.cards.includes('c3_liver_compare'), 'No observation card reveals the answer early')
preservedOtherChapters(newLiverStart, newLiver)

// Image-based TGC resumes its exact slider state after the acquired scan.
const partialTgc = { value: 43, secondary: 67, choice: '凸阵' }
let tgc = fixture('c3_s2_plan_6', 1, {}, { scans: { c3_liver_scan: { startedAt: 1000, completed: true } } })
tgc = updateTrilogyTool(tgc, 'ch3', 'c3_s2_plan_6', partialTgc)
const restoredTgc = initializeTrilogy(copy(tgc), CH3), imageTool = trilogyStep(restoredTgc, CH3).tool
assert.equal(imageTool.task, 'tgc')
assert.equal(imageTool.variant, 'liver')
assert.equal(imageTool.image, 'us_c3_hepatorenal_v1')
assert.deepEqual(progress(restoredTgc).tools.c3_s2_plan_6, partialTgc)
const completedTgc = completeTrilogyTool(restoredTgc, CH3, 'c3_s2_plan_6')
assert.deepEqual(numbers(completedTgc), { ...numbers(tgc), skill: tgc.skill + 1 })
sameSave(completeTrilogyTool(copy(completedTgc), CH3, 'c3_s2_plan_6'), completedTgc, 'Rapid TGC completion does not repay')
sameSave(enterTrilogyNode(copy(completedTgc), CH3, 'c3_s2_finish_0'), completedTgc, 'Refresh of TGC reward does not repay')
const completedCursor = patchTrilogy(copy(completedTgc), 'ch3', { stepId: 'c3_s2_plan_6' })
assert(!trilogyStep(completedCursor, CH3).tool, 'A completed tool cursor has an ordinary continuation')
sameSave(completeTrilogyTool(copy(completedCursor), CH3, 'c3_s2_plan_6'), completedCursor, 'Saved completed tool cannot submit again')
const completedPath = [], afterCompleted = walk(completedCursor, 'c3_liver_observe', completedPath)
assert.deepEqual(completedPath, ['c3_s2_plan_6', ...range('c3_s2_finish', 2), 'c3_liver_observe'])
assert.deepEqual(numbers(afterCompleted), numbers(completedCursor))
assert.deepEqual(progress(afterCompleted).tools, progress(completedCursor).tools)

// Old pre-scan tool states retain the phantom, then acquire this patient once.
for (const alreadyCompleted of [false, true]) {
  let old = fixture('c3_s2_plan_6', 1, {}, {
    tools: { c3_s2_plan_6: { ...partialTgc, ...(alreadyCompleted ? { completed: true } : {}) } },
    ...(alreadyCompleted ? { applied: ['c3_s2_finish_0', 'c3_s2_finish_1'] } : {}),
  })
  if (alreadyCompleted) old = { ...old, badges: ['c3_depth_keeper'], cards: ['c3_depth', 'c3_compare'] }
  const oldTool = trilogyStep(old, CH3).tool
  if (alreadyCompleted) assert(!oldTool)
  else {
    assert.equal(oldTool.title, '教学台 · 深处为什么更暗')
    assert.equal(oldTool.variant, undefined)
    assert.equal(oldTool.image, undefined)
  }
  const path = [], after = walk(copy(old), 'c3_liver_observe', path)
  assert.deepEqual(path, ['c3_s2_plan_6', ...range('c3_s2_finish', 2), ...range('c3_liver_arrive', 4),
    'c3_liver_scan', 'c3_liver_tgc_intro_0', 'c3_liver_observe'])
  assert.deepEqual(numbers(after), { ...numbers(old), skill: old.skill + (alreadyCompleted ? 0 : 1) })
  assert.deepEqual(progress(after).tools.c3_s2_plan_6, { ...partialTgc, completed: true })
  oneEach(after, 'badges', ['c3_depth_keeper'])
  oneEach(after, 'cards', ['c3_depth', 'c3_compare'])
}
for (const node of range('c3_liver_tgc_intro', 1)) {
  const old = fixture(node, 1, {}, { tools: { c3_s2_plan_6: { ...partialTgc, completed: true } } })
  const after = trilogyAdvance(copy(old), CH3, node)
  assert.equal(progress(after).stepId, 'c3_liver_observe', `${node}: completed old practice is not reopened`)
  assert.deepEqual(numbers(after), numbers(old))
}
// Old saves with the observed-image visit but no scan receipt must not scan twice.
for (const patch of [{ scans: { c3_liver_scan: { startedAt: 1000, completed: true } } }, { visited: ['c3_liver_observe'] }]) {
  const old = fixture('c3_s2_finish_2', 1, {}, patch)
  assert.equal(trilogyStep(old, CH3).next, 'c3_liver_observe')
  assert.equal(trilogyStep(old, CH3).image, 'us_c3_hepatorenal_v1')
  const after = trilogyAdvance(copy(old), CH3, 'c3_s2_finish_2')
  assert.equal(progress(after).stepId, 'c3_liver_observe')
  assert.deepEqual(numbers(after), numbers(old))
}
for (const node of ['c3_liver_observe', 'c3_liver_explain_6', 'c3_s2_finish_3']) {
  const old = fixture(node)
  sameSave(initializeTrilogy(copy(old), CH3), old, `${node}: later old saves are never rewound`)
}

const cardiacPrefix = ['c3_s3_wang_7', ...range('c3_s3_motion', 4), ...range('c3_wang_color_intro', 1),
  ...range('c3_wang_color', 1), 'c3_wang_color_question']
const cardiacTail = [...range('c3_wang_spectrum', 2), ...range('c3_wang_finish_modes', 2),
  'c3_s3_wang_8', 'c3_s3_wang_9', ...range('c3_s3_after_wang', 1), 'c3_s3_waiting_0']
for (const answer of ['c3_wang_color_direction', 'c3_wang_color_vessel']) {
  const start = fixture('c3_s3_wang_7', 2), path = []
  const after = walk(start, 'c3_s3_waiting_0', path, answer)
  assert.deepEqual(path, [...cardiacPrefix, answer, ...cardiacTail])
  assert.deepEqual(numbers(after), numbers(start), 'B/M/D transitions and either D question grant no points or AP')
  assert.deepEqual(Object.keys(progress(after).tools), ['c3_s3_motion_2'])
  assert.equal(progress(after).scans, undefined, 'Changing modes does not acquire a second examination')
  oneEach(after, 'cards', ['c3_echo'])
  assert(after.flags.c3_wang_reviewed)
  preservedOtherChapters(start, after)
  for (const node of [...range('c3_wang_spectrum', 2), ...range('c3_wang_finish_modes', 2)]) {
    const step = trilogyStep(fixture(node, 2), CH3)
    assert(!step.effect && !step.card && !step.tool && !step.scan, `${node}: no added task/reward`)
    assert.equal(!!step.echoSpectrum, node.startsWith('c3_wang_spectrum_'))
  }
}

// Old Wang saves can be inside or after M-mode; a discharged patient stays gone.
for (let index = 0; index <= 4; index++) for (const completed of [false, true]) {
  const node = `c3_s3_motion_${index}`
  const old = fixture(node, 2, { c3_wang_reviewed: true }, {
    tools: { c3_s3_motion_2: { value: 61, secondary: 50, choice: '凸阵', completed } },
  })
  const path = [], after = walk(copy(old), 'c3_s3_waiting_0', path)
  assert.deepEqual(path, [...range('c3_s3_motion', 4).slice(index), 'c3_s3_waiting_0'])
  assert.deepEqual(numbers(after), numbers(old))
  assert.equal(progress(after).tools.c3_s3_motion_2.value, 61, 'Old M-mode timeline value survives continuation')
  assert.equal(progress(after).tools.c3_s3_motion_2.secondary, 50)
  assert(!path.some(id => /c3_wang_|c3_s3_wang_|c3_s3_after_wang_/.test(id)), 'No recalled patient or repeated report')
  for (const id of path.slice(0, -1)) {
    const restored = patchTrilogy(copy(after), 'ch3', { stepId: id }), step = trilogyStep(restored, CH3)
    assert.equal(step.sprite, 'char_mei')
    assert(!step.sprite2, 'Old review has no Wang portrait')
    if (id === 'c3_s3_motion_2' && completed) assert(!step.tool)
  }
  oneEach(after, 'cards', ['c3_echo'])
}
const completedMotion = fixture('c3_s3_motion_2', 2, {}, {
  tools: { c3_s3_motion_2: { value: 61, secondary: 50, choice: '凸阵', completed: true } },
})
assert(!trilogyStep(completedMotion, CH3).tool)
sameSave(completeTrilogyTool(copy(completedMotion), CH3, 'c3_s3_motion_2'), completedMotion, 'A saved completed M-mode task cannot resubmit')
const completedMotionPath = [], afterMotion = walk(copy(completedMotion), 'c3_s3_waiting_0', completedMotionPath)
assert.deepEqual(completedMotionPath, [...cardiacPrefix.slice(3), 'c3_wang_color_direction', ...cardiacTail])
assert.deepEqual(numbers(afterMotion), numbers(completedMotion))
assert.deepEqual(progress(afterMotion).tools, progress(completedMotion).tools)
for (const node of ['c3_s3_wang_8', 'c3_s3_wang_9', ...range('c3_s3_after_wang', 1)]) {
  const old = fixture(node, 2, { c3_wang_reviewed: true }), path = []
  const after = walk(copy(old), 'c3_s3_waiting_0', path)
  assert(!path.some(id => id.startsWith('c3_s3_motion') || id.startsWith('c3_wang_')))
  assert.deepEqual(numbers(after), numbers(old))
}

// One lightweight session walk verifies the six retained real cases remain in order.
// This is state coverage, not a browser or full-interaction playthrough.
let session = fixture(CH3.shifts[0].start, 0)
const scans = [], tools = [], seen = new Set()
for (let count = 0; count < 500; count++) {
  const p = progress(session), node = p.stepId
  if (p.phase === 'settle') {
    if (p.shift === 4) break
    session = nextTrilogyShift(session, CH3)
    continue
  }
  assert.equal(p.phase, 'story')
  assert(!seen.has(node), `Mainline contains no loop: ${node}`)
  seen.add(node)
  const step = trilogyStep(session, CH3)
  if (step.scan) scans.push(node)
  if (step.tool) tools.push(node)
  session = continueOnce(session)
}
assert.equal(progress(session).phase, 'settle')
assert.equal(progress(session).shift, 4)
assert.deepEqual(scans, ['c3_s1_aunt_scan', 'c3_s1_stone_scan', 'c3_s2_cousin_scan', 'c3_liver_scan',
  'c3_s3_wang_scan', 'c3_s3_xu_scan'])
assert.equal(new Set(scans).size, 6, 'The retired bedside case does not introduce a substitute acquisition')
assert.equal(tools.length, 7)
assert.equal(new Set(tools).size, 7, 'Each retained tool appears once')
assert(seen.has('c3_liver_observe') && seen.has('c3_wang_spectrum_2'))
console.log('PASS CH3 liver TGC and B/M/D flow: exact paths, old cursors, saved tools, reward guards, two questions and six ordered cases')
