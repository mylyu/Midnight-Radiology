import {createRequire} from 'node:module'
import {existsSync,mkdirSync} from 'node:fs'
import assert from 'node:assert/strict'
import {CH2_SHIFTS,ch2StepForState,ch2PortraitAsset} from '../src/game/ch2.ts'
import {CH2_PATIENT_ENTRANCES,isPatientBed} from '../src/game/ch2-patients.ts'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright')
const browser=await chromium.launch({headless:true,...(process.env.EDGE_TEST==='1'?{channel:'msedge'}:{executablePath:process.env.CHROME_PATH})})
const output='../../ch2-patient-test'
mkdirSync(output,{recursive:true})
const errors=[]
try {
 for(const viewport of [{width:1280,height:900},{width:390,height:844},{width:844,height:390}]) {
  for(const patient of CH2_PATIENT_ENTRANCES) {
   const shift=CH2_SHIFTS.find(s=>s.steps[patient.step])
   const state={gender:'m',night:5,gold:500,skill:3,wealth:3,heart:3,durability:70,badges:[],stamps:[],flags:{},lastCheckin:'',streak:0,finished:true,seed:1234,items:[],ap:3,buyCount:0,cards:[],events:[],dlc:{ch2:{shift:shift.id,stepId:patient.step}}}
   const step=ch2StepForState(patient.step,shift.steps[patient.step],state)
   assert([step.sprite,step.sprite2].includes(patient.sprite),patient.id)
   assert([step.sfx,step.sfx2].includes(patient.voice),patient.id)
   assert(!step.image,patient.id+' must enter before result image')
   const asset=ch2PortraitAsset(patient.sprite,'m')
   assert(existsSync('public/assets/'+asset+'.png'),asset)
   assert(existsSync('public/audio/'+patient.voice+'.mp3'),patient.voice)
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
   const img=page.locator(`img[src$="/${asset}.png"]`)
   await img.waitFor()
   await page.waitForFunction(asset=>[...document.images].some(i=>i.src.endsWith('/'+asset+'.png')&&i.complete&&i.naturalWidth>0),asset)
   await page.locator('.dialog-box > p').click()
   const calls=(await page.evaluate(()=>window.__voices)).filter(v=>v.src.includes('/'+patient.voice+'.mp3'))
   assert.equal(calls.length,1,patient.id+' must only play once')
   assert.equal(calls[0].loop,false,patient.id+' must not loop')
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
   if(isPatientBed(patient.sprite)) {
    const box=await img.boundingBox(),dialog=await page.locator('.dialog-wrap').boundingBox()
    assert(box.y>=30,`${patient.id} ${viewport.width}: patient above viewport ${JSON.stringify(box)}`)
    assert(box.x>=0&&box.x+box.width<=viewport.width+1,patient.id+' clipped sideways')
    assert(box.y+box.height<=dialog.y+2,patient.id+' hidden by dialogue')
   }
   await page.screenshot({path:`${output}/${patient.id}-${viewport.width}.png`})
   await context.close()
  }
 }
 assert.deepEqual(errors,[])
 console.log('PASS: 14 patient entrances, portraits and non-looping audio calls, 3 viewports, 7 transport-bed layouts; no early diagnostic image.')
} finally {await browser.close()}
