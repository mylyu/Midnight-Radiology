# LDCT《这顿饭，等片子看清了再吃》

基点 `5dbfb75`；工作分支 `codex/ldct-raw-data-story`。作者批准：一条连续故事、两个晚上、几周后的临床回响。只做本地版本，不推送或部署。约20分钟为阅读/探索设计目标，不把自动快进耗时当成人类试玩时长。

## 替换与继承

- 陆舟的父亲有长期吸烟史，担心辐射而躲检查；不是主角的父亲，不接神秘病人、1998或远程盒子暗线。接第二章陆舟约饭电话，发生在2025年冬至2026年初、第三章之前。
- 医师安排低剂量CT后，FBP中一处结构不易辨认；该台虚构设备的迭代选配包未购买。两人利用已有研究接口与陆舟已有程序处理获准、去标识的同次投影，不破解授权，不拿截图当原始投影。复核/转诊不等玩家完成实验。
- 第一晚由正弦图引出完整圆模体复习、直接BP与FBP；第二晚电话和短休息后比较计数噪声，再操作胸部SART–TV。相邻层、固定版和玩家标记是交流工具，不是自动诊断或计分答案。尾声由临床完整复核及后续检查确认早期病变。
- UI复用 `DialogueScene` 和共享900/300ms保护，整场景点按不变。工具一次主要操作可继续，曲线/残差折叠，不显示五项打卡进度，不增加普通对白嘟声、配音或扫描。
- 第一晚结束停留，购买和刷新不能推进，明确按钮才进入第二晚；短休息当面送礼，奶茶购买人心＋2、零食送出人心＋1，学习奖励跨旧稿与重玩共用收据。

## 存档和边界

`ldctStories.version=2`、`openingRevision=4`，使用独立 `father` 槽。首次迁移取消旧候选active，保留face/dinner/patient、旧四段legacy、累计属性、库存与奖励收据。旧稿仅只读历史入口；不将旧游标改写成父亲经历。重玩仅清父亲当前槽的选择/草稿，不回退主游戏或重复颁发学习奖励。

实验草稿增加可选胸部状态（相邻层、固定版、标记含来源方法/层/轮次、FBP切换），记录来源版本/种子。节点可配置数据集与胸部预览，保存仍由现有纯转换原子提交；下载阶段不初始化剧情。

第一/二章、DR/DSA、所有既有音频及调窗数值PNG保持。旧三篇的face/nut图集已退出活动预载及部署目录，移动到仓库外 `../ldct-father-assets/previous-delivery/`；Git基点也可恢复。旧结构/类型辅助函数保留给历史记录解释，不再开放旧实验画面。

## 新媒体及来源

|逻辑ID|交付体积|方法|
|---|---:|---|
|`ldct_char_father_v1`|26,520 B|内置imagegen生成，1024×1536透明PNG原稿；512×768最近邻缩小，有损WebP q78、alpha100，保留透明度|
|`ldct_chest_v1_images`|152,370 B|192×192、3邻层、7种图像结果，无损WebP图集|
|`ldct_chest_v1_projections`|499,664 B|同3层的原投影/预测投影/残差，无损WebP图集|

新媒体合计678,554 B；移出的两张旧候选图合计776,888 B。原始图、数组、审核联系图均在仓库外，不下载模型或患者原始数据到浏览器。胸部生成参数、输入哈希、每轮实际算法和局限见 [ldct-chest-numerics.md](ldct-chest-numerics.md)。完整圆模体保留 `5dbfb75` 修正，不滤波与完整BP数值/像素一致。

父亲立绘由内置imagegen生成，不使用API/CLI替代。风格参考当前第一章 `char_fan` 与第二章 `ch2_pixel_char_luzhou_m`；两图仅作风格/家庭相似参考，不是编辑目标。原PNG的SHA256为 `627a86eaa4584438905f939e239d4e147a41ddd7409bf30ee87a3ce743e26539`；交付SHA256为 `0c1d54f2fc7b231d4ea62e565024110db5aba38e4b44ada8feb97b4642c82192`。

生成提示要点（原图存于 `../ldct-father-assets/father-original.png`）：

> ONE NEW Chinese pixel visual novel full-body sprite: Lu Zhou's father, approximately60, independent ambulant small-town dad, short salt-and-pepper hair, mild receding temples, weathered warm face, guarded but slightly amused expression, no glasses. Dark olive-brown padded winter jacket, grey sweater, dark trousers, ordinary black shoes. One hand holding folded plain appointment slip, other in pocket. Portrait1024×1536, centered full body and padding. Chunky square pixel clusters, dark outlines, muted palette, warm face/cool shadows matching supplied approved sprites. Genuine transparent alpha background. No text, logos, scenery, cigarette, medical devices, ground plane, photorealism, smooth anime or extra characters.

## 科学依据和写作限制

- [AAPM低剂量CT挑战](https://www.aapm.org/grandchallenge/lowdosect/)区分图像域去噪与预处理投影域重建。本项目仅参考方法和数据边界，**未使用该挑战患者数据**，不把其腹部病灶研究结果套成肺筛查结论。
- [NCI CT资料](https://www.cancer.gov/about-cancer/diagnosis-staging/ct-scans-fact-sheet)用于核对筛查收益/局限、需要进一步诊断评估的表述。游戏不提供患者剂量/年龄阈值建议，不让父亲为试参数反复受照，也不根据单张模拟图宣告癌症。
- 当前胸部结果第1至8轮总体逐步成形，弱对比仍可能衰减。不要追加“第8轮必然抹掉病灶”台词；不要偷偷改变显示窗、擦掉背景、叠加真值，让图去迎合结论。
- 所有病例画面为原创数字模型的教学演示，非真实父亲影像。只在工具入口解释一次，详细限制放手册，不恢复反复AI警告。付费模块/导出条件属于这台虚构设备，不泛化所有厂商，更不暗示科室为了卖升级故意不给合理检查。

## 验收约定

一次父亲故事浏览器主线（两晚＋尾声），同时覆盖手机390px/横屏、一次胸部实验刷新、第一晚结束页恢复、购物双击/送礼、普通选项连续快点及预载后阻断媒体网络。其他选择、旧档迁移、奖励去重和跨章隔离用纯状态定点检查；不重走第一二章。数值检查不代替画面对照，自动流程不等于作者认可趣味。

已执行并通过：

- `npm run build`（含类型检查、完整媒体清单生成、原内容体积保护）；Vite仍有既有单包体积提示，未调整阈值掩盖。
- 新/改LDCT模块和测试定向ESLint；没有重复执行未涉及的全仓旧lint。
- `ldct-chest.mjs`、`ldct-chest-state.mjs`、`ldct-father-session.mjs`、`ldct-loading.mjs`：数值帧、状态参数、80次纯状态主线、替代回应/求助/重玩/迁移/共享收据及原章节媒体保护。
- `ldct-father-browser.mjs`：实际操作两晚及尾声，覆盖送礼、咖啡双击、全文选项连点、实验/经营页刷新、加载后阻断媒体网络。脚本首次遇到短句自然打完后被补全文点击翻过，修正旧句等待竞态，使用隔离测试存档断点继续；没有改游戏推进来迎合测试，也未清作者存档。
- `ldct-father-mobile.mjs`：独立胸部节点夹具，触屏迭代、固定版、FBP、390px及844×390滚动到继续按钮、返回对白及手册关闭；不再完整重玩。
- 已看实际立绘/病例/不滤波/迭代/经营页截图。手机实验台可纵向滚动，主要操作先显示，辅助投影折叠；横屏按钮可达。截图放仓库外 `../ldct-father-review/`。

最终构建17,788,786 B；LDCT冷加载含大厅2,553,908 B，LDCT独占素材1,166,138 B。其余加载组及原媒体哈希未变，原内容16,622,648 B仍低于17MB保护线；本轮无新增音频，也不下载数值源和模型。

完整撤回按本轮提交倒序revert，具体ID记于 `HANDOFF.md`。不要hard reset或清浏览器存档；Git不能回滚玩家已保存的记录。20分钟仍是设计目标，故事趣味与阅读节奏须由作者试听/试玩裁定，不把脚本通过当审美验收。
