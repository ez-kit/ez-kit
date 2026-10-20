import { createColumns } from '@ez-kit/data-grid-core'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { use, useState, useSyncExternalStore } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DataGrid } from '../data-grid/data-grid'
import { useDataGridState } from '../data-grid/table-context'
import { renderGrid, TEST_FEATURES, testComponents } from '../test-utils'

import { THROWN_RETRY_BASE_MS } from './store'

import type { CellTypeRegistry, CellViewProps } from '../cell-types-context'
import type {
	ColumnDef,
	FieldState,
	ItemsSourceParams,
	ItemsSourceResult,
	SelectCellConfig,
	SelectColumnConfig,
	SelectItem,
} from '@ez-kit/data-grid-core'

type Order = { id: string; warehouse: string }

const BERLIN: SelectItem = { value: 'wh_12', label: 'Berlin' }
const BERN: SelectItem = { value: 'wh_7', label: 'Bern' }
const OLD_DEPOT: SelectItem = { value: 'wh_3', label: 'Old Depot' }

/**
 * A list a test answers by hand: `useList` reads it, `answer` / `fail` settle it, and `calls`
 * counts how often the hook ran — which is what the "one call per source" cases assert on.
 */
function createList(initial: ItemsSourceResult<SelectItem> = { items: [], isLoading: true }) {
	let current = initial
	const listeners = new Set<() => void>()
	const list = {
		calls: 0,
		useList: (): ItemsSourceResult<SelectItem> => {
			list.calls += 1
			return useSyncExternalStore(
				(listener) => {
					listeners.add(listener)
					return () => listeners.delete(listener)
				},
				() => current,
			)
		},
		answer: (items: SelectItem[]) => {
			current = { items, isLoading: false }
			act(() => {
				for (const listener of listeners) listener()
			})
		},
		fail: (error: unknown) => {
			current = { items: [], isLoading: false, error }
			act(() => {
				for (const listener of listeners) listener()
			})
		},
	}
	return list
}

function SelectView({ value, item, itemStatus }: CellViewProps<SelectCellConfig>) {
	return (
		<span
			data-testid='select-view'
			data-status={itemStatus}
		>
			{item?.label ?? String(value ?? '')}
		</span>
	)
}

function SelectEditor({ id, item, config, itemsLoading, itemsError }: FieldState<SelectCellConfig>) {
	return (
		<span
			data-testid={id}
			data-loading={itemsLoading === true ? 'true' : 'false'}
			data-error={itemsError === undefined ? '' : String(itemsError)}
			data-options={(config?.items ?? []).map((option) => option.value).join(',')}
		>
			{item?.label ?? ''}
		</span>
	)
}

const CELL_TYPES: CellTypeRegistry = {
	select: { view: SelectView, editing: SelectEditor, creating: SelectEditor },
}

const ORDERS: Order[] = [
	{ id: '1', warehouse: 'wh_12' },
	{ id: '2', warehouse: 'wh_3' },
]

function warehouseColumn(config: SelectColumnConfig, extra: Partial<ColumnDef<Order>> = {}): ColumnDef<Order>[] {
	return createColumns<Order>([
		{ accessorKey: 'id', header: 'Id' },
		{ accessorKey: 'warehouse', header: 'Warehouse', cell: { type: 'select', config }, ...extra } as ColumnDef<Order>,
	])
}

function statuses(): (string | null)[] {
	return screen.getAllByTestId('select-view').map((view) => view.getAttribute('data-status'))
}

afterEach(() => {
	vi.restoreAllMocks()
})

describe('useItems — a cell’s list from a hook', () => {
	it('labels the cells once the hook answers, with columns declared once', () => {
		const list = createList()
		const columns = warehouseColumn({ useItems: list.useList })
		renderGrid<Order>({ data: ORDERS, columns, cellTypes: CELL_TYPES })

		expect(statuses()).toEqual(['pending', 'pending'])

		list.answer([BERLIN])

		expect(screen.getAllByTestId('select-view')[0]?.textContent).toBe('Berlin')
		expect(statuses()).toEqual(['resolved', 'missing'])
	})

	it('renders a fixed list as before, resolved from the first frame', () => {
		const columns = warehouseColumn({ items: [BERLIN, OLD_DEPOT] })
		renderGrid<Order>({ data: ORDERS, columns, cellTypes: CELL_TYPES })

		expect(screen.getAllByTestId('select-view').map((view) => view.textContent)).toEqual(['Berlin', 'Old Depot'])
		expect(statuses()).toEqual(['resolved', 'resolved'])
	})

	it('shows the raw value and an error status when the hook fails', () => {
		const list = createList()
		renderGrid<Order>({ data: ORDERS, columns: warehouseColumn({ useItems: list.useList }), cellTypes: CELL_TYPES })

		list.fail(new Error('503'))

		expect(statuses()).toEqual(['error', 'error'])
		expect(screen.getAllByTestId('select-view')[0]?.textContent).toBe('wh_12')
	})

	it('turns a hook that throws into that list’s error, leaving the grid up', () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined)
		const useBroken = (): ItemsSourceResult<SelectItem> => {
			throw new Error('parse failed')
		}
		renderGrid<Order>({ data: ORDERS, columns: warehouseColumn({ useItems: useBroken }), cellTypes: CELL_TYPES })

		expect(statuses()).toEqual(['error', 'error'])
		expect(screen.getAllByTestId('select-view')[0]?.textContent).toBe('wh_12')
	})

	it('hands the hook a params object, the same one on every call', () => {
		const seen: unknown[] = []
		const useRecording = (params: ItemsSourceParams): ItemsSourceResult<SelectItem> => {
			seen.push(params)
			return { items: [BERLIN] }
		}
		const list = createList()
		renderGrid<Order>({ data: ORDERS, columns: warehouseColumn({ useItems: useRecording }), cellTypes: CELL_TYPES })
		list.answer([])

		expect(seen[0]).toEqual({})
		expect(Object.isFrozen(seen[0])).toBe(true)
		expect(new Set(seen).size).toBe(1)
	})

	it('waits for a hook that suspends inside its own list, the grid still rendered', async () => {
		let resolve: (items: SelectItem[]) => void = () => undefined
		const pending = new Promise<SelectItem[]>((done) => {
			resolve = done
		})
		const useSuspending = (): ItemsSourceResult<SelectItem> => ({ items: use(pending) })
		// Rendered inside an async `act`: React only retries a suspended `use()` when it was rendered
		// in one, which a synchronous render is not.
		await act(async () => {
			render(
				<DataGrid
					features={TEST_FEATURES}
					data={ORDERS}
					columns={warehouseColumn({ useItems: useSuspending })}
					components={testComponents}
					cellTypes={CELL_TYPES}
				/>,
			)
			await Promise.resolve()
		})

		expect(statuses()).toEqual(['pending', 'pending'])

		await act(async () => {
			resolve([BERLIN])
			await pending
		})

		expect(screen.getAllByTestId('select-view')[0]?.textContent).toBe('Berlin')
	})

	it('runs a hook that threw again, and recovers once it answers', () => {
		vi.useFakeTimers()
		vi.spyOn(console, 'error').mockImplementation(() => undefined)
		const network = { down: true }
		const useFlaky = (): ItemsSourceResult<SelectItem> => {
			if (network.down) throw new Error('network blip')
			return { items: [BERLIN] }
		}
		renderGrid<Order>({ data: ORDERS, columns: warehouseColumn({ useItems: useFlaky }), cellTypes: CELL_TYPES })
		expect(statuses()).toEqual(['error', 'error'])

		network.down = false
		act(() => {
			vi.advanceTimersByTime(THROWN_RETRY_BASE_MS)
		})

		expect(statuses()[0]).toBe('resolved')
		vi.useRealTimers()
	})

	it('calls the hook once per render of the source, not once per cell', () => {
		const list = createList()
		const rows = Array.from({ length: 100 }, (_, i): Order => ({ id: String(i), warehouse: 'wh_12' }))
		renderGrid<Order>({
			data: rows,
			columns: warehouseColumn({ useItems: list.useList }),
			cellTypes: CELL_TYPES,
			pagination: false,
		})
		expect(screen.getAllByTestId('select-view')).toHaveLength(100)

		list.answer([BERLIN])

		// One run on mount, one after the answer — and never a hundred.
		expect(list.calls).toBeLessThanOrEqual(3)
	})

	it('does not run the hook again when the grid’s host re-renders', () => {
		const list = createList()
		const columns = warehouseColumn({ useItems: list.useList })
		function Host() {
			const [renders, setRenders] = useState(0)
			return (
				<>
					<button
						type='button'
						onClick={() => {
							setRenders((n) => n + 1)
						}}
					>
						Re-render host {renders}
					</button>
					<DataGrid
						features={TEST_FEATURES}
						data={ORDERS}
						columns={columns}
						components={testComponents}
						cellTypes={CELL_TYPES}
					/>
				</>
			)
		}
		render(<Host />)
		list.answer([BERLIN])
		const callsBefore = list.calls

		fireEvent.click(screen.getByRole('button', { name: /Re-render host/ }))
		fireEvent.click(screen.getByRole('button', { name: /Re-render host/ }))

		expect(screen.getByRole('button', { name: 'Re-render host 2' })).toBeInTheDocument()
		expect(list.calls).toBe(callsBefore)
	})

	it('does not run a list’s hook again when another list starts being read', () => {
		const visible = createList()
		const hidden = createList()
		const { table } = renderGrid<Order>({
			data: ORDERS,
			columns: createColumns<Order>([
				{
					accessorKey: 'id',
					header: 'Id',
					cell: { type: 'select', config: { useItems: hidden.useList } },
				},
				{
					accessorKey: 'warehouse',
					header: 'Warehouse',
					cell: { type: 'select', config: { useItems: visible.useList } },
				},
			]),
			cellTypes: CELL_TYPES,
			initialState: { columnVisibility: { id: false } },
		})
		visible.answer([BERLIN])
		const visibleCallsBefore = visible.calls
		expect(hidden.calls).toBe(0)

		act(() => {
			table.setColumnVisibility({ id: true })
		})

		expect(hidden.calls).toBeGreaterThan(0)
		expect(visible.calls).toBe(visibleCallsBefore)
	})

	it('does not run the hook of a hidden column nobody reads', () => {
		const list = createList()
		renderGrid<Order>({
			data: ORDERS,
			columns: warehouseColumn({ useItems: list.useList }),
			cellTypes: CELL_TYPES,
			initialState: { columnVisibility: { warehouse: false } },
		})

		expect(list.calls).toBe(0)
	})

	it('runs the hook of a hidden column once its filter is mounted, and offers its items', () => {
		const list = createList()
		renderGrid<Order>(
			{
				data: ORDERS,
				columns: warehouseColumn({ useItems: list.useList }, { filtering: { operators: true, defaultOperator: 'in' } }),
				cellTypes: CELL_TYPES,
				filtering: true,
				initialState: { columnVisibility: { warehouse: false } },
			},
			<DataGrid.FilterPanel />,
		)

		list.answer([BERLIN, BERN])
		fireEvent.click(screen.getByRole('button', { name: /Warehouse/ }))

		expect(list.calls).toBeGreaterThan(0)
		expect(screen.getByRole('checkbox', { name: 'Berlin' })).toBeInTheDocument()
	})

	it('runs the hook inside the grid, where it can read the grid’s state', () => {
		const onFilters = vi.fn()
		const useFiltered = (): ItemsSourceResult<SelectItem> => {
			onFilters(useDataGridState((s) => s.columnFilters))
			return { items: [BERLIN] }
		}
		renderGrid<Order>({ data: ORDERS, columns: warehouseColumn({ useItems: useFiltered }), cellTypes: CELL_TYPES })

		expect(onFilters).toHaveBeenLastCalledWith([])
		expect(screen.getAllByTestId('select-view')[0]?.textContent).toBe('Berlin')
	})

	it('warns once when the columns, and so the hook, are recreated on every render', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		function InlineColumns() {
			const [tick, setTick] = useState(0)
			const columns = createColumns<Order>([
				{
					accessorKey: 'warehouse',
					header: `Warehouse ${String(tick)}`,
					cell: { type: 'select', config: { useItems: () => ({ items: [BERLIN] }) } },
				},
			])
			return (
				<>
					<button
						type='button'
						onClick={() => {
							setTick((t) => t + 1)
						}}
					>
						Re-render
					</button>
					<DataGrid
						features={TEST_FEATURES}
						data={ORDERS}
						columns={columns}
						components={testComponents}
						cellTypes={CELL_TYPES}
					/>
				</>
			)
		}
		render(<InlineColumns />)

		fireEvent.click(screen.getByRole('button', { name: 'Re-render' }))
		fireEvent.click(screen.getByRole('button', { name: 'Re-render' }))

		const unstable = warn.mock.calls.map((call) => String(call[0])).filter((message) => message.includes('useItems'))
		expect(unstable).toHaveLength(1)
		expect(unstable[0]).toContain('"warehouse"')
	})
})

describe('useItems — editing and creating', () => {
	it('labels an archived value from the base while the editor offers only active ones', () => {
		const all = createList({ items: [BERLIN, OLD_DEPOT] })
		const active = createList({ items: [BERLIN] })
		const { table } = renderGrid<Order>({
			data: ORDERS,
			columns: warehouseColumn({ useItems: all.useList }, { editing: { useItems: active.useList } }),
			cellTypes: CELL_TYPES,
			editing: { mode: 'row', onSave: () => undefined },
		})

		act(() => {
			table.editing.start('2')
		})

		const editor = screen.getByTestId('2_warehouse')
		expect(editor.textContent).toBe('Old Depot')
		expect(editor.getAttribute('data-options')).toBe('wh_12')
	})

	it('does not label a newly picked value with the row’s own item', () => {
		const loadingList = createList()
		const { table } = renderGrid<Order>({
			data: ORDERS,
			columns: createColumns<Order>([
				{
					accessorKey: 'warehouse',
					header: 'Warehouse',
					cell: {
						type: 'select',
						config: {
							useItems: loadingList.useList,
							getItem: (row) => ({ value: row.warehouse, label: `Row ${row.warehouse}` }),
						},
					},
				},
			]),
			cellTypes: CELL_TYPES,
			editing: { mode: 'row', onSave: () => undefined },
		})
		act(() => {
			table.editing.start('1')
		})
		expect(screen.getByTestId('1_warehouse').textContent).toBe('Row wh_12')

		act(() => {
			table.editing.setValue('warehouse', 'wh_99')
		})

		expect(screen.getByTestId('1_warehouse').textContent).toBe('')
	})

	it('gives a non-list column’s editor no config even when it states editing items', () => {
		const configs: unknown[] = []
		function TextEditor({ config }: FieldState<unknown, string>) {
			configs.push(config)
			return null
		}
		const { table } = renderGrid<Order>({
			data: ORDERS,
			columns: createColumns<Order>([
				{ accessorKey: 'warehouse', header: 'Warehouse', editing: { items: [BERLIN], component: TextEditor } },
			]),
			editing: { mode: 'row', onSave: () => undefined },
		})

		act(() => {
			table.editing.start('1')
		})

		expect(configs.at(-1)).toBeUndefined()
	})

	it('hands the editor the error of its list', () => {
		const failing = createList()
		const { table } = renderGrid<Order>({
			data: ORDERS,
			columns: warehouseColumn({ items: [BERLIN] }, { editing: { useItems: failing.useList } }),
			cellTypes: CELL_TYPES,
			editing: { mode: 'row', onSave: () => undefined },
		})
		act(() => {
			table.editing.start('1')
		})

		failing.fail('boom')

		expect(screen.getByTestId('1_warehouse').getAttribute('data-error')).toBe('boom')
	})

	it('lets the create form inherit the editor’s list', () => {
		const all = createList({ items: [BERLIN, OLD_DEPOT] })
		const active = createList({ items: [BERLIN] })
		render(
			<DataGrid
				features={TEST_FEATURES}
				data={ORDERS}
				columns={warehouseColumn({ useItems: all.useList }, { editing: { useItems: active.useList } })}
				components={testComponents}
				cellTypes={CELL_TYPES}
				creating={{ mode: 'row', onSave: () => undefined }}
			>
				<DataGrid.Toolbar end={<DataGrid.CreateTrigger />} />
				<DataGrid.Table />
			</DataGrid>,
		)

		fireEvent.click(screen.getByText('+ Add'))

		expect(screen.getByTestId('creating-warehouse').getAttribute('data-options')).toBe('wh_12')
	})
})

describe('useItems — filters', () => {
	it('hands the multi-select the loading state of its list', () => {
		const list = createList()
		renderGrid<Order>({
			data: ORDERS,
			columns: warehouseColumn({ useItems: list.useList }, { filtering: { operators: true, defaultOperator: 'in' } }),
			cellTypes: CELL_TYPES,
			filtering: true,
		})

		const group = screen.getByRole('group', { name: /Warehouse/ })
		expect(group.getAttribute('aria-busy')).toBe('true')

		list.answer([BERLIN])

		expect(group.getAttribute('aria-busy')).toBeNull()
		expect(within(group).getByRole('checkbox', { name: 'Berlin' })).toBeInTheDocument()
	})

	it('labels the chip of a faceted value from the row’s getItem', () => {
		type Shipment = { id: string; warehouse: { id: string; name: string } }
		const shipments: Shipment[] = [
			{ id: '1', warehouse: { id: 'wh_12', name: 'Berlin' } },
			{ id: '2', warehouse: { id: 'wh_12', name: 'Berlin' } },
		]
		renderGrid<Shipment>(
			{
				data: shipments,
				columns: createColumns<Shipment>([
					{
						id: 'warehouse',
						header: 'Warehouse',
						accessorFn: (row) => row.warehouse.id,
						cell: {
							type: 'select',
							config: { items: [], getItem: (row) => ({ value: row.warehouse.id, label: row.warehouse.name }) },
						},
						filtering: { faceted: true },
					},
				]),
				cellTypes: CELL_TYPES,
				filtering: true,
				initialState: { columnFilters: [{ id: 'warehouse', value: ['wh_12'] }] },
			},
			<DataGrid.ActiveFiltersBar />,
		)

		const chip = document.querySelector('[data-slot="filter-chip"]')
		expect(chip?.textContent).toContain('Berlin')
	})

	it('labels the chip of a column with no base from the filter’s own list', () => {
		const regions = createList({ items: [{ value: 'eu', label: 'Europe' }] })
		renderGrid<Order>(
			{
				data: ORDERS,
				columns: createColumns<Order>([
					{ accessorKey: 'warehouse', header: 'Region', filtering: { useItems: regions.useList } },
				]),
				filtering: true,
				initialState: { columnFilters: [{ id: 'warehouse', value: ['eu'] }] },
			},
			<DataGrid.ActiveFiltersBar />,
		)

		expect(document.querySelector('[data-slot="filter-chip"]')?.textContent).toContain('Europe')
	})
})
