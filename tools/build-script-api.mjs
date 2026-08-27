import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scriptTargets = [
	{
		source: 'scripts/src/main.ts',
		output: 'packs/bumblebee/behavior/scripts/main.js'
	},
	{
		source: 'scripts/src/super-pickaxe.ts',
		output: 'packs/super-pickaxe/behavior/scripts/main.js'
	}
];

for (const target of scriptTargets) {
	const outputPath = path.join(projectRoot, target.output);

	await mkdir(path.dirname(outputPath), { recursive: true });
	await build({
		entryPoints: [path.join(projectRoot, target.source)],
		bundle: true,
		format: 'esm',
		platform: 'neutral',
		target: 'es2021',
		outfile: outputPath,
		external: ['@minecraft/server', '@minecraft/server-ui']
	});

	console.log(`Built ${target.output}`);
}
