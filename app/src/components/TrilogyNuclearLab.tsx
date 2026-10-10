import { useEffect, useMemo, useRef } from 'react'
import { accumulatedCounts, collimatorAcceptance, emissionFbp, emissionProjections, nuclearObject, NUCLEAR_SIZE } from '../game/trilogy-nuclear-numerics'

type Props = { task: string; value: number; secondary: number; choice: string;
  onChange: (patch: { value?: number; secondary?: number; choice?: string }) => void }
const object = nuclearObject(), size = NUCLEAR_SIZE
const labels = ['真符合', '散射符合', '随机符合']

function Heatmap({ values, width = size, height = size, maximum = 1, label }: { values: Float64Array; width?: number; height?: number; maximum?: number; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const context = ref.current?.getContext('2d'); if (!context) return
    const pixels = new Uint8ClampedArray(width * height * 4)
    for (let i = 0; i < width * height; i++) {
      const t = Math.max(0, Math.min(1, values[i] / maximum)), v = Math.round(t * 255)
      pixels[i * 4] = v; pixels[i * 4 + 1] = Math.round(v * Math.min(1, t * 2)); pixels[i * 4 + 2] = Math.round(v * Math.max(0, t * 4 - 3)); pixels[i * 4 + 3] = 255
    }
    context.putImageData(new ImageData(pixels, width, height), 0, 0)
  }, [values, width, height, maximum])
  return <figure><canvas ref={ref} width={width} height={height} role="img" aria-label={label} /><figcaption>{label}</figcaption></figure>
}

export function TrilogyNuclearLab({ task, value, choice, onChange }: Props) {
  const angles = Math.max(4, Math.round(4 + value * .6))
  const projections = useMemo(() => task === 'spect' ? emissionProjections(object, angles) : new Float64Array(), [angles, task])
  const reconstruction = useMemo(() => task === 'spect' ? emissionFbp(projections, angles) : new Float64Array(), [task, projections, angles])
  const count = useMemo(() => accumulatedCounts(1 + value * .19), [value])
  const length = 10 + value * .45, acceptance = collimatorAcceptance(7, length)
  const event = labels.includes(choice) ? choice : labels[0]
  const timeWindow = 2 + value * .1
  const spectra = Array.from({ length: 46 }, (_, i) => `${i ? 'L' : 'M'}${25 + i * 8},${230 - Math.exp(-(((i - 32) / 3) ** 2)) * 120 - Math.exp(-(((i - 13) / 8) ** 2)) * 52}`).join(' ')
  return <div className="trilogy-course-work">
    <div className="trilogy-course-view">
      {task === 'spect' ? <div className="trilogy-nuclear-panels"><Heatmap values={object} label="同一个活度分布" /><Heatmap values={reconstruction} label={`${angles}个方向重建`} /><Heatmap values={projections} width={size} height={angles} maximum={12} label="投影随角度排开" /></div>
        : task === 'counting' ? <div className="trilogy-nuclear-panels two"><Heatmap values={object} label="分布参照" /><Heatmap values={count.image} label={`累计${count.step}段计数`} /></div>
          : <svg viewBox="0 0 480 300" role="img" aria-label={task === 'collimator' ? '准直器筛选入射方向与能窗筛选能量' : 'PET符合事件与响应线'}>
            <rect width="480" height="300" fill="#07121e" />
            {task === 'collimator' ? <>
              <text x="20" y="22">方向先筛一次，能量再筛一次</text>
              <circle cx="87" cy="90" r="15" fill="#fb923c" />
              <path d="M104 90H422M104 90L422 35M104 90L422 145" stroke="#fbbf24" strokeDasharray="6 5" fill="none" />
              {Array.from({ length: 7 }, (_, i) => <rect key={i} x={310 - length} y={33 + i * 18} width={length} height="9" fill="#8b9cac" />)}
              <rect x="319" y="31" width="12" height="135" fill="#5eead4" /><rect x="344" y="31" width="23" height="135" fill="#527b8e" />
              <rect x="310" y="31" width="5" height="135" fill="#07121e" />
              <text x="20" y="184">孔越长，斜着来的越难穿过去。</text>
              <path d={spectra} stroke="#f9d180" strokeWidth="2" fill="none" />
              <rect x="249" y="199" width="65" height="50" fill="#5eead425" stroke="#5eead4" />
              <text x="20" y="281">能窗只留下目标能量附近的事件</text>
            </> : <>
              <circle cx="230" cy="148" r="105" stroke="#647e8e" strokeWidth="15" fill="none" />
              <ellipse cx="230" cy="148" rx="46" ry="72" fill="#466575" />
              {event === '真符合' ? <><circle cx="213" cy="139" r="5" fill="#fb923c" /><path d="M129 97L328 211" stroke="#fcd34d" strokeWidth="3" /><text x="18" y="276">同一次湮灭：两端记录连成一条响应线。</text></>
                : event === '散射符合' ? <><path d="M129 97L213 139L271 83L328 211" stroke="#fcd34d" strokeWidth="3" fill="none" /><path d="M129 97L328 211" stroke="#fb7185" strokeDasharray="5 4" /><text x="18" y="276">一颗光子途中转向，连线就偏离了来源。</text></>
                  : <><circle cx="207" cy="125" r="5" fill="#fb923c" /><circle cx="250" cy="175" r="5" fill="#5eead4" /><path d="M129 97L207 125M250 175L328 211" stroke="#fcd34d" strokeWidth="3" /><path d="M129 97L328 211" stroke="#fb7185" strokeDasharray="5 4" /><text x="18" y="276">不同事件恰巧撞进时间窗，也可能被配成一对。</text></>}
              <text x="18" y="25">时间窗 {timeWindow.toFixed(1)} ns</text>
            </>}
          </svg>}
    </div>
    <aside className="trilogy-lab-controls">
      {task === 'spect' && <><label>采集方向数 · {angles}<input aria-label="采集方向" type="range" min="0" max="100" value={value} onChange={e => onChange({ value: +e.target.value })} /></label><button onClick={() => onChange({ value: Math.min(100, value + 12) })}>多留几个方向</button><p>两处亮点在某个方向会叠起来。多转几个方向，断层里才容易分开。</p><small>半圈内均匀采样 · 同一教学分布</small></>}
      {task === 'counting' && <><button disabled={value >= 100} onClick={() => onChange({ value: Math.min(100, value + 6) })}>再积累一小段计数</button><button onClick={() => onChange({ value: 0 })}>从短采集回看</button><p>同一分布，已累计 {Math.round(count.counts.reduce((a, b) => a + b, 0))} 个事件。多收一些，随机起伏占的比例小一些；亮点本身没被搬走。</p></>}
      {task === 'collimator' && <><label>准直孔长度<input aria-label="准直孔长度" type="range" min="0" max="100" value={value} onChange={e => onChange({ value: +e.target.value })} /></label><p>这束斜入射光子的几何通过比例：{Math.round(acceptance * 100)}%。孔变长能更严格选方向，也会少收计数。</p><small>后面的闪烁晶体发光，光电转换与定位电路再把事件记下来。</small></>}
      {task === 'coincidence' && <><div className="trilogy-course-buttons">{labels.map(c => <button key={c} aria-pressed={event === c} onClick={() => onChange({ choice: c })}>{c}</button>)}</div><label>符合时间窗<input aria-label="符合时间窗" type="range" min="0" max="100" value={value} onChange={e => onChange({ value: +e.target.value })} /></label><p>把时间窗从2拉到12 ns，这个固定单计数率示例中的随机配对量约变成 {(timeWindow / 2).toFixed(1)} 倍。窗口太紧也会漏掉真事件。</p></>}
    </aside>
  </div>
}
