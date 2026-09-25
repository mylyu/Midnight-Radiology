import {createRequire} from 'node:module'
import {existsSync,mkdirSync} from 'node:fs'
import assert from 'node:assert/strict'
import { logicalImagePath, waitForLiveImage } from './game-delivery-media.mjs'
import {CH2_SHIFTS,ch2StepForState,ch2PortraitAsset} from '../src/game/ch2.ts'
import {CH2_PATIENT_ENTRANCES,CH2_RETIRED_PATIENT_VOICES,isPatientBed,isPatientWheelchair} from '../src/game/ch2-patients.ts'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright')
const browser=await chromium.launch({headless:true,...(process.env.EDGE_TEST==='1'?{channel:'msedge'}:{executablePath:process.env.CHROME_PATH})})
const output='../../ch2-patient-test'
mkdirSync(output,{recursive:true})
const errors=[]
try {
 assert.equal(CH2_PATIENT_ENTRANCES.filter(p=>isPatientBed(p.sprite)).length,4)
 assert.equal(CH2_PATIENT_ENTRANCES.filter(p=>isPatientWheelchair(p.sprite)).length,2)
 assert.equal(CH2_PATIENT_ENTRANCES.filter(p=>p.voice?.startsWith('vox_ch2_')).length,1)
 for(const shift of CH2_SHIFTS) for(const [id,raw] of Object.entries(shift.steps)) {
  const step=ch2StepForState(id,raw,{flags:{},badges:[],gender:'m',finished:true})
  assert(![step.sfx,step.sfx2].some(s=>CH2_RETIRED_PATIENT_VOICES.includes(s)),id+' has retired patient voice')
 }
 for(const viewport of [{width:1280,height:900},{width:390,height:844},{width:844,height:390}]) {
  for(const patient of CH2_PATIENT_ENTRANCES) {
   const shift=CH2_SHIFTS.find(s=>s.steps[patient.step])
   const state={gender:'m',night:5,gold:500,skill:3,wealth:3,heart:3,durability:70,badges:[],stamps:[],flags:{},lastCheckin:'',streak:0,finished:true,seed:1234,items:[],ap:3,buyCount:0,cards:[],events:[],dlc:{ch2:{shift:shift.id,stepId:patient.step}}}
   const step=ch2StepForState(patient.step,shift.steps[patient.step],state)
   assert([step.sprite,step.sprite2].includes(patient.sprite),patient.id)
   if(patient.voice) assert([step.sfx,step.sfx2].includes(patient.voice),patient.id)
   assert(!step.image,patient.id+' must enter before result image')
   const asset=ch2PortraitAsset(patient.sprite,'m')
   assert(logicalImagePath(asset),asset)
   if(patient.voice) assert(existsSync('public/audio/'+patient.voice+'.mp3'),patient.voice)
   const context=await browser.newContext({viewport})
   await context.addInitScript(state=>{
    localStorage.setItem('mr-ch2-unlock','1')
    localStorage.setItem('midnight-radiology-save-v1',JSON.stringify(state))
    window.__voices=[]
    HTMLMediaElement.prototype.play=function(){window.__voices.push({src:this.src,loop:this.loop});return Promise.resolve()}
   },state)
   const page=await context.newPage()
   page.on('pageerror',e=>errors.push(e.message))
   await page.goto((process.env.GAME_URL||'http://127.0.0.1:8798/')+'#/ch2')
   const img=await waitForLiveImage(page,asset,process.env.GAME_URL||'http://127.0.0.1:8798/')
   if(!(await page.locator('.dialog-box > span.animate-bounce').count()) && !(await page.locator('.choice-in').count())) await page.locator('.dialog-box > p').click()
   const calls=(await page.evaluate(()=>window.__voices)).filter(v=>/\/(vox_|vox2_|cry_child|groan_man)/.test(v.src))
   assert.equal(calls.length,patient.voice?1:0,patient.id+' entrance sound policy')
   if(patient.voice) { assert(calls[0].src.includes('/'+patient.voice+'.mp3')); assert.equal(calls[0].loop,false) }
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
   if(isPatientBed(patient.sprite)||isPatientWheelchair(patient.sprite)) {
    const box=await img.boundingBox(),dialog=await page.locator('.dialog-wrap').boundingBox()
    assert(box.y>=30,`${patient.id} ${viewport.width}: patient above viewport ${JSON.stringify(box)}`)
    assert(box.x>=0&&box.x+box.width<=viewport.width+1,patient.id+' clipped sideways')
    assert(box.y+box.height<=dialog.y+2,patient.id+' hidden by dialogue')
   }
   await page.screenshot({path:`${output}/${patient.id}-${viewport.width}.png`})
   await context.close()
  }
 }
 // Quiet entries must not regain retired audio controls in the review page.
 const preview=await browser.newPage()
 await preview.goto((process.env.GAME_URL||'http://127.0.0.1:8798/')+'ch2-patient-preview.html')
 assert.equal(await preview.locator('audio').count(),2)
 assert.equal(await preview.locator('img').count(),11)
 for(const img of await preview.locator('img').all()) { await img.scrollIntoViewIfNeeded(); await img.evaluate(i=>i.decode()) }
 assert.equal(await preview.evaluate(()=>localStorage.getItem('midnight-radiology-save-v1')),null)
 await preview.evaluate(()=>scrollTo(0,0))
 await preview.screenshot({path:`${output}/restrained-gallery.png`})
 await preview.close()
 assert.deepEqual(errors,[])
 console.log('PASS: 13 patient entrances on 3 viewports after gut retirement; 4 beds/2 wheelchairs; 9 added voices retired, only 1 new entrance voice retained; quiet entries stay quiet; historical review page agrees.')
} finally {await browser.close()}
