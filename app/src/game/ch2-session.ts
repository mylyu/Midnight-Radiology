import { CH2_SHIFTS, QUIZ2 } from './ch2'
import { SHOP_ITEMS } from './data'
import { applyEffect } from './store'
import { beginCh2Shift, recordCh2Change, snapshotCh2Settlement } from './ch2-ledger'
import { ch2GiftSalesEnded } from './ch2-gifts'
import type { Ch2QuizProgress, DlcProgress, GameState } from './types'

/** Only dlc.ch2 is written here. Chapter 1's counters and save cursor are frozen. */
export function patchCh2(s: GameState, patch: Partial<DlcProgress>): GameState {
  return { ...s, dlc: { ...s.dlc, ch2: { ...s.dlc?.ch2, ...patch } } }
}

export function ch2Phase(s: GameState): NonNullable<DlcProgress['phase']> {
  const p = s.dlc?.ch2
  return p?.done ? 'done' : p?.phase ?? 'story'
}

export function settleCh2(s: GameState, shiftId: string): GameState {
  if (s.dlc?.ch2?.shift !== shiftId || ch2Phase(s) !== 'story') return s
  const last = shiftId === CH2_SHIFTS.at(-1)?.id
  const next = shiftId === 'c2d2' && !s.flags.queue_wait
    ? applyEffect(s, { badge: 'queue_tamer' }) : s
  return snapshotCh2Settlement(recordCh2Change(s, patchCh2(next, { phase: last ? 'done' : 'settle', done: last }),
    `settle:${shiftId}`, last ? '晨会结束，全章交班' : '本班交班完成', 'settlement'), shiftId)
}

export function nextCh2Shift(s: GameState): GameState {
  const p = s.dlc?.ch2
  if (ch2Phase(s) !== 'settle') return s
  const current = CH2_SHIFTS.findIndex(shift => shift.id === p?.shift)
  const next = current >= 0 ? CH2_SHIFTS[current + 1] : undefined
  if (!next) return s
  return beginCh2Shift(patchCh2(s, { phase: 'story', shift: next.id, stepId: next.start,
    viewBg: undefined, viewSprite: undefined, viewSprite2: undefined }), next.id)
}

export function redeemCh2Coffee(s: GameState, stepId: string): GameState {
  if (!s.dlc?.ch2?.pendingCoffee || !/^c2n[135]_hub$/.test(stepId)) return s
  return recordCh2Change(s, patchCh2(applyEffect(s, { ap: 1 }), { pendingCoffee: false }),
    `coffee:${s.dlc?.ch2?.shift}:${stepId}`, '喝掉班后留好的咖啡', 'shop')
}

export const CH2_ITEM_DESCRIPTIONS: Record<string, string> = {
  coffee: '探索时行动力 +1；班后购买则留给下一次夜间自由探索。',
  milktea: '购买时人心 +2；带进背包，在同事闲聊时递出，不重复加属性。',
  snack: '同事闲聊时分享，人心 +1；也可留给第三夜小何的关东煮支线。',
  book: '医术 +2，永久保留；第三夜可翻到旧书签，之后仍可复习。',
  lottery: '每班限五张，探索和班后共用额度；原赔率不变，久刮必亏。',
  toolbox: '元件盒里的小工具可紧一紧办公椅螺丝；不用于擅自拆修 CT。',
  dosimeter: '记录自己的职业受照；第五夜可用于解释，不是给孩子测检查剂量。',
  key: '能开旧片库旁的小铁柜；不是老周保管的封条柜钥匙。',
}

export function ch2ItemUnavailable(s: GameState, id: string): string | undefined {
  const p = s.dlc?.ch2 ?? {}, phase = ch2Phase(s)
  const idx = Math.max(0, CH2_SHIFTS.findIndex(shift => shift.id === p.shift))
  const entered = (node: string) => (p.appliedSteps ?? []).includes(`ch2-${node}`)
  // Legacy saves sometimes keep only the current cursor, not the entry ledger.
  const doseDialoguePassed = entered('c2n5_m14a') || entered('c2n5_m15') ||
    /^c2n5_(m13[a-d]|m14a|m1[5-9]|m2[01]|child_scan|n\d|p2|phone_break|sms_|g\d)/.test(p.stepId ?? '')
  if (phase !== 'story' && phase !== 'settle') return '本班小卖部已打烊'
  if ((id === 'milktea' || id === 'snack') && ch2GiftSalesEnded(s)) return '本轮能当面送礼的空当已过，暂不再售；背包里已有的仍保留'
  if (id === 'coffee') {
    if (p.pendingCoffee) return '背包里还有一份待用咖啡'
    const currentHub = phase === 'story' && /^c2n[135]_hub$/.test(p.stepId ?? '')
    const futureNight = CH2_SHIFTS.slice(idx + 1).some(shift => shift.kind === 'night')
    if (!currentHub && !futureNight) return '之后没有夜间自由探索了，别买来浪费'
    if (phase === 'story' && !currentHub) return '请在夜间自由探索或班后购买'
  } else if (id === 'lottery') {
    if (p.shop && p.shop.shift === p.shift && p.shop.lotteryCount >= 5) return '本班已刮五张'
  } else {
    if (s.items.includes(id)) return '已持有，先用掉再买'
    if (id === 'key') {
      if (idx < 1) return '第二班起上架'
      if (idx > 4 || phase === 'settle' && idx === 4 || s.flags.c2n5_cabinet || entered('c2n5_m0')) return '本轮小铁柜的剧情已结束'
    }
    if (id === 'toolbox' && (idx > 0 || phase === 'settle' || s.flags.c2_chair_fixed || s.flags.c2_chair_passed || entered('c2n1_p0'))) return '本轮修椅子的机会已过'
    if (id === 'dosimeter' && (idx > 4 || phase === 'settle' && idx === 4 || doseDialoguePassed)) return '本轮剂量计对话已结束'
  }
  return undefined
}

/** randomValue is sampled by the event handler, not by a replayable React updater. */
export function buyCh2Item(s: GameState, id: string, randomValue = 0): { state: GameState; message: string } {
  const item = SHOP_ITEMS.find(x => x.id === id)
  if (!item) return { state: s, message: '没有这件商品' }
  const unavailable = ch2ItemUnavailable(s, id)
  if (unavailable) return { state: s, message: unavailable }
  if (s.gold < item.price) return { state: s, message: '金币不够，先看看也行。' }
  const p = s.dlc?.ch2 ?? {}, shift = p.shift ?? CH2_SHIFTS[0].id
  let next = { ...s, gold: s.gold - item.price }
  let message = `已购入：${item.name}`
  let lotteryCount = p.shop?.shift === shift ? p.shop.lotteryCount : 0
  if (id === 'coffee') {
    next = ch2Phase(s) === 'settle' ? patchCh2(next, { pendingCoffee: true }) : applyEffect(next, { ap: 1 })
    message = ch2Phase(s) === 'settle' ? '咖啡收好了，下次夜间自由探索时行动力 +1。' : '喝完咖啡，行动力 +1。'
  } else if (id === 'milktea') next = applyEffect(next, { heart: 2, item: id })
  else if (id === 'book') next = applyEffect(next, { skill: 2, item: id })
  else if (id === 'lottery') {
    const win = randomValue < .42 ? 0 : randomValue < .70 ? 20 : randomValue < .88 ? 50 : randomValue < .96 ? 120 : 250
    next = { ...next, gold: next.gold + win }
    lotteryCount++
    message = win ? `刮中了 ${win} 金币。${win === 50 ? '刚好回本。' : win < 50 ? '回了个零头。' : '今天手气不错！'}` : '「谢谢惠顾」……算了，留点钱吃饭。'
  } else next = applyEffect(next, { item: id })
  next = patchCh2(next, { shop: { shift, lotteryCount, buyCount: (p.shop?.buyCount ?? 0) + 1 } })
  return { state: recordCh2Change(s, next, `buy:${(p.shop?.buyCount ?? 0) + 1}`,
    `购买${item.id === 'toolbox' ? '元件盒' : item.name}（支出 ${item.price} 金币）${id === 'lottery' ? `；${message}` : ''}`, 'shop'), message }
}

/** Historical API retained as a no-op: gifts now require an in-person dialogue. */
export function shareCh2Item(s: GameState, id: 'milktea' | 'snack'): GameState {
  void id
  return s
}

export const CH2_QUIZ_REWARDS = { S: 250, A: 200, B: 80, C: 0 } as const
export function ch2QuizScore(quiz: Ch2QuizProgress): number {
  return quiz.questions.reduce((score, q) => score + (q.selected !== undefined && q.order[q.selected] === QUIZ2[q.question].answer ? 1 : 0), 0)
}

export function startCh2Quiz(s: GameState, seed = s.seed): GameState {
  if (s.dlc?.ch2?.done) return s
  if (s.dlc?.ch2?.quiz) return patchCh2(s, { phase: 'quiz' })
  let n = seed >>> 0
  const random = () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296 }
  const shuffle = (values: number[]) => {
    for (let i = values.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1)); [values[i], values[j]] = [values[j], values[i]]
    }
    return values
  }
  const questions = shuffle(QUIZ2.map((_, i) => i)).slice(0, 5).map(question => ({ question, order: shuffle(QUIZ2[question].options.map((_, i) => i)) }))
  return patchCh2(s, { phase: 'quiz', quiz: { questions, index: 0, completed: false } })
}

export function answerCh2Quiz(s: GameState, answer: number): GameState {
  const q = s.dlc?.ch2?.quiz
  if (!q || q.completed || ch2Phase(s) !== 'quiz') return s
  const current = q.questions[q.index]
  if (current.selected !== undefined || !Number.isInteger(answer) || answer < 0 || answer >= current.order.length) return s
  return patchCh2(s, { quiz: { ...q, questions: q.questions.map((row, i) => i === q.index ? { ...row, selected: answer } : row) } })
}

export function nextCh2Question(s: GameState): GameState {
  const q = s.dlc?.ch2?.quiz
  if (!q || q.completed || ch2Phase(s) !== 'quiz' || q.questions[q.index].selected === undefined) return s
  if (q.index + 1 < q.questions.length) return patchCh2(s, { quiz: { ...q, index: q.index + 1 } })
  const score = ch2QuizScore(q), grade = score >= 5 ? 'S' : score === 4 ? 'A' : score === 3 ? 'B' : 'C'
  const next = { ...s, gold: s.gold + (q.rewarded ? 0 : CH2_QUIZ_REWARDS[grade]), flags: { ...s.flags, quiz2_grade: grade } }
  return recordCh2Change(s, patchCh2(next, { quiz: { ...q, completed: true, rewarded: true, grade } }),
    'quiz:reward', `晨会考核 ${grade}：奖励 ${q.rewarded ? 0 : CH2_QUIZ_REWARDS[grade]} 金币`, 'quiz')
}
