// Disposable seeded saves exercise UI states; none is a claimed full playthrough.
// New browser contexts never read or write the player's real browser profile.
// The external article response is explicitly mocked; this tests navigation, not its content.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { CH2_SHIFTS } from '../src/game/ch2.ts'
import { freshState } from '../src/game/store.ts'

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const output = resolve(process.env.CASE_READING_OUTPUT || '../../ch2-case-reading-review')
const baseURL = (process.env.GAME_URL || 'http://127.0.0.1:8798/').replace(/\/$/, '') + '/'
const gameURL = `${baseURL}#/ch2`
const articleURL = 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6301504/'
const saveKey = 'midnight-radiology-save-v1'
const results = [], errors = [], externalRequests = []
let activePage
mkdirSync(output, { recursive: true })

function fixture(id, phase, legacy = false) {
  const shift = CH2_SHIFTS.find(row => row.steps[id])
  assert(shift, `${id}: fixture uses an actual registered node`)
  return { ...freshState('f'), gold: 923, ap: 0, skill: 8, heart: 6, wealth: 4, durability: 76,
    night: 5, finished: true, seed: 2026092601, flags: {}, items: ['key'], badges: ['fixer'],
    cards: ['ct_intro'], events: [], buyCount: 17, screenHint: 'chapterEnd', stepId: 'n5_end', resumeKey: '5-n5_end',
    dlc: { dr: { done: true }, dsa: { done: true, dose: 42 }, ch2: {
      shift: shift.id, stepId: id, ...(!legacy ? { phase } : {}), done: phase === 'done',
      appliedSteps: [`ch2-${id}`], viewBg: 'bg_ctcontrol',
    } } }
}

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const read = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), saveKey)
const storage = page => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])))
const settleUI = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
async function open(save, mobile) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 } })
  await context.addInitScript(({ save, origin, saveKey }) => {
    // Do not seed or alter storage on the mocked external article origin.
    if (location.origin !== origin) return
    localStorage.setItem('mr-ch2-unlock', '1')
    sessionStorage.setItem('mr-rotate-dismissed', '1')
    if (!localStorage.getItem(saveKey)) localStorage.setItem(saveKey, JSON.stringify(save))
    HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('Fixture audio denied', 'NotAllowedError'))
  }, { save, origin: new URL(baseURL).origin, saveKey })
  await context.route('https://pmc.ncbi.nlm.nih.gov/**', async route => {
    const request = route.request()
    externalRequests.push({ url: request.url(), method: request.method(), referer: request.headers().referer ?? null, mocked: true })
    assert.equal(request.url(), articleURL, 'Only the explicitly configured article is requested')
    await route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8',
      body: '<!doctype html><title>Mock PMC article response — navigation test only</title><main data-mocked-pmc-response>Mock response. This is not the article content.</main>' })
  })
  const page = await context.newPage()
  activePage = page
  page.setDefaultTimeout(10000)
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(gameURL)
  if (save.dlc.ch2.done) await page.locator('[data-ch2-complete="true"]').waitFor()
  else if (save.dlc.ch2.phase === 'settle') await page.locator('[data-ch2-complete="false"]').waitFor()
  else await page.locator(`[data-ch2-step="${save.dlc.ch2.stepId}"][data-ch2-phase="story"]`).waitFor()
  await settleUI(page)
  return { page, context }
}

async function fits(page, locator, fullyVisible = false) {
  await locator.scrollIntoViewIfNeeded()
  const box = await locator.boundingBox(), viewport = page.viewportSize()
  assert(box && box.x >= -1 && box.x + box.width <= viewport.width + 1, 'Reading content/control fits viewport width')
  if (fullyVisible) assert(box.y >= -1 && box.y + box.height <= viewport.height + 1, 'The reading link is vertically reachable')
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal page overflow')
  assert(await page.locator('[data-ch2-settlement-scroll]').evaluate(element => element.scrollWidth <= element.clientWidth + 1),
    'Settlement scroll region has no horizontal overflow')
  return box
}

async function noReading(page) {
  assert.equal(await page.locator('[data-ch2-case-reading]').count(), 0, 'No reading section before completion')
  assert.equal(await page.locator(`a[href="${articleURL}"]`).count(), 0, 'No article link before completion')
  assert.notEqual((await read(page)).dlc.ch2.done, true)
}

try {
  for (const mobile of [false, true]) {
    const size = mobile ? '390' : 'desktop'
    for (const shift of CH2_SHIFTS.slice(0, 5)) {
      const ending = Object.entries(shift.steps).find(([, step]) => step.end)?.[0]
      assert(ending, `${shift.id}: has a settlement predecessor`)
      const { page, context } = await open(fixture(ending, 'settle'), mobile)
      await noReading(page)
      assert.equal((await read(page)).dlc.ch2.phase, 'settle')
      assert.equal(await page.locator('[data-ch2-complete="false"]').count(), 1)
      if (shift.id === 'c2n5') await page.screenshot({ path: resolve(output, `seeded-fifth-shift-no-reading-${size}.png`) })
      results.push({ kind: 'seeded-shift-settlement', shift: shift.id, viewport: page.viewportSize(), readingShown: false, fullPlaythrough: false })
      await context.close()
    }

    for (const id of ['c2am_payoff_end', 'c2am_lowdose_teaser0', 'c2am_lowdose_teaser1', 'c2am_lowdose_teaser2']) {
      const { page, context } = await open(fixture(id, 'story'), mobile)
      await noReading(page)
      assert.equal((await read(page)).dlc.ch2.stepId, id)
      assert.equal(await page.locator('[data-ch2-complete="true"]').count(), 0)
      if (id === 'c2am_lowdose_teaser2') await page.screenshot({ path: resolve(output, `seeded-final-teaser-no-reading-${size}.png`) })
      results.push({ kind: 'seeded-incomplete-epilogue', stepId: id, viewport: page.viewportSize(), readingShown: false, fullPlaythrough: false })
      await context.close()
    }

    for (const legacy of [false, true]) {
      const id = legacy ? 'c2am_9' : 'c2am_lowdose_teaser2'
      const save = fixture(id, 'done', legacy), label = legacy ? 'legacy-done' : 'current-done'
      const { page, context } = await open(save, mobile)
      const section = page.locator('[data-ch2-case-reading]')
      await section.waitFor()
      assert.equal(await section.count(), 1)
      assert.match(await section.textContent(), /十五根针/)
      assert.match(await section.textContent(), /罗阿姨的人物、就诊经过与对话为游戏改编/)
      const link = section.getByRole('link', { name: '阅读真实病例与原始影像 ↗', exact: true })
      assert.equal(await link.getAttribute('href'), articleURL)
      assert.equal(await link.getAttribute('target'), '_blank')
      assert.deepEqual((await link.getAttribute('rel')).split(/\s+/).sort(), ['noopener', 'noreferrer'])
      const initialSectionBox = await section.boundingBox(), initialLinkBox = await link.boundingBox()
      const scrollBox = await page.locator('[data-ch2-settlement-scroll]').boundingBox()
      const firstStatBox = await page.locator('[data-ch2-stat="gold"]').boundingBox()
      assert(initialSectionBox && initialLinkBox && scrollBox && firstStatBox)
      assert(initialSectionBox.y >= scrollBox.y && initialSectionBox.y + initialSectionBox.height <= firstStatBox.y,
        'Reading appears directly below the completion header and before the numbers')
      assert(initialLinkBox.y >= scrollBox.y && initialLinkBox.y + initialLinkBox.height <= scrollBox.y + scrollBox.height,
        'The reading link is visible on initial completion display, without scrolling')
      const sectionBox = await fits(page, section)
      const linkBox = await fits(page, link, true)
      assert(linkBox.height >= 44, 'Reading link keeps a touch-friendly height')
      await page.screenshot({ path: resolve(output, `seeded-${label}-reading-${size}.png`) })

      const before = await read(page), beforeStorage = await storage(page), beforeURL = page.url()
      assert.deepEqual(before, save, 'Displaying the completed fixture mutates neither attributes nor progress')
      const requestsBefore = externalRequests.length
      const popupPromise = page.waitForEvent('popup')
      await link.click()
      const popup = await popupPromise
      popup.on('pageerror', error => errors.push(error.message))
      await popup.waitForURL(articleURL)
      await popup.locator('[data-mocked-pmc-response]').waitFor()
      assert.equal(context.pages().length, 2, 'Real click opens a separate tab')
      assert.equal(await popup.evaluate(() => window.opener === null), true, 'External page has no opener')
      assert.equal(await popup.evaluate(() => document.referrer), '', 'External page receives no document referrer')
      assert.equal(externalRequests.length, requestsBefore + 1)
      assert.equal(externalRequests.at(-1).referer, null, 'No HTTP Referer header is sent')
      assert.equal(page.url(), beforeURL, 'The game does not navigate away')
      assert.deepEqual(await read(page), before, 'Opening reading changes no save field, including attributes, inventory, DLCs or progression')
      assert.deepEqual(await storage(page), beforeStorage, 'Opening reading changes no main-origin local storage')
      await popup.close()
      await page.bringToFront()
      await page.reload()
      await page.locator('[data-ch2-complete="true"] [data-ch2-case-reading]').waitFor()
      await settleUI(page)
      assert.deepEqual(await read(page), before, 'Refreshing keeps the exact completed save and does not replay the epilogue')
      assert.deepEqual(await storage(page), beforeStorage)
      assert.equal((await read(page)).dlc.ch2.stepId, id)
      assert.equal(await page.locator('[data-ch2-phase="story"]').count(), 0)
      results.push({ kind: `seeded-${label}`, viewport: page.viewportSize(), stepId: id, fullPlaythrough: false,
        sectionBox, linkBox, href: articleURL, realClickOpenedSeparateTab: true, mockedExternalResponse: true,
        initiallyVisibleBeforeStats: true, openerNull: true, referrerEmpty: true, exactSaveUnchanged: true,
        exactMainOriginStorageUnchanged: true, refreshStaysCompleted: true })
      await context.close()
    }
  }
  assert.equal(results.length, 22)
  assert.equal(externalRequests.length, 4)
  assert.deepEqual(errors, [])
  writeFileSync(resolve(output, 'results.json'), JSON.stringify({ gameURL, results, errors, externalRequests,
    fixtureSavesExplicit: true, fullPlaythroughClaimed: false, playerProfileUsed: false,
    mockedAudio: true, externalArticleContentMocked: true, externalArticleContentVerified: false }, null, 2))
  console.log('PASS case reading: 22 explicit seeded UI scenarios, all five shift settlements and unfinished epilogue hide reading; current/legacy done desktop/390px show it; four real new-tab clicks to the exact mocked PMC URL, noopener/noreferrer, unchanged save/storage, refresh stays completed.')
} catch (error) {
  if (activePage && !activePage.isClosed()) await activePage.screenshot({ path: resolve(output, 'failure.png') }).catch(() => {})
  writeFileSync(resolve(output, 'failure.json'), JSON.stringify({ message: error.message, stack: error.stack, errors, externalRequests, results }, null, 2))
  throw error
} finally { await browser.close() }
