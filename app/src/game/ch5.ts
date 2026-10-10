import type { GameState, Choice } from './types'
import type { TrilogyChapter, TrilogyStep } from './trilogy-types'

/* 第五章 · 微光。五次跟班沿核医学物理→γ相机/SPECT→PET→计数与重建推进。
 * 人物旧线在可选空档收束；临床不确定仍由医师处理。
 * 所有公共循环、输入保护、经营、存档、随机五题及凭证由共享运行时提供。 */
const portraits: Record<string, string> = {
  zhou: 'ch2_pixel_char_zhou', tang: 'ch2_pixel_char_tang', lei: 'ch2_pixel_char_lei',
  fan: 'ch2_pixel_char_fan', director: 'ch2_pixel_char_director',
  gu: 'char_pet_doctor', ning: 'char_pet_nurse', han: 'char_han',
  xu: 'ch2_pixel_pat_mystery', qian: 'pat_qian', trainee: 'char_new_trainee',
  wen: 'char_wen', elder: 'pat_oldman',
}
const steps: Record<string, TrilogyStep> = {}
type Line = [speaker: string, text: string, patch?: Partial<TrilogyStep>]
function scene(speaker: string, text: string, patch: Partial<TrilogyStep> = {}): TrilogyStep {
  return { speaker, text, sprite: portraits[speaker] ?? '', sprite2: '', image: '', ...patch }
}
function chain(prefix: string, lines: Line[], next: string, common: Partial<TrilogyStep> = {}) {
  let background = common.bg
  lines.forEach(([speaker, text, patch], i) => {
    background = patch?.bg ?? background
    steps[`${prefix}_${i}`] = scene(speaker, text, { ...common, bg: background, next: i + 1 < lines.length ? `${prefix}_${i + 1}` : next, ...patch })
  })
}
function ask(id: string, text: string, choices: Choice[], patch: Partial<TrilogyStep> = {}) {
  steps[id] = scene('sys', text, { ...patch, choices })
}
function detour(text: string, next: string, flag: string): Choice {
  return { text: `${text}（⚡-1）`, next, cond: { notFlag: flag, ap: 1 }, effect: { ap: -1 }, disabledReason: '行动力不足；可在小卖部喝咖啡，或继续值班。' }
}
function finish(id: string, text: string, flag: string) {
  steps[id] = scene('sys', text, { bg: 'bg_pet_dorm', effect: { gold: 150, flag }, end: true })
}

// 出发前：老周完成交接；第一班不会把退休聚餐错算成第二次班后结算。
chain('c5_pro', [
  ['sys', '2028年11月2日。明天你要去省院进修，今晚科室先给老周送行。最后一盘饺子端过来，大家又给他腾出一块地方。', { bg: 'bg_retirement' }],
  ['tang', '哎，饭来了。周老师，您是正式离岗，还是明天又回来拿充电器？', { voice: 'vox_trilogy_tang_v2' }],
  ['zhou', '来了？茶还热着。充电器拿了，醋还没给我。', { voice: 'vox_trilogy_zhou_v2' }],
  ['fan', '大学那边有您讲课的照片，记得发。别只拍一排空椅子。'],
  ['zhou', '校外带教，偶尔去。没让我天天站讲台。'],
  ['director', '先把交接讲清楚。明天早班已经排好，您签完单子，今晚就别再看手机了。', { voice: 'vox_trilogy_director_v2' }],
  ['sys', '散场后，你陪老周回更衣室。他从柜门里揭下排班表，装进纸袋。', { bg: 'bg_office' }],
  ['zhou', '这个柜门得往上提一点。换锁没用，合页松。'],
  ['sys', '你接住那张写满改动的交接单。最下面是几年前登记整改的补充说明。'],
  ['zhou', '当年漏登记是我做的，说明夹在这儿。接班的人问起，你给他看。'],
  ['sys', '老周把钥匙放上桌。柜子空了，桌角剩下一张折过的纸。'],
  ['zhou', '日常保养写在上面了。最后那行你看了再走。', { giftTo: 'zhou' }],
], 'c5_pro_q', { bg: 'bg_retirement' })
ask('c5_pro_q', '纸条的最后一行写着：“早餐别总吃泡面。”你把它折好。', [
  { text: '「省院食堂好不好吃，等我回来告诉您。」', next: 'c5_pro_food' },
  { text: '「以后带学生，不许只让人自己想。」', next: 'c5_pro_student' },
], { bg: 'bg_office', sprite: portraits.zhou, image: 'item_zhou_note' })
steps.c5_pro_food = scene('zhou', '你先拍菜单。别只拍食堂门口。', { bg: 'bg_office', next: 'c5_pro_note_0' })
steps.c5_pro_student = scene('zhou', '我还能让他们自己搬椅子。', { bg: 'bg_office', next: 'c5_pro_note_0' })
chain('c5_pro_note', [
  ['sys', '纸上是设备交接联系人和保养要点。你收到老周的交接便笺。', { bg: 'bg_office', image: 'item_zhou_note', effect: { item: 'c5_zhou_note', flag: 'c5_zhou_departed', badge: 'c5_handover' } }],
  ['zhou', '明天谁接早班？'],
  ['me', '我出发。小吴接，他已经确认过了。'],
  ['sys', '老周点点头，把自己那只旧保温杯放进袋里。你关上柜门，陪他走到科室门口。'],
], 'c5_pro_receiving_0', { bg: 'bg_office' })
chain('c5_pro_receiving', [
  ['sys', '急诊护士领来一位穿旧外套的老人。检查申请和临时身份条码夹在一起，证件栏还等着补齐。', { bg: 'bg_corridor', sprite: portraits.elder }],
  ['elder', '周医生在吗？我没带齐证件，以前有人说，这时候来能找到他。'],
  ['me', '今天我接您。急诊这份申请已经有号，我先帮您对上。', { sprite2: portraits.elder }],
  ['sys', '你核对临时身份与申请号，把检查接进同一条记录。小唐拨通救助联系人的分机，值班医师过来接手评估。'],
  ['tang', '报告出来由今晚的医师解释。后补材料的联系人也写好了，明天换班照着这个找。', { sprite2: portraits.elder }],
  ['elder', '那我先坐这儿。这个号别替我弄丢，我自己总记不住。'],
  ['sys', '你把编号写在他能看清的地方，扶他坐下。老周在门边站着，手里握着旧杯子；那张申请已经到了你们手中。', { image: 'cg_c5_zhou_handoff_v2', closeup: true }],
  ['zhou', '我走了啊。醋的事，下回再找你们。'],
  ['sys', '老周把旧杯子往袋底放稳，推门出去。小唐继续跟电话那头确认接人的时间，你把当班联络表递给值班医师。'],
], 'c5_arrival_0', { bg: 'bg_corridor' })
chain('c5_arrival', [
  ['sys', '第二天清晨，你拖着箱子出门。小唐把昨晚没吃完的饺子装好，说路上别再买一碗泡面。车窗外的县城退成一排屋顶，老周的便笺夹在进修通知里。'],
  ['sys', '午后抵达省院。门诊大厅比县里大得多，你绕错一次楼，才在核医学中心的路牌下找到报到处。', { bg: 'bg_pet_center_day_v2' }],
  ['sys', '登记、领进修证、确认宿舍和带教安排。工作人员在地图上圈出三个地方：中心、宿舍、食堂；你把食堂旁边的关门时间也抄了下来。'],
  ['sys', '傍晚，你把箱子送进宿舍。床头灯亮着，窗外开始暗下来。室友留了一张纸：“热水往左拧，右边只是看起来像热水。”', { bg: 'bg_pet_dorm' }],
  ['sys', '简单安顿后，你按约回到中心。先跟着走了一遍候诊区、摄取区和控制台，把门禁范围、设备交接与求助分机认清；行李留在宿舍，随身只带本子。', { bg: 'bg_pet_center' }],
  ['sys', '18:10，晚间交接开始。进修证挂好，你来到打卡机前，省院的第一班从这里算起。'],
], 'c5_s1_0', { bg: 'bg_corridor' })

// 第1班：新地方、示踪剂订单、设备原理。资料间两件独立事项可免费返回。
chain('c5_s1', [
  ['sys', '11月3日，18:10。带教医师顾老师把五次跟班安排翻给你看：下午门诊、晚间交接，还有结业前的复盘。'],
  ['gu', '到了？我是顾老师。今晚先跟我认控制台，明后天再看病人。', { voice: 'vox_c5_gu_v2' }],
  ['ning', '我叫宁宁。你要找杯子去休息室，找药别去休息室。我们真有新人走错。', { voice: 'vox_c5_ning_v2' }],
  ['me', '我先问个不丢人的：今晚先从哪儿干起？'],
  ['gu', '先收今天的检查，核质控，再排明天的药。那边电话要是响了，转诊的问题叫我来接。'],
  ['sys', '你把本子放在键盘旁。桌上两张送药单，一张写计划时间，一张写实际校准时间；宁宁端来两只杯子，顺手把纸往远处推了推。'],
], 'c5_s1_hub', { bg: 'bg_pet_center' })
ask('c5_s1_hub', '第一批检查已交接。顾老师去核报告，你有一小段空档。', [
  { text: '资料间：看看两份独立交接资料（⚡-1）', next: 'c5_s1_archive', cond: { notFlag: 'c5_archive_entered', ap: 1 }, effect: { ap: -1, flag: 'c5_archive_entered' }, disabledReason: '行动力不足；可以喝咖啡再来。' },
  { text: '返回资料间，接着看尚未看完的资料', next: 'c5_s1_archive', cond: { flag: 'c5_archive_entered', notFlag: 'c5_schedule_seen', notFlag2: 'c5_safety_seen' } },
  { text: '资料间：还有一份安全说明', next: 'c5_s1_archive', cond: { flag: 'c5_schedule_seen', notFlag: 'c5_safety_seen' } },
  { text: '资料间：还有一份配送时间表', next: 'c5_s1_archive', cond: { flag: 'c5_safety_seen', notFlag: 'c5_schedule_seen' } },
  detour('休息室：宁宁正在找微波炉旋钮', 'c5_s1_ning_0', 'c5_s1_ning_done'),
  detour('宿舍走廊：问清夜里那串脚步声', 'c5_s1_hall_0', 'c5_s1_hall_done'),
  { text: '回控制台，核对订单', next: 'c5_s1_order_0' },
], { bg: 'bg_pet_center' })
ask('c5_s1_archive', '资料室。一本配送时间表和一张放射性药物区域说明，各压着一枚回形针。', [
  { text: '看配送时间表', next: 'c5_s1_schedule', cond: { notFlag: 'c5_schedule_seen' } },
  { text: '看工作区域说明', next: 'c5_s1_safety', cond: { notFlag: 'c5_safety_seen' } },
  { text: '先离开，稍后可以免费回来', next: 'c5_s1_hub' },
], { bg: 'bg_pet_control' })
steps.c5_s1_schedule = scene('sys', '时间表里，“预计到院”和“实际校准”分了两栏。你顺着箭头找到收货、测活度与注射的记录位置，在随身页上记下次日联系人。', { bg: 'bg_pet_control', card: 'c5_timing', effect: { flag: 'c5_schedule_seen' }, next: 'c5_s1_archive' })
steps.c5_s1_safety = scene('sys', '工作区说明把人员通道、患者等候与摄取区域分开标明。你对照刚才走过的路线，找到了培训确认处；进修证的挂绳还不能替你开每一道门。', { bg: 'bg_pet_center', card: 'c5_radiation', effect: { flag: 'c5_safety_seen' }, next: 'c5_s1_archive' })
chain('c5_s1_ning', [
  ['ning', '这饭盒转半圈就停，我还以为它只热右边。', { giftTo: 'ning' }],
  ['sys', '你检查托盘，发现下面卡着一个饭盒盖。没有拆机，拿掉盖子后转盘恢复。'],
  ['ning', '行，今晚不用吃左右温差套餐了。你要是饿，冰箱上层那盒是空的，别高兴太早。', { effect: { flag: 'c5_s1_ning_done' } }],
], 'c5_s1_hub', { bg: 'bg_breakroom' })
chain('c5_s1_hall', [
  ['sys', '顾老师说交接还要等一会儿，你回近处的宿舍取充电线。门外，脚步走到楼梯口就停，隔一会儿又从头响起。'],
  ['sys', '你开门看。保洁阿姨拖着带水的长拖把，轮子遇到松动地砖就顿一下。'],
  ['sys', '她指了指地上的维修标记：“明天换。”你拿好线回中心，在宿舍群里说了声不用担心。', { effect: { flag: 'c5_s1_hall_done' } }],
], 'c5_s1_hub', { bg: 'bg_pet_dorm' })
chain('c5_s1_order', [
  ['ning', '明早那位患者改乘后一班高铁，到院要晚了。药房的配送计划已经排好，这张时间表怎么改？'],
  ['me', '东西还没用，放着应该也会变少。'],
  ['gu', '氟-18一直在衰变，半衰期约110分钟。看一下这个订单教学副本。', { card: 'c5_half_life' }],
], 'c5_s1_decay', { bg: 'bg_pet_control' })
steps.c5_s1_decay = scene('gu', '把时间往后移动。盯住同一份药的剩余活度，别换成另一份。', { bg: 'bg_pet_control', tool: { kind: 'pet', task: 'decay', title: '这一份药，还剩多少？', prompt: '在同一校准起点上比较现在、110分钟后与220分钟后。', help: '一个半衰期剩约一半，两个剩约四分之一。实际用药由中心核对。', next: 'c5_s1_decay_done' } })
steps.c5_s1_decay_done = scene('ning', '到院晚了，原计划就得再核。我先联系患者和药房，问清新的时间。', { bg: 'bg_pet_control', effect: { skill: 1, badge: 'c5_clock', flag: 'c5_decay_done' }, next: 'c5_s1_order_q' })
ask('c5_s1_order_q', '宁宁把新的到院时间填好，看着教学页：“这份药少了一半，机器的读数也会刚好少一半吗？”', [
  { text: '先把同一份药的起点与等待时间圈出来，再看计数', next: 'c5_s1_order_safe' },
  { text: '请顾老师说说“活度”和“机器数到多少”差在哪儿', next: 'c5_s1_order_help' },
], { bg: 'bg_pet_control', sprite: portraits.gu })
steps.c5_s1_order_safe = scene('gu', '起点先对上。活度是单位时间内发生多少次衰变；机器还要看光子有没有到、接没接住。我们下一班再看它怎么数。', { bg: 'bg_pet_control', next: 'c5_s1_physics_0' })
steps.c5_s1_order_help = scene('gu', '活度是源的衰变速率，计数是机器接收到的事件。两者有关，探测效率、衰减和测量时间也得算在里面。', { bg: 'bg_pet_control', next: 'c5_s1_physics_0' })
chain('c5_s1_physics', [
  ['sys', '次日安排交好。顾老师打开一个发射源小模型，屏幕里的光子从目标内部向外走，和你熟悉的CT示意正好相反。', { card: 'c5_emission' }],
  ['me', 'CT从外面发射线看它剩多少。这里的源已经在身体里面了？'],
  ['gu', '对。核素标记在药物上，我们接收体内发出的光子，估计药物去了哪里。药物参与什么过程，也决定我们看什么。'],
  ['me', '所以半衰期是核素的事，摄取到哪里还跟药物有关。'],
  ['gu', '嗯。F-18常由回旋加速器生产，隔壁单光子室用的核素还有发生器这条来路。不是把每间房都添一根CT球管。', { card: 'c5_sources' }],
  ['sys', '宁宁把晚餐从微波炉里拿出来。你们把次日名单再念了一遍，姓名、时间、联系人都对上了。'],
], 'c5_s1_end', { bg: 'bg_pet_control' })
finish('c5_s1_end', '首班交接完成。你收到值班补贴150金币，回宿舍把空饭盒洗了。', 'c5_shift1_done')

// 第2班：一个老病人、一件技术问题；外渗来自已发生的质控记录，不新堆患者。
chain('c5_s2', [
  ['sys', '11月5日，15:10。下午门诊的窗帘拉开半扇，护士站借来一张小凳子，正好接住一袋从县里带来的旧片。'],
  ['qian', '我姓钱。袋子这么厚，里面可不全是片子，有一半是挂号单。', { voice: 'vox_c5_qian_v2' }],
  ['ning', '顾老师正在核资料，您先坐，今天的检查安排已经确认。'],
  ['sys', '老钱是肺癌术后复查患者。2025年的DR记录写着“与旧片相仿”；这次随访CT出现了需要进一步评估的新变化。'],
  ['qian', '以前稳定，我挺高兴。这次还没做，我就先把最坏的想了一遍。'],
], 'c5_s2_qian_q', { bg: 'bg_pet_center_day_v2' })
ask('c5_s2_qian_q', '他把装挂号单的那半边纸袋往你手边推了推。', [
  { text: '帮他按日期整理，留出本次资料', next: 'c5_s2_sort', effect: { flag: 'c5_qian_sorted' } },
  { text: '先问他最担心哪一件，再一起核对旧资料', next: 'c5_s2_worry' },
], { bg: 'bg_pet_center_day_v2', sprite: portraits.qian })
steps.c5_s2_sort = scene('qian', '这个“2025”跟“2028”，我老看成一样。别把旧的丢了，我得拿回去。', { bg: 'bg_pet_center_day_v2', next: 'c5_s2_pre_0' })
steps.c5_s2_worry = scene('qian', '担心他们叫我又住院。地里的菜都浇好了，就是没跟老伴说。', { bg: 'bg_pet_center_day_v2', next: 'c5_s2_pre_0' })
chain('c5_s2_pre', [
  ['gu', '先看看这个新变化究竟是什么。PET看摄取，CT帮我们找位置；查之前，谁也别先替结果写“复发”。'],
  ['sys', '完成准备核对和注射后，宁宁领老钱去安静的摄取区。窗外还有阳光，椅背上搭着他的外套，你留在控制台。', { bg: 'bg_pet_uptake_day_v2' }],
  ['qian', '那我不聊天了？我嘴闲不下来。'],
  ['ning', '现在先安静休息。等出来，您再给我讲菜怎么浇。'],
  ['sys', '患者休息期间，控制台接到次日检查的电话；顾老师去回复，你有一段不打扰患者的空档。', { bg: 'bg_pet_control_day_v2' }],
], 'c5_s2_hub', { bg: 'bg_pet_center_day_v2' })
ask('c5_s2_hub', '检查准备按计划进行。你可以完成一件短交接，或留下看片。', [
  detour('控制台旁：核对宁宁的外渗质控记录', 'c5_s2_leak_0', 'c5_leak_seen'),
  detour('休息室：顾老师的“消失的晚饭”', 'c5_s2_food_0', 'c5_s2_food_done'),
  detour('资料角：翻旧片对照的日期索引', 'c5_s2_index_0', 'c5_s2_index_done'),
  { text: '用省院明信片，给老周写两句', next: 'c5_s2_postcard_0', cond: { item: 'c5_postcard', notFlag: 'c5_postcard_used' }, effect: { loseItem: 'c5_postcard', flag: 'c5_postcard_used' } },
  { text: '回控制台，看看探测器怎样配对，再准备采集', next: 'c5_s2_pair_intro_0' },
], { bg: 'bg_pet_control_day_v2' })
chain('c5_s2_leak', [
  ['ning', '这是前天一次注射外渗的记录，已经处理并报告了。我在补齐注射前后时间。'],
  ['me', '局部剩了不少，按原来的注射量算SUV，会不会失真？'],
  ['gu', '会。进到体内多少、局部留下多少，都影响这次结果。把实际情况补在原记录旁，我来判断还能怎么用。', { card: 'c5_extravasation' }],
  ['sys', '宁宁找到注射后的实际时间，你把补充说明夹在原页后面。两个时间都能看见，原数据也留着。', { effect: { flag: 'c5_leak_seen', badge: 'c5_true_record' } }],
], 'c5_s2_hub', { bg: 'bg_pet_control_day_v2' })
chain('c5_s2_pair_intro', [
  ['sys', '老钱还在安静休息。顾老师打开同一发射源模型，环上两处接连亮起，却没有直接出现一个坐标点。'],
  ['me', '两个探测器都亮了，怎么还只连出一条线？'],
  ['gu', 'β+衰变产生正电子，它与电子湮灭后常有一对约511keV的光子。探测器接到两端，只能先知道事件在这条响应线上。', { card: 'c5_annihilation' }],
  ['ning', '两盏灯凑一块儿，也可能各亮各的。你看看机器怎么配。'],
], 'c5_s2_coincidence', { bg: 'bg_pet_control_day_v2' })
steps.c5_s2_coincidence = scene('gu', '先比较真、散射和随机这三组事件，再改时间窗。跟着光子到两端，看看连出的线又经过哪里。', { bg: 'bg_pet_control_day_v2', tool: { kind: 'pet', task: 'coincidence', title: '这两端，真是同一对吗？', prompt: '切换三类事件示例，追踪飞行路径与响应线；再调2–12ns的示意时间窗，看配对怎样被接受或拒绝。', help: '同次湮灭且未散射可给出真符合；散射改变飞行方向，不同湮灭的光子也可能凑成随机符合。这里的时间窗用于比较模型事件，不是临床设备的设置指令。', next: 'c5_s2_pair_done' } })
steps.c5_s2_pair_done = scene('me', '现在看得出，线不一定穿过原来的小源。多收一对，也可能多收一条错的线。', { bg: 'bg_pet_control_day_v2', card: 'c5_coincidence', effect: { skill: 1, badge: 'c5_pair_line', flag: 'c5_pair_seen' }, next: 'c5_s2_acquire' })
chain('c5_s2_food', [
  ['gu', '我的饭盒在哪儿？刚才明明写了“顾”。', { giftTo: 'gu' }],
  ['ning', '您写的是“咕”。大家以为是保温盒发出的声音，放洗碗池了。'],
  ['gu', '我明天打印一个标签。今天先把饭救回来，别把“咕”洗掉了。', { effect: { flag: 'c5_s2_food_done' } }],
], 'c5_s2_hub', { bg: 'bg_breakroom' })
chain('c5_s2_index', [
  ['sys', '日期索引把术前、术后与本次分开。旧片显示稳定，只证明当时那次检查的情况。'],
  ['me', '难怪老钱老看混。隔了好几年，袋子里还挤着一块儿。'],
  ['sys', '你夹好对照目录，顾老师接手核对完整序列。', { effect: { flag: 'c5_s2_index_done' } }],
], 'c5_s2_hub', { bg: 'bg_pet_control_day_v2' })
steps.c5_s2_acquire = scene('sys', '老钱按呼叫走进检查室，在检查床上躺好。宁宁从窗口确认他的位置，采集床缓缓进入探测器环。', { bg: 'bg_pet_control_day_v2', scan: { kind: 'pet', label: '老钱｜本次PET/CT采集', durationMs: 3000, sound: 'trilogy_pet_scan_v2' }, next: 'c5_s2_scan_0' })
chain('c5_s2_scan', [
  ['sys', '采集结束，老钱坐起来先找自己的鞋。宁宁送他去候诊区，你先看CT、再打开同次PET与融合视图。'],
  ['me', '这里的亮点，叠起来像挨着肺底。只是看一张融合图，我不敢认位置。'],
  ['gu', '先比一比两个坐标。呼吸状态不一样，胸腹交界处容易错位。'],
], 'c5_s2_fusion', { bg: 'bg_pet_control_day_v2' })
steps.c5_s2_fusion = scene('gu', '用同一处轮廓比。你挪一下叠层，看亮点会被算到哪里。', { bg: 'bg_pet_control_day_v2', tool: { kind: 'pet', task: 'fusion', title: '亮点落在哪一层？', prompt: '比较PET与CT的同一处轮廓，观察错位怎样改变亮点的归属。', image: 'pet_fusion', reference: 'pet_fusion_ct', help: '结合多平面与原图确认定位；融合显示不是重新扫描，也不能凭颜色定癌。', next: 'c5_s2_fusion_done' } })
steps.c5_s2_fusion_done = scene('gu', '看出来了，胸腹交界差了一点。挪动只是帮你看偏差，真实呼吸造成的问题还要回原图复核。', { bg: 'bg_pet_control_day_v2', card: 'c5_fusion', effect: { skill: 1, badge: 'c5_same_place', flag: 'c5_fusion_done' }, next: 'c5_s2_image_q' })
ask('c5_s2_image_q', '顾老师打开老钱的本次图像。新变化处有摄取，画面没有给出一个现成答案。', [
  { text: '先结合CT形态、前片、病史，请顾老师评估', next: 'c5_s2_context' },
  { text: '问顾老师：“发亮一定是癌吗？”', next: 'c5_s2_bright' },
], { bg: 'bg_pet_control_day_v2', image: 'pet_lung', imageLabel: '老钱｜本次PET/CT同次对照', sprite: portraits.gu })
steps.c5_s2_context = scene('gu', '你把术后那次打开，我们一起比。先看清这回新在哪里，再谈它可能是什么。', { bg: 'bg_pet_control_day_v2', next: 'c5_s2_result_0' })
steps.c5_s2_bright = scene('gu', '不是。炎症、生理活动也会有摄取；有些病灶摄取又并不高。', { bg: 'bg_pet_control_day_v2', next: 'c5_s2_result_0' })
chain('c5_s2_result', [
  ['gu', '老钱，这次有需要继续查的地方，还不能直接说是什么。我把建议写进报告，跟转诊医师联系，下一步由他和您约。', { sprite2: portraits.qian, card: 'c5_uptake' }],
  ['qian', '那我回去该找谁？别让我拿着这袋子再猜了。'],
  ['ning', '已约转诊医师回复。时间、电话、需要带的东西写在这张单上。'],
  ['qian', '好。这个我看得懂。菜我还能浇，检查我也接着做。'],
  ['sys', '你和老钱把单上的时间、电话读了一遍。他把这张放到纸袋最前面，走前往你手里塞了两包自家留的菜种。', { image: 'item_qian_seeds', effect: { heart: 1, item: 'c5_qian_seeds', flag: 'c5_qian_gift', badge: 'c5_followup' } }],
  ['qian', '不是稀罕东西。窗台上能种，别拿热水泡。'],
], 'c5_s2_evening_0', { bg: 'bg_pet_center_day_v2' })
chain('c5_s2_evening', [
  ['sys', '老钱走后，候诊区慢慢空了。你们把最后一份报告与次日名单交好，外面的窗户已经映出室内的灯。'],
  ['ning', '菜种收稳了？我怕你当调料撒面里。'],
  ['me', '刚才确实看了一眼背面的做法。没有。'],
], 'c5_s2_end', { bg: 'bg_pet_center' })
finish('c5_s2_end', '第二班交接完成，值班补贴150金币。你把菜种收进干燥的抽屉，没有拆开当零食。', 'c5_shift2_done')

// 第3班：方向选择→闪烁与定位→多角度发射投影→同源重建。
chain('c5_s3', [
  ['sys', '11月8日，15:20。今天跟单光子室学习。顾老师把一幅重叠的发射投影留在工作站旁，临床医师已在复核，你先看它为什么会叠到一起。'],
  ['gu', '这里也是接收体内发出的光子。γ相机不用PET那样配一对，先得知道这一束从哪个方向来。'],
  ['ning', '教具拿来了。只有两个小目标，别找第三个，我擦它的时候已经数过了。'],
  ['me', '我先猜，它俩要是前后挤在一起，一个方向看就会重叠。'],
  ['sys', '你把同一个双目标模体打开。光子从两处向外发散，屏幕前方摆着有小孔的准直器；旁边是一格格还没累计的探测位置。'],
], 'c5_s3_hub', { bg: 'bg_pet_control_day_v2' })
ask('c5_s3_hub', '单光子室交接完，你和顾老师回到工作站。操作前可以歇一小会儿。', [
  detour('资料角：看看“母核”和“子核”那两张标签', 'c5_s3_number_0', 'c5_number_seen'),
  detour('休息室：宁宁把教具盒和饭盒摆反了', 'c5_s3_ning_0', 'c5_s3_ning_done'),
  { text: '看准直器怎样留下方向', next: 'c5_s3_collimator' },
], { bg: 'bg_pet_control_day_v2' })
chain('c5_s3_number', [
  ['sys', '一张标签写母核，另一张写需要分离的短寿命子核。两者的半衰期不同，发生器把产生的子核收集出来使用。'],
  ['me', '所以这不是一瓶药少了，再给它兑回原来的浓度。'],
  ['gu', '对，是母核不断衰变生成子核，再把所需子核分离。配好的药又是下一步，名字别揉成一个。', { card: 'c5_sources', effect: { flag: 'c5_number_seen' } }],
], 'c5_s3_hub', { bg: 'bg_pet_control_day_v2' })
chain('c5_s3_ning', [
  ['ning', '别打开右边那盒。我把饺子带到工作站，教具倒放冰箱上了。', { giftTo: 'ning' }],
  ['me', '两个目标，还是两个饺子？'],
  ['ning', '饺子不止两个，放心。你拿左边，我去把饭救回来。', { effect: { flag: 'c5_s3_ning_done' } }],
], 'c5_s3_hub', { bg: 'bg_breakroom' })
steps.c5_s3_collimator = scene('gu', '改变孔的长度，看看斜着来的光子能不能过去。方向留下了多少，计数又留下了多少，盯住这两个变化。', { bg: 'bg_pet_control_day_v2', tool: { kind: 'pet', task: 'collimator', title: '孔后的光子来自哪里？', prompt: '只改孔长，追踪同一模体的接受方向、通过计数与两个目标的轮廓；接着看晶体、光电倍增与定位。', help: '在孔宽不变的模型里，加长孔会更严格地选择方向，也会损失部分计数。准直器几何影响灵敏度与分辨率，随后才进入闪烁、光电转换与定位链。', next: 'c5_s3_detector_0' } })
chain('c5_s3_detector', [
  ['me', '同一个源，孔长也会改变通过的方向和读数。刚才那一闪，后面怎么变成屏幕的一格？', { card: 'c5_collimator' }],
  ['gu', '晶体把γ光子的能量变成可见光，光电倍增管再把光转为电信号并放大，定位电路算它落在哪里。', { card: 'c5_gamma_chain' }],
  ['gu', '还会估计事件能量，用能量窗口筛掉一部分不合适的事件。最后是一格格累计，不是按一次快门就有完整图。'],
  ['sys', '你沿着准直器、晶体、光电转换与定位的次序看了一遍。接收链认清后，顾老师打开了相机另一个方向的投影。', { effect: { flag: 'c5_gamma_chain_seen' } }],
], 'c5_s3_spect_intro_0', { bg: 'bg_pet_control_day_v2' })
chain('c5_s3_spect_intro', [
  ['me', '换个方向看，刚才挤成一处的两个目标分开了。'],
  ['gu', 'γ相机一个方向得到发射投影。SPECT从多个角度收投影，再重建断层，才能把这种重叠拆开。'],
  ['ning', '那张临床投影交给医师看了。咱给这两个小目标多收几个方向，看看工作站手里多了什么。'],
], 'c5_s3_spect', { bg: 'bg_pet_control_day_v2' })
steps.c5_s3_spect = scene('gu', '给同一模体增加投影方向。计算模型在半圈内均匀取样，你看方向少和方向多时，正弦图与断层有什么变化。', { bg: 'bg_pet_control_day_v2', tool: { kind: 'pet', task: 'spect', title: '同两个目标，多看几个方向', prompt: '把半圈内均匀方向数从4增加到64，对照投影、正弦图和同源FBP断层；源与计数条件保持不变。', help: '每个方向给出一幅发射投影。模型把角度和探测位置组织成正弦图，再用滤波反投影估计分布。这里改变方向数量，不是把某个角度反复累计，也不是患者临床采集指令。', next: 'c5_s3_spect_done' } })
steps.c5_s3_spect_done = scene('me', '单幅投影里会挤在一起，换方向就有新的分开信息。断层是把这些测量重建出来的，不是把最亮那张放大。', { bg: 'bg_pet_control_day_v2', card: 'c5_spect', effect: { skill: 1, badge: 'c5_projection_turn', flag: 'c5_spect_seen' }, next: 'c5_s3_late_0' })
chain('c5_s3_late', [
  ['sys', '示范结束，你把教具装回左边的盒子。临床医师继续复核那份断层资料，宁宁把当班交接补好。'],
  ['sys', '傍晚，窗外的光收了。顾老师收到县院送来的旧项目回函；班内的成像工作已经完成，你可以留下看一眼，也可以先回去。', { bg: 'bg_pet_control' }],
], 'c5_s3_after_hub', { bg: 'bg_pet_control_day_v2' })
ask('c5_s3_after_hub', '收班前还有一小段空档。', [
  detour('休息室：看旧项目回函（可选旧线收尾）', 'c5_s3_meeting_0', 'c5_sms_resolved'),
  { text: '用省院明信片，给老周写两句', next: 'c5_s3_postcard_0', cond: { item: 'c5_postcard', notFlag: 'c5_postcard_used' }, effect: { loseItem: 'c5_postcard', flag: 'c5_postcard_used' } },
  { text: '收好教具，下班', next: 'c5_s3_end' },
], { bg: 'bg_pet_control' })
// 可选八句闭合旧线；资料处理由院方完成，玩家不参加整班核查会。
steps.c5_s3_meeting_0 = scene('sys', '院方已与接收方档案员对过原件。顾老师把回函摊开，小雷从远程窗口接入，你只留下看这几页。', { bg: 'bg_breakroom', next: 'c5_s3_records_4' })
steps.c5_s3_records_4 = scene('sys', '首版提案、导出批次、合作登记和付款凭据能相互对应：小雷先提出商业算法合作、整理院内样本并收过报酬，院里原授权未涵盖这个用途。', { bg: 'bg_pet_control', image: 'cg_c5_record_confrontation_v2', closeup: true, card: 'c5_data_source', effect: { flag: 'c5_lei_origin_verified', badge: 'c5_source' }, next: 'c5_s3_reveal_4' })
steps.c5_s3_reveal_4 = scene('sys', '后续商业用途与交付附件由韩经理签署。院方暂停相关权限和使用，保留原件，继续追溯此前接收的副本。', { bg: 'bg_pet_control', effect: { flag: 'c5_han_identified' }, next: 'c5_s3_reveal_5' })
steps.c5_s3_reveal_5 = scene('lei', '是我先提的，也收了钱。后来断网、留证都是真的，可我一直没讲前面那份合作。材料这次交齐了。', { bg: 'bg_pet_control', communication: 'call', phone: portraits.lei, sprite: '', effect: { flag: 'c5_lei_accounted' }, next: 'c5_s3_sms_0' })
steps.c5_s3_sms_0 = scene('sys', '旧短信号码、发送时间和厂家旧工作号登记也已对上。你们接通雯雯，确认那两句提醒。', { bg: 'bg_breakroom', communication: 'call', next: 'c5_s3_sms_1' })
steps.c5_s3_sms_1 = scene('wen', '喂，听得见吗？两条是我发的。看见同批样本换了用途，我怕回收盒子把本地回执也带走。两版附件我都交了。', { bg: 'bg_breakroom', communication: 'call', phone: portraits.wen, sprite: '', voice: 'vox_trilogy_wen_v2', next: 'c5_s3_sms_4' })
steps.c5_s3_sms_4 = scene('sys', '雯雯交出的附件与独立存档一致。县院盒子的厂家外网始终断着，本地原件仍留院；查的是断网前已外传的资料。', { bg: 'bg_breakroom', card: 'c5_offline', effect: { flag: 'c5_sms_resolved', badge: 'c5_old_message' }, next: 'c5_s3_sms_5' })
steps.c5_s3_sms_5 = scene('gu', '后面由核查人员接着做。饭盒也该找回来了，走吧。', { bg: 'bg_breakroom', effect: { flag: 'c5_source_checked' }, next: 'c5_s3_after_hub' })
finish('c5_s3_end', '第三班完成，值班补贴150金币。你从方向选择追到投影和断层，把两个小目标的教具收好。', 'c5_shift3_done')
// 已有中途档的旧资料节点只接入短收尾，不补造“已看完”旗标。
for (const id of ["c5_s3_lei_0","c5_s3_lei_1","c5_s3_lei_2","c5_s3_han_0","c5_s3_han_1","c5_s3_han_2","c5_s3_meeting_1","c5_s3_meeting_2","c5_s3_meeting_3","c5_s3_records_0","c5_s3_records_1","c5_s3_records_2","c5_s3_records_3","c5_s3_evidence_q","c5_s3_evidence","c5_s3_evidence_help","c5_s3_reveal_0","c5_s3_reveal_1","c5_s3_reveal_2","c5_s3_reveal_3","c5_s3_reveal_6","c5_s3_lei_q","c5_s3_lei_account","c5_s3_lei_both","c5_s3_sms_2","c5_s3_sms_3","c5_s3_sms_reason_0","c5_s3_sms_reason_1","c5_s3_sms_reason_2","c5_s3_sms_reason_3"]) {
  steps[id] = scene('sys', '这几页资料已经交由院方接续。顾老师把简要回函拿给你看。', { bg: 'bg_breakroom', next: 'c5_s3_meeting_0' })
}

// 第4班：先就诊，再查询旧记录；延迟显像属于同日医师安排。
chain('c5_s4', [
  ['sys', '11月11日，14:40。下午跟班前，你在中心接到许建平的电话。他按预约来到省院，县里医生告诉过他你正在这里进修。', { bg: 'bg_pet_control_day_v2', communication: 'call' }],
  ['xu', '县里医生告诉我，你在省院。我不是让你给我插队，就是想问清楚走哪扇门。', { communication: 'call', phone: portraits.xu, sprite: '' }],
  ['me', '按预约到核医学中心。我在交接后过来。您的旧资料都带上。'],
  ['sys', '你来到候诊区，叫号屏亮起“许建平”。他把名字写得很慢，每个字都写在格子中间。', { bg: 'bg_pet_center_day_v2' }],
  ['xu', '我带了旧片。许建平，退休前跑长途客车。以前白天赶车，夜里赶回来，字就没好好写。', { voice: 'vox_trilogy_mystery_v2' }],
  ['me', '退休以后呢？'],
  ['xu', '不赶车了。到了复诊那天还是早早醒，生怕自己又误了班车。'],
], 'c5_s4_hub', { bg: 'bg_pet_center_day_v2' })
ask('c5_s4_hub', '顾老师先做临床评估。患者尚未注射，你可以帮他处理一件与采集无关的事。', [
  detour('休息室：宁宁拿来一张手绘路线', 'c5_s4_map_0', 'c5_s4_map_done'),
  detour('控制台：与顾老师核对AI辅助范围', 'c5_s4_ai_0', 'c5_ai_seen'),
  { text: '回候诊区，继续本次检查', next: 'c5_s4_clinical_0' },
], { bg: 'bg_pet_center_day_v2' })
chain('c5_s4_father', [
  ['xu', '父亲叫许守义。1998年离家，县医院是我后来能找到的最后一站。'],
  ['sys', '他拿出证明材料。窗口工作人员核验身份关系与查询手续，接着核对旧转诊线索。'],
  ['xu', '我以前以为找着一张像他的片子，就算找着人了。现在知道不行。'],
  ['sys', '工作人员收好材料，在回执上写下联系人与两天后的回复时间。许建平摸了一遍口袋，确认这张没有跟旧片袋混在一起。', { effect: { flag: 'c5_father_applied' } }],
], 'c5_s4_hub', { bg: 'bg_pet_center_day_v2' })
chain('c5_s4_map', [
  ['ning', '外地人老在两栋楼之间绕。我画了这条线，你看看是不是漏了电梯。', { giftTo: 'ning' }],
  ['me', '没有漏电梯。漏了你自己藏饭盒的那间屋。'],
  ['ning', '那间不要画，患者真找进去，我的饺子就没了。', { effect: { flag: 'c5_s4_map_done' } }],
], 'c5_s4_hub', { bg: 'bg_breakroom' })
chain('c5_s4_ai', [
  ['gu', '工作站可以帮画区域、算摄取数值。这个自动结果还要复核位置和质量。'],
  ['me', '它要是给一个很干脆的“良性”，我们反而得看它依据什么。'],
  ['gu', '对。你看，它把边上的肌肉也圈进来了。先改位置，再和原图一起看。', { card: 'c5_ai', effect: { flag: 'c5_ai_seen' } }],
], 'c5_s4_hub', { bg: 'bg_pet_control_day_v2' })
chain('c5_s4_clinical', [
  ['gu', '许先生，县里的MRI和随访资料我看过了。左侧深颈部这组淋巴结样改变还在，性质不清楚，这次主要看这一处。'],
  ['xu', '不是每年换个机器就能查出来，是吧？'],
  ['gu', '不是每年都需要换。以前查的是当时的问题；这回左颈有持续的改变，我们顺着它往下看。'],
  ['sys', '顾老师确认方案。准备和注射完成后，许建平在摄取区安静休息，把两只手放在外套上。你回控制台等采集安排。', { bg: 'bg_pet_uptake_day_v2', next: 'c5_s4_acquire' }],
  ['me', '左颈这一处摄取不特别高，CT的轮廓也还不能定性。', { image: 'pet_neck', bg: 'bg_pet_control_day_v2', imageLabel: '许建平｜本次颈部PET/CT对照' }],
  ['gu', '嗯，数值只能帮忙。它受采集时间、实际活度这些条件影响；这组改变目前还不能下确定结论。', { card: 'c5_suv' }],
], 'c5_s4_gray_q', { bg: 'bg_pet_center_day_v2' })
steps.c5_s4_acquire = scene('sys', '到点后，宁宁领许建平走进检查室。他躺好，隔着窗口抬了一下手；采集床进入探测器环，你看着本次采集进度开始走动。', { bg: 'bg_pet_control_day_v2', scan: { kind: 'pet', label: '许建平｜本次PET/CT采集', durationMs: 3000, sound: 'trilogy_pet_scan_v2' }, next: 'c5_s4_attenuation_0' })
chain('c5_s4_attenuation', [
  ['sys', '采集结束。你在工作站看到同次CT和PET：一份给出结构，一份给出摄取分布，光子从体内走到探测器的路程还没有凭空消失。'],
  ['me', '深处的光子会被挡掉一些。只按外面接到了多少去画，深处的源就可能显得偏少。'],
  ['gu', '对，光子会衰减，也会散射。PET/CT用CT信息做衰减校正，还帮助定位；两种图错位时，校正和融合都要复核。', { card: 'c5_attenuation' }],
], 'c5_s4_clinical_4', { bg: 'bg_pet_control_day_v2' })
ask('c5_s4_gray_q', '许建平看着本次图像问：“数值不高，是不是就不用再查了？”', [
  { text: '「不能只看这个数，让顾老师结合结构和前片解释。」', next: 'c5_s4_gray_honest' },
  { text: '「您最怕听到哪一句？我们先把问题说清。」', next: 'c5_s4_gray_listen' },
], { bg: 'bg_pet_center_day_v2', sprite: portraits.xu })
steps.c5_s4_gray_honest = scene('xu', '好。我刚才看见颜色不亮，就想赶紧回去。这回得把话听全。', { bg: 'bg_pet_center_day_v2', next: 'c5_s4_delay_0' })
steps.c5_s4_gray_listen = scene('xu', '怕又说“再看看”，我就不知道下一趟什么时候来。可这次我也不能假装不查。', { bg: 'bg_pet_center_day_v2', next: 'c5_s4_delay_0' })
chain('c5_s4_delay', [
  ['gu', '根据这次情况，我安排同日的局部延迟显像。先解释清楚：补看了，也可能仍没有确定答案。'],
  ['sys', '许建平继续等候。傍晚，安排的局部延迟采集完成，窗外也暗了。顾老师对照同一处改变，摄取变化不大。', { bg: 'bg_pet_control', image: 'pet_neck', imageLabel: '许建平｜同日局部延迟显像，未重新注射' }],
  ['gu', '炎性改变和某些低摄取病灶都还需要结合临床。可以讨论取样等进一步评估，也要考虑位置和您的情况。', { card: 'c5_delayed' }],
  ['xu', '取样我得想想。今天先把复诊约好，别因为我犹豫，后面的也没了。', { bg: 'bg_pet_center' }],
  ['gu', '好。今天先把意见、联络方式和复诊安排写清，您有新症状及时联系。'],
  ['sys', '许建平把复诊单收好，自己念了一遍联系时间。顾老师回到工作站，把本次条件与技术质量一并补到报告里。'],
], 'c5_s4_record_guard', { bg: 'bg_pet_center_day_v2' })
steps.c5_s4_record_guard = scene('sys', '许建平把复诊提醒存进手机。宁宁帮他把字体调大一点，他终于不用举到眼前找那一行。', { bg: 'bg_pet_center', next: 'c5_s4_wait_0' })
chain('c5_s4_wait', [
  ['xu', '以前我跑车，等着发车还挺坐得住。今天这一会儿，比开几站路都长。'],
  ['me', '后面的联系时间已经约好。您要是没接到电话，就照这张单去找负责医师。'],
  ['xu', '嗯。先去吃点东西，不然我又要问为什么饿得慌。'],
  ['sys', '你送他到电梯口。今天看的摄取与结构是两种信息，结果仍需要继续评估；许建平把自己的复诊单收进衣袋。', { effect: { badge: 'c5_two_pockets', flag: 'c5_xu_exam_done' } }],
], 'c5_s4_end', { bg: 'bg_pet_center' })
finish('c5_s4_end', '第四班交接完成，值班补贴150金币。初次与延迟采集的时间分别写好，你把摄取、结构与校正条件接在了同一个问题上。', 'c5_shift4_done')

// 第5班：同源计数涨落与重建；把观察留给接班的新同事。
chain('c5_s5', [
  ['sys', '11月14日，16:20。最后一次跟班从下午开始。你已经能不看路标找到更衣室，进门前还顺手替下一批进修生扶正了指示牌。'],
  ['gu', '最后给你看同一小源的几次计数。条件没改，这几个数却没完全相同。'],
  ['me', '第一回少了一点，第二回又多回来。我刚才差点去找设置哪里变了。'],
  ['ning', '计时键是我按的，没多按。今天先放过我，看看光子自己怎么来。'],
  ['sys', '顾老师打开第三班用过的同一个双目标模体。发射分布固定，工作站把累计计数和重建结果并排摆出来。'],
], 'c5_s5_hub', { bg: 'bg_pet_control_day_v2' })
ask('c5_s5_hub', '最后一班的计数比较已经准备好。开始前还有一段空档。', [
  detour('休息室：和顾老师整理转诊联系人', 'c5_s5_contacts_0', 'c5_contacts_done'),
  detour('走廊：宁宁教你认采集结束的提示', 'c5_s5_buzzer_0', 'c5_buzzer_done'),
  detour('窗口旁：给老钱的回复安排回访', 'c5_s5_qian_0', 'c5_qian_followed'),
  { text: '用省院明信片，给老周写两句', next: 'c5_s5_postcard_0', cond: { item: 'c5_postcard', notFlag: 'c5_postcard_used' }, effect: { loseItem: 'c5_postcard', flag: 'c5_postcard_used' } },
  { text: '拿育苗小盆，向老钱问问这两包菜种', next: 'c5_seed_pot_0', cond: { item: 'c5_seed_pot', flag: 'c5_qian_gift', notFlag: 'c5_seed_pot_used' }, effect: { loseItem: 'c5_seed_pot', flag: 'c5_seed_pot_used' } },
  { text: '回工作站，累计同一模体的计数', next: 'c5_s5_noise_0' },
], { bg: 'bg_pet_center_day_v2' })
chain('c5_s5_contacts', [
  ['gu', '这份表里，县院联系人不用都填你。你休假了，难道全院检查跟着休假？', { giftTo: 'gu' }],
  ['me', '会诊回复由负责医师接，资料补充按岗位交接。我们科留替班联系人。'],
  ['gu', '这就能用。你休假时，我也知道该找谁了。', { card: 'c5_referral', effect: { flag: 'c5_contacts_done', badge: 'c5_connection' } }],
], 'c5_s5_hub', { bg: 'bg_breakroom' })
chain('c5_s5_buzzer', [
  ['sys', '走廊空着，突然传来两声短促提示。你向摄取区望去，那间屋没有患者。'],
  ['ning', '等一下，先看隔壁。交接定时器今天换了电池，它比我们俩准点。'],
  ['sys', '你绕过门边，看见小定时器还在闪。宁宁按掉提示，把它摆回交接表旁；摄取区那扇门始终没有打开。', { effect: { flag: 'c5_buzzer_done', badge: 'c5_sound_source' } }],
], 'c5_s5_hub', { bg: 'bg_pet_center_day_v2' })
chain('c5_s5_qian', [
  ['sys', '老钱按约定联系了转诊医师，后续评估正在进行。他从县里给护士站回了电话。', { communication: 'call' }],
  ['qian', '没有丢那张单子。老伴还拿透明袋给我套了一层。', { communication: 'call', phone: portraits.qian, sprite: '' }],
  ['me', '好的，后面的结果跟负责医师核对。菜种我收好了。'],
  ['qian', '你是收到的这个年轻人？那就等你回去再种。省里这会儿的窗台太冷。', { communication: 'call', phone: portraits.qian, sprite: '', effect: { flag: 'c5_qian_followed' } }],
], 'c5_s5_hub', { bg: 'bg_pet_control_day_v2' })
chain('c5_s5_noise', [
  ['me', '同一个目标，计数也会抖。那我怎么知道图上这一小团灰是结构，还是这一回恰好少接了几颗？'],
  ['gu', '先把同样条件的事件累计起来。衰变是随机的，计数会有泊松涨落；我们看相对涨落怎样影响同一幅重建。'],
], 'c5_s5_counting', { bg: 'bg_pet_control_day_v2' })
steps.c5_s5_counting = scene('gu', '每次加进下一段计数，最多二十段。模体、投影与重建条件保持不变，跟住那两处目标，再看周围的灰雾。', { bg: 'bg_pet_control_day_v2', tool: { kind: 'pet', task: 'counting', title: '多收一些，灰雾会怎样？', prompt: '逐段累计同一发射分布的有效事件，对照累计计数和重建噪声；不改变源，也不再次给患者采集。', help: '每段模拟同样条件下的泊松计数。累计更多有效事件可减小相对涨落；算法、运动与错位造成的问题不能全靠多计数解决。', next: 'c5_s5_counting_done' } })
steps.c5_s5_counting_done = scene('me', '目标没改，图却会被这一回接到的事件影响。看清计数条件再比较，比把每一团灰都当成新东西靠谱。', { bg: 'bg_pet_control_day_v2', card: 'c5_counting', effect: { skill: 1, badge: 'c5_counted_source', flag: 'c5_counting_seen' }, next: 'c5_s5_dusk_0' })
chain('c5_s5_dusk', [
  ['sys', '最后一批门诊离开，窗外的光慢慢收了。宁宁收好候诊区的小凳子，你把同源计数与重建的两版结果留在工作站。'],
  ['gu', '这两版留好，用的就是同一份投影。回县里给新人比一比，别光说哪个名字听着高级。'],
], 'c5_s5_report_q', { bg: 'bg_pet_control' })
// 商品只在持有且尚未用过时出现；消费、旗标与游标由共享运行时一起保存。
function postcard(prefix: string, next: string) {
  chain(prefix, [
    ['sys', '你把省院明信片摊在休息室桌上。正面是楼前那棵银杏，背面留着一大片空白，你把老周要的菜单照片调出来。', { image: 'item_c5_postcard_v2' }],
    ['me', '“食堂二楼的面还行。宁宁说不能只拍食堂门口，我连菜单拍好了。”这样写，您总不能再说我偷懒。'],
    ['sys', '你写好地址，把卡片交到护士站的代寄袋里，又拍了背面发给老周。手机亮了一下。', { communication: 'sms' }],
    ['zhou', '字写太满了，邮票贴哪儿？菜单那张重发，看不清汤多少钱。', { communication: 'sms', phone: portraits.zhou, sprite: '', effect: { badge: 'c5_postcard_reply' } }],
  ], next, { bg: 'bg_breakroom' })
}
postcard('c5_s2_postcard', 'c5_s2_hub')
postcard('c5_s3_postcard', 'c5_s3_after_hub')
postcard('c5_s5_postcard', 'c5_s5_hub')
chain('c5_seed_pot', [
  ['sys', '你把陶土小盆和底托摆在一起，配套的小袋土放在旁边。两包老钱送的菜种还没开封，你拍张照片，请他看看这个盆能不能用。', { image: 'item_c5_seedpot_v2' }],
  ['qian', '能用。盆底留着孔，别套个袋子把水全兜住。先装好，回县里放室内再下种。', { communication: 'call', phone: portraits.qian, sprite: '' }],
  ['me', '我刚才还真想拿袋子接着，怕弄脏窗台。'],
  ['qian', '下面那个托盘就是接水的。你这几天查片子，怎么把盆看成两件了？', { communication: 'call', phone: portraits.qian, sprite: '' }],
  ['sys', '你给小盆垫好底托，装上土，把菜种仍封在原袋里。行李又多了一件，回县后能直接摆上窗台。', { effect: { flag: 'c5_seed_pot_ready', badge: 'c5_window_seed' } }],
], 'c5_s5_hub', { bg: 'bg_breakroom' })
ask('c5_s5_report_q', '顾老师问：“回去带新人，你准备先让他看什么？”', [
  { text: '让他先看同一份投影的不同重建，再试着找差别', next: 'c5_s5_report_ok', effect: { flag: 'c5_report_complete' } },
  { text: '先把发射源、探测和重建接起来，留一个能亲手改变的地方', next: 'c5_s5_report_help', effect: { flag: 'c5_report_complete' } },
], { bg: 'bg_pet_control', sprite: portraits.gu })
steps.c5_s5_report_ok = scene('gu', '好，先保住“同一份”。他要是分不清，就陪他回投影那里看一眼。', { bg: 'bg_pet_control', card: 'c5_reconstruction', next: 'c5_s5_review_0' })
steps.c5_s5_report_help = scene('gu', '别一次把按钮都讲完。先让他改一个，再问图为什么跟着变。', { bg: 'bg_pet_control', card: 'c5_reconstruction', next: 'c5_s5_review_0' })
chain('c5_s5_review', [
  ['sys', '你把发射源、方向、符合、计数与重建的观察夹在一起。顾老师确认跟班记录，把教具盒的扣子按紧。'],
  ['ning', '别忘了自己的杯子。你们县的师父已经给我发过一次寻杯启事了。'],
  ['me', '他是怕我把杯子留这儿，人倒回去了。'],
  ['sys', '许建平的后续评估已经约好，老钱也按转诊医师的安排继续检查。你把设备状态交给下一班。'],
  ['gu', '明天晨会。设备上的问题会问，食堂几楼最好吃先不考。'],
  ['sys', '你收好末班记录，写下“11月15日：晨会”。'],
], 'c5_s5_end', { bg: 'bg_pet_center' })
finish('c5_s5_end', '五次进修值班完成，末班补贴150金币。你可以整理背包、翻书；准备好后再主动参加晨会。', 'c5_shift5_done')

// 晨会后回到日常与带教；父亲回函是可选的五句停留。
chain('c5_epi', [
  ['sys', '11月15日，晨会结束。你收好本子，宁宁把落在椅背上的外套拿来。两周里记下的那些小图，终于能连成一条成像过程。'],
  ['ning', '外套和饭盒都在。你要是只带走教具，我还得再追一趟。'],
  ['sys', '许建平来确认后续联系。他自己的进一步评估继续按顾老师和转诊医师的安排进行。'],
  ['xu', '复诊我约好了。窗口还把父亲那份回复交给我了，我想坐一会儿再走。'],
], 'c5_epi_pause', { bg: 'bg_pet_center_day_v2' })
ask('c5_epi_pause', '行李还在宿舍。你可以在这里坐一小会儿，再去收拾。', [
  { text: '陪许建平看看父亲的回函和那封旧信（可选）', next: 'c5_epi_4', cond: { notFlag: 'c5_father_resolved' } },
  { text: '收好本子，准备回县', next: 'c5_epi_after_0' },
], { bg: 'bg_pet_center_day_v2' })
steps.c5_epi_4 = scene('sys', '两院身份、转诊索引与留存记录已相互核验：许守义1998年转往外地就诊，2001年在当地病逝。交付的旧影像复制件属于他，姓名和登记号都能对应。', { bg: 'bg_pet_center_day_v2', image: 'item_father_film', imageLabel: '许守义｜经核验的旧影像复制件', next: 'c5_epi_5' })
steps.c5_epi_5 = scene('xu', '这次真是父亲那份。我以前总拿一张像他的片子猜，名字都没问清。', { bg: 'bg_pet_center_day_v2', next: 'c5_epi_6' })
steps.c5_epi_6 = scene('sys', '老工友家属回函和旧登记相符：许守义转院后暂住工友家，想把病看完再回禾川。2000年寄给儿子的信因迁址退回；2001年的后续记录与家属回函也已核对。', { bg: 'bg_pet_center_day_v2', next: 'c5_epi_father_0' })
steps.c5_epi_father_0 = scene('xu', '那年车队换宿舍，我也搬了家。吵完那一架，我出车走了，以为他会回来……他寄信还用着旧地址。复查我还来，找人的事不用再麻烦你了。', { bg: 'bg_pet_center_day_v2', next: 'c5_epi_father_6' })
steps.c5_epi_father_6 = scene('sys', '许建平把“这边看完就回去”那封信读了两遍，用手掌压平折痕。他把父亲的回复与自己的复诊单分开装好，起身去找电梯。', { bg: 'bg_pet_center_day_v2', image: 'cg_c5_father_letter_v2', closeup: true, effect: { flag: 'c5_father_resolved', badge: 'c5_found_name' }, next: 'c5_epi_after_0' })
// 旧尾声游标可回到短停留，不靠恢复旧游标补造阅读或奖励。
for (const id of ["c5_epi_7","c5_epi_8","c5_epi_9","c5_epi_father_1","c5_epi_father_2","c5_epi_father_3","c5_epi_father_4","c5_epi_father_5","c5_epi_xu_q","c5_epi_november","c5_epi_address"]) {
  steps[id] = scene('sys', '许建平收好自己的复诊单，父亲的回复仍放在桌边。你在旁边坐下。', { bg: 'bg_pet_center_day_v2', next: 'c5_epi_pause' })
}
chain('c5_epi_after', [
  ['sys', '许建平的后续评估继续按约进行。你收起本子，去和顾老师、宁宁道别。'],
  ['gu', '带教记录给你，书签也拿一张。宁宁画的那个探测器环，她坚持说比我画得圆。', { image: 'item_pet_bookmark', effect: { item: 'c5_pet_bookmark', flag: 'c5_gu_gift' } }],
  ['sys', '旧项目回函又补了一句：小雷的合作与收款、韩经理的后续交付继续分别核查，相关权限和使用仍暂停；旧终端断网与留证的事实都保留。', { skipUnlessFlag: 'c5_sms_resolved', next: 'c5_epi_after_5' }],
  ['sys', '小雷后来的断网、留证也列在材料中。核查人员继续处理，原件仍留在院里。', { skipUnlessFlag: 'c5_sms_resolved' }],
  ['sys', '雯雯提交的两版附件已留存，旧副本继续追溯。你收好自己的本子。', { skipUnlessFlag: 'c5_sms_resolved' }],
  ['sys', '行李箱合上。你把观察本、老周的便笺与菜种放在不同的夹层。两周进修结束了。'],
  ['sys', '回县后的一个晚上，老周来电。电话那边有学生搬椅子的声音。', { bg: 'bg_office', communication: 'call' }],
  ['zhou', '省院的饭怎么样？', { communication: 'call', phone: portraits.zhou, sprite: '' }],
  ['me', '不错。宁宁说您的寻杯启事写得特别详细。'],
  ['zhou', '学生问我以前为什么不出去。我说想留，他们还在等第二段。', { communication: 'call', phone: portraits.zhou, sprite: '' }],
  ['me', '然后呢？'],
  ['zhou', '然后让他们搬椅子。你今晚带谁？', { communication: 'call', phone: portraits.zhou, sprite: '' }],
  ['sys', '县院走廊，新来的进修技师推开控制室门。你接过值班表，让他先看看设备状态。', { bg: 'bg_ctcontrol_ready' }],
  ['trainee', '老师，这里两个“重建”，是不是同一件事？'],
], 'c5_epi_teach_q', { bg: 'bg_pet_center_day_v2' })
ask('c5_epi_teach_q', '你刚想一次讲完，想起自己第一回坐在这里时，根本不知道该看哪一处。', [
  { text: '「先打开同次断层。你看看那个三维按钮会改变什么。」', next: 'c5_epi_teach_try' },
  { text: '「我陪你看。先说你觉得哪一步重新照了人。」', next: 'c5_epi_teach_talk' },
], { bg: 'bg_ctcontrol_ready', sprite: portraits.trainee })
steps.c5_epi_teach_try = scene('trainee', '哦，断层还是那一份。那我点一下，您帮我看着。', { bg: 'bg_ctcontrol_ready', next: 'c5_done' })
steps.c5_epi_teach_talk = scene('trainee', '我先猜，工作站这一步应该没有。说错了您再提醒我。', { bg: 'bg_ctcontrol_ready', next: 'c5_done' })
steps.c5_done = scene('sys', '打卡机咔哒一声。你把备用椅子拉到身边，让新人坐下。今晚的正式报告仍由值班医师签发，而你开始陪另一个人学着值班。', { bg: 'bg_ctcontrol_ready', effect: { flag: 'c5_done', badge: 'c5_next_shift' }, end: true })

const badges: TrilogyChapter['badges'] = {
  c5_handover: { name: '钥匙交回', icon: '🗝️', desc: '见证老周正式离岗，收好交接便笺' },
  c5_clock: { name: '赶不上钟的药', icon: '⌛', desc: '完成氟-18半衰期教学观察' },
  c5_true_record: { name: '原记录也留着', icon: '📝', desc: '保留外渗原记录与补充说明' },
  c5_same_place: { name: '同一个位置', icon: '🧩', desc: '完成PET/CT融合位置观察' },
  c5_followup: { name: '下一步找谁', icon: '📞', desc: '把老钱的后续联系安排交到手里' },
  c5_source: { name: '凭编号说话', icon: '🔎', desc: '主动核对数据来源、编号和授权用途' },
  c5_old_message: { name: '来信的人', icon: '✉️', desc: '经核验确认匿名提醒的发信人' },
  c5_two_pockets: { name: '两种信息', icon: '🧩', desc: '完成许建平本次检查，区分摄取与结构信息' },
  c5_sound_source: { name: '提示从哪儿来', icon: '🔔', desc: '核对空走廊提示声的本地定时器来源' },
  c5_connection: { name: '能接上人', icon: '🤝', desc: '主动落实转诊、会诊与回复责任人' },
  c5_found_name: { name: '片上有名字', icon: '🎞️', desc: '领取真正属于许守义的核验旧影像' },
  c5_next_shift: { name: '下一位夜班', icon: '🌙', desc: '完成第五章真正尾声，开始带新人' },
  c5_postcard_reply: { name: '邮票贴哪儿', icon: '📮', desc: '用省院明信片给老周写信，收到他的菜单追问' },
  c5_window_seed: { name: '带回去种', icon: '🌱', desc: '准备育苗小盆，向老钱问清菜种怎么种' },
  c5_pair_line: { name: '先是一条线', icon: '↔️', desc: '观察时间窗与符合配对怎样产生响应线' },
  c5_projection_turn: { name: '转过去才分开', icon: '🔄', desc: '用同一模体追踪SPECT多角度投影、正弦图与断层' },
  c5_counted_source: { name: '同样也会抖', icon: '📊', desc: '累计同一发射分布，观察计数涨落与重建噪声' },
}
const cards: TrilogyChapter['cards'] = {
  c5_timing: { title: '一份药的三个时间', body: '校准、注射、采集是不同时间点。记录实际发生时间，才能核对衰变与定量信息。' },
  c5_radiation: { title: '进入哪个区域', body: '核医学涉及放射性药物、工作人员和患者区域安排；按中心培训和规定使用。进修证本身不是操作许可。' },
  c5_half_life: { title: '氟-18与110分钟', body: '氟-18的物理半衰期约110分钟。同一份活度经过一个半衰期约剩一半，两个约剩四分之一。' },
  c5_annihilation: { title: '一对光子', body: '正电子与电子湮灭常产生一对近乎相反方向的511keV光子。符合探测提供响应线信息，图像还需要重建和校正。' },
  c5_extravasation: { title: '外渗要留下记录', body: '注射外渗影响实际进入体内的示踪剂分布，可能影响图像及SUV。保留真实记录，交医师评估，不用虚构参数补平。' },
  c5_fusion: { title: '亮点与位置', body: 'PET提供摄取分布，CT提供解剖位置并用于衰减校正。呼吸与运动可能导致错位；复核原图和多平面，不能靠拖动宣称运动已消除。', image: 'pet_fusion' },
  c5_uptake: { title: '发亮不等于癌', body: 'FDG摄取可见于正常生理活动、炎症及某些肿瘤。摄取不高也不能排除所有病变，须结合临床、形态和既往检查。', image: 'pet_lung' },
  c5_data_source: { title: '资料从哪里来', body: '来源、批次、时间、首版提案、原授权与合作结算分别核对。由独立保管方确认原件，才能查清技术发起与后续使用；登录账号或一人的供述不能单独替代这些记录。' },
  c5_offline: { title: '断网以后查什么', body: '断网停止了后续外传，但此前接收的副本可能仍在。核查接收方、使用范围与衍生内容，同时保留本地证据。' },
  c5_ai: { title: '辅助不是落款', body: '自动分区与数值计算须复核位置、技术质量和适用范围。辅助结果不能替代医师结合临床资料签发报告。' },
  c5_suv: { title: 'SUV不是一条生死线', body: 'SUV是半定量摄取指标，受采集时间、活度记录、血糖、重建与技术质量等影响。不存在能解决所有病人的单一癌症阈值。', image: 'pet_neck' },
  c5_delayed: { title: '多等一会也可能没答案', body: '医师可根据具体问题安排延迟显像。同日变化仍须结合整体资料，不把升高、降低或不变直接等同确诊。' },
  c5_referral: { title: '检查之后的那一格', body: '会诊与转诊要明确资料补充、预约、结果回复、异常联络及取消后的返回安排。设备采购另需结合需求和运行能力评估。' },
  c5_emission: { title: '源在身体里面', body: '核医学把核素标记在药物上，观察它在体内的分布；探测器接收体内发出的光子。CT主要测量外部X射线穿过人体后的衰减，二者的投影含义不同。' },
  c5_sources: { title: '药物从哪里来', body: '医用核素可来自反应堆、回旋加速器或核素发生器。发生器从较长寿命母核产生的短寿命子核中分离所需核素。核素给出可探测信号，标记药物参与的体内过程决定观察什么功能。' },
  c5_gamma_chain: { title: '一闪，变成一格', body: 'γ相机的准直器先限制入射方向；闪烁晶体把γ光子的能量转为可见光，光电倍增管把光信号变为电信号，定位电路确定事件位置。多个事件在像素中累计成图。' },
  c5_collimator: { title: '孔里留下的方向', body: '机械准直器建立方向与图像位置的对应关系。孔的长度和宽度等几何条件影响接受方向、灵敏度与分辨率；方向选得严格，通常也会少收一些计数。' },
  c5_spect: { title: '多角度，拼出断层', body: 'SPECT在不同角度用γ相机接收发射光子。各角度形成投影，以角度和探测位置组织成正弦图，再用滤波反投影或迭代法估计体内核素分布。' },
  c5_coincidence: { title: '两端亮了，还不是一个点', body: '同次湮灭的两光子被一对探测器接收，可形成响应线LOR。常规符合探测约束的是一条线；散射会改变方向，随机符合则把不同湮灭的光子配在一起。' },
  c5_counting: { title: '同样测量，数目也会变', body: '放射性衰变是随机过程。相同条件下的计数围绕平均值涨落，符合泊松统计；累计更多有效计数可减小相对涨落，但不会自动修复运动、错位或错误的物理模型。' },
  c5_reconstruction: { title: '投影要先变成分布', body: '滤波反投影把各方向投影先滤波再反投影；迭代法从当前分布估计投影并比较实测数据，逐次修正。同一份测量可以换重建方法，没有再次让患者进扫描床。' },
  c5_attenuation: { title: '发出来，不一定到得了', body: '体内发出的光子经过组织可能被衰减或散射，外部计数不是核素浓度的直接复印。PET/CT利用CT信息进行衰减校正，同时用CT帮助解剖定位。' },
}
const book: TrilogyChapter['book'] = [
  { title: '01｜源放在哪里', body: 'X射线成像用体外射线源看衰减；核医学引入标记药物，接收体内发出的光子，估计药物与核素的分布。' },
  { title: '02｜核素与药物', body: 'α、β与γ是不同衰变形式。PET利用β+衰变后正电子湮灭的一对光子；常见单光子显像利用γ发射体。核素给出信号，标记药物参与体内过程。' },
  { title: '03｜一半，再一半', body: '同一份氟-18活度约110分钟剩一半，220分钟剩四分之一。放射性活度指单位时间内发生的衰变数，与剩余核数及衰变常数有关。' },
  { title: '04｜三条来路', body: '反应堆、回旋加速器和核素发生器都可提供医用核素。发生器从母核衰变产生的子核中分离所需核素；半衰期和供应时间影响安排。' },
  { title: '05｜一对511keV光子', body: '正电子失去动能后与电子湮灭，常产生两光子，各约511keV、方向近乎相反。PET接收的是湮灭光子，不是直接拍下正电子。' },
  { title: '06｜响应线', body: '一对探测器近乎同时接收到同次湮灭光子，约束出一条响应线LOR。只有这一对读数，还不能确定线上哪个位置发生了湮灭。' },
  { title: '07｜配错的一对', body: '真符合来自同次湮灭且未散射；散射符合偏离原方向；随机符合把不同湮灭的光子配成一对。时间与能量信息帮助筛选，仍需相应校正。' },
  { title: '08｜亮处的来由', body: 'FDG与葡萄糖代谢相关。正常组织、生理活动、炎症和某些肿瘤均可出现摄取；颜色是显示映射，不是病理名称。' },
  { title: '09｜γ相机的四段', body: '准直器限定方向，闪烁晶体产生可见光，光电倍增管转换并放大信号，定位电路把事件落到图像位置。事件累计形成分布图。' },
  { title: '10｜孔和方向', body: '机械准直器让合适方向的光子通过。孔的宽度和长度等几何条件影响分辨率与灵敏度，接收更多不一定更能分开相邻目标。' },
  { title: '11｜能量窗口', body: '闪烁事件还带有能量信息。设置能量窗口有助筛掉部分不合适的事件，窗口本身不能重新创造被拒绝的有效计数。' },
  { title: '12｜从角度到断层', body: 'SPECT每个角度取得一幅发射投影，把同一横断面的角度和探测位置组织成正弦图，再重建核素分布。单一投影里的重叠不等于同一个位置。' },
  { title: '13｜解剖与功能', body: '同次PET/CT把摄取分布与解剖结构对应。胸腹交界处的呼吸差异会造成融合错位，要回原图与多平面确认。' },
  { title: '14｜光子在途中', body: '体内光子到达探测器前可能衰减或散射。PET/CT利用CT数据进行衰减校正，不能把未经校正的体外计数直接当核素浓度。' },
  { title: '15｜SUV的条件', body: 'SUV是半定量摄取指标，受活度、采集时间、血糖、重建和技术质量等影响。它不能单独把所有病灶分成良性和恶性。' },
  { title: '16｜模态仍各有用途', body: 'CT提供解剖和衰减信息；MRI提供另一类结构与组织对比，PET提供摄取信息。PET/CT与PET/MR的配合方式及适用问题需要分别理解。' },
  { title: '17｜同样条件也会涨落', body: '衰变事件是随机的。重复测量同一放射源，计数围绕平均值上下变化，符合泊松统计；相对涨落会随有效累计计数增加而减小。' },
  { title: '18｜累计的取舍', body: '多收集有效事件有助减轻计数噪声，但时间、运动与其他误差仍有取舍。计数不同于活度：探测效率、衰减和测量时间也影响读数。' },
  { title: '19｜同一份投影，重新估计', body: '滤波反投影先对投影滤波再反投影；迭代法比较预测投影与实测数据逐次修正。换重建方法不等于重新向患者采集。' },
  { title: '20｜不是无限小的点', body: '正电子在湮灭前有行程，光子方向也并非严格180°。TOF用到达时间差进一步约束响应线上的区段，不会把有限分辨率变成一个无误差的点。' },
]
const quiz: TrilogyChapter['quiz'] = [
  { q: '同一份氟-18活度，约110分钟后还剩多少？', options: ['约一半', '全部不变', '约两倍', '必定为零'], answer: 0, explain: '一个物理半衰期后约剩一半。' },
  { q: 'PET环上的符合探测，主要利用什么？', options: ['正电子湮灭产生的一对光子', '连续可见光闪烁', '探头发出的超声波', 'MRI的梯度回声'], answer: 0, explain: 'PET利用正电子湮灭后光子的符合探测。' },
  { q: 'PET与CT融合图错位，首先应怎样看？', options: ['对照原图、结构与多平面，评估技术质量', '拖到看着顺眼就宣布已修复运动', '把错位亮点直接定成转移', '只留颜色最艳的图'], answer: 0, explain: '融合便于定位，运动和呼吸差异仍须复核。' },
  { q: 'FDG摄取较高，能否单独证明癌症？', options: ['不能，生理活动和炎症等也可摄取', '能，只要颜色够亮', '能，只要患者有既往病史', '能，只要AI也提示发亮'], answer: 0, explain: '摄取须结合CT形态、临床与既往检查。' },
  { q: 'γ相机的准直器主要做什么？', options: ['限制光子的入射方向，建立位置对应', '把γ光子变成可见光', '放大电流信号', '让药物不再衰变'], answer: 0, explain: '机械准直器首先建立方向与位置的对应；闪烁晶体随后负责光转换。' },
  { q: 'γ相机中把γ光子的能量变成可见光的是？', options: ['闪烁晶体', '机械准直器', '病人的椅子', '图像色标'], answer: 0, explain: '闪烁晶体产生可见光，光电倍增管再转换并放大信号。' },
  { q: 'SPECT需要从多个角度取得投影，主要为了？', options: ['从各方向信息重建体内核素分布', '让核素的半衰期变长', '把发射成像变成外部X射线照相', '只选最亮的一张平面图'], answer: 0, explain: '多角度发射投影构成正弦图，可用滤波反投影或迭代法估计分布。' },
  { q: '一对符合探测器读数通常先约束出什么？', options: ['一条响应线LOR', '一个绝对精确的核素位置', '一张已经签发的诊断', '病灶的病理类型'], answer: 0, explain: '常规符合探测给出响应线；重建需要汇集许多响应线。' },
  { q: '相同条件下重复测量放射源，计数仍有变化，主要体现什么？', options: ['衰变事件的统计涨落，符合泊松规律', '设备每次都发生故障', '药物每次必定变成别的示踪剂', '图像颜色改变了衰变规律'], answer: 0, explain: '随机衰变使计数围绕平均值涨落；更多有效计数能减小相对涨落。' },
  { q: 'PET/CT中的CT数据除了定位，还可以用于？', options: ['衰减校正', '停止正电子湮灭', '让所有响应线都不再有散射', '使旧计数自动翻倍'], answer: 0, explain: 'CT提供的组织信息可用于PET衰减校正，仍须注意错位与技术质量。' },
]

function adapt(id: string, step: TrilogyStep, state: GameState): TrilogyStep {
  const f = state.flags
  if (id === 'c5_pro_note_0' && f.c2_payoff_zhou_cup) return { ...step, text: '纸上是设备交接联系人和保养要点。老周看你拿着以前他送的杯子：“还没丢，挺好。”你把便笺夹进随身本。' }
  if (id === 'c5_pro_receiving_0' && f.zhou_truth) return { ...step, text: '急诊护士领来一位穿旧外套的老人。你认出他是2024年老周照顾过的那位。今天申请单夹着临时身份条码，证件栏还等着补齐。' }
  if (id === 'c5_s2_0' && state.dlc?.dr?.served?.includes('p_qian')) return { ...step, text: '11月5日，15:10。下午门诊。那位在2025年DR白班见过的老钱，提着又厚了一层的片袋站在中心门口。' }
  if (id === 'c5_s2_1' && state.dlc?.dr?.served?.includes('p_qian')) return { ...step, text: '是你啊。当时那张复查稳定，医生说清了，我踏实过一阵。今天有新变化，得再问清。', voice: undefined }
  if (id === 'c5_s3_meeting_0' && f.data_audit) return { ...step, text: '你记得三年前会上说过要核查。成像工作收班后，顾老师拿来院方与独立档案员核过的简要回函，小雷在远程窗口等着。' }
  if (id === 'c5_s3_sms_0' && f.c2_terminal_sms_seen) return { ...step, text: '你留下的旧短信号码、时间与厂家旧工作号登记对上了，确实是雯雯。你们按登记接通她的电话。' }
  if (id === 'c5_s3_sms_1' && f.c3_wen_copy_kept) return { ...step, text: '喂，听得见吗？两条是我发的。前年让你们留核对联，也是怕回收带走本地回执。两版用途附件我这次都交齐了。' }
  if (id === 'c5_s4_father_0' && f.c4_father_transfer) return { ...step, text: '县里核到转诊线索后，我把父亲的名字写清了：许守义。证明材料都在，今天按原线索查下去。' }
  if (id === 'c5_s5_qian_2' && !f.c5_qian_gift) return { ...step, text: '单子收好了就行。后面的结果跟负责医师核对，您有问题再联系护士站。' }
  if (id === 'c5_s5_qian_3' && !f.c5_qian_gift) return { ...step, text: '好，电话上这些字，我让老伴也记了一遍。有人接，我就不自己瞎猜了。' }
  if (id === 'c5_s5_qian_3' && f.c5_seed_pot_ready) return { ...step, text: '你那个盆记得带走。回县里放室内，别在这边刚种上，人先回去了。' }
  if (id === 'c5_epi_5' && (f.archive_film || f.mystery_told)) return { ...step, text: '这才是他的，不是你们片库里那张无名片。名字、登记号都对上了，我不用再拿一张像他的片子猜。' }
  if (id === 'c5_epi_after_0' && f.c5_father_resolved) return { ...step, text: '许建平带着父亲的回复走向电梯，自己的复诊也继续按约进行。你收起本子，去和顾老师、宁宁道别。' }
  if (id === 'c5_epi_after_0' && f.c5_qian_followed) return { ...step, text: '你记得老钱按单上的电话接上了转诊医师。许建平的后续评估也已有安排，你收起本子，去和顾老师、宁宁道别。' }
  if (id === 'c5_epi_after_5' && !f.c5_qian_gift) return { ...step, text: '行李箱合上。你把观察本、书签与老周的便笺放在不同夹层。两周进修结束了。' }
  if (id === 'c5_epi_after_12' && f.c5_qian_gift && f.c5_seed_pot_ready) return { ...step, text: '回县后，你照老钱说的把菜种播进育苗盆，摆上室内窗台。这晚，新来的进修技师推开控制室门；你接过值班表，让他先看看设备状态。' }
  if (id === 'c5_epi_after_12' && f.c5_qian_gift) return { ...step, text: '县院走廊，新来的进修技师推开控制室门。你把窗台上的菜种放进抽屉，接过值班表，让他先看设备状态。' }
  return step
}

export const CH5: TrilogyChapter = {
  id: 'ch5', title: '微光', subtitle: '核医学篇 · 两周进修，五次跟班', icon: '✨', year: 2028,
  equipment: 'γ相机 / SPECT / PET-CT · 发射、探测与重建', background: 'bg_pet_center',
  shifts: [
    { id: 'c5_shift1', title: '第一班 · 赶不上钟', subtitle: '出发、交接与示踪剂订单', date: '2028年11月3日 · 晚班', start: 'c5_pro_0', checkinAt: 'c5_s1_0', background: 'bg_pet_center' },
    { id: 'c5_shift2', title: '第二班 · 环上的一对', subtitle: '老钱的PET，符合探测与同次融合', date: '2028年11月5日 · 下午门诊', start: 'c5_s2_0', background: 'bg_pet_center_day_v2' },
    { id: 'c5_shift3', title: '第三班 · 孔与方向', subtitle: 'γ相机接收链，SPECT投影与断层', date: '2028年11月8日 · 下午跟班', start: 'c5_s3_0', background: 'bg_pet_control_day_v2' },
    { id: 'c5_shift4', title: '第四班 · 功能与位置', subtitle: '许建平的PET/CT，衰减校正与定量', date: '2028年11月11日 · 下午至傍晚', start: 'c5_s4_0', background: 'bg_pet_center_day_v2' },
    { id: 'c5_shift5', title: '第五班 · 数够了没有', subtitle: '计数涨落、同源重建与回县带教', date: '2028年11月14日 · 下午交接', start: 'c5_s5_0', background: 'bg_pet_center_day_v2' },
  ],
  steps, afterQuiz: 'c5_epi_0',
  characters: {
    sys: { name: '', color: '#cbd5e1' }, me: { name: '你', color: '#86efac' },
    zhou: { name: '老周', color: '#fcd34d', sprite: portraits.zhou },
    tang: { name: '小唐', color: '#f9a8d4', sprite: portraits.tang },
    lei: { name: '小雷', color: '#a5b4fc', sprite: portraits.lei },
    fan: { name: '老范', color: '#fdba74', sprite: portraits.fan },
    director: { name: '科主任', color: '#fde68a', sprite: portraits.director },
    gu: { name: '顾老师 · 核医学医师', color: '#7dd3fc', sprite: portraits.gu },
    ning: { name: '宁宁 · 中心护士', color: '#c4b5fd', sprite: portraits.ning },
    han: { name: '韩经理 · 数据服务项目负责人', color: '#fca5a5', sprite: portraits.han },
    xu: { name: '许建平', color: '#e2e8f0', sprite: portraits.xu },
    qian: { name: '老钱', color: '#bef264', sprite: portraits.qian },
    wen: { name: '雯雯 · 厂家销售', color: '#f0abfc', sprite: portraits.wen },
    elder: { name: '老人', color: '#d6d3d1', sprite: portraits.elder },
    trainee: { name: '新来的进修技师', color: '#99f6e4', sprite: portraits.trainee },
  },
  badges, cards, book, quiz, adapt,
  shopItems: [
    { id: 'c5_postcard', name: '省院银杏明信片', price: 25, desc: '空档时写给老周，告诉他省院的饭到底怎样。', image: 'item_c5_postcard_v2', use: 'c5_postcard_used', lastShift: 4 },
    { id: 'c5_seed_pot', name: '育苗小盆', price: 45, desc: '收到老钱菜种后，最后一班可请他讲讲怎么用，带回县里种。', image: 'item_c5_seedpot_v2', use: 'c5_seed_pot_used', lastShift: 4 },
  ],
  assets: [...new Set([
    'bg_retirement', 'bg_office', 'bg_breakroom', 'bg_corridor', 'bg_pet_center', 'bg_pet_control', 'bg_pet_uptake', 'bg_pet_dorm', 'bg_ctcontrol_ready',
    ...Object.values(portraits), 'char_new_trainee', 'pet_lung', 'pet_fusion', 'pet_neck',
    'item_father_film', 'item_zhou_note', 'item_qian_seeds', 'item_pet_bookmark',
    'bg_pet_center_day_v2', 'bg_pet_control_day_v2', 'bg_pet_uptake_day_v2',
    'cg_c5_zhou_handoff_v2', 'cg_c5_record_confrontation_v2', 'cg_c5_father_letter_v2',
    'item_c5_postcard_v2', 'item_c5_seedpot_v2',
    'ch2_pixel_char_m', 'ch2_pixel_char_f',
  ])],
}
