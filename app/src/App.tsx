import { useEffect, useRef, useState } from 'react'
import { NIGHTS, BADGES, CHARACTERS, SHOP_ITEMS, QUIZ, BOOK_PAGES } from './game/data'
import { DLCS, getDlc, DLC_BADGES, CARDS, EVENTS, EVIDENCE, DR_QUEUE, queueWaits } from './game/dlc'
import { CH2_META, CH2_SHIFTS, CH2_BADGES, CH2_CARDS, CH2_BOOK_PAGES, CH2_IMAGE_CAPTIONS, QUIZ2, grayToHU, ch2Unlocked, tryUnlockCh2, ch2BookUnlocked, ch2PortraitAsset } from './game/ch2'
import type { DlcDef, QueuePatient } from './game/dlc'
import type { GameState, Step, ShopItem, Choice, DlcProgress } from './game/types'
import { freshState, loadState, saveState, wipeSave, applyEffect, condOk, dailyCheckin, meterLevel, playSfx, makeCredCode, verifyCredCode } from './game/store'

type Screen = 'title' | 'select' | 'checkin' | 'night' | 'day' | 'badges' | 'quiz' | 'epilogue' | 'chapterEnd' | 'verify' | 'dlcHall' | 'dlc' | 'ch2'

const IMG = (n: string) => `${import.meta.env.BASE_URL}assets/${n}.png`
const LAST_NIGHT = NIGHTS.length

// 预加载全部素材，避免剧情推进时图片即需加载造成闪屏
const ALL_ASSETS = [
  'bg_archive', 'bg_breakroom', 'bg_control', 'bg_corridor', 'bg_day', 'bg_title', 'bg_xrayroom',
  'char_bai', 'char_f', 'char_fan', 'char_he', 'char_kai', 'char_lei', 'char_m', 'char_qian', 'char_tang', 'char_wen', 'char_zhou',
  'pat_aunt', 'pat_child', 'pat_dad', 'pat_mystery', 'pat_oldman', 'pat_regular', 'pat_thin', 'pat_trauma', 'pat_worker',
  'machine_mammo', 'machine_mobile', 'machine_reader', 'item_film', 'item_photo', 'char_jiang',
  'item_tea', 'item_apple', 'item_glasses', 'item_notebook', 'item_screen', 'char_director', 'bg_morning', 'img_teaser',
  'xray_battery', 'xray_coin', 'xray_fog', 'xray_fracture', 'xray_ghost', 'xray_normal', 'xray_pneumo', 'stamp',
  // DLC 番外篇素材
  'bg_drroom', 'bg_waiting', 'bg_cathlab', 'char_shao', 'char_du', 'char_qin', 'char_liao', 'pat_ge',
  'img_dsa_normal', 'img_dsa_stenosis', 'img_dsa_stent',
]
let assetsPreloaded = false
function preloadAssets() {
  if (assetsPreloaded) return
  assetsPreloaded = true
  for (const n of ALL_ASSETS) { const img = new Image(); img.src = IMG(n) }
}

export default function App() {
  // 移动端 100vh 陷阱根治：实测 window.innerHeight 写入 --apph，地址栏伸缩/旋转/键盘弹出都实时跟随
  useEffect(() => {
    const setH = () => document.documentElement.style.setProperty('--apph', `${window.innerHeight}px`)
    setH()
    window.addEventListener('resize', setH)
    window.addEventListener('orientationchange', setH)
    window.visualViewport?.addEventListener('resize', setH)
    return () => {
      window.removeEventListener('resize', setH)
      window.removeEventListener('orientationchange', setH)
      window.visualViewport?.removeEventListener('resize', setH)
    }
  }, [])
  const [screen, setScreen] = useState<Screen>('title')
  const [state, setState] = useState<GameState | null>(null)
  const [checkinReward, setCheckinReward] = useState(0)
  const [dlcId, setDlcId] = useState<string | null>(null)
  useEffect(preloadAssets, [])

  // 隐藏入口（教师验证入口右侧的 ▪）：#/dlc 或 #/hall → 内容大厅；#/dlc/dr、#/dlc/dsa 直达对应 DLC；#/ch2 直达第二章
  useEffect(() => {
    const applyHash = () => {
      const h = window.location.hash
      if (h.startsWith('#/ch2')) {
        const s = loadState()
        if (s) setState(s)
        // 第二章口令解锁：任何入口（大厅卡片/直达链接）都先过口令，与第一章进度无关
        if (s && ch2Unlocked()) setScreen('ch2')
        else setScreen('dlcHall')
        return
      }
      if (h.startsWith('#/hall')) { const s = loadState(); if (s) setState(s); setScreen('dlcHall'); return }
      if (!h.startsWith('#/dlc')) return
      const id = h.split('/')[2] ?? ''
      const s = loadState()
      if (s) setState(s)
      if (s && id && getDlc(id)) { setDlcId(id); setScreen('dlc') }
      else setScreen('dlcHall')
    }
    applyHash()
    window.addEventListener('hashchange', applyHash)
    return () => window.removeEventListener('hashchange', applyHash)
  }, [])

  const enterDlc = (id: string, s: GameState) => {
    saveState(s)
    setState(s)
    setDlcId(id)
    window.location.hash = `#/dlc/${id}`
    setScreen('dlc')
  }

  const enterCh2 = (s: GameState) => {
    saveState(s)
    setState(s)
    window.location.hash = '#/ch2'
    setScreen('ch2')
  }

  const update = (fn: (s: GameState) => GameState) => {
    setState(prev => {
      if (!prev) return prev
      const next = fn(prev)
      saveState(next)
      return next
    })
  }

  // 勋章弹窗：全局监听 badges 差分——剧情中、结算时、考核后获得的勋章都会即时弹出
  const [badgePop, setBadgePop] = useState<string[]>([])
  const knownBadges = useRef<Set<string> | null>(null)
  useEffect(() => {
    if (!state) return
    if (knownBadges.current === null) { knownBadges.current = new Set(state.badges); return }
    const fresh = state.badges.filter(b => !knownBadges.current!.has(b))
    if (fresh.length === 0) return
    fresh.forEach(b => knownBadges.current!.add(b))
    setBadgePop(fresh)
    playSfx('badge')
  }, [state])
  // 弹窗自动消失：独立 effect 挂在弹窗内容本身上——state 每步都变，若计时器放在上面的 effect 里会被反复清理，导致弹窗永久挂住
  useEffect(() => {
    if (badgePop.length === 0) return
    const t = setTimeout(() => setBadgePop([]), 2800)
    return () => clearTimeout(t)
  }, [badgePop])

  // 知识卡片 toast：全局监听 cards 差分（NightScreen 每步重挂载，局部 state 存不住 toast，必须放在 App 层）
  const [cardToast, setCardToast] = useState<string | null>(null)
  const knownCards = useRef<Set<string> | null>(null)
  useEffect(() => {
    if (!state) return
    const cards = state.cards ?? []
    if (knownCards.current === null) { knownCards.current = new Set(cards); return }
    const fresh = cards.filter(c => !knownCards.current!.has(c))
    if (fresh.length === 0) return
    fresh.forEach(c => knownCards.current!.add(c))
    const title = CARDS[fresh[fresh.length - 1]]?.title
    if (title) setCardToast(title)
  }, [state])
  useEffect(() => {
    if (!cardToast) return
    const t = setTimeout(() => setCardToast(null), 2600)
    return () => clearTimeout(t)
  }, [cardToast])

  const startGame = (gender: 'm' | 'f') => {
    const { state: s, reward } = dailyCheckin(freshState(gender))
    saveState(s)
    setState(s)
    setCheckinReward(reward)
    playSfx('stamp')
    setScreen('checkin')
  }

  const continueGame = () => {
    const s = loadState()
    if (s) {
      const { state: next, reward } = dailyCheckin(s)
      saveState(next)
      setState(next)
      setCheckinReward(reward)
      playSfx('click')
      setScreen('checkin')
    }
  }

  /** 打卡后按存档位置路由：夜里中途退出的回到剧情现场，夜与夜之间的回到白天 */
  const doCheckin = () => {
    if (!state) return
    if (state.finished) setScreen(state.screenHint === 'quiz' ? 'quiz' : 'chapterEnd')
    else if (state.screenHint === 'night' && state.stepId) setScreen('night')
    else if (state.night > 1) setScreen('day')
    else setScreen('night')
  }

  const backTarget = (s: GameState | null): Screen => {
    if (!s) return 'title'
    if (s.finished) return s.screenHint === 'quiz' ? 'quiz' : 'chapterEnd'
    if (s.screenHint === 'night' && s.stepId) return 'night'
    return s.night > 1 ? 'day' : 'title'
  }

  const settleNight = (skip: boolean) => {
    if (!state) return
    const curNight = state.night
    update(s => {
      if (s.stamps.includes(curNight)) return s // 防重复结算
      let next = skip ? applyEffect(s, { gold: 100 }) : s
      next = { ...next, stamps: [...next.stamps, curNight] }
      if (curNight >= LAST_NIGHT) {
        // 章节结算勋章
        const noWrong = ![1, 2, 3, 4, 5].some(i => next.flags[`n${i}_wrong`])
        if (noWrong && !next.badges.includes('sharp_eye')) next = { ...next, badges: [...next.badges, 'sharp_eye'] }
        if (next.gold > 600 && !next.badges.includes('money_bags')) next = { ...next, badges: [...next.badges, 'money_bags'] }
        if (next.flags['n1_kind'] && next.flags['n2_kind'] && next.flags['n3_kind'] && !next.badges.includes('warm_hands')) next = { ...next, badges: [...next.badges, 'warm_hands'] }
        if (next.flags['archive_film'] && next.flags['zhou_truth'] && !next.badges.includes('detective')) next = { ...next, badges: [...next.badges, 'detective'] }
        if (!next.badges.includes('chapter1')) next = { ...next, badges: [...next.badges, 'chapter1'] }
        next = { ...next, finished: true, screenHint: 'quiz', stepId: undefined, resumeKey: undefined }
      } else {
        // 机器状态太差 → 废片率高，当夜收入被扣
        let wornNote = false
        if (next.durability < 40 && next.gold >= 60) { next = { ...next, gold: next.gold - 60 }; wornNote = true }
        next = { ...next, night: curNight + 1, durability: Math.max(10, next.durability - 12), screenHint: 'day' as const, stepId: undefined, resumeKey: undefined, ap: 0, flags: wornNote ? { ...next.flags, worn_penalty: true } : next.flags }
      }
      return next
    })
    setScreen(curNight >= LAST_NIGHT ? 'quiz' : 'day')
  }

  return (
    <div className="w-full h-full bg-slate-950 text-slate-100 overflow-hidden select-none font-sans">
      <RotateHint />
      {screen === 'title' && <TitleScreen hasSave={!!loadState()} onNew={() => setScreen('select')} onContinue={continueGame} onBadges={() => setScreen('badges')} onVerify={() => setScreen('verify')} onDlc={() => { window.location.hash = '#/dlc' }} />}
      {screen === 'select' && <SelectScreen onPick={startGame} onBack={() => setScreen('title')} />}
      {screen === 'checkin' && state && <CheckinScreen state={state} reward={checkinReward} onDone={doCheckin} />}
      {screen === 'night' && state && (
        <NightScreen
          key={`n${state.night}-${state.resumeKey ?? 'fresh'}`}
          state={state}
          update={update}
          onFinish={settleNight}
          onExit={() => setScreen('title')}
        />
      )}
      {screen === 'day' && state && <DayScreen state={state} update={update} onNextNight={() => setScreen('night')} onBadges={() => setScreen('badges')} />}
      {screen === 'badges' && <BadgeScreen state={state} onBack={() => setScreen(backTarget(state))} />}
      {screen === 'quiz' && state && <QuizScreen state={state} update={update} onDone={() => setScreen('epilogue')} />}
      {screen === 'epilogue' && state && (
        <NightScreen
          key="epilogue"
          state={state}
          update={update}
          onFinish={() => { update(s => ({ ...s, screenHint: 'chapterEnd' as const, stepId: undefined, resumeKey: undefined })); setScreen('chapterEnd') }}
          onExit={() => setScreen('chapterEnd')}
        />
      )}
      {screen === 'chapterEnd' && state && <ChapterEndScreen state={state} update={update} onBadges={() => setScreen('badges')} onRestart={() => { wipeSave(); setState(null); setScreen('title') }} onDlc={() => { window.location.hash = '#/dlc' }} onHome={() => setScreen('title')} />}
      {screen === 'verify' && <VerifyScreen onBack={() => setScreen('title')} />}
      {screen === 'dlcHall' && (
        <DlcHallScreen onEnter={enterDlc} onEnterCh2={enterCh2} onBack={() => { window.location.hash = ''; setScreen('title') }} />
      )}
      {screen === 'ch2' && state && (
        <Ch2Screen
          state={state}
          update={update}
          onExit={() => { window.location.hash = '#/dlc'; setScreen('dlcHall') }}
        />
      )}
      {screen === 'dlc' && state && dlcId && getDlc(dlcId) && (
        <ScriptScreen
          key={dlcId}
          dlc={getDlc(dlcId)!}
          state={state}
          update={update}
          onExit={() => { window.location.hash = '#/dlc'; setScreen('dlcHall') }}
        />
      )}

      {/* 全局知识卡片 toast（第一章与 DLC 共用） */}
      {cardToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[100] bg-slate-900/95 border-2 border-amber-400/70 rounded-xl px-4 py-2 shadow-2xl text-sm text-amber-200 pointer-events-none">
          📖 知识卡片已收入夜班手册：{cardToast}
        </div>
      )}

      {/* 全局勋章弹窗（第一章与 DLC 共用） */}
      {badgePop.length > 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
          <div className="bg-slate-900/95 border-2 border-amber-400 rounded-2xl px-8 py-6 shadow-[0_0_40px_rgba(251,191,36,0.4)] flex flex-col items-center gap-2 rotate-[-1deg]">
            <p className="text-amber-300 tracking-[0.3em] text-xs">获得勋章</p>
            {badgePop.map(id => {
              const b = BADGES[id] ?? DLC_BADGES[id] ?? CH2_BADGES[id]
              return b ? (
                <div key={id} className="flex items-center gap-3">
                  <span className="text-4xl">{b.icon}</span>
                  <span className="text-xl text-amber-100 font-bold">{b.name}</span>
                </div>
              ) : null
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* ================= 自适应背景 ================= */
/* 横屏：object-cover 铺满；竖屏：object-contain 完整显示整幅场景，空白处用同图模糊放大垫底 */
function BgImg({ name, fixed = false }: { name: string; fixed?: boolean }) {
  const pos = fixed ? 'fixed' : 'absolute'
  return (
    <>
      <img src={IMG(name)} aria-hidden className={`${pos} inset-0 w-full h-full object-cover blur-2xl scale-125 opacity-60 pixel hidden portrait:block`} alt="" />
      <img src={IMG(name)} className={`${pos} inset-0 w-full h-full object-cover portrait:object-contain portrait:scale-[1.65] portrait:-translate-y-[5%] pixel`} alt="" />
    </>
  )
}

/* 全屏切换：仅在支持 Fullscreen API 的浏览器渲染（安卓 Chrome 等）；微信/iOS 自动隐藏 */
async function enterFullscreenLandscape() {
  try { await document.documentElement.requestFullscreen() } catch { return }
  // 全屏后尝试锁定横屏(视频 App 同款效果);iOS Safari / 微信等不支持时静默忽略
  try {
    const o = screen.orientation as unknown as { lock?: (o: string) => Promise<void> }
    if (typeof o.lock === 'function') await o.lock('landscape')
  } catch { /* 不支持的浏览器直接忽略,保持普通全屏 */ }
}
function exitFullscreenUnlock() {
  try {
    const o = screen.orientation as unknown as { unlock?: () => void }
    if (typeof o.unlock === 'function') o.unlock()
  } catch { /* ignore */ }
  void document.exitFullscreen().catch(() => {})
}
/** 当前环境是否支持"全屏+锁横屏"(安卓 Chrome 等;iOS/部分微信内核不支持) */
function supportsLandscapeLock() {
  return typeof document !== 'undefined' && !!document.fullscreenEnabled &&
    typeof screen !== 'undefined' && !!screen.orientation &&
    typeof (screen.orientation as unknown as { lock?: unknown }).lock === 'function'
}

/** 首次进入时,手机竖屏且支持锁横屏 → 弹出建议横屏弹窗(每次会话最多一次) */
function RotateHint() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const dismissed = sessionStorage.getItem('mr-rotate-dismissed')
    const isTouch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window
    if (dismissed || !isTouch || !supportsLandscapeLock()) return
    const isPortrait = () => window.innerHeight > window.innerWidth
    const t = setTimeout(() => { if (isPortrait()) setShow(true) }, 900)
    const onResize = () => { if (!isPortrait()) setShow(false) }
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => { clearTimeout(t); window.removeEventListener('resize', onResize); window.removeEventListener('orientationchange', onResize) }
  }, [])
  if (!show) return null
  const dismiss = () => { sessionStorage.setItem('mr-rotate-dismissed', '1'); setShow(false) }
  return (
    <div className="absolute inset-0 z-[90] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm" onClick={() => { playSfx('click'); dismiss() }}>
      <div className="mx-6 max-w-sm rounded-xl border-2 border-amber-500/70 bg-slate-900 p-6 shadow-[0_0_30px_rgba(251,191,36,0.25)] text-center" onClick={e => e.stopPropagation()}>
        <div className="text-4xl mb-3">📱↻</div>
        <div className="text-amber-200 text-lg font-bold tracking-widest mb-2">建议横屏游玩</div>
        <p className="text-slate-300 text-sm leading-relaxed mb-5">把手机横过来，画面更完整、立绘更清晰，<br />获得最佳的深夜值班体验。</p>
        <button
          onClick={() => { playSfx('click'); dismiss(); void enterFullscreenLandscape() }}
          className="w-full py-3 rounded-lg bg-amber-500/90 text-slate-950 font-bold tracking-widest border border-amber-300 hover:scale-105 active:scale-95 transition-all mb-3">
          ⛶ 全屏并横屏
        </button>
        <button onClick={() => { playSfx('click'); dismiss() }} className="text-slate-500 hover:text-slate-300 text-xs underline">
          不了，竖屏也能玩
        </button>
      </div>
    </div>
  )
}

function FullscreenBtn({ className = '' }: { className?: string }) {
  if (typeof document === 'undefined' || !document.fullscreenEnabled) return null
  return (
    <button
      onClick={e => {
        e.stopPropagation(); playSfx('click')
        if (document.fullscreenElement) exitFullscreenUnlock()
        else void enterFullscreenLandscape()
      }}
      className={`text-xs text-slate-400 hover:text-amber-300 border border-slate-700 rounded px-2 py-0.5 ${className}`}
      title="全屏显示(支持的设备上将自动横屏)">
      ⛶ 全屏
    </button>
  )
}

/* ================= 标题画面 ================= */
function TitleScreen({ hasSave, onNew, onContinue, onBadges, onVerify, onDlc }: { hasSave: boolean; onNew: () => void; onContinue: () => void; onBadges: () => void; onVerify: () => void; onDlc: () => void }) {
  return (
    <div className="relative w-full h-full">
      <BgImg name="bg_title" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/40" />
      <div className="relative z-10 h-full flex flex-col items-center justify-end pb-16 gap-3">
        <h1 className="text-5xl md:text-6xl font-bold tracking-widest text-amber-100 drop-shadow-[0_4px_12px_rgba(251,191,36,0.4)] mb-2">深夜影像科</h1>
        <p className="text-slate-300 text-sm tracking-wider mb-6">Midnight Radiology · 第一章 老伙计</p>
        {hasSave && <MenuBtn onClick={onContinue} primary>▶ 继续夜班（自动存档）</MenuBtn>}
        <MenuBtn onClick={onNew} primary={!hasSave}>{hasSave ? '↺ 重新开始' : '▶ 开始游戏'}</MenuBtn>
        <MenuBtn onClick={onBadges}>🏅 勋章墙</MenuBtn>
        <p className="text-slate-500 text-xs mt-6">教学试玩版 v0.6.0-dev · 进度自动保存在本浏览器 · 随时退出随时续玩</p>
        <div className="flex items-center gap-4">
          <FullscreenBtn />
          <button onClick={onVerify} className="text-slate-600 hover:text-slate-400 text-xs underline">教师验证入口</button>
          {/* 隐蔽的通用入口：内容大厅（正篇后续章节 + 番外篇都从这里进） */}
          <button onClick={e => { e.stopPropagation(); onDlc() }} className="text-slate-800 hover:text-slate-500 text-xs transition-colors" title="内容大厅">▪</button>
          {/* 隐蔽的内部入口：配音试听页（开发调试用，正式上线前删除） */}
          <button onClick={e => { e.stopPropagation(); window.location.href = '/voice-preview.html' }} className="text-slate-800 hover:text-slate-500 text-xs transition-colors" title="配音试听">▫</button>
        </div>
      </div>
    </div>
  )
}

function MenuBtn({ children, onClick, primary }: { children: React.ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <button onClick={() => { playSfx('click'); onClick() }}
      className={`w-64 py-3 rounded-lg text-lg tracking-widest border transition-all hover:scale-105 active:scale-95 ${primary ? 'bg-amber-500/90 text-slate-950 border-amber-300 font-bold' : 'bg-slate-800/80 text-slate-200 border-slate-600 hover:border-amber-400'}`}>
      {children}
    </button>
  )
}

/* ================= 选人 ================= */
function SelectScreen({ onPick, onBack }: { onPick: (g: 'm' | 'f') => void; onBack: () => void }) {
  return (
    <div className="relative w-full h-full">
      <BgImg name="bg_control" />
      <div className="absolute inset-0 bg-slate-950/70" />
      <div className="select-wrap relative z-10 h-full flex flex-col items-center justify-center gap-8">
        <h2 className="select-title text-3xl text-amber-100 tracking-widest">选择你的夜班技师</h2>
        <div className="select-cards flex gap-10">
          {([['f', '林小满', '细心温和的新人技师'], ['m', '陈一帆', '沉稳靠谱的新人技师']] as const).map(([g, name, desc]) => (
            <button key={g} onClick={() => onPick(g)} className="select-card group flex flex-col items-center gap-3 p-4 rounded-2xl border-2 border-slate-600 hover:border-amber-400 bg-slate-900/60 transition-all hover:scale-105">
              <img src={IMG(g === 'f' ? 'char_f' : 'char_m')} className="select-img h-64 object-contain pixel" alt={name} />
              <span className="text-xl text-amber-100">{name}</span>
              <span className="text-xs text-slate-400">{desc}</span>
            </button>
          ))}
        </div>
        <button onClick={onBack} className="text-slate-400 hover:text-amber-300 text-sm">← 返回</button>
      </div>
    </div>
  )
}

/* ================= 每日打卡 ================= */
function CheckinScreen({ state, reward, onDone }: { state: GameState; reward: number; onDone: () => void }) {
  const [stamped, setStamped] = useState(false)
  useEffect(() => { const t = setTimeout(() => setStamped(true), 400); return () => clearTimeout(t) }, [])
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <BgImg name="bg_day" />
      <div className="absolute inset-0 bg-slate-950/60" />
      <div className="relative z-10 bg-slate-900/90 border-2 border-amber-500/50 rounded-2xl p-10 flex flex-col items-center gap-4 max-w-sm mx-4 max-h-full overflow-y-auto compact-card">
        <h2 className="text-2xl text-amber-100 tracking-widest">每日打卡</h2>
        <div className={`transition-all duration-500 ${stamped ? 'scale-100 rotate-[-12deg] opacity-100' : 'scale-150 opacity-0'}`}>
          <img src={IMG('stamp')} className="w-32 h-32 pixel stamp-img" alt="打卡印章" />
        </div>
        <p className="text-slate-300">连续打卡 <span className="text-amber-300 font-bold text-xl">{state.streak}</span> 天</p>
        {reward > 0 && <p className="text-emerald-300">打卡奖励 +{reward} 金币</p>}
        {state.streak >= 3 && <p className="text-pink-300 text-sm">🦉 达成连续3天打卡！勋章「夜猫子」</p>}
        <MenuBtn onClick={onDone} primary>{state.screenHint === 'night' && state.stepId ? '回到夜班现场 →' : '出发，上夜班 →'}</MenuBtn>
      </div>
    </div>
  )
}

/* ================= 值班室旧书:可翻页的《医学影像学》残页(每夜解锁一页) ================= */
function BookOverlay({ state, update, onClose }: { state: GameState; update: (f: (s: GameState) => GameState) => void; onClose: () => void }) {
  // 解锁规则:第 N 页在第 N 夜可翻(页码从 0 起)
  const unlocked = Math.min(state.night, BOOK_PAGES.length)
  const [page, setPage] = useState(unlocked - 1) // 打开时直接翻到最新一页
  const readKey = `book_read_n${state.night}`
  const firstReadRef = useRef(!state.flags[readKey]) // 挂载时快照,避免奖励提示被状态更新立刻刷掉
  const [granted, setGranted] = useState(false)
  // 首次翻到本夜新解锁的那一页:医术 +1(每夜一次)
  useEffect(() => {
    if (firstReadRef.current && !granted && page === unlocked - 1) {
      update(s => ({ ...s, skill: Math.min(5, s.skill + 1), flags: { ...s.flags, [readKey]: true } }))
      setGranted(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])
  const p = BOOK_PAGES[page]
  return (
    <div className="fixed inset-0 z-40 bg-slate-950/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-amber-50 border-2 border-amber-700/60 rounded-2xl p-5 md:p-6 max-w-lg w-full max-h-[88%] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1 shrink-0">
          <h3 className="text-lg text-amber-900 tracking-widest font-bold">📖 翻烂的《医学影像学》</h3>
          <span className="text-amber-700/70 text-xs">第 {page + 1} 页 / 共 {BOOK_PAGES.length} 页</span>
        </div>
        <p className="text-amber-800/60 text-xs mb-3 shrink-0">封面内页写着:「夜班保命,闲时翻翻。」——后面各页要到对应夜次才找得到。</p>
        <div className="border-t border-b border-amber-700/30 py-3 mb-3 overflow-y-auto min-h-0">
          <h4 className="text-amber-950 font-bold mb-2 text-sm md:text-base">{p.title}</h4>
          <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">{p.body}</p>
          <p className="text-amber-800/80 text-xs mt-3 italic">{p.note}</p>
        </div>
        {granted && page === unlocked - 1 && (
          <p className="text-emerald-700 text-xs mb-2 shrink-0">✓ 读到新的一页,若有所悟(医术 +1,每夜限一次)</p>
        )}
        <div className="flex items-center justify-between gap-2 shrink-0">
          <button disabled={page <= 0} onClick={() => { playSfx('click'); setPage(page - 1) }}
            className="px-4 py-2 rounded-lg border border-amber-700/50 text-amber-900 text-sm disabled:opacity-30 hover:bg-amber-100">← 上一页</button>
          {page < unlocked - 1 ? (
            <button onClick={() => { playSfx('click'); setPage(page + 1) }}
              className="px-4 py-2 rounded-lg border border-amber-700/50 text-amber-900 text-sm hover:bg-amber-100">下一页 →</button>
          ) : page < BOOK_PAGES.length - 1 ? (
            <span className="text-amber-700/60 text-xs">🔒 下一页:第 {page + 2} 夜解锁</span>
          ) : (
            <span className="text-amber-700/60 text-xs">—— 全书完 ——</span>
          )}
        </div>
        <button onClick={() => { playSfx('click'); onClose() }} className="mt-4 w-full py-2 rounded-lg bg-amber-800 text-amber-50 text-sm hover:bg-amber-700 shrink-0">合上书,回科室</button>
      </div>
    </div>
  )
}


/* ================= 商店（夜晚小卖部 / 白天均可打开） ================= */
function ShopOverlay({ state, update, onClose }: { state: GameState; update: (f: (s: GameState) => GameState) => void; onClose: () => void }) {
  const [msg, setMsg] = useState('')
  const buy = (item: ShopItem) => {
    if (state.gold < item.price) { setMsg('金币不够……今晚多接几个病人吧。'); return }
    // 刮刮乐每日限购5张（按夜次计数）
    if (item.id === 'lottery') {
      const played = state.lotteryNight === state.night ? (state.lotteryCount ?? 0) : 0
      if (played >= 5) { setMsg('老板娘按住刮刮乐：「一天最多五张——玄学也要讲剂量。」'); playSfx('click'); return }
    }
    let lotteryMsg = ''
    update(s => {
      let next: GameState = { ...s, gold: s.gold - item.price, buyCount: s.buyCount + 1 }
      if (item.id === 'coffee') next = applyEffect(next, { ap: 1 })
      else if (item.id === 'milktea') next = applyEffect(next, { heart: 2 })
      else if (item.id === 'book') next = applyEffect(next, { skill: 2 })
      else if (item.id === 'lottery') {
        // 返奖率约 68%（期望返奖 34.2 / 售价 50）——期望仍为负，久刮必亏
        const roll = Math.random()
        const win = roll < 0.42 ? 0 : roll < 0.70 ? 20 : roll < 0.88 ? 50 : roll < 0.96 ? 120 : 250
        const played = s.lotteryNight === s.night ? (s.lotteryCount ?? 0) : 0
        next = { ...next, gold: next.gold + win, lotteryNight: s.night, lotteryCount: played + 1 }
        lotteryMsg =
          win === 0 ? '「谢谢惠顾」……夜班玄学失败了。'
            : win === 20 ? '中了 20 金币，回了个零头。'
              : win === 50 ? '中了 50 金币，正好回本！'
                : win === 120 ? '🎉 中了 120 金币！小赚一笔！'
                  : '🎉🎉 250 金币！单车变摩托！'
      } else {
        next = applyEffect(next, { item: item.id })
      }
      if (next.buyCount >= 3 && !next.badges.includes('shopaholic')) next = { ...next, badges: [...next.badges, 'shopaholic'] }
      return next
    })
    playSfx('click')
    setMsg(lotteryMsg || `已购入：${item.icon} ${item.name}（${item.desc}）`)
  }
  const visible = SHOP_ITEMS.filter(i => state.night >= (i.minNight ?? 1))
  return (
    <div className="fixed inset-0 z-40 bg-slate-950/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border-2 border-amber-500/50 rounded-2xl p-6 max-w-lg w-full max-h-[85%] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xl text-amber-200 tracking-widest">🛒 住院部小卖部</h3>
          <span className="text-amber-300 font-bold">💰 {state.gold}</span>
        </div>
        <p className="text-xs text-slate-500 mb-4">老板娘打着哈欠：「夜班辛苦，随便看看。」</p>
        <div className="flex flex-col gap-2">
          {visible.map(item => {
            const owned = state.items.includes(item.id)
            const lotteryPlayed = item.id === 'lottery' && state.lotteryNight === state.night ? (state.lotteryCount ?? 0) : 0
            const soldOut = item.id === 'lottery' && lotteryPlayed >= 5
            return (
              <div key={item.id} className="flex items-center gap-3 bg-slate-800/80 border border-slate-600 rounded-lg p-3">
                {item.image
                  ? <img src={IMG(item.image)} className="w-11 h-11 object-contain pixel shrink-0 rounded border border-slate-700 bg-slate-950" alt="" />
                  : <span className="text-2xl">{item.icon}</span>}
                <div className="flex-1 min-w-0">
                  <p className="text-slate-100 text-sm">{item.name}{owned && <span className="text-emerald-400 text-xs ml-2">已持有</span>}</p>
                  <p className="text-xs text-slate-400">{item.desc}</p>
                  {item.id === 'lottery' && <p className={`text-xs ${soldOut ? 'text-rose-400' : 'text-slate-500'}`}>今日已刮 {lotteryPlayed}/5</p>}
                </div>
                <button onClick={() => buy(item)} disabled={state.gold < item.price || soldOut}
                  className="px-3 py-1.5 rounded-md bg-amber-500/90 text-slate-950 text-sm font-bold disabled:opacity-40 hover:bg-amber-400 shrink-0">
                  {soldOut ? '售罄' : `${item.price}💰`}
                </button>
              </div>
            )
          })}
        </div>
        {msg && <p className="text-emerald-300 text-sm mt-3">{msg}</p>}
        {state.items.length > 0 && (
          <p className="text-xs text-slate-500 mt-3">背包：{state.items.map(id => { const it = SHOP_ITEMS.find(x => x.id === id); return it ? `${it.icon}${it.name}` : id }).join('、')}</p>
        )}
        <button onClick={onClose} className="mt-4 w-full py-2 rounded-lg bg-slate-800 border border-slate-600 hover:border-amber-400 text-slate-200">离开小卖部</button>
      </div>
    </div>
  )
}

/* ================= 夜晚剧情（对话引擎 · 每步自动存档） ================= */
function NightScreen({ state, update, onFinish, onExit }: { state: GameState; update: (f: (s: GameState) => GameState) => void; onFinish: (skip: boolean) => void; onExit: () => void }) {
  const night = NIGHTS[Math.min(state.night, LAST_NIGHT) - 1]
  const resumeStep = state.screenHint === 'night' && state.stepId && night.steps[state.stepId] ? state.stepId : night.start
  const [stepId, setStepId] = useState(resumeStep)
  const [view, setView] = useState<{ bg: string; sprite?: string; sprite2?: string }>({
    bg: state.viewBg ?? 'bg_control', sprite: state.viewSprite, sprite2: state.viewSprite2,
  })
  const viewRef = useRef(view)
  const applied = useRef<Set<string>>(new Set(state.resumeKey ? [state.resumeKey] : []))
  const [shown, setShown] = useState(0)
  const [skipArmed, setSkipArmed] = useState(false)
  const [shopOpen, setShopOpen] = useState(false)
  const [choicesLocked, setChoicesLocked] = useState(false)
  // 防连点误选:捕获阶段记录最近两次点击时间;选项点击若距「上一次」点击过近(说明在连点快进)则忽略。
  // 手指停下超过 0.7s 后,下一次点击才生效——连点不止,选项永远不响应。
  const lastTapAt = useRef(0)
  const prevTapAt = useRef(0)
  const [readout, setReadout] = useState<{ img: string; p: number } | null>(null)
  const [bookOpen, setBookOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  // 读取流程门闩：pending=等待文本播完 → running=动画播放中 → done=播完；none=本步无读取
  const readoutGate = useRef<'none' | 'pending' | 'running' | 'done'>('none')

  const finishFired = useRef(false)

  const step: Step = night.steps[stepId] ?? { end: true }
  const fullText = step.text ?? ''
  const plainLen = fullText.replaceAll('**', '').length
  const done = shown >= plainLen

  // 换步时在渲染期同步重置打字机进度——避免第一帧用旧 shown 渲染出新文本的一大段残影再清空重打
  const [prevStepId, setPrevStepId] = useState(stepId)
  if (prevStepId !== stepId) {
    setPrevStepId(stepId)
    setShown(0)
    if (step.choices) setChoicesLocked(true)
  }

  // 进入某一步：更新视图、应用效果（每步一次）、写入存档（打字机重置已在渲染期完成）
  useEffect(() => {
    readoutGate.current = step.readout ? 'pending' : 'none'  // 扫描动画等本步文本播完再启动（见下方 useEffect）
    const key = `${night.id}-${stepId}`
    const already = applied.current.has(key)
    applied.current.add(key)
    // 出场语音(vox_)全程只播一次:听过就写入存档标记,重进/读档都不再播
    const heardKey = (n: string) => `heard_vp3_${n}`
    const sfxList = [step.sfx, step.sfx2].filter((n): n is NonNullable<typeof n> => !!n)
    const freshVox = sfxList.filter(n => n.startsWith('vox_') && !state.flags[heardKey(n)])
    if (!already) sfxList.forEach(n => { if (!n.startsWith('vox_') || freshVox.includes(n)) playSfx(n as Parameters<typeof playSfx>[0]) })
    const cur = viewRef.current
    // 立绘规则：显式指定 > 主角思考/发言 > 同一角色连续发言 > 其他情况一律清场（避免上一场景的角色滞留）
    const impliedSprite =
      step.sprite ??
      (step.speaker === 'me'
        ? 'me'
        : step.speaker && cur.sprite === `char_${step.speaker}`
          ? cur.sprite
          : undefined)
    const newView = {
      bg: step.bg ?? cur.bg,
      sprite: impliedSprite,
      sprite2: step.sprite2,
    }
    viewRef.current = newView
    setView(newView)
    const newCard = step.card && !(state.cards ?? []).includes(step.card) ? step.card : undefined
    update(s => {
      let next = !already && step.effect ? applyEffect(s, step.effect) : s
      if (!already && freshVox.length > 0) {
        const f = { ...next.flags }
        freshVox.forEach(n => { f[heardKey(n)] = true })
        next = { ...next, flags: f }
      }
      // 知识卡片/大事记触发（去重；与 DLC 引擎同一套机制）
      if (newCard) next = { ...next, cards: [...(next.cards ?? []), newCard] }
      if (step.event && !(next.events ?? []).includes(step.event)) next = { ...next, events: [...(next.events ?? []), step.event] }
      next = { ...next, screenHint: 'night' as const, stepId, viewBg: newView.bg, viewSprite: newView.sprite, viewSprite2: newView.sprite2, resumeKey: key }
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepId])

  useEffect(() => {
    if (done) return
    const t = setInterval(() => setShown(s => Math.min(s + 1, plainLen)), 28)
    return () => clearInterval(t)
  }, [stepId, done, plainLen])

  // 选项出现后设一段不可点击的缓冲，防止误触
  useEffect(() => {
    if (!step.choices || !done) return
    const t = setTimeout(() => setChoicesLocked(false), 900)
    return () => clearTimeout(t)
  }, [stepId, done, step.choices])

  // CR 读取流程：等本步文本播完，稍停一拍再启动扫描动画（先看到"送去扫描仪"，再看到扫描）
  useEffect(() => {
    if (readoutGate.current !== 'pending' || !done || readout) return
    readoutGate.current = 'running'
    const t = setTimeout(() => setReadout({ img: step.readout!, p: 0 }), 800)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, stepId, readout])

  // CR 读取流程：5 秒进度条，影像随进度逐行扫描显示；读完停留片刻后关闭遮罩
  useEffect(() => {
    if (!readout) return
    if (readout.p >= 100) {
      // 扫描播完停留一拍后自动进入下一句——避免画面停在"正在扫描"的文本上干等点击
      const t = setTimeout(() => {
        readoutGate.current = 'done'
        setReadout(null)
        if (step.next && !step.choices && !step.end) { playSfx('click'); setStepId(step.next) }
      }, 1200)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setReadout(r => r && { ...r, p: Math.min(100, r.p + 2) }), 100)
    return () => clearTimeout(t)
  }, [readout])

  useEffect(() => {
    if (step.end && !finishFired.current) {
      finishFired.current = true
      const t = setTimeout(() => onFinish(false), 600)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.end])

  const advance = () => {
    // 读取步骤在动画完整播完前（pending/running）一律禁止推进，防止连点跳过扫描动画
    if (step.choices || step.end || shopOpen || bookOpen || manualOpen || readout) return
    if (readoutGate.current === 'pending' || readoutGate.current === 'running') return
    if (!done) { setShown(plainLen); return }
    if (step.next) { playSfx('click'); setStepId(step.next) }
  }

  const pick = (c: Choice) => {
    if (choicesLocked) return
    if (Date.now() - prevTapAt.current < 300) return // 连点快进中:上一次点击距今太近,视为误触
    playSfx('click')
    if (c.next === '@shop') { setShopOpen(true); return }
    if (c.next === '@book') { setBookOpen(true); return }
    if (c.effect) update(s => applyEffect(s, c.effect))
    if (c.risk && Math.random() < c.risk.chance) {
      if (c.risk.effect) update(s => applyEffect(s, c.risk!.effect))
      setStepId(c.risk.next)
      return
    }
    setStepId(c.next)
  }

  const spriteOf = (key?: string) => {
    if (!key) return null
    if (key === 'me') return IMG(state.gender === 'f' ? 'char_f' : 'char_m')
    return IMG(key)
  }
  const leftSprite = spriteOf(view.sprite)
  const rightSprite = spriteOf(view.sprite2)
  const speakerMeta = step.speaker ? CHARACTERS[step.speaker] : undefined
  const visibleChoices = (step.choices ?? []).filter(c => condOk(state, c.cond))

  return (
    <div className="relative w-full h-full cursor-pointer" onClickCapture={() => { prevTapAt.current = lastTapAt.current; lastTapAt.current = Date.now() }} onClick={advance}>
      <BgImg name={view.bg} />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-slate-950/80 to-transparent pointer-events-none" />

      {/* 顶部信息条 */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between flex-wrap gap-y-1 px-4 py-2 bg-slate-950/70 text-xs md:text-sm">
        <span className="text-amber-200 tracking-widest whitespace-nowrap">{stepId.startsWith('n5_epi') ? '尾声 · 第一章' : `${night.title} · ${night.subtitle}`}</span>
        <span className="text-slate-300 flex items-center gap-2 md:gap-3 flex-wrap justify-end">
          <span>💰 {state.gold}</span>
          <span>🔧 {state.durability}%</span>
          <span className={state.ap > 0 ? 'text-sky-300' : 'text-slate-600'}>⚡×{state.ap}</span>
          <button onClick={e => { e.stopPropagation(); playSfx('click'); setManualOpen(true) }}
            className="text-xs text-slate-400 hover:text-amber-300 border border-slate-700 rounded px-2 py-0.5">
            📖 手册
          </button>
          <FullscreenBtn />
          <button onClick={e => { e.stopPropagation(); playSfx('click'); onExit() }}
            className="text-xs text-slate-400 hover:text-amber-300 border border-slate-700 rounded px-2 py-0.5" title="进度已自动保存，可随时离开">
            💾 回标题
          </button>
          {skipArmed ? (
            <span className="flex items-center gap-2">
              <button onClick={e => { e.stopPropagation(); onFinish(true) }}
                className="text-xs text-amber-300 border border-amber-500 rounded px-2 py-0.5 animate-pulse">
                确认跳过（仅保底收入）
              </button>
              <button onClick={e => { e.stopPropagation(); setSkipArmed(false) }}
                className="text-xs text-slate-400 border border-slate-700 rounded px-2 py-0.5">
                取消
              </button>
            </span>
          ) : (
            <button onClick={e => { e.stopPropagation(); setSkipArmed(true) }}
              className="text-xs text-slate-500 hover:text-amber-300 border border-slate-700 rounded px-2 py-0.5">
              跳过本夜
            </button>
          )}
        </span>
      </div>

      {/* 电话/对讲机来电头像 */}
      {(step.phone || step.radio) && (
        <div className="absolute top-12 right-4 portrait:top-[4.5rem] portrait:right-2 portrait:px-2 portrait:py-1 portrait:gap-2 z-30 flex items-center gap-3 bg-slate-900/90 border-2 border-emerald-600 rounded-xl px-3 py-2 shadow-2xl">
          <div className="portrait:w-10 portrait:h-10 w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden border-2 border-emerald-400 bg-slate-800 shrink-0">
            <img src={IMG((step.phone ?? step.radio)!)} className="w-full h-full object-cover object-top pixel" alt="来电" />
          </div>
          <div className="text-left">
            <p className="text-emerald-300 text-xs md:text-sm tracking-widest animate-pulse">{step.phone ? '📞 通话中' : '📻 对讲频道'}</p>
            <p className="text-slate-400 text-xs">{step.phone ? '外线 · 院内电话' : '后勤 · 楼宇频道'}</p>
          </div>
        </div>
      )}

      {/* 中央大图（X光片）：若本步带读取流程，须等扫描动画播完才亮出图像 */}
      {step.image && !(step.readout && readoutGate.current !== 'done') && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none pb-40">
          <img src={IMG(step.image)} className="max-h-[45%] portrait:max-h-[38%] rounded-lg border-4 border-slate-700 shadow-2xl pixel" alt="影像" />
        </div>
      )}

      {/* 立绘 */}
      {leftSprite && <img src={leftSprite} className="sprite-l absolute bottom-48 portrait:bottom-44 left-4 md:left-24 portrait:h-44 h-64 md:h-96 object-contain pixel drop-shadow-2xl z-10" alt="" />}
      {rightSprite && <img src={rightSprite} className="sprite-r absolute bottom-48 portrait:bottom-44 right-4 md:right-24 portrait:h-40 h-56 md:h-80 object-contain pixel opacity-80 drop-shadow-2xl z-10" alt="" />}

      {/* 对话框 */}
      <div className="dialog-wrap absolute bottom-0 inset-x-0 z-20 p-4 md:p-6">
        <div className="dialog-box max-w-4xl mx-auto bg-slate-900/95 border-2 border-slate-600 rounded-xl p-4 md:p-5 min-h-32 relative">
          {speakerMeta && speakerMeta.name && (
            <span className="absolute -top-4 left-4 px-3 py-1 rounded-md text-sm font-bold bg-slate-800 border border-slate-600" style={{ color: speakerMeta.color }}>
              {speakerMeta.name === '我' ? (state.gender === 'f' ? '林小满' : '陈一帆') : speakerMeta.name}
            </span>
          )}
          <p key={stepId} className="text-slate-100 leading-relaxed text-base md:text-lg whitespace-pre-wrap min-h-[4.9rem] md:min-h-[5.4rem] text-in"><RichText text={fullText} shown={shown} /></p>
          {!step.choices && !step.end && done && <span className="absolute bottom-3 right-4 text-amber-300 animate-bounce">▼</span>}
          {step.choices && done && !choicesLocked && (
            <div className="mt-4 flex flex-col gap-2 choice-in" onClick={e => e.stopPropagation()}>
              {visibleChoices.map((c, i) => (
                <button key={i} onClick={() => pick(c)}
                  className="text-left px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-600 hover:border-amber-400 hover:bg-slate-700 transition-all text-slate-100">
                  <RichText text={c.text} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CR 读取遮罩：IP板送扫描仪，激光逐行读出 */}
      {readout && (
        <div className="absolute inset-0 z-40 bg-slate-950/95 flex flex-col items-center justify-center gap-4 px-6 cursor-wait"
          onClick={e => e.stopPropagation()}>
          <img src={IMG('machine_reader')} className="h-20 md:h-28 pixel" alt="CR扫描仪" />
          <p className="text-emerald-300 tracking-widest text-sm md:text-base">
            {readout.p >= 100 ? '✓ 读取完成，影像已传回工作站' : 'IP成像板已送入隔壁扫描仪 · 激光逐行读取中……'}
          </p>
          {readout.img !== 'none' && (
            <div className="relative rounded-lg border-4 border-slate-700 shadow-2xl overflow-hidden bg-slate-900">
              {/* 底层仅用于撑开尺寸，完全透明——IP板在激光扫到之前不该显出任何影像 */}
              <img src={IMG(readout.img)} className="max-h-[38vh] pixel opacity-0" alt="" />
              <img src={IMG(readout.img)} className="max-h-[38vh] pixel absolute inset-0 w-full h-full object-cover"
                style={{ clipPath: `inset(0 0 ${100 - readout.p}% 0)` }} alt="读取中的影像" />
              {readout.p < 100 && (
                <div className="absolute left-0 right-0 h-1 bg-emerald-300 shadow-[0_0_12px_4px_rgba(110,231,183,0.7)]"
                  style={{ top: `${readout.p}%` }} />
              )}
            </div>
          )}
          <div className="w-64 md:w-96 h-3 rounded-full bg-slate-800 border border-slate-600 overflow-hidden">
            <div className="h-full bg-emerald-400 transition-all duration-100" style={{ width: `${readout.p}%` }} />
          </div>
          <p className="text-slate-500 text-xs tracking-widest">{Math.floor(readout.p)}%</p>
        </div>
      )}

      {shopOpen && <ShopOverlay state={state} update={update} onClose={() => setShopOpen(false)} />}
      {bookOpen && <BookOverlay state={state} update={update} onClose={() => setBookOpen(false)} />}
      {manualOpen && <ManualOverlay state={state} onClose={() => setManualOpen(false)} />}
    </div>
  )
}

/* ================= 白天经营 ================= */
function DayScreen({ state, update, onNextNight, onBadges }: { state: GameState; update: (f: (s: GameState) => GameState) => void; onNextNight: () => void; onBadges: () => void }) {
  const [msg, setMsg] = useState('')
  const [penalty, setPenalty] = useState('')
  const [shopOpen, setShopOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  // 昨夜机器状态太差被扣了废片成本，提示一次后清除
  useEffect(() => {
    if (state.flags['worn_penalty']) {
      setPenalty('昨夜机器状态太差，废片率超标，科里扣了 60 金币重拍成本——记得给老伙计保养。')
      update(s => { const f = { ...s.flags }; delete f['worn_penalty']; return { ...s, flags: f } })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const maintain = () => {
    if (state.gold < 50) { setMsg('金币不够，今晚多接几个病人吧。'); return }
    update(s => ({ ...s, gold: s.gold - 50, durability: Math.min(100, s.durability + 25), wealth: s.wealth + 1 }))
    setMsg('你给老伙计做了保养，它今晚的嗡嗡声都精神了些。（耐久+25）')
    playSfx('click')
  }
  return (
    <div className="relative w-full h-full overflow-y-auto">
      <BgImg name="bg_day" fixed />
      <div className="absolute inset-0 bg-slate-950/50" />
      <div className="relative z-10 min-h-full flex flex-col items-center py-8 px-4 gap-5">
        <h2 className="text-3xl text-amber-100 tracking-widest">白天 · 科室经营</h2>
        <div className="w-full max-w-2xl grid grid-cols-2 gap-3">
          <Panel title="💰 科室存款" value={`${state.gold} 金币`} />
          <Panel title="🔧 老X光机耐久" value={`${state.durability}%`} warn={state.durability < 40} />
          <Panel title="🩺 医术" value={meterLevel(state.skill)} />
          <Panel title="🤝 人心" value={meterLevel(state.heart)} />
          <Panel title="🏠 家业" value={meterLevel(state.wealth)} />
          <Panel title="📖 夜班日志" value={`${state.stamps.length} 夜`} />
        </div>

        <div className="w-full max-w-2xl bg-slate-900/90 border border-slate-600 rounded-xl p-5">
          <h3 className="text-amber-200 mb-3 tracking-wider">设备间</h3>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-slate-300">老伙计（CR · X光机）{state.durability < 40 ? '—— 它今天咳嗽得厉害，该保养了' : '—— 运转正常'}</span>
            <button onClick={maintain} className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-500 hover:border-amber-400">保养（-50金币）</button>
          </div>
          {msg && <p className="text-emerald-300 text-sm mt-2">{msg}</p>}
          {penalty && <p className="text-red-300 text-sm mt-2">⚠️ {penalty}</p>}
          {state.items.length > 0 && (
            <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-700">🎒 背包：{state.items.map(id => { const it = SHOP_ITEMS.find(x => x.id === id); return it ? `${it.icon}${it.name}` : id }).join('、')}</p>
          )}
          <div className="mt-4 pt-4 border-t border-slate-700 space-y-2 text-slate-500 text-sm">
            <p>🔒 二手超声 —— <span className="text-slate-400">第 3 章解锁</span></p>
            <p>🔒 CT 扫描仪 —— <span className="text-amber-400/70">老的那台还趴在机房等处置，听说设备科在跟收旧设备的贩子谈价钱……（第 2 章）</span></p>
            <p>🔒 3.0T 磁共振 —— <span className="text-slate-400">想什么呢，那是传闻里的东西</span></p>
            <p>🔒 楼上 DR 机房 —— <span className="text-slate-400">主任的命根子，夜间上锁，白班专科技师权限（DLC 预定）</span></p>
            <p>🔒 介入室 C型臂DSA —— <span className="text-slate-400">心内科做冠脉造影的宝贝，门都别挨（DLC 预定）</span></p>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap justify-center">
          <MenuBtn onClick={onNextNight} primary>🌙 进入第 {state.night} 夜</MenuBtn>
          <MenuBtn onClick={() => setShopOpen(true)}>🛒 小卖部</MenuBtn>
          <MenuBtn onClick={() => setManualOpen(true)}>📖 夜班手册</MenuBtn>
          <MenuBtn onClick={onBadges}>🏅 勋章墙</MenuBtn>
        </div>
        <p className="text-slate-500 text-xs">进度已自动保存，随时可以从标题界面继续</p>
      </div>
      {shopOpen && <ShopOverlay state={state} update={update} onClose={() => setShopOpen(false)} />}
      {manualOpen && <ManualOverlay state={state} onClose={() => setManualOpen(false)} />}
    </div>
  )
}

function Panel({ title, value, warn }: { title: string; value: string; warn?: boolean }) {
  return (
    <div className="bg-slate-900/90 border border-slate-600 rounded-xl p-4">
      <p className="text-xs text-slate-400 mb-1">{title}</p>
      <p className={`text-lg ${warn ? 'text-red-400 animate-pulse' : 'text-slate-100'}`}>{value}</p>
    </div>
  )
}

/* ================= 勋章墙 ================= */
function BadgeScreen({ state, onBack }: { state: GameState | null; onBack: () => void }) {
  const owned = state?.badges ?? []
  return (
    <div className="relative w-full h-full overflow-y-auto bg-amber-950">
      <div className="min-h-full flex flex-col items-center py-10 px-4 gap-6" style={{ background: 'radial-gradient(circle at 50% 30%, #78350f 0%, #451a03 70%)' }}>
        <h2 className="text-3xl text-amber-100 tracking-widest">🏅 勋章墙</h2>
        <p className="text-amber-200/60 text-sm">科室墙上的软木板 · 第一章 已收集 {owned.filter(id => BADGES[id]).length}/{Object.keys(BADGES).length}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl">
          {Object.entries(BADGES).map(([id, b]) => {
            const has = owned.includes(id)
            return (
              <div key={id} className={`w-36 p-4 rounded-xl border-2 flex flex-col items-center gap-2 text-center transition-all ${has ? 'bg-amber-100/95 border-amber-300 shadow-lg rotate-1' : 'bg-slate-900/70 border-slate-700'}`}>
                <span className={`text-4xl ${has ? '' : 'grayscale opacity-30'}`}>{b.icon}</span>
                <span className={`font-bold text-sm ${has ? 'text-amber-900' : 'text-slate-500'}`}>{has ? b.name : '？？？'}</span>
                <span className={`text-xs ${has ? 'text-amber-700' : 'text-slate-600'}`}>{has ? b.desc : '尚未解锁'}</span>
              </div>
            )
          })}
        </div>
        <h3 className="text-amber-200/80 tracking-widest mt-4">🌀 第二章 · 快与狠 · 已收集 {owned.filter(id => CH2_BADGES[id]).length}/{Object.keys(CH2_BADGES).length}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl">
          {Object.entries(CH2_BADGES).map(([id, b]) => {
            const has = owned.includes(id)
            return (
              <div key={id} className={`w-36 p-4 rounded-xl border-2 flex flex-col items-center gap-2 text-center transition-all ${has ? 'bg-teal-100/95 border-teal-300 shadow-lg rotate-1' : 'bg-slate-900/70 border-slate-700'}`}>
                <span className={`text-4xl ${has ? '' : 'grayscale opacity-30'}`}>{b.icon}</span>
                <span className={`font-bold text-sm ${has ? 'text-teal-900' : 'text-slate-500'}`}>{has ? b.name : '？？？'}</span>
                <span className={`text-xs ${has ? 'text-teal-700' : 'text-slate-600'}`}>{has ? b.desc : '尚未解锁'}</span>
              </div>
            )
          })}
        </div>
        <h3 className="text-amber-200/80 tracking-widest mt-4">📼 番外篇 · 已收集 {owned.filter(id => DLC_BADGES[id]).length}/{Object.keys(DLC_BADGES).length}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl">
          {Object.entries(DLC_BADGES).map(([id, b]) => {
            const has = owned.includes(id)
            return (
              <div key={id} className={`w-36 p-4 rounded-xl border-2 flex flex-col items-center gap-2 text-center transition-all ${has ? 'bg-sky-100/95 border-sky-300 shadow-lg -rotate-1' : 'bg-slate-900/70 border-slate-700'}`}>
                <span className={`text-4xl ${has ? '' : 'grayscale opacity-30'}`}>{b.icon}</span>
                <span className={`font-bold text-sm ${has ? 'text-sky-900' : 'text-slate-500'}`}>{has ? b.name : '？？？'}</span>
                <span className={`text-xs ${has ? 'text-sky-700' : 'text-slate-600'}`}>{has ? b.desc : '尚未解锁'}</span>
              </div>
            )
          })}
        </div>
        <MenuBtn onClick={onBack}>← 返回</MenuBtn>
      </div>
    </div>
  )
}

/* ================= 晨会考核（第5夜后 · 5题评级） ================= */
function QuizScreen({ state, update, onDone }: { state: GameState; update: (f: (s: GameState) => GameState) => void; onDone: () => void }) {
  const doneGrade = state.flags['quiz_grade'] as string | undefined
  // 20 题题库随机抽 5 题，选项乱序（组件挂载时一次性生成）
  const [qs] = useState(() => {
    const shuffled = [...QUIZ].sort(() => Math.random() - 0.5).slice(0, 5)
    return shuffled.map(q => {
      const order = q.options.map((_, i) => i).sort(() => Math.random() - 0.5)
      return { q: q.q, explain: q.explain, options: order.map(i => q.options[i]), answer: order.indexOf(q.answer) }
    })
  })
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(!!doneGrade)
  const rewarded = useRef(!!doneGrade)

  const gradeOf = (n: number) => n >= 5 ? 'S' : n === 4 ? 'A' : n === 3 ? 'B' : 'C'
  const gradeInfo: Record<string, { title: string; line: string; gold: number }> = {
    S: { title: 'S级 · 满分', gold: 250, line: '科长把卷子看了两遍：「全对？夜班能练出这个底子，难得。」老周在旁边哼了一声，嘴角却是翘着的。' },
    A: { title: 'A级 · 优秀', gold: 200, line: '科长点点头：「错一题，不错了。工资从下月起上调一档——夜班补贴也加上。」' },
    B: { title: 'B级 · 合格', gold: 80, line: '「合格线上站着呢。」科长把卷子还给你，「回去把错题对着课件再啃啃。」' },
    C: { title: 'C级 · 待补考', gold: 0, line: '老周替你解了围：「夜班活儿杂，实操没问题，理论回头我盯着他补。」……回去真得翻书了。' },
  }

  const finish = (finalScore: number) => {
    setFinished(true)
    if (rewarded.current) return
    rewarded.current = true
    const g = gradeOf(finalScore)
    update(s => {
      if (s.flags['quiz_grade']) return s
      let next = { ...s, flags: { ...s.flags, quiz_grade: g } }
      if (gradeInfo[g].gold > 0) next = { ...next, gold: next.gold + gradeInfo[g].gold }
      if (g === 'S' && !next.badges.includes('quiz_master')) next = { ...next, badges: [...next.badges, 'quiz_master'] }
      return next
    })
    playSfx('badge')
  }

  const pick = (i: number) => {
    if (picked !== null) return
    playSfx('click')
    setPicked(i)
    if (i === qs[idx].answer) setScore(s => s + 1)
  }

  const nextQ = () => {
    playSfx('click')
    if (idx + 1 >= qs.length) finish(score)
    else { setIdx(idx + 1); setPicked(null) }
  }

  const grade = gradeOf(doneGrade ? (doneGrade === 'S' ? 5 : doneGrade === 'A' ? 4 : doneGrade === 'B' ? 3 : 0) : score)
  const showGrade = doneGrade ?? grade

  return (
    <div className="relative w-full h-full overflow-y-auto">
      <BgImg name="bg_day" fixed />
      <div className="absolute inset-0 bg-slate-950/60" />
      <div className="relative z-10 min-h-full flex flex-col items-center justify-center px-4 py-10 gap-5">
        <p className="text-amber-300 tracking-[0.4em] text-sm">清晨 · 交接班晨会</p>
        {!finished ? (
          <div className="w-full max-w-2xl bg-slate-900/95 border-2 border-slate-600 rounded-xl p-6">
            <p className="text-slate-400 text-sm mb-1">一周的夜班结束了。交班前，科长和老周把你叫住——例行考核，五道题。</p>
            <p className="text-amber-200 text-xs mb-4 tracking-widest">第 {idx + 1} / {qs.length} 题 · 当前得分 {score}</p>
            <h3 className="text-lg text-slate-100 leading-relaxed mb-4">{qs[idx].q}</h3>
            <div className="flex flex-col gap-2">
              {qs[idx].options.map((op, i) => {
                const isAns = i === qs[idx].answer
                const cls = picked === null
                  ? 'bg-slate-800 border-slate-600 hover:border-amber-400 hover:bg-slate-700'
                  : isAns
                    ? 'bg-emerald-900/60 border-emerald-400'
                    : i === picked
                      ? 'bg-red-900/50 border-red-400'
                      : 'bg-slate-800/50 border-slate-700 opacity-50'
                return (
                  <button key={i} onClick={() => pick(i)}
                    className={`text-left px-4 py-2.5 rounded-lg border transition-all text-slate-100 ${cls}`}>
                    {op}
                  </button>
                )
              })}
            </div>
            {picked !== null && (
              <div className="mt-4 choice-in">
                <p className={`text-sm leading-relaxed ${picked === qs[idx].answer ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {picked === qs[idx].answer ? '✓ 答对了。' : '✗ 答错了。'}{qs[idx].explain}
                </p>
                <button onClick={nextQ} className="mt-3 w-full py-2.5 rounded-lg bg-amber-500 text-slate-950 font-bold tracking-widest hover:bg-amber-400">
                  {idx + 1 >= qs.length ? '查看成绩 →' : '下一题 →'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full max-w-md bg-slate-900/95 border-2 border-amber-500/50 rounded-xl p-8 text-center choice-in">
            <p className="text-slate-400 text-sm mb-2">晨会考核 · 成绩</p>
            <p className={`text-7xl font-black mb-2 ${showGrade === 'S' || showGrade === 'A' ? 'text-amber-300' : showGrade === 'B' ? 'text-sky-300' : 'text-slate-400'}`}>{showGrade}</p>
            <p className="text-amber-200 mb-4">{gradeInfo[showGrade].title}</p>
            <p className="text-slate-300 text-sm leading-relaxed text-left">{gradeInfo[showGrade].line}</p>
            {gradeInfo[showGrade].gold > 0 && (
              <p className="mt-3 text-emerald-300">💰 涨工资了！奖金 +{gradeInfo[showGrade].gold} 金币</p>
            )}
            {showGrade === 'S' && <p className="mt-1 text-amber-300">🎓 获得勋章「学霸技师」</p>}
            {showGrade === 'C' && <p className="mt-3 text-slate-400 text-xs">（提示：知识点都在这门课的课件里，翻一翻再来过——重新开始可以重考）</p>}
            <button onClick={() => { update(s => ({ ...s, screenHint: 'night' as const, stepId: 'n5_epi0' })); onDone() }}
              className="mt-6 w-full py-3 rounded-lg bg-amber-500 text-slate-950 font-bold tracking-widest hover:bg-amber-400">
              去领通关凭证 →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ================= 章末 + 通关凭证 ================= */
function ChapterEndScreen({ state, update, onBadges, onRestart, onDlc, onHome }: { state: GameState; update: (f: (s: GameState) => GameState) => void; onBadges: () => void; onRestart: () => void; onDlc: () => void; onHome: () => void }) {
  const [name, setName] = useState(state.playerName ?? '')
  const [sid, setSid] = useState(state.playerId ?? '')
  const issued = !!(state.playerName && state.playerId)
  const code = issued ? makeCredCode(state, state.playerName!, state.playerId!) : ''

  const issue = () => {
    if (!name.trim() || !sid.trim()) return
    update(s => ({ ...s, playerName: name.trim(), playerId: sid.trim() }))
    playSfx('stamp')
  }

  const maxStat = Math.max(state.skill, state.wealth, state.heart)
  const endingLine =
    state.skill === maxStat && state.skill >= 6
      ? '这一周的夜班，你把「为什么」追到了底：每一千伏、每一毫安秒背后的物理，你都说得出个所以然。老周说，你身上有工程师的眼睛。'
      : state.wealth === maxStat && state.wealth >= 4
        ? '这一周的夜班，你把科室的账本和老伙计的脾气都摸熟了。设备科老范说，以后科里置办家当，得带上你。'
        : state.heart === maxStat && state.heart >= 6
          ? '这一周的夜班，记住你的不只是机器——急诊的小何、信息科的小雷、还有那位桥洞下的老人。片子是黑白的，人心是热的。'
          : '这一周的夜班平平淡淡地过去了——但你知道，有些东西已经不一样了。'

  return (
    <div className="relative w-full h-full overflow-y-auto">
      <BgImg name="bg_control" fixed />
      <div className="absolute inset-0 bg-slate-950/75" />
      <div className="relative z-10 min-h-full flex flex-col items-center justify-center gap-5 px-4 py-10 text-center">
        <p className="text-amber-300 tracking-[0.5em] text-sm">第一章 · 完</p>
        <h2 className="text-4xl text-amber-100 tracking-widest">老伙计的荣耀</h2>
        <div className="bg-slate-900/90 border border-amber-500/40 rounded-xl p-6 max-w-lg">
          <p className="text-slate-300 leading-relaxed">
            {state.flags['quiz_grade'] === 'S' && '晨会考核满分，科长当着全科的面给你涨了工资。'}
            {state.flags['quiz_grade'] === 'A' && '晨会考核拿了A，工资上调了一档。'}
            {state.flags['quiz_grade'] === 'B' && '晨会考核B级，堪堪合格。'}
            {state.flags['quiz_grade'] === 'C' && '晨会考核挂了科，老周让你把课件再啃一遍。'}
            五个夜班，{state.gold} 金币存款，{state.badges.length} 枚勋章。{endingLine}
          </p>
          <p className="text-slate-400 mt-3 text-sm">
            {state.flags['archive_sealed']
              ? '旧片库深处，那个贴着封条的柜子还在等你——封条上的「周」字，和那个男人寻找的父亲，也许会被同一束X光照亮。'
              : '旧片库的那扇门后，似乎还有你没走到的地方……'}{' '}
            而那扇观察窗后面，趴窝的老CT依然黑着——「听说设备科在跟收旧设备的贩子谈价钱……」
          </p>
        </div>

        {/* 通关凭证 */}
        {issued ? (
          <div className="bg-amber-50 text-amber-950 rounded-xl p-6 max-w-md w-full border-4 border-amber-700 shadow-2xl relative rotate-[-0.5deg]">
            <img src={IMG('stamp')} className="absolute right-4 top-4 w-20 h-20 opacity-90 rotate-[-12deg] pixel" alt="" />
            <p className="text-xs tracking-widest text-amber-700 mb-1">深夜影像科 · 第一章通关凭证</p>
            <p className="text-xl font-bold mb-3">{state.playerName} <span className="text-sm font-normal text-amber-800">学号 {state.playerId}</span></p>
            <p className="text-sm text-left leading-relaxed">
              已完成第一章「老伙计」全部五个夜班<br />
              战绩：💰{state.gold} 金币 · 🏅{state.badges.length} 枚勋章 · 📖{state.stamps.length} 夜<br />
              {typeof state.flags['quiz_grade'] === 'string' && <>晨会考核评级：<span className="font-bold text-base">{state.flags['quiz_grade']} 级</span></>}
            </p>
            <p className="mt-3 font-mono text-lg tracking-widest bg-amber-200/70 rounded py-1">{code}</p>
            <p className="text-xs text-amber-700 mt-2">截图本凭证提交给老师 · 凭证码可被「教师验证入口」校验</p>
          </div>
        ) : (
          <div className="bg-slate-900/90 border border-amber-500/40 rounded-xl p-6 max-w-md w-full">
            <p className="text-amber-200 mb-3 tracking-wider">📜 领取你的通关凭证（提交作业用）</p>
            <div className="flex flex-col gap-2" onClick={e => e.stopPropagation()}>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="姓名"
                className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 focus:border-amber-400 outline-none" />
              <input value={sid} onChange={e => setSid(e.target.value)} placeholder="学号"
                className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 focus:border-amber-400 outline-none" />
              <button onClick={issue} disabled={!name.trim() || !sid.trim()}
                className="py-2.5 rounded-lg bg-amber-500 text-slate-950 font-bold tracking-widest disabled:opacity-40 hover:bg-amber-400 transition-all">
                盖章发证
              </button>
            </div>
          </div>
        )}

        <p className="text-amber-200/80">🌀 第二章「快与狠」CT篇已上线 —— 内容大厅内凭章节口令进入</p>
        <div className="flex gap-3 flex-wrap justify-center">
          {/* 晨会考核 A/S 才解锁番外篇直达；否则只能回首页 */}
          {(state.flags['quiz_grade'] === 'S' || state.flags['quiz_grade'] === 'A') ? (
            <MenuBtn onClick={onDlc} primary>🗂️ 内容大厅</MenuBtn>
          ) : (
            <MenuBtn onClick={onHome} primary>🏠 返回首页</MenuBtn>
          )}
          <MenuBtn onClick={onBadges}>🏅 查看勋章墙</MenuBtn>
          <MenuBtn onClick={onRestart}>↺ 重新开始</MenuBtn>
        </div>
        {!(state.flags['quiz_grade'] === 'S' || state.flags['quiz_grade'] === 'A') && (
          <p className="text-slate-500 text-xs">（晨会考核拿到 A 或 S，可解锁内容大厅直达通道）</p>
        )}
        <p className="text-slate-500 text-xs">试玩反馈入口：把bug或建议告诉老师即可 · 数据保存在本浏览器</p>
      </div>
    </div>
  )
}

/* ================= 教师验证 ================= */
function VerifyScreen({ onBack }: { onBack: () => void }) {
  const [name, setName] = useState('')
  const [sid, setSid] = useState('')
  const [gold, setGold] = useState('')
  const [badges, setBadges] = useState('')
  const [stamps, setStamps] = useState('')
  const [code, setCode] = useState('')
  const [result, setResult] = useState<null | boolean>(null)

  const verify = () => {
    const ok = verifyCredCode(code, name.trim(), sid.trim(), parseInt(gold) || 0, parseInt(badges) || 0, parseInt(stamps) || 0)
    setResult(ok)
    playSfx(ok ? 'badge' : 'click')
  }

  return (
    <div className="relative w-full h-full overflow-y-auto">
      <BgImg name="bg_day" fixed />
      <div className="absolute inset-0 bg-slate-950/70" />
      <div className="relative z-10 min-h-full flex flex-col items-center justify-center px-4 py-10 gap-4">
        <h2 className="text-2xl text-amber-100 tracking-widest">通关凭证 · 教师验证</h2>
        <p className="text-slate-400 text-sm max-w-md text-center">输入学生凭证卡上的信息，校验是否为本游戏真实生成的通关记录</p>
        <div className="bg-slate-900/90 border border-slate-600 rounded-xl p-6 w-full max-w-md flex flex-col gap-2">
          {([['姓名', name, setName], ['学号', sid, setSid], ['金币数', gold, setGold], ['勋章数', badges, setBadges], ['夜班数（日志）', stamps, setStamps], ['通关码（YSK-XXXXX-XXXX）', code, setCode]] as const).map(([label, val, set]) => (
            <input key={label} value={val} onChange={e => { set(e.target.value); setResult(null) }} placeholder={label}
              className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 focus:border-amber-400 outline-none" />
          ))}
          <button onClick={verify} className="mt-2 py-2.5 rounded-lg bg-amber-500 text-slate-950 font-bold tracking-widest hover:bg-amber-400">校验</button>
          {result === true && <p className="text-emerald-300 text-center mt-2">✅ 校验通过——这是真实的第一章通关记录</p>}
          {result === false && <p className="text-red-400 text-center mt-2">❌ 校验失败——信息被修改过，或并非本游戏生成</p>}
        </div>
        <MenuBtn onClick={onBack}>← 返回标题</MenuBtn>
      </div>
    </div>
  )
}


/* ================= DLC 公用 · 富文本（**重点** 高亮，兼容打字机逐字截断） ================= */
function RichText({ text, shown }: { text: string; shown?: number }) {
  const segs: { t: string; b: boolean }[] = []
  text.split('**').forEach((p, i) => { if (p) segs.push({ t: p, b: i % 2 === 1 }) })
  let remain = shown ?? Number.MAX_SAFE_INTEGER
  return (
    <>
      {segs.map((s, i) => {
        if (remain <= 0) return null
        const vis = s.t.slice(0, remain)
        remain -= s.t.length
        return s.b
          ? <span key={i} className="text-amber-300 font-bold">{vis}</span>
          : <span key={i}>{vis}</span>
      })}
    </>
  )
}

/* ================= DLC 公用 · 夜班手册（知识卡片 / 证物回看 / 大事记） ================= */
function ManualOverlay({ state, onClose }: { state: GameState; onClose: () => void }) {
  const [tab, setTab] = useState<'cards' | 'evidence' | 'events'>('cards')
  const cards = state.cards ?? []
  const evList = Object.entries(EVIDENCE).filter(([, e]) => state.flags[e.flag])
  const chronList = Object.entries(EVENTS).filter(([id, e]) =>
    (e.flag && state.flags[e.flag]) || (state.events ?? []).includes(id) || (id === 'ch1_five_nights' && state.finished))
  const tabBtn = (id: typeof tab, label: string, n: number) => (
    <button onClick={() => { playSfx('click'); setTab(id) }}
      className={`flex-1 py-2 rounded-lg text-sm tracking-wider border ${tab === id ? 'bg-amber-500/90 text-slate-950 border-amber-300 font-bold' : 'bg-slate-800 text-slate-300 border-slate-600 hover:border-amber-400'}`}>
      {label} · {n}
    </button>
  )
  return (
    <div className="fixed inset-0 z-40 bg-slate-950/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border-2 border-amber-500/50 rounded-2xl p-5 max-w-lg w-full max-h-[85%] flex flex-col" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl text-amber-200 tracking-widest mb-3 shrink-0">📖 夜班手册</h3>
        <div className="flex gap-2 mb-3 shrink-0">
          {tabBtn('cards', '知识卡片', cards.length)}
          {tabBtn('evidence', '证物回看', evList.length)}
          {tabBtn('events', '大事记', chronList.length)}
        </div>
        <div className="overflow-y-auto min-h-0 flex flex-col gap-2 pr-1">
          {tab === 'cards' && (cards.length === 0
            ? <p className="text-slate-500 text-sm py-6 text-center">还没有收集到知识卡片——剧情里带标记的知识点会自动收入这里。</p>
            : cards.map(id => {
                const c = CARDS[id]
                if (!c) return null
                return (
                  <div key={id} className="bg-slate-800/80 border border-slate-600 rounded-lg p-3 flex gap-3 items-start">
                    {c.image && <img src={IMG(c.image)} className="w-16 h-16 object-contain pixel shrink-0 rounded border border-slate-700 bg-slate-950" alt="" />}
                    <div>
                      <p className="text-amber-200 text-sm font-bold mb-1">🎓 {c.title}</p>
                      <p className="text-slate-300 text-xs leading-relaxed">{c.body}</p>
                    </div>
                  </div>
                )
              }))}
          {tab === 'evidence' && (evList.length === 0
            ? <p className="text-slate-500 text-sm py-6 text-center">证物柜还空着。有些物件，要在故事里亲手拿到才会收进来。</p>
            : evList.map(([id, e]) => (
                <div key={id} className="bg-slate-800/80 border border-slate-600 rounded-lg p-3 flex gap-3 items-start">
                  {e.image && <img src={IMG(e.image)} className="w-14 h-14 object-contain pixel shrink-0 rounded border border-slate-700 bg-slate-900" alt="" />}
                  <div>
                    <p className="text-sky-200 text-sm font-bold mb-1">🗂️ {e.title}</p>
                    <p className="text-slate-300 text-xs leading-relaxed">{e.body}</p>
                  </div>
                </div>
              )))}
          {tab === 'events' && (chronList.length === 0
            ? <p className="text-slate-500 text-sm py-6 text-center">大事记还没有落笔。</p>
            : chronList.map(([id, e]) => (
                <div key={id} className="bg-slate-800/80 border border-slate-600 rounded-lg p-3">
                  <p className="text-xs text-emerald-300 tracking-wider mb-0.5">{e.time}</p>
                  <p className="text-slate-100 text-sm font-bold mb-1">{e.title}</p>
                  <p className="text-slate-400 text-xs leading-relaxed">{e.body}</p>
                </div>
              )))}
        </div>
        <button onClick={() => { playSfx('click'); onClose() }} className="mt-4 w-full py-2 rounded-lg bg-slate-800 border border-slate-600 hover:border-amber-400 text-slate-200 shrink-0">合上手册</button>
      </div>
    </div>
  )
}

/* ================= DLC·DSA · 踩踏板时序配合 ================= */
function PedalOverlay({ pedal, onResult }: { pedal: NonNullable<Step['pedal']>; onResult: (r: 'success' | 'early' | 'late') => void }) {
  const [pos, setPos] = useState(0)
  const firedRef = useRef(false)
  const posRef = useRef(0)
  useEffect(() => {
    const start = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = (t - start) / pedal.durationMs
      if (p >= 1) {
        if (!firedRef.current) { firedRef.current = true; onResult('late') }
        return
      }
      posRef.current = p
      setPos(p)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const press = () => {
    if (firedRef.current) return
    firedRef.current = true
    const p = posRef.current
    if (p >= pedal.windowStart && p <= pedal.windowEnd) onResult('success')
    else if (p < pedal.windowStart) onResult('early')
    else onResult('late')
  }
  return (
    <div className="absolute inset-0 z-40 bg-slate-950/85 flex flex-col items-center justify-center gap-6 px-6" onClick={e => e.stopPropagation()}>
      <p className="text-cyan-300 tracking-[0.4em] text-sm animate-pulse">🦵 采集时机配合</p>
      <p className="text-slate-300 text-sm">扫描条进入<span className="text-emerald-300 font-bold">绿色窗口</span>的瞬间踩下踏板——和术者的口令严丝合缝</p>
      <div className="relative w-full max-w-xl h-8 rounded-full bg-slate-800 border-2 border-slate-600 overflow-hidden">
        <div className="absolute top-0 bottom-0 bg-emerald-500/50 border-x-2 border-emerald-300"
          style={{ left: `${pedal.windowStart * 100}%`, width: `${(pedal.windowEnd - pedal.windowStart) * 100}%` }} />
        <div className="absolute top-0 bottom-0 w-1.5 bg-amber-300 shadow-[0_0_10px_3px_rgba(251,191,36,0.8)]"
          style={{ left: `${pos * 100}%` }} />
      </div>
      <button onClick={press}
        className="w-40 h-40 rounded-full bg-gradient-to-b from-slate-600 to-slate-800 border-4 border-slate-400 text-3xl tracking-widest text-slate-100 shadow-2xl hover:border-amber-300 active:scale-95 active:border-emerald-300 transition-all">
        踩！
      </button>
      <p className="text-slate-500 text-xs">踩早、踩晚都要重采——重采意味着病人多吃一份剂量</p>
    </div>
  )
}

/* ================= DLC·DR · 候诊队列调度 ================= */
function QueueGame({ state, update, onDone }: { state: GameState; update: (f: (s: GameState) => GameState) => void; onDone: () => void }) {
  const prog = state.dlc?.['dr'] ?? {}
  const [served, setServed] = useState<string[]>(prog.served ?? [])
  const [gone, setGone] = useState<string[]>(prog.gone ?? [])
  const [aiChoices, setAiChoices] = useState<Record<string, boolean>>(prog.aiChoices ?? {})
  const [phase, setPhase] = useState<'pick' | 'exam' | 'outcome' | 'event'>('pick')
  const [cur, setCur] = useState<QueuePatient | null>(null)
  const [outcome, setOutcome] = useState('')
  const [eventQueue, setEventQueue] = useState<string[]>([])

  const patchDr = (s: GameState, patch: Partial<DlcProgress>): GameState => ({
    ...s,
    dlc: { ...(s.dlc ?? {}), dr: { ...(s.dlc?.['dr'] ?? {}), ...patch } },
  })

  const remaining = DR_QUEUE.filter(p => !served.includes(p.id) && !gone.includes(p.id))
  const waits = queueWaits(served)

  // 恢复存档时若队列已清空（上次在结算前离开），直接收尾
  const emptyChecked = useRef(false)
  useEffect(() => {
    if (emptyChecked.current) return
    emptyChecked.current = true
    if (remaining.length === 0) onDone()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const decide = (trust: boolean) => {
    if (!cur) return
    playSfx('click')
    const ns = [...served, cur.id]
    const na = { ...aiChoices, [cur.id]: trust }
    setServed(ns)
    setAiChoices(na)
    setOutcome(trust ? cur.exam.trustText : cur.exam.distrustText)
    update(s => patchDr(s, { served: ns, aiChoices: na }))
    setPhase('outcome')
  }

  const afterOutcome = () => {
    playSfx('click')
    // 检查等待过久导致的病情恶化
    const w = queueWaits(served)
    const incidents = DR_QUEUE.filter(p =>
      !served.includes(p.id) && !gone.includes(p.id) && p.tolerance < 99 && w[p.id] > p.tolerance)
    if (incidents.length > 0) {
      const ng = [...gone, ...incidents.map(p => p.id)]
      setGone(ng)
      setEventQueue(incidents.map(p => p.deteriorate!.text))
      const heartLoss = incidents.reduce((a, p) => a + (p.deteriorate?.heart ?? 0), 0)
      update(s => applyEffect(patchDr(s, { gone: ng }), { flag: 'dr_incident', heart: heartLoss }))
      setPhase('event')
      return
    }
    if (remaining.length === 0) { onDone(); return }
    setPhase('pick')
  }

  const afterEvent = () => {
    playSfx('click')
    if (eventQueue.length > 1) { setEventQueue(eventQueue.slice(1)); return }
    setEventQueue([])
    if (DR_QUEUE.filter(p => !served.includes(p.id) && !gone.includes(p.id)).length === 0) { onDone(); return }
    setPhase('pick')
  }

  return (
    <div className="absolute inset-0 z-40 bg-slate-950/90 flex flex-col items-center justify-center p-4" onClick={e => e.stopPropagation()}>
      <div className="w-full max-w-3xl max-h-full overflow-y-auto bg-slate-900/95 border-2 border-amber-500/40 rounded-2xl p-4 md:p-6">
        {phase === 'pick' && (
          <>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-amber-200 tracking-widest">🪑 候诊队列 · 先做谁，你说了算</h3>
              <span className="text-xs text-slate-400">已接诊 {served.length}/{DR_QUEUE.length}</span>
            </div>
            <p className="text-xs text-slate-500 mb-3">每台检查 15 分钟。有人等得起，有人等不起——申请单上都写着。</p>
            <div className="flex flex-col gap-2">
              {remaining.map(p => {
                const w = waits[p.id]
                const left = p.tolerance < 99 ? p.tolerance - w : null
                const danger = left !== null && left <= 0
                return (
                  <button key={p.id} onClick={() => { playSfx('click'); setCur(p); setPhase('exam') }}
                    className={`flex items-center gap-3 text-left rounded-lg border p-3 transition-all hover:scale-[1.01] ${danger ? 'bg-red-950/60 border-red-500 animate-pulse' : 'bg-slate-800/80 border-slate-600 hover:border-amber-400'}`}>
                    <span className={`text-xs px-2 py-1 rounded font-bold shrink-0 ${p.tag === '急诊' ? 'bg-red-700/80 text-red-100' : p.tag === '加急' ? 'bg-orange-700/80 text-orange-100' : p.tag === '体检' ? 'bg-slate-600 text-slate-200' : 'bg-sky-800/80 text-sky-100'}`}>{p.tag}</span>
                    <span className="flex-1 min-w-0">
                      <span className="text-slate-100 text-sm">{p.name} · {p.age}</span>
                      <span className="block text-xs text-slate-400 truncate">{p.info}</span>
                    </span>
                    {left !== null && (
                      <span className={`text-xs shrink-0 ${danger ? 'text-red-300 font-bold' : left === 1 ? 'text-amber-300' : 'text-slate-500'}`}>
                        {danger ? '⚠️ 等不起了' : `已等 ${w} 台 · 还能等 ${left} 台`}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {phase === 'exam' && cur && (
          <>
            <p className="text-xs text-slate-400 mb-2">{cur.tag} · {cur.name} · {cur.age} · {cur.info}</p>
            <div className="flex flex-col md:flex-row gap-4">
              <img src={IMG(cur.exam.image)} className="w-44 h-44 md:w-52 md:h-52 object-contain pixel rounded-lg border-2 border-slate-600 bg-slate-950 shrink-0 mx-auto" alt="影像" />
              <div className="flex-1 min-w-0">
                <p className="text-slate-200 text-sm leading-relaxed mb-3">📝 你的判读：<RichText text={cur.exam.finding} /></p>
                <div className="bg-indigo-950/70 border border-indigo-500/50 rounded-lg p-3 mb-3">
                  <p className="text-indigo-300 text-xs tracking-widest mb-1">🤖 AI 辅诊 · 厂家试用版</p>
                  <p className="text-slate-100 text-sm">{cur.exam.aiSuggestion}</p>
                  <p className="text-indigo-400/80 text-xs mt-1">置信度 {cur.exam.aiConfidence}</p>
                </div>
                <p className="text-slate-500 text-xs mb-3">邵姐的话在耳边：它过筛，你把关。</p>
                <div className="flex flex-col gap-2">
                  <button onClick={() => decide(true)} className="px-4 py-2.5 rounded-lg bg-indigo-700/80 border border-indigo-400 text-slate-100 text-sm hover:bg-indigo-600">采纳 AI 初诊</button>
                  <button onClick={() => decide(false)} className="px-4 py-2.5 rounded-lg bg-slate-800 border border-amber-400/70 text-amber-200 text-sm hover:bg-slate-700">信不过，按我自己的判读发报告</button>
                </div>
              </div>
            </div>
          </>
        )}

        {phase === 'outcome' && (
          <>
            <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap"><RichText text={outcome} /></p>
            <button onClick={afterOutcome} className="mt-4 w-full py-2.5 rounded-lg bg-amber-500/90 text-slate-950 font-bold tracking-widest hover:bg-amber-400">继续 →</button>
          </>
        )}

        {phase === 'event' && eventQueue.length > 0 && (
          <>
            <p className="text-red-400 text-xs tracking-widest mb-2">⚠️ 候诊区突发</p>
            <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap"><RichText text={eventQueue[0]} /></p>
            <button onClick={afterEvent} className="mt-4 w-full py-2.5 rounded-lg bg-red-700/80 text-red-50 font-bold tracking-widest hover:bg-red-600">继续 →</button>
          </>
        )}
      </div>
    </div>
  )
}


/* ================= DLC 番外篇 · 剧情引擎（独立实现，不触碰第一章 NightScreen） ================= */
function ScriptScreen({ dlc, state, update, onExit }: { dlc: DlcDef; state: GameState; update: (f: (s: GameState) => GameState) => void; onExit: () => void }) {
  const prog = state.dlc?.[dlc.id] ?? {}
  const resumeStep = !prog.done && prog.stepId && dlc.steps[prog.stepId] ? prog.stepId : dlc.start
  const [stepId, setStepId] = useState(resumeStep)
  const [view, setView] = useState<{ bg: string; sprite?: string; sprite2?: string }>({
    bg: prog.viewBg ?? 'bg_control', sprite: prog.viewSprite, sprite2: prog.viewSprite2,
  })
  const viewRef = useRef(view)
  const applied = useRef<Set<string>>(new Set())
  const mountStep = useRef(resumeStep)
  const skipDoseOnce = useRef(true)
  const [shown, setShown] = useState(0)
  const [choicesLocked, setChoicesLocked] = useState(false)
  const [queueOpen, setQueueOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [badgeOpen, setBadgeOpen] = useState(false)
  const lastTapAt = useRef(0)
  const prevTapAt = useRef(0)
  const finishFired = useRef(false)

  const step: Step = dlc.steps[stepId] ?? { end: true }
  const fullText = step.text ?? ''
  const plainLen = fullText.replaceAll('**', '').length
  const done = shown >= plainLen

  const [prevStepId, setPrevStepId] = useState(stepId)
  if (prevStepId !== stepId) {
    setPrevStepId(stepId)
    setShown(0)
    if (step.choices) setChoicesLocked(true)
  }

  const updProg = (s: GameState, patch: Partial<DlcProgress>): GameState => ({
    ...s,
    dlc: { ...(s.dlc ?? {}), [dlc.id]: { ...(s.dlc?.[dlc.id] ?? {}), ...patch } },
  })

  // 进入某一步：视图 / 效果 / 语音 / 剂量 / 卡片 / 大事记 / 存档
  useEffect(() => {
    const key = `${dlc.id}-${stepId}`
    const already = applied.current.has(key)
    applied.current.add(key)
    const heardKey = (n: string) => `heard_vp3_${n}`
    const sfxList = [step.sfx, step.sfx2].filter((n): n is NonNullable<typeof n> => !!n)
    const freshVox = sfxList.filter(n => n.startsWith('vox_') && !state.flags[heardKey(n)])
    if (!already) sfxList.forEach(n => { if (!n.startsWith('vox_') || freshVox.includes(n)) playSfx(n as Parameters<typeof playSfx>[0]) })
    const cur = viewRef.current
    const impliedSprite =
      step.sprite ??
      (step.speaker === 'me'
        ? 'me'
        : step.speaker && cur.sprite === `char_${step.speaker}`
          ? cur.sprite
          : undefined)
    const newView = { bg: step.bg ?? cur.bg, sprite: impliedSprite, sprite2: step.sprite2 }
    viewRef.current = newView
    setView(newView)
    const isMountResume = skipDoseOnce.current && stepId === mountStep.current
    skipDoseOnce.current = false
    const newCard = step.card && !(state.cards ?? []).includes(step.card) ? step.card : undefined
    update(s => {
      let next = !already && step.effect ? applyEffect(s, step.effect) : s
      if (!already && freshVox.length > 0) {
        const f = { ...next.flags }
        freshVox.forEach(n => { f[heardKey(n)] = true })
        next = { ...next, flags: f }
      }
      // DSA 剂量累积：重采步骤会多次进入，每次都要计；仅跳过挂载时的恢复步避免读档重复加
      if (step.dose && !isMountResume) {
        const p = next.dlc?.[dlc.id] ?? {}
        next = updProg(next, { dose: (p.dose ?? 0) + step.dose })
      }
      if (newCard) next = { ...next, cards: [...(next.cards ?? []), newCard] }
      if (step.event && !(next.events ?? []).includes(step.event)) {
        next = { ...next, events: [...(next.events ?? []), step.event] }
      }
      next = updProg(next, { stepId, viewBg: newView.bg, viewSprite: newView.sprite, viewSprite2: newView.sprite2 })
      return next
    })
    // 卡片 toast 由 App 层全局监听 cards 差分统一弹出（NightScreen 每步重挂载，局部 toast 存不住）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepId])

  // 打字机
  useEffect(() => {
    if (done) return
    const t = setInterval(() => setShown(s => Math.min(s + 1, plainLen)), 28)
    return () => clearInterval(t)
  }, [stepId, done, plainLen])

  // 选项缓冲，防误触
  useEffect(() => {
    if (!step.choices || !done) return
    const t = setTimeout(() => setChoicesLocked(false), 900)
    return () => clearTimeout(t)
  }, [stepId, done, step.choices])

  const advance = () => {
    if (step.choices || step.end || queueOpen || manualOpen || badgeOpen || step.pedal) return
    if (!done) { setShown(plainLen); return }
    if (step.next === '@queue') { playSfx('click'); setQueueOpen(true); return }
    if (step.next) { playSfx('click'); setStepId(step.next) }
  }

  const pick = (c: Choice) => {
    if (choicesLocked) return
    if (Date.now() - prevTapAt.current < 300) return
    playSfx('click')
    if (c.effect) update(s => applyEffect(s, c.effect))
    if (c.risk && Math.random() < c.risk.chance) {
      if (c.risk.effect) update(s => applyEffect(s, c.risk!.effect))
      setStepId(c.risk.next)
      return
    }
    setStepId(c.next)
  }

  // DSA 踏板结果
  const pedalResult = (r: 'success' | 'early' | 'late') => {
    const p = step.pedal!
    playSfx(r === 'success' ? 'xray' : 'buzz')
    update(s => {
      const pr = s.dlc?.[dlc.id] ?? {}
      const patch: Partial<DlcProgress> = { pedalTry: (pr.pedalTry ?? 0) + 1 }
      if (r === 'success') {
        patch.pedalOk = (pr.pedalOk ?? 0) + 1
        patch.dose = (pr.dose ?? 0) + p.dose
      }
      return updProg(s, patch)
    })
    setStepId(r === 'success' ? p.success : r === 'early' ? p.tooEarly : p.tooLate)
  }

  // 本篇完结：结算条件勋章
  const finish = () => {
    if (finishFired.current) return
    finishFired.current = true
    update(s => {
      let next = updProg(s, { done: true, stepId: undefined })
      const pr = next.dlc?.[dlc.id] ?? {}
      const add = (b: string) => { if (!next.badges.includes(b)) next = { ...next, badges: [...next.badges, b] } }
      if (dlc.id === 'dr') {
        if (!next.flags['dr_incident']) add('dlc_dr_zero')
        const allCorrect = DR_QUEUE.every(p => pr.aiChoices && pr.aiChoices[p.id] !== undefined && pr.aiChoices[p.id] === p.exam.aiCorrect)
        if (allCorrect) add('dlc_dr_ai')
      }
      if (dlc.id === 'dsa') {
        if ((pr.dose ?? 0) <= 800) add('dlc_dsa_dose')
        const trys = pr.pedalTry ?? 0, oks = pr.pedalOk ?? 0
        if (trys > 0 && trys === oks) add('dlc_dsa_perfect')
        if (trys - oks <= 1) add('dlc_dsa_time')
      }
      return next
    })
    playSfx('badge')
    setTimeout(onExit, 1500)
  }

  const spriteOf = (key?: string) => {
    if (!key) return null
    if (key === 'me') return IMG(state.gender === 'f' ? 'char_f' : 'char_m')
    return IMG(key)
  }
  const leftSprite = spriteOf(view.sprite)
  const rightSprite = spriteOf(view.sprite2)
  const speakerMeta = step.speaker ? CHARACTERS[step.speaker] : undefined
  const visibleChoices = (step.choices ?? []).filter(c => condOk(state, c.cond))
  const dose = state.dlc?.[dlc.id]?.dose ?? 0

  return (
    <div className="relative w-full h-full cursor-pointer" onClickCapture={() => { prevTapAt.current = lastTapAt.current; lastTapAt.current = Date.now() }} onClick={advance}>
      <BgImg name={view.bg} />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-slate-950/80 to-transparent pointer-events-none" />

      {/* 顶部信息条 */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between flex-wrap gap-y-1 px-4 py-2 bg-slate-950/70 text-xs md:text-sm">
        <span className="text-amber-200 tracking-widest whitespace-nowrap">{dlc.icon} {dlc.title}</span>
        <span className="text-slate-300 flex items-center gap-2 md:gap-3 flex-wrap justify-end">
          <span>💰 {state.gold}</span>
          {dlc.id === 'dsa' && (
            <span className={dose > 800 ? 'text-red-400 font-bold animate-pulse' : dose > 600 ? 'text-amber-300' : 'text-slate-300'}>
              ☢️ {dose} mGy
            </span>
          )}
          <button onClick={e => { e.stopPropagation(); playSfx('click'); setManualOpen(true) }}
            className="text-xs text-slate-400 hover:text-amber-300 border border-slate-700 rounded px-2 py-0.5">
            📖 手册
          </button>
          <button onClick={e => { e.stopPropagation(); playSfx('click'); setBadgeOpen(true) }}
            className="text-xs text-slate-400 hover:text-amber-300 border border-slate-700 rounded px-2 py-0.5">
            🏅 勋章
          </button>
          <FullscreenBtn />
          <button onClick={e => { e.stopPropagation(); playSfx('click'); onExit() }}
            className="text-xs text-slate-400 hover:text-amber-300 border border-slate-700 rounded px-2 py-0.5" title="进度已自动保存，可随时离开">
            💾 回大厅
          </button>
        </span>
      </div>

      {/* 电话来电头像 */}
      {step.phone && (
        <div className="absolute top-12 right-4 portrait:top-[4.5rem] portrait:right-2 portrait:px-2 portrait:py-1 portrait:gap-2 z-30 flex items-center gap-3 bg-slate-900/90 border-2 border-emerald-600 rounded-xl px-3 py-2 shadow-2xl">
          <div className="portrait:w-10 portrait:h-10 w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden border-2 border-emerald-400 bg-slate-800 shrink-0">
            <img src={IMG(step.phone)} className="w-full h-full object-cover object-top pixel" alt="来电" />
          </div>
          <div className="text-left">
            <p className="text-emerald-300 text-xs md:text-sm tracking-widest animate-pulse">📞 通话中</p>
            <p className="text-slate-400 text-xs">外线 · 院内电话</p>
          </div>
        </div>
      )}

      {/* 中央大图 */}
      {step.image && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none pb-40">
          <img src={IMG(step.image)} className="max-h-[45%] portrait:max-h-[38%] rounded-lg border-4 border-slate-700 shadow-2xl pixel" alt="影像" />
        </div>
      )}

      {/* 立绘 */}
      {leftSprite && <img src={leftSprite} className="sprite-l absolute bottom-48 portrait:bottom-44 left-4 md:left-24 portrait:h-44 h-64 md:h-96 object-contain pixel drop-shadow-2xl z-10" alt="" />}
      {rightSprite && <img src={rightSprite} className="sprite-r absolute bottom-48 portrait:bottom-44 right-4 md:right-24 portrait:h-40 h-56 md:h-80 object-contain pixel opacity-80 drop-shadow-2xl z-10" alt="" />}

      {/* 对话框 */}
      <div className="dialog-wrap absolute bottom-0 inset-x-0 z-20 p-4 md:p-6">
        <div className="dialog-box max-w-4xl mx-auto bg-slate-900/95 border-2 border-slate-600 rounded-xl p-4 md:p-5 min-h-32 relative">
          {speakerMeta && speakerMeta.name && (
            <span className="absolute -top-4 left-4 px-3 py-1 rounded-md text-sm font-bold bg-slate-800 border border-slate-600" style={{ color: speakerMeta.color }}>
              {speakerMeta.name === '我' ? (state.gender === 'f' ? '林小满' : '陈一帆') : speakerMeta.name}
            </span>
          )}
          <p key={stepId} className="text-slate-100 leading-relaxed text-base md:text-lg whitespace-pre-wrap min-h-[4.9rem] md:min-h-[5.4rem] text-in">
            <RichText text={fullText} shown={shown} />
          </p>
          {!step.choices && !step.end && !step.pedal && done && <span className="absolute bottom-3 right-4 text-amber-300 animate-bounce">▼</span>}
          {step.choices && done && !choicesLocked && (
            <div className="mt-4 flex flex-col gap-2 choice-in" onClick={e => e.stopPropagation()}>
              {visibleChoices.map((c, i) => (
                <button key={i} onClick={() => pick(c)}
                  className="text-left px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-600 hover:border-amber-400 hover:bg-slate-700 transition-all text-slate-100">
                  <RichText text={c.text} />
                </button>
              ))}
            </div>
          )}
          {step.end && done && (
            <div className="mt-4" onClick={e => e.stopPropagation()}>
              <button onClick={finish}
                className="w-full py-3 rounded-lg bg-amber-500/90 text-slate-950 font-bold tracking-widest hover:bg-amber-400 transition-all">
                🏁 本篇完 · 结算并回大厅
              </button>
            </div>
          )}
        </div>
      </div>

      {/* DSA 踏板时序玩法 */}
      {step.pedal && done && <PedalOverlay key={stepId + String(state.dlc?.[dlc.id]?.pedalTry ?? 0)} pedal={step.pedal} onResult={pedalResult} />}

      {/* DR 队列调度玩法 */}
      {queueOpen && (
        <QueueGame state={state} update={update} onDone={() => { setQueueOpen(false); setStepId('dr_noon0') }} />
      )}

      {/* 夜班手册 */}
      {manualOpen && <ManualOverlay state={state} onClose={() => setManualOpen(false)} />}

      {/* 勋章墙 */}
      {badgeOpen && (
        <div className="fixed inset-0 z-50" onClick={e => e.stopPropagation()}>
          <BadgeScreen state={state} onBack={() => setBadgeOpen(false)} />
        </div>
      )}
    </div>
  )
}

/* ================= 第二章「快与狠」· 剧情引擎（独立于 NightScreen / ScriptScreen） ================= */
function Ch2Screen({ state, update, onExit }: { state: GameState; update: (f: (s: GameState) => GameState) => void; onExit: () => void }) {
  const prog = state.dlc?.['ch2'] ?? {}
  const shiftIdx0 = (() => { const i = CH2_SHIFTS.findIndex(s => s.id === prog.shift); return i >= 0 ? i : 0 })()
  const [shiftIdx, setShiftIdx] = useState(shiftIdx0)
  const shift = CH2_SHIFTS[shiftIdx]
  const resumeStep = !prog.done && prog.shift === shift.id && prog.stepId && shift.steps[prog.stepId] ? prog.stepId : shift.start
  const [stepId, setStepId] = useState(resumeStep)
  const [view, setView] = useState<{ bg: string; sprite?: string; sprite2?: string }>({
    bg: prog.viewBg ?? 'bg_ctcontrol', sprite: prog.viewSprite, sprite2: prog.viewSprite2,
  })
  const viewRef = useRef(view)
  const applied = useRef<Set<string>>(new Set())
  const [shown, setShown] = useState(0)
  const [choicesLocked, setChoicesLocked] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [badgeOpen, setBadgeOpen] = useState(false)
  const [shopOpen, setShopOpen] = useState(false)
  const [bookOpen, setBookOpen] = useState(false)
  const [phase, setPhase] = useState<'story' | 'settle' | 'quiz' | 'done'>('story')
  const pickedStep = useRef<string | null>(null)
  const windowTries = useRef<Record<number, number>>({})

  const step: Step = shift.steps[stepId] ?? { end: true }
  // hub 横幅的行动力跟随时实数值渲染，别再硬编码×3（否则玩家花了AP文本不变，像没扣）
  const fullText = (step.text ?? '').replaceAll('行动力⚡×3', `行动力⚡×${state.ap}`)
  const plainLen = fullText.replaceAll('**', '').length
  const done = shown >= plainLen

  const [prevStepId, setPrevStepId] = useState(stepId)
  if (prevStepId !== stepId) {
    setPrevStepId(stepId)
    setShown(0)
    if (step.choices) setChoicesLocked(true)
    pickedStep.current = null
  }

  const updProg = (s: GameState, patch: Partial<DlcProgress>): GameState => ({
    ...s,
    dlc: { ...(s.dlc ?? {}), ch2: { ...(s.dlc?.['ch2'] ?? {}), ...patch } },
  })

  // 语音解析：vox_luzhou 按玩家性别选音轨；本章语音用章节级去重键 heard2_（第一章已播过的角色本章首登场仍播一次）
  const resolveSfx = (n: string): { play: string; heard: string } =>
    n === 'vox_luzhou'
      ? { play: `vox_luzhou_${state.gender}`, heard: 'vox_luzhou' }
      : { play: n, heard: n }

  // 进入某一步：条件跳过 / 视图 / 效果 / 语音 / 卡片 / 大事记 / 存档
  useEffect(() => {
    if (step.skipUnlessFlag && !state.flags[step.skipUnlessFlag] && step.next) {
      setStepId(step.next)
      return
    }
    const key = `ch2-${stepId}`
    const already = applied.current.has(key)
    applied.current.add(key)
    // Two different patients share this brief complaint recording, not an identity.
    const heardKey = (n: string) => n === 'vox_guy' ? `heard2_vp4_${step.speaker}_${n}` : `heard2_vp3_${n}`
    const isVox = (n: string) => n.startsWith('vox_') || n.startsWith('vox2_')  // vox2_* = 第二章专属场景语音
    const sfxList = [step.sfx, step.sfx2].filter((n): n is NonNullable<typeof n> => !!n)
    const freshVox = sfxList.filter(n => isVox(n) && !state.flags[heardKey(resolveSfx(n).heard)])
    if (!already) sfxList.forEach(n => { if (!isVox(n) || freshVox.includes(n)) playSfx(resolveSfx(n).play as Parameters<typeof playSfx>[0]) })
    const cur = viewRef.current
    const speakerSprite = step.speaker === 'luzhou' ? 'luzhou' : step.speaker ? `char_${step.speaker}` : undefined
    const impliedSprite =
      step.sprite ??
      (step.speaker === 'me' ? 'me' : speakerSprite && cur.sprite === speakerSprite ? cur.sprite : undefined)
    const newView = { bg: step.bg ?? cur.bg, sprite: impliedSprite, sprite2: step.sprite2 }
    viewRef.current = newView
    setView(newView)
    const newCard = step.card && !(state.cards ?? []).includes(step.card) ? step.card : undefined
    update(s => {
      let next = !already && step.effect ? applyEffect(s, step.effect) : s
      if (!already && freshVox.length > 0) {
        const f = { ...next.flags }
        freshVox.forEach(n => { f[heardKey(resolveSfx(n).heard)] = true })
        next = { ...next, flags: f }
      }
      if (newCard) next = { ...next, cards: [...(next.cards ?? []), newCard] }
      if (step.event && !(next.events ?? []).includes(step.event)) next = { ...next, events: [...(next.events ?? []), step.event] }
      next = updProg(next, { shift: shift.id, stepId, viewBg: newView.bg, viewSprite: newView.sprite, viewSprite2: newView.sprite2 })
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepId])

  // 打字机
  useEffect(() => {
    if (done) return
    const t = setInterval(() => setShown(s => Math.min(s + 1, plainLen)), 28)
    return () => clearInterval(t)
  }, [stepId, done, plainLen])

  // 选项缓冲，防误触
  useEffect(() => {
    if (!step.choices || !done) return
    const t = setTimeout(() => setChoicesLocked(false), 900)
    return () => clearTimeout(t)
  }, [stepId, done, step.choices])

  const blocked = !!(step.choices || step.end || step.windowTask || step.checklist) || shopOpen || bookOpen || manualOpen || badgeOpen || phase !== 'story'

  const advance = () => {
    if (shopOpen || bookOpen || manualOpen || badgeOpen || phase !== 'story') return
    // Reveal text even on choices, tasks and settlement nodes. Those nodes must
    // block navigation, not the user's attempt to finish the typewriter text.
    if (!done) { setShown(plainLen); return }
    if (blocked) return
    playSfx('click')
    if (step.next === '@shop') { setShopOpen(true); return }
    if (step.next === '@book2') { setBookOpen(true); return }
    if (step.next === '@quiz') { setPhase('quiz'); return }
    if (step.next) setStepId(step.next)
  }

  const pick = (c: Choice) => {
    // The visible-choice delay already prevents accidental selection. Do not
    // extend a lock on every rejected tap: rapid taps could otherwise starve it.
    if (choicesLocked || !done || pickedStep.current === stepId) return
    if (c.next !== '@shop' && c.next !== '@book2') pickedStep.current = stepId
    playSfx('click')
    if (c.effect) update(s => applyEffect(s, c.effect))
    if (c.risk && Math.random() < c.risk.chance) {
      if (c.risk.effect) update(s => applyEffect(s, c.risk!.effect))
      setStepId(c.risk.next)
      return
    }
    if (c.next === '@shop') { setShopOpen(true); return }
    if (c.next === '@book2') { setBookOpen(true); return }
    setStepId(c.next)
  }

  const windowDone = (task: NonNullable<Step['windowTask']>, tries: number) => {
    const stage = task.stage ?? 0
    windowTries.current[stage] = tries
    if (stage === 2 && (windowTries.current[1] ?? 99) <= 2 && tries <= 2) {
      update(s => s.badges.includes('window_master') ? s : { ...s, badges: [...s.badges, 'window_master'] })
    }
    setStepId(task.success)
  }

  // 班次结束：结算画面 → 下一班；末班（晨会）结束 → 第二章完
  const endShift = () => {
    playSfx('stamp')
    if (shift.id === 'c2d2') {
      update(s => (!s.flags['queue_wait'] && !s.badges.includes('queue_tamer')) ? { ...s, badges: [...s.badges, 'queue_tamer'] } : s)
    }
    if (shiftIdx >= CH2_SHIFTS.length - 1) {
      update(s => updProg(s, { done: true, stepId: undefined, shift: undefined }))
      setPhase('done')
      return
    }
    const ni = shiftIdx + 1
    update(s => updProg(s, { shift: CH2_SHIFTS[ni].id, stepId: CH2_SHIFTS[ni].start, viewBg: undefined, viewSprite: undefined, viewSprite2: undefined }))
    setPhase('settle')
  }

  const nextShift = () => {
    playSfx('click')
    const ni = shiftIdx + 1
    setShiftIdx(ni)
    setStepId(CH2_SHIFTS[ni].start)
    setPhase('story')
  }

  const quizDone = () => {
    setPhase('story')
    setStepId('c2am_3')
  }

  const spriteOf = (key?: string) => {
    if (!key) return null
    return IMG(ch2PortraitAsset(key, state.gender))
  }
  const leftSprite = spriteOf(view.sprite)
  const rightSprite = spriteOf(view.sprite2)
  const speakerMeta = step.speaker ? CHARACTERS[step.speaker] : undefined
  const visibleChoices = (step.choices ?? []).filter(c => condOk(state, c.cond))
  const nextShiftDef = CH2_SHIFTS[shiftIdx + 1]
  const ch2CardsGot = (state.cards ?? []).filter(id => CH2_CARDS[id]).length

  return (
    <div className="relative w-full h-full cursor-pointer" data-ch2-step={stepId} onClick={advance}>
      <BgImg name={view.bg} />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-slate-950/80 to-transparent pointer-events-none" />

      {/* 顶部信息条 */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between flex-wrap gap-y-1 px-4 py-2 bg-slate-950/70 text-xs md:text-sm">
        <span className="text-teal-200 tracking-widest whitespace-nowrap">🌀 第二章 · {shift.icon} {shift.title}「{shift.subtitle}」</span>
        <span className="text-slate-300 flex items-center gap-2 md:gap-3 flex-wrap justify-end">
          <span>💰 {state.gold}</span>
          {shift.kind === 'night' && <span className={state.ap > 0 ? 'text-sky-300' : 'text-slate-600'}>⚡×{state.ap}</span>}
          <button onClick={e => { e.stopPropagation(); playSfx('click'); setManualOpen(true) }}
            className="text-xs text-slate-400 hover:text-teal-300 border border-slate-700 rounded px-2 py-0.5">📖 手册</button>
          <button onClick={e => { e.stopPropagation(); playSfx('click'); setBadgeOpen(true) }}
            className="text-xs text-slate-400 hover:text-teal-300 border border-slate-700 rounded px-2 py-0.5">🏅 勋章</button>
          <button onClick={e => { e.stopPropagation(); setBookOpen(true) }}
            className="text-xs text-slate-400 hover:text-teal-300 border border-slate-700 rounded px-2 py-0.5">📚 旧书</button>
          <FullscreenBtn />
          <button onClick={e => { e.stopPropagation(); playSfx('click'); onExit() }}
            className="text-xs text-slate-400 hover:text-teal-300 border border-slate-700 rounded px-2 py-0.5" title="进度已自动保存，可随时离开">💾 回大厅</button>
        </span>
      </div>

      {/* DNT 计时角标（演出用） */}
      {step.dnt !== undefined && (
        <div className={`absolute top-11 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full border text-xs font-mono tracking-widest ${step.dnt >= 45 ? 'bg-red-950/80 border-red-500 text-red-300 animate-pulse' : 'bg-slate-900/80 border-teal-600 text-teal-200'}`}>
          ⏱ DNT {step.dnt}′00″ {step.dnt >= 60 ? '· 超时' : step.dnt >= 45 ? '· 最后15分钟' : '· 目标60分钟'}
        </div>
      )}

      {/* 白班候诊队列侧栏 */}
      {step.queue && (
        <div className="absolute left-2 top-12 z-10 flex flex-col gap-1.5 pointer-events-none max-w-[38%]">
          <p className="text-[10px] text-teal-300/80 tracking-widest">🪑 候诊队列</p>
          {step.queue.map((q, i) => (
            <div key={i} className={`flex items-center gap-1.5 rounded px-2 py-1 text-[10px] md:text-xs border ${q.note ? 'bg-teal-950/80 border-teal-500 text-teal-100' : q.tag === '急诊' || q.tag === '加急' ? 'bg-red-950/70 border-red-600/60 text-red-200' : 'bg-slate-900/80 border-slate-700 text-slate-300'}`}>
              <span className="font-bold shrink-0">{q.tag}</span>
              <span className="truncate">{q.name}{q.note ? ` · ${q.note}` : ''}</span>
            </div>
          ))}
        </div>
      )}

      {/* 电话来电头像 */}
      {step.phone && (
        <div className="absolute top-12 right-4 portrait:top-[4.5rem] portrait:right-2 portrait:px-2 portrait:py-1 portrait:gap-2 z-30 flex items-center gap-3 bg-slate-900/90 border-2 border-emerald-600 rounded-xl px-3 py-2 shadow-2xl">
          <div className="portrait:w-10 portrait:h-10 w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden border-2 border-emerald-400 bg-slate-800 shrink-0">
            <img src={IMG(ch2PortraitAsset(step.phone, state.gender))} className="w-full h-full object-cover object-top pixel" alt="来电" />
          </div>
          <div className="text-left">
            <p className="text-emerald-300 text-xs md:text-sm tracking-widest animate-pulse">📞 通话中</p>
            <p className="text-slate-400 text-xs">外线 · 院内电话</p>
          </div>
        </div>
      )}

      {/* 中央大图 */}
      {step.image && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none pb-40">
          <img src={IMG(step.image)} className="max-h-[45%] portrait:max-h-[38%] max-w-[90%] object-contain rounded-lg border-4 border-slate-700 shadow-2xl pixel" alt={CH2_IMAGE_CAPTIONS[step.image] ?? '影像或证物'} />
          {CH2_IMAGE_CAPTIONS[step.image] && <p className="mt-1 mx-2 px-2 py-1 rounded bg-slate-950/90 text-amber-100 text-[10px] md:text-xs text-center">{CH2_IMAGE_CAPTIONS[step.image]}</p>}
        </div>
      )}

      {/* 立绘 */}
      {leftSprite && <img src={leftSprite} className="sprite-l absolute bottom-48 portrait:bottom-44 left-4 md:left-24 portrait:h-44 h-64 md:h-96 object-contain pixel drop-shadow-2xl z-10" alt="" />}
      {rightSprite && <img src={rightSprite} className="sprite-r absolute bottom-48 portrait:bottom-44 right-4 md:right-24 portrait:h-40 h-56 md:h-80 object-contain pixel opacity-80 drop-shadow-2xl z-10" alt="" />}

      {/* 对话框 */}
      <div className="dialog-wrap absolute bottom-0 inset-x-0 z-20 p-4 md:p-6">
        <div className="dialog-box max-w-4xl mx-auto bg-slate-900/95 border-2 border-slate-600 rounded-xl p-4 md:p-5 min-h-32 relative">
          {speakerMeta && speakerMeta.name && (
            <span className="absolute -top-4 left-4 px-3 py-1 rounded-md text-sm font-bold bg-slate-800 border border-slate-600" style={{ color: speakerMeta.color }}>
              {speakerMeta.name === '我' ? (state.gender === 'f' ? '林小满' : '陈一帆') : speakerMeta.name}
            </span>
          )}
          <p key={stepId} className="text-slate-100 leading-relaxed text-base md:text-lg whitespace-pre-wrap min-h-[4.9rem] md:min-h-[5.4rem] text-in">
            <RichText text={fullText} shown={shown} />
          </p>
          {!step.choices && !step.end && !step.windowTask && !step.checklist && step.next && (
            <div className="mt-2 flex justify-end" onClick={e => e.stopPropagation()}>
              <button type="button" onClick={advance} className="min-h-10 px-4 py-1 rounded border border-teal-700/70 text-sm text-teal-200 hover:bg-teal-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-300">
                {done ? '继续 →' : '显示全文'}
              </button>
            </div>
          )}
          {step.choices && done && !choicesLocked && (
            <div className="mt-4 flex flex-col gap-2 choice-in max-h-[38vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              {visibleChoices.map((c, i) => (
                <button key={i} onClick={() => pick(c)}
                  className="text-left px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-600 hover:border-teal-400 hover:bg-slate-700 transition-all text-slate-100">
                  <RichText text={c.text} />
                </button>
              ))}
            </div>
          )}
          {step.end && done && phase === 'story' && (
            <div className="mt-4" onClick={e => e.stopPropagation()}>
              <button onClick={endShift}
                className="w-full py-3 rounded-lg bg-teal-500/90 text-slate-950 font-bold tracking-widest hover:bg-teal-400 transition-all">
                {shiftIdx >= CH2_SHIFTS.length - 1 ? '🏁 第二章 · 完 —— 结算' : `🌅 本班结束 · 结算（下一班：${nextShiftDef?.icon} ${nextShiftDef?.title}「${nextShiftDef?.subtitle}」）`}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 窗宽窗位玩法 */}
      {phase === 'story' && step.windowTask && done && (
        <WindowGame key={stepId} task={step.windowTask} onDone={t => windowDone(step.windowTask!, t)} />
      )}

      {/* 增强前核对清单 */}
      {phase === 'story' && step.checklist && done && (
        <ChecklistGame key={stepId} checklist={step.checklist} onDone={() => { playSfx('click'); setStepId(step.checklist!.next) }} />
      )}

      {/* 晨会考核 */}
      {phase === 'quiz' && <Ch2Quiz state={state} update={update} onDone={quizDone} />}

      {/* 班次结算 */}
      {phase === 'settle' && nextShiftDef && (
        <div className="absolute inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center gap-4 px-6" onClick={e => e.stopPropagation()}>
          <p className="text-teal-300 tracking-[0.4em] text-sm">第二章 · 快与狠</p>
          <h3 className="text-2xl text-slate-100">{shift.icon} {shift.title}「{shift.subtitle}」 · 完</h3>
          <p className="text-slate-400 text-sm">进度已自动保存 · 💰 {state.gold} · 🏅 {state.badges.length} 枚勋章</p>
          <button onClick={nextShift}
            className="mt-2 px-8 py-3 rounded-lg bg-teal-500/90 text-slate-950 font-bold tracking-widest hover:bg-teal-400">
            进入：{nextShiftDef.icon} {nextShiftDef.title}「{nextShiftDef.subtitle}」→
          </button>
          <button onClick={onExit} className="text-xs text-slate-500 hover:text-slate-300 underline">先回大厅，稍后再来</button>
        </div>
      )}

      {/* 第二章完 */}
      {phase === 'done' && (
        <div className="absolute inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center gap-4 px-6" onClick={e => e.stopPropagation()}>
          <p className="text-teal-300 tracking-[0.4em] text-sm">🌀 第二章「快与狠」 · 完</p>
          <h3 className="text-xl text-slate-100 text-center">新CT的第一周结束了。<br />下一周，市三甲质控组上门。</h3>
          <p className="text-slate-400 text-sm">本章收集：📖 知识卡片 {ch2CardsGot}/{Object.keys(CH2_CARDS).length} · 🏅 勋章 {state.badges.filter(b => CH2_BADGES[b]).length}/{Object.keys(CH2_BADGES).length}</p>
          <p className="text-slate-500 text-xs">彩蛋与钩子的落点，取决于你这一周做过的选择。</p>
          <button onClick={onExit} className="mt-2 px-8 py-3 rounded-lg bg-teal-500/90 text-slate-950 font-bold tracking-widest hover:bg-teal-400">回大厅 →</button>
        </div>
      )}

      {/* 小卖部 / 书 / 手册 / 勋章 */}
      {shopOpen && <ShopOverlay state={state} update={update} onClose={() => setShopOpen(false)} />}
      {bookOpen && <Book2Overlay shiftId={shift.id} completed={!!prog.done} onClose={() => setBookOpen(false)} />}
      {manualOpen && <ManualOverlay state={state} onClose={() => setManualOpen(false)} />}
      {badgeOpen && (
        <div className="fixed inset-0 z-50" onClick={e => e.stopPropagation()}>
          <BadgeScreen state={state} onBack={() => setBadgeOpen(false)} />
        </div>
      )}
    </div>
  )
}

/* ================= 第二章 · 窗宽窗位双滑块（canvas 实时映射） ================= */
function WindowGame({ task, onDone }: { task: NonNullable<Step['windowTask']>; onDone: (tries: number) => void }) {
  const SIZE = 512
  const [W, setW] = useState(2000)
  const [L, setL] = useState(500)
  const [tries, setTries] = useState(0)
  const [msg, setMsg] = useState('')
  const [ready, setReady] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const srcGray = useRef<Uint8ClampedArray | null>(null)
  const huLut = useRef<Int16Array | null>(null)
  if (!huLut.current) {
    const t = new Int16Array(256)
    for (let g = 0; g < 256; g++) t[g] = Math.round(grayToHU(g, task.image === 'ct_wrist_simulated'))
    huLut.current = t
  }

  useEffect(() => {
    const img = new Image()
    img.src = IMG(task.image)
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = SIZE; c.height = SIZE
      const ctx = c.getContext('2d')!
      ctx.drawImage(img, 0, 0, SIZE, SIZE)
      const d = ctx.getImageData(0, 0, SIZE, SIZE)
      const gray = new Uint8ClampedArray(SIZE * SIZE)
      for (let i = 0; i < gray.length; i++) gray[i] = d.data[i * 4]
      srcGray.current = gray
      setReady(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.image])

  useEffect(() => {
    if (!ready) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const out = ctx.createImageData(SIZE, SIZE)
    const gray = srcGray.current!
    const lut = huLut.current!
    const lo = L - W / 2
    for (let i = 0; i < gray.length; i++) {
      const hu = lut[gray[i]]
      let v = ((hu - lo) / W) * 255
      v = v < 0 ? 0 : v > 255 ? 255 : v
      const o = i * 4
      out.data[o] = v; out.data[o + 1] = v; out.data[o + 2] = v; out.data[o + 3] = 255
    }
    ctx.putImageData(out, 0, 0)
  }, [W, L, ready])

  const inTarget = Math.abs(W - task.targetW) <= task.tolW && Math.abs(L - task.targetL) <= task.tolL
  const confirm = () => {
    playSfx('click')
    const t = tries + 1
    setTries(t)
    if (inTarget) { playSfx('badge'); onDone(t); return }
    playSfx('buzz')
    setMsg(t === 1 ? '不对——这幅窗里，该看的东西还没浮出来。再拖一拖。' : '还不是这扇窗。想想目标值，窗宽先定范围，窗位再对准中心。')
  }

  const PRESETS: [string, number, number][] = [['脑窗', 80, 30], ['硬膜下窗', 130, 65], ['骨窗', 4000, 250], ['肺窗', 1500, -500], ['腹窗', 350, 0], ['CTA窗', 450, 150]]

  return (
    <div className="absolute inset-0 z-40 bg-slate-950/90 flex flex-col items-center justify-center gap-3 px-4" onClick={e => e.stopPropagation()}>
      <p className="text-teal-300 tracking-[0.4em] text-sm">🎚️ 窗宽 · 窗位</p>
      <p className="text-slate-400 text-xs">拖动滑块，比较显示效果——目标：WW≈{task.targetW} / WL≈{task.targetL}</p>
      <canvas ref={canvasRef} width={SIZE} height={SIZE}
        className="max-h-[38vh] portrait:max-h-[30vh] aspect-square rounded-lg border-2 border-slate-600 bg-black pixel" />
      <div className="w-full max-w-xl flex flex-col gap-2">
        <label className="text-xs text-slate-300 flex items-center gap-3">
          <span className="w-16 shrink-0">窗宽 WW</span>
          <input type="range" min={20} max={4000} step={10} value={W} onChange={e => setW(+e.target.value)} className="flex-1 accent-teal-400" />
          <span className="w-14 text-right text-teal-200 font-mono">{W}</span>
        </label>
        <label className="text-xs text-slate-300 flex items-center gap-3">
          <span className="w-16 shrink-0">窗位 WL</span>
          <input type="range" min={-1000} max={1500} step={10} value={L} onChange={e => setL(+e.target.value)} className="flex-1 accent-teal-400" />
          <span className="w-14 text-right text-teal-200 font-mono">{L}</span>
        </label>
        <div className="flex flex-wrap gap-1.5 justify-center mt-1">
          {PRESETS.map(([n, w, l]) => (
            <button key={n} onClick={() => { playSfx('click'); setW(w); setL(l) }}
              className="text-xs px-2.5 py-1 rounded bg-slate-800 border border-slate-600 text-slate-300 hover:border-teal-400">{n} {w}/{l}</button>
          ))}
        </div>
        {msg && <p className="text-amber-300 text-xs text-center animate-pulse">{msg}</p>}
        <button onClick={confirm}
          className={`mt-1 w-full py-2.5 rounded-lg font-bold tracking-widest transition-all ${inTarget ? 'bg-teal-400 text-slate-950 hover:bg-teal-300' : 'bg-slate-800 border border-slate-600 text-slate-200 hover:border-teal-400'}`}>
          就这个窗口 · 确认{tries > 0 ? `（已试 ${tries} 次）` : ''}
        </button>
      </div>
    </div>
  )
}

/* ================= 第二章 · 增强前六格核对清单 ================= */
function ChecklistGame({ checklist, onDone }: { checklist: NonNullable<Step['checklist']>; onDone: () => void }) {
  const [open, setOpen] = useState<Set<number>>(new Set())
  const all = open.size === checklist.items.length
  return (
    <div className="absolute inset-0 z-40 bg-slate-950/90 flex flex-col items-center justify-center gap-4 px-4" onClick={e => e.stopPropagation()}>
      <p className="text-teal-300 tracking-[0.4em] text-sm">💉 增强前核对清单</p>
      <p className="text-slate-400 text-xs">逐项点开核对——漏一项，风险就找上门</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 w-full max-w-2xl">
        {checklist.items.map((it, i) => {
          const isOpen = open.has(i)
          return (
            <button key={i} onClick={() => { playSfx('click'); setOpen(s => new Set(s).add(i)) }}
              className={`rounded-lg border-2 p-3 text-left transition-all min-h-[4.5rem] ${isOpen
                ? it.alert ? 'bg-red-950/70 border-red-400' : 'bg-emerald-950/60 border-emerald-500'
                : 'bg-slate-800/80 border-slate-600 hover:border-teal-400'}`}>
              <p className="text-xs text-slate-400">{it.label}</p>
              <p className={`text-sm font-bold mt-1 ${isOpen ? (it.alert ? 'text-red-300' : 'text-emerald-300') : 'text-slate-500'}`}>
                {isOpen ? `${it.alert ? '⚠️ ' : '✓ '}${it.value}` : '待核对'}
              </p>
            </button>
          )
        })}
      </div>
      <button disabled={!all} onClick={() => { playSfx('stamp'); onDone() }}
        className={`w-full max-w-2xl py-3 rounded-lg font-bold tracking-widest transition-all ${all ? 'bg-teal-400 text-slate-950 hover:bg-teal-300' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}>
        {all ? '核对完毕 · 继续 →' : `还有 ${checklist.items.length - open.size} 项未核对`}
      </button>
    </div>
  )
}

/* ================= 第二章 · 《CT夜班二十页》 ================= */
function Book2Overlay({ shiftId, completed, onClose }: { shiftId: string; completed: boolean; onClose: () => void }) {
  const unlocked = Math.min(CH2_BOOK_PAGES.length, ch2BookUnlocked(shiftId, completed))
  const [page, setPage] = useState(Math.max(0, unlocked - 4))
  const p = CH2_BOOK_PAGES[page]
  return (
    <div className="fixed inset-0 z-40 bg-slate-950/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-amber-50 border-2 border-amber-700/60 rounded-2xl p-5 md:p-6 max-w-lg w-full max-h-[88%] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 mb-1 shrink-0">
          <h3 className="text-lg text-amber-900 tracking-widest font-bold">📖 CT 夜班二十页</h3>
          <span className="text-amber-700/70 text-xs shrink-0">第 {page + 1} 页 / 共 {CH2_BOOK_PAGES.length} 页</span>
        </div>
        <p className="text-amber-800/60 text-xs mb-3 shrink-0">封面内页写着：「夜班保命，闲时翻翻。」——每个班次多翻开四页，现已解锁 {unlocked} 页。</p>
        <div className="border-t border-b border-amber-700/30 py-3 mb-3 overflow-y-auto min-h-0">
          <h4 className="text-amber-950 font-bold mb-2 text-sm md:text-base">{p.title}</h4>
          <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">{p.body}</p>
          <p className="text-amber-800/80 text-xs mt-3 italic">{p.note}</p>
        </div>
        <div className="flex items-center justify-between gap-2 shrink-0">
          <button disabled={page <= 0} onClick={() => setPage(p => Math.max(0, p - 1))}
            className="px-4 py-2 rounded-lg border border-amber-700/50 text-amber-900 text-sm disabled:opacity-30 hover:bg-amber-100">← 上一页</button>
          {page < unlocked - 1 ? <button onClick={() => setPage(p => Math.min(unlocked - 1, p + 1))}
            className="px-4 py-2 rounded-lg border border-amber-700/50 text-amber-900 text-sm hover:bg-amber-100">下一页 →</button>
            : <span className="text-amber-700/60 text-xs">{unlocked < CH2_BOOK_PAGES.length ? '🔒 后续四页：下一班次解锁' : '—— 全书完 ——'}</span>}
        </div>
        <button onClick={onClose} className="mt-4 w-full py-2 rounded-lg bg-amber-800 text-amber-50 text-sm hover:bg-amber-700 shrink-0">合上书，回科室</button>
      </div>
    </div>
  )
}

/* ================= 第二章 · 晨会考核（CT题库20抽5） ================= */
function Ch2Quiz({ state, update, onDone }: { state: GameState; update: (f: (s: GameState) => GameState) => void; onDone: () => void }) {
  const doneGrade = state.flags['quiz2_grade'] as string | undefined
  const [qs] = useState(() => {
    const shuffled = [...QUIZ2].sort(() => Math.random() - 0.5).slice(0, 5)
    return shuffled.map(q => {
      const order = q.options.map((_, i) => i).sort(() => Math.random() - 0.5)
      return { q: q.q, explain: q.explain, options: order.map(i => q.options[i]), answer: order.indexOf(q.answer) }
    })
  })
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(!!doneGrade)
  const rewarded = useRef(!!doneGrade)

  const gradeOf = (n: number) => n >= 5 ? 'S' : n === 4 ? 'A' : n === 3 ? 'B' : 'C'
  const gradeInfo: Record<string, { title: string; line: string; gold: number }> = {
    S: { title: 'S级 · 满分', gold: 250, line: '主任把卷子放下：「全对？……市三甲的抽查，你去迎检，我放心。」老周在角落里哼了一声，嘴角是翘着的。' },
    A: { title: 'A级 · 优秀', gold: 200, line: '主任点点头：「错一题，可以。迎检的时候照平时来，别紧张。」' },
    B: { title: 'B级 · 合格', gold: 80, line: '「合格线上站着呢。」主任把卷子还给你，「窗口和重建那几块，回去对着课件再啃啃。」' },
    C: { title: 'C级 · 待补考', gold: 0, line: '老周替你解了围：「实操没问题，理论我盯着他补。」……下周抽查之前，真得把书翻烂了。' },
  }

  const finish = (finalScore: number) => {
    setFinished(true)
    if (rewarded.current) return
    rewarded.current = true
    const g = gradeOf(finalScore)
    update(s => {
      if (s.flags['quiz2_grade']) return s
      let next = { ...s, flags: { ...s.flags, quiz2_grade: g } }
      if (gradeInfo[g].gold > 0) next = { ...next, gold: next.gold + gradeInfo[g].gold }
      return next
    })
    playSfx('badge')
  }

  const pick = (i: number) => {
    if (picked !== null) return
    playSfx('click')
    setPicked(i)
    if (i === qs[idx].answer) setScore(s => s + 1)
  }
  const nextQ = () => {
    playSfx('click')
    if (idx + 1 >= qs.length) finish(score)
    else { setIdx(idx + 1); setPicked(null) }
  }
  const grade = gradeOf(doneGrade ? (doneGrade === 'S' ? 5 : doneGrade === 'A' ? 4 : doneGrade === 'B' ? 3 : 0) : score)
  const showGrade = doneGrade ?? grade

  return (
    <div className="absolute inset-0 z-40 bg-slate-950/90 flex flex-col items-center justify-center px-4 py-6 overflow-y-auto" onClick={e => e.stopPropagation()}>
      <p className="text-teal-300 tracking-[0.4em] text-sm mb-3">晨会 · CT专场考核</p>
      {!finished ? (
        <div className="w-full max-w-2xl bg-slate-900/95 border-2 border-slate-600 rounded-xl p-6">
          <p className="text-teal-200 text-xs mb-4 tracking-widest">第 {idx + 1} / {qs.length} 题 · 当前得分 {score}</p>
          <h3 className="text-lg text-slate-100 leading-relaxed mb-4">{qs[idx].q}</h3>
          <div className="flex flex-col gap-2">
            {qs[idx].options.map((op, i) => {
              const isAns = i === qs[idx].answer
              const cls = picked === null
                ? 'bg-slate-800 border-slate-600 hover:border-teal-400 hover:bg-slate-700'
                : isAns ? 'bg-emerald-900/60 border-emerald-400' : i === picked ? 'bg-red-900/50 border-red-400' : 'bg-slate-800/50 border-slate-700 opacity-50'
              return (
                <button key={i} onClick={() => pick(i)} className={`text-left px-4 py-2.5 rounded-lg border transition-all text-slate-100 ${cls}`}>{op}</button>
              )
            })}
          </div>
          {picked !== null && (
            <div className="mt-4 choice-in">
              <p className={`text-sm leading-relaxed ${picked === qs[idx].answer ? 'text-emerald-300' : 'text-amber-300'}`}>
                {picked === qs[idx].answer ? '✓ 答对了。' : '✗ 答错了。'}{qs[idx].explain}
              </p>
              <button onClick={nextQ} className="mt-3 w-full py-2.5 rounded-lg bg-teal-500 text-slate-950 font-bold tracking-widest hover:bg-teal-400">
                {idx + 1 >= qs.length ? '查看成绩 →' : '下一题 →'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full max-w-md bg-slate-900/95 border-2 border-teal-500/50 rounded-xl p-8 text-center choice-in">
          <p className="text-slate-400 text-sm mb-2">晨会考核 · CT专场 · 成绩</p>
          <p className={`text-7xl font-black mb-2 ${showGrade === 'S' || showGrade === 'A' ? 'text-teal-300' : showGrade === 'B' ? 'text-sky-300' : 'text-slate-400'}`}>{showGrade}</p>
          <p className="text-teal-200 mb-4">{gradeInfo[showGrade].title}</p>
          <p className="text-slate-300 text-sm leading-relaxed text-left">{gradeInfo[showGrade].line}</p>
          {gradeInfo[showGrade].gold > 0 && <p className="mt-3 text-emerald-300">💰 考核奖金 +{gradeInfo[showGrade].gold} 金币</p>}
          {showGrade === 'C' && <p className="mt-3 text-slate-400 text-xs">（提示：答案都在《CT夜班二十页》和课件里——重置第二章可以重考）</p>}
          <button onClick={() => { playSfx('click'); onDone() }}
            className="mt-6 w-full py-3 rounded-lg bg-teal-500 text-slate-950 font-bold tracking-widest hover:bg-teal-400">
            回到晨会 →
          </button>
        </div>
      )}
    </div>
  )
}

/* ================= DLC 番外篇大厅（隐藏入口 #/dlc） ================= */
function DlcHallScreen({ onEnter, onEnterCh2, onBack }: { onEnter: (id: string, s: GameState) => void; onEnterCh2: (s: GameState) => void; onBack: () => void }) {
  const [save, setSave] = useState<GameState | null>(() => loadState())
  const [manualOpen, setManualOpen] = useState(false)
  const [badgeOpen, setBadgeOpen] = useState(false)
  const [confirmReset, setConfirmReset] = useState<string | null>(null)
  const [ch2Ok, setCh2Ok] = useState(ch2Unlocked())
  const [pwd, setPwd] = useState('')
  const [pwdErr, setPwdErr] = useState(false)

  const startTemplate = (g: 'm' | 'f') => {
    const s = freshState(g)
    saveState(s)
    setSave(s)
    playSfx('stamp')
  }

  const resetDlc = (id: string) => {
    if (!save) return
    const s: GameState = { ...save, dlc: { ...(save.dlc ?? {}), [id]: {} } }
    saveState(s)
    setSave(s)
    setConfirmReset(null)
    playSfx('click')
  }

  return (
    <div className="relative w-full h-full overflow-y-auto">
      <BgImg name="bg_corridor" fixed />
      <div className="absolute inset-0 bg-slate-950/75" />
      <div className="relative z-10 min-h-full flex flex-col items-center py-10 px-4 gap-5">
        <p className="text-amber-300 tracking-[0.4em] text-sm">隐藏入口 · 内容大厅</p>
        <h2 className="text-3xl text-amber-100 tracking-widest">🗂️ 章节与番外</h2>
        <p className="text-slate-500 text-xs -mt-3">正篇新章节与番外篇都会放进这个大厅</p>

        {save ? (
          <div className="bg-slate-900/90 border border-slate-600 rounded-xl p-4 max-w-lg w-full text-sm">
            <p className="text-slate-300">
              已继承第一章存档：{save.gender === 'f' ? '林小满' : '陈一帆'} · 💰 {save.gold} · 🏅 {save.badges.length} 枚勋章
              {save.finished ? ' · ✅ 第一章已通关' : ' · ⏳ 第一章进行中'}
            </p>
            {!save.finished && (
              <p className="text-amber-300/90 text-xs mt-2">⚠️ 剧透提示：番外篇的故事发生在第一章之后，会提及老周退休等第一章结局信息。</p>
            )}
          </div>
        ) : (
          <div className="bg-slate-900/90 border border-amber-500/50 rounded-xl p-5 max-w-lg w-full">
            <p className="text-amber-200 text-sm mb-1">检测不到本机的第一章存档</p>
            <p className="text-slate-400 text-xs mb-4 leading-relaxed">
              可以用模板身份直接体验番外篇（💰100 · 初始数值），之后回到首页仍可从第一章正常玩起；也可以先去通关第一章再来。
            </p>
            <p className="text-slate-300 text-sm mb-2">选择模板身份：</p>
            <div className="flex gap-3">
              <button onClick={() => startTemplate('f')} className="flex-1 py-2.5 rounded-lg bg-slate-800 border border-slate-600 hover:border-amber-400 text-slate-100">林小满（女）</button>
              <button onClick={() => startTemplate('m')} className="flex-1 py-2.5 rounded-lg bg-slate-800 border border-slate-600 hover:border-amber-400 text-slate-100">陈一帆（男）</button>
            </div>
          </div>
        )}

        {save && (
          <div className="max-w-3xl w-full flex flex-col gap-3">
            <p className="text-teal-300/80 text-xs tracking-widest">—— 正篇章节 ——</p>
            {(() => {
              const p = save.dlc?.['ch2']
              const started = !!p?.stepId && !p?.done
              const doneIt = !!p?.done
              const unlocked = ch2Ok
              const tryPwd = () => {
                if (tryUnlockCh2(pwd)) { setCh2Ok(true); setPwd(''); setPwdErr(false); playSfx('badge') }
                else { setPwdErr(true); playSfx('buzz') }
              }
              return (
                <div className={`bg-slate-900/90 border-2 rounded-2xl p-5 flex flex-col gap-2 transition-all ${unlocked ? 'border-teal-400/70 hover:border-teal-300' : 'border-slate-700'}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{unlocked ? CH2_META.icon : '🔒'}</span>
                    <div>
                      <p className="text-lg text-teal-100 font-bold">{CH2_META.title}</p>
                      <p className="text-xs text-slate-400">{CH2_META.subtitle} · {CH2_META.minutes}</p>
                    </div>
                    <span className={`ml-auto text-xs px-2 py-1 rounded ${doneIt ? 'bg-emerald-800/70 text-emerald-200' : started ? 'bg-sky-800/70 text-sky-200' : 'bg-slate-700/70 text-slate-300'}`}>
                      {doneIt ? '✅ 已完成' : started ? '▶ 进行中' : unlocked ? '未开始' : '口令锁定'}
                    </span>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed">{unlocked ? CH2_META.desc : '2025年11月 · 新CT启用的第一周。—— 输入老师公布的章节口令解锁（与第一章进度无关）。'}</p>
                  {!unlocked && (
                    <div className="flex gap-2 mt-1">
                      <input
                        value={pwd}
                        onChange={e => { setPwd(e.target.value); setPwdErr(false) }}
                        onKeyDown={e => { if (e.key === 'Enter') tryPwd() }}
                        placeholder="章节口令"
                        className={`flex-1 px-4 py-2.5 rounded-lg bg-slate-800 border text-slate-100 outline-none tracking-widest ${pwdErr ? 'border-red-400 animate-pulse' : 'border-slate-600 focus:border-teal-400'}`}
                      />
                      <button onClick={tryPwd} disabled={!pwd.trim()}
                        className="px-5 py-2.5 rounded-lg bg-teal-500/90 text-slate-950 font-bold tracking-widest hover:bg-teal-400 disabled:opacity-40">
                        解锁
                      </button>
                    </div>
                  )}
                  {pwdErr && !unlocked && <p className="text-red-300 text-xs">口令不对——问问老师，或者再想想。</p>}
                  {unlocked && (
                    <div className="flex gap-2 mt-1">
                      <button onClick={() => { playSfx('click'); onEnterCh2(save) }}
                        className="flex-1 py-2.5 rounded-lg bg-teal-500/90 text-slate-950 font-bold tracking-widest hover:bg-teal-400">
                        {doneIt ? '再玩一遍' : started ? '继续 →' : '开始 →'}
                      </button>
                      {(started || doneIt) && (
                        confirmReset === 'ch2' ? (
                          <button onClick={() => resetDlc('ch2')} className="px-3 py-2.5 rounded-lg bg-red-700/80 text-red-50 text-sm animate-pulse">确认重置</button>
                        ) : (
                          <button onClick={() => { playSfx('click'); setConfirmReset('ch2') }} className="px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-600 text-slate-400 text-sm hover:border-red-400">重置</button>
                        )
                      )}
                    </div>
                  )}
                </div>
              )
            })()}
            {/* 后续正篇章节入口位：开发中的章节以锁定卡片形式占位，做好一个解锁一个 */}
            <div className="bg-slate-900/60 border-2 border-dashed border-slate-800 rounded-2xl p-5 flex items-center gap-3 opacity-60">
              <span className="text-4xl">🔒</span>
              <div>
                <p className="text-lg text-slate-400 font-bold">第三章 · ？？？</p>
                <p className="text-xs text-slate-600">开发中——做好之后会出现在这里</p>
              </div>
            </div>
          </div>
        )}

        {save && (
          <div className="max-w-3xl w-full flex flex-col gap-3">
            <p className="text-amber-300/70 text-xs tracking-widest">—— 番外篇 ——</p>
            <div className="grid md:grid-cols-2 gap-4 w-full">
            {DLCS.map(d => {
              const p = save.dlc?.[d.id]
              const started = !!p?.stepId
              const doneIt = !!p?.done
              return (
                <div key={d.id} className="bg-slate-900/90 border-2 border-slate-600 hover:border-amber-400/70 rounded-2xl p-5 flex flex-col gap-2 transition-all">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{d.icon}</span>
                    <div>
                      <p className="text-lg text-amber-100 font-bold">{d.title}</p>
                      <p className="text-xs text-slate-400">{d.subtitle} · {d.minutes}</p>
                    </div>
                    <span className={`ml-auto text-xs px-2 py-1 rounded ${doneIt ? 'bg-emerald-800/70 text-emerald-200' : started ? 'bg-sky-800/70 text-sky-200' : 'bg-slate-700/70 text-slate-300'}`}>
                      {doneIt ? '✅ 已完成' : started ? '▶ 进行中' : '未开始'}
                    </span>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed">{d.desc}</p>
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => { playSfx('click'); onEnter(d.id, save) }}
                      className="flex-1 py-2.5 rounded-lg bg-amber-500/90 text-slate-950 font-bold tracking-widest hover:bg-amber-400">
                      {doneIt ? '再玩一遍' : started ? '继续 →' : '开始 →'}
                    </button>
                    {(started || doneIt) && (
                      confirmReset === d.id ? (
                        <button onClick={() => resetDlc(d.id)} className="px-3 py-2.5 rounded-lg bg-red-700/80 text-red-50 text-sm animate-pulse">确认重置</button>
                      ) : (
                        <button onClick={() => { playSfx('click'); setConfirmReset(d.id) }} className="px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-600 text-slate-400 text-sm hover:border-red-400">重置</button>
                      )
                    )}
                  </div>
                </div>
              )
            })}
            </div>
          </div>
        )}

        <div className="flex gap-3 flex-wrap justify-center">
          {save && <MenuBtn onClick={() => setManualOpen(true)}>📖 夜班手册</MenuBtn>}
          {save && <MenuBtn onClick={() => setBadgeOpen(true)}>🏅 勋章墙</MenuBtn>}
          <MenuBtn onClick={onBack}>← 回标题</MenuBtn>
        </div>
        <p className="text-slate-500 text-xs">章节与番外共用第一章存档（金币/勋章/旗标互通）· 进度自动保存</p>
      </div>
      {manualOpen && save && <ManualOverlay state={save} onClose={() => setManualOpen(false)} />}
      {badgeOpen && save && (
        <div className="fixed inset-0 z-50">
          <BadgeScreen state={save} onBack={() => setBadgeOpen(false)} />
        </div>
      )}
    </div>
  )
}
