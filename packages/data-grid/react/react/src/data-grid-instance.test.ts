import { createTable } from '@ez-kit/data-grid-core'
import { describe, expect, it } from 'vitest'

import { createDataGridInstance } from './data-grid-instance'

type Row = { id: string; name: string }

function makeTable() {
	return createTable<Row>({
		data: [{ id: '1', name: 'a' }],
		columns: [{ accessorKey: 'name', header: 'Name' }],
	})
}

describe('createDataGridInstance', () => {
	it('exposes the original table object', () => {
		const table = makeTable()
		const instance = createDataGridInstance(table)

		expect(instance.table).toBe(table)
	})

	it('exposes a store with subscribe + getSnapshot + getServerSnapshot', () => {
		const instance = createDataGridInstance(makeTable())

		expect(typeof instance.store.subscribe).toBe('function')
		expect(typeof instance.store.getSnapshot).toBe('function')
		expect(typeof instance.store.getServerSnapshot).toBe('function')
	})

	it('surface aliases match the store methods', () => {
		const instance = createDataGridInstance(makeTable())

		expect(instance.subscribe).toBe(instance.store.subscribe)
		expect(instance.getSnapshot).toBe(instance.store.getSnapshot)
	})

	it('snapshot reflects the live table state', () => {
		const table = makeTable()
		const instance = createDataGridInstance(table)

		table.setState((prev) => ({ ...prev, globalFilter: 'hello' }))

		expect(instance.getSnapshot().globalFilter).toBe('hello')
	})
})
