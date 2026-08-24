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
		globalFiltering: true,
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

describe('deferredApply — apply / reset', () => {
	it('apply() moves the draft into the applied snapshot and clears dirtiness', () => {
		const table = makeTable()
		table.setSorting([{ id: 'age', desc: true }])

		table.draft.apply()

		expect(table.draft.isDirty()).toBe(false)
		expect(table.getState().applied.sorting).toEqual([{ id: 'age', desc: true }])
	})

	it('apply() resets pageIndex to 0 in the same state change', () => {
		const table = makeTable({ pagination: { manual: true, pageSize: 10, rowCount: 100 } })
		table.setPageIndex(3)
		table.setColumnFilters([{ id: 'name', value: 'An' }])

		table.draft.apply()

		expect(table.getState().pagination.pageIndex).toBe(0)
	})

	it('apply() clears the row selection', () => {
		const table = makeTable({ selection: true })
		table.setRowSelection({ '1': true })
		table.setSorting([{ id: 'age', desc: true }])

		table.draft.apply()

		expect(table.getState().rowSelection).toEqual({})
	})

	it('reset() restores the live axes from the applied snapshot', () => {
		const table = makeTable()
		table.setSorting([{ id: 'age', desc: true }])
		table.setColumnFilters([{ id: 'name', value: 'An' }])

		table.draft.reset()

		expect(table.draft.isDirty()).toBe(false)
		expect(table.getState().sorting).toEqual([])
		expect(table.getState().columnFilters).toEqual([])
	})

	it('resetAxis() backs out one axis and leaves the others pending', () => {
		const table = makeTable()
		table.setSorting([{ id: 'age', desc: true }])
		table.setColumnFilters([{ id: 'name', value: 'An' }])

		table.draft.resetAxis('sorting')

		expect(table.getState().sorting).toEqual([])
		expect(table.getState().columnFilters).toEqual([{ id: 'name', value: 'An' }])
		expect(table.draft.isDirty()).toBe(true)
	})

	it('set() writes draft values without touching the applied snapshot', () => {
		const table = makeTable()

		table.draft.set({ globalFilter: 'bob' })

		expect(table.getState().globalFilter).toBe('bob')
		expect(table.getState().applied.globalFilter).toBeUndefined()
		expect(table.draft.isDirty()).toBe(true)
	})
})
