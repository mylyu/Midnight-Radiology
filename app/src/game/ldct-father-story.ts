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
const nightControl = 'bg_ctcontrol_ready'
const father = 'ldct_char_father_v1', lu = '@luzhou', zhou = 'ch2_pixel_char_zhou', he = 'ch2_pixel_char_he', director = 'ch2_pixel_char_director'
export const LDCT_FATHER_MEDIA_IDS = [waiting, room, day, control, nightControl, corridor, restaurant, father, zhou, he, director,
  'ch2_pixel_char_luzhou_m', 'ch2_pixel_char_luzhou_f', 'item_coffee', 'item_milktea', 'item_snack'] as const
const nodes: Record<string, LdctNode> = {}
type Line = [speaker: string | undefined, text: string]
const add = (id: string, value: Omit<LdctNode, 'id'>) => { nodes[id] = { id, ...value } }
function lines(prefix: string, dialogue: Line[], bg: string, sprite: string | null, next: string, part: 1 | 2 | 3,
  extra: Pick<LdctNode, 'giftPerson' | 'complete'> = {}) {
  dialogue.forEach(([speaker, text], i) => add(`${prefix}_${i}`, { bg,
    sprite: sprite === null ? null : speaker === 'luzhou' ? lu : speaker === 'zhou' ? zhou : speaker === 'he' ? he : speaker === 'director' ? director : speaker === '陆叔' ? father : sprite,
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
], restaurant, father, 'lf_to_consult', 1)
lines('lf_joke', [
  ['陆叔', '对，菜快凉了。他回来两天，就会盯着我。'],
  ['me', '您担心的先记下，回头让医生解释。陆舟，筷子拿起来，别拿挂号单当菜单。'],
], restaurant, father, 'lf_to_consult', 1)
add('lf_to_consult', { part: 1, bg: restaurant, sprite: null,
  text: '饭吃得差不多，陆叔把挂号单拿了过去：“那就先去问问，问完再说。”\n你们收好剩菜，沿街走回医院。', next: 'lf_wait_consult' })
add('lf_wait_consult', { part: 1, bg: waiting, sprite: father,
  text: '候诊区又响了一次叫号声。陆叔捏着挂号单，压低声音：“先说好，今天就是问问。”\n陆舟点点头，在他旁边坐下。', next: 'lf_consult_0' })
lines('lf_consult', [
  [undefined, '医师问过陆叔的吸烟和既往检查情况，也回答了他的辐射顾虑。低剂量胸部CT约在明天。回到候诊区，陆舟总算把挂号单收回了口袋。'],
  ['陆叔', '你们不是为了照得亮，就一个劲往上加？'],
  ['luzhou', '爸，方案由医生评估。我不替你调，咱把不明白的问完。'],
], waiting, father, 'lf_plan_0', 1)
lines('lf_plan', [
  ['luzhou', '他一直问到底能少用多少。我也想知道：管电流再低一档，还看得清吗？'],
  ['me', '器材柜里有个模体。先拿它试，别拿叔叔试。'],
  ['luzhou', '质控做完了，模体还在柜里。趁没病人，试两组？'],
  ['me', '主任那儿还没报机时呢。……先搬过去，就两组。'],
], room, lu, 'lf_phantom_0', 1)
lines('lf_phantom', [
  ['me', '这玩意怎么这么沉？我以为就是个塑料桶。'],
  ['luzhou', '托住底下。里头那些小零件，比我宿舍的家当还齐。'],
  [undefined, '你们把圆柱模体安放到检查床上，垫好托架，退出机房。陆舟带上门。设备使用本还摊在桌角，研究试扫那栏空着。'],
], control, null, 'lf_phantom_scan', 1)
add('lf_phantom_scan', { part: 1, bg: control, sprite: null, text: '模体已就位，开始采集。', next: 'lf_phantom_done' })
add('lf_phantom_done', { part: 1, bg: control, sprite: null,
  text: '试扫结束。你们把模体归位，带着数据回到工作站。陆舟拉过一把椅子：“来，看看刚才那桶东西。”', next: 'lf_review_intro_0' })
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
nodes.lf_scan_0.next = 'lf_father_scan'
add('lf_father_scan', { part: 2, bg: control, sprite: null, text: '陆叔躺好，开始采集。', next: 'lf_scan_1' })

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
  ['me', '先别关原图。刚才那一小块呢？咱们对着看看。'],
], room, lu, 'lf_result_choice', 2)
add('lf_result_choice', { part: 2, bg: room, sprite: lu, text: '陆舟松开鼠标，让开了一点位置。', choices: [
  choice('fbp', '先回看同层原FBP', 'lf_recheck_fbp_0', 'result_review'),
  choice('keep', '另一版也留着，不急着删', 'lf_recheck_keep_0', 'result_review'),
  choice('together', '“坐过来，咱们把相邻层一起看。”', 'lf_recheck_together_0', 'result_review'),
] })
lines('lf_recheck_fbp', [['me', '先翻回刚才那一层。你帮我盯着那一处。'], ['luzhou', '嗯。刚才我只想挑张能让我松口气的。']], room, lu, 'lf_record_echo', 2)
nodes.lf_recheck_fbp_0.chestPreview = 'fbp'
nodes.lf_recheck_fbp_0.sprite = null
lines('lf_recheck_keep', [['me', '这张也别删，和原图一起留着。'], ['luzhou', '好。参数也记上，省得回头分不清。']], room, lu, 'lf_record_echo', 2)
lines('lf_recheck_together', [['me', '你盯得太久了。换我翻层，你帮我核对是不是同一处。'], ['luzhou', '行。我们一起看，别谁一个人先下结论。']], room, lu, 'lf_record_echo', 2)
add('lf_record_echo', { part: 2, bg: room, sprite: lu, speaker: 'luzhou',
  text: '同层原FBP、这版参数和相邻层都留好。走，去工作站把最后一份对照存上。', next: 'lf_dl_0' })
lines('lf_dl', [
  ['luzhou', '等一下。我最近在试一套新的**深度学习CT重建**，程序带来了。拿这份数据也跑一遍？'],
  ['me', '刚才迭代的噪点是少了，细节还是别扭。你还有后手，现在才掏？'],
  ['luzhou', '之前跑仿真，结果只能说一般。我哪敢一上来就吹。'],
  [undefined, '陆舟在工作站上选中同一次检查的研究副本，点下运行。你们一人拉过一把椅子，盯着进度条走到头。'],
  ['me', '……等等。刚才那团糊的地方，居然分得开了。你没偷偷换数据吧？'],
  ['luzhou', '没换！还是这一份。这回真人数据出来竟然这么好，比我之前的仿真还好看。'],
  ['me', '你这算法还挺会挑时候。先存下来，咱们把原片也……'],
], nightControl, lu, 'lf_caught_0', 2)
nodes.lf_dl_3.sprite = null
for (const id of ['lf_dl_4', 'lf_dl_5', 'lf_dl_6']) {
  nodes[id].sprite = null
  nodes[id].chestPreview = 'deep-learning'
}
nodes.lf_dl_4.complete = 'father_dl_preview'
lines('lf_caught', [
  [undefined, '控制室的门开了。你还没来得及摘下耳机，主任把设备使用本搁在键盘边。\n“昨晚九点，谁在这儿扫桶？”'],
  ['me', '……模体。'],
  ['director', '我知道是模体。机器记着呢，本子倒干干净净。谁让你们自己加机时的？'],
  ['luzhou', '主任，我们是想试一下重建——'],
  ['director', '研究副本给你们用了，没说机器随便占。**罚两百**。'],
], nightControl, director, 'lf_caught_choice', 2)
add('lf_caught_choice', { part: 2, bg: nightControl, sprite: director,
  text: '陆舟看你。你看设备使用本。主任已经把笔盖拔了。', choices: [
    { ...choice('pay', '“是我们没报。认罚。”（金币－200）', 'lf_fine_0', 'director_route'), goldCost: 200, costReceipt: 'ending:fine' },
    choice('clever', '“主任，先别写。您看这个算法——”', 'lf_pitch_0', 'director_route'),
  ] })
lines('lf_fine', [
  [undefined, '你把罚款记进科室账，拿到回执。陆舟悄悄挪过来：“说好就两组，怎么还有隐藏消费。”'],
  ['me', '别说了，再说按组收。'],
  ['director', '罚归罚。你俩盯到现在，看出什么了？片子调出来。'],
], nightControl, director, 'lf_director_review_0', 2)
lines('lf_pitch', [
  ['me', '我们在改一套迭代重建，下一步还想试深度学习。真做出点东西，文章想请您做**通讯作者**。'],
  [undefined, '主任的笔停了。他把笔盖扣回去，拉了把椅子。\n“哦？这不是挺有想法嘛。”'],
  ['director', '临床这头我帮你们把关，稿子先给我看。罚款先不写了，机时登记补上。'],
  ['luzhou', '主任，那我爸这张……'],
  ['director', '调出来。别光给我看最漂亮的那版。'],
], nightControl, director, 'lf_director_review_0', 2)
lines('lf_director_review', [
  [undefined, '主任往前坐了坐，把原来的临床薄层序列从头翻了一遍，又对了几层你们保留的重建结果。陆舟不说话了。'],
  ['director', '这一处是个**很小的纯磨玻璃结节**。先按计划定期复查，不是看见结节就得开刀。'],
  ['luzhou', '那现在不用马上……？'],
  ['director', '先不用急。复查时间我写上，后面看大小和成分有没有变化。别让你爸又拖着不来。'],
  ['me', '刚才他手心全是汗，鼠标都快拿不住了。'],
  ['luzhou', '你刚才看见主任，不也一样？'],
], nightControl, director, 'lf_director_method_0', 2)
lines('lf_director_method', [
  ['director', '这版图的噪点压得不错，那几处细节也还看得见。你们换了新算法？'],
  ['luzhou', '我们改的迭代程序。还只试了这些数据，得再多做几组对照。'],
  ['me', '机器上那个迭代包没开通，我们就在研究副本上试了这套。'],
  ['director', '可以联系厂家聊聊，看有没有共同研发的机会。先把这些对照整理好，也问问他们需要验证什么。'],
], nightControl, director, 'lf_wrap_0', 2)
lines('lf_wrap', [
  [undefined, '主任走后，陆舟发消息给父亲，把复查安排拍了过去。\n对面很快回了：“知道了。你俩怎么还没下班？”'],
  ['luzhou', '差点被你一句话吓没半条命。'],
  ['me', '你是说片子，还是那笔罚款？'],
  [undefined, '电脑右下角，厂家的迭代包还是锁着。\n你把设备使用本拉到面前。这回，先写名字。'],
], nightControl, lu, 'lf_end', 3)
nodes.lf_wrap_0.sprite = null
nodes.lf_wrap_3.sprite = null
add('lf_end', { part: 3, bg: nightControl, sprite: null, settle: true, storyEnd: true,
  text: '噪声之外 · 本篇完。复查安排发到了陆叔手机上，原片和研究对照都留好了。机时本上，多了两个潦草的名字。' })

export const LDCT_FATHER_STEPS: Readonly<Record<string, LdctNode>> = nodes
export function resolveLdctFatherNode(node: LdctNode, progress: LdctProgress): LdctNode {
  if (progress.phantomPreparation === 1 && node.id === 'lf_photons_done_0' && progress.records[4]?.helped && (progress.records[4].exposureCount ?? 1) < 13)
    return { ...node, speaker: 'luzhou', text: '我把这一组补到最后一档了。看，桶的轮廓勉强出来了。就留这份，咱们不再加曝光。' }
  if (progress.openingRevision !== 5) {
    if (node.id === 'lf_depart_1' && progress.decisions.father_tone === 'joke')
      return { ...node, text: '这回不怨菜凉了。回头检查完，我再请你们吃一顿，谁也不许拿挂号单当菜单。' }
    if (node.id === 'lf_record_echo') {
      const chest = progress.records[5]?.chest
      const pinned = chest?.pinned ? '你固定的那版也保留。' : '再把参数记全，不凭印象复现。'
      const mark = chest?.mark ? '你留的存疑标记，和原FBP一起请老周核对。' : '没有圈定位置也没关系，完整序列一起带过去。'
      return { ...node, text: `${pinned}${mark}` }
    }
    return node
  }
  if (node.id === 'lf_end' && progress.finished && !progress.decisions.director_route)
    return { ...node, text: '旧版结尾已完成，记录与奖励保留。可重玩本篇体验新的主任来访结尾，不会自动倒退旧进度。' }
  if (progress.completed.includes('father_dl_preview')) {
    if (node.id === 'lf_pitch_0')
      return { ...node, text: '我们刚试了陆舟新研究的深度学习重建，这份数据效果挺惊喜。想继续做下去，文章请您做**通讯作者**。' }
    if (node.id === 'lf_director_method_1')
      return { ...node, text: '是我最近研究的深度学习重建。刚才拿同次数据试了一版，连我都没想到会这么好。' }
    if (node.id === 'lf_director_method_2')
      return { ...node, text: '前面的迭代结果也存着。我们正想把这几版放一块，请您帮着看。' }
  }
  if (node.id === 'lf_wrap_1' && progress.decisions.director_route === 'clever')
    return { ...node, text: '你这算法还没起名，通讯作者倒先有了。' }
  if (node.id === 'lf_wrap_2' && progress.decisions.director_route === 'clever')
    return { ...node, text: '先别笑。刚才他说稿子先给他看，你听见没？' }
  if (node.id === 'lf_record_echo') {
    const chest = progress.phantomPreparation ? progress.patientIteration?.record?.chest : progress.records[5]?.chest
    const pinned = chest?.pinned ? '你固定的那版也保留。' : '再把参数记全，不凭印象复现。'
    const mark = chest?.mark ? '存疑标记也一起带上。' : '完整序列也别落下。'
    return { ...node, text: `${pinned}${mark}走，去控制室把最后一份对照存上。` }
  }
  if (node.id === 'lf_after_filter_0' && !progress.phantomPreparation && progress.openingRevision === 5 && progress.records[3]?.signal !== 'low')
    return { ...node, text: '锐的边上利索，柔的看着舒服。想把管电流再压低一点，怕是还得看看噪点会不会太闹。' }
  return node
}
