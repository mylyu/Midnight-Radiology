import assert from 'node:assert/strict'
import { CH2_SHIFTS, ch2StepForState } from '../src/game/ch2.ts'
import { CHARACTERS } from '../src/game/data.ts'
import { CH2_PAYOFF_STEPS, ch2PayoffStep } from '../src/game/ch2-payoffs.ts'
import { ch2PacingStep } from '../src/game/ch2-pacing.ts'
import { freshState } from '../src/game/store.ts'

const steps = Object.assign({}, ...CH2_SHIFTS.map(shift => shift.steps))
const state = (gender = 'm', flags = {}) => ({ ...freshState(gender), flags: { ...flags },
  dlc: { ch2: { shift: 'c2am', phase: 'story' }, dr: { done: true }, dsa: { dose: 12 } } })
const render = (id, s = state()) => ch2StepForState(id, steps[id], s)
const exceptText = ({ text: _text, ...rest }) => rest
const teaserIds = ['c2am_lowdose_teaser0', 'c2am_lowdose_teaser1', 'c2am_lowdose_meet', 'c2am_lowdose_dinner', 'c2am_lowdose_teaser2']
const optionalHistory = { data_audit: true, c2_terminal_end_sms_received: true, phantom_log: true, luzhou_formal: true }

assert.equal(CHARACTERS.luzhou.name, '陆舟 · 本科室友', 'Reuse the existing person/name, not a new Lu Chuan identity')
assert.equal(render('c2am_payoff_end').next, teaserIds[0], 'The call replaces the existing teaser, not another ending')
assert.equal(render(teaserIds[0]).bg, 'ch2_bg_breakroom_day')
assert.equal(render(teaserIds[0]).text, '【几天后 · 午休】你的手机亮了。来电显示：陆舟——本科时住一间宿舍的老同学。')
assert.equal(render(teaserIds[0]).next, teaserIds[1])
assert.equal(render(teaserIds[1]).speaker, 'luzhou')
assert.equal(render(teaserIds[1]).text, '哪天歇？出来吃个饭。我那低剂量CT课题，见面跟你吐槽。')
assert.deepEqual(render(teaserIds[1]).choices, [
  { text: '「行，我把排班发你。」', next: 'c2am_lowdose_meet' },
  { text: '「聊研究可以，你请饭。」', next: 'c2am_lowdose_dinner' },
])
assert.equal(render('c2am_lowdose_meet').text, '行，挑你睡醒的时候。别对着菜单打哈欠啊。')
assert.equal(render('c2am_lowdose_dinner').text, '我请。先吃饭，别一见面就查我进度。')

for (const gender of ['m', 'f']) for (const flags of [{}, optionalHistory]) {
  const s = state(gender, flags), before = structuredClone(s)
  for (const id of teaserIds) {
    assert.equal(steps[id], CH2_PAYOFF_STEPS.c2am[id], `${id}: registered in the real chapter graph`)
    const step = render(id, s)
    for (const field of ['image', 'sprite', 'sprite2', 'phone', 'radio']) assert.equal(step[field], '', `${id}: text-only call must not keep prior scene media`)
    for (const field of ['effect', 'event', 'card', 'sfx', 'vox', 'window', 'scan', 'queue', 'dnt']) assert.equal(step[field], undefined, `${id}: no new rewards, clinical scene, or sound`)
    for (const choice of step.choices ?? []) assert.equal(choice.effect, undefined)
    assert.doesNotMatch(step.text, /陆川|陌生号码|盒子|1998|环状伪影|伦理批件|临床数据|来院|到院|体模|师弟|师妹/)
  }
  for (const branch of ['c2am_lowdose_meet', 'c2am_lowdose_dinner']) {
    const sequence = [teaserIds[0], render(teaserIds[0], s).next, branch, render(branch, s).next]
    assert.deepEqual(sequence, [teaserIds[0], teaserIds[1], branch, 'c2am_lowdose_teaser2'])
    assert.equal(sequence.filter(id => render(id, s).end).length, 1)
    assert.equal(render(sequence.at(-1), s).end, true)
    assert.match(render(sequence.at(-1), s).text, /挂了电话.*休息日再见/)
    assert.match(render(sequence.at(-1), s).text, /DLC预告 · 低剂量CT/)
    assert.match(render(sequence.at(-1), s).text, /尚未开放/)
  }
  assert.deepEqual(s, before, 'Narrative rendering cannot invent call, gift, or cross-chapter state')
}

// These exact, already-approved lines are present in the published fa01385 baseline.
const sunriseReply = '（把保温盒摆到桌上）上回看完日出，包子果然只剩素的。这回家里卤了牛肉，给值班的都带点。'
const applesReply = '（把保温盒摆到桌上）上回大家吃了你的苹果，这回尝尝我家卤的牛肉。筷子自己拿，老周已经来过两趟了。'
for (const gender of ['m', 'f']) for (const dawn of [false, true]) for (const apples of [false, true]) {
  const s = state(gender, { c2_dawn_done: dawn, c2_apples_shared: apples })
  const step = render('c2n5_b1', s)
  assert.equal(step.text, apples ? applesReply : dawn ? sunriseReply : steps.c2n5_b1.text)
  if (apples) assert.doesNotMatch(step.text, /日出|包子/, 'The apple return remains first priority; do not pile up callbacks')
  if (!dawn && !apples) assert.doesNotMatch(step.text, /日出/, 'Do not invent an optional sunrise memory')
  assert.deepEqual(exceptText(ch2PayoffStep('c2n5_b1', steps.c2n5_b1, s)), exceptText(steps.c2n5_b1), 'Gift callback changes only one line, not reward, route, media, or audio')
  assert.equal(render('c2n5_b2', s).image, 'item_beef', 'Keep the existing illustrated gift')
}

const transitions = {
  c2n5_n3: '申请单到了。我先调出既往影像，把申请单交给值班医师确认方案，再把机房腾好。',
  c2n5_n4: '等医师回话的空当，急诊又打来电话：「有个病人投诉你们CT室空调太冷！」',
  c2am_6: '晨会散了。你把椅子推回桌下，同事们陆续出了门。',
}
for (const [id, expected] of Object.entries(transitions)) {
  for (const flags of [{}, optionalHistory]) {
    const s = state('m', flags)
    const patched = ch2PacingStep(id, steps[id], s)
    assert.equal(patched.text, expected)
    assert.deepEqual(exceptText(patched), exceptText(steps[id]), `${id}: local correction cannot change routing or mechanics`)
    assert.equal(render(id, s).text, expected, `${id}: the full adapter chain must keep the correction`)
  }
}
assert.equal(render('c2n5_n3').next, 'c2n5_n4')
assert.equal(render('c2n5_n4').next, 'c2n5_n5')
assert.doesNotMatch(render('c2n5_n3').text, /今天的图像|扫描完成/)
assert.doesNotMatch(render('c2am_6').text, /第二章.*完/)
assert.equal(render('c2am_6').next, 'c2am_terminal_sms', 'Do not cut off the anonymous threat after the meeting')
assert.equal(render('c2am_6', state('m', { c2_terminal_end_sms_received: true })).next, 'c2am_8', 'Do not replay an already received threat')
assert.match(render('c2am_terminal_sms').text, /陌生号码.*别把盒子还给他们/)
assert.equal(render('c2am_terminal_sms').next, 'c2am_8')
assert.equal(steps.c2am_8.skipUnlessFlag, 'data_audit', 'Keep the established audit-preview condition')
assert.equal(render('c2am_9').next, 'c2am_payoff_handshake', 'Keep expert recognition and the model payoff')
console.log('PASS ch2-detail-narrative: named Lu Zhou call, both short routes, no new media/rewards, eight memory variants, and exact transition text through the actual adapter chain')
