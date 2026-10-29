// Executable boundary for the current, Git-independent story/asset contract.
// Browser verification and historical baseline audits are intentionally separate.
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
const tests = [
  'tests/trilogy-dialogue-current.mjs',
  'tests/trilogy-graph-current.mjs',
  'tests/trilogy-openings.mjs',
  'tests/trilogy-state.mjs',
  'tests/trilogy-course-state.mjs',
  'tests/trilogy-ultrasound-numerics.mjs',
  'tests/trilogy-mri-numerics.mjs',
  'tests/ch3-focus-state.mjs',
  'tests/ch3-echo-tgc-flow.mjs',
  'tests/ch3-liver-story.mjs',
  'tests/ch3-story-tighten.mjs',
  'tests/ch3-places.mjs',
  'tests/image-delivery-current.mjs',
]

for (const test of tests) {
  console.log(`\n[current] ${test}`)
  const result = spawnSync(process.execPath, ['--import', 'tsx', test], {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      TRILOGY_OUTPUT: process.env.TRILOGY_OUTPUT ?? resolve(root, '../trilogy-current-review'),
    },
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    console.error(`\nCurrent contract failed: ${test}`)
    process.exit(result.status ?? 1)
  }
}
console.log(`\nPASS current contract: ${tests.length} Git-independent test files. Browser and historical suites are separate.`)
