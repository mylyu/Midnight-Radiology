// Chapter 2 certificate behavior. Source/media isolation is checked independently
// by ch2-certificate-projection.mjs; historical pins are not updated here.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { freshState, makeCredCode, verifyCredCode } from '../src/game/store.ts'
import { CH2_ACTIVE_BADGES } from '../src/game/ch2.ts'
import { restartCh2 } from '../src/game/ch2-exploration.ts'
import { canIssueCh2Certificate, issueCh2Certificate, makeCh2CredCode, verifyCh2CredCode } from '../src/game/ch2-certificate.ts'

const base = () => ({ ...freshState('m'), gold: 2850, skill: 20, heart: 12, wealth: 4,
  playerName: '第一章姓名', playerId: 'CH1-2026', finished: true, night: 5, stamps: [1, 2, 3, 4, 5],
  badges: ['first_night', CH2_ACTIVE_BADGES[0], CH2_ACTIVE_BADGES[1], 'phantom_log'],
  flags: { quiz_grade: 'S', quiz2_grade: 'B', credCode: 'YSK-PRESERVED', n5_fan: true },
  dlc: { dr: { done: true, served: ['kept'] }, dsa: { done: true, dose: 23 }, ch2: {
    done: true, phase: 'done', shift: 'c2am', stepId: 'c2am_9',
    quiz: { completed: true, grade: 'A', rewarded: true, index: 4,
      questions: Array.from({ length: 5 }, (_, question) => ({ question, order: [0, 1, 2, 3], selected: 0 })) },
  } },
})
const protect = s => ({ ...s, dlc: { ...s.dlc, ch2: undefined } })
const encode = certificate => makeCh2CredCode(certificate)
const verify = certificate => verifyCh2CredCode(certificate.code, certificate.name, certificate.studentId,
  certificate.gold, certificate.badgeCount, certificate.shiftCount, certificate.grade)
const patch = (s, progress) => ({ ...s, dlc: { ...s.dlc, ch2: { ...s.dlc.ch2, ...progress } } })
let checks = 0

// The form may prefill the first chapter's name, but only explicit submission
// issues a chapter-local snapshot. A fresh state is never mutated in place.
const before = base(), beforeJSON = JSON.stringify(before)
assert(canIssueCh2Certificate(before))
assert.equal(before.dlc.ch2.certificate, undefined)
const issued = issueCh2Certificate(before, '  测试同学  ', '  BME-2026008  ')
assert.notEqual(issued, before)
assert.equal(JSON.stringify(before), beforeJSON)
assert.deepEqual(protect(issued), protect(before), 'No Chapter 1 identity, score, economy, stamp, flag or DR/DSA mutation')
assert.equal(makeCredCode(issued, issued.playerName, issued.playerId),
  makeCredCode(before, before.playerName, before.playerId), 'Chapter 1 displayed proof remains identical on issuance')
assert.deepEqual({ ...issued.dlc.ch2, certificate: undefined }, { ...before.dlc.ch2, certificate: undefined })
const certificate = issued.dlc.ch2.certificate
assert.equal(certificate.version, 1)
assert.equal(certificate.name, '测试同学')
assert.equal(certificate.studentId, 'BME-2026008')
assert.equal(certificate.gold, 2850)
assert.equal(certificate.badgeCount, 2, 'Only active Chapter 2 badges count; exclude first-chapter and retired badges')
assert.equal(certificate.shiftCount, 5)
assert.equal(certificate.grade, 'A', 'Current completed quiz takes priority over old quiz2_grade')
assert.equal(certificate.seed, before.seed)
assert.equal(encode(certificate), certificate.code)
assert(verify(certificate)); checks++

// Stored certificate is independent of later shared-score changes, reloads,
// repeat clicks and changed form values. It cannot mint a second result.
const changed = { ...issued, gold: 9999, badges: [...issued.badges, CH2_ACTIVE_BADGES[2]],
  flags: { ...issued.flags, quiz2_grade: 'C' } }
assert.equal(issueCh2Certificate(issued, '另一个人', 'OTHER-ID'), issued)
assert.equal(issueCh2Certificate(changed, '另一个人', 'OTHER-ID'), changed)
const restored = JSON.parse(JSON.stringify(changed))
assert.deepEqual(restored.dlc.ch2.certificate, certificate)
assert(verify(restored.dlc.ch2.certificate))
assert.equal(issueCh2Certificate(restored, '', ''), restored)
checks++

// Neither finishing the fifth shift nor a stale grade bypasses the final
// morning meeting, quiz or epilogue. A present incomplete quiz blocks issuance.
for (const progress of [
  { done: false, phase: 'story', stepId: 'c2am_9' },
  { done: false, phase: 'settle', shift: 'c2n5' },
  { done: false, phase: 'quiz', quiz: { completed: false, index: 2, questions: [] } },
  { done: true, phase: 'done', quiz: { completed: false, index: 4, questions: [] } },
]) {
  const s = patch(base(), progress)
  assert.equal(canIssueCh2Certificate(s), false)
  assert.equal(issueCh2Certificate(s, '测试', '123'), s)
  checks++
}
for (const progress of [undefined, {}]) {
  const s = { ...base(), dlc: { ...base().dlc, ch2: progress } }
  assert.equal(canIssueCh2Certificate(s), false)
  assert.equal(issueCh2Certificate(s, '测试', '123'), s)
}
for (const [name, id] of [['', '123'], ['  ', '123'], ['同学', ''], ['同学', '  ']]) {
  const s = base()
  assert.equal(issueCh2Certificate(s, name, id), s, 'Both name and student ID required')
}

// Completed legacy saves remain completed. Missing grades are described as
// missing; neither current nor Ch1 grades are invented to make a certificate.
for (const [grade, expected] of [['S', 'S'], ['B', 'B'], [undefined, '未记录'], ['nonsense', '未记录']]) {
  const legacy = patch(base(), { quiz: undefined, phase: undefined })
  legacy.flags.quiz2_grade = grade
  const next = issueCh2Certificate(legacy, '旧档同学', 'LEGACY-8')
  assert.equal(next.dlc.ch2.certificate.grade, expected)
  assert(verify(next.dlc.ch2.certificate))
  assert.deepEqual(protect(next), protect(legacy))
  assert.equal(next.dlc.ch2.done, true)
  checks++
}
const phaseOnly = patch(base(), { done: undefined, phase: 'done' })
assert(canIssueCh2Certificate(phaseOnly))

// Code validation covers every printed field and chapter. It is a local
// consistency check, not server-backed proof of playing or tamper prevention.
for (const delta of [{ name: '别人' }, { studentId: 'BME-OTHER' }, { gold: certificate.gold + 1 },
  { badgeCount: certificate.badgeCount + 1 }, { shiftCount: 4 }, { grade: 'S' }]) {
  assert.equal(verify({ ...certificate, ...delta }), false, JSON.stringify(delta))
  checks++
}
const otherSeedCode = encode({ ...certificate, seed: certificate.seed + 1 })
assert.notEqual(otherSeedCode, certificate.code)
const ch1 = makeCredCode(before, certificate.name, certificate.studentId)
assert(verifyCredCode(ch1, certificate.name, certificate.studentId, before.gold, before.badges.length, before.stamps.length))
assert.equal(verify({ ...certificate, code: ch1 }), false, 'Chapter 1 code cannot pass as chapter 2')
assert.equal(verifyCredCode(certificate.code, certificate.name, certificate.studentId, certificate.gold, certificate.badgeCount, 5), false)
for (const code of ['', 'YSK2-NOT-A-CODE', certificate.code + 'A', certificate.code.slice(0, -1)]) {
  assert.equal(verify({ ...certificate, code }), false)
}
for (const delta of [{ gold: -1 }, { gold: 2.5 }, { gold: NaN }, { badgeCount: -1 },
  { badgeCount: 1.2 }, { badgeCount: CH2_ACTIVE_BADGES.length + 1 }, { shiftCount: 0 },
  { grade: 'X' }, { name: '' }, { studentId: '' }, { name: 'a\nb' }, { studentId: 'a\tb' },
  { seed: -1 }, { seed: 1.5 }, { seed: 0x100000000 }, { name: '人'.repeat(33) },
  { studentId: 'X'.repeat(65) }]) {
  assert.equal(encode({ ...certificate, ...delta }), '', `Invalid printable fields: ${JSON.stringify(delta)}`)
}
assert.notEqual(encode({ ...certificate, name: 'a|b', studentId: 'c' }),
  encode({ ...certificate, name: 'a', studentId: 'b|c' }), 'Identity separators cannot merge payload boundaries')
const repeatedBadge = base()
repeatedBadge.badges.push(CH2_ACTIVE_BADGES[0])
assert.equal(issueCh2Certificate(repeatedBadge, '同学', 'ID8').dlc.ch2.certificate.badgeCount, 2,
  'Corrupt duplicate badge entries cannot inflate the printed count')

// Existing restart clears chapter-local certification but retains prior
// chapter identity, old proof, cumulative achievements and other DLC saves.
const restarted = restartCh2(issued)
assert.equal(restarted.dlc.ch2.certificate, undefined)
assert.equal(canIssueCh2Certificate(restarted), false)
assert.equal(restarted.playerName, before.playerName)
assert.equal(restarted.playerId, before.playerId)
assert.equal(restarted.flags.credCode, before.flags.credCode)
assert.equal(restarted.flags.quiz_grade, 'S')
assert.equal(restarted.flags.quiz2_grade, undefined)
assert.deepEqual(restarted.stamps, before.stamps)
assert.deepEqual(restarted.dlc.dr, before.dlc.dr)
assert.deepEqual(restarted.dlc.dsa, before.dlc.dsa)
checks++

// The independent source gate also protects the first-chapter implementation.
// Print this identity in the test report for easy review alongside that gate.
const store = readFileSync(new URL('../src/game/store.ts', import.meta.url), 'utf8').replaceAll('\r\n', '\n').trimEnd() + '\n'
console.log(`PASS Ch2 certificate data: ${checks} scenario groups; immutable snapshot/strict fields/legacy recovery/repeat guard/restart/Ch1 isolation; store SHA ${createHash('sha256').update(store).digest('hex')}`)
