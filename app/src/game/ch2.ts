import type { Step } from './types'
import type { KnowledgeCard, ChronicleEvent, Evidence } from './dlc'

/* ================= 第二章「快与狠」· CT篇 =================
 * 故事时间：2025年11月，新CT临床启用第一周。
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
  desc: '2025年11月 · 新CT启用第一周：窗宽窗位、卒中绿道、增强专场，和一只被打开的封条柜',
  minutes: '约 40~60 分钟',
}

/* ================= 第二章口令解锁（与第一章进度脱钩；解锁状态存在本机，独立于存档） ================= */
export const CH2_PASSWORD = 'ct2258'
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
  wrench_night: { name: '夜班机修', icon: '🔧', desc: '拎着自购工具箱，亲手把环状伪影定位到第217号探测器通道' },
  dose_guard: { name: '剂量卫士', icon: '📟', desc: '摘下自己胸前的剂量计，让焦虑的母亲看见了「数字」' },
  phase_eye: { name: '期相之眼', icon: '👁️', desc: '三期增强图像连续两幅一眼认出期相' },
}

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
    image: 'ct_ring_artifact',
  },
  old_book_note: {
    title: '图谱里的书签',
    body: '二手《医学影像学》里夹着的旧书签，褪色钢笔字：「窗口调到病灶上，功夫下在病人前。」落款一个「周」字，1999年。这本书的前主人，把一辈子的手感写在了页边上。',
    image: 'item_book',
  },
}

/* ================= 第二章大事记（8条） ================= */
export const CH2_EVENTS: Record<string, ChronicleEvent> = {
  ch2_ct_open: { time: '2025年11月', title: '新CT启用', body: '批文走了一年、全院等了快两年的新CT临床启用。登记本换成扫码枪，老周说：电子的好，一页都不会少。' },
  ch2_first_scan: { time: '2025年11月', title: '夜班首扫', body: '坠床老人，硬膜下血肿，从进门到出图十一分钟。新机器的第一晚就派上了用场。' },
  ch2_luzhou: { time: '2025年11月', title: '陆舟来院', body: '本科室友陆舟跟导师做低剂量重建科研，来院做体模实验。临别留下一问：厂家拿数据一句话的事，我们做科研走流程走了半年——这公平吗？' },
  ch2_stroke: { time: '2025年11月', title: '卒中绿道之夜', body: '房颤老人深夜卒中：运动伪影重扫、平扫排血、CTA锁定M1闭塞，DNT 52分钟达标——这条命留在了县里。' },
  ch2_mystery: { time: '2025年11月', title: '神秘病人第二诊', body: '每年11月准时报到的男人做了新CT：干干净净。他接过片袋问：「老机器的数据，还在吗？」' },
  ch2_data_showdown: { time: '2025年11月', title: '数据回传摊牌', body: '小雷抓包发现：厂家远程终端回传的数据流里有未脱敏的DICOM头字段——患者ID、姓名、检查时间。主任拍板：断网、审计、立规矩。' },
  ch2_cabinet: { time: '2025年11月', title: '封条柜开启', body: '两半铜钥匙拼成一个完整的「周」字。柜里没有金银：一本老登记册，1998年11月那页被撕掉；一沓无名片袋，每年11月，一袋不少。' },
  ch2_solo: { time: '2025年11月', title: '独立值守', body: '老周退出夜班排班，留下保温杯和一句「别给我丢人」。CT室的夜，从今晚起归你守。' },
}

/* ================= 第二章证物（6件） ================= */
export const CH2_EVIDENCE: Record<string, Evidence> = {
  maintenance_draft: { title: '维保合同草案', body: '雯雯留下的草案页：球管按曝光次数阶梯计价、超支部分封顶。她说：球管是耗材，不是固定资产，不这么写你们迟早吃亏。', image: 'ev_maintenance_draft', flag: 'maintenance_draft' },
  phantom_log: { title: '体模实验记录', body: '陆舟留下的实验记录：水箱与线对卡体模、三组参数的扫描数据。「归你们科存档，说不定哪天质控用得上。」', image: 'ct_phantom', flag: 'phantom_log' },
  remote_proposal: { title: '远程质控服务方案', body: '厂家彩页：设备运行数据、图像质量参数自动回传云端，免费。附件三写着「乙方有权使用脱敏后数据」——「脱敏后」三个字，由他们自己定义。', image: 'ev_remote_proposal', flag: 'remote_proposal' },
  old_register: { title: '老登记册（1978—1999）', body: '封条柜里的登记册，纸页脆黄，字迹一年一个样。1998年11月那一页被撕掉了——撕口整齐，像用尺子比着撕的。', image: 'ev_old_register', flag: 'old_register' },
  nameless_films: { title: '一沓无名片袋', body: '袋子上没有姓名、没有登记号，只有日期：1978到1999，每年11月，一袋不少。', image: 'ev_nameless_films', flag: 'nameless_films' },
  old_photo: { title: '1983年的合影', body: '封条柜暗屉里的老照片：1983年11月，放射科全体在老X光机前的合影，背面写着「科里添新机」。前排正中间那个人的脸，被人用指甲一点一点刮掉了。', image: 'ev_old_photo', flag: 'old_photo' },
}

/* ================= 值班室旧书 · 《CT夜班二十页》（二十页全可读） ================= */
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
export function grayToHU(g: number): number {
  if (g <= GRAY2HU[0][0]) return GRAY2HU[0][1]
  for (let i = 1; i < GRAY2HU.length; i++) {
    const [x1, y1] = GRAY2HU[i]
    if (g <= x1) {
      const [x0, y0] = GRAY2HU[i - 1]
      return y0 + ((g - x0) / (x1 - x0)) * (y1 - y0)
    }
  }
  return GRAY2HU[GRAY2HU.length - 1][1]
}

/* ================= 第1夜「新机」 ================= */
const C2N1: Record<string, Step> = {
  c2n1_0: { bg: 'bg_ctcontrol', speaker: 'sys', text: '2025年11月，晚上九点半。影像科走廊新刷了漆，CT室门口的红地垫还没踩脏。你在新打卡机前站了两秒——连打卡机都换了。', effect: { flag: 'c2_started' }, next: 'c2n1_1' },
  c2n1_1: { speaker: 'sys', text: '「咔哒」——打卡成功。', sfx: 'stamp', effect: { gold: 50, ap: 3 }, next: 'c2n1_2' },
  c2n1_2: { speaker: 'tang', sprite: 'char_tang', sfx: 'vox2_tang', text: '新同事！……哦不对，老员工！是我紧张——今晚是咱科新CT启用后第一个夜班，护士长叮嘱我三遍「别乌鸦嘴」。我什么都没说！', next: 'c2n1_3' },
  c2n1_3: { speaker: 'tang', sprite: 'char_tang', text: '厂家的人今天下午撤场，设备科、信息科陪着折腾了一礼拜。老周在CT室里站了一下午，一句话没说，谁劝都不出来。', next: 'c2n1_4' },
  c2n1_4: { speaker: 'zhou', sprite: 'char_zhou', sfx: 'vox2_zhou', text: '（不知何时出现在门口）说谁不出来。……新机器，新规矩：**今晚你拍，我看着**。以后反过来的日子，不远了。', next: 'c2n1_5' },
  c2n1_5: { speaker: 'me', sprite: 'char_zhou', text: '（顺着他目光看进CT室）机架的圆孔里亮着灯，像一只安静的眼睛。这就是批文走了一年、全院等了快两年的「大家伙」。', next: 'c2n1_6' },
  c2n1_6: { speaker: 'zhou', sprite: 'char_zhou', text: '（在机架前站了一会儿，伸手摸了摸外壳）……灯丝换靶面，都是烧电子的命。走吧，开诊前还有点时间，你自己转转——顺便去看看老伙计。', next: 'c2n1_hub' },
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
  c2n1_ab1: { bg: 'bg_corridor', speaker: 'sys', text: '老X光机被挪到了走廊尽头，身上盖着防尘布。防尘布下露出一张设备科的封条：「**停用待查**」。', effect: { ap: -1 }, next: 'c2n1_ab2' },
  c2n1_ab2: { speaker: 'fan', sprite: 'char_fan', sfx: 'vox2_fan_a', text: '（蹲在旁边收拾零件，头也不抬）来看它？……上个月白班忙不过来，让它顶了两天班。**第三天中午，球管烧了**——就是老白那根「半价好管子」。', next: 'c2n1_ab3' },
  c2n1_ab3: { speaker: 'fan', sprite: 'char_fan', text: '靶面熔了个坑，连带着把高压发生器也撂倒了。老白？电话停机，人找不着。院里立了项，**设备科资质核查，这批第三方件的账，一笔一笔过**。', next: 'c2n1_ab4' },
  c2n1_ab4: { speaker: 'me', sprite: 'char_fan', text: '（想起老周那句「记账。盯着。」原来账不是记在老白头上，是记在每一张等着拍片的患者脸上。）', next: 'c2n1_ab5' },
  c2n1_ab5: { speaker: 'fan', sprite: 'char_fan', text: '（拍拍机身）它扛了快三十年，最后栽在一根便宜管子上。……不怪你。要怪，怪这行里所有把「侥幸」当「经验」的人。', effect: { skill: 1, flag: 'bai_echo' }, next: 'c2n1_ab6' },
  c2n1_ab6: { speaker: 'sys', text: '你帮老范把最后半箱零件抬上推车，回到CT室门口。', effect: { flag: 'c2n1_a' }, next: 'c2n1_hub' },
  // —— A. 老伙计（没买的分支） ——
  c2n1_an1: { bg: 'bg_corridor', speaker: 'sys', text: '老X光机被挪到了走廊尽头。防尘布罩得整整齐齐，把手上挂着老范手写的小牌：「**退役，勿动**」。', effect: { ap: -1 }, next: 'c2n1_an2' },
  c2n1_an2: { speaker: 'fan', sprite: 'char_fan', sfx: 'vox2_fan_b', text: '（正好路过）原厂球管撑到了最后一天，一个零件没掉链子。主任说了，不卖废铁，就封在这儿——给科里留个体面。', next: 'c2n1_an3' },
  c2n1_an3: { speaker: 'me', sprite: 'char_fan', text: '（隔着防尘布，仿佛还能听见它曝光前那声「嘀——」。以后这间科室的夜晚，归那台新机器守了。）', effect: { heart: 1 }, next: 'c2n1_an4' },
  c2n1_an4: { speaker: 'sys', text: '你替它把防尘布的角掖好，回到CT室门口。', effect: { flag: 'c2n1_a' }, next: 'c2n1_hub' },
  // —— B. 小凯交底 ——
  c2n1_b1: { speaker: 'kai', sprite: 'char_kai', sfx: 'vox2_kai', text: '哟，夜班大将！撤场前最后交底三件事：**日检看这张表，球管预热别偷懒，增强连着做的时候让它喘口气**——新机器是快，但快不等于可以蛮干。你们卒中绿道一晚上来三台增强的时候，扫完一台，看一眼状态再上下一个。', card: 'ct_tube_heat', effect: { ap: -1 }, next: 'c2n1_b2' },
  c2n1_b2: { speaker: 'me', sprite: 'char_kai', text: '（指着纸箱旁一个黑色的、带天线的盒子）这是什么？', image: 'item_remote', next: 'c2n1_b3' },
  c2n1_b3: { speaker: 'kai', sprite: 'char_kai', text: '**远程支持终端**。机器的运行日志、报错码、球管状态，实时回传我们厂家云——球管快到寿了，我们比你们先知道，配件提前发货。现在大医院都装这个，免费的。', image: 'item_remote', next: 'c2n1_b4' },
  c2n1_b4: { speaker: 'sys', text: '【怎么接？】', sprite: 'char_kai', choices: [
    { text: '「回传的都是设备数据？病人的图呢？」', next: 'c2n1_b5a', effect: { skill: 1, flag: 'remote_asked' }, tag: 'good' },
    { text: '「好东西，以后省心。」', next: 'c2n1_b5b' },
    { text: '（帮他抬箱子上推车）', next: 'c2n1_b5b', effect: { gold: 30, heart: 1 }, risk: { chance: 0.3, next: 'c2n1_b5c', effect: { ap: -1 } } },
  ]},
  c2n1_b5a: { speaker: 'kai', sprite: 'char_kai', text: '（笑）放心，走的是设备通道。……具体字段清单我回头让信息科拉一份，正规流程嘛。（他低头继续装箱，没有再展开。）', next: 'c2n1_b6' },
  c2n1_b5b: { speaker: 'kai', sprite: 'char_kai', text: '省心就对了。对了——（递上一张名片）驻场期结束，以后是我同事片区负责。有事先打电话，别硬拆，这台可不比老伙计，**拆一颗螺丝质保就飞了**。', next: 'c2n1_b6' },
  c2n1_b5c: { speaker: 'sys', text: '箱子一歪，里面的线材散了一地。你陪他重新理了二十分钟线，他直乐：「夜班大将，手上活儿不错，就是运气差点。」', next: 'c2n1_b5b' },
  c2n1_b6: { speaker: 'sys', text: '小凯推着最后一个纸箱走了。控制室彻底安静下来，只剩机架待机的低鸣。', effect: { flag: 'c2n1_b' }, next: 'c2n1_hub' },
  // —— E. 走廊转转 · 小雷 ——
  c2n1_e1: { speaker: 'lei', sprite: 'char_lei', sfx: 'vox2_lei', text: '新机器进PACS了，今晚的图直接上工作站，不用抱着板子跑了——你们科总算过上了二十一世纪的日子。', effect: { ap: -1 }, next: 'c2n1_e2' },
  c2n1_e2: { speaker: 'lei', sprite: 'char_lei', text: '……对了，（压低声音）那台远程终端的网线是我接的，**单独走的一条外网**。主任签的字。我就一说，你就一听。', effect: { flag: 'lei_cable' }, next: 'c2n1_e3' },
  c2n1_e3: { speaker: 'sys', text: '他贴完最后一张网线标签，拎着工具箱走了。你回头看了一眼那个黑盒子——天线一闪一闪。', effect: { flag: 'c2n1_e' }, next: 'c2n1_hub' },
  // —— C. 茶水间 · 小唐八卦 ——
  c2n1_c1: { bg: 'bg_breakroom', speaker: 'sys', text: '茶水间的灯坏了一半，小唐正踮着脚够橱柜顶上的速溶咖啡。', image: 'item_coffee', effect: { ap: -1 }, next: 'c2n1_c2' },
  c2n1_c2: { speaker: 'tang', sprite: 'char_tang', text: '哎，正好！帮我够一下——欸，听说没？新CT才用三天，白班预约已经排到下下周了。B超室眼红得不行，背地里管咱那台机器叫「**印钞机**」。', next: 'c2n1_c3' },
  c2n1_c3: { speaker: 'sys', text: '【怎么接？】', sprite: 'char_tang', choices: [
    { text: '「印钞机也得有人半夜喂它。」', next: 'c2n1_c4a', effect: { heart: 1 } },
    { text: '（把刚买的奶茶递过去）「茶话会入会费。」', next: 'c2n1_c4b', cond: { item: 'milktea' }, effect: { loseItem: 'milktea' }, tag: 'good' },
    { text: '（帮她踮脚够咖啡罐）', next: 'c2n1_c4c', risk: { chance: 0.35, next: 'c2n1_c4d', effect: { ap: -1 } } },
  ]},
  c2n1_c4a: { speaker: 'tang', sprite: 'char_tang', text: '哈哈，那今晚喂机器的就是你！……说真的，主任跟院里提了，**照这个量，明年可能申请第二台**。到时候咱科就是全院最横的科室。', next: 'c2n1_c5' },
  c2n1_c4b: { speaker: 'tang', sprite: 'char_tang', text: '（接过奶茶，眼睛一亮）上道！……那我跟你说个真格的：**设备科老范跟老周是三十年的老搭档**，当年那台老X光机就是他俩一起装的。老白那批便宜球管的事，设备科盯了不是一天两天了——你就等着看吧。', image: 'item_milktea', effect: { heart: 1 }, next: 'c2n1_c5' },
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
  c2n1_m3a: { speaker: 'me', sprite: 'char_he', text: '急性颅脑外伤先平扫——**出血在平扫上就是白亮的高密度，一目了然**；增强要打药、要核对禁忌，绿道病人等不起。', card: 'plain_first', image: 'ct_head_hema', next: 'c2n1_m4' },
  c2n1_m3b: { speaker: 'zhou', sprite: 'char_zhou', text: '（按住申请单）增强是看肿瘤血供、看血管的。**新鲜出血在平扫上自己就发光，打药反而添乱、添风险、添时间**。急症头颅，先平扫——这是铁规矩。', card: 'plain_first', image: 'ct_head_hema', next: 'c2n1_m4' },
  c2n1_m4: { bg: 'bg_ctroom', speaker: 'sys', text: 'CT室。老人被抬上检查床。你走进控制室，操作界面是全新的——没有旋钮，全是触摸屏。', next: 'c2n1_m5' },
  c2n1_m5: { speaker: 'tang', sprite: 'char_tang', text: '（小声）这机器扫一次多快？', next: 'c2n1_m6' },
  c2n1_m6: { speaker: 'me', sprite: 'char_tang', text: '（看着屏幕上转起来的机架）球管围着人转一圈只要零点几秒，床还在匀速往前走——**球管一边转、床一边走，X光的轨迹绕着病人画出一条螺旋**，一圈下来就是一整个部位的容积数据。不是一张张拍，是「一筒」扫出来的。', card: 'helical_intro', next: 'c2n1_m7' },
  c2n1_m7: { speaker: 'sys', text: '定位像 → 设定范围 → 扫描。「嗡——」十几秒，第一幅横断图像跳上屏幕。', sfx: 'xray', next: 'c2n1_m8' },
  c2n1_m8: { speaker: 'zhou', sprite: 'char_zhou', text: '看一眼就明白了——平片是把整个头**压成一张影子**，骨头叠着脑子，出血藏在颅骨后面你就抓瞎；CT是**把人头一层一层切开看**，每一层里，血是血、脑是脑、骨头是骨头。', image: 'ct_head_hema', card: 'ct_tomography', next: 'c2n1_m9' },
  c2n1_m9: { speaker: 'zhou', sprite: 'char_zhou', text: '再看屏幕角落这串数——**CT值，单位是HU，亨氏单位**。每个像素不再是「黑不黑」，是**这个体素对X线的衰减系数，拿水当基准折算出来的数**：**水正好是0，空气接近-1000，骨头七百往上能到三千**。凝固的血块56到76，脑灰质36到46，脑白质22到32——**血只比脑白那么二三十个单位，窗口不调好，这点差别就淹死在灰色里**。', image: 'ct_head_hema', card: 'hu_scale', next: 'c2n1_m10' },
  c2n1_m10: { speaker: 'zhou', sprite: 'char_zhou', text: '现在这幅图，是把-1000到+3000四千个灰阶，全摊在人眼能分清的几十级灰上——神仙也看不出门道。**窗口技术，就是放大某一段灰度的技术：窗宽，是放大的范围上下限之差；窗位，是这段的中心。看脑，就把窗收窄到80、窗位定在30上下——脑窗。**', image: 'ct_head_hema', card: 'brain_window', next: 'c2n1_m11' },
  c2n1_m11: { speaker: 'zhou', sprite: 'char_zhou', text: '拖吧。把窗口拖到「该看的东西」身上。', image: 'ct_head_hema', windowTask: { image: 'ct_head_hema', targetW: 80, targetL: 30, tolW: 30, tolL: 15, success: 'c2n1_w1ok', stage: 1 }, next: 'c2n1_w1ok' },
  c2n1_w1ok: { speaker: 'sys', text: '灰雾散开了。左侧额颞部，颅骨内板下贴着一弯**新月形的高密度影**，脑室被压得偏了位。', image: 'ct_head_hema', next: 'c2n1_w2' },
  c2n1_w2: { speaker: 'zhou', sprite: 'char_zhou', text: '血肿和脑组织还差着一截呢，**把窗宽再放到130、窗位抬到65试试——硬膜下窗**，专门把血和脑之间那点差别拉到最大。看清楚了再下结论。', image: 'ct_head_hema', windowTask: { image: 'ct_head_hema', targetW: 130, targetL: 65, tolW: 35, tolL: 18, success: 'c2n1_w2ok', stage: 2 }, next: 'c2n1_w2ok' },
  c2n1_w2ok: { speaker: 'sys', text: '【这弯贴着颅骨内板的新月形高密度是——】', image: 'ct_head_hema', choices: [
    { text: '「硬膜下血肿。」', next: 'c2n1_d1a', effect: { skill: 2 }, tag: 'good' },
    { text: '「硬膜外血肿。」', next: 'c2n1_d1b' },
    { text: '「脑梗死？」', next: 'c2n1_d1c', effect: { skill: -1 } },
  ]},
  c2n1_d1a: { speaker: 'zhou', sprite: 'char_zhou', text: '对。**新月形、贴颅板、能跨过颅缝**——硬膜下血肿，老人脑萎缩，桥静脉一扯就断。要是梭形、不跨缝，那是硬膜外，年轻人多见。**形状即解剖。**', image: 'ct_head_hema', next: 'c2n1_d2' },
  c2n1_d1b: { speaker: 'zhou', sprite: 'char_zhou', text: '再想想。硬膜外是梭形、凸透镜样，被颅缝卡住；这个**弯月跨过了颅缝**——硬膜下。老年人坠床，经典得能进教科书。', image: 'ct_head_hema', next: 'c2n1_d2' },
  c2n1_d1c: { speaker: 'zhou', sprite: 'char_zhou', text: '梗死几个小时内CT常常**干干净净**，而且它是低密度、发黑的。这个是白亮的高密度——是血。', image: 'ct_head_hema', next: 'c2n1_d2' },
  c2n1_d2: { speaker: 'he', phone: 'char_he', text: '（看完图像，已经在打电话）神外！硬膜下，中线移位，准备手术——', image: 'ct_head_hema', next: 'c2n1_d3' },
  c2n1_d3: { speaker: 'sys', text: '平车呼啸而去。从进门到图像出来，十一分钟。', next: 'c2n1_d4' },
  c2n1_d4: { speaker: 'zhou', sprite: 'char_zhou', text: '（望着平车，没头没尾地说）这台机器第一晚就派上用场了。……行了，第一扫，你及格了。', effect: { badge: 'first_ct' }, event: 'ch2_first_scan', next: 'c2n1_p0' },
  // —— 第二例：肾绞痛的年轻人 ——
  c2n1_p0: { speaker: 'sys', text: '凌晨一点半，分诊铃又响。一个二十多岁的小伙子被同事架着进来，整个人蜷成一只虾米，右边腰腹部疼得直不起身，额头全是汗。', sfx: 'ring', next: 'c2n1_p1' },
  c2n1_p1: { speaker: 'he', sprite: 'char_he', text: '急诊转来的：右侧腰腹绞痛两小时，血尿。泌尿外科的夜班电话打不通，开单先写的「腹痛待查」——**扫什么条件，让我们自己拿主意**。', next: 'c2n1_p2' },
  c2n1_p2: { speaker: 'sys', text: '【怎么扫？】', sprite: 'char_he', choices: [
    { text: '「全腹增强吧，看得全面，一步到位。」', next: 'c2n1_p2b' },
    { text: '「先平扫。绞痛加血尿，大概率是结石——结石在平扫上自己就是最亮的点。」', next: 'c2n1_p2a', effect: { skill: 1 }, tag: 'good' },
    { text: '「这么疼先打止痛，回急诊打瓶针观察，天亮了再说。」', next: 'c2n1_p2c' },
  ]},
  c2n1_p2a: { speaker: 'zhou', sprite: 'char_zhou', text: '对。**泌尿系结石，平扫为王**——打药反而添乱：对比剂进了集合系统，高密度一团，小结石直接淹在里面。不折腾病人，也不折腾机器。', card: 'stone_plain', next: 'c2n1_p3' },
  c2n1_p2b: { speaker: 'zhou', sprite: 'char_zhou', text: '（摇头）增强是看肿瘤血供的，不是看石头的。**对比剂排进肾盂输尿管，白花花一片，3mm的结石就淹死在里头了**——绞痛加血尿，平扫五分钟见分晓。', card: 'stone_plain', next: 'c2n1_p3' },
  c2n1_p2c: { speaker: 'he', sprite: 'char_he', text: '（为难）他疼成这样……而且血尿是新出现的。万一不是结石，是别的什么呢？拖到天亮，出了事算谁的？（你想了想，还是开了平扫——绞痛加血尿，先让图像说话。）', card: 'stone_plain', next: 'c2n1_p3' },
  c2n1_p3: { speaker: 'sys', text: '平扫，范围从肾上极扫到膀胱。「嗡——」十几秒。图像跳出来：**左侧输尿管末端，一颗3mm的白点，亮得扎眼**；上游输尿管轻度扩张。', sfx: 'xray', image: 'ct_kidney_stone', next: 'c2n1_p4' },
  c2n1_p4: { speaker: 'zhou', sprite: 'char_zhou', text: '看见没——**结石的CT值几百到上千个HU，比周围软组织白出几个量级**，平扫上藏都没处藏。3mm、位于输尿管末端——这个大小，八成能自己排出来。**影像给的不只是「有没有」，还有「怎么办」**：位置、大小、梗阻程度，泌尿外科拿着这三样就能定方案。', image: 'ct_kidney_stone', next: 'c2n1_p5' },
  c2n1_p5: { speaker: 'stone', sprite: 'pat_stone', sfx: 'vox_guy', text: '（打完止痛针，终于能直起腰了）哎呦……刚才真以为自己要交代在这儿了。医生，这石头……真是我自己长出来的？', next: 'c2n1_p6' },
  c2n1_p6: { speaker: 'me', sprite: 'pat_stone', text: '多喝水，少憋尿，报告明早随门诊复诊一起看。（你在登记本上写下时间——凌晨一点四十一分。）', effect: { gold: 80 }, next: 'c2n1_s1' },
  // —— 收束 ——
  c2n1_s1: { bg: 'bg_ctcontrol', speaker: 'sys', text: '凌晨四点，收尾。你习惯性去拿登记本——桌上一台崭新的扫码枪，登记已经电子化。', next: 'c2n1_s2' },
  c2n1_s2: { speaker: 'zhou', sprite: 'char_zhou', text: '（听见「登记本」三个字，沉默了两秒）……电子的好。电子的，一页都不会少。', effect: { heart: 1, flag: 'paperless' }, event: 'ch2_ct_open', next: 'c2n1_s3' },
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
  c2d2_1: { speaker: 'director', sprite: 'char_director', sfx: 'vox2_director', text: '白班跟夜班不是一个打法。夜班是「准」，白班是「**快**」——病人排长队的时候，**快就是医德**。今天候诊队列归你调度，别出乱子。', effect: { flag: 'day_shift' }, queue: C2D2_QUEUE0, next: 'c2d2_2' },
  c2d2_2: { bg: 'bg_waiting', speaker: 'sys', text: '【白班队列】预约病人按号排，急诊/住院随时「插单」。让危重等太久，是要出事的。', queue: C2D2_QUEUE0, next: 'c2d2_3' },
  c2d2_3: { bg: 'bg_ctcontrol_day', speaker: 'sys', text: '第一例进机房。大爷，去年体检发现肺结节，医嘱半年复查。', queue: C2D2_QUEUE1, image: 'ct_lung', next: 'c2d2_4' },
  c2d2_4: { speaker: 'me', text: '（阅片）肺窗上一枚6mm的磨玻璃结节……等等，今天的图像上，它**时有时无**，有几层根本看不见。', image: 'ct_lung', queue: C2D2_QUEUE1, next: 'c2d2_5' },
  c2d2_5: { speaker: 'sys', text: '【怎么回事？】', image: 'ct_lung', queue: C2D2_QUEUE1, choices: [
    { text: '「对比去年的片子，结节确实吸收了，半年后再说吧。」', next: 'c2d2_6a', effect: { skill: -1 } },
    { text: '「层厚太厚，结节被平均掉了——换薄层重扫。」', next: 'c2d2_6b', effect: { skill: 2 }, tag: 'good' },
    { text: '「窗口没调好——换个窄窗再仔细看看。」', next: 'c2d2_6c', effect: { skill: -1 } },
  ]},
  c2d2_6a: { speaker: 'zhou', sprite: 'char_zhou', text: '（正好巡到白班）吸收？你把层厚调出来看看——**5mm的层厚，6mm的结节，落在两层中间就被「平均」掉了**。这叫**部分容积效应**：一个像素里装了什么，它就显示什么的平均值。「消失」和「没看着」，是两回事。复查薄层！', card: 'slice_partial', image: 'ct_lung', next: 'c2d2_w1' },
  c2d2_6b: { speaker: 'me', text: '**层厚越厚，每层里「混装」的组织越多，小病灶被周围组织平均掉——这就是部分容积效应**。肺结节复查必须薄层。改1mm薄层重扫这一段。', card: 'slice_partial', image: 'ct_lung', next: 'c2d2_w1' },
  c2d2_6c: { speaker: 'zhou', sprite: 'char_zhou', text: '窗口是「显示」，层厚是「采集」——**窗户擦得再亮，也看不见被楼板夹掉的东西**。有几层整个层面都没采到结节的信息，换什么窗都是白搭。问题在层厚：换薄层重扫！', card: 'slice_partial', image: 'ct_lung', next: 'c2d2_w1' },
  c2d2_w1: { speaker: 'sys', text: '薄层重建完成。老周敲敲屏幕：「**窗口调到肺窗，亲手把那枚『消失』的结节给我找出来。**」', image: 'ct_lung', windowTask: { image: 'ct_lung', targetW: 1500, targetL: -500, tolW: 220, tolL: 60, success: 'c2d2_w1ok' }, next: 'c2d2_w1ok' },
  c2d2_w1ok: { speaker: 'sys', text: '窗宽拉开到1500、窗位压到-500——肺野瞬间透亮，那枚6mm的磨玻璃结节，清清白白地躺在那里。', image: 'ct_lung', next: 'c2d2_7' },
  c2d2_7: { speaker: 'uncle', sprite: 'pat_uncle2', sfx: 'vox_uncle', text: '（拿着薄层重建出的片子，结节清清楚楚）去年说看不见了，敢情是没看着。', effect: { gold: 80 }, image: 'ct_lung', next: 'c2d2_8' },
  c2d2_8: { bg: 'bg_waiting', speaker: 'sys', text: '【队列事件】急诊插单：「腹痛待查，怀疑肠梗阻，加急！」——当前队列已排四人。', queue: C2D2_QUEUE2, sfx: 'ring', choices: [
    { text: '按规矩，急重症优先，立刻插队。', next: 'c2d2_9a', effect: { heart: 1 }, tag: 'good' },
    { text: '让他按号排，先来后到。', next: 'c2d2_9b', effect: { heart: -1, flag: 'queue_wait' } },
  ]},
  c2d2_9a: { speaker: 'sys', text: '你跟候诊的大爷大妈挨个解释，多数人都点头：「救急不救穷，懂！」队列重排，机房没有空转一分钟。', queue: C2D2_QUEUE2, next: 'c2d2_10' },
  c2d2_9b: { speaker: 'guy', sprite: 'pat_gut', sfx: 'vox_guy', text: '（四十分钟后才轮到他，已经疼得蜷在椅子上）疼死我了……急诊电话追过来，小何的声音不太好听：「肠梗阻等四十分钟？下次我让病人自己爬上去？」', queue: C2D2_QUEUE2, next: 'c2d2_10' },
  c2d2_10: { bg: 'bg_ctcontrol_day', speaker: 'me', text: '（阅片 · 腹窗）腹部肠管扩张、气液平面……**看腹部用腹窗**：窗宽放到350上下、窗位对准软组织密度，肝脾肠子才各归各位；要是拿肺窗看肚子，一团漆黑，拿骨窗看肚子，一片死白。', image: 'ct_abdomen', card: 'window_advanced', next: 'c2d2_q0' },
  // —— 队列事件2 ——
  c2d2_q0: { bg: 'bg_waiting', speaker: 'sys', text: '【队列事件】候诊区炸锅了：一位等了五十分钟的大爷拍着分诊台喊「再不上就投诉」；住院部电话同时进来：「术后复查的病人已经推到电梯口」；分诊台又喊：「**120刚出发，车祸伤，十分钟后到！**」', queue: C2D2_QUEUE2, sfx: 'ring', choices: [
    { text: '「先接电梯口那位术后加急，车祸伤一到直接进机房——大爷这边我亲自去解释，下一个门诊号就是他。」', next: 'c2d2_q1a', effect: { heart: 1 }, tag: 'good' },
    { text: '「大爷等得最久，先给他做——术后的回病房再等等。」', next: 'c2d2_q1b', effect: { flag: 'queue_wait' } },
    { text: '「都别催，机器就一台，按号来，车祸伤到了也得先登记拿号。」', next: 'c2d2_q1c', effect: { heart: -1, flag: 'queue_wait' } },
  ]},
  c2d2_q1a: { speaker: 'sys', text: '你蹲在大爷面前把话说明白：「**救命的事先进，您的号我盯着，下一位就是您。**」大爷哼了一声，把投诉电话挂了。十分钟后平车冲进来时，队列纹丝不乱。', queue: C2D2_QUEUE2, next: 'c2d2_t0' },
  c2d2_q1b: { speaker: 'sys', text: '大爷满意地进了机房。五分钟后病房护士的电话追过来：「术后复查的病人腹腔引流管都不稳了，还在走廊躺着？」——老好人，也是一种失职。', queue: C2D2_QUEUE2, next: 'c2d2_t0' },
  c2d2_q1c: { speaker: 'sys', text: '十分钟后，平车撞开候诊区的门，整个队列被动让路，大爷看得直摇头：「早干嘛去了。」——**按号来是最省事的公平，也是最懒的公平**。', queue: C2D2_QUEUE2, next: 'c2d2_t0' },
  // —— 第三例：车祸伤 ——
  c2d2_t0: { bg: 'bg_ctcontrol_day', speaker: 'sys', text: '第三例——车祸伤到了。颈托、止血带、床旁心电监护，一群人簇拥着推进机房。**头颅加全腹联合扫描，一步到位**，分诊台那边，你请小唐替你把大爷领到了下一个号。', queue: C2D2_QUEUE2, next: 'c2d2_t1' },
  c2d2_t1: { speaker: 'sys', text: '「嗡——」联合扫描完成。（腹窗阅片）肝脾实质密度均匀，未见破裂出血；腹腔无游离气体，肠管无扩张——**命保住了**，肋骨骨折归骨科。', image: 'ct_abdomen_trauma', sfx: 'xray', queue: C2D2_QUEUE2, next: 'c2d2_t2' },
  c2d2_t2: { speaker: 'sys', text: '抢救室来电话致谢：「多发伤十分钟出全图，这机器真是买值了。」候诊区的大爷也朝你竖了竖大拇指——投诉的事，再没人提。', effect: { heart: 1, gold: 60 }, queue: C2D2_QUEUE2, next: 'c2d2_11' },
  c2d2_11: { bg: 'bg_ctcontrol_day', speaker: 'sys', text: '第四例，手腕摔伤的学生。检查结束，图像交给医师判读。趁着空当，老周另调出一张颅骨教学图：「刚才说到骨窗，拿这张练练。注意，这不是刚才那位学生的片子。」', next: 'c2d2_w2' },
  c2d2_w2: { speaker: 'sys', text: '【独立调窗练习 · 颅骨教学图，非手腕病例】试着调到本练习的骨窗设置，观察颅骨与颅内软组织的显示差别。', image: 'ct_bone', windowTask: { image: 'ct_bone', targetW: 4000, targetL: 250, tolW: 400, tolL: 80, success: 'c2d2_w2ok' }, next: 'c2d2_w2ok' },
  c2d2_w2ok: { speaker: 'zhou', sprite: 'char_zhou', text: '这张颅骨教学图就用这组设置作比较。看骨和看脑，关注的细节不同，窗口也得跟着换。刚才那位学生的手腕，要看他自己的图，可不能拿这张下结论。', image: 'ct_bone', next: 'c2d2_n0' },
  // —— 中午 · 陆舟登场 ——
  c2d2_n0: { speaker: 'sys', text: '午休，机时难得空出来。一个抱着铝合金箱子的人探头进来，胸前挂着「田头技术大学」的访客牌。', next: 'c2d2_n1' },
  c2d2_n1: { speaker: 'luzhou', sprite: 'luzhou', sfx: 'vox_luzhou', text: '……真的是你？！我按申请单上的技师名字猜了半天——**老室友，本科睡你隔壁铺的陆舟**，四年不见，你都在县医院独当一面了！', next: 'c2d2_n2' },
  c2d2_n2: { speaker: 'me', sprite: 'luzhou', text: '陆舟？你不是读研去了——', next: 'c2d2_n3' },
  c2d2_n3: { speaker: 'luzhou', sprite: 'luzhou', text: '读着呢，跟导师做**CT低剂量重建算法**，顺便推进成果转化。课题卡在一件事上：**算法要训练、要验证，得有成建制的临床影像数据**。导师跟你们医务科走了流程，今天先来做个**体模实验**，采点机器的基础数据。', next: 'c2d2_n4' },
  c2d2_n4: { speaker: 'sys', text: '你帮他把水箱体模、线对卡体模摆上检查床，按实验单扫了三组参数。', image: 'ct_phantom', sfx: 'xray', next: 'c2d2_n5' },
  c2d2_n5: { speaker: 'luzhou', sprite: 'luzhou', text: '（打开笔记本，先给你看一张奇怪的图）先给你们工科生的老朋友——这是体模一圈扫下来的**原始数据，正弦图（sinogram）**：每个角度一排投影值，一个亮点走一圈就画成一条正弦曲线。**CT采集，本质就是Radon变换；重建，就是它的逆变换**。你们课上推过的，还记得吧？', image: 'img_sinogram', next: 'c2d2_n6' },
  c2d2_n6: { speaker: 'luzhou', sprite: 'luzhou', text: '（切到重建对比图）再看这组——同一台机器、同一个体模。最左边是**直接反投影：把每条投影原路「抹」回去**，角度再多，图像也糊着一层雾，亮点周围拖出星状尾巴。中间是**滤波反投影（FBP）**：回抹之前，先给投影做一个高通滤波——**频域里乘个 |ρ|，把反投影先天丢失的高频补回来**，边缘立刻锐利。临床几十年的江山都是它打的，快、稳、一步出图。', image: 'ct_phantom', next: 'c2d2_n7' },
  c2d2_n7: { speaker: 'me', sprite: 'luzhou', text: '那滤波器还有得选？', next: 'c2d2_n8' },
  c2d2_n8: { speaker: 'luzhou', sprite: 'luzhou', text: '有讲究。**Ram-Lak轮廓最清楚、分辨率最高，但噪声一大就跟着振荡；Shepp-Logan压了高频，图像光滑、抗噪好，代价是分辨率让一点**。所以机器上才有那么多重建核：**看骨头用锐利核，看软组织用平滑核**——空间分辨率和信噪比，永远是拿一个换另一个。', card: 'fbp_iterative', next: 'c2d2_n9' },
  c2d2_n9: { speaker: 'luzhou', sprite: 'luzhou', text: '右边是我们改进的**迭代重建（IR）**：先猜一幅图像，模拟它投影出去该是什么样，跟真实投影比对，**差值反投影回去修正，再猜、再比**——来回几十轮，噪声被一轮轮磨下去。代价是算力和时间。**但它能在更低的剂量下拿出同样能看的图——这就是低剂量CT的底气。**', next: 'c2d2_n10' },
  c2d2_n10: { speaker: 'luzhou', sprite: 'luzhou', text: '（收起体模）我们课题的靶子就一句话：**用尽量小的损伤，换精准的图像**——前提是看得清，看不清的便宜剂量没有意义。AI降噪也是这条路上的，所以我说，**你们缺算法，我们缺数据**。', next: 'c2d2_n11' },
  c2d2_n11: { speaker: 'sys', text: '【实验结束。陆舟搓着手，进入正题——】', sprite: 'luzhou', next: 'c2d2_n12' },
  c2d2_n12: { speaker: 'luzhou', sprite: 'luzhou', text: '那个……老同学，跟你打听个事。你们科能不能……给我们点**去标识化的临床数据**？几百例就行，训练验证用。伦理批件我们在办，就是慢，太慢了。', next: 'c2d2_n13' },
  c2d2_n13: { speaker: 'sys', text: '【怎么回应？】', sprite: 'luzhou', choices: [
    { text: '「走正规流程：伦理批件+去标识化+数据使用协议，缺一不可。我帮你问小雷怎么提交流程快。」', next: 'c2d2_14a', effect: { skill: 1, flag: 'luzhou_formal', badge: 'phantom_friend' }, tag: 'good' },
    { text: '「数据是病人的，我做不了主。你先做体模，临床数据的事咱按规矩来。」', next: 'c2d2_14b', effect: { flag: 'luzhou_wait' } },
    { text: '「我先帮你拷几百例？别外传就行。」', next: 'c2d2_14c', effect: { wealth: -1, flag: 'luzhou_gray' } },
  ]},
  c2d2_14a: { speaker: 'luzhou', sprite: 'luzhou', text: '（挠头）就知道你会这么说……行，听你的。其实我们导师也是这个意思，是我急。**缺什么都不能缺规矩**。', next: 'c2d2_15a' },
  c2d2_15a: { speaker: 'luzhou', sprite: 'luzhou', text: '（忽然想起什么）对了，说起来气人——你们厂家那个远程终端，数据不是都回传厂家云了吗？**厂家拿数据一句话的事，我们做科研走流程走了半年**。这公平吗？', next: 'c2d2_16a' },
  c2d2_16a: { speaker: 'me', sprite: 'luzhou', text: '（你想起小凯那个黑盒子，和小雷那句「单独走的一条外网」。）……这事，回头我帮你问问。', next: 'c2d2_n17' },
  c2d2_14b: { speaker: 'luzhou', sprite: 'luzhou', text: '得，你一点没变，还是宿舍里最有原则的那个人。……流程我接着跑，你们这儿我会常来的。', next: 'c2d2_n17' },
  c2d2_14c: { speaker: 'luzhou', sprite: 'luzhou', text: '（反而往后退了一步）别别别——我做科研的，最清楚这个口不能开。**没走伦理和去标识化的数据，到我手里就是定时炸弹**。……你也就说说，对吧？（你确实只是说说。但说出口的瞬间，你自己也吓了一跳。）', next: 'c2d2_n17' },
  c2d2_n17: { speaker: 'sys', text: '陆舟抱着体模走了，留下一本实验记录：「**体模实验数据归你们科存档，说不定哪天质控用得上**。」', effect: { flag: 'phantom_log' }, event: 'ch2_luzhou', next: 'c2d2_p1' },
  // —— 下午收梢 ——
  c2d2_p1: { speaker: 'sys', text: '下午高峰，住院部插单、门诊加号此起彼伏。你把队列调得像个调度台——危重优先、预约不凉、机房不空转。', next: 'c2d2_p2' },
  c2d2_p2: { speaker: 'tang', sprite: 'char_tang', text: '（下班前探头）嚯，今天零投诉！主任在全科会上点名：「白班队列，就是要这个狠劲。」', next: 'c2d2_p3' },
  c2d2_p3: { speaker: 'sys', text: '【本日结算】白班补贴 +200 金币。第2日 ·「窗口」——完。', effect: { gold: 200, ap: -99 }, end: true },
}

/* ================= 第3夜「快」 ================= */
const C2N3: Record<string, Step> = {
  c2n3_0: { bg: 'bg_ctcontrol', speaker: 'sys', text: '晚上九点半。白班的喧嚣散尽，CT室只剩下机架待机的低鸣。', next: 'c2n3_1' },
  c2n3_1: { speaker: 'sys', text: '「咔哒」——打卡成功。', sfx: 'stamp', effect: { gold: 50, ap: 3 }, next: 'c2n3_2' },
  c2n3_2: { speaker: 'tang', sprite: 'char_tang', text: '今晚你可得盯紧点——护士长说，新CT启用后，**卒中绿道的DNT考核落到咱科头上了**。', next: 'c2n3_3' },
  c2n3_3: { speaker: 'me', sprite: 'char_tang', text: 'DNT？', next: 'c2n3_4' },
  c2n3_4: { speaker: 'tang', sprite: 'char_tang', text: '**Door-to-Needle Time，入院到溶栓给药的时间**。缺血性卒中，时间就是大脑，每耽误一分钟，190万个神经元死亡。CT排出血是溶栓的前提，咱科是这条链上的第一环。', card: 'stroke_dnt', next: 'c2n3_hub' },
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
  c2n3_a2: { speaker: 'wen', sprite: 'char_wen', text: '（抽出一页草案给你看）喏，这一页是我专门给你们加的：**球管按曝光次数阶梯计价，超支部分封顶**——白班夜班连轴转的医院，球管是耗材，不是固定资产，不这么写你们迟早吃亏。', image: 'ev_maintenance_draft', effect: { flag: 'maintenance_draft' }, next: 'c2n3_a3' },
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
  c2n3_d2: { speaker: 'tang', sprite: 'char_tang', text: '你说怪不怪，他每年都换科室，每年都查不出毛病，明年还来。……欸，是不是压力太大啦？', effect: { flag: 'c2n3_d' }, next: 'c2n3_hub' },
  // —— K. 关东煮 · 小何（买了零食礼包） ——
  c2n3_k1: { bg: 'bg_breakroom', speaker: 'sys', text: '你把小卖部买的零食礼包拆开——里面正好有两盒自热关东煮。开水一冲，香气混着海带味漫开，你端着它走向急诊分诊台。小何的眼睛亮得像看见了亲人。', image: 'item_snack', effect: { ap: -1, loseItem: 'snack' }, next: 'c2n3_k2' },
  c2n3_k2: { speaker: 'he', sprite: 'char_he', text: '（烫得直哈气）夜班之神！……跟你讲个事，你可别外传——**那个每年11月来的自费病人，我前年收拾分诊台，翻到过他掉的老缴费单存根，收款章还是1998年的老样式**。二十多年了，他到底图什么呀？', next: 'c2n3_k3' },
  c2n3_k3: { speaker: 'sys', text: '你们分完了最后一串丸子。有些问题没有答案，但至少今夜，关东煮是热的。', effect: { heart: 1, badge: 'night_snack', flag: 'c2n3_k' }, next: 'c2n3_hub' },
  // —— BK. 二手书的秘密（买了二手《医学影像学》） ——
  c2n3_bk1: { speaker: 'sys', text: '候诊间隙，你翻开自己买的那本二手《医学影像学》——书页间滑出一张旧书签，上面一行褪色的钢笔字。', next: 'c2n3_bk2' },
  c2n3_bk2: { speaker: 'sys', text: '「**窗口调到病灶上，功夫下在病人前。**」——落款只有一个字：「**周**」，1999年。（你忽然明白，这本书是从谁的书架上流出来的。页边的批注密密麻麻，全是干货。）', image: 'item_book', effect: { skill: 1, flag: 'c2n3_bk' }, card: 'old_book_note', next: 'c2n3_hub' },
  // —— 开诊主线：卒中绿道 ——
  c2n3_m0: { speaker: 'sys', text: '凌晨两点，电话铃声像警报一样炸响。', sfx: 'ring', dnt: 15, next: 'c2n3_m1' },
  c2n3_m1: { speaker: 'he', phone: 'char_he', text: '绿道！**72岁男性，房颤病史，一小时前突发右侧偏瘫、失语**——NIHSS 12分，考虑左侧大脑中动脉！CT平扫，排出血，立刻！', dnt: 15, next: 'c2n3_m2' },
  c2n3_m2: { bg: 'bg_ctroom', speaker: 'sys', text: '平车冲进CT室。老人躁动不安，右侧肢体完全不动，嘴里发出含混的音节。', dnt: 17, next: 'c2n3_m3' },
  c2n3_m3: { speaker: 'zhou', sprite: 'char_zhou', text: '（今晚他值班室坐镇）听好流程：**平扫排出血 → 无出血即刻溶栓 → CTA找责任血管 → 大血管闭塞转上级取栓**。DNT目标60分钟，现在已经过去15分钟——**你的每一秒，都是病人的神经元**。', dnt: 17, next: 'c2n3_m4' },
  c2n3_m4: { speaker: 'zhou', sprite: 'char_zhou', text: '扫的时候把**螺距拉大**。**螺距就是球管转一圈、床走的距离除以探测器宽度**——螺距拉上去，扫得快、剂量还低一些，代价是插值出来的层面糙一点。**绿道抢时间，糙一点换快，值；回头要精细评估，再补小螺距**。', card: 'helical_intro', dnt: 20, next: 'c2n3_m5' },
  c2n3_m5: { speaker: 'me', text: '开机、定位像、扫描——「嗡——」', sfx: 'xray', dnt: 24, next: 'c2n3_m6' },
  c2n3_m6: { speaker: 'sys', text: '【老人躁动，图像蒙了一层运动伪影。怎么办？】', image: 'ct_motion', dnt: 26, choices: [
    { text: '「图像能看，凑合用，抢时间。」', next: 'c2n3_m7a', effect: { skill: -1, flag: 'c2n3_wrong' } },
    { text: '「重扫！请小唐帮着固定头部，多花30秒换一张能签字的图。」', next: 'c2n3_m7b', effect: { skill: 2, badge: 'cool_head' }, tag: 'good' },
  ]},
  c2n3_m7a: { speaker: 'zhou', sprite: 'char_zhou', text: '（皱眉盯着屏幕）**运动伪影是双方向的模糊拖影，跟出血的锐利边界不一样**……但这层雾把基底节区糊住了。**排出血是要签字负责的，模糊图像签字，签的是你的侥幸。**重扫！我来稳住他的头。', image: 'ct_motion', dnt: 29, next: 'c2n3_m8' },
  c2n3_m7b: { speaker: 'me', text: '**运动伪影可以靠制动和快速扫描压住，但漏掉出血，溶栓就是灾难**。30秒换一条命的安全边界，值！（小唐和老周三只手稳稳扶住老人头部。重扫图像干净利落。）', dnt: 29, image: 'ct_motion', next: 'c2n3_m8' },
  c2n3_m8: { speaker: 'sys', text: '平扫图像：**各脑叶未见明确高密度出血灶，左侧大脑中动脉走行区隐约密度偏高**——「致密动脉征」！', image: 'ct_head_stroke', card: 'stroke_ct_sign', dnt: 33, next: 'c2n3_m9' },
  c2n3_m9: { speaker: 'zhou', sprite: 'char_zhou', text: '**平扫未见出血——溶栓的绿灯亮了！**立刻通知卒中团队给药，同时做CTA——找那根堵住的血管！', dnt: 38, image: 'ct_head_stroke', next: 'c2n3_m10' },
  c2n3_m10: { speaker: 'me', text: '（切到CTA模式）经静脉团注碘对比剂，球管追着药峰扫——**动脉期图像里，左侧大脑中动脉M1段，齐刷刷地断了**。', image: 'ct_cta', card: 'cta_intro', sfx: 'xray', dnt: 44, next: 'c2n3_m11' },
  c2n3_m11: { speaker: 'he', phone: 'char_he', text: '溶栓药已上！……M1段闭塞？！马上联系上级医院，**取栓绿道同步启动**——', dnt: 47, image: 'ct_cta', next: 'c2n3_m12' },
  c2n3_m12: { speaker: 'sys', text: '平车再次呼啸而去。你抬头看表——**从入院到给药，52分钟**。DNT达标。', effect: { badge: 'dnt_hero' }, event: 'ch2_stroke', dnt: 52, next: 'c2n3_m13' },
  c2n3_m13: { speaker: 'zhou', sprite: 'char_zhou', text: '（难得地呼出一口气，拍了拍机架）过去这种病人，我们只能往市里送。……记一笔：今晚这台机器，把这条命留在了县里。', next: 'c2n3_h0' },
  // —— 第二例：凌晨的胸痛 ——
  c2n3_h0: { speaker: 'sys', text: '刚喘口气，分诊铃又响。凌晨三点半，急诊推进来一个人：**52岁男性，突发胸痛两小时，胸口像压了块磨盘，疼得攥着衣襟说不出整话，一身冷汗**。心电图：下壁导联ST段压低。', sfx: 'ring', next: 'c2n3_h1' },
  c2n3_h1: { speaker: 'he', sprite: 'char_he', text: '心内科值班已经到了。肌钙蛋白阳性——**急性冠脉综合征，危险分层中高危**。心内打电话问我们：先做冠脉CTA，还是直接推导管室上冠脉造影？**你们影像科拿个意见。**', next: 'c2n3_h2' },
  c2n3_h2: { speaker: 'sys', text: '【CTA还是造影？——这个纠结，全写在心内科值班医生的脸上】', sprite: 'char_he', choices: [
    { text: '「先冠脉CTA：无创、一支静脉针的事，几分钟出全图，三支冠脉加钙化一目了然——先摸清情况再定。」', next: 'c2n3_h3a', effect: { skill: 2 }, tag: 'good' },
    { text: '「直接冠脉造影：金标准，查到狭窄当场放支架，一步到位。」', next: 'c2n3_h3b' },
    { text: '「先拍张胸片看看，别上来就大检查。」', next: 'c2n3_h3c', effect: { skill: -1 } },
  ]},
  c2n3_h3a: { speaker: 'me', sprite: 'char_he', text: '他血流动力学还稳、ST段是压低不是抬高——**这个分层，CTA是「先手」**：无创、快、看得全。真扫出重度狭窄，再进导管室不迟。**先无创摸底、再有创兜底，是顺序，不是重复。**', card: 'cta_vs_dsa', next: 'c2n3_h4' },
  c2n3_h3b: { speaker: 'zhou', sprite: 'char_zhou', text: '（摇头）金标准不假，可你想过没有——**造影要进导管室、要穿刺置管、要一团人围着**，他这情况还没到非上不可的分层。**CTA先扫一圈：无创，几分钟，三支血管全看见**；真重度狭窄，CTA不但不挡路，还顺便把钙化都标给导管室了。', card: 'cta_vs_dsa', next: 'c2n3_h4' },
  c2n3_h3c: { speaker: 'zhou', sprite: 'char_zhou', text: '胸片？**胸片看冠脉，等于隔着毛玻璃数头发**。胸痛要看的不是肺，是血管——要么CTA，要么造影，没有第三条路。', next: 'c2n3_h4' },
  c2n3_h4: { speaker: 'sys', text: '心内值班医生一拍板：「CTA！」控制心率、团注碘对比剂，球管追着药峰扫——「嗡——」图像上，**右冠状动脉中段，一段亮起来的血管里嵌着一块没亮的斑块，管腔窄了七成**。', sfx: 'xray', image: 'ct_coronary_cta', next: 'c2n3_h5' },
  c2n3_h5: { speaker: 'zhou', sprite: 'char_zhou', text: '（指着屏幕）记住这个分工——**CTA看冠脉，看的是「路」：哪支窄、窄多少、钙化多重**；**造影看的是「实时车流」，还能当场放支架开路**。一个是无创的地图，一个是有创的施工现场。**先用哪个，看病人的危险分层，也看钟点。**这张地图，够心内定方案了。', image: 'ct_coronary_cta', next: 'c2n3_h6' },
  c2n3_h6: { speaker: 'sys', text: '心内收住院，择期造影。你看了眼表：凌晨三点五十二分。**这一夜，CT快在抢时间，也快在把「做不做、怎么做」的纠结，变成一张看得清的图。**', effect: { gold: 100 }, next: 'c2n3_x0' },
  // —— 支线：神秘病人第二诊 ——
  c2n3_x0: { bg: 'bg_corridor', speaker: 'sys', text: '凌晨四点，胸痛病人收进心内科，科室静下来。候诊椅上，坐着一个安静得几乎透明的人。', next: 'c2n3_x1' },
  c2n3_x1: { speaker: 'mystery', sprite: 'pat_mystery', sfx: 'vox2_mystery', text: '医生，又是我。（他递上申请单：神经内科，头颅CT平扫，全自费）', next: 'c2n3_x2' },
  c2n3_x2: { speaker: 'me', sprite: 'pat_mystery', text: '（又是他。每年都来的那个男人。）……头痛？多久了？', next: 'c2n3_x3' },
  c2n3_x3: { speaker: 'mystery', sprite: 'pat_mystery', text: '说不清。一睡着就疼，像有什么东西在脑子里翻。（他顿了顿）**你们换新机器了。……老机器的数据，还在吗？**', next: 'c2n3_x4' },
  c2n3_x4: { speaker: 'me', sprite: 'pat_mystery', text: '（后背微微发凉）……您问这个做什么？', next: 'c2n3_x5' },
  c2n3_x5: { speaker: 'mystery', sprite: 'pat_mystery', text: '（笑了笑，比哭还淡）随便问问。……医生，**如果机器说没事，是不是就真的没事？**', next: 'c2n3_x6' },
  c2n3_x6: { speaker: 'sys', text: '【怎么回答？】', sprite: 'pat_mystery', choices: [
    { text: '「机器看不到的，医生帮你看。先扫，有事我们一起扛。」', next: 'c2n3_x7a', effect: { heart: 1 }, tag: 'good' },
    { text: '「CT很先进，多数问题都能查出来。」', next: 'c2n3_x7b' },
  ]},
  c2n3_x7a: { speaker: 'mystery', sprite: 'pat_mystery', text: '（盯着地面很久）……上一个这么跟我说话的人，是二十年前了。（他站起身，没再说话。）', next: 'c2n3_x8' },
  c2n3_x7b: { speaker: 'mystery', sprite: 'pat_mystery', text: '「多数」……那剩下的呢？（他摇摇头，走进了扫描间。）', next: 'c2n3_x8' },
  c2n3_x8: { speaker: 'sys', text: '扫描完成。头颅CT平扫：**干干净净，未见任何异常**。', image: 'ct_head_clean', sfx: 'xray', next: 'c2n3_x9' },
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
  c2d4_8: {"speaker":"zhou","sprite":"char_zhou","text":"要等血管强化起来，再把该扫的范围扫全。机器转得快有用，扫早了、漏了一段，快也白搭。","next":"c2d4_t1"},
  c2d4_t1: {"speaker":"sys","text":"扫描结束，图像一层层铺开。主任拉过椅子，来回翻了几遍，又调出沿主动脉走向的重组图。","next":"c2d4_t1ok"},
  c2d4_t1ok: {"speaker":"me","text":"这条细线……怎么把血管里面分成两边了？","next":"c2d4_t1no"},
  c2d4_t1no: {"speaker":"director","sprite":"char_director","text":"是内膜片。这里形成了真腔和假腔，考虑主动脉夹层。把完整序列调出来，我看一下累及范围。","next":"c2d4_t2"},
  c2d4_t2: {"speaker":"sys","text":"主任对照原始薄层图像和多个切面确认，随即给急诊打电话，说明发现并安排紧急专科评估。你没有再插话，把所需图像逐一传好。","next":"c2d4_t2ok"},
  c2d4_t2ok: {"speaker":"me","text":"刚才换了好几个方向看，没有再扫吧？","next":"c2d4_t2no"},
  c2d4_t2no: {"speaker":"zhou","sprite":"char_zhou","text":"没再照。那一组容积数据还在，换个方向重组就行。别只盯着那张漂亮的立体图，原始层也得留好。","next":"c2d4_t3ok"},
  c2d4_t3ok: {"speaker":"sys","text":"推床离开时，妻子追上来问报告在哪里领。主任指了指同行的医生：「图像和结果已经联系好了，先跟医生走。」","next":"c2d4_9"},
  c2d4_9: {"speaker":"sys","text":"走廊安静下来。老周端起杯子，发现茶已经凉了。他看了眼时钟，把杯盖拧了回去。","next":"c2d4_10"},
  c2d4_10: {"speaker":"zhou","sprite":"char_zhou","text":"先别热。下一位到门口了。","next":"c2d4_11a"},
  c2d4_11a: {"speaker":"sys","text":"下午，一位头痛的老爷子在门口摸了摸口袋：「手机钥匙都交了。我这人没别的毛病，就是零碎多。」","next":"c2d4_12a"},
  c2d4_12a: {"speaker":"sys","text":"头部图像出来后，颅底附近横着几道黑白条纹。你往下翻了一层，条纹更重，像有什么东西把画面扯开了。","next":"c2d4_13"},
  c2d4_13: {"speaker":"me","text":"周师傅，机器又出问题了？上午还好好的。","next":"c2d4_14"},
  c2d4_14: {"speaker":"zhou","sprite":"char_zhou","text":"先别给机器判刑。亮得最扎眼的那块在哪儿？","next":"c2d4_15"},
  c2d4_15: {"speaker":"me","text":"嘴附近……是不是牙上的金属？","next":"c2d4_p0"},
  c2d4_p0: {"speaker":"grandpa","sprite":"pat_grandpa2","text":"（听见老周问义齿，一拍腿）还有这副活动牙！你们问金属，我光惦记钥匙了。这牙天天戴，早当成自己的了。","next":"c2d4_p1"},
  c2d4_p1: {"speaker":"zhou","sprite":"char_zhou","text":"怪我们，刚才没问具体。能自己取下来吗？固定在嘴里的可别硬动。","next":"c2d4_p2a"},
  c2d4_p2a: {"speaker":"grandpa","sprite":"pat_grandpa2","text":"（取下活动义齿，接过收纳盒）人没修好，先把零件拆了。盒子可别丢，配这口牙比买手机还贵。","next":"c2d4_p3a"},
  c2d4_p3a: {"speaker":"me","text":"那刚才那些黑线，不是脑子里真的有裂缝？","next":"c2d4_p2b"},
  c2d4_p2b: {"speaker":"zhou","sprite":"char_zhou","text":"不是那么回事。金属挡掉的射线太多，还把穿过去的射线能量分布改了。重建出来就可能拖出这些条纹，旁边的组织也跟着看不清。","next":"c2d4_p2c"},
  c2d4_p2c: {"speaker":"me","text":"把窗调一调，能救回来吗？","next":"c2d4_p3b"},
  c2d4_p3b: {"speaker":"zhou","sprite":"char_zhou","text":"可以试，但不能指望调窗把缺的信息补回来。先让医生看哪些地方受影响，再决定要不要补，别整套重扫。","next":"c2d4_m1"},
  c2d4_m1: {"speaker":"sys","text":"医师确认颅底附近的图像不足以判断病情。去除活动义齿后，团队只补充了必要范围的扫描，条纹明显减轻。新旧图像一起保留，交由医师完成判读。","next":"c2d4_m2"},
  c2d4_m2: {"speaker":"sys","text":"老爷子拿回义齿盒，开盖数了数。老周乐了：「放心，一颗没扣。」老爷子把盒子揣好：「这可说不准，你们机器刚才照得那么狠。」","next":"c2d4_m3"},
  c2d4_m3: {"speaker":"me","text":"上午血管里那条线是真的，下午这些条纹倒是机器算出来的。光看着吓人，还真不能乱猜。","next":"c2d4_m4"},
  c2d4_m4: {"speaker":"zhou","sprite":"char_zhou","text":"嗯。看不清就说看不清，别替图像把故事编完了。收拾一下，主任叫我们五点去开会。","next":"c2d4_e0"},
  // 旧选项分支落点：继续同一病例，不保留已撤掉的处置教学。
  c2d4_11b: { speaker: 'sys', text: '下一位病人已经来到检查室门口。', next: 'c2d4_11a' },
  c2d4_11c: { speaker: 'sys', text: '下一位病人已经来到检查室门口。', next: 'c2d4_11a' },
  // —— 傍晚 · 数据回传摊牌 ——
  c2d4_e0: { bg: 'bg_office_day', speaker: 'sys', text: '下午五点，医生办公室。主任召集临时小会：老周、你、小雷。桌上摊着一份厂家彩页：《**远程质控服务方案**》。', image: 'ev_remote_proposal', next: 'c2d4_e1' },
  c2d4_e1: { speaker: 'director', sprite: 'char_director', text: '厂家提议，**免费给我们装「远程质控服务」**——设备运行数据、图像质量参数，自动回传厂家云端，他们出月度质控报告，帮我们盯着机器状态。我觉得是好事，你们怎么看？', next: 'c2d4_e2' },
  c2d4_e2: { speaker: 'zhou', sprite: 'char_zhou', sprite2: 'char_director', text: '（慢悠悠地）**数据出了院门，就不是咱家的了。**运行数据我信，**可「图像质量参数」这四个字，边界在哪？**病人的图，会不会也跟着出去了？', next: 'c2d4_e3' },
  c2d4_e3: { speaker: 'lei', sprite: 'char_lei', text: '（推了推眼镜，打开电脑）我……我上周抓了个包。那台远程终端回传的数据流里，**不只是设备日志**。DICOM头里的字段——**患者ID、姓名、检查时间、诊断关键词**——都在里面。**没脱敏。**', effect: { flag: 'remote_proposal' }, next: 'c2d4_e4' },
  c2d4_e4: { speaker: 'director', sprite: 'char_lei', sprite2: 'char_director', text: '（脸色沉下来）你确定？', next: 'c2d4_e5' },
  c2d4_e5: { speaker: 'lei', sprite: 'char_lei', text: '确定。我截了图，存在本地。**厂家说「自动脱敏」，但脱敏脚本没清DICOM头。**（他顿了顿）而且，合同附件三写的是「为改进服务质量，乙方有权使用脱敏后数据」——**「脱敏后」三个字，是他们自己定义的**。', next: 'c2d4_e6' },
  c2d4_e6: { speaker: 'sys', text: '【你的表态？】', sprite: 'char_lei', choices: [
    { text: '「支持主任，装上。大医院都用，效率优先。」', next: 'c2d4_e7a', effect: { heart: -1, flag: 'data_support' } },
    { text: '「支持老周，反对。病人的数据，一寸都不能出。」', next: 'c2d4_e7b', effect: { skill: 1, flag: 'data_oppose' } },
    { text: '「折中：先断开外网，让小雷审计全部字段，制定本院数据管理流程，再决定接不接、怎么接。」', next: 'c2d4_e7c', effect: { skill: 1, heart: 1, badge: 'gatekeeper', flag: 'data_audit' }, tag: 'good' },
  ]},
  c2d4_e7a: { speaker: 'zhou', sprite: 'char_zhou', text: '（摇头）效率我懂。但**病人的脸，不能为了效率蒙着纱就出门**。', next: 'c2d4_e8' },
  c2d4_e7b: { speaker: 'director', sprite: 'char_director', text: '（叹气）道理我懂，可厂家后续维保、升级，都指着这条线……完全断掉，我们也被动。', next: 'c2d4_e8' },
  c2d4_e7c: { speaker: 'director', sprite: 'char_director', text: '（沉吟片刻）……就按你说的办。**小雷，本周内出审计报告。老周，你牵头起草本院影像数据管理规范。这事先封起来，谁也别对外说。**', event: 'ch2_data_showdown', next: 'c2d4_e8' },
  c2d4_e8: { speaker: 'sys', text: '散会。你走出办公室，天色已黑。陆舟下午发来消息：「**伦理批件下周提交，等批下来，我再来。**」你想起小雷屏幕上那串未经脱敏的DICOM字段——**有人走流程走了半年，有人一句话就拿走了全部**。', effect: { flag: 'data_hook' }, next: 'c2d4_e9' },
  c2d4_e9: { speaker: 'sys', text: '【本日结算】白班补贴 +250 金币。第4日 ·「狠」——完。', effect: { gold: 250, ap: -99 }, end: true },
}

/* ================= 第5夜「值守」 ================= */
const C2N5: Record<string, Step> = {
  c2n5_0: { bg: 'bg_corridor', speaker: 'sys', text: '晚上九点半。你推开科室大门，第一眼就看见老周在收拾他的更衣柜——白大褂、听诊器、一本翻烂的《医学影像学》，全装进了纸箱。', next: 'c2n5_1' },
  c2n5_1: { speaker: 'sys', text: '「咔哒」——打卡成功。', sfx: 'stamp', effect: { gold: 50, ap: 3 }, next: 'c2n5_2' },
  c2n5_2: { speaker: 'zhou', sprite: 'char_zhou', text: '来了？今晚开始，**夜班你一个人扛**。我返聘到年底，但夜班排班，今晚是最后一班。', next: 'c2n5_3' },
  c2n5_3: { speaker: 'me', sprite: 'char_zhou', text: '（愣住）……为什么？', next: 'c2n5_4' },
  c2n5_4: { speaker: 'zhou', sprite: 'char_zhou', text: '（把纸箱封口）**机器换了，人也得换**。我在，你永远觉得背后有人。**从今晚起，这间CT室，夜班你说了算。**（他递过来一张门禁卡）主任批的。', next: 'c2n5_5' },
  c2n5_5: { speaker: 'zhou', sprite: 'char_zhou', text: '（走到门口，又停下）对了——整理柜子翻出个东西。（他摊开手掌，一枚形状奇特的铜片，像某种图案的一半）**封条柜的钥匙，另一半**。当年我师父把钥匙掰成两半，一半留在科里，一半……原来在我柜子的夹层里。', image: 'item_zhou_key', next: 'c2n5_hub' },
  c2n5_hub: { speaker: 'sys', text: '【自由行动 · 行动力⚡×3】', choices: [
    { text: '封条柜 · 开锁（⚡-1）', next: 'c2n5_a1', cond: { notFlag: 'c2n5_cabinet', ap: 1 }, tag: 'good' },
    { text: '小唐的送别礼（⚡-1）', next: 'c2n5_b1', cond: { notFlag: 'c2n5_b', ap: 1 } },
    { text: '设备间巡检（⚡-1）', next: 'c2n5_e1', cond: { notFlag: 'c2n5_e', ap: 1 } },
    { text: '值班室翻书《CT夜班二十页》', next: '@book2' },
    { text: '小卖部', next: '@shop' },
    { text: '【开诊】值守CT室', next: 'c2n5_m0', cond: { flag: 'c2n5_cabinet' }, tag: 'good' },
    { text: '【开诊】……总觉得还有件事没做', next: 'c2n5_lock', cond: { notFlag: 'c2n5_cabinet' } },
  ]},
  c2n5_lock: { speaker: 'sys', text: '你摸了摸口袋里那半枚铜片——先去旧片库，把那件三十年的事了了，再开诊。', next: 'c2n5_hub' },
  // —— A. 封条柜 ——
  c2n5_a1: { bg: 'bg_archive', speaker: 'sys', text: '老周陪你走进旧片库。月光从高窗照进来，封条柜上的两张封条依然交叉贴着，「……周……存」三个字在月光下泛黄。', effect: { ap: -1 }, next: 'c2n5_a2' },
  c2n5_a2: { speaker: 'zhou', sprite: 'char_zhou', text: '（把两半铜片拼在一起——严丝合缝，一个完整的「周」字）……**原来是这儿**。', image: 'item_zhou_key', next: 'c2n5_a3' },
  c2n5_a3: { speaker: 'sys', text: '铜片插入锁孔，转了两圈。「咔哒」——柜门开了。', sfx: 'click', next: 'c2n5_a4' },
  c2n5_a4: { speaker: 'me', sprite: 'char_zhou', text: '（屏住呼吸）里面没有金银财宝，只有：**一本更老的登记册**，和一沓**没有名字的片袋**。', next: 'c2n5_a5' },
  c2n5_a5: { speaker: 'zhou', sprite: 'char_zhou', text: '（翻开登记册，手指停在某一页）1978年……1983年……1998年。（他忽然停住——**1998年11月的那一页，被撕掉了**。撕口整齐，像用尺子比着撕的。）', image: 'ev_old_register', next: 'c2n5_a6' },
  c2n5_a6: { speaker: 'me', sprite: 'char_zhou', text: '（翻看那沓片袋）袋子上没有名字，没有登记号，只有日期——**从1978年到1999年，每年11月，一袋不少**。', image: 'ev_nameless_films', choices: [
    { text: '（把片袋放回去）', next: 'c2n5_a7' },
    { text: '（等等——柜壁内侧，好像还有个小抽屉）', next: 'c2n5_k1', cond: { item: 'key' }, tag: 'good' },
  ]},
  // —— 柜中柜（买了黄铜钥匙） ——
  c2n5_k1: { speaker: 'sys', text: '抽屉的锁眼很小。你摸出小卖部那串黄铜钥匙，试到第三把——「咔」。**里面没有信，没有钱，只有一张1983年的老照片。**', sfx: 'click', effect: { flag: 'old_photo' }, image: 'ev_old_photo', next: 'c2n5_k2' },
  c2n5_k2: { speaker: 'sys', text: '照片上，年轻的放射科全体站在一台老式X光机前，背面一行褪色的字：「**一九八三年十一月，科里添新机。**」——而前排正中间那个人的脸，**被人用指甲一点一点刮掉了**。（你把照片递给老周。他看了很久，把它放回抽屉，轻轻推上。）「收起来吧。」他说，「**不问。**」', image: 'ev_old_photo', next: 'c2n5_a7' },
  c2n5_a7: { speaker: 'zhou', sprite: 'char_zhou', text: '（把登记册和片袋重新放回柜里，轻轻合上柜门）……**有些东西，该知道的时候，自然会知道**。今晚你看到的一切，先存在这里。（他指指自己的太阳穴，又指指你的心口。）', effect: { flag: 'old_register' }, event: 'ch2_cabinet', next: 'c2n5_a8' },
  c2n5_a8: { speaker: 'sys', text: '走出片库，老周忽然说：「**下周市三甲质控组来抽查，你代表科室迎检。**」你刚想问为什么，他已经摆摆手走了。', effect: { flag: 'zhou_handover' }, next: 'c2n5_a9' },
  c2n5_a9: { speaker: 'sys', text: '片袋的日期在你脑子里打转：1978到1999，每年11月——那沓没有名字的片袋，被你一起记住了。', effect: { flag: 'nameless_films' }, next: 'c2n5_a10' },
  c2n5_a10: { speaker: 'sys', text: '回到CT室门口，你把那半枚铜片收进贴身的口袋。', effect: { flag: 'c2n5_cabinet' }, next: 'c2n5_hub' },
  // —— B. 小唐的送别礼 ——
  c2n5_b1: { speaker: 'tang', sprite: 'char_tang', text: '（塞给你一个保温盒）老周最后一班夜班，我卤了牛肉。……以后夜班就咱俩了，**你可不许学他通宵不睡**。', image: 'item_beef', effect: { ap: -1 }, next: 'c2n5_b2' },
  c2n5_b2: { speaker: 'sys', text: '【打开保温盒】牛肉切得整整齐齐，下面压着一张纸条：「**CT夜班口诀：快而不乱，狠而不莽。——小唐代老周赠**」', effect: { heart: 1, flag: 'c2n5_b' }, next: 'c2n5_hub' },
  // —— E. 设备间巡检 ——
  c2n5_e1: { speaker: 'sys', text: '独立值守的第一夜，你把设备间里里外外巡了一遍：恒温22度，湿度正常，机架待机灯幽蓝。墙角那台远程终端……', image: 'item_remote', effect: { ap: -1 }, choices: [
    { text: '（那台黑盒子……走过去看一眼）', next: 'c2n5_e1x', cond: { flag: 'data_audit' } },
    { text: '（那台黑盒子……走过去看一眼）', next: 'c2n5_e1y', cond: { notFlag: 'data_audit' } },
    { text: '（不碰它，继续巡检）', next: 'c2n5_e2' },
  ]},
  c2n5_e1x: { speaker: 'sys', text: '网线已经拔掉，网口灯黑着——断外网审计，是那天散会时定了的事。你拍了拍机壳：**你的账，周一会上慢慢算。**', next: 'c2n5_e2' },
  c2n5_e1y: { speaker: 'sys', text: '天线一闪，一闪。「免费的」——小凯说这个词的时候有多轻松，你现在看着它就有多刺眼。', next: 'c2n5_e2' },
  c2n5_e2: { speaker: 'sys', text: '【顺手干点什么？】', choices: [
    { text: '（把机架外壳的灰仔细擦了一遍）', next: 'c2n5_e3a', effect: { heart: 1 } },
    { text: '（顺着远程终端的网线，把走向摸了一遍）', next: 'c2n5_e3b', effect: { skill: 1, flag: 'term_checked' } },
    { text: '（什么都不碰，在巡检表上签字）', next: 'c2n5_e3c' },
  ]},
  c2n5_e3a: { speaker: 'sys', text: '擦到机架铭牌的时候，你忽然明白老周为什么总在这儿一站就是半天——**那不是发呆，是给机器听诊**。', next: 'c2n5_e4' },
  c2n5_e3b: { speaker: 'sys', text: '网线出了设备间，单独走桥架，直奔弱电井——**跟PACS的内网物理隔离**。小雷那句「单独走的一条外网」，对上号了。你在脑子里给这条线画了个圈。', next: 'c2n5_e4' },
  c2n5_e3c: { speaker: 'sys', text: '巡检表签字：一切正常。平稳的一夜，从平稳的巡检开始。', next: 'c2n5_e4' },
  c2n5_e4: { speaker: 'sys', text: '你锁好设备间的门，把这间屋子的大小动静，一并接了过来。', effect: { flag: 'c2n5_e' }, next: 'c2n5_hub' },
  // —— 开诊主线：复查单前的走廊战争 ——
  c2n5_m0: { bg: 'bg_corridor', speaker: 'sys', text: '晚上十一点，电梯口传来争吵声，由远及近。', sfx: 'ring', next: 'c2n5_m1' },
  c2n5_m1: { speaker: 'kiddad', sprite: 'pat_kiddad', sfx: 'vox_kiddad', text: '孩子今晚吐了两次！**再扫一次，立刻！漏了出血你负得起责吗？！**', next: 'c2n5_m2' },
  c2n5_m2: { speaker: 'kidmom', sprite: 'pat_kidmom', sprite2: 'pat_kiddad', sfx: 'vox_kidmom', text: '（死死拽着孩子的手）不行！**三天前刚照过一次CT！网上都说这东西致癌，小孩子经不起这么照**——你们医院就知道让人做检查！', next: 'c2n5_m3' },
  c2n5_m3: { speaker: 'sys', text: '6岁男孩夹在中间，哇一声哭了。三天前他们在外地旅游，孩子摔到头，当地医院做过一次头颅CT——**光盘就在父亲的包里**。', image: 'item_disc', sfx: 'cry_child', sprite: 'pat_kidmom', sprite2: 'pat_kiddad', next: 'c2n5_m4' },
  c2n5_m4: { speaker: 'kiddad', sprite: 'pat_kiddad', text: '（把光盘拍在分诊台上）你们机器新，看得清楚，再扫一次我们才放心！', next: 'c2n5_m5' },
  c2n5_m5: { speaker: 'kidmom', sprite: 'pat_kidmom', text: '（声音劈了）放心？**照是你们说放心，不照也是你们说放心——你们到底哪句是真的？！**', next: 'c2n5_m6' },
  c2n5_m6: { speaker: 'sys', text: '【怎么处理？】', sprite: 'pat_kidmom', sprite2: 'pat_kiddad', choices: [
    { text: '「都别吵了，扫！出了事我担着。」', next: 'c2n5_m7a', effect: { skill: -2, flag: 'c2n5_wrong' } },
    { text: '「先别急着决定扫不扫——光盘给我，三天前的图像能读出来，就先不扫。」', next: 'c2n5_m7b', effect: { skill: 2, badge: 'alara_guard' }, tag: 'good' },
    { text: '「辐射确实不好，别扫了，回家观察吧。」', next: 'c2n5_m7c', effect: { heart: -1 } },
  ]},
  c2n5_m7a: { speaker: 'duty', phone: 'char_duty', sfx: 'vox_duty', text: '（电话里把你训了一顿）**「家长要求」不是检查指征，「我担着」更不是。**三天内的外院片子先调出来读，读不了再谈复查——**先把该走的流程走完**。', next: 'c2n5_m8' },
  c2n5_m7b: { speaker: 'me', sprite: 'pat_kiddad', text: 'DICOM是标准格式，**图像里嵌着完整的扫描参数**，我能原样调出来。孩子吐两次是新情况，我先看图，再电话请示值班医师——**要不要复查，让病情说话，不让恐慌说话**。', image: 'ct_head_child', next: 'c2n5_m8' },
  c2n5_m7c: { speaker: 'kiddad', sprite: 'pat_kiddad', text: '（急了）观察？！**他吐了啊！**万一脑子里有血，观察能观察出来吗？！（母亲抱着孩子的手反而松了——**怕辐射和怕漏诊，在这一刻是同一种怕**。）', next: 'c2n5_m8' },
  c2n5_m8: { speaker: 'sys', text: '外院DICOM调阅成功：**左侧顶部头皮血肿，颅骨完整，颅内未见出血**。图像质量可用——但「呕吐两次」是三天前没有的新症状。', image: 'ct_head_child', next: 'c2n5_m9' },
  c2n5_m9: { speaker: 'duty', phone: 'char_duty', text: '症状有变化，符合复查指征。**范围只扫头颅，儿童协议，迭代重建**。你操作，我听着，正式报告明早我签。', next: 'c2n5_m10' },
  c2n5_m10: { speaker: 'sys', text: '【进机房前，母亲拽住你的袖子】', sprite: 'pat_kidmom', next: 'c2n5_m11' },
  c2n5_m11: { speaker: 'kidmom', sprite: 'pat_kidmom', text: '医生，你跟我说实话……这一扫，孩子要吃多少辐射？', next: 'c2n5_m12' },
  c2n5_m12: { speaker: 'sys', text: '【怎么回答？】', sprite: 'pat_kidmom', choices: [
    { text: '「阿姨，我不会说『绝对没事』哄您。这次用儿童协议，机器按他的体重自动压输出，剂量报告我会打印给您收好；重建用迭代算法把噪声磨平——该省的一分不多给，该看的一层不能少。」', next: 'c2n5_m13a', effect: { skill: 1, heart: 1 }, tag: 'good' },
    { text: '（摘下胸前的个人剂量计递给她）「阿姨，干这行的人天天戴着它——数字在这儿，我不骗您。」', next: 'c2n5_m13d', cond: { item: 'dosimeter' }, effect: { skill: 1, heart: 1, badge: 'dose_guard' }, tag: 'good' },
    { text: '「放心，剂量很小的，跟坐趟飞机差不多。」', next: 'c2n5_m13b', effect: { skill: -1 } },
    { text: '「现在知道怕了？刚才不是你要扫的吗？」', next: 'c2n5_m13c', effect: { heart: -2, flag: 'c2n5_rude' } },
  ]},
  c2n5_m13a: { speaker: 'me', sprite: 'pat_kidmom', text: '阿姨，我不会说「绝对没事」哄您。**这次用儿童协议，机器按他的体重自动压输出，剂量报告我会打印给您收好**；重建用迭代算法把噪声磨平，**该省的一分不多给，该看的一层不能少**。', card: 'dose_ct', next: 'c2n5_m14a' },
  c2n5_m14a: { speaker: 'kidmom', sprite: 'pat_kidmom', text: '（盯着你的眼睛看了很久，终于点头）……好，我信你这一次。', card: 'child_ct', next: 'c2n5_m15' },
  c2n5_m13b: { speaker: 'kidmom', sprite: 'pat_kidmom', text: '（反而更慌）「差不多」是多少？！你们就会说「差不多」！（值班医师在电话里叹气：「**下次把数字给她看，别给比方。**家属要的不是安慰，是能攥在手里的东西。」——你重新打印了剂量预估单，一项项指给她看。）', card: 'dose_ct', next: 'c2n5_m15' },
  c2n5_m13c: { speaker: 'sys', text: '走廊里的空气瞬间结冰。父亲把孩子往身后一拉，母亲眼圈红了。小唐赶来打圆场，才没闹到投诉。', next: 'c2n5_m15' },
  c2n5_m13d: { speaker: 'kidmom', sprite: 'pat_kidmom', text: '（凑近看那枚小小的仪器，又抬头看看你）……你自己也天天被照着？（你点头。她忽然笑了，眼泪还挂在脸上）……行，**冲这个，我信你**。', image: 'item_dosimeter', card: 'dose_ct', next: 'c2n5_m14a' },
  c2n5_m15: { speaker: 'me', sprite: 'pat_kid6', text: '（蹲下来，跟孩子平视）小朋友，待会儿那个大圆圈给你拍张照，一下子就好——就当坐一回小火车，别动，行不行？', next: 'c2n5_m16' },
  c2n5_m16: { speaker: 'kid', sprite: 'pat_kid6', sfx: 'vox_kid', text: '（抽噎着点头）……有棒棒糖吗？', next: 'c2n5_m17' },
  c2n5_m17: { speaker: 'sys', text: '扫描一次成功，无重扫。结果：**与三天前一致，颅内未见新发出血**。呕吐更可能是肠胃闹的——值班医师建议留观到天亮。', sfx: 'xray', image: 'ct_head_child', next: 'c2n5_m18' },
  c2n5_m18: { speaker: 'kiddad', sprite: 'pat_kiddad', text: '（瘫在候诊椅上，半天）……刚才，对不起。', next: 'c2n5_m19' },
  c2n5_m19: { speaker: 'kidmom', sprite: 'pat_kidmom', text: '（把那页剂量报告折得方方正正，收进贴身的口袋）医生，**那以后……还要来复查吗？**', next: 'c2n5_m20' },
  c2n5_m20: { speaker: 'me', sprite: 'pat_kidmom', text: '孩子有任何不对劲，随时来；没有，就不用来了。', next: 'c2n5_m21' },
  c2n5_m21: { speaker: 'sys', text: '一家人进了留观室。孩子趴在爸爸背上，冲你挥了挥手。', next: 'c2n5_n1' },
  // —— 深夜 · 独立值守 ——
  c2n5_n1: { bg: 'bg_ctcontrol', speaker: 'sys', text: '凌晨两点，科室静得能听见机架待机的电流声。这是你**第一次独立守CT室的整夜**。', next: 'c2n5_n2' },
  c2n5_n2: { speaker: 'sys', text: '【事件1】住院部插单——术后发热，怀疑腹腔脓肿。', next: 'c2n5_n3' },
  c2n5_n3: { speaker: 'me', text: '增强CT……等等，**术后三天，eGFR 55，二甲双胍已停**——核对清单六格全绿，可以做。（你把白班的清单流程在脑子里过了一遍，一项没落。）', next: 'c2n5_n4' },
  c2n5_n4: { speaker: 'sys', text: '【事件2】急诊电话——「有个病人投诉你们CT室空调太冷！」', next: 'c2n5_n5' },
  c2n5_n5: { speaker: 'me', text: '（哭笑不得）**机房恒温22度是设备要求，不是服务不周**——病人保暖毯我们有，马上送过去。', next: 'c2n5_r0' },
  // —— 事件2·续：体模上的年轮 ——
  c2n5_r0: { speaker: 'sys', text: '送完保暖毯回来，你习惯性地翻出今天的体模日检图像复核——**瞳孔一缩：均匀的水箱体模上，一圈圈同心圆环，像树的年轮，像石头砸进水里**。', image: 'ct_ring_artifact', next: 'c2n5_r1' },
  c2n5_r1: { speaker: 'sys', text: '【水箱是均匀的——均匀的东西扫出「年轮」，问题出在哪？】', image: 'ct_ring_artifact', choices: [
    { text: '「水放久了分层？换箱水重扫一次。」', next: 'c2n5_r2a', effect: { skill: -1 } },
    { text: '「环状伪影——某个探测器通道的校准漂移了，它每转一圈就画一个圆。报修，明早校准。」', next: 'c2n5_r2b', effect: { skill: 1 }, tag: 'good' },
    { text: '（拎出自己买的工具箱）「先别报修，我翻翻DAS日志。」', next: 'c2n5_r2c', cond: { item: 'toolbox' }, tag: 'good' },
  ]},
  c2n5_r2a: { speaker: 'duty', phone: 'char_duty', text: '（电话那头笑出声）水？蒸馏水怎么分出一个一个的同心圆……**环状伪影，圆心在旋转中心，对应固定的探测器通道——是通道的校准值漂了**。体模就是「标准答案」，标准答案答错了，就是机器的问题。报修吧，明早工程师校准。', card: 'ring_artifact', image: 'ct_ring_artifact', next: 'c2n5_r3' },
  c2n5_r2b: { speaker: 'sys', text: '你翻出体模记录对比——**环的圆心正好压在旋转中心，半径对应固定的探测器通道**。**环状伪影=某个通道的校准漂移**，它每转一圈，就在图像上画一个圆。水箱是标准答案，答错了就是机器的问题。', card: 'ring_artifact', image: 'ct_ring_artifact', next: 'c2n5_r3' },
  c2n5_r2c: { speaker: 'sys', text: '你打开自己买的工具箱，按规程断电挂牌，用手电照着翻开DAS日志——**第217号通道，校准值漂了**。报修单上你写：「环状伪影，已定位至通道217，请携带该校准件。」第二天工程师愣了半天：「你们科技师……还自己看日志的？」', image: 'item_toolbox', card: 'ring_artifact', effect: { skill: 2, badge: 'wrench_night' }, next: 'c2n5_r3' },
  c2n5_r3: { speaker: 'sys', text: '报修单提交。你把最近一个月的体模日检图全部翻出来重看了一遍——从今往后，**这台机器的健康，是你一个人的事**。', next: 'c2n5_n6' },
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
  c2n5_n7: { speaker: 'lei', sprite: 'char_lei', text: '审计报告初稿出来了。你猜怎么着？**厂家远程终端回传的数据里，有你们科上个月所有病人的检查号**——虽然没姓名，但检查号+时间+设备参数，足够反推出是谁。**这算脱敏？**', next: 'c2n5_n8' },
  c2n5_n8: { speaker: 'sys', text: '【怎么回复？】', sprite: 'char_lei', choices: [
    { text: '「保存证据，等周一主任会上摊牌。」', next: 'c2n5_n8a', effect: { flag: 'audit_evidence' }, tag: 'good' },
    { text: '「先别声张，我们再核实一轮。」', next: 'c2n5_n8b' },
    { text: '「……要不，就算了吧？」', next: 'c2n5_n8c', effect: { heart: -1 } },
  ]},
  c2n5_n8a: { speaker: 'lei', sprite: 'char_lei', text: '收到。截图我做了三份备份，本地一份、离线硬盘一份、还有一份……你猜。', next: 'c2n5_g0' },
  c2n5_n8b: { speaker: 'lei', sprite: 'char_lei', text: '行，我再抓一周包看看。……你这话的口气，有点像主任。', next: 'c2n5_g0' },
  c2n5_n8c: { speaker: 'lei', sprite: 'char_lei', text: '算了？**病人的数据不是数据？**……当我没发。周一会上我自己说。', next: 'c2n5_g0' },
  // —— 清晨 · 告别 ——
  c2n5_g0: { bg: 'bg_morning', speaker: 'sys', text: '早上六点，天边泛白。你做完最后一例急诊CT，走出控制室——老周站在走廊里，纸箱已经搬空了，手里只剩一个保温杯。', next: 'c2n5_g1' },
  c2n5_g1: { speaker: 'zhou', sprite: 'char_zhou', text: '（把保温杯递给你）**夜班茶，自己泡**。……我走了。', image: 'item_thermos', next: 'c2n5_g2' },
  c2n5_g2: { speaker: 'me', sprite: 'char_zhou', text: '（接过杯子，喉咙发紧）周老师，我——', next: 'c2n5_g3' },
  c2n5_g3: { speaker: 'zhou', sprite: 'char_zhou', text: '（摆摆手，打断你）**别整那些。**（他走到CT室门口，最后看了一眼那圈幽蓝的待机灯）这台机器，比老伙计快，比老伙计狠。……用好了是救命的家伙；用不好，我做鬼也回来骂你。', next: 'c2n5_g4' },
  c2n5_g4: { speaker: 'sys', text: '他转身走进晨光里，背影比一年前矮了一点，但脚步很稳。', next: 'c2n5_g5' },
  c2n5_g5: { speaker: 'zhou', text: '（没回头，声音飘过来）**下周质控抽查，别给我丢人。**', effect: { badge: 'night_keeper2' }, event: 'ch2_solo', next: 'c2n5_g6' },
  c2n5_g6: { speaker: 'sys', text: '【本章结算】诊疗收入 +350 金币。第5夜 ·「值守」——完。', effect: { gold: 350, ap: -99 }, end: true },
}

/* ================= 晨会考核（第5夜后） ================= */
const C2AM: Record<string, Step> = {
  c2am_0: { bg: 'bg_office_day', speaker: 'sys', text: '周一早上八点，医生办公室。主任坐在主位，老周坐在角落——**最后一次以「夜班医师」身份参加晨会**。', next: 'c2am_1' },
  c2am_1: { speaker: 'director', sprite: 'char_director', sfx: 'vox2_director_am', text: '本周新CT满负荷运转，夜班白班连轴转，**零投诉，零差错**。下面进行例行考核——CT专场，24题抽5，老规矩：**S/A有奖励，B以下回去复习**。', next: 'c2am_2' },
  c2am_2: { speaker: 'sys', text: '【考核开始 · 5道随机题】', next: '@quiz' },
  c2am_3: { speaker: 'director', sprite: 'char_director', text: '成绩存档。另外——（看向角落）老周同志，**返聘期满，从今天起退出夜班排班**。全科鼓掌。', sfx: 'badge', next: 'c2am_4' },
  c2am_4: { speaker: 'sys', text: '掌声里，老周站起来，把胸前那枚「夜班医师」的工牌摘下来，放在桌上。', next: 'c2am_5' },
  c2am_5: { speaker: 'zhou', sprite: 'char_zhou', text: '（清了清嗓子，全场安静）……**三十年夜班，我交给你们了。**（他看向你的方向，微微点头）**别让我失望。**', next: 'c2am_6' },
  c2am_6: { speaker: 'sys', text: '【第二章「快与狠」——完。】', next: 'c2am_7' },
  c2am_7: { speaker: 'sys', text: '【彩蛋】数月后，伦理备案与去标识化流程走完。陆舟的实验室里，第一幅AI重建图像出来——**噪声像被一只手抹掉**。老周盯着看了很久：「**我要是晚生三十年……**」没说完，走了。', effect: { flag: 'ai_hook' }, image: 'ct_phantom', next: 'c2am_8' },
  c2am_8: { speaker: 'sys', text: '【彩蛋2】半年后，省医院AI工作站。你在训练数据来源的清单里，发现了一行熟悉的影像特征参数……（第5章审计线，锁定）', skipUnlessFlag: 'data_audit', next: 'c2am_9' },
  c2am_9: { speaker: 'sys', text: '澜江市禾川县人民医院 · 影像科。新CT的第一周结束了——下一周，市三甲质控组上门。', end: true },
}

/* ================= 第二章题库（23题 · 工科向，贴合课件） ================= */
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
