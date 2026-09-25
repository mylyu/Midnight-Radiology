import manifestData from './media-manifest.generated.json'
import imageCatalog from './image-assets.catalog.json'

export type AssetChapter = 'shell' | 'ch1' | 'ch2' | 'dr' | 'dsa'
export type ChapterId = AssetChapter
export type MediaEntry = { sha256: string; bytes: number; type: 'image' | 'audio' }
type Manifest = { version: number; assets: Record<string, MediaEntry>; chapters: Record<AssetChapter, string[]> }
export interface ChapterLoadProgress {
  chapter: AssetChapter
  status: 'loading' | 'validating' | 'ready' | 'error'
  loadedBytes: number
  totalBytes: number
  completed: number
  total: number
  failed: string[]
}

export const chapterMediaManifest = manifestData as Manifest
const images: Record<string, string> = imageCatalog
const ready = new Map<string, { hash: string; url: string }>()
const CACHE_NAME = 'midnight-radiology-media-v1'
const INACTIVITY_MS = 30_000
let imageValidationTail: Promise<void> = Promise.resolve()
let preparedAssetMode = false
const reportedMissing = new Set<string>()
export const MISSING_ASSET_EVENT = 'midnight-radiology:asset-missing'

/** The App listens for this recovery event and blocks interaction until the extra
 * resource is prepared. Legacy standalone preview pages retain normal URL access. */
export function enablePreparedAssetMode(): void { preparedAssetMode = true }

const aborted = () => new DOMException('Chapter loading cancelled', 'AbortError')
function checkAbort(signal?: AbortSignal) { if (signal?.aborted) throw aborted() }

/** Accept logical image IDs from saved views as well as canonical site-relative paths. */
export function canonicalAssetPath(value: string): string {
  const clean = value.replace(/^\.\//, '').split('?')[0]
  return images[clean] ? `assets/${images[clean]}` : clean
}

function versionedUrl(path: string): string {
  const entry = chapterMediaManifest.assets[path]
  return `${import.meta.env?.BASE_URL ?? './'}${path}${entry ? `?media=${entry.sha256}` : ''}`
}

/** All admitted chapter consumers use compressed session blobs, not new HTTP requests. */
export function assetUrl(value: string): string {
  if (value.startsWith('data:') || value.startsWith('blob:')) return value
  const path = canonicalAssetPath(value)
  const item = ready.get(path)
  if (item && item.hash === chapterMediaManifest.assets[path]?.sha256) return item.url
  if (preparedAssetMode) {
    if (!reportedMissing.has(path)) {
      reportedMissing.add(path)
      queueMicrotask(() => window.dispatchEvent(new CustomEvent(MISSING_ASSET_EVENT, { detail: { path } })))
    }
    return 'data:application/octet-stream,'
  }
  return versionedUrl(path)
}

export function chapterAssetPaths(chapter: AssetChapter, extras: string[] = []): string[] {
  return [...new Set([...chapterMediaManifest.chapters.shell,
    ...chapterMediaManifest.chapters[chapter], ...extras.filter(Boolean).map(canonicalAssetPath)])]
}

export function chapterAssetsReady(chapter: AssetChapter, extras: string[] = []): boolean {
  return chapterAssetPaths(chapter, extras).every(path => {
    const entry = chapterMediaManifest.assets[path]
    return !!entry && ready.get(path)?.hash === entry.sha256
  })
}

export function initialChapterProgress(chapter: AssetChapter, extras: string[] = []): ChapterLoadProgress {
  const paths = chapterAssetPaths(chapter, extras)
  const completed = paths.filter(path => !!chapterMediaManifest.assets[path]
    && ready.get(path)?.hash === chapterMediaManifest.assets[path].sha256)
  return { chapter, status: completed.length === paths.length ? 'ready' : 'loading',
    total: paths.length, completed: completed.length, failed: [],
    totalBytes: paths.reduce((sum, path) => sum + (chapterMediaManifest.assets[path]?.bytes ?? 0), 0),
    loadedBytes: completed.reduce((sum, path) => sum + chapterMediaManifest.assets[path].bytes, 0) }
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    checkAbort(signal)
    const onAbort = () => { clearTimeout(timer); reject(aborted()) }
    const timer = setTimeout(() => { signal?.removeEventListener('abort', onAbort); resolve() }, ms)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

async function verified(blob: Blob, entry: MediaEntry): Promise<boolean> {
  if (blob.size !== entry.bytes) return false
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
  const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
  return hash === entry.sha256
}

/** Decode only one validation image at a time. No chapter-sized decoded-image cache. */
function validateImage(blob: Blob, signal?: AbortSignal): Promise<void> {
  const task = imageValidationTail.catch(() => undefined).then(async () => {
    checkAbort(signal)
    const image = new Image()
    const url = URL.createObjectURL(blob)
    try {
      await new Promise<void>((resolve, reject) => {
        const finish = (error?: Error) => {
          clearTimeout(timer)
          signal?.removeEventListener('abort', onAbort)
          image.onload = null
          image.onerror = null
          if (error) reject(error)
          else resolve()
        }
        const onAbort = () => finish(aborted())
        const timer = setTimeout(() => finish(new Error('Image validation timed out')), INACTIVITY_MS)
        signal?.addEventListener('abort', onAbort, { once: true })
        image.onload = () => image.naturalWidth && image.naturalHeight
          ? finish() : finish(new Error('Empty image'))
        image.onerror = () => finish(new Error('Invalid image'))
        image.src = url
        if (signal?.aborted) onAbort()
      })
      checkAbort(signal)
    } finally {
      image.removeAttribute('src')
      URL.revokeObjectURL(url)
    }
  })
  imageValidationTail = task.catch(() => undefined)
  return task
}

/** Broken/disabled persistent storage cannot trap the loading screen. */
function optionalStorage<T>(task: Promise<T>, signal?: AbortSignal): Promise<T | undefined> {
  return new Promise(resolve => {
    const finish = (value?: T) => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      resolve(value)
    }
    const onAbort = () => finish()
    const timer = setTimeout(() => finish(), 5_000)
    signal?.addEventListener('abort', onAbort, { once: true })
    task.then(finish, () => finish())
    if (signal?.aborted) onAbort()
  })
}

async function openCache(signal?: AbortSignal): Promise<Cache | undefined> {
  try { return typeof caches === 'undefined' ? undefined : await optionalStorage(caches.open(CACHE_NAME), signal) }
  catch { return undefined } // Private browsing/quota must not prevent session-only loading.
}

function cacheKey(path: string): string {
  return new URL(versionedUrl(path), document.baseURI).href
}

async function fetchAsset(path: string, entry: MediaEntry, report: (bytes: number) => void, signal?: AbortSignal, retry = false): Promise<Blob> {
  const request = new AbortController()
  const onAbort = () => request.abort()
  signal?.addEventListener('abort', onAbort, { once: true })
  let timer: ReturnType<typeof setTimeout>
  const heartbeat = () => { clearTimeout(timer); timer = setTimeout(() => request.abort(), INACTIVITY_MS) }
  heartbeat()
  try {
    checkAbort(signal)
    const response = await fetch(versionedUrl(path), { signal: request.signal, cache: retry ? 'reload' : 'default' })
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${path}`)
    const chunks: Uint8Array<ArrayBuffer>[] = []
    let loaded = 0
    if (response.body) {
      const reader = response.body.getReader()
      try {
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          heartbeat()
          loaded += value.byteLength
          if (loaded > entry.bytes) throw new Error(`Unexpected asset size: ${path}`)
          chunks.push(new Uint8Array(value))
          report(loaded)
        }
      } finally { reader.releaseLock() }
    } else {
      const buffer = await response.arrayBuffer()
      chunks.push(new Uint8Array(buffer))
      report(buffer.byteLength)
    }
    const type = entry.type === 'audio' ? 'audio/mpeg' : path.endsWith('.png') ? 'image/png' : 'image/webp'
    return new Blob(chunks, { type })
  } catch (error) {
    request.abort()
    throw error
  } finally {
    clearTimeout(timer!)
    signal?.removeEventListener('abort', onAbort)
  }
}

export class ChapterAssetLoadError extends Error {
  readonly failed: string[]
  constructor(failed: string[]) {
    super(`Chapter resources unavailable: ${failed.join(', ')}`)
    this.name = 'ChapterAssetLoadError'
    this.failed = failed
  }
}

/** Downloads are bounded to four; a failed/cancelled run retains already validated assets. */
export async function prepareChapterAssets(chapter: AssetChapter, extras: string[],
  onProgress: (progress: ChapterLoadProgress) => void, signal?: AbortSignal): Promise<void> {
  checkAbort(signal)
  const paths = chapterAssetPaths(chapter, extras)
  // A recovery gate is now handling these paths. If it is cancelled, a later
  // visit must be able to request recovery again instead of staying deduplicated.
  for (const path of paths) reportedMissing.delete(path)
  const totalBytes = paths.reduce((sum, path) => sum + (chapterMediaManifest.assets[path]?.bytes ?? 0), 0)
  const transferred = new Map<string, number>()
  const completed = new Set<string>()
  const failed: string[] = []
  const emit = (status: ChapterLoadProgress['status'] = 'loading') => {
    if (signal?.aborted) return
    onProgress({ chapter, status, loadedBytes: [...transferred.values()].reduce((sum, value) => sum + value, 0),
      totalBytes, completed: completed.size, total: paths.length, failed: [...failed] })
  }
  for (const path of paths) {
    const entry = chapterMediaManifest.assets[path]
    if (entry && ready.get(path)?.hash === entry.sha256) { completed.add(path); transferred.set(path, entry.bytes) }
  }
  emit()
  const cache = await openCache(signal)
  checkAbort(signal)
  let cursor = 0
  const worker = async () => {
    while (cursor < paths.length) {
      checkAbort(signal)
      const path = paths[cursor++]
      if (completed.has(path)) continue
      const entry = chapterMediaManifest.assets[path]
      if (!entry) { failed.push(path); emit(); continue }
      let success = false
      for (let attempt = 0; attempt < 3 && !success; attempt++) {
        checkAbort(signal)
        try {
          let blob: Blob | undefined
          if (cache && attempt === 0) {
            try {
              const cached = await optionalStorage(cache.match(cacheKey(path)), signal)
              if (cached) {
                const candidate = await optionalStorage(cached.blob(), signal)
                if (candidate && await verified(candidate, entry)) blob = candidate
                else void cache.delete(cacheKey(path)).catch(() => undefined)
              }
            } catch { /* Fetch normally when persistent storage is unavailable. */ }
          }
          checkAbort(signal)
          if (!blob) {
            blob = await fetchAsset(path, entry, bytes => { transferred.set(path, Math.min(bytes, entry.bytes)); emit() }, signal, attempt > 0)
            if (!await verified(blob, entry)) throw new Error(`Asset integrity mismatch: ${path}`)
          }
          checkAbort(signal)
          transferred.set(path, entry.bytes)
          emit('validating')
          if (entry.type === 'image') await validateImage(blob, signal)
          checkAbort(signal)
          if (ready.get(path)?.hash !== entry.sha256) ready.set(path, { hash: entry.sha256, url: URL.createObjectURL(blob) })
          reportedMissing.delete(path)
          completed.add(path)
          success = true
          // Cache persistence is optional and never delays entry after session readiness.
          if (cache) void cache.put(cacheKey(path), new Response(blob)).catch(() => undefined)
          emit()
        } catch {
          checkAbort(signal)
          transferred.set(path, 0)
          if (attempt < 2) { emit(); await wait(400 * (attempt + 1), signal) }
        }
      }
      if (!success) { failed.push(path); emit() }
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, paths.length) }, worker))
  checkAbort(signal)
  if (failed.length) { emit('error'); throw new ChapterAssetLoadError(failed) }
  enablePreparedAssetMode()
  emit('ready')
}
