import assert from 'node:assert/strict'
import { assertHistoricalMedia } from './game-delivery-media.mjs'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { CH2_SHIFTS, CH2_CARDS, ch2StepForState } from '../src/game/ch2.ts'
import { CH2_OBSERVATIONS, CH2_OBSERVATION_WINDOW_CASES, getCh2Observation } from '../src/game/ch2-observations.ts'
import { CH2_CASE_COMPLETIONS } from '../src/game/ch2-ledger.ts'
import { freshState } from '../src/game/store.ts'
import { assertDirectorDayVoiceLive } from './ch2-director-day-voice.mjs'
import { assertThicknessDialogueLive } from './ch2-thickness-dialogue.mjs'
import { DAY_CASES_RETIRED, assertDayCasesLive } from './ch2-day-cases-projection.mjs'
import { originalCh2Step } from '../src/game/ch2-exploration.ts'

assertDirectorDayVoiceLive()
assertThicknessDialogueLive()
assertDayCasesLive()

const steps = Object.assign({}, ...CH2_SHIFTS.map(shift => shift.steps))
const state = freshState('f')
const snapshot = JSON.stringify(state)
assert.equal(Object.keys(CH2_OBSERVATIONS).length, 11)
assert.equal(new Set(Object.values(CH2_OBSERVATIONS).map(x => x.id)).size, 11)
assert.equal(new Set([...Object.values(CH2_OBSERVATIONS).map(x => x.caseId), ...Object.keys(CH2_OBSERVATION_WINDOW_CASES)]).size, 11)

for (const [stepId, config] of Object.entries(CH2_OBSERVATIONS)) {
  assert(steps[stepId], `Missing saved story node: ${stepId}`)
  assert.equal(getCh2Observation(stepId, state), config)
  assert(!steps[stepId].windowTask, `${stepId}: do not bury a window task under a second interaction`)
  assert(config.choices.some(c => c.correct), `${stepId}: no independent observation response`)
  assert(config.choices.some(c => c.hint), `${stepId}: help must always be available`)
  assert.equal(new Set(config.choices.map(c => c.id)).size, config.choices.length)
  for (const choice of config.choices) {
    assert(choice.text && choice.feedback)
    assert(!choice.tag && !choice.effect && !choice.next, 'Choice cannot leak color, mutate old branches, or carry a second reward')
    assert(!(choice.correct && choice.hint), 'Help must not count as independent success')
    assert.doesNotMatch(choice.feedback, /答错|回答错误|扣分|重答|答对|正确答案/)
  }
  if (config.image) {
    // Encoding migration must not reset observation/reward identity. The helper
    // separately verifies the real delivery hash before checking this old pin.
    assertHistoricalMedia(`app/public/assets/${config.image}.png`, { sha256: config.assetVersion })
  }
  for (const region of config.regions ?? []) {
    assert(region.x >= 0 && region.y >= 0 && region.width > 0 && region.height > 0)
    assert(region.x + region.width <= 1 && region.y + region.height <= 1)
    assert(region.label)
    assert.match(config.prompt, /屏幕|图|条纹/)
  }
}
assert.equal(JSON.stringify(state), snapshot, 'Config lookup must not mutate gameplay state')
assert.equal(getCh2Observation('not-a-story-node', state), undefined)

// The wrist is deliberately just the existing interaction, not a forced lesion hunt.
assert.equal(CH2_OBSERVATION_WINDOW_CASES.wrist, 'c2d2_w2')
assert(steps.c2d2_w2.windowTask)
assert.equal(getCh2Observation('c2d2_w2'), undefined)
assert.equal(getCh2Observation('c2d2_w2ok'), undefined)

// Scan -> first image / original window -> observation -> existing interpretation.
assert.equal(steps.c2n1_m11.windowTask.success, 'c2n1_w1ok')
assert.equal(steps.c2n1_w1ok.next, 'c2n1_w2')
assert.equal(steps.c2n1_w2ok.choices.length, 3)
assert.equal(steps.c2d2_w1.windowTask.success, 'c2d2_w1ok')
assert.equal(steps.c2d2_w1ok.next, 'c2d2_thickness_question')
assert.equal(steps.c2d2_thickness_question.next, 'c2d2_thickness_reply')
assert.equal(steps.c2d2_thickness_reply.next, 'c2d2_7')
for (const id of ['c2d2_thickness_question', 'c2d2_thickness_reply']) {
  assert.equal(getCh2Observation(id), undefined, 'A conversation, not an additional question/reward interface')
  for (const field of ['effect', 'card', 'event', 'windowTask', 'choices', 'sfx']) assert.equal(steps[id][field], undefined)
}
assert.equal(steps.c2n3_coronary_where.next, 'c2n3_coronary_volume')
assert(getCh2Observation('c2n3_coronary_where'))
assert.equal(getCh2Observation('c2n3_coronary_volume'), undefined)
assert.equal(getCh2Observation('c2d4_7').rewardEligible, false)
assert.equal(getCh2Observation('c2d4_t1').rewardEligible, true)
assert.equal(steps.c2d4_8.next, 'c2d4_aorta_scan')
assert.equal(steps.c2d4_aorta_scan.next, 'c2d4_t1')

const scanNodes = ['c2n1_m7', 'c2n1_p_scan', 'c2d2_lung_scan', 'c2d2_trauma_scan', 'c2d2_wrist_scan',
  'c2n3_m5', 'c2n3_repeat_scan', 'c2n3_cta_scan', 'c2n3_coronary_scan', 'c2n3_mystery_scan',
  'c2d4_aorta_scan', 'c2d4_metal_scan', 'c2d4_m1', 'c2n5_child_scan']
for (const id of scanNodes) {
  assert(steps[id])
  assert.notEqual(steps[id].sfx, 'xray', `${id}: scan presentation owns mechanical audio, no duplicate CR sound`)
  assert.doesNotMatch(steps[id].text, /扫描完成|补扫完成|采集结束|采集完成|图像跳上|条纹明显减轻/, `${id}: result before presentation`)
}

// Newly accurate assets are chapter-specific. Early stroke is not forced to have a visible infarct.
for (const id of ['c2n1_p3', 'c2n1_p4']) assert.equal(steps[id].image, 'ct_ch2_stone_v2')
for (const id of ['c2n3_m8', 'c2n3_m9']) assert.equal(steps[id].image, 'ct_ch2_stroke_plain_v2')
assert.doesNotMatch(steps.c2n3_m8.text, /致密动脉征|隐约密度偏高/)
for (const id of ['c2n3_m10', 'c2n3_m11']) {
  assert.equal(steps[id].image, 'ct_ch2_stroke_cta_v2')
  assert.equal(steps[id].imageLabel, '冠状位血管重建｜画面右侧为患者左侧')
}
assert.match(steps.c2n3_m10.text, /患者左侧/)
assert.match(CH2_CARDS.stroke_ct_sign.body, /不是每例都有/)
assert.equal(CH2_CARDS.stone_plain.image, 'ct_ch2_stone_v2')
assert.doesNotMatch(steps.c2d2_4.text + steps.c2d2_w1ok.text, /磨玻璃/)
assert.match(getCh2Observation('c2n1_w1ok').choices.find(x => x.correct).text, /一整片/)
assert.equal(getCh2Observation('c2n1_p3').choices.find(x => x.correct).id, 'lower-right')
assert.equal(getCh2Observation('c2d2_w1ok').choices.find(x => x.correct).id, 'upper-right')
assert.equal(getCh2Observation('c2n5_m17').imageLabel, '本院复查｜本次')
assert.equal(steps.c2n5_m8.imageLabel, '外院旧片｜3天前')

// The car-crash case now covers lumbar/pelvic bone data, not another abdomen case.
// Keep saved node/observation IDs and the old handover rewards, with no focal-fracture hunt.
const trauma = getCh2Observation('c2d2_t1')
assert.equal(trauma.id, 'trauma-sequence-v1')
assert.equal(trauma.image, 'ch2_ct_lumbar_pelvis_v1')
assert.equal(steps.c2d2_t1.image, trauma.image)
assert.equal(steps.c2d2_t1.imageLabel, trauma.imageLabel)
assert.equal(trauma.regions, undefined)
assert.match(steps.c2d2_t0.text, /腰胯.*临时身份.*不用找谁点头.*医师.*腰椎和骨盆CT/)
assert.match(steps.c2d2_t1.text, /同次数据.*骨窗.*矢状位.*冠状位.*完整序列/)
assert.match(trauma.choices.find(c => c.correct).text, /骨窗.*重组.*完整序列/)
assert.match(trauma.choices.find(c => c.correct).feedback, /这次采到的数据/)
const traumaCopy = ['c2d2_t0', 'c2d2_trauma_scan', 'c2d2_t1', 'c2d2_t2', 'c2d2_gap_pen']
  .map(id => steps[id].text).join('') + JSON.stringify(trauma) + CH2_CASE_COMPLETIONS.c2d2_t2
assert.doesNotMatch(traumaCopy, /头颅|腹部|头腹|多发伤|确诊骨折|排除骨折/)
assert.deepEqual(steps.c2d2_t2.effect, { heart: 1, gold: 60 })
assert.equal(steps.c2d2_t2.next, 'c2d2_gap_pen')
assert.equal(steps.c2d2_gap_pen.next, 'c2d2_gap_pen_q')
assert.match(CH2_CASE_COMPLETIONS.c2d2_t2, /腰椎与骨盆完整序列已交接/)

// Directly preserve all prior saved story IDs, endpoints, original choices,
// rewards, and approved voices. Only 14 old CR-style xray SFX retire to CT SFX.
const baseline = execFileSync('git', ['show', '05889fa:app/src/game/ch2.ts'], { encoding: 'utf8', maxBuffer: 2e6 })
const baselineRows = [...baseline.matchAll(/^\s+(c2(?:n[135]|d[24]|am)_[\w]+):\s*(\{.*)$/gm)]
for (const [, id, line] of baselineRows) {
  if (DAY_CASES_RETIRED.includes(id)) {
    assert.equal(steps[id], undefined); assert.equal(originalCh2Step(id), 'c2d2_gap_food')
    continue // Only these five author-retired cursors, not arbitrary missing nodes.
  }
  assert(steps[id], `Removed saved node ${id}`)
  const next = line.match(/(?:next|"next")\s*:\s*['"]([^'"]+)['"]/)?.[1]
  if (next && !line.includes('choices:')) assert.equal(steps[id].next, id === 'c2d2_w1ok' ? 'c2d2_thickness_question' : id === 'c2d2_w2ok' ? 'c2d2_wrist_mesh' : next, `${id}: graph changed`)
  const voice = line.match(/sfx:\s*'(vox[^']+)'/)?.[1]
  if (voice) assert.equal(steps[id].sfx, id === 'c2d2_1' ? 'vox_ch2_natural_director_day_v3' : voice, `${id}: approved voice changed`)
}
for (const shift of CH2_SHIFTS) for (const [id, step] of Object.entries(shift.steps)) {
  const rendered = ch2StepForState(id, step, state)
  if (id === 'c2am_lowdose_teaser0') {
    assert.equal(rendered.text, '【几天后 · 午休】你的手机亮了。来电显示：陆舟——本科时住一间宿舍的老同学。', 'Only the approved named-contact invitation may mention Lu Zhou')
  } else assert.doesNotMatch(rendered.text ?? '', /陆舟|陆川|环状伪影/, `${id}: deferred story revived`)
}
console.log('PASS ch2-loop-observations: 11 configurations / 11 cases including wrist; reviewed-image hashes; safe feedback; 14 acquisition texts; five precisely retired cursors migrate, all other graph/voices preserved')
