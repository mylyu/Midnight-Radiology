> 交付原记录：以下为2026-11-22 ZIP内 `_meta/VISUAL_CONTINUITY.md` 的来源快照，保留素材出处和当时参数。它不覆盖本仓库AGENTS、CURRENT_CONTRACT或其他章节裁定，其中Kimi的验收陈述不等于本轮独立验证结果。本轮见 [第四章整合审查](ch4-kimi-review-20261123.md)。

# 视觉与时间连续性合同

更新时间：2026-11-22。适用于当前第四章第七版「三选项随机位、带教提问、MRI物理考核与县院视觉连续性修复」。此文件描述工作区合同，不代表 GitHub、main 或 Pages 状态。

2026-11-20上一轮双端完整实机已实看儿童开场与母子代表对白、金属伪影SE讲解、MRI物理考核和结业凭证。儿童开场只显示妈妈抱着孩子的合体像素立绘，无母女插图或特写；SE、180°重聚脉冲及手机长句完整可见。桌面五题全对为S级，手机五题全错为C级，共享考核皮肤、反馈和奖励文案正常。两端均无控制台／资源错误或横向溢出。

2026-11-22本轮已逐张实看七张县院扫描图的原始候选、最终源图和正式WebP，以及母女与许建平的正式WebP。桌面1280×900完整路线另已实看县院头、腹、膝、腰椎实机采集画面，母女开场与代表对白、许建平新立绘、装机后机房背景和最终凭证；摆位、清晰度、构图及对话框均未见明显缺陷。完整双端量化结果见文末本轮验收记录。

## 不可回退项

- 保留英文背景与英文导视，不重新加入中文背景字牌。
- `bg_office_day`、`bg_mri_corridor_day_v2`、`bg_mri_room_day_v2` 等正式资源沿用 canonical catalog 与原字节，不重新生成、翻译或压缩。
- 新增人物、叙事 CG 和教学图按现有素材设置导出正式 WebP：q78、alphaQuality=100、effort=6，单图不超过 600KiB。
- 不用“修图”改变已确认的设备外观、英文标识或空间关系；真实设备照片、真实病例参考与叙事生成 CG 不混称。
- 玩家可见配文和图内文字不写制作过程说明，不把曾经修正的技术问题写成元叙事提示；病例图与caption删除“真实病例参考”“非本人”“未涂改”“本作后加”等防御性小字，保留医学影像、序列名、原图箭头、黄圈及必要病灶说明。作者、Figure、许可和真实来源仍在本文登记。
- 网上真实病例影像必须允许本地标注和再分发；NC-ND 或授权不明素材不得进入正式交付。NC-SA 素材保留非商业与相同方式共享要求。

## 第四章场景顺序

- 序章与回县论证：`bg_office_day`，由设备科采购调研自然引出一周市院跟班。小唐是护士，不承担技师顶班；交接只用一段具体工作交代。
- 报到节点为 `c4_city_arrival`，使用市院门口特写。男性主角使用 `cg_c4_city_hospital_entrance`（2048×1072），女性主角使用 `cg_c4_city_hospital_entrance_female`（1672×875）；女性画面须清楚看见女性主角、文件袋与拉杆行李箱。
- 一周市院进修压缩为第一晚与最后一晚两段可玩日程：2027年3月3日报到，3月9日周二收班。市院使用冷色、高通高、玻璃隔断与多工作站的独立控制室、机房、走廊、准备区、员工角和分诊台，不能与县院房间混用。
- 最后一晚先进入 `c4_2_hub` 自由探索，再由免费主线进入事故。眼镜事故按“筛查后家属收好眼镜—袋口未封好—转身让开床尾时眼镜滑出—吸附—主角因眼镜较轻而小心尝试取下—沈岚立即叫停—人员退出—工程处置—如实记录事故征候—夜班恢复”推进；上级明确轮椅或剪刀吸附可能致命，不把贸然尝试写成可模仿的安全教程。吸附特写只在 `c4_2_incident_3` 使用 `cg_c4_glasses_v3`，不再出现掏出眼镜扬了扬或向前跨步的生硬动作。
- 回县采购为第三段，时间是2027年4月至11月。A17只在首晚准备柜标签 `c4_1_rf_0` 和老白短信 `c4_3_bai_0` 明确出现，其他角色不再轮流解释。老白是配件销售者，采购论证只发一条短信，主角回复一句后直接进入采购枢纽；不实体到场、不免费换件，也不把配件塞进当天采购。`c4_3_bai_0` 使用 `item_c4_a17_parts_v1`，`c4_3_quotes_0` 使用 `item_c4_quote_folder_v1`。旧 `c4_3_bai_2..4` 仅保留旧游标安全出口。AI只保留雯雯提供的原厂单列选配与30天试用单，基本重建已含，试用、购买和远程授权分开；选型、延期、货车到达、吊装、定位、交接和剪彩先于县院预约扫描。
- 采购量房 `c4_3_door_0..2`、货车进场与吊装前 `c4_3_install_0..2` 使用 `bg_c4_county_corridor_preinstall_v1`：走廊尽头门内是空房，无MRI、检查床或人员。`c4_3_install_3` 磁体落位后才切回有设备的 `bg_c4_county_corridor_v1`，`c4_3_install_7..9` 延续装机后场景。装机特写顺序固定为：`c4_3_install_1` 白天吊装 `cg_c4_magnet_lift_v1`（pan）→ `c4_3_install_3` 安装完成 `cg_c4_install_complete_v1`（settle）→ `c4_3_install_7..9` 一楼机房门口阻止剪彩 `cg_c4_ribbon_stop_v1`（push）→ `c4_3_ribbon_outside_0..3` 县医院正门白天剪彩，其中 `_1` 使用 `cg_c4_ribbon_cutting_v1`（push）。老白只在交接完成后于 `c4_3_install_5` 上门介绍备用件和升级件，当天不采购、不签配件验收。第四段直接进入装机首日儿童接诊，不再次剪彩。
- 装机后三段为2027年11月15日至17日，预约白班。首日由小唐接来**三岁女孩**，`c4_4_head_0` 与妈妈、孩子的现役对白全部使用同一张 `pat_c4_mother_child_pixel_v1`：妈妈直接抱着孩子，不再分别显示两张独立立绘；开场 `image:''`、无 `closeup`、无cinematic，只显示合体立绘，不再使用母女插图。扫描后只展示单幅轴位T2，随后由老周问主角脑室表现与交接内容，再讨论脑积水评估和专科判断下的脑室腹腔分流术，不凭单图确定病因或承诺手术。原厂AI试用账号只在首日自动发起一次授权校验，拒绝远程、核单并关闭试用。第二天主线依次处理腹部运动伪影与同一真实病例T2／动态增强图组、膝部伪征和冯叔复查；准备柜只保留一次通用备用件报价可选探索，隐藏发现改为支垫清洁登记，不再重复A17或老白。第三天和收班不复述厂家事项，尾声只收好试用关闭记录，不再收档配件报价。县院白天普通剧情使用 `bg_c4_county_corridor_v1`、`bg_office_day`、`ch2_bg_breakroom_day`，不再使用夜间4F `bg_corridor`；序章夜班 `c4_pro_0..4` 与第六段收班使用夜间 `bg_office`，`c4_pro_5` 第二天上午切到 `bg_office_day`，第三至五段收班使用白天休息室。
- 冯叔市院3T首个序列刚开始即动态呼救，250ms出现面板、设备声停止、进度冻结；面板出现后再锁定3000ms，总计最早3250ms才允许点击“接出患者，继续”，不自动结束。呼救出现时采集面板短促震动；`prefers-reduced-motion:reduce` 下关闭震动与脉冲。第一组未采完，后三组未开始。换到同层另一检查区0.55T、80厘米大孔径机器后，先展示独立换机CG并说明利弊，再按真实3000ms完成T1、T2、FLAIR、DWI四组；他仍然害怕，但呼叫有人回应、儿子在视线内、分段和更宽空间使其可以忍受。四组完成后先解释基础对比度，再给出脑桥小灶疑似轻型缺血性卒中意见，用同类型真实病例四序列图解释DWI／ADC并安排当晚神经内科评估。县院0.55T复查明确承接市院报告、用药和神经内科安排，不把参考图冒称冯叔原始影像。
- 许建平第六段检查腰椎，异常大片信号丢失使用真实腰椎金属伪影病例作参考。出现伪影后先由老周建议SE序列，以180°重聚脉冲补偿部分磁场不均匀造成的相位离散，并尽量缩短TE与Echo Spacing以减少相位散失；保留原图，补必要序列并评价目标结构，明确不能保证全部消除。外部铁磁性物品严禁进入机房和磁体区域，普通转运床／轮椅不能随便推入；体内非铁磁性植入物也须按型号、MR Safe／MR Conditional、场强和SAR等资料核查并满足条件后换床扫描，资料不清先核。伪影本身不等于急症或必须急停接人；检查前植入物安全筛查仍是独立问题。左颈改变来自另一份旧资料，单独转诊，不能拿腰椎图冒充颈部图。

## 九张网上真实病例影像：来源、许可与本地标注

共同规则：前七张正式图为1200×900 WebP，新增腹部两张按原始面板比例导出；均为q78、alphaQuality=100、effort=6，单图小于600KiB。黄圈或保留箭头只标出原图图注所指的异常或伪影区域，不改变病灶、伪影或原始诊断含义。2026-11-18前七张图重新导入并逐张实看，2026-11-19新增腹部两图完成下载、裁切、正式导入和实看：不裁伤医学面板、序列名、原箭头、黄圈或必要标注；游戏内caption使用简洁医学标题。作者、Figure、许可和真实来源保留在本文。

### 1. `mri_real_tfcc_v1`

- 正式文件：`mri_real_tfcc_v1.4ae11629db1a2917.webp`，31,854字节。
- SHA-256：`4ae11629db1a291784b33e366673829442d236980c3e8f3b2d4eeead01f0c5ac`。
- 来源：https://link.springer.com/article/10.1007/s00256-025-05106-x
- 论文：`Identification of TFCC substructure injury in wrist MRI using computer vision: a diagnostic aid for radiologists`。
- 作者：Yongqiang Chu、Xiaolong Luo、Ruimin Guo、Hongwei Ren、Yitong Li、Gang Wu、Xiaoming Li。
- 许可：CC BY 4.0，https://creativecommons.org/licenses/by/4.0/ 。
- 原图：Figure 5 的 c1 区域。原图白箭头指示外周TFCC信号不连续。
- 本地修改：裁剪坐标 `(1015, 0, 1525, 510)`，得到510×510局部；排版为1200×900，并在局部放大窗对应位置加黄圈。保留医学标题、作者与来源，删除防御性参考说明。

### 2. `mri_real_mrcp_v1`

- 正式文件：`mri_real_mrcp_v1.3614059f45a56618.webp`，16,112字节。
- SHA-256：`3614059f45a56618464e108989913959a96d45c3c9360e97067909071c16f999`。
- 来源：https://commons.wikimedia.org/wiki/File:MRCP_Choledocholithiasis.jpg
- 作者：Hellerhoff，Own work。
- 许可选择：CC BY-SA 3.0，https://creativecommons.org/licenses/by-sa/3.0/ 。修改与再分发须署名并以相同方式共享。
- 原图说明：a为胆囊及结石，b为胆总管结石，c为胰管，d为十二指肠液体。
- 本地修改：保留原红箭头，黄圈标出b处胆总管结石充盈缺损；排版为1200×900。图脚保留“Wikimedia Commons”来源，不把 Commons 误称为期刊文献；防御性小字已删除。

### 3. `mri_real_hydrocephalus_v1`

- 正式文件：`mri_real_hydrocephalus_v1.c5b308a21b709412.webp`，1200×900，40,304字节，q78、alphaQuality=100、effort=6。
- SHA-256：`c5b308a21b70941287982ebad51b8d126db578609f037cbc825ba135b0cde3b2`；源图SHA-256：`1d93ad96306c9d7c6ce8b08a4fe4a447f66bd6fed30328d93d464e37271576df`。
- 来源：https://pmc.ncbi.nlm.nih.gov/articles/PMC8125971/
- 论文：`Reappraisal of Pediatric Normal-Pressure Hydrocephalus`。
- 许可：CC BY 4.0，https://creativecommons.org/licenses/by/4.0/ 。
- 原图：Figure 2B。图注病例为六岁女性、Chiari I畸形；A／B为术前，C／D为术后，B为T2加权轴位MRI。现役剧情只取术前B，不拼接术后图，也不把来源病例的具体病因直接套给游戏角色。
- 本地修改：从源图按 `(455,20,765,355)` 裁取B面板，排版为1200×900；黄圈标出双侧侧脑室，保留“术前 · 轴位T2”“双侧侧脑室扩大”“脑脊液呈高信号”“结合症状继续评估”和来源署名。候选图与正式WebP均已实看，脑室扩大直观、黄圈位置正确、文字可读。
- 叙事边界：县院旧急性DWI病例退出现役主线；新病例只展示这一幅轴位T2，不再展开T1／T2／FLAIR多序列教学。

### 4. `mri_real_motion_ghost_v1`

- 正式文件：`mri_real_motion_ghost_v1.f2e888afa9191834.webp`，1200×900，44,382字节，q78、alphaQuality=100、effort=6。
- SHA-256：`f2e888afa91918344ecc1cdd7ed6702fbbf99ffe6ce79435808e33fc844c7550`。
- 来源：https://pmc.ncbi.nlm.nih.gov/articles/PMC4340093/
- 论文：Krupa K、Bekiesińska-Figatowska M，`Artifacts in Magnetic Resonance Imaging`，Polish Journal of Radiology，2015。
- 原图：Figure 3。原始文件：https://cdn.ncbi.nlm.nih.gov/pmc/blobs/d237/4340093/0228dca49e9a/poljradiol-80-93-g003.jpg
- 许可：来源页注明 “Unrestricted non-commercial use is permitted provided the original work is properly cited.”；本项目保留作者、论文、Figure与原始URL，只按非商业教学参考使用。
- 本地修改：裁剪双面板，左面板分别用黄圈标出主动脉与相位编码方向上的重复鬼影，并加“相位编码方向”双向箭头；排版为1200×900。顶部“真实文献病例参考……不是游戏患者本人的影像”已删除；保留医学面板、黄圈和相位编码方向箭头。
- 叙事边界：用于腹痛阿姨的腹部运动伪影，不再使用旧腰椎运动图，也不把重影当作新病灶或机器远程故障。

#### 2026-11-23 标注纠正（替代上面的旧交付标注）

- 作者指出旧图把左右相邻的血管断面圈作鬼影，并画了水平相位编码箭头，属于错误标注。此次改回作者提供的800×680原始双面板，不重画、平滑或生成医学解剖。
- `MriPulsationImage.tsx` 在原图上叠加可缩放SVG：左面板黄框 `(201,184,69,197)`，右面板黄框 `(590,155,76,243)`，分别涵盖主动脉及沿画面上下排列的鬼影；AP双向箭头竖直。正文、选项画面与卡片回看使用相同标注。
- 依据仍是上述论文Figure 3（原图题为“Multiple images of the aorta – ghosting artifact caused by aortal pulsation”），结合作者指定的AP方向和红框示意核对；不是将所有MRI的相位编码方向一概规定为AP。
- 已退役的横向圆圈/箭头只保留在Git历史。本次新交付文件、哈希和发布验收统一记入本轮扫描美术修订记录。

### 5. `mri_real_knee_mimic_v1`

- 正式文件：`mri_real_knee_mimic_v1.3be8e2be3b4bb61d.webp`，23,290字节。
- SHA-256：`3be8e2be3b4bb61d37ab4860b26d101747c61e59706a8f483a1a1452d50b6a22`。
- 来源：https://pmc.ncbi.nlm.nih.gov/articles/PMC4126146/
- 论文：`MRI imaging of displaced meniscal tears: Report of a case highlighting new potential pitfalls of the MRI signs`。
- 作者：A Prasad等，2014。
- 许可：CC BY-NC-SA 3.0 Unported，https://creativecommons.org/licenses/by-nc-sa/3.0/ 。交付与再利用须署名、非商业使用并以相同方式共享。
- 原图：Figure 3，膝内侧矢状位T2W，白箭头指向半月板体部和后角上方楔形软组织。原病例最终说明这是移位韧带形成的伪征，不是本项目的半月板确诊图。
- 本地修改：排版为1200×900，黄圈与原白箭头指向同一区域；剧情要求连续对照前后图，区分移位韧带等伪征。

### 6. `mri_real_metal_artifact_v1`

- 正式文件：`mri_real_metal_artifact_v1.f92f72e59d06dd94.webp`，1200×900，51,904字节，q78、alphaQuality=100、effort=6。
- SHA-256：`f92f72e59d06dd943fd5a0edc52f40bbd055f7cd964f7f66b8636cb64f17b6fc`。
- 来源：https://pmc.ncbi.nlm.nih.gov/articles/PMC7310981/
- 论文：Xin C、Liu H、Li S、Lin G，`Using SEMAC at 3 T MR to evaluate spinal metallic implants and peripheral soft tissue lesions`，Medicine，2020。
- 原图：Figure 2 A–B。原始文件：https://cdn.ncbi.nlm.nih.gov/pmc/blobs/5b2e/7310981/18e0a116dfbf/medi-99-e20139-g008.jpg
- 许可：CC BY-NC 4.0，https://creativecommons.org/licenses/by-nc/4.0/ 。许可允许download、share、remix、transform，但须正确署名且仅限非商业使用。
- 本地修改：裁剪A＋B面板，黄圈分别标出大片信号丢失、术区结构模糊和波纹样改变，排版为1200×900；已删除跨面板、容易造成指认混乱的箭头；本次再删除顶部参考身份说明和底部“未涂改／不标注新诊断”小字，保留文献归属。
- 叙事边界：表现金属相关信号丢失、信号堆积或几何变形，只作腰椎真实文献病例参考，不是游戏患者本人的影像，也不能冒充左颈黑影或许建平完整检查。

### 7. `mri_real_stroke_sequences_v1`

- 正式文件：`mri_real_stroke_sequences_v1.53f99c9711f895b3.webp`，1200×900，48,014字节，q78、alphaQuality=100、effort=6。
- SHA-256：`53f99c9711f895b3d73878732257d5d99d13e60282f7597e00734c8a01a8f4c3`。
- 来源：https://pmc.ncbi.nlm.nih.gov/articles/PMC11608002/ ；DOI：`10.2147/VHRM.S474143`；PMCID：`PMC11608002`；PMID：`39618686`。
- 论文：`Non-Contrast MRI Sequences for Ischemic Stroke: A Concise Overview for Clinical Radiologists`，Vascular Health and Risk Management，2024，20：521–531。
- 作者：Nur Amelia Bachtiar、Bachtiar Murtala、Mirna Muis、Muhammad I Ilyas、Hamzaini bin Abdul Hamid、Suryani As'ad、Jumraini Tammasse、Audry Devisanty Wuysang、Gita Vita Soraya。
- 许可：Creative Commons Attribution–Non Commercial 3.0 Unported（CC BY-NC 3.0），https://creativecommons.org/licenses/by-nc/3.0/ 。保留作者、论文、Figure、原始URL、许可和非商业使用边界。
- 图像关系：Figure 2为64岁女性偏瘫与构音障碍的脑桥病灶，A／B／C分别为T1轻度低信号、T2高信号、FLAIR高信号；Figure 5图注为“Similar patient from Figure 2”，A为DWI高信号、B为对应ADC低信号。主面板使用Figure 2 A／B／C与Figure 5 A，右下小图使用Figure 5 B。Figure 5明确衔接Figure 2的相似脑桥病例，玩家画面标题为“头部 MRI｜脑桥小灶四序列对照”；本文仍保留Figure关系，不把图注进一步改写为无保留的同一患者断言。
- 出版商PDF：https://www.dovepress.com/article/download/97738 。从PDF提取高分辨率Figure 2（6024×5614）与Figure 5（6024×5876）后裁切：T1 `(60,100,2940,2440)`；T2 `(3100,100,5980,2440)`；FLAIR `(60,3060,2940,5350)`；DWI `(60,100,2940,2440)`；ADC小图 `(3400,550,5750,2400)`。前三项坐标属于Figure 2，后两项属于Figure 5。
- 本地修改：合成1200×900四序列对照图，保留原图红圈；DWI黄圈以原图约 `(1530,1600)` 为中心、半径约250，ADC黄圈以约 `(4560,1590)` 为中心、半径约230。增加中文序列标签、信号说明、对应ADC小图和来源页脚，保留病灶与伪影；本次删除“非冯叔本人原始影像”“原红圈保留；黄圈为本作后加，未涂改病灶”两行防御性小字。首轮手机截图发现文字偏小后，已放大标题、序列与来源字号，加宽ADC小图，并在390×844竖屏将该图显示宽度单独调至 `calc(100% - 1rem)`；其他剧情图布局不变。
- 叙事边界：来源患者与冯叔不是同一人；图片只用于解释四组信号与DWI／ADC对应关系，冯叔的疑似意见仍由游戏内完整图组、症状和医师判断给出，并转神经内科继续评估。该来源边界不再以防御性小字叠加到玩家画面。

### 8. `mri_real_hemangioma_t2_v1`

- 正式文件：`mri_real_hemangioma_t2_v1.3f230357388acd3d.webp`，452×634，32,662字节，q78、alphaQuality=100、effort=6。
- 来源：https://pmc.ncbi.nlm.nih.gov/articles/PMC3110140/ ；PMCID：`PMC3110140`；DOI：`10.1186/1471-230X-11-43`。
- 论文：`Is hepatotropic contrast enhanced MR a more effective method in differential diagnosis of hemangioma than multi-phase CT and unenhanced MR?`。
- 许可：CC BY 2.0，https://creativecommons.org/licenses/by/2.0/ 。
- 原图：Figure 2，原始JPEG：https://cdn.ncbi.nlm.nih.gov/pmc/blobs/a7e7/3110140/0dc921c334e7/1471-230X-11-43-2.jpg 。同一肝血管瘤病例的中等与重T2面板均保留。
- 本地修改：仅按原始面板排版并增加简明序列标题，未拼接其他病例；正式WebP已实看。用于腹痛阿姨重采后的典型影像讨论，不冒充她本人的图，也不仅凭图组确定症状来源。

### 9. `mri_real_hemangioma_dynamic_v1`

- 正式文件：`mri_real_hemangioma_dynamic_v1.111517a9689d5a00.webp`，900×279，23,594字节，q78、alphaQuality=100、effort=6。
- 来源与许可：同上一项，`PMC3110140`、CC BY 2.0。
- 原图：Figure 4，原始JPEG：https://cdn.ncbi.nlm.nih.gov/pmc/blobs/a7e7/3110140/d8a30b395db4/1471-230X-11-43-4.jpg 。只取同一病例的b／c／d三幅MRI，排除a的CT。
- 本地修改：保留b／c／d原始面板，分别增加“动脉期／门静脉期／平衡期”标签；正式WebP已实看。用于说明典型结节样强化与逐渐填充，具体诊断仍需结合患者完整图组、病史和其他检查。

原始大图、候选图、标注PNG、临时脚本和接触表只留在工作区临时目录，不进入正式交付目录。正式WebP须实际解码并逐张看验，不能只凭文件存在或许可文本验收。

## 既有真实设备与教学图来源

以下素材只进行来源图裁切、排版、缩放和 WebP 压缩；图内类型、参数和用途文字是本项目的教学排版，不冒充原照片自带说明。

- `mri_c4_magnet_system`：1440×900，41,410字节。封闭式 MRI 设备实物来自 Wikimedia Commons：https://commons.wikimedia.org/wiki/File:MRI_Philips.JPG
- `mri_c4_rf_system`：1440×900，35,146字节。三张线圈均为真实实物照片：头线圈 https://lbnmedical.com/a-guide-to-mri-coils-types/ ；关节线圈 https://lbnmedical.com/mri-coils-for-sale/ ；柔性表面线圈 https://directmedimaging.com/a-guide-to-mri-coils-types/ 。
- `mri_c4_sequence_atlas`：1440×900，44,376字节。图组突出头部常用的 T1WI、T2WI、FLAIR、DWI，不把 MRCP 混进头部核心四序列。DWI 来源页：https://commons.wikimedia.org/wiki/File:DWE_MRI_of_cerebral_infarction.png 。原图含 DWI／ADC，本项目仅裁取左侧 DWI 区域；其余序列沿本章既有教学图组编排。
- `mri_c4_basic_contrast_v1`：正式文件 `mri_c4_basic_contrast_v1.12d8e89d88b83a83.webp`，1200×900，49,622字节，q78；SHA-256 `12d8e89d88b83a83bebaf13753052f8341dc51baa9c3ae5a5b447bf1d8f6d49b`。从既有 `mri_c4_sequence_atlas` 的T1／T2／FLAIR面板重排，明确排除DWI；标题“磁共振对比度｜不是换滤镜”，图内说明脑脊液T1偏暗、T2偏亮、FLAIR变暗。它在冯叔于市院0.55T大孔径机器完成T1、T2、FLAIR、DWI四组后作为同层三幅基础对照图出现，由沈岚向主角提问采集权重与脑脊液信号，主角回答后再解释DWI与急性缺血评估；不宣称为外部真实患者原始DICOM。
- `cg_c4_magnet_lift_v1`：正式文件 `media/cg_c4_magnet_lift_v1.bfdd0a57868cea6d.webp`，2048×1152，207,342字节，q78、alphaQuality=100、effort=6。叙事CG，不是真实施工现场照片；画面为**白天**一楼吊装入口、蓝天、警戒带和吊车吊装MRI磁体，只用于装机pan特写。旧黄昏版本已移出正式交付。
- `item_c4_a17_parts_v1`：正式文件 `media/item_c4_a17_parts_v1.77d9f7ef69dce383.webp`，1536×1024，140,276字节。用于老白短信中的A17标签与线圈转接件照片，以及装机后备用件介绍；是叙事配件插图，不冒称网上实物来源照片。
- `item_c4_quote_folder_v1`：正式文件 `media/item_c4_quote_folder_v1.d24daa7aa245bc56.webp`，1536×1024，122,884字节。用于采购报价夹特写，表现基本重建与原厂AI选配分列。
- `cg_c4_install_complete_v1`：正式文件 `media/cg_c4_install_complete_v1.813558659eccdcc6.webp`，2048×1152，149,560字节。白天安装完成叙事CG，位于吊装之后、阻止剪彩之前，使用settle特写。
- `cg_c4_ribbon_stop_v1`：正式文件 `media/cg_c4_ribbon_stop_v1.0d135e719b32b2e7.webp`，2048×1152，167,528字节。白天一楼机房门口阻止剪彩叙事CG，使用push特写；不使用4F走廊或夜间楼道。
- 上述五张新增／替换叙事图均按q78、alphaQuality=100、effort=6正式导入，原尺寸保留，已逐张实看；画面文字、人物、白天光线和面板正常。
- `bg_c4_county_corridor_preinstall_v1`：正式文件 `media/bg_c4_county_corridor_preinstall_v1.13184b91e8d075f6.webp`，1672×941、99,516字节，q78、alphaQuality=100、effort=6；SHA-256 `13184b91e8d075f61f435db35777da920d644db6b4e152f769e690f30ca234de`。以现有县院走廊为参考生成，保留接待台、候诊椅、门、白天光线与配色，尽头门内改为完全空置的房间。源图2048×1152，按 `(114,0,1934,1024)` 裁掉角落生成标签后缩放；处理图与正式WebP均已实看。它是AI生成叙事背景，不冒称真实医院照片。
- `pat_c4_mother_child_pixel_v1`：正式文件 `media/pat_c4_mother_child_pixel_v1.8a2b6fd4707d2443.webp`，512×768、35,758字节透明WebP，q78、alphaQuality=100、effort=6；SHA-256 `8a2b6fd4707d24437f374cd14812ebcca11337aab7d86bf78b8f61f4fb7b1f22`。妈妈穿米色开衫和深色长裤，抱着黄衣、小辫子、拿绿色恐龙玩具的三岁女孩。2026-11-22回到1024×1536原始合体图，仅将左下角 `(0,1430)–(180,1536)` 设为透明，再以Lanczos直接缩放至512×768；不再经过128×192降采样、64色量化或最近邻放大，避免面部、衣服和玩具细节模糊。人物与鞋子未裁切，原始清晰图、正式WebP均已实看。它是AI生成叙事人物素材，不冒称真实患者照片。旧 `pat_c4_child_v1`、`pat_kidmom`、`cg_c4_mother_child_v1` 已退出正式目录与canonical catalog。
- `cg_c4_ribbon_cutting_v1`：正式文件 `cg_c4_ribbon_cutting_v1.22c10a54b7f0fef6.webp`，2048×1050，218,888字节，q78、alphaQuality=100、effort=6；SHA-256 `22c10a54b7f0fef6d6a96f7db62fdabfb5846bff1431523c951303341261880f`。以旧剪彩CG为风格与人物构图参考重新生成的叙事CG，不是真实医院或人物照片；画面为院长在县医院正门外的台阶前剪彩，两名同事在旁鼓掌，背景是日间天空、绿化和医院玻璃正门，不再出现磁体、机房或控制室。只用于主角阻止机房门口剪彩并把红绸迁至正门后的push特写；旧机房门口版本已移出正式交付。
- `cg_c4_city_wide_bore_v1`：正式文件 `media/cg_c4_city_wide_bore_v1.54ba5d293bc673ba.webp`，1590×848，88,822字节，q78、alphaQuality=100、effort=6；SHA-256 `54ba5d293bc673bafecc445a01abf9e4069dbe4e47704128d9363e0ef825b8b5`。市院冷色另一检查区、短机身、宽孔径、空检查床与头线圈的AI生成叙事插图，用于换机说明，不冒称真实设备照片，也不与县院后来采购的机器混用。
- `trilogy_mri_scan_city_wide_head_v1`：正式文件 `media/trilogy_mri_scan_city_wide_head_v1.f89595a1a7709a6c.webp`，1590×848，97,596字节，q78、alphaQuality=100、effort=6；SHA-256 `f89595a1a7709a6cbeac1be9c69267cc75312e8b1c719c0b4b1eb4289f8a6e56`。与换机CG同一机房的冯叔头部采集叙事图，只映射 `city-055-wide/head`，不冒称真实病例或实物照片，也不套用县院图像。
- `cg_c4_city_hospital_entrance_female`：1672×875，161,036字节，属于叙事 CG，只用于女性主角市院报到，不得标作真实设备或真实医院照片。

引用新照片或替换裁切时须重新核对来源页、画面内容、授权条件和实际导出文件；不得用生成图冒称上述来源的实物照片或真实病例影像。

## 人物与病例连续性

- 沈岚使用 `char_c4_shen_v3`，负责市院一周跟班。老周第一次提她时说明两人在省放射年会认识并共同办过设备培训；回县后她只在明确 `communication:'call'|'sms'` 的节点出现，使用电话头像、空头实体立绘。膝部复核由现场老周完成。
- 老周、老范、主任、小唐、表姐和许建平的身份不变。小唐只以护士身份工作，但已进入序章交接、改约、装机单据、儿童接诊、家属沟通、预约顺序、资料协调、旧档案、晚饭和章底收束等主线；不顶技师班，也不只负责可忽略的支线。
- 雯雯是原厂设备销售，只负责原厂AI单列报价、30天试用、账号与关闭；她承认装机时勾选试用却没当面说清。老白是A17线圈转接件、备用件和升级件的配件销售者：采购论证只发一条短信，装机交接后只上门一次；不写免费更换、旧件回收或当天成交。其他角色不重复介绍他的身份和报价。小雷核试用单、账号、期限和远程审批。厂家旧五组证据节点只保留旧游标安全跳转，不再重发属性、勋章或复述厂家事项。
- 短期患者以腕伤小伙、疑似胆总管结石患者、急诊老人、腹痛阿姨、拄拐老师等现场称谓出现。MRCP患者使用独立病号服立绘；采购、测门和装机段的“设备送货员”为独立角色，不与患者共用姓名或立绘。冯叔和许建平是两条有连续后果的回场人物，其余重复病种和重复随访不再回流。
- 拄拐老师继续使用逻辑ID `pat_c4_chen_v3`，立绘为短发、长裤的男性，以匹配现役 `vox_c4_knee_r9` 与 `vox_c4_knee_wait_r9` 两条更慢、更低的男声。保留教师年龄、眼镜、酒红开衫、手扶膝盖和木拐杖。新图是参考原立绘生成的叙事人物素材，不冒称真实人物照片；正式文件 `pat_c4_chen_v3.324d12aeb9e6d178.webp` 为512×768、40,768字节、q78、alphaQuality=100、effort=6，SHA-256 `324d12aeb9e6d17898e7d5399fd39317d8a84dd7475c752c1b222258abc9439c`。旧女性文件已移出正式源目录与dist。
- 所有现役患者与家属均有立绘：腕伤小伙 `ch2_patient_wrist_student`、冯叔 `pat_c4_feng_v3`、疑似胆总管结石患者 `pat_c4_liu_v4`、三岁女孩与妈妈共用 `pat_c4_mother_child_pixel_v1`、腹痛阿姨 `pat_c4_wu_v3`、拄拐老师 `pat_c4_chen_v3`、许建平在第四章使用专属 `pat_c4_xu_v1`。远程来电仍只显示电话头像，不瞬移实体人物。`pat_mystery` 继续保留给前三章及早期剧情，不因第四章清晰化而全局替换。
- `pat_c4_xu_v1`：正式文件 `media/pat_c4_xu_v1.238d7c59ee17e892.webp`，512×768、29,624字节透明WebP，q78、alphaQuality=100、effort=6；SHA-256 `238d7c59ee17e8922690aa8ff70065b93e1e8203dc2bfcf7c2e4f4150ec115d2`。保留黑发、蓝灰工作服、棕裤和旧片袋；源图1024×1536，清除 `(0,1420)–(190,1536)` 角落标记，缩至256×384后以最近邻放大到512×768，保持两倍像素密度而非旧共享立绘的粗糙低清观感。第四章角色定义和首次来电头像均使用该专属ID，正式WebP已与其他患者同场实看。
- 三岁女孩与妈妈不再分开显示。`child` 与 `mother` 两个角色的 `sprite` 都指向 `pat_c4_mother_child_pixel_v1`，检查前开场也使用同一合体图；开场不配母女插图、特写或cinematic，后续结果图仅为单幅轴位T2。画面中始终是妈妈抱着孩子，不叠加两层人物，也不在妈妈与孩子发言时换成另一张图。2026-11-22起以原始高分辨率图直接缩放，保留清晰像素化边缘、黄衣、小辫子与绿色恐龙，不再使用64色量化流程。
- 当前八个病例为：市院腕部TFCC、市院冯叔3T即时中止并换0.55T完成四组及疑似轻型缺血性卒中交接、市院MRCP、县院**三岁女孩**脑室扩大与脑积水评估、腹部运动伪影与肝血管瘤文献图组讨论、膝部易误认影像、县院冯叔门诊复查、许建平腰椎金属伪影。九张真实参考图按上一节对应，卒中图只作同类型病例参考，腹部T2与动态增强来自同一真实病例；重采和冯叔复查不伪造“完美正常图”。
- 所有患者扫描前先补足主诉与简要病史；儿童病例由母亲说明两周头痛、晨起呕吐和步态不稳，孩子自己问检查时长、如厕和布恐龙。母亲会问到三岁孩子是否可能需要脑室腹腔分流术；主角只说明若专科评估确有需要，分流可引流脑脊液、减轻积聚和颅内压，为孩子争取正常发育机会，不凭单图确定病因、手术指征或时机。患者／家属会追问检查目的、亮暗、等待、费用、住院、工作、训练、手术与后续路线，主角先直接回答，再说明完整图组、查体、化验和医师判断的边界。
- 每位患者第一次开口都显式绑定与当前文本一致的短入场音；实体出场使用本人立绘，许建平首次来电只使用电话头像。改稿后的角色不得自动播放旧台词录音。
- 表姐仍处于孕期；不得出现已经出生的孩子、拍餐椅或接孩子等画面与台词。

## 八条现役语音与最终文件测量

语音均为 `public/audio/` 下的MP3、48kbps、24kHz、单声道。七条新患者语音先处理起始静音，再 `apad`、动态 `loudnorm=I=-20:TP=-2:LRA=7`，最后用 reverse 方式只裁尾部静音，保留句内停顿；沈岚旧音频另行归一化并修整。下表是**最终交付MP3**的实测结果，不是源音频或HTML音量设置：

| 语音ID | 时长 | 综合响度 | True Peak | 字节 |
|---|---:|---:|---:|---:|
| `vox_c4_wrist_r7` | 2.304s | －19.50 LUFS | －2.21 dBTP | 14,061 |
| `vox_c4_feng_r7` | 2.520s | －19.36 LUFS | －2.39 dBTP | 15,357 |
| `vox_c4_worker_r7` | 2.520s | －19.57 LUFS | －1.94 dBTP | 15,357 |
| `vox_c4_xu_r7` | 7.488s | －20.90 LUFS | －2.37 dBTP | 45,165 |
| `vox_c4_aunt_r8` | 3.864s | －20.40 LUFS | －6.46 dBTP | 23,421 |
| `vox_c4_knee_r9` | 3.864s | －20.93 LUFS | －2.40 dBTP | 23,421 |
| `vox_c4_knee_wait_r9` | 3.936s | －20.34 LUFS | －3.62 dBTP | 23,853 |
| `vox_c4_xuning_v3` | 1.584s | －20.40 LUFS | －6.35 dBTP | 9,741 |

八条均已完成全文件解码和非静音检查；现役测试还直接对最终MP3运行loudnorm测量，要求综合响度在－22至－18 LUFS、True Peak不高于－1.5 dBTP。浏览器中仍须实际触发播放，核对语音与台词、人物和出场节点一致；不把文件存在或客观测量冒称主观试听。

2026-11-19腹痛阿姨语音替换为 `vox_c4_aunt_r8`，文本“上腹又胀又疼，躺久了更难受。”，使用 `zh-CN-XiaoxiaoNeural`、rate=-14%、pitch=-10Hz，采用更慢、更低的中文女性音色配置；起始静音裁切、两遍loudnorm后导出24kHz单声道48kbps MP3。最终文件23,421字节、3.864s、综合响度－20.40 LUFS、True Peak－6.46 dBTP，平均音量－20.5dB、最大音量－6.5dB，SHA-256 `3ae46878cd5cd5cf39f6b58ae583da992a3f0a162e63c600ce62a0a07f65fb71`，完整解码通过。旧 `vox_c4_aunt_r7.mp3` 已退出正式目录。以上只确认配置与客观测量，不冒称人工试听、年龄感模型认证或ASR逐字复核。

2026-11-20拄拐老师两条现役语音替换为r9：`vox_c4_knee_r9` 文本“膝盖卡住了，下楼最疼。”，`vox_c4_knee_wait_r9` 文本“这拐杖，总往椅子底下跑。”。两条均使用 `zh-CN-YunjianNeural`、rate=-16%、pitch=-12Hz，裁切起始静音、两遍 `loudnorm=I=-20:TP=-2:LRA=7`，导出24kHz单声道48kbps MP3。主线最终文件23,421字节、3.864s、－20.93 LUFS、－2.40 dBTP，SHA-256 `465c90bdf10fdac380352c8694989b0a05ee2a2c2fd68107b9cb1c82fd00db1a`；候诊最终文件23,853字节、3.936s、－20.34 LUFS、－3.62 dBTP，SHA-256 `145f28fbdbfee4d12a649895479d0b3f20b0750ad6b22c8428ff4516d6fa9f65`。两条全文件解码通过，旧r7文件已退出正式目录。这里只记录配置与客观测量，不冒称人工试听、年龄感模型认证或ASR逐字复核。

2026-11-13许建平首句改为“老范把我的申请给你了？我是许建平。上次做超声那会儿，咱们见过。”，沿用 `zh-CN-YunxiNeural`、rate=-8%、pitch=-5Hz，起始静音处理、两遍loudnorm、48kbps／24kHz／单声道MP3。新正式文件45,165字节，7.488s，综合响度－20.90 LUFS、TP－2.37 dBTP，SHA-256 `6b121b2584570f91627dc108a062baffca4b119b6a4fdc794a243e7939da5990`，全文件解码通过；最终生产包桌面全探索和手机完整主线均实际触发播放，浏览器取回音频SHA-256均为 `6b121b2584570f91627dc108a062baffca4b119b6a4fdc794a243e7939da5990`，无播放错误。

## 纸张书页、扫描与浏览器人工验收

- 第一章晨会考核与第四章章底考核共用 `ChapterQuizView`：同一 `bg_day` 清晨背景、`bg-slate-950/60` 遮罩、琥珀色标题与按钮、答后绿／红／淡出反馈、`choice-in` 反馈和成绩动画；第四章只替换题目、结算文案与业务回调，不另造考核皮肤。第四章题库为八道MRI物理与成像基础题，随机抽五题，题序和选项均随机，不考剧情处置。
- 第一章《医学影像学》、第三章《超声跟班二十页》和第四章《磁共振笔记》统一使用 `PaperBookOverlay`：同一纸张、边框、圆角、正文排版、页码、锁定提示和合书结构。第四章不得另做深色 `details` 手风琴皮肤；第三章不新增翻页音效，隐藏第五章仍走旧路径。
- 第四章笔记为十二页，六段日程每次开放两页。界面、状态结算与测试共同调用 `trilogyBookUnlocked`。翻页只记录 `c4_book_shift_${shift}` 阅读旗标，不再直接增加医术；医术／人心／家业只能由三个选项中的唯一奖励答案增加。15个故事决策均为三项，最佳位置按存档种子、runId和节点稳定洗牌；枢纽、小卖部、笔记和旧地点菜单保持原顺序。
- 桌面与390×844手机均需查看：章节入口、访问码、15节点序章、男女报到特写、六段扁平枢纽及全入口图标、登记台旧片袋交接、七件隐藏物、冯叔3T即时中止与市院0.55T换机四组完成、眼镜事故、采购延期、A17配件短信与报价夹、白天吊装→安装完成→阻止剪彩→正门剪彩、三岁母女合体立绘且无开场插图、腹部运动重采及T2／动态增强图组、可选A17报价、金属黑影的SE／短TE／短Echo Spacing处置与两类安全讨论、MRI物理考核、章底签名与凭证。第二天主线应先接患者，厂家旧话不得每日复述；同段白天／夜间背景须连续。
- 三张既有教学图按1440×900实际解码；基础对比图与前七张真实病例图按1200×900实际解码，新增腹部两图按452×634和900×279实际解码，逐张核对黄圈位置、标题、图脚和手机可读性。新增卒中图还需核对四个主面板、对应ADC小图、原红圈与后加黄圈。桌面端第四章基础对比图和 `mri_real*` 病例图不再受600px宽／470px高缩略图上限约束，使用页头与对话框之间的实际空间；图片容器底边不得压过对话框顶边。吊装、安装完成、阻止剪彩、正门剪彩、母女和两张报到图分别核对URL、尺寸和实际画面；市院换机CG与0.55T头部采集图按1590×848实际解码、核对SHA-256并实看。
- 检查新立绘是否清晰、无水印、无共用错人；每例图像是否实际显示；八条现役语音是否实际触发且不串台词；关键高亮逐字出现但不泄漏 `**`。
- MRI 扫描保留实际静态床体行为，但玩家可见配文只写“摆位确认 · 序列准备”“序列采集 · 信号接收中”“数据传回工作站”，不强调固定床，也不出现“无患者带教”或普通结果剧透。冯叔3T首组标题为“3T 头部 MRI · 首个序列开始”，250ms后显示动态呼救面板，设备声实际暂停、进度冻结在约8%；面板出现后再锁定3000ms，继续按钮在总计3250ms后才可用，实际点击后记录 `ended:true、completed:false、interrupted:true`。呼救出现时采集面板短促震动，减少动态效果设置下无震动。市院0.55T标题为“市院0.55T 头部 MRI · T1／T2／FLAIR／DWI”，3000ms完成后才出现三图对照并记录 `completed:true`。
- 十段MRI逐段配置 `mriModel + mriRegion`：市院腕部、冯叔3T首组和MRCP使用 `city-3t`，冯叔换机四组使用 `city-055-wide`，县院六段使用 `county-055-wide`。`MRI_SCAN_ART` 先选具体机型，再选部位；市院3T和县院0.55T各有七类1672×888摆位／线圈叙事插图，市院0.55T当前只有1590×848头部映射，缺少映射必须明确报错。渲染端同步提供 `data-mri-model`、`data-mri-region`、`data-mri-asset`。三种标题分别为“市院 3T · 长机身 MRI”“市院另一检查区 · 0.55T · 80厘米宽孔径 MRI”“县院 0.55T · 80厘米宽孔径 MRI”。
- 市院长圆柱3T、市院另一检查区短机身0.55T与县院后来采购的特定0.55T具有不同外壳、孔径、检查床、线圈和机房。场强高低不被简单解释为孔径大小；差异仅指本章这三台具体机型及其房间，市院0.55T不是把3T孔径调大，也不是县院新机提前出现。所有扫描图都是叙事美术，不冒称真实设备照片；磁体与RF教学图继续使用登记的真实实物照片。

市院 `city-3t` 七类映射如下；未列入当前十次扫描的素材仅作部位备用映射。

| 部位 | 素材ID | 当前适用扫描ID | 字节数 | SHA-256 |
|---|---|---|---:|---|
| 头部 | `trilogy_mri_scan_acquire_v3` | `c4_feng_basic_scan` | 77,706 | `d3d6474bf98a3f5d31f400737e5729b519230fcf7f2ffb8df0003ccc5c67faae` |
| 腕部 | `trilogy_mri_scan_wrist_v1` | `c4_city_wrist_scan` | 66,556 | `79d8334e7cf1d3a1b18371230c3423141176f44e88adeba3aaba2a1608f2715e` |
| 膝关节 | `trilogy_mri_scan_knee_v1` | 市院备用映射 | 77,254 | `d6d250edbe12ff59f9c8e6f97314efe732059f974cb3b1241a7bf0c27de71d64` |
| 肩关节 | `trilogy_mri_scan_shoulder_v1` | 市院备用映射 | 68,104 | `78d00670694173621fe2be5105091163831bb1c71be77b2e91176ef6be53a6ca` |
| 颈椎／颈部 | `trilogy_mri_scan_cervical_v1` | 市院备用映射 | 71,350 | `1c45dd04e47e46e6e80ac20fbed52b2ddbb2757d2758d5507e4ebfbf7b09b7b5` |
| 腰椎 | `trilogy_mri_scan_lumbar_v1` | 市院备用映射 | 69,320 | `0564d78c8fe73f7ece3335e0fbbc54aa02c7c89ce90599971aad0b022c43e6fe` |
| 腹部 | `trilogy_mri_scan_abdomen_v1` | `c4_city_mrcp_scan` | 70,978 | `8114b2ee050d58edf2c889db57d84bde99569c62c9e3f67bc3957419b43b1b79` |

市院另一检查区 `city-055-wide` 当前唯一激活映射为 `head → trilogy_mri_scan_city_wide_head_v1`，适用 `c4_feng_city_scan`；1590×848，97,596字节，SHA-256 `f89595a1a7709a6cbeac1be9c69267cc75312e8b1c719c0b4b1eb4289f8a6e56`。其他部位不得静默复用该图。

县院 `county-055-wide` 七类正式WebP均为1672×888、q78、alphaQuality=100、effort=6：

| 部位 | 素材ID | 适用扫描ID | 字节数 | SHA-256 |
|---|---|---|---:|---|
| 头部 | `trilogy_mri_scan_county_head_v1` | `c4_county_dwi_scan`、`c4_feng_county_scan` | 92,920 | `8537fdee9abac3a512257881bbe2e907ff015fc28fb45d69944e49b0b9d19bb3` |
| 腕部 | `trilogy_mri_scan_county_wrist_v1` | 县院备用映射 | 93,230 | `5319bb827b425e4c720690e7ff25c13c862e4f7238b3d18394f00f8cec09b6df` |
| 膝关节 | `trilogy_mri_scan_county_knee_v1` | `c4_county_knee_scan` | 96,032 | `f58cfccfcc72edf92e5aebfd4eb3c15ac43d38610e25252acbd2a7ecbc452324` |
| 肩关节 | `trilogy_mri_scan_county_shoulder_v1` | 县院备用映射 | 88,298 | `be5fd74614b1a9990737c0b896f47ca995f37bfc2bc1a482237c7dbba4c1c347` |
| 颈椎／颈部 | `trilogy_mri_scan_county_cervical_v1` | 县院备用映射 | 92,512 | `13db20747f7f1b5e614f873d6af9a6d911d05bdef2d228a02b5d87cb04c9a1e9` |
| 腰椎 | `trilogy_mri_scan_county_lumbar_v1` | `c4_xu_lumbar_scan` | 89,160 | `9f84cb1e729f799a6b27ad91e6c20fb8ef850b6d9d0a9eaf4dfca1647b069143` |
| 腹部 | `trilogy_mri_scan_county_abdomen_v1` | `c4_county_abdominal_motion_scan`、`c4_county_abdominal_retry_scan` | 87,060 | `a0fa2e57c201862c033be9ea44019a9fe6b9213d0ae6a74ecebb7526c345c787` |

2026-11-22七图统一以既有县院机房为视觉基准：0.55T、80厘米宽孔径、短机身、奶白外壳、青色前环与两个小面板、青绿床面，以及相同暖色手绘像素／赛璐璐风格。头部及头线圈进入孔内；腹部与腰椎均为躯干深入、孔外主要保留下肢；膝部为头左脚右，膝线圈和膝部进入孔内，只有一名患者、两条腿和两只脚；腕部为单臂前伸且腕部进入孔内；肩部为头、肩与线圈进入孔内；颈部为头颈进入孔内、肩部在孔口附近。七张源图均为2048×1088，按 `(128,0,2048,1020)` 去除角落生成标记后缩放至1672×888；未裁伤患者、线圈或机器。原始候选、最终源图与正式WebP接触表均已逐张实看。县院机房、走廊、控制室和准备区背景保持原字节，市院3T与市院另一检查区0.55T素材也不因本轮替换。

两院十张房间背景均为1672×941正式WebP，尺寸、字节和SHA-256按实际交付文件登记：

| 医院／房间 | 素材ID | 字节数 | SHA-256 |
|---|---|---:|---|
| 市院控制室 | `bg_c4_city_control_v1` | 133,962 | `0f577edceafc78438e7c2b3d445fd94358e7231aa2faf4ae086ddb8e14c5ca14` |
| 市院机房 | `bg_c4_city_magnet_room_v1` | 91,866 | `6128e72078126136d440cf6296120848e004183e4c890914a7923efe95b27fc4` |
| 市院走廊 | `bg_c4_city_corridor_v1` | 114,928 | `c8f524ad1578fefc154a2e697d64757b9e0264965542e71a389f810ab5790ab6` |
| 市院准备区 | `bg_c4_city_preparation_v1` | 121,118 | `aa06f31e6399e23bf5e733c5a488c869d54d498f5b3111c55e00b3783f3591e3` |
| 市院员工角 | `bg_c4_city_staff_room_v1` | 66,802 | `c787ab82bce01baac989794816eb1cd8f92cb66d89788b6cef13328751a2f27c` |
| 市院分诊台 | `bg_c4_city_triage_v1` | 107,786 | `66159cf9ccc4b56676aa714faee4711259513eec1f492f0c2d73e0bc2282a2b2` |
| 县院控制室 | `bg_c4_county_control_v1` | 91,150 | `db463ca2af29c26851e5db915c13d3ed97bcbdc8b78da0b7a388821386045c1e` |
| 县院机房 | `bg_c4_county_magnet_room_v1` | 104,496 | `38c512c8b72c4db3b25b7726ee429215fe12d8b11240b6d2906469cf1857beb2` |
| 县院走廊 | `bg_c4_county_corridor_v1` | 117,722 | `6800cace04f510838895f0ca4b093050114b6ab64998e51cc00ddadf133f4913` |
| 县院准备区 | `bg_c4_county_preparation_v1` | 113,026 | `7019ce8f8a7565598dd477074661716364a4b203e367114b3d9c878351c464e5` |

- 摆位与线圈人工看验重点：两院机器轮廓与房间装修必须可直接区分；县院膝部线圈位于膝关节，腰椎摆位与线圈匹配。桌面和手机均需实际查看当前病例涉及的部位及三种机型截图，不得只凭资产ID存在判定通过。
- 每端十段 MRI 扫描均在真实时长内采样：九段普通采集在约150ms、1000ms、2000ms采样，冯叔3T首组另在约100／350／600／3000／3300ms采样，共32次。床位 travel 为0.000、无 CT 滑床／前景层、图片 transform 为 none 且地址一致；同时核对渲染 `data-mri-model` / `data-mri-region` / `data-mri-asset` 与当前节点配置相同，并解码Blob核对正式WebP SHA-256。3T首组确认呼救面板、短促震动、减少动态效果、约8%进度冻结、设备声实际暂停、3000ms时按钮仍禁用和3300ms时按钮可用；实际点击后才写入中止收据。市院0.55T四组完成后才出现三图对话，不能提前跳到完成。
- 检查背景日程是否错位、长对白是否遮按钮、手机是否横向溢出、语音是否串台词；扫描中、完成或中止回执和刷新恢复分别核对，六段结算不得显示“五班”或“九段”。
- 浏览器验收不替代截图人工看验；发现具体视觉缺陷后至少修复并复验一轮。

## 2026-11-15 呼救、病例图与患者身份修订

- `mri_c4_basic_contrast_v1` 已替换为 `mri_c4_basic_contrast_v1.1b808566902556c5.webp`：1200×900，47,538字节，SHA-256 为 `1b808566902556c5249e6f426f886175b7f37ba984a393f211082a458f8686db`，q78、alphaQuality=100、effort=6。三幅原始脑部面板保留；删除三处“看对比，不背‘亮度密码’”，改为中性的序列名称。标题为“T1、T2、FLAIR｜同一层面对照”，副标题说明同一脑部、同一层面及采集权重／抑制目标差异。
- `pat_c4_liu_v4` 正式文件为 `pat_c4_liu_v4.26a928faca8f136c.webp`：512×768，44,630字节，SHA-256 为 `26a928faca8f136ccf1bf13a5716e9cabd6ca2b7878013aed60f4008f1c95558`，q78、alphaQuality=100、effort=6。保留原人物面孔、体型、像素风和右手按上腹姿势，改为蓝白竖条纹病号服、病号裤和深色拖鞋；人物与脚部完整，无水印。旧 `pat_c4_liu_v3` 已退出正式目录。
- TFCC解释完整高亮“三角纤维软骨复合体（TFCC）”及其位置、组成、稳定腕关节和缓冲受力功能；结果段继续明确需结合完整图组与查体。
- 探索发现保留剧情和flag，不再附加“隐藏线索”“隐藏证据已收入证据夹”等元提示；删除“看对比，不背”“不再只抄数字”等自我暗示、自我纠正式说教文本。
- 多分辨率验收矩阵为1280×900男性主角全探索完整路线、1440×900与1920×1080首晚病例／对照图路线、390×844女性主角完整主线。每次均实际等待扫描；桌面病例图检查容器不压对话框，且图像实际尺寸突破旧600px／470px缩略图限制。

### 最终浏览器验收（2026-11-15）

- 1280×900男性主角全探索完整路线通过：423次真实访问、393个唯一节点、六次日结、十次采集（九完成一中止）、32次固定床采样、六次首读、九条语音、七张真实病例图、17项活动、七件探索物、五道考核和最终凭证；控制台错误与横向溢出均为零。凭证测试码 `YSK4-0PEEMM2`。
- 390×844女性主角完整主线通过：346次真实访问、340个唯一节点、六次日结、十次采集（九完成一中止）、32次固定床采样、六次首读、八条主线语音、七张真实病例图、五道考核和最终凭证；不探索时活动与隐藏物均为零，控制台错误与横向溢出均为零。凭证测试码 `YSK4-0R4UUO3`。
- 1440×900与1920×1080首晚定向路线均通过：各95次真实访问、三次采集、11次固定床采样，控制台错误与横向溢出均为零。已实看两种分辨率下的基础对比图、TFCC和卒中图。
- 1280×900完整路线中，呼救100ms采样尚未出现；356ms、605ms、3007ms采样时按钮均禁用，进度冻结为8%，面板震动名为 `trilogy-distress-shake`；3308ms采样时 `data-scan-distress-ready=true` 且按钮可点击。减少动态效果后面板动画名为 `none`。实际点击后收据为 `ended:true、completed:false、interrupted:true`。
- 1280×900与1440×900的长文本病例图容器高668px，实际图像约843×633至881×662；容器底边714px，对话框顶边746px，无重叠。1920×1080病例图同样使用可用空间且不压对话框。手机端呼救、基础对比、TFCC、卒中、病号服患者和最终凭证截图均已实看。

## 2026-11-18 正确选项成长与七图文字清理验收

- 七张病例图的源文件、dist与manifest SHA-256一致，旧哈希文件均不在现役 `src/public/dist` 交付路径；三张英文背景原字节未触碰。
- 桌面1280×900全探索与手机390×844完整主线均实际解码七张正式WebP；双端病例图无控制台错误、资源404或横向溢出。桌面全路线五题全对，医术增加5；手机五题全错，C级且医术增加0。六段阅读均无直接属性变化。
- 桌面购买二手书、零食和奶茶分别只扣100、40、200金币，医术／人心／家业不变；分享零食只消耗物品，三项属性不变。

## 2026-11-22县院扫描与人物清晰度最终验收

- 正式素材总检：七张县院扫描图均为1672×888、q78、alphaQuality=100、effort=6，逐张实看确认目标部位与对应线圈进入孔内、患者与机器未裁伤、机器外观与县院机房一致；母女和许建平正式透明WebP均为512×768，与本章其他患者同场比较后未见旧版明显模糊。原始生成图、候选接触表和过程文件仅留临时目录。
- 现役测试：`npm run test:current` 的15个文件全部通过；第四章专项合同 `ch4-revision7-three-choices-mentor-prompts-se-physics-quiz-county-visual-v2` 精确锁定九项新视觉路径及三张县院背景原哈希。生产构建通过，`protectedBaseBytes=16,946,635 / 17,000,000`，余量53,365字节。
- 桌面1280×900全探索：440次访问、406个唯一节点、六次结算、十次采集（九完成一中止）、32次固定床采样、15个奖励决策、八条语音、九张真实病例图、17项活动、七件隐藏线索；五题全对，医术＋5、金币＋100，凭证 `YSK4-1K9WMQB`。患者立绘SHA-256实际解码核对56次。
- 手机390×844完整主线：360次访问、353个唯一节点、六次结算、十次采集（九完成一中止）、32次固定床采样、15个奖励决策、七条主线语音、九张真实病例图；五题全错，医术＋0、金币＋0，凭证 `YSK4-1JKKMRD`。患者立绘SHA-256实际解码核对54次。
- 双端均从正常入口完整推进，未注入游标、未缩短或跳过扫描，`errors=[]`、横向溢出为零。已实看双端县院头、腹、膝、腰椎采集、母女开场与代表对白、许建平新立绘、考核及凭证；未见明显遮挡、文字截断或错误素材。备用腕、肩、颈图仅按正式WebP接触表验收，没有冒称现役病例已触发。
- 本轮不改三张英文背景、真实病例影像、市院两种机型、第一章、剧情选项、扫描时长、题库或存档；只保存Kimi static预览，不推送GitHub、不改main、不发布Pages。
