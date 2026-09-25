import type { DlcProgress } from './types'

// Only this prompt already contains the main character's entire question.
// Its acknowledged return must not replay the same line/image before the VR.
const coronaryStep = 'c2n3_coronary_where'
const coronaryObservation = 'coronary-reconstruction-v1'

export function ch2ObservationContinuation(stepId: string): string | undefined {
  return stepId === coronaryStep ? 'c2n3_coronary_volume' : undefined
}

/** Older saves can be parked after acknowledgement but before the old repeat.
 * Route only that exact cursor; other observations keep their existing return. */
export function ch2ObservationResumeStep(stepId: string, progress?: Pick<DlcProgress, 'observations'>): string {
  return stepId === coronaryStep && progress?.observations?.[coronaryObservation]?.acknowledged
    ? 'c2n3_coronary_volume' : stepId
}

/** The observation replies are spoken by staff at the workstation. This is
 * not a general speaker-to-sprite fallback: phone calls, texts, the sunrise,
 * explicit empty sprites, and patient staging are left to the normal scene. */
export function ch2ObservationPortrait(stepId: string, speaker?: string): string | undefined {
  if (stepId === 'c2n5_m17') return undefined
  if (speaker === 'zhou' || speaker === 'director' || speaker === 'duty') return `char_${speaker}`
}

// The child case explicitly established that the duty physician is reviewing
// remotely. Keep the existing telephone portrait, never move them into the room.
export function ch2ObservationPhone(stepId: string): string | undefined {
  return stepId === 'c2n5_m17' ? 'char_duty' : undefined
}
