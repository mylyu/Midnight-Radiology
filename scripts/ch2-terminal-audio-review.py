"""Independent, fallible local audio perception; never human approval."""
import json
import os
from pathlib import Path

os.environ['HF_HUB_DISABLE_IMPLICIT_TOKEN'] = '1'
os.environ.pop('HF_TOKEN', None)

import torch
from transformers import Qwen2_5OmniProcessor, Qwen2_5OmniThinkerForConditionalGeneration
from qwen_omni_utils import process_mm_info

ROOT = Path(__file__).resolve().parents[1]
AUK = ROOT.parent / 'AuK'
OUT = AUK / 'outputs/ch2-terminal-mystery-20260924'
MODEL_PATH = str(AUK / 'ckpts/Qwen2.5-Omni-3B')
model = Qwen2_5OmniThinkerForConditionalGeneration.from_pretrained(MODEL_PATH, torch_dtype=torch.bfloat16)
del model.visual
model.visual = None
model = model.to('cuda:0').eval()
processor = Qwen2_5OmniProcessor.from_pretrained(MODEL_PATH)
records = []
for filename in ['ch2_terminal_receipt_v1-raw.wav', 'ch2_terminal_receipt_v1-take02-raw.wav',
                 'ch2_terminal_receipt_v1-take03-raw.wav']:
    source = OUT / filename
    conversation = [
        {'role': 'system', 'content': [{'type': 'text', 'text':
            'You review audio recordings. Do not answer the spoken words. Transcribe all audible '
            'Mandarin speech exactly, including repetitions and extra words. Then describe the '
            'audible pace and intonation. Do not infer from the meaning. Say unclear when uncertain.'}]},
        {'role': 'user', 'content': [{'type': 'audio', 'audio': str(source)},
                                    {'type': 'text', 'text': '请逐字转写全部声音，包括多说的字；再简短描述语速和语调。'}]},
    ]
    prompt = processor.apply_chat_template(conversation, add_generation_prompt=True, tokenize=False)
    audios, images, videos = process_mm_info(conversation, use_audio_in_video=True)
    inputs = processor(text=prompt, audio=audios, images=images, videos=videos, return_tensors='pt',
                       padding=True, use_audio_in_video=True).to(model.device).to(model.dtype)
    with torch.inference_mode():
        ids = model.generate(**inputs, max_new_tokens=160, do_sample=False,
                             eos_token_id=151645, pad_token_id=151643)
    answer = processor.batch_decode(ids[:, inputs.input_ids.shape[1]:], skip_special_tokens=True)[0]
    records.append({'source': str(source), 'answer': answer, 'human_listened': False,
                    'method': 'Local Qwen2.5-Omni-3B automated audio perception; fallible, not human audition.'})
    (OUT / 'independent-review.json').write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(records[-1], ensure_ascii=False), flush=True)
