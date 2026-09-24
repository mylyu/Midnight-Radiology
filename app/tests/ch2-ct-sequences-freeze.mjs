// LIVE boundary for this round; older checks may peel only its exact approved deltas.
import './game-delivery-freeze.mjs'
import { beforeGameDeliverySource } from './game-delivery-projection.mjs'
import assert from 'node:assert/strict'
import { assertHistoricalMedia, priorMediaPaths, priorSourcePaths, inspectLiveImage } from './game-delivery-media.mjs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { beforeCtSequencesSource, CT_SEQUENCES_BASELINE as baseline,
  CT_SEQUENCES_ADDED_SOURCE, CT_SEQUENCES_ADDED_MEDIA } from './ch2-ct-sequences-projection.mjs'

const root = new URL('../../', import.meta.url)
const git = (...args) => execFileSync('git', args, { cwd: fileURLToPath(root), maxBuffer: 24e6 }).toString('utf8')
const normalize = source => source.replaceAll('\r\n', '\n').trimEnd() + '\n'
const tracked = prefix => git('ls-tree', '-r', '--name-only', baseline, '--', prefix).trim().split('\n').filter(Boolean)
const current = path => normalize(beforeGameDeliverySource(path, readFileSync(new URL(path, root), 'utf8')))
const original = path => normalize(git('show', `${baseline}:${path}`))
const files = [...tracked('app/src'), 'app/package.json', 'app/package-lock.json', 'app/.gitignore',
  'app/index.html', 'app/vite.config.ts', 'app/tsconfig.json', 'app/tsconfig.app.json',
  '深夜影像科/全书剧情总线.md', 'docs/ch1-voices-20260923.json',
  ...tracked('docs').filter(path => path.endsWith('source-deltas.json'))]
for (const path of files) {
  assert.equal(normalize(beforeCtSequencesSource(path, current(path))), normalize(original(path)), `${path}: only four exact reviewed presentation deltas`)
  assert.throws(() => assert.equal(normalize(beforeCtSequencesSource(path, current(path) + '\n// unauthorized append\n')), normalize(original(path))))
}
const additions = prefix => [...new Set([
  git('diff', '--name-only', '--diff-filter=A', baseline, '--', prefix),
  git('ls-files', '--others', '--exclude-standard', '--', prefix),
].join('\n').split(/\r?\n/).filter(Boolean))].sort()
assert.deepEqual(priorSourcePaths(additions('app/src')), CT_SEQUENCES_ADDED_SOURCE, 'Exactly two isolated new chapter-two modules')
assert.deepEqual(additions('app/public/audio'), [], 'Original CT sound and all approved voices stay exact; no new sound')

const parse = (path, source) => ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true,
  path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
const oldApp = parse('App.tsx', original('app/src/App.tsx'))
const functions = tree => new Map(tree.statements.filter(ts.isFunctionDeclaration).map(node => [node.name?.text, node.getText(tree)]))
function assertAppIsolation(source) {
  const ast = parse('App.tsx', source), oldFunctions = functions(oldApp), liveFunctions = functions(ast)
  assert.deepEqual([...liveFunctions.keys()], [...oldFunctions.keys()], 'No new shared App function')
  for (const [name, body] of oldFunctions) if (name !== 'Ch2Screen') {
    assert.equal(liveFunctions.get(name), body, `${name}: only Ch2Screen preload is allowed`)
  }
  const imports = tree => tree.statements.filter(ts.isImportDeclaration).map(node => node.getText(tree))
  const addedImport = "import { preloadCh2SliceSequence } from './game/ch2-scan-sequences'"
  assert.deepEqual(imports(ast).filter(line => !imports(oldApp).includes(line)), [addedImport], 'One exact chapter-two preload import')
  assert.deepEqual(imports(ast).filter(line => line !== addedImport), imports(oldApp), 'All existing imports unchanged')
  const globals = tree => tree.statements.filter(node => !ts.isImportDeclaration(node) && !ts.isFunctionDeclaration(node)).map(node => node.getText(tree))
  assert.deepEqual(globals(ast), globals(oldApp), 'Routes, global preload, shared helpers and state unchanged')
}
assertAppIsolation(current('app/src/App.tsx'))
assert.throws(() => assertAppIsolation(current('app/src/App.tsx') + '\nconst forbiddenSharedGlobal = true\n'), /globals|state/)
assert.throws(() => assertAppIsolation(current('app/src/App.tsx') + '\nfunction forbiddenSharedFunction() {}\n'), /shared App function/)
const liveApp = parse('App.tsx', current('app/src/App.tsx'))
const protectedFunction = liveApp.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text !== 'Ch2Screen' && node.body)
const at = protectedFunction.body.getStart(liveApp) + 1
assert.throws(() => assertAppIsolation(current('app/src/App.tsx').slice(0, at) + '\nvoid "forbidden";\n' + current('app/src/App.tsx').slice(at)), /only Ch2Screen/)

// Presentation fields must be optional and may not alter saved-state interfaces.
assert.equal(normalize(current('app/src/game/types.ts')), normalize(original('app/src/game/types.ts')), 'No save schema/storage changes')
const oldScans = parse('scans.ts', original('app/src/game/ch2-scans.ts'))
const liveScans = parse('scans.ts', current('app/src/game/ch2-scans.ts'))
const config = tree => tree.statements.find(node => ts.isInterfaceDeclaration(node) && node.name.text === 'Ch2ScanConfig')
const oldMembers = config(oldScans).members.map(node => node.getText(oldScans))
const members = config(liveScans).members
assert.deepEqual(members.filter(node => !['presentation', 'sequence'].includes(node.name.getText(liveScans))).map(node => node.getText(liveScans)), oldMembers)
for (const name of ['presentation', 'sequence']) {
  const matched = members.filter(node => node.name.getText(liveScans) === name)
  assert.equal(matched.length, 1)
  assert(matched[0].questionToken, `${name} must be optional for existing data`)
}

let mediaCount = 0
for (const entry of git('ls-tree', '-r', '-z', baseline, '--', 'app/public/assets', 'app/public/audio').split('\0').filter(Boolean)) {
  const [, expected, path] = /^\d+ blob ([0-9a-f]+)\t(.+)$/.exec(entry)
  assertHistoricalMedia(path, { gitBlob: expected })
  mediaCount++
}
assert.deepEqual(priorMediaPaths(additions('app/public/assets'), baseline), [...CT_SEQUENCES_ADDED_MEDIA].sort(), 'Only individually named reviewed atlases')
console.log(`PASS CT sequences LIVE freeze: ${files.length} source/config/historical ledgers, ${functions(oldApp).size - 1} App functions, unchanged save types, ${mediaCount} original media; only named new source/atlases`)
