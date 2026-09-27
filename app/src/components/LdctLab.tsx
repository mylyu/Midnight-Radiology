import { useRef, useState } from 'react'
import type { CSSProperties, PointerEvent, ReactNode } from 'react'
import { imageAsset } from '../lib/image-assets'
import { playSfx } from '../game/store'
import {
  createLdctRecord, ldctExperimentReady, LDCT_FILTER_LABELS, LDCT_FILTER_OPTIONS, LDCT_LAB_STAGES, LDCT_LAB_TITLES,
  type LdctLabRecord, type LdctLabRound, type LdctLabState,
} from '../game/ldct-experiments'
import {
  detectorPath, detectorPosition, LDCT_BP_COUNTS, LDCT_ITERATIONS,
  LDCT_PROJECTION_MEDIA_ID, LDCT_STRUCTURES, ldctProjectionFrameStyle,
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
}

type Controls = {
  value: LdctLabState
  change: (patch: Partial<LdctLabState>) => void
  choose: (patch: Partial<LdctLabState>) => void
  frozen: boolean
}
const addSeen = <T,>(list: T[], value: T) => list.includes(value) ? list : [...list, value]
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const stageHelp: Record<LdctLabRound, string> = {
  1: '陆舟把鼠标往旁边挪：“先点黄色的1，再拉‘绕着看’。机架上的彩色点是它在探测器上的位置，正弦图白线上的点也是这个位置。小点没动，绕着它看的方向在动。”',
  2: '“先铺一个方向，只知道它落在一整条线上。再铺几个方向，交在一起的位置就亮起来了。不过……这糊边还真不是少扫几个角度的问题。”',
  3: '“先点不滤波，投影不加工，直接铺回来。然后换Ramp、Hann，拖开看看细杆边缘。想看它们怎么处理的，再展开响应曲线。”',
  4: '“先把光子调少，盯右边那堆噪点，再回来看左边的投影。现在换柔和滤波器，别只看它干不干净，也看看小东西还剩多少。”',
  5: '“先猜一张，再算出它应该留下什么投影。拿这个猜的跟测到的比，有差别就回去改图。咱们一轮一轮看，不用一口气信最后那张。”',
}

/** A visible next action, not a blocking tutorial or a new completion requirement. */
function Guidance({ round, value }: { round: LdctLabRound; value: LdctLabState }) {
  const picked = Boolean(value.structure)
  const turned = value.seenAngles.some(angle => angle >= 35)
  const compared = value.seenStructures.length >= 2
  const traceStep = !picked ? 0 : !turned ? 1 : !compared ? 2 : 3
  const guide: Record<LdctLabRound, [string, string]> = {
    1: [
      ['先点图里黄色的「1」', '现在拖动「绕着看」滑条', '再点青色的「2」试试', '三个地方，一起对着看'][traceStep],
      ['不用先看懂整张图。点一个小结构，右边就会亮出属于它的轨迹。', '也可以点下面的90°。看看球管转到哪里、影子落在探测器哪里。', '小结构位置不同，弯出来的轨迹也不同；它们自己并没有移动。', '小结构 → 探测器上的落点 → 正弦图当前这一列。颜色相同的是同一个对象。'][traceStep],
    ],
    2: ['点「再铺几个方向」', '每点一次，加进更多方向的投影。看这些长条在哪里相交；这一步不加滤波。'],
    3: ['先试「不滤波」，再换一种', '左边固定Ramp，右边跟着选项换。拖动分界比较小结构，需要时展开响应曲线。'],
    4: ['先把光子点到「少」', '看正弦图怎样变毛躁，再换滤波器。不是多拍几次，只是在比较同一组模拟条件。'],
    5: ['点「改第一轮」，再一轮轮看', '左边是当前猜的图；右边拿它算出的投影，和实测投影对一对。不用猜一个“标准轮数”。'],
  }
  return <details className="ldct-lab__guidance" data-testid="ldct-action-guide" data-guide-step={round === 1 ? traceStep : round} aria-live="polite">
    <summary><span aria-hidden="true">☞</span><strong>{guide[round][0]}</strong><span className="ldct-lab__guide-more">提示</span></summary>
    <p>{guide[round][1]}</p>
  </details>
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
  3: '同一份投影。不滤波就直接铺回来，其余先滤波再反投影，不是又扫描了一遍。这里对照小结构的形状，不比较灰度值。',
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

function Trace({ value, change, choose, frozen }: Controls) {
  const selected = LDCT_STRUCTURES.find(s => s.id === value.structure)
  const dragging = useRef(false)
  const setAngle = (angle: number, discrete = false) => (discrete ? choose : change)({ angle, seenAngles: addSeen(value.seenAngles, Math.round(angle)) })
  const select = (id: string) => choose({ structure: id, seenStructures: addSeen(value.seenStructures, id) })
  const scrub = (event: PointerEvent<HTMLDivElement>) => {
    if (frozen || !dragging.current) return
    const rect = event.currentTarget.getBoundingClientRect()
    setAngle(Math.round(clamp((event.clientX - rect.left) / rect.width * 179, 0, 179)))
  }
  const rad = value.angle * Math.PI / 180
  const x = selected?.x ?? 50
  const y = selected?.y ?? 50
  return <>
    <div className="ldct-lab__trace-layout"><div className="ldct-lab__trace-main"><div className="ldct-lab__pair">
      <Tile label="小结构 · 点一个，再转角度" note="点不动；观察的方向在动。">
        <Frame frame="trace:truth" />
        {selected && <svg className="ldct-lab__overlay" viewBox="0 0 100 100" aria-hidden="true">
          <line x1={x - 100 * Math.sin(rad)} y1={y - 100 * Math.cos(rad)} x2={x + 100 * Math.sin(rad)} y2={y + 100 * Math.cos(rad)} stroke={selected.color} strokeWidth="1" strokeDasharray="3 2" />
        </svg>}
        {LDCT_STRUCTURES.map((structure, i) => <button key={structure.id} className={`ldct-lab__point ${selected?.id === structure.id ? 'is-selected' : ''} ${!selected && i === 0 && !frozen ? 'is-guided' : ''}`}
          style={{ left: `${structure.x}%`, top: `${structure.y}%`, '--point-color': structure.color } as CSSProperties}
          aria-label={`追踪${structure.label}`} aria-pressed={value.structure === structure.id} disabled={frozen} onClick={() => select(structure.id)}><span>{i + 1}</span></button>)}
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
    <div className="ldct-lab__angle-presets" aria-label="快速转到一个角度">{[0, 45, 90, 135].map(angle => <button key={angle} disabled={frozen}
      aria-pressed={value.angle === angle} onClick={() => setAngle(angle, true)}>{angle}°</button>)}</div>
    </div><LdctScannerGeometry angle={value.angle} structure={selected?.id ?? null} /></div>
    <p className="ldct-lab__status">{selected ? `${selected.label}的影子，正在右边这条彩色轨迹上。换个小点试试？` : '陆舟：“我不画答案。你点哪一个，我就跟住哪一个。”'}</p>
  </>
}

function Backproject({ value, choose, frozen }: Controls) {
  const count = LDCT_BP_COUNTS[value.bpStep]
  return <>
    <div className="ldct-lab__pair">
      <Tile label="刚才的几个小结构" note="仍是同一个物体；右边把它的投影铺回来。"><Frame frame="trace:truth" /></Tile>
      <Tile label={`沿原路铺回去 · ${count} 个方向`} note="还没滤波，只做直接反投影。"><Frame frame={`bp:${count}`} /></Tile>
    </div>
    <div className="ldct-lab__transport">
      <button disabled={frozen || value.bpStep === 0} onClick={() => choose({ bpStep: value.bpStep - 1 })}>少几个方向</button>
      <button className="ldct-lab__primary" disabled={frozen || value.bpStep === LDCT_BP_COUNTS.length - 1} onClick={() => choose({ bpStep: value.bpStep + 1 })}>{value.bpStep === LDCT_BP_COUNTS.length - 1 ? '已经铺满这组方向' : '再铺几个方向 →'}</button>
    </div>
    <div className="ldct-lab__steps" aria-label="反投影方向数量">{LDCT_BP_COUNTS.map((n, i) => <span key={n} className={i <= value.bpStep ? 'is-seen' : ''}>{n}</span>)}</div>
    <LdctFilterResponse filter="none" />
    <p className="ldct-lab__status">{value.bpStep < 2 ? '像被拉成长条的影子……再叠上别的方向看看。' : value.bpStep < 5 ? '交叉处开始冒出轮廓。可那圈糊边，还在。' : '陆舟：“方向已经够多了。怎么还像眼镜没擦？”'}</p>
  </>
}

function FilterButtons({ value, choose, frozen }: Controls) {
  const select = (filter: LdctLabState['filter']) => choose({ filter, seenFilters: addSeen(value.seenFilters, filter) })
  return <><label className="ldct-lab__mobile-filter"><span>重建方式</span><select aria-label="选择反投影滤波器" disabled={frozen}
    value={value.filter} onChange={event => select(event.target.value as LdctLabState['filter'])}>
    {LDCT_FILTER_OPTIONS.map(filter => <option key={filter} value={filter}>{LDCT_FILTER_LABELS[filter]}</option>)}
  </select></label>
  <div className="ldct-lab__chips ldct-lab__filter-chips" aria-label="反投影滤波器">{LDCT_FILTER_OPTIONS.map(filter =>
    <button key={filter} disabled={frozen} aria-pressed={value.filter === filter} onClick={() => select(filter)}>
      {LDCT_FILTER_LABELS[filter]}
    </button>)}</div></>
}

function Filter({ value, change, choose, frozen }: Controls) {
  return <>
    <div className="ldct-lab__single"><div className="ldct-lab__split-labels"><span>固定 · Ramp</span><span>{LDCT_FILTER_LABELS[value.filter]}</span></div>
      <div className="ldct-lab__image"><Split left="filter:sparse:ramp" right={`filter:sparse:${value.filter}`} divider={value.divider} onChange={divider => change({ divider })} frozen={frozen} /></div>
    </div>
    <FilterButtons value={value} change={change} choose={choose} frozen={frozen} />
    <Range label="拖开比较" max={100} value={value.divider} onChange={divider => change({ divider })} disabled={frozen} suffix="%" />
    <LdctFilterResponse filter={value.filter} />
    <p className="ldct-lab__status">{value.filter === 'none' ? '不滤波就是直接反投影。看小结构周围散开的亮影；这里只比形状，不比灰度值。' : value.filter === 'ramp' ? '两边现在一样。换到柔一些，再看细杆的边缘。' : '同一份投影换了滤波器。别急着挑“最好”，拖着看边缘和细节。'}</p>
  </>
}

function Noise({ value, change, choose, frozen }: Controls) {
  const [compareHigh, setCompareHigh] = useState(false)
  const shownSignal = compareHigh ? 'high' : value.signal
  return <>
    <div className="ldct-lab__pair">
      <Tile label="收到的投影 · 正弦图" note="角度和物体没动，只改变入射计数。"><Frame frame={`sinogram:${shownSignal}`} /></Tile>
      <Tile label={`重建结果 · ${LDCT_FILTER_LABELS[value.filter]}`} note={value.filter === 'none' ? '直接反投影；单独归一化显示，不比较灰度值。' : '同一份带噪投影进入FBP。'}><Frame frame={`fbp:${shownSignal}:${value.filter}`} /></Tile>
    </div>
    <div className="ldct-lab__control-label">模拟入射光子</div>
    <div className="ldct-lab__chips">{(['high', 'medium', 'low'] as const).map(signal => <button key={signal} disabled={frozen} aria-pressed={value.signal === signal}
      onClick={() => { setCompareHigh(false); choose({ signal, seenSignals: addSeen(value.seenSignals, signal) }) }}>{({ high: '多', medium: '中', low: '少' })[signal]}</button>)}</div>
    <div className="ldct-lab__control-label">滤波器也试一试</div>
    <FilterButtons value={value} change={change} choose={choose} frozen={frozen} />
    <LdctFilterResponse filter={value.filter} compact />
    {value.signal !== 'high' && <button className="ldct-lab__compare" aria-pressed={compareHigh} onClick={() => { setCompareHigh(!compareHigh); void playSfx('click') }}>{compareHigh ? '现在是多光子对照 · 切回刚才那版' : '来回对一下：切到多光子'}</button>}
    <p className="ldct-lab__status">{value.signal === 'low' ? '正弦图也开始毛躁了。图上这些起伏，不是重建软件凭空闹脾气。' : '先留意投影的纹理。把光子调少，再看看右边。'}</p>
  </>
}

function Iterate({ value, change, choose, frozen }: Controls) {
  const [residual, setResidual] = useState(false)
  const count = LDCT_ITERATIONS[value.iterationStep]
  const jump = (step: number) => choose({ iterationStep: step, seenIterations: addSeen(value.seenIterations, step) })
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
    <button className="ldct-lab__compare" aria-pressed={residual} onClick={() => { setResidual(!residual); void playSfx('click') }}>{residual ? '回到两份投影的对照' : '看看这一轮还差在哪'}</button>
    <p className="ldct-lab__status">{count === 0 ? '先从空白猜起。右边测到的投影在等它。' : count < 4 ? '轮廓一点点回来。不是再拍一次，而是拿同一份投影继续对。' : '陆舟：“能看见了。但别光数轮次，噪声可没签字答应退出。”'}</p>
  </>
}

/** Five small tools separated by story. No patient diagnosis, formula quiz, score or fake GPU wait. */
export function LdctLab({ round, value, onChange, onSubmit, onBack }: LdctLabProps) {
  const savedAt = useRef(0)
  const frozen = Boolean(value.saved)
  const change = (patch: Partial<LdctLabState>) => { if (!frozen) onChange({ ...value, ...patch }) }
  const choose = (patch: Partial<LdctLabState>) => {
    if (frozen || !Object.entries(patch).some(([key, next]) => value[key as keyof LdctLabState] !== next)) return
    change(patch)
    void playSfx('click')
  }
  const ready = ldctExperimentReady(value, round)
  const save = (verdict: LdctLabRecord['verdict']) => {
    if (frozen) return
    const record = createLdctRecord(value, round, verdict)
    if (record) { savedAt.current = performance.now(); onChange({ ...value, saved: record }); void playSfx('click') }
  }
  const finish = () => {
    const now = performance.now()
    const previous = savedAt.current
    savedAt.current = now
    if (!value.saved || (previous > 0 && now - previous < 900)) return
    onSubmit(value.saved)
    void playSfx('click')
  }
  const tools: Record<LdctLabRound, typeof Trace> = { 1: Trace, 2: Backproject, 3: Filter, 4: Noise, 5: Iterate }
  const Tool = tools[round]
  return <section className="ldct-lab" aria-label="重建实验台" data-round={round} data-stage={LDCT_LAB_STAGES[round]} onClick={event => event.stopPropagation()}>
    <header className="ldct-lab__header"><div><span className="ldct-lab__eyebrow">数字模体 · {round} / 5</span><h2>{LDCT_LAB_TITLES[round]}</h2></div>
      {onBack && <button className="ldct-lab__quiet" onClick={() => { onBack(); void playSfx('click') }}>先回值班室</button>}</header>
    {!frozen && <Guidance round={round} value={value} />}
    <Tool value={value} change={change} choose={choose} frozen={frozen} />
    {!frozen ? <footer className="ldct-lab__footer">
      <p className="ldct-lab__nudge">{ready ? '这段过程已经留住了。看到了什么，下去接着聊。' : stageNudge[round]}</p>
      <div className="ldct-lab__actions"><button className="ldct-lab__primary" disabled={!ready} onClick={() => save('different')}>记下来，接着聊</button>
        <button disabled={!ready} onClick={() => save('uncertain')}>还拿不准，也记下来</button>
        <button disabled={value.helped} onClick={() => choose({ helped: true })}>{value.helped ? '陆舟在旁边了' : '陆舟，带我看一下'}</button></div>
      {value.helped && <p className="ldct-lab__help">{stageHelp[round]}</p>}
    </footer> : <footer className="ldct-lab__footer ldct-lab__saved" aria-live="polite">
      <p>{stageReflection[round]}</p><button className="ldct-lab__primary" onClick={finish}>收进记录，回到对话 →</button>
    </footer>}
  </section>
}
