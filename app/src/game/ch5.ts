import type { GameState, Choice } from './types'
import type { TrilogyChapter, TrilogyStep } from './trilogy-types'

/* 第五章 · 微光。五次进修值班与考核后的真正尾声。
 * 神秘病人的家庭故事按作者最新批准收束；临床不确定仍由医师处理。
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
  ['sys', '2028年11月。出发去省院前一天，科室把最后一盘饺子端到老周面前。', { bg: 'bg_retirement' }],
  ['tang', '周老师，您是正式离岗，还是明天又回来拿充电器？'],
  ['zhou', '充电器拿了。醋还没给我。'],
  ['fan', '大学那边有您讲课的照片，记得发。别只拍一排空椅子。'],
  ['zhou', '校外带教，偶尔去。没让我天天站讲台。'],
  ['director', '明天早班已经排好。您交接单签完，今晚就别再看手机了。'],
  ['sys', '散场后，你陪老周回更衣室。他从柜门里揭下排班表，装进纸袋。', { bg: 'bg_office' }],
  ['zhou', '这个柜门得往上提一点。换锁没用，合页松。'],
  ['sys', '你接住那张写满改动的交接单。最下面是几年前登记整改的补充说明。'],
  ['zhou', '漏登记的事是我做的。后面有人再问，就按记录说。'],
  ['sys', '老周把钥匙放上桌。柜子空了，桌角剩下一张折过的纸。'],
  ['zhou', '日常保养写在上面了。最后那行你看了再走。', { giftTo: 'zhou' }],
], 'c5_pro_q', { bg: 'bg_retirement' })
ask('c5_pro_q', '纸条的最后一行写着：“早餐别总吃泡面。”你把它折好。', [
  { text: '「省院食堂好不好吃，等我回来告诉您。」', next: 'c5_pro_food', effect: { heart: 1 } },
  { text: '「以后带学生，不许只让人自己想。」', next: 'c5_pro_student', effect: { heart: 1 } },
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
  ['sys', '你把编号写在他能看清的地方，扶他坐下。老周在门边站着，没有伸手接那张申请。'],
  ['zhou', '我走了啊。醋的事，下回再找你们。'],
  ['sys', '老周把旧杯子往袋底放稳，推门出去。小唐继续跟电话那头确认接人的时间，你把当班联络表递给值班医师。'],
], 'c5_s1_0', { bg: 'bg_corridor' })

// 第1班：新地方、示踪剂订单、设备原理。资料间两件独立事项可免费返回。
chain('c5_s1', [
  ['sys', '11月3日，18:10。省院核医学中心。你的进修证压在登记本里，带教医师顾老师把值班表翻给你看。'],
  ['gu', '两周，五个晚班。今晚先跟我交接，临床结论我负责。'],
  ['ning', '我叫宁宁。你要找杯子去休息室，找药别去休息室。我们真有新人走错。'],
  ['me', '我先问个不丢人的：晚班主要做什么？'],
  ['gu', '延时检查收尾、设备质控，还有次日订单。夜里也接转诊电话，谁有检查需要得先评估。'],
  ['sys', '你把行李寄在更衣柜。桌上两张送药单，一张写计划时间，一张写实际校准时间。'],
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
steps.c5_s1_schedule = scene('sys', '收货、测活度、注射分别记时间，不能把计划时间抄成实际时间。你把次日联系人记在随身页上。', { bg: 'bg_pet_control', card: 'c5_timing', effect: { flag: 'c5_schedule_seen', wealth: 1 }, next: 'c5_s1_archive' })
steps.c5_s1_safety = scene('sys', '门上把人员区域与患者等候区域分开标清。进修证不能代替培训；进入相关工作区前仍须完成中心要求。', { bg: 'bg_pet_center', card: 'c5_radiation', effect: { flag: 'c5_safety_seen', skill: 1 }, next: 'c5_s1_archive' })
chain('c5_s1_ning', [
  ['ning', '这饭盒转半圈就停，我还以为它只热右边。', { giftTo: 'ning' }],
  ['sys', '你检查托盘，发现下面卡着一个饭盒盖。没有拆机，拿掉盖子后转盘恢复。'],
  ['ning', '行，今晚不用吃左右温差套餐了。', { effect: { flag: 'c5_s1_ning_done', wealth: 1 } }],
], 'c5_s1_hub', { bg: 'bg_breakroom' })
chain('c5_s1_hall', [
  ['sys', '宿舍门外，脚步走到楼梯口就停，隔一会儿又从头响起。'],
  ['sys', '你开门看。保洁阿姨拖着带水的长拖把，轮子遇到松动地砖就顿一下。'],
  ['sys', '她指了指地上的维修标记：“明天换。”你往宿舍群报了声平安。', { effect: { flag: 'c5_s1_hall_done', heart: 1 } }],
], 'c5_s1_hub', { bg: 'bg_pet_dorm' })
chain('c5_s1_order', [
  ['ning', '明早一位病人说高铁晚点。配送那边已经发货，这张时间表怎么办？'],
  ['me', '东西还没用，放着应该也会变少。'],
  ['gu', '氟-18一直在衰变，半衰期约110分钟。看一下这个订单教学副本。', { card: 'c5_half_life' }],
], 'c5_s1_decay', { bg: 'bg_pet_control' })
steps.c5_s1_decay = scene('gu', '把时间往后移动。盯住同一份药的剩余活度，别换成另一份。', { bg: 'bg_pet_control', tool: { kind: 'pet', task: 'decay', title: '这一份药，还剩多少？', prompt: '在同一校准起点上比较现在、110分钟后与220分钟后。', help: '一个半衰期剩约一半，两个剩约四分之一。实际用药由中心核对。', next: 'c5_s1_decay_done' } })
steps.c5_s1_decay_done = scene('ning', '不是钟走慢点就能留下来。原计划得重新评估，我先联系患者和药房。', { bg: 'bg_pet_control', effect: { skill: 1, badge: 'c5_clock', flag: 'c5_decay_done' }, next: 'c5_s1_order_q' })
ask('c5_s1_order_q', '患者问：“我赶上了末班车，能不能直接打针，省掉前面那些确认？”', [
  { text: '把实际到院时间和准备情况交给医师，重新确认安排', next: 'c5_s1_order_safe', effect: { heart: 1 } },
  { text: '先问顾老师：已经送来的这份药能不能继续用？', next: 'c5_s1_order_help' },
], { bg: 'bg_pet_control', sprite: portraits.gu })
steps.c5_s1_order_safe = scene('gu', '可以。药的时间要核，病人的情况也要核。不能让配送单替人作决定。', { bg: 'bg_pet_control', next: 'c5_s1_physics_0' })
steps.c5_s1_order_help = scene('gu', '我和药房核对。先别答应他一定能赶上，你把真实时间留下。', { bg: 'bg_pet_control', next: 'c5_s1_physics_0' })
chain('c5_s1_physics', [
  ['sys', '订单重排完成。顾老师打开一幅探测器环的教学图，你看见两处几乎同时亮起。'],
  ['me', 'CT是源绕着人转。这里亮的两端，源从哪里来？'],
  ['gu', '示踪剂在体内发出正电子。与电子湮灭后，常有一对近乎相反方向的光子，探测器做符合探测。', { card: 'c5_annihilation' }],
  ['me', '所以“刚好一对”得靠时间也对得上。'],
  ['gu', '嗯。也有随机符合和散射，需要校正。先把今晚质控记录看完，别急着改参数。'],
  ['sys', '宁宁把晚餐从微波炉里拿出来。你们把次日名单再念了一遍，姓名、时间、联系人都对上了。'],
], 'c5_s1_end', { bg: 'bg_pet_control' })
finish('c5_s1_end', '首班交接完成。你收到值班补贴150金币，回宿舍把空饭盒洗了。', 'c5_shift1_done')

// 第2班：一个老病人、一件技术问题；外渗来自已发生的质控记录，不新堆患者。
chain('c5_s2', [
  ['sys', '11月5日，傍晚延时门诊。护士站借来一张小凳子，正好接住一袋从县里带来的旧片。'],
  ['qian', '我姓钱。袋子这么厚，里面可不全是片子，有一半是挂号单。'],
  ['ning', '顾老师正在核资料，您先坐，今天的检查安排已经确认。'],
  ['sys', '老钱是肺癌术后复查患者。2025年的DR记录写着“与旧片相仿”；这次随访CT出现了需要进一步评估的新变化。'],
  ['qian', '以前稳定，我挺高兴。这次还没做，我就先把最坏的想了一遍。'],
], 'c5_s2_qian_q', { bg: 'bg_pet_center' })
ask('c5_s2_qian_q', '他把装挂号单的那半边纸袋往你手边推了推。', [
  { text: '帮他按日期整理，留出本次资料', next: 'c5_s2_sort', effect: { heart: 1, flag: 'c5_qian_sorted' } },
  { text: '先问他最担心哪一件，再一起核对旧资料', next: 'c5_s2_worry', effect: { heart: 1 } },
], { bg: 'bg_pet_center', sprite: portraits.qian })
steps.c5_s2_sort = scene('qian', '这个“2025”跟“2028”，我老看成一样。别把旧的丢了，我得拿回去。', { bg: 'bg_pet_center', next: 'c5_s2_pre_0' })
steps.c5_s2_worry = scene('qian', '担心他们叫我又住院。地里的菜都浇好了，就是没跟老伴说。', { bg: 'bg_pet_center', next: 'c5_s2_pre_0' })
chain('c5_s2_pre', [
  ['gu', 'PET看的是代谢分布，CT帮忙定位。新变化值得查清，但不能在结果出来前写成“已经复发”。'],
  ['sys', '完成准备核对和注射后，宁宁领老钱去安静的摄取区。等候时间按中心方案执行，你留在控制台。', { bg: 'bg_pet_uptake' }],
  ['qian', '那我不聊天了？我嘴闲不下来。'],
  ['ning', '现在先安静休息。等出来，您再给我讲菜怎么浇。'],
  ['sys', '患者休息期间，控制台接到次日检查的电话；顾老师去回复，你有一段不打扰患者的空档。'],
], 'c5_s2_hub', { bg: 'bg_pet_control' })
ask('c5_s2_hub', '检查准备按计划进行。你可以完成一件短交接，或留下看片。', [
  detour('控制台旁：核对宁宁的外渗质控记录', 'c5_s2_leak_0', 'c5_leak_seen'),
  detour('休息室：顾老师的“消失的晚饭”', 'c5_s2_food_0', 'c5_s2_food_done'),
  detour('资料角：翻旧片对照的日期索引', 'c5_s2_index_0', 'c5_s2_index_done'),
  { text: '准备采集，回控制台', next: 'c5_s2_scan_0' },
], { bg: 'bg_pet_control' })
chain('c5_s2_leak', [
  ['ning', '这是前天一次注射外渗的记录，已经处理并报告了。我在补齐注射前后时间。'],
  ['me', '局部剩了不少，按原来的注射量算SUV，会不会失真？'],
  ['gu', '会影响定量。记录实际情况，交我判断图像可用范围；不能手改一个剂量，把它装成没发生。', { card: 'c5_extravasation' }],
  ['sys', '你把原记录与补充说明一起归档。没动原数据，也没替患者再作注射决定。', { effect: { flag: 'c5_leak_seen', skill: 1, badge: 'c5_true_record' } }],
], 'c5_s2_hub', { bg: 'bg_pet_control' })
chain('c5_s2_food', [
  ['gu', '我的饭盒在哪儿？刚才明明写了“顾”。', { giftTo: 'gu' }],
  ['ning', '您写的是“咕”。大家以为是保温盒发出的声音，放洗碗池了。'],
  ['gu', '我明天打印一个标签。', { effect: { flag: 'c5_s2_food_done', heart: 1 } }],
], 'c5_s2_hub', { bg: 'bg_breakroom' })
chain('c5_s2_index', [
  ['sys', '日期索引把术前、术后与本次分开。旧片显示稳定，只证明当时那次检查的情况。'],
  ['me', '把“以前稳定”写清楚，也把“现在有新变化”写清楚。'],
  ['sys', '你夹好对照目录，顾老师接手核对完整序列。', { effect: { flag: 'c5_s2_index_done', wealth: 1 } }],
], 'c5_s2_hub', { bg: 'bg_pet_control' })
chain('c5_s2_scan', [
  ['sys', '到点后，宁宁陪老钱完成采集。老钱走出检查室，你先看CT、再打开同次PET与融合视图。'],
  ['me', '这里的亮点，叠起来像挨着肺底。只是看一张融合图，我不敢认位置。'],
  ['gu', '先比一比两个坐标。呼吸状态不一样，胸腹交界处容易错位。'],
], 'c5_s2_fusion', { bg: 'bg_pet_control' })
steps.c5_s2_fusion = scene('gu', '拖动叠层，用同一处结构比对。找的是位置，诊断还要看完整资料。', { bg: 'bg_pet_control', tool: { kind: 'pet', task: 'fusion', title: '亮点落在哪一层？', prompt: '比较PET与CT的同一处轮廓，观察错位怎样改变亮点的归属。', image: 'pet_fusion', reference: 'pet_fusion_ct', help: '结合多平面与原图确认定位；融合显示不是重新扫描，也不能凭颜色定癌。', next: 'c5_s2_fusion_done' } })
steps.c5_s2_fusion_done = scene('gu', '现在能看出两个轮廓的偏差了。显示配准改善，不等于真实呼吸运动被消除了。', { bg: 'bg_pet_control', card: 'c5_fusion', effect: { skill: 1, badge: 'c5_same_place', flag: 'c5_fusion_done' }, next: 'c5_s2_image_q' })
ask('c5_s2_image_q', '顾老师打开老钱的本次图像。新变化处有摄取，画面没有给出一个现成答案。', [
  { text: '先结合CT形态、前片、病史，请顾老师评估', next: 'c5_s2_context', effect: { skill: 1 } },
  { text: '问顾老师：“发亮一定是癌吗？”', next: 'c5_s2_bright' },
], { bg: 'bg_pet_control', image: 'pet_lung', imageLabel: '老钱｜本次PET/CT同次对照', sprite: portraits.gu })
steps.c5_s2_context = scene('gu', '对。摄取有原因，原因得结合资料判断。现在先把可疑变化描述清楚。', { bg: 'bg_pet_control', next: 'c5_s2_result_0' })
steps.c5_s2_bright = scene('gu', '不是。炎症、生理活动也会有摄取；有些病灶摄取又并不高。', { bg: 'bg_pet_control', next: 'c5_s2_result_0' })
chain('c5_s2_result', [
  ['gu', '这次结果仍需结合临床评估。我会把建议写清，并和转诊医师沟通，您别拿颜色自己下结论。', { sprite2: portraits.qian, card: 'c5_uptake' }],
  ['qian', '那我回去该找谁？别让我拿着这袋子再猜了。'],
  ['ning', '已约转诊医师回复。时间、电话、需要带的东西写在这张单上。'],
  ['qian', '好。这个我看得懂。菜我还能浇，检查我也接着做。'],
  ['sys', '老钱把本次单子放在纸袋最前面。走前，他往你手里塞了两包自家留的菜种。', { image: 'item_qian_seeds', effect: { item: 'c5_qian_seeds', flag: 'c5_qian_gift', badge: 'c5_followup' } }],
  ['qian', '不是稀罕东西。窗台上能种，别拿热水泡。'],
], 'c5_s2_end', { bg: 'bg_pet_center' })
finish('c5_s2_end', '第二班交接完成，值班补贴150金币。你把菜种收进干燥的抽屉，没有拆开当零食。', 'c5_shift2_done')

// 第3班：资料来源核对授权、编号、时间；不以眼熟或旧盒子“复活”造证据。
chain('c5_s3', [
  ['sys', '11月8日。顾老师收到一封跨院核查函，涉及三年前一批外传的质控样本。中心曾接洽过同一个数据服务项目。'],
  ['gu', '你们院的负责人已回函，同意在授权范围核对。你参与过设备留证，来认一下记录位置。'],
  ['sys', '你打开院方指定的受控资料副本。原件仍由医院保管，患者影像没有下载到你的手机。'],
  ['me', '县里那个终端一直断着外网。现在查的是断网以前流出去的那一批。'],
  ['gu', '嗯。接收端代号R-17，回执只说明接收过。今天核的是首版提案、导出批次和技术合作附件。'],
], 'c5_s3_hub', { bg: 'bg_pet_control' })
ask('c5_s3_hub', '核查会还有半小时。你可以先找一件东西，未看完的材料在会中仍会正式核对。', [
  detour('资料角：核对旧回执与合作提案的日期', 'c5_s3_number_0', 'c5_number_seen'),
  detour('休息室：给小雷回一个电话', 'c5_s3_lei_0', 'c5_lei_early'),
  detour('中心门口：听韩经理说明“旧项目”', 'c5_s3_han_0', 'c5_han_early'),
  { text: '按时参加资料核查', next: 'c5_s3_meeting_0' },
], { bg: 'bg_pet_control' })
chain('c5_s3_number', [
  ['sys', 'R-17旧回执写着试运行当天17:42。接收方保管的导出批次表记着同一次任务，另有一份更早的技术合作提案。'],
  ['me', '提案在试运行前，用途变更在后。不能把它们都叫成“售后日志”。'],
  ['sys', '你标出三个时间，记下提供方和核验人。合作提案没有来自小雷的工作站，是接收方调出的首版存档。', { effect: { flag: 'c5_number_seen', wealth: 1 } }],
], 'c5_s3_hub', { bg: 'bg_pet_control' })
chain('c5_s3_lei', [
  ['lei', '你在省院那边核到了？我也收到通知了。', { communication: 'call', phone: portraits.lei, sprite: '' }],
  ['me', '先查编号。技术合作那份原始记录，你提交了没有？'],
  ['lei', '交了。不是只有我后来截给你的那些页。原来的签字和报酬，我都得说明。', { communication: 'call', phone: portraits.lei, sprite: '', effect: { flag: 'c5_lei_early' } }],
], 'c5_s3_hub', { bg: 'bg_pet_dorm' })
chain('c5_s3_han', [
  ['han', '项目早停了。这么多人翻旧资料，还不如把新合同签好。'],
  ['me', '新合同解决不了旧资料去了哪里。'],
  ['han', '当时的资料我得再找找。', { effect: { flag: 'c5_han_early' } }],
], 'c5_s3_hub', { bg: 'bg_pet_center' })
chain('c5_s3_meeting', [
  ['sys', '核查会开始。县院负责人在线，韩经理坐在长桌另一边。小雷远程接入，不在省院房间里。'],
  ['han', '那封删除回函说得很清楚，资料已经处理。截图不一定对应这一批。'],
  ['gu', '接收方的档案员核过原件。这是独立保管的批次清单、来源登记和签署附件，我们逐项对。'],
  ['sys', '同一批次先标为“远程质控”，后来列入商业算法项目。后续用途附件由韩经理签署，但前面还有一份首版提案。'],
], 'c5_s3_records_0', { bg: 'bg_pet_control' })
chain('c5_s3_records', [
  ['sys', '首版提案由小雷提交。附件列了院内样本的整理办法和导出批次，日期早于试运行回执。签署人与项目合作登记已经交叉核验。'],
  ['me', '他先提出拿这批样本做算法项目，再把它并进“远程质控”？'],
  ['gu', '原授权只涵盖设备支持与限定质控。首版附件已经写了商业算法用途；院里没有批准这项合作。'],
  ['sys', '厂家财务留存的技术合作结算，与同号附件和已付款凭据一致。小雷已领取报酬，后续交付由韩经理负责。'],
  ['sys', '核验人员确认四处记录一致，把首版提案、导出批次和结算附件放在同一项下。发起人一栏，小雷的名字没有留空。', { effect: { flag: 'c5_lei_origin_verified' } }],
], 'c5_s3_evidence_q', { bg: 'bg_pet_control' })
ask('c5_s3_evidence_q', '韩经理把笔放下。小雷远程接入的窗口还开着，你面前的原始附件已经核验。', [
  { text: '逐项记录来源、批次、发起人与原授权的对应关系', next: 'c5_s3_evidence', effect: { skill: 1, badge: 'c5_source', flag: 'c5_source_checked' } },
  { text: '请顾老师和资料保管人一起复核，再记录疑点', next: 'c5_s3_evidence_help', effect: { flag: 'c5_source_checked' } },
], { bg: 'bg_pet_control', sprite: portraits.han })
steps.c5_s3_evidence = scene('gu', '对上了。未经授权的技术发起、导出与报酬都要纳入核查，接收方和后续使用也继续追溯。', { bg: 'bg_pet_control', card: 'c5_data_source', next: 'c5_s3_reveal_0' })
steps.c5_s3_evidence_help = scene('gu', '复核结果一致。记录谁提供、谁确认，再把尚未确认的部分单独列出来。', { bg: 'bg_pet_control', card: 'c5_data_source', next: 'c5_s3_reveal_0' })
chain('c5_s3_reveal', [
  ['han', '他先把方案发来，我接了后续交付。当时大家都在赶项目。'],
  ['me', '提案和报酬都在试运行前。这不是值班的人碰了一下盒子，偶然传错的一份文件。'],
  ['han', '后续任务是我签的。院内那批样本怎么整理、怎么导出，是他做的。'],
  ['gu', '两边的责任分别核查。现在停止该批资料及相关衍生内容继续使用，追溯副本和接收方。'],
  ['sys', '核查人员把小雷的首版提案与韩经理的用途签字分别登记，暂停相关使用，保留原件继续追溯。', { effect: { flag: 'c5_han_identified' } }],
  ['lei', '是我先提的。我想把算法做出来，也想拿那份钱。开始就知道，这批院内样本没批给这个用途。', { communication: 'call', phone: portraits.lei, sprite: '' }],
  ['lei', '后来字段没清，我真查了，也真停了外传。会上我只讲脱敏，没讲合作是我发起的。那部分一直藏着。', { communication: 'call', phone: portraits.lei, sprite: '' }],
], 'c5_s3_lei_q', { bg: 'bg_pet_control' })
ask('c5_s3_lei_q', '通话里，小雷的声音停了。你把那份原始提案留在屏幕上。', [
  { text: '「按原记录把你发起、导出和收款的时间写全。」', next: 'c5_s3_lei_account', effect: { flag: 'c5_lei_accounted', heart: 1 } },
  { text: '「断网这一步我信。前面的合作是你主动做的，也写清。」', next: 'c5_s3_lei_both', effect: { flag: 'c5_lei_accounted' } },
], { bg: 'bg_pet_control' })
steps.c5_s3_lei_account = scene('lei', '我写全，按那份原件核。后来帮过你，也不能让你替我少记这一段。', { bg: 'bg_pet_control', communication: 'call', phone: portraits.lei, sprite: '', next: 'c5_s3_sms_0' })
steps.c5_s3_lei_both = scene('lei', '是。权限已经暂停，合作和报酬都在查。该交的文件我先交齐。', { bg: 'bg_pet_control', communication: 'call', phone: portraits.lei, sprite: '', next: 'c5_s3_sms_0' })
chain('c5_s3_sms', [
  ['sys', '核验人员先对过厂家原联系人登记与旧短信发送记录。陌生号码是雯雯当年的工作号，和后来名片上的号码不同。她随后按登记接受核验通话。', { communication: 'call' }],
  ['wen', '“终端断了，已经出去的那份还在”，还有“别把盒子还给他们”，两条都是我发的。', { communication: 'call', phone: portraits.wen, sprite: '' }],
  ['me', '您那时已经见过这份用途附件？'],
  ['wen', '见过副本。我拿质控合同去对，发现批次相同，用途不一样。问韩经理，他让我先把设备回收单签了。', { communication: 'call', phone: portraits.wen, sprite: '', next: 'c5_s3_sms_reason_0' }],
  ['sys', '两条短信的号码、发送时间和工作号登记相符；雯雯提交的旧附件也与接收方存档一致。你结束核验电话，回到控制台，顾老师正在收明天的转诊清单。', { bg: 'bg_pet_control', card: 'c5_offline', effect: { flag: 'c5_sms_resolved', badge: 'c5_old_message' } }],
  ['gu', '工作继续。这事后面还有核查，不用你今晚独自查完。先把明天的转诊清单交接好。', { bg: 'bg_pet_control' }],
], 'c5_s3_end', { bg: 'bg_pet_dorm' })
chain('c5_s3_sms_reason', [
  ['wen', '回收单只写盒子，没写本地回执怎么留。我怕原件跟着拿走，后来就只剩他说“处理完了”。先让你们别交设备。', { communication: 'call', phone: portraits.wen, sprite: '' }],
  ['me', '为什么绕过小雷，直接提醒值班的人？'],
  ['wen', '技术合作附件上有他。我不知道他会不会交出来，只知道你们还在现场。又怕消息被转回公司，就用了那个旧工作号。', { communication: 'call', phone: portraits.wen, sprite: '' }],
  ['wen', '我之前只让你们看附件，没把另一个项目讲全。现在两版都交了，回收单也留着，该核到我这儿就核。', { communication: 'call', phone: portraits.wen, sprite: '' }],
], 'c5_s3_sms_4', { bg: 'bg_pet_dorm' })
finish('c5_s3_end', '第三班交接完成，值班补贴150金币。你关掉受控资料页，手机里只留了自己的值班提醒。', 'c5_shift3_done')

// 第4班：先就诊，再查询旧记录；延迟显像属于同日医师安排。
chain('c5_s4', [
  ['sys', '11月11日，晚班交接前。你收到许建平的电话；他已预约省院评估，并获知你在这里进修。', { bg: 'bg_pet_dorm', communication: 'call' }],
  ['xu', '县里医生告诉我，你在省院。我不是让你给我插队，就是想问清楚走哪扇门。', { communication: 'call', phone: portraits.xu, sprite: '' }],
  ['me', '按预约到核医学中心。我在交接后过来。您的旧资料都带上。'],
  ['sys', '中心叫号屏亮起“许建平”。他把名字写得很慢，每个字都写在格子中间。', { bg: 'bg_pet_center' }],
  ['xu', '许建平，退休前跑长途客车。以前白天赶车，夜里赶回来，字就没好好写。'],
  ['me', '退休以后呢？'],
  ['xu', '不赶车了。十一月还是习惯来这里，父亲就是那个时候走的。'],
], 'c5_s4_hub', { bg: 'bg_pet_center' })
ask('c5_s4_hub', '顾老师先做临床评估。患者尚未注射，你可以帮他处理一件与采集无关的事。', [
  detour('资料窗口：陪许建平核对父亲的查询申请', 'c5_s4_father_0', 'c5_father_applied'),
  detour('休息室：宁宁拿来一张手绘路线', 'c5_s4_map_0', 'c5_s4_map_done'),
  detour('控制台：与顾老师核对AI辅助范围', 'c5_s4_ai_0', 'c5_ai_seen'),
  { text: '回候诊区，继续本次检查', next: 'c5_s4_clinical_0' },
], { bg: 'bg_pet_center' })
chain('c5_s4_father', [
  ['xu', '父亲叫许守义。1998年离家，县医院是我后来能找到的最后一站。'],
  ['sys', '他拿出证明材料。窗口工作人员核验身份关系与查询手续，接着核对旧转诊线索。'],
  ['xu', '我以前以为找着一张像他的片子，就算找着人了。现在知道不行。'],
  ['sys', '申请被正式受理。记录核验需要时间；工作人员约他两天后接回复，没有把陌生人的片子交给他。', { effect: { flag: 'c5_father_applied', heart: 1 } }],
], 'c5_s4_hub', { bg: 'bg_pet_center' })
chain('c5_s4_map', [
  ['ning', '外地人老在两栋楼之间绕。我画了这条线，你看看是不是漏了电梯。', { giftTo: 'ning' }],
  ['me', '没有漏电梯。漏了你自己藏饭盒的那间屋。'],
  ['ning', '那间不要画，患者真找进去，我的饺子就没了。', { effect: { flag: 'c5_s4_map_done', wealth: 1 } }],
], 'c5_s4_hub', { bg: 'bg_breakroom' })
chain('c5_s4_ai', [
  ['gu', '工作站可以帮画区域、算摄取数值。这个自动结果还要复核位置和质量。'],
  ['me', '它要是给一个很干脆的“良性”，我们反而得看它依据什么。'],
  ['gu', '对。这次临床问题不能靠一个数解决。', { card: 'c5_ai', effect: { flag: 'c5_ai_seen', skill: 1 } }],
], 'c5_s4_hub', { bg: 'bg_pet_control' })
chain('c5_s4_clinical', [
  ['gu', '县里的MRI和随访资料已核。左侧深颈部这组持续的淋巴结样改变，性质还未明确，临床医师希望进一步评估。'],
  ['xu', '不是每年换个机器就能查出来，是吧？'],
  ['gu', '各有作用，也各有限制。先回答这一次的问题，不把以前每张正常报告都翻成“查错了”。'],
  ['sys', '顾老师评估并确认方案。准备、注射、安静摄取后，许建平完成本次采集。你在控制台核对同次图像。', { bg: 'bg_pet_uptake' }],
  ['me', '摄取并不特别高，轮廓也没有替我们给出结论。', { image: 'pet_neck', bg: 'bg_pet_control', imageLabel: '许建平｜本次颈部PET/CT对照' }],
  ['gu', '数值受检查条件影响。这里目前仍不确定，不能用一个阈值把人分成有病、没病。', { card: 'c5_suv' }],
], 'c5_s4_gray_q', { bg: 'bg_pet_center' })
ask('c5_s4_gray_q', '许建平问：“是我父亲那个毛病吗？”你还不知道父亲的诊疗经过。', [
  { text: '「现在不能这样推断，让顾老师讲本次结果和下一步。」', next: 'c5_s4_gray_honest', effect: { heart: 1 } },
  { text: '「您最怕听到哪一句？我们先把问题说清。」', next: 'c5_s4_gray_listen', effect: { heart: 1 } },
], { bg: 'bg_pet_center', sprite: portraits.xu })
steps.c5_s4_gray_honest = scene('xu', '好。我问得有点急。父亲的那张还没找着，我就拿自己的往上套。', { bg: 'bg_pet_center', next: 'c5_s4_delay_0' })
steps.c5_s4_gray_listen = scene('xu', '怕医生叫我再等。等这个字，我听了太多年。可这次我也不能假装不查。', { bg: 'bg_pet_center', next: 'c5_s4_delay_0' })
chain('c5_s4_delay', [
  ['gu', '根据这次情况，我安排同日的局部延迟显像。先解释清楚：补看了，也可能仍没有确定答案。'],
  ['sys', '许建平在中心继续等候。延迟采集完成后，顾老师对照同一处改变，摄取变化不大。', { bg: 'bg_pet_control', image: 'pet_neck' }],
  ['gu', '炎性改变和某些低摄取病灶都还需要结合临床。可以讨论取样等进一步评估，也要考虑位置和您的情况。', { card: 'c5_delayed' }],
  ['xu', '我先考虑一下取样。别把这句写成我以后什么都不看了。'],
  ['gu', '好。今天先把意见、联络方式和复诊安排写清，您有新症状及时联系。'],
  ['sys', '许建平把复诊单收好。窗口回复：父亲的查询已进入记录核验，确有一份外院转诊索引。'],
], 'c5_s4_record_guard', { bg: 'bg_pet_center' })
steps.c5_s4_record_guard = scene('sys', '如果尚未办查询，许建平在窗口补齐身份与关系核验；办过的申请继续按原编号追踪。', { bg: 'bg_pet_center', effect: { flag: 'c5_father_applied' }, next: 'c5_s4_wait_0' })
chain('c5_s4_wait', [
  ['xu', '以前我跑一趟车回来，就觉得所有人都还在原地等我。'],
  ['me', '这回有申请编号。回复到了，我们按它去核。'],
  ['xu', '嗯。先去吃点东西，不然我又要问为什么饿得慌。'],
  ['sys', '你送他到电梯口。自己的本次复诊单在右口袋，父亲的申请回执在左口袋。', { effect: { badge: 'c5_two_pockets', flag: 'c5_xu_exam_done' } }],
], 'c5_s4_end', { bg: 'bg_pet_center' })
finish('c5_s4_end', '第四班交接完成，值班补贴150金币。你记好同日延迟显像时间，没把它抄成另一次重新注射。', 'c5_shift4_done')

// 第5班：从机房经验变成能被接班的人使用的安排；人物闭合留到考核后。
chain('c5_s5', [
  ['sys', '11月14日，最后一次晚班。省院天黑得早，你已经能不看路标找到更衣室。'],
  ['gu', '你的可行性报告先给我看看。标题别写“县里也买一台”。'],
  ['me', '我写的是远程会诊和转诊衔接。检查需要、人员、供药、设备运行能力，分开看。'],
  ['ning', '再加一个：患者到了这栋楼，下一步找谁。别全是漂亮流程箭头。'],
  ['sys', '你打开草稿，发现“检查之后谁回复”一栏还空着。顾老师把老钱那张联络单摆在旁边。'],
], 'c5_s5_hub', { bg: 'bg_pet_control' })
ask('c5_s5_hub', '最后一班还有一段交接空档。留下能继续使用的东西。', [
  detour('休息室：和顾老师整理转诊联系人', 'c5_s5_contacts_0', 'c5_contacts_done'),
  detour('走廊：宁宁教你认采集结束的提示', 'c5_s5_buzzer_0', 'c5_buzzer_done'),
  detour('窗口旁：给老钱的回复安排回访', 'c5_s5_qian_0', 'c5_qian_followed'),
  { text: '回控制台，交最后一班', next: 'c5_s5_report_q' },
], { bg: 'bg_pet_center' })
chain('c5_s5_contacts', [
  ['gu', '这份表里，县院联系人不用都填你。你休假了，难道全院检查跟着休假？', { giftTo: 'gu' }],
  ['me', '会诊回复由负责医师接，资料补充按岗位交接。我们科留替班联系人。'],
  ['gu', '这就能用。', { card: 'c5_referral', effect: { flag: 'c5_contacts_done', wealth: 1 } }],
], 'c5_s5_hub', { bg: 'bg_breakroom' })
chain('c5_s5_buzzer', [
  ['sys', '走廊空着，突然传来两声短促提示。你向摄取区望去，那间屋没有患者。'],
  ['ning', '别追了，是隔壁控制台的交接定时器。白天换了电池，今晚又准点响了。'],
  ['sys', '宁宁指给你看定时器和设定时间。你在交接页注明来源，没有把提示声当成设备偷偷接了网络。', { effect: { flag: 'c5_buzzer_done', badge: 'c5_sound_source' } }],
], 'c5_s5_hub', { bg: 'bg_pet_center' })
chain('c5_s5_qian', [
  ['sys', '老钱按约定联系了转诊医师，后续评估正在进行。他从县里给护士站回了电话。', { communication: 'call' }],
  ['qian', '没有丢那张单子。老伴还拿透明袋给我套了一层。', { communication: 'call', phone: portraits.qian, sprite: '' }],
  ['me', '好的，后面的结果跟负责医师核对。菜种我收好了。'],
  ['qian', '你是收到的这个年轻人？那就等你回去再种。省里这会儿的窗台太冷。', { communication: 'call', phone: portraits.qian, sprite: '', effect: { flag: 'c5_qian_followed', heart: 1 } }],
], 'c5_s5_hub', { bg: 'bg_pet_control' })
ask('c5_s5_report_q', '可行性报告最后一页，只剩一个“建议先行”栏。你选哪项？', [
  { text: '先把会诊、转诊、回复与资料补充的责任人落实', next: 'c5_s5_report_ok', effect: { wealth: 1, badge: 'c5_connection', flag: 'c5_report_complete' } },
  { text: '请顾老师指出目前缺的环节，再补全后提交', next: 'c5_s5_report_help', effect: { flag: 'c5_report_complete' } },
], { bg: 'bg_pet_control', sprite: portraits.gu })
steps.c5_s5_report_ok = scene('gu', '双方核对后再试运行。试运行也得有记录，不叫“先随便用起来”。', { bg: 'bg_pet_control', card: 'c5_referral', next: 'c5_s5_review_0' })
steps.c5_s5_report_help = scene('gu', '少了失败后的返回办法：资料缺了找谁，预约取消谁通知。补进去就可以提交。', { bg: 'bg_pet_control', card: 'c5_referral', next: 'c5_s5_review_0' })
chain('c5_s5_review', [
  ['sys', '你把两院核对栏补好。顾老师签带教意见，正式启动还须院方确认。'],
  ['ning', '别忘了自己的杯子。你们县的师父已经给我发过一次寻杯启事了。'],
  ['me', '他是怕我把杯子留这儿，人倒回去了。'],
  ['sys', '窗口电话来：许守义的转诊与身份资料完成交叉核验，家属约定在进修结业后领取回复。'],
  ['gu', '先完成这班，明天还有晨会。资料有人保管，他不会再拿到一张没名字的片。'],
  ['sys', '你交完末班设备记录，写下“11月15日：晨会后去窗口”。'],
], 'c5_s5_end', { bg: 'bg_pet_center' })
finish('c5_s5_end', '五次进修值班完成，末班补贴150金币。你可以整理背包、翻书；准备好后再主动参加晨会。', 'c5_shift5_done')

// 晨会之后才有家庭故事的答案、正式调查进展、返县带教和全章终止。
chain('c5_epi', [
  ['sys', '11月15日。晨会散场，宁宁把你落在椅背上的外套拿来。你没有急着收行李。'],
  ['ning', '资料窗口九点开。我跟那边说了，你们按申请编号去领。'],
  ['sys', '许建平已经在楼下。他手里没有整袋旧片，只带着申请回执。'],
  ['xu', '今天不查我。我来接父亲的那份。'],
  ['sys', '窗口交付经核验的回复：许守义1998年从县医院转往外地就诊，接收医院核到后续记录，确认他2001年在当地病逝。'],
  ['sys', '两院转诊索引、身份材料和留存记录互相对应。此次交付的复制件属于许守义，姓名与记录编号都能核对。', { image: 'item_father_film', imageLabel: '许守义｜经身份及转诊记录核验的旧影像复制件', effect: { flag: 'c5_father_resolved', badge: 'c5_found_name' } }],
  ['xu', '这才是他的。名字、登记号都对上了，我不用再拿一张像他的片子猜。'],
  ['me', '接收医院还联系了旧登记上的老工友家属。回函和一封退回的信，也在这里。'],
  ['xu', '那次出车前，我嫌他总说不舒服，说了很难听的话。他说“不用你管”，我就真走了。', { next: 'c5_epi_father_0' }],
  ['sys', '许建平在长椅上坐了一会儿。他拿出两个袋子，把父亲的复制件和自己的复诊单分开装。'],
], 'c5_epi_xu_q', { bg: 'bg_pet_center' })
chain('c5_epi_father', [
  ['sys', '旧转诊登记填的是老工友家的地址。家属回函与记录相符：许守义出院后暂住那里，想把病看完再回禾川。'],
  ['xu', '他不是故意躲着我？'],
  ['sys', '回函附着一只2000年的退信信封。邮戳、收件地址和退件标记已核对：迁址，收件人不详。信里写着“这边看完就回去”。'],
  ['xu', '那年车队换宿舍，我也搬了家。寻人时留过新地址，可家里这封信，还是寄到旧住处。'],
  ['sys', '外院的后续诊疗与死亡记录对应2001年。老工友家属的回函写着，当时按旧地址没找到亲人，由他们协助料理后事；还留了可以联系的电话。'],
  ['xu', '我以为他会回来找我，他那边收到的是一封退信。……这句话，我怎么现在才看见。'],
  ['sys', '许建平把信展开，读了两遍。他用手掌压平信封上的折痕，没有急着把纸塞回去。'],
], 'c5_epi_9', { bg: 'bg_pet_center' })
ask('c5_epi_xu_q', '他把自己的复诊时间又读了一遍。你在旁边等着。', [
  { text: '「明年十一月，还来吗？」', next: 'c5_epi_november', effect: { heart: 1 } },
  { text: '帮他看清老工友家属留下的联络方式', next: 'c5_epi_address', effect: { heart: 1 } },
], { bg: 'bg_pet_center', sprite: portraits.xu })
steps.c5_epi_november = scene('xu', '复查还来。找人的事……不用麻烦你了。', { bg: 'bg_pet_center', next: 'c5_epi_after_0' })
steps.c5_epi_address = scene('xu', '我照着这个问。自己的检查也接着看，顾老师的电话我有。', { bg: 'bg_pet_center', next: 'c5_epi_after_0' })
chain('c5_epi_after', [
  ['sys', '他拎着两个袋子走向电梯。关于自己的病，他仍有问题；关于父亲，他终于有了能核对的答案。'],
  ['gu', '带教记录给你。这个书签是我们自己做的，别拿来夹患者原件。', { image: 'item_pet_bookmark', effect: { item: 'c5_pet_bookmark', flag: 'c5_gu_gift' } }],
  ['sys', '院方核查传来进展：小雷发起技术合作、导出样本并领取报酬的原始资料，与韩经理签署的商业用途附件一起提交。相关使用已暂停，副本和接收方继续追溯。'],
  ['sys', '小雷的数据导出和项目访问权限已暂停，报酬与岗位责任进入正式核查。他后来留证、断网的记录一并保留，没有删掉任何一段。'],
  ['sys', '雯雯的号码、旧短信和两版附件已经核验。旧终端仍由院方留存，厂家外网断开，本地原件没有归还或销毁。'],
  ['sys', '行李箱合上。你把报告、老周的便笺与菜种放在不同的夹层。两周进修结束了。'],
  ['sys', '回县后的一个晚上，老周来电。电话那边有学生搬椅子的声音。', { bg: 'bg_office', communication: 'call' }],
  ['zhou', '省院的饭怎么样？', { communication: 'call', phone: portraits.zhou, sprite: '' }],
  ['me', '不错。宁宁说您的寻杯启事写得特别详细。'],
  ['zhou', '学生问我以前为什么不出去。我说想留，他们还在等第二段。', { communication: 'call', phone: portraits.zhou, sprite: '' }],
  ['me', '然后呢？'],
  ['zhou', '然后让他们搬椅子。你今晚带谁？', { communication: 'call', phone: portraits.zhou, sprite: '' }],
  ['sys', '县院走廊，新来的进修技师推开控制室门。你接过值班表，让他先看看设备状态。', { bg: 'bg_ctcontrol_ready' }],
  ['trainee', '老师，这里两个“重建”，是不是同一件事？'],
], 'c5_epi_teach_q', { bg: 'bg_pet_center' })
ask('c5_epi_teach_q', '你刚想一次讲完，想起自己第一回坐在这里时，根本不知道该看哪一处。', [
  { text: '「先打开同次断层。你看看那个三维按钮会改变什么。」', next: 'c5_epi_teach_try', effect: { skill: 1 } },
  { text: '「我陪你看。先说你觉得哪一步重新照了人。」', next: 'c5_epi_teach_talk', effect: { heart: 1 } },
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
  c5_two_pockets: { name: '两个口袋', icon: '🧥', desc: '完成许建平本次检查，区分两份资料' },
  c5_sound_source: { name: '提示从哪儿来', icon: '🔔', desc: '核对空走廊提示声的本地定时器来源' },
  c5_connection: { name: '能接上人', icon: '🤝', desc: '主动落实转诊、会诊与回复责任人' },
  c5_found_name: { name: '片上有名字', icon: '🎞️', desc: '领取真正属于许守义的核验旧影像' },
  c5_next_shift: { name: '下一位夜班', icon: '🌙', desc: '完成第五章真正尾声，开始带新人' },
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
}
const book: TrilogyChapter['book'] = [
  { title: '01｜两周的五次交班', body: '晚班有延时检查、质控、次日订单与转诊电话。病例和安排需要先由中心评估，不能把夜间视为绕过流程的空隙。' },
  { title: '02｜药的时间', body: '校准时间、注射时间与采集时间分开。预计到院时间变了，要重新核对安排，不能照抄昨天的表。' },
  { title: '03｜一半，再一半', body: '同一份氟-18活度约110分钟剩一半，220分钟剩四分之一。先观察时间和剩余量，不必背复杂计算。' },
  { title: '04｜环上的两端', body: '正电子湮灭后的符合探测提供响应线信息。PET不是CT球管再多转一圈；两者各有不同的测量过程。' },
  { title: '05｜患者先安静休息', body: '摄取期间按中心方案安静休息，准备与采集均有具体安排。时间窗可以用来完成设备侧交接，不打扰患者。' },
  { title: '06｜外渗后的真实记录', body: '发生外渗先按临床流程处理并报告，原记录与补充说明一起保留。是否继续、补充或改期由负责人员评估。' },
  { title: '07｜亮点究竟在哪儿', body: 'PET与CT同次融合有助定位。胸腹交界呼吸状态差异会造成错位；显示配准无法替代技术质量评估。' },
  { title: '08｜旧片的日期', body: '“以前稳定”指以前那次检查。比较新的改变，要把旧检查的日期、治疗经历和本次资料区分清楚。' },
  { title: '09｜编号不是装饰', body: '先找到批次、来源、时间和保管人，再讨论使用了什么资料。记下未经核验的部分，不以眼熟充当证据。' },
  { title: '10｜接收与用途', body: '一份接收回执证明曾接收，不自动证明后续用途获授权。用途附件与来源授权需分别核对。' },
  { title: '11｜断网真的有效', body: '厂家外网已断开，院内PACS仍可正常工作。本章追查之前流出的副本，不以调查进展声称盒子又联网。' },
  { title: '12｜一起核查的两份责任', body: '院内人员未经授权发起合作、导出样本并获益，与厂家的后续用途和交付分别核查。后来留证与断网也保留，不能用它们抹掉原始合作记录。' },
  { title: '13｜先回答这次问题', body: '合理指征与医师评估支持本次检查。换设备、换科室或自费都不能自动保证找到答案。' },
  { title: '14｜SUV的条件', body: 'SUV受实际活度、采集时间、血糖与技术质量等影响。说明测量条件，比给每个人套一个阈值更有意义。' },
  { title: '15｜辅助工作站', body: '自动分区和摄取数值是辅助；复核原图与病史，正式报告仍由医师签发。算法名称不能替代适用范围。' },
  { title: '16｜延迟仍不确定', body: '延迟显像按医师安排进行。同一处摄取变化不大仍可能有多个解释，后续评估取决于整个临床问题。' },
  { title: '17｜回复由谁来', body: '会诊意见要回到负责医师。患者离开检查室之前应知道联络方式与下一步，不能只抱着一张图去猜。' },
  { title: '18｜资料缺了怎么办', body: '联系人、替班人、补资料办法与预约取消通知都应明确。写可行性报告时，也要写失败后如何返回。' },
  { title: '19｜两份资料', body: '旧资料查询与本次临床评估分别追踪。任何一份回复，都不能代替另一份问题；记录应属于经过核验的本人。' },
  { title: '20｜把椅子拉过来', body: '带教可以先给新人一个能观察的对象，留出尝试与求助的空间。技师陪着做设备与图像工作，诊断仍由值班医师负责。' },
]
const quiz: TrilogyChapter['quiz'] = [
  { q: '同一份氟-18活度，约110分钟后还剩多少？', options: ['约一半', '全部不变', '约两倍', '必定为零'], answer: 0, explain: '一个物理半衰期后约剩一半。' },
  { q: 'PET环上的符合探测，主要利用什么？', options: ['正电子湮灭产生的一对光子', '连续可见光闪烁', '探头发出的超声波', 'MRI的梯度回声'], answer: 0, explain: 'PET利用正电子湮灭后光子的符合探测。' },
  { q: 'PET与CT融合图错位，首先应怎样看？', options: ['对照原图、结构与多平面，评估技术质量', '拖到看着顺眼就宣布已修复运动', '把错位亮点直接定成转移', '只留颜色最艳的图'], answer: 0, explain: '融合便于定位，运动和呼吸差异仍须复核。' },
  { q: 'FDG摄取较高，能否单独证明癌症？', options: ['不能，生理活动和炎症等也可摄取', '能，只要颜色够亮', '能，只要患者有既往病史', '能，只要AI也提示发亮'], answer: 0, explain: '摄取须结合CT形态、临床与既往检查。' },
  { q: '发生注射外渗，设备侧记录怎么做？', options: ['保留真实时间与原记录，交医师评估', '把注射量改成一个漂亮数字', '删除这次记录', '不记录，免得影响图像'], answer: 0, explain: '外渗可能影响图像和定量，不能虚构参数。' },
  { q: 'SUV结果最合适的理解是？', options: ['受条件影响的半定量指标', '适用所有病人的癌症阈值', '没有技术误差的真值', '替代病理与临床的结论'], answer: 0, explain: 'SUV受采集时间、活度及技术质量等影响。' },
  { q: '厂家终端断网后，既往外传资料应怎样处理？', options: ['追溯旧副本、接收方与使用范围', '认为断网等于全部副本已删除', '重新联网，看看能否再传一份', '归还终端并销毁本地记录'], answer: 0, explain: '停止新外传不等于收回旧副本，应保留证据追溯。' },
  { q: '证明资料来源，哪一组更有用？', options: ['来源登记、批次编号、时间和保管核验', '图像眼熟与经理口头保证', '患者年龄和图像颜色', '一个无来源截图'], answer: 0, explain: '来源可核对，才能讨论权限与责任。' },
  { q: '延迟显像变化不大，应怎样理解？', options: ['仍需结合整体资料评估', '必定良性，无须再讨论', '必定恶性，立刻写确诊', '此前所有检查都无效'], answer: 0, explain: '同日变化不能独立解决所有定性问题。' },
  { q: '县院与省院转诊方案需要写清什么？', options: ['资料、预约、负责回复的人及返回办法', '只写设备型号', '只写患者自行联系', '让一位技师独自签所有诊断'], answer: 0, explain: '流程要能让具体的人接上，正式诊断由医师负责。' },
]

function adapt(id: string, step: TrilogyStep, state: GameState): TrilogyStep {
  const f = state.flags
  if (id === 'c5_pro_note_0' && f.c2_payoff_zhou_cup) return { ...step, text: '纸上是设备交接联系人和保养要点。老周看你拿着以前他送的杯子：“还没丢，挺好。”你把便笺夹进随身本。' }
  if (id === 'c5_pro_receiving_0' && f.zhou_truth) return { ...step, text: '急诊护士领来一位穿旧外套的老人。你认出他是2024年老周照顾过的那位。今天申请单夹着临时身份条码，证件栏还等着补齐。' }
  if (id === 'c5_s2_0' && state.dlc?.dr?.served?.includes('p_qian')) return { ...step, text: '11月5日，傍晚延时门诊。那位在2025年DR白班见过的老钱，提着又厚了一层的片袋站在中心门口。' }
  if (id === 'c5_s2_1' && state.dlc?.dr?.served?.includes('p_qian')) return { ...step, text: '是你啊。当时那张复查稳定，医生说清了，我踏实过一阵。今天有新变化，得再问清。' }
  if (id === 'c5_s3_0' && f.data_audit) return { ...step, text: '11月8日。三年前会议里提过的数据核查，终于到了正式回函这一步。顾老师收到跨院资料核验函，涉及旧试运行样本。' }
  if (id === 'c5_s3_4' && f.c2_terminal_receipt_seen) return { ...step, text: '新清单把接收端标为R-17，旧任务与试运行时间核上了。你记得盒子里那条旧回执；今天还要查首版提案、导出批次和合作附件。' }
  if (id === 'c5_s3_meeting_1' && f.c4_receipt_conflict) return { ...step, text: '删除回函还是那封。你把第四章见过的旧任务与这次独立清单放在同一页，对照编号，等资料保管人复核。', speaker: 'sys', sprite: '' }
  if (id === 'c5_s3_sms_0' && f.c2_terminal_sms_seen) return { ...step, text: '核验人员把你留过的旧短信号与厂家联系人登记、发送记录逐项核对。那是雯雯当年的工作号，和后来名片上的号码不同。随后按登记接通她的核验电话。' }
  if (id === 'c5_s3_sms_reason_3' && f.c3_wen_copy_kept) return { ...step, text: '前年那次电话，我问回收单里有没有备份，就是怕他们把留存件带走。你们把核对联留在院里，回收联没签。现在我留的新版附件也交齐了，该核到我这儿就核。' }
  if (id === 'c5_s4_father_0' && f.c4_father_transfer) return { ...step, text: '县里核到转诊线索后，我把父亲的名字写清了：许守义。证明材料都在，今天按原线索查下去。' }
  if (id === 'c5_s4_record_guard' && f.c5_father_applied) return { ...step, text: '工作人员按此前受理的申请编号继续核验。许建平收好回执，没有重复开一份申请。', effect: undefined }
  if (id === 'c5_epi_6' && (f.archive_film || f.mystery_told)) return { ...step, text: '这才是他的。不是你们片库里那张无名片，这一张名字、登记号都对上了。' }
  if (id === 'c5_epi_after_0' && f.c5_qian_followed) return { ...step, text: '许建平拎着两个袋子走向电梯。你想起老钱回电话时读的那张联络单，又把负责医师的联系方式提醒了他一遍。' }
  if (id === 'c5_epi_after_12' && f.c5_qian_gift) return { ...step, text: '县院走廊，新来的进修技师推开控制室门。你把窗台上的菜种放进抽屉，接过值班表，让他先看设备状态。' }
  return step
}

export const CH5: TrilogyChapter = {
  id: 'ch5', title: '微光', subtitle: 'PET/CT篇 · 两周进修，五次值班', icon: '✨', year: 2028,
  equipment: 'PET/CT · 省院带教、质控与转诊衔接', background: 'bg_pet_center',
  shifts: [
    { id: 'c5_shift1', title: '第一班 · 赶不上钟', subtitle: '出发、交接与示踪剂订单', date: '2028年11月3日 · 晚班', start: 'c5_pro_0', checkinAt: 'c5_s1_0', background: 'bg_pet_center' },
    { id: 'c5_shift2', title: '第二班 · 放在同一处', subtitle: '老钱的复查与同次融合', date: '2028年11月5日 · 延时门诊', start: 'c5_s2_0', background: 'bg_pet_center' },
    { id: 'c5_shift3', title: '第三班 · 已经出去的那份', subtitle: '旧编号、用途与发信的人', date: '2028年11月8日 · 晚班', start: 'c5_s3_0', background: 'bg_pet_control' },
    { id: 'c5_shift4', title: '第四班 · 两个口袋', subtitle: '许建平的第五次就诊', date: '2028年11月11日 · 晚班', start: 'c5_s4_0', background: 'bg_pet_center' },
    { id: 'c5_shift5', title: '第五班 · 接上人', subtitle: '最后的交接与回县准备', date: '2028年11月14日 · 晚班', start: 'c5_s5_0', background: 'bg_pet_center' },
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
  assets: [...new Set([
    'bg_retirement', 'bg_office', 'bg_breakroom', 'bg_corridor', 'bg_pet_center', 'bg_pet_control', 'bg_pet_uptake', 'bg_pet_dorm', 'bg_ctcontrol_ready',
    ...Object.values(portraits), 'char_new_trainee', 'pet_lung', 'pet_fusion', 'pet_neck',
    'item_father_film', 'item_zhou_note', 'item_qian_seeds', 'item_pet_bookmark',
    'ch2_pixel_char_m', 'ch2_pixel_char_f',
  ])],
}
