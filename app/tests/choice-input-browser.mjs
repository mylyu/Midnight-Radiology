// Trusted mouse/touch/keyboard input across the moment choices appear.
// Isolated seeded fixtures, not a substitute for full chapter playthroughs.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { freshState } from '../src/game/store.ts'
import { NIGHTS } from '../src/game/data.ts'
import { CH2_SHIFTS } from '../src/game/ch2.ts'
import { awaitChapterEntry } from './chapter-entry-driver.mjs'

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const url = (process.env.GAME_URL || 'http://127.0.0.1:8798/').replace(/\/$/, '') + '/'
const key = 'midnight-radiology-save-v1'
const errors = []
let count = 0

async function fixture(chapter, mobile = false, options = {}) {
  const id = options.id ?? (chapter === 1 ? 'n1_s16' : 'c2n1_m2')
  const step = chapter === 1 ? NIGHTS[0].steps[id] : CH2_SHIFTS[0].steps[id]
  const save = { ...freshState('m'), lastCheckin: new Date().toISOString().slice(0, 10),
    night: 1, screenHint: 'night', stepId: id, resumeKey: `1-${id}`, gold: 500, ap: 3,
    ...(chapter === 2 ? { finished: true, screenHint: 'chapterEnd', flags: { quiz_grade: 'S' },
      dlc: { ch2: { shift: 'c2n1', stepId: id, phase: 'story', appliedSteps: [`ch2-${id}`] } } } : {}), ...options.save }
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 }, hasTouch: mobile, isMobile: mobile })
  await context.addInitScript(({ save, key }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(save))
    localStorage.setItem('mr-ch2-unlock', '1')
    sessionStorage.setItem('mr-rotate-dismissed', '1')
    HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('Fixture audio denied', 'NotAllowedError'))
  }, { save, key })
  const page = await context.newPage()
  page.on('pageerror', e => errors.push(e.message))
  page.setDefaultTimeout(30000)
  const stage = () => page.locator(`[data-ch${chapter}-step="${id}"]`)
  async function enter(reload = false) {
    if (reload) await page.reload({ waitUntil: 'domcontentloaded' })
    else await page.goto(`${url}${chapter === 2 ? '#/ch2' : ''}`, { waitUntil: 'domcontentloaded' })
    if (chapter === 1) {
      await page.getByRole('button', { name: '▶ 继续夜班（自动存档）', exact: true }).click()
      await awaitChapterEntry(page)
      await page.getByRole('button', { name: /^(出发，上夜班|回到夜班现场) →$/ }).click()
    } else await awaitChapterEntry(page)
    await stage().waitFor()
  }
  const cursor = async () => page.evaluate(({ key, chapter }) => {
    const saved = JSON.parse(localStorage.getItem(key))
    return chapter === 1 ? saved.stepId : saved.dlc.ch2.stepId
  }, { key, chapter })
  const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)
  const reveal = () => page.locator('.dialog-box > p').click()
  const answer = () => stage().locator('[data-dialogue-choice="0"]')
  const tap = (x, y) => mobile ? page.touchscreen.tap(x, y) : page.mouse.click(x, y)
  await enter()
  return { chapter, id, step, context, page, stage, enter, cursor, read, reveal, answer, tap }
}

try {
  for (const chapter of [1, 2]) for (const mobile of [false, true]) {
    const f = await fixture(chapter, mobile)
    try {
      await f.reveal()
      await f.answer().waitFor()
      const bounds = await f.answer().boundingBox()
      assert(bounds)
      const x = bounds.x + bounds.width / 2, y = bounds.y + bounds.height / 2
      await f.enter(true)
      await f.reveal()
      const before = await f.read()
      // Fixed coordinates, not a locator that follows a moving text node. The
      // button appears under this continuing stream of actual user gestures.
      for (let i = 0; i < 16; i++) {
        await f.tap(x, y)
        await f.page.waitForTimeout(90)
      }
      assert.equal(await f.cursor(), f.id, 'No answer is selected by continuing fast-forward taps')
      assert.deepEqual(await f.read(), before, 'No reward, choice, risk or cursor is committed by rejected taps')
      await f.page.waitForTimeout(350)
      await f.tap(x, y)
      await f.page.waitForFunction(({ key, chapter, id }) => {
        const saved = JSON.parse(localStorage.getItem(key))
        return (chapter === 1 ? saved.stepId : saved.dlc.ch2.stepId) !== id
      }, { key, chapter, id: f.id })
      count++
      console.log(`PASS Ch${chapter} ${mobile ? 'touch390' : 'mouse'} fixed-coordinate spam across choice appearance; pause then choose`)
    } finally { await f.context.close() }
  }

  for (const chapter of [1, 2]) {
    const f = await fixture(chapter)
    try {
      await f.reveal()
      await f.answer().waitFor()
      const bounds = await f.answer().boundingBox()
      await f.enter(true)
      await f.reveal()
      await f.page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
      await f.page.mouse.down()
      await f.answer().waitFor()
      await f.page.mouse.up()
      assert.equal(await f.cursor(), f.id, 'A press begun before button appearance cannot become a choice on release')
      await f.page.waitForTimeout(350)
      await f.answer().focus()
      // Browser dispatch uses the explicit repeat flag; subsequent deliberate
      // Enter is trusted keyboard input and must still succeed.
      await f.answer().dispatchEvent('keydown', { key: 'Enter', repeat: true })
      await f.answer().dispatchEvent('click', { detail: 0 })
      assert.equal(await f.cursor(), f.id, 'A repeating held key cannot select')
      await f.page.waitForTimeout(350)
      await f.page.keyboard.press('Enter')
      await f.page.waitForFunction(({ key, chapter, id }) => {
        const saved = JSON.parse(localStorage.getItem(key))
        return (chapter === 1 ? saved.stepId : saved.dlc.ch2.stepId) !== id
      }, { key, chapter, id: f.id })
      count++
      console.log(`PASS Ch${chapter} held pointer across appearance, repeated-key rejection, deliberate keyboard activation`)
    } finally { await f.context.close() }
  }
  for (const kind of ['hint', 'gift']) {
    const f = await fixture(2, false, kind === 'hint'
      ? { id: 'c2n1_w1ok', save: { skill: 8 } }
      : { id: 'c2n1_chat_q', save: { items: ['milktea'] } })
    try {
      await f.reveal()
      const option = f.page.getByRole('button', { name: kind === 'hint' ? '想一想以前学过的观察方法' : '把奶茶递给小唐', exact: true })
      await option.waitFor()
      await option.click()
      assert.equal(await f.cursor(), f.id, 'The temporary reply uses the same persisted node')
      await f.page.waitForTimeout(350)
      await f.reveal()
      await f.page.waitForTimeout(350)
      await f.reveal()
      await f.page.waitForFunction(({ key, kind }) => {
        const progress = JSON.parse(localStorage.getItem(key)).dlc.ch2
        return kind === 'hint' ? !progress.statInteractions?.pending : !progress.giftReply
      }, { key, kind })
      await f.page.waitForTimeout(350)
      await f.reveal()
      assert.equal(await f.stage().locator('[data-dialogue-choice]').count(), 0, 'Returning to choices must not reuse the reply/old readiness')
      await f.page.waitForTimeout(500)
      assert.equal(await f.stage().locator('[data-dialogue-choice]').count(), 0, 'Same-node return still receives the normal 900ms buffer')
      await f.answer().waitFor()
      const state = await f.read()
      if (kind === 'hint') {
        assert.equal(Object.keys(state.dlc.ch2.observations ?? {}).length, 0, 'Method help never submits the observation')
        assert.deepEqual(state.dlc.ch2.statInteractions.seenHints, ['fall'])
      } else {
        assert.equal(state.items.includes('milktea'), false)
        assert.equal(state.dlc.ch2.loop.gifts.length, 1, 'Gift is consumed only once')
      }
      await f.answer().click()
      count++
      console.log(`PASS Ch2 same-node ${kind} reply returns to a freshly guarded choice presentation`)
    } finally { await f.context.close() }
  }
  assert.deepEqual(errors, [])
  console.log(`PASS ${count} isolated Edge input scenarios`)
} finally { await browser.close() }
