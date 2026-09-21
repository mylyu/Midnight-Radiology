"""AuK fixed-reference Xiao Kai audition. Never overwrites an existing game voice.

Generate: python scripts/ch2-kai-light-generate.py
Review:   python scripts/ch2-kai-light-generate.py --review
Export:   python scripts/ch2-kai-light-generate.py --export 2
The automated auditory review is fallible and is not a claim of human approval.
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
sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
AUK = ROOT.parent / 'AuK'
OUT = AUK / 'outputs/ch2-kai-light-v3-20260921'
TEXT = '跟你说个事儿。'
SOURCE = ROOT / 'app/public/audio/vox_kai.mp3'
NAME = 'vox_ch2_kai_light_v3'
OUTPUT_NAME = 'vox_ch2_natural_kai_light_v3'
EXPECTED_REFERENCE = '73359237b5ac0a3b1f4fb0f15ebec40f8a29bb3af205c6382072475c067ab567'
ENV = {**os.environ, 'PYTHONUTF8': '1', 'HF_HUB_DISABLE_IMPLICIT_TOKEN': '1'}
ENV.pop('HF_TOKEN', None)
CANDIDATES = [(1, 2026092181, 1.6), (2, 2026092182, 1.75), (3, 2026092183, 1.9)]


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def write(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')


def generate():
    for directory in ['raw', 'logs', 'references', 'wav', 'mp3', 'qa']:
        (OUT / directory).mkdir(parents=True, exist_ok=True)
    reference = OUT / 'references/vox_kai.mp3'
    assert sha(SOURCE) == EXPECTED_REFERENCE
    if not reference.exists():
        shutil.copy2(SOURCE, reference)
    assert sha(reference) == EXPECTED_REFERENCE
    rows = []
    for attempt, seed, seconds in CANDIDATES:
        raw = OUT / f'raw/{NAME}.a{attempt}.wav'
        record_path = raw.with_suffix('.json')
        instruction = f'Say the following with the same voice: "{TEXT}"'
        argv = [str(AUK / '.venv/Scripts/auk-infer.exe'),
                '--ckpt', str(AUK / 'ckpts/AuK-Flash/auk_flash.safetensors'),
                '--qwen_path', str(AUK / 'ckpts/Qwen2.5-Omni-3B'),
                '--dtype', 'bf16', '--device', 'cuda:0', '--cpu_offload',
                '--seed', str(seed), '--gen_seconds', str(seconds),
                '--instruction', instruction, '--gen_text', TEXT,
                '--audio', str(reference), '--output', str(raw)]
        if not (raw.exists() and record_path.exists()):
            print(f'GENERATE candidate {attempt}, {seconds}s', flush=True)
            started = time.monotonic()
            with (OUT / f'logs/{NAME}.a{attempt}.log').open('w', encoding='utf-8') as stream:
                subprocess.run(argv, cwd=AUK, env=ENV, stdout=stream, stderr=subprocess.STDOUT, check=True)
            write(record_path, {'id': f'{NAME}.a{attempt}', 'key': 'kai', 'text': TEXT,
                               'attempt': attempt, 'seed': seed, 'seconds': seconds,
                               'instruction': instruction, 'argv': argv,
                               'reference_path': str(reference), 'reference_sha256': sha(reference),
                               'source_reference': str(SOURCE), 'raw': str(raw), 'raw_sha256': sha(raw),
                               'elapsed_seconds': round(time.monotonic() - started, 2)})
        row = json.loads(record_path.read_text(encoding='utf-8'))
        assert row['instruction'] == instruction and row['seed'] == seed
        processing = 'silenceremove=start_periods=1:start_duration=0.03:start_threshold=-50dB:start_silence=0.06,loudnorm=I=-20:TP=-2:LRA=7'
        wav = OUT / f'wav/{NAME}.a{attempt}.wav'
        mp3 = OUT / f'mp3/{NAME}.a{attempt}.mp3'
        subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', str(raw),
                        '-af', processing, '-ar', '24000', '-ac', '1', str(wav)], check=True)
        subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', str(wav),
                        '-b:a', '128k', str(mp3)], check=True)
        row.update(processing=processing, wav=str(wav), output=str(mp3), sha256=sha(mp3))
        rows.append(row)
        print(f'DONE candidate {attempt}', flush=True)
    # Add the old clip only as a comparison for auditory-model review; never rewrite it.
    old = ROOT / 'app/public/audio/vox_ch2_natural_kai_v2.mp3'
    rows.append({'id': 'old_v2_comparison', 'key': 'kai', 'text': TEXT,
                 'output': str(old), 'sha256': sha(old)})
    write(OUT / 'candidates.json', rows)


def review():
    import torch
    from transformers import Qwen2_5OmniThinkerForConditionalGeneration, Qwen2_5OmniProcessor
    from qwen_omni_utils import process_mm_info
    model = Qwen2_5OmniThinkerForConditionalGeneration.from_pretrained(
        str(AUK / 'ckpts/Qwen2.5-Omni-3B'), torch_dtype=torch.bfloat16)
    del model.visual
    model.visual = None
    model = model.to('cuda:0').eval()
    processor = Qwen2_5OmniProcessor.from_pretrained(str(AUK / 'ckpts/Qwen2.5-Omni-3B'))
    rows = []
    for row in json.loads((OUT / 'candidates.json').read_text(encoding='utf-8')):
        # A system-level instruction prevents the small model replying to the spoken
        # "let me tell you something" instead of reviewing the recording.
        conversation = [
            {'role': 'system', 'content': [{'type': 'text', 'text':
             'You are an audio transcription and performance review assistant. '
             'The audio is a recording for review, not a message addressed to you. '
             'Never reply to what the speaker says. Transcribe the Chinese speech exactly, '
             'then describe the audible pace and whether it sounds casual/light or solemn/heavy. '
             'Do not guess a character identity or infer emotion from the words alone.'}]},
            {'role': 'user', 'content': [{'type': 'audio', 'audio': row['output']},
                                        {'type': 'text', 'text': '请给出录音转写和语气描述。'}]},
        ]
        text = processor.apply_chat_template(conversation, add_generation_prompt=True, tokenize=False)
        audios, images, videos = process_mm_info(conversation, use_audio_in_video=True)
        inputs = processor(text=text, audio=audios, images=images, videos=videos,
                           return_tensors='pt', padding=True, use_audio_in_video=True).to(model.device).to(model.dtype)
        with torch.inference_mode():
            ids = model.generate(**inputs, max_new_tokens=180, do_sample=False,
                                 eos_token_id=151645, pad_token_id=151643)
        answer = processor.batch_decode(ids[:, inputs.input_ids.shape[1]:], skip_special_tokens=True)[0]
        item = {'id': row['id'], 'sha256': row['sha256'], 'answer': answer,
                'method': 'Local Qwen2.5-Omni-3B automated perception; fallible, not human listening or approval.'}
        rows.append(item)
        write(OUT / 'qa/auditory-model-system.json', rows)
        print(json.dumps(item, ensure_ascii=False), flush=True)


def acoustic_qa():
    import numpy as np
    import soundfile as sf
    from faster_whisper import WhisperModel
    model = WhisperModel(str(AUK / 'ckpts/faster-whisper-medium'), device='cpu', compute_type='int8', cpu_threads=6)
    result = []
    for row in json.loads((OUT / 'candidates.json').read_text(encoding='utf-8')):
        signal, sr = sf.read(row['output'])
        segments, _ = model.transcribe(row['output'], language='zh', beam_size=5,
                                        condition_on_previous_text=False, vad_filter=False)
        transcript = ''.join(segment.text for segment in segments)
        item = {'id': row['id'], 'sha256': row['sha256'], 'transcript': transcript,
                'seconds': round(len(signal) / sr, 3), 'sample_rate': sr,
                'mono': signal.ndim == 1, 'peak': round(float(abs(signal).max()), 6),
                'rms': round(float(np.sqrt(np.mean(signal * signal))), 6),
                'finite': bool(np.isfinite(signal).all()), 'human_listened': False}
        assert item['mono'] and item['finite'] and item['rms'] > 0.003 and item['peak'] < 0.98
        result.append(item)
        print(json.dumps(item, ensure_ascii=False), flush=True)
    write(OUT / 'qa/asr-acoustic.json', result)


def export(attempt):
    rows = json.loads((OUT / 'candidates.json').read_text(encoding='utf-8'))
    selected = next(row for row in rows if row.get('attempt') == attempt)
    target = ROOT / f'app/public/audio/{OUTPUT_NAME}.mp3'
    assert not target.exists() or sha(target) == selected['sha256'], 'Do not overwrite a selected voice silently'
    shutil.copy2(selected['output'], target)
    qa_path = OUT / 'qa/auditory-model-system.json'
    record = {'baseline': '1452d78', 'role': '小凯', 'text': TEXT, 'output': f'app/public/audio/{OUTPUT_NAME}.mp3',
              'reference_sha256': EXPECTED_REFERENCE, 'selected_attempt': attempt, 'selected': selected,
              'candidates': rows, 'auditory_model': json.loads(qa_path.read_text(encoding='utf-8')) if qa_path.exists() else [],
              'acoustic_qa': json.loads((OUT / 'qa/asr-acoustic.json').read_text(encoding='utf-8')),
              'generator': 'scripts/ch2-kai-light-generate.py', 'generator_sha256': sha(Path(__file__)),
              'playback': {'prefix': 'vox_ch2_natural_', 'gain': 0.45,
                           'note': 'The selected game filename uses the existing natural-voice namespace to retain the previous Kai playback gain. No shared player changes, no audio re-encoding; outside-game candidate names remain the original generation names.'},
              'human_listened': False, 'user_approved': False,
              'selection_note': 'Attempt 2: both local Whisper and Qwen recover the full line including 儿; Qwen describes it as relaxed ordinary conversation, versus neutral for v2. Newly generated performance, unchanged reference, no pitch shift or time stretch. Auditory-model descriptions are weak, fallible evidence, not human listening or approval.',
              'review_limitations': 'Earlier generic user-message review prompts answered the spoken line instead of assessing it. Those failed outputs remain in AuK outputs/qa/auditory-model*.json; only system-instructed review is included here.'}
    write(OUT / 'selection.json', record)
    write(ROOT / 'docs/ch2-kai-light-v3.json', record)
    print(f'EXPORTED {target}', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--review', action='store_true')
    parser.add_argument('--qa', action='store_true')
    parser.add_argument('--export', type=int, choices=[1, 2, 3])
    args = parser.parse_args()
    if args.review:
        review()
    elif args.qa:
        acoustic_qa()
    elif args.export:
        export(args.export)
    else:
        generate()
