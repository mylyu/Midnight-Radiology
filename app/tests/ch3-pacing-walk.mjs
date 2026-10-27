// Run only against the main agent's completed build:
// TRILOGY_BUILD_READY=1 node --import tsx tests/ch3-pacing-walk.mjs
// Uses isolated browser contexts and real input. No progression flags, game timers,
// rewards, React state or production guards are patched during a walk.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { TRILOGY } from '../src/game/trilogy-registry.ts'
import { TRILOGY_DOCUMENTS } from '../src/game/trilogy-documents.ts'
import { trilogyStep, trilogyCredential, initializeTrilogy, patchTrilogy, enterTrilogyNode } from '../src/game/trilogy-session.ts'
import { condOk } from '../src/game/store.ts'
import { awaitChapterEntry } from './chapter-entry-driver.mjs'
import { waitForImageAsset } from './media-identity-driver.mjs'

assert.equal(process.env.TRILOGY_BUILD_READY, '1', 'Wait for the main agent to confirm the completed build; this driver never builds it.')
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const catalog = JSON.parse(readFileSync(new URL('../src/lib/image-assets.catalog.json', import.meta.url), 'utf8'))
const output = resolve(process.env.TRILOGY_OUTPUT || '../../ch3-pacing-review-20261027')
const url = process.env.GAME_URL || 'http://127.0.0.1:8798/'
const storageKey = 'midnight-radiology-save-v1'
const chapters = (process.env.TRILOGY_CHAPTERS || 'ch3').split(',').map(id => TRILOGY[id])
assert(chapters.every(Boolean), 'Unknown chapter filter')
const variants = (process.env.TRILOGY_ROUTES || 'desktop,mobile').split(',')
assert(variants.every(name => ['desktop', 'mobile'].includes(name)), 'Unknown route filter')
const maxParallel = Math.min(3, Math.max(1, Number(process.env.TRILOGY_PARALLEL || 2)))
const browser = await chromium.launch({ headless: true,
  ...(process.env.EDGE_TEST === '1' ? { channel: 'msedge' } : process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
mkdirSync(output, { recursive: true })
const results = [], jobs = chapters.flatMap(chapter => variants.map(variant => ({ chapter, variant })))

function fixture(history) {
  return { gender: history ? 'f' : 'm', night: history ? 5 : 1, gold: 1200, skill: 4, heart: 3, wealth: 2,
    durability: 81, badges: [], stamps: history ? [1, 2, 3, 4, 5] : [],
    flags: history ? { n4_kind: true, mystery_told: true, data_audit: true,
      prior_chapter_marker: true } : {},
    lastCheckin: '', streak: 0, finished: history, seed: history ? 20261010 : 19981103,
    items: history ? ['snack', 'milktea'] : [], ap: 3, buyCount: 0, cards: [], events: [],
    playerName: history ? '既有姓名' : undefined, playerId: history ? 'OLD-ID' : undefined,
    dlc: { ch2: { done: history }, dr: { done: history }, dsa: { done: history }, ldct: { done: true, marker: 'preserve-other-save' } } }
}

async function walk({ chapter, variant }) {
  const mobile = variant === 'mobile', all = !mobile, label = `${chapter.id}-${variant}`
  const resumePath = process.env.TRILOGY_RESUME_DIR && resolve(process.env.TRILOGY_RESUME_DIR, `${label}-flow.json`)
  const prior = resumePath ? JSON.parse(readFileSync(resumePath, 'utf8')) : undefined
  if (prior) assert(prior.status === 'failed' && prior.chapter === chapter.id && prior.variant === variant && prior.lastState?.dlc?.[chapter.id]?.chapter,
    'Resume only an actual failed isolated-browser log; never invent prior walk evidence')
  const log = { kind: 'real-browser-full-walk', policy: 'Only initial prior-chapter history fixture. No CH3 history, cursor, timer or rewards injected. All progress through real UI.', chapter: chapter.id, variant, viewport: mobile ? '390x844-touch' : '1280x900',
    started: new Date().toISOString(), nodes: [], screenshots: [], errors: [], settlements: [], tools: [], scans: [], gifts: [], quizzes: [] }
  if (prior) {
    for (const field of ['nodes', 'screenshots', 'settlements', 'tools', 'scans', 'gifts', 'quizzes']) log[field] = [...prior[field]]
    log.resumedFrom = { path: resumePath, node: prior.lastState.dlc[chapter.id].chapter.stepId, originalFailure: prior.error }
  }
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
    isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 })
  const initial = prior?.lastState ?? fixture(all), untouched = JSON.parse(JSON.stringify(initial.dlc))
  delete untouched[chapter.id]
  await context.addInitScript(({ initial, key }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(initial))
    localStorage.setItem('mr-ch2-unlock', '1')
    sessionStorage.setItem('mr-rotate-dismissed', '1')
  }, { initial, key: storageKey })
  const page = await context.newPage()
  page.setDefaultTimeout(12000)
  page.on('pageerror', error => log.errors.push({ kind: 'pageerror', message: error.message }))
  page.on('response', response => { if (response.status() >= 400) log.errors.push({ kind: 'http', status: response.status(), url: response.url() }) })
  page.on('requestfailed', request => { if (!request.failure()?.errorText?.includes('ERR_ABORTED')) log.errors.push({ kind: 'requestfailed', url: request.url(), failure: request.failure() }) })
  const cdp = mobile ? await context.newCDPSession(page) : undefined
  let lastInput = 0, checkedGuard = log.nodes.some(n => n.kind === 'choice-guard-rejected-three-real-taps'),
    refreshedTool = log.nodes.some(n => n.kind === 'reload' && n.phase === 'story' && prior?.lastState.dlc[chapter.id].chapter.tools[n.at]), count = 0
  const captured = new Set(), seenImages = new Set(), seenPortraits = new Set()
  const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey)
  const progress = s => s.dlc[chapter.id].chapter
  const quiet = async (ms = 335) => { const remaining = ms - (Date.now() - lastInput); if (remaining > 0) await page.waitForTimeout(remaining) }
  async function click(locator, { wait = true } = {}) {
    if (wait) await quiet()
    if (mobile) await locator.tap(); else await locator.click()
    lastInput = Date.now()
  }
  async function screen(name) {
    const path = resolve(output, `${label}-${name}.png`)
    await page.screenshot({ path, fullPage: false })
    log.screenshots.push(path)
  }
  async function entry() {
    await page.locator('[data-chapter-loader], [data-trilogy]').first().waitFor({ timeout: 120000 })
    if (await page.locator('[data-chapter-loader]').count()) await awaitChapterEntry(page)
    await page.locator(`[data-trilogy="${chapter.id}"]`).waitFor({ timeout: 20000 })
    if (mobile && !await page.evaluate(() => sessionStorage.getItem('mr-rotate-dismissed'))) {
      const portraitChoice = page.getByRole('button', { name: '不了，竖屏也能玩', exact: true })
      await portraitChoice.waitFor({ timeout: 4000 })
      await click(portraitChoice)
      await portraitChoice.waitFor({ state: 'detached' })
    }
    lastInput = Date.now()
  }
  async function refreshUnchanged(kind) {
    const before = await read()
    await page.reload(); await entry()
    const after = await read()
    assert.deepEqual(after, before, `${label} ${kind}: refresh must preserve cursor, rewards, parameters and order exactly`)
    log.nodes.push({ kind: 'reload', at: progress(after).stepId, phase: progress(after).phase })
  }
  async function transition(before) {
    await page.waitForFunction(({ key, id, before }) => {
      const p = JSON.parse(localStorage.getItem(key)).dlc[id].chapter
      return p.stepId !== before.stepId || p.phase !== before.phase || p.shift !== before.shift
        || JSON.stringify(p.giftReply) !== JSON.stringify(before.giftReply)
    }, { key: storageKey, id: chapter.id, before }, { timeout: 5000 })
  }
  async function fit(locator, description, hitTest = false) {
    const metrics = await locator.evaluate((element, hitTest) => {
      const r = element.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
      return { x: r.x, y: r.y, width: r.width, height: r.height, viewportWidth: innerWidth, viewportHeight: innerHeight,
        hit: !hitTest || !!hit && (element === hit || element.contains(hit)) }
    }, hitTest)
    assert(metrics.width > 0 && metrics.height > 0, `${description}: positive display area`)
    assert(metrics.x >= -2 && metrics.y >= -2 && metrics.x + metrics.width <= metrics.viewportWidth + 2
      && metrics.y + metrics.height <= metrics.viewportHeight + 2, `${description}: inside viewport ${JSON.stringify(metrics)}`)
    assert(metrics.hit, `${description}: central activation point is not occluded`)
  }
  async function imageVisible(id) {
    assert(catalog[id], `Actual asset is registered: ${id}`)
    await waitForImageAsset(page, `assets/${catalog[id]}`)
  }
  async function sceneVisuals(s, step) {
    const p = progress(s)
    await page.locator(`[data-trilogy-node="${p.stepId}"][data-trilogy-phase="${p.phase}"]`).waitFor()
    const bg = p.viewBg ?? chapter.shifts[p.shift].background
    await page.locator(`[data-scene-background="${bg}"]`).waitFor()
    await imageVisible(bg)
    const person = p.giftReply?.person ?? step.speaker ?? 'sys'
    const sprite = step.closeup ? undefined : p.giftReply ? chapter.characters[person]?.sprite : step.phone || step.radio ? undefined
      : step.sprite ?? (person !== 'me' && person !== 'sys' ? chapter.characters[person]?.sprite : undefined)
    assert.equal(await page.locator('.trilogy-root .sprite-l').count(), sprite ? 1 : 0, `${p.stepId}: current-node portrait, never sticky previous actor`)
    if (sprite) {
      await imageVisible(sprite === 'me' ? `char_${s.gender}` : sprite)
      const patient = /(^pat_|patient|pat_luo|pat_mystery)/.test(sprite)
      if (patient && !seenPortraits.has(sprite)) { seenPortraits.add(sprite); await screen(`patient-${sprite}`) }
    }
    if (step.image && !step.tool && !step.scan) {
      if (step.closeup) {
        const cinematic = page.locator(`[data-ldct-cinematic="${p.stepId}"]`)
        await cinematic.waitFor()
        assert.equal(await page.locator('.trilogy-root .sprite-l, .trilogy-root .sprite-r').count(), 0, `${p.stepId}: closeup carries the scene without duplicate portraits`)
        await imageVisible(step.image)
        await fit(cinematic.locator('.ldct-cinematic__frame'), `${p.stepId}: closeup frame`)
      } else if (TRILOGY_DOCUMENTS[step.image]) await page.locator('.trilogy-story-image .trilogy-document').waitFor()
      else {
        await imageVisible(step.image)
        await fit(page.locator('.trilogy-story-image img, .trilogy-story-object img'), `${p.stepId}: case image`)
      }
      if (!seenImages.has(step.image)) { seenImages.add(step.image); await screen(`image-${step.image}`) }
    }
    if (step.phone) await imageVisible(step.phone)
  }
  async function acquisition(s, step) {
    const p = progress(s), scan = page.locator(`[data-trilogy-scan="${p.stepId}"]`), duration = step.scan.durationMs ?? 3000
    await scan.waitFor()
    assert.equal(await scan.getAttribute('data-scan-kind'), step.scan.kind)
    await fit(scan.locator('.ch2-scan-panel'), `${p.stepId}: acquisition panel`)
    const pending = progress(await read())
    assert.equal(pending.stepId, p.stepId, 'Acquisition remains on its node while running')
    assert(Number.isFinite(pending.scans?.[p.stepId]?.startedAt), 'Acquisition has a real saved wall-clock receipt')
    assert.equal(await page.locator('.trilogy-story-image, .ldct-cinematic, [data-trilogy-lab]').count(), 0, 'Clinical result and tools are hidden during acquisition')
    const progressbar = scan.getByRole('progressbar', { name: '图像采集进度', exact: true })
    await progressbar.waitFor()
    assert(Number(await progressbar.getAttribute('aria-valuenow')) < 100, 'Saw the actual acquisition before completion')
    if (!captured.has(`scan:${step.scan.kind}`)) { await screen(`scan-${step.scan.kind}`); captured.add(`scan:${step.scan.kind}`) }
    // Observe the production timer. Never alter wall clocks, receipts or cursor.
    await scan.waitFor({ state: 'detached', timeout: duration + 5000 })
    await transition(p)
    const after = progress(await read()), receipt = after.scans[p.stepId]
    assert.equal(receipt.completed, true)
    assert(Date.now() - receipt.startedAt >= duration, 'Full real acquisition duration elapsed')
    assert.equal(after.stepId, step.next, 'Finished acquisition reveals its configured result')
    log.scans.push({ node: p.stepId, kind: step.scan.kind, duration, next: after.stepId })
  }
  async function reveal(s, step) {
    const text = (progress(s).giftReply?.text ?? step.text ?? '').replaceAll('**', '')
    const para = page.locator('.dialog-box > p')
    await para.waitFor()
    await quiet()
    // Short lines can finish naturally while a locator waits for a stable hit
    // target. Clicking then would correctly advance the story, not reveal it.
    // Only fast-forward when enough characters remain for an unambiguous click.
    if (text.length - (await para.textContent()).length > 15) await click(para, { wait: false })
    await page.waitForFunction(text => document.querySelector('.dialog-box > p')?.textContent === text, text)
    await quiet()
    assert.equal(await para.textContent(), text, `${progress(s).stepId}: revealed text must not shrink on the next typewriter tick`)
    // The panel is intentionally scrollable on portrait screens. Its viewport,
    // not its taller content box, must fit; each activated control is checked below.
    await fit(page.locator('.dialog-wrap'), `${progress(s).stepId}: dialogue viewport`)
    await fit(para, `${progress(s).stepId}: visible dialogue text`)
  }
  async function swipe(s) {
    const p = progress(s), overlay = page.locator('[data-ch2-checkin]')
    await overlay.waitFor()
    const thumb = await overlay.locator('[data-ch2-checkin-thumb]').boundingBox()
    const path = await overlay.locator('.ch2-checkin-path').boundingBox()
    assert(thumb && path)
    await fit(overlay.locator('[data-ch2-checkin-thumb]'), 'Real check-in thumb', true)
    const y = thumb.y + thumb.height / 2, start = thumb.x + thumb.width / 2, end = path.x + path.width - thumb.width / 2
    if (mobile) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: start, y }] })
      for (let i = 1; i <= 12; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start + (end - start) * i / 12, y }] })
        await page.waitForTimeout(15)
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    } else {
      await page.mouse.move(start, y); await page.mouse.down()
      await page.mouse.move(end, y, { steps: 12 }); await page.mouse.up()
    }
    lastInput = Date.now()
    await overlay.waitFor({ state: 'detached' })
    const after = await read()
    assert.equal(after.gold, s.gold + 50)
    assert.equal(progress(after).stepId, p.stepId, 'Swipe only checks in; it must not advance the dialogue')
    assert.equal(progress(after).applied.filter(key => key === `checkin:${p.shift}`).length, 1)
    log.nodes.push({ kind: 'checkin', shift: p.shift, gesture: mobile ? 'touch-swipe' : 'pointer-drag' })
  }
  async function tool(s, step) {
    const p = progress(s), task = step.tool.task, lab = page.locator('[data-trilogy-lab]')
    await lab.waitFor()
    const before = await lab.textContent()
    if (mobile) {
      await click(lab.locator('details.trilogy-course-help > summary'))
      const help = lab.locator('details.trilogy-course-help').getByRole('button', { name: '结束练习 →', exact: true })
      await help.scrollIntoViewIfNeeded(); await fit(help, `${p.stepId}: help continuation`, true)
      await screen(`tool-${task}`)
      await click(help)
    } else {
      if (task === 'probe') await click(lab.getByRole('button', { name: '线阵', exact: true }))
      else if (task === 'echo') await click(lab.getByRole('button', { name: '发出脉冲，扫过四条线', exact: true }))
      else {
        const range = lab.locator('input[type="range"]').first()
        if (await range.count()) { await range.focus(); await range.press('End'); lastInput = Date.now() }
      }
      await screen(`tool-${task}`)
      const done = page.locator('[data-trilogy-tool-done]')
      await done.scrollIntoViewIfNeeded(); await fit(done, `${p.stepId}: tool continuation`, true)
      await click(done)
    }
    await transition(p)
    const saved = progress(await read()).tools[p.stepId]
    assert.equal(saved.completed, true)
    if (mobile) assert(saved.choice.startsWith('assisted:'))
    log.tools.push({ node: p.stepId, task, assisted: mobile, before, saved })
  }
  async function storyChoice(s, step) {
    const p = progress(s), choices = (step.choices ?? []).filter(c => !c.next.startsWith('@') && condOk(s, c.cond))
    const giftButtons = page.locator('.choice-in button').filter({ hasText: /把奶茶递过去|拆开零食一起吃/ })
    if (all && await giftButtons.count()) {
      await page.waitForFunction(() => [...document.querySelectorAll('.choice-in button')].some(b => /把奶茶递过去|拆开零食一起吃/.test(b.textContent) && b.getAttribute('aria-disabled') === 'false'))
      await click(giftButtons.first())
      await transition(p)
      const after = await read(), reply = progress(after).giftReply
      assert(reply, 'Gift produces its saved in-person reply')
      assert.equal(after.items.length, s.items.length - 1)
      log.gifts.push({ node: p.stepId, person: reply.person, shift: p.shift })
      return
    }
    let choice
    if (choices.length) {
      const planned = [
        ['c3_s1_probes_0','c3_s1_tea_0','c3_s1_wait_0'],
        ['c3_s2_roster_0','c3_s2_he_0','c3_s2_label_0'],
        ['c3_s3_tang_0','c3_s3_cart_0','c3_s3_bag_0'],
        ['c3_s4_lei_0','c3_s4_zhou_0','c3_s4_pack_0'],
        ['c3_s5_zhou_0','c3_s5_lei_0','c3_s5_mei_0'],
      ][p.shift]
      if (/hub$/.test(p.stepId)) {
        const candidates = choices.filter(c => c.next.includes('_place_') || c.effect?.ap === -1)
        choice = all && s.ap > 0 ? candidates.find(c => planned.includes(c.next)) ?? candidates[0] ?? choices.at(-1) : choices.at(-1)
      } else if (p.stepId.includes('_place_')) {
        choice = all && s.ap > 0 ? choices.find(c => planned.includes(c.next)) ?? choices[0] : choices.at(-1)
      } else choice = all ? choices.find(c => c.tag === 'good') ?? choices[0] : choices.at(-1)
    }
    const displayedChoices = (step.choices ?? []).filter(c => condOk(s, c.cond ? { ...c.cond, ap: undefined } : undefined))
    const button = choice ? page.locator(`[data-dialogue-choice="${displayedChoices.indexOf(choice)}"]`)
      : step.end ? page.locator('[data-trilogy-settle]')
        : page.locator('.choice-in').getByRole('button', { name: '💬 继续交谈 →', exact: true })
    await button.waitFor()
    await button.scrollIntoViewIfNeeded()
    await fit(button, `${p.stepId}: chosen answer`, true)
    await page.waitForFunction(element => element.getAttribute('aria-disabled') === 'false', await button.elementHandle())
    await click(button)
    await transition(p)
    if (choice) assert.equal(progress(await read()).stepId, choice.next)
  }

  try {
    await page.goto(`${url.replace(/#.*$/, '')}#/${chapter.id}`)
    await entry()
    while (count++ < 1100) {
      const s = await read(), p = progress(s), step = trilogyStep(s, chapter)
      if (log.errors.length) throw new Error(JSON.stringify(log.errors))
      if (p.done) break
      await page.locator(`[data-trilogy-node="${p.stepId}"][data-trilogy-phase="${p.phase}"]`).waitFor()
      // Chapter 5's retirement prologue precedes arrival at the placement.
      // Drag only a check-in widget actually presented by the production UI.
      if (p.phase === 'story' && await page.locator('[data-ch2-checkin]').count()) { await swipe(s); continue }
      if (p.phase === 'settle') {
        await page.locator('[data-ch3-settlement]').waitFor()
        assert(!log.settlements.includes(p.shift), 'Each shift enters settlement once in this walk')
        log.settlements.push(p.shift)
        if (p.shift === 0 || p.shift === 4) {
          await screen(`settlement-${p.shift + 1}`)
          await click(page.getByRole('navigation', { name: '班后功能', exact: true }).getByRole('button', { name: '📚 已解锁书页', exact: true }))
          assert((await page.locator('[data-ch3-book]').textContent()).includes(`现已解锁 ${(p.shift + 1) * 4} 页`))
          await click(page.locator('[data-trilogy-close-overlay]'))
        }
        if (all && p.shift === 0) {
          await click(page.getByRole('navigation', { name: '班后功能', exact: true }).getByRole('button', { name: '🛒 小卖部', exact: true }))
          await click(page.locator('[data-trilogy-buy="coffee"]'))
          await click(page.locator('[data-trilogy-close-overlay]'))
          assert.equal(progress(await read()).pendingCoffee, true)
        }
        // Actual settlement is left only using its visible next-shift control.
        await click(page.locator('[data-trilogy-next-shift]'))
        await transition(p)
        continue
      }
      if (p.phase === 'quiz') {
        await page.locator('.trilogy-quiz').waitFor()
        const q = p.quiz
        assert.equal(q.questions.length, 5)
        if (q.completed) {
          await screen('quiz-grade')
          await quiet(1000) // Respect both the 500ms quiz submission gate and restored presentation readiness.
          await click(page.locator('[data-trilogy-quiz-finish]'))
          await transition(p)
        } else {
          const row = q.questions[q.index], question = chapter.quiz[row.question]
          if (row.selected === undefined) {
            const answer = all || q.index % 2 ? question.answer : (question.answer + 1) % question.options.length
            await page.waitForTimeout(950) // The real quiz 900ms presentation guard remains in force.
            await click(page.locator('.trilogy-quiz').getByRole('button', { name: question.options[answer], exact: true }))
            await page.waitForFunction(({ key, id, index }) => JSON.parse(localStorage.getItem(key)).dlc[id].chapter.quiz.questions[index].selected !== undefined,
              { key: storageKey, id: chapter.id, index: q.index })
            log.quizzes.push({ index: q.index, question: question.q, selected: answer, correct: question.answer })
            // Do not repeat reload tests already covered by the state suite.
          }
          await quiet(550)
          await click(page.locator('[data-trilogy-quiz-next]'))
          await page.waitForFunction(({ key, id, index }) => { const q = JSON.parse(localStorage.getItem(key)).dlc[id].chapter.quiz; return q.completed || q.index !== index },
            { key: storageKey, id: chapter.id, index: q.index })
        }
        continue
      }
      if (step.scan) { await acquisition(s, step); continue }
      await sceneVisuals(s, step)
      log.nodes.push({ kind: p.giftReply ? 'gift-reply' : 'story', node: p.stepId, shift: p.shift, phase: p.phase,
        text: p.giftReply?.text ?? step.text, speaker: p.giftReply?.person ?? step.speaker, bg: p.viewBg, image: step.image, sprite: step.sprite, sprite2: step.sprite2,
        choices: step.choices?.filter(c => condOk(s, c.cond)).map(c => ({text: c.text, next: c.next})), values: {gold:s.gold,skill:s.skill,heart:s.heart,wealth:s.wealth,ap:s.ap}, items: [...s.items] })
      if (step.tool) { await tool(s, step); continue }
      await reveal(s, step)
      if (!p.giftReply && await page.locator('.choice-in button').count()) await storyChoice(s, step)
      else {
        await page.locator('.dialog-box > span.animate-bounce').waitFor()
        await click(page.locator('.dialog-box > p'))
        await transition(p)
      }
      if (count % 30 === 0) console.log(`${label}: ${count} interactions, ${progress(await read()).stepId}`)
    }
    assert(count < 1100, `${label}: complete story reached without loop`)
    const done = await read(), p = progress(done)
    log.finalState = done
    assert.equal(p.phase, 'done'); assert.equal(p.done, true)
    assert.deepEqual(log.settlements, [0, 1, 2, 3, 4]); assert.equal(log.quizzes.length, 5)
    assert.equal(p.applied.filter(key => key.startsWith('checkin:')).length, 5, 'All five actual arrival gestures were completed')
    assert.equal(p.quiz.grade, all ? 'S' : 'C')
    assert(p.visited.includes(chapter.afterQuiz), 'Whole post-quiz ending was traversed')
    assert.equal(log.tools.length, 7, 'All seven current ultrasound tools traversed')
    for (const [id, other] of Object.entries(untouched)) assert.deepEqual(done.dlc[id], other, `Other save ${id} untouched`)
    await page.locator('[data-ch3-settlement]').waitFor()
    await page.getByLabel('姓名', { exact: true }).fill(`试玩${chapter.id}${mobile ? '移动' : '桌面'}`)
    await page.getByLabel('学号', { exact: true }).fill(`TEST-${chapter.id}-${variant}`)
    await click(page.getByRole('button', { name: '盖章发证', exact: true }))
    await page.locator('[data-trilogy-certificate]').waitFor()
    const certificate = progress(await read()).certificate
    assert.equal(certificate.code, trilogyCredential(chapter.id, certificate))
    await page.locator('[data-trilogy-certificate]').scrollIntoViewIfNeeded()
    await screen('certificate')
    // Certificate was issued through its real form.
    assert.deepEqual(progress(await read()).certificate, certificate)
    assert(p.visited.includes('c3_epilogue_14'), 'Cousin MRI waiting epilogue traversed')
    log.status = 'passed'; log.certificate = certificate; log.finished = new Date().toISOString()
    console.log(`PASS real browser ${label}: 5 shifts, ${log.tools.length} tools, 5 quiz answers, ending and certificate`)
  } catch (error) {
    log.status = 'failed'; log.error = error.stack ?? String(error)
    log.lastState = await read().catch(() => null)
    await screen('failure').catch(() => {})
    console.error(`FAIL ${label}: ${error.message}`)
    throw error
  } finally {
    writeFileSync(resolve(output, `${label}-flow.json`), JSON.stringify(log, null, 2))
    writeFileSync(resolve(output, `${label}-transcript.md`), log.nodes.filter(n => n.kind === 'story' || n.kind === 'gift-reply').map(n => `## ${n.node} · ${n.speaker ?? 'sys'} · 班${n.shift+1}\n${n.text}\n\n背景 ${n.bg} | 图片 ${n.image ?? '-'} | 立绘 ${n.sprite ?? '-'}\n${(n.choices ?? []).map(c => '- '+c.text).join('\n')}\n数值 ${JSON.stringify(n.values)}\n`).join('\n'))
    results.push({ chapter: chapter.id, variant, status: log.status, interactions: count, error: log.error, screenshots: log.screenshots })
    await context.close()
  }
}

async function focusedScreenshots() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })
  await context.addInitScript(() => { localStorage.setItem('mr-ch2-unlock','1'); sessionStorage.setItem('mr-rotate-dismissed','1') })
  const page = await context.newPage(), chapter = TRILOGY.ch3
  await page.goto(`${url}#/dlc`)
  await page.getByRole('heading', { name: /章节与番外/ }).waitFor()
  const rows = []
  for (const [node, shift] of [['c3_s2_pause_2', 1], ['c3_s3_leave_clinic_0', 2], ['c3_s4_open_clinic_1', 3]]) {
    let state = initializeTrilogy(fixture(false), chapter, `pacing-screenshot-${node}`)
    state = patchTrilogy(state, 'ch3', { phase: 'story', shift, applied: ['checkin:0','checkin:1','checkin:2','checkin:3','checkin:4'] })
    state = enterTrilogyNode(state, chapter, node)
    await page.evaluate(({key,state})=>localStorage.setItem(key,JSON.stringify(state)), {key:storageKey,state})
    await page.goto(`${url}?v=pacing-screenshot-${node}#/ch3`)
    await page.locator('[data-chapter-loader], [data-trilogy]').first().waitFor({ timeout: 120000 })
    if (await page.locator('[data-chapter-loader]').count()) await awaitChapterEntry(page)
    await page.locator(`[data-trilogy-node="${node}"]`).waitFor()
    const full = trilogyStep(state,chapter).text.replaceAll('**',''), para = page.locator('.dialog-box > p')
    if (full.length - (await para.textContent()).length > 15) await page.mouse.click(6,240)
    await page.waitForFunction(text=>document.querySelector('.dialog-box > p')?.textContent === text, full)
    await page.locator('img').evaluateAll(rows=>Promise.all(rows.filter(i=>i.getClientRects().length).map(i=>i.decode().catch(()=>{}))))
    const path = resolve(output, `focused-${node}-full-text.png`)
    await page.screenshot({path}); rows.push({node,shift,path,text:full})
  }
  writeFileSync(resolve(output, 'focused-transitions.json'), JSON.stringify({kind:'isolated-node-screenshots-not-full-walk',rows},null,2))
  await context.close()
}

let failed
try {
  if (process.env.CH3_SCREENSHOTS_ONLY === '1') { await focusedScreenshots() } else {
  const workers = Array.from({ length: Math.min(maxParallel, jobs.length) }, async () => {
    while (jobs.length && !failed) {
      const job = jobs.shift()
      try { await walk(job) } catch (error) { failed ??= error }
    }
  })
  await Promise.all(workers)
  if (failed) throw failed
  assert.equal(results.length, chapters.length * variants.length)
  }
} finally {
  if (process.env.CH3_SCREENSHOTS_ONLY !== '1') writeFileSync(resolve(output, 'trilogy-browser-summary.json'), JSON.stringify({ results, unrun: jobs.map(job => `${job.chapter.id}-${job.variant}`) }, null, 2))
  await browser.close()
}
