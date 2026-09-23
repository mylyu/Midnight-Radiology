import type { GameState, Step } from './types'
import type { KnowledgeCard, ChronicleEvent, Evidence } from './dlc'
import { patientStep } from './ch2-patients.ts'
import { CH2_SOCIAL_STEPS, ch2SocialStep } from './ch2-social.ts'
import { CH2_PACING_STEPS, ch2PacingStep } from './ch2-pacing.ts'

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

/* ================= 第二章勋章（12枚现役，5枚旧版留档） ================= */
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
  night_snack: { name: '夜班搭子', icon: '🍢', desc: '深夜请小何吃了一顿关东煮，让忙碌的小何歇下来吃口热的' },
  wrench_night: { name: '夜班机修', icon: '🔧', desc: '报修并整理日志，把第217号通道报警交给工程师核查' },
  dose_guard: { name: '剂量卫士', icon: '📟', desc: '分清工作人员剂量计与患者检查记录，向家属解释儿童方案' },
  phase_eye: { name: '期相之眼', icon: '👁️', desc: '三期增强图像连续两幅一眼认出期相' },
  c2_tea_regular: { name: '茶水间常客', icon: '☕', desc: '在至少三个班次里与同事聊过天，第五夜再碰个头' },
  c2_two_sides: { name: '两头都问过', icon: '🧩', desc: '分别听过小雷和雯雯的说法，第五夜再当面核实签字风波' },
}

/** Keep original backgrounds for other chapters and legacy saved view keys. */
export function ch2BackgroundAsset(key: string): string {
  if (key === 'bg_ctcontrol') return 'bg_ctcontrol_ready'
  if (key === 'bg_ctcontrol_day') return 'bg_ctcontrol_day_ready'
  return key
}

/** Resolve patient staging, remembered choices and optional social branches from saved state. */
export function ch2StepForState(id: string, step: Step, state: Pick<GameState, 'flags' | 'badges' | 'gender' | 'finished'> & Partial<Pick<GameState,'ap'|'items'>>): Step {
  step = patientStep(id, step)
  const { flags, badges } = state
  let text = step.text
  let queue = step.queue
  if (['c2d2_t0', 'c2d2_t1', 'c2d2_t2'].includes(id) && queue) {
    queue = queue.filter(patient => !(
      (flags.c2_queue_postop_done && patient.name.startsWith('住院加急')) ||
      (flags.c2_queue_routine_done && patient.name.startsWith('候诊大爷'))
    ))
  }
  if (id === 'c2n1_b5b' && badges.includes('fixer')) text = '上回老机器你敢动手，这台可别照着拆。名片拿着，先打电话——我也怕你拆出一箱多余螺丝。'
  if (id === 'c2n1_b6' && flags.kai_friend) text = '小凯推着箱子又折回来：「去年你跟完保养流程，记得挺细。这回我把技术支持的联系人也给你，重建配置的问题找得到人。」'
  if (id === 'c2n3_a2' && flags.wen_card) text = '去年那张名片还在吧？下次别在走廊堵我，直接打电话。（她递过维保草案）球管计价和封顶条件都在这儿，重建软件的许可页也带了，设备科得一起看。'
  if (id === 'c2n3_x4') {
    if (flags.mystery_told) text = '您去年问的那只1998年片袋，我还记着。档案没跟机器一起处理，不过那张片子是谁的，还没核实。'
    else if (state.finished) text = '您还在找父亲的旧片吧？换机器没有把档案丢掉。身份没核清的材料，我这边还不能直接交给您。'
    else if (flags.mystery_asked) text = '您去年问过旧片库，我记得。换机器没有把旧档案丢掉。您还是想找家人的片子？'
  }
  if (id === 'c2n3_x5' && flags.mystery_told) text = '我知道，那张片子还没认准，不能算找着了。（他把旧袋口按紧）我不催。今天先看我的头痛吧……片子没事，我就真没事了吗？'
  if (id === 'c2n5_a1' && flags.archive_sealed) text = '去年你在书架后面看见的柜子还在。封条仍是1999年1月，「……周……存」的字更淡了。老周把纸袋搁在柜顶：「这次不用隔着门猜了。」'


  // Narrative callbacks only: use existing memories, never create a choice,
  // reward, new flag or recollection of an optional scene the player skipped.
  if (id === 'c2n3_x0' && flags.c2n3_d) text = '凌晨四点，声控灯熄了。黑处一声纸袋摩擦，灯又亮起。那个问旧片的人还坐着，旁边是小唐倒的水，杯口已经没了热气。刚才的平车来来去去，他一直给别人让着路。'
  if (id === 'c2d4_e2' && flags.remote_asked) text = '小凯那晚答应给你的字段清单，拿到了没有？不能只有名片背面那一笔。小雷，先把你实际查到的摊开说。'
  if (id === 'c2d4_e5' && flags.wen_remote) text = '确定。雯雯让咱们逐条看的附件三，就是这一条：使用「脱敏后数据」。可我对过原样本和导出结果，自动脱敏脚本没清DICOM头，姓名还在。证据已存本地，不往群里发。'
  if (id === 'c2n5_a7' && (flags.archive_film || flags.mystery_told)) text = '是我，那会儿头发还够往后梳。（他看见你在找片袋上的年份）这一柜是教学片，不是你惦记的那只无名袋。那张的身份还得查。先把这些学会，笔记里我画错的地方也别跳过去。'
  if (id === 'c2n5_g4' && flags.c2n5_b) text = '你跟着他往电梯走。小唐从后面追来，举着空保温盒：「两位，谁负责洗？」'
  if (id === 'c2n5_g5' && flags.c2n5_b) text = '（老周已经按住电梯开门键）牛肉谁吃的谁洗。……别看我，咱仨一人一遍。'
  if (id === 'c2am_0') {
    const reply = flags.audit_evidence
      ? '小雷把你让他保留的证据交了上去，主任在接收栏签名。'
      : flags.data_audit
        ? '小雷只报已核实的样本，待查项单列，主任逐项签收。'
        : flags.data_oppose
          ? '主任在「离线支持联系人」后写下自己的名字：「厂家这边我接着谈。」'
          : flags.data_support
            ? '主任扣住新增服务的签字页：「修过也得复核，不能他说好了就算好。」'
            : '主任在交接记录上签了字。'
    text = '周一早上八点，办公室先过昨夜交班：CT正常交接；远程终端保持离线。信息科今天接手查日志，周五反馈。' + reply + '老周把排班表推过来，你的名字在主值栏，他的在备班栏。'
  }
  const rendered = text === step.text && queue === step.queue ? step : { ...step, text, queue }
  return ch2PacingStep(id, ch2SocialStep(id, rendered, state), state)
}

/* 旧版停颁（病例替换及支线撤出）：保留定义与老存档记录，不计入收集分母。 */
export const CH2_BADGES_LEGACY: string[] = ['checklist_zero', 'allergy_save', 'phase_eye', 'phantom_friend', 'wrench_night']
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
    image: 'ct_ch2_stroke_plain_v2',
  },
  stroke_ct_sign: {
    title: '卒中CT：平扫与血管图各看什么',
    body: '急性卒中的平扫先帮助排查出血，早期缺血改变可能很轻，单张切面看不出异常不能排除卒中。有时血栓会表现为致密动脉征，但不是每例都有，也不能只靠这一征象定论。CTA进一步显示血管，由医师结合完整序列判断闭塞位置。',
    image: 'ct_ch2_stroke_plain_v2',
  },
  cta_intro: {
    title: 'CTA：跟着药峰走',
    body: '经静脉团注碘对比剂，球管追着药峰扫动脉——CT血管成像让堵住的血管现形。扫描时机就是一切：早了药没到，晚了药走了。找到责任血管，取栓绿道才有目标。',
    image: 'ct_ch2_stroke_cta_v2',
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
    body: '初次怀疑泌尿系结石时，平扫通常就能提供有用信息：不少结石比周围软组织亮。还要结合完整序列看位置、测大小、查有无梗阻，不能拿屏幕上的亮点估毫米。对比剂排进尿路后可能遮住小结石，但增强并非一概没用；还有其他疑问时，由医师决定后续方案。',
    image: 'ct_ch2_stone_v2',
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

/* 旧版停颁（增强专场替换及水模线撤出）：保留定义与老存档记录，不计入收集分母。 */
export const CH2_CARDS_LEGACY: string[] = ['contrast_agent', 'contrast_checklist', 'contrast_contra', 'contrast_emergency', 'ring_artifact']
export const CH2_ACTIVE_CARDS: string[] = Object.keys(CH2_CARDS).filter(id => !CH2_CARDS_LEGACY.includes(id))

/* ================= 第二章大事记（9条） ================= */
/** Deferred stories retain owned records, but cannot be newly earned in Chapter 2. */
export const CH2_EVENTS_LEGACY = ['ch2_luzhou']
export const CH2_EVIDENCE_LEGACY = ['phantom_log']

export const CH2_EVENTS: Record<string, ChronicleEvent> = {
  ch2_ct_open: { time: '2025年11月', title: '新CT启用', body: '经历交付延期和机房改造，新CT完成验收、临床启用。旧CT已拆机处置，普通片由DR接班；去年的登记缺页仍要核清后续。' },
  ch2_registration: { time: '2025年11月', title: '少掉的登记页', body: '老周承认2024年为无证件老人检查后撕页，主任承担后续程序未落实的责任。临时身份、报告追踪与困难救助有了明确承接人，不再靠谁私下点头。' },
  ch2_first_scan: { time: '2025年11月', title: '夜班首扫', body: '坠床老人，硬膜下血肿，从进门到出图十一分钟。新机器的第一晚就派上了用场。' },
  ch2_luzhou: { time: '2025年11月', title: '陆舟来院（旧版留档）', body: '本科室友陆舟跟导师做低剂量重建科研，来院完成体模实验，留下记录。临床数据申请还在走流程，双方没有私下拷走患者数据。' },
  ch2_stroke: { time: '2025年11月', title: '卒中绿道之夜', body: '房颤老人深夜卒中：运动伪影重扫、平扫排血、CTA提示M1闭塞。团队在进院52分钟时开始溶栓，同时联系上级医院评估取栓。' },
  ch2_mystery: { time: '2025年11月', title: '神秘病人第二诊', body: '去年那位寻找父亲旧片的老人再度来院。头颅平扫未见明确异常，头痛仍需回门诊评估；父亲的档案也没有查明。' },
  ch2_data_showdown: { time: '2025年11月', title: '数据回传摊牌', body: '小雷在质控样本中发现未清除的患者标识。会上叫停样本外传；玩家可主张整改服务、离线维保或完整断网审计。' },
  ch2_cabinet: { time: '2025年11月', title: '封条柜开启', body: '科里保管的半钥匙与老周找回的一半合齐。柜内是教学片、手写笔记和1997年合影，照片中年轻的老周抱着本子，站在最边上。' },
  ch2_solo: { time: '2025年11月', title: '独立值守', body: '老周交出整夜夜班主值职责，返聘带教与备班仍在。你完成交班，和他、小唐去吃早饭。' },
}

/* ================= 第二章证物（6件） ================= */
export const CH2_EVIDENCE: Record<string, Evidence> = {
  maintenance_draft: { title: '维保合同草案', body: '雯雯留下的草案页：球管按曝光次数阶梯计价、超支部分封顶。她说：球管是耗材，不是固定资产，不这么写你们迟早吃亏。', image: 'ev_maintenance_draft', flag: 'maintenance_draft' },
  phantom_log: { title: '体模实验记录（旧版留档）', body: '陆舟留下的实验记录：水箱与线对卡体模、三组参数的扫描数据。「归你们科存档，说不定哪天质控用得上。」', image: 'ct_phantom', flag: 'phantom_log' },
  remote_proposal: { title: '远程质控服务方案', body: '厂家彩页：设备运行数据、图像质量参数自动回传云端，免费。附件三写着「乙方有权使用脱敏后数据」——「脱敏后」三个字，由他们自己定义。', image: 'ev_remote_proposal', flag: 'remote_proposal' },
  old_register: { title: '老周的手写笔记', body: '封条柜内的教学笔记，留着改错的线图与批注。不是2024年少页的登记簿；后者已另行核查。', image: 'ev_ch2_teaching_archive', flag: 'old_register' },
  nameless_films: { title: '封存的教学片', body: '1999年1月封存前整理的教学片与旧设备照片，按教学编号归档。并非每年11月的匿名患者片袋，也不能据此确认寻父线索。', image: 'ev_ch2_teaching_archive', flag: 'nameless_films' },
  ch2_team_photo: { title: '1997年的科室合影', body: '教学资料里的科室合影，最边上抱本子的年轻人是老周。边框已经泛黄，六个人的模样还清楚。', image: 'ev_ch2_team_1997', flag: 'old_register' },
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
    body: '脑窗80/30，骨窗4000/250，肺窗1500/-500，硬膜下窗130/65，CTA窗450/150。窗宽是放大范围的上下限之差，窗位是这段的中心。拿错窗等于戴错眼镜：骨窗太宽，腹部软组织挤在相近的灰色里；肺窗窗位低，腹部软组织偏亮，细节也不容易分。',
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
  ...CH2_SOCIAL_STEPS.c2n1,
  ...CH2_PACING_STEPS.c2n1,
  c2n1_0: { bg: 'bg_ctcontrol', speaker: 'sys', text: '2025年11月，晚上九点半。影像科走廊新刷了漆，CT室门口的红地垫还没踩脏。你在新打卡机前站了两秒——连打卡机都换了。', effect: { flag: 'c2_started' }, next: 'c2n1_1' },
  c2n1_1: { speaker: 'sys', text: '「咔哒」——打卡成功。', sfx: 'stamp', effect: { gold: 50, ap: 3 }, next: 'c2n1_2' },
  c2n1_2: { speaker: 'tang', sprite: 'char_tang', sfx: 'vox_ch2_natural_tang', text: "哎，你来啦。（小唐把打卡机旁的纸箱挪开）今晚新CT头一回值夜班，护士长刚又打来电话问了一遍。", next: 'c2n1_3' },
  c2n1_3: { speaker: 'tang', sprite: 'char_tang', text: "厂家下午刚撤场。机房改造、交货、验收，去年说「下个月到」的话，听了一年。真启用了，老周又把夜间报修电话挨个问了一遍——比问机器多少钱还仔细。", next: 'c2n1_4' },
  c2n1_4: { speaker: 'zhou', sprite: 'char_zhou', sfx: 'vox_ch2_natural_zhou_v2', text: "你来扫，我去泡杯茶。（老周朝值班室指了指）我就在隔壁，有事喊一声。", next: 'c2n1_5' },
  c2n1_5: { speaker: 'me', sprite: 'char_zhou', text: "（顺着他的目光看进CT室）圆孔里亮着灯。老周伸手去摸旧操作台的位置，摸了个空，转而替你把椅子往前推了一点。", next: 'c2n1_6' },
  c2n1_6: { speaker: 'zhou', sprite: 'char_zhou', text: "老CT去年春天烧了球管，一直趴窝。停产配件没等来，倒等来这台新机。（他拍了拍你的肩）去年那张处置单，老范收着。开诊前去转转吧。", next: 'c2n1_hub' },
  c2n1_hub: { bg: 'bg_ctcontrol', speaker: 'sys', text: '【自由行动 · 行动力⚡×3】', choices: [
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
  c2n1_ab2: { speaker: 'fan', sprite: 'char_fan', sfx: 'vox_ch2_natural_fan_a', text: "才三天，就坏了。（老范蹲着收拾零件）上个月白班忙，让它顶了两天。第三天中午烧的，老白那根半价球管。", next: 'c2n1_ab3' },
  c2n1_ab3: { speaker: 'fan', sprite: 'char_fan', text: '靶面熔了个坑，连带着把高压发生器也撂倒了。老白？电话停机，人找不着。院里立了项，**设备科资质核查，这批第三方件的账，一笔一笔过**。', next: 'c2n1_ab4' },
  c2n1_ab4: { speaker: 'me', sprite: 'char_fan', text: "（摸出手机，翻到老白的聊天记录。最后一句还是「放心，用坏了找我」。）", next: 'c2n1_ab5' },
  c2n1_ab5: { speaker: 'fan', sprite: 'char_fan', text: "（把烧坏的零件放进盒子）聊天记录别删，设备科要留底。……搭把手，这箱挺沉。", effect: { skill: 1, flag: 'bai_echo' }, next: 'c2n1_ab6' },
  c2n1_ab6: { speaker: 'sys', text: "老范把箱子盖好：「别跟那台坏CT弄混了。旧CT已经拆机移交；CR停下来以后，普通拍片走楼上DR，夜间门禁和值班也都接上了。」你帮他把箱子推回库房。", effect: { flag: 'c2n1_a' }, next: 'c2n1_old_ct' },
  // —— A. 老伙计（没买的分支） ——
  c2n1_an1: { bg: 'bg_corridor_cr_covered', speaker: 'sys', text: "走廊尽头的凹位里，老CR读片器罩着防尘布。老范把它往里推了推，给通道腾出地方：「退役设备都得进库，主任还舍不得。」", effect: { ap: -1 }, next: 'c2n1_an2' },
  c2n1_an2: { speaker: 'fan', sprite: 'char_fan', sfx: 'vox_ch2_natural_fan_b', text: "这台先留着吧。（老范停下脚步）原厂那根管子一直用到停用。主任说先不卖废铁，封在这儿。", next: 'c2n1_an3' },
  c2n1_an3: { speaker: 'me', sprite: 'char_fan', text: "我指了指CT室：「那台坏CT呢？」老范说：「早拆机移交了。这台是拍平片的CR，两码事。楼上DR现在夜里也开了，才提前让它歇。」", effect: { heart: 1 }, next: 'c2n1_an4' },
  c2n1_an4: { speaker: 'sys', text: '你替它把防尘布的角掖好，回到CT室门口。', effect: { flag: 'c2n1_a' }, next: 'c2n1_old_ct' },
  c2n1_old_ct: { speaker: 'fan', sprite: 'char_fan', text: '（老范翻出拆机前的照片）这才是那台**进口64排CT**。去年春天坏了，一直等配件，最后走报废流程拆走了。现在屋里这台，是**国产128排**。', image: 'ev_old_ct_retired', next: 'c2n1_old_ct_price' },
  c2n1_old_ct_price: { speaker: 'me', sprite: 'char_fan', text: '排数翻一倍，价钱呢？', next: 'c2n1_old_ct_reply' },
  c2n1_old_ct_reply: { speaker: 'fan', sprite: 'char_fan', text: '我翻过当年的采购单，跟这次成交价差不多。不过隔了这么多年，配置也不一样，别光拿排数除价钱。（他收起照片）这回备件多久到，我可是问了三遍。', next: 'c2n1_hub' },
  // —— B. 小凯交底 ——
  c2n1_b1: { speaker: 'kai', sprite: 'char_kai', sfx: 'vox_ch2_natural_kai_noref_b_v9', text: "跟你说个事儿。（小凯指了指墙上的表）日检和预热的步骤都贴这儿了。报警看不明白，拍给我，别反复点确认。", card: 'ct_tube_heat', effect: { ap: -1 }, next: 'c2n1_b2' },
  c2n1_b2: { speaker: 'me', sprite: 'char_kai', text: '（指着机架里那个黑色小盒子）这些线连着的，是干什么的？', image: 'ch2_remote_rack', next: 'c2n1_b3' },
  c2n1_b3: { speaker: 'kai', sprite: 'char_kai', text: "**远程支持终端**，往厂家传运行日志和报错码。哪儿快坏了，我们提前备件。免费装，省得你半夜举着手机给我念报错。", image: 'ch2_remote_rack', next: 'c2n1_b4' },
  c2n1_b4: { speaker: 'sys', text: '【怎么接？】', sprite: 'char_kai', choices: [
    { text: '「回传的都是设备数据？病人的图呢？」', next: 'c2n1_b5a', effect: { skill: 1, flag: 'remote_asked' }, tag: 'good' },
    { text: '「好东西，以后省心。」', next: 'c2n1_b5b' },
    { text: '（帮他抬箱子上推车）', next: 'c2n1_b5b', effect: { gold: 30, heart: 1 }, risk: { chance: 0.3, next: 'c2n1_b5c', effect: { ap: -1 } } },
  ]},
  c2n1_b5a: { speaker: 'kai', sprite: 'char_kai', text: "设备通道，安装单上这么写的。你问到具体字段，我还真不能拍胸脯。（他在名片背面记了一笔）我找片区同事要清单，给你们信息科核，别光听我一句「放心」。", next: 'c2n1_b6' },
  c2n1_b5b: { speaker: 'kai', sprite: 'char_kai', text: "名片拿着，撤场后归片区同事管。有事先打电话。这台机柜先别碰，拆出一箱多余螺丝，我也没法交差。", next: 'c2n1_b6' },
  c2n1_b5c: { speaker: 'sys', text: '箱子一歪，里面的线材散了一地。你陪他重新理了二十分钟线，他直乐：「夜班大将，手上活儿不错，就是运气差点。」', next: 'c2n1_b5b' },
  c2n1_b6: { speaker: 'sys', text: '小凯推着最后一个纸箱走了。控制室彻底安静下来，只剩机架待机的低鸣。', effect: { flag: 'c2n1_b' }, next: 'c2n1_hub' },
  // —— E. 走廊转转 · 小雷 ——
  c2n1_e1: { speaker: 'lei', sprite: 'char_lei', sfx: 'vox_ch2_natural_lei_v2', text: "新机器接入PACS了。今晚直接在工作站看。（小雷松开鼠标，甩了甩手）我去把线号贴完。", effect: { ap: -1 }, next: 'c2n1_e2' },
  c2n1_e2: { speaker: 'lei', sprite: 'char_lei', text: "那台远程终端的线是我接的，**单独走的一条外网**，有主任签字。线路我认得，里面传什么还得核字段。别到时候都来问我——插网线又不是盖章。", effect: { flag: 'lei_cable' }, next: 'c2n1_e3' },
  c2n1_e3: { speaker: 'sys', text: "小雷把一张线号标签贴歪了，揭下来重贴。走到电梯口，他又折回去拍了张接口照片。黑盒子的网口灯还在闪。", effect: { flag: 'c2n1_e' }, next: 'c2n1_hub' },
  // —— C. 茶水间 · 小唐八卦 ——
  c2n1_c1: { bg: 'bg_breakroom', speaker: 'sys', text: '茶水间的灯坏了一半，小唐正踮着脚够橱柜顶上的速溶咖啡。', effect: { ap: -1 }, next: 'c2n1_c2' },
  c2n1_c2: { speaker: 'tang', sprite: 'char_tang', text: '哎，正好！帮我够一下——欸，听说没？新CT才用三天，白班预约已经排到下下周了。B超室眼红得不行，背地里管咱那台机器叫「**印钞机**」。', next: 'c2n1_c3' },
  c2n1_c3: { speaker: 'sys', text: '【怎么接？】', sprite: 'char_tang', choices: [
    { text: '「印钞机也得有人半夜喂它。」', next: 'c2n1_c4a', effect: { heart: 1 } },
    { text: '（把刚买的奶茶递过去）「茶话会入会费。」', next: 'c2n1_c4b', cond: { item: 'milktea' }, effect: { loseItem: 'milktea' }, tag: 'good' },
    { text: '（帮她踮脚够咖啡罐）', next: 'c2n1_c4c', risk: { chance: 0.35, next: 'c2n1_c4d', effect: { ap: -1 } } },
  ]},
  c2n1_c4a: { speaker: 'tang', sprite: 'char_tang', text: "可不！它吃电，咱吃剩饭。主任倒是提了，照这个量，明年可能申请第二台。我先问能不能多配两个人，护士长让我别做梦。", next: 'c2n1_chat0' },
  c2n1_c4b: { speaker: 'tang', sprite: 'char_tang', text: '（接过奶茶，眼睛一亮）上道！……那我跟你说个真格的：**设备科老范跟老周是三十年的老搭档**，当年那台老X光机就是他俩一起装的。老白那批便宜球管的事，设备科盯了不是一天两天了——你就等着看吧。', effect: { heart: 1 }, next: 'c2n1_chat0' },
  c2n1_c4c: { speaker: 'tang', sprite: 'char_tang', text: "（接过咖啡罐）欸，下午老周在机房里站了半天。我问他是不是舍不得老机器，他问我：夜里停机，病人往哪儿送？……你说这人，聊天都能聊出张排班表。", next: 'c2n1_chat0' },
  c2n1_c4d: { speaker: 'sys', text: '罐子一歪，半罐咖啡粉撒进了水槽。你俩蹲着擦了十五分钟地，小唐笑得直不起腰：「这就算夜班开光的仪式感吧。」', next: 'c2n1_chat0' },
  c2n1_c5: { speaker: 'sys', text: '纸杯见底，八卦听完。回CT室的路上，你的脚步轻快了些。', effect: { flag: 'c2n1_c' }, next: 'c2n1_hub' },
  // —— 开诊主线：坠床的老人 ——
  c2n1_m0: { speaker: 'sys', text: '晚上十点，分诊铃响。急诊小何推着平车一路小跑。', sfx: 'ring', next: 'c2n1_m1' },
  c2n1_m1: { speaker: 'he', sprite: 'char_he', sfx: 'vox_ch2_natural_he_v2', text: "老爷子夜里坠床，要拍头颅CT。（小何跟着平车进门）养老院送来的，头磕在床头柜上。现在叫不太醒，瞳孔也不太对称，急诊那边催着呢。", next: 'c2n1_m2' },
  c2n1_m2: { speaker: 'sys', text: '【开单科室问：做平扫还是直接增强？】', sprite: 'char_he', choices: [
    { text: '「先平扫，快。」', next: 'c2n1_m3a', effect: { skill: 1 }, tag: 'good' },
    { text: '「直接增强吧，看得更清楚。」', next: 'c2n1_m3b', effect: { skill: -1, flag: 'c2n1_wrong1' } },
  ]},
  c2n1_m3a: { speaker: 'me', sprite: 'char_he', text: "先平扫看有没有出血。小何，机房准备好了，推过来吧。", card: 'plain_first', next: 'c2n1_m4' },
  c2n1_m3b: { speaker: 'zhou', sprite: 'char_zhou', text: "先别加项目。这位先做头颅平扫，我看完再说。申请单给我。", card: 'plain_first', next: 'c2n1_m4' },
  c2n1_m4: { bg: 'bg_ctroom', speaker: 'sys', text: 'CT室。老人被抬上检查床。你走进控制室，操作界面是全新的——没有旋钮，全是触摸屏。', next: 'c2n1_m5' },
  c2n1_m5: { bg: 'bg_ctcontrol', speaker: 'tang', sprite: 'char_tang', text: '（小声）这机器扫一次多快？', next: 'c2n1_m6' },
  c2n1_m6: { speaker: 'me', sprite: 'char_tang', text: "零点几秒转一圈。你看，床也在走——**一边转、一边进床，就是螺旋扫描**。别光顾着看机器，看着点老人。", card: 'helical_intro', next: 'c2n1_m7' },
  c2n1_m7: { bg: 'bg_ctcontrol', speaker: 'sys', text: '定位像确认，范围设好。检查床缓缓移动，机架开始采集，工作站等着接收数据。', next: 'c2n1_m8' },
  c2n1_m8: { speaker: 'zhou', sprite: 'char_zhou', text: "这一层，骨头和脑子能分开看了。去年拍普通片总说东西叠着，这回咱一层层找。", image: 'ct_head_hema', card: 'ct_tomography', next: 'c2n1_m9' },
  c2n1_m9: { speaker: 'zhou', sprite: 'char_zhou', text: "角落这个数是**CT值，单位HU**。水是0，空气约-1000。血和脑组织差得没那么大，得调窗。", image: 'ct_head_hema', card: 'hu_scale', next: 'c2n1_m10' },
  c2n1_m10: { speaker: 'zhou', sprite: 'char_zhou', text: "先试**窗宽80、窗位30**。一个管显示范围，一个管中心位置。你动手调，比听我念快。", image: 'ct_head_hema', card: 'brain_window', next: 'c2n1_m11' },
  c2n1_m11: { speaker: 'zhou', sprite: 'char_zhou', text: '拖吧。把窗口拖到「该看的东西」身上。', image: 'ct_head_hema', windowTask: { image: 'ct_head_hema', targetW: 80, targetL: 30, tolW: 30, tolL: 15, success: 'c2n1_w1ok', stage: 1 }, next: 'c2n1_w1ok' },
  c2n1_w1ok: { speaker: 'sys', text: '你把鼠标停在屏幕右边。老周点点头：「这片沿着内板的白影，再换个窗口比一比。」', image: 'ct_head_hema', next: 'c2n1_w2' },
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
  c2n1_d3: { speaker: 'sys', text: "平车呼啸而去。从进门到图像出来，十一分钟。小何跑出几步又折回来，拎走了床边那双拖鞋：「老爷子的，别弄丢了。」", next: 'c2n1_d4' },
  c2n1_d4: { speaker: 'zhou', sprite: 'char_zhou', text: "（朝电梯看了一眼）去年碰上这事，得先联系车，把人送出去查。……图传好了？行，第一扫，及格。那张报修电话表别收进抽屉，贴外头。", effect: { badge: 'first_ct' }, event: 'ch2_first_scan', next: 'c2n1_gap_chair' },
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
  c2n1_p_scan: { bg: 'bg_ctcontrol', speaker: 'sys', text: "小伙子躺稳后，检查床缓缓进到机架里。采集开始，工作站接收泌尿系平扫数据。", next: 'c2n1_p3' },
  c2n1_p3: { speaker: 'sys', text: "你留住了这一层。老周接过鼠标，沿着前后几层继续追，再打开测量工具。", image: 'ct_ch2_stone_v2', next: 'c2n1_p4' },
  c2n1_p4: { speaker: 'zhou', sprite: 'char_zhou', text: "就在这儿。大小得用测量工具量，位置和上游情况也要一起看，泌尿外科要这些。", image: 'ct_ch2_stone_v2', next: 'c2n1_p5' },
  c2n1_p5: { speaker: 'stone', sprite: 'pat_stone', text: "（缓过来一点，凑近屏幕）就这么一小粒？我还以为里面卡了块砖。", next: 'c2n1_p6' },
  c2n1_p6: { speaker: 'me', sprite: 'pat_stone', text: "（把图传回急诊）图和报告一起送过去了，小何带你回去接着处理。……这张放大了，别拿屏幕量石头。", effect: { gold: 80 }, next: 'c2n1_s1' },
  // —— 收束 ——
  c2n1_s1: { bg: 'bg_ctcontrol', speaker: 'sys', text: "凌晨四点，你顺手去拿登记本，摸到的是新扫码枪。老周正在填电子记录，光标停在姓名栏。他没催你收拾，先把这一条存好了。", next: 'c2n1_s2' },
  c2n1_s2: { speaker: 'zhou', sprite: 'char_zhou', text: "（听见「登记本」，老周手一顿）电子的，也得有人登记才算数。……去年少的那页，医务科这回要把后续核完。主任叫咱们周一早点到。", effect: { heart: 1, flag: 'paperless' }, event: 'ch2_ct_open', next: 'c2n1_s3' },
  c2n1_s3: { speaker: 'sys', text: '【今夜结算】诊疗收入 +300 金币。第1夜 ·「新机」——完。', effect: { gold: 300, ap: -99 }, end: true },
}

/* ================= 第2日「窗口」（白班 · 轻量候诊队列） ================= */
const C2D2_QUEUE0 = [
  { name: '复查大爷 · 肺结节', tag: '门诊' },
  { name: '候诊大爷 · 门诊复查', tag: '门诊' },
  { name: '手腕摔伤学生', tag: '门诊' },
]
const C2D2_QUEUE1 = [
  { name: '复查大爷 · 肺结节', tag: '门诊', note: '检查中' },
  { name: '候诊大爷 · 门诊复查', tag: '门诊' },
  { name: '手腕摔伤学生', tag: '门诊' },
]
const C2D2_QUEUE2 = [
  { name: '腹痛小伙 · 疑肠梗阻', tag: '急诊', note: '插单' },
  { name: '候诊大爷 · 门诊复查', tag: '门诊' },
  { name: '手腕摔伤学生', tag: '门诊' },
]
const C2D2_QUEUE3 = [
  { name: '候诊大爷 · 门诊复查', tag: '门诊', note: '已等五十分钟' },
  { name: '手腕摔伤学生', tag: '门诊' },
  { name: '住院加急 · 术后复查', tag: '加急', note: '电梯口' },
  { name: '车祸伤患者', tag: '急诊', note: '预计十分钟后到' },
]
const C2D2_QUEUE4 = [
  { name: '车祸伤患者', tag: '急诊', note: '检查中' },
  { name: '候诊大爷 · 门诊复查', tag: '门诊' },
  { name: '手腕摔伤学生', tag: '门诊' },
  { name: '住院加急 · 术后复查', tag: '加急' },
]

const C2D2: Record<string, Step> = {
  ...CH2_SOCIAL_STEPS.c2d2,
  ...CH2_PACING_STEPS.c2d2,
  c2d2_0: { bg: 'bg_ctcontrol_day', speaker: 'sys', text: '三天后，周一。主任把你从夜班临时调来支援白班：新CT的名声传开了，门诊开单量翻倍，候诊长队从CT室门口排到电梯间。', next: 'c2d2_1' },
  c2d2_1: { speaker: 'director', sprite: 'char_director', sfx: 'vox_ch2_natural_director_v2', text: "年轻人，动作快起来！（主任朝候诊区看了一眼）队列你先接着，急诊来了叫我。", effect: { flag: 'day_shift' }, queue: C2D2_QUEUE0, next: 'c2d2_reg0' },
  c2d2_reg0: { bg: 'bg_office_day', speaker: 'director', sprite: 'char_director', text: "开诊前，先说一件事。去年登记本少的那页，检查记录补齐了，后续办法却一直悬着。这次市里专项督查到院，医务科要核清。老周，材料你带来了吧？", next: 'c2d2_reg1' },
  c2d2_reg1: { speaker: 'zhou', sprite: 'char_zhou', text: '页是我撕的。老人没证件，也没钱，我先给他拍了，没走登记申请。后来怕查，又想把这事盖过去。……不是这孩子的主意。', next: 'c2d2_reg2' },
  c2d2_reg2: { speaker: 'sys', text: '主任转向你，等你把自己知道的说清楚。', choices: [
    { text: '「那晚我在，后来也帮着拍了。经过我可以补。」', next: 'c2d2_reg3', cond: { flag: 'n5_cover' } },
    { text: '「我只说自己能确认的部分，其他请周师傅补。」', next: 'c2d2_reg3', cond: { notFlag: 'n5_cover' } },
  ] },
  c2d2_reg3: { speaker: 'director', sprite: 'char_director', text: '照实写。不是追那几张片子的钱，是人没登记、申请没留、报告最后交给谁也没记。明天他再来，谁接得上？', next: 'c2d2_reg4' },
  c2d2_reg4: { speaker: 'zhou', sprite: 'char_zhou', text: "（把折了几折的情况说明摊平）我认得他，别人不认得。我歇班那天，他要再来，总不能在门口等我。临时身份这栏，我跟急诊再核一遍。", next: 'c2d2_reg5' },
  c2d2_reg5: { speaker: 'director', sprite: 'char_director', text: '我当时没把后面的路落实，这个责任我认。急诊临时身份先建，检查和报告跟着走，手续后补；困难救助谁受理，也得写清。今天起按新办法办。', effect: { flag: 'ch2_registration_resolved' }, event: 'ch2_registration', next: 'c2d2_reg6' },
  c2d2_reg6: { speaker: 'sys', text: '门缝里探进小唐的脑袋：「两分钟到。外头大爷已经看了三遍挂钟了。」主任收起材料：「走，先接人。」', next: 'c2d2_2' },
  c2d2_2: { bg: 'bg_waiting', speaker: 'sys', text: '【白班队列】预约病人按号排，急诊/住院随时「插单」。让危重等太久，是要出事的。', queue: C2D2_QUEUE0, next: 'c2d2_3' },
  c2d2_3: { bg: 'bg_ctcontrol_day', speaker: 'sys', text: "第一位是来复查肺结节的大爷。去年体检发现，医嘱半年复查。旧片袋的口子用胶带补了三层，他递过来还不松手：「上回那张也看看，别光看新的。」", queue: C2D2_QUEUE1, next: 'c2d2_lung_scan' },
  c2d2_lung_scan: { bg: 'bg_ctcontrol_day', speaker: 'sys', text: "大爷按提示屏住气。胸部数据开始传进工作站，重建列表里先排着默认的厚层序列。", next: 'c2d2_4' },
  c2d2_4: { speaker: 'me', text: '（翻旧报告）上回记的是一枚小结节……等等，今天的厚层图像上，它**时有时无**，有几层根本看不见。', image: 'ct_lung', queue: C2D2_QUEUE1, next: 'c2d2_5' },
  c2d2_5: { speaker: 'sys', text: '【怎么回事？】', image: 'ct_lung', queue: C2D2_QUEUE1, choices: [
    { text: '「对比去年的片子，结节确实吸收了，半年后再说吧。」', next: 'c2d2_6a', effect: { skill: -1 } },
    { text: '「这套层厚太厚了，先用原始数据重建薄层。」', next: 'c2d2_6b', effect: { skill: 2 }, tag: 'good' },
    { text: '「窗口没调好——换个窄窗再仔细看看。」', next: 'c2d2_6c', effect: { skill: -1 } },
  ]},
  c2d2_6a: { speaker: 'zhou', sprite: 'char_zhou', text: "先别写吸收。你现在开的是5mm厚层，小结节混在里面不显眼。原始数据还在，先重建一套薄层看看。", card: 'slice_partial', image: 'ct_lung', next: 'c2d2_w1' },
  c2d2_6b: { speaker: 'me', text: "厚层把周围组织混到一块儿了。原始数据还在，先做**1mm薄层重建**，不用马上把大爷叫回来重扫。", card: 'slice_partial', image: 'ct_lung', next: 'c2d2_w1' },
  c2d2_6c: { speaker: 'zhou', sprite: 'char_zhou', text: "窗可以调，但这次先查层厚。薄层数据还在，重建一套再比。别急着按曝光键。", card: 'slice_partial', image: 'ct_lung', next: 'c2d2_w1' },
  c2d2_w1: { speaker: 'sys', text: '薄层重建完成。老周敲敲屏幕：「**窗口调到肺窗，亲手把那枚『消失』的结节给我找出来。**」', image: 'ct_lung', windowTask: { image: 'ct_lung', targetW: 1500, targetL: -500, tolW: 220, tolL: 60, success: 'c2d2_w1ok' }, next: 'c2d2_w1ok' },
  c2d2_w1ok: { speaker: 'sys', text: '老周把这一层和旧片并排放好，又翻过前后相邻的几层。不是结节跟人捉迷藏，是刚才那组图把它藏住了。', image: 'ct_lung', next: 'c2d2_7' },
  c2d2_7: { speaker: 'uncle', sprite: 'pat_uncle2', text: "哦，这回看清了。（大爷凑近薄层重建的图，手指悬在屏幕前）去年说看不见，我还当它没了。", effect: { gold: 80 }, image: 'ct_lung', next: 'c2d2_gap_shift' },
  c2d2_8: { bg: 'bg_waiting', speaker: 'sys', text: '【队列事件】急诊插单：「腹痛待查，怀疑肠梗阻，加急！」——前面还有两位门诊病人在等。', queue: C2D2_QUEUE2, sfx: 'ring', choices: [
    { text: '按规矩，急重症优先，立刻插队。', next: 'c2d2_9a', effect: { heart: 1 }, tag: 'good' },
    { text: '让他按号排，先来后到。', next: 'c2d2_9b', effect: { heart: -1, flag: 'queue_wait' } },
  ]},
  c2d2_9a: { speaker: 'sys', text: "你跟候诊的大爷大妈挨个解释，多数人都点头：「疼成这样，先看他的吧。」队列重排，机房没有空转一分钟。", queue: C2D2_QUEUE2, next: 'c2d2_gut_scan' },
  c2d2_9b: { speaker: 'guy', sprite: 'pat_gut', sfx: 'vox_guy', text: '（四十分钟后才轮到他，已经疼得蜷在椅子上）疼死我了……急诊电话追过来，小何的声音不太好听：「肠梗阻等四十分钟？下次我让病人自己爬上去？」', queue: C2D2_QUEUE2, next: 'c2d2_gut_scan' },
  c2d2_gut_scan: { bg: 'bg_ctcontrol_day', speaker: 'sys', text: "急诊团队把腹痛病人送上床。你启动确认好的方案，工作站开始接收腹部数据。", next: 'c2d2_10' },
  c2d2_10: { bg: 'bg_ctcontrol_day', speaker: 'me', text: "刚才的肺窗还没切回来，难怪看着别扭。换**腹窗**，肠管和周围组织才好分。图传给急诊。", image: 'ct_abdomen', card: 'window_advanced', next: 'c2d2_gap_food' },
  // —— 队列事件2 ——
  c2d2_q0: { bg: 'bg_waiting', speaker: 'sys', text: '【队列事件】候诊区炸锅了：一位等了五十分钟的大爷拍着分诊台喊「再不上就投诉」；住院部电话同时进来：「术后复查的病人已经推到电梯口」；分诊台又喊：「**120刚出发，车祸伤，十分钟后到！**」', queue: C2D2_QUEUE3, sfx: 'ring', choices: [
    { text: '「先接电梯口那位术后加急，车祸伤一到直接进机房——大爷这边我亲自去解释，下一个门诊号就是他。」', next: 'c2d2_gap_lift', effect: { heart: 1 }, tag: 'good' },
    { text: '「大爷等得最久，先给他做——术后的回病房再等等。」', next: 'c2d2_q1b', effect: { flag: 'queue_wait' } },
    { text: '「都别催，机器就一台，按号来，车祸伤到了也得先登记拿号。」', next: 'c2d2_q1c', effect: { heart: -1, flag: 'queue_wait' } },
  ]},
  c2d2_q1a: { speaker: 'sys', text: '大爷哼了一声，把投诉电话挂了。术后加急查完，病房护士接回患者和图像。小唐看了眼门口，救护车还没到。', queue: C2D2_QUEUE3.filter(patient => !patient.name.startsWith('住院加急')), next: 'c2d2_gap_phone' },
  c2d2_q1b: { speaker: 'sys', text: "大爷刚进机房，病房护士的电话就追来了：「加急那位还在电梯口等呢，到底送哪儿？」小唐隔着玻璃冲你招手。等大爷查完，你赶紧腾出机房接急诊。", queue: C2D2_QUEUE3.filter(patient => !patient.name.startsWith('候诊大爷')), next: 'c2d2_gap_phone' },
  c2d2_q1c: { speaker: 'sys', text: "小唐把你拉到一边：「车祸伤快到了，不能让他排普通号。」你腾出机房，大爷也把椅子往旁边挪：「早说啊，路给你们让出来。」", queue: C2D2_QUEUE3, next: 'c2d2_gap_phone' },
  // —— 第三例：车祸伤 ——
  c2d2_t0: { bg: 'bg_ctcontrol_day', speaker: 'sys', text: "车祸伤到了。救护车上还没核出姓名，急诊先建了临时身份，检查和报告跟着同一个号走。小唐递单时低声说：「这回不用找谁点头了。」团队确认了头颅及腹部检查方案。", queue: C2D2_QUEUE4, next: 'c2d2_trauma_scan' },
  c2d2_trauma_scan: { bg: 'bg_ctcontrol_day', speaker: 'sys', text: "医护完成准备，先后按头颅和腹部方案采集。数据送往工作站重建，抢救室的电话一直没有挂。", next: 'c2d2_t1' },
  c2d2_t1: { speaker: 'sys', text: "联合扫描完成，图像传到工作站。值班医师拉过椅子逐层查看，电话另一头，抢救室还在等结果。", image: 'ct_abdomen_trauma', queue: C2D2_QUEUE4.map(patient => patient.name === '车祸伤患者' ? { ...patient, note: '图像已传出' } : patient), next: 'c2d2_t2' },
  c2d2_t2: { speaker: 'sys', text: '抢救室来电话致谢：「多发伤十分钟出全图，这机器真是买值了。」候诊区的大爷也朝你竖了竖大拇指——投诉的事，再没人提。', effect: { heart: 1, gold: 60 }, queue: C2D2_QUEUE4.filter(patient => patient.name !== '车祸伤患者'), next: 'c2d2_gap_pen' },
  c2d2_11: { bg: 'bg_ctcontrol_day', speaker: 'sys', text: "手腕摔伤的学生终于叫到了号。他用左手收起没写完的作业：「明天还得交，能给我证明不是偷懒吗？」普通片仍有疑点，医师申请了腕部CT；你先把上一位的检查关掉，确认腕部协议。", next: 'c2d2_wrist_scan' },
  c2d2_wrist_scan: { bg: 'bg_ctcontrol_day', speaker: 'sys', text: "学生把伤腕放稳。检查床移动到采集位置，工作站开始接收腕部数据。", next: 'c2d2_wrist_result' },
  c2d2_wrist_result: { speaker: 'zhou', sprite: 'char_zhou', text: '图到了。先试骨窗，别把骨头调成一团白。', image: 'ct_wrist_simulated', next: 'c2d2_w2' },
  c2d2_w2: { speaker: 'sys', text: "【腕部调窗】调调窗宽和窗位，看看骨头里面的层次。", image: 'ct_wrist_simulated', windowTask: { image: 'ct_wrist_simulated', targetW: 4000, targetL: 250, tolW: 400, tolL: 80, success: 'c2d2_w2ok' }, next: 'c2d2_w2ok' },
  c2d2_w2ok: { speaker: 'zhou', sprite: 'char_zhou', text: "嗯，这样层次出来了。把这组留着，我再翻翻相邻几层。", image: 'ct_wrist_simulated', next: 'c2d2_lunch0' },
  // —— 下午收梢 ——
  c2d2_p1: { bg: 'bg_ctcontrol_day', speaker: 'sys', text: "一下午，电话没停过。你刚排好三个号，小唐又从门缝里递进来一张加急单。", next: 'c2d2_p2' },
  c2d2_p2: { speaker: 'tang', sprite: 'char_tang', text: "（下班前探头）还坐着呢？我喊你两遍了。饭再不拿，微波炉都下班了。", next: 'c2d2_p3' },
  c2d2_p3: { speaker: 'sys', text: '【本日结算】白班补贴 +200 金币。第2日 ·「窗口」——完。', effect: { gold: 200, ap: -99 }, end: true },
}

/* ================= 第3夜「快」 ================= */
const C2N3: Record<string, Step> = {
  ...CH2_SOCIAL_STEPS.c2n3,
  ...CH2_PACING_STEPS.c2n3,
  c2n3_0: { bg: 'bg_ctcontrol', speaker: 'sys', text: "晚上九点半。白班的人走了，分诊台上的纸条倒越贴越多。新登记办法的联系人旁边，多了一张计时表；小唐正找地方贴，差点盖住报修电话。", next: 'c2n3_1' },
  c2n3_1: { speaker: 'sys', text: '「咔哒」——打卡成功。', sfx: 'stamp', effect: { gold: 50, ap: 3 }, next: 'c2n3_2' },
  c2n3_2: { speaker: 'tang', sprite: 'char_tang', text: "（把计时表往旁边挪）这张也归咱们盯了：**卒中绿道，DNT**。护士长说不能让时间耗在咱这儿。我问她能不能先把这只慢两分钟的钟换了。", next: 'c2n3_3' },
  c2n3_3: { speaker: 'me', sprite: 'char_tang', text: 'DNT？', next: 'c2n3_4' },
  c2n3_4: { speaker: 'tang', sprite: 'char_tang', text: "就是进院到打上溶栓药用了多久。**DNT**。急诊那边一直计时，咱这儿得赶紧把图送过去，不能让人空等。", card: 'stroke_dnt', next: 'c2n3_hub' },
  c2n3_hub: { bg: 'bg_ctcontrol', speaker: 'sys', text: '【自由行动 · 行动力⚡×3】', choices: [
    { text: '走廊 · 雯雯加班（⚡-1）', next: 'c2n3_a1', cond: { notFlag: 'c2n3_a', ap: 1 } },
    { text: '值班室翻书《CT夜班二十页》', next: '@book2' },
    { text: '小卖部', next: '@shop' },
    { text: '跟小唐打听八卦（⚡-1）', next: 'c2n3_d1', cond: { notFlag: 'c2n3_d', ap: 1 } },
    { text: '工作站旁 · 找小雷聊两句（⚡-1）', next: 'c2n3_chat0', cond: { notFlag: 'c2n3_chat_done', ap: 1 } },
    { text: '请小何吃关东煮（⚡-1）', next: 'c2n3_k1', cond: { notFlag: 'c2n3_k', item: 'snack', ap: 1 } },
    { text: '翻翻自己买的那本二手《医学影像学》', next: 'c2n3_bk1', cond: { notFlag: 'c2n3_bk', item: 'book' } },
    { text: '【开诊】值守CT室', next: 'c2n3_m0', tag: 'good' },
  ]},
  // —— A. 雯雯 · 维保合同 ——
  c2n3_a1: { bg: 'bg_corridor', speaker: 'wen', sprite: 'char_wen', sfx: 'vox2_wen', text: "哎，技师老师！加班加到十点的销售见过没？陪你们科主任磨了一下午**维保合同**——新机器第一年免费保，第二年开始，全保、半保、技保，价格差着好几万呢。", effect: { ap: -1 }, next: 'c2n3_a2' },
  c2n3_a2: { speaker: 'wen', sprite: 'char_wen', text: "（抽出一页草案）球管这笔钱最容易吵架。我给你们加了**按曝光次数计价、超支封顶**，记得让设备科把适用条件看完，别只看总价。", image: 'ev_maintenance_draft', effect: { flag: 'maintenance_draft' }, next: 'c2n3_a3' },
  c2n3_a3: { speaker: 'sys', text: '【闲聊两句？】', sprite: 'char_wen', choices: [
    { text: '「你们那个远程终端，数据都回传什么？」', next: 'c2n3_a4a', effect: { flag: 'wen_remote' } },
    { text: '「销售做到晚上十点，你们也真拼。」', next: 'c2n3_a4b', effect: { heart: 1 } },
    { text: '（帮她把文件搬上电梯）', next: 'c2n3_a4b', effect: { gold: 20, heart: 1 }, risk: { chance: 0.3, next: 'c2n3_a4c' } },
  ]},
  c2n3_a4a: { speaker: 'wen', sprite: 'char_wen', text: '（笑）设备数据呗，球管、机架、报错码。……不过说实话，**合同里那条「数据服务」的条款，我们法务改了三版**，你们信息科要是较真，让他们把附件三逐条过一遍。我能说的就这么多。', next: 'c2n3_chat_wen_q' },
  c2n3_a4b: { speaker: 'wen', sprite: 'char_wen', text: '设备进院只是开始，往后十年的维保、升级、扯皮，都是生意。……对了，你们科主任下午问「远程质控服务」的事，那可是我们今年主推的新业务。', next: 'c2n3_chat_wen_q' },
  c2n3_a4c: { speaker: 'sys', text: '最上面一份文件滑进电梯缝，你俩趴地上捞了半天。她笑你：「影像科的腰也不行啊。」', next: 'c2n3_a4b' },
  c2n3_a5: { speaker: 'sys', text: '电梯门合上。你抱着手臂看了一会儿大厅的灯，回到CT室。', effect: { flag: 'c2n3_a' }, next: 'c2n3_hub' },
  // —— D. 小唐八卦 ——
  c2n3_d1: { speaker: 'tang', sprite: 'char_tang', text: "今天神经内科那张头颅CT单，你看见没？去年问旧片的那个人，全自费。这回是头痛，神经内科医师开的平扫。单子都拿好了，他还在问片库有没有搬。", effect: { ap: -1 }, next: 'c2n3_d2' },
  c2n3_d2: { speaker: 'tang', sprite: 'char_tang', text: "我说没搬，他才肯把外套脱下来。新机装了几天他不知道，分诊台挪过位置，他一眼就看出来了。……我给他倒了杯水，也不知道喝没喝。", effect: { flag: 'c2n3_d' }, next: 'c2n3_hub' },
  // —— K. 关东煮 · 小何（买了零食礼包） ——
  c2n3_k1: { bg: 'bg_breakroom', speaker: 'sys', text: '你把小卖部买的零食礼包拆开——里面正好有两盒自热关东煮。开水一冲，香气混着海带味漫开，你端着它走向急诊分诊台。小何的眼睛亮得像看见了亲人。', effect: { ap: -1, loseItem: 'snack' }, next: 'c2n3_k2' },
  c2n3_k2: { speaker: 'he', sprite: 'char_he', text: "（烫得直哈气）夜班之神！……丸子先放这儿。那个找旧片的人又来了，问完片库搬没搬，还问我「以前管片库的人呢」。我哪知道以前是谁，让他等门诊医生回话。", next: 'c2n3_k3' },
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
  c2n3_m5: { bg: 'bg_ctcontrol', speaker: 'me', text: '定位像确认，头颅平扫开始。老人还不太安稳，小唐隔着玻璃留意着他。', dnt: 24, next: 'c2n3_m6' },
  c2n3_m6: { speaker: 'sys', text: '【这组图像有重影，接下来怎么办？】', image: 'ct_motion', dnt: 26, choices: [
    { text: '「图像能看，凑合用，抢时间。」', next: 'c2n3_m7a', effect: { skill: -1, flag: 'c2n3_wrong' } },
    { text: '「先请小唐帮着调整固定，只补扫受影响的范围。」', next: 'c2n3_m7b', effect: { skill: 2, badge: 'cool_head' }, tag: 'good' },
  ]},
  c2n3_m7a: { speaker: 'zhou', sprite: 'char_zhou', text: "这几层糊了，不能拿它排出血。先停一下，把头托和固定垫调整好，只补受影响的范围。", image: 'ct_motion', dnt: 29, next: 'c2n3_repeat_scan' },
  c2n3_m7b: { speaker: 'me', text: "先停一下，头托没放稳。小唐，帮我调整固定垫。（确认人员离开机房后，按医师意见补扫受影响的范围。）", dnt: 29, image: 'ct_motion', next: 'c2n3_repeat_scan' },
  c2n3_repeat_scan: { bg: 'bg_ctcontrol', speaker: 'sys', text: "头托与固定垫调整好，人员退出机房。你按确认的范围启动补扫，留意着新的数据进度。", next: 'c2n3_m8' },
  c2n3_m8: { speaker: 'sys', text: '新的平扫序列清楚多了。老周逐层核对：「**没看到明确出血。**早期缺血可能不显眼，还得接着看血管。」', image: 'ct_ch2_stroke_plain_v2', card: 'stroke_ct_sign', dnt: 33, next: 'c2n3_m9' },
  c2n3_m9: { speaker: 'zhou', sprite: 'char_zhou', text: "我把平扫结果报给卒中团队，**用药由他们评估**。CTA的准备接上。", dnt: 38, image: 'ct_ch2_stroke_plain_v2', next: 'c2n3_cta_scan' },
  c2n3_cta_scan: { bg: 'bg_ctcontrol', speaker: 'sys', text: "对比剂按方案团注。确认动脉强化，CTA开始采集，工作站准备重建血管图像。", next: 'c2n3_m10' },
  c2n3_m10: { speaker: 'me', text: "CTA图像重建出来了。老周核对患者方向，沿血管翻看完整序列，在**患者左侧大脑中动脉M1段**停住：「这一段中断了。」", image: 'ct_ch2_stroke_cta_v2', imageLabel: '冠状位血管重建｜画面右侧为患者左侧', card: 'cta_intro', dnt: 44, next: 'c2n3_m11' },
  c2n3_m11: { speaker: 'he', phone: 'char_he', text: '溶栓药已上！……M1段闭塞？！马上联系上级医院，**取栓绿道同步启动**——', dnt: 52, image: 'ct_ch2_stroke_cta_v2', imageLabel: '冠状位血管重建｜画面右侧为患者左侧', next: 'c2n3_m12' },
  c2n3_m12: { speaker: 'sys', text: '平车再次呼啸而去。你抬头看表——**从入院到给药，52分钟**。DNT达标。', effect: { badge: 'dnt_hero' }, event: 'ch2_stroke', dnt: 52, next: 'c2n3_m13' },
  c2n3_m13: { speaker: 'zhou', sprite: 'char_zhou', text: "（松开一直攥着的笔）图已经传过去了，转运那边也接上了。……我那杯茶呢，谁给挪了？", next: 'c2n3_gap_tea' },
  // —— 第二例：凌晨的胸痛 ——
  c2n3_h0: { speaker: 'sys', text: '凌晨三点半，分诊铃响了。急诊推进来一个人：**52岁男性，突发胸痛两小时，胸口像压了块磨盘，疼得攥着衣襟说不出整话，一身冷汗**。心电图：非特异性ST-T改变，没有动态演变。', sfx: 'ring', next: 'c2n3_h1' },
  c2n3_h1: { speaker: 'he', sprite: 'char_he', text: "心内科值班已经看过了。肌钙蛋白复查阴性，暂不能定性，**按中危继续评估**。他们想看冠脉，过来问咱们：这例适不适合先做CTA？", next: 'c2n3_h2' },
  c2n3_h2: { speaker: 'sys', text: '【CTA还是造影？——这个纠结，全写在心内科值班医生的脸上】', sprite: 'char_he', choices: [
    { text: '「先冠脉CTA：无创、一支静脉针的事，几分钟出全图，三支冠脉加钙化一目了然——先摸清情况再定。」', next: 'c2n3_h3a', effect: { skill: 2 }, tag: 'good' },
    { text: '「直接冠脉造影：金标准，查到狭窄当场放支架，一步到位。」', next: 'c2n3_h3b' },
    { text: '「先拍张胸片看看，别上来就大检查。」', next: 'c2n3_h3c', effect: { skill: -1 } },
  ]},
  c2n3_h3a: { speaker: 'me', sprite: 'char_he', text: "目前检查不支持高危，心内还要进一步评估冠脉。**CTA不用把导管送进血管**，能先看管腔和斑块；这例合不合适，请他们和周老师一起定。", card: 'cta_vs_dsa', next: 'c2n3_coronary_scan' },
  c2n3_h3b: { speaker: 'zhou', sprite: 'char_zhou', text: "造影得穿刺置管，能做检查，也能接介入治疗。但不是所有胸痛都直接进导管室。这例先让心内和我们把CTA方案定下来。", card: 'cta_vs_dsa', next: 'c2n3_coronary_scan' },
  c2n3_h3c: { speaker: 'zhou', sprite: 'char_zhou', text: "胸片看不清冠脉管腔。这回医师怀疑的是冠脉问题，不是拍张胸片就能排除；也别把所有胸痛都当成一条路。", next: 'c2n3_coronary_scan' },
  c2n3_coronary_scan: { bg: 'bg_ctcontrol', speaker: 'sys', text: "心内和影像科共同确认冠脉CTA方案，团队完成准备。心电同步采集开始，工作站等着接收冠脉数据。", next: 'c2n3_coronary_slices' },
  c2n3_h4: { speaker: 'sys', text: "老周回到原始薄层和沿血管走向的重组图，逐段核对。右冠状动脉中段见斑块，局部管腔明显变窄。他把对应位置标出来，传给心内科。", image: 'ch2_ct_coronary_slices', next: 'c2n3_h5' },
  c2n3_h5: { speaker: 'zhou', sprite: 'char_zhou', text: "这套**CTA看管腔和斑块**，不能替人把血管打通。要不要进导管室处理，心内结合其他检查定。图传过去吧。", image: 'ct_coronary_cta', next: 'c2n3_h6' },
  c2n3_h6: { speaker: 'sys', text: "心内科接走病人和图像。你看了眼表，三点五十二分。小唐把刚泡好的茶推过来：「别问，新的。」", effect: { gold: 100 }, next: 'c2n3_gap_cups' },
  // —— 支线：神秘病人第二诊 ——
  c2n3_x0: { bg: 'bg_corridor', speaker: 'sys', text: "凌晨四点，走廊的声控灯熄了。你以为人已经走空，黑处却响了一声纸袋摩擦。灯重新亮起，候诊椅上那个人抬起头，膝上压着片袋。", next: 'c2n3_x1' },
  c2n3_x1: { speaker: 'mystery', sprite: 'pat_mystery', sfx: 'vox2_mystery', text: '医生，又是我。（他递上申请单：神经内科，头颅CT平扫，全自费）', next: 'c2n3_x2' },
  c2n3_x2: { speaker: 'me', sprite: 'pat_mystery', text: "（认出是去年那位来问旧片的人）……这次是头痛？门诊医师怎么说？", next: 'c2n3_x3' },
  c2n3_x3: { speaker: 'mystery', sprite: 'pat_mystery', text: "神经内科让我先查头痛。夜里老醒，醒了就想：我父亲那阵子，也总说不舒服。（他看看新机，又看你）**旧机器搬走了，老片子没一起搬走吧？**", next: 'c2n3_x4' },
  c2n3_x4: { speaker: 'me', sprite: 'pat_mystery', text: "旧片和老机器不是一回事，档案还在。您是想调以前的检查，还是找家人的？", next: 'c2n3_x5' },
  c2n3_x5: { speaker: 'mystery', sprite: 'pat_mystery', text: "我父亲的。能问的地方快问遍了。我是怕……他的毛病，我也有。（他把申请单捏出一道折痕）今天先看我的吧。片子要是没事，我就真没事了吗？", next: 'c2n3_x6' },
  c2n3_x6: { speaker: 'sys', text: '【怎么回答？】', sprite: 'pat_mystery', choices: [
    { text: '「先做这次检查。结果出来，请医生跟您一起看看。」', next: 'c2n3_x7a', effect: { heart: 1 }, tag: 'good' },
    { text: '「CT很先进，多数问题都能查出来。」', next: 'c2n3_x7b' },
  ]},
  c2n3_x7a: { speaker: 'mystery', sprite: 'pat_mystery', text: "好，先查今天的。（他把旧片袋收回去，却没放进包里）找片子的事不催你。你要是听说片库要清东西，能不能先问一声？", next: 'c2n3_mystery_scan' },
  c2n3_x7b: { speaker: 'mystery', sprite: 'pat_mystery', text: '「多数」……那剩下的呢？（他摇摇头，走进了扫描间。）', next: 'c2n3_mystery_scan' },
  c2n3_mystery_scan: { bg: 'bg_ctcontrol', speaker: 'sys', text: "老人慢慢躺下，双手交叠在腹前。检查床驶入机架，控制台开始接收数据。", next: 'c2n3_x8' },
  c2n3_x8: { speaker: 'sys', text: "采集和重建完成。医师逐层查看，这次头颅平扫未见明确异常；头痛还需要回门诊继续评估。", image: 'ct_head_clean', next: 'c2n3_x9' },
  c2n3_x9: { speaker: 'mystery', sprite: 'pat_mystery', text: "（把新报告夹到旧片袋最里层）明年11月，我可能还来。\n你问怎么总挑11月。他低头把袋口压平：「……到这个时候，就忍不住想来问问。」临走还回头看了一眼片库的方向。", event: 'ch2_mystery', next: 'c2n3_s1' },
  c2n3_s1: { speaker: 'sys', text: '【今夜结算】诊疗收入 +280 金币。第3夜 ·「快」——完。', effect: { gold: 280, ap: -99 }, end: true },
}

/* ================= 第4日「狠」（白班 · 增强扫描专场） ================= */
const C2D4: Record<string, Step> = {
  ...CH2_SOCIAL_STEPS.c2d4,
  ...CH2_PACING_STEPS.c2d4,
  // 沿用旧节点 ID，观察与扫描演出由第二章独立配置接入。
  c2d4_0: {"bg":"bg_office_day","speaker":"sys","text":"周五白班。你刚放下包，急诊的电话就打了进来。","next":"c2d4_1"},
  c2d4_1: {"speaker":"director","sprite":"char_director","text":"先去CT室。有位上腹痛、往后背串的病人，急诊评估后怀疑主动脉有问题。我过去看片。","next":"c2d4_2"},
  c2d4_2: {"bg":"bg_ctcontrol_day","speaker":"sys","text":"推床停在检查室门口。病人攥着床栏，陪来的妻子手里还拎着他的外套。医护正在交接病情、评估增强检查的风险。","next":"c2d4_3"},
  c2d4_3: {"speaker":"sys","text":"「早上还好好的，拿个东西就突然疼起来了。」妻子说到一半，低头把外套又叠了一遍。","next":"c2d4_aorta_resist"},
  c2d4_4: {"speaker":"me","text":"周师傅，今天不是排好的增强专场吗？","next":"c2d4_5"},
  c2d4_5: {"speaker":"zhou","sprite":"char_zhou","text":"急诊来了，先让路。别调肝脏那套协议，这回要看的是主动脉。","next":"c2d4_6"},
  c2d4_6: {"speaker":"sys","text":"放射科医师与急诊团队确认检查方案。你跟着老周准备设备，核对扫描范围和重建设置；对比剂使用与监护由医护团队负责。","next":"c2d4_7"},
  c2d4_7: {"speaker":"me","text":"我把确认过的主动脉方案调出来，跟老周再对一遍范围。","next":"c2d4_8"},
  c2d4_8: {"speaker":"zhou","sprite":"char_zhou","text":"要等血管强化起来，再把该扫的范围扫全。机器转得快有用，扫早了、漏了一段，快也白搭。",next: 'c2d4_aorta_scan'},
  c2d4_aorta_scan: { bg: 'bg_ctcontrol_day', speaker: 'sys', text: "准备完成。对比剂团注后，系统按确认的时机开始主动脉容积采集，检查床平稳移动。", next: 'c2d4_t1' },
  c2d4_t1: {"speaker":"sys","text":"你把刚才留意的那一层停住。主任拖过相邻切面，对照着看了一遍。","image":"ch2_ct_aortic_wide","next":"c2d4_t1ok"},
  c2d4_t1ok: {"speaker":"me","text":"这条细线……怎么把血管里面分成两边了？","image":"ch2_ct_aortic_wide","next":"c2d4_t1no"},
  c2d4_t1no: {"speaker":"director","sprite":"char_director","text":"是**内膜片**。这里形成了真腔和假腔，考虑主动脉夹层。把完整序列调出来，我看一下累及范围。","image":"ch2_ct_aortic_wide","next":"c2d4_t2"},
  c2d4_t2: {"speaker":"sys","text":"主任对照原始薄层图像和多个切面确认，随即给急诊打电话，说明发现并安排紧急专科评估。你没有再插话，把所需图像逐一传好。","image":"ch2_ct_aortic_wide","next":"c2d4_t2ok"},
  c2d4_t2ok: {"speaker":"me","text":"这些重组图和原始薄层都要留吧？","next":"c2d4_t2no"},
  c2d4_t2no: {"speaker":"zhou","sprite":"char_zhou","text":"都留。后面还要换方向看，用的也是这一组数据。别只导出那张漂亮的立体图。","next":"c2d4_t3ok"},
  c2d4_t3ok: {"speaker":"sys","text":"推床离开时，妻子追问报告去哪儿领。主任指着同行的医生：「已经联系好了，先跟他走。」她点点头，走了两步又回来拿外套——刚才叠了半天，还是落在椅子上了。","next":"c2d4_9"},
  c2d4_9: {"speaker":"sys","text":"走廊安静下来。老周端起杯子，发现茶已经凉了。他看了眼时钟，把杯盖拧了回去。","next":"c2d4_10"},
  c2d4_10: {"speaker":"zhou","sprite":"char_zhou","text":"先把这边交接好。饭等轮休再热，我跟你一起去。","next":"c2d4_gap_thermos"},
  c2d4_11a: {"speaker":"sys","text":"下午，一位头痛的老爷子在门口摸了摸口袋：「手机钥匙都交了。我这人没别的毛病，就是零碎多。」",next: 'c2d4_metal_scan'},
  c2d4_metal_scan: { bg: 'bg_ctcontrol_day', speaker: 'sys', text: "老爷子躺上检查床，头部平扫开始。控制台接收采集数据，你等着第一组重建图。", next: 'c2d4_12a' },
  c2d4_12a: {"speaker":"sys","text":"你把条纹最重的口腔邻近层面留在屏幕上。老周拖动序列，和上面的层面对照了一下。","image":"ct_dental_metal_teaching","next":"c2d4_13"},
  c2d4_13: {"speaker":"me","text":"同一套图，有的层面轻，有的重。这些条纹到底从哪儿拖出来的？","image":"ct_dental_metal_teaching","next":"c2d4_14"},
  c2d4_14: {"speaker":"zhou","sprite":"char_zhou","text":"先别给机器判刑。亮得最扎眼的那块在哪儿？","image":"ct_dental_metal_teaching","next":"c2d4_15"},
  c2d4_15: {"speaker":"me","text":"嘴附近……是不是牙上的金属？","image":"ct_dental_metal_teaching","next":"c2d4_p0"},
  c2d4_p0: {"speaker":"grandpa","sprite":"pat_grandpa2","text":"（听见老周问义齿，一拍腿）还有这副活动牙！你们问金属，我光惦记钥匙了。这牙天天戴，早当成自己的了。","next":"c2d4_p1"},
  c2d4_p1: {"speaker":"zhou","sprite":"char_zhou","text":"怪我们，刚才没问具体。能自己取下来吗？固定在嘴里的可别硬动。","next":"c2d4_p2a"},
  c2d4_p2a: {"speaker":"grandpa","sprite":"pat_grandpa2","text":"（取下活动义齿，接过收纳盒）人没修好，先把零件拆了。盒子可别丢，配这口牙比买手机还贵。","next":"c2d4_p3a"},
  c2d4_p3a: {"speaker":"me","text":"金属旁边这些黑白条纹，单靠调窗能压下去吗？","next":"c2d4_p2b"},
  c2d4_p2b: {"speaker":"zhou","sprite":"char_zhou","text":"不光是显示问题。金属挡掉的射线太多，还把穿过去的射线能量分布改了。重建出来就可能拖出这些条纹，旁边的组织也跟着看不清。","image":"ct_dental_metal_teaching","next":"c2d4_p2c"},
  c2d4_p2c: {"speaker":"me",text: "那换个重建方法呢？能把这些条纹压下去吗？","image":"ct_dental_metal_teaching","next":"c2d4_p3b"},
  c2d4_p3b: {card: 'fbp_iterative',"speaker":"zhou","sprite":"char_zhou",text: "不能包治。迭代重建和专门的金属伪影校正不是一回事，缺掉的测量信息也不是调个窗就有了。先看影响哪几层，别整套重扫。","image":"ct_dental_metal_teaching","next":"c2d4_m1"},
  c2d4_m1: {"speaker":"sys","text":"医师确认受影响的层面不足以判断。活动义齿已取下，团队重新摆好位置，只启动必要范围的补扫。","next":"c2d4_m2"},
  c2d4_m2: {"speaker":"sys","text":"新序列上的条纹减轻了，两组图一起保留。老爷子拿回义齿盒，开盖数了数。老周乐了：「放心，一颗没扣。」老爷子把盒子揣好：「这可说不准，你们机器刚才照得那么狠。」","next":"c2d4_m3"},
  c2d4_m3: {"speaker":"me","text":"我把受影响的层面标出来。前一班那个人听见「未见异常」还不肯走，这位倒只惦记牙盒。老周接过鼠标，先把补扫前后的序列分开存好。","next":"c2d4_m4"},
  c2d4_m4: {"speaker":"zhou","sprite":"char_zhou","text":"这位头痛还得接着查。受影响的层面、补扫后的图，交代清楚，别让接手的人重新猜一遍。……五点了，收拾一下，主任叫我们去开会。","next":"c2d4_e0"},
  // 旧选项分支落点：继续同一病例，不保留已撤掉的处置教学。
  c2d4_11b: { speaker: 'sys', text: '下一位病人已经来到检查室门口。', next: 'c2d4_11a' },
  c2d4_11c: { speaker: 'sys', text: '下一位病人已经来到检查室门口。', next: 'c2d4_11a' },
  // —— 傍晚 · 数据回传摊牌 ——
  c2d4_e0: { bg: 'bg_office_day', speaker: 'sys', text: '下午五点，医生办公室。主任召集临时小会：老周、你、小雷。桌上摊着一份厂家彩页：《**远程质控服务方案**》。', image: 'ev_remote_proposal', next: 'c2d4_e1' },
  c2d4_e1: { speaker: 'director', sprite: 'char_director', text: "现在那个终端只说做远程支持。厂家想再开「远程质控」，每月出报告，不加钱。先把已经在传什么弄清楚，再谈加功能。", next: 'c2d4_e2' },
  c2d4_e2: { speaker: 'zhou', sprite: 'char_zhou', sprite2: 'char_director', text: "终端已经开着了，字段清单呢？彩页上这个「图像质量参数」到底装了什么？小雷，先说你实际看到的。", next: 'c2d4_e3' },
  c2d4_e3: { speaker: 'lei', sprite: 'char_lei', text: "我复核了试运行以来的留存数据。除了报错日志，终端还收了控制台导出的质控样本。样本的DICOM头里，患者ID、姓名、检查时间都还在。", effect: { flag: 'remote_proposal' }, next: 'c2d4_e4' },
  c2d4_e4: { speaker: 'director', sprite: 'char_lei', sprite2: 'char_director', text: "（把自己的签字页翻到最上面）这里批的是设备远程支持。你确定，留下的是带姓名的样本，不只是设备日志？", next: 'c2d4_e5' },
  c2d4_e5: { speaker: 'lei', sprite: 'char_lei', text: "确定。原样本和导出后的我都比了，证据保存在本地。厂家说「自动脱敏」，**脚本却没清DICOM头**。附件三写「使用脱敏后数据」——可这一步根本没做好。", next: 'c2d4_e6' },
  c2d4_e6: { speaker: 'sys', text: '【你的表态？】', sprite: 'char_lei', choices: [
    { text: '「服务可以继续，先催厂家修脱敏脚本。」', next: 'c2d4_e7a', effect: { heart: -1, flag: 'data_support' } },
    { text: '「先停外传，维保改走离线支持。」', next: 'c2d4_e7b', effect: { skill: 1, flag: 'data_oppose' } },
    { text: '「折中：先断开外网，让小雷审计全部字段，制定本院数据管理流程，再决定接不接、怎么接。」', next: 'c2d4_e7c', effect: { skill: 1, heart: 1, badge: 'gatekeeper', flag: 'data_audit' }, tag: 'good' },
  ]},
  c2d4_e7a: { speaker: 'zhou', sprite: 'char_zhou', text: "小雷刚把姓名那一栏指给你看了。至少先停质控样本外传，维保日志也得核清，不能混着放行。", next: 'c2d4_e8' },
  c2d4_e7b: { speaker: 'director', sprite: 'char_director', text: "那就先停外传。维保不能靠传病人姓名来做，我跟厂家谈离线支持，你把需要保留的日志列给我。", next: 'c2d4_e8' },
  c2d4_e7c: { speaker: 'director', sprite: 'char_director', text: "先断外网，院内PACS照常用。小雷查留存样本，老周跟我一起把字段和用途定清。结果报信息科，别自己悄悄处理了。", event: 'ch2_data_showdown', next: 'c2d4_e8' },
  c2d4_e8: { speaker: 'sys', text: "主任把核查单压在彩页上，拨通厂家的电话：「别再给我讲免费，先把谁负责写清楚。」小雷拉了把椅子坐到旁边，把两版签字单并排摊开。电话响了很久，两个人谁也没再催谁。", event: 'ch2_data_showdown', effect: { flag: 'data_hook' }, next: 'c2d4_reg' },
  c2d4_reg: { speaker: 'tang', sprite: 'char_tang', text: '对了，急诊那边困难患者的救助申请，今天有人接了。以前三通电话问一圈，今天我刚报临时号，对面就知道找哪份。', next: 'c2d4_reg2' },
  c2d4_reg2: { speaker: 'zhou', sprite: 'char_zhou', text: '那就好。小唐，把经办人的分机留一份——不是给我，贴值班室。省得换个人又从头问。', next: 'c2d4_chat0' },
  c2d4_e9: { speaker: 'sys', text: '【本日结算】白班补贴 +250 金币。第4日 ·「狠」——完。', effect: { gold: 250, ap: -99 }, end: true },
}

/* ================= 第5夜「值守」 ================= */
const C2N5: Record<string, Step> = {
  ...CH2_SOCIAL_STEPS.c2n5,
  ...CH2_PACING_STEPS.c2n5,
  c2n5_0: { bg: 'bg_corridor', speaker: 'sys', text: "晚上九点半。老周蹲在更衣柜前，把一摞交班本挪进纸箱。白大褂还挂着，最上层那罐茶叶也没动。", next: 'c2n5_1' },
  c2n5_1: { speaker: 'sys', text: '「咔哒」——打卡成功。', sfx: 'stamp', effect: { gold: 50, ap: 3 }, next: 'c2n5_2' },
  c2n5_2: { speaker: 'zhou', sprite: 'char_zhou', text: "来了？从今晚起，你主值，我备班。主任不再给我排整夜了，返聘带教照旧。别看我搬个箱子就以为我要跑路。", next: 'c2n5_3' },
  c2n5_3: { speaker: 'me', sprite: 'char_zhou', text: "那您半夜还在？", next: 'c2n5_4' },
  c2n5_4: { speaker: 'zhou', sprite: 'char_zhou', text: "在值班室。有事打电话，别学小雷，净发一串感叹号。该请值班医师看图就请，别一个人硬扛。", next: 'c2n5_5' },
  c2n5_5: { speaker: 'zhou', sprite: 'char_zhou', text: "（从旧交班本里抽出一只纸袋）封条柜另一半钥匙，找着了。科里保管的那半，我刚从钥匙柜领出来。两件凑齐了，今晚一起开吧。", next: 'c2n5_hub' },
  c2n5_hub: { bg: 'bg_ctcontrol', speaker: 'sys', text: '【自由行动 · 行动力⚡×3】', choices: [
    { text: '【交接主线·不耗行动力】封条柜 · 和老周一起开锁', next: 'c2n5_a1', cond: { notFlag: 'c2n5_cabinet' }, tag: 'good' },
    { text: '小唐的交接饭（⚡-1）', next: 'c2n5_b1', cond: { notFlag: 'c2n5_b', ap: 1 } },
    { text: '茶水间 · 几句话还没聊完（⚡-1）', next: 'c2n5_chat0', cond: { notFlag: 'c2n5_chat_done', ap: 1 } },
    { text: '设备间巡检（⚡-1）', next: 'c2n5_e1', cond: { notFlag: 'c2n5_e', ap: 1 } },
    { text: '值班室翻书《CT夜班二十页》', next: '@book2' },
    { text: '小卖部', next: '@shop' },
    { text: '【开诊】值守CT室', next: 'c2n5_m0', cond: { flag: 'c2n5_cabinet' }, tag: 'good' },
    { text: '【开诊前】尚未完成封条柜交接', next: 'c2n5_lock', cond: { notFlag: 'c2n5_cabinet' } },
  ]},
  c2n5_lock: { speaker: 'sys', text: "老周扬了扬装钥匙的纸袋：「先去开柜，不耽误你开诊。」", next: 'c2n5_hub' },
  // —— A. 封条柜 ——
  c2n5_a1: { bg: 'bg_archive', speaker: 'sys', text: "老周陪你走进旧片库。高窗漏下一块月光，柜门上还是1999年1月的封条，「……周……存」的字迹已经褪了色。", next: 'c2n5_a2' },
  c2n5_a2: { speaker: 'zhou', sprite: 'char_zhou', text: "（打开纸袋，把两半铜片合好，图案拼成一个完整的「周」字）扶一下手电，别照我眼睛。", image: 'item_zhou_key_fixed', next: 'c2n5_a3' },
  c2n5_a3: { speaker: 'sys', text: '铜片插入锁孔，转了两圈。「咔哒」——柜门开了。', sfx: 'click', next: 'c2n5_a4' },
  c2n5_a4: { speaker: 'me', sprite: 'char_zhou', text: "柜里摞着标有「教学片」的片袋，玻璃下压着科室合影。最上面那册手写笔记已经翻软，书脊缠了两道胶布。老周伸手就把它抽出来，没碰别的。", next: 'c2n5_a5' },
  c2n5_a5: { speaker: 'zhou', sprite: 'char_zhou', text: "（翻了两页，忽然笑了）原来这本搁这儿了。你看，这根线我当年画错了，师父硬让我重画三遍。擦得纸都快破了。", image: 'ev_ch2_teaching_archive', next: 'c2n5_a6' },
  c2n5_a6: { speaker: 'me', sprite: 'char_zhou', text: "片袋上写着「教学片」，笔记里夹着老设备的照片。合影的年份是1997；最边上那个头发还挺密、抱着本子的年轻人……我抬头看了眼老周。", image: 'ev_ch2_team_1997', choices: [
    { text: '「最边上那个，是您吧？」', next: 'c2n5_a7' },
    { text: '（拿旧黄铜钥匙，看看旁边的小铁柜）', next: 'c2n5_k1', cond: { item: 'key' }, tag: 'good' },
  ]},
  // —— 柜中柜（买了黄铜钥匙） ——
  c2n5_k1: { speaker: 'sys', text: "你拿出小卖部买的**黄铜钥匙**，试了试旁边的小铁柜——开的是它，不是封条柜。里面的借阅卡上，有同一套教学片的编号。", sfx: 'click', effect: { flag: 'old_photo' }, next: 'c2n5_k2' },
  c2n5_k2: { speaker: 'sys', text: "借阅卡的签名从工整写到潦草，同一个「周」。老周凑过来看：「最后几笔是下班前补的。别学这个，我自己都认了半天。」", next: 'c2n5_a7' },
  c2n5_a7: { speaker: 'zhou', sprite: 'char_zhou', text: "是我，那会儿头发还够往后梳。师父拍片，我抱本子记，急了就画在手背上。（他把照片上的灰拂掉）这些教学片拿去学，顺序别乱。抄不明白的，白天来问我。", image: 'ev_ch2_team_1997', effect: { flag: 'old_register' }, event: 'ch2_cabinet', next: 'c2n5_a8' },
  c2n5_a8: { speaker: 'sys', text: "走出片库，老周翻着笔记说：「下周市里来做质控，体模记录你理，你先讲，我补。」你问当年重画三遍后来对了没有。他伸手把书翻回那页：「你先看看。」", effect: { flag: 'zhou_handover' }, next: 'c2n5_a9' },
  c2n5_a9: { speaker: 'sys', text: "你把教学片和笔记的编号记进手册。老周把那页画错的线图展平，又折了回去：「这页也留着，别替我撕了。」", effect: { flag: 'nameless_films' }, next: 'c2n5_a10' },
  c2n5_a10: { speaker: 'sys', text: "你把两件钥匙装回纸袋，和老周一起签了归还记录。回到CT室，掌心还留着铜的凉意。", effect: { flag: 'c2n5_cabinet' }, next: 'c2n5_hub' },
  // —— B. 小唐的送别礼 ——
  c2n5_b1: { speaker: 'tang', sprite: 'char_tang', text: "（塞给你一个保温盒）夜班交接饭，我卤了牛肉。老周以为都是他的，差点给你吃光。快拿走。", effect: { ap: -1 }, next: 'c2n5_b2' },
  c2n5_b2: { speaker: 'sys', text: "保温盒里是切好的卤牛肉，下面压着小唐的纸条：「给你留了一半。另一半老周已经吃了，别找。」", effect: { heart: 1, flag: 'c2n5_b' }, next: 'c2n5_hub' },
  // —— E. 设备间巡检 ——
  c2n5_e1: { speaker: 'sys', text: '独立值守的第一夜，你把设备间里里外外巡了一遍：恒温22度，湿度正常，机架待机灯幽蓝。机架里的远程终端还在，外网线收在一旁……', image: 'ch2_remote_rack_offline', effect: { ap: -1 }, choices: [
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
  c2n5_m1: { speaker: 'kiddad', sprite: 'pat_kiddad', sfx: 'vox_ch2_natural_kiddad', text: "他又吐了，您看看。（父亲扶着孩子的背，朝CT室张望）今晚两次了。能不能再查一下？", next: 'c2n5_m2' },
  c2n5_m2: { speaker: 'kidmom', sprite: 'pat_kidmom_holding', sprite2: 'pat_kiddad', sfx: 'vox_ch2_natural_kidmom', text: "可前几天才查过。（母亲抱紧哭闹的孩子）就三天前，片子我们带了。你先让医生看一眼，别光催着再照。", next: 'c2n5_m3' },
  c2n5_m3: { speaker: 'sys', text: '6岁男孩趴在母亲肩上，哭得更厉害了。三天前他们在外地旅游，孩子摔到头，当地医院做过一次头颅CT——**光盘就在父亲的包里**。', sfx: 'cry_child', sprite: 'pat_kidmom_holding', sprite2: 'pat_kiddad', next: 'c2n5_m4' },
  c2n5_m4: { speaker: 'kiddad', sprite: 'pat_kiddad', text: "（把光盘放上分诊台，手还按着）车上他又吐，我真怕等到天亮就晚了。你们机器新，再看看不行吗？钱我们交。", next: 'c2n5_m5' },
  c2n5_m5: { speaker: 'kidmom', sprite: 'pat_kidmom_holding', text: "（赶紧拍着孩子的背）你小声点，他一直听着呢！……医生，我也怕漏了。可三天前才照过，我不敢就这么点头。", next: 'c2n5_m6' },
  c2n5_m6: { speaker: 'sys', text: '【怎么处理？】', sprite: 'pat_kidmom_holding', sprite2: 'pat_kiddad', choices: [
    { text: '「都别吵了，扫！出了事我担着。」', next: 'c2n5_m7a', effect: { skill: -2, flag: 'c2n5_wrong' } },
    { text: '「光盘给我，先把旧图和新症状一起报给值班医师。」', next: 'c2n5_m7b', effect: { skill: 2, badge: 'alara_guard' }, tag: 'good' },
    { text: '「辐射确实不好，别扫了，回家观察吧。」', next: 'c2n5_m7c', effect: { heart: -1 } },
  ]},
  c2n5_m7a: { speaker: 'duty', phone: 'char_duty', text: "先把旧片发来。今晚新出现的症状也说一下，我跟急诊一起看，再定要不要扫。", next: 'c2n5_m8' },
  c2n5_m7b: { speaker: 'me', sprite: 'pat_kiddad', text: "光盘给我，我调给值班医师看。今天新吐了两次，也得一起告诉他，不能只看三天前的图。", next: 'c2n5_m8' },
  c2n5_m7c: { speaker: 'kiddad', sprite: 'pat_kiddad', text: "观察？！他吐了啊！刚才在电梯里又干呕，你没看见！（母亲把孩子抱紧，没有再接话。）", next: 'c2n5_m8' },
  c2n5_m8: { speaker: 'sys', text: '外院DICOM调阅成功：**左侧顶部头皮血肿，颅骨完整，颅内未见出血**。图像质量可用——但「呕吐两次」是三天前没有的新症状。', image: 'ct_head_child', imageLabel: '外院旧片｜3天前', next: 'c2n5_m9' },
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
  c2n5_child_scan: { bg: 'bg_ctcontrol', speaker: 'sys', text: "小唐答应等他回急诊问问糖的事。男孩躺稳，人员退出机房；确认儿童协议，新的头颅采集开始了。", next: 'c2n5_m17' },
  c2n5_m17: { speaker: 'sys', text: "扫描完成，值班医师对照旧片：未见新发颅内出血。急诊继续查呕吐原因，安排孩子留观。你把结果传了过去。", image: 'ct_head_child_followup', imageLabel: '本院复查｜本次', next: 'c2n5_m18' },
  c2n5_m18: { speaker: 'kiddad', sprite: 'pat_kiddad', text: "（坐在候诊椅边，搓了搓脸）刚才对不起。车上他一吐，我脑子里就只剩赶紧到医院……他妈妈让我慢点开，我还冲她发火。", next: 'c2n5_m19' },
  c2n5_m19: { speaker: 'kidmom', sprite: 'pat_kidmom_holding', text: "（把剂量记录和旧报告放在一起）这两份我都留着。下次换个医生，也看得明白吧？……那以后，还要来复查吗？", next: 'c2n5_m20' },
  c2n5_m20: { speaker: 'me', sprite: 'pat_kidmom_holding', text: "今晚先在急诊留观，后面怎么复查，等医生评估后跟您交代。我把这次图也存进光盘。", next: 'c2n5_m21' },
  c2n5_m21: { speaker: 'sys', text: "一家人去了急诊留观。男孩趴在爸爸背上，隔老远还冲小唐比划棒棒糖。小唐举起手：「记着呢，先听急诊医生的。」父亲也回头挥了一下，没再催。", next: 'c2n5_n1' },
  // —— 深夜 · 独立值守 ——
  c2n5_n1: { bg: 'bg_ctcontrol', speaker: 'sys', text: "凌晨两点。你在交班记录上写下时间，抬头时，玻璃里只有自己的倒影。老周的椅子空着，外套还在椅背上。值班室就在隔壁，你没过去，先看下一张单。", next: 'c2n5_n2' },
  c2n5_n2: { speaker: 'sys', text: '【事件1】住院部插单——术后发热，怀疑腹腔脓肿。', next: 'c2n5_n3' },
  c2n5_n3: { speaker: 'me', text: "申请单到了。我把今天的图像和扫描记录调出来，等值班医师确认方案。小唐已经去接病人了。", next: 'c2n5_n4' },
  c2n5_n4: { speaker: 'sys', text: '【事件2】急诊电话——「有个病人投诉你们CT室空调太冷！」', next: 'c2n5_n5' },
  c2n5_n5: { speaker: 'me', text: "（夹着电话找毯子）有，有保暖毯。机房温度我也查一下。先别让大爷对着风口坐。", next: 'c2n5_phone_break' },
  c2n5_n6: { bg: 'bg_ctcontrol', speaker: 'sys', text: '凌晨两点多，手机在口袋里震了一下。陌生号码发来一条短信：**「终端断了，已经出去的那份还在。」**周五会上才说停外传，谁知道得这么清楚？', choices: [
    { text: '保存短信，问小雷认不认识这个号码', next: 'c2n5_sms_save' },
    { text: '回一句：「你是谁？」', next: 'c2n5_sms_reply' },
    { text: '暂不回复，先收起手机', next: 'c2n5_g0' },
  ]},
  c2n5_p2a: { speaker: 'sys', text: "小雷连发三条。先是一句「你还在科里吧」，接着又撤回一张图，换成文字：**「别在微信看。留存样本有问题。」**", next: 'c2n5_n7' },
  c2n5_n7: { speaker: 'lei', sprite: 'char_lei', text: "终端没接回去，我查的是试运行留下的旧样本。有一份删了姓名，检查号和时间还在，拿院内记录一对，照样找得到人。（小雷停了停）不是画面上看不到名字，就算处理完了。", next: 'c2n5_n8' },
  c2n5_n8: { speaker: 'sys', text: '【怎么回复？】', sprite: 'char_lei', choices: [
    { text: '「保存证据，等周一主任会上摊牌。」', next: 'c2n5_n8a', effect: { flag: 'audit_evidence' }, tag: 'good' },
    { text: '「先别声张，我们再核实一轮。」', next: 'c2n5_n8b' },
    { text: '「……要不，就算了吧？」', next: 'c2n5_n8c', effect: { heart: -1 } },
  ]},
  c2n5_n8a: { speaker: 'lei', sprite: 'char_lei', text: "收到。证据进信息科受控目录，另存离线备份。不给你微信发病人信息了，明早到办公室看。", next: 'c2n5_g0' },
  c2n5_n8b: { speaker: 'lei', sprite: 'char_lei', text: "行。外网不接回去，我拿留存日志再对一轮。明早先报已经确认的，别拖。", next: 'c2n5_g0' },
  c2n5_n8c: { speaker: 'lei', sprite: 'char_lei', text: "线是我接的，查到这一步不能装没看见。你不想在会上说，我来说。……证据我照存，外网也不接回去。", next: 'c2n5_g0' },
  // —— 清晨 · 告别 ——
  c2n5_g0: { bg: 'bg_morning', speaker: 'sys', text: "早上六点，白班的人到了。你交完班走出控制室，老周正从值班室出来，手里一新一旧两个保温杯。", next: 'c2n5_g1' },
  c2n5_g1: { speaker: 'zhou', sprite: 'char_zhou', text: "（把新的那个递给你）夜班茶，自己泡。旧的这个我还用呢，别惦记。", next: 'c2n5_g2' },
  c2n5_g2: { speaker: 'me', sprite: 'char_zhou', text: "我还以为您连杯子都交了，真不来了。", next: 'c2n5_g3' },
  c2n5_g3: { speaker: 'zhou', sprite: 'char_zhou', text: "想得美。下周还得带你迎检。（他拧开旧杯子）行了，先吃早饭，我请——只管包子，不管加肉。", next: 'c2n5_g4' },
  c2n5_g4: { speaker: 'sys', text: "你跟着他往电梯走。小唐从后面追来，拿笔点点你手里的新杯子：「先写名字。上回两只一样的，老周喝了半天我的奶茶。」", next: 'c2n5_g5' },
  c2n5_g5: { speaker: 'zhou', text: "（按住电梯开门键）我就说那茶怎么一股甜味。……写杯底，别贴个条，洗一次又没了。", effect: { badge: 'night_keeper2' }, event: 'ch2_solo', next: 'c2n5_g6' },
  c2n5_g6: { speaker: 'sys', text: '【本章结算】诊疗收入 +350 金币。第5夜 ·「值守」——完。', effect: { gold: 350, ap: -99 }, end: true },
}

/* ================= 晨会考核（第5夜后） ================= */
const C2AM: Record<string, Step> = {
  c2am_0: { bg: 'bg_office_day', speaker: 'sys', text: "周一早上八点，医生办公室。会上先过昨夜交班：CT正常交接；远程终端保持离线，信息科今天接手查日志，周五反馈。主任在交接记录上签了字。角落里，老周正把你的名字勾进夜班主值栏。", next: 'c2am_1' },
  c2am_1: { speaker: 'director', sprite: 'char_director', sfx: 'vox2_director_am', text: "年轻人不错啊，我出几道题考考你。五道，老规矩。答完再去吃饭。", next: 'c2am_2' },
  c2am_2: { speaker: 'sys', text: '【考核开始 · 5道随机题】', next: '@quiz' },
  c2am_3: { speaker: 'director', sprite: 'char_director', text: "成绩存档。老周今后不排整夜，带教和备班还在，返聘手续按年度办。该求助就求助，不是把名字写上去就不能喊人了。", sfx: 'badge', next: 'c2am_4' },
  c2am_4: { speaker: 'sys', text: "老周把改好的排班表递给你。有人鼓了两下掌，他摆摆手，又在上衣口袋里摸了摸：「别光拍手，谁把我那支笔顺走了？」", next: 'c2am_5' },
  c2am_5: { speaker: 'zhou', sprite: 'char_zhou', text: "（看了你一眼）夜班有事照样找我。电话要是没接，再打一个，我可能在洗杯子。", next: 'c2am_6' },
  c2am_6: { speaker: 'sys', text: '【第二章「快与狠」——完。】', next: 'c2am_8' },

  c2am_8: { speaker: 'sys', text: "【2028年 · 预告】省医院AI工作站。你在训练数据来源清单里看见了熟悉的县医院设备编号，翻出当年留下的审计记录……", skipUnlessFlag: 'data_audit', next: 'c2am_9' },
  c2am_9: { speaker: 'sys', text: "【回到2025年11月 · 值守后的下一周】市里来的质控专家走到门口，先叫了一声：「周老师，原来您还在这儿带人！」老周把你让到前面：「今天先听年轻人讲。」小唐看看名单上那排头衔，悄悄把椅子往你这边挪了挪。", end: true },
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
  { q: '在已采集的CT容积数据上做冠状位、矢状位重建，是否需要再次曝光？', options: ['每换一个方向都要重扫', '不需要，可利用已有容积数据重建', '必须先提高管电压', '只能重新做一套增强扫描'], answer: 1, explain: '多平面重建利用已采集的容积数据换个方向看，不是让球管再照一遍；可用的细节仍受原始采集条件限制。' },
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
