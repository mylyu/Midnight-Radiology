// Latest-round LIVE boundary. Only two imports and Ch2Screen may change in
// the existing App; every other old module, asset and historical ledger is exact.
import './image-polish-freeze.mjs'
import { CT_SEQUENCES_ADDED_SOURCE, CT_SEQUENCES_ADDED_MEDIA } from './ch2-ct-sequences-projection.mjs'
import { REWARDS_ROUND_ADDED_SOURCE, REWARDS_ROUND_ADDED_MEDIA } from './ch2-rewards-round-projection.mjs'
import { beforeImagePolishSource, POLISH_ADDED_SOURCE, POLISH_ADDED_MEDIA } from './image-polish-projection.mjs'
import assert from 'node:assert/strict'
import { assertHistoricalMedia, priorMediaPaths, priorSourcePaths, inspectLiveImage } from './game-delivery-media.mjs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { beforeCheckinSource, CHECKIN_ADDED_FILES } from './ch2-checkin-projection.mjs'

const root = new URL('../../', import.meta.url)
const ts = createRequire(import.meta.url)('typescript')
const baseline = 'b3213f0'
const git = (...args) => execFileSync('git', args, { cwd: fileURLToPath(root), maxBuffer: 48 * 1024 * 1024 })
const normalize = source => source.replaceAll('\r\n', '\n').trimEnd() + '\n'
const current = path => beforeImagePolishSource(path, readFileSync(new URL(path, root), 'utf8'))
const original = path => git('show', `${baseline}:${path}`).toString('utf8')
const tracked = prefix => git('ls-tree', '-r', '--name-only', baseline, '--', prefix)
  .toString('utf8').trim().split('\n').filter(Boolean)
const protectedFiles = [...tracked('app/src').filter(path => path !== 'app/src/App.tsx'),
  'app/package.json', 'app/package-lock.json', 'app/index.html', 'app/vite.config.ts',
  'app/tsconfig.json', 'app/tsconfig.app.json', '深夜影像科/全书剧情总线.md', 'docs/ch1-voices-20260923.json',
  ...tracked('docs').filter(path => path.endsWith('source-deltas.json'))]
for (const path of protectedFiles) {
  assert.equal(normalize(current(path)), normalize(original(path)),
    `${path}: old story, economy, saves, styles, dependencies and historical ledgers must stay frozen`)
}

const parse = source => ts.createSourceFile('App.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const functions = ast => new Map(ast.statements.filter(ts.isFunctionDeclaration)
  .map(node => [node.name?.text, node.getText(ast)]))
const oldSource = normalize(original('app/src/App.tsx')), oldApp = parse(oldSource), oldFunctions = functions(oldApp)
const allowedImports = new Map([
  ['./components/Ch2Checkin', "import Ch2Checkin from './components/Ch2Checkin'"],
  ['./game/ch2-checkin', "import { CH2_CHECKINS, ch2CheckinPending, completeCh2Checkin } from './game/ch2-checkin'"],
])
function assertFrozenApp(source, requireCheckin = true) {
  const ast = parse(source), after = functions(ast)
  assert.deepEqual([...after.keys()], [...oldFunctions.keys()], 'No added/removed/renamed shared App functions')
  for (const [name, body] of oldFunctions) if (name !== 'Ch2Screen') {
    assert.equal(after.get(name), body, `${name}: only Ch2Screen is editable in this round`)
  }
  const imports = tree => tree.statements.filter(ts.isImportDeclaration)
    .filter(node => !allowedImports.has(node.moduleSpecifier.text)).map(node => node.getText(tree))
  assert.deepEqual(imports(ast), imports(oldApp), 'Only the two isolated check-in imports may be added')
  const extras = ast.statements.filter(ts.isImportDeclaration).filter(node => allowedImports.has(node.moduleSpecifier.text))
  assert.equal(extras.length, requireCheckin ? 2 : 0, 'Both exact check-in imports must occur once')
  assert.equal(new Set(extras.map(node => node.moduleSpecifier.text)).size, extras.length, 'No duplicate check-in import')
  for (const node of extras) assert.equal(node.getText(ast), allowedImports.get(node.moduleSpecifier.text), 'Check-in imports use exact approved symbols')
  const globals = tree => tree.statements.filter(node => !ts.isImportDeclaration(node)
    && !ts.isFunctionDeclaration(node)).map(node => node.getText(tree))
  assert.deepEqual(globals(ast), globals(oldApp), 'Shared routes, globals, image helper and preload list must stay exact')
}
const liveApp = normalize(current('app/src/App.tsx'))
assertFrozenApp(liveApp)
assert.equal(normalize(beforeCheckinSource('app/src/App.tsx', liveApp)), oldSource, 'Exact check-in inverse restores the fixed baseline App')
assert.throws(() => assertFrozenApp(oldSource + '\nconst undocumentedGlobal = true\n', false), /Shared routes/)
assert.throws(() => assertFrozenApp("import './unapproved-module'\n" + oldSource, false), /isolated check-in imports/)
assert.throws(() => assertFrozenApp(oldSource + '\nfunction undocumentedSharedFunction() {}\n', false), /shared App functions/)
const firstProtected = oldApp.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text !== 'Ch2Screen' && node.body)
assert.throws(() => assertFrozenApp(oldSource.slice(0, firstProtected.body.getStart(oldApp) + 1)
  + '\nvoid "unauthorized regression";\n' + oldSource.slice(firstProtected.body.getStart(oldApp) + 1), false), /only Ch2Screen/)

const additions = prefix => [...new Set([
  git('diff', '--name-only', '--diff-filter=A', baseline, '--', prefix).toString('utf8'),
  git('ls-files', '--others', '--exclude-standard', '--', prefix).toString('utf8'),
].join('\n').split(/\r?\n/).filter(Boolean))].sort()
assert.deepEqual(priorSourcePaths(additions('app/src')).filter(path => !POLISH_ADDED_SOURCE.includes(path) && !REWARDS_ROUND_ADDED_SOURCE.includes(path) && !CT_SEQUENCES_ADDED_SOURCE.includes(path)), CHECKIN_ADDED_FILES, 'Only three isolated check-in source files after the newer LIVE audit')
assert.deepEqual(priorMediaPaths(additions('app/public/assets'), baseline).filter(path => !POLISH_ADDED_MEDIA.includes(path) && !REWARDS_ROUND_ADDED_MEDIA.includes(path) && !CT_SEQUENCES_ADDED_MEDIA.includes(path)), [], 'Check-in adds no image assets')
assert.deepEqual(priorMediaPaths(additions('app/public/audio'), baseline), [], 'Check-in adds no audio assets; only the independently verified later voice is projected out')
let mediaCount = 0
for (const entry of git('ls-tree', '-r', '-z', baseline, '--', 'app/public/assets', 'app/public/audio')
  .toString('utf8').split('\0').filter(Boolean)) {
  const match = /^\d+ blob ([0-9a-f]+)\t(.+)$/.exec(entry)
  assert(match)
  const [, expected, path] = match
  assertHistoricalMedia(path, { gitBlob: expected })
  mediaCount++
}
console.log(`PASS ${baseline} check-in LIVE freeze: ${protectedFiles.length} exact protected files, ${oldFunctions.size - 1} exact App functions, two scoped imports and exact Ch2Screen inverse, ${mediaCount} original media, three isolated additions; negative mutation probes rejected.`)
