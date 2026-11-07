import { ColumnFormMode } from '@ez-kit/data-grid-core'
import { act, screen, within } from '@testing-library/react'
import { useMemo } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { GridComponentsProvider } from '../components-context'
import { createColumns } from '../react-columns'
import { renderGrid, testComponents } from '../test-utils'

import { AriaRowIndexProvider } from './aria-row-index'
import { useFormFields } from './auto-form'
import { DataGrid } from './data-grid'
import { DndBundleProvider } from './dnd/context'
import { EmptyStateRow } from './empty-state-row'
import { Filter } from './filter'
import { LoadingBody } from './loading-body'
import { NoResultsRow } from './no-results-row'
import { SortItem } from './sort-item'
import { SortMenuTrigger } from './sort-menu-trigger'
import { useDataGridTable } from './table-context'
import { VisibilityItem } from './visibility-item'
import { VisibilityTrigger } from './visibility-trigger'

import type { DndAdapter, DragSpec } from './dnd'
import type { ThProps } from '../types'
import type { ReactNode } from 'react'

const DATA = [
	{ id: '1', name: 'Ann', team: 'A' },
	{ id: '2', name: 'Bob', team: 'B' },
]
const COLUMNS = createColumns<(typeof DATA)[number]>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'team', header: 'Team' },
])
const config = {
	visibility: true,
	sorting: true,
	data: DATA,
	columns: COLUMNS,
	getRowId: (row: (typeof DATA)[number]) => row.id,
}

function dragRecorder() {
	const specs = new Map<string, DragSpec>()
	const adapter: DndAdapter = {
		Provider: ({ children }) => <>{children}</>,
		useSortableItem: (spec) => {
			specs.set(`${spec.axis}:${spec.id}`, spec)
			return { ref: () => {}, handleRef: () => {}, isDragging: false }
		},
	}
	return { specs, wrap: (children: ReactNode) => <DndBundleProvider adapter={adapter}>{children}</DndBundleProvider> }
}

afterEach(() => {
	vi.restoreAllMocks()
})

describe('displayed model selectors', () => {
	it.each([LoadingBody, EmptyStateRow, NoResultsRow])('keeps retained %s spans current after grouping', (Fallback) => {
		const { table, container } = renderGrid(
			{ ...config, grouping: true },
			<DataGrid.Table>
				<Fallback />
			</DataGrid.Table>,
		)
		expect(container.querySelector('td')).toHaveAttribute('colspan', '3')
		act(() => {
			table.setGrouping(['team'])
		})
		expect(container.querySelector('td')).toHaveAttribute('colspan', '2')
	})

	it('updates ordered sortable and visible panel columns after order and grouping changes', () => {
		const { table } = renderGrid(
			{ ...config, grouping: true },
			<>
				<SortMenuTrigger>
					{({ sortableColumns }) => (
						<output data-testid='sort-columns'>{sortableColumns.map((c) => c.id).join(',')}</output>
					)}
				</SortMenuTrigger>
				<VisibilityTrigger>
					{({ columns }) => <output data-testid='visible-columns'>{columns.map((c) => c.id).join(',')}</output>}
				</VisibilityTrigger>
			</>,
		)
		act(() => {
			table.setColumnOrder(['team', 'name'])
		})
		expect(screen.getByTestId('sort-columns')).toHaveTextContent('team,name')
		expect(screen.getByTestId('visible-columns')).toHaveTextContent('team,name')
		act(() => {
			table.setGrouping(['team'])
		})
		expect(screen.getByTestId('sort-columns')).toHaveTextContent(/^name$/)
		expect(screen.getByTestId('visible-columns')).toHaveTextContent(/^name$/)
	})

	it('keeps a bulk confirmation aligned with the live deletion targets', async () => {
		const onDelete = vi.fn()
		const { table } = renderGrid({
			...config,
			selection: true,
			deleting: {
				onDelete: () => {},
				bulk: {
					onDelete,
					confirmation: { description: (rows) => `Selected ${String(rows.length)}` },
				},
			},
		})
		act(() => {
			table.setRowSelection({ '1': true })
		})
		act(() => {
			table.deleting.bulk.request()
		})
		expect(screen.getByText('Selected 1')).toBeInTheDocument()
		act(() => {
			table.setRowSelection({ '1': true, '2': true })
		})
		expect(screen.getByText('Selected 2')).toBeInTheDocument()
		await act(async () => {
			await table.deleting.bulk.confirm()
		})
		expect(onDelete).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				rowIds: ['1', '2'],
				rows: [
					expect.objectContaining({ id: '1', original: DATA[0] }),
					expect.objectContaining({ id: '2', original: DATA[1] }),
				],
			}),
		)
	})

	it('keeps bulk confirmation executable targets current across a page transition', async () => {
		const onDelete = vi.fn()
		const { table } = renderGrid({
			...config,
			selection: true,
			pagination: { pageSize: 1 },
			deleting: {
				onDelete: () => {},
				bulk: { onDelete, confirmation: { description: (rows) => `Targets ${rows.map((row) => row.id).join(',')}` } },
			},
		})
		act(() => {
			table.setRowSelection({ '1': true, '2': true })
		})
		act(() => {
			table.deleting.bulk.request()
		})
		expect(screen.getByText('Targets 1')).toBeInTheDocument()
		act(() => {
			table.setPageIndex(1)
		})
		expect(screen.getByText('Targets 2')).toBeInTheDocument()
		await act(async () => {
			await table.deleting.bulk.confirm()
		})
		expect(onDelete).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({ rowIds: ['2'], rows: [expect.objectContaining({ id: '2', original: DATA[1] })] }),
		)
	})

	it('updates retained sorting item registrations after the parent reorders cached JSX', () => {
		const { specs, wrap } = dragRecorder()
		const elements = new Map<string, ReactNode>()
		const { table } = renderGrid(
			{
				...config,
				sorting: { multi: { reorderable: true } },
				initialState: {
					sorting: [
						{ id: 'name', desc: false },
						{ id: 'team', desc: false },
					],
				},
			},
			<SortMenuTrigger>
				{({ items }) =>
					items.map(({ columnId }) => {
						if (!elements.has(columnId))
							elements.set(
								columnId,
								<SortItem
									key={columnId}
									sortId={columnId}
								>
									{columnId}
								</SortItem>,
							)
						return elements.get(columnId)
					})
				}
			</SortMenuTrigger>,
			wrap,
		)
		expect(specs.get('sorting:name')?.index).toBe(0)
		act(() => {
			table.setSorting([
				{ id: 'team', desc: false },
				{ id: 'name', desc: false },
			])
		})
		expect(specs.get('sorting:name')?.index).toBe(1)
		expect(specs.get('sorting:team')?.index).toBe(0)
	})

	it('updates retained visibility item registrations after the parent reorders cached JSX', () => {
		const { specs, wrap } = dragRecorder()
		const elements = new Map<string, ReactNode>()
		const { table } = renderGrid(
			{ ...config, ordering: { column: { visibilityMenu: true } } },
			<VisibilityTrigger>
				{({ columns }) =>
					columns.map(({ id }) => {
						if (!elements.has(id))
							elements.set(
								id,
								<VisibilityItem
									key={id}
									columnId={id}
								>
									{id}
								</VisibilityItem>,
							)
						return elements.get(id)
					})
				}
			</VisibilityTrigger>,
			wrap,
		)
		expect(specs.get('column:name')?.index).toBe(0)
		act(() => {
			table.setColumnOrder(['team', 'name'])
		})
		expect(specs.get('column:name')?.index).toBe(1)
		expect(specs.get('column:team')?.index).toBe(0)
	})

	it('updates retained row registrations after sorting reorders cached JSX', () => {
		const { specs, wrap } = dragRecorder()
		const elements = new Map<string, ReactNode>()
		const { table } = renderGrid(
			{ ...config, ordering: { row: true }, sorting: true },
			<DataGrid.Table>
				<DataGrid.Body>
					{({ rows }) =>
						rows.map((row) => {
							if (!elements.has(row.id))
								elements.set(
									row.id,
									<DataGrid.Row
										key={row.id}
										row={row}
									/>,
								)
							return elements.get(row.id)
						})
					}
				</DataGrid.Body>
			</DataGrid.Table>,
			wrap,
		)
		expect(specs.get('row:1')?.index).toBe(0)
		act(() => {
			table.setSorting([{ id: 'name', desc: true }])
		})
		expect(specs.get('row:1')?.index).toBe(1)
		expect(specs.get('row:2')?.index).toBe(0)
	})
})

describe('selector isolation and callback compatibility', () => {
	it('leaves default ordinary headers alone when selection changes', () => {
		const calls = new Map<string, number>()
		function Th(props: ThProps & { 'data-column-id'?: string }) {
			const id = props['data-column-id'] ?? ''
			calls.set(id, (calls.get(id) ?? 0) + 1)
			return <testComponents.core.Th {...props} />
		}
		const { table } = renderGrid(
			{ ...config, selection: true },
			<GridComponentsProvider components={{ core: { Th } }}>
				<DataGrid.Table />
			</GridComponentsProvider>,
		)
		const before = new Map(calls)
		act(() => {
			table.setRowSelection({ '1': true })
		})
		expect(calls.get('name')).toBe(before.get('name'))
		expect(calls.get('team')).toBe(before.get('team'))
		expect(calls.get('__selection__')).toBe((before.get('__selection__') ?? 0) + 1)
	})

	it('keeps header templates and composed header callbacks live on selection', () => {
		const columns = createColumns<(typeof DATA)[number]>([
			{ accessorKey: 'name', header: ({ table }) => `Template ${String(table.getSelectedRowModel().rows.length)}` },
			{ accessorKey: 'team', header: 'Team' },
		])
		const { table } = renderGrid(
			{ ...config, columns, selection: true },
			<DataGrid.Table>
				<DataGrid.Header />
				<DataGrid.Header>
					{({ table: model }) => (
						<tr>
							<th>Callback {model.getSelectedRowModel().rows.length}</th>
						</tr>
					)}
				</DataGrid.Header>
			</DataGrid.Table>,
		)
		expect(screen.getByText('Template 0')).toBeInTheDocument()
		act(() => {
			table.setRowSelection({ '1': true })
		})
		expect(screen.getByText('Template 1')).toBeInTheDocument()
		expect(screen.getByText('Callback 1')).toBeInTheDocument()
	})

	it('keeps footer templates and composed footer callbacks live on pagination', () => {
		const columns = createColumns<(typeof DATA)[number]>([
			{
				accessorKey: 'name',
				header: 'Name',
				footer: ({ table }) => `Template page ${String(table.getRowModel().rows[0]?.id)}`,
			},
		])
		const { table } = renderGrid(
			{ ...config, columns, pagination: { pageSize: 1 } },
			<DataGrid.Table>
				<DataGrid.Footer />
				<DataGrid.Footer>
					{({ table: model }) => (
						<tr>
							<td>Callback page {model.getRowModel().rows[0]?.id}</td>
						</tr>
					)}
				</DataGrid.Footer>
			</DataGrid.Table>,
		)
		act(() => {
			table.setPageIndex(1)
		})
		expect(screen.getByText('Template page 2')).toBeInTheDocument()
		expect(screen.getByText('Callback page 2')).toBeInTheDocument()
	})

	it('updates row move eligibility in retained rows without reordering them', () => {
		const cached = new Map<string, ReactNode>()
		const { table, container } = renderGrid(
			{ ...config, ordering: { row: { controls: 'step' } }, editing: { onSave: () => {} } },
			<DataGrid.Table>
				<DataGrid.Body>
					{({ rows }) =>
						rows.map((row) => {
							if (!cached.has(row.id))
								cached.set(
									row.id,
									<DataGrid.Row
										key={row.id}
										row={row}
									/>,
								)
							return cached.get(row.id)
						})
					}
				</DataGrid.Body>
			</DataGrid.Table>,
		)
		const first = container.querySelector<HTMLElement>('[data-row-id="1"]')
		if (!first) throw new Error('Missing first row')
		expect(within(first).getByRole('button', { name: 'Move down' })).toBeEnabled()
		const canMove = vi.spyOn(table.ordering, 'canMoveRow')
		act(() => {
			table.editing.start('2')
		})
		expect(canMove).not.toHaveBeenCalled()
		act(() => {
			table.setSorting([{ id: 'name', desc: false }])
		})
		expect(within(first).getByRole('button', { name: 'Move up' })).toBeDisabled()
		expect(within(first).getByRole('button', { name: 'Move down' })).toBeDisabled()
	})

	it('isolates a nonfaceted filter from another filter value', () => {
		const render = vi.fn((entry: { valueDisplay: string }) => <output>{entry.valueDisplay}</output>)
		const { table } = renderGrid({ ...config, filtering: true }, <Filter id='name'>{render}</Filter>)
		const before = render.mock.calls.length
		act(() => {
			table.getColumn('team')?.setFilterValue('A')
		})
		expect(render).toHaveBeenCalledTimes(before)
		act(() => {
			table.getColumn('name')?.setFilterValue('Ann')
		})
		expect(render.mock.calls.length).toBeGreaterThan(before)
		expect(screen.getByText('Ann')).toBeInTheDocument()
	})

	it('isolates a single form field from another field value', () => {
		const render = vi.fn()
		function NameField() {
			const fields = useFormFields(ColumnFormMode.Editing, 'name')
			render()
			return <>{fields.map((field) => field.element)}</>
		}
		const { table } = renderGrid({ ...config, editing: { onSave: () => {} } }, <NameField />)
		act(() => {
			table.editing.start('1')
		})
		const before = render.mock.calls.length
		act(() => {
			table.editing.setValue('team', 'New team')
		})
		expect(render).toHaveBeenCalledTimes(before)
		act(() => {
			table.editing.setValue('name', 'New name')
		})
		expect(screen.getByDisplayValue('New name')).toBeInTheDocument()
	})

	it('keeps nonvirtual table render-function rows live on expansion', () => {
		type TreeRow = (typeof DATA)[number] & { children?: TreeRow[] }
		const data: TreeRow[] = [{ id: '1', name: 'Parent', team: 'A', children: [{ id: '2', name: 'Child', team: 'A' }] }]
		const { table } = renderGrid<TreeRow>(
			{ ...config, data, pagination: { pageSize: 10 }, expanding: { mode: 'tree', getSubRows: (row) => row.children } },
			<DataGrid.Table>
				{({ rows }) => (
					<tbody>
						<tr>
							<td data-testid='model-rows'>{rows.map((row) => row.id).join(',')}</td>
						</tr>
					</tbody>
				)}
			</DataGrid.Table>,
		)
		expect(screen.getByTestId('model-rows')).toHaveTextContent(/^1$/)
		act(() => {
			table.setExpanded({ '1': true })
		})
		expect(screen.getByTestId('model-rows')).toHaveTextContent('1,2')
	})
	it('updates retained ARIA row positions without a Table ancestor refreshing the provider', () => {
		function RetainedAriaRows() {
			const table = useDataGridTable()
			const rows = useMemo(
				() =>
					table.getRowModel().rows.map((row) => (
						<DataGrid.Row
							key={row.id}
							row={row}
						/>
					)),
				[table],
			)
			return (
				<AriaRowIndexProvider
					table={table}
					enabled
				>
					<table>
						<tbody>{rows}</tbody>
					</table>
				</AriaRowIndexProvider>
			)
		}
		const { table, container } = renderGrid(config, <RetainedAriaRows />)
		const first = container.querySelector('[data-row-id="1"]')
		expect(first).toHaveAttribute('aria-rowindex', '2')
		act(() => {
			table.setSorting([{ id: 'name', desc: true }])
		})
		expect(first).toHaveAttribute('aria-rowindex', '3')
	})
	it('refreshes opaque header templates on pagination and footer templates on selection', () => {
		const columns = createColumns<(typeof DATA)[number]>([
			{
				accessorKey: 'name',
				header: ({ table }) => `Header page ${String(table.store.state.pagination.pageIndex)}`,
				footer: ({ table }) => `Footer selected ${String(table.getSelectedRowModel().rows.length)}`,
			},
		])
		const { table } = renderGrid(
			{ ...config, columns, selection: true, pagination: { pageSize: 1 } },
			<DataGrid.Table>
				<DataGrid.Header />
				<DataGrid.Footer />
			</DataGrid.Table>,
		)
		act(() => {
			table.setPageIndex(1)
		})
		expect(screen.getByText('Header page 1')).toBeInTheDocument()
		act(() => {
			table.setRowSelection({ '2': true })
		})
		expect(screen.getByText('Footer selected 1')).toBeInTheDocument()
	})
	it('refreshes opaque row actions in retained rows on another row selection', () => {
		const cached = new Map<string, ReactNode>()
		const { table } = renderGrid(
			{
				...config,
				selection: true,
				rowActions: {
					actions: ({ row, table: model }) => [
						{
							id: 'custom',
							label: `Action ${row.id} selected ${String(model.getSelectedRowModel().rows.length)}`,
							onAction: () => {},
						},
					],
				},
			},
			<DataGrid.Table>
				<DataGrid.Body>
					{({ rows }) =>
						rows.map((row) => {
							if (!cached.has(row.id))
								cached.set(
									row.id,
									<DataGrid.Row
										key={row.id}
										row={row}
									/>,
								)
							return cached.get(row.id)
						})
					}
				</DataGrid.Body>
			</DataGrid.Table>,
		)
		expect(screen.getByRole('button', { name: 'Action 1 selected 0' })).toBeInTheDocument()
		act(() => {
			table.setRowSelection({ '2': true })
		})
		expect(screen.getByRole('button', { name: 'Action 1 selected 1' })).toBeInTheDocument()
	})
})
