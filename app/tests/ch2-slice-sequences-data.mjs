// Final, real atlas acceptance checks. An empty registry is a failure, not a skipped pass.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { CH2_SCANS, CH2_SCAN_AUDIO, ch2ScanFrame } from '../src/game/ch2-scans.ts'
import { CH2_SHIFTS } from '../src/game/ch2.ts'
import { CH2_SLICE_SEQUENCES, getCh2SliceSequence, ch2SliceFrameIndex } from '../src/game/ch2-scan-sequences.ts'

const sharp = createRequire(import.meta.url)('sharp')
export const expectedAcquisitions = [
  'c2n1_m7', 'c2n1_p_scan', 'c2d2_lung_scan', 'c2d2_gut_scan', 'c2d2_trauma_scan',
  'c2d2_wrist_scan', 'c2n3_m5', 'c2n3_repeat_scan', 'c2n3_cta_scan', 'c2n3_coronary_scan',
  'c2n3_mystery_scan', 'c2d4_aorta_scan', 'c2d4_metal_scan', 'c2n5_child_scan', 'c2d4_m1',
]
export const expectedConsole = ['c2n3_repeat_scan', 'c2n3_cta_scan', 'c2d4_m1']
// Explicit user-approved exception: preserve the pediatric machine scene until
// an appropriate reviewed child sequence exists. No other acquisition is exempt.
export const approvedMachineOnly = 'c2n5_child_scan'
export const expectedSequenceAcquisitions = expectedAcquisitions.filter(id => id !== approvedMachineOnly)
export const expectedReconstruction = ['c2d2_w1', 'c2n3_coronary_volume']
export const expectedAudioSha256 = '27ce2978e81ab5a2ada579e528219814243e86fedd5da554e6cf4d8df862f633'
export const assetAudits = []
const perAssetByteLimit = 100 * 1024, totalByteLimit = Math.floor(1.2 * 1024 * 1024)
const sorted = values => [...values].sort()
assert.deepEqual(sorted(Object.keys(CH2_SCANS).filter(id => CH2_SCANS[id].mode === 'acquire')), sorted(expectedAcquisitions))
assert.deepEqual(sorted(Object.keys(CH2_SCANS).filter(id => CH2_SCANS[id].mode === 'reconstruct')), sorted(expectedReconstruction))
assert.deepEqual(sorted(expectedAcquisitions.filter(id => CH2_SCANS[id].presentation === 'console')), sorted(expectedConsole))
assert.equal(expectedAcquisitions.filter(id => CH2_SCANS[id].presentation === 'dual').length, 11)
assert.deepEqual(expectedAcquisitions.filter(id => CH2_SCANS[id].presentation === 'machine'), [approvedMachineOnly])

const checkedAssets = new Map()
for (const id of expectedAcquisitions) {
  const config = CH2_SCANS[id]
  assert.equal(config.durationMs, 3000, `${id}: a presentation change cannot shorten an acquisition`)
  assert.equal(config.presentation, id === approvedMachineOnly ? 'machine' : expectedConsole.includes(id) ? 'console' : 'dual')
  const step = CH2_SHIFTS.find(shift => shift.steps[id])?.steps[id]
  assert(step?.next, `${id}: the original acquisition retains its actual successor`)
  assert.equal(step.effect, undefined)
  assert.equal(step.sfx, undefined, 'Do not play a second acquisition sound after the overlay')
  if (id === approvedMachineOnly) {
    assert.equal(config.sequence, undefined, 'Approved pediatric exception must not substitute an adult or unreviewed atlas')
    assert.equal(ch2ScanFrame(config, 1000, 3999).complete, false)
    assert.equal(ch2ScanFrame(config, 1000, 4000).complete, true)
    continue
  }
  const sequence = getCh2SliceSequence(config.sequence)
  assert(sequence, `${id}: no reviewed sequence admitted; do not substitute a test/fabricated atlas or report coverage`)
  assert(Object.values(CH2_SLICE_SEQUENCES).includes(sequence), `${id}: sequence is explicitly registered`)
  assert.match(sequence.asset, /^assets\/ct-sequences\/[a-zA-Z0-9_.-]+\.(?:webp|png)$/)
  assert.doesNotMatch(sequence.asset, /(?:fixture|placeholder|mock|demo)/i)
  assert(sequence.label.trim().length > 0)
  assert.doesNotMatch(sequence.label, /血肿|结石|夹层|狭窄|闭塞|病灶|无异常|运动伪影|金属伪影/, 'Visible protocol labels must not reveal the observation answer')
  for (const key of ['frameCount', 'columns', 'rows', 'frameWidth', 'frameHeight']) {
    assert(Number.isInteger(sequence[key]) && sequence[key] > 0, `${id}: valid ${key}`)
  }
  assert(sequence.frameCount >= 16, `${id}: at least sixteen actual slice frames`)
  assert(sequence.frameCount <= sequence.columns * sequence.rows)
  assert.match(sequence.preview ?? '', /^data:image\/webp;base64,[A-Za-z0-9+/]+=*$/, `${id}: inline first-frame preview is present, not another network request`)
  const previewBytes = Buffer.from(sequence.preview.split(',')[1], 'base64')
  assert(previewBytes.length <= 2048, `${id}: the inline weak-network fallback is genuinely small`)
  const previewMetadata = await sharp(previewBytes).metadata()
  assert(previewMetadata.width >= 16 && previewMetadata.width <= 64 && previewMetadata.height >= 16 && previewMetadata.height <= 64)
  assert.equal(previewMetadata.pages ?? 1, 1, 'The fallback is a still first frame, not an independent animation')
  assert.equal(ch2SliceFrameIndex(sequence, 0), 0)
  assert.equal(ch2SliceFrameIndex(sequence, 1), sequence.frameCount - 1)
  assert.equal(ch2SliceFrameIndex(sequence, -1), 0)
  assert.equal(ch2SliceFrameIndex(sequence, 2), sequence.frameCount - 1)
  assert.equal(ch2SliceFrameIndex(sequence, NaN), sequence.frameCount - 1)
  let last = -1
  for (let elapsed = 0; elapsed <= 3400; elapsed += 10) {
    const clock = ch2ScanFrame(config, 1000, 1000 + elapsed)
    const frame = ch2SliceFrameIndex(sequence, clock.progress)
    assert(frame >= 0 && frame < sequence.frameCount)
    assert(frame >= last, `${id}: the same-clock sequence cannot wrap or reverse`)
    assert.equal(frame, Math.min(sequence.frameCount - 1, Math.floor(clock.progress * sequence.frameCount)))
    assert.equal(clock.complete, elapsed >= 3000)
    last = frame
  }
  assert.equal(ch2ScanFrame(config, 1000, 2500).progress, 0.5)
  assert.equal(ch2SliceFrameIndex(sequence, ch2ScanFrame(config, 1000, 2500).progress), Math.floor(sequence.frameCount / 2),
    `${id}: restoring at 1.5 seconds resumes the middle, not frame zero`)

  if (!checkedAssets.has(sequence.asset)) {
    const path = new URL(`../public/${sequence.asset}`, import.meta.url)
    const bytes = readFileSync(path)
    assert(bytes.length <= perAssetByteLimit, `${sequence.asset}: ${bytes.length} bytes exceeds the 100 KiB weak-network limit`)
    const metadata = await sharp(bytes).metadata()
    assert.equal(metadata.width, sequence.columns * sequence.frameWidth)
    assert.equal(metadata.height, sequence.rows * sequence.frameHeight)
    assert((metadata.pages ?? 1) === 1, 'Use one static atlas, never a separately looping animation')
    const { data, info } = await sharp(bytes).raw().toBuffer({ resolveWithObject: true })
    const fingerprints = []
    for (let frame = 0; frame < sequence.frameCount; frame++) {
      const hash = createHash('sha256'), x = frame % sequence.columns * sequence.frameWidth
      const y = Math.floor(frame / sequence.columns) * sequence.frameHeight
      for (let row = 0; row < sequence.frameHeight; row++) {
        const offset = ((y + row) * info.width + x) * info.channels
        hash.update(data.subarray(offset, offset + sequence.frameWidth * info.channels))
      }
      fingerprints.push(hash.digest('hex'))
    }
    assert(new Set(fingerprints).size >= 16, 'An atlas must contain at least sixteen distinct frames, not copies of one image')
    const audit = { asset: sequence.asset, sha256: createHash('sha256').update(bytes).digest('hex'),
      width: metadata.width, height: metadata.height, frames: sequence.frameCount, distinctFrames: new Set(fingerprints).size,
      bytes: bytes.length, preview: sequence.preview }
    checkedAssets.set(sequence.asset, audit)
    assetAudits.push(audit)
  }
  const asset = checkedAssets.get(sequence.asset)
  assert.equal(asset.width, sequence.columns * sequence.frameWidth, `${id}: reused atlas width still matches this sequence`)
  assert.equal(asset.height, sequence.rows * sequence.frameHeight, `${id}: reused atlas height still matches this sequence`)
  assert.equal(asset.preview, sequence.preview, `${id}: aliases of one atlas use the same inline first frame`)
  const firstFrame = await sharp(readFileSync(new URL(`../public/${sequence.asset}`, import.meta.url)))
    .extract({ left: 0, top: 0, width: sequence.frameWidth, height: sequence.frameHeight })
    .resize(previewMetadata.width, previewMetadata.height).removeAlpha().greyscale().raw().toBuffer()
  const previewPixels = await sharp(previewBytes).removeAlpha().greyscale().raw().toBuffer()
  const meanAbsoluteError = firstFrame.reduce((sum, pixel, index) => sum + Math.abs(pixel - previewPixels[index]), 0) / firstFrame.length
  assert(meanAbsoluteError < 25, `${id}: compressed inline fallback remains the same atlas first frame, not another body region`)
}

assert.equal(assetAudits.length, 12, 'Fourteen slice-enabled acquisitions use exactly twelve reviewed static atlases')
assert(assetAudits.reduce((sum, asset) => sum + asset.bytes, 0) <= totalByteLimit, 'The twelve unique atlases fit the 1.2 MiB delivery budget')

// This checks recorded provenance and actual delivered bytes. It cannot clinically
// establish anatomy, protocol suitability or diagnostic correctness from pixel hashes.
const manifest = JSON.parse(readFileSync(new URL('../../docs/ch2-ct-sequences-assets.json', import.meta.url), 'utf8'))
const textOrList = value => typeof value === 'string' ? value.trim().length > 0
  : Array.isArray(value) && value.length > 0 && value.every(item => typeof item === 'string' && item.trim().length > 0)
assert.equal(manifest.status, 'reviewed')
assert.equal(typeof manifest.baseline, 'string'); assert(manifest.baseline.trim())
assert.deepEqual(manifest.approvedExceptions.map(row => row.scanId), [approvedMachineOnly])
assert(textOrList(manifest.approvedExceptions[0].reason))
assert(Array.isArray(manifest.sources) && manifest.sources.length > 0)
const sourceById = new Map(manifest.sources.map(source => [source.id, source]))
assert.equal(sourceById.size, manifest.sources.length, 'Source identifiers are unique')
for (const source of manifest.sources) {
  for (const key of ['id', 'title', 'license']) assert(textOrList(source[key]), `Source records ${key}`)
  assert(textOrList(source.authors)); assert(textOrList(source.limitations))
  for (const key of ['url', 'licenseUrl']) assert.match(source[key], /^https?:\/\//)
  assert(Object.hasOwn(source, 'commercialRestriction'), 'Do not silently omit commercial licensing limitations')
  if (/imagecas/i.test(`${source.id} ${source.title}`)) {
    assert.equal(source.commercialRestriction, 'replace-or-obtain-license-before-commercial-use')
  }
}
assert.equal(manifest.sequences.length, 12)
assert.equal(manifest.totalBytes, assetAudits.reduce((sum, asset) => sum + asset.bytes, 0))
assert.deepEqual(sorted(manifest.sequences.map(row => row.asset)), sorted(checkedAssets.keys()))
const manifestByAsset = new Map(manifest.sequences.map(row => [row.asset, row]))
const covered = []
for (const row of manifest.sequences) {
  const source = sourceById.get(row.sourceId), actual = checkedAssets.get(row.asset)
  assert(source, `${row.asset}: recorded sourceId resolves`)
  assert.equal(row.sha256, actual.sha256, `${row.asset}: provenance is for the actual delivered atlas`)
  assert.equal(row.bytes, actual.bytes)
  assert(Array.isArray(row.scanIds) && row.scanIds.length > 0)
  covered.push(...row.scanIds)
  assert(row.processing && typeof row.processing === 'object' && Object.keys(row.processing).length > 0)
  assert(row.processing.delivery && typeof row.processing.delivery === 'object', 'Weak-network delivery processing is recorded')
  assert.equal(row.processing.delivery.bytes, actual.bytes)
  assert.equal(row.processing.delivery.sha256, actual.sha256)
  assert.equal(row.processing.delivery.lossless, false, 'Delivery is the reviewed compressed WebP, not the oversized master')
  assert.equal(row.processing.delivery.previewBytes, Buffer.from(actual.preview.split(',')[1], 'base64').length)
  for (const key of ['anatomy', 'protocol', 'ageGroup', 'note']) assert(textOrList(row.review?.[key]), `${row.asset}: review records ${key}`)
  assert(['none', 'simulated-motion', 'simulated-metal'].includes(row.review.artifact))
  for (const id of row.scanIds) {
    assert(expectedSequenceAcquisitions.includes(id), `${row.asset}: only the fourteen approved scan bindings`)
    const sequence = getCh2SliceSequence(CH2_SCANS[id].sequence)
    assert.equal(sequence.asset, row.asset)
    for (const key of ['frameCount', 'columns', 'rows', 'frameWidth', 'frameHeight']) assert.equal(row[key], sequence[key])
  }
  if (row.scanIds.includes('c2d2_wrist_scan')) {
    assert.match(JSON.stringify(source.limitations), /cadaver|donat|遗体|尸体/i, 'The wrist donated-body source limitation remains explicit')
  }
}
assert.deepEqual(sorted(covered), sorted(expectedSequenceAcquisitions), 'Every non-pediatric acquisition is covered once, with no extra or missing bindings')
for (const [id, artifact] of [['c2n3_m5', 'simulated-motion'], ['c2d4_metal_scan', 'simulated-metal'],
  ['c2n3_repeat_scan', 'none'], ['c2d4_m1', 'none']]) {
  const row = manifestByAsset.get(getCh2SliceSequence(CH2_SCANS[id].sequence).asset)
  assert.equal(row.review.artifact, artifact, `${id}: motion/metal teaching processing is explicit, not claimed as original clinical pathology`)
}

for (const [before, after] of [['c2n3_m5', 'c2n3_repeat_scan'], ['c2d4_metal_scan', 'c2d4_m1']]) {
  const a = getCh2SliceSequence(CH2_SCANS[before].sequence), b = getCh2SliceSequence(CH2_SCANS[after].sequence)
  assert.notEqual(a.asset, b.asset, `${before}/${after}: artifact and post-correction acquisitions are different sequences`)
  assert.notEqual(checkedAssets.get(a.asset).sha256, checkedAssets.get(b.asset).sha256, 'Renaming the same image is not a distinct sequence')
}
for (const id of expectedReconstruction) {
  assert.equal(CH2_SCANS[id].durationMs, 1500)
  assert.equal(ch2ScanFrame(CH2_SCANS[id], 1000, 2499).complete, false)
  assert.equal(ch2ScanFrame(CH2_SCANS[id], 1000, 2500).complete, true)
  assert.match(CH2_SCANS[id].detail, /同一次采集.*不再次曝光/)
}
assert.equal(getCh2SliceSequence(undefined), undefined)
assert.equal(getCh2SliceSequence('not-a-registered-sequence'), undefined)
assert.equal(CH2_SCAN_AUDIO.acquisition, 'ch2_ct_real_scan_20260924')
const audio = readFileSync(new URL(`../public/audio/${CH2_SCAN_AUDIO.acquisition}.mp3`, import.meta.url))
assert.equal(createHash('sha256').update(audio).digest('hex'), expectedAudioSha256)
const audioProvenance = JSON.parse(readFileSync(new URL('../../docs/ch2-real-ct-audio.json', import.meta.url), 'utf8'))
assert.equal(audioProvenance.sha256, expectedAudioSha256)
assert.equal(audioProvenance.processing.trimSeconds, 3)
assert.equal(audioProvenance.playbackGain, 0.24)
const component = readFileSync(new URL('../src/components/Ch2SliceSequence.tsx', import.meta.url), 'utf8')
assert.doesNotMatch(component, /setInterval|setTimeout|requestAnimationFrame|animationend|onDone|new Audio|\.play\(/,
  'The atlas component must not add a lifecycle clock, finish callback or sound')
console.log(`PASS slice data: 15 real 3s acquisitions (11 dual/3 console with real sequences; 1 explicitly approved pediatric machine-only exception), 2 unchanged 1.5s reconstructions, ${assetAudits.length} decoded/provenance-matched atlases <=100KiB each and <=1.2MiB total, same-source inline first frames, monotonic same-clock frames and original recording SHA. Clinical suitability is recorded review, not established by this software check.`)
