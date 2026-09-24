// Exact historical inverse, not a live-game import or a fresh snapshot baseline.
// Every current hunk is checked before reversal; the entire restored file must
// equal immutable Git 194c442. New mystery modules have independent live tests.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const root = new URL('../../', import.meta.url)
const ledger = JSON.parse(readFileSync(new URL('docs/ch2-mystery-source-deltas.json', root), 'utf8'))
const normalize = source => source.replaceAll('\r\n', '\n').trimEnd() + '\n'
assert.equal(ledger.baseline, '194c442', 'Mystery baseline must not move')
assert.deepEqual(ledger.files.map(file => file.path).sort(), ['app/src/App.tsx', 'app/src/game/ch2.ts'])

export function beforeMysterySource(path, source) {
  const file = ledger.files.find(row => row.path === path)
  if (!file) return source
  const lines = normalize(source).trimEnd().split('\n')
  for (const edit of [...file.edits].reverse()) {
    assert.deepEqual(lines.slice(edit.afterStart, edit.afterStart + edit.after.length), edit.after,
      `${path}: undocumented mutation in mystery hunk at ${edit.afterStart + 1}`)
    lines.splice(edit.afterStart, edit.after.length, ...edit.before)
  }
  const restored = lines.join('\n') + '\n'
  const baseline = execFileSync('git', ['show', `${ledger.baseline}:${path}`],
    { cwd: fileURLToPath(root), encoding: 'utf8', maxBuffer: 8e6 })
  assert.equal(restored, normalize(baseline), `${path}: undocumented mutation outside approved loop hunks (mystery layer)`)
  return restored
}

/** Compile examined live source after an exact inverse. Dependency modules are
 * examined/projected too; never substitute a Git file for unchecked live text. */
export async function loadHistoricalCh2(projectSource = beforeMysterySource) {
  const { default: ts } = await import('typescript')
  const read = path => projectSource(path, readFileSync(new URL(path, root), 'utf8'))
  const moduleUrl = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source,
    { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString('base64')
  let source = read('app/src/game/ch2.ts')
  for (const name of ['ch2-patients', 'ch2-social', 'ch2-pacing']) {
    source = source.replace(`'./${name}.ts'`, JSON.stringify(moduleUrl(read(`app/src/game/${name}.ts`))))
  }
  return import(moduleUrl(source))
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let probes = 0
  for (const { path, edits } of ledger.files) {
    const live = readFileSync(new URL(path, root), 'utf8')
    beforeMysterySource(path, live)
    // Probe each actual new hunk by exact line index, not an ambiguous replace.
    for (const edit of edits) {
      const offset = edit.after.findIndex(line => line.trim())
      if (offset < 0) continue
      const changed = normalize(live).trimEnd().split('\n')
      changed[edit.afterStart + offset] += ' // undocumented mutation'
      assert.throws(() => beforeMysterySource(path, changed.join('\n') + '\n'), /undocumented mutation in mystery hunk/)
      probes++
    }
    assert.throws(() => beforeMysterySource(path, live.trimEnd() + '\n// undocumented append\n'), /mutation outside approved loop hunks \(mystery layer\)/)
    const outside = normalize(live).trimEnd().split('\n')
    outside[0] += ' // undocumented outside hunk'
    assert.throws(() => beforeMysterySource(path, outside.join('\n') + '\n'), /mutation outside approved loop hunks \(mystery layer\)/)
    probes += 2
  }
  console.log(`PASS mystery projection: ${ledger.files.length} exact file inversions to ${ledger.baseline}; ${probes} in-hunk/outside-hunk mutation probes rejected; prior ledgers untouched.`)
}
