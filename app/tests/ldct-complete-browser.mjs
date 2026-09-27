// One complete DLC run. Other endings/state combinations live in the pure test.
// This script never changes the user's browser profile and never replays Chapters 1–2.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { freshState } from '../src/game/store.ts'
import { getLdctChoices, getLdctNode } from '../src/game/ldct.ts'
import { ldctGiftChoices } from '../src/game/ldct-session.ts'
import { LDCT_FILTER_LABELS } from '../src/game/ldct-experiments.ts'

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE
  || 'C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const url = process.env.GAME_URL || 'http://127.0.0.1:8798/'
const output = resolve('../../ldct-complete-review')
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, hasTouch: true })
const page = await context.newPage()
page.setDefaultTimeout(14000)
const key = 'midnight-radiology-save-v1'
const initial = { ...freshState('m'), gold: 1200, skill: 12, heart: 9, wealth: 4,
  night: 4, ap: 2, buyCount: 9, lotteryNight: 4, lotteryCount: 3,
  playerName: '浏览器隔离测试', playerId: 'LDCT-BROWSER', flags: { quiz_grade: 'A', quiz2_grade: 'S' },
  dlc: { ch2: { done: true, certificate: { code: 'YSK2-protected' } }, dr: { served: ['one'] }, dsa: { dose: 10 } } }
const errors = [], missing = [], blockedMedia = []
page.on('pageerror', error => errors.push(error.message))
page.on('response', response => { if (response.status() >= 400) missing.push(response.url()) })
await context.addInitScript(({ key, initial }) => {
  if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(initial))
  localStorage.setItem('mr-ldct-unlock', '1')
  sessionStorage.setItem('mr-rotate-dismissed', '1')
}, { key, initial })

const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)
const progress = async () => (await saved()).dlc.ldct.ldct
let lastStageClick = 0
async function background(revealExpected) {
  // Respect the actual 300ms gate before both reveal and advance. Clicking too
  // early would make the test wait for an entire typewriter line unnecessarily.
  const wait = lastStageClick + 320 - Date.now()
  if (wait > 0) await page.waitForTimeout(wait)
  // A short line can finish naturally during the legal input wait. Re-check
  // before clicking so a reveal-only operation never skips to the next node.
  if (revealExpected !== undefined
    && await page.locator('[data-ldct-dialogue] .dialog-box > p').textContent() === revealExpected) return
  await page.mouse.click(1290, 180)
  lastStageClick = Date.now()
}
async function enter() {
  await page.locator('[data-chapter-enter]').click({ timeout: 60000 })
  await page.locator('[data-ldct-screen]').waitFor()
}
async function reveal() {
  const state = await saved(), p = state.dlc.ldct.ldct
  const expected = (p.reply?.text ?? getLdctNode(state).text).replaceAll('**', '')
  const text = page.locator('[data-ldct-dialogue] .dialog-box > p')
  if (await text.textContent() !== expected) await background(expected)
  await page.waitForFunction(expected => document.querySelector('[data-ldct-dialogue] .dialog-box > p')?.textContent === expected, expected)
}
async function choicesReady() {
  await page.locator('[data-ldct-dialogue][data-choice-ready="true"]').waitFor()
  await page.waitForTimeout(320)
}
async function layout() {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'no document horizontal overflow')
  const root = page.locator('.ldct-research')
  const bounds = await root.boundingBox()
  const viewport = page.viewportSize()
  assert(bounds && bounds.x >= -1 && bounds.x + bounds.width <= viewport.width + 1, 'research panel fits viewport width')
}
async function projection(round) {
  await page.locator(`.ldct-lab[data-round="${round}"]`).waitFor()
  if (round === 1) {
    await page.getByRole('button', { name: '追踪左上的圆块', exact: true }).click()
    await page.getByRole('button', { name: '90°', exact: true }).click()
    await page.getByRole('button', { name: '追踪左下的小细棒', exact: true }).click()
  } else if (round === 2) {
    for (let i = 0; i < 5; i++) await page.getByRole('button', { name: '再铺几个方向 →', exact: true }).click()
  } else if (round === 3) {
    await page.getByRole('button', { name: LDCT_FILTER_LABELS.none, exact: true }).click()
    assert.equal(await page.locator('[data-filter-response]').getAttribute('data-filter-response'), 'none')
    await page.getByRole('button', { name: LDCT_FILTER_LABELS.hann, exact: true }).click()
    await page.getByRole('slider', { name: '拖开比较', exact: true }).fill('32')
    await page.locator('.ldct-lab__header').scrollIntoViewIfNeeded()
    await page.screenshot({ path: resolve(output, 'opening-filter-desktop.png') })
  } else if (round === 4) {
    await page.getByRole('button', { name: '少', exact: true }).click()
    await page.getByRole('button', { name: LDCT_FILTER_LABELS.hann, exact: true }).click()
  } else {
    await page.getByRole('button', { name: '算投影、对差别、改第一轮 →', exact: true }).click()
    await page.getByRole('button', { name: '再改到第 2 轮 →', exact: true }).click()
    await page.getByRole('button', { name: '再改到第 4 轮 →', exact: true }).click()
    await page.getByRole('button', { name: '看看这一轮还差在哪', exact: true }).click()
  }
  await page.getByRole('button', { name: '还拿不准，也记下来', exact: true }).click()
  await page.waitForTimeout(930)
  await page.getByRole('button', { name: '收进记录，回到对话 →', exact: true }).click()
  assert.equal((await progress()).phase, 'story')
}

async function research(stage) {
  const bench = page.locator(`.ldct-research[data-research-stage="${stage}"]`)
  await bench.waitFor()
  if (stage === 'roster') {
    await page.getByRole('combobox', { name: '算法与复算', exact: true }).selectOption('luzhou')
    await page.getByRole('combobox', { name: '版本、来源与参数记录', exact: true }).selectOption('lei')
    await page.getByRole('combobox', { name: '独立看片、记下疑问', exact: true }).selectOption('he')
    await page.getByRole('button', { name: '□ 留半晚空着，补个觉', exact: true }).click()
    await page.screenshot({ path: resolve(output, 'research-roster-desktop.png') })
  } else if (stage === 'blind') {
    assert.match(await bench.locator('.ldct-research__frame').first().evaluate(element => getComputedStyle(element).backgroundImage), /blob:/,
      'research atlas uses the prepared compressed blob')
    assert.equal(await bench.locator('.ldct-research__known-region').count(), 0, 'no answer region before observations')
    for (let i = 0; i < 3; i++) {
      await bench.locator('.ldct-research__case-tabs button').nth(i).click()
      await page.getByRole('button', { name: 'A版', exact: true }).click()
      await page.getByRole('slider', { name: '研究图像比较分界', exact: true }).fill('35')
      await page.getByRole('button', { name: '← 前一层', exact: true }).click()
      await page.getByRole('button', { name: '后一层 →', exact: true }).click()
      await page.getByRole('button', { name: 'C版', exact: true }).click()
      if (i === 1) {
        await page.getByRole('button', { name: '圈一处存疑', exact: true }).click()
        const picture = page.getByTestId('ldct-research-comparison')
        await picture.scrollIntoViewIfNeeded()
        const bounds = await picture.boundingBox()
        await page.mouse.click(bounds.x + bounds.width * .68, bounds.y + bounds.height * .61)
        await page.getByRole('button', { name: '我还拿不准', exact: true }).click()
        const draft = (await progress()).research
        await page.reload()
        await enter()
        assert.deepEqual((await progress()).research, draft, 'mid-blind reload keeps marks, notes and parameters')
        assert.equal(await bench.locator('.ldct-research__known-region').count(), 0)
      } else await page.getByRole('button', { name: '主要结构差不多', exact: true }).click()
    }
    assert.equal(await bench.locator('footer button').isDisabled(), true, 'three notes still need explicit reveal')
    await page.getByRole('button', { name: '三组都记好了 · 揭开名字和原始模体', exact: true }).click()
    assert.equal((await progress()).research.revealed, true)
    await bench.locator('.ldct-research__case-tabs button').nth(1).click()
    await page.getByRole('button', { name: '学习型后处理', exact: true }).click()
    await bench.locator('header').scrollIntoViewIfNeeded()
    await page.screenshot({ path: resolve(output, 'research-blind-desktop.png') })
    await page.setViewportSize({ width: 390, height: 844 })
    await layout()
    await bench.locator('.ldct-research__viewer').scrollIntoViewIfNeeded()
    await page.screenshot({ path: resolve(output, 'research-blind-mobile.png') })
    await bench.locator('footer button').scrollIntoViewIfNeeded()
    const mobileSubmit = await bench.locator('footer button').boundingBox()
    assert(mobileSubmit && mobileSubmit.y >= 0 && mobileSubmit.y + mobileSubmit.height <= 845, 'mobile submit is reachable by scrolling')
    await page.setViewportSize({ width: 844, height: 390 })
    await layout()
    await bench.locator('.ldct-research__viewer').scrollIntoViewIfNeeded()
    await page.screenshot({ path: resolve(output, 'research-blind-landscape.png') })
    await bench.locator('footer button').scrollIntoViewIfNeeded()
    const landscapeSubmit = await bench.locator('footer button').boundingBox()
    assert(landscapeSubmit && landscapeSubmit.y >= 0 && landscapeSubmit.y + landscapeSubmit.height <= 391, 'landscape submit is reachable by scrolling')
    await page.setViewportSize({ width: 1366, height: 900 })
  } else {
    for (let i = 0; i < 3; i++) await bench.locator('.ldct-research__report-cases button').nth(i).click()
    await page.getByRole('radio', { name: /把好看的和不理想的都说清楚/ }).click()
    await page.screenshot({ path: resolve(output, 'research-report-desktop.png') })
  }
  // Same 900ms protection as the production tool; no shortened timings for tests.
  await page.waitForTimeout(930)
  await bench.locator('footer button').click()
  assert.equal((await progress()).phase, 'story')
  assert.equal((await progress()).receipts.filter(id => id === `research:${stage}`).length, 1)
}

try {
  await page.goto(url + '#/dlc/ldct')
  await enter()
  assert.equal((await progress()).nodeId, 'dinner_0')
  // The shell may reload below, but ALL compressed media are now blocked on the
  // network. Blob/cache-backed assets must cover every subsequent DLC branch.
  await context.route('**/*', route => {
    const requestUrl = route.request().url()
    if (/^https?:/.test(requestUrl) && /\.(?:webp|png|jpe?g|avif|gif|mp3|wav|ogg)(?:\?|$)/i.test(requestUrl)) {
      blockedMedia.push(requestUrl)
      return route.abort('internetdisconnected')
    }
    return route.continue()
  })
  let transitions = 0, boughtSnack = false, gaveSnack = false
  const settlements = []
  while (!(await progress()).finished) {
    assert(++transitions < 300, 'whole DLC must reach an actual ending')
    let p = await progress()
    if (transitions % 15 === 0 || ['lab', 'research', 'settle'].includes(p.phase)) console.log('DLC walk', transitions, p.nodeId, p.phase)
    if (p.phase === 'lab') { await projection(p.labRound); continue }
    if (p.phase === 'research') { await research(p.research.stage); continue }
    if (p.phase === 'settle') {
      settlements.push(p.nodeId)
      await page.locator('[data-ldct-settlement]').waitFor()
      assert.equal((await progress()).nodeId, p.nodeId)
      await page.locator('[data-ldct-next-part]').click()
      assert.equal((await progress()).phase, 'story')
      continue
    }
    if (p.nodeId === 'hub' && !boughtSnack) {
      await page.getByRole('button', { name: '🛒 小卖部', exact: true }).click()
      await page.locator('.ldct-shop-row').filter({ hasText: '零食礼包' }).getByRole('button', { name: '购买', exact: true }).click()
      await page.getByRole('button', { name: '关闭 ×', exact: true }).click()
      boughtSnack = true
      assert.equal((await saved()).gold, initial.gold - 40)
      p = await progress()
    }
    await reveal()
    if (p.nodeId === 'chat_lei_0' && !p.reply && !gaveSnack) {
      await choicesReady()
      await page.getByRole('button', { name: '🍪 拆开零食一起吃', exact: true }).click()
      gaveSnack = true
      assert.equal((await saved()).heart, initial.heart + 1)
      continue
    }
    const state = await saved()
    const node = getLdctNode(state)
    const choices = p.reply ? [] : getLdctChoices(state)
    if (choices.length) {
      await choicesReady()
      const preferred = ['food', 'lu', 'lei', 'he', 'chief', 'tell', 'experiment', 'keep_both', 'organize', 'invite', 'finish', 'tea',
        'apply', 'contribution', 'work', 'local', 'frontier', 'compare', 'all', 'rest', 'director', 'report', 'limited']
      const id = preferred.find(id => choices.some(choice => choice.id === id)) ?? choices[0].id
      await page.locator(`[data-ldct-choice="${id}"]`).click()
    } else if (!p.reply && ldctGiftChoices(state).length) {
      await choicesReady()
      await page.getByRole('button', { name: '接着聊', exact: true }).click()
    } else {
      await background()
    }
    assert.notEqual((await progress()).nodeId + ':' + Boolean((await progress()).reply), node.id + ':' + Boolean(p.reply), `dialogue should advance at ${node.id}`)
  }
  const final = await saved(), finished = final.dlc.ldct.ldct
  assert.deepEqual(settlements, ['stage_end', 'r2_end', 'r3_end'])
  assert.equal(finished.nodeId, 'r4_end')
  assert.equal(finished.decisions.ending, 'limited')
  assert.equal(Object.keys(finished.records).length, 5)
  assert.deepEqual(Object.keys(finished.researchRecords), ['roster', 'blind', 'report'])
  assert.equal(final.gold, initial.gold - 40)
  assert.equal(final.heart, initial.heart + 1)
  assert.equal(final.skill, initial.skill + 2)
  assert.equal(final.wealth, initial.wealth + 2)
  for (const property of ['night', 'ap', 'buyCount', 'lotteryNight', 'lotteryCount', 'flags', 'playerName', 'playerId']) assert.deepEqual(final[property], initial[property])
  for (const chapter of ['ch2', 'dr', 'dsa']) assert.deepEqual(final.dlc[chapter], initial.dlc[chapter])
  for (const badge of ['ldct_first_comparison', 'ldct_keep_counterexample', 'ldct_noise_beyond']) assert.equal(final.badges.filter(id => id === badge).length, 1)
  await page.screenshot({ path: resolve(output, 'complete-settlement.png') })
  await page.reload()
  await enter()
  assert.equal((await progress()).nodeId, 'r4_end', 'refresh cannot rewind or reissue the ending')
  await page.getByRole('button', { name: '▤ 实验记录', exact: true }).first().click()
  await page.locator('.ldct-panel').filter({ has: page.getByRole('heading', { name: '只剩最后一页了', exact: true }) })
    .getByRole('button', { name: '回看这份记录', exact: true }).click()
  const review = page.locator('.ldct-research[data-research-stage="report"][data-review="true"]')
  await review.waitFor()
  assert.equal(await review.getByRole('radio').first().isDisabled(), true, 'past report cannot be rewritten')
  await review.getByRole('button', { name: '回到记录', exact: true }).click()
  const afterReview = await saved()
  assert.deepEqual(afterReview.dlc.ldct.ldct.decisions, finished.decisions)
  assert.deepEqual(afterReview.dlc.ldct.ldct.researchRecords, finished.researchRecords)
  assert.equal(afterReview.skill, final.skill)
  assert.equal(afterReview.wealth, final.wealth)
  assert.deepEqual(errors, [])
  assert.deepEqual(missing, [])
  assert.deepEqual(blockedMedia, [], 'no new network media requests after full chapter preparation, including refresh')
  console.log(JSON.stringify({ passed: true, transitions, wholeDlc: true, mediaNetworkBlocked: true, endingsPlayed: 1, output }))
} catch (error) {
  await page.screenshot({ path: resolve(output, 'failure.png') })
  console.error('LDCT STATE', await progress().catch(() => null))
  throw error
} finally {
  await browser.close()
}
