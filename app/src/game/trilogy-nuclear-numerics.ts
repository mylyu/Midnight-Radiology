/** Small authored activity distribution. Geometry and display scale stay fixed
 * across projection, reconstruction and seeded counting comparisons. */
export const NUCLEAR_SIZE = 64
export function nuclearObject(size = NUCLEAR_SIZE) {
  return Float64Array.from({ length: size * size }, (_, i) => {
    const x = (i % size - size / 2) / size, y = (Math.floor(i / size) - size / 2) / size
    if ((x / .36) ** 2 + (y / .44) ** 2 > 1) return 0
    let a = .09
    if (((x + .12) / .085) ** 2 + ((y + .11) / .09) ** 2 < 1) a += .78
    if (((x - .13) / .07) ** 2 + ((y - .08) / .11) ** 2 < 1) a += .56
    if ((x / .07) ** 2 + ((y - .28) / .05) ** 2 < 1) a += .36
    return a
  })
}
export function emissionProjections(object: Float64Array, angles: number, size = NUCLEAR_SIZE) {
  const data = new Float64Array(angles * size)
  for (let a = 0; a < angles; a++) {
    const theta = a / angles * Math.PI, c = Math.cos(theta), s = Math.sin(theta)
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const u = (x - size / 2) * c + (y - size / 2) * s + size / 2, lo = Math.floor(u), fraction = u - lo
      const strength = object[y * size + x]
      if (lo >= 0 && lo < size) data[a * size + lo] += strength * (1 - fraction)
      if (lo + 1 >= 0 && lo + 1 < size) data[a * size + lo + 1] += strength * fraction
    }
  }
  return data
}
export function emissionFbp(projections: Float64Array, angles: number, size = NUCLEAR_SIZE) {
  const filtered = new Float64Array(projections.length), out = new Float64Array(size * size)
  // Discrete ramp impulse response; same detector spacing for every view.
  for (let a = 0; a < angles; a++) for (let u = 0; u < size; u++) {
    let sum = projections[a * size + u] * .25
    for (let v = 0; v < size; v++) if (Math.abs(u - v) % 2) sum -= projections[a * size + v] / (Math.PI ** 2 * (u - v) ** 2)
    filtered[a * size + u] = sum
  }
  for (let a = 0; a < angles; a++) {
    const theta = a / angles * Math.PI, c = Math.cos(theta), s = Math.sin(theta)
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const u = (x - size / 2) * c + (y - size / 2) * s + size / 2, lo = Math.floor(u), f = u - lo
      if (lo >= 0 && lo < size - 1) out[y * size + x] += (filtered[a * size + lo] * (1 - f) + filtered[a * size + lo + 1] * f) * Math.PI / angles
    }
  }
  return out
}
export function seededRandom(seed: number) {
  let v = seed >>> 0
  return () => { v ^= v << 13; v ^= v >>> 17; v ^= v << 5; return (v >>> 0) / 4294967296 }
}
function poisson(lambda: number, random: () => number) {
  const threshold = Math.exp(-lambda); let product = 1, count = 0
  do { count++; product *= Math.max(1e-12, random()) } while (product > threshold)
  return count - 1
}
const counts: Float64Array[] = []
export function accumulatedCounts(step: number) {
  const target = Math.max(1, Math.min(20, Math.round(step)))
  if (!counts.length) {
    const object = nuclearObject(), random = seededRandom(0x771102)
    let cumulative = new Float64Array(object.length)
    for (let k = 1; k <= 20; k++) {
      cumulative = Float64Array.from(cumulative, (v, i) => v + poisson(object[i] * 3, random))
      counts.push(cumulative)
    }
  }
  return { counts: counts[target - 1], image: Float64Array.from(counts[target - 1], x => x / (target * 3)), step: target }
}
export function collimatorAcceptance(angleDegrees: number, length: number, hole = 5) {
  return Math.max(0, 1 - Math.abs(Math.tan(angleDegrees * Math.PI / 180) * length) / hole)
}
