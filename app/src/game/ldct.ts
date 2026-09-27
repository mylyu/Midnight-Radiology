import type { GameState } from './types'
import type { LdctChoice, LdctNode } from './ldct-types'
import { LDCT_SHORT_STEPS, LDCT_SHORT_MEDIA_IDS, LDCT_STORIES, resolveLdctShortNode } from './ldct-short-stories'

export const LDCT_TITLE = '低剂量CT：噪声之外 · 三篇候选'
export const LDCT_START = LDCT_STORIES[0].start
export const LDCT_BADGES = {
  ldct_first_comparison: { name: '第一份对照', icon: '🔍', desc: '亲手试过或请陆舟演示一次结构与投影的对应。三篇共用一次奖励。' },
  ldct_keep_counterexample: { name: '那张也留着', icon: '📎', desc: '旧四段版收藏，保留已获得记录；本版不再要求盲评。' },
  ldct_noise_beyond: { name: '噪声之外', icon: '◐', desc: '把一个短篇走到结尾。不是选出最光滑的图片才算完成。' },
}
export const LDCT_MEDIA_IDS = [
  ...LDCT_SHORT_MEDIA_IDS,
  'ch2_pixel_char_luzhou_m', 'ch2_pixel_char_luzhou_f',
  'item_coffee', 'item_milktea', 'item_snack',
] as const
export const LDCT_STEPS: Readonly<Record<string, LdctNode>> = LDCT_SHORT_STEPS

export function getLdctNode(state: GameState): LdctNode {
  const p = state.dlc?.ldct?.ldct
  const node = LDCT_STEPS[p?.nodeId ?? LDCT_START] ?? LDCT_STEPS[LDCT_START]
  const resolved = p?.openingRevision === 3 ? resolveLdctShortNode(node, p) : node
  if (resolved.enterLab && p?.phase === 'story') return { ...resolved, text: '电脑还停在刚才的位置。歇够了，点一下继续；想换个故事，也可以从上面的入口过去。' }
  return { ...resolved, sprite: resolved.sprite === '@luzhou' ? `ch2_pixel_char_luzhou_${state.gender}` : resolved.sprite }
}
export function getLdctChoices(state: GameState): LdctChoice[] {
  const p = state.dlc?.ldct?.ldct
  const matches = (condition: string) => {
    if (!condition.startsWith('decision:')) return p?.completed.includes(condition) ?? false
    const [, key, value] = condition.split(':')
    return p?.decisions[key] === value
  }
  return (getLdctNode(state).choices ?? []).filter(c => (!c.unless || !matches(c.unless)) && (!c.requires || matches(c.requires)))
}
export const LDCT_MANUAL = [
  { title: '这是三种讲法，不是三件前情', text: '三个候选故事分别试玩、各自存档，不串成主线经历。工具相同，事情和人物反应不同。想带过实验时，可以请陆舟演示。' },
  { title: '正弦图：换个方向看同一个东西', text: '横向是角度，纵向是探测器位置。点一个结构，只标它在完整投影中的轨迹；圆底和其他结构都还在。球管转，物体没有跟着跑。' },
  { title: '不滤波，也真的铺回去了', text: '直接反投影把各方向的投影沿原路摊回去。大圆底的贡献叠在一起，结果会很糊；旁边保留原物体，不能把稀疏小块悄悄替换成完整模体。直接反投影使用单独固定显示范围，避免整体过亮；它并未额外锐化。' },
  { title: '滤波器的脾气', text: '不滤波的响应是平直的；Ram-Lak（Ramp）是斜坡，其余选项用不同窗压低高频。滤的是同一份投影，再反投影，不是给成片套美颜。响应曲线和全部选项可展开看，不要求逐项试完。' },
  { title: '信号少一点，会怎样', text: '本台固定物体、角度和显示窗，用计数的泊松波动模拟低信号，不是给图片撒雪花，也不把少角度等同低剂量。档位不是患者的剂量建议。' },
  { title: '迭代：再对一遍', text: '从空图开始，把当前估计正投影、与测量比较、再更新。画面是真正计算的中间结果。多几轮不保证更好，也可能追着噪声跑。原物体参照始终保留；赌局中暂时盖住盒内参照，揭晓后可重看。' },
  { title: '桌上的模体，床上的患者', text: '这是二维平行束数字模体演示，不含临床CT全部物理效应。患者的检查与诊断由医师安排，故事里的实验不替代临床报告，也不给患者额外扫描。' },
]
// Content index only, not three sequential canonical chapters.
export const LDCT_PARTS = LDCT_STORIES.map(story => ({ title: story.title, status: '候选试玩 · 独立保存' }))
