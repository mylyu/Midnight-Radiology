/** Small MRI teaching calculations. These are not a scanner/clinical protocol.
 * Course basis: MRI physics 2 pp24–32, sequences pp17–21, encoding pp38–44,
 * advanced pp34–49/58. Same object and fixed grayscale throughout comparisons.
 */
export const MRI_GRID = 64
export const MRI_B0_T = 3
export const MRI_GAMMA_HZ_T = 42.58e6
export interface MriComplexField { size: number; real: Float64Array; imag: Float64Array }
export type MriSampling = 'full' | 'center' | 'edge' | 'r2' | 'r4'
export const mriControl = (v: number, fallback = 50) => Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : fallback

/** In-place one-dimensional radix-2 transform; inverse includes 1/N scaling. */
function fftLine(real: Float64Array, imag: Float64Array, inverse: boolean) {
  const n = real.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) { [real[i], real[j]] = [real[j], real[i]]; [imag[i], imag[j]] = [imag[j], imag[i]] }
  }
  for (let length = 2; length <= n; length <<= 1) {
    const angle = (inverse ? 2 : -2) * Math.PI / length
    const wr = Math.cos(angle), wi = Math.sin(angle)
    for (let start = 0; start < n; start += length) {
      let ur = 1, ui = 0
      for (let i = 0; i < length / 2; i++) {
        const a = start + i, b = a + length / 2
        const vr = real[b] * ur - imag[b] * ui, vi = real[b] * ui + imag[b] * ur
        real[b] = real[a] - vr; imag[b] = imag[a] - vi
        real[a] += vr; imag[a] += vi
        const next = ur * wr - ui * wi
        ui = ur * wi + ui * wr; ur = next
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) { real[i] /= n; imag[i] /= n }
}

/** Separably transform rows/columns, preserving the input and complex phase. */
export function mriFft2(input: MriComplexField, inverse = false): MriComplexField {
  const n = input.size
  if (n < 2 || (n & (n - 1)) !== 0 || input.real.length !== n * n || input.imag.length !== n * n) throw new Error('MRI FFT requires a square power-of-two complex field')
  const real = new Float64Array(input.real), imag = new Float64Array(input.imag)
  const rowR = new Float64Array(n), rowI = new Float64Array(n)
  for (let y = 0; y < n; y++) {
    rowR.set(real.subarray(y * n, (y + 1) * n)); rowI.set(imag.subarray(y * n, (y + 1) * n))
    fftLine(rowR, rowI, inverse); real.set(rowR, y * n); imag.set(rowI, y * n)
  }
  for (let x = 0; x < n; x++) {
    for (let y = 0; y < n; y++) { rowR[y] = real[y * n + x]; rowI[y] = imag[y * n + x] }
    fftLine(rowR, rowI, inverse)
    for (let y = 0; y < n; y++) { real[y * n + x] = rowR[y]; imag[y * n + x] = rowI[y] }
  }
  return { size: n, real, imag }
}

/** Authored digital sample: two inclusions, body boundary and three fine bars. */
export function mriPhantom(size = MRI_GRID): MriComplexField {
  const real = new Float64Array(size * size), imag = new Float64Array(size * size)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const px = (x + .5) / size - .5, py = (y + .5) / size - .5
    const i = y * size + x
    if ((px / .43) ** 2 + (py / .40) ** 2 < 1) real[i] = .28
    if (Math.hypot(px + .19, py + .16) < .105) real[i] = .8
    if (Math.hypot(px - .18, py - .08) < .15) real[i] = 1
    if (px > -.26 && px < -.025 && [.18, .255, .33].some(line => Math.abs(py - line) < .014)) real[i] = .95
  }
  return { size, real, imag }
}
const phantom = mriPhantom()
const originalK = mriFft2(phantom)
const maxK = Math.max(...originalK.real.map((r, i) => Math.hypot(r, originalK.imag[i])))
export const MRI_KSPACE_REFERENCE_AMPLITUDE = maxK
export const mriReference = () => phantom // Read-only by convention; transformations always copy.
export const mriFrequency = (index: number, size = MRI_GRID) => index < size / 2 ? index : index - size
const rawFrequency = (frequency: number, size: number) => (frequency + size) % size

export function mriSamplingName(choice: string): MriSampling {
  const name = choice.replace(/^assisted:/, '')
  return ['center', 'edge', 'r2', 'r4'].includes(name) ? name as MriSampling : 'full'
}
export function mriMaskKspace(input: MriComplexField, pattern: MriSampling, extent = 25) {
  const n = input.size, radius = Math.round(3 + mriControl(extent) * (n / 2 - 4) / 100)
  const real = new Float64Array(n * n), imag = new Float64Array(n * n)
  let count = 0, rows = 0
  for (let y = 0; y < n; y++) {
    let rowHasSamples = false
    for (let x = 0; x < n; x++) {
      const middle = Math.abs(mriFrequency(y, n)) <= radius && Math.abs(mriFrequency(x, n)) <= radius
      const keep = pattern === 'full' || pattern === 'center' && middle || pattern === 'edge' && !middle
        || pattern === 'r2' && y % 2 === 0 || pattern === 'r4' && y % 4 === 0
      if (keep) { const i = y * n + x; real[i] = input.real[i]; imag[i] = input.imag[i]; count++; rowHasSamples = true }
    }
    if (rowHasSamples) rows++
  }
  return { kspace: { size: n, real, imag }, count, rows, radius }
}
export function mriSample(pattern: MriSampling, extent = 25) {
  const sample = mriMaskKspace(originalK, pattern, extent)
  return { ...sample, image: mriFft2(sample.kspace, true) }
}

/** Centre-out phase-row acquisition; partial state is visible from the first row. */
export function mriEncode(value: number, secondary: number) {
  const n = MRI_GRID, count = Math.max(1, Math.round(mriControl(value, 25) * (n - 1) / 100) + 1)
  const order = [0]
  for (let i = 1; i < n / 2; i++) order.push(i, -i)
  order.push(-n / 2)
  const received = new Set(order.slice(0, count).map(ky => rawFrequency(ky, n)))
  const real = new Float64Array(n * n), imag = new Float64Array(n * n)
  for (const y of received) { real.set(originalK.real.subarray(y * n, (y + 1) * n), y * n); imag.set(originalK.imag.subarray(y * n, (y + 1) * n), y * n) }
  const inspect = Math.round((mriControl(secondary) - 50) * (n / 2 - 1) / 50), row = rawFrequency(inspect, n)
  const kspace = { size: n, real, imag }
  return { kspace, image: mriFft2(kspace, true), rows: count, inspect, received: received.has(row),
    // Already acquired Fourier samples, not a clinical signal predicted from a photo.
    readoutReal: Float64Array.from({ length: n }, (_, x) => real[row * n + (x + n / 2) % n]),
    readoutImag: Float64Array.from({ length: n }, (_, x) => imag[row * n + (x + n / 2) % n]) }
}

/** A step translation after an acquisition time changes the phase of later rows.
 * Fourier translation theorem: K'(kx,ky)=K exp[-i 2pi kx dx/N].
 * Mixing pre/post-motion rows creates inconsistency; it is not an image overlay.
 */
export function mriMotion(displacement: number, onset: number) {
  const n = MRI_GRID, dx = mriControl(displacement, 25) * 8 / 100
  const start = Math.round(mriControl(onset) * n / 100)
  const real = new Float64Array(originalK.real), imag = new Float64Array(originalK.imag)
  const affected = new Set<number>()
  for (let acquisitionRow = start; acquisitionRow < n; acquisitionRow++) {
    const y = rawFrequency(acquisitionRow - n / 2, n)
    affected.add(y)
    for (let x = 0; x < n; x++) {
      const i = y * n + x, angle = -2 * Math.PI * mriFrequency(x, n) * dx / n
      const c = Math.cos(angle), s = Math.sin(angle), r = originalK.real[i], im = originalK.imag[i]
      real[i] = r * c - im * s; imag[i] = r * s + im * c
    }
  }
  const kspace = { size: n, real, imag }
  return { kspace, image: mriFft2(kspace, true), affected, dx, start }
}

export const MRI_TISSUES = [
  { name: '样品A', t1: 350, t2: 70, pd: .88, color: '#fbbf24' },
  { name: '样品B', t1: 2200, t2: 260, pd: 1, color: '#5eead4' },
] as const
export function mriSeSignal(tr: number, te: number, t1: number, t2: number, pd = 1) {
  return pd * (1 - Math.exp(-Math.max(0, tr) / t1)) * Math.exp(-Math.max(0, te) / t2)
}
export function mriContrast(value: number, secondary: number) {
  const tr = Math.round(200 + mriControl(value, 25) * 28), te = Math.round(5 + mriControl(secondary) * 1.15)
  const signals = MRI_TISSUES.map(t => mriSeSignal(tr, te, t.t1, t.t2, t.pd))
  const real = new Float64Array(phantom.real.length), imag = new Float64Array(real.length)
  for (let i = 0; i < real.length; i++) {
    const density = phantom.real[i]
    real[i] = density === .8 ? signals[0] : density === 1 ? signals[1]
      : density > 0 ? mriSeSignal(tr, te, 900, 110, density) : 0
  }
  return { tr, te, signals, image: { size: MRI_GRID, real, imag } }
}

/** Exact constant rectangular RF rotation in its rotating frame, then ideal
 * longitudinal/transverse relaxation. 250Hz B1 for 1ms gives 90° on resonance.
 * B0=3T is fixed. Offsets are in Hz, never mixed with angular-frequency units.
 */
export function mriExcitation(secondary: number) {
  const detuningHz = (mriControl(secondary) - 50) * 12
  const w1 = 2 * Math.PI * 250, dw = 2 * Math.PI * detuningHz, omega = Math.hypot(w1, dw)
  const nx = w1 / omega, nz = dw / omega, angle = omega * .001, c = Math.cos(angle)
  const mx = nx * nz * (1 - c), my = -nx * Math.sin(angle), mz = c + nz * nz * (1 - c)
  return { mx, my, mz, mxy: Math.hypot(mx, my), detuningHz, frequencyHz: MRI_GAMMA_HZ_T * MRI_B0_T + detuningHz }
}
export function mriRelaxAt(timeMs: number, excitation: ReturnType<typeof mriExcitation>, t1 = 1200, t2 = 450) {
  return { mz: 1 - (1 - excitation.mz) * Math.exp(-timeMs / t1), mxy: excitation.mxy * Math.exp(-timeMs / t2) }
}

/** Fixed 0–1 grayscale for EVERY image. No result-wise min/max stretching. */
export function mriImagePixels(image: MriComplexField) {
  const rgba = new Uint8ClampedArray(image.real.length * 4)
  for (let i = 0; i < image.real.length; i++) {
    const gray = Math.round(255 * Math.min(1, Math.hypot(image.real[i], image.imag[i])))
    rgba[i * 4] = gray; rgba[i * 4 + 1] = gray; rgba[i * 4 + 2] = gray; rgba[i * 4 + 3] = 255
  }
  return rgba
}
/** Fixed logarithmic amplitude range. Frequency origin is shifted to centre. */
export function mriKspacePixels(kspace: MriComplexField, affected?: Set<number>, inspect?: number) {
  const n = kspace.size, rgba = new Uint8ClampedArray(n * n * 4), scale = Math.log1p(maxK)
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const ky = (y + n / 2) % n, kx = (x + n / 2) % n, source = ky * n + kx, i = (y * n + x) * 4
    const gray = Math.round(255 * Math.log1p(Math.hypot(kspace.real[source], kspace.imag[source])) / scale)
    const changed = affected?.has(ky), picked = inspect !== undefined && mriFrequency(ky, n) === inspect
    rgba[i] = changed ? Math.max(55, gray) : gray
    rgba[i + 1] = picked ? Math.max(85, gray) : changed ? gray * .7 : gray
    rgba[i + 2] = changed ? gray * .35 : picked ? Math.max(95, gray) : gray
    rgba[i + 3] = 255
  }
  return rgba
}
