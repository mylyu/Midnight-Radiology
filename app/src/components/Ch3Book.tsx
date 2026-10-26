import { useState } from 'react'
import type { ReactNode } from 'react'
import type { TrilogyChapter } from '../game/trilogy-types'

/** CH2's paper-and-page presentation, with CH3's own content/unlock schedule. */
export function Ch3Book({ chapter, shift, renderText, onClose }: {
  chapter: TrilogyChapter; shift: number; renderText: (text: string) => ReactNode; onClose: () => void
}) {
  const unlocked = Math.min(chapter.book.length, (shift + 1) * 4)
  const [page, setPage] = useState(Math.max(0, unlocked - 4))
  const current = chapter.book[page]
  return <div data-ch3-book className="fixed inset-0 z-[70] bg-slate-950/80 flex items-center justify-center p-4" onClick={onClose}>
    <section className="bg-amber-50 border-2 border-amber-700/60 rounded-2xl p-5 md:p-6 max-w-lg w-full max-h-[88%] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
      <header className="flex items-center justify-between gap-2 mb-1 shrink-0">
        <h3 className="text-lg text-amber-900 tracking-widest font-bold">📖 超声跟班二十页</h3>
        <span className="text-amber-700/70 text-xs shrink-0">第 {page + 1} 页 / 共 {chapter.book.length} 页</span>
      </header>
      <p className="text-amber-800/60 text-xs mb-3 shrink-0">梅姐在封底写着：「看不明白，再翻回来。」每班多翻开四页，现已解锁 {unlocked} 页。</p>
      <div className="border-t border-b border-amber-700/30 py-3 mb-3 overflow-y-auto min-h-0">
        <h4 className="text-amber-950 font-bold mb-2 text-sm md:text-base">{current.title}</h4>
        <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">{renderText(current.body)}</p>
      </div>
      <nav className="flex items-center justify-between gap-2 shrink-0" aria-label="翻书">
        <button disabled={page <= 0} onClick={() => setPage(p => Math.max(0, p - 1))}
          className="px-4 py-2 rounded-lg border border-amber-700/50 text-amber-900 text-sm disabled:opacity-30 hover:bg-amber-100">← 上一页</button>
        {page < unlocked - 1 ? <button onClick={() => setPage(p => Math.min(unlocked - 1, p + 1))}
          className="px-4 py-2 rounded-lg border border-amber-700/50 text-amber-900 text-sm hover:bg-amber-100">下一页 →</button>
          : <span className="text-amber-700/60 text-xs">{unlocked < chapter.book.length ? '🔒 后续四页：下一班次解锁' : '—— 全书完 ——'}</span>}
      </nav>
      <button data-trilogy-close-overlay onClick={onClose} className="mt-4 w-full py-2 rounded-lg bg-amber-800 text-amber-50 text-sm hover:bg-amber-700 shrink-0">合上书，回科室</button>
    </section>
  </div>
}
