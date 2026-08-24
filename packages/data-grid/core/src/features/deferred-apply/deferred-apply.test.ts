import { describe, expect, it } from 'vitest'

import { createTable } from '../../create-table'

import type { ColumnDef } from '../../column/types'

type Row = { id: string; name: string; age: number }

const DATA: Row[] = [
	{ id: '1', name: 'Ann', age: 30 },
	{ id: '2', name: 'Bob', age: 40 },
]
const COLUMNS: ColumnDef<Row>[] = [{ accessorKey: 'name' }, { accessorKey: 'age' }]

function makeTable(overrides: Record<string, unknown> = {}) {
	return createTable({
		data: DATA,
		columns: COLUMNS,
		sorting: { manual: true },
		filtering: { manual: true },
		globalFiltering: { manual: true },
		deferredApply: true,
		...overrides,
	})
}

describe('deferredApply — applied snapshot', () => {
	it('is not dirty on a fresh table', () => {
		expect(makeTable().draft.isDirty()).toBe(false)
	})

	it('seeds the applied snapshot from initialState so an initial sort is not dirty', () => {
		const table = makeTable({ initialState: { sorting: [{ id: 'name', desc: false }] } })

		expect(table.draft.isDirty()).toBe(false)
		expect(table.getState().applied.sorting).toEqual([{ id: 'name', desc: false }])
	})

	it('becomes dirty once a sort is added, without moving the applied snapshot', () => {
		const table = makeTable()

		table.setSorting([{ id: 'age', desc: true }])

		expect(table.draft.isDirty()).toBe(true)
		expect(table.draft.get().sorting).toEqual([{ id: 'age', desc: true }])
		expect(table.getState().applied.sorting).toEqual([])
	})

	it('counts pending changes per axis', () => {
		const table = makeTable()

		table.setSorting([{ id: 'age', desc: true }])
		table.setColumnFilters([{ id: 'name', value: 'An' }])

		expect(table.draft.getPendingCount()).toEqual({ sorting: 1, filters: 1, search: false })
	})

	it('reports search as pending when the global filter differs from applied', () => {
		const table = makeTable()

		table.setGlobalFilter('bob')

		expect(table.draft.getPendingCount()).toEqual({ sorting: 0, filters: 0, search: true })
	})

	it('seeds a restored draft from initialState.draft, leaving applied at its own seed', () => {
		const table = makeTable({
			initialState: {
				sorting: [{ id: 'name', desc: false }],
				draft: { sorting: [{ id: 'age', desc: true }] },
			},
		})

		expect(table.getState().sorting).toEqual([{ id: 'age', desc: true }])
		expect(table.getState().applied.sorting).toEqual([{ id: 'name', desc: false }])
		expect(table.draft.isDirty()).toBe(true)
	})
})
