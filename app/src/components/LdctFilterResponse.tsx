import {
  LDCT_FILTER_COLORS, LDCT_FILTER_DESCRIPTIONS, LDCT_FILTER_NAMES, LDCT_FILTER_OPTIONS,
  ldctFilterResponsePoints, type LdctFilter,
} from '../game/ldct-filter-response'
import './LdctFilterResponse.css'

const plot = { left: 24, right: 328, top: 17, bottom: 105 }
const x = (frequency: number) => plot.left + (frequency + 1.12) / 2.24 * (plot.right - plot.left)
const y = (gain: number) => plot.bottom - gain * (plot.bottom - plot.top)
const curve = (filter: LdctFilter) => ldctFilterResponsePoints(filter)
  .map((point, i) => `${i ? 'L' : 'M'}${x(point.frequency).toFixed(2)} ${y(point.gain).toFixed(2)}`).join(' ')

/** Deliberately displays TOTAL filter response, not a window mislabeled Ramp. */
export function LdctFilterResponse({ filter, compact = false }: { filter: LdctFilter; compact?: boolean }) {
  const [compare, setCompare] = useState(false)
  return <details className={`ldct-filter-response${compact ? ' ldct-filter-response--compact' : ''}`} data-filter-response={filter}>
    <summary><strong>查看响应曲线</strong><span>{LDCT_FILTER_NAMES[filter]}</span></summary>
    <figure>
    <figcaption><strong style={{ color: LDCT_FILTER_COLORS[filter] }}>{LDCT_FILTER_NAMES[filter]}</strong><span>总频率响应 · 归一化示意</span></figcaption>
    <svg viewBox="0 0 350 142" role="img" aria-label={`${LDCT_FILTER_NAMES[filter]}总频率响应；横轴为频率，纵轴为通过权重。${LDCT_FILTER_DESCRIPTIONS[filter]}`}>
      <path d={`M${plot.left} ${plot.top}V${plot.bottom}H${plot.right}`} className="ldct-filter-response__axis" />
      <path d={`M${plot.left} ${y(.5)}H${plot.right}M${plot.left} ${plot.top}H${plot.right}M${x(0)} ${plot.top}V${plot.bottom}`} className="ldct-filter-response__grid" />
      <text x="17" y={plot.top + 4} textAnchor="end">1</text><text x="17" y={plot.bottom + 4} textAnchor="end">0</text>
      {compare && LDCT_FILTER_OPTIONS.filter(option => option !== filter).map(option => <path key={option} d={curve(option)} fill="none" stroke={LDCT_FILTER_COLORS[option]} strokeWidth="1" opacity=".45" />)}
      <path d={curve(filter)} fill="none" stroke={LDCT_FILTER_COLORS[filter]} strokeWidth="2.6" strokeLinejoin="round" />
      <text x={x(-1)} y="122" textAnchor="middle">高频</text><text x={x(0)} y="122" textAnchor="middle">0 · 低频</text><text x={x(1)} y="122" textAnchor="middle">高频</text>
      <text x="346" y="13" textAnchor="end">通过权重</text><text x="346" y="139" textAnchor="end">频率 →</text>
    </svg>
    {compare && <div className="ldct-filter-response__legend">{LDCT_FILTER_OPTIONS.map(option => <span key={option} className={option === filter ? 'is-current' : ''} style={{ color: LDCT_FILTER_COLORS[option] }}><i />{LDCT_FILTER_NAMES[option]}</span>)}</div>}
    <p>{LDCT_FILTER_DESCRIPTIONS[filter]}</p>
    <button type="button" className="ldct-filter-response__compare" aria-pressed={compare} onClick={() => { setCompare(!compare); void playSfx('click') }}>{compare ? '只看当前曲线' : '叠加其他曲线对照'}</button>
    </figure>
  </details>
}
import { useState } from 'react'
import { playSfx } from '../game/store'
