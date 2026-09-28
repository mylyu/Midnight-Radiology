// Targeted production-build fixtures; run only after the shared build is ready.
// No full chapter replay. Screenshots and isolated browser saves never enter the repo.
// node --import tsx tests/ldct-hands-on-browser.mjs
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

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const key = 'midnight-radiology-save-v1'
const url = (process.env.GAME_URL || 'http://127.0.0.1:8798/') + '#/dlc/ldct'
const output = resolve('../../ldct-hands-on-review')
const sizes = [{ width: 1366, height: 900 }, { width: 390, height: 844 }, { width: 844, height: 390 }]
const filter = new RegExp(process.env.LDCT_HANDS_ON_FILTER || '.')
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
function fixture(nodeId, round) {
  const state = selectLdctStory({ ...freshState('m'), skill: 11, wealth: 3,
    flags: { hands_on_main_flag: true }, dlc: { ch2: { done: true, certificate: { code: 'KEEP' } }, dsa: { dose: 70 } } }, 'father')
  const progress = { ...state.dlc.ldct.ldct, nodeId, phase: round ? 'lab' : 'story',
    labRound: round || 3, labDraft: createLdctLabState(round || 3, round >= 4 ? 'chest' : 'phantom') }
  state.dlc.ldct.ldct = progress
  state.dlc.ldct.ldctStories.slots.father = progress
  state.dlc.ldct.ldctStories.receipts = ['reward:comparison']
  state.dlc.ldct.ldctStories.experienced = [1, 2, 3]
  return state
}
const stats = state => ({ gold: state.gold, skill: state.skill, heart: state.heart, wealth: state.wealth, badges: state.badges })
async function withFixture(name, state, task) {
  if (!filter.test(name)) return
  const context = await browser.newContext({ viewport: sizes[0], hasTouch: true })
  await context.addInitScript(({ key, state }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state))
    localStorage.setItem('mr-ldct-unlock', '1')
    sessionStorage.setItem('mr-rotate-dismissed', '1')
    HTMLMediaElement.prototype.play = function () { return Promise.resolve() }
    HTMLMediaElement.prototype.pause = function () {}
  }, { key, state })
  const page = await context.newPage(), errors = [], missing = []
  page.setDefaultTimeout(8000)
  page.on('pageerror', error => errors.push(error.message))
  page.on('response', response => { if (response.status() >= 400) missing.push(response.url()) })
  const admit = async () => {
    await page.locator('[data-chapter-enter]').click({ timeout: 20000 })
    await page.locator('[data-ldct-screen]').waitFor()
  }
  const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)
  const progress = async () => (await saved()).dlc.ldct.ldct
  const reload = async () => { await page.reload(); await admit() }
  try {
    await page.goto(url); await admit()
    await task({ page, saved, progress, reload })
    const final = await saved()
    assert.deepEqual(final.flags, state.flags, 'main-game flags preserved')
    assert.deepEqual(final.dlc.ch2, state.dlc.ch2, 'other chapter certificate preserved')
    assert.deepEqual(final.dlc.dsa, state.dlc.dsa, 'other DLC state preserved')
    assert.deepEqual(errors, [], `${name}: no page errors`)
    assert.deepEqual(missing, [], `${name}: no missing resources`)
    console.log(`PASS ${name}`)
  } catch (error) {
    await page.screenshot({ path: resolve(output, `${name}-failure.png`) }).catch(() => undefined)
    throw error
  } finally { await context.close() }
}
async function layouts(page, name, locator) {
  for (const size of sizes) {
    await page.setViewportSize(size)
    await locator.scrollIntoViewIfNeeded()
    const box = await locator.boundingBox()
    assert(box && box.x >= -1 && box.x + box.width <= size.width + 1, `${name}: fits ${size.width}px`)
    assert(box.y >= -1 && box.y + box.height <= size.height + 1, `${name}: control is reachable`)
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${name}: no horizontal overflow`)
    await page.screenshot({ path: resolve(output, `${name}-${size.width}.png`) })
  }
  await page.setViewportSize(sizes[0])
}
async function advanceScene(page, saved) {
  const state = await saved(), node = getLdctNode(state), text = node.text.replaceAll('**', '')
  const clickBackground = () => page.mouse.click(page.viewportSize().width - 25, 220)
  if (await page.locator('[data-ldct-dialogue] .dialog-box > p').textContent() !== text) await clickBackground()
  await page.waitForFunction(({ nodeId, text }) => document.querySelector('[data-ldct-node]')?.getAttribute('data-ldct-node') !== nodeId ||
    document.querySelector('[data-ldct-dialogue] .dialog-box > p')?.textContent === text, { nodeId: node.id, text })
  if (await page.locator('[data-ldct-node]').getAttribute('data-ldct-node') === node.id) {
    await page.waitForTimeout(335); await clickBackground()
  }
  await page.locator(`[data-ldct-node="${node.enterLab ? node.id : node.next}"]`).waitFor()
}
// Extract the actual displayed atlas tile. This compares clinical preview and
// exposure baseline pixels even though they are stored in different atlases.
async function tileHash(locator) {
  return locator.evaluate(async element => {
    const style = getComputedStyle(element), source = style.backgroundImage.match(/^url\(["']?(.*?)["']?\)$/)?.[1]
    if (!source?.startsWith('blob:')) throw new Error('frame does not use preloaded media')
    const image = new Image(); image.src = source; await image.decode()
    const [columns, rows] = style.backgroundSize.split(' ').map(value => parseFloat(value) / 100)
    const [x, y] = style.backgroundPosition.split(' ').map(value => parseFloat(value) / 100)
    const width = image.naturalWidth / columns, height = image.naturalHeight / rows
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height
    const context = canvas.getContext('2d')
    context.drawImage(image, Math.round(x * (image.naturalWidth - width)), Math.round(y * (image.naturalHeight - height)), width, height, 0, 0, width, height)
    const pixels = context.getImageData(0, 0, width, height).data
    return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', pixels))).map(byte => byte.toString(16).padStart(2, '0')).join('')
  })
}

try {
  await withFixture('manual-bp', fixture('lf_lab_2', 2), async ({ page, progress, reload }) => {
    const counts = LDCT_MANUAL_BP_COUNTS, bp = page.locator('[data-bp-count]')
    const check = async step => {
      await page.locator(`[data-bp-count="${counts[step]}"] [data-frame="bp:${counts[step]}"]`).waitFor()
      const draft = (await progress()).labDraft
      assert.equal(draft.bpCount ?? LDCT_BP_COUNTS[draft.bpStep], counts[step])
      assert.equal(draft.bpStep, 0, 'new manual counts do not overwrite the old index')
      assert.equal(await bp.locator('[data-frame="truth"]').count(), 1)
    }
    await check(0)
    await page.waitForTimeout(1400); await check(0)
    await page.getByRole('button', { name: /再铺一组投影/ }).click(); await check(1)
    await page.waitForTimeout(1400); await check(1)
    await reload(); await check(1)
    for (let step = 2; step < counts.length; step++) {
      assert(counts[step] - counts[step - 1] <= 8, 'each gesture adds only a small group')
      await page.getByRole('button', { name: /再铺一组投影/ }).click(); await check(step)
    }
    assert.equal(await page.getByRole('button', { name: '已铺回 160 个方向', exact: true }).isEnabled(), false)
    await layouts(page, 'manual-bp', page.getByRole('button', { name: '继续', exact: true }))
    await page.getByRole('button', { name: '回到第一个方向 ↺', exact: true }).click(); await check(0)
    assert.equal(await page.getByRole('button', { name: '继续', exact: true }).isEnabled(), false)
  })

  await withFixture('exposure-story', fixture('lf_first_fbp'), async ({ page, saved, progress, reload }) => {
    const before = stats(await saved())
    const baseline = await tileHash(page.locator('[data-ldct-case-preview="fbp"] > div'))
    await page.screenshot({ path: resolve(output, 'first-fbp-1366.png') })
    for (const next of ['lf_photons_intro_0', 'lf_photons_intro_1', 'lf_lab_4']) {
      await advanceScene(page, saved)
      assert.equal((await progress()).nodeId, next)
    }
    const exposure = page.getByTestId('ldct-chest-exposure')
    const check = async count => {
      await page.locator(`[data-exposure-count="${count}"] [data-frame="exposure:fbp:${count}"]`).waitFor()
      assert.equal((await progress()).labDraft.exposureCount, count)
      assert.match(await exposure.locator('.ldct-exposure__count').innerText(), new RegExp(`${count} / 13`))
      assert.equal(await page.getByRole('button', { name: '继续', exact: true }).isEnabled(), count >= 11)
    }
    await check(1)
    assert.equal(await tileHash(exposure.locator('[data-frame="exposure:fbp:1"]')), baseline,
      'first chest FBP and first exposure use identical displayed pixels')
    await page.screenshot({ path: resolve(output, 'exposure-1-1366.png') })
    assert.equal(await page.getByRole('button', { name: '继续', exact: true }).isEnabled(), false)
    await page.waitForTimeout(1400); await check(1)
    for (let count = 2; count <= 13; count++) {
      await page.getByRole('button', { name: '再积累一份曝光', exact: true }).click(); await check(count)
      if ([2, 7, 13].includes(count)) {
        await page.waitForTimeout(1400); await check(count)
        await reload(); await check(count)
        await page.screenshot({ path: resolve(output, `exposure-${count}-1366.png`) })
      }
    }
    assert.equal(await page.getByRole('button', { name: '已积累 13/13 份曝光', exact: true }).isEnabled(), false)
    await layouts(page, 'exposure', page.getByRole('button', { name: '继续', exact: true }))
    await page.getByRole('button', { name: '先放一放', exact: true }).click()
    assert.equal((await progress()).phase, 'story')
    assert.deepEqual(stats(await saved()), before, 'back adds no reward')
    await advanceScene(page, saved)
    await check(13)
    await page.waitForTimeout(950)
    await page.getByRole('button', { name: '继续', exact: true }).click()
    await page.locator('[data-ldct-node="lf_photons_done_0"]').waitFor()
    assert.equal((await progress()).records[4].exposureCount, 13)
    assert.equal((await progress()).records[4].sourceVersion, 'ldct-chest-exposure-v2')
    assert.deepEqual(stats(await saved()), before, 'round4 reuses the prior comparison receipt')
    await reload()
    assert.equal((await progress()).nodeId, 'lf_photons_done_0')
    assert.deepEqual(stats(await saved()), before)
  })

  await withFixture('filter-current', fixture('lf_lab_3', 3), async ({ page, progress, reload }) => {
    const controls = page.locator('details').filter({ hasText: '更多滤波器、管电流模拟与对照' })
    assert.equal(await controls.getAttribute('open'), null, 'optional current simulator starts collapsed')
    await page.getByRole('button', { name: '柔一些', exact: true }).click()
    await controls.locator(':scope > summary').click()
    await page.getByRole('button', { name: '试试较低管电流（模拟）', exact: true }).click()
    assert.equal((await progress()).labDraft.signal, 'low')
    await page.locator('[data-frame="fbp:low:hann"]').first().waitFor()
    await reload()
    assert.equal((await progress()).labDraft.signal, 'low')
    assert.equal((await progress()).labDraft.filter, 'hann')
    assert.equal(await controls.getAttribute('open'), null)
    await controls.locator(':scope > summary').click()
    await page.getByRole('button', { name: '恢复原信号', exact: true }).click()
    assert.equal((await progress()).labDraft.signal, 'high')
  })

  await withFixture('exposure-help', fixture('lf_lab_4', 4), async ({ page, progress, saved, reload }) => {
    const before = stats(await saved())
    await page.waitForTimeout(950)
    await page.getByRole('button', { name: '还没看明白，一起聊聊', exact: true }).click()
    await page.locator('[data-ldct-node="lf_photons_done_0"]').waitFor()
    const record = (await progress()).records[4]
    assert.equal(record.helped, true)
    assert.equal(record.exposureCount, 1)
    assert.equal(record.sourceVersion, 'ldct-chest-exposure-v2')
    await reload()
    assert.deepEqual((await progress()).records[4], record)
    assert.deepEqual(stats(await saved()), before)
  })
  await withFixture('exposure-layout', fixture('lf_lab_4', 4), async ({ page }) => {
    for (const size of sizes.slice(1)) {
      await page.setViewportSize(size)
      const header = page.locator('.ldct-lab__header'), frame = page.locator('.ldct-exposure__work .ldct-lab__image')
      const continuation = page.getByRole('button', { name: '继续', exact: true })
      for (const [name, element] of [['top', header], ['image', frame], ['bottom', continuation]]) {
        await element.scrollIntoViewIfNeeded()
        const box = await element.boundingBox(), viewport = await page.locator('.ldct-lab-wrap').boundingBox()
        assert(box.y >= viewport.y - 1 && box.y + box.height <= viewport.y + viewport.height + 1,
          `${size.width}px: ${name} can be reached inside the scrolling viewport`)
        if (name !== 'bottom') await page.screenshot({ path: resolve(output, `exposure-${name}-${size.width}.png`) })
      }
    }
  })
  console.log('Scoped hands-on checks complete. Screenshots are outside the repo; audio is mocked and is not a listening assessment.')
} finally { await browser.close() }
