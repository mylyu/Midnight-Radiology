import type { MriScannerModel, MriScanRegion } from './trilogy-types'

/** Body-part coils stay independent from the three scanner rooms. The city's other 0.55T room currently activates only its illustrated head acquisition. */
export const MRI_SCAN_ART: Record<MriScannerModel, Partial<Record<MriScanRegion, string>>> = {
  'city-3t': {
    head: 'trilogy_mri_scan_acquire_v3',
    wrist: 'trilogy_mri_scan_wrist_v1',
    knee: 'trilogy_mri_scan_knee_v1',
    shoulder: 'trilogy_mri_scan_shoulder_v1',
    cervical: 'trilogy_mri_scan_cervical_v1',
    lumbar: 'trilogy_mri_scan_lumbar_v1',
    abdomen: 'trilogy_mri_scan_abdomen_v1',
  },
  'city-055-wide': {
    head: 'trilogy_mri_scan_city_wide_head_v1',
  },
  'county-055-wide': {
    head: 'trilogy_mri_scan_county_head_v1',
    wrist: 'trilogy_mri_scan_county_wrist_v1',
    knee: 'trilogy_mri_scan_county_knee_v1',
    shoulder: 'trilogy_mri_scan_county_shoulder_v1',
    cervical: 'trilogy_mri_scan_county_cervical_v1',
    lumbar: 'trilogy_mri_scan_county_lumbar_v1',
    abdomen: 'trilogy_mri_scan_county_abdomen_v1',
  },
}
