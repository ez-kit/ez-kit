import 'server-only'

import path from 'node:path'

import { collectExampleFiles } from '@/components/example-files'
import { extractExampleSource } from '@/components/extract-example-source'
import { EXAMPLE_SOURCE_DIRS, findExample } from '@/shared/examples-registry'

import type { ExampleFile } from '@/components/example-file'

/**
 * Every file the example's source panel shows: the entry file first, sliced down to the
 * one export `exampleId` names (some files hold several examples — see
 * `extractExampleSource`), then the files it imports, whole.
 */
export async function readExampleFiles(exampleId: string): Promise<ExampleFile[]> {
	const entry = findExample(exampleId)
	if (!entry) throw new Error(`readExampleFiles: unknown example id "${exampleId}"`)

	const root = path.join(process.cwd(), EXAMPLE_SOURCE_DIRS[entry.product])
	const [entryFile, ...dependencies] = await collectExampleFiles(path.join(root, entry.sourceFile), root)

	if (!entryFile) throw new Error(`readExampleFiles: no source for example id "${exampleId}"`)

	return [{ ...entryFile, source: extractExampleSource(entryFile.source, entry.exportName) }, ...dependencies]
}
