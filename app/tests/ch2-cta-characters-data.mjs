// Current-round behavior checks; the independent projection separately verifies
// exact reviewed bytes. Never regenerate a historical ledger to pass this test.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { CH2_SHIFTS, CH2_ACTIVE_BADGES, CH2_ACTIVE_CARDS, ch2StepForState } from '../src/game/ch2.ts'
import { CH2_SCANS } from '../src/game/ch2-scans.ts'
import { CH2_PATIENT_ENTRANCES, patientStep, isPatientBed } from '../src/game/ch2-patients.ts'
import { CH2_GIFT_HOSTS } from '../src/game/ch2-gifts.ts'
import { freshState } from '../src/game/store.ts'
import { CTA_CHARACTERS_BASELINE, ctaCharactersLedger, assertCtaCharactersLive } from './ch2-cta-characters-projection.mjs'

assertCtaCharactersLive()
const root = new URL('../../', import.meta.url)
const read = path => readFileSync(new URL(path, root), 'utf8')
const normalize = value => value.replaceAll('\r\n', '\n').trimEnd() + '\n'
const original = path => execFileSync('git', ['show', `${CTA_CHARACTERS_BASELINE}:${path}`], {
  cwd: fileURLToPath(root), encoding: 'utf8', maxBuffer: 32e6,
})
const all = Object.assign({}, ...CH2_SHIFTS.map(shift => shift.steps))
const fresh = freshState('m')
const render = (id, flags = {}) => ch2StepForState(id, all[id], { ...fresh, flags })

// A renamed speaker or new explanatory beat must not change any original
// reward, case amount, event, window task or choice consequence.
function signatures(source, name) {
  const tree = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const found = new Map()
  const fields = object => new Map(object.properties.filter(ts.isPropertyAssignment).map(node => [
    node.name.getText(tree).replace(/^['"]|['"]$/g, ''), node.initializer,
  ]))
  function visit(node) {
    if (ts.isPropertyAssignment(node) && /^c2(?:n\d|d\d|am)_/.test(node.name.getText(tree)) && ts.isObjectLiteralExpression(node.initializer)) {
      const object = fields(node.initializer), signature = {}
      for (const key of ['effect', 'card', 'event', 'windowTask', 'checklist', 'dnt']) {
        if (object.has(key)) signature[key] = object.get(key).getText(tree)
      }
      const choices = object.get('choices')
      if (choices && ts.isArrayLiteralExpression(choices)) signature.choices = choices.elements.filter(ts.isObjectLiteralExpression).map(choice => {
        const properties = fields(choice)
        return Object.fromEntries(['effect', 'risk', 'cond'].filter(key => properties.has(key)).map(key => [key, properties.get(key).getText(tree)]))
      })
      found.set(node.name.getText(tree), signature)
    }
    ts.forEachChild(node, visit)
  }
  visit(tree)
  return found
}
let protectedNodes = 0
for (const row of ctaCharactersLedger().files.filter(row => row.path.startsWith('app/src/game/'))) {
  const before = signatures(original(row.path), row.path), after = signatures(read(row.path), row.path)
  for (const [id, signature] of before) {
    assert(after.has(id), `${id}: no prior story node removed`)
    assert.deepEqual(after.get(id), signature, `${id}: existing rewards/choice effects and eligibility stay unchanged`)
    protectedNodes++
  }
  for (const [id, signature] of after) if (!before.has(id)) {
    assert.equal(signature.effect, undefined, `${id}: no unrequested stat or flag reward`)
    assert.equal(signature.card, undefined, `${id}: no duplicate knowledge card`)
  }
}
for (const shift of CH2_SHIFTS) for (const [id, step] of Object.entries(shift.steps)) {
  const targets = [step.next, step.windowTask?.success, ...(step.choices ?? []).flatMap(choice => [choice.next, choice.risk?.next])]
  for (const target of targets.filter(Boolean)) assert(target.startsWith('@') || all[target], `${id}: broken destination ${target}`)
}
assert.equal(CH2_ACTIVE_BADGES.length, 15)
assert.equal(CH2_ACTIVE_CARDS.length, 17)
for (const path of ['app/src/game/ch2-scans.ts', 'app/src/game/ch2-scan-sequences.ts', 'app/src/game/ch2-observations.ts', 'app/src/game/ch2-gifts.ts']) {
  assert.equal(normalize(read(path)), normalize(original(path)), `${path}: observation answers, scanner clocks, sequence sources and gift limits unchanged`)
}
assert.equal(Object.values(CH2_SCANS).filter(row => row.mode === 'acquire').length, 14)
assert(Object.values(CH2_SCANS).filter(row => row.mode === 'acquire').every(row => row.durationMs === 3000))
assert.equal(CH2_SCANS.c2n3_coronary_volume.mode, 'reconstruct')
assert.equal(CH2_SCANS.c2n3_coronary_volume.durationMs, 1500)

function chain(from, until, flags = {}) {
  const seen = new Set(), rows = []
  for (let id = from; id !== until;) {
    assert(!seen.has(id), `${from}: loop at ${id}`); seen.add(id)
    assert(all[id], `${from}: missing ${id}`)
    const step = render(id, flags)
    rows.push({ id, ...step }); id = step.next
    assert(id, `${from}: expected continuation to ${until}`)
  }
  return rows
}
const coronary = chain('c2n3_coronary_volume', 'c2n3_h6')
assert.equal(coronary.filter(row => row.image === 'ct_coronary_cta').length, 2, 'Only the introduction and first reaction show the 3D image')
assert(!coronary.some(row => row.image === 'ch2_ct_coronary_slices'), 'No return to another slice slideshow')
for (const id of ['c2n3_h4', 'c2n3_h5']) assert(!all[id].image, `${id}: no redundant image popup`)
const distinction = coronary.map(row => row.text).join('\n')
assert.match(distinction, /投影/); assert.match(distinction, /断层/); assert.match(distinction, /三维|3D/)
assert.match(distinction, /渲染/)
assert.match(distinction, /不是|不.*(?:再|重新).*(?:扫|曝光)|两/)

const admission = chain('c2d4_2', 'c2d4_aorta_scan')
const aorta = CH2_PATIENT_ENTRANCES.find(row => row.id === 'aorta')
assert(aorta && aorta.sprite !== 'ch2_patient_aorta_bed')
assert(isPatientBed(aorta.sprite), 'Severe sudden back pain stays on a transfer bed')
for (const { id } of admission) {
  const visual = patientStep(id, render(id))
  assert([visual.sprite, visual.sprite2].includes(aorta.sprite), `${id}: same new middle-aged patient stays present`)
}
const admissionText = admission.map(row => row.text).join('\n')
assert.match(admissionText, /中年|四十|四十多|四十五|45|四十六|46/)
assert.match(admissionText, /背.*(?:剧痛|疼)|(?:剧痛|疼).*背/)
assert.match(admissionText, /跑|运动|踢球/)
assert.doesNotMatch(admissionText, /0\.3|吗啡|神仙水|两周后|只是胃疼|就是胃疼/)
const aortaResult = chain('c2d4_t1', 'c2d4_gap_thermos')
const newVR = ctaCharactersLedger().media.find(row => row.name === 'ch2_aorta_volume_cutaway_v1')
assert(newVR, 'Explicitly reviewed dissection 3D image')
assert(aortaResult.some(row => row.image === newVR.name), '3D shown after existing image-observation point')
assert(aortaResult.filter(row => row.image === newVR.name).every(row => !CH2_SCANS[row.id]), '3D display is not another exposure')
assert.match(aortaResult.map(row => row.text).join('\n'), /市.*三甲|三甲.*市/)
assert.match(aortaResult.map(row => row.text).join('\n'), /转运|转院|救护车/)

const voice = ctaCharactersLedger().media.find(row => row.kind === 'audio')
assert(voice && /luo/.test(voice.name))
assert.equal(all.c2d4_needle0.sfx, voice.name)
assert.equal(Object.values(all).filter(row => row.sfx === voice.name || row.sfx2 === voice.name).length, 1, 'Luo has one entrance voice, no repeats')
assert.equal(all.c2d2_gap_phone_q.speaker, 'sys', 'Retired phone detour resumes at the meal transition')
assert.equal(all.c2d2_gap_phone_q.sprite, '')
assert.deepEqual(CH2_GIFT_HOSTS.c2n1_chat_q, ['tang'])
assert.deepEqual(CH2_GIFT_HOSTS.c2n5_chat_q, ['tang', 'lei'])
for (const flags of [{}, { c2_apples_shared: true }, { c2_dawn_done: true }, { c2_apples_shared: true, c2_dawn_done: true }]) {
  const meal = [render('c2n5_b1', flags), render('c2n5_b2', flags)]
  assert.match(meal.map(row => row.text).join('\n'), /大家|值班.*分|一起|分着/)
  assert.deepEqual(meal[0].effect, { ap: -1 }); assert.deepEqual(meal[1].effect, { heart: 1, flag: 'c2n5_b' })
}
assert(!/悄悄把椅子往你这边挪/.test(render('c2am_payoff_end').text))
assert.doesNotMatch(render('c2am_9', { c2_payoff_expert_done: true }).text, /悄悄把椅子往你这边挪/,
  'Previously completed expert visit cannot recover the retired intimate line')
assert.equal(render('c2n5_g5').sprite, 'char_zhou')
const reflection = chain('c2am_5', 'c2am_6')
assert(reflection.length >= 3 && reflection.length <= 4)
assert.match(reflection.map(row => row.text).join('\n'), /CT.*急诊|急诊.*CT/)
assert.match(reflection.map(row => row.text).join('\n'), /以前|没有CT|没CT/)
assert.equal(render('c2am_6').next, 'c2am_terminal_sms', 'Original late anonymous SMS remains after reflection')
assert.equal(render('c2am_6', { c2_terminal_end_sms_received: true }).next, 'c2am_8')
console.log(`PASS CTA/characters LIVE behavior: ${protectedNodes} original node reward/choice signatures; graph, 14 clocks, 15 badges/17 cards; reconstruction distinction, single CTA display, middle-aged referral, Luo audio, colleague tone and retained ending hooks`)
