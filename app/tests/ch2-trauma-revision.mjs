import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'
import { loadHistoricalCh2 } from './ch2-mystery-projection.mjs'
import { CH2_CASE_COMPLETIONS } from '../src/game/ch2-ledger.ts'
import { getCh2Observation } from '../src/game/ch2-observations.ts'
import { CH2_SCANS } from '../src/game/ch2-scans.ts'

// Keep the historical lumbar/pelvis scope exact after reversing only the
// independently tested needle/terminal registration and renderer hunks.
const { CH2_SHIFTS, CH2_BOOK_PAGES, CH2_CARDS, QUIZ2 } = await loadHistoricalCh2()

const source = name => execFileSync('git', ['show', `42d18ce:app/src/game/${name}.ts`], { encoding: 'utf8', maxBuffer: 4e6 })
const url = code => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(code,
  { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString('base64')
let beforeSource = source('ch2')
for (const name of ['ch2-patients', 'ch2-social', 'ch2-pacing']) {
  beforeSource = beforeSource.replace(`'./${name}.ts'`, JSON.stringify(url(source(name))))
}
const before = await import(url(beforeSource))
const allowed = {
  c2d2_t0: ['text'], c2d2_trauma_scan: ['text'],
  c2d2_t1: ['text', 'image', 'imageLabel'], c2d2_t2: ['text'], c2d2_gap_pen: ['text'],
}
const without = (node, fields) => Object.fromEntries(Object.entries(node).filter(([key]) => !fields.includes(key)))
assert.equal(CH2_SHIFTS.length, before.CH2_SHIFTS.length)
for (const oldShift of before.CH2_SHIFTS) {
  const live = CH2_SHIFTS.find(shift => shift.id === oldShift.id)
  assert(live)
  assert.deepEqual(without(live, ['steps']), without(oldShift, ['steps']))
  assert.deepEqual(Object.keys(live.steps), Object.keys(oldShift.steps), 'No new or deleted story node')
  for (const [id, node] of Object.entries(oldShift.steps)) {
    assert.deepEqual(without(live.steps[id], allowed[id] ?? []), without(node, allowed[id] ?? []),
      `${id}: all node rules, rewards, queue, sound and unapproved content must remain exact`)
  }
}
assert.deepEqual(CH2_BOOK_PAGES, before.CH2_BOOK_PAGES)
assert.deepEqual(CH2_CARDS, before.CH2_CARDS)
assert.deepEqual(QUIZ2, before.QUIZ2)
const observation = getCh2Observation('c2d2_t1')
assert.equal(observation.id, 'trauma-sequence-v1', 'An already-completed observation must not be awarded again')
assert.equal(observation.caseId, 'trauma')
assert.deepEqual(observation.choices.map(({ id, correct, hint }) => ({ id, correct, hint })), [
  { id: 'single', correct: undefined, hint: undefined },
  { id: 'complete', correct: true, hint: undefined },
  { id: 'ask', correct: undefined, hint: true },
])
assert.equal(observation.regions, undefined, 'No invented fracture locator')
assert.match(observation.image, /lumbar_pelvis/)
assert.match(observation.imageLabel, /矢状位.*冠状位.*同次数据/)
assert.match(CH2_CASE_COMPLETIONS.c2d2_t2, /腰椎与骨盆/)
assert.equal(CH2_SCANS.c2d2_trauma_scan.mode, 'acquire')
assert.match(CH2_SCANS.c2d2_trauma_scan.title, /腰椎.*骨盆/)
console.log('PASS ch2-trauma-revision: every 42d18ce story node/rule/reward/queue/voice frozen except five named text/media changes; observation ID and reward rules preserved')
