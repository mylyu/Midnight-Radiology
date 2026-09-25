import { useState } from 'react'
import { imageAsset, imagePreview } from '../lib/image-assets'

/** Chapter admission already fetched and validated the image. Display the local
 * compressed blob without restarting a scene-time HTTP download. */
export function SceneBackground({ name, fixed = false, landscapeOnly = false }: { name: string; fixed?: boolean; landscapeOnly?: boolean }) {
  const [failed, setFailed] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const pos = fixed ? 'fixed' : 'absolute'
  const url = imageAsset(name)
  return <>
    <div aria-hidden className={`${pos} inset-0 pointer-events-none bg-gradient-to-br from-slate-700 via-slate-900 to-cyan-950`} />
    {imagePreview(name) && <img src={imagePreview(name)} data-scene-preview={name} aria-hidden className={`${pos} inset-0 w-full h-full object-cover ${landscapeOnly ? '' : 'portrait:object-contain portrait:scale-[1.65] portrait:-translate-y-[5%]'} pixel pointer-events-none`} alt="" />}
    {!landscapeOnly && <img src={url} data-scene-backdrop={name} aria-hidden className={`${pos} inset-0 w-full h-full object-cover blur-2xl scale-125 opacity-60 pixel hidden portrait:block pointer-events-none`} alt="" />}
    <img key={`${name}:${attempt}`} src={url} data-scene-background={name} fetchPriority="high" className={`${pos} inset-0 w-full h-full object-cover ${landscapeOnly ? '' : 'portrait:object-contain portrait:scale-[1.65] portrait:-translate-y-[5%]'} pixel pointer-events-none`}
      onError={() => setFailed(name)} alt="" />
    {failed === name && <div data-scene-load-status="error" className={`${pos} inset-0 z-[110] flex items-center justify-center bg-slate-950/90 p-6`}
      onClick={event => event.stopPropagation()} onPointerDown={event => event.stopPropagation()}>
      <div className="rounded-xl border border-slate-500 bg-slate-900 p-5 text-center text-sm text-slate-100">
        <p role="alert">场景图片暂时无法显示，请重试。</p>
        <button className="mt-3 min-h-11 rounded border border-teal-500 px-4 text-teal-200" onClick={() => { setFailed(null); setAttempt(value => value + 1) }}>重新显示</button>
      </div>
    </div>}
  </>
}
