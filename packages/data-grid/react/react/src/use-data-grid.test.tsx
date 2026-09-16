import { createColumns, defaultMessages } from '@ez-kit/data-grid-core'
import { act, render, renderHook } from '@testing-library/react'
import { useRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { buildPaginationLabel } from './data-grid/pagination-label'
import { DATA_GRID_DEFAULTS } from './defaults'
import { TEST_FEATURES } from './test-utils'
import { PaginationLabel } from './types'
import { useDataGrid } from './use-data-grid'

import type { DataTable, GridFeatures } from './types'
import type {
	NormalizedFilteringToolbarConfig,
	NormalizedFilterChipsConfig,
	NormalizedGlobalFilteringConfig,
} from './use-data-grid'
import type { TableState } from '@ez-kit/data-grid-core'

type User = {
	id: number
	name: string
}

const USERS: User[] = [
	{ id: 1, name: 'Alice' },
	{ id: 2, name: 'Bob' },
]
const COLUMNS = createColumns<User>([{ accessorKey: 'name' }])

type ClampGridProps = {
	rowCount: number
	tableState: Partial<TableState<GridFeatures>>
	onStateChange: (state: TableState<GridFeatures>) => void
}

/** Renders the live `pageIndex` under fully controlled manual pagination. */
function ClampGrid({ rowCount, tableState, onStateChange }: ClampGridProps) {
	const table = useDataGrid({
		features: TEST_FEATURES,
		data: USERS,
		columns: COLUMNS,
		pagination: { manual: true, rowCount, pageSize: 10 },
		state: tableState,
		onStateChange,
	})
	return <span data-testid='page-index'>{table.store.state.pagination.pageIndex}</span>
}

/** Parent-owned controlled state — the ordinary consumer shape (state above the grid). */
function ClampPage({ rowCount }: { rowCount: number }) {
	const [tableState, setTableState] = useState<Partial<TableState<GridFeatures>>>({
		pagination: { pageIndex: 2, pageSize: 10 },
	})
	return (
		<ClampGrid
			rowCount={rowCount}
			tableState={tableState}
			onStateChange={(nextState) => {
				setTableState(nextState)
			}}
		/>
	)
}

describe('useDataGrid', () => {
	it('creates a table table with initial data', () => {
		const { result } = renderHook(() => useDataGrid({ features: TEST_FEATURES, data: USERS, columns: COLUMNS }))
		expect(result.current.getRowModel().rows).toHaveLength(2)
	})

	// The identity contract, which survived the move to `useTable` even though the object under it
	// did not. `useTable` returns a fresh `useMemo(() => ({ ...table, options, state }))` on every
	// render; `useDataGrid` holds one view in a ref and refreshes it from that, so what a caller
	// holds — and what `<DataGrid>` publishes as `TableContext` — never changes identity.
	//
	// Both halves matter. Stability alone would also be true of a frozen object that had stopped
	// tracking the table, so the second assertion reads a member `useTable` rebuilds every render
	// (`options`) back off the stable reference and requires it to be the current one.
	it('is stable across re-renders, and current', () => {
		const NEXT = [{ id: 3, name: 'Carol' }]
		const { result, rerender } = renderHook(
			({ data }: { data: User[] }) => useDataGrid({ features: TEST_FEATURES, data, columns: COLUMNS }),
			{ initialProps: { data: USERS } },
		)
		const first = result.current
		const firstOptions = first.options

		rerender({ data: NEXT })

		expect(result.current).toBe(first)
		// The same object, carrying this render's options rather than the first render's — read
		// back off the stable reference, which is the half a stability-only assertion misses.
		expect(result.current.options).not.toBe(firstOptions)
		expect(result.current.options.data).toBe(NEXT)
		expect(result.current.getRowModel().rows[0]?.getValue('name')).toBe('Carol')
	})

	it('updates data when config.data changes', () => {
		const newData = [{ id: 3, name: 'Carol' }]
		const { result, rerender } = renderHook(
			({ data }: { data: User[] }) => useDataGrid({ features: TEST_FEATURES, data, columns: COLUMNS }),
			{
				initialProps: { data: USERS },
			},
		)
		rerender({ data: newData })
		expect(result.current.getRowModel().rows).toHaveLength(1)
		expect(result.current.getRowModel().rows[0]?.getValue('name')).toBe('Carol')
	})

	it('re-syncs manual pagination rowCount when it changes', () => {
		const { result, rerender } = renderHook(
			({ rowCount }: { rowCount: number }) =>
				useDataGrid({
					features: TEST_FEATURES,
					data: USERS,
					columns: COLUMNS,
					pagination: { manual: true, rowCount, pageSize: 10 },
					state: { pagination: { pageIndex: 0, pageSize: 10 } },
				}),
			{ initialProps: { rowCount: 0 } },
		)
		expect(result.current.getRowCount()).toBe(0)
		expect(result.current.getPageCount()).toBe(0)

		rerender({ rowCount: 1250 })
		expect(result.current.getRowCount()).toBe(1250)
		expect(result.current.getPageCount()).toBe(125)
	})

	// Regression (#82): `autoResetPageIndex` defaults to `!manualPagination`, so TanStack never
	// rewinds the page itself under manual mode. With a shrinking server total the footer claimed
	// "0–0 of 5" while `getPaginationRowModel()` — the whole `data` under manual mode — still
	// rendered all 5 rows.
	it('clamps pageIndex to the last page when a manual rowCount shrinks under the user', () => {
		const { result, rerender } = renderHook(
			({ rowCount }: { rowCount: number }) =>
				useDataGrid({
					features: TEST_FEATURES,
					data: USERS,
					columns: COLUMNS,
					pagination: { manual: true, rowCount, pageSize: 10 },
				}),
			{ initialProps: { rowCount: 500 } },
		)

		act(() => {
			result.current.setPageIndex(2)
		})
		expect(result.current.store.state.pagination.pageIndex).toBe(2)

		// A server filter narrows 500 rows to 5 while the user sits on page 3.
		rerender({ rowCount: 5 })

		expect(result.current.store.state.pagination.pageIndex).toBe(0)
		expect(
			buildPaginationLabel(
				PaginationLabel.Range,
				{
					pageIndex: result.current.store.state.pagination.pageIndex,
					pageSize: 10,
					rowCount: result.current.getRowCount(),
				},
				defaultMessages.pagination,
			),
		).toBe('1–5 of 5')
	})

	it('clamps pageIndex to the first page when a manual rowCount drops to zero', () => {
		const { result, rerender } = renderHook(
			({ rowCount }: { rowCount: number }) =>
				useDataGrid({
					features: TEST_FEATURES,
					data: USERS,
					columns: COLUMNS,
					pagination: { manual: true, rowCount, pageSize: 10 },
				}),
			{ initialProps: { rowCount: 500 } },
		)

		act(() => {
			result.current.setPageIndex(2)
		})

		rerender({ rowCount: 0 })

		expect(result.current.store.state.pagination.pageIndex).toBe(0)
	})

	it('leaves pageIndex alone while it is still within a shrunken manual rowCount', () => {
		const { result, rerender } = renderHook(
			({ rowCount }: { rowCount: number }) =>
				useDataGrid({
					features: TEST_FEATURES,
					data: USERS,
					columns: COLUMNS,
					pagination: { manual: true, rowCount, pageSize: 10 },
				}),
			{ initialProps: { rowCount: 500 } },
		)

		act(() => {
			result.current.setPageIndex(2)
		})

		// 50 rows still spans 5 pages — page 3 remains valid, so nothing to clamp.
		rerender({ rowCount: 50 })

		expect(result.current.store.state.pagination.pageIndex).toBe(2)
	})

	it('never clamps pageIndex when the manual total is unknown', () => {
		const { result, rerender } = renderHook(
			({ data }: { data: User[] }) =>
				useDataGrid({
					features: TEST_FEATURES,
					data,
					columns: COLUMNS,
					// Neither rowCount nor pageCount: the total is genuinely unknown.
					pagination: { manual: true, pageSize: 10 },
				}),
			{ initialProps: { data: USERS } },
		)

		act(() => {
			result.current.setPageIndex(2)
		})

		rerender({ data: [{ id: 3, name: 'Carol' }] })

		expect(result.current.store.state.pagination.pageIndex).toBe(2)
	})

	// `rowCount: data?.rowCount ?? 0` is the canonical manual-pagination shape, so a `0` on the
	// first render means "not loaded yet", not "empty" — the resync comment above says as much
	// ("it starts at 0, then reflects the filtered total after each fetch"). Clamping there would
	// discard a deep-linked page while its fetch is still in flight: the inverse of #82.
	it('does not clamp a deep-linked pageIndex while rowCount is still a loading placeholder', () => {
		const onStateChangeSpy = vi.fn()
		render(
			<ClampGrid
				rowCount={0}
				tableState={{ pagination: { pageIndex: 3, pageSize: 10 } }}
				onStateChange={onStateChangeSpy}
			/>,
		)

		expect(onStateChangeSpy).not.toHaveBeenCalled()
	})

	it('keeps a deep-linked pageIndex once the placeholder rowCount resolves', () => {
		const onStateChangeSpy = vi.fn()
		const deepLinked: Partial<TableState<GridFeatures>> = { pagination: { pageIndex: 3, pageSize: 10 } }
		const { rerender, getByTestId } = render(
			<ClampGrid
				rowCount={0}
				tableState={deepLinked}
				onStateChange={onStateChangeSpy}
			/>,
		)

		// The fetch lands: the total grows into place. Page 4 is valid — nothing to clamp.
		rerender(
			<ClampGrid
				rowCount={500}
				tableState={deepLinked}
				onStateChange={onStateChangeSpy}
			/>,
		)

		expect(onStateChangeSpy).not.toHaveBeenCalled()
		expect(getByTestId('page-index').textContent).toBe('3')
	})

	// Pins the scope boundary as intentional, not an oversight: a first total that resolves
	// straight into an out-of-range page is NOT clamped, because it is indistinguishable from a
	// `keepPreviousData` placeholder. Unlike #82 this contradicts nothing on screen — a real
	// server returns no rows for page 4 of 5, so the `0–0 of 5` footer matches an empty grid.
	it('leaves a deep link to an already-out-of-range page alone when the first total resolves', () => {
		const onStateChangeSpy = vi.fn()
		const deepLinked: Partial<TableState<GridFeatures>> = { pagination: { pageIndex: 3, pageSize: 10 } }
		const { rerender, getByTestId } = render(
			<ClampGrid
				rowCount={0}
				tableState={deepLinked}
				onStateChange={onStateChangeSpy}
			/>,
		)

		// 0 → 5 is a growth, not a shrink: the grid has never seen a trustworthy larger total.
		rerender(
			<ClampGrid
				rowCount={5}
				tableState={deepLinked}
				onStateChange={onStateChangeSpy}
			/>,
		)

		expect(onStateChangeSpy).not.toHaveBeenCalled()
		expect(getByTestId('page-index').textContent).toBe('3')
	})

	// The controlled state deliberately lives in a PARENT (`ClampPage`) rather than alongside
	// `useDataGrid`: co-locating it is React's legal same-component derived-state path and hides
	// the real failure. Clamping from the render body calls the parent's setter mid-render, which
	// React rejects with "Cannot update a component while rendering a different component" — this
	// is the regression test for that.
	it('clamps parent-owned controlled pagination without a render-phase update warning', () => {
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
		const { rerender, getByTestId } = render(<ClampPage rowCount={500} />)
		expect(getByTestId('page-index').textContent).toBe('2')

		rerender(<ClampPage rowCount={5} />)

		expect(getByTestId('page-index').textContent).toBe('0')
		expect(errorSpy.mock.calls.map((call) => String(call[0])).join('\n')).not.toContain(
			'while rendering a different component',
		)
		errorSpy.mockRestore()
	})

	it('notifies the consumer but does not loop when it ignores the clamp', () => {
		const onStateChangeSpy = vi.fn()
		const ignoredState: Partial<TableState<GridFeatures>> = { pagination: { pageIndex: 2, pageSize: 10 } }
		const { rerender, getByTestId } = render(
			<ClampGrid
				rowCount={500}
				tableState={ignoredState}
				onStateChange={onStateChangeSpy}
			/>,
		)

		rerender(
			<ClampGrid
				rowCount={5}
				tableState={ignoredState}
				onStateChange={onStateChangeSpy}
			/>,
		)

		// The grid asks, then defers: the consumer owns the index, so it stays out of range
		// rather than the grid re-issuing the clamp on every pass.
		const callsAfterShrink = onStateChangeSpy.mock.calls.length
		expect(callsAfterShrink).toBeGreaterThan(0)
		expect(getByTestId('page-index').textContent).toBe('2')

		// A delta, not an absolute count: what matters is that further renders add nothing (no
		// loop) — which stays true even if the suite ever double-invokes effects.
		rerender(
			<ClampGrid
				rowCount={5}
				tableState={ignoredState}
				onStateChange={onStateChangeSpy}
			/>,
		)
		expect(onStateChangeSpy.mock.calls.length).toBe(callsAfterShrink)
	})

	it('re-syncs manual pagination pageCount when it changes', () => {
		const { result, rerender } = renderHook(
			({ pageCount }: { pageCount: number }) =>
				useDataGrid({
					features: TEST_FEATURES,
					data: USERS,
					columns: COLUMNS,
					pagination: { manual: true, pageCount, pageSize: 10 },
					state: { pagination: { pageIndex: 0, pageSize: 10 } },
				}),
			{ initialProps: { pageCount: -1 } },
		)
		expect(result.current.getPageCount()).toBe(-1)

		rerender({ pageCount: 7 })
		expect(result.current.getPageCount()).toBe(7)
	})

	it('re-renders when table state changes', () => {
		const { result } = renderHook(() =>
			useDataGrid({
				features: TEST_FEATURES,
				data: USERS,
				columns: COLUMNS,
				creating: { onSave: () => Promise.resolve() },
			}),
		)
		expect(result.current.creating.getState().isOpen).toBe(false)
		act(() => {
			result.current.creating.start()
		})
		expect(result.current.creating.getState().isOpen).toBe(true)
	})

	it('seeds loading from initialState (uncontrolled default)', () => {
		const { result } = renderHook(() =>
			useDataGrid({
				features: TEST_FEATURES,
				data: USERS,
				columns: COLUMNS,
				initialState: { loading: { isPending: true, isFetching: false, isError: false, error: null } },
			}),
		)
		expect(result.current.store.state.loading.isPending).toBe(true)
	})

	it('propagates state.loading into the external snapshot so subscribers see it', () => {
		const { result, rerender } = renderHook(
			({ isPending }: { isPending: boolean }) =>
				useDataGrid({
					features: TEST_FEATURES,
					data: USERS,
					columns: COLUMNS,
					state: { loading: { isPending, isFetching: false, isError: false, error: null } },
				}),
			{ initialProps: { isPending: false } },
		)
		// Baseline: snapshot reflects initial state
		expect(result.current.store.state.loading.isPending).toBe(false)

		// Flip via the controlled `state` prop — both options.state AND the external
		// store must update so useSyncExternalStore subscribers (e.g. Body) re-read.
		rerender({ isPending: true })
		expect(result.current.store.state.loading.isPending).toBe(true)
	})

	it('propagates state.columnFilters into the external snapshot', () => {
		const filtersA: { id: string; value: unknown }[] = []
		const filtersB = [{ id: 'name', value: 'Alice' }]
		const { result, rerender } = renderHook(
			({ filters }: { filters: { id: string; value: unknown }[] }) =>
				useDataGrid({
					features: TEST_FEATURES,
					data: USERS,
					columns: COLUMNS,
					filtering: true,
					state: { columnFilters: filters },
				}),
			{ initialProps: { filters: filtersA } },
		)
		expect(result.current.store.state.columnFilters).toBe(filtersA)

		rerender({ filters: filtersB })
		expect(result.current.store.state.columnFilters).toBe(filtersB)
		expect(result.current.store.state.columnFilters).toBe(filtersB)
	})

	it('does not invoke onStateChange when state prop is the source of the change', () => {
		const onStateChange = vi.fn()
		const { rerender } = renderHook(
			({ isPending }: { isPending: boolean }) =>
				useDataGrid({
					features: TEST_FEATURES,
					data: USERS,
					columns: COLUMNS,
					state: { loading: { isPending, isFetching: false, isError: false, error: null } },
					onStateChange,
				}),
			{ initialProps: { isPending: false } },
		)
		onStateChange.mockClear()
		rerender({ isPending: true })
		// The prop is the source of truth, so its own value is never reported back: consumers
		// that mirror the callback into React state would loop indefinitely. `syncControlledState`
		// used to provide this by skipping the callback; that method is gone and the controlled
		// publish now moves the store like any other write, so the filter is `isControlledEcho`
		// on this side of the subscription.
		expect(onStateChange).not.toHaveBeenCalled()
	})

	it('skips the snapshot push when supplied slices are referentially equal', () => {
		const stableLoading = { isPending: false, isFetching: false, isError: false, error: null }
		const { result, rerender } = renderHook(
			({ tag: _tag }: { tag: number }) =>
				useDataGrid({ features: TEST_FEATURES, data: USERS, columns: COLUMNS, state: { loading: stableLoading } }),
			{ initialProps: { tag: 0 } },
		)
		const snapshotBefore = result.current.store.state
		// Force a re-render where `state` still points at the same slice references.
		rerender({ tag: 1 })
		const snapshotAfter = result.current.store.state
		// No work was done → snapshot identity is preserved.
		expect(snapshotAfter).toBe(snapshotBefore)
	})
})

describe('useDataGrid — virtualized', () => {
	it('VIRTUALIZED_KEY is undefined when virtualized not set', () => {
		const { result } = renderHook(() => useDataGrid({ features: TEST_FEATURES, data: USERS, columns: COLUMNS }))
		const key = result.current.grid.virtualization
		expect(key).toBeUndefined()
	})

	it('VIRTUALIZED_KEY stores normalized config when virtualization: true', () => {
		const { result } = renderHook(() =>
			useDataGrid({ features: TEST_FEATURES, data: USERS, columns: COLUMNS, virtualization: true }),
		)
		const key = result.current.grid.virtualization
		expect(key).toEqual({ row: {} })
	})

	it('VIRTUALIZED_KEY stores normalized config when virtualization: { row: true }', () => {
		const { result } = renderHook(() =>
			useDataGrid({ features: TEST_FEATURES, data: USERS, columns: COLUMNS, virtualization: { row: true } }),
		)
		const key = result.current.grid.virtualization
		expect(key).toEqual({ row: {} })
	})

	it('VIRTUALIZED_KEY stores RowVirtualizationConfig when provided', () => {
		const { result } = renderHook(() =>
			useDataGrid({ features: TEST_FEATURES, data: USERS, columns: COLUMNS, virtualization: { row: { overscan: 8 } } }),
		)
		const key = result.current.grid.virtualization
		expect(key).toEqual({ row: { overscan: 8 } })
	})

	it('VIRTUALIZED_KEY is undefined when virtualization: false', () => {
		const { result } = renderHook(() =>
			useDataGrid({ features: TEST_FEATURES, data: USERS, columns: COLUMNS, virtualization: false }),
		)
		const key = result.current.grid.virtualization
		expect(key).toBeUndefined()
	})
})

describe('useDataGrid — pagination.items', () => {
	it('is undefined when pagination is not set', () => {
		const { result } = renderHook(() => useDataGrid({ features: TEST_FEATURES, data: USERS, columns: COLUMNS }))
		expect(result.current.grid.pagination.items).toBeUndefined()
	})

	it('falls back to the default list when page-based pagination carries no explicit one', () => {
		// The list is data the hand-placed `<DataGrid.PageSizer />` reads; whether the grid
		// mounts the control is `pagination.pageSizer`, resolved separately.
		const { result } = renderHook(() =>
			useDataGrid({ features: TEST_FEATURES, data: USERS, columns: COLUMNS, pagination: { pageSize: 5 } }),
		)
		expect(result.current.grid.pagination.items).toEqual([...DATA_GRID_DEFAULTS.pagination.items])
		expect(result.current.grid.pagination.pageSizer).toBeUndefined()
	})

	it('stores the explicit options in page-based mode', () => {
		const { result } = renderHook(() =>
			useDataGrid({
				features: TEST_FEATURES,
				data: USERS,
				columns: COLUMNS,
				pagination: { pageSize: 5, items: [5, 10, 25] },
			}),
		)
		expect(result.current.grid.pagination.items).toEqual([5, 10, 25])
	})

	it('is undefined in infinite mode — there is no page size to select', () => {
		const { result } = renderHook(() =>
			useDataGrid({
				features: TEST_FEATURES,
				data: USERS,
				columns: COLUMNS,
				pagination: { mode: 'infinite', items: [5, 10, 25] },
			}),
		)
		expect(result.current.grid.pagination.items).toBeUndefined()
	})

	it('still applies the rest of the pagination config alongside items', () => {
		const { result } = renderHook(() =>
			useDataGrid({
				features: TEST_FEATURES,
				data: USERS,
				columns: COLUMNS,
				pagination: { pageSize: 5, items: [5, 10, 25] },
			}),
		)
		expect(result.current.store.state.pagination.pageSize).toBe(5)
	})
})

describe('useDataGrid — selection.bar', () => {
	it('resolves to undefined when selection is not enabled', () => {
		const { result } = renderHook(() => useDataGrid({ features: TEST_FEATURES, data: USERS, columns: COLUMNS }))
		const key = result.current.grid.selection.bar
		expect(key).toBeUndefined()
	})

	it('resolves to the default variant when selection: true (the bar is on by default)', () => {
		const { result } = renderHook(() =>
			useDataGrid({ features: TEST_FEATURES, data: USERS, columns: COLUMNS, selection: true }),
		)
		const key = result.current.grid.selection.bar
		expect(key).toEqual({ variant: 'floating' })
	})

	it('resolves the default variant when selection: { bar: true }', () => {
		const { result } = renderHook(() =>
			useDataGrid({ features: TEST_FEATURES, data: USERS, columns: COLUMNS, selection: { bar: true } }),
		)
		const key = result.current.grid.selection.bar
		expect(key).toEqual({ variant: 'floating' })
	})

	it('resolves to undefined when selection: { bar: false }', () => {
		const { result } = renderHook(() =>
			useDataGrid({ features: TEST_FEATURES, data: USERS, columns: COLUMNS, selection: { bar: false } }),
		)
		const key = result.current.grid.selection.bar
		expect(key).toBeUndefined()
	})

	it('carries the callbacks through, with the variant settled', () => {
		const onClear = vi.fn()
		const { result } = renderHook(() =>
			useDataGrid({ features: TEST_FEATURES, data: USERS, columns: COLUMNS, selection: { bar: { onClear } } }),
		)
		const key = result.current.grid.selection.bar
		expect(key).toEqual({ variant: 'floating', onClear })
	})

	it('takes the render mode as a scalar', () => {
		const { result } = renderHook(() =>
			useDataGrid({ features: TEST_FEATURES, data: USERS, columns: COLUMNS, selection: { bar: 'inline' } }),
		)
		expect(result.current.grid.selection.bar).toEqual({ variant: 'inline' })
	})

	it('SELECTION_BAR_KEY stores variant: "inline" when configured', () => {
		const { result } = renderHook(() =>
			useDataGrid({
				features: TEST_FEATURES,
				data: USERS,
				columns: COLUMNS,
				selection: { bar: { variant: 'inline' } },
			}),
		)
		const key = result.current.grid.selection.bar
		expect(key).toEqual({ variant: 'inline' })
	})

	it('enables core row selection and extracts the React-only bar from an object selection', () => {
		const { result } = renderHook(() =>
			useDataGrid({
				features: TEST_FEATURES,
				data: USERS,
				columns: COLUMNS,
				selection: { bar: { variant: 'inline' } },
			}),
		)
		// The object `selection` (with only a React-only `bar`) still enables core row selection…
		expect(result.current.options.enableRowSelection).toBe(true)
		// …and the bar config is lifted onto the table for SelectionBar to read.
		const key = result.current.grid.selection.bar
		expect(key).toEqual({ variant: 'inline' })
	})

	it('FILTERING_VARIANT_KEY accepts "panel" and writes it through to the table', () => {
		const { result } = renderHook(() =>
			useDataGrid({ features: TEST_FEATURES, data: USERS, columns: COLUMNS, filtering: { variant: 'panel' } }),
		)
		const key = result.current.grid.filtering.variant
		expect(key).toBe('panel')
	})

	it('FILTERING_VARIANT_KEY accepts "inline" and "popover" as before', () => {
		const inline = renderHook(() =>
			useDataGrid({ features: TEST_FEATURES, data: USERS, columns: COLUMNS, filtering: { variant: 'inline' } }),
		)
		const popover = renderHook(() =>
			useDataGrid({ features: TEST_FEATURES, data: USERS, columns: COLUMNS, filtering: { variant: 'popover' } }),
		)
		expect(inline.result.current.grid.filtering.variant).toBe('inline')
		expect(popover.result.current.grid.filtering.variant).toBe('popover')
	})
})

type Sort = { id: string; desc: boolean }

describe('useDataGrid — controlled state', () => {
	it('applies controlled sorting from state prop', () => {
		const sorting: Sort[] = [{ id: 'name', desc: true }]
		const { result } = renderHook(() =>
			useDataGrid({ features: TEST_FEATURES, data: USERS, columns: COLUMNS, sorting: true, state: { sorting } }),
		)
		const rows = result.current.getRowModel().rows
		expect(rows[0]?.getValue('name')).toBe('Bob')
		expect(rows[1]?.getValue('name')).toBe('Alice')
	})

	it('updates table when controlled state changes', () => {
		const { result, rerender } = renderHook(
			({ sorting }: { sorting: Sort[] }) =>
				useDataGrid({ features: TEST_FEATURES, data: USERS, columns: COLUMNS, sorting: true, state: { sorting } }),
			{ initialProps: { sorting: [] as Sort[] } },
		)
		expect(result.current.getRowModel().rows[0]?.getValue('name')).toBe('Alice')

		rerender({ sorting: [{ id: 'name', desc: true }] })
		expect(result.current.getRowModel().rows[0]?.getValue('name')).toBe('Bob')
	})

	it('calls onStateChange when table state changes', () => {
		const onStateChange = vi.fn()
		const { result } = renderHook(() =>
			useDataGrid({
				features: TEST_FEATURES,
				data: USERS,
				columns: COLUMNS,
				creating: { onSave: () => Promise.resolve() },
				onStateChange,
			}),
		)
		act(() => {
			result.current.creating.start()
		})
		expect(onStateChange).toHaveBeenCalled()
	})

	it('always uses the latest onStateChange callback after re-render', () => {
		const first = vi.fn()
		const second = vi.fn()
		const { result, rerender } = renderHook(
			({ cb }: { cb: typeof first }) =>
				useDataGrid({
					features: TEST_FEATURES,
					data: USERS,
					columns: COLUMNS,
					creating: { onSave: () => Promise.resolve() },
					onStateChange: cb,
				}),
			{ initialProps: { cb: first } },
		)
		rerender({ cb: second })
		act(() => {
			result.current.creating.start()
		})
		expect(first).not.toHaveBeenCalled()
		expect(second).toHaveBeenCalled()
	})

	it('leaves uncontrolled state portions internally managed', () => {
		const { result } = renderHook(() =>
			useDataGrid({
				features: TEST_FEATURES,
				data: USERS,
				columns: COLUMNS,
				sorting: true,
				pagination: true,
				state: { sorting: [{ id: 'name', desc: true }] },
			}),
		)
		// Pagination not controlled — internal default page index is 0
		expect(result.current.store.state.pagination.pageIndex).toBe(0)
		// Sorting is controlled
		expect(result.current.store.state.sorting).toEqual([{ id: 'name', desc: true }])
	})
})

// ── globalFiltering normalization ─────────────────────────────────────────────

/**
 * Just the bag these readers want.
 *
 * Not `DataTable<GridFeatures, User>`: `TEST_FEATURES` is a concrete object, so `useDataGrid`
 * infers its own feature set and the resulting table is not assignable to the widest
 * instantiation under `exactOptionalPropertyTypes`. `grid` is `ResolvedGridOptions` whatever the
 * feature set is, which is the whole of what these three read.
 */
type GridBag = Pick<DataTable<GridFeatures, User>, 'grid'>

function getNormalizedGlobalFiltering(table: GridBag): NormalizedGlobalFilteringConfig | undefined {
	return table.grid.globalFiltering
}

describe('useDataGrid — globalFiltering normalization', () => {
	it('globalFiltering omitted — nothing stored on table', () => {
		const { result } = renderHook(() => useDataGrid({ features: TEST_FEATURES, data: USERS, columns: COLUMNS }))
		expect(getNormalizedGlobalFiltering(result.current)).toBeUndefined()
	})

	it('globalFiltering: true → defaults (placeholder, debounce: 250, toolbar: true)', () => {
		const { result } = renderHook(() =>
			useDataGrid({ features: TEST_FEATURES, data: USERS, columns: COLUMNS, globalFiltering: true }),
		)
		const cfg = getNormalizedGlobalFiltering(result.current)
		expect(cfg).toEqual({ placeholder: 'Search…', debounce: 250, toolbar: true })
	})

	it('globalFiltering: { placeholder, debounce, toolbar: false } — overrides merge into defaults', () => {
		const { result } = renderHook(() =>
			useDataGrid({
				features: TEST_FEATURES,
				data: USERS,
				columns: COLUMNS,
				globalFiltering: { placeholder: 'Find users', debounce: 0, toolbar: false },
			}),
		)
		const cfg = getNormalizedGlobalFiltering(result.current)
		expect(cfg).toEqual({ placeholder: 'Find users', debounce: 0, toolbar: false })
	})

	// In v9 the filtered row model is a **feature slot** (`options.features.filteredRowModel`),
	// not a `getFilteredRowModel` table option, so the old shape of this case could only ever read
	// `undefined`. What it was really pinning is that the search axis runs on a grid whose column
	// filters are gated off — asserted directly, on rows rather than on the option that used to
	// enable them.
	it('globalFiltering filters even with column filtering gated off', () => {
		const { result } = renderHook(() =>
			useDataGrid({ features: TEST_FEATURES, data: USERS, columns: COLUMNS, globalFiltering: true }),
		)
		expect(result.current.options.enableColumnFilters).toBe(false)
		act(() => {
			result.current.setGlobalFilter('alice')
		})
		expect(result.current.getFilteredRowModel().rows).toHaveLength(1)
	})

	it('setGlobalFilter actually filters rows', () => {
		const { result } = renderHook(() =>
			useDataGrid({ features: TEST_FEATURES, data: USERS, columns: COLUMNS, globalFiltering: true }),
		)
		act(() => {
			result.current.setGlobalFilter('alice')
		})
		expect(result.current.getFilteredRowModel().rows).toHaveLength(1)
		expect(result.current.getFilteredRowModel().rows[0]?.getValue('name')).toBe('Alice')
	})

	// The React layer splits this config into a UI half and a core half. Every
	// non-UI field has to survive that split — dropping `onChange` silently
	// disables server-side search, which no type error would have caught.
	it('reports the new value through globalFiltering.onChange', () => {
		const onChange = vi.fn()
		const { result } = renderHook(() =>
			useDataGrid({ features: TEST_FEATURES, data: USERS, columns: COLUMNS, globalFiltering: { onChange } }),
		)
		act(() => {
			result.current.setGlobalFilter('alice')
		})
		expect(onChange).toHaveBeenCalledWith('alice')
	})

	it('reports through onChange even when UI-only fields are also set', () => {
		const onChange = vi.fn()
		const { result } = renderHook(() =>
			useDataGrid({
				features: TEST_FEATURES,
				data: USERS,
				columns: COLUMNS,
				globalFiltering: { placeholder: 'Find users', debounce: 0, toolbar: false, onChange },
			}),
		)
		act(() => {
			result.current.setGlobalFilter('bob')
		})
		expect(onChange).toHaveBeenCalledWith('bob')
	})

	it('keeps a custom `fn` working alongside `onChange`', () => {
		const onChange = vi.fn()
		const { result } = renderHook(() =>
			useDataGrid({
				features: TEST_FEATURES,
				data: USERS,
				columns: COLUMNS,
				globalFiltering: { fn: (row, _columnId, value) => row.getValue<string>('name') === value, onChange },
			}),
		)
		act(() => {
			result.current.setGlobalFilter('Alice')
		})
		expect(onChange).toHaveBeenCalledWith('Alice')
		expect(result.current.getFilteredRowModel().rows).toHaveLength(1)
	})
})

// ── filtering.chips normalization ─────────────────────────────────────────────

function getChipsConfig(table: GridBag): NormalizedFilterChipsConfig | undefined {
	return table.grid.filtering.chips
}

describe('useDataGrid — filtering.chips normalization', () => {
	it('omitted → FILTER_CHIPS_KEY is undefined', () => {
		const { result } = renderHook(() =>
			useDataGrid({ features: TEST_FEATURES, data: USERS, columns: COLUMNS, filtering: true }),
		)
		expect(getChipsConfig(result.current)).toBeUndefined()
	})

	it('chips: true → defaults to position "above"', () => {
		const { result } = renderHook(() =>
			useDataGrid({ features: TEST_FEATURES, data: USERS, columns: COLUMNS, filtering: { chips: true } }),
		)
		expect(getChipsConfig(result.current)).toEqual({ position: 'above' })
	})

	it('chips: { position: "below" } → preserved', () => {
		const { result } = renderHook(() =>
			useDataGrid({
				features: TEST_FEATURES,
				data: USERS,
				columns: COLUMNS,
				filtering: { chips: { position: 'below' } },
			}),
		)
		expect(getChipsConfig(result.current)).toEqual({ position: 'below' })
	})

	it('chips: false → FILTER_CHIPS_KEY is undefined', () => {
		const { result } = renderHook(() =>
			useDataGrid({ features: TEST_FEATURES, data: USERS, columns: COLUMNS, filtering: { chips: false } }),
		)
		expect(getChipsConfig(result.current)).toBeUndefined()
	})
})

// ── filtering.toolbar (Clear-all button) normalization ────────────────────────

function getFilteringToolbarConfig(table: GridBag): NormalizedFilteringToolbarConfig | undefined {
	return table.grid.filtering.toolbar
}

describe('useDataGrid — filtering.toolbar normalization', () => {
	it('omitted → FILTERING_TOOLBAR_KEY is undefined', () => {
		const { result } = renderHook(() =>
			useDataGrid({ features: TEST_FEATURES, data: USERS, columns: COLUMNS, filtering: true }),
		)
		expect(getFilteringToolbarConfig(result.current)).toBeUndefined()
	})

	it('toolbar: true → alwaysShow defaults to false', () => {
		const { result } = renderHook(() =>
			useDataGrid({ features: TEST_FEATURES, data: USERS, columns: COLUMNS, filtering: { toolbar: true } }),
		)
		expect(getFilteringToolbarConfig(result.current)).toEqual({ alwaysShow: false })
	})

	it('toolbar: { alwaysShow: true } → preserved', () => {
		const { result } = renderHook(() =>
			useDataGrid({
				features: TEST_FEATURES,
				data: USERS,
				columns: COLUMNS,
				filtering: { toolbar: { alwaysShow: true } },
			}),
		)
		expect(getFilteringToolbarConfig(result.current)).toEqual({ alwaysShow: true })
	})

	it('toolbar: false → FILTERING_TOOLBAR_KEY is undefined', () => {
		const { result } = renderHook(() =>
			useDataGrid({ features: TEST_FEATURES, data: USERS, columns: COLUMNS, filtering: { toolbar: false } }),
		)
		expect(getFilteringToolbarConfig(result.current)).toBeUndefined()
	})
})

// ── draft — controlled `state` prop mirrored the same way a real consumer writes it ──
//
// Settles a documentation dispute: production.mdx claimed a controlled consumer must NOT mirror
// `sorting` / `columnFilters` / `globalFilter` back through `state` while `draft` is on, because
// the render-time controlled-state sync would clobber the pending draft. It is safe, and under v9
// for a stronger reason than the `deferred && draft.isDirty()` filter `syncControlledState` used to
// apply: the three deferred axes are owned by `options.atoms`, which beats every other source
// unconditionally, so a controlled write to one of them does not land at all — clean or dirty
// (pr1-outcomes §4.4). `use-data-grid-lifecycle.test.tsx` states that half positively.
describe('useDataGrid — draft with a mirrored controlled state prop', () => {
	/** Render count for the enclosing hook body — proves re-syncing the stale prop does not spin. */
	function useDeferredControlledGrid() {
		const renderCountRef = useRef(0)
		renderCountRef.current += 1

		const [tableState, setTableState] = useState<Partial<TableState<GridFeatures>>>({})
		const table = useDataGrid({
			features: TEST_FEATURES,
			data: USERS,
			columns: COLUMNS,
			draft: true,
			sorting: { manual: true },
			state: tableState,
			// The exact pattern a real consumer writes: mirror the whole resolved state back in.
			onStateChange: (nextState) => {
				setTableState(nextState)
			},
		})
		return { table, tableState, renderCount: renderCountRef.current }
	}

	it('keeps the draft alive across a re-render carrying the consumer stale mirrored state, then applies on demand', () => {
		const { result, rerender } = renderHook(() => useDeferredControlledGrid())

		// Seed an applied query so the mirrored `state` prop actually carries sorting/columnFilters/
		// globalFilter afterwards — an empty `{}` would never exercise `hasChanges` on those axes.
		act(() => {
			result.current.table.setSorting([{ id: 'name', desc: true }])
		})
		act(() => {
			result.current.table.draft.apply()
		})
		expect(result.current.tableState.sorting).toEqual([{ id: 'name', desc: true }])
		expect(result.current.table.draft.isDirty()).toBe(false)

		const renderCountAfterSeed = result.current.renderCount

		// A new draft editing: outward state is unchanged while dirty, so `onStateChange` never fires —
		// the consumer's mirrored `tableState` now holds the last APPLIED query, not this new draft.
		act(() => {
			result.current.table.setSorting([{ id: 'name', desc: false }])
		})
		expect(result.current.tableState.sorting).toEqual([{ id: 'name', desc: true }]) // still stale
		expect(result.current.table.store.state.sorting).toEqual([{ id: 'name', desc: false }]) // draft moved

		// Force the render-time controlled-state sync to run again with that stale mirrored prop —
		// simulates the parent re-rendering for any unrelated reason while the draft is pending.
		rerender()
		rerender()
		rerender()

		// The draft — not the consumer's stale mirror — is still what the grid shows.
		expect(result.current.table.store.state.sorting).toEqual([{ id: 'name', desc: false }])
		expect(result.current.table.draft.isDirty()).toBe(true)
		expect(result.current.table.store.state.applied.sorting).toEqual([{ id: 'name', desc: true }])

		// No spin: three manual re-renders produced exactly three additional render passes, not an
		// unbounded cascade — `onStateChange` staying silent while dirty means the render-time sync
		// can never itself trigger another render of this component.
		expect(result.current.renderCount).toBe(renderCountAfterSeed + 3)

		// Applying hands the consumer the new query in the very next mirrored state.
		act(() => {
			result.current.table.draft.apply()
		})
		expect(result.current.table.draft.isDirty()).toBe(false)
		expect(result.current.tableState.sorting).toEqual([{ id: 'name', desc: false }])
		expect(result.current.table.store.state.applied.sorting).toEqual([{ id: 'name', desc: false }])
	})
})

// ── controlled × deferred — the two filters on the `onStateChange` subscription ──
//
// The migration's one real public behaviour change, and the one place where "the state is
// controlled" and "the query is deferred" meet. Both filters live on the same subscriber in
// `use-data-grid.ts`, in an order that is not the obvious one:
//
//     const projected = projectApplied === undefined ? next : projectApplied(next)
//     if (isControlledEcho(previous, next, controlledStateRef.current)) return
//     if (projected === undefined) return
//
// Under v8 the echo skip lived inside `syncControlledState`, which wrote the prop without firing
// the callback; that method is gone, the controlled publish now moves the store like any other
// write, and the skip had to move onto this side of the subscription. `isControlledEcho` is that
// skip. The projection is `draft`'s: a draft edit moves a live axis the projection replaces, so
// it compares equal and stays silent.
//
// The order is the part nothing else states. `projectApplied` is stateful — it compares against
// its own **last projection** — so it has to be fed every store value, including the ones the
// echo filter is about to swallow. Writing the two checks the natural way round (echo first,
// project second) leaves the emitter's baseline stuck at whatever it saw before the consumer's
// write, and the next grid-initiated change that happens to land back on that stale value is
// compared equal and **never reaches the consumer at all**.
//
// The two cases below are exactly those two claims, in the configuration where they interact.
describe('useDataGrid — controlled state under deferred apply', () => {
	const HIDDEN = { name: false }

	/** A deferring grid whose `columnVisibility` — a NON-deferred slice — is parent-owned. */
	function renderDeferredControlled(onStateChange: (state: TableState<GridFeatures>) => void) {
		return renderHook(
			({ visibility }: { visibility: Record<string, boolean> }) =>
				useDataGrid({
					features: TEST_FEATURES,
					data: USERS,
					columns: COLUMNS,
					draft: true,
					sorting: { manual: true },
					state: { columnVisibility: visibility },
					onStateChange,
				}),
			{ initialProps: { visibility: {} } },
		)
	}

	it('does not report the controlled prop back to the consumer while deferring', () => {
		const onStateChange = vi.fn()
		const { rerender } = renderDeferredControlled(onStateChange)
		onStateChange.mockClear()

		// The consumer's own write, on a slice `draft` does not defer. The publish moves the store,
		// so the subscriber runs; every changed key is the one the consumer owns at exactly this
		// value, so `isControlledEcho` swallows it. Without that filter a consumer mirroring the
		// callback into React state loops.
		rerender({ visibility: HIDDEN })
		expect(onStateChange).not.toHaveBeenCalled()
	})

	it('keeps the applied-emitter baseline current across a suppressed echo', () => {
		const onStateChange = vi.fn<(state: TableState<GridFeatures>) => void>()
		const { result, rerender } = renderDeferredControlled(onStateChange)

		const initialVisibility = result.current.store.state.columnVisibility

		// 1. The consumer hides a column. Suppressed as an echo (the case above) — but the
		//    projection must still have consumed it.
		rerender({ visibility: HIDDEN })
		expect(result.current.store.state.columnVisibility).toBe(HIDDEN)
		onStateChange.mockClear()

		// 2. The grid itself moves that slice back to the value the emitter last saw *before* the
		//    consumer's write. Not an echo — the prop holds `HIDDEN` and the store now holds the
		//    original — so it must reach the consumer.
		act(() => {
			result.current.setColumnVisibility(initialVisibility)
		})

		// With the projection fed on every store value this compares against `HIDDEN` and emits.
		// With it fed only on the calls the echo filter lets through, the emitter's baseline is
		// still the original object, the comparison is `unchanged`, and the consumer is told
		// nothing about a change the grid made on its own initiative.
		expect(onStateChange).toHaveBeenCalled()
		expect(onStateChange.mock.calls[0]?.[0].columnVisibility).toBe(initialVisibility)
	})
})
