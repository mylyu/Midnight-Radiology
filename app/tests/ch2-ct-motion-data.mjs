import assert from 'node:assert/strict'
import { inspectLiveImage } from './game-delivery-media.mjs'
import { readFileSync } from 'node:fs'
import { CH2_CT_MOTION, CH2_CT_GANTRY_EDGE, CH2_CT_GANTRY_CLIP, ch2CtBedPosition } from '../src/game/ch2-ct-motion.ts'

assert.deepEqual(ch2CtBedPosition(0), { travel: 0, x: 0, y: -0 })
assert.deepEqual(ch2CtBedPosition(1), { travel: 1, x: 200, y: -40 })
assert.equal(ch2CtBedPosition(0.2).travel, 0.56)
assert.equal(ch2CtBedPosition(0.72).travel, 1)
assert.deepEqual(ch2CtBedPosition(0.85), ch2CtBedPosition(0.72), 'Reconstruction never moves the table')
assert.deepEqual(ch2CtBedPosition(0.54), ch2CtBedPosition(1620 / 3000), 'The same saved elapsed time yields the same bed position')
let previous = -1
for (let i = 0; i <= 100; i++) {
  const { travel, x, y } = ch2CtBedPosition(i / 100)
  assert(travel >= previous && travel <= 1)
  assert(x >= 0 && x <= 200 && y <= 0 && y >= -40)
  assert(Math.abs(y + x * 0.2) < 1e-10, 'The bed moves on one fixed rail axis, never an arc or camera zoom')
  previous = travel
}
assert.equal(ch2CtBedPosition(-1).travel, 0)
assert.equal(ch2CtBedPosition(10).travel, 1)
assert.equal(ch2CtBedPosition(NaN).travel, 1)
assert.equal(ch2CtBedPosition(Infinity).travel, 1)
for (const [x, y] of CH2_CT_GANTRY_EDGE) {
  assert(x >= 0 && x <= CH2_CT_MOTION.width && y >= 0 && y <= CH2_CT_MOTION.height)
}
assert(CH2_CT_GANTRY_CLIP.startsWith('polygon('))
for (const key of ['room', 'bed']) {
  const live = await inspectLiveImage(`app/public/assets/${CH2_CT_MOTION[key]}.png`)
  assert.equal(live.width, CH2_CT_MOTION.width, 'Layers share an exact canvas width')
  assert.equal(live.height, CH2_CT_MOTION.height, 'Layers share an exact canvas height')
  if (key === 'bed') assert.equal(live.metadata.hasAlpha, true, 'Moving layer has an actual alpha channel')
}
const component = readFileSync('src/components/Ch2CtMotion.tsx', 'utf8')
assert.doesNotMatch(component, /setTimeout|setInterval|requestAnimationFrame|animationend|onDone|\.play\(/, 'The visual layer cannot add a second lifecycle clock or sound')
assert.doesNotMatch(component, /scale\(|rotate\(/, 'Only bed translation is permitted')
assert.match(component, /data-ct-travel/)
assert.match(component, /style=\{\{ clipPath: CH2_CT_GANTRY_CLIP \}\}/)
assert.match(component, /CH2_SCAN_ILLUSTRATION/, 'Missing layers retain a static fallback without blocking the scan')
const overlay = readFileSync('src/components/Ch2ScanOverlay.tsx', 'utf8')
assert.match(overlay, /<Ch2CtMotion progress=\{frame\.progress\} \/>/)
assert.doesNotMatch(overlay, /ch2-camera-shift/)
console.log('PASS aligned layered CT artwork; pure wall-clock-derived rail motion; fixed reconstruction position; fixed gantry clipping; no extra timer/audio/progression hook')
