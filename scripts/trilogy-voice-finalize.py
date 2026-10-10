"""Freeze chosen new-role voices and summarize 24 staged assets; no public writes."""
import hashlib
import json
from pathlib import Path
import shutil
import sys

sys.stdout.reconfigure(encoding="utf-8")
sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT.parent / "trilogy-experience-assets-20261010/audio"


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def main():
    qa = {r["id"]:r for r in json.loads((ROOT / "docs/trilogy-voice-qa.json").read_text(encoding="utf-8"))["clips"]}
    plan = json.loads((ROOT / "docs/trilogy-voice-lines.json").read_text(encoding="utf-8"))["lines"]
    assert len(plan) == 21 and len(qa) == 24
    rows = []
    for path in sorted((OUT / "records").glob("*.json")):
        row = json.loads(path.read_text(encoding="utf-8"))
        check = qa[row["id"]]
        assert sha(row["output"]) == row["output_sha256"] == check["sha256"]
        assert check["channels"] == 1 and check["sample_rate"] == 24000 and check["bitrate"] == 48000 and check["clipping_samples"] == 0
        note = None
        if row["id"] == "vox_trilogy_mystery_v2":
            note = "Whisper wrote 戴 instead of 带, identical pronunciation; no added or missing words."
        elif row["id"] == "vox_c3_wang_v2":
            note = "Whisper wrote 了 instead of target 啦. Independent Qwen review retained; particle uncertainty remains for actual listening."
        elif row["id"].startswith("vox_"):
            assert check["exact_orthography_match"], f"Unresolved content mismatch {row['id']}"
        if row["id"].startswith("vox_") and row.get("reference") is None:
            fixed = OUT / "references" / f"{row['id']}.fixed.wav"
            if fixed.exists() and sha(fixed) != sha(row["wav"]):
                first = fixed.with_name(f"{row['id']}.first-candidate.wav")
                if not first.exists():
                    shutil.copy2(fixed, first)
            shutil.copy2(row["wav"], fixed)
            row.update(future_fixed_reference=str(fixed), future_fixed_reference_sha256=sha(fixed),
                       future_fixed_reference_source="Chosen final 24kHz mono mother WAV; same originally selected role timbre, including bounded repairs/crop.")
            path.write_text(json.dumps(row, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
        rows.append(dict(id=row["id"], role=row.get("role","equipment"), text=row.get("text"),
                         source=row["output"], source_kind=row.get("source_kind","Local AuK-Flash synthetic character voice"),
                         sha256=check["sha256"], bytes=check["bytes"], decoded_seconds=check["decoded_seconds"],
                         sample_rate=check["sample_rate"], channels=1, bitrate=48000, lufs=check["lufs"],
                         decoded_peak=check["decoded_peak"], true_peak_db=check["true_peak_db"],
                         asr=check["asr"], exact_orthography_match=check.get("exact_orthography_match"),
                         content_note=note, human_listened=False))
    generation = json.loads((ROOT / "docs/trilogy-voice-generation.json").read_text(encoding="utf-8"))
    generation["lines"] = [json.loads(p.read_text(encoding="utf-8")) for p in sorted((OUT / "records").glob("vox_*.json"))]
    (ROOT / "docs/trilogy-voice-generation.json").write_text(json.dumps(generation, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    delivery = dict(asset_count=24, voices=21, equipment_sounds=3, total_bytes=sum(r["bytes"] for r in rows),
                    voice_exact_asr_count=sum(r["exact_orthography_match"] is True for r in rows),
                    no_new_generation_after_second_attempt=True, human_listened=False,
                    limitation="19 orthographic ASR matches, one known homophone spelling difference, one final-particle transcription uncertainty. All waveform/encoding checks pass; actual acting/age/timbre not human-certified.",
                    output_root=str(OUT / "mp3"), assets=rows)
    (ROOT / "docs/trilogy-voice-delivery.json").write_text(json.dumps(delivery, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print(json.dumps({k:v for k,v in delivery.items() if k != "assets"}, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
