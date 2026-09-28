import { createLdctLabState, createLdctRecord, isValidLdctRecord, labStateValid } from './ldct-experiments'
import { getLdctChoices, getLdctNode, getLdctSteps } from './ldct'
import { LDCT_FATHER_STORY, LDCT_FATHER_LAB_RETURNS, LDCT_FATHER_LAB_DATASETS, LDCT_NEXT_EVENING } from './ldct-father-story'
import type { LdctAction, LdctPerson, LdctProduct, LdctProgress, LdctStoryShelf } from './ldct-types'
import type { GameState } from './types'
import { LDCT_CHEST_VERSION, LDCT_CHEST_ITERATIONS } from './ldct-chest'
import { LDCT_DEEP_CHEST_VERSION } from './ldct-deep-experiments'
import { LDCT_NOISY_DATA_VERSION, LDCT_NOISY_CHEST_VERSION } from './ldct-noisy-chest'
import { ldctSceneCue } from './ldct-presentation'
import { getLdctScanConfig } from './ldct-scans'

/** Pure transitions: the facade, selected slot, consumption and receipts save once. */
export function getLdctShelf(state: GameState): LdctStoryShelf | undefined {
  return state.dlc?.ldct?.ldctStories
}
export function getLdctProgress(state: GameState): LdctProgress | undefined {
  const shelf = getLdctShelf(state)
  return shelf?.version === 2 && shelf.active === 'father' ? shelf.slots.father : undefined
}
export function getLdctLabDataset(state: GameState): 'phantom' | 'chest' {
  const p = getLdctProgress(state)
  if (p?.openingRevision !== 5 && p?.labRound === 4) return 'phantom'
  // Archived round4 records reopen their original object, never relabelled as chest.
  if (p?.labRound === 4 && p.labDraft.exposureStep === undefined) return 'phantom'
  return LDCT_FATHER_LAB_DATASETS[p?.labRound ?? 1]
}
function withShelf(state: GameState, shelf: LdctStoryShelf): GameState {
  return { ...state, dlc: { ...state.dlc, ldct: { ...state.dlc?.ldct, ldctStories: shelf } } }
}
function patch(state: GameState, p: LdctProgress): GameState {
  const shelf = getLdctShelf(state)!
  if (!p.storyId) return state
  return { ...state, dlc: { ...state.dlc, ldct: { ...state.dlc?.ldct, ldct: p,
    ldctStories: { ...shelf, active: p.storyId, slots: { ...shelf.slots, [p.storyId]: p } } } } }
}
/** Extend unfinished tools, never reinterpret archived checkpoint indices. */
function extendLiveDraft(p: LdctProgress): LdctProgress {
  if (p.phase !== 'lab' || p.labReturn) return p
  if (p.labRound === 4 && p.labDraft.exposureStep !== undefined && p.labDraft.exposureCount === undefined)
    return { ...p, labDraft: { ...p.labDraft, exposureCount: p.labDraft.exposureStep + 1 } }
  if (p.labRound === 5 && p.labDraft.chest && p.labDraft.iterationRound === undefined)
    return { ...p, labDraft: { ...p.labDraft, iterationRound: LDCT_CHEST_ITERATIONS[p.labDraft.iterationStep] } }
  return p
}
/** Keep a prior unsubmitted image choice separate before changing its input data. */
function archiveChestDraft(p: LdctProgress): LdctProgress {
  const previous = p.previousChest
  const prior = previous && (previous.draft || previous.exposureDraft || previous.record) ? {
    draft: previous.draft, exposureDraft: previous.exposureDraft, record: previous.record,
  } : undefined
  return { ...p, previousChest: { ...previous,
    ...(p.labRound === 4 ? { exposureDraft: p.labDraft } : { draft: p.labDraft }),
    ...(p.records[5]?.dataset === 'chest' ? { record: p.records[5] } : {}),
    ...(prior ? { history: [...(previous?.history ?? []), prior] } : {}),
  } }
}
export function initializeLdct(state: GameState, replay = false): GameState {
  const shelf = getLdctShelf(state)
  if (shelf?.version === 2) {
    const current = shelf.slots.father
    if (current && current.chestSourceVersion !== LDCT_NOISY_DATA_VERSION) {
      // Migrate only an unfinished live exercise, including one temporarily
      // closed onto its own introduction. Archived record playback keeps its source.
      const liveLab = !current.finished && !current.labReturn && (current.phase === 'lab' ||
        (current.phase === 'story' && current.nodeId === `lf_lab_${current.labRound}`))
      const replaceDraft = liveLab && current.labDraft.chestDataVersion !== LDCT_NOISY_DATA_VERSION &&
        ((current.labRound === 4 && current.labDraft.exposureStep !== undefined) ||
         (current.labRound === 5 && current.labDraft.chest !== undefined))
      const upgraded = { ...(replaceDraft ? archiveChestDraft(current) : current), chestSourceVersion: LDCT_NOISY_DATA_VERSION,
        labDraft: replaceDraft ? createLdctLabState(current.labRound, 'chest') : current.labDraft }
      state = shelf.active === 'father' ? patch(state, upgraded)
        : withShelf(state, { ...shelf, slots: { ...shelf.slots, father: upgraded } })
    }
    const updatedShelf = getLdctShelf(state)!
    const father = updatedShelf.slots.father
    if (father) {
      const extended = extendLiveDraft(father)
      if (extended !== father) state = updatedShelf.active === 'father' ? patch(state, extended)
        : withShelf(state, { ...updatedShelf, slots: { ...updatedShelf.slots, father: extended } })
    }
    return replay && shelf.active === 'father' ? selectLdctStory(state, 'father', true) : state
  }
  const legacy = state.dlc?.ldct?.ldct
  return withShelf(state, { ...shelf, version: 2, active: undefined, slots: shelf?.slots ?? {}, legacy: shelf?.legacy ?? (shelf ? undefined : legacy),
    receipts: shelf?.receipts ?? (legacy?.receipts ?? []).filter(id => id === 'reward:comparison' || id === 'reward:records'),
    experienced: shelf?.experienced ?? [] })
}
export function selectLdctStory(state: GameState, id: LdctStoryShelf['active'], replay = false): GameState {
  if (id !== 'father') return state
  const story = LDCT_FATHER_STORY
  state = initializeLdct(state)
  const previous = getLdctShelf(state)!.slots[id]
  if (previous && !replay) return patch(state, previous)
  if (previous && previous.openingRevision !== 5) state = withShelf(state, { ...getLdctShelf(state)!, previousFather: previous })
  return patch(state, { version: 1, openingRevision: 5, storyId: id, run: (previous?.run ?? 0) + 1,
    seed: 2258, chestSourceVersion: LDCT_NOISY_DATA_VERSION, phase: 'story', nodeId: story.start, revision: 0, fatigue: 2, completed: [],
    decisions: {}, receipts: [], gifts: [], labRound: 1, labDraft: createLdctLabState(1), records: {},
    start: { gold: state.gold, skill: state.skill, heart: state.heart, wealth: state.wealth } })
}
export function openLdctShelf(state: GameState): GameState {
  const shelf = getLdctShelf(state)
  return shelf ? withShelf(state, { ...shelf, active: undefined }) : initializeLdct(state)
}
function changed(p: LdctProgress, fields: Partial<LdctProgress>): LdctProgress {
  return { ...p, ...fields, revision: p.revision + 1 }
}
function move(state: GameState, p: LdctProgress, id: string): GameState {
  const node = getLdctSteps(p)[id]
  if (!node || p.storyId !== 'father' || !id.startsWith('lf_')) return state
  if (node.enterLab) {
    const dataset = node.labDataset ?? 'phantom'
    const sameRound = p.labRound === node.enterLab
    // An older save may retain a draft while its cursor sits before the lab.
    // Matching the round alone would pair a new first FBP with old lab images.
    const staleChest = sameRound && dataset === 'chest' && p.labDraft.chestDataVersion !== LDCT_NOISY_DATA_VERSION
    const prepared = staleChest ? archiveChestDraft(p) : p
    return patch(state, extendLiveDraft(changed(prepared, { nodeId: id, phase: 'lab', reply: undefined,
      ...(dataset === 'chest' ? { chestSourceVersion: LDCT_NOISY_DATA_VERSION } : {}),
      labRound: node.enterLab, labDraft: sameRound && !staleChest ? p.labDraft : createLdctLabState(node.enterLab, dataset), labReturn: undefined })))
  }
  const finished = node.storyEnd || p.finished
  const next = node.storyEnd && !state.badges.includes('ldct_noise_beyond')
    ? { ...state, badges: [...state.badges, 'ldct_noise_beyond'] } : state
  return patch(next, changed(p, { nodeId: id, phase: node.settle ? 'settle' : 'story', finished, reply: undefined }))
}
const completed = (p: LdctProgress, id?: string) => id && !p.completed.includes(id)
  ? { ...p, completed: [...p.completed, id] } : p

export const LDCT_PRODUCTS = [
  { id: 'coffee' as const, name: '速溶咖啡', icon: '☕', image: 'item_coffee', price: 30, desc: '本篇休息时喝一杯，缓一缓。' },
  { id: 'milktea' as const, name: '全科室奶茶', icon: '🧋', image: 'item_milktea', price: 200, desc: '购买时人心＋2，遇到同事再当面送出。' },
  { id: 'snack' as const, name: '零食礼包', icon: '🍪', image: 'item_snack', price: 40, desc: '当面分享，人心＋1。' },
]
export function ldctItemUnavailable(state: GameState, item: LdctProduct): string | undefined {
  const p = getLdctProgress(state)
  if (!p) return '开始故事后再来看看'
  if (p.finished) return '本篇送礼和休息已结束；已有库存保留'
  const betweenNights = p.phase === 'settle' && p.nodeId === 'lf_night1_end'
  if (betweenNights && item === 'coffee') return '明晚休息时再喝'
  if (!betweenNights && (p.phase !== 'story' || getLdctNode(state).kind !== 'hub' || p.reply)) return '先聊完，休息时再买'
  if (item === 'coffee') return p.receipts.includes('coffee') ? '已经喝过一杯了，留点时间睡觉' : undefined
  if (state.items.includes(item)) return '背包里还有，先送出去再买'
  return undefined
}
export function ldctGiftChoices(state: GameState): { person: LdctPerson; item: 'milktea' | 'snack'; text: string }[] {
  const p = getLdctProgress(state)
  if (!p || p.phase !== 'story' || p.reply) return []
  const person = getLdctNode(state).giftPerson
  if (!person || p.gifts.some(g => g.person === person)) return []
  return (['milktea', 'snack'] as const).filter(item => state.items.includes(item)).map(item => ({
    person, item, text: item === 'milktea' ? '🧋 把奶茶递过去' : '🍪 拆开零食一起吃',
  }))
}
const giftReplies: Record<LdctPerson, Record<'milktea' | 'snack', string>> = {
  luzhou: { milktea: '还有我的？那我不客气了。……先别开电脑，让我喝两口。', snack: '这个我本科常买。你还记得啊。等我把这口咽了。' },
  lei: { milktea: '谢了。等下，我先腾只手。', snack: '分我两块。别往键盘上掉啊，昨天按空格跟嚼脆骨似的。' },
  he: { milktea: '正想找点喝的。放这儿，谢啦。', snack: '好，揣兜里。省得下班又在微波炉里发现我的午饭。' },
}
export function ldctCanRest(state: GameState) {
  const p = getLdctProgress(state)
  return !!p && p.phase === 'story' && !p.reply && getLdctNode(state).kind === 'hub' && !p.completed.includes('rest')
}
export function ldctAction(state: GameState, action: LdctAction): GameState {
  const p = getLdctProgress(state)
  if (p?.storyId !== 'father') return state
  const scan = getLdctScanConfig(p.nodeId, p.openingRevision ?? 4)
  if (action.type === 'scan:start' || action.type === 'scan:complete') {
    if (!scan || p.phase !== 'story' || p.reply || action.nodeId !== p.nodeId || !Number.isFinite(action.now) || action.now <= 0) return state
    const session = p.scanSessions?.[p.nodeId]
    if (action.type === 'scan:start') return session ? state : patch(state, { ...p,
      scanSessions: { ...p.scanSessions, [p.nodeId]: { startedAt: action.now, completed: false } } })
    if (!session || action.now - session.startedAt < scan.durationMs) return state
    const next = getLdctNode(state).next
    return next ? move(state, { ...p, scanSessions: { ...p.scanSessions,
      [p.nodeId]: { ...session, completed: true } } }, next) : state
  }
  // A saved acquisition is advanced only by its clock, never scene/keyboard clicks.
  if (scan && p.phase === 'story') return state
  if (action.type === 'media:heard') {
    if (p.phase !== 'story' || p.reply || p.nodeId !== action.nodeId || ldctSceneCue(p.nodeId, state.gender)?.id !== action.cueId) return state
    const receipt = `media:${action.cueId}`
    return p.receipts.includes(receipt) ? state : patch(state, { ...p, receipts: [...p.receipts, receipt] })
  }
  if (action.type === 'reply:close') return p.reply ? patch(state, changed(p, { reply: undefined })) : state
  if (action.type === 'advance' || action.type === 'choose') {
    if (p.phase !== 'story' || p.reply || action.nodeId !== p.nodeId) return state
    const node = getLdctNode(state)
    // Returning to the introduction never discards an unfinished experiment.
    if (action.type === 'advance' && node.enterLab)
      return move(state, p, node.id)
    if (action.type === 'advance') {
      if (!node.next || node.choices?.length) return state
      return move(state, completed(p, node.complete), node.next)
    }
    const choice = getLdctChoices(state).find(c => c.id === action.choiceId)
    if (!choice) return state
    let next = completed(p, choice.complete)
    if (choice.decision) next = { ...next, decisions: { ...next.decisions, [choice.decision.key]: choice.decision.value } }
    return move(state, next, choice.next)
  }
  if (action.type === 'lab:update') {
    if (p.phase !== 'lab' || !labStateValid(action.value, p.labRound)) return state
    if (action.value.chestDataVersion !== p.labDraft.chestDataVersion) return state
    if (p.labRound === 4 && (action.value.exposureStep !== undefined) !== (getLdctLabDataset(state) === 'chest')) return state
    if ((p.labDraft.exposureCount !== undefined) !== (action.value.exposureCount !== undefined)
      || (p.labDraft.iterationRound !== undefined) !== (action.value.iterationRound !== undefined)) return state
    return patch(state, { ...p, labDraft: action.value })
  }
  if (action.type === 'lab:submit') {
    if (p.phase !== 'lab' || !isValidLdctRecord(action.record, p.labRound)) return state
    const expected = createLdctRecord({ ...p.labDraft, helped: action.record.helped }, p.labRound, action.record.verdict, getLdctLabDataset(state))
    if (!expected || JSON.stringify(expected) !== JSON.stringify(action.record)) return state
    const shelf = getLdctShelf(state)!
    const first = !shelf.receipts.includes('reward:comparison')
    const experienced = [...new Set([...shelf.experienced, p.labRound])]
    const organized = experienced.length === 5 && !shelf.receipts.includes('reward:records')
    const receipts = [...shelf.receipts, ...(first ? ['reward:comparison'] : []), ...(organized ? ['reward:records'] : [])]
    let next = withShelf(state, { ...shelf, receipts, experienced })
    if (first) next = { ...next, skill: next.skill + 1, badges: next.badges.includes('ldct_first_comparison') ? next.badges : [...next.badges, 'ldct_first_comparison'] }
    if (organized) next = { ...next, wealth: next.wealth + 1 }
    const progress = { ...p, records: { ...p.records, [p.labRound]: action.record } }
    const returnNode = p.openingRevision !== 5 && p.labRound === 4 ? 'lf_after_noise_0' : LDCT_FATHER_LAB_RETURNS[p.labRound]
    return move(next, { ...progress, labReturn: undefined }, p.labReturn ?? returnNode)
  }
  if (action.type === 'lab:open') {
    if (p.phase !== 'settle' || !p.records[action.round]) return state
    const record = p.records[action.round]!
    const oldChest = record.dataset === 'chest' && action.round === 5 && record.sourceVersion !== LDCT_CHEST_VERSION && record.sourceVersion !== LDCT_DEEP_CHEST_VERSION && record.sourceVersion !== LDCT_NOISY_CHEST_VERSION
    const draft = oldChest ? createLdctLabState(5, 'chest') : { ...createLdctLabState(action.round, record.dataset === 'chest' ? 'chest' : 'phantom'), ...record,
      chestDataVersion: record.chestDataVersion, exposureCount: record.exposureCount, iterationRound: record.iterationRound, saved: null }
    return patch(state, changed(p, { phase: 'lab', labRound: action.round, labDraft: draft, labReturn: p.nodeId }))
  }
  if (action.type === 'lab:close') {
    if (p.phase !== 'lab') return state
    if (p.labReturn) return move(state, { ...p, labReturn: undefined }, p.labReturn)
    return patch(state, changed(p, { phase: 'story' }))
  }
  if (action.type === 'gift') {
    if (p.nodeId !== action.nodeId || !ldctGiftChoices(state).some(g => g.person === action.person && g.item === action.item)) return state
    return patch({ ...state, items: state.items.filter(id => id !== action.item), heart: state.heart + (action.item === 'snack' ? 1 : 0) },
      changed(p, { gifts: [...p.gifts, { person: action.person, item: action.item, nodeId: p.nodeId }],
        reply: { nodeId: p.nodeId, speaker: action.person, text: giftReplies[action.person][action.item] } }))
  }
  if (action.type === 'buy') {
    const product = LDCT_PRODUCTS.find(item => item.id === action.item)
    if (!product || ldctItemUnavailable(state, action.item) || state.gold < product.price) return state
    const next = { ...state, gold: state.gold - product.price }
    if (action.item === 'coffee') return patch(next, changed(p, { fatigue: Math.max(0, p.fatigue - 1), receipts: [...p.receipts, 'coffee'],
      reply: { nodeId: p.nodeId, speaker: 'me', text: '刚想一口闷，被烫得缩了回去。陆舟把纸巾推过来，憋着没笑。' } }))
    return patch({ ...next, items: [...next.items, action.item], heart: next.heart + (action.item === 'milktea' ? 2 : 0) },
      changed(p, { receipts: [...p.receipts, `buy:${p.receipts.length}:${action.item}`] }))
  }
  if (action.type === 'rest') {
    if (!ldctCanRest(state)) return state
    return patch(state, changed(p, { fatigue: Math.max(0, p.fatigue - 1), completed: [...p.completed, 'rest'],
      reply: { nodeId: p.nodeId, speaker: 'me', text: '我往椅背上一靠。陆舟也没说话，给水壶按了个重烧。' } }))
  }
  if (action.type === 'part:next') {
    if (p.phase !== 'settle' || p.nodeId !== 'lf_night1_end' || p.finished) return state
    return move(state, { ...p, fatigue: 2, partStart: { gold: state.gold, skill: state.skill, heart: state.heart, wealth: state.wealth } }, p.openingRevision === 5 ? LDCT_NEXT_EVENING : 'lf_evening2')
  }
  // Old research actions cannot reach a deleted workbench or mutate archived saves.
  return state
}
