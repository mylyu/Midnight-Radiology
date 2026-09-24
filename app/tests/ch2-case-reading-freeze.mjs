import assert from 'node:assert/strict'
import { assertHistoricalMedia, priorMediaPaths, priorSourcePaths, inspectLiveImage } from './game-delivery-media.mjs'
import './ch2-ct-sequences-freeze.mjs'
import { CT_SEQUENCES_ADDED_SOURCE, CT_SEQUENCES_ADDED_MEDIA } from './ch2-ct-sequences-projection.mjs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { beforeCaseReadingSource, CASE_READING_BASELINE as baseline, CASE_READING_FILE } from './ch2-case-reading-projection.mjs'

const root = new URL('../../', import.meta.url)
const git = (...args) => execFileSync('git', args, { cwd: fileURLToPath(root), maxBuffer: 16e6 }).toString('utf8')
const normalize = text => text.replaceAll('\r\n', '\n').trimEnd() + '\n'
const tracked = prefix => git('ls-tree', '-r', '--name-only', baseline, '--', prefix).trim().split('\n').filter(Boolean)
assert.match(readFileSync(new URL(CASE_READING_FILE, root), 'utf8'), /\{complete && <section data-ch2-case-reading /,
  'The live completion page must contain the approved reading card, not only match an older projection')
const files = [...tracked('app/src'), 'app/package.json', 'app/package-lock.json', 'app/.gitignore',
  'app/index.html', 'app/vite.config.ts', 'app/tsconfig.json', 'app/tsconfig.app.json',
  '深夜影像科/全书剧情总线.md', 'docs/ch1-voices-20260923.json',
  ...tracked('docs').filter(path => path.endsWith('source-deltas.json'))]
for (const path of files) {
  const live = readFileSync(new URL(path, root), 'utf8')
  assert.equal(normalize(beforeCaseReadingSource(path, live)), normalize(git('show', `${baseline}:${path}`)), `${path}: no other production or ledger edit`)
}
for (const prefix of ['app/src', 'app/public/assets', 'app/public/audio']) {
  const later = [...CT_SEQUENCES_ADDED_SOURCE, ...CT_SEQUENCES_ADDED_MEDIA]
  const additions = [...new Set([git('diff', '--name-only', '--diff-filter=A', baseline, '--', prefix),
    git('ls-files', '--others', '--exclude-standard', '--', prefix)].join('\n').split(/\r?\n/).filter(Boolean))]
  const historical = prefix === 'app/src' ? priorSourcePaths(additions) : priorMediaPaths(additions, baseline)
  assert.deepEqual(historical.filter(path => !later.includes(path)), [], 'No new source or media beyond the exact later LIVE-validated CT additions')
}
let mediaCount = 0
for (const entry of git('ls-tree', '-r', '-z', baseline, '--', 'app/public/assets', 'app/public/audio').split('\0').filter(Boolean)) {
  const [, expected, path] = /^\d+ blob ([0-9a-f]+)\t(.+)$/.exec(entry)
  assertHistoricalMedia(path, { gitBlob: expected })
  mediaCount++
}
console.log(`PASS case-reading LIVE freeze: ${files.length} original source/config/ledger files and ${mediaCount} media; only the exact approved completion citation may differ`)
