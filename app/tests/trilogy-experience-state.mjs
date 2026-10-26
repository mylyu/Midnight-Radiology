// node --import tsx tests/trilogy-experience-state.mjs (from app/)
// Production state functions + actual chapter graphs. No browser/media/storage mocks.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { TRILOGY } from '../src/game/trilogy-registry.ts'
import { applyEffect, condOk } from '../src/game/store.ts'
import { trilogyVisibleChanges } from '../src/game/trilogy-feedback.ts'
import { initializeTrilogy, restartTrilogy, patchTrilogy, enterTrilogyNode,
  trilogyProgress, trilogyStep, trilogyAdvance, trilogyChoose, trilogyCheckin,
  beginTrilogyScan, completeTrilogyScan, trilogyShopItems, trilogyBuy, trilogyGive,
  trilogyReadBook, nextTrilogyShift, completeTrilogyTool, answerTrilogyQuiz,
  nextTrilogyQuiz, finishTrilogyQuiz, issueTrilogyCertificate } from '../src/game/trilogy-session.ts'

const repo = fileURLToPath(new URL('../../', import.meta.url))
const output = resolve(repo, '../trilogy-experience-review-20261010')
const filter = process.env.TRILOGY_EXPERIENCE_FILTER ? new RegExp(process.env.TRILOGY_EXPERIENCE_FILTER) : undefined
const copy = value => JSON.parse(JSON.stringify(value))
const same = (actual, expected, why) => assert.deepEqual(copy(actual), copy(expected), why)
const stats = s => Object.fromEntries(['gold', 'skill', 'heart', 'wealth', 'ap'].map(k => [k, s[k]]))
const protectedFields = s => Object.fromEntries(['gender', 'night', 'durability', 'lastCheckin', 'streak',
  'finished', 'seed', 'stepId', 'screenHint', 'playerName', 'playerId'].map(k => [k, s[k]]))
const report = { kind: 'targeted-production-pure-state-not-browser', baseline: '7fad7b7',
  filter: filter?.source ?? null,
  started: new Date().toISOString(), graphs: [], scans: [], items: [], feedback: [], routes: [], failures: [] }

function base() {
  return { gender: 'f', night: 5, gold: 3000, skill: 7, heart: 6, wealth: 5, durability: 83,
    badges: ['legacy_badge'], stamps: [1, 2, 3, 4, 5], flags: { legacy_marker: true, n4_kind: true },
    lastCheckin: '2026-10-09', streak: 2, finished: true, seed: 20261010,
    items: ['snack', 'milktea'], ap: 3, buyCount: 9, cards: ['legacy_card'], events: ['legacy_event'],
    stepId: 'n5_end', screenHint: 'night', playerName: '旧姓名', playerId: 'OLD-ID',
    dlc: { ch2: { done: true, certificate: { code: 'OLD-CH2', name: '旧姓名' } },
      dr: { done: true, served: ['p_qian'] }, dsa: { done: true }, ldct: { done: true, marker: 'keep-ldct' } } }
}
function fixture(chapter, node, shift = 0) {
  assert(chapter.steps[node], `${chapter.id}: fixture target ${node} exists`)
  let s = initializeTrilogy(base(), chapter, `${chapter.id}-experience-fixture`)
  s = patchTrilogy(s, chapter.id, { shift, phase: 'story', shop: { shift, buyCount: 0, lotteryCount: 0 } })
  return enterTrilogyNode(s, chapter, node)
}
function run(name, fn) {
  if (filter && !filter.test(name)) return
  try { fn(); console.log(`PASS ${name}`) }
  catch (error) { report.failures.push({ name, error: error.stack ?? String(error) }); console.error(`FAIL ${name}: ${error.message}`) }
}

function graph(chapter) {
  // Evaluate the actual small baseline chapter module in memory; no source-keyword
  // regex or whole-repo freeze, and no historical files are written into the checkout.
  const source = execFileSync('git', ['show', `7fad7b7:app/src/game/${chapter.id}.ts`], { cwd: repo, encoding: 'utf8' })
  const oldModule = { exports: {} }
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  runInNewContext(js, { exports: oldModule.exports, module: oldModule }, { timeout: 1000 })
  const old = oldModule.exports[chapter.id.toUpperCase()]
  assert(old?.steps, 'Baseline evaluated as a real chapter graph')
  const removed = Object.keys(old.steps).filter(id => !chapter.steps[id])
  assert.deepEqual(removed, [], `${chapter.id}: old saved cursors retained`)
  assert.deepEqual(Object.keys(old.characters).filter(id => !chapter.characters[id]), [], 'Existing character roles retained')
  const dangling = []
  for (const [id, step] of Object.entries(chapter.steps)) {
    const edges = [step.next, step.tool?.next, ...(step.choices ?? []).flatMap(c => [c.next, c.risk?.next])].filter(Boolean)
    for (const target of edges) if (!target.startsWith('@') && !chapter.steps[target]) dangling.push({ id, target })
  }
  assert.deepEqual(dangling, [], `${chapter.id}: every actual successor exists`)
  assert(chapter.steps[chapter.afterQuiz])
  assert(chapter.shifts.every(s => chapter.steps[s.start]))
  report.graphs.push({ chapter: chapter.id, baselineNodes: Object.keys(old.steps).length,
    currentNodes: Object.keys(chapter.steps).length, removed, dangling })
}

function scan(chapter, id, step) {
  let s = fixture(chapter, id), before = copy(s), at = 500000
  const duration = step.scan.durationMs ?? 3000
  assert.equal(step.scan.kind, { ch3: 'ultrasound', ch4: 'mri', ch5: 'pet' }[chapter.id], 'Actual acquisition uses this chapter modality')
  assert.equal(duration, 3000, `${id}: real acquisition duration stays three seconds`)
  assert.equal(step.image ?? '', '', `${id}: scan stage does not expose its result image`)
  assert.equal(step.effect, undefined, `${id}: no result reward before acquisition`)
  same(trilogyAdvance(s, chapter, id), s, 'Ordinary advance cannot bypass an unfinished scan')
  same(completeTrilogyScan(s, chapter, id, at + duration), s, 'No receipt means no completion')
  same(beginTrilogyScan(s, chapter, `${id}-stale`, at), s, 'Stale start cannot create a clock')
  s = beginTrilogyScan(s, chapter, id, at)
  same(stats(s), stats(before), 'Starting the clock grants no stats')
  assert.equal(trilogyProgress(s, chapter.id).stepId, id)
  same(s.items, before.items); same(s.badges, before.badges); same(s.cards, before.cards); same(s.flags, before.flags)
  same(beginTrilogyScan(copy(s), chapter, id, at + 999), s, 'Refresh/repeated mount keeps the first clock')
  const refreshed = copy(s)
  assert.equal(trilogyProgress(refreshed, chapter.id).scans[id].startedAt, at)
  same(completeTrilogyScan(refreshed, chapter, id, at + duration - 1), s, 'No early completion at 2999ms')
  const done = completeTrilogyScan(refreshed, chapter, id, at + duration)
  const p = trilogyProgress(done, chapter.id)
  assert.equal(p.scans[id].completed, true, 'Completion receipt commits with result cursor')
  assert.equal(p.stepId, step.next, 'Only the authored result follows the acquisition')
  assert(p.applied.includes(step.next), 'Result entry receipt is saved atomically')
  same(completeTrilogyScan(copy(done), chapter, id, at + 9000), done, 'Late/repeated finish cannot reward again')
  same(enterTrilogyNode(copy(done), chapter, step.next), done, 'Refresh at result cannot duplicate entry reward')
  const corrupt = patchTrilogy(s, chapter.id, { scans: { [id]: { startedAt: at + 60000 } } })
  const recovered = completeTrilogyScan(copy(corrupt), chapter, id, at)
  assert.equal(trilogyProgress(recovered, chapter.id).stepId, step.next, 'Invalid future clock fails open instead of permanent lock')
  assert.equal(trilogyProgress(recovered, chapter.id).scans[id].completed, true)
  report.scans.push({ chapter: chapter.id, id, kind: step.scan.kind, duration, next: step.next,
    clockPersisted: true, beforeFinishNoRewards: true, futureClockRecovered: true })
}

function useItem(chapter, item) {
  const useEntry = Object.entries(chapter.steps).find(([, step]) => step.choices?.some(c => c.cond?.item === item.id))
  assert(useEntry, `${item.id}: an actual authored use choice exists`)
  const [entry, step] = useEntry
  const shift = item.id === 'c5_seed_pot' ? 4 : item.id === 'c5_postcard' ? 1 : 0
  let s = fixture(chapter, entry, shift)
  if (item.id === 'c5_seed_pot') s = { ...s, flags: { ...s.flags, c5_qian_gift: true }, items: [...s.items, 'c5_qian_seeds'] }
  const choice = step.choices.find(c => c.cond?.item === item.id), empty = copy(s)
  assert.equal(condOk(empty, choice.cond), false, 'No possession means no visible use')
  same(trilogyChoose(empty, chapter, entry, choice), empty, 'Missing inventory cannot activate use')
  same(trilogyBuy({ ...s, gold: item.price - 1 }, chapter, item.id), { ...s, gold: item.price - 1 }, 'Insufficient money does not create item/receipt')
  const before = copy(s), bought = trilogyBuy(s, chapter, item.id)
  assert.equal(bought.gold, before.gold - item.price, 'Actual price deducted once')
  assert(bought.items.includes(item.id)); assert.equal(trilogyProgress(bought, chapter.id).shop.buyCount, 1)
  assert.equal(bought.flags[item.use], undefined, 'Purchase is not use')
  same(bought.badges, before.badges, 'Buying alone does not grant the scene badge')
  same(trilogyBuy(copy(bought), chapter, item.id), bought, 'Owned item cannot be bought twice')
  s = trilogyChoose(copy(bought), chapter, entry, choice)
  same(trilogyChoose(copy(s), chapter, entry, choice), s, 'Old choice cursor cannot consume twice')
  let hops = 0
  while (trilogyProgress(s, chapter.id).stepId !== entry && hops++ < 20) {
    const p = trilogyProgress(s, chapter.id), node = trilogyStep(s, chapter)
    if (node.end) break
    assert(!node.scan && !node.tool && !node.choices, 'Item vignette stays an ordinary short scene')
    s = copy(trilogyAdvance(s, chapter, p.stepId))
  }
  assert(hops < 20, 'Item vignette has a finite return')
  assert.equal(s.items.includes(item.id), false, 'Actual completed scene consumes inventory')
  assert.equal(s.flags[item.use], true, 'Actual consumption receipt is persisted')
  assert(s.badges.length > before.badges.length, 'Completed use grants the authored scene reward')
  assert.equal(trilogyShopItems(chapter, s).some(i => i.id === item.id), false, 'Used item disappears from shop')
  same(trilogyBuy(copy(s), chapter, item.id), s, 'Consumed once-only item cannot be repurchased')
  const revisit = enterTrilogyNode(copy(s), chapter, entry)
  assert.equal(condOk(revisit, choice.cond), false, 'Use option remains hidden after refresh/revisit')
  same(trilogyChoose(revisit, chapter, entry, choice), revisit, 'Consumed item cannot replay via stale choice')
  const last = fixture(chapter, chapter.shifts.at(-1).start, 4)
  assert(trilogyShopItems(chapter, last).some(i => i.id === item.id), 'Final story window is still available')
  for (const phase of ['settle', 'quiz', 'epilogue', 'done']) {
    const closed = patchTrilogy(last, chapter.id, { phase })
    assert.equal(trilogyShopItems(chapter, closed).some(i => i.id === item.id), false, 'Final settlement/ending closes unusable sales')
    same(trilogyBuy(closed, chapter, item.id), closed)
  }
  report.items.push({ chapter: chapter.id, id: item.id, price: item.price, use: item.use, entry, return: trilogyProgress(s, chapter.id).stepId })
}

function finalRest() {
  const chapter = TRILOGY.ch4, hub = 'c4_5_hub', rest = 'c4_5_after_shift'
  let s = trilogyBuy(fixture(chapter, hub, 4), chapter, 'c4_sleep_mask')
  s = enterTrilogyNode(s, chapter, rest)
  assert.equal(trilogyProgress(s, chapter.id).phase, 'story', 'After-shift rest is before final settlement')
  const choice = trilogyStep(s, chapter).choices.find(c => c.cond?.item === 'c4_sleep_mask')
  assert(choice && condOk(s, choice.cond), 'Last-hub purchase remains usable after clinical handover')
  s = trilogyChoose(s, chapter, rest, choice)
  for (let i = 0; i < 8 && trilogyProgress(s, chapter.id).stepId !== 'c4_5_end'; i++) s = copy(trilogyAdvance(s, chapter, trilogyProgress(s, chapter.id).stepId))
  assert.equal(trilogyProgress(s, chapter.id).stepId, 'c4_5_end')
  assert.equal(s.flags.c4_sleep_mask_used, true); assert(s.badges.includes('c4_rest_corner'))
}

function feedback(chapter) {
  let s = fixture(chapter, chapter.shifts[0].start)
  assert.deepEqual(trilogyVisibleChanges(s, applyEffect(s, { ap: -1 }), chapter.id), [], 'Only negative AP is quiet')
  assert.deepEqual(trilogyVisibleChanges(s, applyEffect(s, { ap: 1 }), chapter.id), [{ key: 'ap', amount: 1 }], 'Actual gained AP remains visible')
  assert.deepEqual(trilogyVisibleChanges(s, applyEffect(s, { ap: -1, skill: 1 }), chapter.id), [{ key: 'skill', amount: 1 }, { key: 'ap', amount: -1 }], 'Learning is not hidden by accompanying AP cost')
  assert.deepEqual(trilogyVisibleChanges(s, trilogyCheckin(s, chapter), chapter.id), [], 'Check-in panel replaces duplicate central reward')
  const buy = trilogyBuy(s, chapter, chapter.shopItems[0].id)
  assert.deepEqual(trilogyVisibleChanges(s, buy, chapter.id), [{ key: 'gold', amount: -chapter.shopItems[0].price }], 'Real purchase cost is shown')
  assert.deepEqual(trilogyVisibleChanges(s, trilogyReadBook(s, chapter), chapter.id), [{ key: 'skill', amount: 1 }], 'Book learning is shown')
  const giftNode = Object.entries(chapter.steps).find(([, step]) => step.giftTo)[0]
  s = enterTrilogyNode(s, chapter, giftNode)
  assert.deepEqual(trilogyVisibleChanges(s, trilogyGive(s, chapter, giftNode, 'snack'), chapter.id), [{ key: 'heart', amount: 1 }], 'Actual gift benefit is shown')
  const ending = Object.entries(chapter.steps).find(([, step]) => step.end && step.effect?.gold > 0)[0]
  const salary = enterTrilogyNode(s, chapter, ending)
  assert(salary.gold > s.gold); assert.deepEqual(trilogyVisibleChanges(s, salary, chapter.id), [], 'Salary is shown by settlement, without duplicate popup')
  const settled = trilogyAdvance(salary, chapter, ending), next = nextTrilogyShift(settled, chapter)
  assert.equal(trilogyProgress(next, chapter.id).shift, 1)
  assert.deepEqual(trilogyVisibleChanges(settled, next, chapter.id), [], 'New-shift AP reset is quiet')
  assert.deepEqual(trilogyVisibleChanges(next, restartTrilogy(next, chapter, 'replay'), chapter.id), [], 'Replay initialization is quiet')
  report.feedback.push(chapter.id)
}

function route(chapter) {
  let s = base(), other = Object.values(TRILOGY).find(c => c.id !== chapter.id)
  s = initializeTrilogy(s, other, 'preserve-other-progress')
  const keep = copy(s.dlc), identity = protectedFields(s)
  s = initializeTrilogy(s, chapter, `${chapter.id}-direct-production-state`)
  const visits = [], scans = [], settlements = [], checkins = []
  let clock = 1000000, count = 0
  while (!trilogyProgress(s, chapter.id).done && count++ < 650) {
    const p = trilogyProgress(s, chapter.id), step = trilogyStep(s, chapter)
    const shift = chapter.shifts[p.shift]
    if (p.phase === 'story' && !p.applied.includes(`checkin:${p.shift}`) && (!shift.checkinAt || p.stepId === shift.checkinAt)) {
      s = trilogyCheckin(s, chapter); checkins.push(p.shift)
    }
    if (p.phase === 'settle') {
      settlements.push(p.shift); same(enterTrilogyNode(copy(s), chapter, p.stepId), s, 'Settled salary cannot repay on refresh')
      s = trilogyReadBook(s, chapter); s = nextTrilogyShift(s, chapter)
    } else if (p.phase === 'quiz') {
      if (p.quiz.completed) s = finishTrilogyQuiz(s, chapter)
      else { s = answerTrilogyQuiz(s, chapter, chapter.quiz[p.quiz.questions[p.quiz.index].question].answer); s = nextTrilogyQuiz(s, chapter) }
    } else {
      visits.push(p.stepId)
      if (step.scan) {
        s = beginTrilogyScan(s, chapter, p.stepId, clock)
        s = completeTrilogyScan(s, chapter, p.stepId, clock + (step.scan.durationMs ?? 3000)); clock += 4000; scans.push(p.stepId)
      } else if (step.tool) s = completeTrilogyTool(s, chapter, p.stepId)
      else if (step.choices?.length) {
        const options = step.choices.filter(c => !c.next.startsWith('@') && condOk(s, c.cond))
        assert(options.length, `${p.stepId}: an actionable story route remains`)
        const choice = /hub$/.test(p.stepId) || /after_shift$/.test(p.stepId) ? options.at(-1) : options.find(c => c.tag === 'good') ?? options[0]
        s = trilogyChoose(s, chapter, p.stepId, choice)
      } else s = trilogyAdvance(s, chapter, p.stepId)
    }
    s = copy(s)
  }
  assert(count < 650, `${chapter.id}: one route reaches a real ending without loops`)
  assert.deepEqual(settlements, [0, 1, 2, 3, 4]); assert.deepEqual(checkins, [0, 1, 2, 3, 4])
  assert.equal(trilogyProgress(s, chapter.id).quiz.grade, 'S'); assert(visits.includes(chapter.afterQuiz))
  s = issueTrilogyCertificate(s, chapter, '状态测试', 'STATE-20261010')
  assert(trilogyProgress(s, chapter.id).certificate?.code)
  same(protectedFields(s), identity, 'Existing identity/player role and chapter1 fields stay intact')
  for (const [id, value] of Object.entries(keep)) if (id !== chapter.id) same(s.dlc[id], value, `Other progress/certificate stays intact: ${id}`)
  const restarted = restartTrilogy(copy(s), chapter, 'separate-new-run')
  for (const [id, value] of Object.entries(s.dlc)) if (id !== chapter.id) same(restarted.dlc[id], value)
  assert.equal(trilogyProgress(restarted, chapter.id).certificate, undefined)
  same(protectedFields(restarted), identity)
  report.routes.push({ chapter: chapter.id, transitions: count, storyNodes: new Set(visits).size, settlements, checkins, scans,
    certificate: trilogyProgress(s, chapter.id).certificate.code, time: 'simulated start + duration; not a browser walk' })
}

// Actual day/clinic scheduling uses evaluated configuration and displayed nodes,
// including the explicit afternoon→night transition before CH3 bedside scanning.
function schedules() {
  for (const chapter of [TRILOGY.ch3, TRILOGY.ch4]) {
    assert(chapter.shifts.every(shift => !/夜班/.test(shift.date)))
    const actualDayRooms = new Set(chapter.id === 'ch3' ? ['bg_us_room_day'] : ['bg_mri_corridor_day_v2', 'bg_mri_control_day_v2'])
    assert(chapter.shifts.every(shift => actualDayRooms.has(chapter.steps[shift.start].bg)), 'The displayed first node uses an actual daytime room')
  }
  assert.deepEqual(TRILOGY.ch3.shifts.map(s => s.background), Array(5).fill('bg_us_room_day'))
  assert.deepEqual(TRILOGY.ch4.shifts.map(s => s.background), Array(5).fill('bg_mri_corridor_day_v2'))
  assert.equal(TRILOGY.ch3.steps.c3_s3_start_0.bg, 'bg_us_room_day')
  assert.equal(TRILOGY.ch3.steps.c3_s3_mirror_0.bg, 'bg_us_bedside')
  assert.equal(TRILOGY.ch3.steps.c3_s3_bedside_scan.bg, 'bg_us_bedside')
  for (const [shift, intro, introRoom, acquisition, result] of [[1,'c5_s2_0','bg_pet_center_day_v2','c5_s2_acquire','c5_s2_scan_0'],[3,'c5_s4_0','bg_pet_control_day_v2','c5_s4_acquire','c5_s4_clinical_4']]) {
    assert.equal(TRILOGY.ch5.shifts[shift].background, 'bg_pet_center_day_v2')
    assert.equal(TRILOGY.ch5.steps[intro].bg, introRoom)
    assert.equal(TRILOGY.ch5.steps[acquisition].scan.kind, 'pet')
    assert.equal(TRILOGY.ch5.steps[acquisition].bg, 'bg_pet_control_day_v2')
    assert.equal(TRILOGY.ch5.steps[result].bg, 'bg_pet_control_day_v2')
  }
  assert.equal(TRILOGY.ch5.steps.c5_s4_0.communication, 'call', 'Afternoon phone is received in the daytime control room')
  assert.equal(TRILOGY.ch5.steps.c5_s4_3.bg, 'bg_pet_center_day_v2', 'The next in-person encounter moves to the daytime waiting area')
  assert.equal(TRILOGY.ch5.shifts[0].checkinAt, 'c5_s1_0', 'Arrival/retirement prologue is separate from first paid shift')
  assert.equal(TRILOGY.ch5.shifts[0].background, 'bg_pet_center')
}

try {
  for (const chapter of Object.values(TRILOGY)) run(`${chapter.id} saved cursors / actual graph`, () => graph(chapter))
  const scans = Object.values(TRILOGY).flatMap(chapter => Object.entries(chapter.steps).filter(([, step]) => step.scan).map(([id, step]) => ({ chapter, id, step })))
  run('14 actual acquisitions across all three modalities', () => assert.equal(scans.length, 14))
  for (const { chapter, id, step } of scans) run(id, () => scan(chapter, id, step))
  for (const chapter of Object.values(TRILOGY)) for (const item of chapter.shopItems ?? []) run(item.id, () => useItem(chapter, item))
  run('six added items have real use scenes', () => assert.equal(report.items.length, 6))
  run('CH4 final after-shift eye-mask use', finalRest)
  for (const chapter of Object.values(TRILOGY)) run(`${chapter.id} visible feedback policy`, () => feedback(chapter))
  run('actual day/clinic schedule and modality data', schedules)
  for (const chapter of Object.values(TRILOGY)) run(`${chapter.id} one production state route`, () => route(chapter))
  report.status = report.failures.length ? 'failed' : 'passed'
} finally {
  report.finished = new Date().toISOString()
  mkdirSync(output, { recursive: true })
  writeFileSync(resolve(output, filter ? 'trilogy-experience-state-focused.json' : 'trilogy-experience-state.json'), JSON.stringify(report, null, 2) + '\n')
}
if (report.failures.length) process.exitCode = 1
