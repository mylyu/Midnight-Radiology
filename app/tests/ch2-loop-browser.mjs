// Real, isolated Edge walk. No production profile, saves, old tests, or content mutations.
import assert from 'node:assert/strict'
import { swipeCh2Checkin } from './ch2-checkin-driver.mjs'
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { CH2_SHIFTS, ch2StepForState, QUIZ2 } from '../src/game/ch2.ts'
import { CH2_SCANS } from '../src/game/ch2-scans.ts'
import { CH2_OBSERVATIONS, CH2_OBSERVATION_WINDOW_CASES, getCh2Observation } from '../src/game/ch2-observations.ts'
import { CH2_CASE_COMPLETIONS } from '../src/game/ch2-ledger.ts'
import { ch2GiftChoices } from '../src/game/ch2-gifts.ts'
import { freshState, condOk } from '../src/game/store.ts'
import { logicalImageUrl } from './game-delivery-media.mjs'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const baseURL = process.env.GAME_URL || 'http://127.0.0.1:8798/'
const output = process.env.LOOP_OUTPUT || (process.env.LOOP_FIXTURES_ONLY === '1' ? '../../ch2-loop-browser-fixtures' : '../../ch2-loop-browser-review')
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const errors = [], log = []
let activePage
const read = page => page.evaluate(() => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')))
const cleanText = text => (text ?? '').replaceAll('**', '')
const frozen = s => ({ night: s.night, buyCount: s.buyCount, lotteryNight: s.lotteryNight, lotteryCount: s.lotteryCount,
  screenHint: s.screenHint, stepId: s.stepId, resumeKey: s.resumeKey, finished: s.finished, durability: s.durability,
  grade: s.flags.quiz_grade, ch1gift: s.flags.n5_qian, dr: s.dlc.dr, dsa: s.dlc.dsa })
const initial = () => ({ ...freshState('m'), night: 5, finished: true, gold: 900, skill: 3, heart: 3, wealth: 3,
  buyCount: 23, lotteryNight: 5, lotteryCount: 3, screenHint: 'chapterEnd', stepId: 'n5_end', resumeKey: '5-n5_end',
  flags: { quiz_grade: 'S', quiz2_grade: 'A', n5_qian: true },
  dlc: { dr: { done: true, served: ['ge'] }, dsa: { dose: 12, pedalTry: 2 }, ch2: { shift: 'c2n1', stepId: 'c2n1_0', phase: 'story', appliedSteps: [] } } })
async function open(state = initial(), mobile = false, failImage) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 } })
  await context.addInitScript(s => {
    localStorage.setItem('mr-ch2-unlock', '1')
    if (!localStorage.getItem('midnight-radiology-save-v1')) localStorage.setItem('midnight-radiology-save-v1', JSON.stringify(s))
    window.__loopAudio = []
    HTMLMediaElement.prototype.play = function () { window.__loopAudio.push(this.src); return Promise.reject(new DOMException('Deliberately denied', 'NotAllowedError')) }
  }, state)
  const page = await context.newPage()
  activePage = page
  let failedImageRequests = 0
  if (failImage) await page.route(logicalImageUrl(failImage, baseURL), route => {
    failedImageRequests++
    return route.abort()
  })
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(baseURL + '#/ch2')
  await page.locator('[data-ch2-step]').waitFor()
  return { page, context, failedImageRequests: () => failedImageRequests }
}
async function reveal(page, expected) {
  const p = page.locator('.dialog-box > p')
  if (await p.textContent() !== expected) await p.click()
  await page.waitForFunction(text => document.querySelector('.dialog-box > p')?.textContent === text, expected, { timeout: 8000 })
}
async function waitStepChange(page, id) {
  await page.waitForFunction(id => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.stepId !== id, id, { timeout: 6000 })
}
async function forwardText(page, expected) {
  await reveal(page, expected)
  await page.locator('.dialog-box > span.animate-bounce').waitFor()
  await page.locator('.dialog-box > p').click()
}
function fixture(id, patch = {}) {
  const state = initial(), shift = CH2_SHIFTS.find(row => row.steps[id])
  return { ...state, ...patch, dlc: { ...state.dlc, ch2: { shift: shift.id, stepId: id, phase: 'story', appliedSteps: [], viewBg: shift.kind === 'day' ? 'bg_ctcontrol_day' : 'bg_ctcontrol' } } }
}
async function safeChoice(page, label) {
  const button = page.locator('.choice-in').getByRole('button', { name: cleanText(label), exact: true })
  await button.waitFor()
  await button.click()
}
async function layout(page) {
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal page overflow')
  const dialog = await page.locator('.dialog-box').boundingBox()
  if (dialog) assert(dialog.y >= -1 && dialog.y + dialog.height <= page.viewportSize().height + 1, `Dialog stays on-screen: ${JSON.stringify(dialog)}`)
}
try {
  if (process.env.LOOP_FIXTURES_ONLY !== '1') {
    const start = initial(), { context, page } = await open(start)
    const scans = new Set(), observations = new Set(), settlements = new Set()
    let questionsAnswered = 0, iterations = 0, reloadedScan = false, reloadedObservation = false, quizBeforeGold
    while (++iterations < 700) {
      const state = await read(page), p = state.dlc.ch2, id = p.stepId
      if (p.done) break
      if (await swipeCh2Checkin(page, state)) { log.push({ kind: 'checkin', id }); continue }
      if (p.phase === 'settle') {
        await page.locator('[data-ch2-settlement]').waitFor()
        settlements.add(p.shift)
        log.push({ kind: 'settle', shift: p.shift, gold: state.gold, entries: p.loop.entries.length })
        assert.equal(await page.locator('[data-ch2-stat]').count(), 4)
        assert(p.loop.shifts[p.shift].settled)
        assert.equal(await page.locator('[data-ch2-settlement] summary').count(), 0, 'settlement shows chapter/equipment overview, not a detailed ledger')
        await page.locator('[data-ch2-equipment-overview]').waitFor()
        await page.screenshot({ path: `${output}/${p.shift}-settlement-desktop.png` })
        await page.reload(); await page.locator('[data-ch2-settlement]').waitFor()
        const restored = await read(page)
        assert.equal(restored.gold, state.gold)
        assert.deepEqual(restored.dlc.ch2.loop.entries, p.loop.entries)
        assert.equal(restored.dlc.ch2.shift, p.shift)
        await page.getByRole('button', { name: /进入下一班|前往晨会/ }).click()
        await page.waitForFunction(old => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.shift !== old, p.shift)
        continue
      }
      if (p.phase === 'quiz') {
        await page.locator('[data-ch2-quiz]').waitFor()
        const quiz = p.quiz
        if (quizBeforeGold === undefined) quizBeforeGold = state.gold
        if (quiz.completed) {
          assert.equal(quiz.grade, 'S')
          assert.equal(state.gold, quizBeforeGold + 250)
          await page.reload(); await page.locator('[data-ch2-quiz]').waitFor()
          assert.equal((await read(page)).gold, state.gold)
          await page.getByRole('button', { name: '回到晨会 →', exact: true }).click()
          await page.locator('[data-ch2-step="c2am_3"]').waitFor()
        } else {
          const row = quiz.questions[quiz.index], question = QUIZ2[row.question]
          await page.locator('[data-ch2-quiz]').getByRole('button', { name: question.options[question.answer], exact: true }).click()
          questionsAnswered++
          if (quiz.index === 2) {
            const answered = await read(page)
            await page.reload(); await page.locator('[data-ch2-quiz]').waitFor()
            assert.deepEqual((await read(page)).dlc.ch2.quiz, answered.dlc.ch2.quiz)
          }
          await page.getByRole('button', { name: quiz.index === 4 ? '查看成绩 →' : '下一题 →', exact: true }).click()
          await page.waitForFunction(index => { const q = JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.quiz; return q.completed || q.index !== index }, quiz.index)
        }
        continue
      }
      const shift = CH2_SHIFTS.find(row => row.id === p.shift), step = ch2StepForState(id, shift.steps[id], state)
      assert(step, id)
      if (CH2_SCANS[id] && !p.scanSessions?.[id]?.completed) {
        scans.add(id)
        // The story text may preserve case context; the overlay appears once its text has finished.
        if (!p.scanSessions?.[id]) await page.locator('.dialog-box > p').click()
        await page.locator(`.ch2-scan-overlay[data-scan-id="${id}"]`).waitFor({ timeout: 12000 })
        assert.equal(await page.locator('img[alt="影像或证物"]').count(), 0, 'Image must not precede scanning')
        if (!reloadedScan) {
          const running = await read(page)
          await page.reload()
          await page.locator('.ch2-scan-overlay').waitFor()
          assert.equal((await read(page)).dlc.ch2.scanSessions[id].startedAt, running.dlc.ch2.scanSessions[id].startedAt)
          assert.equal((await read(page)).gold, running.gold)
          reloadedScan = true
        }
        assert.equal(await page.getByRole('button', { name: /跳过/ }).count(), 0, 'Every scan/reconstruction must play to completion')
        await page.locator('.ch2-scan-overlay').waitFor({ state: 'detached', timeout: 5000 })
        await page.waitForFunction(id => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.scanSessions[id].completed, id)
        if (CH2_SCANS[id].mode === 'acquire') await waitStepChange(page, id)
        log.push({ kind: 'scan', id })
        continue
      }
      const observation = getCh2Observation(id, state), answer = observation && p.observations?.[observation.id]
      if (observation && !answer?.acknowledged) {
        observations.add(observation.id)
        if (!answer) {
          await reveal(page, cleanText(observation.prompt))
          const choice = observation.choices.find(row => row.correct) ?? observation.choices.find(row => row.hint)
          assert.equal(await page.locator('[aria-label="' + (observation.regions?.[0]?.label ?? 'not-present') + '"]').count(), 0, 'No observation answer ring before choice')
          await safeChoice(page, choice.text)
          await page.waitForFunction(key => !!JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.observations[key], observation.id)
          if (!reloadedObservation) {
            const answered = await read(page)
            await page.reload(); await page.locator('[data-ch2-observation]').waitFor()
            assert.equal((await read(page)).skill, answered.skill)
            assert.deepEqual((await read(page)).dlc.ch2.observations, answered.dlc.ch2.observations)
            reloadedObservation = true
          }
        } else {
          const choice = observation.choices.find(row => row.id === answer.choiceId)
          await forwardText(page, cleanText(choice.feedback))
          await page.waitForFunction(key => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.observations[key].acknowledged, observation.id)
          log.push({ kind: 'observe', id: observation.id, choice: answer.choiceId })
        }
        continue
      }
      const expected = cleanText(step.text).replaceAll('行动力⚡×3', `行动力⚡×${state.ap}`)
      await reveal(page, expected)
      log.push({ kind: 'story', id })
      if (step.windowTask) {
        await page.getByRole('button', { name: new RegExp(` ${step.windowTask.targetW}/${step.windowTask.targetL}$`) }).click()
        await page.getByRole('button', { name: /^就这个窗口 · 确认/ }).click()
        await waitStepChange(page, id)
      } else if (step.choices) {
        const choices = step.choices.filter(row => condOk(state, row.cond))
        let selected = choices.find(row => row.text.includes('封条柜 · 和老周一起开锁'))
        selected ??= choices.find(row => row.text.includes('【开诊】'))
        selected ??= choices.find(row => row.tag === 'good')
        selected ??= choices.find(row => !['@shop', '@book2'].includes(row.next))
        assert(selected, id)
        await safeChoice(page, selected.text)
        await waitStepChange(page, id)
      } else if (step.end) {
        await page.getByRole('button', { name: /本班结束 · 结算|第二章 · 完 —— 结算/ }).click()
        await page.waitForFunction(() => ['settle', 'done'].includes(JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.phase))
      } else {
        await page.locator('.dialog-box > span.animate-bounce').waitFor()
        await page.locator('.dialog-box > p').click()
        if (step.next === '@quiz') await page.locator('[data-ch2-quiz]').waitFor()
        else await waitStepChange(page, id)
      }
      if (iterations % 30 === 0) console.log('Loop walkthrough', iterations, id)
    }
    assert(iterations < 700, 'Story actually reaches end')
    const final = await read(page)
    writeFileSync(`${output}/final-state.json`, JSON.stringify(final, null, 2))
    assert.equal(final.dlc.ch2.done, true)
    assert.equal(final.dlc.ch2.phase, 'done')
    assert.equal(settlements.size, 5)
    assert.equal(questionsAnswered, 5)
    assert.deepEqual([...scans].sort(), Object.keys(CH2_SCANS).sort())
    assert.deepEqual(frozen(final), frozen(start), 'Chapter 1 and other chapter progress frozen')
    assert.deepEqual(final.dlc.ch2.loop.entries.filter(row => row.kind === 'case').map(row => row.label).sort(), Object.values(CH2_CASE_COMPLETIONS).sort(), 'Every one of the 12 completed patient cases has a receipt')
    assert.deepEqual([...observations].sort(), Object.values(CH2_OBSERVATIONS).map(row => row.id).sort(), 'Every configured observation was answered')
    assert(log.some(row => row.kind === 'story' && row.id === CH2_OBSERVATION_WINDOW_CASES.wrist), 'Wrist keeps its existing window interaction')
    assert.equal(new Set(final.dlc.ch2.loop.entries.map(row => row.id)).size, final.dlc.ch2.loop.entries.length)
    for (const key of ['gold', 'skill', 'heart', 'wealth', 'ap']) {
      assert.equal(final.dlc.ch2.loop.entries.reduce((sum, row) => sum + row.delta[key], 0), final[key] - start[key], `${key} ledger reconciles to actual mutation`)
    }
    await page.locator('[data-ch2-complete="true"]').waitFor()
    await page.screenshot({ path: `${output}/whole-chapter-summary.png` })
    log.push({ kind: 'complete', iterations, scans: [...scans], observations: [...observations], settlements: [...settlements], questionsAnswered })
    console.log('PASS actual 5 shifts, 17 scan/reconstruction hooks, observations, 5 quiz questions, epilogue, protected chapter progress.')
    await context.close()
  }

  // In-scene gifts: consume once, restore the exact reply, retain AP; no after-shift gift action.
  for (const mobile of [false, true]) {
    const { page, context } = await open(fixture('c2d2_lunch_q', { items: ['milktea', 'snack'], heart: 7 }), mobile)
    const state = await read(page), id = state.dlc.ch2.stepId, step = ch2StepForState(id, CH2_SHIFTS[1].steps[id], state)
    await reveal(page, cleanText(step.text))
    const gift = ch2GiftChoices(state, id).find(row => row.next.endsWith(':fan:snack'))
    await safeChoice(page, gift.text)
    await page.waitForFunction(() => !!JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.giftReply)
    const given = await read(page)
    assert.equal(given.heart, state.heart + 1); assert.equal(given.ap, state.ap)
    assert(!given.items.includes('snack')); assert(given.items.includes('milktea'))
    await page.reload()
    const afterReload = await read(page)
    assert.equal(afterReload.heart, given.heart); assert.equal(afterReload.dlc.ch2.loop.gifts.length, 1)
    await forwardText(page, given.dlc.ch2.giftReply.text)
    await page.waitForFunction(() => !JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.giftReply)
    await reveal(page, cleanText(step.text))
    await page.locator('.choice-in button').first().waitFor()
    assert.equal(await page.getByRole('button', { name: /递给老范/ }).count(), 0)
    assert.equal(await page.getByRole('button', { name: '把奶茶递给小雷', exact: true }).count(), 1)
    await layout(page)
    await page.screenshot({ path: `${output}/gifts-${mobile ? 'mobile' : 'desktop'}.png` })
    await context.close()
  }
  // No owned goods means no gifts. Acutely sick patients never receive snack interruptions.
  for (const [id, items] of [['c2d2_lunch_q', []], ['c2d4_8', ['milktea', 'snack']]]) {
    const { page, context } = await open(fixture(id, { items }))
    const state = await read(page), shift = CH2_SHIFTS.find(row => row.steps[id]), obs = getCh2Observation(id, state)
    await reveal(page, cleanText(obs?.prompt ?? ch2StepForState(id, shift.steps[id], state).text))
    assert.equal(await page.getByRole('button', { name: /递给/ }).count(), 0)
    await context.close()
  }
  // The original hot-snack branch keeps its AP charge, consumption and badge exactly once.
  {
    const { page, context } = await open(fixture('c2n3_k1', { items: ['snack'], ap: 3 }))
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.appliedSteps.includes('ch2-c2n3_k1'))
    assert.equal((await read(page)).ap, 2); assert(!(await read(page)).items.includes('snack'))
    await page.reload()
    assert.equal((await read(page)).ap, 2)
    const heart = (await read(page)).heart
    for (const id of ['c2n3_k1', 'c2n3_k2', 'c2n3_k3']) {
      await forwardText(page, cleanText(CH2_SHIFTS[2].steps[id].text))
      await waitStepChange(page, id)
    }
    const result = await read(page)
    assert.equal(result.dlc.ch2.stepId, 'c2n3_hub')
    assert.equal(result.heart, heart + 1); assert(result.badges.includes('night_snack'))
    assert.equal(result.ap, 2)
    await context.close()
  }
  // New observation at phone viewport; wrong response still advances and never charges a penalty.
  {
    const { page, context } = await open(fixture('c2n1_p3'), true)
    const state = await read(page), observation = getCh2Observation('c2n1_p3', state)
    await reveal(page, observation.prompt)
    await safeChoice(page, observation.choices[0].text)
    const response = await read(page)
    assert.equal(response.gold, state.gold); assert.equal(response.skill, state.skill)
    await reveal(page, observation.choices[0].feedback)
    await layout(page)
    await page.screenshot({ path: `${output}/observation-mobile.png` })
    await page.locator('.dialog-box > p').click()
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.observations['stone-observe-v2'].acknowledged)
    await context.close()
  }
  {
    const { page, context, failedImageRequests } = await open(fixture('c2n1_p3'), true, 'ct_ch2_stone_v2')
    const before = await read(page), observation = getCh2Observation('c2n1_p3', before)
    await reveal(page, observation.prompt)
    await page.getByRole('status').waitFor()
    assert(failedImageRequests() > 0, 'Missing-image fixture intercepted the actual canonical observation image')
    const hint = observation.choices.find(choice => choice.hint)
    await safeChoice(page, hint.text)
    await forwardText(page, hint.feedback)
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.observations['stone-observe-v2'].acknowledged)
    assert.equal((await read(page)).skill, before.skill)
    await context.close()
  }
  // Old late-shift save: refresh-safe settlement, buy supplies without skipping a shift, no group-gifting button.
  for (const mobile of [false, true]) {
    const { page, context } = await open(fixture('c2n1_s3'), mobile)
    const state = await read(page), step = CH2_SHIFTS[0].steps.c2n1_s3
    await reveal(page, cleanText(step.text))
    await page.getByRole('button', { name: /本班结束 · 结算/ }).click()
    await page.locator('[data-ch2-settlement]').waitFor()
    const settled = await read(page)
    await page.getByRole('button', { name: '🛒 小卖部', exact: true }).click()
    await page.getByRole('button', { name: /^购买.*奶茶/ }).click()
    await page.getByRole('button', { name: '离开小卖部', exact: true }).click()
    const bought = await read(page)
    assert(bought.items.includes('milktea')); assert.equal(bought.heart, settled.heart + 2)
    assert.equal(bought.dlc.ch2.shift, 'c2n1'); assert.equal(bought.dlc.ch2.phase, 'settle')
    await page.getByRole('button', { name: '查看背包用途', exact: true }).click()
    assert.equal(await page.getByRole('button', { name: /请大家喝|分享夜宵|递给/ }).count(), 0)
    await page.getByRole('button', { name: '收好背包', exact: true }).click()
    await page.reload(); await page.locator('[data-ch2-settlement]').waitFor()
    const restored = await read(page)
    assert.equal(restored.gold, bought.gold); assert.equal(restored.heart, bought.heart)
    assert.equal(restored.dlc.ch2.shift, 'c2n1')
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await page.screenshot({ path: `${output}/settlement-${mobile ? 'mobile' : 'desktop'}.png` })
    assert.equal(state.dlc.ch2.loop.shifts.c2n1.recovered, true)
    await context.close()
  }
  assert.deepEqual(errors, [])
  console.log('PASS gifts/consumption/reload, no after-shift gifting, 390px dialogue+settlement, wrong observation continues, old-save settlement and shopping persistence.')
} catch (error) {
  if (activePage && !activePage.isClosed()) {
    await activePage.screenshot({ path: `${output}/failure.png`, fullPage: true }).catch(() => undefined)
    writeFileSync(`${output}/failure-state.json`, JSON.stringify(await read(activePage).catch(() => null), null, 2))
  }
  throw error
} finally {
  writeFileSync(`${output}/walkthrough.json`, JSON.stringify(log, null, 2))
  await browser.close()
}
