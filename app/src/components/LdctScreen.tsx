import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { GameState } from '../game/types'
import { getLdctProgress, ldctAction, initializeLdct, ldctGiftChoices, ldctItemUnavailable } from '../game/ldct-session'
import { LDCT_BADGES, getLdctNode, getLdctChoices } from '../game/ldct'
import type { LdctPerson } from '../game/ldct-types'
import { ldctConfigLabel } from '../game/ldct-experiments'
import { SHOP_ITEMS } from '../game/data'
import { imageAsset } from '../lib/image-assets'
import { useDialogueChoiceGuard } from '../hooks/use-dialogue-choice-guard'
import { acceptInput } from '../game/input-gate'
import { SceneBackground } from './SceneBackground'
import { LdctLab } from './LdctLab'
import './LdctScreen.css'

type Overlay = 'records' | 'bag' | 'manual' | 'badges' | 'shop' | 'replay'
type Props = { state: GameState; update: (fn: (state: GameState) => GameState) => void; onExit: () => void; renderText: (text: string, shown?: number) => ReactNode }
const itemName = (id: string) => SHOP_ITEMS.find(item => item.id === id)?.name ?? id
const icons = { gold: '💰 科室存款', skill: '🩺 医术', heart: '🧡 人心', wealth: '🏠 家业' }

/** Independent DLC presentation. The session reducer owns all persistent actions. */
export function LdctScreen({ state, update, onExit, renderText }: Props) {
  const p = getLdctProgress(state)!
  const node = getLdctNode(state)
  const [overlay, setOverlay] = useState<Overlay | null>(null)
  const [presentation, setPresentation] = useState(0)
  const transactionGate = useRef({ until: 0 })
  const act = (action: Parameters<typeof ldctAction>[1]) => update(s => ldctAction(s, action))
  const close = () => { setOverlay(null); setPresentation(n => n + 1) }
  const ui = (name: Overlay) => setOverlay(name)
  const sprite = node.sprite === 'me' ? `char_${state.gender}` : node.sprite === 'luzhou' || node.sprite === '@luzhou'
    ? `ch2_pixel_char_luzhou_${state.gender}` : node.sprite
  const settled = p.phase === 'settle'
  const menu = <>
    <button onClick={() => ui('records')}>▤ 实验记录</button><button onClick={() => ui('bag')}>🎒 背包</button>
    <button onClick={() => ui('manual')}>📖 手册</button><button onClick={() => ui('badges')}>🏅 勋章</button>
    {(settled || node.kind === 'hub') && <button onClick={() => ui('shop')}>🛒 小卖部</button>}
    <button onClick={onExit}>💾 返回大厅</button>
  </>
  return <section className="ldct-root" data-ldct-screen data-ldct-node={p.nodeId} data-ldct-phase={p.phase}>
    <SceneBackground name={settled ? 'ch2_bg_breakroom_day' : node.bg} />
    <div className="ldct-shade" />
    <header className="ldct-toolbar"><div><span className="text-cyan-200">◐ 噪声之外</span><small>开场 · 先吃饭</small></div><nav>{menu}</nav></header>
    {p.phase === 'lab' ? <div className="ldct-lab-wrap"><LdctLab round={p.labRound} value={p.labDraft}
      onChange={value => act({ type: 'lab:update', value })}
      onSubmit={record => act({ type: 'lab:submit', record })}
      onBack={() => act({ type: 'lab:close' })} /></div>
      : settled ? <main className="ldct-settlement" data-ldct-settlement>
        <p className="text-cyan-200 text-sm tracking-widest">低剂量 CT · 开场记录</p>
        <h1>先吃饭，然后留一份对照。</h1>
        <p className="text-slate-300 text-sm">开场体验暂告一段落，进度已保存。可以留下整理记录，不会自动进入下一段。</p>
        <div className="ldct-metrics">{(Object.keys(icons) as (keyof typeof icons)[]).map(key => <section key={key}>
          <small>{icons[key]}</small><p>{state[key]} <span className="text-xs text-teal-200">本段 {state[key] - p.start[key] >= 0 ? '+' : ''}{state[key] - p.start[key]}</span></p>
        </section>)}</div>
        <section className="ldct-panel"><h2>桌上的电脑 · 已保存 {Object.keys(p.records).length} 份对照</h2>
          <p>只用了数字模体，临床 CT 没有为这个小实验增加一次曝光。电脑可以合上，那个不太确定的细节还留在记录里。</p>
          <p className="text-amber-200">🎒 {state.items.length ? state.items.map(itemName).join('、') : '背包暂空'}</p>
          <p>第二段「顺手帮个忙」 · 后续待制作<br />第三段「最干净的那张」 · 后续待制作<br />第四段「这版还投吗」 · 后续待制作</p>
        </section>
        <nav className="ldct-menu">{menu}<button onClick={() => ui('replay')}>只重玩本开场</button></nav>
      </main> : <>
        {sprite && <img data-ldct-portrait src={imageAsset(sprite)} alt="" className="ldct-portrait pixel" />}
        <LdctDialogue key={`${p.run}:${p.nodeId}:${p.reply ? 'reply' : 'main'}:${presentation}`} state={state} renderText={renderText} blocked={!!overlay}
          onAdvance={() => act(p.reply ? { type: 'reply:close' } : { type: 'advance', nodeId: p.nodeId })}
          onChoose={id => act({ type: 'choose', nodeId: p.nodeId, choiceId: id })}
          onRest={() => act({ type: 'rest' })}
          onGift={(person, item) => act({ type: 'gift', person, item, nodeId: p.nodeId })} />
      </>}
    {overlay && <LdctModal title={{ records: '实验记录', bag: '背包用途', manual: '随手记 · 不急着读', badges: '开场勋章', shop: '小卖部', replay: '重玩开场' }[overlay]} onClose={close}>
      {overlay === 'manual' && <div className="ldct-reading">
        <h3>先比较，再下结论</h3><p>固定一个版本，来回拖分界线；别只盯着噪点，看看边缘和小结构有没有一起变淡。不确定的地方可以点一下留个圈。</p>
        <h3>这台实验桌里装了什么</h3><p>数字模体、模拟投影和固定噪声种子。FBP 是滤波反投影；另一种是带平滑约束的迭代示例。两者使用同组投影、同样显示窗。这里不是医院设备的某个商业算法。</p>
        <p>信号低／中／高改变的是模拟投影计数，不是给患者开剂量处方。模型省略了散射、运动、束硬化等实际因素；显示变干净也不等于小结构更可靠。</p>
        <h3>还没开始的部分</h3><p>陆舟的深度学习方案仍在训练，本样段不提供滤镜冒充。临床资料的授权、伦理审查和所需知情同意另行处理，不是跟主任说一声就全解决。</p>
        <p><a href="https://www.aapm.org/grandchallenge/lowdosect/" target="_blank" rel="noreferrer">可选延伸阅读：AAPM 低剂量 CT 挑战 ↗</a></p>
      </div>}
      {overlay === 'records' && <div className="ldct-reading">
        {!Object.keys(p.records).length && <p>还没有保存对照。先去实验台看看，不用急着得到一个“正确答案”。</p>}
        {Object.entries(p.records).map(([round, record]) => <article className="ldct-panel" key={round}><h3>第 {round} 份对照</h3>
          <p>同源模拟投影 · 种子 2258 · 参数和观察已保存</p>
          <p>A：{ldctConfigLabel(record!.pinned)}<br />B：{ldctConfigLabel(record!.candidate)}<br />相邻层 {record!.slice + 1} · {record!.verdict === 'uncertain' ? '先保留疑问' : '记下了差异'}{record!.helped ? ' · 和陆舟一起看过' : ''}</p>
          {settled && <button onClick={() => { act({ type: 'lab:open', round: Number(round) as 1 | 2 }); close() }}>回实验台比较</button>}
        </article>)}
      </div>}
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
            <button disabled={!!reason} onClick={() => { if (acceptInput(transactionGate.current, performance.now(), 500)) act({ type: 'buy', item: item.id as 'coffee' | 'milktea' | 'snack' }) }}>购买</button>
          </article>
        })}
      </div>}
      {overlay === 'replay' && <><p>只重置低剂量CT开场的游标和实验记录，第一、二章与其他DLC不动。金币、累计属性和已获得勋章保留。</p><button className="mt-4" onClick={() => { update(s => initializeLdct(s, true)); close() }}>确认重玩本开场</button></>}
    </LdctModal>}
  </section>
}

function LdctDialogue({ state, blocked, renderText, onAdvance, onChoose, onGift, onRest }: {
  state: GameState; blocked: boolean; renderText: Props['renderText']; onAdvance: () => void; onChoose: (id:string)=>void;
  onGift:(person:LdctPerson, item:'milktea'|'snack')=>void;
  onRest:()=>void;
}) {
  const p = getLdctProgress(state)!, node = getLdctNode(state)
  const text = p.reply?.text ?? node.text
  const speaker = p.reply?.speaker ?? node.speaker
  const choices = p.reply ? [] : getLdctChoices(state)
  const gifts = p.reply ? [] : ldctGiftChoices(state)
  const [shown, setShown] = useState(0)
  const [ready, setReady] = useState(false)
  const plainLength = text.replaceAll('**', '').length
  const done = shown >= plainLength
  const gate = useRef({ until: 0 })
  const choiceGuard = useDialogueChoiceGuard(`ldct:${p.nodeId}:${p.reply ? 'reply' : 'main'}`, ready && !blocked)
  useEffect(() => {
    if (done) return
    const id = setInterval(() => setShown(n => Math.min(n + 1, plainLength)), 28)
    return () => clearInterval(id)
  }, [done, plainLength])
  useEffect(() => {
    if (!done) return
    const deadline = performance.now() + 900
    const unlock = () => { if (performance.now() >= deadline) setReady(true) }
    const id = setTimeout(unlock, 900)
    window.addEventListener('focus', unlock)
    document.addEventListener('visibilitychange', unlock)
    return () => { clearTimeout(id); window.removeEventListener('focus', unlock); document.removeEventListener('visibilitychange', unlock) }
  }, [done])
  const advance = () => {
    if (blocked || !acceptInput(gate.current, performance.now(), 300)) return
    if (!done) { setShown(plainLength); return }
    if (!choices.length && !gifts.length) onAdvance()
  }
  return <section className="ldct-dialogue dialog-box" data-ldct-dialogue data-choice-ready={ready}
    onPointerDownCapture={choiceGuard.pointerDown} onPointerCancelCapture={choiceGuard.cancel}
    onKeyDownCapture={choiceGuard.keyDown} onClickCapture={choiceGuard.click}>
    <div className="ldct-dialogue-scroll">
      {speaker && <p className="ldct-speaker">{speaker === 'me' ? state.gender === 'f' ? '林小满' : '陈一帆' : ({luzhou:'陆舟',lei:'小雷',he:'小何',director:'主任'} as Record<string,string>)[speaker] ?? speaker}</p>}
      <div className="ldct-text" role="button" tabIndex={0} aria-label="推进对话" onClick={advance} onKeyDown={e => {
        if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); advance() }
      }}>{renderText(text, shown)}{done && !choices.length && !gifts.length && <span className="ldct-arrow">▼</span>}</div>
      {done && <div className="ldct-choices">
        {choices.map((choice, i) => <button key={choice.id} data-dialogue-choice={i} data-ldct-choice={choice.id}
          aria-disabled={!ready} onClick={() => { if (choiceGuard.accept(i)) onChoose(choice.id) }}>{choice.text}</button>)}
        {gifts.map((gift, i) => <button key={gift.item} data-dialogue-choice={choices.length+i}
          aria-disabled={!ready} onClick={() => { if (choiceGuard.accept(choices.length+i)) onGift(gift.person, gift.item) }}>{gift.text}</button>)}
        {node.kind === 'hub' && !p.reply && !p.completed.includes('rest') && <button data-dialogue-choice={choices.length+gifts.length}
          aria-disabled={!ready} onClick={() => { if (choiceGuard.accept(choices.length+gifts.length)) onRest() }}>先靠着椅背歇几分钟</button>}
        {!choices.length && !!gifts.length && <button data-dialogue-choice={gifts.length} aria-disabled={!ready}
          onClick={() => { if (choiceGuard.accept(gifts.length)) onAdvance() }}>接着聊</button>}
      </div>}
    </div>
  </section>
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
  return <div className="ldct-overlay"><div ref={box} className="ldct-modal" role="dialog" aria-modal="true" aria-label={title}>
    <header><h2>{title}</h2><button onClick={onClose}>关闭 ×</button></header><div className="ldct-modal-content">{children}</div>
  </div></div>
}
