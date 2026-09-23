"""Export full takes, preserving pauses and breaths; no pitch/time processing."""
import hashlib
import json
import subprocess
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT.parent / 'AuK/outputs/ch1-fan-worker-20260923'
names = {'fan_v2': 'vox_ch1_fan_mature_20260923', 'worker_v2': 'vox_ch1_worker_bass_20260923', 'thin': 'vox_ch1_thin_breathless_20260923'}
rows = json.loads((OUT / 'generation.json').read_text(encoding='utf-8'))
for row in rows:
    stem = names[row['id']]
    wav = OUT / f'{stem}.wav'
    target = ROOT / f'app/public/audio/{stem}.mp3'
    cmd = ['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', row['raw'], '-af', 'loudnorm=I=-20:TP=-2:LRA=7', '-ar', '24000', '-ac', '1', str(wav)]
    subprocess.run(cmd, check=True)
    subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', str(wav), '-b:a', '128k', str(target)], check=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-i', str(target), '-f', 'null', '-'], check=True)
    row.update(output=str(target.relative_to(ROOT)).replace('\\', '/'), sha256=hashlib.sha256(target.read_bytes()).hexdigest(), processing=cmd, wav=str(wav))
record = dict(baseline='2d629e8', reference_audio_used=False, user_approved=False, status='Local replacement; awaiting user audition, not deployed', takes=rows, automated_audio_review=json.loads((OUT / 'review.json').read_text(encoding='utf-8')))
(ROOT / 'docs/ch1-voices-20260923.json').write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding='utf-8')
print('Exported three voices; originals unchanged.')
