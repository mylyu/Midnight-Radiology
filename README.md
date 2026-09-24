# 深夜影像科 / Midnight Radiology

图片交付已轻量化：正式图片通过 `app/src/lib/image-assets.catalog.json` 解析，构建不再需要原始大PNG。新增/替换素材请阅读 [图片导入说明](docs/media-import.md)，不要将旧图、录音试听或生成缓存放回 `app/public`。三张用于调窗的数值PNG不得有损压缩。优化和回退记录见 [全游戏轻量交付](docs/game-delivery-optimization.md)。

《深夜影像科》是一款以医学影像科为背景的互动叙事教学游戏。2026-09-17 更新版包含主线第一章、第二章 **「快与狠」CT 篇**，以及 **DR 白班**、**DSA 导管室**两个 DLC，并更新了角色配音与相关素材。

[在线游玩（GitHub Pages）](https://mylyu.github.io/Midnight-Radiology/)

## 项目结构

- `app/`：可构建、可运行的 React + TypeScript + Vite 游戏项目，内含两章主线与两个 DLC。
- `深夜影像科/`：游戏设计文档和原始素材。
- `语音样张/`：语音与音效样张。
- 根目录其他素材和测试文件：保留自原始开发包，供研究、参考与再创作使用。

## 本地运行

需要 Node.js 20 或更高版本。在 `app/` 目录中执行：

```bash
npm ci
npm run dev
```

构建生产版本：

```bash
npm run build
```

可通过 `#/dlc` 进入内容大厅，也可使用 `#/dlc/dr`、`#/dlc/dsa` 进入对应 DLC。第二章入口为 `#/ch2`，保留开发包中的章节口令解锁机制。

## 许可证与商业授权

Copyright © 2026 Mengye Lyu.

除第三方依赖和另有标注的材料外，本仓库的原创代码、文案、美术与音频均以 [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-nc-sa/4.0/)（CC BY-NC-SA 4.0）发布。

你可以在署名、非商业使用并以相同许可证发布改编作品的前提下复制、分享和改编本项目。未授予商业使用许可。如需商业授权，请联系：lvmengye@gmail.com。

第三方依赖分别受其自身许可证约束。
