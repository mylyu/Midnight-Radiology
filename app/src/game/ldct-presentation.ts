/** Explicit scene cues: mentioning a phone or a person does not play a sound. */
export type LdctSceneCue = { id: string; asset: string; volume: number; caption: string }
export type LdctSceneProp = { kind: 'receipt' | 'meal' | 'notes' | 'films'; caption: string; image?: string }
export const LDCT_PRESENTATION_IMAGES = ['ldct_item_meal_v1', 'item_notebook', 'item_film'] as const
export const LDCT_PRESENTATION_AUDIO = {
  luzhou_m: 'audio/vox_ldct_luzhou_m_v1.mp3',
  luzhou_f: 'audio/vox_ldct_luzhou_f_v1.mp3',
  zhou: 'audio/vox_ldct_zhou_v1.mp3',
  he: 'audio/vox_ldct_he_v1.mp3',
  call: 'audio/ch2_mobile_call_v1.mp3',
} as const
const entrance: Record<string, { person: 'luzhou' | 'zhou' | 'he'; caption: string }> = {
  lf_welcome: { person: 'luzhou', caption: '你先坐。' },
  lf_scan_2: { person: 'zhou', caption: '都坐，别着急。' },
  lf_chat_he_0: { person: 'he', caption: '这谁的饭呀？' },
}
export function ldctSceneCue(nodeId: string, gender: 'm' | 'f'): LdctSceneCue | undefined {
  const voice = entrance[nodeId]
  if (voice) {
    const person: keyof typeof LDCT_PRESENTATION_AUDIO = voice.person === 'luzhou' ? `luzhou_${gender}` : voice.person
    return { id: `voice:${nodeId}:v1`, asset: LDCT_PRESENTATION_AUDIO[person], volume: .45, caption: voice.caption }
  }
  if (nodeId === 'lf_evening2') return { id: 'call:father-evening2:v1', asset: LDCT_PRESENTATION_AUDIO.call, volume: .38, caption: '手机来电 · 爸' }
}
export const LDCT_SCENE_CALLS: Record<string, { contact: string; status: string }> = {
  lf_license_1: { contact: '设备工程师', status: '正在拨出' },
  lf_license_2: { contact: '设备工程师', status: '通话中' },
  lf_evening2: { contact: '爸 · 陆舟的手机', status: '来电中' },
  lf_dinner_0: { contact: '爸 · 陆舟的手机', status: '通话中' },
  lf_dinner_1: { contact: '爸 · 陆舟的手机', status: '通话中' },
}
const meal: LdctSceneProp = { kind: 'meal', image: 'ldct_item_meal_v1', caption: '这次，趁热吃' }
const receipt: LdctSceneProp = { kind: 'receipt', caption: '被折了又展的缴费单' }
export const LDCT_SCENE_PROPS: Record<string, LdctSceneProp> = {
  lf_scan_1: receipt,
  lf_license_0: receipt,
  lf_after_filter_2: { ...meal, caption: '已经凉了的晚饭' },
  lf_rest_hub: meal,
  lf_chat_he_0: meal,
  lf_chat_he_1: meal,
  lf_record_echo: { kind: 'notes', image: 'item_notebook', caption: '版本和存疑处，都留下' },
  lf_depart_0: { kind: 'films', image: 'item_film', caption: '带去复核的完整资料' },
  lf_weeks_1: { kind: 'receipt', caption: '下次复查的日期' },
}
