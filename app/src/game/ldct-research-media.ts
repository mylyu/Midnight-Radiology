/** Held-out synthetic phantom suite. These are not clinical validation results. */
export const LDCT_RESEARCH_MEDIA_ID = 'ldct_research_v1_atlas' as const
export const LDCT_RESEARCH_MEDIA_IDS = [LDCT_RESEARCH_MEDIA_ID] as const
export const LDCT_RESEARCH_VERSION = 'ldct-research-v1' as const
export const LDCT_RESEARCH_SEED = 28116
export const LDCT_RESEARCH_CASE_IDS = ['control', 'faint', 'shifted'] as const
export const LDCT_RESEARCH_METHODS = ['reference', 'fbp', 'iterative', 'learned'] as const
export type LdctResearchCaseId = typeof LDCT_RESEARCH_CASE_IDS[number]
export type LdctResearchMethod = typeof LDCT_RESEARCH_METHODS[number]
export type LdctResearchSlice = 0 | 1 | 2
export const LDCT_RESEARCH_METHOD_LABELS: Record<LdctResearchMethod, string> = {
  reference: '已知模体', fbp: 'FBP', iterative: '迭代示例', learned: '学习型后处理',
}
/** Titles contain no location/answer. Show the target metadata only after the player's comparison. */
export const LDCT_RESEARCH_CASES: readonly { id: LdctResearchCaseId; title: string }[] = [
  { id: 'control', title: 'A组 · 初版例图' },
  { id: 'faint', title: 'B组 · 补充测试' },
  { id: 'shifted', title: 'C组 · 换位置复核' },
]
export const LDCT_RESEARCH_REVEAL: Record<LdctResearchCaseId, { x: number; y: number; radius: number; text: string }> = {
  control: { x: 67.1875, y: 64.84375, radius: 6.640625,
    text: '这个较大、较明显的圆块仍看得见。学习型结果更平滑，但边缘也变软了。' },
  faint: { x: 67.1875, y: 64.84375, radius: 3.515625,
    text: '较小、较浅的圆块在学习型结果中变淡，三张邻层的程度还不一样。不是完全消失，也不能只凭这一组下临床结论。' },
  shifted: { x: 34.375, y: 64.84375, radius: 4.296875,
    text: '换了位置、尺寸和噪声种子，中间这一层保留得较好，邻层仍有差异。不能挑这一层就说前一组的问题不存在。' },
}

export function ldctResearchFrame(caseId: LdctResearchCaseId, slice: LdctResearchSlice, method: LdctResearchMethod) {
  const row = LDCT_RESEARCH_CASE_IDS.indexOf(caseId)
  const methodIndex = LDCT_RESEARCH_METHODS.indexOf(method)
  if (row < 0 || methodIndex < 0 || ![0, 1, 2].includes(slice)) throw new Error('Unknown LDCT research frame')
  return { mediaId: LDCT_RESEARCH_MEDIA_ID, columns: 12, rows: 3, column: slice * 4 + methodIndex, row }
}

export function ldctResearchFrameStyle(caseId: LdctResearchCaseId, slice: LdctResearchSlice, method: LdctResearchMethod) {
  const frame = ldctResearchFrame(caseId, slice, method)
  return { backgroundSize: '1200% 300%', backgroundPosition: `${frame.column / 11 * 100}% ${frame.row / 2 * 100}%`, backgroundRepeat: 'no-repeat' }
}

export const LDCT_RESEARCH_METHOD_NOTES = [
  '仍然是原创数字模体，没有患者资料。三组各三张邻层，都来自预先固定的结构、投影几何和噪声种子。',
  'FBP和迭代读同一份投影；学习型后处理读这一份投影的FBP结果，不冒称直接从投影完成深度学习重建。已知模体是本来生成的数据，不是另一张高剂量患者片。',
  '小网络确实经过训练：96个合成模体、6层卷积、10857个参数。训练样本主要是较大、较明显的结构，没有本次小而浅的测试圆块。网页只装计算好的结果，不下载模型。',
  'B组的小结构变淡但并未完全消失；C组中间层保留得较好。这个受控示例不能代表所有学习型方法，更不证明临床是否安全。',
  '三组是教学用预设压力测试，不是无偏的临床性能试验。需要覆盖更多模体、位置、大小、噪声以及独立测试；不能用最漂亮的一张替代完整记录。',
] as const
