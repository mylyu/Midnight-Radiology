// Actual coffee purchases -> Kai's entry/card. No injected toasts, fake DOM or
// mutated clocks: the three concurrently visible changes all come from the UI.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { freshState } from '../src/game/store.ts'
import { SHOP_ITEMS } from '../src/game/data.ts'
import { CH2_SHIFTS } from '../src/game/ch2.ts'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const baseURL = process.env.GAME_URL || 'http://127.0.0.1:8798/'
const output = resolve(process.env.DETAIL_CARD_OUTPUT || '../../ch2-detail-polish-review/card-layout')
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const key = 'midnight-radiology-save-v1', results = [], errors = []
const read = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)
const overlaps = (a, b) => Math.max(a.x, b.x) < Math.min(a.x + a.width, b.x + b.width)
  && Math.max(a.y, b.y) < Math.min(a.y + a.height, b.y + b.height)

try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 } })
    const seed = { ...freshState('f'), seed: 260925, gold: 800, ap: 3,
      dlc: { ch2: { phase: 'story', shift: 'c2n1', stepId: 'c2n1_hub', appliedSteps: [], viewBg: 'bg_ctcontrol' } } }
    await context.addInitScript(({ key, seed }) => {
      localStorage.setItem('mr-ch2-unlock', '1')
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(seed))
      HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('Fixture audio denied', 'NotAllowedError'))
    }, { key, seed })
    const page = await context.newPage()
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(baseURL + '#/ch2', { waitUntil: 'domcontentloaded' })
    await page.locator('[data-ch2-step="c2n1_hub"]').waitFor()
    await page.locator('.dialog-box > p').click()
    await page.locator('.choice-in').getByRole('button', { name: '小卖部', exact: true }).click()
    const shop = page.getByRole('dialog', { name: '第二章小卖部', exact: true })
    const coffee = SHOP_ITEMS.find(item => item.id === 'coffee')
    const purchases = 2
    for (let purchase = 1; purchase <= purchases; purchase++) {
      await shop.getByRole('button', { name: `购买${coffee.name}`, exact: true }).click()
      await page.waitForFunction(count => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.shop?.buyCount === count, purchase)
      if (purchase < purchases) await page.waitForTimeout(525)
    }
    await shop.getByRole('button', { name: '离开小卖部', exact: true }).click()
    const visit = CH2_SHIFTS[0].steps.c2n1_hub.choices.find(choice => choice.next === 'c2n1_b1')
    await page.locator('.choice-in').getByRole('button', { name: visit.text, exact: true }).click()
    await page.locator('[data-ch2-step="c2n1_b1"]').waitFor()
    const toast = page.getByText('📖 知识卡片已收入夜班手册：', { exact: false })
    await toast.waitFor()
    await page.waitForFunction(() => document.querySelectorAll('[data-stat-notice]').length === 3
      && [...document.querySelectorAll('[data-stat-notice]')].every(element => Number(getComputedStyle(element).opacity) >= .95))
    const state = await read(page)
    const cardId = 'ct_tube_heat'
    assert.equal(state.gold, 800 - purchases * coffee.price)
    assert.equal(state.ap, 4)
    assert(state.cards.includes(cardId))
    assert.equal(state.dlc.ch2.loop.entries.filter(row => row.id.startsWith('buy:')).length, purchases)
    assert.equal(state.dlc.ch2.loop.entries.find(row => row.id === 'ch2-c2n1_b1').delta.ap, -1)
    const card = await toast.boundingBox()
    const notices = await page.locator('[data-stat-notice]').evaluateAll(elements => elements.map(element => {
      const r = element.getBoundingClientRect()
      return { x: r.x, y: r.y, width: r.width, height: r.height, text: element.textContent,
        pointerEvents: getComputedStyle(element).pointerEvents, opacity: Number(getComputedStyle(element).opacity) }
    }))
    assert(notices.every(row => row.pointerEvents === 'none'))
    const collisions = notices.filter(row => overlaps(row, card))
    await page.screenshot({ path: join(output, `kai-card-with-three-notices-${mobile ? '390' : 'desktop'}.png`) })
    results.push({ mobile, card, notices, collisions, gold: state.gold, ap: state.ap, cardId })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.locator(`[data-ch2-step="${state.dlc.ch2.stepId}"]`).waitFor()
    await page.waitForTimeout(150)
    assert.equal(await toast.count(), 0, 'Previously received card is not announced again after reload')
    assert.equal(await page.locator('[data-stat-notice]').count(), 0)
    assert.equal((await read(page)).ap, state.ap)
    await context.close()
  }
  writeFileSync(join(output, 'results.json'), JSON.stringify({ baseURL, results, errors }, null, 2))
  assert.deepEqual(errors, [])
  assert(results.every(row => row.collisions.length === 0), 'Knowledge card toast must not overlap any active stat notice')
  console.log(`PASS detail-card-layout-browser: real card + 3 actual notices, desktop/390px, nonblocking and reload guards; ${output}`)
} finally { await browser.close() }
