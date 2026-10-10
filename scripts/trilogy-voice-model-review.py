"""Bounded local second audio-model opinion for ambiguous ASR; not human QA."""
import argparse
import json
import os
from pathlib import Path
import sys

sys.stdout.reconfigure(encoding="utf-8")
sys.dont_write_bytecode = True
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
ROOT = Path(__file__).resolve().parents[1]
AUK = ROOT.parent / "AuK"
OUT = ROOT.parent / "trilogy-experience-assets-20261010/audio"
REPORT = ROOT / "docs/trilogy-voice-model-review.json"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", required=True)
    args = parser.parse_args()
    import torch
    from transformers import Qwen2_5OmniThinkerForConditionalGeneration, Qwen2_5OmniProcessor
    from qwen_omni_utils import process_mm_info
    model = Qwen2_5OmniThinkerForConditionalGeneration.from_pretrained(str(AUK / "ckpts/Qwen2.5-Omni-3B"), torch_dtype=torch.bfloat16, local_files_only=True)
    del model.visual
    model.visual = None
    model = model.to("cuda:0").eval()
    processor = Qwen2_5OmniProcessor.from_pretrained(str(AUK / "ckpts/Qwen2.5-Omni-3B"), local_files_only=True)
    rows = json.loads(REPORT.read_text(encoding="utf-8")) if REPORT.exists() else []
    for name in args.only.split(","):
        record = json.loads((OUT / "records" / f"{name}.json").read_text(encoding="utf-8"))
        if any(r["sha256"] == record["output_sha256"] for r in rows):
            continue
        question = "只根据这段实际音频，逐字转写说出来的全部内容。是否有整句或部分短语重复，实际说了几遍？是否有额外英语或异常尾音？然后一句话描述声音是随口交谈还是朗诵、喊口号。听不清就说不确定，不要复述本问题。"
        conversation = [{"role":"system","content":[{"type":"text","text":"You are Qwen, a virtual human developed by the Qwen Team, Alibaba Group, capable of perceiving auditory and visual inputs, as well as generating text and speech."}]},
                        {"role":"user","content":[{"type":"audio","audio":record["output"]},{"type":"text","text":question}]}]
        text = processor.apply_chat_template(conversation, add_generation_prompt=True, tokenize=False)
        audios, images, videos = process_mm_info(conversation, use_audio_in_video=True)
        inputs = processor(text=text, audio=audios, images=images, videos=videos, return_tensors="pt", padding=True, use_audio_in_video=True).to(model.device).to(model.dtype)
        with torch.inference_mode():
            ids = model.generate(**inputs, max_new_tokens=160, do_sample=False, eos_token_id=151645, pad_token_id=151643)
        answer = processor.batch_decode(ids[:,inputs.input_ids.shape[1]:], skip_special_tokens=True)[0]
        row = dict(id=name, sha256=record["output_sha256"], question=question, answer=answer,
                   method="Local Qwen2.5-Omni-3B blind audio perception; no expected line passed.", human_listened=False,
                   limitation="Second fallible automated opinion; refusal, question repetition or uncertainty is not a content pass.")
        rows.append(row)
        REPORT.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(row, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
