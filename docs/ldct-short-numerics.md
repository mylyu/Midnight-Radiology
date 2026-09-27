# LDCT三篇短故事：完整物体数值素材

本轮基点`d800020`，分支`codex/ldct-three-short-stories`。本文件替代旧四段研究流程中的稀疏对象比较说明；旧文档保留为历史证据。生成器为`scripts/generate-ldct-short-projections.py`。

### 2026-09-28 显示修正（当前）

从`fb0874f`建立`codex/ldct-display-correction`，作者批准修正不滤波/残差可见度。来源版本为`ldct-short-v2-display`；逻辑媒体ID不变，实际WebP使用新内容哈希。旧`ldct-short-v1`记录仍有效且不反写来源，不重置进度或奖励。

- 不滤波计算没有遗漏`iradon`的角度归一化；旧窗`[0, 1.7×最大值]`却把峰值压到约150/255，小结构局部对比只有1–3级。现改为带偏置固定窗：模体/笑脸`[1.6,4.0]`，螺母`[1.7,4.5]`。同一对象所有BP方向数及低/中/高信号的不滤波共用此窗，窗外按普通显示规则截断；不逐帧自动拉伸、不减背景、不锐化、不叠真值。大结构更可辨，微小结构仍会被真实BP模糊。
- BP逐方向累加改用滤波比较中的同一份**高信号测量投影**。160方向直接复用对应不滤波结果，两处数值和显示像素完全相同；低/中信号仍用各自测量，不能误称九张图相同。
- 绝对残差仍用原始数值及同一上限，只对显示统一使用`255×sqrt(clip(residual/window_max,0,1))`；第0/1/2/4/8轮都用相同映射。界面注明“差异增强显示（各轮同一尺度）”，不把每轮各自调亮制造伪收敛。
- 对比旧缓存：每套44个数值数组完全不变，只改6个BP输入；真值、正弦图、全部FBP数值、迭代估计及残差原值保持。其余帧像素也不变。验证器新增同数据等价、固定窗、统一残差映射和无损往返断言。

当前外部生成目录`../ldct-display-assets/`；原目录`../ldct-short-assets/`保留。按下文相同命令把输出路径换成新目录即可复现。原图集已移出部署至新目录的`previous-delivery/`，Git亦可恢复。

| 当前图集 | 字节 | SHA256 |
|---|---:|---|
| `ldct_short_phantom_v1.webp` | 384,398 | `95385178b7487fa5a2e99e20e1d45da9870fedf31848cef4d697e6769d6c8593` |
| `ldct_short_face_v1.webp` | 386,634 | `b6f985d3dcd877eeec0a35819db3c707ca7d4c1a49ea5a50e056d27d20ba2c73` |
| `ldct_short_nut_v1.webp` | 390,254 | `b56a958c11d2ed89a469b7f1a4ef0491edd5f08fb6fc9dba55ff231a013d6c49` |

总计1,161,286字节，较v1增加108,788字节（约106KiB）；仍为1280×960、46帧无损WebP，每图低于600KiB。通过`import-image.mjs --replace --keep-webp`原样导入，RGBA逐像素一致。下面涉及旧窗和旧哈希的内容为v1历史记录，以本节为当前实现。

## 一个故事，一个完整物体

三套原创数字对象均置于相同的灰色圆形教学介质内。对某套对象，追踪、直接反投影、FBP、改变模拟信号和迭代全部读取同一几何和衰减数组；不再在第三个实验去掉灰底、第四个实验又放回来。

| 数据集 | 真实几何 | 固定噪声种子 | 媒体ID |
|---|---|---|---|
| `phantom` | 原圆块、低密度块、细棒与浅圆块，完整灰底 | 2258 | `ldct_short_phantom_v1` |
| `face` | 左右两亮圆、浅鼻点、下方弧线；右圆略低略小、弧线略偏心，像一张不完全对称的笑脸 | 2259 | `ldct_short_face_v1` |
| `nut` | 普通闭合六角螺母横截面、圆形内孔，无裂缝或径向缺口 | 2260 | `ldct_short_nut_v1` |

这些不是病人或实物扫描；尤其螺母只是几何/对比测试对象，不含真实金属的多能谱衰减、束硬化和散射模型，不能用来讲真实金属伪影性能。图中的灰度不是HU。

## 计算与显示

- 160×160网格、间距1.2mm，160个平行束角度均匀覆盖[0°,180°)，同一对象所有阶段几何一致。灰底衰减0.016/mm，常规显示窗[0.005,0.030]/mm。
- 理想投影为`radon(mu * spacing)`；测量计数为`Poisson(I0 * exp(-p))`，取负对数形成带噪投影。低／中／高计数为**3200／8000／32000**；不改变角度数，不把图上加雪花冒充低计数，也不将此数值换成患者剂量。
- 第一张接触表使用旧160低计数，白噪声过强。实现中目视审核后提高计数，生成第二张接触表（尚待作者试玩认可）：低档在固定灰底ROI的噪声标准差相当于显示灰底亮度的约21%，高档约6.5%–7.8%。这是改变物理简化模型的计数，不是额外涂抹降噪。三档同对象同种子，但不声称是一次实际采集的抽稀计数。
- 六种方法均调用`iradon`，读取同一档的同一份完整测量投影。不滤波对应`filter_name=None`，其余为Ramp、Shepp–Logan、Cosine、Hamming、Hann；不是把成片套滤镜。
- 直接反投影确实会把大面积灰底也铺开，细节可能被宽的模糊背景盖住。本轮只使用固定不饱和显示范围，保持灰色而非刺眼白块；**没有去背景、锐化或叠入真值**。各对象的不滤波固定范围为理想完整BP最大值的1.7倍，上限分别6.0995919786／6.0387204098／6.7529467059。它和FBP幅度不同，不作跨算法灰度定量比较。
- BP1／2／4／8／24／160由黄金角顺序逐步加入完整投影列，表示参与叠加方向数，不代表剂量档位。追踪用的正弦图与完整无噪正弦图逐像素相同。
- 迭代示例从真零图开始，使用低档同一份测量投影，SART松弛0.035，每轮完成全部角度，非负范围[0,0.060]/mm；无额外TV或神经网络降噪。0／1／2／4／8轮、预测投影及绝对差异均为实际数值。所有估计图同窗，所有预测投影同窗，所有差异同窗。

| 对象 | 图像RMSE：1／2／4／8轮 | 本次可见现象 |
|---|---|---|
| 模体 | 0.001380／0.001149／0.001162／0.001446 | 早期恢复结构，后期更追随噪声；本次2轮最接近已知图 |
| 笑脸 | 0.001385／0.001148／0.001168／0.001466 | 笑脸一直可辨；2轮后继续拟合带噪测量，不等于更接近真值 |
| 螺母 | 0.001694／0.001371／0.001344／0.001651 | 此例4轮误差较低，8轮更碎，但螺母仍可辨 |

以上数字只记开发记录，不要求学生计算。不能继续沿用旧极低信号版“第一轮就最好”的对白，也不能推导某个固定迭代次数适合所有病例。

## 生成、接口与验证范围

```powershell
python scripts/generate-ldct-short-projections.py "C:/Users/lvmen/Documents/New project/ldct-short-assets" --review-only
# 查看 critical-review.png；确认后只打包已计算帧，不重新抽样。
python scripts/generate-ldct-short-projections.py "C:/Users/lvmen/Documents/New project/ldct-short-assets" --pack-only
# 已有输出的独立数值核验；不重新生成图像。
python scripts/generate-ldct-short-projections.py "C:/Users/lvmen/Documents/New project/ldct-short-assets" --verify-only
```

环境为Python3.14、NumPy2.5、scikit-image0.26、Pillow12.2。源NPZ、帧缓存、参数JSON、接触表留在仓库外目录；网页只导入每套46帧、1280×960的无损WebP，不下载原始投影或模型。每套最终字节和SHA256由同目录`*-metadata.json`记录。平台/库版本改变可能改变字节，重新生成后应重新核对。

| 最终文件 | 字节 | SHA256 |
|---|---:|---|
| `ldct_short_phantom_v1.webp` | 349,346 | `7508b0bcdf0250b39a4a50e29b55b8f14af20d9c6e760a8dfcdb7f7477005115` |
| `ldct_short_face_v1.webp` | 350,444 | `c953cce19976c1a13c15997fa9a04e0569c30eb9e55cb5a9b466223820d9a6ec` |
| `ldct_short_nut_v1.webp` | 352,708 | `a9e859e82a409705de1bc9e14a7590bec41ce9f52c97f52153fc6fa85647fefe` |

三套共1,052,498字节，约1.004MiB。导入时保留无损WebP，不再二次有损压缩。首次极低计数候选已被修订结果覆盖，不导入正式目录。

`ldct-projections.ts`新增`LdctDataset`和`LDCT_DATASET_MEDIA_IDS`，帧、轨迹和机架函数接收可选末尾参数`dataset`，省略时仍为`phantom`。`getLdctDatasetStructures`提供各对象的具体点位，螺母点位是局部一点，不谎称为整个物体的重心轨迹。各点方向用独立单像素Radon重心检查，最大误差小于0.10像素。

图集只有46个真实槽位，历史`filter:sparse:*`键保留为`fbp:high:*`的别名，已经没有稀疏对象。旧实验版本常量保留以兼容存档；新数值来源版本另记`ldct-short-v1`，不能把旧记录的来源反写成新数据。剧情/旧档迁移由集成模块另行处理。

数值专项只检查方向、同对象同源投影、同档各算法输入哈希、真实零初值、计数噪声差异、连续迭代差异和WebP无损往返。接触表已直接看验；不把这些检查冒称完整游戏通关或故事趣味验收。

## 依据与许可

- [scikit-image Radon示例](https://scikit-image.org/docs/stable/auto_examples/transform/plot_radon_transform.html)：正弦图、FBP及SART，并说明继续迭代可能追随噪声。
- [scikit-image transform API](https://scikit-image.org/docs/stable/api/skimage.transform.html)：实际调用的`radon`、`iradon`、`iradon_sart`与黄金角排序。
- [MATLAB iradon](https://www.mathworks.com/help/images/ref/iradon.html)：不滤波与各滤波响应语义参考；本数值流程实际运行的是scikit-image，不声称由MATLAB生成。

全部对象为项目原创数字几何，沿用项目许可，无患者资料或新第三方影像授权。依赖库遵循各自许可证。
