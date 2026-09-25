import type { Choice, DlcProgress, GameState, Step } from './types'
import { recordCh2Change } from './ch2-ledger'
import { CH2_OBSERVATIONS } from './ch2-observations'

type StatState = Pick<GameState, 'flags'> & Partial<Pick<GameState, 'skill' | 'heart' | 'wealth' | 'dlc'>>
type Interactions = NonNullable<DlcProgress['statInteractions']>

/** Method reminders have their own receipt: seeing one neither submits an
 * observation nor awards/forfeits the original independent-choice reward. */
const hints: Record<string, { id: string; text: string }> = {
  c2n1_w1ok: { id: 'fall', text: '先换着窗口看，再把两边同样的位置对一对，别只盯最亮的地方。' },
  c2d2_w1ok: { id: 'lung', text: '把前后相邻几层放在一起看，留意形状怎么接上，别只凭这一张下结论。' },
  c2d4_12a: { id: 'metal', text: '先顺着条纹找它从哪儿散开，再比较远近受影响的范围。先找规律，别急着给机器判故障。' },
}

function currentStory(s: StatState, stepId?: string): boolean {
  const p = s.dlc?.ch2
  return !!p && !p.done && (p.phase ?? 'story') === 'story' && (stepId === undefined || p.stepId === stepId)
}

function patch(s: GameState, change: Partial<Interactions>): GameState {
  return { ...s, dlc: { ...s.dlc, ch2: { ...s.dlc?.ch2,
    statInteractions: { ...s.dlc?.ch2?.statInteractions, ...change } } } }
}

/** Only an actual -1 AP entry, not a legacy cursor/flag, permits a refund. */
function paidEquipmentVisit(s: StatState): boolean {
  return !!s.dlc?.ch2?.loop?.entries.some(row =>
    row.id === 'ch2-c2n1_e1' && row.shift === 'c2n1' && row.delta.ap === -1)
}

export function ch2StatChoices(s: StatState, stepId: string): Choice[] {
  const p = s.dlc?.ch2, saved = p?.statInteractions
  if (!currentStory(s, stepId) || saved?.pending?.stepId === stepId || p?.giftReply?.stepId === stepId) return []
  const hint = hints[stepId], observation = CH2_OBSERVATIONS[stepId]
  if (hint && observation && (s.skill ?? 0) >= 8 && !saved?.seenHints?.includes(hint.id)
    && !p?.observations?.[observation.id]) {
    return [{ text: '想一想以前学过的观察方法', next: `@ch2stat:hint:${hint.id}` }]
  }
  if (stepId === 'c2n3_chat_q' && p?.shift === 'c2n3' && (s.heart ?? 0) >= 8
    && !saved?.colleagueCoffee && !s.flags.c2n3_chat_done
    && !p.loop?.entries.some(row => row.id === 'stat:coffee')) {
    return [{ text: '接过小雷递来的咖啡，歇口气', next: '@ch2stat:coffee' }]
  }
  if (stepId === 'c2n1_e2' && p?.shift === 'c2n1' && (s.wealth ?? 0) >= 3
    && !saved?.supplyOrganized && !s.flags.c2n1_e && paidEquipmentVisit(s)
    && !p.loop?.entries.some(row => row.id === 'stat:supplies')) {
    return [{ text: '先把备用线材按标签理好，一趟拿齐', next: '@ch2stat:supplies' }]
  }
  return []
}

/** Existing dialogue and safe continuations remain available at every score.
 * Observation prompts are overlaid by Ch2Screen, so it adds their hint there. */
export function ch2StatStep(id: string, step: Step, s: StatState): Step {
  if (id !== 'c2n3_chat_q' && id !== 'c2n1_e2') return step
  const extra = ch2StatChoices(s, id)
  if (!extra.length) return step
  const choices = step.choices ?? (step.next ? [{ text: '等小雷贴完，一起回去', next: step.next }] : [])
  return { ...step, choices: [...extra, ...choices] }
}

/** Save the one-time effect and reply together, before displaying its text.
 * All tokens are revalidated against the live cursor, phase and inventory-free
 * eligibility; stale/double-clicked callbacks return the same state unchanged. */
export function takeCh2StatInteraction(s: GameState, stepId: string, token: string): GameState {
  if (!ch2StatChoices(s, stepId).some(choice => choice.next === token)) return s
  const saved = s.dlc?.ch2?.statInteractions
  const pending = { stepId, token }
  const hint = hints[stepId]
  if (hint && token === `@ch2stat:hint:${hint.id}`) {
    return patch(s, { seenHints: [...(saved?.seenHints ?? []), hint.id], pending })
  }
  const coffee = token === '@ch2stat:coffee'
  const after = patch({ ...s, ap: s.ap + 1 }, { pending,
    ...(coffee ? { colleagueCoffee: true } : { supplyOrganized: true }) })
  return recordCh2Change(s, after, coffee ? 'stat:coffee' : 'stat:supplies',
    coffee ? '小雷递来咖啡 · 歇口气，行动力＋1' : '整理备用线材 · 返还本次设备间消耗的行动力', 'story')
}

export function ch2StatReply(s: StatState, stepId: string): Step | undefined {
  const pending = s.dlc?.ch2?.statInteractions?.pending
  if (!currentStory(s, stepId) || pending?.stepId !== stepId) return undefined
  const hint = hints[stepId]
  if (hint && pending.token === `@ch2stat:hint:${hint.id}`) {
    return { speaker: 'me', text: hint.text, next: '@ch2stat-return' }
  }
  if (stepId === 'c2n3_chat_q' && pending.token === '@ch2stat:coffee') {
    return { speaker: 'lei', sprite: 'char_lei',
      text: '我多冲了一杯，拿着。你先喝，我把这张表收完。', next: '@ch2stat-return' }
  }
  if (stepId === 'c2n1_e2' && pending.token === '@ch2stat:supplies') {
    return { speaker: 'sys', sprite: 'char_lei',
      text: '你把没接入设备的备用线材、标签分好格。小雷拎起盒子：「这下不用来回找了。」你们提前忙完，省下一点行动力。',
      next: '@ch2stat-return' }
  }
}

export function clearCh2StatReply(s: GameState, stepId: string): GameState {
  if (!currentStory(s, stepId) || s.dlc?.ch2?.statInteractions?.pending?.stepId !== stepId) return s
  return patch(s, { pending: undefined })
}

function enteredBefore(s: GameState, stepId: string): boolean {
  const p = s.dlc?.ch2
  return !!p?.appliedSteps?.includes(`ch2-${stepId}`)
    || !!p?.loop?.entries.some(row => row.id === `ch2-${stepId}`)
    // Old saves without entry receipts already applied their current node.
    || (p?.appliedSteps === undefined && p?.stepId === stepId)
}

/** Call on a genuinely new, non-deferred entry, after the existing step effect,
 * INCLUDING e3b (which has no original effect). Before-state guards prevent
 * retroactive rewards for already-completed old saves. Each category has its
 * own receipt, and the two ways of demonstrating the model share one reward. */
export function grantCh2WealthOnEntry(before: GameState, after: GameState, stepId: string): GameState {
  if (!currentStory(before) || !currentStory(after) || enteredBefore(before, stepId)) return after
  const p = before.dlc?.ch2
  if (p?.shift !== stepId.split('_')[0]) return after
  let category: string, label: string
  if (stepId === 'c2n1_gap_chair_fix' && before.items.includes('toolbox')
    && !before.flags.c2_chair_fixed && after.flags.c2_chair_fixed) {
    category = 'chair'; label = '元件盒派上用场 · 修好松动的办公椅'
  } else if (stepId === 'c2n5_e3b' && !before.flags.c2n5_e) {
    category = 'equipment-notes'; label = '现场核对接口与线号 · 留下可用的设备记录'
  } else if (['c2am_payoff_layers', 'c2am_payoff_rotate'].includes(stepId)
    && before.flags.c2_payoff_model && !before.flags.c2_payoff_model_used && !before.flags.c2_payoff_base_used
    && ((stepId === 'c2am_payoff_layers' && after.flags.c2_payoff_model_used)
      || (stepId === 'c2am_payoff_rotate' && before.flags.c2_payoff_base && after.flags.c2_payoff_base_used))) {
    category = 'teaching'; label = '旧教具重新派上用场 · 向质控专家演示'
  } else return after
  const id = `stat:wealth:${category}`, saved = after.dlc?.ch2?.statInteractions
  if (saved?.wealthRewards?.includes(category) || after.dlc?.ch2?.loop?.entries.some(row => row.id === id)) return after
  const changed = patch({ ...after, wealth: after.wealth + 1 }, {
    wealthRewards: [...(saved?.wealthRewards ?? []), category],
  })
  return recordCh2Change(after, changed, id, label, 'story')
}
