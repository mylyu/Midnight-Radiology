import assert from 'node:assert/strict'
import { CH2_SHIFTS } from '../src/game/ch2.ts'
import { CH2_TERMINAL_STEPS, CH2_TERMINAL_CUES, CH2_TERMINAL_PANELS,
  CH2_TERMINAL_EVIDENCE, ch2TerminalAfterNight3, ch2TerminalStep } from '../src/game/ch2-terminal.ts'
import { applyEffect, condOk, freshState } from '../src/game/store.ts'
import { restartCh2 } from '../src/game/ch2-exploration.ts'

const original = Object.assign({}, ...CH2_SHIFTS.map(shift => shift.steps))
const added = Object.assign({}, ...Object.values(CH2_TERMINAL_STEPS))
const steps = { ...original, ...added }
const fresh = flags => ({ ...freshState('f'), ap: 3, gold: 500, flags: { ...flags }, dlc: { ch2: {} } })
const render = (id, state) => {
  assert(steps[id], `Missing node ${id}`)
  const snapshot = JSON.stringify(state)
  const node = ch2TerminalStep(id, steps[id], state)
  assert.equal(JSON.stringify(state), snapshot, `${id}: renderer mutated state`)
  return node
}
const show = (node, state) => (node.choices ?? []).filter(choice => condOk(state, choice.cond))

// Traverse the same step/choice effects, saving and restoring at every step.
function walk(start, state, targets, stop) {
  let id = start, s = structuredClone(state)
  const visited = [], applied = new Set()
  for (let count = 0; count < 80; count++) {
    if (id === stop) return { state: s, visited }
    visited.push(id)
    const node = render(id, s)
    if (!applied.has(id)) { s = applyEffect(s, node.effect); applied.add(id) }
    if (node.choices) {
      const next = targets[id]
      assert(next, `Choice missing at ${id}`)
      const choice = show(node, s).find(c => c.next === next)
      assert(choice, `Unavailable ${id} -> ${next}`)
      s = applyEffect(s, choice.effect)
      id = choice.next
    } else id = node.next
    assert(id, `Dead end ${visited.at(-1)}`)
    s = JSON.parse(JSON.stringify(s))
  }
  assert.fail('Unexpected cycle: ' + visited.join(' -> '))
}

// Original voices, choices, AP and rewards stay intact; looking is optional.
const n1 = render('c2n1_b4', fresh())
assert.deepEqual(n1.choices.slice(0, original.c2n1_b4.choices.length), original.c2n1_b4.choices)
assert.deepEqual(render('c2n1_b1', fresh()), original.c2n1_b1)
const firstLook = walk('c2n1_terminal_look', fresh(), {}, 'c2n1_b4')
assert.equal(firstLook.state.ap, 3)
assert(firstLook.state.flags.c2_terminal_n1_seen)
assert(!show(render('c2n1_b4', firstLook.state), firstLook.state).some(c => c.next === 'c2n1_terminal_look'))
assert(firstLook.visited.includes('c2n1_terminal_leave'), 'The first-night look must include Lei confirming the separate uplink')
assert.match(added.c2n1_terminal_leave.text, /小雷.*单独的外网.*院内PACS另走一条/)

// Before offering any unplug action, repeat the actual wiring confirmation;
// a player may have skipped the optional first-night close-up entirely.
for (const flags of [{}, { c2_terminal_n1_seen: true }]) {
  const beforeChoice = render('c2n3_terminal_0', fresh(flags))
  assert.match(beforeChoice.text, /先给小雷确认线号/)
  assert.match(beforeChoice.text, /厂家外网.*只通这个盒子.*院内PACS另走线路/)
  assert.equal(beforeChoice.choices.length, 3)
  assert(beforeChoice.choices.some(choice => choice.next === 'c2n3_terminal_unplug'))
  assert(!beforeChoice.effect?.flag?.includes('unplugged'), 'Checking the wiring does not itself disconnect anything')
}

// No new scores, badges, items, shared sounds, scans or exams are hidden in this side story.
for (const [id, node] of Object.entries(added)) {
  for (const candidate of [node, ...(node.choices ?? [])]) {
    assert(!candidate.sfx && !candidate.sfx2 && !candidate.card && !candidate.event)
    if (candidate.effect?.flag) assert.match(candidate.effect.flag, /^c2_terminal_/)
    for (const key of ['gold', 'skill', 'heart', 'wealth', 'durability', 'badge', 'item', 'loseItem']) {
      assert.equal(candidate.effect?.[key], undefined, `${id}: changed ${key}`)
    }
    if (candidate.effect?.ap !== undefined) assert(id === 'c2n3_terminal_0' && candidate.effect.ap === -1)
  }
  assert(!node.windowTask && !node.checklist && !node.readout)
  for (const target of [node.next, ...(node.choices ?? []).map(c => c.next)].filter(Boolean)) assert(steps[target], `${id} -> ${target}`)
  assert.doesNotMatch(node.text ?? '', /十五根|陆舟|陆川|环状伪影|1998|父亲/)
}

const actions = ['untouched', 'look-only', 'ask-offline', 'quiet-offline', 'ask-reconnect', 'quiet-reconnect']
const stances = ['support', 'oppose', 'audit']
const encounters = ['key-save', 'key-forget', 'screen-save', 'screen-forget', 'pass-back-save', 'pass-leave']
let routes = 0
for (const action of actions) for (const note of [false, true]) {
  const reconnects = action.endsWith('reconnect')
  const targets = {
    c2n3_terminal_0: action === 'untouched' ? 'c2n3_terminal_done' : action === 'look-only' ? 'c2n3_terminal_look' : 'c2n3_terminal_unplug',
    c2n3_terminal_look: 'c2n3_terminal_device_note',
    c2n3_terminal_call: action.startsWith('quiet') ? 'c2n3_terminal_quiet' : 'c2n3_terminal_ask',
    c2n3_terminal_connection_q: reconnects ? 'c2n3_terminal_reconnect' : 'c2n3_terminal_keep_offline',
    c2n3_terminal_note_q: note ? 'c2n3_terminal_note' : 'c2n3_terminal_done',
  }
  const night3 = walk('c2n3_terminal_0', fresh(), targets, 'c2n3_hub')
  const hadCall = !['untouched', 'look-only'].includes(action)
  assert.equal(night3.state.ap, 2)
  assert.equal(night3.state.gold, 500)
  assert.equal(Boolean(night3.state.flags.c2_terminal_call_received), hadCall)
  assert.equal(Boolean(night3.state.flags.c2_terminal_call_noted), hadCall && (note || reconnects))
  assert.equal(Boolean(night3.state.flags.c2_terminal_device_noted), action === 'look-only')
  assert.equal(ch2TerminalAfterNight3(night3.state), !hadCall ? 'untouched' : reconnects ? 'reconnected' : 'offline')
  assert.equal(night3.visited.includes('c2n3_terminal_connection_q'), hadCall, 'Every caller response ends in an explicit connection decision')
  assert.equal(night3.visited.includes('c2n3_terminal_probe'), hadCall, 'Every caller path includes the sample probe')
  if (reconnects) assert(!night3.visited.includes('c2n3_terminal_note_q'), 'Reconnection must preserve the promised call record')
  assert(!show(render('c2n3_hub', night3.state), night3.state).some(c => c.next === 'c2n3_terminal_0'))
  const repeated = render('c2n3_terminal_0', night3.state)
  assert.equal(repeated.effect, undefined)
  assert.equal(repeated.next, 'c2n3_hub')
  assert.equal(Boolean(night3.visited.includes('c2n3_terminal_wait')), hadCall)
  const samples = render('c2d4_e3', night3.state)
  assert.deepEqual(samples.effect, original.c2d4_e3.effect, 'Connection callbacks retain the original proposal flag')
  assert.equal(samples.next, original.c2d4_e3.next, 'Connection callbacks retain the original meeting route')
  if (!hadCall) assert.deepEqual(samples, original.c2d4_e3, 'Do not fabricate a cable/phone memory for untouched or look-only routes')
  else if (reconnects) assert.equal(samples.text, original.c2d4_e3.text + '你说对方催着复线，那通电话的时间也记进核查单，一起对日志。')
  else assert.equal(samples.text, original.c2d4_e3.text + '我查的是你断网前留下的样本，不是拔线后还在传。')
  for (const stance of stances) {
    let s = structuredClone(night3.state)
    const pick = original.c2d4_e6.choices.find(c => c.effect.flag === `data_${stance}`)
    assert(pick)
    const beforeChoice = { gold: s.gold, skill: s.skill, heart: s.heart }
    s = applyEffect(s, pick.effect)
    assert.deepEqual(render('c2d4_e6', s).choices, original.c2d4_e6.choices)
    const meeting = walk(pick.next, s, {}, 'c2d4_reg')
    s = meeting.state
    assert(s.flags.c2_terminal_stopped && s.flags.data_hook)
    assert.equal(s.gold, beforeChoice.gold)
    assert.equal(s.skill, beforeChoice.skill + (pick.effect.skill ?? 0))
    assert.equal(s.heart, beforeChoice.heart + (pick.effect.heart ?? 0))
    assert.equal(s.badges.includes('gatekeeper'), stance === 'audit')
    if (hadCall && !reconnects) assert.match(render('c2d4_terminal_stop', s).text, /先前拔下.*没有接回/)
    if (reconnects) assert.match(render('c2d4_terminal_stop', s).text, /接回过.*重新拔下/)
    for (const encounter of encounters) {
      const n5Start = { ...s, ap: 3, dlc: { ch2: { shift: 'c2n5' } } }
      const isPass = encounter.startsWith('pass'), isKey = encounter.startsWith('key'), saves = encounter.endsWith('save')
      const choices = {
        c2n5_e1: isPass ? 'c2n5_terminal_pass_alarm' : isKey ? 'c2n5_terminal_key' : 'c2n5_terminal_screen',
        c2n5_terminal_turn_q: encounter === 'pass-leave' ? 'c2n5_terminal_done' : 'c2n5_terminal_screen',
        c2n5_terminal_screen_q: saves ? 'c2n5_terminal_save' : 'c2n5_terminal_done',
        c2n5_e2: 'c2n5_e3c',
      }
      const last = walk('c2n5_e1', n5Start, choices, 'c2n5_hub')
      assert.equal(last.state.ap, 2, 'Original patrol charges once')
      assert(last.state.flags.c2n5_e && last.state.flags.c2_terminal_n5_done)
      assert.equal(Boolean(last.state.flags.c2_terminal_receipt_saved), saves)
      assert.equal(Boolean(last.state.flags.c2_terminal_receipt_seen), encounter !== 'pass-leave')
      assert.equal(Boolean(last.state.flags.c2_terminal_voice_heard), isKey)
      const cues = last.visited.filter(id => CH2_TERMINAL_CUES[id])
      assert.equal(cues.filter(id => CH2_TERMINAL_CUES[id].kind === 'alarm').length, isPass || isKey ? 1 : 0)
      assert.equal(cues.filter(id => CH2_TERMINAL_CUES[id].kind === 'receipt').length, isKey ? 1 : 0)
      assert.equal(last.visited.includes('c2n5_terminal_screen_history'), hadCall && encounter !== 'pass-leave')
      assert(!show(render('c2n5_hub', last.state), last.state).some(c => c.next === 'c2n5_e1'))
      assert.equal(render('c2n5_e1', last.state).effect, undefined)
      assert.deepEqual(render('c2n5_e2', last.state).choices, original.c2n5_e2.choices, 'Original patrol rewards unchanged')
      assert.equal(render('c2n5_n7', last.state).text, original.c2n5_n7.text, 'Past samples stay past, not resumed uploading')
      const restarted = restartCh2(last.state)
      assert(!Object.keys(restarted.flags).some(flag => flag.startsWith('c2_terminal_')))
      routes++
    }
  }
}

// Old flags are knowledge, not fabricated proof of this run's call or terminal interaction.
const legacy = fresh({ remote_asked: true, lei_cable: true, wen_remote: true, data_audit: true, c2n5_e: true })
assert.equal(ch2TerminalAfterNight3(legacy), 'untouched')
assert.equal(render('c2n5_n6', legacy).text, original.c2n5_n6.text)
assert.doesNotMatch(render('c2n5_terminal_screen_history', legacy).text, /我拔线|刚才播的/)
assert.equal(render('c2am_6', fresh()).next, 'c2am_terminal_sms')
assert.equal(render('c2am_6', fresh({ c2_terminal_end_sms_received: true })).next, 'c2am_8')
assert.match(added.c2am_terminal_sms.text, /别把盒子还给他们。/)
assert.doesNotMatch(render('c2am_terminal_sms', legacy).text, /还是|凌晨那个/)
for (const flag of ['c2_terminal_sms_seen', 'c2_sms_saved', 'c2_sms_replied']) {
  assert.match(render('c2am_terminal_sms', fresh({ [flag]: true })).text, /还是凌晨那个陌生号码/)
}
const smsShown = applyEffect(fresh(), render('c2n5_n6', fresh()).effect)
assert(smsShown.flags.c2_terminal_sms_seen, 'Reading SMS without saving or replying still supports same-number recognition')
assert.deepEqual(render('c2n5_n6', fresh()).choices, original.c2n5_n6.choices)
assert.match(render('c2am_terminal_sms', smsShown).text, /还是凌晨那个陌生号码/)
assert.equal(added.c2n5_terminal_pass_alarm.next, 'c2n5_terminal_turn_q')
assert.equal(CH2_TERMINAL_CUES.c2n5_terminal_pass_receipt, undefined)
assert.match(added.c2n3_terminal_probe.text, /最近导过质控样本没有/)
assert.match(added.c2n5_terminal_screen_time.text, /17:42.*第一晚来上班之前/)
for (const id of ['c2n5_terminal_screen', 'c2n5_terminal_screen_time', 'c2n5_terminal_screen_log', 'c2n5_terminal_screen_history']) {
  const expanded = render(id, fresh({ c2_terminal_n3_unplugged: true, c2_terminal_voice_heard: true, c2_terminal_walked_past: true })).text
  assert(expanded.length <= 65, `${id}: receipt screen must use short beats, not an explanatory paragraph`)
}
for (const [id, cue] of Object.entries(CH2_TERMINAL_CUES)) {
  assert(added[id])
  assert.equal(CH2_TERMINAL_PANELS[id].mode, 'offline', 'Do not reveal the receipt before voice/observation')
  assert.equal(CH2_TERMINAL_PANELS[id].receiptTime, undefined)
  if (cue.kind === 'receipt') assert.equal(cue.text, '样本已接收。')
}
for (const [id, panel] of Object.entries(CH2_TERMINAL_PANELS)) {
  assert(added[id])
  assert.equal(added[id].image, panel.mode === 'online' ? 'ch2_terminal_online_v1' : 'ch2_terminal_closeup_v1')
  if (panel.mode === 'receipt') assert.equal(panel.receiptTime, '试运行记录 · 17:42')
}
for (const record of Object.values(CH2_TERMINAL_EVIDENCE)) {
  assert.match(record.flag, /^c2_terminal_/)
  assert.match(record.body, /未核实|尚待核查/)
}
console.log(`PASS ch2-terminal-data: ${routes} connection × stance × encounter paths; original rewards/AP/voices, separate saved evidence, offline receipt, cue sequencing, legacy and restart guards`)
