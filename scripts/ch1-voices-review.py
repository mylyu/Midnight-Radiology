"""Fallible independent audio perception, not human approval."""
import json
from pathlib import Path
import torch
from transformers import Qwen2_5OmniThinkerForConditionalGeneration, Qwen2_5OmniProcessor
from qwen_omni_utils import process_mm_info

ROOT = Path(__file__).resolve().parents[1]
AUK = ROOT.parent / 'AuK'
OUT = AUK / 'outputs/ch1-fan-worker-20260923'
model = Qwen2_5OmniThinkerForConditionalGeneration.from_pretrained(str(AUK / 'ckpts/Qwen2.5-Omni-3B'), torch_dtype=torch.bfloat16)
del model.visual
model.visual = None
model = model.to('cuda:0').eval()
processor = Qwen2_5OmniProcessor.from_pretrained(str(AUK / 'ckpts/Qwen2.5-Omni-3B'))
reports = []
for name in ['fan_v2', 'worker_v2', 'thin']:
    path = OUT / f'{name}-raw.wav'
    conversation = [
        {'role': 'system', 'content': [{'type': 'text', 'text': 'You are Qwen, a virtual human developed by the Qwen Team, Alibaba Group, capable of perceiving auditory and visual inputs, as well as generating text and speech.'}]},
        {'role': 'user', 'content': [{'type': 'audio', 'audio': str(path)}, {'type': 'text', 'text': '请逐字转写。声音听起来低沉浑厚还是高而单薄？粗哑还是清亮？像年轻人还是成熟或年长的人？是否有喘息和停顿？只描述实际声音，不从台词猜年龄；不确定请说明。'}]},
    ]
    text = processor.apply_chat_template(conversation, add_generation_prompt=True, tokenize=False)
    audios, images, videos = process_mm_info(conversation, use_audio_in_video=True)
    inputs = processor(text=text, audio=audios, images=images, videos=videos, return_tensors='pt', padding=True, use_audio_in_video=True).to(model.device).to(model.dtype)
    with torch.inference_mode():
        ids = model.generate(**inputs, max_new_tokens=120, do_sample=False, eos_token_id=151645, pad_token_id=151643)
    answer = processor.batch_decode(ids[:, inputs.input_ids.shape[1]:], skip_special_tokens=True)[0]
    reports.append(dict(id=name, answer=answer, method='Automated audio model; not human approval'))
    print(json.dumps(reports[-1], ensure_ascii=False), flush=True)
    (OUT / 'review.json').write_text(json.dumps(reports, ensure_ascii=False, indent=2), encoding='utf-8')
    del inputs, ids
    torch.cuda.empty_cache()
(OUT / 'review.json').write_text(json.dumps(reports, ensure_ascii=False, indent=2), encoding='utf-8')
