# 第四章MRI基础题补充

2026-11-23；基点 `40bbb7f`，分支 `codex/ch4-quiz-basics`。原8题保留原顺序和答案，末尾追加8道三选一单选，题库共16题；现有抽题仍随机抽5道、不重复，选项顺序打乱。每题保留简短解析。剧情、图片、配音、考核交互及计分不改。

新增考点：氢核与水/脂肪、MRI与CT的成像手段、热平衡净磁化、拉莫尔频率与主磁场、射频共振条件、横向磁化的电磁感应接收、k空间与傅里叶重建、体素与分辨率/信噪比取舍。难度以基础概念为主，不加计算题。

## 核对依据

内容用自行编写的中文题干与解析，不搬资料原句；来源只记开发文档，不塞进游戏选项。

- NIH/NIBIB，[Magnetic Resonance Imaging](https://www.nibib.nih.gov/science-education/science-topics/magnetic-resonance-imaging-mri)：MRI的磁场、射频与氢核信号。
- Chappell、Okell、Jenkinson，[Oxford Neuroimaging Primers: MRI Physics](https://www.fmrib.ox.ac.uk/primers/appendices/mri_physics.pdf)：净磁化、拉莫尔频率、射频激发和成像基础。
- 密歇根大学MRI课程，[Signal Equation and Fourier MRI](https://courses.lsa.umich.edu/fmri-training-course/wp-content/uploads/sites/17/2022/08/MRI_Physics_Lec2_MagFieldGrads.pdf)：编码后的空间频率与傅里叶重建。
- Macovski，[Noise in MRI, 1996](https://pubmed.ncbi.nlm.nih.gov/8875425/)：固定其他因素时，体素体积与信噪比的关系。

## 兼容与验证

现有 `quizContent` 保存整套出题时题库，`quiz.questions` 保存本轮题号及选项顺序。题库扩充不替换进行中的考核，也不重抽或重发奖励；无快照的历史考核继续走既有历史兼容逻辑。本轮不改播放器、存档结构或旧题索引。

仅更新现役MRI数据测试中本次获批的题量与新增考点断言，保留三选项、唯一选项、答案范围和零分无参与奖励检查。不新增浏览器全章通关。

已通过MRI现役数据测试、类型检查和一次生产构建。定点纯状态核对16题均可抽到、每次5题不重复、各题三选项随机排列；新考核刷新不重抽，已答一道的旧8题考核经序列化/恢复后题目与作答保持。共享保护内容仍16,997,225字节；完整构建28,178,581字节，新增仅章节代码2,548字节，媒体不变。已有大chunk提示保留。

最初本地保存为 `9203abf`；作者随后授权与表姐配图一起发布，已随游戏提交 `750a7cb` 推送main并成功部署Pages（运行45115310946）。题库独立回退用 `git revert 9203abf`，不清玩家存档。
