import { createTable, defineColumns } from '@ez-kit/data-grid-core'
import { describe, expect, it } from 'vitest'

import { renderWithComponents } from '../test-utils'
import { STICKY_HEADER_KEY, VIRTUALIZED_KEY } from '../use-data-grid'

import { DataGrid } from './data-grid'

type User = { id: number; name: string; age: number }

const USERS: User[] = [
	{ id: 1, name: 'Alice', age: 30 },
	{ id: 2, name: 'Bob', age: 25 },
]
const COLUMNS = defineColumns<User>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'age', header: 'Age' },
])

function makeTable() {
	return createTable<User>({ data: USERS, columns: COLUMNS })
}

/**
 * Helpers to write the same symbols that `useDataGrid` would set when the
 * corresponding feature flag is on. Tests that don't go through `useDataGrid`
 * still need the table-level state for `<DataGridTable>` to read.
 */
function setSticky(table: ReturnType<typeof makeTable>) {
	;(table as unknown as Record<symbol, unknown>)[STICKY_HEADER_KEY] = true
}
function setVirtualized(table: ReturnType<typeof makeTable>) {
	;(table as unknown as Record<symbol, unknown>)[VIRTUALIZED_KEY] = { row: { estimateSize: 40, overscan: 5 } }
}

describe('headless data-* contract', () => {
	it('table emits data-slot="table" without data-virtualized by default', () => {
		const table = makeTable()
		const { container } = renderWithComponents(<DataGrid table={table} />)
		const tableEl = container.querySelector("[data-slot='table']")
		expect(tableEl).not.toBeNull()
		expect(tableEl?.getAttribute('data-virtualized')).toBeNull()
	})

	it('table + tbody emit data-virtualized="true" when virtualization is on', () => {
		const table = makeTable()
		setVirtualized(table)
		const { container } = renderWithComponents(<DataGrid table={table} />)
		expect(container.querySelector("[data-slot='table'][data-virtualized='true']")).not.toBeNull()
		expect(container.querySelector("[data-slot='tbody'][data-virtualized='true']")).not.toBeNull()
	})

	it('thead emits data-sticky="true" when stickyHeader is enabled', () => {
		const table = makeTable()
		setSticky(table)
		const { container } = renderWithComponents(<DataGrid table={table} />)
		expect(container.querySelector("[data-slot='thead'][data-sticky='true']")).not.toBeNull()
	})

	it('thead has no data-sticky when stickyHeader is disabled', () => {
		const table = makeTable()
		const { container } = renderWithComponents(<DataGrid table={table} />)
		const thead = container.querySelector("[data-slot='thead']")
		expect(thead?.getAttribute('data-sticky')).toBeNull()
	})

	it('table-scroll emits data-sticky-header="true" when stickyHeader is enabled', () => {
		const table = makeTable()
		setSticky(table)
		const { container } = renderWithComponents(<DataGrid table={table} />)
		expect(container.querySelector("[data-slot='table-scroll'][data-sticky-header='true']")).not.toBeNull()
	})

	it('sortable headers emit data-sortable + data-sort-direction', () => {
		const table = createTable<User>({ data: USERS, columns: COLUMNS, sorting: true })
		const { container } = renderWithComponents(<DataGrid table={table} />)
		const triggers = container.querySelectorAll("[data-slot='sort-trigger'][data-sortable='true']")
		expect(triggers.length).toBeGreaterThan(0)
		for (const trigger of triggers) {
			expect(trigger.getAttribute('data-sort-direction')).toBe('none')
		}
	})

	it('pinned columns emit data-pinned on th', () => {
		const COLS_PINNED = defineColumns<User>([
			{ accessorKey: 'name', header: 'Name', pinning: { pin: 'left' } },
			{ accessorKey: 'age', header: 'Age' },
		])
		const table = createTable<User>({ data: USERS, columns: COLS_PINNED, pinning: { column: true } })
		const { container } = renderWithComponents(<DataGrid table={table} />)
		expect(container.querySelector("[data-slot='th'][data-pinned='left']")).not.toBeNull()
	})

	it('renders pin-shadow overlays via data-pin-shadow when columns are pinned', () => {
		const COLS_PINNED = defineColumns<User>([
			{ accessorKey: 'name', header: 'Name', pinning: { pin: 'left' } },
			{ accessorKey: 'age', header: 'Age' },
		])
		const table = createTable<User>({ data: USERS, columns: COLS_PINNED, pinning: { column: true } })
		const { container } = renderWithComponents(<DataGrid table={table} />)
		expect(container.querySelector("[data-pin-shadow='left']")).not.toBeNull()
		expect(container.querySelector("[data-slot='pin-shadow-overlay']")).not.toBeNull()
	})
})
