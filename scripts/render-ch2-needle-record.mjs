// Render the authored UI document; no AI-generated lettering or photo editing.
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, channel: 'msedge' })
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 1200 }, deviceScaleFactor: 1 })
  const source = readFileSync(new URL('../docs/assets/ch2-needle-record-v1.svg', import.meta.url), 'utf8')
  await page.setContent(`<style>html,body{margin:0;width:1000px;height:1200px;overflow:hidden}</style>${source}`)
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: fileURLToPath(new URL('../app/public/assets/ch2_needle_record_v1.png', import.meta.url)) })
} finally { await browser.close() }
