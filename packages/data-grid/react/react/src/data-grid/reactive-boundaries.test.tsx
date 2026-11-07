import { act, render, screen } from '@testing-library/react'
import { useMemo } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { GridComponentsProvider } from '../components-context'
import { createDataGrid } from '../create-data-grid'
import { createColumns } from '../react-columns'
import { renderGrid, TEST_FEATURES, TEST_OPERATORS, testComponents } from '../test-utils'

import { ActionsCell } from './actions-cell'
import { DataGrid } from './data-grid'
import { DndBundleProvider } from './dnd/context'
import { useDataGridTable } from './table-context'

import type { DndAdapter } from './dnd'
import type { DataTable, GridFeatures, ThProps } from '../types'
import type { ControlledTableState } from '../use-data-grid'

const DATA = [
	{ id: 'a', name: 'Ann', team: 'A', status: 'open' },
	{ id: 'b', name: 'Bob', team: 'A', status: 'done' },
	{ id: 'c', name: 'Cat', team: 'B', status: 'done' },
]
type RecordRow = (typeof DATA)[number]
const COLUMNS = createColumns<RecordRow>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'team', header: 'Team' },
	{
		accessorKey: 'status',
		header: 'Status',
		cell: {
			type: 'select',
			config: {
				items: [
					{ value: 'open', label: 'Open' },
					{ value: 'done', label: 'Done' },
				],
			},
		},
		filtering: { operators: true },
	},
])
const { DataGrid: Grid, useDataGrid: useGrid } = createDataGrid({
	components: testComponents,
	features: TEST_FEATURES,
	operators: TEST_OPERATORS,
})
const config = { data: DATA, columns: COLUMNS, getRowId: (row: RecordRow) => row.id }

afterEach(() => {
	vi.restoreAllMocks()
})

describe('retained reactive boundaries', () => {
	it.each(['header', 'footer', 'cell', 'row'] as const)('updates a retained %s render function', (target) => {
		function Retained() {
			const table = useDataGridTable<RecordRow>()
			return useMemo(() => {
				const header = table.getHeaderGroups()[0]?.headers.find((h) => h.column.id === 'name')
				const footer = table.getFooterGroups()[0]?.headers.find((h) => h.column.id === 'name')
				const row = table.getRowModel().rows[0]
				const cell = row?.getAllCells().find((c) => c.column.id === 'name')
				if (!header || !footer || !row || !cell) throw new Error('Missing fixture model')
				return (
					<DataGrid.Table>
						<thead>
							<tr>
								<DataGrid.HeaderCell header={header}>
									{({ header: h }) => (
										<span data-testid='header'>{h.getContext().table.getSelectedRowModel().rows.length}</span>
									)}
								</DataGrid.HeaderCell>
							</tr>
						</thead>
						<tbody>
							<DataGrid.Row row={row}>
								{({ row: r }) => <td data-testid='row'>{String(r.getIsPinned())}</td>}
							</DataGrid.Row>
							<DataGrid.Row row={row}>
								<DataGrid.Cell
									cell={cell}
									row={row}
								>
									{({ row: r }) => <span data-testid='cell'>{String(r.getIsSelected())}</span>}
								</DataGrid.Cell>
							</DataGrid.Row>
						</tbody>
						<tfoot>
							<tr>
								<DataGrid.FooterCell header={footer}>
									{({ header: h }) => (
										<span data-testid='footer'>{h.getContext().table.getSelectedRowModel().rows.length}</span>
									)}
								</DataGrid.FooterCell>
							</tr>
						</tfoot>
					</DataGrid.Table>
				)
			}, [table])
		}
		const { table } = renderGrid({ ...config, selection: true, pinning: { row: { top: true } } }, <Retained />)
		const node = screen.getByTestId(target)
		act(() => {
			table.setRowSelection({ a: true })
		})
		act(() => {
			table.getRowModel().rows[0]?.pin('top')
		})
		expect(screen.getByTestId(target)).toBe(node)
		expect(node.textContent).toBe({ header: '1', footer: '1', cell: 'true', row: 'top' }[target])
		act(() => {
			table.setRowSelection({})
		})
		act(() => {
			table.getRowModel().rows[0]?.pin(false)
		})
		expect(node.textContent).toBe({ header: '0', footer: '0', cell: 'false', row: 'false' }[target])
	})

	it('updates rowProps when a parent becomes partially selected', () => {
		type TreeRow = { id: string; name: string; children?: TreeRow[] }
		const { table, container } = renderGrid<TreeRow>({
			data: [
				{
					id: 'p',
					name: 'Parent',
					children: [
						{ id: 'a', name: 'A' },
						{ id: 'b', name: 'B' },
					],
				},
			],
			columns: createColumns<TreeRow>([{ accessorKey: 'name', header: 'Name' }]),
			getRowId: (row) => row.id,
			selection: true,
			expanding: { mode: 'tree', getSubRows: (row) => row.children },
			rowProps: (row) => ({ title: String(row.getIsSomeSelected()) }),
		})
		const node = container.querySelector('[data-row-id="p"]')
		expect(node).toHaveAttribute('title', 'false')
		act(() => {
			table.setRowSelection({ a: true })
		})
		expect(node).toHaveAttribute('title', 'true')
		act(() => {
			table.setRowSelection({})
		})
		expect(node).toHaveAttribute('title', 'false')
	})

	it.each([false, true])('keeps header facet counts live, controlled=%s', (controlled) => {
		let table: DataTable<GridFeatures, RecordRow>
		const children = (
			<Grid.Table>
				<Grid.Header />
				<Grid.Body />
			</Grid.Table>
		)
		function Host({ state }: { state: ControlledTableState<GridFeatures> }) {
			table = useGrid({ ...config, filtering: { faceted: true }, ...(controlled ? { state } : {}) })
			return <Grid table={table}>{children}</Grid>
		}
		const view = render(<Host state={{}} />)
		const header = view.container.querySelector('th[data-column-id="status"]')
		const checkbox = header?.querySelector('input')
		if (!checkbox) throw new Error('Missing facet control')
		checkbox.focus()
		expect(header).toHaveTextContent('Done2')
		if (controlled) view.rerender(<Host state={{ columnFilters: [{ id: 'team', value: 'A' }] }} />)
		else
			act(() => {
				table.getColumn('team')?.setFilterValue('A')
			})
		expect(header).toHaveTextContent('Done1')
		expect(header?.querySelector('input')).toBe(checkbox)
		expect(checkbox).toHaveFocus()
		if (controlled) view.rerender(<Host state={{ columnFilters: [] }} />)
		else
			act(() => {
				table.resetColumnFilters()
			})
		expect(header).toHaveTextContent('Done2')
	})

	it('refreshes cached row capabilities on options-only changes', () => {
		let table: DataTable<GridFeatures, RecordRow>
		const actions = () => []
		function RetainedActions() {
			const model = useDataGridTable()
			return useMemo(() => {
				const row = model.getRowModel().rows[0]
				if (!row) throw new Error('Missing fixture row')
				return (
					<table>
						<tbody>
							<tr>
								<td>
									<ActionsCell row={row} />
								</td>
							</tr>
						</tbody>
					</table>
				)
			}, [model])
		}
		const children = <RetainedActions />
		function Host({ controls }: { controls: false | 'step' }) {
			table = useGrid({ ...config, rowActions: { actions }, ordering: { row: { controls } } })
			return <Grid table={table}>{children}</Grid>
		}
		const view = render(<Host controls={false} />)
		// A captured snapshot proves this update has no store notification to invalidate the selector.
		const readState = () => table.store.state
		const state = readState()
		view.rerender(<Host controls='step' />)
		expect(readState()).toBe(state)
		expect(screen.getByRole('button', { name: 'Move down' })).toBeEnabled()
		expect(screen.getByRole('button', { name: 'Move up' })).toBeDisabled()
		view.rerender(<Host controls={false} />)
		expect(screen.queryByRole('button', { name: 'Move down' })).not.toBeInTheDocument()
		view.rerender(<Host controls='step' />)
		expect(screen.getByRole('button', { name: 'Move down' })).toBeEnabled()
	})

	it.each([false, true])('does not rescan column positions on editing, drag=%s', (drag) => {
		const names = Array.from({ length: 40 }, (_, i) => `c${String(i)}`)
		const data = [Object.fromEntries(names.map((name, i) => [name, i]))]
		const columns = createColumns<Record<string, number>>(names.map((id) => ({ accessorKey: id, header: id })))
		const headerRenders = vi.fn()
		function Th(props: ThProps & { 'data-column-id'?: string }) {
			if (props['data-column-id']?.startsWith('c')) headerRenders()
			return <testComponents.core.Th {...props} />
		}
		const adapter: DndAdapter = {
			Provider: ({ children }) => <>{children}</>,
			useSortableItem: () => ({ ref: () => {}, handleRef: () => {}, isDragging: false }),
		}
		const { table } = renderGrid(
			{ data, columns, ordering: { column: true }, editing: { onSave: () => {} } },
			<GridComponentsProvider components={{ core: { Th } }}>
				<DataGrid.Table>
					<DataGrid.Header />
				</DataGrid.Table>
			</GridComponentsProvider>,
			(grid) => (drag ? <DndBundleProvider adapter={adapter}>{grid}</DndBundleProvider> : grid),
		)
		act(() => {
			table.editing.start('0')
		})
		const leaves = table.getAllLeafColumns()
		const findIndex = vi.spyOn(leaves, 'findIndex')
		const getVisual = vi.spyOn(table, 'getCenterVisibleLeafColumns')
		headerRenders.mockClear()
		act(() => {
			table.editing.setValue('c0', 999)
		})
		expect(headerRenders).not.toHaveBeenCalled()
		expect(findIndex).not.toHaveBeenCalled()
		// The table/body may read the visual model, but forty headers must not each rebuild it.
		expect(getVisual.mock.calls.length).toBeLessThan(names.length)
	})
})
