"""Three low-level 3s illustrative equipment sounds; no human recordings.

MRI uses repeated gradient-like mechanical bursts. US models only cooling fan /
room equipment hum (ultrasound carrier is not an audible beep). PET models a low
fan/motor hum; tracer decay does not create an audible pulse. These are bounded
scene cues, never a real clinical recording or a calibrated sequence waveform.
"""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

import numpy as np
from scipy.signal import butter, sosfilt
import soundfile as sf

sys.stdout.reconfigure(encoding="utf-8")
sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT.parent / "trilogy-experience-assets-20261010/audio"
SR = 24000
SECONDS = 3


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def main():
    for folder in ("raw", "wav", "mp3", "records"):
        (OUT / folder).mkdir(parents=True, exist_ok=True)
    t = np.arange(SR * SECONDS, dtype=np.float64) / SR
    records = []
    for index, name in enumerate(("trilogy_us_scan_v2", "trilogy_mri_scan_v2", "trilogy_pet_scan_v2")):
        assert not (ROOT / "app/public/audio" / f"{name}.mp3").exists(), "No approved clip overwrites."
        rng = np.random.default_rng(2026101101 + index)
        noise = rng.normal(0, 1, len(t))
        if index == 0:
            # Soft diffuse fan noise, no ultrasound carrier or Doppler pulse.
            x = sosfilt(butter(2, [90, 900], btype="bandpass", fs=SR, output="sos"), noise)
            x += .04 * np.sin(2 * np.pi * 100 * t) + .015 * np.sin(2 * np.pi * 200 * t)
            x *= .95 + .05 * np.sin(2 * np.pi * .7 * t)
            gain = -38
            method = "90–900 Hz bandpass fan noise, 100/200 Hz weak hum, gentle 0.7 Hz level variation. No emitted-ultrasound or Doppler tone."
        elif index == 1:
            # Distributed pulses imitate a bounded acquisition's mechanical timbre.
            envelope = np.maximum(0, np.sin(2 * np.pi * 10 * t)) ** 1.8
            vibration = .45 * np.sin(2 * np.pi * 180 * t) + .2 * np.sin(2 * np.pi * 360 * t) + .1 * np.sin(2 * np.pi * 540 * t)
            broad = sosfilt(butter(2, [120, 1800], btype="bandpass", fs=SR, output="sos"), noise)
            x = envelope * (vibration + .24 * broad) + .025 * np.sin(2 * np.pi * 80 * t)
            gain = -28
            method = "10 Hz smooth repeated gradient-like bursts of 180/360/540 Hz vibration plus 120–1800 Hz texture and weak 80 Hz motor bed; illustrative, not an actual sequence."
        else:
            x = sosfilt(butter(2, [40, 500], btype="bandpass", fs=SR, output="sos"), noise)
            x += .12 * np.sin(2 * np.pi * 80 * t) + .05 * np.sin(2 * np.pi * 160 * t)
            gain = -35
            method = "40–500 Hz soft low fan noise with weak 80/160 Hz motor hum. No radioactive-decay click or CT-like pulses."
        # A 40ms silent margin keeps MP3 transform smearing away from the seam.
        fade = np.minimum(1, np.maximum(0, t - .04) / .06) * np.minimum(1, np.maximum(0, SECONDS - .04 - t) / .09)
        x *= np.maximum(0, fade)
        x /= max(1e-9, float(np.sqrt(np.mean(x * x))))
        x *= 10 ** (gain / 20)
        raw = OUT / "raw" / f"{name}.wav"
        wav = OUT / "wav" / f"{name}.wav"
        mp3 = OUT / "mp3" / f"{name}.mp3"
        sf.write(raw, x, SR, subtype="PCM_16")
        # Normalize from the original PCM WAV, never transcode an MP3.
        target_lufs = -26 if index == 1 else -28
        normalization = f"loudnorm=I={target_lufs}:TP=-3:LRA=7"
        normalization_argv = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(raw), "-af", normalization,
                              "-map_metadata", "-1", "-ar", "24000", "-ac", "1", str(wav)]
        subprocess.run(normalization_argv, check=True)
        argv = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(wav), "-map_metadata", "-1", "-c:a", "libmp3lame", "-b:a", "48k", "-ar", "24000", "-ac", "1", str(mp3)]
        subprocess.run(argv, check=True)
        row = dict(id=name, source_kind="code-synthesized illustrative equipment sound", source="scripts/trilogy-voice-equipment.py",
                   seconds=SECONDS, sample_rate=SR, channels=1, seed=2026101101 + index, rms_gain_dbfs=gain,
                   fade_in_seconds=.06, fade_out_seconds=.09, silent_margin_seconds=.04, target_lufs=target_lufs, true_peak_ceiling_db=-3,
                   normalization=normalization, normalization_argv=normalization_argv,
                   method=method, license="Original deterministic code synthesis; no sampled third-party recording.",
                   raw=str(raw), raw_sha256=sha(raw), wav=str(wav), wav_sha256=sha(wav), output=str(mp3), output_sha256=sha(mp3), output_bytes=mp3.stat().st_size,
                   ffmpeg_argv=argv, human_listened=False,
                   limitation="Low-volume illustrative scene cue, not an actual patient/equipment recording, not calibrated MRI gradient or diagnostic acoustics.")
        (OUT / "records" / f"{name}.json").write_text(json.dumps(row, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        records.append(row)
        print(name, mp3.stat().st_size, "bytes", flush=True)
    (ROOT / "docs/trilogy-voice-equipment.json").write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
