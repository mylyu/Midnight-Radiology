// Isolated browser contexts only; verifies the chapter two collection denominators
// (12 badges / 18 cards after the QA round) and the legacy-entry display.
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
    await page.getByText('已收集 1/12', { exact: false }).waitFor()
    await page.getByText('历史收藏（旧版停颁，不计入分母）：零遗漏', { exact: true }).waitFor()
    const grid = page.locator('.grid').nth(1)
    assert.equal(await grid.getByText('？？？').count(), 11, 'ch2 grid must exclude the 3 legacy badges')
    assert.equal(await grid.getByText('零遗漏').count(), 0)
    await context.close()
    console.log('PASS: badge wall shows 1/12; legacy badge listed as history only.')
  }
  {
    // Completion screen: active-only counts, no legacy note without legacy holdings.
    const { context, page } = await open({ badges: ['first_ct'], cards: ['ct_tube_heat'], shift: 'c2am', stepId: 'c2am_9' })
    await page.locator('.dialog-box > p').click()
    await page.getByRole('button', { name: '🏁 第二章 · 完 —— 结算' }).click()
    await page.getByText('本章收集：📖 知识卡片 1/18 · 🏅 勋章 1/12', { exact: false }).waitFor()
    assert.equal(await page.getByText('旧版停颁内容').count(), 0)
    await context.close()
    console.log('PASS: completion screen counts 1/18 and 1/12 without legacy note.')
  }
  {
    // Completion screen: legacy holdings stay out of the counts and trigger the policy note.
    const { context, page } = await open({ badges: ['checklist_zero'], cards: ['contrast_agent'], shift: 'c2am', stepId: 'c2am_9' })
    await page.locator('.dialog-box > p').click()
    await page.getByRole('button', { name: '🏁 第二章 · 完 —— 结算' }).click()
    await page.getByText('本章收集：📖 知识卡片 0/18 · 🏅 勋章 0/12', { exact: false }).waitFor()
    await page.getByText('旧版停颁内容不计入统计；你已保留的旧版卡片 1 张、徽章 1 枚仍在夜班手册与勋章墙中。', { exact: true }).waitFor()
    await context.close()
    console.log('PASS: completion screen excludes legacy entries and explains the policy.')
  }
  assert.deepEqual(errors, [])
} finally { await browser.close() }
