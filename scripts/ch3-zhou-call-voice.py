"""A bounded CH3 phone greeting using Zhou's approved reference voice."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time

sys.stdout.reconfigure(encoding="utf-8")
sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
AUK = ROOT.parent / "AuK"
OUT = AUK / "outputs/ch3-zhou-call-20261027"
ID = "vox_c3_zhou_call_v1"
TEXT = "喂，在超声科怎么样？"
REFERENCE = ROOT / "app/public/audio/vox_ch2_natural_zhou_v2.mp3"
DESTINATION = ROOT / "app/public/audio" / f"{ID}.mp3"
REPORT = ROOT / "docs/ch3-zhou-call-voice.json"
ENV = {**os.environ, "PYTHONUTF8": "1", "HF_HUB_OFFLINE": "1",
       "TRANSFORMERS_OFFLINE": "1", "HF_HUB_DISABLE_IMPLICIT_TOKEN": "1"}
ENV.pop("HF_TOKEN", None)


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def run(argv):
    return subprocess.run(argv, check=True, capture_output=True)


def write(path, record):
    path.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def inspect(mp3):
    import numpy as np
    from faster_whisper import WhisperModel
    signal = np.frombuffer(run(["ffmpeg", "-v", "error", "-i", str(mp3), "-f", "f32le", "-acodec", "pcm_f32le", "-"]).stdout, dtype="<f4")
    assert np.isfinite(signal).all() and np.max(np.abs(signal)) < 0.95
    model = WhisperModel(str(AUK / "ckpts/faster-whisper-medium"), device="cpu", compute_type="int8", cpu_threads=6, local_files_only=True)
    segments, _ = model.transcribe(str(mp3), language="zh", beam_size=5, condition_on_previous_text=False, vad_filter=False, word_timestamps=True)
    rows = [dict(start=s.start, end=s.end, text=s.text, words=[dict(start=w.start, end=w.end, word=w.word) for w in s.words or []]) for s in segments]
    loud = run(["ffmpeg", "-hide_banner", "-i", str(mp3), "-af", "loudnorm=I=-20:TP=-2:LRA=7:print_format=json", "-f", "null", "-"]).stderr.decode("utf-8", errors="replace")
    silence = run(["ffmpeg", "-hide_banner", "-i", str(mp3), "-af", "silencedetect=noise=-40dB:d=0.04", "-f", "null", "-"]).stderr.decode("utf-8", errors="replace")
    (OUT / f"{mp3.stem}.silence.log").write_text(silence, encoding="utf-8")
    return dict(asr="".join(s["text"] for s in rows), asr_segments=rows,
                asr_method="faster-whisper-medium, local CPU int8, no transcript prompt",
                decoded_seconds=round(len(signal) / 24000, 4), decoded_peak=float(np.max(np.abs(signal))),
                clipping_samples=int(np.sum(np.abs(signal) >= 1)), measured_loudness=json.loads(loud[loud.rfind("{"):loud.rfind("}") + 1]))


def generate(attempt):
    OUT.mkdir(parents=True, exist_ok=True)
    reference = OUT / REFERENCE.name
    if not reference.exists():
        shutil.copyfile(REFERENCE, reference)
    assert sha(reference) == sha(REFERENCE)
    raw, wav, mp3 = [OUT / f"{ID}.a{attempt}.{suffix}" for suffix in ("raw.wav", "wav", "mp3")]
    assert not raw.exists(), "Do not overwrite an existing take."
    seconds, seed = (2.8, 2026102731) if attempt == 1 else (2.3, 2026102732)
    instruction = f'Say the following with the same voice: "{TEXT}"'
    command = [str(AUK / ".venv/Scripts/auk-infer.exe"), "--ckpt", str(AUK / "ckpts/AuK-Flash/auk_flash.safetensors"),
               "--qwen_path", str(AUK / "ckpts/Qwen2.5-Omni-3B"), "--dtype", "bf16", "--device", "cuda:0", "--cpu_offload",
               "--seed", str(seed), "--gen_seconds", str(seconds), "--instruction", instruction,
               "--audio", str(reference), "--output", str(raw)]
    started = time.monotonic()
    print("GENERATE", TEXT, "same approved Zhou reference", flush=True)
    with (OUT / f"generation-a{attempt}.log").open("w", encoding="utf-8") as log:
        subprocess.run(command, cwd=AUK, env=ENV, stdout=log, stderr=subprocess.STDOUT, check=True)
    processing = "silenceremove=start_periods=1:start_duration=0.03:start_threshold=-50dB:start_silence=0.06,loudnorm=I=-20:TP=-2:LRA=7"
    wav_args = ["ffmpeg", "-y", "-v", "error", "-i", str(raw), "-af", processing, "-map_metadata", "-1", "-ar", "24000", "-ac", "1", str(wav)]
    mp3_args = ["ffmpeg", "-y", "-v", "error", "-i", str(wav), "-map_metadata", "-1", "-c:a", "libmp3lame", "-b:a", "48k", "-ar", "24000", "-ac", "1", str(mp3)]
    run(wav_args); run(mp3_args)
    record = dict(date="2026-10-27", base="9c02b75", id=ID, role="老周", text=TEXT, attempt=attempt,
                  performance_direction="约60岁，松弛略粗粝，熟人电话关心，稍带笑意；实际表演由已批准参考引导，不把说明塞进模型台词。",
                  instruction=instruction, seed=seed, gen_seconds=seconds, command=command,
                  reference_source=str(REFERENCE), reference_snapshot=str(reference), reference_sha256=sha(reference),
                  offline=True, method="Local auk-infer AuK-Flash official zero-shot same-voice template",
                  raw=str(raw), raw_sha256=sha(raw), wav=str(wav), wav_sha256=sha(wav), mp3=str(mp3), mp3_sha256=sha(mp3),
                  bytes=mp3.stat().st_size, processing=processing, ffmpeg_commands=[wav_args, mp3_args],
                  sample_rate=24000, channels=1, bitrate=48000, speed_or_pitch_edit=False,
                  generation_processing_seconds=round(time.monotonic() - started, 2), human_listened=False,
                  limitations="Automatic transcription and signal checks do not certify timbre identity, naturalness or author approval.")
    write(OUT / f"take-a{attempt}.json", record)
    record.update(inspect(mp3))
    write(OUT / f"take-a{attempt}.json", record)
    print(json.dumps(record, ensure_ascii=False), flush=True)


def review(attempt, plain=False):
    import torch
    from transformers import Qwen2_5OmniThinkerForConditionalGeneration, Qwen2_5OmniProcessor
    from qwen_omni_utils import process_mm_info
    record = json.loads((OUT / f"take-a{attempt}.json").read_text(encoding="utf-8"))
    model = Qwen2_5OmniThinkerForConditionalGeneration.from_pretrained(str(AUK / "ckpts/Qwen2.5-Omni-3B"), torch_dtype=torch.bfloat16, local_files_only=True)
    del model.visual
    model.visual = None
    model = model.to("cuda:0").eval()
    processor = Qwen2_5OmniProcessor.from_pretrained(str(AUK / "ckpts/Qwen2.5-Omni-3B"), local_files_only=True)
    question = "只输出这段音频实际说出的全部原话，不要添加任何解释或问候。" if plain else "逐字转写这段音频实际说出的全部内容，包含重复的字句。不要改写或补字。然后说有无重复、额外词或明显截断；听不清就说不确定。"
    conversation = [{"role": "system", "content": [{"type": "text", "text": "You are Qwen, a virtual human developed by the Qwen Team, Alibaba Group, capable of perceiving auditory and visual inputs, as well as generating text and speech."}]},
                    {"role": "user", "content": [{"type": "audio", "audio": record["mp3"]}, {"type": "text", "text": question}]}]
    prompt = processor.apply_chat_template(conversation, add_generation_prompt=True, tokenize=False)
    audios, images, videos = process_mm_info(conversation, use_audio_in_video=True)
    inputs = processor(text=prompt, audio=audios, images=images, videos=videos, return_tensors="pt", padding=True, use_audio_in_video=True).to(model.device).to(model.dtype)
    with torch.inference_mode():
        ids = model.generate(**inputs, max_new_tokens=130, do_sample=False, eos_token_id=151645, pad_token_id=151643)
    answer = processor.batch_decode(ids[:, inputs.input_ids.shape[1]:], skip_special_tokens=True)[0]
    record["plain_transcript_review" if plain else "independent_review"] = dict(method="Local Qwen2.5-Omni-3B blind audio transcription; target not supplied", question=question, answer=answer, sha256=sha(record["mp3"]), human_listened=False)
    write(OUT / f"take-a{attempt}.json", record)
    print(answer, flush=True)


def publish(attempt):
    record = json.loads((OUT / f"take-a{attempt}.json").read_text(encoding="utf-8"))
    assert record.get("independent_review"), "Review the selected audio before exporting it."
    shutil.copyfile(record["mp3"], DESTINATION)
    assert sha(DESTINATION) == record["mp3_sha256"]
    record["delivery"] = str(DESTINATION)
    record["content_check_summary"] = (
        "Whisper transcribes the complete target once. Qwen's first transcript is the complete target once, "
        "but its subsequent repetition comment is self-contradictory and uncertain. A final transcript-only "
        "query yields 在超声科怎么样？ without repeated words, omitting the opening interjection 喂. "
        "These automated observations are retained verbatim; they are not a human listening approval."
    )
    write(REPORT, record)
    print(json.dumps({k: record[k] for k in ("delivery", "bytes", "decoded_seconds", "asr", "mp3_sha256")}, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["generate", "review", "review-plain", "publish"])
    parser.add_argument("--attempt", type=int, choices=[1, 2], default=1)
    args = parser.parse_args()
    {"generate": generate, "review": review, "review-plain": lambda attempt: review(attempt, plain=True), "publish": publish}[args.action](args.attempt)
