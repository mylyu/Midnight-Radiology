export async function enterFullscreenLandscape() {
  try { await document.documentElement.requestFullscreen() } catch { return }
  try {
    const orientation = screen.orientation as unknown as { lock?: (o: string) => Promise<void> }
    if (typeof orientation.lock === 'function') await orientation.lock('landscape')
  } catch { /* Keep ordinary fullscreen when orientation lock is unsupported. */ }
}

export function exitFullscreenUnlock() {
  try {
    const orientation = screen.orientation as unknown as { unlock?: () => void }
    if (typeof orientation.unlock === 'function') orientation.unlock()
  } catch { /* ignore */ }
  void document.exitFullscreen().catch(() => {})
}
