/** Deterministic procedural equipment foley. No speech, no reference recording/model. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, relative } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const output = resolve(root, 'app/public/audio')
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg'
mkdirSync(output, { recursive: true })
const common = ['-hide_banner', '-loglevel', 'error', '-y']
const specs = [
  {
    file: 'ch2_ct_motor_loop_v1.mp3',
    purpose: 'Quiet broadband gantry/table motor, used only for acquisition; no diagnostic realism implied.',
    playbackGain: 0.24,
    argv: [...common, '-f', 'lavfi', '-i', 'anoisesrc=color=brown:amplitude=0.27:duration=4:sample_rate=24000:seed=245891',
      '-af', 'highpass=f=45,lowpass=f=420,volume=0.6,afade=t=in:d=0.18,afade=t=out:st=3.82:d=0.18',
      '-ar', '24000', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '128k'],
  },
  {
    file: 'ch2_ct_reconstruction_softclick_v1.mp3',
    purpose: 'Soft non-tonal console relay click near image readiness, never a beep.',
    playbackGain: 0.2,
    argv: [...common, '-f', 'lavfi', '-i', 'anoisesrc=color=pink:amplitude=0.28:duration=0.14:sample_rate=24000:seed=73104',
      '-af', 'highpass=f=170,lowpass=f=1000,afade=t=in:d=0.007,afade=t=out:st=0.012:d=0.128,volume=0.34',
      '-ar', '24000', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '128k'],
  },
]
const version = spawnSync(ffmpeg, ['-version'], { encoding: 'utf8' })
if (version.error || version.status !== 0) throw version.error || new Error(version.stderr)
const records = specs.map(spec => {
  const destination = resolve(output, spec.file)
  const argv = [...spec.argv, destination]
  const result = spawnSync(ffmpeg, argv, { encoding: 'utf8' })
  if (result.error || result.status !== 0) throw result.error || new Error(result.stderr)
  const bytes = readFileSync(destination)
  return { ...spec, argv, output: relative(root, destination).replaceAll('\\', '/'), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }
})
writeFileSync(resolve(root, 'docs/ch2-ct-foley.json'), JSON.stringify({
  source: 'Procedural FFmpeg lavfi noise synthesis; no third-party recording, voice or reference audio.',
  generator: 'app/scripts/generate-ch2-ct-foley.mjs',
  ffmpeg: version.stdout.split(/\r?\n/)[0],
  scope: 'Second chapter scan overlay only; all existing audio assets retained unchanged.',
  records,
}, null, 2) + '\n')
console.log('Generated two Chapter 2-only mechanical foley files and provenance.')
