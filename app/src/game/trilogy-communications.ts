import type { TrilogyChapter, TrilogyStep } from './trilogy-types'

/** Keep the remote contact stable when a call or message switches speakers. */
const CH4_CONTACT_SCENES: [string, string][] = [
  ['c4_departure_', 'shen'], ['c4_1_family_', 'cousin'], ['c4_2_xu_', 'mystery'],
  ['c4_2_close_', 'wen'], ['c4_3_bai_', 'bai'], ['c4_3_install_', 'shen'],
  ['c4_4_remote_', 'lei'], ['c4_4_wen_', 'wen'], ['c4_6_shen_', 'shen'],
  ['c4_6_close_', 'fan'], ['c4_wrap_research_', 'shen'], ['c4_wrap_', 'anxious'],
]

export function ch4ContactName(chapter: TrilogyChapter, node: string, step: TrilogyStep) {
  const contactKey = CH4_CONTACT_SCENES.find(([prefix]) => node.startsWith(prefix))?.[1]
  return Object.values(chapter.characters).find(person => step.phone && person.sprite === step.phone)?.name
    ?? (contactKey ? chapter.characters[contactKey]?.name : undefined)
    ?? (step.communication === 'sms' ? '手机短信' : '电话')
}

/** One arrival/dial cue per conversation, never one per line of dialogue. */
export const TRILOGY_COMMUNICATION_CUES: Record<string, 'call' | 'sms'> = {
  c3_intro_call_0: 'call',
  c3_s2_start_1: 'sms', c3_s4_zhou_0: 'call', c3_s4_wen_0: 'call',

  c4_departure_0: 'call', c4_1_family_1: 'call', c4_2_xu_0: 'call', c4_2_close_2: 'sms',
  c4_3_bai_0: 'sms', c4_3_delay_call_0: 'call', c4_3_delay_people_0: 'call', c4_3_install_4: 'call',
  c4_4_remote_1: 'sms', c4_4_wen_0: 'sms',
  c4_6_shen_0: 'sms', c4_6_close_2: 'call',
  c4_wrap_1: 'sms', c4_wrap_research_0: 'sms',

  c5_s3_meeting_0: 'call', c5_s3_sms_0: 'call', c5_s4_0: 'call', c5_s5_qian_0: 'call', c5_epi_after_6: 'call',
  c5_s2_postcard_2: 'sms', c5_s3_postcard_2: 'sms', c5_s5_postcard_2: 'sms', c5_seed_pot_1: 'call',
}

/** Narrated calls need no floating remote-person card merely to justify a sound. */
export const TRILOGY_NARRATED_COMMUNICATION_CUES = new Set([
  'c5_s3_meeting_0',
])
