// Third-round focused browser checks, NOT another full chapter playthrough.
// Run only after the final production build is explicitly ready:
// TRILOGY_FOCUSED_READY=1 node --import tsx tests/trilogy-focused.mjs
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { TRILOGY } from '../src/game/trilogy-registry.ts'
import { TRILOGY_DOCUMENTS } from '../src/game/trilogy-documents.ts'
import { TRILOGY_COMMUNICATION_CUES } from '../src/game/trilogy-communications.ts'
import { freshState } from '../src/game/store.ts'
import { initializeTrilogy, patchTrilogy, enterTrilogyNode, trilogyStep } from '../src/game/trilogy-session.ts'
import { awaitChapterEntry } from './chapter-entry-driver.mjs'
import { resolveMediaIdentities, waitForImageAsset } from './media-identity-driver.mjs'

assert.equal(process.env.TRILOGY_FOCUSED_READY, '1', 'Wait for the third production build; this script never builds.')
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const output = resolve(process.env.TRILOGY_OUTPUT || '../../trilogy-review-20261010/pass-3-focused')
const url = (process.env.GAME_URL || 'http://127.0.0.1:8798/').replace(/#.*$/, '')
const key = 'midnight-radiology-save-v1'
const catalog = JSON.parse(readFileSync(new URL('../src/lib/image-assets.catalog.json', import.meta.url), 'utf8'))
const manifest = JSON.parse(readFileSync(new URL('../src/lib/media-manifest.generated.json', import.meta.url), 'utf8'))
const focusedFilter = process.env.TRILOGY_FOCUSED_FILTER ? new RegExp(process.env.TRILOGY_FOCUSED_FILTER) : undefined
const report = { kind: 'third-round-focused-not-full-walk', started: new Date().toISOString(), cases: [] }
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ headless: true, ...(process.env.EDGE_TEST === '1' ? { channel: 'msedge' }
  : process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })

function base() {
  return { ...freshState('f'), seed: 20261010, gold: 2200, skill: 7, heart: 6, wealth: 5,
    durability: 83, lastCheckin: new Date().toISOString().slice(0, 10), streak: 2,
    stepId: 'n1_s0', screenHint: 'night', viewBg: 'bg_control', resumeKey: '1-n1_s0', items: ['milktea', 'snack'], ap: 3,
    flags: { old_history_marker: true }, cards: [], events: [], badges: ['old_badge'], stamps: [1],
    playerName: '原主角姓名', playerId: 'UNCHANGED-OLD-ID',
    dlc: { ch2: { shift: 'c2n1', stepId: 'c2n1_0', viewBg: 'bg_ctcontrol' },
      ldct: { done: true, marker: 'preserve-ldct' }, dr: { done: true }, dsa: { done: true } } }
}
function fixture(id, node, shift = 0) {
  const chapter = TRILOGY[id]
  assert(chapter.steps[node], `${id} fixture node exists: ${node}`)
  let s = initializeTrilogy(base(), chapter)
  s = patchTrilogy(s, id, { shift, applied: [`checkin:${shift}`], visited: [],
    snapshots: { [shift]: { gold: s.gold, skill: s.skill, heart: s.heart, wealth: s.wealth } },
    shop: { shift, lotteryCount: 0, buyCount: 0 } })
  s.cards = Object.keys(chapter.cards)
  return enterTrilogyNode(s, chapter, node)
}
const protectedFields = s => Object.fromEntries(['gender', 'night', 'durability', 'lastCheckin', 'streak', 'finished',
  'stepId', 'screenHint', 'playerName', 'playerId', 'seed'].map(name => [name, s[name]]))

async function run(name, fn, initial = base(), viewport = { width: 844, height: 390 }) {
  if (focusedFilter && !focusedFilter.test(name)) return
  const row = { name, started: new Date().toISOString(), screenshots: [], errors: [], observations: [] }
  report.cases.push(row)
  const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 1 })
  await context.addInitScript(({ initial, key }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(initial))
    // Isolated fixture authorization for the pre-existing second-chapter entry.
    localStorage.setItem('mr-ch2-unlock', '1')
    window.__mediaCalls = []
    HTMLMediaElement.prototype.play = function () { window.__mediaCalls.push({ kind: 'play', src: this.src }); return Promise.resolve() }
    HTMLMediaElement.prototype.pause = function () { window.__mediaCalls.push({ kind: 'pause', src: this.src }) }
  }, { initial, key })
  const page = await context.newPage()
  page.setDefaultTimeout(15000)
  page.on('pageerror', error => row.errors.push({ kind: 'pageerror', message: error.message }))
  page.on('response', response => { if (response.status() >= 400) row.errors.push({ kind: 'http', status: response.status(), url: response.url() }) })
  page.on('requestfailed', request => { if (!request.failure()?.errorText?.includes('ERR_ABORTED')) row.errors.push({ kind: 'requestfailed', url: request.url(), error: request.failure()?.errorText }) })
  let lastInput = 0
  const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)
  const quiet = async (ms = 335) => { if (Date.now() - lastInput < ms) await page.waitForTimeout(ms - (Date.now() - lastInput)) }
  const tap = async locator => { await quiet(); await locator.tap(); lastInput = Date.now() }
  const screen = async suffix => { const path = resolve(output, `${name}-${suffix}.png`); await page.screenshot({ path }); row.screenshots.push(path) }
  async function entry(id) {
    await page.locator('[data-chapter-loader], [data-trilogy]').first().waitFor({ timeout: 120000 })
    if (await page.locator('[data-chapter-loader]').count()) await awaitChapterEntry(page)
    await page.locator(`[data-trilogy="${id}"]`).waitFor()
    const portraitNotice = page.getByRole('button', { name: '不了，竖屏也能玩', exact: true })
    const expectsPortraitNotice = await page.evaluate(() => !sessionStorage.getItem('mr-rotate-dismissed')
      && innerHeight > innerWidth && (navigator.maxTouchPoints > 0 || 'ontouchstart' in window)
      && document.fullscreenEnabled && typeof screen.orientation?.lock === 'function')
    if (expectsPortraitNotice) {
      await portraitNotice.waitFor({ timeout: 4000 })
      await tap(portraitNotice)
      await portraitNotice.waitFor({ state: 'detached' })
    }
    lastInput = Date.now()
  }
  async function fit(locator, label, hit = false) {
    const box = await locator.evaluate((e, hit) => {
      const r = e.getBoundingClientRect(), target = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
      return { x: r.x, y: r.y, w: r.width, h: r.height, vw: innerWidth, vh: innerHeight,
        hit: !hit || target === e || e.contains(target) }
    }, hit)
    assert(box.w > 0 && box.h > 0 && box.x >= -2 && box.y >= -2 && box.x + box.w <= box.vw + 2 && box.y + box.h <= box.vh + 2,
      `${label} fits visible viewport: ${JSON.stringify(box)}`)
    assert(box.hit, `${label} has an unoccluded activation point`)
  }
  async function media(id, locator) {
    if (TRILOGY_DOCUMENTS[id]) { await page.locator('.trilogy-document').waitFor(); return }
    assert(catalog[id], `Registered image ${id}`)
    await waitForImageAsset(page, `assets/${catalog[id]}`)
    if (locator) {
      const identities = await resolveMediaIdentities(page, [await locator.getAttribute('src')])
      assert(identities[0].paths.includes(`assets/${catalog[id]}`), `${id} appears in the intended layer`)
    }
  }
  async function reveal(id) {
    const s = await read(), p = s.dlc[id].chapter, step = trilogyStep(s, TRILOGY[id])
    const text = (p.giftReply?.text ?? step.text ?? '').replaceAll('**', '')
    const para = page.locator('.dialog-box > p')
    await para.waitFor(); await quiet()
    if (text.length - (await para.textContent()).length > 15) { await para.tap(); lastInput = Date.now() }
    await page.waitForFunction(text => document.querySelector('.dialog-box > p')?.textContent === text, text)
    await quiet(); assert.equal(await para.textContent(), text, 'Completed dialogue remains complete')
    return { s, p, step, text }
  }
  async function advance(id) {
    const { p, step } = await reveal(id)
    assert(!step.choices?.length && !p.giftReply, 'Focused linear advance must not bypass a choice')
    await page.locator('.dialog-box > span.animate-bounce').waitFor()
    await tap(page.locator('.dialog-box > p'))
    await page.waitForFunction(({ key, id, old }) => JSON.parse(localStorage.getItem(key)).dlc[id].chapter.stepId !== old,
      { key, id, old: p.stepId })
  }
  try {
    await fn({ page, context, row, read, tap, screen, entry, fit, media, reveal, advance, quiet })
    assert.deepEqual(row.errors, [], 'No unexpected page/network failures')
    assert.deepEqual(protectedFields(await read()), protectedFields(initial), 'Legacy main-save identity/cursor fields unchanged')
    row.status = 'passed'; console.log(`PASS focused ${name}`)
  } catch (error) {
    row.status = 'failed'; row.error = error.stack ?? String(error)
    row.lastState = await read().catch(() => null)
    await screen('failure').catch(() => {})
    console.error(`FAIL focused ${name}: ${error.message}`)
  } finally {
    row.finished = new Date().toISOString()
    writeFileSync(resolve(output, `${name}.json`), JSON.stringify(row, null, 2))
    await context.close()
  }
}

try {
  const old = JSON.parse(execFileSync('git', ['show', 'HEAD:app/src/lib/media-manifest.generated.json'], { encoding: 'utf8', cwd: resolve('..') }))
  for (const id of ['ch1', 'ch2', 'dr', 'dsa']) {
    assert.deepEqual([...manifest.chapters[id]].sort(), [...old.chapters[id]].sort(), `${id}: original media membership`)
    for (const path of old.chapters[id]) assert.deepEqual(manifest.assets[path], old.assets[path], `${id}: original media bytes ${path}`)
  }
  report.legacyMedia = 'HEAD ch1/ch2/dr/dsa groups and per-file bytes/hash unchanged'

  const tools = [
    { id: 'ch3', node: 'c3_s1_aunt_6', image: 'us_breast', after: 'c3_s1_aunt_8', shift: 0 },
    { id: 'ch4', node: 'c4_1_tool', image: 'mri_wrist', after: 'c4_1_result_0', shift: 0 },
    { id: 'ch5', node: 'c5_s2_fusion', image: 'pet_lung', after: 'c5_s2_image_q', shift: 1 },
  ]
  for (const item of tools) await run(`${item.id}-landscape-tool-image-offline`, async t => {
    const { page, context, entry, media, fit, tap, read, advance, screen, row } = t
    await page.goto(`${url}#/${item.id}`); await entry(item.id)
    await context.setOffline(true)
    const lab = page.locator('[data-trilogy-lab]')
    await fit(lab, 'Landscape laboratory')
    if (item.id === 'ch3') {
      for (const probe of ['线阵', '凸阵', '相控阵']) await tap(lab.getByRole('button', { name: probe, exact: true }))
      const range = lab.locator('input[type=range]')
      await range.focus(); await range.press('End')
      const labelPixels = await page.locator('[data-ultrasound-phantom]').evaluate(canvas => {
        const data = canvas.getContext('2d').getImageData(20, 8, 125, 15).data
        let count = 0; for (let i = 0; i < data.length; i += 4) if (data[i] > 100 && data[i + 1] > 100) count++
        return count
      })
      assert(labelPixels > 100, 'B-MODE frequency label remains visible after multiple redraws; no inherited right alignment')
      row.observations.push({ labelPixels })
      await fit(page.locator('[data-ultrasound-phantom]'), 'Landscape B-mode canvas')
    } else if (item.id === 'ch4') {
      await tap(lab.getByRole('button', { name: 'T2', exact: true }))
      await media('mri_wrist_t2', lab.locator('img[alt="当前图像"]'))
    } else {
      const baseLayer = lab.locator('img[alt="当前图像"]'), uptake = lab.locator('img[alt="PET摄取层"]')
      await media('pet_fusion_ct', baseLayer); await media('pet_fusion', uptake)
      const fixed = await baseLayer.getAttribute('style'), before = await uptake.getAttribute('style')
      await lab.getByLabel('主要调节', { exact: true }).press('End')
      await page.waitForFunction(before => document.querySelector('img[alt="PET摄取层"]').getAttribute('style') !== before, before)
      assert.equal(await baseLayer.getAttribute('style'), fixed, 'CT anatomy is fixed while the pure uptake layer moves')
      assert.equal(await uptake.evaluate(e => getComputedStyle(e).opacity), '0.65')
      await fit(baseLayer, 'CT base'); await fit(uptake, 'Shifted uptake layer')
    }
    await fit(page.locator('[data-trilogy-tool-done]'), 'Landscape continue button', true)
    await screen('tool')
    await tap(page.locator('[data-trilogy-tool-done]'))
    await page.waitForFunction(({ key, id, node }) => JSON.parse(localStorage.getItem(key)).dlc[id].chapter.stepId !== node, { key, id: item.id, node: item.node })
    if (item.id === 'ch3') {
      const { text } = await t.reveal(item.id)
      assert.match(text, /你刚才那支看得更深/); assert(!text.startsWith('对，'), 'Wrong probe is not falsely praised')
    }
    for (let i = 0; (await read()).dlc[item.id].chapter.stepId !== item.after && i < 4; i++) await advance(item.id)
    assert.equal((await read()).dlc[item.id].chapter.stepId, item.after)
    await media(item.image); await fit(page.locator('.trilogy-story-image img'), 'Landscape case image')
    await screen('image-offline')
    await tap(page.getByRole('button', { name: '📖 手册', exact: true }))
    assert.equal(await page.locator('.trilogy-modal article').count(), Object.keys(TRILOGY[item.id].cards).length)
    const last = page.locator('.trilogy-modal article').last(); await last.scrollIntoViewIfNeeded()
    await fit(page.locator('[data-trilogy-close-overlay]'), 'Offline manual close', true)
    await screen('manual-offline')
  }, fixture(item.id, item.node, item.shift))

  await run('ch3-low-gain-feedback', async t => {
    await t.page.goto(`${url}#/ch3`); await t.entry('ch3')
    await t.page.locator('[data-trilogy-lab] input[type=range]').press('Home')
    await t.tap(t.page.locator('[data-trilogy-tool-done]'))
    await t.page.locator('[data-trilogy-node="c3_s1_gain_2"]').waitFor()
    const { text } = await t.reveal('ch3')
    assert.match(text, /这版还暗/); assert.match(text, /调整前那张也留着/)
    assert.equal((await t.read()).dlc.ch3.chapter.tools.c3_s1_gain_1.value, 0)
    await t.screen('feedback')
  }, fixture('ch3', 'c3_s1_gain_1'))

  await run('ch3-assisted-linear-feedback', async t => {
    await t.page.goto(`${url}#/ch3`); await t.entry('ch3')
    const lab = t.page.locator('[data-trilogy-lab]')
    await t.tap(lab.getByRole('button', { name: '线阵', exact: true }))
    await t.tap(lab.locator('summary'))
    const help = lab.getByRole('button', { name: '一起看过了，回到故事', exact: true })
    await help.scrollIntoViewIfNeeded(); await t.fit(help, 'Assisted completion button', true)
    await t.tap(help)
    await t.page.locator('[data-trilogy-node="c3_s1_aunt_7"]').waitFor()
    const { text } = await t.reveal('ch3')
    assert.equal((await t.read()).dlc.ch3.chapter.tools.c3_s1_aunt_6.choice, 'assisted:线阵')
    assert.equal(text, TRILOGY.ch3.steps.c3_s1_aunt_7.text, 'Assisted correct probe receives the same accurate linear-probe explanation')
    await t.screen('correct-help-feedback')
  }, fixture('ch3', 'c3_s1_aunt_6'))

  for (const id of ['ch3', 'ch4', 'ch5']) {
    const chapter = TRILOGY[id]
    const [hub] = Object.entries(chapter.steps).find(([node, step]) => /hub$/.test(node) && step.choices?.length >= 4)
    await run(`${id}-landscape-long-menu`, async t => {
      await t.page.goto(`${url}#/${id}`); await t.entry(id); await t.reveal(id)
      await t.fit(t.page.locator('.dialog-wrap'), 'Scrollable landscape dialogue viewport')
      const buttons = t.page.locator('.choice-in button')
      assert(await buttons.count() >= 4)
      for (let i = 0; i < await buttons.count(); i++) {
        await buttons.nth(i).scrollIntoViewIfNeeded(); await t.fit(buttons.nth(i), `Answer ${i}`, true)
      }
      await t.screen('last-answer-visible')
      await t.page.waitForFunction(e => e.getAttribute('aria-disabled') === 'false', await buttons.last().elementHandle())
      await t.tap(buttons.last())
      await t.page.waitForFunction(({ key, id, hub }) => JSON.parse(localStorage.getItem(key)).dlc[id].chapter.stepId !== hub, { key, id, hub })
    }, fixture(id, hub))
    const [gift] = Object.entries(chapter.steps).find(([, step]) => step.giftTo && !step.tool)
    await run(`${id}-offline-in-person-gift`, async t => {
      await t.page.goto(`${url}#/${id}`); await t.entry(id); await t.context.setOffline(true)
      await t.reveal(id)
      const button = t.page.locator('.choice-in button').filter({ hasText: '把奶茶递过去' })
      await button.scrollIntoViewIfNeeded()
      await t.page.waitForFunction(e => e.getAttribute('aria-disabled') === 'false', await button.elementHandle())
      await t.tap(button)
      await t.page.waitForFunction(({ key, id }) => !!JSON.parse(localStorage.getItem(key)).dlc[id].chapter.giftReply, { key, id })
      const s = await t.read(), reply = s.dlc[id].chapter.giftReply
      assert(!s.items.includes('milktea')); assert.equal(reply.person, chapter.steps[gift].giftTo)
      const sprite = chapter.characters[reply.person]?.sprite
      if (sprite) await t.media(sprite)
      await t.reveal(id); await t.screen('gift-reply')
    }, fixture(id, gift))
  }

  // Network delays hold real responses; they do not patch admission or timers.
  for (const phase of ['runtime', 'media']) for (const action of ['cancel', 'switch']) await run(`loading-${phase}-${action}`, async t => {
    let release, intercepted
    const gate = new Promise(resolve => { release = resolve }), seen = new Promise(resolve => { intercepted = resolve })
    const pattern = phase === 'runtime' ? '**/TrilogyEntry-*.js' : `**/assets/${catalog.bg_us_room}*`
    await t.page.route(pattern, async route => { intercepted(); await gate; await route.continue().catch(() => {}) })
    try {
      await t.page.goto(`${url}#/ch3`, { waitUntil: 'domcontentloaded' })
      await Promise.race([seen, new Promise((_, reject) => setTimeout(() => reject(new Error(`Did not intercept ${pattern}`)), 15000))])
      assert.equal((await t.read()).dlc.ch3, undefined, 'Pending entry must not initialize a chapter')
      if (phase === 'media') await t.page.locator('[data-chapter-loader][data-chapter="ch3"]').waitFor()
      if (action === 'cancel') await t.tap(t.page.getByRole('button', { name: '返回大厅', exact: true }))
      else await t.page.evaluate(() => { location.hash = '#/ch4' })
      release()
      if (action === 'cancel') {
        await t.page.locator('[data-enter-trilogy="ch4"]').waitFor({ timeout: 120000 })
        await t.page.waitForTimeout(350)
        assert.deepEqual(await t.read(), base(), 'Cancelled target cannot save a cursor or reward')
        await t.tap(t.page.locator('[data-enter-trilogy="ch4"]'))
      }
      await t.entry('ch4')
      const s = await t.read()
      assert.equal(s.dlc.ch3, undefined); assert(s.dlc.ch4.chapter)
      assert.equal(s.gold, 2200, 'Loading and target switching award no check-in gold')
      await t.screen('correct-target')
    } finally { release() }
  })

  for (const cue of [
    { id: 'ch3', node: 'c3_s2_start_1', shift: 1 }, { id: 'ch3', node: 'c3_s4_zhou_0', shift: 3 },
    { id: 'ch4', node: 'c4_5_family_0', shift: 4 }, { id: 'ch5', node: 'c5_s3_lei_0', shift: 2 },
  ]) await run(`${cue.id}-${cue.node}-cue-once`, async t => {
    const expected = TRILOGY_COMMUNICATION_CUES[cue.node]
    assert(expected)
    await t.page.goto(`${url}#/${cue.id}`); await t.entry(cue.id)
    await t.page.waitForFunction(({ key, id, node }) => JSON.parse(localStorage.getItem(key)).dlc[id].chapter.heardCues?.includes(node), { key, id: cue.id, node: cue.node })
    const calls = await t.page.evaluate(() => window.__mediaCalls.filter(row => row.kind === 'play'))
    assert.equal(calls.length, 1, 'Exactly one arrival sound')
    const identity = await resolveMediaIdentities(t.page, [calls[0].src])
    assert(identity[0].paths.includes(`audio/ch2_mobile_${expected === 'call' ? 'call' : 'message'}_v1.mp3`))
    await t.reveal(cue.id)
    assert.equal((await t.page.evaluate(() => window.__mediaCalls.filter(row => row.kind === 'pause'))).length, 0,
      'Saving heardCues must not immediately stop the sound via a stale effect closure')
    const before = await t.read()
    await t.page.reload(); await t.entry(cue.id)
    assert.deepEqual(await t.read(), before, 'Same-node refresh keeps cue receipt and all state')
    assert.equal((await t.page.evaluate(() => window.__mediaCalls.filter(row => row.kind === 'play'))).length, 0, 'No replay on same-node reload')
    await t.advance(cue.id); await t.advance(cue.id)
    assert.equal((await t.page.evaluate(() => window.__mediaCalls.filter(row => row.kind === 'play'))).length, 0, 'Follow-up conversation lines remain silent')
    await t.screen('followup-silent')
  }, fixture(cue.id, cue.node, cue.shift))

  const [beforeCh4End] = Object.entries(TRILOGY.ch4.steps).find(([, step]) => step.next === 'c4_epilogue_end')
  await run('ch4-ending-microglow-preview', async t => {
    await t.page.goto(`${url}#/ch4`); await t.entry('ch4')
    await t.page.locator('[data-scene-background="bg_breakroom"]').waitFor()
    await t.advance('ch4')
    const { p, text } = await t.reveal('ch4')
    assert.equal(p.stepId, 'c4_epilogue_end'); assert.match(text, /下一章：微光/); assert(!text.includes('下一章：示踪'))
    await t.page.locator('[data-scene-background="bg_mri_corridor"]').waitFor(); await t.media('bg_mri_corridor')
    await t.screen('correct-next-title')
  }, patchTrilogy(fixture('ch4', beforeCh4End, 4), 'ch4', { phase: 'epilogue' }))

  await run('ch5-ending-background-continuity', async t => {
    await t.page.goto(`${url}#/ch5`); await t.entry('ch5')
    for (let n = 5; n <= 13; n++) {
      const node = `c5_epi_after_${n}`, bg = n < 6 ? 'bg_pet_center' : n < 12 ? 'bg_office' : 'bg_ctcontrol_ready'
      await t.page.locator(`[data-trilogy-node="${node}"]`).waitFor()
      await t.page.locator(`[data-scene-background="${bg}"]`).waitFor(); await t.media(bg)
      const { text } = await t.reveal('ch5')
      t.row.observations.push({ node, bg, text })
      if ([5, 6, 7, 11, 12, 13].includes(n)) await t.screen(node)
      await t.advance('ch5')
    }
    await t.page.locator('[data-trilogy-node="c5_epi_teach_q"]').waitFor()
    await t.page.locator('[data-scene-background="bg_ctcontrol_ready"]').waitFor()
    await t.media('char_new_trainee')
    await t.screen('new-trainee-persistent-background')
  }, patchTrilogy(fixture('ch5', 'c5_epi_after_5', 4), 'ch5', { phase: 'epilogue' }))

  await run('story-ch3-wen-original-call', async t => {
    await t.page.goto(`${url}#/ch3`); await t.entry('ch3')
    for (let index = 0; index < 5; index++) {
      const { p, step, text } = await t.reveal('ch3')
      assert.equal(p.stepId, `c3_s4_wen_${index}`)
      t.row.observations.push({ node: p.stepId, text })
      assert(!step.sprite, 'A phone call does not place Wen in the room')
      if (step.phone) await t.media('char_wen', t.page.locator('.trilogy-communication img'))
      if (index === 1) await t.screen('wen-small-phone-portrait')
      if (index < 4) await t.advance('ch3')
    }
    assert.equal((await t.read()).flags.c3_wen_copy_kept, true)
    const before = await t.read()
    await t.page.reload(); await t.entry('ch3')
    assert.deepEqual(await t.read(), before, 'Phone receipt survives reload without rewards repeating')
    await t.advance('ch3')
    assert.equal((await t.read()).dlc.ch3.chapter.stepId, 'c3_s4_han_end_5')
    await t.page.locator('[data-scene-background="bg_us_room"]').waitFor()
  }, fixture('ch3', 'c3_s4_wen_0', 3), { width: 390, height: 844 })

  await run('story-ch4-independent-early-proposal', async t => {
    await t.page.goto(`${url}#/ch4`); await t.entry('ch4')
    const lines = []
    for (let index = 0; index < 4; index++) {
      const { p, text } = await t.reveal('ch4')
      assert.equal(p.stepId, `c4_4_open_${index}`)
      lines.push(text); t.row.observations.push({ node: p.stepId, text })
      if (index === 2) { await t.fit(t.page.locator('.dialog-box > p'), 'Independent proposal clue'); await t.screen('early-proposal-not-just-cable') }
      await t.advance('ch4')
    }
    assert.match(lines.join('\n'), /设备科.*留存.*邮件/)
    assert.match(lines.join('\n'), /起草.*试运行前/)
    assert.equal((await t.read()).dlc.ch4.chapter.stepId, 'c4_4_hub')
    assert(!(await t.read()).flags.c5_lei_origin_verified, 'Chapter four does not invent the chapter-five verdict')
  }, fixture('ch4', 'c4_4_open_0', 3), { width: 390, height: 844 })

  await run('story-ch5-zhou-receiving-handoff', async t => {
    await t.page.goto(`${url}#/ch5`); await t.entry('ch5')
    for (let index = 0; index < 9; index++) {
      const { p, text } = await t.reveal('ch5')
      assert.equal(p.stepId, `c5_pro_receiving_${index}`)
      t.row.observations.push({ node: p.stepId, text })
      if (index === 0) {
        await t.media('pat_oldman'); assert(!text.includes('2024年'), 'No old-history memory without the actual flag')
        await t.screen('elder-not-mystery-patient')
      }
      if (index === 6) { assert.match(text, /没有伸手/); await t.screen('zhou-does-not-take-over') }
      await t.advance('ch5')
    }
    assert.equal((await t.read()).dlc.ch5.chapter.stepId, 'c5_s1_0')
    await t.page.locator('[data-scene-background="bg_pet_center"]').waitFor()
  }, fixture('ch5', 'c5_pro_receiving_0'), { width: 390, height: 844 })

  await run('story-ch5-independent-project-records', async t => {
    await t.page.goto(`${url}#/ch5`); await t.entry('ch5')
    const lines = []
    for (let index = 0; index < 5; index++) {
      const { p, text } = await t.reveal('ch5')
      assert.equal(p.stepId, `c5_s3_records_${index}`)
      lines.push(text); t.row.observations.push({ node: p.stepId, text })
      if (index === 3) await t.screen('independent-cooperation-records')
      await t.advance('ch5')
    }
    assert.match(lines.join('\n'), /首版提案由小雷提交/)
    assert.match(lines.join('\n'), /已付款.*|已领取报酬/)
    assert.equal((await t.read()).flags.c5_lei_origin_verified, true)
    const before = await t.read()
    await t.page.reload(); await t.entry('ch5')
    assert.deepEqual(await t.read(), before)
    await t.page.locator('[data-trilogy-node="c5_s3_evidence_q"]').waitFor()
  }, fixture('ch5', 'c5_s3_records_0', 2), { width: 390, height: 844 })

  for (const history of [false, true]) {
    const initial = fixture('ch5', 'c5_s3_sms_0', 2)
    if (history) initial.flags.c3_wen_copy_kept = true
    await run(`story-ch5-wen-sender-${history ? 'history' : 'neutral'}`, async t => {
      await t.page.goto(`${url}#/ch5`); await t.entry('ch5')
      const lines = []
      for (let turn = 0; turn < 12 && (await t.read()).dlc.ch5.chapter.stepId !== 'c5_s3_end'; turn++) {
        const { p, step, text } = await t.reveal('ch5')
        lines.push(text); t.row.observations.push({ node: p.stepId, text })
        if (step.communication || step.phone) assert(!step.sprite, 'Remote participants never become physical sprites')
        if (step.phone) await t.media(step.phone, t.page.locator('.trilogy-communication img'))
        if (p.stepId === 'c5_s3_sms_5') {
          assert.equal(step.speaker, 'gu'); assert.equal(step.bg, 'bg_pet_control', 'Onsite mentor appears only after the call and return to the control room')
          await t.page.locator('[data-scene-background="bg_pet_control"]').waitFor()
        }
        if (p.stepId === 'c5_s3_sms_reason_3') {
          assert.equal(text.includes('前年那次电话'), history, 'No invented prior call for a direct chapter-five save')
          await t.screen('wen-reason-and-conditional-memory')
        }
        await t.advance('ch5')
      }
      assert.match(lines.join('\n'), /工作号/)
      assert.match(lines.join('\n'), /原件.*拿走|留存件带走/)
      assert(!lines.join('\n').includes('周工'))
      assert.equal((await t.read()).flags.c5_sms_resolved, true)
      assert.equal((await t.read()).dlc.ch5.chapter.stepId, 'c5_s3_end')
      await t.reveal('ch5')
      await t.page.locator('.dialog-box > span.animate-bounce').waitFor()
      await t.tap(t.page.locator('.dialog-box > p'))
      await t.page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).dlc.ch5.chapter.phase === 'settle', key)
      assert.equal((await t.read()).dlc.ch5.chapter.phase, 'settle')
    }, initial, { width: 390, height: 844 })
  }

  await run('legacy-ch1-ch2-entry-preservation', async t => {
    await t.page.goto(url); await t.page.getByRole('button', { name: '▶ 继续夜班（自动存档）', exact: true }).waitFor({ timeout: 120000 })
    await t.tap(t.page.getByRole('button', { name: '▶ 继续夜班（自动存档）', exact: true })); await awaitChapterEntry(t.page)
    await t.tap(t.page.getByRole('button', { name: '回到夜班现场 →', exact: true }))
    await t.page.locator('[data-ch1-step="n1_s0"]').waitFor(); await t.media('bg_control')
    assert.deepEqual(await t.read(), base(), 'Existing first chapter opens without rewriting the fixture')
    await t.screen('first-chapter')
    await t.page.evaluate(() => { location.hash = '#/ch2' }); await awaitChapterEntry(t.page)
    await t.page.locator('[data-ch2-step="c2n1_0"]').waitFor()
    const after = await t.read(); assert.deepEqual(protectedFields(after), protectedFields(base()))
    for (const id of ['ldct', 'dr', 'dsa']) assert.deepEqual(after.dlc[id], base().dlc[id])
    await t.screen('second-chapter')
  })

  await run('teacher-verifier-six-real-certificates', async t => {
    await t.page.goto(url); await t.page.getByRole('button', { name: '教师验证入口', exact: true }).waitFor({ timeout: 120000 })
    await t.tap(t.page.getByRole('button', { name: '教师验证入口', exact: true }))
    await t.tap(t.page.getByRole('button', { name: '校验第三至五章凭证', exact: true }))
    for (const id of ['ch3', 'ch4', 'ch5']) for (const route of ['desktop', 'mobile']) {
      const log = JSON.parse(readFileSync(resolve(output, '..', 'pass-2', `${id}-${route}-flow.json`), 'utf8'))
      assert.equal(log.status, 'passed'); const certificate = log.certificate
      await t.page.getByLabel('选择章节', { exact: true }).selectOption(id)
      for (const field of ['name', 'studentId', 'gold', 'badgeCount', 'code']) await t.page.getByLabel(field, { exact: true }).fill(String(certificate[field]))
      await t.page.getByLabel('评级', { exact: true }).selectOption(certificate.grade)
      await t.tap(t.page.getByRole('button', { name: '校验', exact: true }))
      await t.page.getByText('校验通过', { exact: true }).waitFor()
      await t.screen(`${id}-${route}-valid`)
      await t.page.getByLabel('gold', { exact: true }).fill(String(certificate.gold + 1))
      await t.tap(t.page.getByRole('button', { name: '校验', exact: true }))
      await t.page.getByText('校验失败，请核对凭证字段与章节。', { exact: true }).waitFor()
      t.row.observations.push({ id, route, valid: true, tamperedGoldRejected: true })
    }
    assert.deepEqual(await t.read(), base(), 'Teacher verifier does not mutate player save')
  }, base(), { width: 1280, height: 900 })
} finally {
  report.finished = new Date().toISOString()
  writeFileSync(resolve(output, 'trilogy-focused-summary.json'), JSON.stringify(report, null, 2))
  await browser.close()
}
assert(report.cases.every(row => row.status === 'passed'), 'Focused failures are recorded above; do not count them as passes.')
console.log(`PASS all ${report.cases.length} focused cases; no additional full playthrough claimed.`)
