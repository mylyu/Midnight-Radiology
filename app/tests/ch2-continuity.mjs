// Pure continuity and visual-order checks. Browser tests cover rendered timing separately.
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { CH2_SHIFTS, CH2_EVIDENCE, CH2_EVENTS, ch2StepForState } from '../src/game/ch2.ts'
const steps = Object.assign({}, ...CH2_SHIFTS.map(s => s.steps))
const base = { flags: {}, badges: [], gender: 'm', finished: true }
const text = (id, patch = {}) => ch2StepForState(id, steps[id], { ...base, ...patch }).text
assert.match(text('c2n3_x4', { flags: { mystery_told: true } }), /1998年片袋/)
assert.match(text('c2n3_x4'), /父亲/)
assert.doesNotMatch(text('c2n3_x4'), /做什么/)
assert.match(text('c2n3_x4', { finished: false }), /找家人/)
assert.match(text('c2n1_b5b', { badges: ['fixer'] }), /上回/)
assert.doesNotMatch(text('c2n1_b5b'), /上回/)
assert.match(text('c2n3_a2', { flags: { wen_card: true } }), /去年那张名片/)
assert.match(text('c2n1_b6', { flags: { kai_friend: true } }), /去年/)
assert.match(text('c2n5_a1', { flags: { archive_sealed: true } }), /去年/)
assert.match(text('c2n5_p2d', { gender: 'f' }), /^她/)
assert.equal(CH2_EVIDENCE.old_photo, undefined, 'must not overwrite chapter one father photograph')
assert.equal(CH2_EVIDENCE.ch2_team_photo.flag, 'old_register')
assert.match(CH2_EVIDENCE.ch2_team_photo.body, /年轻人是老周/)
assert.match(CH2_EVENTS.ch2_registration.body, /2024/)
assert.doesNotMatch(steps.c2n5_n8b.text, /再抓一周/)
assert.match(steps.c2n5_g0.text, /机器仍停着/)
assert.doesNotMatch(steps.c2am_3.text, /返聘期满/)
assert.match(steps.c2am_8.text, /2028年/)
assert.equal(steps.c2n5_hub.choices[0].cond.ap, undefined)
assert.equal(steps.c2n5_a1.effect, undefined)
for (const id of ['c2n1_m3a', 'c2n1_m3b', 'c2d2_3', 'c2d2_11', 'c2d2_n4', 'c2n5_m7b', 'c2n5_5']) assert.equal(steps[id].image, undefined, id + ' must not reveal future result')
for (const id of ['c2n1_c1', 'c2n1_c4b', 'c2n3_k1', 'c2n5_b1', 'c2n5_g1']) assert.equal(steps[id].image, undefined, id + ' food/ordinary prop should not cover actors')
const acquisition = [
 ['c2n1_p_scan','c2n1_p3'], ['c2d2_lung_scan','c2d2_4'], ['c2d2_gut_scan','c2d2_10'],
 ['c2d2_trauma_scan','c2d2_t1'], ['c2d2_wrist_scan','c2d2_wrist_result'],
 ['c2n3_repeat_scan','c2n3_m8'], ['c2n3_cta_scan','c2n3_m10'], ['c2n3_coronary_scan','c2n3_h4'],
 ['c2n3_mystery_scan','c2n3_x8'], ['c2d4_aorta_scan','c2d4_t1'], ['c2d4_metal_scan','c2d4_12a'],
 ['c2n5_child_scan','c2n5_m17'], ['c2n5_ring_scan','c2n5_r0'],
]
for (const [scan, result] of acquisition) {
 assert.equal(steps[scan].image, undefined, scan)
 assert.equal(steps[scan].sfx, 'xray', scan)
 assert.equal(steps[scan].next, result)
 assert(steps[result].image, result)
 assert.notEqual(steps[result].sfx, 'xray', result + ' must not start scanning after result shown')
 // All normal predecessors of a result must pass the acquisition step.
 const parents = Object.entries(steps).filter(([, s]) => s.next === result || s.choices?.some(c => c.next === result)).map(([id]) => id)
 assert.deepEqual(parents, [scan], result + ' has an acquisition bypass')
}
for (const step of Object.values(steps)) {
 for (const asset of [step.image, step.bg, step.windowTask?.image].filter(Boolean)) assert(existsSync(new URL('../public/assets/' + asset + '.png', import.meta.url)), 'Missing image ' + asset)
}
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
assert.match(app, /const step: Step = ch2StepForState\(stepId/)
console.log('PASS: cross-chapter memories, evidence IDs, dates, cabinet AP, 13 acquisition/result pairs and asset existence.')
