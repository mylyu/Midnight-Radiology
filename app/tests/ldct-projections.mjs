import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  LDCT_STRUCTURES, LDCT_BP_COUNTS, LDCT_ITERATIONS,
  LDCT_PROJECTION_FRAME_KEYS, LDCT_PROJECTION_ATLAS,
  LDCT_ITERATION_RESIDUAL, detectorPosition, detectorPath,
  ldctProjectionFrame, ldctProjectionFrameStyle,
} from '../src/game/ldct-projections.ts'

assert.equal(LDCT_PROJECTION_FRAME_KEYS.length, 52)
assert.equal(new Set(LDCT_PROJECTION_FRAME_KEYS).size, 52)
assert(LDCT_PROJECTION_FRAME_KEYS.length <= LDCT_PROJECTION_ATLAS.columns * LDCT_PROJECTION_ATLAS.rows)
for (const key of LDCT_PROJECTION_FRAME_KEYS) {
  const frame = ldctProjectionFrame(key)
  assert(frame.column >= 0 && frame.column < frame.columns)
  assert(frame.row >= 0 && frame.row < frame.rows)
  assert.equal(ldctProjectionFrameStyle(key).backgroundSize, '800% 700%')
}
assert.throws(() => ldctProjectionFrame('not-a-frame'))
assert.equal(ldctProjectionFrameStyle('trace:truth').backgroundPosition, '0% 0%')
for (const point of LDCT_STRUCTURES) {
  assert(Math.abs(detectorPosition(point.id, 0) - point.x) < 1e-10)
  assert(Math.abs(detectorPosition(point.id, 90) - (100 - point.y)) < 1e-10)
  assert(Math.abs(detectorPosition(point.id, 180) - (100 - point.x)) < 1e-10)
  assert(detectorPath(point.id, 45).endsWith(`25.000,${detectorPosition(point.id, 45).toFixed(3)}`))
}
for (const count of LDCT_BP_COUNTS) assert(LDCT_PROJECTION_FRAME_KEYS.includes(`bp:${count}`))
for (const count of LDCT_ITERATIONS) {
  for (const prefix of ['iteration', 'forward', 'residual']) assert(LDCT_PROJECTION_FRAME_KEYS.includes(`${prefix}:${count}`))
}
for (let i = 1; i < LDCT_ITERATIONS.length; i++) {
  assert(LDCT_ITERATION_RESIDUAL[LDCT_ITERATIONS[i]] < LDCT_ITERATION_RESIDUAL[LDCT_ITERATIONS[i - 1]])
}

// Optional generated-source audit: keeps large raw arrays outside the repo.
// LDCT_PROJECTION_METADATA points at the generator's UTF-8 JSON, not a game save.
if (process.env.LDCT_PROJECTION_METADATA) {
  const metadata = JSON.parse(readFileSync(process.env.LDCT_PROJECTION_METADATA, 'utf8'))
  assert.deepEqual(metadata.frames.map(frame => frame.key), [...LDCT_PROJECTION_FRAME_KEYS])
  for (const frame of metadata.frames) {
    assert.equal(ldctProjectionFrame(frame.key).column, frame.column)
    assert.equal(ldctProjectionFrame(frame.key).row, frame.row)
  }
  assert(metadata.structure_checks.every(check => check.maximum_centroid_error_px < .6))
  assert(metadata.atlas_bytes < 600 * 1024)
  for (const signal of ['low', 'medium', 'high']) {
    const records = ['ramp', 'shepp-logan', 'hann'].map(filter => metadata.metrics[`fbp:${signal}:${filter}`])
    assert.equal(new Set(records.map(record => record.projection_hash)).size, 1, 'Filters must share the exact measured projections')
    assert(records[2].noise_sd < records[0].noise_sd, 'Hann must actually suppress noise rather than just relabel the image')
  }
  assert(metadata.metrics['fbp:low:ramp'].noise_sd > metadata.metrics['fbp:high:ramp'].noise_sd)
  const sparseInputs = ['none', 'ramp', 'shepp-logan', 'cosine', 'hamming', 'hann']
    .map(method => metadata.metrics[`filter:sparse:${method}`].projection_hash)
  assert.equal(new Set(sparseInputs).size, 1, 'All stage-3 methods must share the sparse comparison projections')
  assert.notEqual(sparseInputs[0], metadata.metrics['fbp:high:ramp'].projection_hash, 'Do not silently mix sparse and full-body comparison images')
  assert(metadata.iterations.at(-1).image_rmse > metadata.iterations[1].image_rmse,
    'This unregularized low-signal example must not silently imply more iterations always improve truth agreement')
}
console.log('LDCT projections: frames, detector direction, actual same-projection filters and iteration audit passed.')
