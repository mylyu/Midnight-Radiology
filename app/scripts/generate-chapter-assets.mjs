/**
 * Build the preload index from authored chapter data, not from public/ globbing.
 * New dynamic renderers belong in the explicit supplementary lists below.
 * Metadata for legacy image IDs is retained; it does not put those images into
 * a chapter download unless that chapter or an owned saved collection uses them.
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { NIGHTS, SHOP_ITEMS } from '../src/game/data.ts'
import { CARDS, EVIDENCE, DLC_DR, DLC_DSA, DR_QUEUE } from '../src/game/dlc.ts'
import { CH2_SHIFTS, CH2_CARDS, CH2_EVIDENCE, CH2_PORTRAITS, ch2BackgroundAsset } from '../src/game/ch2.ts'
import { CH2_PATIENT_ENTRANCES } from '../src/game/ch2-patients.ts'
import { CH2_OBSERVATIONS } from '../src/game/ch2-observations.ts'
import { CH2_SLICE_SEQUENCES } from '../src/game/ch2-scan-sequences.ts'
import { CH2_SCAN_AUDIO } from '../src/game/ch2-scans.ts'
import { CH2_CT_MOTION } from '../src/game/ch2-ct-motion.ts'
import { CH2_TERMINAL_CUES } from '../src/game/ch2-terminal.ts'
import { CH2_PAYOFF_KEEPSAKES } from '../src/game/ch2-payoffs.ts'
import { CH2_COMMUNICATION_AUDIO } from '../src/game/ch2-communications.ts'

export const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const manifestPath = path.join(appRoot, 'src/lib/media-manifest.generated.json')
const read = relative => readFile(path.join(appRoot, relative), 'utf8')
const mediaFields = new Set(['bg', 'sprite', 'sprite2', 'image', 'readout', 'phone', 'radio'])
const soundFields = new Set(['sfx', 'sfx2', 'voice'])
const sha256 = buffer => createHash('sha256').update(buffer).digest('hex')
const parse = (file, source) => ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true,
  file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)

// These render assets outside the plain Step graph (conditional views, cards,
// patient staging, cinematic orientation variants and transient observations).
export const ch2MediaSources = [
  'src/game/ch2.ts', 'src/game/ch2-patients.ts', 'src/game/ch2-social.ts',
  'src/game/ch2-pacing.ts', 'src/game/ch2-needles.ts', 'src/game/ch2-terminal.ts',
  'src/game/ch2-dawn.ts', 'src/game/ch2-payoffs.ts', 'src/game/ch2-exploration.ts',
  'src/game/ch2-gifts.ts', 'src/game/ch2-stat-interactions.ts',
  'src/game/ch2-observations.ts', 'src/game/ch2-observation-presentation.ts',
  'src/game/ch2-scans.ts', 'src/game/ch2-ct-motion.ts',
  'src/components/Ch2DawnScene.tsx', 'src/components/Ch2Settlement.tsx',
  'src/components/Ch2Certificate.tsx',
]

/** Read the live alias table so a future approved redub cannot preload old audio. */
async function voiceAliases() {
  const tree = parse('store.ts', await read('src/game/store.ts'))
  let aliases
  const visit = node => {
    if (ts.isVariableDeclaration(node) && node.name.getText(tree) === 'revisedVoiceFiles') {
      assert(node.initializer && ts.isObjectLiteralExpression(node.initializer), 'Audio aliases must be a literal registry')
      aliases = Object.fromEntries(node.initializer.properties.map(property => {
        assert(ts.isPropertyAssignment(property) && ts.isStringLiteralLike(property.initializer), 'Invalid audio alias')
        return [property.name.getText(tree).replace(/^['"]|['"]$/g, ''), property.initializer.text]
      }))
    }
    ts.forEachChild(node, visit)
  }
  visit(tree)
  assert(aliases, 'Live revisedVoiceFiles alias registry missing; update the manifest builder with the audio resolver')
  return aliases
}

export async function buildChapterManifest() {
  const catalog = JSON.parse(await read('src/lib/image-assets.catalog.json'))
  const aliases = await voiceAliases()
  const groups = Object.fromEntries(['shell', 'ch1', 'ch2', 'dr', 'dsa'].map(id => [id, new Set()]))
  const candidates = new Map()
  const imagePath = id => {
    assert(catalog[id], `Unknown image ID in preload data: ${id}`)
    return `assets/${catalog[id]}`
  }
  const addPath = (group, relative, type) => {
    assert(!relative.includes('..') && /^(assets|audio)\//.test(relative), `Invalid media path ${relative}`)
    candidates.set(relative, type)
    if (group) groups[group].add(relative)
  }
  const addImage = (group, id, translate = true) => {
    if (!id || id === 'none') return
    if (id === 'me' || id === 'luzhou') {
      for (const gender of ['m', 'f']) addImage(group, id === 'me' ? `char_${gender}` : `char_luzhou_${gender}`, translate)
      return
    }
    const resolved = group === 'ch2' && translate ? CH2_PORTRAITS[id] ?? ch2BackgroundAsset(id) : id
    addPath(group, imagePath(resolved), 'image')
  }
  const addSound = (group, name) => {
    if (!name) return
    if (name === 'vox_luzhou') {
      for (const gender of ['m', 'f']) addSound(group, `${name}_${gender}`)
      return
    }
    addPath(group, `audio/${aliases[name] ?? name}.mp3`, 'audio')
  }
  const collect = (group, value) => {
    if (!value || typeof value !== 'object') return
    for (const [key, child] of Object.entries(value)) {
      if (typeof child === 'string' && mediaFields.has(key)) addImage(group, child)
      else if (typeof child === 'string' && soundFields.has(key)) addSound(group, child)
      else if (child && typeof child === 'object') collect(group, child)
    }
  }

  // Shell includes both teacher-verification forms, not just the title/hall.
  for (const image of ['bg_title', 'bg_corridor', 'bg_control', 'bg_day', 'char_m', 'char_f', 'stamp']) addImage('shell', image)
  for (const sound of ['click', 'badge', 'buzz', 'stamp']) addSound('shell', sound)

  collect('ch1', NIGHTS)
  collect('ch1', SHOP_ITEMS)
  // dlc.ts merges CH2_EVIDENCE into its global manual registry at module load.
  // First-chapter newcomers must not download the later chapter's collection.
  collect('ch1', Object.fromEntries(Object.entries(EVIDENCE).filter(([id]) => !Object.hasOwn(CH2_EVIDENCE, id))))
  for (const image of ['bg_day', 'bg_control', 'machine_reader', 'stamp', 'char_m', 'char_f']) addImage('ch1', image)

  collect('dr', DLC_DR)
  collect('dr', DR_QUEUE)
  collect('dsa', DLC_DSA)
  for (const group of ['dr', 'dsa']) {
    for (const image of ['bg_control', 'char_m', 'char_f']) addImage(group, image)
    for (const sound of ['click', 'badge', 'buzz', 'xray']) addSound(group, sound)
  }

  // Card IDs are references, not file names. Only cards reachable in a chapter
  // are included here; previously owned cards are selected at runtime from save.
  function cardsFrom(group, value) {
    if (!value || typeof value !== 'object') return
    for (const [key, child] of Object.entries(value)) {
      if (key === 'card' && typeof child === 'string') {
        const card = CARDS[child] ?? CH2_CARDS[child]
        assert(card, `Unknown card ${child}`)
        collect(group, card)
      } else if (child && typeof child === 'object') cardsFrom(group, child)
    }
  }
  cardsFrom('ch1', NIGHTS)
  cardsFrom('dr', [DLC_DR, DR_QUEUE])
  cardsFrom('dsa', DLC_DSA)

  collect('ch2', CH2_SHIFTS)
  collect('ch2', SHOP_ITEMS)
  collect('ch2', CH2_CARDS)
  collect('ch2', CH2_EVIDENCE)
  collect('ch2', CH2_PATIENT_ENTRANCES)
  collect('ch2', CH2_OBSERVATIONS)
  collect('ch2', CH2_PAYOFF_KEEPSAKES)
  for (const image of [CH2_CT_MOTION.room, CH2_CT_MOTION.bed, 'stamp', 'me', 'luzhou']) addImage('ch2', image)
  for (const sound of Object.values(CH2_SCAN_AUDIO)) addSound('ch2', sound)
  for (const asset of Object.values(CH2_COMMUNICATION_AUDIO)) addPath('ch2', asset, 'audio')
  for (const kind of new Set(Object.values(CH2_TERMINAL_CUES).map(cue => cue.kind))) addSound('ch2', `ch2_terminal_${kind}_v1`)
  for (const sequence of Object.values(CH2_SLICE_SEQUENCES)) addPath('ch2', sequence.asset, 'image')
  // Temporary stages are constructed in functions rather than present in the
  // exported graph. Parse authored literals as a second, conservative boundary.
  for (const file of ch2MediaSources) {
    const tree = parse(file, await read(file))
    const visit = node => {
      if (ts.isStringLiteralLike(node) && (catalog[node.text] || CH2_PORTRAITS[node.text])) addImage('ch2', node.text)
      if (ts.isPropertyAssignment(node) && ts.isStringLiteralLike(node.initializer)) {
        const key = node.name.getText(tree).replace(/^['"]|['"]$/g, '')
        if (mediaFields.has(key)) addImage('ch2', node.initializer.text)
        if (soundFields.has(key)) addSound('ch2', node.initializer.text)
      }
      ts.forEachChild(node, visit)
    }
    visit(tree)
  }

  // All legacy canonical artwork can be requested through save-derived extras.
  // This is an index only, NOT a preload group and NOT a public-directory scan.
  for (const id of Object.keys(catalog)) addImage(undefined, id, false)
  const assets = {}
  for (const [relative, type] of [...candidates.entries()].sort(([a], [b]) => a.localeCompare(b, 'en'))) {
    const bytes = await readFile(path.join(appRoot, 'public', relative))
    assert(bytes.length > 0, `Empty preload resource ${relative}`)
    assets[relative] = { sha256: sha256(bytes), bytes: bytes.length, type }
  }
  const chapters = Object.fromEntries(Object.entries(groups).map(([id, paths]) => [id, [...paths].sort()]))
  return { version: 1, assets, chapters }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = await buildChapterManifest()
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  for (const [chapter, paths] of Object.entries(manifest.chapters)) {
    const required = new Set([...manifest.chapters.shell, ...paths])
    const bytes = [...required].reduce((sum, asset) => sum + manifest.assets[asset].bytes, 0)
    console.log(`${chapter}: ${required.size} files, ${(bytes / 1048576).toFixed(2)} MiB (including shared shell)`)
  }
}
