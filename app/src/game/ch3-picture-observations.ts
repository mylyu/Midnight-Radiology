import type { TrilogyStep } from './trilogy-types'

// Ordinary dialogue choices, using the acquired image rather than a second quiz
// UI. A correct response's node is the existing atomic, once-per-run receipt.
// Screen directions describe the displayed image, never patient laterality.
export function installCh3PictureObservations(steps: Record<string, TrilogyStep>) {
  const view = (image: string, label: string, bg = 'bg_us_room_day') => ({
    image, imageLabel: label, bg, sprite: '', sprite2: '',
  })
  const reply = (id: string, text: string, next: string, image: ReturnType<typeof view>, correct = false) => {
    steps[id] = { speaker: 'mei', text, next, ...image, ...(correct ? { effect: { skill: 1 } } : {}) }
  }

  const breast = view('us_breast', '乳腺超声 · 当前切面')
  steps.c3_s1_aunt_8.next = 'c3_breast_observe'
  steps.c3_breast_observe = {
    speaker: 'mei', ...breast,
    text: '看屏幕中央这块黑椭圆。它**正下方**，跟同样深度的两边比，亮暗有什么不同？',
    choices: [
      { text: '「更亮一些。」', next: 'c3_breast_right' },
      { text: '「更暗一些。」', next: 'c3_breast_retry' },
      { text: '「我有点看不准，您指一下。」', next: 'c3_breast_help' },
    ],
  }
  reply('c3_breast_right', '对，正下方这片**更亮**，这叫**后方回声增强**。前面衰减少些，后面留下的回声就相对强。', 'c3_s1_aunt_9', breast, true)
  reply('c3_breast_retry', '黑的是椭圆里面。再往下看，底下这一带比两边**更亮**，叫**后方回声增强**。咱们看的是它后面。', 'c3_s1_aunt_9', breast)
  reply('c3_breast_help', '从黑椭圆往屏幕下方看，再横着跟两边比：这一带**更亮**，叫**后方回声增强**。不是让你凭这一个变化猜病名。', 'c3_s1_aunt_9', breast)

  const stone = view('us_gallstone', '腹部超声 · 刚才保存的切面')
  Object.assign(steps.c3_s1_stone_4, {
    ...stone, text: '这张有一道**声影**。按屏幕方向，你觉得是哪一块？',
    choices: [
      { text: '「亮点正下方，往底部拖的黑带。」', next: 'c3_s1_shadow_good' },
      { text: '「亮点上面那片黑的区域。」', next: 'c3_s1_shadow_miss' },
      { text: '「黑的地方不止一处，您带我看一下。」', next: 'c3_s1_shadow_retry' },
    ],
  })
  reply('c3_s1_shadow_good', '对，就是接在亮点**后面的黑带**。你留着这张，我再换个角度，看它还在不在。', 'c3_s1_shadow_0', stone, true)
  reply('c3_s1_shadow_miss', '上面那片不是这里说的声影。看亮点**正下方拖出的黑带**；我换个角度，你盯住它。', 'c3_s1_shadow_0', stone)
  reply('c3_s1_shadow_retry', '先找到这个亮点，顺着往屏幕下方看。它后面这条**黑带**就是。再换个角度核对一下。', 'c3_s1_shadow_0', stone)

  const liver = view('us_c3_hepatorenal_v1', '腹部超声 · 肝肾同一切面')
  Object.assign(steps.c3_liver_observe, {
    ...liver, text: '先别调亮度。肝和右肾都在这张里，**右肾**是哪一块？按屏幕方向说就行。',
    choices: [
      { text: '「左上方那大片组织。」', next: 'c3_liver_gain' },
      { text: '「右下方的长椭圆，中间亮、外圈暗。」', next: 'c3_liver_compare' },
      { text: '「我没认准，您带我找找。」', next: 'c3_liver_help' },
    ],
  })
  reply('c3_liver_compare', '对，那是**右肾**。外圈叫**肾皮质**，中间亮的是肾窦。再拿外圈跟旁边差不多深的肝比一比。', 'c3_liver_explain_0', liver, true)
  reply('c3_liver_gain', '那大片是**肝脏**。右肾在屏幕右下方，长椭圆，外圈是**肾皮质**。拿它跟旁边差不多深的肝比。', 'c3_liver_explain_0', liver)
  reply('c3_liver_help', '看屏幕右下方这个长椭圆，就是**右肾**。外圈是**肾皮质**，中间亮的是肾窦。用外圈跟旁边的肝比较。', 'c3_liver_explain_0', liver)

  const mirror = view('us_mirror', '床旁超声 · 当前切面', 'bg_us_bedside')
  Object.assign(steps.c3_s3_mirror_2, {
    ...mirror, speaker: 'mei', text: '你也觉得怪？先指一下，**哪两处**看着特别像？', next: undefined,
    choices: [
      { text: '「弧形亮线两边，分叉的结构像重复了。」', next: 'c3_s3_mirror_check' },
      { text: '「最上面的细亮线，像多画了一条边。」', next: 'c3_s3_mirror_wait' },
      { text: '「有点眼熟，但我说不准。」', next: 'c3_mirror_help' },
    ],
  })
  reply('c3_s3_mirror_check', '对，那两处分叉看着像**重复了一份**。先留这一帧，我换个声窗，你盯住它。', 'c3_s3_mirror_end_0', mirror, true)
  reply('c3_s3_mirror_wait', '咱们往下看：**弧形亮线两边**的分叉，形状很像。我换个声窗，看看这份重复影像跟不跟着变。', 'c3_s3_mirror_end_0', mirror)
  reply('c3_mirror_help', '看**弧形亮线两边**的分叉，像不像多了一份？我换个声窗再核对，先别急着给它起病名。', 'c3_s3_mirror_end_0', mirror)
}
