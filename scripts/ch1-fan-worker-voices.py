"""Generate two Chapter 1 voices with text-only AuK, never reference audio."""
import os
import json
import hashlib
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUK = ROOT.parent / 'AuK'
OUT = AUK / 'outputs/ch1-fan-worker-20260923'

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    env = {**os.environ, 'PYTHONUTF8': '1', 'HF_HUB_DISABLE_IMPLICIT_TOKEN': '1'}
    env.pop('HF_TOKEN', None)
    rows = []
    for name, text, description, seconds, seed in [
        ('fan_v2', '设备科老范，送耗材来了。', '六十岁的老年男性，低沉宽厚、微微沙哑的嗓音，沉稳老成。心平气和、慢条斯理地打招呼，温和而随意，音量平稳。自然中文口语，干净人声，无音乐。', 3.0, 2026092311),
        ('worker_v2', '哎呦医生，轻点，胳膊不敢动了。', 'A mature fifty-year-old man with a very deep bass voice, thick resonant chest tone and gravelly rough texture. A burly laborer grumbling bluntly through pain. Low pitched groan, gruff impatient conversational Mandarin, full heavy vocal weight. Dry clean speech recording.', 4.5, 2026092312),
        ('thin', '呃……医生……胸口，像针扎……喘……喘不上气。', '年轻男性患者，胸痛难受，呼吸急促，说话上气不接下气。气息短，声音虚弱，断断续续说几个字就停下来吸气，喘息清楚但不夸张，不大喊。自然痛苦的口语，干净人声，无音乐。', 6.0, 2026092303),
    ]:
        raw = OUT / f'{name}-raw.wav'
        instruction = f'请基于下面的描述: "{description}",生成语音内容"{text}".'
        argv = [str(AUK / '.venv/Scripts/auk-infer.exe'), '--ckpt', str(AUK / 'ckpts/AuK-Flash/auk_flash.safetensors'), '--qwen_path', str(AUK / 'ckpts/Qwen2.5-Omni-3B'), '--dtype', 'bf16', '--device', 'cuda:0', '--cpu_offload', '--seed', str(seed), '--gen_seconds', str(seconds), '--instruction', instruction, '--output', str(raw)]
        assert '--audio' not in argv and '--ref_text' not in argv
        if not raw.exists():
            print(f'Generating {name}', flush=True)
            with (OUT / f'{name}.log').open('w', encoding='utf-8') as log:
                subprocess.run(argv, cwd=AUK, env=env, stdout=log, stderr=subprocess.STDOUT, check=True)
        rows.append(dict(id=name, text=text, description=description, argv=argv, raw=str(raw), raw_sha256=hashlib.sha256(raw.read_bytes()).hexdigest(), reference_audio_used=False))
    from faster_whisper import WhisperModel
    model = WhisperModel(str(AUK / 'ckpts/faster-whisper-medium'), device='cpu', compute_type='int8', cpu_threads=6)
    for row in rows:
        segments, _ = model.transcribe(row['raw'], language='zh', beam_size=5, condition_on_previous_text=False, word_timestamps=True)
        segments = list(segments)
        row['transcript'] = ''.join(s.text for s in segments)
        row['words'] = [dict(text=w.word, start=w.start, end=w.end) for s in segments for w in s.words]
        print(json.dumps(row, ensure_ascii=False), flush=True)
    (OUT / 'generation.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding='utf-8')

if __name__ == '__main__':
    main()
