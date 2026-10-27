# 第三章：血管彩超与大办公室

2026-10-27，基点 `200bca8`，分支 `codex/ch3-doppler-office`。本地实现，未推送或部署。

## 玩家可见改动

- 第四班 `c3_s4_clinic_0..2` 连续居中展示同一条颈总动脉的灰阶/彩色血流对照。对白根据实际画面说明先认血管位置、再参考色条看血流相对探头的方向，不把红色等同于动脉。不增加题目、采集、分数或新声音。
- 三句结束后退去影像、恢复梅姐立绘，接原有午后多普勒演示。已有 `c3_trace` 卡片挂同一图，获得后可在手册回看。
- 第三章所有原 `bg_office_day` 映射改成第二张新图：多人共用大办公室。包括排班、阅片资料、递清单、小雷与韩经理核对、老周与章末材料场景；地点入口明确写“大办公室”。原主任单间素材保留供其他章节使用。
- 未修改第一二章/DR/DSA/LDCT、普通对白组件、手机布局、配音、节点连接、探索成本、奖励和存档结构。已有存档在原节点直接使用新图。

## 素材、许可与压缩

| 资源ID | 尺寸 | 交付大小 | SHA-256 |
|---|---:|---:|---|
| `us_c3_color_doppler_v1` | 1024×698 | 33,108B | `aca91febb9925835b00afef6c7aa3c9075d229391ea88061c20588eca3fbc2bd` |
| `bg_c3_shared_office_day_v1` | 1672×941 | 164,042B | `ef850712677b87db782d0ef22093f35bef49ace8c2f1715b748d74c20169d56e` |

均通过 `node scripts/import-image.mjs <仓外原图> <资源ID>` 导入，WebP q78 / alphaQuality100 / effort6，保留原尺寸。生成图请求2048×1152，工具实际输出1672×941，按实际尺寸验收，无放大。正式资源在 `app/public/assets/media/`，文件名含内容哈希。catalog、背景预览和整章预载同步登记。

### 颈动脉图

Cerevisae（2023），[Right common carotid artery without and with doppler flow](https://commons.wikimedia.org/wiki/File:Right_common_carotid_artery_without_and_with_doppler_flow.jpg)，[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)。只转WebP，不裁切、不重绘、不添加血流颜色。保留左灰阶、右彩色、色标和原有标注；图中主要血管显示红色，不能为展示红蓝两色而凭空补另一条血管。

原图：仓外 `../ch3-doppler-office-review/source/carotid-cerevisae-2023.jpg`。影像独立保留CC BY-SA 4.0，不能把项目NC-SA许可套给该图；图注署名，`NOTICE`及随部署的 `app/public/ch3-ultrasound-sources.txt` 提供完整来源、许可和变更说明。原图未标患者姓名或ID；医院对白是虚构情节。

### 大办公室图

使用内置imagegen，以已批准的 `bg_us_room_day`（空间材质/像素风）和 `bg_office_day`（仅色调）为参考，生成新的多人共享办公室，没有覆盖旧图。

原图保存于 `C:/Users/lvmen/.codex/generated_images/01a03d87-f338-71d1-ac31-cfd37ee2d8bb/exec-e2f474dd-6c63-45bb-b28c-d973f4a657b2.png`，2,232,776B，SHA-256 `4419ef43a25b92c86f40b680f7cfc5e41f32d8a9bc68cd4193eea51207ef89b3`。

生成提示词：

> Use case: illustration-story. Create a NEW 16:9 wide game background at 2048x1152: the shared large staff office of a modest Chinese county hospital ultrasound department in daytime. This is a communal workplace for several colleagues, NOT a director's private office. Input1 provides the hospital's teal-green cabinets, cream walls, warm daytime lighting and coarse high-resolution pixel-painting style. Input2 provides material/color references only, DO NOT reproduce its single executive desk, director nameplate or labels. View from the doorway into a spacious but ordinary working office, clear perspective. Four to six modest equal-sized desks arranged in two groups with several computer monitors/keyboards, paperwork, pens and personal cups; office chairs, shared printer/copier on a side cabinet, shelves of folders, a teaching-image workstation, wall duty schedule with abstract unreadable marks, broad windows letting in pale autumn daylight. Teal green and aged wood furniture. Visible multiple workstations so nobody mistakes it for a one-person boss room. Keep the lower foreground center open for dialogue overlay and the left/right foreground open enough for character sprites. No people in the background, no examination bed, no CT scanner, no luxury executive chair, no huge foreground desk. Distinct blocky pixel clusters and dark outlines, coherent with input1, textured painted pixel art rather than photorealistic or smooth vector illustration. No readable words, slogans, captions, watermarks or added AI notice. One full-bleed game background, no border.

## 最小验收（R1）

- `node --import tsx tests/ch3-parity-story.mjs`：通过。新增三句影像/退场/卡片/预载/大办公室映射断言，原奖励、电话、送礼检查保留。
- `node --import tsx tests/ch3-places.mjs`：通过，地点分组、原行动力和完成隐藏正常。
- `npm run build`：类型、生产构建、资源清单与体积保护通过；保留既有Vite >500kB代码块提示，未改预算。整包25,915,673B，CH3完整预载3,398,437B/77文件；较基点少94,252B，原因是本章不再预载较大的主任单间图。其他章节预载列表没有变化。
- 隔离Edge具名夹具 `CH3_EQUIPMENT_FILTER=doppler-and-shared-office`：1920×1080和390×844，11秒通过。真实预载/图片解码与哈希核对；连续推进三句彩超对白、检查图注不挡对白、无人物遮图、后继退场及梅姐恢复；办公室两个同事同场、正确新背景。没有改玩家存档或全章重玩。
- 已肉眼查看压缩彩超及四张实际浏览器截图：灰阶血管和红色血流仍清楚，图片居中；办公室是多工位/共用打印机，不再出现主任桌牌。报告与截图在仓外 `../ch3-doppler-office-review/ui/`。

## 回退

本轮一个独立提交；`git log -1 codex/ch3-doppler-office` 查询提交后执行 `git revert <该提交>`，再在app中重建。不要reset、删玩家存档或改其他章节。原单间背景仍在仓库，可直接恢复映射。
