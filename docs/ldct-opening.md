# 《低剂量CT：噪声之外》开场交接

基线 `d3e9fb5`，本地分支 `codex/ldct-opening`。本轮仅做第一段，不推送、不部署；此前版本仍是线上版本。

## 已做与未做

- 内容大厅独立卡片、`#/dlc/ldct`、本机访问码 `ldct2258`。无需通关第二章，有剧情时间提醒。直达链接同样检查访问码。
- 约饭→自由闲聊（陆舟、小雷、主任选择、休息、商店）→两轮同源数字模体实验→次日午饭→可停留阶段页。105个节点（含选项分支/菜单），不是105段全部必读。
- 固定A、拖分界、相邻层、信号/算法/强度、圈疑点与求助。保存一对不同配置后才允许查看已知结构。深度学习未开放；后三段明确待制作，没有DLC通关证。
- 本轮独立记录存于 `dlc.ldct.ldct`（外层遵循现有通用DlcProgress，内层有独立类型/版本）。所有选择、游标、物品与奖励走纯session reducer，再由App一次保存。开场重玩不改第一二章、DR/DSA、身份、凭证和主线限购；累计属性及背包照常继承。
- 首份对照医术+1及“第一份对照”；整理记录家业+1，刷新/同轮重做不重发。奶茶购买+2、赠送只消费；零食当面分享+1。咖啡30、奶茶200、零食40；咖啡只缓解一次内部疲惫，不刷行动力。阶段结束后机会已过，商品给出停售解释而不卖无用库存。
- 复用背景、像素立绘、RichText渲染、中央静音冒泡与共同900ms/300ms选项保护。仅LDCT有新布局和CSS。不修改任何已批准角色声音，不加普通对话/走路音效。

## 继承与有意差异

| 主游戏能力 | 本样段处理 |
| --- | --- |
| 场景/人物、富文本、输入保护 | 复用SceneBackground、imageAsset、App的RichText、useDialogueChoiceGuard |
| 章节完整加载 | ldct独立清单，下载/校验完成后才初始化；大厅不加载独占图 |
| 自由探索/消耗 | 完成闲聊隐藏；这是下班后研究，不借用主线AP、打卡或班末工资 |
| 商店/当面礼物 | 价格与收益时点不变，独立可用性，不动主线购买计数 |
| 经营页 | 有场景、四属性当前值/本段差值、记录、背包、手册、勋章、商店、大厅 |
| 普通章晨会/发证 | 不套用；这里只完成四段中第一段 |

## 新素材与压缩

仅新增两份正式媒体，合计 **431,610字节**。原媒体不覆盖。

1. `ldct_bg_restaurant`：imagegen生成，参考现行 `bg_breakroom` 的块状像素绘画、深轮廓、冷蓝窗景与暖灯。原创医院旁小饭馆，无人物、UI或文字；原图实际1672×941，不放大凑尺寸。原PNG 2,022,364字节，源SHA256 `c89ecbb1f9eb1872699de628f1593aa4a1a6eb2b5df5d6f30f2b6d2777da8dc3`。使用现有import-image脚本q78/alpha100，交付103,186字节，哈希 `1e0f0d5b98e52a908e08fc93445777803784cc49450e43b92f85a87f9b9b6574`。
2. `ldct_phantom_v1_atlas`：原创数值模体与真实离线投影重建，328,424字节，无损WebP，不是AI生成病例图。完整算法、种子、版本、数值验收见 [数值记录](ldct-numerics.md)。只清除了本轮过期图集候选，未删除旧游戏素材；数值源和生成脚本可恢复。

饭馆生成提示摘要（没有付费外部素材）：
“Image 1 is STYLE REFERENCE ONLY. New Chinese pixel narrative game restaurant background: modest neighborhood restaurant beside county hospital, winter evening 2025, bowls/chopsticks/tea/homestyle food, fogged cold-blue window, warm amber lamps; match coarse high-resolution pixel painting, dark outlines, grounded perspective. No people, writing, brands, watermark, UI, photorealism or smooth anime. Leave sprite and dialogue space.”

源文件在本机仓库外 `.codex/generated_images/.../exec-1f36bff0-9e13-479a-8745-5f684194f250.png`；不把大PNG、NPZ、审阅截图复制到public。素材按仓库原创许可发布，数值库各自许可仍适用。没有用AAPM患者数据。

## 验证与边界

R3新章集成：一次开场完整流程＋相关替代分支/函数测试；不重复通关第一二章。具体浏览器与构建结果在本轮HANDOFF最终记录中列明。

- `tests/ldct-session.mjs`：完整路线、另一主任决定、延期整理、礼物/奖励去重、重试/旧档/其他章隔离。
- `tests/ldct-lab-data.mjs`、`scripts/check-ldct-phantom.py`：配置图集绑定、数据源和固定噪声、无损像素、弱结构/噪声权衡。
- `tests/ldct-loading.mjs`：访问码、存储拒绝、本轮独占资源隔离；旧章所有资源清单和哈希逐项不变；原内容17MB保护仍保留，独占DLC媒体单列，不给新增媒体另设硬上限。
- `tests/ldct-opening-browser.mjs`：实际开场、购物/赠送、快点防误选、实验刷新与离线完成、390px/横屏、阶段页/重试/重玩。
- 不以“脚本能跑”宣称对白已获作者认可。体验时长是按阅读与实验预估；需作者确认对白节奏和比较手感后才继续后三段。

## 参考与后续

- [AAPM低剂量CT挑战](https://www.aapm.org/grandchallenge/lowdosect/)：共同数据与投影噪声比较思路，不外推本演示为临床剂量。
- [涉及人的生命科学和医学研究伦理审查办法](https://www.nhc.gov.cn/qjjys/c100016/202302/6b6e447b3edc4338856c9a652a85f44b.shtml)：后续患者数据研究须独立处理机构授权/审查/所需同意，本段没有取得临床资料。
- [ICMJE作者贡献原则](https://www.icmje.org/recommendations/browse/roles-and-responsibilities/defining-the-role-of-authors-and-contributors.html)：供后三段设计；不是主任/同事自动挂名，也不是协助者永远不能成为作者。

后续三段先等作者确认。禁止把本样段回填成第二章陆舟来访；1998、盒子、匿名消息保持各自边界。

回退采用本轮提交的 `git revert`，不hard reset、不清玩家存档。新存档字段在旧版中未被使用；撤回代码不能反向扣除已得到的累计属性。
