import type { GameState, Step } from './types'

/** Visiting the archive is not the same as finishing both things inside it.
 * Keep the original one-AP first visit; returning to unfinished work is free. */
export function ch1ExplorationStep(id: string, step: Step, state: GameState): Step {
  if (id !== 'n3_hub') return step
  const { flags, items, ap } = state
  if (!flags.n3_arc) {
    return ap < 1 ? { ...step, text: `${step.text}\n旧片库还没去：需要1点行动力，可以先到小卖部买杯咖啡。` } : step
  }
  const unfinished = !flags.archive_film || (items.includes('key') && !flags.archive_cab)
  if (!unfinished) return step
  return {
    ...step,
    choices: step.choices?.map(choice => choice.next === 'n3_arc0'
      ? { text: '🗄️ 返回旧片库 · 还有没看完的东西（不耗行动力）', next: 'n3_arc0' }
      : choice),
  }
}
