import { ldctChestFrame, type LdctChestSlice } from './ldct-chest'
import { ldctExposureFrame, type LdctExposureKind } from './ldct-exposure'

/** Twelve manual advances. Existing delivered checkpoints remain pixel-identical. */
export const LDCT_DEEP_EXPOSURE_VERSION = 'ldct-chest-exposure-v2' as const
export const LDCT_DEEP_CHEST_VERSION = 'ldct-chest-iterations-v3' as const
export const LDCT_DEEP_EXPOSURE_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const
export const LDCT_DEEP_ITERATIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const
export type LdctDeepIteration = typeof LDCT_DEEP_ITERATIONS[number]
export const LDCT_DEEP_EXPOSURE_MEDIA_ID = 'ldct_chest_exposure_v2_extra' as const
export const LDCT_DEEP_CHEST_MEDIA_ID = 'ldct_chest_iterations_v3_extra' as const
/** Only new files; original chest/exposure resources remain registered separately. */
export const LDCT_DEEP_MEDIA_IDS = [LDCT_DEEP_EXPOSURE_MEDIA_ID, LDCT_DEEP_CHEST_MEDIA_ID] as const
const EXTRA_ITERATIONS = [3, 5, 6, 7, 9, 10, 11, 12] as const
const ORIGINAL_ITERATIONS = [0, 1, 2, 4, 8] as const

export function ldctDeepExposureFrame(kind: LdctExposureKind, step = 0) {
  if (kind !== 'fbp' && kind !== 'sinogram') throw new Error(`Unknown LDCT exposure kind: ${kind}`)
  if (!Number.isInteger(step) || step < 0 || step >= LDCT_DEEP_EXPOSURE_LEVELS.length) {
    throw new Error(`Unknown LDCT deep exposure step: ${step}`)
  }
  if (step < 4) return ldctExposureFrame(kind, step)
  return { mediaId: LDCT_DEEP_EXPOSURE_MEDIA_ID, columns: 9, rows: 2, column: step - 4, row: kind === 'fbp' ? 0 : 1 }
}

export function ldctDeepChestFrame(key: string, slice: LdctChestSlice = 1) {
  if (!Number.isInteger(slice) || slice < 0 || slice > 2) throw new Error(`Unknown LDCT chest slice: ${slice}`)
  const match = /^iteration:(\d+)$/.exec(key)
  const iteration = match ? Number(match[1]) : -1
  if (!match || !Number.isInteger(iteration) || iteration < 0 || iteration > 12 || key !== `iteration:${iteration}`) {
    throw new Error(`Unknown LDCT deep chest frame: ${key}`)
  }
  if ((ORIGINAL_ITERATIONS as readonly number[]).includes(iteration)) return ldctChestFrame(key, slice)
  return {
    mediaId: LDCT_DEEP_CHEST_MEDIA_ID, columns: EXTRA_ITERATIONS.length, rows: 3,
    column: (EXTRA_ITERATIONS as readonly number[]).indexOf(iteration), row: slice,
  }
}

function frameStyle(frame: { columns: number; rows: number; column: number; row: number }) {
  return {
    backgroundSize: `${frame.columns * 100}% ${frame.rows * 100}%`,
    backgroundPosition: `${frame.column / (frame.columns - 1) * 100}% ${frame.row / (frame.rows - 1) * 100}%`,
    backgroundRepeat: 'no-repeat',
  }
}

/** Resolve backgroundImage through imageAsset(frame.mediaId), never a new network fetch. */
export function ldctDeepExposureFrameStyle(kind: LdctExposureKind, step = 0) {
  return frameStyle(ldctDeepExposureFrame(kind, step))
}

export function ldctDeepChestFrameStyle(key: string, slice: LdctChestSlice = 1) {
  return frameStyle(ldctDeepChestFrame(key, slice))
}
