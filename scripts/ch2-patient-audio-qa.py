"""Decode, acoustic checks and ASR spot checks; NOT a claim of human listening."""
import json
from pathlib import Path
import numpy as np
import soundfile as sf
from faster_whisper import WhisperModel

root = Path(__file__).resolve().parents[1]
auk = root.parent / 'AuK'
model = WhisperModel(str(auk / 'ckpts/faster-whisper-medium'), device='cpu', compute_type='int8', cpu_threads=8)
records = json.loads((root / 'docs/ch2-patient-audio.json').read_text(encoding='utf-8'))
results = []
for row in records:
    x, sr = sf.read(root / row['output'])
    segments, _ = model.transcribe(str(root / row['output']), language='zh', beam_size=5,
                                  condition_on_previous_text=False, vad_filter=False)
    result = {'id': row['id'], 'seconds': round(len(x)/sr, 3), 'sample_rate':sr,
              'mono':x.ndim==1, 'finite':bool(np.isfinite(x).all()), 'peak':float(np.abs(x).max()),
              'rms':float(np.sqrt(np.mean(x*x))), 'expected':row['spoken_text'],
              'asr':''.join(s.text for s in segments)}
    assert result['finite'] and result['mono'] and result['rms'] > 0.003
    assert .6 < result['seconds'] < 6 and result['peak'] < .98
    results.append(result)
    print(json.dumps(result, ensure_ascii=False), flush=True)
(root / 'docs/ch2-patient-audio-qa.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
