import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { ch2SliceFrameIndex } from '../game/ch2-scan-sequences'
import type { Ch2SliceSequence as SliceSequence } from '../game/ch2-scan-sequences'
import { assetUrl } from '../lib/chapter-assets'

type Props = { sequence: SliceSequence; progress: number }
type ImageStatus = { asset: string; ready: boolean; failed: boolean }

/** One atlas, one externally supplied clock: image loading never controls scan progress. */
export function Ch2SliceSequence({ sequence, progress }: Props) {
  const [status, setStatus] = useState<ImageStatus>({ asset: sequence.asset, ready: false, failed: false })
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => setReducedMotion(query.matches)
    query.addEventListener('change', change)
    return () => query.removeEventListener('change', change)
  }, [])

  const index = ch2SliceFrameIndex(sequence, reducedMotion ? 0.5 : progress)
  const column = index % sequence.columns
  const row = Math.floor(index / sequence.columns)
  const ready = status.asset === sequence.asset && status.ready
  const failed = status.asset === sequence.asset && status.failed
  const label = ready ? `${sequence.label}，第 ${index + 1} 帧，共 ${sequence.frameCount} 帧`
    : `${sequence.label}，${sequence.preview ? '低清首帧预览，' : ''}${failed ? '教学序列暂未载入，采集继续' : '正在接收教学序列，采集继续'}`
  const style = { '--ch2-slice-aspect': sequence.frameWidth / sequence.frameHeight } as CSSProperties

  return <figure className="ch2-slice-sequence" data-slice-sequence={sequence.id}
    data-slice-frame={index} data-slice-ready={ready ? 'true' : 'false'}
    data-slice-reduced-motion={reducedMotion ? 'true' : 'false'} style={style}>
    <figcaption className="ch2-slice-label">{sequence.label}</figcaption>
    <div className="ch2-slice-screen" role="img" aria-label={label}>
      {!ready && (sequence.preview ? <>
        <img className="ch2-slice-preview" src={sequence.preview} alt="" aria-hidden="true" draggable={false}
          data-slice-preview="true" />
        <span className="ch2-slice-receiving">{failed ? '低清预览 · 断层未载入' : '断层接收中'}</span>
      </> : <p className="ch2-slice-placeholder">{failed ? '教学序列暂未载入' : '正在接收断层图像'}<span>采集继续进行</span></p>)}
      <img key={sequence.asset} className="ch2-slice-atlas" src={assetUrl(sequence.asset)}
        alt="" aria-hidden="true" draggable={false} decoding="async" fetchPriority="high"
        style={{ width: `${sequence.columns * 100}%`, height: `${sequence.rows * 100}%`,
          transform: `translate(${-column / sequence.columns * 100}%, ${-row / sequence.rows * 100}%)`,
          visibility: ready ? 'visible' : 'hidden' }}
        onLoad={event => {
          const image = event.currentTarget
          const valid = image.naturalWidth === sequence.columns * sequence.frameWidth
            && image.naturalHeight === sequence.rows * sequence.frameHeight
          setStatus({ asset: sequence.asset, ready: valid, failed: !valid })
        }}
        onError={() => setStatus({ asset: sequence.asset, ready: false, failed: true })} />
    </div>
    <p className="ch2-slice-counter">{ready ? `断层 ${String(index + 1).padStart(2, '0')} / ${String(sequence.frameCount).padStart(2, '0')}` : '断层序列待接收'}
      {ready && reducedMotion && <span> · 静态预览</span>}</p>
  </figure>
}
