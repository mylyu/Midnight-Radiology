import type { GameState, Step } from './types'
import { recordCh2Change } from './ch2-ledger'

type WindowTask = NonNullable<Step['windowTask']>

/** An attempt is a saved transaction, not a mounted component's score.
 * expectedAttempts rejects duplicate clicks/updater replays. The successful cursor
 * is written in the same save so reloading cannot replay a completed attempt. */
export function recordCh2WindowAttempt(
  s: GameState, stepId: string, task: WindowTask, expectedAttempts: number, width: number, level: number,
): GameState {
  const p = s.dlc?.ch2
  if (!p || p.stepId !== stepId || p.done || p.phase && p.phase !== 'story' ||
      !Number.isFinite(width) || !Number.isFinite(level)) return s
  const previous = p.windowTasks?.[stepId]
  const attempts = previous?.attempts ?? 0
  if (previous?.completed || expectedAttempts !== attempts) return s
  const completed = Math.abs(width - task.targetW) <= task.tolW && Math.abs(level - task.targetL) <= task.tolL
  const windowTasks = { ...p.windowTasks, [stepId]: {
    attempts: attempts + 1, completed, width, level, ...(task.stage ? { stage: task.stage } : {}),
  } }
  let next: GameState = { ...s, dlc: { ...s.dlc, ch2: { ...p, windowTasks,
    ...(completed ? { stepId: task.success } : {}),
  } } }
  // Only this run's actual two tasks qualify. Legacy saves have no reliable
  // attempt history; later window tasks cannot stand in for a missing stage.
  const qualified = ['c2n1_m11', 'c2n1_w2'].every((id, index) => {
    const result = windowTasks[id]
    return result?.completed && result.stage === index + 1 && result.attempts >= 1 && result.attempts <= 2
  })
  if (completed && qualified && !s.badges.includes('window_master')) {
    next = recordCh2Change(s, { ...next, badges: [...s.badges, 'window_master'] },
      'window-master', '完成脑窗与硬膜下窗调整', 'story')
  }
  return next
}
