# LDCT低光子更明显，迭代从FBP开始

2026-09-28，`codex/ldct-reuse-ct-scan`，基点`abbd5b0`。作者指出低光子噪声太少、迭代差异不明显，并要求不从黑图开始。这一版只增加独立数据与版本；旧胸部/曝光素材不覆盖，旧记录没有`chestDataVersion`仍用原数据。

## 一次小样比较后确定参数

复用[已许可胸部来源](ldct-chest-numerics.md)：AortaSeg-60 / Nat_07（El Rahal、Rotzinger、Fahrni，2026，[原作者记录](https://zenodo.org/records/18147026)，[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)）。同一三相邻轴向层、同一身体处理、192×192对象、192方向、2.261906215122768mm计算间距。没有改解剖、画入病灶或声称源数据带肺癌诊断。

以每份入射计数1,000、2,000、4,000做一张关键小样，统一TV强度与显示窗；实际查看各自初始FBP、1/6/12轮和13份计数FBP后选择**2,000**。与上一版50,000相比，中间层FBP计数噪声RMSE约为原来的**5.1倍**，肺/血管/纵隔仍可认，选中参数没有零计数射线。1,000有少量射线出现零计数和更强条纹；4,000改善不如2,000醒目，均不采用。

小样位于仓库外`../ldct-scan-polish-assets/numerics/noisy-pilot.png`，对应指标在同目录`noisy-pilot.json`。没有多轮盲抽，没有对结果逐图修补。

## 同一输入、真实迭代、固定显示

### 光子累计

- 每份`I0=2,000`；`C_j ~ Poisson(I0 × exp(-p_clean))`。
- 每次点击加入独立固定种子的计数，1至13份。先相加计数，再以`n×I0`归一化后取负对数，最后Ramp FBP；不是相加显示图片或已有对数投影。
- 中间层种子`28226 + 10000×j`，j从0起；每层初始种子仍为28225/28226/28227。对象和角度不变。
- 这些份数没有临床mA/mAs/患者剂量换算，电脑演示不表示让父亲反复补扫。

### SART–TV

- **第0轮就是同一份低计数投影的原始Ramp FBP**，不是零初值，也不是另做的较好图片。初始数组允许FBP本身的负值，显示窗仍按统一设置截取。
- 每轮一次完整SART更新，松弛0.055、约束范围[0,0.06]；然后Chambolle TV，weight=0.00045、eps=0.0002、最多40内部步，视野外置零。共有0至12轮，每次点按前进一轮。
- 每一轮都使用**第一份低计数投影**进行数据一致性更新。不会偷偷换成后面13份曝光的更干净输入，也不把图像磨皮当成重建。
- 三邻层分别重建；没有固定强度图像叠化或逐帧调窗。约束使噪声下降，也可能改变小细节外观；不承诺“更多轮必然更利于诊断”。

整个比较组固定主图窗[0.001,0.022]、投影窗[0,5.40106590453289]。显示共同量化到64个灰度级后**无损WebP**，数值数组不量化。量化是统一的传输压缩取舍，不按结果单独拉伸。

已看`noisy-review.png`：第1份明显粗颗粒，第7/13份颗粒逐渐减轻；迭代起点有完整胸部，不再黑屏，6/12轮与原FBP有明显视觉区别。中间层相对数字对象RMSE从原FBP0.002285降至第12轮0.001067；这只是内部固定模型核验，不是临床效果或检出率。

源是实扫CT图像；本版所有投影/计数/FBP/迭代均是它衍生的数值模拟，不是原扫描器的原始投影。故事实体模体和父亲病例均为虚构表现。已有可选手册署名继续保留。

## 文件、版本与接口

`app/src/game/ldct-noisy-chest.ts`：

- `LDCT_NOISY_DATA_VERSION='ldct-chest-noisy-v4'`：draft/record的可选`chestDataVersion`标识。
- 曝光记录`sourceVersion='ldct-chest-exposure-v3-noisy'`；迭代记录`sourceVersion='ldct-chest-iterations-v4-fbp'`。
- `ldctNoisyExposureFrame/ldctNoisyExposureFrameStyle(kind,step)`：`fbp|sinogram`、step0..12，帧为13列×2行。
- `ldctNoisyChestFrame/ldctNoisyChestFrameStyle(key,slice)`：`fbp|iteration:0..12`、slice0..2，帧为13列×3行。`fbp`与`iteration:0`直接寻址同一帧。
- `LDCT_NOISY_MEDIA_IDS`登记两张独立图集。非法帧/小数/越界直接拒绝。Lab仅在新flag存在时切换，旧4档曝光、旧零初值迭代仍可回看；不改旧版本意义。

| ID | 字节 | SHA256 |
| --- | ---: | --- |
| `ldct_chest_noisy_v4_exposure` | 242,022 | `acd820fcb3555dbf8f49db95ab7763dc06b97268cdea91682cb6037b90822ccc` |
| `ldct_chest_noisy_v4_iterations` | 241,640 | `0657f85aec89470d82a2d0bbff5ebf6006c7fdb9cf29de52c6f93b984fe212e8` |

合计**483,662字节（约472KiB）**，低于500,000字节数值素材目标。只部署两张图；三维源、原数组、预测投影/残差、试验小样不部署。生成输出目录`../ldct-scan-polish-assets/numerics/`；原始旧资源未删除。

## 生成与有限验证

```powershell
& 'C:/Python314/python.exe' scripts/generate-ldct-noisy-chest.py '../ldct-scan-polish-assets/numerics' --pilot
& 'C:/Python314/python.exe' scripts/generate-ldct-noisy-chest.py '../ldct-scan-polish-assets/numerics'
& 'C:/Python314/python.exe' scripts/generate-ldct-noisy-chest.py '../ldct-scan-polish-assets/numerics' --verify-only
```

先做一轮小样，再一次批量三层。验证约3秒，检查源哈希/许可字段、所有累计计数/负对数与FBP、固定窗、三层原FBP=迭代0、首曝光=中间层FBP逐元素/逐像素相同、独立重算1/6/12轮SART–TV、图集无损回读与体积。UI增加`data-chest-version`便于定点核对新旧素材路径；新第0轮标签为“原始FBP · 迭代起点”，高级回看0轮标“原FBP”。保存、加载、扫描演出接入由本轮运行时实现验证，不以数值脚本冒充完整游戏通关。
