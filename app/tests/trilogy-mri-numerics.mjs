// A bounded numerical check; no browser or chapter walkthrough.
import assert from 'node:assert/strict'
import { mriFft2, mriPhantom, mriSample, mriMotion, mriEncode, mriExcitation,
  mriRelaxAt, mriSeSignal, mriContrast, mriImagePixels } from '../src/game/trilogy-mri-numerics.ts'
const phantom = mriPhantom(), fft = mriFft2(phantom), restored = mriFft2(fft, true)
const maxError = Math.max(...restored.real.map((v, i) => Math.abs(v - phantom.real[i])))
assert(maxError < 1e-12, 'Complex 64² FFT/iFFT restores the same object')
assert(Math.max(...restored.imag.map(Math.abs)) < 1e-12)
const full = mriSample('full'), half = mriSample('r2'), center = mriSample('center', 25), edge = mriSample('edge', 25)
assert.equal(full.count, 4096); assert.equal(half.rows, 32)
assert(center.count < full.count && edge.count + center.count === full.count)
let aliasError = 0
for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
  const expected = .5 * (phantom.real[y * 64 + x] + phantom.real[((y + 32) % 64) * 64 + x])
  aliasError = Math.max(aliasError, Math.abs(half.image.real[y * 64 + x] - expected))
}
assert(aliasError < 1e-12, 'Every-other phase row produces the actual folded object, not a photo effect')
assert.equal(mriEncode(100, 50).rows, 64)
assert(Math.max(...mriEncode(100, 50).image.real.map((v, i) => Math.abs(v - phantom.real[i]))) < 1e-12)
assert(Math.max(...mriMotion(0, 50).image.real.map((v, i) => Math.abs(v - phantom.real[i]))) < 1e-12)
const moved = mriMotion(100, 50)
assert(moved.image.real.some((v, i) => Math.abs(v - phantom.real[i]) > .01), 'Motion changes sampled phase and therefore reconstruction')
const pulse = mriExcitation(50), off = mriExcitation(100)
assert(Math.abs(pulse.mz) < 1e-12 && Math.abs(pulse.mxy - 1) < 1e-12, 'On-resonance 1ms pulse gives 90° magnetization')
assert(off.mxy < pulse.mxy, 'Off-resonance RF has a smaller transverse response')
assert(Math.abs(mriRelaxAt(1200, pulse).mz - (1 - Math.exp(-1))) < 1e-12)
assert(Math.abs(mriRelaxAt(450, pulse).mxy - Math.exp(-1)) < 1e-12)
assert(mriSeSignal(3000, 10, 350, 70) > mriSeSignal(400, 10, 350, 70), 'Longer TR restores more longitudinal signal')
assert(mriSeSignal(3000, 100, 350, 70) < mriSeSignal(3000, 10, 350, 70), 'Longer TE loses transverse signal')
assert.notDeepEqual(mriContrast(14, 5).signals, mriContrast(100, 80).signals)
const dim = { size: 2, real: new Float64Array([0, .25, .5, 1]), imag: new Float64Array(4) }
assert.equal(mriImagePixels(dim)[4], 64, 'Display retains a fixed gray scale instead of stretching each result')
console.log(JSON.stringify({ status: 'passed', grid: 64, fftRoundtripMaxError: maxError, r2AliasMaxError: aliasError,
  tested: 'FFT inverse/real phase-mask aliasing/motion/RF/T1T2/TRTE/fixed intensity scale', kind: 'numerical-not-browser' }))
