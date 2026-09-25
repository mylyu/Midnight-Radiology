import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import sharp from 'sharp'
import { CH2_SHIFTS, CH2_CARDS, CH2_ACTIVE_CARDS, grayToHU, ch2StepForState } from '../src/game/ch2.ts'
import { CH2_PATIENT_ENTRANCES, patientStep } from '../src/game/ch2-patients.ts'
import { CH2_SCANS } from '../src/game/ch2-scans.ts'
import { CH2_SLICE_SEQUENCES } from '../src/game/ch2-scan-sequences.ts'
import { CH2_OBSERVATIONS } from '../src/game/ch2-observations.ts'
import { CH2_CASE_COMPLETIONS } from '../src/game/ch2-ledger.ts'
import { CH2_DEFERRED_STEPS, originalCh2Step } from '../src/game/ch2-exploration.ts'
import { answerCh2Observation, startCh2Scan } from '../src/game/ch2-playback.ts'
import { freshState } from '../src/game/store.ts'
import { assertDayCasesLive, assertDayCasesImage, DAY_CASES_RETIRED, DAY_CASES_WRIST, DAY_CASES_IMAGE, DAY_CASES_IMAGE_SHA } from './ch2-day-cases-projection.mjs'

assertDayCasesLive()
const steps = Object.assign({}, ...CH2_SHIFTS.map(shift => shift.steps))
const initial = { ...freshState('m'), finished: true, gold: 900, skill: 11, heart: 9,
  flags: { queue_wait: true, quiz_grade: 'A' }, cards: ['window_advanced'],
  dlc: { dr: { done: true }, dsa: { dose: 21 }, ch2: { shift: 'c2d2', stepId: 'c2d2_10', phase: 'story' } } }
const snapshot = JSON.stringify(initial)
for (const id of DAY_CASES_RETIRED) {
  assert.equal(steps[id], undefined); assert.equal(CH2_SCANS[id], undefined)
  assert.equal(CH2_SLICE_SEQUENCES[id], undefined); assert.equal(CH2_OBSERVATIONS[id], undefined)
  assert.equal(CH2_CASE_COMPLETIONS[id], undefined)
  assert.equal(CH2_DEFERRED_STEPS[id], 'c2d2_gap_food')
  assert.equal(originalCh2Step(id), 'c2d2_gap_food')
  const plain = { speaker: 'sys', text: 'still' }
  assert.deepEqual(patientStep(id, plain), plain, `${id}: retired cursor must not inject patient image, voice or complaint`)
  assert.equal(startCh2Scan(initial, id, 1234), initial)
  assert.equal(answerCh2Observation(initial, id, 'window'), initial)
}
assert.equal(JSON.stringify(initial), snapshot, 'Migration/retired lookups do not clear old rewards, history or other chapters')
assert(!CH2_PATIENT_ENTRANCES.some(row => row.id === 'gut'))
assert.equal(Object.keys(CH2_OBSERVATIONS).length, 11)
assert.equal(Object.values(CH2_SCANS).filter(row => row.mode === 'acquire').length, 14)
assert.equal(Object.keys(CH2_CASE_COMPLETIONS).length, 11)
for (const [id, step] of Object.entries(steps)) {
  for (const to of [step.next, step.windowTask?.success, ...(step.choices ?? []).map(row => row.next)]) {
    assert(!DAY_CASES_RETIRED.includes(to), `${id}: live route cannot return to the removed case`)
  }
}
for (const id of ['c2d2_gap_shift_a', 'c2d2_gap_shift_b']) assert.equal(steps[id].next, 'c2d2_gap_food')
for (const id of ['c2d2_gap_food', 'c2d2_gap_food_q', 'c2d2_gap_food_a', 'c2d2_gap_food_b']) {
  const step = ch2StepForState(id, steps[id], initial)
  assert.doesNotMatch(step.text, /腹痛|肠梗阻|腹窗/)
  for (const field of ['sfx', 'sfx2', 'effect', 'image', 'windowTask']) assert.equal(step[field], undefined)
}

const wristPath = ['c2d2_w2ok', 'c2d2_wrist_mesh', 'c2d2_wrist_crack', 'c2d2_wrist_compare', 'c2d2_wrist_review']
assert.match(steps.c2d2_w2ok.text, /蜘蛛网.*怎么.*骨折/)
assert.equal(steps.c2d2_w2ok.speaker, 'me')
assert.match(steps.c2d2_wrist_mesh.text, /骨小梁.*正常.*骨皮质/)
assert.match(steps.c2d2_wrist_crack.text, /屏幕左边.*右上缘.*连续性中断/)
assert.match(steps.c2d2_wrist_review.text, /相邻几层.*换个方向.*摔伤的位置.*核对完整序列/)
for (const [index, id] of wristPath.entries()) {
  const row = steps[id]
  assert.equal(row.image, DAY_CASES_WRIST)
  assert.equal(row.next, wristPath[index + 1] ?? 'c2d2_lunch0')
  for (const field of ['sfx', 'sfx2', 'choices', 'effect', 'event', 'windowTask']) assert.equal(row[field], undefined)
  assert.equal(CH2_OBSERVATIONS[id], undefined, 'Natural conversation, no added diagnosis quiz')
  assert.equal(row.card, id === 'c2d2_wrist_review' ? 'window_advanced' : undefined)
}
const task = steps.c2d2_w2.windowTask
assert.deepEqual(task, { image: DAY_CASES_WRIST, targetW: 4000, targetL: 250, tolW: 400, tolL: 80, success: 'c2d2_w2ok' })
assert.equal(steps.c2d2_wrist_result.image, DAY_CASES_WRIST)
assert.equal(CH2_CARDS.window_advanced.image, DAY_CASES_WRIST)
assert.equal(CH2_ACTIVE_CARDS.length, 17)
assert.equal(Object.values(steps).filter(row => row.card === 'window_advanced').length, 1, 'One relocated card, no extra issue')
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
assert(app.includes("grayToHU(g, task.image === 'ct_wrist_simulated' || task.image === 'ct_wrist_fracture_v2')"), 'Both legacy and new wrist IDs retain the same numerical mapping')
let last = -Infinity
for (let gray = 0; gray <= 255; gray++) { const hu = grayToHU(gray, true); assert(hu >= last); last = hu }
assert.notEqual(grayToHU(190, true), grayToHU(190, false))
const bytes = assertDayCasesImage(), metadata = await sharp(bytes).metadata()
assert.equal(metadata.format, 'webp'); assert.equal(metadata.width, 768); assert.equal(metadata.height, 768)
const pixels = await sharp(bytes).removeAlpha().raw().toBuffer({ resolveWithObject: true })
const levels = new Set()
for (let i = 0; i < pixels.data.length; i += pixels.info.channels) levels.add(pixels.data[i])
assert.equal(levels.size, 255, 'Window input retains the reviewed 255 gray levels')
const record = JSON.parse(readFileSync(new URL('../../docs/ch2-day-cases-image-generation.json', import.meta.url)))
assert.equal(record.delivery.path, DAY_CASES_IMAGE); assert.equal(record.delivery.sha256, DAY_CASES_IMAGE_SHA)
assert.equal(record.import.rgbaExactAgainstPrepared, true)
assert.equal(record.import.encoding, 'lossless WebP'); assert.equal(record.preprocessing.quantization, 'none')
assert.deepEqual(record.preprocessing.resize, [768, 768])
console.log('PASS day-case LIVE data: five retired cursors safely redirect; no retired patient/scan/observation; 11 cases, 14 acquisitions; wrist method conversation and original window/17-card rules; pinned 768px lossless image and 255 gray levels')
