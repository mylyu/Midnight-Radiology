import type { LdctExposureKind } from './ldct-exposure'

/** Physical-phantom story media: original circular phantom, simulated projections. */
export const LDCT_PHANTOM_EXPOSURE_VERSION = 'ldct-physical-phantom-exposure-v1' as const
export const LDCT_PHANTOM_IR_VERSION = 'ldct-physical-phantom-ir-v1' as const
export const LDCT_PHANTOM_EXPOSURE_MEDIA_ID = 'ldct_phantom_exposure_v1' as const
export const LDCT_PHANTOM_IR_MEDIA_ID = 'ldct_phantom_iteration_v1' as const
export const LDCT_PHANTOM_EXPERIMENT_MEDIA_IDS = [LDCT_PHANTOM_EXPOSURE_MEDIA_ID, LDCT_PHANTOM_IR_MEDIA_ID] as const
export const LDCT_PHANTOM_EXPOSURE_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const
export const LDCT_PHANTOM_IR_ROUNDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const
export const LDCT_PHANTOM_EXPERIMENT_SIZE = 160
export const LDCT_PHANTOM_EXPERIMENT_SEED = 2258
export const LDCT_PHANTOM_INCIDENT_PER_UNIT = 24
export const LDCT_PHANTOM_EXPERIMENT_WINDOW = [0.005, 0.030] as const

function checkedStep(step: number) {
  if (!Number.isInteger(step) || step < 0 || step > 12) throw new Error(`Unknown phantom experiment step: ${step}`)
  return step
}

/** Zero-based step; each exposure accumulates independent counts at every angle. */
export function ldctPhantomExposureFrame(kind: LdctExposureKind, step = 0) {
  if (kind !== 'fbp' && kind !== 'sinogram') throw new Error(`Unknown phantom exposure kind: ${kind}`)
  return { mediaId: LDCT_PHANTOM_EXPOSURE_MEDIA_ID, columns: 13, rows: 2, column: checkedStep(step), row: kind === 'fbp' ? 0 : 1 }
}

/** FBP is exactly exposure 13 and iteration zero, never a fresh/zero-filled image. */
export function ldctPhantomIterationFrame(key: string = 'fbp') {
  const match = /^iteration:(\d+)$/.exec(key)
  const step = key === 'fbp' ? 0 : match && key === `iteration:${Number(match[1])}` ? Number(match[1]) : -1
  return { mediaId: LDCT_PHANTOM_IR_MEDIA_ID, columns: 13, rows: 1, column: checkedStep(step), row: 0 }
}

function frameStyle(frame: { columns: number; rows: number; column: number; row: number }) {
  return {
    backgroundSize: `${frame.columns * 100}% ${frame.rows * 100}%`,
    backgroundPosition: `${frame.column / (frame.columns - 1) * 100}% ${frame.rows > 1 ? frame.row / (frame.rows - 1) * 100 : 0}%`,
    backgroundRepeat: 'no-repeat',
  }
}

export function ldctPhantomExposureFrameStyle(kind: LdctExposureKind, step = 0) {
  return frameStyle(ldctPhantomExposureFrame(kind, step))
}

export function ldctPhantomIterationFrameStyle(key: string = 'fbp') {
  return frameStyle(ldctPhantomIterationFrame(key))
}

// Short aliases used by data-driven callers; retain the established FrameStyle API.
export const ldctPhantomExposureStyle = ldctPhantomExposureFrameStyle
export const ldctPhantomIterationStyle = ldctPhantomIterationFrameStyle
