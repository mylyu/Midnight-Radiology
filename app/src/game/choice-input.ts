/** A choice requires a fresh gesture after a pause, not merely an expired timer. */
export const CHOICE_QUIET_MS = 300

type ChoicePress = {
  kind: 'pointer' | 'keyboard'
  scope: string
  target: string | null
  allowed: boolean
}

export type ChoiceInputState = {
  lastActivation: number
  press?: ChoicePress
  activation?: { scope: string; target: string | null; allowed: boolean }
}

export function createChoiceInput(): ChoiceInputState {
  return { lastActivation: -Infinity }
}

export function beginChoicePress(
  state: ChoiceInputState, now: number, scope: string, target: string | null,
  ready: boolean, kind: ChoicePress['kind'], repeat = false,
) {
  state.press = { kind, scope, target, allowed: !repeat && ready && target !== null && now - state.lastActivation >= CHOICE_QUIET_MS }
  // Holding Enter/Space is a continuing gesture, never a fresh choice.
  if (repeat) state.lastActivation = now
}

export function captureChoiceActivation(
  state: ChoiceInputState, now: number, scope: string, target: string | null,
  ready: boolean, kind: ChoicePress['kind'],
) {
  const press = state.press?.kind === kind ? state.press : undefined
  const freshPress = !press || (press.allowed && press.scope === scope && press.target === target)
  state.activation = { scope, target,
    allowed: ready && target !== null && freshPress && now - state.lastActivation >= CHOICE_QUIET_MS }
  // Deliberately record rejected clicks too. Continuous fast-forward must never
  // select a newly appearing answer; after a pause the next gesture works.
  state.lastActivation = now
  state.press = undefined
}

export function consumeChoiceActivation(state: ChoiceInputState, scope: string, target: string): boolean {
  const activation = state.activation
  state.activation = undefined
  return !!activation?.allowed && activation.scope === scope && activation.target === target
}

export function cancelChoicePress(state: ChoiceInputState) {
  state.press = undefined
  state.activation = undefined
}
