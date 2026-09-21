"""Local AuK-Flash short-line pass. Unique Ch2 assets; shared old voices untouched.
Raw candidates/references stay outside the game; --export selects explicit attempts.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time

sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path(__file__).resolve().parents[1]
AUK = ROOT.parent / 'AuK'
OUT = AUK / 'outputs/ch2-natural-voices-20260920'
PLAN = ROOT / 'docs/ch2-natural-voices-lines.json'
RECORD = ROOT / 'docs/ch2-natural-voices-generation.json'
ENV = {**os.environ, 'PYTHONUTF8': '1', 'HF_HUB_DISABLE_IMPLICIT_TOKEN': '1'}
ENV.pop('HF_TOKEN', None)

def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--only', default='')
    p.add_argument('--attempt', type=int, default=2)
    p.add_argument('--seconds', type=float)
    p.add_argument('--export', action='store_true')
    args=p.parse_args()
    for folder in ['raw','logs','references','wav','mp3','qa']:
        (OUT/folder).mkdir(parents=True,exist_ok=True)
    rows=json.loads(PLAN.read_text(encoding='utf-8'))['lines']
    for index,row in enumerate(rows):
        if args.only and row['key'] not in args.only.split(','): continue
        assert 0 < len([c for c in row['text'] if '\u4e00'<=c<='\u9fff'])<=row.get('max_han',8)
        kind, ref_id=row['reference'].split(':')
        source=(AUK/f'outputs/midnight-radiology-redub-20260916/references/selected/{ref_id}.wav'
                if kind=='selected' else ROOT/f'app/public/audio/{ref_id}.mp3')
        reference=OUT/'references'/source.name
        if not reference.exists(): shutil.copy2(source,reference)
        assert sha(source)==sha(reference), 'Reference changed; do not silently replace timbre'
        name=row['id']
        raw=OUT/f'raw/{name}.a{args.attempt}.wav'
        meta=raw.with_suffix('.json')
        seconds=args.seconds or row['seconds']
        seed=row.get('seed_base',202609200+index*10)+args.attempt
        spoken=row.get('spoken_text',row['text'])
        instruction=f'Say the following with the same voice: "{spoken}"'
        # The documented zero-shot template must remain exact. Appended acting
        # notes leaked into speech in attempt 1; direction is an audition rubric.
        argv=[str(AUK/'.venv/Scripts/auk-infer.exe'),
              '--ckpt',str(AUK/'ckpts/AuK-Flash/auk_flash.safetensors'),
              '--qwen_path',str(AUK/'ckpts/Qwen2.5-Omni-3B'),
              '--dtype','bf16','--device','cuda:0','--cpu_offload',
              '--seed',str(seed),'--gen_seconds',str(seconds),
              '--instruction',instruction,'--gen_text',spoken,
              '--audio',str(reference),'--output',str(raw)]
        if not (raw.exists() and meta.exists()):
            print('GENERATE',name,'attempt',args.attempt,flush=True)
            start=time.monotonic()
            log=OUT/f'logs/{raw.stem}.log'
            with log.open('w',encoding='utf-8') as stream:
                subprocess.run(argv,cwd=AUK,env=ENV,stdout=stream,stderr=subprocess.STDOUT,check=True)
            record={**row,'attempt':args.attempt,'seconds':seconds,'seed':seed,'instruction':instruction,
                    'argv':argv,'reference_path':str(reference),'reference_sha256':sha(reference),
                    'source_reference':str(source),'raw':str(raw),'raw_sha256':sha(raw),
                    'elapsed_seconds':round(time.monotonic()-start,2)}
            write(meta,record)
            print('DONE',name,record['elapsed_seconds'],flush=True)
        if args.export:
            record=json.loads(meta.read_text(encoding='utf-8'))
            assert record['text']==row['text'] and record['seed']==seed
            assert record['instruction']==instruction, 'Obsolete candidate instruction; choose a fresh attempt'
            af='silenceremove=start_periods=1:start_duration=0.03:start_threshold=-50dB:start_silence=0.06,loudnorm=I=-20:TP=-2:LRA=7'
            wav=OUT/f'wav/{name}.wav'
            mp3=OUT/f'mp3/{name}.mp3'
            subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-i',str(raw),'-af',af,'-ar','24000','-ac','1',str(wav)],check=True)
            subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-i',str(wav),'-b:a','128k',str(mp3)],check=True)
            target=ROOT/f'app/public/audio/{name}.mp3'
            shutil.copy2(mp3,target)
            record.update(processing=af,wav=str(wav),output=f'app/public/audio/{name}.mp3',sha256=sha(target))
            write(OUT/f'{name}.json',record)
            print('EXPORTED',name,flush=True)
    if args.export:
        write(RECORD,
              [json.loads(f.read_text(encoding='utf-8')) for f in sorted(OUT.glob('vox_ch2_natural_*.json'))])

if __name__=='__main__':
    main()
