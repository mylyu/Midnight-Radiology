// One independently pinned voice revision, before every older historical layer.
// No historical source/media is substituted for unchecked current bytes.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const DIRECTOR_DAY_BASELINE = '3b6f809c7ce8a598e7a52f22e5d7386e5b7415a7'
export const DIRECTOR_DAY_AUDIO = 'app/public/audio/vox_ch2_natural_director_day_v3.mp3'
export const DIRECTOR_DAY_SHA256 = '66b30306bf99dc22cd94cc4db31cda7405d7953e0b824c79af223dd8222f2929'
const root = new URL('../../', import.meta.url)
const scenePath = 'app/src/game/ch2.ts', indexPath = 'docs/ch2-voice-current.json'
const alias = 'vox_ch2_natural_director_day_v3', oldAlias = 'vox_ch2_natural_director_v2'
const text = '年轻人，白班动作要快！', oldText = '年轻人，动作快起来！'
const status = '2026-09-25按作者指定重配'
const read = path => readFileSync(new URL(path, root))
const normalize = value => value.toString().replaceAll('\r\n', '\n').trimEnd() + '\n'
const git = (...args) => execFileSync('git', args, { cwd: fileURLToPath(root), maxBuffer: 32e6 })
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const blob = bytes => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')
const originals = new Map()
const original = path => {
  if (!originals.has(path)) originals.set(path, normalize(git('show', `${DIRECTOR_DAY_BASELINE}:${path}`)))
  return originals.get(path)
}

function revised(path) {
  const before = original(path)
  if (path === scenePath) {
    const lines = before.trimEnd().split('\n')
    const indices = lines.flatMap((line, index) => /^  c2d2_1: /.test(line) ? [index] : [])
    assert.equal(indices.length, 1)
    const index = indices[0]
    assert(lines[index].includes(`sfx: '${oldAlias}'`))
    assert(lines[index].includes(`text: "${oldText}`))
    lines[index] = lines[index].replace(`sfx: '${oldAlias}'`, `sfx: '${alias}'`)
      .replace(`text: "${oldText}`, `text: "${text}`)
    return lines.join('\n') + '\n'
  }
  const rows = JSON.parse(before)
  const row = rows.filter(row => row.key === 'director')
  assert.equal(row.length, 1)
  assert.equal(row[0].step, 'c2d2_1')
  assert.equal(row[0].id, oldAlias)
  assert.equal(row[0].text, oldText)
  // Replace only this exact object; every other row and formatting remain exact.
  const block = JSON.stringify(row[0], null, 2).split('\n').map(line => '  ' + line).join('\n')
  const after = { ...row[0], id: alias, text, status }
  const replacement = JSON.stringify(after, null, 2).split('\n').map(line => '  ' + line).join('\n')
  assert.equal(before.split(block).length, 2)
  return before.replace(block, replacement)
}

export function beforeDirectorDayVoiceSource(path, source) {
  if (![scenePath, indexPath].includes(path)) return source
  const current = normalize(source), before = original(path)
  if (current === before) return source // Exact prior revision only; not arbitrary old-looking text.
  assert.equal(current, revised(path), `${path}: undocumented mutation outside the single director-day voice revision`)
  return before
}

export function assertDirectorDayVoiceBytes(bytes = read(DIRECTOR_DAY_AUDIO)) {
  assert.equal(bytes.length, 49197, 'Director-day voice: independently reviewed byte length')
  assert.equal(hash(bytes), DIRECTOR_DAY_SHA256, 'Director-day voice: independently reviewed live MP3 identity')
}

export function priorDirectorDayVoiceMediaPaths(paths) {
  assertDirectorDayVoiceBytes()
  return paths.filter(path => path !== DIRECTOR_DAY_AUDIO)
}

export function assertDirectorDayVoiceLive() {
  assertDirectorDayVoiceBytes()
  for (const path of [scenePath, indexPath]) {
    const current = normalize(read(path))
    assert.equal(current, revised(path), `${path}: the new voice must actually be live`)
    assert.equal(normalize(beforeDirectorDayVoiceSource(path, current)), original(path))
  }
  const generation = JSON.parse(read('docs/ch2-director-day-voice-generation.json'))
  const qa = JSON.parse(read('docs/ch2-director-day-voice-qa.json'))
  assert.equal(generation.length, 1); assert.equal(qa.length, 1)
  const row = generation[0], check = qa[0]
  assert.equal(row.step, 'c2d2_1'); assert.equal(row.old_id, oldAlias)
  assert.equal(row.id, alias); assert.equal(row.text, text)
  assert.equal(row.output, DIRECTOR_DAY_AUDIO); assert.equal(row.sha256, DIRECTOR_DAY_SHA256)
  assert.equal(row.instruction, `Say the following with the same voice: "${text}"`)
  assert.equal(check.id, alias); assert.equal(check.sha256, DIRECTOR_DAY_SHA256)
  assert.equal(check.expected, text)
  assert.equal(check.asr.replace(/[^\p{Script=Han}]/gu, ''), text.replace(/[^\p{Script=Han}]/gu, ''))
  assert(check.seconds > .5 && check.seconds < 5 && check.peak < .98 && check.rms > .003)
  assert(check.finite && check.mono)
  assert.equal(row.reference_sha256, JSON.parse(read('docs/ch2-voice-author-generation.json'))
    .find(row => row.key === 'director').reference_sha256, 'Keep the same approved director voice reference')
  return { text, seconds: check.seconds, sha256: DIRECTOR_DAY_SHA256 }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assertDirectorDayVoiceLive()
  let sources = 0, media = 0, voices = 0
  const sourcePaths = git('ls-tree', '-r', '--name-only', DIRECTOR_DAY_BASELINE, '--', 'app/src').toString().trim().split('\n')
  for (const path of sourcePaths) {
    assert.equal(normalize(beforeDirectorDayVoiceSource(path, read(path))), original(path), `${path}: no other runtime change`)
    sources++
  }
  const publicPaths = []
  for (const entry of git('ls-tree', '-r', '-z', DIRECTOR_DAY_BASELINE, '--', 'app/public').toString().split('\0').filter(Boolean)) {
    const [, expected, path] = /^\d+ blob ([0-9a-f]+)\t(.+)$/.exec(entry)
    const bytes = read(path)
    if (/\.(?:html|svg|txt)$/.test(path)) assert.equal(normalize(bytes), original(path), `${path}: exact public text`)
    else assert.equal(blob(bytes), expected, `${path}: no old media overwritten or deleted`)
    publicPaths.push(path); media++; if (path.startsWith('app/public/audio/')) voices++
  }
  const filesAt = path => readdirSync(new URL(path + '/', root), { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? filesAt(`${path}/${entry.name}`) : [`${path}/${entry.name}`])
  assert.deepEqual(filesAt('app/public').sort(), [...publicPaths, DIRECTOR_DAY_AUDIO].sort(), 'Exactly one new public MP3, no other additions/deletions')
  // The existing ignored image-assets.generated.json is a build cache, not a new module.
  const liveSourcePaths = git('ls-files', '--cached', '--others', '--exclude-standard', '--', 'app/src')
    .toString().trim().split('\n')
  assert.deepEqual([...new Set(liveSourcePaths)].sort(), sourcePaths.sort(), 'No new production module')
  for (const path of [scenePath, indexPath]) {
    const live = normalize(read(path))
    assert.throws(() => beforeDirectorDayVoiceSource(path, live.replace(text, text + '错误')), /undocumented mutation/)
    assert.throws(() => beforeDirectorDayVoiceSource(path, live + '// unauthorized append\n'), /undocumented mutation/)
  }
  const damaged = Buffer.from(read(DIRECTOR_DAY_AUDIO)); damaged[100] ^= 1
  assert.throws(() => assertDirectorDayVoiceBytes(damaged), /reviewed live MP3 identity/)
  const stranger = 'app/public/audio/unreviewed-voice.mp3'
  assert.deepEqual(priorDirectorDayVoiceMediaPaths([DIRECTOR_DAY_AUDIO, stranger]), [stranger], 'Never mask another audio addition')
  console.log(`PASS director-day voice LIVE: one exact subtitle/sfx and index row; ${sources} runtime files, ${media} old public files (${voices} audio) unchanged; one 49197-byte pinned MP3; mutation probes rejected. ASR/record checks are not a claim of human listening.`)
}
