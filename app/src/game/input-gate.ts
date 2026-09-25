/** Only accepted input advances the deadline; rejected taps never prolong it. */
export function acceptInput(gate: { until: number }, now: number, delay: number): boolean {
  if (now < gate.until) return false
  gate.until = now + delay
  return true
}
