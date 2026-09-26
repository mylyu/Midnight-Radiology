/** Optional conservative MP3 pass. Objective checks are NOT a listening review. */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const stage = path.resolve(process.argv[2])
await mkdir(path.join(stage, 'audio'), { recursive: true })
await mkdir(path.join(stage, 'originals/audio'), { recursive: true })
const sha = b => createHash('sha256').update(b).digest('hex')
const run = (name, args) => execFileSync(name, args, { windowsHide: true, maxBuffer: 32 * 1024 * 1024 })
const probe = file => JSON.parse(run('ffprobe', ['-v', 'error', '-show_entries', 'stream=sample_rate,channels,bit_rate', '-of', 'json', file])).streams[0]
const decode = file => run('ffmpeg', ['-v', 'error', '-i', file, '-f', 'f32le', '-acodec', 'pcm_f32le', '-'])
function compare(a, b) {
  if (a.length !== b.length) return { ok: false, reason: 'decoded-sample-count' }
  let aa = 0, bb = 0, ab = 0, error = 0, peakA = 0, peakB = 0, clipA = 0, clipB = 0
  for (let offset = 0; offset < a.length; offset += 4) {
    const x = a.readFloatLE(offset), y = b.readFloatLE(offset)
    aa += x*x; bb += y*y; ab += x*y; error += (x-y)*(x-y)
    peakA = Math.max(peakA, Math.abs(x)); peakB = Math.max(peakB, Math.abs(y))
    if (Math.abs(x) >= 1) clipA++
    if (Math.abs(y) >= 1) clipB++
  }
  const correlation = ab / Math.sqrt(Math.max(1e-20, aa*bb))
  const snrDb = 10 * Math.log10(aa / Math.max(1e-20, error))
  const rmsChangeDb = 10 * Math.log10(bb / Math.max(1e-20, aa))
  return { ok: correlation >= .97 && snrDb >= 15 && Math.abs(rmsChangeDb) <= 1 && clipB <= clipA + 3,
    decodedSamples: a.length / 4, correlation, snrDb, rmsChangeDb, peakA, peakB, clipA, clipB }
}
const rows = []
for (const name of (await readdir(path.join(app, 'public/audio'))).filter(f => f.endsWith('.mp3')).sort()) {
  const file = path.join(app, 'public/audio', name), source = await readFile(file), meta = probe(file)
  const target = path.join(stage, 'audio', name)
  await writeFile(path.join(stage, 'originals/audio', name), source)
  let encoded = source, chosen = null, metrics = { ok: true, kept: true }
  if (+meta.bit_rate > 64000) {
    const originalPcm = decode(file)
    for (const bitrate of [64000, 96000]) {
      if (bitrate >= +meta.bit_rate) continue
      run('ffmpeg', ['-v', 'error', '-y', '-i', file, '-map_metadata', '-1', '-c:a', 'libmp3lame', '-b:a', String(bitrate),
        '-ar', meta.sample_rate, '-ac', String(meta.channels), target])
      const candidate = await readFile(target), comparison = compare(originalPcm, decode(target))
      const next = probe(target)
      if (comparison.ok && candidate.length < source.length && next.sample_rate === meta.sample_rate && next.channels === meta.channels) {
        encoded = candidate; chosen = bitrate; metrics = comparison; break
      }
    }
  }
  await writeFile(target, encoded)
  rows.push({ name, beforeBytes: source.length, afterBytes: encoded.length, beforeHash: sha(source), afterHash: sha(encoded),
    sampleRate: +meta.sample_rate, channels: meta.channels, beforeBitrate: +meta.bit_rate, selectedBitrate: chosen,
    kept: encoded.equals(source), metrics })
}
const report = { policy: '64 kbps, fallback 96 kbps, else original. Preserve sample rate/channels/decoded duration. No gain/speed/pitch changes. Not an auditory certification.', audio: rows }
await writeFile(path.join(stage, 'audio-report.json'), JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify({ files: rows.length, changed: rows.filter(r=>!r.kept).length,
  before: rows.reduce((n,r)=>n+r.beforeBytes,0), after: rows.reduce((n,r)=>n+r.afterBytes,0) }, null, 2))
