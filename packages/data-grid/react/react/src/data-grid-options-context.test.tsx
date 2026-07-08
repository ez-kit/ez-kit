import { defineColumns } from '@ez-kit/data-grid-core'
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DataGridOptionsProvider, mergeGridOptionLayers, useDataGridOptions } from './data-grid-options-context'
import { COLUMN_VISIBILITY_KEY, SELECTION_BAR_KEY, SORTING_KEY, useDataGrid } from './use-data-grid'

import type { DataGridDefaultOptions } from './data-grid-options-context'
import type { UseDataGridConfig } from './use-data-grid'
import type { ReactNode } from 'react'

type User = { id: number; name: string }

const USERS: User[] = [
	{ id: 1, name: 'Alice' },
	{ id: 2, name: 'Bob' },
]
const COLUMNS = defineColumns<User>([{ accessorKey: 'name' }])

const symbols = (table: unknown) => table as Record<symbol, unknown>

describe('mergeGridOptionLayers', () => {
	const config: UseDataGridConfig<User> = { data: USERS, columns: COLUMNS }

	it('applies provider defaults when instance omits them', () => {
		const merged = mergeGridOptionLayers<User>(undefined, { sorting: true }, config)
		expect(merged.sorting).toBe(true)
	})

	it('lets instance config override provider defaults', () => {
		const merged = mergeGridOptionLayers<User>(undefined, { sorting: true }, { ...config, sorting: false })
		expect(merged.sorting).toBe(false)
	})

	it('deep-merges nested feature settings across layers', () => {
		const merged = mergeGridOptionLayers<User>(undefined, { pagination: { pageSize: 50 } }, {
			...config,
			pagination: { manual: true },
		})
		expect(merged.pagination).toEqual({ pageSize: 50, manual: true })
	})

	it('orders precedence factory < provider < instance', () => {
		const factory: DataGridDefaultOptions<User> = { sorting: false, filtering: true, columnVisibility: true }
		const provider: DataGridDefaultOptions<User> = { sorting: true, filtering: false }
		const merged = mergeGridOptionLayers<User>(factory, provider, { ...config, sorting: false })
		expect(merged.sorting).toBe(false) // instance wins
		expect(merged.filtering).toBe(false) // provider beats factory
		expect(merged.columnVisibility).toBe(true) // factory-only survives
	})

	it('leaves instance config untouched when no defaults exist', () => {
		const merged = mergeGridOptionLayers<User>(undefined, {}, config)
		expect(merged).toEqual(config)
	})
})

describe('DataGridOptionsProvider', () => {
	const makeWrapper = (defaults: DataGridDefaultOptions<User>) =>
		function OptionsWrapper({ children }: { children: ReactNode }) {
			return <DataGridOptionsProvider defaults={defaults}>{children}</DataGridOptionsProvider>
		}

	it('exposes merged defaults via useDataGridOptions', () => {
		const { result } = renderHook(() => useDataGridOptions<User>(), { wrapper: makeWrapper({ sorting: true }) })
		expect(result.current.sorting).toBe(true)
	})

	it('deep-merges nested provider defaults on top of a parent provider', () => {
		function NestedProviders({ children }: { children: ReactNode }) {
			return (
				<DataGridOptionsProvider defaults={{ pagination: { pageSize: 50 } }}>
					<DataGridOptionsProvider defaults={{ pagination: { manual: true } }}>{children}</DataGridOptionsProvider>
				</DataGridOptionsProvider>
			)
		}
		const { result } = renderHook(() => useDataGridOptions<User>(), { wrapper: NestedProviders })
		expect(result.current.pagination).toEqual({ pageSize: 50, manual: true })
	})

	it('feeds provider defaults into a descendant useDataGrid', () => {
		const { result } = renderHook(() => useDataGrid<User>({ data: USERS, columns: COLUMNS }), {
			wrapper: makeWrapper({ sorting: true, columnVisibility: true }),
		})
		expect(symbols(result.current.table)[SORTING_KEY]).toBe(true)
		expect(symbols(result.current.table)[COLUMN_VISIBILITY_KEY]).toBe(true)
	})

	it('lets an instance override provider defaults inside useDataGrid', () => {
		const { result } = renderHook(
			() => useDataGrid<User>({ data: USERS, columns: COLUMNS, selectionBar: false }),
			{ wrapper: makeWrapper({ selectionBar: true }) },
		)
		expect(symbols(result.current.table)[SELECTION_BAR_KEY]).toBe(false)
	})
})

describe('useDataGrid without a provider', () => {
	it('behaves identically to bare config (no defaults injected)', () => {
		const { result } = renderHook(() => useDataGrid<User>({ data: USERS, columns: COLUMNS }))
		expect(symbols(result.current.table)[SORTING_KEY]).toBeUndefined()
		expect(result.current.table.getRowModel().rows).toHaveLength(2)
	})

	it('applies factory defaults passed as the base layer', () => {
		const { result } = renderHook(() => useDataGrid<User>({ data: USERS, columns: COLUMNS }, { sorting: true }))
		expect(symbols(result.current.table)[SORTING_KEY]).toBe(true)
	})
})
