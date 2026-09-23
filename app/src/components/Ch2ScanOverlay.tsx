import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { CH2_SCAN_AUDIO, CH2_SCAN_ILLUSTRATION, ch2ScanFrame } from '../game/ch2-scans'
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
  const [imageFailed, setImageFailed] = useState(false)
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

  const acquisitionActive = config.mode === 'acquire' && !frame.complete
  useEffect(() => {
    if (!audioAllowed || !acquisitionActive || completed.current) return
    const recording = new Audio(soundUrl(CH2_SCAN_AUDIO.acquisition))
    recording.loop = false
    recording.volume = 0.24
    // The supplied three-second recording plays once, never as an endless motor loop.
    // On refresh/unmute/background return, resume at visual elapsed time instead of restarting it.
    const seekToVisualTime = () => {
      const elapsed = ch2ScanFrame(config, startedAt).elapsedMs / 1000
      try { recording.currentTime = Math.min(elapsed, config.durationMs / 1000) } catch { /* metadata not yet ready */ }
    }
    const play = () => {
      if (document.hidden || completed.current || ch2ScanFrame(config, startedAt).complete) return
      seekToVisualTime()
      try { void recording.play().catch(() => undefined) } catch { /* browser audio unavailable */ }
    }
    recording.addEventListener('loadedmetadata', seekToVisualTime)
    // Sound is optional. Neither a rejected play() nor a stalled download gates progress.
    play()
    const onVisibility = () => {
      if (document.hidden) recording.pause()
      else play()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      recording.pause()
      recording.removeEventListener('loadedmetadata', seekToVisualTime)
      recording.removeAttribute('src')
      recording.load()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [audioAllowed, acquisitionActive, config, startedAt])

  const style = { '--ch2-scan-progress': frame.progress, '--ch2-camera-shift': `${(0.5 - frame.progress) * 2}%` } as CSSProperties
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
      {config.mode === 'acquire' ? <div className={`ch2-scan-device is-${frame.phase}`}>
        {imageFailed ? <p className="ch2-scan-image-fallback">检查进行中 · 图像正在传往工作站</p> : <img className="ch2-scan-room" src={`${import.meta.env.BASE_URL}assets/${CH2_SCAN_ILLUSTRATION}.png`}
          alt="CT检查室中，患者躺在检查床上进入环形机架" onError={() => setImageFailed(true)} />}
        <div className="ch2-scan-room-status" aria-hidden="true"><i />{frame.phase === 'reconstruct' ? '工作站接收数据' : frame.phase === 'position' ? '检查床就位' : '采集中'}</div>
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
