"""Inspect duplicate candidates; trim only a complete first utterance at a pause."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys

import numpy as np

sys.stdout.reconfigure(encoding="utf-8")
sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
AUK = ROOT.parent / "AuK"
OUT = ROOT.parent / "trilogy-experience-assets-20261010/audio"
REPORT = ROOT / "docs/trilogy-voice-trim.json"


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--inspect", default="")
    parser.add_argument("--crop", default="", help="ID=seconds comma list, chosen after pause inspection")
    args = parser.parse_args()
    report = json.loads(REPORT.read_text(encoding="utf-8")) if REPORT.exists() else {}
    if args.inspect:
        from faster_whisper import WhisperModel
        model = WhisperModel(str(AUK / "ckpts/faster-whisper-medium"), device="cpu", compute_type="int8", cpu_threads=6, local_files_only=True)
        for name in args.inspect.split(","):
            record = json.loads((OUT / "records" / f"{name}.json").read_text(encoding="utf-8"))
            file = record["wav"]
            pcm = subprocess.run(["ffmpeg","-v","error","-i",file,"-f","f32le","-acodec","pcm_f32le","-"], check=True, capture_output=True).stdout
            x = np.frombuffer(pcm, dtype="<f4")
            segments, _ = model.transcribe(file, language="zh", beam_size=5, condition_on_previous_text=False, vad_filter=False, word_timestamps=True)
            words = [{"text":w.word,"start":w.start,"end":w.end} for s in segments for w in s.words]
            silent = subprocess.run(["ffmpeg","-hide_banner","-i",file,"-af","silencedetect=noise=-35dB:d=0.025","-f","null","-"], check=True, capture_output=True).stderr.decode("utf-8", errors="replace")
            gaps = [line for line in silent.splitlines() if "silence_" in line]
            energy = [round(float(np.sqrt(np.mean(x[i:i+240]**2))),5) for i in range(0,len(x),240)]
            item = dict(source=file,source_sha256=sha(file), words=words, silence_detection=gaps, rms_10ms=energy, human_listened=False)
            report[name] = item
            print(json.dumps({"id":name,"words":words,"silence":gaps}, ensure_ascii=False), flush=True)
    if args.crop:
        for pair in args.crop.split(","):
            name, value = pair.split("=")
            end = float(value)
            record_path = OUT / "records" / f"{name}.json"
            record = json.loads(record_path.read_text(encoding="utf-8"))
            wav = Path(record["wav"])
            original = wav.with_name(f"{name}.uncut.a{record['attempt']}.wav")
            if not original.exists():
                shutil.copy2(wav, original)
            assert sha(original) == report[name]["source_sha256"], "Inspected source changed."
            af = f"atrim=end={end},asetpts=PTS-STARTPTS,afade=t=out:st={end-.015}:d=0.015,apad=pad_dur=0.10"
            commands = [["ffmpeg","-y","-hide_banner","-loglevel","error","-i",str(original),"-af",af,"-ar","24000","-ac","1",str(wav)],
                        ["ffmpeg","-y","-hide_banner","-loglevel","error","-i",str(wav),"-map_metadata","-1","-c:a","libmp3lame","-b:a","48k","-ar","24000","-ac","1",record["output"]]]
            for command in commands:
                subprocess.run(command, check=True)
            report[name].update(crop_end_seconds=end, processing=af, original=str(original), original_sha256=sha(original),
                                argv=commands, purpose="Retain only complete first utterance; no new generation, pitch or rate change.")
            record.update(trim=report[name], wav_sha256=sha(wav), output_sha256=sha(record["output"]),output_bytes=Path(record["output"]).stat().st_size)
            record_path.write_text(json.dumps(record, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
            print("CROPPED", name, end, flush=True)
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    if args.crop:
        gen = json.loads((ROOT / "docs/trilogy-voice-generation.json").read_text(encoding="utf-8"))
        gen["lines"] = [json.loads(p.read_text(encoding="utf-8")) for p in sorted((OUT / "records").glob("vox_*.json"))]
        (ROOT / "docs/trilogy-voice-generation.json").write_text(json.dumps(gen,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")


if __name__ == "__main__":
    main()
