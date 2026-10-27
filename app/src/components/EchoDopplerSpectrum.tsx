import { memo } from 'react'

const PLOT_LEFT = 64
const BASELINE = 103
const PERIOD = 126
const COLUMNS = 252

// A schematic pulsatile envelope: rapid acceleration, a rounded peak and
// slower deceleration. These normalized values are not patient measurements.
function envelope(phase: number) {
  if (phase < .1) return .06 + .94 * (phase / .1) ** 2
  if (phase < .22) return 1 - .14 * ((phase - .1) / .12) ** 2
  if (phase < .66) return .06 + .8 * (1 - (phase - .22) / .44) ** 2
  return .06
}

const columns = Array.from({ length: COLUMNS + 1 }, (_, index) => {
  const offset = index * PERIOD * 4 / COLUMNS
  return { x: PLOT_LEFT + offset, height: 77 * envelope((offset % PERIOD) / PERIOD) }
})
const outline = columns.map(({ x, height }, index) => `${index ? 'L' : 'M'}${x.toFixed(1)},${(BASELINE - height).toFixed(1)}`).join(' ')
const spectrumBands = Array.from({ length: 7 }, (_, band) => ({ opacity: .08 + band * .667 / 6, d: '' }))
columns.forEach(({ x, height }, column) => {
  for (let row = 0; row < 13; row++) {
    // Fixed integer hashing keeps the texture stable. Group its dots once,
    // avoiding thousands of SVG elements during ordinary dialogue rendering.
    const texture = ((column * 43 + row * 67 + column * row * 7) % 101) / 100
    const fraction = .16 + row * .068
    const band = Math.round(texture * (.13 + fraction * .55) / .667 * 6)
    spectrumBands[band].d += `M${x.toFixed(1)},${(BASELINE - height * fraction).toFixed(2)}h1.7v1.5h-1.7z`
  }
})

/** A compact code-drawn Doppler spectrum for the dialogue's existing image area. */
export const EchoDopplerSpectrum = memo(function EchoDopplerSpectrum() {
  return <svg className="trilogy-echo-spectrum" data-echo-spectrum viewBox="0 0 600 132" role="img" aria-label="多普勒频谱：纵向看血流速度，横向看速度随时间的搏动变化" focusable="false">
    <rect width="600" height="132" rx="8" fill="#050b11" />
    <g stroke="#334155" strokeWidth="1" fill="none">
      <path d={`M${PLOT_LEFT} 18V${BASELINE}H583`} />
      <path d="M60 25l4-7 4 7M576 99l7 4-7 4" />
      {[1, 2, 3].map(cycle => <path key={cycle} d={`M${PLOT_LEFT + PERIOD * cycle} 20V${BASELINE}`} strokeDasharray="3 5" opacity=".45" />)}
    </g>
    <path d={`${outline}L568,${BASELINE}H${PLOT_LEFT}Z`} fill="#cbd5d1" opacity=".1" />
    <g fill="#edf1db">
      {spectrumBands.map(({ opacity, d }, band) => <path key={band} d={d} opacity={opacity} />)}
    </g>
    <path d={outline} stroke="#dbe4d8" strokeWidth="1.2" strokeOpacity=".75" fill="none" />
    <g fill="#cbd5e1" fontFamily="inherit" fontSize="18">
      <text x="8" y="24">速度</text>
      <text x="507" y="126">时间 →</text>
    </g>
  </svg>
})

