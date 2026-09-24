// Latest LIVE boundary: exact chapter-two changes only, then older historical
// audits may reverse this layer while retaining every original baseline.
import assert from 'node:assert/strict'
import './ch2-ct-sequences-freeze.mjs'
import { beforeCtSequencesSource, CT_SEQUENCES_ADDED_SOURCE, CT_SEQUENCES_ADDED_MEDIA } from './ch2-ct-sequences-projection.mjs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { beforeRewardsRoundSource, REWARDS_ROUND_BASELINE as baseline,
  REWARDS_ROUND_ADDED_SOURCE } from './ch2-rewards-round-projection.mjs'

const root = new URL('../../', import.meta.url)
const git = (...args) => execFileSync('git', args, { cwd: fileURLToPath(root), maxBuffer: 48e6 })
const normalize = source => source.replaceAll('\r\n', '\n').trimEnd() + '\n'
const original = path => normalize(git('show', `${baseline}:${path}`).toString('utf8'))
const current = path => normalize(beforeCtSequencesSource(path, readFileSync(new URL(path, root), 'utf8')))
const tracked = prefix => git('ls-tree', '-r', '--name-only', baseline, '--', prefix)
  .toString('utf8').trim().split('\n').filter(Boolean)
const protectedFiles = [...tracked('app/src'), 'app/package.json', 'app/package-lock.json', 'app/.gitignore',
  'app/index.html', 'app/vite.config.ts', 'app/tsconfig.json', 'app/tsconfig.app.json',
  '深夜影像科/全书剧情总线.md', 'docs/ch1-voices-20260923.json',
  ...tracked('docs').filter(path => path.endsWith('source-deltas.json'))]
for (const path of protectedFiles) {
  assert.equal(normalize(beforeRewardsRoundSource(path, current(path))), original(path), `${path}: only exact approved deltas`)
  assert.throws(() => assert.equal(normalize(beforeRewardsRoundSource(path, current(path) + '\n// unauthorized change\n')), original(path)))
}

const parse = (path, source) => ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true,
  path.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
const oldApp = parse('App.tsx', original('app/src/App.tsx'))
const allowedImports = ["import { recordCh2WindowAttempt } from './game/ch2-window-progress'",
  "import { ch2SideBadgeBackfill } from './game/ch2-side-badges'"]
const functions = ast => new Map(ast.statements.filter(ts.isFunctionDeclaration).map(node => [node.name?.text, node.getText(ast)]))
function assertAppIsolation(source) {
  const ast = parse('App.tsx', source), before = functions(oldApp), after = functions(ast)
  assert.deepEqual([...after.keys()], [...before.keys()], 'No added, deleted or renamed App function')
  for (const [name, body] of before) if (!['Ch2Screen', 'WindowGame'].includes(name)) {
    assert.equal(after.get(name), body, `${name}: only the two chapter-two window functions are editable`)
  }
  const imports = tree => tree.statements.filter(ts.isImportDeclaration).map(node => node.getText(tree))
  const added = imports(ast).filter(source => !imports(oldApp).includes(source))
  assert.deepEqual(added, allowedImports, 'Only two exact isolated imports')
  assert.deepEqual(imports(ast).filter(source => !allowedImports.includes(source)), imports(oldApp), 'All old imports preserved')
  const globals = tree => tree.statements.filter(node => !ts.isFunctionDeclaration(node) && !ts.isImportDeclaration(node)).map(node => node.getText(tree))
  assert.deepEqual(globals(ast), globals(oldApp), 'Shared routes, globals and preload policy unchanged')
}
assertAppIsolation(current('app/src/App.tsx'))
assert.throws(() => assertAppIsolation(current('app/src/App.tsx') + '\nconst undocumentedSharedGlobal = 1\n'), /globals/)
assert.throws(() => assertAppIsolation(current('app/src/App.tsx') + '\nfunction undocumentedSharedFunction() {}\n'), /App function/)
const liveApp = current('app/src/App.tsx'), liveTree = parse('App.tsx', liveApp)
const untouchedFunction = liveTree.statements.find(node => ts.isFunctionDeclaration(node)
  && !['Ch2Screen', 'WindowGame'].includes(node.name?.text) && node.body)
const insideBody = untouchedFunction.body.getStart(liveTree) + 1
assert.throws(() => assertAppIsolation(liveApp.slice(0, insideBody) + '\nvoid "unapproved shared behavior";\n' + liveApp.slice(insideBody)),
  /only the two chapter-two window functions/, 'An otherwise valid edit inside an unrelated function must fail')

const oldTypes = parse('types.ts', original('app/src/game/types.ts'))
const newTypes = parse('types.ts', current('app/src/game/types.ts'))
const statements = ast => ast.statements.filter(node => !(ts.isInterfaceDeclaration(node) && node.name.text === 'DlcProgress')).map(node => node.getText(ast))
assert.deepEqual(statements(newTypes), statements(oldTypes), 'Only the DlcProgress interface may gain an optional field')
const members = ast => ast.statements.find(node => ts.isInterfaceDeclaration(node) && node.name.text === 'DlcProgress').members
const oldMembers = members(oldTypes).map(node => node.getText(oldTypes))
const newMembers = members(newTypes)
assert.deepEqual(newMembers.filter(node => node.name.getText(newTypes) !== 'windowTasks').map(node => node.getText(newTypes)), oldMembers,
  'Every old DLC field remains byte-identical and in the same order')
const windowFields = newMembers.filter(node => node.name.getText(newTypes) === 'windowTasks')
assert.equal(windowFields.length, 1)
assert(windowFields[0].questionToken, 'The window history must be optional for old saves and other DLCs')

const additions = prefix => [...new Set([
  git('diff', '--name-only', '--diff-filter=A', baseline, '--', prefix).toString(),
  git('ls-files', '--others', '--exclude-standard', '--', prefix).toString(),
].join('\n').split(/\r?\n/).filter(Boolean))].sort()
assert.deepEqual(additions('app/src').filter(path => !CT_SEQUENCES_ADDED_SOURCE.includes(path)), REWARDS_ROUND_ADDED_SOURCE, 'Only exact approved new source paths')
assert.deepEqual(additions('app/public/audio'), [], 'No voices or sound assets may change')
let mediaCount = 0
for (const entry of git('ls-tree', '-r', '-z', baseline, '--', 'app/public/assets', 'app/public/audio').toString().split('\0').filter(Boolean)) {
  const match = /^\d+ blob ([0-9a-f]+)\t(.+)$/.exec(entry)
  assert(match)
  const [, expected, path] = match, bytes = readFileSync(new URL(path, root))
  assert.equal(createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'), expected,
    `${path}: every old image/audio byte must remain unchanged`)
  mediaCount++
}

// Independently pinned after visual review, not trusted solely from a mutable
// asset provenance file. Existing media, including item_beef, stays frozen.
export const rewardsRoundMediaHashes = new Map([
  ['app/public/assets/ch2_gift_jiang_sleeve_v1.png', 'd91b4da354a49be3bf231a648c34e58097bc37d0d03727622f8a51ca70893e3d'],
  ['app/public/assets/ch2_gift_lei_pouch_v1.png', '5dbc24c8e341a6df309623889503141c6004f7c9786a61cd71b5385e7b8b7ea4'],
  ['app/public/assets/ch2_gift_luo_pouch_v1.png', '0e25570a678c0dc0f2dddd2ada589ad47f67f4809619836dd744a5d5fb7ef086'],
  ['app/public/assets/ch2_gift_zhou_cup_v1.png', '02fe4035bac63e8ead8e853aac54b7df90ff37caf8bc9316bcf00e0c392c5480'],
])
assert.equal(rewardsRoundMediaHashes.size, 4, 'Record all four reviewed gift images before release')
assert.deepEqual(additions('app/public/assets').filter(path => !CT_SEQUENCES_ADDED_MEDIA.includes(path)), [...rewardsRoundMediaHashes.keys()].sort())
for (const [path, sha256] of rewardsRoundMediaHashes) {
  assert.equal(createHash('sha256').update(readFileSync(new URL(path, root))).digest('hex'), sha256, `${path}: reviewed asset identity`)
}
const provenance = JSON.parse(readFileSync(new URL('docs/ch2-rewards-round-assets.json', root), 'utf8'))
assert.equal(provenance.baseline, baseline)
assert.deepEqual(provenance.assets.map(row => row.path).sort(), [...rewardsRoundMediaHashes.keys()].sort())
assert.deepEqual(provenance.reused.map(row => row.path), ['app/public/assets/item_beef.png'])
for (const asset of provenance.assets) {
  const bytes = readFileSync(new URL(asset.path, root))
  assert.equal(asset.sha256, rewardsRoundMediaHashes.get(asset.path), 'Editable provenance must agree with independent pins')
  assert.equal(asset.bytes, bytes.length)
  assert.equal(asset.width, bytes.readUInt32BE(16))
  assert.equal(asset.height, bytes.readUInt32BE(20))
  assert(asset.prompt.length > 80 && asset.source.endsWith('.png') && asset.reference.startsWith('app/public/assets/'),
    'Exact generation prompt, source output and preserved reference are required')
}
console.log(`PASS rewards-round LIVE freeze: ${protectedFiles.length} exact protected source/config/ledger files; ${functions(oldApp).size - 2} App functions; all old types and ${mediaCount} original media; four pinned additive images, no audio changes`)
