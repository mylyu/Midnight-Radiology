import assert from 'node:assert/strict'
import { CH2_NEEDLE_STEPS, CH2_NEEDLE_EVIDENCE, ch2NeedleStep } from '../src/game/ch2-needles.ts'
import { CH2_SOCIAL_STEPS, ch2SocialStep } from '../src/game/ch2-social.ts'
import { assertCtaCharactersMedia } from './ch2-cta-characters-projection.mjs'

const steps = Object.assign({}, ...Object.values(CH2_NEEDLE_STEPS))
const external = new Set(['c2d4_chat0', 'c2n5_chat_q', 'c2n5_m0'])
const images = new Set(['ch2_needle_axial_v1', 'ch2_needle_mpr_v1', 'ch2_needle_vr_v1', 'ch2_needle_record_v1'])
const labels = new Set(['外院既往CT', '同次数据重组'])
const noEffects = ['gold', 'skill', 'wealth', 'heart', 'durability', 'badge', 'ap', 'item', 'loseItem']
for (const [shift, rows] of Object.entries(CH2_NEEDLE_STEPS)) {
  assert(['c2d4', 'c2n5'].includes(shift))
  for (const [id, step] of Object.entries(rows)) {
    assert(id.startsWith(`${shift}_needle_`) || id.startsWith(`${shift}_needle`))
    for (const key of ['sfx', 'sfx2', 'card', 'event', 'windowTask', 'checklist', 'readout', 'end', 'stamp', 'pedal', 'dose']) {
      if (id === 'c2d4_needle0' && key === 'sfx') {
        assert.equal(step.sfx, 'vox_ch2_luo_entrance_20260925')
        assertCtaCharactersMedia(step.sfx) // Sole separately reviewed entrance voice, not a broad exception.
      } else assert.equal(step[key], undefined, `${id}: no new acquisition, voice or reward system`)
    }
    if (step.image) assert(images.has(step.image), `${id}: dedicated versioned asset`)
    if (step.imageLabel) assert(labels.has(step.imageLabel), `${id}: no new scan attribution`)
    for (const effect of [step.effect, ...(step.choices ?? []).map(choice => choice.effect)].filter(Boolean)) {
      for (const key of noEffects) assert.equal(effect[key], undefined, `${id}: narrative flags only, no rewards/AP cost`)
      assert.match(effect.flag, /^c2_needle_/)
    }
    for (const next of [step.next, ...(step.choices ?? []).map(choice => choice.next)].filter(Boolean)) assert(steps[next] || external.has(next), `${id}: dangling target ${next}`)
  }
}
assert.equal(Object.keys(CH2_NEEDLE_EVIDENCE).length, 4)
for (const evidence of Object.values(CH2_NEEDLE_EVIDENCE)) {
  assert(images.has(evidence.image))
  assert.match(evidence.flag, /^c2_needle_/)
  assert(Object.values(steps).some(step => step.effect?.flag === evidence.flag), `${evidence.flag}: unlocked by both supported story routes where appropriate`)
}

const dayEntry = { speaker: 'zhou', text: '先留一份分机。', next: 'c2d4_chat0', effect: { flag: 'existing_flag' } }
assert.equal(ch2NeedleStep('c2d4_reg2', dayEntry, { flags: {} }).next, 'c2d4_needle0')
assert.deepEqual(ch2NeedleStep('c2d4_reg2', dayEntry, { flags: {} }).effect, dayEntry.effect)
assert.equal(ch2NeedleStep('c2d4_reg2', dayEntry, { flags: { c2_needle_seen: true } }), dayEntry)
const firstImage = steps.c2d4_needle_axial
assert.equal(firstImage.imageLabel, '外院既往CT')
assert.match(steps.c2d4_needle0.text, /自己走进来/)
assert.equal(steps.c2d4_needle0.sprite, 'ch2_pat_luo_v1')
assert(!steps.c2d4_needle0.image, 'show a person, not an unexplained scan first')
assert.equal(steps.c2d4_needle_q.choices.length, 3)
assert.match(steps.c2d4_needle_denial.text, /没开过刀。真没有。/)
assert.match(steps.c2d4_needle_care.text, /今天评估/)
assert.match(steps.c2d4_needle_care.text, /随访/)

// Three investigation choices and all short colleague replies preserve the
// existing Friday endpoint. Each route completes immediate care before exit.
function walk(start, initialFlags = {}, choose = () => 0, stop = external) {
  let flags = { ...initialFlags }, id = start
  const visited = []
  for (let n = 0; n < 100; n++) {
    if (stop.has(id)) return { id, flags, visited }
    assert(steps[id], `missing node ${id}`)
    const step = ch2NeedleStep(id, steps[id], { flags })
    visited.push(id)
    if (step.effect?.flag) flags[step.effect.flag] = true
    // Emulates JSON save/reload after every line without changing route/state.
    flags = JSON.parse(JSON.stringify(flags))
    id = step.choices ? step.choices[choose(id, step)].next : step.next
    assert(id, 'all new lines must have a continuation')
  }
  assert.fail(`loop at ${id}`)
}
for (let investigation = 0; investigation < 3; investigation++) {
  for (let echo = 0; echo < 3; echo++) {
    const result = walk('c2d4_needle0', {}, id => id === 'c2d4_needle_q' ? investigation : id === 'c2d4_needle_echo_q' ? echo : 0)
    assert.equal(result.id, 'c2d4_chat0')
    for (const flag of ['seen', 'axial', 'mpr', 'vr', 'assessed']) assert.equal(result.flags[`c2_needle_${flag}`], true)
    assert(!result.flags.c2_needle_resolved, 'Friday does not prematurely invent the old-treatment explanation')
    assert(result.visited.indexOf('c2d4_needle_axial') > result.visited.indexOf('c2d4_needle4'))
    assert(result.visited.indexOf('c2d4_needle_care') < result.visited.indexOf('c2d4_needle_leave'))
  }
}

// Inject after the existing social filter; never replace its sign/roster/gift
// choices, or duplicate the follow-up when an adapter is called twice.
const known = { flags: { c2_needle_seen: true, c2_social_lei: true, c2_social_wen: true } }
const social = ch2SocialStep('c2n5_chat_q', CH2_SOCIAL_STEPS.c2n5.c2n5_chat_q, known)
const combined = ch2NeedleStep('c2n5_chat_q', social, known)
assert.deepEqual(combined.choices.slice(1), social.choices)
assert.equal(combined.choices[0].next, 'c2n5_needle_reveal0')
assert.deepEqual(ch2NeedleStep('c2n5_chat_q', combined, known), combined)
assert.equal(ch2NeedleStep('c2n5_chat_q', social, { flags: {} }), social)
assert.equal(ch2NeedleStep('c2n5_chat_q', social, { flags: { c2_needle_seen: true, c2_needle_resolved: true } }), social)
for (const answer of [0, 1]) {
  const result = walk('c2n5_needle_reveal0', known.flags, () => answer)
  assert.equal(result.id, 'c2n5_chat_q')
  assert.equal(result.flags.c2_needle_record, true)
  assert.equal(result.flags.c2_needle_resolved, true)
}

// Fallback is before the original arrival. It returns exactly once to m0;
// no old save lacking this case gets a fabricated memory or new evidence.
const arrival = { bg: 'bg_corridor', text: '电梯口传来争吵声。', sfx: 'ring', next: 'c2n5_m1' }
const hub = { text: '自由行动', choices: [{ text: '开诊', next: 'c2n5_m0', cond: { flag: 'c2n5_cabinet' } }, { text: '商店', next: '@shop' }] }
const routedHub = ch2NeedleStep('c2n5_hub', hub, known)
assert.equal(routedHub.choices[0].next, 'c2n5_needle_short0')
assert.deepEqual(routedHub.choices[0].cond, hub.choices[0].cond, 'cabinet requirement unchanged')
assert.deepEqual(routedHub.choices[1], hub.choices[1])
assert.equal(ch2NeedleStep('c2n5_hub', hub, { flags: {} }), hub)
assert.equal(ch2NeedleStep('c2n5_hub', hub, { flags: { ...known.flags, c2_needle_resolved: true } }), hub)
const fallback = ch2NeedleStep('c2n5_m0', arrival, known)
assert.notEqual(fallback, arrival)
assert.equal(fallback.sfx, undefined)
assert.equal(fallback.next, 'c2n5_needle_short1')
const result = walk(fallback.next, known.flags)
assert.equal(result.id, 'c2n5_m0')
assert(result.flags.c2_needle_record && result.flags.c2_needle_resolved)
assert.equal(ch2NeedleStep('c2n5_m0', arrival, { flags: result.flags }), arrival)
assert.equal(ch2NeedleStep('c2n5_m0', arrival, { flags: {} }), arrival)
assert.equal(ch2NeedleStep('c2n5_m1', arrival, known), arrival, 'do not interrupt a child who has arrived')
for (const [id, step] of Object.entries(CH2_NEEDLE_STEPS.c2n5)) {
  const guarded = ch2NeedleStep(id, step, { flags: {} })
  assert.equal(guarded.effect, undefined)
  assert.equal(guarded.image, undefined)
  assert.equal(guarded.next, id.includes('_short') ? 'c2n5_m0' : 'c2n5_chat_q')
}
assert.match(steps.c2n5_needle_explain.text, /少见/)
assert.match(steps.c2n5_needle_memory.text, /以为针全取掉/)
assert.match(steps.c2n5_needle_short1.text, /并非有意隐瞒/)
assert.match(steps.c2n5_needle_short2.text, /针灸不是一回事/)
assert.doesNotMatch(JSON.stringify(CH2_NEEDLE_STEPS), /1998|匿名|陆舟|环状伪影|三十年.*新扫描/)
console.log(`PASS needle case: ${Object.keys(steps).length} narrative nodes, 9 Friday routes, 2 full Sunday routes, forced pre-arrival closure, 4 evidence records; no scan/AP/stat/card/badge changes; one independently pinned later Luo entrance voice.`)
