/** Extra checkpoints only; legacy bpStep indices and projection assets stay valid. */
export const LDCT_MANUAL_BP_VERSION = 'ldct-manual-bp-v1' as const
export const LDCT_MANUAL_BP_MEDIA_ID = 'ldct_manual_bp_v1' as const
export const LDCT_MANUAL_BP_COUNTS = [
  1, 2, 4, 8, 16, 24, 32, 40, 48, 56, 64, 72,
  80, 88, 96, 104, 112, 120, 128, 136, 144, 152, 160,
] as const
export type LdctManualBpCount = typeof LDCT_MANUAL_BP_COUNTS[number]
export const LDCT_MANUAL_BP_SIZE = 160

/** Count is the actual number of backprojected directions, never a bpStep index. */
export function ldctManualBpFrame(count: number = 1) {
  const index = (LDCT_MANUAL_BP_COUNTS as readonly number[]).indexOf(count)
  if (index < 0) throw new Error(`Unknown LDCT manual BP count: ${count}`)
  return {
    mediaId: LDCT_MANUAL_BP_MEDIA_ID,
    columns: 6,
    rows: 4,
    column: index % 6,
    row: Math.floor(index / 6),
  }
}

/** Supply backgroundImage via the chapter's preloaded imageAsset(mediaId). */
export function ldctManualBpFrameStyle(count: number = 1) {
  const frame = ldctManualBpFrame(count)
  return {
    backgroundSize: `${frame.columns * 100}% ${frame.rows * 100}%`,
    backgroundPosition: `${frame.column / (frame.columns - 1) * 100}% ${frame.row / (frame.rows - 1) * 100}%`,
    backgroundRepeat: 'no-repeat',
  }
}
