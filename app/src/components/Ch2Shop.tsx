import { useState } from 'react'
import { SHOP_ITEMS } from '../game/data'
import { buyCh2Item, CH2_ITEM_DESCRIPTIONS, ch2ItemUnavailable, shareCh2Item } from '../game/ch2-session'
import type { GameState } from '../game/types'

type Props = { state: GameState; update: (f: (s: GameState) => GameState) => void; onClose: () => void }
const image = (name: string) => `${import.meta.env.BASE_URL}assets/${name}.png`

/** Separate from Chapter 1's shop: its prices are shared, its counters are not. */
export function Ch2Shop({ state, update, onClose }: Props) {
  const [message, setMessage] = useState('')
  const buy = (id: string) => {
    // eslint-disable-next-line react-hooks/purity -- Invoked only by the buy button, never during render.
    const roll = Math.random(), result = buyCh2Item(state, id, roll)
    setMessage(result.message)
    update(s => buyCh2Item(s, id, roll).state)
  }
  const progress = state.dlc?.ch2
  const count = progress?.shop?.shift === progress?.shift ? progress?.shop?.lotteryCount ?? 0 : 0
  return <div className="fixed inset-0 z-[60] bg-slate-950/85 flex items-center justify-center p-3" onClick={e => { e.stopPropagation(); onClose() }}>
    <section role="dialog" aria-label="第二章小卖部" className="w-full max-w-lg max-h-[90%] overflow-y-auto rounded-xl border-2 border-amber-600 bg-slate-900 p-4 md:p-6" onClick={e => e.stopPropagation()}>
      <header className="flex justify-between items-center gap-3 mb-3"><h3 className="text-xl text-amber-200">🛒 住院部小卖部</h3><span className="text-amber-300">💰 {state.gold}</span></header>
      <p className="text-xs text-slate-400 mb-4">老板娘：「先看用途，别买了又塞柜子里。」</p>
      <div className="flex flex-col gap-2">
        {SHOP_ITEMS.map(item => {
          const reason = ch2ItemUnavailable(state, item.id)
          return <div key={item.id} className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/80 p-3">
            <img src={image(item.image!)} alt="" className="h-10 w-10 shrink-0 object-contain pixel" />
            <div className="min-w-0 flex-1"><p className="text-sm text-slate-100">{item.id === 'toolbox' ? '元件盒' : item.name}</p>
              <p className="text-xs text-slate-400 mt-1">{CH2_ITEM_DESCRIPTIONS[item.id]}</p>
              {item.id === 'lottery' && <p className="text-xs text-slate-400 mt-1">本班已刮 {count}/5</p>}
              {reason && <p className="text-xs text-amber-200/80 mt-1">{reason}</p>}
            </div>
            <button aria-label={`购买${item.name}`} disabled={!!reason || state.gold < item.price} onClick={() => buy(item.id)} className="shrink-0 rounded bg-amber-400 px-2 py-2 text-xs font-bold text-slate-950 disabled:opacity-35">{item.price}💰</button>
          </div>
        })}
      </div>
      {message && <p role="status" className="mt-3 text-sm text-emerald-300">{message}</p>}
      <button onClick={onClose} className="mt-4 w-full rounded-lg border border-slate-500 bg-slate-800 py-2 text-slate-100">离开小卖部</button>
    </section>
  </div>
}

export function Ch2Backpack({ state, update, onClose }: Props) {
  const [message, setMessage] = useState('')
  const share = (id: 'milktea' | 'snack') => {
    update(s => shareCh2Item(s, id))
    setMessage(id === 'milktea' ? '小唐接过奶茶：「吸管呢？……哦，在袋底。」大家一人拿了一杯。' : '老周掀开盒盖：「给我留个丸子。」你把夜宵放到桌中间。人心 +1。')
  }
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/85 p-4" onClick={e => { e.stopPropagation(); onClose() }}>
    <section role="dialog" aria-label="第二章背包" className="max-h-[88%] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-500 bg-slate-900 p-5" onClick={e => e.stopPropagation()}>
      <h3 className="text-xl text-teal-200 mb-4">🎒 背包 · 用得上的东西</h3>
      {!state.items.length && !state.dlc?.ch2?.pendingCoffee && <p className="text-sm text-slate-400">背包暂时是空的，可以去小卖部看看。</p>}
      {state.dlc?.ch2?.pendingCoffee && <p className="mb-3 text-sm text-amber-200">☕ 咖啡已留好：下一次夜间自由探索自动加 1 点行动力。</p>}
      {state.items.map(id => {
        const item = SHOP_ITEMS.find(row => row.id === id)
        return <div key={id} className="mb-3 rounded-lg border border-slate-700 p-3">
          <p className="text-slate-100">{item?.icon} {id === 'toolbox' ? '元件盒' : item?.name ?? id}</p>
          <p className="text-xs text-slate-400 mt-1">{CH2_ITEM_DESCRIPTIONS[id] ?? '原有收藏，继续妥善保管。'}</p>
          {(id === 'milktea' || id === 'snack') && state.dlc?.ch2?.phase === 'settle' && <button onClick={() => share(id)} className="mt-2 rounded bg-teal-600 px-3 py-2 text-sm text-white">{id === 'milktea' ? '请同事喝奶茶' : '把夜宵分给同事'}</button>}
        </div>
      })}
      {message && <p role="status" className="text-sm text-emerald-200 mb-3">{message}</p>}
      <button onClick={onClose} className="w-full rounded border border-slate-500 py-2 text-slate-100">收好背包</button>
    </section>
  </div>
}
