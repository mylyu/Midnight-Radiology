import type { GameState, Step, Ch2QuizProgress } from './types'

export type TrilogyId = 'ch3' | 'ch4' | 'ch5'
export type MriScanRegion = 'head' | 'wrist' | 'knee' | 'shoulder' | 'cervical' | 'lumbar' | 'abdomen'
export type MriScannerModel = 'city-3t' | 'city-055-wide' | 'county-055-wide'
export interface TrilogyScanConfig {
  kind: 'ultrasound' | 'mri' | 'pet'
  label: string
  /** Workstation result image; never reused as the patient's positioning illustration. */
  image?: string
  /** Selects the matching MRI positioning/coil illustration for this acquisition. */
  mriRegion?: MriScanRegion
  /** City 3T, the city's other 0.55T room, and the later county 0.55T installation stay distinct. */
  mriModel?: MriScannerModel
  /** A patient-specific positioning picture, e.g. a child rather than the adult default. */
  positioningImage?: string
  durationMs?: number
  sound?: string
  /** A visible patient call can end the interaction without completing the clinical acquisition. */
  distress?: {
    atMs: number
    stopAfterMs: number
    text: string
    voice?: string
  }
}
export interface TrilogyShopItem {
  id: string
  name: string
  price: number
  desc: string
  image?: string
  /** Actual one-time use receipt, not a promise to give the item a use later. */
  use?: string
  lastShift?: number
}
export interface TrilogyTool {
  kind: 'ultrasound' | 'mri' | 'pet'
  title: string
  prompt: string
  image?: string
  reference?: string
  images?: Record<string, string>
  /** Physical tools shown inside the existing choice buttons. */
  objectImages?: Record<string, string>
  /** A small, concrete task. Runtime provides one principal interaction. */
  task: 'probe' | 'gain' | 'depth' | 'echo' | 'tgc' | 'm_mode' | 'doppler' | 'resolution' | 'spatial_resolution'
    | 'sequence' | 'artifact' | 'mri-relax' | 'mri-encoding' | 'mri-sampling'
    | 'fusion' | 'decay' | 'collimator' | 'spect' | 'coincidence' | 'counting'
  variant?: string
  help: string
  next: string
}
export interface TrilogyStep extends Step {
  voice?: string
  scan?: TrilogyScanConfig
  tool?: TrilogyTool
  /** Gifts offered only while this colleague is physically present. */
  giftTo?: string
  communication?: 'call' | 'sms'
  closeup?: boolean
  /** Compact object illustration alongside the current characters. */
  imageKind?: 'object'
  /** Optional velocity-over-time illustration below the CH3 cardiac image. */
  echoSpectrum?: boolean
  cameraMotion?: 'push' | 'settle' | 'pan'
  caseId?: string
  /** Story decisions only: stable per-save choice order, shuffled by seed/run/node. */
  shuffleChoices?: boolean
}
export interface TrilogyShift {
  id: string
  title: string
  subtitle: string
  date: string
  start: string
  background: string
  /** Optional delayed check-in: a pre-shift prologue is not paid work. */
  checkinAt?: string
}
export interface TrilogyCard { title: string; body: string; image?: string }
export interface TrilogyChapter {
  id: TrilogyId
  title: string
  subtitle: string
  icon: string
  year: number
  equipment: string
  background: string
  shifts: TrilogyShift[]
  steps: Record<string, TrilogyStep>
  afterQuiz: string
  characters: Record<string, { name: string; color: string; sprite?: string }>
  badges: Record<string, { name: string; icon: string; desc: string }>
  cards: Record<string, TrilogyCard>
  /** Retired rewards stay visible only to players who already earned them. */
  legacyBadges?: TrilogyChapter['badges']
  legacyCards?: Record<string, TrilogyCard>
  book: { title: string; body: string }[]
  quiz: { q: string; options: string[]; answer: number; explain: string }[]
  assets: string[]
  shopItems?: TrilogyShopItem[]
  /** Optional inventory thumbnails keyed by the existing item IDs. */
  itemImages?: Record<string, string>
  /** Exact previous-history checks; missing flags never invent memories. */
  adapt?: (id: string, step: TrilogyStep, state: GameState) => TrilogyStep
}
export interface TrilogyProgress {
  version: 1
  /** CH4 story generation; every older revision restarts at the current prologue. */
  storyRevision?: number
  /** CH4 exploration rewards are chosen at entry; revision 1 migrates old in-flight saves once. */
  choiceRewardRevision?: number
  runId: string
  shift: number
  stepId: string
  phase: 'story' | 'settle' | 'quiz' | 'epilogue' | 'done'
  applied: string[]
  visited: string[]
  tools: Record<string, { value: number; secondary: number; choice: string; completed?: boolean }>
  snapshots: Record<string, { gold: number; skill: number; heart: number; wealth: number }>
  gifts: string[]
  giftReply?: { node: string; person: string; text: string }
  shop: { shift: number; lotteryCount: number; buyCount: number }
  pendingCoffee?: boolean
  quiz?: Ch2QuizProgress
  /** Freeze wording/answers for an in-progress assessment across content updates. */
  quizContent?: TrilogyChapter['quiz']
  certificate?: { name: string; studentId: string; grade: string; code: string; gold: number; badgeCount: number }
  done?: boolean
  viewBg?: string
  heardCues?: string[]
  scans?: Record<string, {
    startedAt: number
    /** The scan modal has ended; this alone never proves clinical completion. */
    ended?: boolean
    /** The full intended acquisition completed. Interrupted studies remain false. */
    completed?: boolean
    interrupted?: boolean
  }>
}
