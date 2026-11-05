import { createColumns } from '@ez-kit/data-grid-core'
import { defaultOperators } from '@ez-kit/data-grid-core/operators'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { TEST_FEATURES } from './test-utils'
import { useDataGrid } from './use-data-grid'

import type { UseDataGridConfig } from './use-data-grid'

type User = { id: number; name: string }
type Options = Omit<UseDataGridConfig<typeof TEST_FEATURES, User>, 'features' | 'columns' | 'data'>
const DATA: User[] = [{ id: 1, name: 'Alice' }]
const COLUMNS = createColumns<User>([{ accessorKey: 'name', cell: 'text' }])

describe('column structure across renders', () => {
	it('keeps definitions and TanStack columns while data, state and callbacks change', () => {
		const initialProps: { data: User[]; options: Options } = { data: DATA, options: { selection: true, sorting: true } }
		const { result, rerender } = renderHook(
			({ data, options }: { data: User[]; options: Options }) =>
				useDataGrid({ features: TEST_FEATURES, columns: COLUMNS, data, ...options }),
			{ initialProps },
		)
		const definitions = result.current.options.columns
		const columns = result.current.getAllColumns()
		const columnState = result.current.grid.columnState
		rerender({
			data: [{ id: 2, name: 'Bob' }],
			options: { selection: true, sorting: { onChange: vi.fn() }, state: { sorting: [] } },
		})
		expect(result.current.options.columns).toBe(definitions)
		expect(result.current.getAllColumns()).toBe(columns)
		expect(result.current.grid.columnState).toBe(columnState)
		expect(result.current.getRowModel().rows[0]?.original.name).toBe('Bob')
	})

	const mappingChanges: [string, Options, Options][] = [
		['filtering', { filtering: false }, { filtering: true }],
		['facets', { filtering: true }, { filtering: { faceted: true } }],
		[
			'operator switch',
			{ operators: defaultOperators, filtering: true },
			{ operators: defaultOperators, filtering: { operators: true } },
		],
		[
			'operator registry',
			{ operators: defaultOperators, filtering: { operators: true } },
			{
				operators: { byType: { text: defaultOperators.byType.text.slice(0, 1) } },
				filtering: { operators: true },
			},
		],
		['flashing', { flashing: true }, { flashing: { flashDuration: 250 } }],
	]
	it.each(mappingChanges)('refreshes column metadata when %s changes', (_name, before, after) => {
		const { result, rerender } = renderHook(
			(options: Options) => useDataGrid({ features: TEST_FEATURES, data: DATA, columns: COLUMNS, ...options }),
			{ initialProps: before },
		)
		const first = result.current.getColumn('name')
		rerender(after)
		const second = result.current.getColumn('name')
		if (!first || !second) throw new Error('missing name column')
		expect(second).not.toBe(first)
		expect([second.columnDef.meta, second.columnDef.filterFn]).not.toEqual([
			first.columnDef.meta,
			first.columnDef.filterFn,
		])
		rerender(after)
		expect(result.current.getColumn('name')).toBe(second)
	})

	const systemChanges: [string, Options, string][] = [
		['selection', { selection: true }, '__selection__'],
		['expanding', { expanding: true }, '__expand__'],
		['grouping', { grouping: true }, '__group__'],
		['editing', { editing: { onSave: () => {} } }, '__actions__'],
		['deleting', { deleting: { onDelete: () => {} } }, '__actions__'],
		['creating', { creating: { mode: 'pin-row', onSave: () => {} } }, '__actions__'],
		['row pinning', { pinning: { row: true } }, '__actions__'],
		['row ordering', { ordering: { row: true } }, '__actions__'],
		['custom actions', { rowActions: { actions: () => [] } }, '__actions__'],
	]
	it.each(systemChanges)('adds and removes the system column for %s', (_name, options, id) => {
		const { result, rerender } = renderHook(
			(settings: Options) => useDataGrid({ features: TEST_FEATURES, data: DATA, columns: COLUMNS, ...settings }),
			{ initialProps: {} },
		)
		expect(result.current.getAllColumns().some((col) => col.id === id)).toBe(false)
		rerender(options)
		expect(result.current.getAllColumns().some((col) => col.id === id)).toBe(true)
		const columns = result.current.getAllColumns()
		rerender(options)
		expect(result.current.getAllColumns()).toBe(columns)
		rerender({})
		expect(result.current.getAllColumns().some((col) => col.id === id)).toBe(false)
	})

	it('updates widths when user or system column definitions change', () => {
		const initialProps: { columns: typeof COLUMNS; options: Options } = {
			columns: COLUMNS,
			options: { selection: true },
		}
		const { result, rerender } = renderHook(
			({ columns, options }: { columns: typeof COLUMNS; options: Options }) =>
				useDataGrid({ features: TEST_FEATURES, data: DATA, columns, ...options }),
			{ initialProps },
		)
		const options: Options = { selection: { column: { width: 70 } } }
		rerender({ columns: COLUMNS, options })
		expect(result.current.getColumn('__selection__')?.getSize()).toBe(70)
		rerender({
			columns: createColumns<User>([{ accessorKey: 'name', width: 250 }]),
			options,
		})
		expect(result.current.getColumn('name')?.getSize()).toBe(250)
		expect(result.current.getColumn('__selection__')?.getSize()).toBe(70)
	})

	it('keeps independent caches for grids sharing the same authored columns', () => {
		const first = renderHook(() =>
			useDataGrid({ features: TEST_FEATURES, data: DATA, columns: COLUMNS, filtering: true, selection: true }),
		)
		const second = renderHook(() =>
			useDataGrid({ features: TEST_FEATURES, data: DATA, columns: COLUMNS, filtering: false, expanding: true }),
		)
		const firstColumns = first.result.current.getAllColumns()
		const secondColumns = second.result.current.getAllColumns()
		first.rerender()
		second.rerender()
		first.rerender()
		expect(first.result.current.getAllColumns()).toBe(firstColumns)
		expect(second.result.current.getAllColumns()).toBe(secondColumns)
	})

	it('keeps write callbacks live without rebuilding the actions column', async () => {
		const first = vi.fn()
		const second = vi.fn()
		const { result, rerender } = renderHook(
			({ onSave }: { onSave: () => void }) =>
				useDataGrid({ features: TEST_FEATURES, data: DATA, columns: COLUMNS, editing: { onSave } }),
			{ initialProps: { onSave: first } },
		)
		const definitions = result.current.options.columns
		rerender({ onSave: second })
		expect(result.current.options.columns).toBe(definitions)
		await act(async () => {
			result.current.editing.start('1')
			await result.current.editing.commit()
		})
		expect(first).not.toHaveBeenCalled()
		expect(second).toHaveBeenCalledTimes(1)
	})
})
