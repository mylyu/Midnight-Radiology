// Historical payoff boundary. Run the newer check-in LIVE guard first, then
// strip only that round's exact App integration and its validated additions.
import './ch2-checkin-freeze.mjs'
import { CHECKIN_ADDED_FILES } from './ch2-checkin-projection.mjs'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { beforePayoffSource, PAYOFF_EDITED_FILES } from './ch2-payoffs-projection.mjs'

const root = new URL('../../', import.meta.url)
const baseline = '6a0311b'
const git = (...args) => execFileSync('git', args, { cwd: fileURLToPath(root), maxBuffer: 48 * 1024 * 1024 })
const normalize = value => value.replaceAll('\r\n', '\n').trimEnd() + '\n'
const current = path => readFileSync(new URL(path, root), 'utf8')
const original = path => git('show', `${baseline}:${path}`).toString('utf8')
const tracked = prefix => git('ls-tree', '-r', '--name-only', baseline, '--', prefix)
  .toString('utf8').trim().split('\n').filter(Boolean)
const protectedFiles = [...tracked('app/src'), 'app/package.json', 'app/package-lock.json',
  'app/index.html', 'app/vite.config.ts', 'app/tsconfig.json', 'app/tsconfig.app.json',
  '深夜影像科/全书剧情总线.md', 'docs/ch1-voices-20260923.json',
  ...tracked('docs').filter(path => path.endsWith('source-deltas.json'))]
for (const path of protectedFiles) {
  const live = current(path)
  assert.equal(normalize(beforePayoffSource(path, live)), normalize(original(path)),
    `${path}: undocumented change to original story/mechanics/assets policy`)
}
assert(!PAYOFF_EDITED_FILES.includes('app/src/App.tsx'), 'This round does not modify even the shared App shell')

const additions = prefix => [...new Set([
  git('diff', '--name-only', '--diff-filter=A', baseline, '--', prefix).toString('utf8'),
  git('ls-files', '--others', '--exclude-standard', '--', prefix).toString('utf8'),
].join('\n').split(/\r?\n/).filter(Boolean))].sort()
assert.deepEqual(additions('app/src').filter(path => !CHECKIN_ADDED_FILES.includes(path)), [
  'app/src/components/Ch2CtMotion.tsx', 'app/src/game/ch2-ct-motion.ts', 'app/src/game/ch2-payoffs.ts',
], 'Only three exact chapter-two additions, no new shared runtime')

let mediaCount = 0
for (const entry of git('ls-tree', '-r', '-z', baseline, '--', 'app/public/assets', 'app/public/audio')
  .toString('utf8').split('\0').filter(Boolean)) {
  const match = /^\d+ blob ([0-9a-f]+)\t(.+)$/.exec(entry)
  assert(match)
  const [, expected, path] = match
  const bytes = readFileSync(new URL(path, root))
  assert.equal(createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'), expected,
    `${path}: no existing image/audio may be overwritten or deleted`)
  mediaCount++
}

// Separate fixed identities, not hashes trusted solely from a mutable manifest.
export const payoffMediaHashes = new Map([
  ['app/public/assets/ch2_ct_motion_bed_v1.png', '6208fd0c1c8057556f43d31d65b985c7ca6c617ee564a52cfb72f310f7aac055'],
  ['app/public/assets/ch2_ct_motion_room_v1.png', '5cac0d5a6f5f90714e3906387d9fd5658c1a9168f90af17556aec85d8e8ab9a8'],
  ['app/public/assets/ch2_model_base_v1.png', '28bf954376bcf4919c5a86dc9eb128d12263c7c5d7885ee32ead4e91ab2a9c31'],
  ['app/public/assets/ch2_slice_model_assembled_v1.png', 'ed50fe298d68c2d4052adb1189656fbfa09fd1d51f97e18f2467b6d00109ee36'],
  ['app/public/assets/ch2_slice_model_v1.png', '13a7fce2211e356e17a49bacaf0db8263addc45398ce54126411163804afb2f2'],
  ['app/public/assets/ch2_zhou_expert_handshake_v1.png', '29087f82840f13010859ede3e157276d3ae93fc4553a8a16409f1caf33e84bdf'],
])
assert.deepEqual(additions('app/public/assets'), [...payoffMediaHashes.keys()].sort(), 'Only six exact reviewed images may be added')
assert.deepEqual(additions('app/public/audio'), [], 'No sound is added or replaced in this round')
for (const [path, expected] of payoffMediaHashes) {
  assert.equal(createHash('sha256').update(readFileSync(new URL(path, root))).digest('hex'), expected, `${path}: approved asset identity`)
}
const mediaRecord = JSON.parse(readFileSync(new URL('docs/ch2-payoffs-assets.json', root), 'utf8'))
assert.equal(mediaRecord.baseline, baseline, 'Asset provenance belongs to this fixed revision')
assert.deepEqual(mediaRecord.assets.map(row => row.output).sort(), [...payoffMediaHashes.keys()].sort(), 'Manifest records exactly the six approved outputs')
for (const row of mediaRecord.assets) {
  assert.equal(row.sha256, payoffMediaHashes.get(row.output), `${row.output}: manifest and independent fixed hash agree`)
  const bytes = readFileSync(new URL(row.output, root))
  assert.equal(bytes.length, row.bytes, `${row.output}: recorded byte count`)
  assert.equal(bytes.readUInt32BE(16), row.width, `${row.output}: PNG canvas width`)
  assert.equal(bytes.readUInt32BE(20), row.height, `${row.output}: PNG canvas height`)
  assert(row.prompt?.length > 80 && row.source?.endsWith('.png') && row.review?.length > 20,
    `${row.output}: retain exact generation prompt, source and visual review record`)
}

// Test the guard itself: an additional mutation in a protected chapter-one
// source or an undeclared import cannot be accepted as an approved edit.
for (const path of ['app/src/App.tsx', 'app/src/game/data.ts', 'app/src/game/dlc.ts']) {
  assert.throws(() => assert.equal(normalize(beforePayoffSource(path, `${current(path)}\n// unexplained alteration\n`)),
    normalize(original(path))), /AssertionError/)
}
console.log(`PASS ${baseline} payoff historical freeze after check-in LIVE audit: ${protectedFiles.length} original files, ${PAYOFF_EDITED_FILES.length} exact-delta files, projected App/Ch1/DR/DSA unchanged, ${mediaCount} original media, six pinned additive PNGs, no audio changes, historical ledgers intact`)
