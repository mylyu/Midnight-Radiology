// Real isolated Edge UI fixtures. Audio is deliberately refused, not auditioned.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { CH2_SHIFTS, ch2StepForState } from '../src/game/ch2.ts'
import { CH2_SCANS } from '../src/game/ch2-scans.ts'
import { getCh2Observation } from '../src/game/ch2-observations.ts'
import { freshState, condOk } from '../src/game/store.ts'
import { swipeCh2Checkin } from './ch2-checkin-driver.mjs'

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const base = (process.env.GAME_URL || 'http://127.0.0.1:8805/').replace(/\/$/, '')
const output = resolve(process.env.DAY_CASES_OUTPUT || '../../ch2-day-cases-review')
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const key = 'midnight-radiology-save-v1', results = [], errors = []
const removed = ['c2d2_8', 'c2d2_9a', 'c2d2_9b', 'c2d2_gut_scan', 'c2d2_10']
const day = CH2_SHIFTS.find(s => s.id === 'c2d2')
const clean = text => (text ?? '').replaceAll('**', '')
const read = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)
const p = page => page.locator('.dialog-box > p')
const basic = s => Object.fromEntries(['gold', 'skill', 'heart', 'wealth', 'ap', 'items', 'badges', 'cards'].map(k => [k, s[k]]))
const external = s => ({ night: s.night, stepId: s.stepId, finished: s.finished, durability: s.durability,
  quiz: s.flags.quiz_grade, dr: s.dlc.dr, dsa: s.dlc.dsa })
function fixture(stepId, patch = {}, progress = {}) {
  return { ...freshState('m'), night: 5, finished: true, stepId: 'n5_end', gold: 700, skill: 3, heart: 3, wealth: 3, ap: 2,
    flags: { quiz_grade: 'S' }, ...patch,
    dlc: { dr: { done: true }, dsa: { dose: 21 }, ch2: { shift: 'c2d2', phase: 'story', stepId,
      appliedSteps: [], viewBg: 'bg_ctcontrol_day', ...progress } } }
}
async function open(save, mobile = false) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 } })
  await context.addInitScript(({ save, key }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(save))
    localStorage.setItem('mr-ch2-unlock', '1')
    window.__dayAudio = []
    HTMLMediaElement.prototype.play = function () {
      window.__dayAudio.push(this.src)
      return Promise.reject(new DOMException('Audio refused by regression fixture', 'NotAllowedError'))
    }
  }, { save, key })
  const page = await context.newPage(); page.setDefaultTimeout(14000)
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(base + '/#/ch2')
  await page.locator('[data-ch2-step]').waitFor()
  const portrait = page.getByRole('button', { name: '不了，竖屏也能玩', exact: true })
  if (await portrait.isVisible()) await portrait.click()
  return { context, page }
}
async function reveal(page, text) {
  await p(page).waitFor()
  await page.waitForTimeout(330)
  if (text !== undefined) {
    if (await p(page).textContent() !== clean(text)) await p(page).click()
    await page.waitForFunction(text => document.querySelector('.dialog-box > p')?.textContent === text, clean(text))
  } else {
    if (!await page.locator('.dialog-box .animate-bounce, .choice-in button').count()) await p(page).click()
    await page.locator('.dialog-box .animate-bounce, .choice-in button').first().waitFor()
  }
}
async function at(page, id) {
  await page.locator(`[data-ch2-step="${id}"]`).waitFor()
  await reveal(page)
}
async function next(page, expected) {
  await reveal(page)
  await page.locator('.dialog-box .animate-bounce').waitFor()
  await page.waitForTimeout(330)
  await p(page).click()
  if (expected) await at(page, expected)
}
async function choose(page, label, expected) {
  const button = page.locator('.choice-in').getByRole('button', { name: clean(label), exact: true })
  await button.waitFor(); await button.click()
  if (expected) await at(page, expected)
}
async function geometry(page) {
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow')
  const box = await page.locator('.dialog-box').boundingBox()
  assert(box.y >= -1 && box.y + box.height <= page.viewportSize().height + 1, 'Dialogue stays in viewport')
}
async function absentGut(page) {
  const s = await read(page)
  assert(!removed.includes(s.dlc.ch2.stepId))
  assert.equal(await page.locator('.ch2-scan-overlay,[data-ch2-observation]').count(), 0)
  assert.equal(await page.locator('img').evaluateAll(images => images.some(img => /pat_gut/.test(img.src))), false)
  assert(!(await page.evaluate(() => window.__dayAudio)).some(src => /vox_ch2_gut/.test(src)))
}
try {
  // Actual lung payment -> both existing quiet pauses -> original queue decision.
  for (const mobile of [false, true]) {
    const item = mobile ? 'snack' : 'milktea', save = fixture('c2d2_7', { items: [item] })
    const { context, page } = await open(save, mobile)
    await at(page, 'c2d2_7'); assert.equal((await read(page)).gold, save.gold + 80)
    await page.reload(); await at(page, 'c2d2_7'); assert.equal((await read(page)).gold, save.gold + 80)
    await next(page, 'c2d2_gap_shift'); await next(page, 'c2d2_gap_shift_q')
    await choose(page, `把${mobile ? '零食' : '奶茶'}递给小唐`)
    await reveal(page)
    assert.equal((await read(page)).items.includes(item), false)
    await page.reload(); await at(page, 'c2d2_gap_shift_q')
    assert.equal((await read(page)).dlc.ch2.loop.gifts.length, 1)
    await next(page)
    await reveal(page)
    assert.equal(await page.getByRole('button', { name: /递给小唐/ }).count(), 0)
    await choose(page, day.steps.c2d2_gap_shift_q.choices[mobile ? 1 : 0].text, mobile ? 'c2d2_gap_shift_b' : 'c2d2_gap_shift_a')
    await next(page, 'c2d2_gap_food'); await absentGut(page)
    assert.match(await p(page).textContent(), /整理下一位的申请单/)
    await next(page, 'c2d2_gap_food_q'); await geometry(page)
    await page.screenshot({ path: `${output}/${mobile ? 'mobile' : 'desktop'}-banter.png` })
    await choose(page, day.steps.c2d2_gap_food_q.choices[mobile ? 1 : 0].text, mobile ? 'c2d2_gap_food_b' : 'c2d2_gap_food_a')
    await next(page, 'c2d2_q0')
    assert.doesNotMatch(await p(page).textContent(), /腹痛|肠梗阻/)
    const after = await read(page)
    assert.equal(after.gold, save.gold + 80)
    assert.equal(after.heart, save.heart + (mobile ? 1 : 0))
    assert.equal(after.dlc.ch2.loop.gifts.length, 1)
    assert.deepEqual(external(after), external(save))
    results.push({ kind: 'banter', mobile, gift: item, payment: 80, passed: true })
    await context.close()
  }
  // A save paused anywhere in the retired case must recover without showing it.
  for (const step of removed) {
    const save = fixture(step, { cards: ['window_advanced'], flags: { quiz_grade: 'S', queue_wait: true } }, {
      appliedSteps: [`ch2-${step}`], viewSprite: 'pat_gut', viewSprite2: 'pat_gut',
      scanSessions: { c2d2_gut_scan: { startedAt: Date.now() + 1000, completed: false } },
      observations: { 'abdomen-display-v1': { choiceId: 'window' } },
    })
    const { context, page } = await open(save)
    await at(page, 'c2d2_gap_food'); await absentGut(page)
    const after = await read(page)
    assert.deepEqual(basic(after), basic(save)); assert.deepEqual(after.flags, save.flags)
    assert.deepEqual(after.dlc.ch2.observations, save.dlc.ch2.observations)
    assert.deepEqual(after.dlc.ch2.scanSessions, save.dlc.ch2.scanSessions)
    assert.deepEqual(external(after), external(save))
    assert(!after.dlc.ch2.viewSprite && !after.dlc.ch2.viewSprite2)
    await page.reload(); await at(page, 'c2d2_gap_food'); await absentGut(page)
    assert.deepEqual(basic(await read(page)), basic(save))
    results.push({ kind: 'retired-save', step, passed: true })
    await context.close()
  }
  // The wrist's existing window task remains the only interaction/scan here.
  for (const mobile of [false, true]) {
    const save = fixture('c2d2_wrist_result'), { context, page } = await open(save, mobile)
    const prefix = mobile ? 'mobile' : 'desktop'
    await at(page, 'c2d2_wrist_result')
    const resultImage = await page.locator('img[alt="影像或证物"]').getAttribute('src')
    assert.match(resultImage, /ct_wrist_fracture_v2/)
    await next(page)
    await page.locator('[data-ch2-step="c2d2_w2"]').waitFor()
    await reveal(page, day.steps.c2d2_w2.text)
    await page.locator('canvas').waitFor()
    await page.waitForTimeout(450)
    const before = await page.locator('canvas').evaluate(c => c.toDataURL())
    await page.screenshot({ path: `${output}/${prefix}-wrist-default.png` })
    await page.getByRole('button', { name: '骨窗 4000/250', exact: true }).click()
    await page.waitForTimeout(180)
    const bone = await page.locator('canvas').evaluate(c => c.toDataURL())
    assert.notEqual(bone, before, 'Bone window actually changes pixel data')
    await page.screenshot({ path: `${output}/${prefix}-wrist-bone.png` })
    await page.getByRole('button', { name: /^就这个窗口 · 确认/ }).click()
    await at(page, 'c2d2_w2ok'); assert.match(await p(page).textContent(), /蜘蛛网.*骨折/)
    const afterWindow = await read(page)
    assert.equal(afterWindow.dlc.ch2.windowTasks.c2d2_w2.attempts, 1)
    await page.reload(); await at(page, 'c2d2_w2ok')
    assert.deepEqual(basic(await read(page)), basic(afterWindow))
    for (const id of ['c2d2_wrist_mesh', 'c2d2_wrist_crack', 'c2d2_wrist_compare', 'c2d2_wrist_review']) {
      await next(page, id)
      await absentGut(page)
      assert.equal(await page.locator('.choice-in button,.ch2-scan-overlay,[data-ch2-observation]').count(), 0)
      assert.equal(await page.locator('img[alt="影像或证物"]').getAttribute('src'), resultImage)
      if (id === 'c2d2_wrist_crack') { await geometry(page); await page.screenshot({ path: `${output}/${prefix}-wrist-crack.png` }) }
    }
    const awarded = await read(page)
    assert.equal(awarded.cards.filter(id => id === 'window_advanced').length, 1)
    await page.reload(); await at(page, 'c2d2_wrist_review')
    assert.deepEqual(basic(await read(page)), basic(awarded))
    assert.equal((await read(page)).dlc.ch2.loop.entries.filter(row => row.gained.cards.includes('window_advanced')).length, 1)
    await next(page, 'c2d2_lunch0')
    const after = await read(page)
    assert(!after.dlc.ch2.scanSessions); assert(!after.dlc.ch2.observations)
    assert.deepEqual(external(after), external(save))
    results.push({ kind: 'wrist', mobile, canvasChanged: true, onceOnlyCard: true, passed: true })
    await context.close()
  }
  // Complete second day via UI, including lung/trauma/wrist scans and settlement.
  if (process.env.DAY_CASES_SKIP_FULL_DAY !== '1') {
    const save = fixture('c2d2_0'), { context, page } = await open(save)
    const nodes = [], scans = new Set(), observations = new Set()
    let turns = 0
    while (++turns < 180) {
      const state = await read(page), prog = state.dlc.ch2, id = prog.stepId
      if (prog.phase === 'settle') break
      if (await swipeCh2Checkin(page, state)) continue
      assert(!removed.includes(id), `Removed case never reachable: ${id}`)
      const step = ch2StepForState(id, day.steps[id], state)
      assert(step, id)
      if (nodes.at(-1) !== id) nodes.push(id)
      if (CH2_SCANS[id] && !prog.scanSessions?.[id]?.completed) {
        scans.add(id)
        if (!prog.scanSessions?.[id]) await p(page).click()
        await page.waitForFunction(id => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.scanSessions?.[id]?.completed, id)
        continue
      }
      const observation = getCh2Observation(id, state), answer = observation && prog.observations?.[observation.id]
      if (observation && !answer?.acknowledged) {
        observations.add(observation.id)
        if (!answer) {
          await reveal(page, observation.prompt)
          await choose(page, (observation.choices.find(c => c.correct) ?? observation.choices.find(c => c.hint)).text)
        } else {
          await reveal(page, observation.choices.find(c => c.id === answer.choiceId).feedback)
          await next(page)
        }
        continue
      }
      await reveal(page, step.text)
      if (step.windowTask) {
        await page.getByRole('button', { name: new RegExp(` ${step.windowTask.targetW}/${step.windowTask.targetL}$`) }).click()
        await page.getByRole('button', { name: /^就这个窗口 · 确认/ }).click()
      } else if (step.choices) {
        const choices = step.choices.filter(c => condOk(state, c.cond))
        const chosen = choices.find(c => c.tag === 'good') ?? choices.find(c => !c.next.startsWith('@'))
        assert(chosen, id)
        await choose(page, chosen.text)
      } else if (step.end) await page.getByRole('button', { name: /本班结束 · 结算/ }).click()
      else await next(page)
      await page.waitForTimeout(350)
    }
    assert(turns < 180)
    await page.locator('[data-ch2-settlement]').waitFor()
    const after = await read(page)
    assert.equal(after.dlc.ch2.phase, 'settle')
    assert.deepEqual([...scans].sort(), ['c2d2_lung_scan', 'c2d2_w1', 'c2d2_trauma_scan', 'c2d2_wrist_scan'].sort())
    assert.deepEqual([...observations].sort(), ['lung-observe-v1', 'trauma-sequence-v1'].sort())
    assert.equal(after.cards.filter(id => id === 'window_advanced').length, 1)
    assert.deepEqual(after.dlc.ch2.loop.entries.filter(e => e.kind === 'case').map(e => e.id).sort(), ['case:c2d2_7', 'case:c2d2_t2', 'case:c2d2_w2ok'].sort())
    assert.deepEqual(external(after), external(save))
    await page.reload(); await page.locator('[data-ch2-settlement]').waitFor()
    assert.deepEqual(basic(await read(page)), basic(after))
    await page.screenshot({ path: `${output}/day-two-settlement.png` })
    results.push({ kind: 'full-day-two', turns, nodes, scans: [...scans], observations: [...observations],
      goldDelta: after.gold - save.gold, skillDelta: after.skill - save.skill, passed: true })
    await context.close()
  }
  assert.deepEqual(errors, [])
  writeFileSync(`${output}/results.json`, JSON.stringify({ base, results, errors }, null, 2))
  console.log(JSON.stringify({ passed: true, results, errors }, null, 2))
} catch (error) {
  writeFileSync(`${output}/failure.json`, JSON.stringify({ message: error.message, stack: error.stack, results, errors }, null, 2))
  for (const context of browser.contexts()) for (const page of context.pages()) await page.screenshot({ path: `${output}/failure.png` }).catch(() => {})
  throw error
} finally { await browser.close() }
