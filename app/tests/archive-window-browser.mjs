import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { freshState } from '../src/game/store.ts'
import { awaitChapterEntry } from './chapter-entry-driver.mjs'
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const base = process.env.GAME_URL || 'http://127.0.0.1:8798/'
const key = 'midnight-radiology-save-v1'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 700 }, isMobile: true, hasTouch: true })
await context.addInitScript(() => {
  sessionStorage.setItem('mr-rotate-dismissed', '1')
  HTMLMediaElement.prototype.play = function () { return Promise.resolve() }
})
const page = await context.newPage()
page.setDefaultTimeout(12000)
const errors = []
page.on('pageerror', e => errors.push(e.message))
const snapshot = () => page.evaluate(k => JSON.parse(localStorage.getItem(k)), key)
async function boot(state) {
  await page.goto(base)
  if (state) await page.evaluate(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key, state })
  await page.reload()
  await page.getByText('教学试玩版 v0.7', { exact: false }).waitFor()
  await page.getByRole('button', { name: '▶ 继续夜班（自动存档）', exact: true }).click()
  await awaitChapterEntry(page)
  await page.getByRole('button', { name: /^(出发，上夜班|回到夜班现场) →$/ }).click()
}
const fixture = (night, flags = {}, ap = 1, items = []) => ({ ...freshState('m'), night,
  stepId: `n${night}_hub`, resumeKey: `${night}-n${night}_hub`, screenHint: 'night', flags, ap, items, gold: 800,
  lastCheckin: new Date().toISOString().slice(0, 10) })
const at = id => page.locator(`[data-ch1-step="${id}"]`).waitFor()
async function choose(name, target) {
  const button = page.getByRole('button', { name, exact: false })
  await button.waitFor(); await page.waitForTimeout(350)
  await button.tap(); await at(target)
}
async function next(target) {
  await page.locator('.dialog-box > span.animate-bounce').waitFor()
  await page.waitForTimeout(350)
  await page.locator('.dialog-box p').tap(); await at(target)
}
try {
  if (!process.env.ARCHIVE_LAYOUT_ONLY) {
  await boot(fixture(2, {}, 0))
  const locked = page.getByRole('button', { name: /旧片库 · 需1点/ })
  await locked.waitFor(); assert(await locked.isDisabled())
  await choose(/小卖部/, 'n2_hub')
  await page.getByRole('heading', { name: /住院部小卖部/ }).waitFor()
  await page.getByText('速溶咖啡', { exact: true }).locator('../..').getByRole('button').tap()
  await page.getByRole('button', { name: '离开小卖部', exact: true }).tap()
  await choose(/去旧片库看看/, 'n2_arc0')
  assert.equal((await snapshot()).ap, 0)
  await next('n2_arc1')
  await choose('翻看架子上的旧片袋', 'n2_arc2')
  await next('n2_arc3'); await next('n2_arc4'); await next('n2_hub')
  const filmSave = await snapshot()
  assert(filmSave.flags.archive_film)
  await boot({ ...filmSave, night: 4, stepId: 'n4_hub', resumeKey: '4-n4_hub', items: ['key'],
    flags: { ...filmSave.flags, n4_lei: true } })
  await choose(/返回旧片库/, 'n4_arc0')
  await next('n4_arc1'); await choose(/黄铜钥匙/, 'n4_cab0')
  await next('n4_cab1')
  const gold = (await snapshot()).gold
  await boot() // Actual saved reward node: no second 80 gold.
  await at('n4_cab1'); assert.equal((await snapshot()).gold, gold)
  await next('n4_cab2'); await next('n4_arc1')
  assert((await snapshot()).cards.includes('intensify_screen'))
  await choose('算了，不属于自己的地方少待', 'n4_hub')
  await choose(/回信息科，请小雷查无名胶片/, 'n4_lei2a')
  assert((await snapshot()).flags.pacs_log)
  await next('n4_lei3a'); await next('n4_lei4'); await next('n4_hub')
  await page.getByRole('button', { name: /小卖部/ }).waitFor()
  assert.equal(await page.getByRole('button', { name: /旧片库|查无名胶片/ }).count(), 0)
  await boot(fixture(3, { n3_arc: true }, 0))
  await choose(/返回旧片库/, 'n3_arc0')
  assert.equal((await snapshot()).ap, 0)
  }
  // All options, including the new lower entries and work, stay reachable on a phone.
  await boot(fixture(4))
  const archive = page.getByRole('button', { name: /去旧片库看看/ })
  await archive.waitFor(); await archive.scrollIntoViewIfNeeded()
  const stage = await page.locator('[data-ch1-step]').boundingBox()
  assert.equal(stage.x, 0, 'Focus must not scroll the whole stage sideways')
  assert.equal(stage.y, 0, 'Focus must not scroll the whole stage upwards')
  const rect = await archive.boundingBox()
  assert(rect.y >= 0 && rect.y + rect.height <= 700, `Phone archive entry out of view: ${JSON.stringify(rect)}`)
  await page.screenshot({ path: process.env.ARCHIVE_SCREENSHOT || 'C:/Users/lvmen/AppData/Local/Temp/archive-window-v07.png' })
  await choose(/去旧片库看看/, 'n4_arc0')
  await page.setViewportSize({ width: 1280, height: 800 })
  await boot(fixture(2))
  await choose(/去旧片库看看/, 'n2_arc0')
  assert.deepEqual(errors, [])
  console.log(process.env.ARCHIVE_LAYOUT_ONLY ? 'PASS phone/desktop menu, stage anchored after focus and v0.7' : 'PASS phone/desktop entry, zero-AP hint+coffee, film then later key, reward-node refresh, late PACS follow-up, legacy return and v0.7')
} finally { await browser.close() }
