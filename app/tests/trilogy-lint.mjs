import { ESLint } from 'eslint'
import { spawnSync } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import assert from 'node:assert/strict'

const lint = new ESLint(), output = '../../trilogy-review-20261010'
mkdirSync(output, { recursive: true })
const git = spawnSync('git', ['show', 'e981164:app/src/App.tsx'], { encoding: 'utf8' })
assert.equal(git.status, 0, git.stderr)
const old = (await lint.lintText(git.stdout, { filePath: 'src/App.tsx' }))[0]
const current = (await lint.lintFiles('src/App.tsx'))[0]
const signature = report => report.messages.map(message => `${message.ruleId}:${message.severity}:${message.message.split('\n')[0]}`).sort()
assert.deepEqual(signature(current), signature(old), 'App must not add lint issues to the published baseline')
const sources = ['TrilogyScreen', 'TrilogyLab', 'TrilogyEntry', 'TrilogyDocument', 'TrilogyCollections', 'UltrasoundPhantom'].map(name => `src/components/${name}.tsx`)
sources.push(...['trilogy-session', 'trilogy-types', 'trilogy-registry', 'trilogy-documents', 'trilogy-evidence', 'trilogy-communications', 'ch3', 'ch4', 'ch5'].map(name => `src/game/${name}.ts`))
const fresh = await lint.lintFiles(sources)
assert(fresh.every(report => report.errorCount === 0 && report.warningCount === 0), 'New chapter modules must be lint-clean')
const summary = { baseline: { errors: old.errorCount, warnings: old.warningCount }, currentApp: { errors: current.errorCount, warnings: current.warningCount },
  inherited: current.messages.map(({ ruleId, line, severity }) => ({ ruleId, line, severity })), newFiles: fresh.map(({ filePath, errorCount, warningCount }) => ({ filePath, errorCount, warningCount })) }
writeFileSync(`${output}/trilogy-lint.json`, JSON.stringify(summary, null, 2))
console.log(JSON.stringify({ baseline: summary.baseline, currentApp: summary.currentApp, newFiles: fresh.length, result: 'PASS no new App lint issues; new modules clean' }))
