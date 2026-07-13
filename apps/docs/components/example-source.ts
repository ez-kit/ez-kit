import 'server-only'

import { readFile } from 'node:fs/promises'
import path from 'node:path'

import manifest from '@/shared/data-grid/examples/manifest.json'

type ManifestEntry = { id: string; sourceFile: string }

const entries = manifest as ManifestEntry[]
const examplesDir = path.join(process.cwd(), 'shared/data-grid/examples')

export async function readExampleSource(exampleId: string): Promise<string> {
	const entry = entries.find((item) => item.id === exampleId)
	if (!entry) throw new Error(`readExampleSource: unknown example id "${exampleId}"`)
	const source = await readFile(path.join(examplesDir, entry.sourceFile), 'utf8')
	return source.replace(/\s+$/u, '\n')
}
