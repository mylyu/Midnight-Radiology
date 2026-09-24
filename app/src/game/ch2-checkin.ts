import { CH2_SHIFTS } from './ch2'
import { beginCh2Shift, recordCh2Change } from './ch2-ledger'
import { ch2Phase, patchCh2 } from './ch2-session'
import { applyEffect } from './store'
import type { GameState } from './types'

/** Each work shift, not the subsequent morning quiz, has one new timeclock. */
export const CH2_CHECKINS: Record<string, { shift: string; rewardText: string }> = {
  c2n1_1: { shift: 'c2n1', rewardText: '签到后领取本班原有补贴与行动力' },
  c2d2_0: { shift: 'c2d2', rewardText: '白班到岗登记 · 不另外发放补贴' },
  c2n3_1: { shift: 'c2n3', rewardText: '签到后领取本班原有补贴与行动力' },
  c2d4_0: { shift: 'c2d4', rewardText: '白班到岗登记 · 不另外发放补贴' },
  c2n5_1: { shift: 'c2n5', rewardText: '签到后领取本班原有补贴与行动力' },
}

export function ch2CheckinPending(s: GameState, id: string): boolean {
  const config = CH2_CHECKINS[id], p = s.dlc?.ch2
  if (!config || ch2Phase(s) !== 'story' || p?.shift && p.shift !== config.shift) return false
  if (s.flags[`c2_checkin_${config.shift}`]) return false
  // Old saves already applied automatic check-in on entry. Never charge them
  // with repeating the gesture or pay their old stipend again.
  if (p?.appliedSteps?.includes(`ch2-${id}`)) return false
  if (p?.loop?.entries.some(entry => entry.id === `ch2-${id}`)) return false
  if (!p?.appliedSteps && p?.stepId === id) return false
  return true
}

/** Gesture acknowledgement, original effect and receipt are one saved update. */
export function completeCh2Checkin(s: GameState, id: string): GameState {
  if (!ch2CheckinPending(s, id) || s.dlc?.ch2?.stepId !== id) return s
  const config = CH2_CHECKINS[id]
  const original = CH2_SHIFTS.find(shift => shift.id === config.shift)?.steps[id]
  if (!original) return s
  const before = beginCh2Shift(s, config.shift)
  const changed = applyEffect(before, original.effect)
  const key = `ch2-${id}`
  const next = patchCh2({ ...changed, flags: { ...changed.flags, [`c2_checkin_${config.shift}`]: true } }, {
    appliedSteps: [...new Set([...(before.dlc?.ch2?.appliedSteps ?? []), key])],
  })
  return recordCh2Change(before, next, key, '新打卡机 · 滑动签到成功', 'story')
}
