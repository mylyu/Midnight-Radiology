import { useEffect, useRef, useState } from 'react'
import { imageAsset, imagePreview } from '../lib/image-assets'

type Frame = { name: string; url: string }
const TIMEOUT = 20_000

function decodeWithAbort(image: HTMLImageElement, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = () => { signal.removeEventListener('abort', abort); reject(new Error('Image decode aborted')) }
    // A response body can finish just as its deadline expires. Do not wait for an event that already fired.
    if (signal.aborted) { abort(); return }
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) { abort(); return }
    void Promise.resolve().then(() => image.decode()).then(() => {
      signal.removeEventListener('abort', abort)
      if (signal.aborted) reject(new Error('Image decode aborted'))
      else resolve()
    }, error => { signal.removeEventListener('abort', abort); reject(error) })
  })
}

/** On-demand, high-priority scene image. Never gates story, sound or save state. */
export function SceneBackground({ name, fixed = false, landscapeOnly = false }: { name: string; fixed?: boolean; landscapeOnly?: boolean }) {
  const [frame, setFrame] = useState<Frame | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const activeUrl = useRef<string | null>(null)
  const pos = fixed ? 'fixed' : 'absolute'
  const ready = frame?.name === name

  useEffect(() => {
    let alive = true
    let request: AbortController | undefined
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let deadline: ReturnType<typeof setTimeout> | undefined
    let pendingUrl: string | undefined
    let pendingImage: HTMLImageElement | undefined
    const preferred = imageAsset(name)
    const load = async (index: number) => {
      request = new AbortController()
      deadline = setTimeout(() => request?.abort(), TIMEOUT)
      try {
        // Retry the same small content-hashed asset; bypass a stale response, not the size budget.
        const response = await fetch(preferred, { signal: request.signal, priority: 'high', cache: index > 0 || attempt > 0 ? 'reload' : 'default' } as RequestInit)
        if (!response.ok) throw new Error(`Image HTTP ${response.status}`)
        const blob = await response.blob()
        if (!alive) return
        pendingUrl = URL.createObjectURL(blob)
        pendingImage = new Image()
        pendingImage.src = pendingUrl
        await decodeWithAbort(pendingImage, request.signal)
        if (!alive) return
        if (request.signal.aborted) throw new Error('Image request timed out')
        clearTimeout(deadline)
        const old = activeUrl.current
        activeUrl.current = pendingUrl
        setFrame({ name, url: pendingUrl })
        pendingUrl = undefined
        if (old) URL.revokeObjectURL(old)
      } catch {
        if (!alive) return
        clearTimeout(deadline)
        if (pendingUrl) { URL.revokeObjectURL(pendingUrl); pendingUrl = undefined }
        if (index < 2) retryTimer = setTimeout(() => { void load(index + 1) }, (index + 1) * 700)
        else setFailed(name)
      }
    }
    void load(0)
    return () => {
      alive = false
      request?.abort()
      clearTimeout(deadline)
      clearTimeout(retryTimer)
      if (pendingImage) pendingImage.src = ''
      if (pendingUrl) URL.revokeObjectURL(pendingUrl)
    }
  }, [name, attempt])

  useEffect(() => () => { if (activeUrl.current) URL.revokeObjectURL(activeUrl.current) }, [])

  return <>
    {!frame && <div aria-hidden className={`${pos} inset-0 pointer-events-none bg-gradient-to-br from-slate-700 via-slate-900 to-cyan-950`} />}
    {!frame && imagePreview(name) && <img src={imagePreview(name)} data-scene-preview={name} aria-hidden className={`${pos} inset-0 w-full h-full object-cover ${landscapeOnly ? '' : 'portrait:object-contain portrait:scale-[1.65] portrait:-translate-y-[5%]'} pixel pointer-events-none`} alt="" />}
    {frame && <>
      {!landscapeOnly && <img src={frame.url} data-scene-backdrop={frame.name} aria-hidden className={`${pos} inset-0 w-full h-full object-cover blur-2xl scale-125 opacity-60 pixel hidden portrait:block pointer-events-none`} alt="" />}
      <img src={frame.url} data-scene-background={frame.name} fetchPriority="high" className={`${pos} inset-0 w-full h-full object-cover ${landscapeOnly ? '' : 'portrait:object-contain portrait:scale-[1.65] portrait:-translate-y-[5%]'} pixel pointer-events-none`} alt="" />
    </>}
    {!ready && <div data-scene-load-status={failed === name ? 'error' : 'loading'} className={`${pos} top-14 right-3 z-[45] max-w-[min(80vw,320px)] rounded-lg border border-slate-500 bg-slate-950/95 px-3 py-2 text-xs text-slate-100 shadow-lg pointer-events-auto`}
      onClick={event => event.stopPropagation()} onPointerDown={event => event.stopPropagation()}>
      <p role="status">{failed === name ? '背景暂未载入，剧情可以继续。' : frame ? '正在加载新场景，暂留上一场景。' : '正在加载场景图片…'}</p>
      {failed === name && <button className="mt-2 min-h-10 rounded border border-teal-500 px-3 text-teal-200" onClick={() => { setFailed(null); setAttempt(value => value + 1) }}>重试背景</button>}
    </div>}
  </>
}
