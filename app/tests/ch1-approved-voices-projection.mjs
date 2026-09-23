// Historical scope tests predate three user-approved Chapter 1 voice aliases.
// Reverse only this exact playback mapping after checking its full current
// source and three approved media hashes. Never used in the game runtime.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'

const root = new URL('../../', import.meta.url)
const normalize = s => s.replaceAll('\r\n', '\n')
const mapping = [
  '    // Chapter 1 voice-only revision: retain old assets and volume, use new filenames to avoid stale audio caches.',
  '    const revisedVoiceFiles: Partial<Record<SfxName, string>> = {',
  "      vox_fan: 'vox_ch1_fan_mature_20260923',",
  "      vox_worker: 'vox_ch1_worker_bass_20260923',",
  "      vox_thin: 'vox_ch1_thin_breathless_20260923',",
  '    }',
  '    const src = `${import.meta.env.BASE_URL}audio/${revisedVoiceFiles[name] ?? name}.mp3?v=2`',
].join('\n')

export function beforeApprovedCh1Voices(path, source) {
  if (path !== 'app/src/game/store.ts') return source
  const current = normalize(source)
  assert.equal(current, normalize(execFileSync('git', ['show', '05889fa:' + path], { encoding: 'utf8', maxBuffer: 4e6 })), 'Shared store differs from approved published baseline')
  assert.equal(current.split(mapping).length, 2, 'Exact approved voice mapping must occur once')
  const restored = current.replace(mapping, '    const src = `${import.meta.env.BASE_URL}audio/${name}.mp3?v=2`')
  assert.equal(restored, normalize(execFileSync('git', ['show', '2d629e8:' + path], { encoding: 'utf8', maxBuffer: 4e6 })), 'Only the three approved playback aliases may be projected out')
  const record = JSON.parse(readFileSync(new URL('docs/ch1-voices-20260923.json', root), 'utf8'))
  assert.equal(record.user_approved, true)
  assert.equal(record.takes.length, 3)
  assert.deepEqual(record.takes.map(row => row.output).sort(), [
    'app/public/audio/vox_ch1_fan_mature_20260923.mp3',
    'app/public/audio/vox_ch1_thin_breathless_20260923.mp3',
    'app/public/audio/vox_ch1_worker_bass_20260923.mp3',
  ])
  for (const row of record.takes) assert.equal(createHash('sha256').update(readFileSync(new URL(row.output, root))).digest('hex'), row.sha256)
  return restored
}
