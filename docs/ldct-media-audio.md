# LDCT短出场语音 · 2026-09-28

本记录对应 `codex/ldct-media-polish`，基点 `a8a9305`。范围是LDCT专用短语音的生成来源与有限验收；本记录本身不替换第一、二章音频，不修改运行时或素材目录。**自动转写、响度/波形检查和本地音频模型判断，不等于人工试听或作者批准。**

本轮结论：老周、小何、陆舟男女四条可作为台词与技术检查通过的候选；**父亲A、B、一次新生成C及一次C剪裁均未满足无额外词要求，父亲暂不交付语音**。不继续盲目生成，不将失败片段接入游戏。

## 来源与生成

- 生成器：[父亲A](../scripts/ldct-father-entrance.py)、[父亲B与四位同事](../scripts/ldct-colleague-entrances.py)。输入是本次指定台词；老周、小何沿用已有同角色参考快照，陆舟两种声音沿用各自已有MP3，父亲无参考音频。
- AuK、Qwen与原始资料根目录：`../AuK/`；本批完整参数、命令、原始WAV、归一化母版、参考副本及逐字QA存于 `../AuK/outputs/ldct-entrances-20260928/`。候选交付MP3在 `../ldct-media-polish-assets/`。候选、失败稿和模型日志不应直接放入正式 `public/`。
- 模型：本机 `AuK-Flash/auk_flash.safetensors`，文本编码器 `Qwen2.5-Omni-3B`，`bf16`、`cuda:0`、`cpu_offload`。同事批次调用官方 `AukInfer.generate` API并共用一次加载，JSON保留等效CLI命令；父亲A使用 `auk-infer` CLI。
- 调用参数为 `nfe=32, cfg_strength=2, sway_sampling_coef=-1`；**AuK-Flash实际覆盖为4步、CFG=0、sway=None**，固定时间网格 `[0, 0.07612049579620361, 0.2928932309150696, 0.6173166036605835, 1]`，以本机 `src/auk/infer/infer_auk.py` 的Flash分支为据。不能将调用默认值记成实际32步采样。
- 所有候选经FFmpeg `loudnorm=I=-20:TP=-2:LRA=7`，得到24 kHz单声道WAV母版，再编码22.05 kHz单声道、48 kbit/s MP3。没有升降调、变速或混入背景音乐。

|候选|目标台词|随机种子|生成时长|参考|
|---|---|---:|---:|---|
|父亲A|说好吃饭的。|2026092807|2.0 s|无|
|父亲B|说好吃饭的。|2026092815|1.5 s|无|
|父亲C（唯一补生成）|说好吃饭的。|2026092816|1.5 s|无|
|老周|都坐，别着急。|2026092811|2.0 s|`references/zhou.wav`|
|小何|这谁的饭呀？|2026092812|1.8 s|`references/he.wav`|
|陆舟（男）|你先坐。|2026092813|1.6 s|`references/vox_luzhou_m.mp3`|
|陆舟（女）|你先坐。|2026092814|1.6 s|`references/vox_luzhou_f.mp3`|

同事的指令模板为 `Say the following with the same voice: "<台词>"`，引用的是音色参考而非新增表演台词。父亲A中文描述要求约60岁中低厚实男声、自然沙感、随口轻微埋怨、句尾下降；父亲B英文描述要求相同方向。完整原始指令保存在 `generation.json` 和 `colleague-generation.json`，不从文件名推断成品实际说了什么。

参考哈希如下。本轮已重新计算参考快照、来源文件以及每条原始WAV/母版/MP3哈希，均与生成记录一致；陆舟男女文件虽大小相同，内容哈希不同。

|参考|SHA-256|
|---|---|
|老周 `../AuK/outputs/midnight-radiology-redub-20260916/references/selected/zhou.wav`|`f2479c5441ef3a894d09358f0a250dee3978ec0c55fe8fb9c8634fbd5656a880`|
|小何 同目录 `he.wav`|`b15c7618fe5a3e230768be747bd4f1e442971178fdf5be4937f391bb8b5bf448`|
|陆舟男 `app/public/audio/vox_luzhou_m.mp3`|`f8c2cb39e2af59ddd5bd4f77491f3a622014614b3f834038ae0349c991aaf347`|
|陆舟女 `app/public/audio/vox_luzhou_f.mp3`|`2e6cd9c9b6cf597819d30585153b7d90967abf065f6387dd5893258f12d565f3`|

## 候选核验与取舍

现有QA使用本机 `faster-whisper-medium`，CPU int8、6线程、中文、beam=5、无前文条件、无VAD筛除；输入是最终MP3而非生成目标文本。另用 `Qwen2.5-Omni-3B` 对音频独立转写/描述，问题未给目标台词。详细原输出保留于 `automated-listening.json` 与 `colleague-automated-listening.json`；其中拒答、复述问题或不确定结果不视为通过。

|候选|实际Whisper转写|模型/客观结论|取舍|
|---|---|---|---|
|父亲A|说好吃饭的说好吃饭的|Qwen也识别到重复。2 s成品并非单句；第一遍与第二遍约1.06 s交界，FFmpeg在−35 dB/15 ms阈值下未检出静音|拒绝，保留原文件；不将文件名或预期台词当作通过|
|父亲B|中國父親在60歲左右|与描述内容相符而非目标台词；Qwen拒绝有效转写|拒绝，不能继续按先前“选B”的初步记录导入|
|父亲C|说好吃饭的no problem|Qwen也转写成“说好吃饭的no”；有非目标尾音|拒绝完整C|
|父亲C剪裁|说好吃饭的弄|Qwen也转写成“说好吃饭的呢”，仍有额外尾音；两模型对该尾音的字词解释不同|拒绝，不再追加生成或剪裁|
|老周|都坐 别着急|两模型转写一致；Qwen描述男声、随口聊天、平收；其异常枚举句有歧义，不当作逐项无缺陷认证|台词与技术检查通过，保留此候选|
|小何|这谁的饭呀|ASR无额外词；Qwen复述提问，没有提供有效表演判断|台词与技术检查通过，保留此候选；表演未独立确认|
|陆舟（男）|你先坐|ASR无额外词；Qwen描述男声、随口聊天、无明显异常，但未完整转写|台词与技术检查通过，保留此候选|
|陆舟（女）|你先做|坐/做同音，不以汉字差异判音频说错；Qwen称“可能是男声”，是身份匹配疑点而非确定结论|保留同角色参考所生成候选；女性音色一致性仍需实际试听|

所有上述MP3均能解码，为有限值、单声道，零削波采样。时长按解码样本计算；MP3容器可因帧填充显示稍长。对应指标如下，数值检查只证明基本交付条件。

|候选|字节|时长|LUFS|真峰值 dBTP|
|---|---:|---:|---:|---:|
|父亲A|12,609|2.0 s|-20.42|-3.07|
|父亲B|9,631|1.5 s|-20.44|-4.03|
|父亲C|9,631|1.5 s|-20.46|-4.79|
|父亲C剪裁|9,004|1.410 s|-20.48|-4.79|
|老周|12,609|2.0 s|-20.43|-6.85|
|小何|11,355|1.8 s|-20.39|-7.86|
|陆舟男|10,258|1.6 s|-20.47|-3.11|
|陆舟女|10,258|1.6 s|-20.47|-7.72|

## 候选交付哈希

本表文件均相对 `../ldct-media-polish-assets/`。全部父亲候选明确拒绝，不应复制到正式媒体。四条同事音频合计44,480字节。

|文件|SHA-256|
|---|---|
|`vox_ldct_father_entrance_20260928.mp3`（拒绝）|`f31c93f2911b3160dc1e1d573809cf8f1b12028c167c77c65140a3bb69d8743c`|
|`vox_ldct_father_b_entrance_20260928.mp3`（拒绝）|`ba10fe51de316a0ede973ea4fd4639faf32a3d3d085bd3e1546f850e377d100b`|
|`vox_ldct_father_c_entrance_20260928.mp3`（拒绝）|`74cbe55c826b0b2e9ee5e70f9bcfde9acc82bd970a821a80c970f7c307deff7a`|
|`vox_ldct_father_c_trim_entrance_20260928.mp3`（拒绝）|`321dccfb9eab1f6627707bdab55aa5ea9394c4706640c219fc9b5770af0df3af`|
|`vox_ldct_zhou_entrance_20260928.mp3`|`2fdeff53b53268205e2c7930b75f51d2b72e08246e6d68c2f4d4b17eb6ed76fd`|
|`vox_ldct_he_entrance_20260928.mp3`|`72b9ddcbc73875c78d113bd3212dace9be7c6ecb29c422443df69eb5845dd4c2`|
|`vox_ldct_luzhou_m_entrance_20260928.mp3`|`ce1fafaef696814cc10a9e6db32d3769e07c1b6fb8722b2dbf482bc80009db33`|
|`vox_ldct_luzhou_f_entrance_20260928.mp3`|`3bbd5211d8eae73404109a050cef5b90847263ddf3c274f6abbe776be595bdde`|

## 父亲一次补生成及一次剪裁

C保留中文描述/台词分离模板，简化描述为“六十岁左右的男性，嗓音中低厚实，稍带沙感。普通话，随口轻微抱怨，平常说话的语速，句末自然收住。单人说话，无音乐。”。仍使用同模型与响度处理，无参考音频。外部 `repair-father-c.py`、`father-c-generation.log`、`father-c-generation.json`、`father-c-automated-listening.json` 保存精确命令与结果。

C逐词时间戳把“的”结束/额外“NO”开始放在1.26 s；因两者之间同样没有已证实的自然静音边界，仅尝试一次保守剪裁：`atrim=end=1.26,asetpts=PTS-STARTPTS,afade=t=out:st=1.245:d=0.015,apad=pad_dur=0.15`，再用相同22.05 kHz/48 kbit/s编码。来源是24 kHz母版，不重复压缩MP3。该剪裁未通过无额外词要求，停止尝试；没有把其时长/零削波当成内容通过。

- C原始WAV SHA-256：`697971bf6c24680530cb8a96922c72044c82695df9b75e255f76556694592b60`。
- C母版 SHA-256：`e0d50f75bae848b47023894a8bf03fc38d4cfa9879c1eadb6e80dd0f7e7a1301`。
- 剪裁母版 SHA-256：`d79751165d4b363922b8f4493fdc628a71c382457dca03b0a966a4847df9c2de`。
- 剪裁依据/命令/测量：外部 `trim-father-c.py`、`father-c-trim.json` 和 `father-c-trim-automated-listening.json`。

本轮只作有限验音证据恢复与真实错词的有界修复尝试，不以ASR通过冒称好听。整批 `human_listened=false`、`user_approved=false` 保持真实；年龄、自然度、角色一致性与最后选用仍不能由这些自动指标保证。原始和失败稿均保存在仓库外，可回查；此文档不意味着已推送或发布。
