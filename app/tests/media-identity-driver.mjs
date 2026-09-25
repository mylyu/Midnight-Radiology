// Verify live delivered bytes, including session Blob URLs, against the exact
// generated manifest. A changed URL form never weakens media identity checks.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const manifest = JSON.parse(readFileSync(new URL('../src/lib/media-manifest.generated.json', import.meta.url), 'utf8'))
const cache = new WeakMap()

export async function resolveMediaIdentities(page, sources) {
  let known = cache.get(page)
  if (!known) { known = new Map(); cache.set(page, known) }
  const missing = [...new Set(sources)].filter(source => !known.has(source))
  if (missing.length) {
    const checked = await page.evaluate(async sources => Promise.all(sources.map(async source => {
      const response = await fetch(source)
      if (!response.ok) throw new Error(`Cannot inspect delivered media: ${response.status} ${source}`)
      const bytes = await response.arrayBuffer()
      const hash = await crypto.subtle.digest('SHA-256', bytes)
      return { source, bytes: bytes.byteLength, sha256: [...new Uint8Array(hash)].map(n => n.toString(16).padStart(2, '0')).join('') }
    })), missing)
    for (const row of checked) known.set(row.source, { ...row, paths: Object.entries(manifest.assets)
      .filter(([, asset]) => asset.sha256 === row.sha256 && asset.bytes === row.bytes).map(([path]) => path) })
  }
  return sources.map(source => known.get(source))
}

export async function waitForImageAsset(page, canonicalPath, timeout = 30000) {
  assert.equal(manifest.assets[canonicalPath]?.type, 'image', `Expected image belongs to generated manifest: ${canonicalPath}`)
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const sources = await page.locator('img').evaluateAll(images => images
      .filter(image => image.complete && image.naturalWidth > 0 && image.getClientRects().length > 0)
      .map(image => image.currentSrc || image.src))
    const identities = await resolveMediaIdentities(page, sources)
    if (identities.some(row => row.paths.includes(canonicalPath))) return
    await page.waitForTimeout(100)
  }
  assert.fail(`Decoded visible image with exact manifest bytes never appeared: ${canonicalPath}`)
}
