// Independent outer review for the completion certificate only. This layer
// removes exact reviewed hunks; no historical pin or expected result is moved.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeStoryBusRevisionSource } from './story-bus-revision.mjs'

export const CERTIFICATE_BASELINE = 'e34bba4859d1f05b40354f1885c9f36ad53df984'
const ledgerSha = '398eb1eeda0374b1478927d9aefd13a806fca65c6e62240a37291ec83c4aed03'
const edited = ['app/src/App.tsx', 'app/src/components/Ch2Settlement.tsx', 'app/src/game/types.ts']
const added = ['app/src/components/Ch2Certificate.tsx', 'app/src/game/ch2-certificate.ts']
const root = new URL('../../', import.meta.url)
const read = path => readFileSync(new URL(path, root))
const norm = value => value.toString().replaceAll('\r\n', '\n').trimEnd() + '\n'
const sha = value => createHash('sha256').update(value).digest('hex')
const git = (...args) => execFileSync('git', args, { cwd: fileURLToPath(root), maxBuffer: 32e6 })
const originals = new Map()
const original = path => {
  if (!originals.has(path)) originals.set(path, norm(git('show', `${CERTIFICATE_BASELINE}:${path}`)))
  return originals.get(path)
}
let ledger
export function certificateLedger() {
  if (ledger) return ledger
  const raw = norm(read('docs/ch2-certificate-source-deltas.json'))
  assert.equal(sha(raw), ledgerSha, 'Certificate source ledger: independently fixed review SHA')
  const review = JSON.parse(read('docs/ch2-certificate-review.json'))
  assert.equal(review.baseline, CERTIFICATE_BASELINE)
  assert.equal(review.status, 'reviewed')
  assert.equal(review.sourceDeltasSha256, ledgerSha)
  ledger = JSON.parse(raw)
  assert.equal(ledger.baseline, CERTIFICATE_BASELINE)
  assert.deepEqual(ledger.files.map(row => row.path), edited)
  assert.deepEqual(ledger.added.map(row => row.path), added)
  for (const row of ledger.files) {
    assert.equal(row.beforeSha256, sha(original(row.path)))
    assert(row.edits.length, `${row.path}: narrow reviewed source hunks required`)
  }
  return ledger
}
export function beforeCertificateSource(path, source) {
  if (!edited.includes(path)) return beforeStoryBusRevisionSource(path, source)
  const current = norm(source), before = original(path)
  if (current === before) return source // Exact independently known base only.
  const row = certificateLedger().files.find(row => row.path === path)
  assert.equal(sha(current), row.afterSha256, `${path}: undocumented mutation outside reviewed certificate source`)
  const lines = current.trimEnd().split('\n')
  for (const edit of [...row.edits].reverse()) {
    assert.deepEqual(lines.slice(edit.afterStart, edit.afterStart + edit.after.length), edit.after,
      `${path}: undocumented mutation in certificate hunk`)
    lines.splice(edit.afterStart, edit.after.length, ...edit.before)
  }
  const restored = lines.join('\n') + '\n'
  assert.equal(restored, before, `${path}: undocumented mutation outside certificate hunks`)
  return restored
}
export function assertCertificateSourceAdditions() {
  for (const row of certificateLedger().added) {
    assert.equal(sha(norm(read(row.path))), row.sha256, `${row.path}: undocumented mutation in new certificate module`)
  }
}
export function priorCertificateSourcePaths(paths) {
  assertCertificateSourceAdditions()
  return paths.filter(path => !added.includes(path))
}
export function assertCertificateLive() {
  for (const row of certificateLedger().files) {
    const current = norm(read(row.path))
    assert.equal(sha(current), row.afterSha256, `${row.path}: reviewed certificate edit must actually be live`)
    assert.equal(norm(beforeCertificateSource(row.path, current)), original(row.path))
  }
  assertCertificateSourceAdditions()
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assertCertificateLive()
  const sourcePaths = git('ls-tree', '-r', '--name-only', CERTIFICATE_BASELINE, '--', 'app/src').toString().trim().split('\n')
  for (const path of sourcePaths) {
    assert.equal(norm(beforeCertificateSource(path, read(path))), original(path), `${path}: no unrelated runtime change`)
  }
  const currentSources = [...new Set(git('ls-files', '--cached', '--others', '--exclude-standard', '--', 'app/src')
    .toString().trim().split('\n'))].sort()
  assert.deepEqual(currentSources, [...sourcePaths, ...added].sort(), 'Exactly two reviewed chapter-2 certificate source modules')
  const configs = ['app/package.json', 'app/package-lock.json', 'app/index.html', 'app/vite.config.ts',
    'app/tsconfig.json', 'app/tsconfig.app.json', '深夜影像科/全书剧情总线.md',
    ...git('ls-tree', '-r', '--name-only', CERTIFICATE_BASELINE, '--', 'app/scripts').toString().trim().split('\n')]
  for (const path of configs) assert.equal(norm(beforeStoryBusRevisionSource(path, read(path))), original(path), `${path}: configuration unchanged; story-bus only through its exact reviewed revision`)
  const publicPaths = []
  let voices = 0, probes = 0
  for (const entry of git('ls-tree', '-r', '-z', CERTIFICATE_BASELINE, '--', 'app/public').toString().split('\0').filter(Boolean)) {
    const [, expected, path] = /^\d+ blob ([0-9a-f]+)\t(.+)$/.exec(entry), bytes = read(path)
    if (/\.(?:html|svg|txt)$/.test(path)) assert.equal(norm(bytes), original(path))
    else assert.equal(createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'), expected, `${path}: media unchanged`)
    publicPaths.push(path); if (path.startsWith('app/public/audio/')) voices++
  }
  const filesAt = path => readdirSync(new URL(path + '/', root), { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? filesAt(`${path}/${entry.name}`) : [`${path}/${entry.name}`])
  assert.deepEqual(filesAt('app/public').sort(), publicPaths.sort(), 'No new or removed media; reuse existing chapter-one stamp')
  for (const row of certificateLedger().files) {
    const live = norm(read(row.path))
    for (const edit of row.edits) {
      const lines = live.trimEnd().split('\n'), at = Math.min(edit.afterStart, lines.length - 1)
      lines[at] += ' // forbidden mutation'
      assert.throws(() => beforeCertificateSource(row.path, lines.join('\n')), /undocumented mutation/); probes++
    }
    assert.throws(() => beforeCertificateSource(row.path, live + '// forbidden append\n'), /undocumented mutation/); probes++
  }
  assert.deepEqual(priorCertificateSourcePaths([...added, 'app/src/game/unreviewed.ts']), ['app/src/game/unreviewed.ts'])
  console.log(`PASS certificate LIVE freeze: ${sourcePaths.length} prior source files, ${configs.length} configs/bus, ${publicPaths.length} public files (${voices} voices); 3 narrow inversions/2 pinned modules, ${probes} mutation probes rejected`)
}
