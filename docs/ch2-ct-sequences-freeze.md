# 第二章断层播放：历史冻结测试接入

固定基点：`61172202570b78ada9253a63c65af7137547d8e3`。没有修改任何旧 `*-source-deltas.json` 或历史基点。

## 新边界

- `app/tests/ch2-ct-sequences-projection.mjs`：只接受 `App.tsx`、`Ch2ScanOverlay.tsx`、`Ch2ScanOverlay.css`、`ch2-scans.ts` 的逐行已记录差异；逆变换后必须与固定基点完全一致。每个改动区、未改动区、额外追加均有破坏测试。
- `app/tests/ch2-ct-sequences-freeze.mjs`：先验证上述现场源代码，保护其余原有模块、配置、总线和全部旧差异账本；独立检查除了 `Ch2Screen` 外的 App 函数、原有 import、路由与全局量；`types.ts`原样，新增演出配置字段必须可选。
- 全部293个原有图片和音频用Git blob哈希逐字节比对，包含第一章已批准配音以及DR/DSA素材；没有覆盖或删除许可。
- 新文件采用两个精确源码路径、12个精确atlas路径名单，不接受文件夹通配忽略。名单只是文件边界，不代表素材医学适配度或来源审查已经通过，另由素材清单及播放器测试负责。

## 历史测试如何接入

最外层 `beforeCtSequencesSource` 接在 `beforeCaseReadingSource` 入口。`beforeRewardsRoundSource` 对不属于其旧轮次的文件也传递最外层，以免漏掉扫描组件和CSS。

case-reading/rewards/image-polish/checkin/payoffs/dawn 的旧新增文件断言仅扣除本轮**明确名单**，并先运行本轮LIVE冻结；所有原断言、哈希、旧基点和旧delta保留。旧reward的独立App AST检查使用已经通过本轮exact inverse的文本，不放宽其函数/import约束。历史colleague测试另追加同一份12个明确媒体路径，仍拒绝其他新增媒体；首轮该名单漏接导致1项失败，不能把它报告成旧基线失败。

## 记录和验证命令

在仓库根目录，四个现有生产文件的实现完成并人工审阅后：

```powershell
node scripts/record_ct_sequence_deltas.mjs --record-reviewed
node app/tests/ch2-ct-sequences-projection.mjs
node app/tests/ch2-ct-sequences-freeze.mjs
```

第一条是显式的机械记录命令，只更新**本轮**新账本，不是测试时自动接受当前代码。运行后须审阅该JSON差异，再运行projection。测试自身从不生成/放宽快照。

完整旧静态检查从`app/`运行，保留既有48项分组：

```powershell
node tests/image-polish-regression.mjs 0
node tests/image-polish-regression.mjs 1
node tests/image-polish-regression.mjs 2
node tests/ch2-case-reading-freeze.mjs
```

## 接入时实测

- 新CT projection及case-reading、rewards、image-polish、checkin、payoffs、dawn、loop-review、loop projection均通过。
- 独立逐字节核对基点293个既有媒体通过。
- 素材尚未全部入库时，LIVE冻结会在12个atlas精确名单处失败，这是预期保护，不能删掉或改宽断言。发布前必须补齐已通过来源/视觉审查的素材后重跑。
- 12个素材全部入库后已通过：115个旧源码/配置/历史账本、30个非第二章App函数、293个旧媒体；四文件66处精确差异反向恢复，70个破坏探针拒绝。
