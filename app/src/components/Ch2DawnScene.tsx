import { useEffect, useRef, useState } from 'react'
import type { Ch2DawnShot } from '../game/ch2-dawn'
import { imageAsset } from '../lib/image-assets'
import './Ch2DawnScene.css'

/** Presentation only: the existing dialogue remains the sole progression
 * control. No audio, timeout gate, reward callback or animation-end dependency. */
export function Ch2DawnScene({ shot }: { shot: Ch2DawnShot }) {
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const frame = useRef(0)
  useEffect(() => () => cancelAnimationFrame(frame.current), [])
  const reveal = () => {
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      frame.current = requestAnimationFrame(() => setReady(true))
    })
  }
  return <div className="ch2-dawn-scene" data-ch2-sunrise-cinematic={shot} data-ready={ready} aria-label="交班后，与小唐在东窗边看日出">
    <div className="ch2-dawn-frame">
      <div className="ch2-dawn-camera" data-dawn-camera>
        <picture>
          <source media="(orientation: portrait)" srcSet={imageAsset('ch2_dawn_window_portrait_v1')} />
          <img src={imageAsset('ch2_dawn_window_v1')}
            alt="小唐靠着走廊窗台，看晨光越过县城屋顶" draggable={false}
            onLoad={reveal} onError={() => { setFailed(true); reveal() }} />
        </picture>
      </div>
      <div className="ch2-dawn-matte ch2-dawn-matte-top" />
      <div className="ch2-dawn-matte ch2-dawn-matte-bottom" />
      <span className="ch2-dawn-location">交班以后 · 东窗</span>
      {failed && <p className="ch2-dawn-fallback">窗外渐渐亮起来。你和小唐在窗边停了一会儿。</p>}
    </div>
  </div>
}
