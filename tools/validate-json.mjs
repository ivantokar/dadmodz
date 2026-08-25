import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ignoredDirectories = new Set(['.git', '.mctools', 'dist', 'node_modules'])

async function collectJsonFiles(directory) {
	const entries = await fs.readdir(directory, { withFileTypes: true })
	const files = []

	for (const entry of entries) {
		const entryPath = path.join(directory, entry.name)
		if (entry.isDirectory() && !ignoredDirectories.has(entry.name)) {
			files.push(...(await collectJsonFiles(entryPath)))
		} else if (entry.isFile() && entry.name.endsWith('.json')) {
			files.push(entryPath)
		}
	}

	return files
}

const files = await collectJsonFiles(projectRoot)
for (const file of files) {
	try {
		JSON.parse(await fs.readFile(file, 'utf8'))
	} catch (error) {
		throw new Error(`${path.relative(projectRoot, file)}: ${error.message}`)
	}
}

console.log(`Validated JSON syntax in ${files.length} files`)
