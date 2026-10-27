# 第三章梅姐轮岗告别近景（2026-10-27）

## 用途与范围

作者要求在超声轮岗结束前增加梅姐鼓励主角的特写。本图用于日间收班时的自然鼓励对白；剧情接入和轻微镜头推拉由章节配置负责。新增独立 ID，不覆盖现有立绘、入科近景或其他章节素材。

- 逻辑 ID：`cg_c3_mei_farewell_v1`
- 交付路径：`app/public/assets/media/cg_c3_mei_farewell_v1.ec2b545c5442803b.webp`
- 1672 × 941，有损 WebP q78，140,226 字节（约 137 KiB）。
- 生成方式：Codex 内置 `image_gen`，一次生成，无额外修图；不使用 API/CLI 备用方案。
- 来源：按本项目既有角色和场景参考生成的新画面，无新引入的第三方摄影素材。遵循仓库现行 LICENSE/NOTICE；本记录不是作者单独审美批准的声明。
- 原始 PNG 保留仓库外归档 `ch3-mei-farewell-20261027/mei-farewell-original.png`，不进入部署包。

## 参考与身份一致性

先直接查看以下三张现有资源，再作为工具输入。以实际已用立绘为准：梅姐是深棕短发、紫色针织内衫、白大褂，不能按文字记忆误换成另一种服装。

| 参考 | 用途 | SHA-256 |
| --- | --- | --- |
| `char_mei.c765a0bad23431c7.webp` | 人物身份、服装、像素比例 | `c765a0bad23431c72bfdf3bced3223d5b771f8c723c01a0b234957f38dc4710d` |
| `cg_c3_us_visit_v3.683d78eddc52974a.webp` | 同人近景与像素绘画观感 | `683d78eddc52974ab6ca80eb6edbd9416327708772aa4dc165fbf8eab8594789` |
| `bg_us_room_day.33d4b0ae483eea87.webp` | 白天超声诊室、设备和日光方向 | `33d4b0ae483eea8749fdcd642c0bf450790f059e0774eaa6b35c70fbae9ffa6c` |

## 完整生成提示词

```text
Create ONE finished horizontal 16:9 raster game cutscene, ideally 1536x864 or comparable landscape size, for the Chinese pixel-art visual novel Midnight Radiology. The three supplied local reference images have distinct roles: reference 1 is the exact character identity and costume of Mei; reference 2 defines the approved pixel painting character rendering and the same woman's appearance; reference 3 defines the daytime ultrasound room furnishings and lighting. This is a NEW scene, not a layout montage.

Scene: last afternoon of an ultrasound department rotation, all patients have left. Mei is giving the unseen player a quiet, genuine word of encouragement before they leave. Waist-up close shot, Mei occupying the central 60 percent, facing and looking slightly toward the camera/player, a relaxed modest smile and warm, confident expression. She is a mature Chinese female clinician, same face and short side-parted wavy dark brown hair with warm chestnut highlights as the references; white coat with sleeves naturally pushed up over the SAME muted plum/purple ribbed knit top, dark watch and chest pocket pen. One hand loosely holds a blank training evaluation sheet with only subtle empty table lines, the other rests a capped pen across the sheet. Correct natural hands. No ceremonial pose, no thumbs-up, no raised lecture finger, no bow, no trophy. A friendly colleague saying “You've picked this up quickly” in a quiet room, not a motivational poster.

Behind her, softly simplified but still crisp pixel-art shapes: the familiar pale teal cabinets, afternoon sun from the right, a wheeled ultrasound console and probe holders just behind one shoulder; a tiny generic grey ultrasound wedge on its monitor, and clean examination bed at the far edge. Character face has strongest contrast. Camera at eye level, comfortable perspective. Allow a little framing space around her head/shoulders for a gentle in-game push-in. The player is NOT visible: no second person, no hands in foreground, no cropped silhouette. Do not put any text, logo, labels, words, digits, subtitles or watermark anywhere in the image.

ART STYLE IS CRITICAL: reproduce reference 2's recognizable coarse high-resolution PIXEL PAINTING with visibly stepped/blocky contours, dark outlines, clusters of hard-edged square pixels in shading and clothing, restrained warm skin palette and cool teal surroundings. Hand-crafted retro adventure-game cutscene, no photorealism, no smooth anime gradients, no airbrushed face, no soft-focus rendering. Keep Mei clearly the same character and age, not a young student. Opaque background.
```

调用参数为 `transparent_background: false`，`referenced_image_paths` 按上表顺序传入三个本地文件。工具没有另行暴露模型名、采样种子或分辨率参数，不虚构这些值。

## 导入记录

通过 `node scripts/import-image.mjs <仓外原图> cg_c3_mei_farewell_v1` 导入，默认编码不缩小、不裁切；没有覆盖旧 ID，也没有改写历史审核清单。

```json
{
  "name": "cg_c3_mei_farewell_v1",
  "replaced": false,
  "sourceArchiveName": "ch3-mei-farewell-20261027/mei-farewell-original.png",
  "sourceSha256": "d57797992d1a286cf1580233f760385d17a045e398d78f38953323bc16df006c",
  "sourceBytes": 1943572,
  "pipeline": "manual-import-webp-q78-alpha100-v1",
  "encoder": {
    "sharp": "0.35.3",
    "webp": "1.6.0"
  },
  "mode": "lossy-webp",
  "quality": 78,
  "width": 1672,
  "height": 941,
  "alphaExact": true,
  "visibleRgbExact": false,
  "rgbaExact": false,
  "visibleRgbMeanAbsoluteError": 2.5485,
  "deliveryPath": "app/public/assets/media/cg_c3_mei_farewell_v1.ec2b545c5442803b.webp",
  "deliverySha256": "ec2b545c5442803bf433603269f4a748728b69bbec843bdd221280464de5fb75",
  "deliveryBytes": 140226,
  "previewUpdated": false,
  "previousDeliveryPath": null,
  "stalePathCandidates": []
}
```

## 本次看验与限制

直接查看了原图和压缩后 WebP。梅姐的短发、面容、紫色内衫与原入科近景对应；画面是日间超声室、上半身近景、自然微笑，持表与笔，两手结构可辨。轮廓为深色阶梯像素边，衣服和柜体保留块状明暗。背景设备可辨，主角没有被画入，兼容所选性别。没有对白字幕、水印或额外素材说明；背景仪器细节只是场景，不作为医学观察题使用。

压缩后脸部、手部和轮廓未见明显破损，尺寸和透明通道检查由导入器通过，体积低于 600 KiB 上限。不据此宣称浏览器镜头/布局验证通过；主任务接入节点后统一验证桌面与手机显示。未在子任务中构建或提交。

## 回退

撤回使用此 ID 的新剧情引用后，再撤回这一个 catalog 条目、新 WebP 和本文即可；不要删除既有梅姐资源。完整提交回退号由本轮交接记录给出。

