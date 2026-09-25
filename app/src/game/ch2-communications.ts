/** Authored events, not keyword matching: memories/mentions never ring. */
export type Ch2Communication = {
  kind: 'call' | 'message'
  device: '手机' | '院内座机' | '小何的手机'
  contact: string
  status: string
  cue?: 'call' | 'message' | 'landline'
}

export const CH2_COMMUNICATION_AUDIO = {
  call: 'audio/ch2_mobile_call_v1.mp3',
  message: 'audio/ch2_mobile_message_v1.mp3',
  landline: 'audio/ring.mp3',
} as const

const support: Ch2Communication = { kind: 'call', device: '院内座机', contact: '自称厂家售后', status: '通话中' }
const friend: Ch2Communication = { kind: 'call', device: '手机', contact: '陆舟 · 老同学', status: '通话中' }
const lei: Ch2Communication = { kind: 'message', device: '手机', contact: '小雷', status: '聊天消息' }
const stranger: Ch2Communication = { kind: 'message', device: '手机', contact: '陌生号码', status: '短信' }
const emergency: Ch2Communication = { kind: 'call', device: '院内座机', contact: '急诊', status: '通话中' }

export const CH2_COMMUNICATIONS: Record<string, Ch2Communication> = {
  c2n1_ab4: { kind: 'message', device: '手机', contact: '老白', status: '翻看旧聊天记录' },
  c2n3_k3: { kind: 'call', device: '小何的手机', contact: '来电', status: '来电中', cue: 'call' },
  c2n3_terminal_wait: { ...support, contact: '外线来电', status: '来电中', cue: 'landline' },
  c2n3_terminal_call: support,
  c2n3_terminal_ask: support,
  c2n3_terminal_quiet: support,
  c2n3_terminal_probe: support,
  c2n3_terminal_connection_q: support,
  c2d4_0: { ...emergency, status: '来电中', cue: 'landline' },
  c2d4_e8: { kind: 'call', device: '院内座机', contact: '厂家', status: '正在拨出' },
  c2n5_n4: { ...emergency, status: '来电中', cue: 'landline' },
  c2n5_n5: emergency,
  c2n5_phone_break: { kind: 'message', device: '手机', contact: '小何', status: '新消息', cue: 'message' },
  c2n5_n6: { ...stranger, status: '新短信', cue: 'message' },
  c2n5_sms_save: { ...lei, status: '已发送 · 对方正在输入' },
  c2n5_sms_lei_pending: { ...lei, status: '新消息', cue: 'message' },
  c2n5_sms_reply: { ...stranger, status: '已发送 · 暂无回复' },
  c2n5_sms_after: { ...stranger, status: '没有新消息' },
  c2n5_p2a: { ...lei, status: '新消息', cue: 'message' },
  c2n5_n7: lei,
  c2n5_n8: { ...lei, status: '正在回复' },
  c2n5_n8a: lei,
  c2n5_n8b: lei,
  c2n5_n8c: lei,
  c2am_terminal_sms: { ...stranger, status: '新短信', cue: 'message' },
  c2am_lowdose_teaser0: { ...friend, status: '来电中', cue: 'call' },
  c2am_lowdose_teaser1: friend,
  c2am_lowdose_meet: friend,
  c2am_lowdose_dinner: friend,
}

export const ch2CommunicationHeardKey = (id: string) => `c2_communication_heard_${id}`
