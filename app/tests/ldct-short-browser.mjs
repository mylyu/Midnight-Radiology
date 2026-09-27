// One actual browser route per candidate. State permutations live in the pure test.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { freshState } from '../src/game/store.ts'
import { LDCT_STORIES } from '../src/game/ldct-short-stories.ts'
import { getLdctNode, getLdctChoices } from '../src/game/ldct.ts'
import { ldctGiftChoices } from '../src/game/ldct-session.ts'

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1366, height: 900 } })
const page = await context.newPage()
page.setDefaultTimeout(12000)
const key = 'midnight-radiology-save-v1', output = resolve('../../ldct-short-review')
mkdirSync(output, { recursive: true })
const initial = { ...freshState('m'), gold: 1200, skill: 12, heart: 9, wealth: 4,
  items: ['snack', 'milktea'], night: 4, ap: 2, buyCount: 9, flags: { quiz_grade: 'A', quiz2_grade: 'S' },
  dlc: { ch2: { done: true, certificate: { code: 'protected' } }, dr: { served: ['one'] }, dsa: { dose: 10 } } }
await context.addInitScript(({ key, initial }) => {
  if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(initial))
  localStorage.setItem('mr-ldct-unlock', '1'); sessionStorage.setItem('mr-rotate-dismissed', '1')
}, { key, initial })
const errors = [], missing = [], offlineRequests = []
page.on('pageerror', e => errors.push(e.message))
page.on('response', r => { if (r.status() >= 400) missing.push(r.url()) })
const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)
const progress = async () => (await saved()).dlc.ldct.ldct
let lastClick = 0, refreshed = false, gifted = false, guarded = false, bought = false
async function background(revealExpected) {
  const wait = lastClick + 330 - Date.now()
  if (wait > 0) await page.waitForTimeout(wait)
  if (revealExpected !== undefined && await page.locator('[data-ldct-dialogue] .dialog-box > p').textContent() === revealExpected) return
  await page.mouse.click(1310, 180); lastClick = Date.now()
}
async function reveal() {
  const state = await saved(), p = state.dlc.ldct.ldct
  const text = (p.reply?.text ?? getLdctNode(state).text).replaceAll('**', '')
  if (await page.locator('[data-ldct-dialogue] .dialog-box > p').textContent() !== text) await background(text)
  await page.waitForFunction(text => document.querySelector('[data-ldct-dialogue] .dialog-box > p')?.textContent === text, text)
}
async function readyChoices() {
  await page.locator('[data-ldct-dialogue][data-choice-ready="true"]').waitFor()
  await page.waitForTimeout(330)
}
async function enter() {
  await page.locator('[data-chapter-enter]').click({ timeout: 60000 })
  await page.locator('[data-ldct-screen], [data-ldct-selector]').waitFor()
}
async function lab(story, p) {
  const root = page.locator(`.ldct-lab[data-round="${p.labRound}"]`)
  await root.waitFor()
  assert.equal(await root.getAttribute('data-dataset'), story.dataset)
  assert.match(await root.locator('[data-frame]').first().evaluate(e => getComputedStyle(e).backgroundImage), /blob:/)
  if (story.id === 'dinner') assert(await root.getByTestId('ldct-concealed-truth').count(), 'do not reveal the wager object')
  if (story.id === 'patient') {
    // Direct help is a valid alternate route, not a hidden quiz or another form.
    await page.waitForTimeout(950)
    await root.getByRole('button', { name: '还没看明白，一起聊聊', exact: true }).click()
  } else {
    if (p.labRound === 1) await root.getByRole('button', { name: '90°', exact: true }).click()
    if (p.labRound === 2) await root.getByRole('button', { name: '把投影铺回来 →', exact: true }).click()
    if (p.labRound === 3) {
      await root.getByRole('button', { name: '不滤波', exact: true }).click()
      await page.screenshot({ path: resolve(output, `${story.id}-unfiltered-desktop.png`) })
      await root.getByRole('button', { name: '柔一些', exact: true }).click()
    }
    if (p.labRound === 4) await root.getByRole('button', { name: '把光子调少 →', exact: true }).click()
    if (p.labRound === 5) {
      await root.getByRole('button', { name: '算投影、比差别、改第一轮 →', exact: true }).click()
      await root.getByRole('button', { name: '再改到第2轮 →', exact: true }).click()
    }
    if (!refreshed && p.labRound === 2) {
      const draft = (await progress()).labDraft
      await page.reload(); await enter()
      assert.deepEqual((await progress()).labDraft, draft, 'reload resumes the exact lab draft')
      refreshed = true
    }
    await page.waitForTimeout(950)
    await root.getByRole('button', { name: '继续', exact: true }).click()
  }
  await page.waitForFunction(() => document.querySelector('[data-ldct-phase]')?.getAttribute('data-ldct-phase') === 'story')
}
try {
  await page.goto((process.env.GAME_URL || 'http://127.0.0.1:8798/') + '#/dlc/ldct')
  await enter()
  for (const story of LDCT_STORIES) {
    await page.locator(`[data-ldct-story="${story.id}"]`).click()
    if (story.id === 'patient') await page.route(/\/(?:assets|audio)\//, route => {
      offlineRequests.push(route.request().url()); return route.abort('internetdisconnected')
    })
    let transitions = 0
    while (!(await progress()).finished) {
      assert(++transitions < 180, `no unexpected loop in ${story.id}`)
      const state = await saved(), p = state.dlc.ldct.ldct
      if (p.phase === 'lab') { await lab(story, p); continue }
      await reveal()
      const node = getLdctNode(state), choices = p.reply ? [] : getLdctChoices(state)
      if (!p.reply && node.kind === 'hub' && !bought) {
        await page.getByRole('button', { name: '🛒 小卖部', exact: true }).first().click()
        const row = page.locator('.ldct-shop-row').filter({ hasText: '速溶咖啡' })
        const before = (await saved()).gold
        await row.getByRole('button', { name: '购买' }).dblclick({ delay: 30 })
        assert.equal((await saved()).gold, before - 30, 'coffee double-click consumes once')
        await page.getByRole('button', { name: '关闭 ×', exact: true }).click()
        bought = true; continue
      }
      const gifts = p.reply ? [] : ldctGiftChoices(state)
      if (choices.length || gifts.length) {
        await readyChoices()
        if (!guarded && choices.length) {
          const before = p.nodeId, button = page.locator('[data-ldct-choice]').first()
          // Keep pressing across the option-buffer period; no choice may commit.
          await background()
          for (let i = 0; i < 8; i++) { await button.click(); await page.waitForTimeout(70) }
          assert.equal((await progress()).nodeId, before, 'continuous clicks cannot choose')
          await page.waitForTimeout(330); guarded = true
        }
        if (!gifted && gifts.length) {
          await page.getByRole('button', { name: gifts[0].text, exact: true }).click(); gifted = true
        } else if (choices.length) await page.locator(`[data-ldct-choice="${choices[0].id}"]`).click()
        else await page.getByRole('button', { name: '接着聊', exact: true }).click()
        lastClick = Date.now()
      } else await background()
    }
    assert.equal(Object.keys((await progress()).records).length, 5)
    await page.locator('[data-ldct-settlement]').waitFor()
    await page.screenshot({ path: resolve(output, `${story.id}-ending.png`) })
    console.log(`${story.id}: completed ${transitions} transitions`)
    await page.locator('[data-ldct-switch]').first().click()
  }
  const final = await saved()
  assert.equal(final.skill, initial.skill + 1)
  assert.equal(final.wealth, initial.wealth + 1)
  for (const id of ['ch2', 'dr', 'dsa']) assert.deepEqual(final.dlc[id], initial.dlc[id])
  for (const key of ['night', 'ap', 'buyCount', 'flags', 'stamps', 'durability']) assert.deepEqual(final[key], initial[key])
  assert.equal(refreshed && gifted && guarded && bought, true)
  assert.deepEqual(errors, []); assert.deepEqual(missing, []); assert.deepEqual(offlineRequests, [])
  console.log('PASS three candidate stories, gifts/shop, input buffer, lab refresh, preloaded offline play, chapter isolation')
} finally { await browser.close() }
