import type { Step } from './types'

export type DialogueSceneView = { bg: string; sprite?: string; sprite2?: string }

/** Resolve the current node before painting it. The speaker owns the left
 * portrait; an explicit NPC sprite on a player line is their companion, not a
 * replacement for the selected protagonist. Saved views are context only. */
export function dialogueSceneView(step: Step, previous: DialogueSceneView): DialogueSceneView {
  const speakerSprite = step.speaker === 'luzhou' ? 'luzhou' : step.speaker ? `char_${step.speaker}` : undefined
  const playerCompanion = step.speaker === 'me' && step.sprite && step.sprite !== 'me' ? step.sprite : undefined
  return {
    bg: step.bg ?? previous.bg,
    sprite: step.speaker === 'me'
      ? step.sprite === '' ? '' : 'me'
      : step.sprite ?? (speakerSprite && previous.sprite === speakerSprite ? previous.sprite : undefined),
    sprite2: step.sprite2 ?? playerCompanion,
  }
}
