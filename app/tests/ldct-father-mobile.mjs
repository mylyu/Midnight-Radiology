// Targeted touch/layout fixture, not another story replay.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { freshState } from '../src/game/store.ts'
import { selectLdctStory } from '../src/game/ldct-session.ts'
import { createLdctLabState } from '../src/game/ldct-experiments.ts'

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
const page = await context.newPage()
const key = 'midnight-radiology-save-v1', output = resolve('../../ldct-father-review')
mkdirSync(output, { recursive: true })
const state = selectLdctStory(freshState('m'), 'father')
const progress = { ...state.dlc.ldct.ldct, nodeId: 'lf_lab_5', phase: 'lab', labRound: 5,
  labDraft: createLdctLabState(5, 'chest') }
state.dlc.ldct.ldct = progress
state.dlc.ldct.ldctStories.slots.father = progress
await context.addInitScript(({ state, key }) => {
  localStorage.setItem(key, JSON.stringify(state))
  localStorage.setItem('mr-ldct-unlock', '1')
  sessionStorage.setItem('mr-rotate-dismissed', '1')
}, { state, key })
try {
  await page.goto((process.env.GAME_URL || 'http://127.0.0.1:8798/') + '#/dlc/ldct')
  await page.locator('[data-chapter-enter]').click({ timeout: 60000 })
  const lab = page.locator('[data-testid="ldct-chest-iterate"]')
  await lab.getByRole('button', { name: '用原数据改第一轮 →' }).tap()
  await lab.getByRole('button', { name: '4轮', exact: true }).tap()
  await lab.getByRole('button', { name: '固定这一版' }).tap()
  await lab.getByRole('button', { name: '回看原FBP' }).tap()
  assert.equal(await lab.locator('[data-frame="fbp"]').count(), 1)
  for (const size of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(size)
    const button = page.getByRole('button', { name: '继续', exact: true })
    await button.scrollIntoViewIfNeeded()
    const rect = await button.boundingBox()
    assert(rect && rect.y >= 0 && rect.y + rect.height <= size.height + 1, 'scroll reaches continuation')
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
    await page.screenshot({ path: resolve(output, `chest-controls-${size.width}.png`) })
  }
  await page.waitForTimeout(950)
  await page.getByRole('button', { name: '继续', exact: true }).tap()
  await page.locator('[data-ldct-node="lf_after_iteration_0"]').waitFor()
  await page.getByRole('button', { name: '📖 手册', exact: true }).tap()
  await page.getByRole('dialog').waitFor()
  await page.getByRole('button', { name: '关闭 ×', exact: true }).tap()
  assert.equal(await page.getByRole('dialog').count(), 0)
  console.log('PASS touch 390px/landscape: iteration, pin, FBP, scrollable controls, story return and closable manual')
} finally { await browser.close() }
