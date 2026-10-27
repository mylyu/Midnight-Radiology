# 超声章：对话物件特写与看片选择（2026-10-27）

基点 `6f4e7fe`，分支 `codex/ch3-picture-observations`。本轮仅本地，不推送、不部署。

## 玩家可见改动

- 探头、模体、耦合剂、标签机、小卡等原有物件居中展示；宽屏宽度上限820px，按实际工具栏与对白高度留下图片空间。原来只有320px且靠右。普通对白组件、推进和防连击不变。
- 梅姐培训照片原来只有台词，没有对应图片。新增像素合照：梅姐抱教学模体，主任抱打印纸，旁人抱花。五班可触发的小毛巾支线均在 `towel_use_1..4` 持续展示同一张照片，离场清除；不借用前章1998旧照。
- 许建平来院改为主角到候诊区叫号、提醒他拉好资料袋，随后进诊室。删除表姐在该段的对白、实体立绘和交班时“刚回家”的牵连；不改表姐自己检查、后续MRI待报告及许建平寻父线。
- 四处直接用原对白选项看图：乳腺后方增强、胆石声影、肝/右肾辨认、镜像重复结构。各三选一（含求助）；正确医术＋1，错答/求助不扣分、不重答，均由梅姐短句解释后接回原剧情。没有独立考试界面。
- 胆石原共同解释的医术＋1迁到正确回复，不叠加；原卡片、勋章、病例旗标仍在原位置发放。其余三处为新正确观察奖励，因此全部答对相比基点净增3点，不设置新的属性上限。
- 390px竖屏保持图在对白上方；矮横屏只在病例图显示时采用左图右对白，避免三条选项把图挤成80px小图。普通对话与物件特写不采用这种分栏。

## 图片答案与状态

先实际查看 `us_breast`、`us_gallstone`、`us_c3_hepatorenal_v1`、`us_mirror`、`us_echo`、`us_fetal`，再确定前四张的观察；不更改病例图。

| 题目节点 | 可见依据 | 正确回复收据 |
|---|---|---|
| `c3_breast_observe` | 中央偏上黑椭圆下方比同深度两侧更亮 | `c3_breast_right` |
| `c3_s1_stone_4` | 亮点正下方向屏幕底部延伸的黑带 | `c3_s1_shadow_good` |
| `c3_liver_observe` | 右下长椭圆为右肾，中央亮、外圈较暗；左上大片及周围为肝 | `c3_liver_compare` |
| `c3_s3_mirror_2` | 弧形亮线两侧可见相似分叉结构 | `c3_s3_mirror_check` |

位置按屏幕方向，不能将屏幕左右当患者左右；肝肾图不写成脾脏。胎儿图无测量刻度，静态心超图也不能用来判断瓣膜运动或冠脉支架通畅，因此不强塞定位题。删掉声影与重复结构的题前答案旁白，题前不发对应答案卡，选项颜色相同。

数据安装在 `ch3-picture-observations.ts`，复用 `trilogyChoose` 与 `enterTrilogyNode` 的原子保存。正确反馈节点的 `applied` 收据防重复；新界面只显示真实差值的原中央无声冒泡。保留既有节点ID，旧档不回退、不追扣既得分数，也不因读档补发新奖励。旧许建平候诊游标直接读取改后的相应节点。

## 培训合照来源与压缩

- 工具：内置 **image_gen**，参考 `char_mei`、`char_director`、`item_c3_us_phantom_v1`，新生成，无修改旧资源。
- 原图：`C:/Users/lvmen/.codex/generated_images/01a03d87-f338-71d1-ac31-cfd37ee2d8bb/exec-0663383b-8281-49e9-8695-a8129ffc1b68.png`。
- 原图 SHA256：`bfb5ffa6efa7b3a0ece8fca208f5bce1a87367d382a94670e0e2adfd4a36636e`，2,464,884B，1536×1024。
- 经 `node scripts/import-image.mjs <原图> item_c3_training_photo_v1` 导入，WebP q78/alpha100/effort6，不改变画布。交付194,106B，约189.6KiB。
- 交付路径：`app/public/assets/media/item_c3_training_photo_v1.62d0e87653525de7.webp`。
- 交付 SHA256：`62d0e87653525de764537144fe2c70571bfd5c295e0c7ce990c993180ca8ebcc`。只加入CH3预载；没有新音轨、原始大图、候选或提示标语进入游戏。

实际生成提示词：

> Use case: illustration-story. Create ONE new landscape 3:2 pixel-art illustration, a slightly faded printed training group photograph for the Chinese hospital game Midnight Radiology. Reference 1 is Mei, short wavy dark brown hair, arched eyebrows, purple knitted shirt and white lab coat. Reference 2 is the middle-aged male department director, swept-back greying dark hair, broad eyebrows, white lab coat, dark necktie. Keep both recognizable, a few years younger, natural playful expressions. Reference 3 is the rectangular tan ultrasound training phantom in a navy tray, use this recognizable object. The printed photo fills the image with a narrow worn ivory paper border. In the photo, Mei is center-left holding the tan phantom on its tray awkwardly in both arms; the director is center-right holding a cardboard box of several plain white copier-paper reams, laughing at the situation. Two other generic training attendees at far edges hold small flower bouquets. Modest hospital training room behind them, a partly visible ultrasound cart, warm daylight. Framed waist-up to show faces, hands and the two humorous objects clearly. Very clearly coarse pixel illustration with square pixel clusters, deep outlines, limited palette, same visual impression as the references. No realistic photography, no smooth vector art. No captions, readable writing, labels, watermarks, needles, disturbing elements or unrelated mystery symbols. No dark destroyed strip or transparency defects from reference 2; those are not part of this character. This is an ordinary friendly training memory photo.

## 最小验收与回退

- 状态：`ch3-liver-story`、`ch3-parity-story`、`ch3-picture-observations`、`ch3-focus-state`。四题12条正确/错误/求助路线、恢复/重复提交、旧已读节点不补奖、其他章进度隔离、许建平各节点无人像残留、五班培训照都通过。旧测试仅修改已获批的观察奖励预期。
- 浏览器：隔离Edge定点夹具 `CH3_EQUIPMENT_FILTER=centered-closeups-and-picture-observations`，1920/2560宽屏、390竖屏、844×390横屏。实际图字节匹配预载清单，图片/选项不遮挡，正确选择出现医术＋1冒泡，刷新不重发。截图/报告在仓外 `../ch3-picture-observations-review/ui/`。这是定点验证，不宣称完整通关。
- 编译/体积：类型检查与生产构建；首次体积检查因新增CH3数据模块未登记归属而拒绝将整个章节数据chunk计为独立章节，将精确路径加入既有来源清单后重测。17MB原内容上限、未知/公共代码保护和哈希核验不放宽。`trilogy-delivery-code`负例测试通过。新模块eslint通过，未重跑全仓历史lint。
- 回退：`git revert <本节对应提交>` 后重建。一次回退图片、布局、选择和配套记录；不清除玩家存档。第一二章、DR/DSA/LDCT剧情/资源/数值及批准配音没有修改。
