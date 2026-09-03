import { useEffect, useRef, useState } from 'react'
import { NIGHTS, BADGES, CHARACTERS, SHOP_ITEMS, QUIZ, BOOK_PAGES } from './game/data'
import type { GameState, Step, ShopItem, Choice } from './game/types'
import { freshState, loadState, saveState, wipeSave, applyEffect, condOk, dailyCheckin, meterLevel, playSfx, makeCredCode, verifyCredCode } from './game/store'

type Screen = 'title' | 'select' | 'checkin' | 'night' | 'day' | 'badges' | 'quiz' | 'epilogue' | 'chapterEnd' | 'verify'

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
  useEffect(preloadAssets, [])

  const update = (fn: (s: GameState) => GameState) => {
    setState(prev => {
      if (!prev) return prev
      const next = fn(prev)
      saveState(next)
      return next
    })
  }

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
      {screen === 'title' && <TitleScreen hasSave={!!loadState()} onNew={() => setScreen('select')} onContinue={continueGame} onBadges={() => setScreen('badges')} onVerify={() => setScreen('verify')} />}
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
      {screen === 'chapterEnd' && state && <ChapterEndScreen state={state} update={update} onBadges={() => setScreen('badges')} onRestart={() => { wipeSave(); setState(null); setScreen('title') }} />}
      {screen === 'verify' && <VerifyScreen onBack={() => setScreen('title')} />}
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
function TitleScreen({ hasSave, onNew, onContinue, onBadges, onVerify }: { hasSave: boolean; onNew: () => void; onContinue: () => void; onBadges: () => void; onVerify: () => void }) {
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
        <p className="text-slate-500 text-xs mt-6">教学试玩版 v0.5.2 · 进度自动保存在本浏览器 · 随时退出随时续玩</p>
        <div className="flex items-center gap-4">
          <FullscreenBtn />
          <button onClick={onVerify} className="text-slate-600 hover:text-slate-400 text-xs underline">教师验证入口</button>
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
                <span className="text-2xl">{item.icon}</span>
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
  // 读取流程门闩：pending=等待文本播完 → running=动画播放中 → done=播完；none=本步无读取
  const readoutGate = useRef<'none' | 'pending' | 'running' | 'done'>('none')

  const finishFired = useRef(false)

  const step: Step = night.steps[stepId] ?? { end: true }
  const fullText = step.text ?? ''
  const done = shown >= fullText.length

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
    const heardKey = (n: string) => `heard_${n}`
    const sfxList = [step.sfx, step.sfx2].filter((n): n is NonNullable<typeof n> => !!n)
    const freshVox = sfxList.filter(n => n.startsWith('vox_') && !state.flags[heardKey(n)])
    if (!already) sfxList.forEach(n => { if (!n.startsWith('vox_') || freshVox.includes(n)) playSfx(n) })
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
    update(s => {
      let next = !already && step.effect ? applyEffect(s, step.effect) : s
      if (!already && freshVox.length > 0) {
        const f = { ...next.flags }
        freshVox.forEach(n => { f[heardKey(n)] = true })
        next = { ...next, flags: f }
      }
      next = { ...next, screenHint: 'night' as const, stepId, viewBg: newView.bg, viewSprite: newView.sprite, viewSprite2: newView.sprite2, resumeKey: key }
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepId])

  useEffect(() => {
    if (done) return
    const t = setInterval(() => setShown(s => Math.min(s + 1, fullText.length)), 28)
    return () => clearInterval(t)
  }, [stepId, done, fullText.length])

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
    if (step.choices || step.end || shopOpen || bookOpen || readout) return
    if (readoutGate.current === 'pending' || readoutGate.current === 'running') return
    if (!done) { setShown(fullText.length); return }
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
          <p key={stepId} className="text-slate-100 leading-relaxed text-base md:text-lg whitespace-pre-wrap min-h-[4.9rem] md:min-h-[5.4rem] text-in">{fullText.slice(0, shown)}</p>
          {!step.choices && !step.end && done && <span className="absolute bottom-3 right-4 text-amber-300 animate-bounce">▼</span>}
          {step.choices && done && !choicesLocked && (
            <div className="mt-4 flex flex-col gap-2 choice-in" onClick={e => e.stopPropagation()}>
              {visibleChoices.map((c, i) => (
                <button key={i} onClick={() => pick(c)}
                  className="text-left px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-600 hover:border-amber-400 hover:bg-slate-700 transition-all text-slate-100">
                  {c.text}
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
    </div>
  )
}

/* ================= 白天经营 ================= */
function DayScreen({ state, update, onNextNight, onBadges }: { state: GameState; update: (f: (s: GameState) => GameState) => void; onNextNight: () => void; onBadges: () => void }) {
  const [msg, setMsg] = useState('')
  const [penalty, setPenalty] = useState('')
  const [shopOpen, setShopOpen] = useState(false)
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
          <MenuBtn onClick={onBadges}>🏅 勋章墙</MenuBtn>
        </div>
        <p className="text-slate-500 text-xs">进度已自动保存，随时可以从标题界面继续</p>
      </div>
      {shopOpen && <ShopOverlay state={state} update={update} onClose={() => setShopOpen(false)} />}
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
        <p className="text-amber-200/60 text-sm">科室墙上的软木板 · 已收集 {owned.length}/{Object.keys(BADGES).length}</p>
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
function ChapterEndScreen({ state, update, onBadges, onRestart }: { state: GameState; update: (f: (s: GameState) => GameState) => void; onBadges: () => void; onRestart: () => void }) {
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

        <p className="text-amber-200/80">🔒 第二章「快与狠」—— CT篇，开发中，敬请期待</p>
        <div className="flex gap-3 flex-wrap justify-center">
          <MenuBtn onClick={onBadges}>🏅 查看勋章墙</MenuBtn>
          <MenuBtn onClick={onRestart}>↺ 重新开始</MenuBtn>
        </div>
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
