import type { LdctLabRound } from './ldct-experiments'
import type { LdctChoice, LdctNode, LdctProgress } from './ldct-types'

export const LDCT_FATHER_STORY = {
  id: 'father', title: '这顿饭，等片子看清了再吃', subtitle: '两次下班后的约定，一张不敢随便说“没事”的片子。',
  start: 'lf_start', dataset: 'phantom',
} as const
export const LDCT_NEXT_EVENING = 'lf_scan_0'
export const LDCT_FATHER_LAB_DATASETS = { 1: 'phantom', 2: 'phantom', 3: 'phantom', 4: 'chest', 5: 'chest' } as const
export const LDCT_FATHER_LAB_RETURNS: Record<LdctLabRound, string> = {
  1: 'lf_after_trace_0', 2: 'lf_after_bp_0', 3: 'lf_after_filter_0', 4: 'lf_photons_done_0', 5: 'lf_after_iteration_0',
}
const waiting = 'bg_waiting', room = 'bg_breakroom', day = 'ch2_bg_breakroom_day', control = 'bg_ctcontrol_day_ready', corridor = 'bg_corridor', restaurant = 'ldct_bg_restaurant'
const father = 'ldct_char_father_v1', lu = '@luzhou', zhou = 'ch2_pixel_char_zhou', he = 'ch2_pixel_char_he'
export const LDCT_FATHER_MEDIA_IDS = [waiting, room, day, control, corridor, restaurant, father, zhou, he,
  'ch2_pixel_char_luzhou_m', 'ch2_pixel_char_luzhou_f', 'item_coffee', 'item_milktea', 'item_snack'] as const
const nodes: Record<string, LdctNode> = {}
type Line = [speaker: string | undefined, text: string]
const add = (id: string, value: Omit<LdctNode, 'id'>) => { nodes[id] = { id, ...value } }
function lines(prefix: string, dialogue: Line[], bg: string, sprite: string | null, next: string, part: 1 | 2 | 3,
  extra: Pick<LdctNode, 'giftPerson' | 'complete'> = {}) {
  dialogue.forEach(([speaker, text], i) => add(`${prefix}_${i}`, { bg,
    sprite: sprite === null ? null : speaker === 'luzhou' ? lu : speaker === 'zhou' ? zhou : speaker === 'he' ? he : speaker === '陆叔' ? father : sprite,
    speaker, text, part,
    next: i + 1 < dialogue.length ? `${prefix}_${i + 1}` : next, giftPerson: extra.giftPerson,
    complete: i === dialogue.length - 1 ? extra.complete : undefined }))
}
const choice = (id: string, text: string, next: string, key?: string, value = id): LdctChoice => ({
  id, text, next, ...(key ? { decision: { key, value } } : {}),
})
function lab(round: LdctLabRound, part: 1 | 2, goal: string) {
  add(`lf_lab_${round}`, { bg: room, sprite: null, text: '', part, enterLab: round,
    labDataset: LDCT_FATHER_LAB_DATASETS[round], goal })
}

add('lf_start', { part: 1, bg: restaurant, sprite: null,
  text: '2025年冬，医院旁的小饭馆。陆舟赴约时，身后还跟着他父亲。\n你刚站起来叫了声“陆叔”，陆舟已经替父亲拉开椅子，把烟灰缸挪远了。', next: 'lf_welcome' })
add('lf_welcome', { part: 1, bg: restaurant, sprite: lu, speaker: 'luzhou', text: '你先坐。我爸非说今天只是来吃饭的。', next: 'lf_arrive_0' })
lines('lf_arrive', [
  ['陆叔', '说好吃饭的。你别一坐下，又说那个CT。'],
  ['luzhou', '爸，医生建议的检查，你拖两个星期了。烟抽了三十多年，就这时候特别怕辐射。'],
  ['陆叔', '我好好的，进去照一遍，万一照出毛病呢？'],
  ['me', '叔叔，汤先盛上。菜才上，你们倒先吵饱了。'],
], restaurant, father, 'lf_persuade', 1)
add('lf_persuade', { part: 1, bg: restaurant, sprite: father, speaker: '陆叔', text: '烟我能少抽。这个CT，能不做就不做吧。', choices: [
  choice('listen', '先听听他到底怕什么', 'lf_listen_0', 'father_tone'),
  choice('joke', '“咱先吃饭，别让这顿饭也背上辐射的锅。”', 'lf_joke_0', 'father_tone'),
] })
lines('lf_listen', [
  ['陆叔', '隔壁老李说，片子照多了也能得病。我这不是两头堵吗。'],
  ['me', '这顾虑可以问。让医生把两头都讲清楚，别让陆舟光跟您比谁嗓门大。'],
], restaurant, father, 'lf_consult_0', 1)
lines('lf_joke', [
  ['陆叔', '对，菜快凉了。他回来两天，就会盯着我。'],
  ['me', '您担心的先记下，回头让医生解释。陆舟，筷子拿起来，别拿挂号单当菜单。'],
], restaurant, father, 'lf_consult_0', 1)
lines('lf_consult', [
  [undefined, '门诊里，医师问过陆叔的吸烟和既往检查情况，把辐射顾虑也聊清楚了。低剂量胸部CT约在明天，陆舟总算把挂号单收回了口袋。'],
  ['陆叔', '你们不是为了照得亮，就一个劲往上加？'],
  ['luzhou', '爸，方案由医生评估。我不替你调，咱把不明白的问完。'],
], waiting, father, 'lf_plan_0', 1)
lines('lf_plan', [
  ['luzhou', '他一直问到底能少用多少。我也想知道：管电流再低一档，还看得清吗？'],
  ['me', '器材柜里有个模体。先拿它试，别拿叔叔试。'],
  ['luzhou', '老周答应借我们质控后的空档。走，趁下一拨人来之前搬过去。'],
], room, lu, 'lf_phantom_0', 1)
lines('lf_phantom', [
  ['me', '这玩意怎么这么沉？我以为就是个塑料桶。'],
  ['luzhou', '托住底下。里头那些小零件，比我宿舍的家当还齐。'],
  [undefined, '你们把圆柱模体安放到检查床上，退出机房。门合上，床缓缓送进机架。按老周留的安排扫完几组后，你们把模体归位，带着数据回到工作站。'],
], control, null, 'lf_review_intro_0', 1)
lines('lf_scan', [
  ['陆叔', '我都躺好了。陆舟，你别一副比我还紧张的样子。'],
  [undefined, '陆叔完成了医师安排的检查。陆舟一直陪着，傍晚才来找你和老周。他把缴费单折了又展，边角已经起毛。'],
  ['zhou', '都坐，别着急。先别盯着我表情猜报告。'],
], control, zhou, 'lf_first_fbp', 2)
nodes.lf_scan_1.sprite = null
add('lf_first_fbp', { part: 2, bg: control, sprite: null, chestPreview: 'fbp', speaker: 'luzhou',
  text: '出来了。……这些颗粒，是不是昨天说的光子不够？', next: 'lf_photons_intro_0' })
lines('lf_photons_intro', [
  ['me', '先拿这张胸部图做个模拟，每次加一份曝光，看看颗粒怎么变。叔叔已经拍完了，不重扫。'],
  ['zhou', '你们看着。我把完整序列再过一遍。'],
], control, zhou, 'lf_lab_4', 2)
lines('lf_photons_done', [
  ['luzhou', '多攒一点光子，颗粒确实少些。可我爸一听“再照”，肯定先跳起来。'],
  ['zhou', '不叫他回来加量。这处很淡，旁边又挨着血管，先核完整序列。'],
  ['me', '那已经拿到的数据，能不能再想想办法？'],
], control, zhou, 'lf_license_0', 2)
lines('lf_license', [
  ['me', '不是还有迭代重建吗？我在设备菜单里见过。'],
  [undefined, '你按设备联系簿拨给工程师。陆舟靠过来听，手指仍压着那张缴费单。'],
  ['工程师（电话）', '这台配的是基础重建。那个迭代包是收费选配，院里这套没开通，所以按钮是灰的。'],
  ['luzhou', '我爸都拍完了，才发现还差这么一包。'],
], control, null, 'lf_license_choice', 2)
nodes.lf_license_3.sprite = lu
add('lf_license_choice', { part: 2, bg: control, sprite: zhou, text: '你盯着那个灰掉的选项。老周已经拿起电话，安排后续复核。', choices: [
  choice('existing', '“同一次的数据，能不能再算一版？”', 'lf_existing_0', 'license_reaction'),
  choice('complain', '“这种时候才告诉我还有付费包……”', 'lf_complain_0', 'license_reaction'),
] })
lines('lf_existing', [['zhou', '能不能导出，要先查设备接口。临床这边该复核、该转诊，不等你们算完。']], control, zhou, 'lf_export_0', 2)
lines('lf_complain', [['zhou', '气我懂。不过先把病人的事接住。设备采购这笔账，另找时间算。']], control, zhou, 'lf_export_0', 2)
lines('lf_export', [
  [undefined, '科室已有重建评估项目，陆舟也在获准参与范围内。陆叔另行同意去标识研究使用后，工程师把限定范围的副本导到院内工作站，临床流程继续走。'],
  ['me', '拿到了。是**原始投影和校准信息**，不是几张PACS截图。今晚就在这台工作站试。'],
  ['luzhou', '好。我先给我爸回个电话，让他别在外头等咱们熬。'],
], room, lu, 'lf_evening2', 2, { complete: 'father_projection_authorized' })
lines('lf_review_intro', [
  ['me', '刚抱进去的是个桶，导出来怎么成桌布了？'],
  ['luzhou', '这是它的投影。本科讲这节，你就睡我旁边。'],
  ['me', '你怎么知道我睡着了？'],
  ['luzhou', '因为你打呼噜，把我也吵醒了。点一下那个小结构，别又睡。'],
], room, lu, 'lf_lab_1', 1)
lab(1, 1, '先点一个编号，再转角度，跟住它在正弦图里的影子。')
lines('lf_after_trace', [['me', '点没跑，是每个方向看到的位置在变。'], ['luzhou', '对。现在假装原图丢了，把这些影子往回铺。']], room, lu, 'lf_lab_2', 1)
lab(2, 1, '把同一个物体的投影铺回来，看看为什么还会有一圈糊边。')
lines('lf_after_bp', [['me', '轮廓有了，像隔着油烟机玻璃。'], ['luzhou', '所以还要先滤波。不是在最后的图片上擦一遍。']], room, lu, 'lf_lab_3', 1)
lab(3, 1, '换一次滤波方式，比较轮廓与细节；其他参数想看再展开。')
lines('lf_after_filter', [
  ['me', '低管电流那档加上锐滤波，噪点就扎眼了。换柔的，又怕小东西跟着糊。'],
  ['luzhou', '先把对照存下来。明天给老周看，别咱俩在这儿拍脑袋定我爸的参数。'],
  ['me', '行，模体已经送回去了。咱的饭倒还没吃明白。'],
], room, lu, 'lf_night1_end', 1)
add('lf_night1_end', { part: 1, bg: room, sprite: null, settle: true,
  text: '第一晚 · 先收工。模体归位，试扫和重建对照存好。明天医师结合陆叔的情况确认检查方案，今晚的结果先留着。' })

// Short handoff before the booked examination, without a clinical dose quiz.
nodes.lf_scan_0.text = '第二天，老周看过模体对照，再结合陆叔的情况确认了检查方案。你接过外套，陆舟陪父亲坐到检查床边。陆叔笑他：“我都坐好了，你俩别比我还紧张。”'
nodes.lf_scan_0.speaker = undefined
nodes.lf_scan_0.sprite = father

add('lf_evening2', { part: 2, bg: room, sprite: null,
  text: '研究副本拷好，窗外已经黑了。你拎着饭回来，陆舟的手机正响。他看见“爸”，先把电脑盖上，才接起电话。', next: 'lf_dinner_0' })
lines('lf_dinner', [
  ['陆叔（电话）', '今晚饭多少钱？我转给你。……那个结果，有说法没？'],
  ['luzhou', '爸，饭钱别管。医生在复核，我们这边也还在对照，有消息我给你打。'],
  ['me', '叔叔惦记的哪是饭钱。先吃两口，咱再看。'],
], room, null, 'lf_rest_hub', 2)
nodes.lf_dinner_1.sprite = lu
nodes.lf_dinner_2.sprite = lu
add('lf_rest_hub', { part: 2, bg: room, sprite: null, kind: 'hub', text: '饭还热着。小何来借微波炉，陆舟把电脑挪到桌子另一头。', choices: [
  { ...choice('lu', '问问陆舟，这回有没有把握', 'lf_chat_lu_0'), unless: 'father_lu_chat' },
  { ...choice('he', '和小何聊两句', 'lf_chat_he_0'), unless: 'father_he_chat' },
  choice('work', '收好饭盒，继续看数据', 'lf_iteration_intro_0'),
] })
lines('lf_chat_lu', [
  ['me', '你以前最爱说“问题不大”。今天怎么一句都不说？'],
  ['luzhou', '换成我爸，我也会慌。脑子里知道别乱保证，手还是一直想刷新。'],
  ['me', '那我在旁边帮你踩刹车。你也把饭吃完。'],
], room, lu, 'lf_rest_hub', 2, { giftPerson: 'luzhou', complete: 'father_lu_chat' })
lines('lf_chat_he', [
  ['he', '这谁的饭呀？刚才差点跟我的一起热了。'],
  ['me', '我的。拜托别再给它第三次生命。'],
  ['he', '那就趁热吃。陆舟他爸刚还问，陪他儿子加班的是不是你。'],
], room, he, 'lf_rest_hub', 2, { giftPerson: 'he', complete: 'father_he_chat' })
lab(4, 2, '点一次，积累一份模拟曝光；看同一张胸部图的颗粒变化。')
nodes.lf_lab_4.bg = control
lines('lf_iteration_intro', [
  [undefined, '你们回到研究副本。这里用**开放胸部CT衍生的模拟数据**演示对照：原FBP留在旁边，再看逐轮结果和相邻层。'],
  ['luzhou', '先别急着说好看。你想请老周核对哪一处，就留个标记；拿不准也留着。'],
], room, lu, 'lf_lab_5', 2)
lab(5, 2, '和原FBP对照，看一轮变化；想核查的位置可以标记，不必猜诊断。')
lines('lf_after_iteration', [
  ['luzhou', '这张平滑多了。要不就留这版？我真不想再看那些噪点。'],
  ['me', '等一下。咱们现在是希望它看着舒服，还是想把那一处看清？'],
], room, lu, 'lf_result_choice', 2)
add('lf_result_choice', { part: 2, bg: room, sprite: lu, text: '陆舟松开鼠标，让开了一点位置。', choices: [
  choice('fbp', '先回看同层原FBP', 'lf_recheck_fbp_0', 'result_review'),
  choice('keep', '另一版也留着，不急着删', 'lf_recheck_keep_0', 'result_review'),
  choice('together', '“坐过来，咱们把相邻层一起看。”', 'lf_recheck_together_0', 'result_review'),
] })
lines('lf_recheck_fbp', [['me', '原片噪点多，但不能跳过。先对同一层。'], ['luzhou', '嗯。刚才我只想挑张能让我松口气的。']], room, lu, 'lf_record_echo', 2)
nodes.lf_recheck_fbp_0.chestPreview = 'fbp'
nodes.lf_recheck_fbp_0.sprite = null
lines('lf_recheck_keep', [['me', '别拿平滑程度当淘汰线。两版带着参数一起留。'], ['luzhou', '好。我不删。难看的也留下。']], room, lu, 'lf_record_echo', 2)
lines('lf_recheck_together', [['me', '你盯得太久了。换我翻层，你帮我核对是不是同一处。'], ['luzhou', '行。我们一起看，别谁一个人先下结论。']], room, lu, 'lf_record_echo', 2)
add('lf_record_echo', { part: 2, bg: room, sprite: lu, speaker: 'luzhou',
  text: '同层原FBP、这版参数和相邻层都留好。没把握的地方，明天直接问老周。', next: 'lf_clinical_preview' })
add('lf_clinical_preview', { part: 2, bg: control, sprite: null, chestPreview: 'iteration:4',
  text: '次日，老周把研究对照与原有临床序列放在一起核查。你们提交的是**复核线索**，不是自动生成的诊断。', next: 'lf_clinical_0' })
lines('lf_clinical', [
  ['zhou', '这处确实值得继续查。我已经联系上级医院，把完整资料交过去。'],
  ['me', '我们后来那版，有帮上忙吗？'],
  ['zhou', '帮我更有针对性地复看了。但最后还得核完整影像，结合后续检查，不能靠你们这一张下结论。'],
], control, zhou, 'lf_depart_0', 2)
lines('lf_depart', [
  [undefined, '转诊安排妥当。陆叔站在走廊尽头，陆舟走过去替他提起袋子。你把核对好的资料交给陪同人员。'],
  ['陆叔', '你们俩眼圈黑的。别管我了，今天早点回去睡。'],
  ['me', '行，叔叔。您按时去，我们按时睡。'],
], corridor, father, 'lf_weeks_0', 2)
lines('lf_weeks', [
  [undefined, '几周后。上级医院完成进一步检查和治疗，术后病理确认是早期肺癌。陆舟陪父亲回来复诊，陆叔先把复诊单从袋子里拿了出来。'],
  ['陆叔', '医生说的下回复查，是这个日期吧？陆舟，你再给我存一遍。'],
  ['luzhou', '存好了，爸。你这回比我记得牢。'],
  ['陆叔', '今天我请饭。叫上你同学，别让人家每回陪你饿肚子。'],
], waiting, father, 'lf_final_lu_0', 3)
lines('lf_final_lu', [
  [undefined, '还是那家饭馆。陆叔把菜单递给你，陆舟终于没再掏出电脑。那份带着噪声的原FBP，也好好地留在记录里。'],
  ['陆叔', '菜单拿着，别光看我。你们忙活了这么久，好歹让我点两个硬菜。'],
  ['me', '好。今天我们都不加班。'],
], restaurant, father, 'lf_end', 3)
add('lf_end', { part: 3, bg: restaurant, sprite: null, settle: true, storyEnd: true,
  text: '噪声之外 · 本篇完。原FBP、迭代对照和不确定的地方都留了下来。陆叔按医嘱继续复查；今晚，终于轮到好好吃一顿饭。' })

export const LDCT_FATHER_STEPS: Readonly<Record<string, LdctNode>> = nodes
export function resolveLdctFatherNode(node: LdctNode, progress: LdctProgress): LdctNode {
  if (node.id === 'lf_depart_1' && progress.decisions.father_tone === 'joke')
    return { ...node, text: '这回不怨菜凉了。回头检查完，我再请你们吃一顿，谁也不许拿挂号单当菜单。' }
  if (node.id === 'lf_record_echo') {
    const chest = progress.records[5]?.chest
    const pinned = chest?.pinned ? '你固定的那版也保留。' : '再把参数记全，不凭印象复现。'
    const mark = chest?.mark ? '你留的存疑标记，和原FBP一起请老周核对。' : '没有圈定位置也没关系，完整序列一起带过去。'
    return { ...node, text: `${pinned}${mark}` }
  }
  if (node.id === 'lf_after_filter_0' && progress.openingRevision === 5 && progress.records[3]?.signal !== 'low')
    return { ...node, text: '锐的边上利索，柔的看着舒服。想把管电流再压低一点，怕是还得看看噪点会不会太闹。' }
  return node
}
