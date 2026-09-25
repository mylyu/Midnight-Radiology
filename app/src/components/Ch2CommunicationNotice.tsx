import { useEffect, useRef, useState } from 'react'
import { CH2_COMMUNICATIONS, CH2_COMMUNICATION_AUDIO } from '../game/ch2-communications'
import { assetUrl } from '../lib/chapter-assets'
import './Ch2CommunicationNotice.css'

const muteKey = 'midnight-radiology-ch2-communications-muted-v1'

/** Small visual cue stays for the conversation; only the incoming node sounds.
 * Key by step ID. Persist before play; denied autoplay never locks or retries late. */
export function Ch2CommunicationNotice({ stepId, consumed, onConsumed }: {
  stepId: string; consumed: boolean; onConsumed: () => void
}) {
  const event = CH2_COMMUNICATIONS[stepId]
  const [consumedOnEntry] = useState(consumed)
  const [muted, setMuted] = useState(() => {
    try { return localStorage.getItem(muteKey) === '1' } catch { return false }
  })
  const mutedRef = useRef(muted)
  const notify = useRef(onConsumed)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const started = useRef(false)
  useEffect(() => { notify.current = onConsumed }, [onConsumed])
  useEffect(() => {
    if (!event?.cue || consumedOnEntry) return
    const timer = window.setTimeout(() => {
      if (started.current) return
      started.current = true
      notify.current()
      if (mutedRef.current || document.hidden) return
      try {
        const audio = new Audio(assetUrl(CH2_COMMUNICATION_AUDIO[event.cue!]))
        audioRef.current = audio
        audio.volume = event.cue === 'landline' ? 0.22 : 0.45
        audio.loop = false
        void audio.play().catch(() => undefined)
      } catch { /* The icon and existing dialogue remain sufficient. */ }
    }, 0)
    const hide = () => { if (document.hidden) audioRef.current?.pause() }
    document.addEventListener('visibilitychange', hide)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', hide)
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [event, consumedOnEntry])

  if (!event) return null
  return <aside className="ch2-communication" data-ch2-communication={event.kind}
    aria-label={`${event.device} · ${event.contact} · ${event.status}`}>
    {/* Code-native pixel icon: no new image download or character impersonation. */}
    <svg className="ch2-communication-icon" viewBox="0 0 32 32" aria-hidden="true" shapeRendering="crispEdges">
      <rect x="6" y="1" width="20" height="30" fill="#152839" stroke="currentColor" strokeWidth="2" />
      <path d="M12 4h8M14 28h4" stroke="currentColor" strokeWidth="2" />
      {event.kind === 'call'
        ? <path d="M10 9h4v5h-2v2h2v2h3v-2h5v5h-5v-2h-3v-2h-2v-3h-2z" fill="currentColor" />
        : <><path d="M9 9h14v11h-8l-4 4v-4H9z" fill="currentColor" /><path d="M12 13h8M12 16h6" stroke="#152839" strokeWidth="2" /></>}
    </svg>
    <div className="ch2-communication-copy">
      <strong>{event.contact}</strong>
      <span>{event.device} · {event.status}</span>
    </div>
    <button type="button" className="ch2-communication-mute" aria-label="通信提示音静音" aria-pressed={muted}
      onClick={e => {
        e.stopPropagation()
        const next = !mutedRef.current
        mutedRef.current = next; setMuted(next)
        if (next) audioRef.current?.pause()
        try { localStorage.setItem(muteKey, next ? '1' : '0') } catch { /* Session preference still works. */ }
      }}>{muted ? '音效关' : '音效开'}</button>
  </aside>
}
