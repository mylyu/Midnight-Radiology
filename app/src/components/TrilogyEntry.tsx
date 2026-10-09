import type { ReactNode } from 'react'
import type { GameState } from '../game/types'
import type { TrilogyId } from '../game/trilogy-types'
import { getTrilogy } from '../game/trilogy-registry'
import { TrilogyScreen } from './TrilogyScreen'

export default function TrilogyEntry({ id, ...props }: { id: TrilogyId; state: GameState;
  update: (fn: (s: GameState) => GameState) => void; onExit: () => void; renderText: (text: string, shown?: number) => ReactNode }) {
  return <TrilogyScreen key={`${id}:${props.state.dlc?.[id]?.chapter?.runId}`} chapter={getTrilogy(id)} {...props} />
}
