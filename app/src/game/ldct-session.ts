import { createLdctLabState, isValidLdctRecord, labStateValid } from './ldct-experiments'
import type { LdctLabRound } from './ldct-experiments'
import { getLdctChoices, getLdctNode, LDCT_START, LDCT_STEPS } from './ldct'
import type { LdctAction, LdctPerson, LdctProduct, LdctProgress } from './ldct-types'
import type { GameState } from './types'
import { createResearchDraft, researchDraftValid, researchReady, researchPart, type LdctResearchStage } from './ldct-research'

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
  if (previous && !replay) {
    if (previous.openingRevision === 2) return state
    // The rejected two-picture exercise cannot be resumed as a projection task.
    // Keep conversations, gifts, earned receipts and global state; restart only
    // the experimental sequence (completed old sample stays at its ending).
    const beforeLab = !previous.records?.[1] && previous.phase === 'story'
      && !previous.nodeId.startsWith('lab_') && !previous.nodeId.startsWith('after_')
    const settled = previous.phase === 'settle'
    return patch(state, { ...previous, openingRevision: 2,
      phase: settled ? 'settle' : 'story', nodeId: settled ? 'stage_end' : beforeLab ? previous.nodeId : 'lab_intro_0',
      labRound: 1, labDraft: createLdctLabState(1), records: {}, labReturn: undefined, reply: undefined,
      decisions: { ...previous.decisions, migratedProjection: 'yes' }, revision: previous.revision + 1 })
  }
  return patch(state, {
    version: 1, openingRevision: 2, run: (previous?.run ?? 0) + 1, seed: 2258, phase: 'story', nodeId: LDCT_START,
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
  if (node.enterResearch) {
    return patch(state, changed(p, { nodeId: nextId, phase: 'research', reply: undefined,
      research: p.research?.stage === node.enterResearch ? p.research : createResearchDraft(node.enterResearch), researchReturn: undefined }))
  }
  if (node.enterLab) {
    const round = node.enterLab
    return patch(state, changed(p, { nodeId: nextId, phase: 'lab', reply: undefined, labRound: round,
      labDraft: p.labRound === round ? p.labDraft : createLdctLabState(round), labReturn: undefined }))
  }
  const finished = node.finale || p.finished
  const nextState = node.finale && !state.badges.includes('ldct_noise_beyond') ? { ...state, badges: [...state.badges, 'ldct_noise_beyond'] } : state
  return patch(nextState, changed(p, { nodeId: nextId, phase: node.settle ? 'settle' : 'story', reply: undefined, finished }))
}

const labAfter: Record<LdctLabRound, string> = {
  1: 'after_first_0', 2: 'after_backproject_0', 3: 'after_filter_0',
  4: 'after_noise_0', 5: 'after_second_0',
}
const labBefore: Record<LdctLabRound, string> = {
  1: 'lab_intro_3', 2: 'after_first_3', 3: 'filter_intro_2',
  4: 'noise_intro_2', 5: 'iterate_intro_2',
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
  if (!p) return '进入故事后再来看看'
  if (p.finished) return '本段休息和当面送礼的机会已过，先不买多余的；已有库存保留'
  if (p.phase === 'settle' && item === 'coffee') return '现在先回家休息，咖啡留到下一段闲聊时再买'
  if (p.phase !== 'settle' && (p.phase !== 'story' || getLdctNode(state).kind !== 'hub' || p.reply)) return '先聊完，休息时再买'
  if (item === 'coffee') return p.receipts.includes(coffeeReceipt(p)) ? '这段已经喝过了，留点时间睡觉' : undefined
  if (state.items.includes(item)) return '背包里还有，先送出去再买'
  return undefined
}

export function ldctGiftChoices(state: GameState): { person: LdctPerson; item: 'milktea' | 'snack'; text: string }[] {
  const p = getLdctProgress(state), node = getLdctNode(state)
  const person = node.giftPerson
  if (!p || p.phase !== 'story' || p.reply || !person || p.gifts.some(g => g.person === person && (g.part ?? 1) === researchPart(p.nodeId))) return []
  return (['milktea', 'snack'] as const).filter(item => state.items.includes(item)).map(item => ({
    person, item, text: item === 'milktea' ? '🧋 把奶茶递过去' : '🍪 拆开零食一起吃',
  }))
}

const giftReplies: Record<LdctPerson, Record<'milktea' | 'snack', string>> = {
  luzhou: { milktea: '哎，还有我的？先放这儿。杯子离电脑远点——上回进水以后，我师兄都用保温杯了。', snack: '这个我本科常买。你还记得啊。……先别翻图，让我把这口咽了。' },
  lei: { milktea: '谢了。我这会儿可真走不动了，得先腾只手拿它。', snack: '分我两块就行。袋子夹好，昨天有人把饼干渣撒键盘里，打字跟嚼脆骨似的。' },
  he: { milktea: '正想找点喝的。谢啦，放这里，别搁热饭上。', snack: '好，下午揣兜里。上次忙到下班，才想起午饭还在微波炉里。' },
}

const restReceipt = (p: LdctProgress) => researchPart(p.nodeId) === 1 ? 'rest' : `rest:${researchPart(p.nodeId)}`
const coffeeReceipt = (p: LdctProgress) => researchPart(p.nodeId) === 1 ? 'coffee' : `coffee:${researchPart(p.nodeId)}`
export function ldctCanRest(state: GameState) {
  const p = getLdctProgress(state)
  return !!p && p.phase === 'story' && !p.reply && getLdctNode(state).kind === 'hub' && !p.completed.includes(restReceipt(p))
}
const afterResearch: Record<LdctResearchStage, string> = { roster: 'r2_after_roster_0', blind: 'r3_after_blind_0', report: 'r4_after_report_0' }
const beforeResearch: Record<LdctResearchStage, string> = { roster: 'r2_hub', blind: 'r3_hub', report: 'r4_hub' }

export function ldctAction(state: GameState, action: LdctAction): GameState {
  const p = getLdctProgress(state)
  if (!p) return state
  if (action.type === 'part:next') {
    const targets: Record<string, string> = { stage_end: 'r2_start', r2_end: 'r3_start', r3_end: 'r4_start' }
    if (p.phase !== 'settle' || p.finished || !targets[p.nodeId]) return state
    return move(state, { ...p, partStart: { gold: state.gold, skill: state.skill, heart: state.heart, wealth: state.wealth }, fatigue: Math.min(5, p.fatigue + 1) }, targets[p.nodeId])
  }
  if (action.type === 'research:update') {
    if (p.phase !== 'research' || !p.research || !researchDraftValid(action.value, p.research.stage)) return state
    return patch(state, { ...p, research: action.value })
  }
  if (action.type === 'research:submit') {
    const draft = p.research
    if (p.phase !== 'research' || !draft || action.stage !== draft.stage || !researchReady(draft)) return state
    // Return-only reviews never rewrite the past meeting, grants or ending.
    if (p.researchReturn) return move(state, { ...p, researchReturn: undefined }, p.researchReturn)
    const receipt = `research:${draft.stage}`
    const first = !p.receipts.includes(receipt)
    let next = state
    const decisions = { ...p.decisions }
    let fatigue = p.fatigue
    if (draft.stage === 'roster') {
      decisions.workload = Object.values(draft.assignments).filter(value => value === 'me').length >= 2 ? 'overloaded' : 'shared'
      decisions.roster_rest = draft.rest ? 'yes' : 'no'
      fatigue = Math.max(0, Math.min(5, fatigue + (decisions.workload === 'overloaded' ? 1 : 0) - (draft.rest ? 1 : 0)))
      if (first) next = { ...next, wealth: next.wealth + 1 }
    }
    if (draft.stage === 'blind') {
      decisions.blind_note = Object.values(draft.observations).includes('detail') ? 'detail' : 'uncertain'
      if (first) next = { ...next, skill: next.skill + 1, badges: next.badges.includes('ldct_keep_counterexample') ? next.badges : [...next.badges, 'ldct_keep_counterexample'] }
    }
    if (draft.stage === 'report') {
      decisions.report = draft.claim
      decisions.report_examples = draft.included.length === 3 ? 'all' : 'selected'
    }
    return move(next, { ...p, decisions, fatigue, receipts: first ? [...p.receipts, receipt] : p.receipts,
      researchRecords: { ...p.researchRecords, [draft.stage]: structuredClone(draft) } }, afterResearch[draft.stage])
  }
  if (action.type === 'research:close') {
    if (p.phase !== 'research' || !p.research) return state
    return move(state, { ...p, researchReturn: undefined }, p.researchReturn || beforeResearch[p.research.stage])
  }
  if (action.type === 'research:open') {
    if (p.phase !== 'settle' || !p.researchRecords?.[action.stage]) return state
    return patch(state, changed(p, { phase: 'research', research: structuredClone(p.researchRecords[action.stage]!), researchReturn: p.nodeId }))
  }
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
    if (p.phase !== 'lab' || !labStateValid(action.value, p.labRound) || action.value.saved !== null && !isValidLdctRecord(action.value.saved, p.labRound)) return state
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
    return move(nextState, nextProgress, labAfter[record.round])
  }
  if (action.type === 'lab:open') {
    if (p.phase !== 'settle' || !p.records[action.round] && p.decisions.migratedProjection !== 'yes') return state
    return patch(state, changed(p, { phase: 'lab', labRound: action.round,
      labDraft: createLdctLabState(action.round), labReturn: p.nodeId }))
  }
  if (action.type === 'lab:close') {
    if (p.phase !== 'lab') return state
    if (p.labReturn) return move(state, { ...p, labReturn: undefined }, p.labReturn)
    return move(state, p, labBefore[p.labRound])
  }
  if (action.type === 'gift') {
    const available = ldctGiftChoices(state).find(g => g.person === action.person && g.item === action.item)
    if (!available || p.nodeId !== action.nodeId) return state
    const nextState = { ...state, items: state.items.filter(id => id !== action.item),
      heart: state.heart + (action.item === 'snack' ? 1 : 0) }
    return patch(nextState, changed(p, { gifts: [...p.gifts, { person: action.person, item: action.item, nodeId: p.nodeId, part: researchPart(p.nodeId) }],
      reply: { nodeId: p.nodeId, speaker: action.person, text: giftReplies[action.person][action.item] } }))
  }
  if (action.type === 'buy') {
    const product = LDCT_PRODUCTS.find(item => item.id === action.item)
    if (!product || ldctItemUnavailable(state, action.item) || state.gold < product.price) return state
    const nextState = { ...state, gold: state.gold - product.price }
    if (action.item === 'coffee') {
      return patch(nextState, changed(p, { fatigue: Math.max(0, p.fatigue - 1), receipts: [...p.receipts, coffeeReceipt(p)],
        reply: { nodeId: p.nodeId, speaker: 'me', text: '杯子有点烫。我慢慢喝完，把手机扣在桌上。先歇几分钟，不急着开下一张图。' } }))
    }
    return patch({ ...nextState, items: [...nextState.items, action.item], heart: nextState.heart + (action.item === 'milktea' ? 2 : 0) },
      changed(p, { receipts: [...p.receipts, `buy:${p.receipts.filter(id => id.startsWith('buy:')).length + 1}:${action.item}`] }))
  }
  if (action.type === 'rest') {
    if (!ldctCanRest(state)) return state
    return patch(state, changed(p, { fatigue: Math.max(0, p.fatigue - 1), completed: [...p.completed, restReceipt(p)],
      reply: { nodeId: p.nodeId, speaker: 'me', text: '我把椅背往后靠了一点。陆舟没催，关掉了屏幕上的邮件。屋里只剩烧水的声音。' } }))
  }
  return state
}
