# 乳腺囊肿：钼靶与B超并排图

2026-10-27；基点 `aea158a`，分支 `codex/ch3-breast-cyst-compare`。本轮仅本地制作，未推送部署。

## 接入

- 原 `c3_breast_observe` 使用原来的 `us_breast` 图和选项；三种反馈均接 `c3_breast_compare_0..4` 五句短对白，最后回到原 `c3_s1_aunt_9`。先看后答，答后再展示对照/解释，无新奖励、扫描、声音或答题要求。
- 原来的答对医术＋1及其去重、求助/错答继续、诊室报告流程保持。新节点可原位恢复；已越过本段的旧档不倒退补演。
- 阿姨此例限定为**单纯性囊肿**，也说俗称水泡、水囊；不将不同囊性肿块都写成“恶变率小于1%”。美国癌症协会/ASCO审核资料说明单纯性囊肿充满液体，不增加乳腺癌风险；复杂囊性含实性部分者不能一概而论。依据：https://www.cancer.org/cancer/types/breast-cancer/non-cancerous-breast-conditions/fibrosis-and-simple-cysts-in-the-breast.html （2026-10-27核对）。游戏只保留简短角色对白，不加AI提示或素材免责声明。

## 图像来源、参数

- 内置 **image_gen/imagegen** 生成的新图；不是实际患者资料，未将生成影像冒称真实扫描。先检查旧 `us_breast` 的椭圆无回声及后方增强观感，生成时未提供参考文件；主流程保留旧原图。
- 原始PNG：仓外 `../ch3-breast-cyst-review/breast-cyst-comparison-original.png`，1536×1024，2,275,484B。原始SHA-256：`235c6aca28ce9354d5e0fdcb330e5838279be25f4e4df33ada8a09cf7dd32181`。
- 导入器 `node scripts/import-image.mjs <original> us_c3_breast_cyst_compare_v1`：WebP q78/alpha100/effort6，原尺寸，125,200B。交付 `app/public/assets/media/us_c3_breast_cyst_compare_v1.68a439c0a886f9b3.webp`，SHA-256 `68a439c0a886f9b3380bec0c99636f03b4d0c0165751ece82e8268fa8632b2ad`。新图单独加入CH3完整预载，不覆盖第一章或现有超声图。
- 画面检查：左边为钼靶轮廓和边缘光滑的密度影，右边为薄壁黑色椭圆、内部无实性结节并有后方增强；只有“乳腺钼靶”“B超”两个标题，避免在原观察题中泄题。无个体身份资料。

## 完整生成提示词

```text
Use case: scientific-educational.
Create one polished raster medical imaging comparison plate for a Chinese hospital story game, landscape 3:2 aspect ratio, two equally important panels on a plain near-black background with a thin dark gray separator. Only two headings: left exactly "乳腺钼靶", right exactly "B超". Large clear simple white Chinese letters at the top; no other text, no watermark, no arrows, no circles, no decorative icons, no diagnosis labels, no warning or disclaimer.
Show the SAME fictional simple breast cyst with clinically plausible grayscale appearance in the two different modalities. These are plausible game images, not a document screenshot.
LEFT: a clean full-field craniocaudal mammogram of one breast, breast contour and thin skin line, mixed fibroglandular tissue with realistic fine grayscale X-ray texture. A single conspicuous but non-exaggerated oval circumscribed homogeneous soft-tissue-density mass in the central outer half, smooth border, no spiculation, no architectural distortion, no suspicious calcifications. The mass should appear relatively white/gray, not a black hole, not an ultrasound image. It must be plausible as a mammographic mass without pretending mammography alone proves a cyst.
RIGHT: rectangular linear-probe B-mode breast ultrasound field, skin and superficial fat at top, layered breast parenchyma with realistic ultrasound speckle, a small horizontal oval simple cyst centered in the upper-middle depth, approximately one fifth of panel width. Interior completely anechoic black, imperceptibly thin smooth wall, no septa, no mural nodules, no internal solid echoes. Clearly visible moderate posterior acoustic enhancement directly beneath the cyst extending into deeper tissue: deeper tissue there is brighter than tissue at the SAME depth on either side; no black posterior shadow. Keep convincing breast ultrasound layered background, not circles floating in black space. Cyst is a closed ellipse with no connecting duct.
Match the existing game's medical-image presentation: crisp realistic grayscale scan textures, no patient skin photo, no external breast/body photograph, no exposed person, no fantasy or cartoon radiology. Both image fields large enough to compare on phone, tightly composed, small margins, no scanner console or physical frame.
```

## 验收与回退

- 风险R1：相关 `ch3-picture-observations` 状态测试覆盖正确/错误/求助、旧奖励收据、五句接续/恢复及无新数值变化。
- 一次生产构建包含类型与完整资源/体积检查；保持原Vite大包警告，没有重复全仓lint或重玩整章。完整部署26,080,709B，CH3预载3,547,231B。
- UI仅检查桌面/390px两处对照图居中、原问题仍用旧图、五句后退图、数值不变；截图留仓外。实际结果记入HANDOFF。
- 回退本轮提交后重建即可，不需要清档或重置其他章；已获得数值不追扣。
