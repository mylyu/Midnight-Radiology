/** Presentation geometry only: the scan lifecycle still belongs to ch2-scans. */
export const CH2_CT_MOTION = {
  width: 1672,
  height: 941,
  room: 'ch2_ct_motion_room_v1',
  bed: 'ch2_ct_motion_bed_v1',
  // Follow the fixed rail axis in the approved oblique illustration. Do not scale
  // the bed, the gantry, or the room to manufacture apparent movement.
  travelX: 200,
  travelY: -40,
} as const

/** The right-hand inner bore edge. The same fixed room is painted above the bed
 * on this side of the edge so that the patient enters behind the gantry face. */
export const CH2_CT_GANTRY_EDGE: ReadonlyArray<readonly [number, number]> = [
  [1060, 0], [1060, 266], [1086, 280], [1105, 298], [1122, 325],
  [1133, 353], [1137, 383], [1134, 411], [1125, 439], [1112, 463],
  [1094, 485], [1073, 504], [1100, 575], [1100, 941], [1672, 941], [1672, 0],
]

export const CH2_CT_GANTRY_CLIP = `polygon(${CH2_CT_GANTRY_EDGE
  .map(([x, y]) => `${x / CH2_CT_MOTION.width * 100}% ${y / CH2_CT_MOTION.height * 100}%`).join(', ')})`

export function ch2CtBedPosition(progress: number) {
  const p = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 1
  // Initial positioning occupies 0.6s; the remaining travel slows during
  // acquisition. The table remains parked throughout reconstruction.
  const travel = p < 0.2 ? p / 0.2 * 0.56
    : p < 0.72 ? 0.56 + (p - 0.2) / 0.52 * 0.44 : 1
  return {
    travel,
    x: travel * CH2_CT_MOTION.travelX,
    y: travel * CH2_CT_MOTION.travelY,
  }
}
