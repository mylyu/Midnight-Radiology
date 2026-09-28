import assert from 'node:assert/strict'
import {
  LDCT_CHEST_VERSION, LDCT_CHEST_LEGACY_VERSIONS, LDCT_CHEST_SEED, LDCT_CHEST_SIZE, LDCT_CHEST_WINDOW,
  LDCT_CHEST_SLICES, LDCT_CHEST_ITERATIONS, LDCT_CHEST_MEDIA_IDS,
  LDCT_CHEST_IMAGE_MEDIA_ID, LDCT_CHEST_PROJECTION_MEDIA_ID,
  LDCT_CHEST_IMAGE_KEYS, LDCT_CHEST_PROJECTION_KEYS,
  ldctChestFrame, ldctChestFrameStyle,
} from '../src/game/ldct-chest.ts'

assert.equal(LDCT_CHEST_VERSION, 'ldct-chest-open-v2')
assert.deepEqual(LDCT_CHEST_LEGACY_VERSIONS, ['ldct-chest-v1'])
assert.equal(LDCT_CHEST_SEED, 28225)
assert.equal(LDCT_CHEST_SIZE, 192)
assert.deepEqual(LDCT_CHEST_WINDOW, [0.001, 0.022])
assert.deepEqual(LDCT_CHEST_SLICES, [0, 1, 2])
assert.deepEqual(LDCT_CHEST_ITERATIONS, [0, 1, 2, 4, 8])
assert.deepEqual(LDCT_CHEST_MEDIA_IDS, [LDCT_CHEST_IMAGE_MEDIA_ID, LDCT_CHEST_PROJECTION_MEDIA_ID])
const positions = new Set()
for (const slice of LDCT_CHEST_SLICES) {
  for (const key of [...LDCT_CHEST_IMAGE_KEYS, ...LDCT_CHEST_PROJECTION_KEYS]) {
    const frame = ldctChestFrame(key, slice)
    assert.equal(frame.rows, 3)
    assert.equal(frame.row, slice)
    assert.equal(frame.columns, frame.mediaId === LDCT_CHEST_IMAGE_MEDIA_ID ? 7 : 11)
    assert.ok(frame.column >= 0 && frame.column < frame.columns)
    const position = `${frame.mediaId}:${frame.column}:${frame.row}`
    assert.ok(!positions.has(position), `Duplicated atlas tile ${position}`)
    positions.add(position)
    const style = ldctChestFrameStyle(key, slice)
    assert.equal(style.backgroundSize, `${frame.columns * 100}% 300%`)
    assert.equal(style.backgroundRepeat, 'no-repeat')
    assert.equal(style.backgroundPosition, `${frame.column / (frame.columns - 1) * 100}% ${slice / 2 * 100}%`)
  }
}
assert.equal(positions.size, 54)
assert.deepEqual(ldctChestFrame('fbp'), { mediaId: LDCT_CHEST_IMAGE_MEDIA_ID, columns: 7, rows: 3, column: 1, row: 1 })
assert.deepEqual(ldctChestFrame('iteration:4', 1), { mediaId: LDCT_CHEST_IMAGE_MEDIA_ID, columns: 7, rows: 3, column: 5, row: 1 })
assert.throws(() => ldctChestFrame('iteration:3'), /Unknown LDCT chest frame/)
assert.throws(() => ldctChestFrame('fbp', 3), /Unknown LDCT chest slice/)
assert.throws(() => ldctChestFrame('fbp', 0.5), /Unknown LDCT chest slice/)
console.log('ldct-chest: 54 unique frames; preview/default slice and atlas geometry passed')
