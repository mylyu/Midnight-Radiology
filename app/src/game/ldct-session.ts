import { createLdctLabState, createLdctPhantomPreparationState, createLdctRecord, isValidLdctRecord, labStateValid } from './ldct-experiments'
import { getLdctChoices, getLdctNode, getLdctSteps } from './ldct'
import { LDCT_FATHER_STORY, LDCT_FATHER_LAB_RETURNS, LDCT_FATHER_LAB_DATASETS, LDCT_NEXT_EVENING } from './ldct-father-story'
import type { LdctAction, LdctPerson, LdctProduct, LdctProgress, LdctStoryShelf } from './ldct-types'
import type { GameState } from './types'
import { LDCT_CHEST_VERSION, LDCT_CHEST_ITERATIONS } from './ldct-chest'
import { LDCT_DEEP_CHEST_VERSION } from './ldct-deep-experiments'
import { LDCT_NOISY_DATA_VERSION, LDCT_NOISY_CHEST_VERSION } from './ldct-noisy-chest'
import { ldctSceneCue } from './ldct-presentation'
import { getLdctScanConfig } from './ldct-scans'
import { getLdctSpeedKind, LDCT_SPEED_CHALLENGES, startLdctSpeed, stopLdctSpeedChallenges, tapLdctSpeed, validLdctSpeedTime } from './ldct-speed-challenge'
import { canAdoptPhantomPreparation, LDCT_PHANTOM_PREPARATION_RETURNS } from './ldct-phantom-story'
import { LDCT_PHANTOM_EXPOSURE_VERSION } from './ldct-phantom-exposure'

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
  if (p?.labContext === 'patient' && p.labRound === 5) return 'chest'
  if (p?.labDraft.phantomDataVersion === LDCT_PHANTOM_EXPOSURE_VERSION) return 'phantom'
  if (p?.phantomPreparation && !p.labReturn) return 'phantom'
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
  const storyId = p.storyId
  if (!storyId) return state
  if (p.labContext === 'patient' && p.labRound === 5)
    p = { ...p, patientIteration: { ...p.patientIteration, draft: p.labDraft } }
  return { ...state, dlc: { ...state.dlc, ldct: { ...state.dlc?.ldct, ldct: p,
    ldctStories: { ...shelf, active: storyId, slots: { ...shelf.slots, [storyId]: p } } } } }
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
      let extended = extendLiveDraft(father)
      // Only an unstarted trial adopts the new order without resetting any work.
      if (father.openingRevision === 5 && !father.phantomPreparation && !father.finished &&
        !father.labReturn && !Object.keys(father.records).length && canAdoptPhantomPreparation(father.nodeId))
        extended = { ...extended, phantomPreparation: 1 }
      // Those published cursors belonged to night one. Preserve that consultation
      // before the unplayed trial; a new next-day arrival already has partStart.
      if (father.openingRevision === 5 && father.phantomPreparation === 1 && !father.consultationBeforeTrial &&
        father.phase === 'story' && !father.finished && !father.labReturn && !father.partStart &&
        !Object.keys(father.records).length && /^(lf_wait_consult|lf_consult_[012])$/.test(father.nodeId))
        extended = { ...extended, consultationBeforeTrial: 1 }
      // Unfinished preview saves in the removed epilogue join the new ending.
      // Completed runs and frozen v4 saves keep their own ending/history.
      if (father.openingRevision === 5 && !father.finished && !father.labReturn &&
        /^lf_(clinical(?:_preview|_\d+)|depart_\d+|weeks_\d+|final_lu_\d+)$/.test(father.nodeId))
        extended = { ...extended, phase: 'story', nodeId: 'lf_caught_0', revision: father.revision + 1,
          reply: undefined, decisions: { ...father.decisions, previous_ending_node: father.nodeId } }
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
  if (previous && !previous.phantomPreparation) state = withShelf(state, { ...getLdctShelf(state)!, previousFather: previous })
  return patch(state, { version: 1, openingRevision: 5, phantomPreparation: 1, storyId: id, run: (previous?.run ?? 0) + 1,
    seed: 2258, chestSourceVersion: LDCT_NOISY_DATA_VERSION, phase: 'story', nodeId: story.start, revision: 0, fatigue: 2, completed: [],
    decisions: {}, receipts: [], gifts: [], labRound: 1, labDraft: createLdctLabState(1), records: {},
    start: { gold: state.gold, skill: state.skill, heart: state.heart, wealth: state.wealth } })
}
export function openLdctShelf(state: GameState): GameState {
  const progress = getLdctProgress(state)
  if (progress) state = patch(state, stopLdctSpeedChallenges(progress))
  const shelf = getLdctShelf(state)
  return shelf ? withShelf(state, { ...shelf, active: undefined }) : initializeLdct(state)
}
function changed(p: LdctProgress, fields: Partial<LdctProgress>): LdctProgress {
  return { ...p, ...fields, revision: p.revision + 1 }
}
function move(state: GameState, p: LdctProgress, id: string): GameState {
  p = stopLdctSpeedChallenges(p)
  const node = getLdctSteps(p)[id]
  if (!node || p.storyId !== 'father' || !id.startsWith('lf_')) return state
  if (node.enterLab) {
    if (node.labContext === 'patient' && node.enterLab === 5) {
      const draft = p.patientIteration?.draft ?? createLdctLabState(5, 'chest')
      return patch(state, changed(p, { nodeId: id, phase: 'lab', reply: undefined,
        labRound: 5, labContext: 'patient', labDraft: draft, labReturn: undefined,
        chestSourceVersion: LDCT_NOISY_DATA_VERSION }))
    }
    const dataset = node.labDataset ?? 'phantom'
    const sameRound = p.labRound === node.enterLab && !p.labContext
    // An older save may retain a draft while its cursor sits before the lab.
    // Matching the round alone would pair a new first FBP with old lab images.
    const staleChest = sameRound && dataset === 'chest' && p.labDraft.chestDataVersion !== LDCT_NOISY_DATA_VERSION
    const phantomTrial = p.phantomPreparation === 1 && (node.enterLab === 4 || node.enterLab === 5)
    const stalePhantom = phantomTrial && p.labDraft.phantomDataVersion !== LDCT_PHANTOM_EXPOSURE_VERSION
    const prepared = staleChest ? archiveChestDraft(p) : p
    return patch(state, extendLiveDraft(changed(prepared, { nodeId: id, phase: 'lab', reply: undefined,
      ...(dataset === 'chest' ? { chestSourceVersion: LDCT_NOISY_DATA_VERSION } : {}),
      labRound: node.enterLab, labContext: undefined, labDraft: sameRound && !staleChest && !stalePhantom ? p.labDraft
        : phantomTrial ? createLdctPhantomPreparationState(node.enterLab as 4 | 5) : createLdctLabState(node.enterLab, dataset), labReturn: undefined })))
  }
  const finished = node.storyEnd || p.finished
  const next = node.storyEnd && !state.badges.includes('ldct_noise_beyond')
    ? { ...state, badges: [...state.badges, 'ldct_noise_beyond'] } : state
  return patch(next, changed(p, { nodeId: id, phase: node.settle ? 'settle' : 'story', finished, reply: undefined, labContext: undefined }))
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
  const node = getLdctNode(state)
  const settlement = p.phase === 'settle' && node.settle && (node.settlement || p.nodeId === 'lf_night1_end')
  if (settlement && item === 'coffee') return node.settlement ? '和同事闲聊休息时再喝' : '明晚休息时再喝'
  if (!settlement && (p.phase !== 'story' || node.kind !== 'hub' || p.reply)) return '先聊完，休息时再买'
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
  if (action.type === 'challenge:start' || action.type === 'challenge:tap' || action.type === 'challenge:expire' || action.type === 'challenge:stop' || action.type === 'challenge:practice') {
    const kind = getLdctSpeedKind(p)
    if (!kind || action.nodeId !== p.nodeId || !validLdctSpeedTime(action.now)) return state
    const current = p.speedChallenges?.[kind]
    if (action.type === 'challenge:start') {
      if (current?.status === 'running') return state
      const challenge = startLdctSpeed(kind, p.nodeId, action.now, current)
      const draft = { ...p.labDraft, saved: null, helped: false, practice: undefined,
        ...(kind === 'backproject' ? { bpCount: 1 } : { iterationRound: 0,
          ...(p.labDraft.chest ? { chest: { ...p.labDraft.chest, compareFbp: false, pinned: null, mark: null } } : {}) }) }
      return patch(state, { ...p, labDraft: draft, speedChallenges: { ...p.speedChallenges, [kind]: challenge } })
    }
    if (action.type === 'challenge:practice') {
      const challenge = { ...(current ?? startLdctSpeed(kind, p.nodeId, action.now)), status: 'practice' as const }
      return patch(state, { ...p, labDraft: { ...p.labDraft, practice: true }, speedChallenges: { ...p.speedChallenges, [kind]: challenge } })
    }
    if (!current || current.status !== 'running') return state
    if (action.type === 'challenge:tap') {
      const challenge = tapLdctSpeed(kind, current, action.now, action.attempt, action.tap)
      if (challenge === current) return state
      const badge = LDCT_SPEED_CHALLENGES[kind].badge
      const next = challenge.status === 'won' && !state.badges.includes(badge) ? { ...state, badges: [...state.badges, badge] } : state
      return patch(next, { ...p, speedChallenges: { ...p.speedChallenges, [kind]: challenge },
        labDraft: challenge.acceptedTaps === current.acceptedTaps ? { ...p.labDraft, ...(challenge.status === 'expired' ? { practice: true as const } : {}) } : { ...p.labDraft, saved: null,
          ...(kind === 'backproject' ? { bpCount: challenge.progress } : { iterationRound: challenge.progress,
            ...(p.labDraft.chest ? { chest: { ...p.labDraft.chest, compareFbp: false } } : {}) }) } })
    }
    if (action.type === 'challenge:expire' && action.now < current.deadline) return state
    if (action.now < current.startedAt) return state
    return patch(state, { ...p, labDraft: { ...p.labDraft, practice: true }, speedChallenges: { ...p.speedChallenges, [kind]: { ...current,
      status: action.type === 'challenge:expire' ? 'expired' : 'stopped' } } })
  }
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
    const charge = choice.goldCost && !p.receipts.includes(choice.costReceipt ?? `choice:${node.id}:${choice.id}`)
      ? choice.goldCost : 0
    if (charge > state.gold) return state
    if (charge) next = { ...next, receipts: [...next.receipts, choice.costReceipt ?? `choice:${node.id}:${choice.id}`] }
    if (choice.decision) next = { ...next, decisions: { ...next.decisions, [choice.decision.key]: choice.decision.value } }
    return move(charge ? { ...state, gold: state.gold - charge } : state, next, choice.next)
  }
  if (action.type === 'lab:update') {
    if (p.phase !== 'lab' || !labStateValid(action.value, p.labRound)) return state
    if (action.value.chestDataVersion !== p.labDraft.chestDataVersion) return state
    if (action.value.phantomDataVersion !== p.labDraft.phantomDataVersion) return state
    if (action.value.practice !== p.labDraft.practice) return state
    if (p.labRound === 4 && (action.value.exposureStep !== undefined) !== (getLdctLabDataset(state) === 'chest' || !!p.labDraft.phantomDataVersion)) return state
    if ((p.labDraft.exposureCount !== undefined) !== (action.value.exposureCount !== undefined)
      || (p.labDraft.iterationRound !== undefined) !== (action.value.iterationRound !== undefined)) return state
    const kind = getLdctSpeedKind(p)
    if (kind && p.speedChallenges?.[kind]?.status === 'running' &&
      (action.value.bpCount !== p.labDraft.bpCount || action.value.bpStep !== p.labDraft.bpStep ||
       action.value.iterationRound !== p.labDraft.iterationRound || action.value.iterationStep !== p.labDraft.iterationStep)) return state
    return patch(state, { ...p, labDraft: action.value })
  }
  if (action.type === 'lab:submit') {
    if (p.phase !== 'lab' || !isValidLdctRecord(action.record, p.labRound)) return state
    const expected = createLdctRecord({ ...p.labDraft, helped: action.record.helped }, p.labRound, action.record.verdict, getLdctLabDataset(state))
    if (!expected || JSON.stringify(expected) !== JSON.stringify(action.record)) return state
    if (p.labContext === 'patient') {
      const progress = { ...p, labReturn: undefined,
        patientIteration: { draft: p.labDraft, record: action.record } }
      return move(state, progress, p.labReturn ?? 'lf_after_iteration_0')
    }
    const shelf = getLdctShelf(state)!
    const first = !shelf.receipts.includes('reward:comparison')
    const experienced = [...new Set([...shelf.experienced, p.labRound])]
    const organized = experienced.length === 5 && !shelf.receipts.includes('reward:records')
    const receipts = [...shelf.receipts, ...(first ? ['reward:comparison'] : []), ...(organized ? ['reward:records'] : [])]
    let next = withShelf(state, { ...shelf, receipts, experienced })
    if (first) next = { ...next, skill: next.skill + 1, badges: next.badges.includes('ldct_first_comparison') ? next.badges : [...next.badges, 'ldct_first_comparison'] }
    if (organized) next = { ...next, wealth: next.wealth + 1 }
    const demonstratedExposure = p.phantomPreparation && p.labRound === 4 && action.record.helped && (action.record.exposureCount ?? 13) < 13
    const progress = { ...p, records: { ...p.records, [p.labRound]: action.record },
      ...(demonstratedExposure ? { decisions: { ...p.decisions, phantom_exposure_demo: 'completed13' } } : {}) }
    const returnNode = p.phantomPreparation ? LDCT_PHANTOM_PREPARATION_RETURNS[p.labRound]
      : p.openingRevision !== 5 && p.labRound === 4 ? 'lf_after_noise_0' : LDCT_FATHER_LAB_RETURNS[p.labRound]
    return move(next, { ...progress, labReturn: undefined }, p.labReturn ?? returnNode)
  }
  if (action.type === 'lab:open') {
    if (p.phase !== 'settle' || (action.context === 'patient' && action.round !== 5)) return state
    const record = action.context === 'patient' ? p.patientIteration?.record : p.records[action.round]
    if (!record) return state
    const oldChest = record.dataset === 'chest' && action.round === 5 && record.sourceVersion !== LDCT_CHEST_VERSION && record.sourceVersion !== LDCT_DEEP_CHEST_VERSION && record.sourceVersion !== LDCT_NOISY_CHEST_VERSION
    const draft = oldChest ? createLdctLabState(5, 'chest') : { ...createLdctLabState(action.round, record.dataset === 'chest' ? 'chest' : 'phantom'), ...record,
      chestDataVersion: record.chestDataVersion, exposureCount: record.exposureCount, iterationRound: record.iterationRound, saved: null }
    return patch(state, changed(p, { phase: 'lab', labRound: action.round, labContext: action.context, labDraft: draft, labReturn: p.nodeId }))
  }
  if (action.type === 'lab:close') {
    if (p.phase !== 'lab') return state
    if (p.labReturn) return move(state, { ...p, labReturn: undefined }, p.labReturn)
    return patch(state, changed(stopLdctSpeedChallenges(p), { phase: 'story' }))
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
    if (p.phase !== 'settle' || p.finished || p.reply) return state
    const node = getLdctNode(state)
    if (!node.settle) return state
    const next = node.settlement?.next ?? (p.nodeId === 'lf_night1_end'
      ? p.openingRevision === 5 ? LDCT_NEXT_EVENING : 'lf_evening2' : undefined)
    if (!next) return state
    return move(state, { ...p, fatigue: 2, partStart: { gold: state.gold, skill: state.skill, heart: state.heart, wealth: state.wealth } }, next)
  }
  // Old research actions cannot reach a deleted workbench or mutate archived saves.
  return state
}
