import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
import { CH2_SHIFTS } from '../src/game/ch2.ts'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, ...(process.env.EDGE_TEST === '1' ? {channel:'msedge'} : process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
const errors = []
const url = process.env.GAME_URL || 'http://127.0.0.1:8798/'
const current = page => page.evaluate(() => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.stepId)
async function open(shift, stepId, mobile = false, rejectVoice = false) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 } })
  await context.addInitScript(({ shift, stepId, rejectVoice }) => {
    window.__voiceCalls = []
    HTMLMediaElement.prototype.play = function () {
      window.__voiceCalls.push(this.src)
      if (rejectVoice && window.__voiceCalls.length === 1) return Promise.reject(new DOMException('Blocked', 'NotAllowedError'))
      return Promise.resolve()
    }
    localStorage.setItem('mr-ch2-unlock', '1')
    if (!localStorage.getItem('midnight-radiology-save-v1')) localStorage.setItem('midnight-radiology-save-v1', JSON.stringify({ gender: 'm', night: 5, gold: 500, skill: 3, wealth: 3, heart: 3, durability: 70, badges: [], stamps: [], flags: {}, lastCheckin: '', streak: 0, finished: true, seed: 1234, items: [], ap: 3, buyCount: 0, cards: [], events: [], dlc: { ch2: { shift, stepId, viewBg: 'bg_archive' } } }))
    if (rejectVoice) {
      const saved = JSON.parse(localStorage.getItem('midnight-radiology-save-v1'))
      saved.flags.heard2_vp3_vox2_zhou = true
      localStorage.setItem('midnight-radiology-save-v1', JSON.stringify(saved))
    }
  }, { shift, stepId, rejectVoice })
  const page = await context.newPage()
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(url + '#/ch2')
  await page.locator('.dialog-box').waitFor()
  return { context, page }
}
async function advance(page, expected) {
  await page.locator('.dialog-box > span.animate-bounce').waitFor({ timeout: 15000 })
  await page.locator('.dialog-box > p').click()
  await page.waitForFunction(expected => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.stepId === expected, expected, { timeout: 3000 })
}
try {
  {
    const { context, page } = await open('c2n1', 'c2n1_4', false, true)
    await page.waitForFunction(() => window.__voiceCalls.length === 1)
    assert.equal(await page.getByRole('button', { name: /显示全文|继续 →/ }).count(), 0)
    await page.locator('.dialog-box > p').click()
    await page.waitForFunction(() => window.__voiceCalls.length === 2)
    assert.ok((await page.evaluate(() => window.__voiceCalls)).every(src => src.includes('vox2_zhou.mp3')))
    await context.close()
    console.log('PASS: old heard flag does not suppress entrance; rejected audio retries on click; original dialogue UI restored.')
  }
  // Repro: the old guard uses every tap, including rejected ones. Repeated taps
  // after revealing a choice perpetually extend the 300 ms rejection window.
  {
    const { context, page } = await open('c2n1', 'c2n1_p2')
    const choice = page.getByRole('button', { name: '「怀疑结石，先请周老师确认平扫方案。」', exact: true })
    await choice.waitFor()
    await page.locator('.dialog-box > p').click()
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('怀疑结石，先请周老师'))?.click())
      await page.waitForTimeout(100)
    }
    assert.equal(await current(page), 'c2n1_p2a', 'Rapid taps must select once, not perpetually reset a click lock')
    await context.close()
  }
  for (const mobile of [false, true]) {
    const { context, page } = await open('c2n5', 'c2n5_a2', mobile)
    console.log('Before key advance', mobile, await current(page))
    await page.getByRole('button', { name: '📚 旧书', exact: true }).click()
    await page.getByRole('button', { name: '合上书，回科室', exact: true }).click()
    await page.reload()
    assert.equal(await current(page), 'c2n5_a2')
    await advance(page, 'c2n5_a3')
    await advance(page, 'c2n5_a4')
    await advance(page, 'c2n5_a5')
    await advance(page, 'c2n5_a6')
    await page.getByRole('button', { name: '「最边上那个，是您吧？」', exact: true }).click()
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.stepId === 'c2n5_a7')
    for (const next of ['c2n5_a8', 'c2n5_a9', 'c2n5_a10', 'c2n5_hub']) await advance(page, next)
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).flags.c2n5_cabinet), true)
    await context.close()
  }
  {
    const { context, page } = await open('c2n1', 'c2n1_p0')
    await page.locator('img[src$="/ch2_pixel_pat_stone.png"]').waitFor()
    await advance(page, 'c2n1_pain')
    await page.getByText('哎呦，疼死我了。', { exact: true }).waitFor()
    assert.equal(await page.evaluate(() => window.__voiceCalls.filter(src => src.includes('/vox_guy.mp3')).length), 1)
    await advance(page, 'c2n1_p1')
    await page.locator('img[src$="/ch2_pixel_char_he.png"]').waitFor()
    await context.close()
  }
  {
    const { context, page } = await open('c2d2', 'c2d2_w2', true)
    await page.locator('canvas').waitFor()
    assert(!/AI生成|非实测|不用于诊断|非真实患者/.test(await page.locator('body').innerText()))
    await context.close()
  }
  {
    const { context, page } = await open('c2n5', 'c2n5_m17')
    await page.locator('img[src$="/ct_head_child_followup.png"]').waitFor()
    await advance(page, 'c2n5_m18')
    await context.close()
  }
  if (process.env.FULL_WALK === '1') {
    const { context, page } = await open('c2n1', 'c2n1_0')
    let visited = 0
    while (visited++ < 350) {
      const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2)
      if (progress.shift === 'c2am') break
      const shift = CH2_SHIFTS.find(s => s.id === progress.shift)
      const step = shift.steps[progress.stepId]
      assert(step, progress.stepId)
      if (step.windowTask) {
        // A click must reveal even task text, without skipping the step.
        await page.locator('.dialog-box > p').click()
        await page.getByRole('button', { name: new RegExp(` ${step.windowTask.targetW}/${step.windowTask.targetL}$`) }).click()
        await page.getByRole('button', { name: /^就这个窗口 · 确认/ }).click()
      } else if (step.choices) {
        // A click must reveal even choice text, without selecting anything.
        await page.locator('.dialog-box > p').click()
        const buttons = page.locator('.choice-in button')
        await buttons.first().waitFor()
        const labels = await buttons.allTextContents()
        let pick = labels.findIndex(t => t.includes('封条柜 · 和老周一起开锁'))
        if (pick < 0) pick = labels.findIndex(t => t.includes('【开诊】') && !t.includes('还有件事'))
        if (pick < 0) pick = labels.findIndex(t => step.choices.some(c => c.tag === 'good' && c.text.replaceAll('**', '') === t))
        if (pick < 0) pick = labels.findIndex(t => !['小卖部', '翻书'].some(s => t.includes(s)))
        await buttons.nth(Math.max(0, pick)).click()
      } else if (step.end) {
        // A click must reveal even end text, without skipping settlement.
        await page.locator('.dialog-box > p').click()
        await page.getByRole('button', { name: /本班结束 · 结算/ }).click()
        await page.getByRole('button', { name: /^进入：/ }).click()
      } else {
        // Original (restored) UI: the ▼ appears once the text is done; clicking the
        // dialogue then advances exactly one step.
        await page.locator('.dialog-box > span.animate-bounce').waitFor({ timeout: 15000 })
        await page.locator('.dialog-box > p').click()
      }
      await page.waitForFunction(before => {
        const now = JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2
        return now.stepId !== before.stepId || now.shift !== before.shift
      }, progress, { timeout: 5000 })
      if (visited % 30 === 0) console.log('Continuous walk', visited, await current(page))
    }
    assert(visited < 350, 'Story loop did not reach morning meeting')
    console.log('PASS: continuous five-shift walk, nodes:', visited)
    await context.close()
  }
  assert.deepEqual(errors, [])
  console.log('PASS: rapid-choice taps, desktop/mobile cabinet flow, book close and reload, patient portrait/voice before doctor, clean wrist UI, new child follow-up image.')
} finally { await browser.close() }
