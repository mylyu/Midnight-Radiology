import { useCallback, useEffect, useRef, useState } from 'react'
import { chapterAssetsReady, prepareChapterAssets, type ChapterId, type ChapterLoadProgress } from '../lib/chapter-assets'

type Entry = {
  id: number
  chapter: ChapterId
  extras: string[]
  action: () => void
  autoEnter: boolean
  controller: AbortController
}

/** Admission, not a cover over a running story. No save transaction runs before enter(). */
export function useChapterEntry() {
  const active = useRef<Entry | null>(null)
  const serial = useRef(0)
  const [progress, setProgress] = useState<ChapterLoadProgress | null>(null)

  const cancel = useCallback(() => {
    active.current?.controller.abort()
    active.current = null
    setProgress(null)
  }, [])

  const enter = useCallback(() => {
    const entry = active.current
    if (!entry || !chapterAssetsReady(entry.chapter, entry.extras)) return
    // Consume the intent synchronously, before any subsequent click or hashchange.
    active.current = null
    setProgress(null)
    entry.action()
  }, [])

  const run = useCallback((entry: Entry) => {
    setProgress({ chapter: entry.chapter, status: 'loading', loadedBytes: 0, totalBytes: 0, completed: 0, total: 0, failed: [] })
    void prepareChapterAssets(entry.chapter, entry.extras, value => {
      if (active.current === entry && !entry.controller.signal.aborted) setProgress(value)
    }, entry.controller.signal).then(() => {
      if (active.current === entry && !entry.controller.signal.aborted && entry.autoEnter) enter()
    }).catch(() => {
      // Expected failures already carry exact paths. An unexpected startup
      // failure must also offer retry, never leave an endless loading screen.
      if (active.current !== entry || entry.controller.signal.aborted) return
      setProgress(previous => previous?.status === 'error' ? previous : {
        chapter: entry.chapter, status: 'error', loadedBytes: previous?.loadedBytes ?? 0,
        totalBytes: previous?.totalBytes ?? 0, completed: previous?.completed ?? 0,
        total: previous?.total ?? 0, failed: previous?.failed.length ? previous.failed : ['资源准备'],
      })
    })
  }, [enter])

  const request = useCallback((chapter: ChapterId, extras: string[], action: () => void, autoEnter = false) => {
    active.current?.controller.abort()
    active.current = null
    if (chapterAssetsReady(chapter, extras)) {
      setProgress(null)
      action()
      return
    }
    const entry: Entry = { id: ++serial.current, chapter, extras, action, autoEnter, controller: new AbortController() }
    active.current = entry
    run(entry)
  }, [run])

  const retry = useCallback(() => {
    const previous = active.current
    if (!previous) return
    previous.controller.abort()
    const entry = { ...previous, id: ++serial.current, controller: new AbortController() }
    active.current = entry
    run(entry)
  }, [run])

  useEffect(() => () => { active.current?.controller.abort(); active.current = null }, [])
  return { progress, request, retry, enter, cancel }
}
