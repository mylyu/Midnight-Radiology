# 第二章撤出剧情留档 · 2026-09-21

基线：`4f70852`。作者本轮明确要求：老同学来访及其后续留待 DLC，水模环状伪影剧情撤出第二章。源码角色名为陆舟（本轮口头称陆川），此处不擅自改名。

这是一份非运行时存档，不会再从第二章触发。原立绘、音频、图像及玩家已收集的历史记录保留。以下保留原节点，便于将来制作 DLC；未来章节总线并未整体作废。

## 原片段 1

```ts
  // —— 中午 · 陆舟登场 ——
  c2d2_n0: { speaker: 'sys', text: '午休，机时难得空出来。一个抱着铝合金箱子的人探头进来，胸前挂着「田头技术大学」的访客牌。', next: 'c2d2_n1' },
  c2d2_n1: { speaker: 'luzhou', sprite: 'luzhou', sfx: 'vox_luzhou', text: "……真是你！老室友，你怎么瘦成这样？（陆舟把箱子往桌上一搁）行，夜班比读研还磨人。", next: 'c2d2_n2' },
  c2d2_n2: { speaker: 'me', sprite: 'luzhou', text: '陆舟？你不是读研去了——', next: 'c2d2_n3' },
  c2d2_n3: { speaker: 'luzhou', sprite: 'luzhou', text: "硕博连读，没读出头呢，头发先少了。导师让我做低剂量重建，组会上翻来覆去都是水箱。今天批到一点体模机时，赶紧——下午病人来，我这箱水就得让床。", next: 'c2d2_n4' },
  c2d2_n4: { speaker: 'sys', text: "你和陆舟把水箱体模、线对卡体模依次摆好，按实验单完成三组采集。检查床退了出来，陆舟把箱子抱回推车。", sfx: 'xray', next: 'c2d2_n5' },
  c2d2_n5: { speaker: 'luzhou', sprite: 'luzhou', text: "认得这张**正弦图**吧？各个角度的投影排在一起。当年你借我抄作业，我把你画歪的坐标轴也抄过去了。（陆舟笑了一下）一块儿挨批，谁也别笑谁。", image: 'img_sinogram', next: 'c2d2_n6' },
  c2d2_n6: { speaker: 'luzhou', sprite: 'luzhou', text: '这张是**FBP**重建的体模。直接反投影容易糊，先滤波再反投影才把轮廓提起来。原理那本旧书第三、四页有，别让我现场推，我也得翻。', image: 'ct_phantom', next: 'c2d2_n7' },
  c2d2_n7: { speaker: 'me', sprite: 'luzhou', text: '那滤波器还有得选？', next: 'c2d2_n8' },
  c2d2_n8: { speaker: 'luzhou', sprite: 'luzhou', text: "有啊。锐利核看细节，噪声也显眼；平滑核看着顺，细节会让一点。你试试换一个，先别动扫描参数。", card: 'fbp_iterative', next: 'c2d2_n9' },
  c2d2_n9: { speaker: 'luzhou', sprite: 'luzhou', text: "我再开一组**迭代重建**对照。先估一幅图，再跟采集数据反复对、慢慢修。噪声少些，电脑得多干活——等结果够我泡碗面。", next: 'c2d2_n10' },
  c2d2_n10: { speaker: 'luzhou', sprite: 'luzhou', text: "（放大，再缩回去）等等，右边这根细线呢？降噪以后反倒淡了。差点就拿这张去组会邀功了……原图留着，得对着查。", next: 'c2d2_n11' },
  c2d2_n11: { speaker: 'sys', text: "陆舟把对照图编号抄好，笔在最后一行停了停。刚才还在拿旧作业逗你，这会儿倒先看了一眼办公室的门。", sprite: 'luzhou', next: 'c2d2_n12' },
  c2d2_n12: { speaker: 'luzhou', sprite: 'luzhou', text: "老同学，你们科能不能给我们点**去标识化的临床数据**？几百例，训练验证用。伦理批件还在办。我知道得等，就是组会上问进度的时候……总不能回回都端出这一箱水。", next: 'c2d2_n13' },
  c2d2_n13: { speaker: 'sys', text: '【怎么回应？】', sprite: 'luzhou', choices: [
    { text: '「先补齐批件和协议，我帮你问小雷材料递哪儿。」', next: 'c2d2_14a', effect: { skill: 1, flag: 'luzhou_formal', badge: 'phantom_friend' }, tag: 'good' },
    { text: '「数据是病人的，我做不了主。你先做体模，临床数据的事咱按规矩来。」', next: 'c2d2_14b', effect: { flag: 'luzhou_wait' } },
    { text: '「我先帮你拷几百例？别外传就行。」', next: 'c2d2_14c', effect: { wealth: -1, flag: 'luzhou_gray' } },
  ]},
  c2d2_14a: { speaker: 'luzhou', sprite: 'luzhou', text: "行，批件我催导师。你帮我问小雷，上回申请表退在哪一栏。别替我打包票，问清楚就够了——我不想把你也拖进去挨骂。", next: 'c2d2_15a' },
  c2d2_15a: { speaker: 'luzhou', sprite: 'luzhou', text: "可厂家那个终端，不是说能回传数据吗？他们装个盒子就进来了，我连表往哪儿交都没弄明白。（陆舟把记录本一合）当然，人家到底传什么，我也不知道。", next: 'c2d2_16a' },
  c2d2_16a: { speaker: 'me', sprite: 'luzhou', text: "「终端具体传什么，我也不清楚。你别拿厂家的做法当批件。」陆舟点点头，你把要问信息科的那一栏圈了出来。", next: 'c2d2_n17' },
  c2d2_14b: { speaker: 'luzhou', sprite: 'luzhou', text: "得，那今天先抱水箱回去。临床数据我接着跑申请，下回给你带食堂的烧饼。", next: 'c2d2_n17' },
  c2d2_14c: { speaker: 'luzhou', sprite: 'luzhou', text: "别拷！导师要问来源，我怎么交代？……你帮我找对递材料的人，比给我塞硬盘强。", next: 'c2d2_n17' },
  c2d2_n17: { speaker: 'sys', text: "陆舟把箱扣压了两次才扣上，留下实验记录：「协议、参数和重建版本都在这儿，别只存那张好看的。下回得照着比。」最后一页那根变淡的细线，被圈了两道。", effect: { flag: 'phantom_log' }, event: 'ch2_luzhou', next: 'c2d2_p1' },

```

## 原片段 2

```ts
  c2n5_ring_trigger: { speaker: 'sys', text: '送完毯子，控制台又报了一次通道异常。开班时日检还是正常的。你暂停接检，通知值班医师，按故障复核流程把科里的水箱体模搬上床。', next: 'c2n5_ring_scan' },
  c2n5_ring_scan: { bg: 'bg_ctcontrol', speaker: 'sys', text: '体模扫描完成。那几秒低鸣停下来，屏幕开始刷新。', sfx: 'xray', next: 'c2n5_r0' },
  // —— 事件2·续：体模上的年轮 ——
  c2n5_r0: { speaker: 'sys', text: "新扫的水箱图上，一圈圈圆环浮了出来。你下意识看了眼机房——床上只有水箱。切回开班日检，再看这张新图：早先没有这些圆环。**同一台机器，前后不一样了。**", image: 'ct_water_ring_teaching', next: 'c2n5_r1' },
  c2n5_r1: { speaker: 'sys', text: '【水箱是均匀的——均匀的东西扫出「年轮」，问题出在哪？】', image: 'ct_water_ring_teaching', choices: [
    { text: '「水放久了分层？换箱水重扫一次。」', next: 'c2n5_r2a', effect: { skill: -1 } },
    { text: '「像环状伪影。把新旧体模图附上，报修查校准。」', next: 'c2n5_r2b', effect: { skill: 1 }, tag: 'good' },
    { text: '（拿出工具箱里的记录本）「先报修，我再把日志里的报警号找出来。」', next: 'c2n5_r2c', cond: { item: 'toolbox' }, tag: 'good' },
  ]},
  c2n5_r2a: { speaker: 'duty', phone: 'char_duty', text: "水没这么分层的。先看**探测器校准**，这种同心圆要查设备。报修单把体模图附上，受影响的检查先按停机预案安排。", card: 'ring_artifact', image: 'ct_water_ring_teaching', next: 'c2n5_r3' },
  c2n5_r2b: { speaker: 'sys', text: "旧记录没有这些圆环。你把新旧两次体模图附在报修单里，填上：**环状伪影，疑似探测器校准异常**。", card: 'ring_artifact', image: 'ct_water_ring_teaching', next: 'c2n5_r3' },
  c2n5_r2c: { speaker: 'sys', text: "你先报修，再打开用户端日志：**第217号通道反复报警**。截图发过去，工程师很快回复：「收到了，我带检测工具来，机柜先别拆。」", card: 'ring_artifact', effect: { skill: 2, badge: 'wrench_night' }, next: 'c2n5_r3' },
  c2n5_r3: { speaker: 'sys', text: "报修单提交，受影响的检查按停机预案分流。你翻出陆舟那本记录，把协议、参数和早先体模结果一并附上。那句「别只存好看的」这会儿派上了用场。", next: 'c2n5_n6' },

```

## 原片段 3

```ts
  c2n5_p2b: { speaker: 'sys', text: '屏幕上是陆舟：「**伦理批件下周提交！**批下来我带师弟师妹去你们科参观学习——顺便膜拜全县第一台新CT😄」', next: 'c2n5_p2c' },
  c2n5_p2c: { speaker: 'sys', text: '【回复什么？】', choices: [
    { text: '「欢迎。体模数据记得带上——老周念叨第二回了。」', next: 'c2n5_p2d', effect: { heart: 1 } },
    { text: '「来可以，先帮我推一遍迭代重建的收敛证明。」', next: 'c2n5_p2d', effect: { skill: 1 } },
    { text: '（锁屏，继续干活）', next: 'c2n5_g0' },
  ]},
  c2n5_p2d: { speaker: 'sys', text: '他秒回了一个抱拳的表情。凌晨两点十七分，这座县城里还有两个没睡的人。', next: 'c2n5_g0' },

```

## 原片段 4

```ts
  c2am_7: { speaker: 'sys', text: "【数月后】合规手续办妥，离线实验室里出了新的重建对照图。老周放大几遍：「噪声少了，边上那根细线呢？」陆舟回：「还在查。原图留着，这回没急着交差。」研究结果还不能拿来签临床报告。", effect: { flag: 'ai_hook' }, next: 'c2am_8' },
```
