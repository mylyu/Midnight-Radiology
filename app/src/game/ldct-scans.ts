import type { Ch2ScanConfig } from './ch2-scans'
import { CH2_SCAN_AUDIO, CH2_SCAN_ILLUSTRATION } from './ch2-scans'
import { CH2_CT_MOTION } from './ch2-ct-motion'

/** Only the two real acquisitions. Computer simulations never run the scanner. */
const scans: Record<string, Ch2ScanConfig> = {
  lf_phantom_scan: { id: 'lf_phantom_scan', mode: 'acquire', durationMs: 3000, presentation: 'machine',
    title: '圆柱模体 · 试扫', detail: '模体已固定，人员退出机房。采集投影，传回工作站。' },
  lf_father_scan: { id: 'lf_father_scan', mode: 'acquire', durationMs: 3000, presentation: 'dual',
    title: '陆叔 · 低剂量胸部CT', detail: '陆叔躺好，人员退出机房。按医师确认的方案采集。' },
}
export const LDCT_PHANTOM_BED = 'ldct_ct_phantom_bed_v1'
export const LDCT_SCAN_IMAGE_IDS = [CH2_CT_MOTION.room, CH2_CT_MOTION.bed, CH2_SCAN_ILLUSTRATION, LDCT_PHANTOM_BED]
export const LDCT_SCAN_AUDIO = CH2_SCAN_AUDIO.acquisition
export const LDCT_PHANTOM_MOTION = {
  bed: LDCT_PHANTOM_BED, label: '圆柱模体随检查床沿固定轨道驶入CT机架', fallback: CH2_CT_MOTION.room,
  // Static alignment of this new cutout only; translation distance/clock stay Ch2's.
  fit: 'translate(-1.794258%, 7.438895%) scale(0.82)',
}
export function getLdctScanConfig(nodeId: string, revision: number | undefined = 5): Ch2ScanConfig | undefined {
  return revision === 5 ? scans[nodeId] : undefined
}
