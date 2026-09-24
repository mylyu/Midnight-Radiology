/** Explicit one-time migration. Writes verified delivery files; never deletes originals. */
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import sharp from 'sharp'

if (!process.argv.includes('--write-reviewed-policy')) throw new Error('Review policy and source inventory, then pass --write-reviewed-policy')
const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), repo = path.dirname(app)
const baseline = execFileSync('git', ['rev-parse', 'c4215b0'], { cwd: repo, encoding: 'utf8' }).trim()
const dir = path.join(app, 'public/assets'), target = path.join(dir, 'media')
const sha = data => createHash('sha256').update(data).digest('hex')
const blob = data => createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex')
const raw = new Set(['ct_head_hema', 'ct_lung', 'ct_wrist_simulated'])
const lossless = new Set(['ch2_needle_record_v1'])
const images = [], catalog = {}, previews = {}
await mkdir(target, { recursive: true })
sharp.cache({ memory: 32, files: 0, items: 16 })
sharp.concurrency(2)
const queue = (await readdir(dir)).filter(file => file.endsWith('.png')).sort()
if (queue.length !== 197) throw new Error(`Expected reviewed 197 source PNGs, got ${queue.length}`)
async function worker() {
  while (queue.length) {
    const file = queue.shift(), name = file.slice(0, -4), sourcePath = `app/public/assets/${file}`
    const source = await readFile(path.join(dir, file)), original = await sharp(source).metadata()
    const sourceGitBlob = execFileSync('git', ['rev-parse', `${baseline}:${sourcePath}`], { cwd: repo, encoding: 'utf8' }).trim()
    if (blob(source) !== sourceGitBlob) throw new Error(`Uncommitted or changed source: ${sourcePath}`)
    let data = source, relative = file, mode = 'raw-png', quality = null
    if (!raw.has(name)) {
      if (lossless.has(name)) {
        data = await sharp(source).keepIccProfile().webp({ lossless: true, effort: 6 }).toBuffer()
        mode = 'lossless-webp'
      } else {
        for (const q of [78, 72, 66, 60]) {
          data = await sharp(source).keepIccProfile().webp({ quality: q, alphaQuality: 100, effort: 6 }).toBuffer()
          quality = q
          if (data.length <= 600 * 1024 && data.length < source.length) break
        }
        mode = 'lossy-webp'
      }
      if (data.length > 600 * 1024 || data.length > source.length) throw new Error(`Over budget: ${name}`)
      relative = `media/${name}.${sha(data).slice(0, 16)}.webp`
    }
    const result = await sharp(data).metadata()
    if (result.width !== original.width || result.height !== original.height) throw new Error(`Geometry changed: ${name}`)
    const a = await sharp(source).ensureAlpha().raw().toBuffer(), b = await sharp(data).ensureAlpha().raw().toBuffer()
    if (a.length !== b.length) throw new Error(`Channels changed: ${name}`)
    let alphaExact = true, error = 0, visible = 0
    for (let i = 0; i < a.length; i += 4) {
      if (a[i + 3] !== b[i + 3]) alphaExact = false
      if (a[i + 3]) { for (let c = 0; c < 3; c++) error += Math.abs(a[i + c] - b[i + c]); visible += 3 }
    }
    if (!alphaExact) throw new Error(`Alpha changed: ${name}`)
    const rgbaExact = a.equals(b)
    if (raw.has(name) && (!rgbaExact || !data.equals(source))) throw new Error(`Numerical source changed: ${name}`)
    if (!raw.has(name)) await writeFile(path.join(dir, relative), data)
    catalog[name] = relative
    if (name.startsWith('bg_')) {
      const preview = await sharp(data).resize({ width: 48, withoutEnlargement: true }).webp({ quality: 20, effort: 6 }).toBuffer()
      previews[name] = `data:image/webp;base64,${preview.toString('base64')}`
    }
    images.push({ name, sourcePath, sourceSha256: sha(source), sourceGitBlob, sourceBytes: source.length,
      deliveryPath: `app/public/assets/${relative}`, deliverySha256: sha(data), deliveryBytes: data.length,
      width: result.width, height: result.height, hasAlpha: !!result.hasAlpha, alphaExact, rgbaExact,
      visibleRgbMeanAbsoluteError: Number((error / Math.max(1, visible)).toFixed(4)), mode, quality })
    console.log(`${name}: ${source.length} -> ${data.length} (${mode}; alpha exact)`)
  }
}
await Promise.all([worker(), worker(), worker()])
images.sort((a, b) => a.name.localeCompare(b.name))
const sorted = object => Object.fromEntries(Object.entries(object).sort(([a], [b]) => a.localeCompare(b)))
const stats = { imageCount: images.length, sourceImageBytes: images.reduce((s, x) => s + x.sourceBytes, 0),
  deliveredImageBytes: images.reduce((s, x) => s + x.deliveryBytes, 0),
  inlinePreviewBytes: Object.values(previews).reduce((s, x) => s + Buffer.from(x.split(',')[1], 'base64').length, 0) }
if (stats.deliveredImageBytes > 30 * 1024 * 1024) throw new Error('Image set exceeds reviewed 30 MiB budget')
await writeFile(path.join(app, 'src/lib/image-assets.catalog.json'), JSON.stringify(sorted(catalog), null, 2) + '\n')
await writeFile(path.join(app, 'src/lib/image-previews.catalog.json'), JSON.stringify(sorted(previews), null, 2) + '\n')
await writeFile(path.join(repo, 'docs/game-delivery-assets.json'), JSON.stringify({ baseline, pipeline: 'canonical-webp-q78-alpha100-v1',
  encoder: { sharp: sharp.versions.sharp, webp: sharp.versions.webp }, images, removed: [], stats }, null, 2) + '\n')
console.log(JSON.stringify(stats))
