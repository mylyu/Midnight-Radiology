import { useRef, useState } from 'react'
import type { CSSProperties, PointerEvent, ReactNode } from 'react'
import { imageAsset } from '../lib/image-assets'
import {
  createLdctRecord, ldctExperimentReady, LDCT_FILTER_LABELS, LDCT_LAB_STAGES, LDCT_LAB_TITLES,
  type LdctFilter, type LdctLabRecord, type LdctLabRound, type LdctLabState,
} from '../game/ldct-experiments'
import {
  detectorPath, detectorPosition, LDCT_BP_COUNTS, LDCT_ITERATIONS,
  LDCT_PROJECTION_MEDIA_ID, LDCT_STRUCTURES, ldctProjectionFrameStyle,
} from '../game/ldct-projections'
import './LdctLab.css'

export type LdctLabProps = {
  round: LdctLabRound
  value: LdctLabState
  onChange: (value: LdctLabState) => void
  onSubmit: (record: LdctLabRecord) => void
  onBack?: () => void
}

type Controls = { value: LdctLabState; change: (patch: Partial<LdctLabState>) => void; frozen: boolean }
const addSeen = <T,>(list: T[], value: T) => list.includes(value) ? list : [...list, value]
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const stageHelp: Record<LdctLabRound, string> = {
  1: '陆舟把鼠标往旁边挪：“左边换个小点，右边那条路也会换。拖动角度，白线这一列就是现在这个方向的投影。点本身没动，是我们绕着它看。”',
  2: '“先铺一个方向，只知道它落在一整条线上。再铺几个方向，交在一起的位置就亮起来了。不过……这糊边还真不是少扫几个角度的问题。”',
  3: '“左边留着锐一些的。右边换柔一些的，拖开看看细杆边缘。都叫FBP，滤波器一换，手感也不一样。”',
  4: '“先把光子调少，盯右边那堆噪点，再回来看左边的投影。现在换柔和滤波器，别只看它干不干净，也看看小东西还剩多少。”',
  5: '“先猜一张，再算出它应该留下什么投影。拿这个猜的跟测到的比，有差别就回去改图。咱们一轮一轮看，不用一口气信最后那张。”',
}
const stageNudge: Record<LdctLabRound, string> = {
  1: '换两个小结构，拖动一下角度，看看它们各自走哪条路。',
  2: '一次铺不回来？再叠几个方向，直到轮廓能认出来。',
  3: '换到“柔一些”，和左边固定的锐版本来回比较。',
  4: '把光子从“多”调到“少”，看看正弦图和断层一起发生什么。',
  5: '按“再改一轮”，看到至少第4轮；也可以请陆舟带着看。',
}
const stageReflection: Record<LdctLabRound, string> = {
  1: '同一个小结构，在不同角度留下的位置会变；正弦图把这些投影按角度排在一起。',
  2: '轮廓回来了，糊边却没全走。直接把投影铺回去，还不是完整的FBP。',
  3: '同一份投影、同一个显示窗。变的是反投影前用的滤波器，不是又扫描了一遍。',
  4: '光子变少，测量更容易起伏；滤波后的图像也会把这些起伏带出来。柔和不等于没有代价。',
  5: '留下的是每轮真正算出的估计图和预测投影。多改几轮不等于无限接近真相，噪声也在那份测量里。',
}

function Frame({ frame, children, className = '', style }: { frame: string; children?: ReactNode; className?: string; style?: CSSProperties }) {
  return <div className={`ldct-lab__frame ${className}`} data-frame={frame} style={{
    ...ldctProjectionFrameStyle(frame), backgroundImage: `url("${imageAsset(LDCT_PROJECTION_MEDIA_ID)}")`, ...style,
  }}>{children}</div>
}

function Tile({ label, children, note }: { label: string; children: ReactNode; note?: string }) {
  return <figure className="ldct-lab__tile"><figcaption>{label}</figcaption><div className="ldct-lab__image">{children}</div>{note && <small>{note}</small>}</figure>
}

/** One pointer-controlled split is shared by filter comparison and projection consistency. */
function Split({ left, right, divider, onChange, frozen = false }: { left: string; right: string; divider: number; onChange: (divider: number) => void; frozen?: boolean }) {
  const box = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const move = (event: PointerEvent<HTMLElement>) => {
    if (!dragging.current || !box.current || frozen) return
    const rect = box.current.getBoundingClientRect()
    onChange(Math.round(clamp((event.clientX - rect.left) / rect.width * 100, 0, 100)))
  }
  return <div ref={box} className="ldct-lab__split" data-testid="ldct-comparison">
    <Frame frame={right} /><Frame frame={left} style={{ clipPath: `inset(0 ${100 - divider}% 0 0)` }} />
    <span className="ldct-lab__divider" style={{ left: `${divider}%` }}>
      <button aria-label="拖动比较分界" disabled={frozen} onPointerDown={event => {
        event.stopPropagation(); dragging.current = true; event.currentTarget.setPointerCapture(event.pointerId); move(event)
      }} onPointerMove={move} onPointerUp={() => { dragging.current = false }} onPointerCancel={() => { dragging.current = false }}>↔</button>
    </span>
  </div>
}

function Range({ label, min = 0, max, value, onChange, disabled, suffix = '' }: {
  label: string; min?: number; max: number; value: number; onChange: (n: number) => void; disabled?: boolean; suffix?: string
}) {
  return <label className="ldct-lab__range"><span>{label}</span><output>{Math.round(value)}{suffix}</output>
    <input aria-label={label} type="range" min={min} max={max} step={1} value={value} disabled={disabled} onChange={event => onChange(Number(event.target.value))} />
  </label>
}

function Trace({ value, change, frozen }: Controls) {
  const selected = LDCT_STRUCTURES.find(s => s.id === value.structure)
  const dragging = useRef(false)
  const setAngle = (angle: number) => change({ angle, seenAngles: addSeen(value.seenAngles, Math.round(angle)) })
  const select = (id: string) => change({ structure: id, seenStructures: addSeen(value.seenStructures, id) })
  const scrub = (event: PointerEvent<HTMLDivElement>) => {
    if (frozen || !dragging.current) return
    const rect = event.currentTarget.getBoundingClientRect()
    setAngle(Math.round(clamp((event.clientX - rect.left) / rect.width * 179, 0, 179)))
  }
  const rad = value.angle * Math.PI / 180
  const x = selected?.x ?? 50
  const y = selected?.y ?? 50
  return <>
    <div className="ldct-lab__pair">
      <Tile label="小结构 · 点一个，再转角度" note="点不动；观察的方向在动。">
        <Frame frame="trace:truth" />
        {selected && <svg className="ldct-lab__overlay" viewBox="0 0 100 100" aria-hidden="true">
          <line x1={x - 100 * Math.sin(rad)} y1={y - 100 * Math.cos(rad)} x2={x + 100 * Math.sin(rad)} y2={y + 100 * Math.cos(rad)} stroke={selected.color} strokeWidth="1" strokeDasharray="3 2" />
        </svg>}
        {LDCT_STRUCTURES.map((structure, i) => <button key={structure.id} className={`ldct-lab__point ${selected?.id === structure.id ? 'is-selected' : ''}`}
          style={{ left: `${structure.x}%`, top: `${structure.y}%`, '--point-color': structure.color } as CSSProperties}
          aria-label={`追踪${structure.label}`} aria-pressed={value.structure === structure.id} disabled={frozen} onClick={() => select(structure.id)}>{i + 1}</button>)}
      </Tile>
      <Tile label="正弦图 · 每一列是一个角度" note="横向：角度 →　纵向：探测器位置 ↓">
        <Frame frame="trace:sinogram" />
        <div className="ldct-lab__sinogram-scrub" onPointerDown={event => {
          if (frozen) return
          dragging.current = true; event.currentTarget.setPointerCapture(event.pointerId); scrub(event)
        }} onPointerMove={scrub} onPointerUp={() => { dragging.current = false }} onPointerCancel={() => { dragging.current = false }}>
          <svg className="ldct-lab__overlay" viewBox="0 0 100 100" aria-hidden="true">
            {selected && <path d={detectorPath(selected.id)} stroke={selected.color} strokeWidth="1.25" fill="none" />}
            <line x1={value.angle / 180 * 100} x2={value.angle / 180 * 100} y1="0" y2="100" stroke="white" strokeWidth=".6" />
            {selected && <circle cx={value.angle / 180 * 100} cy={detectorPosition(selected.id, value.angle)} r="2.5" fill={selected.color} stroke="#071321" strokeWidth=".6" />}
          </svg>
        </div>
        {!selected && <span className="ldct-lab__image-hint">先点左图一个小结构</span>}
      </Tile>
    </div>
    <Range label="绕着看" max={179} value={value.angle} onChange={setAngle} disabled={frozen} suffix="°" />
    <p className="ldct-lab__status">{selected ? `${selected.label}的影子，正在右边这条彩色轨迹上。换个小点试试？` : '陆舟：“我不画答案。你点哪一个，我就跟住哪一个。”'}</p>
  </>
}

function Backproject({ value, change, frozen }: Controls) {
  const count = LDCT_BP_COUNTS[value.bpStep]
  return <>
    <div className="ldct-lab__pair">
      <Tile label="刚才的几个小结构" note="仍是同一个物体；右边把它的投影铺回来。"><Frame frame="trace:truth" /></Tile>
      <Tile label={`沿原路铺回去 · ${count} 个方向`} note="还没滤波，只做直接反投影。"><Frame frame={`bp:${count}`} /></Tile>
    </div>
    <div className="ldct-lab__transport">
      <button disabled={frozen || value.bpStep === 0} onClick={() => change({ bpStep: value.bpStep - 1 })}>少几个方向</button>
      <button className="ldct-lab__primary" disabled={frozen || value.bpStep === LDCT_BP_COUNTS.length - 1} onClick={() => change({ bpStep: value.bpStep + 1 })}>{value.bpStep === LDCT_BP_COUNTS.length - 1 ? '已经铺满这组方向' : '再铺几个方向 →'}</button>
    </div>
    <div className="ldct-lab__steps" aria-label="反投影方向数量">{LDCT_BP_COUNTS.map((n, i) => <span key={n} className={i <= value.bpStep ? 'is-seen' : ''}>{n}</span>)}</div>
    <p className="ldct-lab__status">{value.bpStep < 2 ? '像被拉成长条的影子……再叠上别的方向看看。' : value.bpStep < 5 ? '交叉处开始冒出轮廓。可那圈糊边，还在。' : '陆舟：“方向已经够多了。怎么还像眼镜没擦？”'}</p>
  </>
}

function FilterButtons({ value, change, frozen, compact = false }: Controls & { compact?: boolean }) {
  return <div className="ldct-lab__chips" aria-label="FBP滤波器">{(['ramp', 'shepp-logan', 'hann'] as LdctFilter[]).map(filter =>
    <button key={filter} disabled={frozen} aria-pressed={value.filter === filter} onClick={() => change({ filter, seenFilters: addSeen(value.seenFilters, filter) })}>
      {compact ? { ramp: '锐一些', 'shepp-logan': '折中', hann: '柔一些' }[filter] : LDCT_FILTER_LABELS[filter]}
    </button>)}</div>
}

function Filter({ value, change, frozen }: Controls) {
  return <>
    <div className="ldct-lab__single"><div className="ldct-lab__split-labels"><span>固定 · Ramp</span><span>{LDCT_FILTER_LABELS[value.filter]}</span></div>
      <div className="ldct-lab__image"><Split left="fbp:high:ramp" right={`fbp:high:${value.filter}`} divider={value.divider} onChange={divider => change({ divider })} frozen={frozen} /></div>
    </div>
    <FilterButtons value={value} change={change} frozen={frozen} />
    <Range label="拖开比较" max={100} value={value.divider} onChange={divider => change({ divider })} disabled={frozen} suffix="%" />
    <p className="ldct-lab__status">{value.filter === 'ramp' ? '两边现在一样。换到柔一些，再看细杆的边缘。' : '同一份投影换了滤波器。别急着挑“最好”，拖着看边缘和细节。'}</p>
  </>
}

function Noise({ value, change, frozen }: Controls) {
  const [compareHigh, setCompareHigh] = useState(false)
  const shownSignal = compareHigh ? 'high' : value.signal
  return <>
    <div className="ldct-lab__pair">
      <Tile label="收到的投影 · 正弦图" note="角度和物体没动，只改变入射计数。"><Frame frame={`sinogram:${shownSignal}`} /></Tile>
      <Tile label={`重建结果 · ${LDCT_FILTER_LABELS[value.filter]}`} note="同一份带噪投影进入FBP。"><Frame frame={`fbp:${shownSignal}:${value.filter}`} /></Tile>
    </div>
    <div className="ldct-lab__control-label">模拟入射光子</div>
    <div className="ldct-lab__chips">{(['high', 'medium', 'low'] as const).map(signal => <button key={signal} disabled={frozen} aria-pressed={value.signal === signal}
      onClick={() => { setCompareHigh(false); change({ signal, seenSignals: addSeen(value.seenSignals, signal) }) }}>{({ high: '多', medium: '中', low: '少' })[signal]}</button>)}</div>
    <div className="ldct-lab__control-label">滤波器也试一试</div>
    <FilterButtons value={value} change={change} frozen={frozen} compact />
    {value.signal !== 'high' && <button className="ldct-lab__compare" aria-pressed={compareHigh} onClick={() => setCompareHigh(!compareHigh)}>{compareHigh ? '现在是多光子对照 · 切回刚才那版' : '来回对一下：切到多光子'}</button>}
    <p className="ldct-lab__status">{value.signal === 'low' ? '正弦图也开始毛躁了。图上这些起伏，不是重建软件凭空闹脾气。' : '先留意投影的纹理。把光子调少，再看看右边。'}</p>
  </>
}

function Iterate({ value, change, frozen }: Controls) {
  const [residual, setResidual] = useState(false)
  const count = LDCT_ITERATIONS[value.iterationStep]
  const jump = (step: number) => change({ iterationStep: step, seenIterations: addSeen(value.seenIterations, step) })
  return <>
    <div className="ldct-lab__process"><span>猜图</span><b>→</b><span>算投影</span><b>→</b><span>比一比</span><b>→</b><span>改图 ↩</span></div>
    <div className="ldct-lab__pair">
      <Tile label={`当前估计 · ${count === 0 ? '还没开始' : `第 ${count} 轮`}`} note="这一轮真正算出的中间图像。"><Frame frame={`iteration:${count}`} /></Tile>
      <Tile label={residual ? '预测与实测的差别' : '左：实测投影｜右：当前图算出的投影'} note={residual ? '亮处表示差别更大；各轮使用同一显示范围。' : '拖动分界，看看两份投影是否对得上。'}>
        {residual ? <Frame frame={`residual:${count}`} /> : <Split left="sinogram:low" right={`forward:${count}`} divider={value.divider} onChange={divider => change({ divider })} frozen={frozen} />}
      </Tile>
    </div>
    <div className="ldct-lab__transport"><button disabled={frozen || value.iterationStep === 0} onClick={() => jump(value.iterationStep - 1)}>退回上一版看看</button>
      <button className="ldct-lab__primary" disabled={frozen || value.iterationStep === LDCT_ITERATIONS.length - 1} onClick={() => jump(value.iterationStep + 1)}>{value.iterationStep === 0 ? '算投影、对差别、改第一轮 →' : value.iterationStep === LDCT_ITERATIONS.length - 1 ? '先停在第8轮' : `再改到第 ${LDCT_ITERATIONS[value.iterationStep + 1]} 轮 →`}</button></div>
    <div className="ldct-lab__steps">{LDCT_ITERATIONS.map((n, i) => <span key={n} className={value.seenIterations.includes(i) ? 'is-seen' : ''}>{n === 0 ? '初始' : `${n}轮`}</span>)}</div>
    {!residual && <Range label="对比实测与预测" max={100} value={value.divider} onChange={divider => change({ divider })} disabled={frozen} suffix="%" />}
    <button className="ldct-lab__compare" aria-pressed={residual} onClick={() => setResidual(!residual)}>{residual ? '回到两份投影的对照' : '看看这一轮还差在哪'}</button>
    <p className="ldct-lab__status">{count === 0 ? '先从空白猜起。右边测到的投影在等它。' : count < 4 ? '轮廓一点点回来。不是再拍一次，而是拿同一份投影继续对。' : '陆舟：“能看见了。但别光数轮次，噪声可没签字答应退出。”'}</p>
  </>
}

/** Five small tools separated by story. No patient diagnosis, formula quiz, score or fake GPU wait. */
export function LdctLab({ round, value, onChange, onSubmit, onBack }: LdctLabProps) {
  const savedAt = useRef(0)
  const frozen = Boolean(value.saved)
  const change = (patch: Partial<LdctLabState>) => { if (!frozen) onChange({ ...value, ...patch }) }
  const ready = ldctExperimentReady(value, round)
  const save = (verdict: LdctLabRecord['verdict']) => {
    if (frozen) return
    const record = createLdctRecord(value, round, verdict)
    if (record) { savedAt.current = performance.now(); onChange({ ...value, saved: record }) }
  }
  const finish = () => {
    const now = performance.now()
    const previous = savedAt.current
    savedAt.current = now
    if (!value.saved || (previous > 0 && now - previous < 900)) return
    onSubmit(value.saved)
  }
  const tools: Record<LdctLabRound, typeof Trace> = { 1: Trace, 2: Backproject, 3: Filter, 4: Noise, 5: Iterate }
  const Tool = tools[round]
  return <section className="ldct-lab" aria-label="重建实验台" data-round={round} data-stage={LDCT_LAB_STAGES[round]} onClick={event => event.stopPropagation()}>
    <header className="ldct-lab__header"><div><span className="ldct-lab__eyebrow">数字模体 · {round} / 5</span><h2>{LDCT_LAB_TITLES[round]}</h2></div>
      {onBack && <button className="ldct-lab__quiet" onClick={onBack}>先回值班室</button>}</header>
    <Tool value={value} change={change} frozen={frozen} />
    {!frozen ? <footer className="ldct-lab__footer">
      <p className="ldct-lab__nudge">{ready ? '这段过程已经留住了。看到了什么，下去接着聊。' : stageNudge[round]}</p>
      <div className="ldct-lab__actions"><button className="ldct-lab__primary" disabled={!ready} onClick={() => save('different')}>记下来，接着聊</button>
        <button disabled={!ready} onClick={() => save('uncertain')}>还拿不准，也记下来</button>
        <button disabled={value.helped} onClick={() => change({ helped: true })}>{value.helped ? '陆舟在旁边了' : '陆舟，带我看一下'}</button></div>
      {value.helped && <p className="ldct-lab__help">{stageHelp[round]}</p>}
    </footer> : <footer className="ldct-lab__footer ldct-lab__saved" aria-live="polite">
      <p>{stageReflection[round]}</p><button className="ldct-lab__primary" onClick={finish}>收进记录，回到对话 →</button>
    </footer>}
  </section>
}
