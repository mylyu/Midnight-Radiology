// Focused data contract, without current-story/session fixtures or a browser/build.
// app/: node --import tsx tests/ldct-phantom-preparation.mjs
import assert from 'node:assert/strict'
import { createLdctLabState, createLdctPhantomPreparationState, createLdctRecord, isValidLdctRecord,
  labStateValid, ldctExperimentReady, ldctRecordSummary, LDCT_LAB_MEDIA_IDS, LDCT_PHANTOM_VERSION } from '../src/game/ldct-experiments.ts'
import { LDCT_PHANTOM_EXPOSURE_VERSION, LDCT_PHANTOM_IR_VERSION, LDCT_PHANTOM_EXPERIMENT_MEDIA_IDS } from '../src/game/ldct-phantom-exposure.ts'
import { LDCT_NOISY_DATA_VERSION, LDCT_NOISY_EXPOSURE_VERSION, LDCT_NOISY_CHEST_VERSION } from '../src/game/ldct-noisy-chest.ts'
import { LDCT_DEEP_EXPOSURE_VERSION, LDCT_DEEP_CHEST_VERSION } from '../src/game/ldct-deep-experiments.ts'
import { LDCT_EXPOSURE_VERSION } from '../src/game/ldct-exposure.ts'
import { LDCT_CHEST_VERSION } from '../src/game/ldct-chest.ts'

const clone = value => JSON.parse(JSON.stringify(value))
for (const id of LDCT_PHANTOM_EXPERIMENT_MEDIA_IDS) assert(LDCT_LAB_MEDIA_IDS.includes(id), `${id}: registered for preload`)
for (const round of [4, 5]) {
  const initial = createLdctPhantomPreparationState(round)
  const field = round === 4 ? 'exposureCount' : 'iterationRound'
  const first = round === 4 ? 1 : 0, last = round === 4 ? 13 : 12
  const source = round === 4 ? LDCT_PHANTOM_EXPOSURE_VERSION : LDCT_PHANTOM_IR_VERSION
  assert.equal(initial.phantomDataVersion, LDCT_PHANTOM_EXPOSURE_VERSION)
  assert.equal(initial.chest, undefined)
  assert.equal(initial.chestDataVersion, undefined)
  assert.equal(initial[field], first)
  assert(labStateValid(initial, round))
  assert(!ldctExperimentReady(initial, round))
  for (let count = first; count <= last; count++) {
    const draft = { ...initial, [field]: count }
    assert(labStateValid(draft, round))
    const ready = round === 4 ? count === 13 : count >= 10
    assert.equal(ldctExperimentReady(draft, round), ready)
    const direct = createLdctRecord(draft, round, 'different', 'phantom')
    assert.equal(Boolean(direct), ready)
    const record = direct ?? createLdctRecord({ ...draft, helped: true }, round, 'uncertain', 'phantom')
    assert(isValidLdctRecord(record, round))
    assert.equal(record.sourceVersion, source)
    assert.equal(record.dataset, 'phantom')
    assert.equal(record.phantomDataVersion, LDCT_PHANTOM_EXPOSURE_VERSION)
    assert.equal(record[field], count, 'help records actual progress, not fabricated completed clicks')
    assert.equal(record.helped, !ready)
    assert.equal(record.chest, undefined)
    assert.equal(record.chestDataVersion, undefined)
    assert(labStateValid({ ...draft, saved: clone(record) }, round), 'a saved record stays on the same input')
    assert.match(ldctRecordSummary(record), /实体模体/)
    if (round === 5) assert.match(ldctRecordSummary(record), /第13份曝光/)
    for (const dataset of ['chest', 'face', 'nut'])
      assert.equal(createLdctRecord({ ...draft, helped: true }, round, 'uncertain', dataset), null, 'new phantom cannot relabel another anatomy')
  }
  for (const count of [first - 1, last + 1, .5, Number.NaN, Number.POSITIVE_INFINITY]) {
    const invalid = { ...initial, [field]: count, helped: true }
    assert(!labStateValid(invalid, round))
    assert.equal(createLdctRecord(invalid, round, 'uncertain', 'phantom'), null)
  }
  const helped = { ...initial, helped: true }
  const record = createLdctRecord(helped, round, 'uncertain', 'phantom')
  for (const patch of [
    { phantomDataVersion: 'unknown-input' },
    { chestDataVersion: LDCT_NOISY_DATA_VERSION },
    { chest: createLdctLabState(5, 'chest').chest },
    round === 4 ? { iterationRound: 0 } : { exposureCount: 13 },
    round === 4 ? { exposureStep: 4 } : { exposureStep: 0 },
  ]) {
    assert(!labStateValid({ ...helped, ...patch }, round), 'reject mixed input controls')
    assert(!isValidLdctRecord({ ...record, ...patch }, round), 'reject mixed input records')
  }
  for (const patch of [
    { phantomDataVersion: undefined },
    { sourceVersion: LDCT_PHANTOM_VERSION },
    { sourceVersion: round === 4 ? LDCT_PHANTOM_IR_VERSION : LDCT_PHANTOM_EXPOSURE_VERSION },
    { sourceVersion: round === 4 ? LDCT_NOISY_EXPOSURE_VERSION : LDCT_NOISY_CHEST_VERSION },
    { dataset: 'chest' }, { dataset: 'face' }, { seed: 2259 },
  ]) assert(!isValidLdctRecord({ ...record, ...patch }, round), 'source, object, seed and input version must agree')
  const ordinary = { ...createLdctLabState(round), helped: true }
  const oldRecord = createLdctRecord(ordinary, round, 'uncertain', 'phantom')
  assert(isValidLdctRecord(oldRecord, round), 'old phantom controls still make old records')
  assert.equal(oldRecord.phantomDataVersion, undefined)
  assert.equal(oldRecord.sourceVersion, LDCT_PHANTOM_VERSION)
  assert(!labStateValid({ ...initial, saved: oldRecord }, round), 'old result cannot be pinned into new input')
  assert(!labStateValid({ ...ordinary, saved: record }, round), 'new result cannot be silently attached to old input')
  assert.equal(ldctExperimentReady({ ...initial, practice: true }, round), round === 5, 'untimed IR stays optional, exposure completion cannot be bypassed by practice')
}

// Historical/current chest factories and record identities are unchanged.
for (const round of [4, 5]) {
  const noisy = { ...createLdctLabState(round, 'chest'), helped: true }
  const current = createLdctRecord(noisy, round, 'uncertain', 'chest')
  assert(isValidLdctRecord(current, round))
  assert.equal(current.sourceVersion, round === 4 ? LDCT_NOISY_EXPOSURE_VERSION : LDCT_NOISY_CHEST_VERSION)
  assert.equal(current.phantomDataVersion, undefined)
  const deep = { ...noisy }; delete deep.chestDataVersion
  const deepRecord = createLdctRecord(deep, round, 'uncertain', 'chest')
  assert(isValidLdctRecord(deepRecord, round))
  assert.equal(deepRecord.sourceVersion, round === 4 ? LDCT_DEEP_EXPOSURE_VERSION : LDCT_DEEP_CHEST_VERSION)
  const old = { ...deep }; delete old.exposureCount; delete old.iterationRound
  const oldRecord = createLdctRecord(old, round, 'uncertain', 'chest')
  assert(isValidLdctRecord(oldRecord, round))
  assert.equal(oldRecord.sourceVersion, round === 4 ? LDCT_EXPOSURE_VERSION : LDCT_CHEST_VERSION)
}
for (const round of [1, 2, 3]) {
  const old = { ...createLdctLabState(round), helped: true }
  assert(labStateValid(old, round))
  assert(isValidLdctRecord(createLdctRecord(old, round, 'uncertain'), round))
  assert(!labStateValid({ ...old, phantomDataVersion: LDCT_PHANTOM_EXPOSURE_VERSION }, round))
}
console.log('LDCT physical phantom: 13 exposures, IR thresholds/help/practice, exact source identity and historical records passed')
