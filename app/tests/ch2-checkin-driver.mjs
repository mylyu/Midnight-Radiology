// Shared UI action for existing story walkers. Never set the receipt flag or
// shorten the interaction from a test: drag the same thumb a player uses.
import assert from 'node:assert/strict'
import { CH2_CHECKINS, ch2CheckinPending } from '../src/game/ch2-checkin.ts'
import { CH2_SHIFTS } from '../src/game/ch2.ts'

export async function swipeCh2Checkin(page, state) {
  const id = state.dlc?.ch2?.stepId
  if (!id || !ch2CheckinPending(state, id)) return false
  const overlay = page.locator('[data-ch2-checkin]')
  await overlay.waitFor({ timeout: 10000 })
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')))
  assert.equal(before.gold, state.gold, 'No auto stipend before the gesture')
  assert.equal(before.ap, state.ap, 'No auto AP before the gesture')
  const thumb = await overlay.locator('[data-ch2-checkin-thumb]').boundingBox()
  const path = await overlay.locator('.ch2-checkin-path').boundingBox()
  assert(thumb && path, 'The real check-in slider must be visible')
  await page.mouse.move(thumb.x + thumb.width / 2, thumb.y + thumb.height / 2)
  await page.mouse.down()
  await page.mouse.move(path.x + path.width - thumb.width / 2, thumb.y + thumb.height / 2, { steps: 12 })
  await page.mouse.up()
  await overlay.waitFor({ state: 'detached' })
  const { shift } = CH2_CHECKINS[id]
  await page.waitForFunction(flag => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')).flags[flag], `c2_checkin_${shift}`)
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('midnight-radiology-save-v1')))
  const effect = CH2_SHIFTS.find(row => row.id === shift).steps[id].effect
  assert.equal(after.gold, before.gold + (effect?.gold ?? 0))
  assert.equal(after.ap, before.ap + (effect?.ap ?? 0))
  assert.equal(after.dlc.ch2.loop.entries.filter(row => row.id === `ch2-${id}`).length, 1)
  assert.equal(after.dlc.ch2.stepId, id, 'A swipe acknowledges check-in, never skips the following dialogue')
  return true
}
