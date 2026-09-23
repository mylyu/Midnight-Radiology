import { recordCh2Change } from './ch2-ledger'
import { applyEffect } from './store'
import type { Choice, GameState, Step } from './types'

type Person = 'tang' | 'zhou' | 'lei' | 'fan' | 'he'
type Gift = 'milktea' | 'snack'
const names: Record<Person, string> = { tang: '小唐', zhou: '老周', lei: '小雷', fan: '老范', he: '小何' }

// Only quiet, in-person pauses. Never inject gifts into a patient decision or remote phone call.
export const CH2_GIFT_HOSTS: Record<string, Person[]> = {
  c2n1_chat_q: ['tang'], c2n1_gap_chair_q: ['zhou'],
  c2d2_gap_shift_q: ['tang'], c2d2_gap_food_q: ['tang'], c2d2_lunch_q: ['lei', 'fan'],
  c2n3_chat_q: ['lei'], c2n3_k2: ['he'], c2n3_gap_tea_q: ['zhou'], c2n3_gap_cups_q: ['tang'],
  c2d4_gap_thermos_q: ['zhou'], c2d4_chat_q: ['lei'], c2n5_chat_q: ['tang', 'lei'],
}

const replies: Record<Person, Record<Gift, string>> = {
  tang: { milktea: '给我的？吸管呢……哦，在袋底。你那杯别放鼠标边上，上回差点洒一桌。', snack: '来得正好，饭团都凉透了。给我留一盒，等会儿慢慢吃。' },
  zhou: { milktea: '我还以为你递的是片袋。这么大一杯……茶先放放，今天换个口味。', snack: '有丸子没有？给我留两个。别都塞我手里，你也吃。' },
  lei: { milktea: '等一下，我先把这个窗口关了。……好，终于有个不用点“确认”的东西。', snack: '我刚想下楼买点吃的。这下省一趟，给你把椅子腾出来。' },
  fan: { milktea: '给我的？行，我尝尝。别跟老周说，他又得问我怎么不喝茶。', snack: '这个好，没青椒。我拿一盒，剩下的你留着，别光看我吃。' },
  he: { milktea: '正好有点烫，喝口这个。你那杯呢？别都给我了。', snack: '先搁这儿，我这盒还没吃完呢。等会儿咱们一块儿分。' },
}

function token(node: string, person: Person, item: Gift) { return `@ch2gift:${node}:${person}:${item}` }
function parse(id: string): { node: string; person: Person; item: Gift } | undefined {
  const match = /^@ch2gift:([^:]+):(tang|zhou|lei|fan|he):(milktea|snack)$/.exec(id)
  if (!match) return undefined
  const [, node, person, item] = match
  return { node, person: person as Person, item: item as Gift }
}

export function ch2GiftChoices(s: GameState, node: string): Choice[] {
  if ((s.dlc?.ch2?.phase ?? 'story') !== 'story' || s.dlc?.ch2?.done) return []
  const hosts = CH2_GIFT_HOSTS[node] ?? [], shift = s.dlc?.ch2?.shift ?? node.split('_')[0]
  return hosts.flatMap(person => {
    if (s.dlc?.ch2?.loop?.gifts.some(g => g.shift === shift && g.person === person)) return []
    return (['milktea', 'snack'] as const).filter(item => s.items.includes(item) && !(node === 'c2n3_k2' && item === 'snack'))
      .map(item => ({ text: `把${item === 'milktea' ? '奶茶' : '零食'}递给${names[person]}`, next: token(node, person, item) }))
  })
}

/** Reply is reconstructible from its token after reload; never place consumption on the reply step. */
export function ch2GiftReply(s: GameState, id: string): Step | undefined {
  const gift = parse(id)
  if (!gift || !CH2_GIFT_HOSTS[gift.node]?.includes(gift.person)) return undefined
  const previous = s.dlc?.ch2?.loop?.gifts.filter(row => row.person === gift.person && row.shift !== (s.dlc?.ch2?.shift ?? '')).length
  return { speaker: gift.person, sprite: `char_${gift.person}`, text: `${previous ? '上回那份还没谢你呢。' : ''}${replies[gift.person][gift.item]}`, next: gift.node }
}

export function giveCh2Gift(s: GameState, node: string, id: string): { state: GameState; reply?: Step } {
  const gift = parse(id)
  if (!gift || gift.node !== node || !ch2GiftChoices(s, node).some(choice => choice.next === id)) return { state: s }
  const shift = s.dlc?.ch2?.shift ?? node.split('_')[0]
  let next = recordCh2Change(s, applyEffect(s, { loseItem: gift.item, ...(gift.item === 'snack' ? { heart: 1 } : {}) }),
    `gift:${shift}:${gift.person}`, `递给${names[gift.person]}${gift.item === 'milktea' ? '奶茶' : '零食'}`, 'gift')
  const loop = next.dlc!.ch2.loop!
  next = { ...next, dlc: { ...next.dlc, ch2: { ...next.dlc!.ch2, loop: { ...loop,
    gifts: [...loop.gifts, { ...gift, shift }] } } } }
  const reply = ch2GiftReply(next, id)!
  next = { ...next, dlc: { ...next.dlc, ch2: { ...next.dlc!.ch2,
    giftReply: { stepId: node, text: reply.text!, speaker: reply.speaker, sprite: reply.sprite } } } }
  return { state: next, reply }
}

/** Last opportunity is the fifth-night tea-room conversation, before clinical work starts. */
export function ch2GiftSalesEnded(s: GameState): boolean {
  const p = s.dlc?.ch2
  if (!p) return false
  if (p.done || p.shift === 'c2am') return true
  if (p.shift !== 'c2n5') return false
  if (p.phase === 'settle' || p.phase === 'quiz' || p.phase === 'done' || s.flags.c2n5_chat_done) return true
  if ((p.appliedSteps ?? []).includes('ch2-c2n5_m0') || /^c2n5_(m\d|n\d|child_scan|p2|phone_break|sms_|g\d)/.test(p.stepId ?? '')) return true
  return (['tang', 'lei'] as const).every(person => p.loop?.gifts.some(g => g.shift === 'c2n5' && g.person === person))
}
