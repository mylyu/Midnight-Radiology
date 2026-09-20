// Regression for the StrictMode setup/cleanup/end-timer deadlock found by both independent players.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
const url = process.env.GAME_URL || 'http://127.0.0.1:8798/'
const errors = []
try {
 for (let night = 1; night <= 5; night++) {
  const context = await browser.newContext()
  await context.addInitScript(night => {
   if (!localStorage.getItem('midnight-radiology-save-v1')) localStorage.setItem('midnight-radiology-save-v1', JSON.stringify({
    gender:'m', night, gold:500, skill:1, wealth:1, heart:1, durability:70, badges:[],
    stamps:Array.from({length:night-1},(_,i)=>i+1), flags:{}, lastCheckin:'', streak:0,
    finished:false, seed:4567, items:[], ap:0, buyCount:0, cards:[], events:[],
    screenHint:'night', stepId:'n'+night+'_end', resumeKey:night+'-n'+night+'_end',
   }))
  }, night)
  const page = await context.newPage()
  page.on('pageerror',e=>errors.push(e.message))
  await page.goto(url)
  await page.getByRole('button',{name:'▶ 继续夜班（自动存档）',exact:true}).click()
  await page.getByRole('button',{name:'回到夜班现场 →',exact:true}).click()
  await page.waitForFunction(night => {
   const s = JSON.parse(localStorage.getItem('midnight-radiology-save-v1'))
   return s.stamps.includes(night) && (night < 5 ? s.night === night+1 : s.finished && s.screenHint === 'quiz')
  },night,{timeout:5000})
  const once = await page.evaluate(()=>JSON.parse(localStorage.getItem('midnight-radiology-save-v1')))
  assert.equal(once.stamps.length,night)
  if(night<5) {
   assert.equal(once.durability,58)
   await page.getByText('白天 · 科室经营',{exact:true}).waitFor()
  }
  await page.waitForTimeout(1300)
  const twice = await page.evaluate(()=>JSON.parse(localStorage.getItem('midnight-radiology-save-v1')))
  assert.deepEqual(twice.stamps,once.stamps)
  assert.equal(twice.gold,once.gold)
  assert.equal(twice.durability,once.durability)
  await context.close()
 }
 assert.deepEqual(errors,[])
 console.log('PASS: all five chapter-one end nodes settle exactly once under dev StrictMode; no blank-dialogue deadlock.')
} finally { await browser.close() }
