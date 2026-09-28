// Focused dataset migration checks. Run in app/: node --import tsx tests/ldct-noisy-state.mjs
// No browser, build, image generation or unrelated chapter replay.
import assert from 'node:assert/strict'
import { freshState } from '../src/game/store.ts'
import { createLdctLabState, createLdctRecord, isValidLdctRecord, labStateValid } from '../src/game/ldct-experiments.ts'
import { initializeLdct, selectLdctStory, getLdctProgress, ldctAction } from '../src/game/ldct-session.ts'
import { LDCT_NOISY_DATA_VERSION, LDCT_NOISY_EXPOSURE_VERSION, LDCT_NOISY_CHEST_VERSION } from '../src/game/ldct-noisy-chest.ts'
import { LDCT_DEEP_EXPOSURE_VERSION, LDCT_DEEP_CHEST_VERSION } from '../src/game/ldct-deep-experiments.ts'

const clone = value => JSON.parse(JSON.stringify(value))
const progress = getLdctProgress
const base = selectLdctStory({ ...freshState('m'), gold: 800, skill: 7, heart: 9, wealth: 2,
  flags: { keep_main_story: true }, dlc: { ch2: { done: true }, dr: { done: true }, dsa: { dose: 57 } } }, 'father')
const replace = (state, p) => ({ ...state, dlc: { ...state.dlc, ldct: { ...state.dlc.ldct, ldct: p,
  ldctStories: { ...state.dlc.ldct.ldctStories, slots: { ...state.dlc.ldct.ldctStories.slots, father: p } } } } })
const protectedValues = state => ({ gold: state.gold, skill: state.skill, heart: state.heart,
  wealth: state.wealth, badges: state.badges, flags: state.flags, ch2: state.dlc.ch2, dr: state.dlc.dr, dsa: state.dlc.dsa })
const act = (state, type, fields = {}) => ldctAction(state, { type, ...fields })

assert.equal(progress(base).chestSourceVersion, LDCT_NOISY_DATA_VERSION)
for (const round of [4, 5]) {
  const draft = { ...createLdctLabState(round, 'chest'), helped: true }
  const newSource = round === 4 ? LDCT_NOISY_EXPOSURE_VERSION : LDCT_NOISY_CHEST_VERSION
  const oldSource = round === 4 ? LDCT_DEEP_EXPOSURE_VERSION : LDCT_DEEP_CHEST_VERSION
  assert.equal(draft.chestDataVersion, LDCT_NOISY_DATA_VERSION)
  assert(labStateValid(draft, round))
  const record = createLdctRecord(draft, round, 'uncertain', 'chest')
  assert.equal(record.sourceVersion, newSource)
  assert.equal(record.chestDataVersion, LDCT_NOISY_DATA_VERSION)
  assert(isValidLdctRecord(record, round))
  assert(!isValidLdctRecord({ ...record, chestDataVersion: undefined }, round), 'new sources require the new input identity')
  assert(!isValidLdctRecord({ ...record, sourceVersion: oldSource }, round), 'new input identity cannot label old images')
  assert(!labStateValid({ ...draft, chestDataVersion: 'unknown' }, round), 'unknown datasets are not accepted')

  // Absence of the new flag is meaningful: these remain historical inputs.
  const oldDraft = { ...draft }
  delete oldDraft.chestDataVersion
  const old = createLdctRecord(oldDraft, round, 'uncertain', 'chest')
  assert.equal(old.sourceVersion, oldSource)
  assert.equal(old.chestDataVersion, undefined)
  assert(isValidLdctRecord(old, round))
  const marked = round === 5 ? { ...oldDraft, chest: { ...oldDraft.chest,
    pinned: { slice: 2, iterationStep: 1, iterationRound: 3 },
    mark: { x: 30, y: 40, slice: 1, iterationStep: 2, iterationRound: 4, method: 'iteration' },
  } } : oldDraft
  const state = replace(clone(base), { ...progress(base), chestSourceVersion: 'ldct-chest-open-v2',
    phase: 'lab', nodeId: `lf_lab_${round}`, labRound: round, labDraft: marked, records: { [round]: old },
    previousChest: { draft: { ...createLdctLabState(5, 'chest'), chestDataVersion: undefined }, record: old } })
  const original = clone(state)
  const migrated = initializeLdct(state)
  const p = progress(migrated)
  assert.equal(p.chestSourceVersion, LDCT_NOISY_DATA_VERSION)
  assert.equal(p.labDraft.chestDataVersion, LDCT_NOISY_DATA_VERSION)
  assert.equal(p.nodeId, `lf_lab_${round}`)
  assert.deepEqual(p.records[round], old, 'completed records are not rewritten')
  assert.deepEqual(p.previousChest[round === 4 ? 'exposureDraft' : 'draft'], marked)
  assert.equal(p.previousChest.history.length, 1)
  assert.deepEqual(p.previousChest.history[0].record, old, 'the earlier archive is retained too')
  if (round === 5) {
    assert.equal(p.labDraft.chest.pinned, null)
    assert.equal(p.labDraft.chest.mark, null, 'an old marker must not move onto the new images')
  }
  assert.deepEqual(protectedValues(migrated), protectedValues(original))
  assert.equal(initializeLdct(migrated), migrated, 'repeat initialization neither resets nor appends an archive')
  assert.equal(act(migrated, 'lab:update', { value: { ...p.labDraft, chestDataVersion: undefined } }), migrated,
    'controls cannot switch the input data out from under the player')

  const review = replace(clone(base), { ...progress(base), phase: 'settle', nodeId: 'lf_night1_end', records: { [round]: old } })
  const opened = act(review, 'lab:open', { round })
  assert.equal(progress(opened).labDraft.chestDataVersion, undefined, 'factory defaults do not relabel an old record')
  assert.equal(progress(opened).labDraft.sourceVersion, old.sourceVersion)
  assert.equal(progress(opened).labReturn, 'lf_night1_end')
  const oldReview = replace(opened, { ...progress(opened), chestSourceVersion: 'ldct-chest-open-v2' })
  const restoredReview = initializeLdct(oldReview)
  assert.deepEqual(progress(restoredReview).labDraft, progress(opened).labDraft, 'open historical playback is not reset')
  assert.equal(act(restoredReview, 'lab:update', { value: { ...progress(restoredReview).labDraft, chestDataVersion: LDCT_NOISY_DATA_VERSION } }), restoredReview)

  const paused = replace(original, { ...progress(original), phase: 'story', nodeId: `lf_lab_${round}` })
  assert.equal(progress(initializeLdct(paused)).labDraft.chestDataVersion, LDCT_NOISY_DATA_VERSION,
    'closing an unfinished lab onto its own introduction still preserves/migrates the draft')
  const after = replace(original, { ...progress(original), phase: 'story', nodeId: round === 4 ? 'lf_photons_done_0' : 'lf_after_iteration_0' })
  assert.deepEqual(progress(initializeLdct(after)).labDraft, progress(after).labDraft, 'past story events do not reset or replay')

  // Older/interrupted saves can have a same-round draft while still before its
  // introduction. Global migration happens first; move() must also check identity.
  let before = replace(original, { ...progress(original), phase: 'story',
    nodeId: round === 4 ? 'lf_first_fbp' : 'lf_iteration_intro_0' })
  before = initializeLdct(before)
  assert.equal(progress(before).chestSourceVersion, LDCT_NOISY_DATA_VERSION)
  assert.equal(progress(before).labDraft.chestDataVersion, undefined, 'do not reset an unrelated story node early')
  let entered = before
  for (let steps = 0; steps < 6 && progress(entered).phase !== 'lab'; steps++)
    entered = act(entered, 'advance', { nodeId: progress(entered).nodeId })
  const next = progress(entered)
  assert.equal(next.nodeId, `lf_lab_${round}`)
  assert.equal(next.phase, 'lab')
  assert.equal(next.labDraft.chestDataVersion, LDCT_NOISY_DATA_VERSION, 'entering must match the new first FBP, not just the old round number')
  assert.deepEqual(next.previousChest[round === 4 ? 'exposureDraft' : 'draft'], marked)
  assert.deepEqual(next.records[round], old)
  assert.deepEqual(protectedValues(entered), protectedValues(before))
  if (round === 5) assert.equal(next.labDraft.chest.mark, null)
  assert.equal(initializeLdct(entered), entered)

  // Closing and returning to a current input is a continuation, not a reset.
  const atStep = { ...next.labDraft, [round === 4 ? 'exposureCount' : 'iterationRound']: 6 }
  entered = act(entered, 'lab:update', { value: atStep })
  const history = clone(progress(entered).previousChest)
  entered = act(entered, 'lab:close')
  entered = act(entered, 'advance', { nodeId: progress(entered).nodeId })
  assert.deepEqual(progress(entered).labDraft, atStep)
  assert.deepEqual(clone(progress(entered).previousChest), history, 'JSON-persisted archive is unchanged on resume')
}

// Retired v1 anatomy retains the pre-existing fallback, not a revived atlas.
const v1Draft = { ...createLdctLabState(5, 'chest'), helped: true, chestDataVersion: undefined }
const v1Record = { ...createLdctRecord(v1Draft, 5, 'uncertain', 'chest'), sourceVersion: 'ldct-chest-v1', iterationRound: undefined }
assert(isValidLdctRecord(v1Record, 5))
const v1State = replace(clone(base), { ...progress(base), phase: 'settle', nodeId: 'lf_end', records: { 5: v1Record } })
const fallback = act(v1State, 'lab:open', { round: 5 })
assert.equal(progress(fallback).labDraft.chestDataVersion, LDCT_NOISY_DATA_VERSION)
assert.equal(progress(fallback).labDraft.chest.mark, null)
assert.deepEqual(progress(fallback).records[5], v1Record)

const finished = replace(clone(base), { ...progress(base), chestSourceVersion: 'ldct-chest-open-v2', phase: 'settle', nodeId: 'lf_end', finished: true })
assert.equal(progress(initializeLdct(finished)).nodeId, 'lf_end')
assert.equal(progress(initializeLdct(finished)).finished, true)
assert.deepEqual(protectedValues(initializeLdct(finished)), protectedValues(finished))
assert(!labStateValid({ ...createLdctLabState(3), chestDataVersion: LDCT_NOISY_DATA_VERSION }, 3))
console.log('LDCT noisy state: versions, live/delayed migration, archive playback, resume and protected state passed')
