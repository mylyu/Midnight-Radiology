// Narrow synthetic provenance/byte-policy checks. Loads config, never builds dist.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadConfigFromFile } from 'vite'
import { assertDeliveryBudget, budgetBytes, deliverySizeReport, verifiedTrilogyCode } from '../scripts/check-delivery-size.mjs'

const app = fileURLToPath(new URL('../', import.meta.url))
const loaded = await loadConfigFromFile({ command: 'build', mode: 'test' }, path.join(app, 'vite.config.ts'))
const plugin = loaded.config.plugins.flat(Infinity).find(p => p?.name === 'delivery-chunk-sources')
assert(plugin?.generateBundle, 'Use the actual configured Rollup hook, not a copied mock producer')
const story = 'assets/trilogy-registry-test.js', index = 'assets/index-test.js', mixed = 'assets/mixed-test.js'
const baseImage = 'assets/media/base.webp', newMedia = 'audio/vox_c3_test.mp3'
const sources = ['src/game/ch3.ts', 'src/game/ch4.ts', 'src/game/ch5.ts', 'src/game/trilogy-registry.ts',
  'src/game/ch3-places.ts', 'src/game/ch3-staging.ts', 'src/game/ch3-picture-observations.ts']
const code = { [story]: 'export const chapter = "课程";\n' + ' '.repeat(25000), [index]: 'export const shared = 1;', [mixed]: 'export const mixed = 2;' }
const chunk = (file, modules, extra = {}) => ({ type: 'chunk', fileName: file, code: code[file], isEntry: false,
  isDynamicEntry: true, modules: Object.fromEntries(modules.map(id => [id, { renderedLength: 0 }])), ...extra })
const bundle = {
  [story]: chunk(story, sources.map(id => path.join(app, id))),
  [index]: chunk(index, [path.join(app, 'src/App.tsx')], { isEntry: true, isDynamicEntry: false }),
  [mixed]: chunk(mixed, [path.join(app, sources[0]), path.join(app, 'src/game/trilogy-mri-numerics.ts')]),
  'assets/static.js': { type: 'asset', fileName: 'assets/static.js', source: 'static public file' },
}
const emitted = []
const hook = typeof plugin.generateBundle === 'function' ? plugin.generateBundle : plugin.generateBundle.handler
await hook.call({ emitFile: asset => emitted.push(asset) }, {}, bundle, false)
assert.equal(emitted.length, 1)
assert.equal(emitted[0].fileName, 'chunk-sources.generated.json')
const metadata = JSON.parse(emitted[0].source)
assert.deepEqual(metadata.chunks[story].modules, [...sources].sort())
assert.equal(metadata.chunks[story].bytes, Buffer.byteLength(code[story]), 'UTF8 bytes, including Chinese, not string length')
assert(metadata.chunks[mixed].modules.includes('src/game/trilogy-mri-numerics.ts'), 'Even zero-rendered outside modules are never filtered out')
assert.equal(metadata.chunks['assets/static.js'], undefined, 'Public JS assets are not claimed as Rollup source chunks')
const files = new Map([[baseImage, 16990000], [newMedia, 300000],
  ...Object.entries(code).map(([file, text]) => [file, Buffer.byteLength(text)]),
  ['chunk-sources.generated.json', Buffer.byteLength(emitted[0].source)]])
const hashes = new Map(Object.entries(code).map(([file, text]) => [file, createHash('sha256').update(text).digest('hex')]))
const manifest = { chapters: { shell: [baseImage], ch1: [], ch2: [], dr: [], dsa: [], ldct: [], ch3: [newMedia], ch4: [], ch5: [] },
  assets: { [baseImage]: { bytes: files.get(baseImage) }, [newMedia]: { bytes: files.get(newMedia) } } }
const evidence = { metadata, sha256ByFile: hashes }, report = deliverySizeReport(files, manifest, evidence)
assert.equal(budgetBytes, 17000000, 'Author-approved base limit is unchanged')
assert.equal(report.trilogyExclusiveCodeBytes, files.get(story))
assert.deepEqual(report.trilogyExclusiveCodeFiles, [story])
assert.equal(report.trilogyExclusiveMediaBytes, files.get(newMedia))
assert.equal(report.protectedBaseBytes, files.get(baseImage) + files.get(index) + files.get(mixed) + files.get('chunk-sources.generated.json'))
assertDeliveryBudget(report)
assert.throws(() => assertDeliveryBudget(deliverySizeReport(files, manifest)), /17 MB/, 'Original two-argument API never invents code ownership')

let probes = 0
function rejects(patch, why) {
  const altered = { ...metadata, chunks: { ...metadata.chunks, [story]: { ...metadata.chunks[story], ...patch } } }
  assert.equal(verifiedTrilogyCode(files, { metadata: altered, sha256ByFile: hashes }).bytes, 0, why)
  probes++
}
rejects({ modules: [] }, 'Empty source list does not prove ownership')
rejects({ modules: [...sources, 'src/App.tsx'] }, 'Mixed App source is protected')
rejects({ modules: [...sources, '\u0000vite/preload-helper.js'] }, 'Virtual helper source is protected')
rejects({ modules: ['src/game/ch4.ts?instrumented'] }, 'Source query variants do not broaden the exact whitelist')
rejects({ modules: ['src/game/trilogy-session.ts'] }, 'Common runtime is protected')
rejects({ isEntry: true }, 'Entry chunks are protected')
rejects({ isDynamicEntry: false }, 'Non-dynamic chunks are protected')
rejects({ type: 'asset' }, 'An ordinary JS asset cannot self-admit')
rejects({ bytes: files.get(story) + 1 }, 'Artifact size mismatch cannot claim credit')
rejects({ sha256: '0'.repeat(64) }, 'Artifact hash mismatch cannot claim credit')
assert.equal(verifiedTrilogyCode(files, { metadata }).bytes, 0, 'Hashes must come from separately read artifact bytes')
assert.equal(verifiedTrilogyCode(files, { ...evidence, metadata: { ...metadata, version: 2 } }).bytes, 0)
const unlisted = 'assets/trilogy-registry-unregistered.js'
assert.throws(() => assertDeliveryBudget(deliverySizeReport(new Map([...files, [unlisted, 20000]]), manifest, evidence)), /17 MB/, 'Trilogy-looking unregistered file remains protected')
const disguisedMedia = { chapters: { ...manifest.chapters, ch3: [newMedia, story] },
  assets: { ...manifest.assets, [story]: { bytes: files.get(story) } } }
assert.throws(() => assertDeliveryBudget(deliverySizeReport(files, disguisedMedia)), /17 MB/, 'JS cannot bypass source verification through a media registration')
for (const name of ['assets/index-pretend.js', 'assets/App-pretend.js', 'assets/shared-pretend.js']) {
  const fakeFiles = new Map([[name, files.get(story)]])
  const fake = { ...metadata, chunks: { [name]: metadata.chunks[story] } }
  assert.equal(verifiedTrilogyCode(fakeFiles, { metadata: fake, sha256ByFile: new Map([[name, hashes.get(story)]]) }).bytes, 0)
  probes++
}
// The producer also records unknown/relative IDs conservatively, never as canonical sources.
const unknown = []
await hook.call({ emitFile: asset => unknown.push(asset) }, {}, { [story]: chunk(story, ['src/game/ch3.ts']) }, false)
assert.deepEqual(JSON.parse(unknown[0].source).chunks[story].modules, ['unresolved:src/game/ch3.ts'])
console.log(JSON.stringify({ status: 'passed', kind: 'synthetic-rollup-hook-not-production-build', negativeProbes: probes,
  budgetBytes, allowedModules: sources, admittedCodeBytes: report.trilogyExclusiveCodeBytes, protectedMetadataBytes: files.get('chunk-sources.generated.json') }))
