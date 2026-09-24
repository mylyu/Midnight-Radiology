// One-clip correction only: preserve the entire accepted d15e47b game, apart
// from Kai's Chapter 2 entrance alias. Automated QA is not listener approval.
import assert from 'node:assert/strict'
import { deliveryManifest, historicalRetiredReference } from './game-delivery-media.mjs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { beforeLoopSource } from './ch2-loop-projection.mjs'
import { beforeApprovedCh1Voices } from './ch1-approved-voices-projection.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const baseline = 'd15e47b'
const oldAlias = 'vox_ch2_natural_kai_light_v3'
const alias = 'vox_ch2_natural_kai_whisper_v4'
const text = '跟你说个事儿。'
const output = `app/public/audio/${alias}.mp3`
const git = (...args) => execFileSync('git', args, { cwd: root, maxBuffer: 24 * 1024 * 1024 })
const bytes = file => readFileSync(path.join(root, file))
const read = file => beforeApprovedCh1Voices(file,
  beforeLoopSource(file, bytes(file).toString('utf8').replaceAll('\r\n', '\n')))
const original = file => git('show', `${baseline}:${file}`).toString('utf8').replaceAll('\r\n', '\n')
const sha256 = data => createHash('sha256').update(data).digest('hex')

// This round may not change dialogue, rewards, choices or any shared runtime.
// Subsequent author request only lightens the final word; audit the preserved
// v4 generation below after reversing that one explicitly allowed alias.
const story = read('app/src/game/ch2.ts').replace("sfx: 'vox_ch2_natural_kai_noref_b_v9'", `sfx: '${alias}'`)
assert.equal(story.split(`sfx: '${alias}'`).length - 1, 1, 'Exactly one new Kai entrance alias')
assert.match(story, new RegExp(`c2n1_b1: \\{ speaker: 'kai', sprite: 'char_kai', sfx: '${alias}', text: "跟你说个事儿。`))
assert.equal(story.replace(`sfx: '${alias}'`, `sfx: '${oldAlias}'`), original('app/src/game/ch2.ts'),
  'Reversing the single audio alias must restore the complete accepted story')
for (const file of ['app/src/App.tsx', 'app/src/game/store.ts', 'app/src/game/data.ts',
  'app/src/game/dlc.ts', 'app/src/game/types.ts']) {
  assert.equal(read(file), original(file), `Shared runtime/data changed in a one-clip correction: ${file}`)
}

// Check every existing sound, including earlier Chapter 2 versions, not just
// the older Chapter 1 freeze baseline. The v4 asset must be strictly additive.
const audioBlobs = git('ls-tree', '-r', '-z', baseline, '--', 'app/public/audio')
  .toString('utf8').split('\0').filter(Boolean)
assert(audioBlobs.length > 0, 'Audio baseline must not be an empty pathspec')
for (const line of audioBlobs) {
  const match = /^\d+ blob ([0-9a-f]+)\t(.+)$/.exec(line)
  assert(match, `Unexpected audio Git entry: ${line}`)
  const [, expected, file] = match
  const content = bytes(file)
  const actual = createHash('sha1').update(`blob ${content.length}\0`).update(content).digest('hex')
  assert.equal(actual, expected, `Previously published/local audio overwritten: ${file}`)
  assert.notEqual(file, output, 'Use an additive filename for the new performance')
}

const record = JSON.parse(read('docs/ch2-kai-whisper-v4.json'))
const selected = record.selected
const contentHash = sha256(bytes(output))
assert.equal(record.baseline, baseline)
assert.equal(record.role, '小凯')
assert.equal(record.text, text)
assert.equal(record.output, output)
assert.equal(selected.text, text)
assert.equal(selected.sha256, contentHash)
assert.equal(selected.attempt, record.selected_attempt)
assert.equal(selected.task, 'speech-edit/whisper-conversion')
assert.equal(record.candidates.find(row => row.attempt === record.selected_attempt)?.sha256, contentHash)
assert.match(record.processing_note, /no pitch shift or time stretch/i)
assert.equal(record.user_approved, false, 'Automated tests cannot claim user listening approval')
assert.equal(record.generator_sha256, sha256(bytes(record.generator)), 'Keep the actual generation recipe reproducible')

// Speech editing must actually receive source audio and an explicit whispered
// delivery instruction. Merely changing pitch/tempo or picking a new seed is
// not the requested performance correction.
const argv = selected.argv
assert(Array.isArray(argv))
assert.match(argv[0], /auk-infer(?:\.exe)?$/)
const arg = key => {
  const index = argv.indexOf(key)
  assert(index >= 0 && index + 1 < argv.length, `Missing explicit AuK argument ${key}`)
  return argv[index + 1]
}
assert.equal(arg('--instruction'), selected.instruction)
assert.match(selected.instruction, /耳语|悄悄话|whisper/i)
assert.match(record.direction, /句尾.*落下.*上扬/, 'Record the requested performance separately from the actual generation template')
assert.equal(arg('--audio'), selected.reference_path)
assert.match(arg('--ckpt'), /AuK-Flash/)
assert.match(arg('--qwen_path'), /Qwen2\.5-Omni-3B/)
assert.equal(arg('--dtype'), 'bf16')
assert.equal(arg('--device'), 'cuda:0')
assert(argv.includes('--cpu_offload'))
assert.equal(Number(arg('--seed')), selected.seed)
assert.equal(Number(arg('--gen_seconds')), selected.seconds)
assert(!argv.includes('--gen_text'), 'Use the source-preserving speech-edit task, not a fresh TTS reading')
assert.equal(selected.original_voice_reference_sha256, sha256(bytes('app/public/audio/vox_kai.mp3')))
assert([
  sha256(bytes('app/public/audio/vox_ch2_natural_kai_v2.mp3')),
  sha256(bytes(`app/public/audio/${oldAlias}.mp3`)),
].includes(selected.reference_sha256), 'Editing input must descend from the same fixed Kai reference')
const filters = selected.processing.split(',').map(filter => filter.split('=')[0])
assert(filters.includes('silenceremove') && filters.includes('loudnorm'))
for (const filter of filters) assert(['silenceremove', 'loudnorm'].includes(filter), `Unapproved voice processing: ${filter}`)

const acoustic = record.acoustic_qa.find(row => row.sha256 === contentHash)
assert(acoustic, 'Selected clip needs its own hashed acoustic/ASR record')
assert.equal(acoustic.sample_rate, 24000)
assert.equal(acoustic.mono, true)
assert.equal(acoustic.finite, true)
assert(acoustic.seconds > 0.5 && acoustic.seconds < 4)
assert(acoustic.peak < 0.98 && acoustic.rms > 0.003)
const normalize = value => value.replace(/[^\p{Script=Han}]/gu, '')
assert.equal(normalize(acoustic.transcript), normalize(text), 'Check words independently of the generated-text declaration')
const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries',
  'stream=codec_name,sample_rate,channels', '-of', 'json', path.join(root, output)], { encoding: 'utf8' }))
assert.equal(probe.streams.length, 1)
assert.deepEqual(probe.streams[0], { codec_name: 'mp3', sample_rate: '24000', channels: 1 })

assert(deliveryManifest().removed.some(row => row.path === 'app/public/ch2-pacing-preview.html'),
  'Static A/B audition page retirement must be explicitly reviewed; all original audio/blob/acoustic checks above remain active')
const historicalPreview = historicalRetiredReference('app/public/ch2-pacing-preview.html').toString('utf8')
const sources = [...historicalPreview.matchAll(/<audio\b[^>]*\bsrc="([^"]+)"/g)].map(match => match[1])
assert(sources.some(source => source.split('?')[0] === `audio/${alias}.mp3`), 'Historical A/B preview linked the reviewed v4')
assert(sources.some(source => source.split('?')[0] === `audio/${oldAlias}.mp3`), 'Historical A/B preview also linked rejected v3')
assert.match(historicalPreview, /悄悄话|耳语/)
assert(!historicalPreview.includes('localStorage'), 'Historical static audition did not access player progress')

console.log(`PASS Kai whisper v4: single Chapter 2 alias; ${audioBlobs.length} old audio blobs intact; shared runtime frozen; same-voice AuK speech edit and hashes; exact words and MP3 decode. Static A/B preview explicitly retired, not counted as browser PASS. Performance still requires user audition.`)
