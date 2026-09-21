// Historical snapshot support, NOT a live-game import. Never load the baseline
// instead of examining the current file: reverse only exact reviewed hunks,
// reject unexpected edits, then compare the complete restored source to Git.
// Current behavior has independent pacing/runtime/browser/Chapter 1 audits.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const root = new URL('../../', import.meta.url)
const ledger = JSON.parse(readFileSync(new URL('docs/ch2-pacing-source-deltas.json', root), 'utf8'))
const normalize = source => source.replaceAll('\r\n', '\n').trimEnd() + '\n'

export function beforePacingSource(path, source) {
  const file = ledger.files.find(f => f.path === path)
  if (!file) return source
  const lines = normalize(source).trimEnd().split('\n')
  for (const edit of [...file.edits].reverse()) {
    assert.deepEqual(lines.slice(edit.afterStart, edit.afterStart + edit.after.length), edit.after,
      `${path}: undocumented mutation in pacing hunk at ${edit.afterStart + 1}`)
    lines.splice(edit.afterStart, edit.after.length, ...edit.before)
  }
  const restored = lines.join('\n') + '\n'
  const baseline = execFileSync('git', ['show', `${ledger.baseline}:${path}`], { encoding: 'utf8', maxBuffer: 4e6 })
  assert.equal(restored, normalize(baseline), `${path}: mutation outside approved pacing hunks`)
  return restored
}

const projectedSource = path => beforePacingSource(path, readFileSync(new URL(path, root), 'utf8'))
const moduleUrl = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source,
  { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString('base64')

// Historical node renderers must use historical staging/social dependencies,
// not the live bandaged portrait or new daytime background by accident.
export const beforePacingPatientUrl = moduleUrl(projectedSource('app/src/game/ch2-patients.ts'))
const socialUrl = moduleUrl(projectedSource('app/src/game/ch2-social.ts'))
export const beforePacingSocial = await import(socialUrl)
const ch2Source = projectedSource('app/src/game/ch2.ts')
  .replace("'./ch2-patients.ts'", JSON.stringify(beforePacingPatientUrl))
  .replace("'./ch2-social.ts'", JSON.stringify(socialUrl))
export const beforePacing = await import(moduleUrl(ch2Source))

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const { path, edits } of ledger.files) {
    const live = readFileSync(new URL(path, root), 'utf8')
    beforePacingSource(path, live)
    const changed = edits.find(e => e.after.length)?.after[0]
    assert(changed, path + ': expected explicit reviewed edits')
    assert.throws(() => beforePacingSource(path, live.replace(changed, changed + ' // undocumented')), /undocumented mutation/)
    assert.throws(() => beforePacingSource(path, live.trimEnd() + '\n// undocumented append\n'), /mutation outside approved pacing hunks/)
  }
  console.log(`PASS historical projection guard: ${ledger.files.length} files, exact inverse hunks and complete-baseline comparison; both in-hunk and outside-hunk mutations rejected`)
}
