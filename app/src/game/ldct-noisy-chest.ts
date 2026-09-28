import type { LdctChestSlice } from './ldct-chest'
import type { LdctExposureKind } from './ldct-exposure'

/** New simulations; absent draft flag keeps every historical dataset unchanged. */
export const LDCT_NOISY_DATA_VERSION = 'ldct-chest-noisy-v4' as const
export const LDCT_NOISY_EXPOSURE_VERSION = 'ldct-chest-exposure-v3-noisy' as const
export const LDCT_NOISY_CHEST_VERSION = 'ldct-chest-iterations-v4-fbp' as const
export const LDCT_NOISY_EXPOSURE_MEDIA_ID = 'ldct_chest_noisy_v4_exposure' as const
export const LDCT_NOISY_CHEST_MEDIA_ID = 'ldct_chest_noisy_v4_iterations' as const
export const LDCT_NOISY_MEDIA_IDS = [LDCT_NOISY_EXPOSURE_MEDIA_ID, LDCT_NOISY_CHEST_MEDIA_ID] as const
export const LDCT_NOISY_SIZE = 192
export const LDCT_NOISY_INCIDENT_PER_UNIT = 2000
export const LDCT_NOISY_WINDOW = [0.001, 0.022] as const

function checkedStep(step: number) {
  if (!Number.isInteger(step) || step < 0 || step > 12) throw new Error(`Unknown noisy CT step: ${step}`)
  return step
}

/** FBP is exactly the iteration-zero initial image, not a separate altered copy. */
export function ldctNoisyChestFrame(key: string, slice: LdctChestSlice = 1) {
  if (!Number.isInteger(slice) || slice < 0 || slice > 2) throw new Error(`Unknown noisy CT slice: ${slice}`)
  const match = /^iteration:(\d+)$/.exec(key)
  const step = key === 'fbp' ? 0 : match && key === `iteration:${Number(match[1])}` ? Number(match[1]) : -1
  return { mediaId: LDCT_NOISY_CHEST_MEDIA_ID, columns: 13, rows: 3, column: checkedStep(step), row: slice }
}

export function ldctNoisyExposureFrame(kind: LdctExposureKind, step = 0) {
  if (kind !== 'fbp' && kind !== 'sinogram') throw new Error(`Unknown noisy CT exposure kind: ${kind}`)
  return { mediaId: LDCT_NOISY_EXPOSURE_MEDIA_ID, columns: 13, rows: 2, column: checkedStep(step), row: kind === 'fbp' ? 0 : 1 }
}

function frameStyle(frame: { columns: number; rows: number; column: number; row: number }) {
  return {
    backgroundSize: `${frame.columns * 100}% ${frame.rows * 100}%`,
    backgroundPosition: `${frame.column / (frame.columns - 1) * 100}% ${frame.row / (frame.rows - 1) * 100}%`,
    backgroundRepeat: 'no-repeat',
  }
}

export function ldctNoisyChestFrameStyle(key: string, slice: LdctChestSlice = 1) {
  return frameStyle(ldctNoisyChestFrame(key, slice))
}

export function ldctNoisyExposureFrameStyle(kind: LdctExposureKind, step = 0) {
  return frameStyle(ldctNoisyExposureFrame(kind, step))
}
