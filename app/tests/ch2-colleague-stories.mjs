// Historical colleague-round scope and social-reward regression. The approved
// pacing round is reversed through exact verified hunks, not loaded from Git.
// Current paths/rewards/UI have independent ch2-pacing-* live tests.
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import {beforePacing as live, beforePacingSocial, beforePacingSource} from './ch2-pacing-projection.mjs'
const {CH2_SOCIAL_STEPS, ch2SocialShifts} = beforePacingSocial
import {CH2_DEFERRED_STEPS, originalCh2Step, restartCh2} from '../src/game/ch2-exploration.ts'
import {applyEffect, condOk, freshState} from '../src/game/store.ts'
import {beforeSocial as old} from './ch2-colleague-projection.mjs'

const root = new URL('../../', import.meta.url)
const steps = Object.assign({}, ...live.CH2_SHIFTS.map(s => s.steps))
const oldSteps = Object.assign({}, ...old.CH2_SHIFTS.map(s => s.steps))
const added = Object.assign({}, ...Object.values(CH2_SOCIAL_STEPS))
const removed = Object.keys(oldSteps).filter(id => !steps[id])
assert.equal(removed.length, 32)
assert.deepEqual(removed.sort(), Object.keys(CH2_DEFERRED_STEPS).sort())
assert.deepEqual(Object.keys(steps).filter(id => !oldSteps[id]).sort(), Object.keys(added).sort())
const allowed = {
  c2n1_c4a:['next'], c2n1_c4b:['next'], c2n1_c4c:['next'], c2n1_c4d:['next'],
  c2d2_w2ok:['next'], c2d2_p1:['bg'], c2n3_hub:['choices'], c2n3_a4a:['next'], c2n3_a4b:['next'],
  c2d4_p2c:['text'], c2d4_p3b:['card'], c2d4_e8:['text'], c2d4_reg2:['next'],
  c2n5_hub:['choices'], c2n5_n5:['next'], c2n5_n6:['bg','text','choices'], c2n5_g0:['text'],
  c2am_0:['text'], c2am_4:['text'], c2am_6:['next'],
}
const without = (object, keys) => Object.fromEntries(Object.entries(object).filter(([key]) => !keys.includes(key)))
for (const [id, was] of Object.entries(oldSteps)) {
  if (CH2_DEFERRED_STEPS[id]) continue
  assert.deepEqual(without(steps[id], allowed[id] ?? []), without(was, allowed[id] ?? []), 'Unexpected original-node change: ' + id)
  if ([was.sfx,was.sfx2].some(s => /^(vox|cry_child|groan)/.test(s ?? ''))) {
    assert.deepEqual(steps[id], was, 'Approved audible entrance must stay exact: ' + id)
  }
}
for (const path of ['app/src/App.tsx','app/src/game/data.ts','app/src/game/dlc.ts','app/src/game/types.ts','app/src/game/store.ts','app/src/game/ch2-patients.ts','app/src/index.css','深夜影像科/全书剧情总线.md']) {
  const normalize = s => s.replaceAll('\r\n','\n')
  assert.equal(normalize(beforePacingSource(path, readFileSync(new URL(path,root),'utf8'))), normalize(execFileSync('git',['show','4f70852:'+path],{encoding:'utf8',maxBuffer:4e6})), path + ': outside historical colleague round')
}
assert.equal(execFileSync('git',['diff','--name-only','--diff-filter=DMRTUXB','4f70852','--','app/public/audio','app/public/assets'],{encoding:'utf8',cwd:root}).trim(),'','No existing media rewritten')
// Later author-approved media may be additive only, with exact named files.
const allowedLaterMedia = new Set([
  'app/public/assets/ch2_bg_breakroom_day.png', 'app/public/assets/ch2_ct_aortic_wide.png',
  'app/public/assets/ch2_ct_coronary_slices.png', 'app/public/assets/ch2_patient_fall_bandaged_bed.png',
  'app/public/assets/ch2_remote_rack.png', 'app/public/assets/ch2_remote_rack_offline.png',
  'app/public/audio/vox_ch2_natural_kai_light_v3.mp3',
  'app/public/audio/vox_ch2_natural_kai_whisper_v4.mp3',
  'app/public/audio/vox_ch2_natural_kai_soft_shi_v5.mp3',
  'app/public/audio/vox_ch2_natural_kai_soft_shi_v6.mp3', // Author-requested stronger attenuation audition only.
  'app/public/audio/vox_ch2_natural_kai_noref_b_v9.mp3', // Author-selected no-reference candidate B.
])
const newMedia = [
  execFileSync('git',['diff','--name-only','--diff-filter=A','4f70852','--','app/public/audio','app/public/assets'],{encoding:'utf8',cwd:root}),
  execFileSync('git',['ls-files','--others','--exclude-standard','--','app/public/audio','app/public/assets'],{encoding:'utf8',cwd:root}),
].join('\n').trim().split(/\r?\n/).filter(Boolean)
for (const path of newMedia) assert(allowedLaterMedia.has(path), 'Undocumented media addition: ' + path)
assert.deepEqual(live.CH2_BOOK_PAGES,old.CH2_BOOK_PAGES)
assert.deepEqual(live.QUIZ2.filter((_,i)=>i!==21),old.QUIZ2.filter((_,i)=>i!==21))
assert.equal(live.QUIZ2.length,24)

for (const [id, target] of Object.entries(CH2_DEFERRED_STEPS)) {
  assert.equal(originalCh2Step(id),target)
  assert(steps[target]); assert(!steps[id])
  assert.equal(live.CH2_SHIFTS.find(s=>s.steps[target]).id,old.CH2_SHIFTS.find(s=>s.steps[id]).id)
}
for (const shift of live.CH2_SHIFTS) {
  const queue=[shift.start],seen=new Set()
  while(queue.length) {
    const id=queue.pop()
    if(id.startsWith('@')||seen.has(id))continue
    seen.add(id)
    const s=shift.steps[id]
    assert(s,'Missing node '+id)
    assert.doesNotMatch(s.text??'',/陆舟|陆川|环状伪影|第217号|CT仍停机|机器仍停着|等机器修好/)
    assert.notEqual(s.sfx,'vox_luzhou'); assert.notEqual(s.effect?.flag,'ai_hook')
    const targets=[s.next,s.windowTask?.success,s.checklist?.next,...(s.choices??[]).flatMap(c=>[c.next,c.risk?.next])].filter(Boolean)
    assert(s.end||targets.length,'Dead end '+id)
    queue.push(...targets)
  }
  for(const id of Object.keys(CH2_SOCIAL_STEPS[shift.id]??{}))assert(seen.has(id),'New scene unreachable '+id)
}
for (const [id,s] of Object.entries(added)) {
  assert(!s.sfx&&!s.sfx2&&!s.windowTask&&!s.checklist,'Text/portrait dialogue only: '+id)
  if(s.effect?.flag)assert.match(s.effect.flag,/^c2/)
  assert((s.text?.length??0)<=130,'Keep optional dialogue short: '+id)
}

// Truthful recollections and dialogue gates, across the complete flag space.
const base={...freshState('f'),seed:1234,finished:true,gold:500,ap:3}
const render=(id,s)=>live.ch2StepForState(id,steps[id],s)
const dayFlags=['c2n1_chat_sign','c2d2_chat_lei','c2n3_chat_joke','c2d4_chat_food','c2n5_chat_sign']
for(let mask=0;mask<32;mask++)for(const lei of [false,true])for(const wen of [false,true]) {
  const flags=Object.fromEntries(dayFlags.map((f,i)=>[f,Boolean(mask&(1<<i))]))
  Object.assign(flags,{c2_social_lei:lei,c2_social_wen:wen})
  const s={...base,flags}
  const count=dayFlags.filter(f=>flags[f]).length+(!flags.c2n3_chat_joke&&wen?1:0)
  assert.equal(ch2SocialShifts(s),count)
  assert.equal(render('c2n5_chat_end',s).effect.badge==='c2_tea_regular',count>=3&&flags.c2n5_chat_sign)
  const choices=render('c2n5_chat_q',s).choices
  assert.equal(choices.some(c=>c.next==='c2n5_chat_both1'),lei&&wen)
  assert.equal(choices.some(c=>c.next==='c2n5_chat_plain'),!(lei&&wen))
  assert.equal(render('c2n5_chat_both3',s).effect?.badge==='c2_two_sides',lei&&wen)
  assert.doesNotMatch(render('c2n3_chat_sign1',s).text,flags.c2d2_chat_lei?/^他们发来/:/你中午听我说/)
}
const flags={c2n1_chat_sign:true,c2d2_chat_lei:true,c2_social_lei:true,c2_social_wen:true,c2n5_chat_sign:true}
let awarded={...base,flags}
for(let n=0;n<4;n++)for(const id of ['c2n5_chat_both3','c2n5_chat_end'])awarded=applyEffect(awarded,render(id,awarded).effect)
assert.equal(awarded.badges.filter(b=>b==='c2_tea_regular').length,1)
assert.equal(awarded.badges.filter(b=>b==='c2_two_sides').length,1)
assert.equal(condOk(awarded,steps.c2n5_hub.choices.find(c=>c.next==='c2n5_chat0').cond),false,'Completed chat must disappear')
for(const ap of [0,1,3])assert.equal(condOk({...base,ap},steps.c2n3_hub.choices.find(c=>c.next==='c2n3_chat0').cond),ap>=1)
const historic={...awarded,badges:[...awarded.badges,'phantom_friend','wrench_night'],cards:['ring_artifact'],events:['ch2_luzhou'],flags:{...awarded.flags,pacs_log:true,mystery_told:true,phantom_log:true}}
const restarted=restartCh2(historic)
assert.deepEqual(restarted.badges,historic.badges);assert.deepEqual(restarted.cards,historic.cards);assert.deepEqual(restarted.events,historic.events)
assert(restarted.flags.pacs_log&&restarted.flags.mystery_told)
assert(restarted.flags.phantom_log,'Retired evidence must survive a new run because it cannot be earned again')
assert(!Object.keys(restarted.flags).some(f=>f.startsWith('c2')))

// Pure playthroughs use the same rendering/effects/conditions as the game.
// Random choices cover optional skip, conversations, existing lucky accidents,
// and all three data decisions. This does not claim to reproduce Edge freezes.
const exits={c2n1_chat_q:'c2n1_c5',c2d2_lunch_q:'c2d2_lunch_end',c2n3_chat_q:'c2n3_chat_end',c2n3_chat_wen_q:'c2n3_a5',c2d4_chat_q:'c2d4_e9',c2n5_chat_q:'c2n5_chat_end'}
function walk(seed,skip=false) {
  let s={...base,flags:{pacs_log:true},dlc:{ch2:{}},items:['key','book','snack','milktea','toolbox'],ap:0},rng=seed
  const seen=new Set()
  const random=()=>((rng=(Math.imul(1664525,rng)+1013904223)>>>0)/2**32)
  for(const shift of live.CH2_SHIFTS.slice(0,5)){
    let id=shift.start,ended=false
    for(let n=0;n<600;n++) {
      const step=live.ch2StepForState(id,shift.steps[id],s)
      if(step.skipUnlessFlag&&!s.flags[step.skipUnlessFlag]){id=step.next;continue}
      if(!seen.has(id)){s=applyEffect(s,step.effect);seen.add(id)}
      if(step.end){ended=true;break}
      if(step.choices){
        const choices=live.ch2StepForState(id,shift.steps[id],s).choices.filter(c=>!c.next.startsWith('@')&&condOk(s,c.cond))
        assert(choices.length,'No usable choice '+id)
        const choice=skip&&exits[id]?choices.find(c=>c.next===exits[id]):skip&&id.endsWith('_hub')?choices.find(c=>c.text.startsWith('【开诊】'))??choices.find(c=>c.next==='c2n5_a1'):choices[Math.floor(random()*choices.length)]
        assert(choice,'Missing skip exit '+id)
        s=applyEffect(s,choice.effect)
        if(choice.risk&&random()<choice.risk.chance){s=applyEffect(s,choice.risk.effect);id=choice.risk.next}else id=choice.next
      }else id=step.windowTask?.success??step.next
      assert(shift.steps[id],id)
      s=JSON.parse(JSON.stringify(s)) // Every transition is save/reload safe.
    }
    assert(ended,'Failed to reach shift end '+shift.id)
  }
  if(skip)assert(!s.badges.some(b=>b.startsWith('c2_')))
  return s
}
const outcomes=new Set()
for(let seed=1;seed<=100;seed++){
  const a=walk(seed),b=walk(seed)
  assert.deepEqual(a,b)
  for(const flag of ['data_audit','data_oppose','data_support'])if(a.flags[flag])outcomes.add(flag)
}
walk(1,true)
assert.equal(outcomes.size,3)
console.log('PASS historical colleague round (validated pacing deltas projected out): scope/UI/Ch1/bus, 32 migrations, 128 badge/gating states, replay/history, 100 deterministic five-shift route pairs; live preexisting media untouched and additive media allowlist enforced.')
