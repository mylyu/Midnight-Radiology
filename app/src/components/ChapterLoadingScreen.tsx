import type { ChapterLoadProgress } from '../lib/chapter-assets'

const titles = { shell: '准备游戏', ch1: '第一章 · 老伙计', ch2: '第二章 · 快与狠', dr: '番外篇 · DR 白班', dsa: '番外篇 · DSA 导管室' }
const mb = (bytes: number) => (bytes / 1048576).toFixed(1)

export function ChapterLoadingScreen({ progress, onRetry, onBack, onEnter }: {
  progress: ChapterLoadProgress
  onRetry: () => void
  onBack?: () => void
  onEnter?: () => void
}) {
  const complete = progress.status === 'ready'
  const failed = progress.status === 'error'
  // The last percent belongs to validation, not merely receiving the response body.
  const percent = complete ? 100 : Math.min(99, Math.floor(progress.totalBytes ? progress.loadedBytes / progress.totalBytes * 100 : 0))
  return <main className="absolute inset-0 z-[120] flex min-h-0 items-center justify-center overflow-y-auto bg-slate-950 p-5 text-slate-100"
    data-chapter-loader data-chapter-loading={progress.chapter} data-loading-status={progress.status}
    data-chapter={progress.chapter} data-status={progress.status}
    onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>
    <section className="my-auto w-full max-w-lg rounded-2xl border-2 border-teal-700/70 bg-slate-900 p-6 shadow-2xl md:p-8" aria-labelledby="chapter-loading-title">
      <p className="mb-3 text-xs tracking-[0.25em] text-teal-300">深夜影像科</p>
      <h1 id="chapter-loading-title" className="text-2xl font-bold">{titles[progress.chapter]}</h1>
      <p role="status" className="mt-4 min-h-12 text-sm leading-relaxed text-slate-300">{complete ? '本章资源已准备好，可以开始了。'
        : failed ? '部分资源未能载入。已完成的内容会保留，重试即可。'
        : '正在完整加载本章图片和声音，请稍候。加载期间不会开始剧情。'}</p>
      <div className="mt-5 h-3 overflow-hidden rounded-full border border-slate-600 bg-slate-800" role="progressbar" aria-label="章节资源加载进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <div className="h-full bg-teal-400 transition-[width] duration-150" style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-3 flex justify-between gap-3 text-sm tabular-nums"><span>{percent}%</span><span>{mb(progress.loadedBytes)} / {mb(progress.totalBytes)} MB</span></div>
      <p className="mt-2 text-xs text-slate-400">已就绪 {progress.completed} / {progress.total} 项{progress.status === 'validating' ? ' · 校验资源中' : ''}</p>
      {failed && <p className="mt-3 text-sm text-amber-300">尚有 {progress.failed.length} 项未完成，请检查网络连接。</p>}
      <div className="mt-6 flex flex-wrap gap-3">
        {failed && <button onClick={onRetry} className="min-h-12 flex-1 rounded-lg bg-teal-400 px-5 font-bold text-slate-950">重试未完成资源</button>}
        {complete && onEnter && <button data-chapter-enter onClick={onEnter} className="min-h-12 flex-1 rounded-lg bg-teal-400 px-5 font-bold text-slate-950">进入章节</button>}
        {onBack && <button onClick={onBack} className="min-h-12 rounded-lg border border-slate-500 px-5 text-slate-300">返回大厅</button>}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-slate-500">已缓存的资源会复用，无需每次重新下载。</p>
    </section>
  </main>
}
