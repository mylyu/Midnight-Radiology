// Historical needle/terminal boundary: exact later sunrise hunks are inverted
// only for App assertions. The imported dawn guard independently checks LIVE
// shared code; all old media and voice hashes below are still read directly.
import './ch2-dawn-freeze.mjs'
import { beforeDawnSource } from './ch2-dawn-projection.mjs'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const ts = createRequire(import.meta.url)('typescript')
const baseline = '194c442'
const git = (...args) => execFileSync('git', args, { cwd: root, maxBuffer: 48 * 1024 * 1024 })
const normalize = text => text.replaceAll('\r\n', '\n')
const original = file => normalize(git('show', `${baseline}:${file}`).toString('utf8'))
const current = file => normalize(readFileSync(path.join(root, file), 'utf8'))
const tracked = prefix => git('ls-tree', '-r', '--name-only', baseline, '--', prefix)
  .toString('utf8').trim().split('\n').filter(Boolean)

// Every pre-existing non-Ch2 module is frozen, not only the obvious story/store.
// This also covers shared UI components, route hooks and the approved voice aliases.
const sharedFiles = tracked('app/src').filter(file => file !== 'app/src/App.tsx'
  && !/^app\/src\/(?:game\/ch2(?:[.-])|components\/Ch2)/.test(file))
sharedFiles.push('app/package.json', 'app/package-lock.json', 'app/index.html',
  'app/vite.config.ts', 'app/tsconfig.json', 'app/tsconfig.app.json')
for (const file of sharedFiles) {
  assert.equal(beforeDawnSource(file, current(file)), original(file), `${file}: shared/Ch1/DR/DSA source and dependencies must stay frozen after exact later-source verification`)
}

const parse = source => ts.createSourceFile('App.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const oldApp = parse(original('app/src/App.tsx'))
const funcs = ast => new Map(ast.statements.filter(ts.isFunctionDeclaration)
  .map(node => [node.name?.text, node.getText(ast)]))
const oldFunctions = funcs(oldApp)
const allowedImport = './components/Ch2MysteryMedia'
function assertFrozenApp(source) {
  const ast = parse(source), after = funcs(ast)
  assert.deepEqual([...after.keys()], [...oldFunctions.keys()], 'No added/removed/renamed shared App functions')
  for (const [name, body] of oldFunctions) if (name !== 'Ch2Screen') {
    assert.equal(after.get(name), body, `${name}: only Ch2Screen is editable in this round`)
  }
  const imports = tree => tree.statements.filter(ts.isImportDeclaration)
    .filter(node => node.moduleSpecifier.text !== allowedImport).map(node => node.getText(tree))
  assert.deepEqual(imports(ast), imports(oldApp), 'Only the isolated Ch2MysteryMedia import may be added')
  const extras = ast.statements.filter(ts.isImportDeclaration).filter(node => node.moduleSpecifier.text === allowedImport)
  assert(extras.length <= 1, 'Only one isolated mystery import is allowed')
  const globals = tree => tree.statements.filter(node => !ts.isImportDeclaration(node)
    && !ts.isFunctionDeclaration(node)).map(node => node.getText(tree))
  assert.deepEqual(globals(ast), globals(oldApp), 'Shared routes, globals, image helper and preload list must stay exact')
}
assertFrozenApp(beforeDawnSource('app/src/App.tsx', current('app/src/App.tsx')))
const oldSource = original('app/src/App.tsx')
assert.throws(() => assertFrozenApp(oldSource + '\nconst undocumentedGlobal = true\n'), /Shared routes/)
assert.throws(() => assertFrozenApp("import './unapproved-module'\n" + oldSource), /isolated Ch2MysteryMedia/)
assert.throws(() => assertFrozenApp(oldSource + '\nfunction undocumentedSharedFunction() {}\n'), /shared App functions/)
const firstProtected = oldApp.statements.find(node => ts.isFunctionDeclaration(node)
  && node.name?.text !== 'Ch2Screen' && node.body)
assert.throws(() => assertFrozenApp(oldSource.slice(0, firstProtected.body.getStart(oldApp) + 1)
  + '\nvoid "unauthorized regression";\n' + oldSource.slice(firstProtected.body.getStart(oldApp) + 1)), /only Ch2Screen/)

// Hash every old image/audio blob, including old second-chapter illustrations.
// New mystery media use sibling names and therefore need no allowlist exception.
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
console.log(`PASS ${baseline} mystery freeze: ${sharedFiles.length} shared modules/configs; ${oldFunctions.size - 1} exact App functions; imports/globals; ${mediaCount} existing media; three independently pinned approved Ch1 voices. Negative mutation probes rejected.`)
