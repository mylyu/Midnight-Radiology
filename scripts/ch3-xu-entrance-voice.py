"""One new Xu Jianping entrance take; originals/logs stay outside the repository."""
import hashlib
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import shutil

sys.stdout.reconfigure(encoding="utf-8")
sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
AUK = ROOT.parent / "AuK"
OUT = AUK / "outputs/ch3-xu-entrance-20261027"
TEXT = "医生，怎么又是你..."
DESCRIPTION = (
    "六十五岁左右的中国男性，声音有自然的年纪感，音色略干、低沉但清楚，正常说话的音量。"
    "来检查的患者一抬头认出了以前见过的年轻医生，像碰到熟人一样随口说话。"
    "有一点意外，也有一点奔波后的疲惫，但不害怕、不生气。医生是轻轻招呼一下，"
    "短暂停顿后自然连着问怎么又是你，轻微强调又，句尾轻轻落下。"
    "朴实日常交谈，不逐字念稿，不表演悬疑，不气声耳语，不拖长尾音。只说指定的一句话，一遍。"
)
ID = "vox_c3_xu_greeting_v3"


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def run(argv):
    return subprocess.run(argv, check=True, capture_output=True)


def attach_review():
    record_path = OUT / "record-final.json"
    record = json.loads(record_path.read_text(encoding="utf-8"))
    review = json.loads((OUT / "model-review-final.json").read_text(encoding="utf-8"))
    assert review["sha256"] == record["mp3_sha256"] == sha(record["delivery"])
    record["independent_final_audio_model_review"] = review
    record["uncut_repair_audio_model_review"] = json.loads((OUT / "model-review.json").read_text(encoding="utf-8"))
    record["temporal_inspection"] = json.loads((OUT / "temporal-inspection.json").read_text(encoding="utf-8"))
    record["first_take"]["generation_record"] = json.loads((OUT / "record.json").read_text(encoding="utf-8"))
    for path in (record_path, ROOT / "docs/ch3-xu-entrance-voice.json"):
        path.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("FINAL INDEPENDENT TRANSCRIPT", review["answer"], flush=True)


def finalize():
    """Keep the full target after an extra prefix, cutting inside measured silence."""
    source = json.loads((OUT / "record-repair.json").read_text(encoding="utf-8"))
    raw, mp3 = OUT / f"{ID}.final.wav", OUT / f"{ID}.final.mp3"
    cut = 0.65
    af = f"atrim=start={cut},asetpts=PTS-STARTPTS,afade=t=in:d=0.005,loudnorm=I=-20:TP=-2:LRA=7"
    argv = ["ffmpeg", "-y", "-v", "error", "-i", source["wav"], "-af", af, "-map_metadata", "-1", "-ar", "24000", "-ac", "1", str(raw)]
    encode = ["ffmpeg", "-y", "-v", "error", "-i", str(raw), "-map_metadata", "-1", "-c:a", "libmp3lame", "-b:a", "48k", "-ar", "24000", "-ac", "1", str(mp3)]
    run(argv)
    run(encode)
    from faster_whisper import WhisperModel
    model = WhisperModel(str(AUK / "ckpts/faster-whisper-medium"), device="cpu", compute_type="int8", cpu_threads=6, local_files_only=True)
    segments, _ = model.transcribe(str(mp3), language="zh", beam_size=5, condition_on_previous_text=False, vad_filter=False, word_timestamps=True)
    checked = [dict(start=s.start, end=s.end, text=s.text, words=[dict(start=w.start, end=w.end, word=w.word) for w in s.words or []]) for s in segments]
    asr = "".join(s["text"] for s in checked)
    assert "".join(c for c in asr if c.isalnum()) == "医生怎么又是你", asr
    import numpy as np
    signal = np.frombuffer(run(["ffmpeg", "-v", "error", "-i", str(mp3), "-f", "f32le", "-acodec", "pcm_f32le", "-"]).stdout, dtype="<f4")
    assert np.isfinite(signal).all() and np.max(np.abs(signal)) < 0.95
    loudness = run(["ffmpeg", "-hide_banner", "-i", str(mp3), "-af", "loudnorm=I=-20:TP=-2:LRA=7:print_format=json", "-f", "null", "-"]).stderr.decode("utf-8", errors="replace")
    (OUT / "final-loudness.log").write_text(loudness, encoding="utf-8")
    measured = json.loads(loudness[loudness.rfind("{"):loudness.rfind("}")+1])
    record = dict(date="2026-10-27", base="53c03a8", id=ID, role="许建平", text=TEXT, method=source["method"],
                  description=DESCRIPTION, reference=None, offline=True, license=source["license"],
                  source=source, first_take=dict(record=str(OUT / "record.json"), reason_rejected="Full-line repetition detected in ASR; never imported."),
                  generation_count=2, third_generation=False, prefix_cut_seconds=cut,
                  cut_basis=dict(silence_start=0.607042, silence_end=0.6965, threshold_db=-40, minimum_seconds=0.04,
                                 target_onset_margin_seconds=0.0465, temporal_inspection=str(OUT / "temporal-inspection.json"),
                                 rationale="Delete an unwanted generated prefix at real silence; retain the entire target line and its internal pause."),
                  processing=af, ffmpeg_argv=[argv, encode], speed_or_pitch_edit=False,
                  wav=str(raw), wav_sha256=sha(raw), mp3=str(mp3), mp3_sha256=sha(mp3), mp3_bytes=mp3.stat().st_size,
                  decoded_seconds=round(len(signal)/24000, 4), sample_rate=24000, channels=1, bitrate=48000,
                  decoded_peak=float(np.max(np.abs(signal))), clipping_samples=int(np.sum(np.abs(signal)>=1)),
                  measured_loudness=measured, asr=asr, asr_segments=checked, asr_method=source["asr_method"],
                  expected_words_match=True, human_listened=False,
                  limit="Exact-line ASR, measured pause boundaries and waveform checks do not certify subjective age or naturalness; author listening remains decisive.")
    destination = ROOT / "app/public/audio" / f"{ID}.mp3"
    shutil.copyfile(mp3, destination)
    record["delivery"] = str(destination)
    assert sha(destination) == record["mp3_sha256"]
    for path in (OUT / "record-final.json", ROOT / "docs/ch3-xu-entrance-voice.json"):
        path.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(dict(delivery=str(destination), seconds=record["decoded_seconds"], bytes=record["mp3_bytes"], sha256=record["mp3_sha256"], asr=asr, loudness=measured), ensure_ascii=False), flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repair", action="store_true", help="The sole permitted new take after the first repeated its line.")
    parser.add_argument("--finalize", action="store_true", help="Crop the extra prefix at its verified silence boundary; no new generation.")
    parser.add_argument("--attach-review", action="store_true", help="Attach completed independent checks without altering any audio.")
    args = parser.parse_args()
    if args.attach_review:
        attach_review()
        return
    if args.finalize:
        finalize()
        return
    OUT.mkdir(parents=True, exist_ok=True)
    stem = ID + (".repair" if args.repair else "")
    record_path = OUT / ("record-repair.json" if args.repair else "record.json")
    raw, wav, mp3 = [OUT / f"{stem}.{suffix}" for suffix in ("raw.wav", "wav", "mp3")]
    assert not raw.exists(), "An existing take must never be silently overwritten."
    seed, seconds = (2026102720, 2.2) if args.repair else (2026102719, 3.0)
    instruction = f'请基于下面的描述: "{DESCRIPTION}",生成语音内容"{TEXT}".'
    argv = [str(AUK / ".venv/Scripts/auk-infer.exe"), "--ckpt", str(AUK / "ckpts/AuK-Flash/auk_flash.safetensors"),
            "--qwen_path", str(AUK / "ckpts/Qwen2.5-Omni-3B"), "--dtype", "bf16", "--device", "cuda:0", "--cpu_offload",
            "--seed", str(seed), "--gen_seconds", str(seconds), "--instruction", instruction, "--output", str(raw)]
    env = {**os.environ, "PYTHONUTF8": "1", "HF_HUB_DISABLE_IMPLICIT_TOKEN": "1", "HF_HUB_OFFLINE": "1", "TRANSFORMERS_OFFLINE": "1"}
    env.pop("HF_TOKEN", None)
    started = time.monotonic()
    print("GENERATE", TEXT, "new voice, no reference", flush=True)
    with (OUT / ("generation-repair.log" if args.repair else "generation.log")).open("w", encoding="utf-8") as log:
        subprocess.run(argv, cwd=AUK, env=env, stdout=log, stderr=subprocess.STDOUT, check=True)
    af = "silenceremove=start_periods=1:start_duration=0.03:start_threshold=-50dB:start_silence=0.06,loudnorm=I=-20:TP=-2:LRA=7"
    wav_args = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(raw), "-af", af,
                "-map_metadata", "-1", "-ar", "24000", "-ac", "1", str(wav)]
    mp3_args = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(wav), "-map_metadata", "-1",
                "-c:a", "libmp3lame", "-b:a", "48k", "-ar", "24000", "-ac", "1", str(mp3)]
    run(wav_args)
    run(mp3_args)
    import numpy as np
    signal = np.frombuffer(run(["ffmpeg", "-v", "error", "-i", str(mp3), "-f", "f32le", "-acodec", "pcm_f32le", "-"]).stdout, dtype="<f4")
    assert np.isfinite(signal).all() and np.max(np.abs(signal)) < 0.95
    assert 1.0 < len(signal) / 24000 < 4.5
    record = dict(date="2026-10-27", base="53c03a8", branch="codex/ch3-ultrasound-workflow", id=ID,
                  role="许建平", take=2 if args.repair else 1, text=TEXT, description=DESCRIPTION, instruction=instruction, seed=seed, gen_seconds=seconds,
                  reference=None, method="Installed local auk-infer CLI, AuK-Flash Instruct TTS", argv=argv,
                  offline=True, implicit_token_disabled=True, license="Local AuK code/weights recorded under its MIT LICENSE; original generated voice, no third-party reference.",
                  raw=str(raw), raw_sha256=sha(raw), wav=str(wav), wav_sha256=sha(wav), mp3=str(mp3), mp3_sha256=sha(mp3),
                  mp3_bytes=mp3.stat().st_size, processing=af, ffmpeg_argv=[wav_args, mp3_args], speed_or_pitch_edit=False,
                  sample_rate=24000, channels=1, bitrate=48000, decoded_seconds=round(len(signal)/24000, 4),
                  decoded_peak=float(np.max(np.abs(signal))), clipping_samples=int(np.sum(np.abs(signal)>=1)),
                  generation_processing_seconds=round(time.monotonic()-started, 2), human_listened=False,
                  limit="ASR and waveform checks cannot certify perceived age, naturalness, performance or author approval.")
    record_path.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("GENERATED", record["decoded_seconds"], "s", record["mp3_bytes"], "B", flush=True)
    from faster_whisper import WhisperModel
    model = WhisperModel(str(AUK / "ckpts/faster-whisper-medium"), device="cpu", compute_type="int8", cpu_threads=6, local_files_only=True)
    segments, _ = model.transcribe(str(mp3), language="zh", beam_size=5, condition_on_previous_text=False, vad_filter=False, word_timestamps=True)
    record["asr_segments"] = [dict(start=s.start, end=s.end, text=s.text,
                                   words=[dict(start=w.start, end=w.end, word=w.word, probability=w.probability) for w in s.words or []]) for s in segments]
    record["asr"] = "".join(s["text"] for s in record["asr_segments"])
    record["asr_method"] = "local faster-whisper-medium CPU int8; no transcript hint; word timestamps retained"
    loudness = run(["ffmpeg", "-hide_banner", "-i", str(mp3), "-af", "loudnorm=I=-20:TP=-2:LRA=7:print_format=json", "-f", "null", "-"]).stderr.decode("utf-8", errors="replace")
    (OUT / f"{stem}.loudness.log").write_text(loudness, encoding="utf-8")
    record["measured_loudness"] = json.loads(loudness[loudness.rfind("{"):loudness.rfind("}")+1])
    silence = run(["ffmpeg", "-hide_banner", "-i", str(mp3), "-af", "silencedetect=noise=-40dB:d=0.04", "-f", "null", "-"]).stderr.decode("utf-8", errors="replace")
    (OUT / f"{stem}.silence.log").write_text(silence, encoding="utf-8")
    record["silence_log"] = str(OUT / f"{stem}.silence.log")
    record_path.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("ASR", record["asr"], flush=True)
    print("SHA256", record["mp3_sha256"], flush=True)


if __name__ == "__main__":
    main()
