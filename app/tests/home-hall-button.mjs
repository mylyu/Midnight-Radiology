// Focused title navigation check; no story replay or author browser state.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { freshState } from '../src/game/store.ts'

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const url = process.env.GAME_URL || 'http://127.0.0.1:8798/'
const output = resolve(process.env.HOME_HALL_OUTPUT || '../../home-hall-review')
const key = 'midnight-radiology-save-v1'
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  for (const [name, viewport, saved] of [
    ['desktop-saved', { width: 1280, height: 900 }, true],
    ['mobile-new', { width: 390, height: 844 }, false],
    ['mobile-saved', { width: 390, height: 844 }, true],
  ]) {
    const context = await browser.newContext({ viewport })
    await context.addInitScript(({ key, save }) => {
      sessionStorage.setItem('mr-rotate-dismissed', '1')
      if (save) localStorage.setItem(key, JSON.stringify(save))
    }, { key, save: saved ? freshState('f') : null })
    const page = await context.newPage(), errors = []
    page.on('pageerror', e => errors.push(e.message))
    await page.goto(url)
    const hall = page.getByRole('button', { name: '🗂️ 内容大厅', exact: true })
    await hall.waitFor()
    const previous = page.getByRole('button', { name: saved ? '↺ 重新开始' : '▶ 开始游戏', exact: true })
    const badges = page.getByRole('button', { name: '🏅 勋章墙', exact: true })
    const [a, b, c] = await Promise.all([previous.boundingBox(), hall.boundingBox(), badges.boundingBox()])
    assert(a.y + a.height <= b.y && b.y + b.height <= c.y, 'Hall must be between restart/start and badges')
    assert(b.y >= 0 && b.y + b.height <= viewport.height, 'Hall button stays in viewport')
    await page.waitForFunction(() => [...document.querySelectorAll('img[data-scene-background]')].every(i => i.complete && i.naturalWidth > 0))
    const before = await page.evaluate(key => localStorage.getItem(key), key)
    await page.screenshot({ path: resolve(output, `${name}.png`) })
    await hall.click()
    await page.getByRole('heading', { name: '🗂️ 章节与番外', exact: true }).waitFor()
    assert.equal(new URL(page.url()).hash, '#/dlc')
    assert.equal(await page.evaluate(key => localStorage.getItem(key), key), before, 'Opening hall must not create/reset save')
    assert.equal(await page.locator('[data-chapter-loader]').count(), 0, 'Opening hall must not start a chapter')
    assert.deepEqual(errors, [])
    console.log(`PASS ${name}: button order, navigation, save unchanged`)
    await context.close()
  }
} finally { await browser.close() }
