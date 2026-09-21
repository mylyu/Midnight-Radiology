"""ASR/acoustic checks of five revised clips, not a claim of human listening."""
from pathlib import Path
import importlib.util
import sys

sys.dont_write_bytecode=True

source=Path(__file__).with_name('ch2-natural-voices-qa.py')
spec=importlib.util.spec_from_file_location('ch2_natural_voice_qa',source)
qa=importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa)
qa.OUT=qa.AUK/'outputs/ch2-voice-author-20260921'
qa.QA_REPORT=qa.ROOT/'docs/ch2-voice-author-qa.json'
qa.EXPECTED_COUNT=5
qa.GENERATION_REPORT=qa.ROOT/'docs/ch2-voice-author-generation.json'
qa.MODEL_REPORT=qa.ROOT/'docs/ch2-voice-author-listening-model.json'
qa.MODEL_QUESTION='逐字转写这段录音，不要改写或解释。中英混合词保留实际发音，不要用医学常识补字。然后简短说明：英文部分是连读单词，还是一个一个念字母？有无漏音、额外词或重复？'
if __name__=='__main__':qa.main()
