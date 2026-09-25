import type { GameState } from './types'

export const FEEDBACK_STATS = ['gold', 'skill', 'heart', 'wealth', 'ap', 'durability'] as const
export type FeedbackStat = typeof FEEDBACK_STATS[number]
export const FEEDBACK_NAMES: Record<FeedbackStat, string> = {
  gold: '金币', skill: '医术', heart: '人心', wealth: '家业', ap: '行动力', durability: '耐久',
}
export interface StatNotice {
  id: number
  createdAt: number
  context: string
  expiresAt: number
  reason: string
  changes: { key: FeedbackStat; amount: number }[]
}

/** A choice save and the ensuing node-entry save belong to one gesture. Merge
 * only their presentation, never their transactions, across the same target.
 * A later purchase or another node/chapter always gets its own notice. */
export function appendStatNotice(rows: StatNotice[], notice: StatNotice): StatNotice[] {
  const last = rows.at(-1)
  if (last && last.context === notice.context && notice.createdAt >= last.createdAt
      && notice.createdAt - last.createdAt <= 100) {
    const changes = FEEDBACK_STATS.map(key => ({ key, amount:
      (last.changes.find(row => row.key === key)?.amount ?? 0) +
      (notice.changes.find(row => row.key === key)?.amount ?? 0),
    })).filter(row => row.amount !== 0)
    return changes.length ? [...rows.slice(0, -1), { ...last, changes }].slice(-3) : rows.slice(0, -1)
  }
  return [...rows, notice].slice(-3)
}

/** Compare committed values, not promised effects (gold/AP/durability can clamp). */
export function statChanges(before: GameState, after: GameState, chapter2 = false): StatNotice['changes'] {
  return FEEDBACK_STATS.filter(key => !chapter2 || key !== 'durability')
    .map(key => ({ key, amount: after[key] - before[key] })).filter(row => row.amount !== 0)
}

/** Entry dialogue can contain an unrevealed answer: never echo it in a toast. */
export function statChangeReason(before: GameState, after: GameState): string {
  const oldEntries = new Set(before.dlc?.ch2?.loop?.entries.map(row => row.id))
  const entries = after.dlc?.ch2?.loop?.entries.filter(row => !oldEntries.has(row.id) &&
    Object.values(row.delta).some(value => value !== 0)) ?? []
  if (entries.length) {
    const row = entries.at(-1)!
    if (row.id.startsWith('buy:')) return '小卖部购物'
    if (row.id.startsWith('gift:')) return '同事间的心意'
    if (row.id.startsWith('observe:')) return '影像观察'
    if (row.id.startsWith('quiz:')) return '晨会考核'
    if (row.id.startsWith('coffee:')) return '喝掉留好的咖啡'
    if (row.id.startsWith('choice:')) return '这次选择'
    if (row.id.includes('wealth')) return '物品与设备管理'
    if (row.id.includes('coffee') || row.id.includes('suppl')) return '省下一点行动力'
    if (after.gold > before.gold && entries.some(e => /交班|结算|收入/.test(e.label))) return '本班收入'
    return '本班进展'
  }
  if (after.lastCheckin !== before.lastCheckin) return '每日打卡'
  if (after.buyCount !== before.buyCount) return '小卖部购物'
  if (before.screenHint === 'day' && after.screenHint === 'day' && after.durability > before.durability
      && after.gold - before.gold === -50 && after.wealth - before.wealth === 1) return '保养老伙计'
  if (Object.keys(after.flags).some(key => /^book_read_n/.test(key) && !before.flags[key])) return '翻到新书页'
  if (after.flags.quiz_grade !== before.flags.quiz_grade) return '晨会考核'
  if (after.stamps.length !== before.stamps.length) return '本夜交班'
  if (after.ap < before.ap && after.gold === before.gold && after.skill === before.skill &&
      after.heart === before.heart && after.wealth === before.wealth) return '行动消耗'
  return '夜班进展'
}
