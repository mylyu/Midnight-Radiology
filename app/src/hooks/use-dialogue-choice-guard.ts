import { useRef } from 'react'
import type { KeyboardEvent, MouseEvent, PointerEvent } from 'react'
import { beginChoicePress, cancelChoicePress, captureChoiceActivation, consumeChoiceActivation, createChoiceInput } from '../game/choice-input'

const choiceTarget = (target: EventTarget | null) => target instanceof Element
  ? target.closest<HTMLElement>('[data-dialogue-choice]')?.dataset.dialogueChoice ?? null : null

/** Shared by Ch1/Ch2; independent of ordinary navigation and purchase throttles. */
export function useDialogueChoiceGuard(scope: string, ready: boolean) {
  const input = useRef(createChoiceInput())
  return {
    pointerDown: (event: PointerEvent) => {
      beginChoicePress(input.current, performance.now(), scope, choiceTarget(event.target), ready, 'pointer')
    },
    keyDown: (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      beginChoicePress(input.current, performance.now(), scope, choiceTarget(event.target), ready, 'keyboard', event.repeat)
    },
    click: (event: MouseEvent) => {
      captureChoiceActivation(input.current, performance.now(), scope, choiceTarget(event.target), ready,
        event.detail === 0 ? 'keyboard' : 'pointer')
    },
    cancel: () => cancelChoicePress(input.current),
    accept: (index: number) => consumeChoiceActivation(input.current, scope, String(index)),
  }
}
