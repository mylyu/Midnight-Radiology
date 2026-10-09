// Run only against the main agent's completed build:
// TRILOGY_BUILD_READY=1 node --import tsx tests/trilogy-flow.mjs
// Uses isolated browser contexts and real input. No progression flags, game timers,
// rewards, React state or production guards are patched during a walk.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { TRILOGY } from '../src/game/trilogy-registry.ts'
import { TRILOGY_DOCUMENTS } from '../src/game/trilogy-documents.ts'
import { trilogyStep, trilogyCredential } from '../src/game/trilogy-session.ts'
import { condOk } from '../src/game/store.ts'
import { awaitChapterEntry } from './chapter-entry-driver.mjs'
import { waitForImageAsset } from './media-identity-driver.mjs'

assert.equal(process.env.TRILOGY_BUILD_READY, '1', 'Wait for the main agent to confirm the completed build; this driver never builds it.')
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const catalog = JSON.parse(readFileSync(new URL('../src/lib/image-assets.catalog.json', import.meta.url), 'utf8'))
const output = resolve(process.env.TRILOGY_OUTPUT || '../../trilogy-review-20261010')
const url = process.env.GAME_URL || 'http://127.0.0.1:8798/'
const storageKey = 'midnight-radiology-save-v1'
const chapters = (process.env.TRILOGY_CHAPTERS || 'ch3,ch4,ch5').split(',').map(id => TRILOGY[id])
assert(chapters.every(Boolean), 'Unknown chapter filter')
const variants = (process.env.TRILOGY_ROUTES || 'desktop,mobile').split(',')
assert(variants.every(name => ['desktop', 'mobile'].includes(name)), 'Unknown route filter')
const maxParallel = Math.min(3, Math.max(1, Number(process.env.TRILOGY_PARALLEL || 2)))
const browser = await chromium.launch({ headless: true,
  ...(process.env.EDGE_TEST === '1' ? { channel: 'msedge' } : process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
mkdirSync(output, { recursive: true })
const results = [], jobs = chapters.flatMap(chapter => variants.map(variant => ({ chapter, variant })))

function fixture(history) {
  return { gender: history ? 'f' : 'm', night: history ? 5 : 1, gold: 3000, skill: 4, heart: 3, wealth: 2,
    durability: 81, badges: [], stamps: history ? [1, 2, 3, 4, 5] : [],
    flags: history ? { n4_kind: true, n4_wrong: true, mystery_told: true, data_audit: true,
      c3_xu_identity: true, c3_missing_notice: true, c3_cousin_followup_stable: true,
      c4_father_transfer: true, c4_receipt_conflict: true } : {},
    lastCheckin: '', streak: 0, finished: history, seed: history ? 20261010 : 19981103,
    items: ['snack', 'milktea'], ap: 3, buyCount: 0, cards: [], events: [],
    playerName: history ? '既有姓名' : undefined, playerId: history ? 'OLD-ID' : undefined,
    dlc: { ch2: { done: history }, dr: { done: history }, dsa: { done: history }, ldct: { done: true, marker: 'preserve-other-save' } } }
}

async function walk({ chapter, variant }) {
  const mobile = variant === 'mobile', all = !mobile, label = `${chapter.id}-${variant}`
  const log = { kind: 'real-browser-full-walk', chapter: chapter.id, variant, viewport: mobile ? '390x844-touch' : '1280x900',
    started: new Date().toISOString(), nodes: [], screenshots: [], errors: [], settlements: [], tools: [], gifts: [], quizzes: [] }
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
    isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 })
  const initial = fixture(all), untouched = JSON.parse(JSON.stringify(initial.dlc))
  await context.addInitScript(({ initial, key }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(initial))
  }, { initial, key: storageKey })
  const page = await context.newPage()
  page.setDefaultTimeout(12000)
  page.on('pageerror', error => log.errors.push({ kind: 'pageerror', message: error.message }))
  page.on('response', response => { if (response.status() >= 400) log.errors.push({ kind: 'http', status: response.status(), url: response.url() }) })
  page.on('requestfailed', request => { if (!request.failure()?.errorText?.includes('ERR_ABORTED')) log.errors.push({ kind: 'requestfailed', url: request.url(), failure: request.failure() }) })
  const cdp = mobile ? await context.newCDPSession(page) : undefined
  let lastInput = 0, checkedGuard = false, refreshedTool = false, count = 0
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
    const sprite = p.giftReply ? chapter.characters[person]?.sprite : step.phone || step.radio ? undefined
      : step.sprite ?? (person !== 'me' && person !== 'sys' ? chapter.characters[person]?.sprite : undefined)
    assert.equal(await page.locator('.trilogy-root .sprite-l').count(), sprite ? 1 : 0, `${p.stepId}: current-node portrait, never sticky previous actor`)
    if (sprite) {
      await imageVisible(sprite === 'me' ? `char_${s.gender}` : sprite)
      const patient = /(^pat_|patient|pat_luo|pat_mystery)/.test(sprite)
      if (patient && !seenPortraits.has(sprite)) { seenPortraits.add(sprite); await screen(`patient-${sprite}`) }
    }
    if (step.image && !step.tool) {
      if (TRILOGY_DOCUMENTS[step.image]) await page.locator('.trilogy-story-image .trilogy-document').waitFor()
      else {
        await imageVisible(step.image)
        await fit(page.locator('.trilogy-story-image img'), `${p.stepId}: case image`)
      }
      if (!seenImages.has(step.image)) { seenImages.add(step.image); await screen(`image-${step.image}`) }
    }
    if (step.phone) await imageVisible(step.phone)
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
    await fit(page.locator('[data-trilogy-tool-done]'), `${p.stepId}: tool continuation`, true)
    const beforeImage = async () => step.tool.kind === 'ultrasound'
      ? page.locator('[data-ultrasound-phantom]').evaluate(canvas => canvas.toDataURL())
      : lab.locator('img[alt="当前图像"]').count().then(async count => count ? lab.locator('img[alt="当前图像"]').getAttribute('src') : '')
    if (step.tool.kind === 'ultrasound') await fit(page.locator('[data-ultrasound-phantom]'), `${p.stepId}: phantom canvas`)
    const firstImage = await beforeImage()
    if (task === 'sequence') {
      assert(step.tool.images && Object.keys(step.tool.images).length >= 2, `${p.stepId}: displayed sequence tabs require distinct image mappings`)
      const pairs = Object.entries(step.tool.images)
      for (const [name, image] of pairs) { await click(lab.getByRole('button', { name, exact: true })); await imageVisible(image) }
      assert.notEqual(await beforeImage(), firstImage, `${p.stepId}: sequence selection changes displayed source`)
      assert.equal(await lab.locator('input[type="range"]').count(), 0, 'No meaningless sequence slider')
    } else if (task === 'artifact') {
      await click(lab.getByRole('button', { name: '看受运动影响的那段', exact: true }))
      await lab.locator('img[alt="运动重影示意"]').waitFor()
      await click(lab.getByRole('button', { name: '沟通后必要补采', exact: true }))
      await lab.locator('img[alt="运动重影示意"]').waitFor({ state: 'detached' })
    } else {
      if (task === 'probe') {
        for (const name of ['线阵', '相控阵', '线阵']) await click(lab.getByRole('button', { name, exact: true }))
      }
      const ranges = lab.locator('input[type="range"]')
      for (let i = 0; i < await ranges.count(); i++) {
        const range = ranges.nth(i)
        await fit(range, `${p.stepId}: parameter ${i}`, true)
        await range.focus(); await range.press('End'); lastInput = Date.now()
        const endImage = await beforeImage()
        await range.press('Home'); lastInput = Date.now()
        if (step.tool.kind === 'ultrasound') assert.notEqual(await beforeImage(), endImage, `${task}: actual parameter changes pixels`)
        const box = await range.boundingBox()
        const fraction = task === 'decay' ? .5 : .55
        await quiet()
        if (mobile) await page.touchscreen.tap(box.x + box.width * fraction, box.y + box.height / 2)
        else await page.mouse.click(box.x + box.width * fraction, box.y + box.height / 2)
        lastInput = Date.now()
      }
      if (task === 'fusion') assert.equal(await lab.locator('img[alt="PET摄取层"]').count(), 1)
    }
    if (!captured.has(`tool:${task}`)) { await screen(`tool-${task}`); captured.add(`tool:${task}`) }
    if (!refreshedTool) { await refreshUnchanged('tool-parameters'); refreshedTool = true }
    const beforeDone = progress(await read())
    if (mobile && log.tools.length === 0) {
      await click(lab.locator('summary'))
      await click(lab.getByRole('button', { name: '一起看过了，回到故事', exact: true }))
    } else await click(page.locator('[data-trilogy-tool-done]'))
    await transition(beforeDone)
    const saved = progress(await read()).tools[p.stepId]
    assert.equal(saved.completed, true)
    if (mobile && log.tools.length === 0) assert(saved.choice.startsWith('assisted:'))
    log.tools.push({ node: p.stepId, task, saved })
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
      choice = /hub$/.test(p.stepId)
        ? all ? choices.find(c => c.cond?.ap || c.cond?.notFlag || c.cond?.notFlag2) ?? choices.at(-1) : choices.at(-1)
        : all ? choices.find(c => c.tag === 'good') ?? choices[0] : choices.at(-1)
    }
    const button = choice ? page.locator('.choice-in').getByRole('button', { name: choice.text.replaceAll('**', ''), exact: true })
      : page.locator('.choice-in').getByRole('button', { name: '接着聊 →', exact: true })
    await button.waitFor()
    await button.scrollIntoViewIfNeeded()
    await fit(button, `${p.stepId}: chosen answer`, true)
    if (!checkedGuard && choice) {
      // Slow media inspection may have let the original presentation finish.
      // Reload that saved node, rather than falsely calling a ready click early.
      if (await button.getAttribute('aria-disabled') === 'false') {
        await refreshUnchanged('fresh-choice-presentation')
        await reveal(await read(), step)
      }
      assert.equal(await button.getAttribute('aria-disabled'), 'true', 'Negative guard probe starts before presentation is ready')
      const box = await button.boundingBox()
      for (let i = 0; i < 3; i++) {
        // Real coordinate input intentionally reaches the not-yet-ready UI.
        // It bypasses Playwright's disabled wait, NOT the game's gesture guard.
        if (mobile) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
        else await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
        lastInput = Date.now(); await page.waitForTimeout(80)
      }
      assert.equal(progress(await read()).stepId, p.stepId, 'Rapid taps before 900ms cannot choose')
      checkedGuard = true
      log.nodes.push({ kind: 'choice-guard-rejected-three-real-taps', at: p.stepId })
    }
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
        await page.locator('.trilogy-settlement').waitFor()
        assert(!log.settlements.includes(p.shift), 'Each shift enters settlement once in this walk')
        log.settlements.push(p.shift)
        if (p.shift === 0 || p.shift === 4) {
          await screen(`settlement-${p.shift + 1}`)
          await click(page.locator('.trilogy-bottom-menu').getByRole('button', { name: '📚 旧书', exact: true }))
          assert.equal(await page.locator('.trilogy-modal .trilogy-book-page').count(), (p.shift + 1) * 4)
          await click(page.locator('[data-trilogy-close-overlay]'))
        }
        if (all && p.shift === 0) {
          await click(page.locator('.trilogy-bottom-menu').getByRole('button', { name: '🛒 小卖部', exact: true }))
          await click(page.locator('[data-trilogy-buy="coffee"]'))
          await click(page.locator('[data-trilogy-close-overlay]'))
          assert.equal(progress(await read()).pendingCoffee, true)
        }
        await refreshUnchanged(`settlement-${p.shift + 1}`)
        await click(page.locator('[data-trilogy-next-shift]'))
        await transition(p)
        continue
      }
      if (p.phase === 'quiz') {
        await page.locator('.trilogy-quiz').waitFor()
        const q = p.quiz
        assert.equal(q.questions.length, 5)
        if (q.completed) {
          await screen('quiz-grade'); await refreshUnchanged('quiz-reward')
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
            if (q.index === 0) await refreshUnchanged('quiz-first-answer-and-order')
          }
          await quiet(550)
          await click(page.locator('[data-trilogy-quiz-next]'))
          await page.waitForFunction(({ key, id, index }) => { const q = JSON.parse(localStorage.getItem(key)).dlc[id].chapter.quiz; return q.completed || q.index !== index },
            { key: storageKey, id: chapter.id, index: q.index })
        }
        continue
      }
      await sceneVisuals(s, step)
      log.nodes.push({ kind: p.giftReply ? 'gift-reply' : 'story', node: p.stepId, shift: p.shift, phase: p.phase,
        text: p.giftReply?.text ?? step.text, speaker: p.giftReply?.person ?? step.speaker, bg: p.viewBg })
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
    assert.equal(p.phase, 'done'); assert.equal(p.done, true)
    assert.deepEqual(log.settlements, [0, 1, 2, 3, 4]); assert.equal(log.quizzes.length, 5)
    assert.equal(p.applied.filter(key => key.startsWith('checkin:')).length, 5, 'All five actual arrival gestures were completed')
    assert.equal(p.quiz.grade, all ? 'S' : 'C')
    assert(p.visited.includes(chapter.afterQuiz), 'Whole post-quiz ending was traversed')
    assert(checkedGuard); assert(refreshedTool); assert(log.tools.length > 0)
    for (const [id, other] of Object.entries(untouched)) assert.deepEqual(done.dlc[id], other, `Other save ${id} untouched`)
    await page.locator('.trilogy-settlement').waitFor()
    await page.getByLabel('姓名', { exact: true }).fill(`试玩${chapter.id}${mobile ? '移动' : '桌面'}`)
    await page.getByLabel('学号', { exact: true }).fill(`TEST-${chapter.id}-${variant}`)
    await click(page.getByRole('button', { name: '盖章发证', exact: true }))
    await page.locator('[data-trilogy-certificate]').waitFor()
    const certificate = progress(await read()).certificate
    assert.equal(certificate.code, trilogyCredential(chapter.id, certificate))
    await page.locator('[data-trilogy-certificate]').scrollIntoViewIfNeeded()
    await screen('certificate')
    await refreshUnchanged('issued-certificate')
    assert.deepEqual(progress(await read()).certificate, certificate)
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
    results.push({ chapter: chapter.id, variant, status: log.status, interactions: count, error: log.error, screenshots: log.screenshots })
    await context.close()
  }
}

let failed
try {
  const workers = Array.from({ length: Math.min(maxParallel, jobs.length) }, async () => {
    while (jobs.length && !failed) {
      const job = jobs.shift()
      try { await walk(job) } catch (error) { failed ??= error }
    }
  })
  await Promise.all(workers)
  if (failed) throw failed
  assert.equal(results.length, chapters.length * variants.length)
} finally {
  writeFileSync(resolve(output, 'trilogy-browser-summary.json'), JSON.stringify({ results, unrun: jobs.map(job => `${job.chapter.id}-${job.variant}`) }, null, 2))
  await browser.close()
}
