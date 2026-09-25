import assert from 'node:assert/strict'
import { logicalImagePath } from './game-delivery-media.mjs'
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { CH2_SCANS, CH2_SCAN_TEXT, CH2_SCAN_AUDIO, CH2_SCAN_ILLUSTRATION, ch2ScanFrame } from '../src/game/ch2-scans.ts'
import { CH2_SHIFTS } from '../src/game/ch2.ts'

const expectedAcquisitions = [
  'c2n1_m7', 'c2n1_p_scan', 'c2d2_lung_scan', 'c2d2_trauma_scan',
  'c2d2_wrist_scan', 'c2n3_m5', 'c2n3_repeat_scan', 'c2n3_cta_scan', 'c2n3_coronary_scan',
  'c2n3_mystery_scan', 'c2d4_aorta_scan', 'c2d4_metal_scan', 'c2n5_child_scan', 'c2d4_m1',
]
assert.deepEqual(Object.keys(CH2_SCANS).filter(id => CH2_SCANS[id].mode === 'acquire').sort(), expectedAcquisitions.sort())
assert.deepEqual(Object.keys(CH2_SCANS).filter(id => CH2_SCANS[id].mode === 'reconstruct').sort(), ['c2d2_w1', 'c2n3_coronary_volume'])
for (const [id, config] of Object.entries(CH2_SCANS)) {
  const step = CH2_SHIFTS.find(shift => shift.steps[id])?.steps[id]
  assert.ok(step, `${id} is an actual story hook`)
  if (config.mode === 'acquire') {
    assert.equal(step.effect, undefined, `${id} auto-next requires no discarded effect`)
    assert.equal(step.card, undefined, `${id} auto-next requires no discarded card`)
    assert.equal(step.event, undefined, `${id} auto-next requires no discarded event`)
    assert.equal(step.sfx, undefined, `${id} shared exposure noise must not follow the overlay`)
  }
  assert.equal(config.id, id)
  assert.ok(CH2_SCAN_TEXT[id])
  assert.equal(config.durationMs, config.mode === 'acquire' ? 3000 : 1500)
  assert.equal(ch2ScanFrame(config, 1000, 1000).progress, 0)
  assert.equal(ch2ScanFrame(config, 1000, 1000 + config.durationMs).complete, true)
  assert.equal(ch2ScanFrame(config, 1000, 900000).complete, true, `${id} resumes an expired scan`)
  assert.equal(ch2ScanFrame(config, NaN, 1000).complete, true, `${id} malformed old timestamp cannot lock input`)
  assert.equal(ch2ScanFrame(config, 999999999, 1000).complete, true, `${id} invalid future timestamp cannot lock input`)
  assert.equal(ch2ScanFrame(config, 1000, 1000 + config.durationMs * 0.85).phase, 'reconstruct')
  if (config.mode === 'reconstruct') assert.equal(ch2ScanFrame(config, 1000, 1001).phase, 'reconstruct')
}
const manifest = JSON.parse(readFileSync('../docs/ch2-ct-foley.json', 'utf8'))
assert.equal(manifest.records.length, 2)
for (const record of manifest.records) {
  const path = `../${record.output}`
  assert.ok(existsSync(path))
  assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'), record.sha256)
  assert.ok(record.playbackGain <= 0.24)
}
for (const sound of Object.values(CH2_SCAN_AUDIO)) assert.ok(existsSync(`public/audio/${sound}.mp3`))
assert.equal(CH2_SCAN_AUDIO.acquisition, 'ch2_ct_real_scan_20260924')
const recorded = JSON.parse(readFileSync('../docs/ch2-real-ct-audio.json', 'utf8'))
const recordedBytes = readFileSync(`../${recorded.output}`)
assert.equal(recorded.output, `app/public/audio/${CH2_SCAN_AUDIO.acquisition}.mp3`)
assert.equal(createHash('sha256').update(recordedBytes).digest('hex'), recorded.sha256)
assert.equal(recorded.sha256, '27ce2978e81ab5a2ada579e528219814243e86fedd5da554e6cf4d8df862f633')
assert.equal(recordedBytes.length, recorded.bytes)
assert.deepEqual(recorded.intervalSeconds, [81, 84])
assert.equal(recorded.processing.trimSeconds, 3)
assert.equal(recorded.processing.pitchShift, false)
assert.equal(recorded.processing.timeStretch, false)
assert.equal(recorded.processing.syntheticOverlay, false)
assert.equal(recorded.processing.sampleRate, 24000)
assert.equal(recorded.processing.channels, 1)
assert.equal(recorded.playbackGain, 0.24)
assert.ok(logicalImagePath(CH2_SCAN_ILLUSTRATION))
assert.match(CH2_SCANS.c2d2_trauma_scan.title, /腰椎与骨盆/)
const component = readFileSync('src/components/Ch2ScanOverlay.tsx', 'utf8')
assert.ok(!component.includes('onended'))
assert.ok(component.includes('visibilitychange'))
assert.ok(component.includes('window.clearInterval(timer)'))
assert.ok(component.includes('event.stopPropagation()'))
assert.ok(component.includes('recording.loop = false'))
assert.ok(component.includes(`recording.volume = ${recorded.playbackGain}`))
assert.ok(!component.includes('CH2_SCAN_AUDIO.ready'))
assert.ok(!component.includes('ch2-scan-gantry'))
assert.doesNotMatch(component, /onSkip|skipRef|scan-skip|跳过|finish\(true\)/, 'No skip control or callback remains')
assert.match(component, /if \(next\.complete\) finish\(\)/, 'Completion is gated by elapsed animation time')
assert.doesNotMatch(readFileSync('src/components/Ch2ScanOverlay.css', 'utf8'), /scan-skip/)
assert.doesNotMatch(readFileSync('src/App.tsx', 'utf8').match(/<Ch2ScanOverlay[^>]+\/>/)?.[0] ?? '', /onSkip/)
console.log('PASS 14 three-second acquisition / 2 reconstruction hooks after the approved abdomen-case retirement; dedicated pixel scene, real 81-84s recording exact hash/provenance, one-shot sound, wall-clock recovery, retired foley hashes preserved, cleanup guards.')
