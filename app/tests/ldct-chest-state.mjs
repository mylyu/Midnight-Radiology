import assert from 'node:assert/strict'
import { freshState } from '../src/game/store.ts'
import {
  createLdctLabState, createLdctRecord, isValidLdctRecord, labStateValid,
  ldctExperimentReady, ldctRecordSummary, LDCT_LAB_MEDIA_IDS,
} from '../src/game/ldct-experiments.ts'
import { LDCT_DATASET_MEDIA_IDS } from '../src/game/ldct-projections.ts'
import { LDCT_CHEST_MEDIA_IDS, LDCT_CHEST_VERSION, LDCT_CHEST_SEED } from '../src/game/ldct-chest.ts'
import {
  initializeLdct, selectLdctStory, getLdctProgress, getLdctShelf, ldctAction,
} from '../src/game/ldct-session.ts'

// A bounded draft/transaction test; no browser, generation, build or story replay.
const copy = value => JSON.parse(JSON.stringify(value))
assert.deepEqual(LDCT_LAB_MEDIA_IDS, [LDCT_DATASET_MEDIA_IDS.phantom, ...LDCT_CHEST_MEDIA_IDS])
assert(!LDCT_LAB_MEDIA_IDS.includes(LDCT_DATASET_MEDIA_IDS.face))
assert(!LDCT_LAB_MEDIA_IDS.includes(LDCT_DATASET_MEDIA_IDS.nut))

const initial = createLdctLabState(5, 'chest')
assert(labStateValid(initial, 5))
assert.deepEqual(initial.chest, { slice: 1, pinned: null, mark: null, compareFbp: false })
assert.equal(ldctExperimentReady(initial, 5), false)
assert.equal(createLdctRecord(initial, 5, 'different', 'chest'), null)

// Help is a valid continuation even before a reconstruction/mark; no guessing gate.
const help = createLdctRecord({ ...initial, helped: true }, 5, 'uncertain', 'chest')
assert(isValidLdctRecord(help, 5))
assert.equal(help.helped, true)
assert.equal(help.chest.mark, null)
assert.equal(help.sourceVersion, LDCT_CHEST_VERSION)
assert.equal(help.seed, LDCT_CHEST_SEED)

// Keep one iteration/layer fixed, then move elsewhere and mark the original FBP.
const compared = { ...initial, iterationStep: 3, seenIterations: [0, 1, 2, 3], chest: {
  slice: 2, pinned: { slice: 1, iterationStep: 1 },
  mark: { x: 28, y: 42, slice: 2, iterationStep: 3, method: 'fbp' }, compareFbp: true,
} }
assert(labStateValid(compared, 5))
const record = createLdctRecord(compared, 5, 'different', 'chest')
assert(isValidLdctRecord(record, 5))
assert.deepEqual(record.chest, compared.chest)
assert.notEqual(record.chest, compared.chest)
assert.notEqual(record.chest.mark, compared.chest.mark)
assert.notEqual(record.chest.pinned, compared.chest.pinned)
const legacyChest = { ...copy(record), sourceVersion: 'ldct-chest-v1' }
assert(isValidLdctRecord(legacyChest, 5), 'old-source records remain readable, not silently renamed')
assert.match(ldctRecordSummary(legacyChest), /旧示意图/)
assert.match(ldctRecordSummary(record), /FBP/)
assert.match(ldctRecordSummary(record), /第3层/)
assert.match(ldctRecordSummary(record), /固定1轮第2层/)
assert.deepEqual(copy(compared).chest, compared.chest, 'JSON refresh preserves all observation fields')

// No answer region is checked. The two opposite corners are equally valid notes.
for (const point of [{ x: 0, y: 0 }, { x: 100, y: 100 }]) {
  assert(labStateValid({ ...compared, chest: { ...compared.chest, mark: { ...compared.chest.mark, ...point } } }, 5))
}
for (const patch of [
  { slice: 3 }, { pinned: { slice: 1, iterationStep: 5 } },
  { mark: { ...compared.chest.mark, x: Number.NaN } },
  { mark: { ...compared.chest.mark, y: 101 } },
  { mark: { ...compared.chest.mark, method: 'truth' } },
]) assert.equal(labStateValid({ ...compared, chest: { ...compared.chest, ...patch } }, 5), false)
assert.equal(labStateValid({ ...createLdctLabState(3), chest: initial.chest }, 3), false)
assert.equal(isValidLdctRecord({ ...record, sourceVersion: 'ldct-projection-v2', seed: 2258 }, 5), false)
assert.equal(isValidLdctRecord({ ...record, chest: undefined }, 5), false)
assert.equal(isValidLdctRecord({ ...record, seed: 1 }, 5), false)
assert.equal(isValidLdctRecord(record, 4), false)

// Historical metadata remains valid without loading its retired atlas.
for (const dataset of ['phantom', 'face', 'nut']) {
  const old = createLdctRecord({ ...createLdctLabState(5), iterationStep: 1 }, 5, 'different', dataset)
  assert(isValidLdctRecord(old, 5))
  assert(isValidLdctRecord({ ...old, sourceVersion: 'ldct-short-v1' }, 5))
}
const oldest = createLdctRecord({ ...createLdctLabState(3), filter: 'hann' }, 3, 'different')
assert(isValidLdctRecord({ ...oldest, sourceVersion: 'ldct-projection-v2', seed: 2258, dataset: 'sparse-filter-v1' }, 3))

const base = { ...freshState('m'), gold: 820, skill: 11, heart: 7, wealth: 3,
  night: 4, ap: 2, stepId: 'n4_hub', flags: { quiz_grade: 'A', archive_film: true },
  dlc: { ch2: { done: true, certificate: { code: 'YSK2-KEEP' } }, dr: { done: true }, dsa: { dose: 280 } } }
const active = selectLdctStory(initializeLdct(copy(base)), 'father')
function atChest(state, draft = initial) {
  const p = { ...getLdctProgress(state), phase: 'lab', nodeId: 'lf_lab_5', labRound: 5, labDraft: copy(draft), labReturn: undefined }
  const shelf = getLdctShelf(state)
  return { ...state, dlc: { ...state.dlc, ldct: { ...state.dlc.ldct, ldct: p,
    ldctStories: { ...shelf, active: 'father', slots: { ...shelf.slots, father: p } } } } }
}
const stats = s => ({ gold: s.gold, skill: s.skill, heart: s.heart, wealth: s.wealth, badges: s.badges })
// A new anatomy must never inherit the old image's marker or pinned frame.
const legacyState = atChest(copy(active), compared)
const legacyProgress = getLdctProgress(legacyState)
delete legacyProgress.chestSourceVersion
legacyProgress.records[5] = copy(legacyChest)
const migrated = initializeLdct(copy(legacyState))
assert.deepEqual(getLdctProgress(migrated).labDraft, initial)
assert.deepEqual(getLdctProgress(migrated).previousChest, { draft: compared, record: legacyChest })
assert.deepEqual(getLdctProgress(migrated).records[5], legacyChest)
assert.deepEqual(stats(migrated), stats(legacyState))
assert.deepEqual(initializeLdct(copy(migrated)), migrated, 'migration is idempotent')
assert.deepEqual(migrated.dlc.ch2, base.dlc.ch2)
assert.deepEqual(migrated.dlc.dr, base.dlc.dr)
assert.deepEqual(migrated.dlc.dsa, base.dlc.dsa)
const settledLegacy = atChest(migrated)
getLdctProgress(settledLegacy).phase = 'settle'
const reopened = ldctAction(settledLegacy, { type: 'lab:open', round: 5 })
assert.deepEqual(getLdctProgress(reopened).labDraft, initial, 'historical record opens a fresh new-source draft')

// Sound receipts never advance dialogue, reward, or block subsequent actions.
const entrance = atChest(active)
Object.assign(getLdctProgress(entrance), { nodeId: 'lf_welcome', phase: 'story' })
const heardAction = { type: 'media:heard', nodeId: 'lf_welcome', cueId: 'voice:lf_welcome:v1' }
const heard = ldctAction(entrance, heardAction)
assert.deepEqual(stats(heard), stats(entrance))
assert.equal(getLdctProgress(heard).nodeId, 'lf_welcome')
assert.equal(getLdctProgress(heard).revision, getLdctProgress(entrance).revision)
assert(getLdctProgress(heard).receipts.includes('media:voice:lf_welcome:v1'))
assert.equal(ldctAction(heard, heardAction), heard)
assert.equal(ldctAction(heard, { ...heardAction, nodeId: 'lf_scan_2' }), heard)
assert.equal(getLdctProgress(ldctAction(heard, { type: 'advance', nodeId: 'lf_welcome' })).nodeId, 'lf_arrive_0')
let state = atChest(active)
state = ldctAction(state, { type: 'lab:update', value: compared })
const updated = state
assert.deepEqual(getLdctProgress(copy(state)).labDraft, compared)
assert.deepEqual(stats(ldctAction(state, { type: 'lab:update', value: compared })), stats(state), 'updating a draft never awards')
assert.equal(ldctAction(state, { type: 'lab:submit', record: { ...record, chest: { ...record.chest, slice: 0 } } }), state,
  'a submitted result must match the saved draft, including layer and mark provenance')
state = ldctAction(copy(state), { type: 'lab:submit', record })
assert.equal(getLdctProgress(state).phase, 'story')
assert.deepEqual(getLdctProgress(state).records[5], record)
assert.equal(state.skill, updated.skill + 1)
assert.equal(ldctAction(state, { type: 'lab:submit', record }), state, 'duplicate submit cannot award again')
const resumed = copy(state)
assert.equal(ldctAction(resumed, { type: 'lab:submit', record }), resumed, 'refresh does not reopen the completed transaction')
assert.deepEqual(state.dlc.ch2, base.dlc.ch2)
assert.deepEqual(state.dlc.dr, base.dlc.dr)
assert.deepEqual(state.dlc.dsa, base.dlc.dsa)
assert.deepEqual(state.flags, base.flags)
assert.equal(state.night, base.night)
assert.equal(state.ap, base.ap)

// Reopening a lab deliberately may store another observation, not another reward.
const replay = atChest(state, compared)
const again = ldctAction(replay, { type: 'lab:submit', record })
assert.deepEqual(stats(again), stats(state))
const helped = ldctAction(atChest(active), { type: 'lab:submit', record: help })
assert.equal(getLdctProgress(helped).phase, 'story')
assert.equal(getLdctProgress(helped).records[5].helped, true)

console.log('LDCT chest: preload boundary, draft/pin/layers/marks, source checks, help, legacy records and duplicate transactions passed')
