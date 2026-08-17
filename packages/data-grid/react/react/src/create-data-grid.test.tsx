import { createColumns } from '@ez-kit/data-grid-core'
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
const ROW_COLUMNS = createColumns<Row>([{ accessorKey: 'name', header: 'Name' }])

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
		render(
			<BoundDataGrid
				data={ROWS}
				columns={ROW_COLUMNS}
			/>,
		)
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

describe('extendDataGrid (folded into createDataGrid)', () => {
	it('is returned from the factory and yields a complete bundle', () => {
		const base = createDataGrid({ components: testComponents })
		expect(base.extendDataGrid).toBeTypeOf('function')

		const extended = base.extendDataGrid({ rating: { view: () => null } })
		expect(extended.DataGrid).toBeTypeOf('function')
		expect(extended.useDataGrid).toBeTypeOf('function')
		expect(extended.GridComponentsProvider).toBeTypeOf('function')
		expect(extended.createColumns).toBeTypeOf('function')
		// The extended bundle can itself be extended again.
		expect(extended.extendDataGrid).toBeTypeOf('function')
	})

	it('extended bundle renders with the original components', () => {
		const { extendDataGrid } = createDataGrid({ components: testComponents })
		const { DataGrid: Extended } = extendDataGrid({})
		render(
			<Extended
				data={ROWS}
				columns={ROW_COLUMNS}
			/>,
		)
		expect(screen.getByText('Alice')).toBeInTheDocument()
	})
})
