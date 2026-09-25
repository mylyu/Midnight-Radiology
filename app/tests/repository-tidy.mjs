// Repository organization is a content-preserving move, not a new game baseline.
// Run from any directory: node app/tests/repository-tidy.mjs
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const BASELINE = '485bc41d2c2ff3f17b7f9414756f74aa16f866dc'
const root = fileURLToPath(new URL('../../', import.meta.url))
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 16e6 }).trim()
const atRoot = path => new URL(path, new URL('../../', import.meta.url))
const manifest = JSON.parse(readFileSync(atRoot('docs/repository-tidy-moves.json'), 'utf8'))
assert.equal(manifest.baseline, BASELINE, 'Reorganization must use the published, independently pinned baseline')
assert(Array.isArray(manifest.moves), 'Every moved file needs an explicit source, destination and Git blob')

const baselineFiles = git('ls-tree', '-r', '--name-only', '-z', BASELINE).split('\0').filter(Boolean)
const rootKeep = new Set(['.gitignore', 'README.md', 'HANDOFF.md', 'LICENSE', 'NOTICE'])
const expectedMoves = baselineFiles.filter(path =>
  (!path.includes('/') && !rootKeep.has(path)) || path.startsWith('voice_original/') || path.startsWith('语音样张/'))
assert.equal(expectedMoves.length, 81, 'This is the reviewed root/history cleanup, not a generalized asset deletion')
assert.deepEqual(manifest.moves.map(row => row.from).sort(), expectedMoves.sort(),
  'Move manifest must cover every old intermediate file exactly once and no production files')
assert.equal(new Set(manifest.moves.map(row => row.to)).size, manifest.moves.length, 'Move destinations must be unique')

for (const { from, to, gitBlob } of manifest.moves) {
  assert.equal(typeof to, 'string', `${from}: destination is required`)
  assert(!to.includes('\\') && !to.split('/').some(part => !part || part === '.' || part === '..'), `${from}: safe repository-relative destination`)
  assert(to.startsWith('archive/original-development/') || /^docs\/voices\/配音台词底稿\.(md|csv)$/.test(to),
    `${from}: historical files stay outside production source and delivered assets`)
  assert.match(gitBlob, /^[0-9a-f]{40}$/, `${from}: exact original Git blob is required`)
  assert.equal(git('rev-parse', `${BASELINE}:${from}`), gitBlob, `${from}: manifest must match published history`)
  assert(!existsSync(atRoot(from)), `${from}: old root/history path must no longer clutter the repository`)
  assert(existsSync(atRoot(to)), `${to}: archived file must still exist`)
  // Use the source path's Git clean filters to compare repository content,
  // independent of the developer's Windows checkout newline conversion.
  assert.equal(git('hash-object', `--path=${from}`, to), gitBlob, `${to}: reorganization must preserve original content`)
}

const readme = readFileSync(atRoot('README.md'), 'utf8')
const opening = readme.split(/\r?\n/).slice(0, 12).join('\n')
assert.match(opening, /\[[^\]]+\]\(https:\/\/mylyu\.github\.io\/Midnight-Radiology\/\)/,
  'The clean GitHub Pages play link must be prominently visible at the top of README')
assert.match(readme, /archive\//, 'README must explain where historical development material went')

const protectedPaths = ['app/src', 'app/public', 'app/scripts', '.github/workflows',
  'app/.gitignore', 'app/index.html', 'app/package.json', 'app/package-lock.json', 'app/components.json',
  'app/vite.config.ts', 'app/eslint.config.js', 'app/postcss.config.js', 'app/tailwind.config.js',
  'app/tsconfig.json', 'app/tsconfig.app.json', 'app/tsconfig.node.json']
git('diff', '--exit-code', '--quiet', BASELINE, '--', ...protectedPaths)
assert.equal(git('ls-files', '--others', '--exclude-standard', '--', ...protectedPaths), '',
  'Cleanup adds no unreviewed production source, media, build script or deployment file')
git('diff', '--exit-code', '--quiet', BASELINE, '--', 'app/tests', ':(exclude)app/tests/repository-tidy.mjs')

console.log(`PASS repository tidy: ${manifest.moves.length} exact content-preserving moves; old paths absent; prominent play link; runtime, assets, build, workflow and historical test pins unchanged at ${BASELINE.slice(0, 7)}`)
