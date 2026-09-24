// Two real, isolated Edge playthroughs; never access the player's profile.
// Kept separate from historical tests so their assertions are not relaxed.
import assert from 'node:assert/strict'
import { swipeCh2Checkin } from './ch2-checkin-driver.mjs'
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { CH2_META, CH2_SHIFTS, ch2StepForState, QUIZ2 } from '../src/game/ch2.ts'
import { CH2_SCANS } from '../src/game/ch2-scans.ts'
import { getCh2Observation } from '../src/game/ch2-observations.ts'
import { ch2GiftChoices } from '../src/game/ch2-gifts.ts'
import { freshState, condOk } from '../src/game/store.ts'

const require = createRequire(import.meta.url)
const read = page => page.evaluate(() => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')))
const clean = text => (text ?? '').replaceAll('**', '')
const protectedState = s => ({
  night: s.night, buyCount: s.buyCount, lotteryNight: s.lotteryNight, lotteryCount: s.lotteryCount,
  screenHint: s.screenHint, stepId: s.stepId, resumeKey: s.resumeKey, finished: s.finished,
  durability: s.durability, quizGrade: s.flags.quiz_grade, apple: s.flags.n5_qian,
  originalChoice: s.flags.bai_tube, dr: s.dlc?.dr, dsa: s.dlc?.dsa,
})
const outputRoot = process.env.REPEAT_OUTPUT || '../../ch2-sunrise-qa/repeat'
const gameURL = process.env.GAME_URL || 'http://127.0.0.1:8798/'

async function reveal(page, text) {
  const p = page.locator('.dialog-box > p')
  if (await p.textContent() !== text) await p.click()
  await page.waitForFunction(value => document.querySelector('.dialog-box > p')?.textContent === value, text, { timeout: 10000 })
}
async function changed(page, p) {
  await page.waitForFunction(before => {
    const now = JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2
    return now.stepId !== before.stepId || now.shift !== before.shift || now.phase !== before.phase || now.done
  }, p, { timeout: 10000 })
}
async function refreshExactly(page, reason) {
  const before = await read(page)
  await page.reload()
  await page.locator('[data-ch2-step]').waitFor()
  const after = await read(page)
  for (const key of ['gold', 'skill', 'heart', 'wealth', 'ap']) assert.equal(after[key], before[key], `${reason}: ${key} unchanged on reload`)
  for (const key of ['loop', 'quiz', 'observations', 'giftReply']) assert.deepEqual(after.dlc.ch2[key], before.dlc.ch2[key], `${reason}: ${key} restored`)
  assert.deepEqual(after.flags, before.flags, `${reason}: flags restored`)
  return after
}
function selectChoice(id, choices, strategy, selections) {
  const wanted = {
    c2n1_b4: ['c2n1_terminal_look'],
    c2n3_terminal_0: ['c2n3_terminal_unplug'],
    c2n3_terminal_call: [strategy === 'offline' ? 'c2n3_terminal_ask' : 'c2n3_terminal_quiet'],
    c2n3_terminal_connection_q: [strategy === 'offline' ? 'c2n3_terminal_keep_offline' : 'c2n3_terminal_reconnect'],
    c2n3_terminal_note_q: ['c2n3_terminal_note'],
    c2n3_dawn_study_q: [strategy === 'offline' ? 'c2n3_dawn_retry' : 'c2n3_dawn_both'],
    c2n3_dawn_life_q: [strategy === 'offline' ? 'c2n3_dawn_debt' : 'c2n3_dawn_breakfast'],
    c2d4_e6: [strategy === 'offline' ? 'c2d4_e7c' : 'c2d4_e7a'],
    c2d4_needle_q: [strategy === 'offline' ? 'c2d4_needle_verify' : 'c2d4_needle_history'],
    c2n5_e1: [strategy === 'offline' ? 'c2n5_terminal_key' : 'c2n5_terminal_pass_alarm'],
    c2n5_terminal_turn_q: ['c2n5_terminal_screen'],
    c2n5_terminal_screen_q: ['c2n5_terminal_save'],
  }[id] ?? []
  if (/_hub$/.test(id)) {
    const priorities = id === 'c2n1_hub'
      ? ['c2n1_b1', 'c2n1_c1', 'c2n1_ab1', 'c2n1_an1']
      : id === 'c2n3_hub' ? ['c2n3_terminal_0', 'c2n3_a1', strategy === 'offline' ? 'c2n3_k1' : 'c2n3_chat0']
        : ['c2n5_a1', 'c2n5_e1', 'c2n5_chat0', 'c2n5_b1']
    const side = priorities.map(next => choices.find(c => c.next === next)).find(Boolean)
    if (side) return side
    return choices.find(c => c.text.includes('【开诊】')) ?? choices.find(c => c.tag === 'good')
  }
  for (const next of wanted) {
    const candidate = choices.find(c => c.next === next && !selections.has(`${id}:${next}`))
    if (candidate) return candidate
  }
  // Clinical plans stay on the original good paths; optional conversation
  // branches are explored once each, including genuine choices in new scenes.
  const eligible = choices.filter(c => !c.next.startsWith('@'))
  return eligible.find(c => c.tag === 'good') ?? eligible.find(c => !selections.has(`${id}:${c.next}`)) ?? eligible.at(-1)
}

/** Can also run on a genuine chapter-one completion save supplied by a caller. */
export async function walkChapterTwo(page, {
  strategy = 'offline', output = outputRoot, expectSunrise = false, expectFreeze = true,
  wrongQuizAnswer = false, shop = true,
} = {}) {
  mkdirSync(output, { recursive: true })
  const start = await read(page), log = [], visits = new Map(), selections = new Set()
  const scans = new Set(), observations = new Set(), settlements = new Set(), reloaded = new Set()
  let loops = 0, questions = 0, quizGold, quizGrade, gifts = 0
  try {
    while (++loops < 900) {
      const s = await read(page), p = s.dlc.ch2, id = p.stepId
      if (p.done) break
      if (await swipeCh2Checkin(page, s)) { log.push({ kind: 'checkin', id }); continue }
      if (p.phase === 'settle') {
        await page.locator('[data-ch2-settlement]').waitFor()
        settlements.add(p.shift)
        assert.equal(await page.locator('[data-ch2-settlement] summary').count(), 0)
        await page.locator('[data-ch2-equipment-overview]').waitFor()
        await refreshExactly(page, `settlement ${p.shift}`)
        if (shop && p.shift !== 'c2n5') {
          await page.getByRole('button', { name: '🛒 小卖部', exact: true }).click()
          const store = page.getByRole('dialog', { name: '第二章小卖部' })
          for (const name of ['购买全科室奶茶', '购买零食礼包']) {
            const button = store.getByRole('button', { name, exact: true })
            if (await button.count() && await button.isEnabled()) await button.click()
          }
          await store.getByRole('button', { name: '离开小卖部', exact: true }).click()
        }
        log.push({ kind: 'settlement', shift: p.shift, gold: (await read(page)).gold })
        await page.getByRole('button', { name: /进入下一班|前往晨会/ }).click()
        await changed(page, p)
        continue
      }
      if (p.phase === 'quiz') {
        await page.locator('[data-ch2-quiz]').waitFor()
        quizGold ??= s.gold
        const q = p.quiz
        if (q.completed) {
          quizGrade = wrongQuizAnswer ? 'A' : 'S'
          assert.equal(q.grade, quizGrade)
          assert.equal(s.gold, quizGold + (wrongQuizAnswer ? 200 : 250))
          await refreshExactly(page, 'quiz grade')
          await page.getByRole('button', { name: '回到晨会 →', exact: true }).click()
          await page.locator('[data-ch2-step="c2am_3"]').waitFor()
        } else {
          const row = q.questions[q.index], question = QUIZ2[row.question]
          const answer = wrongQuizAnswer && q.index === 1 ? (question.answer + 1) % question.options.length : question.answer
          await page.locator('[data-ch2-quiz]').getByRole('button', { name: question.options[answer], exact: true }).click()
          questions++
          if (q.index === 1) await refreshExactly(page, 'answered quiz')
          await page.getByRole('button', { name: q.index === 4 ? '查看成绩 →' : '下一题 →', exact: true }).click()
          await page.waitForFunction(i => { const q = JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.quiz; return q.completed || q.index !== i }, q.index)
        }
        continue
      }
      // Dawn is a moving background, not a modal or a click lock. The existing
      // dialogue continues while the camera changes, and each shot holds across lines.
      if (id.startsWith('c2n3_dawn')) {
        await page.locator('[data-ch2-sunrise-cinematic][data-ready="true"]').waitFor()
        assert.equal(await page.getByRole('button', { name: /跳过|显示全文|继续 →/ }).count(), 0)
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Dawn remains in viewport')
        if (['c2n3_dawn_light', 'c2n3_dawn_thought', 'c2n3_dawn_sun'].includes(id)) {
          await page.screenshot({ path: `${output}/${id}.png` })
          log.push({ kind: 'cinematic', id, shot: await page.locator('[data-ch2-sunrise-cinematic]').getAttribute('data-ch2-sunrise-cinematic') })
        }
      }
      const shift = CH2_SHIFTS.find(x => x.id === p.shift)
      const step = ch2StepForState(id, shift.steps[id], s)
      assert(step, `Valid node ${id}`)
      if (p.giftReply) {
        await reveal(page, clean(p.giftReply.text))
        await page.locator('.dialog-box > span.animate-bounce').waitFor()
        await page.locator('.dialog-box > p').click()
        await page.waitForFunction(() => !JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.giftReply)
        continue
      }
      const scan = CH2_SCANS[id]
      if (scan && !p.scanSessions?.[id]?.completed) {
        if (!p.scanSessions?.[id]) await page.locator('.dialog-box > p').click()
        await page.locator(`.ch2-scan-overlay[data-scan-id="${id}"]`).waitFor({ timeout: 12000 })
        assert.equal(await page.getByRole('button', { name: /跳过/ }).count(), 0, 'Acquisition is never skippable')
        if (!reloaded.has('scan')) {
          const before = await read(page)
          await page.reload()
          await page.locator('[data-ch2-step]').waitFor()
          const after = await read(page)
          assert.equal(after.dlc.ch2.scanSessions[id].startedAt, before.dlc.ch2.scanSessions[id].startedAt)
          assert.equal(after.gold, before.gold)
          reloaded.add('scan')
        }
        await page.locator('.ch2-scan-overlay').waitFor({ state: 'detached', timeout: 8000 })
        await page.waitForFunction(id => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.scanSessions[id].completed, id)
        if (scan.mode === 'acquire') await changed(page, p)
        scans.add(id); log.push({ kind: 'scan', id })
        continue
      }
      const observation = getCh2Observation(id, s), answer = observation && p.observations?.[observation.id]
      if (observation && !answer?.acknowledged) {
        observations.add(observation.id)
        if (!answer) {
          await reveal(page, clean(observation.prompt))
          const chosen = strategy === 'offline'
            ? observation.choices.find(x => x.correct) ?? observation.choices.find(x => x.hint)
            : observation.choices.find(x => x.hint) ?? observation.choices.find(x => !x.correct) ?? observation.choices[0]
          assert(chosen)
          await page.locator('.choice-in').getByRole('button', { name: clean(chosen.text), exact: true }).click()
          await page.waitForFunction(key => !!JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.observations[key], observation.id)
          if (!reloaded.has('observation')) {
            await refreshExactly(page, 'observation response'); reloaded.add('observation')
          }
        } else {
          await reveal(page, clean(observation.choices.find(x => x.id === answer.choiceId).feedback))
          await page.locator('.dialog-box > span.animate-bounce').waitFor()
          await page.locator('.dialog-box > p').click()
          await page.waitForFunction(key => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.observations[key].acknowledged, observation.id)
        }
        continue
      }
      const text = clean(step.text).replaceAll('行动力⚡×3', `行动力⚡×${s.ap}`)
      await reveal(page, text)
      visits.set(id, (visits.get(id) ?? 0) + 1)
      assert(visits.get(id) < 25, `No trapped loop at ${id}`)
      log.push({ kind: 'story', id, text })
      if (['c2n3_terminal_call', 'c2n5_terminal_receipt', 'c2n5_terminal_screen_q'].includes(id) && !reloaded.has(id)) {
        // Let the intentionally asynchronous once-only cue bookkeeping settle.
        await page.waitForTimeout(80)
        await refreshExactly(page, id); reloaded.add(id)
        continue
      }
      const gift = ch2GiftChoices(s, id)[0]
      if (gift) {
        const old = await read(page)
        await page.locator('.choice-in').getByRole('button', { name: gift.text, exact: true }).click()
        await page.waitForFunction(() => !!JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.giftReply)
        const after = await read(page)
        assert.equal(after.ap, old.ap)
        assert.equal(after.items.length, old.items.length - 1)
        gifts++
        if (!reloaded.has('gift')) { await refreshExactly(page, 'gift consumed'); reloaded.add('gift') }
        continue
      }
      if (step.windowTask) {
        await page.getByRole('button', { name: new RegExp(` ${step.windowTask.targetW}/${step.windowTask.targetL}$`) }).click()
        await page.getByRole('button', { name: /^就这个窗口 · 确认/ }).click()
      } else if (step.choices) {
        const eligible = step.choices.filter(c => condOk(s, c.cond))
        const chosen = selectChoice(id, eligible, strategy, selections)
        assert(chosen, `Progress option at ${id}`)
        if (/_hub$/.test(id)) {
          assert(!eligible.some(c => selections.has(`${id}:${c.next}`) && c.next !== '@book2' && c.next !== '@shop'), `Completed exploration must disappear: ${id}`)
        }
        selections.add(`${id}:${chosen.next}`)
        log.push({ kind: 'choice', id, next: chosen.next, text: chosen.text })
        await page.locator('.choice-in').getByRole('button', { name: clean(chosen.text), exact: true }).click()
      } else if (step.end) {
        await page.getByRole('button', { name: /本班结束 · 结算|第二章 · 完 —— 结算/ }).click()
      } else {
        await page.locator('.dialog-box > span.animate-bounce').waitFor()
        await page.locator('.dialog-box > p').click()
      }
      await changed(page, p)
      if (loops % 35 === 0) console.log(`Repeat ${strategy}: ${loops} iterations, ${id}`)
    }
    assert(loops < 900, 'Complete chapter, not a bounded partial run')
    const final = await read(page)
    assert.equal(final.dlc.ch2.done, true)
    assert.equal(final.dlc.ch2.phase, 'done')
    assert.equal(settlements.size, 5)
    assert.equal(questions, 5)
    assert.deepEqual([...scans].sort(), Object.keys(CH2_SCANS).sort(), 'All 17 presentations exercised')
    assert.equal(observations.size, 12)
    assert.equal(final.flags.c2_needle_resolved, true)
    assert.equal(final.flags.c2_terminal_stopped, true)
    assert.equal(final.flags.c2_terminal_call_received, true)
    assert.equal(final.flags.c2_terminal_receipt_saved, true)
    assert.equal(Boolean(final.flags.c2_terminal_n3_reconnected), strategy === 'reconnected')
    assert.equal(final.flags.c2_terminal_end_sms_received, true)
    if (expectFreeze) assert.deepEqual(protectedState(final), protectedState(start), 'Other chapter progress remains unchanged')
    if (expectSunrise) {
      assert([...visits.keys()].some(id => /sunrise|sunset|dawn/.test(id)), 'Full walk must include new scene')
      assert.equal(final.flags.c2_dawn_done, true)
      assert(visits.has(strategy === 'offline' ? 'c2n3_dawn_retry' : 'c2n3_dawn_both'))
      assert(visits.has(strategy === 'offline' ? 'c2n3_dawn_debt' : 'c2n3_dawn_breakfast'))
    }
    assert(gifts > 0, 'At least one real in-scene gift')
    assert.equal(new Set(final.dlc.ch2.loop.entries.map(x => x.id)).size, final.dlc.ch2.loop.entries.length, 'Ledger event ids unique')
    for (const key of ['gold', 'skill', 'heart', 'wealth', 'ap']) assert.equal(final.dlc.ch2.loop.entries.reduce((sum, x) => sum + x.delta[key], 0), final[key] - start[key], `${key} reconciles`)
    await page.screenshot({ path: `${output}/complete.png` })
    writeFileSync(`${output}/final-state.json`, JSON.stringify(final, null, 2))
    const summary = { strategy, seed: start.seed, loops, nodes: visits.size, scans: scans.size, observations: observations.size, settlements: [...settlements], questions, quizGrade, gifts, reloaded: [...reloaded], done: true }
    log.push({ kind: 'summary', ...summary })
    console.log('PASS repeated complete Chapter 2:', JSON.stringify(summary))
    return { final, summary, log }
  } catch (error) {
    await page.screenshot({ path: `${output}/failure.png` }).catch(() => {})
    writeFileSync(`${output}/failure-state.json`, JSON.stringify(await read(page), null, 2))
    throw error
  } finally { writeFileSync(`${output}/transcript.json`, JSON.stringify(log, null, 2)) }
}

async function main() {
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
  const browser = await chromium.launch({ headless: true, channel: 'msedge' })
  const errors = [], results = []
  try {
    for (const [index, strategy] of ['offline', 'reconnected'].entries()) {
      const context = await browser.newContext({ viewport: index ? { width: 390, height: 844 } : { width: 1280, height: 900 } })
      const initial = { ...freshState(index ? 'f' : 'm'), night: 5, finished: true, gold: 1500, seed: 2026092401 + index,
        buyCount: 23, lotteryNight: 5, lotteryCount: 3, durability: 67,
        screenHint: 'chapterEnd', stepId: 'n5_end', resumeKey: '5-n5_end', items: ['milktea', 'snack', 'book'],
        flags: { quiz_grade: 'A', n5_qian: true, bai_tube: !!index },
        dlc: { dr: { done: true, served: ['ge'] }, dsa: { dose: 12 }, ch2: { shift: 'c2n1', stepId: 'c2n1_0', phase: 'story', appliedSteps: [] } } }
      await context.addInitScript(s => {
        localStorage.setItem('mr-ch2-unlock', '1')
        if (!localStorage.getItem('midnight-radiology-save-v1')) localStorage.setItem('midnight-radiology-save-v1', JSON.stringify(s))
        HTMLMediaElement.prototype.play = function () { return Promise.reject(new DOMException('QA intentional audio denial', 'NotAllowedError')) }
      }, initial)
      const page = await context.newPage()
      page.on('pageerror', error => errors.push(error.message))
      await page.goto(gameURL + '#/ch2')
      await page.locator('[data-ch2-step]').waitFor()
      const result = await walkChapterTwo(page, { strategy, output: `${outputRoot}/${strategy}`, wrongQuizAnswer: !!index, expectSunrise: process.env.EXPECT_SUNRISE === '1' })
      results.push(result.summary)
      await page.goto(gameURL + '#/dlc')
      const ch2Card = page.locator('div.border-2').filter({ has: page.getByText(CH2_META.title, { exact: true }) }).first()
      // The chapter card's replay action is an actual player action, not an injected save reset.
      const replay = await ch2Card.count() ? ch2Card.getByRole('button', { name: '再玩一遍', exact: true }) : page.getByRole('button', { name: '再玩一遍', exact: true }).first()
      await replay.click()
      await page.locator('[data-ch2-step="c2n1_0"]').waitFor()
      const reset = await read(page)
      assert.equal(reset.flags.quiz2_grade, undefined)
      assert(!Object.keys(reset.flags).some(key => /^c2_(terminal|needle|sunrise|dawn)_/.test(key)))
      assert.equal(reset.dlc.ch2.quiz, undefined)
      assert.equal(reset.dlc.ch2.done, undefined)
      assert.deepEqual(protectedState(reset), protectedState(result.final), 'Real replay preserves previous chapters')
      await context.close()
    }
    assert.deepEqual(errors, [])
    writeFileSync(`${outputRoot}/results.json`, JSON.stringify({ runs: results, pageErrors: errors, nativeAudio: false, playerProfileUsed: false }, null, 2))
  } finally { await browser.close() }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()
