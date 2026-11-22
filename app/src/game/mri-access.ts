/** Local chapter admission only; this is not account authentication. */
export const MRI_PASSWORD = 'mri2027'
export const MRI_UNLOCK_KEY = 'mr-ch4-unlock'
let sessionUnlocked = false

export function checkMriPassword(input: string): boolean {
  const normalized = input.trim()
    .replace(/[！-～]/g, char => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .toLowerCase()
  return normalized === MRI_PASSWORD
}

export function mriUnlocked(): boolean {
  if (sessionUnlocked) return true
  try { return localStorage.getItem(MRI_UNLOCK_KEY) === '1' } catch { return false }
}

export function unlockMri(input: string): boolean {
  if (!checkMriPassword(input)) return false
  sessionUnlocked = true
  try { localStorage.setItem(MRI_UNLOCK_KEY, '1') } catch { /* Session admission still works. */ }
  return true
}
