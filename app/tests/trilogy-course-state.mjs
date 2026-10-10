// Bounded numerical / saved-assessment checks. Not a browser playthrough.
import assert from 'node:assert/strict'
import { nuclearObject, emissionProjections, emissionFbp, accumulatedCounts, collimatorAcceptance } from '../src/game/trilogy-nuclear-numerics.ts'
import { TRILOGY } from '../src/game/trilogy-registry.ts'
import { TRILOGY_LEGACY_QUIZ } from '../src/game/trilogy-quiz-legacy.ts'
import { initializeTrilogy, patchTrilogy, trilogyQuizContent, startTrilogyQuiz, answerTrilogyQuiz, nextTrilogyQuiz, trilogyProgress } from '../src/game/trilogy-session.ts'
import { freshState } from '../src/game/store.ts'
const object = nuclearObject(), total = object.reduce((a,b)=>a+b,0)
const many = emissionProjections(object,64), few=emissionProjections(object,4)
for(let a=0;a<64;a++) assert(Math.abs(many.slice(a*64,(a+1)*64).reduce((x,y)=>x+y,0)-total)<1e-8,'Projection preserves total activity')
const fine=emissionFbp(many,64),coarse=emissionFbp(few,4)
const error=a=>a.reduce((sum,v,i)=>sum+(v-object[i])**2,0)/a.length
assert(error(fine)<error(coarse),'More views resolve the same activity distribution with fewer streaks')
const early=accumulatedCounts(1),late=accumulatedCounts(20)
assert(early.counts.every((v,i)=>late.counts[i]>=v),'Later exposure includes the earlier events')
assert(error(late.image)<error(early.image),'Accumulating the same object reduces relative random error')
assert.deepEqual(accumulatedCounts(20).image,late.image,'Fixed random seed survives repeat rendering')
assert(collimatorAcceptance(7,50)<collimatorAcceptance(7,10))
assert.equal(collimatorAcceptance(0,50),1)
for(const chapter of Object.values(TRILOGY)){
 let s=initializeTrilogy(freshState('f'),chapter,'course-quiz')
 s=startTrilogyQuiz(s,chapter)
 assert.deepEqual(trilogyQuizContent(s,chapter),chapter.quiz,'New quizzes freeze current course content')
 const changed={...chapter,quiz:chapter.quiz.map(q=>({...q,answer:(q.answer+1)%q.options.length}))}
 assert.deepEqual(trilogyQuizContent(s,changed),chapter.quiz,'A later content edit cannot regrade an ongoing quiz')
 let old=patchTrilogy(s,chapter.id,{quizContent:undefined})
 assert.deepEqual(trilogyQuizContent(old,chapter),TRILOGY_LEGACY_QUIZ[chapter.id])
 for(let i=0;i<5;i++){
  const p=trilogyProgress(old,chapter.id),row=p.quiz.questions[p.quiz.index]
  old=answerTrilogyQuiz(old,chapter,trilogyQuizContent(old,chapter)[row.question].answer)
  old=nextTrilogyQuiz(old,chapter)
 }
 assert.equal(trilogyProgress(old,chapter.id).quiz.grade,'S','Old saved questions use their old answers')
 const once=structuredClone(old); assert.deepEqual(nextTrilogyQuiz(old,chapter),once,'Assessment reward stays idempotent')
}
console.log('PASS same-object SPECT, accumulated counts, collimation and old/new assessment content')
