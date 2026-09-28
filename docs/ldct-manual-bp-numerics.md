# LDCT 手动反投影：每次最多加入8个方向

2026-09-28，`codex/ldct-hands-on-exposure`。新增小图集供手动逐步铺回投影使用，避免旧进度点从24一次跳到160。原 `ldct-projections.ts` 的 `LDCT_BP_COUNTS=[1,2,4,8,24,160]` 和旧 `bpStep` 含义保留，新UI通过实际方向数 `bpCount` 选择新帧。

新方向数序列：`1,2,4,8,16,24,32,40,48,56,64,72,80,88,96,104,112,120,128,136,144,152,160`。前几步增加1、2、4个方向，随后每次增加8个。这里是将已测得的投影方向逐渐参与反投影，与胸部实验增加模拟曝光计数不同；不代表对患者增加扫描或调整剂量。

## 同一输入、顺序与固定窗

直接读取仓库外 `../ldct-display-assets/phantom-numerics.npz` 和 `phantom-metadata.json`，来源版本 `ldct-short-v2-display`。沿用完整灰圆数字模体的 `sinogram:high`、160个等间隔角度 `[0°,180°)`、160×160网格、计算间距1.2mm；没有重新抽取噪声、改变对象或重建其他FBP/迭代素材。

高信号输入投影的旧版float32哈希仍为 `2b1a04b7d95bb186269606bd38d6788443994e88fa2a053459b2ba8fcddc674b`。新增帧沿用 `order_angles_golden_ratio` 得到的同一角度顺序，取其前N列，执行 `iradon(..., filter_name=None, circle=True)/1.2`；保持原 `iradon` 按参与角度数进行的归一化。不是用亮度叠加假装增加方向，也不是锐化已有图片。

原来的六帧数值直接复用；尤其完整160方向保留原来的标准角度累加顺序，与 `fbp:high:none` 数值精确相同，避免浮点求和顺序带来微小差异。所有帧统一使用既有偏置窗 `[1.6,4.0]`，8位灰阶无损WebP，不逐帧拉伸、不去灰底、不叠加真值。其来源和限制见 [ldct-short-numerics.md](ldct-short-numerics.md) 的当前显示修正记录；项目原创几何不涉及新第三方影像。

## 输出和接口

| 逻辑ID / 文件 | 排列 | 字节 | SHA256 |
| --- | --- | ---: | --- |
| `ldct_manual_bp_v1` / `ldct_manual_bp_v1.webp` | 6列×4行，160px/帧；23帧，末槽黑底未使用 | 100,546 | `e1ec228ca8ec04e2fc83af7dbaa55e3e8385400025e430fe877f73b33c92fba7` |

行优先依上述方向数顺序排列。`app/src/game/ldct-manual-bp.ts` 导出 `LDCT_MANUAL_BP_VERSION`、`LDCT_MANUAL_BP_MEDIA_ID`、`LDCT_MANUAL_BP_COUNTS`，以及 `ldctManualBpFrame(count)` / `ldctManualBpFrameStyle(count)`。参数是实际方向数，不是数组索引。章节完整预载沿用正常媒体接口。

生成目录 `../ldct-exposure-assets/`；只将WebP导入正式媒体。数值、帧缓存、元数据和看验图分别为 `manual-bp-numerics.npz`、`manual-bp-frames.npz`、`manual-bp-metadata.json`、`manual-bp-review.png`，全部留在仓库外。

## 有限核验

```powershell
& 'C:/Python314/python.exe' scripts/generate-ldct-manual-bp.py '../ldct-exposure-assets'
& 'C:/Python314/python.exe' scripts/generate-ldct-manual-bp.py '../ldct-exposure-assets' --verify-only
```

生成与独立验证合计约3秒，仅新增17个BP进度点，不重新生成完整投影/FBP/SART素材。验证源投影哈希和角度顺序、每步最多+8、全部帧固定窗/无损回读、原六帧数值与已交付图集像素完全一致；独立重算1、16、80、160方向，完整帧用 `1e-12` 容差仅容纳黄金角与原标准角度求和顺序的浮点差异，交付的完整帧本身与原值逐元素相等。前端23个地址互异、实际方向数保护和定向lint通过。

已实际查看 `manual-bp-review.png`：前几步能看见交叉条带逐步覆盖物体，随后趋于稳定的模糊结果；后半程每次8个方向的变化自然细微，不将其夸大成图像突然变清晰。完整反投影仍保留真实无滤波的模糊，不改变既有滤波对比结论。
