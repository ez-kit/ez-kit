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
