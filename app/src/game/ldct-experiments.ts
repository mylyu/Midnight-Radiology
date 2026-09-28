import { LDCT_BP_COUNTS, LDCT_ITERATIONS, LDCT_DATASET_MEDIA_IDS, LDCT_DATASET_VERSION, LDCT_DATASET_SEEDS, LDCT_STRUCTURES, type LdctDataset as ProjectionDataset } from './ldct-projections'
import { LDCT_CHEST_MEDIA_IDS, LDCT_CHEST_SEED, LDCT_CHEST_VERSION, LDCT_CHEST_LEGACY_VERSIONS } from './ldct-chest'
import { LDCT_EXPOSURE_VERSION, LDCT_EXPOSURE_MEDIA_ID } from './ldct-exposure'
import { LDCT_MANUAL_BP_COUNTS, LDCT_MANUAL_BP_MEDIA_ID } from './ldct-manual-bp'
import { LDCT_FILTER_OPTIONS } from './ldct-filter-response'
export { LDCT_FILTER_OPTIONS } from './ldct-filter-response'
export type { LdctFilter } from './ldct-filter-response'
import type { LdctFilter } from './ldct-filter-response'

/** Serialized controls, not a score: completing an experiment means looking, not guessing right. */
export const LDCT_PHANTOM_VERSION = LDCT_DATASET_VERSION
export const LDCT_PHANTOM_SEED = 2258 as const
/** Legacy face/nut records stay readable; their retired image atlases are not preloaded. */
export const LDCT_LAB_MEDIA_IDS = [LDCT_DATASET_MEDIA_IDS.phantom, ...LDCT_CHEST_MEDIA_IDS, LDCT_EXPOSURE_MEDIA_ID, LDCT_MANUAL_BP_MEDIA_ID]
export type LdctDataset = ProjectionDataset | 'chest'
export type LdctLabRound = 1 | 2 | 3 | 4 | 5
export type LdctLabStage = 'trace' | 'backproject' | 'filter' | 'noise' | 'iterate'
export type LdctSignal = 'low' | 'medium' | 'high'
export type LdctMark = { x: number; y: number }
/** A player's observation only; no location is scored against the hidden phantom truth. */
export type LdctChestDraft = {
  slice: 0 | 1 | 2
  pinned: { slice: 0 | 1 | 2; iterationStep: number } | null
  mark: (LdctMark & { slice: 0 | 1 | 2; iterationStep: number; method: 'fbp' | 'iteration' }) | null
  compareFbp: boolean
}
export const createLdctChestDraft = (): LdctChestDraft => ({ slice: 1, pinned: null, mark: null, compareFbp: false })
export const LDCT_LAB_STAGES: Record<LdctLabRound, LdctLabStage> = {
  1: 'trace', 2: 'backproject', 3: 'filter', 4: 'noise', 5: 'iterate',
}
export const LDCT_LAB_TITLES: Record<LdctLabRound, string> = {
  1: '给小点找轨迹', 2: '把影子铺回去', 3: '给反投影换副眼镜', 4: '光子少了以后', 5: '猜一版，再对一次',
}
export const LDCT_FILTER_LABELS: Record<LdctFilter, string> = {
  none: '不滤波 · 直接反投影', ramp: '锐一些 · Ramp', 'shepp-logan': '折中 · Shepp–Logan',
  cosine: '余弦 · Cosine', hamming: 'Hamming窗', hann: '柔一些 · Hann',
}
export type LdctLabRecord = {
  round: LdctLabRound
  stage: LdctLabStage
  structure: string | null
  angle: number
  bpStep: number
  filter: LdctFilter
  signal: LdctSignal
  iterationStep: number
  helped: boolean
  verdict: 'different' | 'uncertain'
  sourceVersion: typeof LDCT_PHANTOM_VERSION | typeof LDCT_CHEST_VERSION | typeof LDCT_EXPOSURE_VERSION | typeof LDCT_CHEST_LEGACY_VERSIONS[number] | 'ldct-short-v1' | 'ldct-projection-v2'
  seed: typeof LDCT_DATASET_SEEDS[ProjectionDataset] | typeof LDCT_CHEST_SEED
  dataset?: LdctDataset | 'sparse-filter-v1' | 'full-projection-v2'
  chest?: LdctChestDraft
  exposureStep?: number
  /** Actual direction count; old bpStep remains indexed into the historical checkpoints. */
  bpCount?: number
}
export type LdctLabState = {
  round: LdctLabRound
  structure: string | null
  angle: number
  seenAngles: number[]
  seenStructures: string[]
  bpStep: number
  filter: LdctFilter
  seenFilters: LdctFilter[]
  signal: LdctSignal
  seenSignals: LdctSignal[]
  iterationStep: number
  seenIterations: number[]
  divider: number
  mark: LdctMark | null
  helped: boolean
  saved: LdctLabRecord | null
  chest?: LdctChestDraft
  exposureStep?: number
  bpCount?: number
}

export const createLdctLabState = (round: LdctLabRound = 1, dataset: LdctDataset = 'phantom'): LdctLabState => ({
  round, structure: null, angle: 0, seenAngles: [], seenStructures: [], bpStep: 0,
  filter: 'ramp', seenFilters: ['ramp'], signal: round === 5 ? 'low' : 'high', seenSignals: [round === 5 ? 'low' : 'high'],
  iterationStep: 0, seenIterations: [0], divider: 50, mark: null, helped: false, saved: null,
  ...(dataset === 'chest' && round === 5 ? { chest: createLdctChestDraft() } : {}),
  ...(dataset === 'chest' && round === 4 ? { exposureStep: 0 } : {}),
})

const signals = ['low', 'medium', 'high']
const filters: readonly string[] = LDCT_FILTER_OPTIONS
const finiteBetween = (n: unknown, min: number, max: number) => typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max
const integerBetween = (n: unknown, min: number, max: number) => finiteBetween(n, min, max) && Number.isInteger(n)
const validStructure = (id: unknown) => id === null || LDCT_STRUCTURES.some(s => s.id === id)
const validChestVersion = (version: string) => version === LDCT_CHEST_VERSION || (LDCT_CHEST_LEGACY_VERSIONS as readonly string[]).includes(version)
const validChest = (chest: LdctChestDraft | undefined): boolean => chest === undefined || Boolean(chest &&
  integerBetween(chest.slice, 0, 2) && typeof chest.compareFbp === 'boolean' &&
  (chest.pinned === null || (chest.pinned && integerBetween(chest.pinned.slice, 0, 2) && integerBetween(chest.pinned.iterationStep, 0, LDCT_ITERATIONS.length - 1))) &&
  (chest.mark === null || (chest.mark && finiteBetween(chest.mark.x, 0, 100) && finiteBetween(chest.mark.y, 0, 100) &&
    integerBetween(chest.mark.slice, 0, 2) && integerBetween(chest.mark.iterationStep, 0, LDCT_ITERATIONS.length - 1) &&
    ['fbp', 'iteration'].includes(chest.mark.method))))

export function isValidLdctRecord(record: LdctLabRecord, round: LdctLabRound): boolean {
  const chestRecord = Boolean(record && record.dataset === 'chest' && record.seed === LDCT_CHEST_SEED && (
    (round === 5 && validChestVersion(record.sourceVersion) && record.chest !== undefined && record.exposureStep === undefined) ||
    (round === 4 && record.sourceVersion === LDCT_EXPOSURE_VERSION && integerBetween(record.exposureStep, 0, 3) && record.chest === undefined)))
  return Boolean([1, 2, 3, 4, 5].includes(round) && record && record.round === round && record.stage === LDCT_LAB_STAGES[round] &&
    (((record.sourceVersion === LDCT_PHANTOM_VERSION || record.sourceVersion === 'ldct-short-v1') && record.dataset !== undefined && record.dataset in LDCT_DATASET_SEEDS &&
      record.seed === LDCT_DATASET_SEEDS[record.dataset as ProjectionDataset]) ||
      chestRecord ||
      (record.sourceVersion === 'ldct-projection-v2' && record.seed === LDCT_PHANTOM_SEED)) &&
    validStructure(record.structure) && finiteBetween(record.angle, 0, 179) &&
    integerBetween(record.bpStep, 0, LDCT_BP_COUNTS.length - 1) && filters.includes(record.filter) &&
    signals.includes(record.signal) && integerBetween(record.iterationStep, 0, LDCT_ITERATIONS.length - 1) &&
    typeof record.helped === 'boolean' && ['different', 'uncertain'].includes(record.verdict) &&
    (record.dataset === undefined || ['phantom', 'face', 'nut', 'chest', 'sparse-filter-v1', 'full-projection-v2'].includes(record.dataset)) &&
    (record.dataset !== 'chest' || chestRecord) &&
    (record.exposureStep === undefined || (round === 4 && chestRecord)) &&
    (record.bpCount === undefined || (round === 2 && record.dataset === 'phantom' && (LDCT_MANUAL_BP_COUNTS as readonly number[]).includes(record.bpCount))) &&
    validChest(record.chest) && (record.chest === undefined || (record.dataset === 'chest' && round === 5)))
}

export function labStateValid(value: LdctLabState, round: LdctLabRound): boolean {
  return Boolean([1, 2, 3, 4, 5].includes(round) && value && value.round === round && validStructure(value.structure) &&
    finiteBetween(value.angle, 0, 179) && Array.isArray(value.seenAngles) && value.seenAngles.every(n => finiteBetween(n, 0, 179)) &&
    Array.isArray(value.seenStructures) && value.seenStructures.every(id => id !== null && validStructure(id)) &&
    integerBetween(value.bpStep, 0, LDCT_BP_COUNTS.length - 1) && filters.includes(value.filter) &&
    Array.isArray(value.seenFilters) && value.seenFilters.every(f => filters.includes(f)) &&
    signals.includes(value.signal) && Array.isArray(value.seenSignals) && value.seenSignals.every(s => signals.includes(s)) &&
    integerBetween(value.iterationStep, 0, LDCT_ITERATIONS.length - 1) &&
    Array.isArray(value.seenIterations) && value.seenIterations.every(n => integerBetween(n, 0, LDCT_ITERATIONS.length - 1)) &&
    finiteBetween(value.divider, 0, 100) &&
    (value.mark === null || (finiteBetween(value.mark?.x, 0, 100) && finiteBetween(value.mark?.y, 0, 100))) &&
    typeof value.helped === 'boolean' && (value.saved === null || isValidLdctRecord(value.saved, round)) &&
    validChest(value.chest) && (value.chest === undefined || round === 5) &&
    (value.exposureStep === undefined || (round === 4 && integerBetween(value.exposureStep, 0, 3))) &&
    (value.bpCount === undefined || (round === 2 && (LDCT_MANUAL_BP_COUNTS as readonly number[]).includes(value.bpCount))))
}

export function ldctExperimentReady(state: LdctLabState, round: LdctLabRound): boolean {
  if (!labStateValid(state, round)) return false
  if (state.helped) return true
  switch (round) {
    case 1: return state.seenStructures.length > 0 || state.seenAngles.length > 0
    case 2: return state.bpCount !== undefined ? state.bpCount > 1 : state.bpStep > 0
    case 3: return state.seenFilters.length > 1 || state.filter !== 'ramp'
    case 4: return state.exposureStep !== undefined ? state.exposureStep > 0 : state.seenSignals.length > 1 || state.signal !== 'high'
    case 5: return state.seenIterations.some(n => n > 0) || state.iterationStep > 0
  }
}

export function createLdctRecord(state: LdctLabState, round: LdctLabRound, verdict: LdctLabRecord['verdict'], dataset: LdctDataset = 'phantom'): LdctLabRecord | null {
  if (!ldctExperimentReady(state, round) || (dataset === 'chest' && round !== 4 && round !== 5) ||
    (dataset === 'chest' && round === 4 && state.exposureStep === undefined) ||
    (state.exposureStep !== undefined && dataset !== 'chest') || (state.bpCount !== undefined && dataset !== 'phantom')) return null
  const chest = state.chest ?? createLdctChestDraft()
  return {
    round, stage: LDCT_LAB_STAGES[round], structure: state.structure, angle: state.angle,
    bpStep: state.bpStep, filter: state.filter, signal: state.signal, iterationStep: state.iterationStep,
    helped: state.helped, verdict, sourceVersion: dataset === 'chest' ? (round === 4 ? LDCT_EXPOSURE_VERSION : LDCT_CHEST_VERSION) : LDCT_PHANTOM_VERSION,
    seed: dataset === 'chest' ? LDCT_CHEST_SEED : LDCT_DATASET_SEEDS[dataset],
    dataset,
    ...(dataset === 'chest' && round === 5 ? { chest: { ...chest, pinned: chest.pinned && { ...chest.pinned }, mark: chest.mark && { ...chest.mark } } } : {}),
    ...(dataset === 'chest' && round === 4 ? { exposureStep: state.exposureStep } : {}),
    ...(dataset === 'phantom' && round === 2 && state.bpCount !== undefined ? { bpCount: state.bpCount } : {}),
  }
}

export function ldctRecordSummary(record: LdctLabRecord): string {
  if (record.dataset === 'chest' && record.round === 4) return `胸部模拟累计曝光 · ${(record.exposureStep ?? 0) + 1}/4份 · 固定显示窗`
  if (record.dataset === 'chest' && record.chest) {
    const c = record.chest
    return `${record.sourceVersion !== LDCT_CHEST_VERSION ? '旧示意图 · ' : ''}胸部第${c.slice + 1}层 · ${c.compareFbp ? '回看FBP' : `迭代${LDCT_ITERATIONS[record.iterationStep]}轮`}${c.pinned ? ` · 固定${LDCT_ITERATIONS[c.pinned.iterationStep]}轮第${c.pinned.slice + 1}层` : ''}${c.mark ? ` · 第${c.mark.slice + 1}层有待核查标记` : ' · 尚未标记位置'}`
  }
  switch (record.round) {
    case 1: return `结构与投影轨迹 · 留在 ${Math.round(record.angle)}°`
    case 2: return `${record.bpCount ?? LDCT_BP_COUNTS[record.bpStep]} 个方向 · 直接反投影`
    case 3: return `${record.dataset === 'sparse-filter-v1' ? '旧版稀疏小结构' : record.dataset === 'full-projection-v2' || !record.dataset ? '旧版模体' : ({ phantom: '完整灰色模体', face: '脸形嵌件模体', nut: '盒内小零件', chest: '胸部数据' })[record.dataset]} · ${LDCT_FILTER_LABELS[record.filter]}`
    case 4: return `${{ high: '多', medium: '中', low: '少' }[record.signal]}光子 · ${LDCT_FILTER_LABELS[record.filter]}`
    case 5: return `迭代 ${LDCT_ITERATIONS[record.iterationStep]} 轮 · 保留中间过程`
  }
}

export const LDCT_METHOD_NOTES = [
  '正弦图：这里每一列是一个角度的投影，横向是角度，纵向是探测器位置。图里的一个小点，转着看时会在不同位置留下影子，连起来就是弯曲的轨迹。',
  '每段始终保留完整物体及背景。正弦图包含各结构叠加后的全部投影，彩色线只追踪其中一个小结构，不把其他结构或底色从数据里删除。',
  '直接反投影把各方向投影沿原路铺回图像。不滤波时总响应为平坦通过；Ramp的总响应随频率绝对值上升。其他四种FBP滤波器是在Ramp上乘相应窗，不把一个窗函数本身当成总响应。',
  '模拟信号水平改变入射光子计数，角度、物体与显示窗不变。计数少时，测量起伏更明显；锐一些的滤波也更容易带出高频噪声。不是把图上撒雪花当低剂量，也不把计数换算为患者剂量。',
  '本台迭代示例：从初始估计出发，算一份预测投影，与同一份带噪实测投影比较，再修改估计。展示真实计算的中间轮次，不用渐变动画假装收敛。轮次更多不保证临床结果更好。',
  '三套数据都是二维平行束原创数字物体，各组固定几何、噪声种子与显示窗；不含人体运动、真实能谱、散射或完整厂商流程，不用于选择患者检查参数。',
]
