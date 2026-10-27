import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from 'react'
import { CHARACTERS, SHOP_ITEMS } from '../game/data'
import { condOk, playSfx } from '../game/store'
import type { GameState } from '../game/types'
import type { TrilogyChapter } from '../game/trilogy-types'
import { trilogyProgress, trilogyStep, trilogyAdvance, trilogyChoose, trilogyGive, trilogyCheckin,
  nextTrilogyShift, trilogyBuy, trilogyReadBook, answerTrilogyQuiz, nextTrilogyQuiz,
  finishTrilogyQuiz, issueTrilogyCertificate, restartTrilogy, trilogyCredential, trilogyShopItems, trilogyHeardCue,
  beginTrilogyScan, completeTrilogyScan, trilogyQuizContent } from '../game/trilogy-session'
import { trilogyVoice } from '../game/trilogy-audio'
import { imageAsset } from '../lib/image-assets'
import { assetUrl } from '../lib/chapter-assets'
import { useDialogueChoiceGuard } from '../hooks/use-dialogue-choice-guard'
import { DIALOGUE_CHARACTER_MS, waitForDialogueChoices } from '../game/dialogue-timing'
import { acceptInput } from '../game/input-gate'
import { createTrilogyDialogueClick, trilogyDialoguePresentationKey, trilogyTargetHasDialogue } from '../game/trilogy-dialogue-click'
import { DialogueStage, DialogueShade, DialogueHeader, DialoguePortrait, DialoguePanel, DialogueChoices, DialogueChoice } from './DialogueScene'
import { SceneBackground } from './SceneBackground'
import { FullscreenBtn } from './FullscreenButton'
import Ch2Checkin from './Ch2Checkin'
import { TrilogyLab } from './TrilogyLab'
import { TRILOGY_DOCUMENTS } from '../game/trilogy-documents'
import { TrilogyDocument } from './TrilogyDocument'
import { TRILOGY_COMMUNICATION_CUES } from '../game/trilogy-communications'
import { TRILOGY_EVIDENCE, TRILOGY_CASE_NAMES } from '../game/trilogy-evidence'
import { isTrilogyPlayable } from '../game/chapter-availability'
import { TrilogyScan } from './TrilogyScan'
import { LdctCinematic } from './LdctCinematic'
import { ch3ContactName, ch3NeedsSettlementChoice, ch3PurchaseButton } from './ch3-presentation'
import { Ch3Book } from './Ch3Book'
import { Ch3Settlement } from './Ch3Settlement'
import './TrilogyScreen.css'

type Overlay = 'shop' | 'book' | 'manual' | 'badges' | 'bag' | 'replay'
type Props = { state: GameState; chapter: TrilogyChapter; update: (fn: (s: GameState) => GameState) => void;
  onExit: () => void; renderText: (text: string, shown?: number) => ReactNode }
const BTN = 'min-h-10 rounded-lg border border-slate-600 bg-slate-800/90 px-3 py-2 text-sm text-slate-100 hover:border-teal-400'
const HEADER_BTN = 'text-xs text-slate-400 hover:text-teal-300 border border-slate-700 rounded px-2 py-0.5'
// Like Chapters 1/2, destination icons live in the choice wording. Unmarked
// replies get a neutral speech icon; icons never reveal rewards or correctness.
const ch3ChoiceLabel = (text: string) => /^\p{Extended_Pictographic}/u.test(text.trimStart()) ? text : `💬 ${text}`
const CH3_CHOICE_CLASS = 'shrink-0 disabled:opacity-60 disabled:cursor-not-allowed'

/** The same dialogue primitives, timing and pointer guard as Chapters 1 and 2. */
export function TrilogyScreen({ state, chapter, update, onExit, renderText }: Props) {
  const p = trilogyProgress(state, chapter.id)!
  const shift = chapter.shifts[p.shift], node = p.stepId, raw = trilogyStep(state, chapter)
  const [overlay, setOverlay] = useState<Overlay | null>(null)
  const [presentation, setPresentation] = useState(0)
  const [typing, setTyping] = useState({ scope: '', count: 0 })
  const [readyScope, setReadyScope] = useState('')
  const [badge, setBadge] = useState<string | null>(null)
  const [muted, setMuted] = useState(() => { try { return localStorage.getItem('mr-trilogy-muted') === '1' } catch { return false } })
  const pendingVoice = useRef<{ scope: string; play: () => void } | null>(null)
  const dialogueClick = useRef(createTrilogyDialogueClick(() => playSfx('click')))
  const known = useRef(new Set(state.badges)), nav = useRef({ until: 0 }), sounds = useRef(new Set<string>())
  const stage = useRef<HTMLDivElement>(null), dialog = useRef<HTMLDivElement>(null)
  const reply = p.giftReply
  const text = reply?.text ?? raw.text ?? ''
  const scope = trilogyDialoguePresentationKey({ chapter: chapter.id, runId: p.runId, node, phase: p.phase,
    presentation, overlay, speaker: reply?.person ?? raw.speaker ?? 'sys', replyPerson: reply?.person, text })
  const plain = text.replaceAll('**', '')
  const shown = typing.scope === scope ? typing.count : 0
  const done = shown >= plain.length
  const ready = readyScope === scope
  const changeOverlay = (next: Overlay | null) => { setPresentation(value => value + 1); setOverlay(next) }
  const checkin = p.phase === 'story' && node === (shift.checkinAt ?? shift.start) && !p.applied.includes(`checkin:${p.shift}`)
  const blocked = !!overlay || !!raw.tool || !!raw.scan || checkin || !['story', 'epilogue'].includes(p.phase)
  const choices = reply ? [] : (raw.choices ?? []).filter(c => condOk(state, c.cond ? { ...c.cond, ap: undefined } : undefined))
  const canGive = !!raw.giftTo && !reply && !blocked && !p.gifts.includes(`${p.shift}:${raw.giftTo}`)
  const giftItems = canGive ? (['milktea', 'snack'] as const).filter(item => state.items.includes(item)) : []
  const settlementChoice = ch3NeedsSettlementChoice(chapter.id, p.phase, raw.end, !!reply)
  const choiceGuard = useDialogueChoiceGuard(scope, ready && !blocked)
  useEffect(() => {
    const click = dialogueClick.current
    if (blocked || !plain.length) { click.cancel(); return }
    click.begin(scope, !muted && !document.hidden)
    const hide = () => { if (document.hidden) click.cancel() }
    document.addEventListener('visibilitychange', hide)
    return () => { document.removeEventListener('visibilitychange', hide); click.cancel() }
  }, [scope, blocked, plain.length, muted])
  useEffect(() => {
    if (blocked || done) return
    const started = performance.now()
    const tick = () => {
      const count = Math.min(plain.length, Math.floor((performance.now() - started) / DIALOGUE_CHARACTER_MS))
      setTyping(current => current.scope === scope && current.count >= count ? current : { scope, count })
    }
    const interval = window.setInterval(tick, DIALOGUE_CHARACTER_MS)
    return () => clearInterval(interval)
  }, [scope, plain.length, blocked, done])
  useEffect(() => {
    if (!done || blocked) return
    return waitForDialogueChoices(() => setReadyScope(scope))
  }, [done, blocked, scope])
  useEffect(() => {
    const target = dialog.current
    if (!target) return
    const measure = () => {
      const height = `${target.getBoundingClientRect().height}px`
      stage.current?.style.setProperty('--trilogy-dialog-height', height)
      stage.current?.style.setProperty('--ldct-dialog-height', height)
    }
    measure(); const observer = new ResizeObserver(measure); observer.observe(target)
    return () => observer.disconnect()
  }, [scope])
  useEffect(() => {
    const target = stage.current?.querySelector<HTMLElement>(':scope > .top-0')
    if (!target) return
    const measure = () => {
      const height = `${target.getBoundingClientRect().height}px`
      stage.current?.style.setProperty('--trilogy-header-height', height)
      stage.current?.style.setProperty('--ldct-header-height', height)
    }
    measure(); const observer = new ResizeObserver(measure); observer.observe(target)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    const fresh = state.badges.find(id => chapter.badges[id] && !known.current.has(id))
    state.badges.forEach(id => known.current.add(id))
    if (!fresh) return
    setBadge(fresh); if (!muted) void playSfx('badge')
    const timer = setTimeout(() => setBadge(null), 2800)
    return () => clearTimeout(timer)
  }, [state.badges, chapter, muted])
  useEffect(() => {
    if (raw.scan && !p.scans?.[node]) update(s => beginTrilogyScan(s, chapter, node))
  }, [node, raw.scan, p.scans, chapter, update])
  const playSceneCue = useEffectEvent(() => {
    if (muted || sounds.current.has(node)) return
    sounds.current.add(node)
    const cue = TRILOGY_COMMUNICATION_CUES[node]
    const audio: HTMLAudioElement[] = []
    let canceled = false
    if (cue) {
      if (!p.heardCues?.includes(node)) {
        update(s => trilogyHeardCue(s, chapter.id, node))
        const ring = new Audio(assetUrl(cue === 'call' ? 'audio/ch2_mobile_call_v1.mp3' : 'audio/ch2_mobile_message_v1.mp3'))
        audio.push(ring); ring.volume = .25; void ring.play().catch(() => {})
      }
    }
    const voiceId = trilogyVoice(chapter, raw)
    const voiceKey = `voice:${voiceId}`
    if (voiceId && !p.heardCues?.includes(voiceKey) && !p.heardCues?.includes(`voice:${node}`)) {
      const voiceScope = scope
      const voice = new Audio(assetUrl(`audio/${voiceId}.mp3`)); audio.push(voice); voice.volume = .42
      const play = () => {
        if (canceled || document.hidden) return
        void voice.play().then(() => {
          if (canceled) return
          pendingVoice.current = null; update(s => trilogyProgress(s, chapter.id)?.stepId === node ? trilogyHeardCue(s, chapter.id, voiceKey) : s)
        }, () => { if (!canceled) pendingVoice.current = { scope: voiceScope, play } })
      }
      play()
    } else if (raw.sfx) void playSfx(raw.sfx === 'vox_luzhou' ? `vox_luzhou_${state.gender}` : raw.sfx)
    return () => { canceled = true; pendingVoice.current = null; audio.forEach(sound => { sound.pause(); sound.src = '' }) }
  })
  useEffect(() => { if (!blocked) return playSceneCue() }, [node, blocked, muted])
  const advance = (now: number) => {
    if (blocked || !acceptInput(nav.current, now, 300)) return
    if (!done) {
      dialogueClick.current.gesture(scope, !muted && !document.hidden)
      if (!muted && !document.hidden && pendingVoice.current?.scope === scope) pendingVoice.current.play()
      setTyping({ scope, count: plain.length }); return
    }
    if (!choices.length && !giftItems.length && !settlementChoice) {
      if (!reply && (raw.end || !trilogyTargetHasDialogue(chapter, state, raw.next)) && !muted) void playSfx('click')
      update(s => trilogyAdvance(s, chapter, node))
    }
  }
  const choose = (index: number, now: number) => {
    if (!choiceGuard.accept(index) || !acceptInput(nav.current, now, 300)) return
    if (index < choices.length && ['@shop', '@book'].includes(choices[index].next)) {
      if (!muted) void playSfx('click')
      changeOverlay(choices[index].next === '@shop' ? 'shop' : 'book')
      if (choices[index].next === '@book') update(s => trilogyReadBook(s, chapter))
    }
    else if (index < choices.length) {
      const choice = choices[index]
      if (!condOk(state, choice.cond)) return
      const flags = choice.effect?.flag ? { ...state.flags, [choice.effect.flag]: true } : state.flags
      if (!trilogyTargetHasDialogue(chapter, { flags }, choice.next)
          && (!choice.risk || !trilogyTargetHasDialogue(chapter, { flags }, choice.risk.next)) && !muted) void playSfx('click')
      update(s => trilogyChoose(s, chapter, node, choice))
    }
    else if (index < choices.length + giftItems.length) update(s => trilogyGive(s, chapter, node, giftItems[index - choices.length]))
    else {
      if (settlementChoice && !muted) void playSfx('click')
      update(s => trilogyAdvance(s, chapter, node))
    }
  }
  const speakerKey = reply?.person ?? raw.speaker ?? 'sys'
  const character = chapter.characters[speakerKey] ?? CHARACTERS[speakerKey]
  const person = speakerKey === 'me' && character ? { ...character, name: state.gender === 'f' ? '林小满' : '陈一帆' } : character
  const sprite = reply ? chapter.characters[reply.person]?.sprite : raw.phone || raw.radio ? undefined
    : raw.sprite ?? (speakerKey !== 'sys' && speakerKey !== 'me' ? chapter.characters[speakerKey]?.sprite : undefined)
  const phoneSprite = raw.phone
  const contactName = chapter.id === 'ch3' ? ch3ContactName(chapter, raw) : person?.name || '手机消息'
  const savedBackground = raw.bg ?? p.viewBg ?? shift.background
  const background = savedBackground === 'bg_mri_room' ? 'bg_mri_room_day_v2'
    : savedBackground === 'bg_mri_corridor' ? 'bg_mri_corridor_day_v2' : savedBackground
  const objectImage = chapter.id === 'ch3' && raw.imageKind === 'object'
  const optionsVisible = done && (choices.length + giftItems.length > 0 || settlementChoice)
  return <DialogueStage ref={stage} className="trilogy-root" data-trilogy={chapter.id} data-trilogy-node={node} data-trilogy-phase={p.phase}
    onPointerDownCapture={choiceGuard.pointerDown} onPointerCancelCapture={choiceGuard.cancel}
    onKeyDownCapture={choiceGuard.keyDown} onClickCapture={choiceGuard.click} onClick={event => advance(event.timeStamp)}>
    <SceneBackground name={background} /><DialogueShade />
    <DialogueHeader title={`${chapter.icon} 第${chapter.id.slice(2)}章 · ${chapter.title} · ${p.phase === 'epilogue' ? '尾声' : shift.title}`}>
      <span>💰 {state.gold}</span><span className={state.ap > 0 ? 'text-sky-300' : 'text-slate-600'}>⚡×{state.ap}</span>
      <button className={HEADER_BTN} onClick={e => { e.stopPropagation(); changeOverlay('manual') }}>📖 手册</button>
      <button className={HEADER_BTN} onClick={e => { e.stopPropagation(); changeOverlay('badges') }}>🏅 勋章</button>
      <button className={HEADER_BTN} onClick={e => { e.stopPropagation(); changeOverlay('book'); update(s => trilogyReadBook(s, chapter)) }}>📚 旧书</button>
      <button className={HEADER_BTN} onClick={e => { e.stopPropagation(); const value = !muted; setMuted(value); try { localStorage.setItem('mr-trilogy-muted', value ? '1' : '0') } catch { /* Session-only preference remains usable. */ } }}>{muted ? '🔇 声音关' : '🔊 声音开'}</button>
      <FullscreenBtn /><button className={HEADER_BTN} title="进度已自动保存，可随时离开" onClick={e => { e.stopPropagation(); onExit() }}>💾 回大厅</button>
    </DialogueHeader>
    {['story', 'epilogue'].includes(p.phase) && <>
      {raw.image && !raw.tool && !raw.scan && (raw.closeup
        ? <LdctCinematic key={node} scene={{ id: node, image: raw.image, alt: raw.imageLabel ?? '剧情特写', motion: raw.cameraMotion ?? 'push' }} />
        : <div className={objectImage ? 'trilogy-story-object' : 'trilogy-story-image'} data-two-portraits={objectImage && !!sprite && !!raw.sprite2 || undefined}>{TRILOGY_DOCUMENTS[raw.image] ? <TrilogyDocument id={raw.image} /> : <img src={imageAsset(raw.image)} alt={raw.imageLabel ?? (objectImage ? '物品' : '剧情图像')} className="pixel" />}{raw.imageLabel && <span>{raw.imageLabel}</span>}</div>)}
      {sprite && !raw.closeup && <DialoguePortrait className="pointer-events-none" src={imageAsset(sprite === 'me' ? `char_${state.gender}` : sprite)} alt={person?.name ?? '人物'} />}
      {raw.sprite2 && !raw.closeup && <DialoguePortrait className="pointer-events-none" side="right" src={imageAsset(raw.sprite2)} alt="同场人物" />}
      {(raw.communication || phoneSprite) && <div className="trilogy-communication absolute top-12 right-4 portrait:top-[4.5rem] portrait:right-2 portrait:px-2 portrait:py-1 portrait:gap-2 z-30 flex items-center gap-3 bg-slate-900/90 border-2 border-emerald-600 rounded-xl px-3 py-2 shadow-2xl">
        <div className="portrait:w-10 portrait:h-10 w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden border-2 border-emerald-400 bg-slate-800 shrink-0 flex items-center justify-center">
          {phoneSprite ? <img src={imageAsset(phoneSprite)} className="w-full h-full object-cover object-top pixel" alt="来电头像" /> : <span className="text-2xl">{raw.communication === 'sms' ? '📩' : '☎️'}</span>}
        </div>
        <div className="text-left"><p className="text-emerald-300 text-xs md:text-sm tracking-widest animate-pulse">{raw.communication === 'sms' ? '📩 短信' : '📞 通话中'}</p><p className="text-slate-400 text-xs">{contactName}</p></div>
      </div>}
      {!raw.tool && !raw.scan && !checkin && <DialoguePanel dialogRef={dialog} speaker={person} textKey={scope} text={renderText(text, shown)} arrow={done && !optionsVisible}>
        {optionsVisible && <DialogueChoices>{choices.map((choice, index) => <DialogueChoice key={`${choice.next}:${index}`} data-dialogue-choice={String(index)}
          className={chapter.id === 'ch3' ? CH3_CHOICE_CLASS : ''}
          disabled={!condOk(state, choice.cond)} aria-disabled={!ready || !condOk(state, choice.cond)} onClick={event => choose(index, event.timeStamp)}>{renderText(chapter.id === 'ch3' ? ch3ChoiceLabel(choice.text) : choice.text)}</DialogueChoice>)}
          {giftItems.map((item, index) => <DialogueChoice key={item} className={chapter.id === 'ch3' ? CH3_CHOICE_CLASS : ''} data-dialogue-choice={String(choices.length + index)} aria-disabled={!ready}
            onClick={event => choose(choices.length + index, event.timeStamp)}>{item === 'milktea' ? '🧋 把奶茶递过去' : '🍪 拆开零食一起吃'}</DialogueChoice>)}
          {giftItems.length > 0 && !choices.length && !settlementChoice && <DialogueChoice className={chapter.id === 'ch3' ? CH3_CHOICE_CLASS : ''} data-dialogue-choice={String(giftItems.length)} aria-disabled={!ready} onClick={event => choose(giftItems.length, event.timeStamp)}>{chapter.id === 'ch3' ? '💬 继续交谈 →' : '接着聊 →'}</DialogueChoice>}
          {settlementChoice && <button data-trilogy-settle data-dialogue-choice={String(choices.length + giftItems.length)} aria-disabled={!ready}
            className="w-full shrink-0 rounded-lg bg-teal-500/90 py-3 font-bold tracking-widest text-slate-950 hover:bg-teal-400 transition-all"
            onClick={event => choose(choices.length + giftItems.length, event.timeStamp)}>🌅 本班结束 · 结算 →</button>}
        </DialogueChoices>}
        {optionsVisible && choices.some(choice => !condOk(state, choice.cond)) && <small className="block mt-2 text-amber-200">行动力不足，可以先去小卖部喝杯咖啡。</small>}
        {chapter.id !== 'ch3' && /hub$/.test(node) && done && <button className="mt-2 text-xs text-amber-200" onClick={e => { e.stopPropagation(); changeOverlay('shop') }}>🛒 去小卖部 · 咖啡可补行动力</button>}
      </DialoguePanel>}
      {raw.tool && !checkin && <TrilogyLab state={state} chapter={chapter} tool={raw.tool} update={update} />}
      {raw.scan && p.scans?.[node] && <TrilogyScan key={`${p.runId}:${node}`} scan={raw.scan} node={node} startedAt={p.scans[node].startedAt}
        muted={muted} onDone={() => update(s => completeTrilogyScan(s, chapter, node))} />}
      {checkin && <Ch2Checkin title={`${shift.date} · ${shift.title}`} rewardText="打卡上岗 · 金币＋50" onComplete={() => { if (!muted) void playSfx('stamp'); update(s => trilogyCheckin(s, chapter)) }} />}
    </>}
    {(p.phase === 'settle' || p.phase === 'done') && <TrilogySettlement state={state} chapter={chapter} update={update}
      onNext={() => update(s => nextTrilogyShift(s, chapter))} onOverlay={changeOverlay} onExit={onExit} />}
    {p.phase === 'quiz' && <TrilogyQuiz state={state} chapter={chapter} update={update} />}
    {badge && <div className="trilogy-award pointer-events-none"><span>{chapter.badges[badge].icon}</span><strong>{chapter.badges[badge].name}</strong><small>勋章已收好</small></div>}
    {overlay && <TrilogyOverlay overlay={overlay} state={state} chapter={chapter} update={update} close={() => changeOverlay(null)} renderText={renderText} />}
  </DialogueStage>
}

function TrilogySettlement({ state, chapter, update, onNext, onOverlay, onExit }: Omit<Props, 'renderText'> & {
  onNext: () => void; onOverlay: (overlay: Overlay) => void }) {
  const p = trilogyProgress(state, chapter.id)!, base = p.snapshots[String(p.shift)]
  if (chapter.id === 'ch3') return <Ch3Settlement state={state} chapter={chapter} progress={p} itemName={id => itemName(id, chapter)}
    certificate={<TrilogyCertificate state={state} chapter={chapter} update={update} />} onNext={onNext} onExit={onExit}
    onOverlay={overlay => { onOverlay(overlay); if (overlay === 'book') update(s => trilogyReadBook(s, chapter)) }} />
  const names = { gold: '💰 科室存款', skill: '🩺 医术', heart: '🧡 人心', wealth: '🏠 家业' }
  return <main className="trilogy-settlement" onClick={e => e.stopPropagation()}>
    <p className="text-teal-200 tracking-widest">第{chapter.id.slice(2)}章 · {chapter.title}</p>
    <h1>{p.done ? '这一班，交给你了' : `${chapter.shifts[p.shift].title} · 班后经营`}</h1>
    <p className="text-slate-300 text-sm">{p.done ? '晨会与尾声已完成，领取凭证，或再看看留下的东西。' : '进度已保存。先歇一会儿，下一班等你亲自开始。'}</p>
    <div className="trilogy-stats">{(Object.keys(names) as (keyof typeof names)[]).map(key => <section key={key}><small>{names[key]}</small><strong>{state[key]}{key === 'gold' ? ' 金币' : ' 点'}</strong>
      <span className={state[key] > (base?.[key] ?? state[key]) ? 'text-teal-300' : 'text-slate-400'}>本班 {state[key] - (base?.[key] ?? state[key]) > 0 ? '+' : ''}{state[key] - (base?.[key] ?? state[key])}</span></section>)}
      <section><small>📅 值班日志</small><strong>{p.shift + 1} / 5 班</strong><span>晨会另行记入</span></section><section><small>设备交接</small><strong className="text-teal-200">交班待机</strong><span>{chapter.equipment}</span></section></div>
    <section className="trilogy-panel"><h3 className="text-amber-200">设备间 · {chapter.equipment}</h3><p>图像与记录已交接，设备运行按本科室安排，不新增耐久或维修费用。</p>
      <div className="my-3 border-y border-slate-600 py-3 text-sm">🎒 {state.items.length ? state.items.map(id => itemName(id, chapter)).join('、') : '背包暂时空着'}<button className={`${BTN} ml-2`} onClick={() => onOverlay('bag')}>查看用途</button></div>
      <ul className="space-y-2 text-sm"><li>🔓 老伙计 · 第一章 · CR / X光</li><li>🔓 快与狠 · 第二章 · CT</li><li>🔓 回声 · 第三章 · 超声</li><li>{isTrilogyPlayable('ch4') ? '🔓' : '🔒'} 共振 · 第四章 · MRI · {isTrilogyPlayable('ch4') ? '可从大厅进入' : '尚未开放'}</li><li>{isTrilogyPlayable('ch5') ? '🔓' : '🔒'} 微光 · 第五章 · PET/CT · {isTrilogyPlayable('ch5') ? '可从大厅进入' : '尚未开放'}</li><li>🔓 DR / DSA / 低剂量CT · 番外篇 · 可从大厅进入</li></ul>
    </section>
    {p.done && <TrilogyCertificate state={state} chapter={chapter} update={update} />}
    <div className="trilogy-bottom-menu">{!p.done && <button className="trilogy-primary" data-trilogy-next-shift onClick={onNext}>{p.shift === 4 ? '前往晨会 →' : '进入下一班 →'}</button>}
      <button className={BTN} onClick={() => onOverlay('shop')}>🛒 小卖部</button><button className={BTN} onClick={() => onOverlay('manual')}>📖 手册</button>
      <button className={BTN} onClick={() => onOverlay('badges')}>🏅 勋章墙</button><button className={BTN} onClick={() => { onOverlay('book'); update(s => trilogyReadBook(s, chapter)) }}>📚 旧书</button>
      {p.done && <button className={BTN} onClick={() => onOverlay('replay')}>重玩本章</button>}<button className={BTN} onClick={onExit}>💾 回大厅</button></div>
  </main>
}

function TrilogyQuiz({ state, chapter, update }: Omit<Props, 'onExit' | 'renderText'>) {
  const p = trilogyProgress(state, chapter.id)!, quiz = p.quiz!, row = quiz.questions[quiz.index]
  const content = trilogyQuizContent(state, chapter), question = content[row.question]
  const gate = useRef({ until: 0 })
  const [readyScope, setReadyScope] = useState('')
  const scope = `${chapter.id}:quiz:${quiz.index}:${row.selected ?? 'open'}`
  const ready = readyScope === scope
  useEffect(() => waitForDialogueChoices(() => setReadyScope(scope)), [scope])
  const guard = useDialogueChoiceGuard(scope, ready)
  const act = (f: (s: GameState) => GameState, now: number) => { if (acceptInput(gate.current, now, 500)) update(f) }
  const score = quiz.questions.filter(r => r.selected === content[r.question].answer).length
  return <section className="trilogy-quiz" onClick={e => e.stopPropagation()} onPointerDownCapture={guard.pointerDown} onKeyDownCapture={guard.keyDown} onClickCapture={guard.click}>
    <div className="trilogy-panel"><h2>{quiz.completed ? `晨会结束 · ${quiz.grade}级` : `晨会 · ${quiz.index + 1} / 5`}</h2>
      {quiz.completed ? <><p>答对 {score} / 5。{chapter.id === 'ch3' ? '本次成绩已保存。' : '奖励与结果已保存，接下来还有尾声。'}</p><button className="trilogy-primary" data-trilogy-quiz-finish onClick={event => act(s => finishTrilogyQuiz(s, chapter), event.timeStamp)}>{chapter.id === 'ch3' ? '结束晨会 →' : '收好记录，回去看看 →'}</button></>
        : <><p className="text-lg my-4">{question.q}</p><div className="flex flex-col gap-2">{row.order.map((answer, i) => <DialogueChoice key={answer} data-dialogue-choice={String(i)} disabled={row.selected !== undefined}
          onClick={event => { if (guard.accept(i)) act(s => answerTrilogyQuiz(s, chapter, answer), event.timeStamp) }}>{question.options[answer]}</DialogueChoice>)}</div>
          {row.selected !== undefined && <div className="mt-4"><p className={row.selected === question.answer ? 'text-teal-200' : 'text-amber-200'}>{question.explain}</p>
            <button data-trilogy-quiz-next className={`${BTN} mt-3`} onClick={event => act(s => nextTrilogyQuiz(s, chapter), event.timeStamp)}>{quiz.index === 4 ? chapter.id === 'ch3' ? '查看成绩' : '收好成绩' : '下一题 →'}</button></div>}</>}
    </div>
  </section>
}

const itemName = (id: string, chapter?: TrilogyChapter) => (chapter?.id === 'ch3' ? chapter.shopItems?.find(item => item.id === id)?.name : undefined) ?? SHOP_ITEMS.find(item => item.id === id)?.name ?? ({
  c3_mei_probe_card: '梅姐的探头选择小卡', c3_aunt_cloth: '阿姨送的擦镜布', c3_lei_label_roll: chapter?.id === 'ch3' ? '小雷送的标签纸' : '小雷的线号标签', c3_missing_copy: '寻人启事副本',
  c4_gift_coaster: '许宁的分机杯垫', c5_zhou_note: '老周的交接便笺', c5_qian_seeds: '老钱的菜种', c5_pet_bookmark: '顾老师的进修书签',
  c3_pocket_towel: '随身小方巾', c3_cup_stickers: '水果杯贴', c4_sleep_mask: '午休眼罩', c4_postcard: '欢迎小卡片',
  c5_postcard: '市院银杏明信片', c5_seed_pot: '育苗小盆',
}[id] ?? id)
const CH3_ITEM_USES: Record<string, string> = {
  c3_pocket_towel: '开诊前有空时，可以用来收拾窗边的桌面。',
  c3_cup_stickers: '开诊前有空时，可以给休息室的杯子贴上名字。',
  c3_mei_probe_card: '梅姐写的探头选择小卡，留着查阅。',
  c3_aunt_cloth: '阿姨送的擦镜布，用来擦自己的眼镜。',
  c3_lei_label_roll: '小雷送来的标签纸，用来标注物品和开封日期。',
  c3_missing_copy: '许建平托你保管的复印件，用来核对他的查询请求。',
}
const CH3_SHOP_DESCRIPTIONS: Record<string, string> = {
  coffee: '休息时提提神，行动力＋1。',
  milktea: '购买时人心＋2；闲聊时可以送给同事。',
  lottery: '本班最多买五张，输赢看运气。',
}
function TrilogyOverlay({ overlay, state, chapter, update, close, renderText }: Omit<Props, 'onExit'> & { overlay: Overlay; close: () => void }) {
  const p = trilogyProgress(state, chapter.id)!, gate = useRef({ until: 0 })
  if (chapter.id === 'ch3' && overlay === 'book') return <Ch3Book chapter={chapter} shift={p.shift} renderText={renderText} onClose={close} />
  const titles: Record<Overlay, string> = { shop: '小卖部', book: '值班室旧书', manual: '夜班手册', badges: '勋章墙', bag: '背包与用途', replay: '重玩本章' }
  return <div className="trilogy-modal" onClick={e => e.stopPropagation()}><section className="trilogy-modal-sheet">
    <header><h2>{titles[overlay]}</h2><button className={BTN} data-trilogy-close-overlay onClick={close}>关闭 ×</button></header>
    {overlay === 'shop' && <><p className="text-sm text-slate-300">金币 {state.gold} · {chapter.id === 'ch3' ? '奶茶、零食可以送同事。咖啡在探索时补行动力，班后购买留到下一班。' : '消耗品在同事在场时送出。咖啡在探索时补行动力，班后购买留给下一班。'}</p>
      {trilogyShopItems(chapter, state).map(item => {
        const offer = chapter.id === 'ch3' ? ch3PurchaseButton(state, p, item) : undefined
        return <div key={item.id} className="trilogy-shop-row"><img src={imageAsset(item.image!)} alt="" className="pixel" /><div><strong>{item.name}</strong><p>{chapter.id === 'ch3' && CH3_SHOP_DESCRIPTIONS[item.id] ? CH3_SHOP_DESCRIPTIONS[item.id] : item.id === 'toolbox' ? '可用于固定非医疗设备的松动部件，剧情中有用途。' : item.id === 'dosimeter' ? '个人职业受照监测；并非测量患者检查剂量。' : item.desc}</p>{offer?.reason && <p className="text-amber-200">{offer.reason}</p>}</div>
          <button data-trilogy-buy={item.id} className={BTN} disabled={offer?.disabled ?? (state.gold < item.price || !['coffee', 'lottery'].includes(item.id) && state.items.includes(item.id)
            || item.id === 'lottery' && p.shop.lotteryCount >= 5 || ['quiz', 'epilogue', 'done'].includes(p.phase) && ['coffee', 'milktea', 'snack'].includes(item.id))}
            onClick={() => { if (acceptInput(gate.current, performance.now(), 500)) update(s => trilogyBuy(s, chapter, item.id)) }}>{offer?.label ?? (state.items.includes(item.id) ? '已持有' : `${item.price} 金币`)}</button></div>
      })}
      <small>刮刮乐本班 {p.shop.lotteryCount} / 5 张；刷新不会重置。</small></>}
    {overlay === 'book' && <><p>按班次开放 · {Math.min(20, (p.shift + 1) * 4)} / {chapter.book.length} 页</p>{chapter.book.slice(0, (p.shift + 1) * 4).map((page, i) => <details key={page.title} className="trilogy-book-page"><summary>第{i + 1}页 · {page.title}</summary><p>{renderText(page.body)}</p></details>)}</>}
    {overlay === 'manual' && <><p>已解锁 {Object.keys(chapter.cards).filter(id => state.cards?.includes(id)).length} / {Object.keys(chapter.cards).length} 张</p>
      {Object.entries(chapter.cards).filter(([id]) => state.cards?.includes(id)).map(([id, card]) => <article className="trilogy-book-page" key={id}><h3>{card.title}</h3>{card.image && (TRILOGY_DOCUMENTS[card.image] ? <TrilogyDocument id={card.image} /> : <img src={imageAsset(card.image)} alt="" className="max-h-40 mx-auto pixel" />)}<p>{renderText(card.body)}</p></article>)}
      <h3 className="mt-4 text-sky-200">证物与线索回看</h3>{TRILOGY_EVIDENCE[chapter.id].filter(row => state.flags[row.flag]).map(row => <details className="trilogy-book-page" key={row.flag}><summary>{row.title}</summary>{row.image && <TrilogyDocument id={row.image} />}<p>{row.body}</p></details>)}
      <details className="trilogy-book-page"><summary>大事记 · 本章已经走过的片段</summary><p>{p.visited.filter(id => chapter.steps[id].caseId).map(id => chapter.steps[id].caseId!).filter((value, i, rows) => rows.indexOf(value) === i).map(id => TRILOGY_CASE_NAMES[id] ?? id).join(' · ') || '病例记录随剧情解锁。'}</p></details></>}
    {overlay === 'badges' && <div className="trilogy-badge-grid">{Object.entries(chapter.badges).map(([id, badge]) => <section key={id} className={`trilogy-panel ${state.badges.includes(id) ? '' : 'opacity-40'}`}><span className="text-3xl">{badge.icon}</span><h3>{badge.name}</h3><p>{badge.desc}</p><small>{state.badges.includes(id) ? '已获得' : '尚未获得'}</small></section>)}</div>}
    {overlay === 'bag' && <><p>{chapter.id === 'ch3' ? '遇到同事时，可以在闲聊中递奶茶或分享零食。' : '礼物只在同事在场的闲聊选项中使用，不在班后统一赠送。'}</p>{state.items.map(id => {
      const image = chapter.id === 'ch3' ? chapter.itemImages?.[id] ?? SHOP_ITEMS.find(item => item.id === id)?.image : undefined
      const content = <>🎒 {itemName(id, chapter)}<br /><small>{id === 'milktea' ? '递给在场同事；购买时人心＋2，送出不重复加。' : id === 'snack' ? '拆开分享，人心＋1。' : id === 'dosimeter' ? '工作人员个人受照监测，不测患者剂量。' : id === 'toolbox' ? chapter.id === 'ch3' ? '工具箱已收好，这次轮转暂时用不上。' : '保留给非医疗设备小修或教学展示，不拆修扫描仪。' : chapter.id === 'ch3' ? CH3_ITEM_USES[id] ?? '已收在背包中。' : '留存物品可在相应剧情中回响。'}</small></>
      return image ? <div className="trilogy-book-page flex items-center gap-3" key={id}><img src={imageAsset(image)} alt="" className="h-16 w-16 shrink-0 object-contain pixel" /><p className="min-w-0 flex-1">{content}</p></div>
        : <p className="trilogy-book-page" key={id}>{content}</p>
    })}</>}
    {overlay === 'replay' && <><p>只重开本章剧情、探索、考核和凭证，第一二章及其他章进度不动，累计属性和既得勋章保留。</p><button className="trilogy-primary" onClick={() => { const runId = `${chapter.id}-${Date.now()}`; update(s => restartTrilogy(s, chapter, runId)); close() }}>确认重玩本章</button></>}
  </section></div>
}

function TrilogyCertificate({ state, chapter, update }: Omit<Props, 'onExit' | 'renderText'>) {
  const certificate = trilogyProgress(state, chapter.id)?.certificate
  const [name, setName] = useState(state.playerName ?? ''), [sid, setSid] = useState(state.playerId ?? '')
  return certificate ? <section data-trilogy-certificate className="trilogy-certificate"><img src={imageAsset('stamp')} alt="通关盖章" className="pixel" /><h3>深夜影像科 · 第{chapter.id.slice(2)}章通关凭证</h3>
    <h2>{chapter.title}</h2><strong>{certificate.name}</strong><p>学号 {certificate.studentId}</p><p>五班、晨会与尾声已完成 · {certificate.grade}级</p><p>盖章时 {certificate.gold}金币 · {certificate.badgeCount}枚本章勋章</p><code>{certificate.code}</code><small>截图提交；凭证保留盖章时的记录。</small></section>
    : <section className="trilogy-panel"><h3>📜 领取本章通关凭证</h3><form className="grid gap-2" onSubmit={e => { e.preventDefault(); update(s => issueTrilogyCertificate(s, chapter, name, sid)); void playSfx('stamp') }}>
      <label>姓名<input aria-label="姓名" value={name} maxLength={32} required onChange={e => setName(e.target.value)} /></label>
      <label>学号<input aria-label="学号" value={sid} maxLength={64} required onChange={e => setSid(e.target.value)} /></label>
      <button className="trilogy-primary" type="submit" disabled={!name.trim() || !sid.trim()}>盖章发证</button></form></section>
}

export function TrilogyVerify() {
  const [id, setId] = useState<'ch3' | 'ch4' | 'ch5'>('ch3')
  const [fields, setFields] = useState({ name: '', studentId: '', grade: 'S', gold: '', badgeCount: '', code: '' })
  const [result, setResult] = useState<string>('')
  return <section className="trilogy-panel"><h3>第三至五章 · 凭证校验</h3><select aria-label="选择章节" value={id} onChange={e => { setId(e.target.value as typeof id); setResult('') }}><option value="ch3">回声</option><option value="ch4">共振</option><option value="ch5">微光</option></select>
    <form className="grid gap-2 mt-3" onSubmit={e => { e.preventDefault(); const valid = /^\d+$/.test(fields.gold) && /^\d+$/.test(fields.badgeCount)
      && !!fields.name.trim() && !!fields.studentId.trim() && trilogyCredential(id, { ...fields, gold: Number(fields.gold), badgeCount: Number(fields.badgeCount) }) === fields.code.trim().toUpperCase(); setResult(valid ? '校验通过' : '校验失败，请核对凭证字段与章节。') }}>
      {(['name', 'studentId', 'gold', 'badgeCount', 'code'] as const).map(key => <input key={key} aria-label={key} placeholder={({ name: '姓名', studentId: '学号', gold: '金币', badgeCount: '勋章数', code: 'YSK3/4/5 通关码' })[key]} value={fields[key]} onChange={e => setFields({ ...fields, [key]: e.target.value })} />)}
      <select aria-label="评级" value={fields.grade} onChange={e => setFields({ ...fields, grade: e.target.value })}>{['S', 'A', 'B', 'C'].map(g => <option key={g}>{g}</option>)}</select><button className={BTN}>校验</button><p aria-live="polite">{result}</p></form></section>
}
