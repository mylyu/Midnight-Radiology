# 日出过场：静态回归与历史测试适配

执行日期：2026-09-24。发布基点固定为 `b3de319`。本页只记录数据、源码、资产及历史回归检查；浏览器完整游玩、镜头观感和上线结果由本轮总交接另行记录，不把静态测试视作人工试玩。

## 当前源码与资源保护

- `app/tests/ch2-dawn-freeze.mjs` 直接读取当前磁盘文件及 `b3de319` Git 对象，不使用历史逆投影。
- 87 个原有模块／配置保持一致，包括原第二章经营、扫描、病例、悬疑模块；只排除本轮有精确接线记录的 `App.tsx` 和 `ch2.ts`。
- `App.tsx` 的 31 个非 `Ch2Screen` 函数、原导入及全局声明保持原样。只允许两个准确的新增导入：`Ch2DawnScene` 和 `CH2_DAWN_SHOTS`，不使用路径前缀通配。
- 280 份既有图片／音频按原 Git blob 哈希逐份校验，批准的第一章三条声音额外按独立 SHA-256 校验；声音批准记录也保持一致。
- 仅允许新增加 `ch2_dawn_window_v1.png`、`ch2_dawn_window_portrait_v1.png` 两张图片。文件名、生成清单中的哈希和测试内独立固定哈希三方核对，无音频新增。
- 新导入、全局声明、受保护函数的反向修改探针必须报错；不是“只要测试能跑完就算通过”。

## 三处旧测试适配及理由

1. **`ch2-mystery-projection.mjs`**：在旧悬疑层之前调用新增 `beforeDawnSource`。新层逐行核对本轮 6 处接线 hunk，逆变换后必须与 `b3de319` 全文件一致，再运行原悬疑层。旧悬疑层自己的 14 个区内／区外破坏探针，仍在悬疑层输入上运行，避免把日出新增行导致的行号平移误认成旧剧情修改。原 `194c442` 基点及原 delta 清单没有改变。
2. **`ch2-mystery-freeze.mjs`**：先执行独立的当前日出冻结检查，再只为旧 App 断言剥离已审核日出接线。旧媒体、旧模块和批准声音仍直接读取当前文件核对；原保护断言和反向探针保留，未扩大旧测试的可编辑函数范围。
3. **`ch2-colleague-stories.mjs`**：原测试要求所有后续资源新增逐一登记。本轮加入上述两个准确文件名，从 `docs/ch2-dawn-assets.json` 读取记录，并与独立固定 SHA-256、当前文件逐项比较。原有资源不得修改／删除的断言和其他新增白名单全部保留。

新增层为 `app/tests/ch2-dawn-projection.mjs` 与 `docs/ch2-dawn-source-deltas.json`。原有所有历史 delta 清单、基点及奖励断言不改。日出剧情本身由当前模块数据测试和独立浏览器测试验证，不能只依靠剥离新增剧情后的旧测试。

## 日出数据验证

`ch2-dawn-data.mjs` 验证 22 节点、每条路径 20 节点，男女主角 × 两组各两个选项共 8 条路径，逐句序列化保存并恢复。检查所有路径返回原结算，金币／医术／人心／家业／行动力／物品／徽章不变，原 280 金币仍由原结算节点发放。完成标记阻止重新插入，重玩只清本轮 `c2_dawn_*` 标记。

同时检查所有节点清掉前一患者和影像、镜头序列为 `arrival → wide → close → rest`、没有配音／扫描／考试或临床治疗结果杜撰。个人闲聊选项没有正确答案颜色、条件或随机惩罚。

## 实测结果

以下 37 项非浏览器脚本均以 `app/` 为工作目录、执行 `node --import tsx tests/<文件名>`，本轮全部退出码 0：

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
ch2-data.mjs
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
ch2-scan-registry.mjs
ch2-story-echoes.mjs
ch2-terminal-audio.mjs
ch2-terminal-data.mjs
ch2-trauma-revision.mjs
ch2-unskippable-projection.mjs
ch2-voice-author-projection.mjs
ch2-voice-author.mjs
ch2-dawn-data.mjs
ch2-dawn-projection.mjs
ch2-dawn-freeze.mjs
```

关键结果：针病例 42 节点／9 条周五路线／2 条周日完整路线保留；盒子 216 组合保留；扫描仍为 15 次 3 秒采集＋2 次同次数据重建；12 观察配置与原奖励保持；五班经营、八商品、送礼和考核去重静态检查通过。日出精确逆投影的 10 个破坏探针全部按预期拒绝。

本轮新增数据模块／数据测试及本页涉及的 6 个测试文件定向 ESLint 通过。全仓 lint、构建以及完整浏览器走查的最新结果请看本轮主交接，不以此页替代。
