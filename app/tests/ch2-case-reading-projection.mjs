// Only the approved, completion-gated case citation may differ from this baseline.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeCtSequencesSource } from './ch2-ct-sequences-projection.mjs'

const root = new URL('../../', import.meta.url)
export const CASE_READING_BASELINE = 'a2cc9dc'
export const CASE_READING_FILE = 'app/src/components/Ch2Settlement.tsx'
const normalize = source => source.replaceAll('\r\n', '\n').trimEnd() + '\n'
const addition = [
  '      {complete && <section data-ch2-case-reading className={`${metricStyle} mb-3`} aria-labelledby="ch2-case-reading-title">',
  '        <h3 id="ch2-case-reading-title" className="text-sm text-amber-200">延伸阅读 · “十五根针”的真实原型</h3>',
  '        <p className="mt-2 text-sm leading-relaxed text-slate-200">还记得罗阿姨片子上的亮点吗？真实病例中，CT三维重建显示患者颈背部椎旁肌内留有15根针，追溯到约30年前的一次留针治疗。想看看真实影像和完整经过，可以课后读读原文。</p>',
  '        <p className="mt-2 text-xs leading-relaxed text-slate-400">罗阿姨的人物、就诊经过与对话为游戏改编。原报道涉及一种罕见的留针做法，并非普通针灸的常态，也不代表长期留针普遍安全。</p>',
  '        <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC6301504/" target="_blank" rel="noopener noreferrer"',
  '          className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-teal-500/60 px-3 py-2 text-sm text-teal-200 underline underline-offset-4 hover:bg-teal-900/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300">阅读真实病例与原始影像 ↗</a>',
  '        <p className="mt-2 break-words text-xs leading-relaxed text-slate-400"><cite>Point of emphasis: retained acupuncture needles after 30 years</cite><br />BMJ Case Reports · 2018 · 英文全文（新标签页打开）</p>',
  '      </section>}',
  '',
].join('\n') + '\n'
let baselineSource
const original = () => baselineSource ??= normalize(execFileSync('git', ['show', `${CASE_READING_BASELINE}:${CASE_READING_FILE}`],
  { cwd: fileURLToPath(root), encoding: 'utf8', maxBuffer: 8e6 }))
const insertionAnchor = '      </header>\n\n'

export function beforeCaseReadingSource(path, source) {
  source = beforeCtSequencesSource(path, source)
  if (path !== CASE_READING_FILE) return source
  const live = normalize(source)
  if (live === original()) return source // Exact, already-validated historical input.
  assert.equal(live.split(addition).length, 2, `${path}: undocumented mutation in case-reading section`)
  assert(live.includes(insertionAnchor + addition), `${path}: undocumented mutation in case-reading placement`)
  const restored = live.replace(addition, '')
  assert.equal(restored, original(), `${path}: undocumented mutation outside case-reading section`)
  return restored
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const live = readFileSync(new URL(CASE_READING_FILE, root), 'utf8')
  assert.equal(normalize(beforeCaseReadingSource(CASE_READING_FILE, live)), original())
  const nonemptyLines = addition.split('\n').filter(line => line.trim())
  for (const line of nonemptyLines) {
    assert.throws(() => beforeCaseReadingSource(CASE_READING_FILE, live.replace(line, `${line} unauthorized`)), /undocumented mutation/)
  }
  assert.throws(() => beforeCaseReadingSource(CASE_READING_FILE, live.replace('state.gold - first.gold', 'state.gold + first.gold')), /undocumented mutation/)
  assert.throws(() => beforeCaseReadingSource(CASE_READING_FILE, live + '\n// unauthorized append\n'), /undocumented mutation/)
  assert.throws(() => beforeCaseReadingSource(CASE_READING_FILE, live + addition), /undocumented mutation/)
  console.log(`PASS case-reading projection: one exact completion-only section restored to ${CASE_READING_BASELINE}; ${nonemptyLines.length + 3} mutation probes rejected`)
}
