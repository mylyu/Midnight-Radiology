"""Regenerate only the cousin's first-call entrance; stage outside public."""
import hashlib, json, os, subprocess, sys, time
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8")
sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
AUK = ROOT.parent / "AuK"
OUT = AUK / "outputs/ch3-cousin-light-20261027"
TEXT = "帮姐姐个忙呗。"
DESCRIPTION = "三十岁左右的年轻成熟女性，打电话给关系很熟的表弟或表妹，笑着随口请对方帮个小忙。语气轻快、明亮、亲近，带一点俏皮但不装可爱，不是小女孩。整句自然连着说，姐姐的第二个姐轻声，个和呗都轻轻带过。不是播报、不是广告、不是娇嗲撒娇，不紧张、不苦闷、不气声耳语，不逐字强调、不拖长句尾。干净人声，只说指定的这一句话。"
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def run(args): return subprocess.run(args, check=True, capture_output=True)
def main():
    OUT.mkdir(parents=True, exist_ok=True)
    raw, wav, mp3 = [OUT / ("cousin-light." + suffix) for suffix in ("raw.wav", "wav", "mp3")]
    assert not raw.exists(), "Do not overwrite an earlier take."
    seed, seconds = 2026102707, 2.1
    instruction = f'请基于下面的描述: "{DESCRIPTION}",生成语音内容"{TEXT}".'
    argv = [str(AUK / ".venv/Scripts/auk-infer.exe"), "--ckpt", str(AUK / "ckpts/AuK-Flash/auk_flash.safetensors"),
        "--qwen_path", str(AUK / "ckpts/Qwen2.5-Omni-3B"), "--dtype", "bf16", "--device", "cuda:0", "--cpu_offload",
        "--seed", str(seed), "--gen_seconds", str(seconds), "--instruction", instruction, "--output", str(raw)]
    env = {**os.environ, "PYTHONUTF8": "1", "HF_HUB_DISABLE_IMPLICIT_TOKEN": "1", "HF_HUB_OFFLINE": "1", "TRANSFORMERS_OFFLINE": "1"}
    env.pop("HF_TOKEN", None)
    started=time.monotonic()
    print("GENERATE", TEXT, "no reference", flush=True)
    with (OUT / "generation.log").open("w", encoding="utf-8") as log:
        subprocess.run(argv, cwd=AUK, env=env, stdout=log, stderr=subprocess.STDOUT, check=True)
    af="silenceremove=start_periods=1:start_duration=0.03:start_threshold=-50dB:start_silence=0.06,loudnorm=I=-20:TP=-2:LRA=7"
    wav_args=["ffmpeg","-y","-hide_banner","-loglevel","error","-i",str(raw),"-af",af,"-map_metadata","-1","-ar","24000","-ac","1",str(wav)]
    mp3_args=["ffmpeg","-y","-hide_banner","-loglevel","error","-i",str(wav),"-map_metadata","-1","-c:a","libmp3lame","-b:a","48k","-ar","24000","-ac","1",str(mp3)]
    run(wav_args);run(mp3_args)
    import numpy as np
    signal=np.frombuffer(run(["ffmpeg","-v","error","-i",str(mp3),"-f","f32le","-acodec","pcm_f32le","-"]).stdout,dtype="<f4")
    assert np.isfinite(signal).all() and np.max(np.abs(signal))<0.95
    assert 0.8<len(signal)/24000<3.5
    record=dict(date="2026-10-27",base="2479b08",role="表姐",text=TEXT,description=DESCRIPTION,instruction=instruction,
        seed=seed,gen_seconds=seconds,reference=None,method="Installed local auk-infer CLI, AuK-Flash Instruct TTS",
        argv=argv,raw=str(raw),raw_sha256=sha(raw),wav=str(wav),wav_sha256=sha(wav),mp3=str(mp3),mp3_sha256=sha(mp3),
        mp3_bytes=mp3.stat().st_size,processing=af,ffmpeg_argv=[wav_args,mp3_args],
        speed_or_pitch_edit=False,sample_rate=24000,channels=1,bitrate=48000,decoded_seconds=round(len(signal)/24000,4),
        decoded_peak=float(np.max(np.abs(signal))),clipping_samples=int(np.sum(np.abs(signal)>=1)),
        generation_processing_seconds=round(time.monotonic()-started,2),human_listened=False,
        limit="ASR and waveform validation do not certify subjective lightness/naturalness.")
    print("GENERATED",record["decoded_seconds"],"s",record["mp3_bytes"],"B",flush=True)
    (OUT/"record.json").write_text(json.dumps(record,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    from faster_whisper import WhisperModel
    model=WhisperModel(str(AUK/"ckpts/faster-whisper-medium"),device="cpu",compute_type="int8",cpu_threads=6,local_files_only=True)
    segments,_=model.transcribe(str(mp3),language="zh",beam_size=5,condition_on_previous_text=False,vad_filter=False)
    record["asr"]="".join(s.text for s in segments)
    record["asr_method"]="local faster-whisper-medium cpu int8; no transcript hint"
    (OUT/"record.json").write_text(json.dumps(record,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("ASR",record["asr"],flush=True)
if __name__=="__main__":main()

