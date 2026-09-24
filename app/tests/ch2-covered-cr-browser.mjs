import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { logicalImageUrl } from './game-delivery-media.mjs'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const url = process.env.GAME_URL || 'http://127.0.0.1:8798/'
const out = process.env.CR_OUTPUT || '../../ch2-covered-cr-review'
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const errors = []
async function open(stepId, mobile = false) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1600, height: 1000 } })
  await context.addInitScript(stepId => {
    HTMLMediaElement.prototype.play = () => Promise.resolve()
    localStorage.setItem('mr-ch2-unlock', '1')
    if (!localStorage.getItem('midnight-radiology-save-v1')) localStorage.setItem('midnight-radiology-save-v1', JSON.stringify({
      gender: 'm', night: 5, gold: 500, skill: 3, wealth: 3, heart: 3, durability: 70,
      badges: [], stamps: [], flags: {}, lastCheckin: '', streak: 0, finished: true,
      seed: 1234, items: [], ap: stepId === 'c2n1_hub' ? 3 : 2, buyCount: 0, cards: [], events: [],
      dlc: { ch2: { shift: 'c2n1', stepId, viewBg: 'bg_corridor' } },
    }))
  }, stepId)
  const page = await context.newPage()
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(url + '#/ch2')
  await page.locator(`[data-ch2-step="${stepId}"]`).waitFor()
  return { page, context }
}
async function background(page, name) {
  await page.waitForFunction(({ name, expected }) => {
    const image = document.querySelector(`img[data-scene-background="${name}"]`)
    return image?.complete && image.naturalWidth > 0 && image.src.startsWith('blob:') &&
      performance.getEntriesByName(expected).some(entry => entry.initiatorType === 'fetch')
  }, { name, expected: logicalImageUrl(name, url) })
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')))
  return saved
}
async function advance(page, next) {
  await page.locator('.dialog-box > span.animate-bounce').waitFor()
  await page.locator('.dialog-box > p').click()
  await page.locator(`[data-ch2-step="${next}"]`).waitFor()
}
try {
  for (const mobile of [false, true]) {
    const { page, context } = await open('c2n1_hub', mobile)
    await page.getByRole('button', { name: '看看角落里的老伙计（⚡-1）', exact: true }).click()
    await page.locator('[data-ch2-step="c2n1_an1"]').waitFor()
    const saved = await background(page, 'bg_corridor_cr_covered')
    assert.equal(saved.ap, 2)
    await page.locator('.dialog-box > span.animate-bounce').waitFor()
    assert.equal(await page.getByRole('button', { name: /显示全文|继续 →/ }).count(), 0)
    await page.screenshot({ path: out + (mobile ? '/mobile.png' : '/desktop.png'), fullPage: true })
    if (!mobile) {
      await page.reload()
      assert.equal((await background(page, 'bg_corridor_cr_covered')).ap, 2, 'Refresh must not spend AP again')
      for (const next of ['c2n1_an2', 'c2n1_an3', 'c2n1_an4', 'c2n1_old_ct']) {
        await advance(page, next)
        await background(page, 'bg_corridor_cr_covered')
      }
      await advance(page, 'c2n1_hub')
      const returned = await background(page, 'bg_ctcontrol_ready')
      assert.equal(returned.ap, 2)
      assert.equal(returned.flags.c2n1_a, true)
    }
    await context.close()
  }
  const resumed = await open('c2n1_an1')
  assert.equal((await background(resumed.page, 'bg_corridor_cr_covered')).ap, 2)
  await resumed.context.close()
  const { page, context } = await open('c2n1_ab1')
  await background(page, 'bg_corridor')
  assert.equal(await page.locator('img[data-scene-background="bg_corridor_cr_covered"]').count(), 0)
  await context.close()
  assert.deepEqual(errors, [])
  console.log('PASS: isolated Edge desktop/mobile canonical-image decode and screenshots; old-background save resumes at entrance; refresh AP-safe; five-node scene advances and returns; alternate branch unchanged.')
} finally { await browser.close() }
