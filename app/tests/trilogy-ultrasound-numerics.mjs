// Fixed-source, fixed-window checks for the two ultrasound teaching displays.
import assert from 'node:assert/strict'
import { US_RESOLUTION_TARGETS, ultrasoundResolutionSignal as signal,
  ultrasoundResolutionFrame, ultrasoundResolutionWidths, ultrasoundEcho } from '../src/game/trilogy-ultrasound-numerics.ts'
import { renderUltrasoundPhantom } from '../src/components/UltrasoundPhantom.tsx'
import { trilogyToolDefaults } from '../src/game/trilogy-tool-defaults.ts'

const targets = structuredClone(US_RESOLUTION_TARGETS)
assert(signal(-10, 0, 0, 100) > signal(-10, 2.4, 0, 100), 'Long pulse merges the axial pair into one peak')
assert(signal(-10, 0, 100, 100) < signal(-10, 2.4, 100, 100) * .01, 'Short pulse separates the same axial pair')
assert(signal(10, 0, 100, 0) > signal(7.6, 0, 100, 0), 'Wide beam merges the lateral pair')
assert(signal(10, 0, 100, 100) < signal(7.6, 0, 100, 100) * .01, 'Narrow beam separates the same lateral pair')
assert.deepEqual(US_RESOLUTION_TARGETS, targets, 'The source never moves when controls change')
assert.equal(ultrasoundResolutionWidths(0, 100).lateral, ultrasoundResolutionWidths(100, 100).lateral)
assert.equal(ultrasoundResolutionWidths(100, 0).axial, ultrasoundResolutionWidths(100, 100).axial)
assert.deepEqual(ultrasoundResolutionFrame(20, 70).pixels, ultrasoundResolutionFrame(20, 70).pixels, 'Repeat rendering keeps field texture and gray scale')
const near = ultrasoundEcho(0, 50), far = ultrasoundEcho(100, 50), weak = ultrasoundEcho(0, 0)
assert(far.roundTripUs > near.roundTripUs)
assert(Math.abs(far.roundTripUs / near.roundTripUs - far.depthMm / near.depthMm) < 1e-12)
assert.equal(near.amplitude, far.amplitude, 'Depth control does not secretly change reflectivity')
assert.equal(weak.roundTripUs, near.roundTripUs, 'Amplitude control does not move the echo')
assert(weak.amplitude < near.amplitude)
assert.deepEqual(ultrasoundResolutionWidths(NaN, Infinity), ultrasoundResolutionWidths(50, 50))
const object = { position: 50, gain: 50, depth: 65, probe: '凸阵' }
const sparse = renderUltrasoundPhantom({ ...object, scanLines: 64 }, 384, 288)
const dense = renderUltrasoundPhantom({ ...object, scanLines: 256 }, 384, 288)
assert.deepEqual(sparse.geometry, dense.geometry, 'Sampling density cannot resize the viewport or field')
assert.deepEqual(sparse.params, dense.params, 'Same depth, probe and object position for both line counts')
assert.notDeepEqual(sparse.pixels, dense.pixels, 'Sampling fewer lines actually changes the acquired image')
assert.deepEqual(renderUltrasoundPhantom(object, 128, 96).pixels,
  renderUltrasoundPhantom({ ...object, scanLines: undefined }, 128, 96).pixels, 'Existing tasks keep default continuous sampling')
console.log('PASS ultrasound: fixed pairs, independent axial/lateral responses, fixed display, echo time and amplitude')

const defaults = trilogyToolDefaults({ kind: 'ultrasound', task: 'tgc' })
assert.equal(defaults.secondary, 0, 'Fresh TGC starts uncompensated; it must not pre-solve the exercise')
const tgcInput = { position: 50, gain: defaults.value, depth: 90, probe: '凸阵', depthLossDb: 24 }
const dark = renderUltrasoundPhantom({ ...tgcInput, tgc: 0 })
const restored = renderUltrasoundPhantom({ ...tgcInput, tgc: 24 })
const mean = (frame, x0, y0, width, height) => {
  let total = 0
  for (let y = y0; y < y0 + height; y++) for (let x = x0; x < x0 + width; x++) total += frame.pixels[(y * frame.width + x) * 4]
  return total / (width * height)
}
assert(mean(dark, 190, 285, 40, 25) < mean(dark, 190, 85, 40, 25) * .4, 'Deep tissue visibly fades before compensation')
assert(mean(restored, 190, 285, 40, 25) > mean(dark, 190, 285, 40, 25) + 50, 'TGC restores the same deep scatterers')
assert.deepEqual(dark.geometry, restored.geometry)
assert.deepEqual(renderUltrasoundPhantom(object).pixels, renderUltrasoundPhantom({ ...object, depthLossDb: 0 }).pixels,
  'Extra attenuation is scoped to TGC; other exercises keep their original images')
console.log('PASS TGC: dark start, same-source compensation, other task rendering unchanged')
