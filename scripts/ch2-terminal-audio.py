"""New Chapter 2-only terminal cue; no reference voice or existing-asset edits.

Run with the sibling AuK/.venv/Scripts/python.exe. Raw WAVs stay outside the
repository; the small reproducibility record and two new MP3s are deliverables.
ASR/acoustic checks are not a claim of human listening or approval.
"""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess

import numpy as np
import soundfile as sf
from faster_whisper import WhisperModel

ROOT = Path(__file__).resolve().parents[1]
AUK = ROOT.parent / 'AuK'
OUT = AUK / 'outputs/ch2-terminal-mystery-20260924'
FFMPEG = shutil.which('ffmpeg')
TEXT = '样本已接收。'
DESCRIPTION = ('A calm neutral low-pitched automated announcement. Flat even Mandarin delivery, '
               'clear consonants, a settled falling final syllable. Dry voice only, no music.')


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def run(argv, log=None):
    env = {**os.environ, 'PYTHONUTF8': '1', 'HF_HUB_DISABLE_IMPLICIT_TOKEN': '1'}
    env.pop('HF_TOKEN', None)
    if log:
        with log.open('w', encoding='utf-8') as stream:
            subprocess.run(argv, cwd=AUK, env=env, stdout=stream, stderr=subprocess.STDOUT, check=True)
    else:
        subprocess.run(argv, cwd=AUK, env=env, check=True)


def acoustic(path):
    samples, sr = sf.read(path)
    assert samples.ndim == 1 and np.isfinite(samples).all()
    return {'seconds': round(len(samples) / sr, 4), 'sample_rate': sr,
            'channels': 1, 'finite': True, 'peak': round(float(np.abs(samples).max()), 6),
            'rms': round(float(np.sqrt(np.mean(samples * samples))), 6)}


def main():
    assert FFMPEG, 'FFmpeg is required'
    OUT.mkdir(parents=True, exist_ok=True)
    raw = OUT / 'ch2_terminal_receipt_v1-take03-raw.wav'
    argv = [str(AUK / '.venv/Scripts/auk-infer.exe'), '--ckpt',
            str(AUK / 'ckpts/AuK-Flash/auk_flash.safetensors'), '--qwen_path',
            str(AUK / 'ckpts/Qwen2.5-Omni-3B'), '--dtype', 'bf16', '--device', 'cuda:0',
            '--cpu_offload', '--seed', '2026092453', '--gen_seconds', '1.6',
            '--instruction', f'请基于下面的描述: "{DESCRIPTION}",生成语音内容"{TEXT}".',
            '--output', str(raw)]
    assert '--audio' not in argv and '--ref_text' not in argv
    if not raw.exists():
        print('Generating independent terminal receipt with AuK-Flash; no reference.', flush=True)
        run(argv, OUT / 'receipt-generation-take03.log')

    print('Checking exact words with local Whisper; this is not human audition.', flush=True)
    model = WhisperModel(str(AUK / 'ckpts/faster-whisper-medium'), device='cpu',
                         compute_type='int8', cpu_threads=6)
    segments, _ = model.transcribe(str(raw), language='zh', beam_size=5,
                                  condition_on_previous_text=False, word_timestamps=True)
    segments = list(segments)
    transcript = ''.join(segment.text for segment in segments)
    print(f'Whisper raw transcript: {transcript}', flush=True)
    normalized = ''.join(char for char in transcript if '\u4e00' <= char <= '\u9fff')
    assert normalized == '样本已接收', f'Unexpected transcript; do not publish: {transcript}'
    raw_voice_qa = acoustic(raw)
    assert 1.6 <= raw_voice_qa['seconds'] <= 2.4

    common = [FFMPEG, '-y', '-hide_banner', '-loglevel', 'error']
    wav = OUT / 'ch2_terminal_receipt_v1.wav'
    process = common + ['-i', str(raw), '-af', 'highpass=f=85,lowpass=f=5500,loudnorm=I=-23:TP=-5:LRA=5',
                        '-ar', '24000', '-ac', '1', '-c:a', 'pcm_s16le', str(wav)]
    run(process)
    alarm_raw = OUT / 'ch2_terminal_alarm_v1-raw.wav'
    alarm_generate = common + ['-f', 'lavfi', '-i',
        'aevalsrc=0.14*(sin(2*PI*330*t)+0.35*sin(2*PI*495*t))*exp(-5*t):s=24000:d=0.7',
        '-af', 'lowpass=f=1200,afade=t=in:d=0.018,afade=t=out:st=0.46:d=0.24',
        '-ar', '24000', '-ac', '1', '-c:a', 'pcm_s16le', str(alarm_raw)]
    run(alarm_generate)
    records = []
    for name, source, purpose, gain in [
        ('ch2_terminal_receipt_v1', wav, 'Isolated machine receipt: 样本已接收。', 0.5),
        ('ch2_terminal_alarm_v1', alarm_raw, 'Single warm decaying alert; no repeated or looping beeps.', 0.45),
    ]:
        output = ROOT / f'app/public/audio/{name}.mp3'
        encode = common + ['-i', str(source), '-ar', '24000', '-ac', '1',
                           '-c:a', 'libmp3lame', '-b:a', '128k', str(output)]
        run(encode)
        qa = acoustic(output)
        assert qa['peak'] < 0.8 and qa['rms'] > 0.001
        if name.endswith('alarm_v1'):
            assert qa['seconds'] <= 1
        records.append({'id': name, 'output': output.relative_to(ROOT).as_posix(),
                        'sha256': sha(output), 'bytes': output.stat().st_size, 'purpose': purpose,
                        'wav_source': str(source), 'wav_sha256': sha(source), 'encode_argv': encode,
                        'recommended_playback_gain': gain, 'loop': False, 'acoustic': qa})

    record = {
        'baseline': '194c442', 'scope': 'Two new second-chapter-only aliases; all existing audio remains unchanged.',
        'generator': 'scripts/ch2-terminal-audio.py', 'generator_sha256': sha(__file__),
        'ffmpeg': subprocess.check_output([FFMPEG, '-version'], text=True).splitlines()[0],
        'voice': {'text': TEXT, 'description': DESCRIPTION, 'reference_audio_used': False,
                  'argv': argv, 'raw_wav': str(raw), 'raw_sha256': sha(raw), 'processing_argv': process,
                  'seed': 2026092453, 'gen_seconds': 1.6, 'speed_or_pitch_changed': False,
                  'transcript': transcript, 'raw_acoustic': raw_voice_qa,
                  'words': [{'text': word.word, 'start': word.start, 'end': word.end}
                            for segment in segments for word in segment.words]},
        'alarm': {'source': 'Original FFmpeg lavfi synthesis; no sampled third-party recording.',
                  'argv': alarm_generate, 'raw_wav': str(alarm_raw), 'raw_sha256': sha(alarm_raw),
                  'duration_seconds': 0.7},
        'records': records, 'human_listened': False, 'user_approved': False,
        'review_limitations': ('The agent cannot directly audition audio in this session. Local Whisper transcription '
                               'and decoded PCM checks confirm words, duration and integrity, not subjective tone '
                               'or real-world loudness; user audition is still required.'),
    }
    (ROOT / 'docs/ch2-terminal-audio.json').write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'generated': records, 'human_listened': False}, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    main()
