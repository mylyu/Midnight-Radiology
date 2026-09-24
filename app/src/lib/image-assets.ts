import optimized from './image-assets.generated.json'

const assets: Record<string, string> = optimized
/** Only delivery encoding changes. Unknown or numerical-gray assets retain their original PNG. */
export const imageAsset = (name: string) => `${import.meta.env.BASE_URL}assets/${assets[name] ?? `${name}.png`}`
export const originalImageAsset = (name: string) => `${import.meta.env.BASE_URL}assets/${name}.png`
