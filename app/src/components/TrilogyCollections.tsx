import { TRILOGY } from '../game/trilogy-registry'
import type { GameState } from '../game/types'
import { isTrilogyPlayable } from '../game/chapter-availability'
import { ownedTrilogyHistory } from '../game/trilogy-collections'

/** Append later collections without changing earlier chapters' denominators. */
export default function TrilogyCollections({ state, mode }: { state: GameState; mode: 'badges' | 'manual' }) {
  return <div data-trilogy-collections={mode} className="w-full max-w-3xl mx-auto space-y-6">
    {Object.values(TRILOGY).filter(chapter => isTrilogyPlayable(chapter.id)
      ? !!state.dlc?.[chapter.id]?.chapter
      : mode === 'badges' ? state.badges.some(id => !!chapter.badges[id] || !!chapter.legacyBadges?.[id]) : (state.cards ?? []).some(id => !!chapter.cards[id] || !!chapter.legacyCards?.[id]))
      .map(chapter => {
      const history = ownedTrilogyHistory(chapter, state)
      return <section key={chapter.id}>
      <h3 className="text-center text-teal-200 tracking-widest mb-3">{chapter.icon} 第{chapter.id.slice(2)}章 · {chapter.title} · {isTrilogyPlayable(chapter.id)
        ? mode === 'badges'
          ? `${state.badges.filter(id => chapter.badges[id]).length}/${Object.keys(chapter.badges).length}`
          : `${(state.cards ?? []).filter(id => chapter.cards[id]).length}/${Object.keys(chapter.cards).length}`
        : `历史收藏 · ${mode === 'badges' ? state.badges.filter(id => chapter.badges[id]).length + history.badges.length + '枚勋章' : (state.cards ?? []).filter(id => chapter.cards[id]).length + history.cards.length + '张卡片'}`}</h3>
      {mode === 'badges' ? <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Object.entries(chapter.badges).filter(([id]) => isTrilogyPlayable(chapter.id) || state.badges.includes(id)).map(([id, badge]) => {
        const owned = state.badges.includes(id)
        return <article key={id} data-collection-badge={id} className={`p-3 rounded-xl border-2 text-center ${owned ? 'bg-teal-100 border-teal-300 text-teal-950' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>
          <span className={`text-3xl ${owned ? '' : 'opacity-30 grayscale'}`}>{badge.icon}</span><h4 className="font-bold text-sm my-2">{owned ? badge.name : '？？？'}</h4><p className="text-xs">{owned ? badge.desc : '尚未解锁'}</p>
        </article>
      })}</div> : Object.entries(chapter.cards).filter(([id]) => state.cards?.includes(id)).map(([id, card]) => <details key={id} data-collection-card={id} className="p-3 rounded-lg border border-slate-600 bg-slate-900 text-slate-200 my-2">
        <summary className="text-teal-200 cursor-pointer">{card.title}</summary><p className="text-sm leading-relaxed mt-2">{card.body}</p>
      </details>)}
      {(mode === 'badges' ? history.badges.length > 0 : history.cards.length > 0) && <div data-trilogy-legacy-collections={mode} className="mt-4">
        <h4 className="mb-2 text-sm text-slate-400">历史收藏 · 已停颁，保留曾经的收获</h4>
        {mode === 'badges' ? <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{history.badges.map(([id, badge]) => <article key={id} data-collection-badge={id} className="p-3 rounded-xl border-2 text-center bg-slate-900 border-slate-600 text-slate-300">
          <span className="text-3xl">{badge.icon}</span><h4 className="font-bold text-sm my-2">{badge.name}</h4><p className="text-xs">{badge.desc}</p>
        </article>)}</div> : history.cards.map(([id, card]) => <details key={id} data-collection-card={id} className="p-3 rounded-lg border border-slate-600 bg-slate-900 text-slate-200 my-2">
          <summary className="text-slate-300 cursor-pointer">{card.title}</summary><p className="text-sm leading-relaxed mt-2">{card.body}</p>
        </details>)}
      </div>}
    </section>})}
  </div>
}
