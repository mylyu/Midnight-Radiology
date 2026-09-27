import { useEffect, useRef, useState, type ReactNode, type MouseEvent } from 'react'
import type { GameState } from '../game/types'
import { getLdctProgress, ldctAction, initializeLdct, ldctGiftChoices, ldctItemUnavailable, ldctCanRest } from '../game/ldct-session'
import { LDCT_BADGES, LDCT_MANUAL, LDCT_PARTS, getLdctNode, getLdctChoices } from '../game/ldct'
import { researchPart, RESEARCH_TITLES, researchRecordNote, type LdctResearchStage } from '../game/ldct-research'
import type { LdctPerson } from '../game/ldct-types'
import { LDCT_LAB_TITLES, ldctRecordSummary, type LdctLabRound } from '../game/ldct-experiments'
import { CHARACTERS, SHOP_ITEMS } from '../game/data'
import { playSfx } from '../game/store'
import { imageAsset } from '../lib/image-assets'
import { useDialogueChoiceGuard } from '../hooks/use-dialogue-choice-guard'
import { acceptInput } from '../game/input-gate'
import { SceneBackground } from './SceneBackground'
import { LdctLab } from './LdctLab'
import { LdctResearchBench } from './LdctResearchBench'
import { DialogueStage, DialogueShade, DialogueHeader, DialoguePortrait, DialoguePanel, DialogueChoices, DialogueChoice } from './DialogueScene'
import { FullscreenBtn } from './FullscreenButton'
import { DIALOGUE_CHARACTER_MS, waitForDialogueChoices } from '../game/dialogue-timing'
import './LdctScreen.css'

type Overlay = 'records' | 'bag' | 'manual' | 'badges' | 'shop' | 'replay'
type Props = { state: GameState; update: (fn: (state: GameState) => GameState) => void; onExit: () => void; renderText: (text: string, shown?: number) => ReactNode }
const itemName = (id: string) => SHOP_ITEMS.find(item => item.id === id)?.name ?? id
const icons = { gold: '💰 科室存款', skill: '🩺 医术', heart: '🧡 人心', wealth: '🏠 家业' }
const endingNotes: Record<string, string> = {
  limited: '收窄了结论，保留完整的模体记录。稿子还需要修改，但这次做过什么、没做过什么说得清。',
  delay: '撤下了这次汇报，留出时间补验证。约好的饭，没有再往后推。',
  rework: '把那页撑不住的结论撤了回来。解释不太好受，下一版可以从完整记录重新开始。',
  paused: '这次研究被暂停核对。保留下来的记录让返工还有起点，谁也没有拿它替代临床报告。',
}

/** Chapter-specific session, shared chapter presentation. */
export function LdctScreen({ state, update, onExit, renderText }: Props) {
  const p = getLdctProgress(state)!
  const node = getLdctNode(state)
  const [overlay, setOverlay] = useState<Overlay | null>(null)
  const [presentation, setPresentation] = useState(0)
  const transactionGate = useRef({ until: 0 })
  const act = (action: Parameters<typeof ldctAction>[1]) => update(s => ldctAction(s, action))
  // Play only after the input guard accepts a discrete action. Text reveal,
  // typewriter ticks and continuous lab drags stay silent, as in Chapters 1–2.
  const interact = (action: Parameters<typeof ldctAction>[1]) => { act(action); void playSfx('click') }
  const nextPart = (event: MouseEvent<HTMLButtonElement>) => {
    if (acceptInput(transactionGate.current, event.timeStamp, 500)) interact({ type: 'part:next' })
  }
  const close = () => { setOverlay(null); setPresentation(n => n + 1); void playSfx('click') }
  const ui = (name: Overlay) => { setOverlay(name); void playSfx('click') }
  const sprite = node.sprite === 'me' ? `char_${state.gender}` : node.sprite === 'luzhou' || node.sprite === '@luzhou'
    ? `ch2_pixel_char_luzhou_${state.gender}` : node.sprite
  const settled = p.phase === 'settle'
  const part = researchPart(p.nodeId)
  const partStart = p.finished ? p.start : p.partStart ?? p.start
  const dialogue = useLdctDialogue({ state, renderText, blocked: !!overlay || p.phase !== 'story', presentation,
    onAdvance: () => interact(p.reply ? { type: 'reply:close' } : { type: 'advance', nodeId: p.nodeId }),
    onChoose: id => interact({ type: 'choose', nodeId: p.nodeId, choiceId: id }),
    onRest: () => interact({ type: 'rest' }),
    onGift: (person, item) => interact({ type: 'gift', person, item, nodeId: p.nodeId }),
  })
  const menuClass = 'text-xs text-slate-400 hover:text-teal-300 border border-slate-700 rounded px-2 py-0.5'
  const menu = <>
    <button className={menuClass} onClick={e => { e.stopPropagation(); ui('records') }}>▤ 实验记录</button>
    <button className={menuClass} onClick={e => { e.stopPropagation(); ui('bag') }}>🎒 背包</button>
    <button className={menuClass} onClick={e => { e.stopPropagation(); ui('manual') }}>📖 手册</button>
    <button className={menuClass} onClick={e => { e.stopPropagation(); ui('badges') }}>🏅 勋章</button>
    {(settled || node.kind === 'hub') && <button className={menuClass} onClick={e => { e.stopPropagation(); ui('shop') }}>🛒 小卖部</button>}
    <FullscreenBtn />
    <button className={menuClass} onClick={e => { e.stopPropagation(); void playSfx('click'); onExit() }}>💾 回大厅</button>
  </>
  return <DialogueStage className="ldct-root" data-ldct-screen data-ldct-node={p.nodeId} data-ldct-phase={p.phase}
    onPointerDownCapture={dialogue.guard.pointerDown} onPointerCancelCapture={dialogue.guard.cancel}
    onKeyDownCapture={dialogue.guard.keyDown} onClickCapture={dialogue.guard.click} onClick={dialogue.advance}>
    <SceneBackground name={node.bg} />
    <DialogueShade />
    <DialogueHeader title={`◐ 噪声之外 · ${LDCT_PARTS[part - 1].title}`}><span>💰 {state.gold}</span>{menu}</DialogueHeader>
    {p.phase === 'research' && p.research ? <div className="ldct-lab-wrap" onClick={e => e.stopPropagation()}>
      <LdctResearchBench key={`${p.research.stage}:${p.researchReturn ?? 'live'}`} value={p.research} review={!!p.researchReturn}
        onChange={value => act({ type: 'research:update', value })}
        onSubmit={stage => act({ type: 'research:submit', stage })}
        onBack={() => act({ type: 'research:close' })} /></div>
      : p.phase === 'lab' ? <div className="ldct-lab-wrap" onClick={e => e.stopPropagation()}><LdctLab round={p.labRound} value={p.labDraft}
      onChange={value => act({ type: 'lab:update', value })}
      onSubmit={record => act({ type: 'lab:submit', record })}
      onBack={() => act({ type: 'lab:close' })} /></div>
      : settled ? <main className="ldct-settlement" data-ldct-settlement onClick={e => e.stopPropagation()}>
        <p className="text-cyan-200 text-sm tracking-widest">低剂量 CT · {p.finished ? '研究回顾' : '暂且收工'}</p>
        <h1>{p.finished ? '噪声之外 · 故事完' : LDCT_PARTS[part - 1].title}</h1>
        <p className="text-slate-300 text-sm">{p.finished ? '对照、争执和留下的记录，都在这里。下次约饭，终于可以不带电脑。' : '进度已保存。下一段等你亲自开始；买东西、查看记录都不会跳过时间。'}</p>
        <div className="ldct-metrics">{(Object.keys(icons) as (keyof typeof icons)[]).map(key => <section key={key}>
          <small>{icons[key]}</small><p>{state[key]} <span className="text-xs text-teal-200">{p.finished ? '本篇' : '本段'} {state[key] - partStart[key] >= 0 ? '+' : ''}{state[key] - partStart[key]}</span></p>
        </section>)}</div>
        <section className="ldct-panel"><h2>桌上的电脑 · {Object.keys(p.records).length} 份复习记录 / {Object.keys(p.researchRecords ?? {}).length} 份研究记录</h2>
          <p>{p.finished ? (endingNotes[p.decisions.ending] ?? '这段合作已经收尾，记录留了下来。') : '实验画面使用数字模体，没有为研究给患者多扫一次。已有记录随时可看，不要求今天把所有问题都解决。'}</p>
          <p className="text-amber-200">🎒 {state.items.length ? state.items.map(itemName).join('、') : '背包暂空'}</p>
          <p>眼下状态：{p.fatigue >= 4 ? '已经很困了，先留出休息时间' : p.fatigue >= 2 ? '有点困，下一次别约太晚' : '歇过一会儿，缓过来了'}。</p>
          <div className="ldct-parts">{LDCT_PARTS.map((entry, i) => <p key={entry.title} className={i + 1 <= part ? 'text-teal-100' : 'text-slate-400'}>{i + 1 < part || p.finished ? '✓ ' : i + 1 === part ? '◐ ' : '· '}{entry.title} · {entry.status}</p>)}</div>
        </section>
        {!p.finished && part < 4 && <button className="ldct-next-part" data-ldct-next-part onClick={nextPart}>进入{LDCT_PARTS[part].title} →</button>}
        <nav className="ldct-menu">{menu}<button onClick={() => ui('replay')}>只重玩本DLC</button></nav>
      </main> : <>
        {sprite && <DialoguePortrait data-ldct-portrait src={imageAsset(sprite)} alt="" className="pointer-events-none" />}
        {dialogue.panel}
      </>}
    {overlay && <LdctModal title={{ records: '实验与研究记录', bag: '背包用途', manual: '随手记 · 不急着读', badges: '噪声之外 · 勋章', shop: '小卖部', replay: '重玩本DLC' }[overlay]} onClose={close}>
      {overlay === 'manual' && <div className="ldct-reading">
        {LDCT_MANUAL.map(page => <section key={page.title}><h3>{page.title}</h3><p>{page.text}</p></section>)}
        <p><a href="https://www.aapm.org/grandchallenge/lowdosect/" target="_blank" rel="noreferrer">可选延伸阅读：AAPM 低剂量 CT 挑战 ↗</a></p>
      </div>}
      {overlay === 'records' && <div className="ldct-reading">
        {!Object.keys(p.records).length && <p>还没有保存对照。先去实验台看看，不用急着得到一个“正确答案”。</p>}
        {settled && p.decisions.migratedProjection === 'yes' && <section className="ldct-panel"><h3>旧样段已完成，可以试试新实验</h3>
          <p>之前的两张结果图已改为五段实验。保留已完成进度和奖励，从任意一段开始试，不必重新约饭。</p>
          <div className="ldct-menu">{([1, 2, 3, 4, 5] as LdctLabRound[]).map(round => <button key={round}
            onClick={() => { act({ type: 'lab:open', round }); close() }}>{LDCT_LAB_TITLES[round]}</button>)}</div>
        </section>}
        {Object.entries(p.records).map(([round, record]) => <article className="ldct-panel" key={round}><h3>{LDCT_LAB_TITLES[record!.round]}</h3>
          <p>同源模拟投影 · 种子 2258 · 参数和观察已保存</p>
          <p>{ldctRecordSummary(record!)} · {record!.verdict === 'uncertain' ? '先保留疑问' : '记下了差异'}{record!.helped ? ' · 和陆舟一起看过' : ''}</p>
          {settled && <button onClick={() => { act({ type: 'lab:open', round: Number(round) as LdctLabRound }); close() }}>回实验台比较</button>}
        </article>)}
      </div>}
      {overlay === 'records' && Object.entries(p.researchRecords ?? {}).map(([stage, record]) => <article className="ldct-panel" key={stage}>
        <h3>{RESEARCH_TITLES[stage as LdctResearchStage]}</h3><p>{researchRecordNote(record!)}</p>
        {settled && <button onClick={() => { act({ type: 'research:open', stage: stage as LdctResearchStage }); close() }}>回看这份记录</button>}
      </article>)}
      {overlay === 'bag' && <div className="ldct-reading"><p>奶茶、零食要在同事在场的闲聊里递出；阶段结束页只整理背包。</p>
        {state.items.map(item => <p key={item}>{itemName(item)} · {item === 'milktea' ? '购买时已加人心；当面送出不重复加。' : item === 'snack' ? '当面分享，人心＋1。' : '保留主游戏用途，本实验不消耗。'}</p>)}
        {!state.items.length && <p>背包暂空。</p>}
      </div>}
      {overlay === 'badges' && Object.entries(LDCT_BADGES).map(([id,badge]) => <article className="ldct-panel" key={id}><h3>{badge.icon} {badge.name}</h3><p>{state.badges.includes(id) ? '已获得' : '尚未获得'} · {badge.desc}</p></article>)}
      {overlay === 'shop' && <div className="ldct-reading"><p>💰 {state.gold} 金币 · 这里买的东西带回闲聊再用。</p>
        {SHOP_ITEMS.filter(item => ['coffee','milktea','snack'].includes(item.id)).map(item => {
          const reason = ldctItemUnavailable(state, item.id as 'coffee' | 'milktea' | 'snack') || (state.gold < item.price ? '金币不够，先不买也能继续' : undefined)
          return <article key={item.id} className="ldct-shop-row">
            {item.image && <img src={imageAsset(item.image)} alt="" className="pixel" />}<div><h3>{item.name} · {item.price} 金币</h3><p>{reason || (item.id === 'coffee' ? '坐下喝一杯，缓一缓；本段一次，不增加主线行动力。' : item.id === 'milktea' ? '购买时人心＋2；当面递给陆舟或小雷。' : '当面分享，人心＋1。')}</p></div>
            <button disabled={!!reason} onClick={() => { if (acceptInput(transactionGate.current, performance.now(), 500)) interact({ type: 'buy', item: item.id as 'coffee' | 'milktea' | 'snack' }) }}>购买</button>
          </article>
        })}
      </div>}
      {overlay === 'replay' && <><p>只重置低剂量CT四段故事的游标和实验记录，第一、二章与其他DLC不动。金币、累计属性和已获得勋章保留。</p><button className="mt-4" onClick={() => { update(s => initializeLdct(s, true)); close() }}>确认重玩本DLC</button></>}
    </LdctModal>}
  </DialogueStage>
}

function useLdctDialogue({ state, blocked, presentation, renderText, onAdvance, onChoose, onGift, onRest }: {
  state: GameState; blocked: boolean; renderText: Props['renderText']; onAdvance: () => void; onChoose: (id:string)=>void;
  onGift:(person:LdctPerson, item:'milktea'|'snack')=>void;
  onRest:()=>void; presentation: number;
}) {
  const p = getLdctProgress(state)!, node = getLdctNode(state)
  const text = p.reply?.text ?? node.text
  const speaker = p.reply?.speaker ?? node.speaker
  const choices = p.reply ? [] : getLdctChoices(state)
  const gifts = p.reply ? [] : ldctGiftChoices(state)
  const restAvailable = ldctCanRest(state)
  const hasChoices = !!(choices.length || gifts.length || restAvailable)
  // A gift reply, modal return or changed choices is a new presentation even
  // when the stored node is unchanged. Keep guard history on the whole stage.
  const scope = JSON.stringify([p.run, p.nodeId, text, presentation, choices.map(c => c.id), gifts.map(g => g.item), restAvailable])
  const [progress, setProgress] = useState({ scope, shown: 0 })
  const [readyScope, setReadyScope] = useState<string | null>(null)
  const shown = progress.scope === scope ? progress.shown : 0
  const ready = readyScope === scope
  const plainLength = text.replaceAll('**', '').length
  const done = shown >= plainLength
  const gate = useRef({ until: 0 })
  const choiceGuard = useDialogueChoiceGuard(scope, ready && done && !blocked)
  useEffect(() => {
    if (done) return
    const id = setInterval(() => setProgress(value => ({ scope, shown: Math.min((value.scope === scope ? value.shown : 0) + 1, plainLength) })), DIALOGUE_CHARACTER_MS)
    return () => clearInterval(id)
  }, [done, plainLength, scope])
  useEffect(() => {
    if (!done || !hasChoices) return
    return waitForDialogueChoices(() => setReadyScope(scope))
  }, [done, scope, hasChoices])
  const advance = () => {
    if (blocked || !acceptInput(gate.current, performance.now(), 300)) return
    if (!done) { setProgress({ scope, shown: plainLength }); return }
    if (!hasChoices) onAdvance()
  }
  const speakerMeta = speaker ? CHARACTERS[speaker] ?? { name: speaker, color: '#cbd5e1' } : undefined
  const panel = <DialoguePanel data-ldct-dialogue data-choice-ready={ready}
    textKey={scope} text={renderText(text, shown)} arrow={done && !hasChoices}
    speaker={speakerMeta && { ...speakerMeta, name: speaker === 'me' ? state.gender === 'f' ? '林小满' : '陈一帆' : speakerMeta.name }}>
    {done && ready && hasChoices && <DialogueChoices>
      {choices.map((choice, i) => <DialogueChoice key={choice.id} data-dialogue-choice={i} data-ldct-choice={choice.id}
        onClick={() => { if (!blocked && choiceGuard.accept(i)) onChoose(choice.id) }}>{renderText(choice.text)}</DialogueChoice>)}
      {gifts.map((gift, i) => <DialogueChoice key={gift.item} data-dialogue-choice={choices.length+i}
        onClick={() => { if (!blocked && choiceGuard.accept(choices.length+i)) onGift(gift.person, gift.item) }}>{renderText(gift.text)}</DialogueChoice>)}
      {restAvailable && <DialogueChoice data-dialogue-choice={choices.length+gifts.length}
        onClick={() => { if (!blocked && choiceGuard.accept(choices.length+gifts.length)) onRest() }}>先靠着椅背歇几分钟</DialogueChoice>}
      {!choices.length && !!gifts.length && <DialogueChoice data-dialogue-choice={gifts.length}
        onClick={() => { if (!blocked && choiceGuard.accept(gifts.length)) onAdvance() }}>接着聊</DialogueChoice>}
    </DialogueChoices>}
  </DialoguePanel>
  return { panel, advance, guard: choiceGuard }
}

function LdctModal({ title, children, onClose }: { title:string; children:ReactNode; onClose:()=>void }) {
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    box.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key !== 'Tab') return
      const items = [...(box.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a,input,summary') ?? [])]
      const first = items[0], last = items.at(-1)
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
    }
    window.addEventListener('keydown',key)
    return () => { window.removeEventListener('keydown',key); previous?.focus() }
  }, [onClose])
  return <div className="ldct-overlay" onClick={e => e.stopPropagation()}><div ref={box} className="ldct-modal" role="dialog" aria-modal="true" aria-label={title}>
    <header><h2>{title}</h2><button onClick={onClose}>关闭 ×</button></header><div className="ldct-modal-content">{children}</div>
  </div></div>
}
