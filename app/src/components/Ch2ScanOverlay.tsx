import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { CH2_SCAN_AUDIO, ch2ScanFrame } from '../game/ch2-scans'
import type { Ch2ScanConfig } from '../game/ch2-scans'
import './Ch2ScanOverlay.css'

export interface Ch2ScanOverlayProps {
  config: Ch2ScanConfig
  /** Persist this before mounting; key the component by run and step id. */
  startedAt: number
  onDone: () => void
  /** Skip only the presentation. The caller must still show the observation. */
  onSkip: () => void
  muted?: boolean
}

const soundUrl = (name: string) => `${import.meta.env.BASE_URL}audio/${name}.mp3`

export function Ch2ScanOverlay({ config, startedAt, onDone, onSkip, muted = false }: Ch2ScanOverlayProps) {
  const [frame, setFrame] = useState(() => ch2ScanFrame(config, startedAt))
  const [quiet, setQuiet] = useState(muted)
  const completed = useRef(false)
  const panelRef = useRef<HTMLElement>(null)
  const skipRef = useRef<HTMLButtonElement>(null)
  const callbacks = useRef({ onDone, onSkip })
  const audioAllowed = !quiet && !muted
  useEffect(() => { callbacks.current = { onDone, onSkip } }, [onDone, onSkip])
  useEffect(() => {
    const priorFocus = document.activeElement
    skipRef.current?.focus({ preventScroll: true })
    return () => {
      if (priorFocus instanceof HTMLElement && priorFocus.isConnected) priorFocus.focus({ preventScroll: true })
    }
  }, [])

  const finish = useCallback((skip: boolean) => {
    if (completed.current) return
    completed.current = true
    if (skip) callbacks.current.onSkip()
    else callbacks.current.onDone()
  }, [])

  useEffect(() => {
    const tick = () => {
      const next = ch2ScanFrame(config, startedAt)
      setFrame(next)
      if (next.complete) finish(false)
    }
    // setTimeout also handles a restored, already-completed scan without a render-time callback.
    const firstTick = window.setTimeout(tick, 0)
    const timer = window.setInterval(tick, 50)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('pageshow', tick)
    return () => {
      window.clearTimeout(firstTick)
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('pageshow', tick)
    }
  }, [config, startedAt, finish])

  const motorRunning = config.mode === 'acquire' && (frame.phase === 'position' || frame.phase === 'acquire')
  useEffect(() => {
    if (!audioAllowed || !motorRunning || completed.current) return
    const motor = new Audio(soundUrl(CH2_SCAN_AUDIO.motor))
    motor.loop = true
    motor.volume = 0.24
    // Sound is optional. Neither a rejected play() nor a stalled download gates progress.
    try { void motor.play().catch(() => undefined) } catch { /* browser audio unavailable */ }
    const onVisibility = () => {
      if (document.hidden) motor.pause()
      else if (!completed.current) {
        try { void motor.play().catch(() => undefined) } catch { /* no sound is safe */ }
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      motor.pause()
      motor.removeAttribute('src')
      motor.load()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [audioAllowed, motorRunning])

  const nearingEnd = frame.progress >= 0.88 && !frame.complete
  useEffect(() => {
    if (!audioAllowed || !nearingEnd || document.hidden || completed.current) return
    const ready = new Audio(soundUrl(CH2_SCAN_AUDIO.ready))
    ready.volume = 0.2
    try { void ready.play().catch(() => undefined) } catch { /* optional foley */ }
    return () => { ready.pause(); ready.removeAttribute('src'); ready.load() }
  }, [audioAllowed, nearingEnd])

  const style = { '--ch2-scan-progress': frame.progress, '--ch2-table-offset': `${Math.min(1, frame.progress / 0.55) * 48}px` } as CSSProperties
  return <div className="ch2-scan-overlay" role="dialog" aria-modal="true" aria-label={config.title}
    data-scan-id={config.id} data-scan-mode={config.mode} data-scan-phase={frame.phase}
    onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}
    onKeyDown={event => {
      event.stopPropagation()
      if (event.key !== 'Tab') return
      const buttons = panelRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
      if (!buttons?.length) return
      const first = buttons[0], last = buttons[buttons.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }} style={style}>
    <section className="ch2-scan-panel" ref={panelRef}>
      <div className="ch2-scan-kicker">{config.mode === 'acquire' ? 'CT 控制台' : '图像工作站'}</div>
      <h2>{config.title}</h2>
      {config.mode === 'acquire' ? <div className={`ch2-scan-device is-${frame.phase}`} aria-hidden="true">
        <div className="ch2-scan-floor" />
        <div className="ch2-scan-gantry"><div className="ch2-scan-bore" /><div className="ch2-scan-arc" /><div className="ch2-scan-gantry-lights" /></div>
        <div className="ch2-scan-table-pedestal" />
        <div className="ch2-scan-table"><div className="ch2-scan-person" /><div className="ch2-scan-tabletop" /></div>
        <div className="ch2-scan-console"><div className="ch2-scan-console-screen">{frame.phase === 'reconstruct' ? 'RECON' : 'CT'}</div></div>
      </div> : <div className="ch2-scan-workstation" aria-hidden="true">
        <div className="ch2-scan-slices">{[0, 1, 2, 3, 4, 5].map(value => <span key={value} style={{ animationDelay: `${value * 120}ms` }} />)}</div>
        <div className="ch2-scan-workstation-stand" />
      </div>}
      <p className="ch2-scan-phase" aria-live="polite">{frame.label}</p>
      <p className="ch2-scan-detail">{config.detail}</p>
      <div className="ch2-scan-progress" role="progressbar" aria-label="图像生成进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(frame.progress * 100)}>
        <span style={{ width: `${frame.progress * 100}%` }} />
      </div>
      <div className="ch2-scan-progress-number">{Math.round(frame.progress * 100)}%</div>
      <div className="ch2-scan-controls">
        <button type="button" onClick={() => setQuiet(value => !value)} aria-pressed={quiet || muted} disabled={muted}>{quiet || muted ? '设备声已关闭' : '关闭设备声'}</button>
        <button ref={skipRef} type="button" className="ch2-scan-skip" onClick={() => finish(true)}>跳过演出</button>
      </div>
      <small>跳过后仍需查看图像。演出时长不代表实际检查时长。</small>
    </section>
  </div>
}
