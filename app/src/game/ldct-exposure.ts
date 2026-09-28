/** Same licensed chest layer, with cumulative simulated photon counts. */
export const LDCT_EXPOSURE_VERSION = 'ldct-chest-exposure-v1' as const
export const LDCT_EXPOSURE_MEDIA_ID = 'ldct_chest_exposure_v1' as const
export const LDCT_EXPOSURE_LEVELS = [1, 2, 3, 4] as const
export const LDCT_EXPOSURE_SIZE = 192
export type LdctExposureStep = 0 | 1 | 2 | 3
export type LdctExposureKind = 'fbp' | 'sinogram'

export function ldctExposureFrame(kind: LdctExposureKind, step: number = 0) {
  if (kind !== 'fbp' && kind !== 'sinogram') throw new Error(`Unknown LDCT exposure kind: ${kind}`)
  if (!Number.isInteger(step) || step < 0 || step >= LDCT_EXPOSURE_LEVELS.length) {
    throw new Error(`Unknown LDCT exposure step: ${step}`)
  }
  return {
    mediaId: LDCT_EXPOSURE_MEDIA_ID,
    columns: LDCT_EXPOSURE_LEVELS.length,
    rows: 2,
    column: step,
    row: kind === 'fbp' ? 0 : 1,
  }
}

/** Supply backgroundImage via the chapter's preloaded imageAsset(mediaId). */
export function ldctExposureFrameStyle(kind: LdctExposureKind, step: number = 0) {
  const frame = ldctExposureFrame(kind, step)
  return {
    backgroundSize: `${frame.columns * 100}% ${frame.rows * 100}%`,
    backgroundPosition: `${frame.column / (frame.columns - 1) * 100}% ${frame.row * 100}%`,
    backgroundRepeat: 'no-repeat',
  }
}
