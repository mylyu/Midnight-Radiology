import { useRef, useState } from 'react'
import type { CSSProperties, PointerEvent, ReactNode } from 'react'
import { imageAsset } from '../lib/image-assets'
import { playSfx } from '../game/store'
import {
  createLdctRecord, ldctExperimentReady, LDCT_FILTER_LABELS, LDCT_FILTER_OPTIONS, LDCT_LAB_STAGES, LDCT_LAB_TITLES,
  type LdctDataset, type LdctLabRecord, type LdctLabRound, type LdctLabState,
} from '../game/ldct-experiments'
import {
  detectorPath, detectorPosition, getLdctDatasetStructures, LDCT_BP_COUNTS, LDCT_ITERATIONS,
  LDCT_DATASET_MEDIA_IDS, ldctProjectionFrameStyle,
} from '../game/ldct-projections'
import { LdctScannerGeometry } from './LdctScannerGeometry'
import { LdctFilterResponse } from './LdctFilterResponse'
import './LdctLab.css'

export type LdctLabProps = {
  round: LdctLabRound
  value: LdctLabState
  onChange: (value: LdctLabState) => void
  onSubmit: (record: LdctLabRecord) => void
  onBack?: () => void
  dataset?: LdctDataset
  goal?: string
  concealTruth?: boolean
}
type Controls = {
  value: LdctLabState
  change: (patch: Partial<LdctLabState>) => void
  choose: (patch: Partial<LdctLabState>) => void
  dataset: LdctDataset
  concealTruth: boolean
}
const addSeen = <T,>(list: T[], value: T) => list.includes(value) ? list : [...list, value]
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const hints: Record<LdctLabRound, [string, string]> = {
  1: ['点一个编号，看看它的影子', '也可以拖动角度。物体、机架落点、正弦图白线上的同色点，对应的是同一个位置；正弦图仍包含整个物体。'],
  2: ['点「把投影铺回来」', '左边始终是完整参照。把同一物体的各方向投影直接叠回来，先看看不滤波是什么样。'],
  3: ['换一种处理，看轮廓怎么变', '完整物体和投影都没换。这里只改滤波方式；不滤波的图单独归一化显示，不拿灰度亮暗直接比较。'],
  4: ['点「把光子调少」', '一起看正弦图和重建结果。改变的是模拟入射计数，角度、物体都没动；不是把检查少转几个角度。'],
  5: ['点「改第一轮」，看图怎么回来', '把猜的图算成投影，和实测投影比较，再改图。每次展示真正算出的中间结果，不重新扫描。'],
}
function Guidance({ round, goal, concealTruth }: { round: LdctLabRound; goal?: string; concealTruth: boolean }) {
  return <details className="ldct-lab__guidance" data-testid="ldct-action-guide">
    <summary><span aria-hidden="true">☞</span><strong>{goal || (round === 1 && concealTruth ? '拖动角度，跟着机架看投影' : hints[round][0])}</strong><span className="ldct-lab__guide-more">提示</span></summary>
    <p>{hints[round][1]}</p>
  </details>
}
function Frame({ frame, dataset, style }: { frame: string; dataset: LdctDataset; style?: CSSProperties }) {
  return <div className="ldct-lab__frame" data-frame={frame} data-dataset={dataset} style={{
    ...ldctProjectionFrameStyle(frame, dataset), backgroundImage: `url("${imageAsset(LDCT_DATASET_MEDIA_IDS[dataset])}")`, ...style,
  }} />
}
function Tile({ label, children, note }: { label: string; children: ReactNode; note?: string }) {
  return <figure className="ldct-lab__tile"><figcaption>{label}</figcaption><div className="ldct-lab__image">{children}</div>{note && <small>{note}</small>}</figure>
}
function Truth({ dataset, concealTruth }: Pick<Controls, 'dataset' | 'concealTruth'>) {
  if (!concealTruth) return <Frame frame="truth" dataset={dataset} />
  return <div className="ldct-lab__covered-truth" data-testid="ldct-concealed-truth">
    <svg viewBox="0 0 100 100" role="img" aria-label="灰色容器外轮廓，内部参照尚未揭开"><circle cx="50" cy="50" r="41" fill="#646464" /><circle cx="50" cy="50" r="38" fill="#484848" /></svg>
    <span>盒内参照暂未揭开</span>
  </div>
}
function Reference({ dataset, concealTruth }: Pick<Controls, 'dataset' | 'concealTruth'>) {
  return <div className="ldct-lab__reference"><div className="ldct-lab__image"><Truth dataset={dataset} concealTruth={concealTruth} /></div>
    <span>{concealTruth ? '盒子的外轮廓' : '同一个完整物体'}<small>{concealTruth ? '先看投影与重建，稍后揭开参照。' : '背景和内部结构一起参与投影，没有另换一个物体。'}</small></span>
  </div>
}
/** Same split control for complete images and measured/predicted projections. */
function Split({ left, right, divider, onChange, dataset }: { left: string; right: string; divider: number; onChange: (divider: number) => void; dataset: LdctDataset }) {
  const box = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const move = (event: PointerEvent<HTMLElement>) => {
    if (!dragging.current || !box.current) return
    const rect = box.current.getBoundingClientRect()
    onChange(Math.round(clamp((event.clientX - rect.left) / rect.width * 100, 0, 100)))
  }
  return <div ref={box} className="ldct-lab__split" data-testid="ldct-comparison">
    <Frame frame={right} dataset={dataset} /><Frame frame={left} dataset={dataset} style={{ clipPath: `inset(0 ${100 - divider}% 0 0)` }} />
    <span className="ldct-lab__divider" style={{ left: `${divider}%` }}><button aria-label="拖动比较分界" onPointerDown={event => {
      event.stopPropagation(); dragging.current = true; event.currentTarget.setPointerCapture(event.pointerId); move(event)
    }} onPointerMove={move} onPointerUp={() => { dragging.current = false }} onPointerCancel={() => { dragging.current = false }}>↔</button></span>
  </div>
}
function Range({ label, max, value, onChange, suffix = '' }: { label: string; max: number; value: number; onChange: (n: number) => void; suffix?: string }) {
  return <label className="ldct-lab__range"><span>{label}</span><output>{Math.round(value)}{suffix}</output>
    <input aria-label={label} type="range" min={0} max={max} step={1} value={value} onChange={event => onChange(Number(event.target.value))} />
  </label>
}
function Trace({ value, change, choose, dataset, concealTruth }: Controls) {
  const structures = getLdctDatasetStructures(dataset)
  const selected = concealTruth ? undefined : structures.find(s => s.id === value.structure)
  const dragging = useRef(false)
  const setAngle = (angle: number, discrete = false) => (discrete ? choose : change)({ angle, seenAngles: addSeen(value.seenAngles, Math.round(angle)) })
  const scrub = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    const rect = event.currentTarget.getBoundingClientRect()
    setAngle(Math.round(clamp((event.clientX - rect.left) / rect.width * 179, 0, 179)))
  }
  const rad = value.angle * Math.PI / 180
  return <div className="ldct-lab__trace-layout"><div className="ldct-lab__trace-main"><div className="ldct-lab__pair">
    <Tile label={concealTruth ? '先不打开盒子' : '完整物体 · 点编号追踪'}><Truth dataset={dataset} concealTruth={concealTruth} />
      {selected && <svg className="ldct-lab__overlay" viewBox="0 0 100 100" aria-hidden="true"><line x1={selected.x - 100 * Math.sin(rad)} y1={selected.y - 100 * Math.cos(rad)} x2={selected.x + 100 * Math.sin(rad)} y2={selected.y + 100 * Math.cos(rad)} stroke={selected.color} strokeWidth="1" strokeDasharray="3 2" /></svg>}
      {!concealTruth && structures.map((structure, i) => <button key={structure.id} className={`ldct-lab__point ${selected?.id === structure.id ? 'is-selected' : ''} ${!selected && i === 0 ? 'is-guided' : ''}`}
        style={{ left: `${structure.x}%`, top: `${structure.y}%`, '--point-color': structure.color } as CSSProperties}
        aria-label={`追踪${structure.label}`} aria-pressed={value.structure === structure.id}
        onClick={() => choose({ structure: structure.id, seenStructures: addSeen(value.seenStructures, structure.id) })}><span>{i + 1}</span></button>)}
    </Tile>
    <Tile label="完整正弦图 · 白线是当前角度"><Frame frame="trace:sinogram" dataset={dataset} />
      <div className="ldct-lab__sinogram-scrub" onPointerDown={event => { dragging.current = true; event.currentTarget.setPointerCapture(event.pointerId); scrub(event) }}
        onPointerMove={scrub} onPointerUp={() => { dragging.current = false }} onPointerCancel={() => { dragging.current = false }}>
        <svg className="ldct-lab__overlay" viewBox="0 0 100 100" aria-hidden="true">
          {selected && <path d={detectorPath(selected.id, 179, dataset)} stroke={selected.color} strokeWidth="1.25" fill="none" />}
          <line x1={value.angle / 180 * 100} x2={value.angle / 180 * 100} y1="0" y2="100" stroke="white" strokeWidth=".6" />
          {selected && <circle cx={value.angle / 180 * 100} cy={detectorPosition(selected.id, value.angle, dataset)} r="2.5" fill={selected.color} stroke="#071321" strokeWidth=".6" />}
        </svg>
      </div>
    </Tile>
  </div>
  <Range label="绕着看" max={179} value={value.angle} onChange={setAngle} suffix="°" />
  <div className="ldct-lab__angle-presets" aria-label="快速转到一个角度">{[0, 45, 90, 135].map(angle => <button key={angle} aria-pressed={value.angle === angle} onClick={() => setAngle(angle, true)}>{angle}°</button>)}</div>
  </div><LdctScannerGeometry angle={value.angle} structure={selected?.id ?? null} dataset={dataset} concealTruth={concealTruth} /></div>
}
function Backproject({ value, choose, dataset, concealTruth }: Controls) {
  const count = LDCT_BP_COUNTS[value.bpStep]
  return <>
    <div className="ldct-lab__pair">
      <Tile label={concealTruth ? '暂不揭开参照' : '完整物体 · 参照'}><Truth dataset={dataset} concealTruth={concealTruth} /></Tile>
      <Tile label={`直接反投影 · ${count}个方向`}><Frame frame={`bp:${count}`} dataset={dataset} /></Tile>
    </div>
    <div className="ldct-lab__transport"><button className="ldct-lab__primary" disabled={value.bpStep === LDCT_BP_COUNTS.length - 1}
      onClick={() => choose({ bpStep: LDCT_BP_COUNTS.length - 1 })}>{value.bpStep === LDCT_BP_COUNTS.length - 1 ? '已经铺回这组完整投影' : '把投影铺回来 →'}</button></div>
    <details className="ldct-lab__extra"><summary>想看中间怎么叠起来？</summary><div className="ldct-lab__chips">{LDCT_BP_COUNTS.map((n, i) => <button key={n} aria-pressed={value.bpStep === i} onClick={() => choose({ bpStep: i })}>{n}个</button>)}</div>
      <p>这里只改变参加反投影的方向数量，不代表临床低剂量扫描。</p></details>
    <LdctFilterResponse filter="none" compact />
  </>
}
function FilterButtons({ value, choose }: Pick<Controls, 'value' | 'choose'>) {
  const select = (filter: LdctLabState['filter']) => choose({ filter, seenFilters: addSeen(value.seenFilters, filter) })
  return <label className="ldct-lab__filter-select"><span>滤波方式</span><select aria-label="选择反投影滤波器" value={value.filter} onChange={event => select(event.target.value as LdctLabState['filter'])}>
    {LDCT_FILTER_OPTIONS.map(filter => <option key={filter} value={filter}>{LDCT_FILTER_LABELS[filter]}</option>)}
  </select></label>
}
function Filter({ value, change, choose, dataset, concealTruth }: Controls) {
  return <>
    <div className="ldct-lab__pair"><Tile label={concealTruth ? '暂不揭开参照' : '完整物体 · 参照'}><Truth dataset={dataset} concealTruth={concealTruth} /></Tile>
      <Tile label={LDCT_FILTER_LABELS[value.filter]}><Frame frame={`fbp:high:${value.filter}`} dataset={dataset} /></Tile></div>
    <div className="ldct-lab__chips" aria-label="常用滤波比较">{(['none', 'ramp', 'hann'] as const).map(filter => <button key={filter} aria-pressed={value.filter === filter}
      onClick={() => choose({ filter, seenFilters: addSeen(value.seenFilters, filter) })}>{filter === 'none' ? '不滤波' : filter === 'ramp' ? '锐一些' : '柔一些'}</button>)}</div>
    <details className="ldct-lab__extra"><summary>更多滤波器与拖动对照</summary><FilterButtons value={value} choose={choose} />
      <div className="ldct-lab__single"><div className="ldct-lab__split-labels"><span>固定 · Ramp</span><span>{LDCT_FILTER_LABELS[value.filter]}</span></div>
        <div className="ldct-lab__image"><Split left="fbp:high:ramp" right={`fbp:high:${value.filter}`} divider={value.divider} onChange={divider => change({ divider })} dataset={dataset} /></div></div>
      <Range label="拖开比较" max={100} value={value.divider} onChange={divider => change({ divider })} suffix="%" /></details>
    <LdctFilterResponse filter={value.filter} compact />
    {value.filter === 'none' && <p className="ldct-lab__status">不滤波这版单独归一化显示。先比较形状和糊边，不直接比亮暗。</p>}
  </>
}
function Noise({ value, choose, dataset, concealTruth }: Controls) {
  const setSignal = (signal: LdctLabState['signal']) => choose({ signal, seenSignals: addSeen(value.seenSignals, signal) })
  return <>
    <div className="ldct-lab__pair"><Tile label={`完整正弦图 · ${{ high: '多', medium: '中', low: '少' }[value.signal]}光子`}><Frame frame={`sinogram:${value.signal}`} dataset={dataset} /></Tile>
      <Tile label={`重建图 · ${LDCT_FILTER_LABELS[value.filter]}`}><Frame frame={`fbp:${value.signal}:${value.filter}`} dataset={dataset} /></Tile></div>
    <div className="ldct-lab__transport"><button className="ldct-lab__primary" onClick={() => setSignal(value.signal === 'low' ? 'high' : 'low')}>{value.signal === 'low' ? '对一下光子多的那版' : '把光子调少 →'}</button></div>
    <Reference dataset={dataset} concealTruth={concealTruth} />
    <details className="ldct-lab__extra"><summary>再试信号水平与滤波器</summary>
      <div className="ldct-lab__chips">{(['high', 'medium', 'low'] as const).map(signal => <button key={signal} aria-pressed={value.signal === signal} onClick={() => setSignal(signal)}>{({ high: '多光子', medium: '中等', low: '少光子' })[signal]}</button>)}</div>
      <FilterButtons value={value} choose={choose} /><LdctFilterResponse filter={value.filter} compact /></details>
  </>
}
function Iterate({ value, change, choose, dataset, concealTruth }: Controls) {
  const [residual, setResidual] = useState(false)
  const count = LDCT_ITERATIONS[value.iterationStep]
  const jump = (step: number) => choose({ iterationStep: step, seenIterations: addSeen(value.seenIterations, step) })
  return <>
    <div className="ldct-lab__pair"><Tile label={`当前估计 · ${count === 0 ? '从空白开始' : `第${count}轮`}`}><Frame frame={`iteration:${count}`} dataset={dataset} /></Tile>
      <Tile label="完整参照 · 不是这次算出的结果"><Truth dataset={dataset} concealTruth={concealTruth} /></Tile></div>
    <div className="ldct-lab__transport"><button className="ldct-lab__primary" disabled={value.iterationStep === LDCT_ITERATIONS.length - 1}
      onClick={() => jump(value.iterationStep + 1)}>{value.iterationStep === 0 ? '算投影、比差别、改第一轮 →' : value.iterationStep === LDCT_ITERATIONS.length - 1 ? '先停在第8轮' : `再改到第${LDCT_ITERATIONS[value.iterationStep + 1]}轮 →`}</button></div>
    <div className="ldct-lab__process"><span>猜图</span><b>→</b><span>算投影</span><b>→</b><span>比差别</span><b>→</b><span>改图 ↩</span></div>
    <details className="ldct-lab__extra"><summary>它到底在比较什么？</summary>
      <div className="ldct-lab__single"><div className="ldct-lab__split-labels"><span>{residual ? '实测与预测的差别' : '左：实测投影'}</span><span>{residual ? `第${count}轮` : '右：当前图算出的投影'}</span></div>
        <div className="ldct-lab__image">{residual ? <Frame frame={`residual:${count}`} dataset={dataset} /> : <Split left="sinogram:low" right={`forward:${count}`} divider={value.divider} onChange={divider => change({ divider })} dataset={dataset} />}</div></div>
      {!residual && <Range label="对比实测与预测" max={100} value={value.divider} onChange={divider => change({ divider })} suffix="%" />}
      <button className="ldct-lab__compare" aria-pressed={residual} onClick={() => { setResidual(!residual); void playSfx('click') }}>{residual ? '回到两份投影' : '看看差别图'}</button>
      <div className="ldct-lab__chips">{LDCT_ITERATIONS.map((n, i) => <button key={n} aria-pressed={value.iterationStep === i} onClick={() => jump(i)}>{n === 0 ? '初始' : `${n}轮`}</button>)}</div>
      <p>同一份测量继续算，不是重扫。轮数更多，也不保证临床结果更好。</p></details>
  </>
}
/** One action and one continuation; story/session owns the atomic record receipt. */
export function LdctLab({ round, value, onChange, onSubmit, onBack, dataset = 'phantom', goal, concealTruth = false }: LdctLabProps) {
  const [openedAt] = useState(() => performance.now())
  const lastClick = useRef(0)
  const canSubmit = useRef(false)
  const pointerReady = useRef(false)
  const submitted = useRef(false)
  const change = (patch: Partial<LdctLabState>) => { if (!submitted.current) onChange({ ...value, ...patch, saved: null }) }
  const choose = (patch: Partial<LdctLabState>) => {
    if (submitted.current || !Object.entries(patch).some(([key, next]) => value[key as keyof LdctLabState] !== next)) return
    change(patch); void playSfx('click')
  }
  const ready = ldctExperimentReady(value, round)
  const submit = (helped: boolean, pointer: boolean) => {
    if (submitted.current || !canSubmit.current || (pointer && !pointerReady.current)) return
    const record = createLdctRecord(helped ? { ...value, helped: true } : value, round, helped ? 'uncertain' : 'different', dataset)
    if (!record) return
    submitted.current = true
    onSubmit(record); void playSfx('click')
  }
  const tools: Record<LdctLabRound, typeof Trace> = { 1: Trace, 2: Backproject, 3: Filter, 4: Noise, 5: Iterate }
  const Tool = tools[round]
  return <section className="ldct-lab ldct-lab--short" aria-label="重建实验台" data-round={round} data-stage={LDCT_LAB_STAGES[round]} data-dataset={dataset}
    onPointerDownCapture={() => { const now = performance.now(); pointerReady.current = now - openedAt >= 900 && now - lastClick.current >= 300 }}
    onClickCapture={() => { const now = performance.now(); canSubmit.current = now - openedAt >= 900 && now - lastClick.current >= 300; lastClick.current = now }}
    onClick={event => event.stopPropagation()} onKeyDownCapture={event => { if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault() }}>
    <header className="ldct-lab__header"><div><span className="ldct-lab__eyebrow">数字模体 · 同一份投影</span><h2>{LDCT_LAB_TITLES[round]}</h2></div>
      {onBack && <button className="ldct-lab__quiet" onClick={() => { onBack(); void playSfx('click') }}>先放一放</button>}</header>
    <Guidance round={round} goal={goal} concealTruth={concealTruth} />
    <Tool value={value} change={change} choose={choose} dataset={dataset} concealTruth={concealTruth} />
    <footer className="ldct-lab__footer"><div className="ldct-lab__actions">
      <button className="ldct-lab__primary" disabled={!ready} onClick={event => submit(false, event.detail > 0)}>继续</button>
      <button onClick={event => submit(true, event.detail > 0)}>还没看明白，一起聊聊</button>
    </div></footer>
  </section>
}
