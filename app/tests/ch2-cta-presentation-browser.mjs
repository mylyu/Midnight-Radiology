// Disposable browser fixtures with real images. No production saves or audio
// settings are changed. Audio play is refused to verify nonblocking playback.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { CH2_SHIFTS, ch2StepForState } from '../src/game/ch2.ts'
import { getCh2Observation } from '../src/game/ch2-observations.ts'
import { freshState } from '../src/game/store.ts'

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const url = (process.env.GAME_URL || 'http://127.0.0.1:8798/').replace(/\/$/, '') + '/#/ch2'
const output = resolve(process.env.CTA_PRESENTATION_OUTPUT || '../../ch2-cta-character-review')
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const key = 'midnight-radiology-save-v1', results = [], errors = []
const all = Object.assign({}, ...CH2_SHIFTS.map(shift => shift.steps))
const plain = text => (text ?? '').replaceAll('**', '')
const p = page => page.locator('.dialog-box > p')
const read = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)
let activePage

function fixture(stepId, progress = {}) {
  const shift = CH2_SHIFTS.find(shift => shift.steps[stepId])
  return { ...freshState('m'), night: 5, finished: true, stepId: 'n5_end', gold: 801, skill: 4,
    flags: { quiz_grade: 'A' },
    dlc: { dr: { done: true }, dsa: { dose: 27 }, ch2: { shift: shift.id, phase: 'story', stepId,
      viewBg: 'bg_ctcontrol', appliedSteps: [], ...progress } } }
}
async function open(save, mobile = false) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 } })
  await context.addInitScript(({ save, key }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(save))
    localStorage.setItem('mr-ch2-unlock', '1')
    sessionStorage.setItem('mr-rotate-dismissed', '1')
    HTMLMediaElement.prototype.play = function () { return Promise.reject(new DOMException('Fixture audio denied', 'NotAllowedError')) }
    window.__ctaImages = []
    new MutationObserver(() => {
      const stage = document.querySelector('[data-ch2-step]')
      const image = stage?.querySelector('img[alt="影像或证物"]')
      if (image && window.__ctaImages.at(-1) !== image.src) window.__ctaImages.push(image.src)
    }).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] })
  }, { save, key })
  const page = await context.newPage(); activePage = page; page.setDefaultTimeout(12000)
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(url); await page.locator('[data-ch2-step]').waitFor()
  const rotate = page.getByRole('button', { name: '不了，竖屏也能玩', exact: true })
  if (await rotate.isVisible()) await rotate.click()
  return { context, page }
}
async function reveal(page) {
  await p(page).waitFor(); await page.waitForTimeout(330)
  if (!await page.locator('.dialog-box .animate-bounce, .choice-in button').count()) await p(page).click()
  await page.locator('.dialog-box .animate-bounce, .choice-in button').first().waitFor()
}
async function at(page, stepId) {
  await page.locator(`[data-ch2-step="${stepId}"]`).waitFor()
  await reveal(page)
}
async function next(page, stepId) {
  await reveal(page); await page.locator('.dialog-box .animate-bounce').waitFor()
  await page.waitForTimeout(330); await p(page).click()
  if (stepId) await page.locator(`[data-ch2-step="${stepId}"]`).waitFor()
}
async function answer(page, stepId, choiceId) {
  const config = getCh2Observation(stepId, await read(page))
  await reveal(page)
  assert.equal(await page.locator('.sprite-l,.sprite-r').count(), 0, 'No portrait obscures the unanswered observation')
  const choice = config.choices.find(choice => choice.id === choiceId)
  await page.locator('.choice-in').getByRole('button', { name: plain(choice.text), exact: true }).click()
  await reveal(page)
  assert.equal(await p(page).textContent(), plain(choice.feedback))
}
async function finishReconstruction(page, reload = false) {
  await page.locator('[data-ch2-step="c2n3_coronary_volume"]').waitFor()
  await page.waitForTimeout(330)
  await p(page).click()
  await page.locator('[data-scan-id="c2n3_coronary_volume"]').waitFor()
  const startedAt = (await read(page)).dlc.ch2.scanSessions.c2n3_coronary_volume.startedAt
  if (reload) {
    await page.reload(); await page.locator('[data-ch2-step="c2n3_coronary_volume"]').waitFor()
    assert.equal((await read(page)).dlc.ch2.scanSessions.c2n3_coronary_volume.startedAt, startedAt)
  }
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key))?.dlc.ch2.scanSessions?.c2n3_coronary_volume?.completed, key)
  await page.locator('.ch2-scan-overlay').waitFor({ state: 'hidden' })
  assert(Date.now() - startedAt >= 1400, 'Original 1.5-second reconstruction is retained')
  assert(Date.now() - startedAt < 7000, 'Refresh/denied audio cannot extend or block reconstruction')
  await reveal(page)
  return startedAt
}

try {
  for (const [choiceId, mobile] of [['volume', false], ['rescan', false], ['help', false], ['volume', true]]) {
    const save = fixture('c2n3_coronary_slices'), { context, page } = await open(save, mobile)
    await at(page, 'c2n3_coronary_slices'); await next(page, 'c2n3_coronary_where')
    const config = getCh2Observation('c2n3_coronary_where', await read(page))
    const actualId = choiceId === 'help' ? config.choices.find(choice => choice.hint).id : choiceId
    await answer(page, 'c2n3_coronary_where', actualId)
    assert.match(await page.locator('.sprite-l').getAttribute('src'), /ch2_pixel_char_zhou/)
    assert.equal(await page.locator('.sprite-l.ch2-patient-bed').count(), 0)
    await page.screenshot({ path: `${output}/coronary-feedback-${mobile ? 'mobile' : actualId}.png` })
    const rewardedSkill = save.skill + (actualId === 'volume' ? 1 : 0)
    assert.equal((await read(page)).skill, rewardedSkill)
    if (mobile) { await page.reload(); await at(page, 'c2n3_coronary_where'); assert.match(await page.locator('.sprite-l').getAttribute('src'), /ch2_pixel_char_zhou/) }
    await next(page, 'c2n3_coronary_volume')
    assert.equal((await read(page)).dlc.ch2.observations['coronary-reconstruction-v1'].acknowledged, true)
    const startedAt = await finishReconstruction(page, mobile)
    await page.screenshot({ path: `${output}/coronary-volume-${mobile ? 'mobile' : actualId}.png` })
    const visited = []
    for (let count = 0; count < 20; count++) {
      const current = await read(page), stepId = current.dlc.ch2.stepId
      visited.push(stepId)
      if (stepId === 'c2n3_h6') break
      const step = ch2StepForState(stepId, all[stepId], current)
      assert(!step.choices, `${stepId}: no unexpected new test/minigame`)
      await next(page, step.next)
    }
    assert.equal(visited.at(-1), 'c2n3_h6')
    const images = await page.evaluate(() => window.__ctaImages)
    const imageKinds = images.map(src => /coronary_slices/.test(src) ? 'slices' : /coronary_cta/.test(src) ? 'volume' : src)
    // A reload clears the in-page observer; check the surviving volume run there.
    assert.deepEqual(imageKinds.filter((kind, index) => index === 0 || kind !== imageKinds[index - 1]), mobile ? ['volume'] : ['slices', 'volume'])
    assert.equal((await read(page)).skill, rewardedSkill)
    assert.equal((await read(page)).gold, save.gold + 100)
    await page.reload(); await at(page, 'c2n3_h6')
    assert.equal((await read(page)).gold, save.gold + 100)
    assert.equal((await read(page)).dlc.ch2.scanSessions.c2n3_coronary_volume.startedAt, startedAt)
    assert.equal(await page.locator('.ch2-scan-overlay').count(), 0)
    results.push({ kind: 'coronary-route', choice: actualId, mobile, visited, images: imageKinds, passed: true })
    await context.close()
  }
  for (const completed of [false, true]) {
    const progress = { observations: { 'coronary-reconstruction-v1': { choiceId: 'volume', acknowledged: true } },
      scanSessions: completed ? { c2n3_coronary_volume: { startedAt: Date.now() - 5000, completed: true } } : {} }
    const save = fixture('c2n3_coronary_where', progress), { context, page } = await open(save)
    await page.locator('[data-ch2-step="c2n3_coronary_volume"]').waitFor()
    if (completed) { await reveal(page); assert.equal(await page.locator('.ch2-scan-overlay').count(), 0) }
    else await finishReconstruction(page)
    assert.equal((await read(page)).skill, save.skill, 'Legacy acknowledgement never reapplies a reward')
    results.push({ kind: 'legacy-acknowledged', completed, passed: true }); await context.close()
  }
  for (const stepId of ['c2d2_t1', 'c2d4_t1', 'c2n5_m17']) {
    const save = fixture(stepId), { context, page } = await open(save, true)
    const config = getCh2Observation(stepId, save)
    await answer(page, stepId, config.choices.find(choice => choice.hint).id)
    if (stepId === 'c2n5_m17') {
      assert.equal(await page.locator('.sprite-l,.sprite-r').count(), 0)
      assert.equal(await page.getByAltText('来电').count(), 1)
    } else assert.match(await page.locator('.sprite-l').getAttribute('src'), new RegExp(`ch2_pixel_char_${config.speaker}`))
    assert.equal(await page.locator('.sprite-l.ch2-patient-bed').count(), 0)
    await page.screenshot({ path: `${output}/feedback-${stepId}-mobile.png` })
    results.push({ kind: 'feedback-portrait', stepId, remote: stepId === 'c2n5_m17', passed: true }); await context.close()
  }
  for (const stepId of ['c2n3_m1', 'c2n5_sms_lei_pending', 'c2n3_dawn_light', 'c2am_lowdose_teaser1']) {
    const { context, page } = await open(fixture(stepId))
    await at(page, stepId)
    assert.equal(await page.locator('.sprite-l,.sprite-r').count(), 0, `${stepId}: deliberate remote/cinematic presentation retained`)
    if (stepId === 'c2n3_m1') assert.equal(await page.getByAltText('来电').count(), 1)
    results.push({ kind: 'intentional-no-sprite', stepId, passed: true }); await context.close()
  }
  assert.deepEqual(errors, [])
  writeFileSync(`${output}/presentation-results.json`, JSON.stringify({ passed: true, results, errors }, null, 2))
  console.log(`PASS ch2-cta-presentation-browser: ${results.length} fixtures; no duplicate coronary image cycle, once-only rewards/reconstruction, staff and remote presentation verified`)
} catch (error) {
  if (activePage && !activePage.isClosed()) await activePage.screenshot({ path: `${output}/presentation-failure.png` }).catch(() => {})
  writeFileSync(`${output}/presentation-failure.json`, JSON.stringify({ message: String(error), stack: error.stack, results, errors }, null, 2))
  throw error
} finally { await browser.close() }
