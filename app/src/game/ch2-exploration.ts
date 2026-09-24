import type { GameState, Step } from './types'

type ArchiveState = Pick<GameState, 'flags'> & Partial<Pick<GameState, 'items' | 'dlc'>>
const CABINET_RETURN = 'c2n5_key_return0'
const fifthNightClinical = /^c2n5_(m\d|n\d|child_scan|p\d|phone_break|sms_|g\d|needle_short|dawn|sunrise|ring_)/
const clearArchiveView = { sprite: '', sprite2: '', phone: '', radio: '', imageLabel: '' }

/** The cabinet opportunity ends at the clinical handoff, not at the archive handover.
 * The cursor check covers legacy saves without an applied-step ledger. */
export function ch2ArchiveExplorationClosed(s: ArchiveState): boolean {
 const p = s.dlc?.ch2
 if (!p) return false
 if (p.done || p.shift === 'c2am' || p.phase === 'quiz' || p.phase === 'done') return true
 if (p.shift === 'c2n5' && p.phase === 'settle') return true
 return fifthNightClinical.test(p.stepId ?? '') ||
  (p.appliedSteps ?? []).some(key => fifthNightClinical.test(key.replace(/^ch2-/, '')))
}

/** Separate node identities let pre-payoff saves revisit an unfinished small cabinet
 * even when the original k1/k2 nodes were already entered in an older version. */
export const CH2_ARCHIVE_RETURN_STEPS: Record<string, Step> = {
 c2n5_key_return0: { ...clearArchiveView, bg: 'bg_archive', speaker: 'sys', image: 'ch2_model_base_v1',
  text: '封条柜的交接已经办好。你回到旁边的小铁柜前，把黄铜钥匙转了两圈。柜门开了，里面放着一只带小摇柄的旋转底座。',
  sfx: 'click', effect: { flag: 'c2_payoff_base' }, next: 'c2n5_key_return1' },
 c2n5_key_return1: { ...clearArchiveView, bg: 'bg_ctcontrol', speaker: 'sys', image: 'ch2_model_base_v1',
  text: '回到控制室，你把底座放到空桌上，黄铜钥匙仍收在口袋里。', next: 'c2n5_hub' },
}

/** Only the unfinished small cabinet returns; completed archive scenes stay closed. */
export function ch2ArchiveReturnStep(id: string, step: Step, s: ArchiveState): Step {
 const f = s.flags, p = s.dlc?.ch2
 const inFifthNight = !p?.shift || p.shift === 'c2n5'
 if (id === 'c2n5_hub') {
  const allowed = inFifthNight && !ch2ArchiveExplorationClosed(s) && f.c2n5_cabinet &&
   !f.c2_payoff_base && s.items?.includes('key')
  const existing = step.choices ?? []
  if (!allowed && !existing.some(choice => choice.next === CABINET_RETURN)) return step
  const choices = existing.filter(choice => choice.next !== CABINET_RETURN)
  if (allowed) {
   const archiveIndex = choices.findIndex(choice => choice.next === 'c2n5_a1')
   choices.splice(archiveIndex + 1, 0, {
    text: '【不耗行动力】回旧片库 · 用黄铜钥匙开小铁柜', next: CABINET_RETURN,
    cond: { flag: 'c2n5_cabinet', item: 'key', notFlag: 'c2_payoff_base' }, tag: 'good',
   })
  }
  return { ...step, choices }
 }
 if (id !== CABINET_RETURN && id !== 'c2n5_key_return1') return step
 if (!inFifthNight || ch2ArchiveExplorationClosed(s)) return {
  ...clearArchiveView, speaker: 'sys', image: '', text: '这会儿先接着眼前的值守。',
  next: p?.stepId && p.stepId !== id ? p.stepId : 'c2n5_m0',
 }
 if (!f.c2n5_cabinet || id === CABINET_RETURN && !s.items?.includes('key') && !f.c2_payoff_base) return {
  ...clearArchiveView, bg: 'bg_archive', speaker: 'sys', image: '',
  text: f.c2n5_cabinet ? '小铁柜还锁着。你摸了摸口袋，先回控制室。' : '封条柜的交接还没办好，先回去找老周。', next: 'c2n5_hub',
 }
 if (id === 'c2n5_key_return1' && !f.c2_payoff_base) return {
  ...clearArchiveView, bg: 'bg_archive', speaker: 'sys', image: '', text: '你带上旧片库的门，先回控制室。', next: 'c2n5_hub',
 }
 if (id === 'c2n5_key_return1' && f.c2_payoff_model) return { ...step, image: 'ch2_slice_model_assembled_v1',
  text: '回到控制室，你把底座卡在借来的木盒下面。慢慢摇一下，透明片连出的弯管也跟着转了过来。试好后，你把教具放回桌上。' }
 return step
}

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
