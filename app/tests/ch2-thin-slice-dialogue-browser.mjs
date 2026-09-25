// Focused real-browser bridge test, not a complete chapter walkthrough.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { freshState } from '../src/game/store.ts'
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const base = (process.env.GAME_URL || 'http://127.0.0.1:8805/').replace(/\/$/, '')
const output = resolve(process.env.THIN_DIALOGUE_OUTPUT || '../../ch2-thin-slice-dialogue-review')
mkdirSync(output, { recursive: true })
const key = 'midnight-radiology-save-v1', errors = [], results = []
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const read = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)
const plain = page => page.locator('.dialog-box > p').innerText()
async function reveal(page) {
  await page.waitForTimeout(350)
  if (!await page.locator('.dialog-box .animate-bounce, .choice-in button').count()) await page.locator('.dialog-box > p').click()
  await page.locator('.dialog-box .animate-bounce, .choice-in button').first().waitFor()
}
async function advance(page) {
  await reveal(page)
  await page.waitForTimeout(350)
  await page.locator('.dialog-box > p').click()
}
async function at(page, id) {
  await page.locator(`[data-ch2-step="${id}"]`).waitFor()
  await reveal(page)
}
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 } })
    const save = { ...freshState('f'), finished: true, skill: 0, gold: 500,
      flags: { quiz_grade: 'S' }, dlc: { dr: { done: true }, dsa: { dose: 39 },
        ch2: { shift: 'c2d2', phase: 'story', stepId: 'c2d2_w1ok', viewBg: 'bg_ctcontrol_day', appliedSteps: [] } } }
    await context.addInitScript(({save,key}) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(save))
      localStorage.setItem('mr-ch2-unlock', '1')
      // This is a silent dialogue change; test it with audio unavailable, too.
      HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('Audio blocked by fixture', 'NotAllowedError'))
    }, { save, key })
    const page = await context.newPage(); page.setDefaultTimeout(12000)
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(base + '/#/ch2')
    const rotate = page.getByRole('button', { name: '不了，竖屏也能玩', exact: true })
    if (await rotate.isVisible()) await rotate.click()
    await at(page, 'c2d2_w1ok')
    assert.doesNotMatch(await plain(page), /既然薄层|噪点通常更少/)
    assert.equal(await page.locator('[aria-label="与邻层、旧片对照的小结节"]').count(), 0)
    const choices = page.locator('.choice-in button')
    await (mobile ? choices.last() : page.getByRole('button', { name: '屏幕右上', exact: true })).click()
    await reveal(page)
    assert.doesNotMatch(await plain(page), /既然薄层|噪点通常更少/)
    await advance(page)
    await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).dlc.ch2.observations['lung-observe-v1'].acknowledged, key)
    await reveal(page)
    assert.match(await plain(page), /不是结节跟人捉迷藏/)
    const afterObservation = await read(page)
    await advance(page); await at(page, 'c2d2_thickness_question')
    assert.equal(await plain(page), '既然薄层这么好，干嘛还要重建厚层的？')
    await page.getByText('林小满', { exact: true }).waitFor()
    await page.reload(); await at(page, 'c2d2_thickness_question')
    assert.equal(await page.locator('.choice-in button').count(), 0, 'No extra quiz or observation')
    await advance(page); await at(page, 'c2d2_thickness_reply')
    assert.match(await plain(page), /同一套数据，其他设置不变/)
    assert.match(await plain(page), /噪点通常更少/)
    assert.match(await plain(page), /就不能只看厚层/)
    await page.locator('img[alt="影像或证物"]').evaluate(img => img.decode())
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    const box = await page.locator('.dialog-box').boundingBox()
    assert(box.y >= 0 && box.y + box.height <= page.viewportSize().height, 'Dialogue stays in viewport')
    await page.screenshot({ path: `${output}/${mobile ? 'mobile' : 'desktop'}-reply.png` })
    const afterReply = await read(page)
    for (const field of ['gold','skill','heart','wealth','ap','items','badges']) assert.deepEqual(afterReply[field], afterObservation[field], `Silent bridge must not change ${field}`)
    assert.deepEqual(afterReply.dlc.ch2.observations, afterObservation.dlc.ch2.observations)
    await advance(page); await at(page, 'c2d2_7')
    assert.match(await plain(page), /哦，这回看清了/)
    assert.equal((await read(page)).gold, afterObservation.gold + 80)
    await page.reload(); await at(page, 'c2d2_7')
    assert.equal((await read(page)).gold, afterObservation.gold + 80, 'Original payment not duplicated on refresh')
    await advance(page); await at(page, 'c2d2_gap_shift')
    const after = await read(page)
    assert.deepEqual(after.dlc.dr, save.dlc.dr); assert.deepEqual(after.dlc.dsa, save.dlc.dsa)
    assert.equal(after.flags.quiz_grade, 'S')
    results.push({ mobile, answer: mobile ? 'help' : 'correct', passed: true, reward: 80, restoredQuestion: true })
    await context.close()
  }
  assert.deepEqual(errors, [])
  writeFileSync(`${output}/results.json`, JSON.stringify({ base, results, errors }, null, 2))
  console.log(JSON.stringify({ passed: true, results, errors }, null, 2))
} finally { await browser.close() }
