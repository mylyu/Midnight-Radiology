// Isolated browser contexts only; never connects to the user's browser/profile.
// PLAYWRIGHT_MODULE points to an installed playwright package; CHROME_PATH is optional.
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
import { mkdirSync, existsSync } from 'node:fs'
import { ch2BookUnlocked, ch2PortraitAsset, CH2_PORTRAITS, CH2_IMAGE_CAPTIONS, CH2_SHIFTS } from '../src/game/ch2.ts'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.GAME_URL || 'http://127.0.0.1:8798/'
const output = process.env.VISUAL_OUTPUT || '../../ch2-visual-test'
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
const errors = []
async function scene(shift, stepId, mobile = false, gender = 'm') {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 } })
  await context.addInitScript(({ shift, stepId, gender }) => {
    localStorage.setItem('mr-ch2-unlock', '1')
    localStorage.setItem('midnight-radiology-save-v1', JSON.stringify({
      gender, night: 5, gold: 500, skill: 3, wealth: 3, heart: 3, durability: 70,
      badges: [], stamps: [], flags: {}, lastCheckin: '', streak: 0, finished: true,
      seed: 1234, items: [], ap: 3, buyCount: 0, cards: [], events: [],
      dlc: { ch2: { shift, stepId, viewBg: 'bg_ctcontrol' } },
    }))
  }, { shift, stepId, gender })
  const page = await context.newPage()
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(base + '#/ch2')
  try { await page.getByRole('button', { name: '📚 旧书', exact: true }).waitFor({ timeout: 15000 }) }
  catch (error) {
    console.error('Scene failed', shift, stepId, errors, await page.locator('body').innerText())
    await page.screenshot({ path: `${output}/failure.png` })
    throw error
  }
  return { context, page }
}
try {
  for (const asset of new Set(Object.values(CH2_PORTRAITS))) {
    assert(existsSync(new URL(`../public/assets/${asset}.png`, import.meta.url)), `Missing portrait: ${asset}`)
  }
  for (const shift of CH2_SHIFTS) for (const step of Object.values(shift.steps)) {
    for (const key of [step.sprite, step.sprite2, step.phone].filter(Boolean)) {
      for (const gender of ['m', 'f']) assert(ch2PortraitAsset(key, gender).startsWith('ch2_pixel_'), `Unmapped portrait: ${key}`)
    }
  }
  assert.equal(ch2PortraitAsset('me', 'f'), 'ch2_pixel_char_f')
  assert.equal(ch2PortraitAsset('luzhou', 'm'), 'ch2_pixel_char_luzhou_m')
  assert.equal(ch2PortraitAsset('pat_kidmom', 'm'), ch2PortraitAsset('pat_kidmom_holding', 'm'))
  for (const [key, asset] of Object.entries(CH2_PORTRAITS).filter(([key]) => key !== 'pat_kidmom_holding')) {
    const gender = key.endsWith('_f') ? 'f' : 'm'
    const matches = CH2_SHIFTS.flatMap(shift => Object.entries(shift.steps).map(([node, step]) => ({ shift, node, step })))
    const match = matches.find(({ step }) => [step.sprite ?? (step.speaker === 'me' ? 'me' : step.speaker === 'luzhou' ? 'luzhou' : undefined), step.sprite2, step.phone].filter(Boolean).some(value => ch2PortraitAsset(value, gender) === asset))
    assert(match, `No scene found for ${key}`)
    const { context, page } = await scene(match.shift.id, match.node, false, gender)
    // The abdominal patient's old standing portrait stays in the archive, but
    // his actual entrance now uses the requested transport-bed variant.
    const renderedAsset=key==='pat_gut'?'ch2_patient_gut_bed':asset
    await page.waitForFunction(asset => [...document.images].some(i => i.src.endsWith('/' + asset + '.png') && i.complete && i.naturalWidth > 0), renderedAsset)
    await context.close()
  }
  for (const [index, shift] of CH2_SHIFTS.slice(0, 5).entries()) {
    const expected = (index + 1) * 4
    assert.equal(ch2BookUnlocked(shift.id), expected)
    const { context, page } = await scene(shift.id, shift.start, index === 1)
    await page.getByRole('button', { name: '📚 旧书', exact: true }).click()
    await page.getByText(`现已解锁 ${expected} 页。`, { exact: false }).waitFor()
    // Starts at the first new page, never exposes locked content.
    await page.getByText(`第 ${expected - 3} 页 / 共 20 页`, { exact: true }).waitFor()
    for (let n = 0; n < 3; n++) await page.getByRole('button', { name: '下一页 →', exact: true }).click()
    assert.equal(await page.getByRole('button', { name: '下一页 →', exact: true }).count(), 0)
    await page.getByText(expected === 20 ? '—— 全书完 ——' : '🔒 后续四页：下一班次解锁', { exact: true }).waitFor()
    const close = await page.getByRole('button', { name: '合上书，回科室', exact: true }).boundingBox()
    assert(close && close.y >= 0 && close.y + close.height <= page.viewportSize().height)
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await page.screenshot({ path: `${output}/book-${index + 1}.png` })
    await context.close()
  }
  for (const [shift, node, asset] of [
    ['c2d4', 'c2d4_t1no', 'ct_aortic_dissection_teaching'],
    ['c2d4', 'c2d4_12a', 'ct_dental_metal_teaching'],
    ['c2n5', 'c2n5_m2', 'ch2_pixel_pat_kidmom'],
    ['c2n5', 'c2n5_a2', 'item_zhou_key_fixed'],
    ['c2n5', 'c2n5_r0', 'ct_water_ring_teaching'],
    ['c2n5', 'c2n5_m17', 'ct_head_child_followup'],
  ]) {
    const { context, page } = await scene(shift, node)
    const img = page.locator(`img[src$="/${asset}.png"]`).first()
    await img.waitFor()
    await page.waitForFunction(asset => [...document.images].some(i => i.src.endsWith('/' + asset + '.png') && i.complete && i.naturalWidth > 0), asset)
    if (CH2_IMAGE_CAPTIONS[asset]) await page.getByText(CH2_IMAGE_CAPTIONS[asset], { exact: true }).waitFor()
    if (['ct_aortic_dissection_teaching', 'ct_dental_metal_teaching', 'ct_water_ring_teaching'].includes(asset)) {
      assert(!/AI生成|教学模拟|非患者CT/.test(await page.locator('body').innerText()), `In-story caption should be retired: ${asset}`)
    }
    await page.screenshot({ path: `${output}/${asset}.png` })
    await context.close()
  }
  assert.equal(ch2BookUnlocked(undefined), 4)
  assert.equal(ch2BookUnlocked('bad-save'), 4)
  assert.equal(ch2BookUnlocked('c2am'), 20)
  assert.equal(ch2BookUnlocked('c2n1', true), 20)
  assert.deepEqual(errors, [])
  console.log('PASS: 21 portrait mappings preserved; active scenes render with the abdominal bed replacement; five book unlock stages, mobile fit, six scene images and retired captions. Screenshots: ' + output)
} finally { await browser.close() }
