# LDCT 实体模体剧情：累积曝光与同源迭代图集

日期：2026-09-29。分支：`codex/ldct-mobile-phantom`，基点 `36ddd2a`。

## 范围与来源

剧情表现为把实体模体放进机器、逐步增加管电流后查看图像。用于小游戏的数值媒体仍是**原创几何模体的投影模拟**，不是声称从实体扫描仪获得的原始数据，不是患者图。素材没有额外第三方患者数据许可依赖，遵循项目许可证。

模体与既有 `ldct-short-v2-display` 的 `phantom` 完全一致：160×160 网格、间距 1.2、灰圆体及六个嵌件。圆体没有删除、置换或作为后期背景贴回。结构位置、完整参照、正弦图和重建属于同一对象。本轮没有修改原来直接反投影／不滤波的生成方法，也没有替换历史数据。

规范源保留于仓库外 `../ldct-display-assets/`：

| 内容 | SHA-256 |
| --- | --- |
| `phantom-numerics.npz` | `ef4ccf34a223959c19d6bd780ba0c530851d519ff544c6eb5aad617240298f94` |
| `phantom-metadata.json` | `fc8e5a9b016f7f479423d4fd8021402b85c2d3e2979d23c980583fe85613b1af` |
| 完整模体数组，float32 | `97e22861af14d346a241feeac4914bd5ffe7e03d80fa36a2f98397319f31dfa8` |
| 无噪声完整投影，float32 | `0f717981fcac9792360f5b529b010d0f64853af75090fa37b9da9f5ce52d9a5a` |

生成器会验证源数组与原公式精确一致，避免从展示截图反推投影。

## 固定计算参数

- 160 个均匀方向，范围 `[0°,180°)`；所有曝光档使用相同方向，**不以增加角度冒充增加光子**。
- 第 `step` 档新增计数：`Poisson(24 × exp(-cleanProjection))`，随机种子 `2258 + 10000 × step`，`step=0..12`。
- 累加计数之后再取负对数，归一化入射量为 `24 × (step+1)`，不是把多张 FBP 结果透明叠加。13 档最终入射量为312模拟单位。
- FBP 使用 `skimage.transform.iradon(..., filter_name='ramp', circle=True)`；保持既有间距换算。
- 第一次累积图接近噪声占满、难以辨认；最后一次仍有明显噪声，只能辨认较强嵌件。不会把最终曝光暗中换成高质量图。
- 迭代零轮直接复制最终曝光13的 FBP 数组：数值完全一致，显示量化后也逐像素一致，绝不以全黑图开始。
- 每次迭代执行一次所有方向的 `iradon_sart`，relaxation `0.055`，非负范围 `[0,0.06]`（内部含间距尺度）；随后执行 TV 正则约束，weight `0.0007`，eps `0.0002`，最多40次 TV 内部计算。共12轮；每轮都重复使用曝光13的同一份测量投影。
- 图像固定显示窗 `[0.005,0.030]`；正弦图固定窗 `[0,3.0919133568593944]`。所有轮次共同使用，不逐帧自动拉伸。
- 数值数组保留原精度。仅交付显示层均匀量化为64灰阶，然后以无损 WebP 编码；这与有损编码后再归一化不同。

为获得“几乎纯噪声→勉强可辨→迭代改善”的可见过程，先生成入射增量6／12／24三组关键帧，选择24后生成完整图集。未手绘修补任何结果、移动嵌件或给个别帧额外去噪。

### 明确局限

这里是简化平行束、单能投影模型。极低计数中的零计数取下限1以避免对数无穷，因此最早帧也含光子饥饿与截断偏差；曝光单位没有临床 mA 或剂量的校准关系，不能据此给患者设定参数。

SART-TV 是迭代数据拟合加正则化的研究演示，不等于厂商算法。它不保证所有细节都恢复，也不保证每轮都更好。TV 抑制噪声时，未加权投影残差可能上升：本组由0.05745上升至0.07105；不得在 UI 中把它写成“每轮误差必然减小”。相对已知模体的图像 RMSE 从曝光13／IR0的0.0063235下降到IR12的0.0032963。该值只用于离线一致性检查，不给玩家制造诊断性能分数。

## 交付图集与接口

| 逻辑 ID | 排布 | 字节 | SHA-256 |
| --- | --- | ---: | --- |
| `ldct_phantom_exposure_v1` | 13列×2行；首行FBP，第二行正弦图；每格160px | 345262 | `2b7a7027b42e8f5e1a05bf9ef10e22ce3a573034f5a4ac189e5854ddb25a4b86` |
| `ldct_phantom_iteration_v1` | 13列×1行；IR0–12；每格160px | 117826 | `fa28db7f5720fa200f228528628f70ff5aec99049a749016c57395d4bf6e12f6` |

合计 **463088 B（约452 KiB）**。只有两个小型无损图集进部署；计算数组、候选参数和验图接触表留在仓库外 `../ldct-phantom-exposure-assets/`。

接口：`app/src/game/ldct-phantom-exposure.ts`。

- 曝光版本 `ldct-physical-phantom-exposure-v1`、迭代版本 `ldct-physical-phantom-ir-v1`；旧记录不按新版本重新解释。
- `ldctPhantomExposureFrame/FrameStyle('fbp'|'sinogram', step0..12)`；显示曝光次数为 step+1。
- `ldctPhantomIterationFrame/FrameStyle('fbp'|'iteration:0'..'iteration:12')`；`fbp`与`iteration:0`定位同一格。
- 所有越界和非整数索引拒绝；单行图集的 CSS 背景位置不会除以零。
- `LDCT_PHANTOM_EXPERIMENT_MEDIA_IDS`由实验资源清单纳入LDCT预加载；不改变其他章节的预加载资源。

## 生成与已完成检查

在仓库根目录：

```powershell
& 'C:/Python314/python.exe' scripts/generate-ldct-phantom-exposure.py '../ldct-phantom-exposure-assets' --pilot
& 'C:/Python314/python.exe' scripts/generate-ldct-phantom-exposure.py '../ldct-phantom-exposure-assets'
& 'C:/Python314/python.exe' scripts/generate-ldct-phantom-exposure.py '../ldct-phantom-exposure-assets' --verify-only
```

已定点检查：源几何与投影一致；13次独立随机增量、累积计数、FBP可重算一致；IR1/6/12独立重算一致；IR0与末次FBP数值和像素完全一致；两图集编码后解码逐像素一致；两版本使用同一固定窗和同一测量投影。

人工查看 `phantom-exposure-pilot.png` 和最终 `phantom-exposure-review.png`：初帧结构淹没在噪声中，末帧强对比圆形嵌件可辨但仍噪声很重，IR6／12背景噪声降低、嵌件位置不变；细小／低对比结构没有被强行画清。此验图不代替主任务的移动端操作检查。

以 `import-image.mjs --keep-webp` 导入，RGB及透明度与源文件精确一致；新增API文件定点ESLint通过。未在此子任务运行构建或整章走查；由主任务统一执行一次受影响验收。

回退时随本轮功能提交一起还原新模块、catalog新增两项及其对应图集；旧图集和旧版本均未覆盖，无需恢复历史数值文件。
