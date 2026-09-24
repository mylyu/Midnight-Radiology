import type { GameState, Step } from './types'

// A pause after the third shift has been handed over, not a new exploration
// room. Every line explicitly clears the preceding patient's saved visuals.
const view = {
  bg: 'ch2_dawn_window_v1', sprite: '', sprite2: '', image: '',
  imageLabel: '', phone: '', radio: '',
} as const

export const CH2_DAWN_STEPS: Record<string, Step> = {
  c2n3_dawn0: { ...view, speaker: 'sys',
    text: '天快亮时，白班同事到了。你们核完记录，签好交接，才拿上外套往外走。小唐到了东边窗前，忽然停下脚步。',
    effect: { flag: 'c2_dawn_seen' }, next: 'c2n3_dawn_light' },
  c2n3_dawn_light: { ...view, speaker: 'tang',
    text: '等一下。那边亮了。', next: 'c2n3_dawn_school' },
  c2n3_dawn_school: { ...view, speaker: 'me',
    text: '以前通宵赶作业，也没觉得日出这么好看。', next: 'c2n3_dawn_sleep' },
  c2n3_dawn_sleep: { ...view, speaker: 'tang',
    text: '那时候你忙着补觉吧。', next: 'c2n3_dawn_major' },
  c2n3_dawn_major: { ...view, speaker: 'me',
    text: '当年选医工，还以为能躲开夜班。', next: 'c2n3_dawn_brochure' },
  c2n3_dawn_brochure: { ...view, speaker: 'tang',
    text: '你们招生册肯定是白天拍的。', next: 'c2n3_dawn_study_q' },
  c2n3_dawn_study_q: { ...view, speaker: 'sys',
    text: '小唐说完先笑了，打到一半的哈欠都没接上。', choices: [
      { text: '「再选一次，你还学护理吗？」', next: 'c2n3_dawn_retry' },
      { text: '「学医的劝退我，学工的也劝退我。」', next: 'c2n3_dawn_both' },
    ] },
  c2n3_dawn_retry: { ...view, speaker: 'tang',
    text: '先让我睡一觉再问。我现在能把所有专业都骂一遍。', next: 'c2n3_dawn_thought' },
  c2n3_dawn_both: { ...view, speaker: 'tang',
    text: '谁劝的？把他叫来替咱俩一班。', next: 'c2n3_dawn_thought' },
  c2n3_dawn_thought: { ...view, speaker: 'me',
    text: '以前交完作业就完事。现在交出去一张图，还总想知道那个人后来怎么样了。', next: 'c2n3_dawn_reply' },
  c2n3_dawn_reply: { ...view, speaker: 'tang',
    text: '我也会想。转院以后不一定能听到消息。刚才那位大爷，后面还得等那边医生看，咱们现在也不知道。', next: 'c2n3_dawn_quiet' },
  c2n3_dawn_quiet: { ...view, speaker: 'sys',
    text: '你点了点头，没再接话。窗沿的光慢慢挪到袖口，楼下早点铺掀开锅盖。小唐把外套拢紧了一点。', next: 'c2n3_dawn_meaning' },
  c2n3_dawn_meaning: { ...view, speaker: 'me',
    text: '你说，人忙来忙去，到底图什么呢？', next: 'c2n3_dawn_meaning_reply' },
  c2n3_dawn_meaning_reply: { ...view, speaker: 'tang',
    text: '怎么专挑我脑子不转的时候问这个。', next: 'c2n3_dawn_life_q' },
  c2n3_dawn_life_q: { ...view, speaker: 'me',
    text: '也是。我也没想明白。', choices: [
      { text: '「先欠着，睡醒了再聊。」', next: 'c2n3_dawn_debt' },
      { text: '「我现在倒是知道：想吃口热的。」', next: 'c2n3_dawn_breakfast' },
    ] },
  c2n3_dawn_debt: { ...view, speaker: 'tang',
    text: '行。今天我想睡醒还有太阳，饭是热的。别的等我醒了再说。', next: 'c2n3_dawn_sun' },
  c2n3_dawn_breakfast: { ...view, speaker: 'tang',
    text: '巧了，我也是。刚才一直闻见包子味，忍着没打断你。', next: 'c2n3_dawn_sun' },
  c2n3_dawn_sun: { ...view, speaker: 'sys',
    text: '太阳从对面的屋顶后露出来。玻璃上的倒影淡了，你们谁也没急着走。街上有人推着自行车，绕过刚打开的卷帘门。', next: 'c2n3_dawn_photo' },
  c2n3_dawn_photo: { ...view, speaker: 'tang',
    text: '手机拍出来肯定没这么好看。算了，懒得掏。', next: 'c2n3_dawn_leave' },
  c2n3_dawn_leave: { ...view, speaker: 'me',
    text: '走吧，吃早饭。', next: 'c2n3_dawn_last' },
  c2n3_dawn_last: { ...view, speaker: 'tang',
    text: '走。再磨蹭，包子只剩素的了。', next: 'c2n3_dawn_done' },
  c2n3_dawn_done: { ...view, speaker: 'sys',
    text: '你们并肩往电梯口走。白班同事在身后接起电话，小唐抬手挥了挥，顺手替你按住电梯门。',
    effect: { flag: 'c2_dawn_done' }, next: 'c2n3_s1' },
}

export type Ch2DawnShot = 'arrival' | 'wide' | 'close' | 'rest'

// The view component owns movement and reduced-motion behavior. Shot identity
// stays stable across consecutive lines so each click does not restart a zoom.
export const CH2_DAWN_SHOTS: Record<string, Ch2DawnShot> = {
  c2n3_dawn0: 'arrival',
  c2n3_dawn_light: 'wide', c2n3_dawn_school: 'wide',
  c2n3_dawn_sleep: 'wide', c2n3_dawn_major: 'wide',
  c2n3_dawn_brochure: 'wide', c2n3_dawn_study_q: 'wide',
  c2n3_dawn_retry: 'wide', c2n3_dawn_both: 'wide',
  c2n3_dawn_thought: 'close', c2n3_dawn_reply: 'close',
  c2n3_dawn_quiet: 'close', c2n3_dawn_meaning: 'close',
  c2n3_dawn_meaning_reply: 'close', c2n3_dawn_life_q: 'close',
  c2n3_dawn_debt: 'close', c2n3_dawn_breakfast: 'close',
  c2n3_dawn_sun: 'rest', c2n3_dawn_photo: 'rest',
  c2n3_dawn_leave: 'rest', c2n3_dawn_last: 'rest', c2n3_dawn_done: 'rest',
}

/** Preserve the departing patient's text, event and effects; only add a new
 * continuation. Already-settled or completed saves are never routed backwards.
 */
export function ch2DawnStep(id: string, step: Step, { flags }: Pick<GameState, 'flags'>): Step {
  if (id === 'c2n3_x9' && !flags.c2_dawn_done) return { ...step, next: 'c2n3_dawn0' }
  return step
}
