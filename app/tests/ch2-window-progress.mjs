import assert from 'node:assert/strict'
import { CH2_SHIFTS } from '../src/game/ch2.ts'
import { freshState } from '../src/game/store.ts'
import { restartCh2 } from '../src/game/ch2-exploration.ts'
import { recordCh2WindowAttempt } from '../src/game/ch2-window-progress.ts'

const first = 'c2n1_m11', second = 'c2n1_w2'
const task = id => CH2_SHIFTS.flatMap(shift => Object.entries(shift.steps)).find(([key]) => key === id)[1].windowTask
const reload = s => JSON.parse(JSON.stringify(s))
const move = (s, id) => ({ ...s, dlc: { ...s.dlc, ch2: { ...s.dlc.ch2, stepId: id } } })
const attempt = (s, id, good = true, expected = s.dlc.ch2.windowTasks?.[id]?.attempts ?? 0) =>
  recordCh2WindowAttempt(s, id, task(id), expected, good ? task(id).targetW : 2000, good ? task(id).targetL : 500)
const base = () => ({ ...freshState('f'), seed: 240926, badges: ['fixer'], flags: { quiz_grade: 'S', old_register: true },
  finished: true, night: 5, buyCount: 22, gold: 567, items: ['toolbox'],
  dlc: { dr: { done: true }, dsa: { dose: 13 }, ch2: { phase: 'story', shift: 'c2n1', stepId: first } } })
const inherited = s => {
  const { dlc, badges, ...other } = s
  return { ...other, badges: badges.filter(id => id !== 'window_master'), dr: dlc.dr, dsa: dlc.dsa }
}

let s = base()
const input = s
const original = reload(s)
s = attempt(s, first, false)
assert.deepEqual(input, original, 'Input fixture is not mutated')
assert.deepEqual(s.dlc.ch2.windowTasks[first], { attempts: 1, completed: false, width: 2000, level: 500, stage: 1 })
assert.equal(s.dlc.ch2.stepId, first)
assert.equal(attempt(s, first, false, 0), s, 'Duplicate confirmation with same expected count is ignored')
s = attempt(reload(s), first)
assert.equal(s.dlc.ch2.windowTasks[first].attempts, 2, 'A failed try survives reload')
assert.equal(s.dlc.ch2.stepId, task(first).success, 'Successful result and next cursor are saved atomically')
assert(!s.badges.includes('window_master'), 'The first stage alone is insufficient')
assert.equal(attempt(s, first), s, 'Stale completed callback is ignored')
s = attempt(move(reload(s), second), second, false)
s = attempt(reload(s), second)
assert.equal(s.dlc.ch2.windowTasks[second].attempts, 2)
assert.equal(s.badges.filter(id => id === 'window_master').length, 1)
assert.equal(s.dlc.ch2.loop.entries.filter(row => row.id === 'window-master').length, 1)
assert.deepEqual(inherited(s), inherited(original), 'Neither shared stats/flags nor Chapter 1/DR/DSA progress changes')
const duplicate = move(reload(s), second)
assert.equal(attempt(duplicate, second), duplicate, 'Completed task cannot replay a result or award')

for (const exceeded of [first, second]) {
  let run = base()
  for (const id of [first, second]) {
    run = move(run, id)
    if (id === exceeded) { run = attempt(run, id, false); run = attempt(reload(run), id, false) }
    run = attempt(reload(run), id)
  }
  assert.equal(run.dlc.ch2.windowTasks[exceeded].attempts, 3)
  assert(!run.badges.includes('window_master'), `${exceeded}: >2 attempts cannot be erased by refreshing`)
}
const legacy = attempt(move(base(), second), second)
assert(!legacy.badges.includes('window_master'), 'Old saves without reliable first-stage records do not invent a result')
let later = attempt(move(base(), 'c2d2_w1'), 'c2d2_w1')
later = attempt(move(later, second), second)
assert(later.dlc.ch2.windowTasks.c2d2_w1.completed)
assert(!later.badges.includes('window_master'), 'An unrelated window task does not substitute for brain window')
for (const change of [{ phase: 'settle' }, { phase: 'quiz' }, { done: true }, { stepId: second }]) {
  const state = base(); Object.assign(state.dlc.ch2, change)
  assert.equal(attempt(state, first), state, 'Non-story/stale callbacks cannot mutate saved attempts')
}
for (const [width, level] of [[NaN, 30], [80, Infinity]]) {
  const state = base()
  assert.equal(recordCh2WindowAttempt(state, first, task(first), 0, width, level), state)
}
const replay = restartCh2(s)
assert.equal(replay.dlc.ch2.windowTasks, undefined, 'A real replay clears run-local attempts')
assert(replay.badges.includes('window_master'), 'Historical earned badges are not revoked on replay')
assert.deepEqual(replay.dlc.dr, s.dlc.dr); assert.deepEqual(replay.dlc.dsa, s.dlc.dsa)
assert.equal(replay.flags.quiz_grade, 'S')
console.log('PASS ch2-window-progress: durable attempts, two-stage limits, atomic award/cursor, duplicate/reload/legacy/replay protection')
