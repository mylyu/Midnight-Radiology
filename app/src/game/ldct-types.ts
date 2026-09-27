import type { LdctLabRecord, LdctLabState, LdctLabRound } from './ldct-experiments'

export type LdctPerson = 'luzhou' | 'lei' | 'he'
export type LdctProduct = 'coffee' | 'milktea' | 'snack'

export interface LdctProgress {
  version: 1
  /** Content migration is separate from cross-chapter save version. */
  openingRevision?: 2
  run: number
  seed: 2258
  phase: 'story' | 'lab' | 'settle'
  nodeId: string
  /** Changes even when a gift/help reply returns to the same story node. */
  revision: number
  fatigue: number
  completed: string[]
  decisions: Record<string, string>
  receipts: string[]
  gifts: { person: LdctPerson; item: 'milktea' | 'snack'; nodeId: string }[]
  reply?: { nodeId: string; speaker: string; text: string }
  labRound: LdctLabRound
  labDraft: LdctLabState
  records: Partial<Record<LdctLabRound, LdctLabRecord>>
  labReturn?: string
  start: { gold: number; skill: number; heart: number; wealth: number }
}

export interface LdctChoice {
  id: string
  text: string
  next: string
  /** Hide a completed optional conversation; unrelated unfinished entries stay. */
  unless?: string
  complete?: string
  decision?: { key: string; value: string }
}

export interface LdctNode {
  id: string
  bg: string
  /** Explicitly null in unoccupied scenes; never inherit the previous NPC. */
  sprite: string | null
  speaker?: string
  text: string
  next?: string
  choices?: LdctChoice[]
  kind?: 'hub'
  giftPerson?: LdctPerson
  complete?: string
  enterLab?: LdctLabRound
  settle?: boolean
}

export type LdctAction =
  | { type: 'advance'; nodeId: string }
  | { type: 'choose'; nodeId: string; choiceId: string }
  | { type: 'lab:update'; value: LdctLabState }
  | { type: 'lab:submit'; record: LdctLabRecord }
  | { type: 'lab:open'; round: LdctLabRound }
  | { type: 'lab:close' }
  | { type: 'buy'; item: LdctProduct }
  | { type: 'gift'; person: LdctPerson; item: 'milktea' | 'snack'; nodeId: string }
  | { type: 'reply:close' }
  | { type: 'rest' }
