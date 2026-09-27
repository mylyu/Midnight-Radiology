// Targeted R3 checks: a new chapter must not alter prior media groups or saves.
// Run: node --import tsx tests/ldct-loading.mjs
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkLdctPassword, ldctUnlocked, unlockLdct, LDCT_UNLOCK_KEY } from '../src/game/ldct-access.ts'
import { deliverySizeReport, assertDeliveryBudget } from '../scripts/check-delivery-size.mjs'

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const storage = new Map([['mr-ch2-unlock', '1'], ['midnight-radiology', 'untouched']])
const writes = []
globalThis.localStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => { writes.push([key, value]); storage.set(key, value) },
}
assert.equal(ldctUnlocked(), false, 'Chapter 2 access must not unlock LDCT')
for (const wrong of ['', 'ct2258', 'ldct2259', 'ld ct2258']) {
  assert.equal(checkLdctPassword(wrong), false)
  assert.equal(unlockLdct(wrong), false)
}
assert.equal(writes.length, 0, 'Invalid codes have no side effects')
for (const correct of ['ldct2258', ' LDCT2258 ', '　ＬＤＣＴ２２５８　']) assert(checkLdctPassword(correct))
assert.equal(writes.length, 0, 'Checking a code must not write storage')
assert(unlockLdct(' ＬＤＣＴ２２５８ '))
assert(ldctUnlocked())
assert.deepEqual(writes, [[LDCT_UNLOCK_KEY, '1']])
assert.equal(storage.get('mr-ch2-unlock'), '1')
assert.equal(storage.get('midnight-radiology'), 'untouched')

// Storage denial still permits the explicitly authorized current page session.
globalThis.localStorage = { getItem: () => { throw new Error('storage denied') }, setItem: () => { throw new Error('storage denied') } }
const privateAccess = await import('../src/game/ldct-access.ts?private-session')
assert.equal(privateAccess.ldctUnlocked(), false)
assert(privateAccess.unlockLdct('ldct2258'))
assert(privateAccess.ldctUnlocked())

const baseFile = 'assets/media/bg_day.0000000000000000.webp'
const newFile = 'assets/media/ldct_bg_test.1111111111111111.webp'
const synthetic = { chapters: { shell: [baseFile], ch1: [], ch2: [], dr: [], dsa: [], ldct: [newFile] },
  assets: { [baseFile]: { bytes: 14_000_000 }, [newFile]: { bytes: 4_000_000 } } }
const files = new Map([[baseFile, 14_000_000], ['assets/index.js', 2_000_000], [newFile, 4_000_000]])
const report = deliverySizeReport(files, synthetic)
assert.equal(report.totalBytes, 20_000_000)
assert.equal(report.protectedBaseBytes, 16_000_000)
assert.equal(report.ldctExclusiveBytes, 4_000_000)
assert.equal(report.chapterBytes.ldct, 18_000_000)
assertDeliveryBudget(report)
assert.throws(() => assertDeliveryBudget(deliverySizeReport(new Map([...files, ['assets/old-huge.png', 2_000_000]]), synthetic)), /17 MB/)
assert.throws(() => assertDeliveryBudget(deliverySizeReport(new Map([...files, ['assets/media/ldct_unregistered.webp', 2_000_000]]), synthetic)), /17 MB/)
assert.throws(() => assertDeliveryBudget(deliverySizeReport(files, {
  ...synthetic, chapters: { ...synthetic.chapters, ch1: [newFile] },
})), /17 MB/, 'Shared files cannot use the DLC exemption')
assert.throws(() => deliverySizeReport(new Map([[baseFile, 14_000_000]]), synthetic), /Missing LDCT/)

// This is a current-baseline comparison of the touched resource boundary, not
// a recursive source-freeze ledger. It requires no old gameplay test replays.
const baseline = JSON.parse(execFileSync('git', ['show', 'd3e9fb5:app/src/lib/media-manifest.generated.json'], {
  cwd: appRoot, encoding: 'utf8', maxBuffer: 4e6,
}))
const live = JSON.parse(await readFile(path.join(appRoot, 'src/lib/media-manifest.generated.json'), 'utf8'))
const catalog = JSON.parse(await readFile(path.join(appRoot, 'src/lib/image-assets.catalog.json'), 'utf8'))
const { buildChapterManifest } = await import('../scripts/generate-chapter-assets.mjs')
const { LDCT_MEDIA_IDS } = await import('../src/game/ldct.ts')
const { LDCT_LAB_MEDIA_IDS } = await import('../src/game/ldct-experiments.ts')
assert.deepEqual(live, await buildChapterManifest(), 'Regenerate the manifest after importing LDCT media')
for (const chapter of ['shell', 'ch1', 'ch2', 'dr', 'dsa']) {
  assert.deepEqual(live.chapters[chapter], baseline.chapters[chapter], `${chapter} resource group must remain unchanged`)
}
for (const [file, value] of Object.entries(baseline.assets)) assert.deepEqual(live.assets[file], value, `Existing media changed: ${file}`)
const ldctPaths = new Set([...live.chapters.shell, ...live.chapters.ldct])
for (const id of [...LDCT_MEDIA_IDS, ...LDCT_LAB_MEDIA_IDS]) {
  const file = `assets/${catalog[id]}`
  assert(catalog[id], `Unregistered LDCT media: ${id}`)
  assert(ldctPaths.has(file), `LDCT is missing ${id}`)
  if (id.startsWith('ldct_')) {
    for (const chapter of ['shell', 'ch1', 'ch2', 'dr', 'dsa']) assert(!live.chapters[chapter].includes(file), `LDCT-only media leaked into ${chapter}: ${id}`)
  }
}
assert(live.chapters.ldct.length > 0)
console.log('LDCT entry code, private-storage fallback, protected base budget and isolated complete chapter registry passed.')
