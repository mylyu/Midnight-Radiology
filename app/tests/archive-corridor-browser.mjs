// Targeted real UI paths, isolated saves; not a full-chapter playthrough or a listening test.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { freshState } from '../src/game/store.ts'
import { awaitChapterEntry } from './chapter-entry-driver.mjs'
import { resolveMediaIdentities } from './media-identity-driver.mjs'
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const base = process.env.GAME_URL || 'http://127.0.0.1:8798/'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const errors = [], failures = []
const key = 'midnight-radiology-save-v1'
const read = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)
const at = (page, id, chapter = 1) => page.locator(`[data-ch${chapter}-step="${id}"]`).waitFor()
async function open(chapter, flags, ap = 0) {
  const s = { ...freshState('m'), night: chapter === 1 ? 3 : 5, finished: chapter === 2,
    stepId: chapter === 1 ? 'n3_hub' : 'n5_end', screenHint: chapter === 1 ? 'night' : 'chapterEnd',
    resumeKey: '3-n3_hub', gold: 800, skill: 4, ap, items: ['key'], cards: [], events: [], flags,
    lastCheckin: new Date().toISOString().slice(0, 10),
    ...(chapter === 2 ? { dlc: { ch2: { shift: 'c2n1', phase: 'story', stepId: 'c2n1_hub',
      viewBg: 'bg_ctcontrol', appliedSteps: ['ch2-c2n1_hub'] } } } : {}) }
  const context = await browser.newContext({ viewport: { width: 390, height: 720 }, isMobile: true, hasTouch: true })
  await context.addInitScript(({ s, key }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(s))
    localStorage.setItem('mr-ch2-unlock', '1'); sessionStorage.setItem('mr-rotate-dismissed', '1')
    window.__voices = []
    HTMLMediaElement.prototype.play = function () { window.__voices.push(this.src); return Promise.resolve() }
  }, { s, key })
  const page = await context.newPage()
  page.setDefaultTimeout(12000)
  page.on('pageerror', e => errors.push(e.message))
  page.on('response', r => { if (r.status() >= 400) failures.push([r.status(), r.url()]) })
  await page.goto(base + (chapter === 2 ? '#/ch2' : ''))
  await resume(page, chapter)
  return { page, context }
}
async function resume(page, chapter) {
  if (chapter === 1) await page.getByRole('button', { name: '▶ 继续夜班（自动存档）', exact: true }).click()
  await awaitChapterEntry(page)
  if (chapter === 1) await page.getByRole('button', { name: /^(出发，上夜班|回到夜班现场) →$/ }).click()
}
async function choose(page, text, id, chapter = 1) {
  const button = page.getByRole('button', { name: text })
  await button.waitFor(); await page.waitForTimeout(350); await button.click(); await at(page, id, chapter)
}
async function next(page, id, chapter = 1) {
  await page.locator('.dialog-box > span.animate-bounce').waitFor()
  await page.waitForTimeout(350); await page.locator('.dialog-box > p').click(); await at(page, id, chapter)
}
try {
  // An already-entered archive with no AP was the locked-out state. Leave and
  // restore it, discover film first, then return for the cabinet without paying again.
  const { page, context } = await open(1, { n3_arc: true })
  await choose(page, /返回旧片库/, 'n3_arc0'); await next(page, 'n3_arc1')
  await choose(page, /算了，不属于/, 'n3_hub')
  await page.reload(); await resume(page, 1)
  await choose(page, /返回旧片库/, 'n3_arc0'); await next(page, 'n3_arc1')
  await choose(page, /翻看架子/, 'n3_arc2')
  for (const id of ['n3_arc3', 'n3_arc4', 'n3_hub']) await next(page, id)
  assert.equal((await read(page)).flags.archive_film, true)
  await choose(page, /返回旧片库/, 'n3_arc0'); await next(page, 'n3_arc1')
  await choose(page, /黄铜钥匙开角落/, 'n3_cab0')
  for (const id of ['n3_cab1', 'n3_cab2', 'n3_arc1']) await next(page, id)
  const awarded = await read(page)
  assert.equal(awarded.gold, 880); assert.equal(awarded.skill, 5); assert.equal(awarded.ap, 0)
  assert(awarded.cards.includes('intensify_screen'))
  await choose(page, /算了，不属于/, 'n3_hub')
  await page.locator('[data-dialogue-choice]').first().waitFor()
  assert.equal(await page.getByRole('button', { name: /旧片库/ }).count(), 0)
  await page.reload(); await resume(page, 1); await at(page, 'n3_hub')
  assert.equal((await read(page)).gold, 880)
  console.log('PASS archive early exit + reload + film-first + cabinet + completed hiding; zero AP/no duplicate rewards')
  await context.close()
  for (const bought of [false, true]) {
    const { page, context } = await open(2, bought ? { bai_tube: true } : {}, 3)
    const prefix = bought ? 'c2n1_ab' : 'c2n1_an'
    await choose(page, /看看角落里的老伙计/, prefix + '1', 2)
    const image = page.locator('[data-scene-background="bg_corridor_cr_covered"]')
    await image.waitFor(); await image.evaluate(img => img.decode())
    await next(page, prefix + '2', 2)
    const voices = await resolveMediaIdentities(page, await page.evaluate(() => window.__voices))
    assert(voices.some(v => v.paths.includes(`audio/vox_ch2_natural_fan_${bought ? 'a' : 'b'}.mp3`)))
    assert(!voices.some(v => v.paths.includes(`audio/vox_ch2_natural_fan_${bought ? 'b' : 'a'}.mp3`)))
    console.log(`PASS corridor bought=${bought}: covered CR + matching unchanged branch voice, AP=${(await read(page)).ap}`)
    await context.close()
  }
  assert.deepEqual(errors, []); assert.deepEqual(failures, [])
} finally { await browser.close() }
