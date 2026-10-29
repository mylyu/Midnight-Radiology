# 给 Kimi 的项目导入与交接说明

请以本包 `app/` 为唯一可运行源码，先读根目录 `AGENTS.md`、`HANDOFF.md` 顶部最新记录和 `REVISION.txt`，再按任务查 `README.md`、`深夜影像科/全书剧情总线.md` 及 `docs/validation-guide.md`。局部修改不默认反复完整通关或重跑全部历史冻结；按风险选择验证，未跑的范围如实注明。不要从旧压缩包、根目录旧稿或历史PNG恢复游戏。该包是源码交接，不是包含Git历史的仓库备份。

配音底稿位于 `docs/voices/`。仓库的旧试听、图像备份和早期临时脚本已归入 `archive/`，不放入本包；当前回归测试在 `app/tests/`，归档脚本不是当前验证入口。

## 本地启动与构建

使用 Node.js 20（20.19或以上），进入 `app/`：

```sh
cd app
npm ci
npm run dev
# 完成修改后
npm run build
```

请保留已有剧情、章节进度、存档键、奖励、调窗和已确认声音；按用户新要求最小修改，并更新交接文档。2026-09-26批次仅压缩媒体编码，没有重新配音：70条音频改为64/96 kbps，30条保留原件；采样率、声道、解码样本数、台词和表演不变。详见 `docs/media-compression-20260926.md` 与逐文件JSON，不要误按旧哈希回填大文件。

2026-09-27作者已批准把22张背景统一替换为原分辨率的有损WebP（直接从最初PNG生成，q75/effort6；含日出横竖图），不是把低清图放大，也没有新增双档智能加载。立绘、病例图、调窗数据、音频、切片及剧情交互均保留上一版。完整部署约16.48 MB，预算已调整为17,000,000字节；**不要为凑旧15 MB目标再次缩小背景，也不要恢复大PNG**。本源码ZIP另含源码和文档，体积不等于部署体积。逐图源blob、前后哈希及回退见 `docs/hd-backgrounds-20260927.json` 与同名Markdown。首页“内容大厅”按钮同样保留。

新增素材须控制体积、重新生成章节清单；预算不足时先报告，不降低调窗原始数据精度，不靠删掉检查绕过。请先确认本包版本、汇总现状，再按作者下一条具体任务开发；不要自行回退既有优化。

## 图片已经迁移，不要回填大PNG

- 游戏仍使用原来的逻辑图片ID；`app/src/lib/image-assets.catalog.json` 将ID映射到 `app/public/assets/media/` 的内容哈希文件。`image-previews.catalog.json` 是背景先显示的小预览。
- 不要根据过去的 `public/assets/<ID>.png` 路径，把已删除的大PNG批量补回来，也不要恢复 `optimized/` 缓存或旧生成清单。图片缺失时先核对catalog、相对部署路径及当前文件。
- 新增/替换图片请读 `docs/media-import.md`，在 `app/` 使用 `node scripts/import-image.mjs <仓库外原图绝对路径> <逻辑ID>`；已有ID须 `--replace`，小字证物可用 `--lossless`。原始素材单独保存在仓库外。
- `--replace` 不自动删除旧交付图。构建前审核输出的 `stalePathCandidates`，确认旧文件没有catalog及其他引用、并有Git提交或外部备份可恢复后，再将确认过期的文件移出 `public/assets/media/`、归档到仓库外；不要自动批量删除。否则prebuild会拒绝无引用旧版本（orphan），不能靠放宽检查绕过。
- `ct_head_hema.png`、`ct_lung.png`、`ct_wrist_simulated.png` 是调窗数值灰度源，严禁有损压缩、重绘替换或改变像素。CT运动床图还需保持透明通道及机架坐标尺寸。

## 验证、版本与许可

- ZIP文件名显式使用UTF-8（bit 11），不是GBK；文本使用UTF-8，少量原CSV带UTF-8 BOM。用Python标准库 `zipfile.ZipFile` 默认方式解压即可，不强制GBK、不无条件进行cp437/GBK转码；若乱码，先提供实际包名、条目文件名及flag_bits定位。
- `SHA256SUMS.txt` 覆盖包内每个文件（清单自身除外），路径采用相对路径和UTF-8。`REVISION.txt` 记录来源提交；若 WorkingTreeDirty 为 True，本包包含未提交修改，不能称为该提交的原样副本。
- `app/tests/` 中的LIVE冻结/历史投影审计需要完整Git历史。源码ZIP不含 `.git`，缺历史导致的测试失败不能用删测试、改宽断言或批量更新哈希解决；应在原仓库或完整克隆中验证。独立运行测试也要先查看各脚本的环境要求。
- `.github/workflows/` 保留现有GitHub Pages部署配置，完整测试pipeline脚本也保留。旧测试输出JSON和进程日志不是测试源码，不放入本包。仅安装Node依赖并运行正常构建不需要Git历史。
- 新素材须另记来源、作者/许可、生成参数、哈希和人工验收。不要篡改已经批准的历史认证manifest来自动接纳变化。
- 冠脉连续切片使用 ImageCAS 的非商业许可素材；**未来商业化前必须替换或另获商业授权**。详见 `NOTICE`、`docs/ch2-ct-sequences.md` 及 `app/public/ct-sequences-sources.txt`。本包不包含原始医学体数据。
- 项目许可见 `LICENSE` / `NOTICE`（CC BY-NC-SA 4.0，版权人 Mengye Lyu）；第三方权利仍分别适用。

本包刻意不含依赖目录、构建目录、Git历史、内部试听/开发HTML、原始大图与历史配音备份、个人环境文件或进程日志。它们没有因为打包而从原仓库删除。更详细的逐轮修改、已知问题与回退说明以 `HANDOFF.md` 为准。
