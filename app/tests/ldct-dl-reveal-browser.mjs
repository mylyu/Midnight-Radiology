// Only the replaced phantom CG and new reveal, in isolated storage.
// node --import tsx tests/ldct-dl-reveal-browser.mjs
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { freshState } from '../src/game/store.ts'
import { selectLdctStory, getLdctProgress } from '../src/game/ldct-session.ts'
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const key = 'midnight-radiology-save-v1', url = (process.env.GAME_URL || 'http://127.0.0.1:8798/') + '#/dlc/ldct'
const output = resolve('../../ldct-dl-reveal-assets/browser')
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 850 } })
await ctx.addInitScript(() => { localStorage.setItem('mr-ldct-unlock', '1'); sessionStorage.setItem('mr-rotate-dismissed', '1'); HTMLMediaElement.prototype.play = () => Promise.resolve() })
const page = await ctx.newPage(), errors = []
page.on('pageerror', e => errors.push(e.message))
page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`) })
page.setDefaultTimeout(6000)
async function enter() {
  await page.locator('[data-chapter-enter], [data-ldct-screen]').first().waitFor({ timeout: 30000 })
  if (await page.locator('[data-chapter-enter]').isVisible()) await page.locator('[data-chapter-enter]').click()
  await page.locator('[data-ldct-screen]').waitFor()
}
async function load(nodeId) {
  const s = selectLdctStory(freshState('m'), 'father'), p = { ...getLdctProgress(s), nodeId }
  s.dlc.ldct.ldct = p; s.dlc.ldct.ldctStories.slots.father = p
  await page.evaluate(({ key, s }) => localStorage.setItem(key, JSON.stringify(s)), { key, s })
  await page.reload(); await enter()
}
try {
  await page.goto(url)
  await load('lf_trial_license_0')
  await page.locator('[data-ldct-cinematic="locked-phantom"] img').waitFor()
  await page.screenshot({ path: resolve(output, 'phantom-lock-desktop.png') })
  await page.setViewportSize({ width: 390, height: 780 })
  await page.screenshot({ path: resolve(output, 'phantom-lock-390.png') })
  await load('lf_dl_3')
  assert.equal(await page.locator('[data-ldct-case-preview]').count(), 0)
  await page.waitForFunction(() => document.querySelector('[data-ldct-dialogue]')?.textContent.includes('进度条走到头。'))
  await ctx.setOffline(true)
  await page.locator('[data-ldct-dialogue]').click()
  await page.locator('[data-ldct-node="lf_dl_4"]').waitFor()
  const result = page.locator('[data-ldct-case-preview="deep-learning"]')
  assert.equal(await result.count(), 1)
  assert.equal(await page.locator('[data-ldct-cinematic]').count(), 0)
  const image = result.locator('[role="img"]')
  await image.evaluate(async el => { const src = getComputedStyle(el).backgroundImage.slice(5, -2); const img = new Image(); img.src = src; await img.decode(); if (img.naturalWidth !== 640) throw new Error('Wrong DL result asset') })
  await page.waitForFunction(() => document.querySelector('[data-ldct-dialogue]')?.textContent.includes('换数据吧？'))
  for (const [width, height] of [[390,780],[844,390],[1280,850]]) {
    await page.setViewportSize({ width, height })
    const box = await result.boundingBox()
    assert(box && box.width > 80 && box.height > 80 && box.x >= 0 && box.y >= 0 && box.x + box.width <= width + 1 && box.y + box.height <= height + 1)
    assert.doesNotMatch(await page.locator('[data-ldct-screen]').innerText(), /生成素材|教学示意|AI生成|免责声明/)
    await page.screenshot({ path: resolve(output, `dl-result-${width}.png`) })
  }
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)
  assert.equal(getLdctProgress(saved).nodeId, 'lf_dl_4', 'resizing and waiting never auto-advance')
  assert.deepEqual(errors, [])
  console.log(`PASS phantom CG and staged DL reveal offline; desktop/390/844, no auto-advance or added material notes. Screenshots: ${output}`)
} catch(e) { await page.screenshot({ path: resolve(output, 'failure.png') }).catch(() => undefined); throw e }
finally { await ctx.close(); await browser.close() }
