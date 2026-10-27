import type { GameState } from './types'
import type { TrilogyChapter } from './trilogy-types'

/** Active definitions alone set completion targets; history never grants rewards. */
export function ownedTrilogyHistory(chapter: TrilogyChapter, state: Pick<GameState, 'cards' | 'badges'>) {
  return {
    cards: Object.entries(chapter.legacyCards ?? {}).filter(([id]) => !chapter.cards[id] && state.cards?.includes(id)),
    badges: Object.entries(chapter.legacyBadges ?? {}).filter(([id]) => !chapter.badges[id] && state.badges.includes(id)),
  }
}
