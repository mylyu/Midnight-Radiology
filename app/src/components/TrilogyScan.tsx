import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { TrilogyScanConfig } from '../game/trilogy-types'
import { ch2ScanFrame } from '../game/ch2-scans'
import { assetUrl } from '../lib/chapter-assets'
import { imageAsset } from '../lib/image-assets'
import { CH2_CT_GANTRY_CLIP, CH2_CT_MOTION, ch2CtBedPosition } from '../game/ch2-ct-motion'
import './Ch2ScanOverlay.css'
import './TrilogyScan.css'

/** Same saved wall clock, modal/controls and progress vocabulary as Chapter 2.
 * The actual device action is modality-specific: US probe, static MRI magnet,
 * PET ring and moving couch. Audio never owns completion. */
export function TrilogyScan({ scan, node, startedAt, muted, onDone }: {
  scan: TrilogyScanConfig; node: string; startedAt: number; muted: boolean; onDone: () => void
}) {
  const duration = scan.durationMs ?? 3000
  const frameConfig = { id: node, mode: 'acquire' as const, title: scan.label, detail: '', durationMs: duration }
  const [frame, setFrame] = useState(() => ch2ScanFrame(frameConfig, startedAt))
  const [quiet, setQuiet] = useState(false)
  const finished = useRef(false), done = useRef(onDone), panel = useRef<HTMLElement>(null)
  useEffect(() => { done.current = onDone }, [onDone])
  useEffect(() => {
    panel.current?.focus({ preventScroll: true })
    const tick = () => {
      const next = ch2ScanFrame({ id: node, mode: 'acquire', title: scan.label, detail: '', durationMs: duration }, startedAt)
      setFrame(next)
      if (next.complete && !finished.current) { finished.current = true; done.current() }
    }
    const first = window.setTimeout(tick, 0), timer = window.setInterval(tick, 50)
    document.addEventListener('visibilitychange', tick); window.addEventListener('pageshow', tick)
    return () => { clearTimeout(first); clearInterval(timer); document.removeEventListener('visibilitychange', tick); window.removeEventListener('pageshow', tick) }
  }, [node, duration, startedAt, scan.label])
  const sound = scan.sound ?? `trilogy_${scan.kind === 'ultrasound' ? 'us' : scan.kind}_scan_v2`
  useEffect(() => {
    if (quiet || muted || finished.current) return
    const recording = new Audio(assetUrl(`audio/${sound}.mp3`))
    recording.volume = scan.kind === 'mri' ? .32 : .38
    const play = () => {
      const seconds = (Date.now() - startedAt) / 1000
      if (document.hidden || finished.current || seconds >= duration / 1000) return
      try { recording.currentTime = Math.max(0, seconds) } catch { /* Wait for metadata. */ }
      void recording.play().catch(() => {})
    }
    const visibility = () => document.hidden ? recording.pause() : play()
    recording.addEventListener('loadedmetadata', play); document.addEventListener('visibilitychange', visibility); play()
    return () => { recording.pause(); recording.removeEventListener('loadedmetadata', play); document.removeEventListener('visibilitychange', visibility); recording.removeAttribute('src'); recording.load() }
  }, [sound, startedAt, duration, quiet, muted, scan.kind])
  const progress = frame.progress
  const label = scan.kind === 'ultrasound'
    ? progress < .2 ? '探头接触' : progress < .78 ? '换角度，留取切面' : '切面传回工作站'
    : progress < .2 ? '检查床就位' : progress < .78 ? scan.kind === 'mri' ? '序列采集' : '符合事件采集' : '工作站重建图像'
  const style = { '--trilogy-scan-progress': progress } as CSSProperties
  return <div className="ch2-scan-overlay trilogy-scan" role="dialog" aria-modal="true" aria-label={scan.label}
    data-trilogy-scan={node} data-scan-kind={scan.kind} data-scan-phase={frame.phase} style={style}
    onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}
    onKeyDown={event => { event.stopPropagation(); if (event.key === 'Tab') { event.preventDefault(); panel.current?.querySelector('button')?.focus() } }}>
    <section className="ch2-scan-panel" ref={panel} tabIndex={-1}>
      <div className="ch2-scan-kicker">{scan.kind === 'ultrasound' ? '超声检查室' : scan.kind === 'mri' ? 'MRI 控制室' : 'PET/CT 控制台'}</div>
      <h2>{scan.label}</h2>
      <div className="trilogy-scan-pictures">
        <Device kind={scan.kind} progress={progress} />
        <div className="trilogy-scan-monitor" aria-label="采集数据传回工作站">
          {scan.image ? <img src={imageAsset(scan.image)} alt="采集中的切面" style={{ opacity: Math.min(1, progress * 1.6) }} />
            : <div className="trilogy-scan-data-grid" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ opacity: progress > i / 18 ? .8 : .1 }} />)}</div>}
          <span className="trilogy-scan-sweep" style={{ top: `${progress * 96}%` }} />
          <small>{scan.kind === 'ultrasound' ? '实时切面' : '数据接收中'}</small>
        </div>
      </div>
      <p className="ch2-scan-phase" aria-live="polite">{label}</p>
      <div className="ch2-scan-progress" role="progressbar" aria-label="图像采集进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
        <span style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="ch2-scan-progress-number">{Math.round(progress * 100)}%</div>
      <div className="ch2-scan-controls"><button onClick={() => setQuiet(value => !value)} disabled={muted}>{quiet || muted ? '设备声已关闭' : '关闭设备声'}</button></div>
      <small>完成后自动显示图像</small>
    </section>
  </div>
}

function Device({ kind, progress }: { kind: TrilogyScanConfig['kind']; progress: number }) {
  if (kind !== 'ultrasound') {
    const room = kind === 'mri' ? 'trilogy_mri_scan_room_v2' : 'trilogy_pet_scan_room_v2'
    const position = ch2CtBedPosition(progress)
    return <div className="ch2-ct-motion trilogy-device-picture" role="img" aria-label={kind === 'mri' ? '检查床沿轨道进入静止的MRI磁体' : '检查床沿轨道进入PET探测环'}>
      <img className="ch2-scan-room ch2-ct-fixed-room" src={imageAsset(room)} alt="" draggable={false} />
      <img className="ch2-ct-sliding-bed" src={imageAsset(CH2_CT_MOTION.bed)} alt="" draggable={false} data-scan-bed-travel={position.travel.toFixed(3)}
        style={{ transform: `translate(${position.x / CH2_CT_MOTION.width * 100}%,${position.y / CH2_CT_MOTION.height * 100}%)` }} />
      <img className="ch2-ct-fixed-front" src={imageAsset(room)} alt="" draggable={false} style={{ clipPath: CH2_CT_GANTRY_CLIP }} />
    </div>
  }
  return <svg viewBox="0 0 400 230" className="trilogy-device-picture" role="img" shapeRendering="crispEdges"
    aria-label="探头在体表缓缓改变位置">
    <rect width="400" height="230" fill="#142637" /><path d="M0 175h400v55H0z" fill="#25384a" />
    <path d="M0 174h400M50 230l70-56M180 230l20-56M310 230l-45-56" stroke="#41576b" strokeWidth="2" />
    <>
      <rect x="240" y="42" width="125" height="94" rx="4" fill="#7894a4" /><rect x="249" y="50" width="105" height="73" fill="#020b13" />
      <path d="M295 58l-35 56h75z" fill="#345d69" /><path d="M275 90q23-20 46 0M265 105q34-25 64 0" stroke="#b7d5d2" strokeWidth="4" fill="none" />
      <rect x="288" y="136" width="20" height="29" fill="#6f8595" /><path d="M248 160h101l10 38H240z" fill="#819aa9" />
      <rect x="261" y="178" width="14" height="8" fill="#d0d9ca" /><rect x="286" y="178" width="40" height="8" fill="#526b7e" />
      <path d="M52 128h161v20H52zM68 148h22v48H68zM180 148h18v48h-18z" fill="#9aacb5" />
      <path d="M77 110h101v18H77z" fill="#59939f" /><ellipse cx="61" cy="114" rx="17" ry="13" fill="#c9a584" />
      <g transform={`translate(${Math.sin(progress * Math.PI * 2) * 20},0)`}>
        <path d="M112 91l9 12h21l8-12z" fill="#c8d5d6" /><path d="M119 101h23v9h-23z" fill="#87a9b1" />
        <path d="M135 94C175 46 207 50 245 131" stroke="#6c8392" strokeWidth="5" fill="none" />
      </g>
      <circle cx="252" cy="202" r="9" fill="#0c1523" /><circle cx="347" cy="202" r="9" fill="#0c1523" />
    </>
  </svg>
}
