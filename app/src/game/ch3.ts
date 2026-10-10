import type { GameState } from './types'
import type { TrilogyChapter, TrilogyStep } from './trilogy-types'

/** Chapter-local graph. Clinical acquisition/reporting always belongs to Mei. */
const steps: Record<string, TrilogyStep> = {}
type Line = [speaker: string, text: string, detail?: Partial<TrilogyStep>]
const portraits: Record<string, string> = {
  mei: 'char_mei', cousin: 'pat_cousin', aunt: 'pat_aunt', xu: 'pat_mystery',
  han: 'char_han', wen: 'char_wen', lei: 'char_lei', zhou: 'char_zhou', he: 'char_he', tang: 'char_tang', wang: 'pat_wang_recovery', patient: 'pat_us_gallstone',
}

function put(id: string, step: TrilogyStep) {
  if (steps[id]) throw new Error(`Duplicate chapter-three node: ${id}`)
  steps[id] = step
}

function scene(prefix: string, lines: Line[], next?: string, bg = 'bg_us_room_day') {
  lines.forEach(([speaker, text, detail = {}], index) => {
    const automatic = detail.end || detail.choices || detail.tool ? undefined :
      index + 1 < lines.length ? `${prefix}_${index + 1}` : next
    put(`${prefix}_${index}`, { speaker, text, bg, sprite: portraits[speaker], next: automatic, ...detail })
  })
  return `${prefix}_0`
}

function exploration(prefix: string, lines: Line[], hub: string, bg = 'bg_us_room_day') {
  const final = lines[lines.length - 1]
  const detail = final[2] ?? {}
  final[2] = { ...detail, effect: { ...detail.effect, flag: `${prefix}_done` } }
  return scene(prefix, lines, hub, bg)
}

function hub(id: string, text: string, places: [string, string][], clinical: string, bg = 'bg_us_room_day') {
  put(id, {
    speaker: 'sys', text, bg,
    choices: [
      ...places.map(([text, prefix]) => ({ text, next: `${prefix}_0`, cond: { ap: 1, notFlag: `${prefix}_done` }, effect: { ap: -1 } })),
      { text: '回到梅姐身边，开始这一班', next: clinical },
    ],
  })
}

// First shift: the familiar patient arrives before the unfamiliar machine becomes familiar.
scene('c3_s1_start', [
  ['sys', '2026年11月2日，早上八点。你在放射科干了两年，CT的交班本还没合上，就收到一张跨科培训表：超声科跟班两周，四个白班、一个傍晚床旁班。院里要大家多懂一种设备，这两周由梅兰医师带你。'],
  ['mei', '来啦？这边。我是梅兰，喊梅姐就行。……袖子收进去，柜门夹住了，别还往前走。', { voice: 'vox_c3_mei_v2' }],
  ['me', '难怪走不动。我还想着第一天来，不能显得太慌。'],
  ['mei', '不慌，昨天来的学生把柜门卸了。你先看设备和图像，临床我扫；要自己试探头，就去旁边那块模体。'],
  ['sys', '梅姐拿出培训表，让你签上到科时间。教学台在窗边，临床机在帘子里面；你刚把两处认清，窗口就送来了上午的预约单。'],
  ['mei', '八点半开诊，先转一圈。纸巾在右边第二格，省得待会儿全科帮你找。'],
], 'c3_s1_hub')
hub('c3_s1_hub', '窗外有人骑车进院。距上午开诊还有一会儿，你可以认认地方，也可以直接回诊室。', [
  ['看看教学台上的三支探头（1行动力）', 'c3_s1_probes'],
  ['去茶水间认杯子（1行动力）', 'c3_s1_tea'],
  ['到候诊区帮忙找预约号（1行动力）', 'c3_s1_wait'],
], 'c3_s1_aunt_0')
exploration('c3_s1_probes', [
  ['sys', '教学台上有三支探头。你拿起长条那支，指腹碰到一排细密的刻线，又把它放回软垫。'],
  ['mei', '这支线阵。旁边弧面的是凸阵，小的那支方便找肋间声窗。先说你要看浅还是深，再拿。'],
  ['me', '怪不得不是“大中小”。我先拿线阵看浅表模体，另外两支等您带着试。', { card: 'c3_probe' }],
], 'c3_s1_hub')
exploration('c3_s1_tea', [
  ['mei', '这杯是我的，写着“梅”。那个写“梅”的也是我的，盖子坏了还没舍得扔。', { giftTo: 'mei' }],
  ['me', '我还以为超声科有两位梅姐。'],
  ['mei', '那个漏水。扔了吧，像还能用；留着吧，每天骗我一次。你先用自己的，别学我攒破杯子。'],
], 'c3_s1_hub', 'ch2_bg_breakroom_day')
exploration('c3_s1_wait', [
  ['sys', '候诊区一位阿姨把旧钼靶报告和今天的申请单夹在一起。她翻来翻去，只找到两年前的日期。'],
  ['me', '今天的号在后面这张。旧片也留着，医生要对照。'],
  ['aunt', '你给我夹在最上面吧。我闺女嫌我拿得多，我说少拿一张，到这儿又得回去找。'],
], 'c3_s1_hub', 'bg_waiting_day_v2')
scene('c3_s1_aunt', [
  ['sys', '开诊后，一位阿姨第一个进来。她先把旧片袋摊平，再把一袋买菜零钱塞回口袋。', { sprite: 'pat_aunt' }],
  ['aunt', '我按门诊医生说的来复查，钼靶报告也带着。你是这边新来的？'],
  ['mei', '放射科来的，今天第一天。您把两张单给我，衣服先放这把椅子上，省得袋子滑下去。'],
  ['aunt', '两年前那次早做完了。这回是新的预约，我怕又拿错单，干脆全带来。'],
  ['sys', '你替她归好衣物，梅姐核对资料、询问情况。真正开始检查时，你退到显示器旁边。'],
  ['mei', '看我这只手，探头贴住，不是隔着胶悬在上面。你先去模体选一支试试，我核完资料叫你。', { image: 'cg_c3_mei_probe_v2', imageLabel: '梅姐示范探头接触与持握', closeup: true }],
  ['sys', '你切到教学台的浅表模体。眼前不是阿姨的实时检查，梅姐等你把探头选好。', {
    tool: { kind: 'ultrasound', task: 'probe', title: '教学台 · 选择探头', prompt: '观察浅表目标，需要怎样的探头？', help: '试着比较线阵、凸阵、相控阵的视野。选完后，由梅姐带你对照实际检查。', next: 'c3_s1_aunt_7' },
  }],
  ['mei', '这块浅，用线阵容易把边界分开。频率高，波长短，能看细一点；可往深处走，衰减也更快，不能一支包办。', { card: 'c3_frequency', effect: { skill: 1, badge: 'c3_first_probe' } }],
  ['sys', '梅姐在临床机上继续检查。你只按她的指示调整显示，保存由她选定的切面。', { image: 'us_breast', imageLabel: '乳腺超声 · 梅姐完成的检查切面', caseId: 'c3_aunt' }],
  ['aunt', '这个也做了，是不是以前那张就不用看了？'],
  ['me', '旧片还得看。这里显示的是返回的回声，不是再给您拍一张X光，梅姐把两种检查一起对照。'],
  ['mei', '对，两份我都看了。新报告给您夹在前面，回门诊时连旧片一起递给医生。'],
  ['aunt', '那我把袋子留好。买菜可以少拎一只袋，这只可不能扔。'],
  ['sys', '阿姨带走检查资料，外面那只空布袋却落在椅子上。你把姓名交给窗口代存，回来时梅姐已经换好台面的用品，示意你喝口水。', { effect: { flag: 'c3_aunt_reviewed' }, card: 'c3_breast' }],
], 'c3_s1_stone_0')
scene('c3_s1_stone', [
  ['sys', '上午十点多，窗口来问能否接急诊的一位右上腹痛患者。梅姐核完申请，让前一位预约者先到候诊区等一会儿，你把门边的椅子挪开，给轮椅留出位置。'],
  ['patient', '这儿疼得厉害。路上车一拐弯，我把门把手都攥住了。', { voice: 'vox_c3_gallstone_v2' }],
  ['mei', '我会尽量轻一些。不舒服就告诉我，不用憋着。'],
  ['sys', '保存的切面展开，一个亮点后面拖着长长的暗影。梅姐让你先把这一帧放在工作站旁边。', { image: 'us_gallstone', imageLabel: '腹部超声 · 采集后的当前切面', caseId: 'c3_gallstone' }],
  ['mei', '先说你看见什么。病名不急着抢答。', { choices: [
    { text: '有强回声，它后面的回声明显减少', next: 'c3_s1_shadow_good' },
    { text: '后面黑了，是不是屏幕坏了一块', next: 'c3_s1_shadow_retry' },
  ] }],
], undefined)
put('c3_s1_shadow_good', { speaker: 'mei', sprite: 'char_mei', bg: 'bg_us_room_day', text: '嗯，我再换个角度。你帮我留着前一张，等下放在一起看。', next: 'c3_s1_shadow_0' })
put('c3_s1_shadow_retry', { speaker: 'mei', sprite: 'char_mei', bg: 'bg_us_room_day', text: '看鼠标，能从这块黑的上面划过去吧？显示器没坏。等我换个切面，看它跟着谁走。', next: 'c3_s1_shadow_0' })
scene('c3_s1_shadow', [
  ['sys', '梅姐改变扫查方向，亮点和暗影又出现了。你把她要的切面顺序保存下来。'],
  ['mei', '两张能对上。结合检查，这里考虑胆囊结石，我把完整报告发回急诊，他们再结合您的疼痛情况评估。', { card: 'c3_shadow', effect: { skill: 1, badge: 'c3_shadow_reader', flag: 'c3_gallstone_seen' } }],
  ['patient', '那我现在是不是就得开刀？'],
  ['mei', '现在还不能在这儿定。先回急诊，医生拿着报告跟您说下一步。转回去的同事已经在门口了。'],
  ['sys', '患者被送回急诊。你把台面整理好，梅姐发现你还盯着那道黑影。'],
  ['me', '以前总想着图越亮越清楚。今天反倒是黑下去的地方帮了忙。'],
  ['mei', '前面挡住了，后面的回声就少，不能把它全拧亮。到教学台看一条声线，先弄明白这些亮点从哪儿来。'],
  ['sys', '你回到教学台，把刚才那块模体摆正。患者已经离开，练习只在这块模体上进行。'],
], 'c3_s1_gain_0')
scene('c3_s1_gain', [
  ['me', '屏幕里是亮点，这条记录里是高高低低的峰。它俩怎么对上？'],
  ['mei', '先让同一个目标在模拟声线上变远一点，盯住它的回波。', {
    tool: { kind: 'ultrasound', task: 'echo', title: '教学台 · 回波在哪里回来', prompt: '移动同一个反射目标，比较回波到达时间与亮点深度怎样一起变化。', help: '发出脉冲后等回波回来；晚到意味着往返路程更长。A型用峰的位置和高度表示深度与强度，B型把回波强度显示成亮度。一条声线的信息相同，不用计算距离。', next: 'c3_s1_gain_2' },
  }],
  ['mei', '同一份回波，峰晚到，亮点就放得更深；峰高一点，亮点就更亮。把很多条不同位置的声线排起来，才有眼前这张B型切面。', { card: 'c3_breast' }],
  ['sys', '下午交班，梅姐把你的培训表放回窗边。你找到纸巾擦了教学台，才发现柜门上贴着很大一张“纸巾”，早上一直没看见。', { end: true, effect: { gold: 90, flag: 'c3_shift1_done' } }],
])

// Second shift: family closeness cannot replace the physician's explanation.
scene('c3_s2_start', [
  ['sys', '11月4日，上午九点多。教学台已经摆好，表姐的消息跳了出来：二十四周的预约在十点，车却堵在桥上。她附了一张照片，车窗边有个已经吃空的饼干袋。'],
  ['cousin', '别替我求情啊。我只是提前跟你报备，省得你回家说我又出门晚。', { communication: 'sms', sprite: undefined, phone: 'pat_cousin' }],
  ['me', '我正想给她找后门，她先把这条路堵死了。那我帮她问问窗口，晚到怎么安排。'],
  ['mei', '去问吧。别一着急就说“我替您加个号”，待会儿还得我把你撤下来。'],
], 'c3_s2_hub', 'bg_us_room_day')
hub('c3_s2_hub', '表姐还在路上，上午的预约照常叫号。你可以趁准备的空当问问同事。', [
  ['陪梅姐看一眼排班表（1行动力）', 'c3_s2_roster'],
  ['跟小何分半袋饼干（1行动力）', 'c3_s2_he'],
  ['整理教学机的图像标签（1行动力）', 'c3_s2_label'],
], 'c3_s2_arrive_0', 'bg_us_room_day')
exploration('c3_s2_roster', [
  ['mei', '这儿写“休”，不等于我能休。旁边那个小括号，写的是院里培训。', { giftTo: 'mei' }],
  ['me', '括号比正文还厉害。'],
  ['mei', '这个月我休了三回，三回都在开会。下回干脆写个“会”，我还不用高兴半天。'],
], 'c3_s2_hub', 'bg_us_room_day')
exploration('c3_s2_he', [
  ['he', '听说你来这边了。我来送申请单，顺便看看叛逃人口伙食怎样。', { giftTo: 'he' }],
  ['me', '目前还在找纸巾，比放射科更考验空间定位。'],
  ['he', '给你留两块。我从急诊一路带来，袋子都快被我捏空了，再聊下去就真没了。', { effect: { item: 'snack' } }],
], 'c3_s2_hub', 'ch2_bg_breakroom_day')
exploration('c3_s2_label', [
  ['sys', '教学文件夹里，一张图只写了“最好的一张”。你盯着它，完全想不起好在哪里。'],
  ['me', '我把探头、目标和深度写上了。下回至少不用猜这是哪一块模体。'],
  ['mei', '调整前的也放进去。今天比频率和深部补偿，别拿两块不同模体说自己调清楚了。', { card: 'c3_compare' }],
], 'c3_s2_hub', 'bg_us_room_day')
scene('c3_s2_arrive', [
  ['sys', '表姐终于赶到，额前一层细汗。她先去窗口处理预约，没有直接往诊室里闯。', { bg: 'bg_waiting_day_v2' }],
  ['cousin', '我今天原本提前一小时出门。每次这么说，听起来都像借口。', { bg: 'bg_waiting_day_v2' }],
  ['mei', '窗口跟我对过了，上午后面有位患者取消，能往后顺一顺。先等叫号，别把你表弟表妹当通行证。'],
  ['cousin', '那我就放心等。你别陪着我站，站得我更像插队了。'],
  ['sys', '她坐下来，把那只饼干袋折成很小一块。轮到她时，梅姐先核对孕周与既往检查。'],
  ['cousin', '能不能顺便拍一张脸？家里人都问像谁，现在谁也没见过，已经吵起来了。'],
  ['mei', '先看二维结构。三维脸照是从不同位置的图像或容积数据另做显示，不能替我们省掉切面。他肯转脸再留，别急着批评像谁。'],
  ['sys', '梅姐握着探头扫查，先前的笑话慢慢停了。她回到一个二维切面，重新调整位置、测量。', { image: 'us_fetal', imageLabel: '胎儿二维超声 · 侧脑室测量切面', caseId: 'c3_cousin' }],
  ['cousin', '怎么又看这儿？是不是有问题？'],
  ['mei', '侧脑室这项测量在十毫米左右，到了轻度增宽的范围。我需要把脑部结构再详细看一遍。'],
  ['cousin', '十毫米是多大？刚才还在想像谁……你现在说这个，我都不知道先问什么。'],
  ['me', '你想看看宝宝的脸，没有做错什么。先听梅姐把现在知道的讲完。'],
  ['mei', '先别把自己吓到最坏那一步。这项要再详细看，还得找产科、胎儿医学一起评估。我把今天看到的写清，下一步让专科医生跟你仔细谈。', { card: 'c3_ventricle' }],
  ['sys', '表姐盯着屏幕，没有说话。你伸手想拿她的外套，又把手放下，等她自己开口。', { choices: [
    { text: '问她现在最想先听清哪件事', next: 'c3_s2_listen', effect: { heart: 2, flag: 'c3_cousin_listened' } },
    { text: '说“应该没事”，话出口又停住', next: 'c3_s2_promise' },
  ] }],
])
put('c3_s2_listen', { speaker: 'cousin', sprite: 'pat_cousin', bg: 'bg_us_room_day', text: '今天先去哪儿，还有下回什么时候来。你帮我记着吧，我现在听一句，前一句就忘了。', next: 'c3_s2_plan_0' })
put('c3_s2_promise', { speaker: 'me', bg: 'bg_us_room_day', text: '……等一下，我这句说快了。先让梅姐把今天能确定的讲完，我陪你记。', next: 'c3_s2_plan_0' })
scene('c3_s2_plan', [
  ['mei', '今天先拿报告回产科。我把联系人写这儿，详细评估和复查的时间要跟他们定。听不清就再问，不用怕耽误我们。'],
  ['cousin', '磁共振也要做吗？我听人说那台机器很吓人。'],
  ['mei', '胎儿MRI有时能补充信息，要看详细超声和专科评估，不是看到这个数字就人人立刻做。'],
  ['sys', '你把门诊地点和联系人抄在空白处，读给表姐听。她重复了一遍楼层，梅姐复核完才把报告递过去。', { effect: { badge: 'c3_stay_beside', flag: 'c3_cousin_plan' } }],
  ['cousin', '我先去产科。你继续上班吧，等下班陪我吃点东西，别再聊数字了。'],
  ['sys', '她离开后，你坐回教学台。梅姐把刚才没有讲完的设备设置换到模体画面上。'],
  ['mei', '深度选好了，深处还比较暗。别把浅处一块儿拉白，只补深部这一段试试。', {
    tool: { kind: 'ultrasound', task: 'tgc', title: '教学台 · 深处少回来的那一点', prompt: '只调整深部回波的补偿，比较浅部是否保留层次、深部是否更容易观察。', help: '同一模体的深部回波走得更远、衰减更多。TGC是随到达时间/深度改变接收增益，与整体增益不同，也没有增加发射功率。', next: 'c3_s2_finish_0' },
  }],
])
scene('c3_s2_finish', [
  ['mei', '目标完整，浅处也没全白。这两张记好深度和补偿位置，下回来才比得上。', { card: 'c3_depth', effect: { skill: 1, badge: 'c3_depth_keeper' } }],
  ['me', '以前看一片暗就想加整体增益。原来得先问，是整张暗，还是走到深处才暗。'],
  ['mei', '这版先留着。下回深处又暗，咱先看看探头还贴着没有，再回来看频率。'],
  ['sys', '下午交班后，表姐发来“我在楼下”，后面跟着一家粥店的位置。你回复“等我换衣服”，把培训表放回柜子。', { end: true, effect: { gold: 100, flag: 'c3_shift2_done' } }],
])

// Third shift: a recovering heart, an optical-looking scare, and a name finally spoken.
scene('c3_s3_start', [
  ['sys', '11月7日，下午四点。这次跟傍晚床旁班：先做完门诊复查，再随梅姐去病区会诊。你刚把移动机推到门口，一只轮子就吱了一声。'],
  ['mei', '电量、探头、耗材。别到病区才发现，推了一台大号电视过去。'],
  ['me', '都核对了。就是这只轮子有意见。'],
  ['mei', '轮子的意见回来报修。路上慢点，别让它先到病区。'],
], 'c3_s3_hub', 'bg_us_room_day')
hub('c3_s3_hub', '王叔还在窗口报到，傍晚的床旁任务也已约好。你把推车靠边停稳，先准备这趟出科要用的东西。', [
  ['听小唐说一句床旁交接（1行动力）', 'c3_s3_tang'],
  ['检查移动机的电源和线缆（1行动力）', 'c3_s3_cart'],
  ['去窗口看看寄存的布袋（1行动力）', 'c3_s3_bag'],
], 'c3_s3_wang_0', 'bg_us_room_day')
exploration('c3_s3_tang', [
  ['tang', '你负责推车？转弯留点地方。上回我被人用仪器车追了半层楼。', { giftTo: 'tang' }],
  ['me', '车已经检查过了，接下来重点检查我。'],
  ['tang', '我待会儿去病区交单，东边病床梯一起走。你别跟着我拐去库房，我上回就领错过一队人。'],
], 'c3_s3_hub', 'bg_us_bedside_day_v2')
exploration('c3_s3_cart', [
  ['sys', '你把电源线从轮子旁收起，检查外观和电量。备用线在侧袋，不在你想当然的抽屉里。'],
  ['mei', '这回好，少一个人蹲在床底下找插座。'],
  ['me', '这里贴个“备用线”，回去也收这格。我可不想推到半路再折回来。', { card: 'c3_bedside', effect: { badge: 'c3_cart_ready' } }],
], 'c3_s3_hub', 'bg_us_bedside_day_v2')
exploration('c3_s3_bag', [
  ['aunt', '前几天走得急，外面这个空布袋落下了。窗口说你替我放好了，我过来拿一下。'],
  ['me', '给您。您当时把片子拿走了，我还松了口气，不然得让您多跑一趟。'],
  ['aunt', '我顺路带块擦镜布，自己缝的小边。给你擦眼镜用，你可别看它白，就拿去擦机器。', { image: 'item_reunion_gifts', effect: { item: 'c3_aunt_cloth', badge: 'c3_aunt_returns' } }],
], 'c3_s3_hub', 'bg_waiting_day_v2')
scene('c3_s3_wang', [
  ['sys', '出发前，梅姐先完成一位复诊患者的心超。王叔把药袋放在椅子上，坐下又马上站起来。', { sprite: 'pat_wang_recovery' }],
  ['wang', '这回不抢救啦，是心内科约的复查。躺哪边？刚才差点把药袋交给窗口当申请单。', { voice: 'vox_c3_wang_v2' }],
  ['mei', '先别急，资料给我。今天看看心脏的结构和功能，结果交给心内科一起评估。'],
  ['wang', '我现在散步，走到菜场就往回拐。不是医生不让，是再走两步就忍不住买烧饼。'],
  ['me', '那您的路线设计，很考验意志力。'],
  ['sys', '梅姐完成必要核对，持探头寻找心脏切面。屏幕里的瓣膜来回开合，你负责按指示留存图像。', { image: 'us_echo', imageLabel: '超声心动图 · 心脏结构与运动', caseId: 'c3_wang' }],
  ['wang', '这个能看见我支架里面通不通吗？'],
  ['mei', '这次主要看结构、运动和功能，不是直接给支架拍通畅证明。您看，这条线一直跟着瓣膜，看的是它一段时间里怎么动。'],
  ['sys', '检查完成，王叔拿着报告，又回来问了一遍心内科的楼层。你把楼层写在袋口，他这才把药袋和片袋分开提好。', { effect: { flag: 'c3_wang_reviewed' } }],
  ['wang', '谢谢。走了，这回我先去门诊，不去菜场。'],
], 'c3_s3_motion_0')
scene('c3_s3_mirror', [
  ['sys', '六点多，王叔已经回门诊。你和梅姐推车到重症病区，接诊医师说明会诊问题。你把车侧身停好，让出床边，梅姐核对资料、拉好帘子。', { bg: 'bg_us_bedside' }],
  ['sys', '夜灯已经调暗。采集留存的画面上，膈肌上方又出现了一块像肝脏的结构，你下意识看了一眼患者，再看回屏幕。', { bg: 'bg_us_bedside', image: 'us_mirror', imageLabel: '床旁超声 · 采集后的膈肌附近切面' }],
  ['me', '等一下，上面那块……这里怎么还有一份？', { bg: 'bg_us_bedside' }],
  ['mei', '看见了。你先指给我，别隔着半个病房喊。想怎么核实？', { bg: 'bg_us_bedside', choices: [
    { text: '请梅姐换一个扫查角度，观察它是否变化', next: 'c3_s3_mirror_check' },
    { text: '先把“胸腔内占位”记进结果', next: 'c3_s3_mirror_wait' },
  ] }],
])
put('c3_s3_mirror_check', { speaker: 'mei', sprite: 'char_mei', bg: 'bg_us_bedside', text: '对，先验证。你记下现象，我来换声窗，别只拿这一帧下结论。', next: 'c3_s3_mirror_end_0' })
put('c3_s3_mirror_wait', { speaker: 'mei', sprite: 'char_mei', bg: 'bg_us_bedside', text: '先别写那个结论。把它描述为重复影像，我们换声窗再看。', next: 'c3_s3_mirror_end_0' })
scene('c3_s3_mirror_end', [
  ['sys', '梅姐调整角度，那份“多出来的肝脏”随之变化。她又从别的声窗核对，没有急着结束检查。'],
  ['mei', '镜像伪影。这里回声多绕了一段路，机器却还按直来直去算，就把位置画到另一边。别的声窗已经核过了。', { card: 'c3_mirror', effect: { skill: 1, badge: 'c3_second_angle' } }],
  ['me', '幸好我刚才只说“等一下”，没喊出病名。'],
  ['mei', '喊出来我也得改，顺便还得跟人解释你不是在喊他。走吧，报告交给当班医师，你帮我盯一下那只轮子。'],
], 'c3_s3_xu_9', 'bg_us_bedside')
scene('c3_s3_waiting', [
  ['sys', '五点前，床旁任务还没集合。表姐来取随访安排，候诊区只空着一把椅子，她坐到一位穿旧夹克的男人旁边；那是今天下午最后一位腹部预约者。'],
  ['cousin', '您也是来复查的？'],
  ['xu', '消化内科开的腹部检查，约的今天下午。做完就能回去，不耽误你们出科吧？'],
  ['cousin', '我现在一听见医生停顿，就忍不住胡思乱想。'],
  ['xu', '我以前跑长途，乘客一问“怎么停了”，我也得赶紧说只是等红灯。没人解释，等着的人心里就悬着。'],
  ['sys', '表姐笑了一下，手仍按着文件袋。男人没有追问她的报告，她也没问他的。'],
], 'c3_s3_xu_0', 'bg_waiting_day_v2')
scene('c3_s3_xu', [
  ['sys', '轮到男人时，梅姐核对申请单。姓名栏这回没有被挂号条挡住：许建平。'],
  ['xu', '退休了，以前开长途客车。今天消化内科让我来查腹部。还有件旧事，做完能不能问你们两句？'],
  ['mei', '先把今天的检查完成，身体上的事一样得认真。别的事，待会儿坐下说。'],
  ['sys', '腹部检查由梅姐完成，仅见一个约三毫米的胆囊息肉样病变。她结合资料写好报告，交代回开单门诊评估、按医嘱随访。', { effect: { flag: 'c3_xu_third_visit' } }],
  ['xu', '我父亲叫许守义。1998年离开家，最后有人见到他，是在这家医院。'],
  ['me', '姓名和联系方式留给正式受理窗口吧。我把位置写给您，下回带资料来核。'],
  ['xu', '先找记录吧。我那阵子跑车，一个月没几天在家，总拖着说下一趟。现在能问的人换了好几拨，问到后来，还得先解释自己是谁。'],
  ['me', '您把姓名和联系方式留一下，我给您问正式受理窗口。旧病历得核身份、授权，材料不全也告诉您缺哪张。'],
  ['xu', '好，下回带。今天这份报告我先拿回门诊，老资料的事另外问。', { effect: { heart: 1, flag: 'c3_xu_identity', badge: 'c3_name_spoken' } }],
  ['sys', '傍晚班交接完，你把移动机接回电源，报修单贴在响轮子旁边。梅姐去交报告，你把许建平留下的联系方式抄清，表姐在门外喊你换衣服。', { end: true, effect: { gold: 110, flag: 'c3_shift3_done' } }],
], undefined, 'bg_us_room_day')

// Fourth shift: a blood-flow signal lesson, with optional ordinary office work.
scene('c3_s4_start', [
  ['sys', '11月10日，上午八点。教学机上多了一份血流演示，黑白切面旁边有红蓝两色。梅姐放下预约单，让你先看看：这回不光看界面在哪里，还要看运动带回什么信号。'],
  ['mei', '昨天有人问，红的是动脉、蓝的是静脉吧？你先别替他点头。'],
  ['me', '我差一点。以前看血管图总习惯按这个颜色认。'],
  ['mei', '先看探头跟流动方向。换个角度，收到的频移就不一样，待会儿拿教学数据试。'],
], 'c3_s4_hub')
hub('c3_s4_hub', '教学血流演示已经准备好。开诊前还能找同事聊几句，或看看新送来的用品。', [
  ['找小雷借标签机（1行动力）', 'c3_s4_lei'],
  ['和梅姐拆新包装（1行动力）', 'c3_s4_pack'],
  ['给老周回个电话（1行动力）', 'c3_s4_zhou'],
], 'c3_s4_doppler_0')
exploration('c3_s4_lei', [
  ['lei', '标签机借你，别像上次那个人，打一张“标签机”，然后把卷用完了。', { giftTo: 'lei' }],
  ['me', '只打“开封日期”和批次。我连卷芯都给你带回来，够意思吧？'],
  ['lei', '卷芯留着。这卷是我多买的，给梅姐用。记得让她在贴纸上写日期，别只贴个“开封日期”就算完了。', { image: 'item_notebook', effect: { item: 'c3_lei_label_roll' } }],
], 'c3_s4_hub', 'ch2_bg_breakroom_day')
exploration('c3_s4_pack', [
  ['mei', '这边普通外用，这边无菌单包，别因为外包装差不多，就塞进同一个格子。', { giftTo: 'mei' }],
  ['me', '我把适用范围和领用位置分开写，价格另放一栏。'],
  ['mei', '这格够了，下一箱先别拆。每回堆满，有效期短的反而拿不到，最后拆箱的人还挨财务问。', { card: 'c3_gel' }],
], 'c3_s4_hub')
exploration('c3_s4_zhou', [
  ['zhou', '在超声科怎么样？还找得到食堂吗？', { communication: 'call', sprite: undefined, phone: 'char_zhou' }],
  ['me', '找得到。就是他们那边的饭点，和饭点没什么关系。', { communication: 'call' }],
  ['zhou', '那就熟悉了。周末回来，给我讲讲那个轮子。后勤上回答应给我们修椅子，还欠着呢。', { communication: 'call', sprite: undefined, phone: 'char_zhou' }],
], 'c3_s4_hub', 'bg_office_day')
scene('c3_s4_cost', [
  ['sys', '你把三个月的数据摊开。总金额上去了，但门诊与床旁检查的人次也增加了。另有一批旧包装到了使用期限，报废单单独放着。'],
  ['mei', '财务把这两张加一起了。你看，报废那批还算在本月用量里，可不是我们一人多挤了半瓶。'],
  ['me', '那先把采购量、实际领用、过期损耗拆开？'],
  ['mei', '你终于没上来就说“每个人少挤一点”。', { choices: [
    { text: '按检查用途和人次核对，调整订货与库存', next: 'c3_s4_cost_right', effect: { wealth: 2, flag: 'c3_gel_ledger' } },
    { text: '先给每次检查设一个固定小额度', next: 'c3_s4_cost_limit' },
    { text: '把剩下的都灌进一个大瓶，减少报废', next: 'c3_s4_cost_mix' },
  ] }],
])
put('c3_s4_cost_right', { speaker: 'mei', sprite: 'char_mei', bg: 'bg_us_room_day', text: '就这么算。能少报废多少，另开一栏。别让财务看完，又叫我每位患者少挤一点。', next: 'c3_s4_cost_end_0' })
put('c3_s4_cost_limit', { speaker: 'mei', sprite: 'char_mei', bg: 'bg_us_room_day', text: '有的地方得补，接触不好还怎么扫？先把订多的、放到最后才过期的找出来，别卡患者这一下。', next: 'c3_s4_cost_end_0' })
put('c3_s4_cost_mix', { speaker: 'mei', sprite: 'char_mei', bg: 'bg_us_room_day', text: '哎，别开。不能混装补灌，包装和用途还得按要求来。剩这几瓶先核该怎么处理，别为了少报废造个新麻烦。', next: 'c3_s4_cost_end_0' })
scene('c3_s4_cost_end', [
  ['sys', '你们重新分了货架，按预计用量调整订货。梅姐把加温设备的说明书也找出来，核对适用产品与清洁要求，不再凭“摸着不烫”判断。'],
  ['mei', '这一版我拿去。财务要再问为什么贵，你跟我去，别算完就跑。', { effect: { badge: 'c3_gel_account' } }],
  ['sys', '敲门声响起。一个穿深色衬衫的男人在门口出示工作证，没有越过诊室门槛。'],
  ['han', '打扰，我姓韩，厂家数据项目这边的负责人。今天配合整改做设备清单核对，不碰临床机器。'],
  ['mei', '临床还在用，技术的事等这一位结束。你先去办公室找小雷，登记一下。'],
  ['han', '没问题。我们也希望把去年遗留的服务范围理清，免得大家反复解释。'],
  ['sys', '他把一份回收清单留在门边，页签贴得很整齐。其中一项写着“旧终端及相关留存件”。'],
], 'c3_s4_han_0')
scene('c3_s4_han', [
  ['sys', '检查间歇，你去办公室递清单。小雷核对着编号，韩经理把笔盖扣上，又拔下来。', { bg: 'bg_office_day' }],
  ['lei', '先对**试运行那批的编号**。相关留存件，具体列到哪一份？', { bg: 'bg_office_day' }],
  ['han', '旧终端的配套存储、备件之类。统一回收，免得留在各科没人管。', { bg: 'bg_office_day' }],
  ['me', '这张表现在是核对，还是签了就允许带走？', { bg: 'bg_office_day' }],
  ['han', '今天先核对。处置当然还要走你们院里的流程。', { bg: 'bg_office_day', choices: [
    { text: '把“仅核对，未交接”写清，请他补列每件编号', next: 'c3_s4_han_note', effect: { flag: 'c3_han_scope_recorded' } },
    { text: '先把模糊条目交给小雷确认，不代签交接', next: 'c3_s4_han_ask' },
  ] }],
])
put('c3_s4_han_note', { speaker: 'lei', sprite: 'char_lei', bg: 'bg_office_day', text: '就这么写。我把编号补上再回给他，别让这几页附件都成了待回收设备。', card: 'c3_trace', effect: { badge: 'c3_keep_the_record' }, next: 'c3_s4_han_end_0' })
put('c3_s4_han_ask', { speaker: 'lei', sprite: 'char_lei', bg: 'bg_office_day', text: '我来核对。你先别代签，有的附件院里还得继续查，不能让他这一栏全带走。', card: 'c3_trace', next: 'c3_s4_han_end_0' })
scene('c3_s4_han_end', [
  ['han', '那我重列一版，正式走院方确认。今天我就不带东西了。'],
  ['sys', '他收回未签的回收联，核对联留在桌上。两张纸的页脚编号相同，“留存件”三个字也还在。'],
  ['lei', '你继续轮转吧。需要你说明的现场情况我会找你，其他事我跟院里对。'],
  ['me', '他刚才都把回收联递出来了。我不问，是不是就拿这张给我签？'],
  ['lei', '可能。他这张只列了终端。我再问问，**最早那版项目附件**算不算在里面。', { effect: { flag: 'c3_han_met' } }],
  ['sys', '下午交班前，你把教学血流的方向、探测角度和颜色图例一起记好。梅姐翻到最上面，终于不用猜哪一张是朝向探头。', { bg: 'bg_us_room_day' }],
  ['sys', '第四班交接完，临床图像各归原报告，教学演示留在自己的文件夹。梅姐把预约单收起，你提着已经洗好的饭盒去换衣服。', { bg: 'bg_us_room_day', end: true, effect: { gold: 110, flag: 'c3_shift4_done' } }],
], undefined, 'bg_office_day')

// The known caller and the old anonymous number are not identified as the same
// person here. Chapter five must verify the sender independently.
steps.c3_s4_han_end_4.next = 'c3_s4_wen_0'
scene('c3_s4_wen', [
  ['sys', '刚把清单放回桌上，手机亮了。来电显示是雯雯；走廊另一头，还能听见韩经理等电梯的声音。', { communication: 'call' }],
  ['wen', '方便说话吗？韩经理说去过了。我想对一下回收单，有没有写**包括备份**？', { communication: 'call', sprite: undefined, phone: 'char_wen' }],
  ['me', '核对联留下了，回收联没签。到底要收什么，还得重列。', { communication: 'call' }],
  ['wen', '行，那先别把原件装进去。我这边留着新版附件，院里要核我就交。……现在有个电话进来，你先忙，有消息我再找你。', { communication: 'call', sprite: undefined, phone: 'char_wen' }],
  ['sys', '电话断了。你在核对联旁记下时间和她提的“新版附件”，又发去一句“请按正式渠道交”。雯雯回复“好”，你才收起手机回诊室。', { effect: { flag: 'c3_wen_copy_kept' } }],
], 'c3_s4_han_end_5', 'bg_office_day')

// Fifth shift and the post-quiz ending are deliberately separated by the settlement page.
scene('c3_s5_start', [
  ['sys', '11月13日，最后一个跟班日，上午八点。你已经会先把备用纸和模体摆好。梅姐拿来培训表，把今天的教学考核圈上，下午再完成轮转交接。'],
  ['mei', '今天我坐旁边。你把设备准备、探头、显示和记录连起来做一遍。'],
  ['me', '正式考核？'],
  ['mei', '不正式的话，我就能让你替我写评语了？先准备，病人的检查照常由我来。'],
], 'c3_s5_hub', 'bg_us_room_day')
hub('c3_s5_hub', '考核开始前，熟悉的人陆续从门口经过。你已经不用先问每一个柜子放什么。', [
  ['跟老周聊聊这两周（1行动力）', 'c3_s5_zhou'],
  ['把标签机还给小雷（1行动力）', 'c3_s5_lei'],
  ['陪梅姐收拾教学台（1行动力）', 'c3_s5_mei'],
], 'c3_s5_assess_0', 'bg_us_room_day')
exploration('c3_s5_zhou', [
  ['zhou', '我来送会诊资料。还行，没瘦。梅姐没让你天天搬最重那台吧？', { giftTo: 'zhou' }],
  ['me', '以前B、M、D放在一张屏上，我还以为都是给同一张图换皮肤。现在知道每块看的信息不同。'],
  ['zhou', '回来我考你：先讲你这两周看过什么，不许一开口就背病名。顺便，下周饭堂换窗口了，你别又站在旧门前等。'],
], 'c3_s5_hub', 'bg_office_day')
exploration('c3_s5_lei', [
  ['lei', '标签机还得这么准时，我都有点不习惯。', { giftTo: 'lei' }],
  ['me', '里面还剩一截。没给机子起名，也没给你打奖状。'],
  ['lei', '少一张奖状，省半卷纸。你把型号和卷芯一块儿还回来，下回梅姐借，我也少找半天。'],
], 'c3_s5_hub', 'ch2_bg_breakroom_day')
exploration('c3_s5_mei', [
  ['mei', '这块模体又被擦得亮晶晶的。你不会以为擦得干净能加考核分吧？', { giftTo: 'mei' }],
  ['me', '本来只想少扣一点。'],
  ['mei', '给你张探头小卡。我常忘在洗手池边，给你之前特意重新写的。遇到深的、浅的各先想什么，都在上面，拿不准回来问。', { image: 'item_notebook', effect: { item: 'c3_mei_probe_card', badge: 'c3_mei_pocket_card' } }],
], 'c3_s5_hub', 'bg_us_room_day')
scene('c3_s5_assess', [
  ['sys', '你核对设备与教学任务，在记录上写明模体，不把练习混进临床文件夹。梅姐点点头，没替你接下一步。'],
  ['mei', '目标都没动。把扫描线排密一点，再看看一帧要等多久，别光挑最密的那版。', {
    tool: { kind: 'ultrasound', task: 'resolution', title: '教学台 · 看得够密，跟得够快', prompt: '调整扫描线数与显示深度，比较横向采样、目标覆盖和帧频的取舍。', help: '同一模体中，每帧线数更多或显示更深，往返等待累积更多，帧频会受影响。更多线让横向采样更密，不是把声束变窄；保持目标完整，再比较运动是否跟得上，不算公式。', next: 'c3_s5_assess_2' },
  }],
  ['me', '静着看想排密一点，追着运动又得更新够快。可我把增益也推太高了，密不密都快白成一片。'],
  ['mei', '你自己调，我先不说。', {
    tool: { kind: 'ultrasound', task: 'gain', title: '跟班考核 · 调整增益', prompt: '让目标边界可辨，同时保留该有的明暗层次。', help: '增益调整接收后的显示强弱。太暗漏细节，太亮会淹没层次；不是越亮越好。', next: 'c3_s5_assess_4' },
  }],
  ['sys', '你保留调整前后的画面，注明设置。梅姐从头核对一遍，在培训记录上签下名字。', { card: 'c3_gain', effect: { skill: 2, badge: 'c3_echo_apprentice', flag: 'c3_practice_passed' } }],
  ['mei', '过了。探头放回软垫，别激动得往桌上一搁。以后调图拿不准，这两张就是你的参考。'],
  ['me', '我知道。纸巾的位置倒是可以独立回答了。'],
  ['mei', '这项满分。把B型的切面、M型的时间线、血流演示各放回文件夹，别全叫“最好看的一张”。'],
], 'c3_s5_notice_end_4', 'bg_us_room_day')
scene('c3_s5_notice', [
  ['sys', '许建平从文件袋里取出一张旧寻人启事。边角磨得发白，新贴的透明胶压住一道裂口。', { image: 'item_missing_notice' }],
  ['xu', '这是许守义，我父亲。1998年那张原件太薄了，这张是后来照着重印的，名字和事情没改。'],
  ['me', '最后出现的地点写着县医院。您以前找到过哪个部门？'],
  ['xu', '找过门诊，也问过住院处。那阵子我跑长途，他说不舒服，我还嫌他老念叨。出门前吵了一架，后来就没回来。'],
  ['sys', '你请他确认愿意留下哪些资料。他用指尖按住父亲的名字，停了一会儿，点头。', { choices: [
    { text: '陪他到正式受理窗口，先核对查询所需材料', next: 'c3_s5_notice_desk', effect: { heart: 1, flag: 'c3_xu_query_assisted' } },
    { text: '把受理窗口和联系人写给他，约好补材料', next: 'c3_s5_notice_route' },
  ] }],
], undefined, 'bg_waiting_day_v2')
put('c3_s5_notice_desk', { speaker: 'sys', bg: 'bg_office_day', text: '你陪他找到负责旧病历查询的窗口。工作人员按授权与身份材料登记了请求，没有当场翻出一份“正好就是”的记录。', next: 'c3_s5_notice_end_0' })
put('c3_s5_notice_route', { speaker: 'sys', bg: 'bg_waiting_day_v2', text: '你把材料清单和窗口位置写清，许建平自己打电话确认了受理时间。他把纸折好，这次没有塞进旧报告中间。', next: 'c3_s5_notice_end_0' })
scene('c3_s5_notice_end', [
  ['xu', '这份复印件你可以留下，只用于帮我对这件事。查不到也告诉我，别因为怕我难受就一直拖着。', { image: 'item_missing_notice', effect: { item: 'c3_missing_copy', flag: 'c3_missing_notice' } }],
  ['me', '好。有消息先跟您核对，我们不拿一张像的照片就下结论。'],
  ['xu', '那会儿他总说不舒服，我嫌他念叨。找那张片，也是想知道那天到底怎么了。现在想跟他道个歉，连人在哪儿都不知道。'],
  ['sys', '许建平把原件收好，向窗口确认了下次补材料的日期。你等他走到电梯口，回来把受理号码抄进联系人栏。'],
  ['mei', '培训表给我，下午交接签一下。晨会五道题就问这些成像原理，先吃饭，别拿空肚子去考。', { bg: 'bg_us_room_day' }],
  ['sys', '两周跟班完成。梅姐收好交接表，告诉你轮转晨会的时间。先在本班经营页整理物品、书页；准备好后，再进入考核。', { end: true, effect: { gold: 120, flag: 'c3_shift5_done' } }],
], undefined, 'bg_waiting_day_v2')

// Course spine: all player-operated experiments use explicit teaching objects.
steps.c3_s1_aunt_5.next = 'c3_s1_signal_0'
scene('c3_s1_signal', [
  ['me', '探头既发又收？我以为里面至少得分成喇叭和麦克风。'],
  ['mei', '里面有压电材料。给它电脉冲，它振动发声；回声回来，它又把机械振动变成电信号。发一小段，留时间收回来。'],
  ['me', '难怪先等回波，不是一直把声打出去。'],
  ['mei', '对。界面两边的声阻抗不同，返回的回声才不同。贴住皮肤、用胶赶走那层空气，声音才接得进去。'],
], 'c3_s1_aunt_6')

steps.c3_s2_plan_5.next = 'c3_s2_depth_0'
steps.c3_s2_arrive_10.next = 'c3_s2_arrive_13'
steps.c3_s2_arrive_7.card = 'c3_ventricle'
steps.c3_s2_plan_0.next = 'c3_s2_plan_3'
scene('c3_s2_depth', [
  ['sys', '梅姐调出同一块教学模体。浅处小目标很清楚，深处另一个目标却被显示范围截掉一半；她把临床文件夹关好，才把鼠标让给你。'],
  ['mei', '先看全。不要为了屏幕显得满，把目标底下截掉。', {
    tool: { kind: 'ultrasound', task: 'depth', title: '教学台 · 先留够显示范围', prompt: '让目标和需要的后方完整显示，比较放得过深时目标在画面上的大小。', help: '深度决定显示到多远，不会让声波穿得更深。更深的回波要等更长往返时间，等待与帧频的对照留在最后一班；这里先选择目标所需范围。', next: 'c3_s2_depth_2' },
  }],
  ['me', '看全了。不过深处还是暗，换成更高频，反而更难看到了。'],
  ['mei', '高频的细节机会和穿透要一起看。现在保留这组频率和目标，再比补偿，别每次换一堆条件。'],
], 'c3_s2_plan_6')

scene('c3_s3_motion', [
  ['sys', '王叔回心内科后，梅姐把教学机切到一个周期运动的反射界面模型。你认得B型的形状，却还不习惯旁边一条条随时间起伏的线。'],
  ['me', '旁边这个像把运动拉成长条了，它还是一张断面吗？'],
  ['mei', '观察线已经放在运动界面上了。沿时间回看，看看两边怎么对上。', {
    tool: { kind: 'ultrasound', task: 'm_mode', title: '教学台 · 一条声线的时间记录', prompt: '沿时间回看同一条观察线，比较B型当时的界面位置与M型相应时刻的轨迹。', help: 'B型组合不同位置的声线形成切面；M型反复看同一条声线，纵轴深度、横轴慢时间、亮度表示回波强弱。这里是教学运动模型，不让王叔重复检查。', next: 'c3_s3_motion_3' },
  }],
  ['me', '原来横着不是另一边的身体，是下一刻。界面远近一变，那条轨迹就往上往下走。'],
  ['mei', '对，先用B型定位，再用M型跟着这一条线看运动。临床要测什么由我核，你记清模式和位置就行。', { card: 'c3_echo' }],
], 'c3_s3_waiting_0')
steps.c3_s3_xu_5.next = 'c3_s3_xu_8'
steps.c3_s3_xu_8.next = 'c3_s3_mirror_0'
steps.c3_s3_xu_9.bg = 'bg_us_room'

scene('c3_s4_doppler', [
  ['sys', '上午的临床检查由梅姐照常完成。间歇她打开教学血流通道：同一条流动管道，黑白形状没变，运动信号却随着探测方向改变。'],
  ['me', '看形状还是B型，红蓝这块又多看到了什么？'],
  ['mei', '流动的散射体让接收到的频率变了。用这份演示换个方向，你别先给红的起名叫动脉。'],
  ['mei', '一次先改探测角度，盯住同一条流动通道。', {
    tool: { kind: 'ultrasound', task: 'doppler', title: '教学台 · 颜色跟谁相比', prompt: '改变同一教学血流的探测角度，比较相对探头的方向与可检测频移。', help: '按本演示图例，朝向探头显示红，远离显示蓝；不是动静脉标签。接收频移取决于运动在声束方向的分量，接近垂直时频移变小，不代表管道停流。不做速度计算。', next: 'c3_s4_doppler_4' },
  }],
  ['me', '形状还在，频移却小了。要是只截这一版，我还以为里面突然不动了。'],
  ['mei', '所以方向、角度和图例一起留。B看位置，D看运动带回的频率变化，别把两块当同一张图染个色。', { card: 'c3_trace' }],
], 'c3_s4_han_end_5')

// Workaday detours remain available, but never replace the fourth-shift lesson.
steps.c3_s4_hub.choices!.splice(-1, 0,
  { text: '陪梅姐核一眼耦合剂用量账（1行动力）', next: 'c3_s4_cost_0', cond: { ap: 1, notFlag: 'c3_gel_account_done' }, effect: { ap: -1 } },
  { text: '去办公室递回收核对单（1行动力）', next: 'c3_s4_han_0', cond: { ap: 1, notFlag: 'c3_han_met' }, effect: { ap: -1 } },
)
steps.c3_s4_cost_end_1.effect = { ...steps.c3_s4_cost_end_1.effect, flag: 'c3_gel_account_done' }
steps.c3_s4_cost_end_1.next = 'c3_s4_hub'
steps.c3_s4_han_0.text = '小雷在办公室核旧清单，韩经理等着拿回未签的回收联。你把核对单放到桌上，指了指那一项“相关留存件”。'
steps.c3_s4_han_0.next = 'c3_s4_han_4'
steps.c3_s4_han_4.text = '今天只核对，不带走。我重新列编号，交院方确认。'
steps.c3_s4_han_note.card = undefined
steps.c3_s4_han_ask.card = undefined
steps.c3_s4_han_note.next = 'c3_s4_han_end_4'
steps.c3_s4_han_ask.next = 'c3_s4_han_end_4'
steps.c3_s4_han_end_4.text = '我再核最早那版附件，别把它跟终端一起回收。你去跟梅姐，剩下这几项我交院里对。'
steps.c3_s4_wen_0.next = 'c3_s4_wen_1'
steps.c3_s4_wen_1.text = '喂，听得见吗？核对联留在院里吧？新版附件我这儿也有，院里要核，我按正式渠道交。'
steps.c3_s4_wen_1.voice = 'vox_trilogy_wen_v2'
steps.c3_s4_wen_1.next = 'c3_s4_wen_4'
steps.c3_s4_wen_4.text = '你记下雯雯的通话和附件说明，回到教学台。具体接收情况仍由院里核验。'
steps.c3_s4_wen_4.next = 'c3_s4_hub'

// A few optional lines receive the old paper; the capstone stays on imaging.
steps.c3_s5_hub.choices!.splice(-1, 0,
  { text: '到窗口帮许建平递查询资料（1行动力）', next: 'c3_s5_notice_0', cond: { ap: 1, notFlag: 'c3_missing_notice' }, effect: { ap: -1 } },
)
steps.c3_s5_notice_0.next = 'c3_s5_notice_4'
steps.c3_s5_notice_4.text = '许建平带来启事和关系材料，请窗口受理。你可以陪他递交，或者把窗口位置写清。'
steps.c3_s5_notice_end_0.text = '这份副本留给受理人员，只用来核我父亲这件事。今天你们还有培训，我去窗口等。'
steps.c3_s5_notice_end_0.next = 'c3_s5_notice_end_3'
steps.c3_s5_notice_route.text = '你写清窗口位置，许建平自己过去递交。工作人员核过材料，留下副本，将原件还给他。'
steps.c3_s5_notice_end_3.text = '受理窗口登记了请求，许建平收好原件。你核清联系人后回到梅姐身边，继续教学考核。'
steps.c3_s5_notice_end_3.effect = { flag: 'c3_xu_query_started' }
steps.c3_s5_notice_end_3.next = 'c3_s5_hub'
steps.c3_s2_finish_1.card = 'c3_compare'

// Every real examination acquires before revealing its result. These nodes carry
// no clinical judgement or reward; leaving a completed acquisition reveals next.
const acquisitions: [string, string, string, string, string, string][] = [
  ['c3_s1_aunt_7', 'c3_s1_aunt_scan', 'c3_s1_aunt_8', 'bg_us_room_day', '乳腺超声 · 梅姐持探头扫查', '梅姐拉好帘子，在临床机上开始扫查。你站在显示器侧，等她确定要保存的切面。'],
  ['c3_s1_stone_2', 'c3_s1_stone_scan', 'c3_s1_stone_3', 'bg_us_room_day', '腹部超声 · 梅姐持探头扫查', '梅姐换好腹部探头，先问清疼痛位置，再沿着声窗扫查。你按她的示意记录切面，患者不舒服时她就停下来调整。'],
  ['c3_s2_arrive_6', 'c3_s2_cousin_scan', 'c3_s2_arrive_7', 'bg_us_room_day', '产科超声 · 梅姐持探头扫查', '表姐躺稳，梅姐开始检查，按顺序寻找需要观察的结构。你收好手机，留在工作站旁，等她保存测量切面。'],
  ['c3_s3_wang_4', 'c3_s3_wang_scan', 'c3_s3_wang_5', 'bg_us_room_day', '超声心动图 · 梅姐采集心脏切面', '王叔按梅姐的指示躺好。她从声窗寻找心脏切面，你帮忙标记、留存她选定的图像。'],
  ['c3_s3_mirror_0', 'c3_s3_bedside_scan', 'c3_s3_mirror_1', 'bg_us_bedside', '床旁超声 · 梅姐持探头采集', '床旁团队让出位置，梅姐在患者身边扫查。你看着移动机上的采集状态，保存她选定的膈肌附近切面。'],
  ['c3_s3_xu_2', 'c3_s3_xu_scan', 'c3_s3_xu_3', 'bg_us_room_day', '腹部超声 · 许建平本次检查', '许建平收好外套，梅姐核对开单问题后开始腹部扫查。你按她的指示留存切面，旧病历的话题等检查完成再接着谈。'],
]
for (const [from, id, next, bg, label, text] of acquisitions) {
  steps[from].next = id
  put(id, { speaker: 'sys', text, bg, next,
    scan: { kind: 'ultrasound', label, durationMs: 3000, sound: 'trilogy_us_scan_v2' } })
}

// Lunch gives the first shift time to breathe before its final handover.
steps.c3_s1_gain_2.next = 'c3_s1_lunch_0'
scene('c3_s1_lunch', [
  ['sys', '午后轮休，接班同事守着诊室，你和梅姐才到休息室打开饭盒。小何来送补签的申请单，手里还捏着一根没拆的勺子。', { image: 'cg_c3_shared_lunch_v2', imageLabel: '轮休时一起吃几口饭', closeup: true }],
  ['he', '你们这边有多的筷子吗？我早上记得带了，刚才发现带的是两根吸管。'],
  ['mei', '最下面那格。拿两双，免得等下又回来拿我的。'],
  ['me', '您每个柜子都知道，我第一天就能认出纸巾那格。'],
  ['mei', '吃完去看。抽屉有字，你别把找柜子当今天唯一学会的。'],
  ['he', '我先接个电话。等下回来拿勺子，别给我收了，我可就这一根。', { voice: 'vox_trilogy_he_v2' }],
], 'c3_s1_gain_3', 'ch2_bg_breakroom_day')

// Chapter shop finds use the ordinary choices and visit-local return paths.
// Buying alone does not grant a badge; the completed scene consumes the item.
for (let shift = 1; shift <= 5; shift++) {
  const hubId = `c3_s${shift}_hub`
  const towel = `c3_s${shift}_towel_use`
  const stickers = `c3_s${shift}_stickers_use`
  steps[hubId].choices!.splice(-1, 0,
    { text: '拿口袋小毛巾，收拾窗边教学台', next: `${towel}_0`, cond: { item: 'c3_pocket_towel', notFlag: 'c3_towel_used' } },
    { text: '拿杯子姓名贴，跟梅姐认一认杯子', next: `${stickers}_0`, cond: { item: 'c3_cup_stickers', notFlag: 'c3_stickers_used' } },
  )
  scene(towel, [
    ['sys', '你把新毛巾留在窗边教学台，擦掉桌沿沾着的一小点耦合剂。梅姐把临床探头往自己的操作位收好，毛巾没有碰到它。'],
    ['me', '底下还压着张照片。您抱的这个，是以前的超声机？'],
    ['mei', '教学模体。那年培训合照，别人都抱花，我出来得晚，只抓住这块。你往后翻，还印着大家的名字。'],
    ['me', '这边这位笑得这么厉害，是不是拍照的人一直让您换个东西抱？'],
    ['mei', '是主任。他自己抱着一箱打印纸，也没好到哪儿去。照片收回台垫底下，毛巾就放教学台这格吧。', { effect: { loseItem: 'c3_pocket_towel', flag: 'c3_towel_used', badge: 'c3_training_photo' } }],
  ], hubId, 'bg_us_room_day')
  scene(stickers, [
    ['sys', '你把一包姓名贴放在休息室桌上。梅姐端来两只都写着“梅”的杯子，决定先给那只漏水的贴上“别倒水”。'],
    ['me', '还发现第三只。杯底怎么写着“奖品，不喝”？'],
    ['mei', '培训答题赢的，盖子拧不开。小何修了半天，最后说当笔筒挺好。'],
    ['me', '我给它贴“笔筒”，这回名副其实。'],
    ['mei', '行，剩下这张我拿去贴小何的勺子。他老把勺子落这儿，下回来了让他自己认领。', { effect: { loseItem: 'c3_cup_stickers', flag: 'c3_stickers_used', badge: 'c3_cup_detective' } }],
  ], hubId, 'ch2_bg_breakroom_day')
}

// The quiz returns here, rather than skipping directly to a certificate.
scene('c3_epilogue', [
  ['sys', '晨会散场，你把笔放回口袋。梅姐没有问你得了几分，先问：“早饭吃了没？”', { bg: 'bg_us_room_day' }],
  ['me', '考前吃了半个包子，另一半一直在等考后。', { bg: 'bg_us_room_day' }],
  ['mei', '那它比你有耐心。拿走吧，别把最后一天过成胃痛会诊。', { bg: 'bg_us_room_day' }],
  ['sys', '梅姐夹上一份参数复盘页，把你第一天选探头的记录也放在旁边。“带回去，别只拿走盖章那页。”你把两张一起收好。', { bg: 'bg_us_room_day', image: 'item_notebook', effect: { flag: 'c3_mei_feedback' } }],
  ['mei', '以后有图拿不准就来，最好提前打电话。我正在扫人的时候，可不能边握探头边替你找文件。', { bg: 'bg_us_room_day' }],
  ['sys', '几天后，专科医生结合表姐的详细检查和咨询，安排她到市里补充胎儿MRI。你调好休息，陪她坐早班车。', { bg: 'bg_day' }],
  ['cousin', '这次我提前两个小时出门。你别笑，我已经把堵车的钱都算进车票了。', { bg: 'bg_day' }],
  ['me', '我没笑。我在想早餐是不是也算进去了。', { bg: 'bg_day' }],
  ['sys', '到市里后，工作人员重新核对资料与安全信息。轮到表姐时，你留在等候区，没有跟着闯进检查室。', { bg: 'bg_waiting_day_v2' }],
  ['cousin', '手机替我拿着。要是家里问，就说我在按计划检查，别帮他们直播每一分钟。', { bg: 'bg_waiting_day_v2' }],
  ['sys', '你把手机静音。墙上的钟走得很慢，叫号屏换了好几次名字。', { bg: 'bg_waiting_day_v2' }],
  ['sys', '检查后，专科医生拿着MRI和此前的报告，一项项解释：这次未见其他中枢结构异常，之后仍要按约复查超声。表姐把下次日期念了一遍，你替她记到手机里。', { bg: 'bg_waiting_day_v2' }],
  ['cousin', '好，那我们把下次时间记上。今天先吃饭，我真的饿了。', { bg: 'bg_waiting_day_v2' }],
  ['me', '走。车站那家太挤了，咱们多走一条街，找个能坐下慢慢吃的。', { bg: 'bg_day' }],
  ['sys', '之后的超声随访显示测量稳定。表姐发来新消息，前半段是复查安排，后半段已经在问哪种婴儿车能进老楼电梯。', { bg: 'bg_day', effect: { flag: 'c3_cousin_followup_stable' } }],
  ['sys', '回院那天，老周正看新设备论证材料。听见你说起市里的MRI，他把笔往耳后一夹。', { bg: 'bg_office_day' }],
  ['zhou', '明年咱们那台也准备进来了。你去市里看了什么，先给我讲讲；设备科总问机房外要留多少等候位。', { bg: 'bg_office_day' }],
  ['me', '先留能放下片袋的椅子。我这回坐了一上午，袋子一滑下来就得弯腰捡。', { bg: 'bg_office_day' }],
  ['sys', '回科后，你在文件夹上分开写下“B型切面”“M型时间记录”“多普勒血流”。梅姐留下的反馈夹在前面，第一张就是你曾把深处一口气推亮的模体图。', { bg: 'bg_us_room_day' }],
  ['mei', '下回有人问“为什么这块黑”，你先别抢着答病名。把收到什么、怎么显示的说清，再跟负责医师核。', { bg: 'bg_us_room_day' }],
  ['sys', '你走出办公室，听见超声科又叫了一个号。窗外天亮着，下一班还没有开始。第三章「回声」结束。', { bg: 'bg_day', end: true, effect: { flag: 'c3_completed' } }],
])

const cards: TrilogyChapter['cards'] = {
  c3_probe: { title: '探头发，也收', body: '压电材料把电脉冲变成机械振动发声，再把返回振动变成电信号。探头里的保护/匹配层、吸声材料和阵元各有作用；外形要适合目标深度和声窗。' },
  c3_frequency: { title: '细一点，还是深一点', body: '同一介质中频率越高、波长越短。高频有利于细节，却通常衰减更快；选择探头时同时看目标深度、声窗和所需分辨能力。', image: 'us_breast' },
  c3_breast: { title: '一份回波，两种显示', body: 'A型把回波显示为峰，峰的位置对应深度、高度对应强度。B型将回波强度转为亮度，并组合不同位置的声线形成切面。它与X光提供的信息不同，旧片仍要一起对照。', image: 'us_breast' },
  c3_shadow: { title: '黑影与后方增强', body: '前方强反射或强衰减，后方回声减少，可出现声影。低衰减结构后面则可能比同深度周围更亮。先比较位置与其他切面，不把所有黑区或亮区直接叫病。', image: 'us_gallstone' },
  c3_compare: { title: '只补深处这一段', body: '回波往返距离增大，衰减更明显。TGC按到达时间/深度改变接收增益，整体增益则影响整幅显示；比较同一目标、同一频率的前后版本。补偿没有创造未收到的信息。' },
  c3_ventricle: { title: '二维切面与三维脸照', body: '三维超声由不同位置的二维信息或容积采集经处理形成；动态三维再随时间更新。表姐的结构评估仍需要二维切面，面部显示没有替代测量与医师随访。', image: 'us_fetal' },
  c3_depth: { title: '看多深，就等多远', body: '系统用回波往返时间估计深度。显示过浅会截掉目标，过深会让目标缩小、等待更多；增加显示深度不是增加声波穿透能力，也可能影响帧频。' },
  c3_bedside: { title: '能跟上运动的画面', body: '超声可以快速动态观察。每帧的声线数、显示深度和往返等待共同影响更新速度；床旁仍需电量、连接、患者及任务的真实交接，不能只有屏幕亮着。' },
  c3_echo: { title: 'M型的横轴是时间', body: 'M型反复检测同一条声线，纵轴深度、横轴慢时间，亮度代表回波强度。B型先定位，M型再观察该线上的界面运动；心超不是直接证明冠脉支架通畅。', image: 'us_echo' },
  c3_mirror: { title: '直线假定失效以后', body: '入门成像用直线传播和近似一致的声速估计位置。回声绕路后，位置估计可能出现镜像伪影。这是本章的小拓展；改变声窗、角度并由梅姐复核。', image: 'us_mirror' },
  c3_gel: { title: '胶为什么接得上', body: '探头与皮肤间的空气层会造成很强的反射，耦合剂减少这一影响。不能为了用量账削弱接触；库存损耗与产品、院感要求另行核对，不混装补灌。' },
  c3_trace: { title: '红蓝相对探头', body: 'D型利用运动产生的回波频移。按本演示图例，红朝向探头、蓝远离，不是动静脉标签；频移与声束方向的运动分量有关，接近垂直时变小不代表停流。' },
  c3_gain: { title: '增益与分辨取舍', body: '增益改变收到的信号如何显示，过高会淹没层次。短脉冲有助于轴向区分，窄声束有助于横向区分；增加扫描线只使横向采样更密，还要一起比较帧频。' },
}

const book: TrilogyChapter['book'] = [
  { title: '01 · 一块晶片，两次转换', body: '给压电材料施加电场，它产生机械振动；回声施加机械作用，它又产生电信号。一次发射后留出接收时间，是脉冲回波成像的起点。探头不是把摄像机伸进身体。' },
  { title: '02 · 回来晚，就放得深', body: '回波到达时间对应声波的往返路程。系统按约定声速估计距离，往返时间乘声速后要分成去、回两程。这里只观察时间和深度一起改变，不要求算距离。' },
  { title: '03 · 界面不只是一条外轮廓', body: '声阻抗与介质密度、声速有关。不同声学性质的界面产生反射，组织非均匀性还产生散射；回波的位置、强弱和其他信息共同形成画面。空气层会强烈影响声耦合。' },
  { title: '04 · A型到B型', body: 'A型以峰的位置和高度表示深度及回波强度。B型把强度变成亮度，再排列不同位置的声线，形成二维切面。A型在本章用来理解信号，不另外给患者开一项检查。' },
  { title: '05 · 高频不是更大的音量', body: '声速一定时，高频对应短波长。它提供细节分辨的机会，也更容易衰减；深部目标与浅表目标不能只凭“数字更高”选探头。频率、接收增益与发射输出是不同事情。' },
  { title: '06 · 深度与等待', body: '显示深度限定保留的距离范围。截掉目标当然不合适，留过多深部空白也会改变目标在屏幕上的比例。更远的回波需要更长往返等待，深度还参与帧频取舍。' },
  { title: '07 · 整体增益和TGC', body: '整体增益一起改变显示信号的强弱；TGC按回波到达时间、也就是估计深度分段补偿。深部衰减明显时，不能只把整幅推白。两者都没有增加发射功率或补回未接收到的信息。' },
  { title: '08 · 两个目标分不开', body: '沿声束方向看轴向分辨，脉冲越短，邻近界面的回波越不容易重叠。与声束横着并排看横向分辨，声束宽度是重要因素。显示得大、线排得密，不等于这些物理限制自动消失。' },
  { title: '09 · M型只跟一条线', body: '反复检测同一条声线，将深度方向的回波亮点沿慢时间展开，就得到M型。横轴是时间，不是另一个空间方向；运动界面形成随时间起伏的轨迹。' },
  { title: '10 · 先B定位，再M观察', body: 'B型帮助找到结构与合适的观察线，M型帮助观察该线上界面的位置和运动。临床心功能测量由梅姐完成，玩家在周期运动模型里看两种表示的对应关系，不让王叔多扫一次。' },
  { title: '11 · 同样是后面，一黑一亮', body: '强反射或强衰减物后面回声减少，可出现声影；低衰减结构后方回声可能强于同深度周围。胆石切面与教学液体目标用于观察这种差别，不用单个亮暗征象独立定性。' },
  { title: '12 · 机器用了哪些近似', body: '入门位置估计近似声束直线传播、各处声速一致；补偿还借助衰减的近似。镜像伪影是“回声绕路”的简短拓展，不属于课件列出的核心新模式；实际画面仍要换声窗复核。' },
  { title: '13 · D型多出的是频移', body: '探头和运动散射体之间的相对运动使接收频率与发射频率不同。D型利用这项频移信息观察血流等运动。它与显示回波强度的B型回答不同问题，不是给灰阶结构随便上色。' },
  { title: '14 · 颜色先看图例', body: '本章演示使用红朝向探头、蓝远离的方向图例。红蓝不对应动脉和静脉，也不自动表示疾病；检查时应先核实当前颜色图例、探头方向与位置。' },
  { title: '15 · 角度改变，频移改变', body: '运动在声束方向的分量决定可检测频移。接近垂直时频移变小，不能把这一帧读成没有血流。速度计算需要已知频率、声速与角度，公式留在可选复习，不作为游戏算术题。' },
  { title: '16 · 密一点，慢一点', body: '同一简单逐线采集模型中，每帧扫描线更多、显示更深，会增加累计往返等待并限制帧频。线数影响横向采样密度，帧频影响跟上运动的能力；先看任务，再选择取舍。' },
  { title: '17 · 对照只改一个目的', body: '比较频率时保留目标和其他条件；比较TGC时保留探头和频率；比较扫描线与深度时同时查看更新速度。保存改变前后的记录，比只交一张最好看截图更能说明你做了什么。' },
  { title: '18 · 声束也有宽度', body: '阵元产生的声场由各部分贡献叠加。探头附近可有明显起伏，离得远时声束会扩散；选择探头和聚焦条件要围绕目标。近远场公式及详细声压分布留可选课程复习，不加入必答计算。' },
  { title: '19 · 三维再加一个时间', body: '三维显示可以由多位置二维信息或容积采集经处理形成；动态三维加入随时间的更新。表姐想要面部图很自然，但二维结构检查、测量和随访仍要独立完成。造影、弹性成像是课件末尾拓展，不扩成新的主任务。' },
  { title: '20 · 为什么在床旁好用', body: '超声设备便于动态和重复观察，没有X射线成像的电离辐射来源；气体和骨骼会限制深部观察，结果受声窗、操作和参数影响。声学输出仍有热与机械效应，本章不把“没有X光”当无限输出的理由。' },
]

const quiz: TrilogyChapter['quiz'] = [
  { q: '探头把返回的机械振动变成电信号，对应什么？', options: ['X射线曝光', '正压电效应', '增益补偿', '把频率变成场强'], answer: 1, explain: '正压电效应把机械作用转换为电信号，逆压电效应用于电到机械振动的发射。' },
  { q: '同一声速假定下，同一目标的回波更晚回来，系统会把它显示在哪里？', options: ['只改变名字', '一定显示得更亮', '更深的位置', '探头外面'], answer: 2, explain: '更晚的回波对应更长的往返路程，系统据此估计深度。' },
  { q: 'B型超声如何形成二维切面？', options: ['将不同位置声线的回波强度转成亮度并组合', '只反复看同一条线的慢时间', '直接拍摄体内照片', '把动脉统一染红'], answer: 0, explain: 'B型用亮度表示回波强度，并组合不同位置的声线。' },
  { q: '其他条件相近时，选择更高频探头需要同时考虑什么？', options: ['频率就是显示增益', '深处总会更清楚', '只看哪个更轻', '细节分辨与衰减、穿透的取舍'], answer: 3, explain: '高频对应短波长，提供细节机会，也通常有更明显衰减。' },
  { q: '同一模体浅处有层次、深处偏暗，TGC主要做什么？', options: ['增加患者检查次数', '按到达时间/深度调整接收增益', '把所有地方同时推白', '改变真实目标位置'], answer: 1, explain: 'TGC是时间增益补偿，可以针对深度调整接收后的信号显示。' },
  { q: 'M型超声图的横轴和纵轴通常表示什么？', options: ['患者左右和前后', '血流颜色和体重', '慢时间和深度', '频率和姓名'], answer: 2, explain: 'M型反复看同一条声线，横轴慢时间、纵轴深度。' },
  { q: '强衰减结构后面变暗、低衰减结构后面相对变亮，分别对应什么？', options: ['声影与后方回声增强', '同一种固定显示器坏点', '动脉与静脉', 'M型与三维'], answer: 0, explain: '前方传播条件不同，会改变后方回波强弱，需要结合位置与其他切面观察。' },
  { q: '本章红朝向、蓝远离的多普勒图例，颜色相对于什么？', options: ['动脉和静脉名称', '报告的好坏', '患者年龄', '探头及声束方向'], answer: 3, explain: '颜色按相对探头的运动方向表示，不是动静脉分类。' },
  { q: '教学流动没有停止，探测角度却接近垂直，频移变小应怎样理解？', options: ['管道突然完全堵住', '声束方向的运动分量变小', '显示深度自动减半', '所有反射界面消失'], answer: 1, explain: '多普勒频移与运动在声束方向的分量有关，不能将变小直接读成停流。' },
  { q: '简单逐线模型中，每帧增加线数、同时显示更深，需要比较什么代价？', options: ['病例袋变重', '发射必定消失', '累计等待与帧频下降', '旧片自动作废'], answer: 2, explain: '更多声线及更深回波都需要等待，空间采样和时间分辨应结合任务权衡。' },
]

function adapt(id: string, step: TrilogyStep, state: GameState): TrilogyStep {
  const tools = state.dlc?.ch3?.chapter?.tools
  if (id === 'c3_s1_aunt_7' && tools?.c3_s1_aunt_6?.choice && tools.c3_s1_aunt_6.choice.replace(/^assisted:/, '') !== '线阵') {
    return { ...step, text: '你刚才那支看得更深，不代表它更差。这块目标浅，换高频线阵，边界会更容易分开。来，跟我对照一下。' }
  }
  if (id === 'c3_s1_aunt_1' && state.flags.n4_kind) {
    return { ...step, text: '哎，是你！两年前帮我讲清楚检查、写预约便签的那个。这次门诊让我复查，我就把旧钼靶也带来了。' }
  }
  if (id === 'c3_s1_aunt_3' && state.flags.n4_kind) {
    return { ...step, text: state.flags.n4_wrong
      ? '我记得那时差点走错机器，幸好你们停下重新核对了。后来预约的检查做完了，今天是新的复查，没拖两年。'
      : '你那张便签我夹过好久。那次检查早做完了，这次是新的复查，我可没迟到两年。' }
  }
  if (id === 'c3_s3_wang_1' && state.dlc?.dsa?.done) {
    return { ...step, text: '这回不抢救啦。是你啊！上回导管室见过，这次按心内科约的来复查。药袋我都带着，先给你们看哪张？' }
  }
  if (id === 'c3_s3_xu_0' && (state.flags.mystery_told || state.dlc?.ch2?.done)) {
    return { ...step, text: '那个熟悉的男人又坐进诊室。梅姐核对申请单，你终于完整看到他的姓名：许建平。今天，他没有把挂号条压在名字上。' }
  }
  if (id === 'c3_s4_cost_1' && state.finished && state.stamps.includes(3)) {
    return { ...step, text: '你们两年前是不是就传“超声科耦合剂用量第一”？这回别光听八卦，帮我把人次和损耗算明白。' }
  }
  if (id === 'c3_s5_lei_2' && state.flags.c3_han_met) {
    return { ...step, text: '卷芯也还了，省得我找。韩经理补的清单收到了，东西还在院里；核对联我也留着。', effect: { ...step.effect, flag: 'c3_han_paper_followup' } }
  }
  return step
}

export const CH3: TrilogyChapter = {
  id: 'ch3', title: '回声', subtitle: '第三章 · 超声', icon: '◉', year: 2026,
  equipment: '超声设备与教学模体', background: 'bg_us_room_day',
  shifts: [
    { id: 'c3s1', title: '第一班 · 回声先回来', subtitle: '白班 · 探头收发 / A到B / 声影', date: '2026-11-02 · 白班', start: 'c3_s1_start_0', background: 'bg_us_room_day' },
    { id: 'c3s2', title: '第二班 · 看多深，补哪里', subtitle: '白班 · 频率 / 深度 / TGC / 表姐', date: '2026-11-04 · 白班', start: 'c3_s2_start_0', background: 'bg_us_room_day' },
    { id: 'c3s3', title: '第三班 · 跟着这一条线', subtitle: '下午至傍晚 · 心超 / M型 / 床旁', date: '2026-11-07 · 下午至晚间床旁班', start: 'c3_s3_start_0', background: 'bg_us_room_day' },
    { id: 'c3s4', title: '第四班 · 颜色跟谁比', subtitle: '白班 · 血流方向 / 多普勒频移', date: '2026-11-10 · 白班', start: 'c3_s4_start_0', background: 'bg_us_room_day' },
    { id: 'c3s5', title: '第五班 · 密一点，快一点', subtitle: '白班 · 采样与帧频 / 模体收尾 / 晨会', date: '2026-11-13 · 白班', start: 'c3_s5_start_0', background: 'bg_us_room_day' },
  ],
  steps, afterQuiz: 'c3_epilogue_0', cards, book, quiz, adapt,
  shopItems: [
    { id: 'c3_pocket_towel', name: '口袋小毛巾', price: 25, desc: '留在窗边教学台收拾桌面。台垫底下好像压着一张旧照片。', image: 'item_c3_towel_v2', use: 'c3_towel_used' },
    { id: 'c3_cup_stickers', name: '杯子姓名贴', price: 20, desc: '给休息室的杯子认主人。两只“梅”之外，也许还有第三只。', image: 'item_c3_stickers_v2', use: 'c3_stickers_used' },
  ],
  characters: {
    sys: { name: '', color: '#c4cedb' }, me: { name: '你', color: '#94c9f0' },
    mei: { name: '梅姐', color: '#efc58b', sprite: 'char_mei' },
    aunt: { name: '阿姨', color: '#deb99c', sprite: 'pat_aunt' },
    cousin: { name: '表姐', color: '#eab8c9', sprite: 'pat_cousin' },
    xu: { name: '许建平', color: '#bac8c0', sprite: 'pat_mystery' },
    wang: { name: '王叔', color: '#d1bf99', sprite: 'pat_wang_recovery' }, patient: { name: '腹痛患者', color: '#c4cedb' },
    han: { name: '韩经理', color: '#a9c5d0', sprite: 'char_han' },
    wen: { name: '雯雯', color: '#d7b9dc', sprite: 'char_wen' },
    lei: { name: '小雷', color: '#a9c7e0', sprite: 'char_lei' },
    zhou: { name: '老周', color: '#dfbb83', sprite: 'char_zhou' },
    he: { name: '小何', color: '#dfbcde', sprite: 'char_he' },
    tang: { name: '小唐', color: '#b3d2cb', sprite: 'char_tang' },
  },
  badges: {
    c3_first_probe: { name: '先选对探头', icon: '◉', desc: '完成第一次教学探头选择。' },
    c3_shadow_reader: { name: '读懂那道影', icon: '◐', desc: '观察胆囊结石与后方声影的关系。' },
    c3_stay_beside: { name: '陪她听完', icon: '♡', desc: '陪表姐听完评估与随访安排。' },
    c3_depth_keeper: { name: '留一点余地', icon: '↕', desc: '在模体上完成深度练习。' },
    c3_cart_ready: { name: '车推走之前', icon: '▣', desc: '完成床旁车设备准备探索。' },
    c3_aunt_returns: { name: '这只袋子留好', icon: '▱', desc: '把片袋交还阿姨，收到她的擦镜布。' },
    c3_second_angle: { name: '再换个角度', icon: '↻', desc: '跟随梅姐复核镜像伪影。' },
    c3_name_spoken: { name: '名字说完整', icon: '✉', desc: '听许建平说出父亲的全名。' },
    c3_gel_account: { name: '账算在这里', icon: '▤', desc: '完成耦合剂损耗与库存方案。' },
    c3_keep_the_record: { name: '核对不是交接', icon: '⌁', desc: '在回收清单上澄清范围与编号。' },
    c3_mei_pocket_card: { name: '梅姐的小卡', icon: '▧', desc: '在最后一班收到梅姐的探头小卡。' },
    c3_echo_apprentice: { name: '回声学徒', icon: '◎', desc: '完成教学模体上的跟班考核。' },
    c3_training_photo: { name: '抱模体的人', icon: '▧', desc: '使用口袋小毛巾整理教学台，找到梅姐的培训合照。' },
    c3_cup_detective: { name: '第三只梅杯', icon: '☕', desc: '使用姓名贴，认出梅姐那只只能当笔筒的奖品杯。' },
  },
  assets: [
    'bg_us_room', 'bg_us_room_day', 'bg_us_bedside', 'bg_us_bedside_day_v2', 'ch2_bg_breakroom_day', 'bg_waiting_day_v2', 'bg_office_day', 'bg_day',
    'char_mei', 'pat_cousin', 'char_han', 'pat_aunt', 'pat_mystery', 'pat_wang_recovery', 'char_lei', 'char_zhou', 'char_he', 'char_tang',
    'us_gallstone', 'us_breast', 'us_fetal', 'us_echo', 'us_mirror', 'item_missing_notice', 'item_reunion_gifts', 'item_notebook',
    'cg_c3_mei_probe_v2', 'cg_c3_shared_lunch_v2', 'item_c3_towel_v2', 'item_c3_stickers_v2',
  ],
}
