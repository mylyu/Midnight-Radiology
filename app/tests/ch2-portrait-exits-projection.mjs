// Exact outer review: never replace a live file with an unchecked Git baseline.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

export const CH2_PORTRAIT_EXITS_BASELINE = 'a1ed6f852714e4b30506c864fb3d04b3c2fae690'
const ledgerSha = '8ee6f0956953b1e9094c03654c0b9c76e34b51ff8f28b7a2ec466f73361bf788'
const edited = ['app/src/App.tsx', 'app/src/game/ch2-pacing.ts', 'app/src/game/ch2-social.ts', 'app/src/game/ch2.ts']
const added = ['app/src/game/ch2-scene.ts']
const root = new URL('../../', import.meta.url)
const read = path => readFileSync(new URL(path, root))
const norm = value => value.toString().replaceAll('\r\n', '\n').trimEnd() + '\n'
const sha = value => createHash('sha256').update(value).digest('hex')
const git = (...args) => execFileSync('git', args, { cwd: fileURLToPath(root), maxBuffer: 32e6 })
const originals = new Map(), endings = new Map()
const original = path => {
  if (!originals.has(path)) {
    const source = git('show', `${CH2_PORTRAIT_EXITS_BASELINE}:${path}`).toString().replaceAll('\r\n', '\n')
    originals.set(path, norm(source))
    endings.set(path, source.match(/\s*$/)[0])
  }
  return originals.get(path)
}
let ledger
export function ch2PortraitExitsLedger() {
  if (ledger) return ledger
  const raw = norm(read('docs/ch2-portrait-exits-source-deltas.json'))
  assert.equal(sha(raw), ledgerSha, 'Portrait exits: independently fixed exact-hunk ledger SHA')
  const review = JSON.parse(read('docs/ch2-portrait-exits-review.json'))
  assert.equal(review.baseline, CH2_PORTRAIT_EXITS_BASELINE)
  assert.equal(review.status, 'reviewed')
  assert.equal(review.sourceDeltasSha256, ledgerSha)
  ledger = JSON.parse(raw)
  assert.equal(ledger.baseline, CH2_PORTRAIT_EXITS_BASELINE)
  assert.deepEqual(ledger.files.map(row => row.path), edited)
  assert.deepEqual(ledger.added.map(row => row.path), added)
  for (const row of ledger.files) {
    assert.equal(row.beforeSha256, sha(original(row.path)))
    assert(row.edits.length)
  }
  return ledger
}

/** Accept the exact reviewed live file or an already inverted baseline only. */
export function beforeCh2PortraitExitsSource(path, source) {
  if (!edited.includes(path)) return source
  const current = norm(source), before = original(path)
  if (current === before) return source
  const row = ch2PortraitExitsLedger().files.find(row => row.path === path)
  assert.equal(sha(current), row.afterSha256, `${path}: undocumented mutation outside reviewed portrait exits`)
  const lines = current.trimEnd().split('\n')
  for (const edit of [...row.edits].reverse()) {
    assert.deepEqual(lines.slice(edit.afterStart, edit.afterStart + edit.after.length), edit.after,
      `${path}: undocumented mutation in portrait-exit hunk`)
    lines.splice(edit.afterStart, edit.after.length, ...edit.before)
  }
  const restored = lines.join('\n') + '\n'
  assert.equal(restored, before, `${path}: undocumented mutation outside exact portrait-exit hunks`)
  return restored.trimEnd() + endings.get(path)
}

export function assertCh2PortraitExitsAdditions() {
  for (const row of ch2PortraitExitsLedger().added) {
    assert.equal(sha(norm(read(row.path))), row.sha256, `${row.path}: undocumented mutation in pinned portrait helper`)
  }
}
export function priorCh2PortraitExitsPaths(paths) {
  assertCh2PortraitExitsAdditions()
  return paths.filter(path => !added.includes(path))
}
export function assertCh2PortraitExitsLive() {
  for (const row of ch2PortraitExitsLedger().files) {
    const live = norm(read(row.path))
    assert.equal(sha(live), row.afterSha256, `${row.path}: reviewed portrait-exit changes must be live`)
    assert.equal(norm(beforeCh2PortraitExitsSource(row.path, live)), original(row.path))
  }
  assertCh2PortraitExitsAdditions()
}

const parse = (path, source) => ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true,
  path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assertCh2PortraitExitsLive()
  const tracked = prefix => git('ls-tree', '-r', '--name-only', CH2_PORTRAIT_EXITS_BASELINE, '--', prefix)
    .toString().trim().split('\n').filter(Boolean)
  const files = [...tracked('app/src'), ...tracked('app/scripts'), 'app/package.json', 'app/package-lock.json',
    'app/index.html', 'app/vite.config.ts', 'app/tsconfig.json', 'app/tsconfig.app.json', 'app/.gitignore',
    '深夜影像科/全书剧情总线.md', ...tracked('.github/workflows'),
    ...tracked('docs').filter(path => /(?:source-deltas|review)\.json$/.test(path))]
  for (const path of files) {
    assert.equal(norm(beforeCh2PortraitExitsSource(path, read(path))), original(path),
      `${path}: no unreviewed source/config/story/previous-ledger changes`)
  }
  const current = [...new Set(git('ls-files', '--cached', '--others', '--exclude-standard', '--', 'app/src', 'app/scripts')
    .toString().trim().split('\n'))].sort()
  assert.deepEqual(priorCh2PortraitExitsPaths(current), [...tracked('app/src'), ...tracked('app/scripts')].sort(),
    'Only the independently pinned scene helper may be added')

  // Independently constrain the code boundary, not just the whole-file hashes.
  const appPath = 'app/src/App.tsx'
  const beforeApp = parse(appPath, original(appPath)), liveApp = parse(appPath, norm(read(appPath)))
  const declarations = tree => new Map(tree.statements.filter(ts.isFunctionDeclaration)
    .map(node => [node.name.text, node.getText(tree)]))
  const beforeFunctions = declarations(beforeApp), liveFunctions = declarations(liveApp)
  assert.deepEqual([...liveFunctions.keys()], [...beforeFunctions.keys()])
  for (const [name, source] of beforeFunctions) if (name !== 'Ch2Screen') {
    assert.equal(liveFunctions.get(name), source, `${name}: other chapters, entry, guards and shared gameplay remain exact`)
  }
  const outsideFunctions = tree => tree.statements.filter(node => !ts.isFunctionDeclaration(node))
    .map(node => node.getText(tree)).filter(source => source !== "import { ch2SceneView } from './game/ch2-scene'")
  assert.deepEqual(outsideFunctions(liveApp), outsideFunctions(beforeApp), 'Only the scene helper import changes outside Ch2Screen')

  // Every data-node property except the seven explicit sprite values is frozen.
  const nodesIn = (path, source) => {
    const tree = parse(path, source), nodes = new Map()
    const visit = node => {
      if (ts.isPropertyAssignment(node) && ts.isObjectLiteralExpression(node.initializer)) {
        const name = node.name.getText(tree).replace(/^['"]|['"]$/g, '')
        if (/^c2[^_]*_/.test(name)) nodes.set(name, new Map(node.initializer.properties.map(property =>
          [property.name?.getText(tree), property.getText(tree)])))
      }
      ts.forEachChild(node, visit)
    }
    visit(tree)
    return nodes
  }
  const spriteOnly = {
    'app/src/game/ch2-pacing.ts': ['c2n5_sms_lei_pending'],
    'app/src/game/ch2-social.ts': ['c2n5_chat_q'],
    'app/src/game/ch2.ts': ['c2n5_n7', 'c2n5_n8', 'c2n5_n8a', 'c2n5_n8b', 'c2n5_n8c'],
  }
  let spriteChanges = 0
  for (const [path, permitted] of Object.entries(spriteOnly)) {
    const before = nodesIn(path, original(path)), live = nodesIn(path, norm(read(path)))
    assert.deepEqual([...live.keys()], [...before.keys()])
    for (const [name, properties] of before) {
      const next = live.get(name)
      if (permitted.includes(name)) {
        assert.equal(next.get('sprite'), "sprite: ''", `${name}: explicit portrait exit`)
        const withoutSprite = record => [...record].filter(([key]) => key !== 'sprite')
        assert.deepEqual(withoutSprite(next), withoutSprite(properties), `${name}: no text/effect/choice/audio change`)
        spriteChanges++
      } else assert.deepEqual(next, properties, `${name}: unrequested node untouched`)
    }
  }
  assert.equal(spriteChanges, 7)

  const publicPaths = []
  for (const entry of git('ls-tree', '-r', '-z', CH2_PORTRAIT_EXITS_BASELINE, '--', 'app/public').toString().split('\0').filter(Boolean)) {
    const [, expected, path] = /^\d+ blob ([0-9a-f]+)\t(.+)$/.exec(entry), bytes = read(path)
    if (/\.(?:html|svg|txt)$/.test(path)) assert.equal(norm(bytes), original(path))
    else assert.equal(createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'), expected,
      `${path}: public media bytes unchanged`)
    publicPaths.push(path)
  }
  const filesAt = path => readdirSync(new URL(path + '/', root), { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? filesAt(`${path}/${entry.name}`) : [`${path}/${entry.name}`])
  assert.deepEqual(filesAt('app/public').sort(), publicPaths.sort(), 'No public additions/deletions/replacements')

  let probes = 0
  for (const row of ch2PortraitExitsLedger().files) {
    const live = norm(read(row.path))
    for (const edit of row.edits) {
      const lines = live.trimEnd().split('\n'), index = Math.min(edit.afterStart, lines.length - 1)
      lines[index] += ' // forbidden mutation'
      assert.throws(() => beforeCh2PortraitExitsSource(row.path, lines.join('\n')), /undocumented mutation/)
      probes++
    }
    assert.throws(() => beforeCh2PortraitExitsSource(row.path, live + '// forbidden append\n'), /undocumented mutation/)
    probes++
  }
  for (const row of ch2PortraitExitsLedger().added) {
    assert.throws(() => assert.equal(sha(norm(read(row.path)) + '// forbidden append\n'), row.sha256))
    probes++
  }
  assert.deepEqual(priorCh2PortraitExitsPaths([...added, 'app/src/unreviewed.ts']), ['app/src/unreviewed.ts'])
  console.log(`PASS Ch2 portrait-exits LIVE freeze: ${files.length} source/config/story/previous ledgers, ${publicPaths.length} unchanged public files; 4 exact inversions, 1 pinned helper, 7 sprite-only nodes, ${probes} mutations rejected. Ch1, DR/DSA, dialogue, rewards, preload manifest and audio unchanged.`)
}
