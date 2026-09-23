import { useState } from 'react'
import { CH2_ACTIVE_BADGES, CH2_ACTIVE_CARDS, CH2_BADGES, CH2_BADGES_LEGACY, CH2_CARDS, CH2_CARDS_LEGACY, CH2_EVENTS, CH2_EVIDENCE, CH2_SHIFTS } from '../game/ch2'
import { BADGES, SHOP_ITEMS } from '../game/data'
import { CH2_STAT_KEYS, CH2_STAT_NAMES, ch2NetChange, ch2ShiftEntries } from '../game/ch2-ledger'
import type { Ch2LedgerEntry, GameState } from '../game/types'

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
const metricStyle = 'rounded-xl border border-slate-600/90 bg-slate-900/90 p-3 md:p-4 shadow-lg'
const buttonStyle = 'min-h-11 rounded-lg border border-slate-500 bg-slate-800/95 px-3 py-3 text-xs md:text-sm whitespace-nowrap text-slate-100 hover:border-teal-300'

function Receipt({ entry }: { entry: Ch2LedgerEntry }) {
  const stats = [...CH2_STAT_KEYS, 'ap' as const].filter(key => entry.delta[key] !== 0)
  const goods = entry.gained.items.map(itemName), consumed = entry.consumed.map(itemName)
  const badges = entry.gained.badges.map(id => CH2_BADGES[id]?.name ?? BADGES[id]?.name ?? id)
  const cards = entry.gained.cards.map(id => CH2_CARDS[id]?.title ?? id)
  const events = entry.gained.events.map(id => CH2_EVENTS[id]?.title ?? id)
  const evidence = [...new Set(Object.values(CH2_EVIDENCE).filter(row => entry.flags.includes(row.flag)).map(row => row.title))]
  return <li className="border-b border-slate-700/80 py-3 last:border-0">
    <p className="text-sm text-slate-200 break-words">{entry.label.replaceAll('**', '')}</p>
    {stats.length > 0 && <p className="mt-1 text-xs text-amber-200">{stats.map(key => `${CH2_STAT_NAMES[key]} ${signed(entry.delta[key])}`).join(' · ')}</p>}
    {!stats.length && <p className="mt-1 text-xs text-slate-500">数值无变化</p>}
    {goods.length > 0 && <p className="mt-1 text-xs text-teal-200">放入背包：{goods.join('、')}</p>}
    {consumed.length > 0 && <p className="mt-1 text-xs text-slate-400">使用：{consumed.join('、')}</p>}
    {badges.length > 0 && <p className="mt-1 text-xs text-amber-200">🏅 {badges.join('、')}</p>}
    {cards.length > 0 && <p className="mt-1 text-xs text-teal-200">手册：{cards.join('、')}</p>}
    {evidence.length > 0 && <p className="mt-1 text-xs text-sky-200">证物：{evidence.join('、')}</p>}
    {events.length > 0 && <p className="mt-1 text-xs text-slate-300">大事记：{events.join('、')}</p>}
  </li>
}

/** Chapter 2's management screen, intentionally independent of Chapter 1's shop/repair engine. */
export function Ch2Settlement({ state, onNext, onShop, onBackpack, onManual, onBadges, onBook, onExit }: Props) {
  const progress = state.dlc?.ch2, complete = progress?.done || progress?.phase === 'done'
  const shift = CH2_SHIFTS.find(row => row.id === progress?.shift) ?? CH2_SHIFTS[0]
  const [history, setHistory] = useState<string | undefined>()
  const loop = progress?.loop, selected = history ?? (complete ? 'all' : shift.id)
  const currentDelta = ch2NetChange(state, shift.id)
  const first = Object.values(loop?.shifts ?? {})[0]?.start
  const delta = complete && first ? { gold: state.gold - first.gold, skill: state.skill - first.skill,
    heart: state.heart - first.heart, wealth: state.wealth - first.wealth } : currentDelta
  const entries = selected === 'all' ? loop?.entries ?? [] : ch2ShiftEntries(state, selected)
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
  return <section data-ch2-settlement data-ch2-complete={complete ? 'true' : 'false'} aria-label={complete ? '第二章全章汇总' : '第二章班后经营'}
    className="absolute inset-0 z-30 cursor-default overflow-hidden" onClick={event => event.stopPropagation()}>
    <img src={asset('bg_ctcontrol_day_ready')} alt="" className="absolute inset-0 h-full w-full object-cover pixel pointer-events-none" />
    <div className="absolute inset-0 bg-slate-950/55 pointer-events-none" />
    <div className="relative mx-auto flex h-full w-full max-w-4xl flex-col px-3 py-3 md:px-6 md:py-5">
      <div data-ch2-settlement-scroll className="min-h-0 flex-1 overflow-y-auto pb-3 pr-1">
      <header className="mb-4 text-center">
        <p className="text-xs tracking-[0.25em] text-teal-200">第二章 · 快与狠</p>
        <h2 className="mt-2 text-xl text-amber-100 md:text-3xl">{complete ? '🌅 夜班交接完成 · 全章汇总' : `${shift.icon} ${shift.title}「${shift.subtitle}」 · 班后经营`}</h2>
        <p className="mt-2 text-xs text-slate-300">进度已保存。{complete ? '新机器要你看着，老周还在科里。' : '先歇一会儿，下一班等你亲自开始。'}</p>
      </header>

      <div className="grid grid-cols-2 gap-2 md:gap-3" aria-label="本章数值">
        {CH2_STAT_KEYS.map(key => <div key={key} className={metricStyle} data-ch2-stat={key}>
          <p className="text-xs text-slate-400">{{ gold: '💰 科室存款', skill: '🩺 医术', heart: '🧡 人心', wealth: '🏠 家业' }[key]}</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
            <strong className="text-xl font-normal text-slate-100">{state[key]}{key === 'gold' ? ' 金币' : ' 点'}</strong>
            <span className={`text-xs ${delta[key] > 0 ? 'text-emerald-300' : delta[key] < 0 ? 'text-amber-200' : 'text-slate-400'}`}>{!loop ? '变化未记录' : `${recovered ? '记录后' : complete ? '本章' : '本班'} ${signed(delta[key])}`}</span>
          </div>
          {key !== 'gold' && <p className="mt-1 text-xs tracking-widest" aria-hidden="true">{Array.from({ length: 5 }, (_, i) => i < Math.max(0, Math.min(5, state[key])) ? '🟡' : '🟣').join(' ')}{state[key] > 5 ? ' ＋' : ''}</p>}
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
      </section>

      <section className={`${metricStyle} mt-3`} aria-label="班次记录">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm text-amber-200">📝 班次记录</h3><p className="text-xs text-slate-300">📖 {cards}/{CH2_ACTIVE_CARDS.length} · 🏅 {badges}/{CH2_ACTIVE_BADGES.length}</p></div>
        {(legacyBadges + legacyCards > 0) && <p className="mt-2 text-xs text-slate-400">历史收藏：卡片 {legacyCards} 张、勋章 {legacyBadges} 枚；旧版停颁条目不计入分母。</p>}
        {recovered && <p className="mt-2 text-xs text-amber-200/90">旧存档从恢复点开始记录；此前明细未记录，未补算奖励。</p>}
        <div className="mt-3 flex flex-wrap gap-2" aria-label="选择班次记录">
          {['all', ...CH2_SHIFTS.filter(row => loop?.shifts[row.id]).map(row => row.id)].map(id => <button key={id} onClick={() => setHistory(id)} aria-pressed={selected === id}
            className={`rounded border px-2 py-1 text-xs ${selected === id ? 'border-teal-400 bg-teal-950 text-teal-200' : 'border-slate-600 text-slate-300'}`}>{id === 'all' ? '全章' : CH2_SHIFTS.find(row => row.id === id)?.title}</button>)}
        </div>
        <p className="mt-3 text-xs text-slate-400">{entries.filter(row => row.kind === 'case').map(row => row.label).join(' · ') || '病例与互动的明细会随本轮推进保存。'}</p>
        <details className="mt-3"><summary className="cursor-pointer py-1 text-sm text-teal-200">展开收支、物品与选择明细（{entries.length}条）</summary>
          {entries.length ? <ol className="mt-2 max-h-80 overflow-y-auto pr-1">{entries.map(entry => <Receipt key={entry.id} entry={entry} />)}</ol> : <p className="py-3 text-xs text-slate-400">这段进度没有可用明细。之后的变化会逐笔记录。</p>}
        </details>
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
