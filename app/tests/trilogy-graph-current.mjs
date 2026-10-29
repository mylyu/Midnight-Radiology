// Current graph contract: live files only, no Git history or fixed content totals.
// node --import tsx tests/trilogy-graph-current.mjs
import assert from 'node:assert/strict'
import { TRILOGY } from '../src/game/trilogy-registry.ts'

// These are semantic capabilities, not a freeze on the number of labs or cases.
const coreTasks = {
  ch3: ['probe', 'tgc', 'm_mode', 'doppler'],
  ch4: ['sequence', 'mri-encoding', 'mri-sampling'],
  ch5: ['fusion', 'spect', 'counting'],
}
const scanKinds = { ch3: 'ultrasound', ch4: 'mri', ch5: 'pet' }
const totals = {}

for (const [id, chapter] of Object.entries(TRILOGY)) {
  const steps = chapter.steps
  assert(chapter.steps[chapter.afterQuiz], `${id}: after-quiz ending exists`)
  for (const shift of chapter.shifts) {
    assert(steps[shift.start], `${id}: shift start exists: ${shift.start}`)
    if (shift.checkinAt) assert(steps[shift.checkinAt], `${id}: check-in cursor exists: ${shift.checkinAt}`)
  }
  for (const [node, step] of Object.entries(steps)) {
    const edges = [step.next, step.tool?.next,
      ...(step.choices ?? []).flatMap(choice => [choice.next, choice.risk?.next])].filter(Boolean)
    for (const target of edges) {
      if (!target.startsWith('@')) assert(steps[target], `${id}/${node}: dangling successor ${target}`)
    }
    if (step.tool) assert(steps[step.tool.next], `${id}/${node}: lab has a real completion target`)
    if (step.scan) {
      assert.equal(step.scan.kind, scanKinds[id], `${id}/${node}: acquisition matches the modality`)
      assert.equal(step.scan.durationMs ?? 3000, 3000, `${id}/${node}: acquisition performance stays three seconds`)
      assert.equal(step.image ?? '', '', `${id}/${node}: result is not exposed before acquisition`)
      assert.equal(step.effect, undefined, `${id}/${node}: no result reward before acquisition`)
      assert(steps[step.next], `${id}/${node}: acquisition has a real result target`)
    }
  }
  const tasks = new Set(Object.values(steps).filter(step => step.tool).map(step => step.tool.task))
  for (const task of coreTasks[id]) assert(tasks.has(task), `${id}: current core lab remains available: ${task}`)
  const values = Object.values(steps)
  totals[id] = {
    nodes: values.length,
    tools: values.filter(step => step.tool).length,
    scans: values.filter(step => step.scan).length,
    tasks: [...tasks].sort(),
  }
}

console.log(JSON.stringify({ status: 'passed', contract: 'current-live-graph', totals }, null, 2))
