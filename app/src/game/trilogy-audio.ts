import type { TrilogyChapter, TrilogyStep } from './trilogy-types'

/** Short entrances only. Explicit undefined can suppress a voice in a returning
 * patient branch. Clip receipts are per chapter/run, not per dialogue sentence. */
const entrances: Record<string, string> = {
  mei: 'vox_c3_mei_v2', cousin: 'vox_c3_cousin_v2', aunt: 'vox_trilogy_aunt_v2',
  xu: 'vox_trilogy_mystery_v2', mystery: 'vox_trilogy_mystery_v2', han: 'vox_trilogy_han_v2',
  luo: 'vox_trilogy_luo_v2', wrist: 'vox_c4_wrist_v2', anxious: 'vox_c4_song_v2',
}
export function trilogyVoice(_chapter: TrilogyChapter, step: TrilogyStep) {
  if (Object.hasOwn(step, 'voice')) return step.voice
  if (step.tool || step.scan || step.communication || step.closeup || step.speaker === 'sys') return undefined
  return entrances[step.speaker ?? '']
}
export function trilogyVoiceAssets(chapter: TrilogyChapter) {
  return [...new Set(Object.values(chapter.steps).map(step => trilogyVoice(chapter, step)).filter((id): id is string => !!id))]
}
