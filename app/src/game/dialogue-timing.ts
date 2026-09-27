/** Identical timing for the existing chapters and future story players. */
export const DIALOGUE_CHARACTER_MS = 28
export const DIALOGUE_CHOICE_BUFFER_MS = 900

/** A deadline, not animation/audio completion: backgrounding cannot lock a scene. */
export function waitForDialogueChoices(onReady: () => void, readyAt = performance.now() + DIALOGUE_CHOICE_BUFFER_MS) {
  const unlock = () => { if (performance.now() >= readyAt) onReady() }
  const timer = window.setTimeout(unlock, Math.max(0, Math.ceil(readyAt - performance.now())))
  window.addEventListener('focus', unlock)
  document.addEventListener('visibilitychange', unlock)
  return () => {
    clearTimeout(timer)
    window.removeEventListener('focus', unlock)
    document.removeEventListener('visibilitychange', unlock)
  }
}
