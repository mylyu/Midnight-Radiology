// One real two-evening route. Alternative stories/receipts use the pure tests.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { freshState } from '../src/game/store.ts'
import { getLdctNode, getLdctChoices } from '../src/game/ldct.ts'
import { ldctGiftChoices } from '../src/game/ldct-session.ts'
import { getLdctScanConfig } from '../src/game/ldct-scans.ts'

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1366, height: 900 } })
const page = await context.newPage()
page.setDefaultTimeout(12000)
const key = 'midnight-radiology-save-v1', output = resolve(process.env.LDCT_REVIEW_OUTPUT || '../../ldct-father-review')
mkdirSync(output, { recursive: true })
const initial = { ...freshState('m'), gold: 1200, skill: 12, heart: 9, wealth: 4,
  items: ['snack', 'milktea'], night: 4, ap: 2, buyCount: 9, flags: { quiz_grade: 'A', quiz2_grade: 'S' },
  dlc: { ch2: { done: true, certificate: { code: 'protected' } }, dr: { served: ['one'] }, dsa: { dose: 10 } } }
const resume = process.env.LDCT_RESUME ? JSON.parse(readFileSync(process.env.LDCT_RESUME, 'utf8')) : null
await context.addInitScript(({ key, initial }) => {
  if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(initial))
  localStorage.setItem('mr-ldct-unlock', '1'); sessionStorage.setItem('mr-rotate-dismissed', '1')
}, { key, initial: resume?.state ?? initial })
const errors = [], missing = [], offlineRequests = [], shotNodes = new Set()
page.on('pageerror', e => errors.push(e.message))
page.on('response', r => { if (r.status() >= 400) missing.push(r.url()) })
const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)
const progress = async () => (await saved()).dlc.ldct.ldct
let lastClick = 0, refreshedLab = false, refreshedSettle = false, gifted = false, guarded = false, bought = false
if (resume) ({ refreshedLab, refreshedSettle, gifted, guarded, bought } = resume)
async function background() {
  const wait = lastClick + 335 - Date.now()
  if (wait > 0) await page.waitForTimeout(wait)
  await page.mouse.click(1310, 180); lastClick = Date.now()
}
async function reveal() {
  const state = await saved(), p = state.dlc.ldct.ldct
  await page.locator(`[data-ldct-node="${p.nodeId}"]`).waitFor()
  const pause = lastClick + 335 - Date.now()
  if (pause > 0) await page.waitForTimeout(pause)
  const text = (p.reply?.text ?? getLdctNode(state).text).replaceAll('**', '')
  if (await page.locator('[data-ldct-dialogue] .dialog-box > p').textContent() !== text) await background()
  // A short line may finish between inspection and click: that click legitimately
  // advances. Do not wait for text belonging to the scene we have just left.
  await page.waitForFunction(({ text, nodeId }) => document.querySelector('[data-ldct-dialogue] .dialog-box > p')?.textContent === text ||
    document.querySelector('[data-ldct-node]')?.getAttribute('data-ldct-node') !== nodeId, { text, nodeId: p.nodeId }).catch(async error => {
    console.error('Reveal mismatch', { expected: text, node: (await progress()).nodeId, actual: await page.locator('[data-ldct-dialogue] .dialog-box > p').textContent() })
    throw error
  })
  return (await progress()).nodeId === p.nodeId
}
async function readyChoices() {
  await page.locator('[data-ldct-dialogue][data-choice-ready="true"]').waitFor()
  await page.waitForTimeout(335)
}
async function enter() {
  await page.locator('[data-chapter-enter]').click({ timeout: 60000 })
  await page.locator('[data-ldct-screen], [data-ldct-selector]').waitFor()
}
async function screens(name) {
  await page.screenshot({ path: resolve(output, `${name}-desktop.png`) })
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport)
    await page.waitForTimeout(100)
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no sideways overflow')
    await page.screenshot({ path: resolve(output, `${name}-${viewport.width}.png`) })
  }
  await page.setViewportSize({ width: 1366, height: 900 })
}
async function lab(p) {
  const root = page.locator(`.ldct-lab[data-round="${p.labRound}"]`)
  await root.waitFor()
  assert.equal(await root.getAttribute('data-dataset'), p.labRound >= 4 ? 'chest' : 'phantom')
  assert.match(await root.locator('[data-frame]').first().evaluate(e => getComputedStyle(e).backgroundImage), /blob:/)
  if (p.labRound === 1) await root.getByRole('button', { name: '90°', exact: true }).click()
  if (p.labRound === 2) await root.getByRole('button', { name: /再铺一组投影/ }).click()
  if (p.labRound === 3) {
    await root.getByRole('button', { name: '不滤波', exact: true }).click()
    await screens('unfiltered')
    await root.getByRole('button', { name: '柔一些', exact: true }).click()
  }
  if (p.labRound === 4) {
    for (let count = 2; count <= 11; count++) {
      await root.getByRole('button', { name: '再积累一份曝光', exact: true }).click()
      assert.equal((await progress()).labDraft.exposureCount, count)
    }
  }
  if (p.labRound === 5) {
    assert.equal(await root.locator('[data-frame="truth"]').count(), 0, 'no chest answer reference')
    for (let iteration = 1; iteration <= 10; iteration++) {
      await root.locator('.ldct-chest__next').click()
      assert.equal((await progress()).labDraft.iterationRound, iteration)
    }
    await root.locator('summary').filter({ hasText: '固定、标记与更多轮次' }).click()
    await root.getByRole('button', { name: '4轮', exact: true }).click()
    await root.getByRole('button', { name: '固定这一版', exact: true }).click()
    await root.getByRole('button', { name: '10轮', exact: true }).click()
    await root.getByRole('button', { name: '下一层', exact: true }).click()
    await root.getByRole('button', { name: '点出想请医生核查的位置', exact: true }).click()
    const image = root.locator('.ldct-chest__canvas')
    const box = await image.boundingBox()
    await page.mouse.click(box.x + box.width * .27, box.y + box.height * .37)
    assert.equal((await progress()).labDraft.chest.mark.slice, 2)
    await screens('chest')
    const draft = (await progress()).labDraft
    await page.reload(); await enter()
    assert.deepEqual((await progress()).labDraft, draft, 'chest draft survives refresh')
    refreshedLab = true
    await root.getByRole('button', { name: '回看原FBP', exact: true }).click()
    assert.equal(await root.locator('[data-frame="fbp"]').count(), 1)
    await root.getByRole('button', { name: '回到迭代图', exact: true }).click()
  }
  await page.waitForTimeout(950)
  await root.getByRole('button', { name: '继续', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('[data-ldct-phase]')?.getAttribute('data-ldct-phase') === 'story')
}
try {
  await page.goto((process.env.GAME_URL || 'http://127.0.0.1:8798/') + '#/dlc/ldct')
  await enter()
  await page.route(/\/(?:assets\/media|audio)\//, route => {
    offlineRequests.push(route.request().url()); return route.abort('internetdisconnected')
  })
  if (!resume) await page.locator('[data-ldct-story="father"]').click()
  let transitions = 0
  const route = []
  while (!(await progress()).finished) {
    assert(++transitions < 210, 'no unexpected story loop')
    const state = await saved(), p = state.dlc.ldct.ldct
    route.push(p.nodeId)
    if (transitions % 15 === 0) console.log(`father ${transitions}: ${p.nodeId} / ${p.phase}`)
    const scan = getLdctScanConfig(p.nodeId, p.openingRevision)
    if (scan && !p.scanSessions?.[scan.id]?.completed) {
      await page.waitForFunction(nodeId => document.querySelector('[data-ldct-node]')?.getAttribute('data-ldct-node') !== nodeId,
        p.nodeId, { timeout: 6000 })
      assert.equal((await progress()).scanSessions[scan.id].completed, true)
      continue
    }
    if (p.phase === 'lab') { await lab(p); continue }
    if (p.phase === 'settle') {
      assert.equal(p.nodeId, 'lf_night1_end')
      if (!refreshedSettle) {
        await screens('night1-end')
        const before = await saved()
        await page.reload(); await enter()
        assert.deepEqual(await saved(), before, 'settlement reload does not advance or pay')
        refreshedSettle = true
      }
      await page.locator('[data-ldct-next-evening]').click()
      continue
    }
    if (!await reveal()) continue
    const node = getLdctNode(state), choices = p.reply ? [] : getLdctChoices(state)
    if ((!shotNodes.has('father') && node.sprite === 'ldct_char_father_v1') || (!shotNodes.has('case') && node.chestPreview)) {
      const kind = node.chestPreview ? 'case' : 'father'; await screens(kind); shotNodes.add(kind)
    }
    if (!p.reply && node.kind === 'hub' && !bought) {
      await page.getByRole('button', { name: '🛒 小卖部', exact: true }).first().click()
      const row = page.locator('.ldct-shop-row').filter({ hasText: '速溶咖啡' })
      const before = (await saved()).gold
      await row.getByRole('button', { name: '购买' }).dblclick({ delay: 30 })
      assert.equal((await saved()).gold, before - 30)
      await page.getByRole('button', { name: '关闭 ×', exact: true }).click()
      bought = true; continue
    }
    const gifts = p.reply ? [] : ldctGiftChoices(state)
    if (choices.length || gifts.length) {
      await readyChoices()
      if (!guarded && choices.length) {
        const button = page.locator('[data-ldct-choice]').first()
        await background()
        for (let i = 0; i < 8; i++) { await button.click(); await page.waitForTimeout(70) }
        assert.equal((await progress()).nodeId, p.nodeId, 'continuous clicks cannot submit a new option')
        await page.waitForTimeout(335); guarded = true
      }
      if (!gifted && gifts.length) {
        const gift = gifts.find(g => g.item === 'snack') ?? gifts[0]
        const before = (await saved()).heart
        await page.getByRole('button', { name: gift.text, exact: true }).click()
        assert.equal((await saved()).heart, before + (gift.item === 'snack' ? 1 : 0)); gifted = true
      } else if (choices.length) await page.locator(`[data-ldct-choice="${choices[0].id}"]`).click()
      else await page.getByRole('button', { name: '接着聊', exact: true }).click()
      lastClick = Date.now()
    } else await background()
  }
  await page.locator('[data-ldct-settlement]').waitFor()
  await screens('ending')
  const final = await saved()
  if (!resume) {
    const order = ['lf_consult_0', 'lf_lab_1', 'lf_lab_2', 'lf_lab_3', 'lf_night1_end',
      'lf_scan_0', 'lf_first_fbp', 'lf_lab_4', 'lf_license_0', 'lf_export_0', 'lf_evening2', 'lf_lab_5',
      'lf_caught_choice', 'lf_fine_0', 'lf_director_review_0', 'lf_wrap_0']
    for (let index = 1; index < order.length; index++)
      assert(route.indexOf(order[index]) > route.indexOf(order[index - 1]), `${order[index - 1]} precedes ${order[index]}`)
  }
  assert.equal(final.dlc.ldct.ldct.openingRevision, 5)
  assert.equal(final.dlc.ldct.ldct.records[4].dataset, 'chest')
  assert.equal(final.dlc.ldct.ldct.records[4].exposureCount, 11)
  assert.equal(final.dlc.ldct.ldct.records[5].iterationRound, 10)
  assert.equal(Object.keys(final.dlc.ldct.ldct.records).length, 5)
  assert.equal(final.skill, initial.skill + 1); assert.equal(final.wealth, initial.wealth + 1)
  for (const id of ['ch2', 'dr', 'dsa']) assert.deepEqual(final.dlc[id], initial.dlc[id])
  for (const name of ['night', 'ap', 'buyCount', 'flags', 'stamps', 'durability']) assert.deepEqual(final[name], initial[name])
  assert(refreshedLab && refreshedSettle && gifted && guarded && bought)
  assert.deepEqual(errors, []); assert.deepEqual(missing, []); assert.deepEqual(offlineRequests, [])
  console.log(`PASS father: ${transitions} transitions, both evenings + epilogue, gifts, refresh, offline and protected chapters`)
} catch (error) {
  writeFileSync(resolve(output, 'resume.json'), JSON.stringify({ state: await saved(), refreshedLab, refreshedSettle, gifted, guarded, bought }, null, 2))
  await page.screenshot({ path: resolve(output, 'failure.png') })
  throw error
} finally { await browser.close() }
