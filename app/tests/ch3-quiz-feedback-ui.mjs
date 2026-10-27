// Targeted morning-quiz fixtures, not a chapter playthrough. Uses the shared final build.
// TRILOGY_BUILD_READY=1 EDGE_TEST=1 node --import tsx tests/ch3-quiz-feedback-ui.mjs
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { freshState } from '../src/game/store.ts'
import { CH3 as chapter } from '../src/game/ch3.ts'
import { initializeTrilogy, patchTrilogy, startTrilogyQuiz } from '../src/game/trilogy-session.ts'

assert.equal(process.env.TRILOGY_BUILD_READY, '1', 'Run against the shared final production build')
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const url = (process.env.GAME_URL || 'http://127.0.0.1:8798/').replace(/[?#].*$/, '')
const output = resolve(process.env.CH3_QUIZ_OUTPUT || '../../ch3-quiz-feedback-review-20261027')
const key = 'midnight-radiology-save-v1'
const report = { kind: 'focused-quiz-fixtures-not-full-walk', cases: [], screenshots: [], errors: [] }
const progress = state => state.dlc.ch3.chapter
const values = state => ({ gold: state.gold, skill: state.skill, heart: state.heart, wealth: state.wealth })
mkdirSync(output, { recursive: true })
function fixture() {
  let state = initializeTrilogy({ ...freshState('f'), seed: 20261027, gold: 1400, skill: 8, heart: 7, wealth: 4 }, chapter, 'ch3-quiz-feedback')
  state = patchTrilogy(state, 'ch3', { shift: 4, phase: 'settle', applied: ['checkin:0', 'checkin:1', 'checkin:2', 'checkin:3', 'checkin:4'] })
  state = startTrilogyQuiz(state, chapter)
  const quiz = progress(state).quiz
  // Deliberately move every answer away from its original array position. The UI
  // must highlight its answer identity, never its shuffled display position.
  state = patchTrilogy(state, 'ch3', { quiz: { ...quiz, questions: quiz.questions.map(row => ({
    ...row, order: row.order.map((_, index) => (index + 1) % row.order.length),
  })) } })
  return state
}
const browser = await chromium.launch({ headless: true, ...(process.env.EDGE_TEST === '1' ? { channel: 'msedge' } : {}) })
try {
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    const name = viewport.width === 390 ? 'mobile' : 'desktop'
    const context = await browser.newContext({ viewport, hasTouch: name === 'mobile' })
    await context.addInitScript(() => {
      localStorage.setItem('mr-trilogy-muted', '1')
      sessionStorage.setItem('mr-rotate-dismissed', '1')
    })
    const page = await context.newPage()
    page.setDefaultTimeout(8000)
    page.on('pageerror', error => report.errors.push(error.message))
    const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)
    const initial = fixture(), before = values(initial)
    async function loaded() {
      await page.waitForFunction(() => {
        const loader = document.querySelector('[data-chapter-loader]')
        return loader ? ['ready', 'error'].includes(loader.getAttribute('data-status')) : !!document.querySelector('[data-trilogy="ch3"]')
      }, undefined, { timeout: 120000 })
      const loader = page.locator('[data-chapter-loader]')
      if (await loader.count()) {
        assert.notEqual(await loader.getAttribute('data-status'), 'error', await loader.textContent())
        await page.locator('[data-chapter-enter]').click()
        await loader.waitFor({ state: 'detached', timeout: 120000 })
      }
      await page.locator('[data-trilogy="ch3"] .trilogy-quiz').waitFor()
    }
    async function shot(label) {
      const path = resolve(output, `${name}-${label}.png`)
      await page.screenshot({ path }); report.screenshots.push(path)
    }
    async function fit(locator, label) {
      const box = await locator.boundingBox()
      assert(box && box.x >= -1 && box.y >= -1 && box.x + box.width <= viewport.width + 1 && box.y + box.height <= viewport.height + 1,
        `${name} ${label}: ${JSON.stringify(box)}`)
    }
    await page.goto(url)
    await page.evaluate(({ key, initial }) => localStorage.setItem(key, JSON.stringify(initial)), { key, initial })
    await page.goto(`${url}?v=ch3-quiz-feedback-${name}#/ch3`)
    await loaded()
    const quizPanel = page.locator('.trilogy-quiz')
    for (let index = 0; index < 5; index++) {
      const state = await read(), row = progress(state).quiz.questions[index], question = progress(state).quizContent[row.question]
      assert.equal(progress(state).quiz.index, index)
      assert.equal(await quizPanel.locator('[data-quiz-result]').count(), 0, 'No answer-specific styling before selecting')
      assert.equal(await quizPanel.locator('[role="status"]').count(), 0, 'No correct answer text before selecting')
      assert.equal(await quizPanel.getByLabel(/正确答案/).count(), 0, 'No accessible answer leak')
      const picked = index === 0 ? row.order.find(answer => answer !== question.answer) : question.answer
      const position = row.order.indexOf(picked)
      assert.notEqual(row.order.indexOf(question.answer), question.answer, 'Fixture exercises a shuffled correct answer')
      await page.waitForTimeout(1000) // Existing 900 ms choice buffer + 300 ms quiet period, unchanged.
      const target = quizPanel.locator(`[data-dialogue-choice="${position}"]`)
      await target.click()
      await quizPanel.locator('[role="status"]').waitFor()
      const selected = await read()
      assert.equal(progress(selected).quiz.questions[index].selected, picked)
      assert.deepEqual(values(selected), before, 'Answer feedback does not award early')
      const correct = quizPanel.locator('[data-quiz-result="correct"]')
      assert.equal(await correct.count(), 1)
      assert.equal(await correct.textContent(), `✓ ${question.options[question.answer]}`)
      // Match the settled visual state after DialogueChoice's existing transition.
      await page.waitForFunction(() => Array.from(document.querySelectorAll('[data-quiz-result]')).every(element => {
        const style = getComputedStyle(element), result = element.getAttribute('data-quiz-result')
        return result === 'other' ? style.opacity === '0.5' : style.opacity === '1'
          && style.borderColor === (result === 'correct' ? 'rgb(52, 211, 153)' : 'rgb(248, 113, 113)')
      }))
      assert.equal(await correct.evaluate(element => getComputedStyle(element).borderColor), 'rgb(52, 211, 153)')
      const status = await quizPanel.locator('[role="status"]').textContent()
      assert(status.includes(index === 0 ? '✗ 答错了。' : '✓ 答对了。'))
      assert(status.includes(question.explain))
      assert(status.includes(`正确答案：${question.options[question.answer]}`))
      assert.equal(await quizPanel.locator('[data-dialogue-choice]:not(:disabled)').count(), 0)
      assert(await quizPanel.locator('[data-quiz-result="other"]').evaluateAll(elements => elements.every(element => getComputedStyle(element).opacity === '0.5')))
      if (index === 0) {
        const wrong = quizPanel.locator('[data-quiz-result="incorrect"]')
        assert.equal(await wrong.textContent(), `✗ ${question.options[picked]}`)
        assert.equal(await wrong.evaluate(element => getComputedStyle(element).borderColor), 'rgb(248, 113, 113)')
        const box = await wrong.boundingBox()
        await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2, { delay: 35 })
        assert.deepEqual(progress(await read()).quiz, progress(selected).quiz, 'Disabled answers cannot be resubmitted')
        await fit(quizPanel.locator('[role="status"]'), 'wrong feedback')
        await fit(page.locator('[data-trilogy-quiz-next]'), 'next question')
        await shot('wrong')
        await page.reload(); await loaded()
        assert.deepEqual(progress(await read()).quiz, progress(selected).quiz, 'Refresh preserves result and option order')
        assert.equal(await quizPanel.locator('[data-quiz-result="correct"]').textContent(), `✓ ${question.options[question.answer]}`)
        assert((await quizPanel.locator('[role="status"]').textContent()).includes('✗ 答错了。'))
      }
      if (index === 1) {
        assert.equal(await quizPanel.locator('[data-quiz-result="incorrect"]').count(), 0)
        await fit(quizPanel.locator('[role="status"]'), 'correct feedback')
        await fit(page.locator('[data-trilogy-quiz-next]'), 'next question')
        await shot('correct')
      }
      await page.waitForTimeout(550) // Preserve the existing 500 ms mutation gate.
      await page.locator('[data-trilogy-quiz-next]').dblclick({ delay: 35 })
      await page.waitForFunction(({ key, index }) => {
        const quiz = JSON.parse(localStorage.getItem(key)).dlc.ch3.chapter.quiz
        return index === 4 ? quiz.completed : quiz.index === index + 1
      }, { key, index })
      if (index < 4) assert.equal(await quizPanel.locator('[role="status"]').count(), 0, 'Next question resets feedback')
    }
    const completed = await read()
    assert.equal(progress(completed).quiz.grade, 'A')
    assert.equal(completed.gold, before.gold + 80)
    assert.equal(completed.skill, before.skill + 1)
    await page.reload(); await loaded()
    assert.deepEqual(values(await read()), values(completed), 'Completed-quiz refresh does not repay reward')
    assert.equal(progress(await read()).quiz.completed, true)
    report.cases.push({ viewport, result: 'PASS', questions: 5, right: 4, wrong: 1, refreshes: 2,
      checks: 'shuffled identity; no pre-answer leak; green/red/dim; explicit answer/explanation; refresh; disabled answers; next double click; one reward' })
    await context.close()
  }
  assert.deepEqual(report.errors, [])
  console.log(JSON.stringify(report, null, 2))
} finally {
  await browser.close()
  writeFileSync(resolve(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`)
}
