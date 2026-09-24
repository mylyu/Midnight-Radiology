import assert from 'node:assert/strict'
import './ch2-rewards-round-freeze.mjs'
import { REWARDS_ROUND_ADDED_SOURCE, REWARDS_ROUND_ADDED_MEDIA } from './ch2-rewards-round-projection.mjs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { beforeImagePolishSource, POLISH_ADDED_SOURCE, POLISH_ADDED_MEDIA } from './image-polish-projection.mjs'
const root = new URL('../../', import.meta.url), baseline = 'ea9d6c5'
const git = (...args) => execFileSync('git', args, {cwd: fileURLToPath(root), maxBuffer: 48e6})
const tracked = prefix => git('ls-tree', '-r', '--name-only', baseline, '--', prefix).toString().trim().split('\n').filter(Boolean)
const normalize = value => value.replaceAll('\r\n', '\n').trimEnd() + '\n'
const protectedFiles = [...tracked('app/src'), 'app/package.json', 'app/package-lock.json', 'app/.gitignore',
  'app/index.html', 'app/vite.config.ts', 'app/tsconfig.json', 'app/tsconfig.app.json',
  '深夜影像科/全书剧情总线.md', 'docs/ch1-voices-20260923.json',
  ...tracked('docs').filter(path => path.endsWith('source-deltas.json'))]
for (const path of protectedFiles) {
  const current = readFileSync(new URL(path, root), 'utf8')
  const expected = normalize(git('show', `${baseline}:${path}`).toString())
  assert.equal(normalize(beforeImagePolishSource(path, current)), expected, `${path}: only exact reviewed delivery/visual/lead-in edits`)
  assert.throws(() => assert.equal(normalize(beforeImagePolishSource(path, current + '\n// unexpected change\n')), expected))
}
const additions = prefix => [...new Set([
  git('diff', '--name-only', '--diff-filter=A', baseline, '--', prefix).toString(),
  git('ls-files', '--others', '--exclude-standard', '--', prefix).toString(),
].join('\n').split(/\r?\n/).filter(Boolean))].sort()
assert.deepEqual(additions('app/src').filter(path => !REWARDS_ROUND_ADDED_SOURCE.includes(path)), POLISH_ADDED_SOURCE)
assert.deepEqual(additions('app/public/assets').filter(path => !REWARDS_ROUND_ADDED_MEDIA.includes(path)), POLISH_ADDED_MEDIA)
assert.deepEqual(additions('app/public/audio'), [])
let mediaCount = 0
for (const entry of git('ls-tree', '-r', '-z', baseline, '--', 'app/public/assets', 'app/public/audio').toString().split('\0').filter(Boolean)) {
  const [, expected, path] = /^\d+ blob ([0-9a-f]+)\t(.+)$/.exec(entry)
  const bytes = readFileSync(new URL(path, root))
  assert.equal(createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'), expected, `${path}: original media bytes remain unchanged`)
  mediaCount++
}
const thick = readFileSync(new URL(POLISH_ADDED_MEDIA[0], root))
assert.equal(createHash('sha256').update(thick).digest('hex'), '3fc63700d5e109922fbb3c2ae2f9a682747453ed847abffb1953481e2c331776')
console.log(`PASS image-polish LIVE freeze: ${protectedFiles.length} protected source/config/ledger files, ${mediaCount} original images/audio, one pinned new thick image; Ch1/DR/DSA mechanics preserved`)
