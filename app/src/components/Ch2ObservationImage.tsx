import { useState } from 'react'
import type { Ch2ObservationRegion } from '../game/ch2-observations'
import { imageAsset } from '../lib/image-assets'

interface Props {
  image: string
  label?: string
  caption?: string
  /** Pass regions only AFTER a saved response. They must never reveal the answer early. */
  regions?: Ch2ObservationRegion[]
}

/** Keeps the original dialogue/choices below the image; no separate exam UI. */
export function Ch2ObservationImage({ image, label, caption, regions }: Props) {
  const [failedImage, setFailedImage] = useState<string | null>(null)
  return <div className="absolute inset-x-0 top-14 z-10 flex flex-col items-center justify-center pointer-events-none"
    style={{ bottom: 'calc(var(--ch2-dialog-height, 240px) + 12px)' }}>
    <div className="relative max-w-[90%]">
      {failedImage === image
        ? <p role="status" className="rounded-lg border border-slate-600 bg-slate-950/95 p-4 text-sm text-slate-200">图像暂未载入，可以请同事带看并继续，或刷新重试。</p>
        : <img src={imageAsset(image)} onError={() => setFailedImage(image)}
          style={{ maxHeight: 'max(100px, calc(var(--apph, 100vh) - var(--ch2-dialog-height, 240px) - 110px))' }}
          className="max-w-full object-contain rounded-lg border-4 border-slate-700 shadow-2xl pixel" alt={caption ?? '影像或证物'} />}
      {failedImage !== image && regions?.map((region, index) => <span key={index} aria-label={region.label}
        className="absolute border-2 border-amber-300 rounded-full"
        style={{ left: `${region.x * 100}%`, top: `${region.y * 100}%`, width: `${region.width * 100}%`, height: `${region.height * 100}%` }} />)}
    </div>
    {caption && <p className="mt-1 mx-2 px-2 py-1 rounded bg-slate-950/90 text-amber-100 text-[10px] md:text-xs text-center">{caption}</p>}
    {label && <p className="mt-2 rounded border border-teal-600 bg-slate-950/95 px-3 py-1 text-xs md:text-sm text-teal-100">{label}</p>}
  </div>
}
