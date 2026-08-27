import { createTable } from '@ez-kit/data-grid-core'
import { describe, expect, it } from 'vitest'

import { prepareDataGridTable } from './prepare-table'

type Row = { id: string; name: string }

function makeTable() {
	return createTable<Row>({
		data: [{ id: '1', name: 'a' }],
		columns: [{ accessorKey: 'name', header: 'Name' }],
	})
}

describe('prepareDataGridTable', () => {
	it('returns the same table object rather than wrapping it', () => {
		const table = makeTable()
		expect(prepareDataGridTable(table)).toBe(table)
	})

	it('seeds table.grid so every compound component can read it unguarded', () => {
		const table = prepareDataGridTable(makeTable())

		expect(table.grid).toBeDefined()
		// All features off: this is a table that never went through `useDataGrid`.
		expect(table.grid.columnPinning).toBe(false)
		expect(table.grid.pagination.pageSizer).toBe(false)
	})

	it('carries the store surface `useSyncExternalStore` needs, on the table itself', () => {
		const table = prepareDataGridTable(makeTable())

		expect(typeof table.subscribe).toBe('function')
		expect(typeof table.getSnapshot).toBe('function')
		expect(typeof table.getInitialSnapshot).toBe('function')
	})

	it('getSnapshot tracks live state while getInitialSnapshot stays frozen', () => {
		const table = prepareDataGridTable(makeTable())
		const before = table.getInitialSnapshot()

		table.setState((prev) => ({ ...prev, globalFilter: 'hello' }))

		expect(table.getSnapshot().globalFilter).toBe('hello')
		// A server render must produce the same tree on every call, so this one cannot move.
		expect(table.getInitialSnapshot()).toBe(before)
		expect(table.getInitialSnapshot().globalFilter).toBeUndefined()
	})
})
