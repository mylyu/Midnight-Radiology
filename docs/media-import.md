# 后续图片导入：给 Kimi 与协作开发者

游戏用稳定的**逻辑ID**引用图片，实际文件由 `app/src/lib/image-assets.catalog.json` 映射到带内容哈希的交付文件。不要把大原图直接丢进 `app/public/`，也不要手改历史认证记录来让测试变绿。

## 使用

先把原图保存在仓库之外，保留来源、许可、生成提示词或编辑依据。安装 `app/` 的项目依赖后，在 `app/` 运行：

```powershell
node scripts/import-image.mjs "C:/素材工作区/新场景.png" bg_new_scene
node scripts/import-image.mjs "C:/素材工作区/重画老周.png" ch2_pixel_char_zhou --replace
node scripts/import-image.mjs "C:/素材工作区/新证物记录.png" ev_new_record --lossless
node scripts/import-image.mjs "C:/素材工作区/已审核压缩图.webp" bg_new_scene --replace --keep-webp
```

替换已存在ID必须带 `--replace`；错拼的新ID不会被当成替换。逻辑ID使用小写字母开头的字母、数字、下划线，最长96字符。用 `--help` 查看帮助。不要让两个任务同时编辑图片catalog。

## 工具做什么

- 默认 WebP `quality=78, alphaQuality=100, effort=6`，保留画布尺寸，不裁剪、不旋转、不缩小。超过 **600 KiB（614400字节）** 时依次试 q72、q66、q60；仍超限则报错。
- `--lossless` 适合小字、证物记录。使用无损WebP，验证可见RGB不变；超限直接拒绝，不偷偷改成有损。完全透明像素下看不见的RGB不保证保留，但透明度逐像素必须相同。
- `--keep-webp` 原样导入已在外部压缩并审核的静态WebP，避免二次有损编码；不能与 `--lossless` 同用，仍检查尺寸、alpha、600 KiB上限、保护ID和哈希。审核应比较压缩前原图，不是仅比较这个工具的输入与输出。
- 解码比较输入/输出的尺寸及全部alpha值，不符合即拒绝。带EXIF旋转标记、动画或多页原图会拒绝，须先在外部明确整理。
- 文件保存为 `app/public/assets/media/<逻辑ID>.<内容SHA256前16位>.webp`，更新受版本控制的 `image-assets.catalog.json`。同名内容不覆盖不同文件。
- ID包含 `bg_` 或 `ch2_dawn_window`，或原本已有预览条目时，同步更新 `image-previews.catalog.json`：48像素宽的内嵌WebP预览。全尺寸图片本身不缩放。
- 原图留在外部，旧交付文件也不删除。输出JSON列出旧路径是否已无catalog引用；这只是清理候选，还需核对其他引用、旧页面缓存和历史审计。
- 使用导入锁、临时文件和逐文件原子替换，检测导入期间catalog是否被别的任务修改。意外断电不能保证两个文件作为一个事务提交；出现残留锁时先确认没有导入进程，并检查两个catalog，不要直接覆盖他人工作。

**禁止导入的三个ID：** `ct_head_hema`、`ct_lung`、`ct_wrist_simulated`。它们是调窗计算读取的数值灰度源，不是普通插图；即使带 `--lossless` 也拒绝覆盖。要更换这类数据，需要单独设计、核验灰度映射和调窗回归。

CT扫描运动的床图和机架图仍依赖固定坐标。替换 `ch2_ct_motion_bed_v1` 或 `ch2_ct_motion_room_v1` 时还会核对新旧画布尺寸；alpha相同只证明编码没有破坏输入透明度，不代表新画的床与机架已经对齐，仍须实际看动画。

## 导入后的交接与验收

1. 把终端输出的JSON另存为**本次新增的**开发记录，并补充作者、来源/许可、提示词、替换原因、适用节点与验收结果。原图的本机绝对路径不是可公开下载地址，不应误当作素材来源链接；公开记录可写相对档案名并保留哈希。
2. 工具**不会修改** `docs/game-delivery-assets.json`。该文件当前结构为 `baseline / pipeline / encoder / images / removed / stats`，图像条目记录源文件及交付文件哈希、尺寸和编码参数，是已批准批次的证据，不是自动接受新图的许可。不要覆盖旧条目或重写历史基点。
3. 对新图片/替换建立新的、精确到文件与哈希的批准差异记录；来源和画面人工复核后，才适配相应LIVE历史保护。审计失败时先查具体变化，不许放宽断言、全目录放行或机械更新所有期望值。
4. 使用 `--replace` 后，先审核输出的 `stalePathCandidates`：确认旧文件已无catalog及其他引用，且有Git提交或外部备份可恢复，再将确认过期的交付文件移出 `app/public/assets/media/`，归档到仓库外。不要直接按候选名单自动删除。导入器刻意保留旧文件，但prebuild会拒绝无引用的旧版本（orphan）；未完成这一步时构建失败是保护行为，不应放宽检查。
5. 在 `app/` 运行 `npm run build`，并跑受影响的静态、浏览器测试。检查桌面/手机、背景预览、透明边缘、小字、CT观察范围和其他章节是否受影响。新增素材不会自动出现在剧情中，节点配置是另一项显式修改。
6. 提交新交付图、变更的catalog、新的审核记录和必要的配置/测试；不要提交外部原图或批量删旧文件。先本地验收，再按用户授权发布。历史测试需要完整Git历史，Kimi源码ZIP不能凭缺少历史而宣称保护已通过。

本工具不推送、不部署，不购买素材，不修改音频，也不自动更新游戏剧情或数值。

## 当前交付预算

2026-09-26压缩批次见 [完整记录](media-compression-20260926.md)。完整 `app/dist/` 为14.934 MB；`npm run build` 的postbuild检查全部文件合计必须小于15,000,000字节（不是ZIP大小）。新增章节确需提高预算时须明确说明并获作者同意，不能删素材、降低调窗精度或移除检查来凑数。

本批次辅助脚本 `prepare-small-media` / `refine-small-media` / `prepare-small-audio` 只生成仓库外候选；`review-small-media` 生成前后对照，人工审核后才可运行 `install-small-media --apply-reviewed --with-audio`。不要把它们作为每次构建步骤，也不要对现有有损文件反复压缩。安装器核对批准报告哈希、清理经逐项审核的旧路径并外部备份；普通图片导入仍不自动清理。
