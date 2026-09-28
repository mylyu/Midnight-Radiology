import { useEffect, useRef, useState } from 'react'
import { LDCT_SPEED_CHALLENGES } from '../game/ldct-speed-challenge'
import type { LdctSpeedChallenge as Challenge, LdctSpeedCommand, LdctSpeedKind } from '../game/ldct-speed-challenge'

export type LdctSpeedProps = {
  challengeKind?: LdctSpeedKind
  challenge?: Challenge
  onChallengeAction?: (command: LdctSpeedCommand) => void
}

/** This small timer can only end a contest. Reconstruction still requires gestures. */
export function LdctSpeedChallenge({ kind, challenge, onAction }: {
  kind: LdctSpeedKind; challenge?: Challenge; onAction: (command: LdctSpeedCommand) => void
}) {
  const [clock, setClock] = useState(() => Date.now())
  const send = useRef(onAction)
  useEffect(() => { send.current = onAction }, [onAction])
  const running = challenge?.status === 'running'
  const deadline = challenge?.deadline
  useEffect(() => {
    if (!running || deadline === undefined) return
    let unloading = false
    const tick = () => {
      const now = Date.now()
      setClock(now)
      if (now >= deadline) send.current({ type: 'challenge:expire' })
    }
    const leaveDocument = () => { unloading = true }
    const hidden = () => { if (document.hidden && !unloading) send.current({ type: 'challenge:stop' }) }
    const leaveRoute = () => { if (!location.hash.startsWith('#/dlc/ldct')) send.current({ type: 'challenge:stop' }) }
    const interval = window.setInterval(tick, 100)
    document.addEventListener('visibilitychange', hidden)
    window.addEventListener('beforeunload', leaveDocument)
    window.addEventListener('hashchange', leaveRoute)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', hidden)
      window.removeEventListener('beforeunload', leaveDocument)
      window.removeEventListener('hashchange', leaveRoute)
    }
  }, [running, deadline])
  const config = LDCT_SPEED_CHALLENGES[kind]
  const remaining = running && challenge ? Math.max(0, challenge.deadline - clock) : config.durationMs
  const status = challenge?.status ?? 'ready'
  return <aside className="ldct-speed" data-testid="ldct-speed-challenge" data-challenge-kind={kind} data-challenge-status={status}
    data-challenge-taps={challenge?.acceptedTaps ?? 0}>
    <div className="ldct-speed__heading"><strong>和陆舟比手速</strong>
      {running && <output aria-label="挑战剩余秒数">{(remaining / 1000).toFixed(1)} 秒</output>}</div>
    {running ? <>
      <progress aria-label="挑战剩余时间" max={config.durationMs} value={remaining} />
      <p className="ldct-speed__note">已点 {challenge!.acceptedTaps} / {config.taps} 次 · 只点主按钮，后台停局。</p>
      <button className="ldct-lab__quiet" onClick={() => onAction({ type: 'challenge:practice' })}>不比了，普通练习</button></>
      : <><p role="status">{status === 'won' ? `赢了！「${config.badgeName}」勋章已收好。` : status === 'expired'
        ? '时间到，图还在。可以继续，也可以再来。' : status === 'stopped'
        ? '这一局已停止，图还在。可以继续。' : status === 'practice'
        ? '不计时，慢慢看；随时可以继续。' : `${config.durationMs / 1000}秒 · ${config.taps}次点击 · 赢勋章，超时也能继续。`}</p>
        <div className="ldct-speed__choices"><button data-testid="ldct-speed-start" onClick={() => onAction({ type: 'challenge:start' })}>{challenge ? '再比一局（从头开始）' : '开始比手速'}</button>
          {status !== 'practice' && <button data-testid="ldct-speed-practice" onClick={() => onAction({ type: 'challenge:practice' })}>不计时，普通练习</button>}</div>
        </>}
  </aside>
}
