import type { Step } from './types'

/* ================= DLC 番外篇 · 注册表 ================= */
/* 故事时间：2025年夏——第一章（2024.11）之后、第二章新CT启用（2025.11）之前的空窗期 */

export interface DlcDef {
  id: string
  icon: string
  title: string
  subtitle: string
  desc: string
  minutes: string
  start: string
  steps: Record<string, Step>
}

/* ================= DLC 勋章 ================= */
export const DLC_BADGES: Record<string, { name: string; icon: string; desc: string; hidden?: boolean }> = {
  dlc_dr_key: { name: '命根子的钥匙', icon: '🔑', desc: '第一次刷开 DR 机房的门' },
  dlc_dr_zero: { name: '分诊如流', icon: '🚦', desc: 'DR 白班全天无病人因等待而病情加重' },
  dlc_dr_ai: { name: '用人不疑', icon: '🤖', desc: 'AI 初诊六张片全部判断正确' },
  dlc_dr_done: { name: '白班初体验', icon: '☀️', desc: '完成 DLC·DR 白班' },
  dlc_dsa_done: { name: '首台跟台', icon: '🫀', desc: '完成 DLC·DSA 导管室' },
  dlc_dsa_time: { name: '门球时间', icon: '⏱️', desc: '跟台配合利落，D-to-B 达标（重采不超过一次）' },
  dlc_dsa_dose: { name: '剂量守门员', icon: '☢️', desc: '全程累计剂量控制在 800mGy 以内' },
  dlc_dsa_perfect: { name: '零重采', icon: '🎯', desc: '每一次采集时机都分毫不差' },
}

/* ================= 夜班手册 · 知识卡片 ================= */
export interface KnowledgeCard { title: string; body: string; image?: string }

export const CARDS: Record<string, KnowledgeCard> = {
  dr_vs_cr: {
    title: 'DR 与 CR：快在哪里',
    body: 'CR 把潜影写在 IP 板上，要送扫描仪激光读出；DR 的平板探测器直接把 X 射线转成数字信号，曝光后数秒出图。快的不只是速度——省去了搬板、读取、擦除整套人工环节，白天大门诊量才转得动。',
  },
  dr_detector: {
    title: '非晶硅 vs 非晶硒 · DQE',
    body: '非晶硅（间接型）：X 射线先被碘化铯闪烁体转成可见光再转成电信号，DQE 高、密度分辨率好，胸片首选。非晶硒（直接型）：X 射线直接变电信号，没有光散射，空间分辨率最高，适合四肢关节、乳腺。DQE（量子检出效率）衡量探测器把入射光子变成有用信号的本事——同样剂量下 DQE 越高图像越好。',
  },
  queue_priority: {
    title: '急重症优先是医学逻辑',
    body: '影像科的检查顺序不是服务态度问题：疑似气胸可能进展为张力性气胸，胸痛可能是不稳定心绞痛，空腹老人久等会低血糖。分诊的本质是 continuously 评估「等待的风险」。',
  },
  ai_boundary: {
    title: 'AI 辅诊的边界',
    body: 'AI 初诊在典型、高发的病变上又快又稳，但在两类地方容易失手：征象很轻微的病变（少量气胸、隐匿性骨折）容易漏；正常变异与重叠影（乳头影、血管交叉）容易误报。用它的正确姿势是「过筛」而非「签字」——AI 说没事的，自己要再看一眼。',
  },
  dsa_subtract: {
    title: 'DSA 减影：两张图相减',
    body: '打对比剂前先采一张「蒙片」（mask），注入对比剂后再采「活片」；两图相减，骨骼软组织全部抵消，只留下充盈了碘对比剂的血管。代价：病人只要动一下，两张图对不齐，减影就花了——所以采集时机要和口令严丝合缝。',
  },
  dsa_contrast: {
    title: '碘对比剂与过敏预案',
    body: '碘对比剂过敏反应从荨麻疹到喉头水肿、过敏性休克不等。询问过敏史是硬流程；有过敏史不等于禁忌——预防性用药＋抢救设备就位，获益远大于风险。真正的红线是「不做预案就上」。',
  },
  dsa_protection: {
    title: '介入防护三件套',
    body: '铅衣、铅围脖、铅眼镜——介入医生是吃着射线做手术的人。床下球管设计让散射线主要朝向术者一侧，所以防护帘、铅吊屏的位置都有讲究。距离、时间、屏蔽，防护三原则在导管室里全部实体化。',
  },
  dsa_fluoro_cine: {
    title: '透视 vs 电影采集',
    body: '透视（fluoro）用于实时引导导管走位，剂量率低；电影采集（cine/DSA 采集）帧率高、图像好，用于记录诊断影像，剂量率是透视的十倍以上。跟台的基本功：透视够用就不开电影，脚踩在踏板上就要想着剂量表。',
  },
  dsa_angles: {
    title: '机架角度：把血管「摊开」',
    body: 'C 型臂打角度的本质是让 X 射线束避开血管的重叠与短缩。左主干分叉用「蜘蛛位」（LAO＋足位）把它摊开；前降支常用头位；右冠常用 LAO 正位。选错角度，病变藏在重叠里；选对角度，狭窄无处遁形。',
  },
  dsa_dtob: {
    title: 'D-to-B：门球时间',
    body: 'Door-to-Balloon——患者进医院大门到球囊扩张开通血管的时间。指南要求 90 分钟以内，每多拖一分钟，坏死的心肌就多一点。导管室里所有人一路小跑，跑的都是这个数字。',
  },
  /* ===== 第一章卡片（老伙计值夜时陆续收入） ===== */
  kv_mas: {
    title: '管电压 kV 与毫安秒 mAs',
    body: '管电压决定每个 X 光子的能量——穿透力，调的是「质」；毫安秒 = 管电流 × 曝光时间，决定光子的总数，调的是「量」。1 mAs = 1 毫库仑，是电荷量的账。图像太淡先想「量」不够，穿不透再想「质」不够；但两者都是病人实打实吃进去的剂量，够用就好。',
  },
  protection_3: {
    title: '防护三原则：时间·距离·屏蔽',
    body: '缩短受照时间、拉远距离、中间加屏蔽——外照射防护就这三招。病人体内的散射线四散飞出，是操作者最主要的剂量来源；铅玻璃加铅门把散射线挡在检查室里，多隔一层、多远一米，剂量就成倍地降。防护是给自己上的保险。',
  },
  latent_image: {
    title: '潜影与残影',
    body: 'X 光穿过人体打在 IP 成像板上，能量被存储荧光材料「存」起来，形成肉眼看不见的潜影；激光逐行扫描读出时，存住的能量以荧光释放，转成数字图像。读完必须用强光彻底擦除，板子才能复用——擦除灯管老化、草草一擦，上一张片的影子就会叠在下一张上，这就是「残影」。',
  },
  battery_sign: {
    title: '双环征：电池还是硬币',
    body: '腹平片上的圆形金属影，关键看边缘：硬币是均匀的一整圈；纽扣电池正负极叠压，呈现外圈套内圈的「双环」。凶险程度天差地别——电池卡在消化道，两小时内即可灼伤黏膜甚至穿孔，须立即内镜取出；入胃的光滑硬币大多能自行排出，观察随访即可。征象是用来核对的，不是用来背的。',
  },
  two_views: {
    title: '为什么要拍正侧位',
    body: 'X 光片是把立体的人压成一张平面影子，一个体位必然丢掉一个维度的信息：正位看左右，侧位看前后。骨折有没有移位、往哪边移，只有正侧位对照着看才能判断。四肢、脊柱的「正侧位两张」是规矩，不是浪费。',
  },
  justification: {
    title: '正当化原则：不多拍一张',
    body: '每一次 X 光检查都要有明确的临床获益，获益必须大于辐射风险——这是放射防护的第一原则「正当化」。查哪拍哪，不多拍一张；反过来，该拍的漏拍了，是另一种失职。',
  },
  xray_tube: {
    title: 'X 线是怎么产生的',
    body: '球管里，灯丝通电烧到上千度放出电子，高电压把电子加速、轰击钨靶——电子骤停，能量转成 X 光。这笔能量账很悬殊：约 99% 变成热量，只有约 1% 变成 X 光。灯丝跟灯泡一样有寿命，阳极靠旋转把热量摊开——这就是机器需要「喘口气」的原因。',
  },
  scatter_grid: {
    title: '散射线与滤线栅',
    body: 'X 光穿过人体时，一部分光子发生康普顿散射、改变方向，四面八方的散射光子打到探测器上，给整幅图像蒙上一层均匀「灰雾」，对比度下降。滤线栅是只放行直行光子的铅条栅，能挡住大部分散射线。没有滤线栅时（比如床旁片），缩小照射野最实用——散射来源少了，雾自然淡；加大剂量只会连灰雾一起加。',
  },
  portable_dr: {
    title: '床旁摄影与移动 DR',
    body: '无法搬动的危重病人，只能把机器推到床边。移动 DR 用平板探测器直连，拍完当场出图，省去 CR 的送板读取。代价也很直接：功率小、没有滤线栅、病人摆不了标准体位，图像天生偏灰——解读床旁片，要先把这层「先天不足」算进去。',
  },
  pneumo_up: {
    title: '气胸为什么要站着拍',
    body: '游离气体总是往高处跑。站立位时胸腔里的气体聚在肺尖，片子上表现为肺野外带一片没有肺纹理的「黑」，边缘可见被压缩肺组织的细白线。卧位时气体散开贴在前胸壁，常常看不出来——怀疑气胸，能站就站着拍。',
  },
  lead_eq: {
    title: '铅当量：防护材料的共同语言',
    body: '不同材料的防护能力用「铅当量」折算：多厚的这种材料，顶得上多厚的铅。铅玻璃观察窗、掺铅粉的密封胶条、按 0.25/0.5mm 铅当量分级的铅衣，都是这么标定的。材料老化、门缝开裂，等于屏障上开了口子——防护是一个系统，短板决定水位。',
  },
  filtration: {
    title: '固有滤过与铝当量',
    body: '球管出来的 X 射线是连续谱，其中低能光子穿不透人体，只会平白增加皮肤剂量。玻璃管壁、绝缘油，再加附加滤过板，先把这些软射线滤掉，剩下的才拿去成像。滤过能力用「铝当量」衡量，年度质控的固定科目。',
  },
  pacs_intro: {
    title: 'PACS：片子的新家',
    body: '数字化之后，「片子」不再是胶片，而是一串数据。PACS（影像归档与通信系统）管这些数据存在哪、谁能看、怎么调——每张图都睡在服务器里，随调随看。也带来了新课题：账号、权限、日志审计——谁在凌晨三点看过哪张片，系统都记得。',
  },
  mammo: {
    title: '乳腺钼靶：低千伏的艺术',
    body: '乳腺全是软组织，普通高能 X 光下对比度拉不开。钼靶机用钼靶球管加很低的管电压，利用钼的特征辐射把脂肪与腺体的细微差别放大；压迫板把乳腺摊薄固定，减少重叠、降低剂量。致密型乳腺腺体多、片子上白茫茫一片，病灶容易藏身——钼靶加超声是黄金组合。',
  },
  heat_capacity: {
    title: '球管热容量：机器的体力条',
    body: '电子撞靶，99% 的动能变成热量，全靠旋转阳极把热摊开、散掉。连续高强度曝光，热量积在靶面散不出去，热容量报警就会亮起；硬扛几次，靶面熔出麻点，球管就此报废。热容量曲线是球管的体力条——等十分钟不是耽误，是让机器活下去。',
  },
  intensify_screen: {
    title: '增感屏与屏片时代',
    body: 'CR/DR 之前是屏片时代：X 光直接让胶片感光的效率很低，钨酸钙增感屏见 X 光发荧光，用荧光再把胶片「照亮」，感光效率提升几十倍。两片增感屏夹一张胶片装进暗盒，是上一代影像科的全部家当。旧片库里 1998 年的那张老胶片，就是这么拍出来的。',
  },
}

/* ================= 夜班手册 · 大事记 ================= */
export interface ChronicleEvent { time: string; title: string; body: string; flag?: string }

export const EVENTS: Record<string, ChronicleEvent> = {
  ch1_five_nights: { time: '2024年11月', title: '五个夜班', body: '独立值完第一章的五个夜班，晨会考核交卷，领到通关凭证。', flag: 'ch1_done_flag' },
  ch1_archive: { time: '2024年11月', title: '旧片库的胶片', body: '在旧片库发现 1998 年的无名胶片——一段还没拆封的往事。', flag: 'archive_film' },
  ch1_zhou: { time: '2024年11月', title: '凌晨三点的灯', body: '撞破老周深夜为无医保的流浪老人免费拍片。他撕了登记本的一页——老人连名字都没有。', flag: 'zhou_truth' },
  ch1_retire: { time: '2024年11月末', title: '「宣布个事」', body: '周末聚餐上，老周宣布：工龄满三十年，申请提前退休——然后返聘留科。人没走，编制退了。', flag: 'dlc_dr_started' },
  dr_day: { time: '2025年夏', title: '第一次白班', body: '被借调到 DR 机房顶白班。第一次见识白天的医院：人声、队列、被流程卡住的人。', flag: 'dlc_dr_started' },
  dr_ge: { time: '2025年夏', title: '登记处窗外的老葛', body: '外地务工的老葛胸痛三天，手续和钱都卡住。白天没有老周式的缝隙——这件事后来被很多人想起。', flag: 'ge_seen' },
  dsa_first: { time: '2025年夏末', title: '首台跟台', body: '凌晨跟台一台急性心梗急诊介入。门球时间、实时剂量、踏板口令——全都从课本名词变成了手上的事。', flag: 'dsa_started' },
  dsa_kai: { time: '2025年夏末', title: '踩点的人', body: '小凯交代了：去年打听「夜班谁说了算」是在为新 CT 订单踩点，看机器夜里归谁管。虚惊一场，原来如此。', flag: 'kai_truth' },
  /* ===== 第一章大事记（随剧情推进自动记入） ===== */
  ch1_night1: { time: '2024年11月', title: '第一个夜班', body: '独立值夜的第一个晚上：误吞纽扣电池的孩子、「双环征」、凌晨一点的内镜中心。问病史不花一分钱，有时比机器更管用。' },
  ch1_mystery: { time: '2024年11月', title: '深夜问片人', body: '一个查无异常的男人，拍完胸片却问：「医院还存着二十年前的老片子吗？」他登记的名字，笔迹潦草得像故意写乱。' },
  ch1_blackout: { time: '2024年11月', title: '凌晨三点的抢修', body: '老伙计半夜宕机——灯丝保险丝烧断。换上备用的，面板「嗡」地醒了。影像科的夜班，技师也得是半个工程师。' },
  ch1_trauma: { time: '2024年11月', title: '连环追尾之夜', body: '凌晨两点的急诊床旁胸片。散射线把图像蒙成灰雾，收紧照射野补拍成功：肋骨骨折，肺挫伤待排。' },
  ch1_ghost: { time: '2024年11月', title: '片上的残影', body: '一张胸片边缘浮着不属于病人的影子。不是灵异事件——有人摸黑用过机器，老化的擦除灯管没把潜影擦干净。' },
  ch1_bai: { time: '2024年11月', title: '半价的球管', body: '背皮包的老白上门推销第三方球管，价格只有原厂一半。「便宜件不是不能买，是坏了没人兜底。」' },
  ch1_ct: { time: '2024年11月', title: '批文下来了', body: '主任亲口确认：CT 的批文下来了。「明年这个时候，你们影像科，要变天了。」' },
}

/* ================= 夜班手册 · 证物 ================= */
export interface Evidence { title: string; body: string; image?: string; flag: string }

export const EVIDENCE: Record<string, Evidence> = {
  film1998: { title: '1998年无名胶片', body: '旧片库小铁柜里的胶片袋，没有登记，没有姓名。袋口的字迹已经褪色。', image: 'item_film', flag: 'archive_film' },
  old_photo: { title: '旧照片', body: '寻父男人出示的旧照片——和那个男人描述的父亲离开那年的样子。', image: 'item_photo', flag: 'archive_sealed' },
  screen_sample: { title: '增感屏残片', body: '屏片时代的暗盒配件，见 X 光就发荧光。老范说留着「给年轻人开开眼」。', image: 'item_screen', flag: 'archive_cab' },
  wen_card_ev: { title: '雯雯的名片', body: '厂家销售的名片。第 4 夜她说过：「真到招标那天，懂行的人替科室把关。」', flag: 'wen_card' },
  kai_survey: { title: '新 CT 机房勘测单', body: '小凯留下的勘测单复印件：电源容量、楼板承重、防护评价前期事项——原来他那么早就在为这台机器奔忙。', flag: 'kai_truth' },
  /* ===== 第一章证物 ===== */
  pacs_log_ev: { title: '凌晨三点的登录日志', body: '小雷截来的工作站日志：老周的账号，最近几个月凌晨三点多几次登录——只看片，不打印。', flag: 'pacs_log' },
  mystery_sign: { title: '潦草的登记签名', body: '问片男人在登记本上留下的名字，笔迹潦草得像故意写乱——是不想被认出来，还是不想被找到？', flag: 'mystery_name' },
  lead_glasses: { title: '1987 年的铅眼镜', body: '老范从报废柜里清出的老式铅橡胶眼镜，镜腿上刻着模糊的年份：1987。报废品，走不了账。', image: 'item_glasses', flag: 'n5_fan' },
  error_notebook: { title: '小雷的错题本', body: '信息科小雷整理的夜班病例错题本：双环征、正侧位、立位气胸……每页都配了示意图，PACS 里还有备份。', image: 'item_notebook', flag: 'n5_lei' },
  zhou_note: { title: '手写的用药说明', body: '药名、剂量、吃法，字迹一笔一画。老周写给桥洞老人的那张纸条——和垃圾桶里那页草稿，是同一种字。', flag: 'n5_cover' },
}

/* ================= DLC·DR：候诊队列配置 ================= */
/* 每台检查计 15 分钟；tolerance = 最多能等几台（等超了触发病情事件） */

export interface QueuePatient {
  id: string
  name: string
  age: string
  info: string
  tag: string
  urgent: boolean
  tolerance: number
  deteriorate?: { text: string; heart?: number }
  exam: {
    image: string
    finding: string
    aiSuggestion: string
    aiConfidence: string
    aiCorrect: boolean
    trustText: string
    distrustText: string
  }
}

export const DR_QUEUE: QueuePatient[] = [
  {
    id: 'p_xiaoliu', name: '小刘', age: '26岁', info: '打篮球被撞，左侧胸痛、气短', tag: '急诊', urgent: true, tolerance: 2,
    deteriorate: { text: '候诊区一阵骚动——小刘捂着胸口蹲了下去，呼吸越来越急。护士冲过去测氧饱和度：89%。复查胸片：**少量气胸进展为张力性气胸**，紧急穿刺排气。邵姐看了你一眼，什么都没说，又好像什么都说了。', heart: -1 },
    exam: {
      image: 'xray_pneumo', finding: '左肺野外带可见**脏层胸膜线**，其外无肺纹理——少量气胸，约 10%。',
      aiSuggestion: '未见明显异常', aiConfidence: '82%', aiCorrect: false,
      trustText: 'AI 说没事。你正要叫下一位，忽然想起邵姐的话——自己又看了一遍：左肺尖那条细线差点就从你眼皮底下溜过去。**少量气胸**。你立刻让护士优先处理，后背有点凉。',
      distrustText: '你没理会 AI 的「未见异常」——左肺野外带那条**脏层胸膜线**清清楚楚。少量气胸，通知临床，嘱其卧床观察。邵姐在旁边点了点头。',
    },
  },
  {
    id: 'p_zhao', name: '赵大爷', age: '68岁', info: '活动后胸痛三天，心内科申请胸片', tag: '急诊', urgent: true, tolerance: 2,
    deteriorate: { text: '候诊椅上的赵大爷突然捂住胸口，脸色煞白——**心绞痛发作**。小杜冲出登记处喊人，平车十分钟内推进了抢救室。心电图提示 ST 段压低。你看着空下来的候诊椅，计时器还在走。', heart: -1 },
    exam: {
      image: 'xray_normal', finding: '两肺清晰，心影不大，主动脉结略突出——胸片未见异常，建议结合心电图。',
      aiSuggestion: '未见明显异常', aiConfidence: '91%', aiCorrect: true,
      trustText: '胸片确实干净，AI 判断无误。你在申请单上写下「未见异常，建议心内科进一步评估」——胸痛的原因不在肺里，心电图和肌钙蛋白才是正主。',
      distrustText: '你对着图像看了三遍，确实什么都没找到——这次 AI 是对的。**胸片阴性不能排除心脏问题**，你在申请单上注明建议心电图。赵大爷去了抢救室方向，后来听说是不稳定心绞痛。',
    },
  },
  {
    id: 'p_ma', name: '马奶奶', age: '85岁', info: '咳嗽一周，家属陪同；今早空腹未进食', tag: '门诊', urgent: false, tolerance: 3,
    deteriorate: { text: '「奶奶？奶奶！」——马奶奶在候诊椅上冒冷汗、手发抖，家属慌了。**空腹久等，低血糖**。小杜冲了杯糖水，老人缓过来后家属连声道谢又带着埋怨：「早知道要等这么久，早上说啥也让她吃口东西。」', heart: -1 },
    exam: {
      image: 'xray_normal', finding: '两肺纹理稍增粗，余未见异常——老年性改变，建议随诊。',
      aiSuggestion: '未见明显异常', aiConfidence: '88%', aiCorrect: true,
      trustText: 'AI 判断无误。老年性肺纹理改变，没有感染征象。家属连声道谢，扶着奶奶慢慢走了。',
      distrustText: '你反复看了两遍，还是同意 AI：没有感染征象。**承认机器说对了，也是功夫**。家属千恩万谢地走了。',
    },
  },
  {
    id: 'p_wang', name: '王姐', age: '45岁', info: '单位年度体检，无任何不适', tag: '体检', urgent: false, tolerance: 99,
    exam: {
      image: 'xray_normal', finding: '两侧乳头影对称可见，肺野清晰——正常胸片。',
      aiSuggestion: '右上肺可疑结节，建议进一步检查', aiConfidence: '67%', aiCorrect: false,
      trustText: '你把「可疑结节」写了上去。王姐拿着报告走了，脸色比来时白了一层。三天后她做了 CT——什么都没有，**是两侧对称的乳头影**。那三天她是怎么过的，你不知道。邵姐知道后只说了一句：「AI 的置信度 67%，你看都不看就信了？」',
      distrustText: '67% 的置信度让你多留了个心眼——放大一看，**两侧对称**，位置一模一样，是乳头影。你把 AI 标记划掉，写上「未见异常」。王姐如释重负地笑了。',
    },
  },
  {
    id: 'p_xiaozhao', name: '小赵', age: '19岁', info: '打球崴了手，右腕肿痛', tag: '门诊', urgent: false, tolerance: 99,
    exam: {
      image: 'xray_fracture', finding: '尺骨远端骨皮质欠光整，可见**骨皮质皱褶**——隐匿性骨折。',
      aiSuggestion: '未见明确骨折', aiConfidence: '76%', aiCorrect: false,
      trustText: '你采纳了 AI 的「未见明确骨折」。一周后小赵肿着手腕回来了，复查片骨折线清清楚楚——**隐匿性骨折第一周最容易漏**。带教复盘时邵姐没批评你，只让你把这条记进手册：「AI 漏的，往往是这种要拿放大镜找的。」',
      distrustText: '腕关节你向来不敢全信 AI——放大骨窗一看，尺骨远端**骨皮质皱褶**，隐匿性骨折。上夹板，嘱一周复查。小赵龇牙咧嘴地道谢。',
    },
  },
  {
    id: 'p_qian', name: '老钱', age: '58岁', info: '肺癌术后复查，住院部加急送下来', tag: '加急', urgent: false, tolerance: 4,
    deteriorate: { text: '住院部护士站打来电话催：老钱的术后复查再不拍，下午的查房结论就出不来，**明天的化疗方案也要往后推**。你连声道歉，赶紧把人接了进来。', heart: -1 },
    exam: {
      image: 'xray_normal', finding: '术后改变，术区条索影；两肺清晰，无新发——与前片相仿。',
      aiSuggestion: '术后改变，未见新发异常', aiConfidence: '93%', aiCorrect: true,
      trustText: 'AI 判断无误。术后改变稳定，你签上「与前片相仿」，护士站那边松了口气——下午的查房赶上了。',
      distrustText: '你对比着描述里的「术区条索影」看了半天，确认只是术后改变。AI 这次是对的。**复查片的关键是「与旧片对照」**——你让登记处调了三个月前的片子对比，无变化。',
    },
  },
]

/* 队列恶化事件统一入口：返回每个病人「已等待台数」（按接诊顺序推定） */
export function queueWaits(served: string[]): Record<string, number> {
  // 第 n 台接诊时，未接诊者等待台数 = n
  const waits: Record<string, number> = {}
  DR_QUEUE.forEach(p => {
    const idx = served.indexOf(p.id)
    waits[p.id] = idx >= 0 ? idx : served.length
  })
  return waits
}

/* ================= DLC·DR白班「顶班」剧本 ================= */

const DR_STEPS: Record<string, Step> = {
  dr_0: { bg: 'bg_day', speaker: 'sys', text: '2025 年夏，一个周一的早上七点半。你在离医院两条街的地方下了公交——上了大半年夜班，你已经很久没见过这个时间的太阳了。', event: 'dr_day', effect: { flag: 'dlc_dr_started' }, next: 'dr_1' },
  dr_1: { speaker: 'sys', text: '科室门口的黑板上还留着上周五写的粉笔字：「周六晚全科聚餐，务必到」。字迹被人擦过一半，没擦干净。', next: 'dr_2' },
  dr_2: { bg: 'bg_day', speaker: 'shao', sprite: 'char_shao', sfx: 'vox_shao', text: '你就是夜班来的那个小同志吧？我邵云，白班技师长。', next: 'dr_3' },
  dr_3: { speaker: 'shao', sprite: 'char_shao', text: '看你刚才盯着黑板——那事儿你知道吧？周老师退了，又没退：工龄满三十年，提前退休，然后返聘留科。人还坐那个位置，就是编制退了，科里排班整个重排了一遍。', next: 'dr_4' },
  dr_4: { speaker: 'shao', sprite: 'char_shao', text: '白班的小吴外出进修三个月，排班又刚重排完，人手见了底——所以这三个月的周一，你来顶白班。**规矩只有一条：在我机房，听我口令。**', next: 'dr_5' },
  dr_5: { speaker: 'sys', text: '邵姐刷开走廊尽头那扇门。——你值夜班时天天路过的、锁着的、挂着「DR 机房」牌子的那扇门。', bg: 'bg_drroom', effect: { badge: 'dlc_dr_key' }, next: 'dr_6' },
  dr_6: { speaker: 'me', text: '（这就是主任的命根子……你在门口站了两秒才进去。机房比想象中安静，悬吊的球管像某种收着翅膀的大鸟。）', bg: 'bg_drroom', next: 'dr_7' },
  dr_7: { speaker: 'shao', sprite: 'char_shao', bg: 'bg_drroom', text: '知道为什么夜里锁门吗？全院就这一台 DR，白天门诊量全靠它转。夜里万一用坏了，第二天全院门诊抓瞎——**没人修得起，就谁都别碰**。你们夜班抱着 IP 板跑 CR，不是院里抠，是这台机器真出不起事。', card: 'dr_vs_cr', next: 'dr_8' },
  dr_8: { speaker: 'shao', sprite: 'char_shao', text: '先忘记你夜班那套流程。CR 是拍完抱着板子跑扫描仪、等激光一条一条读；DR 的**平板探测器**直接把 X 射线变成数字信号——曝光完，图已经在工作站上了。来，看好了。', next: 'dr_9' },
  dr_9: { speaker: 'sys', text: '邵姐给一位咳嗽的大爷摆位、回到控制区、按下手闸。「嘀」的一声——**两秒后，图像已经在屏幕上**。你下意识抱起了胳膊，又发现没有板子可抱。', next: 'dr_10' },
  dr_10: { speaker: 'me', text: '（老伙计要是看到这一幕，怕是要自卑。你把怀里的空气放下，决定不告诉它。）', sprite: 'char_shao', next: 'dr_11' },
  dr_11: { speaker: 'shao', sprite: 'char_shao', text: '还有这个——厂家试用装的 **AI 辅诊**，每张片自动弹初诊标记。咱们科试三个月，你是第一个完整用一天的。', next: 'dr_12' },
  dr_12: { speaker: 'shao', sprite: 'char_shao', text: '丑话说前头：**它过筛，你把关**。它错起来是有规律的，规律我不告诉你——自己撞出来的才记得住。好了，九点，开闸。', card: 'ai_boundary', next: 'dr_13' },
  dr_13: { speaker: 'sys', text: '上午九点，候诊区的座椅转眼坐满。登记处的叫号屏开始滚动，六份申请单躺在你的工作列表里——**先做谁，你说了算**。', bg: 'bg_waiting', card: 'queue_priority', next: '@queue' },

  /* ---- 队列结束后的午后 ---- */
  dr_noon0: { speaker: 'sys', text: '中午十二点，最后一份申请单从列表里划掉。候诊区空了一半，消毒水味里混进一点食堂飘来的饭菜香。', bg: 'bg_drroom', next: 'dr_noon1' },
  dr_noon1: { speaker: 'sys', text: '【上午的调度，邵姐都看在眼里】', bg: 'bg_drroom', choices: [
    { text: '（继续）', next: 'dr_noon2a', cond: { notFlag: 'dr_incident' } },
    { text: '（继续）', next: 'dr_noon2b', cond: { flag: 'dr_incident' } },
  ]},
  dr_noon2a: { speaker: 'shao', sprite: 'char_shao', text: '上午零事故。候诊顺序排得像个老白班——**先做谁后做谁，看的不是谁先来的，是谁等不起**。行，下午我放手，你自己盯。', next: 'dr_noon3' },
  dr_noon2b: { speaker: 'shao', sprite: 'char_shao', text: '上午那档子事，我不批评你，但你要记住那个感觉。**分诊不是服务态度，是医学判断**——等不起的人，脸上都写着呢，申请单上也写着。下午你自己盯，我看你还能不能睡着。', effect: { skill: 1 }, next: 'dr_noon3' },
  dr_noon3: { speaker: 'sys', text: '午后平峰。候诊区只剩零星几个人，阳光从走廊窗户斜切进来，把地板分成明暗两半。', next: 'dr_wen0' },

  /* ---- 雯雯巡检 ---- */
  dr_wen0: { speaker: 'wen', sprite: 'char_wen', sfx: 'vox_wen', bg: 'bg_drroom', text: '技师老师！季度巡检——AI 工作站跑得还顺吗？……欸，是您？！', next: 'dr_wen1' },
  dr_wen1: { speaker: 'sys', text: '【雯雯打量着你】', sprite: 'char_wen', choices: [
    { text: '「名片我还留着呢——问过您 DQE 的那个夜班的。」', next: 'dr_wen2a', cond: { flag: 'wen_card' } },
    { text: '「您好，我今天顶白班。」', next: 'dr_wen2b', cond: { notFlag: 'wen_card' } },
  ]},
  dr_wen2a: { speaker: 'wen', sprite: 'char_wen', text: '我就说面熟！那晚全院就您追着我问参数。正好——今天带了两块体模样片，给您看点好东西：**同一台机器，非晶硅和非晶硒出的图**。', effect: { skill: 1 }, next: 'dr_wen3' },
  dr_wen2b: { speaker: 'wen', sprite: 'char_wen', text: '白班好呀，能见着太阳。正好，巡检顺手给您补一课——这台 DR 的**平板探测器**，里头学问大着呢。', next: 'dr_wen3' },
  dr_wen3: { speaker: 'wen', sprite: 'char_wen', text: '非晶硅是**间接型**：X 射线先被碘化铯闪烁体转成可见光、再转成电信号，**DQE 高**、密度分辨率好，胸片就靠它；非晶硒是**直接型**，X 射线直接变电信号，中间没有光散射，空间分辨率顶格，四肢关节、乳腺这种看细节的活儿归它。', card: 'dr_detector', next: 'dr_wen4' },
  dr_wen4: { speaker: 'wen', sprite: 'char_wen', text: '对了，听说你们的新 CT 批文下来了？装机前我们工程师会先来踩点勘测——说不定到时候还是我跑你们科。回见啦，技师老师。', next: 'dr_wen5' },
  dr_wen5: { speaker: 'sys', text: '雯雯抱着笔记本电脑走了。你看了眼墙上的钟：下午三点。登记处方向忽然传来一阵拔高的说话声。', next: 'dr_ge0' },

  /* ---- 老葛事件 ---- */
  dr_ge0: { speaker: 'sys', text: '登记处的玻璃窗外，一个皮肤黝黑的中年男人正弓着腰，把一沓单据递进窗口，又被推出来一半。', bg: 'bg_waiting', sprite2: 'pat_ge', next: 'dr_ge1' },
  dr_ge1: { speaker: 'du', sprite: 'char_du', sfx: 'vox_du', bg: 'bg_waiting', text: '师傅，真不是我为难您——**住院证要押金，外地医保要备案**，这两个都没有，系统里开不出检查的。我要是给您拍了，钱从哪儿出、责任算谁的？', sprite2: 'pat_ge', next: 'dr_ge2' },
  dr_ge2: { speaker: 'ge', sprite: 'pat_ge', bg: 'bg_waiting', text: '闺女，我在工地扛了三天，胸口这块儿越来越疼……我就拍个片，看看是不是岔了气，多少钱我、我想办法……', next: 'dr_ge3' },
  dr_ge3: { speaker: 'sys', text: '【你正好路过。怎么办？】', sprite: 'char_du', sprite2: 'pat_ge', choices: [
    { text: '帮老葛问清楚：院里有没有特困救助 / 急诊绿色通道的正规流程', next: 'dr_ge4a', effect: { heart: 1, flag: 'ge_helped' }, tag: 'good' },
    { text: '悄悄垫付 200 押金，先让他把片拍了（-200 金币）', next: 'dr_ge4b', cond: { gold: 200 }, effect: { gold: -200, heart: 2, flag: 'ge_advance' }, tag: 'neutral' },
    { text: '流程就是流程，你插不上手，回机房', next: 'dr_ge4c' },
  ]},
  dr_ge4a: { speaker: 'sys', text: '你打了三个电话：医务科、救助办、急诊科。四十分钟后流程走通了——**先检查、后补手续**，特困救助基金介入。老葛的胸片显示肋软骨炎，无大碍。他攥着报告单，朝你和登记处各鞠了一躬。', event: 'dr_ge', effect: { flag: 'ge_seen', skill: 1 }, next: 'dr_ge5' },
  dr_ge4b: { speaker: 'sys', text: '你把 200 块钱从窗口递进去。小杜张了张嘴，压低声音：「这不合规……下不为例啊。」老葛的片拍了——肋软骨炎，无大碍。他非要留下你的姓，说工钱结了一定还。', event: 'dr_ge', effect: { flag: 'ge_seen' }, next: 'dr_ge5' },
  dr_ge4c: { speaker: 'sys', text: '你回了机房。隔着走廊，你听见小杜还在一句一句解释流程，声音不急不躁。半小时后候诊区安静下来——老葛走了，拍没拍成，你不知道。', event: 'dr_ge', effect: { flag: 'ge_seen' }, next: 'dr_ge5' },
  dr_ge5: { speaker: 'me', text: '（你想起了夜班的老周。深夜的他可以在登记本之外给人留一条缝；白天的这里，**每一道缝都被流程焊死了**。说不上谁对谁错——你只是忽然懂了些什么。）', next: 'dr_ev0' },

  /* ---- 傍晚小高峰 ---- */
  dr_ev0: { speaker: 'sys', text: '下午四点半，急诊的电话和放学崴脚的中学生同时到了。小高峰来了——你压低重心：摆位、曝光、出图，DR 的节奏快得像流水线。', bg: 'bg_drroom', next: 'dr_ev1' },
  dr_ev1: { speaker: 'sys', text: '五点一刻，ICU 来电话：术后病人要床旁胸片。你推出墙角那台**移动 DR**——全院唯一一台，夜班的老相识。平板直连，当场出图，一个来回二十分钟。', next: 'dr_ev2' },
  dr_ev2: { speaker: 'sys', text: '下午六点。最后一份报告发出，你锁上 DR 机房的门，把钥匙交还登记处。小杜头也不抬：「明天还是你吧？钥匙明早还是这儿领。」', next: 'dr_end0' },
  dr_end0: { speaker: 'shao', sprite: 'char_shao', bg: 'bg_drroom', text: '今天辛苦。……明天还来吗？', next: 'dr_end1' },
  dr_end1: { speaker: 'me', text: '（邵姐说这话的时候没看你，在擦她的操作台。但你听出来了——这是她能给出的最高评价。）来。', sprite: 'char_shao', next: 'dr_end2' },
  dr_end2: { speaker: 'sys', text: '走出医院大门，天还亮着。你回头望了一眼住院部——再有两个小时，夜班的你就要打卡上岗了。**原来同一座医院，白天和深夜是两个世界。**', effect: { badge: 'dlc_dr_done', gold: 150 }, end: true },
}

export const DLC_DR: DlcDef = {
  id: 'dr',
  icon: '☀️',
  title: '番外篇 · DR 白班',
  subtitle: '顶班',
  desc: '2025年夏 · 一个周一的完整白班：主任的命根子机房、候诊队列调度、AI 初诊的边界',
  minutes: '约 15~20 分钟',
  start: 'dr_0',
  steps: DR_STEPS,
}

/* ================= DLC·DSA导管室「跟台」剧本 ================= */

const DS_STEPS: Record<string, Step> = {
  ds_0: { bg: 'bg_corridor', speaker: 'sys', text: '2025 年夏末，深夜十一点四十。你刚巡完机房，口袋里的对讲机还热乎着，兜里的手机震了。', effect: { flag: 'dsa_started' }, next: 'ds_1' },
  ds_1: { speaker: 'he', phone: 'char_he', sfx: 'ring', text: '是我，小何！别挂——急诊刚收一个 52 岁男性，胸痛两小时，心电图 ST 段抬高，**STEMI**！导管室今晚搭手的进修医生家里有事回去了，秦主任问科里谁能去帮设备——老周说，你可以。', next: 'ds_2' },
  ds_2: { speaker: 'me', text: '（老周那句「等以后有胆子跟介入科跟台再说」……他真记着呢。）', phone: 'char_he', next: 'ds_3' },
  ds_3: { speaker: 'sys', text: '【怎么回？】', phone: 'char_he', choices: [
    { text: '「导管室见。」', next: 'ds_4', effect: { heart: 1 }, tag: 'good' },
    { text: '「我……只管过 CR，行吗？」', next: 'ds_3b' },
  ]},
  ds_3b: { speaker: 'he', phone: 'char_he', text: '秦主任说了：导管他来做，**机器归你管**。剂量、角度、采集——这些都是你的老本行。快来，病人已经在路上了。', next: 'ds_4' },
  ds_4: { bg: 'bg_cathlab', speaker: 'sys', text: '导管室比你想象的大，也比想象的冷。C 型臂悬在检查床上方，像一台收拢的机械吊臂。墙上挂着一排铅衣，绿呢子帘子后面隐约是控制区。', next: 'ds_5' },
  ds_5: { speaker: 'liao', sprite: 'char_liao', sfx: 'vox_liao', bg: 'bg_cathlab', text: '影像科的吧？我小廖，导管室巡回护士。先别愣着——**铅衣、铅围脖、铅眼镜**，三件套一件不能少。进了这间屋子，散射线就是你同事，天天见，别跟它客气。', card: 'dsa_protection', next: 'ds_6' },
  ds_6: { speaker: 'sys', text: '铅衣沉得像一床湿棉被。你刚系好围脖，自动门滑开——一个穿手术服的男人大步进来，一边戴无菌手套一边看墙上的钟。', sprite: 'char_liao', next: 'ds_7' },
  ds_7: { speaker: 'qin', sprite: 'char_qin', sfx: 'vox_qin', bg: 'bg_cathlab', text: '秦放。**我管导管，你管机器。** 角度、视野、采集时机，听我口令；剂量表在你手边，看着点。病人十分钟到，自检开机。', sprite2: 'char_liao', next: 'ds_8' },
  ds_8: { speaker: 'sys', text: '开机、自检、球管预热、高压注射器排程。墙上的计时器从急诊电话那一刻起就在走——**D-to-B，门球时间：病人进大门到球囊开通血管，90 分钟**。这间屋子里所有人都在和这个数字赛跑。', card: 'dsa_dtob', next: 'ds_9' },
  ds_9: { speaker: 'sys', text: '平车推进来。病人王叔，52 岁，额头全是汗，右手死死按在胸口。小廖一边接监护一边做术前核对。', sprite2: 'char_qin', next: 'ds_10' },
  ds_10: { speaker: 'liao', sprite: 'char_liao', text: '王师傅，问您几句：以前做过增强 CT 吗？**对碘对比剂过敏吗**？有没有什么过敏的东西？', next: 'ds_11' },
  ds_11: { speaker: 'sys', text: '王叔喘着气想了想：「过敏倒没有……就是小时候吃虾起过一身疹子，几十年了。」小廖看向你——术前准备单上「过敏史」一栏空着，等你记录和处理建议。', sprite: 'char_liao', next: 'ds_12' },
  ds_12: { speaker: 'sys', text: '【怎么处理这条过敏史？】', sprite: 'char_liao', choices: [
    { text: '记为「可疑过敏史」：预防性用药，抢救车推到手边，全程盯血压', next: 'ds_13a', effect: { skill: 1 }, tag: 'good' },
    { text: '「风险太大，建议取消检查」', next: 'ds_13b' },
    { text: '「几十年前的事了，不用管，直接做」', next: 'ds_13c' },
  ]},
  ds_13a: { speaker: 'qin', sprite: 'char_qin', text: '嗯。就按这个办。', next: 'ds_14' },
  ds_13b: { speaker: 'qin', sprite: 'char_qin', text: '取消？他血管堵着，每分钟都在坏心肌。**获益远大于风险的时候，预案不是用来挡检查的，是用来让检查能做的**。记下来：可疑过敏史，预防用药，继续。', effect: { skill: 1 }, next: 'ds_14' },
  ds_13c: { speaker: 'liao', sprite: 'char_liao', text: '（一把按住你的记录单）不行。可疑过敏史必须记，预防用药必须用，抢救车必须到位——**预案摆在那儿不是装点门面的**。秦主任，我按可疑过敏史准备了啊。', next: 'ds_14' },
  ds_14: { speaker: 'sys', text: '消毒、铺巾、局麻。秦放从右侧手腕穿刺桡动脉，导丝导管一气呵成。你的战场在控制区：床、机架、剂量、采集。', sprite: 'char_qin', card: 'dsa_contrast', next: 'ds_15' },
  ds_15: { speaker: 'liao', sprite: 'char_liao', text: '（低声）趁打造影剂之前，给你讲个导管室的命根子：**减影**。打造影剂前先采一张空图，叫蒙片；打了造影剂再采，两张图一减——骨头肌肉全消掉，只剩血管。', card: 'dsa_subtract', next: 'ds_16' },
  ds_16: { speaker: 'liao', sprite: 'char_liao', text: '所以最怕病人动。蒙片和活片对不齐，减出来就是一团花。**秦主任喊「屏气」，你就要在那个瞬间踩下去**，早半秒晚半秒都不行。', next: 'ds_17' },
  ds_17: { speaker: 'qin', sprite: 'char_qin', text: '左冠。蜘蛛位——**LAO 加足位**，把左主干分叉摊开。机架打到位叫我。', next: 'ds_18' },
  ds_18: { speaker: 'sys', text: '你摇动 C 型臂：左前斜 45°、足位 30°。屏幕上的心脏影像转到一个别扭的角度——但左主干的根部，清清楚楚摊开了。', card: 'dsa_angles', next: 'ds_p1' },
  ds_p1: { speaker: 'qin', sprite: 'char_qin', text: '好。**「屏气——采！」**', pedal: { durationMs: 2600, windowStart: 0.66, windowEnd: 0.78, success: 'ds_p1_ok', tooEarly: 'ds_p1_early', tooLate: 'ds_p1_late', dose: 150, failDose: 150 }, next: 'ds_p1_late' },
  ds_p1_early: { speaker: 'sys', text: '踩早了——病人还没屏住气，蒙片和活片错开半格，血管边缘糊成毛边。秦放没说话，你也知道：**重采，剂量加倍**。', dose: 150, next: 'ds_p1' },
  ds_p1_late: { speaker: 'sys', text: '踩晚了——充盈峰已经过去，血管显影淡淡的。秦放瞥了一眼剂量表：「再来。」（重采，剂量增加）', dose: 150, next: 'ds_p1' },
  ds_p1_ok: { speaker: 'sys', text: '减影图像跳出来：骨骼消失了，左冠状动脉像一棵墨色的小树——**左主干干干净净，前降支近段却齐刷刷地断了**。就是这里。', image: 'img_dsa_stenosis', next: 'ds_19' },
  ds_19: { speaker: 'qin', sprite: 'char_qin', text: '前降支近段，闭塞。罪犯血管找到了。再打个右冠看看。', image: 'img_dsa_stenosis', next: 'ds_20' },
  ds_20: { speaker: 'liao', sprite: 'char_liao', text: '（低声）看你刚才盯着剂量表——对，**透视是手电筒，电影采集是探照灯**，剂量差十几倍。透视够看就不开电影，这是跟台的规矩。', card: 'dsa_fluoro_cine', next: 'ds_p2' },
  ds_p2: { speaker: 'qin', sprite: 'char_qin', text: '右冠，LAO 正位。**「屏气——采！」**', pedal: { durationMs: 2400, windowStart: 0.58, windowEnd: 0.69, success: 'ds_p2_ok', tooEarly: 'ds_p2_early', tooLate: 'ds_p2_late', dose: 140, failDose: 140 }, next: 'ds_p2_late' },
  ds_p2_early: { speaker: 'sys', text: '早了半拍，膈肌还在动，图像花了。重来。（剂量增加）', dose: 140, next: 'ds_p2' },
  ds_p2_late: { speaker: 'sys', text: '晚了，造影剂已经排空一半。秦放：「脚踩稳。」（重采，剂量增加）', dose: 140, next: 'ds_p2' },
  ds_p2_ok: { speaker: 'sys', text: '右冠显影完美——**血流通畅，没有明显狭窄**。所有火力集中在前降支。', image: 'img_dsa_normal', next: 'ds_21' },
  ds_21: { speaker: 'sys', text: '导丝准备通过闭塞段。就在这时，小廖的声音从床头传来，不高，但整个手术间的空气瞬间绷紧了——', next: 'ds_22' },
  ds_22: { speaker: 'liao', sprite: 'char_liao', text: '秦主任，**病人脸上起风团了，血压 88/56，往下掉**。', sfx: 'buzz', next: 'ds_23' },
  ds_23: { speaker: 'sys', text: '【对比剂反应先兆。你手头能做的三件事，先做什么？】', sprite: 'char_liao', sprite2: 'char_qin', choices: [
    { text: '立刻停对比剂注射，同时呼叫秦主任确认', next: 'ds_24a', effect: { skill: 1 }, tag: 'good' },
    { text: '先推抢救车到床尾备好', next: 'ds_24b' },
    { text: '盯着监护仪再观察半分钟', next: 'ds_24c' },
  ]},
  ds_24a: { speaker: 'sys', text: '「停！」你切断高压注射器的瞬间，秦放已经回头看监护。肾上腺素、补液、吸氧——预案一条一条走，像排练过一百遍。四分钟后，血压回升到 102/68。', next: 'ds_25' },
  ds_24b: { speaker: 'sys', text: '你转身去推抢救车——「先停对比剂！」秦放头也不抬地喝了一声。你赶紧先切断注射，再推车。**顺序错了，好在只慢了几秒**。肾上腺素、补液、吸氧，四分钟后血压回升。', next: 'ds_25' },
  ds_24c: { speaker: 'sys', text: '「观察什么？停对比剂！」秦放的声音第一次抬高。小廖已经伸手切断了注射。**在导管室，先兆不是拿来观察的，是拿来掐断的**。肾上腺素、补液、吸氧，四分钟后血压回升。', effect: { skill: -1 }, next: 'ds_25' },
  ds_25: { speaker: 'qin', sprite: 'char_qin', text: '稳住了。继续。——导丝过了，准备球囊。', next: 'ds_26' },
  ds_26: { speaker: 'sys', text: '球囊到位。秦放看了你一眼：「机器怎么样？」你看了眼控制台——**球管热容量 92%，红色预警**在闪。连续透视加四次电影采集，球管快烧了。', sfx: 'buzz', next: 'ds_27' },
  ds_27: { speaker: 'sys', text: '【热容量 92%，术者正等着。怎么办？】', sprite: 'char_qin', choices: [
    { text: '「秦老师，球管到限了，给我 40 秒散热。」', next: 'ds_28a', effect: { skill: 1 }, tag: 'good' },
    { text: '不吭声，硬撑着继续', next: 'ds_28b' },
  ]},
  ds_28a: { speaker: 'sys', text: '秦放嘴里骂了一句听不清的，手却停下来等着。40 秒后热容量掉到 78%。**老伙计教过你的热容量，在全县最贵的机器上救了场**。', event: 'dsa_first', next: 'ds_29' },
  ds_28b: { speaker: 'sys', text: '你咬牙没吭声。二十秒后，「嘀——」**球管热保护，自动停机**。整个手术间安静得可怕，所有人站着等机器冷却，一分钟像一个世纪。秦放没骂你，这比骂还难受。', event: 'dsa_first', dose: 60, next: 'ds_29' },
  ds_29: { speaker: 'qin', sprite: 'char_qin', text: '球囊扩了。支架到位——释放后打一次造影确认位置。**「屏气——采！」**', pedal: { durationMs: 2200, windowStart: 0.64, windowEnd: 0.75, success: 'ds_p3_ok', tooEarly: 'ds_p3_early', tooLate: 'ds_p3_late', dose: 140, failDose: 140 }, next: 'ds_p3_late' },
  ds_p3_early: { speaker: 'sys', text: '早了，支架边缘还没完全展开就采了，位置看不确切。秦放：「再一次。」（重采，剂量增加）', dose: 140, next: 'ds_29' },
  ds_p3_late: { speaker: 'sys', text: '晚了，错过了最佳充盈。只能再来一次。（剂量增加）', dose: 140, next: 'ds_29' },
  ds_p3_ok: { speaker: 'sys', text: '支架贴壁良好。最后一次造影，看血流——', next: 'ds_30' },
  ds_30: { speaker: 'qin', sprite: 'char_qin', text: '终末造影。**「屏气——采！」**', pedal: { durationMs: 2000, windowStart: 0.68, windowEnd: 0.79, success: 'ds_p4_ok', tooEarly: 'ds_p4_early', tooLate: 'ds_p4_late', dose: 130, failDose: 130 }, next: 'ds_p4_late' },
  ds_p4_early: { speaker: 'sys', text: '早了。秦放难得地叹了口气：「最后一哆嗦了，稳住。」（重采，剂量增加）', dose: 130, next: 'ds_30' },
  ds_p4_late: { speaker: 'sys', text: '晚了。小廖轻声给你打气：「没事，再来。」（重采，剂量增加）', dose: 130, next: 'ds_30' },
  ds_p4_ok: { speaker: 'sys', text: '屏幕上，血流重新灌进前降支，墨色的树枝一路亮到末梢——**TIMI 3 级，通了**。墙上的计时器停在 **62 分钟**。', image: 'img_dsa_stent', next: 'ds_31' },
  ds_31: { speaker: 'sys', text: '拔鞘、压迫止血、包扎。平车推出导管室的时候，等在门口的家属没有哭也没有问，只是冲着所有人深深弯下腰，说了一句很轻的「谢谢」。', next: 'ds_32' },
  ds_32: { speaker: 'qin', sprite: 'char_qin', bg: 'bg_cathlab', text: '（摘了手套，从更衣柜顶摸出两罐可乐，扔给你一罐）手挺稳。下次 STEMI 夜班，还叫你。', next: 'ds_33' },
  ds_33: { bg: 'bg_corridor', speaker: 'sys', text: '凌晨两点。你抱着可乐走出导管室，走廊尽头有个熟悉的身影正蹲在 CT 机房门口，拿着卷尺和本子写写画画。', next: 'ds_34' },
  ds_34: { speaker: 'kai', sprite: 'char_kai', sfx: 'vox_kai', bg: 'bg_corridor', text: '哟，夜班老师！是我，阿凯。别误会啊——新 CT 装机前勘测，电源容量、楼板承重、防护评价，前期都得摸清楚。白天人多碍事，我寻思夜里来量。', next: 'ds_35' },
  ds_35: { speaker: 'me', text: '（你忽然想起半年前——他在小卖部附近打听「夜班谁说了算」，当时你还警觉了好一阵。）', sprite: 'char_kai', next: 'ds_36' },
  ds_36: { speaker: 'kai', sprite: 'char_kai', text: '哈哈，那事儿啊！踩点呗——**单子签下来之前，得摸清机器夜里归谁管、出了毛病找谁、多久能修好**，这些都进维保报价的。老范那顿饭也是我请的，职业病，见笑了。', event: 'dsa_kai', effect: { flag: 'kai_truth' }, next: 'ds_37' },
  ds_37: { speaker: 'sys', text: '他撕下一页勘测单复印件塞给你：「留个纪念——你们的新伙计，年底就到。」小廖这时也换好衣服出来，听见你们聊天，插了一句：', sprite: 'char_kai', next: 'ds_38' },
  ds_38: { speaker: 'liao', sprite: 'char_liao', bg: 'bg_corridor', text: '都说我们导管室奖金高，顶你们仨月——**可我们吃的射线，也顶你们仨月**。行了，都回去睡吧，明早太阳照常升起。', next: 'ds_39' },
  ds_39: { speaker: 'sys', text: '铅衣交还，打卡机「咔哒」。你看了看自己的手——踩了一晚上踏板，虎口还在微微发麻。', effect: { badge: 'dlc_dsa_done', gold: 180 }, end: true },
}

export const DLC_DSA: DlcDef = {
  id: 'dsa',
  icon: '🫀',
  title: '番外篇 · DSA 导管室',
  subtitle: '跟台',
  desc: '2025年夏末 · 一台急性心梗急诊介入的完整跟台：减影、剂量、屏气口令与热容量',
  minutes: '约 15~20 分钟',
  start: 'ds_0',
  steps: DS_STEPS,
}

export const DLCS: DlcDef[] = [DLC_DR, DLC_DSA]

export function getDlc(id: string): DlcDef | undefined {
  return DLCS.find(d => d.id === id)
}
