import assert from 'node:assert/strict'
import { beginChoicePress, cancelChoicePress, captureChoiceActivation, consumeChoiceActivation, createChoiceInput } from '../src/game/choice-input.ts'

const click = (state, now, { scope = 'line:a', target = '0', ready = true, kind = 'pointer' } = {}) => {
  beginChoicePress(state, now, scope, target, ready, kind)
  captureChoiceActivation(state, now + 1, scope, target, ready, kind)
  return consumeChoiceActivation(state, scope, target ?? '')
}
let probes = 0
{
  const state = createChoiceInput()
  assert.equal(click(state, 0, { target: null, ready: false }), false)
  for (let now = 100; now <= 2100; now += 100) {
    assert.equal(click(state, now, { ready: now >= 900 }), false, 'Continuous taps cannot turn into a choice when the 900ms buffer expires')
    probes++
  }
  assert.equal(click(state, 2400), false, 'The quiet interval is measured from the previous completed click')
  assert.equal(click(state, 2701), true, 'A fresh gesture after exactly 300ms quiet succeeds')
  assert.equal(consumeChoiceActivation(state, 'line:a', '0'), false, 'An activation is consumed exactly once')
}
{
  const state = createChoiceInput()
  beginChoicePress(state, 1000, 'line:a', '0', false, 'pointer')
  captureChoiceActivation(state, 2000, 'line:a', '0', true, 'pointer')
  assert.equal(consumeChoiceActivation(state, 'line:a', '0'), false, 'Pressing before the answer is ready cannot submit on release')
  assert.equal(click(state, 2300), true)
  probes++
}
for (const changed of [{ scope: 'line:b', target: '0' }, { scope: 'line:a', target: '1' }]) {
  const state = createChoiceInput()
  beginChoicePress(state, 0, 'line:a', '0', true, 'pointer')
  captureChoiceActivation(state, 1000, changed.scope, changed.target, true, 'pointer')
  assert.equal(consumeChoiceActivation(state, changed.scope, changed.target), false, 'The same press cannot select a different presentation/answer')
  probes++
}
{
  const state = createChoiceInput()
  for (let now = 0; now <= 1000; now += 100) {
    beginChoicePress(state, now, 'line:a', '0', true, 'keyboard', true)
    captureChoiceActivation(state, now + 1, 'line:a', '0', true, 'keyboard')
    assert.equal(consumeChoiceActivation(state, 'line:a', '0'), false, 'Held-key repeats cannot submit')
    probes++
  }
  assert.equal(click(state, 1400, { kind: 'keyboard' }), true)
}
{
  const state = createChoiceInput()
  beginChoicePress(state, 0, 'line:a', '0', true, 'pointer')
  cancelChoicePress(state)
  assert.equal(consumeChoiceActivation(state, 'line:a', '0'), false)
  // Assistive technologies may send a click without pointer/key DOM events.
  captureChoiceActivation(state, 500, 'line:a', '0', true, 'keyboard')
  assert.equal(consumeChoiceActivation(state, 'line:a', '0'), true)
  probes++
}
console.log(`PASS choice input: ${probes} continuous-tap, quiet boundary, presentation, pointer, keyboard and accessibility probes`)
