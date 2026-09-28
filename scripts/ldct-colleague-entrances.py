"""Four LDCT-only entrances: reuse approved identity references, one model load.

This is the same AukInfer/generate API and zero-shot template called by auk-infer.
The equivalent CLI for each take is recorded, existing game audio stays untouched.
Run only after the father generator has finished to avoid GPU model contention.
"""
import argparse
import gc
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

sys.stdout.reconfigure(encoding='utf-8')
ROOT = Path(__file__).resolve().parents[1]
AUK = ROOT.parent / 'AuK'
OUT = AUK / 'outputs/ldct-entrances-20260928'
DELIVERY = ROOT.parent / 'ldct-media-polish-assets'
SELECTED = AUK / 'outputs/midnight-radiology-redub-20260916/references/selected'
PLAN = [
    ('father_b', '陆舟父亲，约60岁', '说好吃饭的。', None, 1.5, 2026092815),
    ('zhou', '老周', '都坐，别着急。', SELECTED / 'zhou.wav', 2.0, 2026092811),
    ('he', '小何', '这谁的饭呀？', SELECTED / 'he.wav', 1.8, 2026092812),
    ('luzhou_m', '陆舟（男）', '你先坐。', ROOT / 'app/public/audio/vox_luzhou_m.mp3', 1.6, 2026092813),
    ('luzhou_f', '陆舟（女）', '你先坐。', ROOT / 'app/public/audio/vox_luzhou_f.mp3', 1.6, 2026092814),
]
os.environ['PYTHONUTF8'] = '1'
os.environ['HF_HUB_DISABLE_IMPLICIT_TOKEN'] = '1'
os.environ.pop('HF_TOKEN', None)


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def generate():
    from auk.infer.infer_auk import AukInfer, save_audio
    for path in [OUT / 'references', DELIVERY]:
        path.mkdir(parents=True, exist_ok=True)
    record_path = OUT / 'colleague-generation.json'
    rows = json.loads(record_path.read_text(encoding='utf-8')) if record_path.exists() else []
    engine = AukInfer(config_path=str(AUK / 'ckpts/AuK-Flash/config.yaml'),
                      ckpt_path=str(AUK / 'ckpts/AuK-Flash/auk_flash.safetensors'),
                      qwen_path=str(AUK / 'ckpts/Qwen2.5-Omni-3B'),
                      device='cuda:0', dtype='bf16', cpu_offload=True)
    for key, character, text, source, seconds, seed in PLAN:
        if any(row['key'] == key for row in rows):
            continue
        reference = OUT / 'references' / source.name if source else None
        if reference:
            if not reference.exists():
                shutil.copy2(source, reference)
            assert sha(source) == sha(reference)
        asset = f'vox_ldct_{key}_entrance_20260928'
        raw = OUT / f'{key}-a-raw.wav'
        master = OUT / f'{key}-a-master.wav'
        output = DELIVERY / f'{asset}.mp3'
        assert not raw.exists() and not master.exists() and not output.exists()
        instruction = (f'Say the following with the same voice: "{text}"' if reference else
                       'Say the following in the voice described here: "A Chinese father around sixty, '
                       'with a low, naturally weathered male voice. Everyday conversational Mandarin, '
                       'mildly grumbling to his son, not angry. A single short utterance, falling ending, '
                       'no theatrical tremor, music, laughter or other people.", '
                       f'and say: "{text}"')
        argv = [str(AUK / '.venv/Scripts/auk-infer.exe'), '--ckpt',
                str(AUK / 'ckpts/AuK-Flash/auk_flash.safetensors'), '--qwen_path',
                str(AUK / 'ckpts/Qwen2.5-Omni-3B'), '--dtype', 'bf16', '--device',
                'cuda:0', '--cpu_offload', '--seed', str(seed), '--gen_seconds', str(seconds),
                '--instruction', instruction, '--gen_text', text]
        if reference:
            argv += ['--audio', str(reference)]
        argv += ['--output', str(raw)]
        content = [{'type': 'text', 'text': instruction}]
        if reference:
            content.append({'type': 'audio', 'audio': str(reference)})
        messages = [{'role': 'user', 'content': content}]
        print('GENERATE', key, flush=True)
        audio, sr = engine.generate(messages, audio=str(reference) if reference else None, gen_seconds=seconds,
                                    nfe=32, cfg_strength=2.0, sway_sampling_coef=-1.0,
                                    t_grid=None, seed=seed)
        save_audio(audio, sr, str(raw))
        processing = 'loudnorm=I=-20:TP=-2:LRA=7'
        exports = [
            ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', str(raw), '-af', processing,
             '-ar', '24000', '-ac', '1', str(master)],
            ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', str(master), '-ar', '22050',
             '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '48k', str(output)],
        ]
        for command in exports:
            subprocess.run(command, check=True)
        rows.append(dict(id=asset, key=key, character=character, text=text, seed=seed,
                         gen_seconds=seconds, instruction=instruction, argv_equivalent=argv,
                         execution='official AukInfer same settings as auk-infer; one shared engine',
                         reference=str(reference) if reference else None,
                         source_reference=str(source) if source else None,
                         reference_sha256=sha(reference) if reference else None,
                         raw=str(raw), raw_sha256=sha(raw), master=str(master), master_sha256=sha(master),
                         output=str(output), sha256=sha(output), bytes=output.stat().st_size,
                         processing=processing, export_commands=exports, human_listened=False,
                         user_approved=False, pitch_shift=False, time_stretch=False))
        write(record_path, rows)
        print('DONE', key, output.stat().st_size, flush=True)
    del engine
    gc.collect()


def qa():
    import numpy as np
    import soundfile as sf
    from faster_whisper import WhisperModel
    rows = json.loads((OUT / 'colleague-generation.json').read_text(encoding='utf-8'))
    model = WhisperModel(str(AUK / 'ckpts/faster-whisper-medium'), device='cpu',
                         compute_type='int8', cpu_threads=6)
    for row in rows:
        path = Path(row['output'])
        assert sha(path) == row['sha256']
        subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-f', 'null', '-'], check=True)
        signal, sr = sf.read(path)
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
        print(json.dumps({'key': row['key'], **result}, ensure_ascii=False), flush=True)
    write(OUT / 'colleague-generation.json', rows)


def listen_model():
    rows = json.loads((OUT / 'colleague-generation.json').read_text(encoding='utf-8'))
    spec = importlib.util.spec_from_file_location('ldct_audio_perception', ROOT / 'scripts/ch2-natural-voices-qa.py')
    helper = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(helper)
    helper.MODEL_QUESTION = (
        '仅根据实际听到的声音：先逐字转写。再描述像男声还是女声，年轻还是年长（不能确定就说不确定）。'
        '像随口聊天还是刻意表演？句末是明显上扬、下降还是平收？有没有过分强调一个词、重复、吞字、'
        '截断、音乐或其他人声？不要根据台词推断职业、年龄或场景。简短回答。')
    helper.GENERATION_REPORT = OUT / 'colleague-perception-input.json'
    helper.MODEL_REPORT = OUT / 'colleague-automated-listening.json'
    write(helper.GENERATION_REPORT, rows)
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
