import { useState } from 'react'
import { CH2_CT_GANTRY_CLIP, CH2_CT_MOTION, ch2CtBedPosition } from '../game/ch2-ct-motion'
import { CH2_SCAN_ILLUSTRATION } from '../game/ch2-scans'
import { imageAsset as imageUrl } from '../lib/image-assets'

/** Stateless time input: reloading/backgrounding resumes at the saved scan time. */
export function Ch2CtMotion({ progress }: { progress: number }) {
  const [layerFailed, setLayerFailed] = useState(false)
  const [fallbackFailed, setFallbackFailed] = useState(false)
  const [loaded, setLoaded] = useState({ room: false, bed: false })
  const position = ch2CtBedPosition(progress)
  if (layerFailed) return fallbackFailed
    ? <p className="ch2-scan-image-fallback">检查进行中 · 图像正在传往工作站</p>
    : <img className="ch2-scan-room" src={imageUrl(CH2_SCAN_ILLUSTRATION)}
      alt="CT检查室与检查床" data-ct-motion-fallback="true" onError={() => setFallbackFailed(true)} />

  return <div className="ch2-ct-motion" role="img" aria-label="检查床与患者沿固定轨道缓缓驶入CT机架"
    data-ct-motion-ready={loaded.room && loaded.bed ? 'true' : 'false'}>
    <img className="ch2-scan-room ch2-ct-fixed-room" src={imageUrl(CH2_CT_MOTION.room)}
      alt="" draggable={false} onLoad={() => setLoaded(value => ({ ...value, room: true }))} onError={() => setLayerFailed(true)} />
    <img className="ch2-ct-sliding-bed" src={imageUrl(CH2_CT_MOTION.bed)} alt="" draggable={false}
      data-ct-travel={position.travel.toFixed(5)}
      style={{ transform: `translate(${position.x / CH2_CT_MOTION.width * 100}%, ${position.y / CH2_CT_MOTION.height * 100}%)` }}
      onLoad={() => setLoaded(value => ({ ...value, bed: true }))} onError={() => setLayerFailed(true)} />
    <img className="ch2-ct-fixed-front" src={imageUrl(CH2_CT_MOTION.room)} alt="" draggable={false}
      style={{ clipPath: CH2_CT_GANTRY_CLIP }} />
  </div>
}
