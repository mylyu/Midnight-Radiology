"""One immutable, reference-free LDCT father entrance; originals stay outside repo.

Use the sibling AuK .venv Python. Audio-model review is fallible, not human approval.
Never modifies existing game audio, catalog, or the runtime.
"""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys

sys.stdout.reconfigure(encoding='utf-8')
ROOT = Path(__file__).resolve().parents[1]
AUK = ROOT.parent / 'AuK'
OUT = AUK / 'outputs/ldct-entrances-20260928'
DELIVERY = ROOT.parent / 'ldct-media-polish-assets'
TEXT = '说好吃饭的。'
SEED = 2026092807
DESCRIPTION = (
    '六十岁左右的普通中国父亲，男声中低、结实厚实，年岁带来一点自然沙感，精神正常。'
    '在小饭馆坐下，熟人忽然又聊起检查，他对儿子随口嘟囔一句。'
    '像日常聊天，轻微埋怨但不生气，不用力强调吃饭两个字，句尾自然下降收住。'
    '普通话，顺畅短句，不拖长，不故作苍老颤抖，不喊，不播音，不演讲，不笑出声。'
    '干净单人声音，无音乐和环境声。'
)
ASSET = 'vox_ldct_father_entrance_20260928'


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def generate():
    OUT.mkdir(parents=True, exist_ok=True)
    DELIVERY.mkdir(parents=True, exist_ok=True)
    raw = OUT / 'father-a-raw.wav'
    assert not raw.exists(), 'Preserve previous takes; do not overwrite'
    instruction = f'请基于下面的描述: "{DESCRIPTION}",生成语音内容"{TEXT}".'
    argv = [str(AUK / '.venv/Scripts/auk-infer.exe'), '--ckpt',
            str(AUK / 'ckpts/AuK-Flash/auk_flash.safetensors'), '--qwen_path',
            str(AUK / 'ckpts/Qwen2.5-Omni-3B'), '--dtype', 'bf16', '--device',
            'cuda:0', '--cpu_offload', '--seed', str(SEED), '--gen_seconds', '2.0',
            '--instruction', instruction, '--output', str(raw)]
    assert '--audio' not in argv and '--ref_text' not in argv
    env = {**os.environ, 'PYTHONUTF8': '1', 'HF_HUB_DISABLE_IMPLICIT_TOKEN': '1'}
    env.pop('HF_TOKEN', None)
    print('Generating one father take', flush=True)
    with (OUT / 'generation.log').open('w', encoding='utf-8') as log:
        subprocess.run(argv, cwd=AUK, env=env, stdout=log, stderr=subprocess.STDOUT, check=True)
    wav = OUT / 'father-a-master.wav'
    mp3 = DELIVERY / f'{ASSET}.mp3'
    assert not wav.exists() and not mp3.exists()
    processing = 'loudnorm=I=-20:TP=-2:LRA=7'
    exports = [
        ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', str(raw), '-af', processing,
         '-ar', '24000', '-ac', '1', str(wav)],
        ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', str(wav), '-ar', '22050',
         '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '48k', str(mp3)],
    ]
    for command in exports:
        subprocess.run(command, check=True)
    row = dict(id=ASSET, key='father', text=TEXT, character='陆舟父亲，约60岁',
               description=DESCRIPTION, seed=SEED, gen_seconds=2.0, instruction=instruction,
               argv=argv, reference_audio=None, raw=str(raw), raw_sha256=sha(raw),
               master=str(wav), master_sha256=sha(wav), output=str(mp3), sha256=sha(mp3),
               bytes=mp3.stat().st_size, processing=processing, export_commands=exports,
               pitch_shift=False, time_stretch=False, human_listened=False, user_approved=False)
    write(OUT / 'generation.json', row)
    print('Generated', mp3, row['bytes'], flush=True)


def qa():
    import numpy as np
    import soundfile as sf
    from faster_whisper import WhisperModel
    row = json.loads((OUT / 'generation.json').read_text(encoding='utf-8'))
    path = Path(row['output'])
    assert sha(path) == row['sha256']
    subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-f', 'null', '-'], check=True)
    signal, sr = sf.read(path)
    model = WhisperModel(str(AUK / 'ckpts/faster-whisper-medium'), device='cpu',
                         compute_type='int8', cpu_threads=6)
    segments, _ = model.transcribe(str(path), language='zh', beam_size=5,
                                  condition_on_previous_text=False, vad_filter=False, word_timestamps=True)
    segments = list(segments)
    loudness = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(path), '-af',
                              'loudnorm=I=-20:TP=-2:LRA=7:print_format=json', '-f', 'null', '-'],
                             capture_output=True, text=True, check=True).stderr
    measured = json.loads(loudness[loudness.rfind('{'):loudness.rfind('}') + 1])
    result = dict(seconds=round(len(signal) / sr, 3), sample_rate=sr, mono=signal.ndim == 1,
                  peak=round(float(abs(signal).max()), 6), rms=round(float(np.sqrt(np.mean(signal**2))), 6),
                  finite=bool(np.isfinite(signal).all()), clipped_samples=int((abs(signal) >= .999).sum()),
                  transcript=''.join(segment.text for segment in segments),
                  words=[dict(text=word.word, start=word.start, end=word.end)
                         for segment in segments for word in segment.words],
                  lufs=measured['input_i'], true_peak_dbtp=measured['input_tp'],
                  method='faster-whisper-medium plus FFmpeg and waveform checks; not performance approval')
    assert result['mono'] and result['finite'] and result['peak'] < .98 and result['rms'] > .003
    assert .5 < result['seconds'] < 3 and sr == 22050
    row['qa'] = result
    write(OUT / 'generation.json', row)
    print(json.dumps(result, ensure_ascii=False), flush=True)


def listen_model():
    row = json.loads((OUT / 'generation.json').read_text(encoding='utf-8'))
    spec = importlib.util.spec_from_file_location('ldct_audio_perception', ROOT / 'scripts/ch2-natural-voices-qa.py')
    helper = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(helper)
    helper.MODEL_QUESTION = (
        '仅根据实际听到的声音：先逐字转写。再描述像男声还是女声，年轻还是年长（不能确定就说不确定）。'
        '像随口聊天还是刻意表演？句末是明显上扬、下降还是平收？有没有过分强调一个词、重复、吞字、'
        '截断、音乐或其他人声？不要根据台词推断职业、年龄或场景。简短回答。')
    helper.GENERATION_REPORT = OUT / 'perception-input.json'
    helper.MODEL_REPORT = OUT / 'automated-listening.json'
    write(helper.GENERATION_REPORT, [row])
    helper.model_review('')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--generate', action='store_true')
    parser.add_argument('--qa', action='store_true')
    parser.add_argument('--listen-model', action='store_true')
    args = parser.parse_args()
    if args.generate:
        generate()
    if args.qa:
        qa()
    if args.listen_model:
        listen_model()
