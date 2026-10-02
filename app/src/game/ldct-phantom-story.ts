import { LDCT_FATHER_STEPS } from './ldct-father-story'
import type { LdctLabRound } from './ldct-experiments'
import type { LdctNode } from './ldct-types'

/** Preparation saves share this graph; legacy cursors remain available without replay. */
const steps: Record<string, LdctNode> = { ...LDCT_FATHER_STEPS }
const revise = (id: string, patch: Partial<LdctNode>) => { steps[id] = { ...steps[id], ...patch } }
const room = 'bg_breakroom', control = 'bg_ctcontrol_day_ready', nightControl = 'bg_ctcontrol_ready', restaurant = 'ldct_bg_restaurant', lu = '@luzhou'

revise('lf_listen_1', { next: 'lf_table_explain_0' })
revise('lf_joke_1', { next: 'lf_table_explain_0' })
steps.lf_table_explain_0 = { id: 'lf_table_explain_0', part: 1, bg: restaurant, sprite: null,
  text: '饭快吃完，陆叔又把“低剂量”三个字念了一遍。你借来一支笔，在干净纸上画了个人，又在周围添了几支箭头。', next: 'lf_table_explain_1' }
steps.lf_table_explain_1 = { id: 'lf_table_explain_1', part: 1, bg: restaurant, sprite: null, speaker: 'me',
  text: 'X光从不同方向穿过去，身体各处挡下的多少不一样。机器收到这些信号，再算成一层层的图。', next: 'lf_table_explain_2' }
steps.lf_table_explain_2 = { id: 'lf_table_explain_2', part: 1, bg: restaurant, sprite: null, speaker: '陆叔',
  text: '那低剂量，就是少照一点？少了，图还能看吗？', next: 'lf_table_explain_3' }
steps.lf_table_explain_3 = { id: 'lf_table_explain_3', part: 1, bg: restaurant, sprite: null, speaker: 'me',
  text: '少用些X光，收到的光子也少，图上就容易起颗粒。电脑能帮着算，可不是按一下就什么都有了。具体怎么照，还得让医生结合您的情况定。', next: 'lf_to_consult' }
revise('lf_to_consult', { text: '陆叔把那张纸折好：“那明早我去，先把不明白的问完。”\n你们收好剩菜。陆舟送父亲上车后，和你往医院走：“回科里看看那个模体？”', next: 'lf_plan_0' })
revise('lf_wait_consult', { text: '第二天早上，你们在医院碰头。候诊区响起叫号声，陆叔从口袋里掏出挂号单，还有昨晚那张折过的纸。\n“先问清楚，再进去照。”陆舟点头，陪他起身。' })
revise('lf_consult_0', { text: '医师问过陆叔的吸烟和既往检查情况，也回答了他的辐射顾虑，确认了今天的低剂量胸部CT安排。回到候诊区，陆舟总算把挂号单收回了口袋。' })
revise('lf_consult_2', { next: 'lf_scan_0' })
revise('lf_scan_0', { text: '稍后，老周看过昨晚的模体对照，再结合陆叔的情况确认了检查方案。你接过外套，陆舟陪父亲坐到检查床边。陆叔笑他：“我都坐好了，你俩别比我还紧张。”' })

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
revise('lf_after_filter_1', { text: '机器菜单里不是还有“迭代重建”吗？点开看看。', next: 'lf_trial_license_0' })
steps.lf_trial_license_0 = { id: 'lf_trial_license_0', part: 1, bg: control, sprite: null, speaker: 'me',
  text: '这儿有个小锁。不是咱没选对菜单，是压根没开？', next: 'lf_trial_license_1' }
steps.lf_trial_license_1 = { id: 'lf_trial_license_1', part: 1, bg: control, sprite: null,
  text: '你照设备联系簿拨给工程师，指了指屏幕。陆舟把椅子挪近，凑过来听。', next: 'lf_trial_license_2' }
steps.lf_trial_license_2 = { id: 'lf_trial_license_2', part: 1, bg: control, sprite: null, speaker: '工程师（电话）',
  text: '这台配的是基础重建。迭代包是厂家收费选配，院里这套没开通，所以按钮是灰的。', next: 'lf_trial_license_3' }
steps.lf_trial_license_3 = { id: 'lf_trial_license_3', part: 1, bg: control, sprite: null, speaker: 'luzhou',
  text: '合着菜单先给我们看着。行，我带的研究程序能试。回工作站，用**刚才那组低曝光投影**算一遍。', next: 'lf_phantom_iteration_0' }
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
revise('lf_night1_end', { text: '第一晚 · 先收工。模体归位，试扫和重建对照存好。明早陪陆叔到院，把检查前的疑问问清楚。',
  settlement: { title: '第一晚 · 先收工', eyebrow: '第一天结束', nextLabel: '休息一晚，明早陪陆叔到院', next: 'lf_wait_consult' } })

// The patient's acquisition remains a single clinical examination, not a dose experiment.
revise('lf_first_fbp', { text: '这张颗粒也不少。昨晚在桶上看着还挺镇定，换成我爸，心里又没底了。', next: 'lf_patient_review' })
steps.lf_patient_review = { id: 'lf_patient_review', part: 2, bg: control, sprite: 'ch2_pixel_char_zhou', speaker: 'zhou',
  text: '我在核完整序列。这一处挺淡，旁边又挨着血管。先别叫他回来补扫。', next: 'lf_known_license' }
steps.lf_known_license = { id: 'lf_known_license', part: 2, bg: control, sprite: lu, speaker: 'luzhou',
  text: '机器那个包还是锁着。咱们查查研究接口，看看同次数据能不能用昨晚的程序再算一版？', next: 'lf_export_0' }
// Keep the former discovery route readable for saves already on one of its nodes.
revise('lf_license_0', { text: '你那套程序能算。机器自带的这个迭代包呢？怎么还是灰的？' })
revise('lf_iteration_intro_0', { text: '你们重新打开陆叔同次检查的研究副本。陆舟把原FBP并排留下，手刚搭上鼠标，又让给了你。', sprite: null, speaker: undefined })
revise('lf_iteration_intro_1', { text: '这回换肺部图。从原FBP开始，一轮一轮看；你觉得哪里值得再核对，就留个标记。', next: 'lf_patient_lab' })
steps.lf_patient_lab = { id: 'lf_patient_lab', part: 2, bg: room, sprite: lu, speaker: 'luzhou', text: '接着看？刚才算到哪儿都存着。',
  enterLab: 5, labDataset: 'chest', labContext: 'patient', goal: '用同一份肺部投影逐轮迭代，和原FBP、相邻层对照。' }
// Published saves already on this result keep their cursor and continue without replaying the lab.
steps.lf_patient_result = { id: 'lf_patient_result', part: 2, bg: room, sprite: null, chestPreview: 'iteration:4', speaker: 'luzhou',
  text: '这版出来了。……我刚才居然一直在盯进度条。', next: 'lf_after_iteration_0' }

for (const [id, node] of Object.entries(steps)) {
  revise(id, { timeLabel: node.part === 1 ? '第一天 · 晚上' : '第二天 · 晚上',
    ...(node.part === 1 && node.bg === control ? { bg: nightControl } : {}) })
}
for (const id of ['lf_wait_consult', 'lf_consult_0', 'lf_consult_1', 'lf_consult_2', 'lf_scan_0', 'lf_father_scan']) {
  revise(id, { timeLabel: '第二天 · 上午' })
}
for (const id of ['lf_scan_1', 'lf_scan_2', 'lf_first_fbp', 'lf_patient_review', 'lf_known_license',
  'lf_license_0', 'lf_license_1', 'lf_license_2', 'lf_license_3', 'lf_license_choice', 'lf_existing_0', 'lf_complain_0',
  'lf_export_0', 'lf_export_1', 'lf_export_2']) {
  revise(id, { timeLabel: '第二天 · 傍晚' })
}

export const LDCT_PHANTOM_PREPARATION_STEPS: Readonly<Record<string, LdctNode>> = steps
export const LDCT_PHANTOM_PREPARATION_RETURNS: Record<LdctLabRound, string> = {
  1: 'lf_after_trace_0', 2: 'lf_after_bp_0', 3: 'lf_after_filter_0',
  4: 'lf_photons_done_0', 5: 'lf_phantom_ready_0',
}

/** Old consultations precede the labs; adopting there would now skip them. */
export function canAdoptPhantomPreparation(nodeId: string): boolean {
  return nodeId === 'lf_start' || nodeId === 'lf_welcome' || nodeId === 'lf_persuade' || nodeId === 'lf_to_consult' ||
    /^lf_(arrive|listen|joke|plan|phantom)_\d+$/.test(nodeId) ||
    nodeId === 'lf_phantom_scan' || nodeId === 'lf_phantom_done'
}
