import { TRILOGY } from '../game/trilogy-registry'
import type { GameState } from '../game/types'

/** Append later collections without changing earlier chapters' denominators. */
export default function TrilogyCollections({ state, mode }: { state: GameState; mode: 'badges' | 'manual' }) {
  return <div data-trilogy-collections={mode} className="w-full max-w-3xl mx-auto space-y-6">
    {Object.values(TRILOGY).filter(chapter => state.dlc?.[chapter.id]?.chapter).map(chapter => <section key={chapter.id}>
      <h3 className="text-center text-teal-200 tracking-widest mb-3">{chapter.icon} 第{chapter.id.slice(2)}章 · {chapter.title} · {mode === 'badges'
        ? `${state.badges.filter(id => chapter.badges[id]).length}/${Object.keys(chapter.badges).length}`
        : `${(state.cards ?? []).filter(id => chapter.cards[id]).length}/${Object.keys(chapter.cards).length}`}</h3>
      {mode === 'badges' ? <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Object.entries(chapter.badges).map(([id, badge]) => {
        const owned = state.badges.includes(id)
        return <article key={id} data-collection-badge={id} className={`p-3 rounded-xl border-2 text-center ${owned ? 'bg-teal-100 border-teal-300 text-teal-950' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>
          <span className={`text-3xl ${owned ? '' : 'opacity-30 grayscale'}`}>{badge.icon}</span><h4 className="font-bold text-sm my-2">{owned ? badge.name : '？？？'}</h4><p className="text-xs">{owned ? badge.desc : '尚未解锁'}</p>
        </article>
      })}</div> : Object.entries(chapter.cards).filter(([id]) => state.cards?.includes(id)).map(([id, card]) => <details key={id} data-collection-card={id} className="p-3 rounded-lg border border-slate-600 bg-slate-900 text-slate-200 my-2">
        <summary className="text-teal-200 cursor-pointer">{card.title}</summary><p className="text-sm leading-relaxed mt-2">{card.body}</p>
      </details>)}
    </section>)}
  </div>
}
