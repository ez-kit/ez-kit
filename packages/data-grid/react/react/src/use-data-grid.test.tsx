import { defineColumns } from '@ez-kit/data-grid-core'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import {
	FILTERING_VARIANT_KEY,
	FILTER_CHIPS_KEY,
	FILTER_CLEAR_BUTTON_KEY,
	GLOBAL_FILTERING_KEY,
	SELECTION_BAR_KEY,
	VIRTUALIZED_KEY,
	useDataGrid,
} from './use-data-grid'

import type {
	NormalizedClearButtonConfig,
	NormalizedFilterChipsConfig,
	NormalizedGlobalFilteringConfig,
} from './use-data-grid'

type User = {
	id: number
	name: string
}

const USERS: User[] = [
	{ id: 1, name: 'Alice' },
	{ id: 2, name: 'Bob' },
]
const COLUMNS = defineColumns<User>([{ accessorKey: 'name' }])

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
			useDataGrid({ data: USERS, columns: COLUMNS, initialState: { loading: { isLoading: true } } }),
		)
		expect(result.current.table.getIsLoading()).toBe(true)
	})

	it('propagates state.loading into the external snapshot so subscribers see it', () => {
		const { result, rerender } = renderHook(
			({ isLoading }: { isLoading: boolean }) =>
				useDataGrid({
					data: USERS,
					columns: COLUMNS,
					state: { loading: { isLoading } },
				}),
			{ initialProps: { isLoading: false } },
		)
		// Baseline: snapshot reflects initial state
		expect(result.current.table.getSnapshot().loading.isLoading).toBe(false)
		expect(result.current.table.getIsLoading()).toBe(false)

		// Flip via the controlled `state` prop — both options.state AND the external
		// store must update so useSyncExternalStore subscribers (e.g. Body) re-read.
		rerender({ isLoading: true })
		expect(result.current.table.getSnapshot().loading.isLoading).toBe(true)
		expect(result.current.table.getIsLoading()).toBe(true)
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
			({ isLoading }: { isLoading: boolean }) =>
				useDataGrid({
					data: USERS,
					columns: COLUMNS,
					state: { loading: { isLoading } },
					onStateChange,
				}),
			{ initialProps: { isLoading: false } },
		)
		onStateChange.mockClear()
		rerender({ isLoading: true })
		// Prop-driven sync goes through syncControlledState, which intentionally skips
		// onStateChange — otherwise consumers that mirror the callback back into React
		// state would loop indefinitely.
		expect(onStateChange).not.toHaveBeenCalled()
	})

	it('skips the snapshot push when supplied slices are referentially equal', () => {
		const stableLoading = { isLoading: false }
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

describe('useDataGrid — selectionBar', () => {
	it('SELECTION_BAR_KEY is undefined when selectionBar not set', () => {
		const { result } = renderHook(() => useDataGrid({ data: USERS, columns: COLUMNS }))
		const key = (result.current.table as unknown as Record<symbol, unknown>)[SELECTION_BAR_KEY]
		expect(key).toBeUndefined()
	})

	it('SELECTION_BAR_KEY stores true when selectionBar: true', () => {
		const { result } = renderHook(() => useDataGrid({ data: USERS, columns: COLUMNS, selectionBar: true }))
		const key = (result.current.table as unknown as Record<symbol, unknown>)[SELECTION_BAR_KEY]
		expect(key).toBe(true)
	})

	it('SELECTION_BAR_KEY stores false when selectionBar: false', () => {
		const { result } = renderHook(() => useDataGrid({ data: USERS, columns: COLUMNS, selectionBar: false }))
		const key = (result.current.table as unknown as Record<symbol, unknown>)[SELECTION_BAR_KEY]
		expect(key).toBe(false)
	})

	it('SELECTION_BAR_KEY stores config object when selectionBar: { onDelete }', () => {
		const onDelete = vi.fn()
		const { result } = renderHook(() => useDataGrid({ data: USERS, columns: COLUMNS, selectionBar: { onDelete } }))
		const key = (result.current.table as unknown as Record<symbol, unknown>)[SELECTION_BAR_KEY]
		expect(key).toEqual({ onDelete })
	})

	it('SELECTION_BAR_KEY stores variant: "inline" when configured', () => {
		const { result } = renderHook(() =>
			useDataGrid({ data: USERS, columns: COLUMNS, selectionBar: { variant: 'inline' } }),
		)
		const key = (result.current.table as unknown as Record<symbol, unknown>)[SELECTION_BAR_KEY]
		expect(key).toEqual({ variant: 'inline' })
	})

	it('FILTERING_VARIANT_KEY accepts "panel" and writes it through to the table', () => {
		const { result } = renderHook(() =>
			useDataGrid({ data: USERS, columns: COLUMNS, filtering: { variant: 'panel' } }),
		)
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
				useDataGrid({ data: USERS, columns: COLUMNS, creating: { onSave: () => Promise.resolve() }, onStateChange: cb }),
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
		const { result } = renderHook(() =>
			useDataGrid({ data: USERS, columns: COLUMNS, filtering: { chips: true } }),
		)
		expect(getChipsConfig(result.current.table)).toEqual({ position: 'above' })
	})

	it('chips: { position: "below" } → preserved', () => {
		const { result } = renderHook(() =>
			useDataGrid({ data: USERS, columns: COLUMNS, filtering: { chips: { position: 'below' } } }),
		)
		expect(getChipsConfig(result.current.table)).toEqual({ position: 'below' })
	})

	it('chips: false → FILTER_CHIPS_KEY is undefined', () => {
		const { result } = renderHook(() =>
			useDataGrid({ data: USERS, columns: COLUMNS, filtering: { chips: false } }),
		)
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
