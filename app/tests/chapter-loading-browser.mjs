// Production bundle, real Edge, disposable profiles. Real media responses are
// retained; only the explicitly named failure/storage faults are injected.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { freshState } from '../src/game/store.ts'
import { chapterSaveAssets } from '../src/game/chapter-save-assets.ts'

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const manifest = JSON.parse(readFileSync(new URL('../src/lib/media-manifest.generated.json', import.meta.url), 'utf8'))
const catalog = JSON.parse(readFileSync(new URL('../src/lib/image-assets.catalog.json', import.meta.url), 'utf8'))
const baseUrl = (process.env.GAME_URL || 'http://127.0.0.1:8798/').replace(/\/$/, '') + '/'
const output = resolve(process.env.CHAPTER_LOADING_OUTPUT || '../../chapter-preload-review')
const saveKey = 'midnight-radiology-save-v1'
const cacheName = 'midnight-radiology-media-v1'
const today = new Date().toISOString().slice(0, 10)
const results = [], errors = []
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const mediaPath = url => {
  const pathname = new URL(url).pathname
  const index = Math.max(pathname.indexOf('/assets/'), pathname.indexOf('/audio/'))
  return index < 0 ? undefined : pathname.slice(index + 1)
}
const canonical = value => catalog[value] ? `assets/${catalog[value]}` : value
const expectedPaths = (chapter, save) => [...new Set([...manifest.chapters.shell, ...manifest.chapters[chapter], ...chapterSaveAssets(save).map(canonical)])]
const snapshot = page => page.evaluate(key => localStorage.getItem(key), saveKey)
const loader = page => page.locator('[data-chapter-loader]')
const ready = async page => {
  await page.waitForFunction(() => ['ready', 'error'].includes(document.querySelector('[data-chapter-loader]')?.getAttribute('data-status')), undefined, { timeout: 120000 })
  assert.equal(await loader(page).getAttribute('data-status'), 'ready', await loader(page).textContent())
  assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'), '100')
}
const start = async page => {
  await page.locator('[data-chapter-enter]').click()
  await loader(page).waitFor({ state: 'detached' })
}
function fixture(chapter = 'ch2', gender = 'm') {
  const save = { ...freshState(gender), seed: 12345, gold: 555, skill: 12, heart: 8, wealth: 3,
    ap: 3, items: ['milktea', 'snack'], buyCount: 1, lastCheckin: today, cards: [], events: [],
    night: 1, screenHint: 'night', stepId: 'n1_hub', resumeKey: '1-n1_hub', viewBg: 'bg_control' }
  if (chapter === 'ch2') Object.assign(save, { finished: true, night: 5, screenHint: 'chapterEnd',
    dlc: { ch2: { shift: 'c2n1', phase: 'story', stepId: 'c2n1_4', viewBg: 'bg_ctcontrol_ready',
      viewSprite: 'ch2_pixel_char_zhou', appliedSteps: ['ch2-c2n1_4'] } } })
  return save
}
async function open(chapter, save = fixture(chapter), options = {}) {
  const context = await browser.newContext({ viewport: options.mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
    hasTouch: !!options.mobile, isMobile: !!options.mobile })
  await context.addInitScript(({ key, save, denyStorage }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(save))
    localStorage.setItem('mr-ch2-unlock', '1')
    sessionStorage.setItem('mr-rotate-dismissed', '1')
    window.__preloadWrites = []
    window.__preloadAudio = []
    window.__preloadUrls = []
    window.__preloadProgress = []
    const write = Storage.prototype.setItem
    Storage.prototype.setItem = function (name, value) {
      if (name === key) window.__preloadWrites.push(JSON.parse(value))
      return write.call(this, name, value)
    }
    HTMLMediaElement.prototype.play = function () {
      window.__preloadAudio.push(this.currentSrc || this.src)
      return Promise.reject(new DOMException('Browser test: autoplay denied', 'NotAllowedError'))
    }
    const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL)
    URL.createObjectURL = blob => {
      const url = create(blob)
      window.__preloadUrls.push({ url, blob, revoked: false })
      return url
    }
    URL.revokeObjectURL = url => {
      const found = window.__preloadUrls.find(item => item.url === url)
      if (found) found.revoked = true
      revoke(url)
    }
    if (denyStorage) Object.defineProperty(caches, 'open', { value: () => Promise.reject(new DOMException('Storage denied fixture', 'SecurityError')) })
    const observe = () => {
      const node = document.querySelector('[data-chapter-loader]')
      if (node) window.__preloadProgress.push({ status: node.dataset.status,
        percent: Number(node.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow') || 0), at: performance.now() })
      requestAnimationFrame(observe)
    }
    requestAnimationFrame(observe)
  }, { key: saveKey, save, denyStorage: !!options.denyStorage })
  const requests = [], active = new Set(), attempts = new Map()
  let maxActive = 0
  const blocked = new Set(options.blocked ?? [])
  await context.route('**/*', async route => {
    const path = mediaPath(route.request().url())
    if (path && manifest.assets[path]) {
      attempts.set(path, (attempts.get(path) ?? 0) + 1)
      if (blocked.has(path)) { await route.abort('failed'); return }
      if (options.delay) await new Promise(resolve => setTimeout(resolve, options.delay))
    }
    await route.continue()
  })
  const page = await context.newPage()
  page.setDefaultTimeout(15000)
  page.on('pageerror', error => errors.push(error.message))
  page.on('request', request => {
    const path = mediaPath(request.url())
    if (path && manifest.assets[path]) { requests.push(path); active.add(request); maxActive = Math.max(maxActive, active.size) }
  })
  for (const event of ['requestfinished', 'requestfailed']) page.on(event, request => active.delete(request))
  const hash = options.titleOnly || chapter === 'ch1' ? '' : chapter === 'ch2' ? '#/ch2' : `#/dlc/${chapter}`
  await page.goto(`${baseUrl}${hash}`, { waitUntil: 'domcontentloaded' })
  if (chapter === 'ch1' && !options.titleOnly) {
    await page.getByRole('button', { name: '▶ 继续夜班（自动存档）', exact: true }).click()
  }
  if (options.titleOnly) await page.getByRole('button', { name: '↺ 重新开始', exact: true }).waitFor()
  else await loader(page).waitFor()
  return { context, page, save, requests, attempts, blocked, maxActive: () => maxActive }
}
async function assertUnchanged(page, save) {
  assert.equal(await snapshot(page), JSON.stringify(save), 'Loading/admission mutated the save')
  assert.equal(await page.locator('[data-ch1-step],[data-ch2-step],.dialog-box,[data-ch2-settlement]').count(), 0, 'Story mounted before admission')
  assert.equal(await page.evaluate(() => window.__preloadWrites.length), 0, 'Loading wrote game state')
}
async function assertProgress(page) {
  const entries = await page.evaluate(() => window.__preloadProgress)
  assert(entries.length)
  assert(entries.every(entry => entry.percent >= 0 && entry.percent <= 100))
  assert(entries.filter(entry => entry.status !== 'ready').every(entry => entry.percent < 100), 'False 100% before validation')
}
async function auditPreparedOffline(session, chapter) {
  const expected = expectedPaths(chapter, session.save)
  const beforeRequests = session.requests.length
  await session.context.setOffline(true)
  const details = await session.page.evaluate(async ({ assets, expected }) => {
    const admitted = window.__preloadUrls.filter(item => !item.revoked)
    const hashes = {}, decoded = { image: 0, audio: 0 }
    for (const { url, blob } of admitted) {
      const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
      const hash = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
      const path = expected.find(path => assets[path]?.sha256 === hash)
      if (!path) throw new Error(`Unregistered session blob ${hash}`)
      hashes[path] = hash
      if (assets[path].type === 'image') {
        const image = new Image()
        image.src = url
        await image.decode()
        if (!image.naturalWidth || !image.naturalHeight) throw new Error(`Empty ${path}`)
        decoded.image++
        image.removeAttribute('src')
      } else {
        const audio = new Audio()
        audio.preload = 'metadata'
        await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error(`Audio metadata timeout ${path}`)), 10000)
          audio.onloadedmetadata = () => { clearTimeout(timer); Number.isFinite(audio.duration) && audio.duration > 0 ? resolve() : reject(new Error(`Invalid duration ${path}`)) }
          audio.onerror = () => { clearTimeout(timer); reject(new Error(`Audio decode failed ${path}`)) }
          audio.src = url
        })
        decoded.audio++
        audio.removeAttribute('src'); audio.load()
      }
    }
    const missing = expected.filter(path => !hashes[path])
    if (missing.length) throw new Error(`Missing prepared blobs: ${missing.join(',')}`)
    return { ...decoded, total: admitted.length }
  }, { assets: manifest.assets, expected })
  assert.equal(session.requests.length, beforeRequests, 'Offline validation requested more media')
  return details
}
async function record(name, run) {
  if (process.env.CHAPTER_LOADING_FILTER && !new RegExp(process.env.CHAPTER_LOADING_FILTER).test(name)) return
  const began = Date.now()
  const detail = await run()
  results.push({ name, passed: true, elapsedMs: Date.now() - began, ...detail })
  console.log(`PASS ${name}: ${JSON.stringify(detail ?? {})}`)
}

try {
  await record('new-game-cancel-preserves-completed-save', async () => {
    const save = fixture('ch2')
    Object.assign(save.dlc.ch2, { phase: 'done', done: true, shift: 'c2am', stepId: 'c2am_lowdose_teaser2' })
    const session = await open('ch1', save, { titleOnly: true, delay: 40 })
    try {
      await session.page.getByRole('button', { name: '↺ 重新开始', exact: true }).click()
      await session.page.getByRole('button', { name: /林小满/ }).click()
      await session.page.locator('[data-chapter-loader][data-chapter="ch1"]').waitFor()
      await assertUnchanged(session.page, save)
      assert.notEqual(await loader(session.page).getAttribute('data-status'), 'ready')
      assert.equal(await session.page.locator('[data-chapter-enter]').count(), 0)
      await session.page.getByRole('button', { name: '返回大厅', exact: true }).click()
      await session.page.getByRole('heading', { name: '🗂️ 章节与番外', exact: true }).waitFor()
      await session.page.waitForTimeout(600)
      await assertUnchanged(session.page, save)
      return { bothChaptersRetained: true, genderNotReset: true, noEarlyCheckinReward: true }
    } finally { await session.context.close() }
  })
  await record('cold-shell-all-nonchapter-ui-offline', async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
    await context.addInitScript(() => {
      sessionStorage.setItem('mr-rotate-dismissed', '1')
      HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('Autoplay blocked fixture', 'NotAllowedError'))
    })
    const page = await context.newPage(), requests = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('request', request => { if (manifest.assets[mediaPath(request.url())]) requests.push(mediaPath(request.url())) })
    try {
      await page.goto(baseUrl)
      await page.getByRole('button', { name: '教师验证入口', exact: true }).waitFor()
      assert.deepEqual([...new Set(requests)].sort(), [...manifest.chapters.shell].sort())
      const readyRequests = requests.length
      await context.setOffline(true)
      await page.getByRole('button', { name: '教师验证入口', exact: true }).click()
      await page.getByRole('heading', { name: '通关凭证 · 教师验证', exact: true }).waitFor()
      await page.waitForFunction(() => { const image = document.querySelector('img[data-scene-background="bg_day"]'); return image?.complete && image.naturalWidth > 0 })
      await page.getByRole('button', { name: '校验第二章凭证', exact: true }).click()
      await page.locator('[data-ch2-certificate-verify]').waitFor()
      await page.screenshot({ path: resolve(output, 'teacher-offline-390px.png') })
      await page.getByRole('button', { name: '← 返回教师验证', exact: true }).click()
      await page.getByRole('button', { name: '← 返回标题', exact: true }).click()
      await page.getByRole('button', { name: '🏅 勋章墙', exact: true }).click()
      await page.getByRole('heading', { name: '🏅 勋章墙', exact: true }).waitFor()
      await page.getByRole('button', { name: '← 返回', exact: true }).click()
      await page.getByRole('button', { name: '▶ 开始游戏', exact: true }).click()
      await page.getByRole('heading', { name: '选择你的夜班技师', exact: true }).waitFor()
      await page.waitForFunction(() => [...document.querySelectorAll('.select-img')].every(image => image.complete && image.naturalWidth > 0))
      await page.getByRole('button', { name: '← 返回', exact: true }).click()
      await page.getByTitle('内容大厅', { exact: true }).click()
      await page.getByRole('heading', { name: '🗂️ 章节与番外', exact: true }).waitFor()
      assert.equal(await loader(page).count(), 0, 'Common UI triggered a surprise chapter gate')
      assert.equal(requests.length, readyRequests, 'Common UI requested media after shell was ready')
      assert.equal(await snapshot(page), null, 'Visiting common UI created a game save')
      return { requests: readyRequests, teacherForms: 2, selectBothPortraits: true, badgeWall: true, hall: true, mobile: true }
    } finally { await context.close() }
  })
  for (const chapter of ['ch1', 'ch2', 'dr', 'dsa']) await record(`cold-${chapter}-full-offline`, async () => {
    const session = await open(chapter, fixture(chapter, chapter === 'ch2' ? 'f' : 'm'), { mobile: chapter === 'ch2', delay: 15 })
    try {
      await assertUnchanged(session.page, session.save)
      await ready(session.page)
      await assertUnchanged(session.page, session.save)
      if (chapter !== 'ch1') assert.equal(await session.page.evaluate(() => window.__preloadAudio.length), 0, 'Loading played/consumed audio')
      await assertProgress(session.page)
      assert(session.maxActive() <= 4, `Media concurrency exceeded four: ${session.maxActive()}`)
      const expected = expectedPaths(chapter, session.save)
      assert.deepEqual([...new Set(session.requests)].sort(), [...expected].sort(), 'Wrong chapter downloaded')
      const decoded = await auditPreparedOffline(session, chapter)
      const requestCount = session.requests.length
      await session.page.screenshot({ path: resolve(output, `${chapter}-ready.png`) })
      await start(session.page)
      if (chapter === 'ch1') await session.page.getByRole('button', { name: /^(出发，上夜班|回到夜班现场) →$/ }).click()
      await session.page.locator('.dialog-box').waitFor()
      await session.page.waitForFunction(() => [...document.querySelectorAll('img[data-scene-background]')].every(image => image.complete && image.naturalWidth > 0))
      assert.equal(session.requests.length, requestCount, 'Game entry fetched uncached media')
      assert.equal(await loader(session.page).count(), 0)
      await session.page.screenshot({ path: resolve(output, `${chapter}-offline.png`) })
      return { requests: requestCount, maxConcurrent: session.maxActive(), decoded, mobile: chapter === 'ch2' }
    } finally { await session.context.close() }
  })

  await record('portrait-audio-atlas-failure-retry', async () => {
    const faultPaths = [`assets/${catalog.ch2_pixel_char_zhou}`, 'audio/vox_ch2_natural_zhou_v2.mp3', 'assets/ct-sequences/wrist-bone-v1.webp']
    const session = await open('ch2', fixture('ch2'), { blocked: faultPaths })
    try {
      await session.page.locator('[data-chapter-loader][data-status="error"]').waitFor({ timeout: 120000 })
      await assertUnchanged(session.page, session.save)
      await assertProgress(session.page)
      assert.equal(await session.page.locator('[data-chapter-enter]').count(), 0)
      for (const path of faultPaths) assert.equal(session.attempts.get(path), 3, `Wrong retry count ${path}`)
      const successful = new Map([...session.attempts].filter(([path]) => !session.blocked.has(path)))
      session.blocked.clear()
      await session.page.getByRole('button', { name: '重试未完成资源', exact: true }).click()
      await ready(session.page)
      await assertUnchanged(session.page, session.save)
      for (const [path, count] of successful) assert.equal(session.attempts.get(path), count, `Already successful file re-downloaded: ${path}`)
      for (const path of faultPaths) assert.equal(session.attempts.get(path), 4)
      await start(session.page)
      await session.page.locator('[data-ch2-step="c2n1_4"]').waitFor()
      return { failedFiles: faultPaths.length, successfulFilesRetained: successful.size }
    } finally { await session.context.close() }
  })

  await record('cancel-and-change-hash', async () => {
    const session = await open('ch2', fixture('ch2'), { delay: 100 })
    try {
      await assertUnchanged(session.page, session.save)
      await session.page.getByRole('button', { name: '返回大厅', exact: true }).click()
      await session.page.waitForFunction(() => !document.querySelector('[data-chapter-loader]'))
      await assertUnchanged(session.page, session.save)
      await session.page.evaluate(() => { location.hash = '#/dlc/dsa' })
      await ready(session.page)
      assert.equal(await loader(session.page).getAttribute('data-chapter'), 'dsa')
      await assertUnchanged(session.page, session.save)
      await start(session.page)
      await session.page.locator('.dialog-box').waitFor()
      await session.page.waitForTimeout(1300)
      assert.equal(await session.page.locator('[data-ch2-step]').count(), 0, 'Cancelled chapter entered later')
      assert.equal(new URL(session.page.url()).hash, '#/dlc/dsa')
      return { cancelledTargetNeverEntered: true }
    } finally { await session.context.close() }
  })

  await record('storage-denied-session-fallback', async () => {
    const session = await open('ch2', fixture('ch2'), { denyStorage: true })
    try {
      await ready(session.page)
      await assertUnchanged(session.page, session.save)
      const decoded = await auditPreparedOffline(session, 'ch2')
      await start(session.page)
      await session.page.locator('[data-ch2-step="c2n1_4"]').waitFor()
      return decoded
    } finally { await session.context.close() }
  })

  await record('cached-reload-corrupt-entry-and-old-extras', async () => {
    const save = fixture('ch2')
    save.flags.archive_film = true
    save.flags.n5_fan = true
    save.cards = ['ring_artifact']
    save.dlc.ch2.viewSprite2 = 'ch2_patient_gut_bed' // legacy saved artwork, not a current encounter.
    const session = await open('ch2', save)
    try {
      await ready(session.page)
      await assertUnchanged(session.page, save)
      const expected = expectedPaths('ch2', save)
      await session.page.waitForFunction(async ({ cacheName, count }) => (await (await caches.open(cacheName)).keys()).length >= count,
        { cacheName, count: expected.length })
      const countBefore = session.requests.length
      await session.page.reload({ waitUntil: 'domcontentloaded' })
      await ready(session.page)
      await assertUnchanged(session.page, save)
      assert.equal(session.requests.length, countBefore, 'Cached reload made media network requests')
      const corruptPath = `assets/${catalog.ch2_pixel_char_zhou}`
      await session.page.evaluate(async ({ cacheName, corruptPath }) => {
        const cache = await caches.open(cacheName)
        const key = (await cache.keys()).find(request => new URL(request.url).pathname.endsWith(corruptPath))
        if (!key) throw new Error('Cache fixture entry missing')
        await cache.put(key, new Response('intentionally corrupted fixture'))
      }, { cacheName, corruptPath })
      await session.page.reload({ waitUntil: 'domcontentloaded' })
      await ready(session.page)
      await assertUnchanged(session.page, save)
      assert.deepEqual(session.requests.slice(countBefore), [corruptPath], 'Corrupted cached media should be the only redownload')
      const decoded = await auditPreparedOffline(session, 'ch2')
      return { reused: expected.length, repaired: 1, decoded }
    } finally { await session.context.close() }
  })

  await record('refresh-during-preparation-keeps-original-save', async () => {
    const session = await open('ch2', fixture('ch2'), { delay: 45 })
    try {
      let cached = []
      for (let attempt = 0; attempt < 200 && cached.length < 15; attempt++) {
        cached = await session.page.evaluate(async cacheName => (await (await caches.open(cacheName)).keys()).map(request => request.url), cacheName)
        if (cached.length < 15) await session.page.waitForTimeout(50)
      }
      assert.notEqual(await loader(session.page).getAttribute('data-status'), 'ready')
      await assertUnchanged(session.page, session.save)
      const cachedPaths = cached.map(mediaPath)
      assert(cachedPaths.length >= 15, `Refresh fixture must contain completed resources, got ${cachedPaths.length}`)
      const before = session.requests.length
      await session.page.reload({ waitUntil: 'domcontentloaded' })
      await ready(session.page)
      await assertUnchanged(session.page, session.save)
      const repeated = session.requests.slice(before).filter(path => cachedPaths.includes(path))
      assert.deepEqual(repeated, [], 'Refresh re-downloaded completed cached resources')
      assert.equal(await session.page.evaluate(() => window.__preloadAudio.length), 0)
      return { completedFilesReused: cachedPaths.length }
    } finally { await session.context.close() }
  })

  for (const mode of ['gift-reply', 'completed']) await record(`restore-${mode}-offline`, async () => {
    const save = fixture('ch2', 'f')
    if (mode === 'gift-reply') {
      save.dlc.ch2.stepId = 'c2n1_chat_q'
      save.dlc.ch2.appliedSteps = ['ch2-c2n1_chat_q']
      save.dlc.ch2.giftReply = { stepId: 'c2n1_chat_q', speaker: 'tang', sprite: 'char_tang', text: '给我的？吸管呢……哦，在袋底。' }
      save.items = [] // The earlier gesture already consumed the gift.
    } else {
      Object.assign(save.dlc.ch2, { phase: 'done', done: true, shift: 'c2am', stepId: 'c2am_lowdose_teaser2' })
      save.flags.c2_payoff_zhou_cup = true
      save.flags.c2_payoff_luo_gift = true
      save.flags.quiz2_grade = 'S'
    }
    const session = await open('ch2', save, { mobile: true })
    try {
      await ready(session.page)
      await assertUnchanged(session.page, save)
      await session.context.setOffline(true)
      const before = session.requests.length
      await start(session.page)
      if (mode === 'gift-reply') {
        await session.page.locator('[data-ch2-step="c2n1_chat_q"]').waitFor()
        const restored = JSON.parse(await snapshot(session.page))
        assert.deepEqual(restored.items, [])
        assert.equal(restored.gold, save.gold)
        assert.deepEqual(restored.dlc.ch2.giftReply, save.dlc.ch2.giftReply)
        assert.equal(await session.page.locator('.dialog-box > p').count(), 1)
      } else {
        await session.page.locator('[data-ch2-settlement][data-ch2-complete="true"]').waitFor()
        const restored = JSON.parse(await snapshot(session.page))
        assert.equal(restored.dlc.ch2.done, true)
        assert.equal(restored.dlc.ch2.phase, 'done')
        assert.equal(restored.gold, save.gold)
        assert.equal(restored.flags.quiz2_grade, 'S')
      }
      assert.equal(session.requests.length, before, 'Restored UI requested media offline')
      assert.equal(await loader(session.page).count(), 0, 'Save restoration discovered unprepared media')
      await session.page.screenshot({ path: resolve(output, `${mode}-390px.png`) })
      return { originalProgressKept: true, noDuplicateConsumption: true, mobile: true }
    } finally { await session.context.close() }
  })
  assert.deepEqual(errors, [], 'Browser page errors')
} finally {
  writeFileSync(resolve(output, 'chapter-loading-browser-report.json'), JSON.stringify({ url: baseUrl, results, errors }, null, 2))
  await browser.close()
}
