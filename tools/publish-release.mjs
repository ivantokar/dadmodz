import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const distRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const [name] = process.argv.slice(2);

if (!name) {
	throw new Error('Usage: npm run publish:release -- <bumblebee|super-pickaxe>');
}

const pattern = new RegExp(`^${name}-v(\\d+\\.\\d+\\.\\d+)\\.mcaddon$`);
const builds = readdirSync(distRoot)
	.map((file) => ({ file, match: pattern.exec(file) }))
	.filter(({ match }) => match)
	.sort((a, b) => a.match[1].localeCompare(b.match[1], undefined, { numeric: true }));

if (builds.length === 0) {
	throw new Error(`No dist/${name}-v*.mcaddon found. Run "npm run package -- ${name}" first.`);
}

const { file, match } = builds.at(-1);
const tag = `${name}-v${match[1]}`;

execFileSync(
	'gh',
	['release', 'create', tag, path.join(distRoot, file), '--title', tag, '--generate-notes'],
	{ stdio: 'inherit' }
);
