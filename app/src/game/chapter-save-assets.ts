import catalog from '../lib/image-assets.catalog.json'
import manifest from '../lib/media-manifest.generated.json'
import { CARDS, EVIDENCE } from './dlc'
import type { GameState } from './types'

/** Old snapshots and inherited collections can reference art outside the target chapter. */
export function chapterSaveAssets(state: GameState | null): string[] {
  if (!state) return []
  const found = new Set<string>()
  const images = catalog as Record<string, string>
  const visit = (value: unknown): void => {
    if (typeof value === 'string') {
      if (Object.hasOwn(images, value)) found.add(value)
    } else if (Array.isArray(value)) value.forEach(visit)
    else if (value && typeof value === 'object') Object.values(value).forEach(visit)
  }
  visit(state)
  for (const id of state.cards ?? []) visit(CARDS[id])
  // Generated metadata avoids importing the deferred chapter story bundle in the hall.
  const legacyCardImages = (manifest as { legacyCardImages?: Record<string, string> }).legacyCardImages
  for (const id of state.cards ?? []) visit(legacyCardImages?.[id])
  for (const evidence of Object.values(EVIDENCE)) if (state.flags[evidence.flag]) visit(evidence)
  return [...found].sort()
}
