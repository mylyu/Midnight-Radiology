// Historical tests receive reviewed live text with ONLY the exact sunrise
// integration reversed. Never replace unexamined current files with Git blobs.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const root = new URL('../../', import.meta.url)
const ledger = JSON.parse(readFileSync(new URL('docs/ch2-dawn-source-deltas.json', root), 'utf8'))
const normalize = source => source.replaceAll('\r\n', '\n').trimEnd() + '\n'
assert.equal(ledger.baseline, 'b3de319', 'Dawn baseline must not move')
assert.deepEqual(ledger.files.map(file => file.path).sort(), ['app/src/App.tsx', 'app/src/game/ch2.ts'])

export function beforeDawnSource(path, source) {
  const file = ledger.files.find(row => row.path === path)
  if (!file) return source
  const lines = normalize(source).trimEnd().split('\n')
  for (const edit of [...file.edits].reverse()) {
    assert.deepEqual(lines.slice(edit.afterStart, edit.afterStart + edit.after.length), edit.after,
      `${path}: undocumented mutation in dawn hunk at ${edit.afterStart + 1}`)
    lines.splice(edit.afterStart, edit.after.length, ...edit.before)
  }
  const restored = lines.join('\n') + '\n'
  const baseline = execFileSync('git', ['show', `${ledger.baseline}:${path}`],
    { cwd: fileURLToPath(root), encoding: 'utf8', maxBuffer: 8e6 })
  assert.equal(restored, normalize(baseline), `${path}: undocumented mutation outside approved loop hunks (dawn layer)`)
  return restored
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let probes = 0
  for (const { path, edits } of ledger.files) {
    const live = readFileSync(new URL(path, root), 'utf8')
    beforeDawnSource(path, live)
    for (const edit of edits) {
      const offset = edit.after.findIndex(line => line.trim())
      if (offset < 0) continue
      const changed = normalize(live).trimEnd().split('\n')
      changed[edit.afterStart + offset] += ' // undocumented mutation'
      assert.throws(() => beforeDawnSource(path, changed.join('\n') + '\n'), /undocumented mutation in dawn hunk/)
      probes++
    }
    assert.throws(() => beforeDawnSource(path, live.trimEnd() + '\n// undocumented append\n'), /mutation outside approved loop hunks \(dawn layer\)/)
    const outside = normalize(live).trimEnd().split('\n')
    outside[0] += ' // undocumented outside hunk'
    assert.throws(() => beforeDawnSource(path, outside.join('\n') + '\n'), /mutation outside approved loop hunks \(dawn layer\)/)
    probes += 2
  }
  console.log(`PASS dawn projection: ${ledger.files.length} exact inversions to ${ledger.baseline}; ${probes} mutation probes rejected; all previous ledgers unchanged.`)
}
