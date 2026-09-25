// New LIVE boundary. Older round guards keep their original baselines and may
// reverse only independently reviewed exact transport/UI-removal hunks.
import assert from 'node:assert/strict'
import './ch2-detail-polish-freeze.mjs'
import { beforeDetailPolishSource, priorDetailSourcePaths } from './ch2-detail-polish-projection.mjs'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { DELIVERY_ROOT as root, DELIVERY_BASELINE as baseline, DELIVERY_ADDED_SOURCE,
  deliveryManifest, deliveryAddedMedia, assertHistoricalMedia, priorMediaPaths } from './game-delivery-media.mjs'
import { beforeGameDeliverySource, DELIVERY_EDITED_FILES } from './game-delivery-projection.mjs'

const manifest = deliveryManifest()
const git = (...args) => execFileSync('git', args, { cwd: fileURLToPath(root), encoding: 'utf8', maxBuffer: 32e6 })
const normalize = source => source.replaceAll('\r\n', '\n').trimEnd() + '\n'
const current = path => normalize(beforeDetailPolishSource(path, readFileSync(new URL(path, root), 'utf8')))
const original = path => normalize(git('show', `${baseline}:${path}`))
const tracked = prefix => git('ls-tree', '-r', '--name-only', baseline, '--', prefix).trim().split('\n').filter(Boolean)
const files = [...tracked('app/src'), ...tracked('app/scripts'), 'app/package.json', 'app/package-lock.json', 'app/.gitignore',
  'app/index.html', 'app/vite.config.ts', 'app/tsconfig.json', 'app/tsconfig.app.json', '深夜影像科/全书剧情总线.md',
  ...tracked('docs').filter(path => /(?:source-deltas|assets|voices-20260923)\.json$/.test(path))]
for (const path of files) {
  if (DELIVERY_EDITED_FILES.includes(path)) assert.notEqual(current(path), original(path), `${path}: the live reviewed delivery change must be present, not wholly reverted`)
  assert.equal(normalize(beforeGameDeliverySource(path, current(path))), original(path), `${path}: exact pre-delivery behavior/source boundary`)
  assert.throws(() => assert.equal(normalize(beforeGameDeliverySource(path, current(path) + '// unauthorized append\n')), original(path)))
}
const ledger = JSON.parse(readFileSync(new URL('docs/game-delivery-source-deltas.json', root), 'utf8'))
let probes = files.length
for (const row of ledger.files) {
  assert(DELIVERY_EDITED_FILES.includes(row.path) && row.edits.length)
  for (const edit of row.edits) {
    const lines = current(row.path).trimEnd().split('\n')
    const offset = edit.after.findIndex(line => line.trim())
    if (offset < 0) continue
    lines[edit.afterStart + offset] += ' // unauthorized hunk mutation'
    assert.throws(() => beforeGameDeliverySource(row.path, lines.join('\n')), /mutation/)
    probes++
  }
}
const additions = prefix => [...new Set([
  git('diff', '--no-renames', '--name-only', '--diff-filter=A', baseline, '--', prefix),
  git('ls-files', '--others', '--exclude-standard', '--', prefix),
].join('\n').split(/\r?\n/).filter(Boolean))].sort()
assert.deepEqual(priorDetailSourcePaths(additions('app/src')), DELIVERY_ADDED_SOURCE, 'Only two exact runtime data catalogs after the separately LIVE-verified detail-polish additions')
assert.deepEqual(additions('app/public/assets'), deliveryAddedMedia(), 'Only the 194 precisely reviewed replacement paths')
assert.deepEqual(priorMediaPaths(additions('app/public/audio'), baseline), [], 'No added/replaced audio beyond the independently verified later voice')
const removedAssets = git('diff', '--no-renames', '--name-only', '--diff-filter=D', baseline, '--', 'app/public/assets').trim().split('\n').filter(Boolean).sort()
assert.deepEqual(removedAssets, manifest.images.filter(row => row.mode !== 'raw-png').map(row => row.sourcePath).sort())
let media = 0
for (const entry of git('ls-tree', '-r', '-z', baseline, '--', 'app/public/assets', 'app/public/audio').split('\0').filter(Boolean)) {
  const [, expected, path] = /^\d+ blob ([0-9a-f]+)\t(.+)$/.exec(entry)
  assertHistoricalMedia(path, { gitBlob: expected }); media++
}

// Author-approved removal is a single development-only anchor in TitleScreen.
// All other statements/functions, including Chapter1/DR/DSA and CT clocks, exact.
const parse = source => ts.createSourceFile('App.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const before = parse(original('app/src/App.tsx')), after = parse(current('app/src/App.tsx'))
const statements = tree => tree.statements.map(node => node.getText(tree))
assert.equal(before.statements.length, after.statements.length)
before.statements.forEach((node, index) => {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'TitleScreen') {
    const old = node.getText(before), live = after.statements[index].getText(after)
    const retired = [
      '          {/* 隐蔽的内部入口：配音试听页（开发调试用，正式上线前删除） */}',
      `          <button onClick={e => { e.stopPropagation(); window.location.href = '/voice-preview.html' }} className="text-slate-800 hover:text-slate-500 text-xs transition-colors" title="配音试听">▫</button>`,
    ].join('\n') + '\n'
    const removed = old.replace(retired, '')
    assert.notEqual(removed, old, 'Identify the exact retired voice-preview button/comment')
    assert.equal(live, removed, 'Only the retired development audition anchor may leave TitleScreen')
  } else assert.equal(statements(after)[index], node.getText(before), 'Every other App statement is unchanged')
})
console.log(`PASS delivery LIVE freeze: ${files.length} exact source/config/historical records, ${media} live media identities; four exact source deltas, two catalogs, 194 migrations; ${probes} unauthorized source probes rejected`)
