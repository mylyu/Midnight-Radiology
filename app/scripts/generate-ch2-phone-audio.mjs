// Original, deterministic soft bell cues; no sampled commercial ringtone.
// Generated binary media only. Keep this script as the synthesis/source record.
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
const rate = 24000
for (const [name, seconds, notes] of [
  ['call', 2.05, [[0, 587.33], [.17, 739.99], [.34, 880], [.96, 587.33], [1.13, 739.99], [1.30, 880]]],
  ['message', .68, [[0, 783.99], [.13, 1046.5]]],
]) {
  const samples = new Float64Array(Math.round(seconds * rate))
  for (const [start, frequency] of notes) {
    for (let i = Math.round(start * rate); i < samples.length; i++) {
      const t = i / rate - start
      const envelope = Math.min(1, Math.max(0, t / .009)) * Math.exp(-t * 12)
      samples[i] += envelope * (Math.sin(2 * Math.PI * frequency * t) + .16 * Math.sin(2 * Math.PI * frequency * 2 * t))
    }
  }
  const peak = samples.reduce((max, x) => Math.max(max, Math.abs(x)), 0)
  const pcm = Buffer.alloc(samples.length * 2)
  samples.forEach((x, i) => {
    const tail = Math.min(1, (samples.length - i) / (rate * .025))
    pcm.writeInt16LE(Math.round(x / peak * .35 * tail * 32767), i * 2)
  })
  const target = fileURLToPath(new URL(`../public/audio/ch2_mobile_${name}_v1.mp3`, import.meta.url))
  if (existsSync(target)) throw new Error(`Refusing to overwrite approved audio: ${target}`)
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 's16le', '-ar', String(rate),
    '-ac', '1', '-i', 'pipe:0', '-c:a', 'libmp3lame', '-b:a', '64k', '-map_metadata', '-1', '-n', target], { input: pcm })
  if (result.status !== 0) throw new Error(String(result.stderr || result.error))
  const file = readFileSync(target)
  console.log(JSON.stringify({ name, seconds, rate, bytes: file.length, sha256: createHash('sha256').update(file).digest('hex') }))
}
