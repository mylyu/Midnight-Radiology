# 第二章教具、回礼与进床动画：回归保护记录

基点固定为 `6a0311b`。本页记录代码、数据和CT组件验证；完整故事浏览器走查结果另由总交接记录，不把静态测试冒充人工通关。

## 保护范围

- `ch2-payoffs-freeze.mjs`逐份核对100份既有源码／配置／历史清单。`App.tsx`、第一章、DR、DSA、存档、购买、结算计算、扫描登记、扫描播放状态、已批准音频相关模块不变。
- 只允许5个既有文件的22处准确hunk：`Ch2ScanOverlay.tsx/CSS`、`Ch2Shop.tsx`、`Ch2Settlement.tsx`、`ch2.ts`。账本为`ch2-payoffs-source-deltas.json`。逆变换必须与不可变Git基点全文件一致；31个区内／区外破坏探针全部应被拒绝。
- 新源码仅允许`Ch2CtMotion.tsx`、`ch2-ct-motion.ts`、`ch2-payoffs.ts`三个准确路径；不是放开所有第二章文件。
- 282份原图片／声音按原Git blob逐份核验；不修改、不删除。不增加声音。新6张图片逐文件固定SHA-256，并与`ch2-payoffs-assets.json`及真实PNG字节／尺寸三方核对，不接受目录前缀通配。
- 所有旧`source-deltas.json`清单和基点不改。旧日出10个破坏探针、悬疑14个破坏探针等继续执行。

## 四处旧测试适配

1. `ch2-dawn-projection.mjs`先剥离本轮准确hunk，再执行原日出逆向。原日出探针仍在日出层输入上破坏，不把本轮行号平移混入旧层。
2. `ch2-dawn-freeze.mjs`先执行最新LIVE保护，再对5个准确旧文件执行本轮逆向。旧资源哈希照旧直接读取真实文件；新6图先独立验证后，才从旧日出“只能新增2图”的历史计数中分离。
3. `ch2-colleague-stories.mjs`仍禁止覆盖旧媒体，只增加6个已被LIVE保护独立固定哈希的新图路径，没有放开整个目录。
4. `ch2-grants.mjs`保留全部原分母、遗产条目、奖励和证物可获得性断言，只新增一个有黄铜钥匙、针病例已解答、终端已留证、第一章相关回礼经历的渲染样本。原两个样本仍保留。没有把新回礼或底座证物从可获得性审计中豁免。

## LIVE奖励对照

`ch2-payoffs-rewards-freeze.mjs`将检查过的当前源码精确逆向并加载，而不是随意读取一个旧快照取代未检查源码。

- 508个旧raw节点逐项完全一致。
- 32种继承／钥匙／回礼条件，共16,256个运行时节点对照：金币、医术、人心、家业、行动力、物品、勋章、知识卡、大事记发放和原随机分支不变。
- 指向相同next的多个旧选项按出现次序分别核对，防止把无奖励选项和同目标的有奖励选项混在一起。
- 唯一大事记文案变化是封条柜描述，已逐字固定；大事记ID、触发节点及奖励不变。`old_photo`不再被新底座借用为发放标记，原档案交接标记保留；新收据独立使用`c2_payoff_*`。
- 原晨会题库、徽章／卡册数量、图鉴、书页和历次历史证物定义不变。
- AST核对`Ch2Shop`购买函数全文一致，新增背包纪念物区只读，不另造交易或结算逻辑。

## CT演出验证

新运动层没有自己的结束时钟或播放回调。位置只取现有三秒wall-clock的`frame.progress`：前0.6秒明显进床，0.6–2.16秒缓进，重建阶段停床。原画坐标位移为`(200,-40)`，没有缩放或旋转。背景／机架／固定床柱无transform；同一静止底图按孔口右缘裁剪作为前景，挡住进入孔内的头部。

已执行：

- `ch2-ct-motion-data.mjs`：双层尺寸一致、透明通道、直线位移、重建停床、相同恢复时间位置相同、无额外声音或推进计时器。
- `ch2-ct-motion-browser.mjs`：桌面和390px实际素材，逐帧检查背景矩阵固定、床板矩阵变化且缩放为1，遮挡层在床层之上；恢复直接落在中间位置、减少动态效果、素材失败退回旧静图。
- 原封不动重跑`ch2-scan-browser.mjs`：三秒不可跳过采集、1.5秒纯重建、无按键或背景点击绕过、焦点限制、真实音频HTTP哈希与解码、静音、拒播、后台恢复、完成只执行一次全部通过。
- 实际查看进床前／中／后的桌面及手机截图：床板贴合导轨，移动后露出原导轨，头部进入孔内被机架遮住，机房与床柱不动，无旧患者残影。

截图位于仓库外`../ch2-ct-motion-review/`，避免将测试缓存发布为游戏资源。

## 非浏览器回归

下列42项均保留并执行；最终整组重跑`TOTAL 42 FAILED 0`。新增审计初次发现的测试自身问题已修正：生成精确delta时误将下一文件diff头当作删除行，以及奖励测试把相同next的两个不同旧选项混在一起；修复仅在新测试层。旧发放审计补充了真实分支先决条件样本，未改游戏逻辑。

```text
ch1-approved-voices-projection.mjs
ch1-freeze-loop.mjs
ch1-freeze-pacing.mjs
ch1-voice-revision.mjs
ch2-colleague-projection.mjs
ch2-colleague-stories.mjs
ch2-continuity.mjs
ch2-covered-cr-projection.mjs
ch2-covered-cr.mjs
ch2-ct-motion-data.mjs
ch2-data.mjs
ch2-dawn-data.mjs
ch2-dawn-freeze.mjs
ch2-dawn-projection.mjs
ch2-grants.mjs
ch2-kai-selected-b.mjs
ch2-kai-soft-shi.mjs
ch2-kai-whisper.mjs
ch2-loop-ledger-gifts.mjs
ch2-loop-observations.mjs
ch2-loop-playback.mjs
ch2-loop-projection.mjs
ch2-loop-review-projection.mjs
ch2-mystery-freeze.mjs
ch2-mystery-projection.mjs
ch2-natural-voices.mjs
ch2-needles-data.mjs
ch2-pacing-projection.mjs
ch2-pacing-runtime.mjs
ch2-pacing-story.mjs
ch2-payoffs-data.mjs
ch2-payoffs-freeze.mjs
ch2-payoffs-projection.mjs
ch2-payoffs-rewards-freeze.mjs
ch2-scan-registry.mjs
ch2-story-echoes.mjs
ch2-terminal-audio.mjs
ch2-terminal-data.mjs
ch2-trauma-revision.mjs
ch2-unskippable-projection.mjs
ch2-voice-author-projection.mjs
ch2-voice-author.mjs
```

执行方式：`app/`下运行`node --import tsx tests/<文件名>`。定向ESLint及生产构建通过；构建仍有原有大包提示，不修改阈值掩盖提示。主代理另执行全仓`npm run lint`，仍原有10 errors/2 warnings，涉及App hooks、模板UI组件和store旧规则，无本轮新增。

## 正式浏览器故事与连续章节

使用隔离的headless Edge，不读写玩家profile；旧完整走查脚本及断言没有改。计数是自动实际界面走查，不冒称人工逐句通关，也不声称覆盖所有随机路径。

| 路线 | 第一章节点 | 第二章节点/推进 | CT演出/观察 | 既有赠礼 |
|---|---:|---:|---:|---:|
| 定向fixtures之后的完整第二章 | 不适用（明示注入测试档） | 412/505 | 17/12 | 8 |
| female-curious：新游戏连续第一二章 | 262 | 411/476 | 17/12 | 8 |
| male-reserved：新游戏连续第一二章 | 261 | 366/418 | 17/12 | 7 |

三轮均过五班经营、晨会五题与最终尾声，0未捕获异常；两轮连续路线均无网络失败。连续路线自然经大厅/密码进第二章，第一章各有18次探索、6次CR读片，继承旗标/数值/其他DLC不受损。原20节点日出、针线与盒子也实际经过。覆盖购物/赠礼、流水对账、扫描与观察刷新、考核刷新、通关恢复和重玩清理。

新`ch2-payoffs-browser.mjs`七组定向fixture通过：3项0AP回礼每项刷新后隐藏；两柜实际拿物件；390px有物件结尾；旧档无物件结尾；有模型无底座路线；错题本有/无两次真实扫描（原观察仍未作答）；没有领取/针线未闭合时不出现礼物。定向档是测试前提，不伪称正常新游戏。

正式报告在仓库旁：

- `../ch2-payoffs-browser-final2/results.json`及`complete-chapter/`；前两轮失败目录保留，仅为新测试等待选项淡入/通关后DOM的驱动条件错误，修正测试后完整重跑，没改游戏迁就测试。
- `../ch2-payoffs-continuous-female/female-curious-result.json`、`../ch2-payoffs-continuous-male/male-reserved-result.json`，每轮含真实过程、截图、结束存档。
- 主代理查看了CT三阶段与预览手机截图、390px握手和背包底部截图。人物双手、画面与文本均能看全，背包可滚动关闭。预览页桌面/390px实际同一组件3秒播放通过，localStorage前后逐项不变。

生产构建另在`http://127.0.0.1:8801/`执行同一7组fixtures，使用`dist/assets/index-kYtkU-Ko.js`，全部通过、`errors=[]`。扫描实际DOM检查约3228/3236ms（包含检测开销），床向右上移动且缩放为1，机房固定，无跳过；两张运动PNG实际解码，另4张剧情PNG在对应场景实际加载。6张新增PNG均HTTP200且响应SHA256与生产文件一致。生产报告在`../ch2-payoffs-production/results.json`。这是本地生产预览，不代表已发布GitHub/Pages。

复跑可在`app/`设置`PLAYWRIGHT_MODULE`为本机Playwright安装位置，然后运行：

```powershell
node --import tsx tests/ch2-payoffs-browser.mjs
node --import tsx tests/ch1-ch2-continuous.mjs
node --import tsx tests/ch2-ct-motion-browser.mjs
node --import tsx tests/ch2-scan-browser.mjs
```

新旧测试没有重现之前用户报告的Edge偶发整页卡死，本轮没有以此为名修改点击推进/对话框，不能宣称这个历史问题已被根治。
