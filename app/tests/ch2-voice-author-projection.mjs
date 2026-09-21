// Explicit, asserted inverse of the 2026-09-21 author decisions for earlier
// regression audits. The current round is also checked against 7032d58 in full.
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {beforeCoveredCrPass} from './ch2-covered-cr-projection.mjs'
const edits=JSON.parse(readFileSync(new URL('../../docs/ch2-voice-author-changes.json',import.meta.url),'utf8'))
export function beforeAuthorPass(id,step) {
 step=beforeCoveredCrPass(id,step)
 const row=edits.find(r=>r.step===id)
 if(!row)return step
 assert.equal(step.text,row.afterText,id+' author text drift')
 assert.equal(step.sfx,row.afterSfx??undefined,id+' author sound drift')
 return {...step,text:row.beforeText,sfx:row.beforeSfx}
}
