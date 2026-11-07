import { act, fireEvent, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { createDataGrid } from '../create-data-grid'
import { createColumns } from '../react-columns'
import { TEST_FEATURES, testComponents } from '../test-utils'

import { DataGrid } from './data-grid'
import { VirtualProvider } from './virtual-context'

import type { ControlledTableState } from '../index'
import type { DataTable, GridFeatures } from '../types'
import type { Virtualizer } from '@tanstack/react-virtual'
import type { ReactNode } from 'react'

const DATA = [
	{ id: 1, name: 'Anna', department: 'eng', salary: 150, active: 'Yes' },
	{ id: 2, name: 'Boris', department: 'design', salary: 200, active: 'No' },
]
const COLUMNS = createColumns<(typeof DATA)[number]>([
	{
		accessorKey: 'name',
		header: 'Name',
		cell: {
			component: ({ value }: { value: unknown }) => (
				<>
					<span>{String(value)}</span>
					<input
						aria-label={String(value)}
						defaultValue='draft'
					/>
				</>
			),
		},
	},
	{ accessorKey: 'department', header: 'Department' },
	{ accessorKey: 'salary', header: 'Salary' },
	{ accessorKey: 'active', header: 'Active' },
])
const bundle = createDataGrid({ components: testComponents, features: TEST_FEATURES })
const Grid = bundle.DataGrid
// A deterministic non-empty viewport: jsdom cannot measure a real scrollport.
const virtualizer = {
	getVirtualItems: () =>
		DATA.map((_, index) => ({ index, key: index, start: index * 40, end: (index + 1) * 40, size: 40, lane: 0 })),
	getTotalSize: () => DATA.length * 40,
} as unknown as Virtualizer<HTMLDivElement, Element>

function layout(virtual: boolean, customHeader: boolean, bodyContent: boolean): ReactNode {
	const table = (
		<DataGrid.Table>
			{customHeader ? (
				<DataGrid.Header>
					{({ headerGroups }) =>
						headerGroups.map((group) => (
							<DataGrid.HeaderRow
								key={group.id}
								headerGroup={group}
							>
								{({ headers }) =>
									headers.map((header) => (
										<DataGrid.HeaderCell
											key={header.id}
											header={header}
										>
											{({ label }) => label}
										</DataGrid.HeaderCell>
									))
								}
							</DataGrid.HeaderRow>
						))
					}
				</DataGrid.Header>
			) : (
				<DataGrid.Header />
			)}
			{bodyContent ? <DataGrid.Body>{({ content }) => content}</DataGrid.Body> : <DataGrid.Body />}
		</DataGrid.Table>
	)
	return virtual ? <VirtualProvider rowVirtualizer={virtualizer}>{table}</VirtualProvider> : table
}

describe('static table composition reacts to column state', () => {
	for (const mode of ['built-in', 'composed header and body', 'virtualized'] as const) {
		for (const controlled of [false, true]) {
			it(`${mode}, ${controlled ? 'controlled rerender' : 'table API'}: keeps headers and every row aligned without remounting`, () => {
				let table: DataTable<GridFeatures, (typeof DATA)[number]>
				// Built once outside Harness: rerender must preserve these exact React elements.
				const children = layout(
					mode === 'virtualized',
					mode === 'composed header and body',
					mode === 'composed header and body',
				)
				function Harness({ state }: { state: ControlledTableState<GridFeatures> }) {
					table = bundle.useDataGrid({
						data: DATA,
						columns: COLUMNS,
						visibility: true,
						pinning: { column: true },
						...(controlled ? { state } : {}),
					})
					return <Grid table={table}>{children}</Grid>
				}
				const view = render(<Harness state={{}} />)
				const rows = Array.from(view.container.querySelectorAll('tbody tr[data-row-id]'))
				expect(rows).toHaveLength(2)
				const input = view.getByRole('textbox', { name: 'Anna' })
				fireEvent.change(input, { target: { value: 'unsaved' } })
				input.focus()

				function assertColumns(keys: (keyof (typeof DATA)[number])[]) {
					const labels = { name: 'Name', department: 'Department', salary: 'Salary', active: 'Active', id: 'Id' }
					expect(
						Array.from(view.container.querySelectorAll('thead th')).map(
							(cell) => (cell.querySelector('[data-slot="sort-trigger"]') ?? cell).textContent,
						),
					).toEqual(keys.map((key) => labels[key]))
					const currentRows = Array.from(view.container.querySelectorAll('tbody tr[data-row-id]'))
					for (const [index, row] of currentRows.entries()) {
						expect(row).toBe(rows[index])
						expect(Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent)).toEqual(
							keys.map((key) => String(DATA[index]?.[key])),
						)
					}
					expect(currentRows).toHaveLength(DATA.length)
					expect(view.getByRole('textbox', { name: 'Anna' })).toBe(input)
					expect(input).toHaveValue('unsaved')
					expect(input).toHaveFocus()
				}
				let controlledState: ControlledTableState<GridFeatures> = {}
				function update(state: ControlledTableState<GridFeatures>) {
					controlledState = { ...controlledState, ...state }
					if (controlled) view.rerender(<Harness state={controlledState} />)
					else
						act(() => {
							if (state.columnVisibility) table.setColumnVisibility(state.columnVisibility)
							if (state.columnPinning) table.setColumnPinning(state.columnPinning)
						})
				}
				assertColumns(['name', 'department', 'salary', 'active'])
				update({ columnVisibility: { salary: false } })
				assertColumns(['name', 'department', 'active'])
				update({ columnVisibility: { active: false } })
				assertColumns(['name', 'department', 'salary'])
				update({ columnPinning: { start: ['salary'], end: [] } })
				assertColumns(['salary', 'name', 'department'])
				update({ columnPinning: { start: [], end: ['department'] } })
				assertColumns(['name', 'salary', 'department'])
				update({ columnPinning: { start: [], end: [] } })
				assertColumns(['name', 'department', 'salary'])
				update({ columnVisibility: {} })
				assertColumns(['name', 'department', 'salary', 'active'])
			})
		}
	}
})
