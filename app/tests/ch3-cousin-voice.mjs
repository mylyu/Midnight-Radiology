// node --import tsx tests/ch3-cousin-voice.mjs (from app/)
// Pure scene mapping and save-receipt checks; no browser or audio generation.
import assert from 'node:assert/strict'
import { CH3 } from '../src/game/ch3.ts'
import { trilogyVoice, trilogyVoiceAssets } from '../src/game/trilogy-audio.ts'
import { freshState } from '../src/game/store.ts'
import { initializeTrilogy, patchTrilogy, trilogyProgress, trilogyStep,
  trilogyAdvance, trilogyHeardCue } from '../src/game/trilogy-session.ts'

const voiceId = 'vox_c3_cousin_v2'
const firstLine = 'c3_intro_call_1'
const base = initializeTrilogy(freshState('f'), CH3, 'cousin-first-call')
const first = trilogyAdvance(base, CH3, 'c3_intro_call_0')
assert.equal(trilogyProgress(first, 'ch3').stepId, firstLine)
assert.equal(trilogyStep(first, CH3).communication, 'call')
assert.equal(trilogyVoice(CH3, trilogyStep(first, CH3)), voiceId,
  'The first spoken phone line explicitly plays the existing cousin voice')

const cueNodes = Object.entries(CH3.steps)
  .filter(([, step]) => trilogyVoice(CH3, step) === voiceId)
  .map(([id]) => id)
assert.deepEqual(cueNodes, [firstLine],
  'The cousin entrance belongs only to the first call, never SMS or later arrival')
for (const node of ['c3_intro_call_0', 'c3_intro_call_2', 'c3_intro_call_3',
  'c3_intro_confirm_1', 'c3_s2_start_1', 'c3_s2_arrive_1', 'c3_cousin_mri_wait_0']) {
  assert.equal(trilogyVoice(CH3, CH3.steps[node]), undefined, `${node}: no delayed/repeated cousin entrance`)
}
assert.equal(trilogyVoiceAssets(CH3).filter(id => id === voiceId).length, 1,
  'The existing clip remains registered once for chapter preloading')

// Explicit voice remains stronger than the communication/closeup fallback;
// explicit silence and unrelated character entrances keep their old semantics.
assert.equal(trilogyVoice(CH3, { speaker: 'mei', communication: 'call', voice: undefined }), undefined)
assert.equal(trilogyVoice(CH3, { speaker: 'mei', closeup: true }), undefined)
assert.equal(trilogyVoice(CH3, { speaker: 'mei' }), 'vox_c3_mei_v2')
assert.equal(trilogyVoice(CH3, { speaker: 'aunt' }), 'vox_trilogy_aunt_v2')

// Old cursors and both existing receipt formats survive JSON restoration.
// Playback/retry is still owned by TrilogyScreen; resolving a cue is pure and
// must neither mark it heard nor move an old save back to the opening.
for (const [stepId, heardCues] of [
  [firstLine, undefined], [firstLine, [`voice:${voiceId}`]],
  [firstLine, [`voice:${firstLine}`]],
  ['c3_s2_arrive_1', ['voice:c3_s2_arrive_1']],
  ['c3_s2_arrive_1', [`voice:${voiceId}`]],
  ['c3_s2_arrive_1', undefined],
]) {
  const saved = JSON.parse(JSON.stringify(patchTrilogy(first, 'ch3', { stepId, heardCues })))
  const before = JSON.stringify(saved)
  const resumed = initializeTrilogy(saved, CH3, 'ignored-new-run')
  assert.strictEqual(resumed, saved)
  assert.equal(trilogyVoice(CH3, trilogyStep(resumed, CH3)), stepId === firstLine ? voiceId : undefined)
  assert.equal(JSON.stringify(resumed), before, 'Cue resolution preserves cursor, receipts and all other saved state')
}
const heard = trilogyHeardCue(first, 'ch3', `voice:${voiceId}`)
assert.deepEqual(trilogyProgress(heard, 'ch3').heardCues, [`voice:${voiceId}`])
assert.strictEqual(trilogyHeardCue(heard, 'ch3', `voice:${voiceId}`), heard, 'A heard clip keeps one run receipt')

console.log(JSON.stringify({ status: 'passed', kind: 'pure-audio-mapping-and-save-state',
  voiceId, cueNodes, preservedSaveCases: 6, audioPlaybackOrListeningTested: false }))
