import type { Ch2LedgerEntry, Ch2LedgerSnapshot, Ch2LoopProgress, GameState } from './types'

export const CH2_STAT_KEYS = ['gold', 'skill', 'heart', 'wealth'] as const
export const CH2_STAT_NAMES = { gold: '金币', skill: '医术', heart: '人心', wealth: '家业', ap: '行动力' } as const

/** Completion receipts use the existing final handover nodes, never an answer-revealing image title. */
export const CH2_CASE_COMPLETIONS: Record<string, string> = {
  c2n1_d4: '坠床老人 · 首次头颅检查已交接',
  c2n1_p6: '腹痛结石 · 图像与报告已送回急诊',
  c2d2_7: '肺结节复查 · 薄层图像已留存',
  c2d2_10: '腹痛患者 · 窗口调整与检查交接',
  c2d2_t2: '多发伤 · 完整头腹序列已交接',
  c2d2_w2ok: '手腕摔伤 · 骨窗与相邻层面已留存',
  c2n3_m13: '卒中绿道 · 图像和转运已接上',
  c2n3_h6: '冠脉CTA · 心内科接收完整序列',
  c2n3_x9: '神秘病人 · 头颅报告交回门诊',
  c2d4_10: '主动脉夹层 · 图像与专科评估已交接',
  c2d4_m4: '金属伪影 · 原片及必要范围补扫已交接',
  c2n5_m21: '儿童复查 · 新旧影像留存，转急诊留观',
}

export function ch2Snapshot(s: GameState): Ch2LedgerSnapshot {
  return { gold: s.gold, skill: s.skill, heart: s.heart, wealth: s.wealth, ap: s.ap,
    items: [...s.items], badges: [...s.badges], cards: [...(s.cards ?? [])], events: [...(s.events ?? [])] }
}

function withLoop(s: GameState, loop: Ch2LoopProgress): GameState {
  return { ...s, dlc: { ...s.dlc, ch2: { ...s.dlc?.ch2, loop } } }
}

/** Call before the first step effect. Missing old history is deliberately not reconstructed. */
export function beginCh2Shift(s: GameState, shiftId: string, options: { recovered?: boolean } = {}): GameState {
  const old = s.dlc?.ch2?.loop
  if (old?.currentShift === shiftId && old.shifts[shiftId]) return s
  const loop: Ch2LoopProgress = old ?? { version: 1,
    runId: `ch2-${s.seed >>> 0}-${shiftId}-${s.gold}-${s.skill}-${s.heart}`, currentShift: shiftId,
    shifts: {}, entries: [], gifts: [] }
  return withLoop(s, { ...loop, currentShift: shiftId, shifts: { ...loop.shifts,
    [shiftId]: loop.shifts[shiftId] ?? { start: ch2Snapshot(s), recovered: options.recovered ?? false } } })
}

/** The mutation and its receipt are returned together; duplicate event IDs apply neither twice. */
export function recordCh2Change(before: GameState, after: GameState, id: string, label: string,
  kind: Ch2LedgerEntry['kind'] = 'story'): GameState {
  const shift = before.dlc?.ch2?.shift ?? after.dlc?.ch2?.shift ?? 'c2n1'
  if (before.dlc?.ch2?.loop?.entries.some(e => e.id === id)) return before
  const initialized = beginCh2Shift(before, shift, { recovered: true })
  const loop = initialized.dlc!.ch2.loop!
  const a = ch2Snapshot(before), b = ch2Snapshot(after)
  const existingIds = new Set(loop.entries.map(row => row.id))
  const nested = (after.dlc?.ch2?.loop?.entries ?? []).filter(row => !existingIds.has(row.id))
  const added = (key: 'items' | 'badges' | 'cards' | 'events') => b[key].filter(value => !a[key].includes(value) && !nested.some(row => row.gained[key].includes(value)))
  const delta = (key: 'gold' | 'skill' | 'heart' | 'wealth' | 'ap') => b[key] - a[key] - nested.reduce((sum, row) => sum + row.delta[key], 0)
  const entry: Ch2LedgerEntry = { id, shift, label, kind,
    delta: { gold: delta('gold'), skill: delta('skill'), heart: delta('heart'), wealth: delta('wealth'), ap: delta('ap') },
    gained: { items: added('items'), badges: added('badges'), cards: added('cards'), events: added('events') },
    consumed: a.items.filter(value => !b.items.includes(value) && !nested.some(row => row.consumed.includes(value))),
    flags: Object.keys(after.flags).filter(key => before.flags[key] !== after.flags[key] && !nested.some(row => row.flags.includes(key))),
  }
  // Preserve nested transaction receipts (e.g. coffee redeemed during a step) without double-listing them.
  const base = after.dlc?.ch2?.loop ?? loop
  return withLoop(after, { ...base, currentShift: shift, shifts: { ...loop.shifts, ...base.shifts },
    entries: [...base.entries, entry] })
}

export function snapshotCh2Settlement(s: GameState, shiftId: string): GameState {
  const initialized = beginCh2Shift(s, shiftId, { recovered: true }), loop = initialized.dlc!.ch2.loop!
  if (loop.shifts[shiftId].settled) return initialized
  return withLoop(initialized, { ...loop, shifts: { ...loop.shifts,
    [shiftId]: { ...loop.shifts[shiftId], settled: ch2Snapshot(initialized) } } })
}

export function ch2ShiftEntries(s: GameState, shiftId = s.dlc?.ch2?.shift): Ch2LedgerEntry[] {
  return (s.dlc?.ch2?.loop?.entries ?? []).filter(row => row.shift === shiftId)
}

export function ch2NetChange(s: GameState, shiftId = s.dlc?.ch2?.shift) {
  const loop = s.dlc?.ch2?.loop
  if (shiftId && loop && shiftId !== loop.currentShift) {
    return ch2ShiftEntries(s, shiftId).reduce((net, row) => ({ gold: net.gold + row.delta.gold,
      skill: net.skill + row.delta.skill, heart: net.heart + row.delta.heart, wealth: net.wealth + row.delta.wealth }),
    { gold: 0, skill: 0, heart: 0, wealth: 0 })
  }
  const start = shiftId ? loop?.shifts[shiftId]?.start : undefined
  return { gold: start ? s.gold - start.gold : 0, skill: start ? s.skill - start.skill : 0,
    heart: start ? s.heart - start.heart : 0, wealth: start ? s.wealth - start.wealth : 0 }
}
