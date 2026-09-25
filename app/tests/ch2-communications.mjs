// Targeted cue/UI checks in disposable saves; playback calls are not human audition.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { CH2_SHIFTS } from '../src/game/ch2.ts'
import { CH2_COMMUNICATIONS as events, CH2_COMMUNICATION_AUDIO as sounds, ch2CommunicationHeardKey } from '../src/game/ch2-communications.ts'
import { restartCh2 } from '../src/game/ch2-exploration.ts'
import { freshState } from '../src/game/store.ts'
import { awaitChapterEntry } from './chapter-entry-driver.mjs'
import { resolveMediaIdentities } from './media-identity-driver.mjs'
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const base = process.env.GAME_URL || 'http://127.0.0.1:8798/'
const key = 'midnight-radiology-save-v1'
const manifest = JSON.parse(readFileSync(new URL('../src/lib/media-manifest.generated.json', import.meta.url)))
const all = Object.assign({}, ...CH2_SHIFTS.map(s => s.steps))
for (const [id, event] of Object.entries(events)) {
  assert(all[id], id)
  assert(!all[id].phone, `${id}: no duplicate old phone card`)
  if (event.cue) {
    assert(!all[id].sfx && !all[id].sfx2, `${id}: no overlapping authored sound`)
    assert(JSON.stringify(manifest.chapters.ch2).includes(sounds[event.cue]), `${id}: cue preloaded`)
  }
}
for (const id of ['c2n1_2', 'c2n3_chat_sign2', 'c2am_lowdose_teaser2', 'c2n5_g0']) assert(!events[id], `${id}: no cue for a memory or ended call`)
assert(!events.c2n5_sms_reply.cue && !events.c2n5_sms_after.cue)
assert.notEqual(sounds.call, sounds.message)
const replay = restartCh2({ ...freshState('m'), flags: { [ch2CommunicationHeardKey('c2n5_n6')]: true, n5_lei: true } })
assert(!replay.flags[ch2CommunicationHeardKey('c2n5_n6')]); assert(replay.flags.n5_lei)
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const errors = []
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
await context.addInitScript(() => {
  localStorage.setItem('mr-ch2-unlock', '1'); sessionStorage.setItem('mr-rotate-dismissed', '1')
  window.__plays = []; window.__pauses = []; window.__traces = []
  HTMLMediaElement.prototype.play = function () {
    window.__plays.push(this.src)
    window.__traces.push(new Error().stack)
    return localStorage.getItem('test-reject-audio') ? Promise.reject(new DOMException('Blocked', 'NotAllowedError')) : Promise.resolve()
  }
  HTMLMediaElement.prototype.pause = function () { window.__pauses.push(this.src) }
})
const page = await context.newPage(); page.setDefaultTimeout(15000)
page.on('pageerror', e => errors.push(e.message))
async function restore(id, { muted = false, reject = false, checkin = false } = {}) {
  await context.setOffline(false)
  const shift = CH2_SHIFTS.find(s => s.steps[id]).id
  const state = { ...freshState('m'), night: 5, finished: true, stepId: 'n5_end', screenHint: 'chapterEnd',
    dlc: { ch2: { shift, stepId: id, phase: 'story', viewBg: 'bg_ctcontrol', appliedSteps: checkin ? [] : [`ch2-${id}`] } } }
  await page.evaluate(({ key, state, muted, reject }) => {
    localStorage.setItem(key, JSON.stringify(state))
    localStorage.setItem('midnight-radiology-ch2-communications-muted-v1', muted ? '1' : '0')
    if (reject) localStorage.setItem('test-reject-audio', '1'); else localStorage.removeItem('test-reject-audio')
  }, { key, state, muted, reject })
  await page.goto(base + `?cue-test=${id}-${Date.now()}#/ch2`); await awaitChapterEntry(page)
  await page.locator(`[data-ch2-step="${id}"]`).waitFor()
}
async function count(path) {
  return (await resolveMediaIdentities(page, await page.evaluate(() => window.__plays))).filter(row => row.paths.includes(path)).length
}
async function heard(id) {
  await page.waitForFunction(({ key, flag }) => JSON.parse(localStorage.getItem(key)).flags[flag], { key, flag: ch2CommunicationHeardKey(id) })
}
async function next(id) {
  await page.locator('.dialog-box > span.animate-bounce').waitFor(); await page.waitForTimeout(350)
  await page.locator('.dialog-box > p').click(); await page.locator(`[data-ch2-step="${id}"]`).waitFor()
}
try {
  await page.goto(base)
  await restore('c2am_lowdose_teaser0'); await heard('c2am_lowdose_teaser0')
  const initialCalls = await count(sounds.call)
  if (initialCalls !== 1) console.log('Unexpected call attempts', await page.evaluate(() => ({ plays: window.__plays, pauses: window.__pauses, traces: window.__traces, step: document.querySelector('[data-ch2-step]')?.getAttribute('data-ch2-step') })))
  assert.equal(initialCalls, 1)
  await next('c2am_lowdose_teaser1')
  assert.equal(await count(sounds.call), 1, 'No repeated ring during conversation')
  assert((await page.evaluate(() => window.__pauses)).length > 0, 'Stops on scene exit')
  assert.match(await page.locator('[data-ch2-communication]').innerText(), /陆舟.*\n手机 · 通话中/)
  await restore('c2n5_n6'); await heard('c2n5_n6')
  assert.equal(await count(sounds.message), 1)
  await page.locator('[data-dialogue-choice]').first().waitFor()
  const card = await page.locator('[data-ch2-communication]').boundingBox()
  const dialog = await page.locator('.dialog-wrap').boundingBox()
  assert(card.x >= 0 && card.x + card.width <= 390 && card.y >= 88 && card.y + card.height < dialog.y)
  await page.screenshot({ path: '../../ch2-phone-message-review.png' })
  await page.reload(); await awaitChapterEntry(page)
  assert.equal(await count(sounds.message), 0, 'Refresh never replays received SMS')
  await context.setOffline(true)
  const save = page.getByRole('button', { name: '保存短信，问小雷认不认识这个号码', exact: true })
  await save.waitFor(); await page.waitForTimeout(350); await save.click()
  await page.locator('[data-ch2-step="c2n5_sms_save"]').waitFor()
  assert.equal(await count(sounds.message), 0, 'Sending is silent')
  await next('c2n5_sms_lei_pending'); await heard('c2n5_sms_lei_pending')
  assert.equal(await count(sounds.message), 1, 'Reply uses preloaded Blob while offline')
  assert.equal(await page.locator('.sprite-l,.sprite-r').count(), 0, 'Remote sender stays off stage')
  await next('c2n5_g0'); assert.equal(await page.locator('[data-ch2-communication]').count(), 0)
  await restore('c2n3_terminal_wait'); await heard('c2n3_terminal_wait')
  assert.equal(await count(sounds.landline), 1)
  await next('c2n3_terminal_call'); assert.match(await page.locator('[data-ch2-communication]').innerText(), /院内座机/)
  assert.equal(await count(sounds.landline), 1)
  await restore('c2n3_k3', { muted: true }); await heard('c2n3_k3')
  assert.equal(await count(sounds.call), 0)
  await page.getByRole('button', { name: '通信提示音静音' }).click()
  assert.equal(await count(sounds.call), 0, 'Unmuting does not replay late')
  await restore('c2n5_phone_break', { reject: true }); await heard('c2n5_phone_break')
  await next('c2n5_n6'); await heard('c2n5_n6') // Rejected sound never locks progression.
  await restore('c2d4_0', { checkin: true })
  await page.getByRole('slider').waitFor()
  assert.equal(await page.locator('[data-ch2-communication]').count(), 0, 'No premature phone event behind check-in')
  assert.equal(await count(sounds.landline), 0)
  await page.getByRole('slider').press('End'); await page.getByRole('slider').press('Enter')
  await heard('c2d4_0'); assert.equal(await count(sounds.landline), 1)
  await page.setViewportSize({ width: 1365, height: 900 }); await restore('c2am_terminal_sms')
  await heard('c2am_terminal_sms'); assert.match(await page.locator('[data-ch2-communication]').innerText(), /陌生号码/)
  await page.screenshot({ path: '../../ch2-phone-desktop-review.png' })
  assert.deepEqual(errors, [])
  console.log(`PASS ${Object.keys(events).length} mappings; call/SMS/landline; refresh, offline, mute, blocked playback, check-in and replay reset; mobile/desktop`)
} finally { await browser.close() }
