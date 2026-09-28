// Disposable production-build fixtures. Wait for the shared build; never build here.
// LDCT_SCAN_FILTER selects one affected group for a justified follow-up.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { freshState } from '../src/game/store.ts'
import { selectLdctStory } from '../src/game/ldct-session.ts'
import { getLdctNode } from '../src/game/ldct.ts'
import { createLdctLabState } from '../src/game/ldct-experiments.ts'
import { LDCT_NOISY_DATA_VERSION } from '../src/game/ldct-noisy-chest.ts'

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const key = 'midnight-radiology-save-v1', eventKey = 'ldct-scan-test-events', observedKey = 'ldct-scan-test-observed'
const baseUrl = process.env.GAME_URL || 'http://127.0.0.1:8798/'
const url = baseUrl + '#/dlc/ldct'
const output = resolve('../../ldct-scan-review')
const filter = new RegExp(process.env.LDCT_SCAN_FILTER || '.')
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
function fixture(nodeId, round) {
  const state = selectLdctStory({ ...freshState('m'), gold: 900, skill: 9, heart: 7, wealth: 4,
    flags: { scan_main_flag: true }, dlc: { ch2: { done: true, certificate: { code: 'KEEP' } }, dsa: { dose: 77 } } }, 'father')
  const progress = { ...state.dlc.ldct.ldct, nodeId, phase: round ? 'lab' : 'story',
    ...(round ? { labRound: round, labDraft: createLdctLabState(round, 'chest') } : {}) }
  state.dlc.ldct.ldct = progress
  state.dlc.ldct.ldctStories.slots.father = progress
  return state
}
const stats = state => ({ gold: state.gold, skill: state.skill, heart: state.heart, wealth: state.wealth, badges: state.badges })
async function withFixture(name, nodeId, task, { rejectPlayback = false, round, viewport = { width: 1366, height: 900 } } = {}) {
  if (!filter.test(name)) return
  const state = fixture(nodeId, round)
  const context = await browser.newContext({ viewport, hasTouch: true })
  await context.addInitScript(({ key, state, eventKey, observedKey, rejectPlayback }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state))
    localStorage.setItem('mr-ldct-unlock', '1')
    sessionStorage.setItem('mr-rotate-dismissed', '1')
    const originalSet = Storage.prototype.setItem
    const append = event => {
      const events = JSON.parse(sessionStorage.getItem(eventKey) || '[]')
      events.push({ ...event, at: Date.now() })
      originalSet.call(sessionStorage, eventKey, JSON.stringify(events))
    }
    Storage.prototype.setItem = function (name, value) {
      originalSet.call(this, name, value)
      if (this !== localStorage || name !== key) return
      const progress = JSON.parse(value)?.dlc?.ldct?.ldct
      if (!progress) return
      const observed = JSON.parse(sessionStorage.getItem(observedKey) || '{}')
      for (const [id, session] of Object.entries(progress.scanSessions || {})) {
        const fingerprint = JSON.stringify(session)
        if (observed[id] !== fingerprint) {
          append({ type: 'save', id, session, node: progress.nodeId })
          observed[id] = fingerprint
        }
      }
      originalSet.call(sessionStorage, observedKey, JSON.stringify(observed))
    }
    const ids = new WeakMap(), documentId = crypto.randomUUID()
    let serial = 0
    const mediaEvent = (media, type) => {
      if (!ids.has(media)) ids.set(media, `${documentId}:${++serial}`)
      append({ type, id: ids.get(media), src: media.src, volume: media.volume, loop: media.loop, currentTime: media.currentTime,
        node: document.querySelector('[data-ldct-node]')?.getAttribute('data-ldct-node') })
    }
    HTMLMediaElement.prototype.play = function () {
      mediaEvent(this, 'play')
      return rejectPlayback ? Promise.reject(new Error('fixture: acquisition audio denied')) : Promise.resolve()
    }
    HTMLMediaElement.prototype.pause = function () { mediaEvent(this, 'pause') }
    window.__ldctScanFrames = []
    new MutationObserver(() => {
      const frame = document.querySelector('[data-slice-sequence="ldct-father-chest"]')
      if (!frame) return
      const index = Number(frame.getAttribute('data-slice-frame'))
      if (window.__ldctScanFrames.at(-1) !== index) window.__ldctScanFrames.push(index)
    }).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-slice-frame'] })
  }, { key, state, eventKey, observedKey, rejectPlayback })
  const page = await context.newPage(), errors = [], missing = [], offlineRequests = []
  page.setDefaultTimeout(8000)
  page.on('pageerror', error => errors.push(error.message))
  page.on('response', response => { if (response.status() >= 400) missing.push(response.url()) })
  const admit = async () => {
    await page.locator('[data-chapter-enter], [data-ldct-screen]').first().waitFor({ timeout: 30000 })
    if (await page.locator('[data-chapter-enter]').isVisible()) await page.locator('[data-chapter-enter]').click()
    await page.locator('[data-ldct-screen]').waitFor()
  }
  const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)
  const progress = async () => (await saved()).dlc.ldct.ldct
  const events = () => page.evaluate(eventKey => JSON.parse(sessionStorage.getItem(eventKey) || '[]'), eventKey)
  const reload = async () => { await page.reload(); await admit() }
  const complete = async () => {
    await page.waitForFunction(({ key, nodeId }) => JSON.parse(localStorage.getItem(key))?.dlc?.ldct?.ldct?.scanSessions?.[nodeId]?.completed, { key, nodeId }, { timeout: 6000 })
    await page.locator(`[data-scan-id="${nodeId}"]`).waitFor({ state: 'detached' })
    const session = (await progress()).scanSessions[nodeId]
    assert.equal((await progress()).nodeId, nodeId === 'lf_phantom_scan' ? 'lf_phantom_done' : 'lf_scan_1')
    const completions = (await events()).filter(event => event.type === 'save' && event.id === nodeId && event.session.completed)
    assert.equal(completions.length, 1, 'the saved completion transition happens once')
    assert(completions[0].at - session.startedAt >= 3000, 'the real acquisition lasts at least three seconds')
    assert.equal(session.startedAt, (await events()).find(event => event.type === 'save' && event.id === nodeId).session.startedAt)
  }
  try {
    await page.goto(url); await admit()
    await page.route(/\/(?:assets\/media|audio)\//, route => { offlineRequests.push(route.request().url()); return route.abort('internetdisconnected') })
    await task({ page, saved, progress, reload, admit, events, complete })
    const final = await saved()
    assert.deepEqual(stats(final), stats(state), 'acquisition itself pays no rewards')
    assert.deepEqual(final.flags, state.flags)
    assert.deepEqual(final.dlc.ch2, state.dlc.ch2)
    assert.deepEqual(final.dlc.dsa, state.dlc.dsa)
    assert.deepEqual(errors, [], `${name}: no page errors`)
    assert.deepEqual(missing, [], `${name}: no missing media`)
    assert.deepEqual(offlineRequests, [], `${name}: chapter preload covers reused scan media`)
    console.log(`PASS ${name}`)
  } catch (error) {
    await page.screenshot({ path: resolve(output, `${name}-failure.png`) }).catch(() => undefined)
    throw error
  } finally { await context.close() }
}
async function assertOverlay(page, nodeId) {
  const overlay = page.locator(`[data-scan-id="${nodeId}"]`)
  await overlay.waitFor()
  assert.equal(await overlay.getAttribute('data-scan-mode'), 'acquire')
  assert.equal(await overlay.getByRole('button', { name: /跳过|继续/ }).count(), 0)
  assert(await page.evaluate(() => Boolean(document.activeElement?.closest('.ch2-scan-panel'))), 'shared scan owns keyboard focus')
  await overlay.locator('[data-ct-motion-ready="true"]').waitFor()
  assert.match(await overlay.locator('.ch2-ct-sliding-bed').getAttribute('src'), /^blob:/)
  const panel = await overlay.locator('.ch2-scan-panel').boundingBox(), viewport = page.viewportSize()
  assert(panel.x >= 0 && panel.x + panel.width <= viewport.width + 1)
  assert(panel.y >= 0 && panel.y + panel.height <= viewport.height + 1)
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
  return overlay
}

async function tileHash(locator) {
  return locator.evaluate(async element => {
    const style = getComputedStyle(element), source = style.backgroundImage.match(/^url\(["']?(.*?)["']?\)$/)?.[1]
    if (!source?.startsWith('blob:')) throw new Error('frame does not use chapter-preloaded media')
    const image = new Image(); image.src = source; await image.decode()
    const [columns, rows] = style.backgroundSize.split(' ').map(value => parseFloat(value) / 100)
    const [x, y] = style.backgroundPosition.split(' ').map(value => parseFloat(value) / 100)
    const width = image.naturalWidth / columns, height = image.naturalHeight / rows
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height
    const context = canvas.getContext('2d')
    context.drawImage(image, Math.round(x * (image.naturalWidth - width)), Math.round(y * (image.naturalHeight - height)), width, height, 0, 0, width, height)
    return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', context.getImageData(0, 0, width, height).data))).map(byte => byte.toString(16).padStart(2, '0')).join('')
  })
}
async function advanceScene(page, saved) {
  const node = getLdctNode(await saved()), text = node.text.replaceAll('**', '')
  const click = () => page.mouse.click(page.viewportSize().width - 25, 180)
  if (await page.locator('[data-ldct-dialogue] .dialog-box > p').textContent() !== text) await click()
  await page.waitForFunction(text => document.querySelector('[data-ldct-dialogue] .dialog-box > p')?.textContent === text, text)
  await page.waitForTimeout(335); await click()
  await page.locator(`[data-ldct-node="${node.next}"]`).waitFor()
}

try {
  await withFixture('phantom-unskippable', 'lf_phantom_scan', async ({ page, progress, events, complete }) => {
    const overlay = await assertOverlay(page, 'lf_phantom_scan')
    assert.match(await overlay.locator('.ch2-ct-motion').getAttribute('aria-label'), /圆柱模体/)
    assert.equal(await overlay.getAttribute('data-scan-presentation'), 'machine')
    assert.equal(await overlay.locator('.ch2-slice-sequence').count(), 0, 'phantom acquisition never shows a different patient slice sequence')
    const travel = Number(await overlay.locator('[data-ct-travel]').getAttribute('data-ct-travel'))
    for (const key of ['Enter', 'Space', 'Escape', 'ArrowRight']) await page.keyboard.press(key)
    await overlay.click({ position: { x: 3, y: 3 } })
    assert.equal((await progress()).nodeId, 'lf_phantom_scan')
    assert.equal((await progress()).scanSessions.lf_phantom_scan.completed, false)
    await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab')
    assert(await page.evaluate(() => Boolean(document.activeElement?.closest('.ch2-scan-panel'))))
    await page.waitForFunction(travel => Number(document.querySelector('[data-ct-travel]')?.getAttribute('data-ct-travel')) > travel, travel)
    await page.screenshot({ path: resolve(output, 'phantom-desktop-acquire.png') })
    await complete()
    const played = (await events()).filter(event => event.type === 'play' && event.volume === .24)
    assert.equal(played.length, 1)
    assert.equal(played[0].loop, false)
    assert.match(played[0].src, /^blob:/)
    assert((await events()).some(event => event.type === 'pause' && event.id === played[0].id), 'shared overlay cleans up acquisition audio')
  })

  let firstFbpHash
  await withFixture('father-390-rejected', 'lf_father_scan', async ({ page, saved, progress, events, complete }) => {
    const overlay = await assertOverlay(page, 'lf_father_scan')
    assert.equal((await progress()).chestSourceVersion, LDCT_NOISY_DATA_VERSION)
    const atlas = overlay.locator('[data-slice-sequence="ldct-father-chest"] .ch2-slice-atlas')
    assert.match(await atlas.getAttribute('src'), /^blob:/)
    // Hash the middle unannotated FBP tile in the actual scan atlas, not an expected substitute.
    const scanHash = await atlas.evaluate(async image => {
      await image.decode()
      const canvas = document.createElement('canvas'); canvas.width = 192; canvas.height = 192
      const context = canvas.getContext('2d'); context.drawImage(image, 0, 192, 192, 192, 0, 0, 192, 192)
      return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', context.getImageData(0, 0, 192, 192).data))).map(byte => byte.toString(16).padStart(2, '0')).join('')
    })
    await page.screenshot({ path: resolve(output, 'father-390-acquire.png') })
    await complete()
    assert.deepEqual(await page.evaluate(() => window.__ldctScanFrames), [0, 1, 2, 1], 'same-data adjacent layers finish on the middle FBP slice')
    assert.equal((await events()).filter(event => event.type === 'play' && event.volume === .24).length, 1)
    await page.screenshot({ path: resolve(output, 'father-390-after.png') })
    for (const id of ['lf_scan_2', 'lf_first_fbp']) {
      await advanceScene(page, saved); assert.equal((await progress()).nodeId, id)
    }
    firstFbpHash = await tileHash(page.locator('[data-ldct-case-preview="fbp"] > div'))
    assert.equal(firstFbpHash, scanHash, 'the scan and subsequent father result show the exact same patient/slice pixels')
  }, { rejectPlayback: true, viewport: { width: 390, height: 844 } })

  await withFixture('father-refresh', 'lf_father_scan', async ({ page, progress, reload, complete, events }) => {
    await assertOverlay(page, 'lf_father_scan')
    const startedAt = (await progress()).scanSessions.lf_father_scan.startedAt
    await page.waitForFunction(() => Number(document.querySelector('[role="progressbar"][aria-label="图像生成进度"]')?.getAttribute('aria-valuenow')) >= 20)
    await reload()
    assert.equal((await progress()).scanSessions.lf_father_scan.startedAt, startedAt, 'refresh never restarts the clock')
    await complete()
    const played = (await events()).filter(event => event.type === 'play' && event.volume === .24)
    assert(played.length <= 2, 'at most one audio attempt per mounted acquisition')
    if (played.length === 2) assert(played[1].currentTime >= .6, 'restored audio seeks to the shared visual time')
    const finishedNode = (await progress()).nodeId
    await reload()
    assert.equal((await progress()).nodeId, finishedNode)
    assert.equal(await page.locator('[data-scan-id]').count(), 0, 'a completed scan does not replay on refresh')
    assert.equal((await events()).filter(event => event.type === 'play' && event.volume === .24).length, played.length)
  })

  await withFixture('scan-leave-cleanup', 'lf_phantom_scan', async ({ page, progress, events, admit, complete }) => {
    await assertOverlay(page, 'lf_phantom_scan')
    const start = (await progress()).scanSessions.lf_phantom_scan.startedAt
    const playing = (await events()).find(event => event.type === 'play' && event.volume === .24)
    await page.evaluate(() => { location.hash = '/' })
    await page.locator('[data-scan-id]').waitFor({ state: 'detached' })
    assert((await events()).some(event => event.type === 'pause' && event.id === playing.id), 'SPA navigation pauses the reused acquisition sound')
    await page.waitForFunction(start => Date.now() - start >= 3200, start)
    assert.equal((await progress()).scanSessions.lf_phantom_scan.completed, false, 'unmounted timers never deliver a late completion')
    await page.evaluate(() => { location.hash = '/dlc/ldct' }); await admit()
    await complete()
    assert.equal((await events()).filter(event => event.type === 'play' && event.volume === .24).length, 1, 'overdue restoration completes without replaying expired sound')
  })
  await withFixture('noisy-exposure', 'lf_lab_4', async ({ page, progress, reload }) => {
    const exposure = page.getByTestId('ldct-chest-exposure')
    assert.equal(await exposure.getAttribute('data-chest-version'), LDCT_NOISY_DATA_VERSION)
    const baseline = await tileHash(exposure.locator('[data-frame="exposure:fbp:1"]'))
    if (firstFbpHash) assert.equal(baseline, firstFbpHash, 'exposure starts from the exact displayed first scan')
    firstFbpHash = baseline
    await page.screenshot({ path: resolve(output, 'noisy-exposure-1.png') })
    for (let count = 2; count <= 13; count++) {
      await page.getByRole('button', { name: '再积累一份曝光', exact: true }).click()
      await page.locator(`[data-exposure-count="${count}"]`).waitFor()
      assert.equal((await progress()).labDraft.exposureCount, count)
    }
    assert.notEqual(await tileHash(exposure.locator('[data-frame="exposure:fbp:13"]')), baseline)
    assert.equal(await page.getByRole('button', { name: '已积累 13/13 份曝光', exact: true }).isEnabled(), false)
    await reload(); await page.locator('[data-exposure-count="13"]').waitFor()
    await page.screenshot({ path: resolve(output, 'noisy-exposure-13.png') })
  }, { round: 4 })
  await withFixture('noisy-iteration', 'lf_lab_5', async ({ page, progress, reload }) => {
    const iterate = page.getByTestId('ldct-chest-iterate')
    assert.equal(await iterate.getAttribute('data-chest-version'), LDCT_NOISY_DATA_VERSION)
    assert.match(await iterate.locator('.ldct-chest__main figcaption').innerText(), /原始FBP · 迭代起点/)
    const baseline = await tileHash(iterate.locator('[data-frame="iteration:0"]'))
    if (firstFbpHash) assert.equal(baseline, firstFbpHash, 'iteration starts at the exact scan/exposure FBP')
    await page.screenshot({ path: resolve(output, 'noisy-iteration-0.png') })
    for (let round = 1; round <= 12; round++) {
      await iterate.locator('.ldct-chest__next').click()
      await page.locator(`[data-iteration-round="${round}"][data-displayed-round="${round}"]`).waitFor()
      assert.equal((await progress()).labDraft.iterationRound, round)
    }
    assert.notEqual(await tileHash(iterate.locator('[data-frame="iteration:12"]')), baseline)
    assert.equal(await iterate.locator('.ldct-chest__next').isEnabled(), false)
    await reload(); await page.locator('[data-iteration-round="12"]').waitFor()
    await page.screenshot({ path: resolve(output, 'noisy-iteration-12.png') })
  }, { round: 5 })
  console.log('PASS scoped reused-scan browser checks. Media playback is mocked; screenshots are outside the repository.')
} finally { await browser.close() }
