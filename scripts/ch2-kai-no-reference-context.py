"""No-reference retry: simple Chinese direction, short and contextual takes."""
import importlib.util
import os
from pathlib import Path

spec = importlib.util.spec_from_file_location('helpers', Path(__file__).with_name('ch2-kai-no-reference-clean.py'))
h = importlib.util.module_from_spec(spec)
spec.loader.exec_module(h)
ROOT, AUK = h.ROOT, h.AUK
OUT = AUK / 'outputs/ch2-kai-no-reference-v9-20260921'


def main():
    for folder in ['raw', 'logs']:
        (OUT / folder).mkdir(parents=True, exist_ok=True)
    env = {**os.environ, 'PYTHONUTF8': '1', 'HF_HUB_DISABLE_IMPLICIT_TOKEN': '1'}
    env.pop('HF_TOKEN', None)
    description = '青年男性，普通话。像和身边的同事说悄悄话，放松而轻声，句尾轻轻收住。干净人声，无音乐。'
    takes = [
        ('short', 2026092221, 2.3, '跟你说个事儿。'),
        ('context', 2026092222, 7.0, '跟你说个事儿。等忙完这一阵，咱们找个地方坐一会儿。我想问问你那边的情况。'),
    ]
    rows = []
    for name, seed, seconds, text in takes:
        instruction = f'请基于下面的描述: "{description}",生成语音内容"{text}".'
        raw = OUT / f'raw/{name}.wav'
        argv = [str(AUK / '.venv/Scripts/auk-infer.exe'), '--ckpt', str(AUK / 'ckpts/AuK-Flash/auk_flash.safetensors'),
                '--qwen_path', str(AUK / 'ckpts/Qwen2.5-Omni-3B'), '--dtype', 'bf16', '--device', 'cuda:0', '--cpu_offload',
                '--seed', str(seed), '--gen_seconds', str(seconds), '--instruction', instruction, '--output', str(raw)]
        assert '--audio' not in argv and '--ref_text' not in argv and not raw.exists()
        print(f'GENERATE {name}, no audio input', flush=True)
        with (OUT / f'logs/{name}.log').open('w', encoding='utf-8') as log:
            h.subprocess.run(argv, cwd=AUK, env=env, stdout=log, stderr=h.subprocess.STDOUT, check=True)
        rows.append({'id': name, 'text': text, 'task': 'text-only Instruct TTS', 'reference_audio': None,
                     'seed': seed, 'gen_seconds': seconds, 'instruction': instruction, 'argv': argv,
                     'raw': str(raw), 'raw_sha256': h.sha(raw)})
        h.write(OUT / 'generation.json', rows)
    model = h.WhisperModel(str(AUK / 'ckpts/faster-whisper-medium'), device='cpu', compute_type='int8', cpu_threads=6)
    for row in rows:
        segments, _ = model.transcribe(row['raw'], language='zh', beam_size=5, condition_on_previous_text=False,
                                      vad_filter=False, word_timestamps=True)
        segments = list(segments)
        row['transcript'] = ''.join(s.text for s in segments)
        row['words'] = [{'text': w.word, 'start': w.start, 'end': w.end} for s in segments for w in s.words]
        print(h.json.dumps(row, ensure_ascii=False), flush=True)
    record = {'reference_audio_used': False, 'candidates': rows, 'script': 'scripts/ch2-kai-no-reference-context.py',
              'script_sha256': h.sha(__file__), 'status': 'Unexported candidates; game untouched', 'user_approved': False}
    h.write(OUT / 'record.json', record)
    h.write(ROOT / 'docs/ch2-kai-no-reference-v9.json', record)


if __name__ == '__main__':
    main()
