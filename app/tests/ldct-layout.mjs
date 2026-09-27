// Targeted layout/alternative-entry checks after the one complete opening walk.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { freshState } from '../src/game/store.ts'
import { initializeLdct, getLdctProgress } from '../src/game/ldct-session.ts'
import { createLdctLabState } from '../src/game/ldct-experiments.ts'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/lvmen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const browser=await chromium.launch({channel:'msedge',headless:true})
const key='midnight-radiology-save-v1',url=process.env.GAME_URL||'http://127.0.0.1:8798/'
const base=initializeLdct(freshState('f'))
const p=getLdctProgress(base)
base.dlc.ldct.ldct={...p,nodeId:'lab_filter',phase:'lab',labRound:3,labDraft:createLdctLabState(3)}
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
 assert(imageBox.height<=260,'compact comparison in short landscape; lab content scrolls')
 const handle=page.getByRole('button',{name:'拖动比较分界',exact:true}),h=await handle.boundingBox()
 await page.mouse.move(h.x+h.width/2,h.y+h.height/2);await page.mouse.down();await page.mouse.move(h.x+65,h.y+h.height/2,{steps:5});await page.mouse.up()
 const value=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).dlc.ldct.ldct.labDraft.divider,key)
 assert(value>65,'direct divider drag persisted')
 await page.setViewportSize({width:390,height:844})
 await page.getByRole('button',{name:'柔一些 · Hann',exact:true}).tap()
 const controls=page.locator('.ldct-lab__chips button')
 assert.equal(await page.locator('.ldct-lab__chips button[aria-pressed="true"]').count(),1)
 const colors=await controls.evaluateAll(buttons=>buttons.map(b=>({selected:b.getAttribute('aria-pressed'),bg:getComputedStyle(b).backgroundColor})))
 assert.notEqual(colors[0].bg,colors[2].bg,'inactive Ramp must not look selected together with Hann')
 const state=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key)
 assert.equal(state.dlc.ldct.ldct.labDraft.filter,'hann')
 await page.getByRole('button',{name:'还拿不准，也记下来',exact:true}).tap()
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
 await page.locator('[data-ldct-dialogue] .dialog-box p').tap()
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
 // Final point-label correction only: use an isolated fresh trace draft, not
 // another whole story replay, and ensure the numeral is outside the target.
 const traceState={...base,dlc:{...base.dlc,ldct:{...base.dlc.ldct,ldct:{...p,nodeId:'lab_first',phase:'lab',labRound:1,
  labDraft:{...createLdctLabState(1),structure:'rod',angle:90}}}}}
 await page.evaluate(({key,traceState})=>localStorage.setItem(key,JSON.stringify(traceState)),{key,traceState})
 await page.goto(url+'#/dlc/ldct');await page.reload();await page.locator('[data-chapter-enter]').click({timeout:45000})
 const point=page.getByRole('button',{name:'追踪左下的小细棒',exact:true}),circle=await point.boundingBox(),label=await point.locator('span').boundingBox()
 assert(label.y+label.height<=circle.y,'number no longer covers tiny structure')
 assert.equal(await point.evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)')
 await page.screenshot({path:resolve('../../ldct-projection-review/trace-mobile-polished.png')})
 assert.deepEqual(errors,[])
 console.log('LDCT landscape/portrait touch, direct divider drag, modal/portrait stability and main chapter entry isolation passed.')
}finally{await browser.close()}
