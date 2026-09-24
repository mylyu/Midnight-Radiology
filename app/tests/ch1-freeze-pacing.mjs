// Hard gate for the 1452d78 -> chapter-two pacing round. No refreshed baseline.
// Compare real Git blobs, not a generated snapshot that could bless regressions.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { beforeMysterySource } from './ch2-mystery-projection.mjs'
import { beforeApprovedCh1Voices } from './ch1-approved-voices-projection.mjs'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const baseline = '1452d78'
const git = (...args) => execFileSync('git', args, { cwd: root, maxBuffer: 24 * 1024 * 1024 })
const original = file => git('show', `${baseline}:${file}`).toString('utf8').replaceAll('\r\n', '\n')
const current = file => beforeApprovedCh1Voices(file,
  beforeMysterySource(file, readFileSync(path.join(root, file), 'utf8').replaceAll('\r\n', '\n')))
const parsed = (file, source) => ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true,
  file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
const declarations = (file, source, predicate) => {
  const ast = parsed(file, source)
  return new Map(ast.statements.filter(predicate).filter(node => node.name)
    .map(node => [node.name.text, node.getText(ast)]))
}

for (const file of ['app/src/game/data.ts', 'app/src/game/store.ts', 'app/src/game/dlc.ts',
  'app/src/index.css', 'app/src/App.css', 'app/src/main.tsx', 'app/package.json']) {
  assert.equal(current(file), original(file), `${file} must remain frozen, including Ch1/DR/DSA behavior`)
}

const beforeFunctions = declarations('App.tsx', original('app/src/App.tsx'), ts.isFunctionDeclaration)
const afterFunctions = declarations('App.tsx', current('app/src/App.tsx'), ts.isFunctionDeclaration)
const allowed = new Set(['Ch2Screen', 'Ch2Quiz'])
for (const [name, body] of beforeFunctions) {
  if (!allowed.has(name)) assert.equal(afterFunctions.get(name), body,
    `${name} changed outside the approved chapter-two component boundary`)
}
const globals = source => {
  const ast = parsed('App.tsx', source)
  return ast.statements.filter(node => ts.isVariableStatement(node) || ts.isTypeAliasDeclaration(node))
    .map(node => node.getText(ast))
}
assert.deepEqual(globals(current('app/src/App.tsx')), globals(original('app/src/App.tsx')),
  'Shared route type, image helper and original preload list must remain unchanged')
const beforeTypes = declarations('types.ts', original('app/src/game/types.ts'), ts.isInterfaceDeclaration)
const afterTypes = declarations('types.ts', current('app/src/game/types.ts'), ts.isInterfaceDeclaration)
for (const name of ['Effect', 'Cond', 'Choice', 'Night', 'GameState', 'ShopItem']) {
  assert.equal(afterTypes.get(name), beforeTypes.get(name), `${name}: first-chapter/shared contract changed`)
}
// The only shared Step addition is optional metadata; all existing members stay exact.
const stepMembers = source => {
  const ast = parsed('types.ts', source)
  return new Map(ast.statements.find(node => ts.isInterfaceDeclaration(node) && node.name.text === 'Step')
    .members.map(node => [node.name.getText(ast), node.getText(ast)]))
}
const oldStep = stepMembers(original('app/src/game/types.ts'))
const newStep = stepMembers(current('app/src/game/types.ts'))
for (const [name, value] of oldStep) assert.equal(newStep.get(name), value, `Step.${name} modified`)
for (const [name, value] of newStep) {
  if (!oldStep.has(name)) assert.match(value, /^imageLabel\?\s*:\s*string/, `Unapproved shared Step addition: ${name}`)
}

const blobs = git('ls-tree', '-r', '-z', baseline, '--', 'app/public/assets', 'app/public/audio')
  .toString('utf8').split('\0').filter(Boolean)
let assetCount = 0
for (const line of blobs) {
  const match = /^\d+ blob ([0-9a-f]+)\t(.+)$/.exec(line)
  assert(match, `Unexpected asset Git entry: ${line}`)
  const [, expected, file] = match
  const content = readFileSync(path.join(root, file))
  const actual = createHash('sha1').update(`blob ${content.length}\0`).update(content).digest('hex')
  assert.equal(actual, expected, `Existing shared/Ch1/DLC asset was replaced: ${file}; use a Ch2-specific sibling`)
  assetCount++
}
console.log(`PASS frozen baseline ${baseline}: ${beforeFunctions.size - allowed.size} App functions, Ch1/DR/DSA data/store/styles, existing type members, and ${assetCount} original media hashes.`)
