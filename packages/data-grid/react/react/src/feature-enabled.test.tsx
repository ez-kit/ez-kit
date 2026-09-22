import { createColumns } from '@ez-kit/data-grid-core'
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DATA_GRID_DEFAULTS } from './defaults'
import { TEST_FEATURES } from './test-utils'
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
			useDataGrid({
				features: TEST_FEATURES,
				data: USERS,
				columns: COLUMNS,
				globalFiltering: { enabled: false },
			}),
		)
		expect(result.current.grid.globalFiltering).toBeUndefined()
	})

	it('does not publish the selection panel config', () => {
		const { result } = renderHook(() =>
			useDataGrid({ features: TEST_FEATURES, data: USERS, columns: COLUMNS, selection: { enabled: false, bar: true } }),
		)
		expect(result.current.grid.selection.bar).toBeUndefined()
	})

	it('does not publish the infinite-scroll config', () => {
		const { result } = renderHook(() =>
			useDataGrid({
				features: TEST_FEATURES,
				data: USERS,
				columns: COLUMNS,
				pagination: { enabled: false, mode: 'infinite', hasNextPage: true },
			}),
		)
		expect(result.current.grid.pagination.infinite).toBeUndefined()
	})

	it('does not publish the virtualization config', () => {
		const { result } = renderHook(() =>
			useDataGrid({
				features: TEST_FEATURES,
				data: USERS,
				columns: COLUMNS,
				virtualization: { enabled: false, row: true },
			}),
		)
		expect(result.current.grid.virtualization).toBeUndefined()
	})

	it('keeps column hiding off in core and reports the feature as off', () => {
		const { result } = renderHook(() =>
			useDataGrid({
				features: TEST_FEATURES,
				data: USERS,
				columns: COLUMNS,
				visibility: { enabled: false },
			}),
		)
		expect(result.current.options.enableHiding).toBe(false)
		// The flag a layout gates `<DataGrid.VisibilityTrigger/>` on — a derived boolean since the
		// `{ toolbar }` object it replaced answered two questions at once.
		expect(result.current.grid.visibility).toBe(false)
	})

	it('reports sorting as off', () => {
		const { result } = renderHook(() =>
			useDataGrid({
				features: TEST_FEATURES,
				data: USERS,
				columns: COLUMNS,
				sorting: { enabled: false },
			}),
		)
		expect(result.current.grid.sorting).toBe(false)
	})

	it('resolves a write feature away when its config says enabled: false', () => {
		const { result } = renderHook(() =>
			useDataGrid({
				features: TEST_FEATURES,
				data: USERS,
				columns: COLUMNS,
				editing: { enabled: false, onSave: () => Promise.resolve() },
			}),
		)
		expect(result.current.options.editing).toBeUndefined()
	})

	it('leaves a config object without `enabled` fully enabled', () => {
		const { result } = renderHook(() =>
			useDataGrid({ features: TEST_FEATURES, data: USERS, columns: COLUMNS, globalFiltering: { placeholder: 'Go' } }),
		)
		expect(result.current.grid.globalFiltering).toBeDefined()
	})
})

/**
 * `pagination.items` is data: it says which sizes a `<DataGrid.PageSizer/>` offers, not whether
 * one is mounted. That second question used to be `pagination.pageSizer`, and it is a layout's
 * now — which is why this describe lost every case about a placement.
 */
describe('useDataGrid — pagination.items', () => {
	it('keeps an explicit size list', () => {
		const { result } = renderHook(() =>
			useDataGrid({ features: TEST_FEATURES, data: USERS, columns: COLUMNS, pagination: { items: [5, 10] } }),
		)
		expect(result.current.grid.pagination.items).toEqual([5, 10])
	})

	it('resolves the default size list for a bare `pagination: true`', () => {
		const { result } = renderHook(() =>
			useDataGrid({ features: TEST_FEATURES, data: USERS, columns: COLUMNS, pagination: true }),
		)
		expect(result.current.grid.pagination.items).toEqual([...DATA_GRID_DEFAULTS.pagination.items])
	})

	it('resolves no size list in infinite mode, which does not page by size', () => {
		const { result } = renderHook(() =>
			useDataGrid({
				features: TEST_FEATURES,
				data: USERS,
				columns: COLUMNS,
				pagination: { mode: 'infinite', hasNextPage: true },
			}),
		)
		expect(result.current.grid.pagination.items).toBeUndefined()
	})
})
