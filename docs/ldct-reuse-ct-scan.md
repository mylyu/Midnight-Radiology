# LDCT复用第二章采集演出

2026-09-28；基点 `abbd5b0`，分支 `codex/ldct-reuse-ct-scan`。本地修改，不自动发布。

## 行为与复用边界

- 模体放床/退出机房 → `lf_phantom_scan` → 归位/回工作站；父亲床边近景 → `lf_father_scan` → 原检查结束对白。
- 直接使用第二章 `Ch2ScanOverlay`、`Ch2CtMotion`、`ch2ScanFrame`：3000毫秒、不可跳过、真实扫描录音、床位移动及机架前缘遮挡、进度条、手机布局、拒播不阻塞、离场清理都共用。不另造动画播放器。
- 公共组件仅增加可选 `motionSubject` 和 `renderSequence` 内容适配；第二章不传参数，原床层/序列/时钟/音量/剧情保持。
- 模体使用新透明床层，右侧不虚构相邻断层；父亲为双画面，用本DLC当前胸部数据的三个FBP相邻层，次序0→1→2→1，末帧与下一段首片相同。没有病灶圈/答案标记。
- 光子累积、FBP、迭代仍是工作站模拟和计算，不再次播放进床或曝光声。人物配音继续下架，不增加对话嘟声。
- 时间戳先写入独立 `dlc.ldct` 的 `scanSessions[nodeId]`，完成收据和下一节点一次提交；刷新按原时钟恢复，重复/迟到回调无效，不改变金币、属性或他章状态。旧v4不插新采集，已过插入点的存档不后退。

## 素材

复用第二章房间、患者床、故障回退整图、`ch2_ct_real_scan_20260924.mp3`，不复制文件。新增媒体登记在LDCT预载清单；下载完毕后使用原有Blob缓存。

新增 `ldct_ct_phantom_bed_v1`：ImageGen按原第二章透明床层和既有模体近景编辑，去患者、被单和头托，换圆柱模体与泡沫托架。提示见下。1672×941透明画布，以既有导入器q78/alpha100压缩，46,666B；alpha逐像素保持，交付SHA256 `d9dd8740463fe5b4f7c062bbe99564f4e1f75a2323b3661c1a928ab989e58e05`。原PNG位于本机生成档案，SHA256 `f81778674b76cfdb5d790a88e55f2c161270805c5406903d791f2e1b6d4d84c5`，不进部署。

生成器未精确保留床层位置，因此渲染时做**固定**对齐 `translate(-30px,70px) scale(.82)`（相对1672×941画布）；此值不随进度变化。运动仍是第二章的200px/-40px轨道位移。减少动态效果时保留固定对齐。模体素材故障只回退空机架，不能出现患者替身。

完整生成提示：

> Edit image 1 only as a pixel-art game animation cutout. Preserve its exact 1672x941 landscape canvas, transparent empty margins, bed board geometry/position, dark blue-grey lighting, pixel style and perspective. Remove the person, blue blanket and headrest completely. Keep the same flat CT table board from bottom-left to upper-right, EXACT same bed placement and bounds, without legs or base. Put the small grey cylindrical CT phantom with 2 large circular inserts and 3 small inserts from reference image 2 on a dark foam cradle near the head end of this bed (around x950 y425). Phantom roughly 170x160px, axis along the bed, face visible towards bottom-left. Image2 is only an object reference; NO people, hands, room, gantry, text or background from image2. Transparent background with genuine alpha. Do not crop, zoom or center the bed differently; output is an aligned replacement moving layer in an existing CT room.

输入1：`ch2_ct_motion_bed_v1.f1eaee8617eb5678.webp`；输入2：`ldct_cg_phantom_v1.9766d3c61e126709.webp`。本轮独立新ID，不覆盖第二章素材。

## 同轮数值改进

见 [低光子与FBP初值记录](ldct-noisy-fbp-start.md)：新增两张192px小图集，共483,662B；首曝光/首片/迭代0一致，固定显示窗。从原带噪FBP起步，每次点击一次真实SART–TV迭代，共12轮；旧记录与新输入版本分开。

## 有限验收与回退

只跑两处扫描、曝光/迭代初末/恢复、新旧数据状态、第二章默认扫描组件的定点检查；不重通第一二章。扫描声音为复用原批准录音，自动化只验证播放调度与拒播，不冒称新增人耳试听。结果与提交号见 `HANDOFF.md` 顶部。

回退按本轮交接/实现提交逆序 `git revert` 后重新构建；不清玩家存档，不hard reset。新存档记录不能靠Git自动回退，测试始终使用隔离浏览器存档。
