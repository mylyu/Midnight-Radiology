// Pure, bounded audio scheduling checks. Does not play audio or walk a chapter.
import assert from 'node:assert/strict'
import { createTrilogyDialogueClick, trilogyDialoguePresentationKey as key,
  trilogyTargetHasDialogue } from '../src/game/trilogy-dialogue-click.ts'
import { acceptInput } from '../src/game/input-gate.ts'
import { DIALOGUE_CHARACTER_MS, DIALOGUE_CHOICE_BUFFER_MS } from '../src/game/dialogue-timing.ts'
import { beginChoicePress, captureChoiceActivation, consumeChoiceActivation,
  createChoiceInput, CHOICE_QUIET_MS } from '../src/game/choice-input.ts'

const flush = async () => { await Promise.resolve(); await Promise.resolve() }
const makePort = () => {
  const calls = []
  const click = createTrilogyDialogueClick(() => new Promise((resolve, reject) => calls.push({ resolve, reject })))
  return { click, calls }
}
const base = { chapter: 'ch3', runId: 'run-1', node: 'hub', phase: 'story', presentation: 0,
  overlay: null, speaker: 'mei', text: '来啦？这边。' }
const start = key(base), reply = key({ ...base, replyPerson: 'mei', text: '谢谢，正想喝点热的。' })
assert.equal(start, key({ ...base }))
assert.notEqual(start, reply)
for (const patch of [{ runId: 'run-2' }, { node: 'scan_result' }, { presentation: 1 },
  { speaker: 'me' }, { text: '下一句。' }, { overlay: 'book' }]) assert.notEqual(start, key({ ...base, ...patch }))

// Mount/StrictMode replay/typewriter ticks/fill share one presentation receipt.
const opening = makePort()
assert(opening.click.begin(start, true))
assert(!opening.click.begin(start, true))
opening.click.cancel()
assert(!opening.click.begin(start, true))
for (let i = 0; i < base.text.length; i++) assert(!opening.click.begin(start, true))
assert(!opening.click.gesture(start, true), 'A pending play must not be started twice by fill')
assert.equal(opening.calls.length, 1)
opening.calls[0].resolve(true); await flush()
assert(!opening.click.gesture(start, true), 'Successful opening + fill is one click, not two')
const automaticResult = key({ ...base, node: 'scan_result' })
assert(opening.click.begin(automaticResult, true), 'An automatic text result opens without a user click')
opening.calls[1].resolve(true); await flush()
assert(opening.click.begin(reply, true), 'Gift reply at the same cursor is a new opening')
opening.calls[2].resolve(true); await flush()
assert(opening.click.begin(start, true), 'Returning to the original text after a reply opens it again')
opening.calls[3].resolve(true); await flush()
opening.click.cancel()
assert(opening.click.begin(key({ ...base, presentation: 2 }), true), 'Overlay return re-presentation opens once')
assert.equal(opening.calls.length, 5)

// Autoplay rejection can retry only in a fresh accepted current-line gesture.
const retry = makePort(), nav = { until: 0 }
retry.click.begin(start, true)
retry.calls[0].resolve(false); await flush()
assert(acceptInput(nav, 1000, 300)); assert(retry.click.gesture(start, true))
assert(!acceptInput(nav, 1100, 300), 'Fast repeated taps are rejected before the audio port')
assert(!retry.click.gesture(start, true), 'An in-flight accepted retry is not duplicated')
assert.equal(retry.calls.length, 2)
retry.calls[1].reject(new Error('NotAllowedError')); await flush()
assert(!acceptInput(nav, 1299, 300)); assert.equal(retry.calls.length, 2)
assert(acceptInput(nav, 1300, 300)); assert(retry.click.gesture(start, true))
retry.calls[2].resolve(true); await flush()
assert(!retry.click.gesture(start, true))
assert.equal(retry.calls.length, 3)

// Leaving/hiding/canceling suppresses late retry; an old promise cannot revive it.
const stale = makePort()
stale.click.begin(start, true); stale.click.cancel()
stale.calls[0].resolve(false); await flush()
assert(!stale.click.gesture(start, true))
stale.click.begin(reply, true)
assert(!stale.click.gesture(start, true))
stale.calls[1].reject(new Error('hidden')); await flush()
stale.click.cancel()
assert(!stale.click.gesture(reply, true))
assert.equal(stale.calls.length, 2)
const crossed = makePort()
crossed.click.begin(start, true); crossed.click.begin(reply, true)
crossed.calls[0].resolve(false); await flush()
assert(!crossed.click.gesture(start, true)); assert(!crossed.click.gesture(reply, true))
crossed.calls[1].resolve(true); await flush()
assert.equal(crossed.calls.length, 2)

// Muted or hidden openings are consumed, never queued as a backlog on unmute.
for (const reason of ['muted', 'hidden']) {
  const silent = makePort()
  assert(!silent.click.begin(start, false), reason)
  assert(!silent.click.begin(start, true)); assert(!silent.click.gesture(start, true))
  assert.equal(silent.calls.length, 0)
  assert(silent.click.begin(reply, true)); assert.equal(silent.calls.length, 1)
}
let throws = 0
const throwing = createTrilogyDialogueClick(() => { throws++; throw new Error('unavailable') })
assert(throwing.begin(start, true)); assert(throwing.gesture(start, true)); assert.equal(throws, 2)
throwing.cancel(); assert(!throwing.gesture(start, true)); assert.equal(throws, 2)

// Existing choice timing remains independent from the audio promise (900/300).
assert.equal(DIALOGUE_CHARACTER_MS, 28)
assert.equal(DIALOGUE_CHOICE_BUFFER_MS, 900); assert.equal(CHOICE_QUIET_MS, 300)
const guard = createChoiceInput()
const chooseAt = (time, ready) => {
  beginChoicePress(guard, time, start, '0', ready, 'pointer')
  captureChoiceActivation(guard, time, start, '0', ready, 'pointer')
  return consumeChoiceActivation(guard, start, '0')
}
assert(!chooseAt(899, false))
assert(!chooseAt(900, true), 'An appearing choice cannot consume the same rapid click stream')
assert(!chooseAt(1100, true))
assert(chooseAt(1400, true), 'A fresh press after the quiet period works even with audio unresolved')
assert(!consumeChoiceActivation(guard, start, '0'), 'Choice consumption is once only')

// Accepted non-dialogue destinations keep their UI click; text uses its opening.
const chapter = { steps: {
  text: { text: '一句话。' }, tool: { text: '工具说明。', tool: {} }, scan: { scan: {} },
  gate: { skipUnlessFlag: 'opened', text: '可选对白。', next: 'tool' },
  skip: { skipUnlessFlag: 'opened', next: 'text' }, loop: { skipUnlessFlag: 'opened', next: 'loop' },
} }
assert(trilogyTargetHasDialogue(chapter, { flags: {} }, 'text'))
assert(!trilogyTargetHasDialogue(chapter, { flags: {} }, 'tool'))
assert(!trilogyTargetHasDialogue(chapter, { flags: {} }, 'scan'))
assert(!trilogyTargetHasDialogue(chapter, { flags: {} }, 'gate'))
assert(trilogyTargetHasDialogue(chapter, { flags: { opened: true } }, 'gate'))
assert(trilogyTargetHasDialogue(chapter, { flags: {} }, 'skip'))
assert(!trilogyTargetHasDialogue(chapter, { flags: {} }, 'loop'))
assert(!trilogyTargetHasDialogue(chapter, { flags: {} }, 'missing'))
assert(!trilogyTargetHasDialogue(chapter, { flags: {} }))
console.log(JSON.stringify({ status: 'passed', kind: 'pure-scheduling-not-browser-audio',
  tested: 'opening/StrictMode/fill/automatic-result/gift-return/overlay/mute/rejection/stale-promise/900-300-gates/destinations' }))
