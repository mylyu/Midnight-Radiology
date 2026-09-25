# 深夜影像科 / Midnight Radiology

## ▶ [在线游玩 · Play in your browser](https://mylyu.github.io/Midnight-Radiology/)

无需下载安装，电脑和手机浏览器均可打开。进度保存在当前浏览器中，章节解锁按游戏内规则进行。

《深夜影像科》是一款面向 **BME / 医学影像工程学生**的像素风叙事教学小游戏。在夜班、患者故事、同事闲聊和悬疑探索中接触成像设备、物理原理与工程取舍。

目前可玩：第一章 **「老伙计」X光 / CR**、第二章 **「快与狠」CT**，以及 **DR白班**、**DSA导管室**两个番外。后续主线和低剂量CT DLC尚在规划中。

## 项目结构

| 位置 | 内容 |
|---|---|
| [app/](app/) | React + TypeScript + Vite游戏源码、正式素材与当前回归测试 |
| [深夜影像科/](深夜影像科/) | 全书剧情总线、设计文档和早期设计素材 |
| [docs/](docs/) | 开发导航、素材许可、修改与验证记录、配音底稿 |
| [scripts/](scripts/) | 素材处理、审核及Kimi导出工具 |
| [archive/](archive/) | 原始开发包中的试听候选、旧图备份、旧脚本和日志；不参与游戏构建 |
| [HANDOFF.md](HANDOFF.md) | 交替开发的最新交接、提交与回退说明 |

接手开发请先读 [开发文档导航](docs/README.md) 和 [全书剧情总线](深夜影像科/全书剧情总线.md)。历史资料已分类归档，**没有删除原素材或改动游戏内容**。

## 本地运行

使用 Node.js **20.19+**（与部署使用的Node 20兼容版本），或22.12+的受支持版本：

```bash
cd app
npm ci
npm run dev
```

构建生产版本：

```bash
npm run build
npm run preview
```

GitHub Pages由 [部署工作流](.github/workflows/deploy-pages.yml) 在`main`更新后自动构建。构建只使用`app/`的正式内容，不包含归档候选。

新增素材请遵循 [图片导入说明](docs/media-import.md)：展示图优先采用轻量WebP，调窗数值图保留无损；不要将旧图、试听候选或生成缓存放回`app/public`。Kimi源码交接可运行`pwsh -File scripts/export-kimi.ps1`，先加`-PlanOnly`查看打包范围。

## 许可证与商业授权

Copyright © 2026 Mengye Lyu.

除第三方依赖和另有标注的材料外，本仓库的原创代码、文案、美术与音频均以 [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-nc-sa/4.0/)（CC BY-NC-SA 4.0）发布。

你可以在署名、非商业使用并以相同许可证发布改编作品的前提下复制、分享和改编本项目。未授予商业使用许可。如需商业授权，请联系：lvmengye@gmail.com。

第三方依赖与素材分别受其自身许可证约束，详见 [NOTICE](NOTICE)。其中冠脉CT连续切片的ImageCAS素材有非商业限制，未来商用须替换或另获授权。
