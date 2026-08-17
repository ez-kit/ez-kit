import { createColumns } from '@ez-kit/data-grid-core'
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { testComponents } from '../test-utils'

import { DataGrid } from './data-grid'

type Row = { id: number; name: string }
const ROWS: Row[] = [{ id: 1, name: 'Alice' }]
const COLUMNS = createColumns<Row>([{ accessorKey: 'name', header: 'Name' }])

describe('ComponentGuard (dev-time completeness)', () => {
	it('throws a named error when a required structural component is missing', () => {
		// Complete set minus the structural Table primitive (dropped from the core group).
		const { Table: _omitTable, ...core } = testComponents.core
		const withoutTable = { ...testComponents, core }
		// React logs the thrown render error — silence it for a clean test run.
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

		expect(() =>
			render(
				<DataGrid
					data={ROWS}
					columns={COLUMNS}
					components={withoutTable}
				/>,
			),
		).toThrow(/Missing required UI-kit component\(s\)[\s\S]*Table \(core\)/)

		errorSpy.mockRestore()
	})

	it('does not throw when every required component is registered', () => {
		expect(() =>
			render(
				<DataGrid
					data={ROWS}
					columns={COLUMNS}
					components={testComponents}
				/>,
			),
		).not.toThrow()
	})
})
