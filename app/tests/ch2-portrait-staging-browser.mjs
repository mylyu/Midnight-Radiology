// Real production bundle and images, isolated saved-cursor fixtures. Never use
// the author's browser profile or mutate their normal game save.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { freshState } from '../src/game/store.ts'
import { awaitChapterEntry } from './chapter-entry-driver.mjs'
import { resolveMediaIdentities } from './media-identity-driver.mjs'

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const catalog = JSON.parse(readFileSync(new URL('../src/lib/image-assets.catalog.json', import.meta.url), 'utf8'))
const url = `${(process.env.GAME_URL || 'http://127.0.0.1:8811/Midnight-Radiology/').replace(/\/$/, '')}/#/ch2`
const output = resolve(process.env.PORTRAIT_OUTPUT || '../../ch2-portrait-review')
const key = 'midnight-radiology-save-v1', results = [], errors = [], failures = []
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const read = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)
const current = page => page.locator('[data-ch2-step]')
const dialog = page => page.locator('.dialog-box > p')
const snapshot = s => ({ gold: s.gold, skill: s.skill, heart: s.heart, wealth: s.wealth, ap: s.ap,
  flags: s.flags, badges: s.badges, items: s.items, cards: s.cards, events: s.events,
  first: [s.night, s.finished, s.stamps, s.stepId, s.screenHint], dr: s.dlc.dr, dsa: s.dlc.dsa })

async function open(stepId, { mobile = false, items = [], flags = {} } = {}) {
  const save = { ...freshState('m'), night: 5, finished: true, stepId: 'n5_end', screenHint: 'chapterEnd',
    gold: 870, skill: 12, heart: 9, ap: 0, items, cards: [], events: [],
    flags: { quiz_grade: 'S', c2_social_lei: true, c2_social_wen: true, c2n5_cabinet: true,
      c2n5_chat_roster: true, c2_needle_seen: true, c2_needle_resolved: true, term_checked: true, ...flags },
    dlc: { dr: { done: true }, dsa: { dose: 27 }, ch2: { shift: 'c2n5', phase: 'story', stepId,
      viewBg: stepId.includes('chat') ? 'bg_breakroom' : 'bg_ctcontrol',
      // Reproduce a stale pre-fix snapshot in BOTH portrait slots.
      viewSprite: 'char_lei', viewSprite2: 'char_lei', appliedSteps: [`ch2-${stepId}`] } } }
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
    isMobile: mobile, hasTouch: mobile })
  await context.addInitScript(({ key, save }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(save))
    localStorage.setItem('mr-ch2-unlock', '1')
    sessionStorage.setItem('mr-rotate-dismissed', '1')
    HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('Test autoplay rejection', 'NotAllowedError'))
    window.__portraitFrames = []
    const capture = () => {
      const stage = document.querySelector('[data-ch2-step]')
      if (!stage) return
      const value = { id: stage.dataset.ch2Step, sources: [...stage.querySelectorAll('.sprite-l,.sprite-r')].map(image => image.src) }
      if (JSON.stringify(window.__portraitFrames.at(-1)) !== JSON.stringify(value)) window.__portraitFrames.push(value)
    }
    new MutationObserver(capture).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'data-ch2-step'] })
  }, { key, save })
  const page = await context.newPage()
  page.setDefaultTimeout(20000)
  page.on('pageerror', error => errors.push(error.message))
  page.on('response', response => { if (response.status() >= 400) failures.push({ url: response.url(), status: response.status() }) })
  await page.goto(url)
  await awaitChapterEntry(page)
  await current(page).waitFor()
  return { page, context, save }
}
async function at(page, id) {
  await page.locator(`[data-ch2-step="${id}"]`).waitFor()
  await page.waitForTimeout(350)
  await dialog(page).click()
  await page.locator('.dialog-box > span.animate-bounce, .choice-in button').first().waitFor()
}
async function next(page, id) {
  await page.locator('.dialog-box > span.animate-bounce').waitFor()
  await page.waitForTimeout(350)
  await dialog(page).click()
  await at(page, id)
}
async function choose(page, text, id) {
  await page.waitForTimeout(350)
  await page.getByRole('button', { name: text, exact: true }).click()
  await at(page, id)
}
async function portraits(page, expected) {
  const nodes = current(page).locator('.sprite-l,.sprite-r')
  assert.equal(await nodes.count(), expected.length)
  if (expected.length) await nodes.evaluateAll(images => Promise.all(images.map(image => image.decode())))
  const rows = await resolveMediaIdentities(page, await nodes.evaluateAll(images => images.map(image => image.src)))
  assert.deepEqual(rows.map(row => row.paths[0]).sort(), expected.map(id => `assets/${catalog[id]}`).sort())
}
async function noGhostFrames(page, ids) {
  const frames = await page.evaluate(ids => window.__portraitFrames.filter(frame => ids.includes(frame.id)), ids)
  assert(frames.length, 'Capture actual DOM node presentations')
  for (const frame of frames) assert.deepEqual(frame.sources, [], `${frame.id}: old portrait leaked into a rendered frame`)
}

try {
  for (const mobile of [false, true]) {
    const { page, context } = await open('c2n5_chat_q', { mobile })
    try {
      await at(page, 'c2n5_chat_q'); await portraits(page, [])
      await page.screenshot({ path: `${output}/chat-menu-${mobile ? '390px' : 'desktop'}.png` })
      await choose(page, '「雯雯那边我也问了，单子后来分开了吗？」', 'c2n5_chat_both1')
      await portraits(page, ['ch2_pixel_char_lei'])
      await next(page, 'c2n5_chat_both2'); await portraits(page, ['ch2_pixel_char_tang'])
      await next(page, 'c2n5_chat_both3'); await portraits(page, ['ch2_pixel_char_lei'])
      await next(page, 'c2n5_chat_q'); await portraits(page, [])
      const before = snapshot(await read(page))
      await page.reload(); await awaitChapterEntry(page); await at(page, 'c2n5_chat_q')
      await portraits(page, []); assert.deepEqual(snapshot(await read(page)), before)
      await choose(page, '「得，我回去值班了。」', 'c2n5_chat_end')
      await portraits(page, []); await next(page, 'c2n5_hub'); await portraits(page, [])
      await noGhostFrames(page, ['c2n5_chat_q', 'c2n5_chat_end', 'c2n5_hub'])
      results.push({ name: `chat-and-exit-${mobile ? 'mobile' : 'desktop'}`, passed: true })
    } finally { await context.close() }
  }
  for (const person of ['小雷', '小唐']) {
    const { page, context } = await open('c2n5_chat_q', { items: ['milktea'] })
    try {
      await at(page, 'c2n5_chat_q')
      await choose(page, `把奶茶递给${person}`, 'c2n5_chat_q')
      await portraits(page, [person === '小雷' ? 'ch2_pixel_char_lei' : 'ch2_pixel_char_tang'])
      await next(page, 'c2n5_chat_q'); await portraits(page, [])
      const state = await read(page)
      assert.deepEqual(state.items, []); assert.equal(state.dlc.ch2.loop.gifts.length, 1)
      await page.reload(); await awaitChapterEntry(page); await at(page, 'c2n5_chat_q'); await portraits(page, [])
      assert.equal((await read(page)).dlc.ch2.loop.gifts.length, 1)
      results.push({ name: `gift-return-${person}`, passed: true })
    } finally { await context.close() }
  }
  for (const id of ['c2n5_n7', 'c2n5_n8', 'c2n5_n8a', 'c2n5_n8b', 'c2n5_n8c', 'c2n5_sms_lei_pending',
    'c2n5_hub', 'c2n5_a1', 'c2n5_terminal_screen', 'c2n5_needle_record', 'c2n5_n1', 'c2n5_g0']) {
    const { page, context, save } = await open(id)
    try {
      await at(page, id); await portraits(page, [])
      await noGhostFrames(page, [id])
      assert.deepEqual(snapshot(await read(page)), snapshot(save), `${id}: fixing old visual state must not issue old rewards`)
      results.push({ name: `old-view-clear-${id}`, passed: true })
    } finally { await context.close() }
  }
  const { page, context } = await open('c2n5_payoff_lei0')
  try {
    await at(page, 'c2n5_payoff_lei0'); await portraits(page, ['ch2_pixel_char_lei'])
    await next(page, 'c2n5_payoff_lei1'); await portraits(page, ['ch2_pixel_char_lei'])
    await next(page, 'c2n5_hub'); await portraits(page, [])
    assert.equal((await read(page)).flags.c2_payoff_lei_gift, true)
    await noGhostFrames(page, ['c2n5_hub'])
    results.push({ name: 'in-person-return-gift-preserved', passed: true })
  } finally { await context.close() }
  assert.deepEqual(errors, []); assert.deepEqual(failures, [])
  console.log(`PASS Ch2 portrait staging: ${results.length} browser scenarios; screenshots, both gifts, stale saves, messages and real conversations`)
} finally {
  writeFileSync(`${output}/browser-report.json`, JSON.stringify({ url, results, errors, failures }, null, 2))
  await browser.close()
}
