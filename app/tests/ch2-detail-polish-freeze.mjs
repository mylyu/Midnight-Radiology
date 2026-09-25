// Actual live boundary: exact reviewed hunks/additions; no other source/media change.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { assertDirectorDayVoiceLive, priorDirectorDayVoiceMediaPaths } from './ch2-director-day-voice.mjs'
import { DETAIL_ROOT as root, DETAIL_BASELINE as baseline, DETAIL_EDITED_FILES, DETAIL_ADDED_SOURCE,
  beforeDetailPolishSource, assertDetailAddedSource, normalizeDetail as normalize } from './ch2-detail-polish-projection.mjs'

const git = (...args) => execFileSync('git', args, { cwd: fileURLToPath(root), maxBuffer: 32e6 })
assertDirectorDayVoiceLive()
const textGit = (...args) => git(...args).toString('utf8')
const tracked = prefix => textGit('ls-tree', '-r', '--name-only', baseline, '--', prefix).trim().split('\n').filter(Boolean)
const files = [...tracked('app/src'), ...tracked('app/scripts'), 'app/package.json', 'app/package-lock.json',
  'app/.gitignore', 'app/index.html', 'app/vite.config.ts', 'app/tsconfig.json', 'app/tsconfig.app.json',
  '深夜影像科/全书剧情总线.md', ...tracked('docs').filter(path => /(?:source-deltas|review|assets|voices-20260923)\.json$/.test(path))]
for (const path of files) {
  const live = readFileSync(new URL(path, root), 'utf8')
  const old = normalize(textGit('show', `${baseline}:${path}`))
  if (DETAIL_EDITED_FILES.includes(path)) assert.notEqual(normalize(live), old, `${path}: live approved edit must exist`)
  assert.equal(normalize(beforeDetailPolishSource(path, live)), old, `${path}: no unreviewed source/config/ledger change`)
  assert.throws(() => assert.equal(normalize(beforeDetailPolishSource(path, live + '\n// forbidden mutation\n')), old))
}
const additions = prefix => [...new Set([
  textGit('diff', '--no-renames', '--name-only', '--diff-filter=A', baseline, '--', prefix),
  textGit('ls-files', '--others', '--exclude-standard', '--', prefix),
].join('\n').split(/\r?\n/).filter(Boolean))].sort()
assert.deepEqual(additions('app/src'), DETAIL_ADDED_SOURCE, 'Only six individually named and hash-verified production files')
assertDetailAddedSource()
assert.deepEqual(priorDirectorDayVoiceMediaPaths(additions('app/public')), [], 'No new media, previews, or public resources beyond the one independently verified later director voice')
assert.deepEqual(additions('app/scripts'), [], 'No production build script additions')
let media = 0
for (const entry of textGit('ls-tree', '-r', '-z', baseline, '--', 'app/public').split('\0').filter(Boolean)) {
  const [, blob, path] = /^\d+ blob ([0-9a-f]+)\t(.+)$/.exec(entry)
  const bytes = readFileSync(new URL(path, root))
  if (/\.(?:txt|html|svg)$/.test(path)) {
    assert.equal(normalize(bytes.toString('utf8')), normalize(textGit('show', `${baseline}:${path}`)), `${path}: exact public text`)
  } else {
    const actual = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')
    assert.equal(actual, blob, `${path}: every approved chapter asset/voice remains byte-identical`)
  }
  media++
}
console.log(`PASS detail-polish LIVE freeze: ${files.length} source/config/previous ledgers, ${media} exact public files; six exact inverses, six pinned new files; no old ledger, DR/DSA, media or build change`)
