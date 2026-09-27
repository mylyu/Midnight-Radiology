# LDCT三篇短故事：完整物体数值素材

本轮基点`d800020`，分支`codex/ldct-three-short-stories`。本文件替代旧四段研究流程中的稀疏对象比较说明；旧文档保留为历史证据。生成器为`scripts/generate-ldct-short-projections.py`。

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
