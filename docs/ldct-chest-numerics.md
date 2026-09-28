# LDCT 胸部影像：同源投影与迭代结果

## 2026-09-28 当前版：真实开放CT衍生的教学重建

对应 `codex/ldct-media-polish`，版本 **`ldct-chest-open-v2`**。作者要求肺图更像实际CT，现用真实胸部体数据的三个原生相邻层面替换旧几何示意图。其余圆形模体、BP/不滤波等价显示不在本修订范围内。下方v1记录仅为可复现历史，不再描述当前交付素材。

### 来源、许可与事实边界

- 数据：**AortaSeg-60 / Nat_07**；Dania El Rahal、David C. Rotzinger、Guillaume Fahrni，2026；[原作者公开记录](https://zenodo.org/records/18147026)，DOI `10.5281/zenodo.18147026`。
- 2026-09-28直接核对[原作者README](https://zenodo.org/records/18147026/files/README.md?download=1)，许可明确为[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。Zenodo元数据另列CC0，保守保留BY署名、许可链接和改编声明；可再分发及商用，不沿用其他冠脉素材的NC限制。
- 本次使用本地已取得的同一体数据，不重新下载全数据集；源文件SHA256为 `a0b9ae7c5d021bf6f072fae7e7b0a7a224e238033eb243fcb0e1268bf6eb413a`。
- 这是成人平扫、正常主动脉类别，**不等于全身健康或已有肺癌诊断**。源数据没有提供这三层的肺结节病理标注，不声称公开人物就是陆叔，也不把本篇虚构的早期病变结局当成数据集诊断。玩家只标记自己不确定的地方，不设病灶定位标准答案。
- 用原图中的真实肺、血管和纵隔细节；未画入额外病灶，未在任何某一版输出上手工添删结构。
- 源是已重建CT图像，不是扫描器原始投影。将源CT降采样为数字对象后再做Radon投影、计数噪声、FBP/SART+TV，属于**真实解剖来源的模拟重建**。故事中的授权原始数据工作流是虚构，游戏素材不能冒充实际扫描器原始数据。

游戏手册的 `LDCT_CHEST_METHOD_NOTES` 同时保留作者、数据集、DOI、许可和模拟说明，不能只在仓库里留下署名。

### 制作参数与压缩

| 参数 | 当前值 |
| --- | --- |
| 源层面 | LPS轴向零基788、789、790，真正连续三层，原层间距约0.6mm |
| 源平面 | 512×512，原间距约0.742188mm |
| 方向/外部物去除 | LAS转LPS；HU>-500的最大身体连通域填孔，外扩2px；保留体内HU，去掉床板、体外线材 |
| 图像派生 | HU范围[-1000,2000]转换为简化衰减 `0.02×(HU+1000)/1000`；抗混叠缩至168×168，置于192×192黑底 |
| 计算间距 | 512×0.742188÷168 ≈2.261906mm；不是临床剂量标定 |
| 投影 | 192角度、0°至不足180°，平行束；无衰减计数50,000，固定层种子28225/28226/28227 |
| FBP | Ramp，与各轮迭代使用完全相同的带噪投影 |
| SART+TV | 松弛0.055，每轮完整SART后TV weight=0.00018、eps=0.0002、最多40内部步 |
| 输出 | 真值数字对象、FBP、迭代0/1/2/4/8，各层同一固定图像窗[0.001,0.022] |
| 主图压缩 | 8位灰阶无损WebP，不逐图拉伸、不额外磨皮 |
| 投影压缩 | 使用全组固定范围；残差统一平方根映射；显示灰度共同量化到64级再无损WebP，数值源完全未量化 |

`truth`代表用于模拟的降采样对象，不是临床病理金标准。少量固定ROI的标准差包含原来的解剖结构，不能直接当作纯噪声标准差；本轮不根据这些数值宣称临床图像质量或检出率提高。

交付结构保持7×3主图、11×3副图，稳定逻辑ID保留原名字以减少运行时改动；内容版本与内容哈希均更新。文件：

| 稳定ID | 字节 | SHA256 |
| --- | ---: | --- |
| `ldct_chest_v1_images` | 148,136 | `282a66566ec0c657c53432bbbadc5d5334efadfbc1165a7fa14b9d4de815e8f6` |
| `ldct_chest_v1_projections` | 294,426 | `ba5e9e7aace07e82950cd59750f1427515019462706b6d844070390da502dc9e` |

合计 **442,562字节（约432.2KiB）**，比旧版652,034字节减少约32%。保持192px而不放大原始大图；解剖细节、噪声和迭代过程可观察，不能用于精确临床读片训练。

生成结果在仓库外 `../ldct-media-polish-assets/chest/`：两张WebP，以及 `chest-metadata.json`、`chest-numerics.npz`、`chest-frames.npz`、`chest-review.png`；后三类不部署、不进入Kimi正式包。源体数据仍在 `../ct-sequence-source-review/aortaseg-nat-07/Nat_07_image.nii.gz`。

### 有限验收与复现

看验三层对照表：可识别肺部、血管、心脏和胸壁，FBP有模拟计数颗粒，1轮模糊、4/8轮细节逐渐回来；零轮黑图属零初值。没有人为写成“第8轮必然抹掉病灶”。三层真实邻层细节略有变化，不能随机更换部位假装翻层。

```powershell
& 'C:/Python314/python.exe' scripts/generate-ldct-chest.py '../ldct-media-polish-assets/chest' --source '../ct-sequence-source-review/aortaseg-nat-07/Nat_07_image.nii.gz'
& 'C:/Python314/python.exe' scripts/generate-ldct-chest.py '../ldct-media-polish-assets/chest' --source '../ct-sequence-source-review/aortaseg-nat-07/Nat_07_image.nii.gz' --verify-only
```

源模式额外使用nibabel读取NIfTI，依赖版本5.4.2；不带`--source`仍可复现下面历史v1。验证检查源哈希、方向、连续层、同源投影/计数、固定窗、64灰阶副图以及54个输出；独立重算一次FBP和非初始SART+TV，不完整重建两遍。前端 `ldct-chest.mjs` 检查帧地址、版本和旧版本登记。旧草稿/历史收据按主运行时迁移保留，旧标记不能冒充已核对新解剖。

---

## 历史v1：原创胸部几何模体（已替换）

本记录对应 `codex/ldct-raw-data-story`，数值版本 `ldct-chest-v1`。仅新增胸部实验素材；原有圆形模体、直接反投影显示修正、滤波响应均不改。

## 来源与用途

这是本项目原创的**胸部形状数字模体**，不是临床患者片，也不是生成式图片。它用确定性的椭圆、分支线和小圆构造胸廓、双肺、纵隔、椎体、肋骨与血管示意，在三张相邻截面上连续改变少量几何参数。微弱小结构在计算投影之前就存在，后续不随算法、迭代轮数或玩家选择添加、删除。

图像用于感受同一数据经不同重建后的噪声、细节差异，不能据此签发诊断。界面主画面只显示实际 FBP/迭代图；真值留在图集中供方法核查，不向玩家提前圈答案。三层分别重建，不冒充完整三维临床算法。

计算实现依据：

- [scikit-image 官方 Radon/FBP/SART 示例](https://scikit-image.org/docs/stable/auto_examples/transform/plot_radon_transform.html)：投影、滤波反投影与代数迭代重建。
- [scikit-image 官方 denoise_tv_chambolle 文档](https://scikit-image.org/docs/stable/api/skimage.restoration.html#skimage.restoration.denoise_tv_chambolle)：总变差正则化的数值实现。

没有第三方病人数据、照片或模型权重，不附加新的外部素材许可证。

## 固定计算参数

| 参数 | 本版数值 |
| --- | --- |
| 图像尺寸 | 192 × 192，三层 |
| 像素间距 | 1.5 mm（计算几何标尺，不是临床剂量标定） |
| 平行束角度 | 192 个，0° 含至 180° 不含 |
| 无衰减入射计数 | 每条射线 20,000 |
| Poisson 种子 | 第 0/1/2 层：28225、28226、28227 |
| FBP | Ramp，scikit-image `iradon`；逆变换后除以像素间距 |
| SART | 松弛因子 0.055，每个外迭代执行一轮完整角度更新 |
| TV | 每轮 SART 后固定 weight=0.00030；eps=0.0002，内部上限40步 |
| 保留外迭代 | 0、1、2、4、8；第0轮为真正零初值 |
| 所有图像共同显示窗 | 0.001 至 0.022，相同线性灰阶，不逐图自动拉伸 |

完整源模体乘像素间距后做 Radon 投影。对 `20,000 × exp(-投影)` 抽取 Poisson 计数，再取负对数形成测量投影。FBP、所有迭代均读取**本层同一个数组及哈希**。每轮 SART 从前轮结果继续，用测量投影作更新，然后施加固定 TV 约束；不是把 FBP 反复模糊。此简单 SART+TV 串联方案不宣称实现了某个厂商算法，也不宣称是严格求解某个完整临床目标函数。

弱结构在屏幕左侧肺区附近；中间层半径3.4像素，相邻层各2.7像素，附加衰减值0.0028。位置仅保存在外部核验元数据中，不作为前端默认高亮/标准答案。肺窗式的共同显示范围会使骨性结构饱和，这是固定显示的结果，不适合拿这些图比较骨组织细节。

## 数值与视觉检查结论

三层初版接触表已逐行查看：双肺/胸廓可识别，FBP 的颗粒噪声、早期迭代的模糊和后续细节逐渐恢复可辨；没有全白、全黑等意外窗宽问题。第0轮本来就是黑图，前向投影第0轮也本来为0，并非缺失素材。

以中间层为例，固定肺区噪声标准差约为：FBP 0.000841；第1轮0.000210；第4轮0.000097；第8轮0.000050。弱结构与局部环带的原始差值为0.002686；第4轮约0.001920、第8轮约0.002093，仍弱于真值。该数据的1→8轮投影残差和整体图像误差总体下降，**不能据此写“第8轮反而一定抹掉病灶”**，也不能写“噪声变少就保证诊断正确”。本组实际体现的是降噪、早期平滑与细节保留的取舍。

折叠内的测量/前向投影统一使用三层测量投影99.7百分位最大值作为上界。绝对投影残差也使用该固定上界，统一做平方根亮度映射，让小残差可见；没有逐帧拉伸，也不改保存的数值残差。比较投影和残差灰度时必须知道映射不同，不能把亮度当相同单位刻度。

局限：无散射、束硬化、锥束/螺旋扫描、运动、三维重建及真实探测器模型；衰减标尺不对应经校准 HU，计数不能换算成某个患者剂量。原创简化形状不能替代真实解剖教学或临床证据。

## 交付图集与接口

| 逻辑ID / 文件 | 排列 | 字节 |
| --- | --- | ---: |
| `ldct_chest_v1_images` / `ldct_chest_v1_images.webp` | 7列 × 3层 | 152,370 |
| `ldct_chest_v1_projections` / `ldct_chest_v1_projections.webp` | 11列 × 3层 | 499,664 |

两张均为逐像素回读确认无损的灰阶 WebP，合计652,034字节（约637KiB），各自小于600KiB。只有图集进入公开媒体；原始数组和检查大图不部署。

- 主图列：`truth`、`fbp`、`iteration:0`、`iteration:1`、`iteration:2`、`iteration:4`、`iteration:8`。
- 副图列：`sinogram`、`forward:0/1/2/4/8`、`residual:0/1/2/4/8`。
- 行：`slice=0/1/2`，默认中间层1。
- `ldctChestFrame(key,slice)` 返回逻辑媒体ID、行列数与坐标；`ldctChestFrameStyle` 返回对应 CSS 位置。
- 剧情预览复用 `ldctChestFrame('fbp',1)` 和 `ldctChestFrame('iteration:4',1)`，不另外导出大图，不额外扫描。

SHA256：

- 主图 `c254e24eedba683d08906bd047af7e3332c1a568259eed6f864749e01d41ea73`
- 副图 `072a9d6cf59437362be836b0d958c5eae0e2b89819e5dcfb359163510efb6940`

生成目录：`C:/Users/lvmen/Documents/New project/ldct-father-assets/`。外部保存 `chest-numerics.npz`、`chest-frames.npz`、`chest-metadata.json`、`chest-review.png` 供复核。元数据逐层记录源模体/输入投影哈希、每轮输出哈希、残差和指标。

## 有限验证与复现

```powershell
& 'C:/Python314/python.exe' scripts/generate-ldct-chest.py '../ldct-father-assets'
& 'C:/Python314/python.exe' scripts/generate-ldct-chest.py '../ldct-father-assets' --verify-only
```

第二条不生成文件：核对三层源几何、种子计数、同源投影、54帧固定显示窗、各轮前向投影/真实残差；独立重算中间层一次 FBP 与第2轮 SART+TV，确认继续使用第1轮的结果；核对图集像素、哈希和体积。此次通过，约3秒。

前端接口定点测试：在 `app/` 执行 `node --import tsx tests/ldct-chest.mjs`，验证54个帧地址不重叠、默认预览层与非法参数保护。无需为纯数值生成重玩主游戏。本轮不改变其他图集；回退时撤销这两个新ID的引用和登记即可，不覆盖任何旧资源。
