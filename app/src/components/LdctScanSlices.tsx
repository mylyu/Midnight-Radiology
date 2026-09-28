import { useState } from 'react'
import { ldctChestFrame } from '../game/ldct-chest'
import { ldctNoisyChestFrame } from '../game/ldct-noisy-chest'
import { imageAsset } from '../lib/image-assets'

/** Content adapter only: Ch2 owns the 3-second clock, motion, sound and layout. */
export function LdctScanSlices({ progress, noisy }: { progress: number; noisy: boolean }) {
  const [reduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [failed, setFailed] = useState(false)
  // Finish on the same central layer shown in the following first-FBP conversation.
  const slice = reduced ? 1 : ([0, 1, 2, 1] as const)[Math.min(3, Math.max(0, Math.floor(progress * 4)))]
  const frame = noisy ? ldctNoisyChestFrame('fbp', slice) : ldctChestFrame('fbp', slice)
  return <figure className="ch2-slice-sequence" data-slice-sequence="ldct-father-chest" data-slice-frame={slice}>
    <figcaption className="ch2-slice-label">胸部 · 同次数据相邻层</figcaption>
    <div className="ch2-slice-screen" role="img" aria-label={`胸部第${slice + 1}层，未标注病灶`}>
      {failed ? <p className="ch2-slice-placeholder">图像待接收<span>采集继续进行</span></p> : <img
        className="ch2-slice-atlas" src={imageAsset(frame.mediaId)} alt="" draggable={false}
        style={{ width: `${frame.columns * 100}%`, height: `${frame.rows * 100}%`,
          transform: `translate(${-frame.column / frame.columns * 100}%, ${-frame.row / frame.rows * 100}%)` }}
        onError={() => setFailed(true)} />}
    </div>
    <p className="ch2-slice-counter">第 {slice + 1} / 3 层{reduced ? ' · 静态预览' : ''}</p>
  </figure>
}
