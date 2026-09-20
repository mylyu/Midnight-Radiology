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
 return Object.hasOwn(LEGACY_EXPLORATION_HUBS, id) ? LEGACY_EXPLORATION_HUBS[id] : id
}

/** A new run resets only CT run-local flags; cross-chapter relationships,
 * historical cards/badges, possessions and first-chapter branches are retained. */
export function restartCh2(s: GameState): GameState {
 const local=new Set(['day_shift','queue_wait','data_audit','data_support','data_oppose','data_hook','audit_evidence','luzhou_formal','luzhou_wait','luzhou_gray','phantom_log','maintenance_draft','remote_proposal','ch2_registration_resolved','old_register','nameless_films','ai_hook','dose_explained','zhou_handover','term_checked'])
 return {...s,ap:0,flags:Object.fromEntries(Object.entries(s.flags).filter(([key])=>!/^c2|^heard2_/.test(key)&&!local.has(key))),
  dlc:{...(s.dlc??{}),ch2:{}}}
}
