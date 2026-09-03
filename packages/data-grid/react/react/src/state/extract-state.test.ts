import { createTable, createColumns } from '@ez-kit/data-grid-core'
import { describe, expect, it } from 'vitest'

import { extractState } from './extract-state'

type Row = { id: number; name: string }
const columns = createColumns<Row>([{ accessorKey: 'name' }])
const data: Row[] = [
	{ id: 1, name: 'Alice' },
	{ id: 2, name: 'Bob' },
]

function makeTable() {
	return createTable<Row>({
		data,
		columns,
		sorting: true,
		filtering: true,
		initialState: {
			sorting: [{ id: 'name', desc: true }],
			pagination: { pageIndex: 2, pageSize: 25 },
			rowSelection: { '0': true },
		},
	})
}

describe('extractState', () => {
	it('picks only the default view keys from table state', () => {
		const result = extractState(makeTable())
		expect(result.sorting).toEqual([{ id: 'name', desc: true }])
		expect(result.pagination).toEqual({ pageIndex: 2, pageSize: 25 })
	})

	it('excludes rowSelection by default (not in DEFAULT_STATE_KEYS)', () => {
		const result = extractState(makeTable())
		expect('rowSelection' in result).toBe(false)
	})

	it('includes rowSelection when explicitly requested via keys', () => {
		const result = extractState(makeTable(), { keys: ['rowSelection'] })
		expect(result.rowSelection).toEqual({ '0': true })
		expect('sorting' in result).toBe(false)
	})

	it('is JSON-serializable', () => {
		const result = extractState(makeTable())
		expect(() => JSON.stringify(result)).not.toThrow()
	})
})

/**
 * The draft is not a state slice — the live axes carry it and `state.applied` carries what was
 * emitted — so it is picked by name rather than copied. Persisting it is the only way a
 * restored grid comes back with the draft still pending instead of silently applied.
 */
describe('extractState — draft', () => {
	function makeDeferredTable() {
		return createTable<Row>({ data, columns, sorting: { manual: true }, draft: true })
	}

	it('reports nothing while the draft is clean', () => {
		const table = makeDeferredTable()
		expect(extractState(table, { keys: ['draft'] })).toEqual({})
	})

	it('reports the pending axes once the draft is dirty', () => {
		const table = makeDeferredTable()
		table.draft.set({ sorting: [{ id: 'name', desc: true }] })
		const result = extractState(table, { keys: ['draft'] })
		expect(result.draft?.sorting).toEqual([{ id: 'name', desc: true }])
	})

	it('reports nothing when the grid does not defer at all', () => {
		const table = createTable<Row>({ data, columns, sorting: true })
		expect(extractState(table, { keys: ['draft'] })).toEqual({})
	})
})
