// Scoped lifecycle boundaries for the two reused CT acquisitions. No story replay.
// node --import tsx tests/ldct-scan.mjs
import assert from 'node:assert/strict'
import { freshState } from '../src/game/store.ts'
import { getLdctNode, getLdctSteps } from '../src/game/ldct.ts'
import { getLdctProgress, getLdctShelf, initializeLdct, selectLdctStory, ldctAction } from '../src/game/ldct-session.ts'
import { getLdctCinematic } from '../src/game/ldct-cinematics.ts'
import { CH2_SCANS, ch2ScanFrame } from '../src/game/ch2-scans.ts'
import { getLdctScanConfig, LDCT_SCAN_AUDIO, LDCT_PHANTOM_MOTION } from '../src/game/ldct-scans.ts'
import { CH2_SCAN_AUDIO } from '../src/game/ch2-scans.ts'

const clone = value => JSON.parse(JSON.stringify(value))
const p = getLdctProgress
const act = (state, type, fields = {}) => ldctAction(state, { type, ...fields })
const baseline = { ...freshState('m'), gold: 950, skill: 9, heart: 6, wealth: 4,
  flags: { scan_main_flag: true }, items: ['snack'], night: 4, ap: 2,
  dlc: { ch2: { done: true, scanSessions: { keep: { startedAt: 17, completed: true } }, certificate: { code: 'KEEP' } }, dsa: { dose: 90 } } }
function fixture(nodeId, patch = {}) {
  const state = selectLdctStory(clone(baseline), 'father')
  const progress = { ...p(state), nodeId, phase: 'story', ...patch }
  state.dlc.ldct.ldct = progress
  state.dlc.ldct.ldctStories.slots.father = progress
  return state
}
function protectedState(state) {
  for (const key of ['gold', 'skill', 'heart', 'wealth', 'items', 'badges', 'flags', 'night', 'ap'])
    assert.deepEqual(state[key], baseline[key], `scan never changes ${key}`)
  assert.deepEqual(state.dlc.ch2, baseline.dlc.ch2)
  assert.deepEqual(state.dlc.dsa, baseline.dlc.dsa)
}
const originalCh2Configs = clone(CH2_SCANS)
const t = 100000
for (const [nodeId, cinematic, nextNode, resultNode] of [
  ['lf_phantom_scan', 'phantom', 'lf_phantom_done', 'lf_review_intro_0'],
  ['lf_father_scan', 'father-scan', 'lf_scan_1', 'lf_first_fbp'],
]) {
  let state = fixture(nodeId)
  const steps = getLdctSteps(p(state)), node = getLdctNode(state)
  assert.equal(node.id, nodeId)
  const config = getLdctScanConfig(nodeId)
  assert.equal(config.id, nodeId)
  assert.equal(config.mode, 'acquire')
  assert.equal(config.durationMs, 3000)
  assert.equal(getLdctScanConfig(nodeId, 4), undefined)
  assert.equal(ch2ScanFrame(config, t, t + 2999).complete, false)
  assert.equal(ch2ScanFrame(config, t, t + 3000).complete, true)
  assert.equal(node.next, nextNode)
  const preceding = Object.values(steps).filter(candidate => candidate.next === nodeId)
  assert.equal(preceding.length, 1, `${nodeId}: one explicit narrative entry`)
  assert.equal(getLdctCinematic(preceding[0].id)?.id, cinematic, 'the closeup leads into the shared scanning sequence')
  let after = node.next
  for (let hops = 0; after !== resultNode && hops < 8; hops++) after = steps[after]?.next
  assert.equal(after, resultNode, 'the existing result is downstream of acquisition')
  assert.equal(act(state, 'advance', { nodeId }), state, 'dialogue advancement cannot skip an unstarted acquisition')
  assert.equal(act(state, 'scan:complete', { nodeId, now: t + 3000 }), state, 'completion requires a saved start')
  assert.equal(act(state, 'scan:start', { nodeId: 'wrong-node', now: t }), state)
  for (const now of [-1, Number.NaN, Number.POSITIVE_INFINITY])
    assert.equal(act(state, 'scan:start', { nodeId, now }), state, 'invalid clock input cannot start an acquisition')
  state = act(state, 'scan:start', { nodeId, now: t })
  assert.deepEqual(p(state).scanSessions[nodeId], { startedAt: t, completed: false })
  assert.equal(act(state, 'scan:start', { nodeId, now: t + 1500 }), state, 'a duplicate start cannot restart the clock')
  assert.equal(act(state, 'advance', { nodeId }), state, 'ongoing acquisition is unskippable')
  for (const now of [t - 1, t, t + 2999, Number.NaN, Number.POSITIVE_INFINITY])
    assert.equal(act(state, 'scan:complete', { nodeId, now }), state, 'acquisition never completes before its full three seconds')
  const restored = initializeLdct(clone(state))
  assert.deepEqual(p(restored).scanSessions, p(state).scanSessions, 'refresh keeps the original start timestamp')
  assert.equal(p(restored).nodeId, nodeId)
  state = act(restored, 'scan:complete', { nodeId, now: t + 3000 })
  assert.equal(p(state).nodeId, nextNode, 'completion and the existing next scene are saved atomically')
  assert.equal(p(state).scanSessions[nodeId].startedAt, t)
  assert.equal(p(state).scanSessions[nodeId].completed, true)
  assert.equal(act(state, 'scan:complete', { nodeId, now: t + 6000 }), state, 'duplicate callbacks cannot pay or advance again')
  assert.equal(act(state, 'scan:start', { nodeId, now: t + 6000 }), state, 'finished scans cannot restart themselves')
  protectedState(state)
  const completed = initializeLdct(clone(state))
  assert.deepEqual(p(completed).scanSessions, p(state).scanSessions)
  assert.deepEqual(getLdctShelf(completed).receipts, getLdctShelf(state).receipts)
  const away = fixture('lf_dinner_2', { scanSessions: clone(p(state).scanSessions) })
  assert.equal(act(away, 'scan:complete', { nodeId, now: t + 9000 }), away, 'a late callback from an unmounted scene is ignored')
  assert.equal(act(away, 'scan:start', { nodeId, now: t + 9000 }), away)
  const replayed = selectLdctStory(completed, 'father', true)
  assert.equal(p(replayed).scanSessions?.[nodeId], undefined, 'explicit replay gets its own acquisition clock')
  protectedState(replayed)
}

const priorSession = { startedAt: t, completed: true }
let secondScan = fixture('lf_father_scan', { scanSessions: { lf_phantom_scan: priorSession } })
assert.equal(act(secondScan, 'advance', { nodeId: 'lf_father_scan' }), secondScan,
  'completing the phantom scan never bypasses the separate father scan')
secondScan = act(secondScan, 'scan:start', { nodeId: 'lf_father_scan', now: t + 10000 })
assert.deepEqual(p(secondScan).scanSessions.lf_phantom_scan, priorSession, 'the second scan preserves the first receipt')
assert.equal(p(secondScan).scanSessions.lf_father_scan.completed, false)
assert.equal(act(secondScan, 'scan:complete', { nodeId: 'lf_phantom_scan', now: t + 20000 }), secondScan,
  'a different scan completion cannot finish the active one')

// The archived v4 route and saves after the insertion point are not dragged
// backwards into newly inserted examinations.
const legacy = fixture('lf_scan_0', { openingRevision: 4 })
assert.equal(getLdctSteps(p(legacy)).lf_phantom_scan, undefined)
assert.equal(getLdctSteps(p(legacy)).lf_father_scan, undefined)
assert.equal(act(legacy, 'scan:start', { nodeId: 'lf_scan_0', now: t }), legacy)
const afterScan = fixture('lf_first_fbp')
assert.equal(p(initializeLdct(clone(afterScan))).nodeId, 'lf_first_fbp')
assert.equal(p(initializeLdct(clone(afterScan))).scanSessions?.lf_father_scan, undefined)
assert.deepEqual(CH2_SCANS, originalCh2Configs, 'LDCT does not mutate the second-chapter scan registry')
assert.equal(getLdctScanConfig('lf_first_fbp'), undefined, 'reconstruction and result viewing never restart acquisition')
assert.equal(LDCT_SCAN_AUDIO, CH2_SCAN_AUDIO.acquisition, 'reuse the same approved acquisition recording')
assert.match(LDCT_PHANTOM_MOTION.label, /模体/)
console.log('PASS LDCT scan lifecycle: explicit order, full 3000ms, duplicate/late callbacks, refresh/replay, legacy route, and protected chapter state.')
