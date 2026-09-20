import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'
import { CH2_SHIFTS, CH2_IMAGE_CAPTIONS } from '../src/game/ch2.ts'
const source = execFileSync('git', ['show', '5fea950:app/src/game/ch2.ts'], { encoding: 'utf8' })
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const old = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'))
let changedText = 0
let totalText = 0
for (const shift of old.CH2_SHIFTS) {
  const now = CH2_SHIFTS.find(s => s.id === shift.id)
  assert(now)
  for (const [id, before] of Object.entries(shift.steps)) {
    const after = now.steps[id]
    assert(after, `Old save node removed: ${id}`)
    for (const field of ['effect', 'card', 'event', 'end', 'windowTask', 'checklist', 'skipUnlessFlag']) assert.deepEqual(after[field], before[field], `${id}.${field}`)
    if (id !== 'c2n1_p0') assert.equal(after.next, before.next, `${id}.next`)
    assert.deepEqual(after.choices?.map(({ text, ...rules }) => rules), before.choices?.map(({ text, ...rules }) => rules), `${id}.choice rules`)
    if (before.text) { totalText++; if (after.text !== before.text) changedText++ }
  }
  for (const [id, step] of Object.entries(now.steps)) {
    const targets = [step.next, step.windowTask?.success, step.checklist?.next, ...(step.choices ?? []).flatMap(c => [c.next, c.risk?.next])].filter(Boolean)
    for (const target of targets) assert(target.startsWith('@') || now.steps[target], `Broken link: ${id} -> ${target}`)
    assert(step.next || step.end || step.choices || step.windowTask || step.checklist, `Dead end: ${id}`)
  }
}
const first = CH2_SHIFTS[0].steps
assert.equal(first.c2n1_p0.sprite, 'pat_stone')
assert.equal(first.c2n1_p0.next, 'c2n1_pain')
assert.equal(first.c2n1_pain.sfx, 'vox_guy')
assert.equal(first.c2n1_pain.next, 'c2n1_p1')
assert.equal(first.c2n1_p5.sfx, undefined)
assert.equal(CH2_IMAGE_CAPTIONS.ct_wrist_simulated, undefined)
assert.equal(CH2_SHIFTS[4].steps.c2n5_m17.image, 'ct_head_child_followup')
// QA round (2026-09-20): CTA case aligned to undetermined/intermediate risk; in-story captions retired.
assert.equal(CH2_SHIFTS[2].steps.c2n3_h0.text.includes('非特异性ST-T改变'), true)
assert.equal(CH2_SHIFTS[2].steps.c2n3_h1.text.includes('按中低危处理'), true)
assert.equal(CH2_SHIFTS[2].steps.c2n3_h1.text.includes('肌钙蛋白阳性'), false)
assert.equal(CH2_SHIFTS[2].steps.c2n3_h1.text.includes('中高危'), false)
assert.equal(CH2_SHIFTS[2].steps.c2n3_h3a.text.includes('不支持高危'), true)
assert.equal(Object.keys(CH2_IMAGE_CAPTIONS).length, 0)
console.log(`PASS: ${changedText}/${totalText} existing text nodes refined; all old nodes, rewards, branches and task parameters preserved; no missing links.`)
