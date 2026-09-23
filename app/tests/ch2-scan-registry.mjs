import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { CH2_SCANS, CH2_SCAN_TEXT, CH2_SCAN_AUDIO, ch2ScanFrame } from '../src/game/ch2-scans.ts'
import { CH2_SHIFTS } from '../src/game/ch2.ts'

const expectedAcquisitions = [
  'c2n1_m7', 'c2n1_p_scan', 'c2d2_lung_scan', 'c2d2_gut_scan', 'c2d2_trauma_scan',
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
  assert.equal(config.durationMs, config.mode === 'acquire' ? 5000 : 1500)
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
const component = readFileSync('src/components/Ch2ScanOverlay.tsx', 'utf8')
assert.ok(!component.includes('onended'))
assert.ok(component.includes('visibilitychange'))
assert.ok(component.includes('window.clearInterval(timer)'))
assert.ok(component.includes('event.stopPropagation()'))
console.log('PASS 15 acquisition / 2 reconstruction hooks, wall-clock recovery, separate low-volume foley hashes, cleanup guards.')
