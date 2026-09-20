import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {readFileSync,existsSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import ts from 'typescript'
import * as live from '../src/game/ch2.ts'

const baseline='1d7342d'
const root=new URL('../../',import.meta.url)
const read=p=>readFileSync(new URL(p,root),'utf8')
const plan=JSON.parse(read('docs/ch2-natural-voices-lines.json'))
const edits=JSON.parse(read('docs/ch2-natural-voices-changes.json'))
const generated=JSON.parse(read('docs/ch2-natural-voices-generation.json'))
const qa=JSON.parse(read('docs/ch2-natural-voices-qa.json'))
const oldSource=execFileSync('git',['show',baseline+':app/src/game/ch2.ts'],{encoding:'utf8',maxBuffer:4e6})
 .replace("'./ch2-patients.ts'",JSON.stringify(new URL('../src/game/ch2-patients.ts',import.meta.url).href))
const js=ts.transpileModule(oldSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
const old=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))
const restore=(id,step)=>{
 const row=edits.find(r=>r.step===id)
 if(!row)return step
 assert.equal(step.text,row.afterText)
 assert.equal(step.sfx,row.afterSfx)
 return {...step,text:row.beforeText,sfx:row.beforeSfx}
}
assert.equal(plan.lines.length,14)
assert.equal(edits.length,14)
assert.equal(generated.length,14)
assert.equal(qa.length,14)
assert.equal(new Set(plan.lines.map(r=>r.id)).size,14)
for(const [key,value] of Object.entries(old)) {
 if(key==='CH2_SHIFTS'||typeof value==='function')continue
 assert.deepEqual(live[key],value,'Non-story data changed '+key)
}
for(const [i,shift] of live.CH2_SHIFTS.entries()){
 const restored={...shift,steps:Object.fromEntries(Object.entries(shift.steps).map(([id,step])=>[id,restore(id,step)]))}
 assert.deepEqual(restored,old.CH2_SHIFTS[i],'Only the documented text/voice slots may change')
 for(const [id,step] of Object.entries(shift.steps))for(const gender of ['m','f'])for(const flags of [
  {},{mystery_told:true,archive_film:true,remote_asked:true,lei_cable:true,wen_remote:true,c2n3_d:true,c2n5_b:true,data_audit:true,audit_evidence:true},
 ]){
  const state={gender,flags,finished:true,badges:[],items:[],ap:3}
  assert.deepEqual(restore(id,live.ch2StepForState(id,step,state)),
   old.ch2StepForState(id,old.CH2_SHIFTS[i].steps[id],state),id+' runtime')
 }
}
for(const path of ['app/src/App.tsx','app/src/game/data.ts','app/src/game/dlc.ts','app/src/game/types.ts',
 'app/src/game/store.ts','app/src/game/ch2-patients.ts','app/src/game/ch2-exploration.ts','app/src/index.css']){
 const was=execFileSync('git',['show',baseline+':'+path],{encoding:'utf8',maxBuffer:4e6})
 const normalized=read(path).replaceAll('\r\n','\n').replace("SFX_VOLUME[name] ?? (name.startsWith('vox_ch2_natural_') ? 0.45 : 0.22)","SFX_VOLUME[name] ?? 0.22")
 assert.equal(normalized,was.replaceAll('\r\n','\n'),path+' must not change beyond new-clip volume')
}
assert.equal(execFileSync('git',['diff','--name-only','--diff-filter=DMRTUXB',baseline,'--','app/public/audio'],{encoding:'utf8'}).trim(),'','Never overwrite shared old voices')
// ASR spelling variants only: ta cannot distinguish 他/她 in speech.
const normalize=t=>t.replaceAll('诶','哎').replaceAll('唉','哎').replaceAll('喔','哦').replaceAll('還','还').replaceAll('沒','没').replaceAll('她','他').replace(/[^\p{Script=Han}a-z]/gu,'')
for(const row of plan.lines){
 const record=generated.find(r=>r.id===row.id)
 const check=qa.find(r=>r.id===row.id)
 const file=new URL(record.output,root)
 assert(existsSync(file))
 const hash=createHash('sha256').update(readFileSync(file)).digest('hex')
 assert.equal(hash,record.sha256)
 assert.equal(hash,check.sha256)
 assert.equal(check.expected,row.text)
 assert.equal(record.text,row.text)
 assert.equal(record.instruction,'Say the following with the same voice: "'+row.text+'"')
 assert.match(record.id,/^vox_ch2_natural_/)
 assert(row.text.match(/\p{Script=Han}/gu).length<=8,row.id+' too long')
 assert.equal(normalize(check.asr),normalize(row.text),row.id+' transcript needs review: '+check.asr)
 const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','stream=sample_rate,channels,codec_name','-of','json',fileURLToPath(file)],{encoding:'utf8'}))
 assert.equal(probe.streams[0].sample_rate,'24000')
 assert.equal(probe.streams[0].channels,1)
 assert.equal(probe.streams[0].codec_name,'mp3')
 assert(check.seconds<4&&check.peak<.98&&check.rms>.003)
 const edit=edits.find(e=>e.step===row.step)
 assert(edit.afterText.startsWith(row.text),'Spoken line must match visible opening')
}
for(const pair of [['fan_a','fan_b'],['director','director_am']]){
 const refs=pair.map(key=>generated.find(r=>r.key===key).reference_sha256)
 assert.equal(refs[0],refs[1],'Same actor requires same reference')
}
console.log('PASS: 14 short voices, exact audible-opening text, current MP3/QA hashes, old voices unchanged, full graph/UI/state preservation.')
