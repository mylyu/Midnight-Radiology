"""Two text-only AuK auditions. No reference audio and no game replacement."""
import hashlib
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
ROOT = Path(__file__).resolve().parents[1]
AUK = ROOT.parent / 'AuK'
OUT = AUK / 'outputs/ch2-kai-no-reference-v7-20260921'
PUBLIC = ROOT / 'app/public/auditions/kai-no-reference-v7'
TEXT = '跟你说个事儿。'
CANDIDATES = [
    ('a', 2026092201, 1.55,
     '二十多岁的年轻男性，声音自然清爽，不刻意压低音高。他凑近熟悉的同事，小声说一句悄悄话，怕旁边的人听见。近距离、轻柔、有一点气息，但字清楚。整句连贯地说过去，不一字一顿；最后的事儿短而轻，低低收住，不强调，不扬调，不像问句。不带笑，不装神秘，不是播音或舞台表演。'),
    ('b', 2026092202, 1.65,
     '一个年轻的男同事，在安静的办公室里压低声音私下搭话。中低音，松弛日常，声音很轻，像就在身边小声提醒。语速自然，跟你说个连着说，事儿轻轻带过，句尾短促向下收住，没有重读、没有夸张起伏。听起来随口、亲近，不沉重，不兴奋，不是正式宣告。'),
]


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def write(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')


def main():
    import numpy as np
    import soundfile as sf
    from faster_whisper import WhisperModel
    for folder in ['raw', 'wav', 'logs']:
        (OUT / folder).mkdir(parents=True, exist_ok=True)
    PUBLIC.mkdir(parents=True, exist_ok=True)
    env = {**os.environ, 'PYTHONUTF8': '1', 'HF_HUB_DISABLE_IMPLICIT_TOKEN': '1'}
    env.pop('HF_TOKEN', None)
    rows = []
    for name, seed, seconds, description in CANDIDATES:
        instruction = f'请基于下面的描述: "{description}",生成语音内容"{TEXT}".'
        raw = OUT / f'raw/{name}.wav'
        argv = [str(AUK / '.venv/Scripts/auk-infer.exe'),
                '--ckpt', str(AUK / 'ckpts/AuK-Flash/auk_flash.safetensors'),
                '--qwen_path', str(AUK / 'ckpts/Qwen2.5-Omni-3B'),
                '--dtype', 'bf16', '--device', 'cuda:0', '--cpu_offload',
                '--seed', str(seed), '--gen_seconds', str(seconds),
                '--instruction', instruction, '--output', str(raw)]
        assert '--audio' not in argv and '--ref_text' not in argv
        assert not raw.exists(), 'Keep old auditions immutable'
        print(f'GENERATE {name}: text-only, no --audio or --ref_text', flush=True)
        started = time.monotonic()
        with (OUT / f'logs/{name}.log').open('w', encoding='utf-8') as log:
            subprocess.run(argv, cwd=AUK, env=env, stdout=log, stderr=subprocess.STDOUT, check=True)
        wav = OUT / f'wav/{name}.wav'
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', str(raw),
                        '-af', 'loudnorm=I=-23:TP=-3:LRA=7', '-ar', '24000', '-ac', '1', str(wav)], check=True)
        mp3 = PUBLIC / f'{name}.mp3'
        assert not mp3.exists()
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', str(wav),
                        '-b:a', '128k', str(mp3)], check=True)
        shutil.copy2(mp3, OUT / f'{name}.mp3')
        signal, sr = sf.read(mp3)
        assert sr == 24000 and signal.ndim == 1 and np.isfinite(signal).all()
        rows.append({'id': name, 'text': TEXT, 'seed': seed, 'seconds': seconds,
                     'task': 'text-only Instruct TTS', 'reference_audio': None,
                     'description': description, 'instruction': instruction, 'argv': argv,
                     'elapsed_seconds': round(time.monotonic() - started, 2),
                     'raw': str(raw), 'raw_sha256': sha(raw), 'wav': str(wav), 'wav_sha256': sha(wav),
                     'output': str(mp3.relative_to(ROOT)).replace('\\', '/'), 'sha256': sha(mp3),
                     'processing': 'Whole-clip loudnorm -23 LUFS/-3 dBTP only; no word gain, pitch change or time stretch',
                     'qa': {'sample_rate': sr, 'mono': True, 'seconds': len(signal) / sr,
                            'peak': float(abs(signal).max()), 'rms': float(np.sqrt(np.mean(signal * signal)))}})
        write(OUT / 'candidates.json', rows)
        print(f'DONE {name}', flush=True)
    model = WhisperModel(str(AUK / 'ckpts/faster-whisper-medium'), device='cpu', compute_type='int8', cpu_threads=6)
    for row in rows:
        segments, _ = model.transcribe(str(ROOT / row['output']), language='zh', beam_size=5,
                                      condition_on_previous_text=False, vad_filter=False)
        row['qa']['transcript'] = ''.join(segment.text for segment in segments)
        print(json.dumps({'id': row['id'], 'qa': row['qa']}, ensure_ascii=False), flush=True)
    record = {'status': 'audition only; no game alias changed, no commit or deployment',
              'reference_audio_used': False, 'voice_identity': 'Newly generated from text description; not locked to old Kai',
              'candidates': rows, 'script': 'scripts/ch2-kai-no-reference.py', 'script_sha256': sha(__file__),
              'human_listened': False, 'user_approved': False,
              'limitations': 'ASR/decoding checks are not proof that the performance or final-word stress matches the request.'}
    write(OUT / 'record.json', record)
    write(ROOT / 'docs/ch2-kai-no-reference-v7.json', record)


if __name__ == '__main__':
    main()
