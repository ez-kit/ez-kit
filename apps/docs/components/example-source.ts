import 'server-only'

import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { extractExampleSource } from '@/components/extract-example-source'
import manifest from '@/shared/data-grid/examples/manifest.json'

type ManifestEntry = { id: string; sourceFile: string; exportName: string }

const entries = manifest as ManifestEntry[]
const examplesDir = path.join(process.cwd(), 'shared/data-grid/examples')

/**
 * Source shown in the example's source panel. Some files hold several examples,
 * so the file is sliced down to the one `exampleId` names — see
 * `extractExampleSource`.
 */
export async function readExampleSource(exampleId: string): Promise<string> {
	const entry = entries.find((item) => item.id === exampleId)
	if (!entry) throw new Error(`readExampleSource: unknown example id "${exampleId}"`)
	const source = await readFile(path.join(examplesDir, entry.sourceFile), 'utf8')
	return extractExampleSource(source.replace(/\s+$/u, '\n'), entry.exportName)
}
