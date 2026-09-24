// Every save below is a disposable seeded fixture, never a claimed full playthrough.
// Browser contexts do not read or write the player's real browser profile.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { CH2_SHIFTS, ch2StepForState } from '../src/game/ch2.ts'
import { CH2_PAYOFF_KEEPSAKES, CH2_PAYOFF_EVIDENCE, ch2PayoffKeepsakes } from '../src/game/ch2-payoffs.ts'
import { freshState } from '../src/game/store.ts'

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const output = resolve(process.env.GIFT_GALLERY_OUTPUT || '../../ch2-gift-gallery-review')
const gameURL = (process.env.GAME_URL || 'http://127.0.0.1:8798/').replace(/\/$/, '') + '/#/ch2'
const optimizedAssets = JSON.parse(readFileSync(new URL('../src/lib/image-assets.generated.json', import.meta.url), 'utf8'))
const allFlags = Object.fromEntries(CH2_PAYOFF_KEEPSAKES.map(item => [item.flag, true]))
const metrics = s => Object.fromEntries(['gold', 'skill', 'heart', 'wealth', 'ap', 'durability', 'items', 'badges', 'cards', 'events', 'stamps', 'buyCount'].map(key => [key, s[key]]))
const clean = text => (text ?? '').replaceAll('**', '')
const results = [], errors = [], imageRequests = []
let activePage
mkdirSync(output, { recursive: true })

assert.equal(CH2_PAYOFF_KEEPSAKES.length, 7)
assert.equal(new Set(CH2_PAYOFF_KEEPSAKES.map(item => item.id)).size, 7)
assert.equal(new Set(CH2_PAYOFF_KEEPSAKES.map(item => item.image)).size, 7)
for (const item of CH2_PAYOFF_KEEPSAKES) {
  assert.equal(typeof item.image, 'string', `${item.id}: every keepsake has an image`)
  assert(item.image.length > 0)
  assert.equal(CH2_PAYOFF_EVIDENCE[`ch2_keepsake_${item.id}`].image, item.image)
  assert.equal(CH2_PAYOFF_EVIDENCE[`ch2_keepsake_${item.id}`].flag, item.flag)
}
assert.equal(ch2PayoffKeepsakes({ flags: {} }).length, 0)
assert.equal(ch2PayoffKeepsakes({ flags: allFlags }).length, 7)

function fixture(id, { flags = {}, ap = 0, completed = false, badges = ['fixer'] } = {}) {
  const shift = CH2_SHIFTS.find(row => row.steps[id])
  assert(shift, `${id}: actual registered node`)
  return { ...freshState('f'), gold: 900, ap, skill: 8, heart: 6, wealth: 4, durability: 76,
    night: 5, finished: true, seed: 2026092503, flags, items: [], badges, cards: ['ct_intro'], events: [],
    buyCount: 17, screenHint: 'chapterEnd', stepId: 'n5_end', resumeKey: '5-n5_end',
    dlc: { dr: { done: true }, dsa: { done: true, dose: 42 }, ch2: {
      shift: shift.id, stepId: id, phase: completed ? 'done' : 'story', done: completed,
      appliedSteps: completed ? [`ch2-${id}`] : [], viewBg: 'bg_ctcontrol',
    } } }
}

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const read = page => page.evaluate(() => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')))
async function open(save, mobile = false) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 } })
  await context.addInitScript(s => {
    localStorage.setItem('mr-ch2-unlock', '1')
    sessionStorage.setItem('mr-rotate-dismissed', '1')
    if (!localStorage.getItem('midnight-radiology-save-v1')) localStorage.setItem('midnight-radiology-save-v1', JSON.stringify(s))
    HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('Fixture audio denied', 'NotAllowedError'))
  }, save)
  const page = await context.newPage()
  activePage = page
  page.setDefaultTimeout(10000)
  page.on('pageerror', error => errors.push(error.message))
  page.on('response', response => {
    if (response.request().resourceType() === 'image' && response.status() >= 400) imageRequests.push({ url: response.url(), status: response.status() })
  })
  await page.goto(gameURL)
  if (save.dlc.ch2.done) await page.locator('[data-ch2-complete="true"]').waitFor()
  else await page.locator(`[data-ch2-step="${save.dlc.ch2.stepId}"]`).waitFor()
  return { context, page }
}
async function reveal(page) {
  const s = await read(page), id = s.dlc.ch2.stepId
  const shift = CH2_SHIFTS.find(row => row.id === s.dlc.ch2.shift)
  const step = ch2StepForState(id, shift.steps[id], s)
  const expected = clean(step.text).replaceAll('行动力⚡×3', `行动力⚡×${s.ap}`)
  const line = page.locator('.dialog-box > p')
  if (await line.textContent() !== expected) await line.click()
  await page.waitForFunction(value => document.querySelector('.dialog-box > p')?.textContent === value, expected)
  return { s, id, step }
}
async function advance(page, target) {
  const { step } = await reveal(page)
  assert.equal(step.choices, undefined, 'These fixtures use existing linear receipt/teaser nodes')
  if (step.end) {
    assert.equal(target, '@complete')
    await page.getByRole('button', { name: /第二章 · 完 —— 结算/ }).click()
    await page.locator('[data-ch2-complete="true"]').waitFor()
  } else {
    assert.equal(step.next, target)
    await page.locator('.dialog-box > span.animate-bounce').waitFor()
    await page.locator('.dialog-box > p').click()
    await page.locator(`[data-ch2-step="${target}"]`).waitFor()
  }
}
async function imageReady(page, scope, name) {
  // The generated delivery map is shared by imageAsset and the production build.
  // Resolve against the actual page prefix; production serves no /src modules.
  const assetPath = optimizedAssets[name] ?? `${name}.png`
  const expectedURL = new URL(`assets/${assetPath}`, page.url()).href
  const img = scope.locator(`img[src$=${JSON.stringify(`/${assetPath}`)}]`).first()
  await img.waitFor()
  await img.scrollIntoViewIfNeeded()
  await img.evaluate(image => image.decode())
  const data = await img.evaluate(image => ({ src: image.getAttribute('src'), resolvedURL: image.currentSrc || image.src,
    width: image.naturalWidth, height: image.naturalHeight }))
  assert.equal(data.resolvedURL, expectedURL)
  assert(data.width > 0 && data.height > 0, `${name}: actual browser decoding succeeds`)
  return { img, ...data }
}
async function fitsWidth(page, locator) {
  await locator.scrollIntoViewIfNeeded()
  const box = await locator.boundingBox()
  assert(box && box.x >= -1 && box.x + box.width <= page.viewportSize().width + 1, 'Card/control fits viewport width')
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal page overflow')
}
async function refresh(page) {
  const before = await read(page)
  await page.reload()
  if (before.dlc.ch2.done) await page.locator('[data-ch2-complete="true"]').waitFor()
  else await page.locator(`[data-ch2-step="${before.dlc.ch2.stepId}"]`).waitFor()
  const after = await read(page)
  assert.deepEqual(metrics(after), metrics(before))
  assert.deepEqual(after.flags, before.flags)
  assert.equal(after.dlc.ch2.stepId, before.dlc.ch2.stepId)
  assert.deepEqual(after.dlc.ch2.appliedSteps, before.dlc.ch2.appliedSteps)
}

try {
  for (const mobile of [false, true]) {
    const size = mobile ? '390' : 'desktop'
    const save = fixture('c2am_lowdose_teaser2', { flags: { ...allFlags, c2_payoff_expert_done: true }, completed: true,
      badges: ['fixer', 'c2_brass_key'] })
    const { page, context } = await open(save, mobile)
    const before = metrics(await read(page)), gallery = page.locator('[data-ch2-keepsake-gallery]')
    await gallery.waitFor()
    assert.equal(await gallery.locator('[data-ch2-keepsake-card]').count(), 7)
    const decoded = []
    for (const item of CH2_PAYOFF_KEEPSAKES) {
      const card = gallery.locator(`[data-ch2-keepsake-card="${item.id}"]`)
      assert((await card.textContent()).includes(item.title))
      const image = await imageReady(page, card, item.image)
      decoded.push({ id: item.id, asset: item.image, src: image.src, width: image.width, height: image.height })
      await fitsWidth(page, card)
    }
    await gallery.scrollIntoViewIfNeeded()
    await page.screenshot({ path: resolve(output, `seeded-seven-gift-summary-${size}.png`) })
    await page.getByRole('button', { name: '查看背包用途', exact: true }).click()
    const backpack = page.getByRole('dialog', { name: '第二章背包', exact: true })
    assert.equal(await backpack.locator('[data-ch2-keepsake]').count(), 7)
    for (const [index, item] of CH2_PAYOFF_KEEPSAKES.entries()) {
      const card = backpack.locator(`[data-ch2-keepsake="${item.id}"]`)
      assert((await card.textContent()).includes(item.title))
      await imageReady(page, card, item.image)
      await fitsWidth(page, card)
      if ([0, 3, 6].includes(index)) await page.screenshot({ path: resolve(output, `seeded-seven-gift-backpack-${size}-${index}.png`) })
    }
    await backpack.getByRole('button', { name: '收好背包', exact: true }).click()
    assert.deepEqual(metrics(await read(page)), before, 'Reviewing gifts changes no inventory, award or economy')
    await refresh(page)
    results.push({ kind: 'seeded-summary-and-backpack', viewport: page.viewportSize(), fullPlaythrough: false, actualReceiptFlagsSeeded: true, decoded })
    await context.close()
  }

  const receipts = [
    { id: 'luo_pouch', from: 'c2n5_payoff_luo0', to: 'c2n5_payoff_luo1', flags: { c2_needle_resolved: true } },
    { id: 'lei_pouch', from: 'c2n5_payoff_lei0', to: 'c2n5_payoff_lei1', flags: { term_checked: true } },
    { id: 'jiang_sleeve', from: 'c2n5_payoff_jiang0', to: 'c2n5_payoff_jiang1', flags: { n5_jiang: true } },
    { id: 'zhou_cup', from: 'c2n5_g0', to: 'c2n5_g1', flags: {} },
    { id: 'tang_meal', from: 'c2n5_b1', to: 'c2n5_b2', flags: {}, ap: 1, heartDelta: 1 },
  ]
  for (const receipt of receipts) {
    const item = CH2_PAYOFF_KEEPSAKES.find(row => row.id === receipt.id)
    const mobile = receipt.id === 'zhou_cup'
    const { page, context } = await open(fixture(receipt.from, receipt), mobile)
    const before = await read(page)
    assert.equal(before.flags[item.flag], undefined, 'Receipt flag is not seeded in the actual receipt fixture')
    await advance(page, receipt.to)
    await page.waitForFunction(flag => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).flags[flag] === true, item.flag)
    const info = await reveal(page)
    assert.equal(info.step.image, item.image)
    const decoded = await imageReady(page, page.locator('[data-ch2-step]'), item.image)
    await fitsWidth(page, decoded.img)
    assert.deepEqual(metrics(await read(page)), { ...metrics(before), heart: before.heart + (receipt.heartDelta ?? 0) },
      `${receipt.id}: preserve the original receipt economy, including the meal's existing heart reward`)
    await page.screenshot({ path: resolve(output, `actual-receipt-${receipt.id}.png`) })
    await refresh(page)
    results.push({ kind: 'actual-receipt-from-seeded-predecessor', fullPlaythrough: false, id: receipt.id, from: receipt.from,
      to: receipt.to, receiptFlagEarnedByUI: item.flag, image: decoded.src })
    await context.close()
  }

  const teaser = await open(fixture('c2am_payoff_end'))
  const teaserBefore = await read(teaser.page), visited = ['c2am_payoff_end']
  for (const id of ['c2am_lowdose_teaser0', 'c2am_lowdose_teaser1', 'c2am_lowdose_teaser2']) {
    await advance(teaser.page, id)
    visited.push(id)
    assert.equal((await read(teaser.page)).dlc.ch2.done, false)
    assert.deepEqual(metrics(await read(teaser.page)), metrics(teaserBefore), 'The teaser grants no economy or award')
    await refresh(teaser.page)
  }
  await reveal(teaser.page)
  await teaser.page.screenshot({ path: resolve(output, 'lowdose-teaser-final.png') })
  await advance(teaser.page, '@complete')
  assert.equal((await read(teaser.page)).dlc.ch2.done, true)
  assert.deepEqual(metrics(await read(teaser.page)), metrics(teaserBefore))
  assert.equal(await teaser.page.locator('[data-equipment="ldct"][data-unlock="locked"]').count(), 1)
  await refresh(teaser.page)
  results.push({ kind: 'teaser-continuation-from-seeded-ending', fullPlaythrough: false, visited, done: true, noNewEconomyOrAwards: true })
  await teaser.context.close()

  for (const mobile of [false, true]) {
    const old = fixture('c2am_9', { completed: true })
    const { page, context } = await open(old, mobile)
    assert.equal(await page.locator('[data-ch2-keepsake-gallery]').count(), 0)
    assert.equal(await page.locator('[data-ch2-keepsake-summary]').count(), 0)
    assert.equal((await read(page)).dlc.ch2.stepId, 'c2am_9', 'An old completed save is not moved into the new teaser')
    await page.getByRole('button', { name: '查看背包用途', exact: true }).click()
    const backpack = page.getByRole('dialog', { name: '第二章背包', exact: true })
    assert.equal(await backpack.locator('[data-ch2-keepsake]').count(), 0)
    assert.equal(await backpack.getByText('带回来的东西 · 在故事里派上用场', { exact: true }).count(), 0)
    await backpack.getByRole('button', { name: '收好背包', exact: true }).click()
    await refresh(page)
    assert.deepEqual(metrics(await read(page)), metrics(old))
    assert.equal((await read(page)).flags.c2_payoff_expert_done, undefined)
    assert.equal((await read(page)).dlc.ch2.stepId, 'c2am_9')
    results.push({ kind: 'old-completed-no-gifts', fullPlaythrough: false, viewport: page.viewportSize(), noFabricatedGifts: true, noRollback: true })
    await context.close()
  }
  assert.deepEqual(errors, [])
  assert.deepEqual(imageRequests, [], 'No image requests fail')
  writeFileSync(resolve(output, 'results.json'), JSON.stringify({ results, errors, failedImageRequests: imageRequests,
    fixtureSavesExplicit: true, fullPlaythroughClaimed: false, playerProfileUsed: false, mockedAudio: true }, null, 2))
  console.log(`PASS gift gallery: ${results.length} explicit seeded scenarios; seven decoded gifts on desktop/390px, five actual UI receipts, three-step teaser, unchanged old completed saves.`)
} catch (error) {
  if (activePage && !activePage.isClosed()) await activePage.screenshot({ path: resolve(output, 'failure.png') }).catch(() => {})
  writeFileSync(resolve(output, 'failure.json'), JSON.stringify({ message: error.message, stack: error.stack, errors, imageRequests, results }, null, 2))
  throw error
} finally { await browser.close() }
