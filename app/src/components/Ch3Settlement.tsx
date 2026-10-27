import type { ReactNode } from 'react'
import type { GameState } from '../game/types'
import type { TrilogyChapter, TrilogyProgress } from '../game/trilogy-types'
import { SceneBackground } from './SceneBackground'
import { isTrilogyPlayable } from '../game/chapter-availability'
import { ownedTrilogyHistory } from '../game/trilogy-collections'

const panel = 'rounded-xl border border-slate-600/90 bg-slate-900/90 p-3 shadow-lg'
const button = 'min-h-11 rounded-lg border border-slate-500 bg-slate-800/95 px-3 py-3 text-xs md:text-sm whitespace-nowrap text-slate-100 hover:border-teal-300'
const metrics = { gold: '💰 科室存款', skill: '🩺 医术', heart: '🧡 人心', wealth: '🏠 家业' }
const signed = (value: number) => value > 0 ? `+${value}` : String(value)

/** Same scroll/body + fixed actions structure as CH2, without its CT business rules. */
export function Ch3Settlement({ state, chapter, progress: p, itemName, certificate, onNext, onOverlay, onExit }: {
  state: GameState; chapter: TrilogyChapter; progress: TrilogyProgress; itemName: (id: string) => string;
  certificate?: ReactNode; onNext: () => void;
  onOverlay: (overlay: 'shop' | 'manual' | 'badges' | 'book' | 'bag') => void; onExit: () => void
}) {
  const base = p.snapshots[p.done ? '0' : String(p.shift)]
  const scans = Object.values(p.scans ?? {}).filter(scan => scan.completed).length
  const cards = Object.keys(chapter.cards).filter(id => state.cards?.includes(id)).length
  const badges = Object.keys(chapter.badges).filter(id => state.badges.includes(id)).length
  const history = ownedTrilogyHistory(chapter, state)
  const status = (done?: boolean, started?: boolean) => done ? '已完成' : started ? '进行中' : '可从大厅进入'
  const dlcStatus = (id: string) => status(state.dlc?.[id]?.done, !!state.dlc?.[id]?.stepId)
  return <section data-ch3-settlement aria-label={p.done ? '第三章全章汇总' : '第三章班后经营'}
    className="absolute inset-0 z-30 cursor-default overflow-hidden" onClick={e => e.stopPropagation()}>
    <SceneBackground name="bg_us_room_day" landscapeOnly />
    <div className="absolute inset-0 bg-slate-950/55 pointer-events-none" />
    <div className="relative mx-auto flex h-full w-full max-w-4xl flex-col px-3 py-3 md:px-6 md:py-5">
      <div data-ch3-settlement-scroll className="min-h-0 flex-1 overflow-y-auto pb-3 pr-1">
        <header className="mb-3 text-center">
          <p className="text-xs tracking-[0.25em] text-teal-200">第三章 · 回声</p>
          <h2 className="mt-1 text-xl text-amber-100 md:text-2xl">{p.done ? '🌅 超声轮转结束 · 全章汇总' : `${chapter.shifts[p.shift].title} · 班后经营`}</h2>
          <p className="mt-1 text-xs text-slate-300">进度已保存。{p.done ? '培训表收好了，该回老科室了。' : p.shift === 4 ? '先歇一会儿，准备好再去晨会。' : '先歇一会儿，下一班等你亲自开始。'}</p>
        </header>
        {p.done && certificate}
        <div className="grid grid-cols-2 gap-2 md:gap-3" aria-label="本章数值">
          {(Object.keys(metrics) as (keyof typeof metrics)[]).map(key => <section key={key} className={panel} data-ch3-stat={key}>
            <p className="text-xs text-slate-400">{metrics[key]}</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
              <strong className="text-xl font-normal text-slate-100">{state[key]}{key === 'gold' ? ' 金币' : ' 点'}</strong>
              <span className={`text-xs ${base && state[key] > base[key] ? 'text-emerald-300' : base && state[key] < base[key] ? 'text-amber-200' : 'text-slate-400'}`}>
                {base ? `${p.done ? '本章' : '本班'} ${signed(state[key] - base[key])}` : '此前变化未记录'}</span>
              {key !== 'gold' && <span className="mt-1 w-full text-xs tracking-widest md:ml-auto md:mt-0 md:w-auto" aria-hidden="true">{Array.from({ length: 5 }, (_, i) => i < Math.max(0, Math.min(5, state[key])) ? '🟡' : '🟣').join(' ')}{state[key] > 5 ? ' ＋' : ''}</span>}
            </div>
          </section>)}
          <section className={panel}><p className="text-xs text-slate-400">🗓️ 值班日志</p><p className="mt-1 text-xl">{p.shift + 1} / 5 班</p><p className="mt-1 text-xs text-slate-400">五次门诊跟班</p></section>
          <section className={panel}><p className="text-xs text-slate-400">◉ 超声设备</p><p className="mt-1 text-lg text-teal-200">交班待机</p><p className="mt-1 text-xs text-slate-400">本轮留存 {scans} 组采集记录</p></section>
        </div>
        <section className={`${panel} mt-3`}>
          <h3 className="text-sm text-amber-200">设备间 · {chapter.equipment}</h3>
          <p className="mt-2 text-sm">图像和检查记录已交接，设备留给下一班使用。</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-700 pt-3">
            <p className="text-xs text-slate-300">🎒 {state.items.length ? state.items.map(itemName).join('、') : '背包暂空'}{p.pendingCoffee ? ' · 待用咖啡×1' : ''}</p>
            <button className="shrink-0 rounded border border-slate-500 px-3 py-2 text-xs" onClick={() => onOverlay('bag')}>查看背包用途</button>
          </div>
          <div className="mt-3 border-t border-slate-700 pt-3 space-y-2 text-sm" aria-label="章节与设备">
            <p>{state.finished ? '✅' : '🔓'} 老伙计 · 第一章 · CR / X光 · {status(state.finished, !!state.stepId || state.night > 1)}</p>
            <p>{state.dlc?.ch2?.done ? '✅' : '🔓'} 快与狠 · 第二章 · CT · {status(state.dlc?.ch2?.done, !!state.dlc?.ch2?.stepId)}</p>
            <p className="text-teal-200">{p.done ? '✅' : '🔓'} 回声 · 第三章 · 超声 · {p.done ? '已完成' : '正在跟班'}</p>
            <p className="text-slate-400">{isTrilogyPlayable('ch4') ? '🔓' : '🔒'} 共振 · 第四章 · MRI · {isTrilogyPlayable('ch4') ? '可从大厅进入' : '尚未开放'}</p>
            <p className="text-slate-400">{isTrilogyPlayable('ch5') ? '🔓' : '🔒'} 微光 · 第五章 · PET/CT · {isTrilogyPlayable('ch5') ? '可从大厅进入' : '尚未开放'}</p>
            <p>🔓 DR 白班 · {dlcStatus('dr')}</p><p>🔓 DSA 导管室 · {dlcStatus('dsa')}</p>
            <p>🔓 低剂量CT：噪声之外 · 大厅内需访问码</p>
            <p className="border-t border-slate-700 pt-3 text-xs text-slate-300">📖 {cards}/{Object.keys(chapter.cards).length} · 🏅 {badges}/{Object.keys(chapter.badges).length}</p>
            {!!(history.cards.length || history.badges.length) && <p data-trilogy-legacy-summary className="text-xs text-slate-400">历史收藏 · {history.cards.length} 张卡片 · {history.badges.length} 枚勋章</p>}
          </div>
        </section>
      </div>
      <nav className={`grid shrink-0 ${p.done ? 'grid-cols-2' : 'grid-cols-3'} gap-2 border-t border-slate-600/70 bg-slate-950/70 pt-3 md:grid-cols-4`} aria-label="班后功能">
        {!p.done && <button data-trilogy-next-shift onClick={onNext} className="col-span-3 rounded-lg bg-amber-400 px-3 py-3 font-bold text-slate-950 md:col-span-1">{p.shift === 4 ? '🌅 前往晨会' : '▶ 进入下一班'}</button>}
        {!p.done && <button className={button} onClick={() => onOverlay('shop')}>🛒 小卖部</button>}
        <button className={button} onClick={() => onOverlay('manual')}>📖 夜班手册</button>
        <button className={button} onClick={() => onOverlay('badges')}>🏅 勋章墙</button>
        <button className={button} onClick={() => onOverlay('book')}>📚 已解锁书页</button>
        <button className={`${button} ${p.done ? '' : 'col-span-2 md:col-span-3'}`} onClick={onExit}>返回大厅 · 进度已保存</button>
      </nav>
    </div>
  </section>
}
