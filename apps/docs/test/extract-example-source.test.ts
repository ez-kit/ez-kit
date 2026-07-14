import { describe, expect, it } from 'vitest'

import { extractExampleSource } from '../components/extract-example-source'

const MULTI_EXPORT = `'use client'

import { defineColumns } from '@ez-kit/data-grid-react'
import { useMemo } from 'react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

import { makeUsers, type User } from './_data'

const columns = defineColumns<User>([{ accessorKey: 'name', header: 'Name' }])

export function FilterChipsAutoExample() {
	const data = useMemo(() => makeUsers(50), [])
	const table = useDataGrid({ data, columns, filtering: { chips: true } })
	return <DataGrid table={table} />
}

export function FilterChipsAlwaysExample() {
	const data = useMemo(() => makeUsers(50), [])
	const table = useDataGrid({ data, columns, globalFiltering: true })
	return <DataGrid table={table} />
}
`

const SINGLE_EXPORT = `'use client'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

const columns = [{ accessorKey: 'name', header: 'Name' }]

export function BasePlainExample() {
	const table = useDataGrid({ data: [], columns })
	return <DataGrid table={table} />
}
`

/** Mirrors `column-helper.tsx`: each example brings its own module-scope setup. */
const PER_EXAMPLE_PREAMBLE = `'use client'

import { createColumnHelper } from '@ez-kit/data-grid-react'

import { CustomDataGrid, useDataGrid } from 'shared/data-grid/CustomGrid'

import type { ColumnDef } from '@ez-kit/data-grid-react'

const EMPLOYEE_DATA = [{ id: 1, name: 'Alice' }]

const baseColumns = [createColumnHelper()]

export function ColumnHelperBaseExample() {
	const table = useDataGrid({ data: EMPLOYEE_DATA, columns: baseColumns })
	return <CustomDataGrid table={table} />
}

// ── Example 2: custom view ───────────────────────────────────────────────────

function StarRatingView({ value }: { value: unknown }) {
	return <span>{String(value)}</span>
}

const customViewColumns: ColumnDef[] = [StarRatingView]

export function ColumnHelperCustomViewExample() {
	const table = useDataGrid({ data: EMPLOYEE_DATA, columns: customViewColumns })
	return <CustomDataGrid table={table} />
}
`

describe('extractExampleSource', () => {
	it('keeps only the target export when the file declares several', () => {
		// Arrange / Act
		const result = extractExampleSource(MULTI_EXPORT, 'FilterChipsAlwaysExample')

		// Assert
		expect(result).toContain('export function FilterChipsAlwaysExample')
		expect(result).not.toContain('FilterChipsAutoExample')
	})

	it('keeps the imports and module-scope declarations the target uses', () => {
		// Arrange / Act
		const result = extractExampleSource(MULTI_EXPORT, 'FilterChipsAlwaysExample')

		// Assert
		expect(result).toContain("import { defineColumns } from '@ez-kit/data-grid-react'")
		expect(result).toContain("import { makeUsers, type User } from './_data'")
		expect(result).toContain('const columns = defineColumns<User>')
		expect(result).toContain("'use client'")
	})

	it('returns a single-export file unchanged', () => {
		// Arrange / Act
		const result = extractExampleSource(SINGLE_EXPORT, 'BasePlainExample')

		// Assert
		expect(result).toBe(SINGLE_EXPORT)
	})

	it('returns the source unchanged when the export is not found', () => {
		// Arrange / Act
		const result = extractExampleSource(MULTI_EXPORT, 'NoSuchExample')

		// Assert
		expect(result).toBe(MULTI_EXPORT)
	})

	it('drops module-scope declarations only a sibling example uses', () => {
		// Arrange / Act
		const result = extractExampleSource(PER_EXAMPLE_PREAMBLE, 'ColumnHelperBaseExample')

		// Assert
		expect(result).toContain('const baseColumns')
		expect(result).toContain('const EMPLOYEE_DATA')
		expect(result).not.toContain('StarRatingView')
		expect(result).not.toContain('customViewColumns')
		expect(result).not.toContain('── Example 2')
	})

	it('drops imports left unused once siblings are removed', () => {
		// Arrange / Act
		const result = extractExampleSource(PER_EXAMPLE_PREAMBLE, 'ColumnHelperBaseExample')

		// Assert
		expect(result).not.toContain('ColumnDef')
		expect(result).toContain("import { createColumnHelper } from '@ez-kit/data-grid-react'")
	})

	it('keeps a shared declaration reachable from the target', () => {
		// Arrange / Act
		const result = extractExampleSource(PER_EXAMPLE_PREAMBLE, 'ColumnHelperCustomViewExample')

		// Assert
		expect(result).toContain('const EMPLOYEE_DATA')
		expect(result).toContain('function StarRatingView')
		expect(result).toContain('ColumnDef')
		expect(result).not.toContain('ColumnHelperBaseExample')
	})

	it('leaves no run of blank lines where a sibling was removed', () => {
		// Arrange / Act
		const result = extractExampleSource(MULTI_EXPORT, 'FilterChipsAlwaysExample')

		// Assert
		expect(result).not.toMatch(/\n{3,}/u)
		expect(result.endsWith('}\n')).toBe(true)
	})
})
