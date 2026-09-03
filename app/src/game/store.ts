import type { GameState, Effect, Cond } from './types'

const KEY = 'midnight-radiology-save-v1'

export function freshState(gender: 'm' | 'f'): GameState {
  return {
    gender,
    night: 1,
    gold: 100,
    skill: 0,
    wealth: 0,
    heart: 0,
    durability: 70,
    badges: [],
    stamps: [],
    flags: {},
    lastCheckin: '',
    streak: 0,
    finished: false,
    seed: Math.floor(Math.random() * 0xffffffff),
    items: [],
    ap: 0,
    buyCount: 0,
  }
}

export function loadState(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as GameState
    if (s && typeof s.gold === 'number' && s.gender) {
      if (typeof s.seed !== 'number') s.seed = Math.floor(Math.random() * 0xffffffff)
      if (!Array.isArray(s.items)) s.items = []
      if (typeof s.ap !== 'number') s.ap = 0
      if (typeof s.buyCount !== 'number') s.buyCount = 0
      return s
    }
    return null
  } catch {
    return null
  }
}

export function saveState(s: GameState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* storage full or blocked — game still playable this session */
  }
}

export function wipeSave() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* noop */
  }
}

export function applyEffect(s: GameState, e?: Effect): GameState {
  if (!e) return s
  const next = { ...s }
  if (e.gold) next.gold = Math.max(0, next.gold + e.gold)
  if (e.skill) next.skill += e.skill
  if (e.wealth) next.wealth += e.wealth
  if (e.heart) next.heart += e.heart
  if (e.durability) next.durability = Math.min(100, Math.max(0, next.durability + e.durability))
  if (e.badge && !next.badges.includes(e.badge)) next.badges = [...next.badges, e.badge]
  if (e.flag) next.flags = { ...next.flags, [e.flag]: true }
  if (e.ap) next.ap = Math.max(0, next.ap + e.ap)
  if (e.item && !next.items.includes(e.item)) next.items = [...next.items, e.item]
  if (e.loseItem) next.items = next.items.filter(i => i !== e.loseItem)
  return next
}

/** 选项条件判定 */
export function condOk(s: GameState, c?: Cond): boolean {
  if (!c) return true
  if (c.flag && !s.flags[c.flag]) return false
  if (c.notFlag && s.flags[c.notFlag]) return false
  if (c.item && !s.items.includes(c.item)) return false
  if (c.gold !== undefined && s.gold < c.gold) return false
  if (c.ap !== undefined && s.ap < c.ap) return false
  return true
}

/** 每日打卡：返回更新后的 state 和是否成功打卡（今天没打过才打） */
export function dailyCheckin(s: GameState): { state: GameState; checked: boolean; reward: number } {
  const today = new Date().toISOString().slice(0, 10)
  if (s.lastCheckin === today) return { state: s, checked: false, reward: 0 }
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const streak = s.lastCheckin === yesterday ? s.streak + 1 : 1
  const reward = 30 + Math.min(streak, 7) * 10
  let next: GameState = { ...s, lastCheckin: today, streak, gold: s.gold + reward }
  if (streak >= 3 && !next.badges.includes('night_owl')) {
    next = { ...next, badges: [...next.badges, 'night_owl'] }
  }
  return { state: next, checked: true, reward }
}

export function meterLevel(v: number): string {
  if (v >= 7) return '🌕🌕🌕🌕🌕'
  if (v >= 4) return '🌕🌕🌕🌕🌑'
  if (v >= 1) return '🌕🌕🌕🌑🌑'
  if (v >= -2) return '🌕🌕🌑🌑🌑'
  return '🌕🌑🌑🌑🌑'
}

/* ===== 通关凭证校验 ===== */
const CRED_SALT = 'midnight-radiology-ch1-2026'

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

/** 生成通关码：YSK-种子段-校验段 */
export function makeCredCode(s: GameState, name: string, sid: string): string {
  const seedPart = (s.seed >>> 0).toString(36).toUpperCase()
  const payload = `${name}|${sid}|${s.gold}|${s.badges.length}|${s.stamps.length}|${s.seed}|${CRED_SALT}`
  const hashPart = cyrb53(payload).toString(36).toUpperCase()
  return `YSK-${seedPart}-${hashPart.slice(-4)}`
}

/** 教师验证：从通关码还原种子并重算校验 */
export function verifyCredCode(code: string, name: string, sid: string, gold: number, badgeCount: number, stampCount: number): boolean {
  const m = code.trim().toUpperCase().match(/^YSK-([0-9A-Z]{1,7})-([0-9A-Z]{4})$/)
  if (!m) return false
  const seed = parseInt(m[1], 36)
  const payload = `${name}|${sid}|${gold}|${badgeCount}|${stampCount}|${seed}|${CRED_SALT}`
  const hashPart = cyrb53(payload).toString(36).toUpperCase()
  return hashPart.slice(-4) === m[2]
}

let audioCache: Record<string, HTMLAudioElement> = {}

export type SfxName = 'stamp' | 'xray' | 'badge' | 'click' | 'ring' | 'radio' | 'buzz' | 'cry_child' | 'groan_man' | 'vox_mom' | 'vox_worker' | 'vox_mystery' | 'vox_thin' | 'vox_aunt' | 'vox_dad' | 'vox_tang' | 'vox_zhou' | 'vox_lei' | 'vox_fan' | 'vox_he' | 'vox_qian' | 'vox_kai' | 'vox_jiang' | 'vox_wen' | 'vox_bai' | 'vox_director'

/* 分档音量:哭闹声刻意压低,语音台词清晰但不炸耳 */
const SFX_VOLUME: Partial<Record<SfxName, number>> = {
  cry_child: 0.07,
  groan_man: 0.13,
  vox_mom: 0.45, vox_worker: 0.45, vox_mystery: 0.45, vox_thin: 0.45, vox_aunt: 0.45, vox_dad: 0.45,
  vox_tang: 0.45, vox_zhou: 0.45, vox_lei: 0.45, vox_fan: 0.45, vox_he: 0.45, vox_qian: 0.45,
  vox_kai: 0.45, vox_jiang: 0.45, vox_wen: 0.45, vox_bai: 0.45, vox_director: 0.45,
}

export function playSfx(name: SfxName) {
  try {
    const src = `${import.meta.env.BASE_URL}audio/${name}.mp3`
    if (!audioCache[name]) audioCache[name] = new Audio(src)
    const a = audioCache[name]
    a.currentTime = 0
    a.volume = SFX_VOLUME[name] ?? 0.22
    void a.play().catch(() => {})
  } catch {
    /* audio unsupported — silent */
  }
}
