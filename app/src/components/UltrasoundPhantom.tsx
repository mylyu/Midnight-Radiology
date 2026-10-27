/* eslint-disable react-refresh/only-export-components -- The deterministic renderer is also an independent test surface. */
import { useEffect, useRef } from 'react'

export interface UltrasoundPhantomProps {
  /** All controls use the same 0–100 range as the chapter tool state. */
  position: number
  gain: number
  depth: number
  probe: string
  /** Depth compensation in dB at the bottom of the field; default preserves old views. */
  tgc?: number
  /** Additional round-trip envelope loss at the field bottom for the TGC exercise. */
  depthLossDb?: number
  /** Optional acquisition line count; does not resize the image or field of view. */
  scanLines?: number
}

type ProbeKind = 'linear' | 'convex' | 'phased'
interface ProbeProfile {
  kind: ProbeKind
  label: string
  radius: number
  halfAngle: number
  frequency: number
  lateralPSF: number
  axialPSF: number
}

const profiles: Record<ProbeKind, ProbeProfile> = {
  linear: { kind: 'linear', label: '线阵', radius: 0, halfAngle: 0, frequency: 8, lateralPSF: .36, axialPSF: .16 },
  convex: { kind: 'convex', label: '凸阵', radius: 28, halfAngle: .56, frequency: 3.5, lateralPSF: .60, axialPSF: .30 },
  phased: { kind: 'phased', label: '相控阵', radius: 0, halfAngle: .68, frequency: 2.5, lateralPSF: .76, axialPSF: .39 },
}

/** Authored in millimetres, not screen pixels. Every setting samples this same object. */
export const ULTRASOUND_PHANTOM = {
  seed: 0x6a09e667,
  cavities: [{ x: 0, z: 29, radius: 7 }, { x: -23, z: 18, radius: 4.5 }],
  softTarget: { x: 23, z: 23, radius: 5 },
  reflector: { x: 17, z: 47, radius: 2.8 },
  wires: [{ x: -9, z: 56 }, { x: 0, z: 56 }, { x: 9, z: 56 }, { x: 0, z: 68 }, { x: 0, z: 79 }],
  filaments: [{ x1: -10, z1: 10, x2: 10, z2: 10 }, { x1: -32, z1: 43, x2: -20, z2: 58 }],
} as const

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const finiteControl = (value: number) => Number.isFinite(value) ? clamp(value, 0, 100) : 50

export function ultrasoundParameters(input: UltrasoundPhantomProps) {
  const name = input.probe.toLowerCase()
  const kind: ProbeKind = name === '线阵' || name === 'linear' ? 'linear'
    : name === '相控阵' || name === 'phased' ? 'phased' : 'convex'
  return {
    probe: profiles[kind],
    positionMm: (finiteControl(input.position) - 50) * .64,
    gainDb: (finiteControl(input.gain) - 50) * .64,
    depthMm: 20 + finiteControl(input.depth) * .7,
  }
}

function noiseHash(value: number) {
  let n = (value ^ ULTRASOUND_PHANTOM.seed) >>> 0
  n = Math.imul(n ^ n >>> 16, 0x7feb352d)
  n = Math.imul(n ^ n >>> 15, 0x846ca68b)
  return ((n ^ n >>> 16) >>> 0) / 0x100000000
}

function segmentDistance(x: number, z: number, line: typeof ULTRASOUND_PHANTOM.filaments[number]) {
  const dx = line.x2 - line.x1, dz = line.z2 - line.z1
  const t = clamp(((x - line.x1) * dx + (z - line.z1) * dz) / (dx * dx + dz * dz), 0, 1)
  return Math.hypot(x - line.x1 - t * dx, z - line.z1 - t * dz)
}

// A fixed sub-millimetre scatterer lattice. Two signed quadratures approximate
// coherent backscatter; envelope magnitude is taken AFTER the small spatial PSF.
// This is an authored B-mode forward illustration, not full-wave propagation,
// patient data, beamformer validation, or filtering a pre-existing bitmap.
const lattice = { left: -90, top: -12, spacing: .28, columns: 644, rows: 444 }
let scatterers: { real: Float32Array; imag: Float32Array } | undefined

function sourceField() {
  if (scatterers) return scatterers
  const count = lattice.columns * lattice.rows
  const real = new Float32Array(count), imag = new Float32Array(count)
  for (let row = 0; row < lattice.rows; row++) {
    const z = lattice.top + row * lattice.spacing
    for (let col = 0; col < lattice.columns; col++) {
      const x = lattice.left + col * lattice.spacing, index = row * lattice.columns + col
      let strength = .72, coherent = 0
      for (const cavity of ULTRASOUND_PHANTOM.cavities) {
        const distance = Math.hypot(x - cavity.x, z - cavity.z)
        if (distance < cavity.radius) strength *= .007
        if (Math.abs(distance - cavity.radius) < .22) coherent += .6
      }
      const soft = ULTRASOUND_PHANTOM.softTarget
      if (Math.hypot(x - soft.x, z - soft.z) < soft.radius) strength *= .27
      const hard = ULTRASOUND_PHANTOM.reflector
      if (Math.hypot(x - hard.x, z - hard.z) < hard.radius) { strength *= 2.2; coherent += .8 }
      for (const wire of ULTRASOUND_PHANTOM.wires) {
        const squared = (x - wire.x) ** 2 + (z - wire.z) ** 2
        coherent += 7 * Math.exp(-squared / .09)
      }
      for (const line of ULTRASOUND_PHANTOM.filaments) {
        const distance = segmentDistance(x, z, line)
        coherent += 1.9 * Math.exp(-distance * distance / .055)
      }
      // A thin front-wall echo gives the target depth a visible reference.
      coherent += 1.5 * Math.exp(-((z - 1.3) ** 2) / .045)
      const amplitude = Math.sqrt(-2 * Math.log(Math.max(1e-8, noiseHash(index * 2 + 1))))
      const phase = noiseHash(index * 2 + 2) * Math.PI * 2
      real[index] = strength * amplitude * Math.cos(phase) + coherent
      imag[index] = strength * amplitude * Math.sin(phase)
    }
  }
  scatterers = { real, imag }
  return scatterers
}

function sampleLattice(field: Float32Array, x: number, z: number) {
  const fx = (x - lattice.left) / lattice.spacing, fz = (z - lattice.top) / lattice.spacing
  const ix = Math.floor(fx), iz = Math.floor(fz)
  if (ix < 0 || iz < 0 || ix >= lattice.columns - 1 || iz >= lattice.rows - 1) return 0
  const u = fx - ix, v = fz - iz, i = iz * lattice.columns + ix
  return (field[i] * (1 - u) + field[i + 1] * u) * (1 - v)
    + (field[i + lattice.columns] * (1 - u) + field[i + lattice.columns + 1] * u) * v
}

/** Origin-relative ray geometry, used by both scan conversion and shadowing. */
export function ultrasoundRay(input: UltrasoundPhantomProps, localX: number, z: number) {
  const p = ultrasoundParameters(input), profile = p.probe
  if (profile.kind === 'linear') {
    if (Math.abs(localX) > 20 || z < 0 || z > p.depthMm) return undefined
    return { x: localX + p.positionMm, z, dx: 0, dz: 1, distance: z, originX: localX + p.positionMm, originZ: 0 }
  }
  const virtualZ = z + profile.radius
  const radius = Math.hypot(localX, virtualZ), angle = Math.atan2(localX, virtualZ)
  const distance = radius - profile.radius
  if (Math.abs(angle) > profile.halfAngle || distance < 0 || distance > p.depthMm) return undefined
  return { x: localX + p.positionMm, z, dx: Math.sin(angle), dz: Math.cos(angle), distance,
    originX: p.positionMm, originZ: -profile.radius }
}

/** A reflector shadows only points downstream on intersecting rays. */
export function ultrasoundTransmission(ray: NonNullable<ReturnType<typeof ultrasoundRay>>) {
  const hard = ULTRASOUND_PHANTOM.reflector
  const cx = hard.x - ray.originX, cz = hard.z - ray.originZ
  const along = cx * ray.dx + cz * ray.dz
  const offAxis = Math.abs(cx * ray.dz - cz * ray.dx)
  const pointAlong = (ray.x - ray.originX) * ray.dx + (ray.z - ray.originZ) * ray.dz
  if (along < 0 || pointAlong < along + hard.radius || offAxis >= hard.radius) return 1
  const edge = clamp((offAxis - hard.radius * .74) / (hard.radius * .26), 0, 1)
  return .055 + .945 * edge * edge
}

// Separable 3×3 Gaussian quadrature, rotated along the current beam direction.
const kernel = [-1, 0, 1].flatMap(axial => [-1, 0, 1].map(lateral => ({
  axial, lateral, weight: (axial === 0 ? 2 : 1) * (lateral === 0 ? 2 : 1) / 16,
})))

export function renderUltrasoundPhantom(input: UltrasoundPhantomProps, width = 512, height = 384) {
  const w = clamp(Math.round(width), 64, 1024), h = clamp(Math.round(height), 48, 768)
  const params = ultrasoundParameters(input), profile = params.probe, source = sourceField()
  const top = h * .135, bottom = h * .93, usableWidth = w * .87
  const minZ = profile.kind === 'convex' ? profile.radius * (Math.cos(profile.halfAngle) - 1) : 0
  const halfWidth = profile.kind === 'linear' ? 20 : (params.depthMm + profile.radius) * Math.sin(profile.halfAngle)
  const scale = Math.min(usableWidth / (2 * halfWidth), (bottom - top) / (params.depthMm - minZ))
  const centerX = w * .48, zeroY = top - minZ * scale
  const pixels = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) {
    const z = (y - zeroY) / scale
    for (let x = 0; x < w; x++) {
      const index = (y * w + x) * 4
      pixels[index] = 3; pixels[index + 1] = 7; pixels[index + 2] = 12; pixels[index + 3] = 255
      if (y < top || y > bottom || x < w * .025 || x > w * .94) continue
      const displayRay = ultrasoundRay(input, (x - centerX) / scale, z)
      if (!displayRay) continue
      let ray = displayRay
      if (input.scanLines !== undefined && Number.isFinite(input.scanLines)) {
        const lineCount = clamp(Math.round(input.scanLines), 16, 512)
        // Acquire at discrete parallel rays or fan angles, then display the
        // nearest acquired line. The probe, field and target positions stay fixed.
        if (profile.kind === 'linear') {
          const lineX = Math.round((ray.x - params.positionMm + 20) / 40 * (lineCount - 1)) / (lineCount - 1) * 40 - 20 + params.positionMm
          ray = { ...ray, x: lineX, originX: lineX }
        } else {
          const a = Math.atan2(ray.dx, ray.dz)
          const sampledAngle = Math.round((a + profile.halfAngle) / (2 * profile.halfAngle) * (lineCount - 1)) / (lineCount - 1) * 2 * profile.halfAngle - profile.halfAngle
          const dx = Math.sin(sampledAngle), dz = Math.cos(sampledAngle), radius = ray.distance + profile.radius
          ray = { ...ray, x: params.positionMm + dx * radius, z: dz * radius - profile.radius, dx, dz }
        }
      }
      const lateralSigma = profile.lateralPSF + Math.max(0, ray.distance - 22) * .006
      let real = 0, imag = 0
      for (const sample of kernel) {
        const axial = sample.axial * profile.axialPSF, lateral = sample.lateral * lateralSigma
        const sx = ray.x + axial * ray.dx + lateral * ray.dz
        const sz = ray.z + axial * ray.dz - lateral * ray.dx
        real += sampleLattice(source.real, sx, sz) * sample.weight
        imag += sampleLattice(source.imag, sx, sz) * sample.weight
      }
      const attenuation = Math.exp(-ray.distance * (.004 + profile.frequency * .001))
      const envelope = Math.hypot(real, imag) * attenuation * ultrasoundTransmission(ray)
      const db = 20 * Math.log10(Math.max(.00005, envelope)) + params.gainDb - 8
        + ((input.tgc ?? 0) - (input.depthLossDb ?? 0)) * ray.distance / params.depthMm
      const gray = Math.round(255 * clamp((db + 45) / 45, 0, 1))
      pixels[index] = gray; pixels[index + 1] = gray; pixels[index + 2] = gray
    }
  }
  return { width: w, height: h, pixels, params, geometry: { centerX, zeroY, scale, halfWidth, top, bottom } }
}

export function UltrasoundPhantom(props: UltrasoundPhantomProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const { position, gain, depth, probe, tgc, depthLossDb, scanLines } = props
  useEffect(() => {
    const context = canvas.current?.getContext('2d')
    if (!context) return
    const frame = renderUltrasoundPhantom({ position, gain, depth, probe, tgc, depthLossDb, scanLines })
    context.putImageData(new ImageData(frame.pixels, frame.width, frame.height), 0, 0)
    const { params: p, geometry: g } = frame
    context.font = '12px ui-monospace, monospace'
    context.textBaseline = 'middle'
    context.textAlign = 'left'
    context.fillStyle = '#b9c9ce'
    context.fillText(`B超  ${p.probe.frequency.toFixed(1)} MHz`, 14, 15)
    context.textAlign = 'right'
    context.fillText(`${Math.round(p.depthMm)} mm  /  ${p.gainDb >= 0 ? '+' : ''}${p.gainDb.toFixed(0)} dB`, 498, 15)
    // This is a contact-position indicator, not a cursor painted onto an image.
    context.strokeStyle = '#647a84'; context.lineWidth = 2
    context.beginPath(); context.moveTo(151, 34); context.lineTo(359, 34); context.stroke()
    const marker = 255 + p.positionMm / 32 * 96
    context.fillStyle = '#72d8c3'; context.fillRect(marker - 9, 29, 18, 7)
    context.fillStyle = '#9babb5'; context.textAlign = 'left'
    context.fillText('−32', 115, 34); context.fillText('+32 mm', 367, 34)
    context.lineWidth = 1
    for (let mm = 10; mm <= p.depthMm; mm += 10) {
      const y = g.zeroY + mm * g.scale
      if (y > g.bottom + 1) continue
      context.strokeStyle = '#71828b'
      context.beginPath(); context.moveTo(480, y); context.lineTo(486, y); context.stroke()
      context.fillText(String(mm), 489, y)
    }
    context.fillStyle = '#99aeb8'; context.textAlign = 'left'
    context.fillText(`${p.probe.label} · 模体切面`, 14, 373)
    context.textAlign = 'right'
    context.fillText(`位置 ${p.positionMm >= 0 ? '+' : ''}${p.positionMm.toFixed(1)} mm`, 498, 373)
  }, [position, gain, depth, probe, tgc, depthLossDb, scanLines])
  return <canvas ref={canvas} width={512} height={384} data-ultrasound-phantom
    role="img" aria-label={`${probe}探头的教学模体B超切面，位置、深度与增益随控件变化`}
    style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', maxWidth: '100%', maxHeight: '100%' }} />
}
