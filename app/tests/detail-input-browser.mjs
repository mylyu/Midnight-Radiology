// Real Edge mouse events + wall-clock/rAF measurements in disposable contexts.
// Seeded fixtures are NOT claimed full playthroughs; no real player profile is used.
// Audio play() is explicitly denied in these input tests; no timer is accelerated.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { NIGHTS, SHOP_ITEMS } from '../src/game/data.ts'
import { CH2_SHIFTS } from '../src/game/ch2.ts'
import { applyEffect, freshState } from '../src/game/store.ts'
import { awaitChapterEntry } from './chapter-entry-driver.mjs'

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const url = (process.env.GAME_URL || 'http://127.0.0.1:8798/').replace(/\/$/, '') + '/'
const output = resolve(process.env.DETAIL_INPUT_OUTPUT || '../../ch2-detail-polish-review')
const key = 'midnight-radiology-save-v1'
const today = new Date().toISOString().slice(0, 10)
const results = [], errors = [], failedRequests = []
const filter = process.env.DETAIL_INPUT_FILTER ? new RegExp(process.env.DETAIL_INPUT_FILTER) : undefined
let activePage, activeContext
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const plain = text => text.replaceAll('**', '')
const money = s => ({ gold: s.gold, skill: s.skill, heart: s.heart, wealth: s.wealth, ap: s.ap, durability: s.durability })
const read = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)
const dialog = page => page.locator('.dialog-box > p')
const readCursor = (s, chapter) => chapter === 1 ? s.stepId : s.dlc.ch2.stepId
const stateAt = (page, id, chapter = 1) => page.locator(`[data-ch${chapter}-step="${id}"]`)
const frame = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
const base = (night = 1, stepId = 'n1_hub') => ({ ...freshState('m'), seed: 1234, lastCheckin: today,
  streak: 1, gold: 5000, skill: 3, heart: 3, wealth: 3, durability: 70, ap: 3,
  night, stamps: Array.from({ length: night - 1 }, (_, i) => i + 1), screenHint: 'night', stepId,
  resumeKey: `${night}-${stepId}`, viewBg: 'bg_control', cards: [], events: [],
  dlc: { dr: { done: true }, dsa: { done: true, dose: 37 } } })
const ch2 = (id, shift = 'c2n1') => ({ ...base(5, 'n5_end'), finished: true, screenHint: 'chapterEnd',
  flags: { quiz_grade: 'S' }, dlc: { dr: { done: true }, dsa: { done: true, dose: 37 }, ch2: {
    shift, stepId: id, phase: 'story', appliedSteps: [`ch2-${id}`], viewBg: 'bg_ctcontrol',
  } } })

async function resume(page) {
  await page.getByRole('button', { name: '▶ 继续夜班（自动存档）', exact: true }).click()
  await awaitChapterEntry(page)
  await page.getByRole('button', { name: /^(出发，上夜班|回到夜班现场) →$/ }).click()
}
async function open(save, { chapter = 1, roll = .8, viewport = { width: 1280, height: 900 }, timing } = {}) {
  const context = await browser.newContext({ viewport })
  activeContext = context
  await context.addInitScript(({ key, save, roll, timing }) => {
    window.__detailWrites = []
    window.__detailClicks = []
    const write = Storage.prototype.setItem
    Storage.prototype.setItem = function (name, value) {
      if (name === key) window.__detailWrites.push({ at: performance.now(), state: JSON.parse(value) })
      return write.call(this, name, value)
    }
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(save))
    localStorage.setItem('mr-ch2-unlock', '1')
    sessionStorage.setItem('mr-rotate-dismissed', '1')
    Math.random = () => roll
    HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('Input fixture audio denied', 'NotAllowedError'))
    document.addEventListener('click', e => {
      window.__detailClicks.push({ at: performance.now(), trusted: e.isTrusted,
        text: e.target?.textContent?.slice(0, 80), dialog: !!e.target?.closest?.('.dialog-box') })
    }, true)
    if (timing) {
      window.__detailTiming = { fullAt: null, choiceAt: null, fullText: timing.fullText }
      const watch = () => {
        const root = document.querySelector(`[data-ch${timing.chapter}-step="${timing.id}"]`)
        if (root) {
          const state = window.__detailTiming
          if (state.fullAt === null && root.querySelector('.dialog-box > p')?.textContent === timing.fullText) state.fullAt = performance.now()
          if (state.choiceAt === null && root.querySelector('.dialog-box button')) state.choiceAt = performance.now()
        }
        if (window.__detailTiming.choiceAt === null) requestAnimationFrame(watch)
      }
      requestAnimationFrame(watch)
    }
  }, { key, save, roll, timing })
  const page = await context.newPage()
  activePage = page
  page.setDefaultTimeout(10000)
  page.on('pageerror', error => errors.push(error.message))
  page.on('requestfailed', request => failedRequests.push({ url: request.url(), error: request.failure()?.errorText }))
  await page.goto(`${url}${chapter === 2 ? '#/ch2' : ''}`, { waitUntil: 'domcontentloaded' })
  if (chapter === 1) await resume(page)
  else await awaitChapterEntry(page)
  if (save.screenHint === 'day' && chapter === 1) await page.getByText('白天 · 科室经营', { exact: true }).waitFor()
  else await stateAt(page, readCursor(save, chapter), chapter).waitFor()
  return page
}
async function close() {
  if (activeContext) await activeContext.close()
  activeContext = undefined
  activePage = undefined
}
async function capture(page, name) {
  // Measurements are complete before capture; let the existing 250ms choice
  // fade finish so the evidence screenshot shows readable final controls.
  await page.waitForTimeout(300)
  await page.screenshot({ path: resolve(output, `${name}.png`) })
}
async function test(name, run) {
  if (filter && !filter.test(name)) return
  try {
    const evidence = await run()
    results.push({ name, status: 'PASS', fullPlaythrough: false, ...evidence })
    console.log(`PASS ${name}`)
  } catch (error) {
    if (activePage) await capture(activePage, `detail-input-FAIL-${results.length}`).catch(() => {})
    results.push({ name, status: 'FAIL', error: String(error.stack || error), fullPlaythrough: false })
    throw error
  } finally {
    await close()
    writeFileSync(resolve(output, filter ? 'detail-input-results-filtered.json' : 'detail-input-results.json'), JSON.stringify({ url, browser: 'Edge headless',
      fixture: 'Independent contexts; seeded states, not full playthroughs; audio play explicitly denied; real mouse events and unmodified clocks.',
      results, errors, failedRequests }, null, 2))
  }
}
async function reveal(page) {
  await dialog(page).click()
  await frame(page)
}
async function writes(page) { return page.evaluate(() => window.__detailWrites) }
async function resetWrites(page) { await page.evaluate(() => { window.__detailWrites = [] }) }
async function exactFull(page, text) {
  await page.waitForFunction(text => document.querySelector('.dialog-box > p')?.textContent === text, plain(text))
}

try {
  const risks = NIGHTS.flatMap(night => Object.entries(night.steps).flatMap(([id, step]) =>
    (step.choices ?? []).filter(choice => choice.risk).map(choice => ({ night: night.id, id, choice }))))
  assert.equal(risks.length, 7)
  for (const { night, id, choice } of risks) for (const roll of [.299999, .3]) {
    await test(`risk-${id}-${roll}`, async () => {
      assert.equal(choice.risk.chance, .3, 'All seven first-chapter probabilities remain exactly 30%')
      const save = base(night, id), page = await open(save, { roll })
      await reveal(page)
      await page.getByRole('button', { name: plain(choice.text), exact: true }).waitFor()
      const before = await read(page)
      await resetWrites(page)
      await page.getByRole('button', { name: plain(choice.text), exact: true }).click()
      const hit = roll < .3, target = hit ? choice.risk.next : choice.next
      await stateAt(page, target).waitFor()
      await page.waitForFunction(({ key, target, night }) => JSON.parse(localStorage.getItem(key)).resumeKey === `${night}-${target}`, { key, target, night })
      const saved = await read(page)
      const expected = applyEffect(applyEffect(applyEffect(before, choice.effect), hit ? choice.risk.effect : undefined), NIGHTS[night - 1].steps[target].effect)
      assert.deepEqual(money(saved), money(expected))
      assert.equal(saved.seed, 1234)
      const trace = await writes(page)
      assert(trace.length >= 1)
      for (const entry of trace) {
        if (entry.state.stepId === id) assert.deepEqual(money(entry.state), money(before), 'No saved reward with the previous cursor')
      }
      assert.equal(trace[0].state.stepId, target, 'First transaction write already has its target')
      assert.deepEqual(money(trace[0].state), money(applyEffect(applyEffect(before, choice.effect), hit ? choice.risk.effect : undefined)))
      await page.reload({ waitUntil: 'domcontentloaded' })
      await resume(page)
      await stateAt(page, target).waitFor()
      await frame(page)
      assert.deepEqual(await read(page), saved, 'Reload neither rolls again nor repeats either reward')
      if (id === 'n1_walk3' && hit) await capture(page, 'detail-risk-atomic-reload-desktop')
      return { roll, target, writes: trace.map(e => ({ at: e.at, cursor: e.state.stepId, ...money(e.state) })), refreshed: true }
    })
  }

  for (const [chapter, id, mobile] of [[1, 'n1_s16', false], [1, 'n1_s16', true], [2, 'c2n1_m2', false]]) {
    await test(`choices-${chapter}-${mobile ? '390' : 'desktop'}-900ms`, async () => {
      const fullText = plain(chapter === 1 ? NIGHTS[0].steps[id].text : CH2_SHIFTS[0].steps[id].text)
      const page = await open(chapter === 1 ? base(1, id) : ch2(id), { chapter,
        viewport: mobile ? { width: 390, height: 844 } : undefined, timing: { chapter, id, fullText } })
      assert((await dialog(page).textContent()).length < fullText.length, 'Fixture reaches the active typewriter before naturally finishing')
      await reveal(page)
      await exactFull(page, fullText)
      const afterReveal = await read(page)
      // Real rapid clicks only on the narration, never a programmatic button click.
      await dialog(page).dblclick({ delay: 35 })
      assert.equal(readCursor(await read(page), chapter), id)
      assert.equal(await page.locator('.dialog-box button').count(), 0, 'No early answer buttons')
      await page.waitForFunction(() => window.__detailTiming.choiceAt !== null)
      const timing = await page.evaluate(() => window.__detailTiming)
      const delay = timing.choiceAt - timing.fullAt
      assert(delay >= 850, `Actual full-text → choices delay ${delay}ms must be >=900ms minus 50ms sampling tolerance`)
      assert(delay < 2500, 'Choice unlock must not remain blocked after its deadline')
      assert.equal(readCursor(await read(page), chapter), id, 'Rapid narration taps never auto-select an answer')
      assert.deepEqual(money(await read(page)), money(afterReveal))
      const events = await page.evaluate(() => window.__detailClicks.filter(e => e.dialog))
      assert(events.length >= 3 && events.every(e => e.trusted), 'The probe used real browser click events')
      await capture(page, `detail-ch${chapter}-choice-900ms-${mobile ? '390' : 'desktop'}`)
      return { delayMs: delay, timing, clicks: events }
    })
  }

  for (const chapter of [1, 2]) await test(`ordinary-${chapter}-300ms`, async () => {
    const id = chapter === 1 ? 'n1_walk0' : 'c2n1_m0'
    const next = chapter === 1 ? 'n1_walk1' : 'c2n1_m1'
    const nextNext = chapter === 1 ? 'n1_walk2' : 'c2n1_m2'
    const sourceText = chapter === 1 ? NIGHTS[0].steps[id].text : CH2_SHIFTS[0].steps[id].text
    const page = await open(chapter === 1 ? base(1, id) : ch2(id), { chapter })
    await resetWrites(page)
    await reveal(page)
    await exactFull(page, sourceText)
    await dialog(page).dblclick({ delay: 35 })
    assert.equal(readCursor(await read(page), chapter), id, 'Reveal plus sub-300ms clicks must not immediately advance')
    await page.waitForTimeout(350)
    await dialog(page).click()
    await stateAt(page, next, chapter).waitFor()
    await dialog(page).dblclick({ delay: 35 })
    assert.equal(readCursor(await read(page), chapter), next, 'Entering a new line does not reset the shared 300ms deadline')
    await page.waitForTimeout(350)
    await dialog(page).dblclick({ delay: 35 })
    assert.equal(readCursor(await read(page), chapter), next, 'One accepted click reveals; the immediate second cannot navigate')
    await page.waitForTimeout(350)
    await dialog(page).click()
    await stateAt(page, nextNext, chapter).waitFor()
    const trace = await writes(page)
    const transitions = trace.filter((e, i, list) => i === 0 || readCursor(e.state, chapter) !== readCursor(list[i - 1].state, chapter))
    for (let i = 1; i < transitions.length; i++) assert(transitions[i].at - transitions[i - 1].at >= 250, 'Navigation respects the 300ms input gate')
    return { transitions: transitions.map(e => ({ at: e.at, cursor: readCursor(e.state, chapter) })) }
  })

  await test('Ch2-choice-storage-is-atomic', async () => {
    const id = 'c2n1_m2', page = await open(ch2(id), { chapter: 2 })
    await reveal(page)
    const choice = CH2_SHIFTS[0].steps[id].choices[0]
    await page.getByRole('button', { name: plain(choice.text), exact: true }).waitFor()
    const before = await read(page)
    await resetWrites(page)
    await page.getByRole('button', { name: plain(choice.text), exact: true }).click()
    await stateAt(page, choice.next, 2).waitFor()
    const saved = await read(page), trace = await writes(page)
    assert.equal(saved.skill, before.skill + 1)
    assert.equal(trace[0].state.dlc.ch2.stepId, choice.next)
    assert.equal(trace[0].state.skill, before.skill + 1)
    assert.equal(trace[0].state.dlc.ch2.loop.entries.filter(e => e.id === `choice:${id}`).length, 1)
    for (const entry of trace) if (entry.state.dlc.ch2.stepId === id) assert.deepEqual(money(entry.state), money(before))
    await page.reload({ waitUntil: 'domcontentloaded' })
    await awaitChapterEntry(page)
    await stateAt(page, choice.next, 2).waitFor()
    await frame(page)
    assert.deepEqual(await read(page), saved)
    return { writes: trace.map(e => ({ at: e.at, cursor: e.state.dlc.ch2.stepId, skill: e.state.skill })), refreshed: true }
  })

  await test('book-20-to-21-once', async () => {
    const page = await open({ ...base(), skill: 20 })
    await reveal(page)
    const book = page.getByRole('button', { name: /翻翻值班室那本旧书/ })
    await book.waitFor()
    await book.click()
    await page.getByRole('heading', { name: /翻烂的/ }).waitFor()
    assert.equal((await read(page)).skill, 21)
    assert.equal((await read(page)).flags.book_read_n1, true)
    await capture(page, 'detail-book-uncapped-once')
    await page.getByRole('button', { name: '合上书,回科室', exact: true }).click()
    await page.waitForTimeout(350)
    await book.click()
    assert.equal((await read(page)).skill, 21)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await resume(page)
    await stateAt(page, 'n1_hub').waitFor()
    await reveal(page)
    await book.waitFor()
    await book.click()
    assert.equal((await read(page)).skill, 21)
    return { initialSkill: 20, finalSkill: 21, reopened: true, refreshed: true }
  })

  for (const durability of [100, 95, 50]) await test(`maintenance-${durability}`, async () => {
    const save = { ...base(2, undefined), screenHint: 'day', stepId: undefined, resumeKey: undefined, durability }
    const page = await open(save), before = await read(page)
    const button = page.getByRole('button', { name: durability === 100 ? '状态已满，无需保养' : '保养（-50金币）', exact: true })
    if (durability === 100) {
      assert(await button.isDisabled())
      assert.deepEqual(await read(page), before)
    } else {
      await button.dblclick({ delay: 35 })
      const after = await read(page)
      assert.equal(after.durability, Math.min(100, durability + 25))
      assert.equal(after.gold, before.gold - 50)
      assert.equal(after.wealth, before.wealth + 1)
      if (durability === 95) {
        await page.getByText(/耐久\+5/).waitFor()
        assert(await page.getByRole('button', { name: '状态已满，无需保养', exact: true }).isDisabled())
      }
    }
    await capture(page, `detail-maintenance-${durability}`)
    return { before: money(before), after: money(await read(page)) }
  })

  await test('Ch1-inventory-disabled-and-coffee-double-click', async () => {
    const page = await open({ ...base(2), screenHint: 'day', items: ['toolbox', 'dosimeter', 'key'] })
    await page.getByRole('button', { name: '🛒 小卖部', exact: true }).click()
    const row = id => page.locator('div.rounded-lg.p-3').filter({ has: page.getByText(new RegExp(`^${SHOP_ITEMS.find(i => i.id === id).name}(?:已持有)?$`)) })
    for (const id of ['toolbox', 'dosimeter', 'key']) assert(await row(id).getByRole('button').isDisabled(), id)
    const before = await read(page)
    await row('coffee').getByRole('button').dblclick({ delay: 35 })
    const once = await read(page)
    assert.equal(once.gold, before.gold - 30)
    assert.equal(once.ap, before.ap + 1)
    assert.equal(once.buyCount, before.buyCount + 1)
    await page.waitForTimeout(550)
    await row('coffee').getByRole('button').click()
    assert.equal((await read(page)).gold, before.gold - 60)
    assert.equal((await read(page)).ap, before.ap + 2)
    assert.deepEqual((await read(page)).items, before.items)
    await capture(page, 'detail-ch1-shop-owned-and-coffee')
    return { before: money(before), afterDoubleClick: money(once), afterSeparateClick: money(await read(page)) }
  })

  await test('Ch2-coffee-double-click-and-later-purchase', async () => {
    const page = await open(ch2('c2n1_hub'), { chapter: 2 })
    await reveal(page)
    await page.getByRole('button', { name: '小卖部', exact: true }).waitFor()
    await page.getByRole('button', { name: '小卖部', exact: true }).click()
    const buy = page.getByRole('button', { name: '购买速溶咖啡', exact: true }), before = await read(page)
    await buy.dblclick({ delay: 35 })
    const once = await read(page)
    assert.equal(once.gold, before.gold - 30)
    assert.equal(once.ap, before.ap + 1)
    assert.equal(once.dlc.ch2.shop.buyCount, 1)
    await page.waitForTimeout(550)
    await buy.click()
    const twice = await read(page)
    assert.equal(twice.gold, before.gold - 60)
    assert.equal(twice.ap, before.ap + 2)
    assert.equal(twice.dlc.ch2.shop.buyCount, 2)
    assert.equal(twice.dlc.ch2.loop.entries.filter(e => /^buy:/.test(e.id)).length, 2)
    await capture(page, 'detail-ch2-shop-coffee')
    return { before: money(before), afterDoubleClick: money(once), afterSeparateClick: money(twice) }
  })
  assert.deepEqual(errors, [], 'No browser page errors')
  console.log(`PASS detail-input-browser: ${results.length} executed Edge scenarios. Seeded fixtures, not full playthroughs. Output: ${output}`)
} finally {
  await close()
  await browser.close()
}
