"""The author's 2026-09-21 exact lines; separate output and reference records."""
from pathlib import Path
import importlib.util
import sys

sys.dont_write_bytecode=True

source=Path(__file__).with_name('ch2-natural-voices.py')
spec=importlib.util.spec_from_file_location('ch2_natural_voice_generator',source)
generator=importlib.util.module_from_spec(spec)
spec.loader.exec_module(generator)
generator.OUT=generator.AUK/'outputs/ch2-voice-author-20260921'
generator.PLAN=generator.ROOT/'docs/ch2-voice-author-lines.json'
generator.RECORD=generator.ROOT/'docs/ch2-voice-author-generation.json'
if __name__=='__main__':generator.main()
