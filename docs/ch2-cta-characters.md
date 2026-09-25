# 第二章：两种重建、夹层病例与同事互动（2026-09-25）

基点 `dadc208`，分支 `codex/ch2-cta-character-polish`。本轮按作者六项要求做局部修改，仅本地制作、测试；没有推送GitHub或部署Pages。第一章、DR/DSA、旧图片/声音与上轮细裂隙腕图均保留。总线只读，1998年与神秘病人谜底不动；三夜两白班、观察/扫描/送礼/经营/考核原操作不变。

## 修改与理由

1. **两种重建**：冠脉三维图第一次出现后，`c2n3_recon_question/projection/render`三句普通对白解释：投影数据经过FBP/迭代等算成断层；已有断层数据再做三维渲染。不是又一次曝光，不加考试或配音。避免把显示算法和投影反演当成同一个步骤。
2. **CTA重复切图**：原 `slices→where→volume→clear` 后，`h4`又挂断层、`h5`又挂三维，形成第二轮切换。保留第一次完整展示，去掉h4/h5重复图片，核对薄层仍在文本中明确。观察确认时只对`c2n3_coronary_where`将ack与目标volume一并存档，不再回播刚答过的问题。旧档停在已ack的where也只续到volume；其他观察保持原返回方式。
3. **夹层患者**：改45岁左右、爱跑步踢球的中年男人；周五清晨躺在床上突然剧烈背痛，换姿势不缓解、冒汗，还以为是抽筋。妻子补充病史，小何解释为何不能当普通拉伤，主角做设备与出图工作。没有复制原文中的具体药量、ICU/手术过程，不沿用“先造影排除心梗”的个人经历作通用流程。
4. **紧急转诊与三维**：主任核对完整序列后立即通知急诊联系市三甲接诊、启动急救转运，急诊团队继续监护和处理病情。`c2d4_aorta_volume/volume_reply`接在原t2no后，以现有同次数据补充三维剖切图；不是再采集、不加扫描计时、不能让转运等图。片子露出的是剖切后的内部隔膜，不是外壁整个撕开。薄层/多平面重组仍一起交接，不用单张3D决定分型或治疗。
5. **罗阿姨声音**：只在`c2d4_needle0`加“大夫，帮我看看。”，2秒新MP3，不重复在后续针的影像或回礼播放。此前无配音变为有配音是作者明确新增授权，其他既有声音原样。过程、候选与限制见`ch2-luo-voice.md`和`ch2-luo-voice-generation.json`。
6. **减轻暧昧累积**：第二日听筒线闲聊交给小雷，下班饭盒提醒改老范，冠脉病例后主角自己兑茶；第五夜牛肉改值班同事共同分享。同步苹果/日出两种回响和收藏正文，仍保留原AP、人心、flag与第一章苹果回礼。日出只改两处离开动作，不删镜头/话题/选择。质控后的追问改小雷开口，不写小唐挪近椅子。小唐的排班/八卦、病人协作、礼物入口及两条勋章链保留，不把暧昧原封不动转给别人。
7. **同事立绘**：第二章原本在整个观察pending阶段强制隐藏立绘，连回答后的说话医师也隐藏。现答前仍留清晰影像，答后只恢复已在场的老周/主任/值班医师；儿童远程看片保留电话头像。电话、短信、日出等不强行召出实体人。`c2n5_g5`补上老周显式立绘。第一章的显示分支不动。
8. **章末两句**：`c2am_5→c2am_ct_reflection→c2am_ct_before→c2am_6`，主角感叹CT是急诊神器、问没有CT以前怎么办；老周提当时的症状/查体/可用检查与转诊，落到图快出来后救治还得接上。不说没CT就毫无办法或有CT就万无一失。原c2am_6的匿名短信入口和后续尾声保留。

## 素材与科学口径

- 新病人：`app/public/assets/media/ch2_patient_aorta_middle_bed.59b2accc43dacf90.webp`，1536×1024，137,746 B；沿用第一章粗像素人物观感和原病床视角，透明通道逐像素保留。
- 新三维：`app/public/assets/media/ch2_aorta_volume_cutaway_v1.803620fae1ddcc84.webp`，1254×1254，57,982 B。原轴位图不动，三维是虚构教学剖切示意，不是从这一张横断图计算出的真实容积，也不证明病变全程范围。成图与台词均不新增出血或爆裂画面。
- 两图内置imagegen生成，现有导入器WebP q78/alpha100，无额外缩放、无新原始PNG进入public；总计195,728 B。提示词、源文件路径、压缩参数和哈希见`ch2-cta-characters-images.json`。旧素材保留，便于回退及已有引用兼容。
- [AAPM CT术语](https://aapm.org/pubs/CTProtocols/documents/CTTerminologyLexicon.pdf)及[AAPM教学资料](https://www.aapm.org/education/documents/curriculum.pdf)区分图像重建与体绘制/多平面显示；这里只保留直观两步，不加公式。三维方便看空间关系，不能替代完整薄层核对。
- [ACR/RSNA CTA说明](https://www.radiologyinfo.org/en/info/angioct)支持CTA用于评估血管及夹层；[ACC/AHA主动脉疾病指南介绍](https://www.acc.org/About-ACC/Press-Releases/2022/11/02/18/18/ACC-AHA-Issue-Aortic-Disease-Guideline)强调专科团队与相应诊疗能力。本例的紧急上转是结合虚构县医院能力的剧情安排，不把所有夹层写成相同分型或相同手术时点。症状不是仅凭运动史能排除。

## 验证与交接

- 类型检查和生产构建通过；最终构建`index-BWRsWge_.js`，CSS原`index-DWJNXkI9.css`。200个逻辑图片共23.23 MiB。全仓lint仍是原10 errors/2 warnings；原大JS包体提示仍存在，未放宽预算或改lint规则。
- 冠脉/立绘数据测试与13个浏览器场景通过，包含三种观察回答、390px、ack和三维处理期间刷新、旧存档续行、奖励一次、远程电话/短信/日出例外。第一次误连8798旧build导致测试失败，改连接8811当前源码后通过，并在8805生产构建完整重跑13场景通过；不把旧缓存误认成本轮逻辑问题。
- 补查旧档`c2_payoff_expert_done=true`时发现`c2am_9`基底仍能显示“小唐挪近椅子”，已与新专家尾声同步改为小雷查看名单、打开笔记本；独立旧档断言覆盖此路径。
- 罗阿姨ASR/解码/响度/削波检查通过；音频模型认为自然女声、无明显表演腔，无法确认年龄，未声称真人试听验收。语音是新制作候选D，最终听感仍由作者试听判断。
- 夹层生产浏览器5条完整路线通过：覆盖三种方案、全部观察选项及求助、桌面/390px、透明患者与小何同屏、一次3秒不可跳过采集、轴位观察后两句三维展示、立即转院。又通过8条后续夹具：罗阿姨允许/拒绝播放、离开入口后刷新、4种苹果/日出回响和2种章末短信状态。两组分段执行，之间一次导航失败来自重建时dist短暂清空；不是一次未中断的13夹具运行，也不是重新完整通关两章。
- 罗阿姨实际HTTP下载33,453 B、浏览器WebAudio解码2.000秒/单声道；WebAudio上下文重采样为48kHz，不等于原文件24kHz变了。声音调度检查为静音接受或模拟拒播，不冒称真人听感检查。停在出场节点刷新仍可能重播，沿用原角色声音规则；离开该节点后不追播。
- 新独立保护层以`dadc208`为基点：9文件33处精确差异、1个固定哈希新模块、2图1声音；106旧runtime通过精确逆投影、13配置/总线原样、308旧公开文件（97声音）字节不变。456旧节点奖励/条件签名保留，542节点图可达目标有效，14次采集及原15勋章/17卡不变。42次源码篡改和3次媒体篡改均被拦截。只在新的审核记录固定本轮变动，不改旧历史pin。
- 200图交付报告一致，全部public为28,483,582 B；原12套切片序列、调窗图和已有配音未改变。旧测试仅精确适配本轮桥接/图像/角色/新声音，不宽泛放行、不降低体积预算。`git diff --check`通过。

### 可复跑命令与结果位置

以下12条静态入口均在`app/`运行通过；另内含`ch2-detail-polish-freeze`和`game-delivery-data`。新`ch2-cta-presentation-data.mjs`也单独通过。

```text
node --import tsx tests/ch2-cta-characters-projection.mjs
node --import tsx tests/ch2-cta-characters-data.mjs
node --import tsx tests/ch2-loop-observations.mjs
node --import tsx tests/ch2-pacing-story.mjs
node --import tsx tests/ch2-needles-data.mjs
node --import tsx tests/ch2-grants.mjs
node --import tsx tests/ch2-day-cases-projection.mjs
node --import tsx tests/ch2-day-cases-data.mjs
node --import tsx tests/ch2-thickness-dialogue.mjs
node --import tsx tests/ch2-director-day-voice.mjs
node --import tsx tests/game-delivery-freeze.mjs
node --import tsx tests/image-delivery-data.mjs
```

浏览器用`GAME_URL=http://127.0.0.1:8805/`连接已构建游戏，运行`node --import tsx tests/ch2-cta-presentation-browser.mjs`和`node --import tsx tests/ch2-aorta-luo-browser.mjs`。后者默认完整13夹具；`AORTA_LUO_FOLLOWUPS_ONLY=1`明确只跑8条后续，不能称全章走查。一次测试驱动的双立绘strict-selector错误、一次旧预告瞬时跳过的错误等待已修正，仅改新测试。音频字节数必须在WebAudio detach前记录，已增加非零断言。

证据在仓库旁`../ch2-cta-character-review/`：`presentation-results.json`是13条冠脉/立绘生产结果；`aorta-luo-failure.json`前5项是夹层成功结果，尾部保留重建期间导航失败；`aorta-luo-followups-results.json`为8条后续最终成功结果。截图原样保留，主代理目视检查患者桌面、三维手机与冠脉反馈手机均无遮挡。自建8811源预览已关闭，原8798/8805保留；8798已核对正在返回最终`index-BWRsWge_.js`。

本轮按逻辑/剧情素材、测试交接分组记录为独立提交。运行与素材提交为`b950bb5`；之后一笔为本轮测试交接。回退用`git log dadc208..codex/ch2-cta-character-polish`核对本轮两笔提交，先`git revert <本轮测试交接提交>`，再`git revert b950bb5`。不hard reset、不重置玩家存档，也不撤销此前主任台词、薄厚层问答和腕图修订。未推送、未部署。
