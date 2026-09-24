// Three independent batches preserve every previously recorded static audit.
import assert from 'node:assert/strict'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
const old = [...readFileSync(new URL('../../docs/ch2-payoffs-regression.md', import.meta.url), 'utf8')
  .matchAll(/^(ch[^\r\n]+\.mjs)$/gm)].map(match => match[1])
assert.equal(old.length, 42)
const files = [...old, 'ch2-checkin-data.mjs', 'ch2-checkin-projection.mjs', 'ch2-checkin-freeze.mjs',
  'image-polish-data.mjs', 'image-polish-projection.mjs', 'image-polish-freeze.mjs']
const batch = Number(process.argv[2] ?? 0)
assert([0, 1, 2].includes(batch))
const output = resolve(process.env.POLISH_OUTPUT || '../../image-polish-review')
mkdirSync(output, { recursive: true })
const results = []
for (const [index, file] of files.entries()) {
  if (index % 3 !== batch) continue
  const result = spawnSync(process.execPath, ['--import', 'tsx', `tests/${file}`], {encoding: 'utf8', maxBuffer: 12e6})
  results.push({file, exit: result.status, output: result.stdout + result.stderr})
  console.log(`${result.status === 0 ? 'PASS' : 'FAIL'} ${file}`)
}
writeFileSync(resolve(output, `static-batch-${batch}.json`), JSON.stringify(results, null, 2))
console.log(`TOTAL ${results.length} FAILED ${results.filter(result => result.exit !== 0).length}`)
process.exitCode = results.some(result => result.exit !== 0) ? 1 : 0
