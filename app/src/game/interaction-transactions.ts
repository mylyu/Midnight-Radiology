import { NIGHTS, SHOP_ITEMS } from './data'
import { CH2_SHIFTS, ch2StepForState } from './ch2'
import { ch2CheckinPending } from './ch2-checkin'
import { recordCh2Change } from './ch2-ledger'
import { getCh2Observation } from './ch2-observations'
import { CH2_SCANS } from './ch2-scans'
import { ch2Phase, patchCh2 } from './ch2-session'
import { applyEffect, condOk } from './store'
import type { Choice, GameState, Step } from './types'

export interface InteractionResult {
  state: GameState
  accepted: boolean
  message: string
}

export interface ChoiceCommitResult extends InteractionResult {
  nextStep?: string
  action?: 'shop' | 'book' | 'book2'
  riskTriggered?: boolean
}

export interface Ch1InteractionSource {
  expectedNight: number
  expectedStep: string
}

export interface Ch2InteractionSource {
  expectedShift: string
  expectedStep: string
}

type ChoiceInput = { choice: Choice; randomValue?: number }

const reject = (state: GameState, message: string): InteractionResult => ({ state, accepted: false, message })
const validRoll = (value: number | undefined): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 1
const ch1Active = (s: GameState) => !s.finished && NIGHTS.some(n => n.id === s.night) &&
  (s.screenHint === undefined || s.screenHint === 'day' || s.screenHint === 'night')

/** The saved flag, not a mounting effect/ref, owns the once-per-night reward.
 * Existing flags are respected; past capped/lost skill is not reconstructed. */
export function readCh1Book(s: GameState, expectedNight = s.night): GameState {
  const key = `book_read_n${expectedNight}`
  if (!ch1Active(s) || s.night !== expectedNight || s.flags[key]) return s
  return applyEffect(s, { skill: 1, flag: key })
}

/** Every real maintenance purchase still costs 50 and earns one wealth.
 * Full durability is not a purchase; the message reports the actual repair. */
export function maintainCh1(s: GameState, expectedNight = s.night): InteractionResult {
  if (!ch1Active(s) || s.night !== expectedNight || s.screenHint !== 'day') return reject(s, '现在不是白天保养时间。')
  if (s.durability >= 100) return reject(s, '老伙计状态已满，不用再花钱保养。')
  if (s.gold < 50) return reject(s, '金币不够，今晚多接几个病人吧。')
  const restored = Math.min(25, 100 - s.durability)
  return { state: applyEffect(s, { gold: -50, durability: restored, wealth: 1 }), accepted: true,
    message: `你给老伙计做了保养，它今晚的嗡嗡声都精神了些。（耐久+${restored}）` }
}

/** Immediate-effect goods remain repeatable exactly as before. Inventory goods
 * must be absent in the latest state; randomValue is sampled by the caller. */
export function buyCh1Item(s: GameState, id: string, randomValue?: number): InteractionResult {
  if (!ch1Active(s)) return reject(s, '本章小卖部已打烊。')
  const item = SHOP_ITEMS.find(row => row.id === id)
  if (!item) return reject(s, '没有这件商品。')
  if (s.night < (item.minNight ?? 1)) return reject(s, '这件商品还没有上架。')
  const immediate = ['coffee', 'milktea', 'book', 'lottery'].includes(id)
  if (!immediate && s.items.includes(id)) return reject(s, '背包里已有这件物品，先用掉再买。')
  const played = s.lotteryNight === s.night ? (s.lotteryCount ?? 0) : 0
  if (id === 'lottery' && played >= 5) return reject(s, '老板娘按住刮刮乐：「一天最多五张——玄学也要讲剂量。」')
  if (s.gold < item.price) return reject(s, '金币不够……今晚多接几个病人吧。')
  if (id === 'lottery' && !validRoll(randomValue)) return reject(s, '刮刮乐尚未抽签，请再试一次。')
  let next: GameState = { ...s, gold: s.gold - item.price, buyCount: s.buyCount + 1 }
  let message = `已购入：${item.icon} ${item.name}（${item.desc}）`
  if (id === 'coffee') next = applyEffect(next, { ap: 1 })
  else if (id === 'milktea') next = applyEffect(next, { heart: 2 })
  else if (id === 'book') next = applyEffect(next, { skill: 2 })
  else if (id === 'lottery') {
    // Same five prizes and boundaries as the original first-chapter shop.
    const roll = randomValue as number
    const win = roll < .42 ? 0 : roll < .70 ? 20 : roll < .88 ? 50 : roll < .96 ? 120 : 250
    next = { ...next, gold: next.gold + win, lotteryNight: s.night, lotteryCount: played + 1 }
    message = win === 0 ? '「谢谢惠顾」……夜班玄学失败了。'
      : win === 20 ? '中了 20 金币，回了个零头。'
        : win === 50 ? '中了 50 金币，正好回本！'
          : win === 120 ? '🎉 中了 120 金币！小赚一笔！' : '🎉🎉 250 金币！单车变摩托！'
  } else next = applyEffect(next, { item: id })
  if (next.buyCount >= 3 && !next.badges.includes('shopaholic')) next = { ...next, badges: [...next.badges, 'shopaholic'] }
  return { state: next, accepted: true, message }
}

function ch1Source(s: GameState, input: Ch1InteractionSource): Step | undefined {
  if (s.night !== input.expectedNight || s.screenHint !== 'night' || s.stepId !== input.expectedStep) return undefined
  // Finished saves may continue the existing epilogue, never re-enter a paid night.
  if (s.finished && !/^n5_epi(?:\d+|_end)$/.test(input.expectedStep)) return undefined
  return NIGHTS.find(n => n.id === s.night)?.steps[input.expectedStep]
}

function ch2Source(s: GameState, input: Ch2InteractionSource): Step | undefined {
  const p = s.dlc?.ch2
  if (ch2Phase(s) !== 'story' || p?.shift !== input.expectedShift || p.stepId !== input.expectedStep) return undefined
  if (ch2CheckinPending(s, input.expectedStep) || p.giftReply?.stepId === input.expectedStep ||
    p.statInteractions?.pending?.stepId === input.expectedStep) return undefined
  if (CH2_SCANS[input.expectedStep] && !p.scanSessions?.[input.expectedStep]?.completed) return undefined
  const observation = getCh2Observation(input.expectedStep, s)
  if (observation && !p.observations?.[observation.id]?.acknowledged) return undefined
  const raw = CH2_SHIFTS.find(shift => shift.id === input.expectedShift)?.steps[input.expectedStep]
  return raw && ch2StepForState(input.expectedStep, raw, s)
}

function choiceForState(s: GameState, step: Step, supplied: Choice, allowContinue = false): Choice | undefined {
  // Resolve the current definition, not effects copied from an earlier render.
  const candidate = step.choices?.find(c => c.next === supplied.next && c.text === supplied.text)
    ?? (allowContinue && !step.choices && step.next === supplied.next && supplied.text === '接着聊'
      ? { text: '接着聊', next: step.next } : undefined)
  return candidate && condOk(s, candidate.cond) ? candidate : undefined
}

function modalAction(s: GameState, next: string): ChoiceCommitResult | undefined {
  const action = next === '@shop' ? 'shop' : next === '@book' ? 'book' : next === '@book2' ? 'book2' : undefined
  return action ? { state: s, accepted: true, message: '', action } : undefined
}

/** No permanent source-node receipt: hubs and conversations may legitimately
 * return. A committed cursor rejects the stale event; conditions guard visits. */
export function commitCh1Choice(s: GameState, input: Ch1InteractionSource & ChoiceInput): ChoiceCommitResult {
  const step = ch1Source(s, input)
  const choice = step && choiceForState(s, step, input.choice)
  if (!choice || s.finished) return reject(s, '这次选择已经过期或条件不满足。')
  const modal = modalAction(s, choice.next)
  if (modal) return modal
  if (choice.risk && !validRoll(input.randomValue)) return reject(s, '本次选择还没有风险抽值。')
  const riskTriggered = !!choice.risk && (input.randomValue as number) < choice.risk.chance
  const nextStep = riskTriggered ? choice.risk!.next : choice.next
  if (!NIGHTS.find(n => n.id === s.night)?.steps[nextStep]) return reject(s, '目标剧情节点不存在。')
  const changed = applyEffect(applyEffect(s, choice.effect), riskTriggered ? choice.risk?.effect : undefined)
  // Leave resumeKey at the previously applied node. Target entry owns its effect.
  return { state: { ...changed, stepId: nextStep }, accepted: true, message: '', nextStep, riskTriggered }
}

export function commitCh2Choice(s: GameState, input: Ch2InteractionSource & ChoiceInput): ChoiceCommitResult {
  const step = ch2Source(s, input)
  const choice = step && choiceForState(s, step, input.choice, true)
  if (!choice) return reject(s, '这次选择已经过期或条件不满足。')
  const modal = modalAction(s, choice.next)
  if (modal) return modal
  if (choice.risk && !validRoll(input.randomValue)) return reject(s, '本次选择还没有风险抽值。')
  const riskTriggered = !!choice.risk && (input.randomValue as number) < choice.risk.chance
  const nextStep = riskTriggered ? choice.risk!.next : choice.next
  if (!CH2_SHIFTS.find(shift => shift.id === input.expectedShift)?.steps[nextStep]) return reject(s, '目标剧情节点不存在。')
  let next = s
  if (choice.effect || riskTriggered && choice.risk?.effect) {
    next = recordCh2Change(s, applyEffect(applyEffect(s, choice.effect), riskTriggered ? choice.risk?.effect : undefined),
      `choice:${input.expectedStep}`, choice.text.replaceAll('**', ''), 'choice')
  }
  // Old partial receipts keep their old no-second-reward behavior. New choices
  // persist the receipt, effects and cursor together in this one returned state.
  return { state: patchCh2(next, { stepId: nextStep }), accepted: true, message: '', nextStep, riskTriggered }
}

/** Text/animation timing remains a UI gate; no entry effects are applied here. */
export function commitCh1Advance(s: GameState, input: Ch1InteractionSource & { readoutComplete?: boolean }): ChoiceCommitResult {
  const step = ch1Source(s, input)
  if (!step || step.choices || step.end || step.readout && !input.readoutComplete || !step.next) return reject(s, '本段尚不能继续。')
  const modal = modalAction(s, step.next)
  if (modal) return modal
  if (!NIGHTS.find(n => n.id === s.night)?.steps[step.next]) return reject(s, '目标剧情节点不存在。')
  return { state: { ...s, stepId: step.next }, accepted: true, message: '', nextStep: step.next }
}

export function commitCh2Advance(s: GameState, input: Ch2InteractionSource): ChoiceCommitResult {
  const step = ch2Source(s, input)
  if (!step || step.choices || step.end || step.windowTask || step.checklist || !step.next) return reject(s, '本段尚不能继续。')
  const modal = modalAction(s, step.next)
  if (modal) return modal
  if (!CH2_SHIFTS.find(shift => shift.id === input.expectedShift)?.steps[step.next]) return reject(s, '目标剧情节点不存在。')
  return { state: patchCh2(s, { stepId: step.next }), accepted: true, message: '', nextStep: step.next }
}
