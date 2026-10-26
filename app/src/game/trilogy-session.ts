import { applyEffect, condOk } from './store'
import { SHOP_ITEMS } from './data'
import type { Choice, GameState } from './types'
import type { TrilogyChapter, TrilogyId, TrilogyProgress, TrilogyStep } from './trilogy-types'
import { TRILOGY_LEGACY_QUIZ } from './trilogy-quiz-legacy'

export const trilogyProgress = (s: GameState, id: TrilogyId) => s.dlc?.[id]?.chapter
const snapshot = (s: GameState) => ({ gold: s.gold, skill: s.skill, heart: s.heart, wealth: s.wealth })
export function patchTrilogy(s: GameState, id: TrilogyId, patch: Partial<TrilogyProgress>): GameState {
  const p = trilogyProgress(s, id)
  return p ? { ...s, dlc: { ...s.dlc, [id]: { ...s.dlc?.[id], chapter: { ...p, ...patch } } } } : s
}
function hash(seed: number, text: string): number {
  let value = seed >>> 0
  for (const c of text) value = Math.imul(value ^ c.charCodeAt(0), 16777619) >>> 0
  return value
}
export function trilogyStep(s: GameState, chapter: TrilogyChapter): TrilogyStep {
  const p = trilogyProgress(s, chapter.id)
  const raw = chapter.steps[p?.stepId ?? chapter.shifts[0].start]
  return raw ? chapter.adapt?.(p?.stepId ?? chapter.shifts[0].start, raw, s) ?? raw : { text: '进度暂时无法读取，请返回本章入口继续。' }
}
/** Entry effects, cursor and receipts are one state value, never a render-side effect. */
export function enterTrilogyNode(s: GameState, chapter: TrilogyChapter, target: string): GameState {
  const p = trilogyProgress(s, chapter.id)
  if (!p || !chapter.steps[target]) return s
  let next = patchTrilogy(s, chapter.id, { stepId: target, giftReply: undefined,
    viewBg: chapter.steps[target].bg ?? p.viewBg ?? chapter.shifts[p.shift].background })
  let step = trilogyStep(next, chapter)
  const skipped = new Set<string>()
  while (step.skipUnlessFlag && !next.flags[step.skipUnlessFlag] && step.next && !skipped.has(target)) {
    skipped.add(target); target = step.next
    if (!chapter.steps[target]) return s
    next = patchTrilogy(next, chapter.id, { stepId: target }); step = trilogyStep(next, chapter)
  }
  const current = trilogyProgress(next, chapter.id)!
  if (current.applied.includes(target)) return next
  next = applyEffect(next, step.effect)
  if (step.card && !(next.cards ?? []).includes(step.card)) next = { ...next, cards: [...(next.cards ?? []), step.card] }
  if (step.event && !(next.events ?? []).includes(step.event)) next = { ...next, events: [...(next.events ?? []), step.event] }
  if (current.pendingCoffee && /hub$/.test(target)) {
    next = applyEffect(next, { ap: 1 }); next = patchTrilogy(next, chapter.id, { pendingCoffee: false })
  }
  return patchTrilogy(next, chapter.id, { applied: [...current.applied, target],
    visited: current.visited.includes(target) ? current.visited : [...current.visited, target] })
}
export function initializeTrilogy(s: GameState, chapter: TrilogyChapter, runId = `${chapter.id}-${s.seed}`): GameState {
  if (trilogyProgress(s, chapter.id)) return s
  const progress: TrilogyProgress = { version: 1, runId, shift: 0, stepId: chapter.shifts[0].start,
    phase: 'story', applied: [], visited: [], tools: {}, snapshots: { '0': snapshot(s) }, gifts: [],
    shop: { shift: 0, lotteryCount: 0, buyCount: 0 } }
  const next = { ...s, ap: 3, dlc: { ...s.dlc, [chapter.id]: { ...s.dlc?.[chapter.id], chapter: progress } } }
  return enterTrilogyNode(next, chapter, progress.stepId)
}
export function restartTrilogy(s: GameState, chapter: TrilogyChapter, runId: string): GameState {
  const flags = Object.fromEntries(Object.entries(s.flags).filter(([key]) => !key.startsWith(`${chapter.id.replace('ch', 'c')}_`)))
  const dlc = { ...s.dlc }; delete dlc[chapter.id]
  return initializeTrilogy({ ...s, flags, dlc }, chapter, runId)
}
export function trilogyCheckin(s: GameState, chapter: TrilogyChapter): GameState {
  const p = trilogyProgress(s, chapter.id)
  if (!p || p.phase !== 'story') return s
  const key = `checkin:${p.shift}`
  if (p.applied.includes(key)) return s
  return patchTrilogy(applyEffect(s, { gold: 50 }), chapter.id, { applied: [...p.applied, key] })
}
export function trilogyAdvance(s: GameState, chapter: TrilogyChapter, expected: string): GameState {
  const p = trilogyProgress(s, chapter.id)
  if (!p || p.stepId !== expected || !['story', 'epilogue'].includes(p.phase)) return s
  if (p.giftReply) return patchTrilogy(s, chapter.id, { giftReply: undefined })
  const step = trilogyStep(s, chapter)
  if (step.tool && !p.tools[expected]?.completed) return s
  if (step.scan && !p.scans?.[expected]?.completed) return s
  if (step.end) return patchTrilogy(s, chapter.id, p.phase === 'epilogue'
    ? { phase: 'done', done: true } : { phase: 'settle' })
  return step.next && !step.choices?.length ? enterTrilogyNode(s, chapter, step.next) : s
}
export function trilogyChoose(s: GameState, chapter: TrilogyChapter, expected: string, choice: Choice): GameState {
  const p = trilogyProgress(s, chapter.id)
  if (!p || p.stepId !== expected || p.giftReply || !['story', 'epilogue'].includes(p.phase)) return s
  const options = trilogyStep(s, chapter).choices ?? []
  if (!options.includes(choice) && !options.some(c => c.next === choice.next && c.text === choice.text)) return s
  if (!condOk(s, choice.cond)) return s
  let next = applyEffect(s, choice.effect)
  const risk = choice.risk && hash(s.seed, `${p.runId}:${expected}:${choice.next}`) / 0x100000000 < choice.risk.chance
  if (risk) next = applyEffect(next, choice.risk?.effect)
  return enterTrilogyNode(next, chapter, risk ? choice.risk!.next : choice.next)
}
export function nextTrilogyShift(s: GameState, chapter: TrilogyChapter): GameState {
  const p = trilogyProgress(s, chapter.id)
  if (!p || p.phase !== 'settle') return s
  if (p.shift === chapter.shifts.length - 1) return startTrilogyQuiz(s, chapter)
  const shift = p.shift + 1
  const next = patchTrilogy({ ...s, ap: 3 }, chapter.id, { shift, phase: 'story',
    snapshots: { ...p.snapshots, [String(shift)]: snapshot(s) }, shop: { shift, buyCount: p.shop.buyCount, lotteryCount: 0 } })
  return enterTrilogyNode(next, chapter, chapter.shifts[shift].start)
}
export function updateTrilogyTool(s: GameState, id: TrilogyId, node: string,
  values: { value: number; secondary: number; choice: string }): GameState {
  const p = trilogyProgress(s, id)
  return p?.stepId === node && !p.tools[node]?.completed
    ? patchTrilogy(s, id, { tools: { ...p.tools, [node]: values } }) : s
}
export function completeTrilogyTool(s: GameState, chapter: TrilogyChapter, node: string, assisted = false): GameState {
  const p = trilogyProgress(s, chapter.id), step = chapter.steps[node]
  if (!p || p.stepId !== node || !step?.tool || p.tools[node]?.completed) return s
  const entry = { ...(p.tools[node] ?? { value: 25, secondary: 50, choice: step.tool.kind === 'mri' ? 'T1' : '凸阵' }) }
  if (assisted) entry.choice = `assisted:${entry.choice}`
  const next = patchTrilogy(s, chapter.id, { tools: { ...p.tools, [node]: { ...entry, completed: true } } })
  return enterTrilogyNode(next, chapter, step.tool.next)
}
export function trilogyGive(s: GameState, chapter: TrilogyChapter, node: string, item: 'milktea' | 'snack'): GameState {
  const p = trilogyProgress(s, chapter.id), step = trilogyStep(s, chapter)
  const key = `${p?.shift}:${step.giftTo}`
  if (!p || p.stepId !== node || !step.giftTo || p.giftReply || p.gifts.includes(key) || !s.items.includes(item)) return s
  const person = chapter.characters[step.giftTo]?.name ?? step.giftTo
  const next = applyEffect(s, { loseItem: item, ...(item === 'snack' ? { heart: 1 } : {}) })
  const replies: Record<string, string> = chapter.id === 'ch3' ? item === 'milktea' ? {
    mei: '先放桌上，我擦个手。谢谢啊。', lei: '给我的？正好，杯子里那点早凉透了。',
    zhou: '行，今天换个口味。谢谢你啊。', he: '谢谢，跑一趟正口渴呢。', tang: '谢谢！我刚才还惦记着买一杯。',
  } : {
    mei: '谢谢，忙到现在，正想找点吃的。', lei: '我拿两块，正好垫垫。你也吃。',
    zhou: '这个配茶不错。坐，一起吃点。', he: '来得正好，我饭还没顾上吃。', tang: '来得正好，我正翻包找吃的呢。',
  } : { mei: '先放这儿，等我擦干手。……你也拿一份。', lei: '给我的？行，今晚不用啃键盘了。',
    zhou: '茶还没喝完呢。先留着，别给我扔了。', he: '来得正好，我饭还没顾上吃。', tang: '我正翻包找吃的。你要不要也坐会儿？' }
  return patchTrilogy(next, chapter.id, { gifts: [...p.gifts, key], giftReply: { node, person: step.giftTo,
    text: replies[step.giftTo] ?? `${person}接过去，把另一把椅子拉开：「坐，别站着吃。」` } })
}
export function trilogyReadBook(s: GameState, chapter: TrilogyChapter): GameState {
  const p = trilogyProgress(s, chapter.id)
  if (!p) return s
  const flag = `${chapter.id.replace('ch', 'c')}_book_${p.shift}`
  return s.flags[flag] ? s : applyEffect(s, { skill: 1, flag })
}
export function trilogyHeardCue(s: GameState, id: TrilogyId, node: string): GameState {
  const p = trilogyProgress(s, id)
  return p && !p.heardCues?.includes(node) ? patchTrilogy(s, id, { heardCues: [...(p.heardCues ?? []), node] }) : s
}
/** Persist before mounting an acquisition; its clock survives refresh/background. */
export function beginTrilogyScan(s: GameState, chapter: TrilogyChapter, node: string, now = Date.now()): GameState {
  const p = trilogyProgress(s, chapter.id)
  if (!p || p.stepId !== node || !chapter.steps[node]?.scan || p.scans?.[node]) return s
  return patchTrilogy(s, chapter.id, { scans: { ...p.scans, [node]: { startedAt: now } } })
}
export function completeTrilogyScan(s: GameState, chapter: TrilogyChapter, node: string, now = Date.now()): GameState {
  const p = trilogyProgress(s, chapter.id), scan = chapter.steps[node]?.scan, receipt = p?.scans?.[node]
  if (!p || p.stepId !== node || !scan || !receipt) return s
  const duration = scan.durationMs ?? 3000
  if (Number.isFinite(receipt.startedAt) && receipt.startedAt <= now + duration && now - receipt.startedAt < duration) return s
  const next = patchTrilogy(s, chapter.id, { scans: { ...p.scans, [node]: { ...receipt, completed: true } } })
  return trilogyAdvance(next, chapter, node)
}
export function trilogyBuy(s: GameState, chapter: TrilogyChapter, itemId: string): GameState {
  const p = trilogyProgress(s, chapter.id), item = trilogyShopItems(chapter, s).find(i => i.id === itemId)
  if (!p || !item || s.gold < item.price) return s
  if (!['coffee', 'lottery'].includes(itemId) && s.items.includes(itemId)) return s
  if ((itemId === 'milktea' || itemId === 'snack') && ['done', 'epilogue', 'quiz'].includes(p.phase)) return s
  if (itemId === 'coffee' && (['quiz', 'done', 'epilogue'].includes(p.phase) || p.phase === 'settle' && p.shift === 4 || p.pendingCoffee)) return s
  if (itemId === 'lottery' && p.shop.lotteryCount >= 5) return s
  const shop = { ...p.shop, buyCount: p.shop.buyCount + 1, lotteryCount: p.shop.lotteryCount + (itemId === 'lottery' ? 1 : 0) }
  const lotteryRoll = hash(s.seed, `${p.runId}:${p.shift}:lottery:${p.shop.lotteryCount}`) / 0x100000000
  const prize = lotteryRoll < .42 ? 0 : lotteryRoll < .70 ? 20 : lotteryRoll < .88 ? 50 : lotteryRoll < .96 ? 120 : 250
  let next = applyEffect(s, { gold: -item.price + (itemId === 'lottery' ? prize : 0),
    ...(itemId === 'milktea' ? { heart: 2 } : {}), ...(itemId === 'book' ? { skill: 2 } : {}),
    ...(!['coffee', 'lottery'].includes(itemId) ? { item: itemId } : {}) })
  if (itemId === 'coffee' && p.phase === 'story') next = applyEffect(next, { ap: 1 })
  return patchTrilogy(next, chapter.id, { shop, ...(itemId === 'coffee' && p.phase === 'settle' ? { pendingCoffee: true } : {}) })
}
function shuffled(length: number, seed: number): number[] {
  const values = Array.from({ length }, (_, i) => i)
  for (let i = values.length - 1; i > 0; i--) { const j = hash(seed, String(i)) % (i + 1); [values[i], values[j]] = [values[j], values[i]] }
  return values
}
export function trilogyShopItems(chapter: TrilogyChapter, state?: GameState) {
  const uses = new Set(Object.values(chapter.steps).flatMap(step => (step.choices ?? []).map(choice => choice.cond?.item)))
  const standard = SHOP_ITEMS.filter(item => ['coffee', 'milktea', 'snack', 'book', 'lottery'].includes(item.id) || uses.has(item.id))
  const p = state && trilogyProgress(state, chapter.id)
  const added = (chapter.shopItems ?? []).filter(item => !state || !p ||
    !(item.use && state.flags[item.use]) && p.shift <= (item.lastShift ?? 4)
    && !(p.shift === (item.lastShift ?? 4) && ['settle', 'quiz', 'epilogue', 'done'].includes(p.phase)))
  return [...standard, ...added]
}
export function startTrilogyQuiz(s: GameState, chapter: TrilogyChapter): GameState {
  const p = trilogyProgress(s, chapter.id)
  if (!p || p.quiz) return s
  const seed = hash(s.seed, p.runId)
  return patchTrilogy(s, chapter.id, { phase: 'quiz', quizContent: chapter.quiz, quiz: { index: 0, completed: false,
    questions: shuffled(chapter.quiz.length, seed).slice(0, 5).map(question => ({ question, order: shuffled(chapter.quiz[question].options.length, seed + question) })) } })
}
export function answerTrilogyQuiz(s: GameState, chapter: TrilogyChapter, answer: number): GameState {
  const p = trilogyProgress(s, chapter.id), q = p?.quiz
  if (!p || p.phase !== 'quiz' || !q || q.completed || q.questions[q.index].selected !== undefined) return s
  const row = q.questions[q.index]
  if (!row.order.includes(answer)) return s
  return patchTrilogy(s, chapter.id, { quiz: { ...q, questions: q.questions.map((r, i) => i === q.index ? { ...r, selected: answer } : r) } })
}
export function trilogyQuizContent(s: GameState, chapter: TrilogyChapter) {
  const p = trilogyProgress(s, chapter.id)
  return p?.quizContent ?? (p?.quiz ? TRILOGY_LEGACY_QUIZ[chapter.id] : chapter.quiz)
}
export function nextTrilogyQuiz(s: GameState, chapter: TrilogyChapter): GameState {
  const p = trilogyProgress(s, chapter.id), q = p?.quiz
  if (!p || !q || q.completed || q.questions[q.index].selected === undefined) return s
  if (q.index < q.questions.length - 1) return patchTrilogy(s, chapter.id, { quiz: { ...q, index: q.index + 1 } })
  const content = trilogyQuizContent(s, chapter)
  const score = q.questions.filter(row => row.selected === content[row.question].answer).length
  const grade = score === 5 ? 'S' : score >= 4 ? 'A' : score >= 3 ? 'B' : 'C'
  return patchTrilogy(applyEffect(s, { gold: score * 20, skill: 1 }), chapter.id,
    { quiz: { ...q, completed: true, rewarded: true, grade } })
}
export function finishTrilogyQuiz(s: GameState, chapter: TrilogyChapter): GameState {
  const p = trilogyProgress(s, chapter.id)
  return p?.phase === 'quiz' && p.quiz?.completed ? enterTrilogyNode(patchTrilogy(s, chapter.id, { phase: 'epilogue' }), chapter, chapter.afterQuiz) : s
}
export function trilogyCredential(id: TrilogyId, fields: { name: string; studentId: string; grade: string; gold: number; badgeCount: number }): string {
  const value = hash(0x421038, JSON.stringify([id, fields.name.trim(), fields.studentId.trim(), fields.grade, fields.gold, fields.badgeCount, 5]))
  return `YSK${id.slice(2)}-${value.toString(36).toUpperCase().padStart(7, '0')}`
}
export function issueTrilogyCertificate(s: GameState, chapter: TrilogyChapter, name: string, studentId: string): GameState {
  const p = trilogyProgress(s, chapter.id)
  if (!p?.done || !p.quiz?.completed || p.certificate || !name.trim() || !studentId.trim() || name.length > 32 || studentId.length > 64
    || Array.from(name + studentId).some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)) return s
  const fields = { name: name.trim(), studentId: studentId.trim(), grade: p.quiz.grade ?? 'C', gold: s.gold,
    badgeCount: s.badges.filter(id => !!chapter.badges[id]).length }
  return patchTrilogy(s, chapter.id, { certificate: { ...fields, code: trilogyCredential(chapter.id, fields) } })
}
