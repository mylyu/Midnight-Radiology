// A word-local correction, not another TTS take: preserve v4 and the complete
// accepted game, apart from the single Chapter 2 entrance-audio alias.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { beforeLoopSource } from './ch2-loop-projection.mjs'
import { beforeApprovedCh1Voices } from './ch1-approved-voices-projection.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const baseline = 'a542af1'
const oldAlias = 'vox_ch2_natural_kai_whisper_v4'
const alias = 'vox_ch2_natural_kai_soft_shi_v5'
const output = `app/public/audio/${alias}.mp3`
const text = '跟你说个事儿。'
const git = (...args) => execFileSync('git', args, { cwd: root, maxBuffer: 24 * 1024 * 1024 })
const bytes = file => readFileSync(path.join(root, file))
const read = file => beforeApprovedCh1Voices(file,
  beforeLoopSource(file, bytes(file).toString('utf8').replaceAll('\r\n', '\n')))
const original = file => git('show', `${baseline}:${file}`).toString('utf8').replaceAll('\r\n', '\n')
const sha256 = data => createHash('sha256').update(data).digest('hex')

// Preserve the v5 processing audit after the author selected no-reference B.
const story = read('app/src/game/ch2.ts').replace("sfx: 'vox_ch2_natural_kai_noref_b_v9'", `sfx: '${alias}'`)
assert.equal(story.split(`sfx: '${alias}'`).length - 1, 1, 'Exactly one new Kai entrance alias')
assert.match(story, new RegExp(`c2n1_b1: \\{ speaker: 'kai', sprite: 'char_kai', sfx: '${alias}', text: "跟你说个事儿。`))
assert.equal(story.replace(`sfx: '${alias}'`, `sfx: '${oldAlias}'`), original('app/src/game/ch2.ts'),
  'Undoing one audio alias must restore the entire accepted Chapter 2 story')
for (const file of ['app/src/App.tsx', 'app/src/game/store.ts', 'app/src/game/data.ts',
  'app/src/game/dlc.ts', 'app/src/game/types.ts']) {
  assert.equal(read(file), original(file), `Shared runtime/data changed: ${file}`)
}

const audioBlobs = git('ls-tree', '-r', '-z', baseline, '--', 'app/public/audio')
  .toString('utf8').split('\0').filter(Boolean)
assert(audioBlobs.length > 0, 'Baseline audio pathspec must not be empty')
for (const line of audioBlobs) {
  const match = /^\d+ blob ([0-9a-f]+)\t(.+)$/.exec(line)
  assert(match, `Unexpected Git audio entry: ${line}`)
  const [, expected, file] = match
  const content = bytes(file)
  const actual = createHash('sha1').update(`blob ${content.length}\0`).update(content).digest('hex')
  assert.equal(actual, expected, `An existing audio asset was overwritten: ${file}`)
  assert.notEqual(file, output, 'The corrected clip must use an additive filename')
}

const record = JSON.parse(read('docs/ch2-kai-soft-shi-v5.json'))
const source = JSON.parse(read('docs/ch2-kai-whisper-v4.json'))
assert.equal(record.baseline, baseline)
assert.equal(record.role, '小凯')
assert.equal(record.text, text)
assert.equal(record.output, output)
assert.equal(record.sha256, sha256(bytes(output)), 'The QA record must describe the actual MP3')
assert.equal(record.source_record, 'docs/ch2-kai-whisper-v4.json')
assert.equal(record.source_mp3, `app/public/audio/${oldAlias}.mp3`)
assert.equal(record.source_mp3_sha256, sha256(bytes(record.source_mp3)))
assert.equal(record.source_mp3_sha256, source.selected.sha256)
assert.equal(record.source_wav, source.selected.wav, 'Use the existing take, not another random performance')
assert.match(record.method, /local word gain envelope/)
assert.match(record.method, /not regenerated TTS/)
assert.deepEqual(record.gain, {
  start_seconds: 1.1, end_seconds: 1.24, db: -6, curve: 'smoothstep in dB; hold to end',
})
for (const flag of ['no_pitch_shift', 'no_time_stretch', 'no_global_normalization']) {
  assert.equal(record[flag], true, `Unapproved processing: ${flag}`)
}
assert.equal(record.script, 'scripts/ch2-kai-soft-shi.py')
assert.equal(record.script_sha256, sha256(bytes(record.script)), 'Keep the exact editing recipe reproducible')
const recipe = read(record.script)
assert.match(recipe, /assert np\.array_equal\(edited\[:first\], signal\[:first\]\)/)
assert.match(recipe, /assert np\.array_equal\(decoded\[:first\], signal\[:first\]\)/,
  'The generator must check preservation after lossless WAV export as well')
assert.match(recipe, /smoothstep = progress \* progress \* \(3 - 2 \* progress\)/)
assert.match(recipe, /edited = signal \* envelope/)

// Do not rerun synthesis or sample-level analysis here. The hashed recipe did
// those strict checks during generation; validate its recorded measurements.
const qa = record.qa
assert.equal(qa.sample_rate, 24000)
assert.equal(qa.mono, true)
assert.equal(qa.samples, 40990)
assert.equal(qa.exactly_preserved_prefix_samples, 26400)
assert.equal(qa.exactly_preserved_prefix_samples, Math.round(record.gain.start_seconds * qa.sample_rate))
assert(Math.abs(qa.seconds - qa.samples / qa.sample_rate) < 1e-9)
assert.equal(qa.finite, true)
assert(qa.peak > 0 && qa.peak < 0.98)
assert(qa.word_rms_before > 0 && qa.word_rms_after > 0)
assert(Math.abs(qa.word_change_db + 6) < 0.002)
assert(Math.abs(20 * Math.log10(qa.word_rms_after / qa.word_rms_before) - qa.word_change_db) < 1e-9)
const normalize = value => value.replace(/[^\p{Script=Han}]/gu, '')
assert.equal(normalize(qa.transcript), normalize(text), 'The output ASR must retain every word, including 儿')
assert.equal(record.human_listened, false, 'Automated QA must not masquerade as human listening')
assert.equal(record.user_approved, false, 'Approval belongs to the user')
assert.deepEqual(record.encode_argv.slice(0, 8), [
  'ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', record.wav, '-b:a', '128k',
], 'MP3 encoding must not apply a second gain, pitch or tempo filter')
assert.equal(record.encode_argv.length, 9)
assert.equal(path.resolve(record.encode_argv[8]), path.join(root, output))

const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries',
  'stream=codec_name,sample_rate,channels,bit_rate', '-of', 'json', path.join(root, output)], { encoding: 'utf8' }))
assert.equal(probe.streams.length, 1)
assert.deepEqual(probe.streams[0], {
  codec_name: 'mp3', sample_rate: '24000', channels: 1, bit_rate: '128000',
})
execFileSync('ffmpeg', ['-v', 'error', '-i', path.join(root, output), '-f', 'null', '-'], { stdio: 'pipe' })

console.log(`PASS Kai soft-shi v5: one Chapter 2 alias; ${audioBlobs.length} baseline audio blobs and shared runtime intact; exact-word ASR, MP3 hash/decode, unchanged 26400-sample prefix and -6 dB word-local recipe. No user audition claim.`)
