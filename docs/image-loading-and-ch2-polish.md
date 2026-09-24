# 图片加载、肺结节对照与日出过渡 · 2026-09-24

基点 `ea9d6c5`；分支 `codex/image-loading-and-ch2-polish`。本轮仅本地，未推送、未部署。原线上版本仍为 `ea9d6c5`。

## 范围与原因

作者报告 GitHub Pages 背景黑屏后，同意优化图片加载与压缩，同时要求肺结节薄层重建有可辨认的变化、日出衔接自然。本轮没有改第一章/DR/DSA剧情、选项、奖励、购买、考核、存档或已确认声音。共用的**图片交付与背景显示**属于本轮明确允许的变更；不能把它误写成“第一章所有源码完全未动”。288份既有PNG/音频原文件字节仍完全一致。

原入口会同时预取60张PNG，约74.6 MiB，当前场景与尚未出现的人物争抢连接。线上场景文件能返回200，但一次背景传输曾长时间停滞并断开；旧背景组件没有加载/失败反馈。不能据此保证所有用户网络问题都能被客户端消除。本轮取消批量预取、减小实际请求、增加有界重试。

## 图片交付

- `app/scripts/prepare-images.mjs`：固定 `sharp@0.35.3`，随 `predev`、`prebuild` 运行。GitHub Actions 原有 `npm ci --include=dev` → `npm run build` 自动包含这一步，不需要修改工作流。使用兼容现有Vite的较新Node20（20.19+）或更高版本。
- 193张PNG（含本轮新厚层图），188张生成更小的交付文件。按每个素材实际选用的一份文件统计：**216.7 → 145.0 MiB，减少33.1%**。这是素材总量对比，不是一次打开页面必须下载的数量，也不是含备用原PNG的部署目录大小。
- 22张场景背景：**47.3 → 4.0 MiB，减少91.5%**；同尺寸WebP `quality=85, effort=6`，不缩画布、不重画人物。已目视检查CT控制室、白班场景和日出细节。
- 其余素材只无损压缩：81张WebP与85张PNG逐像素RGBA核对一致。WebP若改变透明像素下的RGB，则改用无损PNG；压完更大的继续用原图。
- `ct_head_hema`、`ct_lung`、`ct_wrist_simulated`三张调窗灰度输入完全不转换。医学影像与人物不进入有损背景压缩名单。
- 输出名包含源文件/流水线/编码器版本派生的哈希。`image-assets.ts`结合Vite `BASE_URL`解析路径，支持 `/Midnight-Radiology/`。保留原PNG作为原始素材和背景最后一次备用请求。
- `public/assets/optimized/`、`src/lib/image-assets.generated.json`、`image-delivery-report.json`是可重建的忽略文件，不提交。新克隆先 `npm ci`，再 `npm run build`/`npm run dev`；若只运行类型检查或测试，先 `npm run images:prepare`。
- 最后反向审查补上生成报告损坏的容错：缺文件、截断JSON、null或错误images类型视作无缓存重新生成，不让一次中断永久卡住后续构建；对应测试直接执行实际缓存读取函数。

`SceneBackground`只请求当前背景，先解码再换画面；切换时暂留上一帧并明确提示正在载入新场景。首次无图时显示非黑色底和加载提示。每次请求20秒上限，最多3次（700/1400ms重试间隔，最后一次尝试原PNG）；全部失败后提示并提供“重试背景”。离开场景取消请求和计时器，撤销blob URL；音频、奖励、存档和剧情推进均不依赖图片完成。已覆盖响应体完成与abort同时发生的解码竞争。DOM背景断言改用准确的 `data-scene-background="素材名"`，因实际src为已解码blob URL。

## 肺结节：同一位置的两幅教学对照

原流程在重建前后反复使用`ct_lung.png`，所以看不出变化。现有清晰薄层图保留，新增`ch2_lung_thick_v2.png`作为对应厚层示意：同一屏幕右上方的小结节低对比、边界不清，薄层图更容易辨认。两图是教学插图，**不是从真实DICOM体数据计算出来的5mm/1mm重建结果**；生成提示词、原图、输出哈希见[素材记录](image-polish-assets.json)。新图输出1254×1254，旧图1024×1024；均正方形同视野构图，按同一显示尺寸对照。

- `c2d2_4/5/6a/6b/6c`：新厚层图，标签“本次数据 · 5 mm 厚层”。
- `c2d2_w1/w1ok/7`：原`ct_lung`，标签“本次数据 · 1 mm 薄层重建”。观察配置同步标签。
- 调窗灰度、肺窗参数、观察区域/答案、病例分支、奖励均原样；仍是同次数据的1.5秒工作站重建，**没有新增扫描或曝光**。

医学依据：[Fleischner 2017（RSNA）](https://pubs.rsna.org/doi/full/10.1148/radiol.2017161659)推荐用薄层评价小结节；[RSNA结节测量研究](https://pubs.rsna.org/doi/10.1148/radiol.2017151022)讨论层厚和部分容积对边界/衰减显示的影响。本例强调可见度差异，不把“所有厚层都看不见结节”当成规律。不新增游戏内AI提示、公式或考试。

## 日出：先交班，再走到窗前

只在第三夜病例全部结束后增加三段普通对话节点：

1. `c2n3_handoff0`：后半夜收尾，天色泛白，与到岗白班核对记录、签好交接。
2. `c2n3_handoff1`：小唐招呼“下班了。一起走？楼下包子应该开了。”
3. `c2n3_handoff2`：拎外套离开控制室，走廊窗帘缝漏进暖光，小唐放慢脚步。

到`c2n3_dawn0`才进入原日出图和拉远镜头，开场改为小唐拨开窗帘、两人看向楼顶金边。其余原22节点、两组闲聊选项、拉远/拉近/停留和班末收入保留；没有增加地点、行动力、属性、声音或新悬疑。三段均清除前一个患者及证物，不把患者带到窗边。完成过日出的旧存档不回放；中途旧存档继续原节点。

## 验证与旧测试保护

- 48项静态/逻辑回归（原45项全部保留，加3项本轮保护），三批各16项全通过。另`image-delivery-data.mjs`核验193份源哈希、166份无损输出逐像素一致、22张背景尺寸、灰度图与字节总计，通过。
- 新LIVE保护对109份原源码/配置/历史清单执行精确逆投影，对288份旧媒体直接核对字节。13个旧生产文件的批准hunk独立登记在[固定差异清单](image-polish-source-deltas.json)，43个破坏探针必须被拒绝。旧基点与旧delta清单未改。
- 旧投影增加最外层精确逆向；check-in/payoff破坏探针在各自已投影的输入上测试。历史新增计数只分离2个明确的新源码与1张固定哈希图。旧奖励审计仅逆向8个节点的已独立验证视觉字段，另外3个无奖励过渡单独验证。没有放宽经济、路线或存档断言。
- 桌面与390px真实剧情夹具：厚层 → 纯重建 → 原调窗 → 薄层观察，出图/标签/区域时序正确；三处既有房间 → 原日出，刷新不重奖、无水平溢出。截图目视检查后保留在仓库旁`image-polish-review/`。
- 生产环境和精确Pages式子路径`/Midnight-Radiology/`：冷缓存1Mbps只请求1张首页背景（163,982字节），页面与图像约4.64秒就绪；这是一台测试机的限速结果，不是全球加载承诺。强制请求失败、手动恢复、20秒卡住请求、提前abort解码竞争4项通过；手机可恢复且存档不变。
- 原日出浏览器回归：桌面/手机20节点路线、实际镜头矩阵变化、刷新、手册、结算只一次、减少动态效果、缺图、短横屏通过；只适配manifest精确路径和缺图拦截，不改玩法断言。
- 两条**从空标题开始、同一真实存档**的第一章→第二章自动浏览器路线通过：女主262→414节点（第二章484迭代），男主261→369节点（426迭代）。每路均5次真实滑动、5结算、晨会5题、17采集/重建、12观察；扫描/观察/送礼/考核刷新、继承/账本/重玩检查通过。0未捕获JS异常、0图片/音频HTTP失败。不是声称人工逐句通关或穷举所有分支。
- 新无存档预览页桌面/390px两图解码、7段切换、前后/重置、日出显示、无溢出、localStorage不变通过。
- 生产构建含类型检查通过；本轮文件定向lint通过。全仓lint仍是原有**10 errors / 2 warnings**，没有改规则或藏掉问题。

连续走查与加载结果在仓库旁`image-delivery-review/`；压缩报告由流水线生成在`app/image-delivery-report.json`。复跑命令（`app/`，浏览器测试先启动对应服务）：

```powershell
npm run build
node tests/image-delivery-data.mjs
node --import tsx tests/image-polish-regression.mjs 0
node --import tsx tests/image-polish-regression.mjs 1
node --import tsx tests/image-polish-regression.mjs 2
$env:PLAYWRIGHT_MODULE='C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
node --import tsx tests/image-polish-story-browser.mjs
node tests/image-delivery-browser.mjs
node --import tsx tests/ch2-dawn-browser.mjs
node --import tsx tests/ch1-ch2-continuous.mjs
Remove-Item Env:PLAYWRIGHT_MODULE
```

加载测试用`GAME_URL`选择生产子路径；连续走查分别设`CHAIN_VARIANT=female-curious`、`male-reserved`，`CHAIN_OUTPUT`指定独立输出目录。

## 本地试玩与回退

- 快速对照（不读写存档）：`http://127.0.0.1:8798/ch2-image-polish-preview.html`
- 完整游戏：`http://127.0.0.1:8798/#/ch2`
- 分三次本地提交：`18fa154`图片加载/压缩、`5b66ccc`肺结节/日出、`test(images): verify delivery and chapter continuity`回归/交接与缓存损坏防护。用`git log --oneline ea9d6c5..codex/image-loading-and-ch2-polish`查看最后提交号；整轮按逆序`git revert`。不要hard reset、覆盖源PNG或清玩家存档。
- 老分支与线上版保持不动。没有沿用上轮push授权；作者确认后再另行发布。
