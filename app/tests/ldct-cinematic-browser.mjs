// Scoped fixtures against the one shared production build; no full-route replay.
// LDCT_CINEMATIC_FILTER limits a follow-up run to a failed group.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { freshState } from '../src/game/store.ts'
import { getLdctNode } from '../src/game/ldct.ts'
import { selectLdctStory } from '../src/game/ldct-session.ts'
import { createLdctLabState, createLdctRecord } from '../src/game/ldct-experiments.ts'
import { LDCT_NOISY_CHEST_VERSION } from '../src/game/ldct-noisy-chest.ts'

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const key = 'midnight-radiology-save-v1', mediaKey = 'ldct-cinematic-media-events'
const url = (process.env.GAME_URL || 'http://127.0.0.1:8798/') + '#/dlc/ldct'
const output = resolve('../../ldct-cinematic-review')
const sizes = [{ width: 1366, height: 900 }, { width: 390, height: 844 }, { width: 844, height: 390 }]
const filter = new RegExp(process.env.LDCT_CINEMATIC_FILTER || '.')
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
function fixture(nodeId, round, gender = 'm') {
  const state = selectLdctStory({ ...freshState(gender), skill: 11, wealth: 3,
    flags: { cinematic_main_flag: true }, dlc: { ch2: { done: true, certificate: { code: 'KEEP' } }, dsa: { dose: 70 } } }, 'father')
  const progress = { ...state.dlc.ldct.ldct, nodeId, phase: round ? 'lab' : 'story',
    labRound: round || 1, labDraft: createLdctLabState(round || 1, round >= 4 ? 'chest' : 'phantom') }
  state.dlc.ldct.ldct = progress
  state.dlc.ldct.ldctStories.slots.father = progress
  state.dlc.ldct.ldctStories.receipts = ['reward:comparison']
  state.dlc.ldct.ldctStories.experienced = [1, 2, 3]
  return state
}
const stats = state => ({ gold: state.gold, skill: state.skill, heart: state.heart, wealth: state.wealth, badges: state.badges })
async function withFixture(name, state, task, rejectPlayback = false) {
  if (!filter.test(name)) return
  const context = await browser.newContext({ viewport: sizes[0], hasTouch: true })
  await context.addInitScript(({ key, state, mediaKey, rejectPlayback }) => {
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
    // Neither outcome emits "ended"; audio must never gate a scene or choice.
    HTMLMediaElement.prototype.play = function () {
      record(this, 'play')
      return rejectPlayback ? Promise.reject(new Error('fixture: playback denied')) : Promise.resolve()
    }
    HTMLMediaElement.prototype.pause = function () { record(this, 'pause') }
  }, { key, state, mediaKey, rejectPlayback })
  const page = await context.newPage(), errors = [], missing = []
  page.setDefaultTimeout(8000)
  page.on('pageerror', error => errors.push(error.message))
  page.on('response', response => { if (response.status() >= 400) missing.push(response.url()) })
  const admit = async () => {
    await page.locator('[data-chapter-enter]').click({ timeout: 30000 })
    await page.locator('[data-ldct-screen]').waitFor()
  }
  const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)
  const progress = async () => (await saved()).dlc.ldct.ldct
  const reload = async () => { await page.reload(); await admit() }
  const load = async state => { await page.evaluate(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key, state }); await reload() }
  const events = () => page.evaluate(mediaKey => JSON.parse(sessionStorage.getItem(mediaKey) || '[]'), mediaKey)
  try {
    await page.goto(url); await admit()
    await task({ page, saved, progress, reload, load, events })
    const final = await saved()
    assert.deepEqual(final.flags, state.flags)
    assert.deepEqual(final.dlc.ch2, state.dlc.ch2)
    assert.deepEqual(final.dlc.dsa, state.dlc.dsa)
    assert.deepEqual(errors, [], `${name}: no page errors`)
    assert.deepEqual(missing, [], `${name}: no missing resources`)
    console.log(`PASS ${name}`)
  } catch (error) {
    await page.screenshot({ path: resolve(output, `${name}-failure.png`) }).catch(() => undefined)
    throw error
  } finally { await context.close() }
}
async function advanceScene(page, saved) {
  const node = getLdctNode(await saved()), text = node.text.replaceAll('**', '')
  const background = () => page.mouse.click(page.viewportSize().width - 25, 220)
  if (await page.locator('[data-ldct-dialogue] .dialog-box > p').textContent() !== text) await background()
  await page.waitForFunction(({ nodeId, text }) => document.querySelector('[data-ldct-node]')?.getAttribute('data-ldct-node') !== nodeId ||
    document.querySelector('[data-ldct-dialogue] .dialog-box > p')?.textContent === text, { nodeId: node.id, text })
  if (await page.locator('[data-ldct-node]').getAttribute('data-ldct-node') === node.id) {
    await page.waitForTimeout(335); await background()
  }
  await page.locator(`[data-ldct-node="${node.next}"]`).waitFor()
}
async function layouts(page, name, locator) {
  for (const size of sizes) {
    await page.setViewportSize(size)
    await locator.scrollIntoViewIfNeeded()
    const box = await locator.boundingBox()
    assert(box && box.width > 0 && box.height > 0, `${name}: visible at ${size.width}px`)
    assert(box.x >= -1 && box.x + box.width <= size.width + 1, `${name}: fits ${size.width}px`)
    assert(box.y >= -1 && box.y + box.height <= size.height + 1, `${name}: reachable at ${size.width}px`)
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${name}: no horizontal overflow`)
    if (name.startsWith('closeup-')) {
      const dialogue = await page.locator('[data-ldct-dialogue] .dialog-box').boundingBox()
      const frame = await locator.locator('.ldct-cinematic__frame').boundingBox()
      assert(frame && frame.height >= 80, `${name}: image has at least 80px visible height at ${size.width}px`)
      assert(box.y + box.height <= dialogue.y + 1, `${name}: closeup and lock label do not cover the dialogue at ${size.width}px`)
    }
    await page.screenshot({ path: resolve(output, `${name}-${size.width}.png`) })
  }
  await page.setViewportSize(sizes[0])
}

try {
  await withFixture('closeups', fixture('lf_arrive_3'), async ({ page, load, saved, progress }) => {
    for (const [nodeId, id] of [['lf_arrive_3', 'meal'], ['lf_plan_3', 'phantom'], ['lf_scan_0', 'father-scan'], ['lf_license_0', 'locked']]) {
      if (nodeId !== 'lf_arrive_3') await load(fixture(nodeId))
      const scene = page.locator(`[data-ldct-cinematic="${id}"]`)
      await scene.waitFor()
      await scene.locator('img').evaluate(image => image.decode())
      assert.match(await scene.locator('img').getAttribute('src'), /^blob:/, `${id}: chapter-preloaded image`)
      assert.equal(await page.locator('[data-ldct-module-locked]').count(), id === 'locked' ? 1 : 0)
      if (id === 'locked') assert.match(await page.locator('[data-ldct-module-locked]').innerText(), /迭代重建.*未购买模块/)
      await page.waitForTimeout(1400)
      assert.equal((await progress()).nodeId, nodeId, `${id}: camera motion never advances dialogue`)
      await layouts(page, `closeup-${id}`, scene)
      if (id === 'phantom') {
        await scene.locator('img').evaluate(image => {
          window.__ldctCinematicImage = image
          window.__ldctCinematicAnimation = image.getAnimations()[0]
        })
        await advanceScene(page, saved)
        assert.equal((await progress()).nodeId, 'lf_phantom_0')
        assert.equal(await page.locator('[data-ldct-cinematic="phantom"]').count(), 1)
        assert(await scene.locator('img').evaluate(image => image === window.__ldctCinematicImage
          && image.getAnimations()[0] === window.__ldctCinematicAnimation), 'adjacent phantom lines retain the same camera animation instead of restarting it')
      }
    }
    await load(fixture('lf_dinner_2'))
    assert.equal(await page.locator('[data-ldct-cinematic]').count(), 0, 'the next unrelated scene removes its closeup')
    assert.equal(await page.locator('[data-ldct-module-locked]').count(), 0)
  })

  await withFixture('dense-iteration', fixture('lf_lab_5', 5), async ({ page, progress, saved, reload }) => {
    const lab = page.getByTestId('ldct-chest-iterate'), before = stats(await saved())
    const next = lab.locator('.ldct-chest__next')
    const check = async round => {
      await lab.locator(`[data-frame="iteration:${round}"]`).waitFor()
      assert.equal(await lab.getAttribute('data-iteration-round'), String(round))
      assert.equal(await lab.getAttribute('data-displayed-round'), String(round))
      assert.equal((await progress()).labDraft.iterationRound, round)
      assert.equal((await progress()).labDraft.iterationStep, 0, 'actual rounds do not overwrite historical indices')
      assert.equal(await page.getByRole('button', { name: '继续', exact: true }).isEnabled(), round >= 10)
    }
    await check(0); await page.waitForTimeout(1400); await check(0)
    await lab.locator('summary').filter({ hasText: '固定、标记与更多轮次' }).click()
    assert.equal(await lab.getByRole('button', { name: '10轮', exact: true }).isEnabled(), false, 'uncomputed versions cannot skip ten manual calculations')
    await lab.locator('summary').filter({ hasText: '固定、标记与更多轮次' }).click()
    for (let round = 1; round <= 12; round++) {
      await next.click(); await check(round)
      if ([1, 6, 12].includes(round)) {
        await page.waitForTimeout(1400); await check(round)
        await reload(); await check(round)
      }
    }
    assert.equal(await next.isEnabled(), false, 'thirteenth click cannot leave the last calculated frame')
    await layouts(page, 'iteration-continue', page.getByRole('button', { name: '继续', exact: true }))
    await lab.locator('summary').filter({ hasText: '固定、标记与更多轮次' }).click()
    await lab.getByRole('button', { name: '初始', exact: true }).click()
    await lab.locator('[data-frame="iteration:0"]').waitFor()
    assert.equal((await progress()).labDraft.iterationRound, 12, 'reviewing an earlier frame preserves completed calculations')
    assert.equal(await lab.getAttribute('data-displayed-round'), '0')
    await lab.getByRole('button', { name: '6轮', exact: true }).click()
    await lab.locator('[data-frame="iteration:6"]').waitFor()
    assert.equal((await progress()).labDraft.iterationRound, 12)
    await lab.getByRole('button', { name: '固定这一版', exact: true }).click()
    assert.equal((await progress()).labDraft.chest.pinned.iterationRound, 6)
    await lab.getByRole('button', { name: '12轮', exact: true }).click(); await check(12)
    await lab.getByRole('button', { name: '下一层', exact: true }).click()
    await lab.getByRole('button', { name: '点出想请医生核查的位置', exact: true }).click()
    const image = lab.locator('.ldct-chest__canvas'), box = await image.boundingBox()
    await page.mouse.click(box.x + box.width * .3, box.y + box.height * .4)
    const draft = (await progress()).labDraft
    assert.equal(draft.chest.mark.iterationRound, 12)
    assert.equal(draft.chest.mark.slice, 2)
    await reload(); assert.deepEqual((await progress()).labDraft, draft)
    await page.waitForTimeout(950)
    await page.getByRole('button', { name: '继续', exact: true }).click()
    await page.locator('[data-ldct-node="lf_after_iteration_0"]').waitFor()
    const record = (await progress()).records[5]
    assert.equal(record.iterationRound, 12)
    assert.equal(record.sourceVersion, LDCT_NOISY_CHEST_VERSION)
    assert.deepEqual(record.chest, draft.chest)
    assert.deepEqual(stats(await saved()), before)
  })

  await withFixture('dense-help-reset', fixture('lf_lab_4', 4), async ({ page, load, progress, saved, reload }) => {
    const before = stats(await saved())
    await page.getByRole('button', { name: '再积累一份曝光', exact: true }).click()
    await page.getByRole('button', { name: '回到第一份曝光 ↺', exact: true }).click()
    assert.equal((await progress()).labDraft.exposureCount, 1)
    await reload(); assert.equal((await progress()).labDraft.exposureCount, 1)
    assert.equal(await page.getByRole('button', { name: '继续', exact: true }).isEnabled(), false)
    await load(fixture('lf_lab_5', 5))
    assert.equal(await page.getByRole('button', { name: '继续', exact: true }).isEnabled(), false)
    await page.waitForTimeout(950)
    await page.getByRole('button', { name: '还没看明白，一起聊聊', exact: true }).click()
    await page.locator('[data-ldct-node="lf_after_iteration_0"]').waitFor()
    assert.equal((await progress()).records[5].iterationRound, 0)
    assert.equal((await progress()).records[5].helped, true)
    assert.deepEqual(stats(await saved()), before)
  })

  await withFixture('legacy-frames', fixture('lf_lab_4', 4), async ({ page, load, progress, reload }) => {
    for (const round of [4, 5]) {
      const state = fixture(`lf_lab_${round}`, round), draft = state.dlc.ldct.ldct.labDraft
      delete draft.exposureCount; delete draft.iterationRound
      if (round === 4) draft.exposureStep = 3
      else Object.assign(draft, { iterationStep: 4, seenIterations: [0, 4] })
      state.dlc.ldct.ldct.labReturn = 'lf_end' // Historical record review, not an unfinished live draft.
      assert(createLdctRecord(draft, round, 'different', 'chest'))
      await load(state)
      await page.locator(`[data-frame="${round === 4 ? 'exposure:fbp:4' : 'iteration:8'}"]`).waitFor()
      assert.equal(await page.getByRole('button', { name: '继续', exact: true }).isEnabled(), true)
      await reload()
      assert.equal((await progress()).labDraft.exposureCount, undefined)
      assert.equal((await progress()).labDraft.iterationRound, undefined)
    }
  })

  await withFixture('phone-only-audio', fixture('lf_scan_2'), async ({ page, load, events, progress, reload, saved }) => {
    for (const [nodeId, gender] of [['lf_scan_2', 'm'], ['lf_welcome', 'm'], ['lf_welcome', 'f'], ['lf_chat_he_0', 'm'], ['lf_arrive_0', 'm']]) {
      await load(fixture(nodeId, undefined, gender))
      await page.waitForTimeout(350)
      assert.equal((await events()).filter(event => event.type === 'play' && event.node === nodeId && event.gender === gender && event.volume === .45).length, 0)
      assert.equal((await progress()).receipts.some(receipt => receipt.startsWith(`media:voice:${nodeId}:`)), false)
    }
    await load(fixture('lf_evening2'))
    await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).dlc.ldct.ldct.receipts.includes('media:call:father-evening2:v1'), key)
    const plays = () => events().then(list => list.filter(event => event.type === 'play' && event.node === 'lf_evening2' && event.volume === .38))
    const call = (await plays())[0]
    assert(call && !call.loop)
    assert.match(call.src, /^blob:/)
    assert.equal((await plays()).length, 1)
    assert.equal(await page.locator('[data-ldct-portrait]').count(), 0, 'a call is not an in-person portrait')
    await layouts(page, 'incoming-phone', page.locator('[data-ldct-call]'))
    await reload(); assert.equal((await plays()).length, 1, 'refresh does not replay the consumed ringtone')
    await advanceScene(page, saved)
    assert.equal((await progress()).nodeId, 'lf_dinner_0')
    assert((await events()).some(event => event.type === 'pause' && event.id === call.id))
  })
  await withFixture('phone-rejected', fixture('lf_evening2'), async ({ page, saved, progress, reload, events }) => {
    await page.getByRole('button', { name: /播放声音/ }).waitFor()
    await reload()
    assert.equal((await events()).filter(event => event.type === 'play' && event.node === 'lf_evening2' && event.volume === .38).length, 1)
    await advanceScene(page, saved)
    assert.equal((await progress()).nodeId, 'lf_dinner_0', 'rejected ringtone cannot block dialogue')
  }, true)
  console.log('Scoped cinematic checks complete. Screenshots are outside the repo; mocked media proves calls and cleanup, not listening quality.')
} finally { await browser.close() }
