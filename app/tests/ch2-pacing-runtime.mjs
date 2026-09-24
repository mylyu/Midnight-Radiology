import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import {beforeMysterySource} from './ch2-mystery-projection.mjs'
import {CH2_SHIFTS, QUIZ2} from '../src/game/ch2.ts'
import {freshState, applyEffect} from '../src/game/store.ts'
import {restartCh2} from '../src/game/ch2-exploration.ts'
import {ch2GiftChoices,giveCh2Gift} from '../src/game/ch2-gifts.ts'
import {patchCh2,ch2Phase,settleCh2,nextCh2Shift,redeemCh2Coffee,buyCh2Item,ch2ItemUnavailable,shareCh2Item,startCh2Quiz,answerCh2Quiz,nextCh2Question,ch2QuizScore} from '../src/game/ch2-session.ts'

const initial={...freshState('m'),night:4,gold:10000,buyCount:42,lotteryNight:4,lotteryCount:3,screenHint:'day',stepId:'n4_end',resumeKey:'4-n4_end',viewBg:'bg_day',flags:{quiz_grade:'S',quiz2_grade:'A',n5_qian:true,n5_fan:true},dlc:{dr:{done:true,served:['ge']},dsa:{dose:20,pedalTry:4},ch2:{shift:'c2n1',stepId:'c2n1_hub',phase:'story'}}}
const frozen=s=>({night:s.night,buyCount:s.buyCount,lotteryNight:s.lotteryNight,lotteryCount:s.lotteryCount,screenHint:s.screenHint,stepId:s.stepId,resumeKey:s.resumeKey,viewBg:s.viewBg,quiz_grade:s.flags.quiz_grade,n5_qian:s.flags.n5_qian,n5_fan:s.flags.n5_fan,dr:s.dlc.dr,dsa:s.dlc.dsa})
let s=structuredClone(initial)
for(const id of ['milktea','snack','book','toolbox','dosimeter']){
 const before=s.gold
 s=buyCh2Item(s,id).state
 assert(s.items.includes(id))
 assert(s.gold<before)
 assert.equal(buyCh2Item(s,id).state,s,'duplicate item is never charged')
}
assert.equal(s.heart,2);assert.equal(s.skill,2)
assert.match(ch2ItemUnavailable(s,'key'),/第二班/)
const beforeCoffee=s.ap;s=buyCh2Item(s,'coffee').state;assert.equal(s.ap,beforeCoffee+1)
for(let i=0;i<5;i++)s=buyCh2Item(s,'lottery',0).state
assert.match(ch2ItemUnavailable(s,'lottery'),/五张/)
assert.equal(s.dlc.ch2.shop.lotteryCount,5)
assert.deepEqual(frozen(s),frozen(initial))

const settles=[]
for(const shift of CH2_SHIFTS.slice(0,5)){
 const end=Object.entries(shift.steps).find(([,step])=>step.end)[0]
 s=patchCh2(s,{phase:'story',shift:shift.id,stepId:end})
 s=settleCh2(s,shift.id)
 assert.equal(ch2Phase(s),'settle');assert.equal(s.dlc.ch2.shift,shift.id);assert.equal(s.dlc.ch2.stepId,end)
 assert.equal(settleCh2(s,shift.id),s)
 const roundtrip=JSON.parse(JSON.stringify(s));assert.equal(ch2Phase(roundtrip),'settle')
 settles.push(shift.id)
 if(shift.id==='c2n1'){
  assert.match(ch2ItemUnavailable(s,'lottery'),/五张/)
  s=buyCh2Item(s,'coffee').state;assert(s.dlc.ch2.pendingCoffee)
  assert.equal(buyCh2Item(s,'coffee').state,s)
  // Approved loop round moves sharing to an in-person conversation, retaining the original item/reward assertions.
  assert.equal(shareCh2Item(s,'milktea'),s);assert.equal(shareCh2Item(s,'snack'),s)
  assert(s.items.includes('milktea')&&s.items.includes('snack'),'settlement cannot consume gifts')
  let chat=patchCh2(s,{phase:'story',stepId:'c2n1_chat_q'})
  const milk=ch2GiftChoices(chat,'c2n1_chat_q').find(c=>c.next.endsWith(':milktea'))
  chat=giveCh2Gift(chat,'c2n1_chat_q',milk.next).state
  assert(!chat.items.includes('milktea'));assert.equal(chat.heart,2)
  const h=chat.heart,snack=ch2GiftChoices(chat,'c2n1_gap_chair_q').find(c=>c.next.endsWith(':snack'))
  chat=giveCh2Gift(chat,'c2n1_gap_chair_q',snack.next).state
  assert.equal(chat.heart,h+1);assert(!chat.items.includes('snack'))
  assert.equal(giveCh2Gift(chat,'c2n1_gap_chair_q',snack.next).state,chat)
  s=patchCh2(chat,{phase:'settle',stepId:end,giftReply:undefined})
 }
 if(shift.id==='c2n5')assert.match(ch2ItemUnavailable(s,'coffee'),/没有夜间自由探索/)
 const next=nextCh2Shift(s);assert.equal(ch2Phase(next),'story');assert.notEqual(next.dlc.ch2.shift,shift.id)
 assert.equal(nextCh2Shift(next),next)
 s=next
 if(s.dlc.ch2.shift==='c2d2'){
  assert.equal(ch2ItemUnavailable(s,'key'),undefined)
  s=buyCh2Item(s,'key').state;assert(s.items.includes('key'))
  s=buyCh2Item(s,'lottery',.99).state;assert.equal(s.dlc.ch2.shop.lotteryCount,1)
 }
 if(s.dlc.ch2.shift==='c2n3'){
  s=applyEffect(s,{ap:3});const before=s.ap
  s=redeemCh2Coffee(s,'c2n3_hub');assert.equal(s.ap,before+1);assert(!s.dlc.ch2.pendingCoffee)
  assert.equal(redeemCh2Coffee(s,'c2n3_hub'),s)
 }
}
assert.equal(settles.length,5)
assert.deepEqual(frozen(s),frozen(initial))
assert.match(ch2ItemUnavailable(patchCh2({...initial,items:[],flags:{...initial.flags,c2_chair_passed:true}},{shift:'c2n1'}),'toolbox'),/机会已过/)
assert.match(ch2ItemUnavailable(patchCh2({...initial,items:[]},{shift:'c2n1',phase:'settle'}),'toolbox'),/机会已过/)
assert.equal(ch2ItemUnavailable(patchCh2({...initial,items:[],flags:{...initial.flags,c2n5_cabinet:true}},{shift:'c2n5'}),'key'),undefined,'Main archive finished, but the separate small cabinet may still be visited')
assert.match(ch2ItemUnavailable(patchCh2({...initial,items:[],flags:{...initial.flags,c2n5_cabinet:true,c2_payoff_base:true}},{shift:'c2n5'}),'key'),/已结束/)
assert.match(ch2ItemUnavailable(patchCh2({...initial,items:[],flags:{...initial.flags,c2n5_cabinet:true}},{shift:'c2n5',stepId:'c2n5_m0'}),'key'),/已结束/)
assert.match(ch2ItemUnavailable(patchCh2({...initial,items:[]},{shift:'c2n5',appliedSteps:['ch2-c2n5_m14a']}),'dosimeter'),/已结束/)
for(const stepId of ['c2n5_m13b','c2n5_m13c','c2n5_m15','c2n5_m17','c2n5_n6','c2n5_g1'])assert.match(ch2ItemUnavailable(patchCh2({...initial,items:[]},{shift:'c2n5',stepId}),'dosimeter'),/已结束/)

// A stale second-chapter grade never replaces a fresh five-question exam.
s=startCh2Quiz(s,12345)
assert(!s.dlc.ch2.quiz.completed);assert.equal(s.dlc.ch2.quiz.questions.length,5)
assert.equal(new Set(s.dlc.ch2.quiz.questions.map(q=>q.question)).size,5)
assert.deepEqual(startCh2Quiz(s,999).dlc.ch2.quiz,s.dlc.ch2.quiz)
const beforeQuiz=s.gold
for(let n=0;n<5;n++){
 const q=s.dlc.ch2.quiz.questions[n]
 const correct=q.order.indexOf(QUIZ2[q.question].answer)
 s=answerCh2Quiz(s,correct);assert.equal(answerCh2Quiz(s,(correct+1)%q.order.length),s)
 s=JSON.parse(JSON.stringify(s));assert.equal(s.dlc.ch2.quiz.questions[n].selected,correct)
 s=nextCh2Question(s)
}
assert.equal(ch2QuizScore(s.dlc.ch2.quiz),5);assert.equal(s.dlc.ch2.quiz.grade,'S');assert.equal(s.gold,beforeQuiz+250)
assert.equal(nextCh2Question(s),s);assert.equal(answerCh2Quiz(s,0),s)
assert.deepEqual(frozen(s),frozen(initial))
const post=patchCh2(s,{phase:'story',shift:'c2am',stepId:'c2am_3'})
assert.equal(ch2Phase(post),'story','post-quiz legacy/modern cursor continues normally')
const completed=settleCh2(post,'c2am');assert.equal(ch2Phase(completed),'done');assert.equal(startCh2Quiz(completed),completed)
const restart=restartCh2(s);assert.equal(restart.flags.quiz2_grade,undefined);assert.equal(restart.flags.quiz_grade,'S');assert.deepEqual(frozen(restart),frozen(initial))
assert.deepEqual(restart.dlc.ch2,{})

// Exact source guards, not behavior approximations, for all non-Ch2 App code.
const old=execFileSync('git',['show','1452d78:app/src/App.tsx'],{encoding:'utf8'})
const now=beforeMysterySource('app/src/App.tsx',readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8'))
// Exact allowlist of additional Ch2 imports; original shared imports stay checked.
const withoutCh2=text=>text.replace(/^import .*['"]\.\/(?:components\/(?:Ch2Shop|Ch2Settlement|Ch2ScanOverlay|Ch2ObservationImage)|game\/(?:ch2-session|ch2-scans|ch2-observations|ch2-ledger|ch2-gifts|ch2-playback))['"]\r?\n/gm,'')
 .replace(/, CH2_CARDS, CH2_ACTIVE_CARDS, CH2_CARDS_LEGACY(?=,)/,'')
 .replace(/function Ch2Screen\([\s\S]*?(?=\/\* ================= 第二章 · 窗宽窗位)/,'')
 .replace(/function Ch2Quiz\([\s\S]*?(?=\/\* ================= DLC 番外篇大厅)/,'').replaceAll('\r\n','\n')
assert.equal(withoutCh2(now),withoutCh2(old),'All App code outside Ch2Screen/Ch2Quiz/imports must remain byte-equivalent')
for(const path of ['app/src/game/data.ts','app/src/game/store.ts','app/src/game/dlc.ts']){
 let source=readFileSync(new URL('../../'+path,import.meta.url),'utf8').replaceAll('\r\n','\n')
 // Preserve 1452d78's historical baseline while exactly reversing the separately approved 05889fa voice-only remap.
 if(path.endsWith('/store.ts')){
  const voicePatch="    // Chapter 1 voice-only revision: retain old assets and volume, use new filenames to avoid stale audio caches.\n    const revisedVoiceFiles: Partial<Record<SfxName, string>> = {\n      vox_fan: 'vox_ch1_fan_mature_20260923',\n      vox_worker: 'vox_ch1_worker_bass_20260923',\n      vox_thin: 'vox_ch1_thin_breathless_20260923',\n    }\n    const src = `${import.meta.env.BASE_URL}audio/${revisedVoiceFiles[name] ?? name}.mp3?v=2`"
  assert(source.includes(voicePatch),'The permitted voice mapping must be the exact accepted patch')
  source=source.replace(voicePatch,'    const src = `${import.meta.env.BASE_URL}audio/${name}.mp3?v=2`')
 }
 assert.equal(source,execFileSync('git',['show','1452d78:'+path],{encoding:'utf8'}).replaceAll('\r\n','\n'))
}
console.log('PASS: five persistent settlements; all 8 goods; independent counters; coffee carry/redeem; in-dialogue gift sharing and no-op settlement; expired purposes; persistent quiz + stale-grade/reward/restart protection; Ch1/DR/DSA exact-source and state guards (approved voice remap projected explicitly).')
