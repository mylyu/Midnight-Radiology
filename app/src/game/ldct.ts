import type { GameState } from './types'
import type { LdctChoice, LdctNode } from './ldct-types'
import { LDCT_FATHER_STEPS, LDCT_FATHER_MEDIA_IDS, LDCT_FATHER_STORY, resolveLdctFatherNode } from './ldct-father-story'

export const LDCT_TITLE = `低剂量CT · ${LDCT_FATHER_STORY.title}`
export const LDCT_START = LDCT_FATHER_STORY.start
export const LDCT_STORIES = [LDCT_FATHER_STORY] as const
export const LDCT_BADGES = {
  ldct_first_comparison: { name: '第一份对照', icon: '🔍', desc: '亲手试过或请陆舟演示一次重建对照；旧版已得奖励保留，不重复发放。' },
  ldct_keep_counterexample: { name: '那张也留着', icon: '📎', desc: '旧四段版收藏，保留已获得记录；本版不再要求盲评。' },
  ldct_noise_beyond: { name: '噪声之外', icon: '◐', desc: '把故事走到结尾。不是选出最光滑的图片才算完成；旧版收藏保留。' },
}
export const LDCT_MEDIA_IDS = [
  ...LDCT_FATHER_MEDIA_IDS,
  'ch2_pixel_char_luzhou_m', 'ch2_pixel_char_luzhou_f',
  'item_coffee', 'item_milktea', 'item_snack',
] as const
export const LDCT_STEPS: Readonly<Record<string, LdctNode>> = LDCT_FATHER_STEPS

export function getLdctNode(state: GameState): LdctNode {
  const shelf = state.dlc?.ldct?.ldctStories
  const p = shelf?.version === 2 && shelf.active === 'father' ? shelf.slots.father : undefined
  const node = LDCT_STEPS[p?.nodeId ?? LDCT_START] ?? LDCT_STEPS[LDCT_START]
  const resolved = p?.openingRevision === 4 ? resolveLdctFatherNode(node, p) : node
  if (resolved.enterLab && p?.phase === 'story') return { ...resolved, text: '电脑还停在刚才的位置。歇够了，点一下继续；刚才的参数都还在。' }
  return { ...resolved, sprite: resolved.sprite === '@luzhou' ? `ch2_pixel_char_luzhou_${state.gender}` : resolved.sprite }
}
export function getLdctChoices(state: GameState): LdctChoice[] {
  const shelf = state.dlc?.ldct?.ldctStories
  const p = shelf?.version === 2 && shelf.active === 'father' ? shelf.slots.father : undefined
  const matches = (condition: string) => {
    if (!condition.startsWith('decision:')) return p?.completed.includes(condition) ?? false
    const [, key, value] = condition.split(':')
    return p?.decisions[key] === value
  }
  return (getLdctNode(state).choices ?? []).filter(c => (!c.unless || !matches(c.unless)) && (!c.requires || matches(c.requires)))
}
export const LDCT_MANUAL = [
  { title: '两次下班后的约定', text: '陆舟父亲的检查由医师评估安排，临床复核与转诊不会等待玩家完成实验。复习使用数字模体，胸部演示用开放CT衍生的模拟数据，均不代表陆叔的真实病历。第一晚结束后可停留，主动进入第二晚。' },
  { title: '正弦图：换个方向看同一个东西', text: '横向是角度，纵向是探测器位置。点一个结构，只标它在完整投影中的轨迹；圆底和其他结构都还在。球管转，物体没有跟着跑。' },
  { title: '不滤波，也真的铺回去了', text: '直接反投影把各方向的投影沿原路摊回去。大圆底的贡献叠在一起，结果会很糊；旁边保留原物体，不能把稀疏小块悄悄替换成完整模体。直接反投影使用单独固定显示范围，避免整体过亮；它并未额外锐化。' },
  { title: '滤波器的脾气', text: '不滤波的响应是平直的；Ram-Lak（Ramp）是斜坡，其余选项用不同窗压低高频。滤的是同一份投影，再反投影，不是给成片套美颜。响应曲线和全部选项可展开看，不要求逐项试完。' },
  { title: '信号少一点，会怎样', text: '本台固定物体、角度和显示窗，用计数的泊松波动模拟低信号，不是给图片撒雪花，也不把少角度等同低剂量。档位不是患者的剂量建议。' },
  { title: '迭代：再对一遍', text: '胸部演示用SART-TV，从初始估计反复核对投影，再约束噪声。画面是真正计算的中间结果；多几轮不保证更好。原FBP可随时回看，相邻层和存疑标记帮助交流，不自动判断病灶或签发诊断。' },
  { title: '灰按钮与原始数据', text: '本故事中的设备、收费配置和导出接口为虚构。一个设备上的可选收费算法不能代表所有厂商。由获准工程人员导出原始投影及必要校准信息，不是把普通DICOM断层或截图当投影；没有破解授权，也不向PACS写回研究图。' },
  { title: '桌上的模体，床上的患者', text: '这是二维平行束数字模体演示，不含临床CT全部物理效应。患者的检查与诊断由医师安排，故事里的实验不替代临床报告，也不给患者额外扫描。' },
  { title: '胸部图像来源', text: 'El Rahal、Rotzinger、Fahrni：AortaSeg-60（2026），CC BY 4.0，DOI 10.5281/zenodo.18147026。取Nat_07三个相邻层面，降采样后生成模拟投影、计数噪声及FBP/SART-TV结果；不是源扫描器原始投影，未另画病灶。源数据没有肺癌标注，剧情结局不代表数据集诊断。', href: 'https://zenodo.org/records/18147026', linkLabel: '原作者数据与说明', license: 'https://creativecommons.org/licenses/by/4.0/' },
]
export const LDCT_PARTS = [
  { title: '第一晚 · 那个灰按钮', status: '父亲就诊，重新拾起投影与滤波' },
  { title: '第二晚 · 把原片留下', status: '比较噪声与迭代，带着不确定交接，再看几周后的回响' },
]
