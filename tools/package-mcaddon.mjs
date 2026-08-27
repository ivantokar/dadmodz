import { createWriteStream, promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ZipArchive } from 'archiver';
import { format, resolveConfig } from 'prettier';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packsRoot = path.join(projectRoot, 'packs');
const outputRoot = path.join(projectRoot, 'dist');

const addOns = [
	{
		name: 'bumblebee',
		behavior: 'bumblebee_BP',
		resources: 'bumblebee_RP'
	},
	{
		name: 'super-pickaxe',
		behavior: 'super-pickaxe_BP',
		resources: 'super-pickaxe_RP'
	}
];

function formatVersion(version) {
	return version.join('.');
}

function readVersion(manifest, label) {
	const version = manifest.header?.version;
	if (
		!Array.isArray(version) ||
		version.length !== 3 ||
		version.some((part) => !Number.isInteger(part) || part < 0)
	) {
		throw new Error(`${label} header.version must be a Bedrock version array such as [1, 0, 6]`);
	}

	return [...version];
}

function incrementPatch(version) {
	return [version[0], version[1], version[2] + 1];
}

function assertVersion(actual, expected, label) {
	if (
		!Array.isArray(actual) ||
		actual.length !== 3 ||
		actual.some((part, index) => part !== expected[index])
	) {
		throw new Error(`${label} must be [${expected.join(', ')}], found ${JSON.stringify(actual)}`);
	}
}

async function readManifest(filePath, label) {
	try {
		return JSON.parse(await fs.readFile(filePath, 'utf8'));
	} catch (error) {
		throw new Error(`Could not read or parse ${label} at ${filePath}: ${error.message}`);
	}
}

async function writeManifest(filePath, manifest) {
	const options = await resolveConfig(filePath);
	const contents = await format(JSON.stringify(manifest), { ...options, filepath: filePath });

	await fs.writeFile(filePath, contents);
}

function synchronizeManifestVersion(manifest, version) {
	manifest.header.version = [...version];

	for (const module of manifest.modules ?? []) {
		module.version = [...version];
	}
}

function synchronizeResourcePackDependency(behaviorManifest, resourcePackUuid, version) {
	for (const dependency of behaviorManifest.dependencies ?? []) {
		if (dependency.uuid === resourcePackUuid) {
			dependency.version = [...version];
		}
	}
}

function validateSynchronizedManifests(addOn, behaviorManifest, resourceManifest, version) {
	assertVersion(
		readVersion(behaviorManifest, `${addOn.name} Behavior Pack`),
		version,
		'Behavior Pack header.version'
	);
	assertVersion(
		readVersion(resourceManifest, `${addOn.name} Resource Pack`),
		version,
		'Resource Pack header.version'
	);

	for (const module of behaviorManifest.modules ?? []) {
		assertVersion(
			module.version,
			version,
			`Behavior Pack ${module.type ?? 'unknown'} module.version`
		);
	}
	for (const module of resourceManifest.modules ?? []) {
		assertVersion(
			module.version,
			version,
			`Resource Pack ${module.type ?? 'unknown'} module.version`
		);
	}

	for (const dependency of behaviorManifest.dependencies ?? []) {
		if (dependency.uuid === resourceManifest.header.uuid) {
			assertVersion(dependency.version, version, 'Behavior Pack Resource Pack dependency.version');
		}
	}
}

for (const addOn of addOns) {
	const sourceRoot = path.join(packsRoot, addOn.name);
	const behaviorManifestPath = path.join(sourceRoot, 'behavior', 'manifest.json');
	const resourceManifestPath = path.join(sourceRoot, 'resources', 'manifest.json');
	const behaviorManifest = await readManifest(
		behaviorManifestPath,
		`${addOn.name} Behavior Pack manifest`
	);
	const resourceManifest = await readManifest(
		resourceManifestPath,
		`${addOn.name} Resource Pack manifest`
	);
	const version = incrementPatch(readVersion(behaviorManifest, `${addOn.name} Behavior Pack`));

	synchronizeManifestVersion(behaviorManifest, version);
	synchronizeManifestVersion(resourceManifest, version);
	synchronizeResourcePackDependency(behaviorManifest, resourceManifest.header.uuid, version);
	validateSynchronizedManifests(addOn, behaviorManifest, resourceManifest, version);

	await Promise.all([
		writeManifest(behaviorManifestPath, behaviorManifest),
		writeManifest(resourceManifestPath, resourceManifest)
	]);

	await fs.mkdir(outputRoot, { recursive: true });
	const outputPath = path.join(outputRoot, `${addOn.name}-v${formatVersion(version)}.mcaddon`);
	const output = createWriteStream(outputPath);
	const archive = new ZipArchive({ zlib: { level: 9 } });

	await new Promise((resolve, reject) => {
		output.on('close', resolve);
		archive.on('warning', reject);
		archive.on('error', reject);
		archive.pipe(output);
		archive.directory(path.join(sourceRoot, 'behavior'), addOn.behavior);
		archive.directory(path.join(sourceRoot, 'resources'), addOn.resources);
		archive.finalize();
	});

	console.log(`Created ${path.relative(projectRoot, outputPath)} at v${formatVersion(version)}`);
}
