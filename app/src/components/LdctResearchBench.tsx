import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent, PointerEvent } from 'react'
import { imageAsset } from '../lib/image-assets'
import { playSfx } from '../game/store'
import {
  RESEARCH_CASES, RESEARCH_CASE_NAMES, RESEARCH_ROLES, RESEARCH_TASKS, RESEARCH_TITLES, researchReady,
  type LdctResearchDraft, type LdctResearchStage, type ResearchCase, type ResearchClaim, type ResearchMethod,
  type ResearchObservation, type ResearchRole, type ResearchTask,
} from '../game/ldct-research'
import {
  LDCT_RESEARCH_MEDIA_ID, LDCT_RESEARCH_METHOD_LABELS, LDCT_RESEARCH_REVEAL, ldctResearchFrameStyle,
  type LdctResearchMethod, type LdctResearchSlice,
} from '../game/ldct-research-media'
import './LdctResearchBench.css'

export type LdctResearchBenchProps = {
  value: LdctResearchDraft
  onChange: (value: LdctResearchDraft) => void
  onSubmit: (stage: LdctResearchStage) => void
  onBack: () => void
  review?: boolean
}
type Patch = Partial<LdctResearchDraft>
type Controls = { value: LdctResearchDraft; change: (patch: Patch, sound?: boolean) => void; review: boolean }
const clamp = (n: number) => Math.max(0, Math.min(100, n))
const blindMethods: { method: ResearchMethod; label: string }[] = [
  { method: 'learned', label: 'A版' }, { method: 'fbp', label: 'B版' }, { method: 'iterative', label: 'C版' },
]
const observationNames: Record<ResearchObservation, string> = {
  detail: '有些细节变淡了', similar: '主要结构差不多', uncertain: '我还拿不准',
}

function ResearchImage({ caseId, slice, method, style }: { caseId: ResearchCase; slice: number; method: LdctResearchMethod; style?: CSSProperties }) {
  return <div className="ldct-research__frame" data-research-frame={`${caseId}:${slice}:${method}`} style={{
    ...ldctResearchFrameStyle(caseId, slice as LdctResearchSlice, method),
    backgroundImage: `url("${imageAsset(LDCT_RESEARCH_MEDIA_ID)}")`, ...style,
  }} />
}

function Roster({ value, change, review }: Controls) {
  return <>
    <p className="ldct-research__lead">先把三件事交给具体的人。谁答应了，就把名字记上。</p>
    <details className="ldct-research__details"><summary>看看大家这周的空当</summary>
      <ul><li>陆舟：代码我来盯，别让我一个人挑结果就行。</li><li>小雷：版本和文件名我能理。别半夜给我发“最终版真的最终版”。</li>
        <li>小何：能抽空一起看，但白天有急诊时别等我。</li><li>我：下班能挤两晚。周末……至少留半天睡觉吧。</li></ul>
    </details>
    <div className="ldct-research__assignments">{(Object.keys(RESEARCH_TASKS) as ResearchTask[]).map(task =>
      <label key={task}><span>{RESEARCH_TASKS[task]}</span><select aria-label={RESEARCH_TASKS[task]} value={value.assignments[task]} disabled={review}
        onChange={event => change({ assignments: { ...value.assignments, [task]: event.target.value as ResearchRole } }, true)}>
        <option value="">谁来接手？</option>{(Object.keys(RESEARCH_ROLES) as ResearchRole[]).map(person => <option key={person} value={person}>{RESEARCH_ROLES[person]}</option>)}
      </select></label>)}</div>
    <button type="button" className="ldct-research__rest" aria-pressed={value.rest} disabled={review} onClick={() => change({ rest: !value.rest }, true)}>
      {value.rest ? '☑ 留半晚空着，补个觉' : '□ 留半晚空着，补个觉'}</button>
    <p className="ldct-research__aside">这是约定的分工，不是直接把谁写进作者名单；做了什么，后面接着记。</p>
  </>
}

function Blind({ value, change, review }: Controls) {
  const [marking, setMarking] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const note = value.observations[value.caseId]
  const mark = value.marks[value.caseId]
  const reveal = LDCT_RESEARCH_REVEAL[value.caseId]
  const allNoted = RESEARCH_CASES.every(id => value.observations[id])
  const methodLabel = value.revealed ? LDCT_RESEARCH_METHOD_LABELS[value.method] : blindMethods.find(item => item.method === value.method)!.label
  const move = (event: PointerEvent<HTMLElement>) => {
    if (!dragging.current || !box.current) return
    const rect = box.current.getBoundingClientRect()
    change({ divider: Math.round(clamp((event.clientX - rect.left) / rect.width * 100)) })
  }
  const markPoint = (event: MouseEvent<HTMLDivElement>) => {
    if (!marking || review || value.revealed || !box.current || (event.target as HTMLElement).closest('button')) return
    const rect = box.current.getBoundingClientRect()
    change({ marks: { ...value.marks, [value.caseId]: { x: clamp((event.clientX - rect.left) / rect.width * 100), y: clamp((event.clientY - rect.top) / rect.height * 100) } } }, true)
    setMarking(false)
  }
  return <>
    <p className="ldct-research__lead">{value.revealed ? '名字揭开了。再和本来放进去的结构对一对。' : '先拖分界，再翻前后层。三组各留一句观察，最后一起揭名字。'}</p>
    <div className="ldct-research__case-tabs" aria-label="选择研究样本">{RESEARCH_CASES.map(id => <button key={id} type="button" aria-pressed={value.caseId === id}
      onClick={() => { setMarking(false); change({ caseId: id }, true) }}>{RESEARCH_CASE_NAMES[id]}{value.observations[id] ? ' · 已记' : ''}</button>)}</div>
    <div className="ldct-research__viewer">
      <div className="ldct-research__image-labels"><span>固定对照 · FBP</span><span>{methodLabel}</span></div>
      <div ref={box} className={`ldct-research__image${marking ? ' is-marking' : ''}`} data-testid="ldct-research-comparison" onClick={markPoint}>
        <ResearchImage caseId={value.caseId} slice={value.slice} method={value.method} />
        <ResearchImage caseId={value.caseId} slice={value.slice} method="fbp" style={{ clipPath: `inset(0 ${100 - value.divider}% 0 0)` }} />
        {mark && <span className="ldct-research__mark" style={{ left: `${mark.x}%`, top: `${mark.y}%` }} />}
        <span className="ldct-research__divider" style={{ left: `${value.divider}%` }}><button type="button" aria-label="拖动研究图像分界"
          onPointerDown={event => { event.stopPropagation(); dragging.current = true; event.currentTarget.setPointerCapture(event.pointerId); move(event) }}
          onPointerMove={move} onPointerUp={() => { dragging.current = false }} onPointerCancel={() => { dragging.current = false }}>↔</button></span>
      </div>
      <label className="ldct-research__slider"><span className="sr-only">研究图像比较分界</span><input type="range" aria-label="研究图像比较分界" min="0" max="100" value={value.divider} onChange={event => change({ divider: Number(event.target.value) })} /></label>
      <div className="ldct-research__slice-controls"><button type="button" disabled={value.slice === 0} onClick={() => change({ slice: value.slice - 1 }, true)}>← 前一层</button>
        <span>第 {value.slice + 1} / 3 层</span><button type="button" disabled={value.slice === 2} onClick={() => change({ slice: value.slice + 1 }, true)}>后一层 →</button></div>
    </div>
    <div className="ldct-research__method-tabs" aria-label="选择待比较的版本">{blindMethods.map(item => <button key={item.method} type="button" aria-pressed={value.method === item.method}
      onClick={() => change({ method: item.method }, true)}>{value.revealed ? LDCT_RESEARCH_METHOD_LABELS[item.method] : item.label}</button>)}</div>
    {!value.revealed && <>
      <div className="ldct-research__tools"><button type="button" disabled={review} aria-pressed={marking} onClick={() => { setMarking(!marking); void playSfx('click') }}>{marking ? '点图像，留下存疑位置' : '圈一处存疑'}</button>
        <button type="button" disabled={review || value.help} onClick={() => change({ help: true }, true)}>{value.help ? '一起核对中' : '陆舟，陪我看'}</button></div>
      {value.help && <p className="ldct-research__help">“先对着同一个位置，再翻前后两层。拿不准就记拿不准，别替它说好话。”</p>}
      <div className="ldct-research__observations" aria-label="记录这一组的观察">{(Object.keys(observationNames) as ResearchObservation[]).map(observation => <button type="button" key={observation}
        disabled={review} aria-pressed={note === observation} onClick={() => change({ observations: { ...value.observations, [value.caseId]: observation } }, true)}>{observationNames[observation]}</button>)}</div>
      <button type="button" className="ldct-research__reveal" disabled={!allNoted || review} onClick={() => { setMarking(false); change({ revealed: true }, true) }}>{allNoted ? '三组都记好了 · 揭开名字和原始模体' : `先各留一句观察 · ${Object.keys(value.observations).length} / 3`}</button>
    </>}
    {value.revealed && <section className="ldct-research__reveal-panel" aria-label="方法及已知结构揭示">
      <div><h3>已知模体 · 本来放进去的结构</h3><div className="ldct-research__reference-image"><ResearchImage caseId={value.caseId} slice={value.slice} method="reference" />
        <span className="ldct-research__known-region" style={{ left: `${reveal.x}%`, top: `${reveal.y}%`, width: `${reveal.radius * 2 + 4}%`, height: `${reveal.radius * 2 + 4}%` }} /></div></div>
      <div><p>{reveal.text}</p><p className="ldct-research__aside">你之前记的是：{note ? observationNames[note] : '未记录'}。</p>
        <details className="ldct-research__details"><summary>A / B / C 分别是什么？</summary><p>A：学习型后处理，输入是这份FBP结果；B：FBP；C：迭代示例。这里只比较数字模体，不是患者诊断。</p></details></div>
    </section>}
  </>
}

function Report({ value, change, review }: Controls) {
  const claims: { id: ResearchClaim; text: string; note: string }[] = [
    { id: 'limited', text: '把好看的和不理想的都说清楚。', note: '结论只限于目前做过的这些模体与条件。' },
    { id: 'delay', text: '再争取一点时间，把验证补上。', note: '保留现在的结果，先不把结论往外推。' },
    { id: 'cherry', text: '先用这几张撑住汇报，结论写大一点。', note: '选中的样例好看，没入选的结果仍留在实验记录里。' },
  ]
  const toggle = (id: ResearchCase) => change({ included: value.included.includes(id) ? value.included.filter(item => item !== id) : [...value.included, id] }, true)
  return <>
    <p className="ldct-research__lead">先选要附上的结果，再决定最后一句怎么写。原始记录不删。</p>
    <div className="ldct-research__report-cases">{RESEARCH_CASES.map(id => <button type="button" key={id} disabled={review} aria-pressed={value.included.includes(id)}
      onClick={() => toggle(id)}><span className="ldct-research__report-thumb"><ResearchImage caseId={id} slice={1} method="learned" /></span><span>{RESEARCH_CASE_NAMES[id]}</span><small>{value.included.includes(id) ? '已附上' : '点选附上'}</small></button>)}</div>
    <p className="ldct-research__aside">缩略图都是学习型结果的中间层；这里只选汇报附件，不代替刚才的整组对照。</p>
    <div className="ldct-research__claims" role="radiogroup" aria-label="选择汇报结论">{claims.map(claim => <button key={claim.id} type="button" role="radio" aria-checked={value.claim === claim.id}
      disabled={review} onClick={() => change({ claim: claim.id }, true)}><span>{claim.text}</span><small>{claim.note}</small></button>)}</div>
  </>
}

/** All mutations go through the parent reducer; there are no reward/audio effects. */
export function LdctResearchBench({ value, onChange, onSubmit, onBack, review = false }: LdctResearchBenchProps) {
  const lastAction = useRef(0)
  const submitted = useRef(false)
  const [preview, setPreview] = useState<Patch>({})
  const shown = review ? { ...value, ...preview } : value
  useEffect(() => {
    lastAction.current = performance.now()
    submitted.current = false
  }, [value.stage, review])
  const change = (patch: Patch, sound = false) => {
    if (submitted.current || !Object.entries(patch).some(([key, next]) => shown[key as keyof LdctResearchDraft] !== next)) return
    if (review) {
      const { caseId, slice, method, divider } = patch
      setPreview(previous => ({ ...previous, ...(caseId !== undefined && { caseId }), ...(slice !== undefined && { slice }), ...(method !== undefined && { method }), ...(divider !== undefined && { divider }) }))
    } else {
      const next = { ...value, ...patch }
      const seenKey = `${next.caseId}:${next.slice}:${next.method}`
      if (next.stage === 'blind' && !next.seen.includes(seenKey)) next.seen = [...next.seen, seenKey]
      onChange(next)
    }
    if (sound) { lastAction.current = performance.now(); void playSfx('click') }
  }
  const finish = () => {
    if (review) { onBack(); void playSfx('click'); return }
    const now = performance.now()
    const previous = lastAction.current
    lastAction.current = now
    if (!researchReady(value) || submitted.current || now - previous < 900) return
    submitted.current = true
    onSubmit(value.stage)
    void playSfx('click')
  }
  const tools = { roster: Roster, blind: Blind, report: Report }
  const Tool = tools[value.stage]
  return <section className="ldct-research" data-research-stage={value.stage} data-review={review} aria-label="研究工作台" onClick={event => event.stopPropagation()}>
    <header><div><small>{review ? '已保存的研究记录' : '低剂量CT · 研究记录'}</small><h2>{RESEARCH_TITLES[value.stage]}</h2></div>
      <button type="button" onClick={() => { onBack(); void playSfx('click') }}>{review ? '返回记录' : '先回去聊聊'}</button></header>
    <Tool value={shown} change={change} review={review} />
    <footer><button type="button" className="ldct-research__primary" disabled={!review && !researchReady(value)} onClick={finish}>
      {review ? '回到记录' : ({ roster: '分工先这么记，接着聊', blind: '保留观察和对照，接着聊', report: '这一版留好，去和陆舟谈' })[value.stage]}</button></footer>
  </section>
}
