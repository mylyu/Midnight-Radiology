// Real production bytes, isolated storage. No fabricated successful image responses.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.GAME_URL || 'http://127.0.0.1:8805/Midnight-Radiology/'
const output = resolve(process.env.DELIVERY_OUTPUT || '../../game-delivery-review/loading')
mkdirSync(output, { recursive: true })
const manifest = JSON.parse(readFileSync(new URL('../../docs/game-delivery-assets.json', import.meta.url)))
const catalog = JSON.parse(readFileSync(new URL('../src/lib/image-assets.catalog.json', import.meta.url)))
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const report = { base, cases: [] }
try {
  for (const [label, viewport] of [['desktop', {width:1280,height:800}], ['mobile', {width:390,height:844}]]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' })
    const page = await context.newPage(), errors = []
    page.on('pageerror', error => errors.push(error.message))
    const cdp = await context.newCDPSession(page)
    await cdp.send('Network.enable')
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 120, downloadThroughput: 125000, uploadThroughput: 64000 })
    const started = Date.now()
    await page.goto(base, { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', {name: '▶ 开始游戏', exact: true}).waitFor()
    const uiMs = Date.now() - started
    await page.locator('[data-scene-background="bg_title"]').waitFor({ timeout: 30000 })
    const backgroundMs = Date.now() - started
    assert(backgroundMs < 30000, 'Cold 1 Mbps local-server background should resolve within bounded budget')
    assert.equal(await page.getByTitle('配音试听', {exact: true}).count(), 0)
    const requests = await page.evaluate(() => performance.getEntriesByType('resource').map(entry => ({name: entry.name, bytes: entry.transferSize})))
    assert(!requests.some(row => /\/assets\/optimized\//.test(row.name)))
    assert(!requests.some(row => /\/assets\/[^/]+\.png/.test(row.name)), 'Title never fetches a full-size PNG fallback')
    assert(requests.filter(row => /\/assets\/media\//.test(row.name)).length <= 2, 'No eager chapter-wide image preload')
    await page.screenshot({path:resolve(output, `${label}-cold-title.png`)})
    assert.deepEqual(errors, [])
    report.cases.push({label, network:'1 Mbps / 120ms latency / cold cache', uiMs, backgroundMs, requests})
    await context.close()
  }
  {
    const context = await browser.newContext({viewport:{width:1280,height:800}})
    const page = await context.newPage()
    const target = new URL(`assets/${catalog.bg_title}`, base).href
    let release, hits = 0
    const gate = new Promise(resolveGate => { release = resolveGate })
    await page.route(target, async route => { hits++; await gate; await route.continue() })
    await page.goto(base)
    const preview = page.locator('[data-scene-preview="bg_title"]')
    await preview.waitFor()
    assert(await preview.evaluate(image => image.complete && image.naturalWidth === 48))
    assert.equal(await page.locator('[data-scene-background]').count(), 0)
    await page.getByRole('button', {name: '▶ 开始游戏', exact: true}).waitFor()
    await page.screenshot({path:resolve(output,'slow-inline-preview.png')})
    release()
    await page.locator('[data-scene-background="bg_title"]').waitFor()
    assert(hits >= 1)
    await preview.waitFor({state:'detached'})
    report.cases.push({label:'inline same-scene preview while actual response withheld', hits})
    await context.close()
  }
  {
    const context = await browser.newContext(), page = await context.newPage()
    const target = new URL(`assets/${catalog.bg_title}`, base).href
    let hits=0, failed=true
    await page.route(target, route => { hits++; return failed ? route.abort('failed') : route.continue() })
    await page.goto(base)
    await page.locator('[data-scene-load-status="error"]').waitFor()
    assert.equal(hits, 3, 'Exactly three bounded initial attempts')
    assert.equal(await page.locator('[data-scene-preview="bg_title"]').count(), 1)
    failed=false
    await page.getByRole('button',{name:'重试背景',exact:true}).click()
    await page.locator('[data-scene-background="bg_title"]').waitFor()
    assert.equal(hits, 4)
    await page.getByRole('button',{name:'▶ 开始游戏',exact:true}).click()
    report.cases.push({label:'three failures, manual retry, real image and clickable game',hits})
    await context.close()
  }
  {
    const context = await browser.newContext(), page = await context.newPage()
    await page.goto(base)
    const rows = manifest.images.map(row => ({name:row.name,url:new URL(row.deliveryPath.replace('app/public/',''),base).href,
      sha:row.deliverySha256,bytes:row.deliveryBytes,width:row.width,height:row.height}))
    const verified = await page.evaluate(async rows => {
      let index=0; const results=[]
      await Promise.all(Array.from({length:4},async()=> {
        for (;;) {
          const row=rows[index++]; if(!row)return
          const response=await fetch(row.url)
          if(!response.ok)throw new Error(`${row.name}: HTTP ${response.status}`)
          const buffer=await response.arrayBuffer()
          const sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))].map(x=>x.toString(16).padStart(2,'0')).join('')
          const bitmap=await createImageBitmap(new Blob([buffer]))
          if(sha!==row.sha || buffer.byteLength!==row.bytes || bitmap.width!==row.width || bitmap.height!==row.height)throw new Error(`${row.name}: invalid delivered bytes/geometry`)
          bitmap.close(); results.push(row.name)
        }
      }))
      return results
    },rows)
    assert.equal(verified.length,197)
    report.cases.push({label:'all canonical images HTTP SHA256 and actual browser decode',count:verified.length})
    await context.close()
  }
  writeFileSync(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n')
  console.log(JSON.stringify(report.cases.map(({requests,...rest})=>rest),null,2))
} finally { await browser.close() }
