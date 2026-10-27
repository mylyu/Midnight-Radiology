import type { TrilogyStep } from './trilogy-types'

/** Explicit scene blocking: a reply does not make the other person disappear.
 * Nothing is inherited from the previously rendered node, including on resume.
 */
export function applyCh3Staging(steps: Record<string, TrilogyStep>) {
  const mei = 'char_mei', cousin = 'pat_cousin', aunt = 'pat_aunt'
  const wang = 'pat_wang_recovery', xu = 'pat_mystery', patient = 'pat_us_gallstone'
  const he = 'ch2_pixel_char_he', tang = 'char_tang', lei = 'char_lei'
  const zhou = 'char_zhou', han = 'char_han'
  const range = (prefix: string, first: number, last: number) =>
    Array.from({ length: last - first + 1 }, (_, i) => `${prefix}_${first + i}`)
  const cast = (ids: string[], left: string, right?: string) => {
    for (const id of ids) {
      const step = steps[id]
      if (!step || step.phone || step.radio || step.communication || step.closeup || step.scan || step.tool
        || /_hub$/.test(id) || step.image?.startsWith('us_')) continue
      // Stable positions within a scene, even when the protagonist is speaking.
      step.sprite = left
      step.sprite2 = right
    }
  }

  cast(['c3_intro_visit_0', ...range('c3_intro_visit', 1, 7), 'c3_intro_accept', 'c3_intro_ask'], mei)
  cast(range('c3_s1_start', 1, 5), mei)
  cast(range('c3_tang_first', 0, 3), tang)
  // The last line explicitly sends Tang to the window; do not carry her into the hub.
  cast(range('c3_s1_probes', 1, 2), mei)
  cast(range('c3_s1_tea', 0, 2), mei)
  cast(range('c3_s1_wait', 0, 2), aunt)
  cast(range('c3_s1_aunt', 0, 4), aunt, mei)
  cast(['c3_s1_aunt_5', 'c3_s1_aunt_7'], mei)
  cast(range('c3_s1_aunt', 9, 12), aunt, mei)
  cast(['c3_s1_aunt_13'], mei) // The aunt has left with her reports.
  cast(range('c3_s1_stone', 1, 4), patient, mei)
  cast(['c3_s1_shadow_good', 'c3_s1_shadow_retry', ...range('c3_s1_shadow', 0, 3)], patient, mei)
  cast(range('c3_s1_shadow', 4, 7), mei) // The patient is back with the emergency team.
  cast(range('c3_s1_gain', 0, 3), mei)
  cast(range('c3_s1_signal', 0, 3), mei)
  cast(range('c3_s1_lunch', 1, 5), he, mei)
  cast(range('c3_s1_between_patients', 0, 1), mei)

  cast(range('c3_s2_start', 2, 3), mei) // The cousin is still texting from the car.
  cast(range('c3_s2_roster', 0, 2), mei)
  cast(range('c3_s2_he', 0, 2), he)
  cast(range('c3_s2_label', 1, 2), mei)
  cast(range('c3_s2_arrive', 0, 1), cousin)
  cast(range('c3_s2_arrive', 2, 13), cousin, mei)
  cast(['c3_s2_listen', 'c3_s2_promise', ...range('c3_s2_plan', 0, 2)], cousin, mei)
  cast(range('c3_s2_plan', 3, 4), cousin) // The protagonist accompanies her to the lift.
  cast(range('c3_s2_plan', 5, 6), mei) // She has left; the practice resumes with Mei.
  cast(range('c3_s2_depth', 0, 3), mei)
  cast(range('c3_s2_pause', 0, 2), mei)
  cast(range('c3_s2_finish', 0, 2), mei)
  cast(range('c3_liver_arrive', 0, 4), 'pat_c3_young_liver_v1', mei)
  cast(range('c3_liver_explain', 2, 5), 'pat_c3_young_liver_v1', mei)
  cast(['c3_liver_explain_6'], mei) // The young patient has taken the report and left.
  cast(range('c3_tang_break', 0, 3), tang)

  cast(range('c3_s3_start', 1, 3), mei)
  cast(range('c3_s3_tang', 0, 2), tang)
  cast(range('c3_s3_cart', 0, 2), mei)
  cast(range('c3_s3_bag', 0, 2), aunt)
  cast(range('c3_s3_wang', 0, 7), wang, mei)
  cast(range('c3_s3_wang', 8, 9), wang)
  cast(range('c3_s3_motion', 0, 4), mei) // Wang has returned to cardiology.
  cast(range('c3_s3_after_wang', 0, 1), mei)
  cast(range('c3_s3_leave_clinic', 0, 2), mei) // Xu has left; Tang joins only if arranged.
  cast(range('c3_s3_waiting', 0, 5), xu)
  cast(range('c3_s3_xu', 0, 3), xu, mei)
  cast(range('c3_s3_xu', 4, 8), xu)
  cast(range('c3_s3_mirror', 0, 3), mei)
  cast(['c3_s3_mirror_check', 'c3_s3_mirror_wait', ...range('c3_s3_mirror_end', 0, 3)], mei)

  cast(range('c3_s4_start', 0, 3), mei)
  cast(range('c3_s4_clinic', 0, 2), mei)
  cast(range('c3_s4_open_clinic', 0, 2), mei)
  cast(range('c3_s4_lei', 0, 2), lei)
  cast(range('c3_s4_pack', 0, 2), mei)
  cast(range('c3_s4_cost', 0, 3), mei)
  cast(['c3_s4_cost_right', 'c3_s4_cost_limit', 'c3_s4_cost_mix', ...range('c3_s4_cost_end', 0, 1)], mei)
  cast(['c3_s4_cost_end_2'], han)
  cast(range('c3_s4_cost_end', 3, 5), han, mei)
  cast(['c3_s4_han_0', 'c3_s4_han_3', 'c3_s4_han_4'], han)
  cast(['c3_s4_han_1', 'c3_s4_han_2', 'c3_s4_han_note', 'c3_s4_han_ask',
    ...range('c3_s4_han_end', 0, 1)], han, lei)
  cast(range('c3_s4_han_end', 2, 4), lei) // Han leaves before the later phone call.
  cast(range('c3_s4_han_end', 5, 6), mei)
  cast(range('c3_s4_doppler', 0, 5), mei)

  cast(range('c3_s5_start', 0, 3), mei)
  cast(range('c3_s5_cousin_check', 0, 5), mei)
  cast(range('c3_s5_mei_farewell', 1, 2), mei)
  cast(range('c3_s5_zhou', 0, 2), zhou)
  cast(range('c3_s5_lei', 0, 2), lei)
  cast(range('c3_s5_mei', 0, 2), mei)
  cast(range('c3_s5_assess', 0, 7), mei)
  cast([...range('c3_s5_notice', 0, 4), 'c3_s5_notice_desk', 'c3_s5_notice_route',
    ...range('c3_s5_notice_end', 0, 3)], xu)
  cast(range('c3_s5_notice_end', 4, 5), mei)
  cast(range('c3_tang_return', 0, 3), tang)

  for (let shift = 1; shift <= 5; shift++) {
    cast(range(`c3_s${shift}_towel_use`, 0, 4), mei)
    cast(range(`c3_s${shift}_stickers_use`, 0, 4), mei)
  }
  cast([...range('c3_epilogue', 0, 4), 'c3_epilogue_18', 'c3_epilogue_19'], mei)
  cast([...range('c3_epilogue', 15, 17), ...range('c3_mri_selection', 0, 2)], zhou)
  cast(['c3_epilogue_14', 'c3_epilogue_20', ...range('c3_cousin_mri_wait', 0, 1)], cousin)
  // Phone/SMS sequences, unoccupied hubs, historical bridge nodes 5–13, and
  // standalone object/result shots deliberately receive no inferred cast.
}
