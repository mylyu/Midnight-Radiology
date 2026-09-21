// Chapter-one UI contract: preserve its original shop, lottery, quiz and old-save behavior.
// Isolated contexts only. These fixtures never modify the player's browser profile.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { QUIZ, SHOP_ITEMS } from '../src/game/data.ts'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, channel: 'msedge',
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
const url = process.env.GAME_URL || 'http://127.0.0.1:8798/'
const errors = []
const key = 'midnight-radiology-save-v1'
const today = new Date().toISOString().slice(0, 10)
const dlc = { dr: { stepId: 'dr_fixture', done: true, served: ['kept'] },
  dsa: { stepId: 'dsa_fixture', done: true, dose: 47 },
  ch2: { shift: 'c2n3', stepId: 'c2n3_hub', appliedSteps: ['kept'] } }
const base = { gender: 'm', night: 2, gold: 5000, skill: 3, heart: 3, wealth: 3,
  durability: 70, badges: [], stamps: [1], flags: { n1_kind: true, n5_qian: true, n5_fan: true },
  lastCheckin: today, streak: 1, finished: false, seed: 1234, items: [], ap: 0, buyCount: 0,
  cards: [], events: [], screenHint: 'day', dlc }
const read = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)
const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

async function open(save, viewport = { width: 1280, height: 900 }) {
  const context = await browser.newContext({ viewport })
  await context.addInitScript(({ key, save }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(save))
    // Only this isolated fixture: loss outcome tests the original lottery charge exactly.
    Math.random = () => 0.1
  }, { key, save })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(url)
  await resume(page)
  return { context, page }
}

async function resume(page) {
  await page.getByRole('button', { name: '▶ 继续夜班（自动存档）', exact: true }).click()
  await page.getByRole('button', { name: /^(出发，上夜班|回到夜班现场) →$/ }).click()
}
const row = (page, item) => page.locator('div.rounded-lg.p-3').filter({
  has: page.getByText(new RegExp(`^${escape(item.name)}(?:已持有)?$`)),
})
const buy = (page, item) => row(page, item).getByRole('button').click()

try {
  // Night-one gating is unchanged; second-chapter keys must not leak into the original shop.
  {
    const { context, page } = await open({ ...base, night: 1, stamps: [], screenHint: 'night',
      stepId: 'n1_hub', resumeKey: '1-n1_hub', ap: 3 })
    await page.getByRole('button', { name: /小卖部逛逛/ }).waitFor({ timeout: 20000 })
    await page.getByRole('button', { name: /小卖部逛逛/ }).click()
    assert.equal(await page.getByText('黄铜钥匙', { exact: true }).count(), 0)
    assert.equal(await page.getByText('速溶咖啡', { exact: true }).count(), 1)
    await context.close()
  }

  // Original eight product effects, including deliberate differences from the new Ch2 shop.
  for (const viewport of [{ width: 1280, height: 900 }, { width: 844, height: 390 }]) {
    const { context, page } = await open(base, viewport)
    await page.getByText('白天 · 科室经营', { exact: true }).waitFor()
    await page.getByRole('button', { name: '🛒 小卖部', exact: true }).click()
    for (const item of SHOP_ITEMS) {
      const before = await read(page)
      await buy(page, item)
      const after = await read(page)
      assert.equal(after.gold, before.gold - item.price, item.id + ' original price')
      assert.equal(after.buyCount, before.buyCount + 1, item.id + ' original shared purchase count')
      assert.equal(after.ap, before.ap + (item.id === 'coffee' ? 1 : 0))
      assert.equal(after.heart, before.heart + (item.id === 'milktea' ? 2 : 0))
      assert.equal(after.skill, before.skill + (item.id === 'book' ? 2 : 0))
      if (['snack', 'toolbox', 'dosimeter', 'key'].includes(item.id)) assert(after.items.includes(item.id))
      else assert(!after.items.includes(item.id), 'Do not retrofit Ch2 inventory behavior into Ch1: ' + item.id)
      assert.deepEqual(after.dlc, dlc)
      assert.deepEqual(after.flags, before.flags)
      assert.equal(after.night, 2)
    }
    assert((await read(page)).badges.includes('shopaholic'))
    // Preserve Ch1's existing duplicate durable behavior; fixing it here would violate the scope.
    const toolbox = SHOP_ITEMS.find(item => item.id === 'toolbox')
    const beforeDuplicate = await read(page)
    await buy(page, toolbox)
    assert.equal((await read(page)).gold, beforeDuplicate.gold - toolbox.price)
    assert.equal((await read(page)).items.filter(id => id === 'toolbox').length, 1)

    const lottery = SHOP_ITEMS.find(item => item.id === 'lottery')
    for (let i = 1; i < 5; i++) await buy(page, lottery)
    const capped = await read(page)
    assert.equal(capped.lotteryNight, 2)
    assert.equal(capped.lotteryCount, 5)
    assert(await row(page, lottery).getByRole('button', { name: '售罄', exact: true }).isDisabled())
    await page.getByRole('button', { name: '离开小卖部', exact: true }).click()
    await page.reload()
    await resume(page)
    await page.getByRole('button', { name: '🛒 小卖部', exact: true }).click()
    assert.deepEqual(await read(page), capped, 'Reload must neither reapply purchases nor reset lottery')
    assert(await row(page, lottery).getByRole('button', { name: '售罄', exact: true }).isDisabled())
    await context.close()
  }

  // First-chapter quiz is still five questions, independently graded and rewarded once.
  {
    const { context, page } = await open({ ...base, night: 5, stamps: [1, 2, 3, 4, 5],
      finished: true, screenHint: 'quiz', flags: { ...base.flags, quiz2_grade: 'C' } })
    for (let index = 0; index < 5; index++) {
      await page.getByText(`第 ${index + 1} / 5 题 · 当前得分 ${index}`, { exact: true }).waitFor()
      const question = await page.locator('h3').innerText()
      const source = QUIZ.find(item => item.q === question)
      assert(source, `Expected original Ch1 question: ${question}`)
      const answer = page.getByRole('button', { name: source.options[source.answer], exact: true })
      await answer.click()
      await answer.click() // Repeated click cannot score the same answer twice.
      await page.getByText(`第 ${index + 1} / 5 题 · 当前得分 ${index + 1}`, { exact: true }).waitFor()
      await page.getByRole('button', { name: index === 4 ? '查看成绩 →' : '下一题 →', exact: true }).click()
    }
    await page.getByText('S级 · 满分', { exact: true }).waitFor()
    const awarded = await read(page)
    assert.equal(awarded.gold, base.gold + 250)
    assert.equal(awarded.flags.quiz_grade, 'S')
    assert.equal(awarded.flags.quiz2_grade, 'C')
    assert.equal(awarded.badges.filter(id => id === 'quiz_master').length, 1)
    assert.deepEqual(awarded.dlc, dlc)
    await page.reload()
    await resume(page)
    await page.getByText('S级 · 满分', { exact: true }).waitFor()
    assert.deepEqual(await read(page), awarded, 'First-chapter completed exam reload must not award again')
    await context.close()
  }

  // Legacy first-chapter saves with no DLC/items/AP/cards fields still load through the original migration.
  {
    const legacy = { ...base }
    for (const name of ['dlc', 'items', 'ap', 'buyCount', 'cards', 'events']) delete legacy[name]
    const { context, page } = await open(legacy)
    await page.getByText('白天 · 科室经营', { exact: true }).waitFor()
    const loaded = await read(page)
    for (const name of ['items', 'cards', 'events']) assert.deepEqual(loaded[name], [])
    assert.deepEqual(loaded.dlc, {})
    assert.equal(loaded.ap, 0)
    assert.equal(loaded.buyCount, 0)
    assert.equal(loaded.gold, legacy.gold)
    assert.deepEqual(loaded.flags, legacy.flags)
    await context.close()
  }
  assert.deepEqual(errors, [])
  console.log('PASS Ch1: eight unchanged shop products, original duplicates/gating/5-ticket limit, reload, mobile landscape, five quiz questions, one reward, independent grades/DLC saves, legacy defaults.')
} finally {
  await browser.close()
}
