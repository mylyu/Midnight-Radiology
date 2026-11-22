import { useEffect, useState, type ReactNode } from 'react'
import { playSfx } from '../game/store'

export interface PaperBookPage {
  title: string
  body: string
  note?: string
}

/** The original Chapter 1 paper book, shared without creating chapter-specific skins. */
export function PaperBookOverlay({
  id, title, subtitle, pages, unlocked, initialPage, lockedText, closeText,
  renderText = text => text, onPageChange, reward, rewardPage, trilogy = false, sound = true, onClose,
}: {
  id: 'ch1' | 'ch3' | 'ch4'
  title: string
  subtitle: string
  pages: PaperBookPage[]
  unlocked: number
  initialPage: number
  lockedText: (page: number) => string
  closeText: string
  renderText?: (text: string) => ReactNode
  onPageChange?: (page: number) => void
  reward?: ReactNode
  /** Defaults to the newest unlocked page, preserving Chapter 1's feedback. */
  rewardPage?: number
  trilogy?: boolean
  sound?: boolean
  onClose: () => void
}) {
  const [page, setPage] = useState(initialPage)
  const current = pages[page]
  const turn = (next: number) => {
    if (sound) playSfx('click')
    setPage(next)
  }
  useEffect(() => {
    onPageChange?.(page)
    // The initial page and subsequent real page turns are the only reward triggers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  return <div
    data-paper-book={id}
    data-paper-page={page + 1}
    data-paper-unlocked={unlocked}
    data-ch3-book={id === 'ch3' ? '' : undefined}
    data-ch4-book={id === 'ch4' ? '' : undefined}
    className={`fixed inset-0 ${trilogy ? 'z-[70]' : 'z-40'} bg-slate-950/80 flex items-center justify-center p-4`}
    onClick={onClose}
  >
    <div className="bg-amber-50 border-2 border-amber-700/60 rounded-2xl p-5 md:p-6 max-w-lg w-full max-h-[88%] flex flex-col shadow-2xl" onClick={event => event.stopPropagation()}>
      <div className="flex items-center justify-between mb-1 shrink-0">
        <h3 className="text-lg text-amber-900 tracking-widest font-bold">{title}</h3>
        <span className="text-amber-700/70 text-xs">第 {page + 1} 页 / 共 {pages.length} 页</span>
      </div>
      <p className="text-amber-800/60 text-xs mb-3 shrink-0">{subtitle}</p>
      <div className="border-t border-b border-amber-700/30 py-3 mb-3 overflow-y-auto min-h-0">
        <h4 className="text-amber-950 font-bold mb-2 text-sm md:text-base">{current.title}</h4>
        <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">{renderText(current.body)}</p>
        {current.note && <p className="text-amber-800/80 text-xs mt-3 italic">{current.note}</p>}
      </div>
      {reward && page === (rewardPage ?? unlocked - 1) && reward}
      <div className="flex items-center justify-between gap-2 shrink-0" aria-label="翻书">
        <button disabled={page <= 0} onClick={() => turn(page - 1)}
          className="px-4 py-2 rounded-lg border border-amber-700/50 text-amber-900 text-sm disabled:opacity-30 hover:bg-amber-100">← 上一页</button>
        {page < unlocked - 1 ? (
          <button onClick={() => turn(page + 1)}
            className="px-4 py-2 rounded-lg border border-amber-700/50 text-amber-900 text-sm hover:bg-amber-100">下一页 →</button>
        ) : page < pages.length - 1 ? (
          <span className="text-amber-700/60 text-xs">{lockedText(page)}</span>
        ) : (
          <span className="text-amber-700/60 text-xs">—— 全书完 ——</span>
        )}
      </div>
      <button
        data-trilogy-close-overlay={trilogy ? true : undefined}
        onClick={() => { if (sound) playSfx('click'); onClose() }}
        className="mt-4 w-full py-2 rounded-lg bg-amber-800 text-amber-50 text-sm hover:bg-amber-700 shrink-0"
      >{closeText}</button>
    </div>
  </div>
}
