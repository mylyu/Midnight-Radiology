// Fresh, disposable Edge contexts only: no CDP connection to the user's browser.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { CH2_SHIFTS, ch2StepForState } from '../src/game/ch2.ts'
import { freshState } from '../src/game/store.ts'
import { CH2_TERMINAL_CUES } from '../src/game/ch2-terminal.ts'
import { logicalImagePath, logicalImageUrl } from './game-delivery-media.mjs'

const require = createRequire(import.meta.url)
const modulePath = process.env.PLAYWRIGHT_MODULE || 'C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
assert(existsSync(modulePath), `Playwright runtime not found: ${modulePath}`)
const { chromium } = require(modulePath)
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const output = resolve(process.env.MYSTERY_OUTPUT || '../../ch2-mystery-review')
mkdirSync(output, { recursive: true })
const url = (process.env.GAME_URL || 'http://127.0.0.1:8798/').replace(/\/$/, '') + '/#/ch2'
const errors = [], report = [], active = new Set()
const passed = message => { report.push(message); console.log('PASS:', message) }
const read = page => page.evaluate(() => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')))
const calls = page => page.evaluate(() => JSON.parse(sessionStorage.getItem('mystery-audio-calls') || '[]').filter(src => /ch2_terminal_(alarm|receipt)_v1/.test(src)))
const needleFlags = { c2_needle_seen: true, c2_needle_axial: true, c2_needle_mpr: true, c2_needle_vr: true, c2_needle_assessed: true }
const expectedOriginal = { night: 5, gold: 500, skill: 3, wealth: 3, heart: 3, ap: 3, buyCount: 12, lotteryNight: 5, lotteryCount: 2, cards: [], badges: [] }
async function open(shift, stepId, { flags = {}, mobile = false, quiet = false, rejectAudio = false } = {}) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 } })
  active.add(context)
  const save = { ...freshState('m'), ...expectedOriginal, finished: true, items: [],
    flags: { quiz_grade: 'A', ...flags }, dlc: { dr: { done: true }, dsa: { dose: 27 }, ch2: { shift, stepId, viewBg: 'bg_ctcontrol', phase: 'story' } } }
  await context.addInitScript(({ save, quiet, rejectAudio }) => {
    HTMLMediaElement.prototype.play = function () {
      const seen = JSON.parse(sessionStorage.getItem('mystery-audio-calls') || '[]')
      seen.push(this.src); sessionStorage.setItem('mystery-audio-calls', JSON.stringify(seen))
      return rejectAudio ? Promise.reject(new DOMException('Test blocked playback', 'NotAllowedError')) : Promise.resolve()
    }
    localStorage.setItem('mr-ch2-unlock', '1')
    if (!localStorage.getItem('midnight-radiology-save-v1')) {
      localStorage.setItem('midnight-radiology-save-v1', JSON.stringify(save))
      localStorage.setItem('midnight-radiology-ch2-terminal-muted-v1', quiet ? '1' : '0')
    }
  }, { save, quiet, rejectAudio })
  const page = await context.newPage()
  page.setDefaultTimeout(7000)
  page.on('pageerror', error => errors.push({ step: stepId, error: error.message }))
  await page.goto(url)
  await page.locator(`[data-ch2-step="${stepId}"]`).waitFor()
  return { context, page }
}
async function close(context) { active.delete(context); await context.close() }
async function currentStep(page) {
  const state = await read(page), progress = state.dlc.ch2
  const raw = CH2_SHIFTS.find(shift => shift.id === progress.shift)?.steps[progress.stepId]
  assert(raw, `Unregistered node ${progress.stepId}`)
  return { state, id: progress.stepId, step: ch2StepForState(progress.stepId, raw, state) }
}
async function reveal(page) {
  const { id, step, state } = await currentStep(page)
  const expected = (step.text || '').replaceAll('**', '').replaceAll('行动力⚡×3', `行动力⚡×${state.ap}`)
  const dialog = page.locator('.dialog-box > p')
  if (await dialog.textContent() !== expected) await dialog.click()
  await page.waitForFunction(text => document.querySelector('.dialog-box > p')?.textContent === text, expected)
  assert.equal((await read(page)).dlc.ch2.stepId, id, 'Revealing text must not accidentally advance')
  return { id, step, state }
}
async function advance(page, choiceIndex = 0) {
  const { id, step } = await reveal(page)
  let expected = step.next
  if (step.choices) {
    const choice = step.choices[choiceIndex]
    expected = choice.next
    await page.locator('.choice-in').getByRole('button', { name: choice.text.replaceAll('**', ''), exact: true }).click()
  } else {
    await page.locator('.dialog-box > span.animate-bounce').waitFor()
    await page.locator('.dialog-box > p').click()
  }
  assert(expected && !expected.startsWith('@'), `${id}: use an explicit overlay helper for ${expected}`)
  await page.locator(`[data-ch2-step="${expected}"]`).waitFor()
  await page.waitForFunction(expected => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.stepId === expected, expected)
  return expected
}
async function chooseNext(page, target) {
  const { step } = await reveal(page)
  const index = step.choices?.findIndex(choice => choice.next === target)
  assert(index >= 0, `Missing UI choice ${target}`)
  return advance(page, index)
}
async function reloadOnce(page, label, expectedAudio) {
  const before = await read(page), audioBefore = await calls(page)
  await page.reload()
  await page.locator(`[data-ch2-step="${before.dlc.ch2.stepId}"]`).waitFor()
  const after = await read(page)
  for (const key of ['gold', 'skill', 'heart', 'wealth', 'ap', 'badges', 'cards']) assert.deepEqual(after[key], before[key], `${label}: ${key} changes on reload`)
  assert.deepEqual(after.flags, before.flags, `${label}: flags/evidence change on reload`)
  assert.deepEqual(after.dlc.ch2.appliedSteps, before.dlc.ch2.appliedSteps, `${label}: repeated effects`)
  assert.deepEqual(await calls(page), audioBefore, `${label}: refreshed cue replays`)
  if (expectedAudio !== undefined) assert.equal(audioBefore.length, expectedAudio)
}
async function layout(page) {
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'horizontal document overflow')
  for (const box of await page.locator('button:visible').evaluateAll(buttons => buttons.map(button => {
    const r = button.getBoundingClientRect(); return { text: button.textContent, left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: innerWidth, height: innerHeight }
  }))) {
    assert(box.left >= -1 && box.right <= box.width + 1, `button horizontally clipped: ${box.text}`)
    assert(box.top >= -1 && box.bottom <= box.height + 1, `button vertically clipped: ${box.text}`)
  }
}
async function imageLoaded(page, key) {
  const expectedImage = logicalImageUrl(key, page.url())
  const img = page.locator(`img[src$="assets/${logicalImagePath(key)}"]`).first()
  await img.waitFor()
  await page.waitForFunction(expected => [...document.images].some(img => img.src === expected && img.complete && img.naturalWidth > 0), expectedImage)
}
async function manual(page, expectedTitles, screenshot) {
  const before = await read(page)
  await page.getByRole('button', { name: '📖 手册', exact: true }).click()
  await page.getByRole('button', { name: /^证物回看/ }).click()
  for (const title of expectedTitles) await page.getByText(`🗂️ ${title}`, { exact: true }).waitFor()
  await layout(page)
  if (screenshot) await page.screenshot({ path: resolve(output, screenshot) })
  await page.getByRole('button', { name: '合上手册', exact: true }).click()
  assert.equal((await read(page)).dlc.ch2.stepId, before.dlc.ch2.stepId)
  await page.getByRole('button', { name: '📚 旧书', exact: true }).click()
  await page.getByRole('button', { name: '合上书，回科室', exact: true }).click()
  assert.equal((await read(page)).dlc.ch2.stepId, before.dlc.ch2.stepId)
}
async function unchangedRewards(page, ap = 3) {
  const state = await read(page)
  for (const [key, value] of Object.entries(expectedOriginal)) assert.deepEqual(state[key], key === 'ap' ? ap : value, `${key}: unrequested reward/state mutation`)
  assert.equal(state.flags.quiz_grade, 'A')
  assert.deepEqual(state.dlc.dr, { done: true }); assert.deepEqual(state.dlc.dsa, { dose: 27 })
}
async function walk(page, end, choose = () => 0, visit = async () => {}) {
  for (let n = 0; n < 80; n++) {
    const { id, step } = await currentStep(page)
    if (id === end) return
    await reveal(page)
    await visit(id, step)
    await advance(page, choose(id, step))
  }
  assert.fail(`walk failed to reach ${end}`)
}

try {
  for (let route = 0; route < 3; route++) {
    const { context, page } = await open('c2d4', 'c2d4_reg2', { mobile: route === 2 })
    await walk(page, 'c2d4_chat0', id => id === 'c2d4_needle_q' || id === 'c2d4_needle_echo_q' ? route : 0, async (id, step) => {
      assert.equal(await page.locator('.ch2-scan-overlay').count(), 0, 'existing CT review must not play an acquisition')
      if (step.sprite === 'ch2_pat_luo_v1') await imageLoaded(page, step.sprite)
      if (step.image) await imageLoaded(page, step.image)
      if (route === 0 && ['c2d4_needle0', 'c2d4_needle_axial', 'c2d4_needle_mpr', 'c2d4_needle_vr'].includes(id)) await page.screenshot({ path: resolve(output, `${id}.png`) })
      if (id === 'c2d4_needle_q') { await layout(page); await reloadOnce(page, `needle investigation ${route}`) }
      if (route === 2 && id === 'c2d4_needle_mpr') { await layout(page); await page.screenshot({ path: resolve(output, '390-needle-mpr.png') }) }
    })
    const saved = await read(page)
    for (const [flag, value] of Object.entries(needleFlags)) assert.equal(saved.flags[flag], value)
    assert(!saved.flags.c2_needle_resolved)
    await unchangedRewards(page)
    await manual(page, ['罗阿姨的外院CT · 横断面', '罗阿姨的外院CT · 换个方向', '罗阿姨的外院CT · 十五处细影'], route === 2 ? '390-needle-evidence.png' : undefined)
    await close(context)
  }
  passed('Friday: all three investigation and three colleague choices; patient first; all three assets; reload; no new scans, audio, rewards or AP cost.')

  for (let choice = 0; choice < 2; choice++) {
    const { context, page } = await open('c2n5', 'c2n5_chat_q', { flags: needleFlags, mobile: choice === 1 })
    await chooseNext(page, 'c2n5_needle_reveal0')
    await walk(page, 'c2n5_chat_q', () => choice, async (id, step) => {
      if (step.image) await imageLoaded(page, step.image)
      if (id === 'c2n5_needle_record') { await reloadOnce(page, 'needle record'); await reveal(page); await page.screenshot({ path: resolve(output, `${choice ? '390-' : ''}needle-record.png`) }) }
    })
    assert((await read(page)).flags.c2_needle_resolved)
    assert.equal(await page.getByRole('button', { name: /罗阿姨那十五根针/ }).count(), 0)
    await unchangedRewards(page)
    await manual(page, ['罗阿姨家属找到的旧治疗记录'])
    await close(context)
  }
  for (const start of ['c2n5_hub', 'c2n5_m0']) {
    const { context, page } = await open('c2n5', start, { flags: { ...needleFlags, c2n5_cabinet: true } })
    if (start === 'c2n5_hub') await chooseNext(page, 'c2n5_needle_short0')
    else await advance(page)
    await walk(page, 'c2n5_m0')
    assert((await read(page)).flags.c2_needle_resolved)
    await reveal(page)
    assert.match(await page.locator('.dialog-box > p').textContent(), /电梯口传来争吵/)
    await advance(page)
    assert.equal((await read(page)).dlc.ch2.stepId, 'c2n5_m1')
    await close(context)
  }
  for (const start of ['c2n5_chat_q', 'c2n5_m0']) {
    const { context, page } = await open('c2n5', start)
    await reveal(page)
    assert.doesNotMatch(await page.locator('.dialog-box').innerText(), /罗阿姨|十五根|留针/)
    if (start === 'c2n5_m0') assert.equal(await advance(page), 'c2n5_m1')
    assert(!(await read(page)).flags.c2_needle_record)
    await close(context)
  }
  passed('Sunday: both optional closure choices, hub fallback and old save at m0; normal arrival resumes once; unintroduced legacy case never fabricated.')

  for (const route of ['untouched', 'look', 'offline', 'offline-skip', 'reconnect']) {
    const { context, page } = await open('c2n3', 'c2n3_hub')
    await chooseNext(page, 'c2n3_terminal_0')
    await reloadOnce(page, `night3 ${route} AP`)
    await page.locator('[data-ch2-terminal-panel="online"]').waitFor()
    if (route === 'untouched') await chooseNext(page, 'c2n3_terminal_done')
    else if (route === 'look') {
      await chooseNext(page, 'c2n3_terminal_look')
      await chooseNext(page, 'c2n3_terminal_device_note')
      await reloadOnce(page, 'device-number evidence')
      await walk(page, 'c2n3_terminal_done')
    } else {
      await chooseNext(page, 'c2n3_terminal_unplug')
      await page.locator('[data-ch2-terminal-panel="offline"]').waitFor()
      await walk(page, 'c2n3_terminal_call')
      await chooseNext(page, route === 'offline' ? 'c2n3_terminal_ask' : 'c2n3_terminal_quiet')
      await walk(page, 'c2n3_terminal_connection_q')
      await chooseNext(page, route === 'reconnect' ? 'c2n3_terminal_reconnect' : 'c2n3_terminal_keep_offline')
      if (route === 'reconnect') await walk(page, 'c2n3_terminal_note')
      else {
        await walk(page, 'c2n3_terminal_note_q')
        await chooseNext(page, route === 'offline-skip' ? 'c2n3_terminal_done' : 'c2n3_terminal_note')
      }
      if (route !== 'offline-skip') await reloadOnce(page, `night3 ${route} evidence`)
      await walk(page, 'c2n3_terminal_done')
    }
    await reveal(page)
    const text = await page.locator('.dialog-box > p').textContent()
    assert.match(text, route.startsWith('offline') ? /保持断开/ : route === 'reconnect' ? /已经接回/ : /仍接着/)
    await advance(page)
    assert.equal(await page.getByRole('button', { name: /机柜旁 · 看看厂家/ }).count(), 0, 'completed exploration hides')
    await unchangedRewards(page, 2)
    const f = (await read(page)).flags
    assert.equal(!!f.c2_terminal_call_noted, ['offline', 'reconnect'].includes(route))
    assert.equal(!!f.c2_terminal_device_noted, route === 'look')
    assert.equal(!!f.c2_terminal_n3_reconnected, route === 'reconnect')
    await close(context)
  }
  passed('Night3: untouched/device-note, both phone answers, explicit offline/reconnect decisions, optional and compulsory call records; one AP, reload idempotence, completed exploration hidden.')

  for (const config of [
    { route: 'key', expected: 2 }, { route: 'look', expected: 0, mobile: true },
    { route: 'pass', expected: 1, history: true }, { route: 'pass-ignore', expected: 1 },
    { route: 'key', expected: 0, quiet: true }, { route: 'key', expected: 2, rejectAudio: true },
    { route: 'pass', expected: 0, quiet: true },
  ]) {
    const { context, page } = await open('c2n5', 'c2n5_hub', { ...config, flags: { data_hook: true, c2_terminal_stopped: true,
      ...(config.history ? { c2_terminal_n3_unplugged: true } : {}) } })
    const visited = []
    await chooseNext(page, 'c2n5_e1')
    await reloadOnce(page, `night5 ${config.route} AP`)
    await chooseNext(page, config.route === 'key' ? 'c2n5_terminal_key' : config.route === 'look' ? 'c2n5_terminal_screen' : 'c2n5_terminal_pass_alarm')
    await walk(page, 'c2n5_e2', (id, step) => {
      if (id === 'c2n5_terminal_turn_q') return config.route === 'pass-ignore' ? 1 : 0
      return step.choices?.findIndex(choice => choice.next === 'c2n5_terminal_save') ?? 0
    }, async (id, step) => {
      visited.push(id)
      if (CH2_TERMINAL_CUES[id]) {
        await page.waitForFunction(id => !!JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).flags[`c2_terminal_sound_${id}`], id)
        await reloadOnce(page, `${id} sound consumed`)
        await page.evaluate(() => { window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')) })
      }
      if (id === 'c2n5_terminal_screen') {
        await page.locator('[data-ch2-terminal-panel="receipt"]').waitFor()
        await page.getByText('试运行记录 · 17:42', { exact: true }).waitFor()
        await page.getByText('接收端：代号待核实', { exact: true }).waitFor()
        await imageLoaded(page, step.image)
        await layout(page)
        if (config.mobile) {
          const soundToggle = page.getByRole('button', { name: '盒子音效静音', exact: true })
          await soundToggle.click(); assert.equal(await soundToggle.getAttribute('aria-pressed'), 'true')
          await soundToggle.click(); assert.equal(await soundToggle.getAttribute('aria-pressed'), 'false')
          await page.screenshot({ path: resolve(output, '390-terminal-receipt.png') })
        }
      }
      if (id === 'c2n5_terminal_save') await reloadOnce(page, 'saved terminal receipt')
    })
    assert.equal((await calls(page)).length, config.expected, JSON.stringify(config))
    const f = (await read(page)).flags
    assert.equal(!!f.c2_terminal_receipt_saved, config.route !== 'pass-ignore')
    assert.equal(!!f.c2_terminal_receipt_seen, config.route !== 'pass-ignore')
    assert.equal(!!f.c2_terminal_voice_heard, config.route === 'key')
    assert.equal(visited.includes('c2n5_terminal_screen_history'), !!config.history)
    if (config.route.startsWith('pass')) assert.equal((await calls(page)).filter(src => src.includes('_receipt_')).length, 0, 'walking past may alarm, never spontaneously reads the receipt aloud')
    await unchangedRewards(page, 2)
    if (config.mobile) await manual(page, ['终端本地旧回执'], '390-terminal-evidence.png')
    await close(context)
  }
  passed('Night5: maintenance/read-only/pass/look-back/pass-ignore, one AP; passing only alarms, key alone reads receipt; persistent per-node cue flags; reload/focus no replay; mute skips playback, rejected audio never locks; truthful trial-period receipt/history, 390px controls and closable book/manual.')
  assert.deepEqual(errors, [], 'browser page errors')
  writeFileSync(resolve(output, 'results.json'), JSON.stringify({ passed: report, pageErrors: errors, when: new Date().toISOString() }, null, 2))
} catch (error) {
  for (const context of active) {
    for (const page of context.pages()) {
      await page.screenshot({ path: resolve(output, 'failure.png') }).catch(() => {})
      writeFileSync(resolve(output, 'failure-state.json'), JSON.stringify(await read(page).catch(() => ({})), null, 2))
    }
  }
  throw error
} finally { await browser.close() }
