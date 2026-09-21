import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { CH2_SHIFTS, ch2StepForState, CH2_IMAGE_CAPTIONS, CH2_BOOK_PAGES, CH2_ACTIVE_BADGES, CH2_ACTIVE_CARDS } from '../src/game/ch2.ts'
import { CH2_PACING_STEPS, CH2_PATIENT_BRIDGES } from '../src/game/ch2-pacing.ts'
import { CH2_SOCIAL_STEPS } from '../src/game/ch2-social.ts'
import { CH2_PATIENT_ENTRANCES, isPatientBed } from '../src/game/ch2-patients.ts'
import { applyEffect, freshState } from '../src/game/store.ts'

const steps = Object.assign({}, ...CH2_SHIFTS.map(s => s.steps))
const pacing = Object.assign({}, ...Object.values(CH2_PACING_STEPS))
const base = { ...freshState('f'), gold: 800, ap: 3, items: [] }
const render = (id, state = base) => {
  assert(steps[id], `Missing node ${id}`)
  return ch2StepForState(id, steps[id], state)
}
const targets = s => [s.next, s.windowTask?.success, s.checklist?.next,
  ...(s.choices ?? []).flatMap(c => [c.next, c.risk?.next])].filter(Boolean)

// Prior persisted node IDs are not removed or repurposed into new chapters.
for (const source of ['ch2.ts', 'ch2-social.ts']) {
  const prior = execFileSync('git', ['show', `1452d78:app/src/game/${source}`], { encoding: 'utf8', maxBuffer: 2e6 })
  const priorIds = [...prior.matchAll(/^\s+(c2(?:n[135]|d[24]|am)_[\w]+):\s*\{/gm)].map(m => m[1])
  for (const id of priorIds) assert(steps[id], `Removed persisted ID: ${id}`)
}
for (const shift of CH2_SHIFTS) {
  for (const [id, s] of Object.entries(shift.steps)) {
    assert.doesNotMatch(s.text ?? '', /陆舟|陆川|环状伪影|第217号/, `${id}: deferred plot revived`)
    for (const next of targets(s)) if (!next.startsWith('@')) assert(shift.steps[next], `${id} -> ${next}: invalid shift edge`)
  }
}

assert.equal(CH2_PATIENT_BRIDGES.length, 9)
assert.equal(CH2_PATIENT_BRIDGES.filter(b => b.conditional).length, 1)
for (const bridge of CH2_PATIENT_BRIDGES) {
  if (bridge.from === 'c2d2_q1a/b/c') {
    for (const id of ['c2d2_q1a', 'c2d2_q1b', 'c2d2_q1c']) assert.equal(steps[id].next, bridge.entry)
  } else if (bridge.conditional) {
    assert(steps[bridge.from].choices.some(c => c.next === bridge.entry))
  } else assert.equal(steps[bridge.from].next, bridge.entry)

  for (const hasToolbox of [false, true]) {
    const state = { ...base, items: hasToolbox ? ['toolbox'] : [] }
    let choiceCount = 0
    const seen = new Set()
    function walk(id, depth = 0) {
      if (id === bridge.to || seen.has(id)) return
      assert(depth < 8, `Bridge too long/cyclic: ${bridge.entry}`)
      seen.add(id)
      assert(pacing[id], `Bridge escaped into patient story before destination: ${id}`)
      const s = render(id, state)
      for (const key of ['ap', 'gold', 'heart', 'skill', 'wealth', 'badge', 'loseItem']) {
        assert.equal(s.effect?.[key], undefined, `${id}: bridge changed ${key}`)
      }
      assert(!s.sfx && !s.sfx2 && !s.windowTask && !s.checklist, `${id}: unwanted interaction/audio`)
      if (s.choices) {
        choiceCount++
        assert.equal(s.choices.length, 2, `${id}: two conversational choices`)
        for (const c of s.choices) assert(!c.effect && !c.risk && !c.cond, `${id}: conversational choice must be freely available`)
      }
      const next = targets(s)
      assert(next.length, `Bridge dead end: ${id}`)
      next.forEach(n => walk(n, depth + 1))
    }
    walk(bridge.entry)
    assert.equal(choiceCount, 1, `${bridge.entry}: exactly one choice prompt`)
  }
}
assert.doesNotMatch(steps.c2d4_10.text, /下一位到门口/)
assert.doesNotMatch(steps.c2d2_q1a.text + steps.c2d2_q1b.text + steps.c2d2_q1c.text, /平车.*到了|平车.*进门/)
assert.match(steps.c2d2_gap_phone.text, /还在路上/)

// Tool use is once-only, does not consume the durable tool or change stats.
assert.equal(render('c2n1_gap_chair_q').choices[0].next, 'c2n1_gap_chair_check')
const toolboxState = { ...base, items: ['toolbox'] }
assert.equal(render('c2n1_gap_chair_q', toolboxState).choices[0].next, 'c2n1_gap_chair_fix')
assert.equal(render('c2n1_gap_chair_fix').effect, undefined)
const repaired = applyEffect(toolboxState, render('c2n1_gap_chair_fix', toolboxState).effect)
assert(repaired.flags.c2_chair_fixed)
assert.deepEqual(repaired.items, ['toolbox'])
assert.equal(render('c2n1_gap_chair_fix', repaired).effect, undefined)
assert.equal(render('c2n1_gap_chair_fix', repaired).text, steps.c2n1_gap_chair_fix.text, 'Applied flag must not replace the currently displayed repair line')
assert.match(render('c2n5_chat_roster2', repaired).text, /扶手拧好/)

// Both memories are strictly opt-in; no one-year-old food or working PPE.
assert.doesNotMatch(render('c2d2_lunch0').text, /苹果|工地大叔/)
assert(!render('c2d2_lunch_q').choices.some(c => c.next === 'c2d2_lunch_apples'))
const gifts = { ...base, flags: { n5_qian: true, n5_fan: true } }
assert.match(render('c2d2_lunch0', gifts).text, /今年.*新收/)
assert(render('c2d2_lunch_q', gifts).choices.some(c => c.next === 'c2d2_lunch_apples'))
const shared = applyEffect(gifts, render('c2d2_lunch_apples', gifts).effect)
assert(!render('c2d2_lunch_q', shared).choices.some(c => c.next === 'c2d2_lunch_apples'))
assert.match(render('c2n3_gap_tea_a', gifts).text, /报废眼镜.*压住排班表/)
assert.doesNotMatch(render('c2n3_gap_tea_a').text, /眼镜|去年/)
assert.equal(CH2_SOCIAL_STEPS.c2d2.c2d2_lunch0.bg, 'ch2_bg_breakroom_day')
assert.equal(CH2_SOCIAL_STEPS.c2n5.c2n5_chat0.bg, 'bg_breakroom')

assert.match(steps.c2n1_old_ct.text, /进口64排CT/)
assert.match(steps.c2n1_old_ct.text, /国产128排/)
assert.match(steps.c2n1_old_ct_reply.text, /当年.*这次成交价差不多/)
assert.match(steps.c2n1_old_ct_reply.text, /配置也不一样/)
assert.equal(steps.c2n1_b1.sfx, 'vox_ch2_natural_kai_whisper_v4')
assert.match(steps.c2n1_b1.text, /^跟你说个事儿/)
for (const id of ['c2n1_b2', 'c2n1_b3']) assert.equal(steps[id].image, 'ch2_remote_rack')
assert.equal(steps.c2n5_e1.image, 'ch2_remote_rack_offline')
assert.doesNotMatch(steps.c2n5_k1.text, /去年.*买/)

// One coronary acquisition, then slices, then same-data 3D, then physician review.
let coronaryId = 'c2n3_coronary_scan'
const coronaryPath = []
while (coronaryId !== 'c2n3_h6') {
  assert(coronaryPath.length < 12)
  coronaryPath.push(coronaryId)
  coronaryId = steps[coronaryId].next
}
assert(coronaryPath.indexOf('c2n3_coronary_slices') < coronaryPath.indexOf('c2n3_coronary_volume'))
assert.equal(coronaryPath.filter(id => steps[id].sfx === 'xray').length, 1)
assert.equal(steps.c2n3_coronary_slices.image, 'ch2_ct_coronary_slices')
assert.equal(steps.c2n3_coronary_volume.image, 'ct_coronary_cta')
assert.match(steps.c2n3_coronary_volume.text, /同一次采集/)
assert.match(steps.c2n3_h4.text, /原始薄层/)
assert.equal(steps.c2n3_h4.image, 'ch2_ct_coronary_slices')
assert.match(steps.c2d4_aorta_resist.text, /胃疼.*开点药/)
assert.equal(steps.c2d4_aorta_doctor.speaker, 'he')
assert.match(steps.c2d4_aorta_doctor.text, /突然疼起来.*往后背串/)
for (const id of ['c2d4_t1', 'c2d4_t1ok', 'c2d4_t1no', 'c2d4_t2']) assert.equal(steps[id].image, 'ch2_ct_aortic_wide')
for (const id of ['c2d4_aorta_resist', 'c2d4_aorta_wife', 'c2d4_aorta_doctor', 'c2d4_aorta_consent']) {
  const s = render(id)
  assert([s.sprite, s.sprite2].includes('ch2_patient_aorta_bed'), `${id}: patient disappeared during resistance`)
}
assert.equal(steps.c2n5_m8.imageLabel, '外院旧片｜3天前')
assert.equal(steps.c2n5_m17.imageLabel, '本院复查｜本次')
assert.deepEqual(CH2_IMAGE_CAPTIONS, {})
const fall = CH2_PATIENT_ENTRANCES.find(p => p.id === 'fall')
assert.equal(fall.sprite, 'ch2_patient_fall_bandaged_bed')
assert.equal(fall.voice, null)
assert(isPatientBed(fall.sprite))
for (const id of ['c2n1_m0', 'c2n1_m1', 'c2n1_m2', 'c2n1_m3a', 'c2n1_m3b']) {
  const s = render(id)
  assert([s.sprite, s.sprite2].includes(fall.sprite), `${id}: inconsistent bandage portrait`)
}

// The ordinary blanket callback precedes the mystery text, never replaces it.
assert.equal(steps.c2n5_n5.next, 'c2n5_phone_break')
assert.equal(steps.c2n5_phone_break.next, 'c2n5_n6')
assert.match(steps.c2n5_n6.text, /终端断了，已经出去的那份还在。/)
assert.equal(steps.c2n5_n6.choices.length, 3)
assert.equal(steps.c2n5_sms_lei_pending.phone, undefined, 'SMS must not render the ongoing-call panel')
for (const visited of [false, true]) for (const audited of [false, true]) {
  const state = { ...base, flags: { c2n5_e: visited, data_audit: audited } }
  for (const id of ['c2n5_n6', 'c2n5_sms_after']) {
    const s = render(id, state)
    if (visited) assert.match(s.text, /刚巡查.*网线/, `${id}: retain played visit memory`)
    else assert.doesNotMatch(s.text, /设备间|巡查|拔掉的网线/, `${id}: must not remember an unplayed visit`)
  }
}
for (const audited of [false, true]) for (let choiceIndex = 0; choiceIndex < 3; choiceIndex++) {
  for (let evidenceChoice = 0; evidenceChoice < 3; evidenceChoice++) {
    let s = { ...base, flags: { data_audit: audited } }
    let id = steps.c2n5_n6.choices[choiceIndex].next
    const visited = []
    while (id !== 'c2n5_g0') {
      assert(visited.length < 12, 'SMS path failed to rejoin')
      visited.push(id)
      const step = render(id, s)
      assert(!step.sfx && !step.sfx2, 'No additional phone voice/beeps')
      assert.doesNotMatch(step.text, /1998|无名胶片|封条柜/)
      s = applyEffect(s, step.effect)
      if (step.choices) {
        const c = step.choices[evidenceChoice]
        s = applyEffect(s, c.effect)
        id = c.next
      } else id = step.next
    }
    const expectsAudit = audited && choiceIndex !== 2
    assert.equal(visited.includes('c2n5_n8'), expectsAudit, 'Preserve audited evidence chain')
    assert.equal(Boolean(s.flags.audit_evidence), expectsAudit && evidenceChoice === 0)
  }
}
assert.equal(CH2_BOOK_PAGES.length, 20)
assert.equal(CH2_ACTIVE_BADGES.length, 12)
assert.equal(CH2_ACTIVE_CARDS.length, 17)
console.log(`PASS ch2-pacing-story: ${Object.keys(steps).length} nodes; 9 patient bridges; all SMS branches; media wiring; first-chapter memory gates; no new stat rewards`)
