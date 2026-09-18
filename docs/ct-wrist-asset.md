# 腕部调窗模拟素材 · 2026-09-18

- 用户要求：生成可用于调窗的腕部图并放回第二日病例，不接受改用独立颅骨练习。
- 文件：`app/public/assets/ct_wrist_simulated.png`，1254×1254，内置 imagegen 生成；原图直接复制，未后期编辑。
- 画面：腕部近端、尺桡骨远端横断面示意。仅作灰度显示教学，不是真实患者、DICOM、实测HU或经过临床验证的解剖图；不能用于识别或排除骨折。
- `grayToHU(g, true)` 使用本素材专属单调分段映射。PNG只有8位显示信息，映射为模拟HU不会恢复真实CT动态范围；其他素材仍用原映射。
- 第二日三个节点和调窗任务均引用新图；取消上一补丁的“另调颅骨教学图”。未覆盖旧 `ct_bone.png`。
- 调窗界面显示模拟声明，并直接读取任务目标值，修复腕部/肺部任务原先误提示硬膜下窗的问题。未改奖励、通关阈值或音效。
- 验证：类型检查/构建通过；PNG可解码、采样覆盖255个灰阶、本地资源HTTP 200；腕部节点引用一致、映射单调、骨窗保留多个模拟骨灰度层级、窄窗出现饱和，原头颅映射不变。尚未进行游戏内完整浏览器流程回放。
- 回退前版本：`03431f1`。仅本地提交，不推送或部署。

## 生成提示词（内置工具）

Use case: scientific-educational. Asset: single square 1024x1024 grayscale simulated CT slice for a BME teaching game's interactive window width/level display. Generate anatomically plausible AXIAL cross section of ONE adult distal forearm immediately proximal to wrist joint: larger distal radius and smaller distal ulna, cortical bone rims, fine cancellous interiors, surrounding gray muscle/tendons, darker subcutaneous fat and thin skin boundary. Entire oval limb section centered with generous uniform pure black air margin. True cross-sectional tomographic appearance, NOT a projection hand X-ray, NOT coronal, NOT skull, not 3D rendering. One slice only. Preserve nuanced unsaturated grayscale detail in bone marrow and cortex so software can change windowing. Cortex bright gray, trabecular structure mid-bright, muscles medium-dark gray, fat darker gray. No fracture annotations or diagnosis, no text, no labels, no rulers, no watermark, no border, no colored elements. Educational synthetic anatomy, not an actual patient scan.
