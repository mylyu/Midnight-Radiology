import type { GameState } from './types'
import type { LdctChoice, LdctNode, LdctProgress } from './ldct-types'
import { LDCT_FATHER_STEPS, LDCT_FATHER_MEDIA_IDS, LDCT_FATHER_STORY, resolveLdctFatherNode } from './ldct-father-story'
import { LDCT_CINEMATIC_MEDIA_IDS } from './ldct-cinematics'
import legacyFatherV4 from './ldct-father-v4.json'
import { LDCT_PHANTOM_PREPARATION_STEPS } from './ldct-phantom-story'

export const LDCT_TITLE = `低剂量CT · ${LDCT_FATHER_STORY.title}`
export const LDCT_START = LDCT_FATHER_STORY.start
export const LDCT_STORIES = [LDCT_FATHER_STORY] as const
export const LDCT_BADGES = {
  ldct_first_comparison: { name: '第一份对照', icon: '🔍', desc: '亲手试过或请陆舟演示一次重建对照；旧版已得奖励保留，不重复发放。' },
  ldct_keep_counterexample: { name: '那张也留着', icon: '📎', desc: '旧四段版收藏，保留已获得记录；本版不再要求盲评。' },
  ldct_noise_beyond: { name: '噪声之外', icon: '◐', desc: '把故事走到结尾。不是选出最光滑的图片才算完成；旧版收藏保留。' },
  ldct_fast_backproject: { name: '手比嘴快', icon: '⚡', desc: '在15秒内手动铺回全部投影方向。只记这次手速，不评价算法或病情。' },
  ldct_fast_iteration: { name: '再来一轮', icon: '🔄', desc: '在10秒内手动推进12轮迭代。快不等于更准，原片照样留着。' },
}
export const LDCT_MEDIA_IDS = [
  ...LDCT_CINEMATIC_MEDIA_IDS,
  ...LDCT_FATHER_MEDIA_IDS,
  'ch2_pixel_char_luzhou_m', 'ch2_pixel_char_luzhou_f',
  'item_coffee', 'item_milktea', 'item_snack',
] as const
export const LDCT_STEPS: Readonly<Record<string, LdctNode>> = LDCT_FATHER_STEPS
export function getLdctSteps(progress?: LdctProgress): Readonly<Record<string, LdctNode>> {
  if (progress?.openingRevision === 5 && progress.phantomPreparation === 1) return LDCT_PHANTOM_PREPARATION_STEPS
  return progress?.storyId === 'father' && progress.openingRevision !== 5
    ? legacyFatherV4 as Readonly<Record<string, LdctNode>> : LDCT_STEPS
}

export function getLdctNode(state: GameState): LdctNode {
  const shelf = state.dlc?.ldct?.ldctStories
  const p = shelf?.version === 2 && shelf.active === 'father' ? shelf.slots.father : undefined
  const steps = getLdctSteps(p)
  const node = steps[p?.nodeId ?? LDCT_START] ?? steps[LDCT_START]
  const resolved = p ? resolveLdctFatherNode(node, p) : node
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
  { title: '先试模体，再看片子', text: '第一晚，两人搬出实体模体，私下占了质控后的空档试扫，机时没有报备；这件事会被主任发现。逐步加曝光的对象是这个模体，之后迭代只重复使用已留下的投影。次日患者的检查由医师安排，研究数据另有授权；模体结果不是给患者套用的剂量处方，不让父亲反复补扫。' },
  { title: '和陆舟比手速', text: '反投影和迭代各有一场可选短挑战，点“开始计时”才开表。每按一次才推进，不自动播放。超时停在当前图，可以慢慢继续或重试；不会扣属性、阻断剧情。成功各记一枚勋章，同一枚不重复发。这里加快的是教学演示，不是实际计算性能，也不是扫描曝光。' },
  { title: '正弦图：换个方向看同一个东西', text: '横向是角度，纵向是探测器位置。点一个结构，只标它在完整投影中的轨迹；圆底和其他结构都还在。球管转，物体没有跟着跑。' },
  { title: '不滤波，也真的铺回去了', text: '每点一次，再铺回一组方向；不操作就停在当前结果。直接反投影把各方向的投影沿原路摊回去。大圆底的贡献叠在一起，结果会很糊；旁边保留原物体。直接反投影使用单独固定显示范围，避免整体过亮；它并未额外锐化。' },
  { title: '滤波器的脾气', text: '不滤波的响应是平直的；Ram-Lak（Ramp）是斜坡，其余选项用不同窗压低高频。滤的是同一份投影，再反投影，不是给成片套美颜。响应曲线和全部选项可展开看，不要求逐项试完。' },
  { title: '信号少一点，会怎样', text: '本台固定物体、角度和显示窗，用计数的泊松波动模拟低信号，不是给图片撒雪花，也不把少角度等同低剂量。档位不是患者的剂量建议。' },
  { title: '每点一次，多一份曝光', text: '当前开场在实体模体试扫时体验低管电流：每次点击累加一份独立计数，再按总入射计数归一化、取对数、重新计算FBP。完整圆底、嵌件位置与显示窗固定，从几乎纯噪声到勉强辨认。mAs是管电流与曝光时间的乘积；其他设置固定时，增大它通常增加光子数，降低计数的相对波动。mAs本身不是患者吸收剂量，实验中的“份”也只是相对模拟量。旧存档原有胸部实验记录仍按旧来源展示。' },
  { title: '迭代：用留下的同一份投影', text: '模体曝光实验最终留下13份计数，迭代第0轮就是该终点FBP，不从黑图开始。随后SART-TV重复核对同一份投影并约束噪声，不再增加曝光。第二晚再用胸部数据逐轮比较，保留原FBP、固定版及相邻层；这份记录与模体记录分开保存。画面是真正计算的中间结果，多几轮不保证更好。父亲的临床检查另按医师安排，不用他的检查反复试参数。' },
  { title: '灰按钮与原始数据', text: '本故事中的设备、收费配置和导出接口为虚构。一个设备上的可选收费算法不能代表所有厂商。由获准工程人员导出原始投影及必要校准信息，不是把普通DICOM断层或截图当投影；没有破解授权，也不向PACS写回研究图。' },
  { title: '模体与演示数据', text: '故事里搬到CT床上的是有嵌件的圆柱形实体模体。游戏中的过程图，用对应结构的二维平行束数值模型生成，并非团队实际采集的模体数据；它不含临床CT全部物理效应。患者检查与诊断由医师安排，演示不替代临床报告。' },
  { title: '胸部图像来源', text: 'El Rahal、Rotzinger、Fahrni：AortaSeg-60（2026），CC BY 4.0，DOI 10.5281/zenodo.18147026。取Nat_07三个相邻层面，降采样后生成模拟投影、计数噪声及FBP/SART-TV结果；不是源扫描器原始投影，未另画病灶。源数据没有肺癌标注，剧情结局不代表数据集诊断。', href: 'https://zenodo.org/records/18147026', linkLabel: '原作者数据与说明', license: 'https://creativecommons.org/licenses/by/4.0/' },
]
export const LDCT_PARTS = [
  { title: '第一晚 · 先拿模体试试', status: '搬模体、试扫，再比较投影与重建' },
  { title: '第二天 · 把原片留下', status: '陪陆叔检查、对照研究结果，直到控制室的门被推开' },
]
