/** Count actual Pages artifact bytes, not ZIP/gzip size or only the media folder. */
import assert from 'node:assert/strict'
import { readdir, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist')
const groups = { images: 0, numericalPng: 0, audio: 0, codeAndOther: 0 }
let count = 0
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) { await walk(file); continue }
    const bytes = (await stat(file)).size
    const category = /\.webp$/.test(file) ? 'images' : /\.png$/.test(file) ? 'numericalPng' : /\.(mp3|ogg|wav)$/.test(file) ? 'audio' : 'codeAndOther'
    groups[category] += bytes; count++
  }
}
await walk(dist)
const totalBytes = Object.values(groups).reduce((a,b) => a+b, 0)
console.log(JSON.stringify({ files: count, ...groups, totalBytes, decimalMB: +(totalBytes / 1e6).toFixed(3), budgetBytes: 15000000 }, null, 2))
assert(totalBytes < 15000000, 'Pages artifact exceeds the author-approved 15 MB budget. Review new media; never silently degrade numerical CT data.')
