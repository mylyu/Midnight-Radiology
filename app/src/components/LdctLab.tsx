import { useRef, useState } from 'react'
import type { CSSProperties, PointerEvent } from 'react'
import { imageAsset } from '../lib/image-assets'
import {
  createLdctRecord, ldctAtlasColumn, ldctConfigKey, ldctConfigLabel, ldctFramePosition,
  LDCT_LAB_MEDIA_IDS, type LdctLabConfig, type LdctLabRecord, type LdctLabState,
} from '../game/ldct-experiments'
import './LdctLab.css'

export type LdctLabProps = {
  round: 1 | 2
  value: LdctLabState
  onChange: (value: LdctLabState) => void
  onSubmit: (record: LdctLabRecord) => void
  onBack?: () => void
}

/** Controlled, serialized experiment. Image content is precomputed from projections. */
export function LdctLab({ round, value, onChange, onSubmit, onBack }: LdctLabProps) {
  const stage = useRef<HTMLDivElement>(null)
  const submitAt = useRef(0)
  const draggingDivider = useRef(false)
  const [marking, setMarking] = useState(false)
  const [showTruth, setShowTruth] = useState(false)
  const atlas = imageAsset(LDCT_LAB_MEDIA_IDS[0])
  const frozen = Boolean(value.saved)
  const frameStyle = (config: LdctLabConfig): CSSProperties => ({
    backgroundImage: `url("${atlas}")`,
    backgroundPosition: ldctFramePosition(ldctAtlasColumn(config), value.slice),
  })
  const different = Boolean(value.pinned && ldctConfigKey(value.pinned) !== ldctConfigKey(value.candidate))
  const changeConfig = (patch: Partial<LdctLabConfig>) => {
    if (!frozen) onChange({ ...value, candidate: { ...value.candidate, ...patch } })
  }
  const save = (verdict: LdctLabRecord['verdict']) => {
    if (frozen) return
    const record = createLdctRecord(value, round, verdict)
    if (record) {
      submitAt.current = performance.now()
      onChange({ ...value, saved: record })
      setMarking(false)
    }
  }
  const mark = (event: PointerEvent<HTMLDivElement>) => {
    if (!marking || frozen || !stage.current) return
    const rect = stage.current.getBoundingClientRect()
    onChange({ ...value, mark: {
      x: Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100)),
      y: Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100)),
    } })
    setMarking(false)
  }
  const moveDivider = (event: PointerEvent<HTMLSpanElement>) => {
    if (!draggingDivider.current || !stage.current || showTruth) return
    const rect = stage.current.getBoundingClientRect()
    onChange({ ...value, divider: Math.round(Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100))) })
  }
  const continueAfterReveal = () => {
    // Prevent a double tap on Save from immediately dismissing the reveal.
    const now = performance.now()
    const previous = submitAt.current
    submitAt.current = now
    if (!value.saved || (previous > 0 && now - previous < 900)) return
    onSubmit(value.saved)
  }

  return <section className="ldct-lab" aria-label="重建实验台" data-round={round}>
    <header className="ldct-lab__header">
      <div><span className="ldct-lab__eyebrow">数字模体 · {round === 1 ? '第一份对照' : '再看一次'}</span>
        <h2>{round === 1 ? '先别挑最好看的' : '刚才那个细节，还在吗？'}</h2></div>
      {onBack && <button className="ldct-lab__quiet" onClick={onBack}>先回值班室</button>}
    </header>
    <p className="ldct-lab__intro">{round === 1
      ? '陆舟把椅子拉过来：“先留一版。换个处理办法，再看看哪些东西没变。”'
      : '“这回别光盯着那两个大圆。”陆舟指了指屏幕，又把手收回去，“先不告诉你在哪。”'}</p>
    <div className="ldct-lab__workspace">
      <div className="ldct-lab__viewer">
        <div className="ldct-lab__view-labels"><span>A · {value.pinned ? ldctConfigLabel(value.pinned) : '等待固定'}</span><span>B · {ldctConfigLabel(value.candidate)}</span></div>
        <div ref={stage} className={`ldct-lab__image${marking ? ' is-marking' : ''}`} onPointerDown={mark} data-testid="ldct-comparison">
          <div className="ldct-lab__frame" style={frameStyle(value.candidate)} />
          {value.pinned && <div className="ldct-lab__frame" style={{ ...frameStyle(value.pinned), clipPath: `inset(0 ${100 - value.divider}% 0 0)` }} />}
          {value.pinned && <span className="ldct-lab__divider" style={{ left: `${value.divider}%` }} aria-hidden="true"><i
            onPointerDown={event => { event.stopPropagation(); draggingDivider.current = true; event.currentTarget.setPointerCapture(event.pointerId) }}
            onPointerMove={moveDivider} onPointerUp={() => { draggingDivider.current = false }} onPointerCancel={() => { draggingDivider.current = false }}>↔</i></span>}
          {!value.pinned && <span className="ldct-lab__hint">先把当前结果固定为 A</span>}
          {value.mark && <span className="ldct-lab__mark" style={{ left: `${value.mark.x}%`, top: `${value.mark.y}%` }} aria-label="你标记的不确定区域">?</span>}
          {frozen && showTruth && <>
            <div className="ldct-lab__frame ldct-lab__truth" style={{ backgroundImage: `url("${atlas}")`, backgroundPosition: ldctFramePosition(12, value.slice) }} />
            {round === 1 ? <><span className="ldct-lab__known ldct-lab__known--light" /><span className="ldct-lab__known ldct-lab__known--dark" /></> : <span className="ldct-lab__known ldct-lab__known--weak" />}
            <span className="ldct-lab__truth-label">模体已知结构 · 不是额外扫描</span>
          </>}
        </div>
        <label className="ldct-lab__range-label">拖动分界比较 <span>{value.divider}%</span>
          <input aria-label="对照分界" type="range" min="0" max="100" step="1" value={value.divider} disabled={!value.pinned || showTruth}
            onChange={event => onChange({ ...value, divider: Number(event.target.value) })} />
        </label>
        <div className="ldct-lab__slice"><button disabled={value.slice === 0} onClick={() => onChange({ ...value, slice: (value.slice - 1) as 0 | 1 | 2 })}>← 上一层</button>
          <span>相邻层 {value.slice + 1} / 3</span>
          <button disabled={value.slice === 2} onClick={() => onChange({ ...value, slice: (value.slice + 1) as 0 | 1 | 2 })}>下一层 →</button></div>
      </div>
      <div className="ldct-lab__controls">
        <fieldset disabled={frozen}><legend>模拟信号水平</legend><div className="ldct-lab__segmented">
          {(['low', 'medium', 'high'] as const).map((signal, i) => <button key={signal} aria-pressed={value.candidate.signal === signal} onClick={() => changeConfig({ signal })}>{['低', '中', '高'][i]}</button>)}
        </div></fieldset>
        <fieldset disabled={frozen}><legend>当前结果 B · 重建办法</legend><div className="ldct-lab__algorithms">
          <button aria-pressed={value.candidate.algorithm === 'fbp'} onClick={() => changeConfig({ algorithm: 'fbp' })}>FBP <small>滤波反投影</small></button>
          <button aria-pressed={value.candidate.algorithm === 'iterative'} onClick={() => changeConfig({ algorithm: 'iterative' })}>迭代示例 <small>反复核对投影</small></button>
          <button disabled title="后续故事开放">深度学习 <small>陆舟：还在训练……</small></button>
        </div></fieldset>
        {value.candidate.algorithm === 'iterative' && <fieldset disabled={frozen}><legend>迭代处理强度</legend><div className="ldct-lab__segmented">
          {([1, 2, 3] as const).map((strength, i) => <button key={strength} aria-pressed={value.candidate.strength === strength} onClick={() => changeConfig({ strength })}>{['轻', '中', '强'][i]}</button>)}
        </div></fieldset>}
        {!frozen && <button className="ldct-lab__pin" onClick={() => onChange({ ...value, pinned: { ...value.candidate } })}>{value.pinned ? '用当前结果重新固定 A' : '把这版固定为 A'}</button>}
        <p className="ldct-lab__small">固定 A 后再改变 B。显示窗、位置一致；同档信号使用同一份投影。</p>
        {!frozen && <div className="ldct-lab__tools"><button aria-pressed={marking} onClick={() => setMarking(!marking)}>{marking ? '点图中拿不准的地方' : value.mark ? '重新圈个拿不准的地方' : '圈个拿不准的地方'}</button>
          <button disabled={value.helped} onClick={() => onChange({ ...value, helped: true })}>{value.helped ? '陆舟已经挪过来了' : '叫陆舟一起看'}</button></div>}
        {value.helped && <p className="ldct-lab__help">陆舟：“先别追着噪点跑。固定一版，来回拖一拖；再翻前后一层。拿不准也写下来，别硬猜。”</p>}
      </div>
    </div>
    {!frozen ? <footer className="ldct-lab__save">
      <p>{different ? '两版都在这儿。记下你看到的，拿不准也可以。' : '留住 A，再试一个不同的 B。两版结果一起保存。'}</p>
      <div><button disabled={!different} onClick={() => save('different')}>记下：我看到了差别</button><button disabled={!different} onClick={() => save('uncertain')}>记下：我还不确定</button></div>
    </footer> : <footer className="ldct-lab__reveal" aria-live="polite">
      <h3>两版已经留住了。</h3>
      <p>{round === 1 ? '陆舟：“这两个大圆，一亮一暗，原本就在模体里。噪点会变，先用它们认位置。”'
        : '陆舟翻出设计图：“右下这块淡圆也是真的。处理得越狠，不一定越留得住它。”'}</p>
      <p>{value.saved?.verdict === 'uncertain' ? '“不确定就先标着。这个记录，比我替你说一句‘挺好’有用。”' : '“别只带走最顺眼那张。参数和对照也一块儿留着。”'}</p>
      <div><button onClick={() => setShowTruth(!showTruth)}>{showTruth ? '回到刚才的对照' : '看模体原本有什么'}</button><button className="ldct-lab__continue" onClick={continueAfterReveal}>把对照收进记录 →</button></div>
    </footer>}
  </section>
}
