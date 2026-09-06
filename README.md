# 深夜影像科 / Midnight Radiology

《深夜影像科》是一款以医学影像科为背景的互动叙事教学游戏。当前版本包含主线第一章，以及新增的 **DR 白班**、**DSA 导管室**两个 DLC。

## 项目结构

- `app/`：可构建、可运行的 React + TypeScript + Vite 游戏项目，内含主线与两个 DLC。
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

开发版可通过 `#/dlc` 进入 DLC 大厅，也可使用 `#/dlc/dr`、`#/dlc/dsa` 直达对应篇章。

## 许可证与商业授权

Copyright © 2026 Mengye Lyu.

除第三方依赖和另有标注的材料外，本仓库的原创代码、文案、美术与音频均以 [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-nc-sa/4.0/)（CC BY-NC-SA 4.0）发布。

你可以在署名、非商业使用并以相同许可证发布改编作品的前提下复制、分享和改编本项目。未授予商业使用许可。如需商业授权，请联系：lvmengye@gmail.com。

第三方依赖分别受其自身许可证约束。
