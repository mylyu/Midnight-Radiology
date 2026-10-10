# 第三至五章短出场声与设备声 · 2026-10-10

本批从 `codex/trilogy-experience-parity` 的 `7fad7b7` 制作，共21句角色短声和3条三秒设备声。只新增本专题脚本与记录；本音频流程不改第一二章、DLC、游戏映射、资源总表或交接文件。使用新ID，旧批准声音不覆盖。原始WAV、参考快照、未选候选、母版与48 kbit/s交付MP3均在仓库外 `../trilogy-experience-assets-20261010/audio/`，正式导入由主任务完成。

## 台词与参考

所有句子均不超过8个汉字，完整人物描述、目标时长与固定种子见 [trilogy-voice-lines.json](trilogy-voice-lines.json)。新人物先选一次音色；同角色未来需要新句子时沿用 `audio/references/` 的固定声音，不重新设计音色。回访人物使用游戏当前实际播放的同角色文件，避免把旧候选或同名他人当成参考。

| ID | 人物 | 台词 | 参考策略 |
|---|---|---|---|
| vox_c3_mei_v2 | 梅姐，43岁 | 来啦？这边。 | 首条无参考；一次修正用自己的首条音色 |
| vox_c4_xuning_v2 | 许宁，30岁 | 来，认个门。 | 新角色无参考，固定首次音色 |
| vox_c5_gu_v2 | 顾老师，45岁 | 到了？我是顾老师。 | 新角色无参考，固定首次音色 |
| vox_c5_ning_v2 | 宁宁，26岁 | 我叫宁宁。 | 新角色无参考，固定首次音色 |
| vox_trilogy_han_v2 | 韩经理，46岁 | 耽误您两分钟。 | 新角色无参考，固定首次音色 |
| vox_c3_cousin_v2 | 表姐，30岁 | 陪我等会儿。 | 新角色无参考，固定首次音色 |
| vox_c3_gallstone_v2 | 腹痛患者，38岁 | 这儿疼得厉害。 | 新角色无参考，固定首次音色 |
| vox_c4_song_v2 | 老宋，58岁 | 我怕这个洞。 | 新角色无参考，固定首次音色 |
| vox_c3_wang_v2 | 王叔，53岁 | 这回不抢救啦。 | DSA出场无独立声音，首次固定音色 |
| vox_c5_qian_v2 | 老钱，61岁 | 我姓钱。 | DR无独立声音，首次固定音色 |
| vox_c4_wrist_v2 | 小程，24岁 | 最近又疼了。 | vox_ch2_wrist |
| vox_trilogy_zhou_v2 | 老周 | 来了？茶还热着。 | vox_ch2_natural_zhou_v2 |
| vox_trilogy_lei_v2 | 小雷 | 你电脑借我一下。 | vox_ch2_natural_lei_v2 |
| vox_trilogy_tang_v2 | 小唐 | 饭还热着，快吃。 | vox_ch2_natural_tang |
| vox_trilogy_fan_v2 | 老范 | 来，搭把手。 | 作者批准的 vox_ch1_fan_mature_20260923 |
| vox_trilogy_he_v2 | 小何 | 我先接个电话。 | vox_ch2_natural_he_v2 |
| vox_trilogy_wen_v2 | 雯雯 | 喂，听得见吗？ | 作者恢复的 vox2_wen |
| vox_trilogy_mystery_v2 | 许建平 | 我带了旧片。 | 已改为明显苍老的 vox2_mystery |
| vox_trilogy_luo_v2 | 罗阿姨 | 这次我带齐了。 | vox_ch2_luo_entrance_20260925 |
| vox_trilogy_aunt_v2 | 钼靶阿姨 | 今天没来晚吧？ | vox_aunt |
| vox_trilogy_director_v2 | 主任 | 先把交接讲清楚。 | vox_ch2_natural_director_day_v3 |

王叔原 `dlc.ts:ds_9` 和老钱原 `p_qian` 没有独立出场录音，因此不能声称与不存在的旧声音完全一致。`vox_qian` 是医保办钱姐的女性声音，特意未用于老钱。老周用松弛有精神的现役声音；许建平用作者2026-09-16改为高龄干涩、偏弱的声音，未恢复归档中年方案。

## 本机生成与压缩

使用已经安装的 `../AuK/.venv/Scripts/python.exe` 与官方 `AukInfer.generate` API，同一批只加载一次模型。该API就是本机 `auk-infer` CLI调用的引擎；每条JSON保存完整等效CLI命令、实际提示、种子、参考源/副本及SHA-256。没有调用Prompt Enhancer、云端LLM/TTS或付费API，没有安装依赖；运行时禁用Hub联网和隐式Token。

模型为本机 `AuK-Flash/auk_flash.safetensors` 与 `Qwen2.5-Omni-3B`，`bf16`、`cuda:0`、`cpu_offload=True`；RTX 5090 D、PyTorch 2.7.1+cu128。Flash实际采样为4步、CFG=0，固定网格 `[0, 0.07612049579620361, 0.2928932309150696, 0.6173166036605835, 1]`。不是调用默认值所示的32步。推理代码/权重许可以本机AuK `LICENSE` 的MIT条款记录。

无参考新声使用官方中文Instruct TTS模板，描述表演/年龄、只读目标内容。同角色参考严格使用 `Say the following with the same voice: "<台词>"`，不把表演说明接在模板后以免读出来。只裁开头的轻微数字静音，保留气息与句尾，再做 `loudnorm=I=-20:TP=-2:LRA=7`；生成与母版24 kHz单声道，交付24 kHz单声道48 kbit/s MP3。没有变调、加速、音乐或对话提示音。

实际命令从仓库根运行：

```powershell
& '../AuK/.venv/Scripts/python.exe' scripts/trilogy-voice-generate.py --only vox_c3_mei_v2,vox_c4_xuning_v2
& '../AuK/.venv/Scripts/python.exe' scripts/trilogy-voice-qa.py --only vox_c3_mei_v2,vox_c4_xuning_v2 --asr
& '../AuK/.venv/Scripts/python.exe' scripts/trilogy-voice-generate.py --repair-first vox_c3_mei_v2
& '../AuK/.venv/Scripts/python.exe' scripts/trilogy-voice-generate.py --only vox_c3_cousin_v2,vox_c3_gallstone_v2,vox_c3_wang_v2,vox_c4_song_v2,vox_c5_ning_v2,vox_trilogy_han_v2 --repair-first vox_c3_cousin_v2,vox_c3_gallstone_v2,vox_c3_wang_v2,vox_c4_song_v2,vox_c5_ning_v2,vox_trilogy_han_v2
& '../AuK/.venv/Scripts/python.exe' scripts/trilogy-voice-equipment.py
& '../AuK/.venv/Scripts/python.exe' scripts/trilogy-voice-trim.py --inspect vox_c3_gallstone_v2,vox_trilogy_han_v2,vox_c3_wang_v2,vox_c4_song_v2
& '../AuK/.venv/Scripts/python.exe' scripts/trilogy-voice-trim.py --crop vox_c3_gallstone_v2=0.96,vox_trilogy_han_v2=1.12,vox_c3_wang_v2=0.97,vox_c4_song_v2=1.02
& '../AuK/.venv/Scripts/python.exe' scripts/trilogy-voice-qa.py --asr
```

首条梅姐a1的ASR为“来啦 这边 No prompt”，虽然中文部分正确，英文尾音仍是内容疑点，不交作最终片段。仅一次补录a2，用本角色a1音色参考与精确零样本模板，种子从2026101001改为2026101101；实际转写“来啦 这边”，无英文尾词。a1原始WAV、元数据与实际首轮转写保留在仓库外。首轮比较函数只留汉字曾给出错误的匹配旗标，已修正为额外英文也判不匹配；该候选从未据此作为内容通过交付。

整批初录另有6条内容疑点：表姐“陪我等會,no prompt 過”、宁宁“我叫寧寧,no prompt”、韩经理“耽误您两分钟No 您两分钟”；腹痛患者、王叔、老宋的整句各重复两遍。分别仅一次修正，用自己的a1音色与精确零样本模板，目标句子、人物方向和时长不改。一次修正种子均为原种子+100，未选a1及首轮ASR快照在 `audio/raw/`、`audio/qa/` 保留。既有同角色参考生成的回访短声没有通过重抽换音色。

第二次生成中，腹痛患者、韩经理、王叔、老宋仍有重复，停止生成。一次本机Qwen盲听核对明确转写出两遍或重复尾语，虽然回答中另有矛盾的“没有重复”套话，未据此报通过。保留其原文于 [自动音频核对](trilogy-voice-model-review.json)。随后以Whisper词时间戳和FFmpeg −35 dB/25 ms静音检测确认完整第一遍后的自然停顿：腹痛患者0.834–0.985秒、韩经理0.830–1.299秒、王叔0.851–0.996秒、老宋0.572–1.065秒。只做一次保留第一句的剪裁，分别在0.96/1.12/0.97/1.02秒停顿内结束，15 ms淡出并加100 ms静音尾部。没有截取半个目标字、变调、变速或第三次抽声；未剪母版及全部依据保留在 [剪裁记录](trilogy-voice-trim.json)。

剪裁后腹痛患者、韩经理、老宋的ASR为完整单句；王叔最终成品中Whisper与独立Qwen均转写“这回不抢救了”，没有重复或额外词，句末“啦/了”与生成目标不同，语义不改变，不冒称逐字一致。主任务接受该已知句末差异，不再追加生成。许建平的ASR“我戴了旧片”中“戴/带”同音，属于字形差异，未更换已批准的苍老音色。

最终21句角色声与3条设备声合计 **276,984字节**；完整文件名、字节数、哈希、实测时长、峰值与逐条内容说明见 [交付清单](trilogy-voice-delivery.json)。19句角色声的ASR字形对应目标，两句差异如上。最终化脚本把新角色选中的24 kHz母版保存为同角色固定参考，原首候选另留副本；以后复用同一选定音色，不因剪裁处理重新抽声。全部文件仍保持 `human_listened=false`。

完整逐条生成参数、实际解码峰值、LUFS、ASR及哈希分别见 [生成记录](trilogy-voice-generation.json) 和 [有限检查](trilogy-voice-qa.json)。

## 设备声音

先查了现有正式音频和本机课程目录 `D:/MyJianGuoYun/我的坚果云/原坚果云/成像视频/`。该目录有CT内部运转视频与PET健康科普视频，未找到能确认是独立MRI/超声/PET机械声音的片段。未把CT声挪作MRI/PET声，也未擅自剪取有旁白的科普片。安装版本AuK官方README/COOKBOOK列的是语音生成/编辑，不提供已验证的环境音生成模式，因此使用一次有界的确定性代码合成，完整方法见 [设备记录](trilogy-voice-equipment.json) 与 [脚本](../scripts/trilogy-voice-equipment.py)。

| ID | 听觉用途 | 解码时长 | 实测LUFS |
|---|---|---:|---:|
| trilogy_us_scan_v2 | 轻设备风扇底声 | 3.000秒 | −28.29 |
| trilogy_mri_scan_v2 | 低音量梯度式机械节律 | 3.000秒 | −26.23 |
| trilogy_pet_scan_v2 | 轻低频风扇/电机底声 | 3.000秒 | −28.26 |

超声探头发出的频率高于人耳可听范围，常见诊断频率为MHz，所以此处合成的是设备风扇声，而不是把超声载频做成可听嘟声；依据 [NIBIB Ultrasound](https://www.nibib.nih.gov/science-education/science-topics/ultrasound)。MRI的可听机械噪声与梯度切换有关，合成节律以此为设计依据，不能代表实际序列或声压；依据 [Siemens Quiet Suite](https://www.siemens-healthineers.com/en-us/magnetic-resonance-imaging/mr-quiet) 与 [What's that knocking?](https://www.siemens-healthineers.com/latam/news/mso-whats-that-knocking)。PET声仅是低风扇/电机底声，不配“衰变滴答”或假脉冲。

原初设备声偏轻，考虑手机端再叠客户端音量会难以听见，按主任务要求从原始PCM WAV做了一次有界响度归一化：超声/PET目标−28 LUFS、MRI目标−26 LUFS，真峰值上限−3 dB；再各编码一次MP3，没有MP3转码。主任务将客户端音量设为超声/PET 0.38、MRI 0.32，仍低于角色声0.42。

每条最终成品18,525字节，24 kHz单声道48 kbit/s，实测真峰值超声−14.19/MRI−11.21/PET−15.52 dBTP。首尾40 ms数字静音，60 ms淡入、90 ms淡出；最终解码后的首尾跳差小于8×10⁻⁹，首尾10 ms峰值小于1.1×10⁻⁶，零削波。设备声只供采集演出使用，不应在普通对话/走路中播放。来源为原创代码合成，无第三方录音，属于设备声示意，不是假称病房实录或校准声学模型；此来源说明留在开发记录，不增加游戏内警告。

## 验收边界

本轮课程稿定稿后实际接入19句角色声与3条设备声。`vox_trilogy_lei_v2`和`vox_trilogy_fan_v2`没有合适的当面情境，不强塞、不部署；已移到仓库外`unused-audio/`，母版与上文生成记录仍保留。上文21句/276,984字节描述整批生成结果，不等于实际章节加载量。

解码、采样率/码率/单声道、有限值、削波、响度和本机Whisper转写是本轮的有界验收。`faster-whisper-medium` 使用CPU int8、6线程、中文、beam5、无前文条件、无VAD，不向模型透露目标台词。错别字与同音字需结合原转写判断，不把ASR当人耳。

当前环境没有直接人耳听验能力，所有记录保持 `human_listened=false`。年龄、表演是否自然、同角色音色是否让作者认可仍需实际试听；不能以ASR/波形通过宣称听起来已获批准。音频子任务没有构建或全章走查。主任务已将19句与3条设备声接入并提交`dc2cbde`，最终构建与真实浏览器播放检查通过；其他接入验收见`trilogy-course-integration.md`。本轮未推送、未部署。
