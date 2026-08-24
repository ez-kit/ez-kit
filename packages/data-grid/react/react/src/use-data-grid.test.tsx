import { createColumns } from '@ez-kit/data-grid-core'
import { act, render, renderHook } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { buildPaginationLabel } from './data-grid/pagination-label'
import { PaginationVariants } from './types'
import {
	FILTERING_VARIANT_KEY,
	FILTER_CHIPS_KEY,
	FILTER_CLEAR_BUTTON_KEY,
	GLOBAL_FILTERING_KEY,
	PAGE_SIZER_KEY,
	SELECTION_PANEL_KEY,
	VIRTUALIZED_KEY,
	useDataGrid,
} from './use-data-grid'

import type {
	NormalizedClearButtonConfig,
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
	tableState: Partial<TableState>
	onStateChange: (state: TableState) => void
}

/** Renders the live `pageIndex` under fully controlled manual pagination. */
function ClampGrid({ rowCount, tableState, onStateChange }: ClampGridProps) {
	const { table } = useDataGrid({
		data: USERS,
		columns: COLUMNS,
		pagination: { manual: true, rowCount, pageSize: 10 },
		state: tableState,
		onStateChange,
	})
	return <span data-testid='page-index'>{table.getState().pagination.pageIndex}</span>
}

/** Parent-owned controlled state — the ordinary consumer shape (state above the grid). */
function ClampPage({ rowCount }: { rowCount: number }) {
	const [tableState, setTableState] = useState<Partial<TableState>>({
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
	it('creates a table instance with initial data', () => {
		const { result } = renderHook(() => useDataGrid({ data: USERS, columns: COLUMNS }))
		expect(result.current.table.getRowModel().rows).toHaveLength(2)
	})

	it('instance is stable across re-renders', () => {
		const { result, rerender } = renderHook(() => useDataGrid({ data: USERS, columns: COLUMNS }))
		const instance1 = result.current
		rerender()
		expect(result.current).toBe(instance1)
	})

	it('updates data when config.data changes', () => {
		const newData = [{ id: 3, name: 'Carol' }]
		const { result, rerender } = renderHook(({ data }: { data: User[] }) => useDataGrid({ data, columns: COLUMNS }), {
			initialProps: { data: USERS },
		})
		rerender({ data: newData })
		expect(result.current.table.getRowModel().rows).toHaveLength(1)
		expect(result.current.table.getRowModel().rows[0]?.getValue('name')).toBe('Carol')
	})

	it('re-syncs manual pagination rowCount when it changes', () => {
		const { result, rerender } = renderHook(
			({ rowCount }: { rowCount: number }) =>
				useDataGrid({
					data: USERS,
					columns: COLUMNS,
					pagination: { manual: true, rowCount, pageSize: 10 },
					state: { pagination: { pageIndex: 0, pageSize: 10 } },
				}),
			{ initialProps: { rowCount: 0 } },
		)
		expect(result.current.table.getRowCount()).toBe(0)
		expect(result.current.table.getPageCount()).toBe(0)

		rerender({ rowCount: 1250 })
		expect(result.current.table.getRowCount()).toBe(1250)
		expect(result.current.table.getPageCount()).toBe(125)
	})

	// Regression (#82): `autoResetPageIndex` defaults to `!manualPagination`, so TanStack never
	// rewinds the page itself under manual mode. With a shrinking server total the footer claimed
	// "0–0 of 5" while `getPaginationRowModel()` — the whole `data` under manual mode — still
	// rendered all 5 rows.
	it('clamps pageIndex to the last page when a manual rowCount shrinks under the user', () => {
		const { result, rerender } = renderHook(
			({ rowCount }: { rowCount: number }) =>
				useDataGrid({
					data: USERS,
					columns: COLUMNS,
					pagination: { manual: true, rowCount, pageSize: 10 },
				}),
			{ initialProps: { rowCount: 500 } },
		)

		act(() => {
			result.current.table.setPageIndex(2)
		})
		expect(result.current.table.getState().pagination.pageIndex).toBe(2)

		// A server filter narrows 500 rows to 5 while the user sits on page 3.
		rerender({ rowCount: 5 })

		expect(result.current.table.getState().pagination.pageIndex).toBe(0)
		expect(
			buildPaginationLabel({
				variant: PaginationVariants.Simple,
				pageIndex: result.current.table.getState().pagination.pageIndex,
				pageSize: 10,
				rowCount: result.current.table.getRowCount(),
			}),
		).toBe('1–5 of 5')
	})

	it('clamps pageIndex to the first page when a manual rowCount drops to zero', () => {
		const { result, rerender } = renderHook(
			({ rowCount }: { rowCount: number }) =>
				useDataGrid({
					data: USERS,
					columns: COLUMNS,
					pagination: { manual: true, rowCount, pageSize: 10 },
				}),
			{ initialProps: { rowCount: 500 } },
		)

		act(() => {
			result.current.table.setPageIndex(2)
		})

		rerender({ rowCount: 0 })

		expect(result.current.table.getState().pagination.pageIndex).toBe(0)
	})

	it('leaves pageIndex alone while it is still within a shrunken manual rowCount', () => {
		const { result, rerender } = renderHook(
			({ rowCount }: { rowCount: number }) =>
				useDataGrid({
					data: USERS,
					columns: COLUMNS,
					pagination: { manual: true, rowCount, pageSize: 10 },
				}),
			{ initialProps: { rowCount: 500 } },
		)

		act(() => {
			result.current.table.setPageIndex(2)
		})

		// 50 rows still spans 5 pages — page 3 remains valid, so nothing to clamp.
		rerender({ rowCount: 50 })

		expect(result.current.table.getState().pagination.pageIndex).toBe(2)
	})

	it('never clamps pageIndex when the manual total is unknown', () => {
		const { result, rerender } = renderHook(
			({ data }: { data: User[] }) =>
				useDataGrid({
					data,
					columns: COLUMNS,
					// Neither rowCount nor pageCount: the total is genuinely unknown.
					pagination: { manual: true, pageSize: 10 },
				}),
			{ initialProps: { data: USERS } },
		)

		act(() => {
			result.current.table.setPageIndex(2)
		})

		rerender({ data: [{ id: 3, name: 'Carol' }] })

		expect(result.current.table.getState().pagination.pageIndex).toBe(2)
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
		const deepLinked: Partial<TableState> = { pagination: { pageIndex: 3, pageSize: 10 } }
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
		const deepLinked: Partial<TableState> = { pagination: { pageIndex: 3, pageSize: 10 } }
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
		const ignoredState: Partial<TableState> = { pagination: { pageIndex: 2, pageSize: 10 } }
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
					data: USERS,
					columns: COLUMNS,
					pagination: { manual: true, pageCount, pageSize: 10 },
					state: { pagination: { pageIndex: 0, pageSize: 10 } },
				}),
			{ initialProps: { pageCount: -1 } },
		)
		expect(result.current.table.getPageCount()).toBe(-1)

		rerender({ pageCount: 7 })
		expect(result.current.table.getPageCount()).toBe(7)
	})

	it('re-renders when table state changes', () => {
		const { result } = renderHook(() =>
			useDataGrid({
				data: USERS,
				columns: COLUMNS,
				creating: { onSave: () => Promise.resolve() },
			}),
		)
		expect(result.current.table.creating.getState().isOpen).toBe(false)
		act(() => {
			result.current.table.creating.start()
		})
		expect(result.current.table.creating.getState().isOpen).toBe(true)
	})

	it('seeds loading from initialState (uncontrolled default)', () => {
		const { result } = renderHook(() =>
			useDataGrid({
				data: USERS,
				columns: COLUMNS,
				initialState: { loading: { isPending: true, isFetching: false, isError: false, error: null } },
			}),
		)
		expect(result.current.table.getSnapshot().loading.isPending).toBe(true)
	})

	it('propagates state.loading into the external snapshot so subscribers see it', () => {
		const { result, rerender } = renderHook(
			({ isPending }: { isPending: boolean }) =>
				useDataGrid({
					data: USERS,
					columns: COLUMNS,
					state: { loading: { isPending, isFetching: false, isError: false, error: null } },
				}),
			{ initialProps: { isPending: false } },
		)
		// Baseline: snapshot reflects initial state
		expect(result.current.table.getSnapshot().loading.isPending).toBe(false)

		// Flip via the controlled `state` prop — both options.state AND the external
		// store must update so useSyncExternalStore subscribers (e.g. Body) re-read.
		rerender({ isPending: true })
		expect(result.current.table.getSnapshot().loading.isPending).toBe(true)
	})

	it('propagates state.columnFilters into the external snapshot', () => {
		const filtersA: { id: string; value: unknown }[] = []
		const filtersB = [{ id: 'name', value: 'Alice' }]
		const { result, rerender } = renderHook(
			({ filters }: { filters: { id: string; value: unknown }[] }) =>
				useDataGrid({
					data: USERS,
					columns: COLUMNS,
					filtering: true,
					state: { columnFilters: filters },
				}),
			{ initialProps: { filters: filtersA } },
		)
		expect(result.current.table.getSnapshot().columnFilters).toBe(filtersA)

		rerender({ filters: filtersB })
		expect(result.current.table.getSnapshot().columnFilters).toBe(filtersB)
		expect(result.current.table.getState().columnFilters).toBe(filtersB)
	})

	it('does not invoke onStateChange when state prop is the source of the change', () => {
		const onStateChange = vi.fn()
		const { rerender } = renderHook(
			({ isPending }: { isPending: boolean }) =>
				useDataGrid({
					data: USERS,
					columns: COLUMNS,
					state: { loading: { isPending, isFetching: false, isError: false, error: null } },
					onStateChange,
				}),
			{ initialProps: { isPending: false } },
		)
		onStateChange.mockClear()
		rerender({ isPending: true })
		// Prop-driven sync goes through syncControlledState, which intentionally skips
		// onStateChange — otherwise consumers that mirror the callback back into React
		// state would loop indefinitely.
		expect(onStateChange).not.toHaveBeenCalled()
	})

	it('skips the snapshot push when supplied slices are referentially equal', () => {
		const stableLoading = { isPending: false, isFetching: false, isError: false, error: null }
		const { result, rerender } = renderHook(
			({ tag: _tag }: { tag: number }) =>
				useDataGrid({
					data: USERS,
					columns: COLUMNS,
					state: { loading: stableLoading },
				}),
			{ initialProps: { tag: 0 } },
		)
		const snapshotBefore = result.current.table.getSnapshot()
		// Force a re-render where `state` still points at the same slice references.
		rerender({ tag: 1 })
		const snapshotAfter = result.current.table.getSnapshot()
		// No work was done → snapshot identity is preserved.
		expect(snapshotAfter).toBe(snapshotBefore)
	})
})

describe('useDataGrid — virtualized', () => {
	it('VIRTUALIZED_KEY is undefined when virtualized not set', () => {
		const { result } = renderHook(() => useDataGrid({ data: USERS, columns: COLUMNS }))
		const key = (result.current.table as unknown as Record<symbol, unknown>)[VIRTUALIZED_KEY]
		expect(key).toBeUndefined()
	})

	it('VIRTUALIZED_KEY stores normalized config when virtualized: true', () => {
		const { result } = renderHook(() => useDataGrid({ data: USERS, columns: COLUMNS, virtualized: true }))
		const key = (result.current.table as unknown as Record<symbol, unknown>)[VIRTUALIZED_KEY]
		expect(key).toEqual({ row: {} })
	})

	it('VIRTUALIZED_KEY stores normalized config when virtualized: { row: true }', () => {
		const { result } = renderHook(() => useDataGrid({ data: USERS, columns: COLUMNS, virtualized: { row: true } }))
		const key = (result.current.table as unknown as Record<symbol, unknown>)[VIRTUALIZED_KEY]
		expect(key).toEqual({ row: {} })
	})

	it('VIRTUALIZED_KEY stores RowVirtualOptions when provided', () => {
		const { result } = renderHook(() =>
			useDataGrid({ data: USERS, columns: COLUMNS, virtualized: { row: { overscan: 8 } } }),
		)
		const key = (result.current.table as unknown as Record<symbol, unknown>)[VIRTUALIZED_KEY]
		expect(key).toEqual({ row: { overscan: 8 } })
	})

	it('VIRTUALIZED_KEY is undefined when virtualized: false', () => {
		const { result } = renderHook(() => useDataGrid({ data: USERS, columns: COLUMNS, virtualized: false }))
		const key = (result.current.table as unknown as Record<symbol, unknown>)[VIRTUALIZED_KEY]
		expect(key).toBeUndefined()
	})
})

describe('useDataGrid — pagination.pageSizeOptions', () => {
	it('PAGE_SIZER_KEY is undefined when pagination is not set', () => {
		const { result } = renderHook(() => useDataGrid({ data: USERS, columns: COLUMNS }))
		const key = (result.current.table as unknown as Record<symbol, unknown>)[PAGE_SIZER_KEY]
		expect(key).toBeUndefined()
	})

	it('PAGE_SIZER_KEY is undefined when pagination carries no pageSizeOptions', () => {
		const { result } = renderHook(() => useDataGrid({ data: USERS, columns: COLUMNS, pagination: { pageSize: 5 } }))
		const key = (result.current.table as unknown as Record<symbol, unknown>)[PAGE_SIZER_KEY]
		expect(key).toBeUndefined()
	})

	it('PAGE_SIZER_KEY stores the options in page-based mode', () => {
		const { result } = renderHook(() =>
			useDataGrid({ data: USERS, columns: COLUMNS, pagination: { pageSize: 5, pageSizeOptions: [5, 10, 25] } }),
		)
		const key = (result.current.table as unknown as Record<symbol, unknown>)[PAGE_SIZER_KEY]
		expect(key).toEqual([5, 10, 25])
	})

	it('PAGE_SIZER_KEY is undefined in infinite mode — there is no page size to select', () => {
		const { result } = renderHook(() =>
			useDataGrid({ data: USERS, columns: COLUMNS, pagination: { mode: 'infinite', pageSizeOptions: [5, 10, 25] } }),
		)
		const key = (result.current.table as unknown as Record<symbol, unknown>)[PAGE_SIZER_KEY]
		expect(key).toBeUndefined()
	})

	it('still applies the rest of the pagination config alongside pageSizeOptions', () => {
		const { result } = renderHook(() =>
			useDataGrid({ data: USERS, columns: COLUMNS, pagination: { pageSize: 5, pageSizeOptions: [5, 10, 25] } }),
		)
		expect(result.current.table.getState().pagination.pageSize).toBe(5)
	})
})

describe('useDataGrid — selection.panel', () => {
	it('SELECTION_PANEL_KEY is undefined when selection not set', () => {
		const { result } = renderHook(() => useDataGrid({ data: USERS, columns: COLUMNS }))
		const key = (result.current.table as unknown as Record<symbol, unknown>)[SELECTION_PANEL_KEY]
		expect(key).toBeUndefined()
	})

	it('SELECTION_PANEL_KEY is undefined when selection: true (boolean, no panel)', () => {
		const { result } = renderHook(() => useDataGrid({ data: USERS, columns: COLUMNS, selection: true }))
		const key = (result.current.table as unknown as Record<symbol, unknown>)[SELECTION_PANEL_KEY]
		expect(key).toBeUndefined()
	})

	it('SELECTION_PANEL_KEY stores true when selection: { panel: true }', () => {
		const { result } = renderHook(() => useDataGrid({ data: USERS, columns: COLUMNS, selection: { panel: true } }))
		const key = (result.current.table as unknown as Record<symbol, unknown>)[SELECTION_PANEL_KEY]
		expect(key).toBe(true)
	})

	it('SELECTION_PANEL_KEY stores false when selection: { panel: false }', () => {
		const { result } = renderHook(() => useDataGrid({ data: USERS, columns: COLUMNS, selection: { panel: false } }))
		const key = (result.current.table as unknown as Record<symbol, unknown>)[SELECTION_PANEL_KEY]
		expect(key).toBe(false)
	})

	it('SELECTION_PANEL_KEY stores config object when selection: { panel: { onDelete } }', () => {
		const onDelete = vi.fn()
		const { result } = renderHook(() =>
			useDataGrid({ data: USERS, columns: COLUMNS, selection: { panel: { onDelete } } }),
		)
		const key = (result.current.table as unknown as Record<symbol, unknown>)[SELECTION_PANEL_KEY]
		expect(key).toEqual({ onDelete })
	})

	it('SELECTION_PANEL_KEY stores variant: "inline" when configured', () => {
		const { result } = renderHook(() =>
			useDataGrid({ data: USERS, columns: COLUMNS, selection: { panel: { variant: 'inline' } } }),
		)
		const key = (result.current.table as unknown as Record<symbol, unknown>)[SELECTION_PANEL_KEY]
		expect(key).toEqual({ variant: 'inline' })
	})

	it('enables core row selection and extracts the React-only panel from an object selection', () => {
		const { result } = renderHook(() =>
			useDataGrid({ data: USERS, columns: COLUMNS, selection: { panel: { variant: 'inline' } } }),
		)
		// The object `selection` (with only a React-only `panel`) still enables core row selection…
		expect(result.current.table.options.enableRowSelection).toBe(true)
		// …and the panel is lifted onto the instance for SelectionBar to read.
		const key = (result.current.table as unknown as Record<symbol, unknown>)[SELECTION_PANEL_KEY]
		expect(key).toEqual({ variant: 'inline' })
	})

	it('FILTERING_VARIANT_KEY accepts "panel" and writes it through to the table', () => {
		const { result } = renderHook(() => useDataGrid({ data: USERS, columns: COLUMNS, filtering: { variant: 'panel' } }))
		const key = (result.current.table as unknown as Record<symbol, unknown>)[FILTERING_VARIANT_KEY]
		expect(key).toBe('panel')
	})

	it('FILTERING_VARIANT_KEY accepts "inline" and "popover" as before', () => {
		const inline = renderHook(() => useDataGrid({ data: USERS, columns: COLUMNS, filtering: { variant: 'inline' } }))
		const popover = renderHook(() => useDataGrid({ data: USERS, columns: COLUMNS, filtering: { variant: 'popover' } }))
		expect((inline.result.current.table as unknown as Record<symbol, unknown>)[FILTERING_VARIANT_KEY]).toBe('inline')
		expect((popover.result.current.table as unknown as Record<symbol, unknown>)[FILTERING_VARIANT_KEY]).toBe('popover')
	})
})

type Sort = { id: string; desc: boolean }

describe('useDataGrid — controlled state', () => {
	it('applies controlled sorting from state prop', () => {
		const sorting: Sort[] = [{ id: 'name', desc: true }]
		const { result } = renderHook(() =>
			useDataGrid({ data: USERS, columns: COLUMNS, sorting: true, state: { sorting } }),
		)
		const rows = result.current.table.getRowModel().rows
		expect(rows[0]?.getValue('name')).toBe('Bob')
		expect(rows[1]?.getValue('name')).toBe('Alice')
	})

	it('updates table when controlled state changes', () => {
		const { result, rerender } = renderHook(
			({ sorting }: { sorting: Sort[] }) =>
				useDataGrid({ data: USERS, columns: COLUMNS, sorting: true, state: { sorting } }),
			{ initialProps: { sorting: [] as Sort[] } },
		)
		expect(result.current.table.getRowModel().rows[0]?.getValue('name')).toBe('Alice')

		rerender({ sorting: [{ id: 'name', desc: true }] })
		expect(result.current.table.getRowModel().rows[0]?.getValue('name')).toBe('Bob')
	})

	it('calls onStateChange when table state changes', () => {
		const onStateChange = vi.fn()
		const { result } = renderHook(() =>
			useDataGrid({ data: USERS, columns: COLUMNS, creating: { onSave: () => Promise.resolve() }, onStateChange }),
		)
		act(() => {
			result.current.table.creating.start()
		})
		expect(onStateChange).toHaveBeenCalled()
	})

	it('always uses the latest onStateChange callback after re-render', () => {
		const first = vi.fn()
		const second = vi.fn()
		const { result, rerender } = renderHook(
			({ cb }: { cb: typeof first }) =>
				useDataGrid({
					data: USERS,
					columns: COLUMNS,
					creating: { onSave: () => Promise.resolve() },
					onStateChange: cb,
				}),
			{ initialProps: { cb: first } },
		)
		rerender({ cb: second })
		act(() => {
			result.current.table.creating.start()
		})
		expect(first).not.toHaveBeenCalled()
		expect(second).toHaveBeenCalled()
	})

	it('leaves uncontrolled state portions internally managed', () => {
		const { result } = renderHook(() =>
			useDataGrid({
				data: USERS,
				columns: COLUMNS,
				sorting: true,
				pagination: true,
				state: { sorting: [{ id: 'name', desc: true }] },
			}),
		)
		// Pagination not controlled — internal default page index is 0
		expect(result.current.table.getState().pagination.pageIndex).toBe(0)
		// Sorting is controlled
		expect(result.current.table.getState().sorting).toEqual([{ id: 'name', desc: true }])
	})
})

// ── globalFiltering normalization ─────────────────────────────────────────────

function getNormalizedGlobalFiltering(table: object): NormalizedGlobalFilteringConfig | undefined {
	return (table as Record<symbol, unknown>)[GLOBAL_FILTERING_KEY] as NormalizedGlobalFilteringConfig | undefined
}

describe('useDataGrid — globalFiltering normalization', () => {
	it('globalFiltering omitted — nothing stored on instance', () => {
		const { result } = renderHook(() => useDataGrid({ data: USERS, columns: COLUMNS }))
		expect(getNormalizedGlobalFiltering(result.current.table)).toBeUndefined()
	})

	it('globalFiltering: true → defaults (placeholder, debounce: 250, toolbar: true)', () => {
		const { result } = renderHook(() => useDataGrid({ data: USERS, columns: COLUMNS, globalFiltering: true }))
		const cfg = getNormalizedGlobalFiltering(result.current.table)
		expect(cfg).toEqual({ placeholder: 'Search…', debounce: 250, toolbar: true })
	})

	it('globalFiltering: { placeholder, debounce, toolbar: false } — overrides merge into defaults', () => {
		const { result } = renderHook(() =>
			useDataGrid({
				data: USERS,
				columns: COLUMNS,
				globalFiltering: { placeholder: 'Find users', debounce: 0, toolbar: false },
			}),
		)
		const cfg = getNormalizedGlobalFiltering(result.current.table)
		expect(cfg).toEqual({ placeholder: 'Find users', debounce: 0, toolbar: false })
	})

	it('globalFiltering enables getFilteredRowModel even without column filtering', () => {
		const { result } = renderHook(() => useDataGrid({ data: USERS, columns: COLUMNS, globalFiltering: true }))
		expect(result.current.table.options.getFilteredRowModel).toBeDefined()
		expect(result.current.table.options.enableColumnFilters).toBe(false)
	})

	it('setGlobalFilter actually filters rows', () => {
		const { result } = renderHook(() => useDataGrid({ data: USERS, columns: COLUMNS, globalFiltering: true }))
		act(() => {
			result.current.table.setGlobalFilter('alice')
		})
		expect(result.current.table.getFilteredRowModel().rows).toHaveLength(1)
		expect(result.current.table.getFilteredRowModel().rows[0]?.getValue('name')).toBe('Alice')
	})

	// The React layer splits this config into a UI half and a core half. Every
	// non-UI field has to survive that split — dropping `onChange` silently
	// disables server-side search, which no type error would have caught.
	it('reports the new value through globalFiltering.onChange', () => {
		const onChange = vi.fn()
		const { result } = renderHook(() => useDataGrid({ data: USERS, columns: COLUMNS, globalFiltering: { onChange } }))
		act(() => {
			result.current.table.setGlobalFilter('alice')
		})
		expect(onChange).toHaveBeenCalledWith('alice')
	})

	it('reports through onChange even when UI-only fields are also set', () => {
		const onChange = vi.fn()
		const { result } = renderHook(() =>
			useDataGrid({
				data: USERS,
				columns: COLUMNS,
				globalFiltering: { placeholder: 'Find users', debounce: 0, toolbar: false, onChange },
			}),
		)
		act(() => {
			result.current.table.setGlobalFilter('bob')
		})
		expect(onChange).toHaveBeenCalledWith('bob')
	})

	it('keeps a custom `fn` working alongside `onChange`', () => {
		const onChange = vi.fn()
		const { result } = renderHook(() =>
			useDataGrid({
				data: USERS,
				columns: COLUMNS,
				globalFiltering: { fn: (row, _columnId, value) => row.getValue<string>('name') === value, onChange },
			}),
		)
		act(() => {
			result.current.table.setGlobalFilter('Alice')
		})
		expect(onChange).toHaveBeenCalledWith('Alice')
		expect(result.current.table.getFilteredRowModel().rows).toHaveLength(1)
	})
})

// ── filtering.chips normalization ─────────────────────────────────────────────

function getChipsConfig(table: object): NormalizedFilterChipsConfig | undefined {
	return (table as Record<symbol, unknown>)[FILTER_CHIPS_KEY] as NormalizedFilterChipsConfig | undefined
}

describe('useDataGrid — filtering.chips normalization', () => {
	it('omitted → FILTER_CHIPS_KEY is undefined', () => {
		const { result } = renderHook(() => useDataGrid({ data: USERS, columns: COLUMNS, filtering: true }))
		expect(getChipsConfig(result.current.table)).toBeUndefined()
	})

	it('chips: true → defaults to position "above"', () => {
		const { result } = renderHook(() => useDataGrid({ data: USERS, columns: COLUMNS, filtering: { chips: true } }))
		expect(getChipsConfig(result.current.table)).toEqual({ position: 'above' })
	})

	it('chips: { position: "below" } → preserved', () => {
		const { result } = renderHook(() =>
			useDataGrid({ data: USERS, columns: COLUMNS, filtering: { chips: { position: 'below' } } }),
		)
		expect(getChipsConfig(result.current.table)).toEqual({ position: 'below' })
	})

	it('chips: false → FILTER_CHIPS_KEY is undefined', () => {
		const { result } = renderHook(() => useDataGrid({ data: USERS, columns: COLUMNS, filtering: { chips: false } }))
		expect(getChipsConfig(result.current.table)).toBeUndefined()
	})
})

// ── filtering.clearButton normalization ───────────────────────────────────────

function getClearButtonConfig(table: object): NormalizedClearButtonConfig | undefined {
	return (table as Record<symbol, unknown>)[FILTER_CLEAR_BUTTON_KEY] as NormalizedClearButtonConfig | undefined
}

describe('useDataGrid — filtering.clearButton normalization', () => {
	it('omitted → FILTER_CLEAR_BUTTON_KEY is undefined', () => {
		const { result } = renderHook(() => useDataGrid({ data: USERS, columns: COLUMNS, filtering: true }))
		expect(getClearButtonConfig(result.current.table)).toBeUndefined()
	})

	it('clearButton: true → alwaysShow defaults to false', () => {
		const { result } = renderHook(() =>
			useDataGrid({ data: USERS, columns: COLUMNS, filtering: { clearButton: true } }),
		)
		expect(getClearButtonConfig(result.current.table)).toEqual({ alwaysShow: false })
	})

	it('clearButton: { alwaysShow: true } → preserved', () => {
		const { result } = renderHook(() =>
			useDataGrid({ data: USERS, columns: COLUMNS, filtering: { clearButton: { alwaysShow: true } } }),
		)
		expect(getClearButtonConfig(result.current.table)).toEqual({ alwaysShow: true })
	})

	it('clearButton: false → FILTER_CLEAR_BUTTON_KEY is undefined', () => {
		const { result } = renderHook(() =>
			useDataGrid({ data: USERS, columns: COLUMNS, filtering: { clearButton: false } }),
		)
		expect(getClearButtonConfig(result.current.table)).toBeUndefined()
	})
})
