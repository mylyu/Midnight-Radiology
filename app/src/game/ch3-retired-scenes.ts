import type { TrilogyStep } from './trilogy-types'

/** Old saved cursors are bridges only: no former props, rewards or tasks. */
export function installCh3RetiredScenes(steps: Record<string, TrilogyStep>) {
  const range = (prefix: string, count: number) => Array.from({ length: count }, (_, i) => `${prefix}_${i}`)
  const optional: [number, string[]][] = [
    [1, range('c3_s1_probes', 3)],
    [2, [...range('c3_s2_roster', 3), ...range('c3_s2_label', 3), 'c3_s2_place_office', 'c3_s2_place_reading']],
    [3, [...range('c3_s3_tang', 3), ...range('c3_s3_cart', 3), 'c3_s3_place_corridor', 'c3_s3_place_parking']],
    [4, [...range('c3_s4_pack', 3), ...range('c3_s4_cost', 4), ...range('c3_s4_cost_end', 7),
      'c3_s4_cost_right', 'c3_s4_cost_limit', 'c3_s4_cost_mix', 'c3_s4_place_supplies']],
  ]
  for (const [shift, ids] of optional) for (const id of ids) {
    steps[id] = { speaker: 'sys', text: '你收好手边的东西，回到走廊。',
      bg: 'bg_waiting_day_v2', sprite: '', sprite2: '', next: `c3_s${shift}_hub` }
  }
  for (const id of [...range('c3_s3_mirror', 4), ...range('c3_s3_mirror_end', 4),
    ...range('c3_s3_leave_clinic', 3), 'c3_s3_mirror_check', 'c3_s3_mirror_wait',
    'c3_s3_bedside_scan', 'c3_mirror_help']) {
    steps[id] = { speaker: 'sys', text: '下午的门诊结束了，你回诊室和梅姐一起交班。',
      bg: 'bg_us_room_day', sprite: '', sprite2: '', next: 'c3_s3_xu_9' }
  }
}
