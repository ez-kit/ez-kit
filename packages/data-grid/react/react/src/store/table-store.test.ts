import { createTable } from '@ez-kit/data-grid-core'
import { describe, expect, it, vi } from 'vitest'

import { createTableStore } from './table-store'

type Row = { id: string; name: string }

function makeTable(initial: Row[] = [{ id: '1', name: 'a' }]) {
	return createTable<Row>({
		data: initial,
		columns: [{ accessorKey: 'name', header: 'Name' }],
	})
}

describe('createTableStore', () => {
	it('returns a snapshot referentially equal across calls when no state changed', () => {
		const table = makeTable()
		const store = createTableStore(table)

		const a = store.getSnapshot()
		const b = store.getSnapshot()

		expect(a).toBe(b)
	})

	it('returns a different snapshot reference after the table state changes', () => {
		const table = makeTable()
		const store = createTableStore(table)
		const before = store.getSnapshot()

		table.setState((prev) => ({ ...prev, sorting: [{ id: 'name', desc: false }] }))
		const after = store.getSnapshot()

		expect(after).not.toBe(before)
		expect(after.sorting).toEqual([{ id: 'name', desc: false }])
	})

	it('notifies subscribers when the table state changes', () => {
		const table = makeTable()
		const store = createTableStore(table)
		const listener = vi.fn()
		store.subscribe(listener)

		table.setState((prev) => ({ ...prev, sorting: [{ id: 'name', desc: true }] }))

		expect(listener).toHaveBeenCalled()
	})

	it('stops notifying after unsubscribe', () => {
		const table = makeTable()
		const store = createTableStore(table)
		const listener = vi.fn()
		const unsubscribe = store.subscribe(listener)
		unsubscribe()

		table.setState((prev) => ({ ...prev, sorting: [{ id: 'name', desc: true }] }))

		expect(listener).not.toHaveBeenCalled()
	})

	it('getServerSnapshot returns a deterministic frozen-in-time value', () => {
		const table = makeTable()
		const store = createTableStore(table)
		const serverBefore = store.getServerSnapshot()

		table.setState((prev) => ({ ...prev, sorting: [{ id: 'name', desc: true }] }))
		const serverAfter = store.getServerSnapshot()

		expect(serverAfter).toBe(serverBefore)
	})

	it('supports multiple independent subscribers', () => {
		const table = makeTable()
		const store = createTableStore(table)
		const a = vi.fn()
		const b = vi.fn()
		store.subscribe(a)
		store.subscribe(b)

		table.setState((prev) => ({ ...prev, globalFilter: 'x' }))

		expect(a).toHaveBeenCalled()
		expect(b).toHaveBeenCalled()
	})
})
