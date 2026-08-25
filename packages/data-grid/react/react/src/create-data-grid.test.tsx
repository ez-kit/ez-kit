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

	// Regression: the factory used to copy the compound members by hand and had fallen five
	// behind (SelectionBar, DraftBar, SortTrigger, GlobalFilterInput, ColumnVisibilityTrigger).
	// The `as typeof DataGrid` cast typed them as present, so a kit consumer writing
	// `<DataGrid.SelectionBar />` got `undefined` at runtime and no compile error.
	// Enumerating `DataGrid` itself means a newly added member cannot be forgotten.
	it('bound DataGrid carries every compound sub-component the unbound one has', () => {
		const { DataGrid: BoundDataGrid } = createDataGrid({ components: {} })
		const members = Object.keys(DataGrid) as (keyof typeof DataGrid)[]
		expect(members.length).toBeGreaterThan(0)
		for (const member of members) {
			expect(BoundDataGrid[member], `DataGrid.${member} missing from the bound bundle`).toBe(DataGrid[member])
		}
	})

	it('extendDataGrid carries the compound namespace too', () => {
		const { extendDataGrid } = createDataGrid({ components: {} })
		const { DataGrid: Extended } = extendDataGrid({ rating: { view: () => null } })
		for (const member of Object.keys(DataGrid) as (keyof typeof DataGrid)[]) {
			expect(Extended[member], `DataGrid.${member} missing from the extended bundle`).toBe(DataGrid[member])
		}
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
