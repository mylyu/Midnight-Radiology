import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { GameState } from '../game/types'
import { getLdctProgress, getLdctShelf, getLdctLabDataset, ldctAction, selectLdctStory, openLdctShelf, ldctGiftChoices, ldctItemUnavailable, ldctCanRest } from '../game/ldct-session'
import { LDCT_BADGES, LDCT_MANUAL, getLdctNode, getLdctChoices } from '../game/ldct'
import { LDCT_STORIES } from '../game/ldct-short-stories'
import { LDCT_FATHER_STORY } from '../game/ldct-father-story'
import { ldctChestFrame, ldctChestFrameStyle } from '../game/ldct-chest'
import type { LdctPerson } from '../game/ldct-types'
import { LDCT_LAB_TITLES, ldctRecordSummary, type LdctLabRound } from '../game/ldct-experiments'
import { CHARACTERS, SHOP_ITEMS } from '../game/data'
import { playSfx } from '../game/store'
import { imageAsset } from '../lib/image-assets'
import { useDialogueChoiceGuard } from '../hooks/use-dialogue-choice-guard'
import { acceptInput } from '../game/input-gate'
import { SceneBackground } from './SceneBackground'
import { LdctLab } from './LdctLab'
import { DialogueStage, DialogueShade, DialogueHeader, DialoguePortrait, DialoguePanel, DialogueChoices, DialogueChoice } from './DialogueScene'
import { FullscreenBtn } from './FullscreenButton'
import { DIALOGUE_CHARACTER_MS, waitForDialogueChoices } from '../game/dialogue-timing'
import './LdctScreen.css'
import './LdctFatherStory.css'

type Overlay = 'records' | 'bag' | 'manual' | 'badges' | 'shop' | 'replay'
type Props = { state: GameState; update: (fn: (state: GameState) => GameState) => void; onExit: () => void; renderText: (text: string, shown?: number) => ReactNode }
const itemName = (id: string) => SHOP_ITEMS.find(item => item.id === id)?.name ?? id
const icons = { gold: '💰 科室存款', skill: '🩺 医术', heart: '🧡 人心', wealth: '🏠 家业' }

export function LdctScreen(props: Props) {
  const p = getLdctProgress(props.state)
  if (p) return <LdctStoryScreen key={`${p.storyId}:${p.run}`} {...props} />
  const shelf = getLdctShelf(props.state)
  return <DialogueStage className="ldct-root" data-ldct-selector>
    <SceneBackground name="bg_breakroom" /><DialogueShade />
    <DialogueHeader title="◐ 低剂量CT · 噪声之外"><FullscreenBtn /><button onClick={props.onExit}>💾 回大厅</button></DialogueHeader>
    <main className="ldct-settlement">
      <p className="text-teal-200">第二章之后 · 两个晚上，一顿没吃成的饭</p>
      <h1>{LDCT_FATHER_STORY.title}</h1>
      <section className="ldct-panel">
        <p>陆舟说约饭，带来的却还有他爸。叔叔觉得自己没病，也不想挨辐射。等终于拿到片子，陆舟脸上的笑又没了。</p>
        <p className="text-slate-300 text-sm">点场景补全文、继续，停一下再选。遇到电脑时跟着当前提示试一下，也可以叫陆舟一起看。</p>
        <div className="ldct-menu"><button data-ldct-story="father" onClick={() => props.update(s => selectLdctStory(s, 'father'))}>
          {shelf?.slots.father?.finished ? '回看故事结尾' : shelf?.slots.father ? '继续这顿没吃完的饭' : '去赴约'} →</button>
          {shelf?.slots.father && <small className="text-slate-400 self-center">进度已保存 · 随时可以回来</small>}
        </div>
      </section>
      {(shelf?.legacy || LDCT_STORIES.some(story => shelf?.slots[story.id])) && <details className="ldct-panel" data-ldct-archives>
        <summary>历史试玩记录（只读）</summary>
        <p>旧稿的选择与结果仍留在本机，不会变成这次父亲的经历。已获得的属性、物品和勋章保留。</p>
        {LDCT_STORIES.map(story => { const old = shelf?.slots[story.id]; return old && <section key={story.id}>
          <h3>{story.title} · {old.finished ? '已结束' : '未结束'}</h3>
          <p>{Object.values(old.records ?? {}).map(record => record && ldctRecordSummary(record)).filter(Boolean).join('；') || '尚无实验记录'}</p>
          <details><summary>查看当时选择与游标</summary><pre className="ldct-json">{JSON.stringify({ node: old.nodeId, decisions: old.decisions }, null, 2)}</pre></details>
        </section> })}
        {shelf?.legacy && <p>旧四段版：{shelf.legacy.finished ? '已结束' : '未结束'}，{Object.keys(shelf.legacy.records ?? {}).length} 份复习记录、{Object.keys(shelf.legacy.researchRecords ?? {}).length} 份研究记录。</p>}
      </details>}
    </main>
  </DialogueStage>
}

/** Story business is isolated; presentation and input are the same shared chapter components. */
function LdctStoryScreen({ state, update, onExit, renderText }: Props) {
  const p = getLdctProgress(state)!
  const node = getLdctNode(state)
  const story = LDCT_FATHER_STORY
  const [overlay, setOverlay] = useState<Overlay | null>(null)
  const [presentation, setPresentation] = useState(0)
  const transactionGate = useRef({ until: 0 })
  const act = (action: Parameters<typeof ldctAction>[1]) => update(s => ldctAction(s, action))
  const interact = (action: Parameters<typeof ldctAction>[1]) => { act(action); void playSfx('click') }
  const close = () => { setOverlay(null); setPresentation(n => n + 1); void playSfx('click') }
  const ui = (name: Overlay) => { setOverlay(name); void playSfx('click') }
  const sprite = node.sprite === 'me' ? `char_${state.gender}` : node.sprite === 'luzhou' || node.sprite === '@luzhou'
    ? `ch2_pixel_char_luzhou_${state.gender}` : node.sprite
  const settled = p.phase === 'settle'
  const dialogue = useLdctDialogue({ state, renderText, blocked: !!overlay || p.phase !== 'story', presentation,
    onAdvance: () => interact(p.reply ? { type: 'reply:close' } : { type: 'advance', nodeId: p.nodeId }),
    onChoose: id => interact({ type: 'choose', nodeId: p.nodeId, choiceId: id }),
    onRest: () => interact({ type: 'rest' }),
    onGift: (person, item) => interact({ type: 'gift', person, item, nodeId: p.nodeId }),
  })
  const menuClass = 'text-xs text-slate-400 hover:text-teal-300 border border-slate-700 rounded px-2 py-0.5'
  const menu = <>
    <button className={menuClass} onClick={e => { e.stopPropagation(); ui('records') }}>▤ 记录</button>
    <button className={menuClass} onClick={e => { e.stopPropagation(); ui('bag') }}>🎒 背包</button>
    <button className={menuClass} onClick={e => { e.stopPropagation(); ui('manual') }}>📖 手册</button>
    <button className={menuClass} onClick={e => { e.stopPropagation(); ui('badges') }}>🏅 勋章</button>
    {((settled && !p.finished) || node.kind === 'hub') && <button className={menuClass} onClick={e => { e.stopPropagation(); ui('shop') }}>🛒 小卖部</button>}
    <FullscreenBtn />
    <button className={menuClass} data-ldct-switch onClick={e => { e.stopPropagation(); update(openLdctShelf) }}>本篇入口</button>
    <button className={menuClass} onClick={e => { e.stopPropagation(); onExit() }}>💾 回大厅</button>
  </>
  return <DialogueStage className="ldct-root" data-ldct-screen data-ldct-node={p.nodeId} data-ldct-phase={p.phase}
    onPointerDownCapture={dialogue.guard.pointerDown} onPointerCancelCapture={dialogue.guard.cancel}
    onKeyDownCapture={dialogue.guard.keyDown} onClickCapture={dialogue.guard.click} onClick={dialogue.advance}>
    <SceneBackground name={node.bg} /><DialogueShade />
    <DialogueHeader title={`◐ 噪声之外 · ${p.finished ? '饭还热着' : node.part === 2 ? '第二晚' : node.part === 3 ? '几周后' : '第一晚'}`}><span>💰 {state.gold}</span>{menu}</DialogueHeader>
    {p.phase === 'lab' ? <div className="ldct-lab-wrap" onClick={e => e.stopPropagation()}>
      <LdctLab key={`${p.storyId}:${p.labRound}:${p.labReturn ?? 'live'}`} round={p.labRound} value={p.labDraft}
        dataset={getLdctLabDataset(state)} goal={node.goal}
        onChange={value => act({ type: 'lab:update', value })}
        onSubmit={record => act({ type: 'lab:submit', record })}
        onBack={() => act({ type: 'lab:close' })} /></div>
      : settled ? <main className="ldct-settlement" data-ldct-settlement onClick={e => e.stopPropagation()}>
        <p className="text-teal-200 text-sm">{p.finished ? '本篇完 · 后面的复查，叔叔自己记着了' : '第一晚 · 先歇一歇'}</p><h1>{p.finished ? '这顿饭，终于吃上了' : '电脑留在这里，明晚接着看'}</h1>
        <p className="text-slate-300 text-sm">{node.text}</p>
        <div className="ldct-metrics">{(Object.keys(icons) as (keyof typeof icons)[]).map(key => <section key={key}>
          <small>{icons[key]}</small><p>{state[key]} <span className="text-xs text-teal-200">本次开始以来 {state[key] - p.start[key] >= 0 ? '+' : ''}{state[key] - p.start[key]}</span></p>
        </section>)}</div>
        <section className="ldct-panel"><h2>桌上的电脑 · 记录已保存</h2>
          <p>{p.finished ? '图像和当时的选择都留着。可以回看，不再重复发放学习奖励。' : '不会自动跳到明晚。可以买点吃的带着，再回来继续；送东西要等陆舟在场。'}</p>
          <p className="text-amber-200">🎒 {state.items.length ? state.items.map(itemName).join('、') : '背包暂空'}</p>
          <p>已经买的东西保留。送礼要等到同事在场的闲聊里，不在这里统一结算。</p>
        </section>
        {!p.finished && <button className="ldct-next-part" data-ldct-next-evening onClick={() => act({ type: 'part:next' })}>第二晚 · 带着昨晚的片子回来 →</button>}
        <nav className="ldct-menu">{menu}<button data-ldct-replay onClick={() => ui('replay')}>重玩本篇</button></nav>
      </main> : <>
        {sprite && <DialoguePortrait data-ldct-portrait src={imageAsset(sprite)} alt="" className="pointer-events-none" />}
        {node.chestPreview && <figure className="ldct-case-preview" data-ldct-case-preview={node.chestPreview}>
          <div role="img" aria-label={node.chestPreview === 'fbp' ? '同次胸部检查的FBP图像，未标注观察答案' : '同份投影的研究重建图像，未标注观察答案'}
            style={{ ...ldctChestFrameStyle(node.chestPreview, 1), backgroundImage: `url("${imageAsset(ldctChestFrame(node.chestPreview, 1).mediaId)}")` }} />
          <figcaption>{node.chestPreview === 'fbp' ? '同次数据 · FBP' : '同次数据 · 研究重建'}</figcaption>
        </figure>}
        {dialogue.panel}
      </>}
    {overlay && <LdctModal title={{ records: '这篇的实验记录', bag: '背包用途', manual: '随手记 · 不急着读', badges: '噪声之外 · 勋章', shop: '小卖部', replay: '重玩本篇' }[overlay]} onClose={close}>
      {overlay === 'manual' && <div className="ldct-reading">{LDCT_MANUAL.map(page => <section key={page.title}><h3>{page.title}</h3><p>{page.text}</p></section>)}</div>}
      {overlay === 'records' && <div className="ldct-reading">
        {!Object.keys(p.records).length && <p>还没试过工具。想带过时，请陆舟演示就能继续。</p>}
        {Object.entries(p.records).map(([round, record]) => <article className="ldct-panel" key={round}><h3>{LDCT_LAB_TITLES[record!.round]}</h3>
          <p>{ldctRecordSummary(record!)}{record!.helped ? ' · 和陆舟一起看过' : ''}</p>
          {settled && <button onClick={() => { act({ type: 'lab:open', round: Number(round) as LdctLabRound }); close() }}>回实验台看看</button>}
        </article>)}
      </div>}
      {overlay === 'bag' && <div className="ldct-reading"><p>奶茶、零食要在同事在场的闲聊里递出。</p>
        {state.items.map(item => <p key={item}>{itemName(item)} · {item === 'milktea' ? '购买时已加人心；当面送出不重复加。' : item === 'snack' ? '当面分享，人心＋1。' : '保留主游戏用途，本篇不消耗。'}</p>)}
        {!state.items.length && <p>背包暂空。</p>}
      </div>}
      {overlay === 'badges' && Object.entries(LDCT_BADGES).filter(([id]) => id !== 'ldct_keep_counterexample' || state.badges.includes(id)).map(([id,badge]) =>
        <article className="ldct-panel" key={id}><h3>{badge.icon} {badge.name}</h3><p>{state.badges.includes(id) ? '已获得' : '尚未获得'} · {badge.desc}</p></article>)}
      {overlay === 'shop' && <div className="ldct-reading"><p>💰 {state.gold} 金币 · 买完带回闲聊再用。</p>
        {SHOP_ITEMS.filter(item => ['coffee','milktea','snack'].includes(item.id)).map(item => {
          const reason = ldctItemUnavailable(state, item.id as 'coffee' | 'milktea' | 'snack') || (state.gold < item.price ? '金币不够，不买也能继续' : undefined)
          return <article key={item.id} className="ldct-shop-row">
            {item.image && <img src={imageAsset(item.image)} alt="" className="pixel" />}<div><h3>{item.name} · {item.price} 金币</h3>
            <p>{reason || (item.id === 'coffee' ? '本篇休息一次，缓一缓。' : item.id === 'milktea' ? '购买时人心＋2，当面送出不重复加。' : '当面分享，人心＋1。')}</p></div>
            <button disabled={!!reason} onClick={event => { if (acceptInput(transactionGate.current, event.timeStamp, 500)) interact({ type: 'buy', item: item.id as 'coffee' | 'milktea' | 'snack' }) }}>购买</button>
          </article>
        })}
      </div>}
      {overlay === 'replay' && <><p>只清除《{story.title}》这一次的游标、选择和实验记录。历史试玩、主游戏及其他DLC不动；金币、累计属性和物品保留，已发学习奖励不再发。</p>
        <button className="mt-4" onClick={() => { update(s => selectLdctStory(s, story.id, true)); close() }}>确认重玩本篇</button></>}
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
