import { OperatorInput, createColumns } from '@ez-kit/data-grid-core'
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DataGridOptionsProvider, mergeGridOptionLayers, useDataGridOptions } from './data-grid-options-context'
import { TEST_FEATURES, TEST_OPERATORS } from './test-utils'
import { useDataGrid } from './use-data-grid'

import type { DataGridDefaultOptions } from './data-grid-options-context'
import type { GridFeatures } from './types'
import type { UseDataGridConfig } from './use-data-grid'
import type { FilterOperatorDef } from '@ez-kit/data-grid-core'
import type { ReactNode } from 'react'

type User = { id: number; name: string }

const USERS: User[] = [
	{ id: 1, name: 'Alice' },
	{ id: 2, name: 'Bob' },
]
const COLUMNS = createColumns<User>([{ accessorKey: 'name' }])

describe('mergeGridOptionLayers', () => {
	const config: UseDataGridConfig<GridFeatures, User> = {
		features: TEST_FEATURES,
		operators: TEST_OPERATORS,
		data: USERS,
		columns: COLUMNS,
	}

	it('applies provider defaults when table omits them', () => {
		const merged = mergeGridOptionLayers<GridFeatures, User>(undefined, { sorting: true }, config)
		expect(merged.sorting).toBe(true)
	})

	it('lets table config override provider defaults', () => {
		const merged = mergeGridOptionLayers<GridFeatures, User>(
			undefined,
			{ sorting: true },
			{ ...config, sorting: false },
		)
		expect(merged.sorting).toBe(false)
	})

	it('deep-merges nested feature settings across layers', () => {
		const merged = mergeGridOptionLayers<GridFeatures, User>(
			undefined,
			{ pagination: { pageSize: 50 } },
			{
				...config,
				pagination: { manual: true },
			},
		)
		expect(merged.pagination).toEqual({ pageSize: 50, manual: true })
	})

	it('orders precedence factory < provider < table', () => {
		const factory: DataGridDefaultOptions<GridFeatures, User> = { sorting: false, filtering: true, visibility: true }
		const provider: DataGridDefaultOptions<GridFeatures, User> = { sorting: true, filtering: false }
		const merged = mergeGridOptionLayers<GridFeatures, User>(factory, provider, { ...config, sorting: false })
		expect(merged.sorting).toBe(false) // table wins
		expect(merged.filtering).toBe(false) // provider beats factory
		expect(merged.visibility).toBe(true) // factory-only survives
	})

	it('leaves table config untouched when no defaults exist', () => {
		const merged = mergeGridOptionLayers<GridFeatures, User>(undefined, {}, config)
		expect(merged).toEqual(config)
	})
})

describe('DataGridOptionsProvider', () => {
	const makeWrapper = (defaults: DataGridDefaultOptions<GridFeatures, User>) =>
		function OptionsWrapper({ children }: { children: ReactNode }) {
			return <DataGridOptionsProvider defaults={defaults}>{children}</DataGridOptionsProvider>
		}

	it('exposes merged defaults via useDataGridOptions', () => {
		const { result } = renderHook(() => useDataGridOptions<GridFeatures, User>(), {
			wrapper: makeWrapper({ sorting: true }),
		})
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
		const { result } = renderHook(() => useDataGridOptions<GridFeatures, User>(), { wrapper: NestedProviders })
		expect(result.current.pagination).toEqual({ pageSize: 50, manual: true })
	})

	it('feeds provider defaults into a descendant useDataGrid', () => {
		const { result } = renderHook(
			() =>
				useDataGrid<GridFeatures, User>({
					features: TEST_FEATURES,
					operators: TEST_OPERATORS,
					data: USERS,
					columns: COLUMNS,
				}),
			{
				wrapper: makeWrapper({ sorting: true, visibility: true }),
			},
		)
		// Both arrive resolved, not as the raw `boolean | Config` the provider was handed.
		expect(result.current.grid.sorting).toBe(true)
		expect(result.current.grid.visibility).toBe(true)
	})

	it('lets an table override provider defaults inside useDataGrid', () => {
		const { result } = renderHook(
			() =>
				useDataGrid<GridFeatures, User>({
					features: TEST_FEATURES,
					operators: TEST_OPERATORS,
					data: USERS,
					columns: COLUMNS,
					selection: { bar: false },
				}),
			{ wrapper: makeWrapper({ selection: { bar: true } }) },
		)
		expect(result.current.grid.selection.bar).toBeUndefined()
	})
})

describe('useDataGrid without a provider', () => {
	it('behaves identically to bare config (no defaults injected)', () => {
		const { result } = renderHook(() =>
			useDataGrid<GridFeatures, User>({
				features: TEST_FEATURES,
				operators: TEST_OPERATORS,
				data: USERS,
				columns: COLUMNS,
			}),
		)
		expect(result.current.grid.sorting).toBe(false)
		expect(result.current.getRowModel().rows).toHaveLength(2)
	})

	it('applies factory defaults passed as the base layer', () => {
		const { result } = renderHook(() =>
			useDataGrid<GridFeatures, User>(
				{ features: TEST_FEATURES, operators: TEST_OPERATORS, data: USERS, columns: COLUMNS },
				{ sorting: true },
			),
		)
		expect(result.current.grid.sorting).toBe(true)
	})
})

describe('write features are enabled by their callback', () => {
	const makeWrapper = (defaults: DataGridDefaultOptions<GridFeatures, User>) =>
		function OptionsWrapper({ children }: { children: ReactNode }) {
			return <DataGridOptionsProvider defaults={defaults}>{children}</DataGridOptionsProvider>
		}

	it('merges a provider-supplied creating.mode with the table onSave', () => {
		const onSave = vi.fn()
		const { result } = renderHook(
			() =>
				useDataGrid<GridFeatures, User>({
					features: TEST_FEATURES,
					operators: TEST_OPERATORS,
					data: USERS,
					columns: COLUMNS,
					creating: { onSave },
				}),
			{
				wrapper: makeWrapper({ creating: { mode: 'modal' } }),
			},
		)
		expect(result.current.options.creating).toEqual({ mode: 'modal', onSave })
	})

	it('leaves creating off for a grid that supplies no onSave', () => {
		const { result } = renderHook(
			() =>
				useDataGrid<GridFeatures, User>({
					features: TEST_FEATURES,
					operators: TEST_OPERATORS,
					data: USERS,
					columns: COLUMNS,
				}),
			{
				wrapper: makeWrapper({ creating: { mode: 'modal' } }),
			},
		)
		expect(result.current.options.creating).toBeUndefined()
	})

	it('merges a provider-supplied editing.mode with the table onSave', () => {
		const onSave = vi.fn()
		const { result } = renderHook(
			() =>
				useDataGrid<GridFeatures, User>({
					features: TEST_FEATURES,
					operators: TEST_OPERATORS,
					data: USERS,
					columns: COLUMNS,
					editing: { onSave },
				}),
			{
				wrapper: makeWrapper({ editing: { mode: 'modal' } }),
			},
		)
		expect(result.current.options.editing).toEqual({ mode: 'modal', onSave })
	})

	it('leaves editing off for a grid that supplies no onSave', () => {
		const { result } = renderHook(
			() =>
				useDataGrid<GridFeatures, User>({
					features: TEST_FEATURES,
					operators: TEST_OPERATORS,
					data: USERS,
					columns: COLUMNS,
				}),
			{
				wrapper: makeWrapper({ editing: { mode: 'modal' } }),
			},
		)
		expect(result.current.options.editing).toBeUndefined()
	})

	it('merges a provider-supplied deleting.confirmation with the table onDelete', () => {
		const onDelete = vi.fn()
		const { result } = renderHook(
			() =>
				useDataGrid<GridFeatures, User>({
					features: TEST_FEATURES,
					operators: TEST_OPERATORS,
					data: USERS,
					columns: COLUMNS,
					deleting: { onDelete },
				}),
			{
				wrapper: makeWrapper({ deleting: { confirmation: { title: 'Delete?' } } }),
			},
		)
		expect(result.current.options.deleting).toEqual({ confirmation: { title: 'Delete?' }, onDelete })
	})

	it('leaves deleting off for a grid that supplies no onDelete', () => {
		const { result } = renderHook(
			() =>
				useDataGrid<GridFeatures, User>({
					features: TEST_FEATURES,
					operators: TEST_OPERATORS,
					data: USERS,
					columns: COLUMNS,
				}),
			{
				wrapper: makeWrapper({ deleting: { confirmation: true } }),
			},
		)
		expect(result.current.options.deleting).toBeUndefined()
	})

	it('keeps an table-only write config untouched', () => {
		const onDelete = vi.fn()
		const { result } = renderHook(() =>
			useDataGrid<GridFeatures, User>({
				features: TEST_FEATURES,
				operators: TEST_OPERATORS,
				data: USERS,
				columns: COLUMNS,
				deleting: { onDelete },
			}),
		)
		expect(result.current.options.deleting).toEqual({ onDelete })
	})

	it('drops the feature again when the grid stops supplying its callback', () => {
		const onSave = vi.fn()
		const { result, rerender } = renderHook(
			({ withHandler }: { withHandler: boolean }) =>
				useDataGrid<GridFeatures, User>({
					features: TEST_FEATURES,
					operators: TEST_OPERATORS,
					data: USERS,
					columns: COLUMNS,
					...(withHandler ? { creating: { onSave } } : {}),
				}),
			{ wrapper: makeWrapper({ creating: { mode: 'modal' } }), initialProps: { withHandler: true } },
		)
		expect(result.current.options.creating).toEqual({ mode: 'modal', onSave })

		rerender({ withHandler: false })
		expect(result.current.options.creating).toBeUndefined()
	})
})

describe('operators across the option layers', () => {
	type Row = { id: number; name: string; amount: number; createdAt: string }

	const onDay: FilterOperatorDef = { id: 'onDay', label: 'On day', input: OperatorInput.Single, filterFn: () => true }
	const appContains: FilterOperatorDef = {
		id: 'contains',
		label: 'App contains',
		input: OperatorInput.Single,
		filterFn: () => true,
	}
	const mineContains: FilterOperatorDef = {
		id: 'contains',
		label: 'My contains',
		input: OperatorInput.Single,
		filterFn: () => true,
	}

	// No `operators` of its own: the set comes from the bundle, the factory layer below.
	const config: UseDataGridConfig<GridFeatures, Row> = {
		features: TEST_FEATURES,
		data: [{ id: 1, name: 'Ann', amount: 1, createdAt: '2026-01-01' }],
		columns: createColumns<Row>([
			{ accessorKey: 'name', filtering: { operators: true } },
			{ accessorKey: 'amount', cell: 'number', filtering: { operators: true } },
			{ accessorKey: 'createdAt', cell: 'date', filtering: { operators: true } },
		]),
		filtering: true,
	}

	function idsOf(table: { getColumn: (id: string) => unknown }, columnId: string): string[] | undefined {
		const column = table.getColumn(columnId) as
			| { columnDef: { meta?: { filtering?: false | { operators?: FilterOperatorDef[] } } } }
			| undefined
		const filtering = column?.columnDef.meta?.filtering
		return filtering === false ? undefined : filtering?.operators?.map((op) => op.id)
	}

	function labelsOf(table: { getColumn: (id: string) => unknown }, columnId: string): string[] | undefined {
		const column = table.getColumn(columnId) as
			| { columnDef: { meta?: { filtering?: false | { operators?: FilterOperatorDef[] } } } }
			| undefined
		const filtering = column?.columnDef.meta?.filtering
		return filtering === false ? undefined : filtering?.operators?.map((op) => op.label)
	}

	it('replaces the set of each cell type a provider names, and keeps the bundle’s others', () => {
		const { result } = renderHook(() => useDataGrid<GridFeatures, Row>(config, { operators: TEST_OPERATORS }), {
			wrapper: ({ children }: { children: ReactNode }) => (
				<DataGridOptionsProvider defaults={{ operators: { byType: { date: [onDay] } } }}>
					{children}
				</DataGridOptionsProvider>
			),
		})

		expect(idsOf(result.current, 'createdAt')).toEqual(['onDay'])
		expect(idsOf(result.current, 'name')).toEqual(TEST_OPERATORS.byType.text.map((op) => op.id))
		expect(idsOf(result.current, 'amount')).toEqual(TEST_OPERATORS.byType.number.map((op) => op.id))
	})

	it('lets the instance beat the provider', () => {
		const { result } = renderHook(
			() => useDataGrid<GridFeatures, Row>({ ...config, operators: { byType: { text: [mineContains] } } }),
			{
				wrapper: ({ children }: { children: ReactNode }) => (
					<DataGridOptionsProvider defaults={{ operators: { byType: { text: [appContains] } } }}>
						{children}
					</DataGridOptionsProvider>
				),
			},
		)

		expect(labelsOf(result.current, 'name')).toEqual(['My contains'])
	})

	it('switches nothing on', () => {
		const { result } = renderHook(() =>
			useDataGrid<GridFeatures, User>({
				features: TEST_FEATURES,
				operators: TEST_OPERATORS,
				data: USERS,
				columns: COLUMNS,
			}),
		)

		expect(result.current.getColumn('name')?.getCanFilter()).toBe(false)
		expect(result.current.getColumn('name')?.columnDef.meta?.filtering).toBeUndefined()
	})
})
