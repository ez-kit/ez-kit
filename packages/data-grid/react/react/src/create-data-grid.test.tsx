import { defineColumns } from '@ez-kit/data-grid-core'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { createDataGrid } from './create-data-grid'
import { DataGrid } from './data-grid/data-grid'
import { testComponents } from './test-utils'

type Row = { id: number; name: string }
const ROWS: Row[] = [
	{ id: 1, name: 'Alice' },
	{ id: 2, name: 'Bob' },
]
const ROW_COLUMNS = defineColumns<Row>([{ accessorKey: 'name', header: 'Name' }])

describe('createDataGrid', () => {
	it('returns DataGrid, useDataGrid, GridComponentsProvider', () => {
		const result = createDataGrid({ components: {} })
		expect(result.DataGrid).toBeTypeOf('function')
		expect(result.useDataGrid).toBeTypeOf('function')
		expect(result.GridComponentsProvider).toBeTypeOf('function')
	})

	it('bound DataGrid renders uncontrolled (inline config) with row inference', () => {
		const { DataGrid: BoundDataGrid } = createDataGrid({ components: testComponents })
		// TRow is inferred from `data`/`columns` — no explicit type argument.
		render(<BoundDataGrid data={ROWS} columns={ROW_COLUMNS} />)
		expect(screen.getByText('Alice')).toBeInTheDocument()
		expect(screen.getByText('Bob')).toBeInTheDocument()
	})

	it('bound DataGrid has all compound sub-components', () => {
		const { DataGrid: BoundDataGrid } = createDataGrid({ components: {} })
		expect(BoundDataGrid.Toolbar).toBe(DataGrid.Toolbar)
		expect(BoundDataGrid.Table).toBe(DataGrid.Table)
		expect(BoundDataGrid.Pagination).toBe(DataGrid.Pagination)
		expect(BoundDataGrid.PageSizer).toBe(DataGrid.PageSizer)
		expect(BoundDataGrid.CreateTrigger).toBe(DataGrid.CreateTrigger)
	})
})
