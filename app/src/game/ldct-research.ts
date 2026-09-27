/** Small serializable research interactions. No score, timers or clinical decisions. */
export type LdctResearchStage = 'roster' | 'blind' | 'report'
export const RESEARCH_CASES = ['control', 'faint', 'shifted'] as const
export type ResearchCase = typeof RESEARCH_CASES[number]
export type ResearchMethod = 'fbp' | 'iterative' | 'learned'
export type ResearchRole = 'me' | 'luzhou' | 'lei' | 'he'
export type ResearchTask = 'code' | 'versions' | 'reading'
export type ResearchObservation = 'detail' | 'similar' | 'uncertain'
export type ResearchClaim = 'limited' | 'delay' | 'cherry'
export interface LdctResearchDraft {
  version: 1
  stage: LdctResearchStage
  assignments: Record<ResearchTask, ResearchRole | ''>
  rest: boolean
  caseId: ResearchCase
  slice: number
  method: ResearchMethod
  divider: number
  seen: string[]
  marks: Partial<Record<ResearchCase, { x: number; y: number }>>
  observations: Partial<Record<ResearchCase, ResearchObservation>>
  revealed: boolean
  help: boolean
  included: ResearchCase[]
  claim: ResearchClaim
}
export const RESEARCH_TITLES: Record<LdctResearchStage, string> = {
  roster: '把这周的空当留出来', blind: '先别看算法名字', report: '只剩最后一页了',
}
export const RESEARCH_CASE_NAMES: Record<ResearchCase, string> = {
  control: '样本 01', faint: '样本 02', shifted: '样本 03',
}
export const RESEARCH_ROLES: Record<ResearchRole, string> = { me: '我自己', luzhou: '陆舟', lei: '小雷', he: '小何' }
export const RESEARCH_TASKS: Record<ResearchTask, string> = {
  code: '算法与复算', versions: '版本、来源与参数记录', reading: '独立看片、记下疑问',
}
export function createResearchDraft(stage: LdctResearchStage): LdctResearchDraft {
  return { version: 1, stage, assignments: { code: '', versions: '', reading: '' }, rest: false,
    caseId: 'control', slice: 1, method: 'learned', divider: 50, seen: [], marks: {}, observations: {},
    revealed: false, help: false, included: [], claim: 'limited' }
}
const inRange = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max
export function researchDraftValid(draft: LdctResearchDraft, stage: LdctResearchStage): boolean {
  return !!draft && draft.version === 1 && draft.stage === stage && ['roster','blind','report'].includes(stage)
    && !!draft.assignments && Object.keys(RESEARCH_TASKS).every(key => ['',...Object.keys(RESEARCH_ROLES)].includes(draft.assignments[key as ResearchTask]))
    && typeof draft.rest === 'boolean' && RESEARCH_CASES.includes(draft.caseId) && Number.isInteger(draft.slice) && inRange(draft.slice, 0, 2)
    && ['fbp','iterative','learned'].includes(draft.method) && inRange(draft.divider, 0, 100)
    && Array.isArray(draft.seen) && draft.seen.length <= 30 && draft.seen.every(id => /^(control|faint|shifted):[012]:(fbp|iterative|learned)$/.test(id))
    && !!draft.marks && Object.entries(draft.marks).every(([id, mark]) => RESEARCH_CASES.includes(id as ResearchCase) && mark && inRange(mark.x, 0, 100) && inRange(mark.y, 0, 100))
    && !!draft.observations && Object.entries(draft.observations).every(([id, note]) => RESEARCH_CASES.includes(id as ResearchCase) && ['detail','similar','uncertain'].includes(note!))
    && typeof draft.revealed === 'boolean' && typeof draft.help === 'boolean'
    && Array.isArray(draft.included) && new Set(draft.included).size === draft.included.length && draft.included.every(id => RESEARCH_CASES.includes(id))
    && ['limited','delay','cherry'].includes(draft.claim)
}
export function researchReady(draft: LdctResearchDraft): boolean {
  if (!researchDraftValid(draft, draft.stage)) return false
  if (draft.stage === 'roster') return Object.values(draft.assignments).every(Boolean)
  if (draft.stage === 'blind') return RESEARCH_CASES.every(id => Boolean(draft.observations[id])) && draft.revealed
  return draft.included.length > 0
}
export const researchPart = (nodeId: string): 1 | 2 | 3 | 4 => nodeId.startsWith('r4_') ? 4 : nodeId.startsWith('r3_') ? 3 : nodeId.startsWith('r2_') ? 2 : 1
export const researchRecordNote = (record: LdctResearchDraft) => record.stage === 'roster'
  ? `${Object.entries(record.assignments).map(([task, person]) => `${RESEARCH_TASKS[task as ResearchTask]}：${RESEARCH_ROLES[person as ResearchRole]}`).join('；')}。${record.rest ? '留了休息时间。' : '空当排得很满。'}`
  : record.stage === 'blind' ? `保留${Object.keys(record.observations).length}组观察、${Object.keys(record.marks).length}处圈选；${record.help ? '一起核对' : '先独立观察'}。方法与已知模体已揭示。`
    : `附上${record.included.map(id => RESEARCH_CASE_NAMES[id]).join('、')}；${({limited:'结论限定在这组模体',delay:'申请延期补验证',cherry:'按挑选样例提出扩大结论'})[record.claim]}。`
