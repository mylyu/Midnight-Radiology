import type { MriScannerModel, MriScanRegion, TrilogyChapter, TrilogyStep } from './trilogy-types'
import type { Choice } from './types'

/** 第四章：一周进修、回县装机，以及三天把人和记录都接稳的日常。 */
const characters: TrilogyChapter['characters'] = {
  me: { name: '你', color: '#8ee0d1', sprite: 'me' }, sys: { name: '', color: '#cbd5e1' },
  zhou: { name: '老周', color: '#e7c58f', sprite: 'char_zhou' },
  fan: { name: '老范', color: '#d8c699', sprite: 'char_fan' },
  director: { name: '院长', color: '#d0d6e9', sprite: 'char_director' },
  tang: { name: '小唐', color: '#f2c1c8', sprite: 'char_tang' },
  shen: { name: '沈岚', color: '#a9d8ed', sprite: 'char_c4_shen_v3' },
  cousin: { name: '表姐', color: '#efbfd0', sprite: 'pat_cousin' },
  wrist: { name: '腕伤小伙', color: '#d9c4a5', sprite: 'ch2_patient_wrist_student' },
  anxious: { name: '冯叔', color: '#c3c8d8', sprite: 'pat_c4_feng_v3' },
  worker: { name: '疑似胆总管结石患者', color: '#d7bf9f', sprite: 'pat_c4_liu_v4' },
  courier: { name: '设备送货员', color: '#d7bf9f', sprite: 'char_c4_courier_v1' },
  elder: { name: '急诊老人', color: '#c8c2b4', sprite: 'pat_c4_fang_v3' },
  child: { name: '三岁女孩', color: '#c8d8ee', sprite: 'pat_c4_mother_child_pixel_v1' },
  mother: { name: '孩子妈妈', color: '#d8c3b5', sprite: 'pat_c4_mother_child_pixel_v1' },
  aunt: { name: '腹痛阿姨', color: '#ddb7bb', sprite: 'pat_c4_wu_v3' },
  knee: { name: '拄拐老师', color: '#c3c8d8', sprite: 'pat_c4_chen_v3' },
  mystery: { name: '许建平', color: '#b6bbd0', sprite: 'pat_c4_xu_v1' },
  wen: { name: '雯雯', color: '#d7b9dc', sprite: 'char_wen' },
  lei: { name: '小雷', color: '#a9c7e0', sprite: 'char_lei' },
  bai: { name: '老白', color: '#d7bf9f', sprite: 'char_bai' },
}
const steps: Record<string, TrilogyStep> = {}
type Row = [speaker: string, text: string, extra?: Partial<TrilogyStep>]
function nodeVenue(id: string): 'city' | 'county' {
  const n = Number(id.match(/^c4_(\d+)/)?.[1] ?? 1)
  return n <= 2 ? 'city' : 'county'
}
function chain(prefix: string, rows: Row[], next: string, bg?: string): void {
  const sceneBg = bg ?? (nodeVenue(prefix) === 'city' ? 'bg_c4_city_control_v1' : 'bg_c4_county_corridor_v1')
  rows.forEach(([speaker, text, extra], i) => {
    steps[`${prefix}_${i}`] = { bg: sceneBg, speaker, sprite: speaker === 'me' ? 'me' : characters[speaker]?.sprite ?? '', sprite2: '', image: '', text,
      next: i + 1 < rows.length ? `${prefix}_${i + 1}` : next, ...extra }
  })
}
function question(id: string, speaker: string, text: string, choices: Choice[], extra: Partial<TrilogyStep> = {}): void {
  steps[id] = { bg: nodeVenue(id) === 'city' ? 'bg_c4_city_control_v1' : 'bg_c4_county_corridor_v1', speaker, sprite: speaker === 'me' ? 'me' : characters[speaker]?.sprite ?? '', sprite2: '', image: '', text, choices, shuffleChoices: true, ...extra }
}
type HubVisit = [label: string, target: string, flag: string, effect?: Choice['effect'], risk?: Choice['risk']]
const placeNames: Record<string, string> = {
  c4_1_route: '登记台与候诊走廊', c4_1_family: '休息室', c4_1_help_shen: '准备区',
  c4_2_repair: '准备区', c4_2_shen: '休息室',
  c4_3_archive: '办公室', c4_3_door: '机房门口', c4_3_help_fan: '会议室',
  c4_4_chair: '候诊区', c4_4_contacts: '控制室', c4_4_help_zhou: '走廊',
  c4_5_adapter: '准备区', c4_5_waiting: '候诊区', c4_5_help_tang: '护士站',
  c4_6_follow: '办公室', c4_6_shen: '休息室', c4_6_help_tang: '茶水间',
}
const hiddenFinds: Record<string, { flag: string; label: string; text: string; icon: string }> = {
  c4_1_route: { flag: 'c4r7_hidden_referral', label: '登记台 · 核对退回的归档片袋', icon: '🗄️',
    text: '登记员刚收下**旧片数字化退回件**，交接单写着“1998年转诊卷宗待复核”。沈岚请你帮忙核对袋号。你们在登记台按单开袋，在夹层找到一角转诊附件：编号还能辨认，姓名已经磨掉。你拍下编号，登记员把原件装回、重新封存，在交接单上记下这处发现。' },
  c4_2_repair: { flag: 'c4r7_hidden_a17_ai', label: '看看线圈柜底层', icon: '🗄️',
    text: '柜底贴着半张**维修标签**，后面只有批次和工号。你拍下来，又照着原样把标签压平。' },
  c4_2_shen: { flag: 'c4r7_hidden_ai_activation', label: '帮忙收好休息室的杯子', icon: '☕',
    text: '沈岚那只旧保温杯掉了漆，杯底还贴着她的名字。你把杯子挪进里层，免得明天又被谁当成公用杯拿走。' },
  c4_3_help_fan: { flag: 'c4r7_hidden_official_ai', label: '翻翻报价夹的彩页', icon: '📑',
    text: '原厂报价夹里写得很直白：**基本重建已含，AI重建单列**。你把这行指给老范看，他总算不用拿着两页总价反复猜。' },
  c4_4_contacts: { flag: 'c4r7_hidden_remote_order', label: '看看交接信封', icon: '☎️',
    text: '信封里是一张**急诊与工程师联络卡**：值班电话、机房分机和夜间报修入口都在同一页。小唐把它压到控制室玻璃板下，省得真有事时翻一沓装机单。' },
  c4_5_adapter: { flag: 'c4r7_hidden_third_party_box', label: '看看准备柜里的支垫登记', icon: '📦',
    text: '支垫按尺寸和检查部位分了格，最底下还压着一张**清洁更换登记**。你把卷起的页角压平，放回原处。' },
  c4_6_follow: { flag: 'c4r7_hidden_transfer_copy', label: '看看记录夹封底', icon: '📁',
    text: '封底夹着一张**旧转诊附件复印件**，编号与市院那张残页相互印证。它仍没有写出植入物型号，只让1998年的档案查询少走了弯路。' },
}
function hub(n: number, text: string, visits: HubVisit[], next: string, startLabel = '回到主线'): void {
  const hubId = `c4_${n}_hub`
  const bg = n <= 2 ? 'bg_c4_city_corridor_v1' : n === 3 ? 'bg_office_day' : 'bg_c4_county_corridor_v1'
  const options: Choice[] = []
  visits.forEach(([label, target, flag, effect, risk], index) => {
    const key = target.replace(/_0$/, ''), placeId = `c4_${n}_place_${index}`, find = hiddenFinds[key]
    const place = placeNames[key] ?? '准备区'
    const firstSpace = label.indexOf(' '), icon = firstSpace > 0 ? label.slice(0, firstSpace) : '🧭'
    const eventLabel = firstSpace > 0 ? label.slice(firstSpace + 1) : label
    const activity: Choice = { icon, text: `${eventLabel}（⚡-1）`, next: target, cond: { notFlag: flag, ap: 1 }, effect: { ap: -1, ...effect },
      ...(risk ? { risk, tag: 'good' as const } : {}), disabledReason: '行动力不足；可以先四处看看，主线仍可继续。' }
    const legacyFind: Choice[] = find ? [{ icon: find.icon, text: find.label, next: `c4_${n}_find_${index}_0`, cond: { notFlag: find.flag }, tag: 'good' as const }] : []
    question(placeId, 'sys', `${place}里一切如常。你可以做正事，也可以随便看看。`, [
      activity, ...legacyFind, { icon: '↩️', text: '返回科室', next: hubId },
    ], { bg, shuffleChoices: false })
    options.push(activity, ...legacyFind)
    if (find) chain(`c4_${n}_find_${index}`, [
      ['sys', find.text, { effect: { flag: find.flag } }],
    ], hubId, bg)
  })
  question(hubId, 'sys', text, [
    ...options, { icon: '🛒', text: '小卖部', next: '@shop' }, { icon: '📖', text: '翻《磁共振笔记》', next: '@book' },
    { icon: '▶️', text: startLabel, next },
  ], { bg, shuffleChoices: false })
}

function settle(n: number, text: string, gold = 180, badge?: string): void {
  steps[`c4_${n}_end`] = { bg: n <= 2 ? 'bg_c4_city_staff_room_v1' : n === 6 ? 'bg_office' : 'ch2_bg_breakroom_day', speaker: 'sys', sprite: '', image: '', text,
    effect: { gold, ...(badge ? { badge } : {}) }, end: true }
}
function scan(id: string, text: string, label: string, next: string, mriRegion: MriScanRegion, mriModel: MriScannerModel,
  distress?: { atMs: number; stopAfterMs: number; text: string; voice?: string }): void {
  steps[id] = { speaker: 'sys', bg: mriModel.startsWith('city-') ? 'bg_c4_city_control_v1' : 'bg_c4_county_control_v1', sprite: '', image: '', text,
    scan: { kind: 'mri', label, mriRegion, mriModel, durationMs: 3000, sound: 'trilogy_mri_scan_v2', ...(distress ? { distress } : {}) }, next }
}

// 序章：进修不是去听一堂课，而是先把家里的班交接明白。
chain('c4_pro', [
  ['sys', '夜班记录刚订好，老范就夹着一张采购表进来了，纸角还沾着食堂的辣椒油。', { bg: 'bg_office' }],
  ['fan', '先别笑。院里真打算上MRI。你们天天跟患者打交道，缺什么，比我坐设备科猜强。', { bg: 'bg_office', voice: 'vox_c4_fan_first_v1' }],
  ['zhou', '机器我只在别家见过。真买回来，谁来接、怎么约、坏了找谁，都是咱们的事。', { bg: 'bg_office', voice: 'vox_c4_zhou_first_v1' }],
  ['me', '要不我去市院跟几天？别光听销售讲，我看看人家一天怎么过。', { bg: 'bg_office' }],
  ['zhou', '沈岚在市院带班。我们年会上认识，后来又一块做过培训。我给她打电话，有空位你就去，没空位别硬塞。', { bg: 'bg_office' }],
  ['sys', '第二天上午，沈岚回了消息：周三来，跟一周，管饭。', { bg: 'bg_office_day' }],
], 'c4_apply_zhou_0', 'bg_office_day')
chain('c4_apply_zhou', [
  ['zhou', '你的夜班我接。许建平还没定检查日期，先别排。老刘复查我来打电话。', { bg: 'bg_office_day' }],
  ['tang', '改约的电话我来盯。你把市院怎么排班看明白，回来别只给我们讲食堂。', { bg: 'bg_office_day', voice: 'vox_c4_tang_first_v1' }],
  ['me', '那食堂我也得看，不能漏项。', { bg: 'bg_office_day' }],
], 'c4_apply_director_0', 'bg_office_day')
chain('c4_apply_director', [
  ['sys', '院长看完申请，又瞄了眼小唐递过去的替班表。', { bg: 'bg_office_day' }],
  ['director', '人排开了就去。回来别只带一沓宣传页，把咱们照不照得起来也说明白。', { bg: 'bg_office_day', voice: 'vox_c4_director_first_v1', effect: { flag: 'c4_training_approved' } }],
  ['tang', '这句我记下了。宣传页您留着垫桌脚也行，替班表可别给我弄丢。', { bg: 'bg_office_day' }],
], 'c4_departure_0', 'bg_office_day')
chain('c4_departure', [
  ['sys', '老周当场拨电话。沈岚那边正叫号，背景里还有人问她饭盒放哪儿。', { bg: 'bg_office_day', communication: 'call', phone: 'char_c4_shen_v3', sprite: '' }],
  ['shen', '别提前背说明书，来了先帮我接患者。有空再看机器。周三见。', { bg: 'bg_office_day', communication: 'call', phone: 'char_c4_shen_v3', sprite: '' }],
], 'c4_city_arrival', 'bg_office_day')
steps.c4_city_arrival = {
  bg: 'bg_c4_city_corridor_v1', speaker: 'sys', sprite: '', sprite2: '',
  text: '周三傍晚，你拖着箱子站在市院门口。进修证背面是沈岚的名字，还有一行小字：到了先吃饭。',
  image: 'cg_c4_city_hospital_entrance', imageLabel: '市院报到｜一周跟班', closeup: true,
  effect: { flag: 'c4_city_week_started' }, next: 'c4_cousin_report_0',
}
chain('c4_cousin_report', [
  ['sys', '经过候诊区，你看了一眼靠窗那排椅子。去年表姐产检发现胎儿侧脑室有点增宽，后来就是在这家医院补做的MRI。'],
  ['sys', '你翻出手机里保存的检查图。报告仍写着**轻度侧脑室增宽**，但**没有发现其他脑部结构异常**。后来的复查也稳定。那阵子一家人悬着的心，总算慢慢放了下来。', { image: 'case_c4_fetal_mri_v1', imageLabel: '表姐留存的胎儿MRI', effect: { flag: 'c4_cousin_mri_resolved' }, next: 'c4_cousin_report_compare' }],
  ['cousin', '又去市院啦？我这边刚喂完奶，现在轮到他不让全家睡觉了。', { communication: 'sms', phone: 'pat_cousin' }],
  ['me', '你趁他睡着也眯会儿，我先去报到。', { communication: 'sms', phone: 'pat_cousin' }],
], 'c4_1_open_0', 'bg_c4_city_corridor_v1')
steps.c4_cousin_report_compare = {
  bg: 'bg_c4_city_corridor_v1', speaker: 'sys', sprite: '', sprite2: '',
  image: 'case_c4_fetal_us_mri_v1', imageLabel: '胎儿脑部｜左：超声 · 右：MRI',
  text: '你又翻到当时医生给你看的对照图。左边是**超声**，右边是**MRI**。去年光顾着紧张，现在才有心思把里面的结构对上。',
  next: 'c4_cousin_report_2',
}

// 第一段：市院第一晚。设备介绍夹在接患者之前，两个病例各有未收尾的生活问题。
chain('c4_1_open', [
  ['sys', '报到第一晚，你盯着英文门牌多看了两秒。里面的人笑了一声，替你扶住门。'],
  ['shen', '县院来的吧？沈岚。老周把你夸了半天，总结起来就是“能熬夜”。箱子先放柜边，晚饭吃了没？', { voice: 'vox_c4_xuning_v3' }],
  ['me', '车上吃了个面包。我跟着你们打下手，不懂就直接问。'],
  ['shen', '那敢情好。腕伤小伙还有二十分钟到，先带你认认东西，省得一会儿让你拿支垫，你抱来个线圈。'],
], 'c4_1_magnet_0', 'bg_c4_city_corridor_v1')
chain('c4_1_magnet', [
  ['shen', '这台3T，超导磁体。永磁、常导的也都有，别看见外壳长得差不多就当一回事。', { image: 'mri_c4_magnet_system', imageLabel: '磁体系统｜设备实物与常见类型', card: 'c4_magnet' }],
  ['me', '老范那张表还问孔径和均匀度。场强我大概懂，后面两项跟患者有什么关系？'],
  ['shen', '**场强用T表示**。别的条件差不多时，高场的信号潜力更好，细节和速度更有余地；可伪影、射频能量和价钱也跟着来，不是人人都非3T不可。'],
  ['shen', '**孔径就是人躺进去那段空间，按厘米算**。宽一点，怕憋、块头大或者摆位麻烦的人能松快些。它治不了所有害怕，也不包图像一定漂亮。'],
  ['me', '均匀度那个ppm呢？数字越大越好？'],
  ['shen', '这回想反了。**看规定范围里的ppm差异，一般越小越均匀**。脂肪抑制、几何稳定、大范围成像都受影响。报价时别忘了问人家在哪个范围测的。'],
  ['shen', '还有，磁体不跟咱们一块下班。兜里的钥匙、硬币都留外头，别拿它试吸力。'],
], 'c4_1_rf_0', 'bg_c4_city_magnet_room_v1')
chain('c4_1_rf', [
  ['sys', '准备柜一开，头线圈、关节线圈、柔性线圈挤得满满当当。一个接头旁贴着窄标签：**A17转接件**，维修工号和日期快磨没了。你顺手把标签拍进手机。', { image: 'mri_c4_rf_system', imageLabel: '射频线圈实物｜头部、关节与柔性线圈', card: 'c4_rf' }],
  ['shen', '射频这头既要发脉冲，也要收信号。**通道**你就先当多路一起听。跟部位、线圈和序列配得上才有用，不是数越大越神气。'],
  ['me', '那为什么不弄个特大号，大家轮流用？'],
  ['shen', '**得包得住要看的地方，形状也得合适**。拿头线圈套脚踝，你看患者答不答应。贴合些，离组织近，信号通常更有利，也好固定。'],
  ['shen', '可贴合不是勒紧。人躺得难受，一会儿就得动，动了还得重扫。你少缠一圈胶带，可能反倒快些。'],
], 'c4_1_gradient_0', 'bg_c4_city_preparation_v1')
chain('c4_1_gradient', [
  ['shen', '等会儿咚咚咚，不是楼下装修。X、Y、Z三组梯度线圈在给信号做空间定位，一干活动静就大。', { image: 'mri_c4_gradient_system', imageLabel: '梯度系统｜空间定位与关键参数', card: 'c4_gradient' }],
  ['me', '表上还有最大梯度强度mT/m、爬升率T/m/s。简单说，一个管多强，一个管多快？'],
  ['shen', '差不多。**最大梯度强度**影响小视野、薄层、高分辨和一些吃梯度的序列，DWI也算一个。别只挑最大数，得看整套序列能不能跟上。'],
  ['shen', '**爬升率**看多快到目标强度，跟回波间隔、快速序列和采集效率有关。切得快，噪声和刺激限制也更得留心，不能为了让表好看让患者硬忍。'],
  ['me', '行，这几项我知道怎么问了。腕伤小伙是不是该到了？'],
], 'c4_1_hub', 'bg_c4_city_magnet_room_v1')
hub(1, '设备看完，腕伤小伙还有几分钟到。附近还有点人气，也有沈岚刚拆到一半的箱子。', [
  ['🧭 候诊长椅 · 跟沈岚走一遍接送路线', 'c4_1_route_0', 'c4r6_1_route', {}],
  ['📞 休息室 · 给表姐回个电话', 'c4_1_family_0', 'c4r6_1_family', {}],
  ['🧺 准备区 · 帮沈岚拆一箱新支垫', 'c4_1_help_shen_0', 'c4r6_1_help_shen', {},
    { chance: 0.3, next: 'c4_1_help_shen_mishap_0', effect: { ap: -1, badge: 'good_intentions' } }],
], 'c4_1_case_0', '到门口接腕伤小伙')
chain('c4_1_route', [
  ['sys', '沈岚带你从登记台走到准备区，又绕到检查后的恢复椅，顺手把路上挡道的空箱挪开了。', { giftTo: 'shen' }],
  ['shen', '上回有个家属做完检查，绕了两圈才找着儿子。你记机器也记路，省得回头带人走丢。'],
  ['me', '登记、筛查、准备、采集，最后还得把人送对地方。我在采购表边上画一笔，省得回去忘。', { card: 'c4_overview', effect: { flag: 'c4r6_1_route' } }],
], 'c4_1_hub')
chain('c4_1_family', [
  ['sys', '你在休息室找了把椅子，给表姐拨过去。那头接得很快，声音却压得很低。'],
  ['cousin', '刚睡着。你姐夫抱着转了半天，一放下就醒。我俩现在走路都跟做贼似的。', { communication: 'call', phone: 'pat_cousin', sprite: '' }],
  ['me', '行，那我不逗你笑了。等我回去给你带点好吃的，别全让姐夫吃了。', { communication: 'call', phone: 'pat_cousin', effect: { flag: 'c4r6_1_family' } }],
], 'c4_1_hub', 'bg_c4_city_staff_room_v1')
chain('c4_1_help_shen', [
  ['sys', '你帮沈岚拆开新到的一箱支垫，按大小和用途摆进准备柜。她把软一点的留在最外层，说晚上腕部要用。'],
  ['shen', '这块最小的放左边。你摆得挺像样，就是包装别也给我收藏起来。', { effect: { flag: 'c4r6_1_help_shen' } }],
], 'c4_1_hub', 'bg_c4_city_preparation_v1')
chain('c4_1_help_shen_mishap', [
  ['sys', '（**意外**）你抽外包装抽得太猛，几块小支垫从箱底滑出去，滚了半间准备区。'],
  ['shen', '拆包挺有气势。喏，脚边还有一块，收拾完再走啊。', { effect: { flag: 'c4r6_1_help_shen' } }],
], 'c4_1_hub', 'bg_c4_city_preparation_v1')
chain('c4_1_case', [
  ['sys', '腕伤小伙拎着运动包来了，教练在门外打电话。他嘴上说只是扭了一下，右手却连矿泉水瓶都拧不开。', { caseId: 'c4_city_wrist' }],
  ['wrist', '右手腕又肿了，拧瓶盖都疼。', { voice: 'vox_c4_wrist_r7' }],
  ['wrist', '三个月前打球扭过，**X光说没骨折**。歇了两周，以为好了，谁知道一使劲还疼。'],
  ['me', '最近还打球吗？这回怎么又肿了？'],
  ['wrist', '昨晚又打了半场……别跟教练说啊。这回不会真练不了了吧？'],
  ['me', '先看清楚。申请单要查的是**三角纤维软骨复合体（TFCC）**，就在手腕小指侧，是帮关节稳住、缓冲受力的软骨和韧带。两次受伤都得说，不能瞒。'],
  ['wrist', '那检查会不会很疼？我最怕有人掰着它摆姿势。'],
  ['me', '不硬掰。先试支垫高度，疼就换角度；你要能维持，咱们再固定腕部线圈。'],
  ['sys', '他终于把手放到支垫上。你按他指的位置调低高度，让他试过能维持，再固定腕部线圈。']
], 'c4_city_wrist_scan')
scan('c4_city_wrist_scan', '腕部序列采集中。', '腕部 MRI · 运动伤采集', 'c4_1_case_result_0', 'wrist', 'city-3t')
chain('c4_1_case_result', [
  ['sys', '采集结束，沈岚把手腕小指侧的图放大，指了指信号断开的那一处。', { image: 'mri_real_tfcc_v1', imageLabel: '腕部MRI｜TFCC外周信号不连续' }],
  ['shen', '黄圈这块，你准备怎么记？', { image: 'mri_real_tfcc_v1' }],
  ['me', '写**TFCC外周信号不连续**。伤到什么程度，还得看完整图组和查体；三个月前和昨晚两次受伤，我也写进去。', { image: 'mri_real_tfcc_v1' }],
  ['wrist', '行。那教练问起来，你别替我说“只是扭了一下”。'],
], 'c4_1_case_q')
question('c4_1_case_q', 'shen', '教练过来了，他还有点藏事。你怎么接？', [
  { text: '陪他向教练说清两次受伤', next: 'c4_1_case_full_0', effect: { skill: 1, badge: 'c4r_full_context' } },
  { text: '让他自己说，我补充检查', next: 'c4_1_case_help_0' },
  { text: '先给教练看交接单，让他自己解释', next: 'c4_1_case_help_0' },
], { image: 'mri_real_tfcc_v1' })
chain('c4_1_case_full', [
  ['wrist', '教练，昨晚那场我也上了……怕你不让我比赛，就没敢说。'],
  ['me', '图组已经传过去。他疼的位置和两次受伤经过都在这一页，训练安排不用靠猜。'],
], 'c4_1_feng_0')
chain('c4_1_case_help', [
  ['wrist', '我自己说。你站我左边就行，教练看不见我瞪他。'],
  ['me', '好。你说受伤经过，我补充检查。下周能不能上场，等医师评估完再说。'],
], 'c4_1_feng_0')
chain('c4_1_feng', [
  ['sys', '晚上九点，冯叔和儿子一起来到3T检查室。他开了二十多年公交，刚才还在说笑，刚到孔口却停了下来。', { caseId: 'c4_city_claustrophobia' }],
  ['anxious', '医生，我这阵子老是头晕。', { voice: 'vox_c4_feng_r7' }],
  ['anxious', '前天有几分钟，说话都不利索，杯子也拿不稳。后来缓过来了，儿子还是不放心，非拉我来。'],
  ['me', '门诊那张**CT没看出血**，这次MRI接着查有没有**急性缺血**。您平时吃什么药？'],
  ['anxious', '就降压药。可我一看这个孔就心慌……以前困过电梯，到现在都怕关门。'],
  ['shen', '这属于**幽闭恐惧症**常见的反应，不是您故意不配合。呼叫您拿着；捏一下，控制台马上回应。'],
  ['me', '觉得不合适就出来，不用等“坚持到极限”才算数。真做不下去，还有换机、改约等办法。'],
  ['anxious', '那我儿子能留在这儿吗？我听见他的声音，可能好一点。'],
  ['shen', '让他在门外您看得见的地方。先试试呼叫，再决定进不进去。'],
  ['sys', '冯叔试了两次呼叫，儿子也站到了他看得见的地方。可第一个序列刚响，他就猛地捏住了呼叫。']
], 'c4_feng_basic_scan', 'bg_c4_city_corridor_v1')
scan('c4_feng_basic_scan', '3T首个头部序列刚开始采集。', '3T 头部 MRI · 首个序列开始', 'c4_1_feng_stop_0', 'head', 'city-3t',
  { atMs: 250, stopAfterMs: 3000, text: '冯叔：救命啊！让我出去！我喘不上气！', voice: 'vox_c4_feng_help_v1' })
scan('c4_feng_city_scan', '0.55T大孔径下，T1、T2、FLAIR、DWI依次分段采集。', '市院0.55T 头部 MRI · T1／T2／FLAIR／DWI', 'c4_1_contrast_0', 'head', 'city-055-wide')
chain('c4_1_feng_stop', [
  ['anxious', '先让我出去！里面刚一响，我就找不着门了。', { bg: 'bg_c4_city_corridor_v1' }],
  ['me', '已经停了，咱们先出来。**第一组刚开头，后面三组还没做**，我都记在交接单上。', { bg: 'bg_c4_city_corridor_v1' }],
  ['shen', '您一捏呼叫，我们就回应并停止。害怕来得这么快，不是您故意耽误大家。', { bg: 'bg_c4_city_corridor_v1' }],
  ['sys', '儿子把外套披到冯叔肩上，问他今晚是不是只能回去。冯叔捧着水，手还在抖。', { bg: 'bg_c4_city_corridor_v1' }],
  ['anxious', '我这样子，是不是就做不了？刚才我真以为自己要憋死在里面。', { bg: 'bg_c4_city_corridor_v1' }],
  ['shen', '不等于做不了。这层另一检查区还有一台**0.55T、80厘米大孔径**机器。您可以先去看一眼，也可以改约；今晚不继续，未完成项目还能按流程退费。', { bg: 'bg_c4_city_corridor_v1' }],
], 'c4_1_feng_q', 'bg_c4_city_corridor_v1')
question('c4_1_feng_q', 'shen', '他还捧着水。你先帮他理顺哪件事？', [
  { text: '先陪他坐稳，再谈换机或改约', next: 'c4_1_feng_sit_0', effect: { heart: 1, badge: 'c4r_call_answered' } },
  { text: '先把中止和换机需求写清楚', next: 'c4_1_feng_route_0', effect: { badge: 'c4r_call_answered' } },
  { text: '先说明退费和换机后的费用', next: 'c4_1_feng_refund_0', effect: { badge: 'c4r_call_answered' } },
], { bg: 'bg_c4_city_corridor_v1' })
chain('c4_1_feng_refund', [
  ['me', '如果今晚不再继续，**未完成项目可以退费**。要是愿意换机，收费处会按实际完成项目核，不让您为刚才那次中止重复买单。'],
  ['anxious', '能退我就放心了。先带我看看那台吧，我怕躺上去又得出来。'],
  ['sys', '你把退费、改约和换机都写在同一张后续单上。父子看完，决定先跟沈岚去另一检查区，费用等实际检查后再核。'],
], 'c4_1_feng_transfer_0', 'bg_c4_city_corridor_v1')
chain('c4_1_feng_sit', [
  ['anxious', '水放着，我自己拿。刚才你听见我捏了？'],
  ['me', '听见了，所以立刻停了。等您气顺一点再去看另一台；不想试就改约，门诊电话您和儿子都存一份。', { effect: { flag: 'c4_feng_waited' } }],
], 'c4_1_feng_transfer_0', 'bg_c4_city_corridor_v1')
chain('c4_1_feng_route', [
  ['shen', '我把“3T首个序列开始即中止”和大孔径需求写清楚，换机以后也不让您从头再讲一遍。'],
  ['anxious', '这张给我儿子也看看，省得他光替我拿主意。先去看看机器，我还没答应躺进去。'],
], 'c4_1_feng_transfer_0', 'bg_c4_city_corridor_v1')
chain('c4_1_feng_transfer', [
  ['sys', '沈岚带父子来到同层**另一检查区**。冯叔站在门外，先看那台0.55T、80厘米大孔径机器；儿子挪了把椅子，坐在他看得见的地方。', { image: 'cg_c4_city_wide_bore_v1', imageLabel: '市院另一检查区｜0.55T、80厘米大孔径MRI', closeup: true, cameraMotion: 'settle' }],
  ['shen', '这里宽一些，您躺着可能会松快些。噪声还是有的，呼叫也由您拿着；您说停，我们照样接您出来。', { image: 'cg_c4_city_wide_bore_v1', imageLabel: '换机说明｜孔口、噪声与呼叫' }],
  ['me', '这台场强低一些。为了拿到够用的信号，有些序列可能要久一点，或者调整分辨率和参数。您先看看，觉得能试，咱们再谈下一步。', { image: 'cg_c4_city_wide_bore_v1', imageLabel: '换机说明｜信号、时间与耐受的取舍' }],
  ['anxious', '慢点我能等。就是别一下把我关进去，好不好？', { image: 'cg_c4_city_wide_bore_v1', imageLabel: '冯叔来到大孔径检查室' }],
  ['shen', '对。今晚按门诊需要做**T1、T2、FLAIR、DWI**四组，咱们分段来，每组我都告诉您进度。', { image: 'cg_c4_city_wide_bore_v1', imageLabel: '四组序列｜分段采集，随时可以停止' }],
  ['me', '先扫一组试试。做到一半不愿继续，您随时捏呼叫。'],
  ['anxious', '我还是怕。可这孔口看着没那么压，儿子也在。先扫一组——你答应我，每次捏了都有人答。'],
  ['sys', '冯叔把呼叫攥在掌心，躺上0.55T大孔径检查床。第一段开始时他的肩膀仍绷着，却没有再要求立刻出来。'],
], 'c4_feng_city_scan', 'bg_c4_city_control_v1')
chain('c4_1_contrast', [
  ['sys', '**T1、T2、FLAIR、DWI四组都采完了**。沈岚扶冯叔坐起来，转身把你叫到工作站前：“看看这三张，脑脊液怎么不一样？”', { sprite: 'char_c4_shen_v3', image: 'mri_c4_basic_contrast_v1', imageLabel: '基础序列对照｜同一脑部的T1、T2、FLAIR', card: 'c4_contrast' }],
  ['me', '采集权重不一样。**脑脊液在T1偏暗、T2偏亮，FLAIR会把自由水信号压暗**；不能只凭亮暗判断好坏。', { image: 'mri_c4_basic_contrast_v1' }],
  ['anxious', '总算出来了……我刚才一直在心里数秒。'],
  ['shen', '再看冯叔这组，DWI高、ADC低，你又怎么理解？', { image: 'mri_real_stroke_sequences_v1', imageLabel: '冯叔的头部MRI｜DWI与ADC对照' }],
  ['sys', '医师看完图组，把脑桥区那一小灶指给父子看：**DWI高信号、ADC对应低信号**，结合症状，**疑似轻型缺血性卒中，也就是轻微中风**。冯叔捏着外套的手停住了。', { image: 'mri_real_stroke_sequences_v1', imageLabel: '冯叔的头部MRI｜脑桥小灶与各组序列', card: 'c4_stroke' }],
  ['anxious', '可我就几分钟说话不清，这会儿不是好好的吗？这样也算中风？', { image: 'mri_real_stroke_sequences_v1' }],
  ['me', '症状缓了是好事，但您这次的图和前天那阵表现都需要接着查。报告现在写的是**疑似**，今晚让神经内科医师结合查体和病史确认，再定用药和复查。', { image: 'mri_real_stroke_sequences_v1' }],
  ['sys', '儿子把报告折痕抚平：“我陪您去，今晚先听神经内科怎么安排。”冯叔看了他一眼，这回没有说自己能行。', { image: 'mri_real_stroke_sequences_v1' }],
  ['shen', '原始图组和报告都带过去。我已经联系神经内科，您儿子陪着，不用再到处找。', { image: 'mri_real_stroke_sequences_v1' }],
  ['anxious', '我还当缓过来就没事了……行，听你们的。'],
  ['sys', '沈岚把检查记录和转诊交接装进同一只文件袋，交给儿子。冯叔接过外套，临走前又回头问起下次复查。'],
], 'c4_1_close_0')
chain('c4_1_close', [
  ['shen', '今天用的0.55T、80厘米大孔径，还有分段做、每次答呼叫，我都记上了。复查带上这张单，省得从头再来。'],
  ['anxious', '下回复查还找你们啊。换生人，我又得从门口磨蹭半天。'],
  ['me', '我在调研表上也写“呼叫、陪伴、分段”。今天这几项都派上了用场。'],
], 'c4_1_end')
settle(1, '冯叔在市院另一台0.55T大孔径机器上完成四组头部序列。图组提示疑似轻型缺血性卒中，父子带着报告和原始图组前往神经内科；你的调研首页也多了几项真正用得上的取舍。', 120, 'c4r_city_start')

// 第二段：市院最后一晚。眼镜事故打断夜班，A17维修标签进入主线。
chain('c4_2_open', [
  ['sys', '在市院跟班的最后一晚，一位疑似胆总管结石的患者还在做筛查，门外家属正替他收眼镜和钥匙。'],
  ['shen', '收班以后你得回县院了。今晚先接这位患者，收班前再把维修登记核完；你回去还有采购要忙。'],
], 'c4_2_hub', 'bg_c4_city_corridor_v1')
hub(2, '夜班还没正式叫号。员工角有沈岚的旧保温杯，准备柜里还贴着上次维修留下的标签。', [
  ['🗄️ 准备柜 · 对一下维修标签和登记', 'c4_2_repair_0', 'c4r6_2_repair', {}],
  ['☕ 员工茶水角 · 看看沈岚的旧保温杯', 'c4_2_shen_0', 'c4r6_2_shen', {}],
], 'c4_2_incident_0', '患者到了，跟他进准备区')
chain('c4_2_repair', [
  ['sys', '你把第一晚拍的照片翻出来。维修登记写着“接触不良，临换转接件”，批次对得上，供货人那格却空着。'],
  ['shen', '插头松了能换，单子可不能就写个“那个黑插头”。下回再坏，维修上哪猜去？'],
  ['me', '工号和日期我也补拍。回去真碰上同批的，至少知道该翻哪张维修单。', { effect: { flag: 'c4r6_2_repair' } }],
], 'c4_2_hub', 'bg_c4_city_preparation_v1')
chain('c4_2_shen', [
  ['shen', '我刚工作时把一只保温杯放在门边，觉得离磁体还远。杯子飞过去的时候，我也跟你现在一个表情。', { giftTo: 'shen' }],
  ['me', '那您后来怎么好意思留在这儿？'],
  ['shen', '第二天还得上班，杯子归杯子，患者归患者。今晚接着跟。', { effect: { flag: 'c4r6_2_shen' } }],
], 'c4_2_hub', 'bg_c4_city_staff_room_v1')
chain('c4_2_incident', [
  ['sys', '患者做完筛查，女儿把钥匙、手机和金属框眼镜收进物品袋，陪他进扫描间帮忙摆好支垫。你留在控制台核申请，沈岚站在床旁。'],
  ['worker', '我的眼镜给我女儿就行，别耽误你们。', { bg: 'bg_c4_city_magnet_room_v1' }],
  ['sys', '女儿应了一声，把物品袋搭上肩头。袋口没封好，她转身让开床尾时，眼镜从袋里滑了出来。', { bg: 'bg_c4_city_magnet_room_v1' }],
  ['sys', '她下意识低头去捡，眼镜却先擦过地面，“当”地吸在磁体外壳靠近孔口的位置。她的手停在半空。', { image: 'cg_c4_glasses_v3', imageLabel: '扫描间突发｜金属框眼镜吸附', closeup: true }],
  ['me', '还好只是副轻眼镜。阿姨您别动，我小心试着把它拿下来。', { bg: 'bg_c4_city_magnet_room_v1' }],
  ['shen', '**先停手，退回来。这是重要安全事故征候，不能因为眼镜轻就徒手拔。**', { bg: 'bg_c4_city_magnet_room_v1' }],
  ['sys', '你赶紧收手退回门边，讪讪地说了句“差点帮倒忙”。沈岚请同事守住入口，陪患者和家属退到安全位置，联系工程人员处置。', { bg: 'bg_c4_city_magnet_room_v1' }]
], 'c4_2_glasses_q', 'bg_c4_city_magnet_room_v1')
question('c4_2_glasses_q', 'shen', '你留在门边，先帮哪头？', [
  { text: '先答呼叫，核清人员再上报', next: 'c4_2_glasses_safe_0', effect: { skill: 1, badge: 'c4r_magnet_stop' } },
  { text: '先陪家属退开，说明后续安排', next: 'c4_2_glasses_people_0', effect: { badge: 'c4r_magnet_stop' } },
  { text: '守住入口，等工程人员到场', next: 'c4_2_glasses_safe_0', effect: { badge: 'c4r_magnet_stop' } },
], { bg: 'bg_c4_city_magnet_room_v1', image: 'cg_c4_glasses_v3' })
chain('c4_2_glasses_safe', [
  ['shen', '今天要是**轮椅或剪刀**被吸过去，可能直接出人命。东西轻，不代表这事小。'],
  ['sys', '你把刚才伸手尝试也如实写进事故征候记录。家属退到等候椅，工程人员到场处置并重新核查现场，夜班才恢复。']
], 'c4_2_mrcp_0', 'bg_c4_city_magnet_room_v1')
chain('c4_2_glasses_people', [
  ['sys', '你把家属带到等候椅，同事守住入口。她先问你：“刚才没把你带过去吧？”'],
  ['me', '没有，是我看它轻，差点想简单了。您父亲有人陪着，工程人员处置后还会核查现场。'],
  ['sys', '工程人员核查完现场，夜班才恢复。你补齐暂停时间、人员位置和刚才伸手的记录。沈岚又点了一遍：**轮椅或剪刀一旦吸附，可能致命。**']
], 'c4_2_mrcp_0', 'bg_c4_city_magnet_room_v1')
chain('c4_2_xu', [
  ['mystery', '老范把我的申请给你了？我是许建平。', { communication: 'call', phone: 'pat_c4_xu_v1', sprite: '' }],
  ['me', '腰椎那张申请我看过。怎么，还拿不定主意？', { communication: 'call' }],
  ['mystery', '我年轻时做过手术，也不知道里面有没有留东西。今晚本来想问清楚……算了，还是先取消吧。', { communication: 'call' }],
], 'c4_2_xu_q', 'bg_c4_city_corridor_v1')
question('c4_2_xu_q', 'me', '电话还没挂。你怎么接？', [
  { text: '先听他说完，日期让他自己定', next: 'c4_2_xu_listen_0', effect: { heart: 1, flag: 'c4_xu_listened', badge: 'c4r_xu_listened' } },
  { text: '问手术医院和部位，先留个线索', next: 'c4_2_xu_records_0', effect: { flag: 'c4_xu_cancel' } },
  { text: '告诉他资料可以先核，不催预约', next: 'c4_2_xu_listen_0', effect: { flag: 'c4_xu_cancel' } },
], { bg: 'bg_c4_city_corridor_v1', sprite: 'me', communication: 'call' })
chain('c4_2_xu_listen', [
  ['mystery', '……那我再把纸袋翻一遍。你先别给我排日期，我准备好了自己打电话。', { communication: 'call', effect: { flag: 'c4_2_xu' } }],
  ['sys', '他挂了电话。你记下“取消”，把来电时间和他刚才担心的事一并写进交接。', { effect: { flag: 'c4_xu_cancel' } }],
], 'c4_2_close_0', 'bg_c4_city_corridor_v1')
chain('c4_2_xu_records', [
  ['mystery', '腰椎，老县医院。别的我真不知道，你先从这儿查吧。', { communication: 'call', effect: { flag: 'c4_2_xu' } }],
  ['sys', '电话断了。你把这两个找资料的起点写进交接，日期仍然空着，等他自己再约。'],
], 'c4_2_close_0', 'bg_c4_city_corridor_v1')
chain('c4_2_mrcp', [
  ['sys', '这位疑似胆总管结石的患者眼白发黄，陪他来的女儿攥着车钥匙，说下午他疼得蹲在货梯边。', { caseId: 'c4_city_mrcp' }],
  ['worker', '**右上腹疼了两天，今早眼白也黄了。**刚才那一下，不会算我头上吧？'],
  ['me', '先顾您的检查，眼镜的事由我们记录。您这疼是一直疼，还是一阵一阵？吃东西和休息会影响吗？'],
  ['worker', '前天吃完红烧肉开始疼，一阵一阵往背上扯。昨天挂水才好点，现在尿跟浓茶似的，心里真有点慌。'],
  ['sys', '女儿补充：昨天超声提示胆囊结石，胆总管可疑扩张；他今天按医嘱没吃饭，只按护士交代喝了少量水。'],
  ['me', '这次**MRCP**主要看胆管里有没有结石、堵在哪里，以及胆管扩张到什么程度。昨天的超声、挂水情况和发热有没有，我都会一起交清。'],
  ['worker', '那我屏气要是跟不上呢？'],
  ['me', '听提示，跟不上就说，咱们再想办法。别硬憋到脸白。']
], 'c4_city_mrcp_scan')
scan('c4_city_mrcp_scan', '腹部序列采集中。', 'MRCP · 腹部采集', 'c4_2_mrcp_result_0', 'abdomen', 'city-3t')
chain('c4_2_mrcp_result', [
  ['sys', '图组传回了。沈岚指着亮白的胆管，让你看中间那一小块暗影。', { image: 'mri_real_mrcp_v1', imageLabel: 'MRCP｜胆总管结石' }],
  ['shen', '胆管这么亮，黄圈里怎么反而是暗的？', { image: 'mri_real_mrcp_v1' }],
  ['me', 'MRCP突出胆管里的水，结石常留下暗的小缺口。能帮着看堵在哪里，还得和完整序列、化验一起看。', { image: 'mri_real_mrcp_v1' }],
  ['sys', '女儿问是不是一定要住院、今晚还能不能让他回去开车。'],
  ['me', '住不住院要看疼痛、黄疸、发热和化验，急诊医师会一起判断；今晚先别让他开车送货。'],
], 'c4_2_mrcp_q')
question('c4_2_mrcp_q', 'shen', '女儿要送他回急诊，还惦记排班。你怎么帮？', [
  { text: '把图和病情交急诊，钥匙给女儿', next: 'c4_2_mrcp_handoff_0', effect: { skill: 1 } },
  { text: '让她先请假，你陪患者等交接', next: 'c4_2_mrcp_family_0' },
  { text: '先写清急诊入口，再替她看行李', next: 'c4_2_mrcp_family_0' },
], { image: 'mri_real_mrcp_v1' })
chain('c4_2_mrcp_handoff', [
  ['worker', '钥匙给她。明天那趟货谁爱送谁送，我先把这阵疼弄明白。'],
  ['me', '该写的我都放进急诊交接单了。您先别惦记明天那趟货，咱们过去让医师接着看。'],
], 'c4_2_xu_0')
chain('c4_2_mrcp_family', [
  ['sys', '女儿走到一边打电话，终于不再一边请假一边问父亲“你怎么不早说”。'],
  ['worker', '她请一天假扣钱。你等会儿把去哪儿、找谁写给她，别让她又跑错门。'],
], 'c4_2_xu_0')
chain('c4_2_close', [
  ['sys', '快收班时，老范发来两版报价。第二版多了一行“AI智能重建”，他在旁边画了个大大的问号。'],
  ['shen', '那张维修标签有回话了：不是原厂编号。回县以后沿维修单找经手人就行，跟软件报价别搅一起。', { effect: { flag: 'c4_repair_tag' } }],
  ['wen', '报价是我整理的。基本重建本来就有，AI重建是我们原厂的单列选配。名字写得含糊，这页我回去重出。', { communication: 'sms', phone: 'char_wen', sprite: '' }],
  ['wen', '软件我按原厂单列说明。配件不属于这次报价，别再往里加。', { communication: 'sms', effect: { flag: 'c4_wenwen_contacted' } }],
  ['shen', '行了，周二收班。你把人跟明白了，剩下的回去慢慢核。别在火车上还抱着报价看。', { effect: { flag: 'c4_city_week_completed' } }]
], 'c4_2_end', 'bg_c4_city_staff_room_v1')
settle(2, '进修证里多了张维修标签照片，手机里也收到了雯雯重发的报价。回县后先找老范，把配置、价钱和装机日摊开谈。', 160, 'c4r_city_finished')

// 第三段：原厂软件报价与A17维修单分开，谁也不用替另一张纸解释。
chain('c4_3_open', [
  ['sys', '回县后的采购碰头会上，老范把两版报价摊在办公桌上。小唐抱着预约本进来，顺手把压在“AI智能重建”那行上的茶杯挪开。', { effect: { flag: 'c4_old_contract' } }],
  ['fan', '院长就问了一句：这东西不买，机器还能不能扫？我答不上来，先找你们。'],
  ['tang', '机器什么时候装我还没排到患者。你们先把这个答明白，别今天说能，明天又让我挨个打电话改口。'],
  ['lei', '我上次拒签也不是跟AI有仇。没写清试用多久、以后怎么收钱，我哪敢替信息科点头。', { effect: { flag: 'c4_old_contract' } }]
], 'c4_3_quotes_0', 'bg_office_day')
chain('c4_3_quotes', [
  ['wen', '我重说：**基本重建已经包含，AI重建是原厂单列选配**。不买AI，常规检查照做。上一版写成“数据服务”，是我图省事。', { effect: { flag: 'c4_contract_split' }, image: 'item_c4_quote_folder_v1', imageLabel: '采购报价夹｜基本重建与选配分列' }],
  ['me', '那这页就留三件事：原厂AI、单列价格、授权期限。别再把基本功能算一遍钱。'],
  ['wen', '行，我改。还有一张30天试用单，装机时愿意试再开，账号和到期日都写上；不采购就不收正式授权费。'],
  ['lei', '这样我能核。试用是试用，买不买等咱们用完再谈。'],
  ['wen', '采购配置就按这版写，试用账号和期限单独列，不相关的东西别塞进来。']
], 'c4_3_quote_q', 'bg_office_day')
question('c4_3_quote_q', 'me', '采购首页还空着。你先写哪句？', [
  { text: '基本重建已含，原厂AI单列', next: 'c4_3_quote_clear_0', effect: { skill: 1, badge: 'c4r_need_first' } },
  { text: '先列原厂AI报价，基本功能后补', next: 'c4_3_quote_wrong_0' },
  { text: '先列试用账号和到期日', next: 'c4_3_quote_wrong_0' },
], { bg: 'bg_office_day' })
chain('c4_3_quote_clear', [
  ['zhou', '这就能看了。要不要买以后再说，至少今天知道没它也开得起来。'],
  ['wen', '我按这句重出附件。试用单另放，账号和期限不藏在报价小字里。']
], 'c4_3_bai_0', 'bg_office_day')
chain('c4_3_quote_wrong', [
  ['lei', '首页还漏了“基本重建已含”。原厂AI单列，试用另放，也补上。'],
  ['wen', '我按这三项重出附件，账号和期限放试用单，不藏在小字里。']
], 'c4_3_bai_0', 'bg_office_day')
chain('c4_3_bai', [
  ['bai', '我是老白，卖线圈转接件和常用备件的。老范把A17标签照片转给我了。以后缺备用件可以问我，批次、兼容机型和质保我会写清。', { communication: 'sms', phone: 'char_bai', sprite: '', image: 'item_c4_a17_parts_v1', imageLabel: 'A17标签与线圈转接件｜老白发来的配件照片', closeup: true }],
  ['me', '资料先发来。今天只核采购配置，不买配件。', { effect: { flag: 'c4_a17_batch' } }],
], 'c4_3_hub', 'bg_office_day')
// 旧存档可能停在已压缩的短信中段；保留原节点ID并直接接回采购主线。
for (const id of ['c4_3_bai_2', 'c4_3_bai_3', 'c4_3_bai_4']) {
  steps[id] = { bg: 'bg_office_day', speaker: 'sys', sprite: '', sprite2: '', image: '',
    text: '配件资料已收进采购夹，今天只核采购配置。', next: 'c4_3_hub' }
}
hub(3, '采购会还没开始。旧合同夹在桌角，门口设备送货员正拿卷尺比划机房路线。', [
  ['📁 旧合同夹 · 翻旧远程支持附件', 'c4_3_archive_0', 'c4r6_3_archive', {}],
  ['📏 机房门口 · 跟设备送货员走一遍转弯路线', 'c4_3_door_0', 'c4r6_3_door', {}],
  ['🪑 会议室 · 帮老范扶正那条旧长椅', 'c4_3_help_fan_0', 'c4r6_3_help_fan', {},
    { chance: 0.3, next: 'c4_3_help_fan_mishap_0', effect: { gold: -25, badge: 'good_intentions' } }],
], 'c4_3_tender_0', '带着两版附件进采购会')
chain('c4_3_archive', [
  ['sys', '旧合同夹里还留着上一批设备的远程支持附件。小雷翻到最后一页，把这次的原厂AI试用单放在旁边。'],
  ['lei', '以前那句“远程支持”太能装了。这次就写明白：原厂AI，30天，哪个账号，谁批准。'],
  ['me', '试用单留账号和期限，和维修记录分开放。以后真看见登录，也知道先翻哪张纸。', { effect: { flag: 'c4r6_3_archive' } }]
], 'c4_3_hub', 'bg_office_day')
chain('c4_3_door', [
  ['sys', '设备送货员把卷尺拉到门框外，又让你在转角站一下。担架床推过去时，他抬手护住床尾那只输液架。'],
  ['courier', '纸上量得下，拐弯可不会自己变宽。你们买机器，也顺手看看我们怎么把东西送进去。'],
  ['me', '门框、转角和床尾都记。真等货车到了再量，今天站这儿的人就得变成门柱。', { effect: { flag: 'c4r6_3_door' } }],
], 'c4_3_hub', 'bg_c4_county_corridor_preinstall_v1')
chain('c4_3_help_fan', [
  ['sys', '你和老范把旧长椅抬正，顺手把松动的椅脚垫稳。来开会的人终于不用轮流坐那条“会思考的椅子”。'],
  ['fan', '行，至少今天没人一边谈预算一边滑到桌子底下。', { effect: { flag: 'c4r6_3_help_fan' } }],
], 'c4_3_hub', 'bg_office_day')
chain('c4_3_help_fan_mishap', [
  ['sys', '（**意外**）椅脚刚垫好，长椅另一头翘起，碰翻了老范放在地上的收纳盒。你蹲着捡了半天，还赔了一瓶新胶水。'],
  ['fan', '扶椅子送地面整理，划算。就是下回先告诉我盒盖没扣。', { effect: { flag: 'c4r6_3_help_fan' } }],
], 'c4_3_hub', 'bg_office_day')
chain('c4_3_tender', [
  ['sys', '采购办核配置、压价，老范把科研展示软件和额外赠品划到一边，会议室终于不再每页都出现“赠送”。'],
  ['director', '这张配置表我看过了，预算还得再压一压。'],
], 'c4_3_budget_q', 'bg_office_day')
question('c4_3_budget_q', 'director', '预算还得收。第一刀落哪儿？', [
  { text: '先保线圈、机房、人手和维修', next: 'c4_3_budget_keep_0', effect: { skill: 1, flag: 'c4_budget_right' } },
  { text: '先保机房，线圈以后按任务再添', next: 'c4_3_budget_wrong_0' },
  { text: '先保人员和维修，展示软件也留', next: 'c4_3_budget_wrong_0' },
], { bg: 'bg_office_day' })
chain('c4_3_budget_keep', [
  ['fan', '冯叔那份换机记录也夹进去。3T刚响就中止，换0.55T大孔径后完成了四组。大孔径不是宣传词，咱们真碰见过用得上的人。'],
  ['director', '那就按这个重写。机器回来要天天用，不是先来拍一张合影。'],
], 'c4_3_decision_0', 'bg_office_day')
chain('c4_3_budget_wrong', [
  ['zhou', '机房和日常检查先排前面。展示软件往后排，线圈也别等接了患者再借。'],
  ['me', '那首页先写常规线圈、机房、接班人员和维修。'],
], 'c4_3_decision_0', 'bg_office_day')
chain('c4_3_decision', [
  ['sys', '最后定的是0.55T、80厘米孔径，常规线圈、机房改造和维修都留着。**基本重建不重复收费，原厂AI不捆绑购买**；那张30天试用单单独装进了交接袋。', { effect: { flag: 'c4_procurement_decided' }, card: 'c4_field' }],
  ['wen', '试用单我重写，账号、开启日、到期日都印清楚。屏蔽门要晚十天，我也不再说“尽快”，哪天能装写哪天。'],
  ['tang', '其他联系方式先放采购夹最后。以后真需要另开单，不跟今天的配置混在一起。'],
  ['tang', '晚十天这句我先拿走。预约本现在改，比患者到门口再改强。']
], 'c4_3_delay_q', 'bg_office_day')
question('c4_3_delay_q', 'tang', '六个人已经约了。先打哪通电话？', [
  { text: '先核准装机日，再逐个改约', next: 'c4_3_delay_call_0', effect: { skill: 1, flag: 'c4_delay_handled', badge: 'c4r_no_shortcut' } },
  { text: '先通知延期，日期核准后再回电', next: 'c4_3_delay_people_0', effect: { flag: 'c4_delay_handled', badge: 'c4r_no_shortcut' } },
  { text: '先问谁愿意改外院，再统一改约', next: 'c4_3_delay_people_0', effect: { flag: 'c4_delay_handled', badge: 'c4r_no_shortcut' } },
], { bg: 'bg_office_day' })
chain('c4_3_delay_call', [
  ['wen', '11月6日能装。我把这句话写进交接单，改了我再提前说。', { communication: 'call', phone: 'char_wen', sprite: '' }],
  ['tang', '行，我按这天往后排。想改到别家的也给人留选择，别光顾着把咱们的本子填满。'],
], 'c4_3_install_0', 'bg_office_day')
chain('c4_3_delay_people', [
  ['sys', '第一位阿姨听完就问：“晚一些是哪天？我公交车票也不是刮风捡的。”小唐看了你一眼，把电话开了免提。', { communication: 'call' }],
  ['me', '您说得对，没核准就不该让您等空话。雯雯，今天把能装机的日期写给我们，再由小唐逐个回电话。'],
], 'c4_3_install_0', 'bg_office_day')
chain('c4_3_install', [
  ['sys', '十一月，货车进场。门框差两指宽，设备送货员掏出卷尺：“看吧，那天我就说转弯也要量。”'],
  ['sys', '上午的吊装区拉起警戒带。吊车把磁体缓慢托起，安装工程师分守两侧，所有人等指挥手势，没有人从悬吊物下面穿过。', { image: 'cg_c4_magnet_lift_v1', imageLabel: '装机特写｜白天吊装MRI磁体', closeup: true, cameraMotion: 'pan' }],
  ['zhou', '以前只在报价单上看见一个方框，真吊到门口，才知道这玩意儿有多沉。你站黄线外，别光顾着拍。'],
  ['sys', '磁体落位后，工程师重新核水平、屏蔽、线圈与工作站。午后，检查床和控制系统都就位，只剩最后几项验收，机房总算有了样子。', { image: 'cg_c4_install_complete_v1', imageLabel: '装机特写｜MRI安装完成', closeup: true, cameraMotion: 'settle', bg: 'bg_c4_county_corridor_v1' }],
  ['shen', '亮机了。市院那台是你认门，县院这台以后是患者认你们。', { communication: 'call', phone: 'char_c4_shen_v3', sprite: '', bg: 'bg_c4_county_control_v1' }],
  ['bai', '趁你们核交接单，我把资料送来了。备用件和升级件以后可以问我，型号、兼容机型和质保都写在这儿。', { image: 'item_c4_a17_parts_v1', imageLabel: '装机交接时｜老白上门介绍备用件', bg: 'bg_c4_county_preparation_v1' }],
  ['tang', '报价先放准备柜，今天不采购，也不拿它签验收。兼容型号写全就行。患者改约电话还没打完，谁也别拉我去机房门口站排。', { bg: 'bg_c4_county_preparation_v1' }],
  ['sys', '交接快做完，院长却在一楼机房门口抖开红绸，剪刀已经举起来。门内工程师还在核查，你赶紧从控制室跑过去拦住。', { image: 'cg_c4_ribbon_stop_v1', imageLabel: '一楼机房门口｜阻止剪彩', closeup: true, cameraMotion: 'push', bg: 'bg_c4_county_corridor_v1' }],
  ['me', '院长，先别剪！**磁场没有下班键**，机房门口不能聚着人剪彩。剪刀先收好，咱们换个地方。', { image: 'cg_c4_ribbon_stop_v1', bg: 'bg_c4_county_corridor_v1' }],
  ['director', '是我把安全想简单了。红绸挪到**医院正门**，这里只留工程师核查。老周，先带大家退开。', { image: 'cg_c4_ribbon_stop_v1', bg: 'bg_c4_county_corridor_v1' }]
], 'c4_3_ribbon_outside_0', 'bg_c4_county_corridor_preinstall_v1')
chain('c4_3_ribbon_outside', [
  ['sys', '老周收好剪刀，设备科抬起红绸和隔离墩，跟你一起撤到警戒区外。机房门重新清净下来，工程师接着核完开机项目。'],
  ['sys', '红绸重新挂在县医院正门外，院长在台阶前剪断它。科室和后勤的人站在台阶前道贺，机房那边工程师仍按交接单核查。', { image: 'cg_c4_ribbon_cutting_v1', imageLabel: '装机特写｜院长在县医院正门剪彩', closeup: true, cameraMotion: 'push' }],
  ['director', '行，照片就在这儿拍。机房那边别围人，让工程师把活干完。'],
  ['zhou', '照片有了，表也签了。小唐，正式开诊那天别排太满，给第一天留点喘气的时间。', { effect: { flag: 'c4_installed_ready' } }]
], 'c4_3_end', 'bg_c4_county_corridor_v1')
settle(3, '红绸在正门收好，机房的交接项也签完了。小唐把新预约表贴在休息室，第一天空着两格，留给出错和喘口气。', 220, 'c4r_procurement_done')

// 第四段：开机首日，小唐接来一位脑积水儿童；原厂AI试用单也有了用处。
chain('c4_4_open', [
  ['sys', '11月15日07:50，老范还惦记着补张工作照。小唐已经把预约表贴到休息室，第一格写着“三岁，头痛，妈妈陪”。'],
  ['tang', '孩子来得早，在走廊数地砖呢。妈妈怕迟到，早饭都带在包里了。'],
  ['zhou', '行，先接孩子。老范你要拍就拍这个，别又让我们站成一排说茄子。']
], 'c4_4_hub', 'bg_c4_county_corridor_v1')
hub(4, '孩子还在候诊区，妈妈抱着一叠门诊资料。合影的事，老范已经不敢再提了。', [
  ['🪑 空预约椅 · 陪第一位家属坐一会儿', 'c4_4_chair_0', 'c4r6_4_chair', {}],
  ['📇 控制室联络表 · 把急诊和工程师号码挪到同一页', 'c4_4_contacts_0', 'c4r6_4_contacts', {}],
  ['🧯 候诊区 · 帮老周摆正轮椅和提示牌', 'c4_4_help_zhou_0', 'c4r6_4_help_zhou', {},
    { chance: 0.3, next: 'c4_4_help_zhou_mishap_0', effect: { ap: -1, badge: 'good_intentions' } }],
], 'c4_4_emergency_0', '跟小唐去接孩子')
chain('c4_4_chair', [
  ['sys', '第一位家属来得太早，手里攥着旧片袋，又不好意思问还要等多久。你把她安排到能看见叫号屏的位置。'],
  ['me', '马上就叫您。万一临时来了急诊，我过来跟您说，别着急。'],
  ['sys', '她把片袋放到腿上，终于腾出手喝了口水。', { effect: { flag: 'c4r6_4_chair' } }],
], 'c4_4_hub', 'bg_c4_county_corridor_v1')
chain('c4_4_contacts', [
  ['sys', '急诊、值班医师、工程师原本散在三张纸上。你把号码并成一页，小唐又补上夜间报修入口。'],
  ['tang', '这张贴控制台。真有事先能找着人，比翻一沓装机资料强。'],
  ['me', '我再把急诊那格描粗一点。号码核过，今天就算没白整理。', { effect: { flag: 'c4r6_4_contacts' } }],
], 'c4_4_hub', 'bg_c4_county_control_v1')
chain('c4_4_help_zhou', [
  ['sys', '你帮老周把轮椅停在黄线外，又把提示牌转向候诊椅。第一位家属不用再横着脖子找入口。'],
  ['zhou', '牌摆得不错。就是“急诊优先”这四个字，等会儿别真把咱们合影挤没了。', { effect: { flag: 'c4r6_4_help_zhou' } }],
], 'c4_4_hub', 'bg_c4_county_corridor_v1')
chain('c4_4_help_zhou_mishap', [
  ['sys', '（**意外**）你把提示牌转得太猛，底座滑出去，老周追了两步才捞回来。你又重新摆了一遍轮椅。'],
  ['zhou', '牌子比患者先进急诊了。来，咱俩把它押回去。', { effect: { flag: 'c4r6_4_help_zhou' } }],
], 'c4_4_hub', 'bg_c4_county_corridor_v1')
chain('c4_4_emergency', [
  ['sys', '小唐牵着女孩过来，孩子另一只手抱着只掉了一只角的布恐龙。妈妈跟在后面，门诊资料装在一个买菜袋里。'],
  ['tang', '资料我核过了，筛查也问完。她怕一个人躺着，你先跟她讲讲，我去把儿童支垫拿来。'],
  ['me', '恐龙可以在玻璃外陪小唐。你进去以后能听见我们说话，不舒服就捏呼叫。']
], 'c4_4_head_0', 'bg_c4_county_corridor_v1')
chain('c4_4_head', [
  ['sys', '女孩三岁，进准备区还惦记她的恐龙。妈妈抱着她，话说得很急。', { caseId: 'c4_county_hydrocephalus', sprite: 'pat_c4_mother_child_pixel_v1' }],
  ['mother', '这两周她老说头疼，早上起来吐过三回。最近走路也有点歪，幼儿园老师说她排队老撞人。'],
  ['me', '以前脑袋受过伤吗？发热有没有？门诊医师看过以后，这次主要想查什么？'],
  ['mother', '没摔过，也没发烧。医生让来做这个……是不是脑子里长东西了？'],
  ['child', '要躺多久呀？我想尿尿的时候怎么办？'],
  ['me', '现在想去就先去，回来再扫。躺的时候别乱动，难受就告诉我们。小唐在外面拿着恐龙，出来就能看见。'],
  ['tang', '恐龙借我抱一会儿。做完给你贴张新贴纸，它那张旧的我可不赔。']
], 'c4_county_hydrocephalus_scan', 'bg_c4_county_preparation_v1')
scan('c4_county_hydrocephalus_scan', '儿童头部T2轴位采集中。', '儿童头部 MRI · T2轴位采集', 'c4_4_head_result_0', 'head', 'county-055-wide')
steps.c4_county_hydrocephalus_scan.scan!.positioningImage = 'trilogy_mri_scan_county_child_v1'
// 旧存档若停在原扫描入口，也进入现役儿童病例，不恢复退役DWI病例。
steps.c4_county_dwi_scan = { ...steps.c4_county_hydrocephalus_scan }
chain('c4_4_head_result', [
  ['sys', '轴位T2图出来了。老周把门诊申请和图一起发给接诊医师。', { image: 'mri_real_hydrocephalus_v1', imageLabel: '儿童头部轴位T2｜双侧侧脑室明显扩大' }],
  ['zhou', '你先看图。脑室怎么样，交接里写什么？', { image: 'mri_real_hydrocephalus_v1' }],
  ['me', '**双侧侧脑室明显扩大**，脑脊液在T2上很亮。写脑室扩大，结合晨起呕吐和步态不稳，提示脑积水可能。', { image: 'mri_real_hydrocephalus_v1' }],
  ['mother', '她才三岁……会不会很严重？以后还能正常走路吗？'],
  ['me', '先让儿科看。有些情况会做**分流术**，把多余的脑脊液引到腹腔，减轻脑内压力。老周已经联系好了，我们陪您过去。'],
  ['child', '妈妈，我想回家。'],
  ['me', '先跟小唐把鞋穿好，妈妈马上来。恐龙也在等你呢。']
], 'c4_4_head_q')
question('c4_4_head_q', 'zhou', '妈妈等着住院的答复。你怎么安排？', [
  { text: '请小唐带她们去儿科接续评估', next: 'c4_4_head_handoff_0', effect: { heart: 1, badge: 'c4r_first_day' } },
  { text: '先打印图组，再联系儿科', next: 'c4_4_head_route_0' },
  { text: '让妈妈坐着等，你去送图和病史', next: 'c4_4_head_route_0' },
], { image: 'mri_real_hydrocephalus_v1' })
chain('c4_4_head_handoff', [
  ['tang', '儿科那边我联系过了，他们现在就看图。你们跟我走，别在这儿等打印片。'],
  ['me', '检查所见和这两周的变化我都写进去了。住不住院让接诊团队查完再定，您不用一个人在走廊猜。'],
], 'c4_4_sequence_0', 'bg_c4_county_corridor_v1')
chain('c4_4_head_route', [
  ['tang', '图你送，人我留着。她早上又吐又走不稳，不能光拿报告回去等。'],
  ['me', '症状都写上了。儿科回话说现在看，您跟小唐过去，住不住院由接诊团队评估。'],
], 'c4_4_sequence_0', 'bg_c4_county_corridor_v1')
chain('c4_4_sequence', [
  ['tang', '孩子到儿科还问我贴纸贴衣服上会不会掉。我把她们送稳就回来。', { communication: 'sms', phone: 'char_tang', sprite: '' }],
  ['zhou', '行，等她们那边接上。你先别关这张T2图，咱们再看一眼。', { image: 'mri_real_hydrocephalus_v1' }]
], 'c4_4_sequence_q', 'bg_c4_county_corridor_v1')
question('c4_4_sequence_q', 'zhou', '这张T2图上，脑脊液为什么亮？', [
  { text: 'T2较长，接回波时信号还比较强', next: 'c4_4_sequence_right_0', effect: { skill: 1 } },
  { text: 'T1较短，纵向磁化恢复得更快', next: 'c4_4_sequence_wrong_0' },
  { text: '只要含水多，换哪种序列都会亮', next: 'c4_4_sequence_wrong_0' },
], { image: 'mri_real_hydrocephalus_v1' })
chain('c4_4_sequence_right', [
  ['zhou', '对，等到接回波，水的横向信号还没衰减掉多少。同一处换成T1图，亮暗就不一样了。', { image: 'mri_real_hydrocephalus_v1' }],
  ['me', '那我去看看控制台。刚才弹了个账号，跟试用单上的一样。'],
], 'c4_4_remote_0')
chain('c4_4_sequence_wrong', [
  ['zhou', '这张主要看T2差异。水的横向信号衰减慢，到接回波时还比较强；换成T1图，可就不这么亮了。', { image: 'mri_real_hydrocephalus_v1' }],
  ['me', '想起来了，市院那几张同一部位的图。诶，控制台又弹了个账号，我去看看。'],
], 'c4_4_remote_0')
chain('c4_4_remote', [
  ['sys', '控制台右上角弹出远程授权校验。账号跟交接信封里的**原厂AI重建30天试用单**一模一样，不是陌生账号。'],
  ['lei', '先别同意，账号和时间截个图。我问雯雯为什么开诊第一天就开了试用。', { communication: 'sms', phone: 'char_lei', sprite: '' }]
], 'c4_4_remote_q', 'bg_c4_county_control_v1')
question('c4_4_remote_q', 'lei', '授权弹窗还在。你先怎么处理？', [
  { text: '先拒绝，截图和试用单发小雷', next: 'c4_4_remote_log_0', effect: { skill: 1, flag: 'c4_remote_log' } },
  { text: '先截屏，等厂家回话再处理', next: 'c4_4_remote_watch_0', effect: { flag: 'c4_remote_log' } },
  { text: '先关试用，远程记录稍后补齐', next: 'c4_4_remote_log_0', effect: { flag: 'c4_remote_log' } },
], { communication: 'sms', bg: 'bg_c4_county_control_v1' })
chain('c4_4_remote_log', [
  ['lei', '收到了。先断着，常规重建不受影响。雯雯没解释清试用，我让她自己回话。', { communication: 'sms' }],
  ['me', '截图和试用单都留在交接夹。患者图像照常传，没人需要等这个弹窗点头。']
], 'c4_4_wen_0', 'bg_c4_county_control_v1')
chain('c4_4_remote_watch', [
  ['lei', '别留着等。先拒绝，把截图和试用单发我，账号、期限、批准记录都得核。', { communication: 'sms' }],
  ['me', '远程已拒绝，截图也发了。常规检查不受影响。']
], 'c4_4_wen_0', 'bg_c4_county_control_v1')
chain('c4_4_wen', [
  ['wen', '是我装机时勾了**原厂AI重建30天试用**，以为试用单给你们就算说过。今天系统自动发起授权校验，确实该先跟你们讲。', { communication: 'sms', phone: 'char_wen', sprite: '' }],
  ['me', '那现在就按试用单办：关掉试用和远程授权。我们没采购，也别到期后悄悄变成收费项目。'],
  ['wen', '已经关了，小雷能查到记录。不采购、不收费。以后再用，重新申请、重新说清。', { communication: 'sms', effect: { flag: 'c4_ai_trial_closed' } }]
], 'c4_4_close_0', 'bg_c4_county_control_v1')
chain('c4_4_close', [
  ['sys', '小唐回来时，白大褂口袋上多了一枚恐龙贴纸——孩子非要给“保管员”也贴一张。'],
  ['fan', '工作照还拍吗？我看小唐这张笑脸，比剪彩那天还喜庆。'],
  ['zhou', '拍吧，别排队形了。谁手里有活就接着干，拍到什么算什么。']
], 'c4_4_end', 'bg_c4_county_corridor_v1')
settle(4, '首日合影里，小唐指着口袋上的恐龙贴纸，老范的牌子还是反的。孩子已由儿科接走，妈妈没再一个人抱着资料猜；照片背面，小唐画了一只很圆的恐龙。', 200, 'c4r_first_day')

// 第五段：运动伪影、膝部伪征与设备故障分开处理；证据按纸张和时间排列。
chain('c4_5_open', [
  ['sys', '第二天，小唐把候诊椅按检查时间排了排。腹痛阿姨先到，拄拐老师在门口慢慢收拐杖，冯叔的复查单压在下午那页。'],
  ['tang', '阿姨先做，拄拐老师在后头。冯叔的旧片和后续单我也找出来了，今天别让人来了再满柜子翻。'],
  ['zhou', '行，先看人。谁疼、谁怕、谁躺不住，先问清再开机。'],
], 'c4_5_hub', 'bg_c4_county_corridor_v1')
hub(5, '腹痛阿姨已经在候诊区，拄拐老师还在门外挪拐杖。准备柜里还压着一张备用件报价。', [
  ['🔌 准备柜 · 核对备用件报价', 'c4_5_adapter_0', 'c4r6_5_adapter', {}],
  ['🧭 候诊长椅 · 帮拄拐老师找个放拐杖的位置', 'c4_5_waiting_0', 'c4r6_5_waiting', {}],
  ['✂️ 护士站 · 帮小唐裁一叠候诊提示卡', 'c4_5_help_tang_0', 'c4r6_5_help_tang', {},
    { chance: 0.3, next: 'c4_5_help_tang_mishap_0', effect: { gold: -15, badge: 'good_intentions' } }],
], 'c4_5_motion_0', '先接腹痛阿姨')
chain('c4_5_adapter', [
  ['sys', '备用件报价上只有型号、批次、兼容机型和“尚未采购”。你看完就放回柜里。', { image: 'item_c4_a17_parts_v1', imageLabel: '备用件报价｜尚未采购' }],
  ['tang', '先放回去，今天不签采购单。阿姨还等着呢。'],
  ['me', '型号留着，我回候诊区。', { effect: { flag: 'c4r6_5_adapter' } }],
], 'c4_5_hub', 'bg_c4_county_preparation_v1')
chain('c4_5_waiting', [
  ['sys', '拄拐老师的拐杖总往椅子底下滑。你找来一个靠墙的位置，让他伸手能拿到，又不会绊到经过的人。'],
  ['knee', '这拐杖，总往椅子底下跑。', { voice: 'vox_c4_knee_wait_r9' }],
  ['me', '给您靠这儿。叫号时我过来，您慢点起。', { effect: { flag: 'c4r6_5_waiting' } }],
], 'c4_5_hub', 'bg_c4_county_corridor_v1')
chain('c4_5_help_tang', [
  ['sys', '你帮小唐把提示卡裁好，正面写候诊位置，背面留着改约电话。她拿走一半，压在护士站玻璃板下。'],
  ['tang', '这张给刚才那位阿姨。她问第三遍“还要多久”了，不是难缠，是家里人还在等她回话。', { effect: { flag: 'c4r6_5_help_tang' } }],
], 'c4_5_hub', 'ch2_bg_breakroom_day')
chain('c4_5_help_tang_mishap', [
  ['sys', '（**意外**）你把一叠纸裁歪了，最上面那张只剩“候”字。小唐笑完，让你用边角料重做一叠小便签。'],
  ['tang', '这张“候”留着贴你电脑上。剩下的我裁，你负责把改约电话写全。', { effect: { flag: 'c4r6_5_help_tang' } }],
], 'c4_5_hub', 'ch2_bg_breakroom_day')
chain('c4_5_motion', [
  ['sys', '腹痛阿姨扶着上腹进来，刚躺下就挪了两次。她先问的不是图，而是如果做不成会不会还得再跑一趟。', { caseId: 'c4_county_abdominal_motion' }],
  ['aunt', '**上腹又胀又疼，躺久了更难受。**', { voice: 'vox_c4_aunt_r8' }],
  ['aunt', '等下要是扫坏了，是不是又得花钱重拍？'],
  ['me', '这种胀疼多久了？吃完饭会更难受吗？'],
  ['aunt', '一个多月了，饭后更胀。B超说肝上有个东西，我一听就没睡好，胃药吃了也没用。'],
  ['me', '这次主要看超声说的那处肝内病变，同时把上腹其他情况一起交代。真要因为移动重扫，我会把原因、时间和下一步说清，费用问题陪您去窗口核。'],
  ['aunt', '店里还等我回去呢。躺久了我真难受，不是故意乱动。'],
  ['tang', '这个软垫放膝下，您试试。别为了不动硬憋，难受就捏呼叫；我们先做最需要的几组。'],
  ['sys', '她点头后，你固定好支垫，让她在真正开始前先试躺片刻。']
], 'c4_county_abdominal_motion_scan')
scan('c4_county_abdominal_motion_scan', '腹部首段序列采集中。', '腹部 MRI · 首段采集', 'c4_5_motion_result_0', 'abdomen', 'county-055-wide')
chain('c4_5_motion_result', [
  ['sys', '首段图有些模糊，主动脉前方还多了一串影子。老周圈了出来：黄框内的重影沿着**AP方向，也就是画面上下**排列，与这组的**相位编码方向**一致。', { image: 'mri_real_motion_ghost_v1', imageLabel: '阿姨的腹部MRI｜主动脉搏动鬼影，AP方向：画面上下', card: 'c4_quality' }],
  ['zhou', '这一串圆影子，也全是她刚才动了一下造成的？', { image: 'mri_real_motion_ghost_v1' }],
  ['me', '这一串是**血管搏动**留下的鬼影。她挪动造成的模糊也在，但不是一回事，更不是多出一排病灶。', { image: 'mri_real_motion_ghost_v1' }],
  ['aunt', '那还得多久？我怕自己又躺不住。'],
  ['me', '先做最必要的几组，中间让您缓一下。哪张能用、哪张要补，我们分开看。']
], 'c4_5_motion_q')
question('c4_5_motion_q', 'zhou', '首段糊了。下一组你怎么排？', [
  { text: '换短序列，加支垫后再试', next: 'c4_5_motion_retry_0', effect: { skill: 1, flag: 'c4_motion_explained', badge: 'c4r_motion_answer' } },
  { text: '先坐两分钟，由她定重扫或改约', next: 'c4_5_motion_rest_0', effect: { flag: 'c4_motion_explained', badge: 'c4r_motion_answer' } },
  { text: '先做必要组，中间让她缓一缓', next: 'c4_5_motion_retry_0', effect: { flag: 'c4_motion_explained', badge: 'c4r_motion_answer' } },
], { image: 'mri_real_motion_ghost_v1' })
chain('c4_5_motion_retry', [
  ['aunt', '短一点好。开始前再喊我一声啊，我怕一紧张又弄错。'],
  ['me', '好。咱们只做必要组，中间我报进度。您疼就说，不用靠忍着不动来帮我。'],
], 'c4_county_abdominal_retry_scan')
chain('c4_5_motion_rest', [
  ['aunt', '我坐两分钟。今天能做完就今天做，家里店还开着，我不想明天再关一回门。'],
  ['me', '那先缓一缓，您自己点头咱们再试。真做不完，改约也不用重新排队。'],
], 'c4_county_abdominal_retry_scan')
scan('c4_county_abdominal_retry_scan', '腹部必要序列重新采集中。', '腹部 MRI · 必要序列重采', 'c4_5_motion_after_0', 'abdomen', 'county-055-wide')
chain('c4_5_motion_after', [
  ['sys', '必要序列完成，新图组与首段分开标记。老周把阿姨的中等、重T2图并排放在屏幕上。', { image: 'mri_real_hemangioma_t2_v1', imageLabel: '阿姨的腹部MRI｜中等与重T2对照', card: 'c4_hemangioma' }],
  ['zhou', '同一处，换成重T2就亮得这么扎眼。你想到了什么？', { image: 'mri_real_hemangioma_t2_v1' }],
  ['me', '想到了**肝血管瘤**。重T2上很亮，位置也和她的超声对得上，再看增强怎么变。', { image: 'mri_real_hemangioma_t2_v1' }],
  ['sys', '老周翻到阿姨的动态增强图：动脉期可见结节样强化，门静脉期与平衡期逐渐向内填充。', { image: 'mri_real_hemangioma_dynamic_v1', imageLabel: '阿姨的动态增强MRI｜动脉期、门静脉期、平衡期' }],
  ['aunt', '要真是血管瘤，我这胀疼就是它弄的吗？', { image: 'mri_real_hemangioma_dynamic_v1' }],
  ['me', '不一定，要结合病灶位置、大小和其他检查。领取方式和复诊科室我写在单子上，需要补查也会写清。']
], 'c4_5_knee_0', 'bg_c4_county_corridor_v1')
chain('c4_5_knee', [
  ['sys', '拄拐老师坐到检查床旁，先把拐杖递给你，才慢慢把右腿抬上去。', { caseId: 'c4_county_knee_mimic' }],
  ['knee', '**膝盖卡住了，下楼最疼。**', { voice: 'vox_c4_knee_r9' }],
  ['me', '什么时候开始卡的？有没有受过伤，之前检查和治疗做到哪一步？'],
  ['knee', '三个月前下车扭过，**X光说没骨折**。上周讲课一转身又卡住了，现在下楼都得侧着走。'],
  ['me', '这次主要看**韧带、半月板和关节内结构**，把“卡住、伸不直”这些表现一起交给医师。没有发热和明显红肿，我也记下了。'],
  ['knee', '我上课站惯了，躺着倒不紧张。就是怕听见“半月板”三个字就直接被拉去开刀。'],
  ['me', '图上像什么、还要区分什么，我都会说清；治疗不能只凭一个征象。支垫不合适您就说，不用为了赶时间硬撑。']
], 'c4_county_knee_scan')
scan('c4_county_knee_scan', '膝关节序列采集中。', '膝关节 MRI · 外伤评估', 'c4_5_knee_result_0', 'knee', 'county-055-wide')
chain('c4_5_knee_result', [
  ['sys', '这张膝部图上，白箭头指向半月板体部和后角上方的楔形软组织，黄圈把同一位置标得更清楚。', { image: 'mri_real_knee_mimic_v1', imageLabel: '膝部T2W｜易误认的楔形软组织' }],
  ['zhou', '黄圈这块像半月板。你就这么写？', { image: 'mri_real_knee_mimic_v1' }],
  ['me', '先不定。移位的韧带也能长成这种样子，要把前后图连起来，追每块组织走到哪儿，再结合完整图组和查体。', { image: 'mri_real_knee_mimic_v1' }],
  ['knee', '那我下周还能不能带学生爬山？'],
  ['me', '现在还拄着拐，就先别拿爬山试膝盖。恢复安排等医师结合图组查体后再定。'],
], 'c4_5_knee_q')
question('c4_5_knee_q', 'zhou', '他追问是不是半月板。你怎么答？', [
  { text: '逐层对照韧带和半月板，再交接', next: 'c4_5_knee_review_0', effect: { skill: 1 } },
  { text: '把两种可能写清，再当面答他', next: 'c4_5_knee_explain_0' },
  { text: '先让他等完整图组，你再复核', next: 'c4_5_knee_explain_0' },
], { image: 'mri_real_knee_mimic_v1' })
chain('c4_5_knee_explain', [
  ['knee', '行，至少你没拿“等着”两个字把我打发了。'],
  ['me', '黄圈只是标出这儿有疑问，不是最后结论。报告出来后，您就问医师“韧带还是半月板”，别自己先把它想成手术。', { image: 'mri_real_knee_mimic_v1' }],
], 'c4_5_feng_0')
chain('c4_5_knee_review', [
  ['zhou', '这才对。楔形软组织只是长得像，别看见一个征象就把半月板搬走。我就在现场，咱俩逐层对照。'],
  ['me', '图组和疑点一起交接。患者那边我也答了，不让他只拿到一句“等报告”。']
], 'c4_5_feng_0')
const legacyEvidenceIds = [
  'c4_5_evidence_0', 'c4_5_evidence_1', 'c4_5_evidence_2', 'c4_5_evidence_q',
  'c4_5_chain_right_0', 'c4_5_chain_right_1', 'c4_5_chain_right_2',
  'c4_5_chain_wrong_0', 'c4_5_chain_wrong_1', 'c4_5_chain_price_0', 'c4_5_chain_price_1',
  'c4_5_chain_recover_0', 'c4_5_chain_recover_1', 'c4_5_chain_recover_2', 'c4_5_chain_recover_3',
]
legacyEvidenceIds.forEach(id => {
  steps[id] = { bg: 'bg_c4_county_corridor_v1', speaker: 'sys', sprite: '', sprite2: '', image: '',
    text: '小唐把下午复查单递给你：冯叔已经到了。厂家旧话不再重提，先接患者。', next: 'c4_5_feng_0' }
})
chain('c4_5_feng', [
  ['sys', '下午，小唐把冯叔和儿子领进来。许建平跟在最后，仍抱着旧纸袋，站在能看见检查床又不挡路的位置。', { caseId: 'c4_county_claustrophobia' }],
  ['tang', '冯叔的旧片和后续单我都找出来了。许建平说想先看看，我让他别替自己提前害怕，看完再决定。'],
  ['anxious', '药一直吃着，这阵子没再犯。可昨天一想今天要钻这个孔，又没睡踏实。'],
  ['me', '今天复查会跟市院旧片对比。现在头晕怎么样？进到孔口前，最担心哪一步？'],
  ['anxious', '头晕好多了，就是怕自己又喊停。今天这组多久？我捏呼叫，你们真听得见？'],
  ['me', '还是分段做，每组几分钟，我报进度。呼叫现在先试，您捏一下，我答一句；进去以后也一样。'],
  ['sys', '冯叔捏了两次，你答了两次。他看了眼儿子：“这回你别替我点头，我自己来。”']
], 'c4_feng_county_scan', 'bg_c4_county_corridor_v1')
scan('c4_feng_county_scan', '0.55T大孔径头部序列采集中。', '0.55T 头部 MRI · 分段采集', 'c4_5_feng_after_0', 'head', 'county-055-wide')
chain('c4_5_feng_after', [
  ['sys', '冯叔坐起来时，儿子在门外举着后续单，鞋都替他摆好了。'],
  ['anxious', '做完了？你刚才还真句句都答。'],
  ['me', '做完了。您刚才捏了我就答，后面几段也一样。后续安排让小唐再跟您和儿子说一遍，哪句没听清，现在问。'],
  ['tang', '药和下次复查都按神经内科那张单来，我不另外给您排一套。水在门外，慢慢喝。'],
  ['mystery', '他刚才捏呼叫，你们真听见了？'],
  ['anxious', '我捏两次都有人应。你也先进去看看？总不能比我还磨蹭吧。', { effect: { flag: 'c4_xu_witness', badge: 'c4r_witness' } }],
], 'c4_5_receipt_offer', 'bg_c4_county_corridor_v1')
question('c4_5_receipt_offer', 'mystery', '那就明天。对了，我带了张旧手术收据，要不要也看看？', [
  { icon: '🧾', text: '看看旧收据', next: 'c4_5_receipt_q' },
  { icon: '📅', text: '先约好明天检查', next: 'c4_5_close_0' },
], { shuffleChoices: false })
question('c4_5_receipt_q', 'sys', '许建平从纸袋底抽出一张旧手术收据，递到你面前。老周凑过来看：“编号缺了两位，医院和年份还能认。你先怎么留这条线索？”', [
  { text: '和老周登记，原件让他收好', next: 'c4_5_receipt_register_0', effect: { skill: 1, flag: 'c4_xu_receipt', badge: 'c4r_receipt_returned' } },
  { text: '抄下医院和日期，当场还原件', next: 'c4_5_receipt_return_0', effect: { flag: 'c4_xu_receipt', badge: 'c4r_receipt_returned' } },
  { text: '拍张照留线索，原件让他带走', next: 'c4_5_receipt_return_0', effect: { flag: 'c4_xu_receipt', badge: 'c4r_receipt_returned' } },
], { bg: 'bg_c4_county_corridor_v1', image: 'item_c4_surgery_receipt', imageLabel: '旧手术收据｜档案线索' })
chain('c4_5_receipt_return', [
  ['mystery', '这张在袋底压了好多年。我还是自己拿着，查到什么，你先告诉我。'],
  ['me', '原件您收好。缺的编号我们再查，别折腾丢了。'],
], 'c4_5_close_0', 'bg_c4_county_corridor_v1')
chain('c4_5_receipt_register', [
  ['zhou', '医院、年份和收据样式都登记。原件还你，复印件跟我们走档案流程。'],
  ['mystery', '行，明天见。我把东西都装好，省得临出门又找。'],
], 'c4_5_close_0', 'bg_c4_county_corridor_v1')
chain('c4_5_close', [
  ['sys', '许建平自己在预约单上写了名字和日期。冯叔嫌他字太瘦，小唐看了半天，只说能认出来就行。'],
  ['tang', '明早过来，我在门口接您。'],
  ['zhou', '行，今天收工。谁看见我茶杯了？'],
], 'c4_5_end', 'bg_c4_county_corridor_v1')
settle(5, '腹痛阿姨完成必要重采，拄拐老师把疑点带去了门诊。冯叔复查完，许建平也把明天的日期写上了；小唐在预约名后面画了个很小的勾。', 220, 'c4r_wide_bore_return')

// 第六段：腰椎金属伪影与检查交接。旧档案留在可选支线，不占据收班主轴。
chain('c4_6_open', [
  ['sys', '第三天一早，许建平准时到了。小唐接过申请单，给他指了指准备区的空椅子。'],
  ['tang', '植入物资料调到了，老周已经核过今天的扫描条件。您先坐，我拿个支垫。'],
  ['zhou', '来得挺早。今天腰还疼得厉害吗？'],
], 'c4_6_hub', 'bg_c4_county_corridor_v1')
hub(6, '许建平还在准备区外喝水。门诊记录夹、沈岚的早班消息和小唐订的早饭都等着你。', [
  ['📋 门诊记录夹 · 看旧手术与左颈资料', 'c4_6_follow_0', 'c4r6_6_follow', {}],
  ['☕ 员工茶水角 · 回沈岚一句冯叔复查完成', 'c4_6_shen_0', 'c4r6_6_shen', {}],
  ['🍚 员工茶水角 · 帮小唐把订的早饭分好', 'c4_6_help_tang_0', 'c4r6_6_help_tang', {},
    { chance: 0.3, next: 'c4_6_help_tang_mishap_0', effect: { gold: -30, badge: 'good_intentions' } }],
], 'c4_6_xu_0', '陪许建平进准备区')
chain('c4_6_follow', [
  ['sys', '旧门诊记录里有一句“否认植入物”，许建平指着它摇头。你改成“本人不清楚”，与今早调到的植入物资料放在一起。左颈资料另夹一册。'],
  ['mystery', '那时候忙着出院，家里说收拾好了，我也没再问。这些纸倒比我记得清楚。'],
  ['me', '今天怎么扫已经核好了。父亲那份另查，回话来了再一起看。', { effect: { flag: 'c4r6_6_follow' } }],
], 'c4_6_hub', 'bg_c4_county_corridor_v1')
chain('c4_6_shen', [
  ['shen', '冯叔复查做完了？', { communication: 'sms', phone: 'char_c4_shen_v3', sprite: '' }],
  ['me', '做完了。出来先冲儿子扬后续单，后来还嫌我夸多了。'],
  ['shen', '嫌你夸多了？这句像他。下回我见他，得问问到底是谁夸谁。', { communication: 'sms', phone: 'char_c4_shen_v3', sprite: '', effect: { flag: 'c4r6_6_shen' } }],
], 'c4_6_hub', 'ch2_bg_breakroom_day')
chain('c4_6_help_tang', [
  ['sys', '你把小唐订的早饭按名字摆开，老周那碗米粉少辣，你自己那份还在袋底。小唐递来一双筷子。'],
  ['tang', '先吃两口。老周那碗我去送，你把自己的吃了再忙。', { effect: { flag: 'c4r6_6_help_tang' } }],
], 'c4_6_hub', 'ch2_bg_breakroom_day')
chain('c4_6_help_tang_mishap', [
  ['sys', '（**意外**）你没看清标签，把老周那碗少辣也浇了辣油。只好重新订一份，小唐把加辣那碗推给能吃辣的老范。'],
  ['tang', '还好老范在。你去跟老周说声“再等等”，别让他以为自己那份又被忘了。', { effect: { flag: 'c4r6_6_help_tang' } }],
], 'c4_6_hub', 'ch2_bg_breakroom_day')
chain('c4_6_xu', [
  ['sys', '许建平在门口停了一下，看见小唐已经摆好支垫，才慢慢走过去。', { caseId: 'c4_county_xu_lumbar' }],
  ['mystery', '腰疼十几年了，这阵子还往左边屁股扯，坐久了就难受。热敷能顶一会儿，推拿也不管用。'],
  ['me', '这次看腰椎和神经受压。**金属植入物**资料已经核好了，今天可以按确认的条件扫。'],
  ['mystery', '原来真留了东西？这么多年，我一直以为全拆完了。'],
  ['me', '对，位置和型号都对上了。您躺好，哪里不舒服就告诉我们。', { card: 'c4_conditional' }],
  ['mystery', '里头那些没拆的东西，会不会碍事？'],
  ['me', '会影响**图像质量**。金属能让附近**变黑、变形**，我们会把原图留下，对着看，有需要再调整序列。']
], 'c4_xu_lumbar_scan', 'bg_c4_county_preparation_v1')
scan('c4_xu_lumbar_scan', '腰椎首段序列采集中。', '腰椎 MRI · 异常信号丢失', 'c4_6_artifact_intro_0', 'lumbar', 'county-055-wide')
chain('c4_6_artifact_intro', [
  ['sys', '首组已经采完。黄圈内是金属相关的信号丢失和变形，周围结构被遮住了一部分。', { image: 'mri_real_metal_artifact_v1', imageLabel: '腰椎MRI｜金属植入物伪影' }],
  ['zhou', '后面建议换**SE序列**。它采用**180°重聚脉冲**，能补偿部分因磁场不均匀导致的相位离散。', { image: 'mri_real_metal_artifact_v1' }],
  ['zhou', '**回波时间（TE）与回波间隔（Echo Spacing）尽量缩短**，有助于减少相位散失。能减轻伪影，不保证全消。', { image: 'mri_real_metal_artifact_v1' }],
], 'c4_6_artifact_q', 'bg_c4_county_control_v1')
question('c4_6_artifact_q', 'zhou', '黑影挡住了一部分结构。下一步怎么排？', [
  { text: '留原图，改短TE的SE补扫', next: 'c4_6_stop_0', effect: { skill: 1, badge: 'c4r_black_shadow' } },
  { text: '先评现有图，再决定是否补扫', next: 'c4_6_wrong_0' },
  { text: '对照已核过的植入物资料，再排后续序列', next: 'c4_6_wrong_0', effect: { flag: 'c4_xu_implant_query' } },
], { image: 'mri_real_metal_artifact_v1', imageLabel: '腰椎MRI｜金属植入物伪影' })
chain('c4_6_wrong', [
  ['zhou', '原图留下，早上核过的植入物资料也调出来。看看还缺哪部分结构，再决定补哪一组。'],
], 'c4_6_stop_0')
chain('c4_6_stop', [
  ['sys', '首组原图保留着。你和老周逐幅看：植入物周围信号丢失、变形明显，部分目标结构被挡住。老周把需要补看的位置记下来。', { card: 'c4_foreign' }],
  ['zhou', '早上核的是能不能扫，现在看怎么把这一片看清。换种序列，黑影兴许能收小一些。'],
  ['me', '原图留下。补扫还是按早上核定的条件来，先换短TE的SE。'],
  ['mystery', '那我这还能接着做吗？别扫半天，最后全是一片黑。'],
  ['me', '先按SE、短TE和短Echo Spacing补必要组，再看目标结构能不能评。实在答不了申请上的问题，也会写清图像质量。'],
  ['sys', '后续采集按调整后的方案继续。许建平听完剩余时间，把手里的呼叫球放松了一点。', { effect: { flag: 'c4_xu_implant_query' } }],
], 'c4_6_close_0', 'bg_c4_county_preparation_v1')
chain('c4_6_close', [
  ['sys', '图组交接完，许建平自己坐起来穿鞋。小唐把报告领取时间写给他，左颈那份资料另交门诊接着评估。', { card: 'c4_uncertain', effect: { flag: 'c4_neck_followup' } }],
  ['mystery', '响的时候还是紧张。还好你们一直应着。'],
  ['me', '做完了。鞋穿稳再起来，不急这一会儿。'],
], 'c4_6_end', 'bg_c4_county_corridor_v1')
settle(6, '天黑后，最后一组图像也交接完了。小唐合上预约本，你终于有空把凉透的茶倒掉，给自己接一杯热水。', 260, 'c4r_survivor')
// 第六段工资与勋章仍在原节点结算，但收班不再立刻切进考核。
// 旧的 c4_6_end 游标继续有效；完整收束后才由 c4_wrap_end 进入最终日程结算。
steps.c4_6_end.next = 'c4_wrap_0'
delete steps.c4_6_end.end
chain('c4_wrap', [
  ['sys', '小唐把三天的预约单按日期收好。老周关掉工作站旁的小台灯，发现自己的茶杯还在你这边。'],
  ['anxious', '我儿子非让我报个平安：今晚头不晕，饭也吃了。昨天多谢你们。我说做过一次就熟了，他还不信。', { communication: 'sms', phone: 'pat_c4_feng_v3', sprite: '' }],
  ['me', '收到。您这回确实比上回镇定多了，早点休息。'],
  ['tang', '嘴上说熟了，昨天出来还问我下回是不是也在。行，明天的单子放好了。'],
  ['fan', '明早的交接就按小唐这页来。今晚都到这儿吧，谁再把饭盒带回办公室，我就没收谁的筷子。'],
], 'c4_wrap_research_0', 'bg_office')
chain('c4_wrap_research', [
  ['shen', '我们最近在试怎么扫得更快，还有做任务看脑活动的研究。有空再跟你聊，今晚先下班。', { communication: 'sms', phone: 'char_c4_shen_v3', sprite: '' }],
  ['me', '好，先欠着。我这边还差老周五道题，答完才放人。', { communication: 'sms', phone: 'char_c4_shen_v3' }],
], 'c4_wrap_exam_0', 'bg_office')
chain('c4_wrap_exam', [
  ['sys', '手机终于安静了。老周从抽屉里摸出考核表，小唐把最后一只饭盒盖上，顺手给你们留了两把椅子。'],
  ['zhou', '五道基础题：磁场、脉冲、参数和图像。别背彩页，想清图是怎么来的。'],
  ['tang', '答完叫我，我把错题本给你留着。今晚可不许拿“还要交接”当借口溜了。'],
  ['me', '来吧。饭盒可给我留着，别答完连菜都没了。'],
], 'c4_wrap_end', 'bg_office')
steps.c4_wrap_end = { bg: 'bg_office', speaker: 'sys', sprite: '', image: '', end: true,
  text: '你翻开考核表，拿起笔。老周把茶杯挪开，给你腾出半张桌子。' }

// 考核后的尾声：同事收班、可选旧档案、家人近况，最后回到这次进修。
chain('c4_epilogue', [
  ['sys', '第二天，小唐把试用关闭记录收进夹子，桌上终于又能摆下早饭。', { bg: 'bg_office_day', effect: { flag: 'c4_vendor_line_closed' } }],
  ['tang', '豆浆在左边，别又拿老周那杯无糖的。油条趁热，今天没人替你留第二根。', { bg: 'bg_office_day' }],
  ['fan', '我总算能在自己桌上看见桌面了。谁再拿我的杯子压报价，我就把报价贴他电脑上。', { bg: 'bg_office_day' }],
], 'c4_epilogue_3', 'bg_office_day')
question('c4_epilogue_3', 'sys', '下午，旧病历送到了。老周在窗口陪许建平核对，你收好交接本，看了看时间。', [
  { icon: '📁', text: '过去陪他看一眼', next: 'c4_epilogue_4', cond: { notFlag: 'c4_father_transfer' } },
  { icon: '↩️', text: '让老周接着聊，回办公室收拾', next: 'c4_epilogue_baby_0' },
], { bg: 'bg_c4_county_corridor_v1', shuffleChoices: false })
// 保留4—8旧游标；查档只占五句，两个不同人的记录分别说明。
steps.c4_epilogue_4 = { bg: 'bg_c4_county_corridor_v1', speaker: 'sys', sprite: '', image: 'mri_real_metal_artifact_v1',
  text: '老周把完整旧病历与腰椎图放在一起：当年的手术记录与此前核过的植入物资料对上了。许建平往前挪了挪椅子。',
  effect: { flag: 'c4_implant_identified' }, next: 'c4_epilogue_5' }
steps.c4_epilogue_5 = { bg: 'bg_c4_county_corridor_v1', speaker: 'mystery', sprite: 'pat_c4_xu_v1', image: '',
  text: '总算翻到了。这几张能给我复印一份吗？', next: 'c4_epilogue_6' }
steps.c4_epilogue_6 = { bg: 'bg_c4_county_corridor_v1', speaker: 'zhou', sprite: 'char_zhou', image: 'item_transfer_record',
  text: '能。你这张手术单是父亲**许守义**签的字；后面另夹着他自己的**转诊存根**，外院也核到了。两份别夹混了。', next: 'c4_epilogue_7' }
steps.c4_epilogue_7 = { bg: 'bg_c4_county_corridor_v1', speaker: 'sys', sprite: '', image: 'item_transfer_record',
  text: '许建平摸了摸签名那一行，把两份复印件分开放好。父亲转诊后的去向还要继续查，总算有了可以接着问的地方。',
  card: 'c4_records', next: 'c4_epilogue_8' }
steps.c4_epilogue_8 = { bg: 'bg_c4_county_corridor_v1', speaker: 'mystery', sprite: 'pat_c4_xu_v1', image: '',
  text: '这回知道该往哪儿问了。你们忙，我把这些收好。',
  effect: { flag: 'c4_father_transfer', badge: 'c4r_formal_record' }, next: 'c4_epilogue_baby_0' }
chain('c4_epilogue_baby', [
  ['sys', '回到办公室，你正把进修笔记塞进包，表姐发来一张宝宝的照片。小家伙攥着拳头，冲镜头笑得正欢。'],
  ['cousin', '看他，吃饱了就这个表情。买的玩具一个不碰，专抢遥控器。刚抢到手就往嘴里送，你姐夫满屋子追。', { communication: 'sms', phone: 'pat_cousin', image: 'cg_c4_cousin_baby_v1', imageLabel: '表姐发来的宝宝照片', closeup: true, cameraMotion: 'settle' }],
  ['me', '先藏高点。等我过年回去，手机可得看好了。', { communication: 'sms', phone: 'pat_cousin', image: 'cg_c4_cousin_baby_v1', imageLabel: '表姐发来的宝宝照片', closeup: true, cameraMotion: 'settle', effect: { flag: 'c4_cousin_baby_update' } }],
], 'c4_epilogue_learning_0', 'bg_office_day')
chain('c4_epilogue_learning', [
  ['sys', '你合上笔记。前面几页还画着市院的走廊，后面已经添满了县里这台机器的记录。老周端着茶经过，停下来瞄了一眼。'],
  ['me', '三月在市院学的，回来一直用到现在。以后有机会，还想再去跟一段。'],
  ['zhou', '那就留意着。碰到想学的，记下来，下回带着去。'],
  ['sys', '你把笔记装好，关了桌上的灯。走到门口，又回来拿上差点忘掉的饭盒。'],
], 'c4_epilogue_end', 'bg_office_day')
steps.c4_epilogue_end = { bg: 'bg_c4_county_corridor_v1', speaker: 'sys', sprite: '', image: '', text: '第四章·共振，完。', end: true }

// 旧档停在被压缩的段落时就近续走，不重开、不补发旧预告或收藏。
for (let i = 2; i <= 6; i++) steps[`c4_wrap_research_${i}`] = {
  bg: 'bg_office', speaker: 'sys', sprite: '', image: '', text: '你收起手机，老周已经把考核表摊在桌上。', next: 'c4_wrap_exam_0',
}
for (let i = 9; i <= 17; i++) steps[`c4_epilogue_${i}`] = {
  bg: 'bg_office_day', speaker: 'sys', sprite: '', image: '', text: '老周留在窗口接着核对，你回办公室收拾东西。', next: 'c4_epilogue_baby_0',
}

// Explicit arrivals and quoted on-site speech: show the person in the introduction,
// before their first voiced line. Never inherit a portrait into hubs or remote calls.
for (const [id, sprite] of Object.entries({
  c4_pro_0: 'char_fan', c4_1_open_0: 'char_c4_shen_v3',
  c4_1_case_0: 'ch2_patient_wrist_student', c4_1_feng_0: 'pat_c4_feng_v3',
  c4_2_incident_0: 'pat_c4_liu_v4', c4_2_mrcp_0: 'pat_c4_liu_v4',
  c4_3_door_0: 'char_c4_courier_v1', c4_5_waiting_0: 'pat_c4_chen_v3',
  c4_5_motion_0: 'pat_c4_wu_v3', c4_5_knee_0: 'pat_c4_chen_v3',
  c4_5_feng_0: 'pat_c4_feng_v3', c4_6_xu_0: 'pat_c4_xu_v1',
  c4_5_receipt_q: 'char_zhou', c4_2_glasses_people_2: 'char_c4_shen_v3',
})) steps[id].sprite = sprite

// 远程角色留在通信头像中；主角的接话仍使用现场站位。
for (const step of Object.values(steps)) {
  if (!step.communication || !step.speaker || step.speaker === 'me' || step.speaker === 'sys') continue
  step.phone ||= characters[step.speaker]?.sprite
  step.sprite = ''
  step.sprite2 = ''
}

const cards: TrilogyChapter['cards'] = {
  c4_contrast: { title: '磁共振对比度｜不是换滤镜', body: 'T1、T2、FLAIR的采集权重与抑制目标不同，同一组织会呈现不同对比。脑脊液常在T1偏暗、T2偏亮，FLAIR则抑制自由水信号使其变暗；DWI、MRCP等专项应用应在此基础上理解。', image: 'mri_c4_basic_contrast_v1' },
  c4_stroke: { title: '疑似轻型缺血性卒中｜当晚接续评估', body: '冯叔的图组提示脑桥区小灶异常信号，DWI高信号、ADC对应低信号。结合短暂言语不清和右手无力，医师考虑轻型缺血性卒中。父子当晚带着图组与报告前往神经内科。', image: 'mri_real_stroke_sequences_v1' },
  c4_overview: { title: '一台机器，也是一条检查链', body: 'MRI不用X射线。磁体、梯度、射频是三大子系统，计算机负责控制与重建；患者还要经过筛查、摆位、配合、图像评估和交接。' },
  c4_magnet: { title: '磁体系统｜场强之外', body: '永磁、常导、超导是常见实现方式。磁体提供均匀、稳定的静磁场；场强、孔径、均匀度与维护条件要和患者任务一起看。', image: 'mri_c4_magnet_system' },
  c4_gradient: { title: '梯度系统｜空间定位与噪声', body: 'X／Y／Z三组梯度线圈协同完成空间定位。最大梯度强度与爬升率影响速度和序列能力；扫描噪声来自梯度线圈快速切换。', image: 'mri_c4_gradient_system' },
  c4_rf: { title: '射频系统｜发射与接收', body: '射频链路负责激发共振并接收MR信号。体线圈、部位专用线圈和多通道相控阵各有任务，通道、覆盖、贴合与部位匹配直接影响采集。', image: 'mri_c4_rf_system' },
  c4_sequences: { title: '头部四序列｜图组各有任务', body: '头部常规图组重点看T1、T2、FLAIR、DWI：解剖、水分、脑脊液抑制和扩散信息互相补充。MRCP用于胆胰管等专项评估；完整图组要结合临床问题看。', image: 'mri_c4_sequence_atlas' },
  c4_quality: { title: '运动伪影｜重影不是新病灶', body: '图中主动脉搏动产生的重复鬼影沿AP相位编码方向排列，在这张横断图上就是上下方向。它与患者挪动造成的模糊表现不同；支垫、序列时间和必要重采要按实际情况安排。', image: 'mri_real_motion_ghost_v1' },
  c4_field: { title: '设备没有脱离人的排行榜', body: '场强、孔径、线圈、软件、维护和团队各自解决不同问题。本院选择0.55T大口径，是匹配常规任务与部分患者耐受条件，不代表它普遍优于1.5T或3T。', image: 'cg_c4_procurement_v3' },
  c4_conditional: { title: '“不知道”也是一条真实资料', body: '外部铁磁性物品严禁进入机房和磁体区域。体内植入物能否进行MRI，要看准确型号、MR安全标识和厂家条件；确认符合条件的植入物可按规定换到MRI检查床扫描，资料不清时不能替他写“没有”。', image: 'mri_c4_implant_v3' },
  c4_foreign: { title: '黑影先看够不够用', body: '金属可造成信号丢失和几何变形，首先影响图像质量。SE的180°重聚脉冲可补偿部分相位离散；短TE与短Echo Spacing有助于减少相位散失，但不能消除所有伪影。保留原图并评价目标结构，安全筛查另按植入物型号和MR条件核查。', image: 'mri_real_metal_artifact_v1' },
  c4_records: { title: '两份记录，两个人', body: '许建平的手术单上留有父亲许守义的家属签字；许守义自己的转诊存根记着下一家医院。编号、日期和身份关系已经核对，两份资料分别保存。', image: 'item_transfer_record' },
  c4_uncertain: { title: '没有替未知写好答案', body: '植入物记录解释了腰椎黑影，左颈改变仍需临床与后续评估。不同部位、不同资料各自接续，不能仅凭一处信号确定性质。' },
  c4_hemangioma: { title: '肝血管瘤｜T2亮信号与渐进填充', body: '阿姨的肝内病灶在重T2上很亮，动态增强从结节样强化逐渐向内填充，这是肝血管瘤常见的影像表现。她担心的胀疼是否由它引起，还要结合位置、大小和其他检查来看。', image: 'mri_real_hemangioma_dynamic_v1' },
}
const legacyCards: TrilogyChapter['cards'] = {
  c4_evidence: { title: '旧版线索卡｜两张单', body: '历史存档保留：旧版第四章曾要求分别签收A17维修与AI试用关闭回执；现役主线不再重复播放这段厂家流程。' },
  c4_signal: { title: '旧版研究卡｜共振与射频', body: '旧版第四章高级原理卡，保留给已经获得的玩家；主线不再要求完成对应实验。' },
  c4_timing: { title: '旧版研究卡｜TR与TE', body: '旧版第四章高级序列卡，后续研究DLC再展开。' },
  c4_encoding: { title: '旧版研究卡｜空间编码', body: '旧版第四章空间编码卡，后续研究DLC再展开。' },
  c4_sampling: { title: '旧版研究卡｜采样取舍', body: '旧版第四章采样卡，后续快速成像DLC再展开。' },
  c4_motion: { title: '旧版研究卡｜运动与配合', body: '旧版第四章运动采样卡，后续研究DLC再展开。' },
  c4_acceleration: { title: '旧版研究卡｜加速成像', body: '旧版第四章加速研究卡，后续快速成像DLC再展开。' },
  c4_clinical: { title: '旧版知识卡｜优势与边界', body: '旧版第四章收藏。MRI常用于脑、脊髓、关节软组织、骨髓和许多腹部病变；皮质骨、钙化与肺部细节常需CT。' },
  c4_coil: { title: '旧版知识卡｜部位与线圈', body: '旧版第四章收藏。接收线圈要与检查部位和任务匹配，合适的位置、支撑与连接能帮助患者配合。' },
}

const book: TrilogyChapter['book'] = [
  { title: '01｜没有球管绕着你转', body: 'MRI不使用X射线。磁体、梯度、射频是三大子系统，计算机负责控制、重建与显示；最显眼的磁体只是整套系统的一部分。' },
  { title: '02｜磁体系统', body: '作用是产生均匀、稳定的静磁场，使人体内的氢质子被磁化。常见类型包括永磁、常导和超导。关键看场强（T）、孔径（cm）、磁场均匀度（ppm），也要看屏蔽、制冷和维护。场强影响信号潜力，不能单独决定整台机器是否合适。' },
  { title: '03｜梯度系统', body: '作用是空间定位。X、Y、Z三组梯度线圈协同完成选层与空间编码，让接收到的信号能够重建为图像。最大梯度强度（mT/m）与爬升率（T/m/s）影响速度和序列能力；快速切换也是扫描噪声的重要来源。' },
  { title: '04｜射频系统', body: '射频链路像天线：发射脉冲以激发共振，接收微弱的MR信号。常见有体线圈、头膝等部位专用线圈、多通道相控阵与柔性表面线圈；有些收发一体，有些只接收。通道数、覆盖范围、部位匹配和贴合固定都会影响到手的信号。' },
  { title: '05｜常用序列与对比', body: 'SE／FSE、GRE、IR是常见序列家族；临床图组还常用T1WI、T2WI、FLAIR、DWI、脂肪抑制和MRCP等对比或专项方案。T1常重解剖，T2让水分更醒目，FLAIR抑制游离水信号，DWI反映扩散，MRCP突出胆胰管内的静态液体。' },
  { title: '06｜TR、TE与完整图组', body: 'TR、TE及脂肪／水抑制等设置会改变图像对比，不是给同一张图换滤镜。不同序列回答不同问题，医师结合完整图组和临床资料判断，不能只挑一张最亮或最黑的图。高级脉冲时序留待研究DLC。' },
  { title: '07｜图像质量的软硬件账', body: '硬件看场强、磁场均匀度、梯度强度与爬升率、线圈通道和贴合、设备维护。软件看序列、FOV、矩阵、层厚、层间距、TR／TE、NEX／NSA、接收带宽和加速设置。分辨率、信噪比、时间与伪影要一起权衡。' },
  { title: '08｜MRI擅长什么', body: '脑梗死、脑肿瘤与其他神经系统病变，脊髓和神经受压，韧带、半月板、软骨与骨髓病变，以及许多肝胆胰和盆腔病变，常能从MRI的软组织对比中获益。具体仍需按临床问题选择序列和完整检查路径。' },
  { title: '09｜不擅长不等于不能看', body: '皮质骨、钙化与含气肺部的细节，很多情况下CT更直接；但MRI仍能显示骨髓、软组织及部分CT不易发现的病变，不能简化成“骨折和肺病都不能做”。急性创伤、病情不稳或无法安全配合时，也要先选择及时、可监护的检查。' },
  { title: '10｜从一个人到一张图', body: '申请与筛查、摆位和线圈、采集、重建、医师评估与临床交接连在一起。腹部检查可能需要呼吸配合，关节检查更依赖体位与局部线圈。任何一环卡住，都可能让检查延期或暂停。' },
  { title: '11｜伪影与未知都要分开查', body: '运动可造成重影，金属可造成信号丢失与变形。SE的180°重聚脉冲可补偿部分磁场不均匀造成的相位离散，短TE与短Echo Spacing有助于减少相位散失。先辨认现象，再决定重采、调整序列或继续评估。' },
  { title: '12｜场强不是全部，高级研究以后再做', body: '采购要看常见任务、三大子系统、线圈、软件、机房、维护、培训和人员。k空间、快速采样、fMRI与波谱等高级内容留待研究DLC，主章先建立完整检查与临床使用的宏观认识。' },
]
const quiz: TrilogyChapter['quiz'] = [
  { q: '在常用SE序列中，90°射频脉冲的主要作用是什么？', options: ['把纵向磁化翻向横向平面', '把横向磁化重聚成回波', '把静磁场方向转90°'], answer: 0, explain: '90°脉冲使纵向磁化转入横向平面，产生可检测的横向磁化。' },
  { q: 'SE序列里的180°重聚脉冲主要解决什么？', options: ['抑制自由水信号', '重聚部分相位离散', '加快纵向磁化恢复'], answer: 1, explain: '180°重聚脉冲可补偿部分静磁场不均匀造成的相位离散，形成自旋回波。' },
  { q: 'T1弛豫与T2弛豫分别描述什么？', options: ['T1看横向衰减，T2看纵向恢复', 'T1看纵向恢复，T2看扩散', 'T1看纵向恢复，T2看横向衰减'], answer: 2, explain: 'T1是纵向磁化恢复的时间常数，T2是横向磁化衰减的时间常数。' },
  { q: '其他条件相近时，哪组TR／TE更偏T1加权？', options: ['短TR、短TE', '长TR、长TE', '长TR、短TE'], answer: 0, explain: '短TR突出不同组织的T1恢复差异，短TE减少T2衰减对对比度的影响。' },
  { q: '面对金属或磁敏感伪影，SE与GRE通常有什么差别？', options: ['GRE通常更轻，SE通常更明显', 'SE通常更轻，GRE通常更明显', '两者相同，只看静磁场强度'], answer: 1, explain: 'SE的180°重聚脉冲可补偿部分相位离散；GRE没有这一重聚机制，通常更敏感。' },
  { q: '梯度系统在MRI成像中的核心任务是什么？', options: ['完成选层和空间编码', '提供稳定的静磁场', '产生射频激发脉冲'], answer: 0, explain: '梯度使磁场随位置变化，用于选层、频率编码和相位编码等空间定位。' },
  { q: '其他条件相近时，提高接收带宽通常带来什么？', options: ['SNR常提高，几何失真增大', 'SNR不变，只缩短回波间隔', 'SNR常下降，几何失真减小'], answer: 2, explain: '更高接收带宽通常纳入更多噪声，使SNR下降，但可减轻部分带宽相关的几何失真。' },
  { q: '急性缺血性病变出现真性扩散受限时，常见哪组表现？', options: ['DWI高、ADC高', 'DWI高、ADC低', 'DWI低、ADC高'], answer: 1, explain: 'DWI高信号需结合ADC判断；ADC对应低信号支持真性扩散受限。' },
  { q: '常规人体MRI主要利用哪种原子核的信号成像？', options: ['钙原子核', '氢原子核', '钠原子核'], answer: 1, explain: '常规MRI主要检测氢核，也就是质子。人体水和脂肪中含有丰富的氢。' },
  { q: '与CT相比，常规MRI成像使用的主要手段是什么？', options: ['磁场与射频脉冲', '更低能量的X射线', '高频超声波'], answer: 0, explain: 'MRI用磁场和射频脉冲激发、编码并检测磁共振信号，不靠X射线成像。' },
  { q: '没有射频激发、已达到平衡时，净磁化矢量通常指向哪里？', options: ['垂直于主磁场B0', '没有固定方向', '沿主磁场B0方向'], answer: 2, explain: '平衡时纵向存在净磁化，横向分量相互抵消。这不意味着每个氢核都完全同向排列。' },
  { q: '对同一种原子核，主磁场B0加倍时，拉莫尔频率如何变化？', options: ['加倍', '保持不变', '减半'], answer: 0, explain: '拉莫尔频率与主磁场强度成正比；同一种核在更强的磁场中进动得更快。' },
  { q: '要有效激发氢核磁共振，射频脉冲的频率应怎样选择？', options: ['接近目标氢核拉莫尔频率的一半', '与目标氢核的拉莫尔频率相匹配', '接近目标氢核拉莫尔频率的两倍'], answer: 1, explain: '射频脉冲覆盖目标氢核的共振频率，才能有效激发；这个频率由核种和局部磁场决定。' },
  { q: '接收线圈主要通过什么机制检测到MRI信号？', options: ['测量射频波穿过人体后的衰减', '测量静止的纵向磁化产生的恒定电流', '进动的横向磁化产生变化磁通，感应出电压'], answer: 2, explain: '进动的横向磁化使接收线圈中的磁通随时间变化，线圈通过电磁感应接收到信号。' },
  { q: '常规MRI中的k空间数据与最终图像是什么关系？', options: ['k空间存放空间频率数据，经傅里叶变换重建图像', 'k空间就是图像，每个点对应同位置的像素亮度', 'k空间存放各组织的T1、T2值，可直接显示为图像'], answer: 0, explain: 'k空间保存编码后的信号数据，通常通过逆傅里叶变换得到图像；一个k空间点并不等于一个对应位置的图像像素。' },
  { q: '其他采集条件相近时，减小体素通常带来什么取舍？', options: ['细节更容易分开，信噪比也一定提高', '细节更容易分开，但信噪比通常下降', '细节更难分开，但信噪比通常提高'], answer: 1, explain: '更小的体素有助于区分细小结构，但其中能贡献信号的质子更少，信噪比通常降低。' },
]

const badges: TrilogyChapter['badges'] = {
  c4r_city_start: { name: '第一晚有人喊停', icon: '🧭', desc: '首晚3T即时中止后，在另一检查区换0.55T大孔径完成四组序列。' },
  c4r_full_context: { name: '完整图组', icon: '🌓', desc: '把完整图组和临床问题一起交接。' },
  c4r_call_answered: { name: '呼叫有人应', icon: '🔔', desc: '冯叔3T首个序列刚开始的呼叫得到立即停止与后续安排。' },
  c4r_magnet_stop: { name: '侥幸停手', icon: '🧲', desc: '试图取下轻眼镜时被叫停，随后如实上报事故征候。' },
  c4r_xu_listened: { name: '先把电话听完', icon: '📞', desc: '许建平退缩时没有继续逼问。' },
  c4r_city_finished: { name: '一周有成稿', icon: '📘', desc: '完成市院进修与机型调研。' },
  c4r_need_first: { name: '把两版附件拆开', icon: '🧾', desc: '用旧合同和患者任务写出采购首页。' },
  c4r_no_shortcut: { name: '回复要有日期', icon: '📞', desc: '开机延期时，把厂家和患者两头都接住。' },
  c4r_procurement_done: { name: '从卷尺到开机', icon: '🏗️', desc: '预算、门框、人手和设备终于落到了同一天。' },
  c4r_first_day: { name: '开机第一天', icon: '🌅', desc: '接好装机首日的三岁儿童病例，陪妈妈完成后续交接。' },
  c4r_motion_answer: { name: '重影先答人', icon: '💬', desc: '向患者说清运动伪影与实际重采安排。' },
  c4r_receipt_returned: { name: '原件还给他', icon: '🧾', desc: '查看旧收据后抄下线索，把决定权留给许建平。' },
  c4r_wide_bore_return: { name: '我还敢试', icon: '🌗', desc: '冯叔在县院0.55T大口径完成门诊复查。' },
  c4r_witness: { name: '他在门外看见了', icon: '👁️', desc: '许建平目睹冯叔完成复查后主动预约。' },
  c4r_black_shadow: { name: '黑影也能评', icon: '⬛', desc: '保留金属伪影原图，评估图像质量并调整后续方案。' },
  c4r_survivor: { name: '回县上手了', icon: '🌙', desc: '完成两晚进修、采购装机与三段县院日程。' },
  c4r_formal_record: { name: '回执上的下一站', icon: '📁', desc: '找到许守义签名的旧手术与转诊记录。' },
}
const legacyBadges: TrilogyChapter['badges'] = {
  c4r_chain_solved: { name: '旧版勋章｜两张单各自归档', icon: '🧩', desc: '历史存档保留：旧版第四章曾分别签收A17维修与AI试用关闭回执。' },
  c4r_safe_pause: { name: '旧版勋章｜暂停也有下一站', icon: '⏸️', desc: '旧版第四章历史勋章。' },
  c4r_patient_clock: { name: '患者的钟也算', icon: '🕰️', desc: '第三版第四章历史勋章。' },
  c4r_research_honest: { name: '快与代价同页', icon: '🧩', desc: '第三版高级研究勋章，相关实验已移出主章。' },
  c4_two_views: { name: '不只挑最亮的', icon: '🌓', desc: '旧版第四章历史勋章。' },
  c4_night_sound: { name: '听见机器，不瞎猜', icon: '🎧', desc: '旧版第四章历史勋章。' },
  c4_pause: { name: '暂停也算负责', icon: '🛑', desc: '旧版第四章历史勋章。' },
  c4_call_heard: { name: '你喊，我们在', icon: '🔔', desc: '旧版第四章历史勋章。' },
  c4_same_person: { name: '同名之外', icon: '📁', desc: '旧版第四章历史勋章。' },
  c4_receipt: { name: '全部是哪一部分', icon: '🧾', desc: '旧版第四章历史勋章。' },
  c4_safe_research: { name: '没有一键', icon: '🧩', desc: '旧版第四章历史勋章。' },
  c4_transfer: { name: '下一站有名字', icon: '🚌', desc: '旧版第四章历史勋章。' },
  c4_teacher: { name: '换你带一班', icon: '📋', desc: '旧版第四章历史勋章。' },
  c4_survivor: { name: '共振的五班', icon: '🌙', desc: '旧版第四章历史勋章。' },
  c4_postcard_story: { name: '花搬走以后', icon: '✉', desc: '旧版第四章历史勋章。' },
  c4_rest_corner: { name: '下班眯一会', icon: '☾', desc: '旧版第四章历史勋章。' },
}

export const CH4: TrilogyChapter = {
  id: 'ch4', title: '共振', subtitle: '一周跟班，和三天慢慢顺起来的班', icon: '🧲', year: 2027,
  equipment: '0.55T · 80厘米大口径MRI', background: 'bg_c4_county_corridor_v1',
  shifts: [
    { id: 'c4_city1', title: '市院第一晚·怕也还能再试', subtitle: '腕伤跟班 · 3T即停 · 0.55T换机完成', date: '2027年3月3日 · 晚间接诊', start: 'c4_pro_0', checkinAt: 'c4_1_open_0', background: 'bg_office' },
    { id: 'c4_city2', title: '市院最后一晚·那声脆响以后', subtitle: '眼镜吸附 · MRCP · 维修记录', date: '2027年3月9日 · 晚间接诊', start: 'c4_2_open_0', background: 'bg_c4_city_control_v1' },
    { id: 'c4_procurement', title: '回县·把配置和日子写明白', subtitle: '原厂AI单列 · 采购交接 · 小唐改约', date: '2027年4月—11月 · 项目日程', start: 'c4_3_open_0', background: 'bg_office_day' },
    { id: 'c4_day1', title: '开诊第一天·恐龙也要上班', subtitle: '儿童脑积水 · 原厂试用 · 小唐接诊', date: '2027年11月15日 · 预约白班', start: 'c4_4_open_0', background: 'bg_c4_county_corridor_v1' },
    { id: 'c4_day2', title: '开诊第二天·先把患者接稳', subtitle: '腹部图组 · 运动伪影 · 膝部伪征 · 冯叔复查', date: '2027年11月16日 · 预约白班', start: 'c4_5_open_0', background: 'bg_c4_county_corridor_v1' },
    { id: 'c4_day3', title: '开诊第三天·看清黑影之后', subtitle: '腰椎金属伪影 · 序列调整 · 交班', date: '2027年11月17日 · 预约白班', start: 'c4_6_open_0', background: 'bg_c4_county_corridor_v1' },
  ],
  steps, afterQuiz: 'c4_epilogue_0', characters, badges, legacyBadges, cards, legacyCards, book, quiz,
  assets: [...new Set([
    ...Object.values(characters).flatMap(c => c.sprite && c.sprite !== 'me' ? [c.sprite] : []),
    'char_m', 'char_f',
    'bg_c4_city_control_v1', 'bg_c4_city_magnet_room_v1', 'bg_c4_city_corridor_v1', 'bg_c4_city_preparation_v1', 'bg_c4_city_staff_room_v1', 'bg_c4_city_triage_v1',
    'bg_c4_county_control_v1', 'bg_c4_county_magnet_room_v1', 'bg_c4_county_corridor_v1', 'bg_c4_county_corridor_preinstall_v1', 'bg_c4_county_preparation_v1',
    'bg_mri_room_day_v2', 'bg_mri_control_day_v2', 'bg_mri_corridor_day_v2', 'bg_waiting_day_v2', 'bg_office_day', 'bg_office', 'ch2_bg_breakroom_day',
    'item_notebook', 'mri_c4_implant_v3', 'cg_c4_glasses_v3', 'item_c4_a17_parts_v1', 'item_c4_quote_folder_v1',
    'case_c4_fetal_mri_v1', 'case_c4_fetal_us_mri_v1',
    'mri_real_tfcc_v1', 'mri_real_mrcp_v1', 'mri_real_hydrocephalus_v1', 'mri_real_motion_ghost_v1', 'mri_real_knee_mimic_v1', 'mri_real_metal_artifact_v1', 'mri_real_stroke_sequences_v1', 'mri_real_hemangioma_t2_v1', 'mri_real_hemangioma_dynamic_v1',
    'mri_c4_magnet_system', 'mri_c4_gradient_system', 'mri_c4_rf_system', 'mri_c4_sequence_atlas', 'mri_c4_basic_contrast_v1',
    'cg_c4_magnet_lift_v1', 'cg_c4_install_complete_v1', 'cg_c4_ribbon_stop_v1', 'cg_c4_ribbon_cutting_v1', 'cg_c4_city_wide_bore_v1',
    'trilogy_mri_scan_acquire_v3', 'trilogy_mri_scan_wrist_v1', 'trilogy_mri_scan_knee_v1', 'trilogy_mri_scan_shoulder_v1',
    'trilogy_mri_scan_cervical_v1', 'trilogy_mri_scan_lumbar_v1', 'trilogy_mri_scan_abdomen_v1', 'trilogy_mri_scan_city_wide_head_v1',
    'trilogy_mri_scan_county_head_v1', 'trilogy_mri_scan_county_wrist_v1', 'trilogy_mri_scan_county_knee_v1', 'trilogy_mri_scan_county_shoulder_v1',
    'trilogy_mri_scan_county_cervical_v1', 'trilogy_mri_scan_county_lumbar_v1', 'trilogy_mri_scan_county_abdomen_v1',
    'cg_c4_procurement_v3', 'cg_c4_city_hospital_entrance', 'cg_c4_city_hospital_entrance_female',
    // 退役剧情不再引用；保留旧存档背景、历史CG与既得纪念物的媒体注册。
    'bg_breakroom', 'bg_mri_control', 'bg_corridor', 'bg_c4_county_corridor_v1', 'cg_c4_luo_records_v2', 'item_c4_postcard_v2', 'item_c4_sleepmask_v2',
  ])],
  adapt(id, step, state) {
    if (id === 'c4_city_arrival') return { ...step, image: state.gender === 'f' ? 'cg_c4_city_hospital_entrance_female' : 'cg_c4_city_hospital_entrance' }
    if (id === 'c4_cousin_report_0' && state.flags.c3_cousin_mri_pending) return { ...step,
      text: '经过候诊区，你认出了靠窗那排椅子。去年陪表姐等报告时，她把产检本翻开又合上，你抱着两个人的外套，手心也直冒汗。' }
    if (id === 'c4_epilogue_baby_0' && !state.flags.c4_cousin_mri_resolved) return { ...step,
      text: '回到办公室，表姐发来宝宝的近况。去年胎儿MRI仍见轻度侧脑室增宽，没有发现其他脑部结构异常，后来的复查也稳定；如今孩子已经出生，家里又有了新的忙碌。' }
    if (id === 'c4_2_xu_0' && state.flags.c3_xu_third_visit) return { ...step,
      text: '老范把我的申请给你了？我是许建平。上次做超声那会儿，咱们见过。' }
    if (id === 'c4_3_quotes_2' && state.flags.c3_wen_copy_kept) return { ...step, text: '上回那份核对联还在院里，正好照着改。原厂AI单列，30天试用另放一页，账号和到期日都写明白。' }
    if (id === 'c4_6_follow_0' && state.flags.c3_xu_query_started) return { ...step, text: '许建平父亲的查询沿上次的受理号继续。他自己年轻时的手术资料另放一册，今早已核完本次扫描条件。' }
    if (id === 'c4_epilogue_5' && state.flags.c4_xu_listened) return { ...step, text: '你那时候没逼我。现在人也查完了，纸也翻到了。能给我复印一份吗？' }
    return step
  },
}
