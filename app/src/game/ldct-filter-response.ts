/** Normalized ideal TOTAL reconstruction responses, not window functions alone.
 * Images use scikit-image's discrete implementation; these curves explain its
 * continuous-shape counterpart, not a byte-for-byte FFT transfer measurement.
 */
export const LDCT_FILTER_OPTIONS = ['none', 'ramp', 'shepp-logan', 'cosine', 'hamming', 'hann'] as const
export type LdctFilter = typeof LDCT_FILTER_OPTIONS[number]
export const LDCT_FILTER_NAMES: Record<LdctFilter, string> = {
  none: 'None', ramp: 'Ram-Lak / Ramp', 'shepp-logan': 'Shepp–Logan', cosine: 'Cosine', hamming: 'Hamming', hann: 'Hann',
}
export const LDCT_FILTER_COLORS: Record<LdctFilter, string> = {
  none: '#f8fafc', ramp: '#fbbf24', 'shepp-logan': '#5eead4', cosine: '#60a5fa', hamming: '#f9a8d4', hann: '#c4b5fd',
}
export const LDCT_FILTER_DESCRIPTIONS: Record<LdctFilter, string> = {
  none: '矩形响应：平坦通过、不做滤波 → 直接反投影；所以仍留着那圈糊边。',
  ramp: '越靠两端的细变化，给的权重越大；细节和噪声都容易显出来。',
  'shepp-logan': '在Ramp上稍压高频，比Ramp柔一点。',
  cosine: '在Ramp上再乘余弦窗，高频端逐渐压到零。',
  hamming: '在Ramp上加Hamming窗，高频端保留一点权重。',
  hann: '在Ramp上加Hann窗，更压高频端；细节也可能变钝。',
}

/** frequency is normalized to the edge of the sampled passband, [-1, 1]. */
export function ldctFilterResponse(filter: LdctFilter, frequency: number): number {
  const f = Math.abs(frequency)
  if (!Number.isFinite(f) || f > 1) return 0
  if (filter === 'none') return 1 // Unity overall response is no filtering.
  if (f === 0) return 0
  switch (filter) {
    case 'ramp': return f
    case 'shepp-logan': return f * Math.sin(Math.PI * f / 2) / (Math.PI * f / 2)
    case 'cosine': return f * Math.cos(Math.PI * f / 2)
    case 'hamming': return f * (.54 + .46 * Math.cos(Math.PI * f))
    case 'hann': return f * (.5 + .5 * Math.cos(Math.PI * f))
  }
}

/** Include explicit passband edges, making None's rectangular response exact. */
export function ldctFilterResponsePoints(filter: LdctFilter, samples = 160): { frequency: number; gain: number }[] {
  const count = Math.max(2, Math.floor(samples))
  return [
    { frequency: -1.12, gain: 0 }, { frequency: -1, gain: 0 },
    ...Array.from({ length: count + 1 }, (_, i) => {
      const frequency = -1 + i / count * 2
      return { frequency, gain: ldctFilterResponse(filter, frequency) }
    }),
    { frequency: 1, gain: 0 }, { frequency: 1.12, gain: 0 },
  ]
}
