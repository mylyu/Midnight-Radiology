import type { LdctLabRecord, LdctLabState, LdctLabRound } from './ldct-experiments'
import type { LdctResearchDraft, LdctResearchStage } from './ldct-research'

export type LdctPerson = 'luzhou' | 'lei' | 'he'
export type LdctProduct = 'coffee' | 'milktea' | 'snack'

export interface LdctProgress {
  version: 1
  /** Content migration is separate from cross-chapter save version. */
  openingRevision?: 2 | 3 | 4 | 5
  storyId?: 'face' | 'dinner' | 'patient' | 'father'
  run: number
  seed: 2258
  phase: 'story' | 'lab' | 'research' | 'settle'
  nodeId: string
  /** Changes even when a gift/help reply returns to the same story node. */
  revision: number
  fatigue: number
  completed: string[]
  decisions: Record<string, string>
  receipts: string[]
  /** Timestamp committed before the shared 3s acquisition starts; no audio gate. */
  scanSessions?: Record<string, { startedAt: number; completed: boolean }>
  /** Dataset replacement does not map an old marker onto different anatomy. */
  chestSourceVersion?: string
  previousChest?: {
    draft?: LdctLabState
    exposureDraft?: LdctLabState
    record?: LdctLabRecord
    /** Preserve earlier archives when a later dataset migration saves a draft. */
    history?: { sourceVersion?: string; draft?: LdctLabState; exposureDraft?: LdctLabState; record?: LdctLabRecord }[]
  }
  gifts: { person: LdctPerson; item: 'milktea' | 'snack'; nodeId: string; part?: number }[]
  reply?: { nodeId: string; speaker: string; text: string }
  labRound: LdctLabRound
  labDraft: LdctLabState
  records: Partial<Record<LdctLabRound, LdctLabRecord>>
  labReturn?: string
  research?: LdctResearchDraft
  researchRecords?: Partial<Record<LdctResearchStage, LdctResearchDraft>>
  researchReturn?: string
  /** No automatic progress beyond old sample endings. Explicit next-part only. */
  partStart?: { gold: number; skill: number; heart: number; wealth: number }
  finished?: boolean
  start: { gold: number; skill: number; heart: number; wealth: number }
}

export interface LdctChoice {
  id: string
  text: string
  next: string
  /** Hide a completed optional conversation; unrelated unfinished entries stay. */
  unless?: string
  requires?: string
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
  labDataset?: 'phantom' | 'chest'
  chestPreview?: 'fbp' | 'iteration:4'
  settle?: boolean
  part?: 1 | 2 | 3 | 4
  enterResearch?: LdctResearchStage
  finale?: boolean
  storyEnd?: boolean
  goal?: string
}

/** Version 2 selects only father; previous candidates remain read-only archives. */
export interface LdctStoryShelf {
  version: 1 | 2
  active?: 'face' | 'dinner' | 'patient' | 'father'
  slots: Partial<Record<'face' | 'dinner' | 'patient' | 'father', LdctProgress>>
  legacy?: LdctProgress
  /** Prior father narrative order stays read-only when the player starts v5. */
  previousFather?: LdctProgress
  /** Learning awards are shared across drafts and replays; purchases are not. */
  receipts: string[]
  experienced: LdctLabRound[]
}

export type LdctAction =
  | { type: 'scan:start' | 'scan:complete'; nodeId: string; now: number }
  | { type: 'advance'; nodeId: string }
  | { type: 'choose'; nodeId: string; choiceId: string }
  | { type: 'lab:update'; value: LdctLabState }
  | { type: 'lab:submit'; record: LdctLabRecord }
  | { type: 'lab:open'; round: LdctLabRound }
  | { type: 'lab:close' }
  | { type: 'buy'; item: LdctProduct }
  | { type: 'gift'; person: LdctPerson; item: 'milktea' | 'snack'; nodeId: string }
  | { type: 'reply:close' }
  | { type: 'media:heard'; nodeId: string; cueId: string }
  | { type: 'rest' }
  | { type: 'part:next' }
  | { type: 'research:update'; value: LdctResearchDraft }
  | { type: 'research:submit'; stage: LdctResearchStage }
  | { type: 'research:close' }
  | { type: 'research:open'; stage: LdctResearchStage }
