import type { Step } from './types'

type SceneView = { bg: string; sprite?: string; sprite2?: string }

/** Resolve the CURRENT node before painting it. Saved view is context for the
 * background/continuing speaker, never a portrait to paint unconditionally.
 * Explicit empty sprites also clear portraits from older saved views. */
export function ch2SceneView(step: Step, previous: SceneView): SceneView {
  const speakerSprite = step.speaker === 'luzhou' ? 'luzhou' : step.speaker ? `char_${step.speaker}` : undefined
  return {
    bg: step.bg ?? previous.bg,
    sprite: step.sprite ?? (step.speaker === 'me' ? 'me'
      : speakerSprite && previous.sprite === speakerSprite ? previous.sprite : undefined),
    sprite2: step.sprite2,
  }
}
