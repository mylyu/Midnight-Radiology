import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
import ts from 'typescript'
import { appRoot, manifestPath, buildChapterManifest } from '../scripts/generate-chapter-assets.mjs'
import { NIGHTS, SHOP_ITEMS } from '../src/game/data.ts'
import { CARDS, EVIDENCE, DLC_DR, DLC_DSA, DR_QUEUE } from '../src/game/dlc.ts'
import { CH2_SHIFTS, CH2_PORTRAITS, CH2_CARDS, CH2_EVIDENCE, ch2BackgroundAsset, ch2StepForState } from '../src/game/ch2.ts'
import { CH2_SLICE_SEQUENCES } from '../src/game/ch2-scan-sequences.ts'
import { CH2_PATIENT_ENTRANCES } from '../src/game/ch2-patients.ts'
import { CH2_OBSERVATIONS } from '../src/game/ch2-observations.ts'

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
assert.deepEqual(manifest, await buildChapterManifest(), 'Preload index stale: run npm run media:prepare')
const catalog = JSON.parse(await readFile(path.join(appRoot, 'src/lib/image-assets.catalog.json'), 'utf8'))
const allowed = chapter => new Set([...manifest.chapters.shell, ...manifest.chapters[chapter]])
const images = new Set(['bg', 'sprite', 'sprite2', 'image', 'readout', 'phone', 'radio'])
const audioAliases = { vox_fan: 'vox_ch1_fan_mature_20260923', vox_worker: 'vox_ch1_worker_bass_20260923', vox_thin: 'vox_ch1_thin_breathless_20260923' }
function audit(chapter, value, route = chapter) {
  if (!value || typeof value !== 'object') return
  for (const [key, child] of Object.entries(value)) {
    if (typeof child === 'string' && images.has(key) && child && child !== 'none') {
      for (const id of child === 'me' ? ['char_m', 'char_f'] : child === 'luzhou' ? ['char_luzhou_m', 'char_luzhou_f'] : [child]) {
        const resolved = chapter === 'ch2' ? CH2_PORTRAITS[id] ?? ch2BackgroundAsset(id) : id
        assert(catalog[resolved], `${route}.${key}: unregistered image ${resolved}`)
        assert(allowed(chapter).has(`assets/${catalog[resolved]}`), `${route}.${key}: ${resolved} missing from ${chapter}`)
      }
    } else if (typeof child === 'string' && ['sfx', 'sfx2', 'voice'].includes(key) && child) {
      for (const voice of child === 'vox_luzhou' ? ['vox_luzhou_m', 'vox_luzhou_f'] : [child]) {
        assert(allowed(chapter).has(`audio/${audioAliases[voice] ?? voice}.mp3`), `${route}.${key}: voice ${voice} missing`)
      }
    } else if (child && typeof child === 'object') audit(chapter, child, `${route}.${key}`)
  }
}
audit('ch1', [NIGHTS, SHOP_ITEMS, Object.fromEntries(Object.entries(EVIDENCE).filter(([id]) => !Object.hasOwn(CH2_EVIDENCE, id)))])
audit('dr', [DLC_DR, DR_QUEUE])
audit('dsa', DLC_DSA)
audit('ch2', [CH2_SHIFTS, SHOP_ITEMS, CH2_CARDS, CH2_EVIDENCE, CH2_PATIENT_ENTRANCES, CH2_OBSERVATIONS])

// Dynamic branch returns must use the same complete chapter set, including
// both genders, high/low attributes and with/without prior chapter memories.
for (const gender of ['m', 'f']) for (const remembered of [false, true]) {
  const state = { gender, flags: new Proxy({}, { get: () => remembered }), badges: remembered ? ['fixer'] : [],
    finished: remembered, items: remembered ? SHOP_ITEMS.map(item => item.id) : [], ap: 3,
    gold: 1000, skill: remembered ? 20 : 1, heart: remembered ? 20 : 1, wealth: remembered ? 20 : 1,
    dlc: { ch2: { phase: 'story', shift: 'c2n1', loop: { gifts: [] } } } }
  for (const shift of CH2_SHIFTS) for (const [id, step] of Object.entries(shift.steps)) {
    state.dlc.ch2.shift = shift.id
    audit('ch2', ch2StepForState(id, step, state), `${id}/${gender}/${remembered}`)
  }
}
for (const sequence of Object.values(CH2_SLICE_SEQUENCES)) assert(allowed('ch2').has(sequence.asset), `Missing ${sequence.asset}`)
assert.equal(new Set(Object.values(CH2_SLICE_SEQUENCES).map(item => item.asset)).size, 11)

// Global manual and persisted old scene IDs need metadata for on-demand extras,
// but must not silently make the initial shell download every chapter.
for (const relative of Object.values(catalog)) assert(manifest.assets[`assets/${relative}`])
for (const record of [...Object.values(CARDS), ...Object.values(EVIDENCE), ...Object.values(CH2_CARDS), ...Object.values(CH2_EVIDENCE)]) {
  if (record.image) assert(manifest.assets[`assets/${catalog[record.image]}`], `Missing owned collection ${record.image}`)
}
for (const [relative, descriptor] of Object.entries(manifest.assets)) {
  assert.match(relative, /^(assets|audio)\//)
  assert(!relative.includes('/auditions/') && !relative.includes('/archive/') && !relative.includes('/previews/'))
  const buffer = await readFile(path.join(appRoot, 'public', relative))
  assert.equal(descriptor.bytes, buffer.length, `${relative} bytes`)
  assert.equal(descriptor.sha256, createHash('sha256').update(buffer).digest('hex'), `${relative} content hash`)
}
for (const [chapter, paths] of Object.entries(manifest.chapters)) {
  assert.equal(new Set(paths).size, paths.length, `${chapter} duplicates`)
  for (const relative of paths) assert(manifest.assets[relative], `${chapter}: missing ${relative}`)
}
for (const voice of Object.values(audioAliases)) assert(allowed('ch1').has(`audio/${voice}.mp3`))
for (const voice of ['vox_fan', 'vox_worker', 'vox_thin']) assert(!allowed('ch1').has(`audio/${voice}.mp3`), 'Retired voice downloaded')
for (const chapter of ['ch1', 'dr', 'dsa', 'shell']) {
  assert(!manifest.chapters[chapter].some(file => file.includes('ct-sequences/')), `${chapter} downloads CT atlases`)
  assert(!manifest.chapters[chapter].some(file => file.includes('ch2_pixel_')), `${chapter} downloads chapter 2 portraits`)
}
const shellBytes = manifest.chapters.shell.reduce((sum, file) => sum + manifest.assets[file].bytes, 0)
assert(shellBytes < 1.5 * 1048576, `Shell unexpectedly large: ${shellBytes}`)
assert(!allowed('ch2').has('assets/ct-sequences/abdomen-plain-v1.webp'), 'Removed abdominal case atlas downloaded')
assert(!allowed('ch1').has(`assets/${catalog.ch2_gift_zhou_cup_v1}`), 'Global evidence registry pulled chapter 2 gifts into chapter 1')
assert(!Object.keys(manifest.assets).some(file => /vox_ch2_(?:fall|stroke|gut|wrist|aorta)\.mp3$/.test(file)), 'Retired patient voices registered')

// Catch a future static renderer resource that was not added to its registry.
const appText = await readFile(path.join(appRoot, 'src/App.tsx'), 'utf8')
const tree = ts.createSourceFile('App.tsx', appText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const all = new Set(Object.values(manifest.chapters).flat())
function checkStatic(node) {
  if (ts.isCallExpression(node) && ['IMG', 'imageAsset'].includes(node.expression.getText(tree))) {
    const arg = node.arguments[0]
    if (arg && ts.isStringLiteralLike(arg)) assert(all.has(`assets/${catalog[arg.text]}`), `Unassigned renderer image: ${arg.text}`)
  }
  if (ts.isJsxAttribute(node) && node.name.getText(tree) === 'name' && node.initializer && ts.isStringLiteral(node.initializer)) {
    const image = node.initializer.text
    if (catalog[image]) assert(all.has(`assets/${catalog[image]}`) || all.has(`assets/${catalog[ch2BackgroundAsset(image)]}`), `Unassigned scene: ${image}`)
  }
  ts.forEachChild(node, checkStatic)
}
checkStatic(tree)
const shell = new Set(manifest.chapters.shell)
function auditShellFunction(node) {
  if (ts.isStringLiteralLike(node) && catalog[node.text]) {
    assert(shell.has(`assets/${catalog[node.text]}`), `Non-chapter UI must work after shell readiness: ${node.text}`)
  }
  ts.forEachChild(node, auditShellFunction)
}
const shellFunctions = new Set(['TitleScreen', 'SelectScreen', 'VerifyScreen', 'BadgeScreen', 'DlcHallScreen'])
for (const node of tree.statements) {
  if (ts.isFunctionDeclaration(node) && shellFunctions.has(node.name?.text)) auditShellFunction(node)
}
const certificateTree = ts.createSourceFile('Ch2Certificate.tsx', await readFile(path.join(appRoot, 'src/components/Ch2Certificate.tsx'), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
for (const node of certificateTree.statements) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'Ch2CertificateVerify') auditShellFunction(node)
}
console.log('Chapter preload manifest: all graph/conditional/legacy/manual/audio/atlas resources covered; aliases, bytes, hashes and chapter isolation passed.')
