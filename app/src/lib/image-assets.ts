import catalog from './image-assets.catalog.json'
import previews from './image-previews.catalog.json'

const assets: Record<string, string> = catalog
const tinyPreviews: Record<string, string> = previews
/** Stable logical IDs also resolve sprites/backgrounds stored by older saves. */
export const imageAsset = (name: string) => `${import.meta.env.BASE_URL}assets/${assets[name] ?? `${name}.png`}`
/** Compatibility alias: never download a second, full-size original on a slow connection. */
export const originalImageAsset = imageAsset
export const imagePreview = (name: string): string | undefined => tinyPreviews[name]
