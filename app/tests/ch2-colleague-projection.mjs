// Historical tests froze entire earlier rounds, not just voices/art. Undo only
// the explicit, audited new story deltas for those historical assertions.
// This is NOT a substitute for ch2-colleague-stories.mjs or live browser tests.
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
import ts from 'typescript'
const root = new URL('../../', import.meta.url)
const ledger = JSON.parse(readFileSync(new URL('docs/ch2-colleague-source-deltas.json', root), 'utf8'))
export function beforeSocialSource(path, source) {
  const rule = ledger.files.find(f => f.path === path)
  if (!rule) return source
  const lines = source.replaceAll('\r\n', '\n').trimEnd().split('\n')
  for (const e of [...rule.edits].reverse()) {
    assert.deepEqual(lines.slice(e.afterStart, e.afterStart + e.after.length), e.after, path + ': undocumented story edit')
    lines.splice(e.afterStart, e.after.length, ...e.before)
  }
  const restored = lines.join('\n') + '\n'
  const base = execFileSync('git', ['show', ledger.baseline + ':' + path], {encoding: 'utf8', maxBuffer: 4e6}).replaceAll('\r\n', '\n').trimEnd() + '\n'
  assert.equal(restored, base, path + ': unlisted source mutation')
  return restored
}
const source = beforeSocialSource('app/src/game/ch2.ts', readFileSync(new URL('app/src/game/ch2.ts', root), 'utf8'))
  .replace("'./ch2-patients.ts'", JSON.stringify(new URL('../src/game/ch2-patients.ts', import.meta.url).href))
const js = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022}}).outputText
export const beforeSocial = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'))
