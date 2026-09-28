import { useState } from 'react'

const preferenceKey = 'midnight-radiology-ldct-scene-muted-v1'
/** New scene voices/ringtone only; keep the shared game's existing UI sounds. */
export function useLdctSceneSound() {
  const [muted, setMuted] = useState(() => {
    try { return localStorage.getItem(preferenceKey) === '1' } catch { return false }
  })
  const toggle = () => {
    const next = !muted
    setMuted(next)
    try { localStorage.setItem(preferenceKey, next ? '1' : '0') } catch { /* session only */ }
  }
  return { muted, toggle }
}
