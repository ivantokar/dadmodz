import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputDirectory = path.join(projectRoot, 'packs/bumblebee/behavior/scripts')

await mkdir(outputDirectory, { recursive: true })
await build({
	entryPoints: [path.join(projectRoot, 'scripts/src/main.ts')],
	bundle: true,
	format: 'esm',
	platform: 'neutral',
	target: 'es2021',
	outfile: path.join(outputDirectory, 'main.js'),
	external: ['@minecraft/server', '@minecraft/server-ui']
})

console.log('Built packs/bumblebee/behavior/scripts/main.js')
