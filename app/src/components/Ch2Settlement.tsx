import { CH2_ACTIVE_BADGES, CH2_ACTIVE_CARDS, CH2_BADGES_LEGACY, CH2_CARDS_LEGACY, CH2_SHIFTS } from '../game/ch2'
import { SHOP_ITEMS } from '../game/data'
import { getDlc } from '../game/dlc'
import { CH2_STAT_KEYS, ch2NetChange } from '../game/ch2-ledger'
import type { GameState } from '../game/types'

type Props = {
  state: GameState
  onNext: () => void
  onShop: () => void
  onBackpack: () => void
  onManual: () => void
  onBadges: () => void
  onBook: () => void
  onExit: () => void
}
const asset = (name: string) => `${import.meta.env.BASE_URL}assets/${name}.png`
const signed = (n: number) => n > 0 ? `+${n}` : String(n)
const itemName = (id: string) => id === 'toolbox' ? '元件盒' : SHOP_ITEMS.find(item => item.id === id)?.name ?? id
const metricStyle = 'rounded-xl border border-slate-600/90 bg-slate-900/90 p-3 shadow-lg'
const buttonStyle = 'min-h-11 rounded-lg border border-slate-500 bg-slate-800/95 px-3 py-3 text-xs md:text-sm whitespace-nowrap text-slate-100 hover:border-teal-300'

/** Chapter 2's management screen, intentionally independent of Chapter 1's shop/repair engine. */
export function Ch2Settlement({ state, onNext, onShop, onBackpack, onManual, onBadges, onBook, onExit }: Props) {
  const progress = state.dlc?.ch2, complete = progress?.done || progress?.phase === 'done'
  const shift = CH2_SHIFTS.find(row => row.id === progress?.shift) ?? CH2_SHIFTS[0]
  const loop = progress?.loop
  const currentDelta = ch2NetChange(state, shift.id)
  const first = Object.values(loop?.shifts ?? {})[0]?.start
  const delta = complete && first ? { gold: state.gold - first.gold, skill: state.skill - first.skill,
    heart: state.heart - first.heart, wealth: state.wealth - first.wealth } : currentDelta
  const completedCount = CH2_SHIFTS.slice(0, 5).filter(row => loop?.shifts[row.id]?.settled).length
  const legacyCount = Math.max(0, CH2_SHIFTS.findIndex(row => row.id === shift.id)) + (complete || progress?.phase === 'settle' ? 1 : 0)
  const knownCount = complete ? 5 : Math.min(5, Math.max(completedCount, legacyCount))
  const badges = state.badges.filter(id => CH2_ACTIVE_BADGES.includes(id)).length
  const cards = (state.cards ?? []).filter(id => CH2_ACTIVE_CARDS.includes(id)).length
  const legacyBadges = state.badges.filter(id => CH2_BADGES_LEGACY.includes(id)).length
  const legacyCards = (state.cards ?? []).filter(id => CH2_CARDS_LEGACY.includes(id)).length
  const recovered = !loop || Object.values(loop.shifts).some(row => row.recovered)
  const next = CH2_SHIFTS[CH2_SHIFTS.findIndex(row => row.id === shift.id) + 1]
  const scans = Object.values(progress?.scanSessions ?? {}).filter(row => row.completed).length
  const dlcStatus = (id: string) => !getDlc(id) ? 'DLC 预定 · 尚未开放'
    : state.dlc?.[id]?.done ? '番外已完成 · 可从大厅重玩'
      : state.dlc?.[id]?.stepId ? '番外进行中 · 可从大厅继续' : '番外已开放 · 可从大厅进入'
  return <section data-ch2-settlement data-ch2-complete={complete ? 'true' : 'false'} aria-label={complete ? '第二章全章汇总' : '第二章班后经营'}
    className="absolute inset-0 z-30 cursor-default overflow-hidden" onClick={event => event.stopPropagation()}>
    <img src={asset('bg_ctcontrol_day_ready')} alt="" className="absolute inset-0 h-full w-full object-cover pixel pointer-events-none" />
    <div className="absolute inset-0 bg-slate-950/55 pointer-events-none" />
    <div className="relative mx-auto flex h-full w-full max-w-4xl flex-col px-3 py-3 md:px-6 md:py-5">
      <div data-ch2-settlement-scroll className="min-h-0 flex-1 overflow-y-auto pb-3 pr-1">
      <header className="mb-3 text-center">
        <p className="text-xs tracking-[0.25em] text-teal-200">第二章 · 快与狠</p>
        <h2 className="mt-1 text-xl text-amber-100 md:text-2xl">{complete ? '🌅 夜班交接完成 · 全章汇总' : `${shift.icon} ${shift.title}「${shift.subtitle}」 · 班后经营`}</h2>
        <p className="mt-1 text-xs text-slate-300">进度已保存。{complete ? '新机器要你看着，老周还在科里。' : '先歇一会儿，下一班等你亲自开始。'}</p>
      </header>

      <div className="grid grid-cols-2 gap-2 md:gap-3" aria-label="本章数值">
        {CH2_STAT_KEYS.map(key => <div key={key} className={metricStyle} data-ch2-stat={key}>
          <p className="text-xs text-slate-400">{{ gold: '💰 科室存款', skill: '🩺 医术', heart: '🧡 人心', wealth: '🏠 家业' }[key]}</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
            <strong className="text-xl font-normal text-slate-100">{state[key]}{key === 'gold' ? ' 金币' : ' 点'}</strong>
            <span className={`text-xs ${delta[key] > 0 ? 'text-emerald-300' : delta[key] < 0 ? 'text-amber-200' : 'text-slate-400'}`}>{!loop ? '变化未记录' : `${recovered ? '记录后' : complete ? '本章' : '本班'} ${signed(delta[key])}`}</span>
            {key !== 'gold' && <span className="mt-1 w-full text-xs tracking-widest md:ml-auto md:mt-0 md:w-auto" aria-hidden="true">{Array.from({ length: 5 }, (_, i) => i < Math.max(0, Math.min(5, state[key])) ? '🟡' : '🟣').join(' ')}{state[key] > 5 ? ' ＋' : ''}</span>}
          </div>
        </div>)}
        <div className={metricStyle}><p className="text-xs text-slate-400">🗓️ 值班日志</p><p className="mt-1 text-xl text-slate-100">{knownCount} / 5 班</p><p className="mt-1 text-xs text-slate-400">三夜两白 · 晨会另行记入</p></div>
        <div className={metricStyle}><p className="text-xs text-slate-400">🌀 CT运行情况</p><p className="mt-1 text-lg text-teal-200">交班待机</p><p className="mt-1 text-xs text-slate-400">{scans ? `本轮已留存 ${scans} 组处理记录` : '影像已按病例交接'}</p></div>
      </div>

      <section className={`${metricStyle} mt-3`} aria-label="设备与背包">
        <h3 className="text-sm text-amber-200">设备间 · 国产128排CT</h3>
        <p className="mt-2 text-sm text-slate-200">本班工作已交接，控制台保留完整序列。{state.flags.data_hook ? '远程外传已暂停，院内PACS照常使用。' : '工程支持电话留在控制台旁，下一班接班后继续用。'}</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-700 pt-3">
          <p className="text-xs text-slate-300">🎒 {state.items.length ? state.items.map(itemName).join('、') : '背包暂空'}{progress?.pendingCoffee ? ' · 待用咖啡×1' : ''}</p>
          <button className="shrink-0 rounded border border-slate-500 px-3 py-2 text-xs text-slate-100" onClick={onBackpack}>查看背包用途</button>
        </div>
        <p className="mt-2 text-xs text-slate-400">奶茶和零食带回剧情，遇见同事闲聊时再递给对方。</p>
      <div className="mt-3 border-t border-slate-700 pt-3" aria-label="章节与设备" data-ch2-equipment-overview>
        <div className="space-y-1.5 text-sm">
          <p data-equipment="cr" data-unlock={state.finished ? 'complete' : 'available'} className="text-slate-300">{state.finished ? '✅' : '🔓'} 老伙计（CR · X光机）—— <span className="text-slate-400">第一章{state.finished ? '已完成' : state.stepId || state.night > 1 ? '进行中' : '可体验'}</span></p>
          <p data-equipment="ct" data-unlock={complete ? 'complete' : 'current'} className="text-teal-200">{complete ? '✅' : '🔓'} 国产128排CT —— <span className="text-amber-200/90">第二章{complete ? '已完成' : '正在值守'} · 新机已经接过夜班</span></p>
          <p data-equipment="us" data-unlock="locked" className="text-slate-500">🔒 二手超声 —— <span className="text-slate-400">第3章规划 · 开发中，尚未开放</span></p>
          <p data-equipment="mri" data-unlock="locked" className="text-slate-500">🔒 3.0T磁共振 —— <span className="text-slate-400">还是传闻里的东西，尚未开放</span></p>
          <p data-equipment="dr" data-unlock={getDlc('dr') ? state.dlc?.dr?.done ? 'complete' : 'available' : 'locked'} className="text-slate-300">{getDlc('dr') ? '🔓' : '🔒'} 楼上DR机房 —— <span className="text-slate-400">{dlcStatus('dr')}</span></p>
          <p data-equipment="dsa" data-unlock={getDlc('dsa') ? state.dlc?.dsa?.done ? 'complete' : 'available' : 'locked'} className="text-slate-300">{getDlc('dsa') ? '🔓' : '🔒'} 介入室C型臂DSA —— <span className="text-slate-400">{dlcStatus('dsa')}</span></p>
        </div>
        <p className="mt-3 border-t border-slate-700 pt-3 text-xs text-slate-300">📖 {cards}/{CH2_ACTIVE_CARDS.length} · 🏅 {badges}/{CH2_ACTIVE_BADGES.length}</p>
        {(legacyBadges + legacyCards > 0) && <p className="mt-2 text-xs text-slate-400">历史收藏：卡片 {legacyCards} 张、勋章 {legacyBadges} 枚；旧版停颁条目不计入分母。</p>}
      </div>
      </section>

      </div>
      <nav className={`grid shrink-0 ${complete ? 'grid-cols-2' : 'grid-cols-3'} gap-2 border-t border-slate-600/70 bg-slate-950/70 pt-3 md:grid-cols-4`} aria-label="班后功能">
        {!complete && <button onClick={onNext} className="col-span-3 rounded-lg bg-amber-400 px-3 py-3 font-bold text-slate-950 md:col-span-1">{next?.id === 'c2am' ? '🌅 前往晨会' : `🌙 进入下一班 · ${next?.title ?? ''}`}</button>}
        {!complete && <button onClick={onShop} className={buttonStyle}>🛒 小卖部</button>}
        <button onClick={onManual} className={buttonStyle}>📖 夜班手册</button>
        <button onClick={onBadges} className={buttonStyle}>🏅 勋章墙</button>
        <button onClick={onBook} className={buttonStyle}>📚 已解锁书页</button>
        <button onClick={onExit} className={`${buttonStyle} ${complete ? '' : 'col-span-2 md:col-span-3'}`}>返回大厅 · 进度已保存</button>
      </nav>
    </div>
  </section>
}
