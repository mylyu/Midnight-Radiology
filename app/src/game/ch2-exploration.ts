import type { GameState } from './types'

// Compatibility only: rejected free-revisit scenes must never appear in menus.
// Resume existing saves at their original hub without replaying the shift intro.
export const LEGACY_EXPLORATION_HUBS: Readonly<Record<string, string>> = {
 c2n1_visit_old: 'c2n1_hub',
 c2n1_visit_vendor: 'c2n1_hub',
 c2n1_visit_corridor: 'c2n1_hub',
 c2n1_visit_tea: 'c2n1_hub',
 c2n3_visit_corridor: 'c2n3_hub',
 c2n3_visit_desk: 'c2n3_hub',
 c2n3_visit_break: 'c2n3_hub',
 c2n3_visit_notes: 'c2n3_hub',
 c2n5_visit_archive: 'c2n5_hub',
 c2n5_visit_break: 'c2n5_hub',
 c2n5_visit_equipment: 'c2n5_hub',
}

export function originalCh2Step(id: string): string {
 if (Object.hasOwn(LEGACY_EXPLORATION_HUBS, id)) return LEGACY_EXPLORATION_HUBS[id]
 return Object.hasOwn(CH2_DEFERRED_STEPS, id) ? CH2_DEFERRED_STEPS[id] : id
}

// Author deferred these scenes on 2026-09-21. Resume beyond the removed arc;
// never replay its rewards, clear historical collections or restart the shift.
export const CH2_DEFERRED_STEPS: Readonly<Record<string, string>> = {
 c2d2_n0: 'c2d2_p1',
 c2d2_n1: 'c2d2_p1',
 c2d2_n2: 'c2d2_p1',
 c2d2_n3: 'c2d2_p1',
 c2d2_n4: 'c2d2_p1',
 c2d2_n5: 'c2d2_p1',
 c2d2_n6: 'c2d2_p1',
 c2d2_n7: 'c2d2_p1',
 c2d2_n8: 'c2d2_p1',
 c2d2_n9: 'c2d2_p1',
 c2d2_n10: 'c2d2_p1',
 c2d2_n11: 'c2d2_p1',
 c2d2_n12: 'c2d2_p1',
 c2d2_n13: 'c2d2_p1',
 c2d2_14a: 'c2d2_p1',
 c2d2_15a: 'c2d2_p1',
 c2d2_16a: 'c2d2_p1',
 c2d2_14b: 'c2d2_p1',
 c2d2_14c: 'c2d2_p1',
 c2d2_n17: 'c2d2_p1',
 c2n5_ring_trigger: 'c2n5_n6',
 c2n5_ring_scan: 'c2n5_n6',
 c2n5_r0: 'c2n5_n6',
 c2n5_r1: 'c2n5_n6',
 c2n5_r2a: 'c2n5_n6',
 c2n5_r2b: 'c2n5_n6',
 c2n5_r2c: 'c2n5_n6',
 c2n5_r3: 'c2n5_n6',
 c2n5_p2b: 'c2n5_phone_break',
 c2n5_p2c: 'c2n5_phone_break',
 c2n5_p2d: 'c2n5_phone_break',
 c2am_7: 'c2am_8',
}

/** A new run resets only CT run-local flags; cross-chapter relationships,
 * historical cards/badges, possessions and first-chapter branches are retained. */
export function restartCh2(s: GameState): GameState {
 // phantom_log is now historical evidence with no live earning path; retain it.
 const local=new Set(['quiz2_grade','day_shift','queue_wait','data_audit','data_support','data_oppose','data_hook','audit_evidence','luzhou_formal','luzhou_wait','luzhou_gray','maintenance_draft','remote_proposal','ch2_registration_resolved','old_register','nameless_films','ai_hook','dose_explained','zhou_handover','term_checked'])
 return {...s,ap:0,flags:Object.fromEntries(Object.entries(s.flags).filter(([key])=>!/^c2|^heard2_/.test(key)&&!local.has(key))),
  dlc:{...(s.dlc??{}),ch2:{}}}
}
