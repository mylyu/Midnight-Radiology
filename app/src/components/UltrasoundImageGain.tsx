import { useEffect, useRef, useState } from 'react'
import { applyUltrasoundImageGain } from './ultrasound-image-gain'

type DecodedFrame = { src: string; width: number; height: number; pixels: Uint8ClampedArray }
type Props = { src: string; gain: number; compensation: number }

/** Decode only the image in this exercise; chapter preloading supplies its URL. */
export function UltrasoundImageGain({ src, gain, compensation }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [frame, setFrame] = useState<DecodedFrame>()
  const [failedSrc, setFailedSrc] = useState<string>()
  const ready = frame?.src === src

  useEffect(() => {
    let cancelled = false
    const image = new Image()
    image.src = src
    void image.decode().then(() => {
      if (cancelled) return
      const scale = Math.min(1, 840 / image.naturalWidth)
      const width = Math.max(1, Math.round(image.naturalWidth * scale))
      const height = Math.max(1, Math.round(image.naturalHeight * scale))
      const buffer = document.createElement('canvas')
      buffer.width = width; buffer.height = height
      const context = buffer.getContext('2d')
      if (!context) throw new Error('Image canvas is unavailable')
      context.drawImage(image, 0, 0, width, height)
      setFrame({ src, width, height, pixels: context.getImageData(0, 0, width, height).data })
    }).catch(() => { if (!cancelled) setFailedSrc(src) })
    return () => { cancelled = true }
  }, [src])

  useEffect(() => {
    if (!frame || frame.src !== src || !canvas.current) return
    canvas.current.width = frame.width; canvas.current.height = frame.height
    canvas.current.getContext('2d')?.putImageData(new ImageData(
      applyUltrasoundImageGain(frame.pixels, frame.width, frame.height, gain, compensation),
      frame.width, frame.height,
    ), 0, 0)
  }, [frame, src, gain, compensation])

  return <div className="trilogy-image-gain" data-image-gain-state={ready ? 'ready' : failedSrc === src ? 'error' : 'loading'}>
    <canvas ref={canvas} hidden={!ready} role="img" aria-label="肝脏与右肾同一切面：总体增益调节整幅亮度，深处补偿逐渐提亮深部" />
    {!ready && <p role="status">{failedSrc === src ? '画面暂时未能打开，可以结束练习继续。' : '正在打开病例图…'}</p>}
  </div>
}
