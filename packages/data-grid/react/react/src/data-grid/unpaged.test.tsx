import { createColumns } from '@ez-kit/data-grid-core'
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { renderWithComponents, TEST_FEATURES, testComponents } from '../test-utils'
import { useDataGrid } from '../use-data-grid'

import { DataGrid } from './data-grid'

import type { GridFeatures } from '../types'
import type { UseDataGridConfig } from '../use-data-grid'

type Row = { id: number; name: string }

// Five pages' worth at the default page size, so a grid sliced to its first page is unmistakable.
const ROWS: Row[] = Array.from({ length: 50 }, (_, index) => ({ id: index + 1, name: `Row ${String(index + 1)}` }))
const COLUMNS = createColumns<Row>([{ accessorKey: 'name', header: 'Name' }])

const bodyRowsOf = (container: HTMLElement) => container.querySelectorAll('[data-slot="tbody"] [data-slot="tr"]')

// `TEST_FEATURES` is the all-in set, so `paginatedRowModel` is registered in every case below.
describe('a grid without pagination', () => {
	it('renders every row', () => {
		const { container } = render(
			<DataGrid
				features={TEST_FEATURES}
				data={ROWS}
				columns={COLUMNS}
				components={testComponents}
			/>,
		)

		expect(bodyRowsOf(container)).toHaveLength(50)
	})

	it('renders every row from a table built by useDataGrid', () => {
		const tableRef: { rowCount: number | undefined } = { rowCount: undefined }
		function Harness() {
			const table = useDataGrid<GridFeatures, Row>({ features: TEST_FEATURES, data: ROWS, columns: COLUMNS })
			tableRef.rowCount = table.getRowModel().rows.length
			return <DataGrid<GridFeatures, Row> table={table} />
		}
		const { container } = renderWithComponents(<Harness />)

		expect(tableRef.rowCount).toBe(50)
		expect(bodyRowsOf(container)).toHaveLength(50)
	})

	it('follows the pagination prop switched on and back off without remounting', () => {
		const grid = (pagination?: UseDataGridConfig<GridFeatures, Row>['pagination']) => (
			<DataGrid
				features={TEST_FEATURES}
				data={ROWS}
				columns={COLUMNS}
				components={testComponents}
				{...(pagination !== undefined ? { pagination } : {})}
			/>
		)
		const tableOf = () => container.querySelector('[data-slot="table"]')
		const { container, rerender } = render(grid())
		expect(bodyRowsOf(container)).toHaveLength(50)
		expect(tableOf()?.hasAttribute('aria-rowcount')).toBe(false)

		// `pageSize` seeds the slice when the table is built, so on this live instance the page is the
		// default ten whatever the prop says — what is switched here is slicing, not the size.
		rerender(grid({ pageSize: 10 }))
		expect(bodyRowsOf(container)).toHaveLength(10)
		// 50 rows plus the header row ARIA counts.
		expect(tableOf()?.getAttribute('aria-rowcount')).toBe('51')

		rerender(grid())
		expect(bodyRowsOf(container)).toHaveLength(50)
		expect(tableOf()?.hasAttribute('aria-rowcount')).toBe(false)
	})

	// Controlled state is the application's to hold on every render, so it is never a seed and never
	// worth the dormant-seed warning, whatever the config switches on.
	it('says nothing about controlled state for a feature that is off', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const { container } = render(
			<DataGrid
				features={TEST_FEATURES}
				data={ROWS}
				columns={COLUMNS}
				components={testComponents}
				state={{ columnFilters: [{ id: 'name', value: 'Row 1' }] }}
			/>,
		)

		expect(bodyRowsOf(container)).toHaveLength(50)
		expect(warn.mock.calls.map((args) => String(args[0])).filter((m) => m.includes('initialState.'))).toEqual([])
		warn.mockRestore()
	})
})
