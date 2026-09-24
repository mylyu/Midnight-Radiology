// Isolated Edge contexts only: no existing user profile or save is opened.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { freshState } from '../src/game/store.ts'
import { CH2_SHIFTS } from '../src/game/ch2.ts'
import { CH2_CHECKINS, completeCh2Checkin } from '../src/game/ch2-checkin.ts'

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const output = resolve(process.env.CHECKIN_OUTPUT || '../../ch2-checkin-review')
mkdirSync(output, { recursive: true })
const url = (process.env.GAME_URL || 'http://127.0.0.1:8798/').replace(/\/$/, '') + '/#/ch2'
const saveKey = 'midnight-radiology-save-v1'
const errors = [], results = []
const touchSessions = new WeakMap()
const stage = page => page.locator('[data-ch2-step]')
const checkin = page => page.locator('[data-ch2-checkin]')
const thumb = page => page.locator('[data-ch2-checkin-thumb]')
const read = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), saveKey)
const economy = s => Object.fromEntries(['gold', 'ap', 'skill', 'heart', 'wealth', 'durability', 'items', 'badges', 'cards', 'events', 'stamps'].map(key => [key, s[key]]))
const protectedState = s => ({ ...Object.fromEntries(['night', 'finished', 'buyCount', 'lotteryNight', 'lotteryCount', 'lastCheckin', 'streak'].map(key => [key, s[key]])),
  inherited: { quiz_grade: s.flags.quiz_grade, archive_sealed: s.flags.archive_sealed, mystery_told: s.flags.mystery_told }, dr: s.dlc.dr, dsa: s.dlc.dsa })
const original = id => CH2_SHIFTS.find(row => row.id === CH2_CHECKINS[id].shift).steps[id]
const fixture = (id, patch = {}) => ({ ...freshState('f'), seed: 24680, gold: 876, ap: 2, skill: 7, heart: 8, wealth: 4,
  finished: true, night: 5, buyCount: 27, lotteryNight: 5, lotteryCount: 4, lastCheckin: '2026-09-23', streak: 6,
  items: ['book'], badges: ['fixer'], cards: [], events: [], flags: { quiz_grade: 'S', archive_sealed: true, mystery_told: true },
  dlc: { dr: { done: true }, dsa: { done: true, dose: 42 }, ch2: {
    shift: CH2_CHECKINS[id].shift, stepId: id, phase: 'story', appliedSteps: [], ...patch,
  } } })

async function open(id, { mobile = false, landscape = false, predecessor = false, patch = {} } = {}) {
  const context = await browser.newContext({ viewport: landscape ? { width: 844, height: 390 } : mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 }, hasTouch: mobile || landscape })
  const save = fixture(id, { ...(predecessor ? { stepId: id.replace(/_1$/, '_0') } : {}), ...patch })
  await context.addInitScript(({ save, saveKey }) => {
    localStorage.setItem('mr-ch2-unlock', '1')
    if (!localStorage.getItem(saveKey)) localStorage.setItem(saveKey, JSON.stringify(save))
    HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('Blocked for test', 'NotAllowedError'))
  }, { save, saveKey })
  const page = await context.newPage()
  page.setDefaultTimeout(10000)
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(url)
  if (mobile && !landscape) await page.getByRole('button', { name: '不了，竖屏也能玩', exact: true }).click()
  if (!patch.done) await page.locator(`[data-ch2-step="${save.dlc.ch2.stepId}"]`).waitFor()
  if (predecessor) {
    await advance(page, save.dlc.ch2.stepId, id)
    assert.equal((await read(page)).gold, save.gold, 'Entering the new check-in cannot pay early')
    assert.equal((await read(page)).ap, save.ap)
  }
  return { context, page, save }
}
async function reveal(page) {
  if (!await page.locator('.dialog-box .animate-bounce').count()) await page.locator('.dialog-box > p').click()
}
async function gateReady(page, id) {
  if (!await checkin(page).count()) await reveal(page)
  await checkin(page).waitFor()
  assert.equal(await stage(page).getAttribute('data-ch2-step'), id)
  assert.equal(await thumb(page).getAttribute('aria-valuenow'), '0')
  assert.equal(await thumb(page).getAttribute('role'), 'slider')
  const box = await thumb(page).boundingBox(), viewport = page.viewportSize()
  assert(box.width >= 44 && box.height >= 44, 'The drag target stays touch sized')
  assert(box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width && box.y + box.height <= viewport.height, 'The slider must be reachable without clipping')
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow')
}
async function advance(page, from, to) {
  await reveal(page)
  await page.locator('.dialog-box .animate-bounce').waitFor()
  await page.locator('.dialog-box > p').click()
  await page.locator(`[data-ch2-step="${to}"]`).waitFor()
  await page.waitForFunction(({ key, id }) => JSON.parse(localStorage.getItem(key)).dlc.ch2.stepId === id, { key: saveKey, id: to })
  assert.notEqual(from, to)
}
async function geometry(page) {
  await thumb(page).scrollIntoViewIfNeeded()
  const path = await page.locator('.ch2-checkin-path').boundingBox(), box = await thumb(page).boundingBox()
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, travel: path.width - box.width }
}
async function mouseDrag(page, fraction, { release = true } = {}) {
  const p = await geometry(page)
  await page.mouse.move(p.x, p.y); await page.mouse.down()
  await page.mouse.move(p.x + p.travel * fraction, p.y, { steps: 12 })
  await page.waitForFunction(expected => Math.abs(Number(document.querySelector('[data-ch2-checkin-thumb]')?.getAttribute('aria-valuenow')) - expected) <= 2, fraction * 100)
  if (release) await page.mouse.up()
  return p
}
async function touchDrag(page, fraction, { release = true, cancel = false } = {}) {
  const p = await geometry(page)
  await page.evaluate(() => {
    if (!window.__checkinInputTrace) {
      for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'lostpointercapture']) document.addEventListener(type, event => window.__checkinInputTrace.push({ type, x: event.clientX, target: event.target.className, button: event.button, primary: event.isPrimary }), true)
    }
    window.__checkinInputTrace = []
  })
  if (!touchSessions.has(page)) touchSessions.set(page, await page.context().newCDPSession(page))
  const cdp = touchSessions.get(page)
  const point = x => [{ x, y: p.y, id: 1, radiusX: 2, radiusY: 2, force: 1 }]
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(p.x) })
  for (let i = 1; i <= 12; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(p.x + p.travel * fraction * i / 12) })
  try {
    await page.waitForFunction(expected => Math.abs(Number(document.querySelector('[data-ch2-checkin-thumb]')?.getAttribute('aria-valuenow')) - expected) <= 2, fraction * 100)
  } catch (error) {
    throw new Error(`Touch drag did not reach ${fraction * 100}%: ${JSON.stringify(await page.evaluate(() => ({ progress: document.querySelector('[data-ch2-checkin-thumb]')?.getAttribute('aria-valuenow'), trace: window.__checkinInputTrace })))}`, { cause: error })
  }
  if (release || cancel) await cdp.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] })
  return { cdp, p }
}
async function unchanged(page, before, id, message) {
  const now = await read(page)
  assert.deepEqual(economy(now), economy(before), message)
  assert.deepEqual(now.flags, before.flags, message)
  assert.equal(now.dlc.ch2.stepId, id, message)
  assert(!now.dlc.ch2.appliedSteps.includes(`ch2-${id}`), message)
  assert(!now.dlc.ch2.loop.entries.some(row => row.id === `ch2-${id}`), message)
  assert.deepEqual(protectedState(now), protectedState(before))
}
async function resetPosition(page) {
  await page.waitForFunction(() => document.querySelector('[data-ch2-checkin-thumb]')?.getAttribute('aria-valuenow') === '0')
  await page.waitForTimeout(270) // Let the visible spring-back finish before starting another real drag.
}
async function successful(page, before, id) {
  await checkin(page).waitFor({ state: 'detached' })
  const now = await read(page), effect = original(id).effect
  assert.equal(now.dlc.ch2.stepId, id, 'Success cannot skip the original check-in dialogue')
  assert.equal(now.gold, before.gold + (effect?.gold ?? 0))
  assert.equal(now.ap, before.ap + (effect?.ap ?? 0))
  assert.deepEqual({ ...economy(now), gold: before.gold, ap: before.ap }, economy(before))
  assert.equal(now.flags[`c2_checkin_${CH2_CHECKINS[id].shift}`], true)
  assert.equal(now.dlc.ch2.appliedSteps.filter(key => key === `ch2-${id}`).length, 1)
  const receipts = now.dlc.ch2.loop.entries.filter(row => row.id === `ch2-${id}`)
  assert.equal(receipts.length, 1)
  assert.equal(receipts[0].delta.gold, effect?.gold ?? 0); assert.equal(receipts[0].delta.ap, effect?.ap ?? 0)
  assert.deepEqual(protectedState(now), protectedState(before))
  // A real reload sees one saved transaction and no renewed gate.
  await page.reload(); await page.locator(`[data-ch2-step="${id}"]`).waitFor()
  await reveal(page)
  assert.equal(await checkin(page).count(), 0)
  const restored = await read(page)
  assert.deepEqual(economy(restored), economy(now)); assert.deepEqual(restored.flags, now.flags)
  assert.deepEqual(restored.dlc.ch2.appliedSteps, now.dlc.ch2.appliedSteps)
  assert.deepEqual(restored.dlc.ch2.loop.entries, now.dlc.ch2.loop.entries)
  await advance(page, id, original(id).next)
  assert.equal((await read(page)).gold, now.gold, 'Continuing the original dialogue cannot pay again')
  assert.equal((await read(page)).ap, now.ap)
}

try {
  for (const mobile of [false, true]) for (const id of Object.keys(CH2_CHECKINS)) {
    const { context, page } = await open(id, { mobile, predecessor: !mobile && id.includes('n') })
    await gateReady(page, id)
    const before = await read(page)
    // Fast background clicks, Enter/Space, and a track-end tap are not acknowledgement.
    await page.locator('.ch2-checkin-location').click({ clickCount: 5, delay: 20 })
    await page.keyboard.press('Enter'); await page.keyboard.press('Space')
    const p = await geometry(page)
    if (mobile) await page.touchscreen.tap(p.x + p.travel, p.y)
    else await page.mouse.click(p.x + p.travel, p.y)
    await unchanged(page, before, id, 'Background/rapid-next/track tap must not count')
    if (mobile) await touchDrag(page, .5)
    else await mouseDrag(page, .5)
    await resetPosition(page)
    await unchanged(page, before, id, 'Half drag returns to the start without reward')
    if (mobile) {
      await touchDrag(page, .98, { cancel: true })
      await resetPosition(page)
      await unchanged(page, before, id, 'A genuine touch cancellation at the endpoint is not completion')
    }
    if (id === 'c2n1_1') {
      // Reload during held input cannot save transient slider progress or income.
      if (mobile) await touchDrag(page, .5, { release: false })
      else await mouseDrag(page, .5, { release: false })
      assert(Number(await thumb(page).getAttribute('aria-valuenow')) >= 45)
      await page.reload()
      if (mobile) await touchSessions.get(page).send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] })
      else await page.mouse.up()
      await gateReady(page, id)
      await unchanged(page, before, id, 'Refresh during a drag returns to the pending gate')
    }
    if (!mobile && id === 'c2n3_1') {
      // A real tab focus change interrupts the active capture.
      const cdp = await context.newCDPSession(page)
      await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: false })
      await mouseDrag(page, .98, { release: false })
      const other = await context.newPage(); await other.goto('about:blank'); await other.bringToFront()
      assert.equal(await page.evaluate(() => document.hasFocus()), false)
      await page.bringToFront(); await page.mouse.up(); await other.close()
      await resetPosition(page)
      await unchanged(page, before, id, 'Backgrounding at the endpoint must cancel the gesture')
      await cdp.detach()
    }
    if (id === 'c2n1_1') await page.screenshot({ path: resolve(output, mobile ? 'mobile-ready.png' : 'desktop-ready.png') })
    if (mobile) {
      const { cdp } = await touchDrag(page, 1, { release: false })
      if (id === 'c2n1_1') await page.screenshot({ path: resolve(output, 'mobile-held-at-end.png') })
      await unchanged(page, before, id, 'Reaching the endpoint without releasing cannot complete')
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    } else {
      await mouseDrag(page, 1, { release: false })
      if (id === 'c2n1_1') await page.screenshot({ path: resolve(output, 'desktop-held-at-end.png') })
      await unchanged(page, before, id, 'Reaching the endpoint without releasing cannot complete')
      await page.mouse.up()
    }
    await successful(page, before, id)
    results.push({ mode: mobile ? '390px-touch' : 'desktop-mouse', id, passed: true })
    await context.close()
  }

  // The accessible route also requires reaching the end before confirmation.
  for (const confirm of ['Enter', 'Space']) {
    const { context, page } = await open('c2n5_1', { landscape: true })
    await gateReady(page, 'c2n5_1'); const before = await read(page)
    await thumb(page).focus(); await page.keyboard.press(confirm)
    await unchanged(page, before, 'c2n5_1', 'Keyboard confirmation from the start must not count')
    await page.keyboard.press('ArrowRight')
    assert.equal(await thumb(page).getAttribute('aria-valuenow'), '10')
    await page.keyboard.press('Escape'); assert.equal(await thumb(page).getAttribute('aria-valuenow'), '0')
    await page.keyboard.press('End')
    assert.equal(await thumb(page).getAttribute('aria-valuenow'), '100')
    await unchanged(page, before, 'c2n5_1', 'Keyboard movement alone cannot complete')
    if (confirm === 'Enter') await page.screenshot({ path: resolve(output, 'mobile-landscape-keyboard.png') })
    await page.keyboard.press(confirm)
    await successful(page, before, 'c2n5_1')
    results.push({ mode: `landscape-keyboard-${confirm}`, id: 'c2n5_1', passed: true }); await context.close()
  }

  for (const id of Object.keys(CH2_CHECKINS)) for (const legacy of ['applied', 'cursor-only', 'receipt-only']) {
    const patch = legacy === 'receipt-only' ? { appliedSteps: [], loop: completeCh2Checkin(fixture(id), id).dlc.ch2.loop }
      : { appliedSteps: legacy === 'applied' ? [`ch2-${id}`] : undefined }
    const { context, page, save } = await open(id, { patch })
    await reveal(page); await page.locator('.dialog-box .animate-bounce').waitFor()
    assert.equal(await checkin(page).count(), 0, `${id}: old ${legacy} save cannot regain a gate`)
    assert.deepEqual(economy(await read(page)), economy(save), 'Legacy loading cannot repay')
    await advance(page, id, original(id).next)
    assert.deepEqual(economy(await read(page)), economy(save))
    results.push({ legacy, id, passed: true }); await context.close()
  }
  {
    const { context, page, save } = await open('c2n5_1', { patch: { stepId: 'c2am_9', phase: 'done', done: true, appliedSteps: ['ch2-c2n5_1'] } })
    await page.locator('[data-ch2-complete="true"]').waitFor()
    assert.equal(await checkin(page).count(), 0)
    assert.deepEqual(await read(page), save, 'Directly restoring a done save must not restart it')
    await page.reload(); await page.locator('[data-ch2-complete="true"]').waitFor()
    assert.deepEqual(await read(page), save)
    results.push({ completedSave: true, passed: true }); await context.close()
  }
  assert.deepEqual(errors, [])
  writeFileSync(resolve(output, 'results.json'), JSON.stringify({ results, errors }, null, 2))
  console.log('PASS all five desktop/mouse and 390px/CDP-touch check-ins; half/cancel/background/track/rapid-next guards; keyboard/landscape; mid-drag and post-success reload; legacy/done saves; original dialogue and exactly-once economy')
} finally { await browser.close() }
