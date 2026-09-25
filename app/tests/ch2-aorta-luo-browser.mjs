// Production-build browser fixtures. Uses real admitted images/MP3 decode;
// audio scheduling is silent/accepted or denied, never an audition substitute.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { freshState } from '../src/game/store.ts'
import { CH2_SHIFTS, ch2StepForState } from '../src/game/ch2.ts'
import { CH2_SCANS } from '../src/game/ch2-scans.ts'
import { getCh2Observation } from '../src/game/ch2-observations.ts'

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const base = (process.env.GAME_URL || 'http://127.0.0.1:8805/').replace(/\/$/, '')
const output = resolve(process.env.AORTA_LUO_OUTPUT || '../../ch2-cta-character-review')
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const key = 'midnight-radiology-save-v1', voice = 'vox_ch2_luo_entrance_20260925'
// Optional continuation after an external rebuild interrupted the test server.
// The default remains the complete suite; split output never claims full flow.
const followupsOnly = process.env.AORTA_LUO_FOLLOWUPS_ONLY === '1'
const report = followupsOnly ? 'aorta-luo-followups' : 'aorta-luo'
const all = Object.assign({}, ...CH2_SHIFTS.map(shift => shift.steps))
const plain = text => (text ?? '').replaceAll('**', '')
const read = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)
const p = page => page.locator('.dialog-box > p')
const results = [], errors = [], assetFailures = []
let activePage

function fixture(stepId, flags = {}) {
  return { ...freshState('f'), gold: 822, skill: 4, heart: 6, wealth: 3, ap: 3,
    night: 5, finished: true, stepId: 'n5_end', flags: { quiz_grade: 'S', ...flags },
    dlc: { dr: { done: true }, dsa: { dose: 32 }, ch2: { shift: CH2_SHIFTS.find(shift => shift.steps[stepId]).id,
      phase: 'story', stepId, appliedSteps: [], viewBg: 'bg_ctcontrol_day' } } }
}
async function open(save, { mobile = false, audio = 'deny' } = {}) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 } })
  await context.addInitScript(({ save, key, audio }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(save))
    localStorage.setItem('mr-ch2-unlock', '1'); sessionStorage.setItem('mr-rotate-dismissed', '1')
    HTMLMediaElement.prototype.play = function () {
      const calls = JSON.parse(sessionStorage.getItem('aorta-luo-audio-calls') || '[]')
      calls.push({ src: this.src, at: Date.now(), volume: this.volume, mode: audio })
      sessionStorage.setItem('aorta-luo-audio-calls', JSON.stringify(calls))
      this.muted = true
      return audio === 'accept' ? Promise.resolve() : Promise.reject(new DOMException('Muted fixture / autoplay denied', 'NotAllowedError'))
    }
  }, { save, key, audio })
  const page = await context.newPage(); activePage = page; page.setDefaultTimeout(12000)
  page.on('pageerror', error => errors.push(error.message))
  page.on('response', response => { if (response.status() >= 400 && /\.(webp|png|mp3)(\?|$)/.test(response.url())) assetFailures.push(response.url()) })
  await page.goto(base + '/#/ch2'); await page.locator('[data-ch2-step]').waitFor()
  const rotate = page.getByRole('button', { name: '不了，竖屏也能玩', exact: true })
  if (await rotate.isVisible()) await rotate.click()
  return { context, page }
}
async function reveal(page) {
  await p(page).waitFor(); await page.waitForTimeout(330)
  if (!await page.locator('.dialog-box .animate-bounce,.choice-in button').count()) await p(page).click()
  await page.locator('.dialog-box .animate-bounce,.choice-in button').first().waitFor()
}
async function at(page, id) { await page.locator(`[data-ch2-step="${id}"]`).waitFor(); await reveal(page) }
async function next(page, expected) {
  await reveal(page); await page.locator('.dialog-box .animate-bounce').waitFor()
  await page.waitForTimeout(330); await p(page).click()
  if (expected) await page.locator(`[data-ch2-step="${expected}"]`).waitFor()
}
async function geometry(page) {
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  const box = await page.locator('.dialog-box').boundingBox()
  assert(box.y >= 0 && box.y + box.height <= page.viewportSize().height + 1)
  const choices = await page.locator('.choice-in button').count()
  if (choices) {
    const first = await page.locator('.choice-in button').first().boundingBox()
    assert(first.y >= box.y && first.y < box.y + box.height, 'First choice is accessible inside the dialogue')
  }
}
async function loaded(page, selector) {
  await page.locator(selector).first().waitFor()
  await page.waitForFunction(selector => [...document.querySelectorAll(selector)].every(img => img.complete && img.naturalWidth > 0), selector)
}
async function acquire(page) {
  await page.locator('[data-ch2-step="c2d4_aorta_scan"]').waitFor(); await page.waitForTimeout(330); await p(page).click()
  const overlay = page.locator('[data-scan-id="c2d4_aorta_scan"]')
  await overlay.waitFor()
  assert.equal(await overlay.getAttribute('data-scan-mode'), 'acquire')
  assert.equal(await overlay.getByRole('button', { name: /跳过/ }).count(), 0)
  const start = (await read(page)).dlc.ch2.scanSessions.c2d4_aorta_scan.startedAt
  await overlay.click({ position: { x: 15, y: 15 } })
  assert.equal((await read(page)).dlc.ch2.stepId, 'c2d4_aorta_scan')
  await page.locator('[data-ch2-step="c2d4_t1"]').waitFor()
  assert(Date.now() - start >= 2900, 'Original mandatory three-second acquisition')
  assert(Date.now() - start < 8000, 'Denied sound cannot block acquisition')
  return start
}
async function answer(page, id, choiceId) {
  const config = getCh2Observation(id, await read(page))
  await reveal(page); assert.equal(await page.locator('.sprite-l,.sprite-r').count(), 0)
  const choice = config.choices.find(choice => choice.id === choiceId)
  await page.locator('.choice-in').getByRole('button', { name: plain(choice.text), exact: true }).click()
  await reveal(page); assert.equal(await p(page).textContent(), plain(choice.feedback))
  await next(page)
  await page.waitForFunction(({ key, id }) => JSON.parse(localStorage.getItem(key)).dlc.ch2.observations[id]?.acknowledged, { key, id: config.id })
}
const calls = page => page.evaluate(voice => JSON.parse(sessionStorage.getItem('aorta-luo-audio-calls') || '[]').filter(row => row.src.includes(voice)), voice)

try {
  const plans = getCh2Observation('c2d4_7', fixture('c2d4_7')).choices
  const choices = getCh2Observation('c2d4_t1', fixture('c2d4_t1')).choices
  for (let route = 0; !followupsOnly && route < choices.length; route++) {
    const mobile = route === choices.length - 1, save = fixture('c2d4_1')
    const { context, page } = await open(save, { mobile })
    const visited = [], text = [], images = [], plan = plans[route % plans.length], observation = choices[route]
    let scanStart
    for (let count = 0; count < 45; count++) {
      const state = await read(page), id = state.dlc.ch2.stepId
      const step = ch2StepForState(id, all[id], state), config = getCh2Observation(id, state)
      if (visited.at(-1) !== id) visited.push(id)
      if (id === 'c2d4_aorta_scan') { scanStart = await acquire(page); continue }
      if (config && !state.dlc.ch2.observations?.[config.id]?.acknowledged) {
        await answer(page, id, id === 'c2d4_7' ? plan.id : observation.id)
        continue
      }
      await at(page, id); text.push(plain(step.text))
      if (step.image && images.at(-1) !== step.image) images.push(step.image)
      if (id === 'c2d4_2') {
        await loaded(page, '.sprite-l'); assert.match(await page.locator('.sprite-l').getAttribute('src'), /ch2_patient_aorta_middle_bed/)
        const alpha = await page.locator('.sprite-l').evaluate(img => {
          const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight
          const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0)
          return [[0, 0], [canvas.width - 1, 0], [0, canvas.height - 1], [canvas.width - 1, canvas.height - 1]].map(([x, y]) => ctx.getImageData(x, y, 1, 1).data[3])
        })
        assert.deepEqual(alpha, [0, 0, 0, 0], 'Patient sprite transparent corners, not a baked rectangular backdrop')
      }
      if (id === 'c2d4_aorta_doctor') {
        await loaded(page, '.sprite-l,.sprite-r')
        assert.match(await page.locator('.sprite-l').getAttribute('src'), /ch2_pixel_char_he/)
        assert.match(await page.locator('.sprite-r').getAttribute('src'), /ch2_patient_aorta_middle_bed/)
        await geometry(page)
        if (route === 0 || mobile) await page.screenshot({ path: `${output}/aorta-patient-${mobile ? 'mobile' : 'desktop'}.png` })
      }
      if (id === 'c2d4_aorta_volume' || id === 'c2d4_aorta_volume_reply') {
        await loaded(page, 'img[alt="影像或证物"]')
        assert.equal(await page.locator('.ch2-scan-overlay').count(), 0)
        assert(!CH2_SCANS[id], 'The cutaway is same-data rendering, not a new acquisition')
        await geometry(page)
        if (route === 0 || mobile) await page.screenshot({ path: `${output}/aorta-vr-${id.endsWith('reply') ? 'reply-' : ''}${mobile ? 'mobile' : 'desktop'}.png` })
      }
      if (id === 'c2d4_10') break
      await next(page, step.next)
    }
    assert.equal(visited.at(-1), 'c2d4_10')
    assert.deepEqual(images, ['ch2_ct_aortic_wide', 'ch2_aorta_volume_cutaway_v1'])
    assert(visited.indexOf('c2d4_t1') < visited.indexOf('c2d4_aorta_volume'))
    assert.match(text.join('\n'), /市三甲医院接诊/)
    assert.match(text.join('\n'), /启动急救转运/)
    assert.match(text.join('\n'), /不等纸报告/)
    const after = await read(page), reward = observation.correct && !observation.hint ? 1 : 0
    assert.equal(after.skill, save.skill + reward)
    assert.equal(after.gold, save.gold)
    assert.deepEqual(Object.keys(after.dlc.ch2.scanSessions), ['c2d4_aorta_scan'])
    assert.equal(after.dlc.ch2.scanSessions.c2d4_aorta_scan.startedAt, scanStart)
    await page.reload(); await at(page, 'c2d4_10')
    assert.equal((await read(page)).skill, after.skill)
    assert.deepEqual((await read(page)).dlc.dr, save.dlc.dr)
    assert.deepEqual((await read(page)).dlc.dsa, save.dlc.dsa)
    results.push({ kind: 'aorta-complete', plan: plan.id, observation: observation.id, mobile, visited, images, reward, passed: true })
    console.log(`PASS aorta route ${route + 1}/${choices.length}: ${plan.id}/${observation.id}${mobile ? ' mobile' : ''}`)
    await context.close()
  }

  // As with existing characters, reloading the entrance itself is a fresh voice
  // session and may replay it. The regression boundary is no catch-up after
  // leaving that node, not a new persistent heard flag for this one character.
  for (const audio of ['accept', 'deny']) {
    const { context, page } = await open(fixture('c2d4_needle0'), { audio, mobile: audio === 'deny' })
    await at(page, 'c2d4_needle0'); await loaded(page, '.sprite-l')
    assert.match(await page.locator('.sprite-l').getAttribute('src'), /ch2_pat_luo_v1/)
    assert.match(await p(page).textContent(), /大夫，帮我看看/)
    const initial = (await calls(page)).length
    assert(initial >= 1)
    if (audio === 'accept') assert.equal(initial, 1, 'Accepted entrance plays only once despite text-reveal gestures')
    const decoded = await page.evaluate(async voice => {
      const response = await fetch(`audio/${voice}.mp3?v=2`)
      if (!response.ok) throw new Error(`Audio ${response.status}`)
      const buffer = await response.arrayBuffer(), bytes = buffer.byteLength, ctx = new AudioContext()
      const decoded = await ctx.decodeAudioData(buffer); await ctx.close()
      // decodeAudioData detaches its input buffer; capture byte size beforehand.
      return { duration: decoded.duration, channels: decoded.numberOfChannels, rate: decoded.sampleRate, bytes }
    }, voice)
    assert(decoded.bytes > 0)
    assert(decoded.duration > 1.7 && decoded.duration < 2.4)
    await next(page, 'c2d4_needle1'); await at(page, 'c2d4_needle1')
    const beforeReload = (await calls(page)).length
    await page.reload(); await at(page, 'c2d4_needle1'); await next(page, 'c2d4_needle2'); await at(page, 'c2d4_needle2')
    assert.equal((await calls(page)).length, beforeReload, 'Leaving the entrance then refreshing cannot chase its voice into later dialogue')
    await page.screenshot({ path: `${output}/luo-${audio}.png` })
    results.push({ kind: 'luo-voice', audio, initialAttempts: initial, decode: decoded, noChaseAfterDeparture: true, passed: true })
    await context.close()
  }

  for (const flags of [{}, { c2_apples_shared: true }, { c2_dawn_done: true }, { c2_apples_shared: true, c2_dawn_done: true }]) {
    const { context, page } = await open(fixture('c2n5_b1', flags))
    await at(page, 'c2n5_b1')
    const first = await p(page).textContent()
    assert.match(first, /摆到桌上/)
    assert.match(first, flags.c2_apples_shared ? /大家吃了你的苹果/ : /给值班的都带点/)
    if (flags.c2_dawn_done && !flags.c2_apples_shared) assert.match(first, /日出/)
    assert.doesNotMatch(first, /塞给你|给你留|专门给你|你的那份/)
    await next(page, 'c2n5_b2'); await at(page, 'c2n5_b2')
    assert.match(await p(page).textContent(), /你和同事分着吃/)
    results.push({ kind: 'shared-meal-reply', flags, passed: true }); await context.close()
  }
  for (const terminalAlreadyReceived of [false, true]) {
    const save = fixture('c2am_5', terminalAlreadyReceived ? { c2_terminal_end_sms_received: true } : {})
    const { context, page } = await open(save, { mobile: terminalAlreadyReceived })
    const visited = []
    for (const id of ['c2am_5', 'c2am_ct_reflection', 'c2am_ct_before', 'c2am_6']) {
      await at(page, id); visited.push(id)
      if (id === 'c2am_ct_reflection') assert.match(await p(page).textContent(), /急诊神器/)
      if (id === 'c2am_ct_before') assert.match(await p(page).textContent(), /症状、查体/)
      const step = ch2StepForState(id, all[id], await read(page))
      if (id === 'c2am_6') {
        assert.doesNotMatch(await p(page).textContent(), /第二章.*完/)
        assert.equal(step.next, terminalAlreadyReceived ? 'c2am_8' : 'c2am_terminal_sms')
      }
      // Without the old data-audit flag, the existing 2028 teaser is immediately
      // skipped on entry; wait at its legitimate destination, not a ghost frame.
      const target = step.next === 'c2am_8' && !save.flags.data_audit ? 'c2am_9' : step.next
      await next(page, target)
    }
    if (!terminalAlreadyReceived) { await at(page, 'c2am_terminal_sms'); assert.match(await p(page).textContent(), /别把盒子还给他们/) }
    results.push({ kind: 'ct-ending', terminalAlreadyReceived, visited, passed: true }); await context.close()
  }
  assert.deepEqual(errors, []); assert.deepEqual(assetFailures, [])
  writeFileSync(`${output}/${report}-results.json`, JSON.stringify({ passed: true, base, scope: followupsOnly ? 'voice-and-followups-only' : 'complete', results, errors, assetFailures }, null, 2))
  console.log(`PASS ch2-aorta-luo-browser: ${results.length} production fixtures`)
} catch (error) {
  if (activePage && !activePage.isClosed()) await activePage.screenshot({ path: `${output}/${report}-failure.png` }).catch(() => {})
  writeFileSync(`${output}/${report}-failure.json`, JSON.stringify({ message: String(error), stack: error.stack, results, errors, assetFailures }, null, 2))
  throw error
} finally { await browser.close() }
