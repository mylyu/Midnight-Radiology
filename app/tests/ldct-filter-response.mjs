import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { LDCT_FILTER_OPTIONS, ldctFilterResponse, ldctFilterResponsePoints } from '../src/game/ldct-filter-response.ts'
import { createLdctLabState, createLdctRecord, labStateValid, isValidLdctRecord } from '../src/game/ldct-experiments.ts'
import { LDCT_PROJECTION_FRAME_KEYS } from '../src/game/ldct-projections.ts'

for (const f of [-1, -.5, 0, .5, 1]) assert.equal(ldctFilterResponse('none', f), 1, 'None must be the flat TOTAL response, not Ramp')
assert.equal(ldctFilterResponse('none', 1.1), 0)
assert.equal(ldctFilterResponse('ramp', 0), 0)
assert.equal(ldctFilterResponse('ramp', .5), .5)
assert.equal(ldctFilterResponse('ramp', 1), 1)
assert(Math.abs(ldctFilterResponse('shepp-logan', 1) - 2 / Math.PI) < 1e-12)
assert(Math.abs(ldctFilterResponse('cosine', 1)) < 1e-12)
assert(Math.abs(ldctFilterResponse('hamming', 1) - .08) < 1e-12)
assert.equal(ldctFilterResponse('hann', 1), 0)
for (const filter of LDCT_FILTER_OPTIONS) {
  for (const f of [-.9, -.25, 0, .25, .9]) {
    assert.equal(ldctFilterResponse(filter, f), ldctFilterResponse(filter, -f))
    assert(ldctFilterResponse(filter, f) >= 0 && ldctFilterResponse(filter, f) <= 1)
  }
  assert(ldctFilterResponsePoints(filter).every(p => Number.isFinite(p.gain)))
  for (const signal of ['low', 'medium', 'high']) assert(LDCT_PROJECTION_FRAME_KEYS.includes(`fbp:${signal}:${filter}`))
  const draft = { ...createLdctLabState(3), filter, seenFilters: ['ramp', 'hann', filter] }
  assert(labStateValid(draft, 3), `${filter} should not force a save reset`)
  assert(isValidLdctRecord(createLdctRecord(draft, 3, 'different'), 3))
}
if (process.env.LDCT_PROJECTION_METADATA) {
  const metadata = JSON.parse(readFileSync(process.env.LDCT_PROJECTION_METADATA, 'utf8'))
  assert(metadata.none_full_phantom_window[1] > metadata.display_window[1], 'Unfiltered BP uses separately disclosed amplitude normalization')
  for (const signal of ['low', 'medium', 'high']) {
    const hashes = LDCT_FILTER_OPTIONS.map(filter => metadata.metrics[`fbp:${signal}:${filter}`].projection_hash)
    assert.equal(new Set(hashes).size, 1, 'None and every FBP option must consume the same full-phantom projections')
    assert.notEqual(metadata.frames.find(f => f.key === `fbp:${signal}:none`).numeric_hash,
      metadata.frames.find(f => f.key === 'bp:160').numeric_hash, 'Do not substitute the three-insert BP image')
  }
}
// Display-only revisions must not invalidate the author's existing short-story records.
for (const dataset of ['phantom', 'face', 'nut']) {
  const draft = { ...createLdctLabState(3), filter: 'none', seenFilters: ['ramp', 'none'] }
  const current = createLdctRecord(draft, 3, 'different', dataset)
  assert.equal(current.sourceVersion, 'ldct-short-v2-display')
  const oldRecord = { ...current, sourceVersion: 'ldct-short-v1' }
  assert(isValidLdctRecord(oldRecord, 3), 'v1 record remains valid without relabelling its source')
  assert(labStateValid({ ...draft, saved: oldRecord }, 3), 'saved v1 controls survive this media update')
}
console.log('LDCT filter responses: flat None vs Ramp, six actual options, same projections, legacy filter saves passed.')
