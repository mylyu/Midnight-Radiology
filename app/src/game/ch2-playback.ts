import type { GameState } from './types'
import { applyEffect } from './store'
import { patchCh2 } from './ch2-session'
import { recordCh2Change } from './ch2-ledger'
import { CH2_SCANS } from './ch2-scans'
import { getCh2Observation } from './ch2-observations'
import { ch2ObservationContinuation } from './ch2-observation-presentation'

export function startCh2Scan(s: GameState, id: string, now: number): GameState {
  if (!CH2_SCANS[id] || s.dlc?.ch2?.scanSessions?.[id]) return s
  return patchCh2(s, { scanSessions: { ...s.dlc?.ch2?.scanSessions, [id]: { startedAt: now } } })
}

export function completeCh2Scan(s: GameState, id: string): GameState {
  const saved = s.dlc?.ch2?.scanSessions?.[id]
  if (!saved || saved.completed) return s
  return patchCh2(s, { scanSessions: { ...s.dlc?.ch2?.scanSessions, [id]: { ...saved, completed: true } } })
}

export function answerCh2Observation(s: GameState, stepId: string, choiceId: string): GameState {
  const config = getCh2Observation(stepId, s)
  if (!config || s.dlc?.ch2?.observations?.[config.id]) return s
  const choice = config.choices.find(c => c.id === choiceId)
  if (!choice) return s
  const shift = s.dlc?.ch2?.shift ?? ''
  const rewarded = s.dlc?.ch2?.observationRewardShifts ?? []
  const reward = config.rewardEligible && choice.correct && !choice.hint && !rewarded.includes(shift)
  const after = patchCh2(reward ? applyEffect(s, { skill: 1 }) : s, {
    observations: { ...s.dlc?.ch2?.observations, [config.id]: { choiceId } },
    observationRewardShifts: reward ? [...rewarded, shift] : rewarded,
  })
  const caseNames: Record<string, string> = { fall: '坠床老人', stone: '腹痛结石', lung: '肺结节复查', trauma: '腰胯撞伤',
    stroke: '卒中急诊', chest: '冠脉CTA', mystery: '神秘病人', aorta: '主动脉检查', denture: '金属伪影', kid: '儿童复查' }
  return recordCh2Change(s, after, `observe:${config.id}`, `${config.kind === 'plan' ? '方案选择' : '影像观察'}：${caseNames[config.caseId] ?? config.caseId}${choice.hint ? '（请同事带看）' : ''}`, 'story')
}

export function acknowledgeCh2Observation(s: GameState, stepId: string): GameState {
  const config = getCh2Observation(stepId, s)
  const answer = config && s.dlc?.ch2?.observations?.[config.id]
  if (!config || !answer || answer.acknowledged) return s
  const continuation = s.dlc?.ch2?.stepId === stepId ? ch2ObservationContinuation(stepId) : undefined
  return patchCh2(s, {
    observations: { ...s.dlc?.ch2?.observations, [config.id]: { ...answer, acknowledged: true } },
    // Acknowledgement and its unique continuation are one save, so refreshing
    // cannot re-open the repeated coronary question or grant another reward.
    ...(continuation ? { stepId: continuation } : {}),
  })
}
