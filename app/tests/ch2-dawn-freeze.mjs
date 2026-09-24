// Historical sunrise boundary. A separate latest-round LIVE freeze runs first;
// only its exact reviewed source hunks are then reversed for these old checks.
import { payoffMediaHashes } from './ch2-payoffs-freeze.mjs'
import { beforePayoffSource } from './ch2-payoffs-projection.mjs'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const ts = createRequire(import.meta.url)('typescript')
const baseline = 'b3de319'
const git = (...args) => execFileSync('git', args, { cwd: root, maxBuffer: 48 * 1024 * 1024 })
const normalize = text => text.replaceAll('\r\n', '\n')
const original = file => normalize(git('show', `${baseline}:${file}`).toString('utf8'))
const current = file => normalize(beforePayoffSource(file, readFileSync(path.join(root, file), 'utf8')))
const tracked = prefix => git('ls-tree', '-r', '--name-only', baseline, '--', prefix)
  .toString('utf8').trim().split('\n').filter(Boolean)

// Every pre-existing module except the two exact integration files is frozen,
// including all earlier Ch2 mechanics as well as Ch1/DR/DSA and voice aliases.
const sharedFiles = tracked('app/src').filter(file => file !== 'app/src/App.tsx'
  && file !== 'app/src/game/ch2.ts')
sharedFiles.push('app/package.json', 'app/package-lock.json', 'app/index.html',
  'app/vite.config.ts', 'app/tsconfig.json', 'app/tsconfig.app.json')
for (const file of sharedFiles) {
  assert.equal(current(file), original(file), `${file}: shared/Ch1/DR/DSA source and dependencies must stay frozen`)
}

const parse = source => ts.createSourceFile('App.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const oldApp = parse(original('app/src/App.tsx'))
const funcs = ast => new Map(ast.statements.filter(ts.isFunctionDeclaration)
  .map(node => [node.name?.text, node.getText(ast)]))
const oldFunctions = funcs(oldApp)
const allowedImports = new Map([
  ['./components/Ch2DawnScene', "import { Ch2DawnScene } from './components/Ch2DawnScene'"],
  ['./game/ch2-dawn', "import { CH2_DAWN_SHOTS } from './game/ch2-dawn'"],
])
function assertFrozenApp(source) {
  const ast = parse(source), after = funcs(ast)
  assert.deepEqual([...after.keys()], [...oldFunctions.keys()], 'No added/removed/renamed shared App functions')
  for (const [name, body] of oldFunctions) if (name !== 'Ch2Screen') {
    assert.equal(after.get(name), body, `${name}: only Ch2Screen is editable in this round`)
  }
  const imports = tree => tree.statements.filter(ts.isImportDeclaration)
    .filter(node => !allowedImports.has(node.moduleSpecifier.text)).map(node => node.getText(tree))
  assert.deepEqual(imports(ast), imports(oldApp), 'Only the two isolated dawn imports may be added')
  const extras = ast.statements.filter(ts.isImportDeclaration).filter(node => allowedImports.has(node.moduleSpecifier.text))
  assert(extras.length <= 2, 'Only two isolated dawn imports are allowed')
  assert.equal(new Set(extras.map(node => node.moduleSpecifier.text)).size, extras.length, 'No duplicate dawn import')
  for (const node of extras) assert.equal(node.getText(ast), allowedImports.get(node.moduleSpecifier.text), 'Dawn imports use exact approved symbols')
  const globals = tree => tree.statements.filter(node => !ts.isImportDeclaration(node)
    && !ts.isFunctionDeclaration(node)).map(node => node.getText(tree))
  assert.deepEqual(globals(ast), globals(oldApp), 'Shared routes, globals, image helper and preload list must stay exact')
}
assertFrozenApp(current('app/src/App.tsx'))
const oldSource = original('app/src/App.tsx')
assert.throws(() => assertFrozenApp(oldSource + '\nconst undocumentedGlobal = true\n'), /Shared routes/)
assert.throws(() => assertFrozenApp("import './unapproved-module'\n" + oldSource), /isolated dawn imports/)
assert.throws(() => assertFrozenApp(oldSource + '\nfunction undocumentedSharedFunction() {}\n'), /shared App functions/)
const firstProtected = oldApp.statements.find(node => ts.isFunctionDeclaration(node)
  && node.name?.text !== 'Ch2Screen' && node.body)
assert.throws(() => assertFrozenApp(oldSource.slice(0, firstProtected.body.getStart(oldApp) + 1)
  + '\nvoid "unauthorized regression";\n' + oldSource.slice(firstProtected.body.getStart(oldApp) + 1)), /only Ch2Screen/)

// Hash every old image/audio blob, including old second-chapter illustrations.
// New sunrise media use two exact sibling names and are checked below.
let mediaCount = 0
const media = git('ls-tree', '-r', '-z', baseline, '--', 'app/public/assets', 'app/public/audio')
  .toString('utf8').split('\0').filter(Boolean)
for (const entry of media) {
  const match = /^\d+ blob ([0-9a-f]+)\t(.+)$/.exec(entry)
  assert(match, `Unexpected media entry: ${entry}`)
  const [, expected, file] = match, bytes = readFileSync(path.join(root, file))
  const actual = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')
  assert.equal(actual, expected, `Existing media overwritten/deleted: ${file}; add a new Ch2-specific file`)
  mediaCount++
}

// Pin the accepted voices independently of editable live provenance, too.
const approvedVoices = new Map([
  ['app/public/audio/vox_ch1_fan_mature_20260923.mp3', 'd930972c651850a77ddc95f8b7d8319f5a3dcca90d6eb46d072e18171feaa42b'],
  ['app/public/audio/vox_ch1_worker_bass_20260923.mp3', '0d2f96f356c470547b2ff6ad6e9d758cd201c63b2c019aab7a18b3624aec4b47'],
  ['app/public/audio/vox_ch1_thin_breathless_20260923.mp3', '939970bea5252a7cc14c096b3973cd7d8fc7f220b8f3c6358e6ec97a43c72659'],
])
const voiceRecord = 'docs/ch1-voices-20260923.json'
assert.equal(current(voiceRecord), original(voiceRecord), 'Approved Ch1 voice provenance is frozen')
const approved = JSON.parse(original(voiceRecord))
assert.equal(approved.user_approved, true)
assert.equal(approved.takes.length, approvedVoices.size)
for (const voice of approved.takes) {
  assert.equal(voice.sha256, approvedVoices.get(voice.output), 'Historical approved-voice identity mismatch')
  assert.equal(createHash('sha256').update(readFileSync(path.join(root, voice.output))).digest('hex'),
    approvedVoices.get(voice.output), `Approved voice changed: ${voice.output}`)
}
const assets = JSON.parse(readFileSync(path.join(root, 'docs/ch2-dawn-assets.json'), 'utf8'))
const expectedNew = new Map([
  ['app/public/assets/ch2_dawn_window_v1.png', '3729695006bdf69b72d98fdcf2bed0bee7c986aa41164b710fd738c568f578bc'],
  ['app/public/assets/ch2_dawn_window_portrait_v1.png', 'ab69cdbf532644e175328b13cd2baa350e1eef77b5352441e6c1854642d15206'],
])
assert.deepEqual(assets.assets.map(row => row.output).sort(), [...expectedNew.keys()].sort(), 'Exactly two dedicated sunrise images')
for (const row of assets.assets) {
  assert.equal(row.sha256, expectedNew.get(row.output), 'Recorded image identity must remain approved')
  assert.equal(createHash('sha256').update(readFileSync(path.join(root, row.output))).digest('hex'), expectedNew.get(row.output), 'New image hash mismatch')
}
const addedMedia = [
  git('diff', '--name-only', '--diff-filter=A', baseline, '--', 'app/public/assets', 'app/public/audio').toString('utf8'),
  git('ls-files', '--others', '--exclude-standard', '--', 'app/public/assets', 'app/public/audio').toString('utf8'),
].join('\n').split(/\r?\n/).filter(Boolean)
assert.deepEqual([...new Set(addedMedia)].filter(file => !payoffMediaHashes.has(file)).sort(), [...expectedNew.keys()].sort(), 'Only named sunrise images may be added after exact later-media verification, no new sound')
console.log(`PASS ${baseline} dawn live freeze: ${sharedFiles.length} shared modules/configs; ${oldFunctions.size - 1} exact App functions; imports/globals; ${mediaCount} existing media; three independently pinned approved Ch1 voices. Negative mutation probes rejected.`)
