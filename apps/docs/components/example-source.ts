import 'server-only'

import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { extractExampleSource } from '@/components/extract-example-source'
import { EXAMPLE_SOURCE_DIRS, findExample } from '@/shared/examples-registry'

/**
 * Source shown in the example's source panel. Some files hold several examples,
 * so the file is sliced down to the one `exampleId` names — see
 * `extractExampleSource`.
 */
export async function readExampleSource(exampleId: string): Promise<string> {
	const entry = findExample(exampleId)
	if (!entry) throw new Error(`readExampleSource: unknown example id "${exampleId}"`)
	const examplesDir = path.join(process.cwd(), EXAMPLE_SOURCE_DIRS[entry.product])
	const source = await readFile(path.join(examplesDir, entry.sourceFile), 'utf8')
	return extractExampleSource(source.replace(/\s+$/u, '\n'), entry.exportName)
}
