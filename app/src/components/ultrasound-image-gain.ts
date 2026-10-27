const control = (value: number, fallback: number) => Math.max(0, Math.min(100, Number.isFinite(value) ? value : fallback))

/** Display gain on a fixed image, not RF reconstruction or a new acquisition.
 * The top fifth is the shallow reference; compensation grows smoothly below it. */
export function ultrasoundImageGainAtDepth(depth: number, gain: number, compensation: number) {
  const fraction = Math.max(0, Math.min(1, (depth - .2) / .8))
  const depthWeight = fraction * fraction * (3 - 2 * fraction)
  const overall = (control(gain, 45) - 45) / 45
  const deep = -2.5 + 3 * control(compensation, 0) / 100
  return 2 ** (overall + depthWeight * deep)
}

/** Always reads the decoded original: repeated slider gestures cannot accumulate
 * rounding or change the location of a structure. Alpha stays untouched. */
export function applyUltrasoundImageGain(source: Uint8ClampedArray, width: number, height: number, gain: number, compensation: number) {
  const pixels = new Uint8ClampedArray(source.length)
  for (let y = 0; y < height; y++) {
    const scale = ultrasoundImageGainAtDepth(y / Math.max(1, height - 1), gain, compensation)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      pixels[i] = source[i] * scale
      pixels[i + 1] = source[i + 1] * scale
      pixels[i + 2] = source[i + 2] * scale
      pixels[i + 3] = source[i + 3]
    }
  }
  return pixels
}
