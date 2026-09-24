import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { CH2_SHIFTS } from '../src/game/ch2.ts'
import { CH2_DAWN_LEADIN_STEPS, CH2_DAWN_STEPS, CH2_DAWN_SHOTS, ch2DawnStep } from '../src/game/ch2-dawn.ts'
import { CH2_SCANS } from '../src/game/ch2-scans.ts'
import { CH2_OBSERVATIONS } from '../src/game/ch2-observations.ts'
import { freshState } from '../src/game/store.ts'

const steps = Object.assign({}, ...CH2_SHIFTS.map(shift => shift.steps))
const thick = ['c2d2_4', 'c2d2_5', 'c2d2_6a', 'c2d2_6b', 'c2d2_6c']
const thin = ['c2d2_w1', 'c2d2_w1ok', 'c2d2_7']
for (const id of thick) {
  assert.equal(steps[id].image, 'ch2_lung_thick_v2')
  assert.equal(steps[id].imageLabel, '本次数据 · 5 mm 厚层')
}
for (const id of thin) {
  assert.equal(steps[id].image, 'ct_lung')
  assert.equal(steps[id].imageLabel, '本次数据 · 1 mm 薄层重建')
}
assert.notEqual(steps.c2d2_4.image, steps.c2d2_w1.image)
assert.equal(CH2_SCANS.c2d2_w1.mode, 'reconstruct', 'Never adds a second exposure')
assert.equal(CH2_SCANS.c2d2_w1.durationMs, 1500)
assert.equal(steps.c2d2_w1.windowTask.image, 'ct_lung', 'Numerical window source stays original')
assert.equal(CH2_OBSERVATIONS.c2d2_w1ok.image, 'ct_lung')
assert.equal(CH2_OBSERVATIONS.c2d2_w1ok.id, 'lung-observe-v1', 'No fresh observation reward ID')
assert.equal(CH2_OBSERVATIONS.c2d2_w1ok.choices.find(choice => choice.correct).id, 'upper-right')
assert.equal(createHash('sha256').update(readFileSync(new URL('../public/assets/ct_lung.png', import.meta.url))).digest('hex'), CH2_OBSERVATIONS.c2d2_w1ok.assetVersion)
assert.notEqual(createHash('sha256').update(readFileSync(new URL('../public/assets/ch2_lung_thick_v2.png', import.meta.url))).digest('hex'), CH2_OBSERVATIONS.c2d2_w1ok.assetVersion)

const state = freshState('f'), snapshot = JSON.stringify(state)
let id = ch2DawnStep('c2n3_x9', steps.c2n3_x9, state).next
const seen = []
while (id !== 'c2n3_dawn0') {
  assert(seen.length < 4)
  seen.push(id)
  const step = CH2_DAWN_LEADIN_STEPS[id]
  assert(step && steps[id] === step)
  assert.equal(CH2_DAWN_SHOTS[id], undefined, 'No sunrise camera before arriving at the window')
  for (const key of ['effect', 'choices', 'sfx', 'card', 'event', 'windowTask', 'end']) assert.equal(step[key], undefined, `${id}: narrative only`)
  for (const key of ['sprite2', 'image', 'imageLabel', 'phone', 'radio']) assert.equal(step[key], '')
  assert(!String(step.sprite).includes('pat_'), 'Departed patient is cleared')
  id = step.next
}
assert.deepEqual(seen, ['c2n3_handoff0', 'c2n3_handoff1', 'c2n3_handoff2'])
assert.match(CH2_DAWN_LEADIN_STEPS.c2n3_handoff0.text, /白班.*交接/)
assert.match(CH2_DAWN_LEADIN_STEPS.c2n3_handoff1.text, /下班.*一起走.*包子/)
assert.match(CH2_DAWN_LEADIN_STEPS.c2n3_handoff2.text, /控制室.*走廊.*暖光/)
assert.match(CH2_DAWN_STEPS.c2n3_dawn0.text, /窗前.*看出去/)
assert.equal(CH2_DAWN_SHOTS.c2n3_dawn0, 'arrival')
assert.equal(Object.keys(CH2_DAWN_STEPS).length, 22, 'Existing cinematic keeps its complete dialogue')
assert.equal(ch2DawnStep('c2n3_x9', steps.c2n3_x9, { flags: { c2_dawn_done: true } }).next, 'c2n3_s1')
assert.equal(JSON.stringify(state), snapshot)
console.log('PASS distinct thick/thin images, original window data/observation/rewards, three ordinary-room handoff beats before the unchanged cinematic, old completed saves do not rewind')
