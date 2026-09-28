# LDCT：十二次手动推进的曝光与迭代

2026-09-28，`codex/ldct-cinematic-phantom`，基点`b91b46f`。本记录只涉及数值素材与寻址，前端进度/奖励和过场由本轮主实现记录说明。用户希望曝光与迭代都至少可点十次；采用曝光1→13份、SART–TV 0→12轮，每个阶段完整体验十二次推进。

## 保留输入与旧结果

沿用[胸部数据记录](ldct-chest-numerics.md)的AortaSeg-60 / Nat_07三个相邻层。原作者Dania El Rahal、David C. Rotzinger、Guillaume Fahrni；[DOI 10.5281/zenodo.18147026](https://zenodo.org/records/18147026)，按作者README的[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)条件保留署名。

胸部素材是实扫CT衍生的模拟投影与重建，不是源扫描器原始数据，没有源肺癌诊断标注。故事里的实体仿体和患者检查是虚构演出；这里的数值没有被改称真实机器采集。原圆形仿体数值未改。完整生成器为`scripts/generate-ldct-deep-experiments.py`。

输入：仓库外`../ldct-media-polish-assets/chest/chest-numerics.npz`和`chest-metadata.json`。源数组SHA256为`1c5356d8be717b9f5eb9a181ddb68c0568f39acf1e62e7d3eb95f9e1561860c9`，元数据SHA256为`1a6fe92553eae2ae7f36383934589731281800cb6845775a81aceb52afc6c121`。本轮不重新筛片、不插入病灶、不更换窗口。

## 曝光：1至13份

延续[原曝光记录](ldct-exposure-numerics.md)。同一中间层、192×192对象、192个固定方向、计算间距2.261906215122768mm。每份无衰减入射计数50,000；第`j`份种子`28226 + 10000×j`（j从0起）。每份都是同一对象独立泊松计数，先累加、再除以总入射量取负对数，最后Ramp FBP：

```text
increment(j) ~ Poisson(50,000 × exp(-clean_projection))
total(n) = sum(increment(0..n-1))
measured(n) = -log(max(total(n), 1) / (n × 50,000))
image(n) = Ramp FBP(measured(n)) / spacing
```

前四份的增量、总计数、投影、FBP数组与上一版逐元素相同，主图和投影显示像素也完全相同。主图固定8位灰度窗[0.001,0.022]；投影固定窗[0,5.40106590453289]、共同64级显示量化。没有逐图变亮、磨皮、换角度或加病灶。

曝光份数没有临床mA/mAs或患者剂量标定。累计模拟计数不等于让患者连续补扫；源CT本来的噪声已经包含在数字对象中，不会被这个实验恢复。后几份变化自然趋小，不承诺每一下都出现明显新结构。

固定身体区域相对无噪声投影FBP的RMSE，仅作为内部计算核对：1份0.00056945，7份0.00021800，13份0.00016020。不是临床图像质量阈值或检出率。

## 迭代：0至12轮

三层分别对各自原有带噪投影进行迭代；每层每一轮都读同一份输入，不用后面累计曝光的更干净投影偷换结果。

- 零轮为零初值；每次推进执行一整轮SART，松弛0.055，衰减范围[0,0.06]。
- 每轮SART之后执行Chambolle TV约束，weight=0.00018、eps=0.0002、内部上限40步；视野之外置零。
- 图像窗一直[0.001,0.022]；没有逐轮归一化、渐变混合或把FBP模糊若干次冒充迭代。
- 已交付0/1/2/4/8轮的estimate、forward和residual数组逐元素相同；既有WebP主图逐像素相同。新增3/5/6/7/9/10/11/12轮都来自实际更新。
- 原始数组保存所有轮次的预测投影/残差，但不部署78张密集副图，以控制体积。新轮次不能用最近的旧投影/残差图冒充当前结果；前端新界面只展示该轮真实主图，原FBP作为固定比较。

中间层相对投影残差：1轮0.0319421，6轮0.0096764，12轮0.0085941；相对数字对象RMSE分别0.0016476、0.0006610、0.0005353。观察差异逐步趋小，不宣称迭代次数越多就必然具有更高临床价值。

## 压缩与接口

已有帧复用原图集，不重复打包。仅两张新无损WebP进入媒体：

| ID | 新帧内容 | 布局 | 字节 | SHA256 |
| --- | --- | --- | ---: | --- |
| `ldct_chest_exposure_v2_extra` | 曝光5–13份；第一行FBP、第二行投影 | 9列×2行，192px/帧 | 107,206 | `947217d13ae905d7eebb255f6edcc4238cd6a2584b8e52692a25ec707078de03` |
| `ldct_chest_iterations_v3_extra` | 3/5/6/7/9/10/11/12轮；三行是真实三邻层 | 8列×3行，192px/帧 | 178,466 | `fdc5509eb225847fe9f0b72bcee2f8cf14b877be2d7be871601800213f0a5f65` |

新增总计**285,672字节（约279KiB）**，没有大GIF、全部原始数组或复制旧帧。原始NPZ、元数据、接触表保存在仓库外`../ldct-cinematic-assets/numerics/`，不进入部署。

`app/src/game/ldct-deep-experiments.ts`：

- `LDCT_DEEP_EXPOSURE_VERSION='ldct-chest-exposure-v2'`；`ldctDeepExposureFrame/Style(kind,step)`支持`fbp|sinogram`、step0..12。0..3直接返回旧helper结果，4..12寻址新图集。
- `LDCT_DEEP_CHEST_VERSION='ldct-chest-iterations-v3'`；`ldctDeepChestFrame/Style('iteration:n',slice)`支持n0..12、slice0..2。0/1/2/4/8返回旧helper，其余寻址新图集。
- `LDCT_DEEP_MEDIA_IDS`只包含两个新文件；旧资源继续按原清单提供。参数非法、小数或越界均拒绝，不悄悄夹取错误帧。
- 版本用于识别新实验记录，旧胸部/曝光模块及其历史语义没有被重定义。背景URL仍从完整预载的`imageAsset`取得。

## 有限验收

```powershell
& 'C:/Python314/python.exe' scripts/generate-ldct-deep-experiments.py '../ldct-cinematic-assets/numerics'
& 'C:/Python314/python.exe' scripts/generate-ldct-deep-experiments.py '../ldct-cinematic-assets/numerics' --verify-only
```

生成约十余秒、验证约六秒。验证包括：源哈希/许可字段、13组独立计数与累加关系、总入射归一化、13次FBP独立重算、固定窗、39组预测投影/残差核对、新第6和12轮SART–TV独立重算、旧数组/实际WebP像素完全一致、新图集无损回读和总字节上限。没有第二次完整重算所有SART轮次，也没有重玩主游戏。

已查看`deep-review.png`的曝光1/7/13和迭代1/6/12关键帧：肺部、血管、心脏和胸壁位置一致；曝光颗粒减少，迭代从模糊轮廓逐步形成稳定细节。未对其中任何一帧单独修图。手机布局、存档恢复及点击行为由主实现的相关测试覆盖，此数值记录不冒充界面通关。
