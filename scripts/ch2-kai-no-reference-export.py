"""Extract the complete first sentence from new text-only AuK takes."""
import importlib.util
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('helpers', Path(__file__).with_name('ch2-kai-no-reference-clean.py'))
h = importlib.util.module_from_spec(spec)
spec.loader.exec_module(h)
OUT = h.AUK / 'outputs/ch2-kai-no-reference-v9-20260921'
PUBLIC = ROOT / 'app/public/auditions/kai-no-reference-v9'
PUBLIC.mkdir(parents=True, exist_ok=True)
(OUT / 'wav').mkdir(exist_ok=True)
generated = json.loads((ROOT / 'docs/ch2-kai-no-reference-v9.json').read_text(encoding='utf-8'))
model = h.WhisperModel(str(h.AUK / 'ckpts/faster-whisper-medium'), device='cpu', compute_type='int8', cpu_threads=6)
rows = []
for name, source_id, cutoff in [('a', 'short', 1.20), ('b', 'context', 1.30)]:
    original = next(row for row in generated['candidates'] if row['id'] == source_id)
    assert '--audio' not in original['argv'] and '--ref_text' not in original['argv']
    source = Path(original['raw'])
    assert h.sha(source) == original['raw_sha256']
    wav, mp3 = OUT / f'wav/{name}.wav', PUBLIC / f'{name}.mp3'
    assert not wav.exists() and not mp3.exists()
    processing = f'atrim=end={cutoff},asetpts=PTS-STARTPTS,loudnorm=I=-23:TP=-3:LRA=7'
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', str(source), '-af', processing,
                    '-ar', '24000', '-ac', '1', str(wav)], check=True)
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', str(wav), '-b:a', '128k', str(mp3)], check=True)
    segments, _ = model.transcribe(str(mp3), language='zh', beam_size=5, condition_on_previous_text=False, vad_filter=False)
    transcript = ''.join(s.text for s in segments)
    signal, sr = h.sf.read(mp3)
    rows.append({'id': name, 'text': '跟你说个事儿。', 'reference_audio': None,
                 'generation': original, 'first_sentence_range': [0, cutoff],
                 'cut_note': 'Endpoint lies inside measured silence after the complete first sentence; no following speech included',
                 'processing': processing, 'local_word_gain': False, 'pitch_shift': False, 'time_stretch': False,
                 'output': str(mp3.relative_to(ROOT)).replace('\\', '/'), 'sha256': h.sha(mp3),
                 'wav': str(wav), 'wav_sha256': h.sha(wav),
                 'qa': {'transcript': transcript, 'seconds': len(signal) / sr, 'sample_rate': sr,
                        'mono': signal.ndim == 1, 'finite': bool(h.np.isfinite(signal).all()), 'peak': float(abs(signal).max())}})
    print(json.dumps({'id': name, 'qa': rows[-1]['qa']}, ensure_ascii=False), flush=True)
record = {'status': 'audition only; game unchanged', 'reference_audio_used': False, 'candidates': rows,
          'script': 'scripts/ch2-kai-no-reference-export.py', 'script_sha256': h.sha(__file__),
          'generation_record': 'docs/ch2-kai-no-reference-v9.json', 'human_listened': False, 'user_approved': False}
h.write(OUT / 'audition.json', record)
h.write(ROOT / 'docs/ch2-kai-no-reference-audition.json', record)
