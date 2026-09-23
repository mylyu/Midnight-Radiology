import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { CH2_SHIFTS, ch2StepForState, QUIZ2 } from '../src/game/ch2.ts'
import { CH2_SCANS } from '../src/game/ch2-scans.ts'
import { getCh2Observation } from '../src/game/ch2-observations.ts'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, ...(process.env.EDGE_TEST === '1' ? {channel:'msedge'} : process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
const errors = []
const fullLog = []
const output = process.env.FLOW_OUTPUT || '../../ch2-pacing-review-walk-20260921'
const url = process.env.GAME_URL || 'http://127.0.0.1:8798/'
const current = page => page.evaluate(() => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.stepId)
async function open(shift, stepId, mobile = false, rejectVoice = false) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 } })
  await context.addInitScript(({ shift, stepId, rejectVoice }) => {
    window.__voiceCalls = []
    HTMLMediaElement.prototype.play = function () {
      window.__voiceCalls.push(this.src)
      if (rejectVoice && window.__voiceCalls.length === 1) return Promise.reject(new DOMException('Blocked', 'NotAllowedError'))
      return Promise.resolve()
    }
    localStorage.setItem('mr-ch2-unlock', '1')
    if (!localStorage.getItem('midnight-radiology-save-v1')) localStorage.setItem('midnight-radiology-save-v1', JSON.stringify({ gender: 'm', night: 5, gold: 500, skill: 3, wealth: 3, heart: 3, durability: 70, badges: [], stamps: [], flags: {}, lastCheckin: '', streak: 0, finished: true, seed: 1234, items: [], ap: 3, buyCount: 0, cards: [], events: [], dlc: { ch2: { shift, stepId, viewBg: 'bg_archive' } } }))
    if (rejectVoice) {
      const saved = JSON.parse(localStorage.getItem('midnight-radiology-save-v1'))
      saved.flags.heard2_vp3_vox2_zhou = true
      localStorage.setItem('midnight-radiology-save-v1', JSON.stringify(saved))
    }
  }, { shift, stepId, rejectVoice })
  const page = await context.newPage()
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(url + '#/ch2')
  await page.locator('.dialog-box').waitFor()
  return { context, page }
}
async function advance(page, expected) {
  // Result fixtures now stop first at the player's observation. Complete that
  // in-scene exchange, then advance the original story exactly as before.
  await completeObservation(page)
  await page.locator('.dialog-box > span.animate-bounce').waitFor({ timeout: 15000 })
  await page.locator('.dialog-box > p').click()
  await page.waitForFunction(expected => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.stepId === expected, expected, { timeout: 3000 })
}
async function completeObservation(page) {
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')))
  const p = state.dlc.ch2, config = getCh2Observation(p.stepId, state)
  if (!config || p.observations?.[config.id]?.acknowledged) return false
  let answer = p.observations?.[config.id]
  const dialog = page.locator('.dialog-box > p')
  if (!answer) {
    const expected = config.prompt.replaceAll('**', '')
    if (await dialog.textContent() !== expected) await dialog.click()
    await page.waitForFunction(text => document.querySelector('.dialog-box > p')?.textContent === text, expected)
    const choice = config.choices.find(c => c.correct) ?? config.choices.find(c => c.hint)
    assert(choice, `${p.stepId}: observation must have an available response`)
    if (config.regions?.length) assert.equal(await page.getByLabel(config.regions[0].label, { exact: true }).count(), 0, 'No answer ring before choice')
    await page.locator('.choice-in').getByRole('button', { name: choice.text.replaceAll('**', ''), exact: true }).click()
    await page.waitForFunction(key => !!JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.observations[key], config.id)
    answer = { choiceId: choice.id }
  }
  const feedback = config.choices.find(c => c.id === answer.choiceId).feedback.replaceAll('**', '')
  if (await dialog.textContent() !== feedback) await dialog.click()
  await page.waitForFunction(text => document.querySelector('.dialog-box > p')?.textContent === text, feedback)
  await page.locator('.dialog-box > span.animate-bounce').waitFor({ timeout: 15000 })
  await dialog.click()
  await page.waitForFunction(key => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.observations[key].acknowledged, config.id)
  assert.equal(await current(page), p.stepId, 'Acknowledging observation must return to, not skip, original node')
  return config.id
}
try {
  {
    const { context, page } = await open('c2n1', 'c2n1_4', false, true)
    await page.waitForFunction(() => window.__voiceCalls.length === 1)
    assert.equal(await page.getByRole('button', { name: /显示全文|继续 →/ }).count(), 0)
    await page.locator('.dialog-box > p').click()
    await page.waitForFunction(() => window.__voiceCalls.length === 2)
    assert.ok((await page.evaluate(() => window.__voiceCalls)).every(src => src.includes(`${CH2_SHIFTS[0].steps.c2n1_4.sfx}.mp3`)))
    await context.close()
    console.log('PASS: old heard flag does not suppress entrance; rejected audio retries on click; original dialogue UI restored.')
  }
  // Repro: the old guard uses every tap, including rejected ones. Repeated taps
  // after revealing a choice perpetually extend the 300 ms rejection window.
  {
    const { context, page } = await open('c2n1', 'c2n1_p2')
    const choice = page.getByRole('button', { name: '「怀疑结石，先请周老师确认平扫方案。」', exact: true })
    await choice.waitFor()
    await page.locator('.dialog-box > p').click()
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('怀疑结石，先请周老师'))?.click())
      await page.waitForTimeout(100)
    }
    assert.equal(await current(page), 'c2n1_p2a', 'Rapid taps must select once, not perpetually reset a click lock')
    await context.close()
  }
  for (const mobile of [false, true]) {
    const { context, page } = await open('c2n5', 'c2n5_a2', mobile)
    console.log('Before key advance', mobile, await current(page))
    await page.getByRole('button', { name: '📚 旧书', exact: true }).click()
    await page.getByRole('button', { name: '合上书，回科室', exact: true }).click()
    await page.reload()
    assert.equal(await current(page), 'c2n5_a2')
    await advance(page, 'c2n5_a3')
    await advance(page, 'c2n5_a4')
    await advance(page, 'c2n5_a5')
    await advance(page, 'c2n5_a6')
    await page.getByRole('button', { name: '「最边上那个，是您吧？」', exact: true }).click()
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.stepId === 'c2n5_a7')
    for (const next of ['c2n5_a8', 'c2n5_a9', 'c2n5_a10', 'c2n5_hub']) await advance(page, next)
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).flags.c2n5_cabinet), true)
    await context.close()
  }
  {
    const { context, page } = await open('c2n1', 'c2n1_p0')
    await page.locator('img[src$="/ch2_pixel_pat_stone.png"]').waitFor()
    await advance(page, 'c2n1_pain')
    await page.getByText('哎呦，疼死我了。', { exact: true }).waitFor()
    assert.equal(await page.evaluate(() => window.__voiceCalls.filter(src => src.includes('/vox_guy.mp3')).length), 1)
    await advance(page, 'c2n1_p1')
    await page.locator('img[src$="/ch2_pixel_char_he.png"]').waitFor()
    await context.close()
  }
  {
    const { context, page } = await open('c2d2', 'c2d2_w2', true)
    await page.locator('canvas').waitFor()
    assert(!/AI生成|非实测|不用于诊断|非真实患者/.test(await page.locator('body').innerText()))
    await context.close()
  }
  {
    const { context, page } = await open('c2n5', 'c2n5_m17')
    await page.locator('img[src$="/ct_head_child_followup.png"]').waitFor()
    await advance(page, 'c2n5_m18')
    await context.close()
  }
  if (process.env.FULL_WALK === '1') {
    mkdirSync(output, { recursive: true })
    const { context, page } = await open('c2n1', 'c2n1_0')
    let visited = 0, questionsAnswered = 0
    const settlements = new Set(), scans = new Set(), observations = new Set()
    while (visited++ < 600) {
      const state = await page.evaluate(() => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')))
      const progress = state.dlc.ch2
      if (progress.done) {
        await page.screenshot({path:`${output}/flow-complete.png`})
        break
      }
      if (progress.phase === 'settle') {
        await page.locator('[data-ch2-settlement]').waitFor()
        settlements.add(progress.shift)
        fullLog.push({kind:'settlement',shift:progress.shift,step:progress.stepId,gold:state.gold})
        await page.reload()
        await page.locator('[data-ch2-settlement]').waitFor()
        const resumed = await page.evaluate(() => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')))
        assert.equal(resumed.dlc.ch2.shift,progress.shift)
        assert.equal(resumed.dlc.ch2.stepId,progress.stepId)
        assert.equal(resumed.gold,state.gold)
        await page.getByRole('button',{name:/进入下一班|前往晨会/}).click()
        await page.waitForFunction(shift=>JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.shift!==shift,progress.shift)
        continue
      }
      if (progress.phase === 'quiz') {
        await page.locator('[data-ch2-quiz]').waitFor()
        const quiz = progress.quiz
        if (quiz.completed) {
          fullLog.push({kind:'grade',grade:quiz.grade,gold:state.gold})
          await page.screenshot({path:`${output}/flow-quiz-grade.png`})
          await page.reload();await page.locator('[data-ch2-quiz]').waitFor()
          assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).gold),state.gold)
          await page.getByRole('button',{name:'回到晨会 →',exact:true}).click()
          await page.locator('[data-ch2-step="c2am_3"]').waitFor()
        } else {
          const row = quiz.questions[quiz.index], question = QUIZ2[row.question]
          fullLog.push({kind:'quiz',index:quiz.index+1,question:question.q,answer:question.options[question.answer]})
          await page.locator('[data-ch2-quiz]').getByRole('button',{name:question.options[question.answer],exact:true}).click()
          questionsAnswered++
          await page.getByRole('button',{name:quiz.index===4?'查看成绩 →':'下一题 →',exact:true}).click()
          await page.waitForFunction(index=>{const q=JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.quiz;return q.completed||q.index!==index},quiz.index)
        }
        continue
      }
      const shift = CH2_SHIFTS.find(s => s.id === progress.shift)
      const rawStep = shift.steps[progress.stepId]
      const step = ch2StepForState(progress.stepId,rawStep,state)
      assert(step, progress.stepId)
      const scan = CH2_SCANS[progress.stepId]
      if (scan && !progress.scanSessions?.[progress.stepId]?.completed) {
        if (!progress.scanSessions?.[progress.stepId]) await page.locator('.dialog-box > p').click()
        await page.locator(`.ch2-scan-overlay[data-scan-id="${progress.stepId}"]`).waitFor({ timeout: 12000 })
        assert.equal(await page.locator('img[alt="影像或证物"]').count(), 0, 'No result before scan presentation')
        await page.getByRole('button', { name: '跳过演出', exact: true }).click()
        await page.locator('.ch2-scan-overlay').waitFor({ state: 'detached' })
        await page.waitForFunction(id => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.scanSessions[id].completed, progress.stepId)
        if (scan.mode === 'acquire') await page.waitForFunction(id => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.stepId !== id, progress.stepId)
        scans.add(progress.stepId)
        fullLog.push({kind:'scan',step:progress.stepId,mode:scan.mode})
        continue
      }
      const observed = await completeObservation(page)
      if (observed) {
        observations.add(observed)
        fullLog.push({kind:'observation',step:progress.stepId,id:observed})
        continue
      }
      fullLog.push({kind:'story',step:progress.stepId,text:step.text,shift:progress.shift})
      if (step.windowTask) {
        // A click must reveal even task text, without skipping the step.
        await page.locator('.dialog-box > p').click()
        await page.getByRole('button', { name: new RegExp(` ${step.windowTask.targetW}/${step.windowTask.targetL}$`) }).click()
        await page.getByRole('button', { name: /^就这个窗口 · 确认/ }).click()
      } else if (step.choices) {
        // A click must reveal even choice text, without selecting anything.
        await page.locator('.dialog-box > p').click()
        const buttons = page.locator('.choice-in button')
        await buttons.first().waitFor()
        const labels = await buttons.allTextContents()
        let pick = labels.findIndex(t => t.includes('封条柜 · 和老周一起开锁'))
        if (pick < 0) pick = labels.findIndex(t => t.includes('【开诊】') && !t.includes('还有件事'))
        if (pick < 0) pick = labels.findIndex(t => step.choices.some(c => c.tag === 'good' && c.text.replaceAll('**', '') === t))
        if (pick < 0) pick = labels.findIndex(t => !['小卖部', '翻书'].some(s => t.includes(s)))
        await buttons.nth(Math.max(0, pick)).click()
      } else if (step.end) {
        // A click must reveal even end text, without skipping settlement.
        await page.locator('.dialog-box > p').click()
        await page.getByRole('button', { name: /本班结束 · 结算|第二章 · 完 —— 结算/ }).click()
      } else {
        // Original (restored) UI: the ▼ appears once the text is done; clicking the
        // dialogue then advances exactly one step.
        const expected=(step.text??'').replaceAll('**','').replaceAll('行动力⚡×3',`行动力⚡×${state.ap}`)
        if(await page.locator('.dialog-box > p').textContent()!==expected)await page.locator('.dialog-box > p').click()
        await page.waitForFunction(expected=>document.querySelector('.dialog-box > p')?.textContent===expected,expected)
        await page.locator('.dialog-box > span.animate-bounce').waitFor({ timeout: 15000 })
        await page.locator('.dialog-box > p').click()
      }
      await page.waitForFunction(before => {
        const now = JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2
        return now.stepId !== before.stepId || now.shift !== before.shift || now.phase !== before.phase || now.done
      }, progress, { timeout: 5000 })
      if (visited % 30 === 0) console.log('Continuous walk', visited, await current(page))
    }
    assert(visited < 600, 'Story loop did not reach actual completion')
    const final = await page.evaluate(()=>JSON.parse(localStorage.getItem('midnight-radiology-save-v1')))
    assert.equal(final.dlc.ch2.done,true)
    assert.equal(final.dlc.ch2.phase,'done')
    assert.equal(settlements.size,5)
    assert.equal(questionsAnswered,5)
    assert.equal(final.dlc.ch2.quiz.grade,'S')
    assert.equal(final.flags.quiz2_grade,'S')
    assert.deepEqual([...scans].sort(), Object.keys(CH2_SCANS).sort(), 'Full walk must still exercise all 15 acquisitions and 2 reconstructions')
    assert.equal(observations.size, 12, 'Every added observation/plan gate is played')
    fullLog.push({kind:'summary',iterations:visited,storyNodes:fullLog.filter(row=>row.kind==='story').length,settlements:[...settlements],scans:[...scans],observations:[...observations],questionsAnswered,done:true})
    console.log('PASS: continuous five-shift walk + 5 saved settlements + all 5 exam questions + entire ending, iterations:', visited)
    await context.close()
  }
  assert.deepEqual(errors, [])
  console.log('PASS: rapid-choice taps, desktop/mobile cabinet flow, book close and reload, patient portrait/voice before doctor, clean wrist UI, new child follow-up image.')
} finally {
  if(process.env.FULL_WALK === '1') {
    mkdirSync(output,{recursive:true})
    writeFileSync(`${output}/flow-transcript.json`,JSON.stringify(fullLog,null,2))
  }
  await browser.close()
}
