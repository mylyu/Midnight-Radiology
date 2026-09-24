import { useEffect, useRef, useState } from 'react'
import { CH2_TERMINAL_CUES, CH2_TERMINAL_PANELS } from '../game/ch2-terminal'
import { imageAsset } from '../lib/image-assets'

const quietKey = 'midnight-radiology-ch2-terminal-muted-v1'

/** A local appliance cue, never a dialogue/character voice. Mount with the step ID
 * as key. Consumption is saved before attempting playback, including when muted
 * or blocked; it cannot be replayed by refresh, focus changes or a later gesture. */
export function Ch2MysterySound({ stepId, consumed, onConsumed }: {
  stepId: string; consumed: boolean; onConsumed: () => void
}) {
  const cue = CH2_TERMINAL_CUES[stepId]
  const [consumedOnEntry] = useState(consumed)
  const [quiet, setQuiet] = useState(() => {
    try { return localStorage.getItem(quietKey) === '1' } catch { return false }
  })
  const quietRef = useRef(quiet)
  const callback = useRef(onConsumed)
  const recording = useRef<HTMLAudioElement | null>(null)
  const started = useRef(false)
  useEffect(() => { callback.current = onConsumed }, [onConsumed])
  useEffect(() => {
    quietRef.current = quiet
    if (quiet) recording.current?.pause()
  }, [quiet])
  useEffect(() => {
    if (!cue || consumedOnEntry || started.current) return
    // The deferred start is cancelled during React StrictMode's probe mount.
    const timer = window.setTimeout(() => {
      if (started.current) return
      started.current = true
      callback.current()
      if (quietRef.current || document.hidden) return
      const audio = new Audio(`${import.meta.env.BASE_URL}audio/ch2_terminal_${cue.kind}_v1.mp3`)
      recording.current = audio
      // Files themselves are quietly mastered; do not attenuate them twice
      // into an inaudible whisper. Alarm decoded peak at this gain is < -23 dBFS.
      audio.volume = cue.kind === 'alarm' ? 0.45 : 0.50
      audio.loop = false
      try { void audio.play().catch(() => undefined) } catch { /* captions are sufficient */ }
    }, 0)
    const stopWhenHidden = () => { if (document.hidden) recording.current?.pause() }
    document.addEventListener('visibilitychange', stopWhenHidden)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', stopWhenHidden)
      recording.current?.pause()
      recording.current = null
    }
  }, [cue, consumedOnEntry])

  if (!cue && !CH2_TERMINAL_PANELS[stepId]) return null
  return <button type="button" aria-pressed={quiet} aria-label="盒子音效静音"
    className="absolute top-14 left-2 z-30 rounded border border-slate-600 bg-slate-950/90 px-2 py-1 text-[11px] text-slate-300"
    onClick={event => {
      event.stopPropagation()
      const next = !quiet
      quietRef.current = next
      if (next) recording.current?.pause()
      setQuiet(next)
      try { localStorage.setItem(quietKey, next ? '1' : '0') } catch { /* private mode */ }
    }}>
    盒子音效：{quiet ? '关' : '开'}
  </button>
}

/** Readable status is real UI, not hallucinated lettering baked into the image.
 * A cached receipt is exposed only at the story's look-at-screen nodes. */
export function Ch2MysteryMedia({ stepId, image, label }: { stepId: string; image: string; label?: string }) {
  const panel = CH2_TERMINAL_PANELS[stepId]
  const [failed, setFailed] = useState(false)
  return <div data-ch2-terminal-panel={panel?.mode ?? 'offline'}
    className="absolute inset-x-0 top-14 z-10 flex flex-col items-center justify-center gap-1 pointer-events-none"
    style={{ bottom: 'calc(var(--ch2-dialog-height, 240px) + 12px)' }}>
    {failed
      ? <p className="bg-slate-950/90 p-2 text-sm text-slate-200">近景暂未载入，仍可继续查看文字记录。</p>
      : <img src={imageAsset(image)} alt="机架上的远程终端"
        onError={() => setFailed(true)} className="max-w-[90%] object-contain rounded border-2 border-slate-700 pixel"
        style={{ maxHeight: 'max(90px, calc(var(--apph, 100vh) - var(--ch2-dialog-height, 240px) - 205px))' }} />}
    {panel && <div className="max-w-[90%] rounded border border-slate-600 bg-slate-950/95 px-3 py-2 text-xs md:text-sm text-slate-300 font-mono">
      <p className={panel.mode === 'online' ? 'text-teal-300' : 'text-amber-200'}>{panel.connection}</p>
      {panel.mode === 'receipt' && <>
        <p>本地回执 · 上次任务记录</p>
        <p>{panel.receiptTime}</p>
        <p>{panel.recipient}</p>
      </>}
    </div>}
    {label && <p className="max-w-[90%] rounded bg-slate-950/90 px-2 py-1 text-xs text-teal-100">{label}</p>}
  </div>
}
