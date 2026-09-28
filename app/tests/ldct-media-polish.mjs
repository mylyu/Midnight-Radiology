// Targeted fixtures for the media/UI polish; no full story replay or audio listening claim.
// Run after the shared production build: node --import tsx tests/ldct-media-polish.mjs
// LDCT_POLISH_FILTER=bp|chest|props|audio limits a rerun to the affected fixture.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { freshState } from '../src/game/store.ts'
import { getLdctNode } from '../src/game/ldct.ts'
import { selectLdctStory } from '../src/game/ldct-session.ts'
import { createLdctLabState } from '../src/game/ldct-experiments.ts'
import { LDCT_BP_COUNTS } from '../src/game/ldct-projections.ts'
import { LDCT_MANUAL_BP_COUNTS } from '../src/game/ldct-manual-bp.ts'
import { ldctSceneCue } from '../src/game/ldct-presentation.ts'

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const key = 'midnight-radiology-save-v1', mediaKey = 'ldct-polish-media-events'
const url = (process.env.GAME_URL || 'http://127.0.0.1:8798/') + '#/dlc/ldct'
const output = resolve('../../ldct-media-polish-review')
const sizes = [{ width: 1366, height: 900 }, { width: 390, height: 844 }, { width: 844, height: 390 }]
const filter = new RegExp(process.env.LDCT_POLISH_FILTER || '.')
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
function fixture(nodeId, round, gender = 'm') {
  const state = selectLdctStory(freshState(gender), 'father')
  const progress = { ...state.dlc.ldct.ldct, nodeId, phase: round ? 'lab' : 'story',
    labRound: round || 1, labDraft: createLdctLabState(round || 1, round === 5 ? 'chest' : 'phantom') }
  state.dlc.ldct.ldct = progress
  state.dlc.ldct.ldctStories.slots.father = progress
  return state
}
async function withFixture(name, state, task, rejectPlayback = false) {
  if (!filter.test(name)) return
  const context = await browser.newContext({ viewport: sizes[0], hasTouch: true })
  await context.addInitScript(({ state, key, mediaKey, rejectPlayback }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state))
    localStorage.setItem('mr-ldct-unlock', '1')
    sessionStorage.setItem('mr-rotate-dismissed', '1')
    const ids = new WeakMap(), documentId = crypto.randomUUID()
    let nextId = 0
    const record = (media, type) => {
      if (!ids.has(media)) ids.set(media, `${documentId}:${++nextId}`)
      const events = JSON.parse(sessionStorage.getItem(mediaKey) || '[]')
      events.push({ type, id: ids.get(media), src: media.src, volume: media.volume, loop: media.loop,
        gender: JSON.parse(localStorage.getItem(key))?.gender,
        node: document.querySelector('[data-ldct-node]')?.getAttribute('data-ldct-node') })
      sessionStorage.setItem(mediaKey, JSON.stringify(events))
    }
    // Resolved playback never emits "ended". Neither outcome may gate dialogue.
    HTMLMediaElement.prototype.play = function () {
      record(this, 'play')
      return rejectPlayback ? Promise.reject(new Error('fixture: playback denied')) : Promise.resolve()
    }
    HTMLMediaElement.prototype.pause = function () { record(this, 'pause') }
  }, { state, key, mediaKey, rejectPlayback })
  const page = await context.newPage(), errors = [], missing = []
  page.setDefaultTimeout(8000)
  page.on('pageerror', error => errors.push(error.message))
  page.on('response', response => { if (response.status() >= 400) missing.push(response.url()) })
  const admit = async () => {
    await page.locator('[data-chapter-enter]').click({ timeout: 60000 })
    await page.locator('[data-ldct-screen]').waitFor()
  }
  const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)
  const progress = async () => (await saved()).dlc.ldct.ldct
  const reload = async () => { await page.reload(); await admit() }
  const load = async state => {
    await page.evaluate(({ state, key }) => localStorage.setItem(key, JSON.stringify(state)), { state, key })
    await reload()
  }
  const events = () => page.evaluate(mediaKey => JSON.parse(sessionStorage.getItem(mediaKey) || '[]'), mediaKey)
  try {
    await page.goto(url); await admit()
    await task({ page, saved, progress, reload, load, events })
    assert.deepEqual(errors, [], `${name}: no page errors`)
    assert.deepEqual(missing, [], `${name}: no missing resources`)
    console.log(`PASS ${name}`)
  } catch (error) {
    await page.screenshot({ path: resolve(output, `${name}-failure.png`) }).catch(() => undefined)
    throw error
  } finally { await context.close() }
}
async function layouts(page, name, locator, continuation = false) {
  for (const size of sizes) {
    await page.setViewportSize(size)
    await locator.scrollIntoViewIfNeeded()
    const box = await locator.boundingBox()
    assert(box && box.x >= -1 && box.x + box.width <= size.width + 1, `${name}: fits ${size.width}px`)
    if (continuation) assert(box.y >= 0 && box.y + box.height <= size.height + 1, `${name}: continuation is reachable`)
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${name}: no horizontal overflow`)
    await page.screenshot({ path: resolve(output, `${name}-${size.width}.png`) })
  }
  await page.setViewportSize(sizes[0])
}
async function advanceScene(page, state) {
  const node = getLdctNode(state), text = node.text.replaceAll('**', '')
  const background = () => page.mouse.click(page.viewportSize().width - 25, 220)
  const currentNode = () => page.locator('[data-ldct-node]').getAttribute('data-ldct-node')
  if (await page.locator('[data-ldct-dialogue] .dialog-box > p').textContent() !== text) await background()
  await page.waitForFunction(({ nodeId, text }) => document.querySelector('[data-ldct-node]')?.getAttribute('data-ldct-node') !== nodeId ||
    document.querySelector('[data-ldct-dialogue] .dialog-box > p')?.textContent === text, { nodeId: node.id, text })
  if (await currentNode() === node.id) { await page.waitForTimeout(335); await background() }
  await page.locator(`[data-ldct-node="${node.next}"]`).waitFor()
}
async function cueAttempt(test, nodeId, gender = 'm') {
  const cue = ldctSceneCue(nodeId, gender)
  assert(cue, `${nodeId}: fixture has a scene cue`)
  await test.page.waitForFunction(({ key, receipt }) => JSON.parse(localStorage.getItem(key)).dlc.ldct.ldct.receipts.includes(receipt),
    { key, receipt: `media:${cue.id}` })
  const plays = (await test.events()).filter(event => event.type === 'play' && event.node === nodeId && event.gender === gender && event.volume === cue.volume)
  assert.equal(plays.length, 1, `${nodeId}: exactly one automatic attempt`)
  assert.match(plays[0].src, /^blob:/, `${nodeId}: sound uses preloaded media`)
  assert.equal(plays[0].loop, false)
  assert.equal((await test.progress()).receipts.filter(receipt => receipt === `media:${cue.id}`).length, 1)
  assert.equal((await test.progress()).nodeId, nodeId, 'media consumption does not advance the scene')
  return plays[0]
}
try {
  await withFixture('bp', fixture('lf_lab_2', 2), async ({ page, progress, reload }) => {
    const bp = page.locator('[data-bp-count]'), counts = LDCT_MANUAL_BP_COUNTS
    const step = async index => {
      await page.locator(`[data-bp-count="${counts[index]}"] [data-frame="bp:${counts[index]}"]`).waitFor()
      const draft = (await progress()).labDraft
      assert.equal(draft.bpCount ?? LDCT_BP_COUNTS[draft.bpStep], counts[index], 'each real checkpoint is saved')
      assert.equal(await bp.locator('[data-frame="truth"]').count(), 1, 'complete reference stays visible')
      assert.match(await bp.locator(`[data-frame="bp:${counts[index]}"]`).evaluate(el => getComputedStyle(el).backgroundImage), /blob:/)
    }
    await step(0)
    assert.equal(await page.getByRole('button', { name: '继续', exact: true }).isEnabled(), false)
    // Approved hands-on revision: each gesture reveals one real frame, with no timer.
    await page.waitForTimeout(1400)
    await step(0)
    await page.getByRole('button', { name: /再铺一组投影/ }).click()
    await step(1)
    await page.waitForTimeout(1400)
    await step(1)
    await reload(); await step(1)
    for (let index = 2; index < counts.length; index++) {
      assert(counts[index] - counts[index - 1] <= 8, 'every manual step is a small group of directions')
      await page.getByRole('button', { name: /再铺一组投影/ }).click()
      await step(index)
    }
    assert.equal(await page.getByRole('button', { name: '已铺回 160 个方向', exact: true }).isEnabled(), false)
    await layouts(page, 'backprojection-continue', page.getByRole('button', { name: '继续', exact: true }), true)
    await page.getByRole('button', { name: '回到第一个方向 ↺', exact: true }).click()
    await step(0)
    assert.equal((await progress()).labDraft.bpCount, 1, 'replay starts from the actual one-direction frame')
  })
  await withFixture('chest', fixture('lf_lab_5', 5), async ({ page, progress, reload }) => {
    const lab = page.getByTestId('ldct-chest-iterate'), tools = lab.locator('details').filter({ hasText: '固定、标记与更多轮次' })
    assert.equal(await tools.getAttribute('open'), null, 'secondary controls begin folded')
    assert.equal(await lab.getByRole('button', { name: '4轮', exact: true }).isVisible(), false)
    await lab.getByRole('button', { name: '用原数据改第一轮 →', exact: true }).click()
    await layouts(page, 'chest-continue', page.getByRole('button', { name: '继续', exact: true }), true)
    await tools.locator('summary').click()
    await lab.getByRole('button', { name: '4轮', exact: true }).click()
    await lab.getByRole('button', { name: '固定这一版', exact: true }).click()
    const draft = (await progress()).labDraft
    await reload()
    assert.deepEqual((await progress()).labDraft, draft, 'folded UI preserves the saved iteration and pin')
    assert.equal(await tools.getAttribute('open'), null)
    await lab.getByRole('button', { name: '回看原FBP', exact: true }).click()
    assert.equal(await lab.locator('[data-frame="fbp"]').count(), 1)
    await page.waitForTimeout(950)
    await page.getByRole('button', { name: '继续', exact: true }).click()
    await page.locator('[data-ldct-node="lf_after_iteration_0"]').waitFor()
  })
  await withFixture('props', fixture('lf_scan_1'), async ({ page, load }) => {
    for (const [nodeId, kind] of [['lf_scan_1', 'receipt'], ['lf_rest_hub', 'meal'], ['lf_record_echo', 'notes'], ['lf_depart_0', 'films']]) {
      if (nodeId !== 'lf_scan_1') await load(fixture(nodeId))
      const prop = page.locator(`[data-ldct-prop="${kind}"]`)
      await prop.waitFor()
      if (await prop.locator('img').count()) {
        await prop.locator('img').evaluate(image => image.decode())
        assert.match(await prop.locator('img').getAttribute('src'), /^blob:/, `${kind}: preloaded image`)
      } else assert.equal(await prop.locator('svg').count(), 1, 'receipt is an explicit drawn object')
      await layouts(page, `prop-${kind}`, prop)
    }
    await load(fixture('lf_dinner_2'))
    assert.equal(await page.locator('[data-ldct-prop]').count(), 0, 'unrelated dialogue does not retain a previous prop')
    assert.equal(await page.locator('[data-ldct-call]').count(), 0, 'finished phone conversation leaves no incoming notice')
  })
  await withFixture('audio-resolved', fixture('lf_scan_2'), async test => {
    const { page, load, reload, events } = test
    const zhou = await cueAttempt(test, 'lf_scan_2')
    assert(await page.getByRole('button', { name: '剧情音开', exact: true }).isVisible())
    await page.getByRole('button', { name: '📖 手册', exact: true }).click()
    assert((await events()).some(event => event.type === 'pause' && event.id === zhou.id), 'opening an overlay stops scene audio')
    await page.getByRole('button', { name: '关闭 ×', exact: true }).click()
    await reload()
    await cueAttempt(test, 'lf_scan_2')
    assert.equal(await page.locator('.ldct-audio-retry').count(), 0)
    await advanceScene(page, fixture('lf_scan_2'))
    await load(fixture('lf_arrive_0'))
    assert.equal(ldctSceneCue('lf_arrive_0', 'm'), undefined, 'unapproved father voice stays silent')
    await advanceScene(page, fixture('lf_arrive_0'))
    assert.equal((await events()).filter(event => event.type === 'play' && event.node === 'lf_arrive_0' && event.volume === .45).length, 0)
    for (const [nodeId, gender] of [['lf_welcome', 'f'], ['lf_welcome', 'm'], ['lf_chat_he_0', 'm'], ['lf_evening2', 'm']]) {
      await load(fixture(nodeId, undefined, gender))
      const played = await cueAttempt(test, nodeId, gender)
      if (nodeId === 'lf_evening2') {
        assert.match(await page.locator('[data-ldct-call]').innerText(), /爸.*陆舟的手机[\s\S]*来电中/)
        assert.equal(await page.locator('[data-ldct-portrait]').count(), 0, 'incoming phone is not a person in the room')
        await layouts(page, 'incoming-phone', page.locator('[data-ldct-call]'))
        await advanceScene(page, fixture(nodeId))
        assert((await events()).some(event => event.type === 'pause' && event.id === played.id), 'leaving a scene pauses the active cue')
        assert.match(await page.locator('[data-ldct-call]').innerText(), /通话中/)
      }
    }
  })
  await withFixture('audio-rejected', fixture('lf_evening2'), async test => {
    const { page, reload, load, progress, events } = test
    await cueAttempt(test, 'lf_evening2')
    await page.getByRole('button', { name: /播放声音/ }).waitFor()
    const receipts = (await progress()).receipts
    await reload()
    await cueAttempt(test, 'lf_evening2')
    assert.deepEqual((await progress()).receipts, receipts, 'rejected playback is consumed once and never replayed on refresh')
    await advanceScene(page, fixture('lf_evening2'))
    assert.equal((await progress()).nodeId, 'lf_dinner_0', 'audio refusal cannot lock dialogue')
    await load(fixture('lf_scan_2'))
    const denied = await cueAttempt(test, 'lf_scan_2')
    await page.getByRole('button', { name: /播放声音/ }).waitFor()
    await advanceScene(page, fixture('lf_scan_2'))
    assert((await events()).some(event => event.type === 'pause' && event.id === denied.id), 'leaving a rejected cue cleans it up without waiting for retry')
  }, true)
  console.log('Scoped media/UI checks complete; screenshots are outside the repository. Playback is mocked, not listened to.')
} finally { await browser.close() }
