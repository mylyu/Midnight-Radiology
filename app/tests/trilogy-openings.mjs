// node --import tsx tests/trilogy-openings.mjs (from app/)
// Actual state transitions + current preload manifest; no browser/build/file output.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { TRILOGY } from '../src/game/trilogy-registry.ts'
import { condOk } from '../src/game/store.ts'
import { initializeTrilogy, patchTrilogy, trilogyProgress, trilogyStep,
  trilogyAdvance, trilogyChoose, trilogyCheckin } from '../src/game/trilogy-session.ts'
import { buildChapterManifest } from '../scripts/generate-chapter-assets.mjs'

const copy = value => JSON.parse(JSON.stringify(value))
const stats = s => [s.gold, s.skill, s.heart, s.wealth, s.ap, s.durability]
const base = () => ({ gender: 'f', night: 5, gold: 1037, skill: 11, heart: 12, wealth: 13,
  ap: 3, durability: 87, seed: 20261011, badges: ['old_badge'], items: ['old_item'],
  cards: ['old_card'], events: ['old_event'], stamps: [1, 2, 3, 4, 5], flags: { old_flag: true },
  finished: true, lastCheckin: '2026-10-10', streak: 3,
  dlc: { ch2: { done: true, certificate: { code: 'OLD-CERTIFICATE' } }, dr: { done: true } } })
const results = []

for (const spec of [
  { id: 'ch3', start: 'c3_intro_call_0', stop: 'c3_s1_start_0', prefix: 'c3_intro_',
    flags: ['c3_rotation_invited', 'c3_cousin_booking', 'c3_rotation_arranged'], cards: [] },
  { id: 'ch4', start: 'c4_pro_0', stop: 'c4_1_open_0', prefix: 'c4_pro_',
    flags: ['c4_procurement_decided'], cards: ['c4_field'] },
]) {
  const chapter = TRILOGY[spec.id], initial = base()
  assert.equal(chapter.shifts[0].start, spec.start)
  assert.equal(chapter.shifts[0].checkinAt, spec.stop, 'Formal check-in keeps its old cursor')
  const reached = new Set(), endpoints = []
  const walk = (s, path = []) => {
    const p = trilogyProgress(s, spec.id), id = p.stepId
    assert(path.length < 60 && !path.includes(id), `${spec.id}: finite opening, not a loop`)
    assert.deepEqual(stats(s), stats(initial), `${id}: no wage, attribute, AP or equipment reward`)
    for (const field of ['badges', 'items', 'events']) assert.deepEqual(s[field], initial[field], `${id}: no case reward`)
    assert(s.cards.every(card => initial.cards.includes(card) || spec.cards.includes(card)), `${id}: only the approved learning card`)
    assert(Object.keys(s.flags).every(flag => flag === 'old_flag' || spec.flags.includes(flag)), `${id}: only genuine opening-history flags`)
    assert.equal(p.phase, 'story'); assert.equal(p.shift, 0)
    assert(!p.applied.includes('checkin:0'), `${id}: no pre-shift check-in receipt`)
    assert.deepEqual(s.dlc.ch2, initial.dlc.ch2); assert.deepEqual(s.dlc.dr, initial.dlc.dr)
    const refreshed = copy(s)
    assert.strictEqual(initializeTrilogy(refreshed, chapter, 'ignored-run'), refreshed, 'Refresh resumes, never restarts a prelude')
    if (id === spec.stop) { endpoints.push(s); return }
    reached.add(id)
    const step = trilogyStep(s, chapter)
    assert(chapter.steps[id]); assert(!step.caseId && !step.tool && !step.scan && !step.end, `${id}: not clinical work/settlement`)
    const nextPath = [...path, id]
    if (step.choices?.length) {
      for (const choice of step.choices) {
        assert(condOk(s, choice.cond), `${id}: all proposed opening options are playable`)
        assert(!choice.risk, `${id}: opening options are not random reward rolls`)
        const next = trilogyChoose(copy(s), chapter, id, choice)
        assert.notEqual(trilogyProgress(next, spec.id).stepId, id, `${id}: choice really advances`)
        walk(next, nextPath)
      }
    } else {
      const next = trilogyAdvance(s, chapter, id)
      assert.notEqual(trilogyProgress(next, spec.id).stepId, id, `${id}: authored next exists`)
      walk(next, nextPath)
    }
  }
  walk(initializeTrilogy(initial, chapter, `${spec.id}-opening-test`))
  // CH3's two equivalent invitation responses were deliberately collapsed.
  // The old question node remains a valid resume connector, not a new-run branch.
  const resumeOnly = spec.id === 'ch3' ? ['c3_intro_ask'] : []
  assert.equal(endpoints.length, spec.id === 'ch3' ? 1 : 12, 'Approved opening routes converge without redundant invitation choices')
  assert.deepEqual([...reached].sort(), Object.keys(chapter.steps).filter(id => id.startsWith(spec.prefix) && !resumeOnly.includes(id)).sort(), 'All current prelude nodes are reachable and converge')
  for (const id of resumeOnly) {
    const legacy = patchTrilogy(initializeTrilogy(base(), chapter, 'legacy-invitation'), spec.id, { stepId: id })
    assert.equal(trilogyProgress(legacy, spec.id).stepId, id, 'Legacy cursor is retained')
    const continued = trilogyAdvance(legacy, chapter, id)
    assert.equal(trilogyProgress(continued, spec.id).stepId, 'c3_intro_confirm_0')
  }
  for (const s of endpoints) {
    for (const flag of spec.flags) assert.equal(s.flags[flag], true)
    const checked = trilogyCheckin(s, chapter)
    assert.deepEqual(stats(checked), [initial.gold + 50, ...stats(initial).slice(1)], 'Formal check-in alone awards exactly 50')
    assert(trilogyProgress(checked, spec.id).applied.includes('checkin:0'))
    const persisted = copy(checked)
    assert.strictEqual(trilogyCheckin(persisted, chapter), persisted, 'Check-in cannot pay again after refresh')
  }
  results.push({ chapter: spec.id, nodes: reached.size, paths: endpoints.length, checkinAt: spec.stop })
}

// A saved formal opening or mid-chapter cursor must not be dragged into new history.
for (const [id, cursors] of Object.entries({ ch3: ['c3_s1_start_0', 'c3_s3_start_0'],
  ch4: ['c4_1_open_0', 'c4_3_open_0'], ch5: ['c5_s1_0', 'c5_s3_0'] })) {
  const chapter = TRILOGY[id]
  for (const [i, cursor] of cursors.entries()) {
    assert(chapter.steps[cursor], `${id}: old save cursor remains valid`)
    const legacy = patchTrilogy(initializeTrilogy(base(), chapter, 'old-run'), id, {
      shift: i ? 2 : 0, stepId: cursor, applied: [cursor, `checkin:${i ? 2 : 0}`], visited: [cursor],
      heardCues: ['voice:old'], tools: {}, scans: {}, snapshots: { 0: { gold: 1037, skill: 11, heart: 12, wealth: 13 } },
    })
    legacy.ap = 1
    const persisted = copy(legacy), before = copy(persisted), resumed = initializeTrilogy(persisted, chapter, 'new-run')
    assert.strictEqual(resumed, persisted); assert.deepEqual(resumed, before)
    assert(!resumed.flags.c3_rotation_arranged && !resumed.flags.c4_procurement_decided, 'Old saves do not fabricate new prologue memories')
  }
}
// Totals are reported for review, not frozen: trilogy-graph-current.mjs checks the
// semantic core tasks and graph integrity without blocking approved tightening.
const interactionTotals = Object.fromEntries(Object.entries(TRILOGY).map(([id, chapter]) => {
  const steps = Object.values(chapter.steps)
  return [id, [steps.filter(s => s.tool).length, steps.filter(s => s.scan).length]]
}))
const mri = TRILOGY.ch4
assert.match(mri.equipment, /^0\.55T\b/)
assert.match(mri.steps.c4_1_open_0.imageLabel, /0\.55T/)
const oldMri = patchTrilogy(initializeTrilogy(base(), mri), 'ch4', { stepId: 'c4_1_open_0' })
assert.match(trilogyStep(oldMri, mri).text, /0\.55T/, 'Old-save narration also names the installed field correctly')

const catalog = JSON.parse(readFileSync(new URL('../src/lib/image-assets.catalog.json', import.meta.url), 'utf8'))
const cg = { ch3: ['cg_c3_cousin_call_v3', 'cg_c3_us_visit_v3'],
  ch4: ['cg_c4_procurement_v3', 'cg_c4_wide_bore_v3'], ch5: ['cg_c5_training_notice_v3'] }
const manifest = await buildChapterManifest() // Existing read-only API; does not save generated metadata.
for (const [chapter, ids] of Object.entries(cg)) for (const id of ids) {
  assert(catalog[id], `${id}: stable catalog entry`)
  assert(TRILOGY[chapter].assets.includes(id), `${id}: explicit chapter preload registration`)
  assert(Object.values(TRILOGY[chapter].steps).some(step => step.image === id), `${id}: actual story use, not an orphan`)
  const path = `assets/${catalog[id]}`
  assert(manifest.chapters[chapter].includes(path), `${id}: real preload builder admits it`)
  assert.equal(manifest.assets[path]?.type, 'image'); assert(manifest.assets[path].bytes > 0)
}
console.log(JSON.stringify({ status: 'passed', kind: 'pure-state-data-not-browser', openings: results,
  oldCursors: 6, toolsScans: interactionTotals, cgRegistered: 5, mriField: '0.55T', metadataWritten: false }))
