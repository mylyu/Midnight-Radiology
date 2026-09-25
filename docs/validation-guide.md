# 按风险验证，而不是每轮重玩

本指南执行根目录 [AGENTS.md](../AGENTS.md) 的验证规则。它替代旧任务记录里未经区分地沿用“完整两轮＋整条历史冻结”的习惯，不取消作者当前明确要求的验收。

## 为什么要改

第一、二章返工说明：代码可运行不代表对白自然、图文匹配或玩法完整。反复跑一条“最佳选项”路线也不一定发现真实问题。最近一次第五夜立绘局部修复，除了定点验证还跑了大量全章解析组合和多层历史冻结；这些证据有留存价值，但**不应成为下一次小修的模板**。

更有效的顺序：**找到实际问题→最小修改→复现路径证明修好→一个相邻负例证明没误伤→停止**。没有共享机制风险，不从第一章重新熬到第五夜。

## 开跑前写三行

1. 改了哪些可执行行为/资源？哪些没改？
2. 最可能坏在哪里？用哪几个测试能证伪？
3. 风险等级、预计验证分钟数、什么时候停止？

R0文档通常1–3分钟；R1定点5–10分钟；R2功能10–20分钟；R3预先说明，通常先按20–30分钟安排。实际时间受设备和已有工具影响，**不是保证或强行截断失败测试**。超出时明确瓶颈与未证实项，不自动扩展成多轮试玩。

## 选测试，而不是复制全套命令

下列入口在2026-09-25核对；在 `app/` 执行。只选与改动相关的行，**这不是每轮必跑清单**。新增章节添加同类定点测试，不抄出另一套巨型冻结链。

| 变更 | 优先入口/检查 |
|---|---|
| 文档、开发规则 | `git diff --check`、本地相对链接；导出规则变动另做PlanOnly |
| 节点/奖励定义 | 对应 `tests/ch2-*-data.mjs`；发放变化选 `tests/ch2-grants.mjs`，先读其依赖/覆盖范围 |
| 选择防误触 | `node --import tsx tests/choice-input.mjs`；浏览器选 `tests/choice-input-browser.mjs` |
| 消费/属性/存档原子性 | `node --import tsx tests/detail-transactions.mjs`；再定点验证变更UI及刷新 |
| 人物退场 | `node --import tsx tests/ch2-portrait-staging.mjs`；需要实际呈现才跑 `tests/ch2-portrait-staging-browser.mjs`，无需递归全部projection |
| 章节预载 | `tests/chapter-loading-browser.mjs`，支持 `CHAPTER_LOADING_FILTER` 正则筛选；共用加载重写再跑全组 |
| 资源登记/加载服务 | `node --import tsx tests/chapter-asset-manifest.mjs` / `node --import tsx tests/chapter-assets-service.mjs`，按修改模块选择 |
| 单章主循环 | `tests/ch2-flow.mjs`；`FULL_WALK=1`才追加完整第二章路线 |
| 跨章保存/入口 | `tests/ch1-ch2-continuous.mjs`，显式选择一条 `CHAIN_VARIANT`，必要时另一条补差异 |

- 运行时 TS/TSX 有变化一般最终 `npm run build` **一次**（已包含 `tsc -b`），不再单独反复类型检查。开发中可先定向检查；纯文档不构建。`prebuild`会生成图片/媒体清单，构建后看git diff，不要把它当完全只读。发布流水线自身的构建不是要求在本地又跑一遍的理由；当前没有统一的 `npm test` 命令。
- ESLint优先新改文件；共用配置/规则变化再全仓跑。遗留数量可能变化，按最近可信基线核对；不要永久硬编码“10e/2w所以都无关”。
- 历史 `*-projection.mjs` 常引用更老保护层；执行前看导入与副作用。批准的新文案使旧逐字断言失效，就记录这条精确差异；不做无关的全历史账本迁移，不在根文件对所有新版代码递归反演。

## 浏览器与环境

- 使用独立浏览器context/临时测试档，不能连接作者正在玩的Edge然后改localStorage，也不能把个人资料加入提交。测试构造了存档，应在报告中叫“定点场景”，不能叫“从开局玩到这里”。
- 确认预览端口真的服务本次生产构建。`GAME_URL`可覆盖默认8798；Pages子目录部署要保留路径和尾斜杠。不并行覆盖同一个dist，不为每个小测试启动一套服务。
- 脚本需要Playwright；未安装为本项目依赖时，用现有环境实际可用的 `PLAYWRIGHT_MODULE`，不要把开发机路径当所有人的路径。不为读文档装浏览器或重新下载依赖。
- `choice-input-browser.mjs`、`chapter-loading-browser.mjs`、`ch1-ch2-continuous.mjs`当前使用Edge；`ch2-flow.mjs`可用 `EDGE_TEST=1` 或 `CHROME_PATH`。没有对应浏览器须说明环境限制，不报告通过。
- `ch2-flow.mjs`使用模拟的 `HTMLMediaElement.play()`；它证明流程/调用而非声音真的可听。涉及声音播放/音质要另外选最小真实音频检查。
- 脚本输出放仓库外测试目录；复用报告时记录代码/资源版本、脚本、参数、日期和是否mock，不只留下“PASS”。

只有确实需要一次跨章回归时，类似：

```powershell
# 在 app/；PLAYWRIGHT_MODULE 由当前环境按实际路径配置。
# 先清除上一轮遗留筛选，避免以为全跑其实只测了一部分。
$env:GAME_URL = 'http://127.0.0.1:8798/'
$env:CHAIN_VARIANT = 'female-curious'
Remove-Item Env:CHAIN_CH2_ONLY, Env:CHAIN_ALL_BADGES -ErrorAction SilentlyContinue
try {
    node --import tsx tests/ch1-ch2-continuous.mjs
    if ($LASTEXITCODE -ne 0) { throw '连续流程失败：先定位，不以盲目重跑替代修复。' }
} finally {
    Remove-Item Env:CHAIN_VARIANT -ErrorAction SilentlyContinue
}
```

`CHAIN_VARIANT`可选 `female-curious` / `male-reserved`，**不设会跑两条**。`CHAIN_CH2_ONLY=1`不是两章连玩，`CHAIN_ALL_BADGES=1`是特定收集路线，`FULL_WALK=1`只对ch2-flow有效；每次报告实际参数，不混用。环境变量任务后清理或使用专门测试终端。

## 哪些要保留，哪些不要重复

- 输入改动必须覆盖持续连点、停手可选、跨出现时刻手势、键盘repeat；不只测普通点击。
- 奖励/商店改动必须覆盖同动作两次、刷新、旧存档；加载改动覆盖未就绪不能进、失败重试/取消、完整后离线。测相应高风险失败路径，而不是十遍正常通关。
- 新/换图看实际部位、人物、透明边缘与手机布局；扫描动画看运动和出图顺序。只需本次受影响画面，不重新画/复查所有旧图。
- 单章剧情局部改动用相关前后节点＋无旗标/有旗标差异；全章整合才跑一次全流程。第一章内容未动、共享逻辑未动，用范围diff确认，不强迫第一章再次完整五夜。
- 同构分支选代表值＋边界，独立维度不做全排列；例如同一个退场规则无需每个节点乘上所有人物、礼物和历史状态。若怀疑维度间相互影响，明确哪两个再组合测试。
- 每项失败先保留第一次证据：是产品bug、旧测试预期、环境还是不稳定测试？修了相关原因才重跑失败项；因更改触及共用逻辑，再扩大范围。
- 人工判断重内容：用户说“难听/不像像素/台词别扭”，不要拿更多自动化证明他感觉错。用户说“错误出场”，先找到那一幕和其上下文，不先改全引擎。
- 达到本轮验收＋无新增相关问题就停止。只有明确的新证据/未覆盖风险才能增加下一轮。局部完成不承诺“全游戏无bug”。

## 最短交接格式

> 基点/分支/提交；改动和不改项；R级与选择理由；实际运行的测试/人工检查、约耗时及覆盖限制；遗留问题；本地/线上状态；回退方式。

不要求每轮新建庞大JSON审计。已有素材许可/批准哈希证据保留，新素材仍记录来源与生成参数；验证效率不能成为伪造验收、降低正确性或覆盖历史的理由。
