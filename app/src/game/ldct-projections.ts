/** Reproducible numerical frames, not postprocessed pictures of CT patients. */
export const LDCT_PROJECTION_VERSION = 'ldct-projection-v2' as const
export const LDCT_PROJECTION_SEED = 2258 as const
export const LDCT_PROJECTION_MEDIA_ID = 'ldct_projection_v2_atlas' as const
export const LDCT_PROJECTION_MEDIA_IDS = [LDCT_PROJECTION_MEDIA_ID] as const
export const LDCT_PROJECTION_SIZE = 160
export const LDCT_PROJECTION_ATLAS = { columns: 8, rows: 5 } as const
export const LDCT_BP_COUNTS = [1, 2, 4, 8, 24, 160] as const
export const LDCT_ITERATIONS = [0, 1, 2, 4, 8] as const
export type LdctProjectionFilter = 'ramp' | 'shepp-logan' | 'hann'
export type LdctProjectionSignal = 'low' | 'medium' | 'high'
export type LdctStructureId = 'bead' | 'rod' | 'faint'

/** All positions are percentages from the upper-left of the image. */
export const LDCT_STRUCTURES: readonly {
  id: LdctStructureId; label: string; x: number; y: number; radius: number; color: string
}[] = [
  { id: 'bead', label: '左上的圆块', x: 35, y: 37.5, radius: 6.5, color: '#fbbf24' },
  { id: 'rod', label: '左下的小细棒', x: 30.5, y: 63, radius: 2.4, color: '#67e8f9' },
  { id: 'faint', label: '右下的浅圆块', x: 64.5, y: 63, radius: 4.1, color: '#f9a8d4' },
]

/** Detector location in the displayed sinogram, measured downward in %. */
export function detectorPosition(id: LdctStructureId, angleDegrees: number): number {
  const point = LDCT_STRUCTURES.find(structure => structure.id === id)!
  const theta = angleDegrees * Math.PI / 180
  // skimage radon columns use detector = cx*cos(theta) - cy*sin(theta),
  // where screen x increases rightward and screen y increases downward.
  return 50 + (point.x - 50) * Math.cos(theta) - (point.y - 50) * Math.sin(theta)
}

/** SVG path in viewBox="0 0 100 100". Image columns sample 0 <= theta < 180. */
export function detectorPath(id: LdctStructureId, untilDegrees = 180): string {
  const maximum = Math.min(180, Math.max(0, untilDegrees))
  const angles = Array.from({ length: Math.floor(maximum / 1.125) + 1 }, (_, index) => index * 1.125)
  if (angles[angles.length - 1] !== maximum) angles.push(maximum)
  return angles.map((angle, index) => `${index ? 'L' : 'M'}${(angle / 180 * 100).toFixed(3)},${detectorPosition(id, angle).toFixed(3)}`).join(' ')
}

export const LDCT_PROJECTION_FRAME_KEYS = [
  'trace:truth', 'trace:sinogram', 'truth', 'sinogram:clean',
  'sinogram:low', 'fbp:low:ramp', 'fbp:low:shepp-logan', 'fbp:low:hann',
  'sinogram:medium', 'fbp:medium:ramp', 'fbp:medium:shepp-logan', 'fbp:medium:hann',
  'sinogram:high', 'fbp:high:ramp', 'fbp:high:shepp-logan', 'fbp:high:hann',
  'bp:1', 'bp:2', 'bp:4', 'bp:8', 'bp:24', 'bp:160',
  'iteration:0', 'forward:0', 'residual:0',
  'iteration:1', 'forward:1', 'residual:1',
  'iteration:2', 'forward:2', 'residual:2',
  'iteration:4', 'forward:4', 'residual:4',
  'iteration:8', 'forward:8', 'residual:8',
] as const
export type LdctProjectionFrameKey = typeof LDCT_PROJECTION_FRAME_KEYS[number]

export function ldctProjectionFrame(key: string) {
  const index = (LDCT_PROJECTION_FRAME_KEYS as readonly string[]).indexOf(key)
  if (index < 0) throw new Error(`Unknown LDCT projection frame: ${key}`)
  return {
    mediaId: LDCT_PROJECTION_MEDIA_ID,
    ...LDCT_PROJECTION_ATLAS,
    column: index % LDCT_PROJECTION_ATLAS.columns,
    row: Math.floor(index / LDCT_PROJECTION_ATLAS.columns),
  }
}

/** Supply backgroundImage using the preloaded I(LDCT_PROJECTION_MEDIA_ID). */
export function ldctProjectionFrameStyle(key: string) {
  const frame = ldctProjectionFrame(key)
  return {
    backgroundSize: `${frame.columns * 100}% ${frame.rows * 100}%`,
    backgroundPosition: `${frame.column / (frame.columns - 1) * 100}% ${frame.row / (frame.rows - 1) * 100}%`,
    backgroundRepeat: 'no-repeat',
  }
}

/** These are measured simulation values, not a game score or diagnostic test. */
export const LDCT_ITERATION_RESIDUAL: Record<typeof LDCT_ITERATIONS[number], number> = {
  0: 1, 1: .1125111991, 2: .1082900646, 4: .1029887766, 8: .0967202660,
}

export const LDCT_PROJECTION_NOTES = [
  '开头只放三个小结构，便于追踪投影轨迹；后面给同样的位置加外壳和其他结构。这里是数字模体，没有患者数据。',
  '正弦图横向是投影角度，纵向是探测器位置。图中一个点在不同角度会投到不同位置；看到的轨迹不是这个点在人体里移动。',
  '直接反投影把每个角度的投影沿原方向铺回去。本台的1、2、4、8、24、160表示参与叠加的角度数，不把少角度等同低剂量。',
  'FBP在反投影之前对投影做滤波。Ramp、Shepp–Logan、Hann是三种真实滤波器；并非在已经重建好的图像上套锐化、美颜滤镜。',
  '低、中、高信号改变模拟入射计数，角度和几何不变。通过泊松计数及取对数得到带噪投影；本台不把计数换算成临床剂量。',
  '迭代示例是SART：从零开始，反复正投影、核对测量、更新图像。第1、2、4、8轮显示实际中间结果；差异变小也可能是在追逐噪声，多迭代不保证更好。',
  '二维平行束、单能、固定显示窗的简化演示，不包含真实CT所有散射、能谱、运动、探测器响应等效应，不可用于选择患者检查参数。',
] as const
