// Decode the delivered bytes, not only the generation record. No GPU/ASR download.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const record = JSON.parse(readFileSync(path.join(root, 'docs/ch2-terminal-audio.json'), 'utf8'))
const review = JSON.parse(readFileSync(path.join(root, 'docs/ch2-terminal-audio-review.json'), 'utf8'))
const digest = bytes => createHash('sha256').update(bytes).digest('hex')
assert.equal(record.baseline, '194c442')
assert.equal(record.voice.text, '样本已接收。')
assert.equal(record.voice.transcript, '样本已接收。')
assert.equal(record.voice.reference_audio_used, false)
assert.equal(record.voice.speed_or_pitch_changed, false)
assert(!record.voice.argv.includes('--audio') && !record.voice.argv.includes('--ref_text'))
for (const [flag, expected] of [['--dtype', 'bf16'], ['--device', 'cuda:0'], ['--seed', '2026092453']]) {
  assert.equal(record.voice.argv[record.voice.argv.indexOf(flag) + 1], expected)
}
assert(record.voice.argv.includes('--cpu_offload'))
const generatorText = readFileSync(path.join(root, record.generator), 'utf8').replaceAll('\r\n', '\n')
// Git's Windows checkout may change only line endings after this run was recorded.
assert([digest(Buffer.from(generatorText)), digest(Buffer.from(generatorText.replaceAll('\n', '\r\n')))]
  .includes(record.generator_sha256), 'Generator contents differ from recorded script (ignoring Git line endings)')
assert.equal(record.human_listened, false)
assert.equal(review.human_listened, false)
assert.equal(review.selected_take, 3)
assert.equal(review.attempts[2].raw_sha256, record.voice.raw_sha256)
assert.deepEqual(record.records.map(row => row.id), ['ch2_terminal_receipt_v1', 'ch2_terminal_alarm_v1'])

const results = []
for (const row of record.records) {
  const file = path.join(root, row.output), bytes = readFileSync(file)
  assert.equal(digest(bytes), row.sha256, `${row.id}: delivered bytes differ from audited record`)
  assert.equal(bytes.length, row.bytes)
  assert.equal(row.loop, false)
  const probe = JSON.parse(execFileSync(process.env.FFPROBE_PATH || 'ffprobe',
    ['-v', 'error', '-show_entries', 'stream=sample_rate,channels,bit_rate', '-of', 'json', file], { encoding: 'utf8' }))
  assert.equal(probe.streams.length, 1)
  assert.equal(Number(probe.streams[0].sample_rate), 24000)
  assert.equal(probe.streams[0].channels, 1)
  assert.equal(Number(probe.streams[0].bit_rate), 128000)
  const pcm = execFileSync(process.env.FFMPEG_PATH || 'ffmpeg',
    ['-v', 'error', '-i', file, '-f', 'f32le', '-acodec', 'pcm_f32le', '-'], { maxBuffer: 1024 * 1024 })
  let peak = 0, squareSum = 0
  for (let i = 0; i < pcm.length; i += 4) {
    const value = pcm.readFloatLE(i)
    assert(Number.isFinite(value), `${row.id}: non-finite sample`)
    peak = Math.max(peak, Math.abs(value)); squareSum += value * value
  }
  const samples = pcm.length / 4, seconds = samples / 24000, rms = Math.sqrt(squareSum / samples)
  assert(Math.abs(seconds - row.acoustic.seconds) < 0.005)
  assert(peak < 0.8 && rms > 0.001 && rms < 0.08, `${row.id}: silence, clipping or unexpectedly loud cue`)
  if (row.id === 'ch2_terminal_alarm_v1') assert(seconds > 0.1 && seconds <= 1)
  else assert(seconds >= 1.5 && seconds <= 2.3)
  results.push(`${row.id}: ${seconds.toFixed(2)}s, 24kHz mono 128kbps, peak ${peak.toFixed(3)}, RMS ${rms.toFixed(3)}`)
}
console.log('PASS terminal audio: no-reference exact-line provenance; both encoded files decode, match hashes and stay within quiet/duration bounds. No human-listening claim.\n' + results.join('\n'))
