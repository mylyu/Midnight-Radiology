// Read-only asset inventory. Writes its report outside the repository; never deletes media.
// Uses TypeScript syntax trees and bounded dynamic filename patterns, not grep absence.
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(path.join(repo, 'app/package.json'))
const ts = require('typescript')
const args = process.argv.slice(2)
const option = (key, fallback) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback
const baseline = option('--baseline', 'HEAD')
const output = path.resolve(option('--output', path.join(repo, '../game-delivery-review/asset-inventory.json')))
if (output === repo || output.startsWith(repo + path.sep)) throw new Error('Inventory output must stay outside the repository')
const unix = value => value.split(path.sep).join('/')
const git = (...params) => execFileSync('git', params, { cwd: repo, encoding: 'utf8', maxBuffer: 32e6 })
const sourceCache = new Map()
const sourceAt = file => {
  if (!sourceCache.has(file)) sourceCache.set(file, git('show', `${baseline}:${file}`))
  return sourceCache.get(file)
}
const tree = git('ls-tree', '-r', '-z', '-l', baseline).split('\0').filter(Boolean).map(entry => {
  const [, hash, size, file] = /^\d+ blob ([a-f0-9]+)\s+(\d+)\t(.+)$/s.exec(entry) ?? []
  return file ? { path: file, hash, bytes: Number(size) } : null
}).filter(Boolean)
const tracked = new Set(tree.map(row => row.path))
const fileRows = directory => existsSync(directory) ? readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const file = path.join(directory, entry.name)
  return entry.isDirectory() ? fileRows(file) : [{ path: unix(path.relative(repo, file)), bytes: statSync(file).size }]
}) : []
const publicRows = fileRows(path.join(repo, 'app/public')).map(row => ({ ...row,
  trackedAtBaseline: tracked.has(row.path), sha256: createHash('sha256').update(readFileSync(path.join(repo, row.path))).digest('hex') }))
const originals = publicRows.filter(row => /^app\/public\/assets\/[^/]+\.png$/.test(row.path))
const audio = publicRows.filter(row => /^app\/public\/audio\/[^/]+\.(mp3|ogg|wav)$/.test(row.path))
const stem = file => path.basename(file).replace(/\.(png|webp|jpg|jpeg|gif|mp3|wav|ogg)$/i, '')
const knownNames = new Set([...originals, ...audio].map(row => stem(row.path)))
const sourceFiles = tree.map(row => row.path).filter(file => /^app\/src\/.+\.(ts|tsx|css)$/.test(file))
const refs = new Map(), dynamic = [], rawImages = new Set(), skippedMetadata = []
function add(name, evidence) {
  if (!knownNames.has(name)) return
  const list = refs.get(name) ?? []
  if (!list.some(row => row.file === evidence.file && row.line === evidence.line && row.kind === evidence.kind)) list.push(evidence)
  refs.set(name, list)
}
const escaped = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
for (const file of sourceFiles) {
  const text = sourceAt(file)
  if (file.endsWith('.css')) {
    for (const match of text.matchAll(/url\(["']?([^)'"\s]+)["']?\)/g)) add(stem(match[1]), { file, line: text.slice(0, match.index).split('\n').length, kind: 'css-url' })
    continue
  }
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const location = node => ({ file, line: ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1 })
  function visit(node) {
    if (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isImportDeclaration(node)) return
    // These are volume knobs / retired-name documentation, not playback routes.
    if (ts.isVariableDeclaration(node) && ['SFX_VOLUME', 'CH2_RETIRED_PATIENT_VOICES'].includes(node.name.getText(ast))) {
      skippedMetadata.push({ ...location(node), name: node.name.getText(ast), reason: 'Metadata only; explicit playback references are audited separately' })
      return
    }
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      add(node.text, { ...location(node), kind: 'runtime-literal' })
      if (/\.(png|webp|jpg|jpeg|gif|mp3|wav|ogg)([?#].*)?$/i.test(node.text)) add(stem(node.text.split(/[?#]/)[0]), { ...location(node), kind: 'runtime-file-literal' })
    }
    // A property key can be a sprite alias or a historically retained collection ID.
    if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name)) add(node.name.text, { ...location(node), kind: 'runtime-dictionary-key' })
    if (ts.isPropertyAssignment(node) && node.name.getText(ast).replaceAll("'", '').replaceAll('"', '') === 'windowTask' && ts.isObjectLiteralExpression(node.initializer)) {
      const field = node.initializer.properties.find(prop => ts.isPropertyAssignment(prop) && prop.name.getText(ast) === 'image')
      if (!field || !ts.isStringLiteral(field.initializer)) throw new Error(`Unresolved numerical source at ${file}:${location(node).line}`)
      rawImages.add(field.initializer.text)
    }
    if (ts.isTemplateExpression(node)) {
      let pieces = [node.head.text, ...node.templateSpans.map(span => span.literal.text)]
      const transport = pieces.findIndex(piece => /(?:^|\/)audio\//.test(piece))
      if (transport >= 0) { pieces = pieces.slice(transport); pieces[0] = pieces[0].replace(/^.*?(?:^|\/)audio\//, '') }
      pieces[pieces.length - 1] = pieces.at(-1).replace(/\.(mp3|wav|ogg|png|webp|jpe?g)(?:\?.*)?$/, '')
      // Ignore generic transport helpers such as assets/${name}.png; enumerated producers
      // and persistent legacy view fields are dealt with below, never treated as dead.
      if (/^(char_|pat_|vox_|vox2_|ch2_|bg_|item_|ct_|xray_|img_)/.test(pieces[0])) {
        const regex = new RegExp('^' + pieces.map(escaped).join('[A-Za-z0-9_-]+') + '$')
        const matches = [...knownNames].filter(name => regex.test(name))
        const evidence = { ...location(node), kind: 'bounded-dynamic-template', template: node.getText(ast), matches }
        dynamic.push(evidence)
        for (const name of matches) add(name, evidence)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
}

// Current save format persists arbitrary previously valid backgrounds/portraits.
// An absent current graph reference is not proof that those files can be removed.
const legacyViewName = name => /^(bg_|char_|pat_|ch2_pixel_|ch2_patient_|ch2_pat_|ch2_bg_)/.test(name)
const imageRows = originals.map(row => {
  const name = stem(row.path), evidence = refs.get(name) ?? []
  const numeric = rawImages.has(name), legacy = legacyViewName(name)
  const alphaExact = name === 'ch2_ct_motion_bed_v1'
  return { ...row, name, evidence, classification: numeric ? 'protect-numerical-gray'
    : evidence.length ? 'retain-runtime-or-collection' : legacy ? 'retain-legacy-view-until-migration'
      : 'unused-current-game-image-candidate', losslessPixelsRequired: numeric,
    alphaExactRequired: alphaExact, geometryExactRequired: name.startsWith('ch2_ct_motion_') }
})
const audioAliases = { vox_fan: 'vox_ch1_fan_mature_20260923', vox_worker: 'vox_ch1_worker_bass_20260923', vox_thin: 'vox_ch1_thin_breathless_20260923' }
const audioRows = audio.map(row => {
  const name = stem(row.path), evidence = refs.get(name) ?? []
  const logicalOnly = Object.hasOwn(audioAliases, name) && !evidence.some(item => item.kind === 'runtime-file-literal')
  return { ...row, name, evidence, classification: logicalOnly ? 'superseded-by-runtime-audio-alias'
    : evidence.length ? 'retain-runtime-audio' : 'unused-current-game-audio-candidate',
    ...(logicalOnly ? { replacement: audioAliases[name] } : {}) }
})
// Local auditioner pages are not Vite entry points and are never linked by game source.
const developerRows = publicRows.filter(row => row.path.startsWith('app/public/auditions/') || /^app\/public\/[^/]*preview\.html$/.test(row.path)).map(row => {
  const relative = row.path.slice('app/public/'.length)
  const productionReferences = sourceFiles.filter(file => sourceAt(file).includes(relative))
  return { ...row, productionReferences, classification: productionReferences.length ? 'remove-production-link-before-deleting-preview' : 'unused-developer-preview' }
})
const generatedManifestPath = path.join(repo, 'app/src/lib/image-assets.generated.json')
const generatedManifest = existsSync(generatedManifestPath) ? JSON.parse(readFileSync(generatedManifestPath, 'utf8')) : {}
const currentGenerated = new Set(Object.values(generatedManifest).map(relative => `app/public/assets/${relative}`))
const staleGenerated = publicRows.filter(row => row.path.startsWith('app/public/assets/optimized/') && !currentGenerated.has(row.path))
const sourcesLegal = publicRows.filter(row => row.path === 'app/public/ct-sequences-sources.txt')
const atlases = publicRows.filter(row => row.path.startsWith('app/public/assets/ct-sequences/'))
const duplicateMap = new Map()
for (const row of publicRows) { const list = duplicateMap.get(row.sha256) ?? []; list.push(row); duplicateMap.set(row.sha256, list) }
const duplicates = [...duplicateMap.entries()].filter(([, rows]) => rows.length > 1).map(([sha256, rows]) => ({ sha256,
  bytesEach: rows[0].bytes, redundantBytes: rows[0].bytes * (rows.length - 1), paths: rows.map(row => row.path) }))
const sum = rows => rows.reduce((total, row) => total + row.bytes, 0)
const dist = fileRows(path.join(repo, 'app/dist'))
const group = (rows, key) => Object.fromEntries([...new Set(rows.map(key))].sort().map(name => {
  const list = rows.filter(row => key(row) === name)
  return [name, { files: list.length, bytes: sum(list) }]
}))
const nonDeployedTracked = tree.filter(row => !row.path.startsWith('app/') && !row.path.startsWith('.git'))
const safeCandidates = [
  ...developerRows.filter(row => !row.productionReferences.length).map(row => ({ ...row, reason: 'Developer preview/audition only; not linked by production source, removing changes no game/save path' })),
  ...audioRows.filter(row => row.classification !== 'retain-runtime-audio').map(row => ({ ...row, reason: row.classification })),
  ...imageRows.filter(row => row.classification === 'unused-current-game-image-candidate').map(row => ({ ...row, reason: 'No runtime literal or bounded dynamic producer; not a stored background/portrait. Review historical docs/tests separately.' })),
]
// Separately authorized delivery plan: all logical image names survive via the new
// catalog; no audio or root historical folder is removed. This is NOT a deletion tool.
const approvedDeliveryRemoval = {
  preconditions: [
    'For every non-numerical original, the new catalog resolves the same logical ID to an existing reviewed delivery file.',
    'The three numerical images remain byte/pixel-identical; CT bed alpha and motion-layer dimensions remain exact.',
    'All originalImageAsset and prebuild consumers migrate before source PNG removal; no fallback may point at a removed file.',
    'TitleScreen internal voice-preview link is removed before deleting that public page.',
    'All 96 audio files and all root historical source/art directories remain untouched.',
    'Git history and the exact original hashes remain available; package excludes non-runtime original root folders, it does not delete them.',
  ],
  records: [
    ...imageRows.filter(row => !row.losslessPixelsRequired).map(({ path, bytes, sha256 }) => ({ path, bytes, sha256, reason: 'Logical ID preserved by reviewed compressed replacement' })),
    ...publicRows.filter(row => row.path.startsWith('app/public/assets/optimized/')).map(({ path, bytes, sha256 }) => ({ path, bytes, sha256, reason: 'Superseded generated delivery cache; all consumers migrate to catalog' })),
    ...developerRows.map(({ path, bytes, sha256 }) => ({ path, bytes, sha256, reason: 'Internal preview/audition removed from deployment; title audition link removed first' })),
  ],
}
const result = {
  baseline: git('rev-parse', baseline).trim(), generatedAt: new Date().toISOString(),
  method: 'All baseline app/src TS/TSX runtime literals + dictionary keys + bounded dynamic templates + persisted-view conservatism; no deletion is performed',
  caveats: [
    'Candidates concern the current production game. External bookmarks to developer previews will cease working if those pages are removed.',
    'Historical freeze/provenance tests intentionally retain old media hashes: deletion needs a new exact approved ledger, not relaxed tests.',
    'Source PNGs are build inputs and SceneBackground retains originalImageAsset fallback. Do not remove referenced originals without changing both mechanisms.',
    'Stale optimized variants are safe from the current manifest but old cached JavaScript may still request them. Clean-build pruning must coordinate cache/version policy.',
    'Legacy background/portrait candidates are not safe deletes without a verified save alias/migration or a deliberate compatibility decision.',
    'The inventory is conservative: source definitions overridden by current chapter adapters can remain marked live.',
  ],
  totals: { baselineTrackedPublic: { files: tree.filter(row => row.path.startsWith('app/public/')).length, bytes: sum(tree.filter(row => row.path.startsWith('app/public/'))) },
    diskPublic: { files: publicRows.length, bytes: sum(publicRows) }, currentDist: { files: dist.length, bytes: sum(dist) },
    originalPng: { files: originals.length, bytes: sum(originals) }, audio: { files: audio.length, bytes: sum(audio) },
    atlas: { files: atlases.length, bytes: sum(atlases) },
    optimizedActive: { files: currentGenerated.size, bytes: sum(publicRows.filter(row => currentGenerated.has(row.path))) },
    optimizedStale: { files: staleGenerated.length, bytes: sum(staleGenerated) },
    safeCandidates: { files: safeCandidates.length, bytes: sum(safeCandidates) },
    exactDuplicateRedundancyBytes: duplicates.reduce((n, row) => n + row.redundantBytes, 0) },
  numericalGraySources: imageRows.filter(row => row.losslessPixelsRequired),
  ctMotionLayers: imageRows.filter(row => row.name.startsWith('ch2_ct_motion_')),
  dynamicFilenameProducers: dynamic, skippedNonPlaybackMetadata: skippedMetadata,
  images: imageRows, audio: audioRows, developerPreviews: developerRows, safeCurrentGameDeletionCandidates: safeCandidates,
  approvedDeliveryRemoval,
  unsafeLegacyViewDeletionCandidates: imageRows.filter(row => row.classification === 'retain-legacy-view-until-migration'),
  staleGeneratedCandidates: staleGenerated, exactDuplicates: duplicates,
  deploymentAttributions: sourcesLegal, atlases,
  nonDeployedTrackedRootGroups: group(nonDeployedTracked, row => row.path.includes('/') ? row.path.split('/')[0] : '(root documents)'),
}
mkdirSync(path.dirname(output), { recursive: true })
writeFileSync(output, JSON.stringify(result, null, 2) + '\n')
const removalOutput = output.replace(/\.json$/i, '') + '.removal-plan.json'
writeFileSync(removalOutput, JSON.stringify({ baseline: result.baseline,
  files: approvedDeliveryRemoval.records.length, bytes: sum(approvedDeliveryRemoval.records), ...approvedDeliveryRemoval }, null, 2) + '\n')
console.log(JSON.stringify({ output, ...result.totals, numericalGray: [...rawImages].sort(),
  safeCandidates: safeCandidates.map(row => row.path), unsafeLegacy: result.unsafeLegacyViewDeletionCandidates.map(row => row.path) }, null, 2))
