import { LDCT_BP_COUNTS, LDCT_ITERATIONS, LDCT_DATASET_MEDIA_IDS, LDCT_DATASET_VERSION, LDCT_DATASET_SEEDS, LDCT_STRUCTURES, type LdctDataset } from './ldct-projections'
import { LDCT_FILTER_OPTIONS } from './ldct-filter-response'
export { LDCT_FILTER_OPTIONS } from './ldct-filter-response'
export type { LdctFilter } from './ldct-filter-response'
import type { LdctFilter } from './ldct-filter-response'

/** Serialized controls, not a score: completing an experiment means looking, not guessing right. */
export const LDCT_PHANTOM_VERSION = LDCT_DATASET_VERSION
export const LDCT_PHANTOM_SEED = 2258 as const
export const LDCT_LAB_MEDIA_IDS = Object.values(LDCT_DATASET_MEDIA_IDS)
export type { LdctDataset } from './ldct-projections'
export type LdctLabRound = 1 | 2 | 3 | 4 | 5
export type LdctLabStage = 'trace' | 'backproject' | 'filter' | 'noise' | 'iterate'
export type LdctSignal = 'low' | 'medium' | 'high'
export type LdctMark = { x: number; y: number }
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
  sourceVersion: typeof LDCT_PHANTOM_VERSION | 'ldct-short-v1' | 'ldct-projection-v2'
  seed: typeof LDCT_DATASET_SEEDS[LdctDataset]
  dataset?: LdctDataset | 'sparse-filter-v1' | 'full-projection-v2'
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
}

export const createLdctLabState = (round: LdctLabRound = 1): LdctLabState => ({
  round, structure: null, angle: 0, seenAngles: [], seenStructures: [], bpStep: 0,
  filter: 'ramp', seenFilters: ['ramp'], signal: round === 5 ? 'low' : 'high', seenSignals: [round === 5 ? 'low' : 'high'],
  iterationStep: 0, seenIterations: [0], divider: 50, mark: null, helped: false, saved: null,
})

const signals = ['low', 'medium', 'high']
const filters: readonly string[] = LDCT_FILTER_OPTIONS
const finiteBetween = (n: unknown, min: number, max: number) => typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max
const integerBetween = (n: unknown, min: number, max: number) => finiteBetween(n, min, max) && Number.isInteger(n)
const validStructure = (id: unknown) => id === null || LDCT_STRUCTURES.some(s => s.id === id)

export function isValidLdctRecord(record: LdctLabRecord, round: LdctLabRound): boolean {
  return Boolean([1, 2, 3, 4, 5].includes(round) && record && record.round === round && record.stage === LDCT_LAB_STAGES[round] &&
    (((record.sourceVersion === LDCT_PHANTOM_VERSION || record.sourceVersion === 'ldct-short-v1') && record.dataset !== undefined && record.dataset in LDCT_DATASET_SEEDS &&
      record.seed === LDCT_DATASET_SEEDS[record.dataset as LdctDataset]) ||
      (record.sourceVersion === 'ldct-projection-v2' && record.seed === LDCT_PHANTOM_SEED)) &&
    validStructure(record.structure) && finiteBetween(record.angle, 0, 179) &&
    integerBetween(record.bpStep, 0, LDCT_BP_COUNTS.length - 1) && filters.includes(record.filter) &&
    signals.includes(record.signal) && integerBetween(record.iterationStep, 0, LDCT_ITERATIONS.length - 1) &&
    typeof record.helped === 'boolean' && ['different', 'uncertain'].includes(record.verdict) &&
    (record.dataset === undefined || ['phantom', 'face', 'nut', 'sparse-filter-v1', 'full-projection-v2'].includes(record.dataset)))
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
    typeof value.helped === 'boolean' && (value.saved === null || isValidLdctRecord(value.saved, round)))
}

export function ldctExperimentReady(state: LdctLabState, round: LdctLabRound): boolean {
  if (!labStateValid(state, round)) return false
  if (state.helped) return true
  switch (round) {
    case 1: return state.seenStructures.length > 0 || state.seenAngles.length > 0
    case 2: return state.bpStep > 0
    case 3: return state.seenFilters.length > 1 || state.filter !== 'ramp'
    case 4: return state.seenSignals.length > 1 || state.signal !== 'high'
    case 5: return state.seenIterations.some(n => n > 0) || state.iterationStep > 0
  }
}

export function createLdctRecord(state: LdctLabState, round: LdctLabRound, verdict: LdctLabRecord['verdict'], dataset: LdctDataset = 'phantom'): LdctLabRecord | null {
  if (!ldctExperimentReady(state, round)) return null
  return {
    round, stage: LDCT_LAB_STAGES[round], structure: state.structure, angle: state.angle,
    bpStep: state.bpStep, filter: state.filter, signal: state.signal, iterationStep: state.iterationStep,
    helped: state.helped, verdict, sourceVersion: LDCT_PHANTOM_VERSION, seed: LDCT_DATASET_SEEDS[dataset],
    dataset,
  }
}

export function ldctRecordSummary(record: LdctLabRecord): string {
  switch (record.round) {
    case 1: return `结构与投影轨迹 · 留在 ${Math.round(record.angle)}°`
    case 2: return `${LDCT_BP_COUNTS[record.bpStep]} 个方向 · 直接反投影`
    case 3: return `${record.dataset === 'sparse-filter-v1' ? '旧版稀疏小结构' : record.dataset === 'full-projection-v2' || !record.dataset ? '旧版模体' : ({ phantom: '完整灰色模体', face: '脸形嵌件模体', nut: '盒内小零件' })[record.dataset]} · ${LDCT_FILTER_LABELS[record.filter]}`
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
