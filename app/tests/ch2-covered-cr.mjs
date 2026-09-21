import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { CH2_SHIFTS, ch2BackgroundAsset } from '../src/game/ch2.ts'

const root = new URL('../../', import.meta.url)
const read = path => readFileSync(new URL(path, root))
const source = read('app/src/game/ch2.ts').toString().replaceAll('\r\n', '\n')
const baseline = execFileSync('git', ['show', '64cd2f6:app/src/game/ch2.ts'], { encoding: 'utf8' }).replaceAll('\r\n', '\n')
const before = "c2n1_an1: { bg: 'bg_corridor'"
const after = "c2n1_an1: { bg: 'bg_corridor_cr_covered'"
assert.equal(source, baseline.replace(before, after), 'Only one background key may change; all dialogue, voices and interactions stay exact')
const steps = Object.assign({}, ...CH2_SHIFTS.map(s => s.steps))
assert.equal(steps.c2n1_an1.bg, 'bg_corridor_cr_covered')
assert.equal(steps.c2n1_ab1.bg, 'bg_corridor', 'Do not change the sealed-parts branch')
assert.equal(steps.c2n1_hub.bg, 'bg_ctcontrol', 'Returning to exploration must leave the corridor')
assert.equal(ch2BackgroundAsset(steps.c2n1_an1.bg), 'bg_corridor_cr_covered')
assert.equal(ch2BackgroundAsset('bg_corridor'), 'bg_corridor')
const hash = path => createHash('sha256').update(read(path)).digest('hex')
assert.equal(hash('app/public/assets/bg_corridor.png'), '2f76e25038eb69e569744315d2cac00f8ccdc8abcb5d64e5e4bf8fbd8eaad0f0')
assert.equal(hash('app/public/assets/bg_corridor_cr_covered.png'), '4165fab299c606050e513f96eee6a9af54f8be8ea81253b4edbe7e178de2a912')
const png = read('app/public/assets/bg_corridor_cr_covered.png')
assert.equal(png.subarray(1, 4).toString(), 'PNG')
assert(png.readUInt32BE(16) >= 1500 && png.readUInt32BE(20) >= 900)
console.log('PASS: single background-only change, original/shared art intact, exact asset hash, unmodified dialogue/voice/interaction data.')
