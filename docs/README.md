# 开发文档导航

[在线游玩](https://mylyu.github.io/Midnight-Radiology/) · [项目首页](../README.md)

## 接手开发先读

1. [AGENTS：开发原则、体验继承与验证分级](../AGENTS.md)
2. [HANDOFF：最近修改、验证与回退](../HANDOFF.md)（先看最新段落，不每轮通读历史）
3. [全书剧情总线 v3.3：现版事实与后续规划](../深夜影像科/全书剧情总线.md)（剧情任务按需阅读，新章策划通读）
4. [按风险验证：最小检查集、工具与停止条件](validation-guide.md)（选择相关测试，不全部执行）
5. [图片导入与体积约束](media-import.md)、[第三方许可与商业化注意事项](../NOTICE)（素材任务）

`app/`是唯一可构建游戏项目，`app/tests/`是当前测试目录。设计旧稿和`archive/`候选不能覆盖已批准的运行版本；需要Git历史的冻结测试应在完整克隆中执行。

## 常用记录

- [2026-09-26：完整部署压至15 MB以内](media-compression-20260926.md)
- [第二章第五夜小雷立绘退场修复](ch2-portrait-exits.md)
- [当前分章节加载与两章防连击保护](chapter-preload-input-guard.md)
- [图片交付与加载优化](game-delivery-optimization.md)
- [CT连续切片来源、许可与模拟方法](ch2-ct-sequences.md)
- [第一、二章数值和防误触](ch2-detail-polish.md)
- [近期CTA、人物与重建对白修订](ch2-cta-characters.md)
- [第二章姓名学号及通关凭证](ch2-certificate.md)
- [剧情总线v3.3与发布核验](story-bus-v3-3-release.md)
- [仓库整理说明与原路径清单](repository-tidy.md)
- [配音台词底稿](voices/配音台词底稿.md) · [CSV版](voices/配音台词底稿.csv)

本目录的其余逐轮Markdown、JSON、图片及审核记录用于追溯，保留原文件名与路径，避免破坏历史验证。`*review.json`、`*source-deltas.json`等不是可随意重写的缓存；修改验证基点不能代替修复回归。

## 导出与协作

在仓库根目录运行`pwsh -File scripts/export-kimi.ps1 -PlanOnly`检查范围，去掉`-PlanOnly`生成源码交接包。包包含当前源码、正式素材、必要文档和配音底稿，不含Git历史、依赖、构建输出或归档试听。每轮更改都记录分支、提交、原因、测试和回退方式。
