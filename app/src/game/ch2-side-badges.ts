import type { GameState, Step } from './types'
import { recordCh2Change } from './ch2-ledger'

export const CH2_SIDE_BADGES = {
  c2_chair_helper: { name: '椅子续命师', icon: '🔧', desc: '用元件盒紧固松动的办公椅扶手' },
  c2_brass_key: { name: '这把钥匙没白买', icon: '🗝️', desc: '用黄铜钥匙打开小铁柜，找到教具底座' },
  c2_model_demo: { name: '拆开就懂了', icon: '🧩', desc: '质控交流时亲手演示叠层教具或旋转底座' },
}

const receipts: Record<keyof typeof CH2_SIDE_BADGES, string[]> = {
  c2_chair_helper: ['c2_chair_fixed'],
  c2_brass_key: ['c2_payoff_base'],
  c2_model_demo: ['c2_payoff_model_used', 'c2_payoff_base_used'],
}

/** Award on actual use, not purchase. Both model demonstrations earn the same badge. */
export function ch2SideBadgeStep(step: Step): Step {
  const entry = Object.entries(receipts).find(([, flags]) => flags.includes(step.effect?.flag ?? ''))
  return entry ? { ...step, effect: { ...step.effect, badge: entry[0] } } : step
}

/** Old saves already have trustworthy use receipts; no replay or invented history needed. */
export function ch2SideBadgeBackfill(s: GameState): GameState {
  if (!s.dlc?.ch2) return s
  let result = s
  for (const [badge, flags] of Object.entries(receipts)) {
    if (result.badges.includes(badge) || !flags.some(flag => result.flags[flag])) continue
    result = recordCh2Change(result, { ...result, badges: [...result.badges, badge] },
      `side-badge-receipt:${badge}`, `支线使用记录补发：${CH2_SIDE_BADGES[badge as keyof typeof CH2_SIDE_BADGES].name}`)
  }
  return result
}
