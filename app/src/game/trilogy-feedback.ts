import type { GameState } from './types'
import type { TrilogyId } from './trilogy-types'
import { statChanges, type StatNotice } from './stat-feedback'

/** Chapters 1/2 keep their original feedback. New chapters reserve the same
 * visible notice for real purchases/gifts/growth, not every exploration point. */
export function trilogyVisibleChanges(before: GameState, after: GameState, id: TrilogyId): StatNotice['changes'] {
  const prior = before.dlc?.[id]?.chapter, next = after.dlc?.[id]?.chapter
  if (!prior || !next) return []
  if (prior.runId !== next.runId || prior.shift !== next.shift) return []
  const checkin = next.applied.some(key => key.startsWith('checkin:') && !prior.applied.includes(key))
  if (checkin) return [] // The existing check-in panel already says +50.
  const changes = statChanges(before, after, true)
  if (changes.length === 1 && changes[0].key === 'ap' && changes[0].amount < 0) return []
  // The complete settlement shows income/current value/net change. Do not
  // throw a second central salary popup over the authored end-of-shift line.
  if (changes.length === 1 && changes[0].key === 'gold' && changes[0].amount > 0
      && next.shop.buyCount === prior.shop.buyCount && !next.quiz && next.stepId !== prior.stepId) return []
  return changes
}
