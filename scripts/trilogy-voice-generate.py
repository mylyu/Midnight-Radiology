"""Local AuK-Flash entrances; raw/staged audio stays outside formal public.

Use the installed official Python API once per batch (the installed auk-infer
CLI's engine and documented templates), avoiding repeated model load. There is
no prompt enhancer, remote API, new dependency, pitch shift or speed shift.
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

sys.stdout.reconfigure(encoding="utf-8")
sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
AUK = ROOT.parent / "AuK"
OUT = ROOT.parent / "trilogy-experience-assets-20261010/audio"
PLAN = ROOT / "docs/trilogy-voice-lines.json"
REPORT = ROOT / "docs/trilogy-voice-generation.json"
os.environ["PYTHONUTF8"] = "1"
os.environ["HF_HUB_DISABLE_IMPLICIT_TOKEN"] = "1"
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ.pop("HF_TOKEN", None)


def sha(file):
    return hashlib.sha256(Path(file).read_bytes()).hexdigest()


def write(file, value):
    Path(file).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def run(argv):
    return subprocess.run(argv, check=True, capture_output=True).stdout


def process(row, meta):
    raw = Path(meta["raw"])
    wav = OUT / "wav" / f'{row["id"]}.wav'
    mp3 = OUT / "mp3" / f'{row["id"]}.mp3'
    # Only remove leading digital silence. Preserve breaths, speech and tail.
    af = "silenceremove=start_periods=1:start_duration=0.03:start_threshold=-50dB:start_silence=0.06,loudnorm=I=-20:TP=-2:LRA=7"
    wav_args = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(raw),
                "-af", af, "-map_metadata", "-1", "-ar", "24000", "-ac", "1", str(wav)]
    mp3_args = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(wav),
                "-map_metadata", "-1", "-c:a", "libmp3lame", "-b:a", "48k", "-ar", "24000", "-ac", "1", str(mp3)]
    run(wav_args)
    run(mp3_args)
    meta.update(processing=af, wav=str(wav), wav_sha256=sha(wav), output=str(mp3),
                output_sha256=sha(mp3), output_bytes=mp3.stat().st_size,
                ffmpeg_argv=[wav_args, mp3_args], human_listened=False)
    # New roles keep their first chosen waveform as a fixed future reference.
    if row["reference"] is None:
        fixed = OUT / "references" / f'{row["id"]}.fixed.wav'
        if not fixed.exists():
            shutil.copy2(raw, fixed)
        meta.update(future_fixed_reference=str(fixed), future_fixed_reference_sha256=sha(fixed))
    write(OUT / "records" / f'{row["id"]}.json', meta)
    print("PREPARED", row["id"], mp3.stat().st_size, "bytes", flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", default="")
    parser.add_argument("--attempt", type=int, default=1)
    parser.add_argument("--repair-first", default="", help="IDs to regenerate once using their own first take as fixed timbre reference")
    parser.add_argument("--prepare-only", action="store_true")
    args = parser.parse_args()
    for name in ("raw", "logs", "references", "wav", "mp3", "records", "qa"):
        (OUT / name).mkdir(parents=True, exist_ok=True)
    rows = json.loads(PLAN.read_text(encoding="utf-8"))["lines"]
    chosen = [r for r in rows if not args.only or r["id"] in args.only.split(",")]
    engine = None
    for row in chosen:
        assert 0 < sum("\u4e00" <= c <= "\u9fff" for c in row["text"]) <= 8
        assert not (ROOT / "app/public/audio" / f'{row["id"]}.mp3').exists(), "New IDs must not replace an existing approved clip."
        repair_first = row["id"] in args.repair_first.split(",")
        attempt = 2 if repair_first else args.attempt
        seed = row["seed"] + (attempt - 1) * 100
        raw = OUT / "raw" / f'{row["id"]}.a{attempt}.wav'
        raw_meta = raw.with_suffix(".json")
        reference = None
        if row["reference"] or repair_first:
            source = OUT / "raw" / f'{row["id"]}.a1.wav' if repair_first else ROOT / row["reference"]
            reference = OUT / "references" / source.name
            if not reference.exists():
                shutil.copy2(source, reference)
            assert sha(source) == sha(reference), "Reference changed."
            instruction = f'Say the following with the same voice: "{row["text"]}"'
        else:
            instruction = f'请基于下面的描述: "{row["voice"]} 干净人声，只读指定台词。",生成语音内容"{row["text"]}"。'
        cli = [str(AUK / ".venv/Scripts/auk-infer.exe"), "--ckpt", str(AUK / "ckpts/AuK-Flash/auk_flash.safetensors"),
               "--qwen_path", str(AUK / "ckpts/Qwen2.5-Omni-3B"), "--dtype", "bf16", "--device", "cuda:0", "--cpu_offload",
               "--seed", str(seed), "--gen_seconds", str(row["seconds"]), "--instruction", instruction,
               "--gen_text", row["text"], "--output", str(raw)]
        if reference:
            cli += ["--audio", str(reference)]
        if not (raw.exists() and raw_meta.exists()):
            assert not args.prepare_only, f"Missing generated source {raw}"
            from auk.infer.infer_auk import AukInfer, save_audio
            import torch
            start = time.monotonic()
            if engine is None:
                engine = AukInfer(config_path=str(AUK / "ckpts/AuK-Flash/config.yaml"),
                                  ckpt_path=str(AUK / "ckpts/AuK-Flash/auk_flash.safetensors"),
                                  device="cuda:0", dtype="bf16", qwen_path=str(AUK / "ckpts/Qwen2.5-Omni-3B"), cpu_offload=True)
            torch.cuda.reset_peak_memory_stats()
            content = [{"type": "text", "text": instruction}]
            if reference:
                content.append({"type": "audio", "audio": str(reference)})
            print("GENERATE", row["id"], "seed", seed, flush=True)
            audio, sr = engine.generate([{"role": "user", "content": content}], audio=str(reference) if reference else None,
                                       gen_seconds=row["seconds"], seed=seed)
            save_audio(audio, sr, str(raw))
            meta = dict(row, attempt=attempt, seed=seed, instruction=instruction,
                        method="Installed official AukInfer Python API; one model load per batch", cli_equivalent=cli,
                        raw=str(raw), raw_sha256=sha(raw), raw_sample_rate=sr,
                        reference_path=str(reference) if reference else None,
                        reference_source=str(source) if reference else None,
                        repair_first=repair_first,
                        reference_sha256=sha(reference) if reference else None,
                        elapsed_seconds=round(time.monotonic() - start, 3),
                        torch_version=torch.__version__, gpu=torch.cuda.get_device_name(0),
                        peak_cuda_allocated_bytes=torch.cuda.max_memory_allocated(),
                        decode={"model":"AuK-Flash","nfe":4,"cfg":0,"t_grid":[0.0,0.07612049579620361,0.2928932309150696,0.6173166036605835,1.0],
                                "dtype":"bf16","device":"cuda:0","cpu_offload":True,"vae_target_sample_rate":24000})
            write(raw_meta, meta)
            print("DONE", row["id"], meta["elapsed_seconds"], "seconds", flush=True)
        meta = json.loads(raw_meta.read_text(encoding="utf-8"))
        assert meta["text"] == row["text"] and meta["seed"] == seed and meta["instruction"] == instruction
        process(row, meta)
    write(REPORT, {"scope":"new ch3–5 staging only; no game imports", "output_root":str(OUT),
                   "local_sources":{"auk_root":str(AUK),"cookbook":str(AUK / "docs/COOKBOOK.md"),"license":"Installed AuK LICENSE: MIT"},
                   "remote_api_used":False,"new_dependencies_installed":False,"human_listened":False,
                   "lines":[json.loads(p.read_text(encoding="utf-8")) for p in sorted((OUT / "records").glob("vox_*.json"))]})


if __name__ == "__main__":
    main()
