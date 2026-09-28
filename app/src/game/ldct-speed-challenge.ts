import { LDCT_MANUAL_BP_COUNTS } from './ldct-manual-bp'
import type { LdctProgress } from './ldct-types'

export type LdctSpeedKind = 'backproject' | 'iteration'
export type LdctSpeedChallenge = {
  nodeId: string
  attempt: number
  status: 'running' | 'won' | 'expired' | 'stopped' | 'practice'
  startedAt: number
  deadline: number
  acceptedTaps: number
  progress: number
  lastTapAt: number
}
export type LdctSpeedCommand =
  | { type: 'challenge:start' | 'challenge:expire' | 'challenge:stop' | 'challenge:practice' }
  | { type: 'challenge:tap'; attempt: number; tap: number }

export const LDCT_SPEED_CHALLENGES = {
  backproject: { durationMs: 15000, target: 160, taps: LDCT_MANUAL_BP_COUNTS.length - 1, badge: 'ldct_fast_backproject', badgeName: '手比嘴快' },
  iteration: { durationMs: 10000, target: 12, taps: 12, badge: 'ldct_fast_iteration', badgeName: '再来一轮' },
} as const

/** A saved result is for review, not a new timed attempt. Old stories stay ordinary. */
export function getLdctSpeedKind(p: LdctProgress): LdctSpeedKind | undefined {
  if (p.storyId !== 'father' || p.openingRevision !== 5 || p.phase !== 'lab' || p.labReturn || p.finished) return undefined
  if (p.labRound === 2 && p.nodeId === 'lf_lab_2') return 'backproject'
  if (p.labRound === 5 && p.nodeId === 'lf_lab_5' && p.labDraft.chest && p.labDraft.iterationRound !== undefined) return 'iteration'
  return undefined
}

export const validLdctSpeedTime = (now: number) => Number.isFinite(now) && now > 0
export function startLdctSpeed(kind: LdctSpeedKind, nodeId: string, now: number, previous?: LdctSpeedChallenge): LdctSpeedChallenge {
  return { nodeId, attempt: (previous?.attempt ?? 0) + 1, status: 'running', startedAt: now,
    deadline: now + LDCT_SPEED_CHALLENGES[kind].durationMs, acceptedTaps: 0,
    progress: kind === 'backproject' ? 1 : 0, lastTapAt: now }
}

/** One ordered gesture selects one real precomputed checkpoint. The clock never advances a frame. */
export function tapLdctSpeed(kind: LdctSpeedKind, current: LdctSpeedChallenge, now: number, attempt: number, tap: number): LdctSpeedChallenge {
  if (current.status !== 'running' || !validLdctSpeedTime(now) || now < current.lastTapAt || attempt !== current.attempt) return current
  if (now >= current.deadline) return { ...current, status: 'expired' }
  if (!Number.isInteger(tap) || tap !== current.acceptedTaps + 1) return current
  const progress = kind === 'backproject' ? LDCT_MANUAL_BP_COUNTS[tap] : tap
  if (progress === undefined || tap > LDCT_SPEED_CHALLENGES[kind].taps) return current
  return { ...current, acceptedTaps: tap, progress, lastTapAt: now,
    status: tap === LDCT_SPEED_CHALLENGES[kind].taps ? 'won' : 'running' }
}

export function stopLdctSpeedChallenges(p: LdctProgress): LdctProgress {
  const running = Object.entries(p.speedChallenges ?? {}).filter(([, value]) => value?.status === 'running')
  if (!running.length) return p
  return { ...p, labDraft: p.labRound === 2 || p.labRound === 5 ? { ...p.labDraft, practice: true } : p.labDraft, speedChallenges: { ...p.speedChallenges,
    ...Object.fromEntries(running.map(([kind, value]) => [kind, { ...value, status: 'stopped' as const }])) } }
}
