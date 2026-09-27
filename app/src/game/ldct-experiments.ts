/** Original digital phantom, precomputed once. This is not a clinical scanner model. */
export const LDCT_PHANTOM_VERSION = 'ldct-phantom-v1' as const
export const LDCT_PHANTOM_SEED = 2258 as const
export const LDCT_LAB_MEDIA_IDS = ['ldct_phantom_v1_atlas'] as const
export type LdctSignal = 'low' | 'medium' | 'high'
export type LdctLabConfig = {
  signal: LdctSignal
  algorithm: 'fbp' | 'iterative'
  strength: 1 | 2 | 3
}
export type LdctMark = { x: number; y: number }
export type LdctLabRecord = {
  round: 1 | 2
  pinned: LdctLabConfig
  candidate: LdctLabConfig
  slice: 0 | 1 | 2
  mark: LdctMark | null
  helped: boolean
  verdict: 'different' | 'uncertain'
  sourceVersion: typeof LDCT_PHANTOM_VERSION
  seed: typeof LDCT_PHANTOM_SEED
}
export type LdctLabState = {
  candidate: LdctLabConfig
  pinned: LdctLabConfig | null
  slice: 0 | 1 | 2
  divider: number
  mark: LdctMark | null
  helped: boolean
  saved: LdctLabRecord | null
}

export const createLdctLabState = (): LdctLabState => ({
  candidate: { signal: 'medium', algorithm: 'fbp', strength: 1 },
  pinned: null, slice: 1, divider: 50, mark: null, helped: false, saved: null,
})

export const ldctConfigKey = (config: LdctLabConfig) =>
  `${config.signal}:${config.algorithm}:${config.algorithm === 'fbp' ? 0 : config.strength}`

export function ldctAtlasColumn(config: LdctLabConfig): number {
  const level = { low: 0, medium: 1, high: 2 }[config.signal]
  return level * 4 + (config.algorithm === 'fbp' ? 0 : config.strength)
}

export const ldctFramePosition = (column: number, slice: number) => `${column / 12 * 100}% ${slice / 2 * 100}%`

export function ldctConfigLabel(config: LdctLabConfig): string {
  const signal = { low: '低信号', medium: '中信号', high: '高信号' }[config.signal]
  const algorithm = config.algorithm === 'fbp' ? 'FBP' : `迭代·${['轻', '中', '强'][config.strength - 1]}`
  return `${signal} · ${algorithm}`
}

/** No success/failure score: a valid comparison is a pair with different data/method settings. */
export function createLdctRecord(state: LdctLabState, round: 1 | 2, verdict: LdctLabRecord['verdict']): LdctLabRecord | null {
  if (!state.pinned || ldctConfigKey(state.pinned) === ldctConfigKey(state.candidate)) return null
  return {
    round, pinned: { ...state.pinned }, candidate: { ...state.candidate },
    slice: state.slice, mark: state.mark ? { ...state.mark } : null, helped: state.helped,
    verdict, sourceVersion: LDCT_PHANTOM_VERSION, seed: LDCT_PHANTOM_SEED,
  }
}

export function isValidLdctRecord(record: LdctLabRecord, round: 1 | 2): boolean {
  const validConfig = (config: LdctLabConfig) => Boolean(config &&
    ['low', 'medium', 'high'].includes(config.signal) &&
    ['fbp', 'iterative'].includes(config.algorithm) && [1, 2, 3].includes(config.strength))
  const validMark = (mark: LdctMark | null) => mark === null || Boolean(mark &&
    Number.isFinite(mark.x) && Number.isFinite(mark.y) && mark.x >= 0 && mark.x <= 100 && mark.y >= 0 && mark.y <= 100)
  return Boolean(record && record.round === round && record.sourceVersion === LDCT_PHANTOM_VERSION &&
    record.seed === LDCT_PHANTOM_SEED && [0, 1, 2].includes(record.slice) &&
    typeof record.helped === 'boolean' && validMark(record.mark) &&
    ['different', 'uncertain'].includes(record.verdict) && validConfig(record.pinned) &&
    validConfig(record.candidate) && ldctConfigKey(record.pinned) !== ldctConfigKey(record.candidate))
}

export const LDCT_METHOD_NOTES = [
  '这是原创数字模体，没有患者资料。几个小结构的位置原本就已知；对照保存后才展示它们。',
  '低、中、高改变的是模拟的入射计数。每档使用相同角度与几何；同一档的两种算法读取同一份带噪投影。这里不把计数直接标成临床剂量。',
  'FBP先滤波、再反投影；本台的迭代示例会反复核对投影，并加入平滑约束。强度只属于这个演示实现，不代表所有厂家的迭代算法。',
  '强约束可能让弱小结构也变淡。噪声少、画面干净，不能单独证明结果更可信。相邻层、原始对照与已知结构要一起看。',
  '本台是二维平行束、单能、固定显示窗的简化模拟；未包含真实CT的散射、能谱、人体运动、探测器响应或复杂临床任务。结果不能换算患者检查参数。',
]
