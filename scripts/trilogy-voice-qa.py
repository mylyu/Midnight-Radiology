"""Bounded technical/ASR checks of delivered clips, not human listening."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

import numpy as np

sys.stdout.reconfigure(encoding="utf-8")
sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT.parent / "trilogy-experience-assets-20261010/audio"
AUK = ROOT.parent / "AuK"
REPORT = ROOT / "docs/trilogy-voice-qa.json"


def run(argv):
    return subprocess.run(argv, check=True, capture_output=True)


def norm(words):
    # Only common orthographic variants; no target hints passed to the ASR.
    words = words.translate(str.maketrans("來邊認個門師寧這兒厲害搶熱電腦飯帶齊舊聽見嗎講楚", "来边认个门师宁这儿厉害抢热电脑饭带齐旧听见吗讲楚"))
    words = words.translate(str.maketrans("錢會過誤兩鐘顧先", "钱会过误两钟顾先"))
    return "".join(c for c in words if "\u4e00" <= c <= "\u9fff")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", default="")
    parser.add_argument("--asr", action="store_true")
    args = parser.parse_args()
    model = None
    if args.asr:
        from faster_whisper import WhisperModel
        model = WhisperModel(str(AUK / "ckpts/faster-whisper-medium"), device="cpu", compute_type="int8", cpu_threads=6, local_files_only=True)
    previous = json.loads(REPORT.read_text(encoding="utf-8"))["clips"] if REPORT.exists() else []
    (OUT / "qa").mkdir(parents=True, exist_ok=True)
    for result in previous:
        snapshot = OUT / "qa" / f'{result["id"]}.{result["sha256"][:12]}.json'
        if not snapshot.exists():
            snapshot.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    by_id = {r["id"]: r for r in previous}
    for record_path in sorted((OUT / "records").glob("*.json")):
        record = json.loads(record_path.read_text(encoding="utf-8"))
        name = record["id"]
        if args.only and name not in args.only.split(","):
            continue
        file = Path(record["output"])
        digest = hashlib.sha256(file.read_bytes()).hexdigest()
        old = by_id.get(name, {})
        if old.get("sha256") == digest and (not args.asr or not name.startswith("vox_") or old.get("asr") is not None):
            if old.get("asr") is not None:
                old.update(asr_normalized=norm(old["asr"]), expected_normalized=norm(record["text"]),
                           exact_orthography_match=norm(old["asr"]) == norm(record["text"]) and not re.search(r"[A-Za-z]", old["asr"]))
                by_id[name] = old
                REPORT.write_text(json.dumps({"human_listened":False,"clips":list(by_id.values())}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print("ALREADY_CHECKED", name, flush=True)
            continue
        meta = json.loads(run(["ffprobe", "-v", "error", "-show_entries", "stream=sample_rate,channels,bit_rate,codec_name", "-of", "json", str(file)]).stdout)["streams"][0]
        sr = int(meta["sample_rate"])
        data = run(["ffmpeg", "-v", "error", "-i", str(file), "-f", "f32le", "-acodec", "pcm_f32le", "-"]).stdout
        x = np.frombuffer(data, dtype="<f4")
        measured = run(["ffmpeg", "-hide_banner", "-i", str(file), "-af", "loudnorm=I=-20:TP=-2:LRA=7:print_format=json", "-f", "null", "-"]).stderr.decode("utf-8", errors="replace")
        loudness = json.loads(re.search(r"\{\s*\"input_i\".*?\}", measured, re.S).group(0))
        result = dict(id=name, sha256=digest, path=str(file), expected=record.get("text"), codec=meta["codec_name"],
                      bytes=file.stat().st_size, sample_rate=sr, channels=meta["channels"], bitrate=int(meta["bit_rate"]),
                      decoded_seconds=round(len(x) / sr, 4), finite=bool(np.isfinite(x).all()),
                      decoded_peak=round(float(abs(x).max()), 6), rms=round(float(np.sqrt(np.mean(x * x))), 6),
                      clipping_samples=int(np.sum(abs(x) >= 1)), lufs=float(loudness["input_i"]), true_peak_db=float(loudness["input_tp"]),
                      human_listened=False, asr=None,
                      limitation="Objective waveform / automated ASR checks do not certify acting, age, timbre or naturalness.")
        assert result["finite"] and result["channels"] == 1 and sr == 24000 and result["bitrate"] == 48000
        assert result["clipping_samples"] == 0 and result["decoded_peak"] < .95
        assert .4 <= result["decoded_seconds"] <= 3.5 and result["rms"] > .001
        if name.startswith("trilogy_"):
            edge = int(sr * .01)
            result.update(edge_first_10ms_peak=float(abs(x[:edge]).max()), edge_last_10ms_peak=float(abs(x[-edge:]).max()),
                          loop_boundary_jump=float(abs(x[0] - x[-1])), source_kind="code-synthesized illustrative equipment sound")
            assert abs(result["decoded_seconds"] - 3) < .001
            assert result["loop_boundary_jump"] < .001
        if model and name.startswith("vox_"):
            segments, _ = model.transcribe(str(file), language="zh", beam_size=5, condition_on_previous_text=False, vad_filter=False)
            text = "".join(s.text for s in segments)
            result.update(asr=text, asr_normalized=norm(text), expected_normalized=norm(record["text"]),
                          extra_latin_text=re.findall(r"[A-Za-z]+", text),
                          exact_orthography_match=norm(text) == norm(record["text"]) and not re.search(r"[A-Za-z]", text),
                          asr_method="Local faster-whisper-medium CPU int8, beam5, zh, no previous text, no VAD, no target prompt.")
        by_id[name] = result
        snapshot = OUT / "qa" / f'{name}.{digest[:12]}.json'
        snapshot.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        REPORT.write_text(json.dumps({"human_listened":False,"clips":list(by_id.values())}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(result, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
