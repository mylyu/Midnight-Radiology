"""Audition only: stronger word-local attenuation, no game alias replacement."""
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
OUT = AUK / 'outputs/ch2-kai-soft-shi-v6-20260921'
NAME = 'vox_ch2_natural_kai_soft_shi_v6'


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def rms(signal):
    return float(np.sqrt(np.mean(signal * signal)))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    old = json.loads((ROOT / 'docs/ch2-kai-whisper-v4.json').read_text(encoding='utf-8'))
    source = Path(old['selected']['wav'])
    signal, sr = sf.read(source, dtype='float64')
    assert sr == 24000 and signal.ndim == 1
    time = np.arange(len(signal)) / sr
    def ease(start, end):
        x = np.clip((time - start) / (end - start), 0, 1)
        return x * x * (3 - 2 * x)
    # Catch the sh-frication as well as the stressed vowel. The preceding 个
    # body finishes around 1.08 s; its samples remain untouched.
    gain_db = -14 * ease(1.10, 1.18) - 6 * ease(1.42, 1.56)
    edited = signal * np.power(10, gain_db / 20)
    first = int(1.10 * sr)
    assert np.array_equal(edited[:first], signal[:first])
    wav = OUT / f'{NAME}.wav'
    sf.write(wav, edited, sr, subtype='PCM_24')
    actual, _ = sf.read(wav, dtype='float64')
    assert np.array_equal(actual[:first], signal[:first])
    mp3 = ROOT / f'app/public/audio/{NAME}.mp3'
    assert not mp3.exists(), 'Use another filename for another audition'
    command = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', str(wav), '-b:a', '128k', str(mp3)]
    subprocess.run(command, check=True)
    word = slice(int(1.24 * sr), int(1.42 * sr))
    attenuation = 20 * np.log10(rms(actual[word]) / rms(signal[word]))
    assert abs(attenuation + 14) < .002
    model = WhisperModel(str(AUK / 'ckpts/faster-whisper-medium'), device='cpu', compute_type='int8', cpu_threads=6)
    segments, _ = model.transcribe(str(mp3), language='zh', beam_size=5, condition_on_previous_text=False, vad_filter=False)
    transcript = ''.join(s.text for s in segments)
    record = {
        'status': 'audition only; game remains on unapproved v5; no commit or deployment',
        'text': '跟你说个事儿。', 'method': 'word-local gain attenuation and additional tail fade; not regenerated speech',
        'source_record': 'docs/ch2-kai-whisper-v4.json', 'source_wav': str(source), 'source_wav_sha256': sha(source),
        'output': f'app/public/audio/{NAME}.mp3', 'sha256': sha(mp3), 'wav': str(wav), 'wav_sha256': sha(wav),
        'gain': {'attack_seconds': [1.10, 1.18], 'word_db': -14, 'tail_seconds': [1.42, 1.56], 'tail_db': -20, 'curve': 'smoothstep in dB'},
        'qa': {'sample_rate': sr, 'mono': True, 'samples': len(signal), 'exact_prefix_samples': first,
               'word_measured_db': float(attenuation), 'extra_reduction_vs_v5_db': -8,
               'word_rms_before': rms(signal[word]), 'word_rms_after': rms(actual[word]),
               'transcript': transcript, 'finite': bool(np.isfinite(actual).all()), 'peak': float(abs(actual).max())},
        'no_pitch_shift': True, 'no_time_stretch': True, 'no_global_normalization': True,
        'encode_command': command, 'script': 'scripts/ch2-kai-soft-shi-v6.py', 'script_sha256': sha(__file__),
        'human_listened': False, 'user_approved': False,
    }
    payload = json.dumps(record, ensure_ascii=False, indent=2)
    (OUT / 'record.json').write_text(payload, encoding='utf-8')
    (ROOT / 'docs/ch2-kai-soft-shi-v6.json').write_text(payload, encoding='utf-8')
    print(payload)


if __name__ == '__main__':
    main()
