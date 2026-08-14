import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { build } from 'esbuild'

const output = resolve('lib/client.js')
const result = await build({
  bundle: true,
  entryPoints: [resolve('src/client/index.ts')],
  external: ['react', 'react/jsx-runtime'],
  format: 'cjs',
  outfile: output,
  platform: 'browser',
  sourcemap: false,
  target: 'es2022',
  write: false,
})

const body = result.outputFiles[0].text
const wrapper = [
  'window.__ModuleLoader__.load({',
  '  id: "dsh-opencode-go-quota",',
  '  factory: (require) => {',
  '    var module = { exports: {} };',
  '    var exports = module.exports;',
  body,
  '    return module.exports;',
  '  },',
  '});',
  '',
].join('\n')

await mkdir(dirname(output), { recursive: true })
await writeFile(output, wrapper)
