const control = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 50

/** Two fixed pairs of fine reflectors. Only the pulse/beam response changes. */
export const US_RESOLUTION_TARGETS = [
  { x: -10, z: -2.4 }, { x: -10, z: 2.4 },
  { x: 7.6, z: 0 }, { x: 12.4, z: 0 },
] as const

export function ultrasoundResolutionWidths(pulse: number, beam: number) {
  return { axial: 3.4 - control(pulse) * .028, lateral: 3.4 - control(beam) * .028 }
}

/** A Gaussian point-response illustration, not a patient/full-wave simulation.
 * Pulse duration controls the along-beam response; beam width the across-beam
 * response. Fixed target positions and a fixed display window are essential. */
export function ultrasoundResolutionSignal(x: number, z: number, pulse: number, beam: number) {
  const width = ultrasoundResolutionWidths(pulse, beam)
  return US_RESOLUTION_TARGETS.reduce((sum, target) => sum
    + Math.exp(-.5 * (((x - target.x) / width.lateral) ** 2 + ((z - target.z) / width.axial) ** 2)), 0)
}

export function ultrasoundResolutionFrame(pulse: number, beam: number, width = 400, height = 240) {
  const pixels = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4
    const px = (x / (width - 1) - .5) * 44, pz = (y / (height - 1) - .5) * 26
    // Fixed, faint field texture: not refreshed noise and not an adaptive window.
    const texture = ((Math.imul(x + 31, 73856093) ^ Math.imul(y + 7, 19349663)) >>> 0) % 31 / 3100
    const gray = Math.round(255 * Math.min(1, .72 * ultrasoundResolutionSignal(px, pz, pulse, beam) + texture))
    pixels[i] = gray; pixels[i + 1] = gray; pixels[i + 2] = gray; pixels[i + 3] = 255
  }
  return { width, height, pixels }
}

export function ultrasoundEcho(depthControl: number, strengthControl: number) {
  const depthMm = 15 + control(depthControl) * .7
  return { depthMm, roundTripUs: 2 * depthMm / 1.54, amplitude: .2 + control(strengthControl) * .008 }
}
