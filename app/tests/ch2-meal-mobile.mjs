// R1 regression: retired interlude cursors + real phone typewriter/choice layout.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { freshState } from '../src/game/store.ts'
import { CH2_SHIFTS, ch2StepForState } from '../src/game/ch2.ts'
import { awaitChapterEntry } from './chapter-entry-driver.mjs'
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const base = process.env.GAME_URL || 'http://127.0.0.1:8798/'
const key = 'midnight-radiology-save-v1'
const fixture = id => ({ ...freshState('m'), night: 5, finished: true,
  stepId: 'n5_end', screenHint: 'chapterEnd', ap: 3, gold: 800,
  lastCheckin: new Date().toISOString().slice(0, 10),
  dlc: { ch2: { shift: id.startsWith('c2d2') ? 'c2d2' : id.startsWith('c2n3') ? 'c2n3' : 'c2n1',
    phase: 'story', stepId: id, viewBg: 'bg_ctcontrol', viewSprite: 'char_lei', appliedSteps: [`ch2-${id}`] } },
})
const steps = Object.assign({}, ...CH2_SHIFTS.map(s => s.steps))
for (const suffix of ['', '_q', '_a', '_b']) {
  const id = 'c2d2_gap_phone' + suffix
  const s = ch2StepForState(id, steps[id], fixture(id))
  assert.match(s.text, /刚坐下来.*饭盒/)
  assert.equal(s.next, 'c2d2_t0')
  assert.equal(s.sprite, ''); assert.equal(s.sprite2, '')
  assert.equal(s.choices, undefined); assert.equal(s.effect, undefined); assert.equal(s.sfx, undefined)
}
assert(!Object.values(steps).some(s => /比我还拧巴|捋直听筒线|换根长线/.test(s.text ?? '')))
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const errors = []
async function restore(page, id) {
  await page.evaluate(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key, state: fixture(id) })
  await page.goto(base + '#/ch2'); await page.reload(); await awaitChapterEntry(page)
  await page.locator(`[data-ch2-step="${id}"]`).waitFor()
}
async function waitComplete(page, choices = false) {
  await page.locator(choices ? '[data-dialogue-choice]' : '.dialog-box > span.animate-bounce').first().waitFor()
}
async function track(page, id, selector, choices = false) {
  await restore(page, id)
  await page.locator(selector).evaluate(img => img.decode())
  await page.evaluate(selector => {
    window.__ys = []
    window.__track = setInterval(() => {
      const img = document.querySelector(selector)
      if (img) window.__ys.push(img.getBoundingClientRect().bottom)
    }, 40)
  }, selector)
  await waitComplete(page, choices)
  const values = await page.evaluate(() => { clearInterval(window.__track); return window.__ys })
  assert(values.length > 2)
  assert(Math.max(...values) - Math.min(...values) < 1, `${id}: patient moved with dialogue (${values})`)
  const bounds = await page.locator(selector).boundingBox()
  const wrap = await page.locator('.dialog-wrap').boundingBox()
  assert(bounds.y >= 35, `${id}: patient above viewport`)
  assert(bounds.y + bounds.height <= wrap.y + 1, `${id}: patient under dialogue`)
  if (choices) {
    const last = page.locator('[data-dialogue-choice]').last()
    await last.click({ trial: true }) // Wait for the existing choice fade-in and scroll both containers.
    const rect = await last.boundingBox()
    assert(rect.y >= 0 && rect.y + rect.height <= page.viewportSize().height + 0.5, `Last choice reachable: ${JSON.stringify(rect)}`)
  }
  return bounds.y + bounds.height
}
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 390, height: 640 }]) {
    const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true })
    await context.addInitScript(() => {
      localStorage.setItem('mr-ch2-unlock', '1'); sessionStorage.setItem('mr-rotate-dismissed', '1')
      HTMLMediaElement.prototype.play = function () { return Promise.resolve() }
    })
    const page = await context.newPage(); page.setDefaultTimeout(15000)
    page.on('pageerror', e => errors.push(e.message))
    await page.goto(base)
    const bed = '.ch2-patient-bed'
    const a = await track(page, 'c2n1_m1', bed)
    const b = await track(page, 'c2n1_m2', bed, true)
    assert(Math.abs(a - b) < 1, 'Same bed baseline across long prose and choices')
    if (viewport.height === 844) await page.screenshot({ path: '../../ch2-mobile-patient-review.png' })
    await track(page, 'c2n3_h2', '.ch2-patient-wheelchair', true)
    await restore(page, 'c2d2_gap_phone_q') // Old save inside removed detour.
    await waitComplete(page)
    assert.equal(await page.locator('.sprite-l, .sprite-r').count(), 0)
    assert.equal(await page.locator('[data-dialogue-choice]').count(), 0)
    await page.waitForTimeout(350); await page.locator('.dialog-box > p').click()
    await page.locator('[data-ch2-step="c2d2_t0"] .ch2-patient-bed').waitFor()
    console.log(`PASS ${viewport.width}x${viewport.height}: stable bed/wheelchair, choices accessible, retired cursor → meal → trauma`)
    await context.close()
  }
  // Desktop retains the original measured-dialogue placement.
  const context = await browser.newContext({ viewport: { width: 1365, height: 900 } })
  const page = await context.newPage(); await page.goto(base)
  await page.evaluate(() => { localStorage.setItem('mr-ch2-unlock', '1'); sessionStorage.setItem('mr-rotate-dismissed', '1') })
  await restore(page, 'c2n1_m2'); await waitComplete(page, true)
  const bed = await page.locator('.ch2-patient-bed').boundingBox()
  const wrap = await page.locator('.dialog-wrap').boundingBox()
  assert(Math.abs(wrap.y - (bed.y + bed.height) - 8) < 2, 'Desktop measured baseline unchanged')
  await context.close()
  assert.deepEqual(errors, [])
  console.log('PASS desktop unchanged; four retired IDs compatible; no page errors')
} finally { await browser.close() }
