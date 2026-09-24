import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { CH2_SHIFTS, ch2StepForState } from '../src/game/ch2.ts'
import { CH2_ARCHIVE_RETURN_STEPS, ch2ArchiveExplorationClosed, ch2ArchiveReturnStep } from '../src/game/ch2-exploration.ts'
import { applyEffect, condOk, freshState } from '../src/game/store.ts'
import { buyCh2Item, ch2ItemUnavailable } from '../src/game/ch2-session.ts'
import { SHOP_ITEMS } from '../src/game/data.ts'

const shift = CH2_SHIFTS.find(row => row.id === 'c2n5')
const nodes = shift.steps
const RETURN = 'c2n5_key_return0'
const archiveFlags = { c2n5_cabinet: true, c2_payoff_model: true, old_register: true, nameless_films: true, zhou_handover: true }
const archiveLedger = ['c2n5_a5', 'c2n5_a7', 'c2n5_a8', 'c2n5_a9', 'c2n5_a10'].map(id => `ch2-${id}`)
const clone = value => JSON.parse(JSON.stringify(value))
function fixture(id = 'c2n5_hub', patch = {}, progress = {}) {
  return { ...freshState('f'), gold: 800, ap: 0, night: 5, finished: true, seed: 12345,
    flags: { ...archiveFlags }, items: ['key', 'book'], badges: ['fixer'], cards: ['ct_intro'], events: ['ch2_cabinet'],
    screenHint: 'chapterEnd', stepId: 'n5_end', resumeKey: '5-n5_end', buyCount: 12, ...patch,
    dlc: { dr: { done: true }, dsa: { done: true, dose: 42 }, ch2: {
      shift: 'c2n5', stepId: id, phase: 'story', appliedSteps: [...archiveLedger], ...progress,
    } } }
}
const metrics = s => Object.fromEntries(['gold', 'ap', 'skill', 'heart', 'wealth', 'durability', 'items', 'badges', 'cards', 'events', 'stamps'].map(key => [key, s[key]]))
const withKeyBadge = snapshot => ({ ...snapshot, badges: snapshot.badges.includes('c2_brass_key')
  ? snapshot.badges : [...snapshot.badges, 'c2_brass_key'] })
const protectedState = s => ({ night: s.night, finished: s.finished, stepId: s.stepId, resumeKey: s.resumeKey,
  screenHint: s.screenHint, buyCount: s.buyCount, dr: s.dlc.dr, dsa: s.dlc.dsa })
const render = (id, s) => ch2StepForState(id, nodes[id], s)
const available = s => render('c2n5_hub', s).choices.filter(choice => condOk(s, choice.cond))
const returnChoice = s => available(s).find(choice => choice.next === RETURN)
function enter(s, id) {
  const p = s.dlc.ch2
  let next = { ...s, dlc: { ...s.dlc, ch2: { ...p, stepId: id } } }
  const step = render(id, next), key = `ch2-${id}`
  if (!(p.appliedSteps ?? []).includes(key)) next = applyEffect(next, step.effect)
  if (step.event && !next.events.includes(step.event)) next = { ...next, events: [...next.events, step.event] }
  return clone({ ...next, dlc: { ...next.dlc, ch2: { ...next.dlc.ch2,
    appliedSteps: [...new Set([...(p.appliedSteps ?? []), key])],
  } } })
}
function walk(s, start, stop = 'c2n5_hub') {
  const visits = []
  let id = start
  for (let count = 0; id !== stop && count < 30; count++) {
    visits.push(id)
    s = enter(s, id)
    const step = render(id, s)
    assert(!step.choices, `${id}: expected a short linear return`)
    id = step.next
    assert(nodes[id], `${id}: registered destination`)
  }
  assert.equal(id, stop)
  return { state: enter(s, stop), visits }
}

for (const [id, step] of Object.entries(CH2_ARCHIVE_RETURN_STEPS)) {
  assert.equal(nodes[id], step, `${id}: registered in the live fifth-night graph`)
  assert.equal(step.effect?.ap, undefined)
  assert.equal(step.event, undefined)
  assert.equal(step.card, undefined)
  assert.equal(step.effect?.loseItem, undefined)
  if (step.effect) assert.deepEqual(step.effect, { flag: 'c2_payoff_base' })
}
for (const id of ['c2n5_k1', RETURN]) assert.deepEqual(render(id, fixture(id)).effect,
  { flag: 'c2_payoff_base', badge: 'c2_brass_key' }, `${id}: the only receipt reward is the new, specific brass-key badge`)

// Reproduce the original ordering: skip the brass key at a6, finish the entire
// archive handover, then return later for the separate, unfinished small cabinet.
const atChoice = fixture('c2n5_a6', { flags: { c2_payoff_model: true }, events: [] }, { appliedSteps: [] })
const originalBranch = render('c2n5_a6', atChoice).choices.find(choice => choice.next === 'c2n5_a7')
assert(originalBranch)
const postponed = walk(atChoice, originalBranch.next).state
assert(postponed.flags.c2n5_cabinet)
assert.equal(postponed.flags.c2_payoff_base, undefined)
assert(returnChoice(postponed), 'Skipping the key once must not permanently hide its unfinished use')
assert(!available(postponed).some(choice => choice.next === 'c2n5_a1'), 'Completed archive handover stays hidden')
const before = metrics(postponed), protectedBefore = protectedState(postponed)
const revisit = walk(postponed, returnChoice(postponed).next)
assert.deepEqual(revisit.visits, [RETURN, 'c2n5_key_return1'])
assert(revisit.state.flags.c2_payoff_base)
assert.deepEqual(metrics(revisit.state), withKeyBadge(before), 'Only the new brass-key badge is added; no AP cost or repeated archive rewards/events')
assert.deepEqual(protectedState(revisit.state), protectedBefore)
assert.equal(returnChoice(revisit.state), undefined, 'A finished small cabinet is never offered again')
const reentered = enter(revisit.state, RETURN)
assert.deepEqual(enter(reentered, RETURN), reentered, 'Re-entering the saved receipt node changes nothing twice')
assert.deepEqual(metrics(reentered), withKeyBadge(before))

// Taking the brass-key branch immediately still follows the original handover.
const immediate = walk(atChoice, 'c2n5_k1')
assert.deepEqual(immediate.visits, ['c2n5_k1', 'c2n5_k2', 'c2n5_a7', 'c2n5_a8', 'c2n5_a9', 'c2n5_a10'])
assert(immediate.state.flags.c2_payoff_base)
assert.equal(immediate.state.badges.filter(id => id === 'c2_brass_key').length, 1)
assert.equal(returnChoice(immediate.state), undefined)

for (const ap of [0, 3]) {
  const state = fixture('c2n5_hub', { ap })
  assert(returnChoice(state))
  assert.equal(returnChoice(state).cond.ap, undefined)
  const once = render('c2n5_hub', state)
  assert.deepEqual(ch2ArchiveReturnStep('c2n5_hub', once, state), once, 'Repeated renders do not duplicate the return option')
}
const noKey = fixture('c2n5_hub', { items: ['book'] })
assert.equal(returnChoice(noKey), undefined)
assert.equal(ch2ItemUnavailable(noKey, 'key'), undefined, 'A finished main archive does not end key sales before clinical work')
const bought = buyCh2Item(noKey, 'key').state
assert.equal(bought.gold, noKey.gold - SHOP_ITEMS.find(item => item.id === 'key').price)
assert.equal(bought.ap, 0)
assert(returnChoice(bought))
assert.equal(buyCh2Item(bought, 'key').state, bought, 'Owned keys cannot be bought twice')
assert.deepEqual(walk(bought, RETURN).state.items, bought.items, 'Using the brass key preserves inventory')
assert.equal(render(RETURN, noKey).effect, undefined, 'A stale direct destination cannot grant a base without the key')
assert.equal(render(RETURN, noKey).next, 'c2n5_hub')
assert.equal(returnChoice(fixture('c2n5_hub', { flags: {} })), undefined, 'Finish the original handover first')

// Legacy saves have no phase/ledger and may have visited the pre-payoff k1.
// They may finish the missing use, but are not silently given a model or new history.
for (const withLedger of [false, true]) {
  const legacy = fixture('c2n5_hub', { flags: { c2n5_cabinet: true, old_photo: true } }, {
    phase: undefined, appliedSteps: withLedger ? ['ch2-c2n5_k1', 'ch2-c2n5_k2', ...archiveLedger] : undefined,
  })
  const original = structuredClone(legacy)
  assert(returnChoice(legacy))
  const done = walk(legacy, RETURN).state
  assert(done.flags.c2_payoff_base)
  assert.equal(done.flags.c2_payoff_model, undefined)
  assert.equal(done.flags.old_photo, true)
  assert.deepEqual(metrics(done), withKeyBadge(metrics(original)))
  assert.equal(render('c2n5_key_return1', done).image, 'ch2_model_base_v1', 'Old saves without a model do not show an invented assembly')
  assert.deepEqual(legacy, original, 'Resolving the menu never mutates the save')
}

for (const id of ['c2n5_needle_short0', 'c2n5_m0', 'c2n5_m8', 'c2n5_child_scan', 'c2n5_n6', 'c2n5_p2a', 'c2n5_phone_break', 'c2n5_sms_after', 'c2n5_g0']) {
  const clinical = fixture(id, { items: [] }, { phase: undefined, appliedSteps: undefined })
  const frozen = structuredClone(clinical)
  assert(ch2ArchiveExplorationClosed(clinical), `${id}: legacy cursor closes the opportunity`)
  assert.match(ch2ItemUnavailable(clinical, 'key'), /已结束/)
  assert.equal(returnChoice({ ...clinical, items: ['key'] }), undefined)
  if (nodes[id]) assert.equal(ch2ArchiveReturnStep(id, nodes[id], clinical), nodes[id], `${id}: no clinical-step redirect`)
  assert.deepEqual(clinical, frozen)
}
const crossed = fixture('c2n5_hub', { items: [] }, { appliedSteps: ['ch2-c2n5_m0'] })
assert.match(ch2ItemUnavailable(crossed, 'key'), /已结束/, 'The ledger closes a stale hub cursor after clinical entry')
assert.equal(returnChoice({ ...crossed, items: ['key'] }), undefined)
for (const progress of [{ phase: 'settle' }, { shift: 'c2am', stepId: 'c2am_0' }, { done: true }, { phase: 'done' }]) {
  const late = fixture('c2n5_hub', { items: [] }, progress)
  assert(ch2ItemUnavailable(late, 'key'))
  assert.equal(returnChoice({ ...late, items: ['key'] }), undefined)
}
assert.match(ch2ItemUnavailable(fixture('c2n5_hub', { items: [], flags: { ...archiveFlags, c2_payoff_base: true } }), 'key'), /已结束/)
console.log('PASS: key order, dedicated return, zero AP, inventory, late purchase, legacy ledger, clinical/settlement/completed boundaries.')

if (process.argv.includes('--browser')) {
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const errors = []
  const read = page => page.evaluate(() => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')))
  const baseURL = (process.env.GAME_URL || 'http://127.0.0.1:8798/').replace(/\/$/, '') + '/#/ch2'
  const clean = text => (text ?? '').replaceAll('**', '')
  async function open(save, mobile = false) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 } })
    await context.addInitScript(s => {
      localStorage.setItem('mr-ch2-unlock', '1')
      sessionStorage.setItem('mr-rotate-dismissed', '1')
      if (!localStorage.getItem('midnight-radiology-save-v1')) localStorage.setItem('midnight-radiology-save-v1', JSON.stringify(s))
      HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('Fixture audio denied', 'NotAllowedError'))
    }, save)
    const page = await context.newPage()
    page.setDefaultTimeout(10000)
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(baseURL)
    if (save.dlc.ch2.done) await page.locator('[data-ch2-complete="true"]').waitFor()
    else await page.locator(`[data-ch2-step="${save.dlc.ch2.stepId}"]`).waitFor()
    return { page, context }
  }
  async function reveal(page) {
    const s = await read(page), id = s.dlc.ch2.stepId, step = render(id, s)
    const expected = clean(step.text).replaceAll('行动力⚡×3', `行动力⚡×${s.ap}`)
    const text = page.locator('.dialog-box > p')
    if (await text.textContent() !== expected) await text.click()
    await page.waitForFunction(value => document.querySelector('.dialog-box > p')?.textContent === value, expected)
    return { s, id, step }
  }
  async function advance(page, target) {
    const { s, id, step } = await reveal(page)
    if (step.choices) {
      const choice = step.choices.find(c => c.next === target && condOk(s, c.cond))
      assert(choice, `${id}: visible ${target}`)
      await page.locator('.choice-in').getByRole('button', { name: clean(choice.text), exact: true }).click()
    } else {
      assert.equal(step.next, target)
      await page.locator('.dialog-box > span.animate-bounce').waitFor()
      await page.locator('.dialog-box > p').click()
    }
    if (!target.startsWith('@')) await page.locator(`[data-ch2-step="${target}"]`).waitFor()
  }
  async function refresh(page) {
    const before = await read(page)
    await page.reload()
    await page.locator(`[data-ch2-step="${before.dlc.ch2.stepId}"]`).waitFor()
    const after = await read(page)
    assert.deepEqual(metrics(after), metrics(before), 'Refresh does not repeat rewards or consume the key')
    assert.deepEqual(after.flags, before.flags)
    assert.deepEqual(after.dlc.ch2.appliedSteps, before.dlc.ch2.appliedSteps)
    assert.equal(after.dlc.ch2.stepId, before.dlc.ch2.stepId)
  }
  try {
    const desktop = await open({ ...atChoice, ap: 1 })
    await advance(desktop.page, 'c2n5_a7')
    for (const target of ['c2n5_a8', 'c2n5_a9', 'c2n5_a10', 'c2n5_hub']) await advance(desktop.page, target)
    // Spend the last AP on another existing activity before returning to the key.
    await advance(desktop.page, 'c2n5_b1')
    await advance(desktop.page, 'c2n5_b2')
    await advance(desktop.page, 'c2n5_hub')
    await refresh(desktop.page)
    const beforeReturn = await read(desktop.page)
    assert.equal(beforeReturn.ap, 0)
    await advance(desktop.page, RETURN)
    await refresh(desktop.page)
    await advance(desktop.page, 'c2n5_key_return1')
    await refresh(desktop.page)
    await advance(desktop.page, 'c2n5_hub')
    await reveal(desktop.page)
    const afterReturn = await read(desktop.page)
    assert(afterReturn.flags.c2_payoff_base)
    assert.deepEqual(metrics(afterReturn), withKeyBadge(metrics(beforeReturn)))
    assert(!returnChoice(afterReturn))
    assert.equal(await desktop.page.getByRole('button', { name: /回旧片库/ }).count(), 0)
    await desktop.context.close()

    const mobile = await open(noKey, true)
    await advance(mobile.page, '@shop')
    const purchase = mobile.page.getByRole('button', { name: '购买黄铜钥匙', exact: true })
    assert(await purchase.isEnabled())
    await purchase.click()
    await mobile.page.getByRole('button', { name: '离开小卖部', exact: true }).click()
    await refresh(mobile.page)
    const boughtInBrowser = await read(mobile.page)
    assert.equal(boughtInBrowser.gold, noKey.gold - 120)
    assert.equal(boughtInBrowser.ap, 0)
    await advance(mobile.page, RETURN)
    await refresh(mobile.page)
    await advance(mobile.page, 'c2n5_key_return1')
    await advance(mobile.page, 'c2n5_hub')
    assert.deepEqual(metrics(await read(mobile.page)), withKeyBadge(metrics(boughtInBrowser)))
    assert(await mobile.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await mobile.context.close()

    for (const legacy of [fixture('c2n5_hub', { flags: { c2n5_cabinet: true, old_photo: true } }, { phase: undefined, appliedSteps: ['ch2-c2n5_k1', 'ch2-c2n5_k2'] }),
      fixture('c2n5_hub', { flags: { c2n5_cabinet: true } }, { phase: undefined, appliedSteps: undefined })]) {
      const { page, context } = await open(legacy)
      await advance(page, RETURN)
      await refresh(page)
      assert.equal((await read(page)).flags.c2_payoff_base, true)
      assert.equal((await read(page)).flags.c2_payoff_model, undefined)
      await advance(page, 'c2n5_key_return1')
      await advance(page, 'c2n5_hub')
      assert.deepEqual(metrics(await read(page)), withKeyBadge(metrics(legacy)))
      await context.close()
    }
    for (const save of [fixture('c2n5_m8', {}, { phase: undefined, appliedSteps: undefined }),
      fixture('c2am_9', {}, { shift: 'c2am', done: true, phase: undefined, appliedSteps: undefined })]) {
      const { page, context } = await open(save)
      assert.equal((await read(page)).dlc.ch2.stepId, save.dlc.ch2.stepId)
      assert.equal((await read(page)).flags.c2_payoff_base, undefined)
      assert.equal(await page.getByRole('button', { name: /回旧片库/ }).count(), 0)
      await page.reload()
      if (save.dlc.ch2.done) await page.locator('[data-ch2-complete="true"]').waitFor()
      else await page.locator(`[data-ch2-step="${save.dlc.ch2.stepId}"]`).waitFor()
      assert.equal((await read(page)).dlc.ch2.stepId, save.dlc.ch2.stepId)
      await context.close()
    }
    assert.deepEqual(errors, [])
    console.log('PASS: desktop deferred order after another event, 390px late purchase, zero AP, refresh at both return nodes, old k1 ledger, missing legacy fields, clinical/completed saves stay in place.')
  } finally { await browser.close() }
}
