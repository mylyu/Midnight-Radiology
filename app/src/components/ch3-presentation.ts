import type { GameState } from '../game/types'
import type { TrilogyChapter, TrilogyProgress, TrilogyStep } from '../game/trilogy-types'

/** Chapter 3's shift handover is a deliberate action, not an ordinary page turn. */
export const ch3NeedsSettlementChoice = (chapter: TrilogyChapter['id'], phase: TrilogyProgress['phase'],
  end: boolean | undefined, hasReply: boolean) => chapter === 'ch3' && phase === 'story' && !!end && !hasReply

/** A call's counterpart stays the same while the protagonist answers. */
export function ch3ContactName(chapter: TrilogyChapter, step: TrilogyStep) {
  return Object.values(chapter.characters).find(person => step.phone && person.sprite === step.phone)?.name
    ?? (step.communication === 'sms' ? '手机短信' : '电话')
}

/** UI reasons mirror existing transaction guards; they never grant or charge anything. */
export function ch3PurchaseButton(state: Pick<GameState, 'gold' | 'items'>, progress: TrilogyProgress,
  item: { id: string; price: number }) {
  const unavailable = (label: string, reason: string) => ({ disabled: true, label, reason })
  const afterExploration = ['quiz', 'epilogue', 'done'].includes(progress.phase)
  if (item.id === 'coffee') {
    if (afterExploration || progress.phase === 'settle' && progress.shift === 4)
      return unavailable('本章停售', '后面没有自由探索了，不再购买行动力补给。')
    if (progress.pendingCoffee)
      return unavailable('已留一杯', '待用咖啡会在下一班自由探索开始时生效。')
  }
  if (afterExploration && ['milktea', 'snack'].includes(item.id))
    return unavailable('本章停售', '本章的同事闲聊已结束，已有物品仍留在背包。')
  if (!['coffee', 'lottery'].includes(item.id) && state.items.includes(item.id))
    return unavailable('已持有', '背包里已有这件物品，不重复购买。')
  if (item.id === 'lottery' && progress.shop.lotteryCount >= 5)
    return unavailable('本班售罄', '每班最多购买五张刮刮乐。')
  if (state.gold < item.price) return unavailable('金币不足', `需要 ${item.price} 金币。`)
  return { disabled: false, label: `${item.price} 金币`, reason: '' }
}
