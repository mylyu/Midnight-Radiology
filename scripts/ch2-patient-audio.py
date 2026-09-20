"""Generate short patient entrances with the installed AuK CLI; never touch old voices."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time

ROOT = Path(__file__).resolve().parents[1]
LINES = [
    ('fall', '嗯……呃……', 1.5, '八十岁男性患者，虚弱低沉、带气息的短促非语言呻吟。意识模糊，没有完整说话，无尖叫。'),
    ('stroke', '呃……唔……', 2.0, '七十二岁男性患者，低哑含混、发音费力，只发短促无词呻吟，不要流利说话或尖叫。'),
    ('aorta', '呃……背也疼……', 2.7, '五十八岁男性，偏低沙哑，忍着胸背部疼痛，声音断续，呼气短促，不大喊。'),
    ('trauma', '呃……嗯……', 1.5, '三十五岁男性，疲惫低弱的疼痛呻吟，不说完整语句，不要尖叫。'),
    ('chest', '胸口……闷得慌。', 2.7, '五十二岁男性，略厚的中低音，胸口难受，说话短促吃力，清楚但不大喊。'),
    ('postop', '慢一点，伤口有点疼。', 2.8, '四十八岁女性，普通中年女声，疲惫轻声，带一点疼痛的气息，自然口语。'),
    ('wrist', '嘶……这只手真不敢动。', 2.8, '二十岁男大学生，清亮年轻男声，先短短倒吸气，疼得皱眉，有点不好意思，自然口语。'),
    ('waiting', '哎，到我没有啊？', 2.5, '六十八岁男性，圆润偏鼻音，等久了不耐烦，但不是怒吼，普通话口语。'),
    ('lung', '上回的片子，我都带来了。', 3.0, '七十岁男性，明亮略带鼻音，平静自然询问，普通话。'),
    ('denture', '哎，这头疼好几天了。', 2.8, '七十五岁男性，粗哑老年声，轻声嘟囔，嘴硬但没有凶恶感。'),
    ('gut', '哎哟……肚子疼死了。', 2.3, '二十七岁男性，稍低的年轻男声，腹痛说话吃力，气短断续，没有尖叫或嚎叫。'),
]

def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--auk-root', type=Path, default=ROOT.parent / 'AuK')
    parser.add_argument('--only', default='')
    parser.add_argument('--revision', type=int, default=0)
    args = parser.parse_args()
    auk = args.auk_root.resolve()
    out = auk / 'outputs/ch2-patient-entrances-20260920'
    out.mkdir(parents=True, exist_ok=True)
    cli = auk / '.venv/Scripts/auk-infer.exe'
    env = {**os.environ, 'PYTHONUTF8': '1', 'HF_HUB_DISABLE_IMPLICIT_TOKEN': '1'}
    env.pop('HF_TOKEN', None)
    records = []
    for index, (role, words, seconds, voice) in enumerate(LINES):
        if args.only and role not in args.only.split(','):
            continue
        name = f'vox_ch2_{role}'
        raw = out / (f'{name}.r{args.revision}.wav' if args.revision else f'{name}.wav')
        final = ROOT / f'app/public/audio/{name}.mp3'
        ref_role = {'lung': 'uncle', 'denture': 'grandpa'}.get(role)
        ref = auk / f'outputs/midnight-radiology-redub-20260916/references/selected/{ref_role}.wav' if ref_role else None
        # Reuse the new patient's own timbre for repairs, not an existing character.
        if (args.revision >= 2 and role in ('fall', 'trauma')) or (args.revision == 2 and role == 'gut'):
            ref = out / f'{name}.wav'
        instruction = (f'Say the following with the same voice: "{words}"' if ref else
                       f'请基于下面的描述: "{voice} 干净人声，没有音乐、环境音、提示音，只读指定的台词。",生成语音内容"{words}"。')
        argv = [str(cli), '--ckpt', str(auk / 'ckpts/AuK-Flash/auk_flash.safetensors'),
                '--qwen_path', str(auk / 'ckpts/Qwen2.5-Omni-3B'), '--dtype', 'bf16',
                '--device', 'cuda:0', '--cpu_offload', '--seed', str(202620 + index + args.revision * 1000),
                '--gen_seconds', str(seconds), '--instruction', instruction, '--output', str(raw)]
        if ref:
            argv += ['--audio', str(ref), '--gen_text', words]
        if not raw.exists():
            print('GENERATE', name, flush=True)
            started = time.monotonic()
            with raw.with_suffix('.log').open('w', encoding='utf-8') as log:
                subprocess.run(argv, cwd=auk, env=env, stdout=log, stderr=subprocess.STDOUT, check=True)
            print('DONE', name, round(time.monotonic() - started, 1), flush=True)
        # Keep a little breath and tail; no pitch or speed shifting, conservative peak ceiling.
        af = 'silenceremove=start_periods=1:start_duration=0.04:start_threshold=-50dB:start_silence=0.06,loudnorm=I=-20:TP=-2:LRA=7'
        subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', str(raw),
                        '-af', af, '-ar', '24000', '-ac', '1', '-b:a', '128k', str(final)], check=True)
        record = dict(id=name, role=role, spoken_text=words, voice=voice, seed=202620+index+args.revision*1000,
                      gen_seconds=seconds, instruction=instruction, argv=argv,
                      raw=str(raw), raw_sha256=sha(raw), reference=str(ref) if ref else None,
                      reference_sha256=sha(ref) if ref else None,
                      output=f'app/public/audio/{name}.mp3', sha256=sha(final), processing=af)
        (out / f'{name}.json').write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding='utf-8')
        records.append(record)
        print('EXPORTED', name, flush=True)
    # Assemble all completed records, including earlier resumable runs.
    records = [json.loads(p.read_text(encoding='utf-8')) for p in sorted(out.glob('vox_ch2_*.json'))]
    (ROOT / 'docs/ch2-patient-audio.json').write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding='utf-8')

if __name__ == '__main__':
    main()
