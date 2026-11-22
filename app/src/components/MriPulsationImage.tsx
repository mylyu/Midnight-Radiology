import { imageAsset } from '../lib/image-assets'

/** Figure 3 keeps its original anatomy. Coordinates refer to the 800×680 source. */
export function MriPulsationImage({ compact = false }: { compact?: boolean }) {
  return <svg className={compact ? 'mx-auto h-40 max-w-full' : 'w-full h-full min-h-0'}
    data-mri-pulsation-image viewBox="0 0 800 680" preserveAspectRatio="xMidYMid meet"
    role="img" aria-label="主动脉搏动伪影：黄框沿AP方向，也就是画面上下，标出主动脉及其重复鬼影">
    <image href={imageAsset('mri_real_motion_ghost_v1')} width="800" height="680" />
    <g fill="none" stroke="#fcd34d" strokeWidth="2.5" strokeLinejoin="round">
      <rect x="201" y="184" width="69" height="197" rx="5" />
      <rect x="590" y="155" width="76" height="243" rx="5" />
      <path d="M351 193V389 M345 201L351 193L357 201 M345 381L351 389L357 381" />
    </g>
    <text x="351" y="179" textAnchor="middle" fill="#fcd34d" fontSize="19" fontWeight="700">AP</text>
  </svg>
}
