// Focused presentation/restore QA; full fresh-save walks are separate tests.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { freshState } from '../src/game/store.ts'
import { CH2_DAWN_STEPS, CH2_DAWN_SHOTS } from '../src/game/ch2-dawn.ts'
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const output = resolve(process.env.DAWN_OUTPUT || '../../ch2-dawn-review')
mkdirSync(output, { recursive: true })
const url = (process.env.GAME_URL || 'http://127.0.0.1:8798/').replace(/\/$/, '') + '/#/ch2'
const errors = [], results = []
const read = page => page.evaluate(() => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')))
const metrics = state => Object.fromEntries(['gold','skill','heart','wealth','ap','badges','cards','items','buyCount','lotteryCount','night','finished'].map(k => [k, state[k]]))
const stage = page => page.locator('[data-ch2-step]')
async function readyText(page) {
  const id = await stage(page).getAttribute('data-ch2-step')
  const text = CH2_DAWN_STEPS[id]?.text
  assert(text, id)
  const p = page.locator('.dialog-box > p')
  if (await p.textContent() !== text) await p.click()
  await page.waitForFunction(text => document.querySelector('.dialog-box > p')?.textContent === text, text)
  return id
}
async function advance(page, index = 0) {
  const id = await readyText(page), step = CH2_DAWN_STEPS[id]
  const next = step.choices?.[index]?.next || step.next
  if (step.choices) await page.locator('.choice-in button').nth(index).click()
  else { await page.locator('.dialog-box .animate-bounce').waitFor(); await page.locator('.dialog-box > p').click() }
  await page.locator(`[data-ch2-step="${next}"]`).waitFor()
  await page.waitForFunction(next => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.stepId === next, next)
  return next
}
async function open({ mobile = false, landscape = false, reduced = false, missing = false, id = 'c2n3_dawn0' } = {}) {
  const context = await browser.newContext({ viewport: landscape ? { width: 667, height: 375 } : mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 }, reducedMotion: reduced ? 'reduce' : 'no-preference' })
  const save = { ...freshState(mobile ? 'f' : 'm'), gold: 500, ap: 2, finished: true, flags: { quiz_grade: 'A' },
    dlc: { dr: { done: true }, dsa: { dose: 39 }, ch2: { shift: 'c2n3', stepId: id, phase: 'story', viewBg: 'bg_ctcontrol', viewSprite: 'pat_mystery' } } }
  await context.addInitScript(save => {
    localStorage.setItem('mr-ch2-unlock', '1')
    if (!localStorage.getItem('midnight-radiology-save-v1')) localStorage.setItem('midnight-radiology-save-v1', JSON.stringify(save))
    HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('Blocked for test', 'NotAllowedError'))
  }, save)
  if (missing) await context.route('**/assets/ch2_dawn_window*.png', route => route.abort())
  const page = await context.newPage()
  page.setDefaultTimeout(8000)
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(url)
  await page.locator(`[data-ch2-step="${id}"]`).waitFor()
  await page.locator('[data-ch2-sunrise-cinematic][data-ready="true"]').waitFor()
  return { context, page }
}
const scale = page => page.locator('[data-dawn-camera]').evaluate(el => new DOMMatrix(getComputedStyle(el).transform).a)
async function refresh(page) {
  const before = await read(page)
  await page.reload()
  await page.locator(`[data-ch2-step="${before.dlc.ch2.stepId}"]`).waitFor()
  await readyText(page)
  const after = await read(page)
  assert.deepEqual(metrics(after), metrics(before), 'Refresh changes metrics')
  assert.deepEqual(after.flags, before.flags, 'Refresh changes flags')
  assert.deepEqual(after.dlc.ch2.appliedSteps, before.dlc.ch2.appliedSteps)
  assert.deepEqual(after.dlc.dr, before.dlc.dr); assert.deepEqual(after.dlc.dsa, before.dlc.dsa)
}
try {
  for (const mobile of [false, true]) {
    const { context, page } = await open({ mobile })
    const before = await read(page), visited = [], shots = new Set()
    assert.equal(await page.locator('.sprite-l,.sprite-r').count(), 0, 'Preceding patient must not remain')
    const firstScale = await scale(page)
    await page.waitForTimeout(2200)
    assert(await scale(page) < firstScale - 0.02, 'Arrival actually pulls back')
    const expectedImage = mobile ? 'ch2_dawn_window_portrait_v1.png' : 'ch2_dawn_window_v1.png'
    assert((await page.locator('[data-dawn-camera] img').evaluate(img => img.currentSrc)).endsWith(expectedImage))
    await readyText(page)
    await page.screenshot({ path: resolve(output, mobile ? 'mobile-arrival.png' : 'desktop-arrival.png') })
    let wideScale
    for (let guard = 0; guard < 30; guard++) {
      const id = await stage(page).getAttribute('data-ch2-step')
      if (id === 'c2n3_s1') break
      assert(CH2_DAWN_STEPS[id]); visited.push(id); shots.add(CH2_DAWN_SHOTS[id])
      assert.equal(await page.locator('[data-ch2-sunrise-cinematic]').getAttribute('data-ch2-sunrise-cinematic'), CH2_DAWN_SHOTS[id])
      assert.deepEqual(metrics(await read(page)), metrics(before), 'Conversation must not award/cost anything')
      await readyText(page)
      if (id === 'c2n3_dawn_study_q') {
        await refresh(page)
        await page.waitForTimeout(8200)
        wideScale = await scale(page)
        assert(Math.abs(wideScale - 1) < .01)
      }
      if (id === 'c2n3_dawn_thought') {
        await page.waitForTimeout(2500)
        assert(await scale(page) > wideScale + .035, 'Middle actually pushes in')
        await page.screenshot({ path: resolve(output, mobile ? 'mobile-close.png' : 'desktop-close.png') })
        await refresh(page)
        // Opening/closing original panels neither advances nor locks the scene.
        await page.getByRole('button', { name: '📖 手册', exact: true }).click()
        await page.getByRole('button', { name: '合上手册', exact: true }).click()
        assert.equal((await read(page)).dlc.ch2.stepId, id)
      }
      if (id === 'c2n3_dawn_life_q') {
        await page.locator('.choice-in button').first().waitFor()
        assert.equal(await page.locator('.choice-in button').count(), 2)
        await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('[data-dawn-camera]')).opacity) >= .99)
        await page.screenshot({ path: resolve(output, mobile ? 'mobile-choice.png' : 'desktop-choice.png') })
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
        for (const b of await page.locator('.choice-in button').all()) {
          const box = await b.boundingBox(); assert(box.y >= 0 && box.y + box.height <= (mobile ? 844 : 900))
        }
      }
      await advance(page, mobile ? 1 : 0)
    }
    assert.equal(visited.length, 20)
    assert.deepEqual([...shots], ['arrival','wide','close','rest'])
    const after = await read(page)
    assert(after.flags.c2_dawn_done); assert.equal(after.gold, before.gold + 280)
    assert.equal(await page.locator('[data-ch2-sunrise-cinematic]').count(), 0)
    await page.reload(); await page.locator('[data-ch2-step="c2n3_s1"]').waitFor()
    assert.equal((await read(page)).gold, after.gold, 'Original end income repeats after refresh')
    results.push({ mode: mobile ? 'mobile' : 'desktop', visited, camera: 'pullback/push-in/rest', passed: true })
    await context.close()
  }
  for (const config of [{ reduced: true }, { missing: true, mobile: true }]) {
    const { context, page } = await open({ ...config, id: 'c2n3_dawn_thought' })
    if (config.reduced) {
      assert.equal(await page.locator('[data-dawn-camera]').evaluate(el => getComputedStyle(el).transform), 'none')
    } else await page.locator('.ch2-dawn-fallback').waitFor()
    await advance(page)
    assert.equal((await read(page)).dlc.ch2.stepId, 'c2n3_dawn_reply')
    results.push({ ...config, noClickLock: true, passed: true }); await context.close()
  }
  {
    const { context, page } = await open({ landscape: true, id: 'c2n3_dawn_life_q' })
    await readyText(page); await page.locator('.choice-in button').first().waitFor()
    await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('[data-dawn-camera]')).opacity) >= .99)
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    const frame = await page.locator('.ch2-dawn-frame').boundingBox()
    assert(frame.height > 40, 'Short landscape still has a scene viewport')
    const dialogBox = await page.locator('.dialog-box').boundingBox()
    const speaker = await page.locator('.dialog-box > span.absolute:not(.animate-bounce)').boundingBox()
    assert(speaker.y >= dialogBox.y && speaker.y + speaker.height <= dialogBox.y + dialogBox.height,
      'Short-screen speaker badge must be fully inside its scrollable dialog')
    for (const b of await page.locator('.choice-in button').all()) {
      const box = await b.boundingBox(); assert(box.y >= 0 && box.y + box.height <= 375, 'Landscape option is clipped')
    }
    await page.screenshot({ path: resolve(output, 'mobile-landscape.png') })
    await advance(page, 1); results.push({ landscape: true, passed: true }); await context.close()
  }
  assert.deepEqual(errors, [])
  writeFileSync(resolve(output, 'results.json'), JSON.stringify({ results, errors }, null, 2))
  console.log('PASS dawn camera: desktop/mobile routes, actual transforms, responsive art, refresh, original overlays, reward once, reduced motion, missing image and no page errors.')
} finally { await browser.close() }
