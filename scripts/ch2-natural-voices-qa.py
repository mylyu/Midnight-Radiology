"""Objective/audio-model review; neither is user approval or human listening."""
import argparse
import json
import os
from pathlib import Path
import sys
import time

sys.stdout.reconfigure(encoding='utf-8')

os.environ['HF_HUB_DISABLE_IMPLICIT_TOKEN']='1'
os.environ.pop('HF_TOKEN',None)
ROOT=Path(__file__).resolve().parents[1]
AUK=ROOT.parent/'AuK'
OUT=AUK/'outputs/ch2-natural-voices-20260920'
QA_REPORT=ROOT/'docs/ch2-natural-voices-qa.json'
EXPECTED_COUNT=14
GENERATION_REPORT=ROOT/'docs/ch2-natural-voices-generation.json'
MODEL_REPORT=ROOT/'docs/ch2-natural-voices-listening-model.json'
MODEL_QUESTION='仅根据实际听到的声音：先转写台词，然后简述音色、说话节奏。像日常对话还是戏剧化朗诵或喊口号？有无重复、吞字、截断、异常笑声、音乐？不要凭句子内容推断身份或人设；听不清就说不确定。简短回答。'

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--watch',action='store_true')
    p.add_argument('--listen-model',action='store_true')
    p.add_argument('--only',default='')
    args=p.parse_args()
    if args.listen_model:
        return model_review(args.only)
    import numpy as np
    import soundfile as sf
    from faster_whisper import WhisperModel
    model=WhisperModel(str(AUK/'ckpts/faster-whisper-medium'),device='cpu',compute_type='int8',cpu_threads=6)
    seen={}
    report=QA_REPORT
    if report.exists():
        seen={r['id']:r for r in json.loads(report.read_text(encoding='utf-8'))}
    while True:
        for f in sorted(OUT.glob('vox_ch2_natural_*.json')):
            row=json.loads(f.read_text(encoding='utf-8'))
            if args.only and row['key'] not in args.only.split(','):continue
            if seen.get(row['id'],{}).get('sha256')==row['sha256']:continue
            file=ROOT/row['output']
            x,sr=sf.read(file)
            segments,_=model.transcribe(str(file),language='zh',beam_size=5,
                    condition_on_previous_text=False,vad_filter=False)
            transcript=''.join(s.text for s in segments)
            n=max(1,int(sr*.02))
            energy=np.array([np.sqrt(np.mean(x[t:t+n]**2)) for t in range(0,len(x),n)])
            active=np.flatnonzero(energy>max(.002,energy.max()*.025))
            result={'id':row['id'],'sha256':row['sha256'],'expected':row['text'],'asr':transcript,
                    'seconds':round(len(x)/sr,3),'sample_rate':sr,'mono':x.ndim==1,
                    'peak':round(float(abs(x).max()),5),'rms':round(float(np.sqrt(np.mean(x*x))),5),
                    'finite':bool(np.isfinite(x).all()),'first_active':round(float(active[0]*.02),3) if len(active) else None,
                    'last_active':round(float((active[-1]+1)*.02),3) if len(active) else None,
                    'human_listened':False}
            assert result['mono'] and result['finite'] and result['rms']>.003
            assert .5<result['seconds']<4 and result['peak']<.98
            seen[row['id']]=result
            report.write_text(json.dumps(list(seen.values()),ensure_ascii=False,indent=2),encoding='utf-8')
            print(json.dumps(result,ensure_ascii=False),flush=True)
        if not args.watch or len(seen)==EXPECTED_COUNT:break
        time.sleep(3)

def model_review(only):
    import torch
    from transformers import Qwen2_5OmniThinkerForConditionalGeneration, Qwen2_5OmniProcessor
    from qwen_omni_utils import process_mm_info
    model=Qwen2_5OmniThinkerForConditionalGeneration.from_pretrained(str(AUK/'ckpts/Qwen2.5-Omni-3B'),torch_dtype=torch.bfloat16)
    del model.visual
    model.visual=None
    model=model.to('cuda:0').eval()
    processor=Qwen2_5OmniProcessor.from_pretrained(str(AUK/'ckpts/Qwen2.5-Omni-3B'))
    report=MODEL_REPORT
    rows=json.loads(report.read_text(encoding='utf-8')) if report.exists() else []
    for row in json.loads(GENERATION_REPORT.read_text(encoding='utf-8')):
        if only and row['key'] not in only.split(','):continue
        if any(r['sha256']==row['sha256'] for r in rows):continue
        question=MODEL_QUESTION
        conversation=[{'role':'system','content':[{'type':'text','text':'You are Qwen, a virtual human developed by the Qwen Team, Alibaba Group, capable of perceiving auditory and visual inputs, as well as generating text and speech.'}]},
                      {'role':'user','content':[{'type':'audio','audio':str(ROOT/row['output'])},{'type':'text','text':question}]}]
        text=processor.apply_chat_template(conversation,add_generation_prompt=True,tokenize=False)
        audios,images,videos=process_mm_info(conversation,use_audio_in_video=True)
        inputs=processor(text=text,audio=audios,images=images,videos=videos,return_tensors='pt',padding=True,use_audio_in_video=True).to(model.device).to(model.dtype)
        with torch.inference_mode():
            ids=model.generate(**inputs,max_new_tokens=160,do_sample=False,eos_token_id=151645,pad_token_id=151643)
        answer=processor.batch_decode(ids[:,inputs.input_ids.shape[1]:],skip_special_tokens=True)[0]
        item={'id':row['id'],'sha256':row['sha256'],'answer':answer,
              'method':'Local Qwen2.5-Omni-3B automated perception; fallible, not human listening or approval.'}
        rows.append(item)
        report.write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
        print(json.dumps(item,ensure_ascii=False),flush=True)

if __name__=='__main__':main()
