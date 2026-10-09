import type { TrilogyChapter, TrilogyStep } from './trilogy-types'
import type { Choice } from './types'

/** Chapter-local data only. The trilogy runtime owns input, saves and settlement. */
const characters: TrilogyChapter['characters'] = {
  me: { name: '你', color: '#8ee0d1' },
  sys: { name: '', color: '#cbd5e1' },
  zhou: { name: '老周', color: '#e7c58f', sprite: 'char_zhou' },
  ning: { name: '许宁', color: '#a9d8ed', sprite: 'char_mri_colleague' },
  tang: { name: '小唐', color: '#f2c1c8', sprite: 'char_tang' },
  lei: { name: '小雷', color: '#a4c9ef', sprite: 'char_lei' },
  fan: { name: '老范', color: '#d8c699', sprite: 'char_fan' },
  kai: { name: '小凯', color: '#cfb7ed', sprite: 'char_kai' },
  director: { name: '主任', color: '#d0d6e9', sprite: 'char_director' },
  han: { name: '韩经理', color: '#cab7b3', sprite: 'char_han' },
  wrist: { name: '小程', color: '#d9c4a5', sprite: 'ch2_patient_wrist_student' },
  luo: { name: '罗阿姨', color: '#ddb7bb', sprite: 'ch2_pat_luo_v1' },
  anxious: { name: '老宋', color: '#c3c8d8', sprite: 'pat_mri_anxious' },
  mystery: { name: '许建平', color: '#b6bbd0', sprite: 'pat_mystery' },
}
const steps: Record<string, TrilogyStep> = {}
type Row = [speaker: string, text: string, extra?: Partial<TrilogyStep>]
function chain(prefix: string, rows: Row[], next: string, bg = 'bg_mri_control'): void {
  rows.forEach(([speaker, text, extra], i) => {
    steps[`${prefix}_${i}`] = { bg, speaker, sprite: characters[speaker]?.sprite ?? '', sprite2: '', image: '',
      text, next: i + 1 < rows.length ? `${prefix}_${i + 1}` : next, ...extra }
  })
}
function question(id: string, speaker: string, text: string, choices: Choice[], extra: Partial<TrilogyStep> = {}): void {
  steps[id] = { bg: 'bg_mri_control', speaker, sprite: characters[speaker]?.sprite ?? '', sprite2: '', image: '', text, choices, ...extra }
}
function hub(n: number, visits: [string, string, string][], next: string): void {
  question(`c4_${n}_hub`, 'sys', '交班已经核对好。预约还没开始，可以在外面的几个地方转转。', [
    ...visits.map(([text, next, flag]) => ({ text: `${text}（⚡1）`, next, cond: { notFlag: flag, ap: 1 } })),
    { text: '小卖部', next: '@shop' }, { text: '翻《共振二十页》', next: '@book' },
    { text: '回控制室，开始本班工作', next },
  ], { bg: 'bg_mri_corridor' })
}
function settle(n: number, text: string, gold: number, badge?: string): void {
  steps[`c4_${n}_end`] = { bg: 'bg_breakroom', speaker: 'sys', sprite: '', image: '', text,
    effect: { gold, ...(badge ? { badge } : {}) }, end: true }
}

// 1. A complete first-shift loop: exploration, a returning person, imaging, handover.
chain('c4_1_open', [
  ['sys', '2027年11月，周二傍晚。MRI门口的包装纸箱撤走了，墙上却还留着一块没擦净的胶。'],
  ['fan', '别看那块胶了。你惦记了几年的三点零，真到了。'],
  ['me', '以前设备清单上年年都写，写得我以为比主任退休还远。'],
  ['zhou', '主任还没退，我先被你排走了？（他把交班本压住）我返聘还在。今晚你带许宁熟悉咱们科的交接。'],
  ['ning', '机器我在进修时用过类似的。你们科那个总失踪的分机，得请你教。'],
  ['me', '分机不失踪。主任拿它压文件，铃声从纸底下传出来。', { effect: { flag: 'c4_started' } }],
], 'c4_1_hub', 'bg_mri_corridor')
hub(1, [['走廊找老范', 'c4_1_fan_0', 'c4_1_fan'], ['休息室找许宁', 'c4_1_ning_0', 'c4_1_ning'], ['控制室找小雷', 'c4_1_lei_0', 'c4_1_lei']], 'c4_1_wrist_0')
chain('c4_1_fan', [
  ['fan', '别替我算两台一块儿买能不能打折。这回是3.0T，不是把CT排数加上去。', { effect: { ap: -1 }, giftTo: 'fan' }],
  ['me', '我还没开口，您报价解释都备好了。'],
  ['fan', '来问的人太多。场强写得大，机房、线圈、维护的钱也不会自己消失。'],
  ['me', '所以不是数越大，什么都直接翻倍？'],
  ['fan', '真有那么省心，我早下班了。拿着这张线圈登记表，坏了知道找谁。', { card: 'c4_field', effect: { flag: 'c4_1_fan', wealth: 1 } }],
], 'c4_1_hub', 'bg_mri_corridor')
chain('c4_1_ning', [
  ['ning', '你们休息室连保温杯都写名字？', { effect: { ap: -1 }, giftTo: 'ning' }],
  ['me', '不写，老周能把你的奶茶当自己的浓茶。'],
  ['ning', '那我写杯底。正面写上去，喝一口像举一次牌。'],
  ['me', '这科室你适应得挺快。对了，今天看腕部，专用线圈登记在左手那格。'],
  ['ning', '我对过了。线缆和接头一起检查，不是拿个尺寸差不多的圈就行。', { card: 'c4_coil', effect: { flag: 'c4_1_ning' } }],
], 'c4_1_hub', 'bg_breakroom')
chain('c4_1_lei', [
  ['lei', '新工作站没接那个老盒子。你不用每次进来都先看网口。', { effect: { ap: -1 }, giftTo: 'lei' }],
  ['me', '我看的是你饭盒。都七点了，还没开。'],
  ['lei', '刚收到一份旧项目回函。对方把前期的事都写成“接口联调”，说资料全删了，让我们确认结项。'],
  ['me', '说删完就删完？'],
  ['lei', '我先把删除日期对上。前面怎么叫，等任务号核齐再说。', { effect: { flag: 'c4_1_lei' } }],
], 'c4_1_hub')
chain('c4_1_wrist', [
  ['sys', '第一位预约者在门口甩了甩雨伞。年轻人抱着旧片袋，右手腕套了个护腕。'],
  ['wrist', '我毕业了。现在不用写作业，改成给老板写报告。', { caseId: 'c4_wrist' }],
  ['me', '报告也能开证明不写吗？'],
  ['wrist', '要有这项服务，我介绍全办公室来。'],
  ['sys', '小程把申请单递过来。两年前摔伤那次已经复诊处理过；最近打球后腕部又持续疼，骨科这次想进一步看软组织。'],
  ['wrist', '骨头都看过了，怎么还要换台机器？不是同一只手吗？'],
], 'c4_1_wrist_q')
question('c4_1_wrist_q', 'me', '小程捏着片袋，等你接话。', [
  { text: '「这次医生想看周围软组织，我先把旧片也调出来。」', next: 'c4_1_wrist_old_0', effect: { heart: 1 } },
  { text: '「你先说最近什么时候疼，我记给负责医师。」', next: 'c4_1_wrist_recent_0' },
])
chain('c4_1_wrist_old', [['wrist', '旧片没白带就行。我妈找它，翻得像家里进过贼。'], ['me', '没白带，但不能拿旧伤替这次先下结论。']], 'c4_1_prepare_0')
chain('c4_1_wrist_recent', [['wrist', '拧瓶盖也疼。可不是两年都没好，最近这阵子才又闹的。'], ['me', '明白。我把时间分开记，免得看报告的人误会。']], 'c4_1_prepare_0')
chain('c4_1_prepare', [
  ['ning', '金属和身上物品都核对好了，腕部线圈也接好了。小程，先试试这个支垫舒服不舒服。'],
  ['wrist', '还行。这个圈不转吧？上回那个CT转得我挺服气。'],
  ['me', '它不靠球管绕你转。待会儿声音会变，别跟着节拍晃手。'],
  ['wrist', '你别说，我打字就爱跟着音乐敲。'],
  ['sys', '耳部防护、呼叫装置都确认后，许宁留在操作台。老周让你把本次计划中的序列摆到工作站上。'],
], 'c4_1_tool')
steps.c4_1_tool = { bg: 'bg_mri_control', speaker: 'zhou', sprite: 'char_zhou', text: '先试着对照两种加权的看法，别只留最亮的那张。',
  tool: { kind: 'mri', task: 'sequence', title: '同一只手腕，两种看法', prompt: '切换序列，留意骨髓、液体及周围软组织怎样变化。', image: 'mri_wrist', images: { T1: 'mri_wrist', T2: 'mri_wrist_t2' }, help: '序列改变组织对比。亮不等于病；先把不同序列和相邻层对应起来。', next: 'c4_1_result_0' } }
chain('c4_1_result', [
  ['sys', '计划中的采集完成。图像进入工作站，老周把骨科写的疼痛位置放在旁边。', { image: 'mri_wrist' }],
  ['ning', '这一组液体信号显眼，另一组结构边界更顺眼。留哪组？', { image: 'mri_wrist_t2' }],
], 'c4_1_result_q')
question('c4_1_result_q', 'me', '鼠标停在导出窗口。', [
  { text: '两组按同一位置对照，完整序列一起留', next: 'c4_1_keep_0', effect: { skill: 1, badge: 'c4_two_views' } },
  { text: '请老周带着看一遍，不凭亮度挑', next: 'c4_1_help_0' },
], { image: 'mri_wrist' })
chain('c4_1_keep', [['zhou', '对。骨科问的是哪处软组织，咱们得按位置回答，不是比谁那张漂亮。']], 'c4_1_close_0')
chain('c4_1_help', [['zhou', '先把位置对齐。这是不同对比，不是前一张失败了，后一张把它救回来。']], 'c4_1_close_0')
chain('c4_1_close', [
  ['sys', '老周核完全部序列，记录需结合骨科检查判断的软组织改变。小程自己走回候诊区，护腕攥在另一只手里。', { card: 'c4_weighting' }],
  ['wrist', '能不能打球，还是回去问骨科对吧？'],
  ['me', '对，别拿我刚才那句“图收到了”当复出通知。'],
  ['wrist', '行。你们这通知，比公司群还严。'],
  ['sys', '送走小程，你刚坐下，门后传来很轻的“笃、笃”。间隔几乎一模一样。'],
  ['ning', '现在没扫人。这个声音，刚才就有。'],
  ['zhou', '记下时间，叫工程师核对运行记录。别一个人进去拆东西。'],
  ['sys', '你们完成交接。那张标着两个时间的便签，留在了工作站旁。'],
], 'c4_1_end')
settle(1, '本班交接完成。许宁把线圈放回原位，你检查了一遍登记。可以在休息室停留，准备好再进入下一班。', 200)

// 2. Two different reasons to pause: unknown foreign bodies and anxiety.
chain('c4_2_open', [
  ['sys', '周四晚班。你来时，设备工程师已经核过前夜的声音记录。'],
  ['ning', '是这套机器制冷系统工作时的规律声。状态正常，报告放在后面。'],
  ['me', '我还以为有人在里面等我下班。'],
  ['ning', '等你下班的是饭盒。你前天又没拿。'],
], 'c4_2_hub')
hub(2, [['核对设备声记录', 'c4_2_sound_0', 'c4_2_sound'], ['走廊和小唐聊聊', 'c4_2_tang_0', 'c4_2_tang'], ['找老周看植入物资料', 'c4_2_label_0', 'c4_2_label']], 'c4_2_luo_0')
chain('c4_2_sound', [
  ['ning', '前天那种慢节奏，和扫描时敲得很密的声音，不是一回事。', { effect: { ap: -1 }, giftTo: 'ning' }],
  ['me', '一个负责冷，一个负责吵？'],
  ['ning', '扫描的敲击主要和梯度切换有关。别把所有响声都记成“机器坏了”。'],
  ['me', '也不能一听有规律，就当正常。'],
  ['ning', '对，这次是工程师查过了。新声音还是报，不靠耳朵开诊断书。', { card: 'c4_sound', effect: { flag: 'c4_2_sound', badge: 'c4_night_sound' } }],
], 'c4_2_hub')
chain('c4_2_tang', [
  ['tang', '有人传咱们MRI不用电费。理由是不发X光。', { effect: { ap: -1 }, giftTo: 'tang' }],
  ['me', '那让他去跟财务解释。解释成了，省下的钱买微波炉。'],
  ['tang', '先买个能转的托盘。小雷每回热饭还手动换个方向。'],
  ['me', '咱们科最成熟的多平面重建。', { effect: { flag: 'c4_2_tang', heart: 1 } }],
], 'c4_2_hub', 'bg_mri_corridor')
chain('c4_2_label', [
  ['zhou', '这里有份厂家器械资料。写的是“MR条件安全”，后面还有好几行。', { effect: { ap: -1 }, giftTo: 'zhou' }],
  ['me', '不是见到这四个字，就能进咱们三点零？'],
  ['zhou', '型号、场强、扫描条件，得一项项对上。型号都没确认，别拿相似照片顶替。'],
  ['me', '我把条件页和型号页放一起，免得翻到后面找不着。', { card: 'c4_conditional', effect: { flag: 'c4_2_label', wealth: 1 } }],
], 'c4_2_hub')
chain('c4_2_luo', [
  ['sys', '候诊椅上那只分了两格的布袋让你多看了一眼。罗阿姨也抬头：“又换一间屋上班了？”', { sprite: 'ch2_pat_luo_v1' }],
  ['luo', '我闺女让我把旧的全带来。装这么多，袋子再缝两道都不够。', { caseId: 'c4_luo_safety' }],
  ['me', '这次还是肩背不舒服？'],
  ['luo', '最近胳膊也麻。门诊想再看看。那十五根，我可没忘报。'],
  ['sys', '她递来旧治疗记录和CT光盘。记录解释了针怎么留下，却没有写清材料、型号或可靠的MR条件。'],
], 'c4_2_luo_q', 'bg_mri_corridor')
question('c4_2_luo_q', 'me', '申请单在，旧记录也在。眼下怎么办？', [
  { text: '先不进扫描间，把资料交安全评估医师核实', next: 'c4_2_luo_safe_0', effect: { skill: 1, badge: 'c4_pause' } },
  { text: '问老周，CT看得见针能不能替代材料资料', next: 'c4_2_luo_ask_0' },
], { bg: 'bg_mri_corridor', sprite: 'ch2_pat_luo_v1' })
chain('c4_2_luo_safe', [['luo', '我不是不配合。别让我在这儿坐一晚上，最后才说今天做不了。'], ['me', '我现在就找负责医师，后面怎么接也给您问清楚。']], 'c4_2_luo_care_0', 'bg_mri_corridor')
chain('c4_2_luo_ask', [['zhou', 'CT能给位置，不会自动告诉你材料和能不能进磁场。先停在外面，我接着评估。'], ['luo', '那我就坐这儿，不往里凑。']], 'c4_2_luo_care_0', 'bg_mri_corridor')
chain('c4_2_luo_care', [
  ['sys', '负责医师核看病情、旧影像和治疗记录，联系开单科室。今天暂不进行MRI，其他评估先接上，资料核实另留联系人。'],
  ['luo', '不是说我这辈子都不能做吧？'],
  ['zhou', '今天的信息还不够，不能替以后的评估下结论。您现在的不舒服，门诊会继续管。'],
  ['me', '这个号码是科里的，不是让您去网上找当年那个诊所。'],
  ['luo', '行。要找旧票据，让我闺女找。她翻柜子比我利索。', { card: 'c4_foreign', effect: { flag: 'c4_luo_review' } }],
  ['sys', '罗阿姨和门诊护士一起走了。你把资料装回布袋，留在本院的复印件另做了接收记录。'],
  ['ning', '这个袋子真好用。我收线圈的标签总混成一团。', { giftTo: 'ning' }],
  ['me', '你别想顺她袋子。她改裤脚还要收费呢。'],
], 'c4_2_song_0', 'bg_mri_corridor')
chain('c4_2_song', [
  ['sys', '下一位是老宋，开公交的。神经科为他近来的反复头痛开了头部MRI；他自己走来，把钥匙倒出一大串。安全筛查完成，他却站在门口不动。'],
  ['anxious', '我能开那么大的车，就怕这个洞。说出去怪丢人的。', { caseId: 'c4_song_motion' }],
  ['ning', '不丢人。你先说最怕哪一段，咱们在外头讲明白。'],
  ['anxious', '进去以后，喊你们听不见。'],
], 'c4_2_song_q', 'bg_mri_corridor')
question('c4_2_song_q', 'me', '老宋盯着门，不肯往前。', [
  { text: '先演示呼叫和中止方式，让他决定要不要试', next: 'c4_2_song_try_0', effect: { heart: 1 } },
  { text: '请负责医师一起讨论能接受的检查安排', next: 'c4_2_song_help_0' },
], { sprite: 'pat_mri_anxious', bg: 'bg_mri_corridor' })
chain('c4_2_song_try', [['anxious', '这个捏一下，你真就过来？'], ['ning', '我们能听到，也能回应。你现在试一次，不先把人送进去。']], 'c4_2_song_scan_0')
chain('c4_2_song_help', [['zhou', '可以先尝试沟通和适应；受不了就停，其他办法由负责团队和他商量。'], ['anxious', '那我先试，真不行我可要喊。']], 'c4_2_song_scan_0')
chain('c4_2_song_scan', [
  ['sys', '解释、试呼叫和耳部防护都确认后，老宋同意尝试。第一段采集没结束，他动了一下手，呼叫声就进了控制台。'],
  ['ning', '听到了，我们停下来。别硬忍。'],
  ['anxious', '我刚才听见声音变了，怕是我把它弄坏了。'],
  ['me', '序列换了，声音会换。刚才那一段我们一起看，不是要罚您重做整套。'],
], 'c4_2_tool')
steps.c4_2_tool = { bg: 'bg_mri_control', speaker: 'ning', sprite: 'char_mri_colleague', text: '先看看哪一段受到运动影响，再讨论是否补采。',
  tool: { kind: 'mri', task: 'artifact', title: '不是又长出一层轮廓', prompt: '对照运动前后的轮廓，辨认重影，不用它猜疾病。', image: 'mri_brain_t2', help: '运动会破坏不同采样之间的一致性。先沟通、调整支持，再由团队决定必要补采。', next: 'c4_2_finish_0' } }
chain('c4_2_finish', [
  ['sys', '老周确认受影响的是其中一段。解释后，老宋愿意再试；团队按既定方案完成必要采集，没有临时把所有参数推到最快。', { card: 'c4_motion' }],
  ['anxious', '你们真听见了。行，比我车上那个报站喇叭靠谱。'],
  ['ning', '下回害怕就提前说，别等进去了跟它较劲。'],
  ['sys', '交班时，小雷把那封“全部删除”的回函放到桌上。他指着删除日期。你往上看见“接口联调”四个字，他已经把原稿折回了文件夹。', { effect: { badge: 'c4_call_heard' } }],
], 'c4_2_end')
settle(2, '本班资料与后续联系人已交接。老宋自己拿着外套离开；罗阿姨的核实任务留在正式交班记录里。', 220)

// 3. An unresolved present illness and a separate, verifiable family history.
chain('c4_3_open', [
  ['sys', '周六晚班。许宁的杯子留在原位，杯底多了一张歪歪扭扭的姓名贴。'],
  ['zhou', '谁把她杯子贴成“许老师”的？'],
  ['me', '您。昨晚您说字写大点，省得拿错。'],
  ['zhou', '那挺好。许老师，今晚别让他们偷懒。'],
], 'c4_3_hub', 'bg_mri_corridor')
hub(3, [['档案窗口找小唐', 'c4_3_tang_0', 'c4_3_tang'], ['控制室听许宁吐槽', 'c4_3_ning_0', 'c4_3_ning'], ['休息室找小雷', 'c4_3_lei_0', 'c4_3_lei']], 'c4_3_xu_0')
chain('c4_3_tang', [
  ['tang', '查旧档案先给姓名、年代和授权，别只给我一句“有个老头”。', { effect: { ap: -1 }, giftTo: 'tang' }],
  ['me', '你这是骂谁呢？'],
  ['tang', '不点名。有的人把档案窗口当许愿池，还不投币。'],
  ['me', '我把需要的资料列好。查到同名的也不能直接算数。', { effect: { flag: 'c4_3_tang' }, card: 'c4_records' }],
], 'c4_3_hub', 'bg_mri_corridor')
chain('c4_3_ning', [
  ['ning', '这人把三套序列当成拍糊了重拍，投诉我效率低。', { effect: { ap: -1 }, giftTo: 'ning' }],
  ['me', '你告诉他，像炒菜，有人要大火有人要小火？'],
  ['ning', '他接着问我能不能一锅炒。我现在饿得真想答应。'],
  ['me', '那先解释每组看什么。饭的事等交班，不许拿工作站点外卖。', { effect: { flag: 'c4_3_ning' }, card: 'c4_flair' }],
], 'c4_3_hub')
chain('c4_3_lei', [
  ['lei', '回函只列了一个任务号，可当年不止一个。前期那份样本条件，我也列过。', { effect: { ap: -1 }, giftTo: 'lei' }],
  ['me', '那你昨天为什么只说日期？'],
  ['lei', '名字留在前期文件上，和后面的用途不是一回事。我想先让他们把范围核齐。'],
  ['me', '好。原始记录交给信息科查，别靠我们俩猜。', { effect: { flag: 'c4_3_lei' } }],
], 'c4_3_hub', 'bg_breakroom')
chain('c4_3_xu', [
  ['sys', '许建平从候诊椅上起来，把申请单抹平。外套领口松着，左颈贴了门诊查体留下的位置标记。'],
  ['mystery', '这块鼓起来有六个星期了。不怎么疼，我当时没管。', { caseId: 'c4_xu_neck' }],
  ['zhou', '门诊的记录我们看了。颈部这次要进一步看；头痛是另一份申请，别自己把两件事绑在一起。'],
  ['mystery', '头疼的时候，我就想开车那会儿，找个服务区歇歇。退了休，倒不知道往哪歇。'],
  ['me', '先坐会儿。您今天不用赶下一站。'],
], 'c4_3_xu_q', 'bg_mri_corridor')
question('c4_3_xu_q', 'me', '他把片袋夹在膝盖中间，手还攥着带子。', [
  { text: '「检查的事先说清，您有什么不放心的？」', next: 'c4_3_xu_listen_0', effect: { heart: 1 } },
  { text: '「旧片先给我吧，我给您按日期排好。」', next: 'c4_3_xu_sort_0' },
], { bg: 'bg_mri_corridor', sprite: 'pat_mystery' })
chain('c4_3_xu_listen', [['mystery', '我不怕机器。怕拍完，还是一句“再看看”。'], ['me', '我不替报告保证结果。今天看到了什么、下一步找谁，至少得给您说清楚。']], 'c4_3_head_0', 'bg_mri_corridor')
chain('c4_3_xu_sort', [['mystery', '别弄混。我的片子，和我爸的资料，是两袋。'], ['me', '明白。先核这袋的姓名和日期，另一袋我不动。']], 'c4_3_head_0', 'bg_mri_corridor')
chain('c4_3_head', [
  ['sys', '负责医师确认检查计划，安全筛查完成。头部几组序列先进入工作站；这是同一次检查的不同对比。'],
  ['ning', '先对照脑脊液的位置。别刚见到一片亮就往病灶上扣。', { image: 'mri_brain_t2', imageLabel: '本次头部 MRI｜T2 加权' }],
], 'c4_3_tool')
steps.c4_3_tool = { bg: 'bg_mri_control', speaker: 'ning', sprite: 'char_mri_colleague', text: '同一位置换三种对比，看看哪些地方变亮、哪些变暗。',
  tool: { kind: 'mri', task: 'sequence', title: '同一层，不同对比', prompt: '轮流查看 T1、T2 与 FLAIR，比较脑脊液信号，不必猜疾病。', image: 'mri_brain_t1',
    images: { T1: 'mri_brain_t1', T2: 'mri_brain_t2', FLAIR: 'mri_brain_flair' }, help: '常见头部方案中，脑脊液在 T1 较暗、T2 较亮；FLAIR抑制自由液体信号。灰度还受具体参数影响，不能单凭亮暗诊断。', next: 'c4_3_neck_0' } }
chain('c4_3_neck', [
  ['sys', '颈部采集随后完成。老周把标记位置、相邻层和多组序列放在一起，不把头部片子里的亮暗当成颈部问题的解释。', { image: 'mri_neck', imageLabel: '本次颈部 MRI｜待综合判读' }],
  ['zhou', '这是颈部这组。申请单写了左颈肿块，你先看，不急着给它起名字。', { image: 'mri_neck' }],
  ['me', '我先把临床说的位置，在这一组和相邻层里对上。', { image: 'mri_neck' }],
], 'c4_3_neck_q')
question('c4_3_neck_q', 'me', '这是图像交接，不是让我签诊断。', [
  { text: '比较左右颈部软组织，再看相邻层是否延续', next: 'c4_3_neck_keep_0', effect: { skill: 1 } },
  { text: '我还对不上，请老周指着相邻层一起看', next: 'c4_3_neck_ask_0' },
], { image: 'mri_neck' })
chain('c4_3_neck_keep', [['zhou', '这里，左侧深颈部是一组淋巴结样软组织异常。形态和范围先记清，性质不能光靠这组定。']], 'c4_3_neck_talk_0')
chain('c4_3_neck_ask', [['zhou', '看我指的这里，左侧深颈部。相邻层能接上这组淋巴结样软组织异常；下一步还得结合临床。']], 'c4_3_neck_talk_0')
chain('c4_3_neck_talk', [
  ['sys', '医生向许建平解释目前的不确定性，安排耳鼻喉门诊继续评估；头痛的随访单独保留。', { effect: { flag: 'c4_neck_followup' }, card: 'c4_uncertain' }],
  ['mystery', '这次不是让我回家干等，是吧？'],
  ['zhou', '不是。预约和联系人在这张纸上，有变化及时回来。'],
  ['mystery', '好。还有个事……我爸叫许守义。1998年离家，最后有人在你们医院见过他。'],
  ['sys', '他打开另一只旧纸袋。旧照片、户籍关系材料和一张过期的寻人启事，不是你方才看过的检查影像。'],
  ['me', '您愿意的话，我们走正式查询。先从姓名、日期和身份关系核起。'],
  ['mystery', '别帮我瞎认一个人。我认错过，难受得很。', { effect: { flag: 'c4_father_request' } }],
], 'c4_3_end', 'bg_mri_corridor')
settle(3, '许建平的本次随访和父亲的档案查询分成两份记录。诊疗没有被寻人打断，旧资料也没有混进本次报告。', 240)

// 4. The discrepancy is between documents about 2025 exports, not a live device.
chain('c4_4_open', [
  ['sys', '周二晚班。信息科送来2025年的历史任务索引。设备科还从当年留存的项目往来邮件里找出一份《样本整理建议》，两份材料分开登记。'],
  ['lei', '索引里的接收端是**R-17**。另一份是前期联调时列的条件，文件上会留联系人。'],
  ['me', '可建议书上写的是你起草，提交日期还在CT试运行前。你前面只说自己接过线。'],
  ['lei', '前期列过些条件。具体拿去做什么，还得查他们那边。韩经理今晚来，先让他核范围。'],
], 'c4_4_hub', 'bg_mri_corridor')
hub(4, [['休息室问问小凯', 'c4_4_kai_0', 'c4_4_kai'], ['走廊找老范', 'c4_4_fan_0', 'c4_4_fan'], ['控制室核对登记', 'c4_4_ning_0', 'c4_4_ning']], 'c4_4_han_0')
chain('c4_4_kai', [
  ['kai', '韩经理那句“我们一贯重视”，我听了三遍，前头那个“一贯”一遍比一遍长。', { effect: { ap: -1 }, giftTo: 'kai' }],
  ['me', '你是来打听，还是来模仿的？'],
  ['kai', '本来想打听。聊完只记住他领带上有只小鹿。'],
  ['me', '小鹿不进证据清单。你听见的原话能记就记，没听见的别补。', { effect: { flag: 'c4_4_kai' }, card: 'c4_privacy' }],
], 'c4_4_hub', 'bg_breakroom')
chain('c4_4_fan', [
  ['fan', '新设备验收是验收，旧数据项目是旧项目。谁也别拿一张新合同盖掉旧事。', { effect: { ap: -1 }, giftTo: 'fan' }],
  ['me', '您这回说话很像开会。'],
  ['fan', '我这是防他们把两笔账订成一本。钉书机有时比嘴快。'],
  ['me', '两份材料，两个编号。我给它们各贴一张。', { effect: { flag: 'c4_4_fan', wealth: 1 } }],
], 'c4_4_hub', 'bg_mri_corridor')
chain('c4_4_ning', [
  ['ning', '有人打电话问能不能导几套新片给工程师“顺便看看”。我让他把申请发正式渠道了。', { effect: { ap: -1 }, giftTo: 'ning' }],
  ['me', '他说什么？'],
  ['ning', '说别人都这么发。我说那你别选我。'],
  ['me', '辛苦。今晚排班资料别跟病例导出放一起，容易顺手拖错。', { effect: { flag: 'c4_4_ning' } }],
], 'c4_4_hub')
chain('c4_4_han', [
  ['sys', '预约患者离开后，主任把韩经理请到控制室外的谈话桌。原始往来邮件、任务索引和现在的回函各放一边，没有人给他打开本院病例库。'],
  ['han', '旧项目的回函各位都收到了。我们清理完成，院方签个回执就行。'],
  ['director', '回执写收到文件，还是认可全部清理完成？这两句不是一回事。'],
  ['han', '是公司统一模板，不必把每个字——'],
  ['lei', '那请把“全部”对应的任务清单补上。'],
  ['sys', '主任翻到《样本整理建议》的日期页：“这份也请贵方核实接收记录。不能只回现在这张清单。”韩经理应了一声，没再催签字。'],
], 'c4_4_receipt_q', 'bg_mri_corridor')
question('c4_4_receipt_q', 'me', '回函写“本项目数据全部删除”；院方独立留存的旧任务索引，还列着R-17对应的另一批次。', [
  { text: '请他逐项对照任务号和删除范围', next: 'c4_4_receipt_scope_0', effect: { skill: 1 } },
  { text: '先登记差异，交信息科正式追问', next: 'c4_4_receipt_record_0' },
], { bg: 'bg_mri_corridor' })
chain('c4_4_receipt_scope', [['han', '这个可能是另一服务单，未必属于那份回函。'], ['me', '那“全部”覆盖什么，就需要重新写清楚。']], 'c4_4_conflict_0', 'bg_mri_corridor')
chain('c4_4_receipt_record', [['director', '把未覆盖的编号列出，请贵方书面回复。今晚不签“全部已核实”。'], ['han', '我回去向公司再核一下。']], 'c4_4_conflict_0', 'bg_mri_corridor')
chain('c4_4_conflict', [
  ['sys', '信息科登记了回函与旧任务记录的范围矛盾。它证明有待核清的缺口，不证明那台早已断开的终端又开始上传。', { effect: { flag: 'c4_receipt_conflict', badge: 'c4_receipt' } }],
  ['han', '小雷，样本筛选条件也是你发过来的，不只有接口。这份建议我们会查。'],
  ['lei', '我列过条件，后面怎么用，我没有替你们签。该交的原稿，我会交。'],
  ['director', '两边各交自己的原始记录。提过什么、接收过什么、后来用到哪里，分别核，别把一件事全塞进“联调”两个字。'],
  ['sys', '韩经理收好文件离开。门关上后，休息室那台坏转盘的微波炉“叮”了一声，谁也没动。'],
], 'c4_4_lei_0', 'bg_mri_corridor')
chain('c4_4_lei', [
  ['lei', '那份建议是我写过。前期他们让医院提要求，我把能整理的条件列了。'],
  ['me', '可那份原稿一直没在你交的审计材料里。为什么？'],
  ['lei', '回执副本和原稿一直在我这儿。我报了外传记录，没交这份建议。我怕一交，就把后面的事也全算到我头上。'],
  ['me', '所以你接过线，也写过建议。刚才还想只说前一件。'],
  ['lei', '对。断线是真的，留存记录也在。这份先正式登记，后面的用途，我还得和原始记录一项项对。'],
], 'c4_4_lei_q', 'bg_breakroom')
question('c4_4_lei_q', 'me', '小雷把筷子掰开，又放回饭盒上。', [
  { text: '「先把记录正式交齐。其他的，之后再谈。」', next: 'c4_4_lei_file_0', effect: { heart: 1 } },
  { text: '「我有点生气。今晚你别再漏一件。」', next: 'c4_4_lei_angry_0' },
], { sprite: 'char_lei', bg: 'bg_breakroom', giftTo: 'lei' })
chain('c4_4_lei_file', [['lei', '我现在交。不是丢你微信里，是交给登记的人。']], 'c4_4_late_0', 'bg_breakroom')
chain('c4_4_lei_angry', [['lei', '你生气应该的。我把记得的都写出时间，不确定的单列，不再拿“应该”糊过去。']], 'c4_4_late_0', 'bg_breakroom')
chain('c4_4_late', [
  ['sys', '信息科分别签收小雷交出的原稿、副本，以及设备科独立留存的邮件。起草日期一致，样本后续用途仍待接收方核验。你们没有删文件，也没有追进外部系统。'],
  ['ning', '你们的饭我热了。转盘不动，我中间手转过一次。'],
  ['me', '谢谢，今天居然是饭先等我。'],
  ['sys', '走廊灯灭了一半。你的收件箱弹出档案窗口的回信：许守义，1998年，找到一项转诊登记，身份仍需复核。'],
], 'c4_4_end', 'bg_breakroom')
settle(4, '旧任务索引、回函、设备科留存邮件和小雷补交的原稿已分别登记。他在试运行前参与样本方案的记录留下了，后续用途仍由院方核查。', 260)

// 5. Growth means an accountable handover, not a magical diagnosis or shortcut.
chain('c4_5_open', [
  ['sys', '周四晚班。许宁给旧椅子贴了张便条：“轻坐，别旋转起飞。”'],
  ['ning', '今天有个加速方案评估。主任说让你带我过一遍资料，别拿患者临时试。'],
  ['me', '你来第一天说只要我教分机，现在连试飞都归我管。'],
  ['ning', '放心，椅子目前还没获准起飞。'],
], 'c4_5_hub', 'bg_mri_corridor')
hub(5, [['看表姐发来的消息', 'c4_5_family_0', 'c4_5_family'], ['走廊找老范', 'c4_5_fan_0', 'c4_5_fan'], ['休息室陪老周喝杯茶', 'c4_5_zhou_0', 'c4_5_zhou']], 'c4_5_research_0')
chain('c4_5_family', [
  ['sys', '表姐发来一段语音：“八个月，能把袜子藏三个地方。你说这孩子像谁？”', { effect: { ap: -1 }, communication: 'sms' }],
  ['me', '像你。小时候藏作业也是这个路子。'],
  ['sys', '她回了一个拖鞋表情，接着发来孩子笑得直往后仰的小视频。上回让全家紧张的检查，已经成了聊天里隔了很久的事。'],
  ['me', '我下班再看。别拿手机逗得孩子不肯睡。', { effect: { flag: 'c4_5_family', heart: 1 } }],
], 'c4_5_hub', 'bg_breakroom')
chain('c4_5_fan', [
  ['fan', '储藏柜别堆到门口。能留下的老物件有老物件的位置，不能拿进磁体间当镇纸。', { effect: { ap: -1 }, giftTo: 'fan' }],
  ['me', '您怎么老觉得我会拿奇怪的东西进去。'],
  ['fan', '我防的是你们所有人，不只防你。昨天有人想拿普通工具箱进门，被拦在外头了。'],
  ['me', '好，柜子我整理。工具该走什么审核就走什么审核。', { effect: { flag: 'c4_5_fan' } }],
], 'c4_5_hub', 'bg_mri_corridor')
chain('c4_5_zhou', [
  ['zhou', '给，茶叶蛋。不是病人送的，我楼下买的，最后两个。', { effect: { ap: -1 }, giftTo: 'zhou' }],
  ['me', '您以前不是让我自己找吃的？'],
  ['zhou', '那会儿你不知道把活交明白才走。现在会了，奖励一个。'],
  ['me', '第二个呢？'],
  ['zhou', '我的。别因为我夸你，就打我饭的主意。', { effect: { flag: 'c4_5_zhou' } }],
], 'c4_5_hub', 'bg_breakroom')
chain('c4_5_research', [
  ['sys', '团队安排的是经批准、脱敏且限定用途的既有数据评估。不加病人，不临时加扫，也不把数据发到个人账号。'],
  ['ning', '方案A快一些，方案B细节和噪声表现更稳。宣传页只写少等多少分钟。'],
  ['me', '先看同一任务能不能完成。不是秒表赢了就算图像赢了。'],
], 'c4_5_research_q')
question('c4_5_research_q', 'me', '许宁把两组采集与重建记录摆好，等你选比较方式。', [
  { text: '同样部位、同样任务，一起看时间和图像代价', next: 'c4_5_research_pair_0', effect: { skill: 1, badge: 'c4_safe_research' } },
  { text: '先核对线圈、加速方式和重建条件是否一致', next: 'c4_5_research_coil_0', effect: { wealth: 1, badge: 'c4_safe_research' } },
])
chain('c4_5_research_pair', [['ning', '这组快了，但噪声和残留伪影也要算。不能把代价剪掉只留用时。']], 'c4_5_research_close_0')
chain('c4_5_research_coil', [['ning', '用到多个线圈接收通道，还得看采样与重建。换个条件，不能直接照抄那一个加速数。']], 'c4_5_research_close_0')
chain('c4_5_research_close', [
  ['zhou', '你们把范围和局限写上。是否用到临床，由负责团队按流程评估，不是今晚比完就上线。', { card: 'c4_acceleration' }],
  ['ning', '行。那我标题就不写“一键告别漫长检查”了。'],
  ['me', '写“没有一键”。'],
  ['sys', '小唐敲了敲外门。档案窗口完成了本院这段记录的身份复核，许建平也到了。'],
], 'c4_5_transfer_0')
chain('c4_5_transfer', [
  ['tang', '姓名、年龄信息和当年的转诊登记能互相对应。是许守义，不是只撞了个同名。', { effect: { badge: 'c4_same_person' } }],
  ['mystery', '那他那时候，真来过这里。'],
  ['tang', '来过。记录是**1998年正式转往外地省院**，这有接收医院与转诊编号。后面怎样，本院这份不能替外院说。', { image: 'item_transfer_record', imageLabel: '经核验的本院转诊登记｜1998年' }],
  ['sys', '许建平看了很久，没有去碰那张留在桌上的复印件。'],
  ['mystery', '我以前跑长途，路过那个城市好多趟。每次都想着，下一趟再去问。'],
], 'c4_5_transfer_q', 'bg_mri_corridor')
question('c4_5_transfer_q', 'me', '走廊只剩空调声。他终于松开攥着片袋的手。', [
  { text: '等他缓一缓，再一起核对外院查询材料', next: 'c4_5_transfer_wait_0', effect: { heart: 1 } },
  { text: '「我把现在能确认的，和还不知道的分开写。」', next: 'c4_5_transfer_write_0' },
], { bg: 'bg_mri_corridor', sprite: 'pat_mystery' })
chain('c4_5_transfer_wait', [['mystery', '不用劝我看开。我坐两分钟，咱们把下一步说好。']], 'c4_5_transfer_done_0', 'bg_mri_corridor')
chain('c4_5_transfer_write', [['mystery', '这样好。别留一个空白，让我自己想出十种。']], 'c4_5_transfer_done_0', 'bg_mri_corridor')
chain('c4_5_transfer_done', [
  ['sys', '在许建平授权下，档案窗口登记外院后续查询。你留下正式联系方法，没有把陌生人的旧胶片交给他认亲。', { effect: { flag: 'c4_father_transfer', badge: 'c4_transfer' } }],
  ['mystery', '我颈上这个，也会按约再去看。别为找我爸，把眼前的事耽误了。'],
  ['me', '两份事情都记着。您下回来，不用再从头讲。'],
  ['sys', '他走后，小雷把补充材料的接收凭证放进柜子。韩经理还没交来逐项回复；前期建议如何对应R-17及后续独立批次，核查单上仍留着一个空格。'],
  ['zhou', '今晚交接你来讲。许宁在旁边听，下回她讲，你查漏。'],
  ['me', '我现在算能带人了？'],
  ['zhou', '算。但茶叶蛋没有按带教人数发。', { effect: { badge: 'c4_teacher' } }],
], 'c4_5_end', 'bg_mri_corridor')
settle(5, '本班结束。研究比较、临床交接和两条后续查询各归各档。留下的是明确联系人和下一步，不是替未知写好的结论。', 280, 'c4_survivor')

chain('c4_epilogue', [
  ['director', '这回没让你背一页参数。真到工作台上，知道什么时候该停、该问、该多留一组，比嘴快管用。'],
  ['me', '那晨会能不能也短一点？'],
  ['director', '可以。从你少这一句开始。'],
  ['sys', '许宁递来一个新杯垫，背面写着分机号码。“怕你哪天忘了。”你把它放在自己杯子下面。'],
  ['ning', '杯垫没磁铁，仍然只放休息室。别拿它当进扫描间的通行证。', { effect: { item: 'c4_gift_coaster' } }],
  ['lei', '新回复还没来。补交的东西已经签收，后续找我核对，我会到场。'],
  ['sys', '几天后，许建平按约回到门诊。颈部异常仍需继续评估，外地省院也确认收到寻档申请。两件事，都还在路上。'],
  ['zhou', '明年有PET/CT的轮转。那边要看示踪剂分布，你的慢性子倒不全是坏事。'],
  ['me', '您夸人能不能别拐弯。'],
  ['sys', '你收好杯垫。走廊尽头的冷头仍按自己的节奏工作，没人再拿那阵声音猜门后站着谁。'],
], 'c4_epilogue_end', 'bg_breakroom')
steps.c4_epilogue_end = { bg: 'bg_mri_corridor', speaker: 'sys', sprite: '', image: '', text: '第四章·共振，完。下一章：微光。', end: true }

const cards: TrilogyChapter['cards'] = {
  c4_field: { title: '3.0T不是万能翻倍键', body: '更高场强可以带来信号方面的机会，也带来均匀性、伪影、能量沉积及设备条件方面的取舍。线圈、序列、部位和实际任务一起决定好不好用。', image: 'bg_mri_room' },
  c4_coil: { title: '腕部旁边的那个圈', body: '合适的接收线圈与部位、覆盖范围和采集任务匹配。检查线缆、连接及放置条件，不拿“差不多大小”代替核对。', image: 'mri_wrist' },
  c4_weighting: { title: '同一只手，不同对比', body: '不同序列和参数突出不同组织对比。T1、T2不是两种疾病，也不表示两次受伤。图像亮暗要放回序列、位置和临床问题里看。', image: 'mri_wrist' },
  c4_sound: { title: '两种声音，两个来处', body: '采集时变化明显的敲击声主要与快速切换的梯度相关；部分超导MRI的低温系统也有规律运行声。新的异常声仍应按流程检查，不能只听节奏就说正常。' },
  c4_conditional: { title: '“有条件”四个字', body: 'MR Conditional只在标明的条件全部满足时适用。要准确识别物品型号与条件；某人曾经扫描过、某物不是铁，都不能直接替本次放行。' },
  c4_foreign: { title: '先补足资料', body: '罗阿姨的金属异物记录不足，本次MRI先暂停并由负责团队评估。CT提供位置等信息，但不自动给出材料或完整MR条件。未知不等于一生禁做，暂停也不等于停止诊疗。' },
  c4_motion: { title: '听得见，才能一起配合', body: '运动会使采样不一致而产生模糊或重影。先沟通、让呼叫可用、改善耐受，必要补采由团队决定；不能为了赶时间自行把所有序列和参数推到最快。', image: 'mri_brain_t2' },
  c4_flair: { title: '为什么这组水不亮', body: '常见脑部方案中，T2里的脑脊液较亮，FLAIR抑制自由液体信号。它帮助不同组织更容易分开，但“在FLAIR上亮”本身不是诊断。', image: 'mri_brain_flair' },
  c4_records: { title: '姓名相同，还不够', body: '旧资料核查需要身份关系、日期、编号、来源和合法查询授权。无名旧片、其他老人的故事，不能因为年份接近就交给许建平认亲。', image: 'item_transfer_record' },
  c4_privacy: { title: '盖章没有替代范围', body: '“删除完成”应对应可核验的任务和数据范围。设备服务也不是无限取得病例的许可。差异正式登记，原始记录保存；不私传、私删，也不越权闯入外部系统。' },
  c4_uncertain: { title: '没有替未知写好答案', body: '许建平左颈的淋巴结样软组织异常仍需临床与后续评估。MRI能帮助显示部位和范围，不能仅凭一处信号确定性质。BME主角负责设备、图像和交接，不签报告。', image: 'mri_neck' },
  c4_acceleration: { title: '少等几分钟的代价', body: '利用多通道线圈、采样安排与重建可以加速。收益必须与噪声、伪影、分辨细节和任务完成度一起评估；不是把时间缩短的数字单独拿去验收。' },
}
const badges: TrilogyChapter['badges'] = {
  c4_two_views: { name: '不只挑最亮的', icon: '🌓', desc: '腕部检查保留互补序列和完整上下文。' },
  c4_night_sound: { name: '听见机器，不瞎猜', icon: '🎧', desc: '核对梯度与低温系统的声音记录。' },
  c4_pause: { name: '暂停也算负责', icon: '🛑', desc: '资料不全时先停在MRI安全评估之外。' },
  c4_call_heard: { name: '你喊，我们在', icon: '🔔', desc: '老宋的呼叫得到回应，检查没有变成忍耐比赛。' },
  c4_same_person: { name: '同名之外', icon: '📁', desc: '按身份资料和转诊编号核验许守义的记录。' },
  c4_receipt: { name: '全部是哪一部分', icon: '🧾', desc: '登记删除回函与独立任务清单之间的范围矛盾。' },
  c4_safe_research: { name: '没有一键', icon: '🧩', desc: '在获准的数据范围内比较加速收益与代价。' },
  c4_transfer: { name: '下一站有名字', icon: '🚌', desc: '找到1998年的正式转诊线索，没有替外院补结局。' },
  c4_teacher: { name: '换你带一班', icon: '📋', desc: '完成同事交接，由被带教者走向带教者。' },
  c4_survivor: { name: '共振的五班', icon: '🌙', desc: '完成第四章五个班次。' },
}
const book: TrilogyChapter['book'] = [
  { title: '01｜不会转的“大圈”', body: 'MRI不像CT用X射线球管旋转采集。它利用磁场、射频与接收信号形成图像，主磁体、梯度系统、射频系统和重建系统各有分工。\n看到圆孔，不等于里面是同一种机器。' },
  { title: '02｜终于来的3.0T', body: 'T是场强单位。3.0T带来可利用的信号条件，但不会让每种任务自动比低场强好一倍。\n这家虚构医院的采购还包含线圈、机房、维护、培训和方案适配。主任的价目表可以不背，别只看最大的数字。' },
  { title: '03｜靠近手腕的线圈', body: '接收线圈的位置、覆盖与通道配置影响可用信号。用合适部位的线圈，同时按规定检查连接、线缆走向与接触条件。\n不是圈越大越厉害，也不是接上了就算检查完成。' },
  { title: '04｜加权不是给病人加重量', body: '改变采集时序与参数，可以强调不同的组织对比。常见T1、T2加权就是不同看法，而非疾病标签。\n腕部疼痛也不能只盯旧骨折。新的症状、旧片与本次不同序列都要让负责医师看到。' },
  { title: '05｜那个敲击声', body: '采集时明显变化的敲击声，主要与快速切换的梯度有关。患者需要合适的耳部防护，事先知道声音会改变。\n部分低温系统还有规律运行声；新出现的异常声音交工程人员核验，不靠“听着有节奏”决定正常。' },
  { title: '06｜不扫描，也别乱进', body: '超导MRI的主磁场通常持续存在。暂停采集、显示器黑屏或房间没人，都不表示磁场消失。\n人、设备和物品进入受控区域，都要遵循本院筛查与通行要求。普通工具箱没有因为老范拿着就变安全。' },
  { title: '07｜有条件不是大概行', body: 'MR Safe、MR Conditional、MR Unsafe描述在MR环境中的安全分类。Conditional需要准确型号及指定条件，不等于“通常都行”。\n具体场强、操作条件和物品状态等必须由负责团队核实；无法识别时不能靠猜。' },
  { title: '08｜罗阿姨今天为什么没扫', body: '记录不全的金属异物要结合位置、病情与可靠资料做安全评估。CT能显示异物位置，但不会自动给出全部材料与MR条件。\n本次暂停不等于终身禁止MRI，更不是让患者放弃诊疗。要交代继续核实和其他评估的联系人。' },
  { title: '09｜不是怕得不够勇敢', body: '幽闭不适不是靠羞辱就能解决。解释声音、演示呼叫、允许表达不适，再由团队讨论可以接受的安排。\n不能耐受时该停就停；药物、替代检查或其他方案由负责医师评估，不是BME实习生的一句保证。' },
  { title: '10｜多出来的轮廓', body: '运动可能让采集之间不一致，出现模糊或重影。先找原因，再看影响范围，不见重影就给患者贴疾病标签。\n沟通、舒适支持、方案调整及必要补采需要团队决定，不是一不动就整套重来。' },
  { title: '11｜T1、T2先看同一位置', body: '常见脑部方案中，脑脊液在T1加权较暗，在T2加权较亮。看图时对齐位置、方向、序列和相邻层。\n实际对比受参数影响，图上亮暗不是一套通用的“亮就是病”暗号。' },
  { title: '12｜FLAIR把哪种亮压下去', body: 'FLAIR常用于抑制自由液体信号，使某些邻近组织变化更容易分辨。它与T1、T2等互补，不是“自动挑病灶”按钮。\n需要完整检查和临床信息；主角整理图像与问题，负责医师完成诊断。' },
  { title: '13｜快一点，不免费', body: '加速可以利用多通道接收、采样与重建策略。时间收益可能伴随信噪比、伪影或细节方面的代价，具体取决于方案。\n比较时把同一任务、部位、线圈及其他条件写清楚。别只截最漂亮的一张。' },
  { title: '14｜研究先有边界', body: '本章评估使用经批准、脱敏、限定用途的既有数据；不把患者临时加进实验，不额外采集，不发个人账号。\n脱敏不等于随意再使用。是否采用临床方案，仍要通过负责团队的正式评估。' },
  { title: '15｜数据的回声不是机器复活', body: 'R-17在本章是2025年断网前记录里的接收端代号。2027年查到的是历史任务与删除范围的矛盾。\n旧终端已断开，后续发现不能被写成它一直偷偷传。剩余数据和历史责任要靠记录继续核。' },
  { title: '16｜一句“全部”有多大', body: '删除回函需要对应任务号、数据范围、时间和核验依据。收到回函与确认全部完成，不是一件事。\n发现矛盾正式登记，保存原始材料；不自己删掉证据，也不以调查为由越权进入外部系统。' },
  { title: '17｜旧档案里的同名人', body: '姓名只是一项信息。身份关系、年龄、日期、转诊编号和记录来源，要在授权范围内互相核对。\n许守义的转诊记录不等于1998年的无名胶片，也不等于第一章流浪老人。不要替故事把不同的人硬拼成一个。' },
  { title: '18｜不知道的地方也写清', body: '颈部MRI可帮助显示许建平异常的部位、范围与相关结构，本章仍未明确性质。后续由门诊结合临床决定取样、随访或其他检查。\n头痛的评估另列；不能因脑部某处亮就跳到PET，更不能拿单一信号给他宣布癌症。' },
  { title: '19｜交接给谁，比留一句更有用', body: '交接写明目前发现、尚缺资料、具体联系人和下一步。诊疗记录与家属寻档分开，患者不用每回来都重新讲一遍。\n带教不是把新人推到机器前：先说清分工，留住求助入口，再让对方试着讲交接。' },
  { title: '20｜留给下一班的空格', body: '许建平的颈部问题继续评估，许守义的外院资料继续核验，数据项目的独立任务批次继续追查。\n本章结束不等于所有问题都结清。PET/CT会带来示踪剂分布这一种新信息，也不会把不确定性一键擦掉。' },
]
const quiz: TrilogyChapter['quiz'] = [
  { q: '新来的MRI和CT最根本的区别之一是？', options: ['MRI不使用X射线来完成这类成像', 'MRI只是CT转得更慢', 'MRI完全没有任何安全风险'], answer: 0, explain: 'MRI使用磁场、射频和接收信号；没有CT的电离辐射来源，不等于没有MR安全风险。' },
  { q: '3.0T的数字更大，意味着什么？', options: ['所有检查效果都固定翻倍', '场强更高，实际收益仍要看任务与方案', '任何旧植入物都可以进入'], answer: 1, explain: '场强提供条件，不替代线圈、序列、部位和安全适配。' },
  { q: '小程腕痛，为什么不只留一组看着最亮的图？', options: ['亮的图一定过曝', '序列只是装饰', '不同对比提供互补信息，需要完整判读'], answer: 2, explain: '图像亮暗受序列与组织影响。挑“最亮”不是保留诊断信息的方法。' },
  { q: '常见头部T2中脑脊液较亮，FLAIR常做了什么？', options: ['抑制自由液体信号', '把所有异常都染亮', '自动删掉没有用的脑组织'], answer: 0, explain: 'FLAIR的自由液体信号抑制提供互补对比，但不能单凭亮暗定病。' },
  { q: '老宋说敲击声随采集段变化，主要对应哪一部分？', options: ['CT球管', '快速切换的梯度系统', '病人的骨头在共振发声'], answer: 1, explain: '梯度快速变化可产生明显声音，应提前解释并提供耳部防护。' },
  { q: '罗阿姨异物资料不足，本次该怎么处理？', options: ['CT上看得清就直接扫', '永远不再给她任何检查', '暂缓MRI，由负责团队核实风险并衔接后续'], answer: 2, explain: '资料不足需要正式安全评估，不能自行放行，也不能用永久禁止代替评估。' },
  { q: '设备标有MR Conditional，下一步最重要的是？', options: ['核实型号并满足其具体条件', '理解为所有MRI都可使用', '问另一位患者做过没有'], answer: 0, explain: 'Conditional是具体条件下适用，不是泛泛的“应该没事”。' },
  { q: '一个加速方案更快，就可以立刻用于所有病人吗？', options: ['可以，用时越短必然越好', '不可以，要一起评估噪声、伪影、细节及任务', '只要宣传页够清楚就可以'], answer: 1, explain: '速度有条件和代价，临床应用需由负责团队评估。' },
  { q: '许建平颈部异常性质未定，主角应怎么交接？', options: ['先告诉他是癌症，免得白跑', '拿头部亮区来解释颈部肿块', '留清位置、序列和问题，由医师接续判断'], answer: 2, explain: '图像提供证据，不能替未知写结论；BME主角不签诊断报告。' },
  { q: '删除回函没有覆盖旧索引中的独立任务号，应该？', options: ['保存差异并走正式核验流程', '签全部确认，反正有公章', '自己登录外部服务器删掉'], answer: 0, explain: '接收文件不是确认其覆盖全部范围；保留原始记录并正式追问。' },
]

export const CH4: TrilogyChapter = {
  id: 'ch4', title: '共振', subtitle: '磁场中的新同事，旧记录里的下一站', icon: '🧲', year: 2027,
  equipment: '3.0T MRI', background: 'bg_mri_corridor',
  shifts: [
    { id: 'c4_1', title: '第一班·真的到了', subtitle: '新机器，旧腕带', date: '2027-11-16', start: 'c4_1_open_0', background: 'bg_mri_corridor' },
    { id: 'c4_2', title: '第二班·门外停一下', subtitle: '资料没齐，呼叫要有人听', date: '2027-11-18', start: 'c4_2_open_0', background: 'bg_mri_corridor' },
    { id: 'c4_3', title: '第三班·两个片袋', subtitle: '眼前的病，二十九年前的路', date: '2027-11-20', start: 'c4_3_open_0', background: 'bg_mri_corridor' },
    { id: 'c4_4', title: '第四班·全部的范围', subtitle: '回函盖了章，空格还在', date: '2027-11-23', start: 'c4_4_open_0', background: 'bg_mri_corridor' },
    { id: 'c4_5', title: '第五班·下一站有名字', subtitle: '交接不是一句辛苦了', date: '2027-11-25', start: 'c4_5_open_0', background: 'bg_mri_corridor' },
  ], steps, afterQuiz: 'c4_epilogue_0', characters, badges, cards, book, quiz,
  assets: [...new Set([
    ...Object.values(characters).flatMap(c => c.sprite ? [c.sprite] : []),
    'bg_mri_room', 'bg_mri_control', 'bg_mri_corridor', 'bg_breakroom',
    'mri_wrist', 'mri_wrist_t2', 'mri_brain_t1', 'mri_brain_t2', 'mri_brain_flair', 'mri_neck', 'item_transfer_record',
  ])],
  adapt(id, step, state) {
    const flags = state.flags
    if (id === 'c4_2_luo_0' && !flags.c2_needle_seen) return { ...step, text: '候诊椅上坐着一位提着双层布袋的女士。申请单写着“罗女士”，袋子里旧片和票据分得整整齐齐。' }
    if (id === 'c4_2_luo_1' && !flags.c2_needle_seen) return { ...step, text: '我姓罗。以前查到过留下来的针，资料都带来了，你们先看看。' }
    if (id === 'c4_2_luo_2' && !flags.c2_needle_seen) return { ...step, text: '申请单写肩背不适。这次还有哪里不舒服？' }
    if (id === 'c4_2_luo_care_7' && !flags.c2_needle_seen) return { ...step, text: '你别想顺她袋子。资料装好，我去把联系人再核一遍。' }
    if (id === 'c4_2_luo_care_6' && flags.c2_payoff_luo_gift) return { ...step, text: '她以前送你的那个光盘袋，还在柜子里吧？我一看这针脚就认出来了。' }
    if (id === 'c4_5_fan_0' && flags.n5_fan) return { ...step, text: '当年给你的报废铅眼镜，还在柜子里吧？留着当纪念，别当防护用品，更别拿进磁体间。' }
    if (id === 'c4_5_zhou_1' && flags.n5_qian) return { ...step, text: '从工地大叔托人送苹果，到您亲自给茶叶蛋，我的夜班伙食也算有点人缘。' }
    if (id === 'c4_5_family_2' && !flags.c3_cousin_followup_stable) return { ...step, text: '她回了一个拖鞋表情，接着发来八个月大的孩子笑得直往后仰的小视频。家里人聊着辅食和袜子，没再拿工作时间催你看手机。' }
    if (id === 'c4_3_neck_talk_3' && flags.c3_xu_query_started) return { ...step, text: '好。还有我爸许守义那件事，上次登记以后，我又把家里剩的旧资料找齐了。' }
    if (id === 'c4_3_neck_talk_4' && flags.c3_xu_query_started) return { ...step, text: '他打开另一只旧纸袋。上次受理的回执在最上面，下面是这次补来的关系材料；不是方才检查的那一袋影像。' }
    if (id === 'c4_3_neck_talk_5' && flags.c3_xu_query_started) return { ...step, text: '我交给原来的受理窗口，记在同一件查询下面。不会让您重新排一次。' }
    return step
  },
}
