// Published-baseline hard gate for the second-chapter loop round.
// Keep the older 1452d78 pacing guard separately; this one includes the approved Ch1 voice revision.
import assert from 'node:assert/strict'
import { assertHistoricalMedia, priorMediaPaths, priorSourcePaths, inspectLiveImage } from './game-delivery-media.mjs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { beforeMysterySource } from './ch2-mystery-projection.mjs'

const require = createRequire(import.meta.url), ts = require('typescript')
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const baseline = '05889fa'
const git = (...args) => execFileSync('git', args, { cwd: root, maxBuffer: 32 * 1024 * 1024 })
const original = file => git('show', `${baseline}:${file}`).toString('utf8').replaceAll('\r\n', '\n')
const current = file => beforeMysterySource(file, readFileSync(path.join(root, file), 'utf8').replaceAll('\r\n', '\n'))
const parse = (file, source) => ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true,
  file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
const declarations = (file, source, predicate) => {
  const ast = parse(file, source)
  return new Map(ast.statements.filter(predicate).filter(node => node.name).map(node => [node.name.text, node.getText(ast)]))
}
for (const file of ['app/src/game/data.ts', 'app/src/game/store.ts', 'app/src/game/dlc.ts',
  'app/src/index.css', 'app/src/App.css', 'app/src/main.tsx', 'app/package.json', 'app/package-lock.json']) {
  assert.equal(current(file), original(file), `${file}: Ch1/DR/DSA logic, audio aliases, dependencies and global styles stay frozen`)
}

const oldApp = parse('App.tsx', original('app/src/App.tsx')), newApp = parse('App.tsx', current('app/src/App.tsx'))
const beforeFunctions = declarations('App.tsx', original('app/src/App.tsx'), ts.isFunctionDeclaration)
const afterFunctions = declarations('App.tsx', current('app/src/App.tsx'), ts.isFunctionDeclaration)
const allowedFunctions = new Set(['Ch2Screen', 'Ch2Quiz'])
for (const [name, body] of beforeFunctions) if (!allowedFunctions.has(name)) {
  assert.equal(afterFunctions.get(name), body, `Shared/Ch1/DR/DSA App function changed: ${name}`)
}
for (const name of afterFunctions.keys()) assert(beforeFunctions.has(name), `Unexpected shared App function added: ${name}`)
const extraImports = new Set(['./components/Ch2Settlement', './components/Ch2ScanOverlay', './components/Ch2ObservationImage', './game/ch2-scans',
  './game/ch2-observations', './game/ch2-ledger', './game/ch2-gifts', './game/ch2-playback'])
const normalizeImports = ast => ast.statements.filter(ts.isImportDeclaration).filter(node => !extraImports.has(node.moduleSpecifier.text))
  .map(node => node.getText(ast).replace(/, CH2_CARDS, CH2_ACTIVE_CARDS, CH2_CARDS_LEGACY(?=,)/, ''))
assert.deepEqual(normalizeImports(newApp), normalizeImports(oldApp), 'Only explicitly approved Ch2 imports may differ')
const globals = ast => ast.statements.filter(node => !ts.isFunctionDeclaration(node) && !ts.isImportDeclaration(node)).map(node => node.getText(ast))
assert.deepEqual(globals(newApp), globals(oldApp), 'Shared globals, routes, image helper and preload list are frozen')

const oldTypes = parse('types.ts', original('app/src/game/types.ts')), newTypes = parse('types.ts', current('app/src/game/types.ts'))
const interfaceMap = ast => new Map(ast.statements.filter(ts.isInterfaceDeclaration).map(node => [node.name.text, node]))
const originalTypes = interfaceMap(oldTypes), currentTypes = interfaceMap(newTypes)
for (const [name, node] of originalTypes) {
  const after = currentTypes.get(name)
  assert(after, `Removed interface ${name}`)
  if (name !== 'DlcProgress') assert.equal(after.getText(newTypes), node.getText(oldTypes), `${name}: original interface must be exact`)
}
const members = (node, ast) => new Map(node.members.map(member => [member.name.getText(ast), member]))
const beforeProgress = members(originalTypes.get('DlcProgress'), oldTypes), afterProgress = members(currentTypes.get('DlcProgress'), newTypes)
for (const [name, member] of beforeProgress) assert.equal(afterProgress.get(name)?.getText(newTypes), member.getText(oldTypes), `DlcProgress.${name} changed`)
const allowedFields = new Set(['loop', 'scanSessions', 'observations', 'observationRewardShifts', 'giftReply'])
for (const [name, member] of afterProgress) if (!beforeProgress.has(name)) {
  assert(allowedFields.has(name), `Unexpected shared progress field ${name}`)
  assert(member.questionToken, `New Ch2 field ${name} must remain optional for old saves`)
}
for (const name of currentTypes.keys()) if (!originalTypes.has(name)) {
  assert(['Ch2LedgerSnapshot', 'Ch2LedgerEntry', 'Ch2LoopProgress'].includes(name), `Unapproved added interface ${name}`)
}

let mediaCount = 0
const blobs = git('ls-tree', '-r', '-z', baseline, '--', 'app/public/assets', 'app/public/audio').toString('utf8').split('\0').filter(Boolean)
for (const line of blobs) {
  const match = /^\d+ blob ([0-9a-f]+)\t(.+)$/.exec(line)
  assert(match, `Unexpected media entry ${line}`)
  const [, expected, file] = match
  assertHistoricalMedia(file, { gitBlob: expected })
  mediaCount++
}
const approved = JSON.parse(current('docs/ch1-voices-20260923.json'))
assert.equal(approved.takes.length, 3)
for (const voice of approved.takes) {
  assert.equal(createHash('sha256').update(readFileSync(path.join(root, voice.output))).digest('hex'), voice.sha256)
}
console.log(`PASS ${baseline} freeze: ${beforeFunctions.size - allowedFunctions.size} shared/Ch1/DR/DSA App functions; original story/store/styles/dependencies and types; ${mediaCount} existing media hashes including all three approved Ch1 voices.`)
