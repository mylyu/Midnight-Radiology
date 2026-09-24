// Adopt exactly the user's approved B audition. No regeneration, remastering,
// other voices, dialogue or shared game logic are part of this replacement.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeLoopSource } from './ch2-loop-projection.mjs'
import { beforeApprovedCh1Voices } from './ch1-approved-voices-projection.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const baseline = 'a542af1'
const alias = 'vox_ch2_natural_kai_noref_b_v9'
const oldAlias = 'vox_ch2_natural_kai_whisper_v4'
const source = 'app/public/auditions/kai-no-reference-v9/b.mp3'
const output = `app/public/audio/${alias}.mp3`
const approvedHash = '236c804dc8f4137c8c5763ac72e54417d893b9ca6182ba7aed66aa9d9a7f812b'
const bytes = file => readFileSync(path.join(root, file))
const read = file => beforeApprovedCh1Voices(file,
  beforeLoopSource(file, bytes(file).toString('utf8').replaceAll('\r\n', '\n')))
const git = (...args) => execFileSync('git', args, { cwd: root, maxBuffer: 24 * 1024 * 1024 })
const original = file => git('show', `${baseline}:${file}`).toString('utf8').replaceAll('\r\n', '\n')
const sha256 = data => createHash('sha256').update(data).digest('hex')

assert.equal(sha256(bytes(source)), approvedHash, 'The audition B heard by the user must remain unchanged')
assert.deepEqual(bytes(output), bytes(source), 'Use the approved MP3 byte-for-byte; do not regenerate or apply more effects')
const record = JSON.parse(read('docs/ch2-kai-selected-b.json'))
assert.equal(record.baseline, baseline)
assert.equal(record.selected_candidate, 'b')
assert.equal(record.source, source)
assert.equal(record.output, output)
assert.equal(record.sha256, approvedHash)
assert.equal(record.user_approved, true)
assert.equal(record.user_request, 'B更好，替换吧。')

// Inspect the actual generation record rather than treating a no-reference
// label or the prompt's delivery description as evidence about its inputs.
const audition = JSON.parse(read('docs/ch2-kai-no-reference-audition.json'))
assert.equal(audition.reference_audio_used, false)
const selected = audition.candidates.find(candidate => candidate.id === 'b')
assert(selected, 'Keep the selected B generation recipe')
assert.equal(selected.output, source)
assert.equal(selected.sha256, approvedHash)
assert.equal(selected.text, '跟你说个事儿。')
assert.equal(selected.reference_audio, null)
assert.equal(selected.generation.reference_audio, null)
assert.equal(selected.generation.task, 'text-only Instruct TTS')
for (const field of ['local_word_gain', 'pitch_shift', 'time_stretch']) assert.equal(selected[field], false)
assert.deepEqual(selected.first_sentence_range, [0, 1.3])
const argv = selected.generation.argv
assert(Array.isArray(argv) && argv.length > 1)
assert.match(argv[0], /auk-infer(?:\.exe)?$/)
assert(!argv.some(value => /^--(?:audio|reference|ref_audio)(?:[=_-]|$)/i.test(value)), 'No audio/reference input in the generation command')
const arg = key => {
  const index = argv.indexOf(key)
  assert(index >= 0 && index + 1 < argv.length, `Missing explicit AuK argument ${key}`)
  return argv[index + 1]
}
assert.equal(arg('--instruction'), selected.generation.instruction)
assert.match(arg('--ckpt'), /AuK-Flash/)
assert.match(arg('--qwen_path'), /Qwen2\.5-Omni-3B/)
assert.equal(arg('--dtype'), 'bf16')
assert.equal(arg('--device'), 'cuda:0')
assert(argv.includes('--cpu_offload'))
assert.equal(Number(arg('--seed')), selected.generation.seed)
assert.equal(Number(arg('--gen_seconds')), selected.generation.gen_seconds)

const story = read('app/src/game/ch2.ts')
assert.equal(story.split(`sfx: '${alias}'`).length - 1, 1, 'Change only one entrance sound')
assert.match(story, new RegExp(`c2n1_b1: \\{ speaker: 'kai', sprite: 'char_kai', sfx: '${alias}', text: "跟你说个事儿。`))
assert.equal(story.replace(`sfx: '${alias}'`, `sfx: '${oldAlias}'`), original('app/src/game/ch2.ts'),
  'Undoing the one audio alias must restore the complete baseline story')
for (const file of ['app/src/App.tsx', 'app/src/game/store.ts', 'app/src/game/data.ts',
  'app/src/game/dlc.ts', 'app/src/game/types.ts']) {
  assert.equal(read(file), original(file), `Unexpected shared code/data change: ${file}`)
}
const audioBlobs = git('ls-tree', '-r', '-z', baseline, '--', 'app/public/audio')
  .toString('utf8').split('\0').filter(Boolean)
assert(audioBlobs.length > 0, 'Do not pass an empty baseline audio pathspec')
for (const entry of audioBlobs) {
  const match = /^\d+ blob ([0-9a-f]+)\t(.+)$/.exec(entry)
  assert(match, `Unexpected Git audio entry: ${entry}`)
  const [, expected, file] = match
  const content = bytes(file)
  const actual = createHash('sha1').update(`blob ${content.length}\0`).update(content).digest('hex')
  assert.equal(actual, expected, `Existing audio overwritten: ${file}`)
  assert.notEqual(file, output, 'The approved rendition needs its own cache-safe filename')
}

// Decode the adopted file itself. MP3 container duration includes encoder
// padding, so measure PCM duration instead of calling padding a cutoff.
const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries',
  'stream=codec_name,sample_rate,channels', '-of', 'json', path.join(root, output)], { encoding: 'utf8' }))
assert.deepEqual(probe.streams, [{ codec_name: 'mp3', sample_rate: '24000', channels: 1 }])
const pcm = execFileSync('ffmpeg', ['-v', 'error', '-i', path.join(root, output),
  '-map', '0:a:0', '-f', 'f32le', '-acodec', 'pcm_f32le', 'pipe:1'], { maxBuffer: 4 * 1024 * 1024 })
assert.equal(pcm.length % 4, 0)
const seconds = pcm.length / 4 / 24000
assert(Math.abs(seconds - 1.3) < 0.01, `Expected 1.3 s of decoded approved audio, got ${seconds}`)
let peak = 0
for (let offset = 0; offset < pcm.length; offset += 4) {
  const sample = pcm.readFloatLE(offset)
  assert(Number.isFinite(sample), 'Audio must decode to finite samples')
  peak = Math.max(peak, Math.abs(sample))
}
assert(peak > 0.01 && peak < 0.99, `Unexpected silent or clipped audio peak: ${peak}`)

console.log(`PASS approved Kai B: byte-identical ${approvedHash}; no-reference AuK recipe; single Chapter 2 alias; ${audioBlobs.length} old audio blobs and shared code unchanged; 24 kHz mono MP3 decodes to ${seconds.toFixed(3)} s. User approval is recorded, not inferred from automated QA.`)
