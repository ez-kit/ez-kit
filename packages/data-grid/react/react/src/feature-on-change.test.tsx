import { createColumns } from '@ez-kit/data-grid-core'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useDataGrid } from './use-data-grid'

import type { DataTable } from '@ez-kit/data-grid-core'

type User = { id: number; name: string; email: string }

const USERS: User[] = [{ id: 1, name: 'Alice', email: 'alice@example.com' }]
const COLUMNS = createColumns<User>([{ accessorKey: 'name' }, { accessorKey: 'email' }])

/**
 * Every feature's `onChange` has to survive the trip through `useDataGrid`.
 *
 * The React layer rebuilds each feature's config before handing it to `createTable`, splitting
 * off the fields core has no use for. Two of those splits were **allowlists** — they picked the
 * core fields by name — so `visibility.onChange` and `expanding.onChange` were dropped on the
 * floor: typed, documented, re-exported on the `React*` config, and never called. Nothing
 * failed; the callback simply never ran.
 *
 * Every split is a strip now (take the config, remove the React-only keys, pass the rest), and
 * this file is the guard: a feature added to the config with an `onChange` gets a case here, and
 * a future split that goes back to picking by name fails immediately instead of silently.
 */
describe('every feature onChange survives useDataGrid', () => {
	function grid(config: Partial<Parameters<typeof useDataGrid<User>>[0]>): DataTable<User> {
		const { result } = renderHook(() => useDataGrid<User>({ data: USERS, columns: COLUMNS, ...config }))
		return result.current
	}

	it('visibility.onChange fires when a column is hidden', () => {
		const onChange = vi.fn()
		const table = grid({ visibility: { onChange } })
		act(() => {
			table.setColumnVisibility({ email: false })
		})
		expect(onChange).toHaveBeenCalledWith({ email: false })
	})

	it('visibility.onChange survives alongside the React-only toolbar flag', () => {
		const onChange = vi.fn()
		const table = grid({ visibility: { toolbar: true, onChange } })
		act(() => {
			table.setColumnVisibility({ email: false })
		})
		expect(onChange).toHaveBeenCalled()
		expect(table.grid.visibility).toEqual({ toolbar: true })
	})

	it('mounts the visibility toolbar control for the object form too, as the bare `true` does', () => {
		// The object form used to default `toolbar` off, so adding an `onChange` to a working
		// `visibility: true` silently removed the only control the feature has.
		expect(grid({ visibility: { onChange: vi.fn() } }).grid.visibility).toEqual({ toolbar: true })
		expect(grid({ visibility: true }).grid.visibility).toEqual({ toolbar: true })
		expect(grid({ visibility: { toolbar: false } }).grid.visibility).toEqual({ toolbar: false })
	})

	it('expanding.onChange fires when a row is expanded', () => {
		const onChange = vi.fn()
		const table = grid({ expanding: { onChange } })
		act(() => {
			table.setExpanded({ '0': true })
		})
		expect(onChange).toHaveBeenCalledWith({ '0': true })
	})

	it('sorting.onChange fires', () => {
		const onChange = vi.fn()
		const table = grid({ sorting: { onChange } })
		act(() => {
			table.setSorting([{ id: 'name', desc: false }])
		})
		expect(onChange).toHaveBeenCalled()
	})

	it('filtering.onChange fires', () => {
		const onChange = vi.fn()
		const table = grid({ filtering: { onChange } })
		act(() => {
			table.setColumnFilters([{ id: 'name', value: 'al' }])
		})
		expect(onChange).toHaveBeenCalled()
	})

	it('globalFiltering.onChange fires', () => {
		const onChange = vi.fn()
		const table = grid({ globalFiltering: { onChange } })
		act(() => {
			table.setGlobalFilter('al')
		})
		expect(onChange).toHaveBeenCalled()
	})

	it('selection.onChange fires', () => {
		const onChange = vi.fn()
		const table = grid({ selection: { onChange } })
		act(() => {
			table.setRowSelection({ '0': true })
		})
		expect(onChange).toHaveBeenCalled()
	})

	it('pagination.onChange fires', () => {
		const onChange = vi.fn()
		const table = grid({ pagination: { onChange } })
		act(() => {
			table.setPageSize(5)
		})
		expect(onChange).toHaveBeenCalled()
	})

	it('resizing.onChange fires', () => {
		const onChange = vi.fn()
		const table = grid({ resizing: { onChange } })
		act(() => {
			table.setColumnSizing({ name: 300 })
		})
		expect(onChange).toHaveBeenCalled()
	})

	it('pinning.column.onChange fires', () => {
		const onChange = vi.fn()
		const table = grid({ pinning: { column: { onChange } } })
		act(() => {
			table.setColumnPinning({ left: ['name'], right: [] })
		})
		expect(onChange).toHaveBeenCalled()
	})

	it('pinning.row.onChange fires', () => {
		const onChange = vi.fn()
		const table = grid({ pinning: { row: { onChange } } })
		act(() => {
			table.setRowPinning({ top: ['0'], bottom: [] })
		})
		expect(onChange).toHaveBeenCalled()
	})
})
