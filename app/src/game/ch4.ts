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
function chain(prefix: string, rows: Row[], next: string, bg = 'bg_mri_control_day_v2'): void {
  rows.forEach(([speaker, text, extra], i) => {
    steps[`${prefix}_${i}`] = { bg, speaker, sprite: characters[speaker]?.sprite ?? '', sprite2: '', image: '',
      text, next: i + 1 < rows.length ? `${prefix}_${i + 1}` : next, ...extra }
  })
}
function question(id: string, speaker: string, text: string, choices: Choice[], extra: Partial<TrilogyStep> = {}): void {
  steps[id] = { bg: 'bg_mri_control_day_v2', speaker, sprite: characters[speaker]?.sprite ?? '', sprite2: '', image: '', text, choices, ...extra }
}
function hub(n: number, visits: [string, string, string][], next: string): void {
  question(`c4_${n}_hub`, 'sys', '上午的交班已经核对好，设备准备也完成了。第一位预约者还在报到，你可以先找同事说几句。', [
    ...visits.map(([text, next, flag]) => ({ text: `${text}（⚡1）`, next, cond: { notFlag: flag, ap: 1 } })),
    { text: '小卖部', next: '@shop' }, { text: '翻《共振二十页》', next: '@book' },
    { text: '回控制室，开始本班工作', next },
  ], { bg: 'bg_mri_corridor_day_v2' })
}
function settle(n: number, text: string, gold: number, badge?: string): void {
  steps[`c4_${n}_end`] = { bg: 'ch2_bg_breakroom_day', speaker: 'sys', sprite: '', image: '', text,
    effect: { gold, ...(badge ? { badge } : {}) }, end: true }
}

// 1. A complete first-shift loop: exploration, a returning person, imaging, handover.
chain('c4_1_open', [
  ['sys', '2027年11月16日，周二早上八点。去年还在论证的3.0T MRI已经通过验收、投入门诊预约。你回到放射科，排定五个白班熟悉新设备，也帮刚进科的许宁认本院的交接和联系人。机房门外最后一批包装纸箱刚撤走。'],
  ['fan', '真到了。别光站门口看，过来看看这份线圈清单，哪只放哪儿都重新定过了。'],
  ['me', '设备清单年年写，我都快以为“计划引进”是它的名字了。'],
  ['zhou', '现在把“计划”划掉。许宁用过类似设备，本院交班你熟，你带她认人认路。我还在备班，有问题叫我。'],
  ['ning', '来，认个门。我先跟你走一遍。机器那边我在进修时用过，这科分机在哪儿倒还没找到。', { voice: 'vox_c4_xuning_v2' }],
  ['me', '先掀主任那摞文件。昨天响了半天，他以为隔壁电话没人接。', { effect: { flag: 'c4_started' } }],
], 'c4_1_hub', 'bg_mri_corridor_day_v2')
hub(1, [['走廊找老范', 'c4_1_fan_0', 'c4_1_fan'], ['休息室找许宁', 'c4_1_ning_0', 'c4_1_ning'], ['控制室找小雷', 'c4_1_lei_0', 'c4_1_lei']], 'c4_1_wrist_0')
chain('c4_1_fan', [
  ['fan', '别只盯三点零。报价后面还有线圈和维护，你别翻两页就告诉我看完了。', { effect: { ap: -1 }, giftTo: 'fan' }],
  ['me', '我才翻开，您就先查岗了。'],
  ['fan', '这回来问的人都只问场强。我就把后面这几页订在最前头，先让他们翻过去。'],
  ['me', '我看完还得问：场强高了，是不是图像就都好一倍？'],
  ['fan', '哪有这等好事，线圈、部位、方案还得对。登记表拿一张，先学会哪个出了问题找谁。', { card: 'c4_field', effect: { flag: 'c4_1_fan' } }],
], 'c4_1_hub', 'bg_mri_corridor_day_v2')
chain('c4_1_ning', [
  ['ning', '你们休息室连保温杯都写名字？', { effect: { ap: -1 }, giftTo: 'ning' }],
  ['me', '不写，老周能把你的奶茶当自己的浓茶。'],
  ['ning', '那我写杯底。正面写上去，喝一口像举一次牌。'],
  ['me', '看来分机还没找到，杯子已经找到地方了。今天看腕部，专用线圈登记在柜子左边。'],
  ['ning', '早上拿出来检查过，接头也对上了。就是柜子标签有点低，我找了半天才发现自己站在它前面。', { card: 'c4_coil', effect: { flag: 'c4_1_ning' } }],
], 'c4_1_hub', 'ch2_bg_breakroom_day')
chain('c4_1_lei', [
  ['lei', '新工作站没接那个老盒子。你不用每次进来都先看网口。', { effect: { ap: -1 }, giftTo: 'lei' }],
  ['me', '我看的是你饭盒。早上拿来还扎着带子，这都几点了？'],
  ['lei', '刚收到一份旧项目回函。对方把前期的事都写成“接口联调”，说资料全删了，让我们确认结项。'],
  ['me', '说删完就删完？'],
  ['lei', '没法就这么确认。我先对删除日期和任务号；前头那些措辞，等他们把范围补齐再谈。', { effect: { flag: 'c4_1_lei' } }],
], 'c4_1_hub')
chain('c4_1_wrist', [
  ['sys', '第一位预约者在门口甩了甩雨伞。年轻人抱着旧片袋，右手腕套了个护腕。'],
  ['wrist', '最近又疼了。我毕业以后不写作业，改成给老板写报告，手还是没歇着。', { caseId: 'c4_wrist', voice: 'vox_c4_wrist_v2' }],
  ['me', '报告也能开证明不写吗？'],
  ['wrist', '要有这项服务，我介绍全办公室来。'],
  ['sys', '小程把申请单递过来。两年前摔伤那次已经复诊处理过；最近打球后腕部又持续疼，骨科这次想进一步看软组织。'],
  ['wrist', '骨头都看过了，怎么还要换台机器？不是同一只手吗？'],
], 'c4_1_wrist_q')
question('c4_1_wrist_q', 'me', '小程捏着片袋，等你接话。', [
  { text: '「这次医生想看周围软组织，我先把旧片也调出来。」', next: 'c4_1_wrist_old_0' },
  { text: '「你先说最近什么时候疼，我记给负责医师。」', next: 'c4_1_wrist_recent_0' },
])
chain('c4_1_wrist_old', [['wrist', '旧片没白带就行。我妈找它，翻得像家里进过贼。'], ['me', '没白带，但不能拿旧伤替这次先下结论。']], 'c4_1_prepare_0')
chain('c4_1_wrist_recent', [['wrist', '拧瓶盖也疼。可不是两年都没好，最近这阵子才又闹的。'], ['me', '明白。我把时间分开记，免得看报告的人误会。']], 'c4_1_prepare_0')
chain('c4_1_prepare', [
  ['ning', '筛查确认好了，随身东西留在柜子里。小程，这个支垫往你手肘下放，先试试能不能躺稳。', { bg: 'bg_mri_room_day_v2' }],
  ['wrist', '还行。这个圈不转吧？上回那个CT转得我挺服气。', { bg: 'bg_mri_room_day_v2' }],
  ['me', '它不靠球管绕你转。待会儿声音会变，别跟着节拍晃手。', { bg: 'bg_mri_room_day_v2' }],
  ['wrist', '你别说，我打字就爱跟着音乐敲。', { bg: 'bg_mri_room_day_v2' }],
  ['sys', '许宁先在控制台旁拿着线圈，把摆放位置比给你看。随后你们安置小程，确认呼叫和耳部防护，回到控制室核对第一组序列。', { image: 'cg_c4_first_mri_v2', imageLabel: '许宁示范线圈与摆位准备', closeup: true }],
], 'c4_1_tool')
steps.c4_1_tool = { bg: 'bg_mri_control_day_v2', speaker: 'zhou', sprite: 'char_zhou', text: '刚才这次采集里的两组，放在同一位置看。你先切着比较，我坐旁边。',
  tool: { kind: 'mri', task: 'sequence', title: '同一只手腕，两种看法', prompt: '切换序列，留意骨髓、液体及周围软组织怎样变化。', image: 'mri_wrist', images: { T1: 'mri_wrist', T2: 'mri_wrist_t2' }, help: '序列改变组织对比。亮不等于病；先把不同序列和相邻层对应起来。', next: 'c4_1_result_1' } }
chain('c4_1_result', [
  ['sys', '采集完成，腕部图组进入工作站。老周把骨科写的疼痛位置放在旁边，请你先对照同次采集的两种加权。', { image: 'mri_wrist' }],
  ['ning', '刚才两组你都看了，液体信号和结构边界各有清楚的地方。交接怎么放？', { image: 'mri_wrist_t2' }],
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
  ['sys', '下午的预约全部完成。交班后，你换好衣服回来拿饭盒，控制室灯已关了一排，门后却传来很轻的“笃、笃”。停了一会儿，又是同样的节奏。', { bg: 'bg_mri_control' }],
  ['ning', '等一下，你也听见了吧？我刚才整理的时候就有，没敢进去找。', { bg: 'bg_mri_control' }],
  ['zhou', '我在值班室，听到了。记下时间，叫工程师核对状态，你们别自己进门找声源。', { bg: 'bg_mri_control' }],
  ['sys', '值班同事接过便签，按流程联系工程支持。你看了一眼门，许宁已经提起两只饭盒：“这个才是咱俩该带走的。”', { bg: 'bg_mri_control' }],
], 'c4_1_end')
settle(1, '本班交接完成。许宁把线圈放回原位，你检查了一遍登记。可以在休息室停留，准备好再进入下一班。', 200)
steps.c4_1_end.bg = 'bg_breakroom'

// 2. Two different reasons to pause: unknown foreign bodies and anxiety.
chain('c4_2_open', [
  ['sys', '11月18日，周四早上。工程支持的报告夹在交班本后面，前天下班听见的声音已经核过；窗外的阳光正落在你忘拿的饭盒上。'],
  ['ning', '这套机器的制冷系统，状态正常。你看，报告里把那两次时间都对上了。'],
  ['me', '前天那么安静，听着跟敲门似的。昨晚回家还惦记着。'],
  ['ning', '惦记机器，不惦记饭盒？我昨天已经洗了，赶紧收起来，别再陪它过一晚。'],
], 'c4_2_hub')
hub(2, [['核对设备声记录', 'c4_2_sound_0', 'c4_2_sound'], ['走廊和小唐聊聊', 'c4_2_tang_0', 'c4_2_tang'], ['找老周看植入物资料', 'c4_2_label_0', 'c4_2_label']], 'c4_2_luo_0')
chain('c4_2_sound', [
  ['ning', '前天那种慢节奏，和扫描时敲得很密的声音，不是一回事。', { effect: { ap: -1 }, giftTo: 'ning' }],
  ['me', '一个负责冷，一个负责吵？'],
  ['ning', '扫描的敲击主要和梯度切换有关。别把所有响声都记成“机器坏了”。'],
  ['me', '也不能一听有规律，就当正常。'],
  ['ning', '对，这次有工程师的记录。以后听到新的，还得报。我要每个节拍都自己猜，饭都没空吃了。', { card: 'c4_sound', effect: { flag: 'c4_2_sound', badge: 'c4_night_sound' } }],
], 'c4_2_hub')
chain('c4_2_tang', [
  ['tang', '有人传咱们MRI不用电费。理由是不发X光。', { effect: { ap: -1 }, giftTo: 'tang' }],
  ['me', '那让他去跟财务解释。解释成了，省下的钱买微波炉。'],
  ['tang', '先买个能转的托盘。小雷每回热饭还手动换个方向。'],
  ['me', '那先让他修托盘，别修完我们轮着手动热饭。', { effect: { flag: 'c4_2_tang' } }],
], 'c4_2_hub', 'bg_mri_corridor_day_v2')
chain('c4_2_label', [
  ['zhou', '这里有份厂家器械资料。写的是“MR条件安全”，后面还有好几行。', { effect: { ap: -1 }, giftTo: 'zhou' }],
  ['me', '不是见到这四个字，就能进咱们三点零？'],
  ['zhou', '型号、场强、扫描条件，得一项项对上。型号都没确认，别拿相似照片顶替。'],
  ['me', '我把条件页和型号页放一起。只有封面上这四个字，难怪您一直翻后面。', { card: 'c4_conditional', effect: { flag: 'c4_2_label' } }],
], 'c4_2_hub')
chain('c4_2_luo', [
  ['sys', '候诊椅上那只分了两格的布袋让你多看了一眼。罗阿姨也抬头：“又换一间屋上班了？”', { sprite: 'ch2_pat_luo_v1' }],
  ['luo', '我闺女让我把旧的全带来。装这么多，袋子再缝两道都不够。', { caseId: 'c4_luo_safety' }],
  ['me', '这次还是肩背不舒服？'],
  ['luo', '最近胳膊也麻。门诊想再看看。那十五根，我可没忘报。'],
  ['sys', '罗阿姨一页页递来旧治疗记录和CT光盘，许宁把她指出的那页摊在桌上。记录解释了针怎么留下，却没有可靠的材料、型号或MR条件。', { image: 'cg_c4_luo_records_v2', imageLabel: '罗阿姨带来的留针记录与旧片袋', closeup: true }],
], 'c4_2_luo_q', 'bg_mri_corridor_day_v2')
question('c4_2_luo_q', 'me', '申请单在，旧记录也在。眼下怎么办？', [
  { text: '先不进扫描间，把资料交安全评估医师核实', next: 'c4_2_luo_safe_0', effect: { skill: 1, badge: 'c4_pause' } },
  { text: '问老周，CT看得见针能不能替代材料资料', next: 'c4_2_luo_ask_0' },
], { bg: 'bg_mri_corridor_day_v2', sprite: 'ch2_pat_luo_v1' })
chain('c4_2_luo_safe', [['luo', '我不是不配合。别让我从早上等到下午，最后才说今天做不了。'], ['me', '我现在就找负责医师，后面怎么接也给您问清楚。']], 'c4_2_luo_care_0', 'bg_mri_corridor_day_v2')
chain('c4_2_luo_ask', [['zhou', 'CT能给位置，材料和磁场条件还得另查。您先坐外头这把椅子，我把开单医师也联系上。'], ['luo', '那我在这儿等，你跟他说，我闺女还带了旧票据。']], 'c4_2_luo_care_0', 'bg_mri_corridor_day_v2')
chain('c4_2_luo_care', [
  ['sys', '负责医师核看病情、旧影像和治疗记录，联系开单科室。今天暂不进行MRI，其他评估先接上，资料核实另留联系人。'],
  ['luo', '不是说我这辈子都不能做吧？'],
  ['zhou', '不是，以后有可靠资料还得重新评估。今天先把胳膊麻这件事接着看，门诊已经安排好了。'],
  ['me', '这个号码是科里的，不是让您去网上找当年那个诊所。'],
  ['luo', '行。要找旧票据，让我闺女找。她翻柜子比我利索。', { card: 'c4_foreign', effect: { flag: 'c4_luo_review' } }],
  ['sys', '罗阿姨和门诊护士一起走了。你把资料装回布袋，留在本院的复印件另做了接收记录。'],
  ['ning', '这个袋子真好用。我收线圈的标签总混成一团。', { giftTo: 'ning' }],
  ['me', '你别想顺她袋子。她改裤脚还要收费呢。'],
], 'c4_2_song_0', 'bg_mri_corridor_day_v2')
chain('c4_2_song', [
  ['sys', '罗阿姨离开后，你收好留存的复印件，许宁拿着申请单去候诊区叫下一位。老宋走来，把公交车钥匙倒出一大串，筛查都核好了，却在门口停住脚。'],
  ['anxious', '我怕这个洞。平时开那么大的车，今天连门都不敢进，怪丢人的。', { caseId: 'c4_song_motion', voice: 'vox_c4_song_v2' }],
  ['ning', '先不进。咱们就在这儿说，您是怕里面太窄，还是怕喊了没人听见？'],
  ['anxious', '进去以后，喊你们听不见。'],
], 'c4_2_song_q', 'bg_mri_corridor_day_v2')
question('c4_2_song_q', 'me', '老宋盯着门，不肯往前。', [
  { text: '先演示呼叫和中止方式，让他决定要不要试', next: 'c4_2_song_try_0', effect: { heart: 1 } },
  { text: '请负责医师一起讨论能接受的检查安排', next: 'c4_2_song_help_0' },
], { sprite: 'pat_mri_anxious', bg: 'bg_mri_corridor_day_v2' })
chain('c4_2_song_try', [['anxious', '这个捏一下，你真就过来？'], ['ning', '我们能听到，也能回应。你现在试一次，不先把人送进去。']], 'c4_2_song_scan_0', 'bg_mri_corridor_day_v2')
chain('c4_2_song_help', [['zhou', '先试试，受不了就停。如果真不能耐受，我再跟您一起商量其他安排。'], ['anxious', '那我先试，真不行我可要喊。']], 'c4_2_song_scan_0', 'bg_mri_corridor_day_v2')
chain('c4_2_song_scan', [
  ['sys', '试过呼叫，确认好耳部防护，老宋愿意先试一段。许宁替他把支垫调整好，你们回到控制台启动计划中的首段采集。'],
  ['ning', '听到了，我们停下来。我先把您接出来坐一会儿，别硬忍。'],
  ['anxious', '我刚才听见声音变了，怕是我把它弄坏了。', { bg: 'bg_mri_corridor_day_v2' }],
  ['me', '不是您弄坏的，换采集段声音也会变。先在外头歇会儿，我们看清刚才哪段受影响，再跟您说。', { bg: 'bg_mri_corridor_day_v2' }],
], 'c4_2_tool')
steps.c4_2_tool = { bg: 'bg_mri_control_day_v2', speaker: 'ning', sprite: 'char_mri_colleague', text: '用刚才保存的片段看运动影响。先看清哪段需要重来，再回去跟老宋说。',
  tool: { kind: 'mri', task: 'artifact', title: '不是又长出一层轮廓', prompt: '对照运动前后的轮廓，辨认重影，不用它猜疾病。', image: 'mri_brain_t2', help: '运动会破坏不同采样之间的一致性。先沟通、调整支持，再由团队决定必要补采。', next: 'c4_2_finish_0' } }
chain('c4_2_finish', [
  ['sys', '补采的必要片段已经进入工作站。老周核完整套，许宁帮老宋拿来外套，告诉他报告去哪个窗口取。', { image: 'mri_brain_t2', imageLabel: '必要片段补采后 · 头部MRI', card: 'c4_motion' }],
  ['anxious', '你们真听见了。行，比我车上那个报站喇叭靠谱。'],
  ['ning', '真有下回就提前告诉我们。今天您一捏，我们就听见了，不用忍到自己受不了。'],
  ['sys', '交班时，小雷把那封“全部删除”的回函放到桌上。他指着删除日期。你往上看见“接口联调”四个字，他已经把原稿折回了文件夹。', { effect: { badge: 'c4_call_heard' } }],
], 'c4_2_end')
settle(2, '本班资料与后续联系人已交接。老宋自己拿着外套离开；罗阿姨的核实任务留在正式交班记录里。', 220)

// 3. An unresolved present illness and a separate, verifiable family history.
chain('c4_3_open', [
  ['sys', '11月20日，周六早上。今天仍是预约白班，许建平的头部与颈部检查排在上午。你把两份申请分开，许宁端来的杯子底下，多了一张歪歪扭扭的姓名贴。'],
  ['zhou', '谁把她杯子贴成“许老师”的？'],
  ['me', '您。周四交班说字写大点，写完还挺满意。'],
  ['zhou', '哦，那不用改了。许老师，上午这两份申请，你跟他一起核。'],
], 'c4_3_hub', 'bg_mri_corridor_day_v2')
hub(3, [['档案窗口找小唐', 'c4_3_tang_0', 'c4_3_tang'], ['控制室听许宁吐槽', 'c4_3_ning_0', 'c4_3_ning'], ['休息室找小雷', 'c4_3_lei_0', 'c4_3_lei']], 'c4_3_xu_0')
chain('c4_3_tang', [
  ['tang', '查旧档案先给姓名、年代和授权，别只给我一句“有个老头”。', { effect: { ap: -1 }, giftTo: 'tang' }],
  ['me', '你这是骂谁呢？'],
  ['tang', '不点名。有的人把档案窗口当许愿池，还不投币。'],
  ['me', '我把需要的资料列好。查到同名的也不能直接算数。', { effect: { flag: 'c4_3_tang' }, card: 'c4_records' }],
], 'c4_3_hub', 'bg_mri_corridor_day_v2')
chain('c4_3_ning', [
  ['ning', '昨天有人看见三套序列，问是不是前两套都拍坏了。解释完，他又问怎么知道第三套没坏。', { effect: { ap: -1 }, giftTo: 'ning' }],
  ['me', '那你最后怎么说？'],
  ['ning', '拿同一个位置给他看。T2里水亮，FLAIR里水压暗，他才知道我不是悄悄重来三次。'],
  ['me', '这回我也记住了。光说“不同序列”，听着确实像我在拿名字糊弄人。', { effect: { flag: 'c4_3_ning' }, card: 'c4_flair' }],
], 'c4_3_hub')
chain('c4_3_lei', [
  ['lei', '回函只列了一个任务号，可当年不止一个。前期那份样本条件，我也列过。', { effect: { ap: -1 }, giftTo: 'lei' }],
  ['me', '那你前天为什么只说日期？'],
  ['lei', '前头写了我名字，我怕他们顺势把后面那些全推过来。范围没核齐，我还想先等等。'],
  ['me', '可你不交，他们怎么核？至少把前期文件登记进去，不确定的另写。', { effect: { flag: 'c4_3_lei' } }],
], 'c4_3_hub', 'ch2_bg_breakroom_day')
chain('c4_3_xu', [
  ['sys', '许建平从候诊椅上起来，把申请单抹平。外套领口松着，左颈贴了门诊查体留下的位置标记。'],
  ['mystery', '这块鼓起来有六个星期了。不怎么疼，我当时没管。', { caseId: 'c4_xu_neck' }],
  ['zhou', '门诊的记录我们看了。这次颈部要进一步看，头痛也有单独的申请，两份我都跟您核一下。'],
  ['mystery', '头疼的时候，我就想开车那会儿，找个服务区歇歇。退了休，倒不知道往哪歇。'],
  ['me', '先坐会儿。您今天不用赶下一站。'],
], 'c4_3_xu_q', 'bg_mri_corridor_day_v2')
question('c4_3_xu_q', 'me', '他把片袋夹在膝盖中间，手还攥着带子。', [
  { text: '「检查的事先说清，您有什么不放心的？」', next: 'c4_3_xu_listen_0', effect: { heart: 1 } },
  { text: '「旧片先给我吧，我给您按日期排好。」', next: 'c4_3_xu_sort_0' },
], { bg: 'bg_mri_corridor_day_v2', sprite: 'pat_mystery' })
chain('c4_3_xu_listen', [['mystery', '我不怕机器。怕拍完，还是一句“再看看”。'], ['me', '我记下来，报告出来请医师跟您说清。下次去哪儿、找谁，也别让您回家才想起来问。']], 'c4_3_head_0', 'bg_mri_corridor_day_v2')
chain('c4_3_xu_sort', [['mystery', '别弄混。我的片子，和我爸的资料，是两袋。'], ['me', '明白。先核这袋的姓名和日期，另一袋您自己收好。']], 'c4_3_head_0', 'bg_mri_corridor_day_v2')
chain('c4_3_head', [
  ['sys', '检查计划和安全筛查确认好后，许建平放下两只纸袋。许宁接好头部线圈，确认防护和呼叫，你们回控制台开始本次头部采集。'],
  ['ning', '头部这几组到了。先找同一位置的脑脊液，刚好用来对照三种看法。', { image: 'mri_brain_t2', imageLabel: '本次头部 MRI｜采集后 T2 加权' }],
], 'c4_3_tool')
steps.c4_3_tool = { bg: 'bg_mri_control_day_v2', speaker: 'ning', sprite: 'char_mri_colleague', text: '这三组都是刚才那次检查。切着看就行，不用重新进机房。',
  tool: { kind: 'mri', task: 'sequence', title: '同一层，不同对比', prompt: '轮流查看 T1、T2 与 FLAIR，比较脑脊液信号，不必猜疾病。', image: 'mri_brain_t1',
    images: { T1: 'mri_brain_t1', T2: 'mri_brain_t2', FLAIR: 'mri_brain_flair' }, help: '常见头部方案中，脑脊液在 T1 较暗、T2 较亮；FLAIR抑制自由液体信号。灰度还受具体参数影响，不能单凭亮暗诊断。', next: 'c4_3_neck_0' } }
chain('c4_3_neck', [
  ['sys', '颈部采集随后完成。老周把标记位置、相邻层和多组序列放在一起，不把头部片子里的亮暗当成颈部问题的解释。', { image: 'mri_neck', imageLabel: '本次颈部 MRI｜待综合判读' }],
  ['zhou', '颈部这组也到了。申请单写的是左侧，你先找位置，我把相邻层开在旁边。', { image: 'mri_neck' }],
  ['me', '这儿两边不太一样，我再跟前后两层对一对。', { image: 'mri_neck' }],
], 'c4_3_neck_q')
question('c4_3_neck_q', 'me', '老周把鼠标让给你，等着看你先翻哪一组。', [
  { text: '比较左右颈部软组织，再看相邻层是否延续', next: 'c4_3_neck_keep_0', effect: { skill: 1 } },
  { text: '我还对不上，请老周指着相邻层一起看', next: 'c4_3_neck_ask_0' },
], { image: 'mri_neck' })
chain('c4_3_neck_keep', [['zhou', '这里，左侧深颈部是一组淋巴结样软组织异常。形态和范围先记清，性质不能光靠这组定。']], 'c4_3_neck_talk_0')
chain('c4_3_neck_ask', [['zhou', '看我指的这里，左侧深颈部。相邻层能接上这组淋巴结样软组织异常；下一步还得结合临床。']], 'c4_3_neck_talk_0')
chain('c4_3_neck_talk', [
  ['sys', '医生向许建平解释目前的不确定性，安排耳鼻喉门诊继续评估；头痛的随访单独保留。', { effect: { flag: 'c4_neck_followup' }, card: 'c4_uncertain' }],
  ['mystery', '这次不是让我回家干等，是吧？'],
  ['zhou', '不是。这里是门诊预约和联系人，您跟着这张走；有变化及时回来，我把今天的发现交过去。'],
  ['mystery', '好。还有个事……我爸叫许守义。1998年离家，最后有人在你们医院见过他。'],
  ['sys', '他打开另一只旧纸袋。旧照片、户籍关系材料和一张过期的寻人启事，不是你方才看过的检查影像。'],
  ['me', '您愿意的话，我们走正式查询。先从姓名、日期和身份关系核起。'],
  ['mystery', '别帮我瞎认一个人。我认错过，难受得很。', { effect: { flag: 'c4_father_request' } }],
], 'c4_3_end', 'bg_mri_corridor_day_v2')
settle(3, '许建平的本次随访和父亲的档案查询分成两份记录。诊疗没有被寻人打断，旧资料也没有混进本次报告。', 240)

// 4. The discrepancy is between documents about 2025 exports, not a live device.
chain('c4_4_open', [
  ['sys', '11月23日，周二上午交班。信息科送来2025年的旧任务索引，设备科也从自己的邮件档里找到《样本整理建议》。今天预约照常；主任把双方的材料登记好，约了下午患者检查结束后再谈。'],
  ['lei', '索引里的接收端是**R-17**。另一份是前期联调时列的条件，文件上会留联系人。'],
  ['me', '可建议书上写的是你起草，提交日期还在CT试运行前。你前面只说自己接过线。'],
  ['lei', '前期列过些条件。具体拿去做什么，还得查他们那边。韩经理下午来，先让他把范围补齐。'],
], 'c4_4_hub', 'bg_mri_corridor_day_v2')
hub(4, [['休息室问问小凯', 'c4_4_kai_0', 'c4_4_kai'], ['走廊找老范', 'c4_4_fan_0', 'c4_4_fan'], ['控制室核对登记', 'c4_4_ning_0', 'c4_4_ning']], 'c4_4_han_0')
chain('c4_4_kai', [
  ['kai', '韩经理那句“我们一贯重视”，我听了三遍，前头那个“一贯”一遍比一遍长。', { effect: { ap: -1 }, giftTo: 'kai' }],
  ['me', '你是来打听，还是来模仿的？'],
  ['kai', '本来想打听。聊完只记住他领带上有只小鹿。'],
  ['me', '那你先别替他转述，下午让他把原话写在回复里。领带的事留着吃饭说。', { effect: { flag: 'c4_4_kai' }, card: 'c4_privacy' }],
], 'c4_4_hub', 'ch2_bg_breakroom_day')
chain('c4_4_fan', [
  ['fan', '新设备验收是验收，旧数据项目是旧项目。谁也别拿一张新合同盖掉旧事。', { effect: { ap: -1 }, giftTo: 'fan' }],
  ['me', '您这回说话很像开会。'],
  ['fan', '我这是防他们把两笔账订成一本。钉书机有时比嘴快。'],
  ['me', '两份各开一个夹子吧。您按着这页，我把编号贴上，钉书机先收起来。', { effect: { flag: 'c4_4_fan' } }],
], 'c4_4_hub', 'bg_mri_corridor_day_v2')
chain('c4_4_ning', [
  ['ning', '有人打电话问能不能导几套新片给工程师“顺便看看”。我让他把申请发正式渠道了。', { effect: { ap: -1 }, giftTo: 'ning' }],
  ['me', '他说什么？'],
  ['ning', '说别人都这么发。我说那你别选我。'],
  ['me', '没给就好。等会儿把这通电话登记一下，他要再来问，直接找负责的人。', { effect: { flag: 'c4_4_ning' } }],
], 'c4_4_hub')
chain('c4_4_han', [
  ['sys', '下午四点半，最后一位预约者取走衣物，临床工作交给下一班。你洗过手到办公室，主任把韩经理请到谈话桌，旧邮件、任务索引和现在的回函都已摊开。'],
  ['han', '旧项目的回函各位都收到了。我们清理完成，院方签个回执就行。'],
  ['director', '收到文件，我可以签。全部清理完成，这里还有一批你没回答，我现在拿什么确认？'],
  ['han', '是公司统一模板，不必把每个字——'],
  ['lei', '那请把“全部”对应的任务清单补上。'],
  ['sys', '主任翻到《样本整理建议》的日期页：“这份也请贵方核实接收记录。不能只回现在这张清单。”韩经理应了一声，没再催签字。'],
], 'c4_4_receipt_q', 'bg_office_day')
question('c4_4_receipt_q', 'me', '回函写“本项目数据全部删除”；院方独立留存的旧任务索引，还列着R-17对应的另一批次。', [
  { text: '请他逐项对照任务号和删除范围', next: 'c4_4_receipt_scope_0', effect: { skill: 1 } },
  { text: '先登记差异，交信息科正式追问', next: 'c4_4_receipt_record_0' },
], { bg: 'bg_office_day' })
chain('c4_4_receipt_scope', [['han', '这个可能是另一服务单，未必属于那份回函。'], ['me', '那您写的“全部”到底到哪一批？要是两张服务单，就两张都对一下。']], 'c4_4_conflict_0', 'bg_office_day')
chain('c4_4_receipt_record', [['director', '把未覆盖的编号列出，请贵方书面回复。今天不签“全部已核实”。'], ['han', '我回去向公司再核一下。']], 'c4_4_conflict_0', 'bg_office_day')
chain('c4_4_conflict', [
  ['sys', '信息科把未覆盖的批次逐项登记。你核了一遍：都是2025年断网前的历史任务，当前终端仍离线，问题在此前那些资料的去向。', { effect: { flag: 'c4_receipt_conflict', badge: 'c4_receipt' } }],
  ['han', '小雷，样本筛选条件也是你发过来的，不只有接口。这份建议我们会查。'],
  ['lei', '我列过条件，后面怎么用，我没有替你们签。该交的原稿，我会交。'],
  ['director', '两边各交自己的原始记录。提过什么、接收过什么、后来用到哪里，分别核，别把一件事全塞进“联调”两个字。'],
  ['sys', '韩经理收好文件离开。门关上后，休息室那台坏转盘的微波炉“叮”了一声，谁也没动。'],
], 'c4_4_lei_0', 'bg_office_day')
chain('c4_4_lei', [
  ['lei', '那份建议是我写的。前期他们问院里能整理什么，我就列了条件。'],
  ['me', '可那份原稿一直没在你交的审计材料里。为什么？'],
  ['lei', '回执副本和原稿一直在我这儿。我报了外传记录，没交这份建议。我怕一交，就把后面的事也全算到我头上。'],
  ['me', '你跟我们讲接过线，我们就按接线查。今天是设备科从自己的邮箱翻出来，才知道还有这份。'],
  ['lei', '对，这件我没说全。断线的记录都在，我也没删。这份现在交，后面的用途我得跟原始记录一起核。'],
], 'c4_4_lei_q', 'ch2_bg_breakroom_day')
question('c4_4_lei_q', 'me', '小雷把筷子掰开，又放回饭盒上。', [
  { text: '「先把记录正式交齐。其他的，之后再谈。」', next: 'c4_4_lei_file_0' },
  { text: '「我有点生气。今天你别再漏一件。」', next: 'c4_4_lei_angry_0' },
], { sprite: 'char_lei', bg: 'ch2_bg_breakroom_day' })
chain('c4_4_lei_file', [['lei', '我现在去交。你不用替我送，登记的人还在办公室。']], 'c4_4_late_0', 'ch2_bg_breakroom_day')
chain('c4_4_lei_angry', [['lei', '我知道。记得的写时间，不确定的单列。我先去交，你吃饭，不用在这儿等我。']], 'c4_4_late_0', 'ch2_bg_breakroom_day')
chain('c4_4_late', [
  ['sys', '信息科分别签收小雷交出的原稿、副本，以及设备科独立留存的邮件。起草日期一致，样本后续用途仍待接收方核验。你们没有删文件，也没有追进外部系统。'],
  ['ning', '你们的饭我热了。转盘不动，我中间手转过一次。'],
  ['me', '谢谢，今天居然是饭先等我。'],
  ['sys', '窗外已经是傍晚。你刚把饭吃完，收件箱弹出档案窗口的回信：许守义，1998年，找到一项转诊登记，身份仍需复核。你把回信留给原受理窗口，约明天跟进。'],
], 'c4_4_end', 'ch2_bg_breakroom_day')
settle(4, '旧任务索引、回函、设备科留存邮件和小雷补交的原稿已分别登记。他在试运行前参与样本方案的记录留下了，后续用途仍由院方核查。', 260)

// 5. Growth means an accountable handover, not a magical diagnosis or shortcut.
chain('c4_5_open', [
  ['sys', '11月25日，周四早上，最后一个设备学习白班。今天的加速方案评估安排在空闲工作站上，预约采集由当班同事负责。许宁给旧椅子贴了张纸：“轻坐，别旋转起飞。”'],
  ['ning', '今天有个加速方案评估。主任说让你带我过一遍资料，别拿患者临时试。'],
  ['me', '你来第一天说只要我教分机，现在连试飞都归我管。'],
  ['ning', '放心，椅子目前还没获准起飞。'],
], 'c4_5_hub', 'bg_mri_corridor_day_v2')
hub(5, [['看表姐发来的消息', 'c4_5_family_0', 'c4_5_family'], ['走廊找老范', 'c4_5_fan_0', 'c4_5_fan'], ['休息室陪老周喝杯茶', 'c4_5_zhou_0', 'c4_5_zhou']], 'c4_5_research_0')
chain('c4_5_family', [
  ['sys', '表姐发来一段语音：“八个月，能把袜子藏三个地方。你说这孩子像谁？”', { effect: { ap: -1 }, communication: 'sms' }],
  ['me', '像你。小时候藏作业也是这个路子。'],
  ['sys', '她回了一个拖鞋表情，再发来宝宝的小视频：八个月的孩子靠着软垫，一手抓住一只袜子。随访稳定后的这几个月，家里的群聊已经被辅食和小衣服占满。'],
  ['me', '袜子我下班再帮你找。上班呢，别一口气发十段，把重点先告诉我。', { effect: { flag: 'c4_5_family' } }],
], 'c4_5_hub', 'ch2_bg_breakroom_day')
chain('c4_5_fan', [
  ['fan', '储藏柜别堆到门口。能留下的老物件有老物件的位置，不能拿进磁体间当镇纸。', { effect: { ap: -1 }, giftTo: 'fan' }],
  ['me', '您怎么老觉得我会拿奇怪的东西进去。'],
  ['fan', '我防的是你们所有人，不只防你。昨天有人想拿普通工具箱进门，被拦在外头了。'],
  ['me', '好，柜子我整理。工具该走什么审核就走什么审核。', { effect: { flag: 'c4_5_fan' } }],
], 'c4_5_hub', 'bg_mri_corridor_day_v2')
chain('c4_5_zhou', [
  ['zhou', '给，茶叶蛋。不是病人送的，我楼下买的，最后两个。', { effect: { ap: -1 }, giftTo: 'zhou' }],
  ['me', '您以前不是让我自己找吃的？'],
  ['zhou', '那会儿你不知道把活交明白才走。现在会了，奖励一个。'],
  ['me', '第二个呢？'],
  ['zhou', '我的。别因为我夸你，就打我饭的主意。', { effect: { flag: 'c4_5_zhou' } }],
], 'c4_5_hub', 'ch2_bg_breakroom_day')
chain('c4_5_research', [
  ['sys', '办公室工作站里打开了批准用于这次评估的脱敏旧数据。许宁把来源和条件页放在屏幕旁，临床预约仍由当班同事照常完成，你们不另叫患者进来。'],
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
  ['zhou', '把噪声和伪影那两栏也写上，我要看代价。今天交的是评估表，临床怎么用还得团队另审。', { card: 'c4_acceleration' }],
  ['ning', '行。那我标题就不写“一键告别漫长检查”了。'],
  ['me', '标题先空着，您那两栏还没填完。填完再看看好不好意思这么写。'],
  ['sys', '小唐敲了敲外门。档案窗口完成了本院这段记录的身份复核，许建平也到了。'],
], 'c4_5_transfer_0')
chain('c4_5_transfer', [
  ['tang', '姓名、年龄信息和当年的转诊登记能互相对应。是许守义，不是只撞了个同名。', { effect: { badge: 'c4_same_person' } }],
  ['mystery', '那他那时候，真来过这里。'],
  ['tang', '来过。记录是**1998年正式转往外地省院**，这有接收医院与转诊编号。后面怎样，本院这份不能替外院说。', { image: 'item_transfer_record', imageLabel: '经核验的本院转诊登记｜1998年' }],
  ['sys', '许建平看了很久，没有去碰那张留在桌上的复印件。'],
  ['mystery', '我以前跑长途，路过那个城市好多趟。每次都想着，下一趟再去问。'],
], 'c4_5_transfer_q', 'bg_mri_corridor_day_v2')
question('c4_5_transfer_q', 'me', '走廊只剩空调声。他终于松开攥着片袋的手。', [
  { text: '等他缓一缓，再一起核对外院查询材料', next: 'c4_5_transfer_wait_0', effect: { heart: 1 } },
  { text: '「我把现在能确认的，和还不知道的分开写。」', next: 'c4_5_transfer_write_0' },
], { bg: 'bg_mri_corridor_day_v2', sprite: 'pat_mystery' })
chain('c4_5_transfer_wait', [['mystery', '让我坐两分钟。你们先别走，我还想问问外院要带哪些资料。']], 'c4_5_transfer_done_0', 'bg_mri_corridor_day_v2')
chain('c4_5_transfer_write', [['mystery', '给我吧。接收医院和编号写清，这回我不用一家家从头问了。']], 'c4_5_transfer_done_0', 'bg_mri_corridor_day_v2')
chain('c4_5_transfer_done', [
  ['sys', '在许建平授权下，档案窗口登记外院后续查询。你留下正式联系方法，没有把陌生人的旧胶片交给他认亲。', { effect: { flag: 'c4_father_transfer', badge: 'c4_transfer' } }],
  ['mystery', '我颈上这个，也会按约再去看。别为找我爸，把眼前的事耽误了。'],
  ['me', '两份事情都记着。您下回来，不用再从头讲。'],
  ['sys', '他走后，小雷把补充材料的接收凭证放进柜子。韩经理还没交来逐项回复；前期建议如何对应R-17及后续独立批次，核查单上仍留着一个空格。'],
  ['zhou', '下午交接你来讲。许宁在旁边听，下回她讲，你查漏。'],
  ['me', '我现在算能带人了？'],
  ['zhou', '算。但茶叶蛋没有按带教人数发。', { effect: { badge: 'c4_teacher' } }],
], 'c4_5_end', 'bg_mri_corridor_day_v2')
settle(5, '本班结束。研究比较、临床交接和两条后续查询各归各档。留下的是明确联系人和下一步，不是替未知写好的结论。', 280, 'c4_survivor')

chain('c4_epilogue', [
  ['director', '晨会题过了。许宁说你交接讲得清，我下午还要抽看两份，别一领凭证就把记录收了。'],
  ['me', '那晨会能不能也短一点？'],
  ['director', '可以。从你少这一句开始。'],
  ['sys', '许宁递来一个新杯垫，背面写着分机号码。“怕你哪天忘了。”你把它放在自己杯子下面。'],
  ['ning', '就放休息室。你教的分机我找到了，现在轮到提醒你别压在杯底忘了。', { effect: { item: 'c4_gift_coaster' } }],
  ['lei', '新回复还没来。补交的东西已经签收，后续找我核对，我会到场。'],
  ['sys', '几天后，许建平带着本次影像回门诊，颈部评估继续。外地省院也回复已受理寻档，给出了下一次联系时间，你分别记在两张表上。'],
  ['zhou', '明年的PET/CT进修名单在报。去省院两周，回来还得写转诊联络方案，想好了把名字报上。'],
  ['me', '先报吧。今年探头和线圈都认过了，明年总得再认识点新的。'],
  ['sys', '你把杯垫放到自己的杯子底下。隔壁有人叫下一个预约号，许宁应了一声，往控制室走去。你把她没带的登记夹递到门口。'],
], 'c4_epilogue_end', 'ch2_bg_breakroom_day')
steps.c4_epilogue_end = { bg: 'bg_mri_corridor_day_v2', speaker: 'sys', sprite: '', image: '', text: '第四章·共振，完。下一章：微光。', end: true }

// Acquisition and reviewing existing sequences are different actions. No scan
// node awards a clinical result; each raw next reveals only acquired data.
steps.c4_1_prepare_4.next = 'c4_1_wrist_scan'
steps.c4_1_wrist_scan = {
  speaker: 'sys', bg: 'bg_mri_control_day_v2', sprite: '', image: '',
  text: '小程的手腕放在线圈里，防护、支垫和呼叫已确认。许宁按既定计划开始采集，你在控制台核对本次图组。',
  scan: { kind: 'mri', label: '腕部 MRI · 计划内序列采集', durationMs: 3000, sound: 'trilogy_mri_scan_v2' }, next: 'c4_1_result_0',
}
steps.c4_1_result_0.next = 'c4_1_tool'
steps.c4_2_song_scan_0.next = 'c4_2_song_first_scan'
steps.c4_2_song_first_scan = {
  speaker: 'sys', bg: 'bg_mri_control_day_v2', sprite: '', image: '',
  text: '首段采集开始，梯度声按序列变化。你们盯着控制台，也听着老宋的呼叫；这一段中，他捏了呼叫装置。',
  scan: { kind: 'mri', label: '头部 MRI · 首段尝试采集', durationMs: 3000, sound: 'trilogy_mri_scan_v2' }, next: 'c4_2_song_scan_1',
}
steps.c4_2_tool.tool!.next = 'c4_2_song_repeat_scan'
steps.c4_2_song_repeat_scan = {
  speaker: 'sys', bg: 'bg_mri_control_day_v2', sprite: '', image: '',
  text: '老周核清受影响的片段，许宁把后面会听到的声音解释给老宋。他愿意再试，你们调整好支持，按原计划补采必要片段。',
  scan: { kind: 'mri', label: '头部 MRI · 必要片段补采', durationMs: 3000, sound: 'trilogy_mri_scan_v2' }, next: 'c4_2_finish_0',
}
steps.c4_3_head_0.next = 'c4_3_head_scan'
steps.c4_3_head_scan = {
  speaker: 'sys', bg: 'bg_mri_control_day_v2', sprite: '', image: '',
  text: '头部计划内采集开始。许宁核对各段状态，头痛这份检查的图组独立保存，许守义的查询材料留在外面的纸袋里。',
  scan: { kind: 'mri', label: '头部 MRI · T1 / T2 / FLAIR 采集', durationMs: 3000, sound: 'trilogy_mri_scan_v2' }, next: 'c4_3_head_1',
}
steps.c4_3_tool.tool!.next = 'c4_3_neck_scan'
steps.c4_3_neck_scan = {
  speaker: 'sys', bg: 'bg_mri_control_day_v2', sprite: '', image: '',
  text: '头部采集完成，团队按颈部申请核对下一段计划和线圈准备。许建平确认能继续，你们开始颈部采集，再把两份检查分组交接。',
  scan: { kind: 'mri', label: '颈部 MRI · 计划内采集', durationMs: 3000, sound: 'trilogy_mri_scan_v2' }, next: 'c4_3_neck_0',
}

for (let shift = 1; shift <= 5; shift++) {
  const hubId = `c4_${shift}_hub`
  const postcard = `c4_${shift}_postcard_use`
  steps[hubId].choices!.splice(-1, 0,
    { text: '在休息室把明信片递给许宁', next: `${postcard}_0`, cond: { item: 'c4_postcard', notFlag: 'c4_postcard_used' } },
  )
  chain(postcard, [
    ['sys', '你在明信片上写了科室分机和食堂位置，夹一句“欢迎，别再绕去住院部”，到休息室递给许宁。她看了两遍，笑着翻到背面。'],
    ['ning', '我进修时也收过一张。带教老师画的路线，只有三道箭头，我还是走错了。'],
    ['me', '三道还能错？'],
    ['ning', '他说“看见花就右拐”。保洁把花搬走，我一路走到器械库，还问为什么病人在那儿领拖把。'],
    ['me', '那我加一句：食堂不卖拖把。明天花搬了，你就找门牌。'],
    ['ning', '行。下回有新人，我先带着走一遍，不给他画花了。这张我贴休息室柜门里。', { effect: { loseItem: 'c4_postcard', flag: 'c4_postcard_used', badge: 'c4_postcard_story' } }],
  ], hubId, 'ch2_bg_breakroom_day')

  const endId = `c4_${shift}_end`
  const restId = `c4_${shift}_after_shift`
  // Only existing incoming story edges move; the old end cursor remains valid.
  for (const step of Object.values(steps)) if (step.next === endId) step.next = restId
  question(restId, 'sys', '交班完成，当班同事已接手。你在受控区外的休息室收好私人物品，可以歇一会儿再回去。', [
    { text: '下班后用新眼罩眯一会儿', next: `c4_${shift}_mask_use_0`, cond: { item: 'c4_sleep_mask', notFlag: 'c4_sleep_mask_used' } },
    { text: '收好东西，查看本班结算', next: endId },
  ], { bg: shift === 1 ? 'bg_breakroom' : 'ch2_bg_breakroom_day' })
  chain(`c4_${shift}_mask_use`, [
    ['sys', '你把眼罩从私人物品柜拿出来，只在受控区外的休息室戴上。外套搭在椅背，闹钟调好，临床工作已经交给当班同事。'],
    ['ning', '桌边这盏灯我关了。要我出门也轻一点？'],
    ['me', '门轻一点就行，椅子别替我推。这把一推能把我摇醒。'],
    ['sys', '你闭眼歇了十来分钟。醒来时，许宁在桌上留了一张纸，画着一把椅子，旁边写“已申请检修，请继续轻坐”。'],
    ['me', '眼罩还行，椅子问题终于有人替我报了。收柜子里，下次下班再用。', { effect: { loseItem: 'c4_sleep_mask', flag: 'c4_sleep_mask_used', badge: 'c4_rest_corner' } }],
  ], endId, shift === 1 ? 'bg_breakroom' : 'ch2_bg_breakroom_day')
}

const cards: TrilogyChapter['cards'] = {
  c4_field: { title: '3.0T不是万能翻倍键', body: '更高场强可以带来信号方面的机会，也带来均匀性、伪影、能量沉积及设备条件方面的取舍。线圈、序列、部位和实际任务一起决定好不好用。', image: 'bg_mri_room_day_v2' },
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
  c4_postcard_story: { name: '花搬走以后', icon: '✉', desc: '递出明信片，听许宁讲进修时认错路的旧事。' },
  c4_rest_corner: { name: '下班眯一会', icon: '☾', desc: '交班后在受控区外使用眼罩休息，发现许宁留下的椅子便条。' },
}
const book: TrilogyChapter['book'] = [
  { title: '01｜四个部分各干什么', body: '主磁体建立静磁场；射频系统激发并接收信号；梯度系统给信号编码位置；计算机控制时序并重建图像。MRI不靠X射线球管绕人旋转。' },
  { title: '02｜小磁矩与净磁化', body: '核自旋是量子属性，小箭头只是帮助理解的模型。许多核磁矩的矢量和形成宏观净磁化，不能说人体里的质子全被摆成同一个方向或停止进动。' },
  { title: '03｜共振要对频率', body: '氢核的拉莫频率随磁场改变，使用频率单位时约为42.58 MHz/T。RF要匹配相应进动频率；开着射频不等于有效激发，场强也不是所有图像质量自动翻倍的按钮。' },
  { title: '04｜脉冲怎样翻转磁化', body: '合适的RF脉冲将净磁化从纵向翻转，产生横向分量。翻转角与脉冲条件有关；90度是理解过程的例子，不是所有序列都只发90度。线圈检测变化的横向信号。' },
  { title: '05｜两个弛豫同时发生', body: 'T1描述纵向净磁化恢复，T2描述横向净磁化衰减。理想90度激发后，一个T1时恢复约63%，一个T2时横向余约37%；它们不是先后两个步骤。' },
  { title: '06｜FID与T2星', body: '自由感应衰减FID来自自由进动中的横向信号。实际场不均匀还引起额外去相位，观察到的T2*衰减通常比T2快。不要把接收信号说成质子在耳边敲响。' },
  { title: '07｜180度没有把时间倒回去', body: '自旋回波中的180度RF脉冲重聚可逆去相位，形成回波；并不撤销真正的T2衰减。梯度回波不使用同样的180度重聚机制，通常更易受场不均匀影响。' },
  { title: '08｜TR管下一次什么时候来', body: 'TR是重复时间，影响再次激发前纵向恢复到什么程度。在简化SE比较中，较短TR能突出不同T1恢复速度的差异；长TR减弱这类差异，但时间也增加。' },
  { title: '09｜TE管这次什么时候接', body: 'TE是回波时间。晚接会让更多横向信号衰减；不同T2的差异更明显，也可能信号太弱。TE不是病人等报告的时间，TR和TE不要一起乱拖后只说“亮了”。' },
  { title: '10｜同一组织的不同对比', body: '简化SE中，短TR/短TE常用于T1加权，长TR/短TE减弱弛豫差异以看质子密度，长TR/长TE突出T2差异。实际对比仍取决于序列和条件，不是固定滤镜。' },
  { title: '11｜为什么FLAIR能压暗自由液体', body: '反转恢复先翻转纵向磁化，再等到TI时激发。选择合适TI可让目标组织恢复经过零点时信号受抑；STIR常压脂肪，FLAIR常压自由液体。TI不能不看条件照抄一个数。' },
  { title: '12｜先挑一层', body: 'RF中心频率与层选梯度一起决定激发层的位置，RF带宽和梯度共同影响层厚。射频线圈并不是把无线电波像光学镜头那样聚焦到某个像素。' },
  { title: '13｜频率与相位各编码一个方向', body: '读出梯度让不同位置具有不同频率；相位编码在读出前引入不同位置相关的相位。重复不同相位编码收行，才能把二维位置区分开。这里的坐标方向是示例，不是病人的固定左右。' },
  { title: '14｜k空间不是照片缩略图', body: 'k空间是原始傅里叶数据，含幅度与相位。一个数据点和一个体内像素不一一对应；低频多反映整体轮廓和缓慢变化，高频帮助表达细边缘，不能把中心当成图像中心那一块。' },
  { title: '15｜重建真正在算什么', body: '常规笛卡尔二维采样可用二维逆傅里叶变换重建。教学中从同一数字样品计算数据，再改变进入重建的样本；显示缩放或给照片叠影不能替代采样与重建。' },
  { title: '16｜视野、矩阵与细节', body: '固定视野时，更密的矩阵能表达更小的像素，但信号、采样时间与实际分辨能力都要考虑。缩小视野不等于单纯把照片放大；对象超出可区分范围可能折叠进来。' },
  { title: '17｜丢边缘与隔行不是一回事', body: '限制高频覆盖会损失细节，也可能在高对比边界出现截断振铃；隔行采样会使不同位置混叠。看到整幅轮廓不代表信息完整，文件少一半不代表病人只拍了一半。' },
  { title: '18｜运动为何影响整幅图', body: '不同时间收的k空间行应对应同一个对象。运动破坏位置与相位一致性，伪影通过重建影响整幅图，常沿相位编码方向明显。门控、舒适支持、技术调整及必要补采应结合实际团队核查。' },
  { title: '19｜更快的几条不同路', body: '普通单回波教学模型的时间随相位编码行数、TR与平均次数变化。GRE可以缩短TR，FSE一轮收多个回波，并行成像利用多通道空间信息减少采样；它们的信号、噪声和伪影代价不同。' },
  { title: '20｜可选的新信息', body: 'DWI对水分子扩散敏感，并与ADC及其他信息一起看；常见BOLD fMRI反映血氧相关T2*信号变化，不是读心；MRS利用化学位移提供波谱信息。教学样品的漂亮结果不自动成为临床方案。' },
]
const quiz: TrilogyChapter['quiz'] = [
  { q: '只有静磁场，尚未施加合适RF时，净磁化主要是什么状态？', options: ['主要沿纵向，尚无要接收的净横向分量', '已经有一张完整MRI图', '所有质子都静止了'], answer: 0, explain: '静磁场建立纵向净磁化；匹配RF激发后才能产生用于接收的横向信号。' },
  { q: '为什么RF不能只开着就算有效激发？', options: ['RF和X射线是同一种射线', '需要匹配相应拉莫频率等脉冲条件', '接收线圈会自动替射频改频率'], answer: 1, explain: '进动频率与磁场有关，共振与脉冲条件影响激发。' },
  { q: 'T1与T2分别描述什么？', options: ['病人的两个检查部位', '同一张图片的两种缩放', '纵向恢复与横向衰减'], answer: 2, explain: '两种弛豫同时发生；T1纵向恢复，T2横向衰减。' },
  { q: '简化SE中，想突出T2衰减差异，应怎样理解TR与TE？', options: ['TR较长减弱T1差异，TE较长突出T2差异但损失信号', 'TR和TE越短，所有对比都越好', '只把图像亮度拉高'], answer: 0, explain: 'TR、TE影响信号形成的不同阶段，对比与可用信号需要一起考虑。' },
  { q: '自旋回波的180度脉冲主要做什么？', options: ['把真正T2衰减完全倒回去', '重聚可逆去相位，形成回波', '替代所有空间编码'], answer: 1, explain: '重聚不等于撤销内在弛豫；SE与GRE的重聚机制不同。' },
  { q: '梯度系统在MRI中怎样帮助得到位置？', options: ['让球管绕病人转', '直接把无线电波聚焦成一个像素', '使信号获得位置相关的频率或相位'], answer: 2, explain: '层选、频率编码和相位编码配合完成空间编码。' },
  { q: '为什么普通二维单回波模型需要多次相位编码？', options: ['收不同编码的行，区分另一个方向', '重复同一句病例介绍', '每次都必须换一个病人'], answer: 0, explain: '一行读出不能区分完整二维位置，多次相位编码形成二维k空间。' },
  { q: 'k空间中的一个点对应什么？', options: ['病人体内一个固定像素', '参与整幅图重建的傅里叶样本', '相同位置的旧片日期'], answer: 1, explain: 'k空间坐标和体内像素不一一对应，一个数据点变化可能影响整幅图。' },
  { q: '隔行采集后直接做普通逆傅里叶重建，可能发生什么？', options: ['自动补齐所有缺行', '仅把文件名变短', '不同位置混叠，不能只看节省时间'], answer: 2, explain: '欠采样会造成混叠；特殊重建需要相应额外信息和条件。' },
  { q: '多通道并行成像候选更快，评估时还要保留什么？', options: ['线圈空间信息、噪声、细节与重建条件', '只保留最快那一张的秒数', '任何病例都直接换用'], answer: 0, explain: '加速收益有条件，也有信噪比和重建代价；教学或研究比较不直接替代临床方案。' },
]

// Latest author direction: the five lectures determine the main learning spine.
// Long legacy audit/archive chains remain valid saved cursors, while their new
// entry points are brief optional conversations. Numerical kernels live in the
// common lab; these nodes never change a patient's clinical acquisition plan.
chain('c4_1_signal_intro', [
  ['ning', '柜子认完了，换你帮我一个忙。教学记录里只有“进磁体、出图”，中间像丢了一页。'],
  ['me', '我也刚想问。不转球管，信号从哪儿来？'],
  ['zhou', '先看两个量：一堆氢核的小磁矩，和它们加起来的净磁化。别把画出来的箭头当成真的小陀螺。'],
  ['ning', '样品在静磁场里有了纵向净磁化，可接收线圈还没等到我们要的横向信号。现在试射频。'],
], 'c4_1_signal_lab')
steps.c4_1_signal_lab = { bg: 'bg_mri_control_day_v2', speaker: 'ning', sprite: 'char_mri_colleague',
  text: '这是桌面教学样品。先对准共振频率，再发一个脉冲，看纵向和横向怎样分别变化。',
  tool: { kind: 'mri', task: 'mri-relax', variant: 'signal', title: '静磁场有了，为什么还没信号？',
    prompt: '比较射频有没有对准拉莫频率；激发后移动时间点，看纵向恢复与横向衰减。',
    help: '静磁场建立净磁化；匹配频率的RF脉冲能翻转它。RF停止后，T1描述纵向恢复，T2描述横向衰减；线圈接收变化的横向信号。', next: 'c4_1_signal_after_0' } }
chain('c4_1_signal_after', [
  ['me', '我把频率拧到另一边，脉冲还在，响应却小了。原来不是把功率开大就行。'],
  ['ning', '场强换了，质子的进动频率也跟着换。主磁体、射频发射和接收，各有各的活。'],
  ['zhou', '再看关掉脉冲之后。纵向在恢复，横向同时在衰减，别写成“先恢复完才开始衰减”。'],
  ['me', '记好了。我刚才差点给它们排成两个工序。'],
  ['sys', '你把“磁化—激发—接收”补进培训记录。许宁收到第一位预约者报到的消息，把教学样品收回桌边。', { card: 'c4_signal', effect: { flag: 'c4_signal_seen', skill: 1 } }],
], 'c4_1_wrist_0')
steps.c4_1_hub.choices!.at(-1)!.next = 'c4_1_signal_intro_0'
// Keep this saved ID and both acquired wrist images, without adding an eighth lab.
steps.c4_1_tool = { bg: 'bg_mri_control_day_v2', speaker: 'ning', sprite: 'char_mri_colleague',
  text: '这一张先看结构。下面那张换了对比，还是同一只手、同一个位置；不是把前一张失败的照片补亮。', image: 'mri_wrist', next: 'c4_1_result_1' }

chain('c4_2_timing_intro', [
  ['ning', '昨晚我重写了培训页。只写“T1一张、T2一张”，像是按两个按钮买套餐。'],
  ['me', '那今天把按钮后面的时间拆开看。'],
  ['zhou', '这两种教学样品的恢复和衰减不同。TR管多久再来一次，TE管多久去接这一回的回波。'],
  ['ning', '先把TE留短，只改TR。然后留够恢复时间，再晚一点接回波。两个旋钮别一起乱拖。'],
], 'c4_2_timing_lab')
steps.c4_2_timing_lab = { bg: 'bg_mri_control_day_v2', speaker: 'zhou', sprite: 'char_zhou',
  text: '这次比较的是相同教学样品。你看信号和曲线一起变，病人的计划不跟着这两个滑块变。',
  tool: { kind: 'mri', task: 'mri-relax', variant: 'contrast', title: '等多久再激发，等多久接回波',
    prompt: '分开调TR和TE，观察两种样品的信号差；比较短TR/短TE、长TR/短TE与长TR/长TE。',
    help: '简化SE信号由质子密度、纵向恢复和横向衰减一起决定。长TR减弱T1差异，短TE减弱T2差异；长TE能突出衰减差异，也会丢信号。', next: 'c4_2_timing_after_0' } }
chain('c4_2_timing_after', [
  ['me', '我一味把TE拉长，两边都快没信号了。差别大，不等于图就够用。'],
  ['zhou', '先往回拉一点。你是要比出差别，不是把两边都等黑。'],
  ['ning', '这版留着吧。刚才那张也别删，免得我下回又觉得“等久点总没错”。'],
  ['sys', '你们留下三组教学比较。候诊区的罗阿姨把布袋放上空椅子，许宁去接她的资料。', { card: 'c4_timing', effect: { flag: 'c4_timing_seen', skill: 1 } }],
], 'c4_2_luo_0')
steps.c4_2_hub.choices!.at(-1)!.next = 'c4_2_timing_intro_0'
steps.c4_2_tool.text = '先保留老宋的原始片段。许宁在另一份数字教学样品上重演一次位移：不是给照片叠一层影子，而是改变采到的行。'
steps.c4_2_tool.tool = { kind: 'mri', task: 'mri-sampling', variant: 'motion', title: '只动了一会儿，为什么整幅图都有影子？',
  prompt: '让教学样品在部分行采集期间发生一次位移，对照这些行重建出来的图。',
  help: '不同k空间行在不同时间采集。物体移动后，各行的相位关系对不上，重建时整幅图都会受影响。把位移调回零，留一份对照看看。', next: 'c4_2_song_repeat_scan' }

chain('c4_3_encoding_intro', [
  ['ning', '今天头部和颈部各有申请。我知道怎么排图组，可一直没给你讲清信号怎么带上地址。'],
  ['me', '接收线圈一收一大片，难道它自己认识哪块是左、哪块是右？'],
  ['ning', '不认识。选层时，射频和梯度一起挑一层；读出时，不同横向位置有不同频率。'],
  ['zhou', '另一个方向靠相位编码。每次让不同位置积累不同相位，收来的才不只是一列的总和。'],
], 'c4_3_encoding_lab')
steps.c4_3_encoding_lab = { bg: 'bg_mri_control_day_v2', speaker: 'ning', sprite: 'char_mri_colleague',
  text: '先用几个教学亮区认地址。原始行不是一条照片，收成k空间后才做二维逆傅里叶重建。',
  tool: { kind: 'mri', task: 'mri-encoding', variant: 'kspace', title: '同一个信号，怎么分出两个方向？',
    prompt: '看频率读出的一行，再改变相位编码，逐行收进k空间；比较行不够与收齐后的重建。',
    help: '层选决定被激发的层；频率编码与读出同时进行，相位编码区分另一方向。每一行包含全层的信息，k空间坐标不是病人体内的像素地址。', next: 'c4_3_encoding_after_0' } }
chain('c4_3_encoding_after', [
  ['me', '第一行看着只有一串数。补上不同相位的行，两个方向才分开。'],
  ['ning', '所以那串数不能贴在图像上当“这一排病人”。k空间和照片不是一格对一格。'],
  ['zhou', '记住这个，下午有人问能不能只丢一行，你就知道不能只看照片边上有没有少一条。'],
  ['sys', '许宁保存教学重建。许建平已在窗口报到，你们把他的头部与颈部申请按计划分别准备。', { card: 'c4_encoding', effect: { flag: 'c4_encoding_seen', skill: 1 } }],
], 'c4_3_xu_0')
steps.c4_3_hub.choices!.at(-1)!.next = 'c4_3_encoding_intro_0'
steps.c4_3_neck_talk_2.next = 'c4_3_course_close_0'
chain('c4_3_course_close', [
  ['ning', '头部三种对比，颈部另有一组。今天终于能把“信号地址”和“片袋地址”都讲清了。'],
  ['me', '还有明天那份少行的数据。您别先把它叫“快速完整版”。'],
  ['ning', '我叫它“候选”，省得主任问完整版是谁批准的。', { effect: { flag: 'c4_course_locations_done' } }],
], 'c4_3_after_shift')
steps.c4_3_hub.choices!.splice(-1, 0, { text: '窗口：看许建平的旧查询材料', next: 'c4_3_record_note_0', cond: { notFlag: 'c4_father_request', ap: 1 }, effect: { ap: -1 } })
chain('c4_3_record_note', [
  ['tang', '许建平托窗口收着另一袋材料。父亲叫许守义，要查的是1998年的记录，不是今天这两份MRI。'],
  ['me', '我沿原来的受理号补材料；身份关系核清了再查，不把没名字的片子塞给他认。'],
  ['tang', '登记好了。后续找这个窗口，今天的门诊随访另走医生留下的联系方式。', { card: 'c4_records', effect: { flag: 'c4_father_request' } }],
], 'c4_3_hub', 'bg_mri_corridor_day_v2')

steps.c4_4_open_0.text = '11月23日，周二上午。许宁比你早到十分钟，桌上已经摆了两杯豆浆。她把同一份样品开在两个窗口里，一边收齐，一边少收几行：“昨晚想的，今早试试。”'
steps.c4_4_open_1.speaker = 'ning'; steps.c4_4_open_1.sprite = characters.ning.sprite
steps.c4_4_open_1.text = '我给文件起名“少行候选”。昨天叫“快速漂亮最终版”，老周让我先把“最终版”删了。'
steps.c4_4_open_2.text = '他没让你把“漂亮”也删了？'
steps.c4_4_open_3.text = '你们先试，我去交这几页材料。许宁，别把文件又命名成“最终版二”啊。'
steps.c4_4_hub.text = '上午的患者由当班同事按预约接诊。教学工作站空出来了，你可以先找同事，再回来比较同一份采样数据。'
steps.c4_4_hub.choices!.at(-1)!.text = '回教学工作站，看看少掉的行'
steps.c4_4_hub.choices!.at(-1)!.next = 'c4_4_sampling_intro_0'
steps.c4_4_hub.choices!.splice(-1, 0, { text: '办公室：看旧项目补充说明', next: 'c4_4_optional_audit_0', cond: { notFlag: 'c4_receipt_conflict', ap: 1 }, effect: { ap: -1 } })
chain('c4_4_sampling_intro', [
  ['ning', '先别急着隔行。我要问另一件：只留中心，这些格子看着很亮，是不是就够了？'],
  ['me', '我先收一版，再拿细边缘和间隔跟完整的比。'],
  ['zhou', '同样数量，再换隔行收。两次结果都留着，我们看是不是同一种后果。'],
  ['ning', '那我不拿两张缩略图比“哪个更清楚”了。先把同一视野、同一大小摆好。'],
], 'c4_4_sampling_lab')
steps.c4_4_sampling_lab = { bg: 'bg_mri_control_day_v2', speaker: 'ning', sprite: 'char_mri_colleague',
  text: '教学数据的完整k空间留在旁边。这里改变真正进入逆傅里叶重建的样本，不改变窗口里的图片大小。',
  tool: { kind: 'mri', task: 'mri-sampling', variant: 'undersample', title: '少收同样多，为什么后果不同？',
    prompt: '分别只留中心行、隔行采集，再与完整采样对照；看细节损失与混叠怎样不同。',
    help: '固定视野时，足够的高频覆盖支持细节；采样间隔过大又会产生混叠。减少矩阵、缩小视野、跳行和图像缩放不是同一件事。', next: 'c4_4_sampling_after_0' } }
chain('c4_4_sampling_after', [
  ['me', '我把细节弄没了，还以为“没重影”就算好了。另一种却把不同位置折到一起。'],
  ['zhou', '分辨细节和不混叠，都得看。高对比边界旁的振铃，也可能来自有限采样，不是又长出一圈组织。'],
  ['ning', '少收行真省了时间，欠的信息可没因为文件名里有“最终”就回来。'],
  ['sys', '三种结果并排留好。许宁给最模糊的那张加了个文件名：“省过头了”。门外叫到下一位，你们收起本子，让出工作台。', { card: 'c4_sampling', effect: { flag: 'c4_sampling_seen', skill: 1 } }],
], 'c4_4_after_shift')
chain('c4_4_optional_audit', [
  ['sys', '主任把旧项目的补充说明留在办公室。回函、独立任务索引和设备科留存邮件各有编号。'],
  ['director', '回函写“全部”，另一个任务却还没答。今天登记收到文件，不确认全部已经核实。'],
  ['han', '我回去补任务清单和接收记录，把范围写清。'],
  ['lei', '前期样本建议是我写的，不能只说接过线。原稿和回执副本今天交齐。'],
  ['me', '起草、接收、后续用途，分别按原始记录核。断线和留证也不能漏掉。'],
  ['sys', '信息科签收原稿与独立邮件，登记未覆盖的R-17历史批次；都是2025年断网前的任务，后续用途仍待核验。'],
  ['director', '这页我接着查。你们的设备学习照常，不用在这儿替谁猜结论。'],
  ['sys', '你记下负责窗口，回到教学工作站。许宁把“少行候选”那一页留着，等你一起看。', { card: 'c4_privacy', effect: { flag: 'c4_receipt_conflict', badge: 'c4_receipt' } }],
], 'c4_4_hub', 'bg_office_day')

steps.c4_5_open_0.text = '11月25日，周四早上，最后一个学习白班。今天由你陪许宁做采样与重建的对照交接，预约患者仍交给当班团队。她给旧椅子贴了张纸：“轻坐，别旋转起飞。”'
steps.c4_5_open_1.text = '前几天你都替我拖完了。今天让我先做，你帮我看有没有把条件漏掉。'
steps.c4_5_hub.choices!.splice(-1, 0,
  { text: '档案窗口：看看转诊查询的短回复', next: 'c4_5_record_reply_0', cond: { notFlag: 'c4_father_transfer', ap: 1 }, effect: { ap: -1 } },
  { text: '休息室：问许宁课件后面的三种新信息', next: 'c4_5_advanced_q', cond: { notFlag: 'c4_advanced_seen', ap: 1 }, effect: { ap: -1 } },
)
steps.c4_5_hub.choices!.at(-1)!.text = '回教学工作站，让许宁先做一版'
steps.c4_5_research_0.text = '许宁重新打开昨天的样品，先把完整采样锁在旁边：“这次你别提醒我。我自己试一份，你挑毛病。”'
steps.c4_5_research_1.text = '相位编码要重复收行，普通单回波模型里少一半行能省循环。可我不能只写用了多久。'
steps.c4_5_research_2.text = '对。把你留的行和重建出来的图一起给我看，我先不碰你的鼠标。'
steps.c4_5_research_q = { bg: 'bg_mri_control_day_v2', speaker: 'ning', sprite: 'char_mri_colleague',
  text: '许宁准备先做候选，再回完整数据核对。你在旁边看采样记录，不帮她把缺掉的行悄悄补回去。',
  tool: { kind: 'mri', task: 'mri-sampling', variant: 'undersample', title: '许宁先做一版：快到哪里，代价在哪儿',
    prompt: '比较完整采样与省行候选的循环数、细节和混叠；同一任务下保留能说明取舍的一版。',
    help: '普通单回波模型的时间随相位编码行数、TR和平均次数变化；FSE可一轮收多个回波，GRE可缩短TR。并行成像还要利用不同线圈的空间信息，缺行后直接IFFT不会自行解开混叠。', next: 'c4_5_research_close_0' } }
steps.c4_5_research_close_0.text = '省行不是白省。多通道接收可以为解混叠提供不同的空间信息，重建也有条件；线圈不独立、噪声变大，都得留在比较里。'
steps.c4_5_research_close_1.text = '那我写“候选省了循环”，不写“所有病人都能缩短一半”。图里缺什么也写上。'
steps.c4_5_research_close_2.text = '还有用了什么重建。FSE多回波、GRE短TR、并行成像少行，别全混成“换个快速序列”。'
steps.c4_5_research_close_3.text = '临床交班已经完成。老周让你们把采样、重建与尚未证实的地方放在一张培训页上，许宁先讲，你来查漏。'
steps.c4_5_research_close_3.next = 'c4_5_course_handover_0'
chain('c4_5_course_handover', [
  ['ning', '我以前交接总说“这组快一点”。现在还得说清楚怎么收的，和怎么重建的。'],
  ['me', '先讲你这一页。我忍住不替你按鼠标。'],
  ['ning', '少采样的候选有折叠；完整那份留下作对照。要继续加速，得看线圈信息和重建条件，不能先把缺点删了。'],
  ['zhou', '这回没漏。回去把第一天那页翻出来，你俩当时还在问这个圈转不转。', { effect: { badge: 'c4_safe_research' } }],
  ['me', '那页也留着，不叫“最终版”。'],
  ['sys', '许宁把结果存好，终于合上本子。交班的同事进来了，你端起早就凉透的茶，跟她回休息室收东西。', { card: 'c4_acceleration', effect: { flag: 'c4_course_complete', badge: 'c4_teacher' } }],
], 'c4_5_after_shift')
chain('c4_5_record_reply', [
  ['sys', '档案窗口完成了本院转诊登记的身份复核。许建平授权查的许守义，姓名、年龄和转诊编号能互相对应。'],
  ['tang', '记录是1998年正式转往外地省院。这里仅能确认本院这一段，外院的后续要沿接收院继续核。', { effect: { badge: 'c4_same_person' } }],
  ['me', '我把受理号和联系人记给他。他自己的颈部随访另留一张，不把两件事混进同一个片袋。'],
  ['sys', '回复交到原受理窗口，许建平按约继续查询。你回到休息室，教学比较那页还等着许宁开讲。', { card: 'c4_records', effect: { flag: 'c4_father_transfer', badge: 'c4_transfer' } }],
], 'c4_5_hub', 'bg_mri_corridor_day_v2')
question('c4_5_advanced_q', 'ning', '课件后半本还有三种“不是只换个灰度”的信息。饭没热好，挑一个聊两句？', [
  { text: 'DWI看水分子怎样动？', next: 'c4_5_dwi_0' },
  { text: 'fMRI那个活动图从哪来？', next: 'c4_5_fmri_0' },
  { text: 'MRS为什么像一排山峰？', next: 'c4_5_mrs_0' },
], { bg: 'ch2_bg_breakroom_day' })
chain('c4_5_dwi', [
  ['ning', '扩散敏感梯度让移动的水分子产生不同去相位。比较不同b值，能估计表观扩散系数ADC。'],
  ['me', '所以不是看一张DWI亮就喊“扩散受限”，还要对ADC和其他信息。'],
  ['ning', '对，先别光看哪张漂亮。哎，微波炉响了，这页夹住，饭再热一遍就没法吃了。', { effect: { flag: 'c4_advanced_seen' } }],
], 'c4_5_hub', 'ch2_bg_breakroom_day')
chain('c4_5_fmri', [
  ['ning', '常见BOLD fMRI利用血氧变化带来的T2*信号差，连续采集，再比较任务和休息时段。'],
  ['me', '手指敲一会儿、停一会儿那种？可不是给想法拍张照片。'],
  ['ning', '不是读心，运动和生理变化也要处理。先吃饭，别把我没吃饱的信号算成思考。', { effect: { flag: 'c4_advanced_seen' } }],
], 'c4_5_hub', 'ch2_bg_breakroom_day')
chain('c4_5_mrs', [
  ['ning', '不同化学环境让同一种核的共振频率略有不同，FID做傅里叶变换能得到波谱。'],
  ['me', '图上的峰给的是成分相关信息，不是把某块组织画得更亮。'],
  ['ning', '对，频谱和解剖图各回答不同问题。这个也得看条件，不是一峰定病。', { effect: { flag: 'c4_advanced_seen' } }],
], 'c4_5_hub', 'ch2_bg_breakroom_day')
steps.c4_4_end.text = '交班完毕。许宁把“省过头了”那张也存下来，说下次谁只夸速度，就先给他看这个。明天轮到她自己配一版。'
steps.c4_5_end.text = '五次设备学习白班完成。采样、对比、空间编码与重建的培训记录已交接；可以整理物品、翻书，准备好再参加晨会。'
steps.c4_epilogue_7.text = '明年的PET/CT进修名单在报。MRI这回从信号讲到重建了，去省院再看看示踪剂的信号从哪里来。'

cards.c4_signal = { title: '先有磁化，再有可接收信号', body: '静磁场建立纵向净磁化；匹配进动频率的RF脉冲翻转磁化，接收线圈检测变化的横向分量。T1纵向恢复和T2横向衰减同时发生。' }
cards.c4_timing = { title: '同样品，两个等待时间', body: 'TR影响再次激发前的纵向恢复，TE影响接回波时留下的横向信号。简化SE模型中，质子密度、T1恢复和T2衰减共同决定信号，不能只比哪张亮。' }
cards.c4_encoding = { title: '信号怎样带上地址', body: '层选用RF与梯度配合；读出时频率编码区分一个方向，相位编码区分另一个方向。原始数据形成k空间，二维逆傅里叶变换得到图像。' }
cards.c4_sampling = { title: '丢高频与跳行，后果不同', body: '固定视野时，高频覆盖关系到边界细节；采样间隔关系到是否混叠。k空间与像素不一一对应，局部数据变化会影响整幅重建。' }
export const CH4: TrilogyChapter = {
  id: 'ch4', title: '共振', subtitle: '从磁化到重建，陪新同事认清信号', icon: '🧲', year: 2027,
  equipment: '3.0T MRI', background: 'bg_mri_corridor_day_v2',
  shifts: [
    { id: 'c4_1', title: '第一班·信号从哪来', subtitle: '白班 · 磁化、射频与小程的手腕', date: '2027-11-16 · 白班', start: 'c4_1_open_0', background: 'bg_mri_corridor_day_v2' },
    { id: 'c4_2', title: '第二班·两个等待时间', subtitle: '白班 · TR、TE与老宋的运动片段', date: '2027-11-18 · 白班', start: 'c4_2_open_0', background: 'bg_mri_corridor_day_v2' },
    { id: 'c4_3', title: '第三班·给信号一个地址', subtitle: '白班 · 空间编码、k空间与同次对比', date: '2027-11-20 · 白班', start: 'c4_3_open_0', background: 'bg_mri_corridor_day_v2' },
    { id: 'c4_4', title: '第四班·少掉的行', subtitle: '白班 · 分辨细节、采样与重建', date: '2027-11-23 · 白班', start: 'c4_4_open_0', background: 'bg_mri_corridor_day_v2' },
    { id: 'c4_5', title: '第五班·让她先做一版', subtitle: '白班 · 加速取舍与带教交接', date: '2027-11-25 · 白班', start: 'c4_5_open_0', background: 'bg_mri_corridor_day_v2' },
  ], steps, afterQuiz: 'c4_epilogue_0', characters, badges, cards, book, quiz,
  shopItems: [
    { id: 'c4_sleep_mask', name: '柔软眼罩', price: 30, desc: '只在下班后的休息室用。躺稳之前，最好先看看那把旧椅子。', image: 'item_c4_sleepmask_v2', use: 'c4_sleep_mask_used' },
    { id: 'c4_postcard', name: '科室明信片', price: 35, desc: '给新同事写个欢迎便条，再问问她以前怎么认路。放在受控区外。', image: 'item_c4_postcard_v2', use: 'c4_postcard_used' },
  ],
  assets: [...new Set([
    ...Object.values(characters).flatMap(c => c.sprite ? [c.sprite] : []),
    'bg_mri_room_day_v2', 'bg_mri_control_day_v2', 'bg_mri_corridor_day_v2', 'bg_mri_control', 'bg_breakroom', 'ch2_bg_breakroom_day', 'bg_office_day',
    'mri_wrist', 'mri_wrist_t2', 'mri_brain_t1', 'mri_brain_t2', 'mri_brain_flair', 'mri_neck', 'item_transfer_record',
    'cg_c4_luo_records_v2', 'cg_c4_first_mri_v2', 'item_c4_sleepmask_v2', 'item_c4_postcard_v2',
  ])],
  adapt(id, step, state) {
    const flags = state.flags
    if (id === 'c4_2_luo_0' && !flags.c2_needle_seen) return { ...step, text: '候诊椅上坐着一位提着双层布袋的女士。申请单写着“罗女士”，袋子里旧片和票据分得整整齐齐。' }
    if (id === 'c4_2_luo_1' && !flags.c2_needle_seen) return { ...step, text: '我姓罗。以前查到过留下来的针，资料都带来了，你们先看看。' }
    if (id === 'c4_2_luo_2' && !flags.c2_needle_seen) return { ...step, text: '申请单写肩背不适。这次还有哪里不舒服？' }
    if (id === 'c4_2_luo_care_7' && !flags.c2_needle_seen) return { ...step, text: '你别想顺她袋子。资料装好，我去把联系人再核一遍。' }
    if (id === 'c4_2_luo_care_6' && flags.c2_payoff_luo_gift) return { ...step, text: '她以前送你的那个光盘袋，还在柜子里吧？我一看这针脚就认出来了。' }
    if (id === 'c4_5_fan_0' && flags.n5_fan) return { ...step, text: '当年给你的报废铅眼镜，还在柜子里吧？留着当纪念，别当防护用品，更别拿进磁体间。' }
    if (id === 'c4_5_zhou_1' && flags.n5_qian) return { ...step, text: '以前工地大叔托人送苹果，现在您给茶叶蛋。别人一夸我就给吃的，我倒不太好意思空着手走了。' }
    if (id === 'c4_5_family_2' && !flags.c3_cousin_followup_stable) return { ...step, text: '她回了一个拖鞋表情，接着发来八个月大的孩子笑得直往后仰的小视频。家里人聊着辅食和袜子，没再拿工作时间催你看手机。' }
    if (id === 'c4_3_neck_talk_3' && flags.c3_xu_query_started) return { ...step, text: '好。还有我爸许守义那件事，上次登记以后，我又把家里剩的旧资料找齐了。' }
    if (id === 'c4_3_neck_talk_4' && flags.c3_xu_query_started) return { ...step, text: '他打开另一只旧纸袋。上次受理的回执在最上面，下面是这次补来的关系材料；不是方才检查的那一袋影像。' }
    if (id === 'c4_3_neck_talk_5' && flags.c3_xu_query_started) return { ...step, text: '我交给原来的受理窗口，记在同一件查询下面。不会让您重新排一次。' }
    return step
  },
}
