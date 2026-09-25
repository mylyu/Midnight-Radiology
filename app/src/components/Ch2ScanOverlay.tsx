import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { CH2_SCAN_AUDIO, ch2ScanFrame } from '../game/ch2-scans'
import type { Ch2ScanConfig } from '../game/ch2-scans'
import { getCh2SliceSequence } from '../game/ch2-scan-sequences'
import { Ch2CtMotion } from './Ch2CtMotion'
import { Ch2SliceSequence } from './Ch2SliceSequence'
import './Ch2ScanOverlay.css'
import { assetUrl } from '../lib/chapter-assets'

export interface Ch2ScanOverlayProps {
  config: Ch2ScanConfig
  /** Persist this before mounting; key the component by run and step id. */
  startedAt: number
  onDone: () => void
  muted?: boolean
}

const soundUrl = (name: string) => assetUrl(`audio/${name}.mp3`)

export function Ch2ScanOverlay({ config, startedAt, onDone, muted = false }: Ch2ScanOverlayProps) {
  const [frame, setFrame] = useState(() => ch2ScanFrame(config, startedAt))
  const [quiet, setQuiet] = useState(muted)
  const completed = useRef(false)
  const panelRef = useRef<HTMLElement>(null)
  const doneCallback = useRef(onDone)
  const audioAllowed = !quiet && !muted
  const presentation = config.presentation ?? 'dual'
  const sequence = getCh2SliceSequence(config.sequence)
  useEffect(() => { doneCallback.current = onDone }, [onDone])
  useEffect(() => {
    const priorFocus = document.activeElement
    panelRef.current?.focus({ preventScroll: true })
    return () => {
      if (priorFocus instanceof HTMLElement && priorFocus.isConnected) priorFocus.focus({ preventScroll: true })
    }
  }, [])

  const finish = useCallback(() => {
    if (completed.current) return
    completed.current = true
    doneCallback.current()
  }, [])

  useEffect(() => {
    const tick = () => {
      const next = ch2ScanFrame(config, startedAt)
      setFrame(next)
      if (next.complete) finish()
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
      const target = Math.min(elapsed, config.durationMs / 1000)
      // A seek may itself emit playing. Only correct meaningful drift, never seek in a loop.
      if (Math.abs(recording.currentTime - target) > 0.08) {
        try { recording.currentTime = target } catch { /* metadata not yet ready */ }
      }
    }
    const play = () => {
      if (document.hidden || completed.current || ch2ScanFrame(config, startedAt).complete) return
      seekToVisualTime()
      try { void recording.play().catch(() => undefined) } catch { /* browser audio unavailable */ }
    }
    const onPlaying = () => {
      // A delayed download must not start an expired or hidden acquisition sound.
      if (document.hidden || completed.current || ch2ScanFrame(config, startedAt).complete) {
        recording.pause()
        return
      }
      seekToVisualTime()
    }
    recording.addEventListener('loadedmetadata', seekToVisualTime)
    recording.addEventListener('playing', onPlaying)
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
      recording.removeEventListener('playing', onPlaying)
      recording.removeAttribute('src')
      recording.load()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [audioAllowed, acquisitionActive, config, startedAt])

  const style = { '--ch2-scan-progress': frame.progress } as CSSProperties
  return <div className="ch2-scan-overlay" role="dialog" aria-modal="true" aria-label={config.title}
    data-scan-id={config.id} data-scan-mode={config.mode} data-scan-phase={frame.phase}
    data-scan-presentation={config.mode === 'acquire' ? presentation : 'reconstruct'}
    onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}
    onKeyDown={event => {
      event.stopPropagation()
      if (event.key !== 'Tab') return
      event.preventDefault()
      const buttons = panelRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
      if (!buttons?.length) { panelRef.current?.focus(); return }
      const controls = Array.from(buttons)
      const index = controls.findIndex(button => button === document.activeElement)
      const next = event.shiftKey ? (index <= 0 ? controls.length - 1 : index - 1) : (index + 1) % controls.length
      controls[next].focus()
    }} style={style}>
    <section className="ch2-scan-panel" ref={panelRef} tabIndex={-1} aria-label="正在处理图像，完成后自动显示">
      <div className="ch2-scan-kicker">{config.mode === 'acquire' ? 'CT 控制台' : '图像工作站'}</div>
      <h2>{config.title}</h2>
      {config.mode === 'acquire' ? <div className={`ch2-scan-visuals is-${presentation}`}>
        {presentation !== 'console' && <div className={`ch2-scan-device is-${frame.phase}`}>
          <Ch2CtMotion progress={frame.progress} />
          <div className="ch2-scan-room-status" aria-hidden="true"><i />{frame.phase === 'reconstruct' ? '工作站接收数据' : frame.phase === 'position' ? '检查床就位' : '采集中'}</div>
        </div>}
        {presentation !== 'machine' && (sequence ? <Ch2SliceSequence key={sequence.id} sequence={sequence} progress={frame.progress} />
          : <figure className="ch2-slice-sequence is-unavailable" data-slice-ready="false" data-slice-unavailable>
            <figcaption className="ch2-slice-label">断层图像</figcaption>
            <div className="ch2-slice-screen"><p className="ch2-slice-placeholder">教学序列尚未就绪<span>采集继续进行</span></p></div>
            <p className="ch2-slice-counter">断层序列待接收</p>
          </figure>)}
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
      </div>
      <small>{config.mode === 'acquire' && presentation !== 'machine' ? '采集演出 · 教学序列。' : '完成后自动显示图像。'}演出时长不代表实际检查时长。</small>
    </section>
  </div>
}
