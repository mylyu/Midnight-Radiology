// One author-requested documentation revision, not a movable runtime baseline.
// The independently pinned old and new document identities are the only inputs
// this adapter accepts. Every historical source/media/ledger pin stays intact.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeChapterPreloadSource, priorChapterPreloadPaths, assertChapterPreloadLive } from './chapter-preload-projection.mjs'

export const STORY_BUS_PATH = '深夜影像科/全书剧情总线.md'
export const STORY_BUS_BASELINE = '30e86925115d08a5af99bc20cdf79c6b2bd4504d'
const beforeSha256 = 'd04dcee93858105f123b782f0367da3bfb946f9b735175f19ad9156ad78d6598'
const afterSha256 = '9dafa09ea4ad5a8672583d3cf54d12677e7dc29247bd4836e0b5492b9388d6c1'
const root = new URL('../../', import.meta.url)
const norm = value => value.toString().replaceAll('\r\n', '\n').trimEnd() + '\n'
const sha = value => createHash('sha256').update(value).digest('hex')
let baselineSource

function originalBus() {
  if (baselineSource === undefined) {
    baselineSource = norm(execFileSync('git', ['show', `${STORY_BUS_BASELINE}:${STORY_BUS_PATH}`],
      { cwd: fileURLToPath(root), maxBuffer: 4e6 }))
    assert.equal(sha(baselineSource), beforeSha256, 'Original story-bus v3.2 identity remains independently pinned')
  }
  return baselineSource
}

export function assertStoryBusRevisionLive() {
  const review = JSON.parse(readFileSync(new URL('docs/story-bus-v3-3-review.json', root)))
  assert.equal(review.baseline, STORY_BUS_BASELINE)
  assert.equal(review.path, STORY_BUS_PATH)
  assert.equal(review.status, 'reviewed', 'Story-bus edit must finish independent review before release')
  assert.equal(review.beforeSha256, beforeSha256)
  assert.equal(review.afterSha256, afterSha256)
  assert.equal(sha(norm(readFileSync(new URL(STORY_BUS_PATH, root)))), afterSha256,
    'Story-bus v3.3: undocumented mutation outside the reviewed documentation revision')
  return originalBus()
}

export function beforeStoryBusRevisionSource(path, source) {
  if (path !== STORY_BUS_PATH) return source
  const current = norm(source), previous = originalBus()
  if (current === previous) return source // Known historical document only.
  assert.equal(sha(current), afterSha256,
    'Story-bus v3.3: undocumented mutation outside the reviewed documentation revision')
  assertStoryBusRevisionLive()
  return previous
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const previous = assertStoryBusRevisionLive()
  const current = norm(readFileSync(new URL(STORY_BUS_PATH, root)))
  assert.notEqual(current, previous, 'The author-approved revision must actually be present')
  assert.equal(norm(beforeStoryBusRevisionSource(STORY_BUS_PATH, current)), previous)
  assert.equal(beforeStoryBusRevisionSource(STORY_BUS_PATH, previous), previous)
  assert.equal(beforeStoryBusRevisionSource('app/src/game/ch2.ts', current), current,
    'No runtime file, other document, or broad path exception is authorized')
  for (const mutated of [current + '// unauthorized addition\n', current.replace('v3.3', 'v9.9')]) {
    assert.notEqual(mutated, current, 'Mutation probe must change the actual revision')
    assert.throws(() => beforeStoryBusRevisionSource(STORY_BUS_PATH, mutated), /undocumented mutation/)
  }
  const protectedPaths = ['app/src', 'app/public', 'app/scripts', 'app/package.json', 'app/package-lock.json',
    'app/index.html', 'app/vite.config.ts', 'app/tsconfig.json', 'app/tsconfig.app.json', '.github/workflows']
  assertChapterPreloadLive()
  const git = (...args) => execFileSync('git', args, { cwd: fileURLToPath(root), maxBuffer: 32e6 })
  const previousPaths = git('ls-tree', '-r', '--name-only', STORY_BUS_BASELINE, '--', ...protectedPaths)
    .toString().trim().split('\n')
  for (const path of previousPaths) {
    const live = readFileSync(new URL(path, root)), before = git('show', `${STORY_BUS_BASELINE}:${path}`)
    if (path.startsWith('app/public/') && !/\.(?:html|svg|txt)$/.test(path)) assert.deepEqual(live, before, `${path}: media exact`)
    else assert.equal(norm(beforeChapterPreloadSource(path, live)), norm(before), `${path}: only separately pinned later loading/input revisions allowed`)
  }
  const livePaths = [...new Set(git('ls-files', '--cached', '--others', '--exclude-standard', '--', ...protectedPaths)
    .toString().trim().split('\n'))]
  assert.deepEqual(priorChapterPreloadPaths(livePaths).sort(), previousPaths.sort(), 'Documentation round adds no unreviewed runtime/build/public file')
  console.log('PASS story-bus v3.3 documentation gate: exact previous/new identities; one-path inverse; runtime passthrough; mutation rejection; production/source/media/build exact at 30e8692')
}
