// Isolated real Edge fixtures for the optional Chapter 2 stat interactions.
// Seeded saves are explicit boundary fixtures, not a substitute for the full walk.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { CH2_SHIFTS, ch2StepForState } from '../src/game/ch2.ts'
import { CH2_OBSERVATIONS } from '../src/game/ch2-observations.ts'
import { ch2StatReply } from '../src/game/ch2-stat-interactions.ts'
import { freshState } from '../src/game/store.ts'
import { SHOP_ITEMS } from '../src/game/data.ts'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const baseURL = process.env.GAME_URL || 'http://127.0.0.1:8798/'
const output = resolve(process.env.DETAIL_STATS_OUTPUT || '../../ch2-detail-polish-review/stats-browser')
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const errors = [], results = []
let activePage
const clean = text => (text ?? '').replaceAll('**', '')
const key = 'midnight-radiology-save-v1'
const read = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)
const base = (id, patch = {}) => ({ ...freshState('f'), skill: 8, heart: 8, wealth: 3, ap: 3,
  gold: 800, night: 5, finished: true, screenHint: 'chapterEnd', stepId: 'n5_end', resumeKey: '5-n5_end',
  items: ['toolbox'], buyCount: 23, lotteryNight: 5, lotteryCount: 3, seed: 260925,
  flags: { quiz_grade: 'S', pacs_log: true }, ...patch,
  dlc: { dr: { done: true, served: ['ge'] }, dsa: { dose: 12, pedalTry: 2 },
    ch2: { phase: 'story', shift: id.split('_')[0], stepId: id, appliedSteps: [],
      viewBg: id.startsWith('c2d') ? 'bg_ctcontrol_day' : 'bg_ctcontrol', ...(patch.progress ?? {}) } },
})
const frozen = s => ({ gold: s.gold, night: s.night, finished: s.finished, screenHint: s.screenHint,
  stepId: s.stepId, resumeKey: s.resumeKey, buyCount: s.buyCount, lotteryNight: s.lotteryNight,
  lotteryCount: s.lotteryCount, durability: s.durability, grade: s.flags.quiz_grade, dr: s.dlc.dr, dsa: s.dlc.dsa })

async function open(s, mobile = false) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 } })
  await context.addInitScript(({ s, key }) => {
    localStorage.setItem('mr-ch2-unlock', '1')
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(s))
    HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('Fixture audio denied', 'NotAllowedError'))
    window.__statNotices = []
    new MutationObserver(() => {
      for (const element of document.querySelectorAll('[data-stat-notice]')) {
        const row = { id: element.dataset.statNotice, text: element.textContent,
          pointerEvents: getComputedStyle(element).pointerEvents }
        const previous = window.__statNotices.find(saved => saved.id === row.id)
        if (previous) Object.assign(previous, row)
        else window.__statNotices.push(row)
      }
    }).observe(document, { subtree: true, childList: true, characterData: true })
  }, { s, key })
  const page = await context.newPage()
  activePage = page
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(baseURL + '#/ch2', { waitUntil: 'domcontentloaded' })
  await page.locator(`[data-ch2-step="${s.dlc.ch2.stepId}"]`).waitFor()
  await page.waitForFunction(key => !!JSON.parse(localStorage.getItem(key))?.dlc?.ch2?.loop, key)
  return { context, page }
}
async function reveal(page, expected) {
  const text = clean(expected), p = page.locator('.dialog-box > p')
  if (await p.textContent() !== text) await p.click()
  await page.waitForFunction(text => document.querySelector('.dialog-box > p')?.textContent === text, text, { timeout: 8000 })
}
async function actualStep(page) {
  const state = await read(page), p = state.dlc.ch2, step = CH2_SHIFTS.find(row => row.id === p.shift).steps[p.stepId]
  return ch2StatReply(state, p.stepId) || ch2StepForState(p.stepId, step, state)
}
async function choose(page, label) {
  const button = page.locator('.choice-in').getByRole('button', { name: clean(label), exact: true })
  await button.waitFor({ timeout: 6000 })
  await button.click()
}
async function next(page, expectedId) {
  await reveal(page, (await actualStep(page)).text)
  await page.locator('.dialog-box > span.animate-bounce').waitFor()
  await page.waitForTimeout(330) // respect the actual public advance guard
  await page.locator('.dialog-box > p').click()
  if (expectedId) await page.locator(`[data-ch2-step="${expectedId}"]`).waitFor()
}
async function reloadStable(page, before) {
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.locator(`[data-ch2-step="${before.dlc.ch2.stepId}"]`).waitFor()
  await page.waitForTimeout(140)
  const after = await read(page)
  for (const field of ['gold', 'skill', 'heart', 'wealth', 'ap']) assert.equal(after[field], before[field], `Refresh preserves ${field}`)
  assert.deepEqual(after.dlc.ch2.statInteractions, before.dlc.ch2.statInteractions)
  assert.deepEqual(after.dlc.ch2.observations, before.dlc.ch2.observations)
  assert.deepEqual(after.dlc.ch2.loop.entries, before.dlc.ch2.loop.entries)
  assert.equal(await page.locator('[data-stat-notice]').count(), 0, 'Restored values do not float again')
  assert.deepEqual(await page.evaluate(() => window.__statNotices), [])
}
async function layout(page, file, imageRequired = false) {
  if (await page.locator('img[alt="影像或证物"]').count()) {
    await page.waitForFunction(() => {
      const image = document.querySelector('img[alt="影像或证物"]')
      return image?.complete && image.naturalWidth > 0
    })
  }
  const boxes = await page.evaluate(() => {
    const rect = node => { if (!node) return null; const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height } }
    return { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth,
      dialog: rect(document.querySelector('.dialog-box')), image: rect(document.querySelector('img[alt="影像或证物"]')),
      notices: [...document.querySelectorAll('[data-stat-notice]')].map(rect),
      pointerEvents: getComputedStyle(document.querySelector('[data-stat-feedback]')).pointerEvents }
  })
  assert(boxes.scrollWidth <= boxes.width, 'No horizontal overflow')
  assert(boxes.dialog.y >= 0 && boxes.dialog.y + boxes.dialog.height <= boxes.height + 1, 'Dialog fits the viewport')
  assert.equal(boxes.pointerEvents, 'none', 'Stat feedback never steals clicks')
  if (imageRequired) assert(boxes.image, 'The same observation image remains displayed')
  if (boxes.image) {
    assert(boxes.image.y >= 0 && boxes.image.y + boxes.image.height <= boxes.dialog.y + 1, 'CT image and dialogue do not overlap')
    for (const b of boxes.notices) assert(b.x + b.width <= boxes.image.x || boxes.image.x + boxes.image.width <= b.x
      || b.y + b.height <= boxes.image.y || boxes.image.y + boxes.image.height <= b.y, 'Feedback does not cover the CT image')
  }
  await page.screenshot({ path: join(output, `${file}.png`) })
  return boxes
}
async function notice(page, text) {
  await page.waitForFunction(text => window.__statNotices.some(row => row.text.includes(text)), text)
  const rows = await page.evaluate(text => window.__statNotices.filter(row => row.text.includes(text)), text)
  assert.equal(rows.length, 1, `${text}: one actual mutation, one visual notice`)
  assert(rows.every(row => row.pointerEvents === 'none'))
  await page.waitForFunction(text => [...document.querySelectorAll('[data-stat-notice]')].some(element =>
    element.textContent.includes(text) && Number(getComputedStyle(element).opacity) >= .95), text)
}

try {
  for (const [id, hint, mobile] of [['c2n1_w1ok', 'fall', false], ['c2d2_w1ok', 'lung', true], ['c2d4_12a', 'metal', false]]) {
    const initial = base(id), { page, context } = await open(initial, mobile), observation = CH2_OBSERVATIONS[id]
    await reveal(page, observation.prompt)
    await page.locator('.choice-in').waitFor()
    const image = await page.locator('img[alt="影像或证物"]').getAttribute('src')
    for (const region of observation.regions ?? []) assert.equal(await page.getByLabel(region.label, { exact: true }).count(), 0)
    assert.equal((await read(page)).dlc.ch2.observations, undefined)
    const beforeLayout = await layout(page, `${hint}-choices-${mobile ? '390' : 'desktop'}`, true)
    await choose(page, '想一想以前学过的观察方法')
    await page.waitForFunction(hint => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.statInteractions?.seenHints?.includes(hint), hint)
    const pending = await read(page)
    assert.equal(pending.skill, 8); assert.equal(pending.dlc.ch2.observations, undefined)
    assert.equal(await page.locator('img[alt="影像或证物"]').getAttribute('src'), image)
    await reveal(page, (await actualStep(page)).text)
    assert.equal(await page.locator('[data-stat-notice]').count(), 0)
    for (const region of observation.regions ?? []) assert.equal(await page.getByLabel(region.label, { exact: true }).count(), 0)
    await reloadStable(page, pending)
    assert.equal(await page.locator('img[alt="影像或证物"]').getAttribute('src'), image)
    await next(page)
    await page.waitForFunction(() => !JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.statInteractions?.pending)
    await reveal(page, observation.prompt)
    const correct = observation.choices.find(row => row.correct)
    await choose(page, correct.text)
    await page.waitForFunction(id => !!JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.observations?.[id], observation.id)
    const answered = await read(page)
    assert.equal(answered.skill, 9)
    assert.equal(answered.dlc.ch2.observations[observation.id].choiceId, correct.id)
    await notice(page, '医术＋1')
    const feedbackLayout = await layout(page, `${hint}-reward-${mobile ? '390' : 'desktop'}`, true)
    assert.deepEqual(frozen(answered), frozen(initial))
    await reloadStable(page, answered)
    results.push({ case: `method-${hint}`, mobile, skill: answered.skill, beforeLayout, feedbackLayout })
    await context.close()

    const low = await open(base(id, { skill: 7 }), mobile)
    await reveal(low.page, observation.prompt); await low.page.locator('.choice-in').waitFor()
    assert.equal(await low.page.getByRole('button', { name: '想一想以前学过的观察方法', exact: true }).count(), 0)
    await choose(low.page, observation.choices.find(row => row.hint).text)
    await low.page.waitForFunction(id => !!JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.observations?.[id], observation.id)
    assert.equal((await read(low.page)).skill, 7, 'Ordinary help stays safe below the threshold')
    assert.equal((await read(low.page)).dlc.ch2.statInteractions, undefined)
    results.push({ case: `method-${hint}-below-threshold`, skill: 7, helpAvailable: true })
    await low.context.close()
  }

  // Earn a real debit through the actual preceding dialogue, not a seeded receipt.
  {
    const { page, context } = await open(base('c2n1_e1'))
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).ap === 2)
    await next(page, 'c2n1_e2')
    await reveal(page, (await actualStep(page)).text)
    await choose(page, '先把备用线材按标签理好，一趟拿齐')
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.statInteractions?.supplyOrganized)
    const refunded = await read(page)
    assert.equal(refunded.ap, 3)
    assert.equal(refunded.dlc.ch2.loop.entries.find(row => row.id === 'ch2-c2n1_e1').delta.ap, -1)
    await notice(page, '行动力＋1')
    await reloadStable(page, refunded)
    await next(page)
    await reveal(page, (await actualStep(page)).text)
    assert.equal(await page.getByRole('button', { name: '先把备用线材按标签理好，一趟拿齐', exact: true }).count(), 0)
    await next(page, 'c2n1_e3')
    assert.equal((await read(page)).ap, 3)
    results.push({ case: 'supplies-real-debit-refund', ap: 3 })
    await context.close()
  }
  {
    const { page, context } = await open(base('c2n3_chat_q', { progress: { pendingCoffee: true } }), true)
    await reveal(page, (await actualStep(page)).text)
    await choose(page, '接过小雷递来的咖啡，歇口气')
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.statInteractions?.colleagueCoffee)
    const accepted = await read(page)
    assert.equal(accepted.ap, 4); assert.equal(accepted.dlc.ch2.pendingCoffee, true)
    await notice(page, '行动力＋1')
    await layout(page, 'coffee-reward-390')
    await reloadStable(page, accepted)
    await next(page)
    await reveal(page, (await actualStep(page)).text)
    await page.locator('.choice-in').waitFor()
    assert.equal(await page.getByRole('button', { name: '接过小雷递来的咖啡，歇口气', exact: true }).count(), 0)
    await choose(page, '「行，你忙。」')
    await page.locator('[data-ch2-step="c2n3_chat_end"]').waitFor()
    await next(page, 'c2n3_hub')
    await page.waitForFunction(() => !JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.pendingCoffee)
    const hub = await read(page)
    assert.equal(hub.ap, 5, 'Colleague coffee and bought coffee each give their own single AP')
    assert.equal(hub.dlc.ch2.loop.entries.filter(row => row.id === 'stat:coffee').length, 1)
    assert.equal(hub.dlc.ch2.loop.entries.filter(row => row.id === 'coffee:c2n3:c2n3_hub').length, 1)
    await reloadStable(page, hub)
    results.push({ case: 'coffee-independent-of-supplies', ap: 5, colleague: 1, purchased: 1 })
    await context.close()
  }

  const rewardCases = [
    ['chair', 'c2n1_gap_chair_q', '用元件盒里的螺丝刀看看', 'c2n1_gap_chair_fix', {}, false],
    ['equipment-notes', 'c2n5_e2', '（顺着远程终端的网线，把走向摸了一遍）', 'c2n5_e3b', {}, false],
    ['teaching', 'c2am_payoff_q', '抽出一层，再按原位叠回去', 'c2am_payoff_layers', { c2_payoff_model: true }, false],
    ['teaching', 'c2am_payoff_q', '装上底座，慢慢摇给大家看', 'c2am_payoff_rotate', { c2_payoff_model: true, c2_payoff_base: true }, true],
  ]
  for (const [category, id, label, target, flags, mobile] of rewardCases) {
    const initial = base(id, { flags: { quiz_grade: 'S', ...flags } }), { page, context } = await open(initial, mobile)
    await reveal(page, (await actualStep(page)).text)
    await choose(page, label)
    await page.locator(`[data-ch2-step="${target}"]`).waitFor()
    await page.waitForFunction(category => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.statInteractions?.wealthRewards?.includes(category), category)
    const gained = await read(page)
    assert.equal(gained.wealth, initial.wealth + 1)
    assert.equal(gained.dlc.ch2.loop.entries.filter(row => row.id === `stat:wealth:${category}`).length, 1)
    assert.deepEqual(frozen(gained), frozen(initial))
    await notice(page, '家业＋1')
    if (category === 'equipment-notes') {
      assert.equal(gained.skill, initial.skill + 1, 'Original choice skill gain is still real')
      const notices = await page.locator('[data-stat-notice]').allTextContents()
      assert.equal(notices.length, 1, 'The same choice and its immediate entry form one display notice')
      assert(notices[0].includes('医术＋1') && notices[0].includes('家业＋1'))
      const observed = await page.evaluate(() => window.__statNotices)
      assert.equal(observed.length, 1, 'Merging keeps one stable notice ID')
      assert(observed[0].text.includes('医术＋1') && observed[0].text.includes('家业＋1'))
    }
    await layout(page, `${target}-reward-${mobile ? '390' : 'desktop'}`, category === 'teaching')
    await reloadStable(page, gained)
    results.push({ case: `wealth-${target}`, wealth: gained.wealth, mobile })
    await context.close()
  }
  for (const [id, patch, target, label] of [
    ['c2n1_gap_chair_q', { items: [] }, 'c2n1_gap_chair_check', '把椅子翻过来看看'],
    ['c2am_payoff_q', { flags: { c2_payoff_model: true, c2_payoff_base: true, c2_payoff_model_used: true },
      progress: { statInteractions: { wealthRewards: ['teaching'] } } }, 'c2am_payoff_rotate', '装上底座，慢慢摇给大家看'],
  ]) {
    const initial = base(id, patch), { page, context } = await open(initial)
    await reveal(page, (await actualStep(page)).text); await choose(page, label)
    await page.locator(`[data-ch2-step="${target}"]`).waitFor()
    await reveal(page, (await actualStep(page)).text)
    assert.equal((await read(page)).wealth, initial.wealth)
    assert.equal(await page.locator('[data-stat-notice]').count(), 0)
    results.push({ case: id === 'c2n1_gap_chair_q' ? 'no-tool-no-wealth' : 'both-model-branches-only-one-reward' })
    await context.close()
  }
  for (const id of ['c2n1_gap_chair_fix', 'c2n5_e3b', 'c2am_payoff_layers']) {
    const initial = base(id, { flags: { c2_chair_fixed: true, c2n5_e: true, c2_payoff_model: true, c2_payoff_model_used: true },
      progress: { appliedSteps: undefined } })
    const { page, context } = await open(initial)
    await reveal(page, (await actualStep(page)).text)
    assert.equal((await read(page)).wealth, initial.wealth)
    assert.equal((await read(page)).dlc.ch2.statInteractions, undefined)
    assert.equal(await page.locator('[data-stat-notice]').count(), 0)
    results.push({ case: `legacy-no-backfill-${id}` })
    await context.close()
  }
  for (const mobile of [false, true]) {
    const initial = base('c2n1_hub'), { page, context } = await open(initial, mobile)
    await reveal(page, (await actualStep(page)).text)
    await choose(page, '小卖部')
    const shop = page.getByRole('dialog', { name: '第二章小卖部', exact: true })
    const coffee = SHOP_ITEMS.find(item => item.id === 'coffee')
    for (let purchase = 1; purchase <= 4; purchase++) {
      await shop.getByRole('button', { name: `购买${coffee.name}`, exact: true }).click()
      await page.waitForFunction(count => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.shop?.buyCount === count, purchase)
      if (purchase < 4) await page.waitForTimeout(525) // the real shop cooldown is 500 ms
    }
    const bought = await read(page)
    assert.equal(bought.gold, initial.gold - 4 * coffee.price)
    assert.equal(bought.ap, initial.ap + 4)
    assert.equal(bought.buyCount, initial.buyCount, 'Chapter 1 purchase count is not reused')
    await page.waitForFunction(() => document.querySelectorAll('[data-stat-notice]').length === 3
      && [...document.querySelectorAll('[data-stat-notice]')].every(element => Number(getComputedStyle(element).opacity) >= .95))
    const emitted = await page.evaluate(() => window.__statNotices)
    assert.equal(emitted.length, 4)
    assert(emitted.every(row => row.text.includes(`金币－${coffee.price}`) && row.text.includes('行动力＋1')))
    await shop.getByRole('button', { name: '离开小卖部', exact: true }).click()
    await shop.waitFor({ state: 'detached' })
    const boxes = await layout(page, `three-notices-${mobile ? '390' : 'desktop'}`)
    assert.equal(boxes.notices.length, 3, 'The fourth actual purchase replaces the oldest, not a fourth row')
    for (const notice of boxes.notices) {
      assert(notice.x >= 0 && notice.x + notice.width <= boxes.width + 1, 'Stack does not overflow horizontally')
      assert(notice.y >= 0 && notice.y + notice.height < boxes.dialog.y, 'Stack never covers the dialogue/choices')
    }
    await reloadStable(page, bought)
    results.push({ case: 'three-real-purchase-notices', mobile, purchases: 4, maxVisible: 3, boxes })
    await context.close()
  }
  assert.deepEqual(errors, [])
  writeFileSync(join(output, 'results.json'), JSON.stringify({ baseURL, results, errors }, null, 2))
  console.log(`PASS detail-stats-browser: ${results.length} real Edge fixtures, desktop/390px, stat notices and refresh guards; ${output}`)
} catch (error) {
  if (activePage && !activePage.isClosed()) {
    await activePage.screenshot({ path: join(output, 'failure.png') }).catch(() => {})
    writeFileSync(join(output, 'failure-state.json'), JSON.stringify({ state: await read(activePage).catch(() => null),
      text: await activePage.locator('body').innerText().catch(() => ''), errors, message: String(error), results }, null, 2))
  }
  throw error
} finally { await browser.close() }
