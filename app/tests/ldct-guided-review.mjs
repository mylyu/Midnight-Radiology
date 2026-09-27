import assert from 'node:assert/strict'
import { LDCT_STRUCTURES, detectorPosition, ldctScannerGeometry } from '../src/game/ldct-projections.ts'
import { LDCT_FILTER_DESCRIPTIONS, LDCT_FILTER_NAMES } from '../src/game/ldct-filter-response.ts'
import { LDCT_STEPS, getLdctNode } from '../src/game/ldct.ts'

const close = (actual, expected, label) => assert(Math.abs(actual - expected) < 1e-9, `${label}: ${actual} != ${expected}`)
const dot = (a, b) => a.x * b.x + a.y * b.y
const cross = (a, b) => a.x * b.y - a.y * b.x
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y })
const center = { x: 130, y: 130 }
for (const angle of [0, 45, 90, 135]) {
  for (const point of LDCT_STRUCTURES) {
    const geometry = ldctScannerGeometry(angle, point.id)
    const position = { x: 130 + point.x - 50, y: 130 + point.y - 50 }
    close(dot(geometry.beam, geometry.detectorAxis), 0, 'detector must be perpendicular to parallel rays')
    close(dot(geometry.beam, geometry.beam), 1, 'beam unit vector')
    close(dot(geometry.detectorAxis, geometry.detectorAxis), 1, 'detector unit vector')
    close(cross(sub(geometry.detector, center), geometry.beam), 0, 'detector center follows beam')
    close(cross(sub(geometry.tube, center), geometry.beam), 0, 'tube and detector rotate together')
    assert(dot(sub(geometry.tube, center), geometry.beam) < 0, 'tube stays on source side')
    assert(dot(sub(geometry.detector, center), geometry.beam) > 0, 'detector stays opposite source')
    close(cross(sub(geometry.hit, position), geometry.beam), 0, 'selected point to hit stays on its parallel ray')
    close(dot(sub(geometry.hit, geometry.detector), geometry.beam), 0, 'hit sits on detector line')
    close(dot(sub(geometry.hit, geometry.detector), geometry.detectorAxis), detectorPosition(point.id, angle) - 50,
      'scanner hit and sinogram row must share detector coordinate')
    close(geometry.detectorOffset + 50, detectorPosition(point.id, angle), 'one persisted angle drives both displays')
  }
  const withoutSelection = ldctScannerGeometry(angle, null)
  assert.deepEqual(withoutSelection.hit, withoutSelection.detector)
}
close(ldctScannerGeometry(0, 'bead').tube.y, 34, '0 degrees tube is above')
close(ldctScannerGeometry(90, 'bead').tube.x, 34, '90 degrees tube is left')

// Check the actual strings used by the response component, not just numerical H.
assert.match(LDCT_FILTER_NAMES.ramp, /Ram-Lak.*Ramp/)
assert.match(LDCT_FILTER_DESCRIPTIONS.none, /矩形响应/)
assert.match(LDCT_FILTER_DESCRIPTIONS.none, /不做滤波.*直接反投影/)
assert.doesNotMatch(LDCT_FILTER_DESCRIPTIONS.none, /不加窗.*Ramp|Ramp.*不加窗/)

// Small staging audit: Lei remains an optional real chat, not an experiment's
// surprise co-presenter; a remote message does not put Lu in the room early.
const leiChoice = LDCT_STEPS.hub.choices.find(choice => choice.id === 'lei')
assert.equal(leiChoice.next, 'chat_lei_0')
assert.equal(leiChoice.unless, 'chat_lei')
// This staging contract applies to the opening; parts 2–4 now explicitly arrange team visits.
const leiNodes = Object.values(LDCT_STEPS).filter(node => !/^r[234]_/.test(node.id))
  .filter(node => node.speaker === 'lei' || node.sprite === 'ch2_pixel_char_lei' || node.giftPerson === 'lei')
assert(leiNodes.length > 0, 'do not remove the approved optional colleague interaction')
assert(leiNodes.every(node => node.id.startsWith('chat_lei_')), 'Lei should not appear abruptly in the main experiment route')
for (const id of ['nextday_lei_0', 'nextday_lei_1']) {
  assert.equal(LDCT_STEPS[id].sprite, null, 'messages are remote, no portrait')
  assert.equal(LDCT_STEPS[id].giftPerson, undefined, 'cannot hand a gift to a remote sender')
}
assert.match(LDCT_STEPS.nextday_lei_0.text, /发来消息/)
assert.equal(LDCT_STEPS.nextday_lei_0.next, 'nextday_lei_1')
assert.equal(LDCT_STEPS.nextday_lei_1.next, 'nextday_lei_2')
assert.match(LDCT_STEPS.nextday_lei_2.text, /上楼|进来/)
assert.equal(LDCT_STEPS.nextday_lei_2.giftPerson, 'luzhou')
for (const gender of ['m', 'f']) {
  for (const organized of [false, true]) {
    const p = { nodeId: 'nextday_lei_2', completed: organized ? ['organized'] : [] }
    const node = getLdctNode({ gender, dlc: { ldct: { ldct: p } } })
    assert.equal(node.sprite, `ch2_pixel_char_luzhou_${gender}`)
    assert.match(node.text, /上楼|进来/, 'saved-note variant still explains the arrival')
  }
}
for (const prefix of ['filter_intro_', 'after_filter_']) {
  assert(Object.values(LDCT_STEPS).filter(node => node.id.startsWith(prefix)).every(node => node.sprite === '@luzhou'))
}
console.log('LDCT guided review: four-angle scanner/sinogram alignment, Chinese unfiltered labels, optional colleague and message/arrival staging passed.')
