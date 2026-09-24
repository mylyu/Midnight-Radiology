/** Deterministic delivery copies only. Source PNGs are never edited. */
import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceDir = path.join(root, 'public/assets')
const outputDir = path.join(sourceDir, 'optimized')
const manifestPath = path.join(root, 'src/lib/image-assets.generated.json')
const reportPath = path.join(root, 'image-delivery-report.json')
const pipeline = 'delivery-v2-background-q85-effort6'
// These images encode numerical gray values for the window/level canvas, not just artwork.
const rawImages = new Set(['ct_head_hema', 'ct_lung', 'ct_wrist_simulated'])
const isBackground = name => name.startsWith('bg_') || name.startsWith('ch2_dawn_window') || name === 'ch2_ct_motion_room_v1'
const sha = buffer => createHash('sha256').update(buffer).digest('hex')
async function readJson(file) {
  try {
    const parsed = JSON.parse(await readFile(file, 'utf8'))
    return parsed && typeof parsed === 'object' && Array.isArray(parsed.images) ? parsed : {}
  } catch { return {} } // Missing/interrupted generated caches are disposable, not build dependencies.
}
const previous = await readJson(reportPath)
const manifest = {}, images = []
await mkdir(outputDir, { recursive: true })
await mkdir(path.dirname(manifestPath), { recursive: true })

for (const file of (await readdir(sourceDir)).filter(file => file.endsWith('.png')).sort()) {
  const name = file.slice(0, -4), original = await readFile(path.join(sourceDir, file)), sourceHash = sha(original)
  if (rawImages.has(name)) {
    images.push({ name, sourceHash, originalBytes: original.length, deliveredBytes: original.length, status: 'numerical-gray-unchanged' })
    continue
  }
  const token = sha(Buffer.from(`${sourceHash}:${pipeline}:${sharp.versions.sharp}:${sharp.versions.webp}`)).slice(0, 16)
  let relative = `optimized/${name}.${token}.webp`, destination = path.join(sourceDir, relative)
  const prior = previous.pipeline === pipeline && previous.encoder === sharp.versions.sharp && previous.webp === sharp.versions.webp
    ? previous.images?.find(row => row.name === name && row.sourceHash === sourceHash) : undefined
  if (prior?.status === 'original-smaller' || prior?.status === 'original-pixels-preserved') { images.push(prior); continue }
  const cached = prior?.path?.startsWith(`optimized/${name}.${token}.`) ? prior : undefined
  if (cached) { relative = cached.path; destination = path.join(sourceDir, relative) }
  const existing = cached && await readFile(destination).catch(() => null)
  if (cached && existing && sha(existing) === cached.deliveryHash) {
    manifest[name] = relative; images.push(cached); continue
  }
  const background = isBackground(name)
  let encoded = await sharp(original).keepIccProfile().webp(background ? { quality: 85, effort: 6 } : { lossless: true, effort: 5 }).toBuffer()
  const [input, output] = await Promise.all([
    sharp(original).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(encoded).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ])
  let pixelExact = input.info.width === output.info.width && input.info.height === output.info.height && input.data.equals(output.data)
  let meanAbsoluteRgbError
  if (background) {
    let error = 0
    for (let i = 0; i < input.data.length; i += 4) for (let channel = 0; channel < 3; channel++) error += Math.abs(input.data[i + channel] - output.data[i + channel])
    meanAbsoluteRgbError = Number((error / (input.info.width * input.info.height * 3)).toFixed(3))
  } else if (!pixelExact) {
    // WebP may discard RGB beneath fully transparent pixels. Preserve those too using an optimized PNG instead.
    encoded = await sharp(original).keepIccProfile().png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer()
    const losslessPng = await sharp(encoded).ensureAlpha().raw().toBuffer()
    pixelExact = input.data.equals(losslessPng)
    relative = `optimized/${name}.${token}.png`; destination = path.join(sourceDir, relative)
  }
  if ((pixelExact || background) && encoded.length < original.length) {
    await writeFile(destination, encoded)
    manifest[name] = relative
    images.push({ name, path: relative, sourceHash, deliveryHash: sha(encoded), originalBytes: original.length,
      deliveredBytes: encoded.length, width: input.info.width, height: input.info.height, pixelExact, meanAbsoluteRgbError,
      status: background ? 'background-webp-q85' : relative.endsWith('.png') ? 'lossless-png' : 'lossless-webp' })
  } else {
    images.push({ name, sourceHash, originalBytes: original.length, deliveredBytes: original.length,
      pixelExact, status: pixelExact ? 'original-smaller' : 'original-pixels-preserved' })
  }
}
const originalBytes = images.reduce((sum, image) => sum + image.originalBytes, 0)
const deliveredBytes = images.reduce((sum, image) => sum + image.deliveredBytes, 0)
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
await writeFile(reportPath, `${JSON.stringify({ pipeline, encoder: sharp.versions.sharp, webp: sharp.versions.webp,
  count: images.length, optimized: Object.keys(manifest).length, originalBytes, deliveredBytes, images }, null, 2)}\n`)
console.log(`Image delivery: ${Object.keys(manifest).length}/${images.length} optimized (${images.filter(image => image.status === 'background-webp-q85').length} background WebP q85, others exact-pixel); ${(originalBytes / 1048576).toFixed(1)} → ${(deliveredBytes / 1048576).toFixed(1)} MiB (${(100 * (1 - deliveredBytes / originalBytes)).toFixed(1)}% smaller); original PNGs unchanged.`)
