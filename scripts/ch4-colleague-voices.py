"""Bounded, offline CH4 first-entrance voice generation using approved references.

Raw takes stay outside the repository. Generate/QA/export are explicit separate
steps; neither automatic transcription nor model review claims human listening.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
sys.stdout.reconfigure(encoding="utf-8")
sys.dont_write_bytecode = True
os.environ.update(PYTHONUTF8="1", HF_HUB_OFFLINE="1", TRANSFORMERS_OFFLINE="1", HF_HUB_DISABLE_IMPLICIT_TOKEN="1")
os.environ.pop("HF_TOKEN", None)
LINES = [
    ("fan", "老范", "先别笑，真要买。", "vox_ch1_fan_mature_20260923", 2.1, "老成、略带无奈的熟人闲谈"),
    ("zhou", "老周", "这可得合计合计。", "vox_ch2_natural_zhou_v2", 2.0, "沉稳务实，随口商量"),
    ("tang", "小唐", "电话我来盯。", "vox_ch2_natural_tang", 1.7, "熟络干脆地接替工作"),
    ("director", "院长", "人排开了就去。", "vox_ch2_natural_director_day_v3", 1.9, "日常交代，不训话"),
    ("lei", "小雷", "我可不敢乱签。", "vox_ch2_natural_lei_v2", 1.9, "轻微吐槽，不阴沉"),
    ("feng_help", "冯叔（检查中呼救）", "救命啊！", "vox_c4_feng_r7", 1.5, "幽闭紧张的短呼救，不循环、不演讲"),
]
PROCESS = "silenceremove=start_periods=1:start_duration=0.03:start_threshold=-50dB:start_silence=0.06,loudnorm=I=-20:TP=-2:LRA=7"


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def write(path, value):
    Path(path).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def run(argv):
    return subprocess.run(argv, check=True, capture_output=True)


def asset_id(key):
    return "vox_c4_feng_help_v1" if key == "feng_help" else f"vox_c4_{key}_first_v1"


def generate(args, rows):
    from auk.infer.infer_auk import AukInfer, save_audio
    import torch
    engine = None
    for index, row in rows:
        key, role, text, ref_id, seconds, direction = row
        if key == "zhou" and args.attempt == 2:
            text, seconds = "这事得好好想想。", 2.2
        voice_id = asset_id(key)
        record_path = args.out / f"{voice_id}.a{args.attempt}.json"
        if record_path.exists():
            print("EXISTS", record_path.name, flush=True)
            continue
        source = ROOT / "app/public/audio" / f"{ref_id}.mp3"
        reference = args.out / "references" / source.name
        shutil.copyfile(source, reference)
        assert sha(source) == sha(reference)
        seed = 2026112300 + {"fan": 0, "zhou": 1, "tang": 2, "director": 3, "lei": 5, "feng_help": 7}[key] + args.attempt * 20
        raw = args.out / f"{voice_id}.a{args.attempt}.raw.wav"
        output = args.out / f"{voice_id}.a{args.attempt}.mp3"
        assert not raw.exists()
        instruction = f'Say the following with the same voice: "{text}"'
        if engine is None:
            engine = AukInfer(config_path=str(args.auk_root / "ckpts/AuK-Flash/config.yaml"),
                              ckpt_path=str(args.auk_root / "ckpts/AuK-Flash/auk_flash.safetensors"),
                              device="cuda:0", dtype="bf16", qwen_path=str(args.auk_root / "ckpts/Qwen2.5-Omni-3B"), cpu_offload=True)
        start = time.monotonic()
        print("GENERATE", voice_id, text, flush=True)
        audio, sr = engine.generate([{"role": "user", "content": [{"type": "text", "text": instruction}, {"type": "audio", "audio": str(reference)}]}],
                                   audio=str(reference), gen_seconds=seconds, seed=seed)
        save_audio(audio, sr, str(raw))
        command = ["ffmpeg", "-y", "-v", "error", "-i", str(raw), "-af", PROCESS, "-map_metadata", "-1",
                   "-c:a", "libmp3lame", "-b:a", "32k", "-ar", "22050", "-ac", "1", str(output)]
        run(command)
        record = dict(id=voice_id, role=role, text=text, attempt=args.attempt, intended_performance=direction,
                      instruction=instruction, seed=seed, gen_seconds=seconds, reference_source=str(source.relative_to(ROOT)),
                      reference_snapshot=str(reference), reference_sha256=sha(source), raw=str(raw), raw_sha256=sha(raw),
                      raw_sample_rate=sr, output=str(output), output_sha256=sha(output), output_bytes=output.stat().st_size,
                      processing=PROCESS, ffmpeg_command=command, channels=1, sample_rate=22050, bitrate=32000,
                      pitch_or_speed_change=False, human_listened=False, elapsed_seconds=round(time.monotonic()-start, 2),
                      method="Installed official AukInfer.generate API; local approved-reference synthesis; no remote API",
                      model="AuK-Flash", model_license="Installed AuK LICENSE: MIT", torch_version=torch.__version__,
                      decode=dict(nfe=4, cfg=0, dtype="bf16", cpu_offload=True))
        write(record_path, record)
        print("PREPARED", voice_id, record["output_bytes"], flush=True)


def records(args, rows):
    return [(args.out / f"{asset_id(row[0])}.a{2 if row[0] in args.second_takes.split(',') else args.attempt}.json") for _, row in rows]


def inspect(args, rows):
    import numpy as np
    from faster_whisper import WhisperModel
    model = WhisperModel(str(args.auk_root / "ckpts/faster-whisper-medium"), device="cpu", compute_type="int8", cpu_threads=6, local_files_only=True)
    for path in records(args, rows):
        record = json.loads(path.read_text(encoding="utf-8"))
        output = record["output"]
        signal = np.frombuffer(run(["ffmpeg", "-v", "error", "-i", output, "-f", "f32le", "-acodec", "pcm_f32le", "-"]).stdout, dtype="<f4")
        assert np.isfinite(signal).all() and np.max(np.abs(signal)) < .95
        segments, _ = model.transcribe(output, language="zh", beam_size=5, condition_on_previous_text=False, vad_filter=False, word_timestamps=True)
        result = [dict(start=s.start, end=s.end, text=s.text, words=[dict(start=w.start,end=w.end,word=w.word) for w in s.words or []]) for s in segments]
        loud = run(["ffmpeg", "-hide_banner", "-i", output, "-af", "loudnorm=I=-20:TP=-2:LRA=7:print_format=json", "-f", "null", "-"]).stderr.decode("utf-8", errors="replace")
        record["qa"] = dict(asr="".join(s["text"] for s in result), segments=result,
                            method="Local faster-whisper-medium; CPU int8; no target transcription prompt",
                            decoded_seconds=round(len(signal)/22050, 4), peak=float(np.max(np.abs(signal))),
                            clipping_samples=int(np.sum(np.abs(signal)>=1)),
                            loudness=json.loads(loud[loud.rfind("{"):loud.rfind("}")+1]))
        write(path, record)
        print(record["id"], record["qa"]["asr"], record["qa"]["decoded_seconds"], flush=True)


def review(args, rows):
    import torch
    from transformers import Qwen2_5OmniThinkerForConditionalGeneration, Qwen2_5OmniProcessor
    from qwen_omni_utils import process_mm_info
    model = Qwen2_5OmniThinkerForConditionalGeneration.from_pretrained(str(args.auk_root / "ckpts/Qwen2.5-Omni-3B"), torch_dtype=torch.bfloat16, local_files_only=True)
    del model.visual
    model.visual = None
    model = model.to("cuda:0").eval()
    processor = Qwen2_5OmniProcessor.from_pretrained(str(args.auk_root / "ckpts/Qwen2.5-Omni-3B"), local_files_only=True)
    question = "只转写这段音频的全部原话。" if args.plain else "只根据实际音频逐字转写全部原话。有没有重复、额外词或截断？说了几遍？简短描述语气是否像随口交谈。听不清就说不确定，不要复述本问题。"
    for path in records(args, rows):
        record = json.loads(path.read_text(encoding="utf-8"))
        conversation = [{"role":"system","content":[{"type":"text","text":"You are Qwen, a virtual human developed by the Qwen Team, Alibaba Group, capable of perceiving auditory and visual inputs, as well as generating text and speech."}]},
                        {"role":"user","content":[{"type":"audio","audio":record["output"]},{"type":"text","text":question}]}]
        prompt = processor.apply_chat_template(conversation, add_generation_prompt=True, tokenize=False)
        audios, images, videos = process_mm_info(conversation, use_audio_in_video=True)
        inputs = processor(text=prompt, audio=audios, images=images, videos=videos, return_tensors="pt", padding=True, use_audio_in_video=True).to(model.device).to(model.dtype)
        with torch.inference_mode():
            ids = model.generate(**inputs, max_new_tokens=140, do_sample=False, eos_token_id=151645, pad_token_id=151643)
        answer = processor.batch_decode(ids[:,inputs.input_ids.shape[1]:], skip_special_tokens=True)[0]
        record["transcript_review" if args.plain else "independent_review"] = dict(method="Local Qwen2.5-Omni blind audio transcription; target not supplied", question=question, answer=answer, sha256=sha(record["output"]), human_listened=False)
        write(path, record)
        print(record["id"], answer, flush=True)


def export(args, rows):
    selected = []
    for path in records(args, rows):
        record = json.loads(path.read_text(encoding="utf-8"))
        assert record.get("qa") and (record.get("independent_review") or record.get("transcript_review")), "Inspect and review before explicit export."
        dest = ROOT / "app/public/audio" / f'{record["id"]}.mp3'
        assert not dest.exists() or sha(dest) == record["output_sha256"]
        shutil.copyfile(record["output"], dest)
        record["delivery"] = str(dest.relative_to(ROOT))
        record["selected"] = True
        if record["id"] == "vox_c4_zhou_first_v1" and record["attempt"] == 2:
            first = json.loads((args.out / "vox_c4_zhou_first_v1.a1.json").read_text(encoding="utf-8"))
            record["rejected_previous_take"] = dict(text=first["text"], asr=first["qa"]["asr"],
                                                    independent_review=first["independent_review"],
                                                    raw=first["raw"], raw_sha256=first["raw_sha256"],
                                                    reason="Whisper heard 和解和解 instead of the intended 合计合计; replaced the ambiguous wording, not accepted as a match.")
        selected.append(record)
    report_path = ROOT / "docs/ch4-colleague-voices.json"
    previous = json.loads(report_path.read_text(encoding="utf-8"))["lines"] if report_path.exists() else []
    ids = {r["id"] for r in selected}
    selected = [r for r in previous if r["id"] not in ids] + selected
    selected.sort(key=lambda r: r["id"])
    write(report_path, dict(date="2026-11-23", base="b68cc15", scope="CH4 five new hospital colleague greetings and Feng's one-off scanner distress cry; Shen's approved in-person greeting and all existing media unchanged; supplier Wen excluded",
                           auk_root=str(args.auk_root), source_root=str(args.out), human_listened=False,
                           limitation="Automated transcription, signal checks and a second audio model are not a direct human listening approval.",
                           total_bytes=sum(r["output_bytes"] for r in selected), lines=selected))
    print("EXPORTED", len(selected), sum(r["output_bytes"] for r in selected), flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["generate", "inspect", "review", "export"])
    parser.add_argument("--auk-root", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--only", default="")
    parser.add_argument("--attempt", type=int, choices=[1,2], default=1)
    parser.add_argument("--plain", action="store_true", help="One bounded transcript-only review after an unhelpful combined prompt")
    parser.add_argument("--second-takes", default="", help="Comma separated IDs selected from second takes in a mixed QA/export batch")
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    (args.out / "references").mkdir(exist_ok=True)
    rows = [(i, row) for i, row in enumerate(LINES) if not args.only or row[0] in args.only.split(",")]
    globals()[args.mode](args, rows)


if __name__ == "__main__":
    main()
