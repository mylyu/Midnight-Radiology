// Focused acceptance for the CH3 parity fixes, NOT another full-chapter walk.
// Fixtures intentionally enter named nodes; their history is not a playthrough.
// Reuse the parent's production build and real loader/input guards/audio APIs.
// TRILOGY_BUILD_READY=1 EDGE_TEST=1 node --import tsx tests/ch3-parity-browser.mjs
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { freshState } from '../src/game/store.ts'
import { TRILOGY } from '../src/game/trilogy-registry.ts'
import { initializeTrilogy, patchTrilogy, enterTrilogyNode, trilogyStep, issueTrilogyCertificate } from '../src/game/trilogy-session.ts'
import { resolveMediaIdentities } from './media-identity-driver.mjs'

assert.equal(process.env.TRILOGY_BUILD_READY, '1', 'Use the shared final production build; this test never builds')
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true,
  ...(process.env.EDGE_TEST === '1' ? { channel: 'msedge' } : process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
const output = resolve(process.env.CH3_PARITY_OUTPUT || '../../ch3-three-pass-review-20261026/fixes-ui')
const url = (process.env.GAME_URL || 'http://127.0.0.1:8798/').replace(/[?#].*$/, '')
const images = JSON.parse(readFileSync(new URL('../src/lib/image-assets.catalog.json', import.meta.url), 'utf8'))
const key = 'midnight-radiology-save-v1', chapter = TRILOGY.ch3
const report = { kind: 'focused-node-fixtures-not-full-walk', started: new Date().toISOString(),
  fixturePolicy: 'Fresh isolated CH3 state at explicitly named nodes; all check-in receipts set. Existing-certificate case is a historical fixture.',
  cases: [], errors: [], screenshots: [] }
const filter = process.env.CH3_PARITY_FILTER ? new RegExp(process.env.CH3_PARITY_FILTER) : undefined
mkdirSync(output, { recursive: true })
let serial = 0
const context = await browser.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true })
await context.addInitScript(() => {
  localStorage.setItem('mr-ch2-unlock', '1')
  // A real user preference, not an Audio/timer mock. These are layout/state tests.
  localStorage.setItem('mr-trilogy-muted', '1')
  sessionStorage.setItem('mr-rotate-dismissed', '1')
})
const page = await context.newPage()
page.setDefaultTimeout(8000)
page.on('pageerror', error => report.errors.push(error.message))
const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)
const progress = state => state.dlc.ch3.chapter
const base = () => ({ ...freshState('f'), seed: 20261026, gold: 1400, ap: 3, skill: 8, heart: 7, wealth: 4,
  cards: [], events: [], items: [], flags: { preserved_history: true },
  dlc: { dr: { done: true }, ldct: { done: true, marker: 'preserve' } } })

function fixture(node, { shift = 0, phase = 'story', patch = {}, values = {} } = {}) {
  assert(chapter.steps[node], `Fixture node exists: ${node}`)
  let state = initializeTrilogy({ ...base(), ...values }, chapter, `ch3-parity-${node}`)
  state = patchTrilogy(state, 'ch3', { shift, phase,
    applied: ['checkin:0', 'checkin:1', 'checkin:2', 'checkin:3', 'checkin:4'],
    shop: { shift, buyCount: 0, lotteryCount: 0 } })
  state = enterTrilogyNode(state, chapter, node)
  return patchTrilogy(state, 'ch3', { phase, ...patch })
}
async function loaded() {
  await page.waitForFunction(() => {
    const loader = document.querySelector('[data-chapter-loader]')
    return loader ? ['ready', 'error'].includes(loader.getAttribute('data-status')) : !!document.querySelector('[data-trilogy]')
  }, undefined, { timeout: 120000 })
  const loader = page.locator('[data-chapter-loader]')
  if (await loader.count()) {
    assert.notEqual(await loader.getAttribute('data-status'), 'error', await loader.textContent())
    await page.locator('[data-chapter-enter]').click()
    await loader.waitFor({ state: 'detached', timeout: 120000 })
  }
  await page.locator('[data-trilogy="ch3"]').waitFor()
}
async function enter(initial) {
  await page.evaluate(({ key, initial }) => localStorage.setItem(key, JSON.stringify(initial)), { key, initial })
  await page.goto(`${url}?v=ch3-parity-${++serial}#/ch3`)
  await loaded()
  assert.equal(await page.locator('[data-trilogy-node]').getAttribute('data-trilogy-node'), progress(initial).stepId)
}
async function reload() { await page.reload(); await loaded() }
async function shot(name) {
  await page.locator('img').evaluateAll(rows => Promise.all(rows.filter(i => i.getClientRects().length).map(i => i.decode().catch(() => {}))))
  const path = resolve(output, `${name}.png`)
  await page.screenshot({ path }); report.screenshots.push(path)
}
async function fit(locator, label, hit = false) {
  const box = await locator.evaluate((element, hit) => {
    const r = element.getBoundingClientRect(), target = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
    return { x: r.x, y: r.y, width: r.width, height: r.height, vw: innerWidth, vh: innerHeight,
      hit: !hit || target === element || element.contains(target) }
  }, hit)
  assert(box.width > 0 && box.height > 0 && box.x >= -2 && box.y >= -2 && box.x + box.width <= box.vw + 2
    && box.y + box.height <= box.vh + 2 && box.hit, `${label}: ${JSON.stringify(box)}`)
  return box
}
async function nodeIs(node) {
  await page.waitForFunction(({ key, node }) => JSON.parse(localStorage.getItem(key)).dlc.ch3.chapter.stepId === node, { key, node })
  assert.equal(await page.locator('[data-trilogy-node]').getAttribute('data-trilogy-node'), node)
}
async function reveal() {
  const state = await read(), expected = (progress(state).giftReply?.text ?? trilogyStep(state, chapter).text ?? '').replaceAll('**', '')
  const text = page.locator('.dialog-box > p')
  await text.waitFor()
  // Only click while substantial text is still being typed. Otherwise waiting for
  // the last characters avoids accidentally advancing an ordinary short line.
  if (expected.length - (await text.textContent()).length > 15) await page.mouse.click(6, Math.min(240, page.viewportSize().height / 2))
  await page.waitForFunction(length => (document.querySelector('.dialog-box > p')?.textContent.length ?? 0) >= length, expected.length)
}
async function advance() {
  const node = progress(await read()).stepId
  await reveal(); await page.waitForTimeout(350)
  await page.mouse.click(6, Math.min(240, page.viewportSize().height / 2))
  await page.waitForFunction(({ key, node }) => JSON.parse(localStorage.getItem(key)).dlc.ch3.chapter.stepId !== node, { key, node })
}
async function choose(index) {
  await reveal()
  const selector = `[data-dialogue-choice="${index}"]`
  await page.waitForFunction(selector => document.querySelector(selector)?.getAttribute('aria-disabled') === 'false', selector)
  await page.waitForTimeout(350) // A fresh gesture after the real 300 ms quiet period.
  const button = page.locator(selector)
  await button.scrollIntoViewIfNeeded(); await fit(button, `choice ${index}`, true); await button.tap()
}
async function imageIs(locator, id) {
  await locator.waitFor()
  await locator.evaluate(image => image.decode())
  const [identity] = await resolveMediaIdentities(page, [await locator.evaluate(image => image.currentSrc || image.src)])
  assert(identity.paths.includes(`assets/${images[id]}`), `${id}: visible image bytes match the manifest`)
}
async function test(name, fn) {
  if (filter && !filter.test(name)) return
  const row = { name, status: 'running' }; report.cases.push(row)
  try { await fn(row); row.status = 'passed'; console.log(`PASS ${name}`) }
  catch (error) { row.status = 'failed'; row.error = error.stack; await shot(`FAIL-${name}`).catch(() => {}); throw error }
}

try {
  await page.goto(`${url}#/dlc`)
  await page.getByRole('heading', { name: /章节与番外/ }).waitFor({ timeout: 15000 })

  await test('gallstone-observation-and-both-replies', async row => {
    row.nodes = ['c3_s1_stone_4', 'c3_s1_shadow_good', 'c3_s1_shadow_retry']
    for (const [index, target] of ['c3_s1_shadow_good', 'c3_s1_shadow_retry'].entries()) {
      await enter(fixture('c3_s1_stone_4'))
      await reveal()
      await imageIs(page.locator('.trilogy-story-image img'), 'us_gallstone')
      assert.equal(await page.locator('.sprite-l,.sprite-r').count(), 0, 'Observation is not obscured by patient/teacher portraits')
      await fit(page.locator('.trilogy-story-image img'), 'gallstone observation image')
      await shot(`gallstone-choice-${index}`)
      await choose(index); await nodeIs(target); await reveal()
      await imageIs(page.locator('.trilogy-story-image img'), 'us_gallstone')
      assert.equal(await page.locator('.sprite-l,.sprite-r').count(), 0, 'Reply keeps the image free of portraits')
      await shot(`gallstone-${target}`)
      await advance(); await nodeIs('c3_s1_shadow_0')
    }
  })

  await test('shift-end-deliberate-settlement', async row => {
    row.fixture = 'c3_s1_gain_3; original entry income already applied'
    const initial = fixture('c3_s1_gain_3')
    await enter(initial)
    // Span typing and the full 900 ms buffer while tapping outside the panel.
    for (let i = 0; i < 15; i++) { await page.touchscreen.tap(6, 220); await page.waitForTimeout(110) }
    assert.equal(progress(await read()).phase, 'story')
    assert.equal(progress(await read()).stepId, 'c3_s1_gain_3')
    assert.equal((await read()).gold, initial.gold, 'Background taps neither settle nor duplicate salary')
    await reveal()
    const settle = page.locator('[data-trilogy-settle]')
    assert.match(await settle.textContent(), /本班结束 · 结算 →/)
    await shot('shift-end-deliberate-button')
    await choose(Number(await settle.getAttribute('data-dialogue-choice')))
    await page.locator('[data-ch3-settlement]').waitFor()
    assert.equal(progress(await read()).phase, 'settle')
    assert.equal(progress(await read()).shift, 0)
    assert.equal((await read()).gold, initial.gold)
    await page.touchscreen.tap(6, 220)
    assert.equal(progress(await read()).phase, 'settle', 'Later background tap cannot start the next shift')
    await reload()
    assert.equal(progress(await read()).phase, 'settle')
    assert.equal((await read()).gold, initial.gold, 'Settlement refresh does not pay again')
  })

  await test('settlement-values-fixed-navigation-and-certificate', async row => {
    row.viewports = [{ width: 390, height: 780 }, { width: 844, height: 390 }]
    const snapshots = { '0': { gold: 1000, skill: 4, heart: 3, wealth: 2 }, '4': { gold: 1280, skill: 7, heart: 7, wealth: 4 } }
    const initial = fixture('c3_s5_notice_end_5', { shift: 4, phase: 'settle', patch: { snapshots } })
    for (const size of row.viewports) {
      await page.setViewportSize(size); await enter(initial)
      const root = page.locator('[data-ch3-settlement]'), nav = root.getByRole('navigation', { name: '班后功能' })
      assert.match(await root.textContent(), /准备好再去晨会/)
      assert.match(await root.locator('[data-trilogy-next-shift]').textContent(), /前往晨会/)
      for (const metric of ['gold', 'skill', 'heart', 'wealth']) {
        const stat = root.locator(`[data-ch3-stat="${metric}"]`)
        assert.match(await stat.locator('strong').textContent(), new RegExp(`^${initial[metric]}(?: 金币| 点)$`))
        const delta = initial[metric] - snapshots['4'][metric]
        assert((await stat.textContent()).includes(`本班 ${delta > 0 ? '+' : ''}${delta}`), `${metric}: actual shift delta`)
        if (metric !== 'gold') assert.equal((await stat.textContent()).match(/[🟡🟣]/gu)?.length, 5, `${metric}: five original-style beads`)
      }
      const before = await fit(nav, 'fixed settlement navigation')
      for (const button of await nav.locator('button').all()) await fit(button, 'settlement action', true)
      await root.locator('[data-ch3-settlement-scroll]').evaluate(e => { e.scrollTop = e.scrollHeight })
      const after = await fit(nav, 'navigation after body scroll')
      assert(Math.abs(after.y - before.y) <= 1, 'Scrolling the records does not move the action bar')
      await shot(`settlement-fixed-${size.width}`)
    }
    // This is a pre-existing, valid completed record, not a claim of another full run.
    let historical = patchTrilogy(initial, 'ch3', { phase: 'done', done: true, quizContent: chapter.quiz,
      quiz: { index: 4, completed: true, rewarded: true, grade: 'S', questions: chapter.quiz.slice(0, 5).map((q, i) => ({ question: i, order: [0, 1, 2, 3], selected: q.answer })) } })
    historical = issueTrilogyCertificate(historical, chapter, '定点恢复同学', 'CH3-PARITY')
    const certificate = progress(historical).certificate
    assert(certificate)
    await page.setViewportSize({ width: 390, height: 780 }); await enter(historical)
    assert.equal(await page.locator('[data-trilogy-next-shift]').count(), 0)
    assert.equal(await page.locator('[data-trilogy-certificate] code').textContent(), certificate.code)
    for (const metric of ['gold', 'skill', 'heart', 'wealth']) {
      const delta = historical[metric] - snapshots['0'][metric]
      assert((await page.locator(`[data-ch3-stat="${metric}"]`).textContent()).includes(`本章 ${delta > 0 ? '+' : ''}${delta}`))
    }
    await shot('completed-certificate-summary')
    await reload()
    assert.equal(progress(await read()).phase, 'done')
    assert.deepEqual(progress(await read()).certificate, certificate, 'Existing receipt survives the new summary and reload')
    assert.equal((await read()).gold, historical.gold)
    row.certificate = certificate.code
  })

  await test('paper-book-five-unlock-boundaries-no-page-reward', async row => {
    row.unlocked = []
    for (let shift = 0; shift < 5; shift++) {
      await page.setViewportSize(shift === 4 ? { width: 844, height: 390 } : { width: 390, height: 780 })
      const node = `c3_s${shift + 1}_hub`, initial = fixture(node, { shift })
      await enter(initial)
      await page.getByRole('button', { name: '📚 旧书', exact: true }).click()
      const book = page.locator('[data-ch3-book]'); await book.waitFor()
      const paper = book.locator(':scope > section')
      assert.equal(await paper.evaluate(e => e.classList.contains('bg-amber-50')), true, 'Yellow paper surface is present')
      assert.equal(await book.locator('details').count(), 0, 'Book is paginated, not the old dark accordion')
      assert.match(await book.textContent(), new RegExp(`现已解锁 ${(shift + 1) * 4} 页`))
      assert.match(await book.locator('header span').textContent(), new RegExp(`第 ${shift * 4 + 1} 页`))
      await page.waitForFunction(({ key, skill }) => JSON.parse(localStorage.getItem(key)).skill === skill, { key, skill: initial.skill + 1 })
      const opened = await read()
      assert(opened.flags[`c3_book_${shift}`])
      for (let i = 0; i < 3; i++) await book.getByRole('button', { name: '下一页 →', exact: true }).click()
      assert.match(await book.locator('header span').textContent(), new RegExp(`第 ${(shift + 1) * 4} 页`))
      assert.equal(await book.getByRole('button', { name: '下一页 →', exact: true }).count(), 0)
      assert.match(await book.textContent(), shift < 4 ? /后续四页：下一班次解锁/ : /全书完/)
      await book.getByRole('button', { name: '← 上一页', exact: true }).click()
      assert.equal((await read()).skill, opened.skill, 'Turning pages never awards extra skill')
      await fit(book.locator('[data-trilogy-close-overlay]'), 'book close action', true)
      if (shift === 0 || shift === 4) await shot(`paper-book-shift-${shift + 1}`)
      await book.locator('[data-trilogy-close-overlay]').click()
      await nodeIs(node)
      assert.equal((await read()).ap, initial.ap)
      await page.getByRole('button', { name: '📚 旧书', exact: true }).click()
      await page.locator('[data-ch3-book]').waitFor()
      assert.equal((await read()).skill, opened.skill, 'Reopening the same shift does not repeat its reward')
      await page.locator('[data-ch3-book] [data-trilogy-close-overlay]').click()
      row.unlocked.push((shift + 1) * 4)
    }
  })

  await test('coffee-pending-reload-and-final-shift-stop', async () => {
    await page.setViewportSize({ width: 390, height: 780 })
    const initial = fixture('c3_s1_gain_3', { phase: 'settle' })
    await enter(initial)
    const openShop = async () => page.locator('[data-ch3-settlement]').getByRole('button', { name: '🛒 小卖部', exact: true }).click()
    await openShop()
    const coffee = page.locator('[data-trilogy-buy="coffee"]')
    assert.equal(await coffee.isEnabled(), true)
    await coffee.click()
    await page.waitForFunction(key => !!JSON.parse(localStorage.getItem(key)).dlc.ch3.chapter.pendingCoffee, key)
    assert.equal((await read()).gold, initial.gold - 30)
    assert.equal((await read()).ap, initial.ap, 'After-shift coffee is saved for next exploration')
    assert.equal(await coffee.isDisabled(), true)
    assert.match(await coffee.textContent(), /已留一杯/)
    await shot('coffee-pending-disabled')
    await reload(); await openShop()
    assert.equal(await coffee.isDisabled(), true)
    assert.match(await coffee.textContent(), /已留一杯/)
    assert.equal((await read()).gold, initial.gold - 30)
    await enter(fixture('c3_s5_notice_end_5', { shift: 4, phase: 'settle' })); await openShop()
    assert.equal(await coffee.isDisabled(), true)
    assert.match(await coffee.textContent(), /本章停售/)
    assert.match(await page.locator('.trilogy-shop-row').filter({ has: coffee }).textContent(), /后面没有自由探索/)
    await shot('coffee-final-shift-unavailable')
  })

  await test('call-counterpart-persists-through-protagonist-reply', async row => {
    await page.setViewportSize({ width: 390, height: 780 })
    row.calls = []
    for (const { node, shift, name, sprite } of [
      { node: 'c3_intro_call_2', shift: 0, name: '表姐', sprite: 'pat_cousin' },
      { node: 'c3_s4_zhou_1', shift: 3, name: '老周', sprite: 'char_zhou' },
      { node: 'c3_s4_wen_2', shift: 3, name: '雯雯', sprite: 'char_wen' },
    ]) {
      await enter(fixture(node, { shift })); await reveal()
      const card = page.locator('.trilogy-communication')
      await card.waitFor(); await fit(card, `${name} contact card`)
      assert.match(await card.textContent(), new RegExp(name))
      assert(!/林小满|陈一帆|手机消息/.test(await card.textContent()))
      await imageIs(card.locator('img'), sprite)
      assert.equal(await page.locator('.sprite-l,.sprite-r').count(), 0, 'The remote caller is not also standing in the room')
      await shot(`call-${node}`)
      // Walk the remaining ordinary lines of this actual call, not another fixture.
      let steps = 0
      while (await card.count()) {
        assert(++steps <= 5, `${name} call has a finite exit`)
        await advance()
        if (await card.count()) assert.match(await card.textContent(), new RegExp(name))
      }
      assert.equal(await page.getByAltText('来电头像', { exact: true }).count(), 0, 'Call avatar is cleared when the call ends')
      row.calls.push({ node, name, exit: progress(await read()).stepId })
    }
  })

  await test('mobile-echo-and-m-mode-labels-controls-exit', async row => {
    await page.setViewportSize({ width: 390, height: 780 }); row.tasks = []
    for (const { node, shift, label } of [
      { node: 'c3_s1_gain_1', shift: 0, label: '反射界面深度' },
      { node: 'c3_s3_motion_2', shift: 2, label: '沿时间回看' },
    ]) {
      await enter(fixture(node, { shift }))
      const lab = page.locator('[data-trilogy-lab]'), svg = lab.locator('.trilogy-course-view svg')
      await lab.waitFor(); await fit(svg, 'visible diagram')
      assert.match(await svg.getAttribute('aria-label'), node.includes('motion') ? /B图.*M模式/ : /回波时间.*深度.*亮点/)
      const main = lab.getByRole('slider', { name: label, exact: true })
      await main.scrollIntoViewIfNeeded(); await fit(main, 'primary slider', true)
      await main.focus(); await main.press('Home')
      const before = await svg.innerHTML()
      // 70% is intentionally not a periodic end point of the M-mode motion.
      for (let i = 0; i < 7; i++) await main.press('PageUp')
      if (node.includes('gain')) {
        const pulse = lab.getByRole('button', { name: '发出脉冲，扫过四条线', exact: true })
        await pulse.scrollIntoViewIfNeeded(); await fit(pulse, 'pulse control', true); await pulse.click()
        assert.match(await svg.textContent(), /B图 · 4 条线/)
      }
      assert.notEqual(await svg.innerHTML(), before, 'The control changes the actual diagram')
      const labels = await svg.locator('text').evaluateAll(nodes => nodes.map(e => ({ text: e.textContent,
        height: e.getBoundingClientRect().height, fontSize: Number.parseFloat(getComputedStyle(e).fontSize) })))
      assert(labels.length >= 3 && labels.every(label => label.height >= 8 && label.fontSize >= 17), 'Mobile diagram labels remain legible')
      await fit(lab.locator('[data-trilogy-tool-done]'), 'exit action without scrolling the page', true)
      await shot(`mobile-${chapter.steps[node].tool.task}`)
      assert(progress(await read()).tools[node], 'Parameter changes saved through the real updater')
      if (node.includes('gain')) {
        const optional = lab.getByText('再看看回波强弱', { exact: true })
        await optional.scrollIntoViewIfNeeded(); await optional.click()
        const strength = lab.getByRole('slider', { name: '反射强弱', exact: true })
        await strength.scrollIntoViewIfNeeded(); await fit(strength, 'optional control after inner scroll', true)
        await strength.focus(); await strength.press('End')
      }
      await lab.locator('[data-trilogy-tool-done]').click()
      await nodeIs(chapter.steps[node].tool.next)
      assert(progress(await read()).tools[node].completed)
      row.tasks.push({ node, labels })
    }
  })

  assert.equal(report.errors.length, 0, `Browser errors: ${report.errors.join('\n')}`)
  report.status = 'passed'
} catch (error) {
  report.status = 'failed'; report.error = error.stack
  process.exitCode = 1
} finally {
  report.finished = new Date().toISOString()
  report.seconds = Math.round((Date.parse(report.finished) - Date.parse(report.started)) / 1000)
  await read().then(state => { report.lastState = state }).catch(() => {})
  writeFileSync(resolve(output, 'ch3-parity-browser.json'), JSON.stringify(report, null, 2))
  await browser.close()
  console.log(`${report.status}: ${report.cases.filter(row => row.status === 'passed').length}/${report.cases.length}; ${report.seconds}s; ${output}`)
  if (report.error) console.error(report.error)
}
