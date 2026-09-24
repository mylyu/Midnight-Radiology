/** Import reviewed artwork without rewriting historical media certification. */
import { createHash, randomUUID } from 'node:crypto'
import { readFile, writeFile, mkdir, open, realpath, stat, rename, unlink } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repo = path.dirname(app)
const assets = path.join(app, 'public/assets')
const catalogFile = path.join(app, 'src/lib/image-assets.catalog.json')
const previewsFile = path.join(app, 'src/lib/image-previews.catalog.json')
const lockedRaw = new Set(['ct_head_hema', 'ct_lung', 'ct_wrist_simulated'])
const MAX_BYTES = 600 * 1024
const sha = value => createHash('sha256').update(value).digest('hex')
const sortedJson = object => JSON.stringify(Object.fromEntries(Object.entries(object).sort(([a], [b]) => a.localeCompare(b))), null, 2) + '\n'
const inside = (parent, child) => {
  const relative = path.relative(parent, child)
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))
}
const message = `用法（在 app/ 下）：
  node scripts/import-image.mjs <仓库外原图绝对路径> <逻辑ID> [--replace] [--lossless]

默认 WebP q78 → 72 → 66 → 60，alphaQuality=100，effort=6，原尺寸，最大600 KiB。
已有逻辑ID必须 --replace；小字证物可加 --lossless（超限拒绝，不偷偷降为有损）。
仅更新图片catalog及适用的背景预览catalog；不改剧情、历史manifest或原图。
三个调窗数值图拒绝导入。旧压缩文件不会自动删除。
详见 ../docs/media-import.md。`

function argumentsFor(argv) {
  if (argv.length === 1 && ['--help', '-h'].includes(argv[0])) return { help: true }
  const flags = argv.filter(arg => arg.startsWith('--'))
  if (flags.some(flag => !['--replace', '--lossless'].includes(flag)) || new Set(flags).size !== flags.length) throw new Error(message)
  const positional = argv.filter(arg => !arg.startsWith('--'))
  if (positional.length !== 2) throw new Error(message)
  const [source, name] = positional
  if (!path.isAbsolute(source)) throw new Error('原图必须使用仓库外的绝对路径。')
  if (!/^[a-z][a-z0-9_]{0,95}$/.test(name) || ['constructor', 'prototype'].includes(name)) throw new Error('逻辑ID只允许小写字母开头、字母/数字/下划线，最长96字符。')
  if (lockedRaw.has(name)) throw new Error(`${name} 是调窗数值源，禁止通过此工具覆盖；--lossless 也不例外。`)
  return { source, name, replace: flags.includes('--replace'), lossless: flags.includes('--lossless') }
}

function readDictionary(bytes, label, validateValue) {
  const data = JSON.parse(bytes.toString('utf8'))
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(`${label} 必须是逻辑ID到字符串的对象。`)
  for (const [key, value] of Object.entries(data)) if (typeof value !== 'string' || !validateValue(value)) throw new Error(`${label} 包含无效条目：${key}`)
  return data
}
function assetPath(relative) {
  if (relative.includes('\\') || relative.includes(':') || path.posix.isAbsolute(relative) || relative.split('/').some(part => !part || part === '..' || part === '.')) throw new Error(`不安全的catalog路径：${relative}`)
  const absolute = path.resolve(assets, relative)
  if (!inside(assets, absolute)) throw new Error(`catalog路径越界：${relative}`)
  return absolute
}
async function sameFile(file, expected) {
  if (!(await readFile(file)).equals(expected)) throw new Error(`导入期间文件被其他任务修改，已停止：${file}`)
}
async function decode(data) {
  // Compare normalized, decoded pixels; never rescale or rotate the full-size image.
  return sharp(data).toColourspace('srgb').ensureAlpha().raw({ depth: 'uchar' }).toBuffer({ resolveWithObject: true })
}
function comparePixels(input, result) {
  if (input.info.width !== result.info.width || input.info.height !== result.info.height || input.info.channels !== 4 || result.info.channels !== 4 || input.data.length !== result.data.length) throw new Error('导出尺寸或通道数改变，已拒绝。')
  let alphaExact = true, visibleRgbExact = true, error = 0, channels = 0
  for (let i = 0; i < input.data.length; i += 4) {
    if (input.data[i + 3] !== result.data[i + 3]) alphaExact = false
    if (input.data[i + 3] !== 0) for (let c = 0; c < 3; c++) {
      const delta = Math.abs(input.data[i + c] - result.data[i + c])
      if (delta) visibleRgbExact = false
      error += delta; channels++
    }
  }
  if (!alphaExact) throw new Error('透明通道不一致，已拒绝；不会用降低透明度质量换体积。')
  return { alphaExact, visibleRgbExact, rgbaExact: input.data.equals(result.data),
    visibleRgbMeanAbsoluteError: Number((error / Math.max(1, channels)).toFixed(4)) }
}

async function importImage(options) {
  const { name, replace, lossless } = options
  const source = await realpath(options.source)
  if (inside(await realpath(repo), source)) throw new Error('请保留仓库外原图并从外部导入；不接受仓库内路径或指向仓库的链接。')
  if (!(await stat(source)).isFile()) throw new Error('原图路径不是普通文件。')
  const lockFile = path.join(app, 'src/lib/.image-import.lock')
  let lock
  try { lock = await open(lockFile, 'wx') } catch (error) {
    if (error.code === 'EEXIST') throw new Error('另一个图片导入可能仍在执行；请先确认该任务状态，不要同时修改catalog。')
    throw error
  }
  const temporary = new Set()
  let changedPreview = false, previewBefore, previewText
  async function stage(file, contents) {
    const temp = `${file}.${randomUUID()}.tmp`
    temporary.add(temp)
    await writeFile(temp, contents, { flag: 'wx' })
    return temp
  }
  try {
    await lock.writeFile(JSON.stringify({ pid: process.pid, name, startedAt: new Date().toISOString() }) + '\n')
    const catalogBefore = await readFile(catalogFile)
    previewBefore = await readFile(previewsFile)
    const catalog = readDictionary(catalogBefore, '图片catalog', value => {
      assetPath(value)
      return /\.(webp|png|jpe?g)$/.test(value)
    })
    const previews = readDictionary(previewBefore, '预览catalog', value => /^data:image\/webp;base64,[A-Za-z0-9+/]+=*$/.test(value))
    const oldPath = Object.hasOwn(catalog, name) ? catalog[name] : null
    if (oldPath && !replace) throw new Error(`${name} 已存在；确认要替换同一角色/场景后，显式加 --replace。`)
    if (!oldPath && replace) throw new Error(`${name} 不存在；请核对逻辑ID，新增时不需要 --replace。`)

    const original = await readFile(source)
    const metadata = await sharp(original).metadata()
    if (!['png', 'jpeg', 'webp', 'tiff', 'gif', 'avif'].includes(metadata.format) || !metadata.width || !metadata.height) throw new Error('只接受可解码的静态栅格图片。')
    if ((metadata.pages ?? 1) !== 1) throw new Error('不接受动画或多页图片，以免静默丢掉其他帧。')
    if (metadata.orientation && metadata.orientation !== 1) throw new Error('原图含非标准EXIF方向；请先在仓库外明确转正并导出，工具不会偷偷旋转或交换尺寸。')
    if (oldPath && ['ch2_ct_motion_bed_v1', 'ch2_ct_motion_room_v1'].includes(name)) {
      const previous = await sharp(await readFile(assetPath(oldPath))).metadata()
      if (metadata.width !== previous.width || metadata.height !== previous.height) throw new Error('CT运动层依赖固定机架坐标；替换图必须维持旧文件的画布尺寸。')
    }
    let encoded, quality = null
    if (lossless) encoded = await sharp(original).keepIccProfile().webp({ lossless: true, alphaQuality: 100, effort: 6 }).toBuffer()
    else for (const q of [78, 72, 66, 60]) {
      encoded = await sharp(original).keepIccProfile().webp({ quality: q, alphaQuality: 100, effort: 6 }).toBuffer()
      quality = q
      if (encoded.length <= MAX_BYTES) break
    }
    if (encoded.length > MAX_BYTES) throw new Error(`导出仍为${encoded.length}字节，超过600 KiB；未写入素材或catalog。${lossless ? '无损模式不会自动改为有损。' : '请在仓库外审阅原图后另行处理，不会自动缩小画布。'}`)
    const pixels = comparePixels(await decode(original), await decode(encoded))
    if (lossless && !pixels.visibleRgbExact) throw new Error('无损导出改变了可见RGB值，已拒绝。')
    const deliveryHash = sha(encoded)
    const relative = `media/${name}.${deliveryHash.slice(0, 16)}.webp`
    const destination = assetPath(relative)
    const needsPreview = name.includes('bg_') || name.includes('ch2_dawn_window') || Object.hasOwn(previews, name)
    const updatedPreviews = { ...previews }
    if (needsPreview) {
      const tiny = await sharp(encoded).resize({ width: 48, withoutEnlargement: true })
        .webp({ quality: 20, alphaQuality: 100, effort: 6 }).toBuffer()
      updatedPreviews[name] = `data:image/webp;base64,${tiny.toString('base64')}`
    }
    const updatedCatalog = { ...catalog, [name]: relative }
    const catalogText = sortedJson(updatedCatalog)
    previewText = sortedJson(updatedPreviews)
    await sameFile(catalogFile, catalogBefore); await sameFile(previewsFile, previewBefore)
    await mkdir(path.dirname(destination), { recursive: true })
    if (!inside(await realpath(assets), await realpath(path.dirname(destination)))) throw new Error('media目录链接越界，拒绝写入。')
    try { await writeFile(destination, encoded, { flag: 'wx' }) } catch (error) {
      if (error.code !== 'EEXIST') throw error
      if (!(await readFile(destination)).equals(encoded)) throw new Error('哈希文件名已存在但内容不同，拒绝覆盖。')
    }
    const catalogTemp = await stage(catalogFile, catalogText)
    const previewTemp = needsPreview ? await stage(previewsFile, previewText) : null
    await sameFile(catalogFile, catalogBefore); await sameFile(previewsFile, previewBefore)
    // Publish the image catalog last. Each file replacement is atomic; a concurrent
    // editor is rejected, not overwritten. Old immutable artwork is always retained.
    if (previewTemp) { await rename(previewTemp, previewsFile); temporary.delete(previewTemp); changedPreview = true }
    try {
      await sameFile(catalogFile, catalogBefore)
      await rename(catalogTemp, catalogFile); temporary.delete(catalogTemp)
    } catch (error) {
      if (changedPreview) {
        try {
          await sameFile(previewsFile, Buffer.from(previewText))
          const rollback = await stage(previewsFile, previewBefore)
          await rename(rollback, previewsFile); temporary.delete(rollback)
        } catch (rollbackError) { console.error('预览回滚未完成，请人工核对catalog：', rollbackError.message) }
      }
      throw error
    }
    const oldPathStillReferenced = oldPath && Object.values(updatedCatalog).includes(oldPath)
    console.log(JSON.stringify({ name, replaced: !!oldPath, sourcePath: source, sourceSha256: sha(original), sourceBytes: original.length,
      pipeline: lossless ? 'manual-import-lossless-webp-v1' : 'manual-import-webp-q78-alpha100-v1',
      encoder: { sharp: sharp.versions.sharp, webp: sharp.versions.webp }, mode: lossless ? 'lossless-webp' : 'lossy-webp', quality,
      width: metadata.width, height: metadata.height, ...pixels,
      deliveryPath: `app/public/assets/${relative}`, deliverySha256: deliveryHash, deliveryBytes: encoded.length,
      previewUpdated: needsPreview, previousDeliveryPath: oldPath,
      stalePathCandidates: oldPath && oldPath !== relative && !oldPathStillReferenced ? [`app/public/assets/${oldPath}`] : [],
      notice: '原图和旧压缩文件均未删除；历史认证manifest未修改。请人工记录来源/许可/参数并复核后运行 npm run build 和相关测试。',
    }, null, 2))
  } finally {
    for (const temp of temporary) await unlink(temp).catch(() => undefined)
    await lock.close()
    await unlink(lockFile).catch(() => undefined)
  }
}

try {
  const options = argumentsFor(process.argv.slice(2))
  if (options.help) console.log(message)
  else await importImage(options)
} catch (error) {
  console.error(`图片导入失败：${error.message}`)
  process.exitCode = 1
}
