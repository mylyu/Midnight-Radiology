import { LDCT_STRUCTURES, detectorPosition, ldctScannerGeometry, type LdctStructureId } from '../game/ldct-projections'

/** SVG is intentionally light: rotating equipment and the sinogram use the same persisted angle. */
export function LdctScannerGeometry({ angle, structure }: { angle: number; structure: LdctStructureId | null }) {
  const point = LDCT_STRUCTURES.find(item => item.id === structure)
  const geometry = ldctScannerGeometry(angle, structure)
  const color = point?.color ?? '#94a3b8'
  return <aside className="ldct-scanner" aria-label="球管与探测器角度示意" data-angle={angle} data-detector-position={structure ? detectorPosition(structure, angle) : undefined}>
    <div className="ldct-scanner__picture">
      <svg viewBox="0 0 260 260" role="img" aria-label={`从机架正面看，当前${Math.round(angle)}度，球管和探测器绕固定小结构转动`}>
        <circle cx="130" cy="130" r="101" fill="#0b1524" stroke="#344457" strokeWidth="15" />
        <circle cx="130" cy="130" r="91" fill="none" stroke="#506176" strokeWidth="1" />
        <path d="M 130 14 A 116 116 0 0 0 14 130" fill="none" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 5" />
        <text x="130" y="12" textAnchor="middle" fill="#a3b3c8" fontSize="14">0°</text>
        <text x="3" y="145" fill="#a3b3c8" fontSize="14">90°</text>
        <g transform={`rotate(${-angle} 130 130)`}>
          {[-42, -28, -14, 0, 14, 28, 42].map(offset => <line key={offset} x1={130 + offset} y1="66" x2={130 + offset} y2="208" stroke="#e8ba6445" strokeWidth="1" />)}
          <path d="M 122 80 L 130 90 L 138 80" fill="none" stroke="#f5bf65" strokeWidth="2" />
          <rect x="113" y="22" width="34" height="24" rx="5" fill="#aa6c2b" stroke="#f5bf65" strokeWidth="2" />
          <path d="M 122 46 L 122 52 L 138 52 L 138 46" fill="#f5bf65" />
          <rect x="74" y="202" width="112" height="13" rx="3" fill="#1b4b58" stroke="#67e8f9" strokeWidth="2" />
          {Array.from({ length: 13 }, (_, i) => <line key={i} x1={78 + i * 8.5} y1="205" x2={78 + i * 8.5} y2="212" stroke="#63b3bf" strokeWidth="1" />)}
          <text x="64" y="213" fill="#94a3b8" fontSize="10" textAnchor="end">0</text>
          <text x="195" y="213" fill="#94a3b8" fontSize="10">100</text>
        </g>
        <circle cx="130" cy="130" r="51" fill="#17233699" stroke="#64748b" strokeWidth="1" strokeDasharray="3 3" />
        {point && <line x1={130 + point.x - 50 - geometry.beam.x * 45} y1={130 + point.y - 50 - geometry.beam.y * 45}
          x2={geometry.hit.x} y2={geometry.hit.y} stroke={color} strokeWidth="2" strokeDasharray="3 2" />}
        {LDCT_STRUCTURES.map(item => <circle key={item.id} cx={130 + item.x - 50} cy={130 + item.y - 50} r={item.radius}
          fill={item.color} opacity={item.id === structure ? 1 : .45} stroke={item.id === structure ? '#f8fafc' : 'none'} strokeWidth="1.5" />)}
        {point && <circle cx={geometry.hit.x} cy={geometry.hit.y} r="4.5" fill={color} stroke="#071321" strokeWidth="1.5" />}
        <text x="130" y="246" textAnchor="middle" fill="#e2e8f0" fontSize="18">当前角度 {Math.round(angle)}°</text>
      </svg>
    </div>
    <div className="ldct-scanner__explanation">
      <strong>从机架正面看 · {Math.round(angle)}°</strong>
      <div className="ldct-scanner__legend"><span>▰ 球管</span><span>▰ 探测器（接收器）</span></div>
      <p>物体不动，球管和探测器一起转。彩色落点对应正弦图白线上的同色点。</p>
      <small>教学平行束示意；真实CT常用扇束或锥束。这里的0°表示射线从上往下。</small>
    </div>
  </aside>
}
