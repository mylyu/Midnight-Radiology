// Isolated browser contexts only; verifies the chapter two collection denominators
// (15 badges / 17 cards) and the legacy-entry display.
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
const url = process.env.GAME_URL || 'http://127.0.0.1:8798/'
const errors = []
async function open({ badges = [], cards = [], shift = 'c2n1', stepId = 'c2n1_0' } = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  await context.addInitScript(({ badges, cards, shift, stepId }) => {
    localStorage.setItem('mr-ch2-unlock', '1')
    localStorage.setItem('midnight-radiology-save-v1', JSON.stringify({
      gender: 'm', night: 5, gold: 500, skill: 3, wealth: 3, heart: 3, durability: 70,
      badges, stamps: [], flags: {}, lastCheckin: '', streak: 0, finished: true,
      seed: 1234, items: [], ap: 3, buyCount: 0, cards, events: [],
      dlc: { ch2: { shift, stepId, viewBg: 'bg_ctcontrol' } },
    }))
  }, { badges, cards, shift, stepId })
  const page = await context.newPage()
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(url + '#/ch2')
  await page.locator('.dialog-box').waitFor()
  return { context, page }
}
try {
  {
    // Badge wall: counts only obtainable badges; owned legacy badge is listed separately, not in the grid.
    const { context, page } = await open({ badges: ['first_ct', 'checklist_zero'] })
    await page.getByRole('button', { name: '🏅 勋章', exact: true }).click()
    await page.getByText('已收集 1/15', { exact: false }).waitFor()
    await page.getByText('历史收藏（旧版停颁，不计入分母）：零遗漏', { exact: true }).waitFor()
    const grid = page.locator('.grid').nth(1)
    assert.equal(await grid.getByText('？？？').count(), 14, 'ch2 grid must exclude the 5 legacy badges')
    assert.equal(await grid.getByText('零遗漏').count(), 0)
    await context.close()
    console.log('PASS: badge wall shows 1/15; legacy badge listed as history only.')
  }
  {
    // Completion screen: active-only counts, no legacy note without legacy holdings.
    const { context, page } = await open({ badges: ['first_ct'], cards: ['ct_tube_heat'], shift: 'c2am', stepId: 'c2am_lowdose_teaser2' })
    await page.locator('.dialog-box > p').click()
    await page.getByRole('button', { name: '🏁 第二章 · 完 —— 结算' }).click()
    await page.getByText('📖 1/17 · 🏅 1/15', { exact: true }).waitFor()
    assert.equal(await page.getByText('历史收藏：', { exact: false }).count(), 0)
    await context.close()
    console.log('PASS: completion screen counts 1/17 and 1/15 without legacy note.')
  }
  {
    // Completion screen: legacy holdings stay out of the counts and trigger the policy note.
    const { context, page } = await open({ badges: ['phantom_friend', 'wrench_night'], cards: ['ring_artifact'], shift: 'c2am', stepId: 'c2am_lowdose_teaser2' })
    await page.locator('.dialog-box > p').click()
    await page.getByRole('button', { name: '🏁 第二章 · 完 —— 结算' }).click()
    await page.getByText('📖 0/17 · 🏅 0/15', { exact: true }).waitFor()
    await page.getByText('历史收藏：卡片 1 张、勋章 2 枚；旧版停颁条目不计入分母。', { exact: true }).waitFor()
    await context.close()
    console.log('PASS: completion screen excludes legacy entries and explains the policy.')
  }
  assert.deepEqual(errors, [])
} finally { await browser.close() }
