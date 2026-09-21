"""Independent audio perception only; no synthesis and no reference conditioning."""
import importlib.util
import json
import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('review_helper', Path(__file__).with_name('ch2-kai-whisper-generate.py'))
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)
parser = argparse.ArgumentParser()
parser.add_argument('--round', choices=['v7', 'v8', 'audition'], default='audition')
args = parser.parse_args()
record = json.loads((ROOT / f'docs/ch2-kai-no-reference-{args.round}.json').read_text(encoding='utf-8'))
helper.OUT = ROOT.parent / f'AuK/outputs/ch2-kai-no-reference-{args.round}-20260921/review'
(helper.OUT / 'qa').mkdir(parents=True, exist_ok=True)
rows = [{**row, 'output': str(ROOT / row['output'])} for row in record['candidates']]
helper.write(helper.OUT / 'candidates.json', rows)
helper.review()
