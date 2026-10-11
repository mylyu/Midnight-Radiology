import type { GameState } from './types'
import type { TrilogyChapter } from './trilogy-types'

/** A reply/return/overlay return is a new presentation even at the same cursor. */
export function trilogyDialoguePresentationKey(input: {
  chapter: string; runId: string; node: string; phase: string; presentation: number;
  overlay: string | null; speaker: string; replyPerson?: string; text: string;
}) {
  return JSON.stringify([input.chapter, input.runId, input.node, input.phase, input.presentation,
    input.overlay, input.speaker, input.replyPerson ?? '', input.text])
}

/** Used only to keep a navigation click when the accepted action opens a tool,
 * scan or other non-dialogue destination. Ordinary text gets its opening cue.
 */
export function trilogyTargetHasDialogue(chapter: TrilogyChapter, state: Pick<GameState, 'flags'>, target?: string) {
  const seen = new Set<string>()
  while (target && !seen.has(target)) {
    seen.add(target)
    const step = chapter.steps[target]
    if (!step) return false
    if (step.skipUnlessFlag && !state.flags[step.skipUnlessFlag]) { target = step.next; continue }
    return !step.tool && !step.scan && !!step.text
  }
  return false
}

/** Only the current visible presentation may retry a rejected opening sound.
 * No audio promise controls the typewriter/input gate. Effect replay reuses an
 * in-flight receipt, so StrictMode does not start a second identical click.
 */
export function createTrilogyDialogueClick(play: () => Promise<boolean>) {
  type Receipt = { scope: string; attempted: boolean; playing: boolean; pending: boolean; sounded: boolean; suppressed: boolean }
  let receipt: Receipt | undefined, active = false
  const attempt = (current: Receipt) => {
    current.attempted = true; current.playing = true; current.pending = false
    const finish = (started: boolean) => {
      current.playing = false
      if (receipt !== current || !active || current.suppressed) return
      current.sounded = started; current.pending = !started
    }
    try { void play().then(finish, () => finish(false)) } catch { finish(false) }
    return true
  }
  return {
    begin(scope: string, audible: boolean) {
      if (receipt?.scope !== scope) receipt = { scope, attempted: false, playing: false, pending: false, sounded: false, suppressed: false }
      active = true
      if (!audible) { receipt.suppressed = true; receipt.attempted = true; receipt.pending = false; return false }
      return !receipt.attempted && !receipt.suppressed ? attempt(receipt) : false
    },
    gesture(scope: string, audible: boolean) {
      if (!active || receipt?.scope !== scope || !audible || receipt.suppressed || receipt.sounded || receipt.playing || !receipt.pending) return false
      return attempt(receipt)
    },
    cancel() { active = false; if (receipt) receipt.pending = false },
  }
}
