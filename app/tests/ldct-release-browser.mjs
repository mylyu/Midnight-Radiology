// Release admission smoke test only; disposable context, no storyline replay.
// app/: node --import tsx tests/ldct-release-browser.mjs
// GAME_URL may be http://127.0.0.1:8798/ or https://mylyu.github.io/Midnight-Radiology/
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { freshState } from '../src/game/store.ts'

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const key = 'midnight-radiology-save-v1', unlockKey = 'mr-ldct-unlock'
const base = new URL(process.env.GAME_URL || 'http://127.0.0.1:8798/')
const hall = new URL(base); hall.hash = '/dlc'
const direct = new URL(base); direct.hash = '/dlc/ldct'
const output = resolve(process.env.LDCT_RELEASE_OUTPUT || '../../ldct-release-review')
mkdirSync(output, { recursive: true })
const initial = { ...freshState('m'), seed: 2258, gold: 640, skill: 9, heart: 8, wealth: 3,
  night: 4, buyCount: 7, playerName: '发布隔离测试', playerId: 'RELEASE-ONLY',
  cards: [], events: [], flags: { archive_film: true }, dlc: { ch2: { done: true }, dr: { done: true }, dsa: { dose: 57 } } }
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
await context.addInitScript(({ key, initial }) => {
  if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(initial))
  localStorage.setItem('mr-ch2-unlock', '1') // A different chapter's success cannot authorize LDCT.
  sessionStorage.setItem('mr-rotate-dismissed', '1')
}, { key, initial })
const page = await context.newPage(), errors = [], missing = [], privateRequests = []
page.setDefaultTimeout(15000)
page.on('pageerror', error => errors.push(error.message))
page.on('response', response => { if (response.status() >= 400) missing.push(`${response.status()} ${response.url()}`) })
const ldctMedia = /\/assets\/media\/ldct_[^/]+\.webp(?:\?|$)/
page.on('request', request => { if (ldctMedia.test(request.url())) privateRequests.push(request.url()) })
const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)
const unlocked = () => page.evaluate(key => localStorage.getItem(key), unlockKey)
const protectedState = state => { const result = structuredClone(state); delete result.dlc.ldct; return result }
const card = page.locator('[data-ldct-entry]')
let releaseHeldAsset = () => undefined
try {
  await page.goto(hall.href)
  await card.waitFor({ timeout: 60000 })
  assert(await card.getByLabel('低剂量CT访问码').isVisible())
  assert.doesNotMatch(await card.innerText(), /开场体验|三个短篇|候选版本/)
  assert.deepEqual(await saved(), initial)
  assert.equal(await unlocked(), null)
  console.log('PASS hall: existing main/ch2 save still needs its own LDCT code')

  await page.goto(direct.href)
  await card.getByLabel('低剂量CT访问码').waitFor({ timeout: 60000 })
  assert.equal(await page.locator('[data-ldct-selector], [data-ldct-screen]').count(), 0)
  await card.getByLabel('低剂量CT访问码').fill('ct2258')
  await card.getByRole('button', { name: '解锁体验', exact: true }).click()
  await card.getByRole('alert').waitFor()
  assert.equal(await unlocked(), null)
  assert.deepEqual(await saved(), initial, 'wrong code neither initializes LDCT nor rewrites main progress')
  assert.deepEqual(privateRequests, [], 'hall/direct/wrong code have not downloaded LDCT-only media')
  console.log('PASS direct link + wrong code: locked, save and LDCT media untouched')

  await card.getByLabel('低剂量CT访问码').fill('ldct2258')
  await card.getByRole('button', { name: '解锁体验', exact: true }).click()
  assert.equal(await unlocked(), '1')
  assert.deepEqual(await saved(), initial)
  const held = new Promise(resolve => { releaseHeldAsset = resolve })
  let holding = false
  await page.route(ldctMedia, async route => {
    if (!holding) { holding = true; await held }
    await route.continue()
  })
  await card.getByRole('button', { name: '去赴约', exact: true }).click()
  const loader = page.locator('[data-chapter-loader][data-chapter="ldct"]')
  await loader.waitFor()
  assert.doesNotMatch(await loader.innerText(), /三个短篇|候选版本/)
  await page.waitForFunction(() => document.querySelector('[data-chapter-loading="ldct"]')?.getAttribute('data-loading-status') === 'loading')
  assert.equal(await page.locator('[data-chapter-enter]').count(), 0, 'not admitted with one required file pending')
  assert.deepEqual(await saved(), initial, 'preload itself does not initialize the chapter or award anything')
  releaseHeldAsset()
  await page.locator('[data-chapter-enter]').waitFor({ timeout: 120000 })
  assert.equal(await loader.getAttribute('data-loading-status'), 'ready')
  assert.equal(await loader.getByRole('progressbar').getAttribute('aria-valuenow'), '100')
  assert(privateRequests.length > 0)
  await page.locator('[data-chapter-enter]').click()
  await page.locator('[data-ldct-selector]').waitFor()
  assert.deepEqual(protectedState(await saved()), initial)
  await page.locator('[data-ldct-story="father"]').click()
  await page.locator('[data-ldct-screen][data-ldct-node="lf_start"]').waitFor()
  const started = await saved()
  assert.equal(started.dlc.ldct.ldct.storyId, 'father')
  assert.equal(started.dlc.ldct.ldct.openingRevision, 5)
  assert.deepEqual(protectedState(started), initial)
  await page.screenshot({ path: resolve(output, `${base.hostname}-father-entry.png`) })
  console.log('PASS correct code: real complete preload → father selector → current opening')

  await page.reload()
  await page.locator('[data-chapter-enter], [data-ldct-screen]').first().waitFor({ timeout: 120000 })
  if (await page.locator('[data-chapter-enter]').isVisible()) await page.locator('[data-chapter-enter]').click()
  await page.locator('[data-ldct-screen][data-ldct-node="lf_start"]').waitFor()
  assert.equal(await unlocked(), '1')
  assert.equal(await page.getByLabel('低剂量CT访问码').count(), 0)
  assert.deepEqual(await saved(), started, 'refresh remembers authorized access and the same cursor without rewards')
  assert.deepEqual(errors, [])
  assert.deepEqual(missing, [])
  console.log(`PASS remembered unlock / refresh continuation / no missing requests: ${base.href}`)
} catch (error) {
  await page.screenshot({ path: resolve(output, `${base.hostname}-failure.png`) }).catch(() => undefined)
  throw error
} finally {
  releaseHeldAsset()
  await context.close(); await browser.close()
}
