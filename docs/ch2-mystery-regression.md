# 第二章针病例与终端支线：回归及历史测试维护

日期：2026-09-24。实施基点：`194c442`；分支：`codex/ch2-needle-mystery`。本记录对应本地预览，不表示已推送或发布。测试进程使用隔离的 headless Edge，没有读取或修改用户浏览器资料、标签页和真实存档。

## 本轮实测

| 检查 | 结果及范围 |
| --- | --- |
| 全部已有非浏览器测试 | 首轮 34 项中 25 项通过、9 项历史不兼容；精确迁移后两轮 34/34 通过。包含独立新剧情、音频、扫描、账本、送礼、回滚投影及旧剧情守卫。 |
| 新素材/预览浏览器测试 | 后加入的 `ch2-mystery-assets.mjs` 另外运行通过：7 PNG 的哈希、尺寸、像素解码/透明 alpha，73 个新节点引用，旧采集数不变；桌面及390px预览、图片载入、无存档访问/自动播放、音量及页面宽度检查通过。它包含实际 Edge 测试，因此不算进非浏览器34项。 |
| `ch2-flow.mjs`，`FULL_WALK=1` | 345 次循环、304 个剧情节点；五班、五个持久化结算页、五道晨会题、完整尾声；实际经过针病例。17 个扫描/重建入口均真实等待 3 秒/1.5 秒，12 个观察交互及原调窗通过；没有改时钟或注入跳过。 |
| 第二章原浏览器 fixture | 原对话 UI、语音拒播重试、快速连点、桌面/390px 开柜、旧书关闭/刷新、患者先于医护、腕图无额外提示、儿童复查图均通过。 |
| `ch1-night-loop.mjs` | 标题页无存档开始，253 个不同节点、五夜、五个探索菜单、18 个完成事件隐藏、五个印章；6 段原 CR 读片、4 次经营页、12 次逛店；页面异常为零。随机支线使节点数可与往轮不同。 |
| `ch1-shop-quiz-pacing.mjs` | 原八商品价格及效果、原耐用品规则、钥匙门槛、五张刮刮乐限额及刷新、购物徽章；桌面及手机横屏；五题晨会、防重复计分/奖励、章节成绩及 DLC 存档独立、旧存档默认值通过。原脚本未改。 |
| `ch1-settlement.mjs` | 五个原夜末节点在开发 StrictMode 中均仅结算一次，无空白对话卡住。原脚本未改。 |
| 独立 live freeze | 直接读 Git `194c442`，69 个共享模块/配置、31 个 App 函数、271 个既有图片/音频完全一致；三条已批准第一章声音另钉 SHA256；非法函数、全局及导入负例拒绝。只允许 `Ch2Screen` 和指定新组件导入。 |
| 音频完整性 | 新语音 1.60 秒、新提示 0.70 秒；实际解码、24kHz 单声道 128kbps、哈希/峰值/RMS/时长通过。两套自动语音模型只转写“样本已接收。”一次；不能代替人工试听，记录明确 `human_listened=false`。 |
| `ch2-mystery-browser.mjs` | 针病例三条调查与三种同事回应、完整/简短收尾及旧存档；第三夜未碰/抄编号/拔线、两种电话回应与保持断开/复线；第五夜按键/只看/经过/折返/离开、动作与声音刷新去重、静音拒播、390px弹层通过。 |
| `ch2-terminal-playback.mjs` | 原生Edge媒体播放，无play/pause替身：暂扣音频响应后离开，放行不会补播；正常playing/ended各一次，刷新不重播；静音零媒体请求，解除静音不补播。两次运行通过，无页面异常；不是人工听音验收。 |
| `ch2-mystery-assets.mjs` | 七张PNG SHA256/尺寸、患者真实透明通道、73个新增节点素材引用、原15个采集入口不变；1280px/390px预览全载入，无横溢出、存档访问或自动播放，音量与游戏一致。 |
| Scoped lint | 本代理新增及迁移的测试文件全部通过；不据此宣称全仓历史 lint 无问题。 |
| TypeScript | `npx tsc -b --pretty false` 通过。 |

原始日志与截图位于仓库旁 `../ch2-mystery-regression/`。`static-initial/` 和 `static-initial-summary.json` 保留首轮失败，`static/`、`static-summary.json` 为最终结果。`ch2-full.log` 保留第一次被旧“跳过演出”测试按钮卡住的记录，`ch2-full-final.log` 是修正测试后的完整通过。没有通过删除失败记录制造全绿结果。

新分支浏览器、原生音频及素材结果在 `../ch2-mystery-review/results.json`、`audio-race.json`、`assets-results.json`。最终记录道具采用明确“永久留针治疗”，SHA256为 `d0c8e424a118d93a53bd0fca2b5338ac977864de49604fe9eee411696291f14e`。收尾三处线路/会议文本修改后，216条终端组合、针病例42节点及TypeScript/构建再次通过；全仓lint依然10 errors/2 warnings，均为基点已有问题。

## 精确历史投影，而非刷新旧基点

新 `ch2-mystery-source-deltas.json` 仅记录两个文件的 10 个明确 hunk：App 的新导入/第二章展示，及 `ch2.ts` 的独立模块注册/渲染串联。反向投影先逐 hunk 比对当前内容，再要求整个还原文件等于 Git `194c442`。14 个 hunk 内、hunk 外篡改负例均失败。

旧 `ch2-loop-source-deltas.json`、`ch2-loop-review-source-deltas.json`、`ch2-pacing-source-deltas.json` 均未改。原基点 `05889fa`、`42d18ce`、`1452d78` 等保留。

补充 `ch2-unskippable-projection.mjs`：精确检查 App 在 `194c442` 的完整源码，仅反转移除 `onSkip` 的一行，并要求结果等于 `e8d04ef` 完整源码。这是此前已批准“不允许跳过”改动的历史接线补缺，不恢复游戏的跳过能力。

历史链先反转 mystery，再反转 no-skip（仅 App），再调用既有 loop-review、loop、pacing 等层。三个获准第一章配音使用原有 `beforeApprovedCh1Voices` 精确映射投影；不重新定义许可范围。历史模块编译的输入来自经核查的当前源码，而非直接拿旧 Git 源代替当前文件。新模块行为由 `ch2-needles-data`、`ch2-terminal-data`、`ch2-mystery-browser` 等独立 live 测试负责。

## 13 个旧测试的逐文件变更原因

| 文件 | 仅测试侧变更；原检查保留方式 |
| --- | --- |
| `app/tests/ch1-freeze-loop.mjs` | 读源码时先经过 mystery 精确 inverse，随后仍按 `05889fa` 检查原全部断言、媒体和三声音；不扩展原导入白名单。 |
| `app/tests/ch1-freeze-pacing.mjs` | 同上，保留 `1452d78`；接上既有三声音精确 inverse，解决之前批准配音后的旧范围不兼容。 |
| `app/tests/ch1-voice-revision.mjs` | 三声音发布轮“仅四文件变更”的原期望列表保留，范围固定为原始 `2d629e8 → 05889fa` 已发布补丁；额外运行独立当前 live freeze，原声音字节/解码/映射/原素材未覆盖断言仍在。不能让之后所有第二章开发都被误报为那次声音补丁越界，也不能只验旧快照而放过当前第一章回归。 |
| `app/tests/ch2-colleague-stories.mjs` | 精确增加 7 个新图片名和 2 个新音频名，逐项验证生成记录 SHA256；没有按前缀或通配符放行。原旧素材不许改写、全部历史图/逻辑/奖励断言保留。 |
| `app/tests/ch2-continuity.mjs` | 原 12 对采集/结果及 `sfx=xray` 属于完整循环补齐前的阶段；经既有精确 loop inverse 后继续执行原断言。当前 17 个演出/重建钩子由 `ch2-scan-registry`、`ch2-loop-playback` 及完整浏览器流程检查。 |
| `app/tests/ch2-flow.mjs` | FULL_WALK 仍点击已撤掉的“跳过演出”；改为断言不存在跳过按钮，并真实等自动完成，所有扫描后出图、观察、五班结算/考核/尾声检查原样保留。 |
| `app/tests/ch2-grants.mjs` | 原图遍历仍保留，另遍历真实 `ch2StepForState` 插入的入口和明确的旧病例/拔线回忆状态，避免将新动态入口误判不可达。旧和新徽章/卡/证物/大事记发放政策均原样断言，不直接把新证物视作可获得。 |
| `app/tests/ch2-kai-selected-b.mjs` | 源码检查先反转之后已批准的完整循环及三声音映射，原 B 音频精确字节、no-reference 参数、1.3 秒解码及原范围断言保留。 |
| `app/tests/ch2-kai-soft-shi.mjs` | 同样接入精确历史链；保留全部 v5 字节、原 26400 样本前缀、局部 −6dB 参数、ASR 和原共享源码检查。 |
| `app/tests/ch2-kai-whisper.mjs` | 同样接入精确历史链；保留全部 v4 来源、固定参考、参数、解码、旧音频及 A/B 预览断言。 |
| `app/tests/ch2-loop-review-projection.mjs` | 仅新增 mystery/no-skip 前置 inverse；不改其原账本、端点、负例要求。 |
| `app/tests/ch2-pacing-runtime.mjs` | App 源码守卫前先反转 mystery，不修改原去除第二章后整段相等断言；全部五班/商店/咖啡/送礼/考核/跨章存档动态检查保留。 |
| `app/tests/ch2-trauma-revision.mjs` | 原“无新增节点”限定腰椎/骨盆那一轮；只反转本轮 mystery 注册后继续检查原每个节点与五处精确许可变更。当前新节点另有独立 live 测试。 |

以上均为测试适配；本代理没有修改 App、剧情模块、共享 store/types 或任何第一章、DR、DSA 游戏文件。

## 复跑

在 `app/` 下用 `node --import tsx tests/<文件>.mjs`。本机 Playwright 模块是 `C:\Users\lvmen\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\playwright`；预览为 `http://127.0.0.1:8798/`。`ch2-flow` 设置 `FULL_WALK=1`、`EDGE_TEST=1`、`FLOW_OUTPUT`；第一章五夜设置 `WALK_OUTPUT`。所有输出目录指向仓库旁，不发布测试截图或存档。

回退应随对应剧情提交一起 revert；不单独删除投影而留下新模块接线，也不为了旧测试通过将第一章批准配音或不可跳过扫描退回。
