import { useEffect, useRef, useState } from 'react'
import { UltrasoundPhantom, renderUltrasoundPhantom } from './UltrasoundPhantom'
import { ultrasoundEcho, ultrasoundResolutionFrame } from '../game/trilogy-ultrasound-numerics'

type Props = { task: string; value: number; secondary: number; choice: string;
  onChange: (patch: { value?: number; secondary?: number; choice?: string }) => void }
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n))

/** All diagrams use the same fixed reflectors; a moved control changes the
 * propagation time, gain, sampling or Doppler frequency, not a cosmetic filter. */
export function TrilogyUltrasoundLab({ task, value, secondary, choice, onChange }: Props) {
  const [pulse, setPulse] = useState(0)
  const canvas = useRef<HTMLCanvasElement>(null)
  const echo = ultrasoundEcho(value, secondary)
  const depth = Math.round(echo.depthMm), delay = echo.roundTripUs
  const echoLines = choice.startsWith('echo-lines-') ? clamp(Number(choice.slice(11)) || 0, 0, 24) : 0
  const angle = Math.round(5 + value * .84), away = choice === '远离探头'
  const frequency = 2 * 5e6 * .35 * Math.cos(angle * Math.PI / 180) / 1540 / 1000 * (away ? -1 : 1)
  const lines = 64 + Math.round(clamp(value, 0, 100) / 100 * 192 / 16) * 16
  const maxDepth = 30 + clamp(secondary, 0, 65) * .9
  useEffect(() => {
    if (!['resolution', 'spatial_resolution'].includes(task) || !canvas.current) return
    const frame = task === 'spatial_resolution' ? ultrasoundResolutionFrame(value, secondary)
      : renderUltrasoundPhantom({ position: 50, gain: 50, depth: clamp((maxDepth - 20) / .7, 0, 100), probe: '凸阵', scanLines: lines }, 384, 288)
    canvas.current.width = frame.width; canvas.current.height = frame.height
    const context = canvas.current.getContext('2d')
    context?.putImageData(new ImageData(frame.pixels, frame.width, frame.height), 0, 0)
    if (task === 'spatial_resolution' && context) {
      context.font = '15px sans-serif'; context.fillStyle = '#cbd5e1'; context.textAlign = 'center'
      context.fillText('前后两点', 109, 30); context.fillText('左右两点', 291, 30)
      context.textAlign = 'left'; context.fillStyle = '#5eead4'; context.fillText('声束 ↓', 14, 220)
    }
  }, [task, lines, maxDepth, value, secondary])
  const path = (fn: (x: number) => number, from = 0, to = 240) => Array.from({ length: 121 }, (_, i) => {
    const x = from + (to - from) * i / 120
    return `${i ? 'L' : 'M'}${x.toFixed(1)},${fn(x).toFixed(1)}`
  }).join(' ')
  return <div className="trilogy-course-work trilogy-ultrasound-work" data-us-task={task}>
    <div className="trilogy-course-view">
      {task === 'tgc' ? <UltrasoundPhantom position={50} gain={value} depth={90} probe="凸阵" tgc={secondary * .32} depthLossDb={24} />
        : task === 'resolution' || task === 'spatial_resolution' ? <canvas ref={canvas} aria-label={task === 'spatial_resolution' ? '位置不变的前后和左右两对细丝：改变脉冲长度与声束宽度' : '同一模体在不同扫描线数和深度下的B图'} role="img" style={{ imageRendering: 'pixelated' }} />
          : <svg viewBox={task === 'm_mode' ? '0 15 480 255' : '0 0 480 300'} role="img" aria-label={task === 'echo' ? '同一条声束的回波时间、深度和亮点对应' : task === 'm_mode' ? '运动界面从B超图的一条线展开成M超' : '血流相对探头的方向与频移'}>
            <rect width="480" height="300" fill="#07121e" />
            {task === 'echo' ? <>
              <text x="22" y="24">同一组界面 · 逐条扫过</text>
              <rect x="24" y="62" width="55" height="40" rx="6" fill="#b5cfcc" />
              <path d="M80 82H446" stroke="#466579" strokeDasharray="4 5" />
              <path d={`M${95 + depth * 3.6} 50V120`} stroke="#f9d180" strokeWidth="5" />
              <path d="M132 55V113" stroke="#7999a9" strokeWidth="3" />
              {pulse > 0 && <circle key={pulse} cy="82" r="5" fill="#5eead4"><animate attributeName="cx" values={`80;${95 + depth * 3.6};80`} dur="1.3s" repeatCount="1" /></circle>}
              <text x="100" y="145">{depth} mm · 回波往返 {delay.toFixed(0)} μs</text>
              <path d="M30 248H265M30 172V248" stroke="#64748b" fill="none" />
              <path d={path(x => 244 - 33 * Math.exp(-(((x - 62) / 3) ** 2)) - 65 * echo.amplitude * Math.exp(-(((x - (37 + delay * 1.95)) / 3) ** 2)), 30, 265)} stroke="#5eead4" fill="none" strokeWidth="2" />
              <text x="30" y="278">A线 · 回波时间 →</text>
              <rect x="294" y="173" width="160" height="82" fill="#182b3e" />
              {Array.from({ length: echoLines }, (_, i) => <g key={i}>
                <rect x={295 + i * 6.6} y="182" width="6.3" height="3" fill="#777" />
                <rect x={295 + i * 6.6} y={174 + depth * .87} width="6.3" height="3" fill={`rgb(${Math.round(255 * echo.amplitude)},${Math.round(255 * echo.amplitude)},${Math.round(255 * echo.amplitude)})`} />
              </g>)}
              {echoLines > 0 && <path d={`M${295 + (echoLines - 1) * 6.6} 173V255`} stroke="#5eead4" strokeWidth="1" />}
              <text x="298" y="278">B图 · {echoLines} 条线</text>
            </> : task === 'm_mode' ? <>
              <text x="20" y="45" className="trilogy-mmode-label">B超</text><text x="188" y="45" className="trilogy-mmode-label">M超</text>
              <rect x="20" y="50" width="125" height="185" fill="#172936" />
              <path d="M83 50V235" stroke="#5eead4" strokeDasharray="5 4" />
              {[0, 1].map(k => { const y = 120 + k * 55 + Math.sin(value / 100 * Math.PI * 6) * (k ? -12 : 12); return <path key={k} d={`M22 ${y}H143`} stroke="#cbd5e1" strokeWidth="5" fill="none" /> })}
              <path d="M180 55V235H455" stroke="#64748b" fill="none" />
              {[0, 1].map(k => <path key={k} d={path(x => 120 + k * 55 + Math.sin((x - 185) / 265 * Math.PI * 6) * (k ? -12 : 12), 185, 450)} stroke={k ? '#f9d180' : '#dbeafe'} fill="none" strokeWidth="4" />)}
              <path d={`M${185 + value * 2.65} 60V235`} stroke="#5eead4" strokeWidth="2" />
              <text x="188" y="262" className="trilogy-mmode-label">时间 →</text>
            </> : <>
              <text x="20" y="24">同一段血流，改变声束夹角</text>
              <path d="M45 127H435M45 160H435" stroke="#7796a6" strokeWidth="3" />
              <path d={away ? 'M220 143H280l-12-8m12 8-12 8' : 'M220 143H160l12-8m-12 8 12 8'} stroke={away ? '#60a5fa' : '#fb7185'} strokeWidth="4" fill="none" />
              <g transform={`rotate(${-angle},240,142)`}><path d="M115 142H235" stroke="#fcd34d" strokeWidth="3" strokeDasharray="5 3" /><rect x="83" y="132" width="30" height="20" fill="#c7d7d6" /></g>
              <text x="26" y="202">夹角 {angle}° · 频移 {frequency > 0 ? '+' : ''}{frequency.toFixed(2)} kHz</text>
              <path d={path(x => 247 - Math.sin((x - 20) * Math.abs(frequency) * .12) * 15 * Math.abs(frequency) / 2.3, 20, 455)} stroke={away ? '#60a5fa' : '#fb7185'} strokeWidth="2" fill="none" />
              <text x="26" y="286">越接近垂直，能测到的频移越小。</text>
            </>}
          </svg>}
    </div>
    <aside className="trilogy-lab-controls">
      {task === 'echo' && <><label>反射界面深度 · {depth} mm<input aria-label="反射界面深度" type="range" min="0" max="100" value={value} onChange={e => onChange({ value: +e.target.value, choice: 'echo-lines-0' })} /></label><button onClick={() => { setPulse(n => n + 1); onChange({ choice: `echo-lines-${Math.min(24, echoLines + 4)}` }) }}>发出脉冲，扫过四条线</button><p>回波越晚到，亮点的位置越深。把不同位置的扫描线排在一起，就是B图。</p><details><summary>再看看回波强弱</summary><label>反射强弱<input aria-label="反射强弱" type="range" min="0" max="100" value={secondary} onChange={e => onChange({ secondary: +e.target.value, choice: 'echo-lines-0' })} /></label><p>A线的峰变矮，B图对应的亮点也变暗。</p></details></>}
      {task === 'tgc' && <><label>总体增益<input aria-label="总体增益" type="range" min="0" max="100" value={value} onChange={e => onChange({ value: +e.target.value })} /></label><label>深处补偿<input aria-label="深处补偿" type="range" min="0" max="100" value={secondary} onChange={e => onChange({ secondary: +e.target.value })} /></label><p>先调总增益，再调深处补偿。增益只能放大收到的回波，不能补出被遮住的结构。</p></>}
      {task === 'm_mode' && <><label>沿时间回看<input aria-label="沿时间回看" type="range" min="0" max="100" value={value} onChange={e => onChange({ value: +e.target.value })} /></label><p>左边看B图里的这条声线，右边沿时间看它怎样动。竖着仍是深度，横着是时间。</p></>}
      {task === 'doppler' && <><label>声束与血流夹角 · {angle}°<input aria-label="声束夹角" type="range" min="0" max="100" value={value} onChange={e => onChange({ value: +e.target.value })} /></label><div className="trilogy-course-buttons">{['朝向探头', '远离探头'].map(c => <button key={c} aria-pressed={away === (c === '远离探头')} onClick={() => onChange({ choice: c })}>{c}</button>)}</div><p>本图红蓝只表示相对探头的方向，不表示动脉和静脉。</p></>}
      {task === 'resolution' && <><label>每帧扫描线 · {lines}<input aria-label="扫描线数" type="range" min="0" max="100" value={value} onChange={e => onChange({ value: +e.target.value })} /></label><label>扫到多深 · {Math.round(maxDepth)} mm<input aria-label="最大扫描深度" type="range" min="0" max="65" value={Math.min(secondary, 65)} onChange={e => onChange({ secondary: +e.target.value })} /></label><p>只算声波往返，约 {Math.round(1540000 / (2 * maxDepth * lines))} 帧/秒。线越密、看得越深，每帧等得越久；实际还要处理数据。</p></>}
      {task === 'spatial_resolution' && <><label>先缩短脉冲，看看前后两点<input aria-label="缩短脉冲" type="range" min="0" max="100" value={value} onChange={e => onChange({ value: +e.target.value })} /><span className="trilogy-us-range-ends"><span>长</span><span>短</span></span></label><label>再收窄声束，看看左右两点<input aria-label="收窄声束" type="range" min="0" max="100" value={secondary} onChange={e => onChange({ secondary: +e.target.value })} /><span className="trilogy-us-range-ends"><span>宽</span><span>窄</span></span></label><p>四根细丝一直没动。前后能否分开看脉冲，左右能否分开看声束。</p></>}
    </aside>
  </div>
}
