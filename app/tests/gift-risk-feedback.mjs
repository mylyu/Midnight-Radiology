import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { readFileSync, mkdirSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { freshState, applyEffect } from '../src/game/store.ts'
import { NIGHTS, BADGES } from '../src/game/data.ts'
import { CH2_SHIFTS } from '../src/game/ch2.ts'
import { giftFeedback, statChanges, statChangeReason, appendStatNotice } from '../src/game/stat-feedback.ts'
import { commitCh1Choice } from '../src/game/interaction-transactions.ts'

const base = { ...freshState('m'), gold: 800, heart: 10, ap: 3, items: ['snack', 'milktea'] }
const consumed = applyEffect(base, { loseItem: 'milktea' })
assert.equal(giftFeedback(base, consumed), '奶茶已送出')
assert.deepEqual(statChanges(base, consumed), [])
assert.match(statChangeReason(base, consumed), /购买时计入/)
assert.equal(giftFeedback(consumed, consumed), undefined)
assert.equal(giftFeedback(base, applyEffect(base, { loseItem: 'snack', heart: 1 })), '零食已分享')
// A scene-entry reward may follow item consumption in the same gesture.
const notice = { id: 1, createdAt: 0, expiresAt: 2800, context: 'gift', changes: [], message: '奶茶已送出', reason: '已在购买时计入' }
const merged = appendStatNotice([notice], { ...notice, id: 2, createdAt: 20, message: undefined,
  changes: [{ key: 'heart', amount: 1 }], reason: '本班进展' })
assert.equal(merged[0].message, '奶茶已送出')
assert.deepEqual(merged[0].changes, [{ key: 'heart', amount: 1 }])
assert.equal(merged[0].reason, '本班进展')
for (const night of NIGHTS) for (const [id, step] of Object.entries(night.steps)) for (const choice of step.choices ?? []) {
  if (!choice.risk) continue
  assert.equal(choice.risk.chance, .3)
  assert.match(night.steps[choice.risk.next].text, /\*\*意外\*\*/)
  assert.equal((night.steps[choice.risk.next].text.match(/\*\*/g) ?? []).length, 6)
  const save = { ...base, screenHint: 'night', night: night.id, stepId: id, badges: ['good_intentions'] }
  const input = { expectedNight: night.id, expectedStep: id, choice, randomValue: 0 }
  const hit = commitCh1Choice(save, input)
  assert.equal(hit.state.badges.filter(b => b === 'good_intentions').length, 1)
  assert.equal(commitCh1Choice(hit.state, input).accepted, false)
}
assert.equal(BADGES.good_intentions.name, '好心办坏事')

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const output = resolve(process.env.FEEDBACK_OUTPUT || '../../gift-risk-feedback-review')
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const url = process.env.GAME_URL || 'http://127.0.0.1:8798/'
const key = 'midnight-radiology-save-v1'
const read = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)
const errors = []
async function open(save, viewport, chapter) {
  const context = await browser.newContext({ viewport })
  await context.addInitScript(({ save, key }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(save))
    localStorage.setItem('mr-ch2-unlock', '1')
    sessionStorage.setItem('mr-rotate-dismissed', '1')
    Math.random = () => .1
    window.__played = []
    HTMLMediaElement.prototype.play = function () { window.__played.push(this.src); return Promise.reject(new DOMException('Fixture denied', 'NotAllowedError')) }
  }, { save, key })
  const page = await context.newPage()
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(url + (chapter === 2 ? '#/ch2' : ''))
  if (chapter === 1) await page.getByRole('button', { name: '▶ 继续夜班（自动存档）', exact: true }).click()
  await page.locator('[data-chapter-enter]').click({ timeout: 45000 })
  if (chapter === 1) await page.getByRole('button', { name: /^(出发，上夜班|回到夜班现场) →$/ }).click()
  await page.locator(`[data-ch${chapter}-step]`).waitFor()
  return { context, page }
}
async function choose(page, name) {
  await page.locator('.dialog-box > p').click()
  const button = page.getByRole('button', { name, exact: true })
  await button.waitFor()
  await page.waitForTimeout(1100) // real reveal/fresh-gesture guard, never force-click
  await page.evaluate(() => { window.__played = [] })
  await button.click()
}
async function visibleNotice(page, name) {
  const notice = page.locator('[data-stat-notice]').filter({ hasText: name })
  await notice.waitFor()
  await page.waitForFunction(() => [...document.querySelectorAll('[data-stat-notice]')].some(el => Number(getComputedStyle(el).opacity) > .95))
  const box = await notice.boundingBox(), view = page.viewportSize()
  assert(box.x >= 0 && box.x + box.width <= view.width)
  assert(box.y > view.height * .15 && box.y < view.height * .55)
  assert.equal(await notice.evaluate(el => getComputedStyle(el).pointerEvents), 'none')
  assert(Number.parseFloat(await notice.evaluate(el => getComputedStyle(el).fontSize)) >= 16)
  return notice
}
async function playedHashes(page) {
  return page.evaluate(async () => Promise.all(window.__played.map(async src => {
    const bytes = await (await fetch(src)).arrayBuffer()
    return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('')
  })))
}
const failureHash = createHash('sha256').update(readFileSync('public/audio/buzz.mp3')).digest('hex')
try {
  for (const [item, viewport] of [['snack', { width: 390, height: 844 }], ['milktea', { width: 1280, height: 900 }]]) {
    const save = { ...base, dlc: { ch2: { phase: 'story', shift: 'c2n1', stepId: 'c2n1_chat_q', appliedSteps: [] } } }
    const { page, context } = await open(save, viewport, 2)
    await choose(page, `把${item === 'snack' ? '零食' : '奶茶'}递给小唐`)
    const expected = item === 'snack' ? '人心＋1' : '奶茶已送出'
    const notice = await visibleNotice(page, expected)
    assert.equal((await read(page)).heart, 10 + (item === 'snack' ? 1 : 0))
    if (item === 'milktea') assert.match(await notice.textContent(), /购买时计入/)
    assert.equal((await page.evaluate(() => window.__played)).length, 0, 'Gift feedback is silent')
    await page.screenshot({ path: join(output, `${item}.png`) })
    const before = await read(page)
    await page.reload(); await page.locator('[data-chapter-enter]').click({ timeout: 45000 })
    await page.locator('[data-ch2-step]').waitFor()
    assert.equal((await read(page)).heart, before.heart)
    assert.equal(await page.locator('[data-stat-notice]').count(), 0)
    await context.close()
  }
  const id = 'n1_walk3'
  const save = { ...base, night: 1, stepId: id, resumeKey: `1-${id}`, screenHint: 'night',
    lastCheckin: new Date().toISOString().slice(0, 10), viewBg: 'bg_corridor' }
  const { page, context } = await open(save, { width: 844, height: 390 }, 1)
  const choice = NIGHTS[0].steps[id].choices.find(c => c.risk)
  await choose(page, choice.text)
  await page.locator('[data-ch1-step="n1_walk4r"]').waitFor()
  assert((await read(page)).badges.includes('good_intentions'))
  await visibleNotice(page, '行动力－1')
  assert.deepEqual(await playedHashes(page), [failureHash], 'One existing failure cue; no click or celebratory badge sound')
  assert.equal(await page.getByText('获得勋章', { exact: true }).count(), 0, 'Stats first, badge second; never overlap')
  await page.screenshot({ path: join(output, 'risk-landscape.png') })
  await page.locator('.dialog-box > p').click()
  assert.match(await page.locator('.dialog-box > p').innerHTML(), /意外<\/span>/)
  await page.getByText('获得勋章', { exact: true }).waitFor()
  await page.screenshot({ path: join(output, 'risk-badge.png') })
  await page.reload()
  await page.getByRole('button', { name: '▶ 继续夜班（自动存档）', exact: true }).click()
  await page.locator('[data-chapter-enter]').click({ timeout: 45000 })
  await page.getByRole('button', { name: /^(出发，上夜班|回到夜班现场) →$/ }).click()
  await page.locator('[data-ch1-step="n1_walk4r"]').waitFor()
  assert.equal((await read(page)).badges.filter(b => b === 'good_intentions').length, 1)
  assert.equal(await page.locator('[data-stat-notice]').count(), 0)
  assert(!(await playedHashes(page)).includes(failureHash), 'Refresh does not replay the failure cue')
  await context.close()
  // Chapter 2 preserves its 30%/35% probabilities and uses the same failure feedback.
  const secondId = 'c2n1_b4'
  const second = await open({ ...base, dlc: { ch2: { phase: 'story', shift: 'c2n1', stepId: secondId, appliedSteps: [] } } },
    { width: 1280, height: 900 }, 2)
  await choose(second.page, CH2_SHIFTS[0].steps[secondId].choices.find(c => c.risk).text)
  await second.page.locator('[data-ch2-step="c2n1_b5c"]').waitFor()
  assert((await read(second.page)).badges.includes('good_intentions'))
  assert.deepEqual(await playedHashes(second.page), [failureHash])
  await second.context.close()
  assert.deepEqual(errors, [])
  console.log('PASS gift/risk feedback: real mobile+desktop gifts, central notices, refresh, landscape risk highlight, one failure cue, badge dedupe; no full playthrough.')
} finally { await browser.close() }
