// Fresh UI-only Chapter 1 -> Chapter 2 journeys in one isolated browser/storage.
// No injected save, chapter unlock flag, shortened animation or mocked media.
import assert from 'node:assert/strict'
import { awaitChapterEntry } from './chapter-entry-driver.mjs'
import { swipeCh2Checkin } from './ch2-checkin-driver.mjs'
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { NIGHTS, QUIZ, SHOP_ITEMS } from '../src/game/data.ts'
import { condOk } from '../src/game/store.ts'
import { CH2_SHIFTS, CH2_PASSWORD, CH2_ACTIVE_BADGES, ch2StepForState, QUIZ2 } from '../src/game/ch2.ts'
import { CH2_SCANS } from '../src/game/ch2-scans.ts'
import { getCh2Observation } from '../src/game/ch2-observations.ts'
import { ch2GiftChoices } from '../src/game/ch2-gifts.ts'
import { ALL_BADGES_CHOICES } from './ch2-all-badges-route.mjs'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const url = process.env.GAME_URL || 'http://127.0.0.1:8798/'
const output = resolve(process.env.CHAIN_OUTPUT || '../../ch1-ch2-continuous-review')
mkdirSync(output, { recursive: true })
const variants = [
  { id: 'female-curious', gender: 'f', seed: 24092601, reverse: false },
  { id: 'male-reserved', gender: 'm', seed: 24092602, reverse: true },
].filter(v => !process.env.CHAIN_VARIANT || process.env.CHAIN_VARIANT === v.id)
assert(variants.length, 'CHAIN_VARIANT must name one of the two fixed routes')
const results = []
const allBadges = process.env.CHAIN_ALL_BADGES === '1'
const chapter2Only = process.env.CHAIN_CH2_ONLY === '1'
const read = page => page.evaluate(() => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')))
const plain = text => (text ?? '').replaceAll('**', '')
const dialog = page => page.locator('.dialog-box > p')
const buttons = page => page.locator('.dialog-box .choice-in button')
async function click(page, locator) { await page.waitForTimeout(340); await locator.click() }
async function reveal(page) {
  // A real separate gesture, not a second click inside the 300ms fast-tap guard.
  await page.waitForTimeout(310)
  const arrow = page.locator('.dialog-box > span.animate-bounce')
  if (!(await arrow.count()) && !(await buttons(page).count())) await dialog(page).click()
}
async function advance(page) {
  const currentNode = () => page.evaluate(() => {
    const root = document.querySelector('[data-ch2-step], [data-ch1-step]')
    const p = JSON.parse(localStorage.getItem('midnight-radiology-save-v1'))?.dlc?.ch2
    return JSON.stringify([root?.getAttribute('data-ch2-step') ?? root?.getAttribute('data-ch1-step'), p?.giftReply, p?.statInteractions?.pending])
  })
  const before = await currentNode()
  await reveal(page)
  // Natural typewriter completion can land between inspecting the arrow and
  // dispatching a trusted mouse click. That click already advanced normally;
  // never wait for an arrow on the following (possibly choice-only) node.
  await page.waitForFunction(id => {
    const root = document.querySelector('[data-ch2-step], [data-ch1-step]')
    const p = JSON.parse(localStorage.getItem('midnight-radiology-save-v1'))?.dlc?.ch2
    const now = JSON.stringify([root?.getAttribute('data-ch2-step') ?? root?.getAttribute('data-ch1-step'), p?.giftReply, p?.statInteractions?.pending])
    return now !== id || !!document.querySelector('.dialog-box > span.animate-bounce')
  }, before, { timeout: 20000 })
  if (await currentNode() !== before) return
  await click(page, dialog(page))
}
async function settlementImages(page) {
  await page.locator('[data-ch2-settlement] [data-scene-background="bg_ctcontrol_day_ready"]').waitFor()
  await page.locator('[data-ch2-settlement] [data-scene-load-status]').waitFor({ state: 'detached' })
  await page.waitForFunction(() => [...document.querySelectorAll('[data-ch2-settlement] img')]
    .every(img => img.complete && img.naturalWidth > 0))
}
async function resumeCh1(page) {
  await click(page, page.getByRole('button', { name: '▶ 继续夜班（自动存档）', exact: true }))
  await awaitChapterEntry(page)
  await click(page, page.getByRole('button', { name: /^(出发，上夜班|回到夜班现场) →$/ }))
}
function preserved(s) {
  const keys = ['gender', 'night', 'stamps', 'finished', 'durability', 'seed', 'buyCount',
    'lotteryNight', 'lotteryCount', 'lastCheckin', 'streak', 'stepId', 'screenHint',
    'resumeKey', 'playerName', 'playerId']
  return Object.fromEntries(keys.map(key => [key, s[key]]))
}
function assertInherited(before, after) {
  assert.deepEqual(preserved(after), preserved(before), 'Chapter 1 cursor/counters/identity remain intact')
  for (const [key, value] of Object.entries(before.flags)) assert.deepEqual(after.flags[key], value, `Chapter 1 flag ${key}`)
  for (const key of ['badges', 'cards', 'events']) for (const id of before[key] ?? []) assert(after[key].includes(id), `Inherited ${key}: ${id}`)
  for (const id of ['dr', 'dsa']) assert.deepEqual(after.dlc?.[id], before.dlc?.[id], `Other DLC ${id}`)
}
async function ch1Shop(page, coffee, log) {
  await click(page, page.getByRole('button', { name: /小卖部逛逛/ }))
  const before = await read(page)
  if (coffee) await click(page, page.getByRole('button', { name: '30💰', exact: true }))
  await click(page, page.getByRole('button', { name: '离开小卖部', exact: true }))
  const after = await read(page)
  assert.equal(after.ap, before.ap + (coffee ? 1 : 0))
  assert.equal(after.gold, before.gold - (coffee ? 30 : 0))
  log.push({ kind: 'ch1-shop', night: before.night, coffee, gold: after.gold })
}
async function runCh1(page, variant, log) {
  const seen = new Set(), hubs = new Set(), ended = new Set(), events = new Map()
  await page.goto(url)
  assert.equal(await read(page), null, 'Actual empty context, no fixture')
  await click(page, page.getByRole('button', { name: '▶ 开始游戏', exact: true }))
  await click(page, page.getByRole('button', { name: variant.gender === 'f' ? /林小满.*细心温和/ : /陈一帆/ }))
  await awaitChapterEntry(page)
  await click(page, page.getByRole('button', { name: '出发，上夜班 →', exact: true }))
  let loops = 0, readouts = 0
  while (++loops < 720) {
    const s = await read(page)
    if (s.finished) break
    if (s.screenHint === 'day') {
      await page.getByText('白天 · 科室经营', { exact: true }).waitFor()
      assert.equal(s.stamps.length, s.night - 1)
      assert.equal(s.ap, 0)
      ended.add(s.night - 1)
      const before = await read(page)
      await page.reload(); await resumeCh1(page)
      await page.getByText('白天 · 科室经营', { exact: true }).waitFor()
      // freshState omits dlc; the existing loadState migration adds its empty
      // object once. Everything else, including money/stamps, is byte-for-byte equal.
      assert.deepEqual(await read(page), { ...before, dlc: before.dlc ?? {} }, 'Ch1 settlement refresh is reward-idempotent')
      if (s.gold >= 50) await click(page, page.getByRole('button', { name: '保养（-50金币）', exact: true }))
      await click(page, page.getByRole('button', { name: new RegExp(`进入第 ${s.night} 夜`) }))
      await page.waitForFunction(n => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).stepId?.startsWith(`n${n}_`), s.night)
      continue
    }
    const night = NIGHTS.find(n => n.id === s.night), step = night.steps[s.stepId]
    assert(step, `Ch1 missing ${s.stepId}`)
    await page.locator(`[data-ch1-step="${s.stepId}"]`).waitFor()
    seen.add(s.stepId)
    if (step.end) {
      await page.waitForFunction(id => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).stepId !== id, s.stepId)
      continue
    }
    if (step.choices) {
      await reveal(page); await buttons(page).first().waitFor({ timeout: 20000 })
      const now = await read(page), labels = await buttons(page).allTextContents()
      const visible = step.choices.filter(c => condOk(now, c.cond))
      if (s.stepId.endsWith('_hub')) {
        if (!hubs.has(s.night)) {
          assert.equal(now.ap, 3, 'Each original night starts at 3 AP')
          hubs.add(s.night)
          await ch1Shop(page, false, log)
          await click(page, page.getByRole('button', { name: /翻翻值班室那本旧书/ }))
          await page.getByText(new RegExp(`第 ${s.night} 页 / 共`)).waitFor()
          await click(page, page.getByRole('button', { name: '合上书,回科室', exact: true }))
          assert.equal((await read(page)).ap, 3)
          continue
        }
        for (const [flag, label] of events) if (flag.startsWith(`n${s.night}_`) && now.flags[flag]) assert(!labels.includes(label), `Completed event returned: ${label}`)
        const places = visible.filter(c => c.cond?.notFlag && !c.next.startsWith('@'))
        const place = variant.reverse ? places.at(-1) : places[0]
        if (place) {
          events.set(place.cond.notFlag, plain(place.text))
          await click(page, page.getByRole('button', { name: plain(place.text), exact: true }))
        } else {
          const remaining = step.choices.find(c => c.cond?.ap && !now.flags[c.cond.notFlag] && condOk(now, { ...c.cond, ap: 0 }))
          if (remaining && now.gold >= 30) { await ch1Shop(page, true, log); continue }
          const start = visible.find(c => /开工|接诊|开诊/.test(c.text))
          assert(start, 'Ch1 clinic entry exists')
          await click(page, page.getByRole('button', { name: plain(start.text), exact: true }))
        }
      } else {
        const selected = visible.find(c => c.next === 'n1_rest2b') ?? visible.find(c => c.tag === 'good') ?? (variant.reverse ? visible.at(-1) : visible[0])
        await click(page, page.getByRole('button', { name: plain(selected.text), exact: true }))
      }
    } else if (step.readout) {
      await page.waitForFunction(id => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).stepId !== id, s.stepId, { timeout: 30000 })
      readouts++
    } else await advance(page)
    await page.waitForFunction(id => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).stepId !== id, s.stepId)
    log.push({ kind: 'ch1-story', node: s.stepId })
    if (seen.size % 50 === 0) console.log(variant.id, 'Ch1', seen.size, (await read(page)).stepId)
  }
  assert(loops < 720)
  const beforeQuiz = await read(page)
  assert(beforeQuiz.finished && beforeQuiz.stamps.length === 5)
  assert.equal(hubs.size, 5); assert.equal(ended.size, 4); assert.equal(readouts, 6)
  for (let index = 0; index < 5; index++) {
    await page.getByText(`第 ${index + 1} / 5 题 · 当前得分 ${index}`, { exact: true }).waitFor()
    const title = await page.locator('h3').innerText(), question = QUIZ.find(q => q.q === title)
    assert(question, title)
    await click(page, page.getByRole('button', { name: question.options[question.answer], exact: true }))
    await page.getByText(`第 ${index + 1} / 5 题 · 当前得分 ${index + 1}`, { exact: true }).waitFor()
    await click(page, page.getByRole('button', { name: index === 4 ? '查看成绩 →' : '下一题 →', exact: true }))
    log.push({ kind: 'ch1-quiz', index, title })
  }
  await page.getByText('S级 · 满分', { exact: true }).waitFor()
  const scored = await read(page)
  assert.equal(scored.gold, beforeQuiz.gold + 250)
  assert.equal(scored.flags.quiz_grade, 'S')
  await page.reload(); await resumeCh1(page)
  await page.getByText('S级 · 满分', { exact: true }).waitFor()
  assert.deepEqual(await read(page), scored, 'Ch1 quiz reward is not repeated')
  await click(page, page.getByRole('button', { name: '去领通关凭证 →', exact: true }))
  while ((await read(page)).screenHint !== 'chapterEnd') {
    const s = await read(page), step = NIGHTS.at(-1).steps[s.stepId]
    assert(step && s.stepId.startsWith('n5_epi'), 'Play actual Ch1 epilogue')
    if (step.end) { await page.waitForFunction(() => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).screenHint === 'chapterEnd'); break }
    await advance(page)
    await page.waitForFunction(id => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).stepId !== id, s.stepId)
    log.push({ kind: 'ch1-epilogue', node: s.stepId })
  }
  await page.getByText('第一章 · 完', { exact: true }).waitFor()
  await page.screenshot({ path: `${output}/${variant.id}-ch1-end.png` })
  return { state: await read(page), nodes: seen.size, readouts, explorationEvents: events.size }
}
async function observation(page, variant, log, refreshed) {
  const state = await read(page), p = state.dlc.ch2, config = getCh2Observation(p.stepId, state)
  if (!config || p.observations?.[config.id]?.acknowledged) return false
  let answer = p.observations?.[config.id]
  if (!answer) {
    if (await dialog(page).textContent() !== plain(config.prompt)) await dialog(page).click()
    await page.waitForFunction(text => document.querySelector('.dialog-box > p')?.textContent === text, plain(config.prompt))
    const choice = variant.reverse ? config.choices.find(c => c.hint) ?? config.choices.find(c => c.correct) : config.choices.find(c => c.correct) ?? config.choices.find(c => c.hint)
    assert(choice)
    await click(page, buttons(page).filter({ hasText: choice.text.replaceAll('**', '') }))
    await page.waitForFunction(id => !!JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.observations[id], config.id)
    answer = { choiceId: choice.id }
  }
  if (!refreshed.has('observation')) {
    const before = await read(page)
    await page.reload(); await awaitChapterEntry(page); await dialog(page).waitFor()
    assert.equal((await read(page)).gold, before.gold)
    assert.equal((await read(page)).skill, before.skill)
    assert.deepEqual((await read(page)).dlc.ch2.observations, before.dlc.ch2.observations)
    refreshed.add('observation')
  }
  const feedback = plain(config.choices.find(c => c.id === answer.choiceId).feedback)
  if (await dialog(page).textContent() !== feedback) await dialog(page).click()
  await page.waitForFunction(text => document.querySelector('.dialog-box > p')?.textContent === text, feedback)
  await page.locator('.dialog-box > span.animate-bounce').waitFor()
  await click(page, dialog(page))
  await page.waitForFunction(id => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.observations[id].acknowledged, config.id)
  // Approved CTA de-duplication proceeds directly to the single VR reconstruction.
  assert.equal((await read(page)).dlc.ch2.stepId, p.stepId === 'c2n3_coronary_where' ? 'c2n3_coronary_volume' : p.stepId)
  log.push({ kind: 'ch2-observation', id: config.id, choice: answer.choiceId })
  return config.id
}
async function buyAtSettlement(page, log) {
  await click(page, page.getByRole('button', { name: '🛒 小卖部', exact: true }))
  const before = await read(page)
  const purchases = allBadges ? before.dlc.ch2.shift === 'c2n1' ? ['dosimeter']
    : before.dlc.ch2.shift === 'c2d2' ? ['key', 'snack'] : [] : ['milktea', 'snack']
  for (const id of purchases) {
    const item = SHOP_ITEMS.find(i => i.id === id), button = page.getByRole('button', { name: `购买${item.name}`, exact: true })
    if (await button.isEnabled()) {
      // Separate intended purchases from the new 500ms accidental-double-tap gate.
      await page.waitForTimeout(200)
      const a = await read(page)
      await click(page, button)
      const b = await read(page)
      assert.equal(b.gold, a.gold - item.price)
      assert(b.items.includes(id))
      log.push({ kind: 'ch2-buy', shift: a.dlc.ch2.shift, id })
    }
  }
  await click(page, page.getByRole('button', { name: '离开小卖部', exact: true }))
  assert.equal((await read(page)).dlc.ch2.shift, before.dlc.ch2.shift)
  assert.equal((await read(page)).dlc.ch2.phase, 'settle')
}
async function runCh2(page, variant, inherited, log) {
  if (chapter2Only) await page.goto(url + '#/hall')
  else await click(page, page.getByRole('button', { name: '🗂️ 内容大厅', exact: true }))
  await page.getByPlaceholder('章节口令').fill(CH2_PASSWORD)
  await click(page, page.getByRole('button', { name: '解锁', exact: true }))
  const card = page.locator('div.border-2.rounded-2xl').filter({ has: page.getByText('第二章 · 快与狠', { exact: true }) })
  assert.deepEqual(await read(page), inherited, 'Entering/unlocking hall cannot replace Chapter 1 save')
  await click(page, card.getByRole('button', { name: '开始 →', exact: true }))
  await awaitChapterEntry(page)
  await dialog(page).waitFor()
  const initial = await read(page)
  assertInherited(inherited, initial)
  for (const key of ['gold', 'skill', 'heart', 'wealth', 'items']) assert.deepEqual(initial[key], inherited[key], `Initial inherited ${key}`)
  const shifts = new Set(), scans = new Set(), observations = new Set(), refresh = new Set(), seen = new Set(), hubs = new Set()
  let count = 0, questions = 0
  while (++count < 800) {
    const s = await read(page), p = s.dlc.ch2
    assertInherited(inherited, s)
    if (p.done) break
    if ((p.phase ?? 'story') === 'story') await page.locator(`[data-ch2-step="${p.stepId}"]`).waitFor()
    if (await swipeCh2Checkin(page, s)) { log.push({ kind: 'checkin', id: p.stepId }); continue }
    if (p.phase === 'settle') {
      await page.locator('[data-ch2-settlement]').waitFor()
      shifts.add(p.shift)
      await buyAtSettlement(page, log)
      const settled = await read(page)
      await page.reload(); await awaitChapterEntry(page); await page.locator('[data-ch2-settlement]').waitFor()
      assert.deepEqual(await read(page), settled, `Ch2 ${p.shift} settlement+purchases survive refresh once`)
      assert.equal(settled.dlc.ch2.loop.entries.filter(e => e.id === `settle:${p.shift}`).length, 1)
      await settlementImages(page)
      await page.screenshot({ path: `${output}/${variant.id}-${p.shift}-settle.png` })
      await click(page, page.getByRole('button', { name: /进入下一班|前往晨会/ }))
      await page.waitForFunction(id => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.shift !== id, p.shift)
      log.push({ kind: 'ch2-settle', shift: p.shift, gold: settled.gold })
      continue
    }
    if (p.phase === 'quiz') {
      await page.locator('[data-ch2-quiz]').waitFor()
      const q = p.quiz
      if (q.completed) {
        assert.equal(q.grade, 'S')
        await page.reload(); await awaitChapterEntry(page); await page.locator('[data-ch2-quiz]').waitFor()
        assert.deepEqual(await read(page), s, 'Ch2 quiz award survives reload once')
        await click(page, page.getByRole('button', { name: '回到晨会 →', exact: true }))
      } else {
        const row = q.questions[q.index], source = QUIZ2[row.question]
        await click(page, page.locator('[data-ch2-quiz]').getByRole('button', { name: source.options[source.answer], exact: true }))
        questions++
        if (!refresh.has('quiz')) {
          const answered = await read(page)
          await page.reload(); await awaitChapterEntry(page); await page.locator('[data-ch2-quiz]').waitFor()
          assert.deepEqual((await read(page)).dlc.ch2.quiz, answered.dlc.ch2.quiz, 'Answered question/order remains stable')
          assert.equal((await read(page)).gold, answered.gold)
          refresh.add('quiz')
        }
        await click(page, page.getByRole('button', { name: q.index === 4 ? '查看成绩 →' : '下一题 →', exact: true }))
        await page.waitForFunction(index => { const q = JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.quiz; return q.completed || q.index !== index }, q.index)
      }
      continue
    }
    if (p.statInteractions?.pending) {
      const before = await read(page), pending = before.dlc.ch2.statInteractions.pending
      if (!refresh.has('stat-interaction')) {
        await page.reload(); await awaitChapterEntry(page); await dialog(page).waitFor()
        assert.deepEqual((await read(page)).dlc.ch2.statInteractions, before.dlc.ch2.statInteractions)
        assert.equal((await read(page)).ap, before.ap, 'Stat assistance survives refresh once')
        refresh.add('stat-interaction')
      }
      await advance(page)
      await page.waitForFunction(() => !JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.statInteractions?.pending)
      log.push({ kind: 'ch2-stat-interaction', ...pending })
      continue
    }
    if (p.giftReply) {
      const before = await read(page)
      if (!refresh.has('gift')) {
        await page.reload(); await awaitChapterEntry(page); await dialog(page).waitFor()
        assert.deepEqual((await read(page)).items, before.items)
        assert.equal((await read(page)).heart, before.heart)
        assert.deepEqual((await read(page)).dlc.ch2.giftReply, before.dlc.ch2.giftReply)
        refresh.add('gift')
      }
      await advance(page)
      await page.waitForFunction(() => !JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.giftReply)
      continue
    }
    const definition = CH2_SHIFTS.find(sh => sh.id === p.shift), step = ch2StepForState(p.stepId, definition.steps[p.stepId], s)
    assert(step, `Missing live Ch2 node ${p.stepId}`)
    seen.add(p.stepId)
    if (p.stepId.startsWith('c2n3_dawn')) {
      await page.locator('[data-ch2-sunrise-cinematic]').waitFor()
      await page.locator('[data-dawn-camera]').waitFor()
      assert.equal(await page.getByRole('button', { name: /跳过/ }).count(), 0)
    }
    const scan = CH2_SCANS[p.stepId]
    if (scan && !p.scanSessions?.[p.stepId]?.completed) {
      if (!p.scanSessions?.[p.stepId]) await dialog(page).click()
      await page.locator('.ch2-scan-overlay').waitFor({ timeout: 12000 })
      assert.equal(await page.getByRole('button', { name: /跳过/ }).count(), 0)
      if (!refresh.has('scan')) {
        await page.waitForTimeout(900)
        const running = await read(page)
        await page.reload()
        await awaitChapterEntry(page)
        await page.waitForFunction(id => !!JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.scanSessions[id], p.stepId)
        assert.equal((await read(page)).gold, running.gold)
        assert.equal((await read(page)).dlc.ch2.scanSessions[p.stepId].startedAt, running.dlc.ch2.scanSessions[p.stepId].startedAt)
        refresh.add('scan')
      }
      await page.locator('.ch2-scan-overlay').waitFor({ state: 'detached', timeout: 6000 })
      await page.waitForFunction(id => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.scanSessions[id].completed, p.stepId)
      if (scan.mode === 'acquire') await page.waitForFunction(id => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.stepId !== id, p.stepId)
      scans.add(p.stepId); log.push({ kind: 'ch2-scan', id: p.stepId, mode: scan.mode }); continue
    }
    const observed = await observation(page, variant, log, refresh)
    if (observed) { observations.add(observed); continue }
    log.push({ kind: 'ch2-story', node: p.stepId, text: step.text })
    if (step.windowTask) {
      await dialog(page).click()
      if (allBadges && p.stepId === 'c2n1_m11' && !refresh.has('window-failed')) {
        await click(page, page.getByRole('button', { name: /^就这个窗口 · 确认/ }))
        await page.waitForFunction(() => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.windowTasks?.c2n1_m11?.attempts === 1)
        await page.reload(); await awaitChapterEntry(page); await dialog(page).waitFor(); await dialog(page).click()
        await page.getByRole('button', { name: /^就这个窗口 · 确认（已试 1 次）$/ }).waitFor()
        refresh.add('window-failed')
      }
      await click(page, page.getByRole('button', { name: new RegExp(` ${step.windowTask.targetW}/${step.windowTask.targetL}$`) }))
      await click(page, page.getByRole('button', { name: /^就这个窗口 · 确认/ }))
    } else if (step.choices || ch2GiftChoices(s, p.stepId).length) {
      await reveal(page); await buttons(page).first().waitFor({ timeout: 20000 })
      const labels = await buttons(page).allTextContents()
      if (allBadges && p.stepId === 'c2n1_hub' && !s.items.includes('toolbox')) {
        await click(page, page.getByRole('button', { name: '小卖部', exact: true }))
        const item = SHOP_ITEMS.find(i => i.id === 'toolbox')
        await click(page, page.getByRole('button', { name: `购买${item.name}`, exact: true }))
        assert((await read(page)).items.includes('toolbox'))
        await click(page, page.getByRole('button', { name: '离开小卖部', exact: true }))
        log.push({ kind: 'ch2-buy', shift: p.shift, id: 'toolbox' })
        continue
      }
      let pick = allBadges && !s.badges.includes('night_snack') ? -1 : labels.findIndex(t => /^把.*递给/.test(t))
      if (p.stepId.endsWith('_hub')) {
        hubs.add(p.shift)
        // All available once-only places before clinic; each route orders them differently.
        const places = labels.map((text, index) => ({ text, index })).filter(row => !/开诊|翻书|小卖部/.test(row.text))
        pick = (variant.reverse ? places.at(-1) : places[0])?.index ?? labels.findIndex(t => t.includes('【开诊】'))
      }
      if (allBadges && ALL_BADGES_CHOICES[p.stepId]) {
        const desired = ALL_BADGES_CHOICES[p.stepId].map(next => step.choices?.find(c => c.next === next && condOk(s, c.cond)))
          .find(c => c && labels.includes(plain(c.text)))
        assert(desired, `All-collection route has a visible intended choice at ${p.stepId}`)
        pick = labels.indexOf(plain(desired.text))
      }
      if (pick < 0) pick = labels.findIndex(t => step.choices?.some(c => c.tag === 'good' && plain(c.text) === t))
      if (pick < 0) {
        const ordinary = labels.map((text, index) => ({ text, index })).filter(row => !/小卖部|翻书/.test(row.text) &&
          !(allBadges && !s.badges.includes('night_snack') && /^把.*递给/.test(row.text)))
        pick = (variant.reverse ? ordinary.at(-1) : ordinary[0])?.index ?? 0
      }
      await click(page, buttons(page).nth(pick))
      log.push({ kind: 'ch2-choice', node: p.stepId, label: labels[pick] })
    } else if (step.end) {
      await reveal(page)
      await click(page, page.getByRole('button', { name: /本班结束 · 结算|第二章 · 完 —— 结算/ }))
    } else await advance(page)
    await page.waitForFunction(before => {
      const now = JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2
      return now.stepId !== before.stepId || now.shift !== before.shift || now.phase !== before.phase || now.done || !!now.giftReply || !!now.statInteractions?.pending
    }, p, { timeout: 15000 })
    if (count % 50 === 0) console.log(variant.id, 'Ch2', count, (await read(page)).dlc.ch2.stepId)
  }
  assert(count < 800, 'Ch2 finishes without a loop')
  const final = await read(page), loop = final.dlc.ch2.loop
  assert.equal(final.dlc.ch2.done, true); assert.equal(shifts.size, 5); assert.equal(questions, 5); assert.equal(hubs.size, 3)
  assert.equal(final.flags.quiz_grade, inherited.flags.quiz_grade); assert.equal(final.flags.quiz2_grade, 'S')
  if (allBadges) {
    assert.deepEqual(CH2_ACTIVE_BADGES.filter(id => !final.badges.includes(id)), [], 'Every currently obtainable badge in ONE real playthrough')
    assert.equal(final.dlc.ch2.windowTasks.c2n1_m11.attempts, 2)
    assert.equal(final.dlc.ch2.windowTasks.c2n1_w2.attempts, 1)
    assert.equal(final.dlc.ch2.loop.entries.filter(e => e.id === 'window-master').length, 1)
    for (const id of ['c2_chair_helper', 'c2_brass_key', 'c2_model_demo']) assert(final.badges.includes(id), id)
    console.log('ALL ACTIVE BADGES', CH2_ACTIVE_BADGES.length, CH2_ACTIVE_BADGES.join(', '))
  }
  assert.equal([...seen].filter(id => id.startsWith('c2n3_dawn')).length, 20, 'One complete 20-node dawn path')
  assert.equal(final.flags.c2_dawn_seen, true)
  assert.equal(final.flags.c2_dawn_done, true)
  assert.equal(observations.size, 11, 'The approved abdominal-window case was removed; all eleven remaining observations still play')
  assert.deepEqual([...scans].sort(), Object.keys(CH2_SCANS).sort(), 'Every acquisition/reconstruction remains played')
  assert.equal(new Set(loop.entries.map(e => e.id)).size, loop.entries.length, 'No duplicate transaction receipts')
  assert.equal(loop.entries.filter(e => e.id === 'quiz:reward').length, 1)
  for (const entry of loop.entries.filter(e => e.id.includes('c2n3_dawn'))) {
    assert.deepEqual(entry.delta, { gold: 0, skill: 0, heart: 0, wealth: 0, ap: 0 }, 'Dawn is a narrative break, not a hidden reward/AP charge')
    assert.deepEqual(entry.consumed, [])
  }
  const start = loop.shifts.c2n1.start
  for (const key of ['gold', 'skill', 'heart', 'wealth', 'ap']) assert.equal(final[key] - start[key], loop.entries.reduce((sum, e) => sum + e.delta[key], 0), `All ${key} changes reconciled from inherited save`)
  assertInherited(inherited, final)
  await page.locator('[data-ch2-settlement]').waitFor()
  await page.reload(); await awaitChapterEntry(page); await page.locator('[data-ch2-settlement]').waitFor()
  assert.deepEqual(await read(page), final, 'Whole chapter completion reload does not reset or reward')
  await settlementImages(page)
  await page.screenshot({ path: `${output}/${variant.id}-ch2-end.png` })
  // Begin a genuine replay through the same hall. Preserve the completed run
  // in the report, then verify old grade and run-local mysteries cannot leak.
  await click(page, page.getByRole('button', { name: '返回大厅 · 进度已保存', exact: true }))
  const replayCard = page.locator('div.border-2.rounded-2xl').filter({ has: page.getByText('第二章 · 快与狠', { exact: true }) })
  await click(page, replayCard.getByRole('button', { name: '再玩一遍', exact: true }))
  await page.locator('[data-ch2-step="c2n1_0"]').waitFor()
  const restarted = await read(page)
  assertInherited(inherited, restarted)
  assert.equal(restarted.flags.quiz2_grade, undefined)
  assert.equal(restarted.flags.c2_dawn_done, undefined)
  assert.equal(restarted.flags.c2_terminal_stopped, undefined)
  assert.equal(restarted.flags.c2_needle_resolved, undefined)
  assert.equal(restarted.dlc.ch2.quiz, undefined)
  assert.equal(restarted.dlc.ch2.windowTasks, undefined)
  assert.equal(restarted.dlc.ch2.done, undefined)
  for (const key of ['gold', 'skill', 'heart', 'wealth', 'items']) assert.deepEqual(restarted[key], final[key], `Replay preserves shared ${key}`)
  log.push({ kind: 'ch2-replay-start', step: restarted.dlc.ch2.stepId, quizReset: true, firstChapterPreserved: true })
  return { state: final, nodes: seen.size, scans: [...scans], observations: [...observations], iterations: count,
    questions, settlements: [...shifts], refreshes: [...refresh], gifts: loop.gifts, entries: loop.entries.length }
}
try {
  for (const variant of variants) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    // Reproducible randomness only. There is no localStorage write in this test.
    await context.addInitScript(seed => {
      let n = seed >>> 0
      Math.random = () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296 }
    }, variant.seed)
    const page = await context.newPage(), errors = [], networkFailures = [], log = []
    page.on('pageerror', e => errors.push(e.message))
    page.on('response', response => { if (response.status() >= 400) networkFailures.push({ url: response.url(), status: response.status() }) })
    try {
      let first
      if (chapter2Only) {
        await page.goto(url)
        assert.equal(await read(page), null, 'Actual empty browser context')
        await click(page, page.getByRole('button', { name: '▶ 开始游戏', exact: true }))
        await click(page, page.getByRole('button', { name: /林小满.*细心温和/ }))
        await awaitChapterEntry(page)
        first = { state: await read(page), nodes: 0, readouts: 0, explorationEvents: 0 }
        assert.deepEqual(first.state.badges, [])
        assert.deepEqual(first.state.items, [])
        assert(first.state.gold <= 150, 'No inherited endgame fortune funds this route')
      } else first = await runCh1(page, variant, log)
      const second = await runCh2(page, variant, first.state, log)
      assert.deepEqual(errors, [])
      assert.deepEqual(networkFailures, [], 'No failed image/audio/app response during both chapters')
      const result = { variant, first, second, errors, networkFailures }
      results.push(result)
      writeFileSync(`${output}/${variant.id}-result.json`, JSON.stringify(result, null, 2))
      console.log(chapter2Only ? (allBadges ? 'PASS FRESH CH2 ALL BADGES' : 'PASS FRESH CH2 HELP ROUTE') : 'PASS CONTINUOUS CH1->CH2', variant.id, first.nodes, second.nodes, second.iterations, 'same live save')
    } catch (error) {
      log.push({ kind: 'failure', error: String(error), state: await read(page), body: await page.locator('body').innerText() })
      await page.screenshot({ path: `${output}/${variant.id}-failure.png` })
      throw error
    } finally {
      writeFileSync(`${output}/${variant.id}-transcript.json`, JSON.stringify(log, null, 2))
      await context.close()
    }
  }
} finally {
  writeFileSync(`${output}/results.json`, JSON.stringify(results, null, 2))
  await browser.close()
}
