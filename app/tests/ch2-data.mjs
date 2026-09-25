import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'
import { CH2_DEFERRED_STEPS } from '../src/game/ch2-exploration.ts'
import { CH2_SHIFTS, CH2_IMAGE_CAPTIONS } from '../src/game/ch2.ts'
const source = execFileSync('git', ['show', '5fea950:app/src/game/ch2.ts'], { encoding: 'utf8' })
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const old = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'))
let changedText = 0
let totalText = 0
// Only these authored graph changes are allowed; all other old save nodes and rules stay frozen.
const continuityNext = {
  c2d2_w1ok: 'c2d2_thickness_question', // Authored question and answer return to the original patient reply.
  "c2n1_ab6": "c2n1_old_ct",
  "c2n1_an4": "c2n1_old_ct",
  "c2n1_p2a": "c2n1_p_scan",
  "c2n1_p2b": "c2n1_p_scan",
  "c2n1_p2c": "c2n1_p_scan",
  "c2d2_3": "c2d2_lung_scan",
  "c2d2_9a": "c2d2_gut_scan",
  "c2d2_9b": "c2d2_gut_scan",
  "c2d2_t0": "c2d2_trauma_scan",
  "c2d2_11": "c2d2_wrist_scan",
  "c2n3_m7a": "c2n3_repeat_scan",
  "c2n3_m7b": "c2n3_repeat_scan",
  "c2n3_m9": "c2n3_cta_scan",
  "c2n3_h3a": "c2n3_coronary_scan",
  "c2n3_h3b": "c2n3_coronary_scan",
  "c2n3_h3c": "c2n3_coronary_scan",
  "c2n3_x7a": "c2n3_mystery_scan",
  "c2n3_x7b": "c2n3_mystery_scan",
  "c2d4_8": "c2d4_aorta_scan",
  "c2d4_11a": "c2d4_metal_scan",
  "c2n5_m16": "c2n5_child_scan",
  "c2d2_1": "c2d2_reg0",
  "c2d4_e8": "c2d4_reg",
  "c2n5_n5": "c2n5_phone_break",
  c2n1_c4a: "c2n1_chat0", c2n1_c4b: "c2n1_chat0", c2n1_c4c: "c2n1_chat0", c2n1_c4d: "c2n1_chat0",
  c2d2_w2ok: "c2d2_lunch0", c2n3_a4a: "c2n3_chat_wen_q", c2n3_a4b: "c2n3_chat_wen_q",
  c2d4_reg2: "c2d4_chat0", c2am_6: "c2am_8",
  // Pacing round: exact bridge endpoints; rewards and tasks remain checked below.
  c2n1_d4: 'c2n1_gap_chair', c2d2_7: 'c2d2_gap_shift', c2d2_10: 'c2d2_gap_food',
  c2d2_q1a: 'c2d2_gap_phone', c2d2_q1b: 'c2d2_gap_phone', c2d2_q1c: 'c2d2_gap_phone',
  c2d2_t2: 'c2d2_gap_pen', c2n3_m13: 'c2n3_gap_tea', c2n3_h6: 'c2n3_gap_cups',
  c2d4_3: 'c2d4_aorta_resist', c2d4_10: 'c2d4_gap_thermos',
}
const continuityFields = {
  c2d4_p3b: { card: 'fbp_iterative' },
  c2n5_a1: { effect: undefined }, // mainline cabinet must not be gated by spent AP
  c2d4_e8: { event: 'ch2_data_showdown' }, // neutral chronicle for all three decisions
}
for (const shift of old.CH2_SHIFTS) {
  const now = CH2_SHIFTS.find(s => s.id === shift.id)
  assert(now)
  for (const [id, before] of Object.entries(shift.steps)) {
    if (CH2_DEFERRED_STEPS[id]) { assert(now.steps[CH2_DEFERRED_STEPS[id]]); assert(!now.steps[id]); continue }
    const after = now.steps[id]
    assert(after, `Old save node removed: ${id}`)
    for (const field of ['effect', 'card', 'event', 'end', 'windowTask', 'checklist', 'skipUnlessFlag']) {
      const allowed = continuityFields[id]
      assert.deepEqual(after[field], allowed && Object.hasOwn(allowed, field) ? allowed[field] : before[field], `${id}.${field}`)
    }
    if (id !== 'c2n1_p0') assert.equal(after.next, continuityNext[id] ?? before.next, `${id}.next`)
    let oldChoices = before.choices?.map(({ text, ...rules }) => rules)
    if (id === 'c2n5_hub') delete oldChoices[0].cond.ap
    const currentChoices = after.choices?.filter(c => !['c2n3_chat0','c2n5_chat0'].includes(c.next)).map(({ text, ...rules }) => rules)
    if (id === 'c2d2_q0') oldChoices.find(c => c.next === 'c2d2_q1a').next = 'c2d2_gap_lift'
    if (id === 'c2n5_n6') oldChoices = [
      { next: 'c2n5_sms_save' }, { next: 'c2n5_sms_reply' }, { next: 'c2n5_g0' },
    ] // Exact approved SMS options; live audit covers conditional evidence continuation.
    assert.deepEqual(currentChoices, oldChoices, `${id}.choice rules`)
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
assert.equal(CH2_SHIFTS[2].steps.c2n3_h1.text.includes('按中危继续评估'), true)
assert.equal(CH2_SHIFTS[2].steps.c2n3_h1.text.includes('肌钙蛋白阳性'), false)
assert.equal(CH2_SHIFTS[2].steps.c2n3_h1.text.includes('中高危'), false)
assert.equal(CH2_SHIFTS[2].steps.c2n3_h3a.text.includes('不支持高危'), true)
assert.equal(Object.keys(CH2_IMAGE_CAPTIONS).length, 0)
console.log(`PASS: ${changedText}/${totalText} existing text nodes refined; non-deferred nodes/rewards/tasks preserved with explicitly listed continuity links; no missing links.`)
