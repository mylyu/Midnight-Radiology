# 日出场景与跨章回归 · 2026-09-24

基点 `b3de319`，场景提交 `aa516e8`，分支 `codex/ch2-dawn-interlude`。本页区分完整浏览器游玩、定位用存档测试和人工视觉核对，不能互相冒充。

## 完整第二章：两条独立路线

`ch2-repeat-walk.mjs` 使用一次性 Edge 配置、第二章入口测试存档，保留带有第一章及DR/DSA标记的状态用于前后保护比较。两次均走完五班、五题晨会、全部尾声，再操作真实重玩入口。

| 路线 | 剧情节点 / 推进轮次 | 采集及重建 / 观察 | 赠礼 | 晨会 |
| --- | --- | --- | --- | --- |
| 桌面男主，盒子保持断开 | 404 / 497 | 17 / 12 | 8 | 五题，S |
| 390px女主，盒子曾接回 | 404 / 500 | 17 / 12 | 9 | 五题，A |

覆盖两组日出选项、盒子电话和回执、十五根针闭合、原夜宵与新增赠礼共存。扫描、观察、赠礼、电话、考核、经营页刷新以及重玩均验证去重和恢复；两条路线 `pageErrors=[]`。此组主动拒播音频以检查不依赖音频解锁，不用于证明音色或完整声音播放。

完整输出：仓库旁 `ch2-sunrise-qa/repeat-final/results.json` 及 `offline/`、`reconnected/`。较早没有日出场景的基线走查不计入本轮次数。

## 从标题开新档：第一章连续进入第二章

`ch1-ch2-continuous.mjs` 使用两种性别和固定随机序列，从空的浏览器状态点击开始游戏；同一个浏览器与同一份自然生成的存档走第一章五夜、晨会、尾声，返回内容大厅并正常输入章节口令进入第二章。不注入存档、解锁标记，不跳过CR/CT演出，不改短扫描计时，不mock音频。

第一条最终完成路线 `female-curious`：第一章262节点、18次探索、6次CR、五题S；第二章399节点/462次推进、17次演出、12次观察、8次赠礼、159笔流水、五题S及全部尾声。日出完整20节点，五个经营页与完成页刷新不重复结算，UI重玩清除本轮旗标。两章全程0未捕获异常、0 HTTP错误响应。

第二条最终完成路线 `male-reserved`：第一章261节点、18次探索、6次CR、五题S；第二章354节点/404次推进、17次演出、12次观察、7次赠礼、135笔流水、五题S及全部尾声。日出20节点走另一组选项；同样通过中途刷新、五班结算恢复与通关后重玩。两章全程0未捕获异常、0 HTTP错误响应。

最终记录位于仓库旁 `ch1-ch2-continuous-final-female/` 和 `ch1-ch2-continuous-final-male2/`；旧 `ch1-ch2-continuous-final-male/` 是早前失败记录，不作为最终报告。开发测试脚本时修正了旧存档空DLC规范化的比较方式、以及脚本未识别原节点动态插入送礼选项的问题；这些是测试驱动器问题，不把它们称为游戏卡死，也没有改游戏来迎合脚本。

本轮最终完成总数：**第二章单独两轮＋第一章到第二章连续两轮＝第二章四轮；第一章完整两轮**。属于实际浏览器自动操作，不是人工逐字通读，不覆盖所有分支排列。

## 镜头、布局与特殊状态

`ch2-dawn-browser.mjs` 是有明确注入定位存档的定向测试：桌面1280×900、手机390×844完整20节点路径，667×375横屏选项可见可点击；真实CSS矩阵验证拉远和推近，不只检查元素存在。验证横竖构图选择、旧患者/CT清空、两组选项、原手册打开关闭、对话中刷新、原280金币只发一次、缺图降级、减少动态效果和拒播时继续推进。

开发服务器两轮通过；最终生产构建在 `http://127.0.0.1:8801/` 又完整通过。人工查看桌面、390px竖屏和横屏截图，核对小唐/太阳/文字与选项布局。横屏沿原对话区滚动规则显示长文本，未改第一章或共享对话框。截图与报告在仓库旁 `ch2-dawn-review/`、`ch2-dawn-production-review/`。

## 原系统保护与构建

- 37项非浏览器回归通过，名单及旧测试的三处精确适配理由见 `ch2-dawn-static-regression.md`。不移动历史基点，不删旧断言。
- 实时冻结对比：87个原模块/配置、31个原App函数、280份旧媒体和三条批准第一章声音不变。新增资源仅两张指定图片，文件和SHA256都固定。
- 第一章八种商品、限购、刷新、五题考核及奖励去重另由 `ch1-shop-quiz-pacing.mjs` 本轮重跑通过。
- `npm run build`（含TypeScript）通过；本轮新/修改模块和测试定向ESLint通过。全仓lint仍旧有 **10 errors / 2 warnings**，不是全绿；原大于500kB包体提示仍在。
- 没有在完整游玩中发现需要修改原游戏逻辑的新故障；不以“测试通过”宣称覆盖所有浏览器或所有路线。旧Edge间歇性卡死未能在这些隔离配置中复现，不能宣称已解决。

## 复跑命令

先启动本地开发或生产预览服务，然后在 `app/` 执行。Playwright可指向当前环境可用的安装；本机使用如下路径：

```powershell
$env:PLAYWRIGHT_MODULE='C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
$env:GAME_URL='http://127.0.0.1:8798/'
$env:EXPECT_SUNRISE='1'
node --import tsx tests/ch2-repeat-walk.mjs
# 不设置CHAIN_VARIANT时，顺序跑female-curious和male-reserved两条新档路线。
node --import tsx tests/ch1-ch2-continuous.mjs
node --import tsx tests/ch1-shop-quiz-pacing.mjs
node --import tsx tests/ch2-dawn-browser.mjs
node --import tsx tests/ch2-dawn-data.mjs
node tests/ch2-dawn-freeze.mjs
node tests/ch2-dawn-projection.mjs
npm run build
```

新图完整生成提示词、参考文件与哈希见 `ch2-dawn-assets.json`；剧情和接口边界见 `ch2-dawn-interlude.md`。自动浏览器测试不等于人工逐句试玩或听感审核，本轮没有重新生成声音。
