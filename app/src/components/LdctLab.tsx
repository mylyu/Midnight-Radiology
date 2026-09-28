import { useRef, useState } from 'react'
import type { CSSProperties, PointerEvent, ReactNode } from 'react'
import { imageAsset } from '../lib/image-assets'
import { playSfx } from '../game/store'
import {
  createLdctRecord, createLdctChestDraft, ldctExperimentReady, LDCT_FILTER_LABELS, LDCT_FILTER_OPTIONS, LDCT_LAB_STAGES, LDCT_LAB_TITLES,
  type LdctDataset, type LdctLabRecord, type LdctLabRound, type LdctLabState,
} from '../game/ldct-experiments'
import {
  detectorPath, detectorPosition, getLdctDatasetStructures, LDCT_BP_COUNTS, LDCT_ITERATIONS,
  LDCT_DATASET_MEDIA_IDS, ldctProjectionFrameStyle, type LdctDataset as ProjectionDataset,
} from '../game/ldct-projections'
import { ldctChestFrame, ldctChestFrameStyle, LDCT_CHEST_ITERATIONS } from '../game/ldct-chest'
import { LDCT_EXPOSURE_LEVELS, LDCT_EXPOSURE_MEDIA_ID, ldctExposureFrameStyle } from '../game/ldct-exposure'
import { LDCT_MANUAL_BP_COUNTS, LDCT_MANUAL_BP_MEDIA_ID, ldctManualBpFrameStyle } from '../game/ldct-manual-bp'
import {
  LDCT_DEEP_EXPOSURE_LEVELS, LDCT_DEEP_ITERATIONS, ldctDeepChestFrame, ldctDeepChestFrameStyle,
  ldctDeepExposureFrame, ldctDeepExposureFrameStyle,
} from '../game/ldct-deep-experiments'
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
  dataset: ProjectionDataset
  concealTruth: boolean
}
const addSeen = <T,>(list: T[], value: T) => list.includes(value) ? list : [...list, value]
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const hints: Record<LdctLabRound, [string, string]> = {
  1: ['点一个编号，看看它的影子', '也可以拖动角度。物体、机架落点、正弦图白线上的同色点，对应的是同一个位置；正弦图仍包含整个物体。'],
  2: ['每点一次，再铺回一组投影', '点一下才增加一组方向，停手就留在这一步。每一步都是实际计算的中间结果；旁边保留完整物体参照。'],
  3: ['换一种处理，看轮廓怎么变', '完整物体和投影都没换，只改滤波方式。不滤波使用固定显示窗，先看轮廓和糊边。'],
  4: ['点「把光子调少」', '一起看正弦图和重建结果。改变的是模拟入射计数，角度、物体都没动；不是把检查少转几个角度。'],
  5: ['点「改第一轮」，看图怎么回来', '把猜的图算成投影，和实测投影比较，再改图。每次展示真正算出的中间结果，不重新扫描。'],
}
function Guidance({ round, goal, concealTruth }: { round: LdctLabRound; goal?: string; concealTruth: boolean }) {
  return <details className="ldct-lab__guidance" data-testid="ldct-action-guide">
    <summary><span aria-hidden="true">☞</span><strong>{goal || (round === 1 && concealTruth ? '拖动角度，跟着机架看投影' : hints[round][0])}</strong><span className="ldct-lab__guide-more">提示</span></summary>
    <p>{hints[round][1]}</p>
  </details>
}
function Frame({ frame, dataset, style }: { frame: string; dataset: ProjectionDataset; style?: CSSProperties }) {
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
    <span>{concealTruth ? '盒子的外轮廓' : dataset === 'phantom' ? '同一个模体的切面' : '同一个完整物体'}<small>{concealTruth ? '先看投影与重建，稍后揭开参照。' : '背景和内部结构一起参与投影，没有另换一个物体。'}</small></span>
  </div>
}
/** Same split control for complete images and measured/predicted projections. */
function Split({ left, right, divider, onChange, dataset }: { left: string; right: string; divider: number; onChange: (divider: number) => void; dataset: ProjectionDataset }) {
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
    <Tile label={concealTruth ? '先不打开盒子' : dataset === 'phantom' ? '模体切面 · 点编号追踪' : '完整物体 · 点编号追踪'}><Truth dataset={dataset} concealTruth={concealTruth} />
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
  const manual = dataset === 'phantom'
  const counts: readonly number[] = manual ? LDCT_MANUAL_BP_COUNTS : LDCT_BP_COUNTS
  const count = manual ? value.bpCount ?? LDCT_BP_COUNTS[value.bpStep] : LDCT_BP_COUNTS[value.bpStep]
  const step = counts.indexOf(count)
  const complete = step === counts.length - 1
  const added = complete ? 0 : counts[step + 1] - count
  const jump = (next: number) => choose(manual ? { bpCount: counts[next] } : { bpStep: next })
  // A click selects exactly one calculated checkpoint. The controlled draft
  // owns the step, so leaving or refreshing cannot schedule another advance.
  return <div className="ldct-backproject" data-bp-step={value.bpStep} data-bp-count={count}>
    <div className="ldct-lab__focus-layout">
      <Tile label={`直接反投影 · 已叠 ${count} 个方向`}>{manual
        ? <div className="ldct-lab__frame" data-frame={`bp:${count}`} data-dataset="phantom" style={{ ...ldctManualBpFrameStyle(count), backgroundImage: `url("${imageAsset(LDCT_MANUAL_BP_MEDIA_ID)}")` }} />
        : <Frame frame={`bp:${count}`} dataset={dataset} />}</Tile>
      <Reference dataset={dataset} concealTruth={concealTruth} />
    </div>
    <div className="ldct-backproject__progress" aria-label="逐步反投影进度"><progress max={160} value={count} /><span aria-live="polite">{complete ? '已用完整的 160 个方向' : `当前 ${count} 个方向 · 下次再加 ${added} 个`}</span></div>
    <div className="ldct-lab__transport"><button className="ldct-lab__primary" disabled={complete} onClick={() => jump(step + 1)}>{complete ? '已铺回 160 个方向' : `再铺一组投影 · +${added} 个方向 →`}</button></div>
    <div className="ldct-backproject__reset"><button className="ldct-lab__compare" disabled={step === 0} onClick={() => jump(0)}>回到第一个方向 ↺</button></div>
    <details className="ldct-lab__extra"><summary>手动细看与响应曲线</summary>
      <label className="ldct-lab__range"><span>直接反投影</span><output>{count} 个方向</output><input aria-label="手动查看反投影步骤" type="range" min={0} max={counts.length - 1} step={1} value={step}
        onChange={event => jump(Number(event.target.value))} /></label>
      <p>所有中间帧使用同一显示窗；只增加参与反投影的方向，不代表患者少照几次。</p><LdctFilterResponse filter="none" compact />
    </details>
  </div>
}
function FilterButtons({ value, choose }: Pick<Controls, 'value' | 'choose'>) {
  const select = (filter: LdctLabState['filter']) => choose({ filter, seenFilters: addSeen(value.seenFilters, filter) })
  return <label className="ldct-lab__filter-select"><span>滤波方式</span><select aria-label="选择反投影滤波器" value={value.filter} onChange={event => select(event.target.value as LdctLabState['filter'])}>
    {LDCT_FILTER_OPTIONS.map(filter => <option key={filter} value={filter}>{LDCT_FILTER_LABELS[filter]}</option>)}
  </select></label>
}
function Filter({ value, change, choose, dataset, concealTruth }: Controls) {
  const setSignal = (signal: LdctLabState['signal']) => choose({ signal, seenSignals: addSeen(value.seenSignals, signal) })
  return <>
    <div className="ldct-lab__focus-layout"><Tile label={LDCT_FILTER_LABELS[value.filter]} note={value.signal === 'low' ? '较低管电流模拟 · 其他条件固定' : undefined}><Frame frame={`fbp:${value.signal}:${value.filter}`} dataset={dataset} /></Tile>
      <Reference dataset={dataset} concealTruth={concealTruth} /></div>
    <div className="ldct-lab__chips" aria-label="常用滤波比较">{(['none', 'ramp', 'hann'] as const).map(filter => <button key={filter} aria-pressed={value.filter === filter}
      onClick={() => choose({ filter, seenFilters: addSeen(value.seenFilters, filter) })}>{filter === 'none' ? '不滤波' : filter === 'ramp' ? '锐一些' : '柔一些'}</button>)}</div>
    <details className="ldct-lab__extra"><summary>更多滤波器、管电流模拟与对照</summary><FilterButtons value={value} choose={choose} />
      <div className="ldct-lab__transport"><button onClick={() => setSignal(value.signal === 'low' ? 'high' : 'low')}>{value.signal === 'low' ? '恢复原信号' : '试试较低管电流（模拟）'}</button></div>
      <div className="ldct-lab__single"><div className="ldct-lab__split-labels"><span>固定 · Ramp</span><span>{LDCT_FILTER_LABELS[value.filter]}</span></div>
        <div className="ldct-lab__image"><Split left={`fbp:${value.signal}:ramp`} right={`fbp:${value.signal}:${value.filter}`} divider={value.divider} onChange={divider => change({ divider })} dataset={dataset} /></div></div>
      <Range label="拖开比较" max={100} value={value.divider} onChange={divider => change({ divider })} suffix="%" /><LdctFilterResponse filter={value.filter} compact /></details>
  </>
}
function Noise({ value, choose, dataset, concealTruth }: Controls) {
  const setSignal = (signal: LdctLabState['signal']) => choose({ signal, seenSignals: addSeen(value.seenSignals, signal) })
  return <>
    <div className="ldct-lab__pair"><Tile label={`完整正弦图 · ${{ high: '多', medium: '中', low: '少' }[value.signal]}光子`}><Frame frame={`sinogram:${value.signal}`} dataset={dataset} /></Tile>
      <Tile label={`重建图 · ${LDCT_FILTER_LABELS[value.filter]}`} note={value.filter === 'none' ? '固定显示窗 · 不随信号水平自动拉伸' : undefined}><Frame frame={`fbp:${value.signal}:${value.filter}`} dataset={dataset} /></Tile></div>
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
      {residual && <p data-testid="ldct-residual-scale">差异增强显示（各轮同一尺度）</p>}
      {!residual && <Range label="对比实测与预测" max={100} value={value.divider} onChange={divider => change({ divider })} suffix="%" />}
      <button className="ldct-lab__compare" aria-pressed={residual} onClick={() => { setResidual(!residual); void playSfx('click') }}>{residual ? '回到两份投影' : '看看差别图'}</button>
      <div className="ldct-lab__chips">{LDCT_ITERATIONS.map((n, i) => <button key={n} aria-pressed={value.iterationStep === i} onClick={() => jump(i)}>{n === 0 ? '初始' : `${n}轮`}</button>)}</div>
      <p>同一份测量继续算，不是重扫。轮数更多，也不保证临床结果更好。</p></details>
  </>
}

/** No truth frame or answer region is rendered here. A mark belongs to the player, not a grader. */
function ChestFrame({ frame, slice, deep = false }: { frame: string; slice: 0 | 1 | 2; deep?: boolean }) {
  const extended = deep && frame.startsWith('iteration:')
  const item = extended ? ldctDeepChestFrame(frame, slice) : ldctChestFrame(frame, slice)
  return <div className="ldct-lab__frame" data-frame={frame} data-slice={slice} data-dataset="chest" style={{
    ...(extended ? ldctDeepChestFrameStyle(frame, slice) : ldctChestFrameStyle(frame, slice)), backgroundImage: `url("${imageAsset(item.mediaId)}")`,
  }} />
}

function ExposureFrame({ kind, step, deep = false }: { kind: 'fbp' | 'sinogram'; step: number; deep?: boolean }) {
  const mediaId = deep ? ldctDeepExposureFrame(kind, step).mediaId : LDCT_EXPOSURE_MEDIA_ID
  return <div className="ldct-lab__frame" data-frame={`exposure:${kind}:${step + 1}`} data-dataset="chest" style={{
    ...(deep ? ldctDeepExposureFrameStyle(kind, step) : ldctExposureFrameStyle(kind, step)), backgroundImage: `url("${imageAsset(mediaId)}")`,
  }} />
}

function ChestExposure({ value, choose }: Pick<Controls, 'value' | 'choose'>) {
  const deep = value.exposureCount !== undefined
  const levels = deep ? LDCT_DEEP_EXPOSURE_LEVELS : LDCT_EXPOSURE_LEVELS
  const step = deep ? value.exposureCount! - 1 : value.exposureStep ?? 0
  const complete = step === levels.length - 1
  const setStep = (next: number) => choose(deep ? { exposureCount: next + 1 } : { exposureStep: next })
  return <div className="ldct-exposure" data-testid="ldct-chest-exposure" data-exposure-step={step} data-exposure-count={step + 1}>
    <div className="ldct-exposure__work">
      <Tile label="胸部重建 · FBP"><ExposureFrame kind="fbp" step={step} deep={deep} /></Tile>
      <div className="ldct-exposure__controls">
        <div className="ldct-exposure__count" aria-live="polite"><span>已积累曝光</span><output>{step + 1} / {levels.length}</output></div>
        <div className="ldct-exposure__units" style={{ gridTemplateColumns: `repeat(${levels.length}, minmax(0, 1fr))` }} aria-hidden="true">{levels.map((level, index) => <span key={level} className={index <= step ? 'is-filled' : undefined} />)}</div>
        <button className="ldct-lab__primary" disabled={complete} onClick={() => setStep(step + 1)}>{complete ? `已积累 ${levels.length}/${levels.length} 份曝光` : '再积累一份曝光'}</button>
        <button className="ldct-lab__compare" disabled={step === 0} onClick={() => setStep(0)}>回到第一份曝光 ↺</button>
        <small className="ldct-exposure__note">模拟累计曝光，不是给患者补扫。</small>
      </div>
    </div>
    <details className="ldct-lab__extra ldct-exposure__projection"><summary>看看累计投影</summary>
      <Tile label={`累计 ${step + 1} 份曝光 · 正弦图`}><ExposureFrame kind="sinogram" step={step} deep={deep} /></Tile>
      <p>每次沿用此前计数，再加一份；角度、重建方式和显示窗固定。</p>
      <p>胸部来自开放授权实扫CT，再生成模拟计数和投影；不是给陆叔追加检查。</p>
    </details>
  </div>
}

function ChestIterate({ value, choose }: Pick<Controls, 'value' | 'choose'>) {
  const chest = value.chest ?? createLdctChestDraft()
  const deep = value.iterationRound !== undefined
  const currentRound = value.iterationRound ?? LDCT_CHEST_ITERATIONS[value.iterationStep]
  const [showPinned, setShowPinned] = useState(false)
  const [reviewRound, setReviewRound] = useState<number | null>(null)
  const [marking, setMarking] = useState(false)
  const [showResidual, setShowResidual] = useState(false)
  const pressOrigin = useRef<{ x: number; y: number } | null>(null)
  const pinned = showPinned && !chest.compareFbp ? chest.pinned : null
  const slice = pinned?.slice ?? chest.slice
  const step = pinned?.iterationStep ?? value.iterationStep
  const count = pinned ? pinned.iterationRound ?? LDCT_CHEST_ITERATIONS[step] : deep ? reviewRound ?? currentRound : LDCT_CHEST_ITERATIONS[step]
  const complete = deep ? currentRound === 12 : value.iterationStep === LDCT_CHEST_ITERATIONS.length - 1
  const method = chest.compareFbp ? 'fbp' : 'iteration'
  const frame = chest.compareFbp ? 'fbp' : `iteration:${count}`
  const displayedMark = chest.mark?.slice === slice ? chest.mark : null
  const setChest = (patch: Partial<typeof chest>) => choose({ chest: { ...chest, ...patch } })
  const jump = (next: number) => {
    setShowPinned(false); setMarking(false)
    choose({ iterationStep: next, seenIterations: addSeen(value.seenIterations, next), chest: { ...chest, compareFbp: false } })
  }
  const advance = () => {
    if (complete) return
    if (!deep) { jump(value.iterationStep + 1); return }
    setShowPinned(false); setMarking(false); setReviewRound(null)
    choose({ iterationRound: currentRound + 1, chest: { ...chest, compareFbp: false } })
  }
  // Viewing a past result is not another SART step, nor a shortcut to a future
  // one. The persisted iterationRound is the furthest actually calculated state.
  const review = (round: number) => {
    if (!deep || round > currentRound) return
    setShowPinned(false); setMarking(false); setReviewRound(round)
    if (chest.compareFbp) setChest({ compareFbp: false })
  }
  const roundRecord = deep ? { iterationRound: count } : {}
  const markAt = (x: number, y: number) => {
    setChest({ mark: { x: Math.round(clamp(x, 0, 100)), y: Math.round(clamp(y, 0, 100)), slice, iterationStep: step, ...roundRecord, method } })
    setMarking(false)
  }
  return <div className="ldct-chest" data-testid="ldct-chest-iterate" data-iteration-round={deep ? currentRound : undefined} data-displayed-round={count}>
    <div className="ldct-chest__work">
      <figure className="ldct-lab__tile ldct-chest__main">
        <figcaption>{chest.compareFbp ? '同份数据 · 原FBP' : `${pinned ? '已固定' : '当前'} · ${count === 0 ? '迭代初始估计' : `第${count}轮`}`}<span>相邻层 {slice + 1}/3</span></figcaption>
        <div className={`ldct-lab__image ldct-chest__canvas${marking ? ' is-marking' : ''}`}
          role={marking ? 'button' : undefined} tabIndex={marking ? 0 : undefined}
          aria-label={marking ? '点击想请医师核查的位置；键盘回车留在图心，方向键可移动已有标记' : undefined}
          onPointerDown={event => { if (marking) pressOrigin.current = { x: event.clientX, y: event.clientY } }}
          onPointerCancel={() => { pressOrigin.current = null }}
          onPointerUp={event => {
            const origin = pressOrigin.current; pressOrigin.current = null
            if (!marking || !origin || Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 10) return
            const rect = event.currentTarget.getBoundingClientRect()
            markAt((event.clientX - rect.left) / rect.width * 100, (event.clientY - rect.top) / rect.height * 100)
          }}
          onKeyDown={event => {
            if (!marking || event.repeat) return
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); markAt(displayedMark?.x ?? 50, displayedMark?.y ?? 50) }
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
              event.preventDefault()
              const x = (displayedMark?.x ?? 50) + (event.key === 'ArrowLeft' ? -5 : event.key === 'ArrowRight' ? 5 : 0)
              const y = (displayedMark?.y ?? 50) + (event.key === 'ArrowUp' ? -5 : event.key === 'ArrowDown' ? 5 : 0)
              setChest({ mark: { x: clamp(x, 0, 100), y: clamp(y, 0, 100), slice, iterationStep: step, ...roundRecord, method } })
            }
          }}>
          <ChestFrame frame={frame} slice={slice} deep={deep} />
          {displayedMark && <span className="ldct-chest__mark" style={{ left: `${displayedMark.x}%`, top: `${displayedMark.y}%` }} aria-label="你标记的待核查位置" />}
          {marking && <span className="ldct-chest__mark-prompt">点一个想一起看的地方</span>}
        </div>
        <div className="ldct-chest__slices" aria-label="翻看相邻断层">{([0, 1, 2] as const).map(next => <button key={next} aria-pressed={slice === next}
          onClick={() => { setShowPinned(false); setMarking(false); setChest({ slice: next }) }}>{next === 0 ? '上一层' : next === 1 ? '中间层' : '下一层'}</button>)}</div>
      </figure>
      <div className="ldct-chest__controls">
        {deep && <div className="ldct-chest__round-progress" aria-live="polite"><span>已计算 {currentRound} / 12 轮</span><progress max={12} value={currentRound} /></div>}
        <button className="ldct-lab__primary ldct-chest__next" disabled={complete}
          onClick={advance}>{currentRound === 0 ? '用原数据改第一轮 →' : complete ? `已到第${deep ? 12 : 8}轮，可以往回比较` : `再改到第${deep ? currentRound + 1 : LDCT_CHEST_ITERATIONS[value.iterationStep + 1]}轮 →`}</button>
        <button className="ldct-chest__fbp-toggle" aria-pressed={chest.compareFbp} onClick={() => { setShowPinned(false); setMarking(false); setChest({ compareFbp: !chest.compareFbp }) }}>{chest.compareFbp ? '回到迭代图' : '回看原FBP'}</button>
        <details className="ldct-lab__extra ldct-chest__record-tools"><summary>固定、标记与更多轮次{chest.pinned || chest.mark ? ' · 有记录' : ''}</summary>
          <div className="ldct-lab__chips ldct-chest__versions" aria-label="切换迭代版本">{(deep ? LDCT_DEEP_ITERATIONS : LDCT_CHEST_ITERATIONS).map((n, i) => <button key={n} aria-pressed={!pinned && !chest.compareFbp && count === n}
            disabled={deep && n > currentRound} onClick={() => deep ? review(n) : jump(i)}>{n === 0 ? '初始' : `${n}轮`}</button>)}</div>
          <div className="ldct-chest__compare-controls">
          <button disabled={chest.compareFbp || count === 0} onClick={() => {
            setShowPinned(false); setChest({ pinned: { slice, iterationStep: step, ...roundRecord }, compareFbp: false })
          }}>固定这一版</button>
          {chest.pinned && <button aria-pressed={Boolean(pinned)} onClick={() => {
            setShowPinned(!pinned); setMarking(false)
            if (chest.compareFbp) setChest({ compareFbp: false })
          }}>{pinned ? '回到当前版' : `看看固定的${chest.pinned.iterationRound ?? LDCT_CHEST_ITERATIONS[chest.pinned.iterationStep]}轮 · 第${chest.pinned.slice + 1}层`}</button>}
          </div>
          <button className="ldct-chest__mark-button" aria-pressed={marking} onClick={() => setMarking(!marking)}>{marking ? '暂时不标，继续看看' : '点出想请医生核查的位置'}</button>
          {chest.mark && <p className="ldct-chest__note" aria-live="polite">待核查标记：第{chest.mark.slice + 1}层 · {chest.mark.method === 'fbp' ? 'FBP' : `${chest.mark.iterationRound ?? LDCT_CHEST_ITERATIONS[chest.mark.iterationStep]}轮`}。<button onClick={() => setChest({ mark: null })}>去掉标记</button></p>}
        </details>
        <p className="ldct-chest__note">同次数据，翻层不重扫。</p>
      </div>
    </div>
    <details className="ldct-lab__extra ldct-chest__process"><summary>这一轮在比较什么？</summary>
      <div className="ldct-lab__process"><span>当前估计</span><b>→</b><span>算投影</span><b>→</b><span>和原投影比较</span><b>→</b><span>改图 ↩</span></div>
      {deep ? <p>每点一次，重新算一轮：先比较投影，再修正图像。十二轮使用同一份输入和显示窗，没有追加扫描。胸部解剖来自开放实扫CT，投影与迭代是由它生成的研究演示，并非厂商临床算法。</p> : <><div className="ldct-lab__pair">
        <Tile label={`原数据投影 · 第${slice + 1}层`}><ChestFrame frame="sinogram" slice={slice} /></Tile>
        <Tile label={showResidual ? `迭代${count}轮 · 投影差异` : `迭代${count}轮的预测投影`}><ChestFrame frame={`${showResidual ? 'residual' : 'forward'}:${count}`} slice={slice} /></Tile>
      </div>
      <button aria-pressed={showResidual} onClick={() => { setShowResidual(!showResidual); void playSfx('click') }}>{showResidual ? '看预测投影' : '看两份投影的差别'}</button>
      {showResidual && <p>差异增强显示，各层各轮使用同一尺度；差异更小不等于所有细节更好。</p>}</>}
    </details>
  </div>
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
  const chestExposure = dataset === 'chest' && round === 4
  return <section className="ldct-lab ldct-lab--short" aria-label="重建实验台" data-round={round} data-stage={LDCT_LAB_STAGES[round]} data-dataset={dataset}
    onPointerDownCapture={() => { const now = performance.now(); pointerReady.current = now - openedAt >= 900 && now - lastClick.current >= 300 }}
    onClickCapture={() => { const now = performance.now(); canSubmit.current = now - openedAt >= 900 && now - lastClick.current >= 300; lastClick.current = now }}
    onClick={event => event.stopPropagation()} onKeyDownCapture={event => { if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault() }}>
    <header className="ldct-lab__header"><div><span className="ldct-lab__eyebrow">{chestExposure ? '胸部数据 · 累计计数' : dataset === 'chest' ? '同次数据 · 不重新扫描' : '模体扫描 · 同一份投影'}</span><h2>{chestExposure ? '一份一份积累曝光' : dataset === 'chest' ? '把这一版留住，再看一眼' : LDCT_LAB_TITLES[round]}</h2></div>
      {onBack && <button className="ldct-lab__quiet" onClick={() => { onBack(); void playSfx('click') }}>先放一放</button>}</header>
    {chestExposure
      ? <><p className="ldct-chest__goal">{goal || '点一下，加一份曝光；看看胸部图像哪里发生了变化。'}</p><ChestExposure value={value} choose={choose} /></>
      : dataset === 'chest'
      ? <><p className="ldct-chest__goal">{goal || '改一轮看看；拿不准的地方，可以留给医师一起核查。'}</p><ChestIterate value={value} choose={choose} /></>
      : <><Guidance round={round} goal={goal} concealTruth={concealTruth} /><Tool value={value} change={change} choose={choose} dataset={dataset} concealTruth={concealTruth} /></>}
    <footer className="ldct-lab__footer"><div className="ldct-lab__actions">
      <button className="ldct-lab__primary" disabled={!ready} onClick={event => submit(false, event.detail > 0)}>继续</button>
      <button onClick={event => submit(true, event.detail > 0)}>还没看明白，一起聊聊</button>
    </div></footer>
  </section>
}
