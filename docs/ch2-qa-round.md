# 第二章 QA 修正轮记录 · 2026-09-20

基点 `02252cf`（`codex/ch2-minimal-fixes` 末次提交）；本轮分支 `codex/ch2-qa-fixes`（从基点新建）；仅本地提交，未推送、未部署；不合并 `codex/ch2-rework`。用户裁定：按审查建议全项实施。

范围：走查测试回归修复、收集口径修正、冠脉CTA病例口径（方案A）、AI图注统一、文档同步、总线差异清单；未改第一章、DR/DSA、总线文档、商店/抽卡/音效/存档结构，未操作任何浏览器存档。

## 1. 修复 FULL_WALK 全章走查测试（回归）

- 文件：`app/tests/ch2-flow.mjs`
- 原因：`02252cf` 恢复原对话界面（撤销「显示全文/继续」按钮）时未同步该脚本：FULL_WALK 分支仍在点击已被移除的按钮，必然 30s 超时失败。游戏本体点按推进功能正常（其余测试均通过），问题仅是测试陈旧；「225 节点」结论出自旧界面时期，此后未在 HEAD 上复验。
- 改动：普通对话分支改为「等待▼出现 → 点击对话框推进」；选项/任务/结算分支各自先点一次补齐文字（不跳步）。
- 验证：`FULL_WALK=1` 重跑 —— `PASS: continuous five-shift walk, nodes: 225`，恢复与旧记录一致的节点数。

## 2. 收集口径修正（旧版停颁条目不计入分母）

- 文件：`app/src/game/ch2.ts`（新增 `CH2_BADGES_LEGACY` / `CH2_CARDS_LEGACY` / `CH2_ACTIVE_BADGES` / `CH2_ACTIVE_CARDS`）、`app/src/App.tsx`（勋章墙 `BadgeScreen` 与章节完成页）
- 原因：第四班病例替换后，3 枚徽章（零遗漏/过敏处置专家/期相之眼）与 4 张卡片（对比剂系列）不再发放，但分母仍按 15/22 计（全收集只能到 12/15、18/22），玩家会误以为永远集不满。
- 改动：
  - 勋章墙：分母改为可获得 12；网格只列可收集项；已获得的旧版徽章单列一行「历史收藏（旧版停颁，不计入分母）」。
  - 完成页：按卡片 18、勋章 12 统计；持有旧版条目时显示一行口径说明（已保留旧版卡片 X 张、徽章 Y 枚）。
  - 定义与老存档已获记录全部保留；`ManualOverlay` 无需改动（按已获得显示，旧卡仍可回看）。
- 新增测试：
  - `app/tests/ch2-grants.mjs`：静态审计——12 枚徽章/18 张卡片全部可发放；旧版清单与定义一致；证物 flag 与大事记触发完整。
  - `app/tests/ch2-collection.mjs`：浏览器断言——勋章墙 `1/12` + 历史行；完成页 `1/18 · 1/12`（无旧版持有、无说明行）；完成页 `0/18 · 0/12` + 停颁说明。

## 3. 冠脉CTA病例口径（方案A）

- 文件：`app/src/game/ch2.ts`（`c2n3_h0` / `c2n3_h1` / `c2n3_h3a` 三句）
- 原因：原文「肌钙蛋白阳性——急性冠脉综合征，危险分层中高危」却以「先CTA」为最佳答案，与卡片 `cta_vs_dsa`（「CTA 是中低危胸痛的地图；STEMI 等高危直接导管室」）及指南分层路径不一致。
- 改动（选项、奖励、分支、节点ID 均未动）：
  - `h0`：「心电图：下壁导联ST段压低。」→「心电图：非特异性ST-T改变，没有动态演变。」
  - `h1`：「肌钙蛋白阳性——急性冠脉综合征，危险分层中高危。」→「肌钙蛋白复查阴性——急性冠脉综合征暂时定不下来，心内按中低危处理。」
  - `h3a`：「ST段是压低不是抬高——」→「化验和心电图都不支持高危——」
- 依据：2021 AHA/ACC 胸痛指南（https://www.ahajournals.org/doi/10.1161/CIR.0000000000001029 ，中危、无既往CAD、ACS评估未定论者 CCTA 有用）；2023 ESC ACS 指南（https://www.escardio.org/guidelines/clinical-practice-guidelines/all-esc-practice-guidelines/acute-coronary-syndromes-acs-guidelines ，NSTE-ACS 伴肌钙蛋白升高/动态ST改变属高危分层→尽早有创）。本游戏不是诊疗指南。
- 验证：`ch2-data` 新增断言（新表述在、旧表述不在）通过。

## 4. AI图注统一

- 文件：`app/src/game/ch2.ts`（`CH2_IMAGE_CAPTIONS` 清空）、`app/tests/ch2-visuals.mjs`
- 原因：腕部图此前已按用户要求去掉重复的「AI生成」图注；夹层（剧情内4处）、金属（7处）、水体模（4处）仍每次显示，口径不一。
- 改动：剧情内不再显示；生成来源、提示词与哈希仍保留在 `docs/ch2-visual-generation.json`、`docs/ch2-visual-refresh.md`。
- 验证：`ch2-visuals` 新增「图注已退役」断言——三张图节点页面均不含「AI生成/教学模拟/非患者CT」字样，通过。

## 5. 文档同步

- `docs/ch2-dialogue-polish.md`：第 5 条（「显示全文/继续」按钮）注记已于 `02252cf` 撤回；第 4 条点击补齐文字的修复保留。
- `docs/ch2-visual-refresh.md`：图注处注明已于本轮统一移除。
- `app/src/game/ch2.ts` 题库注释 23→24；`app/src/App.tsx`「CT题库20抽5」→「24抽5」。

## 6. 总线差异清单

- 新增 `docs/ch2-bus-divergence.md`：逐条登记总线 v3.2 与现行第二章的差异（12 项），只列不改。处理范围待裁定。

## 验证汇总（2026-09-20 实测）

| 项目 | 命令 | 结果 |
| --- | --- | --- |
| 类型检查+构建 | `npm run build` | 通过（既有包体警告保留） |
| Lint | `npm run lint` | 10 errors / 2 warnings，与基线一致、未新增 |
| 数据回归 | `node tests/ch2-data.mjs` | PASS：87/320 文本精修；节点/奖励/分支/任务参数全保留；无断链 |
| 发放审计 | `node tests/ch2-grants.mjs` | PASS：12/15 徽章、18/22 卡片可发放；旧版清单/证物/大事记一致 |
| 视觉 | `node tests/ch2-visuals.mjs` | PASS：21 立绘、五档旧书、图注退役、无页面错误 |
| 交互 | `node tests/ch2-flow.mjs` | PASS：连点、开柜、刷新续玩、原界面 |
| 全章走查 | `FULL_WALK=1 node tests/ch2-flow.mjs` | PASS：连续五班 225 节点 |
| 收集页 | `node tests/ch2-collection.mjs` | PASS：1/12、1/18、0/12+停颁说明 |

测试环境：本机 Node 22 + 系统 Chrome + 本机 playwright（`PLAYWRIGHT_MODULE` 指向），隔离浏览器上下文；预览服务 `http://localhost:8798/`。
边界：不是全分支验收、不是逐条音频回听、不是用户审美验收；未动第一章、DLC、总线文档；未操作用户浏览器存档。

## 回退

- 整体：`git revert <本轮提交>`；或从 `02252cf` 新建对照分支（如 `codex/ch2-before-qa`）。
- 单文件：本文档所列文件均可独立 revert；两个新测试文件（`ch2-grants.mjs`、`ch2-collection.mjs`）可直接删除。
- 不要 hard reset；Git 回退不恢复浏览器存档。
