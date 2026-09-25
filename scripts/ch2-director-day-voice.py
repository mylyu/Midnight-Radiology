"""One exact author-requested day-two line; reuse reviewed AuK generation/QA.

Raw takes and fixed-reference WAV remain outside the game. Only --export copies
the selected MP3; --qa and --listen-model are fallible automated checks.
"""
from pathlib import Path
import importlib.util
import sys

sys.dont_write_bytecode = True
base = Path(__file__).parent
qa = '--qa' in sys.argv or '--listen-model' in sys.argv
if '--qa' in sys.argv:
    sys.argv.remove('--qa')
source = base / ('ch2-natural-voices-qa.py' if qa else 'ch2-natural-voices.py')
spec = importlib.util.spec_from_file_location('director_day_voice', source)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
module.OUT = module.AUK / 'outputs/ch2-director-day-voice-20260925'
if qa:
    module.EXPECTED_COUNT = 1
    module.QA_REPORT = module.ROOT / 'docs/ch2-director-day-voice-qa.json'
    module.GENERATION_REPORT = module.ROOT / 'docs/ch2-director-day-voice-generation.json'
    module.MODEL_REPORT = module.ROOT / 'docs/ch2-director-day-voice-listening-model.json'
else:
    module.PLAN = module.ROOT / 'docs/ch2-director-day-voice-lines.json'
    module.RECORD = module.ROOT / 'docs/ch2-director-day-voice-generation.json'
if __name__ == '__main__':
    module.main()
