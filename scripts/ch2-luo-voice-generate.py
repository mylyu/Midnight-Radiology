"""One new Luo entrance; text-only AuK candidates stay outside public assets.

Run with the sibling AuK .venv Python. --generate creates immutable candidates,
--qa checks decoding/ASR, --listen-model provides fallible automated perception,
and only --export copies one explicitly selected MP3 into the game.
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
OUT = AUK / 'outputs/ch2-luo-entrance-20260925'
REPORT = ROOT / 'docs/ch2-luo-voice-generation.json'
TEXT = '大夫，帮我看看。'
ASSET_ID = 'vox_ch2_luo_entrance_20260925'
CANDIDATES = [
    ('a', 2026092501, 2.3,
     '六十八岁左右的普通女性，略低、稍有沙感的年长女声，身体还利索，说话清楚。'
     '拿着片袋走到熟悉的门诊医生面前，自然地招呼一声，请人帮忙看看。'
     '平常音量，口语顺畅，亲切但不撒娇，不夸张颤抖，不故作苍老，不装神秘，'
     '不是播音或舞台表演。干净单人普通话，无音乐、无环境音。'),
    ('b', 2026092502, 2.2,
     '一位接近七十岁的中国老太太，朴素爽利，声音偏中低、略粗，年长女性的自然嗓音。'
     '她将自己的检查片递过去，随口向医生请求帮忙，语气温和直接。'
     '大夫两个字连贯，帮我看看像日常说话，不逐字强调，句尾平稳收住。'
     '不是惊恐、呻吟、卖萌或朗诵，不刻意模仿衰弱。纯净独白，没有其他人声和背景音乐。'),
    ('c', 2026092503, 2.1,
     'An elderly Chinese woman around seventy, with an unmistakably feminine alto voice. '
     'Her natural female speaking tone has a lightly weathered texture but clear articulation. '
     'She casually hands her films to a doctor and asks a simple favor in conversational Mandarin. '
     'Warm, straightforward, unhurried everyday speech, not whispering, not a character impression. '
     'Clean solo female speech without background sound or music.'),
    ('d', 2026092504, 2.0,
     '一位七十岁左右的中国女性，明显的女声，音色清亮温厚，略带老年女性的沙感，普通话。'
     '像生活中爽快亲切的阿姨，递出片子随口求助。声音自然，有精神，短句一气说完，'
     '不压低成男声，不拖长大夫两个字，不撒娇，不哭，不颤抖，不演戏。没有音乐或音效。'),
]
ENV = {**os.environ, 'PYTHONUTF8': '1', 'HF_HUB_DISABLE_IMPLICIT_TOKEN': '1'}
ENV.pop('HF_TOKEN', None)


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def read_rows():
    return json.loads((OUT / 'candidates.json').read_text(encoding='utf-8'))


def generate():
    for folder in ['raw', 'wav', 'mp3', 'logs']:
        (OUT / folder).mkdir(parents=True, exist_ok=True)
    rows = read_rows() if (OUT / 'candidates.json').exists() else []
    for candidate_id, seed, seconds, description in CANDIDATES:
        if any(row['candidate'] == candidate_id for row in rows):
            continue
        instruction = f'请基于下面的描述: "{description}",生成语音内容"{TEXT}".'
        raw = OUT / f'raw/{candidate_id}.wav'
        assert not raw.exists(), 'Do not overwrite a partially generated or reviewed take'
        argv = [str(AUK / '.venv/Scripts/auk-infer.exe'),
                '--ckpt', str(AUK / 'ckpts/AuK-Flash/auk_flash.safetensors'),
                '--qwen_path', str(AUK / 'ckpts/Qwen2.5-Omni-3B'),
                '--dtype', 'bf16', '--device', 'cuda:0', '--cpu_offload',
                '--seed', str(seed), '--gen_seconds', str(seconds),
                '--instruction', instruction, '--output', str(raw)]
        assert '--audio' not in argv and '--ref_text' not in argv
        print('GENERATE', candidate_id, flush=True)
        started = time.monotonic()
        with (OUT / f'logs/{candidate_id}.log').open('w', encoding='utf-8') as log:
            subprocess.run(argv, cwd=AUK, env=ENV, stdout=log, stderr=subprocess.STDOUT, check=True)
        wav, mp3 = OUT / f'wav/{candidate_id}.wav', OUT / f'mp3/{candidate_id}.mp3'
        processing = 'loudnorm=I=-20:TP=-2:LRA=7'
        export_commands = [
            ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', str(raw), '-af', processing,
             '-ar', '24000', '-ac', '1', str(wav)],
            ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', str(wav), '-b:a', '128k', str(mp3)],
        ]
        for command in export_commands:
            subprocess.run(command, check=True)
        row = {'candidate': candidate_id, 'text': TEXT, 'seed': seed, 'gen_seconds': seconds,
               'description': description, 'instruction': instruction, 'argv': argv,
               'reference_audio': None, 'elapsed_seconds': round(time.monotonic() - started, 2),
               'raw': str(raw), 'raw_sha256': sha(raw), 'wav': str(wav), 'wav_sha256': sha(wav),
               'candidate_mp3': str(mp3), 'mp3_sha256': sha(mp3), 'mp3_bytes': mp3.stat().st_size,
               'processing': processing, 'export_commands': export_commands,
               'pitch_change': False, 'time_stretch': False, 'word_gain': False}
        rows.append(row)
        write(OUT / 'candidates.json', rows)
        print('DONE', candidate_id, row['elapsed_seconds'], flush=True)


def qa():
    import numpy as np
    import soundfile as sf
    from faster_whisper import WhisperModel
    model = WhisperModel(str(AUK / 'ckpts/faster-whisper-medium'), device='cpu', compute_type='int8', cpu_threads=6)
    rows = read_rows()
    for row in rows:
        mp3 = Path(row['candidate_mp3'])
        assert sha(mp3) == row['mp3_sha256']
        subprocess.run(['ffmpeg', '-v', 'error', '-i', str(mp3), '-f', 'null', '-'], check=True)
        signal, sr = sf.read(mp3)
        segments, _ = model.transcribe(str(mp3), language='zh', beam_size=5,
                                      condition_on_previous_text=False, vad_filter=False, word_timestamps=True)
        segments = list(segments)
        loudness = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(mp3), '-af',
                                  'loudnorm=I=-20:TP=-2:LRA=7:print_format=json', '-f', 'null', '-'],
                                 capture_output=True, text=True, check=True).stderr
        measured = json.loads(loudness[loudness.rfind('{'):loudness.rfind('}') + 1])
        analysis = {'sample_rate': sr, 'mono': signal.ndim == 1,
                    'seconds': round(len(signal) / sr, 3), 'finite': bool(np.isfinite(signal).all()),
                    'peak': round(float(abs(signal).max()), 6),
                    'rms': round(float(np.sqrt(np.mean(signal * signal))), 6),
                    'transcript': ''.join(segment.text for segment in segments),
                    'words': [{'text': word.word, 'start': word.start, 'end': word.end}
                              for segment in segments for word in segment.words],
                    'measured_lufs': measured['input_i'], 'measured_true_peak_dbtp': measured['input_tp'],
                    'clipped_samples': int((abs(signal) >= .999).sum()),
                    'method': 'faster-whisper-medium ASR + soundfile + FFmpeg; not human approval'}
        assert analysis['mono'] and analysis['finite'] and sr == 24000
        assert .5 < analysis['seconds'] < 4 and analysis['peak'] < .98 and analysis['rms'] > .003
        row['qa'] = analysis
        print(json.dumps({'candidate': row['candidate'], 'qa': analysis}, ensure_ascii=False), flush=True)
    write(OUT / 'candidates.json', rows)


def listen_model():
    import importlib.util
    helper_path = Path(__file__).with_name('ch2-natural-voices-qa.py')
    spec = importlib.util.spec_from_file_location('luo_perception', helper_path)
    helper = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(helper)
    helper.MODEL_QUESTION = ('仅根据音频实际听到的内容：先完整转写；然后描述声音更像男声还是女声、'
                             '年轻还是年长（不确定就说不确定），是否自然口语、是否有明显表演腔或夸张颤音。'
                             '检查有无重复、漏字、末字截断、音乐或其他声音。不要根据台词推断角色职业或场景。简短回答。')
    helper.GENERATION_REPORT = OUT / 'perception-input.json'
    helper.MODEL_REPORT = OUT / 'automated-listening.json'
    write(helper.GENERATION_REPORT, [{**row, 'key': row['candidate'], 'id': row['candidate'],
                                      'output': row['candidate_mp3'], 'sha256': row['mp3_sha256']}
                                     for row in read_rows()])
    helper.model_review('')


def export(candidate_id):
    rows = read_rows()
    row = next(row for row in rows if row['candidate'] == candidate_id)
    assert row.get('qa'), 'Run --qa first'
    target = ROOT / f'app/public/audio/{ASSET_ID}.mp3'
    source = Path(row['candidate_mp3'])
    assert sha(source) == row['mp3_sha256']
    assert not target.exists() or sha(target) == row['mp3_sha256'], 'Use a new filename for different reviewed audio'
    shutil.copy2(source, target)
    perception_path = OUT / 'automated-listening.json'
    selection_notes = {
        'd': 'Selected D: complete short transcript and tail; automated perception describes a natural female voice without theatrical tremor or extra sounds. It cannot reliably confirm age. A/B were not selected after a male-voice classification; C was classified as sounding young. These fallible classifications are preserved, not treated as human audition approval.',
    }
    record = {'asset_id': ASSET_ID, 'text': TEXT, 'character': '罗阿姨，约68岁，退休缝纫工',
              'status': 'Local newly generated entrance; no user audition approval or deployment yet',
              'selected_candidate': candidate_id, 'output': target.relative_to(ROOT).as_posix(),
              'sha256': sha(target), 'bytes': target.stat().st_size,
              'reference_audio_used': False, 'original_voices_modified': False,
              'selection_note': selection_notes.get(candidate_id, 'Selection requires review against the recorded candidate checks.'),
              'script': Path(__file__).relative_to(ROOT).as_posix(), 'script_sha256': sha(__file__),
              'human_listened': False, 'user_approved': False,
              'candidates': rows,
              'automated_audio_perception': json.loads(perception_path.read_text(encoding='utf-8')) if perception_path.exists() else [],
              'limitations': 'ASR and automated audio perception are fallible. They do not prove a specific age, natural performance or human approval.'}
    write(REPORT, record)
    write(OUT / 'selected.json', record)
    print('EXPORTED', str(target), record['sha256'], flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--generate', action='store_true')
    parser.add_argument('--qa', action='store_true')
    parser.add_argument('--listen-model', action='store_true')
    parser.add_argument('--export', choices=[row[0] for row in CANDIDATES])
    args = parser.parse_args()
    if args.generate:
        generate()
    if args.qa:
        qa()
    if args.listen_model:
        listen_model()
    if args.export:
        export(args.export)
