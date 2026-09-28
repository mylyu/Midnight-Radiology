# LDCT 胸部：逐次累加模拟曝光

2026-09-28，`codex/ldct-hands-on-exposure`；版本 `ldct-chest-exposure-v1`。供父亲篇第一次胸部图像处的小实验使用：起始已有1份模拟曝光，每次点击再加入1份，共1、2、3、4份。这里增加的是固定角度下的计数，不是逐渐添加投影方向，也不是对已有FBP磨皮。

## 同一真实来源与起始衔接

直接读取仓库外 `../ldct-media-polish-assets/chest/chest-numerics.npz` 中的中间层 `1:*`，以及同目录 `chest-metadata.json`。来源、方向、身体裁剪和简化衰减转换完整沿用 [ldct-chest-numerics.md](ldct-chest-numerics.md) 的当前v2记录；没有重新下载、换层或画入病灶。

- 原图：Dania El Rahal、David C. Rotzinger、Guillaume Fahrni，AortaSeg-60 / Nat_07（2026），[DOI 10.5281/zenodo.18147026](https://zenodo.org/records/18147026)。沿用原作者README的 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) 署名条件及模拟改编说明；游戏原胸部手册继续提供署名。
- 源是已重建的CT图像。投影、曝光计数和本实验FBP均是该图像衍生的模拟，不是源扫描器原始投影，不是虚构父亲的真实病历，也没有源肺癌标注。
- 中间层对应LPS轴向零基789；192×192数字对象、192个等间隔角度 `[0°,180°)`、计算间距 `2.261906215122768 mm` 均不变。
- 第一份使用原始 `1:counts`，每条射线的无衰减计数 `I0=50,000`、种子28226。`counts`、`sinogram`、`fbp` 数组与原数据逐元素一致；第一档两帧也与原来两张WebP图集中的中间层FBP/测量投影逐像素一致。

源NPZ SHA256：`1c5356d8be717b9f5eb9a181ddb68c0568f39acf1e62e7d3eb95f9e1561860c9`；源元数据SHA256：`1a6fe92553eae2ae7f36383934589731281800cb6845775a81aceb52afc6c121`。源体数据哈希和许可字段复制进外部曝光元数据，便于复核。

## 计数、负对数和重建

设原数字对象的无噪声线积分为 `p`。每份增量 `C_j ~ Poisson(50,000 × exp(-p))`，不同份使用独立固定随机种子 `[28226,38226,48226,58226]`。第一份直接复用已保存的相同抽样；后续各份重新抽样。第 `n` 档：

```text
C_total(n) = C_1 + ... + C_n
I0_total(n) = n × 50,000
p_measured(n) = -log(max(C_total(n), 1) / I0_total(n))
image(n) = iradon(p_measured(n), same_angles, Ramp) / same_spacing
```

必须先相加计数，再除以总入射计数后取负对数；不是相加或平均已经取过对数的投影。累计计数逐射线非递减，负对数后的像素本身无需单调。所有档位的部位、角度、Ramp重建和显示窗相同；没有新角度、平滑处理、锐化或逐帧亮度拉伸。与迭代工具不同，这个小实验没有SART/TV。

`1份`、`+1份` 是等规模模拟曝光单位，没有临床mA、mAs或患者剂量的换算。原CT图像已有的噪声包含在数字对象中，增加模拟计数不会恢复源采集丢失的信息。也不能推导“加到4份即可保证诊断”或把该操作理解成真实患者反复补扫。

## 固定显示与轻量交付

主图窗 `[0.001,0.022]`，8位灰阶；投影窗 `[0,5.40106590453289]`，与现有胸部图一致，并沿用64级共同显示量化。数值数组不量化。输出无损WebP，确保起始两帧与原图集完全一致。

| 逻辑ID / 文件 | 排列 | 字节 | SHA256 |
| --- | --- | ---: | --- |
| `ldct_chest_exposure_v1` / `ldct_chest_exposure_v1.webp` | 4列×2行，每帧192px | 63,096 | `38d811e2235de87e2cb3f223e65cb3f841a68c1158b095bb58304689c28bc26f` |

第一行 `fbp`，第二行 `sinogram`；列号 `step=0/1/2/3` 对应累计 `1/2/3/4` 份。整图768×384，小于180,000字节目标。前端 `app/src/game/ldct-exposure.ts` 提供版本、逻辑ID、份数，以及 `ldctExposureFrame` / `ldctExposureFrameStyle(kind,step)`；背景图片交给章节完整预载后的 `imageAsset`。

只有WebP进入正式媒体；仓库外 `../ldct-exposure-assets/` 另存 `exposure-numerics.npz`、`exposure-frames.npz`、`exposure-metadata.json`、`exposure-review.png`，均不部署、不进入正式素材包。NPZ中保存每份独立增量、累计计数、投影和FBP，可直接核对嵌套关系。

## 有限验收

```powershell
& 'C:/Python314/python.exe' scripts/generate-ldct-exposure.py '../ldct-exposure-assets'
& 'C:/Python314/python.exe' scripts/generate-ldct-exposure.py '../ldct-exposure-assets' --verify-only
```

环境：NumPy 2.5.0、scikit-image 0.26.0、Pillow 12.2.0。生成与验证约3秒。验证通过：源哈希、原计数种子、首档数组/已交付图像像素一致、四档等均值独立增量及累计关系、总入射计数归一化、固定几何与窗口、四次独立FBP重算、无损图集回读与体积。前端通过8个帧地址互异与越界/非整数/非法类型保护检查。

已实际查看 `exposure-review.png`：四档解剖保持一致，肺、血管、心脏、胸壁可辨；累计计数增加后细颗粒减弱，192px下是较细微的变化，没有人为增大首档噪声。正弦图轮廓保持固定。界面应让玩家来回对照，不能把差异写成结构凭空出现。

用无噪声投影的相同FBP作参照，在固定身体区域（源数字对象>0.002）计算本次计数噪声造成的重建RMSE：

| 累计份数 | 投影RMSE（相对无噪声投影） | FBP RMSE（相对无噪声FBP） |
| --- | ---: | ---: |
| 1 | 0.02237249 | 0.00056945 |
| 2 | 0.01581927 | 0.00040427 |
| 3 | 0.01287141 | 0.00032928 |
| 4 | 0.01106718 | 0.00028063 |

这是固定数字对象与固定种子的内部核验，不是临床噪声指标、图像质量合格阈值或检出率证据。没有据此改写既有胸部素材、滤波/迭代计算或其他章节资源。
