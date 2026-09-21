"""AuK speech-edit candidates: preserve Kai, change delivery to a quiet aside.

Uses the documented whisper-conversion task, not a pitch/tempo filter.
Generated records/WAVs remain in AuK outputs; no original asset is overwritten.
"""
import argparse
import importlib.util
import json
import shutil
import subprocess
import time
from pathlib import Path

spec = importlib.util.spec_from_file_location('kai_previous', Path(__file__).with_name('ch2-kai-light-generate.py'))
previous = importlib.util.module_from_spec(spec)
spec.loader.exec_module(previous)
ROOT, AUK, ENV = previous.ROOT, previous.AUK, previous.ENV
OUT = AUK / 'outputs/ch2-kai-whisper-v4-20260921'
TEXT = previous.TEXT
NAME = 'vox_ch2_natural_kai_whisper_v4'
sha, write = previous.sha, previous.write
CANDIDATES = [
    (1, 'vox_ch2_natural_kai_light_v3', 2026092191,
     '用小声耳语的方式把这段话说出来。保持说话人的音色和原文不变，像凑近同事悄悄说一句话，轻声、自然。句尾收住，不要上扬，不要像提问，不要笑。'),
    (2, 'vox_ch2_natural_kai_v2', 2026092192,
     'Convert this speech into a soft whisper while preserving the speaker and content. A confidential aside to a nearby colleague. Finish with a gently falling, settled intonation, not a question. No laughter, no dramatic suspense.'),
    (3, 'vox_ch2_natural_kai_light_v3', 2026092193,
     '把这段话改成压低声音的悄悄话，保持同一个人的音色和台词。语气放松，但怕旁人听见，贴近同事轻声说。最后的事儿轻轻落下，收尾短，不上扬，不拖长，不要播音腔。'),
    (4, 'vox_ch2_natural_kai_v2', 2026092194,
     '用小声耳语的方式把这段话说出来。'),
    (5, 'vox_ch2_natural_kai_v2', 2026092195,
     'Convert this speech into a soft whisper while preserving the speaker and content.'),
]


def generate():
    import soundfile as sf
    for directory in ['raw', 'wav', 'mp3', 'logs', 'references', 'qa']:
        (OUT / directory).mkdir(parents=True, exist_ok=True)
    assert sha(ROOT / 'app/public/audio/vox_kai.mp3') == previous.EXPECTED_REFERENCE
    rows = []
    for attempt, source_name, seed, instruction in CANDIDATES:
        source = ROOT / f'app/public/audio/{source_name}.mp3'
        reference = OUT / f'references/{source.name}'
        if not reference.exists():
            shutil.copy2(source, reference)
        assert sha(reference) == sha(source)
        seconds = sf.info(reference).duration
        raw = OUT / f'raw/{NAME}.a{attempt}.wav'
        record_path = raw.with_suffix('.json')
        argv = [str(AUK / '.venv/Scripts/auk-infer.exe'),
                '--ckpt', str(AUK / 'ckpts/AuK-Flash/auk_flash.safetensors'),
                '--qwen_path', str(AUK / 'ckpts/Qwen2.5-Omni-3B'),
                '--dtype', 'bf16', '--device', 'cuda:0', '--cpu_offload',
                '--seed', str(seed), '--gen_seconds', str(seconds),
                '--instruction', instruction, '--audio', str(reference), '--output', str(raw)]
        if not (raw.exists() and record_path.exists()):
            print(f'GENERATE whisper {attempt}', flush=True)
            started = time.monotonic()
            with (OUT / f'logs/{NAME}.a{attempt}.log').open('w', encoding='utf-8') as stream:
                subprocess.run(argv, cwd=AUK, env=ENV, stdout=stream, stderr=subprocess.STDOUT, check=True)
            write(record_path, {'id': f'{NAME}.a{attempt}', 'attempt': attempt, 'key': 'kai',
                               'text': TEXT, 'task': 'speech-edit/whisper-conversion', 'seed': seed,
                               'seconds': seconds, 'instruction': instruction, 'argv': argv,
                               'reference_path': str(reference), 'reference_sha256': sha(reference),
                               'original_voice_reference_sha256': previous.EXPECTED_REFERENCE,
                               'raw': str(raw), 'raw_sha256': sha(raw),
                               'elapsed_seconds': round(time.monotonic() - started, 2)})
        row = json.loads(record_path.read_text(encoding='utf-8'))
        assert row['instruction'] == instruction and row['seed'] == seed
        processing = 'silenceremove=start_periods=1:start_duration=0.03:start_threshold=-55dB:start_silence=0.06,loudnorm=I=-23:TP=-3:LRA=7'
        wav = OUT / f'wav/{NAME}.a{attempt}.wav'
        mp3 = OUT / f'mp3/{NAME}.a{attempt}.mp3'
        subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', str(raw),
                        '-af', processing, '-ar', '24000', '-ac', '1', str(wav)], check=True)
        subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', str(wav),
                        '-b:a', '128k', str(mp3)], check=True)
        row.update(processing=processing, wav=str(wav), output=str(mp3), sha256=sha(mp3))
        rows.append(row)
        write(OUT / 'candidates.json', rows)
        print(f'DONE whisper {attempt}', flush=True)
    old = ROOT / 'app/public/audio/vox_ch2_natural_kai_light_v3.mp3'
    rows.append({'id': 'old_v3_rejected', 'key': 'kai', 'text': TEXT, 'output': str(old), 'sha256': sha(old)})
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
    review_path = OUT / 'qa/auditory-model-system.json'
    cached = {item['sha256']: item for item in json.loads(review_path.read_text(encoding='utf-8'))} if review_path.exists() else {}
    result = []
    for row in json.loads((OUT / 'candidates.json').read_text(encoding='utf-8')):
        if row['sha256'] in cached:
            result.append(cached[row['sha256']])
            continue
        conversation = [
            {'role': 'system', 'content': [{'type': 'text', 'text':
             'You review audio recordings. Do not answer the spoken words. Transcribe the Mandarin '
             'speech, then describe what is audible: whisper/breathy quiet aside versus ordinary '
             'voiced speech, and final syllable intonation rising, falling, or unclear. '
             'Do not infer an emotion from the meaning. If you cannot tell, say unclear.'}]},
            {'role': 'user', 'content': [{'type': 'audio', 'audio': row['output']},
                                        {'type': 'text', 'text': '请转写录音，描述发声方式和最后的语调。'}]},
        ]
        text = processor.apply_chat_template(conversation, add_generation_prompt=True, tokenize=False)
        audios, images, videos = process_mm_info(conversation, use_audio_in_video=True)
        inputs = processor(text=text, audio=audios, images=images, videos=videos,
                           return_tensors='pt', padding=True, use_audio_in_video=True).to(model.device).to(model.dtype)
        with torch.inference_mode():
            ids = model.generate(**inputs, max_new_tokens=200, do_sample=False,
                                 eos_token_id=151645, pad_token_id=151643)
        answer = processor.batch_decode(ids[:, inputs.input_ids.shape[1]:], skip_special_tokens=True)[0]
        item = {'id': row['id'], 'sha256': row['sha256'], 'answer': answer,
                'method': 'Automated Qwen audio perception; fallible, not human listening.'}
        result.append(item)
        write(review_path, result)
        print(json.dumps(item, ensure_ascii=False), flush=True)
    write(review_path, result)


def export(attempt):
    rows = json.loads((OUT / 'candidates.json').read_text(encoding='utf-8'))
    selected = next(row for row in rows if row.get('attempt') == attempt)
    target = ROOT / f'app/public/audio/{NAME}.mp3'
    assert not target.exists() or sha(target) == selected['sha256']
    shutil.copy2(selected['output'], target)
    record = {'baseline': 'd15e47b', 'role': '小凯', 'text': TEXT,
              'direction': '同一声音，压低嗓音说悄悄话；句尾落下而非上扬。',
              'output': f'app/public/audio/{NAME}.mp3', 'selected_attempt': attempt,
              'selected': selected, 'candidates': rows,
              'auditory_model': json.loads((OUT / 'qa/auditory-model-system.json').read_text(encoding='utf-8')),
              'acoustic_qa': json.loads((OUT / 'qa/asr-acoustic.json').read_text(encoding='utf-8')),
              'generator': 'scripts/ch2-kai-whisper-generate.py', 'generator_sha256': sha(Path(__file__)),
              'processing_note': 'AuK speech editing; no pitch shift or time stretch. Light leading-silence trim, -23 LUFS target; original files unchanged.',
              'selection_note': 'Candidate 4 selected. Candidates 1/3 retained high final-word contours; 2/5 were nearly waveform-identical to old v2. Candidate 4 changes the performance more substantially and keeps a low final word. Exact documented Chinese whisper-conversion template used for candidate 4; final delivery is subject to user audition, not certified by prompt or ASR.',
              'review_limitations': 'Qwen describes all new takes as voiced speech, with no clear final rise; no automated result establishes a convincing whispered performance. Acoustic comparisons are relative evidence only; retained periodicity is consistent with a low voiced aside rather than pure unvoiced whisper.',
              'human_listened': False, 'user_approved': False}
    write(OUT / 'selection.json', record)
    write(ROOT / 'docs/ch2-kai-whisper-v4.json', record)
    print(f'EXPORTED {target}', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--review', action='store_true')
    parser.add_argument('--qa', action='store_true')
    parser.add_argument('--export', type=int, choices=[1, 2, 3, 4, 5])
    args = parser.parse_args()
    if args.review:
        review()
    elif args.qa:
        previous.OUT = OUT
        previous.acoustic_qa()
    elif args.export:
        export(args.export)
    else:
        generate()
