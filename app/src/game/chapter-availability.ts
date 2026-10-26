import type { TrilogyId } from './trilogy-types'

/** Admission is separate from saved progress and the full historical registry. */
export const TRILOGY_AVAILABILITY: Readonly<Record<TrilogyId, boolean>> = {
  ch3: true,
  ch4: false,
  ch5: false,
}

export const isTrilogyPlayable = (id: TrilogyId) => TRILOGY_AVAILABILITY[id]
