// Run with: node --import tsx tests/trilogy-state.mjs
// Pure state coverage is not a browser playthrough. No real player storage is read.
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { TRILOGY } from '../src/game/trilogy-registry.ts'
import { condOk } from '../src/game/store.ts'
import { initializeTrilogy, resetTrilogy, restartTrilogy, enterTrilogyNode, trilogyProgress, trilogyStep,
  trilogyCheckin, trilogyAdvance, trilogyChoose, nextTrilogyShift, updateTrilogyTool,
  completeTrilogyTool, trilogyGive, trilogyReadBook, trilogyBuy, startTrilogyQuiz,
  answerTrilogyQuiz, nextTrilogyQuiz, finishTrilogyQuiz, issueTrilogyCertificate,
  trilogyCredential, beginTrilogyScan, completeTrilogyScan } from '../src/game/trilogy-session.ts'

const clone = value => JSON.parse(JSON.stringify(value))
const output = resolve(process.env.TRILOGY_OUTPUT || '../../trilogy-review-20261010')
const report = { kind: 'pure-state-tests-not-browser', started: new Date().toISOString(), routes: [] }
const stats = s => ({ gold: s.gold, skill: s.skill, heart: s.heart, wealth: s.wealth })
const equalState = (a, b, why) => assert.deepEqual(clone(a), clone(b), why)
function base(history = false) {
  return { gender: 'f', night: history ? 5 : 1, gold: 3000, skill: 3, heart: 4, wealth: 2,
    durability: 81, badges: ['old_badge'], stamps: history ? [1, 2, 3, 4, 5] : [],
    flags: history ? { n4_kind: true, n4_wrong: true, mystery_told: true, data_audit: true } : {},
    lastCheckin: '2026-01-01', streak: 2, finished: history, seed: 19861103,
    items: ['milktea', 'snack'], ap: 0, buyCount: 0, cards: ['old_card'], events: ['old_event'],
    playerName: '旧姓名', playerId: 'OLD-01',
    dlc: { ch2: { done: history, certificate: { marker: 'preserve-old-certificate' } },
      dr: { done: history, served: history ? ['qian'] : [] }, dsa: { done: history }, ldct: { done: true, marker: 'do-not-clear' } } }
}

function selectChoice(step, s, route) {
  const choices = step.choices.filter(c => !c.next.startsWith('@') && condOk(s, c.cond))
  assert(choices.length, 'At least one real route must remain available')
  if (/hub$/.test(trilogyProgress(s, route.chapter.id).stepId)) {
    return route.all ? choices.find(c => c.cond?.ap || c.cond?.notFlag || c.cond?.notFlag2) ?? choices.at(-1) : choices.at(-1)
  }
  return route.all ? choices.find(c => c.tag === 'good') ?? choices[0] : choices.at(-1)
}

function walk(chapter, all) {
  let s = base(all)
  const other = Object.values(TRILOGY).find(c => c.id !== chapter.id)
  s = initializeTrilogy(s, other, `preserved-${other.id}`)
  const untouchedDlc = clone(s.dlc), route = { chapter, all }
  s = initializeTrilogy(s, chapter, `${chapter.id}-${all ? 'explore-history' : 'direct-neutral'}`)
  assert.deepEqual(trilogyProgress(s, chapter.id).snapshots['0'], stats(s))
  const visited = [], settlements = [], gifts = [], tools = [], scans = [], choices = [], checkins = new Set()
  let iterations = 0, quizBefore, expectedScore = 0
  while (iterations++ < 1000) {
    const p = trilogyProgress(s, chapter.id)
    assert(p)
    if (p.done) break
    if (p.phase === 'story' && !checkins.has(p.shift)) {
      const before = s
      s = trilogyCheckin(s, chapter)
      assert.equal(s.gold, before.gold + 50, 'Check-in stipend exactly once')
      assert.equal(s.ap, before.ap)
      equalState(trilogyCheckin(clone(s), chapter), s, 'Refreshing/repeating check-in does not pay again')
      checkins.add(p.shift)
    }
    if (p.phase === 'settle') {
      settlements.push(p.shift)
      const before = s
      equalState(enterTrilogyNode(clone(s), chapter, p.stepId), s, 'Settlement entry cannot repay salary')
      s = trilogyReadBook(s, chapter)
      assert.equal(s.skill, before.skill + 1)
      equalState(trilogyReadBook(clone(s), chapter), s, 'Book reward once per shift')
      if (p.shift === 0 && all) {
        const beforeCoffee = s
        s = trilogyBuy(s, chapter, 'coffee')
        assert.equal(s.ap, beforeCoffee.ap, 'Settlement coffee waits for the next exploration')
        assert.equal(trilogyProgress(s, chapter.id).pendingCoffee, true)
        equalState(trilogyBuy(clone(s), chapter, 'coffee'), s, 'Cannot stack another pending coffee')
      }
      const beforeNext = s
      s = nextTrilogyShift(s, chapter)
      if (p.shift < 4) {
        assert.equal(trilogyProgress(s, chapter.id).shift, p.shift + 1)
        assert.equal(s.ap, 3)
        assert.deepEqual(trilogyProgress(s, chapter.id).snapshots[String(p.shift + 1)], stats(beforeNext))
      } else assert.equal(trilogyProgress(s, chapter.id).phase, 'quiz')
      continue
    }
    if (p.phase === 'quiz') {
      const q = p.quiz
      assert.equal(q.questions.length, 5)
      assert.equal(new Set(q.questions.map(row => row.question)).size, 5)
      for (const row of q.questions) assert.deepEqual([...row.order].sort(), chapter.quiz[row.question].options.map((_, i) => i))
      equalState(startTrilogyQuiz(clone(s), chapter), s, 'Refresh does not resample quiz or option order')
      if (q.completed) {
        assert.equal(s.gold, quizBefore.gold + expectedScore * 20)
        assert.equal(s.skill, quizBefore.skill + 1)
        equalState(nextTrilogyQuiz(clone(s), chapter), s, 'Repeated final submit cannot repay quiz')
        s = finishTrilogyQuiz(s, chapter)
        assert.equal(trilogyProgress(s, chapter.id).phase, 'epilogue')
        assert.equal(trilogyProgress(s, chapter.id).stepId, chapter.afterQuiz)
        continue
      }
      quizBefore ??= stats(s)
      const row = q.questions[q.index], question = chapter.quiz[row.question]
      const answer = all || q.index % 2 ? question.answer : (question.answer + 1) % question.options.length
      if (answer === question.answer) expectedScore++
      s = answerTrilogyQuiz(s, chapter, answer)
      equalState(answerTrilogyQuiz(clone(s), chapter, (answer + 1) % question.options.length), s, 'Selected answer cannot be rewritten')
      s = nextTrilogyQuiz(s, chapter)
      continue
    }
    const step = trilogyStep(s, chapter), id = p.stepId
    assert(step, id)
    visited.push(id)
    if (p.giftReply) {
      const before = s
      s = trilogyAdvance(s, chapter, id)
      assert.equal(trilogyProgress(s, chapter.id).stepId, id, 'Gift reply returns to its exact conversation')
      assert.deepEqual(stats(s), stats(before))
      continue
    }
    equalState(enterTrilogyNode(clone(s), chapter, id), s, `${id}: saved entry rewards do not repeat`)
    equalState(issueTrilogyCertificate(s, chapter, '过早', 'NO'), s, 'No certificate before actual ending')
    if (all && step.giftTo && !p.gifts.includes(`${p.shift}:${step.giftTo}`)) {
      if (!s.items.includes('snack')) s = trilogyBuy(s, chapter, 'snack')
      assert(s.items.includes('snack'), `${id}: available snack can be acquired`)
      const before = s
      s = trilogyGive(s, chapter, id, 'snack')
      assert.equal(s.items.includes('snack'), false)
      assert.equal(s.heart, before.heart + 1)
      assert.equal(trilogyProgress(s, chapter.id).stepId, id)
      assert.equal(trilogyProgress(s, chapter.id).giftReply.person, step.giftTo)
      equalState(trilogyGive(clone(s), chapter, id, 'milktea'), s, 'One person cannot receive two gifts in one shift')
      gifts.push(`${p.shift}:${step.giftTo}`)
      continue
    }
    if (step.scan) {
      // Pure persisted-clock simulation, not a browser/real-time acquisition.
      equalState(trilogyAdvance(clone(s), chapter, id), s, 'Ordinary advance cannot bypass an unfinished scan')
      const at = p.scans?.[id]?.startedAt ?? 1000000 + iterations * 4000
      s = beginTrilogyScan(s, chapter, id, at)
      const duration = step.scan.durationMs ?? 3000
      equalState(completeTrilogyScan(clone(s), chapter, id, at + duration - 1), s, 'Scan cannot finish before its duration')
      s = completeTrilogyScan(clone(s), chapter, id, at + duration)
      assert.equal(trilogyProgress(s, chapter.id).stepId, step.next)
      assert.equal(trilogyProgress(s, chapter.id).scans[id].completed, true)
      equalState(completeTrilogyScan(clone(s), chapter, id, at + duration + 1), s, 'Stale scan callback cannot reward twice')
      scans.push(id)
    } else if (step.tool) {
      equalState(trilogyAdvance(clone(s), chapter, id), s, 'Ordinary advance cannot bypass the tool')
      const untouched = completeTrilogyTool(clone(s), chapter, id)
      assert.equal(trilogyProgress(untouched, chapter.id).tools[id].value, 25, 'Untouched completion stores displayed default, not invented 50')
      assert.equal(trilogyProgress(untouched, chapter.id).tools[id].choice, step.tool.kind === 'mri' ? 'T1' : '凸阵')
      const values = { value: step.tool.task === 'decay' ? 110 : all ? 55 : 75, secondary: 50,
        choice: step.tool.kind === 'mri' ? Object.keys(step.tool.images ?? { T1: 0, T2: 0, FLAIR: 0 }).at(-1) : '线阵' }
      s = updateTrilogyTool(s, chapter.id, id, values)
      assert.deepEqual(trilogyProgress(clone(s), chapter.id).tools[id], values)
      s = completeTrilogyTool(s, chapter, id, !all)
      assert.equal(trilogyProgress(s, chapter.id).stepId, step.tool.next)
      assert.deepEqual(trilogyProgress(s, chapter.id).tools[id], { ...values, choice: `${all ? '' : 'assisted:'}${values.choice}`, completed: true })
      equalState(completeTrilogyTool(clone(s), chapter, id), s, 'Stale tool submit does not repeat rewards')
      tools.push(id)
    } else if (step.choices?.length) {
      const choice = selectChoice(step, s, route), before = s
      s = trilogyChoose(s, chapter, id, choice)
      assert.notEqual(trilogyProgress(s, chapter.id).stepId, id, `${id}: selected enabled route is actionable: ${choice.text}`)
      const target = trilogyProgress(s, chapter.id).stepId
      assert.equal(target, choice.next, 'Choice effect and target are one saved result')
      const entry = p.applied.includes(target) ? {} : trilogyStep(s, chapter).effect ?? {}
      assert.equal(s.gold, Math.max(0, Math.max(0, before.gold + (choice.effect?.gold ?? 0)) + (entry.gold ?? 0)))
      assert.equal(s.ap, Math.max(0, Math.max(0, before.ap + (choice.effect?.ap ?? 0)) + (entry.ap ?? 0)))
      if (choice.effect?.flag) assert.equal(s.flags[choice.effect.flag], true)
      equalState(trilogyChoose(clone(s), chapter, id, choice), s, 'Stale double click cannot reapply choice')
      if (/hub$/.test(id)) {
        for (const c of step.choices) if (c.cond?.notFlag && before.flags[c.cond.notFlag]) assert.equal(condOk(before, c.cond), false, 'Completed exploration hides')
        const noAp = { ...before, ap: 0 }
        assert(step.choices.some(c => !c.next.startsWith('@') && !c.cond?.ap && !c.cond?.notFlag && condOk(noAp, c.cond)), 'Clinical route remains available at zero AP')
      }
      choices.push({ from: id, to: target, text: choice.text })
    } else {
      const before = s
      s = trilogyAdvance(s, chapter, id)
      assert.notDeepEqual(clone(s), clone(before), `${id}: story must have a continuation or settlement`)
      if (step.end) assert(['settle', 'done'].includes(trilogyProgress(s, chapter.id).phase))
    }
    s = clone(s) // Every transition survives the exact persisted JSON representation.
  }
  assert(iterations < 1000, `${chapter.id}: finite story progression`)
  const p = trilogyProgress(s, chapter.id)
  assert.equal(p.done, true); assert.equal(p.phase, 'done'); assert.equal(p.quiz.completed, true)
  assert.deepEqual(settlements, [0, 1, 2, 3, 4]); assert.equal(checkins.size, 5)
  assert(p.visited.includes(chapter.afterQuiz), 'Actual after-quiz ending was played')
  equalState(issueTrilogyCertificate(s, chapter, ' ', 'ID'), s, 'Blank identity cannot issue certificate')
  s = issueTrilogyCertificate(s, chapter, ' 测试同学 ', ' TEST-20261010 ')
  const certificate = trilogyProgress(s, chapter.id).certificate
  assert.equal(certificate.name, '测试同学'); assert.equal(certificate.studentId, 'TEST-20261010')
  assert.equal(certificate.code, trilogyCredential(chapter.id, certificate))
  equalState(issueTrilogyCertificate(clone(s), chapter, '别的名字', 'OTHER'), s, 'Issued snapshot cannot be overwritten')
  const spent = trilogyBuy(s, chapter, 'lottery')
  assert.deepEqual(trilogyProgress(spent, chapter.id).certificate, certificate, 'Later spending preserves certificate')
  for (const [id, value] of Object.entries(untouchedDlc)) assert.deepEqual(s.dlc[id], value, `Other progress preserved: ${id}`)
  const reset = resetTrilogy(clone(s), chapter.id)
  assert.equal(reset.dlc[chapter.id], undefined, 'Hall reset must not initialize chapter progress')
  for (const key of Object.keys(s)) if (!['dlc', 'flags'].includes(key)) assert.deepEqual(reset[key], s[key], `Hall reset preserves ${key}, including AP`)
  for (const [id, value] of Object.entries(s.dlc)) if (id !== chapter.id) assert.deepEqual(reset.dlc[id], value)
  assert.deepEqual(reset.flags, Object.fromEntries(Object.entries(s.flags).filter(([key]) => !key.startsWith(chapter.id.replace('ch', 'c') + '_'))))
  equalState(resetTrilogy(clone(reset), chapter.id), reset, 'Repeat hall reset has no extra effects')
  const restarted = restartTrilogy(clone(s), chapter, `${chapter.id}-new-run`)
  for (const [id, value] of Object.entries(s.dlc)) if (id !== chapter.id) assert.deepEqual(restarted.dlc[id], value)
  assert.deepEqual(stats(restarted), stats(s)); assert.deepEqual(restarted.badges, s.badges); assert.deepEqual(restarted.stamps, s.stamps)
  assert.equal(trilogyProgress(restarted, chapter.id).quiz, undefined)
  assert.equal(trilogyProgress(restarted, chapter.id).certificate, undefined)
  assert.equal(trilogyProgress(restarted, chapter.id).shift, 0)
  const prefix = chapter.id.replace('ch', 'c') + '_'
  for (const [key, value] of Object.entries(s.flags)) if (!key.startsWith(prefix)) assert.equal(restarted.flags[key], value)
  report.routes.push({ chapter: chapter.id, route: all ? 'all-exploration/history/first' : 'direct/no-history/alternate',
    iterations, nodes: [...new Set(visited)].length, settlements, tools, scans, gifts, choices, grade: p.quiz.grade, certificate })
  console.log(`PASS pure state ${chapter.id}: ${all ? 'full-history' : 'direct-neutral'}, ${visited.length} story visits, 5 settlements, full quiz/ending/certificate`)
}

function archiveReturn(order) {
  const chapter = TRILOGY.ch5
  let s = initializeTrilogy(base(), chapter, `archive-${order.join('-')}`)
  s = enterTrilogyNode(s, chapter, 'c5_s1_hub')
  const hub = trilogyStep(s, chapter)
  const enter = hub.choices.find(c => c.next === 'c5_s1_archive' && c.cond?.ap)
  assert(enter)
  s = trilogyChoose(s, chapter, 'c5_s1_hub', enter)
  assert.equal(trilogyProgress(s, chapter.id).stepId, 'c5_s1_archive')
  assert.equal(s.ap, 2)
  for (let index = 0; index < order.length; index++) {
    const choice = trilogyStep(s, chapter).choices.find(c => c.next === order[index])
    assert(choice && condOk(s, choice.cond))
    s = trilogyChoose(s, chapter, 'c5_s1_archive', choice)
    s = trilogyAdvance(s, chapter, order[index])
    assert.equal(s.ap, 2, 'Independent document reads do not charge entry again')
    assert.equal(trilogyStep(s, chapter).choices.filter(c => condOk(s, c.cond)).some(c => c.next === order[index]), false)
    if (index === 0) {
      const leave = trilogyStep(s, chapter).choices.find(c => c.next === 'c5_s1_hub')
      s = trilogyChoose(s, chapter, 'c5_s1_archive', leave)
      const back = trilogyStep(s, chapter).choices.find(c => c.next === 'c5_s1_archive' && condOk(s, c.cond))
      assert(back, 'Unfinished second document keeps a return entry')
      s = trilogyChoose(s, chapter, 'c5_s1_hub', back)
      assert.equal(s.ap, 2, 'Returning after one document is free')
    }
  }
  s = trilogyChoose(s, chapter, 'c5_s1_archive', trilogyStep(s, chapter).choices.find(c => c.next === 'c5_s1_hub'))
  assert.equal(trilogyStep(s, chapter).choices.filter(c => condOk(s, c.cond)).some(c => c.next === 'c5_s1_archive'), false)
  console.log(`PASS CH5 independent archive order ${order.join(' -> ')} and free return`)
}

try {
  for (const chapter of Object.values(TRILOGY)) for (const all of [true, false]) walk(chapter, all)
  archiveReturn(['c5_s1_schedule', 'c5_s1_safety'])
  archiveReturn(['c5_s1_safety', 'c5_s1_schedule'])
  report.status = 'passed'
} catch (error) {
  report.status = 'failed'; report.error = error.stack ?? String(error)
  throw error
} finally {
  report.finished = new Date().toISOString()
  mkdirSync(output, { recursive: true })
  writeFileSync(resolve(output, 'trilogy-state.json'), JSON.stringify(report, null, 2))
}
