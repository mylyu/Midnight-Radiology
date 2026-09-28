# LDCT 本地打磨：慢反投影、胸部切片与场景小物

基点 `a8a9305`，分支 `codex/ldct-media-polish`。作者认可父亲故事后要求简化工具、反投影慢慢投回、采用开放肺部CT、小物图示/电话音效/人物开场短语音。只改LDCT，不改主线章节、DR/DSA、既有媒体；本轮不发布。

## 玩家感知与边界

- 反投影按1、2、4、8、24、160方向的**已有实际计算帧**每1150ms推进，全程约5.75秒；暂停/继续/重播，失焦暂停，刷新停在已保存帧。不是透明渐变，也不是重新给患者扫描。小参照始终保留，BP与不滤波显示等价不变。
- 默认保留主图与主要动作；滤波扩展、响应曲线、固定/标记及各轮次放入可展开区域。球管—接收器演示原样保留。
- 胸部使用AortaSeg-60 / Nat_07的三邻层，重新产生模拟投影和计算结果，非照片磨皮；来源及参数见 [胸部数值记录](ldct-chest-numerics.md)。两图集442,562 B，较旧652,034 B少209,472 B。
- 来源变更登记为`ldct-chest-open-v2`。旧`ldct-chest-v1`记录仍可读；旧胸部草稿/固定版/标记归档到`previousChest`，不能套在新解剖上；故事游标、完成状态、其他草稿、属性及奖励不重置。
- 单据使用代码绘制的小SVG（无身份、价目等伪文字），笔记与片袋复用现有小图；新增饭盒像素图。物件由具体剧情节点配置，不抢占人物区域或截获点击。
- 仅父亲实际来电时播放现有短铃声`ch2_mobile_call_v1.mp3`，不把拨出电话也误配来电铃声；远程通话小图标不使通话人实体出场。新增语音仅在陆舟、老周、小何第一次相应出场时播放。父亲候选重复或有额外尾词，本轮未采用，保留无声，不能把废稿混进交付。
- 新音频由章节预载提供Blob；消耗收据与剧情游标分离，无音频结束锁。静音/后台不迟到追播，刷新不自动重放，离场停音；拒播可手动播放且不影响对话。顶部“剧情音”只控制新增人物声/来电，原有UI轻提示不变。

## 新图来源、提示词与交付

**饭盒**：AI新建像素道具，使用内置ImageGen；原图位于仓库外`../ldct-media-polish-assets/meal-original.png`，不入部署。没有参照输入。完整提示词：

> Use case: stylized-concept. Asset type: transparent pixel-art visual-novel inventory sprite, one single prop. Subject: a modest Chinese hospital night-shift takeaway meal, open off-white compartment lunch box holding rice and two ordinary cooked side dishes, a pair of plain wooden chopsticks laid diagonally on its near edge. View three-quarter from slightly above; centered single lunch box, plenty of empty padding; no other separate objects. Style: chunky square pixel clusters, dark navy outlines, restrained ochre/olive/off-white palette, tiny warm highlights and cool shadows, coarse high-resolution pixel painting compatible with a 1990s-inspired Chinese hospital visual novel. Must stay clearly pixel art, not smooth anime or photorealism. True transparent alpha background, no scenery/table/hands/person, no text, no logo, no watermark, no visible steam. Square composition 1024x1024. This will be displayed as a small in-story prop, not a background.

交付`app/public/assets/media/ldct_item_meal_v1.cefcc9163c26942d.webp`：256×256、WebP q78/alpha100/effort6，nearest缩小，14,346 B。SHA256 `cefcc9163c26942dce56028938ae0dc709b9ae4f3475814475c4f4c4719f3ea0`。实际看过生成图和小图；使用透明边缘，不放大作背景。数值图不是ImageGen产物。

**音频**：新文件命名`vox_ldct_*_v1.mp3`，不覆盖批准旧配音；生成参数、参考文件及候选淘汰见 [音频记录](ldct-media-audio.md)。自动转写与声音模型检查不是作者听验，不据此宣称自然度已获认可。

**旧图归档**：只移走已无业务/catalog引用的两张旧胸部图：`ldct_chest_v1_images.c254e24eedba683d.webp`、`ldct_chest_v1_projections.072a9d6cf5943736.webp`。仓库外`../ldct-media-polish-assets/previous-delivery/`和Git都可恢复。共享图片和原已批准声音不删；原始NIfTI/NPZ/大检查图/试听候选不入public。

## 定点验收范围

这轮是单DLC工具呈现/来源迁移/场景声音修订。先纯状态核对旧记录、来源重置、奖励与音频收据，再定点浏览器检查反投影计时及三个屏宽、工具折叠/恢复、物件、来电/拒播/刷新/离场。不重复通关主游戏，不跑全仓历史测试。最终结果及体积见HANDOFF本轮条目。

回退采用本轮提交的`git revert`（媒体/运行时需一起回退）；不要清用户localStorage或hard reset。Git不能回滚浏览器已经发生的游标/收据。
