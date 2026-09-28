/** Same-source chest-shaped numerical demonstration; no real patient data. */
export const LDCT_CHEST_VERSION = 'ldct-chest-v1' as const
export const LDCT_CHEST_SEED = 28225 as const
export const LDCT_CHEST_SIZE = 192
export const LDCT_CHEST_WINDOW = [0.001, 0.022] as const
export const LDCT_CHEST_SLICES = [0, 1, 2] as const
export type LdctChestSlice = typeof LDCT_CHEST_SLICES[number]
export const LDCT_CHEST_ITERATIONS = [0, 1, 2, 4, 8] as const
export type LdctChestIteration = typeof LDCT_CHEST_ITERATIONS[number]
export const LDCT_CHEST_IMAGE_MEDIA_ID = 'ldct_chest_v1_images' as const
export const LDCT_CHEST_PROJECTION_MEDIA_ID = 'ldct_chest_v1_projections' as const
export const LDCT_CHEST_MEDIA_IDS = [LDCT_CHEST_IMAGE_MEDIA_ID, LDCT_CHEST_PROJECTION_MEDIA_ID] as const
export const LDCT_CHEST_IMAGE_KEYS = ['truth', 'fbp', 'iteration:0', 'iteration:1', 'iteration:2', 'iteration:4', 'iteration:8'] as const
export const LDCT_CHEST_PROJECTION_KEYS = [
  'sinogram', 'forward:0', 'forward:1', 'forward:2', 'forward:4', 'forward:8',
  'residual:0', 'residual:1', 'residual:2', 'residual:4', 'residual:8',
] as const
export type LdctChestFrameKey = typeof LDCT_CHEST_IMAGE_KEYS[number] | typeof LDCT_CHEST_PROJECTION_KEYS[number]

/** Layer 1/2/3 are neighboring synthetic sections, not a patient's slice numbers. */
export const LDCT_CHEST_SLICE_LABELS = ['前一层', '当前层', '后一层'] as const

export function ldctChestFrame(key: string, slice: LdctChestSlice = 1) {
  if (!Number.isInteger(slice) || slice < 0 || slice > 2) throw new Error(`Unknown LDCT chest slice: ${slice}`)
  const imageColumn = (LDCT_CHEST_IMAGE_KEYS as readonly string[]).indexOf(key)
  if (imageColumn >= 0) return {
    mediaId: LDCT_CHEST_IMAGE_MEDIA_ID, columns: LDCT_CHEST_IMAGE_KEYS.length, rows: 3, column: imageColumn, row: slice,
  }
  const projectionColumn = (LDCT_CHEST_PROJECTION_KEYS as readonly string[]).indexOf(key)
  if (projectionColumn >= 0) return {
    mediaId: LDCT_CHEST_PROJECTION_MEDIA_ID, columns: LDCT_CHEST_PROJECTION_KEYS.length, rows: 3, column: projectionColumn, row: slice,
  }
  throw new Error(`Unknown LDCT chest frame: ${key}`)
}

/** Add backgroundImage from the preloaded imageAsset(ldctChestFrame(...).mediaId). */
export function ldctChestFrameStyle(key: string, slice: LdctChestSlice = 1) {
  const frame = ldctChestFrame(key, slice)
  return {
    backgroundSize: `${frame.columns * 100}% ${frame.rows * 100}%`,
    backgroundPosition: `${frame.column / (frame.columns - 1) * 100}% ${frame.row / (frame.rows - 1) * 100}%`,
    backgroundRepeat: 'no-repeat',
  }
}

export const LDCT_CHEST_METHOD_NOTES = [
  '胸部形状的数字模体，三个相邻截面。各层的结构在投影前已存在，不随玩家选算法或迭代轮次添加、删除。',
  'FBP与迭代读取本层同一份带噪投影；浏览器切换层面或重建结果不会新增扫描。各结果的显示窗始终相同。',
  '每轮先根据测量投影作一次完整SART更新，再施加固定强度的平滑约束；不是对一张FBP图反复模糊，也不是厂商临床算法。',
  '不圈出标准答案，不凭单张模拟图给患者诊断。可标记自己拿不准的地方，核对邻层与不同结果，再由医师处理临床问题。',
  '投影差异图使用各层各轮同一尺度的平方根亮度增强，小差别更容易看到；数字残差不被更改。',
] as const
