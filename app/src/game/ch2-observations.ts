import type { GameState } from './types'

/** A short in-scene response, not a second quiz. Correctness is never styled
 * before choosing. Every response continues; hint responses never lose stats. */
export interface Ch2ObservationChoice {
  id: string
  text: string
  feedback: string
  correct?: boolean
  hint?: boolean
}

export interface Ch2ObservationRegion {
  /** Fractions of the un-cropped image, NOT patient-side coordinates. */
  x: number
  y: number
  width: number
  height: number
  label: string
}

export interface Ch2Observation {
  id: string
  caseId: string
  kind: 'image' | 'plan'
  image?: string
  imageLabel?: string
  /** SHA-256 of the reviewed image. Changing artwork requires another review. */
  assetVersion: string
  prompt: string
  speaker: string
  choices: Ch2ObservationChoice[]
  regions?: Ch2ObservationRegion[]
  /** Equipment-plan choice is preparatory; only the image judgment earns skill. */
  rewardEligible: boolean
}

const ask = (feedback: string): Ch2ObservationChoice => ({ id: 'ask', text: '「还拿不准，带我看一下。」', feedback, hint: true })

/** The image itself is unannotated until a response has been saved. Broad
 * regions locate the discussion, rather than making a pixel-perfect diagnosis.
 * Coronary choice is before the reconstruction hook at coronary_volume. */
export const CH2_OBSERVATIONS: Record<string, Ch2Observation> = {
  c2n1_w1ok: {
    id: 'fall-observe-v1', caseId: 'fall', kind: 'image', image: 'ct_head_hema',
    assetVersion: '29d27622513ced4dd7adf3d6d398801c1470872b166845bbb5fb07a003837ef3',
    prompt: '窗口调好了。先不猜病名：按屏幕方向，哪一片更值得留意？', speaker: 'zhou', rewardEligible: true,
    choices: [
      { id: 'left', text: '屏幕左边，贴着骨头的地方', feedback: '先看另一边，贴着颅骨里面有一条更宽的白影。咱们再换个窗口对照。' },
      { id: 'right-band', text: '屏幕右边，沿着边缘延伸的一整片', feedback: '嗯，就是这一片，跨了上面和下面。先记住位置，再换个窗口看看它的形状。', correct: true },
      { id: 'center', text: '中间那两个黑色空隙', feedback: '中间也要看，不过先留意屏幕右边，贴着颅骨里面的这片白影。' },
      { id: 'none', text: '这张暂时没看出明显异常', feedback: '把目光移到屏幕右边，沿着颅骨内侧慢慢看。那一片和另一边不一样。' },
      ask('看屏幕右侧这一整片。别拿象限切它，它从上面一直延伸到下面。'),
    ],
    regions: [{ x: .66, y: .12, width: .16, height: .69, label: '沿颅骨内侧的高密度带' }],
  },
  c2n1_p3: {
    id: 'stone-observe-v2', caseId: 'stone', kind: 'image', image: 'ct_ch2_stone_v2',
    assetVersion: '47fdbf4d0fe20f0d4ed6ac2b3ca2808403bcbf238558d95ad68e6a30f44afdc0',
    prompt: '数据重建好了。这一层里，哪儿有个特别亮的小点？按屏幕方向找，不算外圈和中间的骨头。', speaker: 'zhou', rewardEligible: true,
    choices: [
      { id: 'upper-left', text: '屏幕左上', feedback: '左上是大片软组织。再看右下的肾脏里面，有个格外亮的小点。' },
      { id: 'lower-left', text: '屏幕左下', feedback: '两侧肾脏对着看，特别亮的小点在屏幕右下。' },
      { id: 'upper-right', text: '屏幕右上', feedback: '再往下一点。咱们找的是肾脏里面那个小白点。' },
      { id: 'lower-right', text: '屏幕右下', feedback: '看见了吧，就这个小白点。先别拿屏幕量大小，我把相邻几层也翻出来。', correct: true },
      { id: 'none', text: '本张暂未见明显异常', feedback: '骨头之外还有个很亮的小点，在屏幕右下的肾脏里面。把这一层留住。' },
      ask('先找到中间的脊柱，再看它右边那只肾，亮点就在里面。'),
    ],
    regions: [{ x: .62, y: .535, width: .065, height: .065, label: '这枚高密度小点' }],
  },
  c2d2_w1ok: {
    id: 'lung-observe-v1', caseId: 'lung', kind: 'image', image: 'ct_lung',
    imageLabel: '本次数据 · 1 mm 薄层重建',
    assetVersion: 'c498df11cc94766ffe110d13cd20fce379eb73cf23eeb926d5e611bd3d559135',
    prompt: '薄层和肺窗都调好了。按屏幕方向，你会先把哪儿留给周师傅看？', speaker: 'zhou', rewardEligible: true,
    choices: [
      { id: 'upper-left', text: '屏幕左上', feedback: '另一边也对照一下。屏幕右上有个圆圆的小白点，再跟相邻层比。' },
      { id: 'lower-left', text: '屏幕左下', feedback: '先看屏幕右上那枚小白点，再把上下相邻的层面一起打开。' },
      { id: 'upper-right', text: '屏幕右上', feedback: '嗯，留住这儿。别只看这一张，和旧片、前后几层放一块儿比。', correct: true },
      { id: 'lower-right', text: '屏幕右下', feedback: '同一侧再往上看一点，那枚小结节在屏幕右上。' },
      { id: 'none', text: '本张暂未见明显异常', feedback: '屏幕右上这一点别漏了。先标住，周围几层还得接着看。' },
      ask('看屏幕右上，别急着追那些长条血管，先找圆圆的小白点。'),
    ],
    regions: [{ x: .735, y: .325, width: .075, height: .075, label: '与邻层、旧片对照的小结节' }],
  },
  c2d2_t1: {
    id: 'trauma-sequence-v1', caseId: 'trauma', kind: 'image', image: 'ch2_ct_lumbar_pelvis_v1',
    assetVersion: 'feb30785667c1c6f5743c2256f0405c61e25c93bca9456595e09f3619ae95ae0',
    imageLabel: '腰椎矢状位｜骨盆冠状位 · 同次数据重组',
    prompt: '腰椎和骨盆的图出来了，急诊还等着。眼前这两张够不够，接下来怎么交过去？', speaker: 'duty', rewardEligible: true,
    choices: [
      { id: 'single', text: '就传这两张，骨头应该看得差不多了', feedback: '两张只是几个切面，前后还有呢。把完整序列调出来，我得连着看。' },
      { id: 'complete', text: '调齐骨窗和不同方向的重组，交完整序列', feedback: '嗯，换个方向看，用的还是这次采到的数据。原始薄层也留着，我接着看。', correct: true },
      ask('先在工作站上换骨窗、换观察方向，不是让病人换个姿势再照一次。整套图留住，我来核对。'),
    ],
  },
  c2n3_m6: {
    id: 'stroke-readability-v1', caseId: 'stroke', kind: 'image', image: 'ct_motion',
    assetVersion: '48a9c98a5b04c44c3763287bd307886f58e4117c5fe953aa4bf37f6a1a59043d',
    prompt: '第一组图出来了。先不找病灶，你看这幅图本身怎么样？', speaker: 'zhou', rewardEligible: true,
    choices: [
      { id: 'clear', text: '轮廓挺清楚，可以直接下结论', feedback: '看外圈，边缘都重了。先解决这组图能不能判读的问题。' },
      { id: 'motion', text: '边缘有重影，脑组织也被拖花了', feedback: '嗯，轮廓重了，里面也拖花了。先别拿这幅图猜病灶。', correct: true },
      ask('沿着颅骨外圈看，边缘像错开了两层。咱们先把图像质量弄清楚。'),
    ],
    regions: [{ x: .68, y: .13, width: .23, height: .60, label: '边缘重影，影响判读' }],
  },
  c2n3_coronary_where: {
    id: 'coronary-reconstruction-v1', caseId: 'chest', kind: 'image', image: 'ch2_ct_coronary_slices',
    assetVersion: '7ad04ea308f03e95a7bfef1ac40b80518e0e5428902363943f851ff9f4be0e5c',
    prompt: '一层一个小亮点，跟两下就丢了。它到底往哪儿拐的？你想在工作站上先试哪种看法？', speaker: 'zhou', rewardEligible: true,
    choices: [
      { id: 'rescan', text: '再扫一次，直接扫成立体的', feedback: '不用再照。刚才已经采到容积数据了，在工作站上换一种重建就行。' },
      { id: 'volume', text: '用同次数据做三维重建，先看血管走向', feedback: '行，先用三维看看走向。找到位置，还得回薄层和重组图核对。', correct: true },
      ask('这套数据能换个看法。先调三维找走向，再回薄层看细节，不用再扫描。'),
    ],
  },
  c2n3_x8: {
    id: 'mystery-observe-v1', caseId: 'mystery', kind: 'image', image: 'ct_head_clean',
    assetVersion: 'ddbe83734042b4fd688423778447b53a4ead8b3a31088e13a73bf3c74a680906',
    prompt: '新的断层图亮起来，老人还在外头等。先说这张图上你实际看到的。', speaker: 'zhou', rewardEligible: true,
    choices: [
      { id: 'none', text: '本张暂未见明显异常，完整序列还得看', feedback: '嗯，先这样记。我把完整序列看完，再跟他解释。', correct: true },
      { id: 'all-clear', text: '看着没问题，可以说头痛肯定没事', feedback: '别把话说满。图上没看见，和头痛不用再查，是两回事。' },
      ask('好，咱俩把完整序列一起过一遍。先别急着给外头那位打包票。'),
    ],
  },
  c2d4_7: {
    id: 'aorta-plan-v1', caseId: 'aorta', kind: 'plan', assetVersion: 'aorta-plan-1',
    prompt: '要看主动脉，老周让你先调设备方案。你准备选哪一套，再交给他确认？', speaker: 'zhou', rewardEligible: false,
    choices: [
      { id: 'liver', text: '沿用上午排好的肝脏增强协议', feedback: '这回不按肝脏那套等。目标换成主动脉，强化时机和覆盖范围都得跟着换。' },
      { id: 'aorta', text: '调主动脉CTA协议，再核对强化时机与范围', feedback: '行，目标先对上。范围和时机咱俩再过一遍，别漏。', correct: true },
      ask('我跟你一起调。要让主动脉亮起来的时候，采到我们要看的范围。'),
    ],
  },
  c2d4_t1: {
    id: 'aorta-observe-v1', caseId: 'aorta', kind: 'image', image: 'ch2_ct_aortic_wide',
    assetVersion: '6fdc416b3411d518f8018b99b352fd786ed3f822a291dab3b23e49c993e097d3',
    prompt: '胸部切面出来了。按屏幕方向，哪儿的血管截面看着不太一样？', speaker: 'director', rewardEligible: true,
    choices: [
      { id: 'upper-left', text: '屏幕左上，肺里面', feedback: '先看脊柱旁边，屏幕偏右下的血管截面。里头有条细细的分隔。' },
      { id: 'upper-right', text: '屏幕右上，胸壁附近', feedback: '目光往中间靠。脊柱旁边这根血管里，能看到一条分隔。' },
      { id: 'lower-right', text: '屏幕偏右下，脊柱旁边的血管截面', feedback: '就留这一层。我再沿着上下几层看，看看这条分隔延伸到哪儿。', correct: true },
      { id: 'none', text: '本张暂未见明显异常', feedback: '看看脊柱旁边这个血管截面，里头不该只有这样一眼就带过去。' },
      ask('看屏幕偏右下、脊柱旁边，血管里有条细线。先标这一层，我接着翻。'),
    ],
    regions: [{ x: .53, y: .54, width: .10, height: .13, label: '血管内的异常分隔' }],
  },
  c2d4_12a: {
    id: 'metal-source-v1', caseId: 'denture', kind: 'image', image: 'ct_dental_metal_teaching',
    assetVersion: '78d1ccb2dde6632751d3bf29d114dc68cbe3101014da659b7155865dd8402bf9',
    prompt: '往下翻到这一层，黑白条纹特别扎眼。你想先追查哪儿？', speaker: 'zhou', rewardEligible: true,
    choices: [
      { id: 'machine', text: '机器坏了，先给厂家打电话', feedback: '先别急着给机器判刑。找找条纹往哪儿聚，嘴里那几块特别亮。' },
      { id: 'metal', text: '条纹像从牙齿附近散开，先问问金属', feedback: '有这个可能。先核对口腔里的东西，固定牙别乱动，活动的得问清楚。', correct: true },
      { id: 'window', text: '只是窗口不好看，拉一拉就能全消掉', feedback: '调窗不能把缺掉的数据找回来。先看这些条纹从哪儿拖出来。' },
      ask('看嘴里最亮的几处，再顺着旁边的条纹找过去。咱们先问清有没有金属。'),
    ],
    regions: [{ x: .31, y: .09, width: .36, height: .28, label: '牙列附近的高密度物与条纹' }],
  },
  c2n5_m17: {
    id: 'child-followup-v1', caseId: 'kid', kind: 'image', image: 'ct_head_child_followup', imageLabel: '本院复查｜本次',
    assetVersion: 'fae8c956e74115b26480ac8a3914739c394ddf74ab424d9236c79174b82b3a92',
    prompt: '这是本次复查，不是三天前的外院旧片。先看这一张，怎么把观察交给值班医师？', speaker: 'duty', rewardEligible: true,
    choices: [
      { id: 'none', text: '本张暂未见明显新出血，请对照旧片和完整序列', feedback: '好，我把两次完整序列对照一下。先别拿这张图替孩子的呕吐下结论。', correct: true },
      { id: 'same', text: '新旧看着差不多，说明孩子肯定没事', feedback: '这一张不能把话说满。我看完两次序列，急诊还得接着查新出现的症状。' },
      ask('一起看。先认清哪份是本次，再跟旧片和相邻层面对照。'),
    ],
  },
}

/** Wrist deliberately reuses its existing bone-window task: no extra quiz. */
export const CH2_OBSERVATION_WINDOW_CASES = { wrist: 'c2d2_w2' } as const

/** State is part of the adapter contract; completion/feedback persistence lives
 * in dlc.ch2 and is handled by the caller, so a refresh can still show feedback. */
export function getCh2Observation(stepId: string, _state?: Pick<GameState, 'dlc'>): Ch2Observation | undefined {
  void _state
  return CH2_OBSERVATIONS[stepId]
}
