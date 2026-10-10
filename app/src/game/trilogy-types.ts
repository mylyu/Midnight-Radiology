import type { GameState, Step, Ch2QuizProgress } from './types'

export type TrilogyId = 'ch3' | 'ch4' | 'ch5'
export interface TrilogyScanConfig {
  kind: 'ultrasound' | 'mri' | 'pet'
  label: string
  image?: string
  durationMs?: number
  sound?: string
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
  /** A small, concrete task. Runtime provides one principal interaction. */
  task: 'probe' | 'gain' | 'depth' | 'echo' | 'tgc' | 'm_mode' | 'doppler' | 'resolution'
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
  caseId?: string
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
  book: { title: string; body: string }[]
  quiz: { q: string; options: string[]; answer: number; explain: string }[]
  assets: string[]
  shopItems?: TrilogyShopItem[]
  /** Exact previous-history checks; missing flags never invent memories. */
  adapt?: (id: string, step: TrilogyStep, state: GameState) => TrilogyStep
}
export interface TrilogyProgress {
  version: 1
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
  scans?: Record<string, { startedAt: number; completed?: boolean }>
}
