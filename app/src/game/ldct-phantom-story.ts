import { LDCT_FATHER_STEPS } from './ldct-father-story'
import type { LdctLabRound } from './ldct-experiments'
import type { LdctNode } from './ldct-types'

/** Only the preparation order changes. Published mid-story saves retain their graph. */
const steps: Record<string, LdctNode> = { ...LDCT_FATHER_STEPS }
const revise = (id: string, patch: Partial<LdctNode>) => { steps[id] = { ...steps[id], ...patch } }
const room = 'bg_breakroom', control = 'bg_ctcontrol_day_ready', lu = '@luzhou'

revise('lf_phantom_done', {
  text: '模体留在床上。你把管电流往低处调，陆舟盯着屏幕：“先从少得离谱的那档试，看看它到底能糊成什么样。”',
  next: 'lf_photons_intro_0',
})
revise('lf_photons_intro_0', { part: 1, bg: control, sprite: lu, speaker: 'me',
  text: 'X光成像不是看衰减吗？桶又没变，怎么把**管电流×时间（mAs）**调低，就全是噪点了？', next: 'lf_photons_intro_1' })
revise('lf_photons_intro_1', { part: 1, bg: control, sprite: lu, speaker: 'luzhou',
  text: '衰减能告诉你平均剩下多少光子，可每次真正收到的数量会随机起伏。光子少了，起伏占的比例就大了。', next: 'lf_photons_question' })
steps.lf_photons_question = { id: 'lf_photons_question', part: 1, bg: control, sprite: lu, speaker: 'me',
  text: '所以桶没变，是光子太少，数起来不够稳？那多给一点mAs呢？', next: 'lf_photons_mas' }
steps.lf_photons_mas = { id: 'lf_photons_mas', part: 1, bg: control, sprite: lu, speaker: 'luzhou',
  text: '其他设置不动，mAs加一点，发出的光子通常就多一点。你一点点加，看桶什么时候能认出来。', next: 'lf_lab_4' }
revise('lf_lab_4', { part: 1, bg: control, labDataset: 'phantom', goal: '点一次，多攒一份曝光；从噪点里慢慢找回模体。' })
revise('lf_photons_done_0', { part: 1, bg: control, sprite: lu, speaker: 'me',
  text: '总算看出是个桶了。里面那几个小东西，还是有点悬。', next: 'lf_photons_done_1' })
revise('lf_photons_done_1', { part: 1, bg: control, sprite: lu, speaker: 'luzhou',
  text: '就留**这一组低曝光数据**，先不加量了。试试重建能帮多少，别最后全靠多照。', next: 'lf_photons_done_2' })
revise('lf_photons_done_2', { part: 1, bg: room, sprite: null, speaker: undefined,
  text: '你们把模体送回柜子，回到工作站。陆舟打开刚才保存的投影，你差点以为点错了文件。', next: 'lf_review_intro_0' })
revise('lf_after_filter_0', { text: '锐一点，噪点跟着扎眼；柔一点，小东西也淡了。两头堵啊。' })
revise('lf_after_filter_1', { text: '回到**刚才那组低曝光投影**。我电脑上有个迭代程序，拿它试一遍。', next: 'lf_phantom_iteration_0' })
steps.lf_phantom_iteration_0 = { id: 'lf_phantom_iteration_0', part: 1, bg: room, sprite: lu, speaker: 'me',
  text: '桶都收好了，这回不再照了吧？', next: 'lf_phantom_iteration_1' }
steps.lf_phantom_iteration_1 = { id: 'lf_phantom_iteration_1', part: 1, bg: room, sprite: lu, speaker: 'luzhou',
  text: '不照。**起点就是刚才那张噪点图**，每次只多算一轮。看图有没有变，别光数我按了几下。', next: 'lf_lab_5' }
revise('lf_lab_5', { part: 1, bg: room, labDataset: 'phantom', goal: '不再增加曝光，用刚才留下的那份投影，一轮一轮试迭代。' })
steps.lf_phantom_ready_0 = { id: 'lf_phantom_ready_0', part: 1, bg: room, sprite: lu, speaker: 'me',
  text: '噪点收敛点了。可最小那个也没突然变成大灯泡。', next: 'lf_phantom_ready_1' }
steps.lf_phantom_ready_1 = { id: 'lf_phantom_ready_1', part: 1, bg: room, sprite: lu, speaker: 'luzhou',
  text: '都存着。明天请老周一起看，别照着这个桶给我爸定参数。', next: 'lf_phantom_ready_2' }
steps.lf_phantom_ready_2 = { id: 'lf_phantom_ready_2', part: 1, bg: room, sprite: lu, speaker: 'me',
  text: '桶送回去了。饭凉了。咱今晚效率挺高啊。', next: 'lf_night1_end' }

// The patient's acquisition remains a single clinical examination, not a dose experiment.
revise('lf_first_fbp', { text: '这张颗粒也不少。昨晚在桶上看着还挺镇定，换成我爸，心里又没底了。', next: 'lf_patient_review' })
steps.lf_patient_review = { id: 'lf_patient_review', part: 2, bg: control, sprite: 'ch2_pixel_char_zhou', speaker: 'zhou',
  text: '我在核完整序列。这一处挺淡，旁边又挨着血管。先别叫他回来补扫。', next: 'lf_license_0' }
revise('lf_license_0', { text: '昨晚你那套程序能算。机器自带的这个迭代包呢？怎么还是灰的？' })
revise('lf_iteration_intro_0', { text: '你们重新打开陆叔同次检查的研究副本。陆舟把原FBP并排留下，手刚搭上鼠标，又让给了你。', sprite: null, speaker: undefined })
revise('lf_iteration_intro_1', { text: '这回换肺部图。从原FBP开始，一轮一轮看；你觉得哪里值得再核对，就留个标记。', next: 'lf_patient_lab' })
steps.lf_patient_lab = { id: 'lf_patient_lab', part: 2, bg: room, sprite: lu, speaker: 'luzhou', text: '接着看？刚才算到哪儿都存着。',
  enterLab: 5, labDataset: 'chest', labContext: 'patient', goal: '用同一份肺部投影逐轮迭代，和原FBP、相邻层对照。' }
// Published saves already on this result keep their cursor and continue without replaying the lab.
steps.lf_patient_result = { id: 'lf_patient_result', part: 2, bg: room, sprite: null, chestPreview: 'iteration:4', speaker: 'luzhou',
  text: '这版出来了。……我刚才居然一直在盯进度条。', next: 'lf_after_iteration_0' }

export const LDCT_PHANTOM_PREPARATION_STEPS: Readonly<Record<string, LdctNode>> = steps
export const LDCT_PHANTOM_PREPARATION_RETURNS: Record<LdctLabRound, string> = {
  1: 'lf_after_trace_0', 2: 'lf_after_bp_0', 3: 'lf_after_filter_0',
  4: 'lf_photons_done_0', 5: 'lf_phantom_ready_0',
}

/** Same cursor is safe only before reaching a now-reordered lesson. Never rewind day two. */
export function canAdoptPhantomPreparation(nodeId: string): boolean {
  return nodeId === 'lf_start' || nodeId === 'lf_welcome' || nodeId === 'lf_persuade' || nodeId === 'lf_to_consult' || nodeId === 'lf_wait_consult' ||
    /^lf_(arrive|listen|joke|consult|plan|phantom)_\d+$/.test(nodeId) ||
    nodeId === 'lf_phantom_scan' || nodeId === 'lf_phantom_done'
}
