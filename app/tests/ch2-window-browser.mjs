// Focused restore fixtures; the separate all-badges route uses no injected save.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { freshState } from '../src/game/store.ts'
import { getCh2Observation } from '../src/game/ch2-observations.ts'

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const url = (process.env.GAME_URL || 'http://127.0.0.1:8798/').replace(/\/$/, '') + '/#/ch2'
const key = 'midnight-radiology-save-v1', errors = []
const read = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)
const dialog = page => page.locator('.dialog-box > p')
const confirm = page => page.getByRole('button', { name: /^就这个窗口 · 确认/ })
const plain = text => text.replaceAll('**', '')
async function open({ stepId = 'c2n1_m11', flags = {}, done = false, mobile = false, items = [] } = {}) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 }, hasTouch: mobile })
  const save = { ...freshState('f'), gold: 432, items, seed: 24680, flags: { quiz_grade: 'S', ...flags },
    dlc: { dr: { done: true }, dsa: { dose: 21 }, ch2: { shift: done ? 'c2am' : 'c2n1', stepId,
      phase: done ? 'done' : 'story', done, appliedSteps: [`ch2-${stepId}`], viewBg: 'bg_ctcontrol' } } }
  await context.addInitScript(({ save, key }) => {
    localStorage.setItem('mr-ch2-unlock', '1')
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(save))
  }, { save, key })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(url)
  if (mobile) await page.getByRole('button', { name: '不了，竖屏也能玩', exact: true }).click()
  await page.locator('[data-ch2-step]').waitFor()
  return { context, page, save }
}
async function ready(page) {
  if (!await confirm(page).count()) await dialog(page).click()
  await confirm(page).waitFor()
}
async function enterSecondWindow(page) {
  // Play the observation and intervening response rather than jumping its cursor.
  for (let tries = 0; tries < 12; tries++) {
    const s = await read(page)
    if (s.dlc.ch2.stepId === 'c2n1_w2') { await ready(page); return }
    const o = getCh2Observation(s.dlc.ch2.stepId, s), answer = o && s.dlc.ch2.observations?.[o.id]
    if (o && !answer?.acknowledged && !answer) {
      await dialog(page).click()
      const choice = o.choices.find(c => c.correct) ?? o.choices.find(c => c.hint)
      await page.getByRole('button', { name: plain(choice.text), exact: true }).click()
    } else {
      if (!await page.locator('.dialog-box > span.animate-bounce').count()) await dialog(page).click()
      await page.locator('.dialog-box > span.animate-bounce').waitFor()
      await dialog(page).click()
    }
    await page.waitForTimeout(350)
  }
  assert.fail('Could not reach second window through normal observation/dialogue')
}
try {
  for (const [failures, mobile] of [[1, false], [2, true]]) {
    const { context, page } = await open({ mobile })
    await ready(page)
    for (let index = 0; index < failures; index++) {
      await confirm(page).dblclick({ delay: 30 })
      await page.waitForTimeout(350)
      assert.equal((await read(page)).dlc.ch2.windowTasks.c2n1_m11.attempts, index + 1, 'Double click counts once')
      await page.reload(); await ready(page)
      assert((await confirm(page).innerText()).includes(`已试 ${index + 1} 次`), 'Failed attempts visible after reload')
    }
    await page.getByRole('button', { name: '脑窗 80/30', exact: true }).click()
    await confirm(page).click()
    await page.locator('[data-ch2-step="c2n1_w1ok"]').waitFor()
    await page.reload(); await dialog(page).waitFor()
    assert.equal((await read(page)).dlc.ch2.windowTasks.c2n1_m11.attempts, failures + 1)
    await enterSecondWindow(page)
    await page.getByRole('button', { name: '硬膜下窗 130/65', exact: true }).click()
    await confirm(page).click()
    await page.locator('[data-ch2-step="c2n1_w2ok"]').waitFor()
    const saved = await read(page)
    assert.equal(saved.badges.includes('window_master'), failures === 1)
    assert.equal(saved.dlc.ch2.windowTasks.c2n1_w2.attempts, 1)
    await page.reload(); await dialog(page).waitFor()
    const after = await read(page)
    assert.deepEqual(after.dlc.ch2.windowTasks, saved.dlc.ch2.windowTasks)
    assert.deepEqual(after.badges, saved.badges)
    assert.equal(after.dlc.ch2.loop.entries.filter(e => e.id === 'window-master').length, failures === 1 ? 1 : 0)
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await context.close()
  }
  {
    const { context, page } = await open({ stepId: 'c2n1_w2' })
    await ready(page)
    await page.getByRole('button', { name: '硬膜下窗 130/65', exact: true }).click(); await confirm(page).click()
    await page.locator('[data-ch2-step="c2n1_w2ok"]').waitFor()
    assert(!(await read(page)).badges.includes('window_master'), 'Legacy stage 2 cannot invent prior attempts')
    await context.close()
  }
  for (const actualReceipt of [true, false]) {
    const flags = actualReceipt ? { c2_chair_fixed: true, c2_payoff_base: true, c2_payoff_base_used: true } : {}
    const { context, page, save } = await open({ done: true, stepId: 'c2am_9', flags, items: ['toolbox', 'key'] })
    await page.locator('[data-ch2-settlement]').waitFor()
    if (actualReceipt) await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).badges.includes('c2_model_demo'), key)
    const after = await read(page)
    for (const id of ['c2_chair_helper', 'c2_brass_key', 'c2_model_demo']) assert.equal(after.badges.includes(id), actualReceipt)
    for (const stat of ['gold', 'skill', 'heart', 'wealth', 'ap', 'items', 'flags']) assert.deepEqual(after[stat], save[stat])
    assert.deepEqual(after.dlc.dr, save.dlc.dr); assert.deepEqual(after.dlc.dsa, save.dlc.dsa)
    assert(after.dlc.ch2.done, 'Completed legacy saves never go backwards')
    await page.reload(); await page.locator('[data-ch2-settlement]').waitFor()
    assert.deepEqual((await read(page)).badges, after.badges, 'Backfilled badges are one-time only')
    await context.close()
  }
  assert.deepEqual(errors, [])
  console.log('PASS ch2-window-browser: desktop/mobile failed and inter-stage reload, duplicate click, old-save/backfill and no false item-ownership award')
} finally { await browser.close() }
