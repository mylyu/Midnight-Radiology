# 历史开发资料 / Development archive

这里保留从早期开发包导入的中间文件，按用途收纳。它们不参与游戏构建或GitHub Pages发布，也不加入当前Kimi轻量源码包。文件仅移动，原内容和Git历史保留。

| 目录 | 内容 |
|---|---|
| [original-development/voices/candidates/](original-development/voices/candidates/) | 老周早期配音候选视频 |
| [original-development/voices/original/](original-development/voices/original/) | 旧版配音备份 |
| [original-development/voices/samples/](original-development/voices/samples/) | 原始语音/音效样张 |
| [original-development/images/](original-development/images/) | 控制室背景原图与维修版本备份 |
| [original-development/generation/](original-development/generation/) | 早期图片/语音生成脚本 |
| [original-development/tests/](original-development/tests/) | 原始开发环境的一次性Playwright脚本 |
| [original-development/logs/](original-development/logs/) | 早期测试日志 |

**不要直接运行旧脚本作为现版验收。** 它们可能依赖早期Kimi/Linux绝对路径、已经失效的素材链接、旧端口和旧剧情节点，保留用于溯源。正式游戏素材在`app/public/`，当前测试在`app/tests/`；修改从[交接记录](../HANDOFF.md)与[开发导航](../docs/README.md)开始。

配音文字底稿已整理到[docs/voices/](../docs/voices/)。原位置与新位置的逐文件映射和原Git内容标识见[归档清单](../docs/repository-tidy-moves.json)。本次不重写历史、不丢弃候选；需要恢复可按清单移动回来或revert对应提交。
