import { CH2_ACTIVE_BADGES } from './ch2'
import type { Ch2CertificateRecord, GameState } from './types'

export const CH2_CERTIFICATE_NAME_MAX = 32
export const CH2_CERTIFICATE_ID_MAX = 64
export const CH2_CERTIFICATE_GRADES = ['S', 'A', 'B', 'C', '未记录'] as const
const CRED_SALT = 'midnight-radiology-ch2-2026-v1'

export type Ch2CertificateFields = Omit<Ch2CertificateRecord, 'version' | 'code'>

/** Same lightweight checksum as Chapter 1, with a chapter-specific payload and salt.
 * It checks transcription consistency, not identity or cryptographic authenticity. */
function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (h2 >>> 0) * 4294967296 + (h1 >>> 0)
}

function validIdentity(value: string, max: number): boolean {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max
    && !Array.from(value).some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
}

export function validCh2CertificateIdentity(name: string, studentId: string): boolean {
  return validIdentity(name, CH2_CERTIFICATE_NAME_MAX) && validIdentity(studentId, CH2_CERTIFICATE_ID_MAX)
}

function validGrade(grade: unknown): grade is Ch2CertificateRecord['grade'] {
  return CH2_CERTIFICATE_GRADES.some(value => value === grade)
}

function validFields(fields: Ch2CertificateFields): boolean {
  return !!fields && typeof fields === 'object' && validCh2CertificateIdentity(fields.name, fields.studentId)
    && Number.isSafeInteger(fields.gold) && fields.gold >= 0
    && Number.isSafeInteger(fields.badgeCount) && fields.badgeCount >= 0 && fields.badgeCount <= CH2_ACTIVE_BADGES.length
    && fields.shiftCount === 5 && validGrade(fields.grade)
    && Number.isInteger(fields.seed) && fields.seed >= 0 && fields.seed <= 0xffffffff
}

/** Invalid inputs do not produce a code. All displayed snapshot fields are covered. */
export function makeCh2CredCode(fields: Ch2CertificateFields): string {
  if (!validFields(fields)) return ''
  const seedPart = fields.seed.toString(36).toUpperCase()
  // JSON prevents names/IDs containing separators from changing field boundaries.
  const payload = JSON.stringify([fields.name.trim(), fields.studentId.trim(), fields.gold,
    fields.badgeCount, fields.shiftCount, fields.grade, fields.seed, CRED_SALT])
  const hashPart = cyrb53(payload).toString(36).toUpperCase().padStart(8, '0').slice(-8)
  return `YSK2-${seedPart}-${hashPart}`
}

export function verifyCh2CredCode(code: string, name: string, studentId: string, gold: number,
  badgeCount: number, shiftCount: number, grade: string): boolean {
  if (typeof code !== 'string') return false
  const normalized = code.trim().toUpperCase()
  const match = normalized.match(/^YSK2-([0-9A-Z]{1,7})-([0-9A-Z]{8})$/)
  if (!match || shiftCount !== 5 || !validGrade(grade)) return false
  const seed = Number.parseInt(match[1], 36)
  if (seed.toString(36).toUpperCase() !== match[1]) return false
  return makeCh2CredCode({ name, studentId, gold, badgeCount, shiftCount, grade, seed }) === normalized
}

/** Reject partial quizzes even when a stale save says done; legacy completed runs without a quiz remain eligible. */
export function canIssueCh2Certificate(state: GameState): boolean {
  const progress = state.dlc?.ch2
  return !!progress && (progress.done === true || progress.phase === 'done')
    && (!progress.quiz || progress.quiz.completed === true)
}

/** Pure, idempotent, chapter-local issuance. No rewards or changes to Chapter 1 identity/flags/stamps. */
export function issueCh2Certificate(state: GameState, name: string, studentId: string): GameState {
  const progress = state.dlc?.ch2
  if (!progress || progress.certificate || !canIssueCh2Certificate(state)
    || !validCh2CertificateIdentity(name, studentId)) return state
  const rawGrade = progress.quiz ? progress.quiz.grade : state.flags.quiz2_grade
  const grade = validGrade(rawGrade) ? rawGrade : '未记录'
  const fields: Ch2CertificateFields = {
    name: name.trim(), studentId: studentId.trim(), gold: state.gold,
    badgeCount: new Set(state.badges.filter(id => CH2_ACTIVE_BADGES.includes(id))).size,
    shiftCount: 5, grade, seed: state.seed,
  }
  const code = makeCh2CredCode(fields)
  if (!code) return state
  return { ...state, dlc: { ...state.dlc, ch2: { ...progress,
    certificate: { version: 1, ...fields, code } } } }
}
