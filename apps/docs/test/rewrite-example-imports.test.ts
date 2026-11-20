import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { rewriteExampleImports } from '../components/rewrite-example-imports'

const EXAMPLE = `'use client'

import { createColumns } from '@ez-kit/data-grid-react'
import { useMemo } from 'react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

import { makeUsers, type User } from './_data'

const columns = createColumns<User>([{ accessorKey: 'name', header: 'Name' }])

export function BasicExample() {
	const data = useMemo(() => makeUsers(50), [])
	const table = useDataGrid({ data, columns })
	return <DataGrid table={table} />
}
`

describe('rewriteExampleImports', () => {
	it('points the docs switcher import at the shadcn package', () => {
		const rewritten = rewriteExampleImports(EXAMPLE, 'shadcn')

		expect(rewritten).toContain("import { DataGrid, useDataGrid } from '@ez-kit/data-grid-shadcn'")
		expect(rewritten).not.toContain('shared/DataGrid')
	})

	it('points the docs switcher import at the heroui package', () => {
		const rewritten = rewriteExampleImports(EXAMPLE, 'heroui')

		expect(rewritten).toContain("import { DataGrid, useDataGrid } from '@ez-kit/data-grid-heroui'")
		expect(rewritten).not.toContain('shared/DataGrid')
	})

	it('leaves the rest of the source byte-for-byte intact', () => {
		const rewritten = rewriteExampleImports(EXAMPLE, 'shadcn')

		expect(rewritten).toBe(EXAMPLE.replace("'shared/DataGrid'", "'@ez-kit/data-grid-shadcn'"))
	})

	it('returns source unchanged when the example does not import the switcher', () => {
		const source = "import { createColumns } from '@ez-kit/data-grid-react'\n"

		expect(rewriteExampleImports(source, 'shadcn')).toBe(source)
	})

	it('does not touch other modules whose specifier merely contains the switcher path', () => {
		const source = "import { helper } from './shared/DataGrid-utils'\n"

		expect(rewriteExampleImports(source, 'shadcn')).toBe(source)
	})

	it('rewrites every occurrence when a file imports the switcher more than once', () => {
		const source = "import { DataGrid } from 'shared/DataGrid'\nimport type { X } from 'shared/DataGrid'\n"

		expect(rewriteExampleImports(source, 'heroui')).toBe(
			"import { DataGrid } from '@ez-kit/data-grid-heroui'\nimport type { X } from '@ez-kit/data-grid-heroui'\n",
		)
	})
})

for (const file of ['query-source.tsx', 'editing/query-modal.tsx']) {
	it(`rewrites the connected grid example ${file} without runtime kit-switching scaffolding`, () => {
		const source = readFileSync(resolve(__dirname, '../shared/data-grid/examples/components', file), 'utf8')
		for (const kit of ['shadcn', 'heroui'] as const) {
			const code = rewriteExampleImports(source, kit)
			expect(code).toContain(`from '@ez-kit/data-grid-${kit}'`)
			expect(code).not.toContain('shared/GridKit')
			expect(code).not.toContain('HeroExample')
			expect(code).not.toContain('useDataGridType')
		}
	})
}
