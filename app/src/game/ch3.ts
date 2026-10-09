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

function scene(prefix: string, lines: Line[], next?: string, bg = 'bg_us_room') {
  lines.forEach(([speaker, text, detail = {}], index) => {
    const automatic = detail.end || detail.choices || detail.tool ? undefined :
      index + 1 < lines.length ? `${prefix}_${index + 1}` : next
    put(`${prefix}_${index}`, { speaker, text, bg, sprite: portraits[speaker], next: automatic, ...detail })
  })
  return `${prefix}_0`
}

function exploration(prefix: string, lines: Line[], hub: string, bg = 'bg_us_room') {
  const final = lines[lines.length - 1]
  const detail = final[2] ?? {}
  final[2] = { ...detail, effect: { ...detail.effect, flag: `${prefix}_done` } }
  return scene(prefix, lines, hub, bg)
}

function hub(id: string, text: string, places: [string, string][], clinical: string, bg = 'bg_us_room') {
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
  ['sys', '2026年11月，超声科。你的两周跟班表上，被圈出了五个需要跟全的班。柜子比放射科窄，白大褂袖口还卡在门外。'],
  ['mei', '把袖子收进去。还没上班，先报废一件衣服？我是梅兰，大家喊梅姐。'],
  ['me', '院里说“一专多能”。我来之前看了两天书，现在主要会多紧张。'],
  ['mei', '挺好，知道紧张就不会见人就拿探头。病人我扫，你先管设备、记录，还有那块模体。'],
  ['sys', '她把教学模体推过来，又把临床探头收进自己的操作位。两张单子，一张是你的培训记录，一张是今晚的预约表。'],
  ['mei', '先熟悉地方。别把找不到纸巾也算设备故障。'],
], 'c3_s1_hub')
hub('c3_s1_hub', '晚间门诊还没开始。你有一点时间认路，也可以直接回诊室。', [
  ['看看教学台上的三支探头（1行动力）', 'c3_s1_probes'],
  ['去茶水间认杯子（1行动力）', 'c3_s1_tea'],
  ['到候诊区帮忙找预约号（1行动力）', 'c3_s1_wait'],
], 'c3_s1_aunt_0')
exploration('c3_s1_probes', [
  ['sys', '三个探头排在软垫上：长条、弧面、小小一块。你差点按“哪个顺手”来挑。'],
  ['mei', '先想看哪儿。浅表、腹部、肋间，窗口不一样。不是买鼠标，舒服就行。'],
  ['me', '那我先练浅表那块。模体不会嫌我找得慢。', { card: 'c3_probe', effect: { skill: 1 } }],
], 'c3_s1_hub')
exploration('c3_s1_tea', [
  ['mei', '这杯是我的，写着“梅”。那个写“梅”的也是我的，盖子坏了还没舍得扔。', { giftTo: 'mei' }],
  ['me', '我还以为超声科有两位梅姐。'],
  ['mei', '有两位就轮不到你来帮忙了。自己的杯子记个名字，别喝了洗探头的水。', { effect: { heart: 1 } }],
], 'c3_s1_hub', 'bg_breakroom')
exploration('c3_s1_wait', [
  ['sys', '候诊区一位阿姨把旧钼靶报告和今天的申请单夹在一起。她翻来翻去，只找到两年前的日期。'],
  ['me', '今天的号在后面这张。旧片也留着，医生要对照。'],
  ['aunt', '难怪我越翻越早。再翻两下，该翻回退休前了。', { effect: { heart: 1 } }],
], 'c3_s1_hub', 'bg_waiting')
scene('c3_s1_aunt', [
  ['sys', '开诊后，一位阿姨第一个进来。她先把旧片袋摊平，再把一袋买菜零钱塞回口袋。', { sprite: 'pat_aunt' }],
  ['aunt', '我按门诊医生说的来复查，钼靶报告也带着。你是这边新来的？'],
  ['mei', '放射科借来两周，还没学会找纸巾。您这次的申请单和以前的检查，我一起看。'],
  ['aunt', '两年前那次早做完了。这回是新的预约，我怕又拿错单，干脆全带来。'],
  ['sys', '你替她归好衣物，梅姐核对资料、询问情况。真正开始检查时，你退到显示器旁边。'],
  ['mei', '看这里。我握探头，你帮我调一下显示；先在教学画面上练一遍。'],
  ['sys', '你切到教学台的浅表模体。眼前不是阿姨的实时检查，梅姐等你把探头选好。', {
    tool: { kind: 'ultrasound', task: 'probe', title: '教学台 · 选择探头', prompt: '观察浅表目标，需要怎样的探头？', help: '试着比较线阵、凸阵、相控阵的视野。选完后，由梅姐带你对照实际检查。', next: 'c3_s1_aunt_7' },
  }],
  ['mei', '对，浅表目标适合先考虑高频线阵。位置更深时，还得权衡穿透，不能把“高频”当万能。', { card: 'c3_frequency', effect: { skill: 2, badge: 'c3_first_probe' } }],
  ['sys', '梅姐在临床机上继续检查。你只按她的指示调整显示，保存由她选定的切面。', { image: 'us_breast', imageLabel: '乳腺超声 · 梅姐完成的检查切面', caseId: 'c3_aunt' }],
  ['aunt', '这个也做了，是不是以前那张就不用看了？'],
  ['me', '旧片还得看。两种检查提供的东西不完全一样，梅姐正在一起对照。'],
  ['mei', '是这个意思。报告给门诊医生一起看，后面怎么安排，按这次复查结果来。'],
  ['aunt', '那我把袋子留好。买菜可以少拎一只袋，这只可不能扔。'],
  ['sys', '梅姐把新旧报告夹好。阿姨问过洗手间便走了，外面的空布袋却忘在椅子上；你记下姓名，交给窗口代存。', { effect: { heart: 2, flag: 'c3_aunt_reviewed' }, card: 'c3_breast' }],
], 'c3_s1_stone_0')
scene('c3_s1_stone', [
  ['sys', '晚些时候，急诊送来一位右上腹痛的患者。急诊医师已做初步评估，梅姐接过申请单，让你先检查设备状态。'],
  ['patient', '我刚才还觉得忍一忍就行，结果车一拐弯，疼得我把门把手都攥住了。'],
  ['mei', '我会尽量轻一些。不舒服就告诉我，不用憋着。'],
  ['sys', '她换了腹部探头。屏幕里，一个亮点后面拖着长长的暗影。', { image: 'us_gallstone', imageLabel: '腹部超声 · 当前切面', caseId: 'c3_gallstone' }],
  ['mei', '先说你看见什么。病名不急着抢答。', { choices: [
    { text: '有强回声，它后面的回声明显减少', next: 'c3_s1_shadow_good', effect: { skill: 1 } },
    { text: '后面黑了，是不是屏幕坏了一块', next: 'c3_s1_shadow_retry' },
  ] }],
], undefined)
put('c3_s1_shadow_good', { speaker: 'mei', sprite: 'char_mei', bg: 'bg_us_room', text: '观察得对。再换切面，看看这个关系是不是一直跟着它。', next: 'c3_s1_shadow_0' })
put('c3_s1_shadow_retry', { speaker: 'mei', sprite: 'char_mei', bg: 'bg_us_room', text: '先别喊小雷来修屏幕。你看，换了切面，暗影跟着亮点走，不是固定坏点。', next: 'c3_s1_shadow_0' })
scene('c3_s1_shadow', [
  ['sys', '梅姐改变扫查方向，亮点和暗影又出现了。你把她要的切面顺序保存下来。'],
  ['mei', '结合这些表现，这里考虑胆囊结石。疼痛要跟临床情况一起判断，我把报告送回急诊。', { card: 'c3_shadow', effect: { skill: 2, badge: 'c3_shadow_reader', flag: 'c3_gallstone_seen' } }],
  ['patient', '那我现在是不是就得开刀？'],
  ['mei', '先让急诊和相关医生结合症状评估。超声报告不能代替他们跟您商量治疗。'],
  ['sys', '患者被送回急诊。你把台面整理好，梅姐发现你还盯着那道黑影。'],
  ['me', '以前总想着图越亮越清楚。今天反倒是黑下去的地方帮了忙。'],
  ['mei', '所以别逮着增益就往上拧。下班前把模体练一遍，我看着。'],
  ['sys', '你回到教学台，把刚才那块模体摆正。患者已经离开，练习只在这块模体上进行。'],
], 'c3_s1_gain_0')
scene('c3_s1_gain', [
  ['me', '先把目标找全，再调到能分清边界。不能因为黑一点，就全推亮。'],
  ['mei', '来，自己试。你停下来比较一下，我比你更愿意等这几秒。', {
    tool: { kind: 'ultrasound', task: 'gain', title: '教学台 · 让层次回来', prompt: '调整模体画面的增益，比较暗区与目标边界。', help: '从太暗和太亮的两端各看一眼，再选择能保留层次的位置。接收增益不是发射功率。', next: 'c3_s1_gain_2' },
  }],
  ['mei', '这样好。你不是把目标变清楚了才找到它，而是把显示调到能观察它。下次还要结合实际画面判断。', { card: 'c3_gain', effect: { skill: 1 } }],
  ['sys', '第一班结束。你终于找到了纸巾柜，也记住了先描述、换方向，再核实判断。', { end: true, effect: { gold: 90, flag: 'c3_shift1_done' } }],
])

// Second shift: family closeness cannot replace the physician's explanation.
scene('c3_s2_start', [
  ['sys', '第二个跟班日，天还没黑透。表姐发来消息，说路上堵车，二十四周的预约快赶不上了。'],
  ['cousin', '别替我求情啊。我只是提前跟你报备，省得你回家说我又出门晚。', { communication: 'sms', sprite: undefined, phone: 'pat_cousin' }],
  ['me', '我还没回复，她又发来一张车流照片。照片边上，是一袋已经吃空的饼干。'],
  ['mei', '先把今天的机器准备好。亲戚来了也按流程，别把关系当预约号。'],
], 'c3_s2_hub', 'bg_us_room_day')
hub('c3_s2_hub', '白班收尾与夜班交接之间，诊室暂时空着。门外的电梯还在一层层往上走。', [
  ['陪梅姐看一眼排班表（1行动力）', 'c3_s2_roster'],
  ['跟小何分半袋饼干（1行动力）', 'c3_s2_he'],
  ['整理教学机的图像标签（1行动力）', 'c3_s2_label'],
], 'c3_s2_arrive_0', 'bg_us_room_day')
exploration('c3_s2_roster', [
  ['mei', '这儿写“休”，不等于我能休。旁边那个小括号，写的是院里培训。', { giftTo: 'mei' }],
  ['me', '括号比正文还厉害。'],
  ['mei', '你毕业论文不是也这样？正文一行，附表三页。', { effect: { heart: 1 } }],
], 'c3_s2_hub', 'bg_us_room_day')
exploration('c3_s2_he', [
  ['he', '听说你来这边了。我来送申请单，顺便看看叛逃人口伙食怎样。', { giftTo: 'he' }],
  ['me', '目前还在找纸巾，比放射科更考验空间定位。'],
  ['he', '留两块饼干。别等饿了才想起来，饼干也是有下班时间的。', { effect: { heart: 1, item: 'snack' } }],
], 'c3_s2_hub', 'bg_breakroom')
exploration('c3_s2_label', [
  ['sys', '教学文件夹里，一张图只写了“最好的一张”。你盯着它，完全想不起好在哪里。'],
  ['me', '我把探头、目标和深度写上了。下回至少不用猜这是哪一块模体。'],
  ['mei', '再留一个调整前版本。我想看你怎么改，不光想看你挑出的漂亮那张。', { card: 'c3_compare', effect: { skill: 1 } }],
], 'c3_s2_hub', 'bg_us_room_day')
scene('c3_s2_arrive', [
  ['sys', '表姐终于赶到，额前一层细汗。她先去窗口处理预约，没有直接往诊室里闯。', { bg: 'bg_waiting' }],
  ['cousin', '我今天原本提前一小时出门。每次这么说，听起来都像借口。', { bg: 'bg_waiting' }],
  ['mei', '临时加号不能我一句话就算。窗口确认过，后面这段能安排，按顺序来。'],
  ['cousin', '那我就放心等。你别陪着我站，站得我更像插队了。'],
  ['sys', '她坐下来，把那只饼干袋折成很小一块。轮到她时，梅姐先核对孕周与既往检查。'],
  ['cousin', '能不能顺便拍一张脸？家里人都问像谁，现在谁也没见过，已经吵起来了。'],
  ['mei', '先把该看的结构看全。脸要是肯转过来，再商量拍照，别让他当导演。'],
  ['sys', '梅姐握着探头扫查，先前的笑话慢慢停了。她回到一个二维切面，重新调整位置、测量。', { image: 'us_fetal', imageLabel: '胎儿二维超声 · 侧脑室测量切面', caseId: 'c3_cousin' }],
  ['cousin', '怎么又看这儿？是不是有问题？'],
  ['mei', '侧脑室这项测量在十毫米左右，到了轻度增宽的范围。我需要把脑部结构再详细看一遍。'],
  ['cousin', '“增宽”是说以后会怎么样？我刚才是不是不该只惦记那张脸？'],
  ['me', '你想看看宝宝的脸，没有做错什么。先听梅姐把现在知道的讲完。'],
  ['mei', '这一个数不能替我们预测所有事。接下来由产科、胎儿医学医生结合详细超声，讨论进一步检查和随访。', { card: 'c3_ventricle' }],
  ['sys', '表姐盯着屏幕，没有说话。你伸手想拿她的外套，又把手放下，等她自己开口。', { choices: [
    { text: '问她现在最想先听清哪件事', next: 'c3_s2_listen', effect: { heart: 2, flag: 'c3_cousin_listened' } },
    { text: '说“应该没事”，话出口又停住', next: 'c3_s2_promise' },
  ] }],
])
put('c3_s2_listen', { speaker: 'cousin', sprite: 'pat_cousin', bg: 'bg_us_room', text: '我想知道今天回家该做什么。不是查遍手机之后，连觉都不敢睡。', next: 'c3_s2_plan_0' })
put('c3_s2_promise', { speaker: 'me', bg: 'bg_us_room', text: '“一定没事”这句话太满，我收回。要不先请梅姐把下一次去哪儿、带什么，写清楚。', next: 'c3_s2_plan_0' })
scene('c3_s2_plan', [
  ['mei', '今晚先把报告交给产科医生。详细评估和复查的安排，他们会跟你一起定；有问题在门诊问清，不用回家自己拼诊断。'],
  ['cousin', '磁共振也要做吗？我听人说那台机器很吓人。'],
  ['mei', '胎儿MRI有时能补充信息，要看详细超声和专科评估，不是看到这个数字就人人立刻做。'],
  ['sys', '你把随访门诊的信息抄在空白处。梅姐复核后把报告递给表姐，没有用一张漂亮的三维脸照盖过那些需要说清的话。', { effect: { heart: 1, badge: 'c3_stay_beside', flag: 'c3_cousin_plan' } }],
  ['cousin', '我先去产科。你继续上班吧，等下班陪我吃点东西，别再聊数字了。'],
  ['sys', '她离开后，你坐回教学台。梅姐把刚才没有讲完的设备设置换到模体画面上。'],
  ['mei', '不是拿你表姐练手。现在看模体：目标都快挤出底边了，你准备怎么改？', {
    tool: { kind: 'ultrasound', task: 'depth', title: '教学台 · 调整显示深度', prompt: '让整个目标留在视野里，同时别留过多空白。', help: '深度控制显示范围。把目标及后方留出合理余量，再确认。', next: 'c3_s2_finish_0' },
  }],
])
scene('c3_s2_finish', [
  ['mei', '这样能看全，目标也没有缩成一个小点。今天你盯着家人的报告，手比第一班还紧。', { card: 'c3_depth', effect: { skill: 2, badge: 'c3_depth_keeper' } }],
  ['me', '第一班我只想把参数调对。今天才发现，等着看结果的时候，几秒也很长。'],
  ['mei', '所以该核对的不能省，也别让人干等。把进展告诉她，这个你现在就能做。'],
  ['sys', '这一班结束时，表姐发来一句“我在楼下”。没有标点，后面跟着一家粥店的位置。', { end: true, effect: { gold: 100, flag: 'c3_shift2_done' } }],
])

// Third shift: a recovering heart, an optical-looking scare, and a name finally spoken.
scene('c3_s3_start', [
  ['sys', '第三班要去床旁。你把移动超声推到门口，轮子刚响两声，梅姐就在后面喊停。'],
  ['mei', '电量、探头、耗材。别到病区才发现，推了一台大号电视过去。'],
  ['me', '都核对了。就是这只轮子有意见。'],
  ['mei', '轮子的意见回来报修。路上慢点，别让它先到病区。'],
], 'c3_s3_hub', 'bg_us_bedside')
hub('c3_s3_hub', '床旁会诊还有几分钟才集合。你把车停稳，没有把走廊堵住。', [
  ['听小唐说一句床旁交接（1行动力）', 'c3_s3_tang'],
  ['检查移动机的电源和线缆（1行动力）', 'c3_s3_cart'],
  ['去窗口看看寄存的布袋（1行动力）', 'c3_s3_bag'],
], 'c3_s3_wang_0', 'bg_us_bedside')
exploration('c3_s3_tang', [
  ['tang', '你负责推车？转弯留点地方。上回我被人用仪器车追了半层楼。', { giftTo: 'tang' }],
  ['me', '车已经检查过了，接下来重点检查我。'],
  ['tang', '到床边先跟当班同事对上人和任务。别看床号熟，就自信地开始忙。', { effect: { skill: 1 } }],
], 'c3_s3_hub', 'bg_corridor')
exploration('c3_s3_cart', [
  ['sys', '你把电源线从轮子旁收起，检查外观和电量。备用线在侧袋，不在你想当然的抽屉里。'],
  ['mei', '这回好，少一个人蹲在床底下找插座。'],
  ['me', '我把侧袋贴上标签。下个推车的人也不用跟它猜谜。', { card: 'c3_bedside', effect: { skill: 1, badge: 'c3_cart_ready' } }],
], 'c3_s3_hub', 'bg_us_bedside')
exploration('c3_s3_bag', [
  ['aunt', '前几天走得急，外面这个空布袋落下了。窗口说你替我放好了，我过来拿一下。'],
  ['me', '给您。您当时把片子拿走了，我还松了口气，不然得让您多跑一趟。'],
  ['aunt', '送你块新的擦镜布，我自己缝的小边。擦眼镜、擦手机都行，可不是擦探头的。', { image: 'item_reunion_gifts', effect: { heart: 2, item: 'c3_aunt_cloth', badge: 'c3_aunt_returns' } }],
], 'c3_s3_hub', 'bg_waiting')
scene('c3_s3_wang', [
  ['sys', '出发前，梅姐先完成一位复诊患者的心超。王叔把药袋放在椅子上，坐下又马上站起来。', { sprite: 'pat_wang_recovery' }],
  ['wang', '我按心内科安排来复查。躺哪边？上回住院之后，我看见检查床就容易忙乱。'],
  ['mei', '先别急，资料给我。今天看看心脏的结构和功能，结果交给心内科一起评估。'],
  ['wang', '我现在散步，走到菜场就往回拐。不是医生不让，是再走两步就忍不住买烧饼。'],
  ['me', '那您的路线设计，很考验意志力。'],
  ['sys', '梅姐完成必要核对，持探头寻找心脏切面。屏幕里的瓣膜来回开合，你负责按指示留存图像。', { image: 'us_echo', imageLabel: '超声心动图 · 心脏结构与运动', caseId: 'c3_wang' }],
  ['wang', '这个能看见我支架里面通不通吗？'],
  ['mei', '这次心超主要看结构、运动和功能，不是直接给冠脉支架拍通畅证明。心内科会结合症状和其他资料判断。', { card: 'c3_echo' }],
  ['sys', '检查完成，王叔把药袋放回衣兜，又确认了一遍复诊窗口。他没让你替他改药，你也没有抢着给他一个数字。', { effect: { heart: 1, flag: 'c3_wang_reviewed' } }],
  ['wang', '谢谢。走了，这回我先去门诊，不去菜场。'],
], 'c3_s3_mirror_0')
scene('c3_s3_mirror', [
  ['sys', '随后你们推车去重症病区。床旁医师说明会诊问题，梅姐核对患者后开始检查，你留在设备侧。', { bg: 'bg_us_bedside' }],
  ['sys', '病房只留着几盏灯。屏幕上，膈肌上方竟然又出现了一块像肝脏的结构。', { bg: 'bg_us_bedside', image: 'us_mirror', imageLabel: '床旁超声 · 膈肌附近的重复影像' }],
  ['me', '等一下，上面那块……这里怎么还有一份？', { bg: 'bg_us_bedside' }],
  ['mei', '先别把病房叫醒。你想先怎么核实？', { bg: 'bg_us_bedside', choices: [
    { text: '请梅姐换一个扫查角度，观察它是否变化', next: 'c3_s3_mirror_check', effect: { skill: 1 } },
    { text: '先把“胸腔内占位”记进结果', next: 'c3_s3_mirror_wait' },
  ] }],
])
put('c3_s3_mirror_check', { speaker: 'mei', sprite: 'char_mei', bg: 'bg_us_bedside', text: '对，先验证。你记下现象，我来换声窗，别只拿这一帧下结论。', next: 'c3_s3_mirror_end_0' })
put('c3_s3_mirror_wait', { speaker: 'mei', sprite: 'char_mei', bg: 'bg_us_bedside', text: '先别写那个结论。把它描述为重复影像，我们换声窗再看。', next: 'c3_s3_mirror_end_0' })
scene('c3_s3_mirror_end', [
  ['sys', '梅姐调整角度，那份“多出来的肝脏”随之变化。她又从别的声窗核对，没有急着结束检查。'],
  ['mei', '这里是镜像伪影。强反射界面让一部分回声绕了路，机器按原来的路线估计位置，就画错了地方。', { card: 'c3_mirror', effect: { skill: 2, badge: 'c3_second_angle' } }],
  ['me', '幸好我刚才只说“等一下”，没喊出病名。'],
  ['mei', '以后也可以说等一下。别以为年资长了，就不能把问题拿出来复核。'],
], 'c3_s3_waiting_0', 'bg_us_bedside')
scene('c3_s3_waiting', [
  ['sys', '回到超声科，表姐来取专科随访资料。座位只空着一把，她坐在一位穿旧夹克的男人旁边。'],
  ['cousin', '您也是来复查的？'],
  ['xu', '消化内科开的检查。没约到白天，就到晚上来。'],
  ['cousin', '我现在一听见医生停顿，就忍不住胡思乱想。'],
  ['xu', '我以前开夜班长途，车里一安静，也总想回头看看。后来发现，乘客只是睡着了。'],
  ['sys', '表姐笑了一下，手仍按着文件袋。男人没有追问她的报告，她也没问他的。'],
], 'c3_s3_xu_0', 'bg_waiting')
scene('c3_s3_xu', [
  ['sys', '轮到男人时，梅姐核对申请单。姓名栏这回没有被挂号条挡住：许建平。'],
  ['xu', '我退休了，以前开长途客车。这些年也不是只来做检查，还想打听个人。'],
  ['mei', '先把今天的检查完成，身体上的事一样得认真。别的事，待会儿坐下说。'],
  ['sys', '腹部检查由梅姐完成，仅见一个约三毫米的胆囊息肉样病变。她结合资料写好报告，交代回开单门诊评估、按医嘱随访。', { effect: { flag: 'c3_xu_third_visit' } }],
  ['xu', '我父亲叫许守义。1998年离开家，最后有人见到他，是在这家医院。'],
  ['me', '你是想找当年的住院记录？'],
  ['xu', '记录，人，谁还记得都行。我以前跑车，总说下一趟回来再找，路越跑越远，能问的人却越来越少。'],
  ['me', '我可以告诉您正式查询要走哪里。涉及旧病历，需要您的材料和院里核验，我不能私下翻给您。'],
  ['xu', '我有寻人启事，下回来带。不是让你偷偷找，我想把名字说完整。', { effect: { heart: 2, flag: 'c3_xu_identity', badge: 'c3_name_spoken' } }],
  ['sys', '这一班结束，你把移动机接回电源。纸上多了两个名字，没有多出一个凭空拼好的答案。', { end: true, effect: { gold: 110, flag: 'c3_shift3_done' } }],
])

// Fourth shift: an ordinary procurement problem and an overly inclusive collection form.
scene('c3_s4_start', [
  ['sys', '第四班，耗材领用单比预约表还长。梅姐把计算器推给你，自己去核对下一位患者的申请。'],
  ['mei', '财务又问耦合剂怎么用这么多。别急着替我喊冤，先把箱数和人次算明白。'],
  ['me', '原来“会调机器”还包括“会按计算器”。'],
  ['mei', '按错机器费钱，按错计算器也费钱。你挑一个擅长的。'],
], 'c3_s4_hub')
hub('c3_s4_hub', '新一批物资刚送到，整改组的人还在楼下登记。诊室留出了一小段整理时间。', [
  ['找小雷借标签机（1行动力）', 'c3_s4_lei'],
  ['和梅姐拆新包装（1行动力）', 'c3_s4_pack'],
  ['给老周回个电话（1行动力）', 'c3_s4_zhou'],
], 'c3_s4_cost_0')
exploration('c3_s4_lei', [
  ['lei', '标签机借你，别像上次那个人，打一张“标签机”，然后把卷用完了。', { giftTo: 'lei' }],
  ['me', '我只打开封日期和批次。卷芯也还你。'],
  ['lei', '卷芯留着吧。这卷是我多买的，给你们。设备叫谁，出问题时总得说得清。', { image: 'item_notebook', effect: { skill: 1, item: 'c3_lei_label_roll' } }],
], 'c3_s4_hub', 'bg_breakroom')
exploration('c3_s4_pack', [
  ['mei', '这边普通外用，这边无菌单包，别因为外包装差不多，就塞进同一个格子。', { giftTo: 'mei' }],
  ['me', '我把适用范围和领用位置分开写，价格另放一栏。'],
  ['mei', '对。不能看到便宜就全换，也不能看到贵就觉得处处都该用。', { card: 'c3_gel', effect: { skill: 1 } }],
], 'c3_s4_hub')
exploration('c3_s4_zhou', [
  ['zhou', '在超声科怎么样？还找得到食堂吗？', { communication: 'call', sprite: undefined, phone: 'char_zhou' }],
  ['me', '找得到。就是他们那边的饭点，和饭点没什么关系。', { communication: 'call' }],
  ['zhou', '这倒跟咱们一个专业。周末回来，给我讲讲推车那只轮子修好了没。', { communication: 'call', sprite: undefined, phone: 'char_zhou', effect: { heart: 1 } }],
], 'c3_s4_hub', 'bg_corridor')
scene('c3_s4_cost', [
  ['sys', '你把三个月的数据摊开。总金额上去了，但门诊与床旁检查的人次也增加了。另有一批旧包装到了使用期限，报废单单独放着。'],
  ['mei', '看清楚再提方案。不是每个“用掉了”都等于“给患者用了”。'],
  ['me', '那先把采购量、实际领用、过期损耗拆开？'],
  ['mei', '你终于没上来就说“每个人少挤一点”。', { choices: [
    { text: '按检查用途和人次核对，调整订货与库存', next: 'c3_s4_cost_right', effect: { wealth: 2, flag: 'c3_gel_ledger' } },
    { text: '先给每次检查设一个固定小额度', next: 'c3_s4_cost_limit' },
    { text: '把剩下的都灌进一个大瓶，减少报废', next: 'c3_s4_cost_mix' },
  ] }],
])
put('c3_s4_cost_right', { speaker: 'mei', sprite: 'char_mei', bg: 'bg_us_room', text: '这个能做。把正常消耗和可减少的损耗分开，我拿去跟财务谈，别拿图像质量和感染防控去凑节约数。', next: 'c3_s4_cost_end_0' })
put('c3_s4_cost_limit', { speaker: 'mei', sprite: 'char_mei', bg: 'bg_us_room', text: '接触不好还得补，死额度会逼人糊弄。先看看订多、放错、过期这些能不能减少。', next: 'c3_s4_cost_end_0' })
put('c3_s4_cost_mix', { speaker: 'mei', sprite: 'char_mei', bg: 'bg_us_room', text: '停，别混装和补灌。包装、开封和用途都要按产品要求与院感流程。省下几瓶，不能多出一笔说不清的风险。', next: 'c3_s4_cost_end_0' })
scene('c3_s4_cost_end', [
  ['sys', '你们重新分了货架，按预计用量调整订货。梅姐把加温设备的说明书也找出来，核对适用产品与清洁要求，不再凭“摸着不烫”判断。'],
  ['mei', '这一版给财务。没有立刻省出一台机器，先少报废几箱，也算干了件实事。', { effect: { wealth: 1, badge: 'c3_gel_account' } }],
  ['sys', '敲门声响起。一个穿深色衬衫的男人在门口出示工作证，没有越过诊室门槛。'],
  ['han', '打扰，我姓韩，厂家数据项目这边的负责人。今天配合整改做设备清单核对，不碰临床机器。'],
  ['mei', '临床还在用，技术的事等这一位结束。你先去办公室找小雷，登记一下。'],
  ['han', '没问题。我们也希望把去年遗留的服务范围理清，免得大家反复解释。'],
  ['sys', '他把一份回收清单留在门边，页签贴得很整齐。其中一项写着“旧终端及相关留存件”。'],
], 'c3_s4_han_0')
scene('c3_s4_han', [
  ['sys', '检查间歇，你去办公室递清单。小雷核对着编号，韩经理把笔盖扣上，又拔下来。', { bg: 'bg_office' }],
  ['lei', '先对**试运行那批的编号**。相关留存件，具体列到哪一份？', { bg: 'bg_office' }],
  ['han', '旧终端的配套存储、备件之类。统一回收，免得留在各科没人管。', { bg: 'bg_office' }],
  ['me', '这张表现在是核对，还是签了就允许带走？', { bg: 'bg_office' }],
  ['han', '今天先核对。处置当然还要走你们院里的流程。', { bg: 'bg_office', choices: [
    { text: '把“仅核对，未交接”写清，请他补列每件编号', next: 'c3_s4_han_note', effect: { skill: 1, flag: 'c3_han_scope_recorded' } },
    { text: '先把模糊条目交给小雷确认，不代签交接', next: 'c3_s4_han_ask', effect: { heart: 1 } },
  ] }],
])
put('c3_s4_han_note', { speaker: 'lei', sprite: 'char_lei', bg: 'bg_office', text: '就这么写。现在的记录与待处理设备各有去处，不能一栏“旧件”把它们一起装箱。', card: 'c3_trace', effect: { badge: 'c3_keep_the_record' }, next: 'c3_s4_han_end_0' })
put('c3_s4_han_ask', { speaker: 'lei', sprite: 'char_lei', bg: 'bg_office', text: '交我核对就好。你没有现场交接权限，不签很正常，不用先替所有人把事情办完。', card: 'c3_trace', next: 'c3_s4_han_end_0' })
scene('c3_s4_han_end', [
  ['han', '那我重列一版，正式走院方确认。今天我就不带东西了。'],
  ['sys', '他收回未签的回收联，核对联留在桌上。两张纸的页脚编号相同，“留存件”三个字也还在。'],
  ['lei', '你继续轮转吧。需要你说明的现场情况我会找你，其他事我跟院里对。'],
  ['me', '刚才他拿错了一次联单？'],
  ['lei', '可能。他这张只列了终端。我再问问，**最早那版项目附件**算不算在里面。', { effect: { flag: 'c3_han_met' } }],
  ['sys', '回到超声科，梅姐的账已经算完。她把计算器推给你：“复核一下。韩经理的表要认真，这一张也一样。”', { bg: 'bg_us_room' }],
  ['sys', '第四班结束，货架腾出了一个空格。旧终端没有被带走，清单也没有被你塞进废纸箱。', { bg: 'bg_us_room', end: true, effect: { gold: 110, flag: 'c3_shift4_done' } }],
], undefined, 'bg_office')

// The known caller and the old anonymous number are not identified as the same
// person here. Chapter five must verify the sender independently.
steps.c3_s4_han_end_4.next = 'c3_s4_wen_0'
scene('c3_s4_wen', [
  ['sys', '刚把清单放回桌上，手机亮了。来电显示是雯雯；走廊另一头，还能听见韩经理等电梯的声音。', { communication: 'call' }],
  ['wen', '回收单到你们那儿了？我只问一句，写没写**包括备份**？', { communication: 'call', sprite: undefined, phone: 'char_wen' }],
  ['me', '核对联留下了，回收联没签。到底要收什么，还得重列。', { communication: 'call' }],
  ['wen', '那就好。以后有人问，照原样说。新版附件，我这边也留着。', { communication: 'call', sprite: undefined, phone: 'char_wen' }],
  ['sys', '她像是还要说什么，停了一下，只说“先忙吧”。你在核对单旁记下通话时间，没有替她补上没说的话。', { effect: { flag: 'c3_wen_copy_kept' } }],
], 'c3_s4_han_end_5', 'bg_office')

// Fifth shift and the post-quiz ending are deliberately separated by the settlement page.
scene('c3_s5_start', [
  ['sys', '最后一个跟班日。梅姐把教学模体摆到台中央，没有像第一天那样替你把线理好。'],
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
  ['me', '搬倒不难，难的是看见一团亮就想说出个病名。'],
  ['zhou', '以后带新人，记得你自己也有这一阵。对了，下周饭堂换窗口，别又走错。', { effect: { heart: 1 } }],
], 'c3_s5_hub', 'bg_corridor')
exploration('c3_s5_lei', [
  ['lei', '标签机还得这么准时，我都有点不习惯。', { giftTo: 'lei' }],
  ['me', '里面还剩一截。没给机子起名，也没给你打奖状。'],
  ['lei', '行。韩经理补交的清单我收到了，仍然只走核对，东西还在院里。', { effect: { heart: 1, flag: 'c3_han_paper_followup' } }],
], 'c3_s5_hub', 'bg_breakroom')
exploration('c3_s5_mei', [
  ['mei', '这块模体又被擦得亮晶晶的。你不会以为擦得干净能加考核分吧？', { giftTo: 'mei' }],
  ['me', '本来只想少扣一点。'],
  ['mei', '我给你一张自己用的探头小卡，没写标准答案，写的是先问什么。别跟银行卡放一起洗了。', { image: 'item_notebook', effect: { heart: 2, item: 'c3_mei_probe_card', badge: 'c3_mei_pocket_card' } }],
], 'c3_s5_hub', 'bg_us_room_day')
scene('c3_s5_assess', [
  ['sys', '你核对设备与教学任务，在记录上写明模体，不把练习混进临床文件夹。梅姐点点头，没替你接下一步。'],
  ['mei', '目标就在这块浅表模体里。选好探头，再看显示。', {
    tool: { kind: 'ultrasound', task: 'probe', title: '跟班考核 · 探头与目标', prompt: '为教学模体里的浅表目标选择探头。', help: '先看目标深浅和需要的视野，不凭探头外形顺不顺手。', next: 'c3_s5_assess_2' },
  }],
  ['me', '目标找到了。可我刚才把增益留得太高，暗区也跟着亮了。'],
  ['mei', '你自己调，我先不说。', {
    tool: { kind: 'ultrasound', task: 'gain', title: '跟班考核 · 调整增益', prompt: '让目标边界可辨，同时保留该有的明暗层次。', help: '增益调整接收后的显示强弱。太暗漏细节，太亮会淹没层次；不是越亮越好。', next: 'c3_s5_assess_4' },
  }],
  ['sys', '你保留调整前后的画面，注明设置。梅姐从头核对一遍，在培训记录上签下名字。', { card: 'c3_gain', effect: { skill: 3, badge: 'c3_echo_apprentice', flag: 'c3_practice_passed' } }],
  ['mei', '可以。这是跟班考核通过，不是从明天起你就能自己开超声门诊。'],
  ['me', '我知道。纸巾的位置倒是可以独立回答了。'],
  ['mei', '这项满分。去候诊区吧，有人带了一大摞纸等你。'],
], 'c3_s5_notice_0', 'bg_us_room_day')
scene('c3_s5_notice', [
  ['sys', '许建平从文件袋里取出一张旧寻人启事。边角磨得发白，新贴的透明胶压住一道裂口。', { image: 'item_missing_notice' }],
  ['xu', '这是许守义，我父亲。1998年那张原件太薄了，这张是后来照着重印的，名字和事情没改。'],
  ['me', '最后出现的地点写着县医院。您以前找到过哪个部门？'],
  ['xu', '找过门诊，也问过住院处。那阵子我跑长途，他说不舒服，我还嫌他老念叨。出门前吵了一架，后来就没回来。'],
  ['sys', '你请他确认愿意留下哪些资料。他用指尖按住父亲的名字，停了一会儿，点头。', { choices: [
    { text: '陪他到正式受理窗口，先核对查询所需材料', next: 'c3_s5_notice_desk', effect: { heart: 1, flag: 'c3_xu_query_assisted' } },
    { text: '把受理窗口和联系人写给他，约好补材料', next: 'c3_s5_notice_route', effect: { heart: 1 } },
  ] }],
], undefined, 'bg_waiting')
put('c3_s5_notice_desk', { speaker: 'sys', bg: 'bg_office_day', text: '你陪他找到负责旧病历查询的窗口。工作人员按授权与身份材料登记了请求，没有当场翻出一份“正好就是”的记录。', next: 'c3_s5_notice_end_0' })
put('c3_s5_notice_route', { speaker: 'sys', bg: 'bg_waiting', text: '你把材料清单和窗口位置写清，许建平自己打电话确认了受理时间。他把纸折好，这次没有塞进旧报告中间。', next: 'c3_s5_notice_end_0' })
scene('c3_s5_notice_end', [
  ['xu', '这份复印件你可以留下，只用于帮我对这件事。查不到也告诉我，别因为怕我难受就一直拖着。', { image: 'item_missing_notice', effect: { item: 'c3_missing_copy', flag: 'c3_missing_notice' } }],
  ['me', '好。有消息先跟您核对，我们不拿一张像的照片就下结论。'],
  ['xu', '我总想着，先找到那张片，才知道他当时是不是在跟我说真的。拖着拖着，我自己也老了。'],
  ['sys', '他收好原件离开。你在受理记录旁写下今天日期，没有在任何别人的旧片上擅自填上许守义三个字。'],
  ['mei', '回来了？把考核资料收好，待会儿还有五道晨会题。别用力过猛，选择题也想给我写三页。'],
  ['sys', '五班跟班完成。先把这一班的账、物品与书页整理好；准备好后，再去晨会考核。', { end: true, effect: { gold: 120, flag: 'c3_shift5_done' } }],
], undefined, 'bg_waiting')

// The quiz returns here, rather than skipping directly to a certificate.
scene('c3_epilogue', [
  ['sys', '晨会散场，你把笔放回口袋。梅姐没有问你得了几分，先问：“早饭吃了没？”', { bg: 'bg_us_room_day' }],
  ['me', '考前吃了半个包子，另一半一直在等考后。', { bg: 'bg_us_room_day' }],
  ['mei', '那它比你有耐心。拿走吧，别把最后一天过成胃痛会诊。', { bg: 'bg_us_room_day' }],
  ['sys', '她在你的培训记录后夹上一份自己整理的参数复盘页。没有夸张的评语，只有几个被圈出来的具体问题。', { bg: 'bg_us_room_day', image: 'item_notebook', effect: { heart: 1, flag: 'c3_mei_feedback' } }],
  ['mei', '以后碰见，再拿出来问。我不一定接得起电话，但看见会回。', { bg: 'bg_us_room_day' }],
  ['sys', '几天后，专科医生结合表姐的详细检查和咨询，安排她到市里补充胎儿MRI。你调好休息，陪她坐早班车。', { bg: 'bg_day' }],
  ['cousin', '这次我提前两个小时出门。你别笑，我已经把堵车的钱都算进车票了。', { bg: 'bg_day' }],
  ['me', '我没笑。我在想早餐是不是也算进去了。', { bg: 'bg_day' }],
  ['sys', '到市里后，工作人员重新核对资料与安全信息。轮到表姐时，你留在等候区，没有跟着闯进检查室。', { bg: 'bg_waiting' }],
  ['cousin', '手机替我拿着。要是家里问，就说我在按计划检查，别帮他们直播每一分钟。', { bg: 'bg_waiting' }],
  ['sys', '你把手机静音。墙上的钟走得很慢，叫号屏换了好几次名字。', { bg: 'bg_waiting' }],
  ['sys', '随后，专科医生结合MRI与已有检查解释：这次未见其他中枢结构异常。后续仍按约复查超声，不能用一句“全正常”把随访划掉。', { bg: 'bg_waiting' }],
  ['cousin', '好，那我们把下次时间记上。今天先吃饭，我真的饿了。', { bg: 'bg_waiting' }],
  ['me', '吃。菜单上的数字，今天你来决定。', { bg: 'bg_day' }],
  ['sys', '之后的超声随访显示测量稳定。表姐发来新消息，前半段是复查安排，后半段已经在问哪种婴儿车能进老楼电梯。', { bg: 'bg_day', effect: { flag: 'c3_cousin_followup_stable' } }],
  ['sys', '回院那天，老周正看新设备论证材料。听见你说起市里的MRI，他把笔往耳后一夹。', { bg: 'bg_office_day' }],
  ['zhou', '咱们明年那台，也该从传闻变成真东西了。先把场地和人准备好，可不是机器进门就能开张。', { bg: 'bg_office_day' }],
  ['me', '等它真到了，我应该不会只站在门口看热闹了。', { bg: 'bg_office_day' }],
  ['sys', '另一边，许建平补齐了查询材料。旧档受理窗口答应继续核对可能的转诊记录，还没有给出父亲去向。', { bg: 'bg_office_day', effect: { flag: 'c3_xu_query_started' } }],
  ['sys', '韩经理送来的新版核对单，被小雷与原单放进同一个文件夹。小雷翻到末页，问了一遍“最早的附件呢”；那一页暂时还没补齐。', { bg: 'bg_office_day' }],
  ['sys', '你走出办公室，听见超声科又叫了一个号。窗外天亮着，下一班还没有开始。第三章「回声」结束。', { bg: 'bg_day', end: true, effect: { flag: 'c3_completed' } }],
])

const cards: TrilogyChapter['cards'] = {
  c3_probe: { title: '先问目标在哪儿', body: '探头选择要结合目标深度、所需分辨率、声窗与检查目的。线阵、凸阵、相控阵有各自适用的视野，不能只按外形大小选。' },
  c3_frequency: { title: '高频不是万能', body: '在其他条件相近时，高频有利于分辨细节，却更容易衰减。浅表与深部目标需要不同权衡。', image: 'us_breast' },
  c3_breast: { title: '旧片与新切面', body: '乳腺超声与钼靶提供的信息有差别，需要结合病史、既往影像和本次发现。增加一种检查不等于把原检查作废。', image: 'us_breast' },
  c3_shadow: { title: '亮点后面的暗影', body: '强回声后的声影可以提供线索。需要换切面、结合其他征象与临床问题核实，不只凭“有个亮点”下结论。', image: 'us_gallstone' },
  c3_compare: { title: '留下调整前', body: '教学对照保留同一目标的调整前后画面与设置，才能说明改变了什么。只挑最好看的一张，不足以复盘过程。' },
  c3_ventricle: { title: '一个测量之后', body: '胎儿侧脑室约10–12毫米属于轻度增宽范围，需要详细评估及随访。是否补充MRI由专科结合已有检查决定；一个数字不等于完整预后。', image: 'us_fetal' },
  c3_depth: { title: '深度是显示范围', body: '深度太浅可能截掉目标，太深又会把目标压得很小。调整要保留目标及所需周边，不是把空白全部消掉。' },
  c3_bedside: { title: '车推走之前', body: '床旁前确认任务、设备电量、探头与耗材；到场再与负责团队核对患者和检查问题。设备准备不替代临床交接。' },
  c3_echo: { title: '心超回答什么', body: '超声心动图观察心脏结构、运动与功能等。它不是常规直接判断冠脉支架是否通畅的证明，复诊仍要结合症状和相关检查。', image: 'us_echo' },
  c3_mirror: { title: '回声绕了一次路', body: '强反射界面可能使回声走更复杂的路径，位置估计因此出现镜像伪影。改变声窗与角度、结合解剖和其他切面复核。', image: 'us_mirror' },
  c3_gel: { title: '省在损耗，不省在要求', body: '耦合剂与探头处理应符合检查用途、产品说明及院感要求。不混装补灌，不用统一“小额度”替代实际接触需要；库存和过期损耗可以单独改善。' },
  c3_trace: { title: '核对不等于交接', body: '设备核对单应写清编号、当前状态、范围和签字含义。留存证据与待回收设备不能用一个笼统条目代替；不擅自删除或移交。' },
  c3_gain: { title: '增益不生产新信息', body: '接收增益改变回声信号的显示强弱。过高可能淹没明暗层次，过低可能漏掉弱回声；不等于更大的发射功率。' },
}

const book: TrilogyChapter['book'] = [
  { title: '01 · 探头先是换能器', body: '压电材料把电脉冲变成机械振动，也把返回的机械振动变成电信号。屏幕不是相机直接拍到的内部照片。梅姐在页边写：先检查探头和线，再骂机器。' },
  { title: '02 · 界面为什么会亮', body: '不同介质的声阻抗差异会影响反射与透射。角度、衰减和系统设置也参与画面形成，不能简单说“越密越白”。' },
  { title: '03 · 频率与深度要商量', body: '高频有利于细节分辨，但衰减通常更明显。寻找深部目标时需要考虑穿透能力，探头选择还要看声窗与检查目的。' },
  { title: '04 · 黑影也有用', body: '胆囊内强回声及其后方声影是本班观察线索。梅姐换切面复核后再结合临床判断；你保存的是证据，不是只记一个病名。' },
  { title: '05 · 有了胶，才接得上', body: '空气会妨碍探头与皮肤之间的有效声耦合。耦合剂减少这一影响，实际用量应满足接触需要，不能为了账面好看故意造成耦合不良。' },
  { title: '06 · 不是越亮越好', body: '接收增益改变显示强弱，不会凭空增加组织信息。把暗区也调成一片亮，会损失原来可见的层次。' },
  { title: '07 · 不要把目标挤出屏幕', body: '显示深度过浅可能切掉目标，过深又会让目标占据的画面过小。根据要观察的结构和必要周边调整。' },
  { title: '08 · 一张脸不是一次排畸', body: '三维或四维呈现不能替代规范二维切面及结构评估。侧脑室的测量需要适当切面与准确放置测量标记，不靠面部照片判断。' },
  { title: '09 · 同一个人，不同的问题', body: '王叔的心超用于了解心脏结构与功能等，不等于直接观察冠脉支架内部。先理解开单问题，再理解这一检查能回答到哪里。' },
  { title: '10 · 床旁车不是旅行箱', body: '电量、探头、耗材、线缆与通道都要在出发前准备。到场后与当班团队核对患者及任务，不因床号熟悉而略过交接。' },
  { title: '11 · 那一份多出来的肝脏', body: '声波经强反射界面绕路，可能造成镜像伪影。单帧看上去“真有一个结构”，不代表解剖上就在那里。' },
  { title: '12 · 换个声窗再说', body: '改变角度、声窗，结合其他切面和解剖连续性，是核实疑似伪影的重要方法。要求复核不等于承认失败。' },
  { title: '13 · 总量不是每次用量', body: '采购增加可能来自检查量、用途结构、价格或损耗变化。先分清购买、领用、实际消耗与报废，再提出有依据的节约方案。' },
  { title: '14 · 包装上也有条件', body: '无菌单包与普通外用产品不能仅凭价格互换。开启、储存、加温与探头清洁消毒要按产品说明及院感流程，不套一句通用“每周消毒”。' },
  { title: '15 · 一张单的两个动作', body: '核对数量、状态，与同意设备转移是两件事。表格写“已核对”不能自动解释成“已移交”；不明条目请负责人澄清。' },
  { title: '16 · 知道什么，就写什么', body: '记录现场实际留下的联单、编号和时间。不把怀疑写成事实，也不因为对方态度客气就代签权限以外的处置。' },
  { title: '17 · 模体的分数', body: '教学模体让学习者安全比较探头和参数。练习通过说明完成相应教学任务，不自动获得独立对患者扫查、诊断或签报告的资格。' },
  { title: '18 · 数据的前后两张', body: '保留调整前后画面、相同目标及设置，能帮助复盘。重现条件比只收藏一张最清晰的截图更有用。' },
  { title: '19 · 一项异常之后', body: '轻度侧脑室增宽需要详细评估与后续观察。专科会结合已有资料讨论其他检查；补充MRI没有替代原有随访。' },
  { title: '20 · 复查不是重播', body: '复查需要对照时间、临床变化与既往结果。阿姨带来旧钼靶，王叔带来心内科资料，表姐按约随访：他们不是从零开始的“新病例”。' },
]

const quiz: TrilogyChapter['quiz'] = [
  { q: '浅表目标需要较高细节分辨率，通常优先考虑哪种探头？', options: ['只按哪个最轻来选', '高频线阵探头', '无论深浅都用最低频', '任何探头完全一样'], answer: 1, explain: '浅表目标常用高频线阵；仍需结合具体任务与声窗。' },
  { q: '整体增益开得过高，最可能看到什么？', options: ['发射功率一定增加', '目标真实体积变大', '暗区被抬亮，明暗层次受影响', '所有伪影消失'], answer: 2, explain: '接收增益影响显示强弱，不等于改变目标或发射功率。' },
  { q: '模体目标底部被画面截掉，首先应检查哪项显示设置？', options: ['深度', '患者姓名字体', '打印纸颜色', '病床高度'], answer: 0, explain: '深度决定显示范围，应完整容纳目标和必要周边。' },
  { q: '强回声后方出现声影，合理做法是？', options: ['立刻认定机器坏了', '把增益开满填平黑影', '只保存最亮一帧', '换切面核实并结合其他信息'], answer: 3, explain: '声影是线索，仍需多切面与临床结合。' },
  { q: '胎儿侧脑室轻度增宽后的合适理解是？', options: ['一个数字就确定了全部预后', '需要详细评估及随访，补充检查由专科讨论', '有三维脸照就无需评估', '所有人必须立即做MRI'], answer: 1, explain: '需要完整评估与随访，MRI是可能的补充而非自动步骤。' },
  { q: '王叔问心超能否直接证明冠脉支架通畅，应该怎样回答？', options: ['看到心跳就证明通畅', '结果由辅助学习者当场保证', '主要评估结构与功能等，需结合其他临床资料', '有支架就不能做心超'], answer: 2, explain: '心超不等于冠脉支架通畅性检查，问题要回到心内科综合判断。' },
  { q: '膈肌上方出现重复的肝脏样结构，首先应该？', options: ['改变声窗与角度，核实是否伪影', '直接写胸腔占位', '删除这一帧不留记录', '向患者宣布罕见畸形'], answer: 0, explain: '镜像伪影可制造重复结构，需核实而不是凭单帧命名。' },
  { q: '耦合剂费用增加时，哪种方案更合理？', options: ['混装剩余产品', '每次都只许一点点', '价格最低的替换全部产品', '先区分人次、用途、领用和损耗'], answer: 3, explain: '核实成本组成后减少可避免损耗，不牺牲有效耦合与院感要求。' },
  { q: '厂家清单写“旧终端及相关留存件”，现场应如何处理？', options: ['签字让对方马上装箱', '澄清具体范围和权限，区分核对与交接', '先自行删除存储内容', '凭印象把相近编号合并'], answer: 1, explain: '编号、范围、状态和处置权限要清楚，留证不等于移交。' },
  { q: '本章跟班考核通过，意味着什么？', options: ['可以独立给真实患者出报告', '自动取得所有临床权限', '完成对应教学任务，临床权限仍按岗位要求', '不再需要复核任何参数'], answer: 2, explain: '教学通过不是独立临床资质；真实患者扫查与报告由相应医师负责。' },
]

function adapt(id: string, step: TrilogyStep, state: GameState): TrilogyStep {
  const tools = state.dlc?.ch3?.chapter?.tools
  if (id === 'c3_s1_aunt_7' && tools?.c3_s1_aunt_6?.choice && tools.c3_s1_aunt_6.choice.replace(/^assisted:/, '') !== '线阵') {
    return { ...step, text: '你刚才那支看得更深，不代表它更差。这块目标浅，换高频线阵，边界会更容易分开。来，跟我对照一下。' }
  }
  if (id === 'c3_s1_gain_2' && tools?.c3_s1_gain_1) {
    const gain = tools.c3_s1_gain_1.value
    if (gain < 35) return { ...step, text: '这版还暗，弱一点的回声容易漏。再看我往上调一点——不用把黑的全填亮。调整前那张也留着。' }
    if (gain > 80) return { ...step, text: '有点推过头了，暗区也亮起来了。我往回调一格，你看边界是不是又分开了。调整前那张别删。' }
    return { ...step, text: '行，这版有层次了。把调整前那张也留着，下回就知道自己改了什么。' }
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
    return { ...step, text: '是你啊！那次导管室多亏你们。我今天按心内科的安排来复查，不是又来闯急诊了。' }
  }
  if (id === 'c3_s3_xu_0' && (state.flags.mystery_told || state.dlc?.ch2?.done)) {
    return { ...step, text: '那个熟悉的男人又坐进诊室。梅姐核对申请单，你终于完整看到他的姓名：许建平。今天，他没有把挂号条压在名字上。' }
  }
  if (id === 'c3_s4_start_1' && state.finished && state.stamps.includes(3)) {
    return { ...step, text: '你们两年前是不是就传“超声科耦合剂用量第一”？这回别光听八卦，帮我把人次和损耗算明白。' }
  }
  return step
}

export const CH3: TrilogyChapter = {
  id: 'ch3', title: '回声', subtitle: '第三章 · 超声', icon: '◉', year: 2026,
  equipment: '超声设备与教学模体', background: 'bg_us_room',
  shifts: [
    { id: 'c3s1', title: '第一班 · 先认人，再认探头', subtitle: '入科 / 阿姨复查 / 胆囊结石', date: '2026年11月 · 跟班第一日', start: 'c3_s1_start_0', background: 'bg_us_room' },
    { id: 'c3s2', title: '第二班 · 那个停顿', subtitle: '表姐的二十四周检查', date: '2026年11月 · 跟班第三日', start: 'c3_s2_start_0', background: 'bg_us_room_day' },
    { id: 'c3s3', title: '第三班 · 换一个方向', subtitle: '心超 / 床旁 / 许建平', date: '2026年11月 · 跟班第六日', start: 'c3_s3_start_0', background: 'bg_us_bedside' },
    { id: 'c3s4', title: '第四班 · 两张清单', subtitle: '耗材账 / 整改来访', date: '2026年11月 · 跟班第九日', start: 'c3_s4_start_0', background: 'bg_us_room' },
    { id: 'c3s5', title: '第五班 · 把名字说完整', subtitle: '教学考核 / 寻人启事 / 晨会', date: '2026年11月 · 跟班第十二日', start: 'c3_s5_start_0', background: 'bg_us_room_day' },
  ],
  steps, afterQuiz: 'c3_epilogue_0', cards, book, quiz, adapt,
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
  },
  assets: [
    'bg_us_room', 'bg_us_room_day', 'bg_us_bedside', 'bg_breakroom', 'bg_waiting', 'bg_corridor', 'bg_office', 'bg_office_day', 'bg_day',
    'char_mei', 'pat_cousin', 'char_han', 'pat_aunt', 'pat_mystery', 'pat_wang_recovery', 'char_lei', 'char_zhou', 'char_he', 'char_tang',
    'us_gallstone', 'us_breast', 'us_fetal', 'us_echo', 'us_mirror', 'item_missing_notice', 'item_reunion_gifts', 'item_notebook',
  ],
}
