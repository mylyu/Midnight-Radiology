// Isolated, seeded browser fixtures plus one complete Chapter 2 walk.
// Never reads or changes the player's browser profile; fixtures are not claimed
// as a fresh Chapter 1 playthrough. Existing full-walk assertions are reused intact.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { CH2_SHIFTS, ch2StepForState } from '../src/game/ch2.ts'
import { CH2_PAYOFF_KEEPSAKES } from '../src/game/ch2-payoffs.ts'
import { freshState, condOk } from '../src/game/store.ts'
import { walkChapterTwo } from './ch2-repeat-walk.mjs'
import { logicalImagePath, logicalImageUrl } from './game-delivery-media.mjs'

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const output = resolve(process.env.PAYOFF_OUTPUT || '../../ch2-payoffs-browser-review')
const url = (process.env.GAME_URL || 'http://127.0.0.1:8798/').replace(/\/$/, '') + '/#/ch2'
const errors = [], results = []
mkdirSync(output, { recursive: true })
let activePage
const read = page => page.evaluate(() => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')))
const clean = text => (text ?? '').replaceAll('**', '')
const metrics = s => Object.fromEntries(['gold', 'skill', 'heart', 'wealth', 'ap', 'durability', 'items', 'badges', 'stamps'].map(key => [key, s[key]]))
const withBadges = (snapshot, badges) => ({ ...snapshot, badges: [...new Set([...snapshot.badges, ...badges])] })
const protectedState = s => ({ night: s.night, finished: s.finished, buyCount: s.buyCount,
  lotteryNight: s.lotteryNight, lotteryCount: s.lotteryCount, quiz: s.flags.quiz_grade,
  gifts: Object.fromEntries(['n5_lei', 'n5_qian', 'n5_fan', 'n5_jiang'].map(key => [key, s.flags[key]])),
  dr: s.dlc.dr, dsa: s.dlc.dsa })

function fixture(id, flags = {}, patch = {}) {
  const shift = CH2_SHIFTS.find(row => row.steps[id])
  assert(shift, `New scene must be registered: ${id}`)
  return { ...freshState('f'), night: 5, finished: true, gold: 1500, ap: 0,
    buyCount: 27, lotteryNight: 5, lotteryCount: 3, durability: 76,
    screenHint: 'chapterEnd', stepId: 'n5_end', resumeKey: '5-n5_end',
    flags: { quiz_grade: 'S', ...flags }, ...patch,
    dlc: { dr: { done: true, served: ['ge'] }, dsa: { done: true, dose: 32 },
      ch2: { shift: shift.id, stepId: id, phase: 'story', appliedSteps: [], viewBg: 'bg_ctcontrol' } } }
}

async function open(state, mobile = false) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 } })
  await context.addInitScript(s => {
    localStorage.setItem('mr-ch2-unlock', '1')
    if (!localStorage.getItem('midnight-radiology-save-v1')) localStorage.setItem('midnight-radiology-save-v1', JSON.stringify(s))
  }, state)
  const page = await context.newPage()
  activePage = page
  page.setDefaultTimeout(10000)
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(url)
  await page.locator(`[data-ch2-step="${state.dlc.ch2.stepId}"]`).waitFor()
  return { page, context }
}

async function current(page) {
  const state = await read(page), p = state.dlc.ch2
  const shift = CH2_SHIFTS.find(row => row.id === p.shift)
  const step = ch2StepForState(p.stepId, shift.steps[p.stepId], state)
  assert(step, p.stepId)
  return { state, progress: p, step, id: p.stepId }
}

async function reveal(page) {
  const info = await current(page)
  const expected = clean(info.step.text).replaceAll('行动力⚡×3', `行动力⚡×${info.state.ap}`)
  const text = page.locator('.dialog-box > p')
  if (await text.textContent() !== expected) await text.click()
  await page.waitForFunction(value => document.querySelector('.dialog-box > p')?.textContent === value, expected)
  return info
}

async function advance(page, target) {
  const { id, step, state, progress } = await reveal(page)
  // Reveal and advance are separate accepted gestures under the 300 ms guard.
  await page.waitForTimeout(310)
  if (step.choices) {
    const choice = step.choices.filter(row => condOk(state, row.cond)).find(row => row.next === target)
    assert(choice, `${id}: visible option for ${target}`)
    await page.locator('.choice-in').getByRole('button', { name: clean(choice.text), exact: true }).click()
  } else if (step.end) {
    await page.getByRole('button', { name: /本班结束 · 结算|第二章 · 完 —— 结算/ }).click()
  } else {
    await page.locator('.dialog-box > span.animate-bounce').waitFor()
    await page.locator('.dialog-box > p').click()
  }
  await page.waitForFunction(before => {
    const now = JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2
    return now.stepId !== before.stepId || now.phase !== before.phase || now.done
  }, progress)
  return (await read(page)).dlc.ch2.stepId
}

async function refresh(page, reason) {
  const before = await read(page)
  await page.reload()
  if (before.dlc.ch2.done) await page.locator('[data-ch2-complete="true"]').waitFor()
  else await page.locator(`[data-ch2-step="${before.dlc.ch2.stepId}"]`).waitFor()
  const after = await read(page)
  assert.deepEqual(metrics(after), metrics(before), `${reason}: metrics`)
  assert.deepEqual(after.flags, before.flags, `${reason}: flags`)
  assert.equal(after.dlc.ch2.stepId, before.dlc.ch2.stepId, `${reason}: saved cursor`)
  assert.deepEqual(after.dlc.ch2.appliedSteps, before.dlc.ch2.appliedSteps, `${reason}: no repeated node effect`)
  assert.deepEqual(protectedState(after), protectedState(before), `${reason}: other chapters`)
}

async function layout(page) {
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow')
  for (const button of await page.locator('.choice-in button:visible').all()) {
    await button.scrollIntoViewIfNeeded()
    const bounds = await button.boundingBox()
    assert(bounds.x >= -1 && bounds.x + bounds.width <= page.viewportSize().width + 1, 'Choice fits viewport width')
  }
}

async function imageReady(page, filename) {
  const assetPath = logicalImagePath(filename)
  const expectedURL = logicalImageUrl(filename, page.url())
  const img = page.locator(`img[src$=${JSON.stringify(`/${assetPath}`)}]`).first()
  await img.waitFor()
  await img.evaluate(image => image.decode())
  assert.equal(await img.evaluate(image => image.currentSrc || image.src), expectedURL)
  assert(await img.evaluate(image => image.naturalWidth > 0))
}

async function ending(page, { base, model, glasses, mobile, prefix, callReply }) {
  assert(['c2am_lowdose_meet', 'c2am_lowdose_dinner'].includes(callReply), 'An explicit approved call reply is required')
  const start = await read(page), visited = []
  for (let guard = 0; guard < 12; guard++) {
    const { state, id, step } = await reveal(page)
    if (state.dlc.ch2.done) break
    visited.push(id)
    if (id === 'c2am_payoff_handshake') {
      await imageReady(page, 'ch2_zhou_expert_handshake_v1')
      await layout(page)
      await page.screenshot({ path: resolve(output, `${prefix}-handshake-${mobile ? '390' : 'desktop'}.png`) })
      await refresh(page, 'handshake reload')
    }
    if (id === 'c2am_payoff_q') {
      assert(model, 'Legacy save must not fabricate a model demonstration')
      await imageReady(page, 'ch2_slice_model_v1')
      await page.locator('.choice-in button').first().waitFor()
      const labels = await page.locator('.choice-in button').allTextContents()
      assert.equal(labels.some(text => text.includes('底座')), base)
      await page.screenshot({ path: resolve(output, `${prefix}-demonstration-${mobile ? '390' : 'desktop'}.png`) })
      await advance(page, base ? 'c2am_payoff_rotate' : 'c2am_payoff_layers')
    } else if (id === 'c2am_lowdose_teaser1') {
      assert.deepEqual(step.choices, [
        { text: '「行，我把排班发你。」', next: 'c2am_lowdose_meet' },
        { text: '「聊研究可以，你请饭。」', next: 'c2am_lowdose_dinner' },
      ])
      await layout(page)
      await refresh(page, 'known-caller choice reload')
      await advance(page, callReply)
    } else {
      if (id === 'c2am_payoff_rotate') await imageReady(page, 'ch2_slice_model_assembled_v1')
      if (id === 'c2am_payoff_reply') {
        assert.equal(step.text.includes('报废铅眼镜'), glasses, 'Only an actual Chapter 1 receipt may become the paperweight')
      }
      if (step.end) {
        await advance(page)
        await page.locator('[data-ch2-complete="true"]').waitFor()
        break
      }
      await advance(page)
    }
  }
  const final = await read(page)
  assert(final.dlc.ch2.done)
  assert(final.flags.c2_payoff_expert_done)
  assert.equal(visited.includes('c2am_payoff_rotate'), model && base)
  assert.equal(visited.includes('c2am_payoff_layers'), model && !base)
  assert.deepEqual(visited.slice(-5), ['c2am_payoff_end', 'c2am_lowdose_teaser0', 'c2am_lowdose_teaser1', callReply, 'c2am_lowdose_teaser2'])
  const newTeaching = model && !start.dlc.ch2.statInteractions?.wealthRewards?.includes('teaching')
  const expectedMetrics = withBadges(metrics(start), model ? ['c2_model_demo'] : [])
  expectedMetrics.wealth += newTeaching ? 1 : 0
  assert.deepEqual(metrics(final), expectedMetrics,
    'Only the model badge and approved one-time teaching wealth +1 may change; the call adds no economy or awards')
  assert.deepEqual(final.dlc.ch2.statInteractions?.wealthRewards ?? [],
    [...(start.dlc.ch2.statInteractions?.wealthRewards ?? []), ...(newTeaching ? ['teaching'] : [])],
    'Teaching records once, never once per choice or call reply')
  assert.deepEqual(protectedState(final), protectedState(start))
  await refresh(page, 'completed ending')
  await page.locator('[data-ch2-complete="true"]').waitFor()
  return { final, visited }
}

try {
  // Real browser receipts, not directly seeded keepsake flags.
  const receiptFlags = { n5_lei: true, n5_qian: true, n5_fan: true, n5_jiang: true,
    c2_needle_seen: true, c2_needle_resolved: true, c2_terminal_device_noted: true, c2_apples_shared: true }
  const { context, page } = await open(fixture('c2n5_hub', receiptFlags, { items: ['key'] }))
  const beforeGifts = await read(page)
  for (const [person, flag] of [['luo', 'c2_payoff_luo_gift'], ['lei', 'c2_payoff_lei_gift'], ['jiang', 'c2_payoff_jiang_gift']]) {
    await advance(page, `c2n5_payoff_${person}0`)
    await advance(page)
    await page.waitForFunction(flag => !!JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).flags[flag], flag)
    await refresh(page, `${person} receipt`)
    await advance(page)
    const hub = await reveal(page)
    assert.equal(hub.id, 'c2n5_hub')
    assert(!hub.step.choices.some(choice => choice.next === `c2n5_payoff_${person}0`), 'Completed receipt hidden')
    assert(!await page.locator('.choice-in button').filter({ hasText: person === 'luo' ? '罗阿姨给的' : person === 'lei' ? '晃着一个收纳袋' : '老蒋路过' }).count())
  }
  assert.deepEqual(metrics(await read(page)), metrics(beforeGifts), 'Gifts cost no AP and add no duplicate stats')
  await advance(page, 'c2n5_a1')
  for (let guard = 0; guard < 18; guard++) {
    const { id } = await current(page)
    if (id === 'c2n5_hub') break
    if (id === 'c2n5_a6') await advance(page, 'c2n5_k1')
    else {
      if (id === 'c2n5_k1') { await imageReady(page, 'ch2_model_base_v1'); await refresh(page, 'base receipt') }
      if (id === 'c2n5_k2') await imageReady(page, 'ch2_slice_model_assembled_v1')
      await advance(page)
    }
  }
  const collected = await read(page)
  assert(collected.flags.c2_payoff_model && collected.flags.c2_payoff_base)
  assert.deepEqual(metrics(collected), withBadges(metrics(beforeGifts), ['c2_brass_key']),
    'The brass-key receipt may add only its specific new badge; all original metrics remain frozen')
  assert.deepEqual(protectedState(collected), protectedState(beforeGifts))
  results.push({ fixture: 'real-hub-receipts-and-two-cabinets', gifts: 3, ap: collected.ap, model: true, base: true })
  await context.close()

  const noMemories = await open(fixture('c2n5_hub', { met_lei: true, jiang_friend: true, fan_friend: true,
    qian_helped: true, c2_needle_seen: true, c2_needle_assessed: true }), true)
  const bareHub = await reveal(noMemories.page)
  assert(!bareHub.step.choices.some(choice => /^c2n5_payoff_/.test(choice.next)),
    'Friendship/unresolved old records are not equivalent to received gifts or this chapter assistance')
  assert.equal(await noMemories.page.locator('.choice-in button').filter({ hasText: /罗阿姨给的|晃着一个收纳袋|老蒋路过/ }).count(), 0)
  results.push({ fixture: 'no-fabricated-receipt-or-unresolved-Luo-gift', passed: true })
  await noMemories.context.close()

  // The seventh gallery entry is the existing one-AP meal, earned by its actual
  // receipt node. Its original +1 heart remains separate from the free gifts.
  const mealContext = await open(fixture('c2n5_b1', collected.flags,
    { items: collected.items, badges: collected.badges, ap: 1 }))
  const beforeMeal = await read(mealContext.page)
  assert.equal(beforeMeal.ap, 0, 'Entering the existing meal spends exactly one AP')
  await advance(mealContext.page)
  await mealContext.page.waitForFunction(() => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).flags.c2n5_b)
  await imageReady(mealContext.page, 'item_beef')
  const mealReceived = await read(mealContext.page)
  assert.deepEqual(metrics(mealReceived), { ...metrics(beforeMeal), heart: beforeMeal.heart + 1 })
  await refresh(mealContext.page, 'existing meal receipt')
  await mealContext.context.close()
  results.push({ fixture: 'existing-meal-seventh-keepsake', apCost: 1, originalHeartReward: 1 })

  // Locate the existing dawn cup scene separately; preceding patient cases are
  // exercised by the full walk below, not silently skipped and called a full run.
  const cupContext = await open(fixture('c2n5_g0', mealReceived.flags,
    { items: mealReceived.items, badges: mealReceived.badges }))
  await advance(cupContext.page)
  await cupContext.page.waitForFunction(() => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).flags.c2_payoff_zhou_cup)
  assert.match((await reveal(cupContext.page)).step.text, /杯套/)
  await refresh(cupContext.page, 'existing cup receipt')
  const cupReceived = await read(cupContext.page)
  await cupContext.context.close()

  const endingWith = await open(fixture('c2am_9', cupReceived.flags,
    { items: cupReceived.items, badges: cupReceived.badges }), true)
  const completed = await ending(endingWith.page, { base: true, model: true, glasses: true, mobile: true, prefix: 'owned', callReply: 'c2am_lowdose_meet' })
  await endingWith.page.getByRole('button', { name: '查看背包用途', exact: true }).click()
  const backpack = endingWith.page.getByRole('dialog', { name: '第二章背包' })
  await backpack.waitFor()
  for (const item of CH2_PAYOFF_KEEPSAKES) {
    const card = backpack.locator(`[data-ch2-keepsake="${item.id}"]`)
    await card.waitFor()
    assert((await card.textContent()).includes(item.title))
  }
  assert(await endingWith.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  await endingWith.page.screenshot({ path: resolve(output, 'keepsakes-backpack-390-top.png') })
  await backpack.locator('[data-ch2-keepsake="zhou_cup"]').scrollIntoViewIfNeeded()
  await endingWith.page.screenshot({ path: resolve(output, 'keepsakes-backpack-390-bottom.png') })
  await backpack.getByRole('button', { name: '收好背包', exact: true }).click()
  assert.deepEqual((await read(endingWith.page)).flags, completed.final.flags)
  results.push({ fixture: 'owned-items-next-week', visited: completed.visited, keepsakes: 7, mobile: 390 })
  await endingWith.context.close()

  for (const model of [false, true]) {
    const legacy = await open(fixture('c2am_9', { quiz2_grade: 'A', ...(model ? { c2_payoff_model: true } : {}) }))
    const result = await ending(legacy.page, { base: false, model, glasses: false, mobile: false, prefix: model ? 'model-no-base' : 'legacy-no-receipts',
      callReply: model ? 'c2am_lowdose_meet' : 'c2am_lowdose_dinner' })
    assert.equal(result.final.flags.c2_payoff_base, undefined)
    assert.equal(result.final.flags.n5_fan, undefined)
    assert.equal(result.final.flags.c2_payoff_zhou_cup, undefined)
    results.push({ fixture: model ? 'without-base' : 'legacy-without-receipts', visited: result.visited })
    await legacy.context.close()
  }

  // Two acquisition-to-observation restores demonstrate that the old gift adds
  // an optional hint but never answers the clinical observation automatically.
  for (const notebook of [false, true]) {
    const test = await open(fixture('c2d2_trauma_scan', notebook ? { n5_lei: true } : { met_lei: true }))
    await test.page.locator('.dialog-box > p').click()
    await test.page.locator('.ch2-scan-overlay').waitFor()
    assert.equal(await test.page.getByRole('button', { name: /跳过/ }).count(), 0)
    await test.page.locator('[data-ct-motion-ready="true"]').waitFor()
    await imageReady(test.page, 'ch2_ct_motion_room_v1')
    await imageReady(test.page, 'ch2_ct_motion_bed_v1')
    const geometry = () => test.page.evaluate(() => {
      const bed = document.querySelector('.ch2-ct-sliding-bed')
      const room = document.querySelector('.ch2-ct-fixed-room')
      const matrix = new DOMMatrixReadOnly(getComputedStyle(bed).transform)
      return { x: matrix.m41, y: matrix.m42, scaleX: matrix.m11, scaleY: matrix.m22,
        roomTransform: getComputedStyle(room).transform }
    })
    const firstPosition = await geometry()
    await test.page.waitForTimeout(500)
    const nextPosition = await geometry()
    assert(nextPosition.x > firstPosition.x && nextPosition.y < firstPosition.y, 'The real bundled scanner moves the table into the gantry')
    assert.equal(nextPosition.scaleX, 1); assert.equal(nextPosition.scaleY, 1)
    assert.equal(nextPosition.roomTransform, 'none', 'The room stays fixed')
    await test.page.screenshot({ path: resolve(output, `production-compatible-scan-${notebook ? 'with' : 'without'}-notebook.png`) })
    await test.page.locator('.ch2-scan-overlay').waitFor({ state: 'detached', timeout: 8000 })
    const elapsed = await test.page.evaluate(() => Date.now() - JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).dlc.ch2.scanSessions.c2d2_trauma_scan.startedAt)
    assert(elapsed >= 2900 && elapsed < 6000, `Three-second real scan did not skip or stall: ${elapsed}ms`)
    await test.page.locator(`[data-ch2-step="${notebook ? 'c2d2_payoff_notebook_q' : 'c2d2_t1'}"]`).waitFor()
    if (notebook) {
      await advance(test.page, 'c2d2_payoff_notebook_read')
      await refresh(test.page, 'notebook hint')
      await advance(test.page)
    }
    await test.page.locator('[data-ch2-observation="trauma-sequence-v1"]').waitFor()
    assert.equal((await read(test.page)).dlc.ch2.observations?.['trauma-sequence-v1'], undefined)
    assert.equal(Boolean((await read(test.page)).flags.c2_payoff_notebook_read), notebook)
    results.push({ fixture: 'cross-chapter-notebook', received: notebook, originalObservationStillUnanswered: true,
      movingBed: true, fixedRoom: true, scanElapsedMs: elapsed })
    await test.context.close()
  }

  if (process.env.PAYOFF_FIXTURES_ONLY !== '1') {
    const initial = fixture('c2n1_0', { n5_qian: true, n5_fan: true, n5_lei: true, n5_jiang: true },
      { items: ['key', 'milktea', 'snack', 'book'], seed: 2026092501 })
    const full = await open(initial)
    const result = await walkChapterTwo(full.page, { strategy: 'offline', output: resolve(output, 'complete-chapter'), expectSunrise: true })
    assert(result.final.flags.c2_payoff_model)
    assert(result.final.flags.c2_payoff_model_used || result.final.flags.c2_payoff_base_used)
    assert(result.final.flags.c2_payoff_expert_done)
    for (const [badge, earned] of [
      ['c2_chair_helper', !!result.final.flags.c2_chair_fixed],
      ['c2_brass_key', !!result.final.flags.c2_payoff_base],
      ['c2_model_demo', !!(result.final.flags.c2_payoff_model_used || result.final.flags.c2_payoff_base_used)],
    ]) assert.equal(result.final.badges.filter(id => id === badge).length, earned ? 1 : 0, `${badge}: exactly one badge for its actual use receipt`)
    assert.deepEqual(protectedState(result.final), protectedState(initial))
    results.push({ fullChapter: true, ...result.summary })
    await full.context.close()
  }
  assert.deepEqual(errors, [])
  writeFileSync(resolve(output, 'results.json'), JSON.stringify({ results, errors, fixtureSavesExplicit: true, playerProfileUsed: false, mockedAudio: false }, null, 2))
  console.log(`PASS payoffs browser: ${results.length} scenarios; receipts/reloads, legacy memories, conditional model use, mobile keepsake review and completed ending. Full walk: ${process.env.PAYOFF_FIXTURES_ONLY !== '1'}.`)
} catch (error) {
  if (activePage && !activePage.isClosed()) {
    await activePage.screenshot({ path: resolve(output, 'failure.png') }).catch(() => {})
    writeFileSync(resolve(output, 'failure-state.json'), JSON.stringify(await read(activePage), null, 2))
  }
  writeFileSync(resolve(output, 'failure.json'), JSON.stringify({ message: error.message, stack: error.stack, errors, results }, null, 2))
  throw error
} finally { await browser.close() }
