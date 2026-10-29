import type { TrilogyId } from './trilogy-types'

/** Completion copy describes the action just performed, not a generic chat turn. */
export function trilogyToolActionCopy(chapter: TrilogyId, task: string, assisted = false) {
  if (assisted) return chapter === 'ch3' ? '请梅姐陪我过一遍 →' : '请同事陪我核对一遍 →'
  const copy: Partial<Record<TrilogyId, Record<string, string>>> = {
    ch3: {
      probe: '拿这支探头给梅姐看 →', echo: '把回波对照给梅姐看 →', tgc: '把前后两图交给梅姐核对 →',
      m_mode: '把运动对照给梅姐看 →', doppler: '记下方向、角度和图例 →',
      resolution: '保留这组帧率对照 →', spatial_resolution: '保留这组分辨率对照 →',
    },
    ch4: {
      sequence: '对照好了，说说差别 →', artifact: '标出重影，回诊室 →',
      'mri-relax': '记下这次信号变化 →', 'mri-encoding': '保留这次编码与重建 →',
      'mri-sampling': '保留采样对照，继续讨论 →',
    },
    ch5: {
      decay: '记下这份药的剩余活度 →', coincidence: '记下三类事件的差别 →',
      fusion: '对齐叠层，回到病例 →', collimator: '记下方向与计数的变化 →',
      spect: '保留投影与断层对照 →', counting: '保存累计计数结果 →',
    },
  }
  return copy[chapter]?.[task] ?? '完成观察，回到故事 →'
}
