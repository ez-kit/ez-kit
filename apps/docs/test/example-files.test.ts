// @vitest-environment node
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { collectExampleFiles } from '../components/example-files'

const ROOT = fileURLToPath(new URL('./fixtures/example-files', import.meta.url))

const entry = (name: string) => path.join(ROOT, name)

describe('collectExampleFiles', () => {
	it('returns the entry file first, then its dependencies in import order', async () => {
		const files = await collectExampleFiles(entry('entry.tsx'), ROOT)

		expect(files.map((file) => file.name)).toEqual(['entry.tsx', 'columns.ts', 'use-data.ts', 'server.ts'])
	})

	it('describes each file with its basename, root-relative path and language', async () => {
		const files = await collectExampleFiles(entry('entry.tsx'), ROOT)

		expect(files[0]).toMatchObject({ name: 'entry.tsx', path: 'entry.tsx', language: 'tsx' })
		expect(files[1]).toMatchObject({ name: 'columns.ts', path: 'columns.ts', language: 'ts' })
		expect(files[1]?.source).toContain("export const columns = [{ id: 'name' }]")
	})

	it('does not collect non-relative specifiers', async () => {
		const files = await collectExampleFiles(entry('entry.tsx'), ROOT)

		expect(files.map((file) => file.name)).not.toContain('DataGrid.tsx')
		expect(files.map((file) => file.name)).not.toContain('react')
	})

	it('does not collect a file resolving outside the root', async () => {
		const files = await collectExampleFiles(entry('entry.tsx'), ROOT)

		expect(files.map((file) => file.name)).not.toContain('outside.ts')
	})

	it('terminates on an import cycle and lists each file once', async () => {
		const files = await collectExampleFiles(entry('cycle-a.ts'), ROOT)

		expect(files.map((file) => file.name)).toEqual(['cycle-a.ts', 'cycle-b.ts'])
	})

	it('skips an unresolvable relative import instead of throwing', async () => {
		const files = await collectExampleFiles(entry('broken.tsx'), ROOT)

		expect(files.map((file) => file.name)).toEqual(['broken.tsx'])
	})
})
