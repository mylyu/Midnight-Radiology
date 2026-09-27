/** Local teaching entry code only, not authentication or clinical-data security. */
export const LDCT_PASSWORD = 'ldct2258'
export const LDCT_UNLOCK_KEY = 'mr-ldct-unlock'
let sessionUnlocked = false

export function checkLdctPassword(input: string): boolean {
  const normalized = input.trim()
    .replace(/[！-～]/g, char => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .toLowerCase()
  return normalized === LDCT_PASSWORD
}

export function ldctUnlocked(): boolean {
  if (sessionUnlocked) return true
  try { return localStorage.getItem(LDCT_UNLOCK_KEY) === '1' } catch { return false }
}

export function unlockLdct(input: string): boolean {
  if (!checkLdctPassword(input)) return false
  sessionUnlocked = true
  try { localStorage.setItem(LDCT_UNLOCK_KEY, '1') } catch { /* Session access works without storage. */ }
  return true
}
