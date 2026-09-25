// Outermost, independently pinned review. Older hashes/expected behavior stay fixed.
// Only these exact loading/input hunks are reversed; live stories and media are not replaced.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { beforeCh2PortraitExitsSource, assertCh2PortraitExitsAdditions, assertCh2PortraitExitsLive, priorCh2PortraitExitsPaths } from './ch2-portrait-exits-projection.mjs'

export const CHAPTER_PRELOAD_BASELINE = 'fa01385ef48ad34dcd2d670d026c4ae35ef46812'
const ledgerSha = 'd7f739f01a05c0512280eb4b1cd3037cae5e75fc4d5ec58d25b49d86cd42fa2b'
const edited = ['app/index.html', 'app/package.json', 'app/src/App.tsx',
  'app/src/components/Ch2MysteryMedia.tsx', 'app/src/components/Ch2ScanOverlay.tsx',
  'app/src/components/Ch2SliceSequence.tsx', 'app/src/components/SceneBackground.tsx',
  'app/src/game/ch2-scan-sequences.ts', 'app/src/game/store.ts', 'app/src/lib/image-assets.ts']
const added = ['app/scripts/generate-chapter-assets.mjs', 'app/src/components/ChapterLoadingScreen.tsx',
  'app/src/game/chapter-save-assets.ts', 'app/src/game/choice-input.ts', 'app/src/hooks/use-chapter-entry.ts',
  'app/src/hooks/use-dialogue-choice-guard.ts', 'app/src/lib/chapter-assets.ts', 'app/src/lib/media-manifest.generated.json']
const root = new URL('../../', import.meta.url)
const read = path => readFileSync(new URL(path, root))
const norm = value => value.toString().replaceAll('\r\n', '\n').trimEnd() + '\n'
const sha = value => createHash('sha256').update(value).digest('hex')
const git = (...args) => execFileSync('git', args, { cwd: fileURLToPath(root), maxBuffer: 32e6 })
const originals = new Map()
const originalEndings = new Map()
const original = path => {
  if (!originals.has(path)) {
    const text = git('show', `${CHAPTER_PRELOAD_BASELINE}:${path}`).toString().replaceAll('\r\n', '\n')
    originals.set(path, norm(text))
    originalEndings.set(path, text.match(/\s*$/)[0])
  }
  return originals.get(path)
}
let ledger
export function chapterPreloadLedger() {
  if (ledger) return ledger
  const raw = norm(read('docs/chapter-preload-source-deltas.json'))
  assert.equal(sha(raw), ledgerSha, 'Chapter preload/input ledger: independently fixed review SHA')
  const review = JSON.parse(read('docs/chapter-preload-review.json'))
  assert.equal(review.baseline, CHAPTER_PRELOAD_BASELINE)
  assert.equal(review.status, 'reviewed')
  assert.equal(review.sourceDeltasSha256, ledgerSha)
  ledger = JSON.parse(raw)
  assert.equal(ledger.baseline, CHAPTER_PRELOAD_BASELINE)
  assert.deepEqual(ledger.files.map(row => row.path), edited)
  assert.deepEqual(ledger.added.map(row => row.path), added)
  for (const row of ledger.files) {
    assert.equal(row.beforeSha256, sha(original(row.path)))
    assert(row.edits.length, `${row.path}: exact reviewed source hunks required`)
  }
  return ledger
}

export function beforeChapterPreloadSource(path, source) {
  // Older review layers may call us again with this layer already reversed.
  if (edited.includes(path) && norm(source) === original(path)) return source
  source = beforeCh2PortraitExitsSource(path, source)
  if (!edited.includes(path)) return source
  const current = norm(source), before = original(path)
  if (current === before) return source
  const row = chapterPreloadLedger().files.find(row => row.path === path)
  assert.equal(sha(current), row.afterSha256, `${path}: undocumented mutation outside reviewed chapter loading/input source`)
  const lines = current.trimEnd().split('\n')
  for (const edit of [...row.edits].reverse()) {
    assert.deepEqual(lines.slice(edit.afterStart, edit.afterStart + edit.after.length), edit.after,
      `${path}: undocumented mutation in loading/input hunk`)
    lines.splice(edit.afterStart, edit.after.length, ...edit.before)
  }
  const restored = lines.join('\n') + '\n'
  assert.equal(restored, before, `${path}: undocumented mutation outside exact loading/input hunks`)
  // Some original freezes compare exact LF source, including the final blank line.
  // Restore that known terminator only after the complete inverse has been verified.
  return restored.trimEnd() + originalEndings.get(path)
}

export function assertChapterPreloadAdditions() {
  assertCh2PortraitExitsAdditions()
  for (const row of chapterPreloadLedger().added) {
    assert.equal(sha(norm(read(row.path))), row.sha256, `${row.path}: undocumented mutation in pinned new loading/input module`)
  }
}
export function priorChapterPreloadPaths(paths) {
  assertChapterPreloadAdditions()
  return priorCh2PortraitExitsPaths(paths).filter(path => !added.includes(path))
}
export function assertChapterPreloadLive() {
  assertCh2PortraitExitsLive()
  for (const row of chapterPreloadLedger().files) {
    const live = norm(beforeCh2PortraitExitsSource(row.path, read(row.path)))
    assert.equal(sha(live), row.afterSha256, `${row.path}: reviewed loading/input change must be live`)
    assert.equal(norm(beforeChapterPreloadSource(row.path, live)), original(row.path))
  }
  assertChapterPreloadAdditions()
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assertChapterPreloadLive()
  const tracked = prefix => git('ls-tree', '-r', '--name-only', CHAPTER_PRELOAD_BASELINE, '--', prefix)
    .toString().trim().split('\n').filter(Boolean)
  const files = [...tracked('app/src'), ...tracked('app/scripts'), 'app/package.json', 'app/package-lock.json',
    'app/index.html', 'app/vite.config.ts', 'app/tsconfig.json', 'app/tsconfig.app.json', 'app/.gitignore',
    '深夜影像科/全书剧情总线.md', ...tracked('.github/workflows'),
    ...tracked('docs').filter(path => /(?:source-deltas|review)\.json$/.test(path))]
  for (const path of files) {
    assert.equal(norm(beforeChapterPreloadSource(path, read(path))), original(path), `${path}: no unreviewed source/config/story/ledger change`)
  }
  const current = [...new Set(git('ls-files', '--cached', '--others', '--exclude-standard', '--', 'app/src', 'app/scripts')
    .toString().trim().split('\n'))].sort()
  assert.deepEqual(priorChapterPreloadPaths(current), [...tracked('app/src'), ...tracked('app/scripts')].sort(),
    'Only eight explicitly pinned loading/input modules, including one generated manifest and one generator')

  // Independently check function-level scope rather than trusting the source ledger alone.
  const functions = (file, source) => {
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
    return new Map(tree.statements.filter(ts.isFunctionDeclaration).map(node => [node.name.text, node.getText(tree)]))
  }
  for (const [path, exceptions] of [['app/src/App.tsx', ['App', 'NightScreen', 'Ch2Screen']], ['app/src/game/store.ts', ['playSfx']]]) {
    const before = functions(path, original(path)), live = functions(path, norm(read(path)))
    assert.deepEqual([...live.keys()], [...before.keys()], `${path}: no unrelated function additions/removals`)
    for (const [name, body] of before) if (!exceptions.includes(name)) assert.equal(live.get(name), body, `${path}.${name}: gameplay remains exact`)
  }
  assert.equal((norm(read('app/src/game/data.ts')).match(/chance: 0\.3\b/g) ?? []).length, 7, 'All seven original 30% risk choices retained')

  const publicPaths = []
  for (const entry of git('ls-tree', '-r', '-z', CHAPTER_PRELOAD_BASELINE, '--', 'app/public').toString().split('\0').filter(Boolean)) {
    const [, expected, path] = /^\d+ blob ([0-9a-f]+)\t(.+)$/.exec(entry), bytes = read(path)
    if (/\.(?:html|svg|txt)$/.test(path)) assert.equal(norm(bytes), original(path))
    else assert.equal(createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'), expected, `${path}: media bytes unchanged`)
    publicPaths.push(path)
  }
  const filesAt = path => readdirSync(new URL(path + '/', root), { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? filesAt(`${path}/${entry.name}`) : [`${path}/${entry.name}`])
  assert.deepEqual(filesAt('app/public').sort(), publicPaths.sort(), 'No additions, replacements or removals of artwork/voice/public assets')
  let probes = 0
  for (const row of chapterPreloadLedger().files) {
    const live = norm(read(row.path))
    for (const edit of row.edits) {
      const lines = live.trimEnd().split('\n'), index = Math.min(edit.afterStart, lines.length - 1)
      lines[index] += ' // forbidden mutation'
      assert.throws(() => beforeChapterPreloadSource(row.path, lines.join('\n')), /undocumented mutation/)
      probes++
    }
    assert.throws(() => beforeChapterPreloadSource(row.path, live + '// forbidden append\n'), /undocumented mutation/)
    probes++
  }
  assert.deepEqual(priorChapterPreloadPaths([...added, 'app/src/unreviewed.ts']), ['app/src/unreviewed.ts'])
  console.log(`PASS chapter admission/input LIVE freeze: ${files.length} source/config/story/previous ledgers, ${publicPaths.length} unchanged public files; 10 exact inversions, 8 pinned modules; ${probes} mutations rejected; Ch1/Ch2 stories, numerical rules, 7 risks and DR/DSA gameplay unchanged.`)
}
