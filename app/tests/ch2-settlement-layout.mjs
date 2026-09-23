import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { freshState, applyEffect } from '../src/game/store.ts'
import { beginCh2Shift, recordCh2Change } from '../src/game/ch2-ledger.ts'
import { settleCh2 } from '../src/game/ch2-session.ts'
const require = createRequire(import.meta.url), { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const out = process.env.LAYOUT_OUTPUT || '../../ch2-settlement-equipment-review'
mkdirSync(out, { recursive: true })
let s = beginCh2Shift({ ...freshState('m'), finished: true, gold: 380, skill: 8, heart: 5, wealth: 2,
  items: ['snack', 'milktea'], flags: { quiz_grade: 'A' }, dlc: { ch2: { shift: 'c2n1', stepId: 'c2n1_s4', phase: 'story' } } }, 'c2n1')
for (let i = 0; i < 20; i++) s = recordCh2Change(s, applyEffect(s, { gold: i % 2 ? -30 : 60 }), `layout:${i}`, `已记录的第 ${i + 1} 笔：病例交接、购买补给及同事闲聊`, i % 4 === 0 ? 'case' : 'story')
s = settleCh2(s, 'c2n1')
const errors = []
try {
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport })
    await context.addInitScript(save => {
      localStorage.setItem('mr-ch2-unlock', '1')
      localStorage.setItem('midnight-radiology-save-v1', JSON.stringify(save))
    }, s)
    const page = await context.newPage()
    page.on('pageerror', error => errors.push(error.message))
    await page.goto((process.env.GAME_URL || 'http://127.0.0.1:8798/') + '#/ch2')
    const panel = page.locator('[data-ch2-settlement]'), scroll = panel.locator('[data-ch2-settlement-scroll]'), nav = panel.getByRole('navigation', { name: '班后功能' })
    await panel.waitFor()
    const assertLayout = async () => {
      const bounds = await panel.evaluate(el => {
        const content = el.querySelector('[data-ch2-settlement-scroll]').getBoundingClientRect()
        const menu = el.querySelector('nav').getBoundingClientRect(), stage = el.getBoundingClientRect()
        return { contentBottom: content.bottom, menuTop: menu.top, menuBottom: menu.bottom, stageBottom: stage.bottom,
          buttons: [...el.querySelectorAll('nav button')].map(button => ({ bottom: button.getBoundingClientRect().bottom, top: button.getBoundingClientRect().top })),
          horizontalOverflow: document.documentElement.scrollWidth > innerWidth }
      })
      assert(bounds.contentBottom <= bounds.menuTop + 1, 'content scrolling cannot be covered by the bottom menu')
      assert(bounds.menuBottom <= bounds.stageBottom + 1, 'all actions remain inside game viewport')
      assert(bounds.buttons.every(button => button.bottom <= bounds.stageBottom + 1 && button.top >= bounds.menuTop - 1))
      assert(!bounds.horizontalOverflow)
      for (const button of await nav.getByRole('button').all()) assert(await button.isVisible())
    }
    assert.equal(await panel.locator('details, summary, ol').count(), 0, 'no visible transaction ledger or disclosure controls')
    assert.equal(await panel.getByText(/已记录的第 \d+ 笔/).count(), 0)
    assert.equal(await panel.locator('[data-ch2-equipment-overview]').count(), 1)
    assert.equal(await panel.locator('[data-equipment="cr"]').getAttribute('data-unlock'), 'complete')
    assert.equal(await panel.locator('[data-equipment="ct"]').getAttribute('data-unlock'), 'current')
    for (const id of ['us', 'mri']) assert.equal(await panel.locator(`[data-equipment="${id}"]`).getAttribute('data-unlock'), 'locked')
    for (const id of ['dr', 'dsa']) {
      assert.equal(await panel.locator(`[data-equipment="${id}"]`).getAttribute('data-unlock'), 'available')
      assert.match(await panel.locator(`[data-equipment="${id}"]`).innerText(), /已开放/)
    }
    assert.equal(await panel.locator('[data-ch2-stat="gold"]').getByText('680 金币', {exact:true}).count(), 1)
    assert.equal(await panel.locator('[data-ch2-stat="gold"]').getByText('本班 +300', {exact:true}).count(), 1)
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.loop.entries), s.dlc.ch2.loop.entries, 'hiding ledger must not delete saved records')
    await assertLayout()
    await page.screenshot({ path: `${out}/${viewport.width}-overview.png` })
    await scroll.evaluate(el => { el.scrollTop = el.scrollHeight })
    await assertLayout()
    await page.screenshot({ path: `${out}/${viewport.width}-overview-bottom.png` })
    await nav.getByRole('button', { name: '🛒 小卖部', exact: true }).click()
    await page.getByRole('dialog', { name: '第二章小卖部' }).waitFor()
    await page.getByRole('button', { name: '离开小卖部', exact: true }).click()
    assert.equal(await panel.getAttribute('data-ch2-complete'), 'false')
    await context.close()
  }
  assert.deepEqual(errors, [])
  console.log('PASS settlement equipment overview: desktop + 390px screenshots; no visible ledger but complete records preserved, factual chapter/DLC states, actual stats, always-visible actions, no overlap/overflow, shop closes without advancing.')
} finally { await browser.close() }
