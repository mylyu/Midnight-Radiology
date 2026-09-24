/** Chapter 2 only. An acquisition is not the same operation as a reconstruction. */
export interface Ch2ScanConfig {
  id: string
  mode: 'acquire' | 'reconstruct'
  title: string
  detail: string
  durationMs: number
  /** Presentation does not change acquisition/reconstruction or the saved clock. */
  presentation?: 'dual' | 'console' | 'machine'
  sequence?: string
}

function acquisition(id: string, title: string, detail: string): Ch2ScanConfig {
  const consoleOnly = ['c2n3_repeat_scan', 'c2n3_cta_scan', 'c2d4_m1'].includes(id)
  // Explicitly approved exception: keep the original pediatric machine scene
  // until an appropriate reviewed child sequence is available.
  const machineOnly = id === 'c2n5_child_scan'
  return { id, mode: 'acquire', title, detail, durationMs: 3000,
    presentation: machineOnly ? 'machine' : consoleOnly ? 'console' : 'dual',
    ...(!machineOnly ? { sequence: id } : {}) }
}

function reconstruction(id: string, title: string): Ch2ScanConfig {
  return { id, mode: 'reconstruct', title, detail: '工作站处理同一次采集的数据 · 不再次曝光', durationMs: 1500 }
}

/** Explicit registry: do not infer these from an `_scan` naming convention. */
export const CH2_SCANS: Record<string, Ch2ScanConfig> = {
  c2n1_m7: acquisition('c2n1_m7', '头颅平扫', '检查床进到位，机架开始采集头颅数据。'),
  c2n1_p_scan: acquisition('c2n1_p_scan', '泌尿系平扫', '小伙子躺稳，按确认的范围采集数据。'),
  c2d2_lung_scan: acquisition('c2d2_lung_scan', '胸部平扫', '大爷按提示屏气，检查床缓缓通过机架。'),
  c2d2_gut_scan: acquisition('c2d2_gut_scan', '腹部扫描', '腹痛病人准备好，按确认的腹部方案采集。'),
  c2d2_trauma_scan: acquisition('c2d2_trauma_scan', '腰椎与骨盆扫描', '按医师确认的腰椎与骨盆范围采集，工作站准备骨窗与多平面重组。'),
  c2d2_wrist_scan: acquisition('c2d2_wrist_scan', '腕部扫描', '伤腕放稳，采集腕部数据。'),
  c2n3_m5: acquisition('c2n3_m5', '卒中急诊 · 头颅平扫', '头颅定位完成，机架开始采集。'),
  c2n3_repeat_scan: acquisition('c2n3_repeat_scan', '受影响范围补扫', '固定垫调整好，按医师确认的必要范围补充采集。'),
  c2n3_cta_scan: acquisition('c2n3_cta_scan', '头颈部 CTA', '对比剂按方案团注，按确认的时机采集血管数据。'),
  c2n3_coronary_scan: acquisition('c2n3_coronary_scan', '冠脉 CTA', '团队完成准备，开始心电同步采集。'),
  c2n3_mystery_scan: acquisition('c2n3_mystery_scan', '头颅平扫', '老人双手放稳，检查床缓缓驶入机架。'),
  c2d4_aorta_scan: acquisition('c2d4_aorta_scan', '主动脉 CTA', '按确认的范围和强化时机，进行主动脉容积采集。'),
  c2d4_metal_scan: acquisition('c2d4_metal_scan', '头部平扫', '老爷子躺稳，机架开始采集头部数据。'),
  c2n5_child_scan: acquisition('c2n5_child_scan', '儿童头颅扫描', '男孩躺稳，按确认的儿童方案开始采集。'),
  c2d4_m1: acquisition('c2d4_m1', '必要范围补扫', '去除活动义齿后，按医师意见补充受影响范围的数据。'),
  c2d2_w1: reconstruction('c2d2_w1', '胸部薄层重建'),
  c2n3_coronary_volume: reconstruction('c2n3_coronary_volume', '冠脉三维重建'),
}

/** Display this process copy while the underlying result/dialogue is gated. */
export const CH2_SCAN_TEXT: Record<string, string> = Object.fromEntries(
  Object.entries(CH2_SCANS).map(([id, config]) => [id, config.detail]),
)

export const CH2_SCAN_AUDIO = {
  acquisition: 'ch2_ct_real_scan_20260924',
} as const

/** Dedicated artwork; none of the original chapter assets is replaced. */
export const CH2_SCAN_ILLUSTRATION = 'ch2_ct_scan_room_pixel_v2'

export interface Ch2ScanFrame {
  elapsedMs: number
  progress: number
  phase: 'position' | 'acquire' | 'reconstruct' | 'complete'
  label: string
  complete: boolean
}

/** Wall-clock progress is recoverable after refresh/background throttling. */
export function ch2ScanFrame(config: Ch2ScanConfig, startedAt: number, now = Date.now()): Ch2ScanFrame {
  const duration = Math.max(1, config.durationMs)
  // An invalid legacy timestamp completes rather than creating a permanent input lock.
  const elapsedMs = !Number.isFinite(startedAt) || startedAt > now + duration
    ? duration : Math.max(0, now - Math.min(startedAt, now))
  const progress = Math.min(1, elapsedMs / duration)
  const complete = progress >= 1
  const phase = complete ? 'complete' : config.mode === 'reconstruct' ? 'reconstruct'
    : progress < 0.2 ? 'position' : progress < 0.72 ? 'acquire' : 'reconstruct'
  const label = phase === 'complete' ? '图像已就绪' : phase === 'position' ? config.presentation === 'console' ? '本次采集准备就绪' : '检查床进到位'
    : phase === 'acquire' ? '机架采集数据' : '工作站重建图像'
  return { elapsedMs, progress, phase, label, complete }
}
