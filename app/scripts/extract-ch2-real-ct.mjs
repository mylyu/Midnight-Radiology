// Extract only the user-selected 01:21–01:24 interval; never modify the source video.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const input = process.argv[2]
if (!input) throw new Error('Usage: node app/scripts/extract-ch2-real-ct.mjs "path/to/source.mp4"')
const source = path.resolve(input)
const output = 'app/public/audio/ch2_ct_real_scan_20260924.mp3'
const filter = 'volume=0.7,afade=t=in:st=0:d=0.025,afade=t=out:st=2.92:d=0.08'
const args = ['-hide_banner', '-loglevel', 'error', '-y', '-ss', '81', '-i', source,
  '-t', '3', '-map', '0:a:0', '-vn', '-af', filter, '-ar', '24000', '-ac', '1',
  '-c:a', 'libmp3lame', '-b:a', '128k', path.join(root, output)]
execFileSync('ffmpeg', args)
execFileSync('ffmpeg', ['-v', 'error', '-i', path.join(root, output), '-f', 'null', '-'])
const sha256 = file => createHash('sha256').update(readFileSync(file)).digest('hex')
const record = {
  date: '2026-09-24', source, source_sha256: sha256(source), intervalSeconds: [81, 84],
  source_origin: 'User-provided local video, on-screen Bilibili uploader 修改名字要6个硬币.',
  redistribution: 'Local preview only. No independent verification of the original recording redistribution license; confirm before public release. Not claimed as original CC-licensed foley.',
  processing: { trimSeconds: 3, gain: 0.7, fadeInSeconds: 0.025, fadeOutSeconds: 0.08,
    pitchShift: false, timeStretch: false, syntheticOverlay: false, sampleRate: 24000, channels: 1, bitrate: '128k' },
  playbackGain: 0.24, output, bytes: readFileSync(path.join(root, output)).length,
  sha256: sha256(path.join(root, output)), argv: args,
  ffmpeg: execFileSync('ffmpeg', ['-version'], { encoding: 'utf8' }).split('\n')[0],
  review: 'Source frame at 81 seconds shows gantry acceleration. Decoding, duration and level checked; this environment cannot listen to audio, so no human listening approval is claimed.'
}
writeFileSync(path.join(root, 'docs/ch2-real-ct-audio.json'), JSON.stringify(record, null, 2) + '\n')
console.log(JSON.stringify({ output, sha256: record.sha256, bytes: record.bytes, intervalSeconds: record.intervalSeconds }))
