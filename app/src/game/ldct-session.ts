import { createLdctLabState, isValidLdctRecord } from './ldct-experiments'
import type { LdctLabConfig, LdctLabState } from './ldct-experiments'
import { getLdctChoices, getLdctNode, LDCT_START, LDCT_STEPS } from './ldct'
import type { LdctAction, LdctPerson, LdctProduct, LdctProgress } from './ldct-types'
import type { GameState } from './types'

/** This module is pure. App.update persists the returned state exactly once. */
export function getLdctProgress(state: GameState): LdctProgress | undefined {
  const progress = state.dlc?.ldct?.ldct
  return progress?.version === 1 ? progress : undefined
}

function patch(state: GameState, progress: LdctProgress): GameState {
  return { ...state, dlc: { ...state.dlc, ldct: { ...state.dlc?.ldct, ldct: progress } } }
}

export function initializeLdct(state: GameState, replay = false): GameState {
  const previous = getLdctProgress(state)
  if (previous && !replay) return state
  return patch(state, {
    version: 1, run: (previous?.run ?? 0) + 1, seed: 2258, phase: 'story', nodeId: LDCT_START,
    revision: 0, fatigue: 2, completed: [], decisions: {}, receipts: [], gifts: [],
    labRound: 1, labDraft: createLdctLabState(), records: {},
    start: { gold: state.gold, skill: state.skill, heart: state.heart, wealth: state.wealth },
  })
}

function changed(p: LdctProgress, fields: Partial<LdctProgress>): LdctProgress {
  return { ...p, ...fields, revision: p.revision + 1 }
}

function finishInteraction(state: GameState, p: LdctProgress, id?: string): [GameState, LdctProgress] {
  if (!id || p.completed.includes(id)) return [state, p]
  const next = { ...p, completed: [...p.completed, id] }
  if (id === 'organized' && !p.receipts.includes('reward:records')) {
    next.receipts = [...next.receipts, 'reward:records']
    return [{ ...state, wealth: state.wealth + 1 }, next]
  }
  return [state, next]
}

function move(state: GameState, p: LdctProgress, nextId: string): GameState {
  const node = LDCT_STEPS[nextId]
  if (!node) return state
  if (node.enterLab) {
    const round = node.enterLab
    return patch(state, changed(p, { nodeId: nextId, phase: 'lab', reply: undefined, labRound: round,
      labDraft: p.labRound === round ? p.labDraft : createLdctLabState(), labReturn: undefined }))
  }
  return patch(state, changed(p, { nodeId: nextId, phase: node.settle ? 'settle' : 'story', reply: undefined }))
}

function configValid(c: LdctLabConfig | undefined): c is LdctLabConfig {
  return !!c && ['low', 'medium', 'high'].includes(c.signal) && ['fbp', 'iterative'].includes(c.algorithm)
    && [1, 2, 3].includes(c.strength)
}
function labStateValid(v: LdctLabState): boolean {
  return configValid(v.candidate) && (v.pinned === null || configValid(v.pinned)) && [0, 1, 2].includes(v.slice)
    && Number.isFinite(v.divider) && v.divider >= 0 && v.divider <= 100
    && (v.mark === null || Number.isFinite(v.mark.x) && Number.isFinite(v.mark.y)
      && v.mark.x >= 0 && v.mark.x <= 100 && v.mark.y >= 0 && v.mark.y <= 100)
    && typeof v.helped === 'boolean'
}

export const LDCT_PRODUCTS = [
  { id: 'coffee' as const, name: '速溶咖啡', icon: '☕', image: 'item_coffee', price: 30,
    desc: '坐下来喝一杯，本段疲惫减轻一次；不增加或消耗主线行动力。' },
  { id: 'milktea' as const, name: '全科室奶茶', icon: '🧋', image: 'item_milktea', price: 200,
    desc: '购买时人心＋2；遇到同事时递出，不重复加分。' },
  { id: 'snack' as const, name: '零食礼包', icon: '🍪', image: 'item_snack', price: 40,
    desc: '在同事闲聊时分享，送出时人心＋1。' },
]

export function ldctItemUnavailable(state: GameState, item: LdctProduct): string | undefined {
  const p = getLdctProgress(state)
  if (!p) return '进入开场后再来看看'
  if (p.phase === 'settle') return '本段休息和当面送礼的机会已过，先不买多余的；已有库存保留'
  if (p.phase !== 'story' || p.nodeId !== 'hub') return '先聊完，休息时再买'
  if (item === 'coffee') return p.receipts.includes('coffee') ? '这段已经喝过了，留点时间睡觉' : undefined
  if (state.items.includes(item)) return '背包里还有，先送出去再买'
  return undefined
}

export function ldctGiftChoices(state: GameState): { person: LdctPerson; item: 'milktea' | 'snack'; text: string }[] {
  const p = getLdctProgress(state), node = getLdctNode(state)
  const person = node.giftPerson
  if (!p || p.phase !== 'story' || p.reply || !person || p.gifts.some(g => g.person === person)) return []
  return (['milktea', 'snack'] as const).filter(item => state.items.includes(item)).map(item => ({
    person, item, text: item === 'milktea' ? '🧋 把奶茶递过去' : '🍪 拆开零食一起吃',
  }))
}

const giftReplies: Record<LdctPerson, Record<'milktea' | 'snack', string>> = {
  luzhou: { milktea: '哎，还有我的？先放这儿。杯子离电脑远点——上回进水以后，我师兄都用保温杯了。', snack: '这个我本科常买。你还记得啊。……先别翻图，让我把这口咽了。' },
  lei: { milktea: '谢了。我这会儿可真走不动了，得先腾只手拿它。', snack: '分我两块就行。袋子夹好，昨天有人把饼干渣撒键盘里，打字跟嚼脆骨似的。' },
  he: { milktea: '正想找点喝的。谢啦，放这里，别搁热饭上。', snack: '好，下午揣兜里。上次忙到下班，才想起午饭还在微波炉里。' },
}

export function ldctAction(state: GameState, action: LdctAction): GameState {
  const p = getLdctProgress(state)
  if (!p) return state
  if (action.type === 'reply:close') {
    return p.reply ? patch(state, changed(p, { reply: undefined })) : state
  }
  if (action.type === 'advance' || action.type === 'choose') {
    if (p.phase !== 'story' || p.reply || action.nodeId !== p.nodeId) return state
    const node = getLdctNode(state)
    if (action.type === 'advance') {
      if (!node.next || node.choices?.length) return state
      const [nextState, nextProgress] = finishInteraction(state, p, node.complete)
      return move(nextState, nextProgress, node.next)
    }
    const selected = getLdctChoices(state).find(c => c.id === action.choiceId)
    if (!selected) return state
    const [nextState, nextProgress] = finishInteraction(state, p, selected.complete)
    const withDecision = selected.decision ? { ...nextProgress, decisions: {
      ...nextProgress.decisions, [selected.decision.key]: selected.decision.value,
    } } : nextProgress
    return move(nextState, withDecision, selected.next)
  }
  if (action.type === 'lab:update') {
    if (p.phase !== 'lab' || !labStateValid(action.value) || action.value.saved !== null && !isValidLdctRecord(action.value.saved, p.labRound)) return state
    return patch(state, { ...p, labDraft: action.value })
  }
  if (action.type === 'lab:submit') {
    if (p.phase !== 'lab' || !isValidLdctRecord(action.record, p.labRound) || !p.labDraft.saved
      || JSON.stringify(action.record) !== JSON.stringify(p.labDraft.saved)) return state
    const record = action.record, first = !p.receipts.includes('reward:comparison')
    let nextState = state
    if (first) nextState = { ...state, skill: state.skill + 1,
      badges: state.badges.includes('ldct_first_comparison') ? state.badges : [...state.badges, 'ldct_first_comparison'] }
    const nextProgress = { ...p, records: { ...p.records, [record.round]: record },
      receipts: first ? [...p.receipts, 'reward:comparison'] : p.receipts }
    if (p.labReturn) return move(nextState, { ...nextProgress, labReturn: undefined }, p.labReturn)
    return move(nextState, nextProgress, record.round === 1 ? 'after_first_0' : 'after_second_0')
  }
  if (action.type === 'lab:open') {
    if (p.phase !== 'settle' || !p.records[action.round]) return state
    return patch(state, changed(p, { phase: 'lab', labRound: action.round,
      labDraft: createLdctLabState(), labReturn: p.nodeId }))
  }
  if (action.type === 'lab:close') {
    if (p.phase !== 'lab') return state
    if (p.labReturn) return move(state, { ...p, labReturn: undefined }, p.labReturn)
    return move(state, p, p.labRound === 1 ? 'lab_intro_5' : 'after_first_4')
  }
  if (action.type === 'gift') {
    const available = ldctGiftChoices(state).find(g => g.person === action.person && g.item === action.item)
    if (!available || p.nodeId !== action.nodeId) return state
    const nextState = { ...state, items: state.items.filter(id => id !== action.item),
      heart: state.heart + (action.item === 'snack' ? 1 : 0) }
    return patch(nextState, changed(p, { gifts: [...p.gifts, { person: action.person, item: action.item, nodeId: p.nodeId }],
      reply: { nodeId: p.nodeId, speaker: action.person, text: giftReplies[action.person][action.item] } }))
  }
  if (action.type === 'buy') {
    const product = LDCT_PRODUCTS.find(item => item.id === action.item)
    if (!product || ldctItemUnavailable(state, action.item) || state.gold < product.price) return state
    const nextState = { ...state, gold: state.gold - product.price }
    if (action.item === 'coffee') {
      return patch(nextState, changed(p, { fatigue: Math.max(0, p.fatigue - 1), receipts: [...p.receipts, 'coffee'],
        reply: { nodeId: p.nodeId, speaker: 'me', text: '杯子有点烫。我慢慢喝完，把手机扣在桌上。先歇几分钟，不急着开下一张图。' } }))
    }
    return patch({ ...nextState, items: [...nextState.items, action.item], heart: nextState.heart + (action.item === 'milktea' ? 2 : 0) },
      changed(p, { receipts: [...p.receipts, `buy:${p.receipts.filter(id => id.startsWith('buy:')).length + 1}:${action.item}`] }))
  }
  if (action.type === 'rest') {
    if (p.reply || p.completed.includes('rest') || p.phase !== 'story' || p.nodeId !== 'hub') return state
    return patch(state, changed(p, { fatigue: Math.max(0, p.fatigue - 1), completed: [...p.completed, 'rest'],
      reply: { nodeId: p.nodeId, speaker: 'me', text: '我把椅背往后靠了一点。陆舟没催，关掉了屏幕上的邮件。屋里只剩烧水的声音。' } }))
  }
  return state
}
