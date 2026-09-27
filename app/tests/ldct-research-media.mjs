import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { LDCT_RESEARCH_CASE_IDS, LDCT_RESEARCH_METHODS, LDCT_RESEARCH_CASES,
  LDCT_RESEARCH_REVEAL, ldctResearchFrame, ldctResearchFrameStyle } from '../src/game/ldct-research-media.ts'

const slots = new Set()
for (const id of LDCT_RESEARCH_CASE_IDS) for (const slice of [0, 1, 2]) for (const method of LDCT_RESEARCH_METHODS) {
  const frame = ldctResearchFrame(id, slice, method)
  assert(frame.column >= 0 && frame.column < 12 && frame.row >= 0 && frame.row < 3)
  assert.equal(ldctResearchFrameStyle(id, slice, method).backgroundSize, '1200% 300%')
  slots.add(`${frame.column}:${frame.row}`)
}
assert.equal(slots.size, 36)
assert.throws(() => ldctResearchFrame('unknown', 0, 'fbp'))
assert.throws(() => ldctResearchFrame('control', 4, 'fbp'))
assert(LDCT_RESEARCH_CASES.every(item => !/左下|右下|病灶|消失/.test(item.title)), 'Case selectors must not leak the region before comparison')
for (const reveal of Object.values(LDCT_RESEARCH_REVEAL)) {
  assert(reveal.x > 0 && reveal.x < 100 && reveal.y > 0 && reveal.y < 100 && reveal.radius > 0)
}
if (process.env.LDCT_RESEARCH_METADATA) {
  const metadata = JSON.parse(readFileSync(process.env.LDCT_RESEARCH_METADATA, 'utf8'))
  assert.equal(metadata.records.length, 36)
  assert.equal(metadata.parameters, 10857)
  assert.equal(metadata.train_count, 96)
  assert(metadata.losses.at(-1) < metadata.losses[0], 'There must be actual learned optimization')
  assert(metadata.atlas_bytes < 250 * 1024)
  for (const id of LDCT_RESEARCH_CASE_IDS) for (const slice of [0, 1, 2]) {
    const records = metadata.records.filter(r => r.case === id && r.slice === slice)
    assert.equal(new Set(records.map(r => r.projection_hash)).size, 1, 'FBP and IR must share exact data; learned input is that FBP')
    assert.equal(new Set(records.map(r => r.numeric_hash)).size, 4, 'No reused reference frame presented as neural output')
    assert(records[0].seed > metadata.train_noise_seeds[1], 'Test noise seeds must not overlap training')
  }
  const faint = metadata.records.filter(r => r.case === 'faint' && r.method === 'learned')
  assert(faint.every(r => r.contrast_fraction > .4 && r.contrast_fraction < .9), 'Teaching result is attenuation, not hand-erased disappearance')
  const shiftedMiddle = metadata.records.find(r => r.key === 'shifted:1:learned')
  assert(shiftedMiddle.contrast_fraction > .9, 'Keep the counter-counterexample: not every position/layer fails')
}
console.log('LDCT research media: 36 distinct aligned frames, nonspoiler labels, held-out training and bounded attenuation facts passed.')
