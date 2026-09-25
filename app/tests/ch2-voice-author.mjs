import assert from 'node:assert/strict'
import { deliveryManifest, historicalRetiredReference } from './game-delivery-media.mjs'
import {execFileSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import ts from 'typescript'
import {beforeSocial as live, beforeSocialSource} from './ch2-colleague-projection.mjs'
import {beforePacingPatientUrl} from './ch2-pacing-projection.mjs'
import {beforeAuthorPass} from './ch2-voice-author-projection.mjs'
import { beforeDirectorDayVoiceSource } from './ch2-director-day-voice.mjs'
const root=new URL('../../',import.meta.url), baseline='7032d58'
const read=p=>readFileSync(new URL(p,root),'utf8')
const json=p=>JSON.parse(read('docs/'+p+'.json'))
const plan=json('ch2-voice-author-lines'), edits=json('ch2-voice-author-changes')
const current=JSON.parse(beforeDirectorDayVoiceSource('docs/ch2-voice-current.json',read('docs/ch2-voice-current.json'))), generated=json('ch2-voice-author-generation'), qa=json('ch2-voice-author-qa')
const perceptions=json('ch2-voice-author-listening-model')
const oldGen=json('ch2-natural-voices-generation')
const source=execFileSync('git',['show',baseline+':app/src/game/ch2.ts'],{encoding:'utf8',maxBuffer:4e6})
 .replace("'./ch2-patients.ts'",JSON.stringify(beforePacingPatientUrl))
const old=await import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64'))
assert.deepEqual(plan.lines.map(r=>r.text),['你来扫，我去泡杯茶。','跟你说个事儿。','新机器接入packs了。','老爷子夜里坠床，要拍头颅CT。','年轻人，动作快起来！'])
assert.equal(edits.length,9)
for(const [key,value] of Object.entries(old))if(key!=='CH2_SHIFTS'&&typeof value!=='function')assert.deepEqual(live[key],value,key)
for(const [i,shift] of live.CH2_SHIFTS.entries()){
 assert.deepEqual({...shift,steps:Object.fromEntries(Object.entries(shift.steps).map(([id,s])=>[id,beforeAuthorPass(id,s)]))},old.CH2_SHIFTS[i])
 for(const [id,s] of Object.entries(shift.steps))for(const gender of ['m','f'])for(const flags of [{},{data_audit:true,audit_evidence:true,mystery_told:true,archive_film:true,remote_asked:true,lei_cable:true,wen_remote:true,c2n3_d:true,c2n5_b:true}]){
  const state={gender,flags,finished:true,badges:[],items:[],ap:3}
  assert.deepEqual(beforeAuthorPass(id,live.ch2StepForState(id,s,state)),old.ch2StepForState(id,old.CH2_SHIFTS[i].steps[id],state),id+' runtime')
 }
}
for(const path of ['app/src/App.tsx','app/src/game/store.ts','app/src/game/data.ts','app/src/game/dlc.ts','app/src/game/types.ts','app/src/game/ch2-patients.ts','app/src/game/ch2-exploration.ts','app/src/index.css']){
 assert.equal(beforeSocialSource(path,read(path)).replaceAll('\r\n','\n'),execFileSync('git',['show',baseline+':'+path],{encoding:'utf8',maxBuffer:4e6}).replaceAll('\r\n','\n'),path)
}
assert.equal(execFileSync('git',['diff','--name-only','--diff-filter=DMRTUXB',baseline,'--','app/public/audio'],{encoding:'utf8',cwd:root}).trim(),'','Old/shared audio must remain intact')
const steps=Object.assign({},...live.CH2_SHIFTS.map(s=>s.steps))
assert.equal(current.filter(r=>r.id).length,12)
for(const r of current){
 assert.equal(steps[r.step].sfx,r.id??undefined,r.key)
 assert.equal(live.ch2StepForState(r.step,steps[r.step],{gender:'m',flags:{},finished:true,badges:[]}).sfx,r.id??undefined,r.key+' staged audio')
}
for(const r of plan.restore)assert.equal(steps[r.step].sfx,r.id)
for(const r of plan.mute){
 assert.equal(steps[r.step].sfx,undefined)
 assert.equal(steps[r.step].sfx2,undefined)
 assert.equal(steps[r.step].text,old.CH2_SHIFTS.find(s=>s.steps[r.step]).steps[r.step].text,'Mute must not delete dialogue')
}
assert.equal(generated.length,5)
const norm=t=>t.toLowerCase().replaceAll('機','机').replaceAll('pax','packs').replace(/[^\p{Script=Han}a-z]/gu,'')
for(const r of plan.lines){
 const record=generated.find(n=>n.id===r.id), check=qa.find(n=>n.id===r.id)
 const hash=createHash('sha256').update(readFileSync(new URL(record.output,root))).digest('hex')
 assert.equal(hash,record.sha256);assert.equal(hash,check.sha256)
 assert.equal(record.text,r.text);assert.equal(check.expected,r.text)
 assert.equal(record.reference_sha256,oldGen.find(n=>n.key===r.key).reference_sha256)
 assert.equal(record.instruction,'Say the following with the same voice: "'+(r.spoken_text??r.text)+'"')
 if(r.key==='he'){
  // Whisper disagrees on fast words; keep the raw discrepancy and independent
  // audio-model transcript, not a fabricated exact-ASR pass or hearing claim.
  const opinion=perceptions.find(n=>n.id===r.id&&n.sha256===hash)
  assert(opinion.answer.startsWith('老爷子夜里坠床要拍头颅CT。'))
 }else assert.equal(norm(check.asr),norm(r.text),r.key+' transcript')
 assert(check.seconds>.5&&check.seconds<4&&check.peak<.98&&check.rms>.003)
}
assert(deliveryManifest().removed.some(row=>row.path==='app/public/ch2-voice-preview.html'),
 'The old static audition page must be explicitly retired; all actual generation/audio/graph checks above still run')
const historicalPreview=historicalRetiredReference('app/public/ch2-voice-preview.html').toString('utf8')
assert.deepEqual(JSON.parse(historicalPreview.match(/const rows=(.*);/)[1]),current,
 'Historical audition metadata remains exact; this does not claim the retired page is still published')
console.log('PASS historical author-voice round (validated later deltas projected out): exact 5 author lines, 2 original voices, 2 silent roles; references/hashes, historical graph/UI/save/shared audio. Xiao He ASR discrepancy retained.')
