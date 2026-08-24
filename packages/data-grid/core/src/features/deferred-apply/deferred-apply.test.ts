import { describe, expect, it } from 'vitest'

import { createTable } from '../../create-table'

import type { ColumnDef } from '../../column/types'
import type { TableState } from '@tanstack/table-core'

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

describe('deferredApply — emission gating', () => {
	function makeSpyTable() {
		const calls: { sorting: unknown[]; state: number } = { sorting: [], state: 0 }
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			sorting: { manual: true, onChange: (s) => calls.sorting.push(s) },
			filtering: { manual: true },
			globalFiltering: true,
			pagination: { manual: true, pageSize: 10, rowCount: 100 },
			deferredApply: true,
			onStateChange: () => {
				calls.state += 1
			},
		})
		return { table, calls }
	}

	it('does not emit while the draft is only accumulating', () => {
		const { table, calls } = makeSpyTable()

		table.setSorting([{ id: 'age', desc: true }])
		table.setColumnFilters([{ id: 'name', value: 'An' }])

		expect(calls.state).toBe(0)
		expect(calls.sorting).toEqual([])
	})

	it('emits exactly once on apply()', () => {
		const { table, calls } = makeSpyTable()
		table.setSorting([{ id: 'age', desc: true }])
		table.setColumnFilters([{ id: 'name', value: 'An' }])

		table.draft.apply()

		expect(calls.state).toBe(1)
		expect(calls.sorting).toEqual([[{ id: 'age', desc: true }]])
	})

	it('does not emit on reset()', () => {
		const { table, calls } = makeSpyTable()
		table.setSorting([{ id: 'age', desc: true }])

		table.draft.reset()

		expect(calls.state).toBe(0)
	})

	it('emits immediately for pagination, which is never deferred', () => {
		const { table, calls } = makeSpyTable()

		table.setPageIndex(2)

		expect(calls.state).toBe(1)
	})

	it('emits the applied query, not the draft, when the page changes while dirty', () => {
		const seen: TableState[] = []
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			sorting: { manual: true },
			filtering: { manual: true },
			globalFiltering: true,
			pagination: { manual: true, pageSize: 10, rowCount: 100 },
			deferredApply: true,
			onStateChange: (state) => {
				seen.push(state)
			},
		})
		table.setSorting([{ id: 'age', desc: true }])
		table.setColumnFilters([{ id: 'name', value: 'An' }])
		table.setGlobalFilter('an')

		table.setPageIndex(1)

		const last = seen.at(-1)
		expect(last?.sorting).toEqual([])
		expect(last?.columnFilters).toEqual([])
		expect(last?.globalFilter).toBeUndefined()
	})

	it('still emits when columnVisibility changes while the draft is dirty', () => {
		const { table, calls } = makeSpyTable()
		table.setSorting([{ id: 'age', desc: true }])
		expect(calls.state).toBe(0)

		table.setColumnVisibility({ age: false })

		expect(calls.state).toBe(1)
	})

	it('still emits when rowSelection changes while the draft is dirty', () => {
		const { table, calls } = makeSpyTable()
		table.setSorting([{ id: 'age', desc: true }])
		expect(calls.state).toBe(0)

		table.setRowSelection({ '1': true })

		expect(calls.state).toBe(1)
	})

	it('still emits when expanded changes while the draft is dirty', () => {
		const { table, calls } = makeSpyTable()
		table.setSorting([{ id: 'age', desc: true }])
		expect(calls.state).toBe(0)

		table.setExpanded({ '1': true })

		expect(calls.state).toBe(1)
	})

	it('apply() with a clean draft emits nothing', () => {
		const { table, calls } = makeSpyTable()

		table.draft.apply()

		expect(calls.state).toBe(0)
		expect(calls.sorting).toEqual([])
	})

	it('does not clear row selection or move the page when apply() runs on a clean draft', () => {
		const { table } = makeSpyTable()
		table.setRowSelection({ '1': true })
		table.setPageIndex(2)

		table.draft.apply()

		expect(table.getState().rowSelection).toEqual({ '1': true })
		expect(table.getState().pagination.pageIndex).toBe(2)
	})

	it('filtering.onChange and globalFiltering.onChange stay silent while accumulating and fire once on apply', () => {
		const filterCalls: unknown[] = []
		const globalCalls: unknown[] = []
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			sorting: { manual: true },
			filtering: { manual: true, onChange: (f) => filterCalls.push(f) },
			globalFiltering: { onChange: (g) => globalCalls.push(g) },
			deferredApply: true,
		})

		table.setColumnFilters([{ id: 'name', value: 'An' }])
		table.setGlobalFilter('an')

		expect(filterCalls).toEqual([])
		expect(globalCalls).toEqual([])

		table.draft.apply()

		expect(filterCalls).toEqual([[{ id: 'name', value: 'An' }]])
		expect(globalCalls).toEqual(['an'])
	})

	it('behaves exactly as today when deferredApply is off', () => {
		const calls: number[] = []
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			sorting: { manual: true },
			onStateChange: () => calls.push(1),
		})

		table.setSorting([{ id: 'age', desc: true }])

		expect(calls).toHaveLength(1)
		expect(table.draft.isDirty()).toBe(false)
	})
})

describe('deferredApply — controlled input and misconfiguration', () => {
	it('does not let controlled state clobber a pending draft', () => {
		const table = makeTable()
		table.setSorting([{ id: 'age', desc: true }])

		// The consumer mirrors back what it last saw — the APPLIED query.
		table.syncControlledState({ sorting: [] })

		expect(table.getState().sorting).toEqual([{ id: 'age', desc: true }])
	})

	it('accepts controlled updates to non-deferred slices while dirty', () => {
		const table = makeTable({ pagination: { manual: true, pageSize: 10, rowCount: 100 } })
		table.setSorting([{ id: 'age', desc: true }])

		table.syncControlledState({ pagination: { pageIndex: 2, pageSize: 10 } })

		expect(table.getState().pagination.pageIndex).toBe(2)
		expect(table.getState().sorting).toEqual([{ id: 'age', desc: true }])
	})

	it('accepts controlled updates to the deferred axes once clean', () => {
		const table = makeTable()

		table.syncControlledState({ sorting: [{ id: 'name', desc: false }] })

		expect(table.getState().sorting).toEqual([{ id: 'name', desc: false }])
	})

	it('throws when deferredApply is set without a manual axis', () => {
		expect(() => createTable({ data: DATA, columns: COLUMNS, sorting: true, deferredApply: true })).toThrow(
			/deferredApply requires/,
		)
	})
})
