import { createColumns } from '@ez-kit/data-grid-core'
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DATA_GRID_DEFAULTS } from './defaults'
import { useDataGrid } from './use-data-grid'

type User = { id: number; name: string }

const USERS: User[] = [{ id: 1, name: 'Alice' }]
const COLUMNS = createColumns<User>([{ accessorKey: 'name', header: 'Name' }])

/**
 * `enabled: false` has to reach the React layer too, not just core: the UI config a feature
 * carries (auto-mounted controls, panels, detection tuning) is normalized here, and a
 * disabled feature that still published its normalized config would keep rendering.
 */
describe('useDataGrid — enabled: false suppresses the React-side config', () => {
	it('does not publish the global-search UI config', () => {
		const { result } = renderHook(() =>
			useDataGrid({ data: USERS, columns: COLUMNS, globalFiltering: { enabled: false, toolbar: true } }),
		)
		expect(result.current.table.grid.globalFiltering).toBeUndefined()
	})

	it('does not publish the filter-chips config', () => {
		const { result } = renderHook(() =>
			useDataGrid({ data: USERS, columns: COLUMNS, filtering: { enabled: false, chips: true } }),
		)
		expect(result.current.table.grid.filtering.chips).toBeUndefined()
	})

	it('does not publish the selection panel config', () => {
		const { result } = renderHook(() =>
			useDataGrid({ data: USERS, columns: COLUMNS, selection: { enabled: false, panel: true } }),
		)
		expect(result.current.table.grid.selection.panel).toBeUndefined()
	})

	it('does not publish the infinite-scroll config', () => {
		const { result } = renderHook(() =>
			useDataGrid({
				data: USERS,
				columns: COLUMNS,
				pagination: { enabled: false, mode: 'infinite', hasNextPage: true },
			}),
		)
		expect(result.current.table.grid.infinite).toBeUndefined()
	})

	it('does not publish the virtualization config', () => {
		const { result } = renderHook(() =>
			useDataGrid({ data: USERS, columns: COLUMNS, virtualization: { enabled: false, row: true } }),
		)
		expect(result.current.table.grid.virtualization).toBeUndefined()
	})

	it('keeps column hiding off in core and mounts no toolbar trigger', () => {
		const { result } = renderHook(() =>
			useDataGrid({ data: USERS, columns: COLUMNS, columnVisibility: { enabled: false, toolbar: true } }),
		)
		expect(result.current.table.options.enableHiding).toBe(false)
		expect(result.current.table.grid.columnVisibility).toBeUndefined()
	})

	it('does not publish the sorting toolbar config', () => {
		const { result } = renderHook(() =>
			useDataGrid({ data: USERS, columns: COLUMNS, sorting: { enabled: false, toolbar: true } }),
		)
		expect(result.current.table.grid.sorting).toBeUndefined()
	})

	it('resolves a write feature away when its config says enabled: false', () => {
		const { result } = renderHook(() =>
			useDataGrid({
				data: USERS,
				columns: COLUMNS,
				editing: { enabled: false, onSave: () => Promise.resolve() },
			}),
		)
		expect(result.current.table.options.editing).toBeUndefined()
	})

	it('leaves a config object without `enabled` fully enabled', () => {
		const { result } = renderHook(() =>
			useDataGrid({ data: USERS, columns: COLUMNS, globalFiltering: { toolbar: true } }),
		)
		expect(result.current.table.grid.globalFiltering).toBeDefined()
	})
})

/**
 * `toolbar` is the one word for "auto-mount my control", on every feature that has one.
 * Pagination is the case that used to be implicit: the presence of `pageSizeOptions` was
 * itself the switch, so options-without-control and control-with-default-options were both
 * unexpressible.
 */
describe('useDataGrid — pagination.toolbar', () => {
	it('mounts the PageSizer when a size list is supplied, with no extra flag', () => {
		const { result } = renderHook(() =>
			useDataGrid({ data: USERS, columns: COLUMNS, pagination: { pageSizeOptions: [5, 10] } }),
		)
		expect(result.current.table.grid.pagination.pageSizeOptions).toEqual([5, 10])
	})

	it('mounts nothing when pagination carries no size list', () => {
		const { result } = renderHook(() => useDataGrid({ data: USERS, columns: COLUMNS, pagination: true }))
		expect(result.current.table.grid.pagination.pageSizeOptions).toBeUndefined()
	})

	it('toolbar: true falls back to the named default size list', () => {
		const { result } = renderHook(() => useDataGrid({ data: USERS, columns: COLUMNS, pagination: { toolbar: true } }))
		expect(result.current.table.grid.pagination.pageSizeOptions).toEqual([
			...DATA_GRID_DEFAULTS.pagination.pageSizeOptions,
		])
	})

	it('toolbar: false keeps the size list as data without mounting the control', () => {
		const { result } = renderHook(() =>
			useDataGrid({ data: USERS, columns: COLUMNS, pagination: { toolbar: false, pageSizeOptions: [5, 10] } }),
		)
		expect(result.current.table.grid.pagination.pageSizeOptions).toBeUndefined()
	})

	it('never mounts the PageSizer in infinite mode', () => {
		const { result } = renderHook(() =>
			useDataGrid({ data: USERS, columns: COLUMNS, pagination: { mode: 'infinite', toolbar: true } }),
		)
		expect(result.current.table.grid.pagination.pageSizeOptions).toBeUndefined()
	})
})
