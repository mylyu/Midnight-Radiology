/** Mechanical comparison sheets only; no game assets are modified. */
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
const stage = path.resolve(process.argv[2])
const report = JSON.parse(await readFile(path.join(stage, 'report.json'), 'utf8'))
const directory = path.join(stage, 'review')
await mkdir(directory, { recursive: true })
const rows = report.images.filter(r => !r.kept)
const esc = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
for (let start = 0; start < rows.length; start += 12) {
  const entries = rows.slice(start, start + 12), overlays = []
  for (const [index, row] of entries.entries()) {
    const x = index % 3 * 480, y = Math.floor(index / 3) * 272
    for (const [side, file] of [path.join(stage, 'originals', row.id + path.extname(row.previous)), row.source].entries()) {
      const thumb = await sharp(file).resize(230, 230, { fit: 'contain', background: '#253548' }).png().toBuffer()
      overlays.push({ input: thumb, left: x + side * 240, top: y + 32 })
    }
    const label = `<svg width="480" height="32"><text x="4" y="13" fill="white" font-size="11">${esc(row.id)}</text><text x="4" y="27" fill="#b8d6ec" font-size="11">BEFORE ${Math.round(row.beforeBytes/1024)} KB</text><text x="244" y="27" fill="#9ce4b7" font-size="11">AFTER ${Math.round(row.afterBytes/1024)} KB</text></svg>`
    overlays.push({ input: Buffer.from(label), left: x, top: y })
  }
  await sharp({ create: { width: 1440, height: Math.ceil(entries.length / 3) * 272, channels: 3, background: '#101a27' } })
    .composite(overlays).png().toFile(path.join(directory, `sheet-${String(start / 12 + 1).padStart(2, '0')}.png`))
}
const critical = ['bg_day', 'char_zhou', 'pat_worker', 'ch2_pixel_pat_kidmom', 'ct_wrist_fracture_v2', 'ch2_ct_aortic_wide', 'ch2_lung_thick_v2', 'ch2_needle_mpr_v1', 'item_key']
for (const id of critical) {
  const row = report.images.find(r => r.id === id)
  const overlays = []
  for (const [side, file] of [path.join(stage, 'originals', id + path.extname(row.previous)), row.source].entries()) {
    const input = await sharp(file).resize(640, 640, { fit: 'contain', background: '#253548' }).png().toBuffer()
    overlays.push({ input, left: side * 640, top: 0 })
  }
  await sharp({ create: { width: 1280, height: 640, channels: 3, background: '#101a27' } }).composite(overlays).png().toFile(path.join(directory, id + '.png'))
}
await writeFile(path.join(directory, 'README.txt'), 'Left: baseline. Right: delivery candidate. Contact sheets do not prove clinical accuracy or listening quality.\n')
console.log(directory)
