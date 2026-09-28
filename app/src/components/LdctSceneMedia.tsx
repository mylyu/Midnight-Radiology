import { useEffect, useRef, useState } from 'react'
import { assetUrl } from '../lib/chapter-assets'
import { imageAsset } from '../lib/image-assets'
import { ldctSceneCue, LDCT_SCENE_CALLS, LDCT_SCENE_PROPS } from '../game/ldct-presentation'
import './Ch2CommunicationNotice.css'
import './LdctSceneMedia.css'

/** Key by run/node/reply. Consumption is independent of dialogue advancement;
 * reject, mute, background, unmount and refresh never form an input lock. */
export function LdctSceneMedia({ nodeId, gender, consumed, onConsumed, muted }: {
  nodeId: string; gender: 'm' | 'f'; consumed: boolean; onConsumed: (cueId: string) => void; muted: boolean
}) {
  const cue = ldctSceneCue(nodeId, gender)
  const call = LDCT_SCENE_CALLS[nodeId], prop = LDCT_SCENE_PROPS[nodeId]
  const [consumedOnEntry] = useState(consumed)
  const [retry, setRetry] = useState(false)
  const notify = useRef(onConsumed)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const mutedRef = useRef(muted)
  useEffect(() => { notify.current = onConsumed }, [onConsumed])
  useEffect(() => { mutedRef.current = muted; if (muted) audioRef.current?.pause() }, [muted])
  const cueId = cue?.id, file = cue?.asset, volume = cue?.volume
  useEffect(() => {
    if (!cueId || !file || consumedOnEntry) return
    let disposed = false
    const timer = window.setTimeout(() => {
      notify.current(cueId)
      if (mutedRef.current || document.hidden) return
      try {
        const audio = new Audio(assetUrl(file)); audioRef.current = audio
        audio.volume = volume ?? .4; audio.loop = false
        void audio.play().catch(() => { if (!disposed) setRetry(true) })
      } catch { if (!disposed) setRetry(true) }
    }, 0)
    const hide = () => { if (document.hidden) audioRef.current?.pause() }
    document.addEventListener('visibilitychange', hide)
    return () => {
      disposed = true; window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', hide)
      audioRef.current?.pause(); audioRef.current = null
    }
  }, [cueId, file, volume, consumedOnEntry])

  return <>
    {call && <aside className="ch2-communication ldct-communication" data-ldct-call aria-label={`${call.contact} · ${call.status}`}>
      <svg className="ch2-communication-icon" viewBox="0 0 32 32" aria-hidden="true" shapeRendering="crispEdges">
        <rect x="6" y="1" width="20" height="30" fill="#152839" stroke="currentColor" strokeWidth="2" />
        <path d="M12 4h8M14 28h4" stroke="currentColor" strokeWidth="2" />
        <path d="M10 9h4v5h-2v2h2v2h3v-2h5v5h-5v-2h-3v-2h-2v-3h-2z" fill="currentColor" />
      </svg>
      <div className="ch2-communication-copy"><strong>{call.contact}</strong><span>{call.status}</span></div>
    </aside>}
    {prop && <figure className="ldct-story-prop" data-ldct-prop={prop.kind}>
      {prop.image ? <img src={imageAsset(prop.image)} alt="" className="pixel" /> : <svg viewBox="0 0 96 120" aria-hidden="true" shapeRendering="crispEdges">
        <path d="M18 4h60v110l-6-4-6 4-6-4-6 4-6-4-6 4-6-4-6 4-6-4-6 4z" fill="#dad5bc" stroke="#546373" strokeWidth="3" />
        <path d="M29 23h38M29 34h29M29 50h37M29 58h24M29 71h37M29 80h33M29 93h17" stroke="#526271" strokeWidth="3" />
        <path d="M18 42h60M18 87h60" stroke="#b1ac9c" strokeWidth="2" />
      </svg>}
      <figcaption>{prop.caption}</figcaption>
    </figure>}
    {retry && cue && !muted && <button className="ldct-audio-retry" onClick={event => {
      event.stopPropagation()
      const audio = audioRef.current
      if (!audio) return
      audio.currentTime = 0
      void audio.play().then(() => setRetry(false), () => undefined)
    }}>播放声音 · {cue.caption}</button>}
  </>
}
