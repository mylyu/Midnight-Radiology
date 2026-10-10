// Focused parity/phone checks. Uses isolated saves and real media promises, not a full walk.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { TRILOGY } from '../src/game/trilogy-registry.ts'
import { freshState } from '../src/game/store.ts'
import { initializeTrilogy, patchTrilogy, enterTrilogyNode } from '../src/game/trilogy-session.ts'
import { awaitChapterEntry } from './chapter-entry-driver.mjs'

assert.equal(process.env.TRILOGY_BUILD_READY, '1')
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, channel: 'msedge' })
const output = resolve('../../trilogy-experience-review-20261010/browser')
mkdirSync(output, { recursive: true })
const key = 'midnight-radiology-save-v1', report = []
const cases = [
  ['ch3', 'echo'], ['ch3', 'tgc'], ['ch3', 'm_mode'], ['ch3', 'doppler'], ['ch3', 'resolution'],
  ['ch4', 'mri-relax', 'signal'], ['ch4', 'mri-relax', 'contrast'], ['ch4', 'mri-encoding'], ['ch4', 'mri-sampling', 'motion'], ['ch4', 'mri-sampling', 'undersample'],
  ['ch5', 'collimator'], ['ch5', 'spect'], ['ch5', 'coincidence'], ['ch5', 'counting'],
]
async function check(id, node, kind, landscape = false) {
  const chapter = TRILOGY[id], step = chapter.steps[node]
  let initial = initializeTrilogy({ ...freshState('f'), gold: 1200, items: ['snack'], dlc: { ldct: { done: true } } }, chapter)
  initial = patchTrilogy(initial, id, { applied: ['checkin:0'] })
  initial = enterTrilogyNode(initial, chapter, node)
  const context = await browser.newContext({ viewport: landscape ? { width: 844, height: 390 } : { width: 390, height: 780 }, isMobile: true, hasTouch: true })
  await context.addInitScript(({ key, initial }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(initial))
    sessionStorage.setItem('mr-rotate-dismissed', '1')
    window.__realAudio = []
    const original = HTMLMediaElement.prototype.play
    HTMLMediaElement.prototype.play = function () {
      const row = { src: this.src, volume: this.volume, status: 'pending' }; window.__realAudio.push(row)
      const result = original.call(this)
      result.then(() => { row.status = 'playing' }, error => { row.status = error.name })
      return result
    }
  }, { key, initial })
  const page = await context.newPage(), row = { id, node, kind, landscape, errors: [] }
  page.on('pageerror', error => row.errors.push(error.message))
  try {
    await page.goto(`http://127.0.0.1:8798/?v=trilogy-experience#/${id}`)
    await page.locator('[data-chapter-loader], [data-trilogy]').first().waitFor({ timeout: 60000 })
    if (await page.locator('[data-chapter-loader]').count()) await awaitChapterEntry(page)
    await page.locator(`[data-trilogy="${id}"]`).waitFor()
    // The chapter now owns all compressed blobs. No later asset fetch is allowed.
    await context.setOffline(true)
    if (kind === 'tool') {
      const lab = page.locator('[data-trilogy-lab]'), done = page.locator('[data-trilogy-tool-done]')
      await lab.waitFor()
      const fit = await done.evaluate(e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, hit: e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)), vw: innerWidth, vh: innerHeight } })
      assert(fit.y >= 0 && fit.y + fit.h <= fit.vh && fit.x >= 0 && fit.x + fit.w <= fit.vw && fit.hit, `tool footer accessible ${JSON.stringify(fit)}`)
      assert(await lab.locator('canvas,svg').count() > 0)
      const sliders = lab.locator('input[type=range]')
      if (await sliders.count()) {
        await sliders.first().focus(); await sliders.first().press('End')
        for (let i = 0; i < 25; i++) await sliders.first().press('ArrowLeft')
        const p = await page.evaluate(({ key, id }) => JSON.parse(localStorage.getItem(key)).dlc[id].chapter, { key, id })
        assert.equal(p.tools[node].value, 75, 'Visible control persisted')
      }
      await page.screenshot({ path: resolve(output, `${id}-${node}-${landscape?'wide':'phone'}.png`) })
    } else if (kind === 'scan') {
      await page.locator('[data-trilogy-scan]').waitFor()
      const bed = page.locator('[data-scan-bed-travel]')
      const first = await bed.getAttribute('data-scan-bed-travel')
      await page.waitForTimeout(850)
      const second = await bed.getAttribute('data-scan-bed-travel')
      assert.notEqual(first, second, 'Actual couch changes position')
      await page.screenshot({ path: resolve(output, `${id}-scan-${landscape?'wide':'phone'}.png`) })
      await page.locator('[data-trilogy-scan]').waitFor({ state: 'detached', timeout: 4500 })
      assert.equal(await page.locator('.dialog-box').count(), 1, 'Scan does not leave click lock')
    } else {
      await page.locator('.dialog-box').waitFor()
      await page.locator('.dialog-box').tap()
      await page.waitForTimeout(450)
      if (step.closeup) { await page.locator('.ldct-cinematic').waitFor(); assert.equal(await page.locator('.sprite-l,.sprite-r').count(), 0) }
      const media = await page.locator('img').evaluateAll(imgs => imgs.map(i=>({ok:i.complete&&i.naturalWidth>0,src:i.src})))
      assert(media.every(i=>i.ok), 'Offline images decoded')
      row.audio = await page.evaluate(() => window.__realAudio)
      await page.screenshot({ path: resolve(output, `${id}-${node}-${landscape?'wide':'phone'}.png`) })
    }
    // Tool persistence refresh is asserted online below, while the operation itself ran offline.
    if (kind === 'tool') {
      await context.setOffline(false); await page.goto(`http://127.0.0.1:8798/#/${id}`)
      await page.locator('[data-chapter-loader], [data-trilogy]').first().waitFor({ timeout: 60000 })
      if (await page.locator('[data-chapter-loader]').count()) await awaitChapterEntry(page)
      await page.locator('[data-trilogy-lab]').waitFor()
      const saved = await page.evaluate(({ key, id }) => JSON.parse(localStorage.getItem(key)).dlc[id].chapter, { key, id })
      if (step.tool && await page.locator('[data-trilogy-lab] input[type=range]').count()) assert.equal(saved.tools[node].value, 75)
      await page.locator('[data-trilogy-tool-done]').tap()
      await page.waitForFunction(({key,id,node})=>JSON.parse(localStorage.getItem(key)).dlc[id].chapter.stepId!==node,{key,id,node})
    }
    assert.deepEqual(row.errors, [])
    row.status = 'passed'; console.log(`PASS ${id} ${node} ${landscape?'wide':'phone'}`)
  } catch (error) {
    row.status='failed';row.error=error.stack;console.error(row.error)
    await page.screenshot({path:resolve(output,`${id}-${node}-failure.png`)}).catch(()=>{})
  } finally { report.push(row); await context.close() }
}
try {
  for (const [id, task, variant] of cases) {
    const entry=Object.entries(TRILOGY[id].steps).find(([,s])=>s.tool?.task===task&&(!variant||s.tool.variant===variant))
    assert(entry,`${id} ${task} ${variant}`)
    await check(id,entry[0],'tool', ['tgc','mri-sampling','spect'].includes(task))
  }
  for (const id of ['ch3','ch4','ch5']) {
    await check(id,Object.entries(TRILOGY[id].steps).find(([,s])=>s.closeup)[0],'scene')
  }
  await check('ch3',Object.entries(TRILOGY.ch3.steps).find(([,s])=>s.voice==='vox_c3_mei_v2')[0],'scene')
  await check('ch4','c4_1_wrist_scan','scan',true)
  await check('ch5','c5_s2_acquire','scan')
} finally {
  writeFileSync(resolve(output,'results.json'),JSON.stringify(report,null,2));await browser.close()
}
assert(report.every(r=>r.status==='passed'), 'Focused failures remain')
