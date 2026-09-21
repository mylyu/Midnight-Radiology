"""Reduce only the final word's accent in the existing AuK performance.

This is explicitly a local gain edit, not a claim of a new TTS performance.
Preserve all samples before 1.10 s; no pitch/tempo/global loudness processing.
"""
import hashlib
import json
import subprocess
import sys
from pathlib import Path
import numpy as np
import soundfile as sf
from faster_whisper import WhisperModel

sys.stdout.reconfigure(encoding='utf-8')
ROOT = Path(__file__).resolve().parents[1]
AUK = ROOT.parent / 'AuK'
OUT = AUK / 'outputs/ch2-kai-soft-shi-v5-20260921'
NAME = 'vox_ch2_natural_kai_soft_shi_v5'
BASE = 'a542af1'


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def rms(signal):
    return float(np.sqrt(np.mean(np.square(signal))))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    old = json.loads((ROOT / 'docs/ch2-kai-whisper-v4.json').read_text(encoding='utf-8'))
    source = Path(old['selected']['wav'])
    old_mp3 = ROOT / old['output']
    assert sha(old_mp3) == old['selected']['sha256']
    signal, sr = sf.read(source, dtype='float64')
    assert sr == 24000 and signal.ndim == 1
    start, end, db = 1.10, 1.24, -6.0
    t = np.arange(len(signal)) / sr
    progress = np.clip((t - start) / (end - start), 0, 1)
    smoothstep = progress * progress * (3 - 2 * progress)
    envelope = np.power(10, db * smoothstep / 20)
    edited = signal * envelope
    first = int(start * sr)
    assert np.array_equal(edited[:first], signal[:first])
    wav = OUT / f'{NAME}.wav'
    sf.write(wav, edited, sr, subtype='PCM_24')
    decoded, _ = sf.read(wav, dtype='float64')
    assert np.array_equal(decoded[:first], signal[:first]), 'Untouched prefix must survive WAV export exactly'
    mp3 = ROOT / f'app/public/audio/{NAME}.mp3'
    assert not mp3.exists(), 'Do not overwrite a published take; use a new version'
    argv = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', str(wav), '-b:a', '128k', str(mp3)]
    subprocess.run(argv, check=True)
    model = WhisperModel(str(AUK / 'ckpts/faster-whisper-medium'), device='cpu', compute_type='int8', cpu_threads=6)
    segments, _ = model.transcribe(str(mp3), language='zh', beam_size=5, condition_on_previous_text=False, vad_filter=False)
    transcript = ''.join(segment.text for segment in segments)
    old_word = signal[int(1.24 * sr):int(1.42 * sr)]
    new_word = decoded[int(1.24 * sr):int(1.42 * sr)]
    word_change = 20 * np.log10(rms(new_word) / rms(old_word))
    assert abs(word_change - db) < .002
    assert '跟你说个事' in transcript
    record = {
        'baseline': BASE, 'role': '小凯', 'text': '跟你说个事儿。',
        'method': 'local word gain envelope on an existing AuK performance; not regenerated TTS',
        'source_record': 'docs/ch2-kai-whisper-v4.json', 'source_wav': str(source), 'source_wav_sha256': sha(source),
        'source_mp3': old['output'], 'source_mp3_sha256': sha(old_mp3),
        'output': f'app/public/audio/{NAME}.mp3', 'sha256': sha(mp3), 'wav': str(wav), 'wav_sha256': sha(wav),
        'gain': {'start_seconds': start, 'end_seconds': end, 'db': db, 'curve': 'smoothstep in dB; hold to end'},
        'alignment_note': 'Whisper word timestamps plus acoustic sh-frication onset; estimated boundary uncertainty 20–40 ms. Keep 个 body at 1.00–1.08 s untouched.',
        'qa': {'sample_rate': sr, 'mono': True, 'samples': len(signal), 'seconds': len(signal) / sr,
               'exactly_preserved_prefix_samples': first, 'word_rms_before': rms(old_word), 'word_rms_after': rms(new_word),
               'word_change_db': float(word_change), 'transcript': transcript, 'finite': bool(np.isfinite(decoded).all()),
               'peak': float(abs(decoded).max())},
        'no_pitch_shift': True, 'no_time_stretch': True, 'no_global_normalization': True,
        'encode_argv': argv, 'script': 'scripts/ch2-kai-soft-shi.py', 'script_sha256': sha(__file__),
        'human_listened': False, 'user_approved': False,
    }
    payload = json.dumps(record, ensure_ascii=False, indent=2)
    (OUT / 'record.json').write_text(payload, encoding='utf-8')
    (ROOT / 'docs/ch2-kai-soft-shi-v5.json').write_text(payload, encoding='utf-8')
    print(payload, flush=True)


if __name__ == '__main__':
    main()
