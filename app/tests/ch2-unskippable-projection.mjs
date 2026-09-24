// Historical inverse of the author's 194c442 no-skip instruction, one exact line.
// Never used by the live game. The old loop ledger is deliberately untouched.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const root = fileURLToPath(new URL('../../', import.meta.url))
const normalize = source => source.replaceAll('\r\n', '\n').trimEnd() + '\n'
const original = (commit, path) => normalize(execFileSync('git', ['show', `${commit}:${path}`],
  { cwd: root, encoding: 'utf8', maxBuffer: 8e6 }))
const after = '      {scanPending && scanSession && <Ch2ScanOverlay key={`${prog.loop?.runId}:${stepId}`} config={scan} startedAt={scanSession.startedAt} onDone={finishScan} />}'
const before = after.replace(' onDone={finishScan} />', ' onDone={finishScan} onSkip={finishScan} />')

export function beforeUnskippableSource(path, source) {
  if (path !== 'app/src/App.tsx') return source
  const live = normalize(source)
  assert.equal(live, original('194c442', path), `${path}: undocumented mutation outside approved loop hunks (no-skip layer)`)
  assert.equal(live.split(after).length, 2, 'The exact approved no-skip line must occur once')
  const restored = live.replace(after, before)
  assert.equal(restored, original('e8d04ef', path), 'No-skip projection must equal its exact previous Git source')
  return restored
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const path = 'app/src/App.tsx', live = original('194c442', path)
  beforeUnskippableSource(path, live)
  assert.throws(() => beforeUnskippableSource(path, live.replace(after, after + ' // unlisted')), /undocumented mutation/)
  assert.throws(() => beforeUnskippableSource(path, live + '// unlisted\n'), /undocumented mutation/)
  console.log('PASS no-skip historical projection: exact 194c442 -> e8d04ef single-line inverse; both mutation probes rejected.')
}
