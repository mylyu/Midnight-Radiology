// A single authored bridge after lung observation; older freezes see its exact inverse.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeDayCasesSource } from './ch2-day-cases-projection.mjs'

export const THICKNESS_BASELINE = '3d522c5b25f9d37c95e478372ba3b974c7266c21'
export const THICKNESS_QUESTION = '既然薄层这么好，干嘛还要重建厚层的？'
export const THICKNESS_REPLY = '同一套数据，其他设置不变，厚层的**噪点通常更少**，图也少些，先浏览一遍方便。薄层留着找细节，像这枚小结节，就不能只看厚层。两套都留，不冲突。'
const root = new URL('../../', import.meta.url), scene = 'app/src/game/ch2.ts'
const normalize = source => source.toString().replaceAll('\r\n', '\n').trimEnd() + '\n'
const git = (...args) => execFileSync('git', args, { cwd: fileURLToPath(root), maxBuffer: 32e6 })
const read = path => readFileSync(new URL(path, root))
const before = normalize(git('show', `${THICKNESS_BASELINE}:${scene}`))
const bridge = before.split('\n').find(line => /^  c2d2_w1ok: /.test(line))
assert(bridge?.endsWith("next: 'c2d2_7' },"))
const additions = [
  `  c2d2_thickness_question: { speaker: 'me', text: '${THICKNESS_QUESTION}', image: 'ct_lung', imageLabel: '本次数据 · 1 mm 薄层重建', next: 'c2d2_thickness_reply' },`,
  `  c2d2_thickness_reply: { speaker: 'zhou', sprite: 'char_zhou', text: '${THICKNESS_REPLY}', image: 'ct_lung', imageLabel: '本次数据 · 1 mm 薄层重建', next: 'c2d2_7' },`,
]
assert.equal(before.split(bridge).length, 2)
const after = before.replace(bridge, [bridge.replace("next: 'c2d2_7'", "next: 'c2d2_thickness_question'"), ...additions].join('\n'))

export function beforeThicknessDialogueSource(path, source) {
  if (path !== scene) return beforeDayCasesSource(path, source)
  let current = normalize(source)
  if (current === before) return source
  current = normalize(beforeDayCasesSource(path, current))
  assert.equal(current, after, `${path}: undocumented mutation outside the two exact thickness-dialogue nodes`)
  return before
}

export function assertThicknessDialogueLive() {
  const source = normalize(beforeDayCasesSource(scene, read(scene)))
  assert.equal(source, after, 'Thickness dialogue: exact authored question/reply and single bridge must be live')
  assert.equal(normalize(beforeThicknessDialogueSource(scene, source)), before)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assertThicknessDialogueLive()
  let sources = 0, media = 0
  for (const path of git('ls-tree', '-r', '--name-only', THICKNESS_BASELINE, '--', 'app/src').toString().trim().split('\n')) {
    assert.equal(normalize(beforeThicknessDialogueSource(path, read(path))), normalize(git('show', `${THICKNESS_BASELINE}:${path}`)), `${path}: no unrelated runtime change`)
    sources++
  }
  for (const entry of git('ls-tree', '-r', '-z', THICKNESS_BASELINE, '--', 'app/public').toString().split('\0').filter(Boolean)) {
    const [, hash, path] = /^\d+ blob ([0-9a-f]+)\t(.+)$/.exec(entry)
    const bytes = read(path)
    if (/\.(?:txt|html|svg)$/.test(path)) assert.equal(normalize(bytes), normalize(git('show', `${THICKNESS_BASELINE}:${path}`)))
    else assert.equal(createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'), hash, `${path}: unchanged media`)
    media++
  }
  for (const change of [after.replace(THICKNESS_REPLY, THICKNESS_REPLY + '错误'), after.replace("next: 'c2d2_thickness_reply'", "next: 'c2d2_7'"), after + '// extra\n']) {
    assert.throws(() => beforeThicknessDialogueSource(scene, change), /undocumented mutation/)
  }
  console.log(`PASS thickness dialogue: exact two speaker nodes and one next-link; ${sources} source files / ${media} existing public files unchanged after inverse; mutations rejected`)
}
