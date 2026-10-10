import path from "path"
import { createHash } from 'node:crypto'
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

/** Rollup's complete module provenance, not a filename ownership guess. */
export function chunkSourcesPlugin(root = __dirname): Plugin {
  return {
    name: 'delivery-chunk-sources', apply: 'build', enforce: 'post',
    generateBundle(_options, bundle) {
      const chunks = Object.fromEntries(Object.values(bundle).filter(chunk => chunk.type === 'chunk').map(chunk => {
        const modules = Object.keys(chunk.modules).map(id => path.isAbsolute(id)
          ? path.relative(root, id).split(path.sep).join('/') : `unresolved:${id}`).sort()
        return [chunk.fileName, { type: 'chunk', isEntry: chunk.isEntry, isDynamicEntry: chunk.isDynamicEntry,
          bytes: Buffer.byteLength(chunk.code, 'utf8'), sha256: createHash('sha256').update(chunk.code).digest('hex'), modules }]
      }))
      this.emitFile({ type: 'asset', fileName: 'chunk-sources.generated.json',
        source: JSON.stringify({ version: 1, kind: 'rollup-output-chunks', chunks }, null, 2) + '\n' })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [inspectAttr(), react(), chunkSourcesPlugin()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
