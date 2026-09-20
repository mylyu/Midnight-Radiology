import type { GameState, Step } from './types'
import type { KnowledgeCard, ChronicleEvent, Evidence } from './dlc'

/* ================= 第二章「快与狠」· CT篇 =================
 * 故事时间：2025年11月，新CT启用初期，五个值班跨约十天。
 * 结构：夜1「新机」→ 白2「窗口」→ 夜3「快」→ 白4「狠」→ 夜5「值守」→ 晨会考核
 * 进度存于 GameState.dlc['ch2']（含 shift 字段记录当前班次）
 * ========================================================== */

export interface Ch2Shift {
  id: string
  icon: string
  title: string
  subtitle: string
  kind: 'night' | 'day' | 'quiz'
  start: string
  steps: Record<string, Step>
}

export const CH2_META = {
  id: 'ch2',
  icon: '🌀',
  title: '第二章 · 快与狠',
  subtitle: 'CT 篇',
  desc: '2025年11月 · 新CT启用初期：窗宽窗位、卒中绿道、增强专场，和一只被打开的封条柜',
  minutes: '约 40~60 分钟',
}

/* ================= 第二章口令解锁（与第一章进度脱钩；解锁状态存在本机，独立于存档） ================= */
export const CH2_PASSWORD = 'ct2258'
// Chapter-specific aliases preserve Chapter 1 assets and existing saved sprite keys.
export const CH2_PORTRAITS: Record<string, string> = {
  char_zhou: 'ch2_pixel_char_zhou',
  char_director: 'ch2_pixel_char_director',
  char_duty: 'ch2_pixel_char_duty',
  char_fan: 'ch2_pixel_char_fan',
  char_he: 'ch2_pixel_char_he',
  char_kai: 'ch2_pixel_char_kai',
  char_lei: 'ch2_pixel_char_lei',
  char_tang: 'ch2_pixel_char_tang',
  char_wen: 'ch2_pixel_char_wen',
  char_m: 'ch2_pixel_char_m',
  char_f: 'ch2_pixel_char_f',
  char_luzhou_m: 'ch2_pixel_char_luzhou_m',
  char_luzhou_f: 'ch2_pixel_char_luzhou_f',
  pat_grandpa2: 'ch2_pixel_pat_grandpa2',
  pat_gut: 'ch2_pixel_pat_gut',
  pat_kiddad: 'ch2_pixel_pat_kiddad',
  pat_mystery: 'ch2_pixel_pat_mystery',
  pat_stone: 'ch2_pixel_pat_stone',
  pat_uncle2: 'ch2_pixel_pat_uncle2',
  pat_kid6: 'ch2_pixel_pat_kid6',
  pat_kidmom: 'ch2_pixel_pat_kidmom',
  pat_kidmom_holding: 'ch2_pixel_pat_kidmom',
}

export function ch2PortraitAsset(key: string, gender: 'm' | 'f'): string {
  const resolved = key === 'me' ? `char_${gender}` : key === 'luzhou' ? `char_luzhou_${gender}` : key
  return CH2_PORTRAITS[resolved] ?? resolved
}

/* 剧情内不再重复显示AI/教学模拟来源图注（2026-09-20 裁定，与腕部口径统一；学生已知游戏由AI制作）。
 * 生成来源、提示词与哈希仍保留在 docs/ch2-visual-generation.json 与 docs/ch2-visual-refresh.md。 */
export const CH2_IMAGE_CAPTIONS: Record<string, string> = {}
const CH2_UNLOCK_KEY = 'mr-ch2-unlock'

export function ch2Unlocked(): boolean {
  try { return localStorage.getItem(CH2_UNLOCK_KEY) === '1' } catch { return false }
}

export function tryUnlockCh2(input: string): boolean {
  // 归一化：去空白、转小写、全角英数转半角
  const norm = input.trim().toLowerCase().replace(/[！-～]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
  if (norm !== CH2_PASSWORD) return false
  try { localStorage.setItem(CH2_UNLOCK_KEY, '1') } catch { /* 隐私模式下本局有效 */ }
  return true
}

/* ================= 第二章勋章（15枚） ================= */
export const CH2_BADGES: Record<string, { name: string; icon: string; desc: string; hidden?: boolean }> = {
  first_ct: { name: '首扫', icon: '🌀', desc: '在新CT上完成第一例夜班急诊扫描' },
  window_master: { name: '窗宽窗位大师', icon: '🎚️', desc: '窗口教学关两个阶段都在两次内调到目标窗' },
  queue_tamer: { name: '队列调度员', icon: '🚦', desc: '白班队列零「等太久」事件' },
  phantom_friend: { name: '体模之友', icon: '🧪', desc: '帮陆舟完成体模实验，并坚持把数据的事摆上流程' },
  dnt_hero: { name: 'DNT英雄', icon: '⏱️', desc: '卒中绿道之夜，DNT 52分钟达标' },
  cool_head: { name: '冷静头脑', icon: '🧊', desc: '绿道抢时间时仍选择重扫一张能签字的图' },
  checklist_zero: { name: '零遗漏', icon: '✅', desc: '增强专场上午核对清单六格全绿、零漏项' },
  allergy_save: { name: '过敏处置专家', icon: '💉', desc: '对比剂过敏反应分级处置正确' },
  gatekeeper: { name: '数据守门人', icon: '🛡️', desc: '数据回传摊牌时选择先断网审计、立规矩' },
  alara_guard: { name: 'ALARA卫士', icon: '🧒', desc: '儿童复查纠纷中先调外院DICOM，让病情说话' },
  night_keeper2: { name: '守夜人 · 二代', icon: '🌙', desc: '完成第一个独立值守的CT夜班' },
  night_snack: { name: '夜班搭子', icon: '🍢', desc: '深夜请小何吃了一顿关东煮，换来一条陈年八卦' },
  wrench_night: { name: '夜班机修', icon: '🔧', desc: '报修并整理日志，把第217号通道报警交给工程师核查' },
  dose_guard: { name: '剂量卫士', icon: '📟', desc: '分清工作人员剂量计与患者检查记录，向家属解释儿童方案' },
  phase_eye: { name: '期相之眼', icon: '👁️', desc: '三期增强图像连续两幅一眼认出期相' },
}

/** Text-only recollection: never invent a first-chapter choice absent from the save. */
export function ch2StepForState(id: string, step: Step, state: Pick<GameState, 'flags' | 'badges' | 'gender' | 'finished'>): Step {
  const { flags, badges } = state
  let text = step.text
  if (id === 'c2n1_b5b' && badges.includes('fixer')) text = '上回老机器你敢动手，这台可别照着拆。名片拿着，先打电话——我也怕你拆出一箱多余螺丝。'
  if (id === 'c2n1_b6' && flags.kai_friend) text = '小凯推着箱子又折回来：「去年你跟完保养流程，记得挺细。这回我把技术支持的联系人也给你，重建配置的问题找得到人。」'
  if (id === 'c2n3_a2' && flags.wen_card) text = '去年那张名片还在吧？下次别在走廊堵我，直接打电话。（她递过维保草案）球管计价和封顶条件都在这儿，重建软件的许可页也带了，设备科得一起看。'
  if (id === 'c2n3_x4') {
    if (flags.mystery_told) text = '您去年问的那只1998年片袋，我还记着。档案没跟机器一起处理，不过那张片子是谁的，还没核实。'
    else if (state.finished) text = '您还在找父亲的旧片吧？换机器没有把档案丢掉。身份没核清的材料，我这边还不能直接交给您。'
    else if (flags.mystery_asked) text = '您去年问过旧片库，我记得。换机器没有把旧档案丢掉。您还是想找家人的片子？'
  }
  if (id === 'c2n3_x5' && flags.mystery_told) text = '我知道，没认准，不能算找着了。（他松开捏皱的申请单）今天先看我的头痛吧……如果片子没事，是不是我就真没事了？'
  if (id === 'c2n5_a1' && flags.archive_sealed) text = '去年你在书架后面看见的柜子还在。封条仍是1999年1月，「……周……存」的字更淡了。老周把纸袋搁在柜顶：「这次不用隔着门猜了。」'
  if (id === 'c2d2_n4' && state.gender === 'f') text = '你和陆舟把水箱体模、线对卡体模依次摆好，按实验单完成三组采集。检查床退了出来，她把箱子抱回推车。'
  if (id === 'c2n5_p2d' && state.gender === 'f') text = '她秒回了一个抱拳的表情。凌晨两点十七分，这座县城里还有两个没睡的人。'
  return text === step.text ? step : { ...step, text }
}

/* 旧版停颁（第四班病例替换后不再发放）：保留定义与老存档记录，不计入收集分母。 */
export const CH2_BADGES_LEGACY: string[] = ['checklist_zero', 'allergy_save', 'phase_eye']
export const CH2_ACTIVE_BADGES: string[] = Object.keys(CH2_BADGES).filter(id => !CH2_BADGES_LEGACY.includes(id))

/* ================= 第二章知识卡片（22张） ================= */
export const CH2_CARDS: Record<string, KnowledgeCard> = {
  ct_tube_heat: {
    title: '球管预热（CT版）',
    body: 'CT球管曝光前，灯丝要先烧到工作温度——这就是预热程序。冷机器直接上大条件曝光，灯丝和靶面都吃亏。每天开机先做日检预热，机器闲置几小时后再扫病人，也要先补一次预热。这两分钟不是走过场，是球管的起床操。',
    image: 'ct_phantom',
  },
  ct_tomography: {
    title: '断层 vs 重叠：CT的本质',
    body: '平片把三维人体压成一张二维影子，所有结构叠在一起；CT用一圈投影算出每个体素的衰减系数，把人体一层一层「切开」看。重叠消失了，藏在颅骨后面的出血无处遁形——这是从「影子」到「断层」的质变。',
    image: 'ct_head_normal',
  },
  hu_scale: {
    title: 'CT值：HU标尺',
    body: 'CT值 = 1000×(μ−μ水)/μ水，单位HU（亨氏单位）。水正好是0，空气接近-1000，骨700~3000；凝固血块56~76，脑灰质36~46，脑白质22~32，脂肪-80~-100。每个像素从「黑不黑」变成一个数——CT因此可以定量。',
    image: 'ct_head_hema',
  },
  plain_first: {
    title: '急症头颅先平扫',
    body: '新鲜出血在平扫上就是白亮的高密度影，不用打药就一目了然；增强要核对禁忌、要扎针推药，绿道病人等不起。急症头颅先平扫——这是写进流程的铁规矩。',
    image: 'ct_head_hema',
  },
  brain_window: {
    title: '窗宽窗位：脑窗找出血',
    body: '人眼只能分辨几十级灰，CT数据却横跨四千个灰阶。窗口技术把选中的一段CT值拉满整个灰阶显示：窗宽是这段范围的上下限之差，窗位是它的中心。脑窗WW80/WL30看脑实质；硬膜下窗WW130/WL65把血和脑之间二三十个单位的差别拉到最大。',
    image: 'ct_head_hema',
  },
  helical_intro: {
    title: '螺旋扫描与螺距',
    body: '滑环让球管连续旋转，扫描床同时匀速前进，X线轨迹绕病人画出一条螺旋——一圈扫出一整个部位的容积数据。螺距 = 旋转一周进床距离 ÷ 探测器宽度：高螺距扫得快、剂量低，但层面靠插值、图像糙；低螺距慢而细。绿道抢时间用高螺距，精细评估再补小螺距。',
    image: 'ct_phantom',
  },
  slice_partial: {
    title: '层厚与部分容积效应',
    body: '一个体素里装了什么，CT值就显示它们的平均值——5mm层厚里混进一半正常组织，6mm的小结节就被「平均」没了，时有时无。小病灶复查必须薄层：这是部分容积效应给临床上的紧箍咒。',
    image: 'ct_lung',
  },
  window_advanced: {
    title: '窗口进阶：骨窗/肺窗/腹窗',
    body: '同一组CT数据，换窗如换眼镜：骨窗WW4000/WL250让骨皮质纤毫毕现，肺窗WW1500/WL-500看肺纹理，腹窗WW350/WL0让肝脾肠子各归各位，CTA窗WW450/WL150看亮起来的血管。拿错窗，等于戴着墨镜找针。',
    image: 'ct_abdomen',
  },
  fbp_iterative: {
    title: 'FBP vs 迭代重建',
    body: '直接反投影把每条投影原路「抹」回去，角度再多也糊着星状伪迹；FBP先在频域乘|ρ|做高通滤波补回高频，再反投影——快、稳、一步出图。迭代重建（IR）「猜图→模拟投影→比对→差值修正」来回几十轮，用算力把噪声磨下去，是低剂量CT的底气。',
    image: 'img_sinogram',
  },
  stroke_dnt: {
    title: 'DNT：时间就是大脑',
    body: 'Door-to-Needle Time，入院到溶栓给药的时间。缺血性卒中每耽误一分钟，190万个神经元死亡；CT排出血是溶栓的前提，影像科是这条链上的第一环——DNT的时钟从病人进门那一刻就在走。',
    image: 'ct_head_stroke',
  },
  stroke_ct_sign: {
    title: '卒中CT：致密动脉征',
    body: '急性卒中平扫除了排出血，还要看血管：被血栓堵住的大脑中动脉密度比周围高，像一条隐约发白的带子——「致密动脉征」。它不是用来背的征象，是CTA该往哪儿看的指路牌。',
    image: 'ct_head_stroke',
  },
  cta_intro: {
    title: 'CTA：跟着药峰走',
    body: '经静脉团注碘对比剂，球管追着药峰扫动脉——CT血管成像让堵住的血管现形。扫描时机就是一切：早了药没到，晚了药走了。找到责任血管，取栓绿道才有目标。',
    image: 'ct_cta',
  },
  contrast_agent: {
    title: '碘对比剂：让血管亮起来',
    body: '碘原子序数53，高密度、强吸收，打进血管，血管和富血供病灶瞬间「亮」起来。现用的非离子型碘剂（优维显、欧乃派克）比老式离子型温和得多。三期增强：药先进动脉（动脉期），约40秒后经门静脉灌进肝（门脉期），再慢慢从病灶退出（延迟期）——时间本身就是诊断：肝癌「快进快出」，动脉期亮起、门脉期转淡；血管瘤「快进慢出」，又称「早出晚归」，动脉期边缘结节样强化，逐帧向心填充，延迟期仍滞留。',
    image: 'ct_liver_enhanced',
  },
  contrast_checklist: {
    title: '增强检查：团队分工',
    body: '是否增强及具体方案由医师结合病情与风险判断，注射与监护由相应医护人员负责。BME学习重点是设备如何采集、重建并可靠地显示信息；不能用点亮几格清单代替临床评估。',
  },
  contrast_contra: {
    title: '增强检查：不是单项判定',
    body: '单个肾功能数值、用药名称或甲状腺化验结果，不能直接换算成“能做／不能做”。医师需综合急迫程度、肾功能变化及其他风险，决定方案。游戏不提供停药、延期或用药指令。',
  },
  contrast_emergency: {
    title: '异常反应：及时呼叫医护',
    body: '检查中出现不适，应立即告知负责医护，按医院流程评估处理。BME实习生不独立判断药物或剂量；本游戏不能作为急救操作指南。',
  },
  dose_ct: {
    title: 'CT剂量：看得见的账',
    body: '每次CT扫描结束，机器都出具剂量报告。剂量管理的意义不在背数字，而在把账摆上台面：给家属出示报告、儿童协议按体重自动压输出、迭代重建在低剂量下保住图像质量——该省的一分不多给，该看的一层不能少。',
    image: 'ct_phantom',
  },
  child_ct: {
    title: '儿童CT：正当化与ALARA',
    body: '儿童对辐射更敏感，正当化更严格：能用旧片不新扫，能扫一遍不扫两遍——三天内的外院DICOM先调出来读。但另一条同样硬：有明确指征时，恐慌不能代替病情做决定。让病情说话，不让恐慌说话。',
    image: 'ct_head_child',
  },
  stone_plain: {
    title: '结石平扫为王',
    body: '泌尿系结石的CT值几百到上千HU，比软组织白出几个量级，平扫上藏都没处藏——绞痛加血尿，平扫五分钟见分晓。增强反而添乱：对比剂排进肾盂输尿管，白花花一片，小结石直接淹死在里面。影像给的不只是「有没有」，还有位置、大小、梗阻程度——泌尿外科拿着这三样就能定方案。',
    image: 'ct_kidney_stone',
  },
  cta_vs_dsa: {
    title: '冠脉CTA vs 冠脉造影',
    body: '同一个问题，两把刀。冠脉CTA：静脉团注碘对比剂，球管追着药峰扫动脉——无创、几分钟、全图，三支冠脉、桥血管、钙化积分一目了然，是中低危胸痛的「地图」。冠脉造影（DSA）：穿刺置管进导管室，实时减影看血流——金标准，还能当场球囊扩张、放支架，是有创的「施工现场」。先无创摸底、再有创兜底，是顺序，不是重复；STEMI那样分秒必争的高危，则直接导管室。',
    image: 'ct_coronary_cta',
  },
  ring_artifact: {
    title: '环状伪影：探测器的年轮',
    body: '均匀水箱体模上扫出一圈圈同心圆，圆心正好是机架旋转中心——这是环状伪影：某个探测器通道的校准值漂移了，它每转一圈，就在图像上画一个圆。体模是「标准答案」，标准答案答错了，就是机器出了问题。发现它靠每天两分钟的日检，定位它靠DAS日志——这正是日检体模存在的意义。',
    image: 'ct_water_ring_teaching',
  },
  old_book_note: {
    title: '图谱里的书签',
    body: '二手《医学影像学》里夹着的旧书签，褪色钢笔字：「窗口调到病灶上，功夫下在病人前。」落款一个「周」字，1999年。这本书的前主人，把一辈子的手感写在了页边上。',
    image: 'item_book',
  },
}

/* 旧版停颁（增强专场被替换后不再发放）：保留定义与老存档记录，不计入收集分母。 */
export const CH2_CARDS_LEGACY: string[] = ['contrast_agent', 'contrast_checklist', 'contrast_contra', 'contrast_emergency']
export const CH2_ACTIVE_CARDS: string[] = Object.keys(CH2_CARDS).filter(id => !CH2_CARDS_LEGACY.includes(id))

/* ================= 第二章大事记（8条） ================= */
export const CH2_EVENTS: Record<string, ChronicleEvent> = {
  ch2_ct_open: { time: '2025年11月', title: '新CT启用', body: '批文走了一年、全院等了快两年的新CT临床启用。登记本换成扫码枪，老周说：电子的好，一页都不会少。' },
  ch2_registration: { time: '2025年11月', title: '少掉的登记页', body: '老周承认2024年为无证件老人检查后撕页，主任承担后续程序未落实的责任。临时身份、报告追踪与困难救助有了明确承接人，不再靠谁私下点头。' },
  ch2_first_scan: { time: '2025年11月', title: '夜班首扫', body: '坠床老人，硬膜下血肿，从进门到出图十一分钟。新机器的第一晚就派上了用场。' },
  ch2_luzhou: { time: '2025年11月', title: '陆舟来院', body: '本科室友陆舟跟导师做低剂量重建科研，来院做体模实验。临别留下一问：厂家拿数据一句话的事，我们做科研走流程走了半年——这公平吗？' },
  ch2_stroke: { time: '2025年11月', title: '卒中绿道之夜', body: '房颤老人深夜卒中：运动伪影重扫、平扫排血、CTA锁定M1闭塞，DNT 52分钟达标——这条命留在了县里。' },
  ch2_mystery: { time: '2025年11月', title: '神秘病人第二诊', body: '每年11月准时报到的男人做了新CT：干干净净。他接过片袋问：「老机器的数据，还在吗？」' },
  ch2_data_showdown: { time: '2025年11月', title: '数据回传摊牌', body: '小雷在质控样本中发现未清除的患者标识。会上叫停样本外传；玩家可主张整改服务、离线维保或完整断网审计。' },
  ch2_cabinet: { time: '2025年11月', title: '封条柜开启', body: '科里保管的半钥匙与老周找回的一半合齐。柜内是教学片、手写笔记和1997年合影，照片中年轻的老周抱着本子，站在最边上。' },
  ch2_solo: { time: '2025年11月', title: '独立值守', body: '老周交出整夜夜班主值职责，返聘带教与备班仍在。你完成交班，和他、小唐去吃早饭。' },
}

/* ================= 第二章证物（6件） ================= */
export const CH2_EVIDENCE: Record<string, Evidence> = {
  maintenance_draft: { title: '维保合同草案', body: '雯雯留下的草案页：球管按曝光次数阶梯计价、超支部分封顶。她说：球管是耗材，不是固定资产，不这么写你们迟早吃亏。', image: 'ev_maintenance_draft', flag: 'maintenance_draft' },
  phantom_log: { title: '体模实验记录', body: '陆舟留下的实验记录：水箱与线对卡体模、三组参数的扫描数据。「归你们科存档，说不定哪天质控用得上。」', image: 'ct_phantom', flag: 'phantom_log' },
  remote_proposal: { title: '远程质控服务方案', body: '厂家彩页：设备运行数据、图像质量参数自动回传云端，免费。附件三写着「乙方有权使用脱敏后数据」——「脱敏后」三个字，由他们自己定义。', image: 'ev_remote_proposal', flag: 'remote_proposal' },
  old_register: { title: '老周的手写笔记', body: '封条柜内的教学笔记，留着改错的线图与批注。不是2024年少页的登记簿；后者已另行核查。', image: 'ev_ch2_teaching_archive', flag: 'old_register' },
  nameless_films: { title: '封存的教学片', body: '1999年1月封存前整理的教学片与旧设备照片，按教学编号归档。并非每年11月的匿名患者片袋，也不能据此确认寻父线索。', image: 'ev_ch2_teaching_archive', flag: 'nameless_films' },
  ch2_team_photo: { title: '1997年的科室合影', body: '教学资料里的科室合影，最边上抱本子的年轻人是老周。没有被刮掉的脸。旧存档的照片收藏记录仍保留。', image: 'ev_ch2_team_1997', flag: 'old_register' },
}

/** 每个剧情班次解锁4页；晨会/通关解锁全部。旧存档直接按班次推导。 */
export function ch2BookUnlocked(shiftId?: string, completed = false): number {
  const shifts = ['c2n1', 'c2d2', 'c2n3', 'c2d4', 'c2n5', 'c2am']
  const index = Math.max(0, shifts.indexOf(shiftId ?? 'c2n1'))
  return completed ? 20 : Math.min(20, (index + 1) * 4)
}

/* ================= 值班室旧书 · 《CT夜班二十页》（每班逐步解锁） ================= */
export const CH2_BOOK_PAGES: { title: string; body: string; note: string }[] = [
  {
    title: '第1页 · 把水定为0的人——CT值与亨氏单位',
    body: 'CT值把「黑不黑」变成一把尺：以水为0，空气约-1000，骨头700往上能到3000。夜班要背的就几个数：凝固血56~76，脑灰质36~46，脑白质22~32，脂肪-80~-100。血只比脑白那么二三十个单位——窗口不调好，这点差别就淹死在灰色里。',
    note: '页边钢笔字：「数字是给人看的，窗口是给数字看的。」',
  },
  {
    title: '第2页 · 窗口口诀——「脑窄骨宽肺更低」',
    body: '脑窗80/30，骨窗4000/250，肺窗1500/-500，硬膜下窗130/65，CTA窗450/150。窗宽是放大范围的上下限之差，窗位是这段的中心。拿错窗等于戴错眼镜：骨窗看肚子一片死白，肺窗看肚子一团漆黑。',
    note: '页边钢笔字：「先想看清什么，再调窗。」',
  },
  {
    title: '第3页 · 正弦图与Radon——CT的原始数据长什么样',
    body: '探测器在每个角度收到一排投影值，按角度排开就是正弦图（sinogram）：一个亮点绕一圈，画一条正弦曲线。1917年Radon证明：二维分布函数由它的全部线积分唯一确定。采集是Radon正变换，重建是逆变换——CT是一台解数学题的机器。',
    note: '页边钢笔字：「看不懂的那页别扔——工科生都学过。」',
  },
  {
    title: '第4页 · 回抹出来的雾——直接反投影与|ρ|滤波',
    body: '把每条投影原路抹回去，角度再多图像也糊，亮点周围拖出星状尾巴——反投影先天丢高频。滤波反投影（FBP）先在频域乘|ρ|把高频补回来再回抹，边缘立刻锐利。Ram-Lak轮廓最锐利但怕噪声，Shepp-Logan抗噪好但分辨率让一点——所以看骨用锐利核，看软组织用平滑核。',
    note: '页边钢笔字：「分辨率与信噪比，永远拿一个换另一个。」',
  },
  {
    title: '第5页 · 迭代与AI——用算力换剂量',
    body: '迭代重建：先猜一幅图，模拟它投影出去该是什么样，跟实测投影比对，差值反投影回去修正，再猜再比——ART、SART、EM都是这条路上的。噪声被一轮轮磨下去，低剂量CT才有底气。但记住：降低剂量要以看清病变为前提。',
    note: '页边钢笔字：「看不清的便宜剂量，没有意义。」',
  },
  {
    title: '第6页 · 滑环——让球管转个不停的机关',
    body: '老式CT球管拖着电缆，转一圈得停下来倒回去，像拧毛巾。滑环把供电和信号都搬上环形电刷，球管从此可以朝一个方向不停地转——螺旋CT、快速容积扫描，全都站在这道工序上。它不起眼，但它是「快」的物理基础。',
    note: '页边钢笔字：「电缆会拧断，电刷不会。」',
  },
  {
    title: '第7页 · 螺距——进床速度与探测器宽度的比',
    body: '螺距 = 球管转一周床走的距离 ÷ 探测器宽度。螺距大，扫得快、剂量低，但层面数据靠插值补，图像发糙；螺距小，数据密、图像细，代价是慢。卒中绿道抢时间用高螺距，精细评估回头再补小螺距。',
    note: '页边钢笔字：「快和细，一个旋钮的两头。」',
  },
  {
    title: '第8页 · 多排探测器——转一圈，出一摞',
    body: '单排CT转一圈出一层，多层螺旋CT把探测器做成一排排的阵列，转一圈同时收好几层的数据。排数越多，同样范围扫得越快、层厚越薄、Z轴分辨率越高。64排往上，一个屏息就能扫完整个胸腹。',
    note: '页边钢笔字：「排数是扫出来的，不是吹出来的。」',
  },
  {
    title: '第9页 · 中心切片定理——投影与频域之间的桥',
    body: '某个角度投影的一维傅里叶变换，恰好等于图像二维傅里叶变换沿同角度过原点的一条切片。转着圈采投影，等于一根根辐条把频域填满——这就是傅里叶重建的根据，也是滤波反投影能「一步出图」的数学底气。',
    note: '页边钢笔字：「这页多看两遍，考试常考。」',
  },
  {
    title: '第10页 · 后处理三兄弟——MPR、MIP、VR',
    body: '容积数据扫完，图还没完：MPR把容积任意切面重新切出来，冠状位矢状位随手拉；MIP把每条射线上的最大值投出来，血管亮成一张地图；VR给组织赋颜色赋透明度，立体地摆在眼前。同一组数据，三种看法。',
    note: '页边钢笔字：「原始层存好，后处理随时能重做。」',
  },
  {
    title: '第11页 · 增强三期——快进快出与早出晚归',
    body: '对比剂先进动脉（动脉期），约四十秒后经门静脉灌肝（门脉期），再慢慢退出（延迟期）。肝癌「快进快出」：动脉期猛地亮，门脉期就淡了；血管瘤「快进慢出」，行话「早出晚归」：动脉期边缘结节样强化，逐帧向心填充，延迟期仍滞留。',
    note: '页边钢笔字：「时间轴，也是一把诊断的尺。」',
  },
  {
    title: '第12页 · 主动脉CTA——一组数据，多个切面',
    body: '碘对比剂增加血管内血液对X射线的衰减，帮助显示管腔。合适的强化时机与快速容积采集，让医师能够查看主动脉及相关分支。主动脉夹层可出现内膜片分隔真、假腔，需结合完整检查由医师判断。多平面重组使用已有容积数据，不是重新曝光；立体图不能代替原始薄层和多切面对照。',
    note: '病例回看：上午的血管细线，需要连续层面与不同切面共同确认。',
  },
  {
    title: '第13页 · 金属伪影——条纹不等于裂缝',
    body: '金属可造成射束硬化、光子不足等问题，在重建图像中形成明暗条纹，遮挡附近组织。调窗不能恢复缺失的测量信息；金属伪影校正也并非万能。可移除的外物或活动义齿应按要求移除，固定植入物不能自行拆动。是否补扫及补扫范围由团队评估，不因画面难看就整套重扫。',
    note: '病例回看：下午先追查条纹来源，再评估受影响区域，保留新旧图像。',
  },
  {
    title: '第14页 · CTA与DNT——卒中绿道上的两个钟',
    body: 'CTA：经静脉团注对比剂，球管追着药峰扫动脉，堵住的血管当场现形。DNT：入院到溶栓给药的时间，每耽误一分钟，190万个神经元死亡。平扫排出血、CTA找血管、通知溶栓——影像科是这条链上的第一环。',
    note: '页边钢笔字：「绿道上的每一分钟都有名字。」',
  },
  {
    title: '第15页 · 运动伪影——模糊是双方向的',
    body: '病人在扫描中动了，图像就拖出双方向的模糊影，和出血那种锐利边界的白亮完全两回事。处置按顺序来：先安抚制动，再缩短扫描时间（高螺距），实在不行用镇静。躁动的老人孩子，先想「怎么让他不动」，再想「怎么扫」。',
    note: '页边钢笔字：「伪影会撒谎，但谎话有口音。」',
  },
  {
    title: '第16页 · 剂量——ALARA：合理可行的最低',
    body: 'kV决定光子的穿透力，mAs决定光子的数量，两者一起决定剂量和噪声。剂量的规矩叫ALARA：As Low As Reasonably Achievable——合理可行的最低。小孩不是缩小的大人，条件要单独设；复查前先调旧片，能不照就不照。',
    note: '页边钢笔字：「『我担着』不是指征。」',
  },
  {
    title: '第17页 · 体模与日检——机器的每日早操',
    body: '水箱体模测CT值的准确性和均匀性，线对卡体模测空间分辨率。每天开机先扫体模：CT值漂移超过允许范围，今天的病人就先别上。机器不说谎，但它会漂移——日检就是每天校一次准。',
    note: '页边钢笔字：「质控不是形式，是校准真相。」',
  },
  {
    title: '第18页 · DICOM与PACS——片子的数字人生',
    body: 'DICOM不只是图像文件：像素之外还嵌着患者信息、扫描参数、设备型号一整套字段——外院光盘能原样调阅，靠的就是这套标准。PACS是影像的仓库和邮局：存储、调阅、分发。离开PACS谈无胶片化，是空谈。',
    note: '页边钢笔字：「头字段里的每一个字，都是病人的。」',
  },
  {
    title: '第19页 · 数据脱敏——出了院门的数据还是病人的',
    body: '把图像发出去之前，先问三个问题：姓名ID等直接标识去掉了吗？DICOM头里藏着的检查时间、设备信息清了吗？接收方拿去干什么、写没写进协议？「脱敏」两个字谁定义，数据就归谁定义——这条要写进合同。',
    note: '页边钢笔字：「数据出院门，规矩要先进门。」',
  },
  {
    title: '第20页 · 下一站——能谱CT与光子计数',
    body: '能谱CT用两种能量各扫一次，同一物质在两个能量下衰减不同，两个方程解两个未知数——碘和钙就此分家。光子计数探测器更进一步，直接数单个光子、读它的能量。CT这条路还长：看得更清，照得更少，永远是方向。',
    note: '页边钢笔字：「二十页写完了，机器才刚开机。——周」',
  },
]

/* ================= 窗宽窗位玩法：像素灰度 → HU 的分段线性映射 =================
 * 生成的CT素材把大部分灰阶花在软组织上（脑实质 g≈104~167），
 * 直接线性映射会把脑组织顶到窗外。以下锚点按素材实测直方图校准，
 * 让各教学预设窗（脑80/30、硬膜下130/65、肺1500/-500、腹350/0、骨4000/250）表现正确。 */
export const GRAY2HU: [number, number][] = [
  [0, -1000], [25, -800], [55, -80], [90, 0], [105, 15],
  [125, 32], [165, 50], [195, 65], [225, 150], [245, 400], [252, 1200], [255, 1500],
]

/** 灰度(0-255) → HU，分段线性插值 */
export function grayToHU(g: number, wristSimulation = false): number {
  // Synthetic display values only: generated PNGs cannot recover measured HU.
  // Wrist bone detail spans a wider gray range than the legacy brain assets.
  const anchors = wristSimulation ? WRIST_GRAY2HU : GRAY2HU
  if (g <= anchors[0][0]) return anchors[0][1]
  for (let i = 1; i < anchors.length; i++) {
    const [x1, y1] = anchors[i]
    if (g <= x1) {
      const [x0, y0] = anchors[i - 1]
      return y0 + ((g - x0) / (x1 - x0)) * (y1 - y0)
    }
  }
  return anchors[anchors.length - 1][1]
}

const WRIST_GRAY2HU: [number, number][] = [
  [0, -1000], [35, -120], [65, -60], [100, 40],
  [140, 180], [190, 700], [235, 1500], [255, 2000],
]

/* ================= 第1夜「新机」 ================= */
const C2N1: Record<string, Step> = {
  c2n1_0: { bg: 'bg_ctcontrol', speaker: 'sys', text: '2025年11月，晚上九点半。影像科走廊新刷了漆，CT室门口的红地垫还没踩脏。你在新打卡机前站了两秒——连打卡机都换了。', effect: { flag: 'c2_started' }, next: 'c2n1_1' },
  c2n1_1: { speaker: 'sys', text: '「咔哒」——打卡成功。', sfx: 'stamp', effect: { gold: 50, ap: 3 }, next: 'c2n1_2' },
  c2n1_2: { speaker: 'tang', sprite: 'char_tang', sfx: 'vox2_tang', text: '新同事！……哦不对，老员工！是我紧张——今晚是咱科新CT启用后第一个夜班，护士长叮嘱我三遍「别乌鸦嘴」。我什么都没说！', next: 'c2n1_3' },
  c2n1_3: { speaker: 'tang', sprite: 'char_tang', text: "厂家今天下午撤场，设备科和信息科刚交完班。去年说下个月就到，结果机房改造、交货、验收一拖再拖……这回可真开起来了。", next: 'c2n1_4' },
  c2n1_4: { speaker: 'zhou', sprite: 'char_zhou', sfx: 'vox2_zhou', text: '（不知何时出现在门口）说谁不出来。……新机器，新规矩：**今晚你拍，我看着**。以后反过来的日子，不远了。', next: 'c2n1_5' },
  c2n1_5: { speaker: 'me', sprite: 'char_zhou', text: '（顺着他目光看进CT室）机架的圆孔里亮着灯，像一只安静的眼睛。这就是批文走了一年、全院等了快两年的「大家伙」。', next: 'c2n1_6' },
  c2n1_6: { speaker: 'zhou', sprite: 'char_zhou', text: "老CT去年春天烧了球管，一直趴窝。停产配件没等来，倒等来这台新机。（他拍了拍你的肩）去年那张处置单，老范收着。开诊前去转转吧。", next: 'c2n1_hub' },
  c2n1_hub: { speaker: 'sys', text: '【自由行动 · 行动力⚡×3】', choices: [
    { text: '看看角落里的老伙计（⚡-1）', next: 'c2n1_ab1', cond: { notFlag: 'c2n1_a', flag: 'bai_tube', ap: 1 } },
    { text: '看看角落里的老伙计（⚡-1）', next: 'c2n1_an1', cond: { notFlag: 'c2n1_a', notFlag2: 'bai_tube', ap: 1 } },
    { text: '厂家撤场前交底 · 小凯（⚡-1）', next: 'c2n1_b1', cond: { notFlag: 'c2n1_b', ap: 1 } },
    { text: '值班室翻书《CT夜班二十页》', next: '@book2' },
    { text: '小卖部', next: '@shop' },
    { text: '走廊转转（⚡-1）', next: 'c2n1_e1', cond: { notFlag: 'c2n1_e', ap: 1 } },
    { text: '茶水间 · 小唐的夜班八卦（⚡-1）', next: 'c2n1_c1', cond: { notFlag: 'c2n1_c', ap: 1 } },
    { text: '【开诊】回到控制室', next: 'c2n1_m0', tag: 'good' },
  ]},
  // —— A. 老伙计（买了老白球管的分支） ——
  c2n1_ab1: { bg: 'bg_corridor', speaker: 'sys', text: "走廊尽头的凹位里停着老CR的读片器和封存零件箱，没挡着通道。箱上贴着设备科封条：「停用待查」。老范蹲在旁边收拾。", effect: { ap: -1 }, next: 'c2n1_ab2' },
  c2n1_ab2: { speaker: 'fan', sprite: 'char_fan', sfx: 'vox2_fan_a', text: '（蹲在旁边收拾零件，头也不抬）来看它？……上个月白班忙不过来，让它顶了两天班。**第三天中午，球管烧了**——就是老白那根「半价好管子」。', next: 'c2n1_ab3' },
  c2n1_ab3: { speaker: 'fan', sprite: 'char_fan', text: '靶面熔了个坑，连带着把高压发生器也撂倒了。老白？电话停机，人找不着。院里立了项，**设备科资质核查，这批第三方件的账，一笔一笔过**。', next: 'c2n1_ab4' },
  c2n1_ab4: { speaker: 'me', sprite: 'char_fan', text: "（摸出手机，翻到老白的聊天记录。最后一句还是「放心，用坏了找我」。）", next: 'c2n1_ab5' },
  c2n1_ab5: { speaker: 'fan', sprite: 'char_fan', text: "（把烧坏的零件放进盒子）聊天记录别删，设备科要留底。……搭把手，这箱挺沉。", effect: { skill: 1, flag: 'bai_echo' }, next: 'c2n1_ab6' },
  c2n1_ab6: { speaker: 'sys', text: "老范把箱子盖好：「别跟那台坏CT弄混了。旧CT已经拆机移交；CR停下来以后，普通拍片走楼上DR，夜间门禁和值班也都接上了。」你帮他把箱子推回库房。", effect: { flag: 'c2n1_a' }, next: 'c2n1_old_ct' },
  // —— A. 老伙计（没买的分支） ——
  c2n1_an1: { bg: 'bg_corridor', speaker: 'sys', text: "走廊尽头的凹位里，老CR读片器罩着防尘布。老范把它往里推了推，给通道腾出地方：「退役设备都得进库，主任还舍不得。」", effect: { ap: -1 }, next: 'c2n1_an2' },
  c2n1_an2: { speaker: 'fan', sprite: 'char_fan', sfx: 'vox2_fan_b', text: '（正好路过）原厂球管撑到了最后一天，一个零件没掉链子。主任说了，不卖废铁，就封在这儿——给科里留个体面。', next: 'c2n1_an3' },
  c2n1_an3: { speaker: 'me', sprite: 'char_fan', text: "我指了指CT室：「那台坏CT呢？」老范说：「早拆机移交了。这台是拍平片的CR，两码事。楼上DR现在夜里也开了，才提前让它歇。」", effect: { heart: 1 }, next: 'c2n1_an4' },
  c2n1_an4: { speaker: 'sys', text: '你替它把防尘布的角掖好，回到CT室门口。', effect: { flag: 'c2n1_a' }, next: 'c2n1_old_ct' },
  c2n1_old_ct: { speaker: 'fan', sprite: 'char_fan', text: '（老范翻出拆机前的照片）这才是那台坏CT。去年春天坏了，后来一直等配件；最后按报废流程拆走，处置单设备科存着。你看，现在那间屋里亮的已经是新机了。', image: 'ev_old_ct_retired', next: 'c2n1_hub' },
  // —— B. 小凯交底 ——
  c2n1_b1: { speaker: 'kai', sprite: 'char_kai', sfx: 'vox2_kai', text: "日检、预热，别偷懒。表贴这儿了，报警先看状态，别一个劲点确认。我的电话也在上面——希望你今晚用不上。", card: 'ct_tube_heat', effect: { ap: -1 }, next: 'c2n1_b2' },
  c2n1_b2: { speaker: 'me', sprite: 'char_kai', text: '（指着纸箱旁一个黑色的、带天线的盒子）这是什么？', image: 'item_remote', next: 'c2n1_b3' },
  c2n1_b3: { speaker: 'kai', sprite: 'char_kai', text: "**远程支持终端**，往厂家传运行日志和报错码。哪儿快坏了，我们提前备件。免费装，省得你半夜举着手机给我念报错。", image: 'item_remote', next: 'c2n1_b4' },
  c2n1_b4: { speaker: 'sys', text: '【怎么接？】', sprite: 'char_kai', choices: [
    { text: '「回传的都是设备数据？病人的图呢？」', next: 'c2n1_b5a', effect: { skill: 1, flag: 'remote_asked' }, tag: 'good' },
    { text: '「好东西，以后省心。」', next: 'c2n1_b5b' },
    { text: '（帮他抬箱子上推车）', next: 'c2n1_b5b', effect: { gold: 30, heart: 1 }, risk: { chance: 0.3, next: 'c2n1_b5c', effect: { ap: -1 } } },
  ]},
  c2n1_b5a: { speaker: 'kai', sprite: 'char_kai', text: '（笑）放心，走的是设备通道。……具体字段清单我回头让信息科拉一份，正规流程嘛。（他低头继续装箱，没有再展开。）', next: 'c2n1_b6' },
  c2n1_b5b: { speaker: 'kai', sprite: 'char_kai', text: "名片拿着，撤场后归片区同事管。有事先打电话。这台机柜先别碰，拆出一箱多余螺丝，我也没法交差。", next: 'c2n1_b6' },
  c2n1_b5c: { speaker: 'sys', text: '箱子一歪，里面的线材散了一地。你陪他重新理了二十分钟线，他直乐：「夜班大将，手上活儿不错，就是运气差点。」', next: 'c2n1_b5b' },
  c2n1_b6: { speaker: 'sys', text: '小凯推着最后一个纸箱走了。控制室彻底安静下来，只剩机架待机的低鸣。', effect: { flag: 'c2n1_b' }, next: 'c2n1_hub' },
  // —— E. 走廊转转 · 小雷 ——
  c2n1_e1: { speaker: 'lei', sprite: 'char_lei', sfx: 'vox2_lei', text: '新机器进PACS了，今晚的图直接上工作站，不用抱着板子跑了——你们科总算过上了二十一世纪的日子。', effect: { ap: -1 }, next: 'c2n1_e2' },
  c2n1_e2: { speaker: 'lei', sprite: 'char_lei', text: '……对了，（压低声音）那台远程终端的网线是我接的，**单独走的一条外网**。主任签的字。我就一说，你就一听。', effect: { flag: 'lei_cable' }, next: 'c2n1_e3' },
  c2n1_e3: { speaker: 'sys', text: '他贴完最后一张网线标签，拎着工具箱走了。你回头看了一眼那个黑盒子——天线一闪一闪。', effect: { flag: 'c2n1_e' }, next: 'c2n1_hub' },
  // —— C. 茶水间 · 小唐八卦 ——
  c2n1_c1: { bg: 'bg_breakroom', speaker: 'sys', text: '茶水间的灯坏了一半，小唐正踮着脚够橱柜顶上的速溶咖啡。', effect: { ap: -1 }, next: 'c2n1_c2' },
  c2n1_c2: { speaker: 'tang', sprite: 'char_tang', text: '哎，正好！帮我够一下——欸，听说没？新CT才用三天，白班预约已经排到下下周了。B超室眼红得不行，背地里管咱那台机器叫「**印钞机**」。', next: 'c2n1_c3' },
  c2n1_c3: { speaker: 'sys', text: '【怎么接？】', sprite: 'char_tang', choices: [
    { text: '「印钞机也得有人半夜喂它。」', next: 'c2n1_c4a', effect: { heart: 1 } },
    { text: '（把刚买的奶茶递过去）「茶话会入会费。」', next: 'c2n1_c4b', cond: { item: 'milktea' }, effect: { loseItem: 'milktea' }, tag: 'good' },
    { text: '（帮她踮脚够咖啡罐）', next: 'c2n1_c4c', risk: { chance: 0.35, next: 'c2n1_c4d', effect: { ap: -1 } } },
  ]},
  c2n1_c4a: { speaker: 'tang', sprite: 'char_tang', text: '哈哈，那今晚喂机器的就是你！……说真的，主任跟院里提了，**照这个量，明年可能申请第二台**。到时候咱科就是全院最横的科室。', next: 'c2n1_c5' },
  c2n1_c4b: { speaker: 'tang', sprite: 'char_tang', text: '（接过奶茶，眼睛一亮）上道！……那我跟你说个真格的：**设备科老范跟老周是三十年的老搭档**，当年那台老X光机就是他俩一起装的。老白那批便宜球管的事，设备科盯了不是一天两天了——你就等着看吧。', effect: { heart: 1 }, next: 'c2n1_c5' },
  c2n1_c4c: { speaker: 'tang', sprite: 'char_tang', text: '（接过咖啡罐）可以啊，身手不错。……欸，你说，老周今晚在CT室里站了一下午，一句话不说——他到底在看什么？', next: 'c2n1_c5' },
  c2n1_c4d: { speaker: 'sys', text: '罐子一歪，半罐咖啡粉撒进了水槽。你俩蹲着擦了十五分钟地，小唐笑得直不起腰：「这就算夜班开光的仪式感吧。」', next: 'c2n1_c5' },
  c2n1_c5: { speaker: 'sys', text: '纸杯见底，八卦听完。回CT室的路上，你的脚步轻快了些。', effect: { flag: 'c2n1_c' }, next: 'c2n1_hub' },
  // —— 开诊主线：坠床的老人 ——
  c2n1_m0: { speaker: 'sys', text: '晚上十点，分诊铃响。急诊小何推着平车一路小跑。', sfx: 'ring', next: 'c2n1_m1' },
  c2n1_m1: { speaker: 'he', sprite: 'char_he', sfx: 'vox2_he', text: '养老院打来的120：老爷子夜里起夜坠床，头磕在床头柜上，现在**叫不太醒，右侧瞳孔有点大**。怀疑颅内出血——头颅CT，急！', next: 'c2n1_m2' },
  c2n1_m2: { speaker: 'sys', text: '【开单科室问：做平扫还是直接增强？】', sprite: 'char_he', choices: [
    { text: '「先平扫，快。」', next: 'c2n1_m3a', effect: { skill: 1 }, tag: 'good' },
    { text: '「直接增强吧，看得更清楚。」', next: 'c2n1_m3b', effect: { skill: -1, flag: 'c2n1_wrong1' } },
  ]},
  c2n1_m3a: { speaker: 'me', sprite: 'char_he', text: "先平扫看有没有出血。小何，机房准备好了，推过来吧。", card: 'plain_first', next: 'c2n1_m4' },
  c2n1_m3b: { speaker: 'zhou', sprite: 'char_zhou', text: "先别加项目。这位先做头颅平扫，我看完再说。申请单给我。", card: 'plain_first', next: 'c2n1_m4' },
  c2n1_m4: { bg: 'bg_ctroom', speaker: 'sys', text: 'CT室。老人被抬上检查床。你走进控制室，操作界面是全新的——没有旋钮，全是触摸屏。', next: 'c2n1_m5' },
  c2n1_m5: { speaker: 'tang', sprite: 'char_tang', text: '（小声）这机器扫一次多快？', next: 'c2n1_m6' },
  c2n1_m6: { speaker: 'me', sprite: 'char_tang', text: "零点几秒转一圈。你看，床也在走——**一边转、一边进床，就是螺旋扫描**。别光顾着看机器，看着点老人。", card: 'helical_intro', next: 'c2n1_m7' },
  c2n1_m7: { speaker: 'sys', text: '定位像 → 设定范围 → 扫描。「嗡——」十几秒，第一幅横断图像跳上屏幕。', sfx: 'xray', next: 'c2n1_m8' },
  c2n1_m8: { speaker: 'zhou', sprite: 'char_zhou', text: "这一层，骨头和脑子能分开看了。去年拍普通片总说东西叠着，这回咱一层层找。", image: 'ct_head_hema', card: 'ct_tomography', next: 'c2n1_m9' },
  c2n1_m9: { speaker: 'zhou', sprite: 'char_zhou', text: "角落这个数是**CT值，单位HU**。水是0，空气约-1000。血和脑组织差得没那么大，得调窗。", image: 'ct_head_hema', card: 'hu_scale', next: 'c2n1_m10' },
  c2n1_m10: { speaker: 'zhou', sprite: 'char_zhou', text: "先试**窗宽80、窗位30**。一个管显示范围，一个管中心位置。你动手调，比听我念快。", image: 'ct_head_hema', card: 'brain_window', next: 'c2n1_m11' },
  c2n1_m11: { speaker: 'zhou', sprite: 'char_zhou', text: '拖吧。把窗口拖到「该看的东西」身上。', image: 'ct_head_hema', windowTask: { image: 'ct_head_hema', targetW: 80, targetL: 30, tolW: 30, tolL: 15, success: 'c2n1_w1ok', stage: 1 }, next: 'c2n1_w1ok' },
  c2n1_w1ok: { speaker: 'sys', text: '灰雾散开了。左侧额颞部，颅骨内板下贴着一弯**新月形的高密度影**，脑室被压得偏了位。', image: 'ct_head_hema', next: 'c2n1_w2' },
  c2n1_w2: { speaker: 'zhou', sprite: 'char_zhou', text: "再换一组，**窗宽130、窗位65**。看看颅骨旁边这圈，和刚才比有什么变化。", image: 'ct_head_hema', windowTask: { image: 'ct_head_hema', targetW: 130, targetL: 65, tolW: 35, tolL: 18, success: 'c2n1_w2ok', stage: 2 }, next: 'c2n1_w2ok' },
  c2n1_w2ok: { speaker: 'sys', text: '【这弯贴着颅骨内板的新月形高密度是——】', image: 'ct_head_hema', choices: [
    { text: '「硬膜下血肿。」', next: 'c2n1_d1a', effect: { skill: 2 }, tag: 'good' },
    { text: '「硬膜外血肿。」', next: 'c2n1_d1b' },
    { text: '「脑梗死？」', next: 'c2n1_d1c', effect: { skill: -1 } },
  ]},
  c2n1_d1a: { speaker: 'zhou', sprite: 'char_zhou', text: "嗯，硬膜下。记住这弯月亮。图留好，我给神外打电话。", image: 'ct_head_hema', next: 'c2n1_d2' },
  c2n1_d1b: { speaker: 'zhou', sprite: 'char_zhou', text: "这个是新月形，硬膜下。硬膜外常是凸透镜样。两种长相，别记反了。", image: 'ct_head_hema', next: 'c2n1_d2' },
  c2n1_d1c: { speaker: 'zhou', sprite: 'char_zhou', text: "这片是偏白的血肿。早期脑梗不一定显得出来，不能只靠黑白猜。", image: 'ct_head_hema', next: 'c2n1_d2' },
  c2n1_d2: { speaker: 'he', phone: 'char_he', text: '（看完图像，已经在打电话）神外！硬膜下，中线移位，准备手术——', image: 'ct_head_hema', next: 'c2n1_d3' },
  c2n1_d3: { speaker: 'sys', text: '平车呼啸而去。从进门到图像出来，十一分钟。', next: 'c2n1_d4' },
  c2n1_d4: { speaker: 'zhou', sprite: 'char_zhou', text: '（望着平车，没头没尾地说）这台机器第一晚就派上用场了。……行了，第一扫，你及格了。', effect: { badge: 'first_ct' }, event: 'ch2_first_scan', next: 'c2n1_p0' },
  // —— 第二例：肾绞痛的年轻人 ——
  c2n1_p0: { speaker: 'sys', text: "凌晨一点半，一个小伙子被同事架进门，捂着腰，刚挨到椅子又弹了起来。", sfx: 'ring', sprite: 'pat_stone', next: 'c2n1_pain' },
  c2n1_pain: { speaker: 'stone', sprite: 'pat_stone', sfx: 'vox_guy', text: '哎呦，疼死我了。', next: 'c2n1_p1' },
  c2n1_p1: { speaker: 'he', sprite: 'char_he', text: "疼了两小时，还带血尿。急诊已经给他止痛了，怀疑泌尿系结石。周老师，平扫这套行吗？", next: 'c2n1_p2' },
  c2n1_p2: { speaker: 'sys', text: '【怎么扫？】', sprite: 'char_he', choices: [
    { text: '「全腹增强吧，看得全面，一步到位。」', next: 'c2n1_p2b' },
    { text: '「怀疑结石，先请周老师确认平扫方案。」', next: 'c2n1_p2a', effect: { skill: 1 }, tag: 'good' },
    { text: '「这么疼先打止痛，回急诊打瓶针观察，天亮了再说。」', next: 'c2n1_p2c' },
  ]},
  c2n1_p2a: { speaker: 'zhou', sprite: 'char_zhou', text: "行，先平扫。找石头通常不用先打对比剂，等它排进尿路，反倒可能挡着小石头。", card: 'stone_plain', next: 'c2n1_p_scan' },
  c2n1_p2b: { speaker: 'zhou', sprite: 'char_zhou', text: "找结石先平扫，不是项目越多越好。对比剂排到尿路里，也会很亮，容易挡住小石头。", card: 'stone_plain', next: 'c2n1_p_scan' },
  c2n1_p2c: { speaker: 'he', sprite: 'char_he', text: "止痛已经在处理了，原因还没找到呢。周老师看过申请单了，按平扫方案来。", card: 'stone_plain', next: 'c2n1_p_scan' },
  c2n1_p_scan: { speaker: 'sys', text: "小伙子躺稳后，检查床缓缓进到机架里。采集结束，进度条转到了重建。", sfx: 'xray', next: 'c2n1_p3' },
  c2n1_p3: { speaker: 'sys', text: "平扫完成。老周沿着输尿管往下翻，在末端停住：**一颗约3mm的高密度小点，上游轻度扩张**。", image: 'ct_kidney_stone', next: 'c2n1_p4' },
  c2n1_p4: { speaker: 'zhou', sprite: 'char_zhou', text: "就在这儿，三毫米左右。位置、大小，还有上游扩张，记上，泌尿外科要看。", image: 'ct_kidney_stone', next: 'c2n1_p5' },
  c2n1_p5: { speaker: 'stone', sprite: 'pat_stone', text: "（缓过来一点，凑近屏幕）就这么一小粒？我还以为里面卡了块砖。", next: 'c2n1_p6' },
  c2n1_p6: { speaker: 'me', sprite: 'pat_stone', text: "（把图传回急诊）图和报告一起送过去了，小何带你回去接着处理。……这张放大了，别拿屏幕量石头。", effect: { gold: 80 }, next: 'c2n1_s1' },
  // —— 收束 ——
  c2n1_s1: { bg: 'bg_ctcontrol', speaker: 'sys', text: '凌晨四点，收尾。你习惯性去拿登记本——桌上一台崭新的扫码枪，登记已经电子化。', next: 'c2n1_s2' },
  c2n1_s2: { speaker: 'zhou', sprite: 'char_zhou', text: "（听见「登记本」，老周手一顿）电子的，也得有人登记才算数。……去年少的那页，医务科这回要把后续核完。主任叫咱们周一早点到。", effect: { heart: 1, flag: 'paperless' }, event: 'ch2_ct_open', next: 'c2n1_s3' },
  c2n1_s3: { speaker: 'sys', text: '【今夜结算】诊疗收入 +300 金币。第1夜 ·「新机」——完。', effect: { gold: 300, ap: -99 }, end: true },
}

/* ================= 第2日「窗口」（白班 · 轻量候诊队列） ================= */
const C2D2_QUEUE0 = [
  { name: '复查大爷 · 肺结节', tag: '门诊' },
  { name: '腹痛小伙 · 待查', tag: '门诊' },
  { name: '手腕摔伤学生', tag: '门诊' },
]
const C2D2_QUEUE1 = [
  { name: '复查大爷 · 肺结节', tag: '门诊', note: '检查中' },
  { name: '腹痛小伙 · 待查', tag: '门诊' },
  { name: '手腕摔伤学生', tag: '门诊' },
]
const C2D2_QUEUE2 = [
  { name: '腹痛小伙 · 疑肠梗阻', tag: '急诊', note: '插单' },
  { name: '腹痛小伙 · 待查', tag: '门诊' },
  { name: '手腕摔伤学生', tag: '门诊' },
  { name: '住院加急 · 术后复查', tag: '加急' },
]

const C2D2: Record<string, Step> = {
  c2d2_0: { bg: 'bg_ctcontrol_day', speaker: 'sys', text: '三天后，周一。主任把你从夜班临时调来支援白班：新CT的名声传开了，门诊开单量翻倍，候诊长队从CT室门口排到电梯间。', next: 'c2d2_1' },
  c2d2_1: { speaker: 'director', sprite: 'char_director', sfx: 'vox2_director', text: "年轻人，白班要快！队列交给你，急诊来了叫我。别光盯屏幕，门口那排人也盯着点。", effect: { flag: 'day_shift' }, queue: C2D2_QUEUE0, next: 'c2d2_reg0' },
  c2d2_reg0: { bg: 'bg_office_day', speaker: 'director', sprite: 'char_director', text: '开诊前，两分钟。去年登记本少的那页，检查记录补齐了，后续办法却一直悬着。这次市里专项督查到院，医务科要把后续核清。老周，你来说。', next: 'c2d2_reg1' },
  c2d2_reg1: { speaker: 'zhou', sprite: 'char_zhou', text: '页是我撕的。老人没证件，也没钱，我先给他拍了，没走登记申请。后来怕查，又想把这事盖过去。……不是这孩子的主意。', next: 'c2d2_reg2' },
  c2d2_reg2: { speaker: 'sys', text: '主任转向你，等你把自己知道的说清楚。', choices: [
    { text: '「那晚我在，后来也帮着拍了。经过我可以补。」', next: 'c2d2_reg3', cond: { flag: 'n5_cover' } },
    { text: '「我只说自己能确认的部分，其他请周师傅补。」', next: 'c2d2_reg3', cond: { notFlag: 'n5_cover' } },
  ] },
  c2d2_reg3: { speaker: 'director', sprite: 'char_director', text: '照实写。不是追那几张片子的钱，是人没登记、申请没留、报告最后交给谁也没记。明天他再来，谁接得上？', next: 'c2d2_reg4' },
  c2d2_reg4: { speaker: 'zhou', sprite: 'char_zhou', text: '我接得上，可我总有不在的时候。（他把笔帽拔下来）这回补全，别再让我拿记性当登记本。', next: 'c2d2_reg5' },
  c2d2_reg5: { speaker: 'director', sprite: 'char_director', text: '我当时没把后面的路落实，这个责任我认。急诊临时身份先建，检查和报告跟着走，手续后补；困难救助谁受理，也得写清。今天起按新办法办。', effect: { flag: 'ch2_registration_resolved' }, event: 'ch2_registration', next: 'c2d2_reg6' },
  c2d2_reg6: { speaker: 'sys', text: '门缝里探进小唐的脑袋：「两分钟到。外头大爷已经看了三遍挂钟了。」主任收起材料：「走，先接人。」', next: 'c2d2_2' },
  c2d2_2: { bg: 'bg_waiting', speaker: 'sys', text: '【白班队列】预约病人按号排，急诊/住院随时「插单」。让危重等太久，是要出事的。', queue: C2D2_QUEUE0, next: 'c2d2_3' },
  c2d2_3: { bg: 'bg_ctcontrol_day', speaker: 'sys', text: '第一例进机房。大爷，去年体检发现肺结节，医嘱半年复查。', queue: C2D2_QUEUE1, next: 'c2d2_lung_scan' },
  c2d2_lung_scan: { speaker: 'sys', text: "大爷按提示屏住气。扫描完成，工作站收到胸部数据，你先打开了默认的厚层序列。", sfx: 'xray', next: 'c2d2_4' },
  c2d2_4: { speaker: 'me', text: '（阅片）肺窗上一枚6mm的磨玻璃结节……等等，今天的图像上，它**时有时无**，有几层根本看不见。', image: 'ct_lung', queue: C2D2_QUEUE1, next: 'c2d2_5' },
  c2d2_5: { speaker: 'sys', text: '【怎么回事？】', image: 'ct_lung', queue: C2D2_QUEUE1, choices: [
    { text: '「对比去年的片子，结节确实吸收了，半年后再说吧。」', next: 'c2d2_6a', effect: { skill: -1 } },
    { text: '「这套层厚太厚了，先用原始数据重建薄层。」', next: 'c2d2_6b', effect: { skill: 2 }, tag: 'good' },
    { text: '「窗口没调好——换个窄窗再仔细看看。」', next: 'c2d2_6c', effect: { skill: -1 } },
  ]},
  c2d2_6a: { speaker: 'zhou', sprite: 'char_zhou', text: "先别写吸收。你现在开的是5mm厚层，小结节混在里面不显眼。原始数据还在，先重建一套薄层看看。", card: 'slice_partial', image: 'ct_lung', next: 'c2d2_w1' },
  c2d2_6b: { speaker: 'me', text: "厚层把周围组织混到一块儿了。原始数据还在，先做**1mm薄层重建**，不用马上把大爷叫回来重扫。", card: 'slice_partial', image: 'ct_lung', next: 'c2d2_w1' },
  c2d2_6c: { speaker: 'zhou', sprite: 'char_zhou', text: "窗可以调，但这次先查层厚。薄层数据还在，重建一套再比。别急着按曝光键。", card: 'slice_partial', image: 'ct_lung', next: 'c2d2_w1' },
  c2d2_w1: { speaker: 'sys', text: '薄层重建完成。老周敲敲屏幕：「**窗口调到肺窗，亲手把那枚『消失』的结节给我找出来。**」', image: 'ct_lung', windowTask: { image: 'ct_lung', targetW: 1500, targetL: -500, tolW: 220, tolL: 60, success: 'c2d2_w1ok' }, next: 'c2d2_w1ok' },
  c2d2_w1ok: { speaker: 'sys', text: '窗宽拉开到1500、窗位压到-500——肺野瞬间透亮，那枚6mm的磨玻璃结节，清清白白地躺在那里。', image: 'ct_lung', next: 'c2d2_7' },
  c2d2_7: { speaker: 'uncle', sprite: 'pat_uncle2', sfx: 'vox_uncle', text: '（拿着薄层重建出的片子，结节清清楚楚）去年说看不见了，敢情是没看着。', effect: { gold: 80 }, image: 'ct_lung', next: 'c2d2_8' },
  c2d2_8: { bg: 'bg_waiting', speaker: 'sys', text: '【队列事件】急诊插单：「腹痛待查，怀疑肠梗阻，加急！」——当前队列已排四人。', queue: C2D2_QUEUE2, sfx: 'ring', choices: [
    { text: '按规矩，急重症优先，立刻插队。', next: 'c2d2_9a', effect: { heart: 1 }, tag: 'good' },
    { text: '让他按号排，先来后到。', next: 'c2d2_9b', effect: { heart: -1, flag: 'queue_wait' } },
  ]},
  c2d2_9a: { speaker: 'sys', text: "你跟候诊的大爷大妈挨个解释，多数人都点头：「疼成这样，先看他的吧。」队列重排，机房没有空转一分钟。", queue: C2D2_QUEUE2, next: 'c2d2_gut_scan' },
  c2d2_9b: { speaker: 'guy', sprite: 'pat_gut', sfx: 'vox_guy', text: '（四十分钟后才轮到他，已经疼得蜷在椅子上）疼死我了……急诊电话追过来，小何的声音不太好听：「肠梗阻等四十分钟？下次我让病人自己爬上去？」', queue: C2D2_QUEUE2, next: 'c2d2_gut_scan' },
  c2d2_gut_scan: { speaker: 'sys', text: "急诊团队把腹痛病人送上床。按确认的方案完成扫描后，你调出腹部图像。", sfx: 'xray', next: 'c2d2_10' },
  c2d2_10: { bg: 'bg_ctcontrol_day', speaker: 'me', text: "刚才的肺窗还没切回来，难怪看着别扭。换**腹窗**，肠管和周围组织才好分。图传给急诊。", image: 'ct_abdomen', card: 'window_advanced', next: 'c2d2_q0' },
  // —— 队列事件2 ——
  c2d2_q0: { bg: 'bg_waiting', speaker: 'sys', text: '【队列事件】候诊区炸锅了：一位等了五十分钟的大爷拍着分诊台喊「再不上就投诉」；住院部电话同时进来：「术后复查的病人已经推到电梯口」；分诊台又喊：「**120刚出发，车祸伤，十分钟后到！**」', queue: C2D2_QUEUE2, sfx: 'ring', choices: [
    { text: '「先接电梯口那位术后加急，车祸伤一到直接进机房——大爷这边我亲自去解释，下一个门诊号就是他。」', next: 'c2d2_q1a', effect: { heart: 1 }, tag: 'good' },
    { text: '「大爷等得最久，先给他做——术后的回病房再等等。」', next: 'c2d2_q1b', effect: { flag: 'queue_wait' } },
    { text: '「都别催，机器就一台，按号来，车祸伤到了也得先登记拿号。」', next: 'c2d2_q1c', effect: { heart: -1, flag: 'queue_wait' } },
  ]},
  c2d2_q1a: { speaker: 'sys', text: '你蹲在大爷面前把话说明白：「**救命的事先进，您的号我盯着，下一位就是您。**」大爷哼了一声，把投诉电话挂了。十分钟后平车冲进来时，队列纹丝不乱。', queue: C2D2_QUEUE2, next: 'c2d2_t0' },
  c2d2_q1b: { speaker: 'sys', text: "大爷刚进机房，病房护士的电话就追来了：「加急那位还在电梯口等呢，到底送哪儿？」小唐隔着玻璃冲你招手。", queue: C2D2_QUEUE2, next: 'c2d2_t0' },
  c2d2_q1c: { speaker: 'sys', text: "平车一进门，候诊区的人自己让开了一条路。大爷把椅子往旁边挪：「早说啊，还让我们干坐着。」", queue: C2D2_QUEUE2, next: 'c2d2_t0' },
  // —— 第三例：车祸伤 ——
  c2d2_t0: { bg: 'bg_ctcontrol_day', speaker: 'sys', text: "车祸伤到了。救护车上还没核出姓名，急诊先建了临时身份，检查和报告跟着同一个号走。小唐递单时低声说：「这回不用找谁点头了。」团队确认了头颅及腹部检查方案。", queue: C2D2_QUEUE2, next: 'c2d2_trauma_scan' },
  c2d2_trauma_scan: { speaker: 'sys', text: "医护完成准备，先后按头颅和腹部方案采集。数据送往工作站重建，抢救室的电话一直没有挂。", sfx: 'xray', next: 'c2d2_t1' },
  c2d2_t1: { speaker: 'sys', text: "联合扫描完成，图像传到工作站。值班医师拉过椅子逐层查看，电话另一头，抢救室还在等结果。", image: 'ct_abdomen_trauma', queue: C2D2_QUEUE2, next: 'c2d2_t2' },
  c2d2_t2: { speaker: 'sys', text: '抢救室来电话致谢：「多发伤十分钟出全图，这机器真是买值了。」候诊区的大爷也朝你竖了竖大拇指——投诉的事，再没人提。', effect: { heart: 1, gold: 60 }, queue: C2D2_QUEUE2, next: 'c2d2_11' },
  c2d2_11: { bg: 'bg_ctcontrol_day', speaker: 'sys', text: "第四例，手腕摔伤的学生到了。普通片还有疑点，医师申请腕部CT。你把上一位的检查关掉，重新确认腕部协议。", next: 'c2d2_wrist_scan' },
  c2d2_wrist_scan: { speaker: 'sys', text: "学生把伤腕放稳。采集结束，工作站开始重建腕部切面。", sfx: 'xray', next: 'c2d2_wrist_result' },
  c2d2_wrist_result: { speaker: 'zhou', sprite: 'char_zhou', text: '图到了。先试骨窗，别把骨头调成一团白。', image: 'ct_wrist_simulated', next: 'c2d2_w2' },
  c2d2_w2: { speaker: 'sys', text: "【腕部调窗】调调窗宽和窗位，看看骨头里面的层次。", image: 'ct_wrist_simulated', windowTask: { image: 'ct_wrist_simulated', targetW: 4000, targetL: 250, tolW: 400, tolL: 80, success: 'c2d2_w2ok' }, next: 'c2d2_w2ok' },
  c2d2_w2ok: { speaker: 'zhou', sprite: 'char_zhou', text: "嗯，这样层次出来了。把这组留着，我再翻翻相邻几层。", image: 'ct_wrist_simulated', next: 'c2d2_n0' },
  // —— 中午 · 陆舟登场 ——
  c2d2_n0: { speaker: 'sys', text: '午休，机时难得空出来。一个抱着铝合金箱子的人探头进来，胸前挂着「田头技术大学」的访客牌。', next: 'c2d2_n1' },
  c2d2_n1: { speaker: 'luzhou', sprite: 'luzhou', sfx: 'vox_luzhou', text: "……真是你！老室友，你怎么瘦成这样？（陆舟把箱子往桌上一搁）行，夜班比读研还磨人。", next: 'c2d2_n2' },
  c2d2_n2: { speaker: 'me', sprite: 'luzhou', text: '陆舟？你不是读研去了——', next: 'c2d2_n3' },
  c2d2_n3: { speaker: 'luzhou', sprite: 'luzhou', text: "导师又给我加活了，天天和低剂量重建的噪声较劲。今天批了体模机时——赶紧扫，下午病人一来我又得搬走。", next: 'c2d2_n4' },
  c2d2_n4: { speaker: 'sys', text: "你和陆舟把水箱体模、线对卡体模依次摆好，按实验单完成三组采集。检查床退了出来，陆舟把箱子抱回推车。", sfx: 'xray', next: 'c2d2_n5' },
  c2d2_n5: { speaker: 'luzhou', sprite: 'luzhou', text: "还认得这张**正弦图**吗？每个角度一排投影，排起来就这样。你当年还借我作业抄来着。", image: 'img_sinogram', next: 'c2d2_n6' },
  c2d2_n6: { speaker: 'luzhou', sprite: 'luzhou', text: '这张是**FBP**重建的体模。直接反投影容易糊，先滤波再反投影才把轮廓提起来。原理那本旧书第三、四页有，别让我现场推，我也得翻。', image: 'ct_phantom', next: 'c2d2_n7' },
  c2d2_n7: { speaker: 'me', sprite: 'luzhou', text: '那滤波器还有得选？', next: 'c2d2_n8' },
  c2d2_n8: { speaker: 'luzhou', sprite: 'luzhou', text: "有啊。锐利核看细节，噪声也显眼；平滑核看着顺，细节会让一点。你试试换一个，先别动扫描参数。", card: 'fbp_iterative', next: 'c2d2_n9' },
  c2d2_n9: { speaker: 'luzhou', sprite: 'luzhou', text: "我再开一组**迭代重建**对照。先估一幅图，再跟采集数据反复对、慢慢修。噪声少些，电脑得多干活——等结果够我泡碗面。", next: 'c2d2_n10' },
  c2d2_n10: { speaker: 'luzhou', sprite: 'luzhou', text: "（放大图像，又缩回去）先别夸。噪声少了，细节有没有丢，还得比。体模这关过了，才轮得到临床数据。", next: 'c2d2_n11' },
  c2d2_n11: { speaker: 'sys', text: '【实验结束。陆舟搓着手，进入正题——】', sprite: 'luzhou', next: 'c2d2_n12' },
  c2d2_n12: { speaker: 'luzhou', sprite: 'luzhou', text: '那个……老同学，跟你打听个事。你们科能不能……给我们点**去标识化的临床数据**？几百例就行，训练验证用。伦理批件我们在办，就是慢，太慢了。', next: 'c2d2_n13' },
  c2d2_n13: { speaker: 'sys', text: '【怎么回应？】', sprite: 'luzhou', choices: [
    { text: '「先补齐批件和协议，我帮你问小雷材料递哪儿。」', next: 'c2d2_14a', effect: { skill: 1, flag: 'luzhou_formal', badge: 'phantom_friend' }, tag: 'good' },
    { text: '「数据是病人的，我做不了主。你先做体模，临床数据的事咱按规矩来。」', next: 'c2d2_14b', effect: { flag: 'luzhou_wait' } },
    { text: '「我先帮你拷几百例？别外传就行。」', next: 'c2d2_14c', effect: { wealth: -1, flag: 'luzhou_gray' } },
  ]},
  c2d2_14a: { speaker: 'luzhou', sprite: 'luzhou', text: "行，批件我催导师。你帮我问问小雷，上回那张申请表到底退在哪一栏了。", next: 'c2d2_15a' },
  c2d2_15a: { speaker: 'luzhou', sprite: 'luzhou', text: '（忽然想起什么）对了，说起来气人——你们厂家那个远程终端，数据不是都回传厂家云了吗？**厂家拿数据一句话的事，我们做科研走流程走了半年**。这公平吗？', next: 'c2d2_16a' },
  c2d2_16a: { speaker: 'me', sprite: 'luzhou', text: '（你想起小凯那个黑盒子，和小雷那句「单独走的一条外网」。）……这事，回头我帮你问问。', next: 'c2d2_n17' },
  c2d2_14b: { speaker: 'luzhou', sprite: 'luzhou', text: "得，那今天先抱水箱回去。临床数据我接着跑申请，下回给你带食堂的烧饼。", next: 'c2d2_n17' },
  c2d2_14c: { speaker: 'luzhou', sprite: 'luzhou', text: "别拷！导师要问来源，我怎么交代？……你帮我找对递材料的人，比给我塞硬盘强。", next: 'c2d2_n17' },
  c2d2_n17: { speaker: 'sys', text: '陆舟抱着体模走了，留下一本实验记录：「**体模实验数据归你们科存档，说不定哪天质控用得上**。」', effect: { flag: 'phantom_log' }, event: 'ch2_luzhou', next: 'c2d2_p1' },
  // —— 下午收梢 ——
  c2d2_p1: { speaker: 'sys', text: "一下午，电话没停过。你刚排好三个号，小唐又从门缝里递进来一张加急单。", next: 'c2d2_p2' },
  c2d2_p2: { speaker: 'tang', sprite: 'char_tang', text: "（下班前探头）还坐着呢？我喊你两遍了。饭再不拿，微波炉都下班了。", next: 'c2d2_p3' },
  c2d2_p3: { speaker: 'sys', text: '【本日结算】白班补贴 +200 金币。第2日 ·「窗口」——完。', effect: { gold: 200, ap: -99 }, end: true },
}

/* ================= 第3夜「快」 ================= */
const C2N3: Record<string, Step> = {
  c2n3_0: { bg: 'bg_ctcontrol', speaker: 'sys', text: '晚上九点半。白班的喧嚣散尽，CT室只剩下机架待机的低鸣。', next: 'c2n3_1' },
  c2n3_1: { speaker: 'sys', text: '「咔哒」——打卡成功。', sfx: 'stamp', effect: { gold: 50, ap: 3 }, next: 'c2n3_2' },
  c2n3_2: { speaker: 'tang', sprite: 'char_tang', text: '今晚你可得盯紧点——护士长说，新CT启用后，**卒中绿道的DNT考核落到咱科头上了**。', next: 'c2n3_3' },
  c2n3_3: { speaker: 'me', sprite: 'char_tang', text: 'DNT？', next: 'c2n3_4' },
  c2n3_4: { speaker: 'tang', sprite: 'char_tang', text: "就是进院到打上溶栓药用了多久。**DNT**。急诊那边一直计时，咱这儿得赶紧把图送过去，不能让人空等。", card: 'stroke_dnt', next: 'c2n3_hub' },
  c2n3_hub: { speaker: 'sys', text: '【自由行动 · 行动力⚡×3】', choices: [
    { text: '走廊 · 雯雯加班（⚡-1）', next: 'c2n3_a1', cond: { notFlag: 'c2n3_a', ap: 1 } },
    { text: '值班室翻书《CT夜班二十页》', next: '@book2' },
    { text: '小卖部', next: '@shop' },
    { text: '跟小唐打听八卦（⚡-1）', next: 'c2n3_d1', cond: { notFlag: 'c2n3_d', ap: 1 } },
    { text: '请小何吃关东煮（⚡-1）', next: 'c2n3_k1', cond: { notFlag: 'c2n3_k', item: 'snack', ap: 1 } },
    { text: '翻翻自己买的那本二手《医学影像学》', next: 'c2n3_bk1', cond: { notFlag: 'c2n3_bk', item: 'book' } },
    { text: '【开诊】值守CT室', next: 'c2n3_m0', tag: 'good' },
  ]},
  // —— A. 雯雯 · 维保合同 ——
  c2n3_a1: { bg: 'bg_corridor', speaker: 'wen', sprite: 'char_wen', sfx: 'vox2_wen', text: '哎，技师老师！加班加到十点的销售见过没？陪你们科主任磨了一下午**维保合同**——新机器第一年免费保，第二年开始，全保、半保、技保，价格差着好几万呢。', effect: { ap: -1 }, next: 'c2n3_a2' },
  c2n3_a2: { speaker: 'wen', sprite: 'char_wen', text: "（抽出一页草案）球管这笔钱最容易吵架。我给你们加了**按曝光次数计价、超支封顶**，记得让设备科把适用条件看完，别只看总价。", image: 'ev_maintenance_draft', effect: { flag: 'maintenance_draft' }, next: 'c2n3_a3' },
  c2n3_a3: { speaker: 'sys', text: '【闲聊两句？】', sprite: 'char_wen', choices: [
    { text: '「你们那个远程终端，数据都回传什么？」', next: 'c2n3_a4a', effect: { flag: 'wen_remote' } },
    { text: '「销售做到晚上十点，你们也真拼。」', next: 'c2n3_a4b', effect: { heart: 1 } },
    { text: '（帮她把文件搬上电梯）', next: 'c2n3_a4b', effect: { gold: 20, heart: 1 }, risk: { chance: 0.3, next: 'c2n3_a4c' } },
  ]},
  c2n3_a4a: { speaker: 'wen', sprite: 'char_wen', text: '（笑）设备数据呗，球管、机架、报错码。……不过说实话，**合同里那条「数据服务」的条款，我们法务改了三版**，你们信息科要是较真，让他们把附件三逐条过一遍。我能说的就这么多。', next: 'c2n3_a5' },
  c2n3_a4b: { speaker: 'wen', sprite: 'char_wen', text: '设备进院只是开始，往后十年的维保、升级、扯皮，都是生意。……对了，你们科主任下午问「远程质控服务」的事，那可是我们今年主推的新业务。', next: 'c2n3_a5' },
  c2n3_a4c: { speaker: 'sys', text: '最上面一份文件滑进电梯缝，你俩趴地上捞了半天。她笑你：「影像科的腰也不行啊。」', next: 'c2n3_a4b' },
  c2n3_a5: { speaker: 'sys', text: '电梯门合上。你抱着手臂看了一会儿大厅的灯，回到CT室。', effect: { flag: 'c2n3_a' }, next: 'c2n3_hub' },
  // —— D. 小唐八卦 ——
  c2n3_d1: { speaker: 'tang', sprite: 'char_tang', text: '今天神经内科门诊，我又看见那个「每年准时来报到」的神秘病人了——还是**全自费**，还是指征说得过去。今年主诉「头痛」，主任给开了个头颅CT平扫。', effect: { ap: -1 }, next: 'c2n3_d2' },
  c2n3_d2: { speaker: 'tang', sprite: 'char_tang', text: "去年咳嗽，今年头痛。他记得咱们，连分诊台挪了位置都看出来了。……别跟人说我拿他当八卦啊。", effect: { flag: 'c2n3_d' }, next: 'c2n3_hub' },
  // —— K. 关东煮 · 小何（买了零食礼包） ——
  c2n3_k1: { bg: 'bg_breakroom', speaker: 'sys', text: '你把小卖部买的零食礼包拆开——里面正好有两盒自热关东煮。开水一冲，香气混着海带味漫开，你端着它走向急诊分诊台。小何的眼睛亮得像看见了亲人。', effect: { ap: -1, loseItem: 'snack' }, next: 'c2n3_k2' },
  c2n3_k2: { speaker: 'he', sprite: 'char_he', text: "（烫得直哈气）夜班之神！……那个总来找旧片的病人，今晚又到了。站分诊台前半天，问我片库搬没搬。我说没搬，他才肯坐下。", next: 'c2n3_k3' },
  c2n3_k3: { speaker: 'sys', text: "小何夹走最后一颗丸子，手机就响了。她指了指空盒子：「这个帮我扔一下，谢了！」", effect: { heart: 1, badge: 'night_snack', flag: 'c2n3_k' }, next: 'c2n3_hub' },
  // —— BK. 二手书的秘密（买了二手《医学影像学》） ——
  c2n3_bk1: { speaker: 'sys', text: '候诊间隙，你翻开自己买的那本二手《医学影像学》——书页间滑出一张旧书签，上面一行褪色的钢笔字。', next: 'c2n3_bk2' },
  c2n3_bk2: { speaker: 'sys', text: '「**窗口调到病灶上，功夫下在病人前。**」——落款只有一个字：「**周**」，1999年。（你忽然明白，这本书是从谁的书架上流出来的。页边的批注密密麻麻，全是干货。）', image: 'item_book', effect: { skill: 1, flag: 'c2n3_bk' }, card: 'old_book_note', next: 'c2n3_hub' },
  // —— 开诊主线：卒中绿道 ——
  c2n3_m0: { speaker: 'sys', text: '凌晨两点，电话铃声像警报一样炸响。', sfx: 'ring', dnt: 15, next: 'c2n3_m1' },
  c2n3_m1: { speaker: 'he', phone: 'char_he', text: '绿道！**72岁男性，房颤病史，一小时前突发右侧偏瘫、失语**——NIHSS 12分，考虑左侧大脑中动脉！CT平扫，排出血，立刻！', dnt: 15, next: 'c2n3_m2' },
  c2n3_m2: { bg: 'bg_ctroom', speaker: 'sys', text: '平车冲进CT室。老人躁动不安，右侧肢体完全不动，嘴里发出含混的音节。', dnt: 17, next: 'c2n3_m3' },
  c2n3_m3: { speaker: 'zhou', sprite: 'char_zhou', text: "先平扫，我看图，卒中团队等结果。小唐，通知那边我们已经接上了。", dnt: 17, next: 'c2n3_m4' },
  c2n3_m4: { speaker: 'zhou', sprite: 'char_zhou', text: "用科里确认过的急诊协议，别临时乱拧螺距。床走得快，数据怎么采也得跟上。现在先把这一例做好。", card: 'helical_intro', dnt: 20, next: 'c2n3_m5' },
  c2n3_m5: { speaker: 'me', text: '开机、定位像、扫描——「嗡——」', sfx: 'xray', dnt: 24, next: 'c2n3_m6' },
  c2n3_m6: { speaker: 'sys', text: '【老人躁动，图像蒙了一层运动伪影。怎么办？】', image: 'ct_motion', dnt: 26, choices: [
    { text: '「图像能看，凑合用，抢时间。」', next: 'c2n3_m7a', effect: { skill: -1, flag: 'c2n3_wrong' } },
    { text: '「重扫！请小唐帮着固定头部，多花30秒换一张能签字的图。」', next: 'c2n3_m7b', effect: { skill: 2, badge: 'cool_head' }, tag: 'good' },
  ]},
  c2n3_m7a: { speaker: 'zhou', sprite: 'char_zhou', text: "这几层糊了，不能拿它排出血。先停一下，把头托和固定垫调整好，只补受影响的范围。", image: 'ct_motion', dnt: 29, next: 'c2n3_repeat_scan' },
  c2n3_m7b: { speaker: 'me', text: "先停一下，头托没放稳。小唐，帮我调整固定垫。（确认人员离开机房后，按医师意见补扫受影响的范围。）", dnt: 29, image: 'ct_motion', next: 'c2n3_repeat_scan' },
  c2n3_repeat_scan: { speaker: 'sys', text: "头托与固定垫调整好，人员退出机房。受影响范围补扫完成，新的序列传到了工作站。", sfx: 'xray', next: 'c2n3_m8' },
  c2n3_m8: { speaker: 'sys', text: '平扫图像：**各脑叶未见明确高密度出血灶，左侧大脑中动脉走行区隐约密度偏高**——「致密动脉征」！', image: 'ct_head_stroke', card: 'stroke_ct_sign', dnt: 33, next: 'c2n3_m9' },
  c2n3_m9: { speaker: 'zhou', sprite: 'char_zhou', text: "平扫没看到明确出血。我把结果报给卒中团队，**用药由他们评估**。CTA的准备接上。", dnt: 38, image: 'ct_head_stroke', next: 'c2n3_cta_scan' },
  c2n3_cta_scan: { speaker: 'sys', text: "对比剂按方案团注，确认动脉强化后完成CTA采集，工作站开始重建血管图像。", sfx: 'xray', next: 'c2n3_m10' },
  c2n3_m10: { speaker: 'me', text: "CTA图像重建出来了。老周沿血管翻看片子，在左侧大脑中动脉M1段停住：「这里闭了。」", image: 'ct_cta', card: 'cta_intro', dnt: 44, next: 'c2n3_m11' },
  c2n3_m11: { speaker: 'he', phone: 'char_he', text: '溶栓药已上！……M1段闭塞？！马上联系上级医院，**取栓绿道同步启动**——', dnt: 47, image: 'ct_cta', next: 'c2n3_m12' },
  c2n3_m12: { speaker: 'sys', text: '平车再次呼啸而去。你抬头看表——**从入院到给药，52分钟**。DNT达标。', effect: { badge: 'dnt_hero' }, event: 'ch2_stroke', dnt: 52, next: 'c2n3_m13' },
  c2n3_m13: { speaker: 'zhou', sprite: 'char_zhou', text: "（松开一直攥着的笔）图已经传过去了，转运那边也接上了。……我那杯茶呢，谁给挪了？", next: 'c2n3_h0' },
  // —— 第二例：凌晨的胸痛 ——
  c2n3_h0: { speaker: 'sys', text: '刚喘口气，分诊铃又响。凌晨三点半，急诊推进来一个人：**52岁男性，突发胸痛两小时，胸口像压了块磨盘，疼得攥着衣襟说不出整话，一身冷汗**。心电图：非特异性ST-T改变，没有动态演变。', sfx: 'ring', next: 'c2n3_h1' },
  c2n3_h1: { speaker: 'he', sprite: 'char_he', text: '心内科值班已经到了。**肌钙蛋白复查阴性——急性冠脉综合征暂时定不下来，心内按中低危处理**。心内打电话问我们：先做冠脉CTA，还是直接推导管室上冠脉造影？**你们影像科拿个意见。**', next: 'c2n3_h2' },
  c2n3_h2: { speaker: 'sys', text: '【CTA还是造影？——这个纠结，全写在心内科值班医生的脸上】', sprite: 'char_he', choices: [
    { text: '「先冠脉CTA：无创、一支静脉针的事，几分钟出全图，三支冠脉加钙化一目了然——先摸清情况再定。」', next: 'c2n3_h3a', effect: { skill: 2 }, tag: 'good' },
    { text: '「直接冠脉造影：金标准，查到狭窄当场放支架，一步到位。」', next: 'c2n3_h3b' },
    { text: '「先拍张胸片看看，别上来就大检查。」', next: 'c2n3_h3c', effect: { skill: -1 } },
  ]},
  c2n3_h3a: { speaker: 'me', sprite: 'char_he', text: '他血流动力学还稳、化验和心电图都不支持高危——**这个分层，CTA是「先手」**：无创、快、看得全。真扫出重度狭窄，再进导管室不迟。**先无创摸底、再有创兜底，是顺序，不是重复。**', card: 'cta_vs_dsa', next: 'c2n3_coronary_scan' },
  c2n3_h3b: { speaker: 'zhou', sprite: 'char_zhou', text: '（摇头）金标准不假，可你想过没有——**造影要进导管室、要穿刺置管、要一团人围着**，他这情况还没到非上不可的分层。**CTA先扫一圈：无创，几分钟，三支血管全看见**；真重度狭窄，CTA不但不挡路，还顺便把钙化都标给导管室了。', card: 'cta_vs_dsa', next: 'c2n3_coronary_scan' },
  c2n3_h3c: { speaker: 'zhou', sprite: 'char_zhou', text: '胸片？**胸片看冠脉，等于隔着毛玻璃数头发**。胸痛要看的不是肺，是血管——要么CTA，要么造影，没有第三条路。', next: 'c2n3_coronary_scan' },
  c2n3_coronary_scan: { speaker: 'sys', text: "心内和影像科共同确认冠脉CTA方案，团队完成准备。心电同步采集结束，工作站开始重建冠脉序列。", sfx: 'xray', next: 'c2n3_h4' },
  c2n3_h4: { speaker: 'sys', text: "冠脉序列重建完成。主任放大右冠状动脉中段，反复对照几个切面，提示局部有斑块伴明显狭窄。", image: 'ct_coronary_cta', next: 'c2n3_h5' },
  c2n3_h5: { speaker: 'zhou', sprite: 'char_zhou', text: "这套**CTA看管腔和斑块**，不能替人把血管打通。要不要进导管室处理，心内结合其他检查定。图传过去吧。", image: 'ct_coronary_cta', next: 'c2n3_h6' },
  c2n3_h6: { speaker: 'sys', text: "心内科接走病人和图像。你看了眼表，三点五十二分。小唐把刚泡好的茶推过来：「别问，新的。」", effect: { gold: 100 }, next: 'c2n3_x0' },
  // —— 支线：神秘病人第二诊 ——
  c2n3_x0: { bg: 'bg_corridor', speaker: 'sys', text: '凌晨四点，胸痛病人收进心内科，科室静下来。候诊椅上，坐着一个安静得几乎透明的人。', next: 'c2n3_x1' },
  c2n3_x1: { speaker: 'mystery', sprite: 'pat_mystery', sfx: 'vox2_mystery', text: '医生，又是我。（他递上申请单：神经内科，头颅CT平扫，全自费）', next: 'c2n3_x2' },
  c2n3_x2: { speaker: 'me', sprite: 'pat_mystery', text: "（认出是去年那位老人）……这次是头痛？门诊医师怎么说？", next: 'c2n3_x3' },
  c2n3_x3: { speaker: 'mystery', sprite: 'pat_mystery', text: '说不清。一睡着就疼，像有什么东西在脑子里翻。（他顿了顿）**你们换新机器了。……老机器的数据，还在吗？**', next: 'c2n3_x4' },
  c2n3_x4: { speaker: 'me', sprite: 'pat_mystery', text: "旧片和老机器不是一回事，档案还在。您是想调以前的检查，还是找家人的？", next: 'c2n3_x5' },
  c2n3_x5: { speaker: 'mystery', sprite: 'pat_mystery', text: "我父亲的。好多年了，能问的地方快问遍了。（他攥着单子）我最近也总头痛。医生，片子要是没事，我就真没事了吗？", next: 'c2n3_x6' },
  c2n3_x6: { speaker: 'sys', text: '【怎么回答？】', sprite: 'pat_mystery', choices: [
    { text: '「先做这次检查。结果出来，请医生跟您一起看看。」', next: 'c2n3_x7a', effect: { heart: 1 }, tag: 'good' },
    { text: '「CT很先进，多数问题都能查出来。」', next: 'c2n3_x7b' },
  ]},
  c2n3_x7a: { speaker: 'mystery', sprite: 'pat_mystery', text: "好。（他松开了捏皱的申请单）先看我今天这个。找片子的事，不催你。", next: 'c2n3_mystery_scan' },
  c2n3_x7b: { speaker: 'mystery', sprite: 'pat_mystery', text: '「多数」……那剩下的呢？（他摇摇头，走进了扫描间。）', next: 'c2n3_mystery_scan' },
  c2n3_mystery_scan: { speaker: 'sys', text: "老人慢慢躺下，双手交叠在腹前。检查床驶过机架；采集结束，控制台开始重建。", sfx: 'xray', next: 'c2n3_x8' },
  c2n3_x8: { speaker: 'sys', text: "采集和重建完成。医师逐层查看，这次头颅平扫未见明确异常；头痛还需要回门诊继续评估。", image: 'ct_head_clean', next: 'c2n3_x9' },
  c2n3_x9: { speaker: 'mystery', sprite: 'pat_mystery', text: '（接过片袋，指尖在「未见异常」四个字上摩挲了很久）……谢谢。明年11月，我可能还来。（他走进夜色，脚步比去年更慢。）', event: 'ch2_mystery', next: 'c2n3_s1' },
  c2n3_s1: { speaker: 'sys', text: '【今夜结算】诊疗收入 +280 金币。第3夜 ·「快」——完。', effect: { gold: 280, ap: -99 }, end: true },
}

/* ================= 第4日「狠」（白班 · 增强扫描专场） ================= */
const C2D4: Record<string, Step> = {
  // 两个病例仅连续对话推进；沿用旧节点 ID，兼容旧进度。
  c2d4_0: {"bg":"bg_office_day","speaker":"sys","text":"周五白班。你刚放下包，急诊的电话就打了进来。","next":"c2d4_1"},
  c2d4_1: {"speaker":"director","sprite":"char_director","text":"先去CT室。有位胸背痛的病人，急诊怀疑主动脉出了问题。我过去看片。","next":"c2d4_2"},
  c2d4_2: {"bg":"bg_ctcontrol_day","speaker":"sys","text":"推床停在检查室门口。病人攥着床栏，陪来的妻子手里还拎着他的外套。医护正在交接病情、评估增强检查的风险。","next":"c2d4_3"},
  c2d4_3: {"speaker":"sys","text":"「早上还好好的，拿个东西就突然疼起来了。」妻子说到一半，低头把外套又叠了一遍。","next":"c2d4_4"},
  c2d4_4: {"speaker":"me","text":"周师傅，今天不是排好的增强专场吗？","next":"c2d4_5"},
  c2d4_5: {"speaker":"zhou","sprite":"char_zhou","text":"急诊来了，先让路。别调肝脏那套协议，这回要看的是主动脉。","next":"c2d4_6"},
  c2d4_6: {"speaker":"sys","text":"放射科医师与急诊团队确认检查方案。你跟着老周准备设备，核对扫描范围和重建设置；对比剂使用与监护由医护团队负责。","next":"c2d4_7"},
  c2d4_7: {"speaker":"me","text":"还是这台机器，换个协议，看见的东西就不一样了。","next":"c2d4_8"},
  c2d4_8: {"speaker":"zhou","sprite":"char_zhou","text":"要等血管强化起来，再把该扫的范围扫全。机器转得快有用，扫早了、漏了一段，快也白搭。",next: 'c2d4_aorta_scan'},
  c2d4_aorta_scan: { speaker: 'sys', text: "准备完成。对比剂团注后，系统按确认的方案完成主动脉容积采集，检查床缓缓退回。", sfx: 'xray', next: 'c2d4_t1' },
  c2d4_t1: {"speaker":"sys","text":"扫描结束，图像一层层铺开。主任拉过椅子，来回翻了几遍，又调出沿主动脉走向的重组图。","image":"ct_aortic_dissection_teaching","next":"c2d4_t1ok"},
  c2d4_t1ok: {"speaker":"me","text":"这条细线……怎么把血管里面分成两边了？","image":"ct_aortic_dissection_teaching","next":"c2d4_t1no"},
  c2d4_t1no: {"speaker":"director","sprite":"char_director","text":"是内膜片。这里形成了真腔和假腔，考虑主动脉夹层。把完整序列调出来，我看一下累及范围。","image":"ct_aortic_dissection_teaching","next":"c2d4_t2"},
  c2d4_t2: {"speaker":"sys","text":"主任对照原始薄层图像和多个切面确认，随即给急诊打电话，说明发现并安排紧急专科评估。你没有再插话，把所需图像逐一传好。","image":"ct_aortic_dissection_teaching","next":"c2d4_t2ok"},
  c2d4_t2ok: {"speaker":"me","text":"刚才换了好几个方向看，没有再扫吧？","next":"c2d4_t2no"},
  c2d4_t2no: {"speaker":"zhou","sprite":"char_zhou","text":"没再照。那一组容积数据还在，换个方向重组就行。别只盯着那张漂亮的立体图，原始层也得留好。","next":"c2d4_t3ok"},
  c2d4_t3ok: {"speaker":"sys","text":"推床离开时，妻子追上来问报告在哪里领。主任指了指同行的医生：「图像和结果已经联系好了，先跟医生走。」","next":"c2d4_9"},
  c2d4_9: {"speaker":"sys","text":"走廊安静下来。老周端起杯子，发现茶已经凉了。他看了眼时钟，把杯盖拧了回去。","next":"c2d4_10"},
  c2d4_10: {"speaker":"zhou","sprite":"char_zhou","text":"先别热。下一位到门口了。","next":"c2d4_11a"},
  c2d4_11a: {"speaker":"sys","text":"下午，一位头痛的老爷子在门口摸了摸口袋：「手机钥匙都交了。我这人没别的毛病，就是零碎多。」",next: 'c2d4_metal_scan'},
  c2d4_metal_scan: { speaker: 'sys', text: "老爷子躺上检查床，头部平扫完成。控制台把采集数据送去重建，你等着第一组图。", sfx: 'xray', next: 'c2d4_12a' },
  c2d4_12a: {"speaker":"sys","text":"头部图像出来后，颅底附近横着几道黑白条纹。你往下翻了一层，条纹更重，像有什么东西把画面扯开了。","image":"ct_dental_metal_teaching","next":"c2d4_13"},
  c2d4_13: {"speaker":"me","text":"周师傅，机器又出问题了？上午还好好的。","image":"ct_dental_metal_teaching","next":"c2d4_14"},
  c2d4_14: {"speaker":"zhou","sprite":"char_zhou","text":"先别给机器判刑。亮得最扎眼的那块在哪儿？","image":"ct_dental_metal_teaching","next":"c2d4_15"},
  c2d4_15: {"speaker":"me","text":"嘴附近……是不是牙上的金属？","image":"ct_dental_metal_teaching","next":"c2d4_p0"},
  c2d4_p0: {"speaker":"grandpa","sprite":"pat_grandpa2","text":"（听见老周问义齿，一拍腿）还有这副活动牙！你们问金属，我光惦记钥匙了。这牙天天戴，早当成自己的了。","next":"c2d4_p1"},
  c2d4_p1: {"speaker":"zhou","sprite":"char_zhou","text":"怪我们，刚才没问具体。能自己取下来吗？固定在嘴里的可别硬动。","next":"c2d4_p2a"},
  c2d4_p2a: {"speaker":"grandpa","sprite":"pat_grandpa2","text":"（取下活动义齿，接过收纳盒）人没修好，先把零件拆了。盒子可别丢，配这口牙比买手机还贵。","next":"c2d4_p3a"},
  c2d4_p3a: {"speaker":"me","text":"那刚才那些黑线，不是脑子里真的有裂缝？","next":"c2d4_p2b"},
  c2d4_p2b: {"speaker":"zhou","sprite":"char_zhou","text":"不是那么回事。金属挡掉的射线太多，还把穿过去的射线能量分布改了。重建出来就可能拖出这些条纹，旁边的组织也跟着看不清。","image":"ct_dental_metal_teaching","next":"c2d4_p2c"},
  c2d4_p2c: {"speaker":"me",text: "陆舟那天换重建方法，噪声能少些。这个也能靠算法补回来吗？","image":"ct_dental_metal_teaching","next":"c2d4_p3b"},
  c2d4_p3b: {"speaker":"zhou","sprite":"char_zhou",text: "不能包治。迭代重建和专门的金属伪影校正不是一回事，缺掉的测量信息也不是调个窗就有了。先看影响哪几层，别整套重扫。","image":"ct_dental_metal_teaching","next":"c2d4_m1"},
  c2d4_m1: {"speaker":"sys","text":"医师确认颅底附近的图像不足以判断病情。去除活动义齿后，团队只补充了必要范围的扫描，条纹明显减轻。新旧图像一起保留，交由医师完成判读。","next":"c2d4_m2"},
  c2d4_m2: {"speaker":"sys","text":"老爷子拿回义齿盒，开盖数了数。老周乐了：「放心，一颗没扣。」老爷子把盒子揣好：「这可说不准，你们机器刚才照得那么狠。」","next":"c2d4_m3"},
  c2d4_m3: {"speaker":"me","text":"上午血管里那条线是真的，下午这些条纹倒是机器算出来的。光看着吓人，还真不能乱猜。","next":"c2d4_m4"},
  c2d4_m4: {"speaker":"zhou","sprite":"char_zhou","text":"嗯。看不清就说看不清，别替图像把故事编完了。收拾一下，主任叫我们五点去开会。","next":"c2d4_e0"},
  // 旧选项分支落点：继续同一病例，不保留已撤掉的处置教学。
  c2d4_11b: { speaker: 'sys', text: '下一位病人已经来到检查室门口。', next: 'c2d4_11a' },
  c2d4_11c: { speaker: 'sys', text: '下一位病人已经来到检查室门口。', next: 'c2d4_11a' },
  // —— 傍晚 · 数据回传摊牌 ——
  c2d4_e0: { bg: 'bg_office_day', speaker: 'sys', text: '下午五点，医生办公室。主任召集临时小会：老周、你、小雷。桌上摊着一份厂家彩页：《**远程质控服务方案**》。', image: 'ev_remote_proposal', next: 'c2d4_e1' },
  c2d4_e1: { speaker: 'director', sprite: 'char_director', text: "现在那个终端只说做远程支持。厂家想再开「远程质控」，每月出报告，不加钱。先把已经在传什么弄清楚，再谈加功能。", next: 'c2d4_e2' },
  c2d4_e2: { speaker: 'zhou', sprite: 'char_zhou', sprite2: 'char_director', text: "终端已经开着了，字段清单还没摊出来。「图像质量参数」到底是哪几个？小雷，你查到了吗？", next: 'c2d4_e3' },
  c2d4_e3: { speaker: 'lei', sprite: 'char_lei', text: "我复核了试运行以来的留存数据。除了报错日志，终端还收了控制台导出的质控样本。样本的DICOM头里，患者ID、姓名、检查时间都还在。", effect: { flag: 'remote_proposal' }, next: 'c2d4_e4' },
  c2d4_e4: { speaker: 'director', sprite: 'char_lei', sprite2: 'char_director', text: '（脸色沉下来）你确定？', next: 'c2d4_e5' },
  c2d4_e5: { speaker: 'lei', sprite: 'char_lei', text: '确定。我截了图，存在本地。**厂家说「自动脱敏」，但脱敏脚本没清DICOM头。**（他顿了顿）而且，合同附件三写的是「为改进服务质量，乙方有权使用脱敏后数据」——**「脱敏后」三个字，是他们自己定义的**。', next: 'c2d4_e6' },
  c2d4_e6: { speaker: 'sys', text: '【你的表态？】', sprite: 'char_lei', choices: [
    { text: '「服务可以继续，先催厂家修脱敏脚本。」', next: 'c2d4_e7a', effect: { heart: -1, flag: 'data_support' } },
    { text: '「先停外传，维保改走离线支持。」', next: 'c2d4_e7b', effect: { skill: 1, flag: 'data_oppose' } },
    { text: '「折中：先断开外网，让小雷审计全部字段，制定本院数据管理流程，再决定接不接、怎么接。」', next: 'c2d4_e7c', effect: { skill: 1, heart: 1, badge: 'gatekeeper', flag: 'data_audit' }, tag: 'good' },
  ]},
  c2d4_e7a: { speaker: 'zhou', sprite: 'char_zhou', text: "小雷刚把姓名那一栏指给你看了。至少先停质控样本外传，维保日志也得核清，不能混着放行。", next: 'c2d4_e8' },
  c2d4_e7b: { speaker: 'director', sprite: 'char_director', text: "那就先停外传。维保不能靠传病人姓名来做，我跟厂家谈离线支持，你把需要保留的日志列给我。", next: 'c2d4_e8' },
  c2d4_e7c: { speaker: 'director', sprite: 'char_director', text: "先断外网，院内PACS照常用。小雷查留存样本，老周跟我一起把字段和用途定清。结果报信息科，别自己悄悄处理了。", event: 'ch2_data_showdown', next: 'c2d4_e8' },
  c2d4_e8: { speaker: 'sys', text: "散会时，陆舟的消息弹出来：「材料又退回来了，少一页导师签字。」你把输入框里的半句话删了，回了个「明天帮你问」。", event: 'ch2_data_showdown', effect: { flag: 'data_hook' }, next: 'c2d4_reg' },
  c2d4_reg: { speaker: 'tang', sprite: 'char_tang', text: '对了，急诊那边困难患者的救助申请，今天有人接了。以前三通电话问一圈，今天我刚报临时号，对面就知道找哪份。', next: 'c2d4_reg2' },
  c2d4_reg2: { speaker: 'zhou', sprite: 'char_zhou', text: '那就好。小唐，把经办人的分机留一份——不是给我，贴值班室。省得换个人又从头问。', next: 'c2d4_e9' },
  c2d4_e9: { speaker: 'sys', text: '【本日结算】白班补贴 +250 金币。第4日 ·「狠」——完。', effect: { gold: 250, ap: -99 }, end: true },
}

/* ================= 第5夜「值守」 ================= */
const C2N5: Record<string, Step> = {
  c2n5_0: { bg: 'bg_corridor', speaker: 'sys', text: "晚上九点半。老周蹲在更衣柜前，把一摞交班本挪进纸箱。白大褂还挂着，最上层那罐茶叶也没动。", next: 'c2n5_1' },
  c2n5_1: { speaker: 'sys', text: '「咔哒」——打卡成功。', sfx: 'stamp', effect: { gold: 50, ap: 3 }, next: 'c2n5_2' },
  c2n5_2: { speaker: 'zhou', sprite: 'char_zhou', text: "来了？从今晚起，你主值，我备班。主任不再给我排整夜了，返聘带教照旧。别看我搬个箱子就以为我要跑路。", next: 'c2n5_3' },
  c2n5_3: { speaker: 'me', sprite: 'char_zhou', text: "那您半夜还在？", next: 'c2n5_4' },
  c2n5_4: { speaker: 'zhou', sprite: 'char_zhou', text: "在值班室。有事打电话，别学小雷，净发一串感叹号。该请值班医师看图就请，别一个人硬扛。", next: 'c2n5_5' },
  c2n5_5: { speaker: 'zhou', sprite: 'char_zhou', text: "（从旧交班本里抽出一只纸袋）封条柜另一半钥匙，找着了。科里保管的那半，我刚从钥匙柜领出来。两件凑齐了，今晚一起开吧。", next: 'c2n5_hub' },
  c2n5_hub: { speaker: 'sys', text: '【自由行动 · 行动力⚡×3】', choices: [
    { text: '封条柜 · 和老周一起开锁', next: 'c2n5_a1', cond: { notFlag: 'c2n5_cabinet' }, tag: 'good' },
    { text: '小唐的交接饭（⚡-1）', next: 'c2n5_b1', cond: { notFlag: 'c2n5_b', ap: 1 } },
    { text: '设备间巡检（⚡-1）', next: 'c2n5_e1', cond: { notFlag: 'c2n5_e', ap: 1 } },
    { text: '值班室翻书《CT夜班二十页》', next: '@book2' },
    { text: '小卖部', next: '@shop' },
    { text: '【开诊】值守CT室', next: 'c2n5_m0', cond: { flag: 'c2n5_cabinet' }, tag: 'good' },
    { text: '【开诊】……总觉得还有件事没做', next: 'c2n5_lock', cond: { notFlag: 'c2n5_cabinet' } },
  ]},
  c2n5_lock: { speaker: 'sys', text: "老周扬了扬装钥匙的纸袋：「先去开柜，不耽误你开诊。」", next: 'c2n5_hub' },
  // —— A. 封条柜 ——
  c2n5_a1: { bg: 'bg_archive', speaker: 'sys', text: "老周陪你走进旧片库。高窗漏下一块月光，柜门上还是1999年1月的封条，「……周……存」的字迹已经褪了色。", next: 'c2n5_a2' },
  c2n5_a2: { speaker: 'zhou', sprite: 'char_zhou', text: "（打开纸袋，把两半铜片合好，图案拼成一个完整的「周」字）扶一下手电，别照我眼睛。", image: 'item_zhou_key_fixed', next: 'c2n5_a3' },
  c2n5_a3: { speaker: 'sys', text: '铜片插入锁孔，转了两圈。「咔哒」——柜门开了。', sfx: 'click', next: 'c2n5_a4' },
  c2n5_a4: { speaker: 'me', sprite: 'char_zhou', text: "柜里是几摞教学片、一册手写笔记，还有一张压在玻璃下面的科室合影。没有新片，也没有登记本。", next: 'c2n5_a5' },
  c2n5_a5: { speaker: 'zhou', sprite: 'char_zhou', text: "（翻了两页，忽然笑了）原来这本搁这儿了。你看，这根线我当年画错了，师父硬让我重画三遍。擦得纸都快破了。", image: 'ev_ch2_teaching_archive', next: 'c2n5_a6' },
  c2n5_a6: { speaker: 'me', sprite: 'char_zhou', text: "片袋上写着「教学片」，笔记里夹着老设备的照片。合影的年份是1997；最边上那个头发还挺密、抱着本子的年轻人……我抬头看了眼老周。", image: 'ev_ch2_team_1997', choices: [
    { text: '「最边上那个，是您吧？」', next: 'c2n5_a7' },
    { text: '（拿旧黄铜钥匙，看看旁边的小铁柜）', next: 'c2n5_k1', cond: { item: 'key' }, tag: 'good' },
  ]},
  // —— 柜中柜（买了黄铜钥匙） ——
  c2n5_k1: { speaker: 'sys', text: "你想起旁边那个小铁柜——去年在小卖部买的黄铜钥匙开的是它，不是封条柜。钥匙还合用。里面的借阅卡上，有同一套教学片的编号。", sfx: 'click', effect: { flag: 'old_photo' }, next: 'c2n5_k2' },
  c2n5_k2: { speaker: 'sys', text: "借阅卡的签名从工整写到潦草，同一个「周」。老周凑过来看：「最后几笔是下班前补的。别学这个，我自己都认了半天。」", next: 'c2n5_a7' },
  c2n5_a7: { speaker: 'zhou', sprite: 'char_zhou', text: "对，是我。那会儿还没发福。（他把合影举近了点）片子可以拿出来学，顺序别打乱。笔记抄不明白的，白天来问我。", image: 'ev_ch2_team_1997', effect: { flag: 'old_register' }, event: 'ch2_cabinet', next: 'c2n5_a8' },
  c2n5_a8: { speaker: 'sys', text: "走出片库，老周说：「下周市里来做质控，今天这些记录正好带上。你跟工程师讲，我在旁边补。」你问合影里其他人，他想了想：「改天慢慢认，先值班。」", effect: { flag: 'zhou_handover' }, next: 'c2n5_a9' },
  c2n5_a9: { speaker: 'sys', text: "你把教学片和笔记的编号记进手册。它们不是那个男人在找的无名患者片，也解不开1998年的事；但老周年轻时画错的那根线，现在你认得了。", effect: { flag: 'nameless_films' }, next: 'c2n5_a10' },
  c2n5_a10: { speaker: 'sys', text: "你把两件钥匙装回纸袋，和老周一起签了归还记录。回到CT室，掌心还留着铜的凉意。", effect: { flag: 'c2n5_cabinet' }, next: 'c2n5_hub' },
  // —— B. 小唐的送别礼 ——
  c2n5_b1: { speaker: 'tang', sprite: 'char_tang', text: "（塞给你一个保温盒）夜班交接饭，我卤了牛肉。老周以为都是他的，差点给你吃光。快拿走。", effect: { ap: -1 }, next: 'c2n5_b2' },
  c2n5_b2: { speaker: 'sys', text: "保温盒里是切好的卤牛肉，下面压着小唐的纸条：「给你留了一半。另一半老周已经吃了，别找。」", effect: { heart: 1, flag: 'c2n5_b' }, next: 'c2n5_hub' },
  // —— E. 设备间巡检 ——
  c2n5_e1: { speaker: 'sys', text: '独立值守的第一夜，你把设备间里里外外巡了一遍：恒温22度，湿度正常，机架待机灯幽蓝。墙角那台远程终端……', image: 'item_remote', effect: { ap: -1 }, choices: [
    { text: '（那台黑盒子……走过去看一眼）', next: 'c2n5_e1x', cond: { flag: 'data_audit' } },
    { text: '（那台黑盒子……走过去看一眼）', next: 'c2n5_e1y', cond: { notFlag: 'data_audit' } },
    { text: '（不碰它，继续巡检）', next: 'c2n5_e2' },
  ]},
  c2n5_e1x: { speaker: 'sys', text: '网线已经拔掉，网口灯黑着——断外网审计，是那天散会时定了的事。你拍了拍机壳：**你的账，周一会上慢慢算。**', next: 'c2n5_e2' },
  c2n5_e1y: { speaker: 'sys', text: "终端还亮着电源灯，外传已停。旁边贴着小雷的纸条：「有电不等于联网，别替我插回去。」", next: 'c2n5_e2' },
  c2n5_e2: { speaker: 'sys', text: '【顺手干点什么？】', choices: [
    { text: '（把机架外壳的灰仔细擦了一遍）', next: 'c2n5_e3a', effect: { heart: 1 } },
    { text: '（顺着远程终端的网线，把走向摸了一遍）', next: 'c2n5_e3b', effect: { skill: 1, flag: 'term_checked' } },
    { text: '（什么都不碰，在巡检表上签字）', next: 'c2n5_e3c' },
  ]},
  c2n5_e3a: { speaker: 'sys', text: "铭牌擦亮了，抹布黑了。你翻了个面，还能再用一回。", next: 'c2n5_e4' },
  c2n5_e3b: { speaker: 'sys', text: "终端的上行线单独走桥架，接外网；质控样本由控制台导出后导入终端，并不是从PACS直接取。你把接口和线号抄进巡检记录。", next: 'c2n5_e4' },
  c2n5_e3c: { speaker: 'sys', text: "签完字，你发现笔帽又不见了。回头找了一圈，卡在门缝里。", next: 'c2n5_e4' },
  c2n5_e4: { speaker: 'sys', text: "你带上设备间的门，顺手试了试锁，回控制室。", effect: { flag: 'c2n5_e' }, next: 'c2n5_hub' },
  // —— 开诊主线：复查单前的走廊战争 ——
  c2n5_m0: { bg: 'bg_corridor', speaker: 'sys', text: '晚上十一点，电梯口传来争吵声，由远及近。', sfx: 'ring', next: 'c2n5_m1' },
  c2n5_m1: { speaker: 'kiddad', sprite: 'pat_kiddad', sfx: 'vox_kiddad', text: '孩子今晚吐了两次！**再扫一次，立刻！漏了出血你负得起责吗？！**', next: 'c2n5_m2' },
  c2n5_m2: { speaker: 'kidmom', sprite: 'pat_kidmom_holding', sprite2: 'pat_kiddad', sfx: 'vox_kidmom', text: '（把哭闹的孩子紧紧抱在怀里）不行！**三天前刚照过一次CT！网上都说这东西致癌，小孩子经不起这么照**——你们医院就知道让人做检查！', next: 'c2n5_m3' },
  c2n5_m3: { speaker: 'sys', text: '6岁男孩趴在母亲肩上，哭得更厉害了。三天前他们在外地旅游，孩子摔到头，当地医院做过一次头颅CT——**光盘就在父亲的包里**。', sfx: 'cry_child', sprite: 'pat_kidmom_holding', sprite2: 'pat_kiddad', next: 'c2n5_m4' },
  c2n5_m4: { speaker: 'kiddad', sprite: 'pat_kiddad', text: '（把光盘拍在分诊台上）你们机器新，看得清楚，再扫一次我们才放心！', next: 'c2n5_m5' },
  c2n5_m5: { speaker: 'kidmom', sprite: 'pat_kidmom_holding', text: '（声音劈了）放心？**照是你们说放心，不照也是你们说放心——你们到底哪句是真的？！**', next: 'c2n5_m6' },
  c2n5_m6: { speaker: 'sys', text: '【怎么处理？】', sprite: 'pat_kidmom_holding', sprite2: 'pat_kiddad', choices: [
    { text: '「都别吵了，扫！出了事我担着。」', next: 'c2n5_m7a', effect: { skill: -2, flag: 'c2n5_wrong' } },
    { text: '「光盘给我，先把旧图和新症状一起报给值班医师。」', next: 'c2n5_m7b', effect: { skill: 2, badge: 'alara_guard' }, tag: 'good' },
    { text: '「辐射确实不好，别扫了，回家观察吧。」', next: 'c2n5_m7c', effect: { heart: -1 } },
  ]},
  c2n5_m7a: { speaker: 'duty', phone: 'char_duty', sfx: 'vox_duty', text: "家长要求不是指征，先走流程。旧片传我，今晚新出现的症状也说清楚，我跟急诊一起评估。", next: 'c2n5_m8' },
  c2n5_m7b: { speaker: 'me', sprite: 'pat_kiddad', text: "光盘给我，我调给值班医师看。今天新吐了两次，也得一起告诉他，不能只看三天前的图。", next: 'c2n5_m8' },
  c2n5_m7c: { speaker: 'kiddad', sprite: 'pat_kiddad', text: "观察？！他吐了啊！刚才在电梯里又干呕，你没看见！（母亲把孩子抱紧，没有再接话。）", next: 'c2n5_m8' },
  c2n5_m8: { speaker: 'sys', text: '外院DICOM调阅成功：**左侧顶部头皮血肿，颅骨完整，颅内未见出血**。图像质量可用——但「呕吐两次」是三天前没有的新症状。', image: 'ct_head_child', next: 'c2n5_m9' },
  c2n5_m9: { speaker: 'duty', phone: 'char_duty', text: "我跟急诊看过了，需要复查。用儿童头颅协议，我在线上看图，结果马上反馈给急诊。", next: 'c2n5_m10' },
  c2n5_m10: { speaker: 'sys', text: '【进机房前，母亲拽住你的袖子】', sprite: 'pat_kidmom_holding', next: 'c2n5_m11' },
  c2n5_m11: { speaker: 'kidmom', sprite: 'pat_kidmom_holding', text: '医生，你跟我说实话……这一扫，孩子要吃多少辐射？', next: 'c2n5_m12' },
  c2n5_m12: { speaker: 'sys', text: '【怎么回答？】', sprite: 'pat_kidmom_holding', choices: [
    { text: '「我们用儿童协议，扫完把剂量记录留给您。」', next: 'c2n5_m13a', effect: { skill: 1, heart: 1 }, tag: 'good' },
    { text: '（指着胸前的剂量计）「这块记我们自己的，孩子另有检查记录，我给您看。」', next: 'c2n5_m13d', cond: { item: 'dosimeter' }, effect: { skill: 1, heart: 1, badge: 'dose_guard' }, tag: 'good' },
    { text: '「放心，剂量很小的，跟坐趟飞机差不多。」', next: 'c2n5_m13b', effect: { skill: -1 } },
    { text: '「现在知道怕了？刚才不是你要扫的吗？」', next: 'c2n5_m13c', effect: { heart: -2, flag: 'c2n5_rude' } },
  ]},
  c2n5_m13a: { speaker: 'me', sprite: 'pat_kidmom_holding', text: "用儿童头颅协议，按他的体型调，不照搬大人的参数。范围只做需要看的地方。扫完的剂量记录，我给您留一份。", card: 'dose_ct', next: 'c2n5_m14a' },
  c2n5_m14a: { speaker: 'kidmom', sprite: 'pat_kidmom_holding', text: '（盯着你的眼睛看了很久，终于点头）……好，我信你这一次。', card: 'child_ct', next: 'c2n5_m15' },
  c2n5_m13b: { speaker: 'kidmom', sprite: 'pat_kidmom_holding', text: "「差不多」是多少？你们说的我听不明白。（电话里，值班医师说：「让我跟家属讲两句。」你把听筒递过去。）", card: 'dose_ct', next: 'c2n5_m15' },
  c2n5_m13c: { speaker: 'sys', text: '走廊里的空气瞬间结冰。父亲把孩子往身后一拉，母亲眼圈红了。小唐赶来打圆场，才没闹到投诉。', next: 'c2n5_m15' },
  c2n5_m13d: { speaker: 'kidmom', sprite: 'pat_kidmom_holding', text: "这个是记你们自己受照的？那孩子的呢？（你把剂量计挂回胸前，调出设备上的记录页面。）「他的看这份，扫描后我给您打印。」", image: 'item_dosimeter', card: 'dose_ct', next: 'c2n5_m14a' },
  c2n5_m15: { speaker: 'me', sprite: 'pat_kid6', text: '（蹲下来，跟孩子平视）小朋友，待会儿那个大圆圈给你拍张照，一下子就好——就当坐一回小火车，别动，行不行？', next: 'c2n5_m16' },
  c2n5_m16: { speaker: 'kid', sprite: 'pat_kid6', sfx: 'vox_kid', text: '（抽噎着点头）……有棒棒糖吗？', next: 'c2n5_child_scan' },
  c2n5_child_scan: { speaker: 'sys', text: "小唐答应等他回急诊问问糖的事。男孩躺稳，人员退出机房；按儿童协议完成采集，新的头颅序列开始重建。", sfx: 'xray', next: 'c2n5_m17' },
  c2n5_m17: { speaker: 'sys', text: "扫描完成，值班医师对照旧片：未见新发颅内出血。急诊继续查呕吐原因，安排孩子留观。你把结果传了过去。", image: 'ct_head_child_followup', next: 'c2n5_m18' },
  c2n5_m18: { speaker: 'kiddad', sprite: 'pat_kiddad', text: '（瘫在候诊椅上，半天）……刚才，对不起。', next: 'c2n5_m19' },
  c2n5_m19: { speaker: 'kidmom', sprite: 'pat_kidmom_holding', text: '（把那页剂量报告折得方方正正，收进贴身的口袋）医生，**那以后……还要来复查吗？**', next: 'c2n5_m20' },
  c2n5_m20: { speaker: 'me', sprite: 'pat_kidmom_holding', text: "今晚先在急诊留观，后面怎么复查，等医生评估后跟您交代。我把这次图也存进光盘。", next: 'c2n5_m21' },
  c2n5_m21: { speaker: 'sys', text: '一家人进了留观室。孩子趴在爸爸背上，冲你挥了挥手。', next: 'c2n5_n1' },
  // —— 深夜 · 独立值守 ——
  c2n5_n1: { bg: 'bg_ctcontrol', speaker: 'sys', text: '凌晨两点，科室静得能听见机架待机的电流声。这是你**第一次独立守CT室的整夜**。', next: 'c2n5_n2' },
  c2n5_n2: { speaker: 'sys', text: '【事件1】住院部插单——术后发热，怀疑腹腔脓肿。', next: 'c2n5_n3' },
  c2n5_n3: { speaker: 'me', text: "申请单到了。我把今天的图像和扫描记录调出来，等值班医师确认方案。小唐已经去接病人了。", next: 'c2n5_n4' },
  c2n5_n4: { speaker: 'sys', text: '【事件2】急诊电话——「有个病人投诉你们CT室空调太冷！」', next: 'c2n5_n5' },
  c2n5_n5: { speaker: 'me', text: "（夹着电话找毯子）有，有保暖毯。机房温度我也查一下。先别让大爷对着风口坐。", next: 'c2n5_ring_trigger' },
  c2n5_ring_trigger: { speaker: 'sys', text: '送完毯子，控制台又报了一次通道异常。开班时日检还是正常的。你暂停接检，通知值班医师，按故障复核流程把科里的水箱体模搬上床。', next: 'c2n5_ring_scan' },
  c2n5_ring_scan: { speaker: 'sys', text: '体模扫描完成。那几秒低鸣停下来，屏幕开始刷新。', sfx: 'xray', next: 'c2n5_r0' },
  // —— 事件2·续：体模上的年轮 ——
  c2n5_r0: { speaker: 'sys', text: "新扫的水箱图上，冒出了一圈圈同心圆环，像水面上的涟漪。你调出开班时的日检图并排看——早先那张没有。", image: 'ct_water_ring_teaching', next: 'c2n5_r1' },
  c2n5_r1: { speaker: 'sys', text: '【水箱是均匀的——均匀的东西扫出「年轮」，问题出在哪？】', image: 'ct_water_ring_teaching', choices: [
    { text: '「水放久了分层？换箱水重扫一次。」', next: 'c2n5_r2a', effect: { skill: -1 } },
    { text: '「像环状伪影。把新旧体模图附上，报修查校准。」', next: 'c2n5_r2b', effect: { skill: 1 }, tag: 'good' },
    { text: '（拿出工具箱里的记录本）「先报修，我再把日志里的报警号找出来。」', next: 'c2n5_r2c', cond: { item: 'toolbox' }, tag: 'good' },
  ]},
  c2n5_r2a: { speaker: 'duty', phone: 'char_duty', text: "水没这么分层的。先看**探测器校准**，这种同心圆要查设备。报修单把体模图附上，受影响的检查先按停机预案安排。", card: 'ring_artifact', image: 'ct_water_ring_teaching', next: 'c2n5_r3' },
  c2n5_r2b: { speaker: 'sys', text: "旧记录没有这些圆环。你把新旧体模图并排截好，报修栏填上：**环状伪影，疑似探测器校准异常**。", card: 'ring_artifact', image: 'ct_water_ring_teaching', next: 'c2n5_r3' },
  c2n5_r2c: { speaker: 'sys', text: "你先报修，再打开用户端日志：**第217号通道反复报警**。截图发过去，工程师很快回复：「收到了，我带检测工具来，机柜先别拆。」", card: 'ring_artifact', effect: { skill: 2, badge: 'wrench_night' }, next: 'c2n5_r3' },
  c2n5_r3: { speaker: 'sys', text: "报修单提交，受影响的检查按停机预案分流。你把前几天的体模记录也打包发过去，省得工程师到场再找。", next: 'c2n5_n6' },
  c2n5_n6: { speaker: 'sys', text: '【事件3】手机在口袋里震了一下。', choices: [
    { text: '（掏出手机看一眼）', next: 'c2n5_p2a', cond: { flag: 'data_audit' } },
    { text: '（掏出手机看一眼）', next: 'c2n5_p2b', cond: { notFlag: 'data_audit' } },
    { text: '（半夜三更，私人消息先不看）', next: 'c2n5_g0' },
  ]},
  c2n5_p2a: { speaker: 'sys', text: '屏幕上是小雷，连发三条，最后一条只有四个字：**「出事了。看图。」**', next: 'c2n5_n7' },
  c2n5_p2b: { speaker: 'sys', text: '屏幕上是陆舟：「**伦理批件下周提交！**批下来我带师弟师妹去你们科参观学习——顺便膜拜全县第一台新CT😄」', next: 'c2n5_p2c' },
  c2n5_p2c: { speaker: 'sys', text: '【回复什么？】', choices: [
    { text: '「欢迎。体模数据记得带上——老周念叨第二回了。」', next: 'c2n5_p2d', effect: { heart: 1 } },
    { text: '「来可以，先帮我推一遍迭代重建的收敛证明。」', next: 'c2n5_p2d', effect: { skill: 1 } },
    { text: '（锁屏，继续干活）', next: 'c2n5_g0' },
  ]},
  c2n5_p2d: { speaker: 'sys', text: '他秒回了一个抱拳的表情。凌晨两点十七分，这座县城里还有两个没睡的人。', next: 'c2n5_g0' },
  c2n5_n7: { speaker: 'lei', sprite: 'char_lei', text: "留存样本核完了，是试运行这几天的检查号。去掉姓名的那份，检查号和时间还在——拿院内记录一对就能找回人。终端离线了，我现在查的是旧样本。", next: 'c2n5_n8' },
  c2n5_n8: { speaker: 'sys', text: '【怎么回复？】', sprite: 'char_lei', choices: [
    { text: '「保存证据，等周一主任会上摊牌。」', next: 'c2n5_n8a', effect: { flag: 'audit_evidence' }, tag: 'good' },
    { text: '「先别声张，我们再核实一轮。」', next: 'c2n5_n8b' },
    { text: '「……要不，就算了吧？」', next: 'c2n5_n8c', effect: { heart: -1 } },
  ]},
  c2n5_n8a: { speaker: 'lei', sprite: 'char_lei', text: "收到。证据进信息科受控目录，另存离线备份。不给你微信发病人信息了，明早到办公室看。", next: 'c2n5_g0' },
  c2n5_n8b: { speaker: 'lei', sprite: 'char_lei', text: "行。外网不接回去，我拿留存日志再对一轮。明早先报已经确认的，别拖。", next: 'c2n5_g0' },
  c2n5_n8c: { speaker: 'lei', sprite: 'char_lei', text: '算了？**病人的数据不是数据？**……当我没发。周一会上我自己说。', next: 'c2n5_g0' },
  // —— 清晨 · 告别 ——
  c2n5_g0: { bg: 'bg_morning', speaker: 'sys', text: "早上六点，受影响的检查都已分流，机器仍停着等工程师。你交完班走出控制室，老周正从值班室出来，手里一新一旧两个保温杯。", next: 'c2n5_g1' },
  c2n5_g1: { speaker: 'zhou', sprite: 'char_zhou', text: "（把新的那个递给你）夜班茶，自己泡。旧的这个我还用呢，别惦记。", next: 'c2n5_g2' },
  c2n5_g2: { speaker: 'me', sprite: 'char_zhou', text: "我还以为您连杯子都交了，真不来了。", next: 'c2n5_g3' },
  c2n5_g3: { speaker: 'zhou', sprite: 'char_zhou', text: "想得美。下周还得带你迎检。（他拧开旧杯子）行了，先吃早饭，我请——只管包子，不管加肉。", next: 'c2n5_g4' },
  c2n5_g4: { speaker: 'sys', text: "你跟着他往电梯走。小唐从后面追来，举着空保温盒：「两位，谁负责洗？」", next: 'c2n5_g5' },
  c2n5_g5: { speaker: 'zhou', text: "（老周已经按住电梯开门键）牛肉谁吃的谁洗。……别看我，咱仨一人一遍。", effect: { badge: 'night_keeper2' }, event: 'ch2_solo', next: 'c2n5_g6' },
  c2n5_g6: { speaker: 'sys', text: '【本章结算】诊疗收入 +350 金币。第5夜 ·「值守」——完。', effect: { gold: 350, ap: -99 }, end: true },
}

/* ================= 晨会考核（第5夜后） ================= */
const C2AM: Record<string, Step> = {
  c2am_0: { bg: 'bg_office_day', speaker: 'sys', text: "周一早上八点，医生办公室。老周坐在角落，用笔勾着新排班表。你的名字已经排在夜班主值那一栏。", next: 'c2am_1' },
  c2am_1: { speaker: 'director', sprite: 'char_director', sfx: 'vox2_director_am', text: "年轻人不错啊，我出几道题考考你。五道，老规矩。答完再去吃饭。", next: 'c2am_2' },
  c2am_2: { speaker: 'sys', text: '【考核开始 · 5道随机题】', next: '@quiz' },
  c2am_3: { speaker: 'director', sprite: 'char_director', text: "成绩存档。老周今后不排整夜，带教和备班还在，返聘手续按年度办。该求助就求助，不是把名字写上去就不能喊人了。", sfx: 'badge', next: 'c2am_4' },
  c2am_4: { speaker: 'sys', text: "老周把改好的排班表递给你，笔还夹在指缝里。有人鼓了两下掌，他笑着压了压手：「留着，等机器修好再拍。」", next: 'c2am_5' },
  c2am_5: { speaker: 'zhou', sprite: 'char_zhou', text: "（看了你一眼）夜班有事照样找我。电话要是没接，再打一个，我可能在洗杯子。", next: 'c2am_6' },
  c2am_6: { speaker: 'sys', text: '【第二章「快与狠」——完。】', next: 'c2am_7' },
  c2am_7: { speaker: 'sys', text: "【数月后】合规手续办妥，陆舟发来实验室的重建对照图。老周放大了好几遍：「噪声少了，边上那根细线呢？」陆舟回：「就知道您会问这个，还在查。」", effect: { flag: 'ai_hook' }, next: 'c2am_8' },
  c2am_8: { speaker: 'sys', text: "【2028年 · 预告】省医院AI工作站。你在训练数据来源清单里看见了熟悉的县医院设备编号，翻出当年留下的审计记录……", skipUnlessFlag: 'data_audit', next: 'c2am_9' },
  c2am_9: { speaker: 'sys', text: "澜江市禾川县人民医院 · 影像科。下一周的质控交流开始前，市里来的专家在门口站住，笑着喊了一声：「周老师，原来您还在这儿带人！」", end: true },
}

/* ================= 第二章题库（24题 · 工科向，贴合课件） ================= */
export interface Quiz2Q { q: string; options: string[]; answer: number; explain: string }
export const QUIZ2: Quiz2Q[] = [
  { q: 'CT值的单位是？', options: ['KW', 'HU', 'W', 'Tesla'], answer: 1, explain: 'CT值单位是亨氏单位HU，以水的衰减系数为基准：CT值=1000×(μ−μ水)/μ水。' },
  { q: '水的CT值是？凝固血块呢？', options: ['0HU；56~76HU', '100HU；500HU', '-1000HU；0HU', '0HU；-100HU'], answer: 0, explain: '水被定义为0HU，空气约-1000HU，骨约700~3000HU，凝固血56~76HU——血只比脑组织白二三十个单位，窗口不调好就漏掉。' },
  { q: '窗口技术中，「窗宽」和「窗位」分别指？', options: ['图像的宽度和中心', '放大灰度范围的上下限之差；放大范围的中心灰度值', '扫描层厚与层间距', '球管电压与电流'], answer: 1, explain: '人眼只能分辨几十级灰度，窗口技术就是把某一CT值区间拉满整个灰阶显示。' },
  { q: '看脑实质（脑窗）的典型窗宽/窗位设置是？', options: ['WW2000/WL250', 'WW80/WL30', 'WW1500/WL-500', 'WW450/WL150'], answer: 1, explain: '头颅常规WL30/WW80；骨窗WL250/WW4000；肺窗WL-500/WW1500；硬膜下血肿另有WL65/WW130的专用窗。' },
  { q: '螺旋CT扫描时，正确的运动方式是？', options: ['扫描床静止，球管原地旋转', '球管连续旋转，同时扫描床匀速前进', '病人旋转', '探测器固定不动'], answer: 1, explain: '球管连续旋转+床匀速进给，X线轨迹呈螺旋——滑环机架让这一切成为可能。' },
  { q: '螺距（pitch）的定义是？', options: ['球管转速/床速', '旋转一周进床距离 ÷ 探测器宽度', '层厚×层数', '曝光时间÷旋转时间'], answer: 1, explain: 'pitch=d/S。低螺距图像质量好但慢；高螺距扫得快、剂量通常更低，但要靠插值补层面数据。' },
  { q: '滑环技术给螺旋CT带来的好处，不包括？', options: ['采集更快', '运动伪影减少', 'Z轴分辨率改善', '完全消除辐射'], answer: 3, explain: '螺旋CT提升速度、减少运动伪影、改善Z轴分辨率与三维能力，但辐射不会消失——剂量管理始终是自己的事。' },
  { q: '多层螺旋CT的核心进步是？', options: ['两个球管', '多排探测器阵列，球管转一周同时获取多层', '更大孔径', '更高kV'], answer: 1, explain: '多排探测器通过不同组合获得不同层厚的多层影像，速度和X线利用率都翻倍。' },
  { q: '能谱CT（双能CT）区分碘和钙的数学本质是？', options: ['解二元一次方程组', '做傅里叶变换', '求偏导', '蒙特卡洛模拟'], answer: 0, explain: '同一物质在两种能量下衰减不同，两个能量各扫一次，两个方程解两个未知数——碘和钙就此分家。' },
  { q: '光子计数探测器与传统探测器的根本区别是？', options: ['体积更小', '直接计数单个X线光子并解析其能量', '更便宜', '不用电'], answer: 1, explain: '光子计数是能谱成像的实现路线之一，直接数光子、读能量，是能谱CT的下一代形态。' },
  { q: 'CT重建的数学根基——Radon变换揭示的是？', options: ['图像与频域的关系', '函数与其投影（线积分）之间的关系', '剂量与噪声的关系', '球管与探测器的关系'], answer: 1, explain: '1917年Radon证明：二维分布函数由它的所有线积分完全确定——CT采集是Radon正变换，重建是逆变换。' },
  { q: 'CT的原始投影数据按角度排列构成的图叫？', options: ['心电图', '正弦图（sinogram）', '直方图', '能谱图'], answer: 1, explain: '一个亮点在不同角度的投影连成正弦曲线，所有投影排在一起就是正弦图——它位于Radon空间。' },
  { q: '直接反投影法重建的固有缺陷是？', options: ['图像自带模糊滤镜、点源拖出星状伪迹', '无法重建', '剂量过高', '只能扫头部'], answer: 0, explain: '把投影均匀回抹，角度再多也糊——频域上看，直接反投影的数据点密度与|ρ|成反比，高频天生不足。' },
  { q: '滤波反投影（FBP）的关键一步是？', options: ['对图像做平滑', '反投影前对每条投影做高通滤波（频域乘|ρ|）', '增加投影角度', '降低管电压'], answer: 1, explain: '先在频域用斜坡滤波器|ρ|补偿高频，再反投影——时域卷积等价于频域相乘，所以也叫卷积反投影。' },
  { q: 'Ram-Lak与Shepp-Logan滤波器的取舍是？', options: ['Ram-Lak轮廓锐利但怕噪声；Shepp-Logan抗噪好但高频响应让一点', '两者完全一样', 'Shepp-Logan分辨率更高', 'Ram-Lak只适合软组织'], answer: 0, explain: '空间分辨率与信噪比的取舍——所以机器上才有锐利核（看骨）和平滑核（看软组织）之分。' },
  { q: '迭代重建（IR/ART）的基本流程是？', options: ['一步反投影出图', '先猜图像→模拟投影→与实测投影比对→差值反投影修正→反复迭代', '直接傅里叶反变换', '图像滤波增强'], answer: 1, explain: '迭代重建用「猜测-比对-修正」的循环磨掉噪声，同剂量下信噪比更高，或同图像质量下剂量更低——代价是算力。' },
  { q: '关于CT扫描工作原理，正确的是？', options: ['只需1~2个投影方向即可成像', '螺旋CT扫描时床静止、球管做螺旋运动', '探测器接收X线后直接变成图像显示', '探测器接收X线后转换成数字信号，送计算机重建后再显示'], answer: 3, explain: '采集足够多角度投影→数字化→计算机重建→显示，缺一不可。' },
  { q: '将测得的投影直接在反方向上回抹重建，称为？', options: ['迭代法', '卷积法', '直接反投影法', '二维傅里叶变换法'], answer: 2, explain: '直接反投影=回抹；先滤波再回抹才是滤波反投影（卷积法）。' },
  { q: '中心切片定理在CT重建中的意义是？', options: ['直接从投影生成空间域图像', '所有投影的傅里叶变换总是相同', '把投影的一维傅里叶变换与图像的二维傅里叶变换联系起来', '无法用于频域分析'], answer: 2, explain: '某角度投影的一维FT，等于图像二维FT沿同角度过原点的一条切片——这是傅里叶重建与FBP推导的桥梁。' },
  { q: '关于低剂量CT与AI重建，正确的观点是？', options: ['剂量越低越好，看不清也没关系', '降低剂量要以看清病变为前提，AI可在低剂量下提升图像质量', 'AI可以取代医生签字', '低剂量CT不需要算法支持'], answer: 1, explain: '用尽量小的损伤换精准的图像——「看得清」是前提，AI/迭代重建是手段。' },
  { q: '肾绞痛伴血尿的患者，CT首选方案是？', options: ['全腹三期增强', '泌尿系CT平扫', '口服对比剂后扫描', '先止痛观察三天'], answer: 1, explain: '结石CT值数百到上千HU，平扫上自己就是最亮的点；增强时对比剂充盈集合系统，反而把小结石淹掉。' },
  { q: '均匀水箱体模图像上出现同心圆环状伪影，最可能的原因是？', options: ['水箱里有杂质', '某探测器通道校准漂移', '病人动了', '管电压不稳'], answer: 1, explain: '环状伪影圆心固定在旋转中心，对应固定的探测器通道——体模是「标准答案」，答案错了就是机器的问题，报修校准即可。' },
  { q: '急性「中风」症状患者，溶栓前必须先做头颅CT平扫，目的是？', options: ['评估脑萎缩程度', '排除脑出血', '测量脑室大小', '观察颅骨骨折'], answer: 1, explain: '缺血要溶栓、出血要止血，方向相反——新鲜出血在平扫上是高密度，一分钟定下治疗方向；出血者溶栓等于催命。' },
  { q: '关于冠脉CTA与冠脉造影（DSA）的选择，正确的是？', options: ['造影是金标准，所有胸痛都直接造影', '中低危胸痛可先做无创冠脉CTA评估；STEMI等高危分秒必争，直接导管室造影+介入', 'CTA完全没有临床价值', '两者都需要外科开胸'], answer: 1, explain: 'CTA是无创的「地图」，造影是有创的「施工现场」——先无创摸底再有创兜底，是顺序不是重复。' },
]

/* ================= 班次表 ================= */
export const CH2_SHIFTS: Ch2Shift[] = [
  { id: 'c2n1', icon: '🌙', title: '第1夜', subtitle: '新机', kind: 'night', start: 'c2n1_0', steps: C2N1 },
  { id: 'c2d2', icon: '☀️', title: '第2日', subtitle: '窗口', kind: 'day', start: 'c2d2_0', steps: C2D2 },
  { id: 'c2n3', icon: '🌙', title: '第3夜', subtitle: '快', kind: 'night', start: 'c2n3_0', steps: C2N3 },
  { id: 'c2d4', icon: '☀️', title: '第4日', subtitle: '狠', kind: 'day', start: 'c2d4_0', steps: C2D4 },
  { id: 'c2n5', icon: '🌙', title: '第5夜', subtitle: '值守', kind: 'night', start: 'c2n5_0', steps: C2N5 },
  { id: 'c2am', icon: '🌅', title: '晨会', subtitle: '考核', kind: 'quiz', start: 'c2am_0', steps: C2AM },
]
