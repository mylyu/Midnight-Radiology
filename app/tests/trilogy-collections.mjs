// Three grouped, isolated collection integration checks. Not chapter playthroughs.
// TRILOGY_COLLECTIONS_READY=1 node --import tsx tests/trilogy-collections.mjs
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { BADGES } from '../src/game/data.ts'
import { CARDS } from '../src/game/dlc.ts'
import { CH2_ACTIVE_BADGES, CH2_ACTIVE_CARDS } from '../src/game/ch2.ts'
import { TRILOGY } from '../src/game/trilogy-registry.ts'
import { TRILOGY_EVIDENCE, TRILOGY_CASE_NAMES } from '../src/game/trilogy-evidence.ts'
import { initializeTrilogy, patchTrilogy } from '../src/game/trilogy-session.ts'
import { freshState } from '../src/game/store.ts'
import { awaitChapterEntry } from './chapter-entry-driver.mjs'

assert.equal(process.env.TRILOGY_COLLECTIONS_READY, '1', 'Use the confirmed collections production build.')
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const output = resolve(process.env.TRILOGY_OUTPUT || '../../trilogy-review-20261010/pass-4-collections')
const url = (process.env.GAME_URL || 'http://127.0.0.1:8798/').replace(/#.*$/, '')
const key = 'midnight-radiology-save-v1'
const report = { kind: 'three-focused-collection-groups-not-full-walks', started: new Date().toISOString(), cases: [] }
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ headless: true, ...(process.env.EDGE_TEST === '1' ? { channel: 'msedge' } : {}) })
function base() {
  return { ...freshState('f'), seed: 20261010, gold: 2400, skill: 8, heart: 7, wealth: 6,
    night: 2, durability: 88, lastCheckin: new Date().toISOString().slice(0, 10), streak: 2,
    screenHint: 'day', playerName: '收藏测试', playerId: 'KEEP-OLD', items: ['milktea'], ap: 3,
    badges: [Object.keys(BADGES)[0], CH2_ACTIVE_BADGES[0]], cards: [Object.keys(CARDS)[0], CH2_ACTIVE_CARDS[0]],
    flags: { preserved_history: true }, events: [], stamps: [1],
    dlc: { ch2: { shift: 'c2n1', stepId: 'c2n1_end', phase: 'settle', viewBg: 'bg_ctcontrol' },
      dr: { done: true }, dsa: { done: true }, ldct: { done: true, marker: 'unchanged' } } }
}
function inherited(evidence = false) {
  let s = base()
  for (const chapter of Object.values(TRILOGY)) {
    s = initializeTrilogy(s, chapter)
    s = patchTrilogy(s, chapter.id, { phase: 'done', done: true, shift: 4,
      stepId: Object.entries(chapter.steps).find(([id, step]) => step.end && /epi|done/.test(id))[0],
      visited: Object.entries(chapter.steps).filter(([, step]) => step.caseId).map(([id]) => id) })
    s.badges.push(Object.keys(chapter.badges)[0]); s.cards.push(Object.keys(chapter.cards)[0])
    if (evidence) for (const row of TRILOGY_EVIDENCE[chapter.id]) s.flags[row.flag] = true
  }
  return s
}
const protectedFields = s => Object.fromEntries(['gender', 'night', 'gold', 'skill', 'heart', 'wealth', 'durability',
  'lastCheckin', 'streak', 'playerName', 'playerId', 'seed', 'badges', 'cards', 'items', 'flags'].map(k => [k, s[k]]))
async function session(initial, row, label) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  await context.addInitScript(({ key, initial }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(initial))
    localStorage.setItem('mr-ch2-unlock', '1')
  }, { key, initial })
  const page = await context.newPage(), errors = [], requests = []
  page.setDefaultTimeout(15000)
  page.on('pageerror', error => errors.push(error.message))
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`) })
  page.on('requestfailed', request => { if (!request.failure()?.errorText?.includes('ERR_ABORTED')) errors.push(`${request.failure()?.errorText} ${request.url()}`) })
  page.on('request', request => requests.push(request.url()))
  const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)
  const shot = async suffix => { const path = resolve(output, `${label}-${suffix}.png`); await page.screenshot({ path }); row.screenshots.push(path) }
  const enter = async () => {
    await page.locator('[data-chapter-loader], [data-trilogy]').first().waitFor({ timeout: 120000 })
    if (await page.locator('[data-chapter-loader]').count()) await awaitChapterEntry(page)
  }
  const close = async () => {
    assert.deepEqual(errors, [], `${label}: no page/network errors`)
    assert.deepEqual(protectedFields(await read()), protectedFields(initial), `${label}: observing collections changes no old fields or rewards`)
    for (const id of ['dr', 'dsa', 'ldct']) assert.deepEqual((await read()).dlc[id], initial.dlc[id])
    await context.close()
  }
  return { page, context, read, shot, enter, close, requests }
}
async function group(name, fn) {
  const row = { name, status: 'running', screenshots: [], observations: [] }; report.cases.push(row)
  try { await fn(row); row.status = 'passed'; console.log(`PASS collections ${name}`) }
  catch (error) { row.status = 'failed'; row.error = error.stack ?? String(error); console.error(`FAIL collections ${name}: ${error.message}`); throw error }
}
try {
  const current = JSON.parse(readFileSync(new URL('../src/lib/media-manifest.generated.json', import.meta.url), 'utf8'))
  const old = JSON.parse(execFileSync('git', ['show', 'HEAD:app/src/lib/media-manifest.generated.json'], { cwd: resolve('..'), encoding: 'utf8' }))
  for (const id of ['ch1', 'ch2', 'dr', 'dsa']) {
    assert.deepEqual([...current.chapters[id]].sort(), [...old.chapters[id]].sort())
    for (const path of old.chapters[id]) assert.deepEqual(current.assets[path], old.assets[path])
  }
  report.legacyMedia = 'HEAD ch1/ch2/dr/dsa membership, bytes and hashes unchanged'
  report.build = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8').match(/src="([^\"]+\.js)"/)[1]

  await group('hall-inherited-badges-cards-denominators', async row => {
    let oldHeadings
    for (const played of [false, true]) {
      const t = await session(played ? inherited() : base(), row, `hall-${played ? 'inherited' : 'old-only'}`)
      try {
        await t.page.goto(`${url}#/hall`)
        const wall = t.page.getByRole('button', { name: '🏅 勋章墙', exact: true })
        await wall.waitFor({ timeout: 120000 }); await wall.click()
        const h1 = await t.page.getByText(/科室墙上的软木板 · 第一章 已收集/).textContent()
        const h2 = await t.page.getByRole('heading', { name: /第二章 · 快与狠 · 已收集/ }).textContent()
        assert(h1.endsWith(`1/${Object.keys(BADGES).length}`)); assert(h2.endsWith(`1/${CH2_ACTIVE_BADGES.length}`))
        if (!played) oldHeadings = [h1, h2]; else assert.deepEqual([h1, h2], oldHeadings)
        if (!played) assert.equal(await t.page.locator('[data-trilogy-collections]').count(), 0)
        else for (const chapter of Object.values(TRILOGY)) {
          const badge = Object.keys(chapter.badges)[0], article = t.page.locator(`[data-collection-badge="${badge}"]`)
          await article.scrollIntoViewIfNeeded(); assert((await article.textContent()).includes(chapter.badges[badge].name))
          await t.shot(`${chapter.id}-badge`)
        }
        await t.page.getByRole('button', { name: '← 返回', exact: true }).click()
        await t.page.getByRole('button', { name: '📖 夜班手册', exact: true }).click()
        if (!played) assert.equal(await t.page.locator('[data-trilogy-collections]').count(), 0)
        else for (const chapter of Object.values(TRILOGY)) {
          const id = Object.keys(chapter.cards)[0], detail = t.page.locator(`[data-collection-card="${id}"]`)
          await detail.locator('summary').click()
          assert.equal(await detail.locator('p').textContent(), chapter.cards[id].body)
          await t.shot(`${chapter.id}-card`)
        }
        row.observations.push({ played, h1, h2 })
        await t.close()
      } catch (error) { await t.shot('failure'); await t.context.close(); throw error }
    }
  })

  await group('evidence-real-flags-native-documents-chinese-chronicle', async row => {
    for (const enabled of [false, true]) {
      const s = inherited(enabled), t = await session(s, row, `evidence-${enabled ? 'earned' : 'missing'}`)
      try {
        for (const chapter of Object.values(TRILOGY)) {
          await t.page.goto(`${url}#/${chapter.id}`); await t.enter()
          await t.page.locator(`[data-trilogy="${chapter.id}"]`).waitFor()
          await t.page.getByRole('button', { name: '📖 手册', exact: true }).first().click()
          const modal = t.page.locator('.trilogy-modal')
          for (const evidence of TRILOGY_EVIDENCE[chapter.id]) {
            const summary = modal.locator('summary').filter({ hasText: evidence.title })
            if (!enabled) { assert.equal(await summary.count(), 0); continue }
            const count = t.requests.length
            await summary.click()
            const detail = summary.locator('..')
            assert((await detail.textContent()).includes(evidence.body))
            if (evidence.image) {
              await detail.locator('.trilogy-document').waitFor()
              assert.equal(await detail.locator('img').count(), 0, 'Evidence is native paper, not a missing external image')
              assert.deepEqual(t.requests.slice(count), [], 'Opening native paper starts no image download')
              await t.shot(`${chapter.id}-paper`)
            }
          }
          const chronicle = modal.locator('details').filter({ has: t.page.locator('summary').filter({ hasText: '大事记 · 本章已经走过的片段' }) })
          await chronicle.locator('summary').click()
          const text = await chronicle.locator('p').textContent()
          const ids = [...new Set(Object.values(chapter.steps).map(step => step.caseId).filter(Boolean))]
          for (const id of ids) { assert(TRILOGY_CASE_NAMES[id], `Known Chinese case name ${id}`); assert(text.includes(TRILOGY_CASE_NAMES[id])); assert(!text.includes(id)) }
          row.observations.push({ chapter: chapter.id, enabled, chronicle: text })
          if (enabled) await t.shot(`${chapter.id}-chronicle`)
          await t.page.locator('[data-trilogy-close-overlay]').click()
        }
        await t.close()
      } catch (error) { await t.shot('failure'); await t.context.close(); throw error }
    }
  })

  await group('old-management-content-labels-keep-equipment-locks', async row => {
    const t = await session(inherited(), row, 'old-management')
    try {
      await t.page.goto(url)
      await t.page.getByRole('button', { name: '▶ 继续夜班（自动存档）', exact: true }).waitFor({ timeout: 120000 })
      await t.page.getByRole('button', { name: '▶ 继续夜班（自动存档）', exact: true }).click(); await awaitChapterEntry(t.page)
      await t.page.getByRole('button', { name: '出发，上夜班 →', exact: true }).click()
      await t.page.getByRole('heading', { name: '白天 · 科室经营', exact: true }).waitFor()
      const us = t.page.locator('p').filter({ hasText: '🔒 二手超声 ——' }).last()
      const mri = t.page.locator('p').filter({ hasText: '🔒 3.0T 磁共振 ——' }).last()
      assert.match(await us.textContent(), /回声.*内容大厅可进入/)
      assert.match(await mri.textContent(), /🔒.*传闻/)
      assert(!/尚未开放|未开发/.test(await us.textContent()))
      await us.scrollIntoViewIfNeeded(); await t.shot('chapter1-equipment')
      await t.page.evaluate(() => { location.hash = '#/ch2' }); await awaitChapterEntry(t.page)
      await t.page.locator('[data-ch2-settlement]').waitFor()
      for (const id of ['us', 'mri', 'pet', 'ldct']) {
        const line = t.page.locator(`[data-equipment="${id}"]`)
        assert.equal(await line.getAttribute('data-unlock'), 'locked', 'Past story equipment access remains locked')
        const text = await line.textContent(); assert(!/尚未开放|未开发/.test(text)); assert.match(text, /内容大厅可进入|后续故事已开放|独立番外已开放/)
        row.observations.push({ id, text })
      }
      await t.page.locator('[data-equipment="pet"]').scrollIntoViewIfNeeded(); await t.shot('chapter2-equipment')
      await t.close()
    } catch (error) { await t.shot('failure'); await t.context.close(); throw error }
  })
} finally {
  report.finished = new Date().toISOString()
  writeFileSync(resolve(output, 'trilogy-collections-summary.json'), JSON.stringify(report, null, 2))
  await browser.close()
}
assert.equal(report.cases.length, 3)
assert(report.cases.every(row => row.status === 'passed'))
console.log('PASS all three collection integration groups; no additional full playthroughs.')
