# 第四章设备送货员立绘补齐

2026-11-23，作者要求排查人物已开始说话、立绘却缺失的场景。设备送货员原定义的 `sprite` 为空，本轮补一张独立立绘；不将患者或老范冒用为送货员。

## 来源与视觉复核

- 工具：内置 `image_gen`，原创生成一张；未使用CLI/API备用路径。先查看现有 `char_fan`、`char_zhou` 作为画风观察，生成请求未附输入图片。
- 内容：普通中年男性设备送货员，深蓝工作服、短发、站立全身、手持卷尺；无白大褂、伤情、姓名牌文字。与老范分开脸型，保留深色轮廓及像素块观感。
- 生成要求透明底；源文件确有alpha，交付保留透明。已目视检查原图和320×480交付图，完整头脚与卷尺可见，没有文字或背景场景。
- 原图归档在仓库外 `review-20261123/ch4-portrait-timing/char_c4_courier_v1-source.png`，不进入部署目录。游戏侧是否显示及何时播放语音由本轮主修复记录验证。

## 生成提示词

```text
Use case: stylized-concept. Asset: one full-body transparent character sprite for the Chinese pixel-art hospital story game Midnight Radiology. Create a middle-aged Chinese medical-equipment delivery worker, about 45–50, sturdy ordinary build, short dark hair flecked with gray, calm mildly wry face, clean-shaven, clearly a different face from the existing balding hospital maintenance man. He stands at a natural three-quarter angle facing slightly toward the viewer's right, both boots fully visible. Dark navy blue work jacket and matching practical trousers, sleeves partly rolled up, plain dark work boots. One hand holds a small yellow retractable measuring-tape housing at his waist; the other hand lightly extends a short section of the measuring tape horizontally. No printed marks need be readable. Match a restrained 16/32-bit adventure-game sprite: visibly coarse square pixel clusters, dark outline, warm face highlights, limited shaded palette, substantial normal adult proportions about five heads tall, no smooth airbrushed digital painting, no photorealism, no chibi. Single isolated figure centered with modest transparent padding, full head-to-foot view. Daytime-neutral illumination so face and navy clothes read clearly against dark hospital backgrounds. True alpha-transparent background, no ground or shadow disc, no background scenery, no lettering, no logo, no watermark, no white coat, no injuries, no patient accessories, no other people.
```

## 交付参数

- 新逻辑ID：`char_c4_courier_v1`。
- 原图1024×1536 PNG → sharp 0.35.3，最近邻缩至320×480；WebP `quality=78, alphaQuality=100, effort=6`，保持像素边缘，不放大。
- 压缩后通过 `node scripts/import-image.mjs <reviewed.webp> char_c4_courier_v1 --keep-webp` 导入，无二次有损编码。
- 交付：`app/public/assets/media/char_c4_courier_v1.d2fb25c7abc4b289.webp`，15,518字节；SHA256 `d2fb25c7abc4b289db957c7ca943173daf69acf6d4d6f7beb0e0e37436bc3b3a`。
- 导入器核对320×480、alpha/RGBA与已审核WebP完全一致；无旧图替换/删除，无预览catalog变化。源PNG哈希和导入机器记录见 `ch4-courier-portrait.json`。

回退随本轮修复提交使用 `git revert`；不清玩家存档。新图不替换其他章节人物。
