import { existsSync, readdirSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Every packs/<name> add-on with a scripts/src/<name>.ts source gets its own bundle.
const scriptTargets = readdirSync(path.join(projectRoot, 'packs'), { withFileTypes: true })
	.filter((entry) => entry.isDirectory())
	.filter((entry) => existsSync(path.join(projectRoot, 'scripts', 'src', `${entry.name}.ts`)))
	.map((entry) => ({
		source: `scripts/src/${entry.name}.ts`,
		output: `packs/${entry.name}/behavior/scripts/main.js`
	}));

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
