"""Text-only AuK auditions with the spoken sentence appearing exactly once."""
import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path
import numpy as np
import soundfile as sf
from faster_whisper import WhisperModel

sys.stdout.reconfigure(encoding='utf-8')
ROOT = Path(__file__).resolve().parents[1]
AUK = ROOT.parent / 'AuK'
OUT = AUK / 'outputs/ch2-kai-no-reference-v8-20260921'
PUBLIC = ROOT / 'app/public/auditions/kai-no-reference-v8'
TEXT = '跟你说个事儿。'


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def write(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')


def main():
    for folder in ['raw', 'wav', 'logs']:
        (OUT / folder).mkdir(parents=True, exist_ok=True)
    PUBLIC.mkdir(parents=True, exist_ok=True)
    env = {**os.environ, 'PYTHONUTF8': '1', 'HF_HUB_DISABLE_IMPLICIT_TOKEN': '1'}
    env.pop('HF_TOKEN', None)
    rows = []
    directions = [
        ('a', 2026092211, 1.70, 'A young adult man whispering confidentially to a nearby colleague. Soft close voice with light breath, natural conversational Mandarin. Relaxed, light articulation, an unstressed final syllable, and a low falling finish.'),
        ('b', 2026092212, 1.85, 'A young man making a quiet private aside in Mandarin. Gentle, casual, slightly breathy low-volume speech, not dramatic. One smoothly connected phrase; the final word is very light and brief, settling downward rather than rising.'),
    ]
    for name, seed, seconds, description in directions:
        instruction = f'Generate speech based on the following description: "{description}". The content to speak is: "{TEXT}".'
        raw = OUT / f'raw/{name}.wav'
        argv = [str(AUK / '.venv/Scripts/auk-infer.exe'), '--ckpt', str(AUK / 'ckpts/AuK-Flash/auk_flash.safetensors'),
                '--qwen_path', str(AUK / 'ckpts/Qwen2.5-Omni-3B'), '--dtype', 'bf16', '--device', 'cuda:0', '--cpu_offload',
                '--seed', str(seed), '--gen_seconds', str(seconds), '--instruction', instruction, '--output', str(raw)]
        assert '--audio' not in argv and '--ref_text' not in argv and instruction.count(TEXT) == 1
        assert not raw.exists()
        print(f'GENERATE {name}: no reference; English direction, one Mandarin sentence', flush=True)
        with (OUT / f'logs/{name}.log').open('w', encoding='utf-8') as log:
            subprocess.run(argv, cwd=AUK, env=env, stdout=log, stderr=subprocess.STDOUT, check=True)
        wav, mp3 = OUT / f'wav/{name}.wav', PUBLIC / f'{name}.mp3'
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', str(raw), '-af', 'loudnorm=I=-23:TP=-3:LRA=7',
                        '-ar', '24000', '-ac', '1', str(wav)], check=True)
        assert not mp3.exists()
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', str(wav), '-b:a', '128k', str(mp3)], check=True)
        signal, sr = sf.read(mp3)
        assert sr == 24000 and signal.ndim == 1 and np.isfinite(signal).all()
        rows.append({'id': name, 'text': TEXT, 'task': 'text-only Instruct TTS', 'reference_audio': None,
                     'seed': seed, 'seconds': seconds, 'instruction': instruction, 'argv': argv,
                     'raw': str(raw), 'raw_sha256': sha(raw), 'wav': str(wav), 'wav_sha256': sha(wav),
                     'output': str(mp3.relative_to(ROOT)).replace('\\', '/'), 'sha256': sha(mp3),
                     'processing': 'Whole-clip loudnorm only; no local-word attenuation, pitch shift or time stretch',
                     'qa': {'sample_rate': sr, 'mono': True, 'seconds': len(signal) / sr, 'peak': float(abs(signal).max())}})
        write(OUT / 'candidates.json', rows)
        print(f'DONE {name}', flush=True)
    model = WhisperModel(str(AUK / 'ckpts/faster-whisper-medium'), device='cpu', compute_type='int8', cpu_threads=6)
    for row in rows:
        segments, _ = model.transcribe(str(ROOT / row['output']), language='zh', beam_size=5, condition_on_previous_text=False, vad_filter=False)
        row['qa']['transcript'] = ''.join(segment.text for segment in segments)
        print(json.dumps({'id': row['id'], 'qa': row['qa']}, ensure_ascii=False), flush=True)
    record = {'status': 'audition only; game unchanged', 'reference_audio_used': False,
              'candidates': rows, 'script': 'scripts/ch2-kai-no-reference-clean.py', 'script_sha256': sha(__file__),
              'supersedes': 'v7 A/B rejected: two independent ASRs found additional/repeated speech',
              'human_listened': False, 'user_approved': False}
    write(OUT / 'record.json', record)
    write(ROOT / 'docs/ch2-kai-no-reference-v8.json', record)


if __name__ == '__main__':
    main()
