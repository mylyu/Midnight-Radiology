import { useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react'
import './Ch2Checkin.css'

export interface Ch2CheckinProps {
  title: string
  rewardText?: string
  onComplete: () => void
}

type DragSession = { id: number; grabOffset: number; thumb: HTMLDivElement }
const CONFIRM_THRESHOLD = 0.92
const clamp = (value: number) => Math.max(0, Math.min(1, value))

function releasePointer(session: DragSession | null) {
  if (!session) return
  try {
    if (session.thumb.hasPointerCapture(session.id)) session.thumb.releasePointerCapture(session.id)
  } catch { /* The browser may already have released a cancelled pointer. */ }
}

/** A completed swipe is the only pointer action that acknowledges a Chapter 2 shift. */
export function Ch2Checkin({ title, rewardText, onComplete }: Ch2CheckinProps) {
  const [progress, setProgress] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const progressRef = useRef(0)
  const completedRef = useRef(false)
  const activePointer = useRef<DragSession | null>(null)
  const pathRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)
  const instructionId = useId()
  const ready = progress >= CONFIRM_THRESHOLD

  function updateProgress(value: number) {
    const next = clamp(value)
    progressRef.current = next
    setProgress(next)
    return next
  }

  function cancelDrag() {
    const session = activePointer.current
    activePointer.current = null
    releasePointer(session)
    setDragging(false)
    if (!completedRef.current) updateProgress(0)
  }

  function complete() {
    if (completedRef.current) return
    completedRef.current = true
    updateProgress(1)
    setConfirmed(true)
    onComplete()
  }

  function pointerProgress(clientX: number, session: DragSession) {
    const path = pathRef.current?.getBoundingClientRect()
    if (!path) return 0
    const travel = path.width - session.thumb.getBoundingClientRect().width
    return travel > 0 ? clamp((clientX - path.left - session.grabOffset) / travel) : 0
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    event.stopPropagation()
    if (completedRef.current || activePointer.current || !event.isPrimary || event.button !== 0) return
    event.preventDefault()
    const thumb = event.currentTarget
    const session = { id: event.pointerId, grabOffset: event.clientX - thumb.getBoundingClientRect().left, thumb }
    activePointer.current = session
    thumb.focus({ preventScroll: true })
    try {
      thumb.setPointerCapture(event.pointerId)
    } catch {
      activePointer.current = null
      return
    }
    setDragging(true)
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const session = activePointer.current
    if (!session || session.id !== event.pointerId) return
    event.preventDefault()
    updateProgress(pointerProgress(event.clientX, session))
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>) {
    const session = activePointer.current
    if (!session || session.id !== event.pointerId) return
    event.preventDefault()
    const finalProgress = pointerProgress(event.clientX, session)
    activePointer.current = null
    releasePointer(session)
    setDragging(false)
    if (finalProgress >= CONFIRM_THRESHOLD) complete()
    else updateProgress(0)
  }

  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    const adjustments: Record<string, number> = { ArrowRight: 0.1, ArrowUp: 0.1, ArrowLeft: -0.1, ArrowDown: -0.1, PageUp: 0.25, PageDown: -0.25 }
    if (!(event.key in adjustments) && !['Home', 'End', 'Escape', 'Enter', ' '].includes(event.key)) return
    event.preventDefault()
    event.stopPropagation()
    if (completedRef.current || activePointer.current) return
    if (event.key in adjustments) updateProgress(progressRef.current + adjustments[event.key])
    else if (event.key === 'Home' || event.key === 'Escape') updateProgress(0)
    else if (event.key === 'End') updateProgress(1)
    else if (progressRef.current >= CONFIRM_THRESHOLD) complete()
  }

  useEffect(() => {
    const cancelOnInterruption = () => {
      const session = activePointer.current
      activePointer.current = null
      releasePointer(session)
      if (!completedRef.current) {
        progressRef.current = 0
        setProgress(0)
        setDragging(false)
      }
    }
    const cancelWhenHidden = () => { if (document.hidden) cancelOnInterruption() }
    window.addEventListener('blur', cancelOnInterruption)
    document.addEventListener('visibilitychange', cancelWhenHidden)
    return () => {
      window.removeEventListener('blur', cancelOnInterruption)
      document.removeEventListener('visibilitychange', cancelWhenHidden)
      const session = activePointer.current
      activePointer.current = null
      releasePointer(session)
    }
  }, [])

  const style = { '--checkin-progress': progress } as CSSProperties
  return <section className={`ch2-checkin${dragging ? ' is-dragging' : ''}${ready ? ' is-ready' : ''}${confirmed ? ' is-confirmed' : ''}`}
    data-ch2-checkin data-checkin-state={confirmed ? 'complete' : ready ? 'ready' : dragging ? 'dragging' : 'idle'}
    aria-label="第二章值班打卡" style={style}
    onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}
    onKeyDown={event => event.stopPropagation()}>
    <div className="ch2-checkin-content">
      <p className="ch2-checkin-location"><span aria-hidden="true" />影像科 · 到岗登记</p>
      <div className="ch2-checkin-machine">
        <i className="ch2-checkin-screw top-left" aria-hidden="true" />
        <i className="ch2-checkin-screw top-right" aria-hidden="true" />
        <i className="ch2-checkin-screw bottom-left" aria-hidden="true" />
        <i className="ch2-checkin-screw bottom-right" aria-hidden="true" />
        <header className="ch2-checkin-machine-header">
          <div className="ch2-checkin-brand"><span className="ch2-checkin-cross" aria-hidden="true" />影像科考勤终端</div>
          <span className="ch2-checkin-model">CT · 02</span>
        </header>
        <div className="ch2-checkin-display">
          <div className="ch2-checkin-display-top"><span>值班登记</span><span className="ch2-checkin-led"><i />{confirmed ? '已登记' : ready ? '待确认' : '待打卡'}</span></div>
          <div className="ch2-checkin-badge" aria-hidden="true">
            <div className="ch2-checkin-badge-clip" />
            <svg viewBox="0 0 64 64" fill="none"><path d="M23 17h18v18H23zM17 41h30v14H17z" fill="currentColor" /><path d="M31 43h3v9h-3zM28 46h9v3h-9z" fill="#12312e" /></svg>
            <span />
          </div>
          <p className="ch2-checkin-shift">{title}</p>
          <h2>{confirmed ? '打卡成功' : '新一班，准备就绪'}</h2>
          <p className="ch2-checkin-display-note">{confirmed ? '值班记录已确认' : '把工牌滑过去，接下这一班。'}</p>
          <div className="ch2-checkin-segments" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <span key={index} className={progress >= (index + 1) / 12 ? 'is-lit' : ''} />)}</div>
        </div>
        <div className="ch2-checkin-slide-label"><span>{confirmed ? '登记完成' : '请向右滑动打卡'}</span><span aria-hidden="true">{String(Math.round(progress * 100)).padStart(3, '0')} / 100</span></div>
        <div className="ch2-checkin-track" data-ch2-checkin-track>
          <div className="ch2-checkin-path" ref={pathRef}>
            <div className="ch2-checkin-fill" aria-hidden="true" />
            <span className="ch2-checkin-track-text" aria-hidden="true">{confirmed ? '已打卡' : ready ? '松开完成打卡' : '滑动打卡'}<span>{ready ? '✓' : '› › ›'}</span></span>
            <div className="ch2-checkin-thumb" data-ch2-checkin-thumb ref={thumbRef} role="slider" tabIndex={confirmed ? -1 : 0}
              aria-label="向右滑动打卡" aria-orientation="horizontal" aria-valuemin={0} aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)} aria-valuetext={confirmed ? '打卡成功' : ready ? '已滑到终点，松开或按回车确认' : `${Math.round(progress * 100)}%，继续向右滑动`}
              aria-disabled={confirmed} aria-describedby={instructionId}
              onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={finishDrag}
              onPointerCancel={event => { if (activePointer.current?.id === event.pointerId) cancelDrag() }}
              onLostPointerCapture={event => { if (activePointer.current?.id === event.pointerId) cancelDrag() }}
              onBlur={() => { if (!activePointer.current && !completedRef.current) updateProgress(0) }}
              onKeyDown={handleKey}>
              <span className="ch2-checkin-thumb-grip" aria-hidden="true" />
              <svg viewBox="0 0 32 32" aria-hidden="true" fill="currentColor">{confirmed ? <path d="m5 15 4-4 5 5L24 6l4 4-14 14z" /> : <path d="M3 13h14V5h4v4h4v4h4v6h-4v4h-4v4h-4v-8H3z" />}</svg>
            </div>
          </div>
        </div>
        <div className="ch2-checkin-machine-footer"><span className="ch2-checkin-vents" aria-hidden="true" /><span>深夜影像科 · 值班系统</span></div>
      </div>
      <p className="ch2-checkin-reward">{rewardText ?? '打卡完成后，开始本班工作。'}</p>
      <p id={instructionId} className="ch2-checkin-instructions">按住左侧滑块，拖到最右端后松开。<span>键盘：方向键移动，到达右端后按回车。</span></p>
      <span className="ch2-checkin-sr-only" role="status">{confirmed ? '打卡成功' : ready ? '已到达打卡位置，松开滑块或按回车完成。' : ''}</span>
    </div>
  </section>
}

export default Ch2Checkin
