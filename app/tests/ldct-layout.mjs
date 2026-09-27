// Targeted layout/alternative-entry checks after the one complete opening walk.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { freshState } from '../src/game/store.ts'
import { initializeLdct, getLdctProgress } from '../src/game/ldct-session.ts'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright')
const browser=await chromium.launch({channel:'msedge',headless:true})
const key='midnight-radiology-save-v1',url=process.env.GAME_URL||'http://127.0.0.1:8798/'
const base=initializeLdct(freshState('f'))
const p=getLdctProgress(base)
base.dlc.ldct.ldct={...p,nodeId:'lab_first',phase:'lab',labDraft:{...p.labDraft,pinned:{...p.labDraft.candidate},candidate:{signal:'medium',algorithm:'iterative',strength:3}}}
const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true})
await context.addInitScript(({key,base})=>{
 if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(base))
 localStorage.setItem('mr-ldct-unlock','1');localStorage.setItem('mr-ch2-unlock','1')
 sessionStorage.setItem('mr-rotate-dismissed','1')
},{key,base})
const page=await context.newPage(),errors=[]
page.on('pageerror',e=>errors.push(e.message))
try{
 await page.goto(url+'#/dlc/ldct');await page.locator('[data-chapter-enter]').click({timeout:45000})
 await page.locator('.ldct-lab').waitFor()
 await page.screenshot({path:resolve('../../ldct-opening-review/lab-landscape-polished.png')})
 const imageBox=await page.getByTestId('ldct-comparison').boundingBox()
 assert(imageBox.y+imageBox.height<=390,'whole comparison visible in short landscape')
 const handle=page.locator('.ldct-lab__divider i'),h=await handle.boundingBox()
 await page.mouse.move(h.x+h.width/2,h.y+h.height/2);await page.mouse.down();await page.mouse.move(h.x+65,h.y+h.height/2,{steps:5});await page.mouse.up()
 const value=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).dlc.ldct.ldct.labDraft.divider,key)
 assert(value>65,'direct divider drag persisted')
 await page.setViewportSize({width:390,height:844})
 await page.getByRole('button',{name:'低',exact:true}).tap()
 const state=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key)
 assert.equal(state.dlc.ldct.ldct.labDraft.candidate.signal,'low')
 await page.getByRole('button',{name:'记下：我还不确定',exact:true}).tap()
 await page.getByRole('button',{name:'看模体原本有什么',exact:true}).tap()
 await page.screenshot({path:resolve('../../ldct-opening-review/mobile-controls.png')})
 await page.getByRole('button',{name:'先回值班室',exact:true}).tap()
 await page.locator('[data-ldct-dialogue]').waitFor()
 const topBefore=await page.locator('[data-ldct-portrait]').boundingBox()
 await page.getByRole('button',{name:'📖 手册',exact:true}).tap()
 await page.getByRole('dialog').waitFor()
 assert(await page.getByRole('button',{name:'关闭 ×',exact:true}).isVisible())
 await page.getByRole('button',{name:'关闭 ×',exact:true}).tap()
 const topAfter=await page.locator('[data-ldct-portrait]').boundingBox()
 assert.equal(topBefore.y,topAfter.y)
 await page.locator('.ldct-text').tap()
 await page.screenshot({path:resolve('../../ldct-opening-review/story-mobile.png')})
 // Existing Chapter 1 continue and Chapter 2 gate still enter without touching
 // the LDCT cursor. This is an entry smoke check, not another full playthrough.
 const ldct=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).dlc.ldct,key)
 await page.goto(url+'#/ch2');await page.locator('[data-chapter-enter]').click({timeout:45000})
 await page.locator('[data-ch2-step]').waitFor({timeout:15000})
 assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).dlc.ldct,key),ldct)
 await page.goto(url)
 await page.getByRole('button',{name:'▶ 继续夜班（自动存档）',exact:true}).click({timeout:45000})
 await page.locator('[data-chapter-enter]').click({timeout:45000})
 await page.getByRole('button',{name:/^(出发，上夜班|回到夜班现场) →$/}).click()
 await page.locator('[data-ch1-step]').waitFor()
 assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).dlc.ldct,key),ldct)
 assert.deepEqual(errors,[])
 console.log('LDCT landscape/portrait touch, direct divider drag, modal/portrait stability and main chapter entry isolation passed.')
}finally{await browser.close()}
