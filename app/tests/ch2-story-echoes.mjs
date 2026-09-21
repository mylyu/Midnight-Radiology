// This round is prose only. The frozen baseline is intentionally exact, not
// a hand-maintained allowlist of selected interaction fields.
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
import * as live from '../src/game/ch2.ts'
import {beforeAuthorPass} from './ch2-voice-author-projection.mjs'

// The later, user-requested voice pass changes exactly 14 entrance texts/tracks.
// Validate those explicit deltas before projecting them back out of this older
// prose-only audit. ch2-natural-voices.mjs checks the live pass against 1d7342d.
const voiceChanges=JSON.parse(readFileSync(new URL('../../docs/ch2-natural-voices-changes.json',import.meta.url),'utf8'))
function beforeVoicePass(id,step) {
 // This helper is also called on already-projected old steps at runtime.
 if(step.sfx!==voiceChanges.find(r=>r.step===id)?.beforeSfx)step=beforeAuthorPass(id,step)
 const edit=voiceChanges.find(r=>r.step===id)
 if(!edit||step.sfx!==edit.afterSfx)return step
 assert.equal(step.text,edit.afterText,id+' undocumented voice prose')
 return {...step,text:edit.beforeText,sfx:edit.beforeSfx}
}
const current={...live,
 CH2_SHIFTS:live.CH2_SHIFTS.map(s=>({...s,steps:Object.fromEntries(Object.entries(s.steps).map(([id,step])=>[id,beforeVoicePass(id,step)]))})),
 ch2StepForState:(id,step,state)=>beforeVoicePass(id,live.ch2StepForState(id,step,state)),
}

const baseline='0cf2e68'
const oldFile=path=>execFileSync('git',['show',`${baseline}:app/${path}`],{encoding:'utf8',maxBuffer:4*1024*1024})
const baselineSource=oldFile('src/game/ch2.ts').replace("'./ch2-patients.ts'",JSON.stringify(new URL('../src/game/ch2-patients.ts',import.meta.url).href))
const js=ts.transpileModule(baselineSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
const old=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))
const withoutText=({text,...other})=>other
const runtimeFields=step=>Object.fromEntries(Object.entries(withoutText(step)).filter(([,value])=>value!==undefined))
const changes=[],variants=new Map()
for(const [key,value] of Object.entries(old)) {
 if(key==='CH2_SHIFTS'||typeof value==='function')continue
 assert.deepEqual(current[key],value,'Non-story export changed: '+key)
}
assert.deepEqual(current.CH2_SHIFTS.map(({steps,...meta})=>meta),old.CH2_SHIFTS.map(({steps,...meta})=>meta))
for(const shift of old.CH2_SHIFTS) {
 const now=current.CH2_SHIFTS.find(s=>s.id===shift.id)
 assert.deepEqual(Object.keys(now.steps),Object.keys(shift.steps),'No added/removed/reordered nodes')
 for(const [id,before] of Object.entries(shift.steps)) {
  const after=now.steps[id]
  assert.deepEqual(withoutText(after),withoutText(before),'Interaction/media changed: '+id)
  if(before.text!==after.text)changes.push({id,before:before.text,after:after.text})
  // Existing spoken entrances must not silently acquire a different subtitle.
  if([before.sfx,before.sfx2].some(s=>/^(vox|cry_child|groan)/.test(s??'')))assert.equal(after.text,before.text,'Voiced subtitle changed: '+id)
 }
}
// These entire files are outside a prose-only round (including line endings).
for(const path of ['src/App.tsx','src/game/data.ts','src/game/dlc.ts','src/game/store.ts','src/game/types.ts','src/game/ch2-exploration.ts','src/game/ch2-patients.ts','src/index.css']) {
 const normalize=s=>s.replaceAll('\r\n','\n').replace("SFX_VOLUME[name] ?? (name.startsWith('vox_ch2_natural_') ? 0.45 : 0.22)","SFX_VOLUME[name] ?? 0.22")
 assert.equal(normalize(readFileSync(new URL('../'+path,import.meta.url),'utf8')),normalize(oldFile(path)),path+' must remain untouched')
}
const states=[]
for(const gender of ['m','f'])for(const flags of [
 {},{remote_asked:true},{remote_asked:true,lei_cable:true},{wen_remote:true},
 {c2n3_d:true},{c2n3_k:true},{mystery_told:true},{archive_film:true},{c2n5_b:true},
 {data_audit:true},{data_audit:true,audit_evidence:true},{data_oppose:true},{data_support:true},
 {c2_queue_postop_done:true},{c2_queue_routine_done:true},
 {remote_asked:true,lei_cable:true,wen_remote:true,c2n3_d:true,mystery_told:true,archive_film:true,c2n5_b:true,data_audit:true,audit_evidence:true},
])for(const finished of [false,true])states.push({gender,flags,finished,badges:['fixer'],items:[],ap:0})
for(const s of states)for(const shift of old.CH2_SHIFTS)for(const [id,before] of Object.entries(shift.steps)) {
 const after=current.CH2_SHIFTS.find(n=>n.id===shift.id).steps[id]
 const rendered=current.ch2StepForState(id,after,s),previous=old.ch2StepForState(id,before,s)
 assert.deepEqual(runtimeFields(rendered),runtimeFields(previous),id+' runtime changed beyond text')
 if(rendered.text!==after.text&&rendered.text!==previous.text)variants.set(id+'|'+rendered.text,{id,exampleState:{gender:s.gender,flags:s.flags,finished:s.finished},before:previous.text,after:rendered.text})
}
const steps=Object.assign({},...current.CH2_SHIFTS.map(s=>s.steps))
const text=(id,flags={})=>current.ch2StepForState(id,steps[id],{gender:'m',badges:[],finished:true,flags}).text
assert.doesNotMatch(text('c2d2_16a'),/小凯说|小雷说|单走外网|见过/)
assert.match(text('c2d2_16a',{remote_asked:true,lei_cable:true}),/还缺了中间那一截/)
assert.doesNotMatch(text('c2n3_x0'),/小唐倒/)
assert.match(text('c2n3_x0',{c2n3_d:true}),/小唐倒的水/)
assert.match(text('c2d4_e2',{remote_asked:true}),/名片背面/)
assert.match(text('c2d4_e5',{wen_remote:true}),/雯雯.*附件三/)
assert.match(text('c2n5_a7',{archive_film:true}),/不是.*无名袋/)
assert.doesNotMatch(text('c2n5_g4')+text('c2n5_g5'),/牛肉|保温盒/)
assert.match(text('c2n5_g5',{c2n5_b:true}),/牛肉谁吃/)
for(const [flags,expect] of [[{audit_evidence:true},/你让他保留/],[{data_audit:true},/待查项/],[{data_oppose:true},/离线支持联系人/],[{data_support:true},/修过也得复核/]])assert.match(text('c2am_0',flags),expect)
assert.match(text('c2d2_n10')+text('c2d2_n17')+text('c2n5_r3')+text('c2am_7'),/细线/)
assert.match(text('c2am_9'),/周老师.*年轻人讲/)
console.log(`PASS: ${changes.length} raw prose changes; all node fields/choices/media, non-story exports and ${states.length} runtime state combinations preserve interaction.`)
if(process.env.STORY_DIFF==='1')console.log(JSON.stringify({baseline,changes,variants:[...variants.values()]},null,2))
